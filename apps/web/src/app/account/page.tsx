"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { apiFetch } from "../../components/api";

type Account = {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin";
  organizationName: string | null;
  preferences: {
    defaultResolution?: "1k" | "2k" | "4k";
    defaultAspectRatio?: "portrait" | "square" | "landscape";
    defaultOutputCount?: number;
  };
  onboardedAt: string | null;
  createdAt: string;
  garmentProfileCount: number;
  activeSessions: number;
};

export default function AccountPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [resolution, setResolution] = useState("2k");
  const [aspect, setAspect] = useState("portrait");
  const [count, setCount] = useState("3");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Account>("/api/account")
      .then((data) => {
        setAccount(data);
        setName(data.name);
        setOrganization(data.organizationName ?? "");
        setResolution(data.preferences.defaultResolution ?? "2k");
        setAspect(data.preferences.defaultAspectRatio ?? "portrait");
        setCount(String(data.preferences.defaultOutputCount ?? 3));
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const updated = await apiFetch<Account>("/api/account", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          organizationName: organization.trim() || null,
          preferences: {
            defaultResolution: resolution,
            defaultAspectRatio: aspect,
            defaultOutputCount: Number(count),
          },
        }),
      });
      setAccount((current) => (current ? { ...current, ...updated } : current));
      setProfileMessage("Workspace details saved");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Could not save your details");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== repeatPassword) {
      setPasswordMessage("The new passwords do not match");
      return;
    }
    if (newPassword.length < 10) {
      setPasswordMessage("Use at least 10 characters for the new password");
      return;
    }
    setSavingPassword(true);
    setPasswordMessage(null);
    try {
      await apiFetch("/api/account/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      setPasswordMessage("Password changed. Other devices were signed out.");
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : "Could not change the password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function signOut() {
    setSignedOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Session may already be revoked server-side.
    }
    router.push("/login");
  }

  return (
    <AppShell section="Account">
      <div className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1 className="display">Your <em>account.</em></h1>
            <p className="lede">Studio identity, defaults every new generation starts from, and the keys to your sessions.</p>
          </div>
          {account && <span className="chip">{account.role === "admin" ? "Admin · control plane" : "Customer workspace"}</span>}
        </div>

        <div className="settings-grid">
          <section className="panel panel-pad">
            <div className="panel-head"><div><p className="panel-kicker">Studio identity</p><h2 className="panel-title">Who is generating</h2></div></div>
            <form onSubmit={saveProfile} className="account-form">
              <label className="input-field"><span>Your name</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
              <label className="input-field"><span>Studio or business name</span><input value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder="Optional — appears on shared exports" autoComplete="organization" /></label>
              <label className="input-field"><span>Email</span><input value={account?.email ?? ""} readOnly aria-readonly="true" /></label>
              <div className="select-row">
                <div className="select-field"><label>Default resolution</label>
                  <select value={resolution} onChange={(event) => setResolution(event.target.value)}>
                    <option value="1k">1K · drafts</option><option value="2k">2K · standard</option><option value="4k">4K · final</option>
                  </select>
                </div>
                <div className="select-field"><label>Default frame</label>
                  <select value={aspect} onChange={(event) => setAspect(event.target.value)}>
                    <option value="portrait">Portrait</option><option value="square">Square</option><option value="landscape">Landscape</option>
                  </select>
                </div>
                <div className="select-field"><label>Images per run</label>
                  <select value={count} onChange={(event) => setCount(event.target.value)}>
                    {[1, 2, 3, 4, 5].map((option) => <option value={option} key={option}>{option} {option === 1 ? "image" : "images"}</option>)}
                  </select>
                </div>
              </div>
              <div className="account-actions">
                <button className="button button-coral" disabled={savingProfile || !account}>{savingProfile ? "Saving…" : "Save workspace details"}</button>
                {profileMessage && <span className="help" role="status">{profileMessage}</span>}
              </div>
            </form>
          </section>

          <section className="panel panel-pad">
            <div className="panel-head"><div><p className="panel-kicker">Security</p><h2 className="panel-title">Password &amp; sessions</h2></div></div>
            <form onSubmit={savePassword} className="account-form">
              <label className="input-field"><span>Current password</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label>
              <label className="input-field"><span>New password</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={10} /></label>
              <label className="input-field"><span>Repeat new password</span><input type="password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} autoComplete="new-password" minLength={10} /></label>
              <p className="help">Changing the password signs out every other device. This browser stays signed in.</p>
              <div className="account-actions">
                <button className="button button-ghost" disabled={savingPassword || !currentPassword || !newPassword}>{savingPassword ? "Updating…" : "Change password"}</button>
                {passwordMessage && <span className="help" role="status">{passwordMessage}</span>}
              </div>
            </form>
            <div className="account-session-row">
              <div><span>Active sessions</span><strong>{account?.activeSessions ?? "—"}</strong></div>
              <div><span>Garments recognised</span><strong>{account?.garmentProfileCount ?? "—"}</strong></div>
              <div><span>Member since</span><strong>{account ? new Date(account.createdAt).toLocaleDateString() : "—"}</strong></div>
            </div>
            <div className="account-actions">
              <button type="button" className="button button-ghost" onClick={signOut} disabled={signedOut}>{signedOut ? "Signing out…" : "Sign out of this device"}</button>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
