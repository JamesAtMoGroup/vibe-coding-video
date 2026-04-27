import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
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
  primaryLight: "rgba(124,255,178,0.07)",
  border:       "rgba(124,255,178,0.14)",
  yellow:       "#ffd166",
  yellowBorder: "rgba(255,209,102,0.2)",
  yellowLight:  "rgba(255,209,102,0.08)",
  blue:         "#7cd4ff",
  blueLight:    "rgba(124,212,255,0.1)",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const W = 3840;
const H = 2160;
const NAV_H       = 72  * S;   // 144px
const SUBTITLE_H  = 160 * S;   // 320px
const CONTAINER_W = 1500 * S;  // 3000px

// ─────────────────────────────────────────────────────────────────────────────
// Segments
// frame counts from ffprobe (duration × 30)
// 1.1=1647 2.1=1328 3.0=1639 3.1~6=13435 4.1=1466 4.2=2396
// 4.3=1204 5.1=2088 6.1=3551
// ─────────────────────────────────────────────────────────────────────────────
export const SEG_STARTS = [
  0,     // 1.1
  1647,  // 2.1
  2975,  // 3.0
  4614,  // 3.1~6 (mp4)
  18049, // 4.1
  19515, // 4.2
  21911, // 4.3
  23115, // 5.1
  25203, // 6.1
];
export const TOTAL_FRAMES_06 = 28754;

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
  fontWeight?: number;
  style?: React.CSSProperties;
}> = ({ text, startFrame, fontSize = 36 * S, color = C.text, fontWeight = 700, style = {} }) => {
  const frame = useCurrentFrame();
  const words = text.split(/(\s+)/);
  let wordIndex = 0;
  return (
    <span style={{ display: "inline", fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize, fontWeight, color, ...style }}>
      {words.map((word, i) => {
        if (/^\s+$/.test(word)) return <span key={i}>{word}</span>;
        const wf = wordIndex++;
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
// ProgressBar — CH 1-3 = 75% progress
// ─────────────────────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ progressPct?: number }> = ({ progressPct = 75 }) => {
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
        <span style={{ fontSize: 20 * S, color: C.muted }}>CH 1-3</span>
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
  color?: "green" | "yellow";
}> = ({ label = "TIP", children, fadeStyle = {}, marginBottom = 20 * S, color = "green" }) => {
  const borderColor = color === "yellow" ? "rgba(255,209,102,0.25)" : "rgba(124,255,178,0.22)";
  const bgColor     = color === "yellow" ? "rgba(255,209,102,0.05)" : "rgba(124,255,178,0.05)";
  const labelColor  = color === "yellow" ? C.yellow : C.primary;
  const textColor   = color === "yellow" ? "#ffe8a0" : "#c8ffe0";
  return (
    <div style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 16 * S, padding: `${20 * S}px ${28 * S}px`, marginBottom, ...fadeStyle }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, fontWeight: 700, color: labelColor, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 10 * S, display: "flex", alignItems: "center", gap: 8 * S }}>
        <div style={{ width: 6 * S, height: 6 * S, background: labelColor, borderRadius: "50%", boxShadow: `0 0 10px ${labelColor}` }} />
        {label}
      </div>
      <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: textColor, lineHeight: 1.75, margin: 0 }}>
        {children}
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SymbolCard — for Markdown / engineer symbols
// ─────────────────────────────────────────────────────────────────────────────
const SymbolCard: React.FC<{
  badge: string;
  name: string;
  desc: React.ReactNode;
  inputLines: string[];
  outputLines: React.ReactNode[];
  fadeStyle?: React.CSSProperties;
  accentColor?: string;
}> = ({ badge, name, desc, inputLines, outputLines, fadeStyle = {}, accentColor = C.primary }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 22 * S, padding: `${22 * S}px ${30 * S}px`,
    marginBottom: 20 * S, ...fadeStyle,
  }}>
    {/* Header */}
    <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 16 * S }}>
      <span style={{
        fontFamily: "'Space Mono', monospace", fontSize: 22 * S, fontWeight: 700,
        color: accentColor, background: `rgba(124,255,178,0.1)`,
        border: `1px solid rgba(124,255,178,0.25)`,
        padding: `${4 * S}px ${14 * S}px`, borderRadius: 8 * S,
        whiteSpace: "nowrap" as const, letterSpacing: "0.02em",
      }}>{badge}</span>
      <span style={{
        fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
        fontSize: 28 * S, fontWeight: 700, color: C.text,
      }}>{name}</span>
    </div>
    {/* Desc */}
    <p style={{
      fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
      fontSize: 24 * S, color: C.muted, lineHeight: 1.75, marginBottom: 16 * S, margin: 0,
    }}>{desc}</p>
    {/* Code demo */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 * S, marginTop: 16 * S }}>
      {/* Input */}
      <div style={{ borderRadius: 10 * S, overflow: "hidden" }}>
        <div style={{
          background: "rgba(124,255,178,0.1)", color: C.primary,
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S, fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase" as const,
          padding: `${6 * S}px ${14 * S}px`,
        }}>你輸入</div>
        <div style={{
          padding: `${10 * S}px ${14 * S}px`,
          fontFamily: "'Space Mono', monospace", fontSize: 20 * S, lineHeight: 1.8,
          background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.06)`,
          color: C.primary,
        }}>
          {inputLines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
      {/* Output */}
      <div style={{ borderRadius: 10 * S, overflow: "hidden" }}>
        <div style={{
          background: "rgba(255,209,102,0.1)", color: C.yellow,
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S, fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase" as const,
          padding: `${6 * S}px ${14 * S}px`,
        }}>AI 理解為</div>
        <div style={{
          padding: `${10 * S}px ${14 * S}px`,
          fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 20 * S, lineHeight: 1.8,
          background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.06)`,
          color: C.muted,
        }}>
          {outputLines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SummaryItem — left-border list item
// ─────────────────────────────────────────────────────────────────────────────
const SummaryItem: React.FC<{
  num: string; text: React.ReactNode;
  fadeStyle?: React.CSSProperties;
}> = ({ num, text, fadeStyle = {} }) => (
  <div style={{
    display: "flex", alignItems: "flex-start", gap: 20 * S,
    padding: `${16 * S}px ${24 * S}px`,
    borderLeft: `3px solid rgba(124,255,178,0.4)`,
    marginBottom: 16 * S,
    ...fadeStyle,
  }}>
    <span style={{
      fontFamily: "'Space Mono', monospace", fontSize: 20 * S, fontWeight: 700,
      color: C.primary, background: "rgba(124,255,178,0.15)",
      border: "1px solid rgba(124,255,178,0.3)",
      borderRadius: 99, padding: `${4 * S}px ${12 * S}px`,
      whiteSpace: "nowrap" as const, flexShrink: 0, marginTop: 2 * S,
    }}>{num}</span>
    <span style={{
      fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
      fontSize: 26 * S, color: C.text, lineHeight: 1.7,
    }}>{text}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// iMessage Callout
// ─────────────────────────────────────────────────────────────────────────────
const NOTIF_W      = 420 * S;
const NOTIF_TOP    = 12  * S;
const NOTIF_RIGHT  = 20  * S;
const NOTIF_SLOT   = 200 * S;
const FADE_OUT_F   = 50;

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
  const localF    = frame - c.from;
  const duration  = c.to - c.from;
  const totalVis  = duration + FADE_OUT_F;
  if (localF < 0 || localF >= totalVis) return null;

  let totalYPush = 0;
  for (const newer of allCallouts) {
    if (newer.from <= c.from) continue;
    if (frame < newer.from) continue;
    const pushP = spring({ frame: frame - newer.from, fps, config: { damping: 22, stiffness: 120 } });
    totalYPush += NOTIF_SLOT * pushP;
  }

  const entryP = spring({ frame: localF, fps, config: { damping: 22, stiffness: 130 } });
  const slideY = interpolate(entryP, [0, 1], [-(200 * S), 0], clamp);
  const opacity = interpolate(localF, [0, 10, duration, totalVis], [0, 1, 1, 0], clamp);
  const stackDepth = totalYPush / NOTIF_SLOT;
  const depthAlpha = interpolate(stackDepth, [0, 1, 2], [1, 0.65, 0.35], clamp);

  const CHARS_PER_FRAME = 0.85;
  const charsVisible = interpolate(Math.max(0, localF - 14), [0, c.text.length / CHARS_PER_FRAME], [0, c.text.length], clamp);
  const displayText = c.text.slice(0, Math.floor(charsVisible));

  const iconSize  = 52 * S;
  const fontBase  = 22 * S;
  const fontBody  = 26 * S;

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
        backdropFilter: "blur(48px)", WebkitBackdropFilter: "blur(48px)",
        border: `${1 * S}px solid rgba(255,255,255,0.13)`,
        borderRadius: 14 * S,
        boxShadow: `0 ${8 * S}px ${40 * S}px rgba(0,0,0,0.6)`,
        padding: `${10 * S}px ${14 * S}px`,
        display: "flex", gap: 11 * S, alignItems: "flex-start",
      }}>
        {/* iMessage icon */}
        <div style={{
          width: iconSize, height: iconSize, borderRadius: 9 * S,
          background: "linear-gradient(145deg, #3DDC6A 0%, #25A244 100%)",
          boxShadow: `0 ${2 * S}px ${10 * S}px rgba(52,199,89,0.45)`,
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ position: "relative", width: 22 * S, height: 20 * S }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 22 * S, height: 16 * S, background: "white", borderRadius: 5 * S, opacity: 0.95 }} />
            <div style={{ position: "absolute", bottom: 0, left: 4 * S, width: 0, height: 0, borderLeft: `${5 * S}px solid transparent`, borderTop: `${6 * S}px solid white`, opacity: 0.95 }} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 * S }}>
            <span style={{ fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif", fontSize: fontBase, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>iMessage</span>
            <span style={{ fontFamily: "-apple-system,'SF Pro Text',system-ui,sans-serif", fontSize: fontBase - 2 * S, color: "rgba(255,255,255,0.45)" }}>now</span>
          </div>
          <div style={{ fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif", fontSize: fontBase, fontWeight: 600, color: "rgba(255,255,255,0.92)", marginBottom: 3 * S }}>{c.sender}</div>
          <div style={{ fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif", fontSize: fontBody, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{displayText}</div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SceneWrap — scrollable content area
// ─────────────────────────────────────────────────────────────────────────────
const SceneWrap: React.FC<{
  children: React.ReactNode;
  scrollY?: number;
}> = ({ children, scrollY = 0 }) => (
  <div style={{
    position: "absolute",
    top: NAV_H, left: 0, right: 0,
    height: H - NAV_H - SUBTITLE_H,
    overflow: "hidden",
  }}>
    <div style={{
      width: CONTAINER_W,
      margin: "0 auto",
      paddingTop: 40 * S,
      paddingBottom: 40 * S,
      transform: `translateY(${-scrollY}px)`,
    }}>
      {children}
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 1.1 — Hero: 開場白 (frames 0–1647)
// ═════════════════════════════════════════════════════════════════════════════
const Scene11Hero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = 1647;

  // VTT-based start frames (local)
  // "還有一些特殊的符號" → 00:18.760 → frame 563
  // "就叫做Markdown" → 00:24.620 → frame 739
  // Callout: "在程式領域已經有共同約定" → 00:43.52 → frame 1306
  const symbolsStart = 563;
  const markdownStart = 739;

  const callouts: Callout[] = [
    { from: 1306, to: 1466, sender: "James", text: "全球工程師圈約定好，AI 也完全看懂 ✓" },
  ];

  // Symbol icons appear staggered at frame 563
  const sym1 = useFadeUpElastic(symbolsStart);
  const sym2 = useFadeUpElastic(symbolsStart + 8);
  const sym3 = useFadeUpElastic(symbolsStart + 16);

  // Subtitle (chapter info)
  const subtitleStyle = useFadeUp(20);
  const titleStyle    = useFadeUpHeader(45);
  const descStyle     = useFadeUp(80);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={75} />
        <SceneWrap>
          {/* Chapter badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 24 * S, ...subtitleStyle }}>
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.primary,
              border: `1px solid ${C.primary}`, padding: `${4 * S}px ${14 * S}px`,
              borderRadius: 99, letterSpacing: "0.05em",
              textShadow: "0 0 10px rgba(124,255,178,0.4)",
            }}>CH 1-3</span>
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted,
              background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`,
              padding: `${4 * S}px ${12 * S}px`, borderRadius: 99,
            }}>SDLC 第二步</span>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 32 * S, ...titleStyle }}>
            <h1 style={{
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 72 * S, fontWeight: 900, lineHeight: 1.2,
              letterSpacing: "-0.02em", color: C.text, margin: 0,
            }}>
              Markdown：
              <br />
              <span style={{ color: C.primary }}>AI 看得懂的特殊符號</span>
            </h1>
          </div>

          {/* Desc */}
          <p style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 28 * S, color: C.muted, lineHeight: 1.7,
            maxWidth: 900 * S, marginBottom: 48 * S,
            ...descStyle,
          }}>
            學會這些符號，你就能用更少的字，讓 AI 更精準地理解你的意思。
          </p>

          {/* Symbol icons — appear at frame 563 */}
          <div style={{ display: "flex", gap: 32 * S }}>
            {[
              { badge: "#", label: "井字號", desc: "標題層級", s: sym1 },
              { badge: "-", label: "減號", desc: "清單", s: sym2 },
              { badge: "```", label: "倒引號", desc: "程式碼區塊", s: sym3 },
            ].map(({ badge, label, desc, s }) => (
              <div key={label} style={{
                display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 12 * S,
                background: "rgba(124,255,178,0.07)", border: `1px solid rgba(124,255,178,0.2)`,
                borderRadius: 20 * S, padding: `${24 * S}px ${36 * S}px`,
                minWidth: 140 * S, ...s,
              }}>
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 44 * S, fontWeight: 700,
                  color: C.primary, textShadow: "0 0 20px rgba(124,255,178,0.6)",
                }}>{badge}</span>
                <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 20 * S, fontWeight: 700, color: C.text }}>{label}</span>
                <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 18 * S, color: C.muted }}>{desc}</span>
              </div>
            ))}
          </div>

          {/* WordReveal "Markdown" — frame 739 */}
          <div style={{ marginTop: 48 * S, fontSize: 52 * S }}>
            <WordReveal
              text="Markdown"
              startFrame={markdownStart}
              fontSize={52 * S}
              color={C.primary}
              fontWeight={900}
            />
            <span style={{
              fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
              fontSize: 36 * S, color: C.muted, fontWeight: 400,
              opacity: interpolate(frame, [markdownStart + 20, markdownStart + 40], [0, 1], clamp),
            }}> — 從鍵盤到 AI 的共同語言</span>
          </div>
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 2.1 — What is Markdown? (frames 1647–2975, duration 1328)
// ═════════════════════════════════════════════════════════════════════════════
const Scene21WhatIs: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = 1328;

  // VTT local frames:
  // "Markdown是一種格式語言" → 00:02.120 → 64
  // "它就像我們的中文會有標點符號" → 00:12.940 → 388
  // "但如果加上了Markdown" → 00:38.680 → 1160
  const defStart    = 30;
  const analogyStart = 388;
  const resultStart = 1160;

  // Comparison diagram: no-markdown vs with-markdown
  const leftProg  = spring({ frame: Math.max(0, frame - analogyStart), fps: 30, config: { damping: 200 } });
  const rightProg = spring({ frame: Math.max(0, frame - (analogyStart + 15)), fps: 30, config: { damping: 200 } });

  const defStyle     = useFadeUp(defStart);
  const analogyStyle = useFadeUp(analogyStart);
  const resultStyle  = useFadeUp(resultStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={75} />
        <SceneWrap>
          <SectionHeader num="01" title="Markdown 是什麼？" startFrame={0} />

          {/* Definition card */}
          <Card fadeStyle={defStyle} marginBottom={24 * S}>
            Markdown 是一種<span style={{ color: C.primary, fontWeight: 700 }}>格式語言</span>——
            用特定符號表示文字的結構和意義，例如標題、清單、程式碼。
            AI 已完整學會這套語言。
          </Card>

          {/* Comparison diagram: 標點符號比喻 */}
          <div style={{ display: "flex", gap: 24 * S, marginBottom: 24 * S }}>
            {/* Left: without */}
            <div style={{
              flex: 1, background: C.surface, border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: 16 * S, padding: `${20 * S}px ${24 * S}px`,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(leftProg, [0, 1], [14 * S, 0])}px)`,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, marginBottom: 14 * S, letterSpacing: "0.06em" }}>❌ 沒有 Markdown</div>
              <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 22 * S, color: "#666", lineHeight: 1.6 }}>
                請幫我寫一封信件要有主旨有稱呼語有正文要感謝對方報名活動記得附上日期和地點最後要有簽名
              </p>
            </div>
            {/* Right: with */}
            <div style={{
              flex: 1, background: C.surface, border: `1px solid rgba(124,255,178,0.2)`,
              borderRadius: 16 * S, padding: `${20 * S}px ${24 * S}px`,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(rightProg, [0, 1], [14 * S, 0])}px)`,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary, marginBottom: 14 * S, letterSpacing: "0.06em" }}>✓ 有 Markdown</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.primary, lineHeight: 2.0 }}>
                <div style={{ color: C.primary, fontWeight: 700 }}># 信件主旨</div>
                <div style={{ color: C.muted }}>- 稱呼語</div>
                <div style={{ color: C.muted }}>- 感謝報名</div>
                <div style={{ color: "#7cd4ff" }}>```日期、地點```</div>
                <div style={{ color: C.yellow }}>---</div>
                <div style={{ color: C.muted }}>簽名</div>
              </div>
            </div>
          </div>

          {/* TipBox analogy */}
          <TipBox label="一句話理解" fadeStyle={analogyStyle}>
            就像中文的標點符號——不用也能看懂，但加上了，
            <span style={{ color: C.primary, fontWeight: 700 }}> 閱讀效率和理解準確度都大幅提升。</span>
            Markdown 對 AI 的作用，就是這樣。
          </TipBox>
        </SceneWrap>
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 3.0 — Markdown Live Preview 工具介紹 (frames 2975–4614, duration 1639)
// ═════════════════════════════════════════════════════════════════════════════
const Scene30LivePreview: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = 1639;

  // VTT local frames:
  // "你可以在Google上面直接搜尋" → 00:10.100 → 303
  // "你在左邊輸入Markdown的語法，右邊就會同步顯示" → 00:25.800 → 774
  const calloutStart = 303;
  const diagramStart = 774;

  const toolCardStyle  = useFadeUp(30);
  const featStyle1     = useFadeUpItem(60);
  const featStyle2     = useFadeUpItem(80);
  const featStyle3     = useFadeUpItem(100);
  const diagramStyle   = useFadeUp(diagramStart);

  const callouts: Callout[] = [
    { from: calloutStart, to: calloutStart + 120, sender: "James", text: "Google 搜尋「Markdown Live Preview」，第一個就是" },
  ];

  // Split-screen diagram progress
  const diagramProg = spring({ frame: Math.max(0, frame - diagramStart), fps: 30, config: { damping: 200 } });
  const arrowWidth  = interpolate(diagramProg, [0, 1], [0, 60 * S], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={75} />
        <SceneWrap>
          <SectionHeader num="02" title="練習工具：Markdown Live Preview" startFrame={0} />

          {/* Tool card */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 22 * S, padding: `${24 * S}px ${30 * S}px`,
            marginBottom: 28 * S, display: "flex", gap: 20 * S, alignItems: "flex-start",
            ...toolCardStyle,
          }}>
            <div style={{
              width: 64 * S, height: 64 * S, borderRadius: 14 * S,
              background: "rgba(124,255,178,0.12)", border: `1px solid rgba(124,255,178,0.25)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32 * S, flexShrink: 0,
            }}>🛠️</div>
            <div>
              <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 32 * S, fontWeight: 700, color: C.primary, marginBottom: 10 * S }}>
                Markdown Live Preview
              </div>
              {[
                { icon: "⚡", text: "左邊輸入語法，右邊即時顯示排版效果", s: featStyle1 },
                { icon: "🆓", text: "完全免費，不需要下載或安裝", s: featStyle2 },
                { icon: "🔗", text: "Google 搜尋「Markdown Live Preview」，第一個就是", s: featStyle3 },
              ].map(({ icon, text, s }) => (
                <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 12 * S, marginBottom: 8 * S, ...s }}>
                  <span style={{ fontSize: 24 * S, flexShrink: 0, marginTop: 2 * S }}>{icon}</span>
                  <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 24 * S, color: C.muted, lineHeight: 1.6 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Split-screen diagram */}
          <div style={{ ...diagramStyle }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted,
              marginBottom: 16 * S, letterSpacing: "0.06em",
            }}>LIVE PREVIEW 示意</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {/* Left pane: input */}
              <div style={{
                flex: 1, background: "rgba(20,20,20,1)", border: `1px solid rgba(255,255,255,0.06)`,
                borderRadius: `${16 * S}px 0 0 ${16 * S}px`, padding: `${18 * S}px ${22 * S}px`,
                minHeight: 200 * S,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, marginBottom: 10 * S, letterSpacing: "0.06em" }}>輸入</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, lineHeight: 1.9, color: "#aaa" }}>
                  <div><span style={{ color: C.primary }}># </span>大標題</div>
                  <div><span style={{ color: C.primary }}>## </span>次標題</div>
                  <div><span style={{ color: C.yellow }}>- </span>項目 A</div>
                  <div><span style={{ color: C.yellow }}>- </span>項目 B</div>
                  <div><span style={{ color: "#7cd4ff" }}>``` </span>程式碼<span style={{ color: "#7cd4ff" }}>```</span></div>
                </div>
              </div>
              {/* Arrow */}
              <div style={{
                width: arrowWidth, height: 3 * S, background: C.primary,
                position: "relative", flexShrink: 0,
                boxShadow: "0 0 10px rgba(124,255,178,0.5)",
              }}>
                <div style={{
                  position: "absolute", right: -8 * S, top: "50%",
                  transform: "translateY(-50%)",
                  width: 0, height: 0,
                  borderTop: `${8 * S}px solid transparent`,
                  borderBottom: `${8 * S}px solid transparent`,
                  borderLeft: `${12 * S}px solid ${C.primary}`,
                }} />
              </div>
              {/* Right pane: preview */}
              <div style={{
                flex: 1, background: "rgba(255,255,255,0.97)", border: `1px solid rgba(255,255,255,0.06)`,
                borderRadius: `0 ${16 * S}px ${16 * S}px 0`, padding: `${18 * S}px ${22 * S}px`,
                minHeight: 200 * S,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: "#888", marginBottom: 10 * S, letterSpacing: "0.06em" }}>即時預覽</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", lineHeight: 1.9, color: "#000" }}>
                  <div style={{ fontSize: 26 * S, fontWeight: 900 }}>大標題</div>
                  <div style={{ fontSize: 22 * S, fontWeight: 700 }}>次標題</div>
                  <div style={{ fontSize: 20 * S }}>• 項目 A</div>
                  <div style={{ fontSize: 20 * S }}>• 項目 B</div>
                  <div style={{ fontSize: 18 * S, background: "#f0f0f0", borderRadius: 6, padding: "2px 8px", fontFamily: "'Space Mono', monospace" }}>程式碼</div>
                </div>
              </div>
            </div>
          </div>
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 3.1~6 — Full-screen video (frames 4614–18049, duration 13435)
// type: video_segment — NO overlay animations
// ═════════════════════════════════════════════════════════════════════════════
const Scene31To6Video: React.FC = () => {
  const dur = 13435;
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: "#000" }}>
        <ProgressBar progressPct={75} />
        <OffthreadVideo
          src={staticFile("video/1-3_3.1-6-normalized.mp4")}
          style={{
            position: "absolute",
            top: NAV_H,
            left: 0,
            width: W,
            height: H - NAV_H - SUBTITLE_H,
            objectFit: "cover",
          }}
        />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 4.1 — Placeholder 佔位符 (frames 18049–19515, duration 1466)
// ═════════════════════════════════════════════════════════════════════════════
const Scene41Placeholder: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = 1466;

  // VTT local:
  // "就是指這個位置之後會被實際的值給取代" → 00:11.480 → 344
  // "常用的符號會是角括號或者是花括號" → 00:22.080 → 662
  const calloutStart  = 344;
  const symbolsStart  = 662;

  const callouts: Callout[] = [
    { from: calloutStart, to: calloutStart + 150, sender: "James", text: "佔位符 = 「這裡之後會填入真實資料」" },
  ];

  const headerStyle = useFadeUpHeader(0);
  const defStyle    = useFadeUp(30);
  const card1Style  = useFadeUpItem(symbolsStart);
  const card2Style  = useFadeUpItem(symbolsStart + 10);
  const exStyle     = useFadeUp(symbolsStart + 60);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={75} />
        <SceneWrap>
          <SectionHeader num="03" title="工程師慣例符號" startFrame={0} />

          <Card fadeStyle={defStyle} marginBottom={28 * S}>
            除了 Markdown，還有幾個來自軟體工程慣例的符號，AI 也完全看得懂。
          </Card>

          {/* Placeholder header */}
          <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 32 * S, fontWeight: 700, color: C.text, marginBottom: 20 * S, ...useFadeUp(symbolsStart - 30) }}>
            Placeholder（佔位符）
          </div>

          {/* Symbol card pair */}
          <div style={{ display: "flex", gap: 24 * S, marginBottom: 24 * S }}>
            <div style={{
              flex: 1, background: "rgba(124,255,178,0.07)", border: `1px solid rgba(124,255,178,0.25)`,
              borderRadius: 16 * S, padding: `${20 * S}px ${28 * S}px`,
              textAlign: "center" as const, ...card1Style,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 52 * S, fontWeight: 700, color: C.primary, textShadow: "0 0 20px rgba(124,255,178,0.5)", marginBottom: 12 * S }}>
                &lt;活動名稱&gt;
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted }}>角括號</div>
              <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 22 * S, color: "#c8ffe0", marginTop: 8 * S }}>之後會被替換的值</div>
            </div>
            <div style={{
              flex: 1, background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
              borderRadius: 16 * S, padding: `${20 * S}px ${28 * S}px`,
              textAlign: "center" as const, ...card2Style,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 52 * S, fontWeight: 700, color: C.yellow, textShadow: "0 0 20px rgba(255,209,102,0.5)", marginBottom: 12 * S }}>
                &#123;姓名&#125;
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted }}>花括號</div>
              <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 22 * S, color: "#ffe8a0", marginTop: 8 * S }}>之後會被替換的值</div>
            </div>
          </div>

          {/* Example card */}
          <SymbolCard
            badge="< > / { }"
            name="Placeholder"
            desc={<>角括號或花括號包住的內容，代表<span style={{ color: C.primary }}>「這個位置之後會被實際的值取代」</span>，AI 看到就知道這是待填入的變數。</>}
            inputLines={["活動標題：<活動名稱>", "寄件人：{負責人姓名}"]}
            outputLines={[
              "「活動名稱」和「負責人姓名」",
              "是待填入的變數，",
              "執行時從資料來源取值代入",
            ]}
            fadeStyle={exStyle}
          />
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 4.2 — XML 標籤 (frames 19515–21911, duration 2396)
// ═════════════════════════════════════════════════════════════════════════════
const Scene42XMLTag: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = 2396;

  // VTT local:
  // "一個開頭的標籤和一個結尾的標籤" → 00:15.060 → 452
  // "Placeholder是用來標記待填入的內容，而XML則是用來標記一整段內容" → 01:04.460 → 1934
  const diagramStart = 452;
  const calloutStart = 1934;

  const callouts: Callout[] = [
    { from: calloutStart, to: calloutStart + 150, sender: "James", text: "Placeholder = 變數佔位，XML = 整段內容分類" },
  ];

  const titleStyle  = useFadeUpHeader(0);
  const defStyle    = useFadeUp(30);
  const diagramStyle = useFadeUp(diagramStart);
  const exStyle     = useFadeUp(diagramStart + 60);

  // Tag animation
  const tagProg1 = spring({ frame: Math.max(0, frame - diagramStart), fps: 30, config: { damping: 22, stiffness: 130 } });
  const tagProg2 = spring({ frame: Math.max(0, frame - (diagramStart + 15)), fps: 30, config: { damping: 22, stiffness: 130 } });
  const tagProg3 = spring({ frame: Math.max(0, frame - (diagramStart + 30)), fps: 30, config: { damping: 22, stiffness: 130 } });

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={75} />
        <SceneWrap>
          {/* Title */}
          <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 44 * S, fontWeight: 800, color: C.text, marginBottom: 20 * S, ...titleStyle }}>
            XML 標籤
          </div>

          <Card fadeStyle={defStyle} marginBottom={28 * S}>
            成對的標籤標記一段內容，<span style={{ color: C.primary, fontWeight: 700 }}>告訴 AI 這段的性質是什麼</span>。結尾標籤比開頭多一個斜線 <span style={{ color: C.yellow, fontFamily: "'Space Mono', monospace", fontSize: 26 * S }}>/</span>。
          </Card>

          {/* Paired tag diagram */}
          <div style={{ marginBottom: 28 * S, ...diagramStyle }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, marginBottom: 16 * S, letterSpacing: "0.06em" }}>標籤包夾示意</div>
            <div style={{
              background: C.surface, border: `1px solid rgba(124,255,178,0.2)`,
              borderRadius: 16 * S, padding: `${24 * S}px ${32 * S}px`,
            }}>
              {/* Opening tag */}
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 28 * S, color: C.primary,
                opacity: tagProg1, transform: `translateX(${interpolate(tagProg1, [0, 1], [-20 * S, 0])}px)`,
                marginBottom: 10 * S,
              }}>&lt;信件內容&gt;</div>
              {/* Content */}
              <div style={{
                fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 24 * S, color: C.muted,
                paddingLeft: 24 * S, borderLeft: `2px solid rgba(124,255,178,0.3)`,
                opacity: tagProg2, transform: `translateY(${interpolate(tagProg2, [0, 1], [8 * S, 0])}px)`,
                marginBottom: 10 * S, lineHeight: 1.8,
              }}>
                親愛的 <span style={{ color: C.yellow }}>{`{收件人}`}</span>，<br />
                感謝您報名本次活動...
              </div>
              {/* Closing tag */}
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 28 * S,
                opacity: tagProg3, transform: `translateX(${interpolate(tagProg3, [0, 1], [20 * S, 0])}px)`,
              }}>
                <span style={{ color: C.primary }}>&lt;</span>
                <span style={{ color: C.yellow }}>/</span>
                <span style={{ color: C.primary }}>信件內容&gt;</span>
                <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 18 * S, color: C.muted, marginLeft: 16 * S }}>← 結尾多一個 /</span>
              </div>
            </div>
          </div>

          {/* SymbolCard example */}
          <SymbolCard
            badge="<標籤> </標籤>"
            name="XML 標籤"
            desc={<>成對角括號標記一整段內容。<span style={{ color: C.primary }}>AI 看到標籤就知道這段文字的性質</span>。上下文清楚時，AI 能自動分辨 XML 標籤和 Placeholder。</>}
            inputLines={[
              "<信件內容>",
              "親愛的 {收件人}，",
              "感謝您報名...",
              "</信件內容>",
            ]}
            outputLines={[
              "標籤之間的文字",
              "是「信件內容」的樣板，",
              "不是指令本身",
            ]}
            fadeStyle={exStyle}
          />
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 4.3 — YAML 冒號 (frames 21911–23115, duration 1204)
// ═════════════════════════════════════════════════════════════════════════════
const Scene43YAML: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = 1204;

  // VTT local:
  // "就像你在填一份表格" → 00:06.200 → 186
  // "冒號的後面一定一定要加上一個空格" → 00:30.920 → 928
  const tableStart   = 186;
  const calloutStart = 928;

  const callouts: Callout[] = [
    { from: calloutStart, to: calloutStart + 150, sender: "James", text: "冒號後面一定要有空格，少了就無法解析！" },
  ];

  const titleStyle = useFadeUpHeader(0);
  const defStyle   = useFadeUp(30);
  const tableStyle = useFadeUp(tableStart);

  // Table rows animate in
  const row1 = spring({ frame: Math.max(0, frame - tableStart), fps: 30, config: { damping: 200 } });
  const row2 = spring({ frame: Math.max(0, frame - (tableStart + 15)), fps: 30, config: { damping: 200 } });
  const row3 = spring({ frame: Math.max(0, frame - (tableStart + 30)), fps: 30, config: { damping: 200 } });

  const rows = [
    { key: "信件主旨", val: "活動報到提醒", p: row1 },
    { key: "收件人",   val: "{姓名}",       p: row2 },
    { key: "活動日期", val: "2026/04/20",   p: row3 },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={75} />
        <SceneWrap>
          {/* Title */}
          <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 44 * S, fontWeight: 800, color: C.text, marginBottom: 20 * S, ...titleStyle }}>
            YAML 冒號
          </div>

          <Card fadeStyle={defStyle} marginBottom={28 * S}>
            冒號代表<span style={{ color: C.primary, fontWeight: 700 }}>「名稱對應內容」</span>的關係，就像填表格——左邊欄位名，右邊值。
            冒號後面<span style={{ color: C.yellow, fontWeight: 700 }}> 一定要有空格</span>。
          </Card>

          {/* Form table diagram */}
          <div style={{ marginBottom: 28 * S, ...tableStyle }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, marginBottom: 16 * S, letterSpacing: "0.06em" }}>YAML 填表格式</div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16 * S, overflow: "hidden" }}>
              {/* Header */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                background: "rgba(124,255,178,0.08)",
                borderBottom: `1px solid ${C.border}`,
              }}>
                {["欄位名稱", "值"].map(h => (
                  <div key={h} style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, padding: `${10 * S}px ${20 * S}px`, letterSpacing: "0.06em" }}>{h}</div>
                ))}
              </div>
              {/* Rows */}
              {rows.map(({ key, val, p }) => (
                <div key={key} style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr",
                  borderBottom: `1px solid rgba(255,255,255,0.04)`,
                  opacity: p, transform: `translateX(${interpolate(p, [0, 1], [-10 * S, 0])}px)`,
                }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.primary, padding: `${12 * S}px ${20 * S}px` }}>{key}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.text, padding: `${12 * S}px ${20 * S}px`, display: "flex", alignItems: "center", gap: 8 * S }}>
                    <span style={{ color: C.yellow, fontWeight: 700 }}>: </span>
                    <span style={{ color: val.startsWith("{") ? C.yellow : C.text }}>{val}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Space reminder */}
          <TipBox label="重要細節" color="yellow" fadeStyle={useFadeUp(calloutStart - 60)}>
            冒號後面 <span style={{ fontFamily: "'Space Mono', monospace", color: C.yellow, fontSize: 28 * S }}>: </span> 一定要有一個空格！
            少了這個空格，AI 可能就無法辨識這是 YAML 語法。
          </TipBox>
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 5.1 — 組合技 (frames 23115–25203, duration 2088)
// ═════════════════════════════════════════════════════════════════════════════
const Scene51Combo: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = 2088;

  // VTT local:
  // "我們可以把Placeholder,YAML,XML三種符號組合在一起" → 00:20.460 → 614
  // "雖然語法各自不相同" → 00:58.900 → 1767
  const comboStart   = 614;
  const calloutStart = 1767;

  const callouts: Callout[] = [
    { from: calloutStart, to: calloutStart + 150, sender: "James", text: "不需要語法完美，混搭就夠了" },
  ];

  const headerStyle = useFadeUpHeader(0);
  const introStyle  = useFadeUp(30);

  // Three-step reveal
  const step1 = spring({ frame: Math.max(0, frame - comboStart), fps: 30, config: { damping: 200 } });
  const step2 = spring({ frame: Math.max(0, frame - (comboStart + 30)), fps: 30, config: { damping: 200 } });
  const step3 = spring({ frame: Math.max(0, frame - (comboStart + 60)), fps: 30, config: { damping: 200 } });

  const legendStyle = useFadeUp(comboStart + 100);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={75} />
        <SceneWrap>
          <SectionHeader num="04" title="組合技：混搭使用效果最好" startFrame={0} />

          <Card fadeStyle={introStyle} marginBottom={28 * S}>
            不需要每個語法都精確無誤。<span style={{ color: C.primary, fontWeight: 700 }}>把不同的符號混在一起用，只要上下文清楚，AI 就能正確理解。</span>
          </Card>

          {/* Combo example — three step reveal */}
          <div style={{ marginBottom: 28 * S }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, marginBottom: 16 * S, letterSpacing: "0.06em" }}>
              ✦ 組合技範例：YAML ＋ XML ＋ Placeholder
            </div>
            <div style={{
              background: "rgba(124,255,178,0.04)", border: "1px solid rgba(124,255,178,0.2)",
              borderRadius: 16 * S, padding: `${24 * S}px ${32 * S}px`,
            }}>
              {/* Step 1: YAML */}
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 26 * S, lineHeight: 2.0,
                opacity: step1, transform: `translateY(${interpolate(step1, [0, 1], [8 * S, 0])}px)`,
                marginBottom: 8 * S,
              }}>
                <span style={{ color: C.yellow }}>信件主旨</span>
                <span style={{ color: C.primary }}>: </span>
                <span style={{ color: C.text }}>活動報到提醒</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, marginLeft: 16 * S }}>← YAML</span>
              </div>
              {/* Step 2: XML */}
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 26 * S, lineHeight: 2.0,
                opacity: step2, transform: `translateY(${interpolate(step2, [0, 1], [8 * S, 0])}px)`,
              }}>
                <div>
                  <span style={{ color: C.blue }}>&lt;信件內容樣板&gt;</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, marginLeft: 16 * S }}>← XML 開頭</span>
                </div>
                <div style={{ paddingLeft: 32 * S, opacity: step3, transform: `translateY(${interpolate(step3, [0, 1], [6 * S, 0])}px)` }}>
                  <span style={{ color: C.muted }}>親愛的 </span>
                  <span style={{ color: C.primary }}>&#123;姓名&#125;</span>
                  <span style={{ color: C.muted }}>，感謝您報名 </span>
                  <span style={{ color: C.primary }}>&lt;活動名稱&gt;</span>
                  <span style={{ color: C.muted }}>...</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, marginLeft: 16 * S }}>← Placeholder</span>
                </div>
                <div style={{ opacity: step3 }}>
                  <span style={{ color: C.blue }}>&lt;/信件內容樣板&gt;</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, marginLeft: 16 * S }}>← XML 結尾</span>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 20 * S, ...legendStyle }}>
            {[
              { color: C.yellow,  label: "YAML",        desc: "標示欄位對應關係" },
              { color: C.blue,    label: "XML",          desc: "圈出內容區塊" },
              { color: C.primary, label: "Placeholder",  desc: "標記待填入的值" },
            ].map(({ color, label, desc }) => (
              <div key={label} style={{
                flex: 1, background: C.surface, border: `1px solid rgba(255,255,255,0.08)`,
                borderRadius: 12 * S, padding: `${14 * S}px ${18 * S}px`,
                display: "flex", alignItems: "center", gap: 12 * S,
              }}>
                <div style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: color, boxShadow: `0 0 10px ${color}`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 18 * S, color: C.muted }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 6.1 — 本章收尾 / 重點整理 (frames 25203–28754, duration 3551)
// ═════════════════════════════════════════════════════════════════════════════
const AnimatedSummaryItem: React.FC<{ num: string; text: React.ReactNode; startFrame: number }> = ({ num, text, startFrame }) => {
  const fadeStyle = useFadeUpItem(startFrame);
  return <SummaryItem num={num} text={text} fadeStyle={fadeStyle} />;
};

const Scene61Summary: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = 3551;

  // VTT local:
  // "再快速的帶你複習一下" → 00:22.520 → 676
  // "將這個單元我們所學習到的這些符號" → 01:40.130 → 3004
  const summaryStart  = 676;
  const calloutStart  = 3004;

  const callouts: Callout[] = [
    { from: calloutStart, to: calloutStart + 190, sender: "James", text: "符號 + 萬用句型 = 指令品質大幅升級" },
  ];

  // Scroll: content height estimate
  // SectionHeader ~90 + intro card ~140 + 8 summary items × 90 = ~950
  // maxScroll = max(0, 950 - 1696) = 0 → no scroll needed

  const headerStyle = useFadeUpHeader(0);
  const introStyle  = useFadeUp(30);

  // Summary items stagger — 8 items, start at summaryStart, 20f apart
  const summaryItems = [
    { num: "①", text: <>Markdown 是格式語言，用了能提升 AI 理解準確度</> },
    { num: "②", text: <><span style={{ fontFamily: "'Space Mono', monospace", color: C.primary }}>#</span> 標題、<span style={{ fontFamily: "'Space Mono', monospace", color: C.primary }}>-</span> 清單、<span style={{ fontFamily: "'Space Mono', monospace", color: C.primary }}>```</span> 程式碼區塊、<span style={{ fontFamily: "'Space Mono', monospace", color: C.primary }}>&gt;</span> 引用、<span style={{ fontFamily: "'Space Mono', monospace", color: C.primary }}>---</span> 分隔線</> },
    { num: "③", text: <><span style={{ fontFamily: "'Space Mono', monospace", color: C.primary }}>&lt;變數&gt;</span> / <span style={{ fontFamily: "'Space Mono', monospace", color: C.primary }}>&#123;變數&#125;</span> 是 Placeholder，告訴 AI「這裡之後會被取代」</> },
    { num: "④", text: <>XML 標籤 <span style={{ fontFamily: "'Space Mono', monospace", color: C.blue }}>&lt;名稱&gt;..&lt;/名稱&gt;</span> 用來圈出特定性質的內容區塊</> },
    { num: "⑤", text: <>YAML 冒號 <span style={{ fontFamily: "'Space Mono', monospace", color: C.yellow }}>鍵: 值</span> 標示欄位對應關係，冒號後面記得加空格</> },
    { num: "⑥", text: <>組合技：符號混搭，不需要完美，上下文清楚 AI 就能理解</> },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={75} />
        <SceneWrap>
          <SectionHeader num="05" title="本章重點整理" startFrame={0} />

          <Card fadeStyle={introStyle} marginBottom={28 * S}>
            這些符號不需要死記。用個幾次，就會自然記住了。
          </Card>

          {/* Summary items — wrapper calls hook at component level */}
          {summaryItems.map(({ num, text }, i) => (
            <AnimatedSummaryItem
              key={num}
              num={num}
              text={text}
              startFrame={summaryStart + i * 20}
            />
          ))}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// Root Composition — FullVideo06
// ═════════════════════════════════════════════════════════════════════════════
export const FullVideo06: React.FC = () => {
  const S0 = SEG_STARTS;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Background BGM */}
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        startFrom={0}
        volume={0.10}
        loop
      />

      {/* ── Segment 1.1 ── */}
      <Sequence from={S0[0]} durationInFrames={1647}>
        <Audio src={staticFile("audio/1-3_1.1-normalized.wav")} />
        <Scene11Hero />
      </Sequence>

      {/* ── Segment 2.1 ── */}
      <Sequence from={S0[1]} durationInFrames={1328}>
        <Audio src={staticFile("audio/1-3_2.1-normalized.wav")} />
        <Scene21WhatIs />
      </Sequence>

      {/* ── Segment 3.0 ── */}
      <Sequence from={S0[2]} durationInFrames={1639}>
        <Audio src={staticFile("audio/1-3_3.0-normalized.wav")} />
        <Scene30LivePreview />
      </Sequence>

      {/* ── Segment 3.1~6 (video) ── */}
      <Sequence from={S0[3]} durationInFrames={13435}>
        <Scene31To6Video />
      </Sequence>

      {/* ── Segment 4.1 ── */}
      <Sequence from={S0[4]} durationInFrames={1466}>
        <Audio src={staticFile("audio/1-3_4.1-normalized.wav")} />
        <Scene41Placeholder />
      </Sequence>

      {/* ── Segment 4.2 ── */}
      <Sequence from={S0[5]} durationInFrames={2396}>
        <Audio src={staticFile("audio/1-3_4.2-normalized.wav")} />
        <Scene42XMLTag />
      </Sequence>

      {/* ── Segment 4.3 ── */}
      <Sequence from={S0[6]} durationInFrames={1204}>
        <Audio src={staticFile("audio/1-3_4.3-normalized.wav")} />
        <Scene43YAML />
      </Sequence>

      {/* ── Segment 5.1 ── */}
      <Sequence from={S0[7]} durationInFrames={2088}>
        <Audio src={staticFile("audio/1-3_5.1-normalized.wav")} />
        <Scene51Combo />
      </Sequence>

      {/* ── Segment 6.1 ── */}
      <Sequence from={S0[8]} durationInFrames={3551}>
        <Audio src={staticFile("audio/1-3_6.1-normalized.wav")} />
        <Scene61Summary />
      </Sequence>
    </AbsoluteFill>
  );
};
