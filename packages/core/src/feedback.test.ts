import { describe, expect, it } from "vitest";
import { FEEDBACK_REASONS, summarizeFeedbackReasons } from "./feedback";

describe("structured feedback", () => {
  it("offers exactly seven uniquely identified reasons", () => {
    expect(FEEDBACK_REASONS).toHaveLength(7);
    expect(new Set(FEEDBACK_REASONS.map((reason) => reason.id)).size).toBe(7);
  });

  it("every reason names the pipeline stage that owns it", () => {
    const owners = new Set(FEEDBACK_REASONS.map((reason) => reason.owner));
    for (const owner of owners) {
      expect(["vision", "prompt", "generation", "review", "identity", "scene"]).toContain(owner);
    }
    expect(FEEDBACK_REASONS.every((reason) => Boolean(reason.owner))).toBe(true);
  });

  it("rolls counts up to the owning stage for admin analytics", () => {
    expect(summarizeFeedbackReasons({ colour_off: 3, detail_lost: 2, mystery: 1 })).toEqual({
      vision: 3,
      prompt: 2,
      unattributed: 1,
    });
  });
});
