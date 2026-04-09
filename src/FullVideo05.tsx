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
  Easing,
  Img,
} from "remotion";

// ─────────────────────────────────────────────────────────────────────────────
// Design System
// ─────────────────────────────────────────────────────────────────────────────
const S = 2;

const C = {
  bg:           "#000000",
  surface:      "#0d0d0d",
  surface2:     "#111111",
  text:         "#ffffff",
  muted:        "#888888",
  primary:      "#7cffb2",
  border:       "rgba(124,255,178,0.14)",
  yellow:       "#ffd166",
  yellowBorder: "rgba(255,209,102,0.2)",
  yellowLight:  "rgba(255,209,102,0.08)",
  primaryLight: "rgba(124,255,178,0.07)",
  red:          "#ff6b6b",
  orange:       "#ff9f43",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const W = 3840;
const H = 2160;
const NAV_H      = 72  * S;  // 144px
const SUBTITLE_H = 160 * S;  // 320px
const CONTAINER_W = 1500 * S; // 3000px

// ─────────────────────────────────────────────────────────────────────────────
// SEG_STARTS — cumulative frame offsets (VTT last timestamp × 30)
// 1.1=2324 2.1=1060 3.1=2879 3.2=2725 4.1=2755 4.2=1936
// 4.3=2203 4.4=2092 4.5=1459 4.6=1743 5.1=1645 6.1=2935
// ─────────────────────────────────────────────────────────────────────────────
const SEGMENTS = [
  { id: "1.1", frames: 2324, file: "1-2_1.1-normalized.wav" },
  { id: "2.1", frames: 1060, file: "1-2_2.1-normalized.wav" },
  { id: "3.1", frames: 2879, file: "1-2_3.1-normalized.wav" },
  { id: "3.2", frames: 2725, file: "1-2_3.2-normalized.wav" },
  { id: "4.1", frames: 2755, file: "1-2_4.1-normalized.wav" },
  { id: "4.2", frames: 1936, file: "1-2_4.2-normalized.wav" },
  { id: "4.3", frames: 2203, file: "1-2_4.3-normalized.wav" },
  { id: "4.4", frames: 2092, file: "1-2_4.4-normalized.wav" },
  { id: "4.5", frames: 1459, file: "1-2_4.5-normalized.wav" },
  { id: "4.6", frames: 1743, file: "1-2_4.6-normalized.wav" },
  { id: "5.1", frames: 1645, file: "1-2_5.1-normalized.wav" },
  { id: "6.1", frames: 2935, file: "1-2_6.1-normalized.wav" },
] as const;

export const SEG_STARTS = [
  0,     // 1.1
  2324,  // 2.1
  3384,  // 3.1
  6263,  // 3.2
  8988,  // 4.1
  11743, // 4.2
  13679, // 4.3
  15882, // 4.4
  17974, // 4.5
  19433, // 4.6
  21176, // 5.1
  22821, // 6.1
];
export const TOTAL_FRAMES_05 = 25756;

// ─────────────────────────────────────────────────────────────────────────────
// Animation Hooks
// ─────────────────────────────────────────────────────────────────────────────
type AnimStyle = { opacity: number; transform: string };

function useFadeUp(startFrame: number): AnimStyle {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const progress = spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: Math.round(0.7 * fps) });
  const opacity = interpolate(f, [0, 0.35 * fps], [0, 1], clamp);
  const y = interpolate(progress, [0, 1], [14 * S, 0]);
  const scale = interpolate(progress, [0, 1], [0.97, 1]);
  return { opacity, transform: `translateY(${y}px) scale(${scale})` };
}

function useFadeUpHeader(startFrame: number): AnimStyle {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const progress = spring({ frame: f, fps, config: { damping: 20, stiffness: 200 } });
  const opacity = interpolate(f, [0, 0.3 * fps], [0, 1], clamp);
  const y = interpolate(progress, [0, 1], [10 * S, 0]);
  return { opacity, transform: `translateY(${y}px)` };
}

function useFadeUpItem(startFrame: number): AnimStyle {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const dur = Math.round(0.65 * fps);
  const progress = interpolate(f, [0, dur], [0, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(f, [0, 0.3 * fps], [0, 1], clamp);
  const y = interpolate(progress, [0, 1], [10 * S, 0]);
  return { opacity, transform: `translateY(${y}px)` };
}

function useFadeUpElastic(startFrame: number): AnimStyle {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const progress = spring({ frame: f, fps, config: { damping: 8 } });
  const opacity = interpolate(f, [0, 0.3 * fps], [0, 1], clamp);
  const y = interpolate(progress, [0, 1], [8 * S, 0]);
  const scale = interpolate(progress, [0, 1], [0.98, 1]);
  return { opacity, transform: `translateY(${y}px) scale(${scale})` };
}

function useAccentLine(startFrame: number): { width: string } {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const pct = spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: Math.round(0.8 * fps) });
  return { width: `${interpolate(pct, [0, 1], [0, 100], clamp)}%` };
}

// ─────────────────────────────────────────────────────────────────────────────
// SceneFade — 12f in, 12f out
// ─────────────────────────────────────────────────────────────────────────────
const SceneFade: React.FC<{ children: React.ReactNode; durationInFrames: number }> = ({
  children, durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const fadeIn  = interpolate(frame, [0, 12], [0, 1], clamp);
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], clamp);
  return (
    <div style={{ opacity: Math.min(fadeIn, fadeOut), height: "100%" }}>
      {children}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WordReveal
// ─────────────────────────────────────────────────────────────────────────────
const WordReveal: React.FC<{
  text: string;
  startFrame: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  style?: React.CSSProperties;
}> = ({ text, startFrame, fontSize = 36 * S, color = C.text, fontFamily = "'Noto Sans TC','PingFang TC',sans-serif", fontWeight = 700, style = {} }) => {
  const frame = useCurrentFrame();
  const words = text.split(/(\s+)/);
  let wordIndex = 0;
  return (
    <span style={{ display: "inline", fontFamily, fontSize, fontWeight, color, ...style }}>
      {words.map((word, i) => {
        if (/^\s+$/.test(word)) return <span key={i}>{word}</span>;
        const wf = wordIndex;
        wordIndex++;
        const startF = startFrame + wf * 4;
        const f = Math.max(0, frame - startF);
        const opacity = interpolate(f, [0, 8], [0, 1], clamp);
        const y = interpolate(f, [0, 8], [6 * S, 0], clamp);
        return (
          <span key={i} style={{ display: "inline-block", opacity, transform: `translateY(${y}px)` }}>{word}</span>
        );
      })}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BgOrbs
// ─────────────────────────────────────────────────────────────────────────────
const BgOrbs: React.FC = () => {
  const frame = useCurrentFrame();
  const bgAlpha = interpolate(frame, [0, 30], [0, 1], clamp);
  const pulse = 1 + 0.03 * Math.sin(frame / 90);
  return (
    <>
      <div style={{
        position: "absolute", top: -200 * S, right: -200 * S,
        width: 600 * S, height: 600 * S,
        background: `radial-gradient(circle, rgba(124,255,178,${0.07 * bgAlpha}) 0%, transparent 70%)`,
        transform: `scale(${pulse})`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -200 * S, left: -200 * S,
        width: 500 * S, height: 500 * S,
        background: `radial-gradient(circle, rgba(124,255,178,${0.04 * bgAlpha}) 0%, transparent 70%)`,
        transform: `scale(${1 + 0.02 * Math.sin(frame / 90 + 1)})`,
        pointerEvents: "none",
      }} />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProgressBar
// ─────────────────────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ progressPct?: number }> = ({ progressPct = 28 }) => {
  const frame = useCurrentFrame();
  const slideY = interpolate(frame, [0, 18], [-NAV_H, 0], clamp);
  return (
    <div style={{
      position: "absolute",
      top: slideY, left: 0, right: 0,
      zIndex: 100,
      background: "rgba(0,0,0,0.92)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: `1px solid ${C.border}`,
      padding: `${14 * S}px ${40 * S}px`,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "'Space Mono', monospace",
        fontSize: 20 * S,
        color: C.muted,
        letterSpacing: "0.05em",
        marginBottom: 8 * S,
      }}>
        <Img
          src={staticFile("aischool-logo.webp")}
          style={{ height: 22 * S, width: "auto", mixBlendMode: "screen", opacity: 0.9 }}
        />
        <span style={{ fontSize: 20 * S, color: C.muted }}>CH 1-2</span>
      </div>
      <div style={{ height: 3 * S, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
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
// SectionHeader
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ num: string; title: string; startFrame: number }> = ({
  num, title, startFrame,
}) => {
  const headerStyle = useFadeUpHeader(startFrame);
  const lineStyle = useAccentLine(startFrame + 8);
  return (
    <div style={{ marginBottom: 28 * S, ...headerStyle }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 * S }}>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 20 * S, color: C.primary,
          background: "rgba(124,255,178,0.1)",
          border: "1px solid rgba(124,255,178,0.3)",
          padding: `${6 * S}px ${16 * S}px`, borderRadius: 99,
          whiteSpace: "nowrap" as const,
          letterSpacing: "0.06em",
          boxShadow: "0 0 14px rgba(124,255,178,0.12)",
        }}>{num}</span>
        <h2 style={{
          fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
          fontSize: 44 * S, fontWeight: 800,
          letterSpacing: "-0.02em",
          color: C.text, margin: 0,
        }}>{title}</h2>
      </div>
      <div style={{
        height: 2 * S, background: C.primary,
        borderRadius: 99, marginTop: 10 * S,
        boxShadow: "0 0 10px rgba(124,255,178,0.4)",
        ...lineStyle,
      }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────
const Card: React.FC<{
  children: React.ReactNode;
  fadeStyle?: React.CSSProperties;
  marginBottom?: number;
}> = ({ children, fadeStyle = {}, marginBottom = 20 * S }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 22 * S, padding: `${26 * S}px ${36 * S}px`, marginBottom,
    ...fadeStyle,
  }}>
    <p style={{
      fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
      fontSize: 28 * S, color: C.text, lineHeight: 1.8, margin: 0,
    }}>
      {children}
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TipBox
// ─────────────────────────────────────────────────────────────────────────────
const TipBox: React.FC<{
  label?: string; children: React.ReactNode;
  fadeStyle?: React.CSSProperties; marginBottom?: number;
}> = ({ label = "範例", children, fadeStyle = {}, marginBottom = 20 * S }) => (
  <div style={{
    background: "rgba(124,255,178,0.05)",
    border: "1px solid rgba(124,255,178,0.22)",
    borderRadius: 16 * S, padding: `${20 * S}px ${28 * S}px`, marginBottom,
    ...fadeStyle,
  }}>
    <div style={{
      fontFamily: "'Space Mono', monospace", fontSize: 20 * S, fontWeight: 700,
      color: C.primary, letterSpacing: "0.08em",
      textTransform: "uppercase" as const, marginBottom: 10 * S,
      display: "flex", alignItems: "center", gap: 8 * S,
    }}>
      <div style={{ width: 6 * S, height: 6 * S, background: C.primary, borderRadius: "50%", boxShadow: "0 0 10px #7cffb2" }} />
      {label}
    </div>
    <p style={{
      fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
      fontSize: 26 * S, color: "#c8ffe0", lineHeight: 1.75, margin: 0,
    }}>
      {children}
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ElementBadge — 句型元素標籤（必填/加分）
// ─────────────────────────────────────────────────────────────────────────────
const ElementBadge: React.FC<{
  num: string; title: string; type: "required" | "bonus";
  fadeStyle?: React.CSSProperties;
}> = ({ num, title, type, fadeStyle = {} }) => {
  const isRequired = type === "required";
  const badgeColor = isRequired ? C.primary : C.yellow;
  const bgColor    = isRequired ? "rgba(124,255,178,0.08)" : "rgba(255,209,102,0.08)";
  const borderColor = isRequired ? "rgba(124,255,178,0.25)" : "rgba(255,209,102,0.25)";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 20 * S,
      background: bgColor, border: `1px solid ${borderColor}`,
      borderRadius: 14 * S, padding: `${16 * S}px ${28 * S}px`,
      marginBottom: 16 * S, ...fadeStyle,
    }}>
      <span style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 20 * S, fontWeight: 700,
        color: badgeColor,
        background: isRequired ? "rgba(124,255,178,0.15)" : "rgba(255,209,102,0.15)",
        border: `1px solid ${borderColor}`,
        borderRadius: 99,
        padding: `${4 * S}px ${12 * S}px`,
        whiteSpace: "nowrap" as const,
        letterSpacing: "0.06em",
      }}>{isRequired ? "必填" : "加分"} {num}</span>
      <span style={{
        fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
        fontSize: 32 * S, fontWeight: 800, color: badgeColor,
      }}>{title}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// iMessage Callout
// ─────────────────────────────────────────────────────────────────────────────
const NOTIF_W       = 420 * S;
const NOTIF_TOP     = 12  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLIDE_H = 150 * S;
const NOTIF_SLOT    = 200 * S;
const FADE_OUT_F    = 50;

type Callout = { from: number; to: number; sender: string; text: string };

const CalloutLayer: React.FC<{ callouts: Callout[] }> = ({ callouts }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {callouts.map((c, i) => (
      <CalloutCard key={i} c={c} allCallouts={callouts} />
    ))}
  </AbsoluteFill>
);

const CalloutCard: React.FC<{ c: Callout; allCallouts: Callout[] }> = ({ c, allCallouts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localF   = frame - c.from;
  const duration = c.to - c.from;
  const totalVisible = duration + FADE_OUT_F;

  if (localF < 0 || localF >= totalVisible) return null;

  let totalYPush = 0;
  for (const newer of allCallouts) {
    if (newer.from <= c.from) continue;
    if (frame < newer.from) continue;
    const pushF = frame - newer.from;
    const pushP = spring({ frame: pushF, fps, config: { damping: 22, stiffness: 120 } });
    totalYPush += NOTIF_SLOT * pushP;
  }

  const entryP = spring({ frame: localF, fps, config: { damping: 22, stiffness: 130 } });
  const slideY = interpolate(entryP, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);
  const opacity = interpolate(localF, [0, 10, duration, totalVisible], [0, 1, 1, 0], clamp);
  const stackDepth = totalYPush / NOTIF_SLOT;
  const depthAlpha = interpolate(stackDepth, [0, 1, 2], [1, 0.65, 0.35], clamp);

  const CHARS_PER_FRAME = 0.85;
  const charsVisible = interpolate(Math.max(0, localF - 14), [0, c.text.length / CHARS_PER_FRAME], [0, c.text.length], clamp);
  const displayText = c.text.slice(0, Math.floor(charsVisible));
  const cursor = localF % 20 < 10 && charsVisible < c.text.length ? "|" : "";

  const iconSize   = 52 * S;
  const fontBase   = 22 * S;
  const fontSender = 26 * S;
  const fontBody   = 26 * S;

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
        boxShadow: `0 ${8 * S}px ${40 * S}px rgba(0,0,0,0.6)`,
        padding: `${10 * S}px ${14 * S}px`,
        display: "flex",
        gap: 11 * S,
        alignItems: "flex-start",
      }}>
        <div style={{
          width: iconSize, height: iconSize,
          borderRadius: 9 * S,
          background: "linear-gradient(145deg, #3DDC6A 0%, #25A244 100%)",
          boxShadow: `0 ${2 * S}px ${10 * S}px rgba(52,199,89,0.45)`,
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
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
        <div style={{ flex: 1, minWidth: 0 }}>
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
          <div style={{
            fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif",
            fontSize: fontSender, fontWeight: 700,
            color: "rgba(255,255,255,0.92)", marginBottom: 2 * S,
            whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis",
          }}>{c.sender}</div>
          <div style={{
            fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif",
            fontSize: fontBody, fontWeight: 400,
            color: "rgba(255,255,255,0.60)", lineHeight: 1.45, minHeight: fontBody * 1.45,
          }}>{displayText}{cursor}</div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SceneWrap
// ─────────────────────────────────────────────────────────────────────────────
const SceneWrap: React.FC<{ children: React.ReactNode; scrollY?: number; progressPct?: number }> = ({
  children, scrollY = 0, progressPct = 28,
}) => (
  <AbsoluteFill style={{ backgroundColor: C.bg }}>
    <BgOrbs />
    <ProgressBar progressPct={progressPct} />
    <div style={{
      position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
      left: Math.round((W - CONTAINER_W) / 2), width: CONTAINER_W,
      overflow: "hidden", zIndex: 10,
    }}>
      <div style={{ paddingTop: 40 * S, transform: `translateY(-${scrollY}px)` }}>
        {children}
      </div>
    </div>
  </AbsoluteFill>
);

// ─────────────────────────────────────────────────────────────────────────────
// HighlightPulse
// ─────────────────────────────────────────────────────────────────────────────
const HighlightPulse: React.FC<{ text: string; startFrame: number; delay?: number; color?: string }> = ({
  text, startFrame, delay = 0, color = C.primary,
}) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame - delay);
  const scale = interpolate(spring({ frame: f, fps: 30, config: { damping: 12 } }), [0, 1], [0.9, 1]);
  const opacity = interpolate(f, [0, 12], [0, 1], clamp);
  const isHex = color.startsWith("#");
  const rgb = isHex ? (() => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `${r},${g},${b}`;
  })() : "124,255,178";
  const glow = interpolate(Math.sin(f / 15), [-1, 1], [0.4, 1]);
  return (
    <span style={{
      color, fontWeight: 700, opacity,
      transform: `scale(${scale})`, display: "inline-block",
      textShadow: `0 0 ${20 * glow}px rgba(${rgb},${glow * 0.8})`,
    }}>{text}</span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SVG Animations
// ─────────────────────────────────────────────────────────────────────────────

// GeniusRoomSVG — AI在房間裡的流程圖動畫
const GeniusRoomSVG: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const opacity = interpolate(f, [0, 20], [0, 1], clamp);

  // Draw steps: person → note → door → genius → answer
  const step1 = interpolate(f, [0, 15], [0, 1], clamp);
  const step2 = interpolate(f, [20, 35], [0, 1], clamp);
  const step3 = interpolate(f, [40, 55], [0, 1], clamp);
  const step4 = interpolate(f, [55, 70], [0, 1], clamp);
  const step5 = interpolate(f, [70, 85], [0, 1], clamp);
  const arrowDash1 = interpolate(f, [15, 35], [120, 0], clamp);
  const arrowDash2 = interpolate(f, [35, 55], [120, 0], clamp);
  const arrowDash3 = interpolate(f, [70, 90], [120, 0], clamp);

  if (f <= 0) return null;

  return (
    <div style={{ opacity, marginTop: 20 * S, display: "flex", justifyContent: "center" }}>
      <svg width={1400 * S} height={220 * S} viewBox={`0 0 1400 220`} style={{ overflow: "visible" }}>
        {/* Person */}
        <g opacity={step1}>
          <circle cx="80" cy="60" r="22" fill="none" stroke="#7cffb2" strokeWidth="3" />
          <line x1="80" y1="82" x2="80" y2="140" stroke="#7cffb2" strokeWidth="3" />
          <line x1="80" y1="100" x2="50" y2="120" stroke="#7cffb2" strokeWidth="3" />
          <line x1="80" y1="100" x2="110" y2="120" stroke="#7cffb2" strokeWidth="3" />
          <line x1="80" y1="140" x2="55" y2="175" stroke="#7cffb2" strokeWidth="3" />
          <line x1="80" y1="140" x2="105" y2="175" stroke="#7cffb2" strokeWidth="3" />
          <text x="80" y="205" textAnchor="middle" fill="#888" fontSize="28" fontFamily="'Space Mono',monospace">你</text>
        </g>
        {/* Arrow 1 */}
        <line x1="130" y1="110" x2="240" y2="110" stroke="#7cffb2" strokeWidth="3"
          strokeDasharray="120" strokeDashoffset={arrowDash1} />
        <polygon points="240,104 252,110 240,116" fill="#7cffb2" opacity={step2} />
        {/* Paper note */}
        <g opacity={step2}>
          <rect x="265" y="82" width="60" height="76" rx="6" fill="none" stroke="#7cffb2" strokeWidth="3" />
          <line x1="277" y1="100" x2="313" y2="100" stroke="#7cffb2" strokeWidth="2" opacity="0.6" />
          <line x1="277" y1="112" x2="313" y2="112" stroke="#7cffb2" strokeWidth="2" opacity="0.6" />
          <line x1="277" y1="124" x2="300" y2="124" stroke="#7cffb2" strokeWidth="2" opacity="0.6" />
          <text x="295" y="190" textAnchor="middle" fill="#888" fontSize="28" fontFamily="'Space Mono',monospace">紙條</text>
        </g>
        {/* Arrow 2 */}
        <line x1="325" y1="110" x2="420" y2="110" stroke="#7cffb2" strokeWidth="3"
          strokeDasharray="120" strokeDashoffset={arrowDash2} />
        <polygon points="420,104 432,110 420,116" fill="#7cffb2" opacity={step3} />
        {/* Door/room */}
        <g opacity={step3}>
          <rect x="445" y="60" width="90" height="120" rx="4" fill="none" stroke="#7cffb2" strokeWidth="3" />
          <rect x="445" y="60" width="45" height="120" rx="4" fill="rgba(124,255,178,0.06)" stroke="#7cffb2" strokeWidth="2" />
          <circle cx="488" cy="120" r="5" fill="#7cffb2" />
          <text x="490" y="210" textAnchor="middle" fill="#888" fontSize="28" fontFamily="'Space Mono',monospace">門縫</text>
        </g>
        {/* Genius in room */}
        <g opacity={step4}>
          <circle cx="600" cy="60" r="22" fill="none" stroke="#7cffb2" strokeWidth="3" />
          <text x="600" y="70" textAnchor="middle" fill="#7cffb2" fontSize="24">★</text>
          <line x1="600" y1="82" x2="600" y2="140" stroke="#7cffb2" strokeWidth="3" />
          <line x1="600" y1="100" x2="570" y2="120" stroke="#7cffb2" strokeWidth="3" />
          <line x1="600" y1="100" x2="630" y2="120" stroke="#7cffb2" strokeWidth="3" />
          <line x1="600" y1="140" x2="575" y2="175" stroke="#7cffb2" strokeWidth="3" />
          <line x1="600" y1="140" x2="625" y2="175" stroke="#7cffb2" strokeWidth="3" />
          <text x="600" y="210" textAnchor="middle" fill="#7cffb2" fontSize="32" fontFamily="'Space Mono',monospace">天才</text>
        </g>
        {/* Return arrow */}
        <path d="M 640 100 Q 800 40 960 100" fill="none" stroke="#7cffb2" strokeWidth="3"
          strokeDasharray="350" strokeDashoffset={arrowDash3} />
        <polygon points="960,94 972,100 960,106" fill="#7cffb2" opacity={step5} />
        {/* Answer */}
        <g opacity={step5}>
          <rect x="980" y="60" width="110" height="90" rx="14" fill="rgba(124,255,178,0.1)" stroke="#7cffb2" strokeWidth="3" />
          <text x="1035" y="115" textAnchor="middle" fill="#7cffb2" fontSize="40" fontFamily="'Noto Sans TC',sans-serif">答案</text>
          <text x="1035" y="195" textAnchor="middle" fill="#888" fontSize="28" fontFamily="'Space Mono',monospace">回傳</text>
        </g>
      </svg>
    </div>
  );
};

// ComparisonDiagramSVG — 模糊 vs 清楚指令
const ComparisonDiagramSVG: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const leftOpacity  = interpolate(f, [0, 20], [0, 1], clamp);
  const rightOpacity = interpolate(f, [30, 50], [0, 1], clamp);
  const dividerH     = interpolate(f, [20, 40], [0, 200], clamp);

  if (f <= 0) return null;

  return (
    <div style={{ display: "flex", gap: 40 * S, marginTop: 20 * S, marginBottom: 20 * S }}>
      {/* Fuzzy side */}
      <div style={{
        flex: 1, opacity: leftOpacity,
        background: "rgba(255,107,107,0.06)",
        border: "1px solid rgba(255,107,107,0.25)",
        borderRadius: 18 * S,
        padding: `${20 * S}px ${28 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 18 * S, color: C.red,
          marginBottom: 16 * S,
          letterSpacing: "0.06em",
        }}>❌ 模糊指令</div>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 12 * S }}>
          {["報名表格式?", "有幾份?", "放哪裡?", "重複怎麼定義?", "用哪欄判斷?", "放在哪裡?"].map((q, i) => (
            <span key={i} style={{
              background: "rgba(255,107,107,0.12)",
              border: "1px solid rgba(255,107,107,0.3)",
              borderRadius: 99,
              padding: `${6 * S}px ${14 * S}px`,
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 22 * S, color: C.red,
              opacity: interpolate(f, [i * 6, i * 6 + 12], [0, 1], clamp),
            }}>?? {q}</span>
          ))}
        </div>
      </div>
      {/* Divider */}
      <div style={{
        width: 3 * S, alignSelf: "center",
        height: `${dividerH}px`,
        background: `linear-gradient(to bottom, transparent, ${C.primary}, transparent)`,
        borderRadius: 99,
        flexShrink: 0,
      }} />
      {/* Clear side */}
      <div style={{
        flex: 1, opacity: rightOpacity,
        background: C.primaryLight,
        border: `1px solid ${C.border}`,
        borderRadius: 18 * S,
        padding: `${20 * S}px ${28 * S}px`,
        boxShadow: "0 0 30px rgba(124,255,178,0.1)",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 18 * S, color: C.primary,
          marginBottom: 16 * S,
          letterSpacing: "0.06em",
        }}>✅ 清楚指令</div>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 * S }}>
          {[
            { label: "格式", val: "Google 試算表 × 3份" },
            { label: "重複判斷", val: "以 Email 為依據" },
            { label: "輸出", val: "新 Google 試算表" },
            { label: "工具", val: "Google Apps Script" },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", gap: 12 * S, alignItems: "center",
              opacity: interpolate(f, [30 + i * 6, 30 + i * 6 + 12], [0, 1], clamp),
            }}>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 20 * S, color: C.primary,
                background: "rgba(124,255,178,0.12)",
                borderRadius: 99, padding: `${4 * S}px ${12 * S}px`,
                whiteSpace: "nowrap" as const,
              }}>{item.label}</span>
              <span style={{
                fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                fontSize: 24 * S, color: C.text,
              }}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// IconBurstSVG — AI腦中問號爆發（緊湊 Motion Graphics 格式）
const IconBurstSVG: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);

  const questions = [
    "報名表格式?", "Google試算表?", "還是Excel?",
    "有幾份?", "放在哪裡?", "重複怎麼定義?",
  ];

  if (f <= 0) return null;

  return (
    <div style={{
      display: "flex", flexWrap: "wrap" as const,
      gap: 16 * S, marginTop: 16 * S, marginBottom: 16 * S,
    }}>
      {questions.map((q, i) => {
        const qOpacity = interpolate(f, [i * 8, i * 8 + 15], [0, 1], clamp);
        const qY = interpolate(
          spring({ frame: Math.max(0, f - i * 8), fps: 30, config: { damping: 14 } }),
          [0, 1], [20 * S, 0]
        );
        return (
          <div key={i} style={{
            opacity: qOpacity,
            transform: `translateY(${qY}px)`,
            background: "rgba(255,107,107,0.12)",
            border: "1px solid rgba(255,107,107,0.35)",
            borderRadius: 99,
            padding: `${10 * S}px ${22 * S}px`,
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 24 * S,
            color: C.red,
            whiteSpace: "nowrap" as const,
          }}>?? {q}</div>
        );
      })}
    </div>
  );
};

// HighlightDiagramSVG — 三元素框線高亮標注
const HighlightDiagramSVG: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  if (f <= 0) return null;

  const items = [
    { label: "角色", val: "策劃講座的人", icon: "👤" },
    { label: "任務", val: "辦活動 × 收報名", icon: "📋" },
    { label: "工具", val: "Google 試算表", icon: "📊" },
  ];

  return (
    <div style={{
      display: "flex", gap: 24 * S, marginTop: 20 * S,
      opacity: interpolate(f, [0, 15], [0, 1], clamp),
    }}>
      {items.map((item, i) => {
        const itemOpacity = interpolate(f, [i * 15, i * 15 + 20], [0, 1], clamp);
        const borderW = interpolate(f, [i * 15, i * 15 + 25], [0, 3], clamp);
        return (
          <div key={i} style={{
            flex: 1,
            background: C.primaryLight,
            border: `${borderW * S}px solid ${C.primary}`,
            borderRadius: 16 * S,
            padding: `${20 * S}px ${24 * S}px`,
            opacity: itemOpacity,
            boxShadow: "0 0 20px rgba(124,255,178,0.15)",
          }}>
            <div style={{ fontSize: 36 * S, marginBottom: 10 * S }}>{item.icon}</div>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 20 * S, color: C.primary,
              letterSpacing: "0.06em", marginBottom: 8 * S,
            }}>{item.label}</div>
            <div style={{
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 26 * S, color: C.text, fontWeight: 700,
            }}>{item.val}</div>
          </div>
        );
      })}
    </div>
  );
};

// PainFlowSVG — 痛點流程圖
const PainFlowSVG: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  if (f <= 0) return null;

  const nodes = [
    { label: "重複報名", color: C.red, icon: "⚠" },
    { label: "手動逐一篩選", color: C.yellow, icon: "😓" },
    { label: "人工失誤", color: C.red, icon: "❌" },
  ];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 0,
      marginTop: 20 * S, justifyContent: "center",
    }}>
      {nodes.map((node, i) => {
        const nodeF  = interpolate(f, [i * 18, i * 18 + 20], [0, 1], clamp);
        const arrowF = interpolate(f, [i * 18 + 10, i * 18 + 30], [0, 1], clamp);
        const isFlashing = node.label === "手動逐一篩選";
        const flashAlpha = isFlashing
          ? 0.6 + 0.4 * Math.abs(Math.sin(f / 12))
          : 1;
        return (
          <React.Fragment key={i}>
            <div style={{
              background: node.color === C.red ? "rgba(255,107,107,0.08)" : "rgba(255,209,102,0.08)",
              border: `2px solid ${node.color}`,
              borderRadius: 16 * S,
              padding: `${20 * S}px ${28 * S}px`,
              opacity: nodeF * flashAlpha,
              textAlign: "center" as const,
              minWidth: 200 * S,
              transform: `scale(${nodeF})`,
            }}>
              <div style={{ fontSize: 36 * S, marginBottom: 8 * S }}>{node.icon}</div>
              <div style={{
                fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                fontSize: 26 * S, fontWeight: 800,
                color: node.color,
              }}>{node.label}</div>
            </div>
            {i < nodes.length - 1 && (
              <div style={{
                width: 60 * S, display: "flex", alignItems: "center", justifyContent: "center",
                opacity: arrowF,
              }}>
                <svg width={60 * S} height={20 * S} viewBox="0 0 60 20">
                  <line x1="0" y1="10" x2="48" y2="10" stroke="#7cffb2" strokeWidth="3"
                    strokeDasharray={`${60 * arrowF * 2}`} />
                  <polygon points="48,5 60,10 48,15" fill="#7cffb2" opacity={arrowF} />
                </svg>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ExpectFlowSVG — 期待流程圖
const ExpectFlowSVG: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  if (f <= 0) return null;

  const nodes = [
    { label: "多份報名表", icon: "📑", sub: "三個管道" },
    { label: "自動去重", icon: "⚙", sub: "Email 判重" },
    { label: "完整名單", icon: "✅", sub: "新 Google 試算表" },
  ];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 0,
      marginTop: 20 * S, justifyContent: "center",
    }}>
      {nodes.map((node, i) => {
        const nodeF  = interpolate(f, [i * 18, i * 18 + 20], [0, 1], clamp);
        const arrowF = interpolate(f, [i * 18 + 10, i * 18 + 30], [0, 1], clamp);
        return (
          <React.Fragment key={i}>
            <div style={{
              background: C.primaryLight,
              border: `2px solid ${C.primary}`,
              borderRadius: 16 * S,
              padding: `${20 * S}px ${28 * S}px`,
              opacity: nodeF,
              textAlign: "center" as const,
              minWidth: 220 * S,
              transform: `scale(${nodeF})`,
              boxShadow: "0 0 20px rgba(124,255,178,0.15)",
            }}>
              <div style={{ fontSize: 36 * S, marginBottom: 8 * S }}>{node.icon}</div>
              <div style={{
                fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                fontSize: 26 * S, fontWeight: 800, color: C.primary,
                marginBottom: 4 * S,
              }}>{node.label}</div>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 20 * S, color: C.muted,
              }}>{node.sub}</div>
            </div>
            {i < nodes.length - 1 && (
              <div style={{
                width: 60 * S, display: "flex", alignItems: "center", justifyContent: "center",
                opacity: arrowF,
              }}>
                <svg width={60 * S} height={20 * S} viewBox="0 0 60 20">
                  <line x1="0" y1="10" x2="48" y2="10" stroke="#7cffb2" strokeWidth="3"
                    strokeDasharray={`${60 * arrowF * 2}`} />
                  <polygon points="48,5 60,10 48,15" fill="#7cffb2" opacity={arrowF} />
                </svg>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// SolutionComparisonSVG — 指定解法 vs 未指定
const SolutionComparisonSVG: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const leftOpacity  = interpolate(f, [0, 20], [0, 1], clamp);
  const rightOpacity = interpolate(f, [20, 40], [0, 1], clamp);
  if (f <= 0) return null;

  return (
    <div style={{ display: "flex", gap: 40 * S, marginTop: 20 * S }}>
      <div style={{
        flex: 1, opacity: leftOpacity,
        background: "rgba(255,107,107,0.06)",
        border: "1px solid rgba(255,107,107,0.25)",
        borderRadius: 18 * S,
        padding: `${24 * S}px ${28 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 18 * S, color: C.red, marginBottom: 16 * S,
        }}>❌ 未指定解法</div>
        <div style={{ fontSize: 50 * S, marginBottom: 12 * S }}>❓</div>
        <div style={{
          fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
          fontSize: 24 * S, color: "#ff9999", lineHeight: 1.6,
        }}>AI 可能叫你安裝<br />陌生工具⋯</div>
      </div>
      <div style={{
        flex: 1, opacity: rightOpacity,
        background: C.primaryLight,
        border: `1px solid ${C.border}`,
        borderRadius: 18 * S,
        padding: `${24 * S}px ${28 * S}px`,
        boxShadow: "0 0 30px rgba(124,255,178,0.1)",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 18 * S, color: C.primary, marginBottom: 16 * S,
        }}>✅ 指定解法</div>
        <div style={{ fontSize: 50 * S, marginBottom: 12 * S }}>⚙️</div>
        <div style={{
          fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
          fontSize: 24 * S, color: "#c8ffe0", lineHeight: 1.6,
        }}>Google Apps Script<br />熟悉 ✓ 可用 ✓</div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 1.1 — Opening / 開場白
// VTT 1.1 key: 48.06s=1442f → GeniusRoomSVG trigger
// ─────────────────────────────────────────────────────────────────────────────
const Scene11Opening: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const card1Style  = useFadeUp(20);
  const card2Style  = useFadeUp(200);
  const quoteStyle  = useFadeUpElastic(714);

  // 1.1 callouts
  const callouts: Callout[] = [
    { from: 339,  to: 600,  sender: "講師", text: "把腦中模糊的想法，變成 AI 看得懂的指令" },
    { from: 1762, to: 2050, sender: "講師", text: "你塞進門縫的那張紙條，決定了天才能幫你做什麼" },
  ];

  const scrollY = interpolate(frame, [1300, 1700], [0, 200 * S], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={28} scrollY={scrollY}>
        {/* Hero */}
        <div style={{ paddingTop: 20 * S, textAlign: "center" as const, marginBottom: 30 * S }}>
          <WordReveal
            text="CH 1-2"
            startFrame={5}
            fontSize={18 * S}
            color={C.primary}
            fontFamily="'Space Mono', monospace"
            fontWeight={700}
            style={{ letterSpacing: "0.15em", display: "block", marginBottom: 16 * S }}
          />
          <WordReveal
            text="萬用句型"
            startFrame={20}
            fontSize={64 * S}
            fontWeight={900}
            style={{ letterSpacing: "-0.03em", display: "block", marginBottom: 8 * S, lineHeight: 1.1 }}
          />
          <WordReveal
            text="跟 AI 講到累，用這招一次過"
            startFrame={50}
            fontSize={30 * S}
            color={C.primary}
            fontWeight={700}
            style={{ display: "block", marginBottom: 40 * S }}
          />
        </div>

        <Card fadeStyle={card1Style}>
          需求分析最重要的任務：把你腦中<strong style={{ color: C.primary }}>模糊的想法</strong>，
          變成 AI <strong style={{ color: C.primary }}>真正看得懂的指令</strong>。
          <br /><br />
          人跟人溝通有表情、語氣、肢體語言輔助；
          但你跟 AI 溝通，<strong style={{ color: C.text }}>百分之百只靠文字</strong>。
          你沒說的，它完全不知道。
        </Card>

        {/* 房間裡天才的比喻 */}
        <div style={{ ...card2Style, marginBottom: 20 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 20 * S, color: C.primary,
            letterSpacing: "0.1em", textTransform: "uppercase" as const,
            marginBottom: 12 * S,
            display: "flex", alignItems: "center", gap: 8 * S,
          }}>
            <div style={{ width: 6 * S, height: 6 * S, background: C.primary, borderRadius: "50%", boxShadow: "0 0 10px #7cffb2" }} />
            房間裡的天才
          </div>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 28 * S, color: C.text, lineHeight: 1.8, margin: 0,
          }}>
            AI 就像<strong style={{ color: C.primary }}>被關在房間裡的小天才</strong>——
            能力極強，但和你唯一的溝通方式，
            就是從<strong style={{ color: C.primary }}>門縫塞紙條</strong>。
          </p>
        </div>

        {/* Quote — VTT 43.66s=1310f */}
        <div style={{
          textAlign: "center" as const,
          marginTop: 24 * S, marginBottom: 24 * S,
          ...quoteStyle,
        }}>
          <span style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 40 * S, fontWeight: 900,
            color: C.primary,
            letterSpacing: "-0.01em",
            textShadow: "0 0 30px rgba(124,255,178,0.4)",
          }}>"你塞進去的那張紙條，決定了天才能幫你做到什麼"</span>
        </div>

        {/* SVG flow diagram — VTT 48.06s=1442f */}
        <GeniusRoomSVG startFrame={1442} />

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 2.1 — 精準下指令的兩大重點
// VTT 2.1: 4.14s=124f 整理, 7.46s=224f 表達
// ─────────────────────────────────────────────────────────────────────────────
const Scene21TwoPoints: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const cardStyle    = useFadeUp(20);
  const point1Style  = useFadeUpItem(124);
  const point2Style  = useFadeUpItem(224);
  const bridgeStyle  = useFadeUp(631);
  const sentenceStyle = useFadeUpElastic(867);

  const callouts: Callout[] = [
    { from: 82,  to: 300, sender: "講師", text: "先整理想法，再翻譯成 AI 的語言" },
    { from: 867, to: 1060, sender: "講師", text: "萬用句型：一個結構同時解決兩件事" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={34}>
        <SectionHeader num="02" title="精準下指令的兩大重點" startFrame={5} />
        <Card fadeStyle={cardStyle}>
          想做到精準下指令，有兩個大重點：
        </Card>

        {/* Point 1 — 整理 */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 24 * S,
          background: C.primaryLight, border: `1px solid ${C.border}`,
          borderRadius: 20 * S, padding: `${24 * S}px ${32 * S}px`,
          marginBottom: 20 * S, ...point1Style,
        }}>
          <div style={{
            width: 56 * S, height: 56 * S, borderRadius: "50%",
            background: C.primary, display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
            boxShadow: "0 0 20px rgba(124,255,178,0.4)",
          }}>
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 20 * S, fontWeight: 700, color: C.bg,
            }}>01</span>
          </div>
          <div>
            <div style={{
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 34 * S, fontWeight: 900, color: C.primary,
              marginBottom: 8 * S,
            }}>整理</div>
            <div style={{
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 26 * S, color: C.muted, lineHeight: 1.7,
            }}>把自己的想法整理清楚——釐清你<strong style={{ color: C.text }}>真正想要的是什麼</strong>、邊界在哪裡</div>
          </div>
        </div>

        {/* Point 2 — 表達 */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 24 * S,
          background: C.primaryLight, border: `1px solid ${C.border}`,
          borderRadius: 20 * S, padding: `${24 * S}px ${32 * S}px`,
          marginBottom: 20 * S, ...point2Style,
        }}>
          <div style={{
            width: 56 * S, height: 56 * S, borderRadius: "50%",
            background: C.primary, display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
            boxShadow: "0 0 20px rgba(124,255,178,0.4)",
          }}>
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 20 * S, fontWeight: 700, color: C.bg,
            }}>02</span>
          </div>
          <div>
            <div style={{
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 34 * S, fontWeight: 900, color: C.primary,
              marginBottom: 8 * S,
            }}>表達</div>
            <div style={{
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 26 * S, color: C.muted, lineHeight: 1.7,
            }}>把整理好的想法，<strong style={{ color: C.text }}>翻譯成 AI 能理解的語言</strong></div>
          </div>
        </div>

        {/* Bridge */}
        <div style={{
          textAlign: "center" as const, marginTop: 20 * S, ...bridgeStyle,
        }}>
          <span style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 26 * S, color: C.muted,
          }}>這兩件事，可以用<strong style={{ color: C.text }}>同一個結構</strong>一起解決 →</span>
        </div>

        {/* Sentence badge */}
        <div style={{
          marginTop: 20 * S, textAlign: "center" as const, ...sentenceStyle,
        }}>
          <div style={{
            display: "inline-block",
            background: C.primary,
            borderRadius: 99,
            padding: `${14 * S}px ${40 * S}px`,
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 36 * S, fontWeight: 900,
            color: C.bg,
            boxShadow: "0 0 30px rgba(124,255,178,0.5)",
          }}>萬用句型</div>
        </div>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3.1 — 模糊指令 vs 清楚指令
// VTT 3.1 key: 4.56s=137f → comparison_diagram, 28.2s=846f → icon_burst
// ─────────────────────────────────────────────────────────────────────────────
const Scene31FuzzyCmd: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const cardStyle    = useFadeUp(20);
  const scenarioStyle = useFadeUpItem(456);
  const commandStyle  = useFadeUpElastic(600);
  const fatigue1Style = useFadeUpItem(2053);
  const fatigue2Style = useFadeUpItem(2200);

  const callouts: Callout[] = [
    { from: 456,  to: 700,  sender: "講師", text: "你直接告訴 AI：把這幾份報名表合併" },
    { from: 1580, to: 1900, sender: "講師", text: "AI 猜不到，就只能亂猜——猜錯了就要反覆修正" },
  ];

  const scrollY = interpolate(frame, [1600, 2200], [0, 400 * S], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={42} scrollY={scrollY}>
        <SectionHeader num="03" title="模糊指令 vs 清楚指令" startFrame={5} />

        {/* Comparison diagram — VTT 4.56s=137f */}
        <ComparisonDiagramSVG startFrame={137} />

        <Card fadeStyle={cardStyle} marginBottom={20 * S}>
          在介紹萬用句型之前，先來感受一下——
          <br />
          模糊指令 vs 清楚指令，AI 給出來的結果差距有多大？
        </Card>

        {/* Scenario */}
        <div style={{
          background: C.surface2, border: `1px solid rgba(255,209,102,0.2)`,
          borderRadius: 16 * S, padding: `${20 * S}px ${28 * S}px`,
          marginBottom: 20 * S, ...scenarioStyle,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
            color: C.yellow, letterSpacing: "0.08em", marginBottom: 10 * S,
          }}>情境假設</div>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 26 * S, color: C.text, lineHeight: 1.7, margin: 0,
          }}>
            你想做一個<strong style={{ color: C.text }}>自動整合多份報名表</strong>的程式，
            然後直接跟 AI 說：
          </p>
        </div>

        {/* Fuzzy command */}
        <div style={{
          background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.25)",
          borderRadius: 16 * S, padding: `${24 * S}px ${32 * S}px`,
          marginBottom: 20 * S, ...commandStyle,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.red, marginBottom: 12 * S,
          }}>❌ 模糊指令</div>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 30 * S, color: "#ffaaaa", lineHeight: 1.6, margin: 0,
            fontWeight: 700,
          }}>「我要把這幾份報名表合併起來，要怎麼做？」</p>
        </div>

        {/* Icon burst — VTT 28.2s=846f */}
        <div style={{
          fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
          fontSize: 26 * S, color: C.muted,
          marginBottom: 8 * S,
          opacity: interpolate(frame, [820, 846], [0, 1], clamp),
        }}>AI 收到這個問題，腦中會冒出一大堆問號：</div>
        <IconBurstSVG startFrame={846} />

        {/* Result */}
        <div style={{ marginTop: 20 * S, ...fatigue1Style }}>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 26 * S, color: C.muted, lineHeight: 1.7,
          }}>
            AI 猜不到，就只能<strong style={{ color: C.red }}>亂猜</strong>。
            猜錯了你再修正，修正後又猜錯，來來回回個十幾次⋯
          </p>
        </div>

        <div style={fatigue2Style}>
          <div style={{
            background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.2)",
            borderRadius: 14 * S, padding: `${16 * S}px ${24 * S}px`,
          }}>
            <p style={{
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 26 * S, color: C.red, lineHeight: 1.6, margin: 0,
            }}>
              最後可能你們雙方都累到不行，結果還是不如預期——
              這是很多人跟 AI 溝通時最常遇到的挫折。
            </p>
          </div>
        </div>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3.2 — 清楚指令長這樣
// VTT 3.2 key: 18.26s=548f → 三張報名表, 68.3s=2049f → 合併表+重複記錄
// ─────────────────────────────────────────────────────────────────────────────
const Scene32ClearCmd: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const cardStyle  = useFadeUp(20);
  const cmdStyle   = useFadeUpElastic(60);
  const concStyle  = useFadeUp(1700);

  const callouts: Callout[] = [
    { from: 60,   to: 400,  sender: "講師", text: "同樣需求，換個方式說——所有問號提前回答" },
    { from: 1989, to: 2300, sender: "講師", text: "AI 收到的是完整任務說明，直接產出，不需要通靈" },
  ];

  const scrollY = interpolate(frame, [1600, 2400], [0, 600 * S], clamp);

  // Three sheet images — VTT 18.26s=548f
  const sheet1Style = useFadeUpItem(548);
  const sheet2Style = useFadeUpItem(570);
  const sheet3Style = useFadeUpItem(592);
  // Two merged images — VTT 68.3s=2049f
  const merged1Style = useFadeUpItem(2049);
  const merged2Style = useFadeUpItem(2071);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={46} scrollY={scrollY}>
        <SectionHeader num="03" title="清楚指令長這樣" startFrame={5} />
        <Card fadeStyle={cardStyle}>
          同樣的需求，用<strong style={{ color: C.primary }}>更精準、更清楚</strong>的方式來下指令：
        </Card>

        {/* Clear command block */}
        <div style={{
          background: C.primaryLight, border: `1px solid ${C.border}`,
          borderRadius: 18 * S, padding: `${24 * S}px ${32 * S}px`,
          marginBottom: 20 * S, ...cmdStyle,
          boxShadow: "0 0 30px rgba(124,255,178,0.1)",
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
            color: C.primary, marginBottom: 14 * S,
          }}>✅ 清楚指令</div>
          {[
            { label: "現況", text: "我是一個講座策劃人員，活動結束後會收到三個不同管道各自匯出的 Google 試算表，欄位命名不一致。" },
            { label: "痛點", text: "有些人透過多個管道重複報名，造成重複名單。手動去重費時，容易不注意就刪錯或漏掉。" },
            { label: "期待", text: "以 Email 作為判斷重複的依據，自動篩選重複名單，合併成一份完整名單，產出新的 Google 試算表。" },
            { label: "解法", text: "請使用 Google Apps Script 實作。" },
          ].map((item, i) => {
            const itemOpacity = interpolate(frame, [60 + i * 30, 60 + i * 30 + 20], [0, 1], clamp);
            return (
              <div key={i} style={{ marginBottom: 14 * S, opacity: itemOpacity }}>
                <span style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 20 * S, color: C.primary,
                  background: "rgba(124,255,178,0.12)",
                  border: `1px solid rgba(124,255,178,0.3)`,
                  borderRadius: 6 * S,
                  padding: `${3 * S}px ${10 * S}px`,
                  marginRight: 12 * S,
                  verticalAlign: "middle",
                }}>{item.label}</span>
                <span style={{
                  fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                  fontSize: 26 * S, color: C.text, lineHeight: 1.7,
                }}>{item.text}</span>
              </div>
            );
          })}
        </div>

        {/* Three registration sheets — 18.26s=548f */}
        <div style={{
          marginBottom: 20 * S,
          opacity: interpolate(frame, [520, 548], [0, 1], clamp),
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
            color: C.muted, marginBottom: 12 * S,
          }}>三份報名表（三個管道）</div>
          {/* Row 1: Sheet A + B */}
          <div style={{ display: "flex", gap: 20 * S, marginBottom: 16 * S }}>
            {[{ file: "活動報名表A.png", fadeStyle: sheet1Style, label: "管道 1" },
              { file: "活動報名表B.png", fadeStyle: sheet2Style, label: "管道 2" }].map(({ file, fadeStyle, label }) => (
              <div key={file} style={{ flex: 1, ...fadeStyle }}>
                <Img
                  src={staticFile(`assets/1-2/${file}`)}
                  style={{ width: "100%", borderRadius: 12 * S, border: `1px solid ${C.border}` }}
                />
                <div style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18 * S, color: C.muted,
                  textAlign: "center" as const, marginTop: 10 * S,
                }}>{label}</div>
              </div>
            ))}
          </div>
          {/* Row 2: Sheet C centred at 50% width */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: "50%", ...sheet3Style }}>
              <Img
                src={staticFile("assets/1-2/活動報名表C.png")}
                style={{ width: "100%", borderRadius: 12 * S, border: `1px solid ${C.border}` }}
              />
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 18 * S, color: C.muted,
                textAlign: "center" as const, marginTop: 10 * S,
              }}>管道 3</div>
            </div>
          </div>
        </div>

        {/* Conclusion text */}
        <div style={{ ...concStyle, marginBottom: 20 * S }}>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 26 * S, color: C.muted, lineHeight: 1.7, margin: 0,
          }}>
            你會發現，第二個版本裡，
            <strong style={{ color: C.text }}>所有 AI 可能會出現的問題，都被你提前回答了</strong>。
            AI 收到的是完整任務說明，直接產出，不需要通靈。
          </p>
        </div>

      </SceneWrap>

      {/* 合併後的成果 overlay — 68.3s=2049f
          Positioned outside SceneWrap to avoid overflow:hidden + subtitle clipping.
          Covers safe zone (NAV_H → H-SUBTITLE_H) as a full-area result reveal. */}
      <div style={{
        position: "absolute",
        top: NAV_H, left: 0, right: 0,
        height: H - NAV_H - SUBTITLE_H,
        background: C.bg,
        display: "flex", flexDirection: "column" as const,
        alignItems: "center", justifyContent: "center",
        padding: `${24 * S}px ${80 * S}px`,
        opacity: interpolate(frame, [2020, 2049], [0, 1], clamp),
        zIndex: 15,
        pointerEvents: "none" as const,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
          color: C.primary, marginBottom: 20 * S,
          letterSpacing: "0.08em",
        }}>✅ 合併後的成果</div>
        <div style={{ display: "flex", gap: 32 * S, width: "100%", flex: 1, minHeight: 0 }}>
          {([
            { file: "合併報名表.png", label: "合併名單", fadeStyle: merged1Style },
            { file: "重複報名紀錄.png", label: "重複記錄", fadeStyle: merged2Style },
          ] as Array<{ file: string; label: string; fadeStyle: React.CSSProperties }>).map((item) => (
            <div key={item.file} style={{ flex: 1, display: "flex", flexDirection: "column" as const, minHeight: 0, ...item.fadeStyle }}>
              <Img
                src={staticFile(`assets/1-2/${item.file}`)}
                style={{
                  width: "100%", flex: 1, minHeight: 0,
                  objectFit: "contain" as const, objectPosition: "top center",
                  borderRadius: 16 * S,
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 0 40px rgba(124,255,178,0.1)",
                }}
              />
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 20 * S, color: C.muted,
                textAlign: "center" as const, marginTop: 12 * S,
                flexShrink: 0,
              }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4.1 — 核心元素一：現況
// VTT 4.1 key: 11.4s=342f → 六個元素概覽, 69.42s=2083f → highlight_diagram
// ─────────────────────────────────────────────────────────────────────────────
const Scene41Status: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const overviewStyle = useFadeUp(342);
  const elementStyle  = useFadeUp(553);
  const card1Style    = useFadeUp(1319);
  const tipStyle      = useFadeUp(1664);

  const callouts: Callout[] = [
    { from: 342,  to: 600,  sender: "講師", text: "前三個必填，後三個加分，缺一不可" },
    { from: 1489, to: 1800, sender: "講師", text: "AI 對你的背景一無所知——現況是它認識你的起點" },
  ];

  const scrollY = interpolate(frame, [1700, 2200], [0, 400 * S], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={50} scrollY={scrollY}>
        <SectionHeader num="04" title="萬用句型：六個元素" startFrame={5} />

        {/* Overview */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 18 * S, padding: `${20 * S}px ${28 * S}px`,
          marginBottom: 20 * S, ...overviewStyle,
        }}>
          <div style={{ display: "flex", gap: 20 * S, flexWrap: "wrap" as const }}>
            {[
              { label: "01 現況", type: "必填", color: C.primary },
              { label: "02 痛點", type: "必填", color: C.primary },
              { label: "03 期待", type: "必填", color: C.primary },
              { label: "04 驗收清單", type: "加分", color: C.yellow },
              { label: "05 指定解法", type: "加分", color: C.yellow },
              { label: "06 資料範例", type: "加分", color: C.yellow },
            ].map((item, i) => {
              const itemOpacity = interpolate(frame, [342 + i * 12, 342 + i * 12 + 15], [0, 1], clamp);
              return (
                <div key={i} style={{
                  opacity: itemOpacity,
                  background: item.type === "必填" ? "rgba(124,255,178,0.08)" : "rgba(255,209,102,0.08)",
                  border: `1px solid ${item.type === "必填" ? "rgba(124,255,178,0.25)" : "rgba(255,209,102,0.25)"}`,
                  borderRadius: 12 * S, padding: `${10 * S}px ${18 * S}px`,
                  display: "flex", alignItems: "center", gap: 10 * S,
                }}>
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S, color: item.color,
                    background: item.type === "必填" ? "rgba(124,255,178,0.15)" : "rgba(255,209,102,0.15)",
                    borderRadius: 99, padding: `${3 * S}px ${8 * S}px`,
                  }}>{item.type}</span>
                  <span style={{
                    fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                    fontSize: 24 * S, fontWeight: 700, color: item.color,
                  }}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Required badge */}
        <ElementBadge num="01" title="現況" type="required" fadeStyle={elementStyle} />

        {/* Content */}
        <Card fadeStyle={card1Style} marginBottom={20 * S}>
          現況，就是你<strong style={{ color: C.primary }}>目前的狀況</strong>。
          <br /><br />
          要說清楚：<strong style={{ color: C.text }}>你是什麼角色</strong>、
          <strong style={{ color: C.text }}>在做什麼任務</strong>、
          <strong style={{ color: C.text }}>使用了什麼工具</strong>。
          <br /><br />
          AI 對你的背景一無所知——現況是它<strong style={{ color: C.primary }}>認識你的起點</strong>。
        </Card>

        <TipBox label="例子" fadeStyle={tipStyle}>
          「我是一個講座策劃的人，準備辦一場活動，在活動開始前大家透過填表單報名，名單用 Google 試算表記錄。」
        </TipBox>

        {/* Highlight diagram — VTT 69.42s=2083f */}
        <HighlightDiagramSVG startFrame={2083} />

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4.2 — 核心元素二：痛點
// VTT 4.2 key: 36.54s=1096f → flow_diagram
// ─────────────────────────────────────────────────────────────────────────────
const Scene42PainPoint: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const cardStyle  = useFadeUp(20);
  const card2Style = useFadeUp(360);
  const warnStyle  = useFadeUpItem(645);
  const tipStyle   = useFadeUp(1200);

  const callouts: Callout[] = [
    { from: 170, to: 450,  sender: "講師", text: "說清楚痛點，AI 才知道重點在哪裡" },
    { from: 645, to: 950,  sender: "講師", text: "很多人下指令時跳過痛點，直接說期待" },
  ];

  const scrollY = interpolate(frame, [900, 1400], [0, 300 * S], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={56} scrollY={scrollY}>
        <SectionHeader num="04" title="核心元素二：痛點" startFrame={5} />

        <ElementBadge num="02" title="痛點" type="required" fadeStyle={cardStyle} />

        <Card fadeStyle={card2Style}>
          痛點，就是現況裡<strong style={{ color: C.primary }}>最讓你煩惱、困擾的環節</strong>。
          <br /><br />
          說清楚痛點，可以幫助 AI<strong style={{ color: C.text }}>聚焦</strong>——
          知道你要解決的重點在哪裡，而不是面對一個模糊的大問題亂猜。
        </Card>

        {/* Warning */}
        <div style={{
          background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.2)",
          borderRadius: 16 * S, padding: `${20 * S}px ${28 * S}px`,
          marginBottom: 20 * S, ...warnStyle,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 20 * S, color: C.red, marginBottom: 8 * S,
          }}>⚠ 常見錯誤</div>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 26 * S, color: "#ff9999", lineHeight: 1.6, margin: 0,
          }}>
            很多人跳過這一步，直接告訴 AI 你的期待。
            結果 AI 做出來的東西，看起來有解決問題，但<strong style={{ color: C.red }}>往往不是最關鍵的痛點</strong>。
          </p>
        </div>

        <TipBox label="例子" fadeStyle={tipStyle}>
          「有些人透過多個管道重複報名，造成重複名單。手動去重費時，稍一不注意就會漏掉或誤刪。」
        </TipBox>

        {/* Pain flow diagram — 36.54s=1096f */}
        <PainFlowSVG startFrame={1096} />

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4.3 — 核心元素三：期待
// VTT 4.3 key: 33.42s=1003f → flow_diagram
// ─────────────────────────────────────────────────────────────────────────────
const Scene43Expectation: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const cardStyle  = useFadeUp(20);
  const card2Style = useFadeUp(287);
  const warnStyle  = useFadeUpItem(511);
  const tipStyle   = useFadeUp(1131);
  const summaryStyle = useFadeUpElastic(1610);

  const callouts: Callout[] = [
    { from: 125,  to: 400,  sender: "講師", text: "期待越具體，AI 的輸出越精準" },
    { from: 1131, to: 1450, sender: "講師", text: "輸出格式 + 放在哪裡 + 最終狀態，缺一不可" },
  ];

  const scrollY = interpolate(frame, [1300, 1800], [0, 350 * S], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={60} scrollY={scrollY}>
        <SectionHeader num="04" title="核心元素三：期待" startFrame={5} />

        <ElementBadge num="03" title="期待" type="required" fadeStyle={cardStyle} />

        <Card fadeStyle={card2Style}>
          期待，就是你理想中<strong style={{ color: C.primary }}>想要怎麼解決這個問題</strong>，
          以及執行完成後，<strong style={{ color: C.primary }}>畫面上應該出現什麼結果</strong>。
          <br /><br />
          描述得越具體越好。
        </Card>

        {/* Warning */}
        <div style={{
          background: "rgba(255,209,102,0.06)", border: `1px solid ${C.yellowBorder}`,
          borderRadius: 16 * S, padding: `${20 * S}px ${28 * S}px`,
          marginBottom: 20 * S, ...warnStyle,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 20 * S, color: C.yellow, marginBottom: 8 * S,
          }}>⚠ 常見問題</div>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 26 * S, color: "#ffee99", lineHeight: 1.6, margin: 0,
          }}>
            很多人直接說「我希望可以自動化」——但對 AI 來說還是太模糊。
            <br /><br />
            你需要告訴它：<strong style={{ color: C.text }}>自動化後輸出什麼格式、放在哪裡、最終狀態是什麼</strong>。
          </p>
        </div>

        <TipBox label="例子" fadeStyle={tipStyle}>
          「執行後以 Email 作為判斷重複的依據，自動篩選重複名單，合併成一份完整名單，產出一份新的 Google 試算表。」
        </TipBox>

        {/* Expect flow diagram — 33.42s=1003f */}
        <ExpectFlowSVG startFrame={1003} />

        {/* Summary of three core elements */}
        <div style={{
          marginTop: 24 * S,
          background: C.primaryLight,
          border: `2px solid ${C.primary}`,
          borderRadius: 20 * S,
          padding: `${24 * S}px ${32 * S}px`,
          ...summaryStyle,
          boxShadow: "0 0 40px rgba(124,255,178,0.15)",
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 20 * S, color: C.primary,
            letterSpacing: "0.08em", marginBottom: 16 * S,
          }}>三個必填元素</div>
          <div style={{ display: "flex", gap: 20 * S, justifyContent: "space-around" }}>
            {["現況", "痛點", "期待"].map((label, i) => (
              <div key={i} style={{ textAlign: "center" as const }}>
                <div style={{
                  fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                  fontSize: 36 * S, fontWeight: 900, color: C.primary,
                }}>{label}</div>
                <div style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 20 * S, color: C.muted, marginTop: 4 * S,
                }}>REQUIRED</div>
              </div>
            ))}
          </div>
        </div>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4.4 — 進階元素一：驗收清單
// VTT 4.4: 9.34s=280f → 驗收清單介紹, 41.54s=1246f → 例子
// ─────────────────────────────────────────────────────────────────────────────
const Scene44Checklist: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const cardStyle   = useFadeUp(20);
  const bonusStyle  = useFadeUp(178);
  const hiddenStyle = useFadeUpItem(731);
  const tipStyle    = useFadeUp(1246);

  const callouts: Callout[] = [
    { from: 280,  to: 550,  sender: "講師", text: "驗收清單的隱藏好處：幫你把需求想得更仔細" },
    { from: 1602, to: 1900, sender: "講師", text: "寫清單的過程往往會發現之前沒想到的細節" },
  ];

  const scrollY = interpolate(frame, [1300, 1800], [0, 300 * S], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={65} scrollY={scrollY}>
        <SectionHeader num="04" title="進階元素一：驗收清單" startFrame={5} />

        <ElementBadge num="04" title="驗收清單" type="bonus" fadeStyle={cardStyle} />

        <Card fadeStyle={bonusStyle}>
          驗收清單，就是當 AI 完成任務後，
          你會用<strong style={{ color: C.primary }}>哪些標準</strong>來判斷它是否真的幫你完成了。
        </Card>

        {/* Hidden benefit */}
        <div style={{
          background: "rgba(124,255,178,0.05)", border: `1px solid rgba(124,255,178,0.22)`,
          borderLeft: `${4 * S}px solid ${C.primary}`,
          borderRadius: `0 ${18 * S}px ${18 * S}px 0`,
          padding: `${24 * S}px ${32 * S}px`, marginBottom: 20 * S,
          ...hiddenStyle,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 20 * S, fontWeight: 700,
            color: C.primary, marginBottom: 10 * S,
          }}>🔍 隱藏好處</div>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 26 * S, color: "#dafff0", lineHeight: 1.8, margin: 0,
          }}>
            在撰寫驗收清單的過程中，往往會發現一些<strong style={{ color: C.text }}>之前沒有想到的需求細節</strong>。
            <br /><br />
            所以驗收清單同時幫你和 AI 把需求想得更仔細。
          </p>
        </div>

        {/* Example checklist — VTT 41.54s=1246f */}
        <TipBox label="例子：驗收清單" fadeStyle={tipStyle}>
          {[
            "✓ 執行後產出一份新的 Google 試算表",
            "✓ 同一個 Email 只保留一筆",
            "✓「姓名」和「報名者姓名」這類同義欄位被識別為同一欄",
          ].map((item, i) => {
            const itemOpacity = interpolate(frame, [1246 + i * 20, 1246 + i * 20 + 20], [0, 1], clamp);
            const itemY = interpolate(
              spring({ frame: Math.max(0, frame - 1246 - i * 20), fps: 30, config: { damping: 200 } }),
              [0, 1], [10 * S, 0]
            );
            return (
              <div key={i} style={{
                opacity: itemOpacity, transform: `translateY(${itemY}px)`,
                marginBottom: i < 2 ? 8 * S : 0,
              }}>
                {item}
              </div>
            );
          })}
        </TipBox>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4.5 — 進階元素二：指定解法
// VTT 4.5 key: 13.12s=394f → comparison_diagram
// ─────────────────────────────────────────────────────────────────────────────
const Scene45Solution: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const cardStyle   = useFadeUp(20);
  const bonusStyle  = useFadeUp(101);
  const warnStyle   = useFadeUpItem(229);
  const appsStyle   = useFadeUp(795);

  const callouts: Callout[] = [
    { from: 229,  to: 500,  sender: "講師", text: "不指定 → AI 可能提出你完全不熟悉的解法" },
    { from: 942,  to: 1250, sender: "講師", text: "指定 Google Apps Script → AI 往你熟悉的方向走" },
  ];

  const scrollY = interpolate(frame, [700, 1200], [0, 250 * S], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={72} scrollY={scrollY}>
        <SectionHeader num="04" title="進階元素二：指定解法" startFrame={5} />

        <ElementBadge num="05" title="指定解法" type="bonus" fadeStyle={cardStyle} />

        <Card fadeStyle={bonusStyle}>
          指定解法，就是告訴 AI 你希望它用<strong style={{ color: C.primary }}>什麼工具來實現</strong>。
        </Card>

        {/* Warning */}
        <div style={{
          background: "rgba(255,209,102,0.06)", border: `1px solid ${C.yellowBorder}`,
          borderRadius: 16 * S, padding: `${20 * S}px ${28 * S}px`,
          marginBottom: 20 * S, ...warnStyle,
        }}>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 26 * S, color: "#ffee99", lineHeight: 1.6, margin: 0,
          }}>
            如果你沒有指定，AI 可能提出一個你<strong style={{ color: C.yellow }}>完全不熟悉的解法</strong>，
            例如叫你安裝從來沒聽過的工具，或使用你不熟悉的程式語言。
          </p>
        </div>

        {/* Comparison diagram — 13.12s=394f */}
        <SolutionComparisonSVG startFrame={394} />

        {/* Apps Script example */}
        <TipBox label="例子：指定解法" fadeStyle={appsStyle}>
          「請使用 Google Apps Script 來實作，並一步一步說明操作方式。」
        </TipBox>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4.6 — 進階元素三：資料範例
// VTT 4.6: 6.18s=185f, 22.8s=684f, 44.16s=1325f
// ─────────────────────────────────────────────────────────────────────────────
const Scene46DataSample: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const cardStyle   = useFadeUp(20);
  const bonusStyle  = useFadeUp(63);
  const howtoStyle  = useFadeUp(185);
  const formatStyle = useFadeUpItem(684);
  const screenshotStyle = useFadeUpItem(1325);

  const callouts: Callout[] = [
    { from: 185,  to: 450,  sender: "講師", text: "不用貼全部——標題列加上一兩列資料就夠了" },
    { from: 684,  to: 1000, sender: "講師", text: "直接複製貼上，AI 看起來整齊易讀" },
  ];

  const scrollY = interpolate(frame, [900, 1400], [0, 300 * S], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={78} scrollY={scrollY}>
        <SectionHeader num="04" title="進階元素三：資料範例" startFrame={5} />

        <ElementBadge num="06" title="資料範例" type="bonus" fadeStyle={cardStyle} />

        <Card fadeStyle={bonusStyle}>
          雖然 AI 看不到你的試算表，但你可以<strong style={{ color: C.primary }}>直接把資料貼給它看</strong>。
        </Card>

        {/* How-to */}
        <div style={{
          background: C.primaryLight, border: `1px solid ${C.border}`,
          borderRadius: 18 * S, padding: `${22 * S}px ${30 * S}px`,
          marginBottom: 20 * S, ...howtoStyle,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 20 * S, color: C.primary, marginBottom: 12 * S,
          }}>怎麼貼？</div>
          {[
            { icon: "1", text: "只貼標題列 + 一兩列資料（不需要全部）" },
            { icon: "2", text: "直接從試算表複製貼上即可" },
            { icon: "3", text: "貼上的內容對 AI 來說非常整齊，不需整理" },
          ].map((item, i) => {
            const itemOpacity = interpolate(frame, [185 + i * 15, 185 + i * 15 + 20], [0, 1], clamp);
            return (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 16 * S,
                marginBottom: i < 2 ? 12 * S : 0,
                opacity: itemOpacity,
              }}>
                <span style={{
                  width: 28 * S, height: 28 * S, borderRadius: "50%",
                  background: C.primary,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 20 * S, fontWeight: 700, color: C.bg,
                }}>{item.icon}</span>
                <span style={{
                  fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                  fontSize: 26 * S, color: C.text, lineHeight: 1.6,
                }}>{item.text}</span>
              </div>
            );
          })}
        </div>

        {/* Format demo */}
        <div style={{
          background: C.surface2, border: `1px solid rgba(255,255,255,0.06)`,
          borderRadius: 14 * S, padding: `${16 * S}px ${24 * S}px`,
          marginBottom: 20 * S, ...formatStyle,
          fontFamily: "'Space Mono', monospace",
          fontSize: 20 * S, color: C.primary, lineHeight: 1.8,
        }}>
          <div style={{ color: C.muted, fontSize: 20 * S, marginBottom: 8 * S }}>範例（直接貼上即可）</div>
          姓名	Email	電話	報名時間<br />
          王小明	ming@example.com	0912345678	2024-03-01 10:30<br />
          李美華	hua@example.com	0987654321	2024-03-01 11:00
        </div>

        {/* Screenshot note */}
        <div style={{
          background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.08)`,
          borderRadius: 14 * S, padding: `${16 * S}px ${24 * S}px`,
          ...screenshotStyle,
        }}>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 24 * S, color: C.muted, lineHeight: 1.7, margin: 0,
          }}>
            也可以提供截圖給 AI 參考——
            但如果欄位很長、無法一次截完，<strong style={{ color: C.text }}>建議還是直接貼資料</strong>。
          </p>
        </div>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GPT Video Overlay — 5.1 整段影片從 frame 0 開始
// ─────────────────────────────────────────────────────────────────────────────
const GptVideoOverlay: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  // Video is 45s = 1350 frames; audio is ~54.84s = 1645 frames
  // Show video for 1350f, then fade out
  const VIDEO_FRAMES = 1350;
  const fadeIn  = interpolate(frame, [0, 12], [0, 1], clamp);
  const fadeOut = interpolate(frame, [VIDEO_FRAMES - 30, VIDEO_FRAMES], [1, 0], clamp);
  const opacity = Math.min(fadeIn, fadeOut);

  if (frame >= VIDEO_FRAMES) return null;

  return (
    <AbsoluteFill style={{ zIndex: 999, backgroundColor: C.bg, opacity }}>
      <Video
        src={staticFile("video/gpt-generate-code.mov")}
        style={{ width: "100%", height: "100%", objectFit: "contain" as const }}
        startFrom={0}
        endAt={VIDEO_FRAMES}
        volume={0}
      />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 5.1 — 總結
// GPT 生成程式碼.mov overlays from frame 0 (45s video, audio ~55s)
// ─────────────────────────────────────────────────────────────────────────────
const Scene51Summary: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const card1Style = useFadeUp(1380);
  const card2Style = useFadeUp(1500);
  const conclusionStyle = useFadeUpElastic(1600);

  const callouts: Callout[] = [
    { from: 1380, to: 1600, sender: "講師", text: "對 AI 來說，說多不是壞事——紙條越詳細，答案越精準" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={84}>
        <SectionHeader num="05" title="總結" startFrame={1380} />

        <Card fadeStyle={card1Style}>
          你塞給房間裡那個小天才的那張紙條，就是你的提示詞。
          <br /><br />
          <strong style={{ color: C.primary }}>不怕說多，只怕說少</strong>。
          紙條越詳細，天才給你的答案越精準。
        </Card>

        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 22 * S, padding: `${26 * S}px ${36 * S}px`,
          marginBottom: 20 * S, ...card2Style,
        }}>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 28 * S, color: C.text, lineHeight: 1.8, margin: 0,
          }}>
            用萬用句型後，雖然一開始要打的字變多了，
            但能大幅<strong style={{ color: C.primary }}>減少後續來回修正的次數</strong>。
            <br /><br />
            最理想的情況是：<strong style={{ color: C.primary }}>一張紙條，直接得到你想要的結果。</strong>
            <br />
            先苦後甘！
          </p>
        </div>

        {/* Conclusion emphasis */}
        <div style={{ textAlign: "center" as const, marginTop: 20 * S, ...conclusionStyle }}>
          <span style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 52 * S, fontWeight: 900,
            color: C.primary,
            textShadow: "0 0 40px rgba(124,255,178,0.5)",
          }}>不要一開始就排斥多打一點字</span>
        </div>

      </SceneWrap>

      {/* GPT video overlay — starts at frame 0 */}
      <GptVideoOverlay dur={dur} />

      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 6.1 — 本章收尾
// VTT 6.1: 5.46s=164f, 23.44s=703f, 39.2s=1176f, 51.7s=1551f
// ─────────────────────────────────────────────────────────────────────────────
const Scene61Closing: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const headerStyle = useFadeUp(20);

  const callouts: Callout[] = [
    { from: 703,  to: 1000, sender: "講師", text: "核心三元素必填，進階三元素加分" },
    { from: 1551, to: 1900, sender: "講師", text: "驗收清單不只給 AI 看，也幫自己把需求想仔細" },
  ];

  const scrollY = interpolate(frame, [1500, 2300], [0, 400 * S], clamp);

  const summaryItems = [
    {
      num: "01",
      text: "跟 AI 溝通百分之百靠文字，你沒說的它完全不知道",
      frame: 164,
    },
    {
      num: "02",
      text: "核心三元素：現況、痛點、期待——每次下指令都必須包含，缺一不可",
      frame: 703,
    },
    {
      num: "03",
      text: "進階三元素：驗收清單、指定解法、資料範例——讓指令從「大概對」變「精準對」",
      frame: 1176,
    },
    {
      num: "04",
      text: "驗收清單不只是給 AI 看的，也是幫自己把需求想得更仔細的工具",
      frame: 1551,
    },
    {
      num: "05",
      text: "資料範例直接從試算表複製貼上即可，不需整理格式",
      frame: 1700,
    },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={100} scrollY={scrollY}>
        <SectionHeader num="06" title="本章重點總結" startFrame={5} />

        <div style={{ marginBottom: 24 * S, ...headerStyle }}>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 28 * S, color: C.muted, lineHeight: 1.7, margin: 0,
          }}>
            快速整理這個單元的學習內容：
          </p>
        </div>

        {summaryItems.map((item, i) => {
          const itemOpacity = interpolate(frame, [item.frame, item.frame + 25], [0, 1], clamp);
          const itemY = interpolate(
            spring({ frame: Math.max(0, frame - item.frame), fps: 30, config: { damping: 200 }, durationInFrames: 21 }),
            [0, 1], [10 * S, 0]
          );
          return (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 24 * S,
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 18 * S, padding: `${20 * S}px ${28 * S}px`,
              marginBottom: 16 * S,
              opacity: itemOpacity,
              transform: `translateY(${itemY}px)`,
            }}>
              <span style={{
                width: 44 * S, height: 44 * S, borderRadius: "50%",
                background: C.primaryLight,
                border: `2px solid ${C.primary}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                fontFamily: "'Space Mono', monospace",
                fontSize: 20 * S, fontWeight: 700, color: C.primary,
              }}>{item.num}</span>
              <p style={{
                fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                fontSize: 26 * S, color: C.text, lineHeight: 1.7, margin: 0,
              }}>{item.text}</p>
            </div>
          );
        })}

        {/* Next chapter teaser */}
        <div style={{
          marginTop: 28 * S,
          background: "rgba(124,255,178,0.05)",
          border: `1px solid rgba(124,255,178,0.2)`,
          borderRadius: 16 * S,
          padding: `${20 * S}px ${28 * S}px`,
          opacity: interpolate(frame, [1900, 1940], [0, 1], clamp),
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 20 * S, color: C.primary,
            letterSpacing: "0.1em", marginBottom: 10 * S,
          }}>NEXT CHAPTER</div>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 26 * S, color: C.muted, lineHeight: 1.7, margin: 0,
          }}>
            下一章：好用的<strong style={{ color: C.text }}>特殊符號 × 提示詞技巧</strong>，
            搭配今天學的萬用句型，成功率大幅提升！
          </p>
        </div>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FullVideo05 — Root composition
// ─────────────────────────────────────────────────────────────────────────────
export const FullVideo05: React.FC = () => {
  React.useEffect(() => {
    const el = document.createElement("video");
    el.src = staticFile("video/gpt-generate-code.mov");
    el.preload = "auto";
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* BGM */}
      <Audio src={staticFile("audio/course_background_music.wav")} volume={0.10} loop />

      {/* Audio tracks */}
      {SEGMENTS.map((seg, i) => (
        <Sequence key={seg.id} from={SEG_STARTS[i]} durationInFrames={seg.frames}>
          <Audio src={staticFile(`audio/${seg.file}`)} volume={1.0} />
        </Sequence>
      ))}

      {/* Scene 1.1 — Opening */}
      <Sequence from={SEG_STARTS[0]} durationInFrames={SEGMENTS[0].frames}>
        <Scene11Opening dur={SEGMENTS[0].frames} />
      </Sequence>

      {/* Scene 2.1 — 兩大重點 */}
      <Sequence from={SEG_STARTS[1]} durationInFrames={SEGMENTS[1].frames}>
        <Scene21TwoPoints dur={SEGMENTS[1].frames} />
      </Sequence>

      {/* Scene 3.1 — 模糊指令 */}
      <Sequence from={SEG_STARTS[2]} durationInFrames={SEGMENTS[2].frames}>
        <Scene31FuzzyCmd dur={SEGMENTS[2].frames} />
      </Sequence>

      {/* Scene 3.2 — 清楚指令 */}
      <Sequence from={SEG_STARTS[3]} durationInFrames={SEGMENTS[3].frames}>
        <Scene32ClearCmd dur={SEGMENTS[3].frames} />
      </Sequence>

      {/* Scene 4.1 — 現況 */}
      <Sequence from={SEG_STARTS[4]} durationInFrames={SEGMENTS[4].frames}>
        <Scene41Status dur={SEGMENTS[4].frames} />
      </Sequence>

      {/* Scene 4.2 — 痛點 */}
      <Sequence from={SEG_STARTS[5]} durationInFrames={SEGMENTS[5].frames}>
        <Scene42PainPoint dur={SEGMENTS[5].frames} />
      </Sequence>

      {/* Scene 4.3 — 期待 */}
      <Sequence from={SEG_STARTS[6]} durationInFrames={SEGMENTS[6].frames}>
        <Scene43Expectation dur={SEGMENTS[6].frames} />
      </Sequence>

      {/* Scene 4.4 — 驗收清單 */}
      <Sequence from={SEG_STARTS[7]} durationInFrames={SEGMENTS[7].frames}>
        <Scene44Checklist dur={SEGMENTS[7].frames} />
      </Sequence>

      {/* Scene 4.5 — 指定解法 */}
      <Sequence from={SEG_STARTS[8]} durationInFrames={SEGMENTS[8].frames}>
        <Scene45Solution dur={SEGMENTS[8].frames} />
      </Sequence>

      {/* Scene 4.6 — 資料範例 */}
      <Sequence from={SEG_STARTS[9]} durationInFrames={SEGMENTS[9].frames}>
        <Scene46DataSample dur={SEGMENTS[9].frames} />
      </Sequence>

      {/* Scene 5.1 — 總結 (GPT video overlay inside) */}
      <Sequence from={SEG_STARTS[10]} durationInFrames={SEGMENTS[10].frames}>
        <Scene51Summary dur={SEGMENTS[10].frames} />
      </Sequence>

      {/* Scene 6.1 — 本章收尾 */}
      <Sequence from={SEG_STARTS[11]} durationInFrames={SEGMENTS[11].frames}>
        <Scene61Closing dur={SEGMENTS[11].frames} />
      </Sequence>
    </AbsoluteFill>
  );
};
