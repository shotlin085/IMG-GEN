/**
 * Model appearance domain rules (Phase 9) and the under-18 safety policy
 * (Phase 10). Shared by API validation, the worker and the web studio so a
 * age band can never mean something different in two places.
 */

export type AgeGroupId =
  | "toddler"
  | "child"
  | "preteen"
  | "teen"
  | "young-adult"
  | "adult"
  | "middle-aged"
  | "senior"
  | "elder";

export interface AgeGroup {
  id: AgeGroupId;
  /** Human label shown in the studio. */
  label: string;
  /** Approximate appearance range, stated so no one has to guess. */
  band: string;
  /** Drives the Phase 10 strict policy. */
  isMinor: boolean;
}

export const AGE_GROUPS: readonly AgeGroup[] = [
  { id: "toddler", label: "Toddler", band: "2–4 years", isMinor: true },
  { id: "child", label: "Child", band: "5–9 years", isMinor: true },
  { id: "preteen", label: "Preteen", band: "10–12 years", isMinor: true },
  { id: "teen", label: "Teen", band: "13–17 years", isMinor: true },
  { id: "young-adult", label: "Young adult", band: "18–25 years", isMinor: false },
  { id: "adult", label: "Adult", band: "26–39 years", isMinor: false },
  { id: "middle-aged", label: "Middle-aged", band: "40–59 years", isMinor: false },
  { id: "senior", label: "Senior", band: "60–74 years", isMinor: false },
  { id: "elder", label: "Elder", band: "75+ years", isMinor: false },
] as const;

/**
 * Appearance strings used by earlier jobs and the seeded catalogue. Kept
 * valid so historical jobs stay reproducible and old rows still render; the
 * studio only offers canonical groups for new selections.
 */
const LEGACY_APPEARANCE_TO_GROUP: Record<string, AgeGroupId> = {
  "late-teens": "teen",
  "early-20s": "young-adult",
  "mid-20s": "young-adult",
  "late-20s": "young-adult",
  "early-30s": "adult",
  "mid-30s": "adult",
  "late-30s": "adult",
  "mid-40s": "middle-aged",
  "late-40s": "middle-aged",
  "early-50s": "middle-aged",
  "mature": "middle-aged",
  "young-adult": "young-adult",
};

export const AGE_APPEARANCE_VALUES: readonly string[] = [
  ...AGE_GROUPS.map((group) => group.id),
  ...Object.keys(LEGACY_APPEARANCE_TO_GROUP),
] as const;

export function ageGroupFor(appearance: string | null | undefined): AgeGroup | undefined {
  if (!appearance) return undefined;
  const canonical = AGE_GROUPS.find((group) => group.id === appearance);
  if (canonical) return canonical;
  const legacyGroup = LEGACY_APPEARANCE_TO_GROUP[appearance];
  return legacyGroup ? AGE_GROUPS.find((group) => group.id === legacyGroup) : undefined;
}

/**
 * Unknown appearance strings resolve to `false` (not a minor) because the
 * API only accepts values from `AGE_APPEARANCE_VALUES`; anything else never
 * reaches this function.
 */
export function isMinorAppearance(appearance: string | null | undefined): boolean {
  return ageGroupFor(appearance)?.isMinor ?? false;
}

/* ------------------------------------------------------------------ */
/* Phase 10 — under-18 styling and pose policy                        */
/* ------------------------------------------------------------------ */

/** Styling attributes never applied to an under-18 appearance. */
export const MINOR_BLOCKED_STYLING = [
  "sheer",
  "see-through",
  "mesh-see-through",
  "sequin-bodychain",
  "deep-neckline",
  "plunging-neckline",
  "backless",
  "cut-out",
  "cutout",
  "thigh-slit",
  "high-slit",
  "lingerie",
  "bralette",
  "bodysuit-lounge",
  "swimwear-bikini",
  "bikini",
  "kimono-bathrobe",
  "bare-shoulder-glam",
  "glamour-shots",
  "boudoir",
  "adult-party",
  "nightwear-slip",
  "slip-dress",
  "wet-look",
] as const;

/** Poses never used for an under-18 appearance. */
export const MINOR_BLOCKED_POSES = [
  "glamour",
  "boudoir",
  "reclining-sensual",
  "arched-back",
  "hip-pop",
  "over-shoulder",
  "bed",
  "bathroom",
  "wet-look",
] as const;

/** Scenes an under-18 shoot is not placed in. */
export const MINOR_BLOCKED_SCENES = [
  "nightclub",
  "bar",
  "boudoir",
  "beach-swim",
  "pool-party",
  "hotel-room",
] as const;

/** Age-appropriate defaults the compiler substitutes for blocked choices. */
export const MINOR_DEFAULT_POSE = "standing";
export const MINOR_DEFAULT_SCENE_CATEGORY = "everyday";

function normalize(token: string): string {
  return token.toLowerCase().replace(/[\s_]+/g, "-").trim();
}

function hits(value: string, blocked: readonly string[]): string | null {
  const normalized = normalize(value);
  return (
    blocked.find((token) => {
      const normalizedToken = normalize(token);
      return normalized.includes(normalizedToken) || normalizedToken.includes(normalized);
    }) ?? null
  );
}

export type ChildSafetyInput = {
  ageAppearance?: string | null;
  pose?: string | null;
  sceneKey?: string | null;
  styling?: string[] | null;
  /** Guardian/right-to-use confirmation captured for a custom under-18 model. */
  guardianConfirmed?: boolean | null;
};

export type ChildSafetyDecision = {
  applies: boolean;
  violations: string[];
  /** What the pipeline will actually do instead of the blocked request. */
  substitutions: string[];
  requiresGuardianConfirmation: boolean;
};

/**
 * Server-side policy for an under-18 appearance: reports what was blocked and
 * what the pipeline substitutes. This is deterministic and never depends on a
 * model's mood — the worker applies it before prompt compilation.
 */
export function evaluateChildSafety(input: ChildSafetyInput): ChildSafetyDecision {
  if (!isMinorAppearance(input.ageAppearance)) {
    return { applies: false, violations: [], substitutions: [], requiresGuardianConfirmation: false };
  }
  const violations: string[] = [];
  const substitutions: string[] = [];
  const group = ageGroupFor(input.ageAppearance);

  if (input.pose) {
    const blocked = hits(input.pose, MINOR_BLOCKED_POSES);
    if (blocked) {
      violations.push(`pose:${blocked}`);
      substitutions.push(`pose → ${MINOR_DEFAULT_POSE}`);
    }
  }
  if (input.sceneKey) {
    const blocked = hits(input.sceneKey, MINOR_BLOCKED_SCENES);
    if (blocked) {
      violations.push(`scene:${blocked}`);
      substitutions.push(`scene → ${MINOR_DEFAULT_SCENE_CATEGORY}`);
    }
  }
  for (const styling of input.styling ?? []) {
    const blocked = hits(styling, MINOR_BLOCKED_STYLING);
    if (blocked) {
      violations.push(`styling:${blocked}`);
      substitutions.push(`styling "${styling}" dropped`);
    }
  }

  return {
    applies: true,
    violations,
    substitutions,
    // A synthetic/stock under-18 model needs no guardian record; a custom
    // (real-person) model does, and the caller passes what it stored.
    requiresGuardianConfirmation: group?.isMinor === true && input.guardianConfirmed !== true,
  };
}
