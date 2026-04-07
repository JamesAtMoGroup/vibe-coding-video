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
// SEG_STARTS — cumulative frame offsets (audio duration × 30)
// Durations: 1.1=1783 2.1=1962 3.1=1649 3.2=1293 3.3=1516(+208 delay) 4.0=758 4.1=3700 4.2=3834 4.3=3566 5.1=1783 6.1=2898
// Note: 3.3 Sequence is extended by 208f so audio starts AFTER kuabumen mov ends
// ─────────────────────────────────────────────────────────────────────────────
const SEGMENTS = [
  { id: "1.1", frames: 1783, file: "1-1_1.1-normalized.wav" },
  { id: "2.1", frames: 1962, file: "1-1_2.1-normalized.wav" },
  { id: "3.1", frames: 1649, file: "1-1_3.1-normalized.wav" },
  { id: "3.2", frames: 1293, file: "1-1_3.2-normalized.wav" },
  { id: "3.3", frames: 1724, file: "1-1_3.3-normalized.wav" }, // 1516 + 208 delay
  { id: "4.0", frames:  758, file: "1-1_4.0-normalized.wav" },
  { id: "4.1", frames: 3700, file: "1-1_4.1-normalized.wav" },
  { id: "4.2", frames: 3834, file: "1-1_4.2-normalized.wav" },
  { id: "4.3", frames: 3566, file: "1-1_4.3-normalized.wav" },
  { id: "5.1", frames: 1783, file: "1-1_5.1-normalized.wav" },
  { id: "6.1", frames: 2898, file: "1-1_6.1-normalized.wav" },
] as const;

export const SEG_STARTS = [0, 1783, 3745, 5394, 6687, 8411, 9169, 12869, 16703, 20269, 22052];
export const TOTAL_FRAMES_04 = 24950;

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
// SceneFade — 12f in, 12f out (mandatory)
// ─────────────────────────────────────────────────────────────────────────────
const SceneFade: React.FC<{ children: React.ReactNode; durationInFrames: number }> = ({
  children, durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const fadeIn  = interpolate(frame, [0, 12], [0, 1], clamp);
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ opacity: Math.min(fadeIn, fadeOut), height: "100%" }}>
      {children}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WordReveal — word-by-word stagger (4f per word)
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
// BgOrbs — subtle pulse
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
const ProgressBar: React.FC<{ progressPct?: number }> = ({ progressPct = 14 }) => {
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
        fontSize: 16 * S,
        color: C.muted,
        letterSpacing: "0.05em",
        marginBottom: 8 * S,
      }}>
        <Img
          src={staticFile("aischool-logo.webp")}
          style={{ height: 22 * S, width: "auto", mixBlendMode: "screen", opacity: 0.9 }}
        />
        <span style={{ fontSize: 14 * S, color: C.muted }}>CH 1-1</span>
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
// SectionHeader with animated accent line
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
          fontSize: 16 * S, color: C.primary,
          background: "rgba(124,255,178,0.1)",
          border: `1px solid rgba(124,255,178,0.3)`,
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
// AnalogyBox
// ─────────────────────────────────────────────────────────────────────────────
const AnalogyBox: React.FC<{
  label: string; children: React.ReactNode;
  fadeStyle?: React.CSSProperties; marginBottom?: number;
}> = ({ label, children, fadeStyle = {}, marginBottom = 20 * S }) => (
  <div style={{
    background: "rgba(124,255,178,0.05)", borderLeft: `${4 * S}px solid ${C.primary}`,
    borderRadius: `0 ${18 * S}px ${18 * S}px 0`, padding: `${24 * S}px ${32 * S}px`, marginBottom,
    boxShadow: `-${2 * S}px 0 ${30 * S}px rgba(124,255,178,0.08)`,
    ...fadeStyle,
  }}>
    <div style={{
      fontFamily: "'Space Mono', monospace", fontSize: 16 * S, fontWeight: 700,
      color: C.primary, letterSpacing: "0.1em",
      textTransform: "uppercase" as const, marginBottom: 12 * S,
      display: "flex", alignItems: "center", gap: 10 * S,
    }}>
      <div style={{ width: 6 * S, height: 6 * S, background: C.primary, borderRadius: "50%", flexShrink: 0, boxShadow: "0 0 10px #7cffb2" }} />
      {label}
    </div>
    <p style={{
      fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
      fontSize: 26 * S, color: "#dafff0", lineHeight: 1.8, margin: 0,
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
}> = ({ label = "實戰提示", children, fadeStyle = {}, marginBottom = 20 * S }) => (
  <div style={{
    background: "rgba(124,255,178,0.05)",
    border: `1px solid rgba(124,255,178,0.22)`,
    borderRadius: 16 * S, padding: `${20 * S}px ${28 * S}px`, marginBottom,
    ...fadeStyle,
  }}>
    <div style={{
      fontFamily: "'Space Mono', monospace", fontSize: 16 * S, fontWeight: 700,
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
// QuizBox
// ─────────────────────────────────────────────────────────────────────────────
const QuizBox: React.FC<{
  children: React.ReactNode;
  fadeStyle?: React.CSSProperties;
  marginBottom?: number;
}> = ({ children, fadeStyle = {}, marginBottom = 20 * S }) => (
  <div style={{
    border: `2px dashed rgba(255,209,102,0.3)`, borderRadius: 16 * S,
    padding: `${28 * S}px ${32 * S}px`, marginBottom,
    background: "rgba(255,209,102,0.03)", ...fadeStyle,
  }}>
    <div style={{
      fontFamily: "'Space Mono', monospace", fontSize: 18 * S, fontWeight: 700,
      color: C.yellow, letterSpacing: "0.08em",
      textTransform: "uppercase" as const, marginBottom: 14 * S,
      display: "flex", alignItems: "center", gap: 8 * S,
    }}>
      <div style={{ width: 6 * S, height: 6 * S, background: C.yellow, borderRadius: "50%", boxShadow: "0 0 10px #ffd166" }} />
      想一想
    </div>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// RiskItem — color-coded checklist row with left-border accent
// ─────────────────────────────────────────────────────────────────────────────
const RISK_COLORS = {
  safe:     { border: "#7cffb2", bg: "rgba(124,255,178,0.06)", label: "安全",  labelColor: "#7cffb2" },
  caution:  { border: "#ffd166", bg: "rgba(255,209,102,0.06)", label: "留意",  labelColor: "#ffd166" },
  danger:   { border: "#ff9f43", bg: "rgba(255,159,67,0.06)",  label: "謹慎",  labelColor: "#ff9f43" },
  critical: { border: "#ff6b6b", bg: "rgba(255,107,107,0.06)", label: "暫停",  labelColor: "#ff6b6b" },
};

const RiskItem: React.FC<{
  level: keyof typeof RISK_COLORS;
  text: string;
  startFrame: number;
}> = ({ level, text, startFrame }) => {
  const iconStyle = useFadeUpElastic(startFrame);
  const textStyle = useFadeUpItem(startFrame + 4);
  const { border, bg, label, labelColor } = RISK_COLORS[level];
  // left-border accent (visual quality standard #7)
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 16 * S,
      background: bg,
      border: `1px solid ${border}33`,
      borderLeft: `3px solid rgba(124,255,178,0.4)`,
      borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
      padding: `${14 * S}px ${20 * S}px`,
      marginBottom: 10 * S,
    }}>
      <span style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 13 * S, fontWeight: 700,
        color: labelColor,
        background: `${border}18`,
        border: `1px solid ${border}44`,
        borderRadius: 6 * S,
        padding: `${3 * S}px ${10 * S}px`,
        whiteSpace: "nowrap" as const,
        flexShrink: 0,
        alignSelf: "center",
        ...iconStyle,
      }}>{label}</span>
      <p style={{
        fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
        fontSize: 26 * S, color: C.text, lineHeight: 1.7, margin: 0,
        ...textStyle,
      }}>{text}</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SceneWrap
// ─────────────────────────────────────────────────────────────────────────────
const SceneWrap: React.FC<{ children: React.ReactNode; scrollY?: number; progressPct?: number }> = ({
  children, scrollY = 0, progressPct = 14,
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
// iMessage Callout
// ─────────────────────────────────────────────────────────────────────────────
const NOTIF_W       = 420 * S;
const NOTIF_TOP     = 12  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLIDE_H = 150 * S;
const NOTIF_SLOT    = 200 * S;
const FADE_OUT_F    = 50;

type Callout = { from: number; to: number; sender: string; text: string };

// CalloutLayer — renders callouts at AbsoluteFill (screen) level, outside SceneWrap scroll/clip
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
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis",
          }}>{c.sender}</div>
          <div style={{
            fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif",
            fontSize: fontBody, fontWeight: 400,
            color: "rgba(255,255,255,0.60)", lineHeight: 1.45,
            letterSpacing: "-0.005em", minHeight: fontBody * 1.45,
          }}>{displayText}{cursor}</div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CounterAnim — 數字計數動畫
// ─────────────────────────────────────────────────────────────────────────────
const CounterAnim: React.FC<{
  from?: number;
  to: number;
  startFrame: number;
  suffix?: string;
  fontSize?: number;
  decimals?: number;
  color?: string;
}> = ({ from = 0, to, startFrame, suffix = "", fontSize = 60 * S, decimals = 0, color = C.primary }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const dur = Math.round(1.5 * 30); // 1.5s counting duration
  const progress = interpolate(f, [0, dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const rawValue = interpolate(progress, [0, 1], [from, to]);
  const displayValue = decimals > 0 ? rawValue.toFixed(decimals) : Math.round(rawValue).toString();
  const opacity = interpolate(f, [0, 10], [0, 1], clamp);
  return (
    <span style={{ fontFamily: "'Space Mono', monospace", fontSize, fontWeight: 700, color, opacity }}>
      {displayValue}{suffix}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HighlightPulse — 關鍵詞脈動
// ─────────────────────────────────────────────────────────────────────────────
const HighlightPulse: React.FC<{ text: string; startFrame: number; delay?: number; color?: string }> = ({
  text, startFrame, delay = 0, color = C.primary,
}) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame - delay);
  const glow = interpolate(Math.sin(f / 15), [-1, 1], [0.4, 1]);
  const scale = interpolate(spring({ frame: f, fps: 30, config: { damping: 12 } }), [0, 1], [0.9, 1]);
  const opacity = interpolate(f, [0, 12], [0, 1], clamp);
  const isHex = color.startsWith("#");
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  };
  const rgb = isHex ? hexToRgb(color) : "124,255,178";
  return (
    <span style={{
      color,
      fontWeight: 700,
      opacity,
      transform: `scale(${scale})`,
      display: "inline-block",
      textShadow: `0 0 ${20 * glow}px rgba(${rgb},${glow * 0.8})`,
    }}>{text}</span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ComparisonChart — 左右對比
// ─────────────────────────────────────────────────────────────────────────────
const ComparisonChart: React.FC<{
  left: { label: string; desc: string };
  right: { label: string; desc: string };
  startFrame: number;
}> = ({ left, right, startFrame }) => {
  const frame = useCurrentFrame();
  const leftF = Math.max(0, frame - startFrame);
  const rightF = Math.max(0, frame - startFrame - 20);
  const leftOpacity = interpolate(leftF, [0, 15], [0, 1], clamp);
  const rightOpacity = interpolate(rightF, [0, 15], [0, 1], clamp);
  const leftY = interpolate(spring({ frame: leftF, fps: 30, config: { damping: 200 } }), [0, 1], [20 * S, 0]);
  const rightY = interpolate(spring({ frame: rightF, fps: 30, config: { damping: 200 } }), [0, 1], [20 * S, 0]);
  return (
    <div style={{ display: "flex", gap: 24 * S, marginTop: 20 * S, marginBottom: 20 * S }}>
      <div style={{
        flex: 1,
        opacity: leftOpacity,
        transform: `translateY(${leftY}px)`,
        background: "rgba(255,107,107,0.08)",
        border: "1px solid rgba(255,107,107,0.25)",
        borderRadius: 16 * S,
        padding: `${20 * S}px ${24 * S}px`,
      }}>
        <div style={{
          fontSize: 18 * S,
          color: C.red,
          fontFamily: "'Space Mono', monospace",
          marginBottom: 10 * S,
        }}>❌ {left.label}</div>
        <div style={{
          fontSize: 26 * S,
          color: C.text,
          fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
          lineHeight: 1.6,
        }}>{left.desc}</div>
      </div>
      <div style={{
        flex: 1,
        opacity: rightOpacity,
        transform: `translateY(${rightY}px)`,
        background: C.primaryLight,
        border: `1px solid ${C.border}`,
        borderRadius: 16 * S,
        padding: `${20 * S}px ${24 * S}px`,
        boxShadow: `0 0 30px rgba(124,255,178,0.12)`,
      }}>
        <div style={{
          fontSize: 18 * S,
          color: C.primary,
          fontFamily: "'Space Mono', monospace",
          marginBottom: 10 * S,
        }}>✅ {right.label}</div>
        <div style={{
          fontSize: 26 * S,
          color: C.text,
          fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
          lineHeight: 1.6,
        }}>{right.desc}</div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TimelineBar — 時間軸動畫
// ─────────────────────────────────────────────────────────────────────────────
const TimelineBar: React.FC<{ label: string; startFrame: number }> = ({ label, startFrame }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const width = interpolate(
    spring({ frame: f, fps: 30, config: { damping: 200 }, durationInFrames: 30 }),
    [0, 1], [0, 100]
  );
  const opacity = interpolate(f, [0, 10], [0, 1], clamp);
  return (
    <div style={{ marginTop: 16 * S, opacity, marginBottom: 8 * S }}>
      <div style={{
        fontSize: 20 * S,
        color: C.muted,
        fontFamily: "'Space Mono', monospace",
        marginBottom: 6 * S,
      }}>{label}</div>
      <div style={{
        height: 12 * S,
        background: "rgba(255,255,255,0.06)",
        borderRadius: 99,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${width}%`,
          background: `linear-gradient(90deg, ${C.primary}, rgba(124,255,178,0.4))`,
          borderRadius: 99,
        }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 1 — Hero (1.1) — 0 to 1783
// ─────────────────────────────────────────────────────────────────────────────
const Scene11Hero: React.FC<{ dur: number }> = ({ dur }) => {
  // VTT 1.1-derived callout timing:
  // 32.2s=966f: "花幾分鐘快速評估三件事情"
  // 41.2s=1236f: "不是真的要你認真去寫一份計劃書"
  const callouts: Callout[] = [
    { from: 966, to: 1180, sender: "講師", text: "動手前先花 5 分鐘評估三件事" },
    { from: 1236, to: 1470, sender: "講師", text: "不是要你寫計劃書，而是先冷靜思考" },
  ];
  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={14}>
        {/* Hero title */}
        <div style={{ paddingTop: 40 * S, textAlign: "center" as const }}>
          <WordReveal
            text="CH 1-1"
            startFrame={5}
            fontSize={18 * S}
            color={C.primary}
            fontFamily="'Space Mono', monospace"
            fontWeight={700}
            style={{ letterSpacing: "0.15em", display: "block", marginBottom: 20 * S }}
          />
          <WordReveal
            text="價值與風險"
            startFrame={20}
            fontSize={64 * S}
            fontWeight={900}
            style={{ letterSpacing: "-0.03em", display: "block", marginBottom: 10 * S, lineHeight: 1.1 }}
          />
          <WordReveal
            text="問題值得解決嗎？有無資安風險？"
            startFrame={50}
            fontSize={36 * S}
            color={C.primary}
            fontWeight={700}
            style={{ display: "block", marginBottom: 50 * S }}
          />
        </div>

        {/* Three pillars */}
        <ThreePillars startFrame={120} />

        {/* HighlightPulse: 三個關鍵詞依序脈動 at local_frame 1075 */}
        <HeroPillarsHighlight startFrame={1075} />

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

const ThreePillars: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const pillars = [
    { icon: "⏱", label: "投入時間", desc: "先決定代價，在範圍內盡力" },
    { icon: "💎", label: "價值", desc: "量化成時間或金錢更有感覺" },
    { icon: "🛡", label: "風險", desc: "帳單、隱私、營運三個維度" },
  ];
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: 30 * S, justifyContent: "center" }}>
      {pillars.map((p, i) => {
        const s = startFrame + i * 25;
        const f = Math.max(0, frame - s);
        const progress = spring({ frame: f, fps: 30, config: { damping: 200 }, durationInFrames: 21 });
        const opacity = interpolate(f, [0, 0.35 * 30], [0, 1], clamp);
        const y = interpolate(progress, [0, 1], [20 * S, 0]);
        return (
          <div key={i} style={{
            flex: 1,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 22 * S,
            padding: `${32 * S}px ${24 * S}px`,
            textAlign: "center" as const,
            opacity,
            transform: `translateY(${y}px)`,
          }}>
            <div style={{ fontSize: 40 * S, marginBottom: 14 * S, lineHeight: 1 }}>{p.icon}</div>
            <div style={{
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 32 * S, fontWeight: 800, color: C.primary,
              marginBottom: 10 * S,
            }}>{p.label}</div>
            <div style={{
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 26 * S, color: C.muted, lineHeight: 1.6,
            }}>{p.desc}</div>
          </div>
        );
      })}
    </div>
  );
};

// HighlightPulse overlay for 三個關鍵詞 in the pillars area — absolute positioned overlay
// VTT 1.1: "就是投入的時間、做這件事情的價值、還有可能的風險" at 35.82s=1075f
const HeroPillarsHighlight: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const opacity = interpolate(f, [0, 8], [0, 1], clamp);
  if (f <= 0) return null;
  return (
    <div style={{
      marginTop: 20 * S,
      display: "flex",
      justifyContent: "center",
      gap: 40 * S,
      opacity,
      fontSize: 52 * S,  // explicit — HighlightPulse inherits from parent
    }}>
      {["投入時間", "價值", "風險"].map((word, i) => (
        <HighlightPulse key={i} text={word} startFrame={startFrame} delay={i * 15} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 2 — 投入時間：時間箱法 (2.1) — 1783 to 3745
// ─────────────────────────────────────────────────────────────────────────────
const Scene21Timebox: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const cardStyle = useFadeUp(20);
  const timeboxStyle = useFadeUp(80);
  const analogyStyle = useFadeUp(200);

  // VTT 2.1:
  // 32.46s=974f: "建議你可以先思考你願意投入多少的時間"
  // 42.54s=1276f: comparison chart - "舉個例子來說"
  // 49.48s=1484f: timeline bar - "這個禮拜天的下午兩點到五點"
  // 58.98s=1769f: "你不會因為趕不上開發的時程"
  const callouts: Callout[] = [
    { from: 974, to: 1200, sender: "講師", text: "不問「要多久」，改問「我願意給多少時間」" },
    { from: 1769, to: 1962, sender: "講師", text: "時間箱法：設定上限，在範圍內全力推進" },
  ];

  // Scroll: reveal comparison chart and timeline bar
  const scrollY = interpolate(frame, [1400, 1700], [0, 300 * S], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={25} scrollY={scrollY}>
        <SectionHeader num="02" title="投入時間：時間箱法" startFrame={5} />
        <Card fadeStyle={cardStyle}>
          估時間是出了名的困難，就算經驗豐富的工程師也常常估錯。
          <br /><br />
          比較好執行的做法是：
          <strong style={{ color: C.primary }}>先決定你願意投入多少時間，再在那個範圍內盡力推進。</strong>
        </Card>

        <div style={{
          background: C.surface2,
          border: `1px solid rgba(124,255,178,0.22)`,
          borderRadius: 18 * S,
          padding: `${24 * S}px ${32 * S}px`,
          marginBottom: 20 * S,
          ...timeboxStyle,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 14 * S, fontWeight: 700,
            color: C.primary, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 * S,
          }}>推薦方法</div>
          <div style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 36 * S, fontWeight: 900, color: C.primary, marginBottom: 14 * S,
          }}>時間箱法（Timeboxing）</div>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 26 * S, color: C.muted, lineHeight: 1.8, margin: 0,
          }}>
            與其問自己「這要花多久」，不如直接決定：<br />
            <strong style={{ color: C.text }}>「這個週六下午兩點到五點，我來試試看能做到哪裡」</strong><br /><br />
            時間到就停。你已經在開始前決定好代價了。
          </p>
          {/* TimelineBar: 14:00 → 17:00 Time Box — VTT: 49.48s=1484f */}
          <TimelineBar label="14:00 → 17:00  Time Box" startFrame={1484} />
        </div>

        {/* ComparisonChart: VTT 42.54s=1276f "舉個例子來說" */}
        <ComparisonChart
          left={{ label: "這個專案要做多久？", desc: "估算不準確，容易焦慮" }}
          right={{ label: "禮拜天 2–5pm 盡力推進", desc: "事先決定代價，在框內全力推進" }}
          startFrame={1276}
        />

        <AnalogyBox label="為什麼不要精確估時" fadeStyle={analogyStyle}>
          很多人花大量時間想「這件事要多久」，結果什麼都還沒開始。
          <br /><br />
          <strong style={{ color: C.text }}>先開始，再調整。</strong>
          一個下午能到哪裡就到哪裡，比一直評估更有效率。
        </AnalogyBox>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3 — 價值評估 (3.1) — 3745 to 5394
// ─────────────────────────────────────────────────────────────────────────────
const Scene31Value: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const cardStyle = useFadeUp(20);
  // VTT-derived timings:
  // 10.68s=321f: "第一個" benefit (堅持下去的理由)
  // 22.34s=670f: "第二個是" benefit (需求釐清)
  // 32.16s=965f: "思考這件事情本身，就是一種很有用的需求釐清" → HighlightPulse
  // 36.6s=1098f: "所謂的價值，它可以只是一句話"
  // 44.48s=1334f: ComparisonChart "如果你能夠把它量化成具體的時間或金錢"
  const benefit1 = useFadeUpItem(321);
  const benefit2 = useFadeUpItem(670);
  const quantifyStyle = useFadeUp(1098);

  // VTT 3.1 callouts (from visual-spec):
  const callouts: Callout[] = [
    { from: 321, to: 570, sender: "講師", text: "清楚知道價值，是堅持下去的最好理由" },
    { from: 1334, to: 1600, sender: "講師", text: "量化成時間或金錢，更有說服力" },
  ];

  // Scroll: show ComparisonChart after 1334f
  const scrollY = interpolate(frame, [1250, 1500], [0, 250 * S], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={38} scrollY={scrollY}>
        <SectionHeader num="03" title="價值：這個問題值得解決嗎？" startFrame={5} />
        <Card fadeStyle={cardStyle} marginBottom={28 * S}>
          想清楚一個專案的價值，有<strong style={{ color: C.primary }}>兩個好處</strong>：
        </Card>

        {/* Progressive benefit items */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 18 * S, padding: `${24 * S}px ${32 * S}px`,
          marginBottom: 20 * S,
        }}>
          {/* Benefit 1 */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 16 * S,
            marginBottom: 20 * S,
            borderLeft: `3px solid rgba(124,255,178,0.4)`,
            paddingLeft: 20 * S,
            ...benefit1,
          }}>
            <div style={{
              width: 36 * S, height: 36 * S, borderRadius: "50%",
              background: C.primary, color: "#000",
              fontFamily: "'Space Mono', monospace",
              fontSize: 16 * S, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: 4 * S,
            }}>1</div>
            <p style={{
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 28 * S, color: C.text, lineHeight: 1.75, margin: 0,
            }}>
              做到一半想放棄時，清楚知道價值在哪裡是<strong style={{ color: C.primary }}>讓你撐下去的最好理由</strong>。
            </p>
          </div>

          {/* Benefit 2 */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 16 * S,
            borderLeft: `3px solid rgba(124,255,178,0.4)`,
            paddingLeft: 20 * S,
            ...benefit2,
          }}>
            <div style={{
              width: 36 * S, height: 36 * S, borderRadius: "50%",
              background: C.primary, color: "#000",
              fontFamily: "'Space Mono', monospace",
              fontSize: 16 * S, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: 4 * S,
            }}>2</div>
            <p style={{
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 28 * S, color: C.text, lineHeight: 1.75, margin: 0,
            }}>
              思考價值的過程本身就是一種{" "}
              <HighlightPulse text="需求釐清" startFrame={965} />{" "}
              ——你會更清楚自己到底想要什麼。
            </p>
          </div>
        </div>

        <AnalogyBox label="量化讓你更有感覺" fadeStyle={quantifyStyle}>
          價值可以只是一句話，有打動到你就行。<br /><br />
          但如果你能把它<strong style={{ color: C.text }}>量化成時間或金錢</strong>，會更有說服力。
        </AnalogyBox>

        {/* ComparisonChart: VTT 44.48s=1334f "如果你能夠把它量化" */}
        <ComparisonChart
          left={{ label: "只是一句話（✓）", desc: "「省去手動整理的麻煩」" }}
          right={{ label: "量化成時間 / 金錢（更有感 ⭐）", desc: "「一年省 75 小時 = 9.4 個工作天」" }}
          startFrame={1334}
        />

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3.2 — 具體例子：跨部門彙整 (3.2) — 5394 to 6687
// ─────────────────────────────────────────────────────────────────────────────
const Scene32Example: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  // VTT-derived timings (actual seconds × 30):
  // 2.14s=64f: "舉個實際的例子來說" → intro card
  // 6.64s=199f: "每個禮拜工作的時候都會需要手動的整理跨部門的進度匯報" → flow diagram
  // 17.16s=515f: "每次你可能大概都要花一個半小時" → counter 1.5
  // 28.22s=847f: "認真的算下來，一年你就省了75個小時" → counter 75
  // 897f: callout 2
  const introStyle = useFadeUp(64);
  const resultStyle = useFadeUpElastic(680);

  // Scroll: FlowDiagram (2×2 grid) is ~950px tall; scroll must start before result card at 680f
  // Trigger at 440f (before CounterAnim 1.5h at 515f) so result card is in view when it fades in
  const scrollY = interpolate(frame, [440, 600], [0, 420 * S], clamp);

  const callouts: Callout[] = [
    { from: 516, to: 720, sender: "講師", text: "手動整理 = 每週 1.5 小時的隱形成本" },
    { from: 897, to: 1200, sender: "講師", text: "自動化後：一年省下 75 小時" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={45} scrollY={scrollY}>
        <SectionHeader num="03" title="具體例子：量化價值" startFrame={5} />

        <Card fadeStyle={introStyle} marginBottom={24 * S}>
          假設你每週都要手動整理跨部門的進度匯報，拼湊各個試算表、對欄位格式、修整排版，
          <br /><strong style={{ color: C.primary }}>每次要花一個半小時。</strong>
        </Card>

        {/* Flow diagram: 4 dept reports → 跨部門彙整 */}
        <FlowDiagram startFrame={199} />

        {/* Result card — 備注1結果 with CounterAnim */}
        <div style={{
          background: "linear-gradient(135deg, rgba(124,255,178,0.1), rgba(0,0,0,0))",
          border: `1px solid rgba(124,255,178,0.3)`,
          borderRadius: 20 * S,
          padding: `${24 * S}px ${36 * S}px`,
          marginTop: 20 * S,
          textAlign: "center" as const,
          ...resultStyle,
        }}>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 32 * S, color: C.text, lineHeight: 1.7, margin: 0,
          }}>
            {/* CounterAnim 1.5 小時 at local_frame 515 */}
            自動化後 → 每週省{" "}
            <CounterAnim from={0} to={1.5} startFrame={515} suffix="小時" fontSize={40 * S} decimals={1} />
            <br />
            {/* CounterAnim 75 小時 at local_frame 847 */}
            一年省下{" "}
            <CounterAnim from={0} to={75} startFrame={847} suffix="小時" fontSize={48 * S} />
          </p>
        </div>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// Flow diagram: A, B, C, D reports in 2×2 grid → arrow → 跨部門彙整
// Per pipeline rule: 4+ assets must use 2×2 grid layout
const FlowDiagram: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const imgFiles = ["部門進度匯報A.png", "部門進度匯報B.png", "部門進度匯報C.png", "部門進度匯報D.png"];
  const labels = ["部門 A", "部門 B", "部門 C", "部門 D"];
  const IMG_W = 320 * S;
  const IMG_H = 210 * S;
  // stagger timings per visual-spec: A=199f, B=256f, C=298f, D=359f
  const imgStarts = [199, 256, 298, 359];

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 40 * S, padding: `${12 * S}px 0`,
    }}>
      {/* Left: 2×2 grid of A, B, C, D */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 20 * S,
      }}>
        {imgFiles.map((file, i) => {
          const s = imgStarts[i];
          const f = Math.max(0, frame - s);
          const prog = spring({ frame: f, fps: 30, config: { damping: 200 }, durationInFrames: 21 });
          const opacity = interpolate(f, [0, 10], [0, 1], clamp);
          const y = interpolate(prog, [0, 1], [8 * S, 0]);
          return (
            <div key={i} style={{ opacity, transform: `translateY(${y}px)`, textAlign: "center" as const }}>
              <Img
                src={staticFile(`assets/1-1/${file}`)}
                style={{
                  width: IMG_W, height: IMG_H, objectFit: "cover" as const,
                  borderRadius: 8 * S, border: `1px solid ${C.border}`,
                  display: "block",
                }}
              />
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 20 * S, color: C.muted, display: "block", marginTop: 6 * S,
              }}>{labels[i]}</span>
            </div>
          );
        })}
      </div>

      {/* Arrow — at 395f per visual-spec */}
      <FlowArrow startFrame={395} />

      {/* Right: 跨部門彙整 — at 395f */}
      <FinalResult startFrame={395} />
    </div>
  );
};

// 備注2: 跨部門彙整.mp4 — full-screen overlay, 影片置中 (per script 呈現方式)
// Lives in its OWN Sequence at root level (global frame 6635) so local frame=0 when video appears.
// This is critical: Video startFrom={0} + local frame 0 → plays from beginning correctly.
// If placed inside Scene 3.2 Sequence, local frame would be 1241 → video seeks to 41s (past end) → frozen.
// Sequence duration 260f (8.57s × 30fps, rounded up). Overlaps segment 3.3 by 208f → mute segment 3.3.
const KuabumenVideoOverlay: React.FC = () => {
  const frame = useCurrentFrame(); // local 0–259 (Sequence handles global timing)
  const dur = 260;
  const fadeIn  = interpolate(frame, [0, 18], [0, 1], clamp);
  const fadeOut = interpolate(frame, [dur - 18, dur], [1, 0], clamp);
  const opacity = Math.min(fadeIn, fadeOut);
  return (
    <AbsoluteFill style={{
      zIndex: 999,
      backgroundColor: "#000000",
      opacity,
    }}>
      <Video
        src={staticFile("video/kuabumen-demo.mp4")}
        startFrom={0}
        style={{ width: "100%", height: "100%", objectFit: "contain" as const }}
      />
    </AbsoluteFill>
  );
};

const FlowArrow: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const width = interpolate(
    spring({ frame: f, fps: 30, config: { damping: 200 }, durationInFrames: 18 }),
    [0, 1], [0, 80 * S]
  );
  const opacity = interpolate(f, [0, 8], [0, 1], clamp);
  return (
    <div style={{ display: "flex", alignItems: "center", opacity }}>
      <div style={{ height: 3 * S, width, background: C.primary, borderRadius: 99 }} />
      <div style={{
        width: 0, height: 0,
        borderTop: `${8 * S}px solid transparent`,
        borderBottom: `${8 * S}px solid transparent`,
        borderLeft: `${14 * S}px solid ${C.primary}`,
      }} />
    </div>
  );
};

const FinalResult: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const opacity = interpolate(f, [0, 15], [0, 1], clamp);
  const scale = interpolate(
    spring({ frame: f, fps: 30, config: { damping: 14 } }),
    [0, 1], [0.92, 1]
  );
  return (
    <div style={{ opacity, transform: `scale(${scale})`, textAlign: "center" as const }}>
      <Img
        src={staticFile("assets/1-1/跨部門彙整.png")}
        style={{
          width: 400 * S, height: 260 * S, objectFit: "cover" as const,
          borderRadius: 12 * S,
          border: `2px solid rgba(124,255,178,0.4)`,
          boxShadow: `0 0 30px rgba(124,255,178,0.2)`,
        }}
      />
      <div style={{
        fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
        fontSize: 18 * S, color: C.primary, fontWeight: 700,
        marginTop: 8 * S,
      }}>跨部門彙整</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3.3 — 動手前先搜尋 (3.3) — 6687 to 8203
// ─────────────────────────────────────────────────────────────────────────────
const Scene33Search: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  // DELAY: kuabumen mov covers first 208f of this segment → all animations offset by 208
  const DELAY = 208;
  const cardStyle = useFadeUp(20 + DELAY);
  // VTT 3.3 times are relative to audio file start; add DELAY since audio starts at frame 208
  // 13.82s=415f → 623f, 20.24s=607f, 40.32s=1210f → 1418f

  // tip1 at VTT 8.88s=266f → 474f
  const tip1 = useFadeUp(266 + DELAY);
  // tip2 at VTT 23.48s=704f → 912f
  const tip2 = useFadeUp(704 + DELAY);

  // VTT 3.3: callouts shifted by DELAY
  const callouts: Callout[] = [
    { from: 415 + DELAY, to: 650 + DELAY, sender: "講師", text: "有現成方案？直接用，省更多時間" },
    { from: 893 + DELAY, to: 1143 + DELAY, sender: "講師", text: "搜尋過程本身就是需求分析的練習" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={50}>
        <SectionHeader num="03" title="動手前先搜尋一下" startFrame={5 + DELAY} />

        <Card fadeStyle={cardStyle} marginBottom={24 * S}>
          在開始動手之前，建議先搜尋看看有沒有<strong style={{ color: C.primary }}>現成工具</strong>可以使用。
        </Card>

        {/* ComparisonChart: VTT 13.82s=415f → 623f after delay */}
        <ComparisonChart
          left={{ label: "找到現成方案 ✅", desc: "直接用，省時間，不需要自己寫" }}
          right={{ label: "沒有現成方案", desc: "搜尋過程幫助釐清需求，再開始寫程式" }}
          startFrame={415 + DELAY}
        />

        <TipBox label="現成方案" fadeStyle={tip1} marginBottom={20 * S}>
          如果你要做的東西已經有現成方案，也許根本不需要自己寫程式，直接用就好。
        </TipBox>

        <TipBox label="找不到也沒關係" fadeStyle={tip2} marginBottom={20 * S}>
          就算找到後發現不符合需求，這個過程也很有幫助——你會更清楚自己真正想要的是什麼，{" "}
          {/* HighlightPulse: VTT 40.32s=1210f → 1418f after delay */}
          對後續{" "}<HighlightPulse text="需求分析" startFrame={1210 + DELAY} />也有很大的幫助。
        </TipBox>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4.0 — 風險介紹 (4.0) — 8203 to 8961
// ─────────────────────────────────────────────────────────────────────────────
const Scene40Risk: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const riskTypes = [
    { icon: "💳", label: "帳單風險", color: "#ff9f43" },
    { icon: "🔒", label: "隱私風險", color: "#ff6b9d" },
    { icon: "⚙", label: "營運風險", color: C.primary },
  ];

  // VTT 4.0:
  // "最後一個評估的項目就會是風險的評估" at 0s
  // "包含帳單的風險、隱私的風險、還有營運的風險" at 14.7s=441f
  // stagger: 帳單 at 441f, 隱私 at 456f, 營運 at 471f (VTT-based + 15f stagger)
  const riskStarts = [441, 456, 471];

  const callouts: Callout[] = [
    { from: 134, to: 318, sender: "講師", text: "風險是這個單元最重要的部分！" },
    { from: 441, to: 650, sender: "講師", text: "三大風險：帳單、隱私、營運" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={58}>
        <SectionHeader num="04" title="風險：三個維度的評估" startFrame={5} />
        <Card fadeStyle={useFadeUp(20)} marginBottom={36 * S}>
          常見的風險有三種。我們一個一個來看。
        </Card>

        {/* Flow: 3 risk types staggered reveal per VTT 14.7s=441f */}
        <div style={{ display: "flex", gap: 24 * S, justifyContent: "center" }}>
          {riskTypes.map((r, i) => {
            const s = riskStarts[i];
            const f = Math.max(0, frame - s);
            const progress = spring({ frame: f, fps: 30, config: { damping: 200 }, durationInFrames: 18 });
            const opacity = interpolate(f, [0, 10], [0, 1], clamp);
            const y = interpolate(progress, [0, 1], [20 * S, 0]);
            return (
              <div key={i} style={{
                flex: 1,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 20 * S,
                padding: `${28 * S}px ${20 * S}px`,
                textAlign: "center" as const,
                opacity, transform: `translateY(${y}px)`,
              }}>
                <div style={{ fontSize: 44 * S, marginBottom: 12 * S, lineHeight: 1 }}>{r.icon}</div>
                <div style={{
                  fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                  fontSize: 28 * S, fontWeight: 800, color: r.color,
                }}>{r.label}</div>
              </div>
            );
          })}
        </div>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4.1 — 帳單風險 (4.1) — 8961 to 12661
// ─────────────────────────────────────────────────────────────────────────────
const Scene41Bill: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  // VTT-derived timings (actual seconds × 30):
  // 2.6s=78f: "先來看第一個，評估帳單的風險"
  // 16.06s=482f: "我們可以從最安全的情境往下看"
  // 21.64s=649f: "如果你的專案只有用到Google Apps Script...帳單風險基本上會是零"
  // 32.02s=961f: "再來如果你使用到了某一個工具，它會需要綁定你的信用卡...月費制"
  // 54.32s=1630f: "依用量計費，而且沒有上限"
  // 73.38s=2201f: "如果你連服務的收費機制都看不懂"
  // 85.68s=2570f: "先不要刷卡" → critical highlight
  // 98.04s=2941f: "最土炮的方式" → tip
  // 116.28s=3488f: "不綁信用卡" → HighlightPulse

  const cardStyle = useFadeUp(20);
  const safeFrame = 649;
  const caution1Frame = 961;
  const caution2Frame = 1630;
  const criticalFrame = 2201;
  const tipFrame = 2941;

  // VTT 4.1 callouts:
  const callouts: Callout[] = [
    { from: 78, to: 350, sender: "講師", text: "帳單出問題是很多人踩到最痛的雷" },
    { from: 2570, to: 2856, sender: "講師", text: "看不懂收費機制，先別刷卡" },
    { from: 3117, to: 3500, sender: "講師", text: "懶人法：只用不需綁信用卡的服務" },
  ];

  const scrollY = interpolate(frame, [2800, 3200], [0, 380 * S], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={65} scrollY={scrollY}>
        <SectionHeader num="04-A" title="帳單風險" startFrame={5} />
        <Card fadeStyle={cardStyle} marginBottom={28 * S}>
          從最安全的情境往下看，找到你的專案落在哪個位置。
        </Card>

        <RiskItem level="safe"     text="只使用 Google Apps Script，帳單風險為零，完全免費。"                              startFrame={safeFrame} />
        <RiskItem level="caution"  text="有需要綁信用卡的服務，但月費制或提供儲值上限，費用可以預先掌握。"              startFrame={caution1Frame} />
        <RiskItem level="caution"  text="依用量計費，但有提供儲值或硬上限機制，費用有上限可控。"                           startFrame={caution2Frame} />
        <RiskItem level="danger"   text="有服務依用量計費，且沒有硬上限——用多少扣多少，建議先試算最壞情況的花費。"       startFrame={caution2Frame + 200} />

        {/* Critical RiskItem with HighlightPulse on 看不懂收費機制 at VTT 73.38s=2201f */}
        <div style={{ marginBottom: 10 * S }}>
          <RiskItem level="critical" text="有服務的收費機制你看不懂，或無法向他人說清楚最多會花多少——先找人確認再繼續。" startFrame={criticalFrame} />
          {(() => {
            const f = Math.max(0, frame - 2514);
            const opacity = interpolate(f, [0, 8], [0, 1], clamp);
            if (f <= 0) return null;
            return (
              <div style={{
                paddingLeft: 20 * S,
                marginBottom: 4 * S,
                opacity,
                fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                fontSize: 26 * S, color: C.muted,
              }}>
                ⚠ 重點：<HighlightPulse text="看不懂收費機制" startFrame={2514} color={C.red} />，先別刷卡
              </div>
            );
          })()}
        </div>

        <TipBox label="懶人法" fadeStyle={useFadeUp(tipFrame)} marginBottom={20 * S}>
          如果不想逐項判斷，最簡單的做法就是：<strong style={{ color: C.text }}>只用不需要綁信用卡的服務</strong>。{" "}
          <HighlightPulse text="不綁信用卡" startFrame={3488} />，服務就沒辦法跟你收費，帳單風險自動歸零。
          {/* TimelineBar: 懶人法 at VTT 103.92s=3117f */}
          <TimelineBar label="懶人法安全指數" startFrame={3117} />
        </TipBox>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4.2 — 隱私風險 (4.2) — 12661 to 16495
// ─────────────────────────────────────────────────────────────────────────────
const Scene42Privacy: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  // VTT-derived timings per visual-spec:
  // safe: 25.04s=751f
  // caution_minor: 37.58s=1127f
  // caution_major: 53.96s=1619f
  // critical: 63.42s=1903f (but callout from=2451 for legal liability)
  // HighlightPulse 資安漏洞: 74.32s=2230f
  // tip: 100.2s=3006f

  const callouts: Callout[] = [
    { from: 150, to: 420, sender: "講師", text: "先列出程式會蒐集哪些資料再評估" },
    { from: 2451, to: 2750, sender: "講師", text: "涉及法律責任，找專業人士幫忙" },
    { from: 3102, to: 3450, sender: "講師", text: "去敏感化：只讓程式讀統計或匿名資料" },
  ];
  const scrollY = interpolate(frame, [2600, 3000], [0, 400 * S], clamp);
  const cardStyle = useFadeUp(20);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={72} scrollY={scrollY}>
        <SectionHeader num="04-B" title="隱私風險" startFrame={5} />
        <Card fadeStyle={cardStyle} marginBottom={28 * S}>
          先列出你的程式<strong style={{ color: C.primary }}>會蒐集或存取哪些資料</strong>（如姓名、信箱、電話、身份證字號），再針對每份資料對照以下情境：
        </Card>

        {/* RiskItems with VTT-aligned startFrames from visual-spec */}
        <RiskItem level="safe"     text="程式不蒐集任何個人資料，只處理非識別性的數據，隱私風險為零。"                 startFrame={751} />
        <RiskItem level="caution"  text="有蒐集個人資料，但外流頂多讓對方感到不滿，不會有更嚴重的後果。"              startFrame={1127} />
        <RiskItem level="danger"   text="用到公司內部資料但沒有明確取得使用授權，或資料外流會造成難以收拾的後果。"    startFrame={1619} />
        <RiskItem level="critical" text="資料外流可能面臨法律責任（如個資法、合約義務、商業機密），建議找專業人士。" startFrame={1903} />

        {/* HighlightPulse 資安漏洞 at VTT 74.32s=2230f */}
        {(() => {
          const f = Math.max(0, frame - 2230);
          const opacity = interpolate(f, [0, 8], [0, 1], clamp);
          if (f <= 0) return null;
          return (
            <div style={{
              paddingLeft: 20 * S, marginBottom: 10 * S, opacity,
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 26 * S, color: C.muted,
            }}>
              💡 建議請 AI 幫你檢查程式碼，確認有無潛在<HighlightPulse text="資安漏洞" startFrame={2230} color={C.orange} />
            </div>
          );
        })()}

        <TipBox label="降低隱私風險" fadeStyle={useFadeUp(3006)} marginBottom={20 * S}>
          如果原始資料含個資，可以考慮<strong style={{ color: C.text }}>只讓程式讀取統計資料或匿名化後的資料</strong>，
          而非直接碰原始個資。這樣即使程式出問題，外流的也只是無法識別個人的數據。
        </TipBox>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4.3 — 營運風險 (4.3) — 16495 to 20061
// ─────────────────────────────────────────────────────────────────────────────
const Scene43Ops: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  // VTT-derived timings (actual seconds × 30):
  // 11.92s=358f: "使用者如果越多"
  // 14.78s=443f: "只有你自己或你叫得出名字的少數幾個人...營運風險為零"
  // 27.8s=834f: "限制在組織或內部團隊使用，沒有要對外公開"
  // 41.08s=1232f: "想要公開讓陌生人去使用"
  // 72.72s=2182f: "如果說你的程式預計會同時有超過100個人在使用" → CounterAnim
  // 75.68s=2270f: callout "動手之前，先找有經驗的人"
  // 99.5s=2985f: "先從低風險的版本開始"
  // 111.72s=3352f: "新手村就想直接跳級去打大Boss" → HighlightPulse

  const callouts: Callout[] = [
    { from: 358, to: 650, sender: "講師", text: "使用者越多，範圍越廣，風險越高" },
    { from: 2985, to: 3300, sender: "講師", text: "先從小範圍練起，再往規模化前進" },
  ];
  const scrollY = interpolate(frame, [2400, 2800], [0, 400 * S], clamp);
  const cardStyle = useFadeUp(20);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={79} scrollY={scrollY}>
        <SectionHeader num="04-C" title="營運風險" startFrame={5} />
        <Card fadeStyle={cardStyle} marginBottom={28 * S}>
          程式要給多少人用、在什麼範圍內使用，決定了營運風險的高低。
          <strong style={{ color: C.primary }}> 使用者越多、範圍越廣，風險越高。</strong>
        </Card>

        <RiskItem level="safe"     text="只有你自己或你叫得出名字的少數幾個人使用，營運風險為零。"                          startFrame={443} />
        <RiskItem level="caution"  text="限制在組織或團隊內部使用，不對外公開，風險很低。"                                   startFrame={834} />
        <RiskItem level="danger"   text="公開讓不特定的人使用：要想清楚各種回饋、服務中斷、費用超出預期的情境。"           startFrame={1232} />

        {/* RiskItem critical + CounterAnim for > 100 人 at VTT 72.72s=2182f */}
        <div>
          <RiskItem level="critical" text="預計同時有超過 100 人使用：架構考量完全不同，建議先找有經驗的人討論。"             startFrame={2028} />
          {(() => {
            const f = Math.max(0, frame - 2182);
            const opacity = interpolate(f, [0, 8], [0, 1], clamp);
            if (f <= 0) return null;
            return (
              <div style={{
                paddingLeft: 20 * S, marginBottom: 10 * S, opacity,
                display: "flex", alignItems: "center", gap: 10 * S,
                fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                fontSize: 26 * S, color: C.muted,
              }}>
                ⚠ 超過{" "}
                <CounterAnim from={10} to={100} startFrame={2182} suffix="人" fontSize={32 * S} color={C.orange} />
                {" "}同時使用時，風險門檻完全不同
              </div>
            );
          })()}
        </div>

        <TipBox label="想做大？先從小的練起" fadeStyle={useFadeUp(2757)} marginBottom={20 * S}>
          如果目標是打造很多人用的服務，建議先從低風險版本累積實戰經驗，
          有能力處理更複雜的狀況後再往規模化前進。<br /><br />
          {/* HighlightPulse: VTT 111.72s=3352f "新手村 → 大Boss" */}
          <HighlightPulse text="新手村" startFrame={3352} />不要直接跳級挑戰{" "}<HighlightPulse text="大Boss" startFrame={3367} />
        </TipBox>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 5.1 — 風險判讀總結 (5.1) — 20061 to 21844
// ─────────────────────────────────────────────────────────────────────────────
const Scene51Summary: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const cardStyle = useFadeUp(20);
  const levels = [
    { color: "#7cffb2", label: "只看到綠色", desc: "放心做，享受 Vibe Coding 的樂趣" },
    { color: "#ffd166", label: "有看到黃色", desc: "要帶腦做，注意細節，讓 AI 幫你檢查程式碼" },
    { color: "#ff9f43", label: "有看到橘色", desc: "需要謹慎處理，仔細規劃後再動手" },
    { color: "#ff6b6b", label: "有看到紅色", desc: "可能超出個人與 AI 的能力範圍，建議諮詢專家" },
  ];
  const callouts: Callout[] = [
    // VTT: 4.8s=144f: "你可以使用checklist並且以顏色作為等級"
    { from: 144, to: 400, sender: "講師", text: "用顏色判讀三個維度的風險等級" },
    // VTT: 17.8s=534f: "如果說三個方面評估下來，都是綠色的安全狀況"
    { from: 534, to: 752, sender: "講師", text: "三個面向都是綠燈？放心去 Vibe Coding！" },
  ];

  // VTT: 25.08s=752f: "好好的享受AI coding的樂趣" → HighlightPulse
  // VTT: 52.06s=1562f: "劝你不要自己埋頭苦幹"

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={86}>
        <SectionHeader num="05" title="風險判讀總結" startFrame={5} />
        <Card fadeStyle={cardStyle} marginBottom={28 * S}>
          把三個維度的評估結果，用顏色來判讀：
        </Card>

        {levels.map((l, i) => {
          // VTT: green=8.5s=254f, yellow=10.86s=326f, orange=12.66s=380f, red=15.08s=452f
          const starts = [255, 327, 381, 453];
          const s = starts[i];
          const itemStyle = useFadeUpItemLocal(frame, s);
          return (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 20 * S,
              background: `${l.color}10`,
              border: `1px solid ${l.color}33`,
              borderLeft: `3px solid rgba(124,255,178,0.4)`,
              borderRadius: `0 ${14 * S}px ${14 * S}px 0`,
              padding: `${16 * S}px ${24 * S}px`,
              marginBottom: 12 * S,
              ...itemStyle,
            }}>
              <div style={{
                width: 18 * S, height: 18 * S, borderRadius: "50%",
                background: l.color,
                flexShrink: 0, marginTop: 6 * S,
                boxShadow: `0 0 12px ${l.color}88`,
              }} />
              <div>
                {/* HighlightPulse on each color label */}
                <strong style={{
                  fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                  fontSize: 26 * S, display: "block",
                  marginBottom: 4 * S,
                }}>
                  <HighlightPulse text={l.label} startFrame={s} color={l.color} />
                </strong>
                <p style={{
                  fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                  fontSize: 26 * S, color: C.text, margin: 0, lineHeight: 1.7,
                }}>{l.desc}</p>
              </div>
            </div>
          );
        })}

        {/* HighlightPulse: Vibe Coding at VTT 25.08s=752f */}
        {(() => {
          const f = Math.max(0, frame - 752);
          const opacity = interpolate(f, [0, 8], [0, 1], clamp);
          if (f <= 0) return null;
          return (
            <div style={{
              textAlign: "center" as const,
              marginTop: 16 * S,
              opacity,
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 28 * S,
              color: C.muted,
            }}>
              三燈全綠？盡情享受{" "}<HighlightPulse text="Vibe Coding" startFrame={752} />！
            </div>
          );
        })()}

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// Local non-hook version for use inside map
function useFadeUpItemLocal(frame: number, startFrame: number): React.CSSProperties {
  const f = Math.max(0, frame - startFrame);
  const dur = Math.round(0.65 * 30);
  const progress = interpolate(f, [0, dur], [0, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(f, [0, 0.3 * 30], [0, 1], clamp);
  const y = interpolate(progress, [0, 1], [10 * S, 0]);
  return { opacity, transform: `translateY(${y}px)` };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 6.1 — 本章收尾 (6.1) — 21844 to 24742
// ─────────────────────────────────────────────────────────────────────────────
const Scene61Takeaway: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  // VTT 6.1:
  // item1: 6.38s=191f: "第一個，在計劃的階段，我們要評估三件事情"
  // item2: 15.7s=471f: "再來就是關於時間的部分，建議你不用太精準地估算時間"
  // item3: 27.6s=828f: "第三個，是建議你在開始動手之前，先想清楚這件事情的價值"
  // item4: 47.02s=1411f: "最後，是我們這一次花了很多時間在講的風險評估"
  // item5: 61.02s=1831f: "其實啊，不管是哪一種風險，最簡單的原則就是從小的開始做"
  // HighlightPulse: 64.06s=1922f: "從小的開始做"
  // next: 81.26s=2438f: "在下個單元，我們會進入到軟體開發生命週期的第二個步驟——需求分析"

  const callouts: Callout[] = [
    { from: 1831, to: 2100, sender: "講師", text: "核心原則：從小開始，確認安全再擴大" },
    { from: 2438, to: 2700, sender: "講師", text: "下一單元：需求分析，把模糊想法變成精準需求" },
  ];

  // VTT-aligned startFrames for each takeaway item
  const takeawayStarts = [191, 471, 828, 1411, 1831];
  const takeaways = [
    "計劃階段評估三件事：投入時間、價值、風險",
    "時間箱法：先決定願意投入多少時間，在那個範圍內盡力推進",
    "想清楚價值：量化成時間或金錢更有感，動手前也先搜尋有沒有現成方案",
    "三大風險：帳單（不把卡號交出去最安全）、隱私（去敏感化降低風險）、營運（先從小範圍開始）",
    "不管哪種風險，最簡單的原則就是從小開始做，確認安全後再慢慢往更大規模前進",
  ];

  const headerStyle = useFadeUpHeader(10);

  // Scroll to show all items at item4+
  const scrollY = interpolate(frame, [1200, 1600], [0, 300 * S], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <SceneWrap progressPct={100} scrollY={scrollY}>
        {/* Takeaway title */}
        <div style={{
          background: "linear-gradient(135deg, rgba(124,255,178,0.08), rgba(0,0,0,0))",
          border: `1px solid rgba(124,255,178,0.25)`,
          borderRadius: 22 * S,
          padding: `${36 * S}px ${40 * S}px`,
          marginBottom: 20 * S,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 16 * S, fontWeight: 700, color: C.primary,
            letterSpacing: "0.1em", textTransform: "uppercase" as const,
            marginBottom: 28 * S,
            display: "flex", alignItems: "center", gap: 12 * S,
            ...headerStyle,
          }}>
            <div style={{ width: 6 * S, height: 6 * S, background: C.primary, borderRadius: "50%", boxShadow: "0 0 10px #7cffb2" }} />
            本章重點整理
          </div>

          {/* Use WordReveal for each takeaway item per VTT-aligned startFrames */}
          {takeaways.map((item, i) => {
            const s = takeawayStarts[i];
            const itemStyle = useFadeUpItemLocal(frame, s);
            return (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 16 * S,
                marginBottom: 16 * S,
                borderLeft: `3px solid rgba(124,255,178,0.4)`,
                paddingLeft: 20 * S,
                ...itemStyle,
              }}>
                <div style={{
                  width: 30 * S, height: 30 * S, borderRadius: "50%",
                  background: C.primary, color: "#000",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 14 * S, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: 4 * S,
                }}>{i + 1}</div>
                {/* WordReveal for each item text */}
                <div style={{
                  fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                  fontSize: 26 * S, color: C.text, lineHeight: 1.75,
                }}>
                  <WordReveal text={item} startFrame={s} fontSize={26 * S} color={C.text} fontWeight={400} />
                </div>
              </div>
            );
          })}

          {/* HighlightPulse: 從小的開始做 at VTT 64.06s=1922f */}
          {(() => {
            const f = Math.max(0, frame - 1922);
            const opacity = interpolate(f, [0, 8], [0, 1], clamp);
            if (f <= 0) return null;
            return (
              <div style={{
                textAlign: "center" as const,
                marginTop: 12 * S,
                opacity,
                fontSize: 30 * S,
              }}>
                核心：<HighlightPulse text="從小的開始做" startFrame={1922} />
              </div>
            );
          })()}
        </div>

        {/* Next chapter preview — VTT 81.26s=2438f */}
        <div style={{
          background: "rgba(255,209,102,0.05)",
          border: `1px solid rgba(255,209,102,0.2)`,
          borderRadius: 16 * S,
          padding: `${20 * S}px ${28 * S}px`,
          ...useFadeUpItemLocal(frame, 2438),
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 14 * S, color: C.yellow,
            fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 * S,
          }}>NEXT</div>
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 26 * S, color: C.text, lineHeight: 1.7, margin: 0,
          }}>
            需求分析：把腦中模糊的想法，轉換成 AI 能夠精準執行的需求描述
          </p>
        </div>

      </SceneWrap>
      <CalloutLayer callouts={callouts} />
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FullVideo04 — Root composition
// ─────────────────────────────────────────────────────────────────────────────
export const FullVideo04: React.FC = () => {
  // Prefetch the demo video so it's ready when the overlay appears
  React.useEffect(() => {
    const el = document.createElement("video");
    el.src = staticFile("video/kuabumen-demo.mp4");
    el.preload = "auto";
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* BGM — 全片背景音樂 */}
      <Audio src={staticFile("audio/course_background_music.wav")} volume={0.10} loop />

      {/* Audio tracks */}
      {/* Video overlay: global 6635–6895 (260f) */}
      {/* Seg 3.2 (i===3): mute from local 1241 (when mov starts) */}
      {/* Seg 3.3 (i===4): audio delayed 208f so it starts fresh after mov ends */}
      {SEGMENTS.map((seg, i) => {
        if (i === 4) {
          // Delay audio start by 208f — plays from beginning of file after kuabumen mov finishes
          return (
            <Sequence key={seg.id} from={SEG_STARTS[i]} durationInFrames={seg.frames}>
              <Sequence from={208}>
                <Audio src={staticFile(`audio/${seg.file}`)} volume={1.0} />
              </Sequence>
            </Sequence>
          );
        }
        const vol = i === 3
          ? (f: number) => f >= 1241 ? 0 : 1
          : 1.0;
        return (
          <Sequence key={seg.id} from={SEG_STARTS[i]} durationInFrames={seg.frames}>
            <Audio src={staticFile(`audio/${seg.file}`)} volume={vol} />
          </Sequence>
        );
      })}

      {/* Scene 1.1 — Hero */}
      <Sequence from={SEG_STARTS[0]} durationInFrames={SEGMENTS[0].frames}>
        <Scene11Hero dur={SEGMENTS[0].frames} />
      </Sequence>

      {/* Scene 2.1 — 投入時間：時間箱法 */}
      <Sequence from={SEG_STARTS[1]} durationInFrames={SEGMENTS[1].frames}>
        <Scene21Timebox dur={SEGMENTS[1].frames} />
      </Sequence>

      {/* Scene 3.1 — 價值 */}
      <Sequence from={SEG_STARTS[2]} durationInFrames={SEGMENTS[2].frames}>
        <Scene31Value dur={SEGMENTS[2].frames} />
      </Sequence>

      {/* Scene 3.2 — 具體例子 (PNGs) */}
      <Sequence from={SEG_STARTS[3]} durationInFrames={SEGMENTS[3].frames}>
        <Scene32Example dur={SEGMENTS[3].frames} />
      </Sequence>

      {/* 跨部門彙整 full-screen video overlay — MUST be at root level in its own Sequence */}
      {/* Global start: SEG_STARTS[3] + 1241 = 5394 + 1241 = 6635 (VTT: "更有感覺" at 41.38s) */}
      {/* Local frame 0 when Sequence starts → Video startFrom={0} plays from beginning */}
      <Sequence from={6635} durationInFrames={260}>
        <KuabumenVideoOverlay />
      </Sequence>

      {/* Scene 3.3 — 動手前先搜尋 */}
      <Sequence from={SEG_STARTS[4]} durationInFrames={SEGMENTS[4].frames}>
        <Scene33Search dur={SEGMENTS[4].frames} />
      </Sequence>

      {/* Scene 4.0 — 風險介紹 */}
      <Sequence from={SEG_STARTS[5]} durationInFrames={SEGMENTS[5].frames}>
        <Scene40Risk dur={SEGMENTS[5].frames} />
      </Sequence>

      {/* Scene 4.1 — 帳單風險 */}
      <Sequence from={SEG_STARTS[6]} durationInFrames={SEGMENTS[6].frames}>
        <Scene41Bill dur={SEGMENTS[6].frames} />
      </Sequence>

      {/* Scene 4.2 — 隱私風險 */}
      <Sequence from={SEG_STARTS[7]} durationInFrames={SEGMENTS[7].frames}>
        <Scene42Privacy dur={SEGMENTS[7].frames} />
      </Sequence>

      {/* Scene 4.3 — 營運風險 */}
      <Sequence from={SEG_STARTS[8]} durationInFrames={SEGMENTS[8].frames}>
        <Scene43Ops dur={SEGMENTS[8].frames} />
      </Sequence>

      {/* Scene 5.1 — 風險判讀總結 */}
      <Sequence from={SEG_STARTS[9]} durationInFrames={SEGMENTS[9].frames}>
        <Scene51Summary dur={SEGMENTS[9].frames} />
      </Sequence>

      {/* Scene 6.1 — 本章收尾 */}
      <Sequence from={SEG_STARTS[10]} durationInFrames={SEGMENTS[10].frames}>
        <Scene61Takeaway dur={SEGMENTS[10].frames} />
      </Sequence>
    </AbsoluteFill>
  );
};
