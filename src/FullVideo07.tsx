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
const NAV_H      = 72  * S;
const SUBTITLE_H = 160 * S;
const CONTAINER_W = 1500 * S;

// ─────────────────────────────────────────────────────────────────────────────
// Segments — CH 1-4
// ─────────────────────────────────────────────────────────────────────────────
export const SEG_STARTS_07 = [
  0,     // 1.1
  1557,  // 2.1
  2801,  // 3.1
  5208,  // 3.2
  6764,  // 3.3
  8811,  // 4.0
  10496, // 4.1
  14105, // 4.2
  16195, // 5.1
  19130, // 6.1
  22376, // 7.1
];
export const TOTAL_FRAMES_07 = 25002;

// ─────────────────────────────────────────────────────────────────────────────
// Global Callouts (all from VTT, global frame)
// ─────────────────────────────────────────────────────────────────────────────
type Callout = { from: number; to: number; sender: string; text: string };

const GLOBAL_CALLOUTS: Callout[] = [
  { from: 1111,  to: 1211,  sender: "James", text: "手繪拍照也可以，截圖貼給 AI 就好" },
  { from: 2708,  to: 2808,  sender: "James", text: "兩種圖對應程式最重要的兩件事：流程 + 資料" },
  { from: 3641,  to: 3741,  sender: "James", text: "核心只有一個：列步驟 → 套圖形 → 箭頭連" },
  { from: 6643,  to: 6743,  sender: "James", text: "步驟列清楚就是流程圖了，不需要完美" },
  { from: 8244,  to: 8344,  sender: "James", text: "菱形 = if-else 判斷點，圖比文字直觀多了" },
  { from: 10336, to: 10436, sender: "James", text: "資料流圖 = 工廠示意圖，看清每段資料形態" },
  { from: 12156, to: 12256, sender: "James", text: "資料流圖讓格式差異一目了然，AI 能看懂真正費工在哪" },
  { from: 15847, to: 15947, sender: "James", text: "中繼表是擴充的緩衝層，新增來源不影響下游" },
  { from: 17224, to: 17324, sender: "James", text: "Mermaid 處在文字與圖像中間，AI 能讀，人也能看" },
  { from: 21364, to: 21464, sender: "James", text: "越簡單的圖，AI 越不會產生錯誤的理解" },
  { from: 24900, to: 25000, sender: "James", text: "下一單元：解法設計——把需求轉成可執行的開發方案" },
];

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
// SceneFade
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
}> = ({ text, startFrame, fontSize = 36 * S, color = C.text, fontWeight = 700 }) => {
  const frame = useCurrentFrame();
  const words = text.split(/(\s+)/);
  let wordIndex = 0;
  return (
    <span style={{ display: "inline", fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize, fontWeight, color }}>
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
// ProgressBar — CH 1-4 = 100%
// ─────────────────────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ progressPct?: number }> = ({ progressPct = 100 }) => {
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
        <span style={{ fontSize: 20 * S, color: C.muted }}>CH 1-4</span>
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
// SummaryItem
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
const NOTIF_W     = 420 * S;
const NOTIF_TOP   = 12  * S;
const NOTIF_RIGHT = 20  * S;
const NOTIF_SLOT  = 200 * S;
const FADE_OUT_F  = 50;

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
  const totalVis = duration + FADE_OUT_F;
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

  const iconSize = 52 * S;
  const fontBase = 22 * S;
  const fontBody = 26 * S;

  return (
    <div style={{
      position: "absolute",
      top: NAV_H + NOTIF_TOP + totalYPush,
      right: NOTIF_RIGHT,
      width: NOTIF_W,
      transform: `translateY(${slideY}px)`,
      opacity: opacity * depthAlpha,
      pointerEvents: "none",
      zIndex: 200,
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
// SceneWrap
// ─────────────────────────────────────────────────────────────────────────────
const SceneWrap: React.FC<{ children: React.ReactNode; scrollY?: number }> = ({ children, scrollY = 0 }) => (
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
// SCENE 1.1 — Hero (frames 0–1557, dur 1557)
// ═════════════════════════════════════════════════════════════════════════════
const Scene11Hero: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = 1557;

  // local frame 495 → two_concept_cards (文字溝通 vs 圖像溝通)
  // local frame 1166 → tool_icons (PPT / 電子白板 / 手繪拍照)
  const cardsStart = 495;
  const toolsStart = 1166;

  const subtitleStyle = useFadeUp(20);
  const titleStyle    = useFadeUpHeader(45);
  const descStyle     = useFadeUp(80);

  const card1 = useFadeUpElastic(cardsStart);
  const card2 = useFadeUpElastic(cardsStart + 12);
  const tool1 = useFadeUpItem(toolsStart);
  const tool2 = useFadeUpItem(toolsStart + 10);
  const tool3 = useFadeUpItem(toolsStart + 20);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={100} />
        <SceneWrap>
          {/* Chapter badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 24 * S, ...subtitleStyle }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.primary, border: `1px solid ${C.primary}`, padding: `${4 * S}px ${14 * S}px`, borderRadius: 99, letterSpacing: "0.05em", textShadow: "0 0 10px rgba(124,255,178,0.4)" }}>CH 1-4</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`, padding: `${4 * S}px ${12 * S}px`, borderRadius: 99 }}>SDLC 第二步</span>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 28 * S, ...titleStyle }}>
            <h1 style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 66 * S, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.02em", color: C.text, margin: 0 }}>
              流程圖、資料流圖：<br />
              <span style={{ color: C.primary }}>軟體工程最重要的 2 種圖</span>
            </h1>
          </div>

          {/* Desc */}
          <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 28 * S, color: C.muted, lineHeight: 1.7, maxWidth: 900 * S, marginBottom: 48 * S, ...descStyle }}>
            把複雜的需求用圖表呈現，AI 能夠更清楚地理解你想要做什麼。
          </p>

          {/* Two concept cards at frame 495 */}
          <div style={{ display: "flex", gap: 32 * S, marginBottom: 36 * S }}>
            {/* 文字溝通 */}
            <div style={{
              flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20 * S, padding: `${28 * S}px ${32 * S}px`,
              display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 12 * S,
              ...card1,
            }}>
              <span style={{ fontSize: 52 * S }}>文</span>
              <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 28 * S, fontWeight: 700, color: C.muted }}>文字溝通</span>
            </div>
            {/* 圖像溝通 — highlighted */}
            <div style={{
              flex: 1, background: "rgba(124,255,178,0.09)", border: `2px solid rgba(124,255,178,0.4)`,
              borderRadius: 20 * S, padding: `${28 * S}px ${32 * S}px`,
              display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 12 * S,
              boxShadow: "0 0 30px rgba(124,255,178,0.12)",
              ...card2,
            }}>
              <span style={{ fontSize: 52 * S }}>圖</span>
              <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 28 * S, fontWeight: 700, color: C.primary }}>圖像溝通</span>
            </div>
          </div>

          {/* Tool tags at frame 1166 */}
          <div style={{ display: "flex", gap: 20 * S }}>
            {[
              { label: "PPT", s: tool1 },
              { label: "電子白板", s: tool2 },
              { label: "手繪拍照", s: tool3 },
            ].map(({ label, s }) => (
              <div key={label} style={{
                background: "rgba(124,255,178,0.08)", border: `1px solid rgba(124,255,178,0.3)`,
                borderRadius: 99, padding: `${10 * S}px ${24 * S}px`,
                fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.primary,
                letterSpacing: "0.04em",
                ...s,
              }}>{label}</div>
            ))}
          </div>
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 2.1 — Overview (frames 1557–2801, dur 1244)
// ═════════════════════════════════════════════════════════════════════════════
const Scene21Overview: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = 1244;

  // local 250 → two_concept_cards_side_by_side
  const cardsStart = 250;

  const headerStyle = useFadeUpHeader(0);
  const lineStyle   = useAccentLine(8);
  const descStyle   = useFadeUp(30);

  const card1Prog = spring({ frame: Math.max(0, frame - cardsStart), fps: 30, config: { damping: 22, stiffness: 130 } });
  const card2Prog = spring({ frame: Math.max(0, frame - (cardsStart + 15)), fps: 30, config: { damping: 22, stiffness: 130 } });

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={100} />
        <SceneWrap>
          {/* Header */}
          <div style={{ marginBottom: 28 * S, ...headerStyle }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 * S }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.primary, background: "rgba(124,255,178,0.1)", border: "1px solid rgba(124,255,178,0.3)", padding: `${6 * S}px ${16 * S}px`, borderRadius: 99, letterSpacing: "0.06em" }}>01</span>
              <h2 style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 44 * S, fontWeight: 800, letterSpacing: "-0.02em", color: C.text, margin: 0 }}>兩種圖的核心差異</h2>
            </div>
            <div style={{ height: 2 * S, background: C.primary, borderRadius: 99, marginTop: 10 * S, boxShadow: "0 0 10px rgba(124,255,178,0.4)", ...lineStyle }} />
          </div>

          <Card fadeStyle={descStyle} marginBottom={36 * S}>
            這兩種圖解決了程式最重要的兩個問題：<span style={{ color: C.primary, fontWeight: 700 }}>流程</span>和<span style={{ color: C.yellow, fontWeight: 700 }}>資料</span>。選對圖，AI 就能精準理解你的需求。
          </Card>

          {/* Side-by-side concept cards */}
          <div style={{ display: "flex", gap: 32 * S }}>
            {/* 流程圖 */}
            <div style={{
              flex: 1,
              background: "rgba(124,255,178,0.06)", border: `1px solid rgba(124,255,178,0.25)`,
              borderRadius: 22 * S, padding: `${32 * S}px ${36 * S}px`,
              opacity: card1Prog, transform: `translateY(${interpolate(card1Prog, [0, 1], [16 * S, 0])}px)`,
            }}>
              <div style={{ fontSize: 60 * S, marginBottom: 16 * S, textAlign: "center" as const }}>→</div>
              <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 36 * S, fontWeight: 800, color: C.primary, textAlign: "center" as const, marginBottom: 12 * S }}>流程圖</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, textAlign: "center" as const, marginBottom: 16 * S, letterSpacing: "0.04em" }}>以步驟為主角</div>
              <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 24 * S, color: "#c8ffe0", lineHeight: 1.7, textAlign: "center" as const }}>說明這件事情<br />的流程長什麼樣子</div>
            </div>
            {/* 資料流圖 */}
            <div style={{
              flex: 1,
              background: "rgba(255,209,102,0.06)", border: `1px solid rgba(255,209,102,0.25)`,
              borderRadius: 22 * S, padding: `${32 * S}px ${36 * S}px`,
              opacity: card2Prog, transform: `translateY(${interpolate(card2Prog, [0, 1], [16 * S, 0])}px)`,
            }}>
              <div style={{ fontSize: 60 * S, marginBottom: 16 * S, textAlign: "center" as const }}>⟳</div>
              <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 36 * S, fontWeight: 800, color: C.yellow, textAlign: "center" as const, marginBottom: 12 * S }}>資料流圖</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, textAlign: "center" as const, marginBottom: 16 * S, letterSpacing: "0.04em" }}>以資料為主角</div>
              <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 24 * S, color: "#ffe8a0", lineHeight: 1.7, textAlign: "center" as const }}>說明資料有哪些格式<br />以及如何被加工轉換</div>
            </div>
          </div>
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 3.1 — Flowchart Elements (frames 2801–5208, dur 2407)
// ═════════════════════════════════════════════════════════════════════════════
const Scene31Flowchart: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = 2407;

  // local 390 → shape_legend
  const legendStart = 390;

  const headerStyle = useFadeUpHeader(0);
  const descStyle   = useFadeUp(30);

  // Shape legend — 5 shapes staggered
  const shapes = [
    { shape: "rounded",   label: "起點 / 終點",   color: C.primary },
    { shape: "rect",      label: "步驟",          color: C.blue },
    { shape: "diamond",   label: "判斷 (if/else)", color: C.yellow },
    { shape: "parallelogram", label: "輸入 / 輸出", color: "#e29bff" },
    { shape: "arrow",     label: "順序箭頭",      color: C.muted },
  ];

  const s0 = useFadeUpItem(legendStart);
  const s1 = useFadeUpItem(legendStart + 15);
  const s2 = useFadeUpItem(legendStart + 30);
  const s3 = useFadeUpItem(legendStart + 45);
  const s4 = useFadeUpItem(legendStart + 60);
  const shapeStyles = [s0, s1, s2, s3, s4];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={100} />
        <SceneWrap>
          <SectionHeader num="02" title="流程圖的元素" startFrame={0} />

          <Card fadeStyle={descStyle} marginBottom={32 * S}>
            流程圖有<span style={{ color: C.primary, fontWeight: 700 }}>幾個重要的元素</span>——不同形狀代表不同意義。記住這些符號，AI 就能更準確地讀懂你的圖。
          </Card>

          {/* Shape legend */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 * S }}>
            {shapes.map(({ shape, label, color }, i) => {
              const itemStyle = shapeStyles[i];
              return (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: 28 * S,
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 16 * S, padding: `${18 * S}px ${28 * S}px`,
                  ...itemStyle,
                }}>
                  {/* Shape preview */}
                  <div style={{ width: 80 * S, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                    {shape === "rounded" && (
                      <div style={{ width: 64 * S, height: 32 * S, borderRadius: 99, border: `2px solid ${color}`, background: `${color}22` }} />
                    )}
                    {shape === "rect" && (
                      <div style={{ width: 64 * S, height: 32 * S, border: `2px solid ${color}`, background: `${color}22` }} />
                    )}
                    {shape === "diamond" && (
                      <div style={{ width: 36 * S, height: 36 * S, border: `2px solid ${color}`, background: `${color}22`, transform: "rotate(45deg)" }} />
                    )}
                    {shape === "parallelogram" && (
                      <div style={{ width: 64 * S, height: 32 * S, border: `2px solid ${color}`, background: `${color}22`, transform: "skewX(-15deg)" }} />
                    )}
                    {shape === "arrow" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                        <div style={{ width: 48 * S, height: 3 * S, background: color }} />
                        <div style={{ width: 0, height: 0, borderTop: `${8 * S}px solid transparent`, borderBottom: `${8 * S}px solid transparent`, borderLeft: `${14 * S}px solid ${color}` }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 28 * S, fontWeight: 700, color: color }}>{label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 3.2 — Flowchart Example (frames 5208–6764, dur 1556)
// ═════════════════════════════════════════════════════════════════════════════
const Scene32Example: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = 1556;

  // local 653 → flowchart_svg
  const chartStart = 653;

  const headerStyle = useFadeUpHeader(0);
  const descStyle   = useFadeUp(30);

  // 5 nodes appear staggered
  const nodes = ["報名表單", "整理資料", "轉主辦格式", "轉場地格式", "傳送"];
  const nodeProgs = nodes.map((_, i) =>
    spring({ frame: Math.max(0, frame - (chartStart + i * 25)), fps: 30, config: { damping: 200 } })
  );

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={100} />
        <SceneWrap>
          <SectionHeader num="03" title="流程圖實例" startFrame={0} />

          <Card fadeStyle={descStyle} marginBottom={32 * S}>
            把這個流程的步驟畫出來——從報名到傳送，每個步驟是一個節點，用箭頭連接。
          </Card>

          {/* Horizontal flowchart */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 20 * S, padding: `${36 * S}px ${40 * S}px`,
          }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, marginBottom: 28 * S, letterSpacing: "0.06em" }}>講座報名自動化流程</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "nowrap" as const, overflowX: "hidden" as const }}>
              {nodes.map((node, i) => {
                const prog = nodeProgs[i];
                const isLast = i === nodes.length - 1;
                const isFirst = i === 0;
                return (
                  <React.Fragment key={node}>
                    <div style={{
                      opacity: prog,
                      transform: `scale(${interpolate(prog, [0, 1], [0.85, 1])})`,
                      flexShrink: 0,
                    }}>
                      <div style={{
                        background: isFirst || isLast ? "rgba(124,255,178,0.12)" : "rgba(255,255,255,0.06)",
                        border: isFirst || isLast ? `1.5px solid rgba(124,255,178,0.5)` : `1px solid rgba(255,255,255,0.15)`,
                        borderRadius: isFirst || isLast ? 99 : 10 * S,
                        padding: `${14 * S}px ${18 * S}px`,
                        fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                        fontSize: 22 * S, fontWeight: 700,
                        color: isFirst || isLast ? C.primary : C.text,
                        textAlign: "center" as const,
                        minWidth: 120 * S,
                      }}>{node}</div>
                    </div>
                    {!isLast && (
                      <div style={{
                        display: "flex", alignItems: "center", flexShrink: 0,
                        opacity: interpolate(prog, [0.5, 1], [0, 1], clamp),
                      }}>
                        <div style={{ width: 24 * S, height: 2 * S, background: C.primary, opacity: 0.5 }} />
                        <div style={{ width: 0, height: 0, borderTop: `${6 * S}px solid transparent`, borderBottom: `${6 * S}px solid transparent`, borderLeft: `${10 * S}px solid rgba(124,255,178,0.5)` }} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <TipBox label="關鍵觀念" fadeStyle={useFadeUp(chartStart + 80)} marginBottom={0}>
            步驟列清楚就是流程圖了。<span style={{ color: C.primary }}>不需要完美——只要讓 AI 看懂流程順序即可。</span>
          </TipBox>
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 3.3 — Diamond / Branch (frames 6764–8811, dur 2047)
// ═════════════════════════════════════════════════════════════════════════════
const Scene33Diamond: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = 2047;

  // local 760 → flowchart_with_diamond
  const diamondStart = 760;

  const headerStyle = useFadeUpHeader(0);
  const descStyle   = useFadeUp(30);

  // Animation for each element
  const node1Prog = spring({ frame: Math.max(0, frame - diamondStart), fps: 30, config: { damping: 200 } });
  const diamondProg = spring({ frame: Math.max(0, frame - (diamondStart + 20)), fps: 30, config: { damping: 18, stiffness: 150 } });
  const yBranchProg = spring({ frame: Math.max(0, frame - (diamondStart + 40)), fps: 30, config: { damping: 200 } });
  const nBranchProg = spring({ frame: Math.max(0, frame - (diamondStart + 50)), fps: 30, config: { damping: 200 } });

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={100} />
        <SceneWrap>
          <SectionHeader num="04" title="菱形：判斷節點" startFrame={0} />

          <Card fadeStyle={descStyle} marginBottom={32 * S}>
            當流程有<span style={{ color: C.yellow, fontWeight: 700 }}>條件分支</span>時，我們就可以增加一個菱形節點。菱形代表 if-else 的判斷，讓 AI 知道這裡有兩條路。
          </Card>

          {/* Diamond flowchart */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 20 * S, padding: `${36 * S}px ${40 * S}px`,
          }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, marginBottom: 28 * S, letterSpacing: "0.06em" }}>加入判斷節點後</div>

            {/* Vertical flow diagram */}
            <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 0 }}>
              {/* 整理資料 */}
              <div style={{ opacity: node1Prog, transform: `scale(${interpolate(node1Prog, [0, 1], [0.9, 1])})` }}>
                <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10 * S, padding: `${14 * S}px ${32 * S}px`, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 24 * S, fontWeight: 700, color: C.text, textAlign: "center" as const }}>整理資料</div>
              </div>

              {/* Arrow down */}
              <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", opacity: node1Prog }}>
                <div style={{ width: 2 * S, height: 20 * S, background: "rgba(124,255,178,0.3)" }} />
                <div style={{ width: 0, height: 0, borderLeft: `${6 * S}px solid transparent`, borderRight: `${6 * S}px solid transparent`, borderTop: `${10 * S}px solid rgba(124,255,178,0.4)` }} />
              </div>

              {/* Diamond node */}
              <div style={{ opacity: diamondProg, transform: `scale(${interpolate(diamondProg, [0, 1], [0.8, 1])}) rotate(0deg)` }}>
                <div style={{ position: "relative", width: 160 * S, height: 80 * S, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{
                    position: "absolute", width: 80 * S, height: 80 * S,
                    background: "rgba(255,209,102,0.12)", border: `2px solid rgba(255,209,102,0.5)`,
                    transform: "rotate(45deg)",
                  }} />
                  <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 18 * S, fontWeight: 700, color: C.yellow, zIndex: 1, textAlign: "center" as const, maxWidth: 80 * S }}>資料<br />完整？</span>
                </div>
              </div>

              {/* Y/N branches */}
              <div style={{ display: "flex", gap: 80 * S, opacity: Math.max(yBranchProg, nBranchProg) }}>
                {/* Y branch */}
                <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", opacity: yBranchProg }}>
                  <div style={{ width: 2 * S, height: 20 * S, background: "rgba(124,255,178,0.3)" }} />
                  <div style={{ background: "rgba(124,255,178,0.1)", border: "1px solid rgba(124,255,178,0.3)", borderRadius: 10 * S, padding: `${10 * S}px ${20 * S}px`, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 22 * S, fontWeight: 700, color: C.primary }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, marginRight: 8 * S }}>Y →</span>
                    繼續下一步
                  </div>
                </div>
                {/* N branch */}
                <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", opacity: nBranchProg }}>
                  <div style={{ width: 2 * S, height: 20 * S, background: "rgba(255,209,102,0.3)" }} />
                  <div style={{ background: "rgba(255,209,102,0.08)", border: "1px solid rgba(255,209,102,0.3)", borderRadius: 10 * S, padding: `${10 * S}px ${20 * S}px`, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 22 * S, fontWeight: 700, color: C.yellow }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, marginRight: 8 * S }}>N →</span>
                    補齊資料
                  </div>
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
// SCENE 4.0 — Data Flow Intro / Factory (frames 8811–10496, dur 1685)
// ═════════════════════════════════════════════════════════════════════════════
const Scene40DataFlow: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = 1685;

  // local 860 → factory_analogy_svg
  const factoryStart = 860;

  const headerStyle = useFadeUpHeader(0);
  const descStyle   = useFadeUp(30);

  const rawProg    = spring({ frame: Math.max(0, frame - factoryStart), fps: 30, config: { damping: 200 } });
  const factProg   = spring({ frame: Math.max(0, frame - (factoryStart + 20)), fps: 30, config: { damping: 200 } });
  const out1Prog   = spring({ frame: Math.max(0, frame - (factoryStart + 40)), fps: 30, config: { damping: 200 } });
  const out2Prog   = spring({ frame: Math.max(0, frame - (factoryStart + 55)), fps: 30, config: { damping: 200 } });

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={100} />
        <SceneWrap>
          <SectionHeader num="05" title="資料流圖是什麼？" startFrame={0} />

          <Card fadeStyle={descStyle} marginBottom={32 * S}>
            用<span style={{ color: C.yellow, fontWeight: 700 }}>塑膠工廠</span>來比喻：原料進去，加工後輸出不同產品。資料流圖就是讓你看清楚，資料在每一個階段長什麼樣子。
          </Card>

          {/* Factory analogy */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 20 * S, padding: `${36 * S}px ${40 * S}px`,
          }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, marginBottom: 28 * S, letterSpacing: "0.06em" }}>工廠類比</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, justifyContent: "center" }}>
              {/* Raw material */}
              <div style={{ opacity: rawProg, transform: `scale(${interpolate(rawProg, [0, 1], [0.85, 1])})` }}>
                <div style={{ width: 120 * S, height: 120 * S, borderRadius: "50%", background: "rgba(255,209,102,0.1)", border: "2px solid rgba(255,209,102,0.4)", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 6 * S }}>
                  <span style={{ fontSize: 40 * S }}>🧴</span>
                  <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 18 * S, color: C.yellow }}>原料(塑膠)</span>
                </div>
              </div>

              {/* Arrow */}
              <div style={{ display: "flex", alignItems: "center", opacity: rawProg }}>
                <div style={{ width: 40 * S, height: 2 * S, background: C.primary, opacity: 0.5 }} />
                <div style={{ width: 0, height: 0, borderTop: `${7 * S}px solid transparent`, borderBottom: `${7 * S}px solid transparent`, borderLeft: `${12 * S}px solid rgba(124,255,178,0.5)` }} />
              </div>

              {/* Factory */}
              <div style={{ opacity: factProg, transform: `scale(${interpolate(factProg, [0, 1], [0.85, 1])})` }}>
                <div style={{ width: 160 * S, height: 120 * S, background: "rgba(124,255,178,0.08)", border: "2px solid rgba(124,255,178,0.35)", borderRadius: 16 * S, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 6 * S }}>
                  <span style={{ fontSize: 40 * S }}>🏭</span>
                  <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 20 * S, fontWeight: 700, color: C.primary }}>工廠加工</span>
                </div>
              </div>

              {/* Arrow */}
              <div style={{ display: "flex", alignItems: "center", opacity: factProg }}>
                <div style={{ width: 40 * S, height: 2 * S, background: C.primary, opacity: 0.5 }} />
                <div style={{ width: 0, height: 0, borderTop: `${7 * S}px solid transparent`, borderBottom: `${7 * S}px solid transparent`, borderLeft: `${12 * S}px solid rgba(124,255,178,0.5)` }} />
              </div>

              {/* Outputs */}
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 * S }}>
                <div style={{ opacity: out1Prog, transform: `scale(${interpolate(out1Prog, [0, 1], [0.85, 1])})` }}>
                  <div style={{ width: 110 * S, height: 54 * S, borderRadius: "50%", background: "rgba(124,212,255,0.1)", border: "2px solid rgba(124,212,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 * S }}>
                    <span style={{ fontSize: 24 * S }}>🥤</span>
                    <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 18 * S, color: C.blue }}>杯子</span>
                  </div>
                </div>
                <div style={{ opacity: out2Prog, transform: `scale(${interpolate(out2Prog, [0, 1], [0.85, 1])})` }}>
                  <div style={{ width: 110 * S, height: 54 * S, borderRadius: "50%", background: "rgba(124,212,255,0.1)", border: "2px solid rgba(124,212,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 * S }}>
                    <span style={{ fontSize: 24 * S }}>🍽️</span>
                    <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 18 * S, color: C.blue }}>餐具</span>
                  </div>
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
// SCENE 4.1 — DFD Detail (frames 10496–14105, dur 3609)
// ═════════════════════════════════════════════════════════════════════════════
const Scene41DFD: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = 3609;

  // local 372 → three_format_cards
  // local 1660 → callout
  // local 2256 → dfd_svg_animation
  const cardsStart = 372;
  const dfdStart   = 2256;

  const headerStyle = useFadeUpHeader(0);
  const descStyle   = useFadeUp(30);

  const card1 = useFadeUpItem(cardsStart);
  const card2 = useFadeUpItem(cardsStart + 15);
  const card3 = useFadeUpItem(cardsStart + 30);

  // DFD nodes
  const dfd1 = spring({ frame: Math.max(0, frame - dfdStart), fps: 30, config: { damping: 200 } });
  const dfd2 = spring({ frame: Math.max(0, frame - (dfdStart + 20)), fps: 30, config: { damping: 200 } });
  const dfd3 = spring({ frame: Math.max(0, frame - (dfdStart + 35)), fps: 30, config: { damping: 200 } });
  const dfd4 = spring({ frame: Math.max(0, frame - (dfdStart + 50)), fps: 30, config: { damping: 200 } });
  const dfd5 = spring({ frame: Math.max(0, frame - (dfdStart + 65)), fps: 30, config: { damping: 200 } });

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={100} />
        <SceneWrap>
          <SectionHeader num="06" title="資料流圖實例" startFrame={0} />

          <Card fadeStyle={descStyle} marginBottom={28 * S}>
            以講座報名為例。同樣的報名資料需要輸出成<span style={{ color: C.yellow, fontWeight: 700 }}>三種不同的格式</span>——這正是資料流圖能幫你說清楚的事。
          </Card>

          {/* Three format cards */}
          <div style={{ display: "flex", gap: 20 * S, marginBottom: 32 * S }}>
            {[
              { label: "原始報名表單", fields: ["姓名", "Email", "電話"], color: C.primary, s: card1 },
              { label: "主辦確認表單", fields: ["姓名", "座位號", "確認狀態"], color: C.yellow, s: card2 },
              { label: "場地座位表單", fields: ["座位號", "區域", "姓名"], color: C.blue, s: card3 },
            ].map(({ label, fields, color, s }) => (
              <div key={label} style={{
                flex: 1, background: C.surface, border: `1px solid ${color}44`,
                borderRadius: 16 * S, padding: `${20 * S}px ${24 * S}px`,
                ...s,
              }}>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 22 * S, fontWeight: 700, color, marginBottom: 14 * S }}>{label}</div>
                {fields.map(f => (
                  <div key={f} style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, padding: `${6 * S}px ${12 * S}px`, borderLeft: `2px solid ${color}44`, marginBottom: 6 * S }}>{f}</div>
                ))}
              </div>
            ))}
          </div>

          {/* DFD SVG animation */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 20 * S, padding: `${28 * S}px ${36 * S}px`,
          }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, marginBottom: 20 * S, letterSpacing: "0.06em" }}>資料流圖</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {/* 講座系統 circle */}
              <div style={{ opacity: dfd1, transform: `scale(${interpolate(dfd1, [0, 1], [0.85, 1])})`, flexShrink: 0 }}>
                <div style={{ width: 100 * S, height: 100 * S, borderRadius: "50%", background: "rgba(124,255,178,0.1)", border: `2px solid rgba(124,255,178,0.4)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 18 * S, fontWeight: 700, color: C.primary, textAlign: "center" as const }}>講座<br />系統</span>
                </div>
              </div>

              {/* Arrow */}
              <div style={{ display: "flex", alignItems: "center", opacity: dfd1 }}>
                <div style={{ width: 28 * S, height: 2 * S, background: "rgba(124,255,178,0.4)" }} />
                <div style={{ width: 0, height: 0, borderTop: `${6 * S}px solid transparent`, borderBottom: `${6 * S}px solid transparent`, borderLeft: `${10 * S}px solid rgba(124,255,178,0.4)` }} />
              </div>

              {/* 報名總表 rect */}
              <div style={{ opacity: dfd2, transform: `scale(${interpolate(dfd2, [0, 1], [0.85, 1])})`, flexShrink: 0 }}>
                <div style={{ width: 110 * S, height: 60 * S, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10 * S, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 18 * S, fontWeight: 700, color: C.text, textAlign: "center" as const }}>報名<br />總表</span>
                </div>
              </div>

              {/* Arrow to two outputs */}
              <div style={{ display: "flex", flexDirection: "column" as const, opacity: dfd2 }}>
                <div style={{ width: 28 * S, height: 2 * S, background: "rgba(255,255,255,0.2)", marginTop: -20 * S }} />
                <div style={{ width: 28 * S, height: 2 * S, background: "rgba(255,255,255,0.2)", marginTop: 36 * S }} />
              </div>

              {/* Two outputs */}
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 * S }}>
                {/* 主辦確認表 */}
                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <div style={{ width: 0, height: 0, borderTop: `${6 * S}px solid transparent`, borderBottom: `${6 * S}px solid transparent`, borderLeft: `${10 * S}px solid rgba(255,209,102,0.4)` }} />
                  <div style={{ opacity: dfd3, transform: `scale(${interpolate(dfd3, [0, 1], [0.85, 1])})` }}>
                    <div style={{ width: 110 * S, height: 54 * S, background: "rgba(255,209,102,0.06)", border: "1px solid rgba(255,209,102,0.3)", borderRadius: 8 * S, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 17 * S, fontWeight: 700, color: C.yellow, textAlign: "center" as const }}>主辦<br />確認表</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", opacity: dfd3 }}>
                    <div style={{ width: 20 * S, height: 2 * S, background: "rgba(255,209,102,0.3)" }} />
                    <div style={{ width: 0, height: 0, borderTop: `${5 * S}px solid transparent`, borderBottom: `${5 * S}px solid transparent`, borderLeft: `${8 * S}px solid rgba(255,209,102,0.4)` }} />
                  </div>
                  <div style={{ opacity: dfd4, transform: `scale(${interpolate(dfd4, [0, 1], [0.85, 1])})` }}>
                    <div style={{ width: 90 * S, height: 54 * S, borderRadius: "50%", background: "rgba(255,209,102,0.08)", border: "1.5px solid rgba(255,209,102,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 16 * S, color: C.yellow, textAlign: "center" as const }}>主辦<br />系統</span>
                    </div>
                  </div>
                </div>

                {/* 場地座位表 */}
                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <div style={{ width: 0, height: 0, borderTop: `${6 * S}px solid transparent`, borderBottom: `${6 * S}px solid transparent`, borderLeft: `${10 * S}px solid rgba(124,212,255,0.4)` }} />
                  <div style={{ opacity: dfd3, transform: `scale(${interpolate(dfd3, [0, 1], [0.85, 1])})` }}>
                    <div style={{ width: 110 * S, height: 54 * S, background: "rgba(124,212,255,0.06)", border: "1px solid rgba(124,212,255,0.3)", borderRadius: 8 * S, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 17 * S, fontWeight: 700, color: C.blue, textAlign: "center" as const }}>場地<br />座位表</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", opacity: dfd3 }}>
                    <div style={{ width: 20 * S, height: 2 * S, background: "rgba(124,212,255,0.3)" }} />
                    <div style={{ width: 0, height: 0, borderTop: `${5 * S}px solid transparent`, borderBottom: `${5 * S}px solid transparent`, borderLeft: `${8 * S}px solid rgba(124,212,255,0.4)` }} />
                  </div>
                  <div style={{ opacity: dfd5, transform: `scale(${interpolate(dfd5, [0, 1], [0.85, 1])})` }}>
                    <div style={{ width: 90 * S, height: 54 * S, borderRadius: "50%", background: "rgba(124,212,255,0.08)", border: "1.5px solid rgba(124,212,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 16 * S, color: C.blue, textAlign: "center" as const }}>座位<br />系統</span>
                    </div>
                  </div>
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
// SCENE 4.2 — Relay Table (frames 14105–16195, dur 2090)
// ═════════════════════════════════════════════════════════════════════════════
const Scene42Relay: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = 2090;

  // local 230 → relay_table_svg
  // local 1089 → three_benefit_cards
  const relayStart   = 230;
  const benefitStart = 1089;

  const headerStyle = useFadeUpHeader(0);
  const descStyle   = useFadeUp(30);

  const src1 = spring({ frame: Math.max(0, frame - relayStart), fps: 30, config: { damping: 200 } });
  const src2 = spring({ frame: Math.max(0, frame - (relayStart + 15)), fps: 30, config: { damping: 200 } });
  const src3 = spring({ frame: Math.max(0, frame - (relayStart + 30)), fps: 30, config: { damping: 200 } });
  const relay = spring({ frame: Math.max(0, frame - (relayStart + 45)), fps: 30, config: { damping: 200 } });
  const proc  = spring({ frame: Math.max(0, frame - (relayStart + 70)), fps: 30, config: { damping: 200 } });

  const b1 = useFadeUpItem(benefitStart);
  const b2 = useFadeUpItem(benefitStart + 15);
  const b3 = useFadeUpItem(benefitStart + 30);

  const srcNode = (label: string, prog: number, color: string) => (
    <div style={{ opacity: prog, transform: `scale(${interpolate(prog, [0, 1], [0.85, 1])})` }}>
      <div style={{ width: 100 * S, height: 60 * S, borderRadius: "50%", background: `${color}11`, border: `1.5px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 18 * S, color, textAlign: "center" as const }}>{label}</span>
      </div>
    </div>
  );

  const arrow = (prog: number) => (
    <div style={{ display: "flex", alignItems: "center", opacity: prog }}>
      <div style={{ width: 28 * S, height: 2 * S, background: "rgba(124,255,178,0.3)" }} />
      <div style={{ width: 0, height: 0, borderTop: `${5 * S}px solid transparent`, borderBottom: `${5 * S}px solid transparent`, borderLeft: `${9 * S}px solid rgba(124,255,178,0.3)` }} />
    </div>
  );

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={100} />
        <SceneWrap>
          <SectionHeader num="07" title="進階技巧：中繼表" startFrame={0} />

          <Card fadeStyle={descStyle} marginBottom={28 * S}>
            輸入來源超過三個時，建議<span style={{ color: C.primary, fontWeight: 700 }}>先彙整成一張中繼表</span>（統一格式的中間層），再做後續處理。
          </Card>

          {/* Relay table diagram */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 * S, padding: `${28 * S}px ${36 * S}px`, marginBottom: 24 * S }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, marginBottom: 24 * S, letterSpacing: "0.06em" }}>中繼表架構</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, justifyContent: "center" }}>
              {/* Sources */}
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 * S }}>
                {srcNode("管道 A", src1, C.yellow)}
                {srcNode("管道 B", src2, C.yellow)}
                {srcNode("管道 C", src3, C.yellow)}
              </div>

              {/* Arrows to relay */}
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 28 * S }}>
                {[src1, src2, src3].map((p, i) => arrow(p))}
              </div>

              {/* Relay table */}
              <div style={{ opacity: relay, transform: `scale(${interpolate(relay, [0, 1], [0.85, 1])})` }}>
                <div style={{ width: 140 * S, height: 120 * S, background: "rgba(124,255,178,0.1)", border: `2px solid rgba(124,255,178,0.4)`, borderRadius: 14 * S, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 6 * S }}>
                  <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 22 * S, fontWeight: 800, color: C.primary }}>中繼表</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 16 * S, color: C.muted }}>統一格式</span>
                </div>
              </div>

              {arrow(proc)}

              {/* Program */}
              <div style={{ opacity: proc, transform: `scale(${interpolate(proc, [0, 1], [0.85, 1])})` }}>
                <div style={{ width: 110 * S, height: 80 * S, background: "rgba(124,212,255,0.08)", border: "1px solid rgba(124,212,255,0.3)", borderRadius: 10 * S, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 4 * S }}>
                  <span style={{ fontSize: 28 * S }}>⚙️</span>
                  <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 18 * S, color: C.blue }}>程式處理</span>
                </div>
              </div>
            </div>
          </div>

          {/* Three benefit cards */}
          <div style={{ display: "flex", gap: 20 * S }}>
            {[
              { num: "①", title: "複雜度降低", desc: "程式只需讀一份表", s: b1, color: C.primary },
              { num: "②", title: "易於除錯",   desc: "直接看中繼表找問題", s: b2, color: C.yellow },
              { num: "③", title: "擴充容易",   desc: "新增來源只加一步", s: b3, color: C.blue },
            ].map(({ num, title, desc, s, color }) => (
              <div key={num} style={{
                flex: 1, background: `${color}0a`, border: `1px solid ${color}33`,
                borderRadius: 14 * S, padding: `${18 * S}px ${22 * S}px`,
                ...s,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color, fontWeight: 700, marginBottom: 8 * S }}>{num}</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 24 * S, fontWeight: 700, color: C.text, marginBottom: 6 * S }}>{title}</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 20 * S, color: C.muted }}>{desc}</div>
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
// SCENE 5.1 — Mermaid (frames 16195–19130, dur 2935)
// Video overlays: gpt-mermaid-demo at local 1559, mermaid-usage at local 1750
// ═════════════════════════════════════════════════════════════════════════════
const Scene51Mermaid: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = 2935;

  // local 668 → mermaid_intro_card
  // local 1029 → callout
  // local 1559 → gpt-mermaid-demo.mp4 (playbackRate 1.9, 1374f)
  // local 1750 → mermaid-usage.mp4 (510f)
  const mermaidCardStart = 668;

  const headerStyle = useFadeUpHeader(0);
  const descStyle   = useFadeUp(30);
  const cardStyle   = useFadeUp(mermaidCardStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={100} />
        <SceneWrap>
          <SectionHeader num="08" title="Mermaid：用文字畫圖" startFrame={0} />

          <Card fadeStyle={descStyle} marginBottom={28 * S}>
            不擅長拖拉式繪圖工具？推薦試試 <span style={{ color: C.primary, fontWeight: 700 }}>Mermaid</span>——一種用文字生成流程圖的工具。
          </Card>

          {/* Mermaid intro card */}
          <div style={{ display: "flex", gap: 32 * S, marginBottom: 28 * S, ...cardStyle }}>
            {/* Code block */}
            <div style={{
              flex: 1, background: "rgba(0,0,0,0.6)", border: "1px solid rgba(124,255,178,0.2)",
              borderRadius: 16 * S, padding: `${24 * S}px ${28 * S}px`,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, marginBottom: 12 * S, letterSpacing: "0.06em" }}>Mermaid 語法</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, lineHeight: 2.2, color: C.primary }}>
                <div><span style={{ color: C.muted }}>graph TD</span></div>
                <div><span style={{ color: C.text }}>A</span><span style={{ color: C.muted }}>[報名表單]</span></div>
                <div><span style={{ color: C.text }}>{"--> B"}</span><span style={{ color: C.muted }}>[整理資料]</span></div>
                <div><span style={{ color: C.text }}>{"--> C"}</span><span style={{ color: C.muted }}>[轉換格式]</span></div>
              </div>
            </div>

            {/* Arrow */}
            <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: 32 * S, height: 3 * S, background: C.primary, opacity: 0.5 }} />
                <div style={{ width: 0, height: 0, borderTop: `${9 * S}px solid transparent`, borderBottom: `${9 * S}px solid transparent`, borderLeft: `${14 * S}px solid rgba(124,255,178,0.5)` }} />
              </div>
            </div>

            {/* Preview */}
            <div style={{
              flex: 1, background: "rgba(255,255,255,0.97)",
              borderRadius: 16 * S, padding: `${24 * S}px ${28 * S}px`,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: "#888", marginBottom: 12 * S }}>生成流程圖</div>
              <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-start", gap: 8 * S }}>
                {["報名表單", "整理資料", "轉換格式"].map((node, i) => (
                  <React.Fragment key={node}>
                    <div style={{ background: "#f0f0f0", border: "1px solid #ccc", borderRadius: 8, padding: "6px 16px", fontFamily: "'Noto Sans TC',sans-serif", fontSize: 18 * S, fontWeight: 700, color: "#000" }}>{node}</div>
                    {i < 2 && <div style={{ width: 2, height: 16, background: "#999", marginLeft: 24 }} />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <TipBox label="Mermaid 優點" fadeStyle={useFadeUp(mermaidCardStart + 60)} marginBottom={0}>
            Mermaid 處在文字與圖像的中間地帶——<span style={{ color: C.primary }}>AI 擅長閱讀文字，人類是視覺動物</span>。這個工具剛好同時滿足兩種需求。
          </TipBox>
        </SceneWrap>

        <CalloutLayer callouts={callouts} />

        {/* Video overlays — outside SceneWrap */}
        <Sequence from={1559} durationInFrames={1374}>
          <AbsoluteFill style={{ zIndex: 50 }}>
            <OffthreadVideo
              src={staticFile("video/gpt-mermaid-demo.mp4")}
              playbackRate={1.9}
              muted
              style={{ width: W, height: H - SUBTITLE_H, objectFit: "cover", position: "absolute", top: 0, left: 0 }}
            />
          </AbsoluteFill>
        </Sequence>

        <Sequence from={1750} durationInFrames={510}>
          <AbsoluteFill style={{ zIndex: 60 }}>
            <OffthreadVideo
              src={staticFile("video/mermaid-usage.mp4")}
              muted
              style={{ width: W, height: H - SUBTITLE_H, objectFit: "cover", position: "absolute", top: 0, left: 0 }}
            />
          </AbsoluteFill>
        </Sequence>
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 6.1 — Four Tips (frames 19130–22376, dur 3246)
// ═════════════════════════════════════════════════════════════════════════════
const Scene61Tips: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = 3246;

  // local 175 → four_tip_cards
  const tipsStart = 175;

  const headerStyle = useFadeUpHeader(0);
  const introStyle  = useFadeUp(30);

  const t1 = useFadeUpItem(tipsStart);
  const t2 = useFadeUpItem(tipsStart + 20);
  const t3 = useFadeUpItem(tipsStart + 40);
  const t4 = useFadeUpItem(tipsStart + 60);

  const tips = [
    { num: "①", title: "不求完美",       desc: "符號用對了一半就夠，上下文清楚比完美更重要",     s: t1, color: C.primary },
    { num: "②", title: "工具混搭",       desc: "文字、流程圖、資料流圖可以同時用，沒有硬性規定", s: t2, color: C.yellow },
    { num: "③", title: "回頭簡化",       desc: "畫完後再看一次，越簡單的圖 AI 越不容易出錯",     s: t3, color: C.blue },
    { num: "④", title: "現況 + 期待兩張圖", desc: "一張畫現在的流程，一張畫希望改善後的流程，一起給 AI", s: t4, color: "#e29bff" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={100} />
        <SceneWrap>
          <SectionHeader num="09" title="畫圖的四個小提醒" startFrame={0} />

          <Card fadeStyle={introStyle} marginBottom={28 * S}>
            在這個單元結束之前，有<span style={{ color: C.primary, fontWeight: 700 }}>四個小提醒</span>想跟你分享。
          </Card>

          <div style={{ display: "flex", flexDirection: "column" as const, gap: 18 * S }}>
            {tips.map(({ num, title, desc, s, color }) => (
              <div key={num} style={{
                display: "flex", alignItems: "flex-start", gap: 20 * S,
                background: C.surface, border: `1px solid ${color}33`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 16 * S, padding: `${20 * S}px ${28 * S}px`,
                ...s,
              }}>
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 28 * S, fontWeight: 800,
                  color, flexShrink: 0, lineHeight: 1,
                }}>{num}</span>
                <div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 28 * S, fontWeight: 700, color: C.text, marginBottom: 6 * S }}>{title}</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 22 * S, color: C.muted, lineHeight: 1.6 }}>{desc}</div>
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
// SCENE 7.1 — Summary (frames 22376–25002, dur 2626)
// ═════════════════════════════════════════════════════════════════════════════
const AnimatedSummaryItem: React.FC<{ num: string; text: React.ReactNode; startFrame: number }> = ({ num, text, startFrame }) => {
  const fadeStyle = useFadeUpItem(startFrame);
  return <SummaryItem num={num} text={text} fadeStyle={fadeStyle} />;
};

const Scene71Summary: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const dur = 2626;

  // Items start at local ~180 (約 "第一個" = 00:06.040 → frame 181)
  const summaryStart = 181;

  const introStyle = useFadeUp(30);

  const summaryItems = [
    { num: "①", text: <>流程圖以<span style={{ color: C.primary }}>步驟</span>為主角，說明這件事的流程長什麼樣子</> },
    { num: "②", text: <>資料流圖以<span style={{ color: C.yellow }}>資料</span>為主角，說明資料的格式以及如何被加工轉換</> },
    { num: "③", text: <>輸入來源超過三個時，建議彙整成一張<span style={{ color: C.primary }}>中繼表</span>，大幅降低程式複雜度</> },
    { num: "④", text: <>繪圖工具很多，不擅長拖拉就用 <span style={{ color: C.primary, fontFamily: "'Space Mono', monospace" }}>Mermaid</span> 用文字生成流程圖</> },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={100} />
        <SceneWrap>
          <SectionHeader num="10" title="本章重點整理" startFrame={0} />

          <Card fadeStyle={introStyle} marginBottom={28 * S}>
            帶你快速整理一下這個單元所學習到的內容。
          </Card>

          {summaryItems.map(({ num, text }, i) => (
            <AnimatedSummaryItem
              key={num}
              num={num}
              text={text}
              startFrame={summaryStart + i * 22}
            />
          ))}

          <TipBox label="下一單元" color="yellow" fadeStyle={useFadeUp(summaryStart + summaryItems.length * 22 + 30)} marginBottom={0}>
            下個課程：進入 SDLC 第三步——<span style={{ color: C.yellow, fontWeight: 700 }}>解法設計</span>，學習如何把需求轉成可執行的開發方案。
          </TipBox>
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// Root Composition — FullVideo07
// ═════════════════════════════════════════════════════════════════════════════
export const FullVideo07: React.FC = () => {
  const S0 = SEG_STARTS_07;
  // Each scene gets its local callout slice (those whose `from` falls within segment)
  const getCallouts = (segStart: number, segEnd: number) =>
    GLOBAL_CALLOUTS.map(c => ({
      ...c,
      from: c.from - segStart,
      to:   c.to   - segStart,
    })).filter(c => c.from >= -FADE_OUT_F && c.from < (segEnd - segStart));

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
      <Sequence from={S0[0]} durationInFrames={1557}>
        <Audio src={staticFile("audio/1-4_1.1-normalized.wav")} />
        <Scene11Hero callouts={getCallouts(S0[0], S0[1])} />
      </Sequence>

      {/* ── Segment 2.1 ── */}
      <Sequence from={S0[1]} durationInFrames={1244}>
        <Audio src={staticFile("audio/1-4_2.1-normalized.wav")} />
        <Scene21Overview callouts={getCallouts(S0[1], S0[2])} />
      </Sequence>

      {/* ── Segment 3.1 ── */}
      <Sequence from={S0[2]} durationInFrames={2407}>
        <Audio src={staticFile("audio/1-4_3.1-normalized.wav")} />
        <Scene31Flowchart callouts={getCallouts(S0[2], S0[3])} />
      </Sequence>

      {/* ── Segment 3.2 ── */}
      <Sequence from={S0[3]} durationInFrames={1556}>
        <Audio src={staticFile("audio/1-4_3.2-normalized.wav")} />
        <Scene32Example callouts={getCallouts(S0[3], S0[4])} />
      </Sequence>

      {/* ── Segment 3.3 ── */}
      <Sequence from={S0[4]} durationInFrames={2047}>
        <Audio src={staticFile("audio/1-4_3.3-normalized.wav")} />
        <Scene33Diamond callouts={getCallouts(S0[4], S0[5])} />
      </Sequence>

      {/* ── Segment 4.0 ── */}
      <Sequence from={S0[5]} durationInFrames={1685}>
        <Audio src={staticFile("audio/1-4_4.0-normalized.wav")} />
        <Scene40DataFlow callouts={getCallouts(S0[5], S0[6])} />
      </Sequence>

      {/* ── Segment 4.1 ── */}
      <Sequence from={S0[6]} durationInFrames={3609}>
        <Audio src={staticFile("audio/1-4_4.1-normalized.wav")} />
        <Scene41DFD callouts={getCallouts(S0[6], S0[7])} />
      </Sequence>

      {/* ── Segment 4.2 ── */}
      <Sequence from={S0[7]} durationInFrames={2090}>
        <Audio src={staticFile("audio/1-4_4.2-normalized.wav")} />
        <Scene42Relay callouts={getCallouts(S0[7], S0[8])} />
      </Sequence>

      {/* ── Segment 5.1 ── */}
      <Sequence from={S0[8]} durationInFrames={2935}>
        <Audio src={staticFile("audio/1-4_5.1-normalized.wav")} />
        <Scene51Mermaid callouts={getCallouts(S0[8], S0[9])} />
      </Sequence>

      {/* ── Segment 6.1 ── */}
      <Sequence from={S0[9]} durationInFrames={3246}>
        <Audio src={staticFile("audio/1-4_6.1-normalized.wav")} />
        <Scene61Tips callouts={getCallouts(S0[9], S0[10])} />
      </Sequence>

      {/* ── Segment 7.1 ── */}
      <Sequence from={S0[10]} durationInFrames={2626}>
        <Audio src={staticFile("audio/1-4_7.1-normalized.wav")} />
        <Scene71Summary callouts={getCallouts(S0[10], TOTAL_FRAMES_07)} />
      </Sequence>
    </AbsoluteFill>
  );
};
