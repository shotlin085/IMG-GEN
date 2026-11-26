"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin";
  organizationName: string | null;
  disabledAt: string | null;
  createdAt: string;
  jobCount: number;
  activeSessions: number;
};

type TaxonomyNode = {
  id: string;
  parentId: string | null;
  category: string;
  slug: string;
  name: string;
  aliases: string[];
  isActive: boolean;
  compatibility: Record<string, unknown>;
  children?: TaxonomyNode[];
};

type WearStyle = {
  id: string;
  kind: string;
  slug: string;
  name: string;
  region: string | null;
  taxonomySlugs: string[];
  promptFragment: string;
  drapeSteps: string[];
  isActive: boolean;
};

type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
};

function usePanel<T>(endpoint: string, unwrap: (raw: unknown) => T) {
  const [rows, setRows] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    apiFetch<unknown>(endpoint)
      .then((raw) => { setError(null); setRows(unwrap(raw)); })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load this panel"));
    // unwrap identity is stable per call site; re-running on its identity is noise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);
  useEffect(reload, [reload]);
  return { rows, error, reload, setError };
}

function PanelHead({ kicker, title, right }: { kicker: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="panel-head">
      <div><p className="panel-kicker">{kicker}</p><h2 className="panel-title">{title}</h2></div>
      {right}
    </div>
  );
}

const EMPTY_USER = { email: "", name: "", password: "", role: "customer", organizationName: "" };

export function UsersPanel() {
  const { rows, error, reload, setError } = usePanel<{ users: AdminUser[]; activeAdmins: number }>(
    "/api/admin/users",
    (raw) => raw as { users: AdminUser[]; activeAdmins: number },
  );
  const [form, setForm] = useState(EMPTY_USER);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function act(label: string, run: () => Promise<unknown>) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await run();
      setNotice(label);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${label.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel panel-pad resource-panel">
      <PanelHead
        kicker="Accounts"
        title="Users"
        right={<span className="chip">{rows ? `${rows.users.length} accounts · ${rows.activeAdmins} active admin${rows.activeAdmins === 1 ? "" : "s"}` : "…"}</span>}
      />
      <p className="help">Admins are created here, never through public sign-up. Suspending revokes every live session immediately and leaves run history attributable.</p>
      {error && <p className="error-copy" role="alert">{error}</p>}
      {notice && <p className="help" role="status">{notice}</p>}

      <form className="user-create" onSubmit={(event) => {
        event.preventDefault();
        if (form.password.length < 16) { setError("An operator password must be at least 16 characters"); return; }
        void act(`Created ${form.email}`, () => apiFetch("/api/admin/users", { method: "POST", body: JSON.stringify({ ...form, organizationName: form.organizationName || null }) })
          .then(() => { setForm(EMPTY_USER); setNotice(null); }));
      }}>
        <label className="input-field"><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="off" /></label>
        <label className="input-field"><span>Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} /></label>
        <label className="input-field"><span>Initial password (16+ chars)</span><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={16} autoComplete="new-password" /></label>
        <div className="select-field"><label>Role</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="customer">Customer</option><option value="admin">Admin</option></select>
        </div>
        <label className="input-field"><span>Studio / business (optional)</span><input value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} maxLength={160} /></label>
        <div className="account-actions"><button className="button button-coral" disabled={saving}>Create account</button></div>
      </form>

      {!rows ? <p className="help">Loading accounts…</p> : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Account</th><th>Role</th><th>Jobs</th><th>Sessions</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.users.map((user) => (
                <tr key={user.id}>
                  <td><div className="user-cell-name">{user.name}</div><div className="user-cell-sub">{user.email}{user.organizationName ? ` · ${user.organizationName}` : ""}</div></td>
                  <td>
                    <select
                      value={user.role}
                      aria-label={`Role for ${user.email}`}
                      disabled={saving}
                      onChange={(e) => void act(`${user.email} is now ${e.target.value}`, () => apiFetch(`/api/admin/users/${user.id}/role`, { method: "PATCH", body: JSON.stringify({ role: e.target.value }) }))}
                    >
                      <option value="customer">customer</option><option value="admin">admin</option>
                    </select>
                  </td>
                  <td>{user.jobCount}</td>
                  <td>{user.activeSessions}</td>
                  <td><span className={`chip ${user.disabledAt ? "chip-warn" : ""}`}>{user.disabledAt ? "suspended" : "active"}</span></td>
                  <td>
                    <button
                      type="button"
                      className="button button-ghost button-small"
                      disabled={saving}
                      onClick={() => void act(user.disabledAt ? `${user.email} reinstated` : `${user.email} suspended`, () => apiFetch(`/api/admin/users/${user.id}/suspension`, { method: "POST", body: JSON.stringify({ disabled: !user.disabledAt }) }))}
                    >
                      {user.disabledAt ? "Reinstate" : "Suspend"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function TaxonomyPanel() {
  const { rows, error, reload, setError } = usePanel<TaxonomyNode[]>(
    "/api/garments/taxonomy/tree",
    (raw) => raw as TaxonomyNode[],
  );
  const [form, setForm] = useState({ category: "women", slug: "", name: "", aliases: "", parentId: "" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function create() {
    if (form.slug.length < 2 || form.name.length < 2) { setError("Slug and name are both required"); return; }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/admin/garment-taxonomy", {
        method: "POST",
        body: JSON.stringify({
          category: form.category,
          slug: form.slug.trim(),
          name: form.name.trim(),
          parentId: form.parentId || null,
          aliases: form.aliases.split(",").map((alias) => alias.trim()).filter(Boolean),
        }),
      });
      setNotice(`${form.name.trim()} added`);
      setForm({ ...form, slug: "", name: "", aliases: "", parentId: "" });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the node");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(node: TaxonomyNode) {
    try {
      await apiFetch(`/api/admin/garment-taxonomy/${node.id}`, { method: "PUT", body: JSON.stringify({ isActive: false }) });
      setNotice(`${node.name} deactivated`);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not deactivate");
    }
  }

  const flat: Array<TaxonomyNode & { depth: number }> = [];
  const walk = (nodes: TaxonomyNode[], depth: number) => {
    for (const node of nodes) {
      flat.push({ ...node, depth });
      if (node.children?.length) walk(node.children as TaxonomyNode[], depth + 1);
    }
  };
  walk(rows ?? [], 0);

  return (
    <section className="panel panel-pad resource-panel">
      <PanelHead kicker="Catalogue" title="Garment taxonomy" right={<span className="chip">{rows ? `${flat.length} nodes` : "…"}</span>} />
      <p className="help">Garments and wear styles are matched through these slugs. Deactivating hides a node from new work; historical jobs keep their recorded classification.</p>
      {error && <p className="error-copy" role="alert">{error}</p>}
      {notice && <p className="help" role="status">{notice}</p>}

      <div className="tax-create">
        <div className="select-field"><label>Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="women">Women</option><option value="men">Men</option><option value="kids">Kids</option><option value="unisex">Unisex</option>
          </select>
        </div>
        <label className="input-field"><span>Slug</span><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="womens-chiffon-saree" pattern="[a-z0-9-]+" /></label>
        <label className="input-field"><span>Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Chiffon Saree" /></label>
        <label className="input-field"><span>Aliases (comma separated)</span><input value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} placeholder="Chiffon, Translucent Saree" /></label>
        <div className="select-field"><label>Parent</label>
          <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
            <option value="">Top level</option>
            {(rows ?? []).map((root) => <option value={root.id} key={root.id}>{root.name}</option>)}
          </select>
        </div>
        <button type="button" className="button button-coral" onClick={create} disabled={saving}>Add node</button>
      </div>

      {!rows ? <p className="help">Loading taxonomy…</p> : (
        <div className="tax-list">
          {flat.map((node) => (
            <div className="tax-row" key={node.id} style={{ paddingLeft: `${8 + node.depth * 18}px` }}>
              <span className="tax-name">{node.name}</span>
              <code className="tax-slug">{node.slug}</code>
              <span className="chip tax-cat">{node.category}</span>
              {node.aliases.length > 0 && <span className="help">{node.aliases.join(", ")}</span>}
              {node.depth === 0 && node.children?.length ? <span className="help">{node.children.length} sub-types</span> : null}
              <button type="button" className="button button-ghost button-small" onClick={() => deactivate(node)}>Deactivate</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const EMPTY_STYLE = { kind: "saree_drape", slug: "", name: "", region: "", taxonomySlugs: "", promptFragment: "", drapeSteps: "" };

export function WearStylesPanel() {
  const { rows, error, reload, setError } = usePanel<WearStyle[]>("/api/garments/wear-styles", (raw) => raw as WearStyle[]);
  const [form, setForm] = useState(EMPTY_STYLE);
  const [kind, setKind] = useState("all");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function create() {
    if (form.slug.length < 3 || form.promptFragment.length < 20) {
      setError("A slug and a prompt fragment of at least 20 characters are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/admin/wear-styles", {
        method: "POST",
        body: JSON.stringify({
          kind: form.kind,
          slug: form.slug.trim(),
          name: form.name.trim() || form.slug.trim(),
          region: form.region.trim() || undefined,
          taxonomySlugs: form.taxonomySlugs.split(",").map((entry) => entry.trim()).filter(Boolean),
          promptFragment: form.promptFragment.trim(),
          drapeSteps: form.drapeSteps.split("\n").map((step) => step.trim()).filter(Boolean),
        }),
      });
      setNotice("Wear style added — it appears in the studio for the slugs you listed.");
      setForm(EMPTY_STYLE);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the wear style");
    } finally {
      setSaving(false);
    }
  }

  async function remove(style: WearStyle) {
    try {
      await apiFetch(`/api/admin/wear-styles/${style.id}`, { method: "DELETE" });
      setNotice(`${style.name} removed`);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the wear style");
    }
  }

  const visible = (rows ?? []).filter((style) => kind === "all" || style.kind === kind);

  return (
    <section className="panel panel-pad resource-panel">
      <PanelHead kicker="Catalogue" title="Drapes &amp; wear styles" right={<span className="chip">{rows ? `${rows.length} styles` : "…"}</span>} />
      <p className="help">Each style carries the prompt fragment the pipeline uses, so editing one changes future generations and never rewrites history.</p>
      {error && <p className="error-copy" role="alert">{error}</p>}
      {notice && <p className="help" role="status">{notice}</p>}

      <details className="style-form">
        <summary className="button button-ghost button-small">Add a wear style</summary>
        <div className="account-form" style={{ marginTop: 14 }}>
          <div className="select-field"><label>Kind</label>
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="saree_drape">Saree drape</option><option value="dupatta_placement">Dupatta placement</option><option value="regional_look">Regional look</option><option value="layering">Layering</option>
            </select>
          </div>
          <label className="input-field"><span>Slug</span><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="drape-parsi-gara" pattern="[a-z0-9-]+" /></label>
          <label className="input-field"><span>Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Parsi Gara drape" /></label>
          <label className="input-field"><span>Region</span><input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Mumbai" /></label>
          <label className="input-field"><span>Taxonomy slugs (comma separated)</span><input value={form.taxonomySlugs} onChange={(e) => setForm({ ...form, taxonomySlugs: e.target.value })} placeholder="womens-saree, womens-saree-silk" /></label>
          <label className="input-field"><span>Prompt fragment</span><textarea rows={3} value={form.promptFragment} onChange={(e) => setForm({ ...form, promptFragment: e.target.value })} placeholder="How the garment should actually be worn in frame…" /></label>
          <label className="input-field"><span>Drape steps (one per line)</span><textarea rows={3} value={form.drapeSteps} onChange={(e) => setForm({ ...form, drapeSteps: e.target.value })} /></label>
          <div className="account-actions"><button type="button" className="button button-coral" onClick={create} disabled={saving}>Save style</button></div>
        </div>
      </details>

      <div className="style-filter">
        <span className="preset-label">Filter</span>
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter wear styles">
          <option value="all">All kinds</option><option value="saree_drape">Saree drapes</option><option value="dupatta_placement">Dupatta placements</option><option value="regional_look">Regional looks</option><option value="layering">Layering</option>
        </select>
      </div>

      {!rows ? <p className="help">Loading styles…</p> : (
        <div className="style-list">
          {visible.map((style) => (
            <div className="style-row" key={style.id}>
              <div className="style-row-head"><strong>{style.name}</strong><span className="chip">{style.kind.replaceAll("_", " ")}</span>{style.region && <span className="help">{style.region}</span>}</div>
              <code className="tax-slug">{style.slug}</code>
              <p className="style-frag">{style.promptFragment}</p>
              {style.drapeSteps.length > 0 && <p className="help">{style.drapeSteps.join(" → ")}</p>}
              <p className="help">Applies to: {style.taxonomySlugs.join(", ") || "—"}</p>
              <button type="button" className="button button-ghost button-small" onClick={() => remove(style)}>Remove</button>
            </div>
          ))}
          {visible.length === 0 && <p className="help">No styles in this kind.</p>}
        </div>
      )}
    </section>
  );
}

export function AuditPanel() {
  const { rows, error, reload } = usePanel<AuditEvent[]>("/api/admin/audit?limit=100", (raw) => (raw as { events: AuditEvent[] }).events);
  return (
    <section className="panel panel-pad resource-panel">
      <PanelHead
        kicker="Governance"
        title="Audit trail"
        right={<button type="button" className="button button-ghost button-small" onClick={reload}>Refresh</button>}
      />
      <p className="help">Every configuration and account change made through the control room, newest first.</p>
      {error && <p className="error-copy" role="alert">{error}</p>}
      {!rows ? <p className="help">Loading audit events…</p> : rows.length === 0 ? (
        <div className="empty-state"><strong>Nothing recorded yet</strong><span>Publish a workflow version, change a role or add a taxonomy node and it will appear here.</span></div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead>
            <tbody>
              {rows.map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.createdAt).toLocaleString()}</td>
                  <td>{event.actorName ?? "—"}<div className="user-cell-sub">{event.actorEmail} · {event.actorRole}</div></td>
                  <td><code>{event.action}</code></td>
                  <td>{event.entityType}<div className="user-cell-sub">{event.entityId?.slice(0, 8) ?? "—"}</div></td>
                  <td className="audit-payload">{event.payload ? JSON.stringify(event.payload).slice(0, 160) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
