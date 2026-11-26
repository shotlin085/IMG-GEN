"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { apiFetch } from "./api";

export type GarmentProfile = {
  id: string;
  assetId: string;
  taxonomyNodeId: string | null;
  status: "auto_detected" | "confirmed" | "corrected";
  detection: Record<string, unknown>;
  confidence: Record<string, number | null>;
  confirmedAttributes: Record<string, unknown>;
};

type TaxonomyNode = {
  id: string;
  name: string;
  category: string;
  children: TaxonomyNode[];
};

type TruthSheet = {
  garmentType?: string;
  colors?: Array<{ name: string; hex: string | null }>;
  material?: string;
  pattern?: string;
  border?: string;
  embroidery?: string;
  neckline?: string;
  sleeves?: string;
  lengthSilhouette?: string;
  drapePallu?: string;
  specialDetails?: string[];
  uncertainDetails?: string[];
  confidence?: number;
};

const GARMENT_TYPES = ["saree", "lehenga", "kurta", "kurti", "dress", "shirt", "top", "menswear", "other"];
const EDIT_FIELDS = ["material", "pattern", "border", "embroidery", "neckline", "sleeves", "lengthSilhouette"] as const;

function truth(profile: GarmentProfile): TruthSheet {
  return { ...(profile.detection as TruthSheet), ...(profile.confirmedAttributes as TruthSheet) };
}

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function GarmentIntel({ profile, analyzing, error, editable, onConfirmed }: {
  profile: GarmentProfile | null;
  analyzing: boolean;
  error: string | null;
  editable: boolean;
  onConfirmed: (next: GarmentProfile) => void;
}) {
  const [taxonomy, setTaxonomy] = useState<TaxonomyNode[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [garmentType, setGarmentType] = useState<string | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || !editable) return;
    let cancelled = false;
    apiFetch<TaxonomyNode[]>("/api/garments/taxonomy/tree")
      .then((tree) => { if (!cancelled) setTaxonomy(tree); })
      .catch(() => { /* taxonomy picker unavailable; confirm still works without it */ });
    return () => { cancelled = true; };
  }, [editable]);

  useEffect(() => {
    if (!profile) return;
    const t = truth(profile);
    setDraft(Object.fromEntries(EDIT_FIELDS.map((f) => [f, String(t[f as keyof TruthSheet] ?? "")])));
    setGarmentType(t.garmentType ?? null);
    setNodeId(profile.taxonomyNodeId);
    setSaveError(null);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (analyzing) {
    return (
      <motion.p className="help" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="status">
        Reading your garment — recognizing type, fabric, colour and detailing…
      </motion.p>
    );
  }
  if (!profile) {
    return error ? <p className="help" role="status">{error}</p> : null;
  }

  const t = truth(profile);
  const chips: string[] = [];
  if (t.colors?.length) chips.push(t.colors.map((c) => c.name).join(" · "));
  for (const key of ["material", "pattern", "neckline", "sleeves", "lengthSilhouette", "drapePallu"] as const) {
    const value = t[key];
    if (value && value.toLowerCase() !== "none") chips.push(humanize(value));
  }
  if (t.embroidery && t.embroidery.toLowerCase() !== "none") chips.push(`Embroidery: ${t.embroidery}`);
  const confidence = typeof t.confidence === "number" ? `${t.confidence}% sure` : "confidence n/a";
  const statusChip = profile.status === "auto_detected" ? "AI detected · review below" : profile.status === "confirmed" ? "You confirmed this" : "You corrected this";
  const dirty = garmentType !== t.garmentType || nodeId !== profile.taxonomyNodeId
    || EDIT_FIELDS.some((f) => draft[f] !== String(t[f as keyof TruthSheet] ?? ""));

  async function confirm() {
    if (!profile) return;
    setSaving(true);
    setSaveError(null);
    try {
      const confirmedAttributes: Record<string, unknown> = { ...draft };
      if (garmentType) confirmedAttributes.garmentType = garmentType;
      const next = await apiFetch<GarmentProfile>("/api/garments/profiles/" + profile.id, {
        method: "PATCH",
        body: JSON.stringify({
          status: dirty ? "corrected" : "confirmed",
          confirmedAttributes,
          taxonomyNodeId: nodeId ?? null,
        }),
      });
      onConfirmed(next);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save this garment profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div className="garment-intel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <div className="garment-intel-head">
        <p className="garment-intel-title">
          We detected this as <strong>{garmentType ? humanize(garmentType) : "a garment"}</strong>
          {t.uncertainDetails && t.uncertainDetails.length > 0 && (
            <span className="help"> · unsure about: {t.uncertainDetails.join(", ")}</span>
          )}
        </p>
        <div className="garment-intel-chips">
          <span className="chip">{confidence}</span>
          <span className="chip">{statusChip}</span>
        </div>
      </div>
      {chips.length > 0 && <div className="garment-intel-chips"><span className="chip">{chips.join(" · ")}</span></div>}
      {editable ? (
        <div className="garment-intel-form">
          <label className="garment-intel-field">
            <span>Type</span>
            <select value={garmentType ?? ""} onChange={(e) => setGarmentType(e.target.value)} aria-label="Garment type">
              {GARMENT_TYPES.map((option) => <option value={option} key={option}>{humanize(option)}</option>)}
            </select>
          </label>
          {taxonomy.length > 0 && (
            <label className="garment-intel-field">
              <span>Category</span>
              <select value={nodeId ?? ""} onChange={(e) => setNodeId(e.target.value || null)} aria-label="Garment category">
                <option value="">Not set</option>
                {taxonomy.map((group) => group.children.length > 0
                  ? <optgroup label={humanize(group.category)} key={group.id}>{group.children.map((child) => <option value={child.id} key={child.id}>{child.name}</option>)}</optgroup>
                  : <option value={group.id} key={group.id}>{group.name}</option>)}
              </select>
            </label>
          )}
          {EDIT_FIELDS.map((field) => (
            <label className="garment-intel-field" key={field}>
              <span>{humanize(field)}</span>
              <input value={draft[field] ?? ""} onChange={(e) => setDraft((current) => ({ ...current, [field]: e.target.value }))} aria-label={humanize(field)} />
            </label>
          ))}
          <div className="garment-intel-actions">
            <button type="button" className="button button-ghost" disabled={saving} onClick={confirm} aria-pressed={profile.status !== "auto_detected"}>
              {saving ? "Saving…" : dirty ? "Save corrections" : "Confirm garment"}
            </button>
            {saveError && <span className="help" role="alert">{saveError}</span>}
          </div>
        </div>
      ) : (
        <p className="help">Switch to Pro controls to correct anything we misread. The generation brief uses your confirmed details.</p>
      )}
    </motion.div>
  );
}
