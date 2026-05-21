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
import { loadFont as loadSyne } from "@remotion/google-fonts/Syne";

// ─────────────────────────────────────────────────────────────────────────────
// FullVideo09b — CH 2-2 「工程師解題思維：Top-Down vs Bottom-Up」
// 新 motion 系統（aischool 官網對齊）。同音檔 / 同 VTT / 同 timing 與 FullVideo09，
// 純視覺升級：官網 token + Syne 顯示字 + 動態 grid/vignette 背景 + monoline icon
// + 動畫化教材 HTML 招牌圖（倒/正三角、分而治之 tree）+ 語意色（綠=TD 橘=BU）。
// ─────────────────────────────────────────────────────────────────────────────

const SYNE = loadSyne().fontFamily;
const TC = "'Noto Sans TC','PingFang TC',sans-serif";
const MONO = "'Space Mono', monospace";

const S = 2;
const W = 3840;
const H = 2160;
const NAV_H = 72 * S;
const SUBTITLE_H = 160 * S;
const CONTAINER_W = 1500 * S;

// aischool 官網 token（live --bg/--surface/--text/--accent + 語意色）
const C = {
  bg:        "#09090f",
  bgRaise:   "#0d0d14",
  surface:   "#111118",
  surface2:  "#16161e",
  text:      "#f0f0f5",
  muted:     "rgba(240,240,245,0.45)",
  faint:     "rgba(240,240,245,0.30)",
  border:    "rgba(255,255,255,0.07)",
  borderHi:  "rgba(255,255,255,0.14)",
  green:     "#7cffb2",   // Top-Down (semantic)
  greenDim:  "rgba(124,255,178,0.55)",
  orange:    "#ff9f43",   // Bottom-Up (semantic) — 對齊教材 label + 官網
  orangeDim: "rgba(255,159,67,0.55)",
  purple:    "#a855f7",   // tertiary（官網 mentor）
  lime:      "#c8eb33",   // hero pop（極少用）
  red:       "#ff6b6b",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// ─────────────────────────────────────────────────────────────────────────────
// Timing — 與 FullVideo09 完全一致
// ─────────────────────────────────────────────────────────────────────────────
export const SEG_STARTS_09B = [0, 1324, 3504, 5901, 8971, 13335, 15534, 17891];
export const TOTAL_FRAMES_09B = 20769;
const SEG_DURATIONS = [1324, 2180, 2397, 3070, 4364, 2199, 2357, 2878];

// ─────────────────────────────────────────────────────────────────────────────
// Callouts（無寄件人 — identity protection）
// ─────────────────────────────────────────────────────────────────────────────
type Callout = { from: number; to: number; text: string };
const CALLOUT_DURATION = 100;
const GLOBAL_CALLOUTS: Callout[] = [
  { from: 1096,  to: 1096 + CALLOUT_DURATION,  text: "你早就在用 Top-Down 了" },
  { from: 2545,  to: 2545 + CALLOUT_DURATION,  text: "Top-Down 就是 Vibe Coding 的核心" },
  { from: 4164,  to: 4164 + CALLOUT_DURATION,  text: "改到最後，自己也忘了原本要什麼" },
  { from: 6793,  to: 6793 + CALLOUT_DURATION,  text: "Bottom-Up：由下而上，拆了再拼" },
  { from: 11624, to: 11624 + CALLOUT_DURATION, text: "每步開新對話＝每次測試都乾淨" },
  { from: 14339, to: 14339 + CALLOUT_DURATION, text: "Top-Down 求快，Bottom-Up 求穩" },
  { from: 16853, to: 16853 + CALLOUT_DURATION, text: "選對關鍵字，AI 就能精準執行" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Animation hooks
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
  const progress = interpolate(f, [0, dur], [0, 1], { easing: Easing.out(Easing.exp), ...clamp });
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
function useBlockFade(nextStart: number | null): number {
  const frame = useCurrentFrame();
  if (nextStart === null) return 1;
  return interpolate(frame, [nextStart - 20, nextStart], [1, 0], clamp);
}
// draw-on progress (0→1) for SVG stroke / stagger
function useDraw(startFrame: number, dur = 22): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  return spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: dur });
}
// continuous 0→1→0 breathing for ambient life
function useBreathe(period = 80): number {
  const frame = useCurrentFrame();
  return 0.5 + 0.5 * Math.sin((frame / period) * Math.PI * 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// BrandBg — 官網冷黑 + 動態 60px grid parallax + radial vignette + 脈動光
// ─────────────────────────────────────────────────────────────────────────────
const BrandBg: React.FC<{ accent?: string }> = ({ accent = C.green }) => {
  const frame = useCurrentFrame();
  const bgAlpha = interpolate(frame, [0, 30], [0, 1], clamp);
  const cell = 60 * S;
  const shift = (frame * 0.12) % cell;
  const glow = 0.05 + 0.02 * Math.sin(frame / 90);
  return (
    <>
      <AbsoluteFill style={{ background: C.bg }} />
      {/* grid */}
      <AbsoluteFill style={{
        backgroundImage:
          `linear-gradient(${C.borderHi} 1px, transparent 1px),` +
          `linear-gradient(90deg, ${C.borderHi} 1px, transparent 1px)`,
        backgroundSize: `${cell}px ${cell}px`,
        backgroundPosition: `${shift}px ${shift}px`,
        opacity: 0.22 * bgAlpha,
      }} />
      {/* accent glow top-right */}
      <AbsoluteFill style={{
        background: `radial-gradient(circle at 82% 12%, ${hexGlow(accent, glow * bgAlpha)} 0%, transparent 45%)`,
      }} />
      {/* floating particles */}
      {Array.from({ length: 16 }).map((_, i) => {
        const speed = 0.10 + (i % 5) * 0.04;
        const yPct = 110 - ((frame * speed + i * 27) % 130);
        const xPct = (i * 61.8) % 100;
        const sz = (2 + (i % 3)) * S;
        const op = (0.05 + 0.06 * ((i % 4) / 3)) * bgAlpha;
        return <div key={i} style={{ position: "absolute", left: `${xPct}%`, top: `${yPct}%`, width: sz, height: sz, borderRadius: 99, background: accent, opacity: op, filter: "blur(1px)" }} />;
      })}
      {/* vignette */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 78% 64% at 50% 42%, transparent 38%, ${C.bg} 100%)`,
      }} />
    </>
  );
};
function hexGlow(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Monoline icon set（取代 emoji）
// ─────────────────────────────────────────────────────────────────────────────
const ICONS: Record<string, string> = {
  person: "M12 11a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4|M5 20a7 7 0 0114 0",
  bowl: "M3 11h18a9 9 0 01-18 0z|M9 7c0-1.2 1-1.4 1-2.6|M13 7c0-1.2 1-1.4 1-2.6",
  loop: "M17 4l3 3-3 3|M20 7H10a5 5 0 00-5 5|M7 20l-3-3 3-3|M4 17h10a5 5 0 005-5",
  swirl: "M12 4a8 8 0 11-7 4.6|M12 8a4 4 0 11-3 1.8|M12 12a1.2 1.2 0 100 .01",
  calendar: "M5 6h14v14H5z|M5 10h14|M9 3.5v4|M15 3.5v4",
  pan: "M3 12a6 6 0 0012 0H3z|M15 11h6|M9 8.5c0-1 .8-1.2.8-2.2",
  puzzle: "M9 4h6v3a1.6 1.6 0 003 0V4h2v6h-3a1.6 1.6 0 000 3h3v6h-6v-3a1.6 1.6 0 00-3 0v3H5v-6h3a1.6 1.6 0 000-3H5V4h4z",
  bolt: "M13 3L5 13h6l-1 8 9-11h-6l1-7z",
  target: "M12 3a9 9 0 100 18 9 9 0 000-18z|M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z|M12 11.4a.6 .6 0 100 1.2 .6 .6 0 000-1.2z",
  hourglass: "M6 3h12|M6 21h12|M7 3c0 5 10 5 10 0|M7 21c0-5 10-5 10 0",
  warning: "M12 3.5L21.5 20H2.5z|M12 10v4|M12 17.2v.1",
  check: "M5 12.5l4.5 4.5L19 7",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14z|M20 20l-4.5-4.5",
  code: "M9 8l-4 4 4 4|M15 8l4 4-4 4",
  brain: "M9 6a3 3 0 00-3 3 3 3 0 00-1 5.5A3 3 0 009 19V6z|M15 6a3 3 0 013 3 3 3 0 011 5.5A3 3 0 0115 19V6z",
  key: "M14 4a4 4 0 100 8 4 4 0 000-8z|M11.5 11L4 18.5V21h3l1-1v-2h2l1-1",
};
const LI: React.FC<{ name: keyof typeof ICONS | string; size?: number; color?: string; sw?: number }> = ({
  name, size = 48 * S, color = C.green, sw = 1.7,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flexShrink: 0 }}>
    {(ICONS[name] ?? "").split("|").map((d, i) => <path key={i} d={d} />)}
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// SceneFade
// ─────────────────────────────────────────────────────────────────────────────
const SceneFade: React.FC<{ children: React.ReactNode; durationInFrames: number }> = ({ children, durationInFrames }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 12], [0, 1], clamp);
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], clamp);
  return <div style={{ opacity: Math.min(fadeIn, fadeOut), height: "100%" }}>{children}</div>;
};

// ─────────────────────────────────────────────────────────────────────────────
// ProgressBar — clean aischool lockup（修糊掉的 logo）
// ─────────────────────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ progressPct?: number; accent?: string }> = ({ progressPct = 100, accent = C.green }) => {
  const frame = useCurrentFrame();
  const slideY = interpolate(frame, [0, 18], [-NAV_H, 0], clamp);
  return (
    <div style={{
      position: "absolute", top: slideY, left: 0, right: 0, zIndex: 100,
      background: "rgba(9,9,15,0.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      borderBottom: `1px solid ${C.border}`, padding: `${14 * S}px ${44 * S}px`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 * S }}>
        <Img src={staticFile("aischool-logo.webp")} style={{ height: 34 * S, width: "auto", mixBlendMode: "screen", opacity: 0.95 }} />
        <span style={{ fontFamily: MONO, fontSize: 18 * S, color: C.faint, letterSpacing: "0.08em" }}>CH 2-2</span>
      </div>
      <div style={{ height: 3 * S, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progressPct}%`, background: accent, borderRadius: 99, boxShadow: `0 0 8px ${accent}88` }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader — cinematic kicker + Syne/TC + animated underline
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ num: string; title: string; startFrame: number; accent?: string }> = ({
  num, title, startFrame, accent = C.green,
}) => {
  const headerStyle = useFadeUpHeader(startFrame);
  const lineGrow = useDraw(startFrame + 8, 18);
  return (
    <div style={{ marginBottom: 30 * S, ...headerStyle }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 * S }}>
        <span style={{
          fontFamily: MONO, fontSize: 20 * S, fontWeight: 700, color: accent,
          background: hexGlow(accent, 0.1), border: `1px solid ${hexGlow(accent, 0.32)}`,
          padding: `${6 * S}px ${16 * S}px`, borderRadius: 8 * S, whiteSpace: "nowrap",
          letterSpacing: "0.1em", boxShadow: `0 0 16px ${hexGlow(accent, 0.12)}`,
        }}>{num}</span>
        <h2 style={{ fontFamily: TC, fontSize: 46 * S, fontWeight: 800, letterSpacing: "-0.02em", color: C.text, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ height: 3 * S, width: 64 * S, background: accent, borderRadius: 99, marginTop: 14 * S, transformOrigin: "left center", transform: `scaleX(${lineGrow})`, opacity: 0.9, boxShadow: `0 0 10px ${hexGlow(accent, 0.32)}` }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Card — neutral border editorial
// ─────────────────────────────────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; fadeStyle?: React.CSSProperties; marginBottom?: number }> = ({
  children, fadeStyle = {}, marginBottom = 28 * S,
}) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 22 * S,
    padding: `${26 * S}px ${36 * S}px`, marginBottom, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", ...fadeStyle,
  }}>
    <p style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, lineHeight: 1.8, margin: 0 }}>{children}</p>
  </div>
);

// Syne display word (Latin)
const Disp: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ fontFamily: SYNE, fontWeight: 800, ...style }}>{children}</span>
);

// ─────────────────────────────────────────────────────────────────────────────
// iMessage Callout（NO sender row）
// ─────────────────────────────────────────────────────────────────────────────
const NOTIF_W = 420 * S, NOTIF_TOP = 12 * S, NOTIF_RIGHT = 20 * S, NOTIF_SLOT = 200 * S, FADE_OUT_F = 50;
const CalloutLayer: React.FC<{ callouts: Callout[] }> = ({ callouts }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {callouts.map((c, i) => <CalloutCard key={i} c={c} allCallouts={callouts} />)}
  </AbsoluteFill>
);
const CalloutCard: React.FC<{ c: Callout; allCallouts: Callout[] }> = ({ c, allCallouts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localF = frame - c.from;
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
  const iconSize = 52 * S, fontBase = 22 * S, fontBody = 26 * S;
  return (
    <div style={{ position: "absolute", top: NAV_H + NOTIF_TOP + totalYPush, right: NOTIF_RIGHT, width: NOTIF_W, transform: `translateY(${slideY}px)`, opacity: opacity * depthAlpha, pointerEvents: "none", zIndex: 200 }}>
      <div style={{ background: "rgba(28,28,30,0.9)", backdropFilter: "blur(48px)", WebkitBackdropFilter: "blur(48px)", border: `${1 * S}px solid rgba(255,255,255,0.13)`, borderRadius: 14 * S, boxShadow: `0 ${8 * S}px ${40 * S}px rgba(0,0,0,0.6)`, padding: `${10 * S}px ${14 * S}px`, display: "flex", gap: 11 * S, alignItems: "flex-start" }}>
        <div style={{ width: iconSize, height: iconSize, borderRadius: 9 * S, background: "linear-gradient(145deg, #3DDC6A 0%, #25A244 100%)", boxShadow: `0 ${2 * S}px ${10 * S}px rgba(52,199,89,0.45)`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
          <div style={{ fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif", fontSize: fontBody, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{displayText}</div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SceneWrap
// ─────────────────────────────────────────────────────────────────────────────
const SceneWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", top: NAV_H, left: 0, right: 0, height: H - NAV_H - SUBTITLE_H, overflow: "hidden" }}>
    <div style={{ width: CONTAINER_W, margin: "0 auto", paddingTop: 40 * S, paddingBottom: 40 * S }}>{children}</div>
  </div>
);

const Arrow: React.FC<{ color?: string }> = ({ color = C.faint }) => {
  const frame = useCurrentFrame();
  const off = -(frame * 0.5) % 14;
  return (
    <div style={{ display: "flex", alignItems: "center", padding: `0 ${12 * S}px` }}>
      <svg width={56 * S} height={20 * S} viewBox="0 0 56 20" style={{ display: "block", overflow: "visible" }}>
        <line x1="2" y1="10" x2="40" y2="10" stroke={color} strokeWidth={2.5} strokeDasharray="6 5" strokeDashoffset={off} strokeLinecap="round" />
        <polygon points="40,4 54,10 40,16" fill={color} />
      </svg>
    </div>
  );
};

const Pill: React.FC<{ label: string; color?: string; style?: React.CSSProperties }> = ({ label, color = C.green, style }) => (
  <div style={{ background: hexGlow(color, 0.1), border: `1.5px solid ${hexGlow(color, 0.4)}`, borderRadius: 99, padding: `${12 * S}px ${30 * S}px`, fontFamily: TC, fontSize: 26 * S, fontWeight: 600, color, letterSpacing: "0.02em", boxShadow: `0 0 18px ${hexGlow(color, 0.16)}`, ...style }}>{label}</div>
);

// ═════════════════════════════════════════════════════════════════════════════
// 動畫化教材圖 1 — Top-Down 倒三角（draw-on，3 層，綠）
// ═════════════════════════════════════════════════════════════════════════════
const TopDownTriangle: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const flowDash = -(frame * 0.5) % 12;
  const d0 = useDraw(start, 18);
  const d1 = useDraw(start + 14, 22);
  const d2 = useDraw(start + 26, 22);
  const d3 = useDraw(start + 38, 22);
  const arrow = useDraw(start + 30, 26);
  const layers = [
    { p: [[0, 10], [280, 10], [227, 63], [53, 63]], a: 0.26, d: d1 },
    { p: [[53, 63], [227, 63], [180, 110], [100, 110]], a: 0.18, d: d2 },
    { p: [[100, 110], [180, 110], [140, 150]], a: 0.12, d: d3 },
  ];
  return (
    <svg viewBox="0 0 360 175" style={{ width: "100%", maxWidth: 620 * S, display: "block", margin: "0 auto" }}>
      {/* outline */}
      <polygon points="0,10 280,10 140,150" fill="none" stroke={C.green} strokeWidth={1.5} pathLength={100} strokeDasharray={100} strokeDashoffset={interpolate(d0, [0, 1], [100, 0])} opacity={0.5} />
      {layers.map((L, i) => (
        <polygon key={i} points={L.p.map(([x, y]) => `${x},${y}`).join(" ")} fill={hexGlow(C.green, L.a * L.d)} stroke={hexGlow(C.green, 0.4 * L.d)} strokeWidth={1.2} />
      ))}
      <line x1="53" y1="63" x2="227" y2="63" stroke="rgba(255,255,255,0.25)" strokeWidth={1} opacity={d2} />
      <line x1="100" y1="110" x2="180" y2="110" stroke="rgba(255,255,255,0.25)" strokeWidth={1} opacity={d3} />
      {/* down arrow + label */}
      <g opacity={arrow} transform="translate(312,18)">
        <line x1="0" y1="0" x2="0" y2="120" stroke={C.greenDim} strokeWidth={2} strokeDasharray="5 4" strokeDashoffset={flowDash} />
        <polygon points="-6,112 6,112 0,126" fill={C.greenDim} />
      </g>
      <text x="140" y="168" textAnchor="middle" fontFamily={SYNE} fontWeight="700" fontSize="13" fill={C.green} opacity={d1}>TOP-DOWN</text>
    </svg>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 動畫化教材圖 2 — 分而治之 tree（橘＝Bottom-Up 語意，stagger + ✓ + 合併）
// ═════════════════════════════════════════════════════════════════════════════
const DivideTree: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const flowDash = -(frame * 0.4) % 9;
  const top = useDraw(start, 18);
  const conn = useDraw(start + 14, 18);
  const k1 = useDraw(start + 24, 18);
  const k2 = useDraw(start + 34, 18);
  const k3 = useDraw(start + 44, 18);
  const checks = useDraw(start + 70, 20);
  const merge = useDraw(start + 96, 22);
  const ACC = C.orange;
  const box = (x: number, y: number, w: number, h: number, label: string, op: number, fill = C.surface2, stroke = hexGlow(ACC, 0.35), tcol = C.text) => (
    <g opacity={op}>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={1.4} />
      <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fontFamily={TC} fontSize="15" fontWeight="700" fill={tcol}>{label}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 500 215" style={{ width: "100%", maxWidth: 980 * S, display: "block", margin: "0 auto" }}>
      {box(175, 14, 150, 44, "大問題", top, hexGlow(ACC, 0.1), hexGlow(ACC, 0.5))}
      <g opacity={conn} stroke={hexGlow(ACC, 0.5)} strokeWidth={1.6} fill="none" strokeDasharray="5 4" strokeDashoffset={flowDash}>
        <line x1="250" y1="58" x2="250" y2="80" />
        <line x1="90" y1="80" x2="410" y2="80" />
        <line x1="90" y1="80" x2="90" y2="100" />
        <line x1="250" y1="80" x2="250" y2="100" />
        <line x1="410" y1="80" x2="410" y2="100" />
      </g>
      {box(15, 100, 150, 46, "小問題 1", k1)}
      {box(175, 100, 150, 46, "小問題 2", k2)}
      {box(335, 100, 150, 46, "小問題 3", k3)}
      {/* checks */}
      {[90, 250, 410].map((cx, i) => {
        const op = [k1, k2, k3][i] * checks;
        return (
          <g key={i} opacity={op}>
            <circle cx={cx + 56} cy={108} r={9} fill={hexGlow(ACC, 0.18)} stroke={ACC} strokeWidth={1.2} />
            <path d={`M${cx + 52} 108 l3 3 5 -6`} stroke={ACC} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
      {/* merge */}
      <g opacity={merge} stroke={hexGlow(ACC, 0.5)} strokeWidth={1.6} fill="none" strokeDasharray="5 4" strokeDashoffset={flowDash}>
        <line x1="90" y1="146" x2="90" y2="162" />
        <line x1="250" y1="146" x2="250" y2="162" />
        <line x1="410" y1="146" x2="410" y2="162" />
        <line x1="90" y1="162" x2="410" y2="162" />
        <line x1="250" y1="162" x2="250" y2="172" />
      </g>
      {box(160, 172, 180, 38, "組合成大解法", merge, hexGlow(ACC, 0.14), hexGlow(ACC, 0.6), ACC)}
    </svg>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 動畫化教材圖 3 — 左右雙三角比較（左 TD 綠倒 / 右 BU 橘正）
// ═════════════════════════════════════════════════════════════════════════════
const DualTriangle: React.FC<{ start: number }> = ({ start }) => {
  const ld = useDraw(start, 20);
  const l1 = useDraw(start + 12, 20), l2 = useDraw(start + 22, 20), l3 = useDraw(start + 32, 20);
  const rd = useDraw(start + 16, 20);
  const r1 = useDraw(start + 28, 20), r2 = useDraw(start + 38, 20), r3 = useDraw(start + 48, 20);
  return (
    <svg viewBox="0 0 580 215" style={{ width: "100%", maxWidth: 760 * S, display: "block", margin: "0 auto" }}>
      {/* Left: Top-Down 倒三角 綠 */}
      <polygon points="0,10 270,10 135,170" fill="none" stroke={C.green} strokeWidth={1.5} pathLength={100} strokeDasharray={100} strokeDashoffset={interpolate(ld, [0, 1], [100, 0])} opacity={0.5} />
      <polygon points="0,10 270,10 225,63 45,63" fill={hexGlow(C.green, 0.26 * l1)} />
      <polygon points="45,63 225,63 180,116 90,116" fill={hexGlow(C.green, 0.18 * l2)} />
      <polygon points="90,116 180,116 135,170" fill={hexGlow(C.green, 0.12 * l3)} />
      <text x="135" y="192" textAnchor="middle" fontFamily={SYNE} fontWeight="700" fontSize="14" fill={C.green} opacity={l1}>TOP-DOWN</text>
      <text x="135" y="208" textAnchor="middle" fontFamily={TC} fontSize="11" fill={C.muted} opacity={l1}>由上而下</text>
      {/* divider */}
      <line x1="290" y1="10" x2="290" y2="178" stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4,4" />
      {/* Right: Bottom-Up 正三角 橘 */}
      <polygon points="445,10 310,170 580,170" fill="none" stroke={C.orange} strokeWidth={1.5} pathLength={100} strokeDasharray={100} strokeDashoffset={interpolate(rd, [0, 1], [100, 0])} opacity={0.5} />
      <polygon points="445,10 489,63 401,63" fill={hexGlow(C.orange, 0.12 * r1)} />
      <polygon points="401,63 489,63 534,116 356,116" fill={hexGlow(C.orange, 0.18 * r2)} />
      <polygon points="356,116 534,116 580,170 310,170" fill={hexGlow(C.orange, 0.26 * r3)} />
      <text x="445" y="192" textAnchor="middle" fontFamily={SYNE} fontWeight="700" fontSize="14" fill={C.orange} opacity={r1}>BOTTOM-UP</text>
      <text x="445" y="208" textAnchor="middle" fontFamily={TC} fontSize="11" fill={C.muted} opacity={r1}>由下而上</text>
    </svg>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 0.1 — Open
// ═════════════════════════════════════════════════════════════════════════════
const Scene01Open: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[0];
  const chipsStart = 676, kwStart = 1202;
  const badge = useFadeUp(20), title = useFadeUpHeader(45), desc = useFadeUp(80);
  const headerFade = interpolate(frame, [kwStart - 30, kwStart], [1, 0], clamp);
  const chip1 = useFadeUpItem(chipsStart), chip2 = useFadeUpItem(chipsStart + 14), chip3 = useFadeUpItem(chipsStart + 28);
  const chipsFade = useBlockFade(kwStart);
  const kw = useFadeUpElastic(kwStart);
  const kwLine = useAccentLine(kwStart + 12);
  const kwBreathe = useBreathe(70);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={12} accent={C.green} />
        <SceneWrap>
          <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 24 * S, ...badge, opacity: badge.opacity * headerFade }}>
            <span style={{ fontFamily: MONO, fontSize: 20 * S, color: C.green, border: `1px solid ${C.green}`, padding: `${4 * S}px ${14 * S}px`, borderRadius: 8 * S, letterSpacing: "0.05em" }}>CH 2-2</span>
            <span style={{ fontFamily: MONO, fontSize: 18 * S, color: C.muted, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, padding: `${4 * S}px ${12 * S}px`, borderRadius: 8 * S }}>SDLC · 解題思維</span>
          </div>
          <div style={{ marginBottom: 28 * S, ...title, opacity: title.opacity * headerFade }}>
            <h1 style={{ fontFamily: TC, fontSize: 60 * S, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.02em", color: C.text, margin: 0 }}>
              工程師解題思維：<br />
              <Disp style={{ color: C.green }}>Top-Down</Disp> <span style={{ color: C.faint, fontFamily: TC, fontWeight: 400 }}>vs</span> <Disp style={{ color: C.orange }}>Bottom-Up</Disp>
            </h1>
          </div>
          <p style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted, lineHeight: 1.7, maxWidth: 1150 * S, marginBottom: 44 * S, ...desc, opacity: desc.opacity * headerFade }}>
            上個單元學了解法設計；這個單元，來聊跟 AI 協作的兩種解題思維——情境不同，用法也不同。
          </p>
          {frame >= chipsStart - 6 && frame < kwStart - 6 && (
            <div style={{ opacity: chipsFade }}>
              <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 22 * S }}>你已經學過的萬用句型</div>
              <div style={{ display: "flex", gap: 18 * S }}>
                {[{ l: "現況", s: chip1 }, { l: "痛點", s: chip2 }, { l: "期待", s: chip3 }].map(({ l, s }) => (
                  <div key={l} style={s}><Pill label={l} /></div>
                ))}
              </div>
            </div>
          )}
          {frame >= kwStart - 6 && (
            <div style={{ ...kw, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 70 * S }}>
              <div style={{ fontFamily: MONO, fontSize: 24 * S, color: C.muted, letterSpacing: "0.18em", marginBottom: 20 * S }}>這套方式有個正式名稱</div>
              <Disp style={{ fontSize: 120 * S, color: C.text, letterSpacing: "0.01em", display: "inline-block", transform: `scale(${1 + 0.012 * kwBreathe})`, textShadow: `0 0 ${26 + 18 * kwBreathe}px ${hexGlow(C.green, 0.16 + 0.12 * kwBreathe)}` }}>Top-Down</Disp>
              <div style={{ height: 4 * S, background: C.green, borderRadius: 99, marginTop: 18 * S, maxWidth: 360 * S, boxShadow: `0 0 16px ${hexGlow(C.green, 0.5)}`, ...kwLine }} />
              <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.green, marginTop: 22 * S, fontWeight: 500 }}>由上而下的思維</div>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 1.1 — Top-Down（動畫化倒三角）
// ═════════════════════════════════════════════════════════════════════════════
const Scene11TopDown: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[1];
  const flowStart = 130, defStart = 906, tipStart = 1726;
  const descStyle = useFadeUp(30);
  const flow = useFadeUpElastic(flowStart);
  const flowFade = useBlockFade(defStart);
  const def = useFadeUpElastic(defStart);
  const defFade = useBlockFade(tipStart);
  const tip = useFadeUpElastic(tipStart);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={24} accent={C.green} />
        <SceneWrap>
          <SectionHeader num="01" title="Top-Down：你已經會的方法" startFrame={0} accent={C.green} />
          <Card fadeStyle={descStyle}>
            假設你肚子餓，想外送一碗<span style={{ color: C.green }}>牛肉麵</span>——你只說「想吃什麼」，細節交給平台和餐廳。
          </Card>
          {/* Block A: 倒三角（動畫化教材圖）+ 牛肉麵語意 */}
          {frame < defStart - 6 && (
            <div style={{ ...flow, opacity: flow.opacity * flowFade, marginTop: 8 * S }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 22 * S, padding: `${28 * S}px ${24 * S}px ${20 * S}px` }}>
                <TopDownTriangle start={flowStart + 8} />
              </div>
              <div style={{ display: "flex", alignItems: "stretch", gap: 0, marginTop: 18 * S }}>
                <div style={{ flex: 1, background: hexGlow(C.green, 0.08), border: `2px solid ${hexGlow(C.green, 0.4)}`, borderRadius: 18 * S, padding: `${22 * S}px ${26 * S}px`, display: "flex", alignItems: "center", gap: 18 * S }}>
                  <LI name="person" size={48 * S} color={C.green} />
                  <div><div style={{ fontFamily: TC, fontSize: 28 * S, fontWeight: 500, color: C.green }}>你</div><div style={{ fontFamily: TC, fontSize: 24 * S, color: C.text }}>「我要一碗牛肉麵」</div></div>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}><Arrow color={C.greenDim} /></div>
                <div style={{ flex: 1.25, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.borderHi}`, borderRadius: 18 * S, padding: `${22 * S}px ${26 * S}px`, display: "flex", alignItems: "center", gap: 18 * S }}>
                  <LI name="bowl" size={48 * S} color={C.text} />
                  <div><div style={{ fontFamily: TC, fontSize: 28 * S, fontWeight: 800, color: C.text }}>平台 + 餐廳</div><div style={{ fontFamily: TC, fontSize: 23 * S, color: C.muted, lineHeight: 1.5 }}>麵條幾克、湯頭熬幾小時——<span style={{ color: C.green }}>細節全幫你補</span></div></div>
                </div>
              </div>
            </div>
          )}
          {/* Block B: definition — 左 accent bar 引言（非發光卡）*/}
          {frame >= defStart - 6 && frame < tipStart - 6 && (
            <div style={{ ...def, opacity: def.opacity * defFade, marginTop: 56 * S, paddingLeft: 40 * S, borderLeft: `4px solid ${C.green}` }}>
              <Disp style={{ fontFamily: SYNE, fontSize: 22 * S, color: C.green, letterSpacing: "0.16em", marginBottom: 18 * S, display: "block" }}>DEFINITION</Disp>
              <div style={{ fontFamily: TC, fontSize: 56 * S, fontWeight: 700, lineHeight: 1.4, color: C.text }}>說<span style={{ color: C.green }}>結果</span>，細節 AI 補。</div>
              <div style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted, marginTop: 22 * S }}>這就是 <Disp style={{ color: C.green }}>Vibe Coding</Disp> 的精神。</div>
            </div>
          )}
          {/* Block C */}
          {frame >= tipStart - 6 && (
            <div style={{ ...tip, marginTop: 16 * S }}>
              <div style={{ background: hexGlow(C.green, 0.04), border: `1px solid ${hexGlow(C.green, 0.2)}`, borderRadius: 18 * S, padding: `${36 * S}px ${44 * S}px`, display: "flex", alignItems: "center", gap: 36 * S }}>
                <div style={{ fontFamily: TC, fontSize: 38 * S, fontWeight: 600, color: C.text, whiteSpace: "nowrap" }}>句型越完整</div>
                <Arrow color={C.greenDim} />
                <div style={{ fontFamily: TC, fontSize: 34 * S, color: "#c8ffe0", lineHeight: 1.5 }}>AI 越懂你的想法，對話<span style={{ color: C.green }}>越不容易跑偏</span></div>
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
// SCENE 2.1 — Top-Down Limit
// ═════════════════════════════════════════════════════════════════════════════
const Scene21Limit: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[2];
  const symStart = 390, causeStart = 1299, pivotStart = 1960;
  const descStyle = useFadeUp(30);
  const sym1 = useFadeUpItem(symStart), sym2 = useFadeUpItem(symStart + 20);
  const symFade = useBlockFade(causeStart);
  const cause = useFadeUpElastic(causeStart);
  const cb1 = useFadeUpItem(causeStart + 12), cb2 = useFadeUpItem(causeStart + 28), cb3 = useFadeUpItem(causeStart + 44);
  const causeFade = useBlockFade(pivotStart);
  const pivot = useFadeUpElastic(pivotStart);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={36} accent={C.green} />
        <SceneWrap>
          <SectionHeader num="02" title="Top-Down 什麼時候會失靈？" startFrame={0} accent={C.green} />
          <Card fadeStyle={descStyle}>
            Top-Down 很好用，但它<span style={{ color: C.red }}>有極限</span>。你一定遇過這些情況——
          </Card>
          {frame < causeStart - 6 && (
            <div style={{ opacity: symFade, display: "flex", flexDirection: "column", gap: 18 * S, marginTop: 16 * S }}>
              {[{ icon: "loop", s: sym1, t: "跟 AI 來回改了十幾輪，最後連自己都搞不清楚原本要什麼" }, { icon: "swirl", s: sym2, t: "AI 一直冒出你沒要求的東西，叫它修，又生出別的問題" }].map(({ icon, s, t }, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 24 * S, background: hexGlow(C.red, 0.06), border: `1px solid ${hexGlow(C.red, 0.25)}`, borderRadius: 18 * S, padding: `${28 * S}px ${34 * S}px`, ...s }}>
                  <LI name={icon} size={52 * S} color={C.red} />
                  <span style={{ fontFamily: TC, fontSize: 30 * S, color: "#ffd6d6", lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
            </div>
          )}
          {frame >= causeStart - 6 && frame < pivotStart - 6 && (
            <div style={{ ...cause, opacity: cause.opacity * causeFade, marginTop: 16 * S }}>
              <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 26 * S }}>為什麼會這樣？</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 * S }}>
                <div style={{ ...cb1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16 * S, padding: `${24 * S}px ${32 * S}px`, fontFamily: TC, fontSize: 30 * S, color: C.text }}>任務越複雜、邊界越不清</div>
                <div style={{ display: "flex", justifyContent: "center", transform: "rotate(90deg)" }}><Arrow color={hexGlow(C.red, 0.55)} /></div>
                <div style={{ ...cb2, background: hexGlow(C.red, 0.08), border: `1px solid ${hexGlow(C.red, 0.3)}`, borderRadius: 16 * S, padding: `${24 * S}px ${32 * S}px`, fontFamily: TC, fontSize: 30 * S, color: "#ffc9c9" }}>AI 拿到一個<span style={{ color: C.red }}>模糊的大需求</span></div>
                <div style={{ display: "flex", justifyContent: "center", transform: "rotate(90deg)" }}><Arrow color={hexGlow(C.red, 0.55)} /></div>
                <div style={{ ...cb3, background: hexGlow(C.red, 0.08), border: `1px solid ${hexGlow(C.red, 0.3)}`, borderRadius: 16 * S, padding: `${24 * S}px ${32 * S}px`, fontFamily: TC, fontSize: 30 * S, color: "#ffc9c9" }}>只能用<span style={{ color: C.red }}>自己的方式詮釋</span>——不一定是你要的</div>
              </div>
            </div>
          )}
          {frame >= pivotStart - 6 && (
            <div style={{ ...pivot, marginTop: 64 * S, textAlign: "center" }}>
              <Disp style={{ fontSize: 22 * S, color: C.orange, letterSpacing: "0.2em", marginBottom: 22 * S, display: "block" }}>THE PIVOT</Disp>
              <div style={{ fontFamily: TC, fontSize: 56 * S, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>提示詞救不了，<br />用<span style={{ color: C.orange }}>工程師思維</span>重新拆。</div>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 3.1 — Divide & Conquer（動畫化 tree，橘）
// ═════════════════════════════════════════════════════════════════════════════
const Scene31DivideConquer: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[3];
  const splitStart = 427, kwStart = 1464, dailyStart = 2251;
  const descStyle = useFadeUp(30);
  const treeWrap = useFadeUpElastic(splitStart);
  const splitFade = useBlockFade(kwStart);
  const kw = useFadeUpElastic(kwStart);
  const kwFade = useBlockFade(dailyStart);
  const d1 = useFadeUpElastic(dailyStart), d2 = useFadeUpElastic(dailyStart + 24);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.orange} />
        <ProgressBar progressPct={48} accent={C.orange} />
        <SceneWrap>
          <SectionHeader num="03" title="分而治之：Bottom-Up 的底層邏輯" startFrame={0} accent={C.orange} />
          <Card fadeStyle={descStyle}>
            工程師面對複雜問題，不會一口氣全解——<span style={{ color: C.orange }}>先拆小</span>。
          </Card>
          {frame < kwStart - 6 && (
            <div style={{ ...treeWrap, opacity: treeWrap.opacity * splitFade, marginTop: 8 * S }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 22 * S, padding: `${30 * S}px ${36 * S}px` }}>
                <DivideTree start={splitStart + 8} />
              </div>
              <div style={{ fontFamily: TC, fontSize: 24 * S, color: C.muted, marginTop: 14 * S, textAlign: "center" }}>拆不夠細？就繼續往下拆，直到 AI 能處理</div>
            </div>
          )}
          {frame >= kwStart - 6 && frame < dailyStart - 6 && (
            <div style={{ ...kw, opacity: kw.opacity * kwFade, marginTop: 60 * S, textAlign: "center" }}>
              <div style={{ fontFamily: TC, fontSize: 92 * S, fontWeight: 800, color: C.text, letterSpacing: "0.04em" }}>分而治之</div>
              <Disp style={{ fontSize: 32 * S, color: C.orange, letterSpacing: "0.1em", marginTop: 16 * S, display: "block" }}>Divide and Conquer</Disp>
              <div style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted, marginTop: 26 * S }}>軟體工程的老知識，<span style={{ color: C.orange }}>AI 非常熟</span>。</div>
            </div>
          )}
          {frame >= dailyStart - 6 && (
            <div style={{ marginTop: 16 * S }}>
              <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 22 * S }}>其實你日常早就在用</div>
              <div style={{ display: "flex", gap: 20 * S }}>
                <div style={{ flex: 1, ...d1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 * S, padding: `${32 * S}px ${36 * S}px` }}>
                  <LI name="calendar" size={56 * S} color={C.orange} />
                  <div style={{ fontFamily: TC, fontSize: 32 * S, fontWeight: 500, color: C.orange, margin: `${14 * S}px 0 ${10 * S}px` }}>年度規劃</div>
                  <div style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted, lineHeight: 1.6 }}>年目標 → 每月 → 每週，一步步推進</div>
                </div>
                <div style={{ flex: 1, ...d2, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 * S, padding: `${32 * S}px ${36 * S}px` }}>
                  <LI name="pan" size={56 * S} color={C.purple} />
                  <div style={{ fontFamily: TC, fontSize: 32 * S, fontWeight: 500, color: C.purple, margin: `${14 * S}px 0 ${10 * S}px` }}>複雜料理</div>
                  <div style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted, lineHeight: 1.6 }}>食材分開備好，確認妥當再組合下鍋</div>
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
// SCENE 4.1 — Three Steps（橘＝Bottom-Up）
// ═════════════════════════════════════════════════════════════════════════════
const Scene41ThreeSteps: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[4];
  const stepsStart = 1155, step2Start = 1789, step3Start = 2937, puzzleStart = 3421;
  const descStyle = useFadeUp(30);
  const stepsFade = useBlockFade(puzzleStart);
  const st1 = useFadeUpItem(stepsStart), st2 = useFadeUpItem(step2Start), st3 = useFadeUpItem(step3Start);
  const pz = useFadeUpElastic(puzzleStart);
  const pz1 = useFadeUpItem(puzzleStart + 16), pz2 = useFadeUpItem(puzzleStart + 32);
  const steps = [
    { st: st1, title: "拆出最小可測功能", short: "先讓程式填好第一個欄位，成功再往下。" },
    { st: st2, title: "驗證後再延伸", short: "開新對話貼進已驗證的，再延伸到全部。" },
    { st: st3, title: "把小功能組合起來", short: "把驗證過的小程式組合成完整方案。" },
  ];
  const shown = (i: number) => (i === 0 ? frame >= stepsStart - 6 : i === 1 ? frame >= step2Start - 6 : frame >= step3Start - 6);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.orange} />
        <ProgressBar progressPct={64} accent={C.orange} />
        <SceneWrap>
          <SectionHeader num="04" title="Bottom-Up 實戰：三個步驟" startFrame={0} accent={C.orange} />
          <Card fadeStyle={descStyle}>
            例子：要幫公司 <span style={{ color: C.orange }}>50 位同事</span>，一個一個把資料填進線上表單。
          </Card>
          {/* timeline rail（與其他場景不同骨架）*/}
          {frame < puzzleStart - 6 && (
            <div style={{ opacity: stepsFade, position: "relative", marginTop: 24 * S, paddingLeft: 8 * S }}>
              <div style={{ position: "absolute", left: 31 * S, top: 24 * S, bottom: 24 * S, width: 2 * S, background: hexGlow(C.orange, 0.3) }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 38 * S }}>
                {steps.map((s, i) => shown(i) && (
                  <div key={i} style={{ ...s.st, display: "flex", gap: 32 * S, alignItems: "flex-start", position: "relative" }}>
                    <div style={{ width: 48 * S, height: 48 * S, borderRadius: 99, background: C.bg, border: `2px solid ${C.orange}`, color: C.orange, fontFamily: MONO, fontSize: 24 * S, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1, boxShadow: `0 0 16px ${hexGlow(C.orange, 0.3)}` }}>{i + 1}</div>
                    <div style={{ paddingTop: 2 * S }}>
                      <div style={{ fontFamily: TC, fontSize: 36 * S, fontWeight: 700, color: C.text, marginBottom: 8 * S }}>{s.title}</div>
                      <div style={{ fontFamily: TC, fontSize: 27 * S, color: C.muted, lineHeight: 1.55 }}>{s.short}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {frame >= puzzleStart - 6 && (
            <div style={{ ...pz, marginTop: 16 * S }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24 * S, padding: `${40 * S}px ${48 * S}px` }}>
                <div style={{ fontFamily: TC, fontSize: 40 * S, fontWeight: 800, color: C.text, marginBottom: 28 * S, display: "flex", alignItems: "center", gap: 18 * S }}>
                  <LI name="puzzle" size={48 * S} color={C.orange} />就像拼一幅很大的拼圖
                </div>
                <div style={{ ...pz1, display: "flex", gap: 16 * S, marginBottom: 18 * S, flexWrap: "wrap", alignItems: "center" }}>
                  {["先確定邊框", "天空區", "海洋區", "陸地區", "接起來"].map((t, i) => (
                    <React.Fragment key={t}>
                      <Pill label={t} color={i === 0 ? C.orange : i === 4 ? C.green : C.purple} style={{ fontSize: 24 * S, padding: `${10 * S}px ${22 * S}px` }} />
                      {i < 4 && <div style={{ display: "flex", alignItems: "center", color: C.faint, fontSize: 28 * S }}>→</div>}
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ ...pz2, fontFamily: TC, fontSize: 28 * S, color: "#ffe6cc", lineHeight: 1.6, background: hexGlow(C.orange, 0.05), border: `1px solid ${hexGlow(C.orange, 0.2)}`, borderRadius: 14 * S, padding: `${20 * S}px ${28 * S}px` }}>
                  哪一區拼錯，只要<span style={{ color: C.orange }}>重拼那一區</span>就好——不用整幅打散重來。
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
// SCENE 5.1 — Compare（動畫化雙三角）
// ═════════════════════════════════════════════════════════════════════════════
const Scene51Compare: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[5];
  const cmpStart = 420, stratStart = 1519;
  const descStyle = useFadeUp(30);
  const triWrap = useFadeUpItem(cmpStart);
  const cL = useFadeUpItem(cmpStart + 30), cR = useFadeUpItem(cmpStart + 48);
  const cmpFade = useBlockFade(stratStart);
  const strat = useFadeUpElastic(stratStart);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={76} accent={C.green} />
        <SceneWrap>
          <SectionHeader num="05" title="兩種方法，各有舞台" startFrame={0} accent={C.green} />
          <Card fadeStyle={descStyle}>
            這兩種方法<span style={{ color: C.green }}>不是對立</span>，而是不同情境下各有優勢的工具。
          </Card>
          {frame < stratStart - 6 && (
            <div style={{ opacity: cmpFade, marginTop: 4 * S }}>
              <div style={{ ...triWrap, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 22 * S, padding: `${24 * S}px ${36 * S}px`, marginBottom: 18 * S }}>
                <DualTriangle start={cmpStart + 6} />
              </div>
              <div style={{ display: "flex", gap: 22 * S, alignItems: "stretch" }}>
                <div style={{ flex: 1, ...cL, background: hexGlow(C.green, 0.07), border: `2px solid ${hexGlow(C.green, 0.4)}`, borderRadius: 22 * S, padding: `${26 * S}px ${32 * S}px` }}>
                  <div style={{ fontFamily: TC, fontSize: 26 * S, color: "#c8ffe0", lineHeight: 1.8, display: "flex", flexDirection: "column", gap: 8 * S }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 12 * S }}><LI name="bolt" size={32 * S} color={C.green} sw={1.8} />快——簡單任務一句話搞定</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 12 * S, color: C.muted }}><LI name="warning" size={30 * S} color={C.muted} sw={1.8} />複雜時容易跑偏、難定位</span>
                  </div>
                </div>
                <div style={{ flex: 1, ...cR, background: hexGlow(C.orange, 0.07), border: `2px solid ${hexGlow(C.orange, 0.4)}`, borderRadius: 22 * S, padding: `${26 * S}px ${32 * S}px` }}>
                  <div style={{ fontFamily: TC, fontSize: 26 * S, color: "#ffe6cc", lineHeight: 1.8, display: "flex", flexDirection: "column", gap: 8 * S }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 12 * S }}><LI name="target" size={32 * S} color={C.orange} sw={1.8} />穩——每步驗證、成功率高、易定位</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 12 * S, color: C.muted }}><LI name="hourglass" size={30 * S} color={C.muted} sw={1.8} />前期要花時間拆、步驟較多</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {frame >= stratStart - 6 && (
            <div style={{ ...strat, marginTop: 44 * S, textAlign: "center" }}>
              <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.16em", marginBottom: 28 * S }}>怎麼選？</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 * S, flexWrap: "wrap" }}>
                <Pill label="先試 Top-Down" color={C.green} />
                <div style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted }}>卡關再 →</div>
                <Pill label="切 Bottom-Up" color={C.orange} />
              </div>
              <div style={{ fontFamily: TC, fontSize: 34 * S, color: C.text, marginTop: 32 * S }}>兩個都會用，<span style={{ color: C.green }}>什麼任務都不怕</span>。</div>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 6.1 — Why Tech Concepts
// ═════════════════════════════════════════════════════════════════════════════
const Scene61WhyTech: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[6];
  const previewStart = 438, puzzleStart = 1465;
  const descStyle = useFadeUp(30);
  const p1 = useFadeUpItem(previewStart), p2 = useFadeUpItem(previewStart + 16), p3 = useFadeUpItem(previewStart + 32);
  const noteP = useFadeUpItem(previewStart + 60);
  const previewFade = useBlockFade(puzzleStart);
  const pz = useFadeUpElastic(puzzleStart);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={88} accent={C.green} />
        <SceneWrap>
          <SectionHeader num="06" title="為什麼接下來要學技術概念？" startFrame={0} accent={C.green} />
          {/* 學員提問 — iMessage 風格泡泡（溫度 + 變化）*/}
          <div style={{ ...descStyle, display: "flex", alignItems: "flex-start", gap: 18 * S, marginBottom: 30 * S }}>
            <div style={{ width: 56 * S, height: 56 * S, borderRadius: 99, background: C.surface2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <LI name="person" size={32 * S} color={C.muted} />
            </div>
            <div style={{ maxWidth: 1120 * S, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: `${6 * S}px ${22 * S}px ${22 * S}px ${22 * S}px`, padding: `${24 * S}px ${34 * S}px`, fontFamily: TC, fontSize: 30 * S, color: C.text, lineHeight: 1.6 }}>
              Bottom-Up 我懂了，但拆成小塊後，怎麼知道<span style={{ color: C.green }}>每塊長怎樣</span>、要跟 AI 說什麼？
            </div>
          </div>
          {frame < puzzleStart - 6 && (
            <div style={{ opacity: previewFade, marginTop: 16 * S }}>
              <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 22 * S }}>接下來會帶你認識</div>
              <div style={{ display: "flex", gap: 18 * S, marginBottom: 24 * S }}>
                {[{ l: "程式語言", ic: "code", s: p1 }, { l: "API", ic: "key", s: p2 }, { l: "爬蟲…", ic: "search", s: p3 }].map(({ l, ic, s }) => (
                  <div key={l} style={{ flex: 1, ...s, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18 * S, padding: `${26 * S}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S }}>
                    <LI name={ic} size={44 * S} color={C.green} />
                    <span style={{ fontFamily: TC, fontSize: 28 * S, fontWeight: 500, color: C.green }}>{l}</span>
                  </div>
                ))}
              </div>
              <div style={{ ...noteP, background: hexGlow(C.green, 0.05), border: `1px solid ${hexGlow(C.green, 0.2)}`, borderRadius: 16 * S, padding: `${28 * S}px ${34 * S}px`, fontFamily: TC, fontSize: 30 * S, color: "#c8ffe0", lineHeight: 1.6 }}>
                不是要你變工程師，<span style={{ color: C.green }}>知道它們能做什麼就好</span>。
              </div>
            </div>
          )}
          {frame >= puzzleStart - 6 && (
            <div style={{ ...pz, marginTop: 56 * S, textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 * S }}><LI name="puzzle" size={72 * S} color={C.green} /></div>
              <div style={{ fontFamily: TC, fontSize: 52 * S, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>拼圖片<span style={{ color: C.green }}>早就存在</span>，<br />選對關鍵字就能召喚。</div>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 7.1 — Summary
// ═════════════════════════════════════════════════════════════════════════════
const Scene71Summary: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[7];
  const cardsStart = 130, finalStart = 2156;
  const introStyle = useFadeUp(30);
  const cardsFade = useBlockFade(finalStart);
  const t1 = useFadeUpElastic(cardsStart), t2 = useFadeUpElastic(cardsStart + 230), t3 = useFadeUpElastic(cardsStart + 520), t4 = useFadeUpElastic(cardsStart + 800), t5 = useFadeUpElastic(cardsStart + 1130);
  const fin = useFadeUpElastic(finalStart);
  const glow = 0.22 + 0.1 * Math.sin((frame - finalStart) / 30);
  const takeaways = [
    { num: "01", color: C.green,  s: t1, t: "Top-Down：描述高層次需求，AI 一次搞定——簡單任務最有效率" },
    { num: "02", color: C.orange, s: t2, t: "複雜、Top-Down 失靈時，切換 Bottom-Up：拆小、逐一驗證、再組合" },
    { num: "03", color: C.orange, s: t3, t: "Bottom-Up 三步驟：拆最小 / 驗證延伸 / 組合，每步都開新對話" },
    { num: "04", color: C.purple, s: t4, t: "兩法互補：先 Top-Down，卡關再切 Bottom-Up" },
    { num: "05", color: C.green,  s: t5, t: "學技術概念＝累積詞彙庫，不是要你變工程師" },
  ];
  const shown = (i: number) => frame >= cardsStart - 6 + [0, 230, 520, 800, 1130][i];
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={100} accent={C.green} />
        <SceneWrap>
          <SectionHeader num="07" title="本章重點整理" startFrame={0} accent={C.green} />
          <Card fadeStyle={introStyle}>
            把這個單元的<span style={{ color: C.green }}>重點</span>整理一下。
          </Card>
          {frame < finalStart - 6 && (
            <div style={{ opacity: cardsFade, display: "flex", flexDirection: "column", gap: 14 * S, marginTop: 4 * S }}>
              {takeaways.map((tk, i) => shown(i) && (
                <div key={tk.num} style={{ ...tk.s, display: "flex", alignItems: "flex-start", gap: 22 * S, background: C.surface, border: `1px solid ${hexGlow(tk.color, 0.2)}`, borderLeft: `5px solid ${tk.color}`, borderRadius: 16 * S, padding: `${20 * S}px ${28 * S}px` }}>
                  <span style={{ fontFamily: MONO, fontSize: 26 * S, fontWeight: 800, color: tk.color, background: hexGlow(tk.color, 0.1), border: `1px solid ${hexGlow(tk.color, 0.35)}`, borderRadius: 12 * S, padding: `${6 * S}px ${14 * S}px`, minWidth: 64 * S, textAlign: "center", flexShrink: 0 }}>{tk.num}</span>
                  <span style={{ fontFamily: TC, fontSize: 28 * S, fontWeight: 500, color: C.text, lineHeight: 1.55, paddingTop: 4 * S }}>{tk.t}</span>
                </div>
              ))}
            </div>
          )}
          {frame >= finalStart - 6 && (
            <div style={{ ...fin, marginTop: 24 * S }}>
              <div style={{ background: hexGlow(C.green, 0.08), border: `3px solid ${hexGlow(C.green, 0.5)}`, borderRadius: 32 * S, padding: `${60 * S}px ${64 * S}px`, boxShadow: `0 0 80px ${hexGlow(C.green, glow)}`, textAlign: "center" }}>
                <Disp style={{ fontSize: 24 * S, color: C.green, letterSpacing: "0.16em", marginBottom: 24 * S, display: "block" }}>FINAL TAKEAWAY</Disp>
                <div style={{ fontFamily: TC, fontSize: 50 * S, fontWeight: 900, lineHeight: 1.45, color: C.text }}>
                  <span style={{ color: C.green }}>兩種工具都會用</span>，<br />你就能應對各種複雜程度的任務。
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
// Root Composition — FullVideo09b
// ═════════════════════════════════════════════════════════════════════════════
export const FullVideo09b: React.FC = () => {
  const S0 = SEG_STARTS_09B;
  const getCallouts = (segStart: number, segEnd: number) =>
    GLOBAL_CALLOUTS.map(c => ({ ...c, from: c.from - segStart, to: c.to - segStart }))
      .filter(c => c.from >= -FADE_OUT_F && c.from < (segEnd - segStart));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/course_background_music.wav")} startFrom={0} volume={0.1} loop />
      <Sequence from={S0[0]} durationInFrames={SEG_DURATIONS[0]}>
        <Audio src={staticFile("audio/2-2/2-2_0.1-normalized.wav")} />
        <Scene01Open callouts={getCallouts(S0[0], S0[1])} />
      </Sequence>
      <Sequence from={S0[1]} durationInFrames={SEG_DURATIONS[1]}>
        <Audio src={staticFile("audio/2-2/2-2_1.1-normalized.wav")} />
        <Scene11TopDown callouts={getCallouts(S0[1], S0[2])} />
      </Sequence>
      <Sequence from={S0[2]} durationInFrames={SEG_DURATIONS[2]}>
        <Audio src={staticFile("audio/2-2/2-2_2.1-normalized.wav")} />
        <Scene21Limit callouts={getCallouts(S0[2], S0[3])} />
      </Sequence>
      <Sequence from={S0[3]} durationInFrames={SEG_DURATIONS[3]}>
        <Audio src={staticFile("audio/2-2/2-2_3.1-normalized.wav")} />
        <Scene31DivideConquer callouts={getCallouts(S0[3], S0[4])} />
      </Sequence>
      <Sequence from={S0[4]} durationInFrames={SEG_DURATIONS[4]}>
        <Audio src={staticFile("audio/2-2/2-2_4.1-normalized.wav")} />
        <Scene41ThreeSteps callouts={getCallouts(S0[4], S0[5])} />
      </Sequence>
      <Sequence from={S0[5]} durationInFrames={SEG_DURATIONS[5]}>
        <Audio src={staticFile("audio/2-2/2-2_5.1-normalized.wav")} />
        <Scene51Compare callouts={getCallouts(S0[5], S0[6])} />
      </Sequence>
      <Sequence from={S0[6]} durationInFrames={SEG_DURATIONS[6]}>
        <Audio src={staticFile("audio/2-2/2-2_6.1-normalized.wav")} />
        <Scene61WhyTech callouts={getCallouts(S0[6], S0[7])} />
      </Sequence>
      <Sequence from={S0[7]} durationInFrames={SEG_DURATIONS[7]}>
        <Audio src={staticFile("audio/2-2/2-2_7.1-normalized.wav")} />
        <Scene71Summary callouts={getCallouts(S0[7], TOTAL_FRAMES_09B)} />
      </Sequence>
    </AbsoluteFill>
  );
};
