"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./icon";

type Props = {
  onCapture: (file: File) => void;
  onClose: () => void;
};

export function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"starting" | "live" | "denied">("starting");
  const [shot, setShot] = useState<{ dataUrl: string; blob: Blob } | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("denied");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("live");
      } catch {
        if (!cancelled) setStatus("denied");
      }
    }
    void start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [stopStream]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) setShot({ dataUrl: canvas.toDataURL("image/jpeg", 0.92), blob });
    }, "image/jpeg", 0.92);
  }

  function retake() {
    setShot(null);
  }

  function accept() {
    if (!shot) return;
    stopStream();
    onCapture(new File([shot.blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
  }

  function fallbackFile(file?: File | null) {
    if (!file) return;
    stopStream();
    onCapture(file);
  }

  return <div className="camera-overlay" role="dialog" aria-modal="true" aria-label="Capture garment reference">
    <div className="camera-stage">
      {shot
        ? <img className="camera-video" src={shot.dataUrl} alt="Captured reference preview" />
        : <video ref={videoRef} className="camera-video" autoPlay playsInline muted />}
      {!shot && status === "live" && <div className="camera-frame" aria-hidden="true"><i /><i /><i /><i /><span>Fit the full garment inside the frame</span></div>}
      {status === "starting" && <p className="camera-note">Starting camera…</p>}
      {status === "denied" && <div className="camera-note"><strong>Camera unavailable.</strong><span>Grant camera permission in the browser, or upload a photo you already have — the pipeline accepts gallery photos.</span><label className="button button-ghost button-small">Choose a photo<input type="file" hidden accept="image/png,image/jpeg,image/webp" capture="environment" onChange={(event) => fallbackFile(event.target.files?.[0])} /></label></div>}
    </div>
    <div className="camera-actions">
      <button type="button" className="button button-ghost" onClick={onClose}>Cancel</button>
      {shot ? <>
        <button type="button" className="button button-ghost" onClick={retake}><Icon name="swap" /> Retake</button>
        <button type="button" className="button button-coral" onClick={accept}>Use this photo</button>
      </> : <button type="button" className="capture-button" onClick={capture} disabled={status !== "live"} aria-label="Capture photo"><span /></button>}
    </div>
  </div>;
}
