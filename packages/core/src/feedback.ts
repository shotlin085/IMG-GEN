/**
 * Structured result feedback (Phase 14). Seven options, each naming something
 * the pipeline can actually act on, so admin analytics point at a stage rather
 * than at "bad image".
 */

export interface FeedbackReason {
  id: string;
  label: string;
  /** Which stage owns this class of problem — used by the admin analytics view. */
  owner: "vision" | "prompt" | "generation" | "review" | "identity" | "scene";
}

export const FEEDBACK_REASONS: readonly FeedbackReason[] = [
  { id: "colour_off", label: "The colour is not right", owner: "vision" },
  { id: "detail_lost", label: "A border, embroidery or motif was lost or changed", owner: "prompt" },
  { id: "fabric_wrong", label: "The fabric does not look like the reference", owner: "vision" },
  { id: "drape_wrong", label: "The drape, fit or fall is wrong", owner: "prompt" },
  { id: "identity_changed", label: "The model's face or body changed", owner: "identity" },
  { id: "pose_framing", label: "The pose or crop is not what I wanted", owner: "generation" },
  { id: "background_lighting", label: "The background or lighting does not work", owner: "scene" },
] as const;

export const FEEDBACK_REASON_VALUES: readonly string[] = FEEDBACK_REASONS.map((reason) => reason.id);

export function feedbackReasonOwner(reasonId: string): FeedbackReason["owner"] | null {
  return FEEDBACK_REASONS.find((reason) => reason.id === reasonId)?.owner ?? null;
}

/** Groups submitted reasons by the stage that owns them. */
export function summarizeFeedbackReasons(counts: Record<string, number>): Record<string, number> {
  const byOwner: Record<string, number> = {};
  for (const [reasonId, count] of Object.entries(counts)) {
    const owner = feedbackReasonOwner(reasonId) ?? "unattributed";
    byOwner[owner] = (byOwner[owner] ?? 0) + count;
  }
  return byOwner;
}
