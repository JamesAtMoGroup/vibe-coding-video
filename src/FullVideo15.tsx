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
// FullVideo15 — CH 2-8「技術方案｜部署——把作品放上網路的常見做法」
// v2 motion system（參考 FullVideo14 / FullVideo09b）+ lessoncraft 設計單 chapters/2-8/design-2-8.md
// 片頭 90f 無聲鉤子 + 21 個音檔段落 + 6.1 中插 210f 無聲回家作業卡；4K 30fps。
// 語意色：部署三步驟/成功/GitHub Pages=綠 / GAS=黃 / Cloudflare=橘 / Zeabur=紫 / 地雷費用=紅 / 本機=灰
// demo 段（2.4 / 2.5）：錄影以卡片進場，點擊前 0.3 秒推近、點完拉回，周圍壓暗＋細框；
// 推近座標全部從原始錄影幀量（Vision OCR 文字框），見 chapters/2-8/visual-spec-2-8.json。
// 錄影裡的 GitHub 帳號名已在 public/assets/2-8/*.mp4 逐幀模糊（OCR + template tracking）。
// ─────────────────────────────────────────────────────────────────────────────

const SYNE = loadSyne().fontFamily;
const TC = "'Noto Sans TC','PingFang TC',sans-serif";
const MONO = "'Space Mono', monospace";

const S = 2;
const W = 1920 * S; // 3840
const H = 1080 * S; // 2160
const NAV_H = 72 * S; // 144
const SUBTITLE_H = 160 * S; // 320
const CONTAINER_W = 1500 * S; // 3000
const CONTAINER_L = (W - CONTAINER_W) / 2; // 420

const C = {
  bg: "#09090f",
  surface: "#111118",
  surface2: "#16161e",
  text: "#f0f0f5",
  muted: "rgba(240,240,245,0.55)",
  faint: "rgba(240,240,245,0.30)",
  border: "rgba(255,255,255,0.07)",
  borderHi: "rgba(255,255,255,0.14)",
  green: "#7cffb2",
  orange: "#ff9f43",
  purple: "#a855f7",
  yellow: "#ffd166",
  red: "#ff6b6b",
  gray: "#9a9aab",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// ─────────────────────────────────────────────────────────────────────────────
// Timing — 每段長度 = round(normalized.wav 秒數 × 30)；片頭 90f；6.1 於 78.3s（local 2349）
// 的靜音處切開，中插 210f 無聲回家作業卡（後半段音檔 trimBefore=2349 延後播放）。
// ─────────────────────────────────────────────────────────────────────────────
const HOOK_F = 90;
const HW_F = 210; // 回家作業卡 7 秒（33 字 ÷ 5 字/秒 ≈ 6.6 秒）
export const SPLIT_6_1 = 2349; // 6.1 音檔切點（local frame = 78.3s，silencedetect 78.02–78.65s）
const SEG_KEYS = ["0.1", "1.1", "1.2", "1.3", "2.1", "2.2", "2.3", "2.4", "2.5", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "4.1", "5.1", "5.2", "5.3", "5.4", "6.1"];
const AUDIO_F = [1870, 1150, 1644, 1558, 2131, 1956, 883, 1820, 1733, 525, 2563, 1868, 1110, 1020, 1465, 2177, 930, 1334, 1952, 1016, 3111];
const SEG_DURATIONS = AUDIO_F.map((d, i) => (i === AUDIO_F.length - 1 ? d + HW_F : d));
export const SEG_STARTS_15 = SEG_DURATIONS.reduce<number[]>((acc, d, i) => {
  acc.push(i === 0 ? HOOK_F : acc[i - 1] + SEG_DURATIONS[i - 1]);
  return acc;
}, []);
export const TOTAL_FRAMES_15 = SEG_STARTS_15[SEG_STARTS_15.length - 1] + SEG_DURATIONS[SEG_DURATIONS.length - 1];
const PROGRESS_PCT = SEG_STARTS_15.map((s, i) => Math.round(((s + SEG_DURATIONS[i]) / TOTAL_FRAMES_15) * 100));
const segIdx = (k: string) => SEG_KEYS.indexOf(k);

// ─────────────────────────────────────────────────────────────────────────────
// iMessage callouts（無寄件人）— at = 該段 local frame（VTT cue 起點），長度 120f
// ─────────────────────────────────────────────────────────────────────────────
type Callout = { from: number; to: number; text: string };
const LOCAL_CALLOUTS: { seg: string; at: number; text: string }[] = [
  { seg: "2.2", at: 886, text: "部署平台官方都有完整教學文件" },  // 29.52 完整的教學文件
  { seg: "3.6", at: 1404, text: "先想清楚這個專案要給誰用" },     // 46.80 縮小範圍
  { seg: "5.2", at: 1088, text: "比價要看第二年的續費價" },        // 36.28 第二年續費的時候
  { seg: "5.4", at: 893, text: "現在有印象就好，需要時再請 AI 帶" }, // 29.76 不需要現在就記住
];
const GLOBAL_CALLOUTS: Callout[] = LOCAL_CALLOUTS.map((c) => {
  const from = SEG_STARTS_15[segIdx(c.seg)] + c.at;
  return { from, to: from + 120, text: c.text };
});

// ─────────────────────────────────────────────────────────────────────────────
// Animation hooks（同 FullVideo14）
// ─────────────────────────────────────────────────────────────────────────────
type AnimStyle = { opacity: number; transform: string };
function useFadeUp(startFrame: number): AnimStyle {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const p = spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: Math.round(0.7 * fps) });
  return { opacity: frame < startFrame ? 0 : interpolate(f, [0, 0.35 * fps], [0, 1], clamp), transform: `translateY(${interpolate(p, [0, 1], [14 * S, 0])}px) scale(${interpolate(p, [0, 1], [0.97, 1])})` };
}
function useFadeUpHeader(startFrame: number): AnimStyle {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const p = spring({ frame: f, fps, config: { damping: 20, stiffness: 200 } });
  return { opacity: frame < startFrame ? 0 : interpolate(f, [0, 0.3 * fps], [0, 1], clamp), transform: `translateY(${interpolate(p, [0, 1], [10 * S, 0])}px)` };
}
function useFadeUpItem(startFrame: number): AnimStyle {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const p = interpolate(f, [0, Math.round(0.65 * fps)], [0, 1], { easing: Easing.out(Easing.exp), ...clamp });
  return { opacity: frame < startFrame ? 0 : interpolate(f, [0, 0.3 * fps], [0, 1], clamp), transform: `translateY(${interpolate(p, [0, 1], [10 * S, 0])}px)` };
}
function useFadeUpElastic(startFrame: number): AnimStyle {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const p = spring({ frame: f, fps, config: { damping: 8 } });
  return { opacity: frame < startFrame ? 0 : interpolate(f, [0, 0.3 * fps], [0, 1], clamp), transform: `translateY(${interpolate(p, [0, 1], [8 * S, 0])}px) scale(${interpolate(p, [0, 1], [0.9, 1])})` };
}
function useDraw(startFrame: number, dur = 22): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < startFrame) return 0;
  return spring({ frame: frame - startFrame, fps, config: { damping: 200 }, durationInFrames: dur });
}
function useBreathe(period = 80): number {
  const frame = useCurrentFrame();
  return 0.5 + 0.5 * Math.sin((frame / period) * Math.PI * 2);
}
// 視窗：a 進場淡入、b 退場淡出（段內換畫面用，上一段先收掉）
function win(frame: number, a: number, b: number, f = 12): number {
  return Math.min(interpolate(frame, [a, a + f], [0, 1], clamp), interpolate(frame, [b - f, b], [1, 0], clamp));
}
function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BrandBg（grid parallax + 飄移粒子 + glow 脈動）
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
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${C.borderHi} 1px, transparent 1px),linear-gradient(90deg, ${C.borderHi} 1px, transparent 1px)`, backgroundSize: `${cell}px ${cell}px`, backgroundPosition: `${shift}px ${shift}px`, opacity: 0.22 * bgAlpha }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 82% 12%, ${hexA(accent, glow * bgAlpha)} 0%, transparent 45%)` }} />
      {Array.from({ length: 16 }).map((_, i) => {
        const speed = 0.1 + (i % 5) * 0.04;
        const yPct = 110 - ((frame * speed + i * 27) % 130);
        const xPct = (i * 61.8) % 100;
        const sz = (2 + (i % 3)) * S;
        return <div key={i} style={{ position: "absolute", left: `${xPct}%`, top: `${yPct}%`, width: sz, height: sz, borderRadius: 99, background: accent, opacity: (0.05 + 0.06 * ((i % 4) / 3)) * bgAlpha, filter: "blur(1px)" }} />;
      })}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 78% 64% at 50% 42%, transparent 38%, ${C.bg} 100%)` }} />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Monoline icons（LI）— 平台名一律文字＋icon，不放第三方 logo
// ─────────────────────────────────────────────────────────────────────────────
const ICONS: Record<string, string> = {
  monitor: "M3 5h18v12H3z|M3 17l3 4h12l3-4|M9 21h6",
  laptop: "M4 6h16v10H4z|M2 19h20|M8 19l1-3h6l1 3",
  phone: "M8 2h8a1 1 0 011 1v18a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1z|M11 19h2",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18z|M3 12h18|M12 3a13 13 0 010 18|M12 3a13 13 0 000 18",
  refresh: "M4 12a8 8 0 1114 5|M14 17v-4h4",
  link: "M9 15l6-6|M10 6a4 4 0 015.6 5.6L13 14|M14 18a4 4 0 01-5.6-5.6L11 10",
  question: "M9 9a3 3 0 116 0c0 2-3 2-3 4|M12 16v.01|M12 4a8 8 0 100 16 8 8 0 000-16z",
  server: "M4 4h16v6H4z|M4 14h16v6H4z|M7 7h.01|M7 17h.01",
  file: "M7 3h7l4 4v14H7z|M14 3v4h4|M10 14h6|M10 18h6",
  code: "M9 8l-5 4 5 4|M15 8l5 4-5 4|M14 5l-4 14",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4",
  cloud: "M7 16a4 4 0 110-8 5 5 0 019.6 1.5A3.5 3.5 0 0117 16z",
  warning: "M12 3l10 18H2z|M12 10v5|M12 18v.01",
  check: "M5 13l4 4L19 7",
  cross: "M6 6l12 12|M18 6L6 18",
  lock: "M6 11h12v10H6z|M9 11V7a3 3 0 016 0v4",
  unlock: "M6 11h12v10H6z|M9 11V7a3 3 0 015.8-1",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14z|M16 16l5 5",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18z|M12 8v4l3 2",
  database: "M12 4c4 0 7 1 7 3s-3 3-7 3-7-1-7-3 3-3 7-3z|M5 7v5c0 2 3 3 7 3s7-1 7-3V7|M5 12v5c0 2 3 3 7 3s7-1 7-3v-5",
  table: "M4 5h16v14H4z|M4 10h16|M4 15h16|M10 5v14|M15 5v14",
  browser: "M4 5h16v14H4z|M4 9h16|M7 7h.01|M9.5 7h.01",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z|M12 9a3 3 0 100 6 3 3 0 000-6z",
  book: "M5 4h11a2 2 0 012 2v14H7a2 2 0 01-2-2z|M5 18a2 2 0 012-2h11",
  robot: "M5 8h14v10H5z|M5 13H3|M19 13h2|M9 12v.01|M15 12v.01|M9 16c1 1 5 1 6 0|M12 5v3|M10 5h4",
  folder: "M3 6h6l2 2h10v11H3z",
  upload: "M12 16V5|M8 9l4-4 4 4|M5 19h14",
  gear: "M12 9a3 3 0 100 6 3 3 0 000-6z|M12 2v3|M12 19v3|M2 12h3|M19 12h3|M4.9 4.9l2.1 2.1|M17 17l2.1 2.1|M4.9 19.1L7 17|M17 7l2.1-2.1",
  bag: "M5 8h14l-1 13H6z|M9 8V6a3 3 0 016 0v2",
  hourglass: "M6 3h12|M6 21h12|M7 3v3l5 6 5-6V3|M7 21v-3l5-6 5 6v3",
  door: "M6 3h12v18H6z|M14 12h.01|M3 21h18",
  user: "M12 4a4 4 0 100 8 4 4 0 000-8z|M4 21c1-4 4-6 8-6s7 2 8 6",
  users: "M9 5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z|M2 20c.8-3.5 3.5-5 7-5s6.2 1.5 7 5|M16 5.5a3 3 0 010 6|M18 15c2 .6 3.4 2.2 4 5",
  lamp: "M3 14c2 3 6 4 10 3l4-3h4|M13 17l1 3H8l1-3|M8 11c0-2 2-3 4-3s4 1 4 3|M12 8V6|M17 14c1-2 3-3 5-3",
  image: "M4 5h16v14H4z|M4 16l5-5 4 4 3-3 4 4|M15 9h.01",
  bomb: "M10 9a6 6 0 100 12 6 6 0 000-12z|M14 10l3-3|M17 7l1.5-1.5|M19 3v2|M20 6h2",
  moon: "M20 15A8 8 0 019 4a8 8 0 1011 11z",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2z|M9 8h6|M9 12h6",
  tag: "M3 12V3h9l9 9-9 9z|M7.5 7.5h.01",
  msg: "M4 5h16v11H9l-5 4z",
  card: "M3 6h18v12H3z|M3 10h18|M7 15h4",
  puzzle: "M4 7h4a2 2 0 114 0h4v4a2 2 0 110 4v4H4z",
  spark: "M12 3v6|M12 15v6|M3 12h6|M15 12h6|M6 6l4 4|M14 14l4 4|M6 18l4-4|M14 10l4-4",
  home: "M3 11l9-7 9 7|M5 10v10h14V10",
  plug: "M9 3v5|M15 3v5|M7 8h10v4a5 5 0 01-10 0z|M12 17v4",
  dollar: "M12 3v18|M16 7c-1-1.5-2.5-2-4-2-2 0-4 1-4 3s2 3 4 3 4 1 4 3-2 3-4 3c-1.6 0-3-.6-4-2",
};
const LI: React.FC<{ name: string; size?: number; color?: string; sw?: number }> = ({ name, size = 48 * S, color = C.green, sw = 1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flexShrink: 0 }}>
    {(ICONS[name] ?? "").split("|").map((d, i) => <path key={i} d={d} />)}
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Shell pieces
// ─────────────────────────────────────────────────────────────────────────────
const SceneFade: React.FC<{ children: React.ReactNode; durationInFrames: number }> = ({ children, durationInFrames }) => {
  const frame = useCurrentFrame();
  const o = Math.min(interpolate(frame, [0, 12], [0, 1], clamp), interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], clamp));
  return <div style={{ opacity: o, height: "100%" }}>{children}</div>;
};
const ProgressBar: React.FC<{ progressPct: number; accent?: string }> = ({ progressPct, accent = C.green }) => {
  const frame = useCurrentFrame();
  const slideY = interpolate(frame, [0, 18], [-NAV_H, 0], clamp);
  return (
    <div style={{ position: "absolute", top: slideY, left: 0, right: 0, zIndex: 100, background: "rgba(9,9,15,0.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}`, padding: `${14 * S}px ${44 * S}px` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 * S }}>
        <Img src={staticFile("aischool-logo.webp")} style={{ height: 34 * S, width: "auto", mixBlendMode: "screen", opacity: 0.95 }} />
        <span style={{ fontFamily: MONO, fontSize: 18 * S, color: C.faint, letterSpacing: "0.08em" }}>CH 2-8</span>
      </div>
      <div style={{ height: 3 * S, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progressPct}%`, background: accent, borderRadius: 99, boxShadow: `0 0 8px ${accent}88` }} />
      </div>
    </div>
  );
};
// 左上常駐方位：段落編號＋標題（短 tick 底線，不做全幅）
const SectionHeader: React.FC<{ num: string; title: string; startFrame?: number; accent?: string }> = ({ num, title, startFrame = 0, accent = C.green }) => {
  const st = useFadeUpHeader(startFrame);
  const line = useDraw(startFrame + 8, 18);
  return (
    <div style={{ position: "absolute", left: CONTAINER_L, top: NAV_H + 34 * S, zIndex: 20, ...st }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 * S }}>
        <span style={{ fontFamily: MONO, fontSize: 20 * S, fontWeight: 500, color: accent, background: hexA(accent, 0.1), border: `1px solid ${hexA(accent, 0.32)}`, padding: `${6 * S}px ${16 * S}px`, borderRadius: 8 * S, letterSpacing: "0.1em" }}>{num}</span>
        <h2 style={{ fontFamily: TC, fontSize: 44 * S, fontWeight: 500, letterSpacing: "-0.01em", color: C.text, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ height: 3 * S, width: 64 * S, background: accent, borderRadius: 99, marginTop: 12 * S, transformOrigin: "left center", transform: `scaleX(${line})` }} />
    </div>
  );
};
const Disp: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ fontFamily: SYNE, fontWeight: 600, ...style }}>{children}</span>
);
// 舞台：標題下方的內容區（底部 ≤ 1840）
const STAGE_TOP = 400;
const STAGE_BOTTOM = H - SUBTITLE_H - 24; // 1816
const Stage: React.FC<{ children: React.ReactNode; opacity?: number; style?: React.CSSProperties }> = ({ children, opacity = 1, style }) => (
  <div style={{ position: "absolute", left: CONTAINER_L, width: CONTAINER_W, top: STAGE_TOP, height: STAGE_BOTTOM - STAGE_TOP, opacity, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", ...style }}>{children}</div>
);

// iMessage callout（不放寄件人）
const NOTIF_W = 420 * S, NOTIF_TOP = 12 * S, NOTIF_RIGHT = 20 * S, NOTIF_SLOT = 200 * S, FADE_OUT_F = 50;
const CalloutLayer: React.FC<{ callouts: Callout[] }> = ({ callouts }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {callouts.map((c, i) => <CalloutCard key={i} c={c} all={callouts} />)}
  </AbsoluteFill>
);
const CalloutCard: React.FC<{ c: Callout; all: Callout[] }> = ({ c, all }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - c.from;
  const dur = c.to - c.from;
  if (lf < 0 || lf >= dur + FADE_OUT_F) return null;
  let push = 0;
  for (const n of all) {
    if (n.from <= c.from || frame < n.from) continue;
    push += NOTIF_SLOT * spring({ frame: frame - n.from, fps, config: { damping: 22, stiffness: 120 } });
  }
  const slideY = interpolate(spring({ frame: lf, fps, config: { damping: 22, stiffness: 130 } }), [0, 1], [-200 * S, 0], clamp);
  const op = interpolate(lf, [0, 10, dur, dur + FADE_OUT_F], [0, 1, 1, 0], clamp) * interpolate(push / NOTIF_SLOT, [0, 1, 2], [1, 0.65, 0.35], clamp);
  const shown = c.text.slice(0, Math.floor(interpolate(Math.max(0, lf - 14), [0, c.text.length / 0.85], [0, c.text.length], clamp)));
  const sf = "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif";
  return (
    <div style={{ position: "absolute", top: NAV_H + NOTIF_TOP + push, right: NOTIF_RIGHT, width: NOTIF_W, transform: `translateY(${slideY}px)`, opacity: op, zIndex: 200 }}>
      <div style={{ background: "rgba(28,28,30,0.9)", backdropFilter: "blur(48px)", border: `${S}px solid rgba(255,255,255,0.13)`, borderRadius: 14 * S, boxShadow: `0 ${8 * S}px ${40 * S}px rgba(0,0,0,0.6)`, padding: `${10 * S}px ${14 * S}px`, display: "flex", gap: 11 * S }}>
        <div style={{ width: 52 * S, height: 52 * S, borderRadius: 9 * S, background: "linear-gradient(145deg,#3DDC6A,#25A244)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 22 * S, height: 16 * S, background: "white", borderRadius: 5 * S }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 * S }}>
            <span style={{ fontFamily: sf, fontSize: 22 * S, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>iMessage</span>
            <span style={{ fontFamily: sf, fontSize: 20 * S, color: "rgba(255,255,255,0.45)" }}>now</span>
          </div>
          <div style={{ fontFamily: sf, fontSize: 26 * S, color: "rgba(255,255,255,0.72)", lineHeight: 1.4 }}>{shown}</div>
        </div>
      </div>
    </div>
  );
};

type SceneProps = { callouts: Callout[]; dur: number };
const Shell: React.FC<SceneProps & { accent: string; pct: number; children: React.ReactNode; noBar?: boolean }> = ({ callouts, dur, accent, pct, children, noBar }) => (
  <SceneFade durationInFrames={dur}>
    <AbsoluteFill>
      <BrandBg accent={accent} />
      {children}
      {!noBar && <ProgressBar progressPct={pct} accent={accent} />}
      <CalloutLayer callouts={callouts} />
    </AbsoluteFill>
  </SceneFade>
);

// ─────────────────────────────────────────────────────────────────────────────
// 共用視覺元件
// ─────────────────────────────────────────────────────────────────────────────
const Pop: React.FC<{ at: number; kind?: "elastic" | "up" | "item"; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, kind = "elastic", children, style }) => {
  const e = useFadeUpElastic(at), u = useFadeUp(at), it = useFadeUpItem(at);
  const a = kind === "elastic" ? e : kind === "up" ? u : it;
  return <div style={{ ...style, opacity: a.opacity * (style?.opacity !== undefined ? Number(style.opacity) : 1), transform: `${a.transform} ${style?.transform ?? ""}` }}>{children}</div>;
};
// 圖示節點（icon 方塊 + 標籤）
const Node: React.FC<{ icon: string; label?: string; sub?: string; color: string; size?: number; lit?: number; labelSize?: number }> = ({ icon, label, sub, color, size = 150 * S, lit = 1, labelSize = 30 * S }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S }}>
    <div style={{ width: size, height: size, borderRadius: 30 * S, background: hexA(color, 0.06 + 0.08 * lit), border: `${1.5 * S}px solid ${hexA(color, 0.25 + 0.45 * lit)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <LI name={icon} size={size * 0.52} color={lit > 0.5 ? color : hexA(color, 0.55)} sw={1.6} />
    </div>
    {label && <div style={{ fontFamily: TC, fontSize: labelSize, color: lit > 0.5 ? C.text : C.muted, fontWeight: 500, whiteSpace: "nowrap" }}>{label}</div>}
    {sub && <div style={{ fontFamily: TC, fontSize: 24 * S, color: C.muted, whiteSpace: "nowrap" }}>{sub}</div>}
  </div>
);
const Chip: React.FC<{ text: string; color: string; icon?: string; size?: number; solid?: boolean }> = ({ text, color, icon, size = 28 * S, solid }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 12 * S, padding: `${10 * S}px ${22 * S}px`, borderRadius: 99, background: solid ? hexA(color, 0.16) : hexA(color, 0.07), border: `${1.5 * S}px solid ${hexA(color, 0.45)}`, whiteSpace: "nowrap" }}>
    {icon && <LI name={icon} size={size * 1.1} color={color} sw={2} />}
    <span style={{ fontFamily: TC, fontSize: size, color: C.text, fontWeight: 500 }}>{text}</span>
  </div>
);
// 名詞卡：小字「名詞」灰 → 名詞大字上色＋螢光筆底線 → 補充更小字
const TermCard: React.FC<{ at: number; term: string; en?: string; def: string; color: string }> = ({ at, term, en, def, color }) => {
  const a = useFadeUpElastic(at);
  const hl = useDraw(at + 10, 18);
  return (
    <div style={{ ...a, display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 10 * S, padding: `${26 * S}px ${40 * S}px`, borderRadius: 24 * S, background: "rgba(17,17,24,0.92)", border: `${1.5 * S}px solid ${C.borderHi}` }}>
      <span style={{ fontFamily: MONO, fontSize: 20 * S, color: C.muted, letterSpacing: "0.16em" }}>名詞</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18 * S }}>
        <span style={{ position: "relative", fontFamily: TC, fontSize: 64 * S, color, fontWeight: 500 }}>
          <span style={{ position: "absolute", left: -4 * S, right: -4 * S, bottom: 6 * S, height: 18 * S, background: hexA(color, 0.22), transformOrigin: "left", transform: `scaleX(${hl})`, borderRadius: 4 * S }} />
          <span style={{ position: "relative" }}>{term}</span>
        </span>
        {en && <Disp style={{ fontSize: 30 * S, color: C.muted, fontWeight: 600 }}>{en}</Disp>}
      </div>
      <span style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted }}>{def}</span>
    </div>
  );
};
// 逐字出現（每字 4f）
const WordReveal: React.FC<{ text: string; at: number; color?: string; size: number; font?: string; weight?: number }> = ({ text, at, color = C.text, size, font = TC, weight = 500 }) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ fontFamily: font, fontSize: size, color, fontWeight: weight }}>
      {Array.from(text).map((ch, i) => {
        const o = interpolate(frame, [at + i * 4, at + i * 4 + 8], [0, 1], clamp);
        return <span key={i} style={{ opacity: o, display: "inline-block", transform: `translateY(${(1 - o) * 6 * S}px)`, whiteSpace: "pre" }}>{ch}</span>;
      })}
    </span>
  );
};
// 大字關鍵句：前導小字灰 → 重點大字上色＋螢光筆底線
const KeyLine: React.FC<{ at: number; lead?: string; main: string; color: string; size?: number }> = ({ at, lead, main, color, size = 76 * S }) => {
  const a = useFadeUpHeader(at);
  const hl = useDraw(at + 12, 20);
  return (
    <div style={{ ...a, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S }}>
      {lead && <span style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted }}>{lead}</span>}
      <span style={{ position: "relative", fontFamily: TC, fontSize: size, color, fontWeight: 500, letterSpacing: "-0.01em" }}>
        <span style={{ position: "absolute", left: -6 * S, right: -6 * S, bottom: size * 0.08, height: size * 0.28, background: hexA(color, 0.2), transformOrigin: "left", transform: `scaleX(${hl})`, borderRadius: 4 * S }} />
        <span style={{ position: "relative" }}>{main}</span>
      </span>
    </div>
  );
};
// SVG 連接線（viewBox 1920×1080：1 單位 = S px）— draw-on / marching dash
const Wire: React.FC<{ x1: number; y1: number; x2: number; y2: number; at: number; color: string; march?: boolean; dur?: number; width?: number; curve?: number }> = ({ x1, y1, x2, y2, at, color, march, dur = 18, width = 2, curve = 0 }) => {
  const frame = useCurrentFrame();
  const p = useDraw(at, dur);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - curve;
  const d = `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`;
  return (
    <svg width={W} height={H} viewBox="0 0 1920 1080" style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      <path d={d} fill="none" stroke={hexA(color, 0.25)} strokeWidth={width} pathLength={1} strokeDasharray={`${p} 1`} />
      {march && p > 0.98 && <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray="6 8" strokeDashoffset={-frame * 0.6} />}
      {!march && <path d={d} fill="none" stroke={color} strokeWidth={width} pathLength={1} strokeDasharray={`${p} 1`} />}
    </svg>
  );
};
// 沿二次曲線飛行的物件（x,y 為 1920 基準座標）
const Flyer: React.FC<{ x1: number; y1: number; x2: number; y2: number; a: number; b: number; curve?: number; children: React.ReactNode }> = ({ x1, y1, x2, y2, a, b, curve = 0, children }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [a, b], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  if (frame < a) return null;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - curve;
  const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2;
  const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2;
  return <div style={{ position: "absolute", left: x * S, top: y * S, transform: "translate(-50%,-50%)", zIndex: 30 }}>{children}</div>;
};
// 手機（片頭鉤子 / 片尾回扣）
const PhoneMock: React.FC<{ state: "chat" | "error" | "ok"; url: string; scale?: number; tapAt?: number }> = ({ state, url, scale = 1, tapAt }) => {
  const frame = useCurrentFrame();
  const w = 330 * S * scale, h = 660 * S * scale, k = scale;
  const ring = tapAt !== undefined ? interpolate(frame, [tapAt, tapAt + 14], [0, 1], clamp) : 0;
  return (
    <div style={{ width: w, height: h, borderRadius: 52 * S * k, border: `${5 * S * k}px solid #2a2a34`, background: "#0e0e14", boxShadow: `0 ${30 * S}px ${80 * S}px rgba(0,0,0,0.6)`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 14 * S * k, left: "50%", transform: "translateX(-50%)", width: 90 * S * k, height: 22 * S * k, borderRadius: 99, background: "#000" }} />
      {state === "chat" ? (
        <div style={{ position: "absolute", top: 70 * S * k, left: 20 * S * k, right: 20 * S * k }}>
          <div style={{ fontFamily: TC, fontSize: 22 * S * k, color: C.muted, textAlign: "center", marginBottom: 26 * S * k }}>朋友</div>
          <div style={{ position: "relative", display: "inline-block", maxWidth: "92%", background: "#26262e", borderRadius: 22 * S * k, padding: `${16 * S * k}px ${20 * S * k}px` }}>
            <div style={{ fontFamily: TC, fontSize: 22 * S * k, color: C.text, marginBottom: 6 * S * k }}>我做好了 你看看</div>
            <div style={{ fontFamily: MONO, fontSize: 20 * S * k, color: "#6ab8ff", textDecoration: "underline", wordBreak: "break-all" }}>{url}</div>
            {tapAt !== undefined && ring > 0 && ring < 1 && (
              <div style={{ position: "absolute", left: "45%", top: "70%", width: 120 * S * k * ring, height: 120 * S * k * ring, borderRadius: 99, border: `${3 * S}px solid rgba(255,255,255,${0.7 * (1 - ring)})`, transform: "translate(-50%,-50%)" }} />
            )}
          </div>
        </div>
      ) : (
        <>
          <div style={{ position: "absolute", top: 54 * S * k, left: 18 * S * k, right: 18 * S * k, height: 40 * S * k, borderRadius: 12 * S * k, background: "#1c1c24", display: "flex", alignItems: "center", padding: `0 ${14 * S * k}px`, gap: 8 * S * k }}>
            <LI name={state === "ok" ? "lock" : "globe"} size={20 * S * k} color={state === "ok" ? C.green : C.gray} sw={2} />
            <span style={{ fontFamily: MONO, fontSize: 18 * S * k, color: C.muted, whiteSpace: "nowrap", overflow: "hidden" }}>{url}</span>
          </div>
          {state === "error" ? (
            <div style={{ position: "absolute", top: 180 * S * k, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S * k }}>
              <LI name="warning" size={90 * S * k} color={C.gray} sw={1.5} />
              <div style={{ fontFamily: TC, fontSize: 30 * S * k, color: C.text, fontWeight: 500 }}>無法連上這個網站</div>
            </div>
          ) : (
            <div style={{ position: "absolute", top: 118 * S * k, left: 18 * S * k, right: 18 * S * k, display: "flex", flexDirection: "column", gap: 14 * S * k }}>
              <div style={{ height: 160 * S * k, borderRadius: 16 * S * k, background: `linear-gradient(135deg, ${hexA(C.green, 0.35)}, ${hexA("#6ab8ff", 0.3)})` }} />
              <div style={{ height: 20 * S * k, width: "70%", borderRadius: 6 * S, background: "rgba(255,255,255,0.22)" }} />
              <div style={{ height: 14 * S * k, width: "90%", borderRadius: 6 * S, background: "rgba(255,255,255,0.12)" }} />
              <div style={{ display: "flex", gap: 10 * S * k }}>
                {[0, 1, 2].map((i) => <div key={i} style={{ flex: 1, height: 90 * S * k, borderRadius: 12 * S * k, background: "rgba(255,255,255,0.08)" }} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
// 部署三步驟 rail（2.1 / 2.2 / 2.3 常駐）
const STEPS = ["上傳程式碼", "設定部署平台", "取得網址"];
const StepRail: React.FC<{ active: number; at: number }> = ({ active, at }) => {
  const frame = useCurrentFrame();
  const a = useFadeUpHeader(at);
  return (
    <div style={{ position: "absolute", right: CONTAINER_L, top: NAV_H + 40 * S, display: "flex", alignItems: "center", gap: 14 * S, ...a }}>
      {STEPS.map((s, i) => {
        const lit = i === active ? interpolate(frame, [at + 10 + i * 6, at + 22 + i * 6], [0, 1], clamp) : 0;
        const done = i < active;
        const col = i === active ? C.green : done ? hexA(C.green, 0.7) : C.faint;
        return (
          <React.Fragment key={s}>
            {i > 0 && <div style={{ width: 40 * S, height: 2 * S, background: i <= active ? hexA(C.green, 0.6) : C.border }} />}
            <div style={{ display: "flex", alignItems: "center", gap: 10 * S, padding: `${10 * S}px ${20 * S}px`, borderRadius: 99, border: `${1.5 * S}px solid ${i === active ? hexA(C.green, 0.4 + 0.4 * lit) : C.border}`, background: i === active ? hexA(C.green, 0.12 * lit) : "transparent" }}>
              <span style={{ width: 34 * S, height: 34 * S, borderRadius: 99, border: `${1.5 * S}px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 18 * S, color: col }}>
                {done ? <LI name="check" size={22 * S} color={col} sw={2.6} /> : i + 1}
              </span>
              <span style={{ fontFamily: TC, fontSize: 24 * S, color: i === active ? C.text : C.muted }}>{s}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
// 平台小卡
const PLAT: Record<string, { name: string; color: string; icon: string }> = {
  gas: { name: "Google Apps Script", color: C.yellow, icon: "table" },
  ghp: { name: "GitHub Pages", color: C.green, icon: "browser" },
  cfp: { name: "Cloudflare Pages", color: C.orange, icon: "cloud" },
  zea: { name: "Zeabur", color: C.purple, icon: "server" },
};
const PlatBadge: React.FC<{ id: string; size?: number; tag?: string }> = ({ id, size = 34 * S, tag }) => {
  const p = PLAT[id];
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 16 * S, padding: `${14 * S}px ${26 * S}px`, borderRadius: 20 * S, background: hexA(p.color, 0.08), border: `${1.5 * S}px solid ${hexA(p.color, 0.5)}` }}>
      <LI name={p.icon} size={size * 1.3} color={p.color} sw={1.8} />
      <Disp style={{ fontSize: size, color: C.text }}>{p.name}</Disp>
      {tag && <span style={{ fontFamily: TC, fontSize: 22 * S, color: p.color, border: `1px solid ${hexA(p.color, 0.5)}`, borderRadius: 8 * S, padding: `${2 * S}px ${10 * S}px` }}>{tag}</span>}
    </div>
  );
};
// 優點／限制列（icon 與文字分開 stagger）
const ProRow: React.FC<{ at: number; ok: boolean; text: string; sub?: string; color?: string }> = ({ at, ok, text, sub, color }) => {
  const ic = useFadeUpElastic(at);
  const tx = useFadeUpItem(at + 4);
  const col = color ?? (ok ? C.green : C.red);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22 * S, padding: `${16 * S}px ${26 * S}px`, borderRadius: 18 * S, background: C.surface, border: `${1.5 * S}px solid ${hexA(col, 0.22)}` }}>
      <div style={{ ...ic, width: 56 * S, height: 56 * S, borderRadius: 99, background: hexA(col, 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LI name={ok ? "check" : "cross"} size={30 * S} color={col} sw={2.6} />
      </div>
      <div style={{ ...tx, display: "flex", flexDirection: "column", gap: 4 * S }}>
        <span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, fontWeight: 500 }}>{text}</span>
        {sub && <span style={{ fontFamily: TC, fontSize: 24 * S, color: C.muted }}>{sub}</span>}
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// HOOK — 片頭 90f 無聲：朋友手機收到 localhost 連結 → 點開 → 無法連上這個網站
// ═════════════════════════════════════════════════════════════════════════════
const HookScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const t1 = useFadeUpHeader(4);
  const t2 = useFadeUpElastic(50);
  const shake = frame >= 50 && frame < 62 ? Math.sin((frame - 50) * 2.2) * 8 * S * (1 - (frame - 50) / 12) : 0;
  const bubble = useFadeUpElastic(8);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.gray} />
        <AbsoluteFill style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 200 * S, paddingTop: NAV_H, paddingBottom: 120 * S }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 30 * S, alignItems: "flex-start" }}>
            <div style={{ ...t1, fontFamily: TC, fontSize: 80 * S, color: C.text, fontWeight: 500 }}>網址傳給朋友</div>
            <div style={{ ...t2, fontFamily: TC, fontSize: 80 * S, color: C.red, fontWeight: 500, transform: `${t2.transform} translateX(${shake}px)` }}>他打開什麼都看不到</div>
          </div>
          <div style={{ position: "relative", transform: `translateX(${shake}px)` }}>
            {frame < 44 ? (
              <div style={bubble}><PhoneMock state="chat" url="localhost:5500/index.html" scale={0.95} tapAt={30} /></div>
            ) : (
              <PhoneMock state="error" url="localhost:5500" scale={0.95} />
            )}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 0.1 — 開場：全集地圖亮 2-8 → 錯誤現場回扣 → 本機環境名詞卡 → 這支做完你會
// cues(local): 0 上單元爬蟲 | 269 部署(8.96) | 461 放到網路上(15.36) | 653 假設(21.76) | 812 自己電腦跑得好(27.08)
//   920 網址貼給朋友(30.68) | 994 什麼都看不到(33.12) | 1178 程式沒問題(39.28) | 1272 本機的環境(42.40)
//   1361 只有自己電腦(45.36) | 1538 部署(51.28) | 1636 這個單元(54.52) | 1709 是什麼/怎麼做(56.96) | 1784 主流方案(59.48)
// ═════════════════════════════════════════════════════════════════════════════
const Scene01Open: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const breathe = useBreathe(70);
  const map = useFadeUp(0);
  const title = useFadeUpHeader(269);
  const sub = useFadeUp(461);
  const pA = win(frame, 0, 653);
  const pB = win(frame, 653, 1636);
  const pC = win(frame, 1636, dur + 20);
  const ring = useDraw(1178, 26);
  const chapters = [
    { n: "2-6", t: "API", st: "done" }, { n: "2-7", t: "爬蟲", st: "done" }, { n: "2-8", t: "部署", st: "now" }, { n: "2-9", t: "", st: "next" },
  ];
  const errOn = frame >= 994;
  const deployOn = frame >= 1538;
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[0]}>
      {/* A 全集地圖 + 片名 */}
      <Stage opacity={pA} style={{ top: NAV_H + 60 * S, gap: 50 * S }}>
        <div style={{ ...map, display: "flex", alignItems: "center", gap: 18 * S }}>
          {chapters.map((c, i) => (
            <React.Fragment key={c.n}>
              {i > 0 && <div style={{ width: 50 * S, height: 2 * S, background: c.st === "next" ? C.border : hexA(C.green, 0.4) }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 12 * S, padding: `${12 * S}px ${24 * S}px`, borderRadius: 14 * S, border: `${1.5 * S}px solid ${c.st === "now" ? C.green : C.border}`, background: c.st === "now" ? hexA(C.green, 0.12) : C.surface, opacity: c.st === "next" ? 0.45 : 1 }}>
                {c.st === "done" && <LI name="check" size={26 * S} color={hexA(C.green, 0.8)} sw={2.6} />}
                <span style={{ fontFamily: MONO, fontSize: 24 * S, color: c.st === "now" ? C.green : C.muted }}>{c.n}</span>
                {c.t && <span style={{ fontFamily: TC, fontSize: 28 * S, color: c.st === "now" ? C.text : C.muted }}>{c.t}</span>}
              </div>
            </React.Fragment>
          ))}
        </div>
        <div style={{ ...title, textAlign: "center" }}>
          <h1 style={{ fontFamily: TC, fontSize: 190 * S, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em", color: C.green, margin: 0, display: "inline-block", transform: `scale(${1 + 0.012 * breathe})` }}>部署</h1>
        </div>
        <div style={{ ...sub, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S }}>
          <span style={{ fontFamily: TC, fontSize: 40 * S, color: C.text }}>把做好的程式放到網路上</span>
          <span style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted }}>讓其他人也能使用</span>
        </div>
      </Stage>
      {/* B 錯誤現場回扣 → 本機環境 */}
      <div style={{ position: "absolute", inset: 0, opacity: pB }}>
        <div style={{ position: "absolute", left: 560 * S - 160 * S, top: 300 * S, width: 320 * S, display: "flex", justifyContent: "center" }}>
          <Pop at={653}><Node icon="laptop" label="你的電腦" color={C.gray} size={220 * S} labelSize={34 * S} /></Pop>
        </div>
        {frame >= 812 && <div style={{ position: "absolute", left: 560 * S + 70 * S, top: 285 * S }}><Pop at={812}><div style={{ width: 64 * S, height: 64 * S, borderRadius: 99, background: hexA(C.green, 0.15), border: `${1.5 * S}px solid ${C.green}`, display: "flex", alignItems: "center", justifyContent: "center" }}><LI name="check" size={36 * S} color={C.green} sw={2.6} /></div></Pop></div>}
        <svg width={W} height={H} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
          <circle cx={560} cy={410} r={175} fill="none" stroke={C.gray} strokeWidth={2.5} strokeDasharray="8 8" pathLength={1} style={{ strokeDasharray: `${ring} 1` }} />
        </svg>
        <Wire x1={720} y1={410} x2={1200} y2={410} at={920} color={deployOn ? C.green : C.gray} march={deployOn} />
        <Flyer x1={720} y1={410} x2={1190} y2={410} a={920} b={990}>
          {frame < 994 && <Chip text="網址" icon="link" color={C.gray} size={24 * S} />}
        </Flyer>
        {deployOn && <div style={{ position: "absolute", left: 960 * S, top: 360 * S, transform: "translateX(-50%)" }}><Pop at={1538}><Chip text="部署" color={C.green} icon="upload" size={32 * S} solid /></Pop></div>}
        <div style={{ position: "absolute", left: 1360 * S - 130 * S, top: 165 * S }}>
          <Pop at={900}>
            <div style={{ position: "relative" }}>
              <PhoneMock state={errOn ? "error" : "chat"} url={errOn ? "localhost:5500" : "localhost:5500/index.html"} scale={0.8} />
              <div style={{ position: "absolute", left: "50%", bottom: -60 * S, transform: "translateX(-50%)", fontFamily: TC, fontSize: 30 * S, color: C.muted, whiteSpace: "nowrap" }}>朋友的手機</div>
            </div>
          </Pop>
        </div>
        <div style={{ position: "absolute", left: 560 * S, top: 650 * S, transform: "translateX(-50%)" }}>
          {frame >= 1272 && <TermCard at={1272} term="本機環境" def="只有你自己的電腦才看得到的版本" color={C.gray} />}
        </div>
      </div>
      {/* C 這支做完你會 */}
      <Stage opacity={pC} style={{ gap: 30 * S }}>
        <Pop at={1636} kind="up"><div style={{ fontFamily: MONO, fontSize: 24 * S, color: C.green, letterSpacing: "0.16em", marginBottom: 20 * S }}>這支做完你會知道</div></Pop>
        {[{ t: "部署到底是什麼", at: 1709, i: "upload" }, { t: "要怎麼做", at: 1740, i: "gear" }, { t: "現在的主流方案有哪些", at: 1784, i: "layers" }].map((r, i) => (
          <Pop key={r.t} at={r.at} kind="item">
            <div style={{ display: "flex", alignItems: "center", gap: 26 * S, width: 1100 * S, padding: `${22 * S}px ${34 * S}px`, borderRadius: 20 * S, background: C.surface, border: `${1.5 * S}px solid ${hexA(C.green, 0.25)}` }}>
              <span style={{ fontFamily: MONO, fontSize: 26 * S, color: C.green }}>0{i + 1}</span>
              <LI name={r.i === "layers" ? "server" : r.i} size={44 * S} color={C.green} />
              <span style={{ fontFamily: TC, fontSize: 40 * S, color: C.text }}>{r.t}</span>
            </div>
          </Pop>
        ))}
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 1.1 — 什麼是部署：程式碼傳給朋友卡關 → 程式搬上網路主機吐出網址 → 三台裝置打開；名詞卡「部署」
// cues: 254 傳給對方(8.46) | 317 沒辦法直接用(10.56) | 381 安裝環境(12.70) | 459 執行程式(15.30) | 500 門檻(16.66)
//   645 放在網路上的環境(21.50) | 756 穩定執行(25.20) | 810 提供網址(27.00) | 855 打開瀏覽器(28.50) | 963 搬到網路上(32.10) | 1064 叫做部署(35.46)
// ═════════════════════════════════════════════════════════════════════════════
const Scene11What: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 628);
  const pB = win(frame, 628, dur + 20);
  const pulse = useBreathe(40);
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[1]}>
      <SectionHeader num="01" title="什麼是部署" accent={C.green} />
      {/* A：只傳程式碼 → 對方卡關 */}
      <div style={{ position: "absolute", inset: 0, opacity: pA }}>
        <div style={{ position: "absolute", left: 480 * S, top: 430 * S, transform: "translate(-50%,-50%)" }}><Pop at={20}><Node icon="laptop" label="你的電腦" color={C.green} size={200 * S} /></Pop></div>
        <div style={{ position: "absolute", left: 1440 * S, top: 430 * S, transform: "translate(-50%,-50%)" }}><Pop at={141}><Node icon="laptop" label="朋友的電腦" color={C.gray} size={200 * S} /></Pop></div>
        <Wire x1={600} y1={400} x2={1320} y2={400} at={254} color={C.gray} curve={60} />
        <Flyer x1={600} y1={400} x2={1300} y2={400} a={254} b={317} curve={60}><Chip text="程式碼" icon="code" color={C.text} size={26 * S} /></Flyer>
        <div style={{ position: "absolute", left: 1440 * S, top: 640 * S, transform: "translateX(-50%)", display: "flex", gap: 24 * S }}>
          <Pop at={381}><Chip text="安裝環境" icon="cross" color={C.red} /></Pop>
          <Pop at={459}><Chip text="執行程式" icon="cross" color={C.red} /></Pop>
        </div>
        <div style={{ position: "absolute", left: 1440 * S, top: 760 * S, transform: "translateX(-50%)" }}>
          <Pop at={500}><span style={{ fontFamily: TC, fontSize: 32 * S, color: C.muted }}>非工程背景的人<span style={{ color: C.red }}>有門檻</span></span></Pop>
        </div>
      </div>
      {/* B：搬到網路上 → 網址 → 任何人打開 */}
      <div style={{ position: "absolute", inset: 0, opacity: pB }}>
        <div style={{ position: "absolute", left: 380 * S, top: 520 * S, transform: "translate(-50%,-50%)" }}><Pop at={628}><Node icon="laptop" label="你的電腦" color={C.gray} size={170 * S} /></Pop></div>
        <div style={{ position: "absolute", left: 900 * S, top: 380 * S, transform: "translate(-50%,-50%)" }}>
          <Pop at={645}>
            <div style={{ transform: `scale(${frame >= 756 ? 1 + 0.03 * pulse : 1})` }}>
              <Node icon="cloud" label="網路上的主機" sub={frame >= 756 ? "穩定執行" : undefined} color={C.green} size={220 * S} />
            </div>
          </Pop>
        </div>
        <Wire x1={470} y1={500} x2={790} y2={400} at={645} color={C.green} curve={40} march={frame > 700} />
        <Flyer x1={470} y1={500} x2={800} y2={400} a={660} b={730} curve={40}>{frame < 735 && <Chip text="程式" icon="code" color={C.green} size={24 * S} />}</Flyer>
        <div style={{ position: "absolute", left: 900 * S, top: 600 * S, transform: "translateX(-50%)" }}>
          <Pop at={810}><Chip text="https 網址" icon="link" color={C.green} size={30 * S} solid /></Pop>
        </div>
        {[{ i: "laptop", y: 260, at: 855 }, { i: "phone", y: 430, at: 867 }, { i: "monitor", y: 600, at: 879 }].map((d) => (
          <React.Fragment key={d.i}>
            <Wire x1={1010} y1={380} x2={1400} y2={d.y} at={d.at} color={C.green} march={frame > d.at + 20} />
            <div style={{ position: "absolute", left: 1490 * S, top: d.y * S, transform: "translate(-50%,-50%)" }}><Pop at={d.at}><Node icon={d.i} color={C.green} size={130 * S} /></Pop></div>
          </React.Fragment>
        ))}
        <div style={{ position: "absolute", left: 1700 * S, top: 430 * S, transform: "translate(-50%,-50%)" }}><Pop at={890}><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.text, writingMode: "vertical-rl" }}>任何人都能打開</span></Pop></div>
        <div style={{ position: "absolute", left: 380 * S, top: 690 * S, transform: "translateX(-50%)" }}>
          {frame >= 1064 && <TermCard at={1064} term="部署" def="把程式從你的電腦搬到網路上讓別人使用" color={C.green} />}
        </div>
      </div>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 1.2 — 兩種部署方式：左 平台一鍵（Publish → 連結）右 手動（localhost 只有自己 → 多步路徑）
// cues: 95 平台一鍵(3.16) | 275 明顯按鈕(9.16) | 371 Publish(12.36) | 438 按下去(14.60) | 484 生成連結(16.12)
//   560 貼給朋友(18.68) | 688 超方便(22.92) | 775 收費(25.84) | 890 手動部署(29.68) | 1122 只有自己電腦(37.40)
//   1237 額外設定(41.24) | 1314 上傳線上空間(43.80) | 1404 選平台(46.80) | 1452 做設定(48.40) | 1488 有效連結(49.60)
// ═════════════════════════════════════════════════════════════════════════════
const Scene12Two: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const leftDim = interpolate(frame, [880, 900], [1, 0.4], clamp);
  const rightDim = interpolate(frame, [880, 900], [0.4, 1], clamp);
  const press = frame >= 438 && frame < 446 ? 0.94 : 1;
  const colW = 1420 * S / 2;
  const steps = [{ t: "上傳到線上空間", at: 1314, i: "upload" }, { t: "選部署平台", at: 1404, i: "server" }, { t: "做一些設定", at: 1452, i: "gear" }];
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[2]}>
      <SectionHeader num="01" title="兩種部署方式" accent={C.green} />
      <div style={{ position: "absolute", left: CONTAINER_L, top: STAGE_TOP, width: CONTAINER_W, height: STAGE_BOTTOM - STAGE_TOP, display: "flex", gap: 60 * S }}>
        {/* 左：平台一鍵 */}
        <div style={{ width: colW, opacity: leftDim, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * S }}>
          <Pop at={95} kind="up"><Chip text="平台一鍵部署" color={C.green} size={34 * S} solid /></Pop>
          <Pop at={181}>
            <div style={{ position: "relative", width: 640 * S, height: 360 * S, borderRadius: 22 * S, background: C.surface, border: `${1.5 * S}px solid ${C.borderHi}`, overflow: "hidden" }}>
              <div style={{ height: 44 * S, background: C.surface2, display: "flex", alignItems: "center", padding: `0 ${18 * S}px`, gap: 10 * S }}>
                {[0, 1, 2].map((i) => <span key={i} style={{ width: 12 * S, height: 12 * S, borderRadius: 99, background: "rgba(255,255,255,0.18)" }} />)}
                <span style={{ fontFamily: TC, fontSize: 20 * S, color: C.muted, marginLeft: 12 * S }}>AI 應用程式生成平台</span>
                {frame >= 275 && (
                  <div style={{ marginLeft: "auto", transform: `scale(${press})` }}>
                    <Pop at={275}><div style={{ padding: `${6 * S}px ${20 * S}px`, borderRadius: 10 * S, background: C.green, fontFamily: SYNE, fontWeight: 600, fontSize: 22 * S, color: "#08130c" }}>{frame >= 371 ? "Publish" : "發布"}</div></Pop>
                  </div>
                )}
              </div>
              <div style={{ padding: 24 * S, display: "flex", flexDirection: "column", gap: 14 * S }}>
                <div style={{ height: 100 * S, borderRadius: 14 * S, background: "rgba(255,255,255,0.06)" }} />
                <div style={{ height: 18 * S, width: "60%", borderRadius: 6 * S, background: "rgba(255,255,255,0.1)" }} />
                <div style={{ height: 18 * S, width: "80%", borderRadius: 6 * S, background: "rgba(255,255,255,0.06)" }} />
              </div>
              {frame >= 275 && frame < 470 && (
                <div style={{ position: "absolute", right: 60 * S, top: 6 * S, width: 100 * S, height: 34 * S, borderRadius: 10 * S, border: `${2 * S}px solid ${hexA(C.green, 0.6 + 0.4 * Math.sin(frame / 6))}` }} />
              )}
            </div>
          </Pop>
          <div style={{ display: "flex", alignItems: "center", gap: 24 * S }}>
            <Pop at={484}><Chip text="分享連結" icon="link" color={C.green} /></Pop>
            {frame >= 560 && <Pop at={560}><LI name="phone" size={70 * S} color={C.green} /></Pop>}
            {frame >= 688 && <Pop at={688}><span style={{ fontFamily: TC, fontSize: 32 * S, color: C.green }}>超級方便</span></Pop>}
          </div>
          <Pop at={775}><Chip text="通常需要收費" icon="dollar" color={C.red} size={28 * S} /></Pop>
        </div>
        <div style={{ width: 2, background: C.border }} />
        {/* 右：手動 */}
        <div style={{ width: colW, opacity: rightDim, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * S }}>
          <Pop at={890} kind="up"><Chip text="手動部署" color={C.text} size={34 * S} solid /></Pop>
          <Pop at={968}>
            <div style={{ display: "flex", alignItems: "center", gap: 30 * S }}>
              <Node icon="laptop" label="你的電腦" color={frame >= 1122 ? C.gray : C.text} size={150 * S} />
              {frame >= 1122 && <Pop at={1122}><Chip text="localhost 只有自己打得開" color={C.gray} size={26 * S} /></Pop>}
            </div>
          </Pop>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 * S }}>
            {frame >= 1237 && <Pop at={1237} kind="up"><span style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted }}>要自己做額外設定</span></Pop>}
            {steps.map((s, i) => (
              <Pop key={s.t} at={s.at} kind="item">
                <div style={{ display: "flex", alignItems: "center", gap: 18 * S }}>
                  <span style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, width: 40 * S }}>{i + 1}</span>
                  <LI name={s.i} size={40 * S} color={C.text} />
                  <span style={{ fontFamily: TC, fontSize: 30 * S, color: C.text }}>{s.t}</span>
                </div>
              </Pop>
            ))}
            <Pop at={1488}><Chip text="任何人都能打開的有效連結" icon="link" color={C.green} size={28 * S} solid /></Pop>
          </div>
        </div>
      </div>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 1.3 — 為什麼要提前決定：反直覺問題卡 → 拼圖插不進平台插槽 → AI 修補沙漏 → 收句
// cues: 40 最後才做(1.32) | 248 合理(8.28) | 404 不同平台(13.48) | 442 結構和執行方式(14.72) | 587 寫完之後(19.56)
//   650 才選(21.68) | 806 不太相容(26.88) | 883 AI調整(29.44) | 988 不一定順利(32.92) | 1061 花不少時間(35.36)
//   1168 所以建議(38.92) | 1207 動手之前(40.24) | 1259 先了解平台(41.96) | 1369 替代方案(45.64) | 1440 更有彈性(48.00)
// ═════════════════════════════════════════════════════════════════════════════
const Scene13Early: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 404);
  const pB = win(frame, 404, 1168);
  const pC = win(frame, 1168, dur + 20);
  const tryX = interpolate(frame, [650, 760, 790, 806], [-260, -40, -40, -110], clamp);
  const shake = frame >= 790 && frame < 812 ? Math.sin((frame - 790) * 2) * 10 * S : 0;
  const spin = (frame - 883) * 4;
  const slot = (notch: number, color: string, lbl: string, i: number) => (
    <Pop key={lbl} at={404 + i * 10}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S }}>
        <svg width={220 * S} height={160 * S} viewBox="0 0 110 80">
          <path d={`M5 5 H${30 + notch} v14 a8 8 0 0 0 16 0 v-14 H105 V75 H5 Z`} fill={hexA(color, 0.06)} stroke={hexA(color, 0.55)} strokeWidth={1.5} strokeDasharray="4 3" />
        </svg>
        <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted }}>{lbl}</span>
      </div>
    </Pop>
  );
  return (
    <Shell callouts={callouts} dur={dur} accent={C.yellow} pct={PROGRESS_PCT[3]}>
      <SectionHeader num="01" title="為什麼要提前決定" accent={C.green} />
      <Stage opacity={pA} style={{ gap: 40 * S }}>
        <Pop at={40}>
          <div style={{ display: "flex", alignItems: "center", gap: 30 * S, padding: `${40 * S}px ${60 * S}px`, borderRadius: 28 * S, background: C.surface, border: `${1.5 * S}px solid ${C.borderHi}` }}>
            <LI name="question" size={110 * S} color={C.yellow} sw={1.5} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
              <span style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted }}>先把程式寫完</span>
              <span style={{ fontFamily: TC, fontSize: 70 * S, color: C.text, fontWeight: 500 }}>部署最後再想</span>
            </div>
          </div>
        </Pop>
        <Pop at={248}><span style={{ fontFamily: TC, fontSize: 32 * S, color: C.muted }}>這樣想很合理</span></Pop>
      </Stage>
      <Stage opacity={pB} style={{ gap: 46 * S }}>
        <Pop at={404} kind="up"><span style={{ fontFamily: TC, fontSize: 34 * S, color: C.text }}>每個部署平台對專案結構和執行方式的<span style={{ color: C.yellow }}>要求不同</span></span></Pop>
        <div style={{ display: "flex", gap: 60 * S }}>
          {slot(0, C.yellow, "平台 A", 0)}
          {slot(30, C.green, "平台 B", 1)}
          {slot(50, C.orange, "平台 C", 2)}
        </div>
        <div style={{ position: "relative", height: 200 * S, width: 1200 * S }}>
          {frame >= 587 && (
            <div style={{ position: "absolute", left: "50%", top: 0, transform: `translateX(${tryX * S + shake - 110 * S}px)` }}>
              <Pop at={587}>
                <svg width={220 * S} height={150 * S} viewBox="0 0 110 75">
                  <path d="M5 5 H55 v14 a8 8 0 0 1 16 0 v-14 H105 V70 H5 Z" fill={hexA(C.text, 0.1)} stroke={frame >= 806 ? C.red : C.text} strokeWidth={1.6} />
                  <text x={55} y={50} textAnchor="middle" fontSize={14} fill={C.text} fontFamily="Noto Sans TC">你的專案</text>
                </svg>
              </Pop>
            </div>
          )}
          {frame >= 806 && <div style={{ position: "absolute", left: "50%", top: 20 * S, transform: `translateX(${80 * S}px)` }}><Pop at={806}><Chip text="不太相容" icon="cross" color={C.red} /></Pop></div>}
        </div>
        <div style={{ display: "flex", gap: 40 * S, alignItems: "center", minHeight: 80 * S }}>
          {frame >= 883 && <Pop at={883}><div style={{ display: "flex", alignItems: "center", gap: 14 * S }}><div style={{ transform: `rotate(${Math.max(0, spin) % 360}deg)` }}><LI name="hourglass" size={56 * S} color={C.yellow} /></div><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.text }}>請 AI 幫你調整</span></div></Pop>}
          {frame >= 988 && <Pop at={988}><Chip text="不一定順利" color={C.red} size={28 * S} /></Pop>}
          {frame >= 1061 && <Pop at={1061}><Chip text="花不少時間修改" icon="clock" color={C.red} size={28 * S} /></Pop>}
        </div>
      </Stage>
      <Stage opacity={pC} style={{ gap: 50 * S }}>
        <KeyLine at={1207} lead="所以建議你" main="動手寫程式之前先看平台" color={C.green} />
        <div style={{ display: "flex", gap: 30 * S }}>
          <Pop at={1259}><Chip text="可能會用的部署平台" icon="server" color={C.green} /></Pop>
          <Pop at={1369}><Chip text="有哪些替代方案" icon="refresh" color={C.green} /></Pop>
        </div>
        <Pop at={1440}><span style={{ fontFamily: TC, fontSize: 36 * S, color: C.text }}>開發過程<span style={{ color: C.green }}>更有彈性</span></span></Pop>
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 2.1 — 第一步 上傳程式碼：GitHub＝程式版雲端硬碟 → 資料夾變儲存庫 → 儲存庫網址＝共享連結 → 單一 HTML vs 三檔
// cues: 290 三個步驟(9.68) | 354 上傳程式碼(11.80) | 437 測試完(14.56) | 535 程式碼檔案(17.84) | 608 線上管理空間(20.28)
//   676 GitHub(22.52) | 786 程式版Google雲端(26.20) | 884 放程式碼(29.48) | 936 修改紀錄(31.20) | 1002 免費(33.40)
//   1075 專案資料夾(35.84) | 1160 儲存庫(38.68) | 1246 儲存庫網址(41.52) | 1352 共享連結(45.08)
//   1465 小提醒(48.84) | 1613 單一HTML(53.76) | 1852 實際開發(61.72) | 1948 HTML CSS JS 分開(64.92)
// ═════════════════════════════════════════════════════════════════════════════
const Scene21Upload: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 754);
  const pB = win(frame, 754, 1465);
  const pC = win(frame, 1465, dur + 20);
  const morph = interpolate(frame, [1150, 1175], [0, 1], clamp);
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[4]}>
      <SectionHeader num="02" title="手動部署三步驟" accent={C.green} />
      {frame >= 290 && <StepRail active={0} at={290} />}
      {/* A：電腦測試完 → 檔案飛上線上空間 → GitHub */}
      <div style={{ position: "absolute", inset: 0, opacity: pA }}>
        <div style={{ position: "absolute", left: 520 * S, top: 520 * S, transform: "translate(-50%,-50%)" }}><Pop at={437}><Node icon="laptop" label="你的電腦" sub="測試完沒問題" color={C.text} size={190 * S} /></Pop></div>
        <Wire x1={640} y1={480} x2={1260} y2={380} at={535} color={C.green} curve={80} march={frame > 600} />
        {[0, 1, 2].map((i) => (
          <Flyer key={i} x1={640} y1={480} x2={1250} y2={380} a={535 + i * 10} b={600 + i * 10} curve={80}>
            {frame < 612 + i * 10 && <LI name="file" size={60 * S} color={C.green} />}
          </Flyer>
        ))}
        <div style={{ position: "absolute", left: 1400 * S, top: 400 * S, transform: "translate(-50%,-50%)" }}>
          <Pop at={608}><Node icon="cloud" label={frame >= 676 ? "GitHub" : "線上的管理空間"} color={C.green} size={210 * S} labelSize={36 * S} /></Pop>
        </div>
      </div>
      {/* B：Google 雲端硬碟比喻 → 儲存庫 → 網址＝共享連結 */}
      <div style={{ position: "absolute", inset: 0, opacity: pB }}>
        <div style={{ position: "absolute", left: 600 * S, top: 300 * S, transform: "translate(-50%,0)", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * S }}>
          <Pop at={786} kind="up"><span style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted }}>比喻｜程式版的 Google 雲端硬碟</span></Pop>
          <Pop at={786}>
            <div style={{ position: "relative", width: 260 * S, height: 220 * S }}>
              <div style={{ position: "absolute", inset: 0, opacity: 1 - morph, display: "flex", justifyContent: "center" }}><LI name="folder" size={220 * S} color={C.gray} sw={1.2} /></div>
              <div style={{ position: "absolute", inset: 0, opacity: morph, display: "flex", justifyContent: "center", transform: `scale(${0.9 + 0.1 * morph})` }}><LI name="folder" size={220 * S} color={C.green} sw={1.2} /></div>
              <div style={{ position: "absolute", left: "50%", top: "58%", transform: "translate(-50%,-50%)", opacity: morph }}><LI name="code" size={70 * S} color={C.green} sw={2} /></div>
            </div>
          </Pop>
          <div style={{ display: "flex", gap: 16 * S }}>
            <Pop at={884}><Chip text="放程式碼" icon="code" color={C.green} size={26 * S} /></Pop>
            <Pop at={936}><Chip text="追蹤修改紀錄" icon="clock" color={C.green} size={26 * S} /></Pop>
            <Pop at={1002}><Chip text="基本方案免費" color={C.green} size={26 * S} /></Pop>
          </div>
        </div>
        <div style={{ position: "absolute", left: 1350 * S, top: 300 * S, display: "flex", flexDirection: "column", gap: 34 * S, alignItems: "flex-start" }}>
          {frame >= 1160 && <TermCard at={1160} term="儲存庫" en="repository" def="放在 GitHub 上的專案資料夾" color={C.green} />}
          {frame >= 1246 && (
            <Pop at={1246}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 * S }}>
                <span style={{ fontFamily: TC, fontSize: 24 * S, color: C.muted }}>上傳後會有一個儲存庫網址</span>
                <div style={{ fontFamily: MONO, fontSize: 24 * S, color: C.green, padding: `${12 * S}px ${20 * S}px`, borderRadius: 12 * S, border: `${1.5 * S}px solid ${hexA(C.green, 0.4)}` }}>github.com/你的帳號/專案名稱</div>
                {frame >= 1352 && <Pop at={1352}><span style={{ fontFamily: TC, fontSize: 28 * S, color: C.text }}>就像 Google 資料夾的<span style={{ color: C.green }}>共享連結</span></span></Pop>}
              </div>
            </Pop>
          )}
        </div>
      </div>
      {/* C：小提醒 單一 HTML vs 三檔 */}
      <Stage opacity={pC} style={{ gap: 40 * S }}>
        <Pop at={1465} kind="up"><span style={{ fontFamily: MONO, fontSize: 24 * S, color: C.yellow, letterSpacing: "0.14em" }}>小提醒</span></Pop>
        <div style={{ display: "flex", gap: 80 * S, alignItems: "flex-start" }}>
          <Pop at={1523}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * S, width: 620 * S, padding: 36 * S, borderRadius: 24 * S, background: C.surface, border: `${1.5 * S}px solid ${hexA(C.green, frame < 1852 ? 0.5 : 0.15)}` }}>
              <span style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted }}>很簡單的展示頁面</span>
              {frame >= 1613 && <Pop at={1613}><div style={{ display: "flex", alignItems: "center", gap: 14 * S }}><LI name="file" size={80 * S} color={C.green} /><Disp style={{ fontSize: 40 * S, color: C.text }}>index.html</Disp></div></Pop>}
              {frame >= 1747 && <Pop at={1747}><span style={{ fontFamily: TC, fontSize: 28 * S, color: C.green }}>上傳管理比較直覺</span></Pop>}
            </div>
          </Pop>
          {frame >= 1852 && (
            <Pop at={1852}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * S, width: 620 * S, padding: 36 * S, borderRadius: 24 * S, background: C.surface, border: `${1.5 * S}px solid ${hexA(C.green, 0.5)}` }}>
                <span style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted }}>實際開發多半</span>
                <div style={{ display: "flex", gap: 22 * S }}>
                  {["HTML", "CSS", "JS"].map((t, i) => (
                    <Pop key={t} at={1948 + i * 10}><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S }}><LI name="file" size={70 * S} color={C.green} /><Disp style={{ fontSize: 30 * S, color: C.text }}>{t}</Disp></div></Pop>
                  ))}
                </div>
                {frame >= 1960 && <Pop at={1960}><span style={{ fontFamily: TC, fontSize: 28 * S, color: C.green }}>分開管理</span></Pop>}
              </div>
            </Pop>
          )}
        </div>
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 2.2 — 第二步 設定部署平台：儲存庫拉線接平台 → 根目錄／入口檔 index.html → 可複製提示詞卡（教材裡有）
// cues: 43 第二步(1.42) | 134 打開部署服務(4.46) | 229 連接GitHub(7.64) | 310 選儲存庫(10.32) | 380 知道程式碼在哪(12.68)
//   457 基本設定(15.24) | 541 根目錄(18.04) | 604 入口檔案(20.12) | 650 從哪裡執行(21.68) | 764 有點複雜(25.48)
//   820 很直覺(27.32) | 886 教學文件(29.52) | 1184 請AI教你(39.48) | 1307 提示詞(43.56) | 1585 擔心不夠新(52.84) | 1716 最新版本(57.20)
// ═════════════════════════════════════════════════════════════════════════════
const Scene22Platform: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 1120);
  const pB = win(frame, 1120, dur + 20);
  const p1 = "我寫好了一個 index.html，想用 GitHub Pages 部署，請一步一步教我。";
  const p2 = "請參考最新版本的教學";
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[5]}>
      <SectionHeader num="02" title="手動部署三步驟" accent={C.green} />
      <StepRail active={1} at={43} />
      <div style={{ position: "absolute", inset: 0, opacity: pA }}>
        <div style={{ position: "absolute", left: 420 * S, top: 330 * S, transform: "translate(-50%,-50%)" }}><Pop at={229}><Node icon="folder" label="你的儲存庫" sub="GitHub" color={C.green} size={170 * S} /></Pop></div>
        <div style={{ position: "absolute", left: 1000 * S, top: 330 * S, transform: "translate(-50%,-50%)" }}><Pop at={134}><Node icon="server" label="部署服務" color={C.green} size={170 * S} /></Pop></div>
        <Wire x1={510} y1={300} x2={910} y2={300} at={229} color={C.green} march={frame > 260} />
        <div style={{ position: "absolute", left: 710 * S, top: 240 * S, transform: "translateX(-50%)" }}><Pop at={310}><Chip text="選這個儲存庫" icon="link" color={C.green} size={24 * S} /></Pop></div>
        <div style={{ position: "absolute", left: 710 * S, top: 430 * S, transform: "translateX(-50%)" }}><Pop at={380}><span style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted }}>讓平台知道程式碼在哪裡</span></Pop></div>
        {/* 基本設定面板 */}
        <div style={{ position: "absolute", left: 1220 * S, top: 220 * S }}>
          <Pop at={457}>
            <div style={{ width: 560 * S, padding: 34 * S, borderRadius: 24 * S, background: C.surface, border: `${1.5 * S}px solid ${C.borderHi}`, display: "flex", flexDirection: "column", gap: 22 * S }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}><LI name="gear" size={40 * S} color={C.text} /><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.text }}>基本設定</span></div>
              {[{ k: "專案根目錄", v: "/", at: 541 }, { k: "入口檔案", v: "index.html", at: 604 }].map((r) => (
                <Pop key={r.k} at={r.at} kind="item">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${14 * S}px ${20 * S}px`, borderRadius: 14 * S, border: `${1.5 * S}px solid ${frame >= r.at && frame < r.at + 110 ? C.green : C.border}`, background: hexA(C.green, frame >= r.at && frame < r.at + 110 ? 0.08 : 0) }}>
                    <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted }}>{r.k}</span>
                    <span style={{ fontFamily: MONO, fontSize: 26 * S, color: C.green }}>{r.v}</span>
                  </div>
                </Pop>
              ))}
              {frame >= 650 && <Pop at={650}><span style={{ fontFamily: TC, fontSize: 24 * S, color: C.muted }}>告訴平台從哪裡開始執行</span></Pop>}
            </div>
          </Pop>
        </div>
        <div style={{ position: "absolute", left: 960 * S, top: 690 * S, transform: "translateX(-50%)", display: "flex", gap: 26 * S, alignItems: "center" }}>
          <Pop at={764}><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted }}>聽起來有點複雜</span></Pop>
          <Pop at={820}><Chip text="每一步都很直覺" icon="check" color={C.green} size={28 * S} /></Pop>
          <Pop at={886}><Chip text="完整教學文件" icon="book" color={C.green} size={28 * S} /></Pop>
        </div>
      </div>
      {/* 提示詞卡（給學生複製的原文，可保留標點） */}
      <Stage opacity={pB} style={{ gap: 34 * S }}>
        <Pop at={1184} kind="up"><div style={{ display: "flex", alignItems: "center", gap: 16 * S }}><LI name="robot" size={50 * S} color={C.green} /><span style={{ fontFamily: TC, fontSize: 34 * S, color: C.text }}>不確定怎麼操作就直接請 AI 教你</span></div></Pop>
        {frame >= 1253 && (
          <Pop at={1253}>
            <div style={{ position: "relative", width: CONTAINER_W, padding: `${40 * S}px ${50 * S}px`, borderRadius: 26 * S, background: C.surface, border: `${1.5 * S}px solid ${C.borderHi}`, display: "flex", flexDirection: "column", gap: 26 * S }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: MONO, fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em" }}>提示詞可直接複製</span>
                <span style={{ fontFamily: TC, fontSize: 22 * S, color: C.yellow, border: `1px solid ${hexA(C.yellow, 0.5)}`, borderRadius: 8 * S, padding: `${4 * S}px ${12 * S}px` }}>教材裡有</span>
              </div>
              <div style={{ padding: `${24 * S}px ${30 * S}px`, borderRadius: 16 * S, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, lineHeight: 1.6 }}>
                <WordReveal text={p1} at={1307} size={40 * S} color={C.text} />
              </div>
              {frame >= 1585 && (
                <Pop at={1585} kind="up">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 * S }}>
                    <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted }}>擔心資訊不夠新就再補一句</span>
                    <div style={{ padding: `${20 * S}px ${30 * S}px`, borderRadius: 16 * S, background: hexA(C.green, 0.05), border: `1px solid ${hexA(C.green, 0.3)}` }}>
                      <WordReveal text={p2} at={1716} size={40 * S} color={C.green} />
                    </div>
                  </div>
                </Pop>
              )}
            </div>
          </Pop>
        )}
        {frame >= 1888 && <Pop at={1888}><span style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted }}>出錯的機率會比較低</span></Pop>}
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 2.3 — 第三步 取得網址：等 1–3 分鐘進度環 → 重新整理 → 長網址逐字打出 → 自訂網址淡淡預告
// cues: 91 一到三分鐘(3.04) | 162 重新整理(5.40) | 265 公開網址(8.84) | 371 很長預設網址(12.36) | 455 不簡潔(15.16)
//   503 好記自訂網址(16.76) | 600 名字.com(20.00) | 659 另外買(21.96) | 766 最後一段(25.52)
// ═════════════════════════════════════════════════════════════════════════════
const Scene23Url: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const ring = interpolate(frame, [91, 230], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const spin = frame >= 162 && frame < 200 ? (frame - 162) * 12 : 0;
  const longUrl = "https://你的帳號.github.io/你的專案名稱/";
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[6]}>
      <SectionHeader num="02" title="手動部署三步驟" accent={C.green} />
      <StepRail active={2} at={0} />
      <Stage style={{ gap: 50 * S }}>
        <div style={{ display: "flex", alignItems: "center", gap: 60 * S }}>
          <Pop at={91}>
            <div style={{ position: "relative", width: 200 * S, height: 200 * S }}>
              <svg width={200 * S} height={200 * S} viewBox="0 0 100 100">
                <circle cx={50} cy={50} r={42} fill="none" stroke={C.border} strokeWidth={5} />
                <circle cx={50} cy={50} r={42} fill="none" stroke={C.green} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={`${ring} 1`} transform="rotate(-90 50 50)" />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <Disp style={{ fontSize: 44 * S, color: C.text }}>1–3</Disp>
                <span style={{ fontFamily: TC, fontSize: 22 * S, color: C.muted }}>分鐘</span>
              </div>
            </div>
          </Pop>
          <Pop at={162}><div style={{ display: "flex", alignItems: "center", gap: 14 * S }}><div style={{ transform: `rotate(${spin}deg)` }}><LI name="refresh" size={64 * S} color={C.green} /></div><span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text }}>重新整理頁面</span></div></Pop>
        </div>
        {frame >= 265 && (
          <Pop at={265}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
              <span style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted }}>平台自動生成可以公開訪問的網址</span>
              <div style={{ padding: `${22 * S}px ${36 * S}px`, borderRadius: 18 * S, background: C.surface, border: `${1.5 * S}px solid ${hexA(C.green, 0.5)}` }}>
                <WordReveal text={longUrl} at={280} size={40 * S} font={MONO} color={C.green} />
              </div>
              <div style={{ display: "flex", gap: 20 * S }}>
                <Pop at={371}><Chip text="免費方案給很長的預設網址" color={C.gray} size={26 * S} /></Pop>
                <Pop at={455}><Chip text="不太簡潔" color={C.gray} size={26 * S} /></Pop>
              </div>
            </div>
          </Pop>
        )}
        {frame >= 503 && (
          <Pop at={503}>
            <div style={{ display: "flex", alignItems: "center", gap: 26 * S, opacity: 0.85 }}>
              <span style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted }}>想要好記的自訂網址</span>
              <div style={{ padding: `${14 * S}px ${28 * S}px`, borderRadius: 16 * S, border: `${1.5 * S}px dashed ${C.borderHi}` }}>
                <Disp style={{ fontSize: 40 * S, color: C.text }}>{frame >= 600 ? "yourname.com" : "…"}</Disp>
              </div>
              {frame >= 659 && <Pop at={659}><Chip text="另外買網域名稱" icon="bag" color={C.text} size={26 * S} /></Pop>}
              {frame >= 766 && <Pop at={766}><span style={{ fontFamily: MONO, fontSize: 22 * S, color: C.faint }}>最後一段會講</span></Pop>}
            </div>
          </Pop>
        )}
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// DEMO VIDEO CARD — 錄影卡片＋時間軸片段（播放 / 定格）＋點擊前推近＋壓暗細框＋小地圖
// 片段：c0–c1 為場景 local frame，v0–v1 為錄影 frame（30fps）；v0===v1 為定格。
// 推近：點擊前 14f 開始、9f（0.3 秒）推到位、停 hold、12f 拉回；rect 為原始錄影像素。
// ═════════════════════════════════════════════════════════════════════════════
type Piece = { c0: number; c1: number; v0: number; v1: number };
// cut：框必須消失的場景幀（頁面在此幀開始變化；由原始錄影逐幀差分量得）。沒填＝跟推近一起收。
type ZoomEv = { v?: number; c?: number; rect: [number, number, number, number]; z: number; hold: number; label?: string; cut?: number };
type Clip = { src: string; srcW: number; srcH: number; from: number; to: number; pieces: Piece[]; zooms: ZoomEv[] };
const BOX_W = CONTAINER_W; // 3000
const vToC = (pieces: Piece[], v: number): number => {
  for (const p of pieces) if (p.v1 > p.v0 && v >= p.v0 && v <= p.v1) return p.c0 + ((v - p.v0) * (p.c1 - p.c0)) / (p.v1 - p.v0);
  return pieces[0].c0;
};
const zoomAmt = (frame: number, c: number, hold: number): number => {
  const inA = interpolate(frame, [c - 14, c - 5], [0, 1], { ...clamp, easing: Easing.bezier(0.34, 1.4, 0.64, 1) });
  const out = interpolate(frame, [c + hold, c + hold + 12], [1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return Math.min(inA, out);
};
const ClipVideo: React.FC<{ clip: Clip; boxH: number }> = ({ clip, boxH }) => {
  const style: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: BOX_W, height: boxH };
  return (
    <>
      {clip.pieces.map((p, i) => {
        const len = p.c1 - p.c0;
        if (p.v1 === p.v0) {
          return (
            <Sequence key={i} from={p.c0} durationInFrames={len} layout="none">
              <Freeze frame={p.v0}><OffthreadVideo src={staticFile(clip.src)} muted style={style} /></Freeze>
            </Sequence>
          );
        }
        // 實測：Remotion 的 trim 偏移不乘 playbackRate → 媒體幀 = v0 + local × rate
        const rate = (p.v1 - p.v0) / len;
        return (
          <Sequence key={i} from={p.c0} durationInFrames={len} layout="none">
            <OffthreadVideo src={staticFile(clip.src)} muted trimBefore={p.v0} playbackRate={rate} style={style} />
          </Sequence>
        );
      })}
    </>
  );
};
const VideoCard: React.FC<{ clips: Clip[]; enterAt: number; accent: string; title: string; crumbs?: { t: string; at: number }[]; shrink?: { at: number } }> = ({ clips, enterAt, accent, title, crumbs, shrink }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: Math.max(0, frame - enterAt), fps, config: { damping: 200 }, durationInFrames: 20 });
  if (frame < enterAt) return null;
  const clip = clips.find((c) => frame >= c.from && frame < c.to) ?? clips[clips.length - 1];
  const boxH = Math.round((BOX_W * clip.srcH) / clip.srcW);
  const top = NAV_H + (H - NAV_H - SUBTITLE_H - boxH) / 2;
  const k = BOX_W / clip.srcW;
  // 目前最強的推近事件
  let best: { a: number; ev: ZoomEv } | null = null;
  for (const ev of clip.zooms) {
    const c = ev.c ?? vToC(clip.pieces, ev.v ?? 0);
    const a = zoomAmt(frame, c, ev.hold);
    if (a > 0.001 && (!best || a > best.a)) best = { a, ev };
  }
  let tx = 0, ty = 0, z = 1, hl: React.ReactNode = null, label: React.ReactNode = null, mini: React.ReactNode = null;
  if (best) {
    const { a, ev } = best;
    const [x0, y0, x1, y1] = ev.rect.map((v) => v * k);
    const px = (x0 + x1) / 2, py = (y0 + y1) / 2;
    const txF = Math.min(0, Math.max(BOX_W - ev.z * BOX_W, BOX_W / 2 - ev.z * px));
    const tyF = Math.min(0, Math.max(boxH - ev.z * boxH, boxH / 2 - ev.z * py));
    const aa = Math.min(a, 1.04);
    z = 1 + (ev.z - 1) * aa;
    tx = txF * Math.min(aa, 1);
    ty = tyF * Math.min(aa, 1);
    const ha = Math.min(1, a) * (ev.cut === undefined ? 1 : interpolate(frame, [ev.cut - 4, ev.cut - 1], [1, 0], clamp));
    const pad = 6 * S;
    hl = <div style={{ position: "absolute", left: x0 - pad, top: y0 - pad, width: x1 - x0 + pad * 2, height: y1 - y0 + pad * 2, borderRadius: 10 * S, border: `${(2.5 * S) / z}px solid ${hexA(accent, ha)}`, boxShadow: `0 0 0 ${4000}px rgba(5,5,12,${0.5 * ha})` }} />;
    if (ev.label) {
      label = (
        <div style={{ position: "absolute", left: (x0 - pad) * z + tx, top: (y1 + pad) * z + ty + 16 * S, opacity: ha, padding: `${12 * S}px ${22 * S}px`, borderRadius: 14 * S, background: "rgba(9,9,15,0.92)", border: `${1.5 * S}px solid ${hexA(accent, 0.6)}`, fontFamily: MONO, fontSize: 26 * S, color: C.text, whiteSpace: "nowrap", zIndex: 5 }}>{ev.label}</div>
      );
    }
    const mw = 300 * S, mh = (mw * boxH) / BOX_W;
    mini = (
      <div style={{ position: "absolute", right: 24 * S, top: 24 * S, width: mw, height: mh, borderRadius: 10 * S, overflow: "hidden", background: "#fff", border: `${1.5 * S}px solid ${C.borderHi}`, boxShadow: `0 ${8 * S}px ${30 * S}px rgba(0,0,0,0.5)`, opacity: Math.min(1, a), zIndex: 6 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: BOX_W, height: boxH, transformOrigin: "0 0", transform: `scale(${mw / BOX_W})` }}><ClipVideo clip={clip} boxH={boxH} /></div>
        <div style={{ position: "absolute", left: (-tx / z / BOX_W) * mw, top: (-ty / z / boxH) * mh, width: mw / z, height: mh / z, border: `${2 * S}px solid ${accent}`, borderRadius: 4 * S }} />
      </div>
    );
  }
  // 卡片位置（2.5 收尾縮到左側讓位給排錯卡）
  const sh = shrink ? spring({ frame: Math.max(0, frame - shrink.at), fps, config: { damping: 200 }, durationInFrames: 24 }) * (frame >= shrink.at ? 1 : 0) : 0;
  const sScale = interpolate(sh, [0, 1], [1, 0.56]);
  const sTop = NAV_H + (H - NAV_H - SUBTITLE_H - boxH * 0.56) / 2;
  const sx = interpolate(sh, [0, 1], [0, 150 - CONTAINER_L]);
  const sy = interpolate(sh, [0, 1], [0, sTop - top]);
  return (
    <div style={{ position: "absolute", left: CONTAINER_L, top, width: BOX_W, height: boxH, opacity: enter, transform: `translate(${sx}px, ${sy}px) scale(${interpolate(enter, [0, 1], [0.94, 1]) * sScale})`, transformOrigin: sh > 0 ? "top left" : "center", zIndex: 10 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 22 * S, overflow: "hidden", border: `${1.5 * S}px solid ${C.borderHi}`, boxShadow: `0 ${24 * S}px ${80 * S}px rgba(0,0,0,0.55)`, background: "#fff" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: BOX_W, height: boxH, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${z})` }}>
          {clips.map((cl, i) => {
            const o = Math.min(interpolate(frame, [cl.from, cl.from + 8], [0, 1], clamp), interpolate(frame, [cl.to, cl.to + 8], [1, 0], clamp));
            if (frame < cl.from - 1 || frame > cl.to + 8) return null;
            return <div key={i} style={{ position: "absolute", inset: 0, opacity: i === 0 ? interpolate(frame, [cl.to, cl.to + 8], [1, 0], clamp) : o }}><ClipVideo clip={cl} boxH={Math.round((BOX_W * cl.srcH) / cl.srcW)} /></div>;
          })}
          {hl}
        </div>
        {label}
        {mini}
      </div>
      {/* 左上標題＋步驟麵包屑 */}
      <div style={{ position: "absolute", left: 24 * S, top: 24 * S, zIndex: 8, display: "flex", alignItems: "center", gap: 16 * S, background: "rgba(9,9,15,0.9)", border: `${1.5 * S}px solid ${hexA(accent, 0.5)}`, borderRadius: 16 * S, padding: `${14 * S}px ${24 * S}px` }}>
        <span style={{ width: 14 * S, height: 14 * S, borderRadius: 99, background: accent }} />
        <span style={{ fontFamily: TC, fontSize: 30 * S, fontWeight: 600, color: C.text }}>{title}</span>
        {crumbs?.map((c) => (
          <span key={c.t} style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
            <span style={{ fontFamily: MONO, fontSize: 24 * S, color: C.faint }}>›</span>
            <span style={{ fontFamily: c.t.match(/[A-Za-z]/) ? SYNE : TC, fontSize: 26 * S, color: frame >= c.at ? accent : C.faint }}>{c.t}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 2.4 — 實機示範-1：準備清單卡 → 錄影 2.4-1（建立儲存庫）→ 2.4-2（拖入 index.html → Commit）
// cues: 331 GitHub Pages(11.36) | 545 開始之前(18.16) | 583 GitHub帳號(19.44) | 682 index.html(22.72) | 819 準備好了嗎(27.28)
//   894 首先第一步(29.80) | 923 建立儲存庫(30.76) | 1206 建立完成之後(40.20) | 1326 上傳到儲存庫(44.20)
//   1434 拖上來(47.80) | 1540 按下commit(51.32) | 1628 這一步的意思(54.28)
// 錄影動作幀（逐幀 diff＋抽圖確認）：2.4-1 Create repository 點擊 v84（f90 換頁）／輸入名稱 v168／README 開關 v325／
//   Create repository v425（f429 Creating）；2.4-2 Add file v25／Upload files v110（f119 換頁）／拖放 v215／
//   Commit changes v390（f397 Processing）／完成頁 v469
// ═════════════════════════════════════════════════════════════════════════════
const CLIP_24A: Clip = {
  src: "assets/2-8/demo-2-4-1-create-repo.mp4", srcW: 2940, srcH: 1514, from: 880, to: 1268,
  pieces: [{ c0: 880, c1: 894, v0: 0, v1: 0 }, { c0: 894, c1: 1260, v0: 0, v1: 438 }, { c0: 1260, c1: 1276, v0: 438, v1: 438 }],
  zooms: [
    { v: 84, rect: [48, 374, 346, 437], z: 1.9, hold: 14, cut: 969 },     // Create repository（Dashboard）
    { v: 168, rect: [1028, 448, 2160, 508], z: 1.6, hold: 20 },  // Repository name 欄位
    { v: 325, rect: [1965, 880, 2125, 945], z: 1.9, hold: 14 },  // Add README 開關
    { v: 425, rect: [1825, 1220, 2165, 1292], z: 1.9, hold: 8, cut: 1253 }, // Create repository（送出）
  ],
};
const CLIP_24B: Clip = {
  src: "assets/2-8/demo-2-4-2-upload.mp4", srcW: 2098, srcH: 1080, from: 1260, to: 1830,
  pieces: [{ c0: 1260, c1: 1440, v0: 0, v1: 204 }, { c0: 1440, c1: 1550, v0: 204, v1: 372 }, { c0: 1550, c1: 1668, v0: 372, v1: 490 }, { c0: 1668, c1: 1830, v0: 490, v1: 490 }],
  zooms: [
    { v: 25, rect: [1160, 272, 1265, 314], z: 2.0, hold: 10 },   // Add file
    { v: 88, rect: [1165, 376, 1422, 422], z: 2.0, hold: 10, cut: 1341 },   // Upload files（f92 選單關閉、f119 換頁）
    { v: 215, rect: [171, 237, 1908, 626], z: 1.25, hold: 40 },  // 拖放區
    { v: 390, rect: [258, 876, 468, 920], z: 2.0, hold: 12, cut: 1575 },    // Commit changes
    { c: 1700, rect: [175, 478, 1455, 520], z: 1.6, hold: 90 },  // index.html 已在儲存庫
  ],
};
const Scene24Demo: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pIntro = win(frame, 0, 884);
  const item = (t: string, at: number, icon: string) => {
    const done = frame >= at + 20;
    return (
      <Pop at={at} kind="item">
        <div style={{ display: "flex", alignItems: "center", gap: 24 * S, padding: `${20 * S}px ${30 * S}px`, borderRadius: 18 * S, background: C.surface, border: `${1.5 * S}px solid ${hexA(C.green, done ? 0.45 : 0.15)}` }}>
          <div style={{ width: 52 * S, height: 52 * S, borderRadius: 12 * S, border: `${2 * S}px solid ${done ? C.green : C.faint}`, display: "flex", alignItems: "center", justifyContent: "center", background: done ? hexA(C.green, 0.15) : "transparent" }}>
            {done && <LI name="check" size={34 * S} color={C.green} sw={2.8} />}
          </div>
          <LI name={icon} size={46 * S} color={C.text} />
          <span style={{ fontFamily: TC, fontSize: 36 * S, color: C.text }}>{t}</span>
        </div>
      </Pop>
    );
  };
  const inA = frame < 1268;
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[7]}>
      <div style={{ opacity: pIntro }}>
        <SectionHeader num="02" title="實機示範" accent={C.green} />
        <Stage style={{ gap: 40 * S }}>
          <Pop at={180} kind="up"><span style={{ fontFamily: TC, fontSize: 32 * S, color: C.muted }}>用一個實際例子一步一步做一次部署</span></Pop>
          <Pop at={331}><Disp style={{ fontSize: 110 * S, color: C.green }}>GitHub Pages</Disp></Pop>
          {frame >= 545 && (
            <Pop at={545}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 * S, alignItems: "stretch", minWidth: 900 * S }}>
                <span style={{ fontFamily: MONO, fontSize: 24 * S, color: C.green, letterSpacing: "0.16em" }}>開始前準備</span>
                {item("GitHub 帳號", 583, "user")}
                {item("一個完成的 index.html", 682, "file")}
              </div>
            </Pop>
          )}
        </Stage>
      </div>
      <VideoCard clips={[CLIP_24A, CLIP_24B]} enterAt={880} accent={C.green} title={inA ? "第一步建立儲存庫" : "上傳程式碼"} crumbs={inA ? undefined : [{ t: "Upload files", at: 1338 }, { t: "拖入 index.html", at: 1447 }, { t: "Commit", at: 1568 }]} />
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 2.5 — 實機示範-2：Settings › Pages › main › Save → 網址出現 → 打開網頁；收尾縮到左側＋「空白頁」排錯卡
// cues: 174 Settings找Pages(5.80) | 262 當成網站(8.72) | 406 選main存檔(13.52) | 502 產生網址(16.72) | 634 打開網址(21.12)
//   767 成功部署(25.56) | 870 你可以注意到(29.00) | 1057 這個過程就是部署(35.24) | 1134 小提醒(37.80) | 1195 空白(39.84)
//   1282 檔名不是index.html(42.72) | 1403 修改檔名(46.76) | 1505 還在部署中(50.16) | 1604 等一下(53.48)
// 錄影動作幀：Settings v70（f78 換頁）／Pages v145（f151）／None v188（f194 開選單）／main v222（f228）／
//   Save v322（f332 saved）／網址出現 v367／Deployments 網址點擊 v690（f699 網站出現）
// ═════════════════════════════════════════════════════════════════════════════
const CLIP_25: Clip = {
  src: "assets/2-8/demo-2-5-pages.mp4", srcW: 2098, srcH: 1080, from: 0, to: 1740,
  pieces: [
    { c0: 0, c1: 126, v0: 0, v1: 0 }, { c0: 126, c1: 180, v0: 0, v1: 54 }, { c0: 180, c1: 250, v0: 54, v1: 150 },
    { c0: 250, c1: 274, v0: 150, v1: 174 }, { c0: 274, c1: 380, v0: 174, v1: 174 }, { c0: 380, c1: 420, v0: 174, v1: 232 },
    { c0: 420, c1: 480, v0: 232, v1: 322 }, { c0: 480, c1: 504, v0: 322, v1: 346 }, { c0: 504, c1: 560, v0: 346, v1: 346 },
    { c0: 560, c1: 602, v0: 346, v1: 388 }, { c0: 602, c1: 640, v0: 388, v1: 388 }, { c0: 640, c1: 750, v0: 590, v1: 700 },
    { c0: 750, c1: 892, v0: 700, v1: 842 }, { c0: 892, c1: 1740, v0: 842, v1: 842 },
  ],
  zooms: [
    { v: 70, rect: [1250, 86, 1412, 140], z: 2.0, hold: 18 },     // Settings 分頁
    { v: 145, rect: [160, 876, 600, 924], z: 1.9, hold: 14 },     // 左欄 Pages
    { c: 296, rect: [612, 474, 1745, 630], z: 1.5, hold: 70 },    // Branch 區塊（旁白：當成網站來用）
    { c: 392, rect: [632, 584, 1070, 818], z: 1.8, hold: 26, cut: 414 },    // None ▸ 選 main
    { v: 322, rect: [944, 584, 1022, 628], z: 2.0, hold: 16, cut: 490 },    // Save
    { c: 596, rect: [636, 326, 1225, 376], z: 1.8, hold: 40, label: "https://你的帳號.github.io/tokyo-explorer/", cut: 640 }, // Your site is live at
    { v: 690, rect: [510, 370, 905, 410], z: 2.0, hold: 8, cut: 749, label: "https://你的帳號.github.io/tokyo-explorer/" },      // Deployments 網址點擊
  ],
};
const Scene25Demo: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pR1 = win(frame, 880, 1134);
  const pR2 = win(frame, 1134, dur + 20);
  const panelL = 150 + BOX_W * 0.56 + 60;
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[8]}>
      <VideoCard clips={[CLIP_25]} enterAt={0} accent={C.green} title="開啟 GitHub Pages" crumbs={[{ t: "Settings", at: 192 }, { t: "Pages", at: 246 }, { t: "main", at: 413 }, { t: "Save", at: 480 }]} shrink={{ at: 870 }} />
      <div style={{ position: "absolute", left: panelL, top: STAGE_TOP - 60, width: W - panelL - 140, height: STAGE_BOTTOM - STAGE_TOP + 60, opacity: pR1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 36 * S }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30 * S }}>
          <Pop at={900}><Node icon="laptop" label="你的電腦" color={C.gray} size={140 * S} /></Pop>
          <Pop at={930}><LI name="upload" size={60 * S} color={C.green} /></Pop>
          <Pop at={960}><Node icon="users" label="所有人都能打開" color={C.green} size={140 * S} /></Pop>
        </div>
        {frame >= 1057 && <KeyLine at={1057} lead="這個過程" main="就是部署" color={C.green} size={70 * S} />}
      </div>
      <div style={{ position: "absolute", left: panelL, top: STAGE_TOP - 60, width: W - panelL - 140, height: STAGE_BOTTOM - STAGE_TOP + 60, opacity: pR2, display: "flex", flexDirection: "column", justifyContent: "center", gap: 28 * S }}>
        <Pop at={1134} kind="up">
          <div style={{ display: "flex", alignItems: "center", gap: 20 * S }}>
            <div style={{ width: 120 * S, height: 90 * S, borderRadius: 12 * S, border: `${2 * S}px solid ${C.borderHi}`, background: "#f5f5f7" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 * S }}>
              <span style={{ fontFamily: MONO, fontSize: 22 * S, color: C.yellow, letterSpacing: "0.12em" }}>小提醒</span>
              <span style={{ fontFamily: TC, fontSize: 50 * S, color: C.text, fontWeight: 500 }}>打開是空白頁</span>
            </div>
          </div>
        </Pop>
        {frame >= 1282 && (
          <Pop at={1282} kind="item">
            <div style={{ padding: `${24 * S}px ${30 * S}px`, borderRadius: 18 * S, background: C.surface, border: `${1.5 * S}px solid ${hexA(C.yellow, 0.35)}`, display: "flex", flexDirection: "column", gap: 10 * S }}>
              <span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text }}>檔名不是 <Disp style={{ color: C.yellow }}>index.html</Disp></span>
              {frame >= 1403 && <Pop at={1403}><span style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted }}>改一下檔名</span></Pop>}
            </div>
          </Pop>
        )}
        {frame >= 1505 && (
          <Pop at={1505} kind="item">
            <div style={{ padding: `${24 * S}px ${30 * S}px`, borderRadius: 18 * S, background: C.surface, border: `${1.5 * S}px solid ${hexA(C.yellow, 0.35)}`, display: "flex", alignItems: "center", gap: 20 * S }}>
              <div style={{ transform: `rotate(${(frame - 1505) * 3}deg)` }}><LI name="hourglass" size={50 * S} color={C.yellow} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 * S }}>
                <span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text }}>還在部署中</span>
                {frame >= 1604 && <Pop at={1604}><span style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted }}>稍等一下就會好</span></Pop>}
              </div>
            </div>
          </Pop>
        )}
      </div>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 3.1 — 四個新手友善方案 2×2（語意色固定）＋免費額度
// cues: 72 主流方案(2.40) | 199 四個新手友善(6.64) | 292 免費額度(9.72) | 380 依需求挑(12.68) | 466 不需要全部(15.52)
// ═════════════════════════════════════════════════════════════════════════════
const Scene31Four: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const ids = ["gas", "ghp", "cfp", "zea"];
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[9]}>
      <SectionHeader num="03" title="推薦方案怎麼選" accent={C.green} />
      <Stage style={{ gap: 40 * S }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 34 * S, width: 2400 * S / 2 }}>
          {ids.map((id, i) => {
            const p = PLAT[id];
            const focus = frame >= 380 ? 0.75 + 0.25 * Math.sin((frame - 380) / 12 - i) : 1;
            return (
              <Pop key={id} at={199 + i * 14}>
                <div style={{ height: 250 * S, borderRadius: 26 * S, background: hexA(p.color, 0.06), border: `${1.5 * S}px solid ${hexA(p.color, 0.45)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 * S, opacity: focus }}>
                  <LI name={p.icon} size={90 * S} color={p.color} sw={1.5} />
                  <Disp style={{ fontSize: 40 * S, color: C.text }}>{p.name}</Disp>
                  {frame >= 292 && <Pop at={292 + i * 6}><span style={{ fontFamily: TC, fontSize: 24 * S, color: p.color, border: `1px solid ${hexA(p.color, 0.5)}`, borderRadius: 8 * S, padding: `${3 * S}px ${12 * S}px` }}>有免費額度</span></Pop>}
                </div>
              </Pop>
            );
          })}
        </div>
        <Pop at={466}><span style={{ fontFamily: TC, fontSize: 32 * S, color: C.muted }}>依需求挑一個就好</span></Pop>
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 3.2 — GAS（黃）：優點勾 → 限制叉 → 公司內部鎖頭 → Google 生態系圈住、搬家拉不出來
// cues: 108 GAS(3.60) | 187 免費(6.24) | 257 一鍵部署(8.56) | 308 按發布(10.28) | 449 前後端(14.96) | 538 夠用(17.92)
//   642 限制(21.40) | 716 上傳圖片(23.88) | 790 自訂網域(26.32) | 868 GAS連結(28.92) | 982 形象網站(32.72) | 1121 不專業(37.36)
//   1195 內部小工具(39.84) | 1319 Workspace(43.96) | 1421 組織成員(47.36) | 1523 資安低(50.76) | 1618 唯一注意(53.92)
//   1678 生態系(55.92) | 1927 試算表雲端硬碟權限(64.24) | 2110 依賴Google(70.32) | 2219 搬到其他平台(73.96) | 2329 重新調整(77.64) | 2389 改寫(79.64)
// ═════════════════════════════════════════════════════════════════════════════
const Scene32Gas: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 1195);
  const pB = win(frame, 1195, 1618);
  const pC = win(frame, 1618, dur + 20);
  const lock = interpolate(frame, [1421, 1440], [0, 1], clamp);
  const pull = frame >= 2219 ? interpolate(frame, [2219, 2260, 2290, 2320], [0, 120, 120, 30], clamp) : 0;
  const ring = useDraw(1678, 30);
  return (
    <Shell callouts={callouts} dur={dur} accent={C.yellow} pct={PROGRESS_PCT[10]}>
      <SectionHeader num="03" title="方案一" accent={C.yellow} />
      <div style={{ position: "absolute", left: CONTAINER_L + 300 * S, top: NAV_H + 38 * S }}><Pop at={108}><PlatBadge id="gas" size={30 * S} tag="GAS" /></Pop></div>
      <Stage opacity={pA} style={{ flexDirection: "row", alignItems: "flex-start", gap: 60 * S }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 * S, width: 700 * S }}>
          <Pop at={187} kind="up"><span style={{ fontFamily: MONO, fontSize: 24 * S, color: C.green, letterSpacing: "0.14em" }}>優點</span></Pop>
          <ProRow at={187} ok text="完全免費" />
          <ProRow at={257} ok text="一鍵部署" sub="按發布馬上有分享連結" />
          <ProRow at={449} ok text="同時支援前端和後端" sub="簡單的應用已經非常夠用" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 * S, width: 700 * S, opacity: frame >= 642 ? 1 : 0 }}>
          <Pop at={642} kind="up"><span style={{ fontFamily: MONO, fontSize: 24 * S, color: C.red, letterSpacing: "0.14em" }}>限制</span></Pop>
          <ProRow at={716} ok={false} text="沒辦法上傳圖片" />
          <ProRow at={790} ok={false} text="沒辦法自訂網域名稱" />
          <ProRow at={868} ok={false} text="頁面會顯示是 GAS 的連結" sub={frame >= 982 ? "拿來做形象網站或作品集看起來不太專業" : undefined} />
        </div>
      </Stage>
      <Stage opacity={pB} style={{ gap: 40 * S }}>
        <KeyLine at={1195} lead="非常適合" main="企業內部的小工具" color={C.yellow} size={70 * S} />
        <div style={{ display: "flex", alignItems: "center", gap: 50 * S }}>
          <Pop at={1319}><Chip text="公司有用 Google Workspace" icon="users" color={C.yellow} /></Pop>
          <Pop at={1421}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 * S }}>
              <div style={{ position: "relative", width: 80 * S, height: 80 * S }}>
                <div style={{ position: "absolute", inset: 0, opacity: 1 - lock }}><LI name="unlock" size={80 * S} color={C.yellow} /></div>
                <div style={{ position: "absolute", inset: 0, opacity: lock }}><LI name="lock" size={80 * S} color={C.yellow} /></div>
              </div>
              <span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text }}>只有組織成員能訪問</span>
            </div>
          </Pop>
        </div>
        <Pop at={1523}><Chip text="資安風險相對較低" icon="shield" color={C.green} /></Pop>
      </Stage>
      <div style={{ position: "absolute", inset: 0, opacity: pC }}>
        <svg width={W} height={H} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
          <circle cx={800} cy={600} r={300} fill={hexA(C.yellow, 0.03)} stroke={C.yellow} strokeWidth={2} pathLength={1} strokeDasharray={`${ring} 1`} />
        </svg>
        <div style={{ position: "absolute", left: 800 * S, top: 330 * S, transform: "translate(-50%,0)" }}><Pop at={1678}><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.yellow }}>Google 生態系</span></Pop></div>
        <div style={{ position: "absolute", left: (800 + pull) * S, top: 600 * S, transform: "translate(-50%,-50%)" }}><Pop at={1700}><Node icon="code" label="你的 GAS 工具" color={C.yellow} size={150 * S} /></Pop></div>
        {[{ t: "試算表", i: "table", x: 640, y: 480 }, { t: "雲端硬碟", i: "folder", x: 960, y: 480 }, { t: "帳號權限", i: "key", x: 800, y: 790 }].map((d, i) => (
          <React.Fragment key={d.t}>
            <Wire x1={800 + pull} y1={600} x2={d.x} y2={d.y} at={1927 + i * 8} color={C.yellow} march={frame > 1960} width={1.5} />
            <div style={{ position: "absolute", left: d.x * S, top: d.y * S, transform: "translate(-50%,-50%)" }}><Pop at={1927 + i * 8}><Chip text={d.t} icon={d.i === "key" ? "lock" : d.i} color={C.yellow} size={26 * S} /></Pop></div>
          </React.Fragment>
        ))}
        <div style={{ position: "absolute", left: 1500 * S, top: 600 * S, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * S }}>
          <Pop at={2219}><Node icon="server" label="其他平台" color={C.gray} size={150 * S} /></Pop>
          {frame >= 2329 && <Pop at={2329}><Chip text="需要重新調整" color={C.red} size={26 * S} /></Pop>}
          {frame >= 2389 && <Pop at={2389}><Chip text="甚至改寫部分功能" color={C.red} size={26 * S} /></Pop>}
        </div>
        {frame >= 2219 && <Wire x1={950} y1={600} x2={1410} y2={600} at={2219} color={C.red} />}
      </div>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 3.3 — GitHub Pages（綠）：前端小天堂 → GitHub 前端＋GAS 後端拼起來 → 免費版儲存庫要公開
// cues: 109 小天堂(3.64) | 265 免費夠用(8.84) | 331 不綁信用卡(11.04) | 400 上傳圖片(13.32) | 470 自訂網域(15.68) | 553 佛心(18.44)
//   626 純前端(20.88) | 787 後端需求(26.24) | 859 搭配GAS(28.64) | 960 GitHub前端GAS後端(32.00) | 1096 超多事情(36.52)
//   1200 工程師(40.00) | 1304 部落格小工具(43.48) | 1394 作品集(46.48) | 1470 唯一限制(49.00) | 1542 必須公開(51.40)
//   1616 所有人看到(53.88) | 1710 保密(57.00) | 1781 下一個選項(59.36)
// ═════════════════════════════════════════════════════════════════════════════
const Scene33Ghp: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 626);
  const pB = win(frame, 626, 1470);
  const pC = win(frame, 1470, dur + 20);
  const snap = interpolate(frame, [930, 960], [160, 0], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[11]}>
      <SectionHeader num="03" title="方案二" accent={C.green} />
      <div style={{ position: "absolute", left: CONTAINER_L + 300 * S, top: NAV_H + 38 * S }}><Pop at={0}><PlatBadge id="ghp" size={30 * S} /></Pop></div>
      <Stage opacity={pA} style={{ gap: 26 * S }}>
        <KeyLine at={109} lead="我個人認為" main="部署前端的小天堂" color={C.green} size={64 * S} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 * S, width: 1500 * S }}>
          <ProRow at={265} ok text="免費版就很夠用" />
          <ProRow at={331} ok text="不需要綁信用卡" />
          <ProRow at={400} ok text="支援上傳圖片" />
          <ProRow at={470} ok text="可以設定自訂網域" />
        </div>
      </Stage>
      <Stage opacity={pB} style={{ gap: 40 * S }}>
        <Pop at={626} kind="up"><span style={{ fontFamily: TC, fontSize: 32 * S, color: C.muted }}>通常拿來放<span style={{ color: C.green }}>純前端</span>網頁</span></Pop>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Pop at={626}>
            <div style={{ width: 620 * S, height: 260 * S, borderRadius: `${26 * S}px 0 0 ${26 * S}px`, background: hexA(C.green, 0.08), border: `${2 * S}px solid ${hexA(C.green, 0.6)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 * S }}>
              <span style={{ fontFamily: MONO, fontSize: 24 * S, color: C.green }}>前端</span>
              <Disp style={{ fontSize: 40 * S, color: C.text }}>GitHub Pages</Disp>
            </div>
          </Pop>
          {frame >= 787 && (
            <div style={{ transform: `translateX(${snap * S}px)` }}>
              <Pop at={859}>
                <div style={{ width: 620 * S, height: 260 * S, borderRadius: `0 ${26 * S}px ${26 * S}px 0`, background: hexA(C.yellow, 0.08), border: `${2 * S}px solid ${hexA(C.yellow, 0.6)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 * S }}>
                  <span style={{ fontFamily: MONO, fontSize: 24 * S, color: C.yellow }}>後端</span>
                  <Disp style={{ fontSize: 40 * S, color: C.text }}>GAS</Disp>
                </div>
              </Pop>
            </div>
          )}
        </div>
        {frame >= 1096 && <Pop at={1096}><span style={{ fontFamily: TC, fontSize: 36 * S, color: C.text }}>這樣分工可以做到<span style={{ color: C.green }}>超級多事情</span></span></Pop>}
        <div style={{ display: "flex", gap: 22 * S, minHeight: 70 * S }}>
          {frame >= 1200 && <Pop at={1200}><span style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted }}>工程師常拿來放</span></Pop>}
          <Pop at={1304}><Chip text="個人部落格" color={C.green} size={26 * S} /></Pop>
          <Pop at={1320}><Chip text="小工具" color={C.green} size={26 * S} /></Pop>
          <Pop at={1394}><Chip text="作品集" color={C.green} size={26 * S} /></Pop>
        </div>
      </Stage>
      <Stage opacity={pC} style={{ gap: 40 * S }}>
        <Pop at={1470} kind="up"><span style={{ fontFamily: MONO, fontSize: 24 * S, color: C.red, letterSpacing: "0.14em" }}>免費版唯一的限制</span></Pop>
        <Pop at={1542}>
          <div style={{ display: "flex", alignItems: "center", gap: 50 * S }}>
            <div style={{ width: 700 * S, padding: 32 * S, borderRadius: 24 * S, background: C.surface, border: `${1.5 * S}px solid ${C.borderHi}`, display: "flex", flexDirection: "column", gap: 14 * S }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}><LI name="folder" size={44 * S} color={C.green} /><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.text }}>你的儲存庫</span><span style={{ marginLeft: "auto", fontFamily: TC, fontSize: 24 * S, color: C.red, border: `1px solid ${hexA(C.red, 0.5)}`, borderRadius: 8 * S, padding: `${2 * S}px ${12 * S}px` }}>公開</span></div>
              {[0.9, 0.7, 0.8, 0.5].map((w, i) => <div key={i} style={{ height: 16 * S, width: `${w * 100}%`, borderRadius: 6 * S, background: "rgba(255,255,255,0.12)" }} />)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 * S }}>
              {[0, 1, 2].map((i) => <Pop key={i} at={1616 + i * 8}><LI name="eye" size={70 * S} color={C.red} /></Pop>)}
            </div>
          </div>
        </Pop>
        <Pop at={1616}><span style={{ fontFamily: TC, fontSize: 34 * S, color: C.text }}>所有人都看得到你的程式碼</span></Pop>
        {frame >= 1710 && <Pop at={1710}><Chip text="想保密就看下一個選項" icon="lock" color={C.orange} /></Pop>}
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 3.4 — Cloudflare Pages（橘）：鎖住的儲存庫 → 輕後端多一個選擇 → 跟 GitHub Pages 很像但設定多 → 請 AI 帶
// cues: 119 不想被看到(3.96) | 196 輕量後端(6.52) | 373 私有儲存庫(12.44) | 458 輕後端(15.28) | 528 除了GAS(17.60)
//   659 跟GitHub Pages很像(21.96) | 746 設定選項多(24.88) | 835 複雜(27.84) | 962 請AI帶(32.08)
// ═════════════════════════════════════════════════════════════════════════════
const Scene34Cf: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 659);
  const pB = win(frame, 659, dur + 20);
  const lock = interpolate(frame, [373, 392], [0, 1], clamp);
  const toggles = (n: number, at: number, color: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 * S }}>
      {Array.from({ length: n }).map((_, i) => (
        <Pop key={i} at={at + i * 6} kind="item"><div style={{ display: "flex", alignItems: "center", gap: 14 * S }}><div style={{ width: 56 * S, height: 28 * S, borderRadius: 99, background: hexA(color, 0.25), position: "relative" }}><div style={{ position: "absolute", top: 3 * S, left: i % 2 ? 31 * S : 3 * S, width: 22 * S, height: 22 * S, borderRadius: 99, background: color }} /></div><div style={{ width: (120 + (i % 3) * 40) * S, height: 14 * S, borderRadius: 6 * S, background: "rgba(255,255,255,0.12)" }} /></div></Pop>
      ))}
    </div>
  );
  return (
    <Shell callouts={callouts} dur={dur} accent={C.orange} pct={PROGRESS_PCT[12]}>
      <SectionHeader num="03" title="方案三" accent={C.orange} />
      <div style={{ position: "absolute", left: CONTAINER_L + 300 * S, top: NAV_H + 38 * S }}><Pop at={0}><PlatBadge id="cfp" size={30 * S} /></Pop></div>
      <Stage opacity={pA} style={{ flexDirection: "row", gap: 100 * S }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * S }}>
          <Pop at={119}>
            <div style={{ position: "relative", width: 260 * S, height: 220 * S }}>
              <LI name="folder" size={220 * S} color={C.orange} sw={1.2} />
              <div style={{ position: "absolute", right: 0, bottom: 0, background: C.bg, borderRadius: 99, padding: 8 * S }}>
                <div style={{ position: "relative", width: 80 * S, height: 80 * S }}>
                  <div style={{ position: "absolute", inset: 0, opacity: 1 - lock }}><LI name="unlock" size={80 * S} color={C.orange} /></div>
                  <div style={{ position: "absolute", inset: 0, opacity: lock }}><LI name="lock" size={80 * S} color={C.orange} /></div>
                </div>
              </div>
            </div>
          </Pop>
          <Pop at={373}><Chip text="免費版支援私有儲存庫" color={C.orange} /></Pop>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 * S }}>
          <Pop at={196} kind="up"><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted }}>有輕量的後端需求</span></Pop>
          <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.faint, opacity: frame >= 458 ? 1 : 0 }}>後端選擇</span>
          <div style={{ display: "flex", gap: 20 * S }}>
            <Pop at={528}><Chip text="GAS" color={C.yellow} icon="table" /></Pop>
            <Pop at={458}><Chip text="Cloudflare 輕後端" color={C.orange} icon="server" solid /></Pop>
          </div>
        </div>
      </Stage>
      <Stage opacity={pB} style={{ gap: 40 * S }}>
        <div style={{ display: "flex", gap: 80 * S, alignItems: "flex-start" }}>
          <Pop at={659}>
            <div style={{ width: 640 * S, padding: 34 * S, borderRadius: 24 * S, background: C.surface, border: `${1.5 * S}px solid ${hexA(C.green, 0.35)}`, display: "flex", flexDirection: "column", gap: 20 * S }}>
              <Disp style={{ fontSize: 34 * S, color: C.green }}>GitHub Pages</Disp>
              {toggles(3, 680, C.green)}
            </div>
          </Pop>
          <Pop at={670}>
            <div style={{ width: 640 * S, padding: 34 * S, borderRadius: 24 * S, background: C.surface, border: `${1.5 * S}px solid ${hexA(C.orange, 0.45)}`, display: "flex", flexDirection: "column", gap: 20 * S }}>
              <Disp style={{ fontSize: 34 * S, color: C.orange }}>Cloudflare Pages</Disp>
              {toggles(3, 690, C.orange)}
              {frame >= 746 && toggles(3, 746, C.orange)}
            </div>
          </Pop>
        </div>
        <div style={{ display: "flex", gap: 30 * S, alignItems: "center" }}>
          <Pop at={746}><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted }}>整體很像但設定選項多一點</span></Pop>
          <Pop at={962}><Chip text="請 AI 一步一步帶你" icon="robot" color={C.green} solid /></Pop>
        </div>
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 3.5 — Zeabur（紫）：伺服器＋資料庫 → 5 美金跳動 → 選項太多眼花 → 神燈精靈 AI
// cues: 92 台灣新創(3.08) | 154 完整後端資料庫伺服器(5.12) | 292 非常推薦(9.72) | 376 免費額度(12.54) | 445 付費友善(14.84)
//   515 5美金(17.16) | 576 門檻不高(19.20) | 653 選項多(21.76) | 737 眼花繚亂(24.58) | 845 不知從哪(28.16) | 883 神燈精靈(29.44)
// ═════════════════════════════════════════════════════════════════════════════
const Scene35Zeabur: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 653);
  const pB = win(frame, 653, dur + 20);
  const price = Math.round(interpolate(frame, [515, 545], [0, 5], clamp));
  return (
    <Shell callouts={callouts} dur={dur} accent={C.purple} pct={PROGRESS_PCT[13]}>
      <SectionHeader num="03" title="方案四" accent={C.purple} />
      <div style={{ position: "absolute", left: CONTAINER_L + 300 * S, top: NAV_H + 38 * S, display: "flex", gap: 20 * S, alignItems: "center" }}><Pop at={0}><PlatBadge id="zea" size={30 * S} /></Pop><Pop at={92}><span style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted }}>台灣的新創服務</span></Pop></div>
      <Stage opacity={pA} style={{ flexDirection: "row", gap: 120 * S }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * S }}>
          <div style={{ display: "flex", gap: 40 * S }}>
            <Pop at={154}><Node icon="server" label="伺服器" color={C.purple} size={170 * S} /></Pop>
            <Pop at={170}><Node icon="database" label="資料庫" color={C.purple} size={170 * S} /></Pop>
          </div>
          <Pop at={154}><span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text }}>真正完整的後端</span></Pop>
          {frame >= 292 && <Pop at={292}><Chip text="非常推薦" icon="check" color={C.purple} solid /></Pop>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 24 * S }}>
          <Pop at={376}><Chip text="有免費額度可以試用" color={C.purple} /></Pop>
          {frame >= 445 && (
            <Pop at={445}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 * S }}>
                <span style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted }}>付費每月</span>
                <Disp style={{ fontSize: 150 * S, color: C.purple, lineHeight: 1 }}>{price}</Disp>
                <span style={{ fontFamily: TC, fontSize: 34 * S, color: C.text }}>美金起</span>
              </div>
            </Pop>
          )}
          {frame >= 576 && <Pop at={576}><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted }}>入門門檻不算高</span></Pop>}
        </div>
      </Stage>
      <Stage opacity={pB} style={{ flexDirection: "row", gap: 100 * S }}>
        <Pop at={653}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 * S, width: 900 * S }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const fl = frame >= 737 ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(frame / 5 + i * 1.7)) : 0.5;
              return <div key={i} style={{ height: 90 * S, borderRadius: 14 * S, background: hexA(C.purple, 0.06 + 0.1 * fl), border: `${1.5 * S}px solid ${hexA(C.purple, 0.2 + 0.4 * fl)}`, display: "flex", alignItems: "center", justifyContent: "center" }}><LI name={["server", "database", "gear", "globe", "code"][i % 5]} size={40 * S} color={hexA(C.purple, 0.4 + 0.5 * fl)} /></div>;
            })}
          </div>
        </Pop>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 * S, alignItems: "flex-start" }}>
          <Pop at={653}><span style={{ fontFamily: TC, fontSize: 34 * S, color: C.text }}>服務選項很多</span></Pop>
          {frame >= 845 && <Pop at={845}><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted }}>第一次進去不知從哪開始</span></Pop>}
          {frame >= 883 && <Pop at={883}><div style={{ display: "flex", alignItems: "center", gap: 16 * S, padding: `${16 * S}px ${26 * S}px`, borderRadius: 18 * S, border: `${1.5 * S}px solid ${hexA(C.purple, 0.5)}` }}><LI name="lamp" size={64 * S} color={C.purple} /><span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text }}>請神燈精靈 AI 支援</span></div></Pop>}
        </div>
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 3.6 — 怎麼選：決策流一層層長出 → 三扇門 給自己／給同事／給所有人
// cues: 83 怎麼選(2.76) | 236 剛起步(7.88) | 295 GAS(9.84) | 391 夠用(13.04) | 499 漂亮前端(16.64) | 589 GitHub Pages(19.64)
//   678 GAS後端(22.60) | 766 不想公開(25.52) | 824 Cloudflare(27.48) | 928 完整後端(30.92) | 1026 Zeabur(34.20)
//   1088 考慮(36.28) | 1225 給自己(40.84) | 1273 給同事(42.44) | 1306 公開給所有人(43.52) | 1404 縮小範圍(46.80)
// ═════════════════════════════════════════════════════════════════════════════
const Scene36Choose: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 1088);
  const pB = win(frame, 1088, dur + 20);
  type Row = { q: string; at: number; a: { id: string; at: number; tag?: string }[]; note?: string; nAt?: number };
  const rows: Row[] = [
    { q: "剛起步", at: 236, a: [{ id: "gas", at: 295 }], note: "功能夠用就先不用考慮其他", nAt: 391 },
    { q: "需要比較漂亮的前端", at: 499, a: [{ id: "ghp", at: 589, tag: "前端" }, { id: "gas", at: 678, tag: "後端" }] },
    { q: "程式碼不想公開", at: 766, a: [{ id: "cfp", at: 824, tag: "前端換成" }] },
    { q: "需要完整後端和資料庫", at: 928, a: [{ id: "zea", at: 1026, tag: "升級到" }] },
  ];
  const active = rows.reduce((acc, r, i) => (frame >= r.at ? i : acc), -1);
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[14]}>
      <SectionHeader num="03" title="怎麼選" accent={C.green} />
      <Stage opacity={pA} style={{ alignItems: "flex-start", gap: 22 * S }}>
        {rows.map((r, i) => (
          <Pop key={r.q} at={r.at} kind="item">
            <div style={{ display: "flex", alignItems: "center", gap: 30 * S, opacity: i === active ? 1 : 0.5 }}>
              <div style={{ width: 640 * S, padding: `${20 * S}px ${28 * S}px`, borderRadius: 18 * S, background: C.surface, border: `${1.5 * S}px solid ${i === active ? C.borderHi : C.border}`, display: "flex", alignItems: "center", gap: 16 * S }}>
                <LI name="question" size={40 * S} color={C.muted} />
                <span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text }}>{r.q}</span>
              </div>
              <svg width={90 * S} height={30 * S} viewBox="0 0 45 15"><path d="M2 7.5H40M34 2l6 5.5-6 5.5" fill="none" stroke={C.faint} strokeWidth={1.5} /></svg>
              {r.a.map((x) => (
                <Pop key={x.id + x.at} at={x.at}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 * S }}>
                    {x.tag && <span style={{ fontFamily: TC, fontSize: 22 * S, color: C.muted }}>{x.tag}</span>}
                    <PlatBadge id={x.id} size={28 * S} />
                  </div>
                </Pop>
              ))}
              {r.note && frame >= (r.nAt ?? 0) && <Pop at={r.nAt ?? 0}><span style={{ fontFamily: TC, fontSize: 24 * S, color: C.muted, maxWidth: 420 * S }}>{r.note}</span></Pop>}
            </div>
          </Pop>
        ))}
      </Stage>
      <Stage opacity={pB} style={{ gap: 50 * S }}>
        <Pop at={1088} kind="up"><span style={{ fontFamily: TC, fontSize: 36 * S, color: C.text }}>這個專案最後要給誰用</span></Pop>
        <div style={{ display: "flex", gap: 70 * S }}>
          {[{ t: "給自己", i: "user", at: 1225 }, { t: "給公司同事", i: "users", at: 1273 }, { t: "公開給所有人", i: "globe", at: 1306 }].map((d) => {
            const lit = frame >= d.at ? 1 : 0.35;
            return (
              <Pop key={d.t} at={1100 + ["給自己", "給公司同事", "公開給所有人"].indexOf(d.t) * 10}>
                <div style={{ width: 380 * S, height: 440 * S, borderRadius: `${200 * S}px ${200 * S}px ${20 * S}px ${20 * S}px`, border: `${2 * S}px solid ${hexA(C.green, 0.3 + 0.5 * lit)}`, background: hexA(C.green, 0.03 + 0.07 * lit), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 * S }}>
                  <LI name={d.i} size={110 * S} color={hexA(C.green, lit)} sw={1.4} />
                  <span style={{ fontFamily: TC, fontSize: 36 * S, color: C.text }}>{d.t}</span>
                </div>
              </Pop>
            );
          })}
        </div>
        {frame >= 1404 && <Pop at={1404}><span style={{ fontFamily: TC, fontSize: 32 * S, color: C.muted }}>用這個判斷幫你<span style={{ color: C.green }}>縮小範圍</span></span></Pop>}
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 4.1 — AI 常推薦的地雷平台：AI 泡泡推薦 → 三顆雷依序引爆 → 收句「簡單 免費 限制清楚」
// cues: 169 不要只看AI(5.64) | 277 討論度高(9.24) | 412 不一定適合新手(13.72) | 494 隱藏門檻(16.48) | 689 Vercel Render GCP AWS(22.96)
//   860 新手難注意(28.68) | 959 免費限制(31.96) | 1031 不能商業使用(34.36) | 1102 沒人使用(36.72) | 1182 休眠(39.40)
//   1237 第一次打開慢(41.24) | 1357 用量計費(45.24) | 1488 額外費用(49.60) | 1559 不是本身不好(51.96) | 1692 踩雷(56.40)
//   1783 新手階段(59.44) | 1898 簡單免費限制清楚(63.28) | 2000 走順(66.68) | 2080 進階工具(69.32)
// ═════════════════════════════════════════════════════════════════════════════
const Scene41Trap: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 860);
  const pB = win(frame, 860, 1783);
  const pC = win(frame, 1783, dur + 20);
  const bill = Math.round(interpolate(frame, [1370, 1488], [3, 480], { ...clamp, easing: Easing.in(Easing.quad) }));
  const spin = (frame - 1237) * 8;
  const mine = (at: number, boomAt: number, title: string, children: React.ReactNode) => {
    const boom = interpolate(frame, [boomAt, boomAt + 8, boomAt + 20], [0, 1, 0], clamp);
    return (
      <Pop at={at}>
        <div style={{ width: 460 * S, height: 500 * S, borderRadius: 26 * S, background: C.surface, border: `${1.5 * S}px solid ${hexA(C.red, frame >= boomAt ? 0.55 : 0.18)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 * S, position: "relative", boxShadow: `0 0 ${60 * boom * S}px ${hexA(C.red, 0.4 * boom)}` }}>
          <div style={{ transform: `scale(${1 + 0.25 * boom})` }}><LI name="bomb" size={90 * S} color={frame >= boomAt ? C.red : C.gray} /></div>
          <span style={{ fontFamily: TC, fontSize: 34 * S, color: C.text }}>{title}</span>
          <div style={{ minHeight: 120 * S, display: "flex", alignItems: "center" }}>{frame >= boomAt && children}</div>
        </div>
      </Pop>
    );
  };
  return (
    <Shell callouts={callouts} dur={dur} accent={C.red} pct={PROGRESS_PCT[15]}>
      <SectionHeader num="04" title="AI 常推薦的地雷平台" accent={C.red} />
      <Stage opacity={pA} style={{ alignItems: "stretch", gap: 30 * S, padding: `0 ${300 * S}px` }}>
        <Pop at={20} style={{ alignSelf: "flex-end" }}><div style={{ maxWidth: 900 * S, padding: `${22 * S}px ${30 * S}px`, borderRadius: `${28 * S}px ${28 * S}px ${6 * S}px ${28 * S}px`, background: hexA(C.green, 0.14), fontFamily: TC, fontSize: 34 * S, color: C.text }}>我該用哪個平台部署？</div></Pop>
        <Pop at={169} style={{ alignSelf: "flex-start" }}>
          <div style={{ display: "flex", gap: 18 * S, alignItems: "flex-start" }}>
            <div style={{ width: 70 * S, height: 70 * S, borderRadius: 99, border: `${1.5 * S}px solid ${C.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center" }}><LI name="robot" size={44 * S} color={C.text} /></div>
            <div style={{ maxWidth: 1300 * S, padding: `${22 * S}px ${30 * S}px`, borderRadius: `${28 * S}px ${28 * S}px ${28 * S}px ${6 * S}px`, background: C.surface2, display: "flex", flexDirection: "column", gap: 18 * S }}>
              <span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text }}>推薦你這些熱門工具：</span>
              <div style={{ display: "flex", gap: 16 * S, flexWrap: "wrap" }}>
                {["Vercel", "Render", "GCP", "AWS"].map((t, i) => <Pop key={t} at={689 + i * 18}><span style={{ fontFamily: SYNE, fontWeight: 600, fontSize: 34 * S, color: C.text, padding: `${8 * S}px ${20 * S}px`, borderRadius: 12 * S, border: `${1.5 * S}px solid ${C.borderHi}` }}>{t}</span></Pop>)}
              </div>
            </div>
          </div>
        </Pop>
        <div style={{ display: "flex", gap: 24 * S, justifyContent: "center", marginTop: 20 * S }}>
          <Pop at={277}><Chip text="網路上討論度很高" color={C.gray} size={26 * S} /></Pop>
          <Pop at={412}><Chip text="不一定適合新手" color={C.red} size={26 * S} /></Pop>
          <Pop at={494}><Chip text="隱藏的門檻" icon="warning" color={C.red} size={26 * S} /></Pop>
        </div>
      </Stage>
      <Stage opacity={pB} style={{ gap: 30 * S }}>
        <Pop at={860} kind="up"><span style={{ fontFamily: TC, fontSize: 32 * S, color: C.muted }}>新手很難注意到的問題</span></Pop>
        <div style={{ display: "flex", gap: 40 * S }}>
          {mine(959, 1031, "免費方案有限制", <Chip text="不能商業使用" icon="cross" color={C.red} />)}
          {mine(1102, 1182, "沒人使用就休眠", <div style={{ display: "flex", alignItems: "center", gap: 16 * S }}><LI name="moon" size={46 * S} color={C.red} />{frame >= 1237 && <><div style={{ transform: `rotate(${spin}deg)` }}><LI name="refresh" size={46 * S} color={C.red} /></div><span style={{ fontFamily: TC, fontSize: 28 * S, color: C.text }}>第一次打開很慢</span></>}</div>)}
          {mine(1309, 1357, "用量方式計費", <div style={{ display: "flex", alignItems: "baseline", gap: 10 * S }}><LI name="receipt" size={46 * S} color={C.red} /><Disp style={{ fontSize: 64 * S, color: C.red }}>${bill}</Disp></div>)}
        </div>
        <div style={{ display: "flex", gap: 30 * S, minHeight: 70 * S }}>
          {frame >= 1488 && <Pop at={1488}><Chip text="沒注意就產生額外費用" color={C.red} size={28 * S} /></Pop>}
          {frame >= 1559 && <Pop at={1559}><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted }}>工具本身沒有不好只是新手容易踩雷</span></Pop>}
        </div>
      </Stage>
      <Stage opacity={pC} style={{ gap: 50 * S }}>
        <Pop at={1783} kind="up"><span style={{ fontFamily: TC, fontSize: 34 * S, color: C.muted }}>新手階段優先選擇</span></Pop>
        <div style={{ display: "flex", gap: 40 * S }}>
          {["簡單", "免費", "限制清楚"].map((t, i) => (
            <Pop key={t} at={1898 + i * 14}><div style={{ padding: `${30 * S}px ${56 * S}px`, borderRadius: 26 * S, border: `${2 * S}px solid ${hexA(C.green, 0.6)}`, background: hexA(C.green, 0.08) }}><span style={{ fontFamily: TC, fontSize: 70 * S, color: C.green, fontWeight: 500 }}>{t}</span></div></Pop>
          ))}
        </div>
        {frame >= 2000 && <Pop at={2000}><span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text }}>先把流程走順再考慮進階工具</span></Pop>}
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 5.1 — 什麼是域名：長網址縮成短網址 → 放進購物袋＝買下來 → 名詞卡 域名
// cues: 84 自訂網域(2.80) | 192 客製網址(6.40) | 307 部署完成(10.24) | 384 自動生成網址(12.80) | 468 很長不好記(15.60)
//   552 簡潔客製(18.40) | 643 域名服務商(21.44) | 756 買下來(25.20) | 806 叫做域名(26.88)
// ═════════════════════════════════════════════════════════════════════════════
const Scene51Domain: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const shrink = interpolate(frame, [552, 580], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const bagIn = interpolate(frame, [756, 790], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[16]}>
      <SectionHeader num="05" title="想要自訂網址怎麼做" accent={C.green} />
      <Stage style={{ gap: 50 * S }}>
        <Pop at={307} kind="up"><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted }}>部署完成後平台預設給你的網址</span></Pop>
        <div style={{ position: "relative", height: 130 * S, width: 2000 * S, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ position: "absolute", opacity: 1 - shrink, transform: `scaleX(${1 - 0.5 * shrink})` }}>
            <Pop at={384}><div style={{ padding: `${20 * S}px ${34 * S}px`, borderRadius: 18 * S, border: `${1.5 * S}px solid ${C.borderHi}`, fontFamily: MONO, fontSize: 36 * S, color: C.gray }}>https://你的帳號.平台給的網域/你的專案名稱/</div></Pop>
          </div>
          <div style={{ position: "absolute", opacity: shrink * (1 - bagIn), transform: `translateY(${bagIn * 120 * S}px) scale(${1 - 0.4 * bagIn})` }}>
            <div style={{ padding: `${20 * S}px ${40 * S}px`, borderRadius: 18 * S, border: `${2 * S}px solid ${C.green}`, background: hexA(C.green, 0.08) }}><Disp style={{ fontSize: 56 * S, color: C.green }}>yourname.com</Disp></div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24 * S, minHeight: 60 * S }}>
          {frame >= 468 && <Pop at={468}><Chip text="很長不好記" color={C.gray} size={26 * S} /></Pop>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 80 * S }}>
          <Pop at={643}>
            <div style={{ display: "flex", alignItems: "center", gap: 22 * S }}>
              <div style={{ transform: `scale(${1 + 0.1 * bagIn})` }}><LI name="bag" size={130 * S} color={C.green} sw={1.4} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 * S }}>
                <span style={{ fontFamily: TC, fontSize: 34 * S, color: C.text }}>域名服務商</span>
                {frame >= 756 && <Pop at={756}><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.green }}>把網址買下來</span></Pop>}
              </div>
            </div>
          </Pop>
          {frame >= 806 && <TermCard at={806} term="域名" en="domain" def="你買下來的專屬網址" color={C.green} />}
        </div>
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 5.2 — 域名行情：三根長條依序長出（數字跳動 11 / 23 / 70 美金）→ 第一年矮、第二年翻倍
// cues: 209 .com(6.96) | 292 11美金(9.72) | 359 .tw(11.96) | 444 23美金(14.80) | 535 .ai(17.84) | 773 70美金(25.76)
//   875 預先知道行情(29.16) | 995 首年超低價(33.16) | 1088 第二年續費(36.28) | 1140 貴好幾倍(38.00) | 1198 精打細算(39.92)
// ═════════════════════════════════════════════════════════════════════════════
const Scene52Price: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 980);
  const pB = win(frame, 980, dur + 20);
  const bars = [{ tld: ".com", v: 11, at: 209, vAt: 292 }, { tld: ".tw", v: 23, at: 359, vAt: 444 }, { tld: ".ai", v: 70, at: 535, vAt: 773 }];
  const maxH = 900 * S / 2;
  const y1 = interpolate(frame, [995, 1025], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const y2 = interpolate(frame, [1088, 1140], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.3)) });
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[17]}>
      <SectionHeader num="05" title="域名行情" accent={C.green} />
      <Stage opacity={pA} style={{ justifyContent: "flex-end", paddingBottom: 60 * S }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 140 * S }}>
          {bars.map((b) => {
            const g = interpolate(frame, [b.vAt, b.vAt + 30], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
            const h = (b.v / 70) * maxH * g;
            return (
              <Pop key={b.tld} at={b.at}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 * S, opacity: g > 0 ? 1 : 0 }}><Disp style={{ fontSize: 70 * S, color: b.v === 70 ? C.red : C.green }}>{Math.round(b.v * g)}</Disp><span style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted }}>美金每年</span></div>
                  <div style={{ width: 220 * S, height: Math.max(6 * S, h), borderRadius: `${16 * S}px ${16 * S}px 0 0`, background: hexA(b.v === 70 ? C.red : C.green, 0.3), border: `${2 * S}px solid ${b.v === 70 ? C.red : C.green}` }} />
                  <Disp style={{ fontSize: 56 * S, color: C.text }}>{b.tld}</Disp>
                </div>
              </Pop>
            );
          })}
        </div>
        {frame >= 875 && <Pop at={875} style={{ marginTop: 30 * S }}><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted }}>預先知道行情避免被坑錢</span></Pop>}
      </Stage>
      <Stage opacity={pB} style={{ gap: 40 * S }}>
        <Pop at={995} kind="up"><span style={{ fontFamily: TC, fontSize: 34 * S, color: C.text }}>小心首年超低價方案</span></Pop>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 160 * S, height: 520 * S }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S }}>
            <div style={{ width: 240 * S, height: 90 * S * y1, borderRadius: `${14 * S}px ${14 * S}px 0 0`, background: hexA(C.green, 0.3), border: `${2 * S}px solid ${C.green}` }} />
            <span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text }}>第一年</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S }}>
            {frame >= 1140 && <Pop at={1140}><Chip text="貴了好幾倍" color={C.red} /></Pop>}
            <div style={{ width: 240 * S, height: 400 * S * y2, borderRadius: `${14 * S}px ${14 * S}px 0 0`, background: hexA(C.red, 0.3), border: `${2 * S}px solid ${C.red}` }} />
            <span style={{ fontFamily: TC, fontSize: 32 * S, color: frame >= 1088 ? C.text : C.faint }}>第二年續費</span>
          </div>
        </div>
        {frame >= 1198 && <Pop at={1198}><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted }}>花錢前精打細算一下</span></Pop>}
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 5.3 — 推薦服務商：首選 Cloudflare Registrar（橘）／次選 Gandi／不推薦 GoDaddy（紅，壓暗抖一下打叉）
// cues: 105 Cloudflare Registrar(3.50) | 193 同一間公司(6.44) | 290 良心(9.68) | 338 價格透明(11.28) | 382 沒隱藏費用(12.72)
//   491 唯一限制(16.36) | 526 種類少(17.52) | 613 .tw買不到(20.44) | 698 Gandi(23.28) | 762 種類多(25.40) | 845 含.tw(28.16)
//   887 評價不錯(29.56) | 940 定價合理(31.32) | 991 第二順位(33.04) | 1086 GoDaddy(36.20) | 1172 廣告預算(39.08)
//   1340 廣告一直跑(44.68) | 1427 不誠實(47.56) | 1552 首年超低價(51.72) | 1645 第二年翻倍(54.84) | 1789 加購項目(59.64)
// ═════════════════════════════════════════════════════════════════════════════
const Scene53Registrar: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const focus = frame < 698 ? 0 : frame < 1086 ? 1 : 2;
  const shake = frame >= 1086 && frame < 1104 ? Math.sin((frame - 1086) * 2) * 8 * S : 0;
  type Col = { rank: string; name: string; color: string; at: number; h: number; ok: boolean; lines: { t: string; at: number; bad?: boolean }[] };
  const cols: Col[] = [
    { rank: "首選", name: "Cloudflare Registrar", color: C.orange, at: 105, h: 1, ok: true, lines: [{ t: "跟 Cloudflare Pages 同一間公司", at: 193 }, { t: "價格透明沒有隱藏費用", at: 338 }, { t: "支援的域名種類較少", at: 526, bad: true }, { t: ".tw 買不到", at: 613, bad: true }] },
    { rank: "次選", name: "Gandi", color: C.text, at: 698, h: 0.8, ok: true, lines: [{ t: "支援的域名種類較多", at: 762 }, { t: "包含 .tw", at: 845 }, { t: "評價不錯定價合理", at: 887 }, { t: "工程師的第二順位", at: 991 }] },
    { rank: "不推薦", name: "GoDaddy", color: C.red, at: 1086, h: 0.6, ok: false, lines: [{ t: "廣告一直跑出來", at: 1340, bad: true }, { t: "首年超低價吸引你", at: 1552, bad: true }, { t: "第二年續費直接翻倍", at: 1645, bad: true }, { t: "不太需要的加購項目", at: 1789, bad: true }] },
  ];
  return (
    <Shell callouts={callouts} dur={dur} accent={C.orange} pct={PROGRESS_PCT[18]}>
      <SectionHeader num="05" title="跟誰買域名" accent={C.orange} />
      <Stage style={{ flexDirection: "row", alignItems: "flex-end", gap: 30 * S }}>
        {cols.map((c, i) => {
          const lit = focus === i ? 1 : 0.45;
          return (
            <Pop key={c.name} at={c.at}>
              <div style={{ width: 470 * S, display: "flex", flexDirection: "column", gap: 20 * S, opacity: lit, transform: i === 2 ? `translateX(${shake}px)` : undefined }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 * S }}>
                  {c.lines.map((l) => (
                    <Pop key={l.t} at={l.at} kind="item">
                      <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
                        <LI name={l.bad ? "cross" : "check"} size={30 * S} color={l.bad ? C.red : C.green} sw={2.4} />
                        <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.text }}>{l.t}</span>
                      </div>
                    </Pop>
                  ))}
                </div>
                <div style={{ height: 380 * S * c.h, borderRadius: `${24 * S}px ${24 * S}px 0 0`, background: hexA(c.color, 0.07), border: `${2 * S}px solid ${hexA(c.color, 0.55)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 * S, position: "relative" }}>
                  <span style={{ fontFamily: TC, fontSize: 30 * S, color: c.color }}>{c.rank}</span>
                  <Disp style={{ fontSize: 36 * S, color: C.text, textAlign: "center", padding: `0 ${16 * S}px` }}>{c.name}</Disp>
                  {!c.ok && frame >= 1100 && <div style={{ position: "absolute", top: 16 * S, right: 16 * S }}><Pop at={1100}><LI name="cross" size={60 * S} color={C.red} sw={2.6} /></Pop></div>}
                </div>
              </div>
            </Pop>
          );
        })}
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 5.4 — 買完域名之後：服務商 ↔ 部署平台 marching-dash 對接 → 有印象就好 → 之後請 AI 帶
// cues: 67 兩邊做設定(2.24) | 206 對接(6.88) | 271 專有名詞多(9.04) | 410 有印象就好(13.68) | 569 買域名(18.96)
//   610 做設定(20.32) | 730 回來複習(24.32) | 763 請AI(25.44)
// ═════════════════════════════════════════════════════════════════════════════
const Scene54After: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const spin = frame * 1.5;
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[19]}>
      <SectionHeader num="05" title="買完域名之後" accent={C.green} />
      <div style={{ position: "absolute", left: 560 * S, top: 400 * S, transform: "translate(-50%,-50%)" }}><Pop at={0}><Node icon="bag" label="域名服務商" color={C.orange} size={180 * S} /></Pop></div>
      <div style={{ position: "absolute", left: 1360 * S, top: 400 * S, transform: "translate(-50%,-50%)" }}><Pop at={30}><Node icon="server" label="部署平台" color={C.green} size={180 * S} /></Pop></div>
      {[560, 1360].map((x, i) => frame >= 67 && <div key={x} style={{ position: "absolute", left: (x + 70) * S, top: 300 * S, transform: `rotate(${i ? -spin : spin}deg)` }}><Pop at={67 + i * 8}><LI name="gear" size={60 * S} color={C.muted} /></Pop></div>)}
      <Wire x1={670} y1={380} x2={1250} y2={380} at={206} color={C.green} march width={2.5} />
      <div style={{ position: "absolute", left: 960 * S, top: 300 * S, transform: "translateX(-50%)" }}><Pop at={206}><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.green }}>對接起來</span></Pop></div>
      <div style={{ position: "absolute", left: 960 * S, top: 470 * S, transform: "translateX(-50%)", display: "flex", gap: 20 * S, opacity: interpolate(frame, [400, 420], [1, 0.25], clamp) }}>
        {["專有名詞多", "步驟也多"].map((t, i) => <Pop key={t} at={271 + i * 60}><Chip text={t} color={C.gray} size={26 * S} /></Pop>)}
      </div>
      <div style={{ position: "absolute", left: 960 * S, top: 580 * S, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 26 * S }}>
        <Pop at={410} kind="up"><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.muted }}>現在只要有個印象</span></Pop>
        <div style={{ display: "flex", alignItems: "center", gap: 20 * S }}>
          <Pop at={499}><Chip text="想要自訂網址" color={C.text} size={28 * S} /></Pop>
          <Pop at={569}><span style={{ fontFamily: MONO, fontSize: 28 * S, color: C.faint }}>›</span></Pop>
          <Pop at={569}><Chip text="買域名" icon="bag" color={C.orange} size={28 * S} /></Pop>
          <Pop at={610}><span style={{ fontFamily: MONO, fontSize: 28 * S, color: C.faint }}>›</span></Pop>
          <Pop at={610}><Chip text="做一些設定" icon="gear" color={C.green} size={28 * S} /></Pop>
        </div>
        {frame >= 763 && <Pop at={763}><Chip text="真的需要時請 AI 一步一步帶你" icon="robot" color={C.green} solid /></Pop>}
      </div>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 6.1 — 五條 takeaway → 回扣片頭（朋友手機這次打開了）→ 無聲回家作業卡（中插 210f）→ 下集預告「資料庫」發光大卡
// cues(audio local): 245 第一個(8.18) | 284 部署(9.46) | 629 第二個(20.98) | 776 上傳程式碼(25.86) | 837 設定部署平台(27.90)
//   889 取得網址(29.64) | 1150 第三個(38.34) | 1204 GAS或GitHub Pages(40.14) | 1381 Cloudflare或Zeabur(46.04)
//   1527 第四個(50.90) | 1673 免費方案開始(55.76) | 1873 第五個(62.42) | 2027 行情(67.58) | 2150 已經學會(71.68)
//   [SPLIT 2349 → 作業卡 2349–2559] 之後 +210：2568 但如果(78.60) | 2842 資料消失(87.74) | 2989 下個單元(92.62)
//   3088 記住資料(95.94) | 3173 資料庫(98.76) | 3242 下個單元見(101.06)
// ═════════════════════════════════════════════════════════════════════════════
const Scene61Finale: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pList = win(frame, 0, 2150);
  const pBack = win(frame, 2150, SPLIT_6_1);
  const pHW = win(frame, SPLIT_6_1, SPLIT_6_1 + HW_F);
  const pData = win(frame, SPLIT_6_1 + HW_F, 2989);
  const pNext = win(frame, 2989, dur + 20);
  const glow = 0.22 + 0.1 * Math.sin((frame - 2989) / 30);
  const hwT = interpolate(frame, [SPLIT_6_1, SPLIT_6_1 + HW_F], [0, 1], clamp);
  const gone = interpolate(frame, [2842, 2860], [1, 0], clamp);
  type Tk = { n: string; c: string; at: number; t: string; s: string; sAt?: number; steps?: { t: string; at: number }[] };
  const tks: Tk[] = [
    { n: "01", c: C.green, at: 245, t: "部署就是把程式從本機搬到網路上", s: "讓任何人都能透過連結使用" },
    { n: "02", c: C.green, at: 629, t: "手動部署三步驟", s: "", steps: [{ t: "上傳程式碼", at: 776 }, { t: "設定部署平台", at: 837 }, { t: "取得網址", at: 889 }] },
    { n: "03", c: C.yellow, at: 1150, t: "新手先從 GAS 或 GitHub Pages 起步", s: "需要時再搭配 Cloudflare Pages 或 Zeabur", sAt: 1381 },
    { n: "04", c: C.red, at: 1527, t: "AI 推薦的平台不一定對新手友善", s: "先從推薦的免費方案開始", sAt: 1673 },
    { n: "05", c: C.orange, at: 1873, t: "自訂網址要向域名服務商購買", s: "先了解行情以免被坑錢", sAt: 2027 },
  ];
  const active = tks.reduce((a, t, i) => (frame >= t.at ? i : a), 0);
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[20]}>
      <div style={{ opacity: pList }}>
        <SectionHeader num="重點整理" title="本單元五件事" accent={C.green} />
        <Stage style={{ gap: 14 * S, alignItems: "stretch", padding: `0 ${150 * S}px` }}>
          {tks.map((t, i) => (
            <Pop key={t.n} at={t.at} kind="item">
              <div style={{ display: "flex", alignItems: "center", gap: 26 * S, padding: `${15 * S}px ${30 * S}px`, borderRadius: 20 * S, background: C.surface, border: `${1.5 * S}px solid ${hexA(t.c, i === active ? 0.5 : 0.18)}`, opacity: i === active ? 1 : 0.6 }}>
                <span style={{ fontFamily: MONO, fontSize: 28 * S, color: t.c, minWidth: 60 * S }}>{t.n}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 * S }}>
                  <span style={{ fontFamily: TC, fontSize: 34 * S, color: C.text }}>{t.t}</span>
                  {t.steps ? (
                    <div style={{ display: "flex", gap: 14 * S, alignItems: "center" }}>
                      {t.steps.map((s, j) => <span key={s.t} style={{ fontFamily: TC, fontSize: 26 * S, color: frame >= s.at ? C.green : C.faint }}>{j > 0 ? "› " : ""}{s.t}</span>)}
                    </div>
                  ) : (
                    <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted, opacity: frame >= (t.sAt ?? t.at) ? 1 : 0 }}>{t.s}</span>
                  )}
                </div>
              </div>
            </Pop>
          ))}
        </Stage>
      </div>
      {/* 回扣片頭：朋友手機這次打開了 */}
      <AbsoluteFill style={{ opacity: pBack, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 160 * S }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 * S }}>
          <Pop at={2150} kind="up"><span style={{ fontFamily: TC, fontSize: 36 * S, color: C.muted }}>網址傳給朋友</span></Pop>
          <Pop at={2175}><span style={{ fontFamily: TC, fontSize: 80 * S, color: C.green, fontWeight: 500 }}>這次打開了</span></Pop>
        </div>
        <Pop at={2160}><PhoneMock state="ok" url="你的帳號.github.io/你的專案" scale={1.05} /></Pop>
      </AbsoluteFill>
      {/* 無聲回家作業卡 */}
      <AbsoluteFill style={{ opacity: pHW, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Pop at={SPLIT_6_1}>
          <div style={{ width: 2300 * S / 2 * 1.3, padding: `${56 * S}px ${64 * S}px`, borderRadius: 30 * S, background: C.surface, border: `${2 * S}px solid ${hexA(C.green, 0.45)}`, display: "flex", flexDirection: "column", gap: 30 * S }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 * S }}>
              <svg width={70 * S} height={70 * S} viewBox="0 0 40 40"><circle cx={20} cy={20} r={16} fill="none" stroke={C.border} strokeWidth={3} /><circle cx={20} cy={20} r={16} fill="none" stroke={C.green} strokeWidth={3} pathLength={1} strokeDasharray={`${1 - hwT} 1`} transform="rotate(-90 20 20)" /></svg>
              <span style={{ fontFamily: MONO, fontSize: 30 * S, color: C.green, letterSpacing: "0.18em" }}>回家作業</span>
            </div>
            <span style={{ fontFamily: TC, fontSize: 50 * S, color: C.text, lineHeight: 1.5 }}>把你做過的一個 <Disp style={{ color: C.green }}>index.html</Disp> 用 <Disp style={{ color: C.green }}>GitHub Pages</Disp> 部署上線</span>
            <span style={{ fontFamily: TC, fontSize: 50 * S, color: C.text }}>把網址傳給一個朋友打開</span>
          </div>
        </Pop>
      </AbsoluteFill>
      {/* 資料消失的情境 */}
      <AbsoluteFill style={{ opacity: pData, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 100 * S }}>
        <Pop at={SPLIT_6_1 + HW_F}>
          <div style={{ width: 900 * S, padding: 40 * S, borderRadius: 26 * S, background: C.surface, border: `${1.5 * S}px solid ${C.borderHi}`, display: "flex", flexDirection: "column", gap: 20 * S }}>
            <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted }}>使用者輸入的資料</span>
            <div style={{ height: 80 * S, borderRadius: 14 * S, border: `${1.5 * S}px solid ${C.borderHi}`, display: "flex", alignItems: "center", padding: `0 ${24 * S}px` }}><span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, opacity: gone }}>預約明天 10 點 2 位</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}><div style={{ transform: `rotate(${frame >= 2842 ? (frame - 2842) * 10 : 0}deg)` }}><LI name="refresh" size={46 * S} color={C.muted} /></div><span style={{ fontFamily: TC, fontSize: 28 * S, color: frame >= 2842 ? C.red : C.muted }}>{frame >= 2842 ? "重新整理後資料就消失" : "重新整理"}</span></div>
          </div>
        </Pop>
      </AbsoluteFill>
      {/* 發光大卡：下集預告 資料庫（finale 才有發光） */}
      <AbsoluteFill style={{ opacity: pNext, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Pop at={2989}>
          <div style={{ width: 1700 * S, padding: `${60 * S}px ${60 * S}px`, borderRadius: 34 * S, background: `linear-gradient(135deg, ${hexA(C.purple, 0.12)}, ${hexA(C.purple, 0.04)})`, border: `${3 * S}px solid ${hexA(C.purple, 0.5)}`, boxShadow: `0 0 ${80 * S}px ${hexA(C.purple, glow)}`, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 26 * S }}>
            <span style={{ fontFamily: MONO, fontSize: 26 * S, color: C.purple, letterSpacing: "0.18em" }}>下集預告</span>
            <span style={{ fontFamily: TC, fontSize: 110 * S, color: frame >= 3173 ? C.purple : C.text, fontWeight: 800 }}>資料庫</span>
            {frame >= 3088 && <Pop at={3088}><span style={{ fontFamily: TC, fontSize: 38 * S, color: C.muted }}>讓程式記住資料</span></Pop>}
          </div>
        </Pop>
      </AbsoluteFill>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// Root
// ═════════════════════════════════════════════════════════════════════════════
const SCENES: React.FC<SceneProps>[] = [
  Scene01Open, Scene11What, Scene12Two, Scene13Early,
  Scene21Upload, Scene22Platform, Scene23Url, Scene24Demo, Scene25Demo,
  Scene31Four, Scene32Gas, Scene33Ghp, Scene34Cf, Scene35Zeabur, Scene36Choose,
  Scene41Trap, Scene51Domain, Scene52Price, Scene53Registrar, Scene54After, Scene61Finale,
];

export const FullVideo15: React.FC = () => {
  const getCallouts = (s: number, e: number) =>
    GLOBAL_CALLOUTS.map((c) => ({ ...c, from: c.from - s, to: c.to - s })).filter((c) => c.from >= -FADE_OUT_F && c.from < e - s);
  const last = SEG_KEYS.length - 1;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/course_background_music.wav")} volume={0.1} loop />
      <Sequence from={0} durationInFrames={HOOK_F}>
        <HookScene dur={HOOK_F} />
      </Sequence>
      {SEG_STARTS_15.map((start, i) => {
        const Scene = SCENES[i];
        const dur = SEG_DURATIONS[i];
        const src = staticFile(`audio/2-8/2-8_${SEG_KEYS[i]}-normalized.wav`);
        return (
          <Sequence key={i} from={start} durationInFrames={dur}>
            {i === last ? (
              <>
                <Sequence from={0} durationInFrames={SPLIT_6_1}><Audio src={src} /></Sequence>
                <Sequence from={SPLIT_6_1 + HW_F}><Audio src={src} trimBefore={SPLIT_6_1} /></Sequence>
              </>
            ) : (
              <Audio src={src} />
            )}
            <Scene callouts={getCallouts(start, start + dur)} dur={dur} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
