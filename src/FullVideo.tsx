import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  Video,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from "remotion";

// ─────────────────────────────────────────────────────────────────────────────
// Design System — exact match to (N)ch0-1.html CSS variables
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#000000",
  surface:      "#0d0d0d",
  surface2:     "#111111",
  primaryLight: "rgba(124, 255, 178, 0.07)",
  primary:      "#7cffb2",
  text:         "#ffffff",
  muted:        "#888888",
  yellow:       "#ffd166",
  border:       "rgba(124,255,178,0.14)",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const NAV_H       = 72;
const CONTAINER_W = 1500;
const SUBTITLE_H  = 160;  // reserved at bottom for subtitles

// ─────────────────────────────────────────────────────────────────────────────
// Audio segment durations (updated from new audio files)
// Segments 1.1 through 4.2 (first 9), then tail 5.1 through 6.1
// ─────────────────────────────────────────────────────────────────────────────
const SEGMENTS = [
  { id: "1.1",  file: "0-1_1.1.wav",  frames: 1144 },
  { id: "2.1",  file: "0-1_2.1.wav",  frames: 1024 },
  { id: "2.2",  file: "0-1_2.2.wav",  frames: 1003 },
  { id: "2.3",  file: "0-1_2.3.wav",  frames: 1321 },
  { id: "3.0",  file: "0-1_3.0.wav",  frames: 2654 },
  { id: "3.1",  file: "0-1_3.1.wav",  frames: 3594 },
  { id: "3.2",  file: "0-1_3.2.wav",  frames: 1558 },
  { id: "4.1",  file: "0-1_4.1.wav",  frames: 2305 },
  { id: "4.2",  file: "0-1_4.2.wav",  frames: 1062 },
  // 4.3 is handled separately below (split into 3 parts with 2 MP4 inserts)
  { id: "5.1",  file: "0-1_5.1.wav",  frames: 1618 },
  { id: "5.2",  file: "0-1_5.2.wav",  frames:  854 },
  { id: "5.3",  file: "0-1_5.3.wav",  frames: 3162 },
  { id: "6.1",  file: "0-1_6.1.wav",  frames: 2398 },
] as const;

// First 9 segments (1.1 through 4.2) — cumulative starts
const SEG_9 = SEGMENTS.slice(0, 9) as readonly { id: string; file: string; frames: number }[];
const SEG_9_STARTS = SEG_9.reduce((acc, seg, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SEG_9[i - 1].frames);
  return acc;
}, [] as number[]);
const SEG_9_END = SEG_9_STARTS[8] + SEG_9[8].frames; // 4.2 ends here

// ─────────────────────────────────────────────────────────────────────────────
// 4.3 split sequence with 2 MP4 inserts
// ─────────────────────────────────────────────────────────────────────────────
const F_43A_START  = SEG_9_END;
const F_43A_END    = F_43A_START  + 865;
const F_MP4_1_START = F_43A_END;
const F_MP4_1_END   = F_MP4_1_START + 1677;
const F_43B_START  = F_MP4_1_END;
const F_43B_END    = F_43B_START  + 1083;
const F_MP4_2_START = F_43B_END;
const F_MP4_2_END   = F_MP4_2_START + 813;
const F_43C_START  = F_MP4_2_END;
const F_43C_END    = F_43C_START  + 240;

// Tail segments (5.1 through 6.1) — start right after 4.3c
const TAIL_SEGS = SEGMENTS.slice(9) as readonly { id: string; file: string; frames: number }[];
const TAIL_STARTS = TAIL_SEGS.reduce((acc, seg, i) => {
  acc.push(i === 0 ? F_43C_END : acc[i - 1] + TAIL_SEGS[i - 1].frames);
  return acc;
}, [] as number[]);

export const TOTAL_FRAMES = TAIL_STARTS[TAIL_SEGS.length - 1] + TAIL_SEGS[TAIL_SEGS.length - 1].frames;

// ─────────────────────────────────────────────────────────────────────────────
// SceneMediaInsert — full-screen video insert with fade in/out
// ─────────────────────────────────────────────────────────────────────────────
const SceneMediaInsert: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const FADE = 15;
  const opacity = interpolate(frame, [0, FADE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <div style={{ position: "absolute", inset: 0, opacity }}>
        <Video
          src={staticFile(src)}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// useFadeUp — replicates HTML `animation: fadeUp 0.6s ease both`
// ─────────────────────────────────────────────────────────────────────────────
function useFadeUp(startFrame: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const progress = spring({ frame: f, fps, config: { damping: 22, stiffness: 90 } });
  const opacity = interpolate(f, [0, 18], [0, 1], clamp);
  const y = interpolate(progress, [0, 1], [24, 0], clamp);
  return { opacity, transform: `translateY(${y}px)` };
}

function useFocusHighlight(startFrame: number, duration = 75) {
  const frame = useCurrentFrame();
  const f = frame - startFrame;
  if (f < 0 || f > duration) return {};
  const intensity = interpolate(f, [0, duration], [1, 0], clamp);
  return {
    boxShadow: `0 0 ${Math.round(intensity * 24)}px rgba(124,255,178,${(intensity * 0.55).toFixed(2)})`,
    borderColor: `rgba(124,255,178,${(0.14 + intensity * 0.5).toFixed(2)})`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useSceneTransition + SceneScroller — scroll-up animation between scenes
// ─────────────────────────────────────────────────────────────────────────────
function useSceneTransition(): React.CSSProperties {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const TRANS = 22;
  const inProg = spring({ frame, fps, config: { damping: 28, stiffness: 160 } });
  const inY = interpolate(inProg, [0, 1], [700, 0], clamp);
  const outF = Math.max(0, frame - (durationInFrames - TRANS));
  const outProg = spring({ frame: outF, fps, config: { damping: 28, stiffness: 160 } });
  const outY = interpolate(outProg, [0, 1], [0, -700], clamp);
  return { transform: `translateY(${inY + outY}px)` };
}

const SceneScroller: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const trans = useSceneTransition();
  return <div style={{ position: "absolute", inset: 0, ...trans }}>{children}</div>;
};

// ─────────────────────────────────────────────────────────────────────────────
// ProgressBar
// ─────────────────────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ progressPct?: number }> = ({ progressPct = 8 }) => {
  const frame = useCurrentFrame();
  const slideY = interpolate(frame, [0, 18], [-72, 0], clamp);

  return (
    <div style={{
      position: "absolute",
      top: slideY, left: 0, right: 0,
      zIndex: 100,
      background: "rgba(0,0,0,0.92)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: `1px solid ${C.border}`,
      padding: "14px 40px",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "'Space Mono', monospace",
        fontSize: 16,
        color: C.muted,
        letterSpacing: "0.05em",
        marginBottom: 8,
      }}>
        <Img
          src={staticFile("aischool-logo.webp")}
          style={{ height: 22, width: "auto", mixBlendMode: "screen", opacity: 0.9 }}
        />
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${progressPct}%`,
          background: C.primary,
          borderRadius: 99,
          boxShadow: "0 0 8px rgba(124,255,178,0.5)",
        }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// iMessage Notification Callout — S=2 for Vibe Coding 1080p
// ─────────────────────────────────────────────────────────────────────────────
// ─── iMessage constants (S=2, exact match to article-video S=3 scaled down) ──
const S             = 2;
const NOTIF_W       = 290 * S;   // 580px
const NOTIF_TOP     = 12  * S;   // 24px  gap below nav
const NOTIF_RIGHT   = 20  * S;   // 40px  from right edge
const NOTIF_SLOT    = 148 * S;   // 296px per slot (card height + gap)
const NOTIF_SLIDE_H = 110 * S;   // 220px slide-in distance
const FADE_OUT_F    = 50;

type Callout = { from: number; to: number; sender: string; text: string; };

const CalloutCard: React.FC<{ c: Callout; allCallouts: Callout[] }> = ({ c, allCallouts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localF   = frame - c.from;
  const duration = c.to - c.from;
  const totalVisible = duration + FADE_OUT_F;

  if (localF < 0 || localF >= totalVisible) return null;

  // Stack push-down from newer notifications
  let totalYPush = 0;
  for (const newer of allCallouts) {
    if (newer.from <= c.from) continue;
    if (frame < newer.from) continue;
    const pushF = frame - newer.from;
    const pushP = spring({ frame: pushF, fps, config: { damping: 22, stiffness: 120 } });
    totalYPush += NOTIF_SLOT * pushP;
  }

  // Entry: slide down from top
  const entryP = spring({ frame: localF, fps, config: { damping: 22, stiffness: 130 } });
  const slideY = interpolate(entryP, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);

  // Opacity: fade in → hold → slow fade out
  const opacity = interpolate(
    localF,
    [0, 10, duration, totalVisible],
    [0, 1, 1, 0],
    clamp,
  );

  // Stack depth fade
  const stackDepth = totalYPush / NOTIF_SLOT;
  const depthAlpha = interpolate(stackDepth, [0, 1, 2], [1, 0.65, 0.35], clamp);

  // Typewriter — 0.85 chars/frame, starts at frame 14
  const CHARS_PER_FRAME = 0.85;
  const charsVisible = interpolate(
    Math.max(0, localF - 14),
    [0, c.text.length / CHARS_PER_FRAME],
    [0, c.text.length],
    clamp,
  );
  const displayText = c.text.slice(0, Math.floor(charsVisible));
  const cursor = localF % 20 < 10 && charsVisible < c.text.length ? "|" : "";

  const iconSize   = 38 * S;
  const fontBase   = 11 * S;
  const fontSender = 13 * S;
  const fontBody   = 13 * S;

  return (
    <div style={{
      position: "absolute",
      top: NAV_H + NOTIF_TOP + totalYPush,
      right: NOTIF_RIGHT,
      width: NOTIF_W,
      transform: `translateY(${slideY}px)`,
      opacity: opacity * depthAlpha,
      pointerEvents: "none",
      zIndex: 100,
    }}>
      <div style={{
        background: "rgba(28,28,30,0.9)",
        backdropFilter: "blur(48px)",
        WebkitBackdropFilter: "blur(48px)",
        border: `${1 * S}px solid rgba(255,255,255,0.13)`,
        borderRadius: 14 * S,
        boxShadow: `0 ${8 * S}px ${40 * S}px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06) inset`,
        padding: `${10 * S}px ${14 * S}px`,
        display: "flex",
        gap: 11 * S,
        alignItems: "flex-start",
      }}>
        {/* Messages app icon */}
        <div style={{
          width: iconSize, height: iconSize,
          borderRadius: 9 * S,
          background: "linear-gradient(145deg, #3DDC6A 0%, #25A244 100%)",
          boxShadow: `0 ${2 * S}px ${10 * S}px rgba(52,199,89,0.45)`,
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Speech bubble */}
          <div style={{ position: "relative", width: 22 * S, height: 20 * S }}>
            <div style={{
              position: "absolute", top: 0, left: 0,
              width: 22 * S, height: 16 * S,
              background: "white", borderRadius: 5 * S, opacity: 0.95,
            }} />
            <div style={{
              position: "absolute", bottom: 0, left: 4 * S,
              width: 0, height: 0,
              borderLeft: `${5 * S}px solid transparent`,
              borderTop: `${6 * S}px solid white`,
              opacity: 0.95,
            }} />
          </div>
        </div>

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* App name + timestamp */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 3 * S,
          }}>
            <span style={{
              fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif",
              fontSize: fontBase, fontWeight: 600,
              color: "rgba(255,255,255,0.45)", letterSpacing: "0.01em",
            }}>iMessage</span>
            <span style={{
              fontFamily: "-apple-system,'SF Pro Text',system-ui,sans-serif",
              fontSize: fontBase, color: "rgba(255,255,255,0.3)",
            }}>now</span>
          </div>

          {/* Sender name */}
          <div style={{
            fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif",
            fontSize: fontSender, fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            marginBottom: 2 * S, letterSpacing: "-0.01em",
            whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis",
          }}>{c.sender}</div>

          {/* Message body — typewriter */}
          <div style={{
            fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif",
            fontSize: fontBody, fontWeight: 400,
            color: "rgba(255,255,255,0.60)",
            lineHeight: 1.45, letterSpacing: "-0.005em",
            minHeight: fontBody * 1.45,
          }}>{displayText}{cursor}</div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SVG Supplemental Animations
// ─────────────────────────────────────────────────────────────────────────────

/** Two-node horizontal flow: [A] → [B] — draws arrow then fades out */
const SVGFlow2: React.FC<{ startFrame: number; nodeA: string; nodeB: string; label?: string }> = ({ startFrame, nodeA, nodeB, label = "外包" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - startFrame;
  if (f < 0 || f > 200) return null;
  const fadeIn  = interpolate(f, [0, 12], [0, 1], clamp);
  const fadeOut = interpolate(f, [150, 200], [1, 0], clamp);
  const opacity = Math.min(fadeIn, fadeOut);
  const progress = spring({ frame: f, fps, config: { damping: 22, stiffness: 80 } });
  const arrowW = interpolate(progress, [0, 1], [0, 140], clamp);
  const nodeScale = spring({ frame: Math.max(0, f), fps, config: { damping: 20, stiffness: 110 } });
  return (
    <div style={{ position: "absolute", bottom: SUBTITLE_H + 32, left: "50%", transform: "translateX(-50%)", opacity, zIndex: 20, pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <div style={{
          background: "rgba(124,255,178,0.12)", border: "1.5px solid rgba(124,255,178,0.4)",
          borderRadius: 14, padding: "18px 30px",
          fontFamily: "'Noto Sans TC',sans-serif", fontSize: 30, fontWeight: 700, color: C.primary,
          transform: `scale(${nodeScale})`,
          boxShadow: "0 0 18px rgba(124,255,178,0.15)",
        }}>{nodeA}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: arrowW, overflow: "hidden" }}>
          <span style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 20, color: C.muted, marginBottom: 2 }}>{label}</span>
          <div style={{ width: "100%", height: 2, background: C.primary, position: "relative" }}>
            <div style={{ position: "absolute", right: -1, top: -5, width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: `10px solid ${C.primary}` }} />
          </div>
        </div>
        <div style={{
          background: "rgba(124,255,178,0.12)", border: "1.5px solid rgba(124,255,178,0.4)",
          borderRadius: 14, padding: "18px 30px",
          fontFamily: "'Noto Sans TC',sans-serif", fontSize: 30, fontWeight: 700, color: C.primary,
          transform: `scale(${Math.min(1, Math.max(0, interpolate(f, [8, 20], [0, 1], clamp)))})`,
          boxShadow: "0 0 18px rgba(124,255,178,0.15)",
        }}>{nodeB}</div>
      </div>
    </div>
  );
};

/** Time comparison bar chart: tall red bar vs tiny green bar */
const SVGTimeBar: React.FC<{ startFrame: number; labelA: string; labelB: string; tagline?: string }> = ({ startFrame, labelA, labelB, tagline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - startFrame;
  if (f < 0 || f > 230) return null;
  const fadeOut = interpolate(f, [185, 230], [1, 0], clamp);
  const progressA = spring({ frame: Math.max(0, f - 5), fps, config: { damping: 22, stiffness: 60 } });
  const progressB = spring({ frame: Math.max(0, f - 25), fps, config: { damping: 22, stiffness: 60 } });
  const barAH = interpolate(progressA, [0, 1], [0, 130], clamp);
  const barBH = interpolate(progressB, [0, 1], [0, 14], clamp);
  const labelFade = interpolate(f, [30, 50], [0, 1], clamp);
  return (
    <div style={{
      position: "absolute", bottom: SUBTITLE_H + 28, right: 140,
      opacity: fadeOut, zIndex: 20, pointerEvents: "none",
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 18, padding: "20px 28px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 52, height: barAH, background: "rgba(255,80,80,0.6)", borderRadius: "6px 6px 0 0", border: "1px solid rgba(255,80,80,0.3)" }} />
          <span style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 18, color: "rgba(255,120,120,0.85)", opacity: labelFade, textAlign: "center", maxWidth: 80 }}>{labelA}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 52, height: barBH, background: "rgba(124,255,178,0.7)", borderRadius: "6px 6px 0 0", border: "1px solid rgba(124,255,178,0.4)" }} />
          <span style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 18, color: C.primary, opacity: labelFade, textAlign: "center", maxWidth: 80 }}>{labelB}</span>
        </div>
      </div>
      {tagline && (
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, color: C.primary, opacity: labelFade, marginTop: 10, textAlign: "center" }}>{tagline}</div>
      )}
    </div>
  );
};

/** Chat-bubble diagram: YOU → AI */
const SVGChatFlow: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - startFrame;
  if (f < 0 || f > 210) return null;
  const fadeOut = interpolate(f, [165, 210], [1, 0], clamp);
  const leftScale = spring({ frame: Math.max(0, f), fps, config: { damping: 22, stiffness: 100 } });
  const rightScale = spring({ frame: Math.max(0, f - 18), fps, config: { damping: 22, stiffness: 100 } });
  const arrowOp = interpolate(f, [15, 35], [0, 1], clamp);
  return (
    <div style={{
      position: "absolute", bottom: SUBTITLE_H + 28, right: 80,
      opacity: fadeOut, zIndex: 20, pointerEvents: "none",
      background: "rgba(0,0,0,0.78)", backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(124,255,178,0.15)",
      borderRadius: 20, padding: "20px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          background: "rgba(124,255,178,0.1)", border: "1px solid rgba(124,255,178,0.3)",
          borderRadius: 14, padding: "12px 18px", transform: `scale(${leftScale})`,
          maxWidth: 200,
        }}>
          <div style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 18, color: C.muted, marginBottom: 4 }}>你說</div>
          <div style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 22, color: C.text, lineHeight: 1.4 }}>我想要一個旅遊投票頁面</div>
        </div>
        <div style={{ opacity: arrowOp, fontSize: 28, color: C.primary }}>→</div>
        <div style={{
          background: "rgba(124,255,178,0.14)", border: "1px solid rgba(124,255,178,0.4)",
          borderRadius: 14, padding: "12px 18px", transform: `scale(${rightScale})`,
          textAlign: "center",
        }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, color: C.primary, marginBottom: 6 }}>AI</div>
          <div style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 28, color: "#7cffb2" }}>✓ 完成</div>
        </div>
      </div>
    </div>
  );
};

/** 甲方/乙方 role diagram */
const SVGRoleDiagram: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - startFrame;
  if (f < 0 || f > 240) return null;
  const fadeOut = interpolate(f, [195, 240], [1, 0], clamp);
  const leftScale = spring({ frame: Math.max(0, f), fps, config: { damping: 22, stiffness: 100 } });
  const rightScale = spring({ frame: Math.max(0, f - 12), fps, config: { damping: 22, stiffness: 100 } });
  const arrowOp = interpolate(f, [10, 28], [0, 1], clamp);
  return (
    <div style={{
      position: "absolute", bottom: SUBTITLE_H + 28, right: 80,
      opacity: fadeOut, zIndex: 20, pointerEvents: "none",
      background: "rgba(0,0,0,0.80)", backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(124,255,178,0.15)",
      borderRadius: 20, padding: "20px 28px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          background: "rgba(124,255,178,0.1)", border: "1px solid rgba(124,255,178,0.35)",
          borderRadius: 14, padding: "14px 22px", transform: `scale(${leftScale})`, textAlign: "center",
        }}>
          <div style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 18, color: C.muted, marginBottom: 4 }}>你</div>
          <div style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 26, color: C.primary, fontWeight: 700 }}>甲方</div>
          <div style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 18, color: C.muted }}>需求提出者</div>
        </div>
        <div style={{ opacity: arrowOp, textAlign: "center" }}>
          <div style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 20, color: C.muted, marginBottom: 4 }}>需求</div>
          <div style={{ fontSize: 24, color: C.primary }}>⇄</div>
          <div style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 20, color: C.muted, marginTop: 4 }}>程式</div>
        </div>
        <div style={{
          background: "rgba(124,255,178,0.1)", border: "1px solid rgba(124,255,178,0.35)",
          borderRadius: 14, padding: "14px 22px", transform: `scale(${rightScale})`, textAlign: "center",
        }}>
          <div style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 18, color: C.muted, marginBottom: 4 }}>AI</div>
          <div style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 26, color: C.primary, fontWeight: 700 }}>乙方</div>
          <div style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 18, color: C.muted }}>工程師</div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Background Orbs
// ─────────────────────────────────────────────────────────────────────────────
const BgOrbs: React.FC = () => {
  const frame = useCurrentFrame();
  const bgAlpha = interpolate(frame, [0, 30], [0, 1], clamp);
  return (
    <>
      <div style={{
        position: "absolute", top: -200, right: -200, width: 600, height: 600,
        background: `radial-gradient(circle, rgba(124,255,178,${0.07 * bgAlpha}) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -200, left: -200, width: 500, height: 500,
        background: `radial-gradient(circle, rgba(124,255,178,${0.04 * bgAlpha}) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Section Header helper
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ num: string; title: string; fadeStyle: React.CSSProperties }> = ({
  num, title, fadeStyle,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, ...fadeStyle }}>
    <span style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: 22, color: C.primary,
      background: "rgba(124,255,178,0.08)",
      border: `1px solid ${C.border}`,
      padding: "6px 14px", borderRadius: 99,
      whiteSpace: "nowrap" as const,
    }}>{num}</span>
    <h2 style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      fontSize: 52, fontWeight: 700,
      letterSpacing: "-0.01em",
      color: C.text, margin: 0,
    }}>{title}</h2>
  </div>
);

// Card helper
const Card: React.FC<{ children: React.ReactNode; fadeStyle?: React.CSSProperties; highlightStyle?: React.CSSProperties; marginBottom?: number }> = ({
  children, fadeStyle = {}, highlightStyle = {}, marginBottom = 20,
}) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 22, padding: "36px 44px", marginBottom,
    ...fadeStyle, ...highlightStyle,
  }}>
    <p style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      fontSize: 36, color: C.muted, lineHeight: 1.8, margin: 0,
    }}>
      {children}
    </p>
  </div>
);

// Analogy box helper
const AnalogyBox: React.FC<{
  label: string; children: React.ReactNode;
  fadeStyle?: React.CSSProperties; highlightStyle?: React.CSSProperties; marginBottom?: number;
}> = ({ label, children, fadeStyle = {}, highlightStyle = {}, marginBottom = 20 }) => (
  <div style={{
    background: C.primaryLight, borderLeft: `4px solid ${C.primary}`,
    borderRadius: "0 16px 16px 0", padding: "32px 38px", marginBottom,
    ...fadeStyle, ...highlightStyle,
  }}>
    <div style={{
      fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700,
      color: C.primary, letterSpacing: "0.08em",
      textTransform: "uppercase" as const, marginBottom: 10,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <div style={{ width: 6, height: 6, background: C.primary, borderRadius: 1, flexShrink: 0, boxShadow: "0 0 6px #7cffb2" }} />
      {label}
    </div>
    <p style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      fontSize: 34, color: "#c8ffe0", lineHeight: 1.75, margin: 0,
    }}>
      {children}
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 1 — Hero (segment 1.1, frames 0–1210)
// ─────────────────────────────────────────────────────────────────────────────
const SceneHero: React.FC = () => {
  const meta  = useFadeUp(28);
  const title = useFadeUp(50);
  const sub   = useFadeUp(75);

  const CALLOUTS_HERO: Callout[] = [
    { from: 520, to: 730, sender: "完全零基礎的我", text: "原來不用寫程式也能讓電腦幫我做事？" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={2} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div>
          <div style={{ padding: "64px 0 48px", borderBottom: `1px solid ${C.border}`, marginBottom: 56 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, ...meta }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 20, color: C.primary,
                border: `1px solid ${C.primary}`, padding: "5px 14px", borderRadius: 99,
                letterSpacing: "0.05em", boxShadow: "0 0 10px rgba(124,255,178,0.2)",
              }}>CH 0-1</span>
              <span style={{ fontSize: 20, padding: "5px 14px", borderRadius: 99, fontWeight: 500, background: "rgba(124,255,178,0.1)", color: C.primary }}>✦ 完全零基礎</span>
              <span style={{ fontSize: 20, padding: "5px 14px", borderRadius: 99, fontWeight: 500, background: "rgba(255,209,102,0.1)", color: C.yellow }}>✦ 約 10 分鐘</span>
            </div>
            <div style={{ marginBottom: 20, ...title }}>
              <div style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", fontSize: 88, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.02em", color: C.text }}>
                AI 寫程式是什麼？
              </div>
              <div style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", fontSize: 88, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.02em", color: C.text }}>
                Vibe Coding 入門
              </div>
            </div>
            <div style={{ ...sub }}>
              <p style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", fontSize: 36, color: C.muted, lineHeight: 1.75, margin: 0, maxWidth: 600 }}>
                從「寫程式」的本質出發，理解為什麼現在是人人都能寫程式的時代，以及 Vibe Coding 與 AI Coding 有什麼不同。
              </p>
            </div>
          </div>
        </div>
      </div>
      </SceneScroller>
      {CALLOUTS_HERO.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS_HERO} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 2 — Section 01 Card 1: 自動化概念 (segment 2.1)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection01Card1: React.FC = () => {
  const header = useFadeUp(15);
  const card   = useFadeUp(30);
  const cardHL = useFocusHighlight(30);

  const CALLOUTS: Callout[] = [
    { from: 490, to: 700, sender: "學員", text: "原來這就叫做自動化！工作上步驟固定的事都能交給電腦？" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={10} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="01" title="寫程式，究竟是什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            <strong style={{ color: C.text }}>寫程式的本質，就是把「人要做的事」轉交給電腦去執行。</strong>
            <br />
            這件事有個更正式的名字，叫做{" "}
            <span style={{ color: C.primary, fontWeight: 700 }}>自動化</span>
            。只要一件工作有固定的步驟、電腦能一一代勞，它就可以被自動化。
          </Card>
        </div>
      </div>
      <SVGFlow2 startFrame={341} nodeA="人工作" nodeB="電腦執行" label="外包" />
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3 — Section 01 Analogy: 生活比喻 (segment 2.2)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection01Analogy: React.FC = () => {
  const header    = useFadeUp(15);
  const card      = useFadeUp(25);
  const cardHL    = useFocusHighlight(25);
  const analogy   = useFadeUp(50);
  const analogyHL = useFocusHighlight(50);

  const CALLOUTS: Callout[] = [
    { from: 878, to: 984, sender: "非工程師朋友", text: "規則說清楚，剩下交給它？聽起來超簡單！" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={15} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="01" title="寫程式，究竟是什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            <strong style={{ color: C.text }}>寫程式的本質，就是把「人要做的事」轉交給電腦去執行。</strong>
            <br />
            這件事有個更正式的名字，叫做{" "}
            <span style={{ color: C.primary, fontWeight: 700 }}>自動化</span>
            。只要一件工作有固定的步驟、電腦能一一代勞，它就可以被自動化。
          </Card>
          <AnalogyBox label="一句話理解" fadeStyle={analogy} highlightStyle={analogyHL}>
            想像你每天上班前都要手動把一疊文件依日期排好、蓋上編號。
            <strong style={{ color: "#ffffff" }}>
              {" "}寫程式，就像是訓練一個永遠不會出錯、也不需要午休的助手，讓它幫你把這件事自動完成。
            </strong>
            你只需要說清楚規則，剩下的交給它。
          </AnalogyBox>
        </div>
      </div>
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4 — Section 01 Card 2: 廣義vs狹義 (segment 2.3)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection01Card2: React.FC = () => {
  const header  = useFadeUp(15);
  const broad   = useFadeUp(30);
  const broadHL = useFocusHighlight(30);
  const narrow  = useFadeUp(671);  // VTT 00:22.380 when narrator says "但狹義的寫程式"
  const narrowHL = useFocusHighlight(671);

  const CALLOUTS: Callout[] = [
    { from: 529, to: 749, sender: "業務同仁", text: "等等⋯我每天用的 Excel 公式就是寫程式？！" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={20} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 48 }}>
          <SectionHeader num="01" title="寫程式，究竟是什麼？" fadeStyle={header} />
          {/* 廣義 */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 22, padding: "28px 40px", marginBottom: 16,
            ...broad, ...broadHL,
          }}>
            <div style={{
              fontFamily: "'Space Mono',monospace", fontSize: 18, color: C.primary,
              letterSpacing: "0.06em", marginBottom: 8,
            }}>廣義</div>
            <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 34, color: C.muted, lineHeight: 1.7, margin: 0 }}>
              試算表裡的公式也算是一種「寫程式」——每一條公式就是給電腦的一道指令，告訴它「用這個規則算出結果」。
            </p>
          </div>
          {/* 狹義 */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 22, padding: "28px 40px", marginBottom: 16,
            ...narrow, ...narrowHL,
          }}>
            <div style={{
              fontFamily: "'Space Mono',monospace", fontSize: 18, color: C.muted,
              letterSpacing: "0.06em", marginBottom: 8,
            }}>狹義</div>
            <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 34, color: C.muted, lineHeight: 1.7, margin: 0 }}>
              正規的程式語言，用來建出我們日常生活中用到的各種軟體：<span style={{ color: C.primary, fontWeight: 700 }}>網頁、App、智慧家電的控制系統</span>……背後都是程式在運作。
            </p>
          </div>
        </div>
      </div>
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 5 — Section 02 Card: 非工程師前言 (segment 3.0)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection02Intro: React.FC = () => {
  const header = useFadeUp(15);
  const card   = useFadeUp(25);
  const cardHL = useFocusHighlight(25);
  const case1  = useFadeUp(770);
  const case2  = useFadeUp(1370);
  const case3  = useFadeUp(1910);

  const CALLOUTS: Callout[] = [
    { from: 1108, to: 1308, sender: "行政助理小美", text: "每週整理報表超花時間，原來我最需要這個！" },
    { from: 1560, to: 1790, sender: "業務主管", text: "手動輸入 CRM 常打錯，這問題可以解決？" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={28} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="02" title="非工程師，可以用寫程式做什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            不需要成為軟體工程師，<strong style={{ color: C.text }}>只要你手上有下面這三種麻煩</strong>，寫程式就能幫上你的忙：
          </Card>

          {/* Usecase grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
            {[
              { icon: "↻", title: "重複性工作", desc: "每天或每週都要手動執行同樣操作，步驟固定但耗時費力。", style: case1 },
              { icon: "!", title: "人工容易出錯", desc: "靠人工一筆一筆輸入，難免遺漏或打錯，影響資料品質。", style: case2 },
              { icon: "◎", title: "資訊蒐集整理", desc: "需要定期從多個來源收集資料，整合起來又要花大量時間。", style: case3 },
            ].map((item, i) => (
              <div key={i} style={{
                background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: 16, padding: "30px 32px", ...item.style,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 34,
                  color: C.primary, marginBottom: 12,
                  width: 54, height: 54,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(124,255,178,0.08)", borderRadius: 8,
                }}>{item.icon}</div>
                <h3 style={{
                  fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
                  fontSize: 30, fontWeight: 700, marginBottom: 6, color: C.text,
                }}>{item.title}</h3>
                <p style={{
                  fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
                  fontSize: 24, color: C.muted, lineHeight: 1.6, margin: 0,
                }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 6 — Section 02 Usecases: 具體場景 (segment 3.1)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection02Usecases: React.FC = () => {
  const header  = useFadeUp(15);
  const card1   = useFadeUp(25);
  const card1HL = useFocusHighlight(25);
  const card2   = useFadeUp(1342);  // VTT 00:44.720 — narrator starts CSV scenario
  const card2HL = useFocusHighlight(1342);
  const card3   = useFadeUp(2221);  // VTT 01:14.020 — narrator starts price tracker
  const card3HL = useFocusHighlight(2221);

  const CALLOUTS: Callout[] = [
    { from:  654, to:  904, sender: "行銷專員",  text: "200封邀請信我都是一封一封寄的⋯" },
    { from: 2400, to: 2650, sender: "電商賣家",  text: "我追蹤競品價格都靠手動，原來可以自動化！" },
    { from: 3210, to: 3460, sender: "同事小明",  text: "聽起來很夢幻⋯但真的可以做到嗎？" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={38} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 40 }}>
          <SectionHeader num="02" title="非工程師，可以用寫程式做什麼？" fadeStyle={header} />
          {/* Scenario cards — appear progressively as narrator tells each story */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: 18, padding: "24px 32px",
              ...card1, ...card1HL,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, color: C.primary }}>📧  場景一</span>
              </div>
              <p style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 30, color: C.muted, lineHeight: 1.65, margin: 0 }}>
                你負責活動行銷，需要發送 200 封個人化邀請信。寫一個自動寄信程式，讓電腦在指定時間<strong style={{ color: C.text }}>一次送出全部</strong>。
              </p>
            </div>
            <div style={{
              background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: 18, padding: "24px 32px",
              ...card2, ...card2HL,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, color: C.primary }}>📊  場景二</span>
              </div>
              <p style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 30, color: C.muted, lineHeight: 1.65, margin: 0 }}>
                每月要手動合併多份 CSV 報表，費時兩小時。一個自動合併程式，能讓這件事<strong style={{ color: C.text }}>縮短到幾秒鐘</strong>。
              </p>
            </div>
            <div style={{
              background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: 18, padding: "24px 32px",
              ...card3, ...card3HL,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, color: C.primary }}>🔔  場景三</span>
              </div>
              <p style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 30, color: C.muted, lineHeight: 1.65, margin: 0 }}>
                想追蹤電商商品的價格變化。一個定時抓取資料的程式，<strong style={{ color: C.text }}>每天早上自動通知你降價</strong>，不用手動重新整理頁面。
              </p>
            </div>
          </div>
        </div>
      </div>
      <SVGTimeBar startFrame={1350} labelA="手動合併 2 小時" labelB="自動化 幾秒" tagline="120× 更快" />
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 7 — Section 02 Leisure + Quiz (segment 3.2)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection02LeisureQuiz: React.FC = () => {
  const header   = useFadeUp(15);
  const intro    = useFadeUp(25);
  const idea1    = useFadeUp(640);   // VTT ~00:21 旅遊投票
  const idea2    = useFadeUp(940);   // VTT ~00:31 隨機晚餐
  const idea3    = useFadeUp(1040);  // VTT 00:34.560 食譜頁面

  const CALLOUTS: Callout[] = [
    { from: 860, to: 1090, sender: "朋友 Emily", text: "那個旅遊投票頁面我也想做一個！" },
  ];

  const ideas = [
    { icon: "✈️", text: "讓朋友投票旅遊偏好的頁面", style: idea1 },
    { icon: "🎲", text: "隨機決定今天晚餐吃什麼的小工具", style: idea2 },
    { icon: "📖", text: "收集你喜歡食譜的個人頁面", style: idea3 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={45} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 40 }}>
          <SectionHeader num="02" title="非工程師，可以用寫程式做什麼？" fadeStyle={header} />
          <Card fadeStyle={intro}>
            除了工作效率，<strong style={{ color: C.text }}>寫程式也可以是一種生活樂趣。</strong>
            {" "}只要有有趣的 idea，懂得跟 AI 有效溝通，通通都可以透過 AI 幫你實現！
          </Card>
          {/* Idea cards — progressive reveal */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ideas.map((idea, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 20,
                background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: 16, padding: "20px 28px",
                ...idea.style,
              }}>
                <span style={{ fontSize: 36, flexShrink: 0 }}>{idea.icon}</span>
                <p style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 32, color: C.muted, lineHeight: 1.55, margin: 0 }}>{idea.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 8 — Section 03: AI Coding 定義 (segment 4.1)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection03AICoding: React.FC = () => {
  const header = useFadeUp(15);
  const card   = useFadeUp(30);
  const cardHL = useFocusHighlight(30);

  const CALLOUTS: Callout[] = [
    { from: 1202, to: 1432, sender: "非工程師朋友", text: "工程師以前要自己寫每一行？聽起來超累的" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={55} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="03" title="Vibe Coding 是什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            AI 就像是<strong style={{ color: C.text }}>神燈精靈</strong>，可以幫助我們實現很多曾經覺得很困難、甚至辦不到的事情。在 AI 寫程式的領域中，有兩種不同的方式：
            <br /><br />
            <span style={{ color: C.primary, fontWeight: 700 }}>AI Coding（AI 輔助程式設計）</span>，指的是在寫程式的過程中，讓 AI 幫你產生部分或全部的程式碼。
            無論 AI 生成的比例高低，只要有用到 AI 來協助產出程式碼，都算在這個範疇內。
          </Card>
        </div>
      </div>
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 9 — Section 03: Vibe Coding 定義 (segment 4.2)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection03VibeCoding: React.FC = () => {
  const header = useFadeUp(15);
  const card   = useFadeUp(25);
  const cardHL = useFocusHighlight(25);

  const CALLOUTS: Callout[] = [
    { from: 447, to: 647, sender: "完全零基礎的我", text: "靠感覺寫程式？！這個我可以！" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={60} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="03" title="Vibe Coding 是什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            <span style={{ color: C.primary, fontWeight: 700 }}>AI Coding</span>，指的是讓 AI 幫你產生部分或全部的程式碼。
            <br /><br />
            而 <span style={{ color: C.primary, fontWeight: 700 }}>Vibe Coding</span> 是近年出現的新詞，「Vibe」有「跟著感覺走、輕鬆隨興」的意思。
            <strong style={{ color: C.text }}> Vibe Coding 指的是：完全靠描述和對話來驅動 AI 產出程式，自己完全不碰程式碼的開發方式。</strong>
          </Card>
        </div>
      </div>
      <SVGChatFlow startFrame={515} />
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 10a — Section 03 Analogy A: 甲方/乙方 + 旅遊表單描述 (segment 4.3a, 865f)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection03Analogy_A: React.FC = () => {
  const header    = useFadeUp(15);
  const card      = useFadeUp(25);
  const cardHL    = useFocusHighlight(25);
  const analogy   = useFadeUp(228);
  const analogyHL = useFocusHighlight(228);

  const CALLOUTS: Callout[] = [
    { from: 535, to: 765, sender: "學員 Jason", text: "AI不會嫌我改太多次嗎？不會叫我加費用？" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={65} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="03" title="Vibe Coding 是什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            <span style={{ color: C.primary, fontWeight: 700 }}>Vibe Coding</span>：完全靠描述和對話來驅動 AI 產出程式，自己完全不碰程式碼的開發方式。
          </Card>
          <AnalogyBox label="一句話理解" fadeStyle={analogy} highlightStyle={analogyHL}>
            Vibe Coding 就像是你扮演<strong style={{ color: "#ffffff" }}>甲方（需求提出者）</strong>，AI 是<strong style={{ color: "#ffffff" }}>工程師（執行者）</strong>。
            你只要說「我要一個可以讓朋友填寫旅遊偏好的表單頁面」，AI 就去把整個東西做出來。
            你不需要懂它是怎麼建的，也不用看程式碼長什麼樣子。
          </AnalogyBox>
        </div>
      </div>
      <SVGRoleDiagram startFrame={217} />
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 10b — Section 03 Analogy B: 修改示範 (segment 4.3b, 1083f)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection03Analogy_B: React.FC = () => {
  const header    = useFadeUp(15);
  const card      = useFadeUp(25);
  const cardHL    = useFocusHighlight(25);
  const card2     = useFadeUp(30);
  const card2HL   = useFocusHighlight(30);

  const CALLOUTS: Callout[] = [
    { from: 700, to: 930, sender: "設計師朋友", text: "改背景顏色只要用說的？我設計師要失業了啦" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={65} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="03" title="Vibe Coding 是什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            <span style={{ color: C.primary, fontWeight: 700 }}>Vibe Coding</span>：完全靠描述和對話來驅動 AI 產出程式，自己完全不碰程式碼的開發方式。
          </Card>
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 22, padding: "24px 36px", marginBottom: 20, ...card2, ...card2HL,
          }}>
            <p style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", fontSize: 28, color: C.muted, lineHeight: 1.7, margin: 0 }}>
              如果你對這個乙方做出來的結果有任何不滿意的地方，你也可以直接跟他說，請他修改。
              他不會對你有任何的怨言，也不會叫你要加費用。
              <br /><br />
              例如，你想要把背景換成藍色的，或者是把按鈕的文字改得更可愛一點——這些都可以直接請 AI 幫你做修改。
              <strong style={{ color: C.text }}> 全程不需要手打任何一行程式碼。</strong>
            </p>
          </div>
        </div>
      </div>
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 10c — Section 03 Analogy C: 就叫做 Vibe Coding (segment 4.3c, 240f)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection03Analogy_C: React.FC = () => {
  const header = useFadeUp(15);
  const card   = useFadeUp(25);
  const cardHL = useFocusHighlight(25);

  const CALLOUTS: Callout[] = [] as Callout[];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={68} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="03" title="Vibe Coding 是什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            像這種全程只靠描述、靠對話，來驅動 AI 產出程式的方法，我們就叫做{" "}
            <span style={{ color: C.primary, fontWeight: 700 }}>Vibe Coding</span>。
          </Card>
        </div>
      </div>
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 11 — Section 04: Vibe Coding 特性 (segment 5.1)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection04VibeTraits: React.FC = () => {
  const header  = useFadeUp(15);
  const intro   = useFadeUp(25);
  const introHL = useFocusHighlight(25);
  const tableHeader = useFadeUp(305);
  const row1 = useFadeUp(340);
  const row2 = useFadeUp(520);
  const row3 = useFadeUp(720);
  const row4 = useFadeUp(960);
  const row5 = useFadeUp(1220);
  const rowStyles = [row1, row2, row3, row4, row5];

  const CALLOUTS: Callout[] = [
    { from: 857, to: 1087, sender: "學員", text: "做出來有成就感這點最重要，讓我繼續學！" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={72} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="04" title="Vibe Coding vs AI Coding：有什麼差別？" fadeStyle={header} />
          <Card fadeStyle={intro} highlightStyle={introHL}>
            這兩種方式都是 AI 輔助開發，但<strong style={{ color: C.text }}>人工介入的程度</strong>不同，適合的使用情境也有所差異。
          </Card>
          {/* Compare table — row-by-row appearance */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 22, overflow: "hidden", marginBottom: 20, ...tableHeader,
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  <th style={{ padding: "22px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26, textAlign: "left", color: C.muted, width: "18%" }}></th>
                  <th style={{ padding: "22px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 28, textAlign: "left", color: C.primary, width: "41%" }}>Vibe Coding</th>
                  <th style={{ padding: "22px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 28, textAlign: "left", color: C.text, width: "41%" }}>AI Coding</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["操作方式", "完全用自然語言描述，全程不碰程式碼", "主要靠 AI，必要時用一點技術知識介入引導"],
                  ["門檻",     "零基礎即可，會說話就能用",            "需要一些基礎概念，但不需要成為工程師"],
                  ["優勢",     "上手快、容易有成就感、適合簡單的小工具", "成果更精準、遇到問題有能力排除"],
                  ["限制",     "複雜需求難以精準達成，卡關時不容易解決", "需要投入一點學習時間"],
                  ["適合誰",   "初學者、想快速驗證創意的人",          "想穩定產出可用作品的人"],
                ].map(([label, vibe, ai], i) => (
                  <tr key={i} style={{ borderBottom: i < 4 ? `1px solid ${C.border}` : "none", ...rowStyles[i] }}>
                    <td style={{ padding: "20px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26, fontWeight: 700, color: C.text }}>{label}</td>
                    <td style={{ padding: "20px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26, color: C.primary, verticalAlign: "top" }}>{vibe}</td>
                    <td style={{ padding: "20px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26, color: "#cccccc", verticalAlign: "top" }}>{ai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 12 — Section 04: AI Coding 特性 (segment 5.2)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection04AITraits: React.FC = () => {
  const header = useFadeUp(15);
  const table  = useFadeUp(200);

  const CALLOUTS: Callout[] = [
    { from: 489, to: 689, sender: "有點基礎的學員", text: "所以學一點程式概念，AI就能更聽我的話？" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={78} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="04" title="Vibe Coding vs AI Coding：有什麼差別？" fadeStyle={header} />
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 22, overflow: "hidden", marginBottom: 20, ...table,
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  <th style={{ padding: "22px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 28, textAlign: "left", color: C.muted }}></th>
                  <th style={{ padding: "22px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 28, textAlign: "left", color: C.primary }}>Vibe Coding</th>
                  <th style={{ padding: "22px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 28, textAlign: "left", color: C.text }}>AI Coding</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["操作方式", "完全用自然語言描述，全程不碰程式碼", "主要靠 AI，必要時用一點技術知識介入引導"],
                  ["門檻",     "零基礎即可，會說話就能用",            "需要一些基礎概念，但不需要成為工程師"],
                  ["優勢",     "上手快、容易有成就感、適合簡單的小工具", "成果更精準、遇到問題有能力排除"],
                  ["限制",     "複雜需求難以精準達成，卡關時不容易解決", "需要投入一點學習時間"],
                  ["適合誰",   "初學者、想快速驗證創意的人",          "想穩定產出可用作品的人"],
                ].map(([label, vibe, ai], i) => (
                  <tr key={i} style={{ borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <td style={{ padding: "20px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26, fontWeight: 700, color: C.text }}>{label}</td>
                    <td style={{ padding: "20px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26, color: C.primary, verticalAlign: "top" }}>{vibe}</td>
                    <td style={{ padding: "20px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26, color: "#cccccc", verticalAlign: "top" }}>{ai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 13 — Section 04: 學習路徑 + Quiz (segment 5.3)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection04Path: React.FC = () => {
  const header = useFadeUp(15);
  const step1  = useFadeUp(140);
  const step2  = useFadeUp(920);
  const step3  = useFadeUp(1970);
  const quiz   = useFadeUp(2530);

  const CALLOUTS: Callout[] = [
    { from:  585, to:  835, sender: "緊張的學員",    text: "用嘴巴就能做出東西？！那我現在就想試試！" },
    { from: 1685, to: 1915, sender: "怕學程式的朋友", text: "看到一堆英文就頭皮發麻，這個說法我懂" },
    { from: 2585, to: 2835, sender: "學員",          text: "只要核心觀念，就能跟AI合作？我辦得到！" },
  ];

  const steps = [
    { num: "1", title: "從 Vibe Coding 開始", desc: "先體驗「用說的就能做出東西」的成就感，不用擔心技術細節，選一個你真的想解決的小需求開始玩。", style: step1 },
    { num: "2", title: "累積 AI Coding 的基礎知識", desc: "學習如何更精準地和 AI 溝通、排查錯誤、理解常用技術關鍵字，讓你的作品從「堪用」進化到「真的好用」。", style: step2 },
    { num: "3", title: "用 AI Coding 做更複雜的事", desc: "結合技術判斷和 AI 的生產力，做出能真正解決工作痛點、或是讓自己驕傲的作品。", style: step3 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={85} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="04" title="Vibe Coding vs AI Coding：有什麼差別？" fadeStyle={header} />

          {/* Path steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 20 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start", ...step.style }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 48, flexShrink: 0 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: C.primary,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700,
                    color: "#000000", flexShrink: 0,
                  }}>{step.num}</div>
                  {i < 2 && (
                    <div style={{ width: 2, flex: 1, background: C.border, margin: "4px auto 0", minHeight: 32 }} />
                  )}
                </div>
                <div style={{ paddingBottom: 28, flex: 1 }}>
                  <h3 style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6, color: C.text }}>{step.title}</h3>
                  <p style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24, color: C.muted, lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quiz box */}
          <div style={{
            border: "2px dashed rgba(255,209,102,0.3)", borderRadius: 16,
            padding: "28px 32px", marginBottom: 20,
            background: "rgba(255,209,102,0.03)", ...quiz,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700,
              color: C.yellow, letterSpacing: "0.08em",
              textTransform: "uppercase" as const, marginBottom: 14,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 6, height: 6, background: C.yellow, borderRadius: 1, boxShadow: "0 0 6px #ffd166" }} />
              想一想
            </div>
            <p style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", color: C.muted, fontSize: 26, lineHeight: 1.7, margin: 0 }}>
              如果你現在可以立刻用自然語言「描述出」一個小工具，你會描述什麼？
              <br />試著用一、兩句話說說看——不用管技術可不可行，先想想你<strong style={{ color: C.text }}>真的想要</strong>什麼。
            </p>
          </div>
        </div>
      </div>
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 14 — Takeaway (segment 6.1)
// ─────────────────────────────────────────────────────────────────────────────
const SceneTakeaway: React.FC = () => {
  const header = useFadeUp(15);
  const box    = useFadeUp(25);
  const item1  = useFadeUp(174);
  const item2  = useFadeUp(428);
  const item3  = useFadeUp(829);
  const item4  = useFadeUp(1065);
  const item5  = useFadeUp(1418);

  const CALLOUTS: Callout[] = [
    { from:  623, to:  873, sender: "完課的學員", text: "重複、易錯、要收集資料——我三個都中了！" },
    { from: 1823, to: 2073, sender: "學員",      text: "下一單元：哪個AI工具最適合新手？我等不及了！" },
  ];

  const items = [
    { text: "寫程式的本質是自動化：把有固定步驟的事外包給電腦執行。", style: item1 },
    { text: "重複性工作、容易出錯的流程、定期蒐集資訊，都是寫程式最能發揮的場景。", style: item2 },
    { text: "AI Coding 泛指任何借助 AI 產生程式碼的開發方式。", style: item3 },
    { text: "Vibe Coding 是完全用自然語言驅動 AI，不碰程式碼的極致入門體驗。", style: item4 },
    { text: "建議路徑：先 Vibe Coding 建立信心，再學習核心關鍵知識，進入 AI Coding。", style: item5 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={95} />
      <SceneScroller>
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="✦" title="本章重點整理" fadeStyle={header} />
          {/* Takeaway box */}
          <div style={{
            background: "linear-gradient(135deg, rgba(124,255,178,0.07), rgba(124,255,178,0.03))",
            border: "1px solid rgba(124,255,178,0.25)",
            borderRadius: 16, padding: 32, marginTop: 8, ...box,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700,
              color: C.primary, letterSpacing: "0.1em",
              textTransform: "uppercase" as const, marginBottom: 20,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 6, height: 6, background: C.primary, borderRadius: 1, boxShadow: "0 0 6px #7cffb2" }} />
              本章重點整理
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12, padding: 0, margin: 0, counterReset: "li" }}>
              {items.map((item, i) => (
                <li key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
                  fontSize: 36, color: C.text, lineHeight: 1.6, ...item.style,
                }}>
                  <div style={{
                    background: C.primary, color: "#000000",
                    fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700,
                    width: 22, height: 22, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 2,
                  }}>{i + 1}</div>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      </SceneScroller>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Scene map for first 9 segments (1.1 through 4.2)
// ─────────────────────────────────────────────────────────────────────────────
const SCENES_9 = [
  SceneHero,
  SceneSection01Card1,
  SceneSection01Analogy,
  SceneSection01Card2,
  SceneSection02Intro,
  SceneSection02Usecases,
  SceneSection02LeisureQuiz,
  SceneSection03AICoding,
  SceneSection03VibeCoding,
];

// Scene map for tail segments (5.1 through 6.1)
const SCENES_TAIL = [
  SceneSection04VibeTraits,
  SceneSection04AITraits,
  SceneSection04Path,
  SceneTakeaway,
];

export const FullVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* BGM — plays through the whole video */}
      <Audio src={staticFile("audio/course_background_music.wav")} volume={0.10} loop />

      {/* Segments 1.1 through 4.2 */}
      {SEG_9.map((seg, i) => {
        const SceneComponent = SCENES_9[i];
        return (
          <Sequence key={seg.id} from={SEG_9_STARTS[i]} durationInFrames={seg.frames}>
            <Audio src={staticFile(`audio/${seg.file}`)} volume={1.0} />
            <SceneComponent />
          </Sequence>
        );
      })}

      {/* 4.3a — narration up to "謝謝填寫的畫面" */}
      <Sequence from={F_43A_START} durationInFrames={865}>
        <Audio src={staticFile("audio/0-1_4.3a.wav")} volume={1.0} />
        <SceneSection03Analogy_A />
      </Sequence>

      {/* MP4 #1 — 旅遊偏好的表單頁面 demo */}
      <Sequence from={F_MP4_1_START} durationInFrames={1677}>
        <SceneMediaInsert src="travel-form-v1.mp4" />
      </Sequence>

      {/* 4.3b — narration about modifications */}
      <Sequence from={F_43B_START} durationInFrames={1083}>
        <Audio src={staticFile("audio/0-1_4.3b.wav")} volume={1.0} />
        <SceneSection03Analogy_B />
      </Sequence>

      {/* MP4 #2 — 旅遊偏好的表單頁面_改顏色 demo */}
      <Sequence from={F_MP4_2_START} durationInFrames={813}>
        <SceneMediaInsert src="travel-form-v2.mp4" />
      </Sequence>

      {/* 4.3c — concluding "就叫做 Vibe Coding" */}
      <Sequence from={F_43C_START} durationInFrames={240}>
        <Audio src={staticFile("audio/0-1_4.3c.wav")} volume={1.0} />
        <SceneSection03Analogy_C />
      </Sequence>

      {/* Segments 5.1 through 6.1 */}
      {TAIL_SEGS.map((seg, i) => {
        const SceneComponent = SCENES_TAIL[i];
        return (
          <Sequence key={seg.id} from={TAIL_STARTS[i]} durationInFrames={seg.frames}>
            <Audio src={staticFile(`audio/${seg.file}`)} volume={1.0} />
            <SceneComponent />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
