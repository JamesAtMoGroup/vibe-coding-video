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
// FullVideo12 — CH 2-5「前端、後端——網頁的外表與內在」
// v2 motion system（aischool 官網對齊；參考 FullVideo11）。
// 11 個音頻段落 ~11.2 分鐘；4K 30fps。
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
// Timing — 從 processed/2-5-cues.json
// ─────────────────────────────────────────────────────────────────────────────
export const SEG_STARTS_12 = [0, 705, 3109, 4623, 6756, 8669, 10931, 12354, 14037, 15457, 16969];
export const TOTAL_FRAMES_12 = 20220;
const SEG_DURATIONS = [705, 2404, 1514, 2133, 1913, 2262, 1423, 1683, 1420, 1512, 3251];
const SEG_KEYS = ["0.1", "1.1", "1.2", "2.1", "2.2", "3.1", "3.2", "3.3", "4.1", "4.2", "5.1"];

// Progress percentages (running through 11 segments)
const PROGRESS_PCT = [3, 15, 23, 33, 43, 54, 61, 70, 77, 84, 100];

// ─────────────────────────────────────────────────────────────────────────────
// Callouts（無寄件人 — identity protection）
// 11 個 + 1 個 outro
// ─────────────────────────────────────────────────────────────────────────────
type Callout = { from: number; to: number; text: string };
const CALLOUT_DURATION = 100;
const GLOBAL_CALLOUTS: Callout[] = [
  { from: 1800,  to: 1800 + CALLOUT_DURATION,  text: "網頁 = 迷你 App + 極輕量" },
  { from: 2500,  to: 2500 + CALLOUT_DURATION,  text: "同份程式跑各裝置" },
  { from: 3300,  to: 3300 + CALLOUT_DURATION,  text: "設計 ≠ 工程師" },
  { from: 4900,  to: 4900 + CALLOUT_DURATION,  text: "伺服器 = 永不下班的大腦" },
  { from: 6900,  to: 6900 + CALLOUT_DURATION,  text: "業務邏輯 = 規則" },
  { from: 7900,  to: 7900 + CALLOUT_DURATION,  text: "資料庫重點：找得快" },
  { from: 9000,  to: 9000 + CALLOUT_DURATION,  text: "請求 → 回應 = 來回流程" },
  { from: 12050, to: 12050 + CALLOUT_DURATION, text: "503 = 伺服器當機" },
  { from: 13750, to: 13750 + CALLOUT_DURATION, text: "Cache = 瀏覽器記得你來過" },
  { from: 14250, to: 14250 + CALLOUT_DURATION, text: "下載到手邊 = 可被修改" },
  { from: 15900, to: 15900 + CALLOUT_DURATION, text: "前端顯示 ≠ 真實成交價" },
  { from: 19650, to: 19650 + CALLOUT_DURATION, text: "下集主角：API 橋樑" },
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
  target: "M12 3a9 9 0 100 18 9 9 0 000-18z|M12 7a5 5 0 100 10 5 5 0 000-10z|M12 11a1 1 0 100 2 1 1 0 000-2z",
  brain: "M9 4a3 3 0 00-3 3v1a3 3 0 00-2 2.8v2.4A3 3 0 006 16v2a3 3 0 003 3h2V4z|M15 4a3 3 0 013 3v1a3 3 0 012 2.8v2.4A3 3 0 0118 16v2a3 3 0 01-3 3h-2V4z",
  bolt: "M13 3L4 14h6l-1 7 9-11h-6z",
  server: "M4 4h16v6H4z|M4 14h16v6H4z|M7 7h.01|M7 17h.01",
  "wifi-off": "M2 2l20 20|M5 12.5a9 9 0 0114-1|M8.5 16.5a5 5 0 016-1|M12 20h.01",
  file: "M7 3h7l4 4v14H7z|M14 3v4h4|M10 14h6|M10 18h6",
  building: "M6 3h12v18H6z|M9 7h.01|M13 7h.01|M9 11h.01|M13 11h.01|M9 15h.01|M13 15h.01|M10 21v-3h4v3",
  // Scene 2-5 specific icons
  palette: "M12 3a9 9 0 100 18c1.5 0 2-1 2-2 0-1-1-1-1-2 0-1 1-2 2-2h2a4 4 0 004-4 9 9 0 00-9-8z|M7 11a1 1 0 100-2 1 1 0 000 2z|M10 7a1 1 0 100-2 1 1 0 000 2z|M14 7a1 1 0 100-2 1 1 0 000 2z|M17 11a1 1 0 100-2 1 1 0 000 2z",
  code: "M9 8l-5 4 5 4|M15 8l5 4-5 4|M14 5l-4 14",
  database: "M5 6c0-1.5 3-3 7-3s7 1.5 7 3v12c0 1.5-3 3-7 3s-7-1.5-7-3z|M5 6c0 1.5 3 3 7 3s7-1.5 7-3|M5 12c0 1.5 3 3 7 3s7-1.5 7-3",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4",
  cloud: "M7 16a4 4 0 110-8 5 5 0 019.6 1.5A3.5 3.5 0 0117 16z",
  warning: "M12 3l10 18H2z|M12 10v5|M12 18v.01",
  "x-circle": "M12 3a9 9 0 100 18 9 9 0 000-18z|M9 9l6 6|M15 9l-6 6",
  loading: "M12 3a9 9 0 11-6.4 2.6|M12 3v4|M19 8l-3 2",
  image: "M4 5h16v14H4z|M4 16l4-4 4 4 4-4 4 4|M9 9a1 1 0 100-2 1 1 0 000 2z",
  "file-edit": "M7 3h7l4 4v8H7z|M14 3v4h4|M9 17l-2 4h4l2-4 6-6-2-2z",
  book: "M4 5a2 2 0 012-2h14v18H6a2 2 0 01-2-2z|M4 5v14|M9 7h7|M9 11h7",
  bookshelf: "M3 4h18v16H3z|M3 4v16|M7 4v16|M11 4v16|M15 4v16|M19 4v16|M3 12h18",
  send: "M3 12l18-8-7 18-4-7z|M10 14l4-4",
  receive: "M21 12l-18-8 7 18 4-7z|M14 10l-4 4",
  swap: "M4 8h14|M18 8l-4-4|M18 8l-4 4|M20 16H6|M6 16l4-4|M6 16l4 4",
  enter: "M9 11l4-4-4-4|M13 7H4v10",
  check: "M5 13l4 4L19 7",
  lock: "M6 11h12v10H6z|M9 11V7a3 3 0 016 0v4",
  hacker: "M6 8h12v8a4 4 0 01-4 4h-4a4 4 0 01-4-4z|M9 12v.01|M15 12v.01|M9 16h6|M8 8V6a4 4 0 014-4|M16 8V6",
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
        <span style={{ fontFamily: MONO, fontSize: 18 * S, color: C.faint, letterSpacing: "0.08em" }}>CH 2-5</span>
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
// Sub Kicker
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

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 0.1 — Hero
// global range 0–704 | dur 705 | SEG_START=0
// 中央構圖 + chapter badge + 大字「前端、後端」+ subtitle + connector
// + 3 個問題 stagger 跨整段填滿（防 CH 2-4 0.1 空白教訓）
// ═════════════════════════════════════════════════════════════════════════════
const Scene01Hero: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[0];

  const badge = useFadeUp(0);
  const title = useFadeUpHeader(30);
  const sub = useFadeUp(90);
  const conn = useFadeUp(200);
  const titleBreathe = useBreathe(70);

  // 3 個問題 stagger 從 F360 開始（VTT cue: 9.2s "前端和後端各自負責什麼" → 12.16s "在這個單元"）
  const q1 = useFadeUpElastic(360);    // "Web 前端怎麼運作？"
  const q2 = useFadeUpElastic(470);    // ~15.68s "Web 前端跟 Web 後端"
  const q3 = useFadeUpElastic(595);    // ~19.84s "怎麼彼此溝通"

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[0]} accent={C.green} />

        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: `${NAV_H + 40 * S}px ${80 * S}px ${SUBTITLE_H + 40 * S}px` }}>
          {/* Chapter Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 30 * S, ...badge }}>
            <span style={{ fontFamily: MONO, fontSize: 22 * S, color: C.green, border: `1px solid ${C.green}`, padding: `${6 * S}px ${18 * S}px`, borderRadius: 8 * S, letterSpacing: "0.06em", boxShadow: `0 0 12px ${hexGlow(C.green, 0.2)}` }}>CH 2-5</span>
            <span style={{ fontFamily: MONO, fontSize: 20 * S, color: C.muted, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, padding: `${6 * S}px ${16 * S}px`, borderRadius: 8 * S, letterSpacing: "0.04em" }}>網頁的外表與內在</span>
          </div>

          {/* Hero Title — 大字「前端、後端」中央 */}
          <div style={{ marginBottom: 24 * S, ...title, textAlign: "center" }}>
            <h1 style={{ fontFamily: TC, fontSize: 130 * S, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", color: C.text, margin: 0, display: "inline-block", transform: `scale(${1 + 0.008 * titleBreathe})`, textShadow: `0 0 ${30 + 20 * titleBreathe}px ${hexGlow(C.green, 0.18 + 0.10 * titleBreathe)}` }}>
              <Disp style={{ color: C.green }}>前端</Disp>
              <span style={{ color: C.faint, fontWeight: 400, margin: `0 ${16 * S}px` }}>、</span>
              <Disp style={{ color: C.orange }}>後端</Disp>
            </h1>
          </div>

          {/* Subtitle */}
          <p style={{ fontFamily: TC, fontSize: 36 * S, color: C.muted, lineHeight: 1.5, textAlign: "center", maxWidth: 1400 * S, marginBottom: 36 * S, ...sub }}>
            網頁的<Disp style={{ color: C.green }}>外表</Disp>與<Disp style={{ color: C.orange }}>內在</Disp>
          </p>

          {/* Connector from previous */}
          <div style={{ ...conn, display: "flex", alignItems: "center", gap: 14 * S, fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.10em", marginBottom: 50 * S, flexWrap: "wrap", justifyContent: "center", maxWidth: 1600 * S }}>
            <span style={{ display: "inline-block", width: 30 * S, height: 1, background: C.faint }} />
            上集 <span style={{ color: C.faint }}>→</span> <Disp style={{ color: C.green }}>程式語言</Disp>
            <span style={{ color: C.faint }}>→</span> <Disp style={{ color: C.green }}>御三家</Disp>
            <span style={{ color: C.faint }}>→</span> <Disp style={{ color: C.green }}>平台對應</Disp>
            <span style={{ color: C.faint }}>→</span> <Disp style={{ color: C.green }}>這集深入聊運作</Disp>
            <span style={{ display: "inline-block", width: 30 * S, height: 1, background: C.faint }} />
          </div>

          {/* 3 Questions stagger — 填滿 24s 不空白 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 * S, width: "100%", maxWidth: 1400 * S }}>
            {[
              { t: "Web 前端怎麼運作？", s: q1, accent: C.green },
              { t: "Web 後端怎麼運作？", s: q2, accent: C.orange },
              { t: "前後端怎麼溝通？",    s: q3, accent: C.purple },
            ].map(({ t, s, accent }) => (
              <div key={t} style={{ ...s, display: "flex", alignItems: "center", gap: 22 * S, background: C.surface, border: `1.5px solid ${hexGlow(accent, 0.32)}`, borderRadius: 18 * S, padding: `${22 * S}px ${36 * S}px` }}>
                <span style={{ fontFamily: MONO, fontSize: 24 * S, color: accent, fontWeight: 700, letterSpacing: "0.06em" }}>Q</span>
                <span style={{ width: 1, height: 36 * S, background: hexGlow(accent, 0.4) }} />
                <span style={{ fontFamily: TC, fontSize: 36 * S, color: C.text, fontWeight: 600 }}>{t}</span>
              </div>
            ))}
          </div>
        </AbsoluteFill>

        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 1.1 — Web 前端：下載到你手邊的迷你 App
// global range 705–3108 | dur 2404 | SEG_START=705
// overlays:
//   SectionHeader F0 | DownloadFlow F195→995 (4 steps)
//   AppMetaphor F1045→1595 | CrossDevice F1695→2215
// ═════════════════════════════════════════════════════════════════════════════
const Scene11FrontEndDownload: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[1];
  // global → local: subtract 705
  // visual-spec: DownloadFlow 900-1700 global → 195-995 local
  // AppMetaphor 1750-2300 global → 1045-1595 local
  // CrossDevice 2400-2920 global (clip @ 2-5 end ~3109) → 1695-end
  const flowStart = 195;
  const f1 = 195, f2 = 395, f3 = 595, f4 = 795;
  const appStart = 1045;
  const crossStart = 1695;

  const headerFade = useBlockFade(appStart - 30);
  const flowFade = useBlockFade(appStart - 30);
  const appFade = useBlockFade(crossStart - 30);

  const s1 = useFadeUpElastic(f1);
  const s2 = useFadeUpElastic(f2);
  const s3 = useFadeUpElastic(f3);
  const s4 = useFadeUpElastic(f4);
  const arrow1 = useDraw(f2 - 30, 30);
  const arrow2 = useDraw(f3 - 30, 30);
  const arrow3 = useDraw(f4 - 30, 30);
  const tagline = useFadeUp(f4 + 100);

  const appHeader = useFadeUpHeader(appStart);
  const appLeft = useFadeUpElastic(appStart + 30);
  const appRight = useFadeUpElastic(appStart + 130);

  const crossHeader = useFadeUpHeader(crossStart);
  const cd1 = useFadeUpElastic(crossStart + 40);
  const cd2 = useFadeUpElastic(crossStart + 100);
  const cd3 = useFadeUpElastic(crossStart + 160);
  const crossNote = useFadeUp(crossStart + 260);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[1]} accent={C.green} />
        <SceneWrap>
          <div style={{ opacity: headerFade }}>
            <SectionHeader num="01" title="Web 前端：下載到你手邊的迷你 App" startFrame={0} accent={C.green} />
          </div>

          {/* DownloadFlow 4 steps */}
          {frame < appStart - 6 && (
            <div style={{ opacity: flowFade, marginTop: 12 * S }}>
              <div style={{ display: "flex", alignItems: "stretch", gap: 12 * S, justifyContent: "center" }}>
                {[
                  { from: f1, s: s1, icon: "enter",    label: "輸入網址 + Enter" },
                  { from: f2, s: s2, icon: "server",   label: "伺服器" },
                  { from: f3, s: s3, icon: "download", label: "下載前端程式" },
                  { from: f4, s: s4, icon: "monitor",  label: "瀏覽器執行 → 畫面出現" },
                ].map(({ from, s, icon, label }, idx) =>
                  frame >= from - 6 && (
                    <React.Fragment key={label}>
                      <div style={{ ...s, flex: 1, minWidth: 280 * S, background: C.surface, border: `1.5px solid ${hexGlow(C.green, 0.32)}`, borderRadius: 18 * S, padding: `${22 * S}px ${16 * S}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S, textAlign: "center" }}>
                        <div style={{ fontFamily: MONO, fontSize: 18 * S, color: C.green, opacity: 0.7, letterSpacing: "0.1em" }}>STEP {idx + 1}</div>
                        <div style={{ width: 90 * S, height: 90 * S, borderRadius: 18 * S, background: hexGlow(C.green, 0.12), border: `2px solid ${hexGlow(C.green, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <LI name={icon} size={50 * S} color={C.green} />
                        </div>
                        <div style={{ fontFamily: TC, fontSize: 24 * S, color: C.text, fontWeight: 600, lineHeight: 1.4 }}>{label}</div>
                      </div>
                      {idx < 3 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 60 * S }}>
                          <svg width={60} height={40} viewBox="0 0 60 40" style={{ display: "block" }}>
                            <line x1="0" y1="20" x2="44" y2="20" stroke={C.green} strokeWidth={2.5} strokeOpacity={idx === 0 ? arrow1 : idx === 1 ? arrow2 : arrow3} />
                            <polygon points="44,12 60,20 44,28" fill={C.green} opacity={idx === 0 ? arrow1 : idx === 1 ? arrow2 : arrow3} />
                          </svg>
                        </div>
                      )}
                    </React.Fragment>
                  )
                )}
              </div>

              {/* Tagline */}
              <div style={{ ...tagline, marginTop: 30 * S, textAlign: "center", fontFamily: TC, fontSize: 30 * S, color: C.muted, lineHeight: 1.5 }}>
                整個流程 <Disp style={{ color: C.green }}>&lt; 3 秒</Disp> 完成
              </div>
            </div>
          )}

          {/* App Metaphor */}
          {frame >= appStart - 6 && frame < crossStart - 6 && (
            <div style={{ opacity: appFade, marginTop: 12 * S }}>
              <div style={{ ...appHeader, marginBottom: 24 * S }}>
                <Disp style={{ fontSize: 22 * S, color: C.muted, letterSpacing: "0.2em", display: "block", marginBottom: 10 * S }}>ANALOGY</Disp>
                <div style={{ fontFamily: TC, fontSize: 44 * S, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
                  邏輯跟<Disp style={{ color: C.green }}>下載 App</Disp> 一樣
                </div>
              </div>
              <div style={{ display: "flex", gap: 22 * S }}>
                <div style={{ ...appLeft, flex: 1, background: hexGlow(C.muted, 0.04), border: `2px solid ${C.border}`, borderRadius: 22 * S, padding: `${30 * S}px ${32 * S}px` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 18 * S }}>
                    <LI name="phone" size={56 * S} color={C.muted} />
                    <Disp style={{ fontFamily: SYNE, fontSize: 36 * S, color: C.muted }}>手機下載 App</Disp>
                  </div>
                  <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, lineHeight: 1.6 }}>
                    明顯有<span style={{ color: C.muted }}>「下載中」</span>的等待
                  </div>
                </div>
                <div style={{ ...appRight, flex: 1, background: hexGlow(C.green, 0.07), border: `2px solid ${hexGlow(C.green, 0.4)}`, borderRadius: 22 * S, padding: `${30 * S}px ${32 * S}px` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 18 * S }}>
                    <LI name="bolt" size={56 * S} color={C.green} />
                    <Disp style={{ fontFamily: SYNE, fontSize: 36 * S, color: C.green }}>瀏覽器開網頁</Disp>
                  </div>
                  <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, lineHeight: 1.6 }}>
                    <span style={{ color: C.green }}>極輕量</span> → 你感覺不到它在下載
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cross-device */}
          {frame >= crossStart - 6 && (
            <div style={{ marginTop: 12 * S }}>
              <div style={{ ...crossHeader, marginBottom: 26 * S }}>
                <Disp style={{ fontSize: 22 * S, color: C.green, letterSpacing: "0.2em", display: "block", marginBottom: 10 * S }}>CROSS-DEVICE</Disp>
                <div style={{ fontFamily: TC, fontSize: 44 * S, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
                  天生<Disp style={{ color: C.green }}>跨裝置</Disp>
                </div>
              </div>
              <div style={{ display: "flex", gap: 18 * S, justifyContent: "center" }}>
                {[
                  { s: cd1, emoji: "💻", label: "電腦瀏覽器" },
                  { s: cd2, emoji: "📱", label: "手機瀏覽器" },
                  { s: cd3, emoji: "📲", label: "平板" },
                ].map(({ s, emoji, label }) => (
                  <div key={label} style={{ ...s, flex: 1, background: C.surface, border: `1.5px solid ${hexGlow(C.green, 0.32)}`, borderRadius: 20 * S, padding: `${28 * S}px ${20 * S}px`, textAlign: "center" }}>
                    <div style={{ fontSize: 80 * S, lineHeight: 1, marginBottom: 16 * S }}>{emoji}</div>
                    <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, fontWeight: 600 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...crossNote, marginTop: 28 * S, fontFamily: TC, fontSize: 28 * S, color: C.muted, lineHeight: 1.6, paddingLeft: 18 * S, borderLeft: `3px solid ${hexGlow(C.green, 0.5)}` }}>
                同份前端程式 → <span style={{ color: C.green }}>不用為 iOS / Android 各寫一套</span>
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
// SCENE 1.2 — 誰負責設計？UI 設計師 vs 前端工程師
// global range 3109–4622 | dur 1514 | SEG_START=3109
// overlays:
//   SubKicker F0 | RoleSplit F141→991 + handoff @ F591
//   NoteBlock F1041→end
// ═════════════════════════════════════════════════════════════════════════════
const Scene12UIDesigner: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[2];
  // global - 3109
  const roleStart = 141;     // F3250
  const handoffStart = 591;  // F3700
  const noteStart = 1041;    // F4150

  const roleFade = useBlockFade(noteStart - 30);
  const left = useFadeUpElastic(roleStart);
  const right = useFadeUpElastic(roleStart + 100);
  const handoff = useFadeUpHeader(handoffStart);
  const handoffArrow = useDraw(handoffStart + 20, 30);
  const note = useFadeUpElastic(noteStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.purple} />
        <ProgressBar progressPct={PROGRESS_PCT[2]} accent={C.purple} />
        <SceneWrap>
          <SubKicker text="誰負責設計？" startFrame={0} accent={C.purple} />

          {/* Role split */}
          {frame < noteStart - 6 && (
            <div style={{ opacity: roleFade, marginTop: 14 * S }}>
              <div style={{ display: "flex", gap: 22 * S, alignItems: "stretch" }}>
                <div style={{ ...left, flex: 1, background: hexGlow(C.purple, 0.07), border: `2px solid ${hexGlow(C.purple, 0.4)}`, borderRadius: 22 * S, padding: `${28 * S}px ${30 * S}px` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 * S, marginBottom: 18 * S }}>
                    <div style={{ width: 88 * S, height: 88 * S, borderRadius: 18 * S, background: hexGlow(C.purple, 0.12), border: `2px solid ${hexGlow(C.purple, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <LI name="palette" size={50 * S} color={C.purple} />
                    </div>
                    <div>
                      <Disp style={{ fontFamily: SYNE, fontSize: 40 * S, color: C.purple, display: "block" }}>UI 設計師</Disp>
                      <div style={{ fontFamily: MONO, fontSize: 20 * S, color: C.muted, marginTop: 4 * S, letterSpacing: "0.06em" }}>介面設計師</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
                    {["畫面排版 / 配色", "按鈕形狀", "圖示風格"].map(t => (
                      <div key={t} style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
                        <span style={{ width: 8 * S, height: 8 * S, borderRadius: 99, background: C.purple, flexShrink: 0 }} />
                        <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.text }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ ...right, flex: 1, background: hexGlow(C.green, 0.07), border: `2px solid ${hexGlow(C.green, 0.4)}`, borderRadius: 22 * S, padding: `${28 * S}px ${30 * S}px` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 * S, marginBottom: 18 * S }}>
                    <div style={{ width: 88 * S, height: 88 * S, borderRadius: 18 * S, background: hexGlow(C.green, 0.12), border: `2px solid ${hexGlow(C.green, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <LI name="code" size={50 * S} color={C.green} />
                    </div>
                    <div>
                      <Disp style={{ fontFamily: SYNE, fontSize: 40 * S, color: C.green, display: "block" }}>前端工程師</Disp>
                      <div style={{ fontFamily: MONO, fontSize: 20 * S, color: C.muted, marginTop: 4 * S, letterSpacing: "0.06em" }}>Front-end Engineer</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
                    {["把設計「寫成程式」", "讓它跑起來"].map(t => (
                      <div key={t} style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
                        <span style={{ width: 8 * S, height: 8 * S, borderRadius: 99, background: C.green, flexShrink: 0 }} />
                        <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.text }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Handoff arrow */}
              {frame >= handoffStart - 6 && (
                <div style={{ ...handoff, marginTop: 30 * S, display: "flex", alignItems: "center", justifyContent: "center", gap: 18 * S }}>
                  <Disp style={{ fontFamily: SYNE, fontSize: 32 * S, color: C.purple }}>設計稿</Disp>
                  <svg width={260 * S} height={50 * S} viewBox="0 0 260 50" style={{ display: "block" }}>
                    <line x1="10" y1="25" x2={10 + 220 * handoffArrow} y2="25" stroke={C.purple} strokeWidth={3} strokeLinecap="round" strokeDasharray="6 6" />
                    {handoffArrow > 0.9 && <polygon points="230,18 250,25 230,32" fill={C.purple} />}
                  </svg>
                  <span style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted }}>交付</span>
                  <svg width={50 * S} height={50 * S} viewBox="0 0 50 50">
                    <polygon points="10,18 35,25 10,32" fill={C.green} />
                  </svg>
                  <Disp style={{ fontFamily: SYNE, fontSize: 32 * S, color: C.green }}>工程師</Disp>
                </div>
              )}
            </div>
          )}

          {/* Note block */}
          {frame >= noteStart - 6 && (
            <div style={{ ...note, marginTop: 30 * S, background: hexGlow(C.purple, 0.07), border: `1.5px solid ${hexGlow(C.purple, 0.32)}`, borderRadius: 22 * S, padding: `${32 * S}px ${40 * S}px`, textAlign: "center" }}>
              <Disp style={{ fontSize: 22 * S, color: C.purple, letterSpacing: "0.2em", display: "block", marginBottom: 18 * S }}>EXCEPTION</Disp>
              <div style={{ fontFamily: TC, fontSize: 42 * S, fontWeight: 700, color: C.text, lineHeight: 1.5 }}>
                有些<Disp style={{ color: C.purple }}>大神</Disp>身兼多職：<br />
                <span style={{ color: C.muted, fontSize: 36 * S, fontWeight: 500 }}>設計 + 前端 + 後端全包</span>
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
// SCENE 2.1 — Web 後端：幕後的 24 小時大腦
// global range 4623–6755 | dur 2133 | SEG_START=4623
// overlays:
//   SectionHeader F0 | ServerHero F177→ | ClientsToServer F677→1677 (中央 server + 4 衛星)
//   NetworkOffRecap F1727→end
// ═════════════════════════════════════════════════════════════════════════════
const Scene21BackEndServer: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[3];
  // global - 4623
  const serverStart = 177;     // F4800
  const clientsStart = 677;    // F5300
  const recapStart = 1727;     // F6350

  const headerFade = useBlockFade(clientsStart - 30);
  const serverFade = useBlockFade(clientsStart - 30);
  const clientsFade = useBlockFade(recapStart - 30);

  const serverHero = useFadeUpElastic(serverStart);
  const serverBreathe = useBreathe(70);

  const cHeader = useFadeUpHeader(clientsStart);
  const cServer = useFadeUpElastic(clientsStart + 30);
  const c1 = useFadeUpElastic(clientsStart + 80);
  const c2 = useFadeUpElastic(clientsStart + 140);
  const c3 = useFadeUpElastic(clientsStart + 200);
  const c4 = useFadeUpElastic(clientsStart + 260);
  const arrows = useDraw(clientsStart + 320, 40);
  const arrowOffset = (frame * 0.3) % 12;

  const recap = useFadeUpElastic(recapStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.orange} />
        <ProgressBar progressPct={PROGRESS_PCT[3]} accent={C.orange} />
        <SceneWrap>
          <div style={{ opacity: headerFade }}>
            <SectionHeader num="02" title="Web 後端：幕後的 24 小時大腦" startFrame={0} accent={C.orange} />
          </div>

          {/* Server Hero card */}
          {frame < clientsStart - 6 && (
            <div style={{ opacity: serverFade, marginTop: 30 * S, textAlign: "center" }}>
              <div style={{ ...serverHero, display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 24 * S }}>
                <div style={{ width: 220 * S, height: 220 * S, borderRadius: 36 * S, background: hexGlow(C.orange, 0.1), border: `3px solid ${hexGlow(C.orange, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 ${40 + 40 * serverBreathe}px ${hexGlow(C.orange, 0.25)}`, transform: `scale(${1 + 0.02 * serverBreathe})` }}>
                  <LI name="server" size={140 * S} color={C.orange} sw={2} />
                </div>
                <Disp style={{ fontFamily: SYNE, fontSize: 24 * S, color: C.orange, letterSpacing: "0.18em" }}>24/7 ALWAYS-ON</Disp>
                <div style={{ fontFamily: TC, fontSize: 56 * S, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>
                  資料中心 <Disp style={{ color: C.orange }}>24 小時</Disp>不關機的電腦
                </div>
                <div style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted, lineHeight: 1.5, maxWidth: 1300 * S }}>
                  你看不到，但每次點擊都在跟它<span style={{ color: C.orange }}>溝通</span>
                </div>
              </div>
            </div>
          )}

          {/* ClientsToServer — 中央 server + 4 client 衛星 */}
          {frame >= clientsStart - 6 && frame < recapStart - 6 && (
            <div style={{ opacity: clientsFade, marginTop: 6 * S }}>
              <div style={{ ...cHeader, marginBottom: 20 * S, textAlign: "center" }}>
                <Disp style={{ fontSize: 22 * S, color: C.orange, letterSpacing: "0.2em", display: "block", marginBottom: 12 * S }}>UNIFIED RECEIVE</Disp>
                <div style={{ fontFamily: TC, fontSize: 40 * S, fontWeight: 700, color: C.text }}>
                  統一接收<Disp style={{ color: C.orange }}>所有客戶端</Disp>
                </div>
              </div>

              <div style={{ position: "relative", width: "100%", height: 760 * S, marginTop: 12 * S }}>
                {/* SVG marching dashes (centered) */}
                <svg width={CONTAINER_W} height={760 * S} viewBox={`0 0 ${CONTAINER_W} ${760 * S}`} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
                  {[
                    { x: 320 * S, y: 150 * S },   // top-left
                    { x: (CONTAINER_W - 320 * S), y: 150 * S },  // top-right
                    { x: 320 * S, y: 600 * S },   // bot-left
                    { x: (CONTAINER_W - 320 * S), y: 600 * S },  // bot-right
                  ].map(({ x, y }, i) => (
                    <line key={i}
                      x1={x} y1={y}
                      x2={CONTAINER_W / 2} y2={380 * S}
                      stroke={C.orange} strokeWidth={3} strokeOpacity={0.5 * arrows}
                      strokeDasharray="14 10" strokeDashoffset={-arrowOffset * 4}
                      strokeLinecap="round"
                    />
                  ))}
                </svg>

                {/* Center server */}
                <div style={{ position: "absolute", top: 280 * S, left: "50%", marginLeft: -120 * S, ...cServer }}>
                  <div style={{ width: 240 * S, height: 200 * S, borderRadius: 24 * S, background: hexGlow(C.orange, 0.12), border: `2.5px solid ${hexGlow(C.orange, 0.6)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 * S, boxShadow: `0 0 40px ${hexGlow(C.orange, 0.3)}` }}>
                    <LI name="server" size={80 * S} color={C.orange} sw={2} />
                    <Disp style={{ fontFamily: SYNE, fontSize: 26 * S, color: C.orange, letterSpacing: "0.04em" }}>後端伺服器</Disp>
                  </div>
                </div>

                {/* 4 satellite clients */}
                {[
                  { s: c1, top: 30, left: 0,                emoji: "💻", label: "電腦瀏覽器" },
                  { s: c2, top: 30, left: CONTAINER_W - 600 * S, emoji: "📱", label: "手機瀏覽器" },
                  { s: c3, top: 480, left: 0,               emoji: "🍎", label: "iOS App" },
                  { s: c4, top: 480, left: CONTAINER_W - 600 * S, emoji: "🤖", label: "Android App" },
                ].map(({ s, top, left, emoji, label }) => (
                  <div key={label} style={{ position: "absolute", top: top * S, left, width: 600 * S, ...s }}>
                    <div style={{ background: C.surface, border: `1.5px solid ${hexGlow(C.orange, 0.35)}`, borderRadius: 18 * S, padding: `${20 * S}px ${24 * S}px`, display: "flex", alignItems: "center", gap: 18 * S }}>
                      <div style={{ fontSize: 60 * S, lineHeight: 1 }}>{emoji}</div>
                      <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, fontWeight: 600 }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NetworkOff recap */}
          {frame >= recapStart - 6 && (
            <div style={{ ...recap, marginTop: 30 * S, background: hexGlow(C.muted, 0.06), border: `1px solid ${C.border}`, borderRadius: 22 * S, padding: `${28 * S}px ${36 * S}px`, display: "flex", alignItems: "center", gap: 28 * S }}>
              <div style={{ width: 110 * S, height: 110 * S, borderRadius: 22 * S, background: hexGlow(C.muted, 0.08), border: `1.5px solid ${hexGlow(C.muted, 0.4)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <LI name="wifi-off" size={60 * S} color={C.muted} sw={2} />
              </div>
              <div style={{ flex: 1 }}>
                <Disp style={{ fontFamily: SYNE, fontSize: 22 * S, color: C.muted, letterSpacing: "0.18em", display: "block", marginBottom: 10 * S }}>RECAP · 上集判斷法</Disp>
                <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, lineHeight: 1.6 }}>
                  把網路<span style={{ color: C.muted }}>關掉</span> → 社群動態 / 訂單 / 訂票都不能 → 都靠<Disp style={{ color: C.orange }}>後端</Disp>
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
// SCENE 2.2 — 後端的兩大任務（業務邏輯 + 資料庫 + 書架類比）
// global range 6756–8668 | dur 1913 | SEG_START=6756
// overlays:
//   SubKicker F0 | TwoTasks F144→944 | BookshelfAnalogy F1044→1848
// ═════════════════════════════════════════════════════════════════════════════
const Scene22BackEndTasks: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[4];
  // global - 6756
  const tasksStart = 144;    // F6900
  const bookStart = 1044;    // F7800

  const tasksFade = useBlockFade(bookStart - 30);
  const left = useFadeUpElastic(tasksStart);
  const right = useFadeUpElastic(tasksStart + 100);

  const bookHeader = useFadeUpHeader(bookStart);
  const bookLeft = useFadeUpElastic(bookStart + 30);
  const bookRight = useFadeUpElastic(bookStart + 130);
  const bookPunch = useFadeUp(bookStart + 260);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.orange} />
        <ProgressBar progressPct={PROGRESS_PCT[4]} accent={C.orange} />
        <SceneWrap>
          <SubKicker text="後端的兩大任務" startFrame={0} accent={C.orange} />

          {/* TwoTasks */}
          {frame < bookStart - 6 && (
            <div style={{ opacity: tasksFade, marginTop: 12 * S }}>
              <div style={{ display: "flex", gap: 22 * S, alignItems: "stretch" }}>
                {/* Left: 業務邏輯 */}
                <div style={{ ...left, flex: 1, background: hexGlow(C.purple, 0.07), border: `2px solid ${hexGlow(C.purple, 0.4)}`, borderRadius: 22 * S, padding: `${30 * S}px ${32 * S}px` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 * S, marginBottom: 22 * S }}>
                    <div style={{ width: 76 * S, height: 76 * S, borderRadius: 14 * S, background: hexGlow(C.purple, 0.15), border: `2px solid ${hexGlow(C.purple, 0.6)}`, color: C.purple, fontFamily: MONO, fontSize: 36 * S, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>1</div>
                    <div>
                      <Disp style={{ fontFamily: SYNE, fontSize: 40 * S, color: C.purple, display: "block" }}>業務邏輯</Disp>
                      <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, marginTop: 4 * S, letterSpacing: "0.06em" }}>Business Logic</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, fontWeight: 700, marginBottom: 16 * S }}>
                    = <Disp style={{ color: C.purple }}>規則</Disp>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 * S, marginBottom: 18 * S }}>
                    {["票賣出沒？", "帳號真實登入？", "權限判斷"].map(t => (
                      <div key={t} style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
                        <span style={{ width: 8 * S, height: 8 * S, borderRadius: 99, background: C.purple, flexShrink: 0 }} />
                        <span style={{ fontFamily: TC, fontSize: 24 * S, color: C.text }}>{t}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10 * S, flexWrap: "wrap" }}>
                    {["PHP", "Python"].map(l => (
                      <Pill key={l} label={l} color={C.purple} style={{ fontSize: 22 * S, padding: `${8 * S}px ${20 * S}px` }} />
                    ))}
                  </div>
                </div>

                {/* Right: 資料庫 */}
                <div style={{ ...right, flex: 1, background: hexGlow(C.yellow, 0.07), border: `2px solid ${hexGlow(C.yellow, 0.4)}`, borderRadius: 22 * S, padding: `${30 * S}px ${32 * S}px` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 * S, marginBottom: 22 * S }}>
                    <div style={{ width: 76 * S, height: 76 * S, borderRadius: 14 * S, background: hexGlow(C.yellow, 0.15), border: `2px solid ${hexGlow(C.yellow, 0.6)}`, color: C.yellow, fontFamily: MONO, fontSize: 36 * S, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>2</div>
                    <div>
                      <Disp style={{ fontFamily: SYNE, fontSize: 40 * S, color: C.yellow, display: "block" }}>資料庫</Disp>
                      <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, marginTop: 4 * S, letterSpacing: "0.06em" }}>Database</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, fontWeight: 700, marginBottom: 16 * S, lineHeight: 1.4 }}>
                    重點不是<span style={{ color: C.muted }}>存</span>，是<Disp style={{ color: C.yellow }}>「快速找到」</Disp>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
                    {["有系統的儲存", "可被秒級定位"].map(t => (
                      <div key={t} style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
                        <span style={{ width: 8 * S, height: 8 * S, borderRadius: 99, background: C.yellow, flexShrink: 0 }} />
                        <span style={{ fontFamily: TC, fontSize: 24 * S, color: C.text }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BookshelfAnalogy */}
          {frame >= bookStart - 6 && (
            <div style={{ marginTop: 12 * S }}>
              <div style={{ ...bookHeader, marginBottom: 20 * S }}>
                <Disp style={{ fontSize: 22 * S, color: C.yellow, letterSpacing: "0.2em", display: "block", marginBottom: 10 * S }}>ANALOGY</Disp>
                <div style={{ fontFamily: TC, fontSize: 40 * S, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
                  舉例：找一本書
                </div>
              </div>
              <div style={{ display: "flex", gap: 22 * S, marginBottom: 24 * S }}>
                <div style={{ ...bookLeft, flex: 1, background: hexGlow(C.red, 0.07), border: `2px solid ${hexGlow(C.red, 0.4)}`, borderRadius: 22 * S, padding: `${28 * S}px ${30 * S}px` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 16 * S }}>
                    <LI name="book" size={50 * S} color={C.red} />
                    <Disp style={{ fontFamily: SYNE, fontSize: 34 * S, color: C.red }}>書全堆地上</Disp>
                  </div>
                  <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, lineHeight: 1.6 }}>
                    只能<span style={{ color: C.red }}>一本一本翻</span>
                  </div>
                </div>
                <div style={{ ...bookRight, flex: 1, background: hexGlow(C.yellow, 0.07), border: `2px solid ${hexGlow(C.yellow, 0.4)}`, borderRadius: 22 * S, padding: `${28 * S}px ${30 * S}px` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 16 * S }}>
                    <LI name="bookshelf" size={50 * S} color={C.yellow} />
                    <Disp style={{ fontFamily: SYNE, fontSize: 34 * S, color: C.yellow }}>按分類編號上書架</Disp>
                  </div>
                  <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, lineHeight: 1.6 }}>
                    <span style={{ color: C.yellow }}>直接定位</span>、秒找到
                  </div>
                </div>
              </div>

              {/* Punchline */}
              <div style={{ ...bookPunch, paddingLeft: 22 * S, borderLeft: `4px solid ${C.yellow}`, fontFamily: TC, fontSize: 30 * S, color: C.text, lineHeight: 1.6, fontWeight: 600 }}>
                資料庫 = 用<Disp style={{ color: C.yellow }}>電腦科學</Disp>讓資料永遠在「可被快速找到」的狀態
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
// SCENE 3.1 — 前後端如何溝通？Gmail 例子
// global range 8669–10930 | dur 2262 | SEG_START=8669
// overlays:
//   SectionHeader F0 | RequestResponse F181→ | GmailDemo F731→2131 (6 steps)
// ═════════════════════════════════════════════════════════════════════════════
const Scene31GmailRequest: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[5];
  // global - 8669
  const rrStart = 181;       // F8850
  const gmailStart = 731;    // F9400
  const steps = [
    { from: 731,  step: 1, actor: "前端", msg: "我要 Gmail 這個頁面",       accent: "green" },
    { from: 1031, step: 2, actor: "後端", msg: "回傳前端程式",                accent: "orange" },
    { from: 1331, step: 3, actor: "前端", msg: "瀏覽器下載 + 執行 → 畫面出現", accent: "green" },
    { from: 1631, step: 4, actor: "前端", msg: "點開一封信",                   accent: "green" },
    { from: 1831, step: 5, actor: "後端", msg: "驗權限 → 回信件內容",         accent: "orange" },
    { from: 2031, step: 6, actor: "前端", msg: "顯示信件",                     accent: "green" },
  ];

  const headerFade = useBlockFade(gmailStart - 30);
  const rrFade = useBlockFade(gmailStart - 30);

  const rrLeft = useFadeUpElastic(rrStart);
  const rrRight = useFadeUpElastic(rrStart + 60);
  const rrTagline = useFadeUp(rrStart + 200);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[5]} accent={C.green} />
        <SceneWrap>
          <div style={{ opacity: headerFade }}>
            <SectionHeader num="03" title="前後端如何溝通？" startFrame={0} accent={C.green} />
          </div>

          {/* Request Response big visual */}
          {frame < gmailStart - 6 && (
            <div style={{ opacity: rrFade, marginTop: 18 * S }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 26 * S }}>
                <div style={{ ...rrLeft, flex: 1, background: hexGlow(C.green, 0.08), border: `2.5px solid ${hexGlow(C.green, 0.5)}`, borderRadius: 26 * S, padding: `${32 * S}px ${30 * S}px`, textAlign: "center" }}>
                  <Disp style={{ fontFamily: SYNE, fontSize: 26 * S, color: C.green, letterSpacing: "0.16em", display: "block", marginBottom: 12 * S }}>FRONT-END</Disp>
                  <div style={{ fontFamily: TC, fontSize: 48 * S, fontWeight: 800, color: C.text, marginBottom: 14 * S }}>前端</div>
                  <div style={{ fontFamily: TC, fontSize: 30 * S, color: C.green, fontWeight: 700 }}>請求 Request →</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
                  <LI name="swap" size={70 * S} color={C.text} sw={2} />
                </div>
                <div style={{ ...rrRight, flex: 1, background: hexGlow(C.orange, 0.08), border: `2.5px solid ${hexGlow(C.orange, 0.5)}`, borderRadius: 26 * S, padding: `${32 * S}px ${30 * S}px`, textAlign: "center" }}>
                  <Disp style={{ fontFamily: SYNE, fontSize: 26 * S, color: C.orange, letterSpacing: "0.16em", display: "block", marginBottom: 12 * S }}>BACK-END</Disp>
                  <div style={{ fontFamily: TC, fontSize: 48 * S, fontWeight: 800, color: C.text, marginBottom: 14 * S }}>後端</div>
                  <div style={{ fontFamily: TC, fontSize: 30 * S, color: C.orange, fontWeight: 700 }}>← 回應 Response</div>
                </div>
              </div>

              <div style={{ ...rrTagline, marginTop: 36 * S, paddingLeft: 22 * S, borderLeft: `3px solid ${C.green}`, fontFamily: TC, fontSize: 30 * S, color: C.text, lineHeight: 1.6 }}>
                前端發出<span style={{ color: C.green }}>需求</span> → 後端<span style={{ color: C.orange }}>處理</span> → 回傳結果 → 前端呈現
              </div>
            </div>
          )}

          {/* Gmail Demo — 6-step timeline */}
          {frame >= gmailStart - 6 && (
            <div style={{ marginTop: 14 * S }}>
              <SubKicker text="範例：打開 Gmail" startFrame={gmailStart} accent={C.green} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
                {steps.map((st) => {
                  const isFront = st.accent === "green";
                  const color = isFront ? C.green : C.orange;
                  return frame >= st.from - 6 && (
                    <GmailStepRow key={st.step} step={st.step} actor={st.actor} msg={st.msg} color={color} startFrame={st.from} isFront={isFront} />
                  );
                })}
              </div>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

const GmailStepRow: React.FC<{ step: number; actor: string; msg: string; color: string; startFrame: number; isFront: boolean }> = ({ step, actor, msg, color, startFrame, isFront }) => {
  const s = useFadeUpItem(startFrame);
  return (
    <div style={{ ...s, display: "flex", alignItems: "center", gap: 18 * S, background: hexGlow(color, 0.05), border: `1px solid ${hexGlow(color, 0.3)}`, borderLeft: `4px solid ${color}`, borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px` }}>
      <span style={{ fontFamily: MONO, fontSize: 22 * S, fontWeight: 800, color, background: hexGlow(color, 0.12), border: `1px solid ${hexGlow(color, 0.35)}`, borderRadius: 8 * S, padding: `${4 * S}px ${10 * S}px`, minWidth: 50 * S, textAlign: "center", flexShrink: 0 }}>0{step}</span>
      <span style={{ fontFamily: TC, fontSize: 24 * S, fontWeight: 700, color, minWidth: 76 * S }}>{actor}</span>
      <span style={{ color: C.muted, fontFamily: MONO, fontSize: 22 * S, flexShrink: 0 }}>{isFront ? "→" : "←"}</span>
      <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.text, flex: 1 }}>{msg}</span>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 3.2 — 如果後端出問題？(3 錯誤情境 + 503 + punchline)
// global range 10931–12353 | dur 1423 | SEG_START=10931
// overlays:
//   SubKicker F0 | ErrorScenarios F169→1069 | ErrorCode F1119 | Punchline F1269→end
// ═════════════════════════════════════════════════════════════════════════════
const Scene32ServerError: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[6];
  // global - 10931
  const e1Start = 169;    // F11100
  const e2Start = 469;    // F11400
  const e3Start = 769;    // F11700
  const codeStart = 1119; // F12050
  const punchStart = 1269; // F12200

  const errFade = useBlockFade(codeStart - 30);
  const codeFade = useBlockFade(punchStart - 30);

  const e1 = useFadeUpElastic(e1Start);
  const e2 = useFadeUpElastic(e2Start);
  const e3 = useFadeUpElastic(e3Start);

  const code = useFadeUpElastic(codeStart);
  const codeBreathe = useBreathe(50);

  const punch = useFadeUpHeader(punchStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.red} />
        <ProgressBar progressPct={PROGRESS_PCT[6]} accent={C.red} />
        <SceneWrap>
          <SubKicker text="如果後端出問題？" startFrame={0} accent={C.red} />

          {/* Error scenarios */}
          {frame < codeStart - 6 && (
            <div style={{ opacity: errFade, marginTop: 12 * S, display: "flex", flexDirection: "column", gap: 14 * S }}>
              {[
                { from: e1Start, s: e1, icon: "loading", label: "信件一直轉圈載入不出來" },
                { from: e2Start, s: e2, icon: "warning", label: "點開信顯示「無法取得內容」" },
                { from: e3Start, s: e3, icon: "x-circle", label: "整個收件匣是空的" },
              ].map(({ from, s, icon, label }) => frame >= from - 6 && (
                <div key={label} style={{ ...s, display: "flex", alignItems: "center", gap: 22 * S, background: C.surface, border: `1.5px solid ${hexGlow(C.red, 0.32)}`, borderLeft: `4px solid ${C.red}`, borderRadius: 16 * S, padding: `${22 * S}px ${30 * S}px` }}>
                  <div style={{ width: 80 * S, height: 80 * S, borderRadius: 16 * S, background: hexGlow(C.red, 0.12), border: `1.5px solid ${hexGlow(C.red, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <LI name={icon} size={46 * S} color={C.red} />
                  </div>
                  <span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, fontWeight: 600 }}>{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Error code card */}
          {frame >= codeStart - 6 && frame < punchStart - 6 && (
            <div style={{ opacity: codeFade, marginTop: 18 * S, textAlign: "center" }}>
              <div style={{ ...code, display: "inline-block", background: hexGlow(C.red, 0.1), border: `3px solid ${hexGlow(C.red, 0.55)}`, borderRadius: 28 * S, padding: `${50 * S}px ${80 * S}px`, boxShadow: `0 0 ${30 + 30 * codeBreathe}px ${hexGlow(C.red, 0.3)}` }}>
                <Disp style={{ fontFamily: SYNE, fontSize: 26 * S, color: C.red, letterSpacing: "0.2em", display: "block", marginBottom: 16 * S }}>ERROR</Disp>
                <div style={{ fontFamily: MONO, fontSize: 96 * S, fontWeight: 800, color: C.red, lineHeight: 1.1, letterSpacing: "0.04em" }}>503</div>
                <div style={{ fontFamily: TC, fontSize: 36 * S, color: C.text, fontWeight: 700, marginTop: 14 * S }}>Server Error</div>
                <div style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted, marginTop: 18 * S, lineHeight: 1.5 }}>
                  或更常見：「網頁卡住了」「壞掉了」
                </div>
              </div>
            </div>
          )}

          {/* Punchline */}
          {frame >= punchStart - 6 && (
            <div style={{ ...punch, marginTop: 60 * S, paddingLeft: 22 * S, borderLeft: `4px solid ${C.red}` }}>
              <Disp style={{ fontSize: 22 * S, color: C.red, letterSpacing: "0.2em", display: "block", marginBottom: 14 * S }}>PUNCHLINE</Disp>
              <div style={{ fontFamily: TC, fontSize: 46 * S, fontWeight: 800, color: C.text, lineHeight: 1.4 }}>
                <Disp style={{ color: C.green }}>前端</Disp> = 看得到；<Disp style={{ color: C.orange }}>後端</Disp> = 讓畫面能正常運作的前提
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
// SCENE 3.3 — 加速小撇步：快取 Cache
// global range 12354–14036 | dur 1683 | SEG_START=12354
// overlays:
//   SubKicker F0 | Question F146→446 | CacheComparison F496→1346 | CacheDef F1396→end
// ═════════════════════════════════════════════════════════════════════════════
const Scene33Cache: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[7];
  // global - 12354
  const qStart = 146;     // F12500
  const cmpStart = 496;   // F12850
  const defStart = 1396;  // F13750

  const qFade = useBlockFade(cmpStart - 30);
  const cmpFade = useBlockFade(defStart - 30);

  const q = useFadeUpElastic(qStart);

  const cmpHeader = useFadeUpHeader(cmpStart);
  const cmpLeft = useFadeUpElastic(cmpStart + 30);
  const cmpRight = useFadeUpElastic(cmpStart + 130);
  const res1 = useFadeUpItem(cmpStart + 220);
  const res2 = useFadeUpItem(cmpStart + 280);
  const res3 = useFadeUpItem(cmpStart + 340);

  const def = useFadeUpElastic(defStart);
  const defLine = useAccentLine(defStart + 18);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.yellow} />
        <ProgressBar progressPct={PROGRESS_PCT[7]} accent={C.yellow} />
        <SceneWrap>
          <SubKicker text="加速小撇步" startFrame={0} accent={C.yellow} />

          {/* Question */}
          {frame < cmpStart - 6 && (
            <div style={{ opacity: qFade, paddingTop: 60 * S, textAlign: "center" }}>
              <Disp style={{ fontSize: 22 * S, color: C.muted, letterSpacing: "0.2em", display: "block", marginBottom: 26 * S }}>QUESTION</Disp>
              {frame >= qStart - 6 && (
                <div style={{ ...q, fontFamily: TC, fontSize: 60 * S, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
                  為什麼有些<Disp style={{ color: C.yellow }}>常去的網站</Disp>，<br />
                  打開特別快？
                </div>
              )}
            </div>
          )}

          {/* Cache Comparison */}
          {frame >= cmpStart - 6 && frame < defStart - 6 && (
            <div style={{ opacity: cmpFade, marginTop: 14 * S }}>
              <div style={{ ...cmpHeader, fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 24 * S }}>
                首次造訪 vs 再次造訪
              </div>
              <div style={{ display: "flex", gap: 22 * S, marginBottom: 24 * S }}>
                <div style={{ ...cmpLeft, flex: 1, background: hexGlow(C.muted, 0.04), border: `2px solid ${C.border}`, borderRadius: 22 * S, padding: `${28 * S}px ${30 * S}px` }}>
                  <Disp style={{ fontFamily: SYNE, fontSize: 34 * S, color: C.muted, letterSpacing: "0.02em", display: "block", marginBottom: 16 * S }}>首次造訪</Disp>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 * S, fontFamily: TC, fontSize: 26 * S, color: C.text }}>
                      <span style={{ width: 8 * S, height: 8 * S, borderRadius: 99, background: C.muted, flexShrink: 0 }} />
                      從後端下載完整資源
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 * S, fontFamily: TC, fontSize: 26 * S, color: C.text }}>
                      <span style={{ width: 8 * S, height: 8 * S, borderRadius: 99, background: C.muted, flexShrink: 0 }} />
                      需要時間
                    </div>
                  </div>
                </div>
                <div style={{ ...cmpRight, flex: 1, background: hexGlow(C.yellow, 0.07), border: `2px solid ${hexGlow(C.yellow, 0.4)}`, borderRadius: 22 * S, padding: `${28 * S}px ${30 * S}px` }}>
                  <Disp style={{ fontFamily: SYNE, fontSize: 34 * S, color: C.yellow, letterSpacing: "0.02em", display: "block", marginBottom: 16 * S }}>再次造訪</Disp>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 * S, fontFamily: TC, fontSize: 26 * S, color: C.text }}>
                      <span style={{ width: 8 * S, height: 8 * S, borderRadius: 99, background: C.yellow, flexShrink: 0 }} />
                      本地<span style={{ color: C.yellow }}>快取</span>直接讀
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 * S, fontFamily: TC, fontSize: 26 * S, color: C.text, fontWeight: 700 }}>
                      <span style={{ width: 8 * S, height: 8 * S, borderRadius: 99, background: C.yellow, flexShrink: 0 }} />
                      <Disp style={{ color: C.yellow }}>瞬間打開</Disp>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 cached resources */}
              <div style={{ display: "flex", gap: 14 * S, justifyContent: "center" }}>
                {[
                  { s: res1, icon: "image", label: "暫存圖片" },
                  { s: res2, icon: "file",  label: "暫存 CSS" },
                  { s: res3, icon: "code",  label: "暫存 JavaScript" },
                ].map(({ s, icon, label }) => (
                  <div key={label} style={{ ...s, flex: 1, background: C.surface, border: `1px solid ${hexGlow(C.yellow, 0.28)}`, borderRadius: 16 * S, padding: `${18 * S}px ${20 * S}px`, display: "flex", alignItems: "center", gap: 14 * S }}>
                    <LI name={icon} size={42 * S} color={C.yellow} />
                    <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.text, fontWeight: 600 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Definition */}
          {frame >= defStart - 6 && (
            <div style={{ ...def, marginTop: 50 * S, textAlign: "center" }}>
              <Disp style={{ fontSize: 24 * S, color: C.yellow, letterSpacing: "0.2em", display: "block", marginBottom: 26 * S }}>DEFINITION</Disp>
              <div style={{ fontFamily: TC, fontSize: 72 * S, fontWeight: 900, color: C.text, lineHeight: 1.3, marginBottom: 22 * S }}>
                <Disp style={{ color: C.yellow }}>快取 Cache</Disp>
              </div>
              <div style={{ height: 4 * S, background: C.yellow, borderRadius: 99, maxWidth: 360 * S, margin: "0 auto", boxShadow: `0 0 16px ${hexGlow(C.yellow, 0.5)}`, ...defLine }} />
              <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.muted, marginTop: 30 * S, lineHeight: 1.6 }}>
                瀏覽器暫存資源到本地，再訪不用每次都重新下載
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
// SCENE 4.1 — 為什麼重要邏輯必須放後端？(本質限制)
// global range 14037–15456 | dur 1420 | SEG_START=14037
// overlays:
//   SectionHeader F0 | BigPunchline F213→ | AnalogyCard F963→end
// ═════════════════════════════════════════════════════════════════════════════
const Scene41FrontEndLimits: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[8];
  // global - 14037
  const punchStart = 213;   // F14250
  const analogyStart = 963; // F15000

  const punchFade = useBlockFade(analogyStart - 30);

  const punch = useFadeUpElastic(punchStart);
  const punchLine = useAccentLine(punchStart + 20);
  const punchBreathe = useBreathe(70);
  const punchKicker = useFadeUp(punchStart + 200);

  const analogy = useFadeUpElastic(analogyStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.red} />
        <ProgressBar progressPct={PROGRESS_PCT[8]} accent={C.red} />
        <SceneWrap>
          <div>
            <SectionHeader num="04" title="為什麼重要邏輯必須放後端？" startFrame={0} accent={C.red} />
          </div>

          {/* Big Punchline */}
          {frame < analogyStart - 6 && (
            <div style={{ opacity: punchFade, marginTop: 30 * S, textAlign: "center" }}>
              <div style={{ ...punch }}>
                <Disp style={{ fontFamily: SYNE, fontSize: 26 * S, color: C.red, letterSpacing: "0.2em", display: "block", marginBottom: 28 * S }}>ESSENCE</Disp>
                <div style={{ fontFamily: TC, fontSize: 42 * S, fontWeight: 600, color: C.muted, lineHeight: 1.5, marginBottom: 30 * S }}>
                  前端 = 被下載到你<span style={{ color: C.text }}>瀏覽器</span>的程式
                </div>
                <div style={{ fontFamily: TC, fontSize: 76 * S, fontWeight: 900, color: C.text, lineHeight: 1.3, marginBottom: 30 * S, transform: `scale(${1 + 0.01 * punchBreathe})`, textShadow: `0 0 ${24 + 16 * punchBreathe}px ${hexGlow(C.red, 0.2 + 0.12 * punchBreathe)}` }}>
                  下載到<Disp style={{ color: C.red }}>手邊</Disp> → <Disp style={{ color: C.red }}>任何人都可能修改</Disp>
                </div>
                <div style={{ height: 4 * S, background: C.red, borderRadius: 99, maxWidth: 400 * S, margin: "0 auto", boxShadow: `0 0 18px ${hexGlow(C.red, 0.55)}`, ...punchLine }} />
              </div>
              {frame >= punchStart + 200 - 6 && (
                <div style={{ ...punchKicker, marginTop: 30 * S, fontFamily: TC, fontSize: 32 * S, color: C.muted, lineHeight: 1.5 }}>
                  這是前端的<Disp style={{ color: C.red }}>本質限制</Disp>
                </div>
              )}
            </div>
          )}

          {/* Analogy card */}
          {frame >= analogyStart - 6 && (
            <div style={{ ...analogy, marginTop: 40 * S }}>
              <div style={{ background: hexGlow(C.red, 0.07), border: `2.5px solid ${hexGlow(C.red, 0.45)}`, borderRadius: 26 * S, padding: `${40 * S}px ${50 * S}px`, display: "flex", alignItems: "center", gap: 36 * S }}>
                <div style={{ width: 160 * S, height: 160 * S, borderRadius: 28 * S, background: hexGlow(C.red, 0.12), border: `2px solid ${hexGlow(C.red, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <LI name="file-edit" size={90 * S} color={C.red} sw={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <Disp style={{ fontFamily: SYNE, fontSize: 22 * S, color: C.red, letterSpacing: "0.2em", display: "block", marginBottom: 14 * S }}>ANALOGY</Disp>
                  <div style={{ fontFamily: TC, fontSize: 48 * S, fontWeight: 800, color: C.text, lineHeight: 1.4, marginBottom: 16 * S }}>
                    就像<Disp style={{ color: C.red }}>下載文件</Disp>到電腦
                  </div>
                  <div style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted, lineHeight: 1.6 }}>
                    想怎麼改就怎麼改 — 前端程式也是同樣道理
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
// SCENE 4.2 — 情境：電商網站（駭客篡改 + 後端重驗）
// global range 15457–16968 | dur 1512 | SEG_START=15457
// overlays:
//   SubKicker F0 | TamperFlow F143→943 (3 steps) | SolutionReveal F993→ | FinalPrinciple F1293→end
// ═════════════════════════════════════════════════════════════════════════════
const Scene42PriceTamper: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[9];
  // global - 15457
  const s1Start = 143;       // F15600
  const s2Start = 443;       // F15900
  const s3Start = 743;       // F16200
  const solStart = 993;      // F16450
  const finalStart = 1293;   // F16750

  const tamperFade = useBlockFade(solStart - 30);
  const solFade = useBlockFade(finalStart - 30);

  const step1 = useFadeUpElastic(s1Start);
  const step2 = useFadeUpElastic(s2Start);
  const step3 = useFadeUpElastic(s3Start);

  const sol = useFadeUpElastic(solStart);
  const solLine = useAccentLine(solStart + 18);
  const it1 = useFadeUpItem(solStart + 80);
  const it2 = useFadeUpItem(solStart + 110);
  const it3 = useFadeUpItem(solStart + 140);
  const it4 = useFadeUpItem(solStart + 170);

  const fin = useFadeUpHeader(finalStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.red} />
        <ProgressBar progressPct={PROGRESS_PCT[9]} accent={C.red} />
        <SceneWrap>
          <SubKicker text="情境：電商網站" startFrame={0} accent={C.red} />

          {/* TamperFlow 3 steps */}
          {frame < solStart - 6 && (
            <div style={{ opacity: tamperFade, marginTop: 8 * S, display: "flex", flexDirection: "column", gap: 14 * S }}>
              {[
                { from: s1Start, s: step1, step: 1, label: "前端顯示價格",     value: "$1000",   color: C.green, accent: "green" as const },
                { from: s2Start, s: step2, step: 2, label: "駭客在本地動手腳", value: "→ $10",   color: C.red,   accent: "red"   as const, highlight: true },
                { from: s3Start, s: step3, step: 3, label: "若系統只信前端",   value: "$10 成交", color: C.red,   accent: "red"   as const, warning: true },
              ].map(({ from, s, step, label, value, color, highlight, warning }) => frame >= from - 6 && (
                <div key={step} style={{ ...s, display: "flex", alignItems: "center", gap: 22 * S, background: highlight || warning ? hexGlow(color, 0.08) : C.surface, border: `${warning ? 2 : 1.5}px solid ${hexGlow(color, warning ? 0.55 : 0.32)}`, borderLeft: `4px solid ${color}`, borderRadius: 16 * S, padding: `${22 * S}px ${30 * S}px`, boxShadow: warning ? `0 0 24px ${hexGlow(color, 0.2)}` : undefined }}>
                  <span style={{ fontFamily: MONO, fontSize: 24 * S, fontWeight: 800, color, background: hexGlow(color, 0.12), border: `1px solid ${hexGlow(color, 0.4)}`, borderRadius: 10 * S, padding: `${6 * S}px ${14 * S}px`, minWidth: 60 * S, textAlign: "center", flexShrink: 0 }}>0{step}</span>
                  {warning && <LI name="warning" size={48 * S} color={color} />}
                  {highlight && !warning && <LI name="hacker" size={48 * S} color={color} />}
                  <span style={{ fontFamily: TC, fontSize: 30 * S, color: C.text, fontWeight: 600, flex: 1 }}>{label}</span>
                  <Disp style={{ fontFamily: SYNE, fontSize: 44 * S, color, letterSpacing: "0.02em", textShadow: warning ? `0 0 16px ${hexGlow(color, 0.5)}` : undefined }}>{value}</Disp>
                </div>
              ))}
              {frame >= s3Start + 120 - 6 && (
                <div style={{ marginTop: 12 * S, paddingLeft: 22 * S, borderLeft: `4px solid ${C.red}`, fontFamily: TC, fontSize: 30 * S, color: C.text, lineHeight: 1.5, fontWeight: 600 }}>
                  直接影響<Disp style={{ color: C.red }}>金流</Disp> — 問題非常嚴重
                </div>
              )}
            </div>
          )}

          {/* Solution Reveal */}
          {frame >= solStart - 6 && frame < finalStart - 6 && (
            <div style={{ opacity: solFade, marginTop: 18 * S }}>
              <div style={{ ...sol, textAlign: "center", marginBottom: 24 * S }}>
                <Disp style={{ fontSize: 24 * S, color: C.orange, letterSpacing: "0.2em", display: "block", marginBottom: 18 * S }}>正解</Disp>
                <div style={{ fontFamily: TC, fontSize: 64 * S, fontWeight: 900, color: C.text, lineHeight: 1.3, marginBottom: 18 * S }}>
                  <Disp style={{ color: C.orange }}>後端必須重新驗證</Disp>
                </div>
                <div style={{ height: 4 * S, background: C.orange, borderRadius: 99, maxWidth: 360 * S, margin: "0 auto", boxShadow: `0 0 16px ${hexGlow(C.orange, 0.5)}`, ...solLine }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 * S, marginBottom: 22 * S }}>
                {[
                  { s: it1, t: "價格計算" },
                  { s: it2, t: "付款金額" },
                  { s: it3, t: "庫存數量" },
                  { s: it4, t: "使用者權限" },
                ].map(({ s, t }) => (
                  <div key={t} style={{ ...s, display: "flex", alignItems: "center", gap: 16 * S, background: C.surface, border: `1px solid ${hexGlow(C.orange, 0.28)}`, borderLeft: `4px solid ${hexGlow(C.orange, 0.6)}`, borderRadius: 14 * S, padding: `${18 * S}px ${24 * S}px` }}>
                    <LI name="check" size={36 * S} color={C.orange} sw={2.2} />
                    <span style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, fontWeight: 600 }}>{t}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted, lineHeight: 1.6, paddingLeft: 18 * S, borderLeft: `3px solid ${hexGlow(C.orange, 0.5)}` }}>
                後端跑伺服器，使用者<span style={{ color: C.orange }}>無法接觸 / 竄改</span>
              </div>
            </div>
          )}

          {/* Final principle */}
          {frame >= finalStart - 6 && (
            <div style={{ ...fin, marginTop: 60 * S, textAlign: "center" }}>
              <div style={{ background: hexGlow(C.text, 0.04), border: `2px solid ${C.border}`, borderRadius: 24 * S, padding: `${40 * S}px ${50 * S}px` }}>
                <Disp style={{ fontSize: 22 * S, color: C.muted, letterSpacing: "0.2em", display: "block", marginBottom: 22 * S }}>PRINCIPLE</Disp>
                <div style={{ fontFamily: TC, fontSize: 52 * S, fontWeight: 800, color: C.text, lineHeight: 1.4 }}>
                  <Disp style={{ color: C.green }}>前端</Disp> = 讓你操作；<Disp style={{ color: C.orange }}>後端</Disp> = 確保操作合法 + 安全
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
// SCENE 5.1 — 重點整理 5 條 + 下集預告 API
// global range 16969–20219 | dur 3251 | SEG_START=16969
// overlays:
//   SectionHeader F0 | Takeaway 1–5 (F231/F731/F1231/F1731/F2231) | FinaleGlowCard F2681→end
// ═════════════════════════════════════════════════════════════════════════════
const Scene51Finale: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[10];
  // global - 16969
  const t1Start = 231;     // F17200
  const t2Start = 731;     // F17700
  const t3Start = 1231;    // F18200
  const t4Start = 1731;    // F18700
  const t5Start = 2231;    // F19200
  const finaleStart = 2681; // F19650

  const cardsFade = useBlockFade(finaleStart - 30);
  const t1 = useFadeUpElastic(t1Start);
  const t2 = useFadeUpElastic(t2Start);
  const t3 = useFadeUpElastic(t3Start);
  const t4 = useFadeUpElastic(t4Start);
  const t5 = useFadeUpElastic(t5Start);
  const fin = useFadeUpElastic(finaleStart);
  const glow = 0.22 + 0.1 * Math.sin((frame - finaleStart) / 30);

  const takeaways = [
    { num: "01", color: C.green,  s: t1, start: t1Start, title: "前端 = 迷你 App",
      body: "下載到瀏覽器執行；極輕量 + 跨裝置。" },
    { num: "02", color: C.orange, s: t2, start: t2Start, title: "後端 = 24h 大腦",
      body: "伺服器統一接收瀏覽器 / iOS / Android 客戶端。" },
    { num: "03", color: C.green,  s: t3, start: t3Start, title: "溝通 = 請求—回應",
      body: "前端送需求 → 後端處理 → 回傳;快取讓再訪變快。" },
    { num: "04", color: C.red,    s: t4, start: t4Start, title: "重要邏輯放後端",
      body: "前端會被竄改;登入 / 付款 / 權限必後端。" },
    { num: "05", color: C.purple, s: t5, start: t5Start, title: "後端兩大任務",
      body: "業務邏輯（規則）+ 資料庫（快速找到）。" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[10]} accent={C.green} />
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
              <div style={{ background: `linear-gradient(135deg, ${hexGlow(C.green, 0.08)}, ${hexGlow(C.purple, 0.06)})`, border: `3px solid ${hexGlow(C.green, 0.5)}`, borderRadius: 32 * S, padding: `${56 * S}px ${60 * S}px`, boxShadow: `0 0 80px ${hexGlow(C.green, glow)}`, textAlign: "center" }}>
                <Disp style={{ fontSize: 24 * S, color: C.green, letterSpacing: "0.16em", display: "block", marginBottom: 24 * S }}>下集預告</Disp>
                <div style={{ fontFamily: TC, fontSize: 80 * S, fontWeight: 900, lineHeight: 1.3, color: C.text, marginBottom: 22 * S }}>
                  <Disp style={{ color: C.green }}>API</Disp> <span style={{ color: C.muted, fontWeight: 400, fontSize: 60 * S }}>—</span> 前後端的<Disp style={{ color: C.purple }}>橋樑</Disp>
                </div>
                <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.muted, lineHeight: 1.6 }}>
                  前端到底怎麼跟後端溝通？關鍵就是 <Disp style={{ color: C.green }}>API</Disp>
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
// Root Composition — FullVideo12
// ═════════════════════════════════════════════════════════════════════════════
const SCENES: React.FC<{ callouts: Callout[] }>[] = [
  Scene01Hero,
  Scene11FrontEndDownload,
  Scene12UIDesigner,
  Scene21BackEndServer,
  Scene22BackEndTasks,
  Scene31GmailRequest,
  Scene32ServerError,
  Scene33Cache,
  Scene41FrontEndLimits,
  Scene42PriceTamper,
  Scene51Finale,
];

export const FullVideo12: React.FC = () => {
  const getCallouts = (segStart: number, segEnd: number) =>
    GLOBAL_CALLOUTS.map(c => ({ ...c, from: c.from - segStart, to: c.to - segStart }))
      .filter(c => c.from >= -FADE_OUT_F && c.from < (segEnd - segStart));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/course_background_music.wav")} startFrom={0} volume={0.1} loop />
      {SEG_STARTS_12.map((start, i) => {
        const SceneCmp = SCENES[i];
        const nextStart = i + 1 < SEG_STARTS_12.length ? SEG_STARTS_12[i + 1] : TOTAL_FRAMES_12;
        return (
          <Sequence key={i} from={start} durationInFrames={SEG_DURATIONS[i]}>
            <Audio src={staticFile(`audio/2-5/2-5_${SEG_KEYS[i]}-normalized.wav`)} />
            <SceneCmp callouts={getCallouts(start, nextStart)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
