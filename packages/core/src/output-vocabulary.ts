/**
 * Output vocabulary for the studio (Phase 13): frames, aspect ratios and
 * camera framings. Centralised because the API validates against it, the
 * provider translates it into a real generation parameter, and the web studio
 * renders it — three places that must not drift apart.
 */

export interface AspectRatioOption {
  id: string;
  /** The ratio actually sent to the image model. */
  ratio: string;
  label: string;
  hint: string;
}

/**
 * Legacy ids (`portrait`/`square`/`landscape`) stay valid so historical jobs
 * re-run identically; they resolve to the same ratios they always did.
 */
export const ASPECT_RATIOS: readonly AspectRatioOption[] = [
  { id: "portrait", ratio: "3:4", label: "Portrait 3:4", hint: "Classic catalogue crop" },
  { id: "portrait-23", ratio: "2:3", label: "Tall portrait 2:3", hint: "Editorial, full length" },
  { id: "square", ratio: "1:1", label: "Square 1:1", hint: "Marketplace grids" },
  { id: "portrait-916", ratio: "9:16", label: "Story 9:16", hint: "Reels and shorts" },
  { id: "landscape", ratio: "4:3", label: "Landscape 4:3", hint: "Lookbook spread" },
  { id: "landscape-169", ratio: "16:9", label: "Wide 16:9", hint: "Campaign banner" },
] as const;

export const ASPECT_RATIO_VALUES: readonly string[] = ASPECT_RATIOS.map((option) => option.id);

/** Ratio actually sent to the provider for a stored job value. */
export function aspectRatioParam(value: string | null | undefined): string {
  const match = ASPECT_RATIOS.find((option) => option.id === value);
  return match ? match.ratio : "3:4";
}

export interface PoseOption {
  id: string;
  label: string;
  /** Plain-language description shown on the card — no AI jargon. */
  note: string;
  /** Prompt fragment the compiled brief uses. */
  fragment: string;
  /** Blocked for an under-18 appearance (Phase 10 keeps the veto). */
  adultOnly?: boolean;
}

export const POSES: readonly PoseOption[] = [
  { id: "auto", label: "Let Shotlin decide", note: "Chooses per angle", fragment: "" },
  { id: "standing", label: "Standing, relaxed", note: "Weight even, arms loose", fragment: "relaxed standing pose, weight even, arms resting naturally at the sides" },
  { id: "walking", label: "Walking", note: "Mid-stride movement", fragment: "mid-stride walking pose, natural forward movement, hem catching the motion" },
  { id: "turn", label: "Slow turn", note: "Body rotating, fabric in motion", fragment: "body caught mid-turn, the garment swinging outward to show its fall" },
  { id: "hip-pop", label: "Hip pop", note: "One hip weighted, editorial", fragment: "editorial stance with one hip weighted and shoulders counter-rotated", adultOnly: true },
  { id: "hand-on-hip", label: "Hand on hip", note: "Confident, structured", fragment: "one hand resting on the hip, elbow out, composed posture" },
  { id: "seated", label: "Seated", note: "On a chair or step", fragment: "seated pose on a simple chair, knees together, garment arranged across the lap" },
  { id: "lean", label: "Leaning", note: "Against a wall or rail", fragment: "casual leaning stance against a plain wall, one knee relaxed" },
  { id: "adjusting", label: "Adjusting the garment", note: "Hands at cuff or collar", fragment: "hands adjusting a cuff, collar or pleat, caught in a natural gesture" },
  { id: "pallu-hold", label: "Holding the pallu", note: "Lifted to show the border", fragment: "one hand lifting the pallu or dupatta to display its border and weave" },
  { id: "over-shoulder", label: "Looking back", note: "Face over the shoulder", fragment: "head turned to look over the shoulder, body angled away from the camera", adultOnly: true },
  { id: "arms-crossed", label: "Arms crossed", note: "Strong and closed", fragment: "arms crossed lightly at the chest, shoulders squared" },
  { id: "closeup", label: "Detail focus", note: "Fabric and workmanship", fragment: "tight framing on the garment's construction, hands out of frame" },
] as const;

export const POSE_VALUES: readonly string[] = POSES.map((pose) => pose.id);

export interface FramingOption {
  id: string;
  label: string;
  note: string;
  fragment: string;
}

export const FRAMINGS: readonly FramingOption[] = [
  { id: "auto", label: "Match the angle", note: "Default", fragment: "" },
  { id: "full", label: "Full body", note: "Head to hem", fragment: "full-body framing with the whole silhouette and a little floor around the hem" },
  { id: "three-quarter", label: "Three-quarter", note: "Knees up", fragment: "three-quarter framing cropped at the knees" },
  { id: "knee", label: "Knee line", note: "Hem emphasis", fragment: "framing that ends just past the knee to emphasise the hem line" },
  { id: "waist", label: "Waist up", note: "Bodice and neckline", fragment: "waist-up framing focused on the bodice, neckline and sleeves" },
  { id: "bust", label: "Bust and face", note: "Portrait crop", fragment: "bust-length portrait framing with the face as the anchor" },
  { id: "detail", label: "Macro detail", note: "Weave and work", fragment: "close macro framing of the weave, embroidery and finish" },
] as const;

export const FRAMING_VALUES: readonly string[] = FRAMINGS.map((framing) => framing.id);

export function poseById(value: string | null | undefined): PoseOption | undefined {
  return POSES.find((pose) => pose.id === value);
}

export function framingById(value: string | null | undefined): FramingOption | undefined {
  return FRAMINGS.find((framing) => framing.id === value);
}
