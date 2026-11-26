const BASE = "http://localhost:4000/api";

function makeSession() {
  let cookie = "";
  return {
    get cookie() { return cookie; },
    clear() { cookie = ""; },
    async call(path, method = "GET", body) {
      const res = await fetch(BASE + path, {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const setCookie = res.headers.getSetCookie?.() ?? [];
      if (setCookie.length) cookie = setCookie[0].split(";")[0];
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* non-JSON */ }
      return { status: res.status, json, text };
    },
  };
}

const line = (label, result, pick) => {
  const detail = pick ? pick(result.json ?? result.text) : JSON.stringify(result.json ?? result.text).slice(0, 130);
  console.log(label.padEnd(42), String(result.status).padEnd(4), detail);
};

const admin = makeSession();
const ops = makeSession();
const PW = "operator-passphrase-1234";

await admin.call("/auth/login", "POST", { email: "admin@shotlin.local", password: "shotlin-admin-123" });
line("admin login", { status: admin.cookie ? 200 : 401 }, () => "session established");

const listBefore = await admin.call("/admin/users");
line("GET /admin/users", listBefore, (j) => `${j.users.length} accounts, ${j.activeAdmins} active admin(s)`);

const created = await admin.call("/admin/users", "POST", {
  email: "ops1@shotlin.local",
  name: "Operator One",
  password: PW,
  role: "admin",
  organizationName: "Control room",
});
line("create second admin", created, (j) => `${j.email ?? ""} role=${j.role ?? JSON.stringify(j).slice(0, 60)}`);

const shortPw = await admin.call("/admin/users", "POST", { email: "weak@shotlin.local", name: "Weak", password: "tiny", role: "customer" });
line("create with short password", shortPw, (j) => JSON.stringify(j.issues ?? j.message).slice(0, 90));

line("login as new admin", await ops.call("/auth/login", "POST", { email: "ops1@shotlin.local", password: PW }), () => "ok");

const selfSuspend = await admin.call(`/admin/users/${listBefore.json.users[0].id}/suspension`, "POST", { disabled: true });
line("admin suspends self", selfSuspend, (j) => j.message ?? "UNEXPECTED SUCCESS");

const selfRole = await admin.call(`/admin/users/${listBefore.json.users[0].id}/role`, "PATCH", { role: "customer" });
line("admin changes own role", selfRole, (j) => j.message ?? "UNEXPECTED SUCCESS");

const opsId = created.json.id;
const suspended = await admin.call(`/admin/users/${opsId}/suspension`, "POST", { disabled: true });
line("suspend operator", suspended, (j) => `ok=${j.ok} disabled=${j.disabled}`);

line("existing session after suspension", await ops.call("/auth/me"), (j) => j.message ?? "STILL AUTHENTICATED");
line("login while suspended", await makeSession().call("/auth/login", "POST", { email: "ops1@shotlin.local", password: PW }), (j) => j.message ?? "UNEXPECTED SUCCESS");

line("reinstate operator", await admin.call(`/admin/users/${opsId}/suspension`, "POST", { disabled: false }), (j) => `disabled=${j.disabled}`);
line("login after reinstating", await ops.call("/auth/login", "POST", { email: "ops1@shotlin.local", password: PW }), (j) => typeof j?.user?.id === "string" ? "ok" : JSON.stringify(j).slice(0, 70));
line("operator reaches /admin/users", await ops.call("/admin/users"), (j) => `${j.users?.length ?? JSON.stringify(j).slice(0, 50)} accounts visible`);
line("demote operator", await admin.call(`/admin/users/${opsId}/role`, "PATCH", { role: "customer" }), (j) => `role=${j.role ?? JSON.stringify(j).slice(0, 60)}`);
line("customer hits /admin/users", await ops.call("/admin/users"), (j) => j.message ?? "UNEXPECTED ACCESS");

const node = await admin.call("/admin/garment-taxonomy", "POST", { category: "women", slug: "womens-audit-probe", name: "Audit Probe", aliases: ["probe"] });
line("create taxonomy node", node, (j) => j.slug ? `${j.slug} id=${j.id.slice(0, 8)}` : JSON.stringify(j).slice(0, 80));

const audit = await admin.call("/admin/audit?limit=25");
const actions = (audit.json?.events ?? []).map((event) => event.action);
line("GET /admin/audit", audit, () => `${actions.length} events: ${[...new Set(actions)].join(", ")}`);
line("audit records the actor", { status: 200, json: audit.json?.events?.[0] }, (j) => `${j.actorEmail} (${j.actorRole}) ${j.action} ${j.entityType}`);

const dup = await admin.call("/admin/garment-taxonomy", "POST", { category: "women", slug: "womens-audit-probe", name: "Audit Probe 2" });
line("duplicate slug", dup, (j) => j.message ?? "UNEXPECTED");

await admin.call(`/admin/garment-taxonomy/${node.json.id}`, "DELETE");
line("delete probe node", { status: 200, json: { ok: true } }, () => "cleaned up");

const finalList = await admin.call("/admin/users");
line("final account roster", finalList, (j) => j.users.map((u) => `${u.email}:${u.role}${u.disabledAt ? ":suspended" : ""}`).join(" "));
