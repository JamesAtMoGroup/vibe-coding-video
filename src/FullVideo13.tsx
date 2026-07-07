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
// FullVideo13 — CH 2-6「API——跨應用程式、串接時要用的東西」
// v2 motion system（aischool 對齊；參考 FullVideo12）。
// 11 個音頻段落 ~12.6 分鐘；4K 30fps。
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
  yellowSoft:"#f4d27a",
  lime:      "#c8eb33",
  red:       "#ff6b6b",
  redDim:    "rgba(255,107,107,0.55)",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// ─────────────────────────────────────────────────────────────────────────────
// Timing — 從 processed/2-6-cues.json
// ─────────────────────────────────────────────────────────────────────────────
export const SEG_STARTS_13 = [0, 787, 1764, 3679, 5905, 8897, 10979, 12000, 14539, 16317, 19479];
export const TOTAL_FRAMES_13 = 22731;
const SEG_DURATIONS = [787, 977, 1915, 2226, 2992, 2082, 1021, 2539, 1778, 3162, 3252];
const SEG_KEYS = ["0.1", "1.1", "1.2", "2.1", "3.1", "3.2", "4.1", "4.2", "5.1", "5.2", "6.1"];

// Progress percentages (running through 11 segments) — 整集均分
const PROGRESS_PCT = [3, 12, 22, 32, 45, 55, 62, 70, 78, 88, 100];

// ─────────────────────────────────────────────────────────────────────────────
// Callouts（無寄件人 — identity protection）— 13 個
// ─────────────────────────────────────────────────────────────────────────────
type Callout = { from: number; to: number; text: string };
const GLOBAL_CALLOUTS: Callout[] = [
  { from: 950,   to: 1050,  text: "日常 API：第三方登入" },
  { from: 1900,  to: 2000,  text: "Application Programming Interface" },
  { from: 3850,  to: 3950,  text: "API 詞義有兩層" },
  { from: 6100,  to: 6200,  text: "搜尋關鍵字：服務名 + API Docs" },
  { from: 7100,  to: 7200,  text: "API Key 別名：Token / Secret" },
  { from: 9700,  to: 9800,  text: "一步一步教我 = 四字咒語" },
  { from: 11200, to: 11300, text: "卡關很正常 — 別自責" },
  { from: 12900, to: 13000, text: "貼文件 → 不靠訓練資料猜" },
  { from: 14950, to: 15050, text: "API Key = 密碼 × 3" },
  { from: 15600, to: 15700, text: "外洩 → 數千萬美元損失" },
  { from: 17400, to: 17500, text: "部署前 → 移到環境變數" },
  { from: 18300, to: 18400, text: "最小權限 = 損失可控" },
  { from: 21950, to: 22050, text: "下集主角：爬蟲" },
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

const BrandBg: React.FC<{ accent?: string }> = ({ accent = C.purple }) => {
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
  bell: "M6 17V11a6 6 0 0112 0v6|M4 17h16|M10 20a2 2 0 004 0",
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
  lock: "M6 11h12v10H6z|M9 11V7a3 3 0 016 0v4",
  key: "M14 7a4 4 0 11-3.4 6.1L4 19h-2v-2l1-1v-2h2v-2l2-2 1.1 1.1A4 4 0 0114 7z|M15.5 8.5v.01",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14z|M16 16l5 5",
  // 4 grid icons for life API
  google: "M12 6a6 6 0 105.5 8.5|M12 12h7|M19 12V7|M19 12l-2 2",
  "phone-pay": "M7 3h10v18H7z|M10 8h4v3h-4z|M11 18h2",
  "cloud-sun": "M16 6a3 3 0 00-5.6-1.5|M14 2v2|M19 5l-1.4 1.4|M22 11h-2|M7 17a4 4 0 110-8 5 5 0 019.6 1.5A3.5 3.5 0 0117 17z",
  "form-check": "M5 4h10l3 3v13H5z|M15 4v3h3|M8 13l2 2 4-4|M8 17h6",
  // misc
  "magic-lamp": "M9 14h6l-1 4h-4z|M12 14V9a3 3 0 016 0|M9 9a3 3 0 016 0|M19 6l2-1|M3 6l2-1|M11 5l1-2",
  "ai-robot": "M5 8h14v10H5z|M5 13l-2 0|M19 13l2 0|M9 11.5v.01|M15 11.5v.01|M9 15c1 1 5 1 6 0|M12 5v3|M10 5h4",
  "file-paste": "M7 5h7l4 4v10H7z|M14 5v4h4|M10 13h6|M10 17h6|M7 5V3h7",
  "code-paste": "M7 5h7l4 4v10H7z|M14 5v4h4|M9 17l-2-2 2-2|M15 13l2 2-2 2|M12 12l-1 6|M7 5V3h7",
  thinking: "M9 9a3 3 0 116 0c0 2-3 2-3 4|M12 16v.01|M12 4a8 8 0 100 16 8 8 0 000-16z",
  "move-secure": "M4 7h12l4 4v9H4z|M16 7v4h4|M9 14h6|M9 18h6|M4 4l8 0",
  user: "M12 4a4 4 0 100 8 4 4 0 000-8z|M4 20a8 8 0 0116 0",
  plug: "M9 4v4|M15 4v4|M8 8h8v4a4 4 0 01-8 0z|M12 16v5",
  "cloud-abstract": "M7 16a4 4 0 110-8 5 5 0 019.6 1.5A3.5 3.5 0 0117 16z|M12 19v.01|M9 19v.01|M15 19v.01",
};
const LI: React.FC<{ name: keyof typeof ICONS | string; size?: number; color?: string; sw?: number }> = ({
  name, size = 48 * S, color = C.purple, sw = 1.7,
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
const ProgressBar: React.FC<{ progressPct?: number; accent?: string }> = ({ progressPct = 100, accent = C.purple }) => {
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
        <span style={{ fontFamily: MONO, fontSize: 18 * S, color: C.faint, letterSpacing: "0.08em" }}>CH 2-6</span>
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
  num, title, startFrame, accent = C.purple,
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
const SubKicker: React.FC<{ text: string; startFrame: number; accent?: string }> = ({ text, startFrame, accent = C.purple }) => {
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

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 0.1 — Hero（中央構圖 + 大字 API + 3 問題 stagger）
// global range 0–786 | dur 787 | SEG_START=0
// VTT cues: 25.12s "叫做API" = F753；20.4s "在這裡" = F612
// 3 問題 stagger 在 F380, F470, F595 跨整段填滿（防 CH 2-4 0.1 空白教訓）
// ═════════════════════════════════════════════════════════════════════════════
const Scene01Hero: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const dur = SEG_DURATIONS[0];

  const badge = useFadeUp(0);
  const title = useFadeUpHeader(30);
  const sub = useFadeUp(90);
  const conn = useFadeUp(200);
  const titleBreathe = useBreathe(70);

  // 3 個問題 stagger 從 F380 開始
  const q1 = useFadeUpElastic(380);
  const q2 = useFadeUpElastic(490);
  const q3 = useFadeUpElastic(620);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.purple} />
        <ProgressBar progressPct={PROGRESS_PCT[0]} accent={C.purple} />

        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: `${NAV_H + 40 * S}px ${80 * S}px ${SUBTITLE_H + 40 * S}px` }}>
          {/* Chapter Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 30 * S, ...badge }}>
            <span style={{ fontFamily: MONO, fontSize: 22 * S, color: C.purple, border: `1px solid ${C.purple}`, padding: `${6 * S}px ${18 * S}px`, borderRadius: 8 * S, letterSpacing: "0.06em", boxShadow: `0 0 12px ${hexGlow(C.purple, 0.2)}` }}>CH 2-6</span>
            <span style={{ fontFamily: MONO, fontSize: 20 * S, color: C.muted, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, padding: `${6 * S}px ${16 * S}px`, borderRadius: 8 * S, letterSpacing: "0.04em" }}>跨應用程式串接</span>
          </div>

          {/* Hero Title — 中央大字「API」紫 */}
          <div style={{ marginBottom: 24 * S, ...title, textAlign: "center" }}>
            <h1 style={{ fontFamily: SYNE, fontSize: 220 * S, fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.04em", color: C.purple, margin: 0, display: "inline-block", transform: `scale(${1 + 0.012 * titleBreathe})`, textShadow: `0 0 ${40 + 30 * titleBreathe}px ${hexGlow(C.purple, 0.32 + 0.16 * titleBreathe)}` }}>
              API
            </h1>
          </div>

          {/* Subtitle */}
          <p style={{ fontFamily: TC, fontSize: 36 * S, color: C.muted, lineHeight: 1.5, textAlign: "center", maxWidth: 1400 * S, marginBottom: 36 * S, ...sub }}>
            跨應用程式、<Disp style={{ color: C.purple }}>串接時要用</Disp>的東西
          </p>

          {/* Connector from previous */}
          <div style={{ ...conn, display: "flex", alignItems: "center", gap: 14 * S, fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.10em", marginBottom: 44 * S, flexWrap: "wrap", justifyContent: "center", maxWidth: 1600 * S }}>
            <span style={{ display: "inline-block", width: 30 * S, height: 1, background: C.faint }} />
            上集 <span style={{ color: C.faint }}>→</span> <Disp style={{ color: C.green }}>前端後端</Disp>
            <span style={{ color: C.faint }}>→</span> <Disp style={{ color: C.green }}>請求—回應</Disp>
            <span style={{ color: C.faint }}>→</span> <Disp style={{ color: C.purple }}>這集深入聊 API</Disp>
            <span style={{ display: "inline-block", width: 30 * S, height: 1, background: C.faint }} />
          </div>

          {/* 3 Questions stagger */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 * S, width: "100%", maxWidth: 1400 * S }}>
            {[
              { t: "API 到底是什麼？", s: q1, accent: C.purple },
              { t: "怎麼串接 API？", s: q2, accent: C.green },
              { t: "API Key 怎麼保管？", s: q3, accent: C.red },
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
// SCENE 1.1 — 生活中的 API 4 情境（2×2 grid stagger + Insight）
// global range 787–1763 | dur 977 | SEG_START=787
// VTT cues: 28s "Google 帳號" / 34s "行動支付" / 38s "天氣 APP" / 48s "工作人員已知資料" / 54s "其實背後都是 API"
// overlays: SubKicker F0 | LifeGrid F113→713 (4 items stagger) | Insight F713→end
// ═════════════════════════════════════════════════════════════════════════════
const Scene11LifeAPIExamples: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[1];

  // local = global - 787
  // visual-spec: 4 items from 900,1080,1260,1440 global → 113,293,473,653 local
  // Insight: 1500 global → 713 local
  const i1Start = 113;
  const i2Start = 293;
  const i3Start = 473;
  const i4Start = 653;
  const insightStart = 713;

  const gridFade = useBlockFade(insightStart - 30);

  const item1 = useFadeUpElastic(i1Start);
  const item2 = useFadeUpElastic(i2Start);
  const item3 = useFadeUpElastic(i3Start);
  const item4 = useFadeUpElastic(i4Start);
  const insight = useFadeUp(insightStart);
  const insightLine = useDraw(insightStart + 20, 24);

  const items = [
    { s: item1, start: i1Start, icon: "google",     label: "用 Google 帳號\n登入網站",  hint: "第三方登入 OAuth" },
    { s: item2, start: i2Start, icon: "phone-pay",  label: "結帳時直接選\n行動支付",     hint: "支付服務 API" },
    { s: item3, start: i3Start, icon: "cloud-sun",  label: "天氣 App 顯示\n氣溫降雨機率",  hint: "氣象資料 API" },
    { s: item4, start: i4Start, icon: "form-check", label: "報名表單填一次\n現場已有資料",  hint: "表單同步 API" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.purple} />
        <ProgressBar progressPct={PROGRESS_PCT[1]} accent={C.purple} />
        <SceneWrap>
          <SubKicker text="你每天都在用 API，只是不知道" startFrame={0} accent={C.purple} />

          {/* 2×2 Grid */}
          {frame < insightStart - 6 && (
            <div style={{ opacity: gridFade, marginTop: 16 * S }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 * S }}>
                {items.map(({ s, start, icon, label, hint }) => (
                  frame >= start - 6 && (
                    <div key={icon} style={{ ...s, background: C.surface, border: `1.5px solid ${hexGlow(C.purple, 0.32)}`, borderRadius: 22 * S, padding: `${28 * S}px ${32 * S}px`, display: "flex", alignItems: "center", gap: 24 * S }}>
                      <div style={{ width: 120 * S, height: 120 * S, borderRadius: 22 * S, background: hexGlow(C.purple, 0.12), border: `2px solid ${hexGlow(C.purple, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <LI name={icon} size={66 * S} color={C.purple} sw={2} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: TC, fontSize: 30 * S, color: C.text, fontWeight: 700, lineHeight: 1.4, whiteSpace: "pre-line", marginBottom: 8 * S }}>{label}</div>
                        <div style={{ fontFamily: MONO, fontSize: 20 * S, color: C.purple, letterSpacing: "0.06em" }}>{hint}</div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Insight */}
          {frame >= insightStart - 6 && (
            <div style={{ ...insight, marginTop: 60 * S, textAlign: "center", background: hexGlow(C.purple, 0.07), border: `2px solid ${hexGlow(C.purple, 0.4)}`, borderRadius: 24 * S, padding: `${48 * S}px ${50 * S}px` }}>
              <Disp style={{ fontSize: 22 * S, color: C.purple, letterSpacing: "0.2em", display: "block", marginBottom: 22 * S }}>INSIGHT</Disp>
              <div style={{ fontFamily: TC, fontSize: 52 * S, fontWeight: 800, color: C.text, lineHeight: 1.4, marginBottom: 18 * S }}>
                這些看似<Disp style={{ color: C.muted }}>理所當然</Disp>的事
              </div>
              <div style={{ fontFamily: TC, fontSize: 44 * S, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 24 * S }}>
                背後都是 <Disp style={{ color: C.purple }}>API</Disp> 在幫你完成
              </div>
              <div style={{ height: 4 * S, background: C.purple, borderRadius: 99, maxWidth: 280 * S, margin: "0 auto", boxShadow: `0 0 16px ${hexGlow(C.purple, 0.5)}`, transformOrigin: "center", transform: `scaleX(${insightLine})` }} />
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 1.2 — API = 橋樑 + 銀行表格類比
// global range 1764–3678 | dur 1915 | SEG_START=1764
// VTT cues: 1764=0 "API 是什麼" | 1914=150 "API 就是一座橋樑" | 2055=291 "Application Programming Interface"
//          2421=657 "API 像是一個橋樑" | 2713=949 "舉個例子來說 銀行開戶" | 3478=1714 "API 是讓兩個不同軟體溝通"
// overlays:
//   SectionHeader F0 | DefinitionBig F136→ | BankAnalogy F836→1690 | FinalDef F1706→end
// ═════════════════════════════════════════════════════════════════════════════
const Scene12APIDefinition: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[2];
  // 1900 global → 136 local（"API 就是一座橋樑"）
  const defStart = 136;
  // 2600 global → 836 local（銀行表格類比）
  const bankStart = 836;
  // 3470 global → 1706 local（FinalDef）
  const finStart = 1706;

  const defFade = useBlockFade(bankStart - 30);
  const bankFade = useBlockFade(finStart - 30);

  const defBig = useFadeUpHeader(defStart);
  const defSub = useFadeUp(defStart + 60);
  const defTrans = useFadeUp(defStart + 180);
  const defTag = useFadeUp(defStart + 320);
  const bridge = useBreathe(60);

  const bankHeader = useFadeUpHeader(bankStart);
  const bankLeft = useFadeUpElastic(bankStart + 60);
  const bankRight = useFadeUpElastic(bankStart + 180);
  const bankPunch = useFadeUp(bankStart + 540);

  const fin = useFadeUpElastic(finStart);
  const finLine = useDraw(finStart + 20, 28);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.purple} />
        <ProgressBar progressPct={PROGRESS_PCT[2]} accent={C.purple} />
        <SceneWrap>
          <SectionHeader num="01" title="API 是什麼？" startFrame={0} accent={C.purple} />

          {/* Definition Big */}
          {frame < bankStart - 6 && (
            <div style={{ opacity: defFade, marginTop: 24 * S, textAlign: "center" }}>
              <div style={{ ...defBig, marginBottom: 28 * S }}>
                <Disp style={{ fontSize: 22 * S, color: C.purple, letterSpacing: "0.22em", display: "block", marginBottom: 18 * S }}>DEFINITION</Disp>
                <div style={{ fontFamily: TC, fontSize: 88 * S, fontWeight: 900, color: C.text, lineHeight: 1.2, transform: `scale(${1 + 0.005 * bridge})`, textShadow: `0 0 ${20 + 12 * bridge}px ${hexGlow(C.purple, 0.16 + 0.08 * bridge)}` }}>
                  API = <Disp style={{ color: C.purple }}>橋樑</Disp>
                </div>
              </div>
              <div style={{ ...defSub, marginBottom: 20 * S, fontFamily: SYNE, fontSize: 36 * S, fontWeight: 700, color: C.purple, letterSpacing: "0.02em" }}>
                Application Programming Interface
              </div>
              <div style={{ ...defTrans, marginBottom: 26 * S, fontFamily: TC, fontSize: 26 * S, color: C.muted, lineHeight: 1.6 }}>
                中文：應用程式介面 — 但翻成中文反而難懂，直接說 <Disp style={{ color: C.text }}>API</Disp> 就好
              </div>
              <div style={{ ...defTag, fontFamily: TC, fontSize: 32 * S, color: C.text, lineHeight: 1.5, maxWidth: 1400 * S, margin: "0 auto", paddingLeft: 18 * S, borderLeft: `3px solid ${hexGlow(C.purple, 0.6)}`, textAlign: "left", display: "inline-block" }}>
                讓不同應用程式可以<Disp style={{ color: C.purple }}>互相說話</Disp>、互相<Disp style={{ color: C.purple }}>交換資料</Disp>
              </div>
            </div>
          )}

          {/* Bank Analogy */}
          {frame >= bankStart - 6 && frame < finStart - 6 && (
            <div style={{ opacity: bankFade, marginTop: 14 * S }}>
              <div style={{ ...bankHeader, marginBottom: 20 * S, textAlign: "center" }}>
                <Disp style={{ fontSize: 22 * S, color: C.purple, letterSpacing: "0.2em", display: "block", marginBottom: 12 * S }}>ANALOGY · 銀行開戶表格</Disp>
                <div style={{ fontFamily: TC, fontSize: 40 * S, fontWeight: 700, color: C.text }}>
                  每家銀行的表格<Disp style={{ color: C.purple }}>都不一樣</Disp>
                </div>
              </div>
              <div style={{ display: "flex", gap: 22 * S }}>
                {[
                  { s: bankLeft, title: "銀行 A 的表格", items: ["欄位 X", "欄位 Y", "格式 Z"] },
                  { s: bankRight, title: "銀行 B 的表格", items: ["欄位 P", "欄位 Q", "格式 R"] },
                ].map(({ s, title, items }) => (
                  <div key={title} style={{ ...s, flex: 1, background: hexGlow(C.muted, 0.04), border: `2px solid ${C.border}`, borderRadius: 22 * S, padding: `${28 * S}px ${30 * S}px` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 18 * S }}>
                      <LI name="file" size={48 * S} color={C.muted} />
                      <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, fontWeight: 700 }}>{title}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
                      {items.map(t => (
                        <div key={t} style={{ display: "flex", alignItems: "center", gap: 12 * S, fontFamily: MONO, fontSize: 26 * S, color: C.muted, background: hexGlow(C.muted, 0.03), border: `1px solid ${C.border}`, borderRadius: 8 * S, padding: `${10 * S}px ${18 * S}px` }}>
                          <span style={{ width: 10 * S, height: 10 * S, background: C.muted, opacity: 0.5 }} />
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* Punchline */}
              {frame >= bankStart + 540 - 6 && (
                <div style={{ ...bankPunch, marginTop: 30 * S, background: hexGlow(C.purple, 0.07), border: `1.5px solid ${hexGlow(C.purple, 0.4)}`, borderRadius: 18 * S, padding: `${26 * S}px ${36 * S}px`, textAlign: "center" }}>
                  <div style={{ fontFamily: TC, fontSize: 34 * S, fontWeight: 700, color: C.text, lineHeight: 1.5 }}>
                    <Disp style={{ color: C.purple }}>API</Disp> 就是定義「兩個系統怎麼說話」的<Disp style={{ color: C.purple }}>規則</Disp>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Final Definition */}
          {frame >= finStart - 6 && (
            <div style={{ ...fin, marginTop: 50 * S, textAlign: "center" }}>
              <div style={{ background: `linear-gradient(135deg, ${hexGlow(C.purple, 0.08)}, ${hexGlow(C.purple, 0.04)})`, border: `2.5px solid ${hexGlow(C.purple, 0.5)}`, borderRadius: 28 * S, padding: `${44 * S}px ${52 * S}px` }}>
                <Disp style={{ fontSize: 22 * S, color: C.purple, letterSpacing: "0.2em", display: "block", marginBottom: 22 * S }}>FINAL · API</Disp>
                <div style={{ fontFamily: TC, fontSize: 44 * S, fontWeight: 800, color: C.text, lineHeight: 1.5 }}>
                  讓兩個不同軟體<Disp style={{ color: C.purple }}>互相溝通</Disp>、<Disp style={{ color: C.purple }}>交換資料</Disp>的橋樑機制
                </div>
                <div style={{ height: 4 * S, background: C.purple, borderRadius: 99, maxWidth: 320 * S, margin: `${22 * S}px auto 0`, boxShadow: `0 0 16px ${hexGlow(C.purple, 0.5)}`, transformOrigin: "center", transform: `scaleX(${finLine})` }} />
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
// SCENE 2.1 — API 兩個尺度 + Web API 聚焦
// global range 3679–5904 | dur 2226 | SEG_START=3679
// VTT cues: 4001=322 "兩種使用方式" | 4301=622 "兩個層次" | 4370=691 "抽象層次"
//          4798=1119 "具體層次" | 5444=1765 "本單元聚焦 Web API"
// overlays: SectionHeader F0 | TwoScalesSplit F171→1671 | FocusCard F1671→end
// ═════════════════════════════════════════════════════════════════════════════
const Scene21TwoScales: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[3];
  // 3850 → 171 (TwoScales)
  const splitStart = 171;
  // 5350 → 1671 (FocusCard)
  const focusStart = 1671;

  const splitFade = useBlockFade(focusStart - 30);
  const leftHeader = useFadeUpHeader(splitStart);
  const leftCard = useFadeUpElastic(splitStart + 60);
  const rightHeader = useFadeUpHeader(splitStart + 400);
  const rightCard = useFadeUpElastic(splitStart + 460);

  const focus = useFadeUpElastic(focusStart);
  const focusBreathe = useBreathe(70);
  const focusList1 = useFadeUpItem(focusStart + 90);
  const focusList2 = useFadeUpItem(focusStart + 150);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.purple} />
        <ProgressBar progressPct={PROGRESS_PCT[3]} accent={C.purple} />
        <SceneWrap>
          <SectionHeader num="02" title="API 有兩個尺度" startFrame={0} accent={C.purple} />

          {/* Two Scales Split */}
          {frame < focusStart - 6 && (
            <div style={{ opacity: splitFade, marginTop: 16 * S }}>
              <div style={{ display: "flex", gap: 24 * S, alignItems: "stretch" }}>
                {/* Left — 抽象 */}
                <div style={{ flex: 1 }}>
                  <div style={{ ...leftHeader, fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.16em", marginBottom: 18 * S }}>
                    01 · 抽象層次
                  </div>
                  <div style={{ ...leftCard, background: hexGlow(C.muted, 0.05), border: `2px solid ${C.border}`, borderRadius: 22 * S, padding: `${30 * S}px ${32 * S}px`, minHeight: 480 * S }}>
                    <div style={{ width: 108 * S, height: 108 * S, borderRadius: 22 * S, background: hexGlow(C.purple, 0.06), border: `2px solid ${hexGlow(C.purple, 0.32)}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 * S }}>
                      <LI name="cloud-abstract" size={64 * S} color={C.purpleDim} sw={1.8} />
                    </div>
                    <Disp style={{ fontFamily: SYNE, fontSize: 40 * S, color: C.text, display: "block", marginBottom: 14 * S }}>通用能力</Disp>
                    <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted, lineHeight: 1.6 }}>
                      技術概念 — 泛指讓不同軟體可以<span style={{ color: C.text }}>互相溝通</span>的機制
                    </div>
                  </div>
                </div>

                {/* Divider with VS */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 60 * S }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S }}>
                    <div style={{ width: 1, height: 80 * S, background: C.border }} />
                    <Disp style={{ fontFamily: SYNE, fontSize: 24 * S, color: C.muted, letterSpacing: "0.15em" }}>VS</Disp>
                    <div style={{ width: 1, height: 80 * S, background: C.border }} />
                  </div>
                </div>

                {/* Right — 具體 */}
                <div style={{ flex: 1 }}>
                  <div style={{ ...rightHeader, fontFamily: MONO, fontSize: 22 * S, color: C.purple, letterSpacing: "0.16em", marginBottom: 18 * S }}>
                    02 · 具體層次
                  </div>
                  <div style={{ ...rightCard, background: hexGlow(C.purple, 0.08), border: `2px solid ${hexGlow(C.purple, 0.5)}`, borderRadius: 22 * S, padding: `${30 * S}px ${32 * S}px`, minHeight: 480 * S, boxShadow: `0 0 40px ${hexGlow(C.purple, 0.15)}` }}>
                    <div style={{ width: 108 * S, height: 108 * S, borderRadius: 22 * S, background: hexGlow(C.purple, 0.16), border: `2px solid ${hexGlow(C.purple, 0.6)}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 * S }}>
                      <LI name="plug" size={64 * S} color={C.purple} sw={1.8} />
                    </div>
                    <Disp style={{ fontFamily: SYNE, fontSize: 40 * S, color: C.purple, display: "block", marginBottom: 14 * S }}>特定服務</Disp>
                    <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, lineHeight: 1.6 }}>
                      「我要<Disp style={{ color: C.purple }}>串接 XX 平台</Disp>的 API」<br />
                      用程式遵循那個平台定義的<Disp style={{ color: C.purple }}>規則</Disp>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Focus Card — Web API 橘 */}
          {frame >= focusStart - 6 && (
            <div style={{ ...focus, marginTop: 50 * S }}>
              <div style={{ background: `linear-gradient(135deg, ${hexGlow(C.orange, 0.10)}, ${hexGlow(C.orange, 0.04)})`, border: `3px solid ${hexGlow(C.orange, 0.5)}`, borderRadius: 28 * S, padding: `${44 * S}px ${52 * S}px`, boxShadow: `0 0 ${50 + 30 * focusBreathe}px ${hexGlow(C.orange, 0.2 + 0.08 * focusBreathe)}`, textAlign: "center" }}>
                <Disp style={{ fontSize: 24 * S, color: C.orange, letterSpacing: "0.18em", display: "block", marginBottom: 22 * S }}>本集聚焦</Disp>
                <div style={{ fontFamily: TC, fontSize: 76 * S, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 24 * S }}>
                  <Disp style={{ color: C.orange }}>Web API</Disp>
                </div>
                <div style={{ ...focusList1, fontFamily: TC, fontSize: 30 * S, color: C.text, lineHeight: 1.6, marginBottom: 12 * S, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 * S }}>
                  <LI name="globe" size={36 * S} color={C.orange} sw={2} />
                  透過<Disp style={{ color: C.orange }}>網路</Disp>傳資料
                </div>
                <div style={{ ...focusList2, fontFamily: TC, fontSize: 30 * S, color: C.text, lineHeight: 1.6, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 * S }}>
                  <LI name="bolt" size={36 * S} color={C.orange} sw={2} />
                  開發時<Disp style={{ color: C.orange }}>最常串接</Disp>的就是它
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
// SCENE 3.1 — 串接 API 三大步驟（前 2 step + 神燈精靈）
// global range 5905–8896 | dur 2992 | SEG_START=5905
// VTT cues: 6311=406 "三個步驟" | 6460=555 "第一個步驟 確認可行性"
//           7682=1777 "第二步 API Key" | 8407=2502 "神燈精靈" | 8721=2816 "一步一步教你"
// overlays: SectionHeader F0 | Step1 F195 | Step2 F1195 | MagicLamp F2195
// ═════════════════════════════════════════════════════════════════════════════
const Scene31IntegrateSteps12: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[4];
  // 6100→195, 7100→1195, 8100→2195
  const s1Start = 195;
  const s2Start = 1195;
  const s3Start = 2195;

  const s1 = useFadeUpElastic(s1Start);
  const s1Tip = useFadeUp(s1Start + 90);
  const s1Detail = useFadeUp(s1Start + 200);

  const s2 = useFadeUpElastic(s2Start);
  const s2Tip = useFadeUp(s2Start + 90);
  const s2Detail = useFadeUp(s2Start + 200);

  const s3 = useFadeUpElastic(s3Start);
  const s3Tip = useFadeUp(s3Start + 120);
  const s3LampBreathe = useBreathe(50);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[4]} accent={C.green} />
        <SceneWrap>
          <SectionHeader num="03" title="串接 API 的三大步驟" startFrame={0} accent={C.green} />

          {/* Step Timeline 3 items vertical */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22 * S, marginTop: 14 * S }}>
            {/* Step 1 */}
            {frame >= s1Start - 6 && (
              <div style={{ ...s1, display: "flex", gap: 22 * S, background: C.surface, border: `1.5px solid ${hexGlow(C.green, 0.32)}`, borderLeft: `5px solid ${C.green}`, borderRadius: 18 * S, padding: `${24 * S}px ${30 * S}px` }}>
                <div style={{ width: 100 * S, height: 100 * S, borderRadius: 20 * S, background: hexGlow(C.green, 0.12), border: `2px solid ${hexGlow(C.green, 0.5)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 * S, flexShrink: 0 }}>
                  <Disp style={{ fontFamily: SYNE, fontSize: 22 * S, color: C.green, letterSpacing: "0.1em" }}>STEP</Disp>
                  <Disp style={{ fontFamily: SYNE, fontSize: 40 * S, color: C.green, lineHeight: 1 }}>1</Disp>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 10 * S }}>
                    <LI name="search" size={42 * S} color={C.green} sw={2} />
                    <Disp style={{ fontFamily: SYNE, fontSize: 34 * S, color: C.text }}>確認可行性</Disp>
                  </div>
                  <div style={{ ...s1Detail, fontFamily: TC, fontSize: 26 * S, color: C.text, lineHeight: 1.5, marginBottom: 8 * S }}>
                    搜尋 <Disp style={{ color: C.green }}>「服務名 + API Docs」</Disp> 找官方文件
                  </div>
                  <div style={{ ...s1Tip, fontFamily: TC, fontSize: 22 * S, color: C.muted, lineHeight: 1.5 }}>
                    用<span style={{ color: C.text }}>英文</span>搜尋更準；文件不用認真讀，<span style={{ color: C.text }}>有看到就好</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {frame >= s2Start - 6 && (
              <div style={{ ...s2, display: "flex", gap: 22 * S, background: C.surface, border: `1.5px solid ${hexGlow(C.green, 0.32)}`, borderLeft: `5px solid ${C.green}`, borderRadius: 18 * S, padding: `${24 * S}px ${30 * S}px` }}>
                <div style={{ width: 100 * S, height: 100 * S, borderRadius: 20 * S, background: hexGlow(C.green, 0.12), border: `2px solid ${hexGlow(C.green, 0.5)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 * S, flexShrink: 0 }}>
                  <Disp style={{ fontFamily: SYNE, fontSize: 22 * S, color: C.green, letterSpacing: "0.1em" }}>STEP</Disp>
                  <Disp style={{ fontFamily: SYNE, fontSize: 40 * S, color: C.green, lineHeight: 1 }}>2</Disp>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 10 * S }}>
                    <LI name="key" size={42 * S} color={C.green} sw={2} />
                    <Disp style={{ fontFamily: SYNE, fontSize: 34 * S, color: C.text }}>準備 API Key</Disp>
                  </div>
                  <div style={{ ...s2Detail, fontFamily: TC, fontSize: 26 * S, color: C.text, lineHeight: 1.5, marginBottom: 8 * S }}>
                    後台「<Disp style={{ color: C.green }}>生成金鑰</Disp>」取得 API Key
                  </div>
                  <div style={{ ...s2Tip, fontFamily: TC, fontSize: 22 * S, color: C.muted, lineHeight: 1.5 }}>
                    別名：<span style={{ fontFamily: MONO, color: C.text }}>Token</span> / <span style={{ fontFamily: MONO, color: C.text }}>Secret</span> — 同樣的意思
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 helper — Magic Lamp */}
            {frame >= s3Start - 6 && (
              <div style={{ ...s3, display: "flex", gap: 22 * S, background: hexGlow(C.yellow, 0.08), border: `1.5px solid ${hexGlow(C.yellow, 0.4)}`, borderLeft: `5px solid ${C.yellow}`, borderRadius: 18 * S, padding: `${24 * S}px ${30 * S}px` }}>
                <div style={{ width: 100 * S, height: 100 * S, borderRadius: 20 * S, background: hexGlow(C.yellow, 0.18), border: `2px solid ${hexGlow(C.yellow, 0.6)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 ${24 + 12 * s3LampBreathe}px ${hexGlow(C.yellow, 0.32 + 0.1 * s3LampBreathe)}` }}>
                  <LI name="magic-lamp" size={56 * S} color={C.yellow} sw={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, fontWeight: 700, marginBottom: 10 * S }}>
                    別怕找不到 → 請<Disp style={{ color: C.yellow }}>AI 一步一步教你</Disp>
                  </div>
                  <div style={{ ...s3Tip, fontFamily: TC, fontSize: 24 * S, color: C.muted, lineHeight: 1.5 }}>
                    「<span style={{ color: C.yellow, fontWeight: 600 }}>一步一步</span>」這四個字非常好用 — 把需求告訴 AI，它會帶你設定
                  </div>
                </div>
              </div>
            )}
          </div>
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 3.2 — Step 3 AI 生成 + 工程師對話泡泡 + 一步一步金句
// global range 8897–10978 | dur 2082 | SEG_START=8897
// VTT cues: 8897=0 "第三步 AI 生成" | 9542=645 "工程師小撇步"
//           9992=1095 "AI 我可以拿到資料嗎" | 10307=1410 "幫我串好吧" | 10607=1710 "一步一步來"
// overlays: StepBigCard F0 | EngineerTip F603→1603 (dialog stagger) | ProtipNote F1653→end
// ═════════════════════════════════════════════════════════════════════════════
const Scene32IntegrateStep3: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[5];
  const cardStart = 0;
  const dialogStart = 603;
  const proStart = 1653;

  const cardFade = useBlockFade(dialogStart - 30);
  const dialogFade = useBlockFade(proStart - 30);

  const card = useFadeUpHeader(cardStart);
  const cardIcon = useFadeUpElastic(cardStart + 30);
  const cardDetail = useFadeUp(cardStart + 120);

  const dHeader = useFadeUpHeader(dialogStart);
  const dHeadline = useFadeUp(dialogStart + 80);
  // dialog @ 9700→803, 9950→1053, 10150→1253, 10300→1403
  const m1 = useFadeUpElastic(803);
  const m2 = useFadeUpElastic(1053);
  const m3 = useFadeUpElastic(1253);
  const m4 = useFadeUpElastic(1403);

  const pro = useFadeUpElastic(proStart);

  const messages = [
    { s: m1, start: 803, actor: "你",  align: "left",  msg: "我可以透過這個 API 拿到我資料庫的資料嗎？" },
    { s: m2, start: 1053, actor: "AI", align: "right", msg: "可以！" },
    { s: m3, start: 1253, actor: "你",  align: "left",  msg: "那你幫我串好吧" },
    { s: m4, start: 1403, actor: "AI", align: "right", msg: "生成程式碼 + 下一步指引 →" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[5]} accent={C.green} />
        <SceneWrap>
          {/* Step 3 Big Card */}
          {frame < dialogStart - 6 && (
            <div style={{ opacity: cardFade }}>
              <SubKicker text="步驟 3" startFrame={0} accent={C.green} />
              <div style={{ ...card, background: hexGlow(C.green, 0.08), border: `2.5px solid ${hexGlow(C.green, 0.5)}`, borderRadius: 28 * S, padding: `${44 * S}px ${52 * S}px`, boxShadow: `0 0 30px ${hexGlow(C.green, 0.15)}`, display: "flex", gap: 36 * S, alignItems: "flex-start" }}>
                <div style={{ ...cardIcon, width: 140 * S, height: 140 * S, borderRadius: 26 * S, background: hexGlow(C.green, 0.16), border: `2px solid ${hexGlow(C.green, 0.6)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <LI name="ai-robot" size={80 * S} color={C.green} sw={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Disp style={{ fontSize: 22 * S, color: C.green, letterSpacing: "0.18em", display: "block", marginBottom: 14 * S }}>STEP 03</Disp>
                  <div style={{ fontFamily: TC, fontSize: 56 * S, fontWeight: 800, color: C.text, lineHeight: 1.3, marginBottom: 18 * S }}>
                    <Disp style={{ color: C.green }}>AI 生成</Disp>串接程式碼
                  </div>
                  <div style={{ ...cardDetail, fontFamily: TC, fontSize: 30 * S, color: C.muted, lineHeight: 1.6 }}>
                    把<span style={{ color: C.text }}>需求 + API 文件</span>交給 AI → 它會寫出程式碼 + 告訴你<span style={{ color: C.text }}>貼到哪</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Engineer Tip + dialog */}
          {frame >= dialogStart - 6 && frame < proStart - 6 && (
            <div style={{ opacity: dialogFade }}>
              <div style={{ ...dHeader, fontFamily: MONO, fontSize: 22 * S, color: C.green, letterSpacing: "0.18em", marginBottom: 14 * S }}>
                工程師小撇步
              </div>
              <div style={{ ...dHeadline, fontFamily: TC, fontSize: 38 * S, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 26 * S }}>
                先確認<Disp style={{ color: C.green }}>資料有串起來</Disp>，不要一開始就求功能完整
              </div>
              {/* Dialog bubbles */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 * S }}>
                {messages.map(({ s, start, actor, align, msg }) => (
                  frame >= start - 6 && (
                    <div key={start} style={{ ...s, display: "flex", justifyContent: align === "left" ? "flex-start" : "flex-end" }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 14 * S, flexDirection: align === "left" ? "row" : "row-reverse", maxWidth: 1100 * S }}>
                        <div style={{ width: 64 * S, height: 64 * S, borderRadius: 99, background: actor === "AI" ? hexGlow(C.green, 0.18) : hexGlow(C.muted, 0.12), border: `1.5px solid ${actor === "AI" ? hexGlow(C.green, 0.5) : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {actor === "AI"
                            ? <LI name="ai-robot" size={36 * S} color={C.green} sw={2.2} />
                            : <LI name="user"     size={36 * S} color={C.muted} sw={2.2} />}
                        </div>
                        <div style={{ background: actor === "AI" ? hexGlow(C.green, 0.10) : C.surface, border: `1.5px solid ${actor === "AI" ? hexGlow(C.green, 0.4) : C.border}`, borderRadius: 18 * S, padding: `${18 * S}px ${24 * S}px` }}>
                          <div style={{ fontFamily: MONO, fontSize: 20 * S, color: actor === "AI" ? C.green : C.muted, marginBottom: 6 * S, letterSpacing: "0.06em" }}>{actor}</div>
                          <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.text, lineHeight: 1.45 }}>{msg}</div>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Protip Note — 一步一步來 */}
          {frame >= proStart - 6 && (
            <div style={{ ...pro, marginTop: 60 * S, textAlign: "center" }}>
              <div style={{ background: hexGlow(C.green, 0.07), border: `2px solid ${hexGlow(C.green, 0.4)}`, borderRadius: 24 * S, padding: `${44 * S}px ${52 * S}px` }}>
                <Disp style={{ fontSize: 22 * S, color: C.green, letterSpacing: "0.2em", display: "block", marginBottom: 22 * S }}>提醒</Disp>
                <div style={{ fontFamily: TC, fontSize: 48 * S, fontWeight: 800, color: C.text, lineHeight: 1.4 }}>
                  這幾個步驟<Disp style={{ color: C.green }}>會來回幾次</Disp> — 有點耐心，<Disp style={{ color: C.green }}>一步一步來</Disp>
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
// SCENE 4.1 — 幽默吐槽 + 卡關正常 + 3 策略 teaser
// global range 10979–11999 | dur 1021 | SEG_START=10979
// VTT cues: 11055=76 "講的都很簡單" | 11186=207 "老實說" | 11316=337 "後台闖關"
//           11524=545 "AI 是舊版" | 11739=760 "卡關很正常" | 11837=858 "三個策略"
// overlays: SectionHeader F0 | HumorKicker F121 | WhyStuck F571 | Teaser F871
// ═════════════════════════════════════════════════════════════════════════════
const Scene41StuckIntro: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[6];
  const humorStart = 121;     // 11100→121
  const whyStart = 571;       // 11550→571
  const teaserStart = 871;    // 11850→871

  const humor = useFadeUpElastic(humorStart);
  const why = useFadeUpElastic(whyStart);
  const teaser = useFadeUpHeader(teaserStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.yellow} />
        <ProgressBar progressPct={PROGRESS_PCT[6]} accent={C.yellow} />
        <SceneWrap>
          <SectionHeader num="04" title="串接卡住了？三個策略輪流試" startFrame={0} accent={C.yellow} />

          {/* Humor Kicker — 站著說話不腰疼 */}
          <div style={{ ...humor, marginTop: 14 * S, display: "flex", gap: 22 * S, background: hexGlow(C.yellow, 0.06), border: `1.5px solid ${hexGlow(C.yellow, 0.32)}`, borderRadius: 20 * S, padding: `${24 * S}px ${30 * S}px`, alignItems: "center" }}>
            <div style={{ width: 96 * S, height: 96 * S, borderRadius: 99, background: hexGlow(C.yellow, 0.16), border: `2px solid ${hexGlow(C.yellow, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <LI name="thinking" size={52 * S} color={C.yellow} sw={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 20 * S, color: C.yellow, letterSpacing: "0.16em", marginBottom: 8 * S }}>你可能想吐槽我</div>
              <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, lineHeight: 1.5, fontWeight: 600 }}>
                「講的都很簡單，但<Disp style={{ color: C.yellow }}>卡關</Disp>怎麼辦？」
              </div>
            </div>
          </div>

          {/* Why Stuck Note */}
          {frame >= whyStart - 6 && (
            <div style={{ ...why, marginTop: 30 * S, padding: `${24 * S}px ${30 * S}px`, background: hexGlow(C.muted, 0.05), border: `1px solid ${C.border}`, borderLeft: `4px solid ${hexGlow(C.muted, 0.6)}`, borderRadius: 14 * S }}>
              <Disp style={{ fontFamily: SYNE, fontSize: 22 * S, color: C.muted, letterSpacing: "0.16em", display: "block", marginBottom: 12 * S }}>WHY STUCK</Disp>
              <div style={{ fontFamily: TC, fontSize: 30 * S, color: C.text, lineHeight: 1.6 }}>
                API 串接像在<span style={{ color: C.yellow }}>後台闖關</span> — 介面常改版 → AI 教的可能是<span style={{ color: C.yellow }}>舊版</span>操作
              </div>
            </div>
          )}

          {/* 3 Strategies Teaser */}
          {frame >= teaserStart - 6 && (
            <div style={{ ...teaser, marginTop: 38 * S, textAlign: "center", fontFamily: TC, fontSize: 36 * S, fontWeight: 700, color: C.text }}>
              三個策略，<Disp style={{ color: C.yellow }}>輪流試試看</Disp> →
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 4.2 — 3 strategy cards + 原則 punchline
// global range 12000–14538 | dur 2539 | SEG_START=12000
// VTT cues: 12000=0 "策略 1 搜尋成功案例" | 12683=683 "策略 2 貼文件給 AI"
//           13572=1572 "策略 3 貼程式碼" | 14277=2277 "所以總而言之" | 14370=2370 "提供更多文件範例"
// overlays: 3 cards stagger F100/900/1700 + Principle F2250→end
// ═════════════════════════════════════════════════════════════════════════════
const Scene42StuckStrategies: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[7];
  // 12100→100, 12900→900, 13700→1700
  const s1Start = 100;
  const s2Start = 900;
  const s3Start = 1700;
  const principleStart = 2250;

  const cardsFade = useBlockFade(principleStart - 30);
  const c1 = useFadeUpElastic(s1Start);
  const c1Why = useFadeUp(s1Start + 130);
  const c2 = useFadeUpElastic(s2Start);
  const c2Why = useFadeUp(s2Start + 130);
  const c3 = useFadeUpElastic(s3Start);
  const c3Why = useFadeUp(s3Start + 130);
  const principle = useFadeUpElastic(principleStart);
  const principleLine = useDraw(principleStart + 20, 24);

  const cards = [
    { s: c1, sw: c1Why, start: s1Start, num: 1, icon: "search",     title: "搜尋成功案例",
      what: "搜「服務 A + 服務 B + 串接」，中/英文都試", why: "驗證可行性 + 找對方向" },
    { s: c2, sw: c2Why, start: s2Start, num: 2, icon: "file-paste", title: "把 API 文件貼給 AI",
      what: "從官方 API Docs 找對應段落 → 翻譯 → 貼給 AI", why: "AI 不靠訓練資料猜，看實際內容" },
    { s: c3, sw: c3Why, start: s3Start, num: 3, icon: "code-paste", title: "把程式碼範例貼給 AI",
      what: "從成功案例找別人寫好的程式碼 → 貼給 AI 修改", why: "重點是「程式碼」不是文章說明！" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.yellow} />
        <ProgressBar progressPct={PROGRESS_PCT[7]} accent={C.yellow} />
        <SceneWrap>
          <SubKicker text="卡關 3 策略" startFrame={0} accent={C.yellow} />

          {/* 3 Strategy Cards */}
          {frame < principleStart - 6 && (
            <div style={{ opacity: cardsFade, display: "flex", flexDirection: "column", gap: 18 * S, marginTop: 10 * S }}>
              {cards.map(({ s, sw, start, num, icon, title, what, why }) => (
                frame >= start - 6 && (
                  <div key={num} style={{ ...s, display: "flex", gap: 22 * S, background: C.surface, border: `1.5px solid ${hexGlow(C.yellow, 0.32)}`, borderLeft: `5px solid ${C.yellow}`, borderRadius: 18 * S, padding: `${22 * S}px ${30 * S}px` }}>
                    <div style={{ width: 92 * S, height: 92 * S, borderRadius: 18 * S, background: hexGlow(C.yellow, 0.16), border: `2px solid ${hexGlow(C.yellow, 0.6)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 * S, flexShrink: 0 }}>
                      <Disp style={{ fontFamily: SYNE, fontSize: 18 * S, color: C.yellow, letterSpacing: "0.1em" }}>策略</Disp>
                      <Disp style={{ fontFamily: SYNE, fontSize: 40 * S, color: C.yellow, lineHeight: 1 }}>{num}</Disp>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 10 * S }}>
                        <LI name={icon} size={40 * S} color={C.yellow} sw={2} />
                        <Disp style={{ fontFamily: SYNE, fontSize: 32 * S, color: C.text }}>{title}</Disp>
                      </div>
                      <div style={{ fontFamily: TC, fontSize: 26 * S, color: C.text, lineHeight: 1.5, marginBottom: 6 * S }}>
                        <span style={{ color: C.yellow, fontWeight: 700 }}>What：</span>{what}
                      </div>
                      <div style={{ ...sw, fontFamily: TC, fontSize: 24 * S, color: C.muted, lineHeight: 1.5 }}>
                        <span style={{ color: C.yellow, fontWeight: 700 }}>Why：</span>{why}
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Principle punchline */}
          {frame >= principleStart - 6 && (
            <div style={{ ...principle, marginTop: 50 * S, textAlign: "center" }}>
              <div style={{ background: hexGlow(C.green, 0.07), border: `2.5px solid ${hexGlow(C.green, 0.5)}`, borderRadius: 26 * S, padding: `${44 * S}px ${52 * S}px` }}>
                <Disp style={{ fontSize: 24 * S, color: C.green, letterSpacing: "0.2em", display: "block", marginBottom: 22 * S }}>原則</Disp>
                <div style={{ fontFamily: TC, fontSize: 44 * S, fontWeight: 800, color: C.text, lineHeight: 1.5 }}>
                  失敗就<Disp style={{ color: C.green }}>提供更多文件 / 範例</Disp>給 AI，增加成功機率
                </div>
                <div style={{ height: 4 * S, background: C.green, borderRadius: 99, maxWidth: 300 * S, margin: `${22 * S}px auto 0`, boxShadow: `0 0 16px ${hexGlow(C.green, 0.5)}`, transformOrigin: "center", transform: `scaleX(${principleLine})` }} />
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
// SCENE 5.1 — API Key = 密碼 ×3（紅大字 punchline）+ 數千萬美元損失警告卡
// global range 14539–16316 | dur 1778 | SEG_START=14539
// VTT cues: 14939=400 "API = 密碼" | 15008=469 "是密碼 是密碼" | 15041=502 "很重要 說三次"
//           15571=1032 "拿到 = 直接用權限" | 15675=1136 "知名第三方工具案例" | 15953=1414 "數千萬美元損失"
// overlays: SectionHeader F0 紅 | TriplePunchline F161/411/661 (3 行 stagger) + lock breathe
//           DisasterCaseCard F1061→end
// ═════════════════════════════════════════════════════════════════════════════
const Scene51APIKeyWarning: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[8];
  // 14700→161 (kicker), 14950→411 (line1), 15200→661 (line2/3 settle)
  // 14939=400 第一行；15041=502 第二行；15172=633 第三行（簡化 stagger）
  const kickerStart = 161;
  const line1Start = 400;
  const line2Start = 502;
  const line3Start = 633;
  const punchStart = 800;
  // 15600 global → 1061 local (disaster card)
  const disasterStart = 1061;

  const punchFade = useBlockFade(disasterStart - 30);

  const kicker = useFadeUpHeader(kickerStart);
  const lock = useFadeUpElastic(kickerStart + 60);
  const lockBreathe = useBreathe(40);
  const l1 = useFadeUpElastic(line1Start);
  const l2 = useFadeUpElastic(line2Start);
  const l3 = useFadeUpElastic(line3Start);
  const punch = useFadeUp(punchStart);

  const disaster = useFadeUpElastic(disasterStart);
  const disasterStat = useFadeUpElastic(disasterStart + 100);
  const disasterExp = useFadeUp(disasterStart + 220);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.red} />
        <ProgressBar progressPct={PROGRESS_PCT[8]} accent={C.red} />
        <SceneWrap>
          <SectionHeader num="05" title="API Key 安全守則 — 這部分很重要" startFrame={0} accent={C.red} />

          {/* Triple punchline + Lock */}
          {frame < disasterStart - 6 && (
            <div style={{ opacity: punchFade, marginTop: 14 * S, textAlign: "center" }}>
              <div style={{ ...kicker, fontFamily: MONO, fontSize: 22 * S, color: C.red, letterSpacing: "0.18em", marginBottom: 22 * S }}>
                因為很重要，所以要說三遍
              </div>
              {/* Lock icon centered */}
              <div style={{ ...lock, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 140 * S, height: 140 * S, borderRadius: 28 * S, background: hexGlow(C.red, 0.10), border: `2.5px solid ${hexGlow(C.red, 0.5)}`, marginBottom: 28 * S, boxShadow: `0 0 ${30 + 20 * lockBreathe}px ${hexGlow(C.red, 0.25 + 0.12 * lockBreathe)}` }}>
                <LI name="lock" size={84 * S} color={C.red} sw={2} />
              </div>
              {/* 3 大字 stagger */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 * S, alignItems: "center" }}>
                {[
                  { s: l1, start: line1Start, text: "API Key = 密碼" },
                  { s: l2, start: line2Start, text: "是密碼" },
                  { s: l3, start: line3Start, text: "是密碼" },
                ].map(({ s, start, text }, i) => (
                  frame >= start - 6 && (
                    <div key={i} style={{ ...s, fontFamily: TC, fontSize: i === 0 ? 80 * S : 64 * S, fontWeight: 900, color: C.red, lineHeight: 1.2, textShadow: `0 0 24px ${hexGlow(C.red, 0.4)}` }}>
                      {text}
                    </div>
                  )
                ))}
              </div>
              {frame >= punchStart - 6 && (
                <div style={{ ...punch, marginTop: 30 * S, fontFamily: TC, fontSize: 30 * S, color: C.text, lineHeight: 1.6, maxWidth: 1300 * S, margin: `${30 * S} auto 0`, paddingLeft: 18 * S, borderLeft: `3px solid ${C.red}`, textAlign: "left", display: "inline-block" }}>
                  所有你<span style={{ color: C.red }}>不會對密碼</span>做的事，對 <Disp style={{ color: C.red }}>API Key</Disp> 也不能做
                </div>
              )}
            </div>
          )}

          {/* Disaster Case Card */}
          {frame >= disasterStart - 6 && (
            <div style={{ marginTop: 14 * S }}>
              <div style={{ ...disaster, background: `linear-gradient(135deg, ${hexGlow(C.red, 0.12)}, ${hexGlow(C.red, 0.04)})`, border: `3px solid ${hexGlow(C.red, 0.5)}`, borderRadius: 28 * S, padding: `${36 * S}px ${44 * S}px` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 22 * S }}>
                  <LI name="warning" size={48 * S} color={C.red} sw={2.2} />
                  <Disp style={{ fontFamily: SYNE, fontSize: 26 * S, color: C.red, letterSpacing: "0.18em" }}>真實案例</Disp>
                </div>
                <div style={{ fontFamily: TC, fontSize: 38 * S, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 28 * S }}>
                  某知名第三方工具<Disp style={{ color: C.red }}>資安漏洞</Disp> → 洩漏大量用戶 API Key
                </div>
                <div style={{ ...disasterStat, display: "flex", alignItems: "baseline", gap: 18 * S, marginBottom: 22 * S }}>
                  <div style={{ fontFamily: SYNE, fontSize: 120 * S, fontWeight: 900, color: C.red, lineHeight: 1, textShadow: `0 0 30px ${hexGlow(C.red, 0.5)}` }}>數千萬</div>
                  <div style={{ fontFamily: TC, fontSize: 40 * S, fontWeight: 700, color: C.red }}>美元損失</div>
                </div>
                <div style={{ ...disasterExp, fontFamily: TC, fontSize: 28 * S, color: C.muted, lineHeight: 1.6, paddingLeft: 18 * S, borderLeft: `3px solid ${hexGlow(C.red, 0.6)}` }}>
                  這些 Key <span style={{ color: C.text }}>直通用戶帳號</span> → 後果嚴重
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
// SCENE 5.2 — API Key 保管 3 招
// global range 16317–19478 | dur 3162 | SEG_START=16317
// VTT cues: 16404=87 "簡單方法" | 16576=259 "可隨時撤銷" | 17184=867 "撤銷生成很簡單"
//           17285=968 "第一點" | 17322=1005 "第二點" | 17464=1147 "開發完成要移走"
//           18163=1846 "AI 教你移到安全位置" | 18437=2120 "移到後撤銷舊 Key"
//           18606=2289 "第三個 最小權限" | 18821=2504 "用量上限" | 19288=2971 "降低損失"
// overlays: SubKicker F0 | Card1 F183 (撤銷) | Card2 F1083 (環境變數) | Card3 F1983 (最小權限)
//           BottomLine F2783→end
// ═════════════════════════════════════════════════════════════════════════════
const Scene52APIKeySafety: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[9];
  // 16500→183, 17400→1083, 18300→1983
  const c1Start = 183;
  const c2Start = 1083;
  const c3Start = 1983;
  const bottomStart = 2783;

  const cardsFade = useBlockFade(bottomStart - 30);
  const c1 = useFadeUpElastic(c1Start);
  const c1Tip = useFadeUp(c1Start + 120);
  const c2 = useFadeUpElastic(c2Start);
  const c2Tip = useFadeUp(c2Start + 120);
  const c2Imp = useFadeUp(c2Start + 240);
  const c3 = useFadeUpElastic(c3Start);
  const c3Tip = useFadeUp(c3Start + 120);
  const c3Result = useFadeUp(c3Start + 240);
  const bottom = useFadeUpElastic(bottomStart);
  const bottomLine = useDraw(bottomStart + 20, 28);

  const cards = [
    { s: c1, start: c1Start, num: 1, icon: "refresh",     accent: C.green,  title: "隨時可撤銷重新生成",
      what: "感覺有點怪怪的就<span class='red'>撤銷</span>", tip: c1Tip, tipText: "撤銷 + 重新生成操作很簡單，別嫌麻煩",
      important: null, importantStyle: null, result: null, resultStyle: null },
    { s: c2, start: c2Start, num: 2, icon: "move-secure", accent: C.orange, title: "開發完成後移到安全位置",
      what: "開發時寫在程式碼裡 OK，但<span class='orange'>部署 / 分享前要移走</span>",
      tip: c2Tip, tipText: "問 AI：「怎麼把 Key 放到更安全的位置」→ 環境變數",
      important: c2Imp, importantStyle: "移走後記得撤銷舊 Key + 換新 Key",
      result: null, resultStyle: null },
    { s: c3, start: c3Start, num: 3, icon: "shield",      accent: C.green,  title: "最小權限 + 用量上限",
      what: "只開放<span class='green'>這次任務真正需要</span>的權限",
      tip: c3Tip, tipText: "服務有提供用量上限的話也要打開",
      important: null, importantStyle: null,
      result: c3Result, resultStyle: "外洩 → 損失可控，不至於無限制被盜用" },
  ];

  const renderWhat = (html: string) => {
    // mini parser: replace red/orange/green spans
    const parts = html.split(/(<span class='[a-z]+'>[^<]+<\/span>)/);
    return parts.map((part, i) => {
      const m = part.match(/<span class='([a-z]+)'>([^<]+)<\/span>/);
      if (!m) return <React.Fragment key={i}>{part}</React.Fragment>;
      const color = m[1] === "red" ? C.red : m[1] === "orange" ? C.orange : C.green;
      return <Disp key={i} style={{ color }}>{m[2]}</Disp>;
    });
  };

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.red} />
        <ProgressBar progressPct={PROGRESS_PCT[9]} accent={C.red} />
        <SceneWrap>
          <SubKicker text="怎麼保護你的 API Key？" startFrame={0} accent={C.red} />

          {/* 3 Safety Cards */}
          {frame < bottomStart - 6 && (
            <div style={{ opacity: cardsFade, display: "flex", flexDirection: "column", gap: 16 * S, marginTop: 8 * S }}>
              {cards.map((card) => (
                frame >= card.start - 6 && (
                  <div key={card.num} style={{ ...card.s, display: "flex", gap: 22 * S, background: C.surface, border: `1.5px solid ${hexGlow(card.accent, 0.32)}`, borderLeft: `5px solid ${card.accent}`, borderRadius: 18 * S, padding: `${22 * S}px ${30 * S}px` }}>
                    <div style={{ width: 88 * S, height: 88 * S, borderRadius: 18 * S, background: hexGlow(card.accent, 0.14), border: `2px solid ${hexGlow(card.accent, 0.6)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 * S, flexShrink: 0 }}>
                      <Disp style={{ fontFamily: SYNE, fontSize: 36 * S, color: card.accent, lineHeight: 1 }}>{card.num}</Disp>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 10 * S }}>
                        <LI name={card.icon} size={40 * S} color={card.accent} sw={2} />
                        <Disp style={{ fontFamily: SYNE, fontSize: 30 * S, color: C.text }}>{card.title}</Disp>
                      </div>
                      <div style={{ fontFamily: TC, fontSize: 26 * S, color: C.text, lineHeight: 1.5, marginBottom: 8 * S }}>
                        {renderWhat(card.what)}
                      </div>
                      <div style={{ ...card.tip, fontFamily: TC, fontSize: 22 * S, color: C.muted, lineHeight: 1.5 }}>
                        <span style={{ color: card.accent, fontWeight: 700 }}>Tip：</span>{card.tipText}
                      </div>
                      {card.important && card.importantStyle && frame >= card.start + 240 - 6 && (
                        <div style={{ ...card.important, marginTop: 10 * S, fontFamily: TC, fontSize: 22 * S, color: C.text, lineHeight: 1.5, padding: `${10 * S}px ${16 * S}px`, background: hexGlow(card.accent, 0.10), borderRadius: 10 * S, borderLeft: `3px solid ${card.accent}` }}>
                          <span style={{ color: card.accent, fontWeight: 700 }}>重要：</span>{card.importantStyle}
                        </div>
                      )}
                      {card.result && card.resultStyle && frame >= card.start + 240 - 6 && (
                        <div style={{ ...card.result, marginTop: 10 * S, fontFamily: TC, fontSize: 22 * S, color: C.text, lineHeight: 1.5, padding: `${10 * S}px ${16 * S}px`, background: hexGlow(card.accent, 0.10), borderRadius: 10 * S, borderLeft: `3px solid ${card.accent}` }}>
                          <span style={{ color: card.accent, fontWeight: 700 }}>結果：</span>{card.resultStyle}
                        </div>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Bottom Line */}
          {frame >= bottomStart - 6 && (
            <div style={{ ...bottom, marginTop: 30 * S, textAlign: "center" }}>
              <div style={{ background: hexGlow(C.red, 0.07), border: `2.5px solid ${hexGlow(C.red, 0.5)}`, borderRadius: 26 * S, padding: `${44 * S}px ${52 * S}px` }}>
                <Disp style={{ fontSize: 22 * S, color: C.red, letterSpacing: "0.2em", display: "block", marginBottom: 22 * S }}>BOTTOM LINE</Disp>
                <div style={{ fontFamily: TC, fontSize: 40 * S, fontWeight: 800, color: C.text, lineHeight: 1.5 }}>
                  好好保管 <Disp style={{ color: C.red }}>API Key</Disp> — 一旦外洩會多嚴重，<br />
                  <span style={{ color: C.muted, fontSize: 32 * S, fontWeight: 500 }}>要看你的帳號多有價值</span>
                </div>
                <div style={{ height: 4 * S, background: C.red, borderRadius: 99, maxWidth: 320 * S, margin: `${22 * S}px auto 0`, boxShadow: `0 0 16px ${hexGlow(C.red, 0.5)}`, transformOrigin: "center", transform: `scaleX(${bottomLine})` }} />
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
// SCENE 6.1 — Finale 4 takeaway + 下集預告（爬蟲）
// global range 19479–22730 | dur 3252 | SEG_START=19479
// VTT cues: 19479=0 "重點整理" | 19824=345 "1. API 是橋樑" | 20354=875 "2. 串接 3 步驟"
//           20861=1382 "3. 卡關 3 策略" | 21304=1825 "4. API Key = 密碼"
//           22471=2992 "可以使用爬蟲" | 22531=3052 "下集：什麼是爬蟲"
// overlays: SectionHeader F0 | Takeaway 1-4 stagger | FinaleGlowCard F2471
// ═════════════════════════════════════════════════════════════════════════════
const Scene61Finale: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[10];
  // 19700→221, 20300→821, 20900→1421, 21500→2021
  const t1Start = 221;
  const t2Start = 821;
  const t3Start = 1421;
  const t4Start = 2021;
  // 21950→2471 finale
  const finaleStart = 2471;

  const cardsFade = useBlockFade(finaleStart - 30);
  const t1 = useFadeUpElastic(t1Start);
  const t2 = useFadeUpElastic(t2Start);
  const t3 = useFadeUpElastic(t3Start);
  const t4 = useFadeUpElastic(t4Start);
  const fin = useFadeUpElastic(finaleStart);
  const glow = 0.22 + 0.1 * Math.sin((frame - finaleStart) / 30);

  const takeaways = [
    { num: "01", color: C.purple, s: t1, start: t1Start, title: "API = 橋樑",
      body: "連接不同應用程式 — 第三方登入 / 行動支付 / 天氣 / 表單同步。" },
    { num: "02", color: C.green,  s: t2, start: t2Start, title: "串接 3 步驟",
      body: "文件 → API Key → AI 生成；先串資料不求功能。" },
    { num: "03", color: C.yellow, s: t3, start: t3Start, title: "卡關 3 策略",
      body: "搜尋案例 / 貼文件 / 貼程式碼範例給 AI。" },
    { num: "04", color: C.red,    s: t4, start: t4Start, title: "API Key = 密碼",
      body: "部署前移到環境變數 / 隨時撤銷 / 最小權限 + 用量上限。" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={PROGRESS_PCT[10]} accent={C.green} />
        <SceneWrap>
          <SectionHeader num="重點整理" title="本章四件事" startFrame={0} accent={C.green} />

          {/* Takeaway list */}
          {frame < finaleStart - 6 && (
            <div style={{ opacity: cardsFade, display: "flex", flexDirection: "column", gap: 14 * S, marginTop: 8 * S }}>
              {takeaways.map((tk) => frame >= tk.start - 6 && (
                <div key={tk.num} style={{ ...tk.s, display: "flex", alignItems: "flex-start", gap: 20 * S, background: C.surface, border: `1px solid ${hexGlow(tk.color, 0.22)}`, borderLeft: `4px solid ${hexGlow(tk.color, 0.6)}`, borderRadius: 16 * S, padding: `${20 * S}px ${26 * S}px` }}>
                  <span style={{ fontFamily: MONO, fontSize: 26 * S, fontWeight: 800, color: tk.color, background: hexGlow(tk.color, 0.1), border: `1px solid ${hexGlow(tk.color, 0.35)}`, borderRadius: 10 * S, padding: `${6 * S}px ${14 * S}px`, minWidth: 64 * S, textAlign: "center", flexShrink: 0 }}>{tk.num}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: TC, fontSize: 32 * S, fontWeight: 700, color: C.text, marginBottom: 6 * S }}>{tk.title}</div>
                    <div style={{ fontFamily: TC, fontSize: 26 * S, fontWeight: 500, color: C.muted, lineHeight: 1.55 }}>{tk.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Finale glow card — v2 鐵律：發光大卡 only for finale ✓ */}
          {frame >= finaleStart - 6 && (
            <div style={{ ...fin, marginTop: 30 * S }}>
              <div style={{ background: `linear-gradient(135deg, ${hexGlow(C.orange, 0.10)}, ${hexGlow(C.orange, 0.04)})`, border: `3px solid ${hexGlow(C.orange, 0.5)}`, borderRadius: 32 * S, padding: `${52 * S}px ${56 * S}px`, boxShadow: `0 0 80px ${hexGlow(C.orange, glow)}`, textAlign: "center" }}>
                <Disp style={{ fontSize: 24 * S, color: C.orange, letterSpacing: "0.16em", display: "block", marginBottom: 24 * S }}>下集預告</Disp>
                <div style={{ fontFamily: TC, fontSize: 80 * S, fontWeight: 900, lineHeight: 1.3, color: C.text, marginBottom: 22 * S }}>
                  <Disp style={{ color: C.orange }}>爬蟲</Disp> <span style={{ color: C.muted, fontWeight: 400, fontSize: 56 * S }}>—</span> 沒 API 時的選擇
                </div>
                <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.muted, lineHeight: 1.6 }}>
                  現實中不是每個網站都提供 API → 想拿資料就用 <Disp style={{ color: C.orange }}>爬蟲</Disp>
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
// Root Composition — FullVideo13
// ═════════════════════════════════════════════════════════════════════════════
const SCENES: React.FC<{ callouts: Callout[] }>[] = [
  Scene01Hero,
  Scene11LifeAPIExamples,
  Scene12APIDefinition,
  Scene21TwoScales,
  Scene31IntegrateSteps12,
  Scene32IntegrateStep3,
  Scene41StuckIntro,
  Scene42StuckStrategies,
  Scene51APIKeyWarning,
  Scene52APIKeySafety,
  Scene61Finale,
];

export const FullVideo13: React.FC = () => {
  const getCallouts = (segStart: number, segEnd: number) =>
    GLOBAL_CALLOUTS.map(c => ({ ...c, from: c.from - segStart, to: c.to - segStart }))
      .filter(c => c.from >= -FADE_OUT_F && c.from < (segEnd - segStart));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/course_background_music.wav")} startFrom={0} volume={0.1} loop />
      {SEG_STARTS_13.map((start, i) => {
        const SceneCmp = SCENES[i];
        const nextStart = i + 1 < SEG_STARTS_13.length ? SEG_STARTS_13[i + 1] : TOTAL_FRAMES_13;
        return (
          <Sequence key={i} from={start} durationInFrames={SEG_DURATIONS[i]}>
            <Audio src={staticFile(`audio/2-6/2-6_${SEG_KEYS[i]}-normalized.wav`)} />
            <SceneCmp callouts={getCallouts(start, nextStart)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
