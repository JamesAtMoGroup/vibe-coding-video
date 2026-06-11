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
// FullVideo11 — CH 2-4「程式語言——每個平台都有最適合它的語言」
// v2 motion system（aischool 官網對齊；參考 FullVideo10）。
// 15 個音頻段落 ~15.6 分鐘；4K 30fps。
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
const FPS = 30;

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
  green:     "#7cffb2",
  greenDim:  "rgba(124,255,178,0.55)",
  orange:    "#ff9f43",
  orangeDim: "rgba(255,159,67,0.55)",
  purple:    "#a855f7",
  purpleDim: "rgba(168,85,247,0.55)",
  yellow:    "#ffd166",
  yellowDim: "rgba(255,209,102,0.55)",
  yellowSoft: "#f4d27a",
  lime:      "#c8eb33",
  red:       "#ff6b6b",
  redDim:    "rgba(255,107,107,0.55)",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// ─────────────────────────────────────────────────────────────────────────────
// Timing — 從 processed/2-4-cues.json
// ─────────────────────────────────────────────────────────────────────────────
export const SEG_STARTS_11 = [0, 1504, 3280, 6174, 7585, 9898, 11097, 14349, 15235, 16297, 17629, 19811, 21676, 23643, 25019];
export const TOTAL_FRAMES_11 = 28003;
const SEG_DURATIONS = [1504, 1776, 2894, 1411, 2313, 1199, 3252, 886, 1062, 1332, 2182, 1865, 1967, 1376, 2984];
const SEG_KEYS = ["0.1", "1.1", "2.1", "2.2", "2.3", "2.4", "3.1", "3.2", "3.3", "3.4", "4.1", "4.2", "4.3", "4.4", "5.1"];

// Progress percentages (running through 15 segments)
const PROGRESS_PCT = [2, 8, 16, 24, 30, 38, 44, 54, 60, 64, 72, 80, 86, 92, 100];

// ─────────────────────────────────────────────────────────────────────────────
// Callouts（無寄件人 — identity protection）
// 10 個 callouts from visual-spec-2-4.json + 加上 4.3 後端推薦
// ─────────────────────────────────────────────────────────────────────────────
type Callout = { from: number; to: number; text: string };
const CALLOUT_DURATION = 100;
const GLOBAL_CALLOUTS: Callout[] = [
  { from: 780,   to: 780 + CALLOUT_DURATION,   text: "看程式碼有抗拒感很正常" },
  { from: 5700,  to: 5700 + CALLOUT_DURATION,  text: "HTML + CSS + JS = 一個完整網頁" },
  { from: 8200,  to: 8200 + CALLOUT_DURATION,  text: "老婆餅沒有老婆" },
  { from: 9450,  to: 9450 + CALLOUT_DURATION,  text: "JS 取名只是當年蹭熱度" },
  { from: 11500, to: 11500 + CALLOUT_DURATION, text: "前端 = 你看得到 + 點得到" },
  { from: 13200, to: 13200 + CALLOUT_DURATION, text: "餐廳：前場 vs 後場" },
  { from: 14500, to: 14500 + CALLOUT_DURATION, text: "搶票同步機制 = 後端的工作" },
  { from: 16400, to: 16400 + CALLOUT_DURATION, text: "最快判斷法：拔網路線" },
  { from: 20500, to: 20500 + CALLOUT_DURATION, text: "框架 = 模板，不是語言" },
  { from: 23000, to: 23000 + CALLOUT_DURATION, text: "後端入門：Python 或 Node.js" },
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
function useDraw(startFrame: number, dur = 22): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  return spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: dur });
}
function useBreathe(period = 80): number {
  const frame = useCurrentFrame();
  return 0.5 + 0.5 * Math.sin((frame / period) * Math.PI * 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// BrandBg
// ─────────────────────────────────────────────────────────────────────────────
function hexGlow(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const BrandBg: React.FC<{ accent?: string }> = ({ accent = C.green }) => {
  const frame = useCurrentFrame();
  const bgAlpha = interpolate(frame, [0, 30], [0, 1], clamp);
  const cell = 60 * S;
  const shift = (frame * 0.12) % cell;
  const glow = 0.05 + 0.02 * Math.sin(frame / 90);
  return (
    <>
      <AbsoluteFill style={{ background: C.bg }} />
      <AbsoluteFill style={{
        backgroundImage:
          `linear-gradient(${C.borderHi} 1px, transparent 1px),` +
          `linear-gradient(90deg, ${C.borderHi} 1px, transparent 1px)`,
        backgroundSize: `${cell}px ${cell}px`,
        backgroundPosition: `${shift}px ${shift}px`,
        opacity: 0.22 * bgAlpha,
      }} />
      <AbsoluteFill style={{
        background: `radial-gradient(circle at 82% 12%, ${hexGlow(accent, glow * bgAlpha)} 0%, transparent 45%)`,
      }} />
      {Array.from({ length: 16 }).map((_, i) => {
        const speed = 0.10 + (i % 5) * 0.04;
        const yPct = 110 - ((frame * speed + i * 27) % 130);
        const xPct = (i * 61.8) % 100;
        const sz = (2 + (i % 3)) * S;
        const op = (0.05 + 0.06 * ((i % 4) / 3)) * bgAlpha;
        return <div key={i} style={{ position: "absolute", left: `${xPct}%`, top: `${yPct}%`, width: sz, height: sz, borderRadius: 99, background: accent, opacity: op, filter: "blur(1px)" }} />;
      })}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 78% 64% at 50% 42%, transparent 38%, ${C.bg} 100%)`,
      }} />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Monoline icon set
// ─────────────────────────────────────────────────────────────────────────────
const ICONS: Record<string, string> = {
  monitor: "M3 5h18v12H3z|M3 17l3 4h12l3-4|M9 21h6",
  phone: "M7 3h10v18H7z|M11 18h2",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18z|M3 12h18|M12 3a13 13 0 010 18|M12 3a13 13 0 000 18",
  puzzle: "M9 4h6v3a1.6 1.6 0 003 0V4h2v6h-3a1.6 1.6 0 000 3h3v6h-6v-3a1.6 1.6 0 00-3 0v3H5v-6h3a1.6 1.6 0 000-3H5V4h4z",
  chat: "M4 5h16v11H8l-4 4z",
  "chat-bot": "M5 6h14v10H5z|M5 11l-2 0|M19 11l2 0|M9 9.5v.01|M15 9.5v.01|M9 13.5c1 1 5 1 6 0|M12 3v3",
  download: "M12 3v12|M7 11l5 5 5-5|M4 19h16",
  switch: "M5 8h14v8H5z|M9 12h6|M12 8v8",
  bell: "M6 17V11a6 6 0 0112 0v6|M4 17h16|M10 20a2 2 0 004 0",
  list: "M4 6h2v2H4z|M4 11h2v2H4z|M4 16h2v2H4z|M9 7h11|M9 12h11|M9 17h11",
  calendar: "M5 6h14v14H5z|M5 10h14|M9 3.5v4|M15 3.5v4",
  translate: "M4 5h7|M7 5v3|M11 14l3-8 3 8|M12.5 12h3|M4 13c2 0 5-1 7-5|M4 19c2-2 5-3 8-5",
  faq: "M9 9a3 3 0 116 0c0 2-3 2-3 4|M12 16v.01|M12 4a8 8 0 100 16 8 8 0 000-16z",
  refresh: "M4 12a8 8 0 1114 5|M14 17v-4h4",
  spark: "M12 3v6|M12 15v6|M3 12h6|M15 12h6|M6 6l4 4|M14 14l4 4|M6 18l4-4|M14 10l4-4",
  link: "M9 15l6-6|M10 6a4 4 0 015.6 5.6L13 14|M14 18a4 4 0 01-5.6-5.6L11 10",
  layers: "M12 3l9 5-9 5-9-5z|M3 13l9 5 9-5|M3 18l9 5 9-5",
  question: "M9 9a3 3 0 116 0c0 2-3 2-3 4|M12 16v.01|M12 4a8 8 0 100 16 8 8 0 000-16z",
  // Scene-specific icons
  target: "M12 3a9 9 0 100 18 9 9 0 000-18z|M12 7a5 5 0 100 10 5 5 0 000-10z|M12 11a1 1 0 100 2 1 1 0 000-2z",
  brain: "M9 4a3 3 0 00-3 3v1a3 3 0 00-2 2.8v2.4A3 3 0 006 16v2a3 3 0 003 3h2V4z|M15 4a3 3 0 013 3v1a3 3 0 012 2.8v2.4A3 3 0 0118 16v2a3 3 0 01-3 3h-2V4z",
  bolt: "M13 3L4 14h6l-1 7 9-11h-6z",
  skeleton: "M12 3v6|M9 6h6|M8 9h8v4H8z|M9 13l-2 8|M15 13l2 8|M12 13v8",
  shirt: "M6 4l-3 4 3 2v10h12V10l3-2-3-4-3 1-2-1h-4l-2 1z",
  server: "M4 4h16v6H4z|M4 14h16v6H4z|M7 7h.01|M7 17h.01",
  chef: "M8 11a4 4 0 118 0v8H8z|M9 6a3 3 0 016 0|M9 6a3 3 0 00-3 3|M15 6a3 3 0 013 3",
  "wifi-off": "M2 2l20 20|M5 12.5a9 9 0 0114-1|M8.5 16.5a5 5 0 016-1|M12 20h.01",
  calculator: "M5 3h14v18H5z|M8 7h8v3H8z|M8 13h.01|M12 13h.01|M16 13h.01|M8 17h.01|M12 17h.01|M16 17h.01",
  file: "M7 3h7l4 4v14H7z|M14 3v4h4|M10 14h6|M10 18h6",
  swap: "M4 8h14|M18 8l-4-4|M18 8l-4 4|M20 16H6|M6 16l4-4|M6 16l4 4",
  building: "M6 3h12v18H6z|M9 7h.01|M13 7h.01|M9 11h.01|M13 11h.01|M9 15h.01|M13 15h.01|M10 21v-3h4v3",
  blueprint: "M3 5h18v14H3z|M3 9h18|M7 9v10|M11 9v10|M15 9v10|M3 14h18",
  apple: "M12 6a4 4 0 014 4v6a4 4 0 01-4 4 4 4 0 01-4-4v-6a4 4 0 014-4z|M12 6V3|M14 4l-2 2-2-2",
  android: "M7 9a5 5 0 0110 0v6H7z|M7 15v4a1 1 0 002 0v-4|M15 15v4a1 1 0 002 0v-4|M8 6L7 5|M16 6l1-1",
  book: "M4 5a2 2 0 012-2h14v18H6a2 2 0 01-2-2z|M4 5v14|M9 7h7|M9 11h7",
  heart: "M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z",
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
// ProgressBar
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
        <span style={{ fontFamily: MONO, fontSize: 18 * S, color: C.faint, letterSpacing: "0.08em" }}>CH 2-4</span>
      </div>
      <div style={{ height: 3 * S, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progressPct}%`, background: accent, borderRadius: 99, boxShadow: `0 0 8px ${accent}88` }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader
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
// Sub Kicker (small kicker text)
// ─────────────────────────────────────────────────────────────────────────────
const SubKicker: React.FC<{ text: string; startFrame: number; accent?: string }> = ({ text, startFrame, accent = C.green }) => {
  const s = useFadeUpHeader(startFrame);
  return (
    <div style={{ ...s, display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 24 * S }}>
      <span style={{ width: 28 * S, height: 1, background: hexGlow(accent, 0.7) }} />
      <span style={{ fontFamily: MONO, fontSize: 22 * S, color: accent, letterSpacing: "0.16em", fontWeight: 700 }}>{text}</span>
    </div>
  );
};

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

const Pill: React.FC<{ label: string; color?: string; style?: React.CSSProperties }> = ({ label, color = C.green, style }) => (
  <div style={{ background: hexGlow(color, 0.1), border: `1.5px solid ${hexGlow(color, 0.4)}`, borderRadius: 99, padding: `${12 * S}px ${30 * S}px`, fontFamily: TC, fontSize: 26 * S, fontWeight: 600, color, letterSpacing: "0.02em", boxShadow: `0 0 18px ${hexGlow(color, 0.16)}`, ...style }}>{label}</div>
);

// Helper to map accent name → color
function accentColor(name: string): string {
  switch (name) {
    case "orange": return C.orange;
    case "purple": return C.purple;
    case "yellow": return C.yellow;
    case "yellow_dim": return C.yellowSoft;
    case "red": return C.red;
    case "green":
    default: return C.green;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 0.1 — Hero
// global range 0–1503 | dur 1504 | SEG_START=0
// overlays:
//   ChapterBadge 0 | HeroTitle 30 | Connector 30→240
//   FearBlock 540→1100 (kicker + 3 items + punchline)
// ═════════════════════════════════════════════════════════════════════════════
const Scene01Hero: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[0];
  const fearStart = 540;
  const punchStart = 1080;   // audio: 「認識 = 打破恐懼第一步」at ~36s
  const punchFadeIn = 30;

  const badge = useFadeUp(0);
  const title = useFadeUpHeader(30);
  const sub = useFadeUp(110);
  const conn = useFadeUp(200);
  const titleBreathe = useBreathe(70);

  const fear = useFadeUpElastic(fearStart);
  const fearLine = useAccentLine(fearStart + 14);
  const i1 = useFadeUpItem(fearStart + 60);   // ~20s 「看到英文夾雜符號」
  const i2 = useFadeUpItem(fearStart + 210);  // ~25s 「生理上的抗拒」
  const i3 = useFadeUpItem(fearStart + 360);  // ~30s 「不知道從哪裡看起」
  const fearFade = interpolate(frame, [punchStart - punchFadeIn, punchStart], [1, 0], clamp);

  const punch = useFadeUpElastic(punchStart);
  const punchLine = useAccentLine(punchStart + 18);
  const punchBreathe = useBreathe(70);

  // hero / fear / punch are mutually exclusive (conditional render — collapses DOM, no overflow)
  const showHero  = frame < fearStart - 6;
  const showFear  = frame >= fearStart - 6 && frame < punchStart - 6;
  const showPunch = frame >= punchStart - 6;

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[0]} accent={C.green} />

        {/* === HERO === (F0 ~ F540) */}
        {showHero && (
          <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: `${NAV_H + 40 * S}px ${80 * S}px ${SUBTITLE_H + 40 * S}px` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 36 * S, ...badge }}>
              <span style={{ fontFamily: MONO, fontSize: 22 * S, color: C.green, border: `1px solid ${C.green}`, padding: `${6 * S}px ${18 * S}px`, borderRadius: 8 * S, letterSpacing: "0.06em", boxShadow: `0 0 12px ${hexGlow(C.green, 0.2)}` }}>CH 2-4</span>
              <span style={{ fontFamily: MONO, fontSize: 20 * S, color: C.muted, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, padding: `${6 * S}px ${16 * S}px`, borderRadius: 8 * S, letterSpacing: "0.04em" }}>SDLC · 平台語言</span>
            </div>

            <div style={{ marginBottom: 30 * S, ...title, textAlign: "center" }}>
              <h1 style={{ fontFamily: TC, fontSize: 140 * S, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", color: C.text, margin: 0, display: "inline-block", transform: `scale(${1 + 0.008 * titleBreathe})`, textShadow: `0 0 ${30 + 20 * titleBreathe}px ${hexGlow(C.green, 0.18 + 0.10 * titleBreathe)}` }}>
                <Disp style={{ color: C.green }}>程式語言</Disp>
              </h1>
            </div>

            <p style={{ fontFamily: TC, fontSize: 34 * S, color: C.muted, lineHeight: 1.5, textAlign: "center", maxWidth: 1400 * S, marginBottom: 60 * S, ...sub }}>
              每個平台都有<Disp style={{ color: C.green }}>最適合它</Disp>的語言
            </p>

            <div style={{ ...conn, display: "flex", alignItems: "center", gap: 16 * S, fontFamily: MONO, fontSize: 24 * S, color: C.muted, letterSpacing: "0.10em" }}>
              <span style={{ display: "inline-block", width: 40 * S, height: 1, background: C.faint }} />
              上集 <span style={{ color: C.faint }}>→</span> <Disp style={{ color: C.green }}>選平台</Disp>
              <span style={{ color: C.faint }}>→</span> <Disp style={{ color: C.green }}>對應語言</Disp>
              <span style={{ display: "inline-block", width: 40 * S, height: 1, background: C.faint }} />
            </div>
          </AbsoluteFill>
        )}

        {/* === FEAR BLOCK === (F540 ~ F1080) */}
        {showFear && (
          <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: `${NAV_H + 40 * S}px ${80 * S}px ${SUBTITLE_H + 40 * S}px`, opacity: fearFade }}>
            <div style={{ ...fear, textAlign: "center", marginBottom: 36 * S }}>
              <Disp style={{ fontFamily: SYNE, fontSize: 24 * S, color: C.red, letterSpacing: "0.20em", marginBottom: 22 * S, display: "block" }}>FEAR OF UNKNOWN</Disp>
              <div style={{ fontFamily: TC, fontSize: 90 * S, fontWeight: 800, lineHeight: 1.2, color: C.text, marginBottom: 20 * S }}>
                對<Disp style={{ color: C.red }}>未知</Disp>的恐懼
              </div>
              <div style={{ height: 4 * S, background: C.red, borderRadius: 99, maxWidth: 360 * S, margin: "0 auto", boxShadow: `0 0 14px ${hexGlow(C.red, 0.5)}`, ...fearLine }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 * S, width: "100%", maxWidth: 1300 * S }}>
              {[
                { t: "看到英文夾雜符號", s: i1 },
                { t: "生理上的抗拒",     s: i2 },
                { t: "不知道從哪裡看起", s: i3 },
              ].map(({ t, s }) => (
                <div key={t} style={{ ...s, display: "flex", alignItems: "center", gap: 22 * S, background: C.surface, border: `1px solid ${hexGlow(C.red, 0.22)}`, borderRadius: 16 * S, padding: `${22 * S}px ${32 * S}px` }}>
                  <span style={{ width: 16 * S, height: 16 * S, borderRadius: 99, background: C.red, boxShadow: `0 0 14px ${hexGlow(C.red, 0.6)}`, flexShrink: 0 }} />
                  <span style={{ fontFamily: TC, fontSize: 34 * S, color: C.text }}>{t}</span>
                </div>
              ))}
            </div>
          </AbsoluteFill>
        )}

        {/* === PUNCHLINE === (F1080 ~ F1503) — 對齊講者「認識 = 打破恐懼第一步」 */}
        {showPunch && (
          <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: `${NAV_H + 40 * S}px ${80 * S}px ${SUBTITLE_H + 40 * S}px` }}>
            <div style={{ ...punch, textAlign: "center" }}>
              <Disp style={{ fontFamily: SYNE, fontSize: 26 * S, color: C.green, letterSpacing: "0.20em", marginBottom: 32 * S, display: "block" }}>FIRST STEP</Disp>
              <div style={{ fontFamily: TC, fontSize: 96 * S, fontWeight: 800, lineHeight: 1.25, color: C.text, marginBottom: 24 * S, display: "inline-block", transform: `scale(${1 + 0.008 * punchBreathe})`, textShadow: `0 0 ${28 + 18 * punchBreathe}px ${hexGlow(C.green, 0.18 + 0.10 * punchBreathe)}` }}>
                <Disp style={{ color: C.green }}>認識</Disp> <span style={{ color: C.faint, fontWeight: 400 }}>=</span> 打破恐懼<Disp style={{ color: C.green }}>第一步</Disp>
              </div>
              <div style={{ height: 4 * S, background: C.green, borderRadius: 99, maxWidth: 360 * S, margin: "0 auto", boxShadow: `0 0 16px ${hexGlow(C.green, 0.5)}`, ...punchLine }} />
              <p style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted, lineHeight: 1.6, marginTop: 40 * S }}>
                打破對程式語言的<Disp style={{ color: C.green }}>刻板印象</Disp>
              </p>
            </div>
          </AbsoluteFill>
        )}

        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 1.1 — Why Know Languages
// global range 1504–3279 | dur 1776 | SEG_START=1504
// overlays (global):
//   SectionHeader 1504 | GoalList 1700→2400 | Compare2Col 2500→3279
// ═════════════════════════════════════════════════════════════════════════════
const Scene11WhyKnowLangs: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[1];
  // local frames (subtract 1504)
  const goalStart = 196;     // 1700
  const compareStart = 996;  // 2500

  const headerFade = useBlockFade(compareStart - 30);
  const goalsFade = useBlockFade(compareStart - 30);

  const goals = useFadeUpHeader(goalStart);
  const g1 = useFadeUpItem(goalStart + 30);
  const g2 = useFadeUpItem(goalStart + 90);
  const g3 = useFadeUpItem(goalStart + 150);

  const cmpHeader = useFadeUpHeader(compareStart);
  const cmpLeft = useFadeUpElastic(compareStart + 30);
  const cmpRight = useFadeUpElastic(compareStart + 120);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[1]} accent={C.green} />
        <SceneWrap>
          <div style={{ opacity: headerFade }}>
            <SectionHeader num="01" title="為什麼要認識程式語言？" startFrame={0} accent={C.green} />
          </div>

          {/* Goal list */}
          {frame < compareStart - 6 && (
            <div style={{ opacity: goalsFade, marginTop: 18 * S }}>
              <div style={{ ...goals, fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 22 * S }}>
                認識語言 → 你可以——
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 * S }}>
                {[
                  { icon: "target", t: "跟 AI 更精準溝通", s: g1 },
                  { icon: "brain",  t: "知道哪裡能改、哪裡別動", s: g2 },
                  { icon: "bolt",   t: "不浪費對話額度", s: g3 },
                ].map(({ icon, t, s }) => (
                  <div key={t} style={{ ...s, display: "flex", alignItems: "center", gap: 22 * S, background: C.surface, border: `1px solid ${hexGlow(C.green, 0.2)}`, borderRadius: 18 * S, padding: `${22 * S}px ${30 * S}px` }}>
                    <LI name={icon} size={50 * S} color={C.green} />
                    <span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, fontWeight: 600 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compare 2-col: 空空 vs 指揮官 */}
          {frame >= compareStart - 6 && (
            <div style={{ marginTop: 12 * S }}>
              <div style={{ ...cmpHeader, fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 24 * S }}>
                兩種使用 AI 的姿態
              </div>
              <div style={{ display: "flex", gap: 22 * S }}>
                <div style={{ ...cmpLeft, flex: 1, background: hexGlow(C.red, 0.07), border: `2px solid ${hexGlow(C.red, 0.4)}`, borderRadius: 20 * S, padding: `${30 * S}px ${32 * S}px` }}>
                  <div style={{ fontFamily: MONO, fontSize: 20 * S, color: C.red, letterSpacing: "0.12em", marginBottom: 14 * S }}>沒概念</div>
                  <div style={{ fontFamily: TC, fontSize: 40 * S, fontWeight: 800, color: C.red, marginBottom: 16 * S, lineHeight: 1.3 }}>腦袋空空</div>
                  <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted, lineHeight: 1.6 }}>
                    全靠 AI <span style={{ color: C.red }}>支配你</span>
                  </div>
                </div>
                <div style={{ ...cmpRight, flex: 1, background: hexGlow(C.green, 0.07), border: `2px solid ${hexGlow(C.green, 0.4)}`, borderRadius: 20 * S, padding: `${30 * S}px ${32 * S}px` }}>
                  <div style={{ fontFamily: MONO, fontSize: 20 * S, color: C.green, letterSpacing: "0.12em", marginBottom: 14 * S }}>有概念</div>
                  <div style={{ fontFamily: TC, fontSize: 40 * S, fontWeight: 800, color: C.green, marginBottom: 16 * S, lineHeight: 1.3 }}>指揮官</div>
                  <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted, lineHeight: 1.6 }}>
                    <span style={{ color: C.green }}>知道</span>自己在指揮 AI 做什麼
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
// SCENE 2.1 — Web Trinity (HTML/CSS/JS)
// global range 3280–6173 | dur 2894 | SEG_START=3280
// overlays:
//   SectionHeader 3280 | TrinityCard items 3700/4200/4900 | CombinedNote 5700→6173
// ═════════════════════════════════════════════════════════════════════════════
const Scene21WebTrinity: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[2];
  // local (subtract 3280)
  const t1Start = 420;   // 3700 HTML
  const t2Start = 920;   // 4200 CSS
  const t3Start = 1620;  // 4900 JS
  const noteStart = 2420; // 5700

  const headerFade = useBlockFade(noteStart - 30);
  const trinFade = useBlockFade(noteStart - 30);

  const tr1 = useFadeUpElastic(t1Start);
  const tr2 = useFadeUpElastic(t2Start);
  const tr3 = useFadeUpElastic(t3Start);

  const note = useFadeUpElastic(noteStart);
  const noteLine = useAccentLine(noteStart + 14);

  const items = [
    { from: t1Start, s: tr1, lang: "HTML",       accent: C.orange, role: "結構 + 內容", metaphor: "骨架",      icon: "skeleton" },
    { from: t2Start, s: tr2, lang: "CSS",        accent: C.purple, role: "外觀 + 樣式", metaphor: "皮膚衣服",  icon: "shirt" },
    { from: t3Start, s: tr3, lang: "JavaScript", accent: C.yellow, role: "行為 + 互動", metaphor: "大腦",      icon: "brain" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.orange} />
        <ProgressBar progressPct={PROGRESS_PCT[2]} accent={C.orange} />
        <SceneWrap>
          <div style={{ opacity: headerFade }}>
            <SectionHeader num="02" title="網頁御三家" startFrame={0} accent={C.orange} />
          </div>

          {/* Trinity 3 cards stacked vertically */}
          <div style={{ opacity: trinFade, display: "flex", flexDirection: "column", gap: 18 * S, marginTop: 14 * S }}>
            {items.map(({ from, s, lang, accent, role, metaphor, icon }) =>
              frame >= from - 6 && (
                <div key={lang} style={{ ...s, display: "flex", alignItems: "center", gap: 28 * S, background: C.surface, border: `1.5px solid ${hexGlow(accent, 0.35)}`, borderRadius: 20 * S, padding: `${24 * S}px ${32 * S}px` }}>
                  <div style={{ width: 84 * S, height: 84 * S, borderRadius: 18 * S, background: hexGlow(accent, 0.12), border: `1.5px solid ${hexGlow(accent, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <LI name={icon} size={48 * S} color={accent} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 16 * S, marginBottom: 6 * S }}>
                      <Disp style={{ fontFamily: SYNE, fontSize: 44 * S, color: accent, letterSpacing: "0.02em" }}>{lang}</Disp>
                      <span style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.08em" }}>{role}</span>
                    </div>
                    <div style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted, lineHeight: 1.5 }}>
                      就像<span style={{ color: accent }}>{metaphor}</span>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Combined note */}
          {frame >= noteStart - 6 && (
            <div style={{ ...note, marginTop: 32 * S, paddingLeft: 40 * S, borderLeft: `4px solid ${C.green}` }}>
              <Disp style={{ fontFamily: SYNE, fontSize: 22 * S, color: C.green, letterSpacing: "0.16em", marginBottom: 14 * S, display: "block" }}>TOGETHER</Disp>
              <div style={{ fontFamily: TC, fontSize: 42 * S, fontWeight: 700, color: C.text, lineHeight: 1.5 }}>
                三者<Disp style={{ color: C.green }}>缺一不可</Disp> — 共同組成你看到的所有網頁
              </div>
              <div style={{ height: 3 * S, background: C.green, borderRadius: 99, marginTop: 18 * S, maxWidth: 320 * S, ...noteLine }} />
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 2.2 — Shopping Example (HTML/CSS/JS flow)
// global range 6174–7584 | dur 1411 | SEG_START=6174
// overlays:
//   SubKicker 6174 | FlowSteps 6300/6700/7100
// ═════════════════════════════════════════════════════════════════════════════
const Scene22ShoppingExample: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[3];
  // local (subtract 6174)
  const s1Start = 126;   // 6300
  const s2Start = 526;   // 6700
  const s3Start = 926;   // 7100

  const step1 = useFadeUpElastic(s1Start);
  const step2 = useFadeUpElastic(s2Start);
  const step3 = useFadeUpElastic(s3Start);

  const steps = [
    { from: s1Start, s: step1, step: 1, accent: C.orange, label: "HTML",       what: "標記哪是標題 / 按鈕 / 輸入欄位" },
    { from: s2Start, s: step2, step: 2, accent: C.purple, label: "CSS",        what: "決定顏色 / 字體 / 版面" },
    { from: s3Start, s: step3, step: 3, accent: C.yellow, label: "JavaScript", what: "按下「購買」→ 跳結帳視窗" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.orange} />
        <ProgressBar progressPct={PROGRESS_PCT[3]} accent={C.orange} />
        <SceneWrap>
          <SubKicker text="舉例：購物網站" startFrame={0} accent={C.orange} />

          <div style={{ marginTop: 16 * S, display: "flex", flexDirection: "column", gap: 18 * S }}>
            {steps.map(({ from, s, step, accent, label, what }) =>
              frame >= from - 6 && (
                <div key={label} style={{ ...s, display: "flex", alignItems: "center", gap: 28 * S }}>
                  <div style={{ width: 110 * S, height: 110 * S, borderRadius: 24 * S, background: hexGlow(accent, 0.1), border: `2px solid ${hexGlow(accent, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: MONO, fontSize: 20 * S, color: accent, opacity: 0.7 }}>STEP</div>
                      <div style={{ fontFamily: SYNE, fontWeight: 800, fontSize: 52 * S, color: accent, lineHeight: 1 }}>{step}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, background: C.surface, border: `1px solid ${hexGlow(accent, 0.28)}`, borderRadius: 20 * S, padding: `${24 * S}px ${30 * S}px` }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 16 * S, marginBottom: 10 * S }}>
                      <Disp style={{ fontFamily: SYNE, fontSize: 40 * S, color: accent }}>{label}</Disp>
                    </div>
                    <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, lineHeight: 1.6 }}>{what}</div>
                  </div>
                </div>
              )
            )}
          </div>
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 2.3 — Java vs JavaScript (老婆餅沒有老婆 punchline)
// global range 7585–9897 | dur 2313 | SEG_START=7585
// overlays:
//   SubKicker 7585 | BigQuestion 7720→8200 | PunchlineCard 8200 | JavaVsJsCompare 8950→9897
// ═════════════════════════════════════════════════════════════════════════════
const Scene23JavaVsJS: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[4];
  // local (subtract 7585)
  const qStart = 135;     // 7720
  const punchStart = 615; // 8200
  const cmpStart = 1365;  // 8950

  const qFade = useBlockFade(punchStart - 30);
  const punchFade = useBlockFade(cmpStart - 30);

  const q = useFadeUpElastic(qStart);
  const punch = useFadeUpElastic(punchStart);
  const punchLine = useAccentLine(punchStart + 16);
  const punchBreathe = useBreathe(70);

  const cmpHeader = useFadeUpHeader(cmpStart);
  const left = useFadeUpElastic(cmpStart + 30);
  const right = useFadeUpElastic(cmpStart + 120);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.red} />
        <ProgressBar progressPct={PROGRESS_PCT[4]} accent={C.red} />
        <SceneWrap>
          <SubKicker text="常見誤會  ⚠️" startFrame={0} accent={C.red} />

          {/* Big Question */}
          {frame < punchStart - 6 && (
            <div style={{ opacity: qFade, paddingTop: 60 * S, textAlign: "center" }}>
              <Disp style={{ fontSize: 22 * S, color: C.muted, letterSpacing: "0.18em", marginBottom: 24 * S, display: "block" }}>QUESTION</Disp>
              {frame >= qStart - 6 && (
                <div style={{ ...q, fontFamily: TC, fontSize: 60 * S, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
                  <Disp style={{ color: C.yellow }}>Java</Disp> 是 <Disp style={{ color: C.yellow }}>JavaScript</Disp> 的簡稱嗎？
                </div>
              )}
            </div>
          )}

          {/* Punchline card */}
          {frame >= punchStart - 6 && frame < cmpStart - 6 && (
            <div style={{ opacity: punchFade, paddingTop: 40 * S, textAlign: "center" }}>
              <div style={{ ...punch }}>
                <Disp style={{ fontSize: 24 * S, color: C.red, letterSpacing: "0.2em", marginBottom: 30 * S, display: "block" }}>PUNCHLINE</Disp>
                <div style={{ fontFamily: TC, fontSize: 96 * S, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 28 * S, transform: `scale(${1 + 0.012 * punchBreathe})`, textShadow: `0 0 ${28 + 18 * punchBreathe}px ${hexGlow(C.red, 0.2 + 0.12 * punchBreathe)}` }}>
                  <Disp style={{ color: C.red }}>老婆餅</Disp>沒有<Disp style={{ color: C.red }}>老婆</Disp>
                </div>
                <div style={{ height: 4 * S, background: C.red, borderRadius: 99, maxWidth: 400 * S, margin: "0 auto", boxShadow: `0 0 18px ${hexGlow(C.red, 0.55)}`, ...punchLine }} />
                <div style={{ fontFamily: TC, fontSize: 36 * S, color: C.muted, marginTop: 28 * S, lineHeight: 1.5 }}>
                  Java 跟 JavaScript <Disp style={{ color: C.red }}>完全是兩個語言</Disp>
                </div>
              </div>
            </div>
          )}

          {/* Java vs JS compare */}
          {frame >= cmpStart - 6 && (
            <div style={{ marginTop: 12 * S }}>
              <div style={{ ...cmpHeader, fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 24 * S }}>
                兩個完全不同的語言
              </div>
              <div style={{ display: "flex", gap: 22 * S }}>
                {[
                  { side: left, title: "Java", accent: C.red, tags: ["語法嚴謹", "明確型別", "Android 早期主力"] },
                  { side: right, title: "JavaScript", accent: C.yellow, tags: ["靈活寬鬆", "瀏覽器而生", "蹭 Java 名字"] },
                ].map(({ side, title, accent, tags }) => (
                  <div key={title} style={{ ...side, flex: 1, background: hexGlow(accent, 0.07), border: `2px solid ${hexGlow(accent, 0.4)}`, borderRadius: 22 * S, padding: `${30 * S}px ${32 * S}px` }}>
                    <Disp style={{ fontFamily: SYNE, fontSize: 50 * S, color: accent, letterSpacing: "0.02em", marginBottom: 22 * S, display: "block" }}>{title}</Disp>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 * S }}>
                      {tags.map(t => (
                        <div key={t} style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
                          <span style={{ width: 10 * S, height: 10 * S, borderRadius: 99, background: accent, flexShrink: 0 }} />
                          <span style={{ fontFamily: TC, fontSize: 28 * S, color: C.text }}>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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
// SCENE 2.4 — TypeScript (family tree)
// global range 9898–11096 | dur 1199 | SEG_START=9898
// overlays:
//   SubKicker 9898 | FamilyTree 10100 | TipBlock 10750→11096
// ═════════════════════════════════════════════════════════════════════════════
const Scene24TypeScript: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[5];
  // local (subtract 9898)
  const treeStart = 202;   // 10100
  const tipStart = 852;    // 10750

  const treeFade = useBlockFade(tipStart - 30);
  const parent = useFadeUpElastic(treeStart);
  const edge = useDraw(treeStart + 16, 24);
  const child = useFadeUpElastic(treeStart + 40);
  const tag1 = useFadeUpItem(treeStart + 80);
  const tag2 = useFadeUpItem(treeStart + 110);
  const tag3 = useFadeUpItem(treeStart + 140);
  const tip = useFadeUpElastic(tipStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.yellow} />
        <ProgressBar progressPct={PROGRESS_PCT[5]} accent={C.yellow} />
        <SceneWrap>
          <SubKicker text="那 TypeScript 呢？" startFrame={0} accent={C.yellow} />

          {/* Family tree */}
          {frame < tipStart - 6 && (
            <div style={{ opacity: treeFade, paddingTop: 30 * S, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Parent */}
              <div style={{ ...parent, background: hexGlow(C.yellow, 0.08), border: `2px solid ${hexGlow(C.yellow, 0.5)}`, borderRadius: 24 * S, padding: `${30 * S}px ${50 * S}px`, marginBottom: 20 * S, textAlign: "center" }}>
                <Disp style={{ fontFamily: SYNE, fontSize: 50 * S, color: C.yellow, letterSpacing: "0.02em" }}>JavaScript</Disp>
                <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, marginTop: 8 * S, letterSpacing: "0.08em" }}>parent</div>
              </div>

              {/* Edge — label next to arrow */}
              <div style={{ position: "relative", height: 130 * S, width: 280 * S, marginBottom: 4 * S, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 * S }}>
                <svg width={60 * S} height={130 * S} viewBox="0 0 60 130" style={{ display: "block" }}>
                  <line x1="30" y1="0" x2="30" y2="100" stroke={C.yellow} strokeWidth={3} strokeDasharray="6 6" strokeDashoffset={-(frame * 0.5) % 12} strokeLinecap="round" strokeOpacity={edge} />
                  <polygon points="22,98 38,98 30,118" fill={C.yellow} opacity={edge} />
                </svg>
                <span style={{ fontFamily: MONO, fontSize: 22 * S, color: C.yellowSoft, letterSpacing: "0.1em", opacity: edge }}>嚴謹版</span>
              </div>

              {/* Child */}
              {frame >= treeStart + 40 - 6 && (
                <div style={{ ...child, background: hexGlow(C.yellowSoft, 0.08), border: `2px solid ${hexGlow(C.yellowSoft, 0.5)}`, borderRadius: 24 * S, padding: `${30 * S}px ${50 * S}px`, textAlign: "center", minWidth: 600 * S }}>
                  <Disp style={{ fontFamily: SYNE, fontSize: 50 * S, color: C.yellowSoft, letterSpacing: "0.02em" }}>TypeScript</Disp>
                  <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, marginTop: 8 * S, letterSpacing: "0.08em" }}>child · 親戚</div>
                  <div style={{ display: "flex", gap: 12 * S, justifyContent: "center", flexWrap: "wrap", marginTop: 22 * S }}>
                    {[
                      { t: "加型別規範", s: tag1 },
                      { t: "適合大型專案", s: tag2 },
                      { t: "AI 很會寫", s: tag3 },
                    ].map(({ t, s }) => (
                      <div key={t} style={{ ...s }}>
                        <Pill label={t} color={C.yellowSoft} style={{ fontSize: 22 * S, padding: `${10 * S}px ${20 * S}px` }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tip */}
          {frame >= tipStart - 6 && (
            <div style={{ ...tip, paddingTop: 60 * S, textAlign: "center" }}>
              <Disp style={{ fontSize: 24 * S, color: C.yellow, letterSpacing: "0.2em", marginBottom: 24 * S, display: "block" }}>TIP</Disp>
              <div style={{ fontFamily: TC, fontSize: 50 * S, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
                <Disp style={{ color: C.yellow }}>知道存在</Disp>就好，未來遇到不會嚇到
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
// SCENE 3.1 — Front vs Back (餐廳類比)
// global range 11097–14348 | dur 3252 | SEG_START=11097
// overlays:
//   SectionHeader 11097 | FrontEndDef 11500→12300 | BackEndDef 12350→13150
//   RestaurantAnalogy 13200→14348
// ═════════════════════════════════════════════════════════════════════════════
const Scene31FrontVsBack: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[6];
  // local (subtract 11097)
  const frontStart = 403;     // 11500
  const backStart = 1253;     // 12350
  const restStart = 2103;     // 13200

  const headerFade = useBlockFade(restStart - 30);
  const frontFade = useBlockFade(backStart - 30);
  const backFade = useBlockFade(restStart - 30);

  const fHeader = useFadeUpHeader(frontStart);
  const fItem1 = useFadeUpItem(frontStart + 30);
  const fItem2 = useFadeUpItem(frontStart + 60);
  const fItem3 = useFadeUpItem(frontStart + 90);
  const fItem4 = useFadeUpItem(frontStart + 120);

  const bHeader = useFadeUpHeader(backStart);
  const bItem1 = useFadeUpItem(backStart + 30);
  const bItem2 = useFadeUpItem(backStart + 60);
  const bItem3 = useFadeUpItem(backStart + 90);
  const bItem4 = useFadeUpItem(backStart + 120);

  const restHeader = useFadeUpHeader(restStart);
  const restLeft = useFadeUpElastic(restStart + 30);
  const restRight = useFadeUpElastic(restStart + 120);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[6]} accent={C.green} />
        <SceneWrap>
          <div style={{ opacity: headerFade }}>
            <SectionHeader num="03" title="前端與後端" startFrame={0} accent={C.green} />
          </div>

          {/* Front-end def */}
          {frame >= frontStart - 6 && frame < backStart - 6 && (
            <div style={{ opacity: frontFade, marginTop: 12 * S }}>
              <div style={{ ...fHeader, marginBottom: 22 * S }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 18 * S }}>
                  <Disp style={{ fontFamily: SYNE, fontSize: 46 * S, color: C.green, letterSpacing: "0.02em" }}>Front-end</Disp>
                  <span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, fontWeight: 700 }}>前端</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.1em", marginTop: 6 * S }}>使用者直接接觸的部分</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 * S }}>
                {[
                  { t: "看到的畫面", s: fItem1 },
                  { t: "點擊的按鈕", s: fItem2 },
                  { t: "輸入的表單", s: fItem3 },
                  { t: "互動邏輯",   s: fItem4 },
                ].map(({ t, s }) => (
                  <div key={t} style={{ ...s, display: "flex", alignItems: "center", gap: 16 * S, background: C.surface, border: `1px solid ${hexGlow(C.green, 0.22)}`, borderLeft: `4px solid ${hexGlow(C.green, 0.6)}`, borderRadius: 14 * S, padding: `${18 * S}px ${24 * S}px` }}>
                    <span style={{ width: 12 * S, height: 12 * S, borderRadius: 99, background: C.green, flexShrink: 0, boxShadow: `0 0 10px ${hexGlow(C.green, 0.5)}` }} />
                    <span style={{ fontFamily: TC, fontSize: 28 * S, color: C.text }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back-end def */}
          {frame >= backStart - 6 && frame < restStart - 6 && (
            <div style={{ opacity: backFade, marginTop: 12 * S }}>
              <div style={{ ...bHeader, marginBottom: 22 * S }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 18 * S, flexWrap: "wrap" }}>
                  <Disp style={{ fontFamily: SYNE, fontSize: 46 * S, color: C.orange, letterSpacing: "0.02em" }}>Back-end</Disp>
                  <span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, fontWeight: 700 }}>後端 / 伺服器端</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.1em", marginTop: 6 * S }}>看不到、但默默在跑的部分</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 * S }}>
                {[
                  { t: "接收前端請求", s: bItem1 },
                  { t: "處理資料",     s: bItem2 },
                  { t: "資料庫互動",   s: bItem3 },
                  { t: "回傳結果",     s: bItem4 },
                ].map(({ t, s }) => (
                  <div key={t} style={{ ...s, display: "flex", alignItems: "center", gap: 16 * S, background: C.surface, border: `1px solid ${hexGlow(C.orange, 0.22)}`, borderLeft: `4px solid ${hexGlow(C.orange, 0.6)}`, borderRadius: 14 * S, padding: `${18 * S}px ${24 * S}px` }}>
                    <span style={{ width: 12 * S, height: 12 * S, borderRadius: 99, background: C.orange, flexShrink: 0, boxShadow: `0 0 10px ${hexGlow(C.orange, 0.5)}` }} />
                    <span style={{ fontFamily: TC, fontSize: 28 * S, color: C.text }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Restaurant analogy */}
          {frame >= restStart - 6 && (
            <div style={{ marginTop: 12 * S }}>
              <div style={{ ...restHeader, marginBottom: 24 * S }}>
                <Disp style={{ fontSize: 22 * S, color: C.muted, letterSpacing: "0.2em", marginBottom: 12 * S, display: "block" }}>ANALOGY · 餐廳類比</Disp>
                <div style={{ fontFamily: TC, fontSize: 44 * S, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
                  想像一間<Disp style={{ color: C.green }}>餐廳</Disp>
                </div>
              </div>
              <div style={{ display: "flex", gap: 22 * S }}>
                <div style={{ ...restLeft, flex: 1, background: hexGlow(C.green, 0.07), border: `2px solid ${hexGlow(C.green, 0.4)}`, borderRadius: 22 * S, padding: `${30 * S}px ${32 * S}px` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 * S, marginBottom: 18 * S }}>
                    <LI name="server" size={56 * S} color={C.green} />
                    <Disp style={{ fontFamily: SYNE, fontSize: 36 * S, color: C.green }}>前端 = 服務生</Disp>
                  </div>
                  <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, lineHeight: 1.6 }}>
                    你看到<span style={{ color: C.green }}>菜單</span>、<span style={{ color: C.green }}>點餐</span>、<span style={{ color: C.green }}>上菜</span>
                  </div>
                </div>
                <div style={{ ...restRight, flex: 1, background: hexGlow(C.orange, 0.07), border: `2px solid ${hexGlow(C.orange, 0.4)}`, borderRadius: 22 * S, padding: `${30 * S}px ${32 * S}px` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 * S, marginBottom: 18 * S }}>
                    <LI name="chef" size={56 * S} color={C.orange} />
                    <Disp style={{ fontFamily: SYNE, fontSize: 36 * S, color: C.orange }}>後端 = 廚房</Disp>
                  </div>
                  <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, lineHeight: 1.6 }}>
                    把食物<span style={{ color: C.orange }}>做出來</span>、<span style={{ color: C.orange }}>處理訂單</span>
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
// SCENE 3.2 — Concert Example (搶票)
// global range 14349–15234 | dur 886 | SEG_START=14349
// overlays:
//   SubKicker 14349 | QuestionPunch 14500→14900 | AnswerReveal 14950
// ═════════════════════════════════════════════════════════════════════════════
const Scene32ConcertExample: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[7];
  // local (subtract 14349)
  const qStart = 151;       // 14500
  const ansStart = 601;     // 14950

  const qFade = useBlockFade(ansStart - 30);
  const q = useFadeUpElastic(qStart);
  const ans = useFadeUpElastic(ansStart);
  const ansLine = useAccentLine(ansStart + 14);
  const ansBreathe = useBreathe(80);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.orange} />
        <ProgressBar progressPct={PROGRESS_PCT[7]} accent={C.orange} />
        <SceneWrap>
          <SubKicker text="情境：線上搶票" startFrame={0} accent={C.orange} />

          {/* Question */}
          {frame < ansStart - 6 && (
            <div style={{ opacity: qFade, paddingTop: 60 * S, textAlign: "center" }}>
              <Disp style={{ fontSize: 22 * S, color: C.muted, letterSpacing: "0.2em", marginBottom: 24 * S, display: "block" }}>QUESTION</Disp>
              {frame >= qStart - 6 && (
                <div style={{ ...q, fontFamily: TC, fontSize: 54 * S, fontWeight: 700, color: C.text, lineHeight: 1.45 }}>
                  為什麼<Disp style={{ color: C.orange }}>同一張票</Disp>，<br />
                  不會同時被<Disp style={{ color: C.orange }}>兩人</Disp>買走？
                </div>
              )}
            </div>
          )}

          {/* Answer reveal */}
          {frame >= ansStart - 6 && (
            <div style={{ ...ans, paddingTop: 40 * S, textAlign: "center" }}>
              <Disp style={{ fontSize: 24 * S, color: C.orange, letterSpacing: "0.2em", marginBottom: 26 * S, display: "block" }}>ANSWER</Disp>
              <div style={{ fontFamily: TC, fontSize: 80 * S, fontWeight: 900, color: C.text, lineHeight: 1.3, marginBottom: 24 * S, transform: `scale(${1 + 0.012 * ansBreathe})`, textShadow: `0 0 ${20 + 16 * ansBreathe}px ${hexGlow(C.orange, 0.18 + 0.12 * ansBreathe)}` }}>
                <Disp style={{ color: C.orange }}>後端在把關</Disp>
              </div>
              <div style={{ height: 4 * S, background: C.orange, borderRadius: 99, maxWidth: 360 * S, margin: "0 auto", boxShadow: `0 0 18px ${hexGlow(C.orange, 0.55)}`, ...ansLine }} />
              <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.muted, marginTop: 30 * S, lineHeight: 1.6 }}>
                前端讓你<span style={{ color: C.green }}>看得見</span>；後端讓資料<span style={{ color: C.orange }}>不重複</span>
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
// SCENE 3.3 — Web vs App (umbrella diagram)
// global range 15235–16296 | dur 1062 | SEG_START=15235
// overlays:
//   SubKicker 15235 | UmbrellaDiagram 15400 | NoteBlock 16000→16296
// ═════════════════════════════════════════════════════════════════════════════
const Scene33WebVsApp: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[8];
  // local (subtract 15235)
  const umbStart = 165;      // 15400
  const noteStart = 765;     // 16000

  const umbFade = useBlockFade(noteStart - 30);
  const umb = useFadeUpElastic(umbStart);
  const edge = useDraw(umbStart + 20, 30);
  const c1 = useFadeUpElastic(umbStart + 40);
  const c2 = useFadeUpElastic(umbStart + 80);
  const c3 = useFadeUpElastic(umbStart + 120);
  const note = useFadeUpElastic(noteStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[8]} accent={C.green} />
        <SceneWrap>
          <SubKicker text="那 App 算前端嗎？" startFrame={0} accent={C.green} />

          {/* Umbrella diagram */}
          {frame < noteStart - 6 && (
            <div style={{ opacity: umbFade, paddingTop: 20 * S, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Umbrella (parent) */}
              <div style={{ ...umb, background: hexGlow(C.green, 0.1), border: `2px solid ${hexGlow(C.green, 0.5)}`, borderRadius: 24 * S, padding: `${26 * S}px ${56 * S}px`, marginBottom: 18 * S, textAlign: "center" }}>
                <Disp style={{ fontFamily: SYNE, fontSize: 42 * S, color: C.green, letterSpacing: "0.02em" }}>客戶端 / Client</Disp>
                <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, marginTop: 6 * S, letterSpacing: "0.1em" }}>umbrella term</div>
              </div>

              {/* Tree edges */}
              <svg width={1200 * S} height={70 * S} viewBox="0 0 1200 70" style={{ display: "block", marginBottom: 4 * S }}>
                <line x1="600" y1="0" x2="600" y2="20" stroke={C.green} strokeWidth={2.5} strokeOpacity={edge} />
                <line x1="200" y1="20" x2="1000" y2="20" stroke={C.green} strokeWidth={2.5} strokeOpacity={edge} />
                <line x1="200" y1="20" x2="200" y2="60" stroke={C.green} strokeWidth={2.5} strokeOpacity={edge} />
                <line x1="600" y1="20" x2="600" y2="60" stroke={C.green} strokeWidth={2.5} strokeOpacity={edge} />
                <line x1="1000" y1="20" x2="1000" y2="60" stroke={C.green} strokeWidth={2.5} strokeOpacity={edge} />
              </svg>

              {/* Children */}
              <div style={{ display: "flex", gap: 18 * S }}>
                {[
                  { from: umbStart + 40, s: c1, label: "Web 前端",    sub: "瀏覽器內", accent: C.green },
                  { from: umbStart + 80, s: c2, label: "iOS App",     sub: "Swift",   accent: C.purple },
                  { from: umbStart + 120, s: c3, label: "Android App", sub: "Kotlin",  accent: C.yellow },
                ].map(({ from, s, label, sub, accent }) =>
                  frame >= from - 6 && (
                    <div key={label} style={{ ...s, flex: 1, minWidth: 380 * S, background: C.surface, border: `1.5px solid ${hexGlow(accent, 0.4)}`, borderRadius: 18 * S, padding: `${22 * S}px ${26 * S}px`, textAlign: "center" }}>
                      <Disp style={{ fontFamily: SYNE, fontSize: 34 * S, color: accent, letterSpacing: "0.02em", display: "block", marginBottom: 8 * S }}>{label}</Disp>
                      <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.06em" }}>{sub}</div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Note */}
          {frame >= noteStart - 6 && (
            <div style={{ ...note, marginTop: 30 * S, background: hexGlow(C.green, 0.08), border: `1px solid ${hexGlow(C.green, 0.3)}`, borderRadius: 20 * S, padding: `${28 * S}px ${36 * S}px`, fontFamily: TC, fontSize: 32 * S, color: C.text, lineHeight: 1.6, textAlign: "center" }}>
              廣義：<Disp style={{ color: C.green }}>App 也常被叫做前端</Disp>，知道大概就好
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 3.4 — Network Off Test (wifi off punchline)
// global range 16297–17628 | dur 1332 | SEG_START=16297
// overlays:
//   SubKicker 16297 | WifiOffPunchline 16400 | ExceptionCard 17150→17628
// ═════════════════════════════════════════════════════════════════════════════
const Scene34NetworkOffTest: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[9];
  // local (subtract 16297)
  const wifiStart = 103;    // 16400
  const exStart = 853;      // 17150

  const wifiFade = useBlockFade(exStart - 30);
  const icon = useFadeUpElastic(wifiStart);
  const line1 = useFadeUpItem(wifiStart + 40);
  const line2 = useFadeUpItem(wifiStart + 110);
  const line3 = useFadeUpItem(wifiStart + 180);
  const iconBreathe = useBreathe(60);

  const ex = useFadeUpHeader(exStart);
  const ex1 = useFadeUpItem(exStart + 30);
  const ex2 = useFadeUpItem(exStart + 60);
  const ex3 = useFadeUpItem(exStart + 90);
  const exNote = useFadeUpItem(exStart + 150);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.red} />
        <ProgressBar progressPct={PROGRESS_PCT[9]} accent={C.red} />
        <SceneWrap>
          <SubKicker text="怎麼判斷？" startFrame={0} accent={C.red} />

          {/* WiFi off punchline */}
          {frame < exStart - 30 && (
            <div style={{ opacity: wifiFade, paddingTop: 20 * S, display: "flex", gap: 50 * S, alignItems: "center" }}>
              {/* Big wifi-off icon */}
              <div style={{ ...icon, transform: `${icon.transform} scale(${1 + 0.04 * iconBreathe})`, flexShrink: 0 }}>
                <div style={{ width: 280 * S, height: 280 * S, borderRadius: 99, background: hexGlow(C.red, 0.1), border: `3px solid ${hexGlow(C.red, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 ${30 + 30 * iconBreathe}px ${hexGlow(C.red, 0.3)}` }}>
                  <LI name="wifi-off" size={150 * S} color={C.red} sw={2} />
                </div>
              </div>

              {/* Punchline lines */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 * S }}>
                {frame >= wifiStart + 40 - 6 && (
                  <div style={{ ...line1, fontFamily: TC, fontSize: 56 * S, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>
                    把網路<Disp style={{ color: C.red }}>關掉</Disp>
                  </div>
                )}
                {frame >= wifiStart + 110 - 6 && (
                  <div style={{ ...line2, fontFamily: TC, fontSize: 36 * S, fontWeight: 600, color: C.text, lineHeight: 1.5, paddingLeft: 18 * S, borderLeft: `4px solid ${hexGlow(C.green, 0.6)}` }}>
                    還能看到的 = <Disp style={{ color: C.green }}>前端</Disp>
                  </div>
                )}
                {frame >= wifiStart + 180 - 6 && (
                  <div style={{ ...line3, fontFamily: TC, fontSize: 36 * S, fontWeight: 600, color: C.text, lineHeight: 1.5, paddingLeft: 18 * S, borderLeft: `4px solid ${hexGlow(C.orange, 0.6)}` }}>
                    需要網路才能做的 = <Disp style={{ color: C.orange }}>後端</Disp>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Exception card */}
          {frame >= exStart - 6 && (
            <div style={{ marginTop: 14 * S }}>
              <div style={{ ...ex, marginBottom: 22 * S }}>
                <Disp style={{ fontSize: 22 * S, color: C.muted, letterSpacing: "0.2em", marginBottom: 12 * S, display: "block" }}>EXCEPTION</Disp>
                <div style={{ fontFamily: TC, fontSize: 40 * S, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
                  例外：這些 App <Disp style={{ color: C.green }}>沒後端</Disp>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 * S, marginBottom: 20 * S }}>
                {[
                  { icon: "calculator", t: "計算機",      s: ex1 },
                  { icon: "file",       t: "PDF 閱讀器",  s: ex2 },
                  { icon: "swap",       t: "轉檔工具",     s: ex3 },
                ].map(({ icon, t, s }) => (
                  <div key={t} style={{ ...s, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S, background: C.surface, border: `1px solid ${hexGlow(C.green, 0.22)}`, borderRadius: 16 * S, padding: `${20 * S}px ${16 * S}px` }}>
                    <LI name={icon} size={44 * S} color={C.green} />
                    <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.text, fontWeight: 600 }}>{t}</span>
                  </div>
                ))}
              </div>
              {frame >= exStart + 150 - 6 && (
                <div style={{ ...exNote, fontFamily: TC, fontSize: 28 * S, color: C.muted, lineHeight: 1.6, paddingLeft: 18 * S, borderLeft: `3px solid ${hexGlow(C.green, 0.4)}` }}>
                  邏輯<span style={{ color: C.green }}>完全在本機跑</span>，沒網路也能活
                </div>
              )}
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PlatformLangRow — shared component for Scene 4.1 / 4.2 / 4.3
// ─────────────────────────────────────────────────────────────────────────────
type LangBranch = { label: string; lang: string; tag?: string };
type PlatformRowItem = {
  num: number;
  platform: string;
  langs?: string[];
  branches?: LangBranch[];
  accent: string;
  note?: string;
};
const PlatformRow: React.FC<{ item: PlatformRowItem; style: AnimStyle }> = ({ item, style }) => {
  const { num, platform, langs, branches, accent, note } = item;
  return (
    <div style={{ ...style, background: C.surface, border: `1.5px solid ${hexGlow(accent, 0.32)}`, borderRadius: 20 * S, padding: `${22 * S}px ${28 * S}px`, marginBottom: 16 * S }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 * S, marginBottom: branches || (langs && langs.length > 0) ? 16 * S : 0 }}>
        <div style={{ width: 60 * S, height: 60 * S, borderRadius: 14 * S, background: hexGlow(accent, 0.12), border: `2px solid ${hexGlow(accent, 0.5)}`, color: accent, fontFamily: MONO, fontSize: 26 * S, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{num}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: TC, fontSize: 34 * S, fontWeight: 700, color: C.text }}>{platform}</div>
          {note && <div style={{ fontFamily: TC, fontSize: 22 * S, color: C.muted, marginTop: 4 * S, lineHeight: 1.5 }}>{note}</div>}
        </div>
      </div>

      {/* langs as pills */}
      {langs && langs.length > 0 && (
        <div style={{ display: "flex", gap: 12 * S, flexWrap: "wrap", marginLeft: 82 * S }}>
          {langs.map(l => (
            <Pill key={l} label={l} color={accent} style={{ fontSize: 22 * S, padding: `${8 * S}px ${20 * S}px` }} />
          ))}
        </div>
      )}

      {/* branches: label + lang + tag */}
      {branches && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 * S, marginLeft: 82 * S }}>
          {branches.map(b => (
            <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 14 * S, fontFamily: TC, fontSize: 24 * S, color: C.text, flexWrap: "wrap" }}>
              <span style={{ background: hexGlow(accent, 0.12), border: `1px solid ${hexGlow(accent, 0.4)}`, borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`, color: accent, fontWeight: 600 }}>{b.label}</span>
              <span style={{ color: C.muted, fontSize: 22 * S, fontFamily: MONO }}>→</span>
              <Disp style={{ fontFamily: SYNE, fontSize: 26 * S, color: accent }}>{b.lang}</Disp>
              {b.tag && <span style={{ color: C.muted, fontSize: 22 * S }}>· {b.tag}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 4.1 — Lang Map 1/3
// global range 17629–19810 | dur 2182 | SEG_START=17629
// overlays:
//   SectionHeader 17629 | RecapNote 17800→18100
//   PlatformRow 1 (18200) | 2 (18800) | 3 (19300)
// ═════════════════════════════════════════════════════════════════════════════
const Scene41LangMap1: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[10];
  // local (subtract 17629)
  const recapStart = 171;    // 17800
  const r1Start = 571;       // 18200
  const r2Start = 1171;      // 18800
  const r3Start = 1671;      // 19300

  const headerFade = useBlockFade(null);
  const recap = useFadeUp(recapStart);
  const recapFade = useBlockFade(r1Start - 30);

  const r1 = useFadeUpElastic(r1Start);
  const r2 = useFadeUpElastic(r2Start);
  const r3 = useFadeUpElastic(r3Start);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[10]} accent={C.green} />
        <SceneWrap>
          <div style={{ opacity: headerFade }}>
            <SectionHeader num="04" title="各平台對應的語言" startFrame={0} accent={C.green} />
          </div>

          {/* Recap note */}
          {frame < r1Start - 6 && (
            <div style={{ ...recap, opacity: recap.opacity * recapFade, marginTop: 14 * S, marginBottom: 22 * S, fontFamily: TC, fontSize: 32 * S, color: C.muted, lineHeight: 1.6, paddingLeft: 18 * S, borderLeft: `3px solid ${hexGlow(C.green, 0.5)}` }}>
              重點：<span style={{ color: C.green }}>記關鍵字</span>，不用全部背
            </div>
          )}

          {/* Platform rows */}
          {frame >= r1Start - 6 && (
            <div style={{ marginTop: 12 * S }}>
              <PlatformRow
                item={{ num: 1, platform: "Web 前端", langs: ["HTML", "CSS", "JavaScript", "TypeScript"], accent: C.green, note: "Chrome 外掛也屬此類" }}
                style={r1}
              />
              {frame >= r2Start - 6 && (
                <PlatformRow
                  item={{ num: 2, platform: "iOS App", langs: ["Swift"], accent: C.purple, note: "Apple 官方主推" }}
                  style={r2}
                />
              )}
              {frame >= r3Start - 6 && (
                <PlatformRow
                  item={{ num: 3, platform: "Android App", langs: ["Kotlin"], accent: C.yellow, note: "從 Java 演進，更現代" }}
                  style={r3}
                />
              )}
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 4.2 — Lang Map 2/3 (跨平台 App + Framework explain)
// global range 19811–21675 | dur 1865 | SEG_START=19811
// overlays:
//   PlatformRow 4 (19811) | FrameworkExplain (20500) | NoteBlock (21300→21675)
// ═════════════════════════════════════════════════════════════════════════════
const Scene42LangMap2: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[11];
  // local (subtract 19811)
  const r4Start = 0;
  const fwStart = 689;       // 20500
  const noteStart = 1489;    // 21300

  const r4Fade = useBlockFade(fwStart - 30);
  const fwFade = useBlockFade(noteStart - 30);

  const r4 = useFadeUpElastic(r4Start);
  const fw = useFadeUpElastic(fwStart);
  const fwLine = useAccentLine(fwStart + 14);
  const note = useFadeUpElastic(noteStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.purple} />
        <ProgressBar progressPct={PROGRESS_PCT[11]} accent={C.purple} />
        <SceneWrap>
          {/* Platform row 4 */}
          {frame < fwStart - 6 && (
            <div style={{ opacity: r4Fade, marginTop: 8 * S }}>
              <SubKicker text="04 · 跨平台 App" startFrame={0} accent={C.purple} />
              <PlatformRow
                item={{ num: 4, platform: "跨平台 App", branches: [
                  { label: "React Native", lang: "JavaScript", tag: "開發快、像做網頁" },
                  { label: "Flutter",      lang: "Dart",       tag: "滑感接近原生" },
                ], accent: C.purple }}
                style={r4}
              />
            </div>
          )}

          {/* Framework explain */}
          {frame >= fwStart - 6 && frame < noteStart - 6 && (
            <div style={{ opacity: fwFade, paddingTop: 20 * S }}>
              <Disp style={{ fontSize: 22 * S, color: C.purple, letterSpacing: "0.2em", marginBottom: 16 * S, display: "block" }}>FRAMEWORK 是什麼？</Disp>
              <div style={{ ...fw, fontFamily: TC, fontSize: 44 * S, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 20 * S }}>
                幫你<Disp style={{ color: C.purple }}>搭好基礎結構</Disp>的模板
              </div>
              <div style={{ height: 3 * S, background: C.purple, borderRadius: 99, maxWidth: 320 * S, marginBottom: 28 * S, ...fwLine }} />

              {/* Metaphor card — 蓋房子 blueprint */}
              <div style={{ background: hexGlow(C.purple, 0.07), border: `1.5px solid ${hexGlow(C.purple, 0.35)}`, borderRadius: 20 * S, padding: `${26 * S}px ${32 * S}px`, display: "flex", alignItems: "center", gap: 28 * S }}>
                <div style={{ width: 100 * S, height: 100 * S, borderRadius: 18 * S, background: hexGlow(C.purple, 0.12), border: `2px solid ${hexGlow(C.purple, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <LI name="blueprint" size={56 * S} color={C.purple} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: TC, fontSize: 32 * S, fontWeight: 700, color: C.purple, marginBottom: 8 * S }}>
                    蓋房子用結構圖
                  </div>
                  <div style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted, lineHeight: 1.6 }}>
                    你不用從<span style={{ color: C.purple }}>骨架</span>研究起，可以直接改造
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Note: Framework ≠ 程式語言 */}
          {frame >= noteStart - 6 && (
            <div style={{ ...note, paddingTop: 60 * S, textAlign: "center" }}>
              <div style={{ background: hexGlow(C.red, 0.08), border: `2px solid ${hexGlow(C.red, 0.4)}`, borderRadius: 22 * S, padding: `${36 * S}px ${44 * S}px`, fontFamily: TC, fontSize: 52 * S, color: C.text, lineHeight: 1.4, fontWeight: 800 }}>
                <Disp style={{ color: C.red }}>Framework ≠ 程式語言</Disp>
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
// SCENE 4.3 — Lang Map 3/3 (桌面 / 後端 + 新手首推)
// global range 21676–23642 | dur 1967 | SEG_START=21676
// overlays:
//   PlatformRow 5 (21676) | PlatformRow 6 (22500) | BeginnerPick (23000)
// ═════════════════════════════════════════════════════════════════════════════
const Scene43LangMap3: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[12];
  // local (subtract 21676)
  const r5Start = 0;
  const r6Start = 824;       // 22500
  const beginnerStart = 1324; // 23000

  const rowsFade = useBlockFade(beginnerStart - 30);
  const r5 = useFadeUpElastic(r5Start);
  const r6 = useFadeUpElastic(r6Start);
  const beginner = useFadeUpHeader(beginnerStart);
  const pick1 = useFadeUpElastic(beginnerStart + 30);
  const pick2 = useFadeUpElastic(beginnerStart + 90);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.orange} />
        <ProgressBar progressPct={PROGRESS_PCT[12]} accent={C.orange} />
        <SceneWrap>
          {/* Platform rows 5 + 6 */}
          {frame < beginnerStart - 6 && (
            <div style={{ opacity: rowsFade, marginTop: 8 * S }}>
              <SubKicker text="05 · 桌面 / 後端" startFrame={0} accent={C.orange} />
              <PlatformRow
                item={{ num: 5, platform: "桌面 App", branches: [
                  { label: "Mac", lang: "Swift" },
                  { label: "Windows", lang: "C#" },
                  { label: "Electron", lang: "HTML/CSS/JS", tag: "跨平台 framework" },
                ], accent: C.orange }}
                style={r5}
              />
              {frame >= r6Start - 6 && (
                <PlatformRow
                  item={{ num: 6, platform: "後端 / 伺服器", langs: ["Node.js", "Python", "PHP"], accent: C.orange, note: "選擇最自由" }}
                  style={r6}
                />
              )}
            </div>
          )}

          {/* Beginner Pick */}
          {frame >= beginnerStart - 6 && (
            <div style={{ marginTop: 12 * S }}>
              <div style={{ ...beginner, marginBottom: 24 * S }}>
                <Disp style={{ fontSize: 22 * S, color: C.green, letterSpacing: "0.2em", marginBottom: 12 * S, display: "block" }}>新手首推</Disp>
                <div style={{ fontFamily: TC, fontSize: 42 * S, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
                  想入門<Disp style={{ color: C.green }}>後端</Disp>？選這兩個
                </div>
              </div>
              <div style={{ display: "flex", gap: 22 * S }}>
                {[
                  { side: pick1, lang: "Python",  reason: "語法簡潔；AI 任務綜合最強", accent: C.green },
                  { side: pick2, lang: "Node.js", reason: "JS 前後端通用，學一個語言通吃", accent: C.yellow },
                ].map(({ side, lang, reason, accent }) => (
                  <div key={lang} style={{ ...side, flex: 1, background: hexGlow(accent, 0.07), border: `2px solid ${hexGlow(accent, 0.4)}`, borderRadius: 22 * S, padding: `${28 * S}px ${30 * S}px` }}>
                    <Disp style={{ fontFamily: SYNE, fontSize: 48 * S, color: accent, letterSpacing: "0.02em", display: "block", marginBottom: 16 * S }}>{lang}</Disp>
                    <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, lineHeight: 1.6 }}>{reason}</div>
                  </div>
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
// SCENE 4.4 — Impression (有印象就好 + 劉姥姥逛大觀園)
// global range 23643–24884 (note: spec says ends 24884 < SEG end 25018)
//   we use SEG_DURATIONS[13] = 1376 (covers 23643–25018)
// overlays:
//   HumorKicker 23643→24000 | BigPunchline 24050
// ═════════════════════════════════════════════════════════════════════════════
const Scene44Impression: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[13];
  // local (subtract 23643)
  const humorStart = 0;
  const punchStart = 407;    // 24050

  const humorFade = useBlockFade(punchStart - 30);
  const humor = useFadeUpHeader(humorStart);
  const humorBreathe = useBreathe(60);

  const punch = useFadeUpElastic(punchStart);
  const line1 = useFadeUpItem(punchStart + 40);
  const line2 = useFadeUpItem(punchStart + 120);
  const kicker = useFadeUpItem(punchStart + 220);
  const punchBreathe = useBreathe(75);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[13]} accent={C.green} />
        <SceneWrap>
          {/* Humor kicker */}
          {frame < punchStart - 6 && (
            <div style={{ opacity: humorFade, paddingTop: 80 * S, textAlign: "center" }}>
              <div style={{ ...humor, fontFamily: MONO, fontSize: 24 * S, color: C.muted, letterSpacing: "0.16em", marginBottom: 30 * S }}>HUMOR</div>
              <div style={{ ...humor, fontFamily: TC, fontSize: 56 * S, fontWeight: 700, color: C.text, lineHeight: 1.4, transform: `${humor.transform} translateY(${Math.sin(humorBreathe * Math.PI) * 4}px)` }}>
                聽到這裡⋯⋯<br />
                <Disp style={{ color: C.green }}>劉姥姥逛大觀園</Disp>？
              </div>
            </div>
          )}

          {/* Big punchline */}
          {frame >= punchStart - 6 && (
            <div style={{ paddingTop: 40 * S, textAlign: "center" }}>
              <div style={{ ...punch }}>
                <Disp style={{ fontSize: 24 * S, color: C.green, letterSpacing: "0.2em", marginBottom: 32 * S, display: "block" }}>RELAX</Disp>
              </div>
              {frame >= punchStart + 40 - 6 && (
                <div style={{ ...line1, fontFamily: TC, fontSize: 72 * S, fontWeight: 900, color: C.text, lineHeight: 1.3, marginBottom: 24 * S }}>
                  你<Disp style={{ color: C.green }}>不用背</Disp>
                </div>
              )}
              {frame >= punchStart + 120 - 6 && (
                <div style={{ ...line2, fontFamily: TC, fontSize: 48 * S, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 30 * S, transform: `${line2.transform} scale(${1 + 0.01 * punchBreathe})` }}>
                  知道目標平台 → 有<Disp style={{ color: C.green, textShadow: `0 0 ${22 + 14 * punchBreathe}px ${hexGlow(C.green, 0.2 + 0.12 * punchBreathe)}` }}>模糊印象</Disp>就好
                </div>
              )}
              {frame >= punchStart + 220 - 6 && (
                <div style={{ ...kicker, fontFamily: TC, fontSize: 30 * S, color: C.muted, lineHeight: 1.6 }}>
                  想不起來再<span style={{ color: C.green }}>搜尋</span>，看到結果就會記起來
                </div>
              )}
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 5.1 — Finale (5 條 takeaway + 發光大卡)
// global range 25019–28002 | dur 2984 | SEG_START=25019
// overlays:
//   SectionHeader 25019 | Takeaway 1 (25200) | 2 (25800) | 3 (26400) | 4 (26900) | 5 (27400)
//   FinaleGlowCard (27750)
// ═════════════════════════════════════════════════════════════════════════════
const Scene51Finale: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[14];
  // local (subtract 25019)
  const t1Start = 181;     // 25200
  const t2Start = 781;     // 25800
  const t3Start = 1381;    // 26400
  const t4Start = 1881;    // 26900
  const t5Start = 2381;    // 27400
  const finaleStart = 2731; // 27750

  const cardsFade = useBlockFade(finaleStart - 30);
  const t1 = useFadeUpElastic(t1Start);
  const t2 = useFadeUpElastic(t2Start);
  const t3 = useFadeUpElastic(t3Start);
  const t4 = useFadeUpElastic(t4Start);
  const t5 = useFadeUpElastic(t5Start);
  const fin = useFadeUpElastic(finaleStart);
  const glow = 0.22 + 0.1 * Math.sin((frame - finaleStart) / 30);

  const takeaways = [
    { num: "01", color: C.green,  s: t1, start: t1Start, title: "認識降低恐懼",   body: "知道哪能改、哪別動 → 跟 AI 協作更有效率。" },
    { num: "02", color: C.orange, s: t2, start: t2Start, title: "網頁御三家",      body: "HTML (結構) / CSS (外觀) / JavaScript (互動)；Java ≠ JS。" },
    { num: "03", color: C.green,  s: t3, start: t3Start, title: "前後端判斷法",    body: "把網路關掉，還在的 = 前端；需要網路的 = 後端。" },
    { num: "04", color: C.yellow, s: t4, start: t4Start, title: "平台對應語言",    body: "Web 三本柱 / iOS Swift / Android Kotlin / 後端 Python 新手友善。" },
    { num: "05", color: C.purple, s: t5, start: t5Start, title: "框架 ≠ 語言",     body: "React Native / Flutter / Electron 都是框架，幫你搭基礎。" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[14]} accent={C.green} />
        <SceneWrap>
          <SectionHeader num="重點整理" title="本章五件事" startFrame={0} accent={C.green} />

          {/* Takeaway list */}
          {frame < finaleStart - 6 && (
            <div style={{ opacity: cardsFade, display: "flex", flexDirection: "column", gap: 12 * S, marginTop: 8 * S }}>
              {takeaways.map((tk) => frame >= tk.start - 6 && (
                <div key={tk.num} style={{ ...tk.s, display: "flex", alignItems: "flex-start", gap: 20 * S, background: C.surface, border: `1px solid ${hexGlow(tk.color, 0.22)}`, borderLeft: `4px solid ${hexGlow(tk.color, 0.6)}`, borderRadius: 16 * S, padding: `${18 * S}px ${24 * S}px` }}>
                  <span style={{ fontFamily: MONO, fontSize: 26 * S, fontWeight: 800, color: tk.color, background: hexGlow(tk.color, 0.1), border: `1px solid ${hexGlow(tk.color, 0.35)}`, borderRadius: 10 * S, padding: `${6 * S}px ${14 * S}px`, minWidth: 64 * S, textAlign: "center", flexShrink: 0 }}>{tk.num}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: TC, fontSize: 30 * S, fontWeight: 700, color: C.text, marginBottom: 6 * S }}>{tk.title}</div>
                    <div style={{ fontFamily: TC, fontSize: 24 * S, fontWeight: 500, color: C.muted, lineHeight: 1.55 }}>{tk.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Finale glow card — v2 鐵律：發光大卡 only for finale ✓ */}
          {frame >= finaleStart - 6 && (
            <div style={{ ...fin, marginTop: 30 * S }}>
              <div style={{ background: hexGlow(C.green, 0.08), border: `3px solid ${hexGlow(C.green, 0.5)}`, borderRadius: 32 * S, padding: `${56 * S}px ${60 * S}px`, boxShadow: `0 0 80px ${hexGlow(C.green, glow)}`, textAlign: "center" }}>
                <Disp style={{ fontSize: 24 * S, color: C.green, letterSpacing: "0.16em", marginBottom: 24 * S, display: "block" }}>SEE YOU NEXT</Disp>
                <div style={{ fontFamily: TC, fontSize: 62 * S, fontWeight: 900, lineHeight: 1.4, color: C.text, marginBottom: 22 * S }}>
                  <Disp style={{ color: C.green }}>下個單元見</Disp>
                </div>
                <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted, lineHeight: 1.6 }}>
                  下集會更深入聊 <span style={{ color: C.green }}>前端</span>、<span style={{ color: C.orange }}>後端</span>
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
// Root Composition — FullVideo11
// ═════════════════════════════════════════════════════════════════════════════
const SCENES: React.FC<{ callouts: Callout[] }>[] = [
  Scene01Hero,
  Scene11WhyKnowLangs,
  Scene21WebTrinity,
  Scene22ShoppingExample,
  Scene23JavaVsJS,
  Scene24TypeScript,
  Scene31FrontVsBack,
  Scene32ConcertExample,
  Scene33WebVsApp,
  Scene34NetworkOffTest,
  Scene41LangMap1,
  Scene42LangMap2,
  Scene43LangMap3,
  Scene44Impression,
  Scene51Finale,
];

export const FullVideo11: React.FC = () => {
  const S0 = SEG_STARTS_11;
  const getCallouts = (segStart: number, segEnd: number) =>
    GLOBAL_CALLOUTS.map(c => ({ ...c, from: c.from - segStart, to: c.to - segStart }))
      .filter(c => c.from >= -FADE_OUT_F && c.from < (segEnd - segStart));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/course_background_music.wav")} startFrom={0} volume={0.1} loop />
      {SEG_STARTS_11.map((start, i) => {
        const SceneCmp = SCENES[i];
        const nextStart = i + 1 < SEG_STARTS_11.length ? SEG_STARTS_11[i + 1] : TOTAL_FRAMES_11;
        return (
          <Sequence key={i} from={start} durationInFrames={SEG_DURATIONS[i]}>
            <Audio src={staticFile(`audio/2-4/2-4_${SEG_KEYS[i]}-normalized.wav`)} />
            <SceneCmp callouts={getCallouts(start, nextStart)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
