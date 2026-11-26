"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Icon } from "./icon";
import { apiFetch } from "./api";

type SessionUser = { id: string; email: string; name: string; role: "customer" | "admin"; onboardedAt: string | null };

const workspaceNav = [
  { href: "/", label: "Studio", icon: "spark" as const },
  { href: "/projects", label: "Projects", icon: "folder" as const },
  { href: "/garments", label: "Garments", icon: "folder" as const },
  { href: "/batch", label: "Batch", icon: "grid" as const },
  { href: "/models", label: "Models", icon: "user" as const },
  { href: "/presets", label: "Presets", icon: "settings" as const },
  { href: "/account", label: "Account", icon: "user" as const },
];
const adminNav = [{ href: "/admin", label: "Control room", icon: "grid" as const }];
const mobileNav = [
  { href: "/", label: "Studio", icon: "spark" as const },
  { href: "/projects", label: "Projects", icon: "folder" as const },
  { href: "/garments", label: "Garments", icon: "folder" as const },
  { href: "/account", label: "Account", icon: "user" as const },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

function initialsOf(name: string) {  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "S";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const TOUR_STEPS = [
  { href: "#studio-garment", title: "Show us the garment", note: "Upload a flat photo, a detail close-up, or capture it with your camera." },
  { href: "#studio-character", title: "Pick who wears it", note: "Choose a studio character or upload your own model reference." },
  { href: "#studio-output", title: "Set the scene and generate", note: "Scene, resolution and frame — then Generate. Shotlin handles the prompt." },
];

function OnboardingTour({ onFinished }: { onFinished: () => void }) {
  const [dismissed, setDismissed] = useState<"idle" | "saving" | "hidden">("idle");

  async function finish(action: "complete" | "skip") {
    setDismissed("saving");
    try {
      await apiFetch("/api/account/onboarding", { method: "POST", body: JSON.stringify({ action }) });
      onFinished();
    } catch {
      // If the write fails the tour reappears next visit rather than silently vanishing.
      setDismissed("hidden");
    }
  }

  if (dismissed === "hidden") return null;

  return (
    <section className="onboarding panel" aria-label="First run tour">
      <div className="onboarding-head">
        <div>
          <p className="panel-kicker">First time here</p>
          <h2 className="panel-title">Three steps to your first look</h2>
        </div>
        <button type="button" className="button button-ghost button-small" onClick={() => finish("skip")} disabled={dismissed === "saving"}>Skip for now</button>
      </div>
      <ol className="onboarding-steps">
        {TOUR_STEPS.map((step, index) => (
          <li key={step.href}>
            <a href={step.href}>
              <span className="onboarding-number">{index + 1}</span>
              <span><span className="onboarding-title">{step.title}</span><span className="onboarding-note">{step.note}</span></span>
            </a>
          </li>
        ))}
      </ol>
      <div className="onboarding-foot">
        <span className="help">Nothing here is required — the studio works the same once the tour is dismissed.</span>
        <button type="button" className="button button-coral button-small" onClick={() => finish("complete")} disabled={dismissed === "saving"}>Finish tour</button>
      </div>
    </section>
  );
}

export function AppShell({ section, children }: { section: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [user, setUser] = useState<SessionUser | null | "loading">("loading");
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The server-side session may already be gone; local state still clears.
    }
    setUser(null);
    router.push("/login");
  }

  useEffect(() => {
    apiFetch<{ status: string }>("/api/health").then(() => setApiOnline(true)).catch(() => setApiOnline(false));
    apiFetch<{ user: SessionUser }>("/api/auth/me")
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null));
  }, []);

  const isAdmin = user !== "loading" && user?.role === "admin";
  const navItems = isAdmin ? [...workspaceNav, ...adminNav] : workspaceNav;
  const profile = user !== "loading" ? user : null;

  return <div className="app-frame">
    <aside className="rail">
      <Link className="brand" href="/"><span className="brand-mark" /><span className="brand-word">shotlin<span className="brand-dot">.</span></span></Link>
      <p className="rail-label">{isAdmin ? "Workspace" : "Workspace"}</p>
      <nav className="nav-list" aria-label="Primary navigation">
        {navItems.map((item) => <Link className={`nav-link ${isActive(pathname, item.href) ? "active" : ""}`} href={item.href} key={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined}><Icon name={item.icon} /><span>{item.label}</span></Link>)}
      </nav>
      <div className="rail-spacer" />
      <div className="rail-foot">
        {isAdmin && <Link className="nav-link" href="/settings"><Icon name="settings" /><span>Settings</span></Link>}
        {profile
          ? <div className="profile-row"><span className="avatar">{initialsOf(profile.name)}</span><div><div className="profile-name">{profile.name}</div><div className="profile-role">{profile.role === "admin" ? "Admin · control plane" : "Customer workspace"}</div></div></div>
          : <Link className="profile-row profile-signin" href="/login"><span className="avatar"><Icon name="user" /></span><div><div className="profile-name">Sign in</div><div className="profile-role">to your workspace</div></div></Link>}
        {profile && <button type="button" className="nav-link" onClick={signOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button>}
      </div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div className="crumb"><span>Shotlin</span><span>/</span><strong>{section}</strong><span className="crumb-status"><span className="status-dot" style={{ background: apiOnline === false ? "#d46e5c" : undefined }} />{apiOnline === null ? "connecting" : apiOnline ? "stack online" : "API offline"}</span></div>
        {profile ? <span className="topbar-user">{profile.name}</span> : <Link className="button button-ghost button-small" href="/login">Sign in</Link>}
      </header>
      <motion.div
        key={pathname}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {profile && !profile.onboardedAt && pathname === "/" && (
          <OnboardingTour onFinished={() => setUser({ ...profile, onboardedAt: new Date().toISOString() })} />
        )}
        {children}
      </motion.div>
    </main>
    <nav className="bottom-nav" aria-label="Primary navigation">
      {mobileNav.map((item) => <Link className={`bottom-nav-link ${isActive(pathname, item.href) ? "active" : ""}`} href={item.href} key={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined}><Icon name={item.icon} /><span>{item.label}</span></Link>)}
    </nav>
  </div>;
}
