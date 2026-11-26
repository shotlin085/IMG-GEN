"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { apiFetch } from "../../components/api";

type LibraryGarment = {
  id: string;
  assetId: string;
  title: string | null;
  taxonomyName: string | null;
  taxonomySlug: string | null;
  previewUrl: string | null;
};

type Preset = { id: string; name: string; kind: "generation" | "brand"; payload: Record<string, unknown>; isDefault: boolean };
type CatalogEnvironment = { id: string; name: string; category: string };
type CatalogCharacter = { id: string; name: string };
type WearStyle = { id: string; name: string; region: string | null };
type Vocabulary = { poses: Array<{ id: string; label: string }>; framings: Array<{ id: string; label: string }>; aspectRatios: Array<{ id: string; label: string }> };

type Variant = {
  key: number;
  label: string;
  environmentPresetId: string;
  pose: string;
  framing: string;
  wearStyleId: string;
  outputCount: number;
};

type BatchResponse = {
  jobs: Array<{ label: string | null; job: { id: string; state: string } }>;
  failures: Array<{ index: number; label: string | null; message: string }>;
  started: number;
  requested: number;
};

const MAX_VARIANTS = 8;

export default function BatchPage() {
  const [garments, setGarments] = useState<LibraryGarment[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [environments, setEnvironments] = useState<CatalogEnvironment[]>([]);
  const [characters, setCharacters] = useState<CatalogCharacter[]>([]);
  const [wearStyles, setWearStyles] = useState<WearStyle[]>([]);
  const [vocabulary, setVocabulary] = useState<Vocabulary>({ poses: [], framings: [], aspectRatios: [] });
  const [error, setError] = useState<string | null>(null);

  const [garmentId, setGarmentId] = useState("");
  const [brandPresetId, setBrandPresetId] = useState("");
  const [characterId, setCharacterId] = useState("");
  const [resolution, setResolution] = useState("2k");
  const [aspectRatio, setAspectRatio] = useState("portrait");
  const [variants, setVariants] = useState<Variant[]>([{ key: 0, label: "", environmentPresetId: "", pose: "auto", framing: "auto", wearStyleId: "", outputCount: 1 }]);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<BatchResponse | null>(null);

  useEffect(() => {
    apiFetch<{ garments: LibraryGarment[] }>("/api/garments/library").then((payload) => {
      setGarments(payload.garments);
      setGarmentId((current) => current || payload.garments[0]?.id || "");
    }).catch((err) => setError(err instanceof Error && err.message.includes("Not signed in") ? "Sign in to run a batch." : "Garment library unavailable."));
    apiFetch<Preset[]>("/api/presets").then(setPresets).catch(() => undefined);
    apiFetch<CatalogEnvironment[]>("/api/customer/environments").then((rows) => {
      setEnvironments(rows);
      setVariants((current) => current.map((variant, index) => (index === 0 && !variant.environmentPresetId ? { ...variant, environmentPresetId: rows[0]?.id ?? "" } : variant)));
    }).catch(() => undefined);
    apiFetch<CatalogCharacter[]>("/api/customer/characters").then((rows) => setCharacters(rows)).catch(() => undefined);
    apiFetch<Vocabulary>("/api/customer/options").then(setVocabulary).catch(() => undefined);
  }, []);

  const selectedGarment = garments.find((garment) => garment.id === garmentId) ?? null;

  useEffect(() => {
    if (!selectedGarment?.taxonomySlug) { setWearStyles([]); return; }
    apiFetch<WearStyle[]>(`/api/garments/wear-styles?for=${encodeURIComponent(selectedGarment.taxonomySlug)}`).then(setWearStyles).catch(() => setWearStyles([]));
  }, [selectedGarment?.taxonomySlug]);

  const brandPreset = presets.find((preset) => preset.id === brandPresetId && preset.kind === "brand") ?? null;
  const allowedScenes = useMemo(() => {
    const keys = Array.isArray(brandPreset?.payload.sceneKeys) ? (brandPreset.payload.sceneKeys as string[]) : null;
    if (!keys || keys.length === 0) return environments;
    return environments.filter((environment) => keys.includes(environment.id));
  }, [brandPreset, environments]);

  function updateVariant(key: number, patch: Partial<Variant>) {
    setVariants((current) => current.map((variant) => (variant.key === key ? { ...variant, ...patch } : variant)));
  }

  function addVariant() {
    setVariants((current) => current.length >= MAX_VARIANTS ? current : [...current, {
      key: Date.now(),
      label: "",
      environmentPresetId: current[current.length - 1]?.environmentPresetId || allowedScenes[0]?.id || "",
      pose: current[current.length - 1]?.pose ?? "auto",
      framing: current[current.length - 1]?.framing ?? "auto",
      wearStyleId: current[current.length - 1]?.wearStyleId ?? "",
      outputCount: 1,
    }]);
  }

  function removeVariant(key: number) {
    setVariants((current) => (current.length > 1 ? current.filter((variant) => variant.key !== key) : current));
  }

  async function start() {
    if (!selectedGarment) { setError("Pick a garment to shoot."); return; }
    setRunning(true);
    setError(null);
    setOutcome(null);
    try {
      const payload = {
        garmentAssetId: selectedGarment.assetId,
        base: {
          characterId: characterId || (typeof brandPreset?.payload.characterId === "string" ? brandPreset.payload.characterId : null),
          resolution,
          aspectRatio,
        },
        variants: variants.map((variant) => ({
          label: variant.label.trim() || null,
          environmentPresetId: variant.environmentPresetId || null,
          pose: variant.pose,
          framing: variant.framing,
          wearStyleId: variant.wearStyleId || null,
          outputCount: variant.outputCount,
        })),
      };
      const result = await apiFetch<BatchResponse>("/api/jobs/batch", { method: "POST", body: JSON.stringify(payload) });
      setOutcome(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the batch");
    } finally {
      setRunning(false);
    }
  }

  return (
    <AppShell section="Batch">
      <div className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Batch</p>
            <h1 className="display">One garment, <em>a whole set.</em></h1>
            <p className="lede">Queue up to eight looks for a single reference. Every look runs the same pipeline as a normal generation and gets its own result page.</p>
          </div>
          <span className="chip">{variants.length} of {MAX_VARIANTS} looks</span>
        </div>

        {garments.length === 0 && !error ? (
          <section className="panel panel-pad"><div className="empty-state"><strong>No garments recognised yet</strong><span>Batch shoots what the studio already knows — upload a reference first.</span></div><a className="button button-coral" href="/">Open the studio</a></section>
        ) : (
          <>
            <section className="panel panel-pad">
              <div className="panel-head"><div><p className="panel-kicker">Step 1</p><h2 className="panel-title">Which garment</h2></div></div>
              <div className="batch-garments">
                {garments.map((garment) => (
                  <button type="button" key={garment.id} className={`batch-garment ${garmentId === garment.id ? "selected" : ""}`} onClick={() => setGarmentId(garment.id)} aria-pressed={garmentId === garment.id}>
                    {garment.previewUrl ? <img src={garment.previewUrl} alt="" /> : <span className="help">no preview</span>}
                    <span>{garment.title ?? garment.taxonomyName ?? "Untitled garment"}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel panel-pad batch-base">
              <div className="panel-head"><div><p className="panel-kicker">Step 2</p><h2 className="panel-title">Shared settings</h2><p className="help">Applied to every look in this run.</p></div></div>
              <div className="select-row">
                <div className="select-field"><label>Brand look-book</label>
                  <select value={brandPresetId} onChange={(event) => setBrandPresetId(event.target.value)}>
                    <option value="">None — use all scenes</option>
                    {presets.filter((preset) => preset.kind === "brand").map((preset) => <option value={preset.id} key={preset.id}>{preset.name}</option>)}
                  </select>
                </div>
                <div className="select-field"><label>Model</label>
                  <select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
                    <option value="">Look-book default</option>
                    {characters.map((character) => <option value={character.id} key={character.id}>{character.name}</option>)}
                  </select>
                </div>
                <div className="select-field"><label>Resolution</label>
                  <select value={resolution} onChange={(event) => setResolution(event.target.value)}><option value="1k">1K</option><option value="2k">2K</option><option value="4k">4K</option></select>
                </div>
                <div className="select-field"><label>Frame</label>
                  <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
                    {vocabulary.aspectRatios.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
                    {vocabulary.aspectRatios.length === 0 && <option value="portrait">Portrait 3:4</option>}
                  </select>
                </div>
              </div>
              {brandPreset && <p className="help">Restricted to {allowedScenes.length} approved scene{allowedScenes.length === 1 ? "" : "s"} from “{brandPreset.name}”.</p>}
            </section>

            <section className="panel panel-pad">
              <div className="panel-head"><div><p className="panel-kicker">Step 3</p><h2 className="panel-title">The looks</h2></div>
                <button type="button" className="button button-ghost button-small" onClick={addVariant} disabled={variants.length >= MAX_VARIANTS}>Add a look</button>
              </div>
              <div className="batch-variants">
                {variants.map((variant, index) => (
                  <div className="batch-variant" key={variant.key}>
                    <span className="batch-variant-number">{index + 1}</span>
                    <input value={variant.label} onChange={(event) => updateVariant(variant.key, { label: event.target.value })} placeholder="Label (optional)" aria-label={`Label for look ${index + 1}`} maxLength={80} />
                    <select value={variant.environmentPresetId} onChange={(event) => updateVariant(variant.key, { environmentPresetId: event.target.value })} aria-label={`Scene for look ${index + 1}`}>
                      {allowedScenes.map((environment) => <option value={environment.id} key={environment.id}>{environment.name}</option>)}
                    </select>
                    <select value={variant.pose} onChange={(event) => updateVariant(variant.key, { pose: event.target.value })} aria-label={`Pose for look ${index + 1}`}>
                      {vocabulary.poses.map((pose) => <option value={pose.id} key={pose.id}>{pose.label}</option>)}
                    </select>
                    <select value={variant.framing} onChange={(event) => updateVariant(variant.key, { framing: event.target.value })} aria-label={`Crop for look ${index + 1}`}>
                      {vocabulary.framings.map((framing) => <option value={framing.id} key={framing.id}>{framing.label}</option>)}
                    </select>
                    {wearStyles.length > 0 && (
                      <select value={variant.wearStyleId} onChange={(event) => updateVariant(variant.key, { wearStyleId: event.target.value })} aria-label={`Drape for look ${index + 1}`}>
                        <option value="">Drape: pipeline default</option>
                        {wearStyles.map((style) => <option value={style.id} key={style.id}>{style.name}{style.region ? ` · ${style.region}` : ""}</option>)}
                      </select>
                    )}
                    <select value={variant.outputCount} onChange={(event) => updateVariant(variant.key, { outputCount: Number(event.target.value) })} aria-label={`Images for look ${index + 1}`}>
                      {[1, 2, 3].map((count) => <option value={count} key={count}>{count} image{count === 1 ? "" : "s"}</option>)}
                    </select>
                    <button type="button" className="button button-ghost button-small" onClick={() => removeVariant(variant.key)} disabled={variants.length === 1}>Remove</button>
                  </div>
                ))}
              </div>
              <div className="account-actions" style={{ marginTop: 16 }}>
                <button className="button button-coral" onClick={start} disabled={running || !selectedGarment}>{running ? "Starting…" : `Start batch (${variants.length} look${variants.length === 1 ? "" : "s"})`}</button>
                {error && <span className="help" role="alert">{error}</span>}
              </div>
            </section>
          </>
        )}

        {outcome && (
          <section className="panel panel-pad" style={{ marginTop: 18 }}>
            <div className="panel-head"><div><p className="panel-kicker">Result</p><h2 className="panel-title">{outcome.started} of {outcome.requested} looks started</h2></div></div>
            <div className="batch-results">
              {outcome.jobs.map((entry) => (
                <a className="batch-result" key={entry.job.id} href={`/jobs/${entry.job.id}`}>
                  <strong>{entry.label ?? "Look"}</strong>
                  <span className="help">{entry.job.state.replaceAll("_", " ")} · open result</span>
                </a>
              ))}
            </div>
            {outcome.failures.length > 0 && (
              <div className="batch-failures">
                {outcome.failures.map((failure) => <p className="help" key={failure.index} role="alert">Look {failure.index + 1}{failure.label ? ` “${failure.label}”` : ""}: {failure.message}</p>)}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
