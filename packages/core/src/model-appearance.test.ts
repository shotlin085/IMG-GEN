import { describe, expect, it } from "vitest";
import {
  AGE_APPEARANCE_VALUES,
  AGE_GROUPS,
  ageGroupFor,
  evaluateChildSafety,
  isMinorAppearance,
} from "./model-appearance";

describe("age groups", () => {
  it("exposes nine groups from toddler to elder", () => {
    expect(AGE_GROUPS).toHaveLength(9);
    expect(AGE_GROUPS[0].id).toBe("toddler");
    expect(AGE_GROUPS[AGE_GROUPS.length - 1].id).toBe("elder");
  });

  it("marks exactly the four youngest groups as minors", () => {
    expect(AGE_GROUPS.filter((group) => group.isMinor).map((group) => group.id))
      .toEqual(["toddler", "child", "preteen", "teen"]);
  });

  it("still resolves legacy appearance strings so historical jobs stay readable", () => {
    expect(ageGroupFor("late-teens")?.id).toBe("teen");
    expect(ageGroupFor("mid-20s")?.id).toBe("young-adult");
    expect(ageGroupFor("mid-40s")?.id).toBe("middle-aged");
    expect(isMinorAppearance("late-teens")).toBe(true);
    expect(isMinorAppearance("mid-20s")).toBe(false);
    expect(isMinorAppearance(undefined)).toBe(false);
    expect(isMinorAppearance("something-unknown")).toBe(false);
  });

  it("accepts every canonical group in the API vocabulary", () => {
    for (const group of AGE_GROUPS) expect(AGE_APPEARANCE_VALUES).toContain(group.id);
  });
});

describe("under-18 policy", () => {
  it("does not apply to adult appearances", () => {
    const decision = evaluateChildSafety({ ageAppearance: "mid-20s", pose: "glamour", sceneKey: "nightclub" });
    expect(decision.applies).toBe(false);
    expect(decision.violations).toEqual([]);
  });

  it("blocks sensual poses, adult scenes and sexualised styling for a teen", () => {
    const decision = evaluateChildSafety({
      ageAppearance: "teen",
      pose: "reclining sensual",
      sceneKey: "hotel room",
      styling: ["plunging neckline", "plain cotton"],
    });
    expect(decision.applies).toBe(true);
    expect(decision.violations).toContain("pose:reclining-sensual");
    expect(decision.violations).toContain("scene:hotel-room");
    expect(decision.violations).toContain("styling:plunging-neckline");
    expect(decision.substitutions).toContain("pose → standing");
  });

  it("leaves age-appropriate choices untouched", () => {
    const decision = evaluateChildSafety({ ageAppearance: "child", pose: "walking", sceneKey: "park", styling: ["school uniform"] });
    expect(decision.applies).toBe(true);
    expect(decision.violations).toEqual([]);
    expect(decision.substitutions).toEqual([]);
  });

  it("is case and separator insensitive", () => {
    const decision = evaluateChildSafety({ ageAppearance: "preteen", pose: "  BOUDOIR_SIT  " });
    expect(decision.violations).toContain("pose:boudoir");
  });

  it("requires a guardian confirmation only when the caller says none exists", () => {
    expect(evaluateChildSafety({ ageAppearance: "child", guardianConfirmed: false }).requiresGuardianConfirmation).toBe(true);
    expect(evaluateChildSafety({ ageAppearance: "child", guardianConfirmed: true }).requiresGuardianConfirmation).toBe(false);
    expect(evaluateChildSafety({ ageAppearance: "adult", guardianConfirmed: false }).requiresGuardianConfirmation).toBe(false);
  });
});
