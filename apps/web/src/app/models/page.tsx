"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AppShell } from "../../components/app-shell";
import { apiFetch } from "../../components/api";

type AgeGroup = { id: string; label: string; band: string; isMinor: boolean };

type Model = {
  id: string;
  name: string;
  description: string | null;
  attributes: Record<string, unknown>;
  originKind: "preset" | "synthetic" | "custom";
  isPreset: boolean;
  mine: boolean;
  consentConfirmedAt: string | null;
  guardianConfirmedAt: string | null;
};

const ORIGIN_LABELS: Record<Model["originKind"], string> = {
  preset: "Studio model",
  synthetic: "Synthetic model",
  custom: "Your model",
};

const EMPTY_FORM = {
  name: "",
  gender: "female",
  ageAppearance: "adult",
  height: "average",
  build: "medium",
  skinTone: "",
  synthetic: false,
  consentConfirmed: false,
  guardianConfirmed: false,
};

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gender, setGender] = useState("all");
  const [ageBand, setAgeBand] = useState("all");
  const [origin, setOrigin] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<Model[]>("/api/customer/model-library").then(setModels).catch((error) =>
      setLoadError(error instanceof Error && error.message.includes("Not signed in") ? "Sign in to browse the model library." : "Model library unavailable."),
    );
  }, []);

  useEffect(() => {
    load();
    apiFetch<{ ageGroups: AgeGroup[] }>("/api/customer/options")
      .then((data) => setAgeGroups(data.ageGroups))
      .catch(() => setAgeGroups([]));
  }, [load]);

  const groupsById = useMemo(
    () => Object.fromEntries(ageGroups.map((group) => [group.id, group])),
    [ageGroups],
  );

  function ageGroupOf(model: Model): AgeGroup | undefined {
    const value = typeof model.attributes.ageAppearance === "string" ? model.attributes.ageAppearance : "";
    const direct = ageGroups.find((group) => group.id === value);
    if (direct) return direct;
    // Legacy catalogue strings (mid-20s, late-teens…) still need a filter bucket.
    if (value.includes("teen")) return groupsById.teen;
    if (value.includes("20")) return groupsById["young-adult"];
    if (value.includes("30")) return groupsById.adult;
    if (value.includes("40") || value === "mature") return groupsById["middle-aged"];
    if (value.includes("50")) return groupsById["middle-aged"];
    if (value.includes("60") || value.includes("70")) return groupsById.senior;
    return undefined;
  }

  const visible = models.filter((model) => {
    if (gender !== "all" && model.attributes.gender !== gender) return false;
    if (origin !== "all" && model.originKind !== origin) return false;
    if (ageBand !== "all" && ageGroupOf(model)?.id !== ageBand) return false;
    return true;
  });

  const selectedAgeIsMinor = groupsById[form.ageAppearance]?.isMinor === true;

  async function createModel(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await apiFetch("/api/customer/model-library", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          attributes: {
            gender: form.gender,
            ageAppearance: form.ageAppearance,
            height: form.height,
            build: form.build,
            skinTone: form.skinTone || undefined,
          },
          synthetic: form.synthetic,
          consentConfirmed: form.consentConfirmed,
          guardianConfirmed: form.guardianConfirmed,
        }),
      });
      setNotice(`${form.name} was added to your model library.`);
      setForm(EMPTY_FORM);
      setFormOpen(false);
      load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not add this model");
    } finally {
      setSaving(false);
    }
  }

  async function removeModel(model: Model) {
    try {
      await apiFetch(`/api/customer/model-library/${model.id}`, { method: "DELETE" });
      setNotice(`${model.name} was removed.`);
      load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not remove this model");
    }
  }

  return (
    <AppShell section="Models">
      <div className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Model library</p>
            <h1 className="display">Who wears <em>the garment.</em></h1>
            <p className="lede">Studio characters, synthetic identities, and the models you have rights to use — filtered by gender, age band and origin.</p>
          </div>
          <button type="button" className="button button-coral" onClick={() => setFormOpen((open) => !open)} aria-expanded={formOpen}>
            {formOpen ? "Close" : "Add a model"}
          </button>
        </div>

        {formOpen && (
          <motion.section className="panel panel-pad" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} aria-label="Add a model">
            <form onSubmit={createModel} className="account-form">
              <label className="input-field"><span>Model name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Anaya" required minLength={2} /></label>
              <div className="select-row">
                <div className="select-field"><label>Gender</label>
                  <select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
                    <option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                  </select>
                </div>
                <div className="select-field"><label>Age group</label>
                  <select value={form.ageAppearance} onChange={(event) => setForm({ ...form, ageAppearance: event.target.value })}>
                    {ageGroups.map((group) => <option value={group.id} key={group.id}>{group.label} · {group.band}</option>)}
                  </select>
                </div>
                <div className="select-field"><label>Height</label>
                  <select value={form.height} onChange={(event) => setForm({ ...form, height: event.target.value })}>
                    <option value="petite">Petite</option><option value="average">Average</option><option value="tall">Tall</option>
                  </select>
                </div>
                <div className="select-field"><label>Build</label>
                  <select value={form.build} onChange={(event) => setForm({ ...form, build: event.target.value })}>
                    <option value="slim">Slim</option><option value="medium">Medium</option><option value="athletic">Athletic</option><option value="broad">Broad</option><option value="curve">Curve</option>
                  </select>
                </div>
              </div>
              <label className="input-field"><span>Skin tone (optional)</span><input value={form.skinTone} onChange={(event) => setForm({ ...form, skinTone: event.target.value })} placeholder="e.g. warm medium" maxLength={60} /></label>
              <label className="account-check"><input type="checkbox" checked={form.synthetic} onChange={(event) => setForm({ ...form, synthetic: event.target.checked })} /><span>This is a generated identity, not a photo of a real person.</span></label>
              <label className="account-check">
                <input type="checkbox" checked={form.consentConfirmed} onChange={(event) => setForm({ ...form, consentConfirmed: event.target.checked })} required />
                <span>I have the right to use this likeness for commercial garment imagery and can evidence that on request.</span>
              </label>
              {selectedAgeIsMinor && (
                <label className="account-check account-check-minor">
                  <input type="checkbox" checked={form.guardianConfirmed} onChange={(event) => setForm({ ...form, guardianConfirmed: event.target.checked })} />
                  <span>A parent or legal guardian has confirmed in writing that this under-18 model may appear. Under-18 shoots always follow the age-appropriate styling policy.</span>
                </label>
              )}
              <div className="account-actions">
                <button className="button button-coral" disabled={saving || !form.consentConfirmed}>{saving ? "Adding…" : "Add to library"}</button>
                {formError && <span className="help" role="alert" style={{ color: "var(--critical)" }}>{formError}</span>}
              </div>
            </form>
          </motion.section>
        )}

        <section className="panel panel-pad model-filters" aria-label="Filter models">
          <div className="select-field"><label>Gender</label>
            <select value={gender} onChange={(event) => setGender(event.target.value)}>
              <option value="all">All</option><option value="female">Women</option><option value="male">Men</option><option value="other">Other</option>
            </select>
          </div>
          <div className="select-field"><label>Age band</label>
            <select value={ageBand} onChange={(event) => setAgeBand(event.target.value)}>
              <option value="all">All</option>
              {ageGroups.map((group) => <option value={group.id} key={group.id}>{group.label} · {group.band}</option>)}
            </select>
          </div>
          <div className="select-field"><label>Origin</label>
            <select value={origin} onChange={(event) => setOrigin(event.target.value)}>
              <option value="all">All</option><option value="preset">Studio</option><option value="synthetic">Synthetic</option><option value="custom">Yours</option>
            </select>
          </div>
          <span className="help">{visible.length} of {models.length} models</span>
        </section>

        {notice && <p className="help" role="status">{notice}</p>}
        {loadError && <p className="help" role="alert">{loadError}</p>}

        <div className="model-grid">
          {visible.map((model) => (
            <article className="panel model-card" key={model.id}>
              <div className="model-card-head">
                <h2 className="model-name">{model.name}</h2>
                <span className="chip">{ORIGIN_LABELS[model.originKind]}</span>
              </div>
              <p className="model-note">{model.description ?? "No description recorded."}</p>
              <dl className="model-facts">
                <div><dt>Gender</dt><dd>{String(model.attributes.gender ?? "—")}</dd></div>
                <div><dt>Age</dt><dd>{ageGroupOf(model)?.label ?? String(model.attributes.ageAppearance ?? "—")}</dd></div>
                <div><dt>Height</dt><dd>{String(model.attributes.height ?? "—")}</dd></div>
                <div><dt>Build</dt><dd>{String(model.attributes.build ?? "—")}</dd></div>
              </dl>
              {model.originKind === "custom" && (
                <p className="help">Consent recorded{model.guardianConfirmedAt ? " · guardian confirmed" : ""}.</p>
              )}
              {model.mine && (
                <button type="button" className="button button-ghost button-small" onClick={() => removeModel(model)}>
                  Remove
                </button>
              )}
            </article>
          ))}
          {visible.length === 0 && !loadError && (
            <div className="empty-state"><strong>No models match</strong><span>Clear a filter, or add a model you have the rights to use.</span></div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
