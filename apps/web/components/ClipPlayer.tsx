"use client";
// REQ-ASM-014 (USER 2026-07-25): "how do I play the audio within one clip? … can't play the video
// with the audio (only the videos own audio track, not external music)".
//
// The clip plays with the project track underneath, seeked to THIS clip's position in the cut — so
// 0:18→0:23 auditions against the same bars the export will use. Mix follows the project's audio
// mode via previewMix (the exporter's rule), with a toggle to force the bed on for a listen.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { previewMix, type MixMode } from "@avd/asm/preview";

/** Resync when the bed drifts more than this from the clip's expected timecode. */
const DRIFT_TOLERANCE_S = 0.18;

export function ClipPlayer({
  videoAssetId, musicAssetId, startS, durationS, mixMode, label,
}: {
  videoAssetId: string;
  musicAssetId: string | null;
  /** Where this clip begins in the cut — the bed starts here, not at 0:00. */
  startS: number;
  durationS: number;
  mixMode: MixMode;
  label?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bedRef = useRef<HTMLAudioElement | null>(null);
  const [force, setForce] = useState(false);

  const mix = previewMix({ mixMode, hasTrack: Boolean(musicAssetId), force });

  // Gains are applied imperatively: <video muted> would also kill the user's unmute control.
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = mix.videoVolume;
    if (bedRef.current) bedRef.current.volume = mix.bedVolume;
  }, [mix.videoVolume, mix.bedVolume]);

  const bedSeek = useCallback(() => {
    const v = videoRef.current, a = bedRef.current;
    if (!v || !a) return;
    a.currentTime = startS + v.currentTime;
  }, [startS]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const a = () => bedRef.current;

    const onPlay = () => {
      if (!mix.bed) return;
      bedSeek();
      void a()?.play().catch(() => {}); // autoplay policy: the user already gestured on the video
    };
    const onPause = () => a()?.pause();
    const onSeeked = () => { if (mix.bed) bedSeek(); };
    const onTime = () => {
      const bed = a();
      if (!mix.bed || !bed || bed.paused) return;
      const expected = startS + v.currentTime;
      if (Math.abs(bed.currentTime - expected) > DRIFT_TOLERANCE_S) bed.currentTime = expected;
    };
    const onEnded = () => { const bed = a(); if (bed) { bed.pause(); bed.currentTime = startS; } };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("seeked", onSeeked);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("seeked", onSeeked);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
      a()?.pause();
    };
  }, [mix.bed, bedSeek, startS]);

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

  return (
    <div>
      <video
        ref={videoRef}
        key={videoAssetId}
        src={`/api/assets/${videoAssetId}`}
        controls
        playsInline
        preload="metadata"
        style={{ width: "100%", aspectRatio: "16/9", borderRadius: 10, border: "2px solid var(--accent)", background: "#000" }}
      />
      {musicAssetId && (
        // The bed itself is never shown — the video's controls drive both.
        <audio ref={bedRef} src={`/api/assets/${musicAssetId}`} preload="auto" style={{ display: "none" }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
        {label && <span className="mono muted" style={{ fontSize: 9.5 }}>{label}</span>}
        {musicAssetId ? (
          <>
            <span className="mono" style={{ fontSize: 9.5, color: mix.bed ? "var(--accent)" : "var(--ink-2)" }}
              title={mix.bed
                ? `The project track plays under this clip from ${mmss(startS)} — the same bars the export uses`
                : "Audio mode is native — only this take's own audio plays"}>
              {mix.bed
                ? `♫ music bed from ${mmss(startS)}${mix.videoVolume === 0 ? " (replaces take audio)" : " (take audio + ducked track)"}`
                : "♫ music bed off"}
            </span>
            {mixMode === "native" && (
              <button
                onClick={() => setForce((f) => !f)}
                className="mono"
                title="Audition this clip against the music without changing the project's audio mode"
                style={{ background: force ? "var(--accent)" : "var(--panel-2)", color: force ? "#12151b" : "var(--ink)", border: `1px solid ${force ? "var(--accent)" : "var(--line)"}`, borderRadius: 6, fontSize: 9.5, padding: "2px 7px", cursor: "pointer" }}
              >
                {force ? "♫ bed on" : "♫ hear with music"}
              </button>
            )}
          </>
        ) : (
          <span className="mono muted" style={{ fontSize: 9.5 }}>no track attached — open the Music panel</span>
        )}
      </div>
    </div>
  );
}
