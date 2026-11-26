"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api";

export type PresetPayload = {
  environmentPresetId?: string | null;
  characterId?: string | null;
  wearStyleId?: string | null;
  pose?: string;
  framing?: string;
  aspectRatio?: string;
  resolution?: "1k" | "2k" | "4k";
  outputCount?: number;
  ageAppearance?: string;
  heightAppearance?: string;
};

type Preset = {
  id: string;
  name: string;
  kind: "generation" | "brand";
  payload: PresetPayload;
  notes: string | null;
  isDefault: boolean;
};

const PAYLOAD_KEYS = ["environmentPresetId", "characterId", "wearStyleId", "pose", "framing", "aspectRatio", "resolution", "outputCount", "ageAppearance", "heightAppearance"] as const;

function describe(payload: PresetPayload): string {
  const parts = [
    payload.resolution ? payload.resolution.toUpperCase() : null,
    payload.aspectRatio ?? null,
    payload.outputCount ? `${payload.outputCount} image${payload.outputCount === 1 ? "" : "s"}` : null,
    payload.pose && payload.pose !== "auto" ? `pose ${payload.pose.replaceAll("-", " ")}` : null,
    payload.framing && payload.framing !== "auto" ? `crop ${payload.framing.replaceAll("-", " ")}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Scene and model only";
}

export function PresetBar({ current, onApply }: { current: PresetPayload; onApply: (payload: PresetPayload) => void }) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<Preset[]>("/api/presets?kind=generation")
      .then((rows) => {
        setPresets(rows);
        const fallback = rows.find((row) => row.isDefault);
        if (fallback) setSelected((currentId) => currentId || fallback.id);
      })
      .catch(() => setPresets([]));
  }, []);

  useEffect(load, [load]);

  function apply() {
    const preset = presets.find((row) => row.id === selected);
    if (!preset) return;
    onApply(preset.payload);
    setMessage(`Applied “${preset.name}”.`);
  }

  async function saveCurrent() {
    if (name.trim().length < 2) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload: PresetPayload = {};
      for (const key of PAYLOAD_KEYS) {
        const value = current[key];
        if (value !== undefined && value !== null && value !== "") (payload as Record<string, unknown>)[key] = value;
      }
      await apiFetch("/api/presets", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), kind: "generation", payload }),
      });
      load();
      setMessage(`“${name.trim()}” saved with your current settings.`);
      setNaming(false);
      setName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the preset");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="preset-bar">
      <span className="preset-label">Preset</span>
      <select value={selected} onChange={(event) => setSelected(event.target.value)} aria-label="Saved preset">
        <option value="">None selected</option>
        {presets.map((preset) => (
          <option value={preset.id} key={preset.id}>
            {preset.name} — {describe(preset.payload)}
            {preset.isDefault ? " · default" : ""}
          </option>
        ))}
      </select>
      <button type="button" className="button button-ghost button-small" onClick={apply} disabled={!selected}>Apply</button>
      {naming ? (
        <span className="preset-name-row">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Festive catalogue 2K" maxLength={80} aria-label="Preset name" autoFocus onKeyDown={(event) => { if (event.key === "Enter") void saveCurrent(); }} />
          <button type="button" className="button button-coral button-small" onClick={saveCurrent} disabled={saving || name.trim().length < 2}>{saving ? "Saving…" : "Save"}</button>
          <button type="button" className="button button-ghost button-small" onClick={() => { setNaming(false); setName(""); }}>Cancel</button>
        </span>
      ) : (
        <button type="button" className="button button-ghost button-small" onClick={() => setNaming(true)}>Save current</button>
      )}
      {presets.length === 0 && <span className="help">No presets yet — set up a look you like and save it.</span>}
      {message && <span className="help" role="status">{message}</span>}
    </div>
  );
}
