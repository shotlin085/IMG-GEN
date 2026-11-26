import { describe, expect, it } from "vitest";
import {
  ASPECT_RATIOS,
  aspectRatioParam,
  FRAMINGS,
  POSES,
  poseById,
} from "./output-vocabulary";
import { evaluateChildSafety } from "./model-appearance";

describe("output vocabulary", () => {
  it("offers six aspect ratios with real provider ratios", () => {
    expect(ASPECT_RATIOS).toHaveLength(6);
    expect(ASPECT_RATIOS.map((option) => option.ratio)).toEqual([
      "3:4", "2:3", "1:1", "9:16", "4:3", "16:9",
    ]);
  });

  it("keeps the legacy ids resolving to what they always meant", () => {
    expect(aspectRatioParam("portrait")).toBe("3:4");
    expect(aspectRatioParam("square")).toBe("1:1");
    expect(aspectRatioParam("landscape")).toBe("4:3");
    expect(aspectRatioParam("portrait-916")).toBe("9:16");
    expect(aspectRatioParam("something-else")).toBe("3:4");
  });

  it("ships thirteen poses and seven framings", () => {
    expect(POSES).toHaveLength(13);
    expect(FRAMINGS).toHaveLength(7);
    expect(poseById("pallu-hold")?.label).toBe("Holding the pallu");
  });

  it("blocks exactly the adult-only poses for an under-18 appearance", () => {
    const adultOnly = POSES.filter((pose) => pose.adultOnly).map((pose) => pose.id);
    expect(adultOnly.length).toBeGreaterThan(0);
    for (const pose of adultOnly) {
      expect(evaluateChildSafety({ ageAppearance: "teen", pose }).violations).toContain(`pose:${pose}`);
    }
    for (const pose of POSES.filter((option) => !option.adultOnly).map((option) => option.id)) {
      expect(evaluateChildSafety({ ageAppearance: "child", pose }).violations).toEqual([]);
    }
  });
});
