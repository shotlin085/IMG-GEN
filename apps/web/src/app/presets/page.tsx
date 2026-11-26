"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { apiFetch } from "../../components/api";

type Preset = {
  id: string;
  name: string;
  kind: "generation" | "brand";
  payload: Record<string, unknown>;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
};

type CatalogEnvironment = { id: string; name: string; category: string };
type CatalogCharacter = { id: string; name: string };

function summarise(preset: Preset): string {
  if (preset.kind === "brand") {
    const scenes = Array.isArray(preset.payload.sceneKeys) ? preset.payload.sceneKeys.length : 0;
    return `${scenes} approved scene${scenes === 1 ? "" : "s"}`;
  }
  const parts = [
    preset.payload.resolution ? String(preset.payload.resolution).toUpperCase() : null,
    preset.payload.aspectRatio ?? null,
    preset.payload.pose && preset.payload.pose !== "auto" ? `pose ${String(preset.payload.pose).replaceAll("-", " ")}` : null,
    preset.payload.framing && preset.payload.framing !== "auto" ? `crop ${String(preset.payload.framing).replaceAll("-", " ")}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Scene and model only";
}

export default function PresetsPage() {
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const [environments, setEnvironments] = useState<CatalogEnvironment[]>([]);
  const [characters, setCharacters] = useState<CatalogCharacter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandScenes, setBrandScenes] = useState<string[]>([]);
  const [brandCharacter, setBrandCharacter] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    apiFetch<Preset[]>("/api/presets").then(setPresets).catch((err) =>
      setError(err instanceof Error && err.message.includes("Not signed in") ? "Sign in to manage presets." : "Presets unavailable."),
    );
  }, []);

  useEffect(() => {
    load();
    apiFetch<CatalogEnvironment[]>("/api/customer/environments").then(setEnvironments).catch(() => undefined);
    apiFetch<CatalogCharacter[]>("/api/customer/characters").then(setCharacters).catch(() => undefined);
  }, [load]);

  async function createBrand(event: React.FormEvent) {
    event.preventDefault();
    if (brandName.trim().length < 2 || brandScenes.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/presets", {
        method: "POST",
        body: JSON.stringify({
          name: brandName.trim(),
          kind: "brand",
          payload: { sceneKeys: brandScenes, characterId: brandCharacter || null },
        }),
      });
      setNotice(`“${brandName.trim()}” saved. Batch mode can shoot the whole catalogue against it.`);
      setBrandName("");
      setBrandScenes([]);
      setBrandCharacter("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the look-book");
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>, message: string) {
    try {
      await apiFetch(`/api/presets/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      setNotice(message);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the preset");
    }
  }

  async function remove(preset: Preset) {
    try {
      await apiFetch(`/api/presets/${preset.id}`, { method: "DELETE" });
      setNotice(`“${preset.name}” deleted.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the preset");
    }
  }

  const generation = presets?.filter((preset) => preset.kind === "generation") ?? [];
  const brand = presets?.filter((preset) => preset.kind === "brand") ?? [];

  return (
    <AppShell section="Presets">
      <div className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Presets &amp; look-books</p>
            <h1 className="display">Set it up once, <em>shoot it forever.</em></h1>
            <p className="lede">Presets hold the choices the studio makes with them. A brand look-book fixes which scenes and which model a label's catalogue is allowed to use.</p>
          </div>
        </div>

        {error && <p className="help" role="alert">{error}</p>}
        {notice && <p className="help" role="status">{notice}</p>}

        <section className="panel panel-pad">
          <div className="panel-head">
            <div><p className="panel-kicker">Brand look-book</p><h2 className="panel-title">Approve the house style</h2></div>
            <span className="chip">{brandScenes.length} scenes</span>
          </div>
          <form onSubmit={createBrand} className="account-form">
            <label className="input-field"><span>Name</span><input value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder="e.g. Saree line — festive 2026" maxLength={80} required minLength={2} /></label>
            <div className="select-field"><label>Default model</label>
              <select value={brandCharacter} onChange={(event) => setBrandCharacter(event.target.value)}>
                <option value="">No default model</option>
                {characters.map((character) => <option value={character.id} key={character.id}>{character.name}</option>)}
              </select>
            </div>
            <div className="select-field"><label>Approved scenes</label>
              <div className="scene-checks">
                {environments.map((environment) => (
                  <label className="account-check" key={environment.id}>
                    <input
                      type="checkbox"
                      checked={brandScenes.includes(environment.id)}
                      onChange={() => setBrandScenes((current) => current.includes(environment.id) ? current.filter((id) => id !== environment.id) : [...current, environment.id])}
                    />
                    <span>{environment.name} <span className="help">· {environment.category}</span></span>
                  </label>
                ))}
              </div>
            </div>
            <div className="account-actions">
              <button className="button button-coral" disabled={saving || brandName.trim().length < 2 || brandScenes.length === 0}>{saving ? "Saving…" : "Save look-book"}</button>
              <span className="help">Batch mode reads these scenes as the only allowed backdrops.</span>
            </div>
          </form>
        </section>

        {!presets && !error && <section className="panel panel-pad loading-panel">Loading presets…</section>}

        {presets && (
          <div className="admin-grid">
            <PresetTable title="Studio presets" subtitle="Applied in one tap from the studio" presets={generation} empty="Save a look in the studio and it appears here." onDefault={patch} onDelete={remove} />
            <PresetTable title="Brand look-books" subtitle="Scenes and model batch mode shoots against" presets={brand} empty="No look-book yet — approve a house style above." onDefault={patch} onDelete={remove} />
          </div>
        )}
      </div>
    </AppShell>
  );
}

function PresetTable({ title, subtitle, presets, empty, onDefault, onDelete }: {
  title: string;
  subtitle: string;
  presets: Preset[];
  empty: string;
  onDefault: (id: string, body: Record<string, unknown>, message: string) => Promise<void>;
  onDelete: (preset: Preset) => Promise<void>;
}) {
  return (
    <section className="panel panel-pad">
      <div className="panel-head"><div><p className="panel-kicker">{title}</p><h2 className="panel-title">{subtitle}</h2></div><span className="chip">{presets.length}</span></div>
      {presets.length === 0 ? <p className="help">{empty}</p> : (
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Name</th><th>Carries</th><th>Default</th><th /></tr></thead>
          <tbody>{presets.map((preset) => (
            <tr key={preset.id}>
              <td>{preset.name}</td>
              <td>{summarise(preset)}</td>
              <td>
                <button type="button" className="button button-ghost button-small" aria-pressed={preset.isDefault} onClick={() => onDefault(preset.id, { isDefault: !preset.isDefault }, preset.isDefault ? "Default cleared." : `“${preset.name}” is now the default.`)}>
                  {preset.isDefault ? "Yes" : "No"}
                </button>
              </td>
              <td><button type="button" className="button button-ghost button-small" onClick={() => onDelete(preset)}>Delete</button></td>
            </tr>
          ))}</tbody></table></div>
      )}
    </section>
  );
}
