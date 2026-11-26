"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Icon } from "./icon";
import { CameraCapture } from "./camera-capture";
import { GarmentIntel, type GarmentProfile } from "./garment-intel";
import { PresetBar, type PresetPayload } from "./preset-bar";
import { apiFetch, type CatalogCharacter, type CatalogEnvironment, type CatalogImageModel } from "./api";
import { CAMERA_ANGLES, resolveAngleSet, type CameraAngleKey } from "./camera-angles";

type Props = { onSubmit: (jobId: string) => void };
type RecentProject = { id: string; state: string; display: string; resolution: string; aspectRatio: string; createdAt: string; thumbnailUrl: string | null };
type StudioMode = "auto" | "pro";
type Draft = {
  mode: StudioMode;
  environment: number;
  resolution: string;
  aspect: string;
  count: string;
  age: string;
  height: string;
  pose: string;
  framing: string;
  selectedAngles: CameraAngleKey[];
  selectedCharacterId: string | null;
  selectedImageModelId: string | null;
  wearStyleId: string | null;
};

type WearStyle = {
  id: string;
  kind: string;
  slug: string;
  name: string;
  description: string | null;
  region: string | null;
  promptFragment: string;
  drapeSteps: string[];
};

const environments = [["Outdoor / natural", "Open shade"], ["Studio commercial", "Clean sweep"], ["Festive", "Warm ceremony"], ["Cinematic fashion", "Low-key light"]];
// Mirrors the detail_kind enum in packages/database/src/schema.ts.
const DETAIL_KIND_OPTIONS = [
  { key: "border", label: "Border" },
  { key: "embroidery", label: "Embroidery" },
  { key: "pattern", label: "Pattern" },
  { key: "neckline", label: "Neckline" },
  { key: "sleeve", label: "Sleeve" },
  { key: "pallu", label: "Pallu" },
  { key: "other", label: "Other detail" },
];
const DRAFT_KEY = "shotlin:studio-draft:v1";
const STEP_IDS = ["studio-garment", "studio-character", "studio-scene", "studio-output", "studio-review"] as const;
const STEP_LABELS = ["Garment", "Character", "Scene", "Output", "Review"] as const;

const sectionList: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const sectionItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
};

const ASPECT_LEGACY: Record<string, string> = { Portrait: "portrait", Square: "square", Landscape: "landscape" };
function normalizeAspect(value: string): string {
  return ASPECT_LEGACY[value] ?? value.toLowerCase();
}

type AspectOption = { id: string; ratio: string; label: string; hint: string };
type PoseOption = { id: string; label: string; note: string; adultOnly?: boolean };
type FramingOption = { id: string; label: string; note: string };

function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return {
      mode: parsed.mode === "pro" ? "pro" : "auto",
      environment: typeof parsed.environment === "number" && Number.isFinite(parsed.environment) ? parsed.environment : 0,
      resolution: typeof parsed.resolution === "string" ? parsed.resolution : "2K",
      // Drafts written before Phase 13 stored display labels, not option ids.
      aspect: typeof parsed.aspect === "string" ? normalizeAspect(parsed.aspect) : "portrait",
      count: typeof parsed.count === "string" ? parsed.count : "1 image",
      age: typeof parsed.age === "string" ? parsed.age : "mid-20s",
      height: typeof parsed.height === "string" ? parsed.height : "average",
      pose: typeof parsed.pose === "string" ? parsed.pose : "auto",
      framing: typeof parsed.framing === "string" ? parsed.framing : "auto",
      selectedAngles: Array.isArray(parsed.selectedAngles) ? parsed.selectedAngles.filter((key): key is CameraAngleKey => key in CAMERA_ANGLES) : [],
      selectedCharacterId: typeof parsed.selectedCharacterId === "string" ? parsed.selectedCharacterId : null,
      selectedImageModelId: typeof parsed.selectedImageModelId === "string" ? parsed.selectedImageModelId : null,
      wearStyleId: typeof parsed.wearStyleId === "string" ? parsed.wearStyleId : null,
    };
  } catch {
    return null;
  }
}

export function Generator({ onSubmit }: Props) {
  const [initialDraft] = useState(loadDraft);
  const reduceMotion = useReducedMotion();
  const [image, setImage] = useState<string | null>(null);
  const [mode, setMode] = useState<StudioMode>(initialDraft?.mode ?? "auto");
  const [environment, setEnvironment] = useState(initialDraft?.environment ?? 0);
  const [resolution, setResolution] = useState(initialDraft?.resolution ?? "2K");
  const [aspect, setAspect] = useState(initialDraft?.aspect ?? "portrait");
  // Cost-safe default: one provider image request producing one output.
  const [count, setCount] = useState(initialDraft?.count ?? "1 image");
  const [age, setAge] = useState(initialDraft?.age ?? "mid-20s");
  const [height, setHeight] = useState(initialDraft?.height ?? "average");
  const [pose, setPose] = useState(initialDraft?.pose ?? "auto");
  const [framing, setFraming] = useState(initialDraft?.framing ?? "auto");
  const [outputOptions, setOutputOptions] = useState<{ aspectRatios: AspectOption[]; poses: PoseOption[]; framings: FramingOption[] } | null>(null);
  // Empty selection means "use the server's default set for this count" —
  // picking specific angles is opt-in, not required. Whatever the customer
  // has picked (or not) is resolved through the exact same `resolveAngleSet`
  // the worker uses, so the preview here can never drift from what the
  // server actually generates — including its top-up behavior when fewer
  // angles are picked than the requested count.
  const [selectedAngles, setSelectedAngles] = useState<CameraAngleKey[]>(initialDraft?.selectedAngles ?? []);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(initialDraft?.selectedCharacterId ?? null);
  const [selectedImageModelId, setSelectedImageModelId] = useState<string | null>(initialDraft?.selectedImageModelId ?? null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [garmentProfile, setGarmentProfile] = useState<GarmentProfile | null>(null);
  const [analyzingGarment, setAnalyzingGarment] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [ageGroups, setAgeGroups] = useState<Array<{ id: string; label: string; band: string; isMinor: boolean }>>([]);
  const [wearOptions, setWearOptions] = useState<WearStyle[]>([]);
  const [wearStyleId, setWearStyleId] = useState<string | null>(initialDraft?.wearStyleId ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CatalogCharacter[]>([]);
  const [catalogEnvironments, setCatalogEnvironments] = useState<CatalogEnvironment[]>([]);
  const [imageModels, setImageModels] = useState<CatalogImageModel[]>([]);
  const [customCharacterAssetId, setCustomCharacterAssetId] = useState<string | null>(null);
  const [customCharacterName, setCustomCharacterName] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [detailReferences, setDetailReferences] = useState<Array<{ assetId: string; kind: string; previewUrl: string; filename: string }>>([]);
  const generationRequestRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const characterFileInputRef = useRef<HTMLInputElement>(null);
  const detailFileInputRef = useRef<HTMLInputElement>(null);
  const cameraSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const sceneOptions = catalogEnvironments.length
    ? catalogEnvironments.map((item) => [item.name, item.category, item.id] as const)
    : environments.map((item) => [item[0], item[1], ""] as const);

  const imageCount = Number.parseInt(count, 10) || 1;
  // Before the API responds the studio still needs a working age control.
  const AGE_FALLBACK = [{ id: "young-adult", label: "Young adult", band: "18–25 years", isMinor: false }, { id: "adult", label: "Adult", band: "26–39 years", isMinor: false }, { id: "middle-aged", label: "Middle-aged", band: "40–59 years", isMinor: false }];
  const ageChoices = (ageGroups.length ? ageGroups : AGE_FALLBACK).some((option) => option.id === age)
    ? (ageGroups.length ? ageGroups : AGE_FALLBACK)
    : [{ id: age, label: age, band: "", isMinor: false }, ...(ageGroups.length ? ageGroups : AGE_FALLBACK)];
  const ageIsMinor = ageChoices.find((option) => option.id === age)?.isMinor ?? false;
  const selectedWear = wearOptions.find((option) => option.id === wearStyleId) ?? null;
  const aspectOptions = outputOptions?.aspectRatios ?? [{ id: "portrait", ratio: "3:4", label: "Portrait", hint: "" }, { id: "square", ratio: "1:1", label: "Square", hint: "" }, { id: "landscape", ratio: "4:3", label: "Landscape", hint: "" }];
  const selectedAspect = aspectOptions.find((option) => option.id === aspect) ?? { label: aspect, ratio: "", hint: "" };
  const poseOptions = outputOptions?.poses ?? [{ id: "auto", label: "Auto", note: "Let Shotlin decide" }];
  const framingOptions = outputOptions?.framings ?? [];
  // The server marks which pose cards are adults-only; the studio warns before
  // submitting rather than letting the request come back rejected.
  const poseBlockedForMinor = ageIsMinor && poseOptions.find((option) => option.id === pose)?.adultOnly === true;
  const presetPayload: PresetPayload = {
    environmentPresetId: sceneOptions[environment]?.[2] || null,
    characterId: customCharacterAssetId ? null : selectedCharacterId,
    wearStyleId,
    pose,
    framing,
    aspectRatio: aspect,
    resolution: resolution.toLowerCase() as "1k" | "2k" | "4k",
    outputCount: imageCount,
    ageAppearance: age,
    heightAppearance: height,
  };

  function applyPreset(payload: PresetPayload) {
    if (payload.environmentPresetId) {
      const index = sceneOptions.findIndex(([, , id]) => id === payload.environmentPresetId);
      if (index >= 0) setEnvironment(index);
    }
    if (payload.characterId) { setCustomCharacterAssetId(null); setSelectedCharacterId(payload.characterId); }
    if (payload.resolution) setResolution(payload.resolution.toUpperCase());
    if (payload.aspectRatio) setAspect(payload.aspectRatio);
    if (payload.outputCount) setCount(`${payload.outputCount} ${payload.outputCount === 1 ? "image" : "images"}`);
    if (payload.pose) setPose(payload.pose);
    if (payload.framing) setFraming(payload.framing);
    if (payload.ageAppearance) setAge(payload.ageAppearance);
    if (payload.heightAppearance) setHeight(payload.heightAppearance);
    setWearStyleId(payload.wearStyleId ?? null);
  }
  const ANGLE_OPTIONS = Object.values(CAMERA_ANGLES);
  const effectiveAngles = resolveAngleSet(imageCount, selectedAngles);
  const angleLabels = effectiveAngles.map((key) => CAMERA_ANGLES[key].label);

  useEffect(() => {
    const draft: Draft = { mode, environment, resolution, aspect, count, age, height, pose, framing, selectedAngles, selectedCharacterId, selectedImageModelId, wearStyleId };
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setSavedAt(new Date());
    } catch {
      // Storage unavailable or full — the draft just won't persist; the studio still works.
    }
  }, [mode, environment, resolution, aspect, count, age, height, pose, framing, selectedAngles, selectedCharacterId, selectedImageModelId, wearStyleId]);

  // Wear options follow the recognised garment: a saree offers drapes, a
  // lehenga offers dupatta placements, and a stale pick is dropped when the
  // garment changes so the brief can never describe two different outfits.
  useEffect(() => {
    const node = garmentProfile?.taxonomyNodeId;
    apiFetch<WearStyle[]>(`/api/garments/wear-styles${node ? `?for=${encodeURIComponent(node)}` : ""}`)
      .then((rows) => {
        setWearOptions(rows);
        setWearStyleId((current) => (current && !rows.some((row) => row.id === current) ? null : current));
      })
      .catch(() => setWearOptions([]));
  }, [garmentProfile?.taxonomyNodeId]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = (STEP_IDS as readonly string[]).indexOf(entry.target.id);
        if (index >= 0) setActiveStep(index);
      }
    }, { rootMargin: "-30% 0px -55% 0px" });
    STEP_IDS.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSelectedAngles((current) => (current.length > imageCount ? current.slice(0, imageCount) : current));
  }, [imageCount]);

  function goToStep(index: number) {
    document.getElementById(STEP_IDS[index])?.scrollIntoView({ block: "start" });
    setActiveStep(index);
  }

  function setStudioMode(next: StudioMode) {
    if (next === mode) return;
    // AUTO is an explicit "decide everything for me" — clearing the picks keeps that honest.
    if (next === "auto") {
      setSelectedAngles([]);
      setSelectedImageModelId(null);
      setPose("auto");
      setFraming("auto");
    }
    setMode(next);
  }

  function toggleAngle(key: CameraAngleKey) {
    setSelectedAngles((current) => {
      if (current.includes(key)) return current.filter((candidate) => candidate !== key);
      if (current.length >= imageCount) return current;
      return [...current, key];
    });
  }

  async function uploadFile(file: File, kind: "garment_reference" | "character_reference" | "detail_reference") {
    const presign = await apiFetch<{ assetId: string; uploadUrl: string; headers: Record<string, string> }>("/api/uploads", {
      method: "POST",
      body: JSON.stringify({ filename: file.name, contentType: file.type, kind }),
    });
    const upload = await fetch(presign.uploadUrl, { method: "PUT", headers: presign.headers, body: file });
    if (!upload.ok) throw new Error(kind === "garment_reference" ? "Reference upload failed" : kind === "character_reference" ? "Character upload failed" : "Detail reference upload failed");
    await apiFetch(`/api/uploads/${presign.assetId}/complete`, { method: "POST", body: JSON.stringify({ filename: file.name }) });
    return presign.assetId;
  }

  function authMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message.includes("Not signed in") ? "Preview ready — sign in to connect this upload" : error instanceof Error ? error.message : fallback;
  }

  async function analyzeGarment(uploadedAssetId: string) {
    setAnalyzingGarment(true);
    setAnalyzeError(null);
    try {
      const result = await apiFetch<{ profile: GarmentProfile }>("/api/garments/analyze", {
        method: "POST",
        body: JSON.stringify({ assetId: uploadedAssetId }),
      });
      setGarmentProfile(result.profile);
    } catch (error) {
      setGarmentProfile(null);
      setAnalyzeError(error instanceof Error && error.message.includes("Not signed in")
        ? null
        : error instanceof Error ? error.message : "Garment recognition unavailable");
    } finally {
      setAnalyzingGarment(false);
    }
  }

  async function handleFile(file?: File) {
    if (!file) return;
    setImage(URL.createObjectURL(file));
    setMessage(null);
    setGarmentProfile(null);
    setAnalyzeError(null);
    try {
      const uploadedAssetId = await uploadFile(file, "garment_reference");
      setAssetId(uploadedAssetId);
      setMessage("Reference uploaded and checked");
      void analyzeGarment(uploadedAssetId);
    } catch (error) {
      setMessage(authMessage(error, "Reference preview ready"));
    }
  }

  async function handleCharacterFile(file?: File) {
    if (!file) return;
    setMessage(null);
    try {
      const uploadedAssetId = await uploadFile(file, "character_reference");
      setCustomCharacterAssetId(uploadedAssetId);
      setCustomCharacterName(file.name);
      setSelectedCharacterId(null);
      setMessage("Character reference uploaded and checked");
    } catch (error) {
      setMessage(authMessage(error, "Character upload failed"));
    }
  }

  async function handleDetailFile(file?: File) {
    if (!file || detailReferences.length >= 5) return;
    setMessage(null);
    try {
      const uploadedAssetId = await uploadFile(file, "detail_reference");
      setDetailReferences((current) => [...current, { assetId: uploadedAssetId, kind: "other", previewUrl: URL.createObjectURL(file), filename: file.name }]);
      setMessage("Detail reference uploaded and checked");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Detail reference upload failed");
    }
  }

  function setDetailKind(assetId: string, kind: string) {
    setDetailReferences((current) => current.map((d) => (d.assetId === assetId ? { ...d, kind } : d)));
  }

  function removeDetailReference(assetId: string) {
    setDetailReferences((current) => current.filter((d) => d.assetId !== assetId));
  }

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      if (!assetId) throw new Error("Upload a reference and sign in before generating");
      const environmentId = sceneOptions[environment]?.[2] || null;
      const requestBody = { mainGarmentAssetId: assetId, detailReferences: detailReferences.map((d) => ({ assetId: d.assetId, kind: d.kind })), characterId: customCharacterAssetId ? null : selectedCharacterId, characterAssetId: customCharacterAssetId, environmentPresetId: environmentId, imageModelId: selectedImageModelId, resolution: resolution.toLowerCase(), aspectRatio: aspect, framing, outputCount: Number.parseInt(count, 10), cameraAngles: effectiveAngles, inputType: "photo", ageAppearance: age, heightAppearance: height, pose, wearStyleId };
      const fingerprint = JSON.stringify(requestBody);
      if (!generationRequestRef.current || generationRequestRef.current.fingerprint !== fingerprint) {
        generationRequestRef.current = { fingerprint, key: crypto.randomUUID() };
      }
      const result = await apiFetch<{ job: { id: string } }>("/api/jobs", {
        method: "POST",
        headers: { "Idempotency-Key": generationRequestRef.current.key },
        body: JSON.stringify(requestBody),
      });
      onSubmit(result.job.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start generation");
      setBusy(false);
    }
  }

  // A garment chosen in the library arrives through this hand-off; the asset is
  // already uploaded and validated, so the studio only needs to adopt it.
  useEffect(() => {
    let handed: string | null = null;
    try {
      handed = window.localStorage.getItem("shotlin:studio-use-garment");
      if (handed) window.localStorage.removeItem("shotlin:studio-use-garment");
    } catch {
      return;
    }
    if (!handed) return;
    try {
      const parsed = JSON.parse(handed) as { assetId?: string; previewUrl?: string | null; title?: string };
      if (typeof parsed.assetId === "string") {
        setAssetId(parsed.assetId);
        if (parsed.previewUrl) setImage(parsed.previewUrl);
        setMessage(parsed.title ? `Using ${parsed.title} from your garment library` : "Using a saved garment");
      }
    } catch {
      // A malformed hand-off is simply ignored.
    }
  }, []);

  useEffect(() => {
    apiFetch<CatalogCharacter[]>("/api/customer/characters").then((data) => { setCharacters(data); setSelectedCharacterId((current) => current ?? data[0]?.id ?? null); }).catch(() => undefined);
    apiFetch<CatalogEnvironment[]>("/api/customer/environments").then(setCatalogEnvironments).catch(() => undefined);
    apiFetch<CatalogImageModel[]>("/api/customer/models").then((data) => { setImageModels(data); setSelectedImageModelId((current) => current ?? data[0]?.id ?? null); }).catch(() => undefined);
    apiFetch<{ aspectRatios: AspectOption[]; poses: PoseOption[]; framings: FramingOption[]; ageGroups: Array<{ id: string; label: string; band: string; isMinor: boolean }> }>("/api/customer/options")
      .then((data) => {
        setOutputOptions({ aspectRatios: data.aspectRatios, poses: data.poses, framings: data.framings });
        setAgeGroups(data.ageGroups ?? []);
      })
      .catch(() => undefined);
    apiFetch<{ projects: RecentProject[] }>("/api/projects").then((payload) => setRecentProjects(payload.projects.slice(0, 3))).catch(() => undefined);
    // Server-side studio defaults — only for a fresh visitor; an existing local
    // draft encodes more specific intent than the account preference does.
    apiFetch<{ preferences: { defaultResolution?: string; defaultAspectRatio?: string; defaultOutputCount?: number } }>("/api/account")
      .then(({ preferences }) => {
        if (initialDraft) return;
        const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
        if (preferences?.defaultResolution) setResolution(preferences.defaultResolution.toUpperCase());
        if (preferences?.defaultAspectRatio) setAspect(label(preferences.defaultAspectRatio));
        if (preferences?.defaultOutputCount) setCount(`${preferences.defaultOutputCount} ${preferences.defaultOutputCount === 1 ? "image" : "images"}`);
      })
      .catch(() => undefined);
  }, []);

  return <div className="page">
    <div className="page-head"><div><p className="eyebrow">Zero-prompt image studio</p><h1 className="display">Make the garment<br /><em>the main character.</em></h1><p className="lede">Bring a reference. Shotlin handles the visual language, fidelity checks, and repair loop for you.</p></div><div className="top-actions"><span className="help">{savedAt ? `Draft saved · ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Draft"}</span></div></div>
    <div className="dashboard-grid">
      <section className="panel generator">
        <div className="generator-head"><div><p className="panel-kicker">New generation</p><h2 className="panel-title">Build a look</h2></div><div className="mode-toggle" role="group" aria-label="Studio mode"><button type="button" className={mode === "auto" ? "active" : ""} onClick={() => setStudioMode("auto")} aria-pressed={mode === "auto"}>Auto</button><button type="button" className={mode === "pro" ? "active" : ""} onClick={() => setStudioMode("pro")} aria-pressed={mode === "pro"}>Pro</button></div></div>
        <PresetBar current={presetPayload} onApply={applyPreset} />
        <div className="steps" role="tablist" aria-label="Studio steps">{STEP_LABELS.map((label, index) => <button key={label} type="button" role="tab" aria-selected={activeStep === index} className={`step-tab ${activeStep === index ? "active" : ""}`} data-step={`0${index + 1}`} onClick={() => goToStep(index)}>{label}</button>)}</div>
        <motion.div className="form-body" initial={reduceMotion ? false : "hidden"} animate="visible" variants={sectionList}>
          <motion.div className="form-section" id="studio-garment" variants={sectionItem}><div className="section-head"><h3 className="section-heading">Start with a reference</h3><span className="section-caption">Required · 1 main image</span></div><label className="dropzone">{image ? <img className="upload-preview" src={image} alt="Uploaded garment reference" /> : <><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleFile(e.target.files?.[0])} /><div><span className="upload-symbol"><Icon name="plus" /></span><p className="drop-title">Drop your garment reference here</p><p className="drop-subtitle">JPG, PNG or WEBP · up to 25 MB</p></div></>}</label>{cameraSupported && <button type="button" className="camera-entry" onClick={() => setCameraOpen(true)}><Icon name="camera" /> Capture with camera</button>}
            <div className="detail-refs"><div className="detail-refs-head"><span>Detail references <span className="help">optional — close-ups of a border, embroidery, or anything easy to miss</span></span></div><div className="detail-refs-list">{detailReferences.map((d) => <div className="detail-ref-card" key={d.assetId}><img src={d.previewUrl} alt={d.filename} />{mode === "pro" && <select value={d.kind} onChange={(e) => setDetailKind(d.assetId, e.target.value)} aria-label={`Detail kind for ${d.filename}`}>{DETAIL_KIND_OPTIONS.map((option) => <option value={option.key} key={option.key}>{option.label}</option>)}</select>}<button type="button" className="detail-ref-remove" aria-label={`Remove ${d.filename}`} onClick={() => removeDetailReference(d.assetId)}>×</button></div>)}{detailReferences.length < 5 && <button type="button" className="detail-ref-add" onClick={() => detailFileInputRef.current?.click()}><Icon name="plus" /><span>Add</span></button>}<input ref={detailFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{display: "none"}} onChange={(e) => { handleDetailFile(e.target.files?.[0]); if (detailFileInputRef.current) detailFileInputRef.current.value = ""; }} /></div></div>
            <GarmentIntel profile={garmentProfile} analyzing={analyzingGarment} error={analyzeError} editable={mode === "pro"} onConfirmed={setGarmentProfile} />
          </motion.div>
          <motion.div className="form-section" id="studio-character" variants={sectionItem}><div className="section-head"><h3 className="section-heading">Choose a character</h3><span className="section-caption">Identity stays consistent</span></div><div className="choice-grid">{(characters.length ? characters.slice(0, 2).map((character) => [character.name, character.description ?? "Studio character", character.id]) : [["Mira", "Editorial · 5'7\"", ""], ["Anika", "Natural · 5'5\"", ""]]).map(([name, note, id], i) => <button className={`choice ${!customCharacterAssetId && (selectedCharacterId === id || (!selectedCharacterId && i === 0)) ? "selected" : ""}`} onClick={() => { setSelectedCharacterId(id || null); setCustomCharacterAssetId(null); setCustomCharacterName(null); }} key={name}><span className="choice-title">{name}</span><span className="choice-note">{note}</span>{!customCharacterAssetId && (selectedCharacterId === id || (!selectedCharacterId && i === 0)) && <span className="choice-mark"><Icon name="check" /></span>}</button>)}<input ref={characterFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{display: "none"}} onChange={(e) => handleCharacterFile(e.target.files?.[0])} /><button className={`choice ${customCharacterAssetId ? "selected" : ""}`} onClick={() => characterFileInputRef.current?.click()}><span className="choice-title">{customCharacterName ?? "Upload character"}</span><span className="choice-note">Use your own reference</span>{customCharacterAssetId && <span className="choice-mark"><Icon name="check" /></span>}</button></div><div className="select-row"><div className="select-field"><label>Age appearance</label><select value={age} onChange={(event) => setAge(event.target.value)}>{ageChoices.map((option) => <option value={option.id} key={option.id}>{option.label}{option.band ? ` · ${option.band}` : ""}</option>)}</select>{ageIsMinor && <span className="help">Under-18 appearances always follow the age-appropriate styling policy.</span>}</div><div className="select-field"><label>Height</label><select value={height} onChange={(event) => setHeight(event.target.value)}><option value="petite">Petite</option><option value="average">Average</option><option value="tall">Tall</option></select></div></div>{mode === "pro" && <div className="angle-picker"><label>Pose <span className="help">Pick one, or leave it to the pipeline</span></label><div className="angle-picker-chips">{poseOptions.map((option) => <button type="button" key={option.id} className={`angle-chip ${pose === option.id ? "selected" : ""}`} onClick={() => setPose(option.id)} aria-pressed={pose === option.id} title={option.note}>{option.label}</button>)}</div>{ageIsMinor && poseBlockedForMinor && <span className="help" role="alert">“{poseOptions.find((option) => option.id === pose)?.label}” is not used for an under-18 appearance — pick another pose.</span>}</div>}</motion.div>
          <motion.div className="form-section" id="studio-scene" variants={sectionItem}><div className="section-head"><h3 className="section-heading">Set the scene</h3><span className="section-caption">Indoor / outdoor is an actual environment preset</span></div><div className="choice-grid">{sceneOptions.map(([name, note], i) => <button className={`choice choice-card ${environment === i ? "selected" : ""}`} key={name} onClick={() => setEnvironment(i)}><span className="choice-title">{name}</span><span className="choice-note">{note}</span></button>)}</div>
            {wearOptions.length > 0 && <div className="wear-picker"><div className="detail-refs-head"><span>How it is worn <span className="help">{garmentProfile?.taxonomyNodeId ? "matched to the garment we recognised" : "general placements — recognise a garment to get regional drapes"}</span></span></div><div className="angle-picker-chips">{wearOptions.map((option) => <button type="button" key={option.id} className={`angle-chip ${wearStyleId === option.id ? "selected" : ""}`} onClick={() => setWearStyleId(wearStyleId === option.id ? null : option.id)} aria-pressed={wearStyleId === option.id}>{option.name}{option.region ? ` · ${option.region}` : ""}</button>)}</div>{selectedWear && <p className="help wear-note">{selectedWear.drapeSteps.length > 0 ? selectedWear.drapeSteps.join(" → ") : selectedWear.description ?? selectedWear.promptFragment}</p>}</div>}
          </motion.div>
          <motion.div className="form-section" id="studio-output" variants={sectionItem}><div className="section-head"><h3 className="section-heading">Output</h3><span className="section-caption">{mode === "auto" ? "Shotlin picks the model and camera angles for you" : imageModels.length > 1 ? "Choose your model, or let the pipeline pick" : "The pipeline will pick the right model"}</span></div><div className="select-row"><div className="select-field"><label>Resolution</label><select value={resolution} onChange={(e) => setResolution(e.target.value)}><option>1K</option><option>2K</option><option>4K</option></select></div><div className="select-field"><label>Frame</label><select value={aspect} onChange={(e) => setAspect(e.target.value)}>{aspectOptions.map((option) => <option value={option.id} key={option.id}>{option.label}{option.hint ? ` · ${option.hint}` : ""}</option>)}</select></div><div className="select-field"><label>Set size</label><select value={count} onChange={(e) => setCount(e.target.value)}><option>1 image</option><option>2 images</option><option>3 images</option><option>4 images</option><option>5 images</option></select></div>{mode === "pro" && imageModels.length > 0 && <div className="select-field"><label>Image model</label><select value={selectedImageModelId ?? ""} onChange={(e) => setSelectedImageModelId(e.target.value || null)}>{imageModels.map((model) => <option value={model.id} key={model.id}>{model.name}</option>)}</select></div>}</div>{mode === "pro" && framingOptions.length > 0 && <div className="angle-picker"><label>Crop <span className="help">How much of the look is in frame</span></label><div className="angle-picker-chips">{framingOptions.map((option) => <button type="button" key={option.id} className={`angle-chip ${framing === option.id ? "selected" : ""}`} onClick={() => setFraming(option.id)} aria-pressed={framing === option.id} title={option.note}>{option.label}</button>)}</div></div>}
            {mode === "pro" && imageCount > 1 && <div className="angle-picker"><label>Camera angles <span className="help">Pick up to {imageCount}, or leave blank for our default set</span></label><div className="angle-picker-chips">{ANGLE_OPTIONS.map((option) => { const picked = selectedAngles.includes(option.key); const atCap = !picked && selectedAngles.length >= imageCount && selectedAngles.length > 0; return <button type="button" key={option.key} className={`angle-chip ${picked ? "selected" : ""}`} disabled={atCap} onClick={() => toggleAngle(option.key)}>{option.label}</button>; })}{selectedAngles.length > 0 && <button type="button" className="angle-chip angle-chip-clear" onClick={() => setSelectedAngles([])}>Reset to default</button>}</div></div>}</motion.div>
          <div className="form-footer" id="studio-review"><div><p className="summary-line"><strong>{resolution} · {selectedAspect.label}{selectedAspect.ratio ? ` (${selectedAspect.ratio})` : ""}</strong> · {count} · {sceneOptions[environment]?.[0] ?? "Choose a scene"}{selectedWear ? ` · ${selectedWear.name}` : ""}{imageCount > 1 ? ` · ${imageCount} angles, same character` : ""}</p>{message && <p className="help" style={{marginTop: 7, color: message.includes("failed") || message.includes("sign in") ? "var(--coral)" : "#4f9875"}}>{message}</p>}</div><motion.button className="button button-coral" onClick={submit} disabled={busy} whileTap={reduceMotion ? undefined : { scale: 0.97 }}>{busy ? "Starting…" : "Generate look"}<span style={{marginLeft: 12}}><Icon name="arrow" /></span></motion.button></div>
        </motion.div>
      </section>
      <aside className="panel reference-rail"><div className="panel-head"><div><p className="panel-kicker">Reference rail</p><h2 className="panel-title">What Shotlin is holding</h2></div><span className="chip">protected</span></div><div className="reference-item"><span className="reference-number">01</span><div><div className="reference-name">Garment structure</div><div className="reference-status ready">{assetId ? "Uploaded · validation pending" : "Waiting for image"}</div></div></div><div className="reference-item"><span className="reference-number">02</span><div><div className="reference-name">Character identity</div><div className="reference-status ready">{customCharacterAssetId ? (customCharacterName ?? "Custom character") : (characters.find((c) => c.id === selectedCharacterId)?.name ?? characters[0]?.name ?? "Choose a character")} · locked</div></div></div><div className="reference-item"><span className="reference-number">03</span><div><div className="reference-name">Environment language</div><div className="reference-status">{sceneOptions[environment]?.[0] ?? "Choose a scene"}</div></div></div><div className="reference-item"><span className="reference-number">04</span><div><div className="reference-name">Quality bar</div><div className="reference-status">Fidelity-first review</div></div></div><div className="reference-item"><span className="reference-number">05</span><div><div className="reference-name">Camera angles</div><div className="reference-status ready">{imageCount === 1 ? "Single frame" : angleLabels.join(" · ")}</div></div></div><p className="help" style={{marginTop: 11}}>The prompt stays behind the scenes. Your choices are the brief.</p></aside>
    </div>
    <section className="panel panel-pad mini-projects"><div className="panel-head"><div><p className="panel-kicker">Your studio</p><h2 className="panel-title">Recent projects</h2></div><a className="help" href="/projects">View archive <Icon name="arrow" /></a></div>{recentProjects.length ? <div className="project-list">{recentProjects.map((project) => <a href={`/jobs/${project.id}`} className="project-row" key={project.id}><span className="project-thumb project-thumb-real">{project.thumbnailUrl && <img src={project.thumbnailUrl} alt="" />}</span><div><div className="project-name">{project.display}</div><div className="project-meta">{project.resolution.toUpperCase()} · {project.aspectRatio} · {new Date(project.createdAt).toLocaleDateString()}</div></div><span className="project-state" style={{color: project.state === "ready" ? "#4f9875" : "#c18442"}}>{project.state.replaceAll("_", " ")}</span></a>)}</div> : <div className="empty-state"><strong>No connected jobs yet</strong><span>Sign in and submit a generation to populate this archive.</span></div>}</section>
    {cameraOpen && <CameraCapture onCapture={(file) => { setCameraOpen(false); void handleFile(file); }} onClose={() => setCameraOpen(false)} />}
  </div>;
}
