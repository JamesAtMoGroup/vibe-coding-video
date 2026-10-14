import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  Img,
  Freeze,
} from "remotion";
import { loadFont as loadSyne } from "@remotion/google-fonts/Syne";

// ─────────────────────────────────────────────────────────────────────────────
// FullVideo14 — CH 2-7「技術方案｜爬蟲——看得到就爬得到，3 招實用技巧」
// v2 motion system（aischool 對齊；參考 FullVideo13/FullVideo12）。
// 20 個音頻段落 + 6 個置中 demo 影片；4K 30fps。
// 語意色：靜態/推薦=綠 / 動態=橘 / 警告=紅 / 工具=紫 / 提示=黃。
// ─────────────────────────────────────────────────────────────────────────────

const SYNE = loadSyne().fontFamily;
const TC = "'Noto Sans TC','PingFang TC',sans-serif";
const MONO = "'Space Mono', monospace";

const S = 2;
const W = 1920 * S; // 3840
const H = 1080 * S; // 2160
const NAV_H = 72 * S; // 144
const SUBTITLE_H = 160 * S; // 320
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
  red:       "#ff6b6b",
  redDim:    "rgba(255,107,107,0.55)",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// ─────────────────────────────────────────────────────────────────────────────
// Timing — 從 processed/2-7-cues.json / 2-7-segments.json
// ─────────────────────────────────────────────────────────────────────────────
export const SEG_STARTS_14 = [0, 969, 2476, 4034, 5673, 7501, 8699, 9476, 11111, 12400, 13375, 14844, 16177, 17956, 20047, 20799, 22043, 24134, 25686, 28045];
export const TOTAL_FRAMES_14 = 31916;
const SEG_DURATIONS = [969, 1507, 1558, 1639, 1828, 1198, 777, 1635, 1289, 975, 1469, 1333, 1779, 2091, 752, 1244, 2091, 1552, 2359, 3871];
const SEG_KEYS = ["0.1", "1.1", "1.2", "2.1", "2.2", "2.3", "3.1", "3.2", "3.3", "3.4", "4.1", "4.2", "4.3", "4.4", "5.1", "5.2", "5.3", "6.1", "6.2", "7.1"];

// Progress percentages (running through 20 segments) — 依 SEG_STARTS 均分
const PROGRESS_PCT = [3, 8, 13, 18, 24, 27, 30, 35, 39, 42, 47, 51, 56, 63, 65, 69, 76, 80, 88, 100];

// ─────────────────────────────────────────────────────────────────────────────
// Callouts（無寄件人 — identity protection）— 6 個 demo 影片各一
// from/to 為 global frame（在 FullVideo14 內轉為 local）
// ─────────────────────────────────────────────────────────────────────────────
type Callout = { from: number; to: number; text: string };
const GLOBAL_CALLOUTS: Callout[] = [
  { from: 10562, to: 10712, text: "找得到=靜態 找不到=動態" },      // 3.2
  { from: 11896, to: 12046, text: "資料還在=靜態 破相=動態" },      // 3.3
  { from: 12983, to: 13133, text: "看得到=靜態 看不到=動態" },      // 3.4
  { from: 15182, to: 15332, text: "複製包覆的 HTML 標籤貼給 AI" },   // 4.2
  { from: 16841, to: 16991, text: "元素=JS 執行後畫面 含你看到的" }, // 4.3
  { from: 18870, to: 19020, text: "複製 cURL 貼 AI→譯成 GAS" },      // 4.4
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
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18z|M3 12h18|M12 3a13 13 0 010 18|M12 3a13 13 0 000 18",
  refresh: "M4 12a8 8 0 1114 5|M14 17v-4h4",
  spark: "M12 3v6|M12 15v6|M3 12h6|M15 12h6|M6 6l4 4|M14 14l4 4|M6 18l4-4|M14 10l4-4",
  link: "M9 15l6-6|M10 6a4 4 0 015.6 5.6L13 14|M14 18a4 4 0 01-5.6-5.6L11 10",
  layers: "M12 3l9 5-9 5-9-5z|M3 13l9 5 9-5|M3 18l9 5 9-5",
  question: "M9 9a3 3 0 116 0c0 2-3 2-3 4|M12 16v.01|M12 4a8 8 0 100 16 8 8 0 000-16z",
  target: "M12 3a9 9 0 100 18 9 9 0 000-18z|M12 7a5 5 0 100 10 5 5 0 000-10z|M12 11a1 1 0 100 2 1 1 0 000-2z",
  bolt: "M13 3L4 14h6l-1 7 9-11h-6z",
  server: "M4 4h16v6H4z|M4 14h16v6H4z|M7 7h.01|M7 17h.01",
  file: "M7 3h7l4 4v14H7z|M14 3v4h4|M10 14h6|M10 18h6",
  code: "M9 8l-5 4 5 4|M15 8l5 4-5 4|M14 5l-4 14",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4",
  cloud: "M7 16a4 4 0 110-8 5 5 0 019.6 1.5A3.5 3.5 0 0117 16z",
  warning: "M12 3l10 18H2z|M12 10v5|M12 18v.01",
  check: "M5 13l4 4L19 7",
  cross: "M6 6l12 12|M18 6L6 18",
  lock: "M6 11h12v10H6z|M9 11V7a3 3 0 016 0v4",
  key: "M14 7a4 4 0 11-3.4 6.1L4 19h-2v-2l1-1v-2h2v-2l2-2 1.1 1.1A4 4 0 0114 7z|M15.5 8.5v.01",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14z|M16 16l5 5",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18z|M12 8v4l3 2",
  hand: "M9 11V5a1.5 1.5 0 013 0v6|M12 11V4a1.5 1.5 0 013 0v7|M15 11V6a1.5 1.5 0 013 0v8a6 6 0 01-6 6h-1a6 6 0 01-5-3l-3-5a1.5 1.5 0 012.6-1.5L9 14",
  bug: "M9 7a3 3 0 016 0|M8 12h8|M9 10h6v5a3 3 0 01-6 0z|M12 10v9|M8 10L5 8|M16 10l3-2|M8 14l-3 2|M16 14l3 2",
  database: "M12 4c4 0 7 1 7 3s-3 3-7 3-7-1-7-3 3-3 7-3z|M5 7v5c0 2 3 3 7 3s7-1 7-3V7|M5 12v5c0 2 3 3 7 3s7-1 7-3v-5",
  table: "M4 5h16v14H4z|M4 10h16|M4 15h16|M10 5v14|M15 5v14",
  browser: "M4 5h16v14H4z|M4 9h16|M7 7h.01|M9.5 7h.01",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z|M12 9a3 3 0 100 6 3 3 0 000-6z",
  "eye-off": "M4 4l16 16|M9.5 9.5a3 3 0 004 4|M6.5 6.5C3.5 8 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.2-.8|M17 15c2.7-1.6 5-3 5-3s-3.5-7-10-7",
  book: "M5 4h11a2 2 0 012 2v14H7a2 2 0 01-2-2z|M5 18a2 2 0 012-2h11",
  download: "M12 4v10|M8 11l4 4 4-4|M5 19h14",
  filter: "M4 5h16l-6 8v6l-4-2v-4z",
  robot: "M5 8h14v10H5z|M5 13H3|M19 13h2|M9 12v.01|M15 12v.01|M9 16c1 1 5 1 6 0|M12 5v3|M10 5h4",
  route: "M6 4a2 2 0 100 4 2 2 0 000-4z|M18 16a2 2 0 100 4 2 2 0 000-4z|M8 6h6a4 4 0 014 4v6|M6 8v4",
  gauge: "M12 5a8 8 0 108 8|M12 13l5-4|M4 13h1|M19 13h1|M12 5V4",
  network: "M12 3a3 3 0 100 6 3 3 0 000-6z|M5 18a3 3 0 100 6 3 3 0 000-6z|M19 18a3 3 0 100 6 3 3 0 000-6z|M12 9v3|M12 12l-5 4|M12 12l5 4",
  bell: "M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9z|M13.73 21a2 2 0 01-3.46 0",
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
        <span style={{ fontFamily: MONO, fontSize: 18 * S, color: C.faint, letterSpacing: "0.08em" }}>CH 2-7</span>
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

type SceneProps = { callouts: Callout[]; dur: number };

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 0.1 — Hero（中央構圖 + 大字「爬蟲」綠 + connector + 定義 + 3 問題 stagger）
// SEG_START=0 | dur 969
// cues: 188 沒有API | 481 叫做爬蟲 | 756 讓程式代替你讀取內容並抓資料
// ═════════════════════════════════════════════════════════════════════════════
const Scene01Hero: React.FC<SceneProps> = ({ callouts, dur }) => {
  const badge = useFadeUp(0);
  const title = useFadeUpHeader(30);
  const titleBreathe = useBreathe(70);
  const conn = useFadeUp(110);
  const def = useFadeUp(460);
  const q1 = useFadeUpElastic(600);
  const q2 = useFadeUpElastic(700);
  const q3 = useFadeUpElastic(800);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[0]} accent={C.green} />
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: `${NAV_H + 30 * S}px ${80 * S}px ${SUBTITLE_H + 24 * S}px` }}>
          {/* Chapter Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 26 * S, ...badge }}>
            <span style={{ fontFamily: MONO, fontSize: 22 * S, color: C.green, border: `1px solid ${C.green}`, padding: `${6 * S}px ${18 * S}px`, borderRadius: 8 * S, letterSpacing: "0.06em", boxShadow: `0 0 12px ${hexGlow(C.green, 0.2)}` }}>CH 2-7</span>
            <span style={{ fontFamily: MONO, fontSize: 20 * S, color: C.muted, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, padding: `${6 * S}px ${16 * S}px`, borderRadius: 8 * S, letterSpacing: "0.04em" }}>技術方案</span>
          </div>

          {/* Hero Title — 中央大字「爬蟲」綠 */}
          <div style={{ marginBottom: 20 * S, ...title, textAlign: "center" }}>
            <h1 style={{ fontFamily: TC, fontSize: 190 * S, fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.04em", color: C.green, margin: 0, display: "inline-block", transform: `scale(${1 + 0.012 * titleBreathe})`, textShadow: `0 0 ${40 + 30 * titleBreathe}px ${hexGlow(C.green, 0.32 + 0.16 * titleBreathe)}` }}>
              爬蟲
            </h1>
          </div>

          {/* Connector from CH 2-6 */}
          <div style={{ ...conn, display: "flex", alignItems: "center", gap: 14 * S, fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.08em", marginBottom: 30 * S, flexWrap: "wrap", justifyContent: "center", maxWidth: 1600 * S }}>
            <span style={{ display: "inline-block", width: 30 * S, height: 1, background: C.faint }} />
            上集 <Disp style={{ color: C.purple }}>API</Disp>
            <span style={{ color: C.faint }}>→</span> 有些網站<Disp style={{ color: C.text }}>沒有 API</Disp>
            <span style={{ color: C.faint }}>→</span> 想拿資料就用 <Disp style={{ color: C.green }}>爬蟲</Disp>
            <span style={{ display: "inline-block", width: 30 * S, height: 1, background: C.faint }} />
          </div>

          {/* One-line definition */}
          <div style={{ ...def, marginBottom: 34 * S, textAlign: "center", background: hexGlow(C.green, 0.06), border: `1.5px solid ${hexGlow(C.green, 0.32)}`, borderRadius: 18 * S, padding: `${22 * S}px ${40 * S}px`, maxWidth: 1500 * S }}>
            <span style={{ fontFamily: TC, fontSize: 34 * S, color: C.text, fontWeight: 600, lineHeight: 1.5 }}>
              讓程式<Disp style={{ color: C.green }}>代替你</Disp>去讀取網站內容、把需要的資料<Disp style={{ color: C.green }}>抓出來</Disp>
            </span>
          </div>

          {/* 3 Questions stagger */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 * S, width: "100%", maxWidth: 1400 * S }}>
            {[
              { t: "爬蟲能做什麼？", s: q1, accent: C.green },
              { t: "靜態、動態怎麼分？", s: q2, accent: C.orange },
              { t: "怎麼告訴 AI 要抓哪裡？", s: q3, accent: C.purple },
            ].map(({ t, s, accent }) => (
              <div key={t} style={{ ...s, display: "flex", alignItems: "center", gap: 22 * S, background: C.surface, border: `1.5px solid ${hexGlow(accent, 0.32)}`, borderRadius: 18 * S, padding: `${20 * S}px ${36 * S}px` }}>
                <span style={{ fontFamily: MONO, fontSize: 24 * S, color: accent, fontWeight: 700, letterSpacing: "0.06em" }}>Q</span>
                <span style={{ width: 1, height: 36 * S, background: hexGlow(accent, 0.4) }} />
                <span style={{ fontFamily: TC, fontSize: 34 * S, color: C.text, fontWeight: 600 }}>{t}</span>
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
// SCENE 1.1 — 爬蟲是什麼？痛點卡 + 4 步驟 flow（綠）
// SEG_START=969 | dur 1507
// cues: 痛點 1038-1322 | 這就是爬蟲 2012=1043 | 造訪 2089=1120 | 找到 2212=1243
//       抓取 2251=1282 | 整理試算表 2366=1397
// ═════════════════════════════════════════════════════════════════════════════
const Scene11WhatIs: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const flowStart = 1043;
  const painFade = useBlockFade(flowStart - 30);
  const pain = useFadeUpElastic(80);
  const flowHead = useFadeUpHeader(flowStart);
  const analogy = useFadeUp(1420);
  const steps = [
    { start: 1120, icon: "globe", label: "自動造訪\n指定網站" },
    { start: 1200, icon: "search", label: "找到你要\n的資料" },
    { start: 1282, icon: "download", label: "抓取\n下來" },
    { start: 1380, icon: "table", label: "整理成\n試算表" },
  ];
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[1]} accent={C.green} />
        <SceneWrap>
          <SectionHeader num="01" title="爬蟲是什麼？" startFrame={0} accent={C.green} />

          {/* Pain scenario */}
          {frame < flowStart - 6 && (
            <div style={{ ...pain, opacity: painFade, marginTop: 20 * S, display: "flex", gap: 24 * S, background: hexGlow(C.muted, 0.05), border: `1.5px solid ${C.border}`, borderLeft: `5px solid ${hexGlow(C.orange, 0.6)}`, borderRadius: 20 * S, padding: `${30 * S}px ${36 * S}px`, alignItems: "center" }}>
              <div style={{ width: 120 * S, height: 120 * S, borderRadius: 22 * S, background: hexGlow(C.orange, 0.12), border: `2px solid ${hexGlow(C.orange, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <LI name="hand" size={64 * S} color={C.orange} sw={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 20 * S, color: C.orange, letterSpacing: "0.14em", marginBottom: 10 * S }}>每天早上的煩惱</div>
                <div style={{ fontFamily: TC, fontSize: 36 * S, color: C.text, fontWeight: 700, lineHeight: 1.5, marginBottom: 8 * S }}>
                  跑 3 個網站 → 一筆筆<Disp style={{ color: C.orange }}>複製貼上</Disp>試算表 → 傳主管
                </div>
                <div style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted, lineHeight: 1.5 }}>
                  不難，但每天做真的很煩 — 有沒有辦法<span style={{ color: C.text }}>自動完成</span>？
                </div>
              </div>
            </div>
          )}

          {/* 4-step flow */}
          {frame >= flowStart - 6 && (
            <div style={{ marginTop: 18 * S }}>
              <div style={{ ...flowHead, fontFamily: TC, fontSize: 40 * S, fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 40 * S }}>
                爬蟲就是讓程式<Disp style={{ color: C.green }}>自動</Disp>把這件事做完
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 * S }}>
                {steps.map((st, i) => (
                  frame >= st.start - 6 && (
                    <React.Fragment key={st.icon}>
                      <StepNode start={st.start} icon={st.icon} label={st.label} idx={i + 1} />
                      {i < steps.length - 1 && <FlowArrow start={st.start + 40} />}
                    </React.Fragment>
                  )
                ))}
              </div>
              <div style={{ ...analogy, textAlign: "center", marginTop: 40 * S, fontFamily: TC, fontSize: 30 * S, color: C.muted, lineHeight: 1.5 }}>
                就像請了一個<Disp style={{ color: C.green }}>不用休息的助理</Disp>幫你整理好資料
              </div>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

const StepNode: React.FC<{ start: number; icon: string; label: string; idx: number }> = ({ start, icon, label, idx }) => {
  const s = useFadeUpElastic(start);
  return (
    <div style={{ ...s, width: 250 * S, background: C.surface, border: `1.5px solid ${hexGlow(C.green, 0.32)}`, borderRadius: 22 * S, padding: `${28 * S}px ${20 * S}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S }}>
      <div style={{ width: 108 * S, height: 108 * S, borderRadius: 22 * S, background: hexGlow(C.green, 0.12), border: `2px solid ${hexGlow(C.green, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <LI name={icon} size={58 * S} color={C.green} sw={2} />
        <span style={{ position: "absolute", top: -14 * S, right: -14 * S, width: 44 * S, height: 44 * S, borderRadius: 99, background: C.green, color: C.bg, fontFamily: SYNE, fontSize: 24 * S, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{idx}</span>
      </div>
      <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, fontWeight: 700, textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.35 }}>{label}</div>
    </div>
  );
};
const FlowArrow: React.FC<{ start: number }> = ({ start }) => {
  const g = useDraw(start, 18);
  return (
    <div style={{ width: 60 * S, display: "flex", alignItems: "center", justifyContent: "center", opacity: g }}>
      <svg width={60 * S} height={40 * S} viewBox="0 0 30 20" fill="none" stroke={C.green} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M2 10h${2 + 22 * g}`} />
        <path d="M20 4l6 6-6 6" opacity={g} />
      </svg>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 1.2 — 定時 vs 手動 + 應用場景 3 卡
// SEG_START=2476 | dur 1558
// cues: 定時 2476 | 上班前跑 2686 | 手動 3046=570 | 應用場景 3256=780
//       競品 3346=870 | 內容整合 3526=1050 | 資料監控 3706=1230
// ═════════════════════════════════════════════════════════════════════════════
const Scene12Schedule: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const appStart = 780;
  const modeFade = useBlockFade(appStart - 30);
  const auto = useFadeUpElastic(60);
  const clockPulse = useBreathe(50);
  const manual = useFadeUpElastic(570);
  const appHead = useFadeUpHeader(appStart);
  const apps = [
    { start: 870, icon: "gauge", title: "競品調查", desc: "定期抓多個網站的商品價格" },
    { start: 1050, icon: "layers", title: "內容整合", desc: "把分散各頁的公告訊息統一整理" },
    { start: 1230, icon: "bell", title: "資料監控", desc: "數字一有更新就記到試算表" },
  ];
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[2]} accent={C.green} />
        <SceneWrap>
          <SubKicker text="定時自動跑，或需要時手動跑" startFrame={0} accent={C.green} />

          {/* mode compare */}
          {frame < appStart - 6 && (
            <div style={{ opacity: modeFade, display: "flex", gap: 24 * S, marginTop: 10 * S }}>
              <div style={{ ...auto, flex: 1, background: hexGlow(C.green, 0.07), border: `2px solid ${hexGlow(C.green, 0.5)}`, borderRadius: 24 * S, padding: `${34 * S}px ${36 * S}px`, boxShadow: `0 0 ${30 + 16 * clockPulse}px ${hexGlow(C.green, 0.1 + 0.06 * clockPulse)}` }}>
                <div style={{ width: 108 * S, height: 108 * S, borderRadius: 22 * S, background: hexGlow(C.green, 0.14), border: `2px solid ${hexGlow(C.green, 0.6)}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 * S }}>
                  <LI name="clock" size={62 * S} color={C.green} sw={2} />
                </div>
                <Disp style={{ fontFamily: SYNE, fontSize: 40 * S, color: C.green, display: "block", marginBottom: 14 * S }}>定時觸發</Disp>
                <div style={{ fontFamily: TC, fontSize: 30 * S, color: C.text, lineHeight: 1.6 }}>
                  設定好時間 → 每天<span style={{ color: C.green }}>上班前自動跑一次</span>，資料已在雲端等你
                </div>
              </div>
              <div style={{ ...manual, flex: 1, background: hexGlow(C.muted, 0.05), border: `2px solid ${C.border}`, borderRadius: 24 * S, padding: `${34 * S}px ${36 * S}px` }}>
                <div style={{ width: 108 * S, height: 108 * S, borderRadius: 22 * S, background: hexGlow(C.muted, 0.08), border: `2px solid ${C.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 * S }}>
                  <LI name="hand" size={62 * S} color={C.muted} sw={2} />
                </div>
                <Disp style={{ fontFamily: SYNE, fontSize: 40 * S, color: C.text, display: "block", marginBottom: 14 * S }}>手動執行</Disp>
                <div style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted, lineHeight: 1.6 }}>
                  不想設排程？<span style={{ color: C.text }}>需要的時候跑一次</span>就好，兩種都可以
                </div>
              </div>
            </div>
          )}

          {/* application scenarios */}
          {frame >= appStart - 6 && (
            <div style={{ marginTop: 10 * S }}>
              <div style={{ ...appHead, fontFamily: TC, fontSize: 38 * S, fontWeight: 700, color: C.text, marginBottom: 28 * S }}>
                爬蟲能用在很多<Disp style={{ color: C.green }}>場景</Disp>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 * S }}>
                {apps.map((a) => (
                  frame >= a.start - 6 && <AppCard key={a.title} {...a} />
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
const AppCard: React.FC<{ start: number; icon: string; title: string; desc: string }> = ({ start, icon, title, desc }) => {
  const s = useFadeUpElastic(start);
  return (
    <div style={{ ...s, display: "flex", gap: 22 * S, alignItems: "center", background: C.surface, border: `1.5px solid ${hexGlow(C.green, 0.28)}`, borderLeft: `5px solid ${C.green}`, borderRadius: 18 * S, padding: `${22 * S}px ${30 * S}px` }}>
      <div style={{ width: 88 * S, height: 88 * S, borderRadius: 18 * S, background: hexGlow(C.green, 0.12), border: `2px solid ${hexGlow(C.green, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <LI name={icon} size={48 * S} color={C.green} sw={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Disp style={{ fontFamily: SYNE, fontSize: 34 * S, color: C.text, display: "block", marginBottom: 8 * S }}>{title}</Disp>
        <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 2.1 — 靜態 vs 動態：為什麼重要（AI 對話泡泡 + 難度對比 bar）
// SEG_START=4034 | dur 1639
// cues: AI問靜態動態 4464=430 | 決定難度 4964=930 | 靜態幾十分鐘 5244=1210
//       動態幾小時 5366=1332 | 差非常多 5593=1559
// ═════════════════════════════════════════════════════════════════════════════
const Scene21WhyMatter: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const bubble = useFadeUpElastic(430);
  const barHead = useFadeUpHeader(930);
  const staticGrow = useDraw(1210, 30);
  const dynamicGrow = useDraw(1332, 40);
  const punch = useFadeUp(1490);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.orange} />
        <ProgressBar progressPct={PROGRESS_PCT[3]} accent={C.orange} />
        <SceneWrap>
          <SectionHeader num="02" title="靜態 vs 動態：為什麼重要" startFrame={0} accent={C.orange} />

          {/* AI question bubble */}
          {frame >= 430 - 6 && (
            <div style={{ ...bubble, marginTop: 6 * S, display: "flex", gap: 18 * S, alignItems: "flex-start", marginBottom: 40 * S }}>
              <div style={{ width: 76 * S, height: 76 * S, borderRadius: 99, background: hexGlow(C.purple, 0.16), border: `1.5px solid ${hexGlow(C.purple, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <LI name="robot" size={44 * S} color={C.purple} sw={2} />
              </div>
              <div style={{ background: hexGlow(C.purple, 0.08), border: `1.5px solid ${hexGlow(C.purple, 0.4)}`, borderRadius: 20 * S, borderTopLeftRadius: 4 * S, padding: `${24 * S}px ${32 * S}px` }}>
                <div style={{ fontFamily: MONO, fontSize: 20 * S, color: C.purple, marginBottom: 8 * S, letterSpacing: "0.08em" }}>AI 反問你</div>
                <div style={{ fontFamily: TC, fontSize: 38 * S, color: C.text, fontWeight: 600, lineHeight: 1.4 }}>
                  「這個網頁 / 資料是<Disp style={{ color: C.green }}>靜態</Disp>還是<Disp style={{ color: C.orange }}>動態</Disp>的？」
                </div>
              </div>
            </div>
          )}

          {/* difficulty compare bar */}
          {frame >= 930 - 6 && (
            <div>
              <div style={{ ...barHead, fontFamily: TC, fontSize: 32 * S, fontWeight: 700, color: C.text, marginBottom: 24 * S }}>
                這決定了<Disp style={{ color: C.text }}>寫程式的難度</Disp>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 22 * S }}>
                <DiffBar label="靜態網站" hint="幾十分鐘" color={C.green} widthPct={38} grow={staticGrow} />
                <DiffBar label="動態網站" hint="好幾個小時" color={C.orange} widthPct={92} grow={dynamicGrow} />
              </div>
            </div>
          )}

          {frame >= 1490 - 6 && (
            <div style={{ ...punch, marginTop: 34 * S, textAlign: "center", fontFamily: TC, fontSize: 36 * S, fontWeight: 700, color: C.text }}>
              有差嗎？<Disp style={{ color: C.orange }}>差非常多</Disp> — 這個判斷決定難度與工具
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};
const DiffBar: React.FC<{ label: string; hint: string; color: string; widthPct: number; grow: number }> = ({ label, hint, color, widthPct, grow }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 24 * S }}>
    <div style={{ width: 280 * S, fontFamily: SYNE, fontSize: 34 * S, fontWeight: 800, color, flexShrink: 0 }}>{label}</div>
    <div style={{ flex: 1, height: 72 * S, background: "rgba(255,255,255,0.04)", borderRadius: 14 * S, overflow: "hidden", position: "relative" }}>
      <div style={{ height: "100%", width: `${widthPct * grow}%`, background: `linear-gradient(90deg, ${hexGlow(color, 0.6)}, ${color})`, borderRadius: 14 * S, boxShadow: `0 0 20px ${hexGlow(color, 0.4)}`, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 22 * S }}>
        <span style={{ fontFamily: TC, fontSize: 28 * S, fontWeight: 700, color: C.bg, opacity: grow > 0.7 ? 1 : 0 }}>{hint}</span>
      </div>
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 2.2 — 靜態 vs 動態的差異（split 綠 / 橘）
// SEG_START=5673 | dur 1828
// cues: 靜態定義 5795=122 | 動態 6501=828
// ═════════════════════════════════════════════════════════════════════════════
const Scene22StaticDynamic: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const staticCard = useFadeUpElastic(130);
  const dynamicCard = useFadeUpElastic(828);
  const sBul = [
    { start: 240, t: "打開之前內容就已準備好" },
    { start: 360, t: "對每個人看到的都一樣" },
    { start: 520, t: "官網介紹頁 / 活動頁 / Landing Page / Notion" },
  ];
  const dBul = [
    { start: 940, t: "依使用者或當下資料才產生" },
    { start: 1080, t: "登入後個資 / 商品推薦 / 社群貼文" },
    { start: 1300, t: "Threads、IG 一直往下滑冒出新貼文" },
  ];
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[4]} accent={C.green} />
        <SceneWrap>
          <SubKicker text="到底什麼是靜態、什麼是動態" startFrame={0} accent={C.green} />
          <div style={{ display: "flex", gap: 24 * S, marginTop: 8 * S, alignItems: "stretch" }}>
            {/* Static */}
            <div style={{ ...staticCard, flex: 1, background: hexGlow(C.green, 0.07), border: `2px solid ${hexGlow(C.green, 0.5)}`, borderRadius: 24 * S, padding: `${32 * S}px ${34 * S}px`, minHeight: 720 * S }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 * S, marginBottom: 24 * S }}>
                <div style={{ width: 96 * S, height: 96 * S, borderRadius: 20 * S, background: hexGlow(C.green, 0.14), border: `2px solid ${hexGlow(C.green, 0.6)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <LI name="file" size={54 * S} color={C.green} sw={2} />
                </div>
                <Disp style={{ fontFamily: SYNE, fontSize: 48 * S, color: C.green }}>靜態</Disp>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 * S }}>
                {sBul.map((b) => frame >= b.start - 6 && <BulletRow key={b.t} start={b.start} text={b.t} color={C.green} />)}
              </div>
            </div>
            {/* Dynamic */}
            <div style={{ ...dynamicCard, flex: 1, background: hexGlow(C.orange, 0.07), border: `2px solid ${hexGlow(C.orange, 0.5)}`, borderRadius: 24 * S, padding: `${32 * S}px ${34 * S}px`, minHeight: 720 * S }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 * S, marginBottom: 24 * S }}>
                <div style={{ width: 96 * S, height: 96 * S, borderRadius: 20 * S, background: hexGlow(C.orange, 0.14), border: `2px solid ${hexGlow(C.orange, 0.6)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <LI name="refresh" size={54 * S} color={C.orange} sw={2} />
                </div>
                <Disp style={{ fontFamily: SYNE, fontSize: 48 * S, color: C.orange }}>動態</Disp>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 * S }}>
                {dBul.map((b) => frame >= b.start - 6 && <BulletRow key={b.t} start={b.start} text={b.t} color={C.orange} />)}
              </div>
            </div>
          </div>
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};
const BulletRow: React.FC<{ start: number; text: string; color: string }> = ({ start, text, color }) => {
  const s = useFadeUpItem(start);
  return (
    <div style={{ ...s, display: "flex", alignItems: "flex-start", gap: 16 * S, background: hexGlow(color, 0.05), border: `1px solid ${hexGlow(color, 0.2)}`, borderRadius: 12 * S, padding: `${18 * S}px ${22 * S}px` }}>
      <span style={{ width: 14 * S, height: 14 * S, borderRadius: 99, background: color, marginTop: 10 * S, flexShrink: 0, boxShadow: `0 0 10px ${hexGlow(color, 0.6)}` }} />
      <span style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 2.3 — 混合式與判斷重點（頁面示意 + punchline）
// SEG_START=7501 | dur 1198
// cues: 混合式 7816=315 | 標題導覽固定 8046=545 | 留言貼文商品動態 8169=668
//       你要抓的那筆資料 8544=1043
// ═════════════════════════════════════════════════════════════════════════════
const Scene23Hybrid: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const punchStart = 900;
  const pageFade = useBlockFade(punchStart - 30);
  const page = useFadeUpElastic(315);
  const navPart = useFadeUp(545);
  const dynPart = useFadeUp(668);
  const punch = useFadeUpElastic(punchStart);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.orange} />
        <ProgressBar progressPct={PROGRESS_PCT[5]} accent={C.orange} />
        <SceneWrap>
          <SubKicker text="現代網頁很少是純靜態或純動態" startFrame={0} accent={C.orange} />

          {frame < punchStart - 6 && (
            <div style={{ ...page, opacity: pageFade, marginTop: 6 * S, background: C.surface, border: `2px solid ${C.borderHi}`, borderRadius: 22 * S, padding: `${28 * S}px`, minHeight: 640 * S }}>
              {/* nav / title — static green */}
              <div style={{ ...navPart, background: hexGlow(C.green, 0.12), border: `2px solid ${hexGlow(C.green, 0.5)}`, borderRadius: 14 * S, padding: `${22 * S}px ${28 * S}px`, marginBottom: 20 * S, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: SYNE, fontSize: 32 * S, fontWeight: 800, color: C.green }}>標題 · 導覽列</span>
                <span style={{ fontFamily: MONO, fontSize: 22 * S, color: C.green, background: hexGlow(C.green, 0.14), padding: `${6 * S}px ${16 * S}px`, borderRadius: 8 * S }}>靜態</span>
              </div>
              {/* dynamic regions orange */}
              {frame >= 668 - 6 && (
                <div style={{ ...dynPart, display: "flex", gap: 20 * S }}>
                  {["留言區", "貼文內容", "商品列表"].map((t) => (
                    <div key={t} style={{ flex: 1, background: hexGlow(C.orange, 0.10), border: `2px solid ${hexGlow(C.orange, 0.5)}`, borderRadius: 14 * S, padding: `${40 * S}px ${20 * S}px`, textAlign: "center" }}>
                      <div style={{ fontFamily: SYNE, fontSize: 30 * S, fontWeight: 800, color: C.orange, marginBottom: 14 * S }}>{t}</div>
                      <span style={{ fontFamily: MONO, fontSize: 20 * S, color: C.orange, background: hexGlow(C.orange, 0.14), padding: `${5 * S}px ${14 * S}px`, borderRadius: 8 * S }}>動態載入</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {frame >= punchStart - 6 && (
            <div style={{ ...punch, marginTop: 60 * S, textAlign: "center", background: hexGlow(C.orange, 0.07), border: `2.5px solid ${hexGlow(C.orange, 0.5)}`, borderRadius: 28 * S, padding: `${52 * S}px ${52 * S}px` }}>
              <Disp style={{ fontSize: 22 * S, color: C.orange, letterSpacing: "0.2em", display: "block", marginBottom: 24 * S }}>KEY POINT</Disp>
              <div style={{ fontFamily: TC, fontSize: 48 * S, fontWeight: 800, color: C.text, lineHeight: 1.5 }}>
                重點不是整個網站，<br />而是「<Disp style={{ color: C.orange }}>你要抓的那筆資料</Disp>」是靜態還是動態
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
// SCENE 3.1 — 三招快速判斷總覽（rail）
// SEG_START=8699 | dur 777
// cues: 三招 8886=187 | 不用寫程式 8980=281 | 準確度不同 9107=408 | 先從第一招 9197=498
// ═════════════════════════════════════════════════════════════════════════════
const Scene31ThreeTricks: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const note = useFadeUp(540);
  const tricks = [
    { start: 187, icon: "browser", title: "檢視網頁原始碼", tag: "最快速", color: C.green },
    { start: 300, icon: "eye-off", title: "停用 JavaScript", tag: "更準確", color: C.orange },
    { start: 410, icon: "download", title: "下載 HTML 檔案", tag: "最直覺", color: C.purple },
  ];
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[6]} accent={C.green} />
        <SceneWrap>
          <SectionHeader num="03" title="三招快速判斷" startFrame={0} accent={C.green} />
          <div style={{ display: "flex", flexDirection: "column", gap: 18 * S, marginTop: 10 * S }}>
            {tricks.map((t, i) => frame >= t.start - 6 && <TrickRow key={t.title} {...t} idx={i + 1} />)}
          </div>
          {frame >= 540 - 6 && (
            <div style={{ ...note, marginTop: 30 * S, fontFamily: TC, fontSize: 28 * S, color: C.muted, textAlign: "center", lineHeight: 1.5 }}>
              不用寫程式，用瀏覽器就能做 — 從<Disp style={{ color: C.green }}>第一招</Disp>開始，不確定再用後面確認
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};
const TrickRow: React.FC<{ start: number; icon: string; title: string; tag: string; color: string; idx: number }> = ({ start, icon, title, tag, color, idx }) => {
  const s = useFadeUpElastic(start);
  return (
    <div style={{ ...s, display: "flex", alignItems: "center", gap: 24 * S, background: C.surface, border: `1.5px solid ${hexGlow(color, 0.32)}`, borderLeft: `5px solid ${color}`, borderRadius: 18 * S, padding: `${24 * S}px ${30 * S}px` }}>
      <div style={{ width: 92 * S, height: 92 * S, borderRadius: 18 * S, background: hexGlow(color, 0.14), border: `2px solid ${hexGlow(color, 0.6)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Disp style={{ fontFamily: SYNE, fontSize: 20 * S, color, letterSpacing: "0.08em" }}>招</Disp>
        <Disp style={{ fontFamily: SYNE, fontSize: 40 * S, color, lineHeight: 1 }}>{idx}</Disp>
      </div>
      <LI name={icon} size={52 * S} color={color} sw={2} />
      <Disp style={{ flex: 1, fontFamily: SYNE, fontSize: 40 * S, color: C.text }}>{title}</Disp>
      <span style={{ fontFamily: MONO, fontSize: 22 * S, color, background: hexGlow(color, 0.12), border: `1px solid ${hexGlow(color, 0.4)}`, padding: `${8 * S}px ${18 * S}px`, borderRadius: 10 * S, letterSpacing: "0.06em" }}>{tag}</span>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// DEMO VIDEO SCENE — 置中影片 + 左上標題小卡 + iMessage callout
// 旁白 wav 由外層 Audio Sequence 播放；影片 muted 當視覺。
// ═════════════════════════════════════════════════════════════════════════════
const DemoVideoScene: React.FC<SceneProps & { video: string; title: string; accent: string; pct: number; videoDurFrames: number }> = ({
  callouts, dur, video, title, accent, pct, videoDurFrames,
}) => {
  const titleAnim = useFadeUpHeader(10);
  const lastFrame = videoDurFrames - 1;
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={accent} />
        <ProgressBar progressPct={pct} accent={accent} />
        {/* centered demo video (muted; contain) — 原速播放，短於旁白就定格末幀，長於旁白自然被場景裁切，不拉伸變速 */}
        <Sequence from={0}>
          <Freeze frame={lastFrame} active={(f) => f >= lastFrame}>
            <OffthreadVideo
              src={staticFile(video)}
              muted
              style={{ position: "absolute", top: NAV_H, left: 0, width: W, height: H - NAV_H - SUBTITLE_H, objectFit: "contain" }}
            />
          </Freeze>
        </Sequence>
        {/* top-left title card */}
        <div style={{ ...titleAnim, position: "absolute", top: NAV_H + 24 * S, left: 44 * S, zIndex: 150, display: "flex", alignItems: "center", gap: 16 * S, background: "rgba(9,9,15,0.86)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `1.5px solid ${hexGlow(accent, 0.5)}`, borderRadius: 16 * S, padding: `${16 * S}px ${26 * S}px`, boxShadow: `0 0 24px ${hexGlow(accent, 0.18)}` }}>
          <span style={{ width: 14 * S, height: 14 * S, borderRadius: 99, background: accent, boxShadow: `0 0 12px ${accent}` }} />
          <span style={{ fontFamily: TC, fontSize: 32 * S, fontWeight: 800, color: C.text }}>{title}</span>
        </div>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};
// videoDurFrames = 影片原始長度（30fps 換算，ffprobe 實測）。原速播放：
// 短於旁白 → Freeze 定格末幀；長於旁白 → 場景邊界自然裁切。不再用 playbackRate 變速，
// 原劇本備注鐵律：「配合音檔長度去播放，若影片過長，多出來的片段可直接刪除」
// 3.3 / 3.4 / 4.2 逐幀比對過旁白 VTT：影片本身節奏跟旁白對得上，原速即可，不需下面的 Synced 版本。
const Scene33Demo: React.FC<SceneProps> = (p) => <DemoVideoScene {...p} video="assets/2-7/demo-3-3-disablejs.mp4" title="招式二：停用 JavaScript（更準確）" accent={C.green} pct={PROGRESS_PCT[8]} videoDurFrames={1990} />;
const Scene34Demo: React.FC<SceneProps> = (p) => <DemoVideoScene {...p} video="assets/2-7/demo-3-4-downloadhtml.mp4" title="招式三：下載 HTML 檔案（最直覺）" accent={C.green} pct={PROGRESS_PCT[9]} videoDurFrames={1063} />;
const Scene42Demo: React.FC<SceneProps> = (p) => <DemoVideoScene {...p} video="assets/2-7/demo-4-2-sourcecode.mp4" title="定位法一：原始碼法（靜態首選）" accent={C.green} pct={PROGRESS_PCT[11]} videoDurFrames={696} />;

// ═════════════════════════════════════════════════════════════════════════════
// SYNCED DEMO VIDEO SCENE — 3.2 / 4.3 / 4.4 專用。
// 逐幀比對原始素材跟旁白 VTT 後發現：這三支影片的真實動作（點擊/右鍵/搜尋/找到）
// 遠比旁白講解快（錄影時沒有配合旁白語速），natural-speed + 單一 Freeze 完全對不上
// （James 2026-10-14 抓到：CH2-7 招式一畫面跟旁白明顯脫節）。改成三段式時間軸：
//   1. holdFrames：旁白還在講概念、動作還沒開始 → 定格影片第 0 幀
//   2. 動作段：影片 [0, trimFrames) 用 playbackRate 伸縮，剛好落在 holdFrames→actionEndFrame
//      這段旁白時間內（關鍵動作幀的時間點是逐幀 Read PNG 比對 VTT cue 抓出來的，不是用猜的）
//   3. actionEndFrame 之後：Freeze 定格在動作完成的最後一幀，陪旁白把概念講完
// ═════════════════════════════════════════════════════════════════════════════
const SyncedDemoVideoScene: React.FC<SceneProps & {
  video: string; title: string; accent: string; pct: number;
  holdFrames: number; trimFrames: number; actionEndFrame: number;
}> = ({ callouts, dur, video, title, accent, pct, holdFrames, trimFrames, actionEndFrame }) => {
  const titleAnim = useFadeUpHeader(10);
  const actionDur = actionEndFrame - holdFrames;
  const rate = trimFrames / actionDur;
  const videoStyle: React.CSSProperties = { position: "absolute", top: NAV_H, left: 0, width: W, height: H - NAV_H - SUBTITLE_H, objectFit: "contain" };
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={accent} />
        <ProgressBar progressPct={pct} accent={accent} />
        {holdFrames > 0 && (
          <Sequence from={0} durationInFrames={holdFrames}>
            <Freeze frame={0} active={true}>
              <OffthreadVideo src={staticFile(video)} muted style={videoStyle} />
            </Freeze>
          </Sequence>
        )}
        <Sequence from={holdFrames} durationInFrames={actionDur}>
          <OffthreadVideo src={staticFile(video)} muted playbackRate={rate} style={videoStyle} />
        </Sequence>
        <Sequence from={actionEndFrame}>
          <Freeze frame={actionDur - 1} active={true}>
            <OffthreadVideo src={staticFile(video)} muted playbackRate={rate} style={videoStyle} />
          </Freeze>
        </Sequence>
        <div style={{ ...titleAnim, position: "absolute", top: NAV_H + 24 * S, left: 44 * S, zIndex: 150, display: "flex", alignItems: "center", gap: 16 * S, background: "rgba(9,9,15,0.86)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `1.5px solid ${hexGlow(accent, 0.5)}`, borderRadius: 16 * S, padding: `${16 * S}px ${26 * S}px`, boxShadow: `0 0 24px ${hexGlow(accent, 0.18)}` }}>
          <span style={{ width: 14 * S, height: 14 * S, borderRadius: 99, background: accent, boxShadow: `0 0 12px ${accent}` }} />
          <span style={{ fontFamily: TC, fontSize: 32 * S, fontWeight: 800, color: C.text }}>{title}</span>
        </div>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};
// 3.2：旁白從 0 秒就開始講動作（不需要 hold）。動作在 0-16s 內做完（含「找到」結果），
// 16s 後是另一個不相干的示範（X.com/NVIDIA），不採用，直接截斷。16s 動作拉伸到旁白 0-39.4s
// （「找得到=靜態/找不到=動態」cue 在 34.5-39.4s，拉伸後動作終點精準落在這段）；
// 39.4s 後定格到 54.4s 旁白講完。
const Scene32Demo: React.FC<SceneProps> = (p) => <SyncedDemoVideoScene {...p} video="assets/2-7/demo-3-2-viewsource.mp4" title="招式一：檢視網頁原始碼" accent={C.green} pct={PROGRESS_PCT[7]} holdFrames={0} trimFrames={480} actionEndFrame={1182} />;
// 4.3：旁白前 30.36s 純講概念（無動作可對應）→ hold 影片第 0 幀。影片本身 30.1s 動作幾乎是
// 一鏡到底，伸縮比例只需 1.04x（幾乎原速），落在旁白剩餘的 30.36-59.3s（=dur）。
const Scene43Demo: React.FC<SceneProps> = (p) => <SyncedDemoVideoScene {...p} video="assets/2-7/demo-4-3-element.mp4" title="定位法二：元素法（動態）" accent={C.orange} pct={PROGRESS_PCT[12]} holdFrames={911} trimFrames={903} actionEndFrame={1779} />;
// 4.4：旁白前 18.64s 純講概念 → hold。動作段（開發人員工具→網路分頁→重整→搜尋→右鍵選單同時
// 看到「複製為cURL格式」+「複製為fetch格式」兩個選項）在影片 0-26s 完成，1.83x 壓縮對齊旁白
// 18.64-32.86s（「按右鍵點選複製為CURL格式」cue 中點）。32.86s 後定格在這個選單畫面——
// 剛好同時蓋到旁白後段整段 cURL vs fetch 的比較（47.3-69.3s），不用額外動作。
const Scene44Demo: React.FC<SceneProps> = (p) => <SyncedDemoVideoScene {...p} video="assets/2-7/demo-4-4-network.mp4" title="定位法三：網路法（動態 API）" accent={C.orange} pct={PROGRESS_PCT[13]} holdFrames={559} trimFrames={780} actionEndFrame={986} />;

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 4.1 — 精準定位：為什麼需要線索
// SEG_START=13375 | dur 1469
// cues: 只給網址? 13770=395 | 程式碼logo無關 13977=602 | 給精準線索 14287=912
//       AI更精準 14423=1048 | 定位 14654=1279
// ═════════════════════════════════════════════════════════════════════════════
const Scene41WhyLocate: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const focusStart = 880;
  const noiseFade = useBlockFade(focusStart - 30);
  const card = useFadeUpElastic(395);
  const focus = useFadeUpElastic(focusStart);
  const punch = useFadeUp(1080);
  const noise = ["程式碼", "Logo", "廣告", "導覽列", "頁尾", "你要的資料", "側欄", "彈窗"];
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[10]} accent={C.green} />
        <SceneWrap>
          <SectionHeader num="04" title="精準定位：給 AI 線索" startFrame={0} accent={C.green} />

          {frame < focusStart - 6 && (
            <div style={{ ...card, opacity: noiseFade, marginTop: 8 * S }}>
              <div style={{ fontFamily: TC, fontSize: 34 * S, color: C.text, fontWeight: 700, lineHeight: 1.5, marginBottom: 24 * S }}>
                「不能<Disp style={{ color: C.text }}>直接貼網址</Disp>給 AI 就好嗎？」— 一頁上東西太多了
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 * S }}>
                {noise.map((t, i) => {
                  const isTarget = t === "你要的資料";
                  return (
                    <span key={t} style={{ fontFamily: TC, fontSize: 30 * S, fontWeight: isTarget ? 800 : 500, color: isTarget ? C.green : C.muted, background: isTarget ? hexGlow(C.green, 0.12) : "rgba(255,255,255,0.04)", border: `1.5px solid ${isTarget ? hexGlow(C.green, 0.5) : C.border}`, borderRadius: 12 * S, padding: `${16 * S}px ${26 * S}px`, opacity: interpolate(frame, [420 + i * 24, 480 + i * 24], [0, 1], clamp) }}>{t}</span>
                  );
                })}
              </div>
            </div>
          )}

          {frame >= focusStart - 6 && (
            <div style={{ ...focus, marginTop: 6 * S, textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 150 * S, height: 150 * S, borderRadius: 28 * S, background: hexGlow(C.green, 0.1), border: `2.5px solid ${hexGlow(C.green, 0.6)}`, marginBottom: 30 * S, boxShadow: `0 0 40px ${hexGlow(C.green, 0.25)}` }}>
                <LI name="filter" size={84 * S} color={C.green} sw={2} />
              </div>
              <div style={{ fontFamily: TC, fontSize: 42 * S, fontWeight: 700, color: C.text, lineHeight: 1.5, marginBottom: 20 * S }}>
                給<Disp style={{ color: C.green }}>精準線索</Disp>，幫 AI 縮小範圍
              </div>
              {frame >= 1080 - 6 && (
                <div style={{ ...punch, fontFamily: TC, fontSize: 34 * S, color: C.muted, lineHeight: 1.5 }}>
                  找到資料在頁面上的位置＝<Disp style={{ color: C.green }}>定位</Disp>；線索越準，AI 寫的程式越準
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
// SCENE 5.1 — 工具選擇：原則
// SEG_START=20047 | dur 752
// cues: 整理 20298=251 | 總整理 20543=496 | 根據情境 20622=575
// ═════════════════════════════════════════════════════════════════════════════
const Scene51DecisionIntro: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const card = useFadeUpElastic(251);
  const teaserHead = useFadeUpHeader(496);
  const rungs = [
    { start: 520, t: "A", d: "靜態", color: C.green },
    { start: 560, t: "B", d: "動態·網路法", color: C.orange },
    { start: 600, t: "C", d: "動態·元素法", color: C.orange },
    { start: 640, t: "D", d: "Python 進階", color: C.purple },
  ];
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.yellow} />
        <ProgressBar progressPct={PROGRESS_PCT[14]} accent={C.yellow} />
        <SceneWrap>
          <SectionHeader num="05" title="工具選擇決策地圖" startFrame={0} accent={C.yellow} />

          {frame >= 251 - 6 && (
            <div style={{ ...card, marginTop: 8 * S, background: hexGlow(C.yellow, 0.07), border: `2px solid ${hexGlow(C.yellow, 0.5)}`, borderRadius: 24 * S, padding: `${36 * S}px ${44 * S}px`, marginBottom: 40 * S }}>
              <Disp style={{ fontSize: 22 * S, color: C.yellow, letterSpacing: "0.2em", display: "block", marginBottom: 18 * S }}>原則</Disp>
              <div style={{ fontFamily: TC, fontSize: 40 * S, fontWeight: 700, color: C.text, lineHeight: 1.5 }}>
                能用<Disp style={{ color: C.yellow }}>簡單</Disp>就不用<Disp style={{ color: C.yellow }}>複雜</Disp> — 從最輕鬆的方案開始，行不通再往下一層
              </div>
            </div>
          )}

          {frame >= 496 - 6 && (
            <div>
              <div style={{ ...teaserHead, fontFamily: TC, fontSize: 30 * S, color: C.muted, marginBottom: 24 * S, textAlign: "center" }}>接下來看四種情況 A → D，由簡到繁</div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 16 * S }}>
                {rungs.map((r, i) => <Rung key={r.t} start={r.start} letter={r.t} desc={r.d} color={r.color} h={(i + 2) * 70} />)}
              </div>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

const Rung: React.FC<{ start: number; letter: string; desc: string; color: string; h: number }> = ({ start, letter, desc, color, h }) => {
  const frame = useCurrentFrame();
  const s = useFadeUpElastic(start);
  if (frame < start - 6) return null;
  return (
    <div style={{ ...s, width: 300 * S, height: `${h}px`, background: hexGlow(color, 0.1), border: `2px solid ${hexGlow(color, 0.5)}`, borderRadius: 16 * S, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 * S }}>
      <Disp style={{ fontFamily: SYNE, fontSize: 48 * S, color }}>{letter}</Disp>
      <span style={{ fontFamily: TC, fontSize: 24 * S, color: C.text, fontWeight: 600 }}>{desc}</span>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 5.2 — 決策地圖 A / B
// SEG_START=20799 | dur 1244
// cues: A 靜態 20859=60 | 原始碼法 21009=210 | 新手首選 21291=492
//       B 動態 21447=648 | 網路法 21501=702 | 譯GAS 21702=903 | 不保證成功 21948=1149
// ═════════════════════════════════════════════════════════════════════════════
const Scene52DecisionAB: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const cardA = useFadeUpElastic(60);
  const cardB = useFadeUpElastic(648);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[15]} accent={C.green} />
        <SceneWrap>
          <SubKicker text="情況 A / B" startFrame={0} accent={C.yellow} />
          <div style={{ display: "flex", flexDirection: "column", gap: 20 * S, marginTop: 8 * S }}>
            {frame >= 60 - 6 && (
              <DecisionCard anim={cardA} letter="A" color={C.green} situation="要抓的是靜態資料"
                method="原始碼法 → 搭配 Google Apps Script"
                notes={[{ icon: "check", t: "可設定定時自動執行", color: C.green }, { icon: "spark", t: "新手首選，強力推薦", color: C.green }]}
                tag="最輕鬆" show={frame} />
            )}
            {frame >= 648 - 6 && (
              <DecisionCard anim={cardB} letter="B" color={C.orange} situation="要抓的是動態資料"
                method="先試網路法 → 找到 API 請求，翻譯成 Google Apps Script"
                notes={[{ icon: "check", t: "降級用比較簡單的工具", color: C.orange }, { icon: "warning", t: "方便，但不保證每個網頁都成功", color: C.orange }]}
                tag="降級處理" show={frame} />
            )}
          </div>
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};
const DecisionCard: React.FC<{ anim: AnimStyle; letter: string; color: string; situation: string; method: string; notes: { icon: string; t: string; color: string }[]; tag: string; show: number }> = ({ anim, letter, color, situation, method, notes, tag }) => (
  <div style={{ ...anim, display: "flex", gap: 26 * S, background: C.surface, border: `1.5px solid ${hexGlow(color, 0.32)}`, borderLeft: `6px solid ${color}`, borderRadius: 20 * S, padding: `${26 * S}px ${32 * S}px` }}>
    <div style={{ width: 110 * S, height: 110 * S, borderRadius: 22 * S, background: hexGlow(color, 0.14), border: `2px solid ${hexGlow(color, 0.6)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Disp style={{ fontFamily: SYNE, fontSize: 56 * S, color }}>{letter}</Disp>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 12 * S }}>
        <div style={{ fontFamily: TC, fontSize: 34 * S, fontWeight: 800, color: C.text }}>{situation}</div>
        <span style={{ fontFamily: MONO, fontSize: 20 * S, color, background: hexGlow(color, 0.12), border: `1px solid ${hexGlow(color, 0.4)}`, padding: `${5 * S}px ${14 * S}px`, borderRadius: 8 * S }}>{tag}</span>
      </div>
      <div style={{ fontFamily: TC, fontSize: 28 * S, color, fontWeight: 700, lineHeight: 1.5, marginBottom: 14 * S, display: "flex", alignItems: "center", gap: 12 * S }}>
        <LI name="route" size={36 * S} color={color} sw={2} />{method}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
        {notes.map((n) => (
          <div key={n.t} style={{ display: "flex", alignItems: "center", gap: 12 * S, fontFamily: TC, fontSize: 26 * S, color: C.muted, lineHeight: 1.4 }}>
            <LI name={n.icon} size={30 * S} color={n.color} sw={2.2} />{n.t}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 5.3 — 決策地圖 C / D + 反爬蟲紅提醒 + 原則重申
// SEG_START=22043 | dur 2091
// cues: C 元素法主控台 22179=136 | 單次無定時 22438=395 | D Python 22791=748
//       模擬瀏覽器 22881=838 | 難度最高 23116=1073 | 反爬蟲 23419=1376
//       原則 能簡單不複雜 23764=1721
// ═════════════════════════════════════════════════════════════════════════════
const Scene53DecisionCD: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const warnStart = 1330;
  const cardsFade = useBlockFade(warnStart - 30);
  const cardC = useFadeUpElastic(136);
  const cardD = useFadeUpElastic(748);
  const warn = useFadeUpElastic(warnStart);
  const principle = useFadeUp(1721);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.purple} />
        <ProgressBar progressPct={PROGRESS_PCT[16]} accent={C.purple} />
        <SceneWrap>
          <SubKicker text="情況 C / D" startFrame={0} accent={C.yellow} />

          {frame < warnStart - 6 && (
            <div style={{ opacity: cardsFade, display: "flex", flexDirection: "column", gap: 20 * S, marginTop: 8 * S }}>
              {frame >= 136 - 6 && (
                <DecisionCard anim={cardC} letter="C" color={C.orange} situation="動態·網路法行不通"
                  method="元素法 → 搭配主控台爬蟲"
                  notes={[{ icon: "check", t: "看得到的東西基本都能抓", color: C.orange }, { icon: "warning", t: "只能單次，無法設定定時", color: C.orange }]}
                  tag="動態備案" show={frame} />
              )}
              {frame >= 748 - 6 && (
                <DecisionCard anim={cardD} letter="D" color={C.purple} situation="全都不行"
                  method="Python 進階爬蟲 → 模擬完整瀏覽器"
                  notes={[{ icon: "check", t: "幾乎適用任何網站", color: C.purple }, { icon: "warning", t: "難度最高，要花力氣研究", color: C.purple }]}
                  tag="最強最難" show={frame} />
              )}
            </div>
          )}

          {frame >= warnStart - 6 && (
            <div style={{ marginTop: 6 * S }}>
              <div style={{ ...warn, display: "flex", gap: 24 * S, alignItems: "center", background: hexGlow(C.red, 0.09), border: `2px solid ${hexGlow(C.red, 0.5)}`, borderRadius: 20 * S, padding: `${30 * S}px ${36 * S}px`, marginBottom: 30 * S }}>
                <div style={{ width: 100 * S, height: 100 * S, borderRadius: 20 * S, background: hexGlow(C.red, 0.14), border: `2px solid ${hexGlow(C.red, 0.6)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <LI name="shield" size={56 * S} color={C.red} sw={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Disp style={{ fontSize: 22 * S, color: C.red, letterSpacing: "0.16em", display: "block", marginBottom: 10 * S }}>預防針 · 反爬蟲機制</Disp>
                  <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, fontWeight: 700, lineHeight: 1.5 }}>
                    網站防禦嚴謹時，<Disp style={{ color: C.red }}>不管哪個方法難度都會大幅提升</Disp> — 要做好心理準備
                  </div>
                </div>
              </div>
              {frame >= 1721 - 6 && (
                <div style={{ ...principle, textAlign: "center", background: hexGlow(C.yellow, 0.07), border: `2px solid ${hexGlow(C.yellow, 0.45)}`, borderRadius: 22 * S, padding: `${34 * S}px ${44 * S}px` }}>
                  <div style={{ fontFamily: TC, fontSize: 36 * S, fontWeight: 800, color: C.text, lineHeight: 1.5 }}>
                    原則重申：從<Disp style={{ color: C.yellow }}>最輕鬆</Disp>的方案開始，行不通再往下一層
                  </div>
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
// SCENE 6.1 — 倫理與法律：圖書館類比
// SEG_START=24134 | dur 1552
// cues: 倫理法律 24271=137 | 圖書館 24370=236 | 進去閱讀OK 24572=438
//       掃走全部被阻止 24723=589 | 請求太頻繁封鎖 24999=865 | 不能複製出版賣 25269=1135
// ═════════════════════════════════════════════════════════════════════════════
const Scene61Ethics: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const lib = useFadeUpElastic(236);
  const items = [
    { start: 438, icon: "check", ok: true, t: "進去閱讀資料 — 沒問題", map: "本來就開放給大家看", color: C.green },
    { start: 589, icon: "cross", ok: false, t: "短時間掃走整館的書 — 被阻止甚至封鎖", map: "爬蟲請求太頻繁 → 網站封鎖", color: C.red },
    { start: 1135, icon: "cross", ok: false, t: "隨便複製出版、拿去賣 — 不行", map: "爬下來的資料要守使用規範", color: C.red },
  ];
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.red} />
        <ProgressBar progressPct={PROGRESS_PCT[17]} accent={C.red} />
        <SceneWrap>
          <SectionHeader num="06" title="爬蟲的倫理與法律" startFrame={0} accent={C.red} />
          <div style={{ ...lib, display: "flex", alignItems: "center", gap: 18 * S, marginBottom: 26 * S }}>
            <div style={{ width: 88 * S, height: 88 * S, borderRadius: 18 * S, background: hexGlow(C.text, 0.06), border: `2px solid ${C.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LI name="book" size={50 * S} color={C.text} sw={2} />
            </div>
            <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.muted }}>把網站想像成一間<Disp style={{ color: C.text }}>圖書館</Disp> —</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 * S }}>
            {items.map((it) => frame >= it.start - 6 && <EthicsRow key={it.t} {...it} />)}
          </div>
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};
const EthicsRow: React.FC<{ start: number; icon: string; ok: boolean; t: string; map: string; color: string }> = ({ start, icon, t, map, color }) => {
  const s = useFadeUpElastic(start);
  return (
    <div style={{ ...s, display: "flex", gap: 22 * S, alignItems: "center", background: hexGlow(color, 0.06), border: `1.5px solid ${hexGlow(color, 0.32)}`, borderLeft: `5px solid ${color}`, borderRadius: 18 * S, padding: `${22 * S}px ${30 * S}px` }}>
      <div style={{ width: 80 * S, height: 80 * S, borderRadius: 99, background: hexGlow(color, 0.14), border: `2px solid ${hexGlow(color, 0.6)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <LI name={icon} size={44 * S} color={color} sw={2.4} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, fontWeight: 700, lineHeight: 1.4, marginBottom: 6 * S }}>{t}</div>
        <div style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted, lineHeight: 1.4, display: "flex", alignItems: "center", gap: 12 * S }}>
          <span style={{ fontFamily: MONO, color, fontSize: 22 * S }}>→</span>{map}
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 6.2 — 三個一定要記住的原則（第 3 條紅強調）+ 大原則
// SEG_START=25686 | dur 2359
// cues: 原則1頻率 25786=100 | 原則2商業 26423=737 | 原則3搶票違法 26983=1297
//       大原則 27472=1786 | 人做合理程式可做 27549=1863
// ═════════════════════════════════════════════════════════════════════════════
const Scene62ThreeRules: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const bigStart = 1780;
  const rulesFade = useBlockFade(bigStart - 30);
  const r1 = useFadeUpElastic(100);
  const r2 = useFadeUpElastic(737);
  const r3 = useFadeUpElastic(1297);
  const big = useFadeUpElastic(bigStart);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.red} />
        <ProgressBar progressPct={PROGRESS_PCT[18]} accent={C.red} />
        <SceneWrap>
          <SubKicker text="三個一定要記住的原則" startFrame={0} accent={C.red} />

          {frame < bigStart - 6 && (
            <div style={{ opacity: rulesFade, display: "flex", flexDirection: "column", gap: 18 * S, marginTop: 6 * S }}>
              {frame >= 100 - 6 && (
                <RuleCard anim={r1} num={1} color={C.green} icon="clock" title="控制請求頻率"
                  body="每次請求間隔抓 2–5 秒 — 低於 1 秒容易被封鎖，也會拖累對方伺服器" emphasis={false} />
              )}
              {frame >= 737 - 6 && (
                <RuleCard anim={r2} num={2} color={C.orange} icon="warning" title="商業用途要謹慎"
                  body="直接拿爬來的資料做商業服務，可能有版權 / 法律爭議 — 曾有知名企業對簿公堂" emphasis={false} />
              )}
              {frame >= 1297 - 6 && (
                <RuleCard anim={r3} num={3} color={C.red} icon="cross" title="台灣搶票機器人違法"
                  body="演唱會 / 高鐵 / 台鐵，依法都是違法行為 — 就算只是自己用也一樣" emphasis />
              )}
            </div>
          )}

          {frame >= bigStart - 6 && (
            <div style={{ ...big, marginTop: 30 * S, textAlign: "center", background: hexGlow(C.red, 0.07), border: `2.5px solid ${hexGlow(C.red, 0.5)}`, borderRadius: 28 * S, padding: `${52 * S}px ${52 * S}px` }}>
              <Disp style={{ fontSize: 22 * S, color: C.red, letterSpacing: "0.2em", display: "block", marginBottom: 22 * S }}>大原則</Disp>
              <div style={{ fontFamily: TC, fontSize: 44 * S, fontWeight: 800, color: C.text, lineHeight: 1.5 }}>
                人做起來<Disp style={{ color: C.green }}>合理</Disp>的事，程式可以做；<br />
                一旦變成<Disp style={{ color: C.red }}>大量、快速、影響他人</Disp>，就要特別小心
              </div>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};
const RuleCard: React.FC<{ anim: AnimStyle; num: number; color: string; icon: string; title: string; body: string; emphasis: boolean }> = ({ anim, num, color, icon, title, body, emphasis }) => (
  <div style={{ ...anim, display: "flex", gap: 24 * S, background: emphasis ? hexGlow(color, 0.1) : C.surface, border: `${emphasis ? 2.5 : 1.5}px solid ${hexGlow(color, emphasis ? 0.55 : 0.32)}`, borderLeft: `6px solid ${color}`, borderRadius: 18 * S, padding: `${24 * S}px ${32 * S}px`, boxShadow: emphasis ? `0 0 30px ${hexGlow(color, 0.18)}` : "none" }}>
    <div style={{ width: 96 * S, height: 96 * S, borderRadius: 20 * S, background: hexGlow(color, 0.14), border: `2px solid ${hexGlow(color, 0.6)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 * S, flexShrink: 0 }}>
      <Disp style={{ fontFamily: SYNE, fontSize: 40 * S, color, lineHeight: 1 }}>{num}</Disp>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 10 * S }}>
        <LI name={icon} size={42 * S} color={color} sw={2.2} />
        <Disp style={{ fontFamily: SYNE, fontSize: emphasis ? 42 * S : 36 * S, color: emphasis ? color : C.text }}>{title}</Disp>
      </div>
      <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, lineHeight: 1.55 }}>{body}</div>
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 7.1 — Finale 5 takeaway + FinaleGlowCard 下集預告「部署」紫（發光大卡 only here）
// SEG_START=28045 | dur 3871
// cues: takeaway1 28445=400 | 2 28820=775 | 3 29334=1289 | 4 29955=1910 | 5 30454=2409
//       變成服務 31123=3078 | 部署 31644=3599
// ═════════════════════════════════════════════════════════════════════════════
const Scene71Finale: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const finaleStart = 3010;
  const cardsFade = useBlockFade(finaleStart - 30);
  const t1 = useFadeUpElastic(400);
  const t2 = useFadeUpElastic(775);
  const t3 = useFadeUpElastic(1289);
  const t4 = useFadeUpElastic(1910);
  const t5 = useFadeUpElastic(2409);
  const fin = useFadeUpElastic(finaleStart);
  const glow = 0.22 + 0.1 * Math.sin((frame - finaleStart) / 30);
  const takeaways = [
    { num: "01", color: C.green, s: t1, start: 400, title: "爬蟲 = 自動抓資料整理試算表", body: "讓程式自動造訪網站、抓指定資料，還能搭定時每天自動跑。" },
    { num: "02", color: C.green, s: t2, start: 775, title: "先判斷「那筆資料」靜態或動態", body: "聚焦在資料本身，不是整個網站；這決定難度與工具。" },
    { num: "03", color: C.yellow, s: t3, start: 1289, title: "三招快速判斷", body: "原始碼搜尋 · 停用 JavaScript · 下載 HTML；由簡到準。" },
    { num: "04", color: C.orange, s: t4, start: 1910, title: "三種定位法", body: "原始碼法（靜）· 元素法（動）· 網路法（動態 API）。" },
    { num: "05", color: C.red, s: t5, start: 2409, title: "倫理與法律底線", body: "請求要有間隔 · 商業用途謹慎 · 搶票機器人違法。" },
  ];
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[19]} accent={C.green} />
        <SceneWrap>
          <SectionHeader num="重點整理" title="本章五件事" startFrame={0} accent={C.green} />

          {frame < finaleStart - 6 && (
            <div style={{ opacity: cardsFade, display: "flex", flexDirection: "column", gap: 13 * S, marginTop: 4 * S }}>
              {takeaways.map((tk) => frame >= tk.start - 6 && (
                <div key={tk.num} style={{ ...tk.s, display: "flex", alignItems: "flex-start", gap: 20 * S, background: C.surface, border: `1px solid ${hexGlow(tk.color, 0.22)}`, borderLeft: `4px solid ${hexGlow(tk.color, 0.6)}`, borderRadius: 16 * S, padding: `${18 * S}px ${26 * S}px` }}>
                  <span style={{ fontFamily: MONO, fontSize: 26 * S, fontWeight: 800, color: tk.color, background: hexGlow(tk.color, 0.1), border: `1px solid ${hexGlow(tk.color, 0.35)}`, borderRadius: 10 * S, padding: `${6 * S}px ${14 * S}px`, minWidth: 64 * S, textAlign: "center", flexShrink: 0 }}>{tk.num}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: TC, fontSize: 32 * S, fontWeight: 700, color: C.text, marginBottom: 4 * S }}>{tk.title}</div>
                    <div style={{ fontFamily: TC, fontSize: 26 * S, fontWeight: 500, color: C.muted, lineHeight: 1.5 }}>{tk.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Finale glow card — v2 鐵律：發光大卡 only for finale ✓ */}
          {frame >= finaleStart - 6 && (
            <div style={{ ...fin, marginTop: 30 * S }}>
              <div style={{ background: `linear-gradient(135deg, ${hexGlow(C.purple, 0.10)}, ${hexGlow(C.purple, 0.04)})`, border: `3px solid ${hexGlow(C.purple, 0.5)}`, borderRadius: 32 * S, padding: `${52 * S}px ${56 * S}px`, boxShadow: `0 0 80px ${hexGlow(C.purple, glow)}`, textAlign: "center" }}>
                <Disp style={{ fontSize: 24 * S, color: C.purple, letterSpacing: "0.16em", display: "block", marginBottom: 24 * S }}>下集預告</Disp>
                <div style={{ fontFamily: TC, fontSize: 84 * S, fontWeight: 900, lineHeight: 1.3, color: C.text, marginBottom: 22 * S }}>
                  <Disp style={{ color: C.purple }}>部署</Disp>
                </div>
                <div style={{ fontFamily: TC, fontSize: 34 * S, color: C.muted, lineHeight: 1.6 }}>
                  把程式<Disp style={{ color: C.purple }}>穩定放上線運作</Disp>，讓別人也能使用
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
// Root Composition — FullVideo14
// ═════════════════════════════════════════════════════════════════════════════
const SCENES: React.FC<SceneProps>[] = [
  Scene01Hero,          // 0.1
  Scene11WhatIs,        // 1.1
  Scene12Schedule,      // 1.2
  Scene21WhyMatter,     // 2.1
  Scene22StaticDynamic, // 2.2
  Scene23Hybrid,        // 2.3
  Scene31ThreeTricks,   // 3.1
  Scene32Demo,          // 3.2 ⚑video
  Scene33Demo,          // 3.3 ⚑video
  Scene34Demo,          // 3.4 ⚑video
  Scene41WhyLocate,     // 4.1
  Scene42Demo,          // 4.2 ⚑video
  Scene43Demo,          // 4.3 ⚑video
  Scene44Demo,          // 4.4 ⚑video
  Scene51DecisionIntro, // 5.1
  Scene52DecisionAB,    // 5.2
  Scene53DecisionCD,    // 5.3
  Scene61Ethics,        // 6.1
  Scene62ThreeRules,    // 6.2
  Scene71Finale,        // 7.1
];

export const FullVideo14: React.FC = () => {
  const getCallouts = (segStart: number, segEnd: number) =>
    GLOBAL_CALLOUTS.map(c => ({ ...c, from: c.from - segStart, to: c.to - segStart }))
      .filter(c => c.from >= -FADE_OUT_F && c.from < (segEnd - segStart));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/course_background_music.wav")} startFrom={0} volume={0.1} loop />
      {SEG_STARTS_14.map((start, i) => {
        const SceneCmp = SCENES[i];
        const nextStart = i + 1 < SEG_STARTS_14.length ? SEG_STARTS_14[i + 1] : TOTAL_FRAMES_14;
        return (
          <Sequence key={i} from={start} durationInFrames={SEG_DURATIONS[i]}>
            <Audio src={staticFile(`audio/2-7/2-7_${SEG_KEYS[i]}-normalized.wav`)} />
            <SceneCmp callouts={getCallouts(start, nextStart)} dur={SEG_DURATIONS[i]} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
