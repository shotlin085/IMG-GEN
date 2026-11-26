"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { apiFetch } from "../../components/api";

type LibraryGarment = {
  id: string;
  assetId: string;
  title: string | null;
  isFavorite: boolean;
  status: "auto_detected" | "confirmed" | "corrected";
  detection: Record<string, unknown>;
  taxonomyName: string | null;
  previewUrl: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<LibraryGarment["status"], string> = {
  auto_detected: "AI detected — not reviewed",
  confirmed: "You confirmed it",
  corrected: "You corrected it",
};

export default function GarmentsPage() {
  const router = useRouter();
  const [garments, setGarments] = useState<LibraryGarment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<{ garments: LibraryGarment[] }>("/api/garments/library")
      .then((payload) => setGarments(payload.garments))
      .catch((err) =>
        setError(err instanceof Error && err.message.includes("Not signed in") ? "Sign in to open your garment library." : "Garment library unavailable."),
      );
  }, []);

  useEffect(load, [load]);

  async function saveTitle(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/api/garments/library/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: titleDraft.trim() || null }),
      });
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename this garment");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFavorite(garment: LibraryGarment) {
    setBusyId(garment.id);
    try {
      await apiFetch(`/api/garments/library/${garment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isFavorite: !garment.isFavorite }),
      });
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(garment: LibraryGarment) {
    setBusyId(garment.id);
    try {
      await apiFetch(`/api/garments/library/${garment.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this garment");
    } finally {
      setBusyId(null);
    }
  }

  /** Hand the studio this garment's asset so generation continues from it. */
  function useInStudio(garment: LibraryGarment) {
    try {
      window.localStorage.setItem(
        "shotlin:studio-use-garment",
        JSON.stringify({
          assetId: garment.assetId,
          profileId: garment.id,
          previewUrl: garment.previewUrl,
          title: garment.title ?? garment.taxonomyName ?? "Garment",
        }),
      );
    } catch {
      // Storage unavailable: the studio will simply start empty.
    }
    router.push("/");
  }

  return (
    <AppShell section="Garments">
      <div className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Garment library</p>
            <h1 className="display">Every garment <em>you have taught.</em></h1>
            <p className="lede">Each reference you upload is recognised once and kept. Name the ones you sell, favourite the current season, and start a new shoot from any of them.</p>
          </div>
          <a className="button button-ghost" href="/">Upload a new garment</a>
        </div>

        {error && <p className="help" role="alert">{error}</p>}
        {!garments && !error && <section className="panel panel-pad loading-panel">Loading your garments…</section>}

        {garments && garments.length === 0 && (
          <section className="panel panel-pad">
            <div className="empty-state"><strong>Nothing recognised yet</strong><span>Upload a garment reference in the studio and Shotlin will read it, name its details and keep it here.</span></div>
          </section>
        )}

        {garments && garments.length > 0 && (
          <div className="garment-grid">
            {garments.map((garment) => (
              <article className="panel garment-card" key={garment.id}>
                <div className="garment-thumb">
                  {garment.previewUrl ? <img src={garment.previewUrl} alt={garment.title ?? garment.taxonomyName ?? "Garment reference"} /> : <span className="help">Preview unavailable</span>}
                  {garment.isFavorite && <span className="chip garment-fav-chip">Favourite</span>}
                </div>
                <div className="garment-body">
                  {editing === garment.id ? (
                    <div className="garment-edit-row">
                      <input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} maxLength={120} aria-label="Garment name" autoFocus onKeyDown={(event) => { if (event.key === "Enter") void saveTitle(garment.id); }} />
                      <button type="button" className="button button-coral button-small" onClick={() => saveTitle(garment.id)} disabled={busyId === garment.id}>Save</button>
                      <button type="button" className="button button-ghost button-small" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="garment-title-row">
                      <h2 className="garment-title">{garment.title ?? garment.taxonomyName ?? "Untitled garment"}</h2>
                      <button type="button" className="button button-ghost button-small" onClick={() => { setEditing(garment.id); setTitleDraft(garment.title ?? ""); }}>Rename</button>
                    </div>
                  )}
                  <p className="help">{garment.taxonomyName ?? "Uncategorised"} · {STATUS_LABEL[garment.status]}</p>
                  <p className="garment-facts">{[
                    typeof garment.detection.material === "string" ? garment.detection.material : null,
                    typeof garment.detection.pattern === "string" ? garment.detection.pattern : null,
                    typeof garment.detection.neckline === "string" ? garment.detection.neckline : null,
                    typeof garment.detection.lengthSilhouette === "string" ? garment.detection.lengthSilhouette : null,
                  ].filter(Boolean).join(" · ") || "No detail facts recorded yet."}</p>
                  <div className="account-actions">
                    <button type="button" className="button button-coral button-small" onClick={() => useInStudio(garment)}>Shoot this garment</button>
                    <button type="button" className="button button-ghost button-small" onClick={() => toggleFavorite(garment)} aria-pressed={garment.isFavorite}>{garment.isFavorite ? "Unfavourite" : "Favourite"}</button>
                    <button type="button" className="button button-ghost button-small" onClick={() => remove(garment)} disabled={busyId === garment.id}>Remove</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
