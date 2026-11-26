/**
 * End-to-end pipeline check against a local stack with MOCK_PROVIDERS=true:
 * upload a real image, have the vision stage read it, submit a generation that
 * carries a drape + crop choice, and watch the worker run it to delivery.
 *
 * Dev-only. Run with the API and worker pointed at the same database/storage:
 *   node scripts/verify-e2e.mjs
 */
import { deflateSync } from "node:zlib";

const BASE = process.env.API_URL ?? "http://localhost:4000/api";

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([Buffer.from(type), data])) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([len, Buffer.from(type), data, tail]);
}

function testGarmentImage() {
  const width = 480;
  const height = 640;
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x += 1) {
    // A marigold-to-teal band reads as a bordered textile to the eye.
    row[1 + x * 3] = 190 + ((x * 30) / width | 0);
    row[2 + x * 3] = 90 + ((x * 90) / width | 0);
    row[3 + x * 3] = 60;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(Buffer.concat(Array(height).fill(row)))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function session() {
  let cookie = "";
  return {
    get hasCookie() { return cookie.length > 0; },
    async call(path, method = "GET", body, extra = {}) {
      const res = await fetch(BASE + path, {
        method,
        headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...extra },
        body: body ? JSON.stringify(body) : undefined,
      });
      const setCookie = res.headers.getSetCookie?.() ?? [];
      if (setCookie.length) cookie = setCookie[0].split(";")[0];
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* non-JSON body */ }
      return { status: res.status, json, text, headers: res.headers };
    },
    async put(url, headers, data) {
      const res = await fetch(url, { method: "PUT", headers, body: data });
      return { status: res.status, text: res.status >= 400 ? await res.text() : "" };
    },
  };
}

const say = (label, value) => console.log(String(label).padEnd(44), value);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const user = session();
const email = `e2e-${Date.now()}@shotlin.test`;
const registered = await user.call("/auth/register", "POST", { email, name: "E2E Studio", password: "e2e-passphrase-1234" });
say("register", `${registered.status} ${registered.json?.user?.id?.slice(0, 8) ?? registered.text?.slice(0, 60)}`);

const presign = await user.call("/uploads", "POST", { filename: "garment.png", contentType: "image/png", kind: "garment_reference" });
say("presign", `${presign.status} ${presign.json?.objectKey ?? ""}`);
const uploaded = await user.put(presign.json.uploadUrl, presign.json.headers, testGarmentImage());
say("put object", `${uploaded.status}${uploaded.text ? ` ${uploaded.text.slice(0, 90)}` : ""}`);
const completed = await user.call(`/uploads/${presign.json.assetId}/complete`, "POST", { filename: "garment.png" });
say("complete + validate", `${completed.status} ${completed.json?.validationStatus ?? ""} ${JSON.stringify(completed.json?.validationReport ?? {}).slice(0, 110)}`);

const analyzed = await user.call("/garments/analyze", "POST", { assetId: presign.json.assetId });
const profile = analyzed.json?.profile;
say("analyze", `${analyzed.status} cached=${analyzed.json?.cached} type=${profile?.detection?.garmentType ?? "-"} conf=${profile?.confidence?.overall ?? "-"}`);

let wearStyles = [];
if (profile?.taxonomyNodeId) {
  const styles = await user.call(`/garments/wear-styles?for=${encodeURIComponent(profile.taxonomyNodeId)}`);
  wearStyles = Array.isArray(styles.json) ? styles.json : [];
  say("wear styles offered", `${wearStyles.length} e.g. ${wearStyles.slice(0, 3).map((s) => s.name).join(", ")}`);
}

const environments = await user.call("/customer/environments");
const characters = await user.call("/customer/characters");
const options = await user.call("/customer/options");
const square = (options.json?.aspectRatios ?? []).find((option) => option.id === "square");
say("catalogue", `${environments.json?.length ?? 0} scenes · ${characters.json?.length ?? 0} characters · ${(options.json?.poses ?? []).length} poses`);

const body = {
  mainGarmentAssetId: presign.json.assetId,
  characterId: characters.json?.[0]?.id ?? null,
  environmentPresetId: environments.json?.[1]?.id ?? environments.json?.[0]?.id ?? null,
  resolution: "1k",
  aspectRatio: square?.id ?? "portrait",
  outputCount: 2,
  pose: "walking",
  framing: "three-quarter",
  wearStyleId: wearStyles[0]?.id ?? null,
  ageAppearance: "adult",
  heightAppearance: "average",
  inputType: "photo",
};

const created = await user.call("/jobs", "POST", body, { "Idempotency-Key": `e2e-${Date.now()}` });
const jobId = created.json?.job?.id;
say("job created", `${created.status} ${jobId ?? JSON.stringify(created.json).slice(0, 100)}`);

if (jobId) {
  let state = created.json?.job?.state ?? "created";
  let attempts = 0;
  const seen = new Set();
  while (!["ready", "failed", "input_rejected", "budget_stopped", "manual_review", "cancelled"].includes(state) && attempts < 60) {
    await sleep(2000);
    const status = await user.call(`/jobs/${jobId}`);
    state = status.json?.job?.state ?? state;
    seen.add(state);
    attempts += 1;
  }
  say("states observed", [...seen].join(" → ") || "(none)");
  say("final state", `${state} after ~${attempts * 2}s`);

  const result = await user.call(`/jobs/${jobId}/result`);
  const images = result.json?.images ?? [];
  say("result", `${result.status} delivery=${result.json?.delivery} images=${images.length}`);
  for (const image of images) {
    const head = await fetch(image.previewUrl ?? "", { method: "HEAD" }).catch(() => null);
    say(`  image #${image.sequence}`, `angle=${image.cameraAngle} bytes=${head?.headers.get("content-length") ?? "?"} status=${head?.status ?? "no url"}`);
  }
  const png = await fetch(images[0]?.downloads?.png ?? "").catch(() => null);
  say("  png download", png ? `${png.status} ${png.headers.get("content-type")} ${png.headers.get("content-length")}B` : "n/a");
  const got = await fetch(images[0]?.previewUrl ?? "").catch(() => null);
  say("  preview GET", got ? `${got.status} ${got.headers.get("content-length")}B` : "n/a");
  say("job id for trace", jobId);
}

// ---- under-18 leg: an allowed teen job plus a blocked pose ----
await sleep(15000);
const teen = await user.call("/jobs", "POST", { ...body, ageAppearance: "teen", pose: "standing", framing: "full", outputCount: 1, wearStyleId: null }, { "Idempotency-Key": `e2e-teen-${Date.now()}` });
const teenId = teen.json?.job?.id;
say("teen job (allowed pose)", `${teen.status} ${teenId ?? JSON.stringify(teen.json).slice(0, 80)}`);
if (teenId) {
  let state = "created";
  for (let i = 0; i < 40 && !["ready", "failed", "manual_review", "input_rejected", "budget_stopped"].includes(state); i += 1) {
    await sleep(2000);
    state = (await user.call(`/jobs/${teenId}`)).json?.job?.state ?? state;
  }
  say("teen job finished", state);
  say("teen job id for trace", teenId);
}
const blocked = await user.call("/jobs", "POST", { ...body, ageAppearance: "teen", pose: "hip-pop", outputCount: 1 }, { "Idempotency-Key": `e2e-blocked-${Date.now()}` });
say("teen job (blocked pose)", `${blocked.status} ${blocked.json?.message ?? ""}`);
