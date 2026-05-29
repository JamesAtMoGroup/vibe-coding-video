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
} from "remotion";
import { loadFont as loadSyne } from "@remotion/google-fonts/Syne";
import { CursorSpotlightLayer, VideoFit, SpotlightCue } from "./components/CursorSpotlight";

// ─────────────────────────────────────────────────────────────────────────────
// FullVideo10 — CH 2-3「先決定平台：手機、電腦、網頁⋯⋯我會在哪裡用這個程式？」
// v2 motion system（aischool 官網對齊；參考 FullVideo09b）。
// 6 個音頻段落 ~7.6 分鐘；4K 30fps。
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
  lime:      "#c8eb33",
  red:       "#ff6b6b",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// ─────────────────────────────────────────────────────────────────────────────
// Timing — 從 processed/2-3-cues.json
// ─────────────────────────────────────────────────────────────────────────────
export const SEG_STARTS_10 = [0, 1026, 3568, 8200, 10559, 11940];
export const TOTAL_FRAMES_10 = 13674;
const SEG_DURATIONS = [1026, 2542, 4632, 2359, 1381, 1734];

// ─────────────────────────────────────────────────────────────────────────────
// Callouts（無寄件人 — identity protection）
// 從 visual-spec-2-3.json 抓出的 6 個 callouts
// ─────────────────────────────────────────────────────────────────────────────
type Callout = { from: number; to: number; text: string };
const CALLOUT_DURATION = 100;
const GLOBAL_CALLOUTS: Callout[] = [
  { from: 1317,  to: 1317 + CALLOUT_DURATION, text: "下載軟體永遠先問你：哪個系統？" },
  { from: 2691,  to: 2691 + CALLOUT_DURATION, text: "不確認設備，做不出這道料理" },
  { from: 3138,  to: 3138 + CALLOUT_DURATION, text: "不確認平台 → AI 給錯程式碼" },
  { from: 3880,  to: 3880 + CALLOUT_DURATION, text: "三大平台：桌機 / 手機 / 網頁" },
  { from: 5713,  to: 5713 + CALLOUT_DURATION, text: "Web App = 桌機軟體搬進瀏覽器" },
  { from: 6942,  to: 6942 + CALLOUT_DURATION, text: "RWD：一份程式碼，所有螢幕都長對" },
  { from: 7570,  to: 7570 + 220,              text: "老師口誤！開檢查的快捷鍵是 Ctrl+Shift+I（Mac: ⌘+⌥+I）" },
  { from: 9136,  to: 9136 + CALLOUT_DURATION, text: "外掛 = 客製化你的瀏覽器" },
  { from: 9985,  to: 9985 + CALLOUT_DURATION, text: "Bot = 在聊天室裡的小程式" },
  { from: 11202, to: 11202 + CALLOUT_DURATION, text: "關鍵字 = AI 給對程式碼的 GPS" },
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
function hexGlow(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

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
        <span style={{ fontFamily: MONO, fontSize: 18 * S, color: C.faint, letterSpacing: "0.08em" }}>CH 2-3</span>
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
// Card
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
// SCENE 0.1 — Hero
// global range: 0–1025 | local SEG_DURATIONS[0] = 1026
// overlays (local frames; SEG_START=0 so global=local):
//   ChapterBadge 0 | HeroTitle 30 | Connector 30→200 | BigQuestion 480→870
// ═════════════════════════════════════════════════════════════════════════════
const Scene01Hero: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[0];
  const qStart = 480;
  const badge = useFadeUp(0);
  const conn = useFadeUp(30);
  const title = useFadeUpHeader(45);
  const sub = useFadeUp(120);
  const headerFade = interpolate(frame, [qStart - 30, qStart], [1, 0], clamp);
  const q = useFadeUpElastic(qStart);
  const qLine = useAccentLine(qStart + 12);
  const qBreathe = useBreathe(70);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={2} accent={C.green} />
        <SceneWrap>
          <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 24 * S, ...badge, opacity: badge.opacity * headerFade }}>
            <span style={{ fontFamily: MONO, fontSize: 20 * S, color: C.green, border: `1px solid ${C.green}`, padding: `${4 * S}px ${14 * S}px`, borderRadius: 8 * S, letterSpacing: "0.05em" }}>CH 2-3</span>
            <span style={{ fontFamily: MONO, fontSize: 18 * S, color: C.muted, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, padding: `${4 * S}px ${12 * S}px`, borderRadius: 8 * S }}>SDLC · 平台選擇</span>
          </div>

          <div style={{ marginBottom: 28 * S, ...title, opacity: title.opacity * headerFade }}>
            <h1 style={{ fontFamily: TC, fontSize: 78 * S, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.02em", color: C.text, margin: 0 }}>
              先決定<Disp style={{ color: C.green }}>平台</Disp>
            </h1>
          </div>

          <p style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted, lineHeight: 1.6, maxWidth: 1200 * S, marginBottom: 36 * S, ...sub, opacity: sub.opacity * headerFade }}>
            手機、電腦、網頁⋯⋯我會在哪裡用這個程式？
          </p>

          {/* Connector — 上集銜接 small line */}
          <div style={{ ...conn, opacity: conn.opacity * headerFade, display: "flex", alignItems: "center", gap: 12 * S, fontFamily: MONO, fontSize: 20 * S, color: C.muted, letterSpacing: "0.08em", marginBottom: 22 * S }}>
            <span style={{ display: "inline-block", width: 28 * S, height: 1, background: C.faint }} />
            上集 → <Disp style={{ color: C.green }}>Top-Down</Disp> <span style={{ color: C.faint }}>/</span> <Disp style={{ color: C.orange }}>Bottom-Up</Disp>
          </div>

          {/* Big Question (climax) */}
          {frame >= qStart - 6 && (
            <div style={{ ...q, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 70 * S }}>
              <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.18em", marginBottom: 22 * S }}>動手寫程式之前要先決定</div>
              <div style={{ fontFamily: TC, fontSize: 64 * S, fontWeight: 700, color: C.text, lineHeight: 1.4, textAlign: "center" }}>
                你的程式 → 到底要跑在<Disp style={{ color: C.green, fontSize: 84 * S, letterSpacing: "0.02em", display: "inline-block", transform: `scale(${1 + 0.012 * qBreathe})`, textShadow: `0 0 ${26 + 18 * qBreathe}px ${hexGlow(C.green, 0.16 + 0.12 * qBreathe)}` }}>哪裡</Disp>？
              </div>
              <div style={{ height: 4 * S, background: C.green, borderRadius: 99, marginTop: 26 * S, maxWidth: 360 * S, boxShadow: `0 0 16px ${hexGlow(C.green, 0.5)}`, ...qLine }} />
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 1.1 — Why Matters
// global range 1026–3567 | dur 2542 | SEG_START=1026
// overlays (global):
//   SectionHeader 1026 | OSPair1 1317 | OSPair2 1555 | OSPair3 1819
//   Definition 2187→2456 | Analogy 2572→3138 | TransitionQ 3406→3567
// ═════════════════════════════════════════════════════════════════════════════
const Scene11WhyMatters: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[1];
  // local frames (subtract 1026)
  const p1Start = 291;   // OSPair 1 — macOS / Windows
  const p2Start = 529;   // OSPair 2 — iOS / Android
  const p3Start = 793;   // OSPair 3 — Switch / PS5
  const defStart = 1161; // Definition
  const analogyStart = 1546; // Analogy block
  const transStart = 2380; // Transition Question

  const headerFade1 = useBlockFade(defStart - 30);
  const defFade = useBlockFade(analogyStart - 30);
  const analogyFade = useBlockFade(transStart - 30);

  const pair1 = useFadeUpItem(p1Start);
  const pair2 = useFadeUpItem(p2Start);
  const pair3 = useFadeUpItem(p3Start);

  const def = useFadeUpElastic(defStart);
  const defLine = useAccentLine(defStart + 14);

  const analogy = useFadeUpElastic(analogyStart);
  const a1 = useFadeUpItem(analogyStart + 16);
  const a2 = useFadeUpItem(analogyStart + 32);
  const a3 = useFadeUpItem(analogyStart + 48);
  const punch = useFadeUpItem(analogyStart + 220);

  const trans = useFadeUpElastic(transStart);

  const OSPair: React.FC<{ left: string; right: string; context: string; style: AnimStyle; accent?: string }> = ({ left, right, context, style, accent = C.green }) => (
    <div style={{ ...style, display: "flex", alignItems: "stretch", gap: 0, marginBottom: 18 * S }}>
      <div style={{ flex: 1, background: hexGlow(accent, 0.07), border: `2px solid ${hexGlow(accent, 0.4)}`, borderRadius: 18 * S, padding: `${22 * S}px ${28 * S}px`, display: "flex", flexDirection: "column", gap: 6 * S }}>
        <span style={{ fontFamily: MONO, fontSize: 20 * S, color: C.muted, letterSpacing: "0.06em" }}>{context}</span>
        <div style={{ fontFamily: TC, fontSize: 34 * S, fontWeight: 600, color: accent }}>{left}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", padding: `0 ${14 * S}px`, fontFamily: MONO, fontSize: 24 * S, color: C.faint }}>vs</div>
      <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.borderHi}`, borderRadius: 18 * S, padding: `${22 * S}px ${28 * S}px`, display: "flex", flexDirection: "column", gap: 6 * S }}>
        <span style={{ fontFamily: MONO, fontSize: 20 * S, color: C.muted, letterSpacing: "0.06em" }}>&nbsp;</span>
        <div style={{ fontFamily: TC, fontSize: 34 * S, fontWeight: 600, color: C.text }}>{right}</div>
      </div>
    </div>
  );

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={14} accent={C.green} />
        <SceneWrap>
          <SectionHeader num="01" title="為什麼要先選平台？" startFrame={0} accent={C.green} />

          {/* OS pair stagger */}
          {frame < defStart - 6 && (
            <div style={{ opacity: headerFade1, marginTop: 8 * S }}>
              {frame >= p1Start - 6 && <OSPair left="macOS" right="Windows" context="下載軟體" style={pair1} accent={C.green} />}
              {frame >= p2Start - 6 && <OSPair left="iOS" right="Android" context="手機 App" style={pair2} accent={C.green} />}
              {frame >= p3Start - 6 && <OSPair left="Switch" right="PS5" context="遊戲主機" style={pair3} accent={C.green} />}
            </div>
          )}

          {/* Definition — left accent bar quote */}
          {frame >= defStart - 6 && frame < analogyStart - 6 && (
            <div style={{ ...def, opacity: def.opacity * defFade, marginTop: 56 * S, paddingLeft: 40 * S, borderLeft: `4px solid ${C.green}` }}>
              <Disp style={{ fontFamily: SYNE, fontSize: 22 * S, color: C.green, letterSpacing: "0.16em", marginBottom: 18 * S, display: "block" }}>DEFINITION</Disp>
              <div style={{ fontFamily: TC, fontSize: 50 * S, fontWeight: 700, lineHeight: 1.4, color: C.text }}>
                所謂的<Disp style={{ color: C.green }}>「平台」</Disp>
              </div>
              <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.muted, marginTop: 18 * S, lineHeight: 1.6 }}>
                你的程式最終會在<span style={{ color: C.green }}>哪個環境</span>下被使用——<br />
                不同環境，就需要不同的程式語言和寫法。
              </div>
              <div style={{ height: 3 * S, background: C.green, borderRadius: 99, marginTop: 22 * S, maxWidth: 320 * S, ...defLine }} />
            </div>
          )}

          {/* Analogy — 料理 */}
          {frame >= analogyStart - 6 && frame < transStart - 6 && (
            <div style={{ ...analogy, opacity: analogy.opacity * analogyFade, marginTop: 12 * S }}>
              <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 22 * S }}>料理類比</div>
              <div style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, lineHeight: 1.6, marginBottom: 26 * S }}>
                你要做<span style={{ color: C.green }}>一道料理</span>，可以用——
              </div>
              <div style={{ display: "flex", gap: 18 * S, marginBottom: 26 * S }}>
                {[
                  { label: "氣炸鍋", s: a1 },
                  { label: "電鍋", s: a2 },
                  { label: "烤箱", s: a3 },
                ].map(({ label, s }) => (
                  <div key={label} style={{ ...s, flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18 * S, padding: `${26 * S}px ${30 * S}px`, textAlign: "center" }}>
                    <div style={{ fontFamily: TC, fontSize: 34 * S, fontWeight: 600, color: C.text }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...punch, background: hexGlow(C.green, 0.06), border: `1px solid ${hexGlow(C.green, 0.22)}`, borderRadius: 16 * S, padding: `${22 * S}px ${30 * S}px`, fontFamily: TC, fontSize: 30 * S, color: "#c8ffe0", lineHeight: 1.6 }}>
                食材一樣，但<span style={{ color: C.green }}>步驟和時間完全不同</span>——不確認設備，做不出來。
              </div>
            </div>
          )}

          {/* Transition question */}
          {frame >= transStart - 6 && (
            <div style={{ ...trans, marginTop: 64 * S, textAlign: "center" }}>
              <Disp style={{ fontSize: 22 * S, color: C.green, letterSpacing: "0.2em", marginBottom: 22 * S, display: "block" }}>NEXT UP</Disp>
              <div style={{ fontFamily: TC, fontSize: 56 * S, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
                那到底有<Disp style={{ color: C.green }}>哪一些平台</Disp>？
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
// SCENE 2.1 — Platforms + RWD + Demo Video
// global range 3568–8199 | dur 4632 | SEG_START=3568
// overlays:
//   SectionHeader 3568 | Plat1 3880 | ExChips 4079→4391 | Plat2 4490 | Plat3 4861
//   WebBranch: Website 5278 | WebApp 5588 | examples 5855
//   TransitionQ 6298 | DesktopVsMobile 6593→6940 | RWDDef 6942
//   RWD demo video 7306 → 8054 (full-frame OffthreadVideo)
// ═════════════════════════════════════════════════════════════════════════════
const Scene21PlatformsAndRWD: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[2];
  // local frames (subtract 3568)
  const p1Start = 312;     // 第一個 桌機程式 (global 3880)
  const chipsStart = 511;  // Line / Discord (4079)
  const p2Start = 922;     // 第二個 手機 App (4490)
  const p3Start = 1293;    // 第三個 網頁 (4861)
  const webBranchStart = 1710;  // Website (5278)
  const webAppStart = 2020;     // WebApp (5588)
  const exampleStart = 2287;    // Canva/Notion/Figma (5855)
  const transQStart = 2730;     // 手機 vs 電腦 (6298)
  const dvmStart = 3025;        // Desktop vs Mobile (6593)
  const rwdDefStart = 3374;     // RWD definition (6942)
  const rwdVideoStart = 3738;   // RWD demo video starts here (7306)

  const headerFade = useBlockFade(rwdDefStart - 30);
  const platFade = useBlockFade(rwdDefStart - 30);

  const plat1 = useFadeUpItem(p1Start);
  const chips = useFadeUpItem(chipsStart);
  const plat2 = useFadeUpItem(p2Start);
  const plat3 = useFadeUpItem(p3Start);

  const website = useFadeUpItem(webBranchStart);
  const webApp = useFadeUpItem(webAppStart);
  const example = useFadeUpItem(exampleStart);

  const transQ = useFadeUpElastic(transQStart);
  const dvm = useFadeUpElastic(dvmStart);

  const rwdDef = useFadeUpElastic(rwdDefStart);
  const rwdDefLine = useAccentLine(rwdDefStart + 14);

  const PlatformItem: React.FC<{ num: number; label: string; icon: string; sub: string; style: AnimStyle; accent?: string }> = ({ num, label, icon, sub, style, accent = C.green }) => (
    <div style={{ ...style, display: "flex", alignItems: "center", gap: 28 * S, background: C.surface, border: `1px solid ${hexGlow(accent, 0.22)}`, borderRadius: 20 * S, padding: `${24 * S}px ${32 * S}px`, marginBottom: 18 * S }}>
      <div style={{ width: 64 * S, height: 64 * S, borderRadius: 99, background: hexGlow(accent, 0.12), border: `2px solid ${hexGlow(accent, 0.5)}`, color: accent, fontFamily: MONO, fontSize: 26 * S, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{num}</div>
      <LI name={icon} size={56 * S} color={accent} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: TC, fontSize: 36 * S, fontWeight: 700, color: C.text, marginBottom: 6 * S }}>{label}</div>
        <div style={{ fontFamily: TC, fontSize: 24 * S, color: C.muted, lineHeight: 1.5 }}>{sub}</div>
      </div>
    </div>
  );

  // Decide which "block" is showing: avoid overlap
  // Block A: header + 3 platform items (0 ~ webBranchStart-30)
  // Block B: web sub-branches (webBranchStart ~ transQStart-30)
  // Block C: desktop vs mobile + RWD def (transQStart ~ rwdVideoStart-30)
  // Block D: full video (rwdVideoStart ~ end)

  const showA = frame < webBranchStart - 6;
  const showB = frame >= webBranchStart - 6 && frame < transQStart - 6;
  const showC = frame >= transQStart - 6 && frame < rwdVideoStart - 6;
  const showVideo = frame >= rwdVideoStart - 6;

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={frame >= p3Start - 6 ? C.orange : C.green} />
        <ProgressBar progressPct={28} accent={C.green} />

        {/* RWD demo full-frame video — sits OUTSIDE SceneWrap on top */}
        {showVideo && (
          <AbsoluteFill style={{ zIndex: 50 }}>
            <div style={{ position: "absolute", top: NAV_H, left: 0, width: W, height: H - NAV_H - SUBTITLE_H, background: C.bg }}>
              {/* inner Sequence resets video's internal frame to 0 when scene-local frame hits rwdVideoStart;
                  source .mov has no audio stream so muted is correct */}
              <Sequence from={rwdVideoStart}>
                <OffthreadVideo
                  src={staticFile("video/rwd-demo.mp4")}
                  muted
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: W,
                    height: H - NAV_H - SUBTITLE_H,
                    objectFit: "contain",
                  }}
                />
              </Sequence>
              {/* CursorSpotlight: 標出講者提到的「裝置尺寸切換」UI 元素 + 排版變化 */}
              <CursorSpotlightLayer
                fit={{
                  nativeW: 2940, nativeH: 1438,
                  containerLeft: 0, containerTop: 0,
                  containerW: W, containerH: H - NAV_H - SUBTITLE_H,
                  objectFit: "contain",
                }}
                cues={[
                  // 講者說「切換不同尺寸裝置」(02:22) → 圈裝置選單 dropdown
                  { from: 4273, to: 4423, vx: 240, vy: 80, radius: 70 * S, label: "這裡切換尺寸 ↑", labelPos: "bottom", accent: C.orange },
                  // 講者說「觀察到網頁排版會稍微有點不一樣」(02:27) → 圈內容區
                  { from: 4462, to: 4622, vx: 360, vy: 600, radius: 220 * S, label: "排版自動跟著變", labelPos: "top", accent: C.orange },
                ]}
                S={S}
              />
              {/* small bottom-left label */}
              <div style={{ position: "absolute", left: 32 * S, bottom: 28 * S, fontFamily: MONO, fontSize: 22 * S, color: C.faint, letterSpacing: "0.12em", background: "rgba(9,9,15,0.65)", border: `1px solid ${C.border}`, borderRadius: 8 * S, padding: `${8 * S}px ${14 * S}px`, backdropFilter: "blur(8px)" }}>
                <Disp style={{ color: C.orange }}>RWD</Disp> · YouTube 響應式示範
              </div>
            </div>
          </AbsoluteFill>
        )}

        {!showVideo && (
          <SceneWrap>
            <SectionHeader num="02" title="常見的平台類型" startFrame={0} accent={C.green} />

            {/* Block A — 3 platform items */}
            {showA && (
              <div style={{ opacity: platFade, marginTop: 8 * S }}>
                {frame >= p1Start - 6 && <PlatformItem num={1} label="桌機程式" icon="monitor" sub="Windows / macOS 兩套獨立系統，分開開發" style={plat1} accent={C.green} />}
                {/* Example chips for desktop */}
                {frame >= chipsStart - 6 && frame < p2Start - 6 && (
                  <div style={{ ...chips, display: "flex", gap: 14 * S, marginLeft: 92 * S, marginTop: -6 * S, marginBottom: 22 * S }}>
                    <Pill label="Line" color={C.green} style={{ fontSize: 22 * S, padding: `${8 * S}px ${20 * S}px` }} />
                    <Pill label="Discord" color={C.green} style={{ fontSize: 22 * S, padding: `${8 * S}px ${20 * S}px` }} />
                  </div>
                )}
                {frame >= p2Start - 6 && <PlatformItem num={2} label="手機 App" icon="phone" sub="iOS / Android 兩套獨立環境" style={plat2} accent={C.green} />}
                {frame >= p3Start - 6 && <PlatformItem num={3} label="網頁" icon="globe" sub="瀏覽器打開，免安裝；電腦手機通吃" style={plat3} accent={C.orange} />}
              </div>
            )}

            {/* Block B — web sub-branches */}
            {showB && (
              <div style={{ marginTop: 8 * S }}>
                <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 22 * S }}>網頁可以細分</div>
                <div style={{ display: "flex", gap: 22 * S, marginBottom: 22 * S }}>
                  <div style={{ ...website, flex: 1, background: C.surface, border: `1px solid ${hexGlow(C.orange, 0.25)}`, borderRadius: 20 * S, padding: `${28 * S}px ${32 * S}px` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 14 * S }}>
                      <LI name="layers" size={42 * S} color={C.orange} />
                      <Disp style={{ fontSize: 32 * S, color: C.orange, letterSpacing: "0.04em" }}>Website</Disp>
                    </div>
                    <div style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted, lineHeight: 1.6 }}>
                      品牌頁、電商頁——重<span style={{ color: C.orange }}>資訊呈現</span>
                    </div>
                  </div>
                  {frame >= webAppStart - 6 && (
                    <div style={{ ...webApp, flex: 1, background: C.surface, border: `1px solid ${hexGlow(C.orange, 0.25)}`, borderRadius: 20 * S, padding: `${28 * S}px ${32 * S}px` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 14 * S }}>
                        <LI name="spark" size={42 * S} color={C.orange} />
                        <Disp style={{ fontSize: 32 * S, color: C.orange, letterSpacing: "0.04em" }}>Web App</Disp>
                      </div>
                      <div style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted, lineHeight: 1.6 }}>
                        互動性強，<span style={{ color: C.orange }}>像桌機軟體</span>搬上瀏覽器
                      </div>
                    </div>
                  )}
                </div>
                {frame >= exampleStart - 6 && (
                  <div style={{ ...example, display: "flex", gap: 14 * S, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: MONO, fontSize: 20 * S, color: C.muted, letterSpacing: "0.06em" }}>例如</span>
                    {["Canva", "Notion", "Figma"].map(t => (
                      <Pill key={t} label={t} color={C.orange} style={{ fontSize: 24 * S, padding: `${10 * S}px ${22 * S}px` }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Block C — desktop vs mobile + RWD def */}
            {showC && (
              <div style={{ marginTop: 8 * S }}>
                {/* Transition Q */}
                <div style={{ ...transQ, fontFamily: TC, fontSize: 36 * S, fontWeight: 600, color: C.text, lineHeight: 1.5, marginBottom: 30 * S }}>
                  咦？<Disp style={{ color: C.orange }}>手機網頁</Disp> vs <Disp style={{ color: C.orange }}>電腦網頁</Disp>，是同一份嗎？
                </div>

                {frame >= dvmStart - 6 && (
                  <div style={{ ...dvm, display: "flex", gap: 22 * S, marginBottom: 36 * S }}>
                    <div style={{ flex: 1, background: hexGlow(C.orange, 0.07), border: `2px solid ${hexGlow(C.orange, 0.4)}`, borderRadius: 18 * S, padding: `${22 * S}px ${28 * S}px`, textAlign: "center" }}>
                      <Disp style={{ fontSize: 30 * S, color: C.orange }}>Desktop Web</Disp>
                    </div>
                    <div style={{ flex: 1, background: hexGlow(C.orange, 0.07), border: `2px solid ${hexGlow(C.orange, 0.4)}`, borderRadius: 18 * S, padding: `${22 * S}px ${28 * S}px`, textAlign: "center" }}>
                      <Disp style={{ fontSize: 30 * S, color: C.orange }}>Mobile Web</Disp>
                    </div>
                  </div>
                )}

                {frame >= rwdDefStart - 6 && (
                  <div style={{ ...rwdDef, paddingLeft: 40 * S, borderLeft: `4px solid ${C.orange}` }}>
                    <Disp style={{ fontFamily: SYNE, fontSize: 22 * S, color: C.orange, letterSpacing: "0.16em", marginBottom: 14 * S, display: "block" }}>RESPONSIVE</Disp>
                    <div style={{ fontFamily: TC, fontSize: 56 * S, fontWeight: 800, lineHeight: 1.3, color: C.text }}>
                      <Disp style={{ color: C.orange, fontSize: 80 * S }}>RWD</Disp>
                    </div>
                    <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted, marginTop: 10 * S, lineHeight: 1.5 }}>
                      <Disp style={{ color: C.orange }}>Responsive Web Design</Disp> · 響應式設計
                    </div>
                    <div style={{ fontFamily: TC, fontSize: 30 * S, color: "#ffe6cc", marginTop: 18 * S, lineHeight: 1.6 }}>
                      一份程式碼，<span style={{ color: C.orange }}>自動適應桌機與手機</span>。
                    </div>
                    <div style={{ height: 3 * S, background: C.orange, borderRadius: 99, marginTop: 18 * S, maxWidth: 320 * S, ...rwdDefLine }} />
                  </div>
                )}
              </div>
            )}
          </SceneWrap>
        )}

        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 2.2 — Plugins (4) + Bots (5)
// global range 8200–10558 | dur 2359 | SEG_START=8200
// overlays:
//   Connector 8200→8399 | Plat4 8399 | ToolChips 8614→8960 | MiniNote 9136→9450
//   BrowserUnified 9328→9581 | Plat5 9650 | BotFeatures 9985→10347 | WrapNote 10347→10558
// ═════════════════════════════════════════════════════════════════════════════
const Scene22PluginsAndBots: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[3];
  // local (subtract 8200)
  const connStart = 0;
  const p4Start = 199;       // 第四個 瀏覽器外掛 (8399)
  const chipsStart = 414;    // 工具 chips (8614)
  const browserStart = 1128; // Chrome/Edge unified (9328)
  const p5Start = 1450;      // 第五個 通訊軟體 Bot (9650)
  const featStart = 1785;    // bot features (9985)
  const wrapStart = 2147;    // wrap note (10347)

  const conn = useFadeUp(connStart);
  const connFade = useBlockFade(p4Start - 6);

  const plat4 = useFadeUpElastic(p4Start);
  const chips = useFadeUpItem(chipsStart);
  const c1 = useFadeUpItem(chipsStart);
  const c2 = useFadeUpItem(chipsStart + 14);
  const c3 = useFadeUpItem(chipsStart + 28);
  const browser = useFadeUpItem(browserStart);
  const block4Fade = useBlockFade(p5Start - 30);

  const plat5 = useFadeUpElastic(p5Start);
  const f1 = useFadeUpItem(featStart);
  const f2 = useFadeUpItem(featStart + 12);
  const f3 = useFadeUpItem(featStart + 24);
  const f4 = useFadeUpItem(featStart + 36);
  const f5 = useFadeUpItem(featStart + 48);
  const wrapN = useFadeUpItem(wrapStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={frame >= p5Start - 6 ? C.purple : C.green} />
        <ProgressBar progressPct={56} accent={frame >= p5Start - 6 ? C.purple : C.green} />
        <SceneWrap>
          {/* Connector */}
          {frame < p4Start - 6 && (
            <div style={{ ...conn, opacity: conn.opacity * connFade, paddingTop: 80 * S, textAlign: "center" }}>
              <Disp style={{ fontSize: 22 * S, color: C.green, letterSpacing: "0.2em", marginBottom: 22 * S, display: "block" }}>PLUS</Disp>
              <div style={{ fontFamily: TC, fontSize: 48 * S, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
                除了剛剛三個⋯⋯還有<Disp style={{ color: C.green }}>兩種</Disp>。
              </div>
            </div>
          )}

          {/* Block 4 — 瀏覽器外掛 */}
          {frame >= p4Start - 6 && frame < p5Start - 30 && (
            <div style={{ opacity: block4Fade }}>
              <div style={{ ...plat4, display: "flex", alignItems: "center", gap: 28 * S, background: C.surface, border: `1px solid ${hexGlow(C.green, 0.25)}`, borderRadius: 20 * S, padding: `${24 * S}px ${32 * S}px`, marginBottom: 22 * S }}>
                <div style={{ width: 64 * S, height: 64 * S, borderRadius: 99, background: hexGlow(C.green, 0.12), border: `2px solid ${hexGlow(C.green, 0.5)}`, color: C.green, fontFamily: MONO, fontSize: 26 * S, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>4</div>
                <LI name="puzzle" size={56 * S} color={C.green} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: TC, fontSize: 36 * S, fontWeight: 700, color: C.text, marginBottom: 6 * S }}>瀏覽器外掛</div>
                  <div style={{ fontFamily: TC, fontSize: 24 * S, color: C.muted, lineHeight: 1.5 }}>裝在 Chrome / Edge 上面的小工具</div>
                </div>
              </div>

              {/* Tool chips */}
              {frame >= chipsStart - 6 && frame < browserStart - 6 && (
                <div style={{ display: "flex", gap: 14 * S, marginLeft: 92 * S, marginBottom: 26 * S, flexWrap: "wrap" }}>
                  <div style={c1}><Pill label="翻譯外掛" color={C.green} style={{ fontSize: 24 * S, padding: `${10 * S}px ${22 * S}px` }} /></div>
                  <div style={c2}><Pill label="截圖工具" color={C.green} style={{ fontSize: 24 * S, padding: `${10 * S}px ${22 * S}px` }} /></div>
                  <div style={c3}><Pill label="廣告封鎖器" color={C.green} style={{ fontSize: 24 * S, padding: `${10 * S}px ${22 * S}px` }} /></div>
                </div>
              )}

              {/* Chrome / Edge unified */}
              {frame >= browserStart - 6 && (
                <div style={{ ...browser, background: hexGlow(C.green, 0.06), border: `1px solid ${hexGlow(C.green, 0.22)}`, borderRadius: 16 * S, padding: `${24 * S}px ${30 * S}px`, fontFamily: TC, fontSize: 28 * S, color: "#c8ffe0", lineHeight: 1.6, display: "flex", alignItems: "center", gap: 20 * S }}>
                  <LI name="link" size={42 * S} color={C.green} />
                  <div>
                    <Disp style={{ color: C.green }}>Chrome</Disp> 跟 <Disp style={{ color: C.green }}>Edge</Disp> 共用同一套標準——一個外掛<span style={{ color: C.green }}>橫跨兩個瀏覽器</span>。
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Block 5 — 通訊軟體 Bot */}
          {frame >= p5Start - 6 && (
            <div>
              <div style={{ ...plat5, display: "flex", alignItems: "center", gap: 28 * S, background: C.surface, border: `1px solid ${hexGlow(C.purple, 0.3)}`, borderRadius: 20 * S, padding: `${24 * S}px ${32 * S}px`, marginBottom: 22 * S }}>
                <div style={{ width: 64 * S, height: 64 * S, borderRadius: 99, background: hexGlow(C.purple, 0.15), border: `2px solid ${hexGlow(C.purple, 0.55)}`, color: C.purple, fontFamily: MONO, fontSize: 26 * S, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>5</div>
                <LI name="chat-bot" size={56 * S} color={C.purple} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: TC, fontSize: 36 * S, fontWeight: 700, color: C.text, marginBottom: 6 * S }}>通訊軟體 Bot</div>
                  <div style={{ fontFamily: TC, fontSize: 24 * S, color: C.muted, lineHeight: 1.5 }}>
                    <Disp style={{ color: C.purple }}>Line</Disp> · <Disp style={{ color: C.purple }}>Discord</Disp> · <Disp style={{ color: C.purple }}>Slack</Disp> 都算
                  </div>
                </div>
              </div>

              {/* Bot features */}
              {frame >= featStart - 6 && (
                <div style={{ marginBottom: 22 * S }}>
                  <div style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 18 * S }}>Bot 可以幫你</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 * S }}>
                    {[
                      { icon: "calendar", t: "行事曆提醒", s: f1 },
                      { icon: "list", t: "待辦清單", s: f2 },
                      { icon: "bell", t: "預約系統", s: f3 },
                      { icon: "translate", t: "翻譯訊息", s: f4 },
                      { icon: "faq", t: "常見問題自動回覆", s: f5 },
                    ].map(({ icon, t, s }) => (
                      <div key={t} style={{ ...s, display: "flex", alignItems: "center", gap: 18 * S, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 * S, padding: `${18 * S}px ${22 * S}px` }}>
                        <LI name={icon} size={36 * S} color={C.purple} />
                        <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.text }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Wrap note */}
              {frame >= wrapStart - 6 && (
                <div style={{ ...wrapN, background: hexGlow(C.purple, 0.08), border: `1px solid ${hexGlow(C.purple, 0.3)}`, borderRadius: 16 * S, padding: `${22 * S}px ${30 * S}px`, fontFamily: TC, fontSize: 28 * S, color: "#e9d4ff", lineHeight: 1.6 }}>
                  Bot 的功能比<span style={{ color: C.purple }}>想像中還多</span>。
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
// SCENE 3.1 — Platform ↔ Language
// global range 10559–11939 | dur 1381 | SEG_START=10559
// overlays:
//   SectionHeader 10559 | Recap 10626→10847 | BigPunch 10914 + highlight 11078 + kicker 11202
//   TransitionQ 11341→11652 | NextEpisodeCard 11652
// ═════════════════════════════════════════════════════════════════════════════
const Scene31PlatformLanguage: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[4];
  // local (subtract 10559)
  const recapStart = 67;     // 10626
  const punchStart = 355;    // 10914
  const highlightStart = 519; // 11078
  const kickerStart = 643;   // 11202
  const transStart = 782;    // 11341
  const nextStart = 1093;    // 11652

  const headerFade = useBlockFade(nextStart - 30);
  const recap = useFadeUp(recapStart);
  const punch = useFadeUpElastic(punchStart);
  const highlight = useFadeUp(highlightStart);
  const kicker = useFadeUpElastic(kickerStart);
  const kickerLine = useAccentLine(kickerStart + 12);
  const punchFade = useBlockFade(transStart - 30);
  const trans = useFadeUpElastic(transStart);
  const transFade = useBlockFade(nextStart - 30);
  const next = useFadeUpElastic(nextStart);
  const kickerBreathe = useBreathe(80);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={82} accent={C.green} />
        <SceneWrap>
          <div style={{ opacity: headerFade }}>
            <SectionHeader num="03" title="每個平台，都有最適合它的語言" startFrame={0} accent={C.green} />
          </div>

          {/* Recap line */}
          {frame >= recapStart - 6 && frame < punchStart - 6 && (
            <div style={{ ...recap, marginTop: 24 * S, fontFamily: TC, fontSize: 34 * S, fontWeight: 500, color: C.muted, lineHeight: 1.6 }}>
              不同平台 → <span style={{ color: C.green }}>不同程式語言</span>。
            </div>
          )}

          {/* Big punchline */}
          {frame >= punchStart - 6 && frame < transStart - 6 && (
            <div style={{ opacity: punchFade, textAlign: "center", paddingTop: 30 * S }}>
              <div style={{ ...punch, fontFamily: TC, fontSize: 56 * S, fontWeight: 700, color: C.text, lineHeight: 1.5, marginBottom: 26 * S }}>
                你不用親自學會這些語言
              </div>
              {frame >= highlightStart - 6 && (
                <div style={{ ...highlight, fontFamily: TC, fontSize: 74 * S, fontWeight: 900, color: C.text, lineHeight: 1.3, marginBottom: 26 * S }}>
                  你只要知道<Disp style={{ color: C.green, fontSize: 100 * S, letterSpacing: "0.02em", display: "inline-block", transform: `scale(${1 + 0.012 * kickerBreathe})`, textShadow: `0 0 ${22 + 14 * kickerBreathe}px ${hexGlow(C.green, 0.18 + 0.10 * kickerBreathe)}` }}>平台</Disp>
                </div>
              )}
              {frame >= kickerStart - 6 && (
                <div style={{ ...kicker, marginTop: 30 * S }}>
                  <div style={{ fontFamily: TC, fontSize: 38 * S, fontWeight: 500, color: C.green, lineHeight: 1.5 }}>
                    就能給 AI <Disp style={{ color: C.green }}>更精準的關鍵字</Disp>。
                  </div>
                  <div style={{ height: 3 * S, background: C.green, borderRadius: 99, marginTop: 20 * S, maxWidth: 360 * S, margin: `${20 * S}px auto 0`, ...kickerLine }} />
                </div>
              )}
            </div>
          )}

          {/* Transition Question */}
          {frame >= transStart - 6 && frame < nextStart - 6 && (
            <div style={{ ...trans, opacity: trans.opacity * transFade, marginTop: 60 * S, textAlign: "center" }}>
              <Disp style={{ fontSize: 22 * S, color: C.muted, letterSpacing: "0.2em", marginBottom: 22 * S, display: "block" }}>BUT</Disp>
              <div style={{ fontFamily: TC, fontSize: 46 * S, fontWeight: 600, color: C.text, lineHeight: 1.5 }}>
                但要怎麼知道<span style={{ color: C.green }}>每個平台對應什麼語言</span>？
              </div>
            </div>
          )}

          {/* Next Episode Card */}
          {frame >= nextStart - 6 && (
            <div style={{ ...next, marginTop: 24 * S }}>
              <div style={{ background: C.surface, border: `2px solid ${hexGlow(C.green, 0.4)}`, borderRadius: 24 * S, padding: `${40 * S}px ${48 * S}px` }}>
                <Disp style={{ fontSize: 22 * S, color: C.green, letterSpacing: "0.2em", marginBottom: 18 * S, display: "block" }}>下個單元</Disp>
                <div style={{ fontFamily: TC, fontSize: 52 * S, fontWeight: 800, color: C.text, lineHeight: 1.3, marginBottom: 18 * S }}>
                  平台 <Disp style={{ color: C.green }}>↔</Disp> 語言 連連看
                </div>
                <div style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted, lineHeight: 1.6 }}>
                  把今天的 5 種平台跟最適合的程式語言<span style={{ color: C.green }}>對應起來</span>。
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
// SCENE 4.1 — Finale (重點整理 + 發光大卡)
// global range 11940–13673 | dur 1734 | SEG_START=11940
// overlays:
//   SectionHeader 11940 | Takeaway1 12074 | Takeaway2 12674 | Takeaway3 13054
//   FinaleGlowCard 13519
// ═════════════════════════════════════════════════════════════════════════════
const Scene41Finale: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[5];
  // local (subtract 11940)
  const t1Start = 134;
  const t2Start = 734;
  const t3Start = 1114;
  const finaleStart = 1579;

  const cardsFade = useBlockFade(finaleStart - 30);
  const t1 = useFadeUpElastic(t1Start);
  const t2 = useFadeUpElastic(t2Start);
  const t3 = useFadeUpElastic(t3Start);
  const fin = useFadeUpElastic(finaleStart);
  const glow = 0.22 + 0.1 * Math.sin((frame - finaleStart) / 30);

  const takeaways = [
    { num: "01", color: C.green,  s: t1, start: t1Start, title: "先決定平台", body: "不同平台需要不同程式碼；知道目標平台才能給 AI 精準關鍵字。" },
    { num: "02", color: C.green,  s: t2, start: t2Start, title: "5 種常見平台", body: "桌機程式 / 手機 App / 網頁 / 瀏覽器外掛 / 通訊軟體 Bot — 各是不同環境。" },
    { num: "03", color: C.orange, s: t3, start: t3Start, title: "網頁細分", body: "Website 偏資訊；Web App 偏互動。手機桌機常用 RWD 一份程式碼適應所有螢幕。" },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.green} />
        <ProgressBar progressPct={100} accent={C.green} />
        <SceneWrap>
          <SectionHeader num="重點整理" title="本章三件事" startFrame={0} accent={C.green} />

          {/* Takeaway list */}
          {frame < finaleStart - 6 && (
            <div style={{ opacity: cardsFade, display: "flex", flexDirection: "column", gap: 16 * S, marginTop: 8 * S }}>
              {takeaways.map((tk) => frame >= tk.start - 6 && (
                <div key={tk.num} style={{ ...tk.s, display: "flex", alignItems: "flex-start", gap: 24 * S, background: C.surface, border: `1px solid ${hexGlow(tk.color, 0.22)}`, borderRadius: 18 * S, padding: `${24 * S}px ${30 * S}px` }}>
                  <span style={{ fontFamily: MONO, fontSize: 28 * S, fontWeight: 800, color: tk.color, background: hexGlow(tk.color, 0.1), border: `1px solid ${hexGlow(tk.color, 0.35)}`, borderRadius: 12 * S, padding: `${8 * S}px ${16 * S}px`, minWidth: 72 * S, textAlign: "center", flexShrink: 0 }}>{tk.num}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: TC, fontSize: 34 * S, fontWeight: 700, color: C.text, marginBottom: 8 * S }}>{tk.title}</div>
                    <div style={{ fontFamily: TC, fontSize: 26 * S, fontWeight: 500, color: C.muted, lineHeight: 1.6 }}>{tk.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Finale glow card — v2 規則：發光大卡 only for finale ✓ */}
          {frame >= finaleStart - 6 && (
            <div style={{ ...fin, marginTop: 40 * S }}>
              <div style={{ background: hexGlow(C.green, 0.08), border: `3px solid ${hexGlow(C.green, 0.5)}`, borderRadius: 32 * S, padding: `${60 * S}px ${64 * S}px`, boxShadow: `0 0 80px ${hexGlow(C.green, glow)}`, textAlign: "center" }}>
                <Disp style={{ fontSize: 24 * S, color: C.green, letterSpacing: "0.16em", marginBottom: 24 * S, display: "block" }}>SEE YOU NEXT</Disp>
                <div style={{ fontFamily: TC, fontSize: 64 * S, fontWeight: 900, lineHeight: 1.4, color: C.text, marginBottom: 22 * S }}>
                  <Disp style={{ color: C.green }}>下個單元見</Disp>
                </div>
                <div style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted, lineHeight: 1.6 }}>
                  我們會把 <span style={{ color: C.green }}>5 種平台</span>跟最適合的程式語言<span style={{ color: C.green }}>連起來</span>。
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
// Root Composition — FullVideo10
// ═════════════════════════════════════════════════════════════════════════════
export const FullVideo10: React.FC = () => {
  const S0 = SEG_STARTS_10;
  const getCallouts = (segStart: number, segEnd: number) =>
    GLOBAL_CALLOUTS.map(c => ({ ...c, from: c.from - segStart, to: c.to - segStart }))
      .filter(c => c.from >= -FADE_OUT_F && c.from < (segEnd - segStart));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/course_background_music.wav")} startFrom={0} volume={0.1} loop />
      <Sequence from={S0[0]} durationInFrames={SEG_DURATIONS[0]}>
        <Audio src={staticFile("audio/2-3/2-3_0.1-normalized.wav")} />
        <Scene01Hero callouts={getCallouts(S0[0], S0[1])} />
      </Sequence>
      <Sequence from={S0[1]} durationInFrames={SEG_DURATIONS[1]}>
        <Audio src={staticFile("audio/2-3/2-3_1.1-normalized.wav")} />
        <Scene11WhyMatters callouts={getCallouts(S0[1], S0[2])} />
      </Sequence>
      <Sequence from={S0[2]} durationInFrames={SEG_DURATIONS[2]}>
        <Audio src={staticFile("audio/2-3/2-3_2.1-normalized.wav")} />
        <Scene21PlatformsAndRWD callouts={getCallouts(S0[2], S0[3])} />
      </Sequence>
      <Sequence from={S0[3]} durationInFrames={SEG_DURATIONS[3]}>
        <Audio src={staticFile("audio/2-3/2-3_2.2-normalized.wav")} />
        <Scene22PluginsAndBots callouts={getCallouts(S0[3], S0[4])} />
      </Sequence>
      <Sequence from={S0[4]} durationInFrames={SEG_DURATIONS[4]}>
        <Audio src={staticFile("audio/2-3/2-3_3.1-normalized.wav")} />
        <Scene31PlatformLanguage callouts={getCallouts(S0[4], S0[5])} />
      </Sequence>
      <Sequence from={S0[5]} durationInFrames={SEG_DURATIONS[5]}>
        <Audio src={staticFile("audio/2-3/2-3_4.1-normalized.wav")} />
        <Scene41Finale callouts={getCallouts(S0[5], TOTAL_FRAMES_10)} />
      </Sequence>
    </AbsoluteFill>
  );
};
