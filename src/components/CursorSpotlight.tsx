/**
 * CursorSpotlight — Video-aware spotlight overlay for screen-recording demos.
 *
 * Purpose: 任何章節用螢幕錄影 demo 時，加亮指點 UI 元素 / 滑鼠焦點，讓觀眾不會錯過重點。
 *
 * 關鍵：座標用「影片原生像素」(vx, vy)，元件自動依 objectFit:contain
 *       映射到 canvas pixels。換 video 解析度也不用重算座標。
 *
 * Usage:
 *   const VIDEO_FIT: VideoFit = {
 *     nativeW: 2940, nativeH: 1438,
 *     containerLeft: 0, containerTop: NAV_H,
 *     containerW: W, containerH: H - NAV_H - SUBTITLE_H,
 *     objectFit: "contain",
 *   };
 *   const CUES: SpotlightCue[] = [
 *     { from: 7500, to: 7600, vx: 1500, vy: 80, radius: 90, label: "點裝置下拉" },
 *   ];
 *   <CursorSpotlightLayer fit={VIDEO_FIT} cues={CUES} S={2} />
 *
 * Animation:
 *   - 環圈 draw-on 18f
 *   - 內圈呼吸脈動 (radius * 0.95 → 1.05)
 *   - 標籤 fade-in + 從圓圈下方淡入
 *   - 退場 fade-out 12f
 */
import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export type VideoFit = {
  /** Video native dimensions (e.g., 2940 for the RWD demo) */
  nativeW: number;
  nativeH: number;
  /** Container area (where the video is drawn) in canvas coords */
  containerLeft: number;
  containerTop: number;
  containerW: number;
  containerH: number;
  /** Currently only "contain" implemented */
  objectFit: "contain" | "cover";
};

export type SpotlightCue = {
  /** Global frame (in the same coordinate system as useCurrentFrame() at the level where the layer is mounted) */
  from: number;
  to: number;
  /** Video-native coordinates of the spotlight center */
  vx: number;
  vy: number;
  /** Spotlight ring radius in CANVAS pixels (after objectFit mapping). Default 100*S. */
  radius?: number;
  /** Optional short label (≤ 12 chars Chinese) rendered below or above the spotlight */
  label?: string;
  /** Label position relative to the spotlight: "bottom" (default) or "top" */
  labelPos?: "bottom" | "top";
  /** Accent color, default orange. */
  accent?: string;
};

type Props = {
  fit: VideoFit;
  cues: SpotlightCue[];
  /** Scale factor (S=2 for the vibe-coding 4K compositions) */
  S?: number;
  /** Whether to dim the surrounding video. Default false (just ring). */
  dimSurround?: boolean;
};

const DEFAULT_ACCENT = "#ff9f43";

/** Map a (vx, vy) point in video-native pixels to canvas (x, y) given the fit transform. */
function videoToCanvas(fit: VideoFit, vx: number, vy: number): { x: number; y: number; scale: number } {
  const { nativeW, nativeH, containerLeft, containerTop, containerW, containerH, objectFit } = fit;
  if (objectFit === "contain") {
    const scaleW = containerW / nativeW;
    const scaleH = containerH / nativeH;
    const scale = Math.min(scaleW, scaleH);
    const renderedW = nativeW * scale;
    const renderedH = nativeH * scale;
    const offsetX = (containerW - renderedW) / 2;
    const offsetY = (containerH - renderedH) / 2;
    return { x: containerLeft + offsetX + vx * scale, y: containerTop + offsetY + vy * scale, scale };
  }
  // cover: fills both dimensions, crops the overflowing side
  const scale = Math.max(containerW / nativeW, containerH / nativeH);
  const renderedW = nativeW * scale;
  const renderedH = nativeH * scale;
  const offsetX = (containerW - renderedW) / 2;
  const offsetY = (containerH - renderedH) / 2;
  return { x: containerLeft + offsetX + vx * scale, y: containerTop + offsetY + vy * scale, scale };
}

function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const SingleSpotlight: React.FC<{ cue: SpotlightCue; fit: VideoFit; S: number; dimSurround: boolean }> = ({
  cue, fit, S, dimSurround,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localF = frame - cue.from;
  const duration = cue.to - cue.from;
  if (localF < -2 || localF > duration + 14) return null;

  const accent = cue.accent ?? DEFAULT_ACCENT;
  const radius = cue.radius ?? 100 * S;
  const { x, y } = videoToCanvas(fit, cue.vx, cue.vy);

  // Draw-on the ring (stroke-dasharray)
  const drawP = spring({ frame: localF, fps, config: { damping: 200 }, durationInFrames: 18 });
  // Breathing pulse on the ring radius
  const breath = 0.95 + 0.1 * Math.sin((localF / 24) * Math.PI * 2);
  const ringR = radius * breath;
  // Halo opacity (outer soft glow)
  const haloOp = interpolate(localF, [0, 12, duration, duration + 14], [0, 0.55, 0.55, 0], clamp);
  const ringOp = interpolate(localF, [0, 6, duration, duration + 12], [0, 1, 1, 0], clamp);
  // Label fade
  const labelOp = interpolate(localF, [10, 22, duration, duration + 10], [0, 1, 1, 0], clamp);
  const labelY = interpolate(localF, [10, 22], [8 * S, 0], clamp);

  const C = 2 * Math.PI * ringR;
  const dashLen = C * drawP;
  const gapLen = C - dashLen;

  const labelPos = cue.labelPos ?? "bottom";
  const labelOffsetY = labelPos === "bottom" ? radius + 28 * S : -(radius + 28 * S + 36 * S);

  return (
    <>
      {/* Dim surrounding (optional) — uses inverted radial mask */}
      {dimSurround && (
        <svg width={fit.containerW + fit.containerLeft * 2} height={fit.containerH + fit.containerTop * 2}
             style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <defs>
            <radialGradient id={`dim-${cue.from}`} cx={x} cy={y} r={ringR * 1.6}
                            gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="70%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor={`rgba(9,9,15,${0.55 * ringOp})`} />
            </radialGradient>
          </defs>
          <rect x={0} y={0} width="100%" height="100%" fill={`url(#dim-${cue.from})`} />
        </svg>
      )}

      {/* Halo (soft glow) */}
      <div style={{
        position: "absolute",
        left: x - ringR * 1.8,
        top: y - ringR * 1.8,
        width: ringR * 3.6,
        height: ringR * 3.6,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${hexA(accent, 0.32)} 0%, ${hexA(accent, 0.10)} 35%, transparent 65%)`,
        opacity: haloOp,
        pointerEvents: "none",
      }} />

      {/* Ring (draw-on) */}
      <svg
        width={ringR * 2.4}
        height={ringR * 2.4}
        viewBox={`0 0 ${ringR * 2.4} ${ringR * 2.4}`}
        style={{ position: "absolute", left: x - ringR * 1.2, top: y - ringR * 1.2, opacity: ringOp, pointerEvents: "none" }}
      >
        <circle
          cx={ringR * 1.2}
          cy={ringR * 1.2}
          r={ringR}
          fill="none"
          stroke={accent}
          strokeWidth={4 * S}
          strokeLinecap="round"
          strokeDasharray={`${dashLen} ${gapLen}`}
          transform={`rotate(-90 ${ringR * 1.2} ${ringR * 1.2})`}
          style={{ filter: `drop-shadow(0 0 ${10 * S}px ${hexA(accent, 0.6)})` }}
        />
      </svg>

      {/* Label */}
      {cue.label && (
        <div style={{
          position: "absolute",
          left: x,
          top: y + labelOffsetY + labelY,
          transform: "translateX(-50%)",
          opacity: labelOp,
          pointerEvents: "none",
        }}>
          <div style={{
            background: "rgba(9,9,15,0.86)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: `1px solid ${hexA(accent, 0.4)}`,
            borderRadius: 12 * S,
            padding: `${10 * S}px ${20 * S}px`,
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 26 * S,
            fontWeight: 600,
            color: accent,
            whiteSpace: "nowrap",
            boxShadow: `0 ${4 * S}px ${20 * S}px rgba(0,0,0,0.5)`,
            letterSpacing: "0.02em",
          }}>
            {cue.label}
          </div>
        </div>
      )}
    </>
  );
};

/** Mount inside the same coordinate space as the video (typically inside the scene's AbsoluteFill above the OffthreadVideo). */
export const CursorSpotlightLayer: React.FC<Props> = ({ fit, cues, S = 2, dimSurround = false }) => {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 60 }}>
      {cues.map((c, i) => (
        <SingleSpotlight key={i} cue={c} fit={fit} S={S} dimSurround={dimSurround} />
      ))}
    </div>
  );
};
