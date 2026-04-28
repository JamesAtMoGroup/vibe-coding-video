import React from "react";
import {
  AbsoluteFill,
  Audio,
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
// Design System (mirrors FullVideo07.tsx)
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
  pink:         "#e29bff",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const W = 3840;
const H = 2160;
const NAV_H      = 72  * S;
const SUBTITLE_H = 160 * S;
const CONTAINER_W = 1500 * S;

// ─────────────────────────────────────────────────────────────────────────────
// Segments — CH 2-1 (locked timing from spec)
// ─────────────────────────────────────────────────────────────────────────────
export const SEG_STARTS_08 = [0, 1426, 3967, 6379, 11699, 15838];
export const TOTAL_FRAMES_08 = 18774;

const SEG_DURATIONS = [1426, 2541, 2412, 5320, 4139, 2936];

// ─────────────────────────────────────────────────────────────────────────────
// Global Callouts (from spec, global frame = scene_start_frame + local_frame)
// ─────────────────────────────────────────────────────────────────────────────
type Callout = { from: number; to: number; sender: string; text: string };

const CALLOUT_DURATION = 100; // 100 frames visible

const GLOBAL_CALLOUTS: Callout[] = [
  // Scene 0.1 — local 1079 → global 1079
  { from: 1079,  to: 1079 + CALLOUT_DURATION,  sender: "James", text: "跳過解法設計，常常做到一半就翻車" },
  // Scene 1.1 — local 1382 → global 1426 + 1382 = 2808
  { from: 2808,  to: 2808 + CALLOUT_DURATION,  sender: "James", text: "選錯交通＝寫錯方向，代價是時間" },
  // Scene 2.1 — local 2196 → global 3967 + 2196 = 6163
  { from: 6163,  to: 6163 + CALLOUT_DURATION,  sender: "James", text: "方向你來把，細節 AI 包辦" },
  // Scene 3.1 — local 4042 → global 6379 + 4042 = 10421
  { from: 10421, to: 10421 + CALLOUT_DURATION, sender: "James", text: "別慌，今天先有印象就好" },
  // Scene 4.1 — local 1774 → global 11699 + 1774 = 13473
  { from: 13473, to: 13473 + CALLOUT_DURATION, sender: "James", text: "AI 要的是溝通，不是規格書" },
  // Scene 4.1 — local 4060 → global 11699 + 4060 = 15759
  { from: 15759, to: 15759 + CALLOUT_DURATION, sender: "James", text: "用一個問題篩掉 80% 的學習焦慮" },
  // Scene 5.1 — local 2846 → global 15838 + 2846 = 18684
  { from: 18684, to: 18684 + 90,               sender: "James", text: "下一單元：工程師思維，切換解題策略" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Animation Hooks (mirror 07)
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

function useScaleIn(startFrame: number): AnimStyle {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const progress = spring({ frame: f, fps, config: { damping: 22, stiffness: 130 } });
  const opacity = interpolate(f, [0, 0.3 * fps], [0, 1], clamp);
  const scale = interpolate(progress, [0, 1], [0.85, 1]);
  return { opacity, transform: `scale(${scale})` };
}

function usePulse(startFrame: number, period = 60): number {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  return 1 + 0.04 * Math.sin((f / period) * Math.PI * 2);
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
// ProgressBar — CH 2-1
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
        <span style={{ fontSize: 20 * S, color: C.muted }}>CH 2-1</span>
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
// Card / TipBox (mirror 07)
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
// iMessage Callout (mirror 07)
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
// SceneWrap (subtitle safe zone bottom 80*S = 160*S total via SUBTITLE_H)
// ─────────────────────────────────────────────────────────────────────────────
const SceneWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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
    }}>
      {children}
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 0.1 — Open / Recap → Concept Reveal (frames 0–1426)
// ═════════════════════════════════════════════════════════════════════════════
const Scene01Open: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[0];

  // Animation triggers from spec
  const recapStart   = 176;   // recap_chip_row
  const heroStart    = 641;   // keyword_reveal_hero "解法設計"
  const flowStart    = 823;   // three_stage_flow
  const defStart     = 1183;  // definition_card

  // Initial title / subtitle
  const subtitleStyle = useFadeUp(20);
  const titleStyle    = useFadeUpHeader(45);
  const descStyle     = useFadeUp(80);

  // Recap chips (3)
  const chip1 = useFadeUpItem(recapStart);
  const chip2 = useFadeUpItem(recapStart + 14);
  const chip3 = useFadeUpItem(recapStart + 28);

  // Hero keyword
  const heroOpacity = interpolate(frame - heroStart, [0, 18], [0, 1], clamp);
  const heroScale = interpolate(
    spring({ frame: Math.max(0, frame - heroStart), fps: 30, config: { damping: 12, stiffness: 110 } }),
    [0, 1], [0.7, 1]
  );
  const heroLineW = interpolate(
    spring({ frame: Math.max(0, frame - heroStart - 14), fps: 30, config: { damping: 200 } }),
    [0, 1], [0, 100], clamp
  );

  // Three-stage flow
  const stage1 = useFadeUpItem(flowStart);
  const stage2 = useFadeUpItem(flowStart + 18);
  const stage3 = useFadeUpItem(flowStart + 36);
  const flowPulse = usePulse(flowStart + 36, 50);

  // Definition card
  const defStyle = useFadeUpElastic(defStart);

  // Recap chips fade-out as hero appears
  const recapFade = interpolate(frame, [heroStart - 20, heroStart + 20], [1, 0], clamp);
  // Hero fades when flow appears
  const heroFade = interpolate(frame, [flowStart - 30, flowStart + 10], [1, 0], clamp);
  // Flow fades when definition appears
  const flowFade = interpolate(frame, [defStart - 30, defStart + 10], [1, 0], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={28} />
        <SceneWrap>
          {/* Chapter badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 24 * S, ...subtitleStyle }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.primary, border: `1px solid ${C.primary}`, padding: `${4 * S}px ${14 * S}px`, borderRadius: 99, letterSpacing: "0.05em", textShadow: "0 0 10px rgba(124,255,178,0.4)" }}>CH 2-1</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`, padding: `${4 * S}px ${12 * S}px`, borderRadius: 99 }}>SDLC 第三步</span>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 28 * S, ...titleStyle }}>
            <h1 style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 60 * S, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.02em", color: C.text, margin: 0 }}>
              先別寫程式：<br />
              <span style={{ color: C.primary }}>思考不同解法，選一條最可行的路</span>
            </h1>
          </div>

          {/* Desc */}
          <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: C.muted, lineHeight: 1.7, maxWidth: 1100 * S, marginBottom: 36 * S, ...descStyle }}>
            上一章把現況、痛點、期待都說清楚了，這一章我們進入解法設計：在動手前，先選對路。
          </p>

          {/* Recap chip row */}
          <div style={{ display: "flex", gap: 18 * S, marginBottom: 36 * S, opacity: recapFade }}>
            {[
              { label: "現況", s: chip1 },
              { label: "痛點", s: chip2 },
              { label: "期待", s: chip3 },
            ].map(({ label, s }) => (
              <div key={label} style={{
                background: "rgba(124,255,178,0.1)", border: `1.5px solid rgba(124,255,178,0.4)`,
                borderRadius: 99, padding: `${12 * S}px ${30 * S}px`,
                fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, fontWeight: 700,
                color: C.primary, letterSpacing: "0.04em",
                boxShadow: "0 0 18px rgba(124,255,178,0.18)",
                ...s,
              }}>{label}</div>
            ))}
          </div>

          {/* Keyword hero "解法設計" — overlay at heroStart */}
          {frame >= heroStart - 6 && frame < flowStart - 6 && (
            <div style={{
              position: "absolute",
              top: 220 * S, left: 0, right: 0,
              display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
              opacity: heroOpacity * heroFade,
              transform: `scale(${heroScale})`,
              zIndex: 5,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 24 * S, color: C.muted, letterSpacing: "0.18em", marginBottom: 18 * S }}>本章主題</div>
              <div style={{
                fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 140 * S, fontWeight: 900,
                color: C.text, letterSpacing: "0.04em",
                textShadow: `0 0 36px rgba(124,255,178,0.3)`,
              }}>解法設計</div>
              <div style={{
                height: 6 * S, background: C.primary, borderRadius: 99,
                marginTop: 16 * S,
                width: `${heroLineW}%`,
                maxWidth: 600 * S,
                boxShadow: "0 0 20px rgba(124,255,178,0.6)",
              }} />
            </div>
          )}

          {/* Three-stage flow — overlay at flowStart */}
          {frame >= flowStart - 6 && frame < defStart - 6 && (
            <div style={{
              position: "absolute",
              top: 240 * S, left: 0, right: 0,
              display: "flex", flexDirection: "column" as const, alignItems: "center",
              opacity: flowFade, zIndex: 5,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.muted, letterSpacing: "0.14em", marginBottom: 40 * S }}>SDLC 三步流程</div>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {[
                  { label: "需求分析", sub: "Step 1", s: stage1, active: false },
                  { label: "解法設計", sub: "Step 2", s: stage2, active: true },
                  { label: "寫程式",   sub: "Step 3", s: stage3, active: false },
                ].map(({ label, sub, s, active }, i) => (
                  <React.Fragment key={label}>
                    <div style={{
                      ...s,
                      transform: active
                        ? `${s.transform} scale(${flowPulse})`
                        : s.transform,
                    }}>
                      <div style={{
                        background: active ? "rgba(124,255,178,0.14)" : "rgba(255,255,255,0.04)",
                        border: active ? `2.5px solid ${C.primary}` : "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 24 * S,
                        padding: `${30 * S}px ${44 * S}px`,
                        display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8 * S,
                        boxShadow: active ? "0 0 36px rgba(124,255,178,0.35)" : "none",
                        minWidth: 240 * S,
                      }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: active ? C.primary : C.muted, letterSpacing: "0.1em" }}>{sub}</span>
                        <span style={{
                          fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                          fontSize: 36 * S, fontWeight: 800,
                          color: active ? C.primary : C.muted,
                        }}>{label}</span>
                      </div>
                    </div>
                    {i < 2 && (
                      <div style={{ display: "flex", alignItems: "center", padding: `0 ${14 * S}px` }}>
                        <div style={{ width: 36 * S, height: 3 * S, background: "rgba(255,255,255,0.25)" }} />
                        <div style={{ width: 0, height: 0, borderTop: `${10 * S}px solid transparent`, borderBottom: `${10 * S}px solid transparent`, borderLeft: `${16 * S}px solid rgba(255,255,255,0.4)` }} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Definition card — overlay at defStart */}
          {frame >= defStart - 6 && (
            <div style={{
              position: "absolute",
              top: 320 * S, left: 0, right: 0,
              display: "flex", justifyContent: "center",
              ...defStyle, zIndex: 5,
            }}>
              <div style={{
                background: "rgba(124,255,178,0.06)",
                border: `2px solid rgba(124,255,178,0.45)`,
                borderRadius: 28 * S,
                padding: `${50 * S}px ${64 * S}px`,
                maxWidth: 1300 * S,
                boxShadow: "0 0 50px rgba(124,255,178,0.18)",
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.primary, letterSpacing: "0.14em", marginBottom: 18 * S, display: "flex", alignItems: "center", gap: 10 * S }}>
                  <span style={{ fontSize: 32 * S }}>"</span>
                  <span>DEFINITION</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                  fontSize: 44 * S, fontWeight: 800, lineHeight: 1.5, color: C.text,
                }}>
                  在眾多方案中，<span style={{ color: C.primary }}>先挑出最適合的那一條</span>，再開始動手。
                </div>
              </div>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 1.1 — Concept (Transport analogy) (frames 1426–3967)
// ═════════════════════════════════════════════════════════════════════════════
const Scene11Concept: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[1];

  const pinStart      = 139;   // destination_pin
  const transportStart = 261;  // transport_options_grid
  const axesStart     = 738;   // evaluation_axes
  const insightStart  = 1536;  // insight_card "最適合 ≠ 最快"
  const tradeoffStart = 1978;  // tradeoff_three_chips

  const headerStyle = useFadeUpHeader(0);
  const descStyle   = useFadeUp(30);

  // Pin
  const pinStyle = useFadeUpElastic(pinStart);
  const pinPulse = usePulse(pinStart, 60);

  // Transport cards (4) - 2x2 grid
  const t1 = useFadeUpItem(transportStart);
  const t2 = useFadeUpItem(transportStart + 14);
  const t3 = useFadeUpItem(transportStart + 28);
  const t4 = useFadeUpItem(transportStart + 42);

  // Axes
  const axis1 = useFadeUpItem(axesStart);
  const axis2 = useFadeUpItem(axesStart + 14);
  const axis3 = useFadeUpItem(axesStart + 28);
  const ratingProg = spring({ frame: Math.max(0, frame - axesStart - 50), fps: 30, config: { damping: 200 } });

  // Insight card
  const insightStyle = useFadeUpElastic(insightStart);
  // Tradeoff chips
  const tr1 = useFadeUpItem(tradeoffStart);
  const tr2 = useFadeUpItem(tradeoffStart + 14);
  const tr3 = useFadeUpItem(tradeoffStart + 28);

  // Fade-out logic
  const transportFade = interpolate(frame, [insightStart - 30, insightStart + 10], [1, 0], clamp);
  const insightFade   = interpolate(frame, [tradeoffStart - 30, tradeoffStart + 10], [1, 0], clamp);

  // Transport options data
  const transports = [
    { emoji: "🚕", label: "計程車", note: "快但貴", s: t1 },
    { emoji: "🚲", label: "YouBike", note: "彈性中", s: t2 },
    { emoji: "🚇", label: "捷運",    note: "穩定快", s: t3 },
    { emoji: "🚶", label: "走路",    note: "近距離", s: t4 },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={42} />
        <SceneWrap>
          <SectionHeader num="01" title="解法設計：選一條最可行的路" startFrame={0} />

          <Card fadeStyle={descStyle} marginBottom={32 * S}>
            想像你要去一個地方<span style={{ color: C.primary, fontWeight: 700 }}>開會</span>——交通工具有很多種，但<span style={{ color: C.primary, fontWeight: 700 }}>最適合的那一條路</span>只有一條。寫程式也一樣。
          </Card>

          {/* Destination pin — top center */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 * S, ...pinStyle, transform: `${pinStyle.transform} scale(${pinPulse})` }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 18 * S,
              background: "rgba(124,255,178,0.08)", border: `1.5px solid rgba(124,255,178,0.4)`,
              borderRadius: 99, padding: `${16 * S}px ${36 * S}px`,
              boxShadow: "0 0 28px rgba(124,255,178,0.22)",
            }}>
              <span style={{ fontSize: 40 * S }}>📍</span>
              <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 30 * S, fontWeight: 800, color: C.primary }}>目的地：開會</span>
            </div>
          </div>

          {/* Transport options 2x2 grid — fades out when insight comes */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 * S,
            marginBottom: 24 * S, opacity: transportFade,
          }}>
            {transports.map(({ emoji, label, note, s }, i) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(124,255,178,0.18)",
                borderRadius: 22 * S, padding: `${24 * S}px ${32 * S}px`,
                display: "flex", alignItems: "center", gap: 24 * S,
                ...s,
              }}>
                <span style={{ fontSize: 64 * S }}>{emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 32 * S, fontWeight: 800, color: C.text, marginBottom: 6 * S }}>{label}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, letterSpacing: "0.04em" }}>{note}</div>
                </div>
                {/* Evaluation rating dots — appear at axesStart */}
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 * S, opacity: ratingProg }}>
                  {[0, 1, 2].map(j => {
                    const filled = ((i + j) % 3) <= 1;
                    return (
                      <div key={j} style={{
                        width: 14 * S, height: 14 * S, borderRadius: "50%",
                        background: filled ? C.primary : "rgba(255,255,255,0.15)",
                        boxShadow: filled ? `0 0 8px ${C.primary}` : "none",
                      }} />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Evaluation axes labels (frame 738+) */}
          <div style={{
            display: "flex", gap: 16 * S, justifyContent: "center",
            marginBottom: 12 * S, opacity: transportFade,
          }}>
            {[
              { label: "距離", s: axis1 },
              { label: "時間", s: axis2 },
              { label: "天氣", s: axis3 },
            ].map(({ label, s }) => (
              <div key={label} style={{
                background: "rgba(124,212,255,0.08)", border: "1px solid rgba(124,212,255,0.3)",
                borderRadius: 99, padding: `${8 * S}px ${22 * S}px`,
                fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.blue,
                letterSpacing: "0.06em",
                ...s,
              }}>評估：{label}</div>
            ))}
          </div>

          {/* Insight card overlay */}
          {frame >= insightStart - 6 && frame < tradeoffStart - 6 && (
            <div style={{
              position: "absolute",
              top: 280 * S, left: 0, right: 0,
              display: "flex", justifyContent: "center",
              zIndex: 5,
              ...insightStyle,
              opacity: insightStyle.opacity * insightFade,
            }}>
              <div style={{
                background: "rgba(124,255,178,0.08)",
                border: `2.5px solid rgba(124,255,178,0.5)`,
                borderRadius: 28 * S,
                padding: `${50 * S}px ${72 * S}px`,
                maxWidth: 1300 * S,
                boxShadow: "0 0 50px rgba(124,255,178,0.25)",
                textAlign: "center" as const,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                  fontSize: 88 * S, fontWeight: 900, lineHeight: 1.2, color: C.text,
                  marginBottom: 28 * S, letterSpacing: "0.02em",
                }}>
                  最適合 <span style={{ color: C.primary }}>≠</span> 最快
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                  fontSize: 32 * S, color: C.muted, lineHeight: 1.6,
                }}>
                  解法設計＝挑出<span style={{ color: C.primary, fontWeight: 700 }}>最匹配當下狀況</span>的方案
                </div>
              </div>
            </div>
          )}

          {/* Tradeoff three chips overlay */}
          {frame >= tradeoffStart - 6 && (
            <div style={{
              position: "absolute",
              top: 360 * S, left: 0, right: 0,
              display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 28 * S,
              zIndex: 5,
            }}>
              <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 36 * S, fontWeight: 800, color: C.text }}>
                同一需求＝多種技術方案的權衡
              </div>
              <div style={{ display: "flex", gap: 24 * S, flexWrap: "wrap" as const, justifyContent: "center" }}>
                {[
                  { label: "快又穩",       color: C.primary, s: tr1 },
                  { label: "你能掌握",     color: C.blue,    s: tr2 },
                  { label: "需多花時間上手", color: C.yellow, s: tr3 },
                ].map(({ label, color, s }) => (
                  <div key={label} style={{
                    background: `${color}15`, border: `2px solid ${color}55`,
                    borderRadius: 99, padding: `${16 * S}px ${36 * S}px`,
                    fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 30 * S, fontWeight: 700,
                    color, boxShadow: `0 0 20px ${color}33`,
                    ...s,
                  }}>{label}</div>
                ))}
              </div>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 2.1 — Best Path (frames 3967–6379)
// ═════════════════════════════════════════════════════════════════════════════
const Scene21BestPath: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[2];

  const ctxStart   = 568;   // context_gap_card
  const cmpStart   = 843;   // two_path_comparison
  const mapStart   = 1204;  // office_map_svg
  const roleStart  = 1793;  // role_split_card

  const headerStyle = useFadeUpHeader(0);
  const descStyle   = useFadeUp(30);

  // Context gap card
  const ctxStyle = useFadeUpElastic(ctxStart);
  const ctxItem1 = useFadeUpItem(ctxStart + 14);
  const ctxItem2 = useFadeUpItem(ctxStart + 28);
  const ctxItem3 = useFadeUpItem(ctxStart + 42);

  // Comparison cards
  const cmpL = useFadeUpItem(cmpStart);
  const cmpR = useFadeUpItem(cmpStart + 18);

  // Office map SVG (signature moment)
  const mapApp = spring({ frame: Math.max(0, frame - mapStart), fps: 30, config: { damping: 22, stiffness: 130 } });
  const longPathProg = interpolate(frame - mapStart - 10, [0, 80], [0, 1], clamp);
  const shortPathProg = interpolate(frame - mapStart - 100, [0, 50], [0, 1], clamp);
  const taxiX = interpolate(longPathProg, [0, 1], [0, 1]);
  const shortLineDash = interpolate(shortPathProg, [0, 1], [800, 0]);

  // Role split
  const roleStyle = useFadeUpElastic(roleStart);

  // Fade-out logic
  const ctxFade = interpolate(frame, [cmpStart - 30, cmpStart + 10], [1, 0], clamp);
  const cmpFade = interpolate(frame, [mapStart - 30, mapStart + 10], [1, 0], clamp);
  const mapFade = interpolate(frame, [roleStart - 30, roleStart + 10], [1, 0], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={55} />
        <SceneWrap>
          <SectionHeader num="02" title="對你最短的路 ≠ 理論最佳" startFrame={0} />

          <Card fadeStyle={descStyle} marginBottom={32 * S}>
            AI 不了解你目前的<span style={{ color: C.primary, fontWeight: 700 }}>脈絡</span>——它只能依字面回答你。所以你的工作是告訴它走<span style={{ color: C.primary, fontWeight: 700 }}>哪一條路</span>。
          </Card>

          {/* Context gap card — first overlay */}
          {frame < cmpStart - 6 && (
            <div style={{
              ...ctxStyle,
              opacity: ctxStyle.opacity * ctxFade,
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 24 * S, padding: `${36 * S}px ${48 * S}px`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 32 * S }}>
                {/* AI icon */}
                <div style={{
                  width: 160 * S, height: 160 * S, borderRadius: 32 * S,
                  background: "linear-gradient(145deg, rgba(124,255,178,0.12) 0%, rgba(124,212,255,0.08) 100%)",
                  border: `2px solid rgba(124,255,178,0.35)`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  boxShadow: "0 0 28px rgba(124,255,178,0.18)",
                }}>
                  <span style={{ fontSize: 90 * S }}>🤖</span>
                </div>

                {/* Three unknown items */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: 14 * S }}>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 30 * S, fontWeight: 800, color: C.text, marginBottom: 6 * S }}>AI 不知道的事：</div>
                  {[
                    { text: "你有多少時間", s: ctxItem1 },
                    { text: "你學到哪裡了", s: ctxItem2 },
                    { text: "環境有什麼限制", s: ctxItem3 },
                  ].map(({ text, s }) => (
                    <div key={text} style={{
                      display: "flex", alignItems: "center", gap: 16 * S,
                      background: "rgba(255,209,102,0.06)",
                      border: "1px solid rgba(255,209,102,0.25)",
                      borderRadius: 14 * S, padding: `${14 * S}px ${22 * S}px`,
                      ...s,
                    }}>
                      <span style={{ fontSize: 28 * S }}>❓</span>
                      <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: "#ffe8a0" }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Two-path comparison overlay */}
          {frame >= cmpStart - 6 && frame < mapStart - 6 && (
            <div style={{
              opacity: cmpFade,
              display: "flex", gap: 28 * S, alignItems: "stretch",
            }}>
              {/* Left: theoretical best */}
              <div style={{
                flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 22 * S, padding: `${32 * S}px ${36 * S}px`,
                ...cmpL,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, letterSpacing: "0.1em", marginBottom: 16 * S }}>OPTION A</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 36 * S, fontWeight: 800, color: C.muted, marginBottom: 14 * S }}>理論最佳方案</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 24 * S, color: C.muted, lineHeight: 1.7 }}>
                  漂亮、完整，但對你來說<span style={{ color: C.yellow }}>太長太重</span>。
                </div>
              </div>

              {/* Vs */}
              <div style={{ display: "flex", alignItems: "center", padding: `0 ${12 * S}px` }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 32 * S, fontWeight: 800, color: C.primary,
                  border: `2px solid ${C.primary}`, borderRadius: 99, padding: `${10 * S}px ${22 * S}px`,
                  background: "rgba(124,255,178,0.08)", boxShadow: "0 0 20px rgba(124,255,178,0.3)",
                }}>VS</div>
              </div>

              {/* Right: shortest path for you */}
              <div style={{
                flex: 1, background: "rgba(124,255,178,0.08)", border: `2px solid rgba(124,255,178,0.45)`,
                borderRadius: 22 * S, padding: `${32 * S}px ${36 * S}px`,
                boxShadow: "0 0 30px rgba(124,255,178,0.18)",
                ...cmpR,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.primary, letterSpacing: "0.1em", marginBottom: 16 * S }}>OPTION B (BEST)</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 36 * S, fontWeight: 800, color: C.primary, marginBottom: 14 * S }}>對你最短的路</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 24 * S, color: "#c8ffe0", lineHeight: 1.7 }}>
                  考慮你的時間、能力、情境——<span style={{ color: C.primary, fontWeight: 700 }}>真正可執行</span>的那條。
                </div>
              </div>
            </div>
          )}

          {/* Office map SVG overlay (signature moment) */}
          {frame >= mapStart - 6 && frame < roleStart - 6 && (
            <div style={{
              opacity: mapFade * mapApp,
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 24 * S, padding: `${36 * S}px ${48 * S}px`,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, letterSpacing: "0.1em", marginBottom: 20 * S }}>園區俯視圖</div>
              <svg viewBox="0 0 1400 600" style={{ width: "100%", height: 600 * S * 0.8 }}>
                {/* Park background */}
                <rect x={0} y={0} width={1400} height={600} fill="rgba(255,255,255,0.02)" />
                {/* Grid pattern (subtle) */}
                {[100, 200, 300, 400, 500].map(y => (
                  <line key={y} x1={0} y1={y} x2={1400} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                ))}
                {[200, 400, 600, 800, 1000, 1200].map(x => (
                  <line key={x} x1={x} y1={0} x2={x} y2={600} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                ))}

                {/* Building A (start) */}
                <rect x={150} y={220} width={140} height={140} fill="rgba(124,255,178,0.1)" stroke={C.primary} strokeWidth={3} rx={8} />
                <text x={220} y={300} textAnchor="middle" fill={C.primary} fontSize={28} fontWeight={700} fontFamily="'Noto Sans TC',sans-serif">起點</text>
                <text x={220} y={335} textAnchor="middle" fill={C.muted} fontSize={20} fontFamily="'Space Mono',monospace">A 棟</text>

                {/* Building B (destination - next door) */}
                <rect x={320} y={220} width={140} height={140} fill="rgba(124,255,178,0.1)" stroke={C.primary} strokeWidth={3} rx={8} />
                <text x={390} y={300} textAnchor="middle" fill={C.primary} fontSize={28} fontWeight={700} fontFamily="'Noto Sans TC',sans-serif">目的地</text>
                <text x={390} y={335} textAnchor="middle" fill={C.muted} fontSize={20} fontFamily="'Space Mono',monospace">B 棟</text>

                {/* AI's long taxi path (red dashed, big loop) */}
                <path
                  d="M 220 220 Q 220 80, 700 80 Q 1180 80, 1300 300 Q 1300 520, 700 520 Q 220 520, 220 380 Q 220 360, 320 360"
                  fill="none" stroke="#ff6b6b" strokeWidth={6} strokeDasharray="20 12"
                  strokeDashoffset={(1 - taxiX) * 3000}
                  opacity={0.85}
                />
                <text x={1100} y={130} fill="#ff6b6b" fontSize={22} fontWeight={700} fontFamily="'Noto Sans TC',sans-serif" opacity={longPathProg > 0.4 ? 1 : 0}>AI 建議：計程車繞一圈</text>

                {/* Taxi marker moving along path */}
                <g style={{
                  transform: `translate(${
                    interpolate(taxiX, [0, 0.25, 0.5, 0.75, 1], [220, 1280, 1280, 220, 320])
                  }px, ${
                    interpolate(taxiX, [0, 0.25, 0.5, 0.75, 1], [220, 80, 520, 520, 360])
                  }px)`,
                }}>
                  <circle r={20} fill="#ff6b6b" opacity={longPathProg > 0 && longPathProg < 1 ? 1 : 0} />
                  <text textAnchor="middle" dy={8} fontSize={28} opacity={longPathProg > 0 && longPathProg < 1 ? 1 : 0}>🚕</text>
                </g>

                {/* Local's short path (green solid line, direct) */}
                <line
                  x1={290} y1={290} x2={320} y2={290}
                  stroke={C.primary} strokeWidth={8}
                  strokeDasharray={800}
                  strokeDashoffset={shortLineDash}
                  opacity={shortPathProg > 0 ? 1 : 0}
                />
                {/* Walker icon at midpoint */}
                <text x={305} y={260} textAnchor="middle" fontSize={28} opacity={shortPathProg > 0.3 ? 1 : 0}>🚶</text>
                <text x={305} y={400} textAnchor="middle" fill={C.primary} fontSize={26} fontWeight={800} fontFamily="'Noto Sans TC',sans-serif" opacity={shortPathProg > 0.5 ? 1 : 0}>熟手：走過去 2 分鐘</text>
              </svg>
            </div>
          )}

          {/* Role split card overlay */}
          {frame >= roleStart - 6 && (
            <div style={{
              ...roleStyle,
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 24 * S, padding: `${40 * S}px ${48 * S}px`,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 28 * S }}>角色分工</div>
              <div style={{ display: "flex", alignItems: "center", gap: 24 * S }}>
                {/* You */}
                <div style={{
                  flex: 1, background: "rgba(124,255,178,0.08)", border: `2px solid rgba(124,255,178,0.4)`,
                  borderRadius: 20 * S, padding: `${28 * S}px ${36 * S}px`,
                  textAlign: "center" as const,
                  boxShadow: "0 0 24px rgba(124,255,178,0.18)",
                }}>
                  <div style={{ fontSize: 70 * S, marginBottom: 14 * S }}>🧑‍💻</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 38 * S, fontWeight: 800, color: C.primary, marginBottom: 12 * S }}>你</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 28 * S, color: C.text, lineHeight: 1.6 }}>
                    決定<span style={{ color: C.primary, fontWeight: 800, fontSize: 32 * S }}>方向</span>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8 * S }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.1em" }}>下指令</div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ width: 48 * S, height: 4 * S, background: C.primary, opacity: 0.7 }} />
                    <div style={{ width: 0, height: 0, borderTop: `${10 * S}px solid transparent`, borderBottom: `${10 * S}px solid transparent`, borderLeft: `${16 * S}px solid ${C.primary}` }} />
                  </div>
                </div>

                {/* AI */}
                <div style={{
                  flex: 1, background: "rgba(124,212,255,0.08)", border: `2px solid rgba(124,212,255,0.4)`,
                  borderRadius: 20 * S, padding: `${28 * S}px ${36 * S}px`,
                  textAlign: "center" as const,
                  boxShadow: "0 0 24px rgba(124,212,255,0.18)",
                }}>
                  <div style={{ fontSize: 70 * S, marginBottom: 14 * S }}>🤖</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 38 * S, fontWeight: 800, color: C.blue, marginBottom: 12 * S }}>AI</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 28 * S, color: C.text, lineHeight: 1.6 }}>
                    執行<span style={{ color: C.blue, fontWeight: 800, fontSize: 32 * S }}>細節</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 3.1 — Tech Keywords (frames 6379–11699)
// ═════════════════════════════════════════════════════════════════════════════
const Scene31Keywords: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[3];

  const searchStart = 277;   // search_bar_demo
  const fbStart     = 1573;  // frontend_backend_split
  const zooStart    = 2629;  // tech_keyword_zoo
  const mindmapStart = 4808; // mindmap_radial_svg

  const headerStyle = useFadeUpHeader(0);
  const descStyle   = useFadeUp(30);

  // Search bar demo
  const searchStyle = useFadeUpElastic(searchStart);
  const leftListProg = interpolate(frame - searchStart - 30, [0, 60], [0, 1], clamp);
  const rightListProg = interpolate(frame - searchStart - 90, [0, 60], [0, 1], clamp);

  // Frontend/backend split
  const fbStyle = useFadeUpElastic(fbStart);

  // Tech keyword zoo (6 chips, sequential)
  const zooKeywords = ["資料庫", "部署", "API", "爬蟲", "腳本", "排程"];
  const zooProgs = zooKeywords.map((_, i) =>
    spring({ frame: Math.max(0, frame - (zooStart + i * 22)), fps: 30, config: { damping: 16, stiffness: 130 } })
  );

  // Mindmap (signature moment) — radial expansion
  const mindmapApp = spring({ frame: Math.max(0, frame - mindmapStart), fps: 30, config: { damping: 22, stiffness: 130 } });
  const branchProg = interpolate(frame - mindmapStart - 20, [0, 60], [0, 1], clamp);
  const leafProg = interpolate(frame - mindmapStart - 80, [0, 80], [0, 1], clamp);

  // Fade-out logic
  const searchFade = interpolate(frame, [fbStart - 30, fbStart + 10], [1, 0], clamp);
  const fbFade     = interpolate(frame, [zooStart - 30, zooStart + 10], [1, 0], clamp);
  const zooFade    = interpolate(frame, [mindmapStart - 30, mindmapStart + 10], [1, 0], clamp);

  // Mindmap branches data
  const branches = [
    { angle: -150, label: "前後端", color: C.primary,  leaves: ["前端", "後端", "API"] },
    { angle: -60,  label: "資料",   color: C.yellow,   leaves: ["資料庫", "SQL"] },
    { angle: 60,   label: "網路",   color: C.blue,     leaves: ["爬蟲", "網站"] },
    { angle: 150,  label: "自動化", color: C.pink,     leaves: ["腳本", "排程"] },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={70} />
        <SceneWrap>
          <SectionHeader num="03" title="技術關鍵字＝你和 AI 溝通的基礎" startFrame={0} />

          <Card fadeStyle={descStyle} marginBottom={28 * S}>
            知道<span style={{ color: C.primary, fontWeight: 700 }}>關鍵字</span>，下指令才精準。否則你會像在搜尋引擎輸入模糊的字一樣——結果一團糟。
          </Card>

          {/* Search bar demo overlay */}
          {frame < fbStart - 6 && (
            <div style={{
              ...searchStyle,
              opacity: searchStyle.opacity * searchFade,
            }}>
              <div style={{ display: "flex", gap: 24 * S }}>
                {/* Left: vague */}
                <div style={{
                  flex: 1, background: C.surface, border: "1px solid rgba(255,209,102,0.25)",
                  borderRadius: 18 * S, padding: `${24 * S}px ${28 * S}px`,
                }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.yellow, letterSpacing: "0.1em", marginBottom: 14 * S }}>模糊關鍵字</div>
                  <div style={{
                    background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
                    fontFamily: "'Space Mono', monospace", fontSize: 24 * S, color: C.text,
                    marginBottom: 18 * S,
                  }}>
                    🔍 「網站怎麼做」
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 * S, opacity: leftListProg }}>
                    {["xxx 教學？", "雜亂結果", "不相關文章", "廣告...", "..."].map((r, i) => (
                      <div key={i} style={{
                        background: "rgba(255,209,102,0.04)", borderLeft: "3px solid rgba(255,209,102,0.3)",
                        padding: `${8 * S}px ${14 * S}px`, fontFamily: "'Noto Sans TC',sans-serif", fontSize: 20 * S, color: C.muted,
                      }}>{r}</div>
                    ))}
                  </div>
                </div>

                {/* Right: precise */}
                <div style={{
                  flex: 1, background: C.surface, border: `1.5px solid rgba(124,255,178,0.4)`,
                  borderRadius: 18 * S, padding: `${24 * S}px ${28 * S}px`,
                  boxShadow: "0 0 22px rgba(124,255,178,0.15)",
                }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.primary, letterSpacing: "0.1em", marginBottom: 14 * S }}>精準關鍵字</div>
                  <div style={{
                    background: "rgba(0,0,0,0.6)", border: "1px solid rgba(124,255,178,0.3)",
                    borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
                    fontFamily: "'Space Mono', monospace", fontSize: 24 * S, color: C.primary,
                    marginBottom: 18 * S,
                  }}>
                    🔍 「React 前端 + Node.js API」
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 * S, opacity: rightListProg }}>
                    {["官方文件", "明確教學", "範例 repo", "對的解法", "✓"].map((r, i) => (
                      <div key={i} style={{
                        background: "rgba(124,255,178,0.06)", borderLeft: `3px solid ${C.primary}`,
                        padding: `${8 * S}px ${14 * S}px`, fontFamily: "'Noto Sans TC',sans-serif", fontSize: 20 * S, color: "#c8ffe0",
                      }}>{r}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Frontend/backend split overlay */}
          {frame >= fbStart - 6 && frame < zooStart - 6 && (
            <div style={{
              ...fbStyle,
              opacity: fbStyle.opacity * fbFade,
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 24 * S, padding: `${40 * S}px ${48 * S}px`,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 32 * S }}>前端 vs 後端</div>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {/* Frontend */}
                <div style={{
                  flex: 1, background: "rgba(124,255,178,0.08)", border: `2px solid rgba(124,255,178,0.4)`,
                  borderRadius: 20 * S, padding: `${28 * S}px ${32 * S}px`, textAlign: "center" as const,
                }}>
                  <div style={{ fontSize: 68 * S, marginBottom: 14 * S }}>🖥️</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 36 * S, fontWeight: 800, color: C.primary, marginBottom: 10 * S }}>前端</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, letterSpacing: "0.06em", marginBottom: 12 * S }}>Frontend</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 24 * S, color: C.text, lineHeight: 1.6 }}>
                    使用者看到、操作的<span style={{ color: C.primary }}>畫面</span>
                  </div>
                </div>

                {/* API arrow */}
                <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", padding: `0 ${20 * S}px`, gap: 8 * S }}>
                  <div style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 22 * S, fontWeight: 700, color: C.text,
                    background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.25)",
                    borderRadius: 99, padding: `${8 * S}px ${20 * S}px`, letterSpacing: "0.1em",
                  }}>API</div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ width: 0, height: 0, borderTop: `${8 * S}px solid transparent`, borderBottom: `${8 * S}px solid transparent`, borderRight: `${14 * S}px solid rgba(255,255,255,0.4)` }} />
                    <div style={{ width: 36 * S, height: 3 * S, background: "rgba(255,255,255,0.4)" }} />
                    <div style={{ width: 0, height: 0, borderTop: `${8 * S}px solid transparent`, borderBottom: `${8 * S}px solid transparent`, borderLeft: `${14 * S}px solid rgba(255,255,255,0.4)` }} />
                  </div>
                </div>

                {/* Backend */}
                <div style={{
                  flex: 1, background: "rgba(124,212,255,0.08)", border: `2px solid rgba(124,212,255,0.4)`,
                  borderRadius: 20 * S, padding: `${28 * S}px ${32 * S}px`, textAlign: "center" as const,
                }}>
                  <div style={{ fontSize: 68 * S, marginBottom: 14 * S }}>🗄️</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 36 * S, fontWeight: 800, color: C.blue, marginBottom: 10 * S }}>後端</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, letterSpacing: "0.06em", marginBottom: 12 * S }}>Backend</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 24 * S, color: C.text, lineHeight: 1.6 }}>
                    背後處理資料的<span style={{ color: C.blue }}>伺服器</span>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: 24 * S, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                fontSize: 24 * S, color: "#c8ffe0", textAlign: "center" as const,
                background: "rgba(124,255,178,0.05)", border: "1px solid rgba(124,255,178,0.2)",
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                精準下指令＝AI 不會把前後端混在一起
              </div>
            </div>
          )}

          {/* Tech keyword zoo overlay */}
          {frame >= zooStart - 6 && frame < mindmapStart - 6 && (
            <div style={{
              opacity: zooFade,
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 24 * S, padding: `${40 * S}px ${48 * S}px`,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 32 * S }}>技術關鍵字 — 先有印象</div>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 * S,
              }}>
                {zooKeywords.map((kw, i) => {
                  const prog = zooProgs[i];
                  return (
                    <div key={kw} style={{
                      opacity: prog,
                      transform: `scale(${interpolate(prog, [0, 1], [0.85, 1])})`,
                      background: "rgba(124,255,178,0.08)",
                      border: `1.5px solid rgba(124,255,178,0.4)`,
                      borderRadius: 99, padding: `${20 * S}px ${28 * S}px`,
                      fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                      fontSize: 36 * S, fontWeight: 800, color: C.primary,
                      textAlign: "center" as const,
                      boxShadow: prog > 0.4 ? "0 0 22px rgba(124,255,178,0.25)" : "none",
                    }}>{kw}</div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mindmap radial SVG (signature moment) */}
          {frame >= mindmapStart - 6 && (
            <div style={{
              opacity: mindmapApp,
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 24 * S, padding: `${28 * S}px ${36 * S}px`,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, letterSpacing: "0.1em", marginBottom: 14 * S }}>技術詞彙心智圖</div>
              <svg viewBox="-700 -440 1400 880" style={{ width: "100%", height: 760 * S * 0.7 }}>
                {/* Central node */}
                <circle cx={0} cy={0} r={120} fill="rgba(124,255,178,0.12)" stroke={C.primary} strokeWidth={3} />
                <text x={0} y={-10} textAnchor="middle" fill={C.primary} fontSize={32} fontWeight={800} fontFamily="'Noto Sans TC',sans-serif">技術詞彙</text>
                <text x={0} y={28} textAnchor="middle" fill={C.primary} fontSize={32} fontWeight={800} fontFamily="'Noto Sans TC',sans-serif">字典</text>

                {/* Branches */}
                {branches.map((b, i) => {
                  const rad = (b.angle * Math.PI) / 180;
                  const branchOffset = i * 0.18;
                  const localBranchProg = Math.max(0, Math.min(1, branchProg * 1.5 - branchOffset));
                  const r1 = 280 * localBranchProg;
                  const r2 = 320;
                  const x1 = Math.cos(rad) * 130;
                  const y1 = Math.sin(rad) * 130;
                  const x2 = Math.cos(rad) * r1;
                  const y2 = Math.sin(rad) * r1;
                  const labelX = Math.cos(rad) * (r2 + 30);
                  const labelY = Math.sin(rad) * (r2 + 30);

                  // Leaves
                  const leafBaseAngle = b.angle - 30;
                  return (
                    <g key={b.label}>
                      {/* Branch line */}
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={b.color} strokeWidth={4} opacity={localBranchProg} />
                      {/* Branch node */}
                      <circle cx={Math.cos(rad) * r2} cy={Math.sin(rad) * r2} r={50 * localBranchProg} fill={`${b.color}22`} stroke={b.color} strokeWidth={3} opacity={localBranchProg} />
                      <text x={Math.cos(rad) * r2} y={Math.sin(rad) * r2 + 8} textAnchor="middle" fill={b.color} fontSize={22} fontWeight={800} fontFamily="'Noto Sans TC',sans-serif" opacity={localBranchProg > 0.5 ? 1 : 0}>{b.label}</text>

                      {/* Leaves */}
                      {b.leaves.map((leaf, li) => {
                        const leafOffset = i * 0.1 + li * 0.15;
                        const localLeafProg = Math.max(0, Math.min(1, leafProg * 1.6 - leafOffset));
                        const leafAngle = leafBaseAngle + li * 22;
                        const leafRad = (leafAngle * Math.PI) / 180;
                        const lr = 460;
                        const lx = Math.cos(leafRad) * lr * localLeafProg + Math.cos(rad) * r2 * (1 - localLeafProg);
                        const ly = Math.sin(leafRad) * lr * localLeafProg + Math.sin(rad) * r2 * (1 - localLeafProg);
                        return (
                          <g key={leaf} opacity={localLeafProg}>
                            <line x1={Math.cos(rad) * r2} y1={Math.sin(rad) * r2} x2={lx} y2={ly} stroke={b.color} strokeWidth={2} opacity={0.5} />
                            <rect x={lx - 50} y={ly - 18} width={100} height={36} rx={18} fill={`${b.color}11`} stroke={b.color} strokeWidth={1.5} />
                            <text x={lx} y={ly + 6} textAnchor="middle" fill={b.color} fontSize={18} fontWeight={700} fontFamily="'Noto Sans TC',sans-serif">{leaf}</text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 4.1 — Filter (frames 11699–15838)
// ═════════════════════════════════════════════════════════════════════════════
const Scene41Filter: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[4];

  const docsStart    = 859;   // two_doc_cards
  const toolboxStart = 2342;  // toolbox_recap
  const heroStart    = 3491;  // filter_question_hero
  const branchStart  = 3630;  // yes_no_branch

  const headerStyle = useFadeUpHeader(0);
  const descStyle   = useFadeUp(30);

  // Two doc cards
  const doc1 = useFadeUpItem(docsStart);
  const doc2 = useFadeUpItem(docsStart + 18);

  // Toolbox recap
  const toolboxStyle = useFadeUpElastic(toolboxStart);
  const tb1 = useFadeUpItem(toolboxStart + 14);
  const tb2 = useFadeUpItem(toolboxStart + 24);
  const tb3 = useFadeUpItem(toolboxStart + 34);
  const tb4 = useFadeUpItem(toolboxStart + 50);
  const tb5 = useFadeUpItem(toolboxStart + 60);
  const tb6 = useFadeUpItem(toolboxStart + 70);

  // Filter question hero
  const heroOpacity = interpolate(frame - heroStart, [0, 30], [0, 1], clamp);
  const heroScale = interpolate(
    spring({ frame: Math.max(0, frame - heroStart), fps: 30, config: { damping: 22, stiffness: 80 } }),
    [0, 1], [0.92, 1]
  );

  // Yes/No branch
  const yesProg = spring({ frame: Math.max(0, frame - branchStart), fps: 30, config: { damping: 22, stiffness: 130 } });
  const noProg  = spring({ frame: Math.max(0, frame - (branchStart + 16)), fps: 30, config: { damping: 22, stiffness: 130 } });

  // Fade-out logic
  const docsFade    = interpolate(frame, [toolboxStart - 30, toolboxStart + 10], [1, 0], clamp);
  const toolboxFade = interpolate(frame, [heroStart - 30, heroStart + 10], [1, 0], clamp);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={88} />
        <SceneWrap>
          <SectionHeader num="04" title="文件 + 一個篩選問題" startFrame={0} />

          <Card fadeStyle={descStyle} marginBottom={28 * S}>
            其實 AI 只需要兩種文件——再加上<span style={{ color: C.primary, fontWeight: 700 }}>一個篩選問題</span>，就能幫你過濾掉 80% 的學習焦慮。
          </Card>

          {/* Two doc cards overlay */}
          {frame < toolboxStart - 6 && (
            <div style={{
              opacity: docsFade,
              display: "flex", gap: 24 * S,
            }}>
              <div style={{
                flex: 1, background: "rgba(124,255,178,0.08)", border: `2px solid rgba(124,255,178,0.4)`,
                borderRadius: 22 * S, padding: `${32 * S}px ${36 * S}px`,
                ...doc1,
              }}>
                <div style={{ fontSize: 60 * S, marginBottom: 14 * S }}>📋</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 38 * S, fontWeight: 800, color: C.primary, marginBottom: 10 * S }}>需求文件</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, letterSpacing: "0.06em", marginBottom: 14 * S }}>對齊需求</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 22 * S, color: "#c8ffe0", lineHeight: 1.6 }}>
                  把現況、痛點、期待寫清楚——讓 AI 知道你想做什麼。
                </div>
              </div>

              <div style={{
                flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.15)`,
                borderRadius: 22 * S, padding: `${32 * S}px ${36 * S}px`,
                ...doc2,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 * S }}>
                  <span style={{ fontSize: 60 * S }}>🛠️</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, background: "rgba(255,255,255,0.06)", padding: `${4 * S}px ${12 * S}px`, borderRadius: 8 * S, border: "1px solid rgba(255,255,255,0.1)" }}>給工程師用</span>
                </div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 38 * S, fontWeight: 800, color: C.text, marginBottom: 10 * S }}>開發文件</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, letterSpacing: "0.06em", marginBottom: 14 * S }}>技術提案</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 22 * S, color: C.muted, lineHeight: 1.6 }}>
                  AI 並不需要——這是工程團隊溝通用，不是給 AI 的。
                </div>
              </div>
            </div>
          )}

          {/* Toolbox recap overlay */}
          {frame >= toolboxStart - 6 && frame < heroStart - 6 && (
            <div style={{
              ...toolboxStyle,
              opacity: toolboxStyle.opacity * toolboxFade,
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 24 * S, padding: `${36 * S}px ${44 * S}px`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 * S }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em" }}>需求文件工具箱</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary, background: "rgba(124,255,178,0.06)", border: "1px solid rgba(124,255,178,0.2)", padding: `${6 * S}px ${14 * S}px`, borderRadius: 8 * S }}>+ Markdown / 流程圖</span>
              </div>

              {/* 必填 row */}
              <div style={{ marginBottom: 24 * S }}>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 24 * S, fontWeight: 700, color: C.primary, marginBottom: 14 * S }}>● 三項必填</div>
                <div style={{ display: "flex", gap: 16 * S }}>
                  {[
                    { label: "現況",   s: tb1 },
                    { label: "痛點",   s: tb2 },
                    { label: "期待",   s: tb3 },
                  ].map(({ label, s }) => (
                    <div key={label} style={{
                      flex: 1, background: "rgba(124,255,178,0.08)", border: `1.5px solid rgba(124,255,178,0.4)`,
                      borderRadius: 14 * S, padding: `${18 * S}px ${22 * S}px`,
                      fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 28 * S, fontWeight: 800,
                      color: C.primary, textAlign: "center" as const,
                      ...s,
                    }}>{label}</div>
                  ))}
                </div>
              </div>

              {/* 加分 row */}
              <div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 24 * S, fontWeight: 700, color: C.blue, marginBottom: 14 * S }}>○ 三項加分</div>
                <div style={{ display: "flex", gap: 16 * S }}>
                  {[
                    { label: "驗收清單", s: tb4 },
                    { label: "指定解法", s: tb5 },
                    { label: "資料範例", s: tb6 },
                  ].map(({ label, s }) => (
                    <div key={label} style={{
                      flex: 1, background: "rgba(124,212,255,0.06)", border: "1.5px solid rgba(124,212,255,0.3)",
                      borderRadius: 14 * S, padding: `${18 * S}px ${22 * S}px`,
                      fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, fontWeight: 700,
                      color: C.blue, textAlign: "center" as const,
                      ...s,
                    }}>{label}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Filter question hero overlay */}
          {frame >= heroStart - 6 && (
            <div style={{
              opacity: heroOpacity,
              transform: `scale(${heroScale})`,
              background: "rgba(124,255,178,0.06)", border: `2.5px solid rgba(124,255,178,0.45)`,
              borderRadius: 28 * S, padding: `${50 * S}px ${64 * S}px`,
              boxShadow: "0 0 50px rgba(124,255,178,0.2)",
              marginBottom: 28 * S,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.primary, letterSpacing: "0.14em", marginBottom: 18 * S }}>篩選問題</div>
              <div style={{
                fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                fontSize: 56 * S, fontWeight: 900, lineHeight: 1.4, color: C.text, letterSpacing: "0.01em",
              }}>
                <span style={{ fontSize: 60 * S, color: C.primary }}>"</span>
                如果我不知道這個東西，
                <span style={{
                  color: C.primary,
                  borderBottom: `4px solid ${C.primary}`,
                  paddingBottom: 4 * S,
                }}>還能不能做出我要的程式？</span>
                <span style={{ fontSize: 60 * S, color: C.primary }}>"</span>
              </div>
            </div>
          )}

          {/* Y/N branch overlay */}
          {frame >= branchStart - 6 && (
            <div style={{ display: "flex", gap: 28 * S, alignItems: "stretch" }}>
              {/* Yes branch */}
              <div style={{
                flex: 1, opacity: yesProg,
                transform: `translateY(${interpolate(yesProg, [0, 1], [16 * S, 0])}px) scale(${interpolate(yesProg, [0, 1], [0.95, 1])})`,
                background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.15)",
                borderRadius: 22 * S, padding: `${28 * S}px ${32 * S}px`,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.muted, letterSpacing: "0.1em", marginBottom: 14 * S }}>YES → 可以</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 36 * S, fontWeight: 800, color: C.muted, marginBottom: 10 * S }}>先放一邊</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 22 * S, color: C.muted, lineHeight: 1.6 }}>
                  非當下必學——不會擋住你做事，可以慢慢補。
                </div>
              </div>

              {/* No branch */}
              <div style={{
                flex: 1, opacity: noProg,
                transform: `translateY(${interpolate(noProg, [0, 1], [16 * S, 0])}px) scale(${interpolate(noProg, [0, 1], [0.95, 1])})`,
                background: "rgba(124,255,178,0.1)", border: `2px solid rgba(124,255,178,0.5)`,
                borderRadius: 22 * S, padding: `${28 * S}px ${32 * S}px`,
                boxShadow: "0 0 28px rgba(124,255,178,0.22)",
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.primary, letterSpacing: "0.1em", marginBottom: 14 * S }}>NO → 做不出來</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 36 * S, fontWeight: 800, color: C.primary, marginBottom: 10 * S }}>現在就要學</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 22 * S, color: "#c8ffe0", lineHeight: 1.6 }}>
                  這就是<span style={{ color: C.primary, fontWeight: 800 }}>核心知識</span>——值得花時間搞懂。
                </div>
              </div>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 5.1 — Summary (frames 15838–18774)
// ═════════════════════════════════════════════════════════════════════════════
const Scene51Summary: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[5];

  const t1Start = 230;   // takeaway_card_1
  const t2Start = 714;   // takeaway_card_2
  const t3Start = 1097;  // takeaway_card_3
  const t4Start = 1481;  // takeaway_card_4
  const finalStart = 2025; // final_takeaway_hero

  const headerStyle = useFadeUpHeader(0);
  const introStyle  = useFadeUp(30);

  const t1 = useFadeUpElastic(t1Start);
  const t2 = useFadeUpElastic(t2Start);
  const t3 = useFadeUpElastic(t3Start);
  const t4 = useFadeUpElastic(t4Start);

  const finalOpacity = interpolate(frame - finalStart, [0, 30], [0, 1], clamp);
  const finalScale = interpolate(
    spring({ frame: Math.max(0, frame - finalStart), fps: 30, config: { damping: 16, stiffness: 100 } }),
    [0, 1], [0.88, 1]
  );
  const glowAlpha = 0.25 + 0.1 * Math.sin((frame - finalStart) / 30);

  const cardsFade = interpolate(frame, [finalStart - 30, finalStart + 10], [1, 0], clamp);

  const takeaways = [
    { num: "01", title: "解法設計＝動手前的必要步驟", color: C.primary, s: t1 },
    { num: "02", title: "告訴 AI 走哪條路，而不是把決策全交給它", color: C.blue, s: t2 },
    { num: "03", title: "技術關鍵字＝你和 AI 溝通的基礎", color: C.yellow, s: t3 },
    { num: "04", title: "用一個問題篩選名詞：不知道還能做出來嗎？", color: C.pink, s: t4 },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={100} />
        <SceneWrap>
          <SectionHeader num="05" title="本章重點整理" startFrame={0} />

          <Card fadeStyle={introStyle} marginBottom={28 * S}>
            把這個單元的<span style={{ color: C.primary, fontWeight: 700 }}>四個重點</span>整理一下，再加一句總結。
          </Card>

          {/* 4 takeaway cards */}
          {frame < finalStart - 6 && (
            <div style={{
              opacity: cardsFade,
              display: "flex", flexDirection: "column" as const, gap: 18 * S,
            }}>
              {takeaways.map(({ num, title, color, s }) => (
                <div key={num} style={{
                  display: "flex", alignItems: "flex-start", gap: 24 * S,
                  background: C.surface, border: `1px solid ${color}33`,
                  borderLeft: `5px solid ${color}`,
                  borderRadius: 16 * S, padding: `${22 * S}px ${30 * S}px`,
                  ...s,
                }}>
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 28 * S, fontWeight: 800,
                    color, flexShrink: 0, lineHeight: 1.2,
                    background: `${color}15`, border: `1px solid ${color}55`,
                    borderRadius: 12 * S, padding: `${8 * S}px ${16 * S}px`,
                    minWidth: 70 * S, textAlign: "center" as const,
                  }}>{num}</span>
                  <span style={{
                    fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                    fontSize: 30 * S, fontWeight: 700, color: C.text, lineHeight: 1.55,
                    paddingTop: 6 * S,
                  }}>{title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Final takeaway hero overlay */}
          {frame >= finalStart - 6 && (
            <div style={{
              opacity: finalOpacity,
              transform: `scale(${finalScale})`,
              background: "rgba(124,255,178,0.08)",
              border: `3px solid rgba(124,255,178,0.5)`,
              borderRadius: 32 * S,
              padding: `${64 * S}px ${72 * S}px`,
              boxShadow: `0 0 80px rgba(124,255,178,${glowAlpha})`,
              textAlign: "center" as const,
              marginTop: 40 * S,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 24 * S, color: C.primary, letterSpacing: "0.16em", marginBottom: 24 * S }}>FINAL TAKEAWAY</div>
              <div style={{
                fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
                fontSize: 52 * S, fontWeight: 900, lineHeight: 1.45, color: C.text,
                letterSpacing: "0.01em",
              }}>
                把<span style={{ color: C.primary, borderBottom: `4px solid ${C.primary}`, paddingBottom: 4 * S }}>現況、期待、解法說清楚</span>的習慣，
                <br />
                才是 AI 時代的<span style={{ color: C.primary, borderBottom: `4px solid ${C.primary}`, paddingBottom: 4 * S }}>競爭力</span>。
              </div>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// Root Composition — FullVideo08
// ═════════════════════════════════════════════════════════════════════════════
export const FullVideo08: React.FC = () => {
  const S0 = SEG_STARTS_08;

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

      {/* ── Segment 0.1 ── */}
      <Sequence from={S0[0]} durationInFrames={SEG_DURATIONS[0]}>
        <Audio src={staticFile("audio/2-1/2-1_0.1-normalized.wav")} />
        <Scene01Open callouts={getCallouts(S0[0], S0[1])} />
      </Sequence>

      {/* ── Segment 1.1 ── */}
      <Sequence from={S0[1]} durationInFrames={SEG_DURATIONS[1]}>
        <Audio src={staticFile("audio/2-1/2-1_1.1-normalized.wav")} />
        <Scene11Concept callouts={getCallouts(S0[1], S0[2])} />
      </Sequence>

      {/* ── Segment 2.1 ── */}
      <Sequence from={S0[2]} durationInFrames={SEG_DURATIONS[2]}>
        <Audio src={staticFile("audio/2-1/2-1_2.1-normalized.wav")} />
        <Scene21BestPath callouts={getCallouts(S0[2], S0[3])} />
      </Sequence>

      {/* ── Segment 3.1 ── */}
      <Sequence from={S0[3]} durationInFrames={SEG_DURATIONS[3]}>
        <Audio src={staticFile("audio/2-1/2-1_3.1-normalized.wav")} />
        <Scene31Keywords callouts={getCallouts(S0[3], S0[4])} />
      </Sequence>

      {/* ── Segment 4.1 ── */}
      <Sequence from={S0[4]} durationInFrames={SEG_DURATIONS[4]}>
        <Audio src={staticFile("audio/2-1/2-1_4.1-normalized.wav")} />
        <Scene41Filter callouts={getCallouts(S0[4], S0[5])} />
      </Sequence>

      {/* ── Segment 5.1 ── */}
      <Sequence from={S0[5]} durationInFrames={SEG_DURATIONS[5]}>
        <Audio src={staticFile("audio/2-1/2-1_5.1-normalized.wav")} />
        <Scene51Summary callouts={getCallouts(S0[5], TOTAL_FRAMES_08)} />
      </Sequence>
    </AbsoluteFill>
  );
};
