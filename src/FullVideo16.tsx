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
// FullVideo16 — CH 2-9「技術方案｜資料庫——簡易版、專業版，哪個適合我」
// v2 motion system（參考 FullVideo15 / FullVideo09b）+ lessoncraft 設計單 chapters/2-9/design-2-9.md
// 片頭 90f 無聲鉤子 + 18 個音檔段落 + 6.1 結束後 240f 無聲回家作業卡（6.2 起整段往後推 240f）；4K 30fps。
// 全片觀念動畫，沒有實機錄影。
// 語意色：持久化／資料庫／成功＝綠 / 試算表・KISS＝黃 / MySQL 海豚＝藍 / PostgreSQL 大象・Supabase＝紫
//         物件儲存＝橘 / 向量儲存＝綠 / 分析型倉儲＝粉 / 費用風險・過度工程＝紅 / 記憶體＝灰
// 講稿 2.3「三層升級路徑＋三個問題」沒有錄音（2.2 音檔停在 KISS，3.1 直接接正式資料庫），畫面不做。
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
  blue: "#5ab4ff",
  pink: "#ff7eb6",
  teal: "#5eead4",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// ─────────────────────────────────────────────────────────────────────────────
// Timing — 每段長度 = round(normalized.wav 秒數 × 30)；片頭 90f。
// 回家作業卡：6.1 旁白最後一句結束於 89.93s（silencedetect -40dB：89.93–90.60 靜音），
// 音檔全長 2718f；作業卡接在 6.1 音檔之後 2718–2958（local），6.2 之後全部 +240f。
// ─────────────────────────────────────────────────────────────────────────────
const HOOK_F = 90;
const HW_F = 240; // 回家作業卡 8 秒（約 36 字 ÷ 5 字/秒 ≈ 7.2 秒）
const SEG_KEYS = ["0.1", "1.1", "1.2", "1.3", "1.4", "2.1", "2.2", "3.1", "3.2", "4.1", "4.2", "4.3", "4.4", "4.5", "5.1", "5.2", "6.1", "6.2"];
export const AUDIO_F = [2494, 1415, 1326, 1684, 1380, 1869, 1374, 2534, 1967, 753, 2283, 2357, 1466, 975, 1289, 2175, 2718, 2264];
const HW_SEG = 16; // 6.1
const HW_AT = 2718; // 6.1 local：作業卡起點（= 6.1 音檔長度）
const SEG_DURATIONS = AUDIO_F.map((d, i) => (i === HW_SEG ? d + HW_F : d));
export const SEG_STARTS_16 = SEG_DURATIONS.reduce<number[]>((acc, d, i) => {
  acc.push(i === 0 ? HOOK_F : acc[i - 1] + SEG_DURATIONS[i - 1]);
  return acc;
}, []);
export const TOTAL_FRAMES_16 = SEG_STARTS_16[SEG_STARTS_16.length - 1] + SEG_DURATIONS[SEG_DURATIONS.length - 1];
const PROGRESS_PCT = SEG_STARTS_16.map((s, i) => Math.round(((s + SEG_DURATIONS[i]) / TOTAL_FRAMES_16) * 100));
const segIdx = (k: string) => SEG_KEYS.indexOf(k);

// ─────────────────────────────────────────────────────────────────────────────
// iMessage callouts（無寄件人）— at = 該段 local frame（VTT cue 起點），長度 120f
// ─────────────────────────────────────────────────────────────────────────────
type Callout = { from: number; to: number; text: string };
const LOCAL_CALLOUTS: { seg: string; at: number; text: string }[] = [
  { seg: "3.2", at: 1560, text: "自己架資料庫其實也蠻好玩" },   // 52.00 其實也會還蠻好玩的
  { seg: "4.2", at: 1970, text: "沒搞懂計費前先別急著用" },     // 65.68 沒有充分的了解的話
  { seg: "4.4", at: 252, text: "先有一個小小的印象就好" },      // 8.40 小小的印象就好了
];
const GLOBAL_CALLOUTS: Callout[] = LOCAL_CALLOUTS.map((c) => {
  const from = SEG_STARTS_16[segIdx(c.seg)] + c.at;
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
        <span style={{ fontFamily: MONO, fontSize: 18 * S, color: C.faint, letterSpacing: "0.08em" }}>CH 2-9</span>
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
        <span style={{ position: "relative", fontFamily: TC, fontSize: 64 * S, color, fontWeight: 500, whiteSpace: "nowrap" }}>
          <span style={{ position: "absolute", left: -4 * S, right: -4 * S, bottom: 6 * S, height: 18 * S, background: hexA(color, 0.22), transformOrigin: "left", transform: `scaleX(${hl})`, borderRadius: 4 * S }} />
          <span style={{ position: "relative" }}>{term}</span>
        </span>
        {en && <Disp style={{ fontSize: 30 * S, color: C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{en}</Disp>}
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

// ─────────────────────────────────────────────────────────────────────────────
// 2-9 補充 icon（monoline）
// ─────────────────────────────────────────────────────────────────────────────
Object.assign(ICONS, {
  calendar: "M4 6h16v15H4z|M4 10h16|M8 3v5|M16 3v5",
  chart: "M4 20h16|M7 16v-5|M12 16V7|M17 16v-8",
  filter: "M4 5h16l-6 8v6l-4-2v-4z",
  sort: "M7 4v16|M4 17l3 3 3-3|M17 20V4|M14 7l3-3 3 3",
  key: "M8 15a4 4 0 110-8 4 4 0 010 8z|M12 11h9|M18 11v3|M21 11v2",
  cursor: "M5 3l14 8-6 2-2 6z",
  plus: "M12 5v14|M5 12h14",
  layers: "M12 3l9 5-9 5-9-5z|M3 13l9 5 9-5",
  box: "M3 7l9-4 9 4v10l-9 4-9-4z|M3 7l9 4 9-4|M12 11v10",
  wallet: "M3 7h16v12H3z|M3 7l12-4v4|M15 13h4",
  infinity: "M6 9a3 3 0 100 6c2 0 4-3 6-3s4 3 6 3a3 3 0 100-6c-2 0-4 3-6 3s-4-3-6-3z",
  power: "M12 3v8|M7 6a7 7 0 1010 0",
  trend: "M3 17l6-6 4 4 8-8|M15 7h6v6",
  copy: "M8 8h12v12H8z|M4 16V4h12",
  bug: "M8 8h8v9a4 4 0 01-8 0z|M12 8v13|M4 12h4|M16 12h4|M5 7l3 2|M19 7l-3 2|M9 5l1 2|M15 5l-1 2",
  branch: "M6 3v12|M6 15a3 3 0 100 6 3 3 0 000-6z|M18 6a3 3 0 100 6 3 3 0 000-6z|M18 12c0 3-4 3-8 5",
  route: "M6 19a2 2 0 100-4 2 2 0 000 4z|M18 9a2 2 0 100-4 2 2 0 000 4z|M8 17h6a3 3 0 000-6H10a3 3 0 010-6h6",
  memory: "M5 7h14v10H5z|M8 7V4|M12 7V4|M16 7V4|M8 17v3|M12 17v3|M16 17v3",
  grid: "M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z",
  vector: "M5 19a2 2 0 100-4 2 2 0 000 4z|M12 8a2 2 0 100-4 2 2 0 000 4z|M19 16a2 2 0 100-4 2 2 0 000 4z|M6.5 16L11 8|M13 7l5 6",
  video: "M3 6h13v12H3z|M16 10l5-3v10l-5-3",
  audio: "M9 18V6l10-2v12|M9 18a3 3 0 11-6 0 3 3 0 016 0z|M19 16a3 3 0 11-6 0 3 3 0 016 0z",
  spider: "M12 9a3 3 0 100 6 3 3 0 000-6z|M9 11L4 7|M15 11l5-4|M9 13H3|M15 13h6|M9 15l-5 4|M15 15l5 4",
});

// ─────────────────────────────────────────────────────────────────────────────
// 2-9 共用元件
// ─────────────────────────────────────────────────────────────────────────────
// 以 1920 基準座標擺放（中心對齊）
const At: React.FC<{ x: number; y: number; children: React.ReactNode; o?: number; anchor?: "c" | "t" | "tl"; z?: number }> = ({ x, y, children, o = 1, anchor = "c", z }) => (
  <div style={{ position: "absolute", left: x * S, top: y * S, width: "max-content", transform: anchor === "c" ? "translate(-50%,-50%)" : anchor === "t" ? "translateX(-50%)" : "none", opacity: o, zIndex: z }}>{children}</div>
);
// 從 (x1,y1) 移到 (x2,y2)：at 出現、a→b 移動
const Mover: React.FC<{ at: number; a: number; b: number; x1: number; y1: number; x2: number; y2: number; children: React.ReactNode; o?: number }> = ({ at, a, b, x1, y1, x2, y2, children, o = 1 }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [a, b], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return <At x={x1 + (x2 - x1) * t} y={y1 + (y2 - y1) * t} o={o}><Pop at={at}>{children}</Pop></At>;
};
const Txt: React.FC<{ size: number; color?: string; children: React.ReactNode; font?: string; style?: React.CSSProperties }> = ({ size, color = C.text, children, font = TC, style }) => (
  <span style={{ fontFamily: font, fontSize: size, color, fontWeight: 500, whiteSpace: "nowrap", ...style }}>{children}</span>
);
// 對話泡泡（模擬聊天訊息，可保留標點）
const Bubble: React.FC<{ text: string; side: "l" | "r"; color?: string; icon?: string; size?: number }> = ({ text, side, color = C.gray, icon, size = 34 * S }) => (
  <div style={{ display: "flex", flexDirection: side === "l" ? "row" : "row-reverse", alignItems: "flex-end", gap: 16 * S }}>
    {icon && <div style={{ width: 64 * S, height: 64 * S, borderRadius: 99, background: hexA(color, 0.14), border: `${1.5 * S}px solid ${hexA(color, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><LI name={icon} size={36 * S} color={color} /></div>}
    <div style={{ padding: `${18 * S}px ${28 * S}px`, borderRadius: 28 * S, background: side === "r" ? "#26262e" : hexA(color, 0.1), border: side === "l" ? `${1.5 * S}px solid ${hexA(color, 0.35)}` : "none", fontFamily: TC, fontSize: size, color: C.text, whiteSpace: "nowrap" }}>{text}</div>
  </div>
);
// 瀏覽器視窗
const BrowserMock: React.FC<{ w: number; url: string; children?: React.ReactNode; spin?: number }> = ({ w, url, children, spin = 0 }) => (
  <div style={{ width: w * S, borderRadius: 22 * S, background: "#0e0e14", border: `${1.5 * S}px solid ${C.borderHi}`, overflow: "hidden", boxShadow: `0 ${24 * S}px ${60 * S}px rgba(0,0,0,0.5)` }}>
    <div style={{ height: 56 * S, display: "flex", alignItems: "center", gap: 12 * S, padding: `0 ${20 * S}px`, background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ width: 12 * S, height: 12 * S, borderRadius: 99, background: "rgba(255,255,255,0.18)" }} />)}
      <div style={{ transform: `rotate(${spin}deg)`, marginLeft: 10 * S }}><LI name="refresh" size={28 * S} color={C.muted} sw={2} /></div>
      <div style={{ flex: 1, height: 36 * S, borderRadius: 10 * S, background: "#0e0e14", display: "flex", alignItems: "center", padding: `0 ${14 * S}px` }}><span style={{ fontFamily: MONO, fontSize: 18 * S, color: C.muted }}>{url}</span></div>
    </div>
    <div style={{ padding: 30 * S, display: "flex", flexDirection: "column", gap: 18 * S }}>{children}</div>
  </div>
);
const Field: React.FC<{ label: string; text: string; shown: number; flash?: number }> = ({ label, text, shown, flash = 0 }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 * S }}>
    <span style={{ fontFamily: TC, fontSize: 22 * S, color: C.muted }}>{label}</span>
    <div style={{ height: 72 * S, borderRadius: 12 * S, border: `${1.5 * S}px solid ${flash > 0 ? hexA(C.red, 0.3 + 0.6 * flash) : C.borderHi}`, display: "flex", alignItems: "center", padding: `0 ${20 * S}px` }}>
      <span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text }}>{Array.from(text).slice(0, Math.max(0, Math.floor(shown))).join("")}</span>
    </div>
  </div>
);
// 資料表（像試算表）：widths 為 1920 基準寬；lit(r,c) 0–1 亮度；r=-1 為表頭
const ROW_H = 70;
const Table: React.FC<{ cols: string[]; rows: string[][]; widths: number[]; color: string; lit?: (r: number, c: number) => number; rowAt?: (r: number) => number; colAt?: (c: number) => number; fs?: number; rowH?: number }> = ({ cols, rows, widths, color, lit, rowAt, colAt, fs = 28 * S, rowH = ROW_H }) => {
  const frame = useCurrentFrame();
  const cell = (r: number, c: number, txt: string, head: boolean) => {
    const l = lit ? lit(r, c) : 0;
    const showCol = colAt ? interpolate(frame, [colAt(c), colAt(c) + 10], [0, 1], clamp) : 1;
    return (
      <div key={c} style={{ width: widths[c] * S, height: rowH * S, display: "flex", alignItems: "center", padding: `0 ${18 * S}px`, borderRight: c < widths.length - 1 ? `1px solid ${C.border}` : "none", background: hexA(color, (head ? 0.08 : 0) + 0.22 * l), boxSizing: "border-box" }}>
        <span style={{ fontFamily: head ? TC : TC, fontSize: fs, color: head ? (l > 0.5 ? color : hexA(color, 0.85)) : l > 0.5 ? C.text : C.muted, opacity: showCol, whiteSpace: "nowrap" }}>{txt}</span>
      </div>
    );
  };
  return (
    <div style={{ borderRadius: 16 * S, border: `${1.5 * S}px solid ${hexA(color, 0.4)}`, background: C.surface, overflow: "hidden" }}>
      <div style={{ display: "flex", borderBottom: `${1.5 * S}px solid ${hexA(color, 0.3)}` }}>{cols.map((h, c) => cell(-1, c, h, true))}</div>
      {rows.map((row, r) => {
        const o = rowAt ? interpolate(frame, [rowAt(r), rowAt(r) + 10], [0, 1], clamp) : 1;
        return <div key={r} style={{ display: "flex", borderBottom: r < rows.length - 1 ? `1px solid ${C.border}` : "none", opacity: o }}>{row.map((v, c) => cell(r, c, v, false))}</div>;
      })}
    </div>
  );
};
// 幾何線條動物（自繪，不用官方 logo）viewBox 240×160
const DOLPHIN = [
  "M26 98 C44 72 92 50 140 50 C170 50 190 58 200 70 Q214 74 230 78 Q218 88 200 86 C170 100 120 108 70 104",
  "M70 104 Q52 104 38 96",
  "M38 96 Q26 84 14 82 Q24 92 26 100 Q20 110 12 118 Q28 114 38 96",
  "M118 51 Q122 36 136 28 Q132 40 136 52",
  "M128 100 Q126 114 114 122 Q130 118 140 102",
  "M92 92 Q130 100 176 88",
];
const ELEPHANT = [
  "M92 50 Q120 28 160 30 Q212 34 214 86 L214 132 L194 132 L194 108 Q170 114 146 108 L146 132 L126 132 L126 104",
  "M92 50 Q60 42 50 68 Q44 90 54 102 Q60 118 52 134 Q48 142 38 140",
  "M68 104 Q78 112 92 110 L104 108 L104 132 L124 132 L124 104",
  "M94 48 Q124 46 124 76 Q122 100 98 98 Q88 74 94 48",
  "M60 98 Q66 108 78 106",
  "M214 70 Q228 82 222 100",
];
const Animal: React.FC<{ kind: "dolphin" | "elephant"; at: number; color: string; w: number; lit?: number }> = ({ kind, at, color, w, lit = 1 }) => {
  const p = useDraw(at, 40);
  const paths = kind === "dolphin" ? DOLPHIN : ELEPHANT;
  const eye = kind === "dolphin" ? { cx: 188, cy: 68 } : { cx: 70, cy: 70 };
  return (
    <svg width={w * S} height={(w * S * 160) / 240} viewBox="0 0 240 160" style={{ display: "block", opacity: 0.3 + 0.7 * lit }}>
      {paths.map((d, i) => <path key={i} d={d} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p} 1`} />)}
      <circle cx={eye.cx} cy={eye.cy} r={3.5} fill={color} opacity={p > 0.9 ? 1 : 0} />
    </svg>
  );
};
// Supabase 盒子（紫）：文字＋icon，不放 logo
const SupaBox: React.FC<{ w: number; h: number; label?: boolean; open?: number; children?: React.ReactNode }> = ({ w, h, label = true, open = 0, children }) => (
  <div style={{ width: w * S, height: h * S, borderRadius: 30 * S, background: hexA(C.purple, 0.08), border: `${2 * S}px solid ${hexA(C.purple, 0.6)}`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 20 * S }}>
    {label && (
      <div style={{ position: "absolute", top: 18 * S, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 12 * S, opacity: 1 - open }}>
        <LI name="box" size={34 * S} color={C.purple} />
        <Disp style={{ fontSize: 32 * S, color: C.text }}>Supabase</Disp>
      </div>
    )}
    {children}
  </div>
);
// 提示詞卡：原文、可保留標點；右上角小字「教材裡有」
const PromptBox: React.FC<{ at: number; text: string; size?: number; w?: number }> = ({ at, text, size = 34 * S, w }) => {
  const a = useFadeUpElastic(at);
  return (
    <div style={{ ...a, width: w ? w * S : undefined, padding: `${22 * S}px ${30 * S}px`, borderRadius: 20 * S, background: "#0f0f16", border: `${1.5 * S}px solid ${C.borderHi}`, display: "flex", flexDirection: "column", gap: 12 * S, boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
        <LI name="copy" size={26 * S} color={C.green} sw={2} />
        <span style={{ fontFamily: MONO, fontSize: 20 * S, color: C.green, letterSpacing: "0.12em" }}>提示詞</span>
        <span style={{ marginLeft: "auto", fontFamily: TC, fontSize: 20 * S, color: C.faint }}>教材裡有</span>
      </div>
      <span style={{ fontFamily: TC, fontSize: size, color: C.text, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
};
// 程式碼卡
const CodeCard: React.FC<{ at: number; name: string; color: string; icon: string; lines: string[]; w: number; hi?: number }> = ({ at, name, color, icon, lines, w, hi = 0 }) => {
  const a = useFadeUpElastic(at);
  return (
    <div style={{ ...a, width: w * S, borderRadius: 22 * S, background: "#0f0f16", border: `${1.5 * S}px solid ${hexA(color, 0.45)}`, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 * S, padding: `${14 * S}px ${22 * S}px`, background: hexA(color, 0.08), borderBottom: `1px solid ${hexA(color, 0.25)}` }}>
        <LI name={icon} size={32 * S} color={color} />
        <span style={{ fontFamily: TC, fontSize: 28 * S, color: C.text }}>{name}</span>
      </div>
      <div style={{ padding: `${20 * S}px ${22 * S}px`, display: "flex", flexDirection: "column", gap: 8 * S }}>
        {lines.map((l, i) => (
          <span key={i} style={{ fontFamily: MONO, fontSize: 22 * S, color: i === 0 && hi > 0 ? color : C.text, whiteSpace: "pre", background: i === 0 ? hexA(color, 0.14 * hi) : "transparent", borderRadius: 6 * S }}>{l}</span>
        ))}
      </div>
    </div>
  );
};
// 簡易方塊卡（icon＋名稱）
const NameCard: React.FC<{ icon: string; name: string; color: string; w?: number; sub?: string; lit?: number; disp?: boolean }> = ({ icon, name, color, w = 340, sub, lit = 1, disp }) => (
  <div style={{ width: w * S, padding: `${26 * S}px ${24 * S}px`, borderRadius: 24 * S, background: hexA(color, 0.04 + 0.06 * lit), border: `${1.5 * S}px solid ${hexA(color, 0.2 + 0.4 * lit)}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S, boxSizing: "border-box", opacity: 0.4 + 0.6 * lit }}>
    <LI name={icon} size={64 * S} color={color} sw={1.6} />
    {disp ? <Disp style={{ fontSize: 34 * S, color: C.text, whiteSpace: "nowrap" }}>{name}</Disp> : <span style={{ fontFamily: TC, fontSize: 32 * S, color: C.text, whiteSpace: "nowrap" }}>{name}</span>}
    {sub && <span style={{ fontFamily: TC, fontSize: 22 * S, color: C.muted, whiteSpace: "nowrap" }}>{sub}</span>}
  </div>
);
// 片中段落淡入淡出（同段內換畫面）
const Layer: React.FC<{ o: number; children: React.ReactNode }> = ({ o, children }) => (o <= 0 ? null : <div style={{ position: "absolute", inset: 0, opacity: o }}>{children}</div>);

// ═════════════════════════════════════════════════════════════════════════════
// HOOK — 片頭 90f 無聲：回扣 2-8 結尾，表單填好 → 重新整理 → 欄位全空
// ═════════════════════════════════════════════════════════════════════════════
const HookScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const t1 = useFadeUpHeader(4);
  const t2 = useFadeUpElastic(54);
  const card = useFadeUpElastic(2);
  const text = "明天 10 點 2 位";
  const typed = frame < 50 ? interpolate(frame, [8, 34], [0, Array.from(text).length], clamp) : 0;
  const spin = interpolate(frame, [38, 54], [0, 360], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const flash = frame >= 52 ? interpolate(frame, [52, 58, 80], [0, 1, 0.4], clamp) : 0;
  const shake = frame >= 54 && frame < 66 ? Math.sin((frame - 54) * 2.2) * 8 * S * (1 - (frame - 54) / 12) : 0;
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill>
        <BrandBg accent={C.gray} />
        <AbsoluteFill style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 180 * S, paddingTop: NAV_H, paddingBottom: 120 * S }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 30 * S, alignItems: "flex-start" }}>
            <div style={{ ...t1, fontFamily: TC, fontSize: 80 * S, color: C.text, fontWeight: 500 }}>填好的預約</div>
            <div style={{ ...t2, fontFamily: TC, fontSize: 80 * S, color: C.red, fontWeight: 500, transform: `${t2.transform} translateX(${shake}px)` }}>重新整理就不見了</div>
          </div>
          <div style={{ ...card, transform: `${card.transform} translateX(${shake}px)` }}>
            <BrowserMock w={760} url="booking.example.com" spin={spin}>
              <Field label="預約內容" text={text} shown={typed} flash={flash} />
              <Field label="聯絡電話" text="0912 000 000" shown={frame < 50 ? interpolate(frame, [20, 36], [0, 12], clamp) : 0} flash={flash} />
              <div style={{ height: 64 * S, borderRadius: 12 * S, background: hexA(C.gray, 0.2), display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted }}>送出</span></div>
            </BrowserMock>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 0.1 — 開場：全集地圖亮 2-9 → 兩種資料流進資料庫 → 搜尋不到一秒／訂單清單瞬間出現 → 背後的機制
//        → 「連這也要懂嗎」→ AI 推一座複雜架構 vs 一件簡單的事 → 基本概念要有 → 這支做完你會知道
// cues(local): 0 哈囉 | 25 上個單元 | 133 部署 | 241 認識資料庫 | 338 輸入資料 | 420 程式抓到資料 | 494 一個地方 | 535 儲存起來
//   613 Google搜尋 | 695 不到一秒 | 770 龐大的資料 | 816 找到結果 | 892 打開蝦皮 | 929 訂單清單 | 1063 背後都依賴 | 1127 儲存跟查詢的機制
//   1234 你可能會想 | 1282 蛤 | 1334 讓AI處理 | 1477 了解越多 | 1514 精準溝通 | 1598 不知道儲存架構 | 1710 AI選一個 | 1759 非常複雜
//   1805 根本不需要 | 1872 很簡單的事 | 1918 超級複雜 | 1979 建議 | 2012 基本概念 | 2064 AI的回答 | 2171 所以今天
//   2233 資料庫基本概念 | 2314 什麼情境什麼工具 | 2407 怎麼跟AI說清楚
// ═════════════════════════════════════════════════════════════════════════════
const Scene01Open: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const breathe = useBreathe(70);
  const pA = win(frame, 0, 613);
  const pB = win(frame, 613, 1234);
  const pC1 = win(frame, 1234, 1598);
  const pC2 = win(frame, 1598, 1979);
  const pC3 = win(frame, 1979, 2171);
  const pD = win(frame, 2171, dur + 20);
  const map = useFadeUp(0);
  const title = useFadeUpHeader(241);
  const query = "資料庫是什麼";
  const typed = interpolate(frame, [630, 680], [0, Array.from(query).length], clamp);
  const timer = interpolate(frame, [695, 705], [0, 0.3], clamp);
  const boxes = Math.round(interpolate(frame, [1759, 1918], [3, 18], clamp));
  const towerShake = frame >= 1918 && frame < 1936 ? Math.sin((frame - 1918) * 2) * 5 * S : 0;
  const dimB = frame >= 1063 ? 0.45 : 1;
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[0]}>
      {/* A 全集地圖 + 片名 + 資料流進資料庫 */}
      <Layer o={pA}>
        <At x={960} y={200}>
          <div style={{ ...map, display: "flex", alignItems: "center", gap: 12 * S }}>
            {Array.from({ length: 9 }).map((_, i) => {
              const n = `2-${i + 1}`;
              const now = i === 8, prev = i === 7;
              return (
                <React.Fragment key={n}>
                  {i > 0 && <div style={{ width: 22 * S, height: 2 * S, background: hexA(C.green, now ? 0.6 : 0.3) }} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 * S, padding: `${10 * S}px ${18 * S}px`, borderRadius: 14 * S, border: `${1.5 * S}px solid ${now ? C.green : C.border}`, background: now ? hexA(C.green, 0.12) : C.surface }}>
                    {!now && <LI name="check" size={22 * S} color={hexA(C.green, 0.7)} sw={2.6} />}
                    <span style={{ fontFamily: MONO, fontSize: 22 * S, color: now ? C.green : C.muted, whiteSpace: "nowrap" }}>{n}</span>
                    {prev && <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.muted, whiteSpace: "nowrap" }}>部署</span>}
                    {now && <span style={{ fontFamily: TC, fontSize: 26 * S, color: C.text, whiteSpace: "nowrap" }}>資料庫</span>}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </At>
        <At x={960} y={420}>
          <div style={{ ...title }}>
            <h1 style={{ fontFamily: TC, fontSize: 170 * S, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em", color: C.green, margin: 0, display: "inline-block", transform: `scale(${1 + 0.012 * breathe})` }}>資料庫</h1>
          </div>
        </At>
        <At x={560} y={670}><Pop at={338}><Chip text="使用者輸入的資料" icon="user" color={C.text} size={30 * S} /></Pop></At>
        <At x={560} y={790}><Pop at={420}><Chip text="程式抓到的資料" icon="code" color={C.text} size={30 * S} /></Pop></At>
        <Wire x1={770} y1={670} x2={1250} y2={730} at={535} color={C.green} march={frame > 560} />
        <Wire x1={740} y1={790} x2={1250} y2={740} at={545} color={C.green} march={frame > 570} />
        <At x={1360} y={735}><Pop at={494}><Node icon="database" label="儲存資料的地方" color={C.green} size={150 * S} /></Pop></At>
      </Layer>
      {/* B Google 搜尋 / 蝦皮訂單 → 背後的機制 */}
      <Layer o={pB}>
        <div style={{ opacity: dimB }}>
          <At x={560} y={250}>
            <Pop at={613}>
              <div style={{ width: 700 * S, height: 90 * S, borderRadius: 99, border: `${1.5 * S}px solid ${C.borderHi}`, background: C.surface, display: "flex", alignItems: "center", gap: 18 * S, padding: `0 ${30 * S}px`, boxSizing: "border-box" }}>
                <LI name="search" size={40 * S} color={C.muted} />
                <span style={{ fontFamily: TC, fontSize: 34 * S, color: C.text }}>{Array.from(query).slice(0, Math.floor(typed)).join("")}</span>
              </div>
            </Pop>
          </At>
          <At x={560} y={355}><Pop at={695}><div style={{ display: "flex", alignItems: "center", gap: 12 * S }}><LI name="clock" size={36 * S} color={C.green} /><span style={{ fontFamily: MONO, fontSize: 30 * S, color: C.green }}>{timer.toFixed(1)}s</span><span style={{ fontFamily: TC, fontSize: 28 * S, color: C.muted }}>不到一秒</span></div></Pop></At>
          <At x={560} y={540}>
            <Pop at={770}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 16 * S }}>
                {Array.from({ length: 48 }).map((_, i) => {
                  const hit = i === 29 && frame >= 816;
                  return <div key={i} style={{ width: 26 * S, height: 26 * S, borderRadius: 99, background: hit ? C.green : "rgba(255,255,255,0.14)", transform: `scale(${hit ? 1.4 : 1})` }} />;
                })}
              </div>
            </Pop>
          </At>
          <At x={560} y={420}><Pop at={770}><Txt size={24 * S} color={C.faint}>龐大的資料</Txt></Pop></At>
          <At x={560} y={700}><Pop at={816}><Chip text="找到相對應的結果" icon="check" color={C.green} size={28 * S} /></Pop></At>
          <At x={1360} y={470}>
            <Pop at={892}>
              <div style={{ width: 520 * S, borderRadius: 40 * S, border: `${4 * S}px solid #2a2a34`, background: "#0e0e14", padding: `${30 * S}px ${26 * S}px`, display: "flex", flexDirection: "column", gap: 18 * S, boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}><LI name="bag" size={36 * S} color={C.orange} /><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.text }}>我的訂單</span></div>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ opacity: frame >= 929 ? 1 : 0, display: "flex", alignItems: "center", gap: 16 * S, padding: 16 * S, borderRadius: 16 * S, background: "rgba(255,255,255,0.05)" }}>
                    <div style={{ width: 70 * S, height: 70 * S, borderRadius: 12 * S, background: hexA(C.orange, 0.2) }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 * S }}>
                      <div style={{ height: 16 * S, width: `${70 - i * 8}%`, borderRadius: 6 * S, background: "rgba(255,255,255,0.22)" }} />
                      <div style={{ height: 12 * S, width: "40%", borderRadius: 6 * S, background: "rgba(255,255,255,0.1)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </Pop>
          </At>
          <At x={1360} y={150}><Pop at={892}><Txt size={28 * S} color={C.muted}>打開蝦皮</Txt></Pop></At>
        </div>
        <Wire x1={560} y1={740} x2={900} y2={826} at={1063} color={C.green} />
        <Wire x1={1360} y1={760} x2={1020} y2={826} at={1063} color={C.green} />
        <At x={960} y={860}><Pop at={1127}><Chip text="快速儲存跟查詢資料的機制" icon="database" color={C.green} size={32 * S} solid /></Pop></At>
      </Layer>
      {/* C1 學生的疑問 → 了解越多 */}
      <Layer o={pC1}>
        <At x={1050} y={330}><Pop at={1282}><Bubble side="r" text="蛤？連這個我也要懂嗎？" /></Pop></At>
        <At x={1010} y={470}><Pop at={1334}><Bubble side="r" text="我不能讓 AI 處理就好了嗎？" /></Pop></At>
        <At x={960} y={700}>{frame >= 1477 && <Pop at={1477} kind="up"><Txt size={34 * S} color={C.muted}>你了解的越多</Txt></Pop>}</At>
        <At x={960} y={800}>{frame >= 1514 && <KeyLine at={1514} main="越能跟 AI 精準溝通" color={C.green} size={64 * S} />}</At>
      </Layer>
      {/* C2 AI 選了複雜方案 vs 一件簡單的事 */}
      <Layer o={pC2}>
        <At x={330} y={520}><Pop at={1598}><Node icon="robot" label="AI" color={C.gray} size={160 * S} /></Pop></At>
        <Wire x1={420} y1={500} x2={640} y2={500} at={1710} color={C.red} />
        <At x={860} y={560}>
          <div style={{ transform: `translateX(${towerShake}px)`, display: "flex", flexWrap: "wrap-reverse", width: 330 * S, gap: 10 * S, justifyContent: "center" }}>
            {Array.from({ length: boxes }).map((_, i) => (
              <div key={i} style={{ width: 96 * S, height: 50 * S, borderRadius: 8 * S, border: `${1.5 * S}px solid ${hexA(C.red, 0.6)}`, background: hexA(C.red, 0.08), opacity: frame >= 1710 ? 1 : 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LI name={["server", "database", "gear", "cloud", "plug", "lock", "shield", "code"][i % 8]} size={28 * S} color={hexA(C.red, 0.75)} sw={1.8} />
              </div>
            ))}
          </div>
        </At>
        <At x={860} y={250}>{frame >= 1759 && <Pop at={1759}><Txt size={34 * S} color={C.red}>非常複雜的方案</Txt></Pop>}</At>
        <At x={860} y={830}>{frame >= 1805 && <Pop at={1805}><Chip text="其實你根本不需要" icon="cross" color={C.red} size={28 * S} /></Pop>}</At>
        <At x={1500} y={520}>{frame >= 1872 && <Pop at={1872}><Node icon="check" label="一件很簡單的事" color={C.yellow} size={150 * S} /></Pop>}</At>
        {frame >= 1918 && <Wire x1={1410} y1={500} x2={1060} y2={500} at={1918} color={C.red} curve={80} />}
        <At x={1240} y={390}>{frame >= 1918 && <Pop at={1918}><Txt size={30 * S} color={C.red}>被搞得超級複雜</Txt></Pop>}</At>
      </Layer>
      {/* C3 基本概念要有 */}
      <Layer o={pC3}>
        <At x={960} y={480}>{frame >= 2012 && <KeyLine at={2012} main="基本的概念還是要有" color={C.green} size={76 * S} />}</At>
        <At x={960} y={650}>{frame >= 2064 && <Pop at={2064} kind="up"><Txt size={36 * S} color={C.muted}>才能針對 AI 的回答做基礎判斷</Txt></Pop>}</At>
      </Layer>
      {/* D 這支做完你會知道 */}
      <Stage opacity={pD} style={{ gap: 30 * S }}>
        <Pop at={2194} kind="up"><div style={{ fontFamily: MONO, fontSize: 24 * S, color: C.green, letterSpacing: "0.16em", marginBottom: 20 * S }}>這支做完你會知道</div></Pop>
        {[{ t: "資料庫的基本概念", at: 2233, i: "database" }, { t: "什麼情境要用什麼儲存工具", at: 2314, i: "layers" }, { t: "怎麼跟 AI 說清楚你的需求", at: 2407, i: "robot" }].map((r, i) => (
          <Pop key={r.t} at={r.at} kind="item">
            <div style={{ display: "flex", alignItems: "center", gap: 26 * S, width: 1100 * S, padding: `${22 * S}px ${34 * S}px`, borderRadius: 20 * S, background: C.surface, border: `${1.5 * S}px solid ${hexA(C.green, 0.25)}` }}>
              <span style={{ fontFamily: MONO, fontSize: 26 * S, color: C.green }}>0{i + 1}</span>
              <LI name={r.i} size={44 * S} color={C.green} />
              <span style={{ fontFamily: TC, fontSize: 40 * S, color: C.text }}>{r.t}</span>
            </div>
          </Pop>
        ))}
      </Stage>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 1.1 — 記憶體 vs 持久化層：左（灰）打字 → 關分頁 → 字蒸發；右（綠）訂單／帳號／聊天紀錄掉進持久化層，伺服器重啟資料還在
// cues: 100 程式關掉 | 207 想像網站 | 261 打了資料 | 299 不小心關掉 | 392 重新打開 | 461 不見了 | 560 沒有特定儲存
//   622 暫時存在記憶體 | 706 關掉頁面 | 745 被清掉 | 820 訂單帳號聊天紀錄 | 942 持久化層 | 1126 伺服器重新啟動 | 1273 資料庫最核心
// ═════════════════════════════════════════════════════════════════════════════
const Scene11Memory: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const text = "明天 10 點 2 位";
  const len = Array.from(text).length;
  const typed = frame < 392 ? interpolate(frame, [261, 296], [0, len], clamp) : 0;
  const closed = frame >= 299 && frame < 392;
  const bw = closed ? interpolate(frame, [299, 314], [1, 0.25], clamp) : interpolate(frame, [392, 404], [0.25, 1], clamp);
  const leftLit = interpolate(frame, [806, 830], [1, 0.4], clamp);
  const rightLit = interpolate(frame, [806, 830], [0.35, 1], clamp);
  const evap = interpolate(frame, [706, 760], [0, 1], clamp);
  const restart = frame >= 1126 ? interpolate(frame, [1126, 1170], [0, 360], clamp) : 0;
  const pulse = frame >= 1170 && frame < 1260 ? 0.5 + 0.5 * Math.sin((frame - 1170) / 6) : 0;
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[1]}>
      <SectionHeader num="01" title="資料去哪了" accent={C.green} />
      {/* 左：記憶體（灰） */}
      <div style={{ position: "absolute", inset: 0, opacity: leftLit }}>
        <At x={500} y={240}><Pop at={207} kind="up"><Txt size={26 * S} color={C.muted}>沒有特定儲存的時候</Txt></Pop></At>
        <At x={500} y={450}>
          <Pop at={207}>
            <div style={{ opacity: bw, transform: `scale(${0.92 + 0.08 * bw})`, position: "relative" }}>
              <BrowserMock w={620} url="booking.example.com">
                <Field label="預約內容" text={text} shown={typed} flash={frame >= 461 && frame < 520 ? 0.8 : 0} />
              </BrowserMock>
              {closed && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><LI name="cross" size={140 * S} color={C.gray} sw={1.4} /></div>}
            </div>
          </Pop>
        </At>
        <At x={500} y={760}>
          <Pop at={560}>
            <div style={{ width: 620 * S, height: 150 * S, borderRadius: 22 * S, border: `${2 * S}px dashed ${hexA(C.gray, 0.6)}`, display: "flex", alignItems: "center", gap: 24 * S, padding: `0 ${30 * S}px`, boxSizing: "border-box", position: "relative" }}>
              <LI name="memory" size={64 * S} color={C.gray} />
              <span style={{ fontFamily: TC, fontSize: 34 * S, color: C.gray }}>記憶體</span>
              {frame >= 622 && (
                <div style={{ marginLeft: "auto", opacity: 1 - evap, transform: `translateY(${-evap * 60 * S}px) scale(${1 - 0.3 * evap})`, filter: `blur(${evap * 6}px)` }}>
                  <Pop at={622}><Chip text={text} color={C.gray} size={26 * S} /></Pop>
                </div>
              )}
              {frame >= 745 && <span style={{ position: "absolute", right: 30 * S, fontFamily: TC, fontSize: 26 * S, color: C.faint, opacity: interpolate(frame, [745, 760], [0, 1], clamp) }}>被清掉了</span>}
            </div>
          </Pop>
        </At>
      </div>
      {/* 中線 */}
      <div style={{ position: "absolute", left: 960 * S, top: 220 * S, width: 1.5 * S, height: 660 * S, background: C.border }} />
      {/* 右：持久化層（綠） */}
      <div style={{ position: "absolute", inset: 0, opacity: rightLit }}>
        {[{ t: "訂單", i: "receipt", x: 1220 }, { t: "帳號", i: "user", x: 1405 }, { t: "聊天紀錄", i: "msg", x: 1610 }].map((d, k) => (
          <Mover key={d.t} at={820 + k * 10} a={850 + k * 10} b={900 + k * 10} x1={d.x} y1={250} x2={d.x} y2={520}>
            <div style={{ transform: `scale(${1 + 0.06 * pulse})` }}><Chip text={d.t} icon={d.i} color={C.green} size={26 * S} /></div>
          </Mover>
        ))}
        <At x={1420} y={530}>
          <Pop at={820}>
            <div style={{ width: 720 * S, height: 150 * S, borderRadius: 24 * S, background: hexA(C.green, frame >= 942 ? 0.08 : 0.03), border: `${2 * S}px solid ${hexA(C.green, frame >= 942 ? 0.6 : 0.25)}`, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 8 * S, boxSizing: "border-box" }}>
              {frame >= 942 && <span style={{ fontFamily: TC, fontSize: 22 * S, color: C.green, opacity: interpolate(frame, [942, 960], [0, 1], clamp) }}>持久化層</span>}
            </div>
          </Pop>
        </At>
        <At x={1420} y={300} o={frame >= 1273 ? interpolate(frame, [1273, 1285], [1, 0], clamp) : 1}>
          {frame >= 1126 && <Pop at={1126}><div style={{ display: "flex", alignItems: "center", gap: 14 * S }}><div style={{ transform: `rotate(${restart}deg)` }}><LI name="refresh" size={44 * S} color={C.text} /></div><Txt size={28 * S}>程式關掉 伺服器重新啟動</Txt></div></Pop>}
        </At>
        <At x={1420} y={300}>{frame >= 1273 && <Pop at={1273}><Chip text="資料庫是最核心的角色" icon="database" color={C.green} size={30 * S} solid /></Pop>}</At>
        <At x={1420} y={650} anchor="t">{frame >= 942 && <TermCard at={942} term="持久化層" en="Persistence Layer" def="可以長期儲存資料的地方" color={C.green} />}</At>
      </div>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 1.2 — 圖書館索書號 → 主鍵＋索引：書架一本本翻（慢、計時）vs 索書號直接跳到那格；換成資料列，主鍵欄亮、索引箭頭直接跳
// cues: 106 圖書館 | 235 找一本書 | 284 一本一本翻 | 350 索書號 | 436 直接到位置 | 520 資料庫裡面 | 557 唯一識別欄位
//   724 主鍵 | 778 Primary Key | 812 索引 | 886 直接跳到位置 | 1032 不需要從頭掃描 | 1126 有索引 | 1184 資料很多 | 1226 很快
// ═════════════════════════════════════════════════════════════════════════════
const Scene12Index: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 520);
  const pB = win(frame, 520, dur + 20);
  const N = 16, TARGET = 11, BX0 = 420, BW = 62, BG = 6;
  const bx = (i: number) => BX0 + i * (BW + BG) + BW / 2;
  const scanIdx = frame >= 284 && frame < 436 ? Math.floor(interpolate(frame, [284, 436], [0, 7.99], clamp)) : -1;
  const found = frame >= 436;
  const secs = frame < 284 ? 0 : (Math.min(frame, 436) - 284) / 30;
  const rows = ["001", "002", "003", "004", "005", "006", "007", "008"];
  const TX = 700, TY = 230, IDW = 200, NW = 380;
  const rowY = (r: number) => TY + ROW_H + ROW_H * r + ROW_H / 2;
  const scanY = frame >= 1032 && frame < 1110 ? interpolate(frame, [1032, 1100], [0, 7], clamp) : -1;
  const termK = frame >= 812 ? 1 : 0;
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[2]}>
      <SectionHeader num="01" title="資料庫怎麼找資料" accent={C.green} />
      <Layer o={pA}>
        <At x={960} y={220}><Pop at={106} kind="up"><Txt size={30 * S} color={C.muted}>比喻｜圖書館</Txt></Pop></At>
        {Array.from({ length: N }).map((_, i) => {
          const h = 210 + ((i * 37) % 60);
          const isScan = i === scanIdx;
          const isT = i === TARGET && found;
          return (
            <div key={i} style={{ position: "absolute", left: (bx(i) - BW / 2) * S, top: (560 - h) * S, width: BW * S, height: h * S, borderRadius: 8 * S, border: `${1.5 * S}px solid ${isT ? C.green : isScan ? C.text : C.borderHi}`, background: isT ? hexA(C.green, 0.25) : isScan ? "rgba(255,255,255,0.12)" : C.surface, opacity: interpolate(frame, [106 + i * 2, 120 + i * 2], [0, 1], clamp), transform: `translateY(${isScan ? -10 * S : isT ? -18 * S : 0}px)` }} />
          );
        })}
        <div style={{ position: "absolute", left: (BX0 - 20) * S, top: 564 * S, width: (N * (BW + BG) + 34) * S, height: 6 * S, borderRadius: 99, background: C.borderHi, opacity: interpolate(frame, [106, 120], [0, 1], clamp) }} />
        <At x={600} y={730}>
          {frame >= 284 && <Pop at={284}><div style={{ display: "flex", alignItems: "center", gap: 18 * S, padding: `${18 * S}px ${28 * S}px`, borderRadius: 20 * S, border: `${1.5 * S}px solid ${C.borderHi}`, background: C.surface, opacity: found ? 0.45 : 1 }}><LI name="clock" size={44 * S} color={C.gray} /><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.text }}>一本一本翻</span><span style={{ fontFamily: MONO, fontSize: 30 * S, color: C.red }}>{secs.toFixed(1)}s</span></div></Pop>}
        </At>
        <At x={1300} y={730}>
          {frame >= 350 && <Pop at={350}><div style={{ display: "flex", alignItems: "center", gap: 18 * S, padding: `${18 * S}px ${28 * S}px`, borderRadius: 20 * S, border: `${1.5 * S}px solid ${hexA(C.green, 0.5)}`, background: hexA(C.green, 0.06) }}><LI name="tag" size={44 * S} color={C.green} /><span style={{ fontFamily: TC, fontSize: 30 * S, color: C.text }}>索書號</span><span style={{ fontFamily: MONO, fontSize: 34 * S, color: C.green }}>B-12</span></div></Pop>}
        </At>
        {found && <Wire x1={1300} y1={688} x2={bx(TARGET)} y2={580} at={436} color={C.green} dur={12} curve={30} />}
        <At x={1300} y={850}>{found && <Pop at={436}><Txt size={30 * S} color={C.green}>直接到相對應的位置</Txt></Pop>}</At>
      </Layer>
      <Layer o={pB}>
        {/* 索引 */}
        <At x={430} y={TY} anchor="t">
          {frame >= 812 && (
            <Pop at={812}>
              <div style={{ width: 220 * S, borderRadius: 16 * S, border: `${1.5 * S}px solid ${hexA(C.text, 0.4)}`, background: C.surface, overflow: "hidden" }}>
                <div style={{ height: ROW_H * S, display: "flex", alignItems: "center", justifyContent: "center", background: hexA(C.text, 0.08) }}><span style={{ fontFamily: TC, fontSize: 28 * S, color: C.text }}>索引</span></div>
                {rows.map((r, i) => <div key={r} style={{ height: ROW_H * S, display: "flex", alignItems: "center", justifyContent: "center", borderTop: `1px solid ${C.border}`, background: i === 5 && frame >= 886 ? hexA(C.text, 0.16) : "transparent" }}><span style={{ fontFamily: MONO, fontSize: 24 * S, color: i === 5 && frame >= 886 ? C.text : C.muted }}>{r}</span></div>)}
              </div>
            </Pop>
          )}
        </At>
        <At x={TX} y={TY} anchor="tl">
          <Pop at={520}>
            <Table cols={["ID", "資料"]} widths={[IDW, NW]} color={C.green} rows={rows.map((r, i) => [r, `第 ${i + 1} 筆資料`])} rowAt={(r) => 557 + r * 4}
              lit={(r, c) => {
                if (r === 5 && frame >= 886) return 1;
                if (scanY >= 0 && Math.floor(scanY) === r) return 0.6;
                if (c === 0 && frame >= 724 && frame < 812) return 0.8;
                return 0;
              }} />
          </Pop>
        </At>
        {frame >= 886 && <Wire x1={540} y1={rowY(5)} x2={TX - 4} y2={rowY(5)} at={886} color={C.text} dur={10} />}
        <At x={1550} y={260} anchor="t" o={frame >= 812 ? interpolate(frame, [812, 824], [1, 0], clamp) : 1}>{frame >= 724 && <TermCard at={724} term="主鍵" en="Primary Key" def="每一筆資料唯一的識別欄位" color={C.green} />}</At>
        <At x={1550} y={260} anchor="t">{termK > 0 && <TermCard at={812} term="索引" def="讓查詢直接跳到對應的位置" color={C.text} />}</At>
        <At x={1550} y={620}>{frame >= 1032 && <Pop at={1032}><Chip text="不用從頭到尾掃描" icon="cross" color={C.gray} size={28 * S} /></Pop>}</At>
        <At x={1550} y={720}>{frame >= 1184 && <Pop at={1184}><Txt size={28 * S} color={C.muted}>就算資料很多</Txt></Pop>}</At>
        <At x={1550} y={810}>{frame >= 1226 && <Pop at={1226}><Chip text="查詢一樣很快" icon="check" color={C.green} size={30 * S} solid /></Pop>}</At>
      </Layer>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 1.3 — 資料表＝試算表分頁：欄標題逐一亮、一整列掃亮；換電商兩張表「商品」「訂單」並排，購買內容對回商品
// cues: 180 資料表 | 278 Table | 306 Excel | 371 Google Sheets分頁 | 432 有欄有列 | 482 每一欄型別 | 565 姓名生日
//   635 每一列一筆 | 719 舉例 | 757 電商網站 | 818 商品表格 | 888 名稱 | 943 價格庫存 | 1007 訂單表格 | 1102 購買資訊
//   1171 互相對應 | 1260 標記買哪個商品 | 1362 串在一起 | 1434 資料庫想像成 | 1514 表格整理 | 1589 互相連結
// ═════════════════════════════════════════════════════════════════════════════
const Scene13Table: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 719);
  const pB = win(frame, 719, 1434);
  const pC = win(frame, 1434, dur + 20);
  const SX = 300, SY = 250;
  const prodRows = [["帆布袋", "390", "12"], ["馬克杯", "280", "30"], ["筆記本", "150", "48"]];
  const ordRows = [["A001", "帆布袋"], ["A002", "筆記本"], ["A003", "帆布袋"]];
  const PX = 220, OX = 1080, TY = 330;
  const prodMap = [0, 2, 0];
  const ry = (r: number) => TY + ROW_H + ROW_H * r + ROW_H / 2;
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[3]}>
      <SectionHeader num="01" title="資料表" accent={C.green} />
      <Layer o={pA}>
        <At x={SX} y={SY} anchor="tl">
          <Pop at={180}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 * S }}>
              <Table cols={["#", "姓名", "生日"]} widths={[110, 340, 360]} color={C.green}
                rows={[["1", "小明", "1995/03/02"], ["2", "小華", "1998/11/20"], ["3", "阿美", "2001/07/15"], ["4", "小美", "1996/05/08"]]}
                colAt={(c) => (c === 0 ? 180 : c === 1 ? 565 : 590)}
                lit={(r, c) => {
                  if (r === -1 && c === 1 && frame >= 565 && frame < 635) return 1;
                  if (r === -1 && c === 2 && frame >= 590 && frame < 635) return 1;
                  if (r >= 0 && c > 0 && frame >= 482 && frame < 635 && ((c === 1 && frame >= 565) || (c === 2 && frame >= 590))) return 0.45;
                  if (r === 1 && frame >= 635) return interpolate(frame, [635, 650], [0, 1], clamp);
                  return 0;
                }} />
              <div style={{ display: "flex", gap: 8 * S }}>
                <div style={{ padding: `${8 * S}px ${22 * S}px`, borderRadius: `0 0 ${10 * S}px ${10 * S}px`, background: frame >= 371 ? hexA(C.green, 0.18) : C.surface2, border: `1px solid ${frame >= 371 ? hexA(C.green, 0.6) : C.border}` }}><span style={{ fontFamily: TC, fontSize: 22 * S, color: frame >= 371 ? C.green : C.muted }}>會員</span></div>
                <div style={{ padding: `${8 * S}px ${22 * S}px`, borderRadius: `0 0 ${10 * S}px ${10 * S}px`, background: C.surface2, border: `1px solid ${C.border}` }}><span style={{ fontFamily: TC, fontSize: 22 * S, color: C.faint }}>工作表2</span></div>
              </div>
            </div>
          </Pop>
        </At>
        <At x={700} y={720}>{frame >= 371 && <Pop at={371}><Chip text="像試算表的一個分頁" icon="table" color={C.yellow} size={26 * S} /></Pop>}</At>
        <At x={1500} y={250} anchor="t">{frame >= 180 && <TermCard at={180} term="資料表" en="Table" def="資料庫最基本的單位" color={C.green} />}</At>
        <At x={1400} y={620}>{frame >= 482 && <Pop at={482}><div style={{ display: "flex", alignItems: "baseline", gap: 18 * S }}><Txt size={44 * S} color={C.green}>欄</Txt><Txt size={30 * S} color={C.muted}>一種資料的型別</Txt></div></Pop>}</At>
        <At x={1400} y={740}>{frame >= 635 && <Pop at={635}><div style={{ display: "flex", alignItems: "baseline", gap: 18 * S }}><Txt size={44 * S} color={C.green}>列</Txt><Txt size={30 * S} color={C.muted}>一筆完整的資料</Txt></div></Pop>}</At>
      </Layer>
      <Layer o={pB}>
        <At x={PX} y={TY - 60} anchor="tl"><Pop at={818} kind="up"><div style={{ display: "flex", alignItems: "center", gap: 12 * S }}><LI name="tag" size={34 * S} color={C.green} /><Txt size={32 * S}>商品</Txt></div></Pop></At>
        <At x={PX} y={TY} anchor="tl">
          <Pop at={818}>
            <Table cols={["名稱", "價格", "庫存"]} widths={[260, 180, 170]} color={C.green} rows={prodRows} colAt={(c) => (c === 0 ? 888 : 943)}
              lit={(r, c) => (frame >= 1260 && c === 0 && r >= 0 && prodMap.slice(0, frame >= 1362 ? 3 : 1).includes(r) ? 1 : 0)} />
          </Pop>
        </At>
        <At x={OX} y={TY - 60} anchor="tl">{frame >= 1007 && <Pop at={1007} kind="up"><div style={{ display: "flex", alignItems: "center", gap: 12 * S }}><LI name="receipt" size={34 * S} color={C.green} /><Txt size={32 * S}>訂單</Txt></div></Pop>}</At>
        <At x={OX} y={TY} anchor="tl">
          {frame >= 1007 && (
            <Pop at={1007}>
              <Table cols={["訂單編號", "購買的商品"]} widths={[260, 320]} color={C.green} rows={ordRows} rowAt={(r) => 1102 + r * 6}
                lit={(r, c) => (frame >= 1260 && c === 1 && r >= 0 && (r === 0 || frame >= 1362) ? 1 : 0)} />
            </Pop>
          )}
        </At>
        {frame >= 1260 && ordRows.map((_, r) => (r === 0 || frame >= 1362 ? <Wire key={r} x1={OX} y1={ry(r)} x2={PX + 610} y2={ry(prodMap[r])} at={r === 0 ? 1260 : 1362 + r * 6} color={C.green} march={frame > 1380} /> : null))}
        <At x={960} y={700}>{frame >= 1171 && <Pop at={1171}><Txt size={32 * S} color={C.muted}>兩張表格可以互相對應</Txt></Pop>}</At>
        <At x={960} y={800}>{frame >= 1362 && <Pop at={1362}><Chip text="系統把資料串在一起" icon="link" color={C.green} size={30 * S} /></Pop>}</At>
      </Layer>
      <Layer o={pC}>
        <At x={960} y={420}>{frame >= 1514 && <KeyLine at={1514} lead="資料庫可以想像成" main="用表格把資料整理好" color={C.green} size={76 * S} />}</At>
        <At x={960} y={650}>
          {frame >= 1589 && (
            <Pop at={1589}>
              <div style={{ display: "flex", alignItems: "center", gap: 30 * S }}>
                <LI name="table" size={70 * S} color={C.green} />
                <svg width={160 * S} height={20 * S} viewBox="0 0 160 20"><path d="M4 10 H156" stroke={C.green} strokeWidth={3} strokeDasharray="8 8" strokeDashoffset={-frame * 0.8} /></svg>
                <LI name="table" size={70 * S} color={C.green} />
              </div>
            </Pop>
          )}
        </At>
        <At x={960} y={780}>{frame >= 1589 && <Pop at={1595} kind="up"><Txt size={36 * S} color={C.text}>不同的資料之間可以互相連結</Txt></Pop>}</At>
      </Layer>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 1.4 — 外鍵：商品表（左上）／訂單表（右下），訂單的商品 ID 拉線對到商品那一列，兩格同時亮；名詞卡 外鍵 → 關聯式資料庫；收在問題「一定要用資料庫嗎」
// cues: 103 一個欄位連結 | 177 外鍵 | 243 Foreign Key | 305 電商網站 | 342 商品專屬ID | 479 訂單也紀錄商品ID | 547 系統就知道
//   600 買了哪個商品 | 710 串在一起 | 789 關聯式資料庫 | 881 最常見 | 951 想像成 | 1031 結構化 | 1100 快速查詢管理 | 1251 好複雜 | 1322 一定要用嗎
// ═════════════════════════════════════════════════════════════════════════════
const Scene14Fk: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 951);
  const pB = win(frame, 951, 1202);
  const pC = win(frame, 1202, dur + 20);
  const PX = 260, PY = 260, OX = 1000, OY = 540;
  const prod = [["帆布袋", "P01"], ["馬克杯", "P02"], ["筆記本", "P03"]];
  const ord = [["P01", "A001"], ["P03", "A002"], ["P01", "A003"]];
  const map = [0, 2, 0];
  const pry = (r: number) => PY + ROW_H + ROW_H * r + ROW_H / 2;
  const ory = (r: number) => OY + ROW_H + ROW_H * r + ROW_H / 2;
  const linked = (r: number) => (r === 0 ? frame >= 547 : frame >= 710);
  const termO1 = frame >= 789 ? interpolate(frame, [789, 801], [1, 0], clamp) : 1;
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[4]}>
      <SectionHeader num="01" title="外鍵" accent={C.green} />
      <Layer o={pA}>
        <At x={PX} y={PY - 56} anchor="tl"><Pop at={305} kind="up"><div style={{ display: "flex", alignItems: "center", gap: 12 * S }}><LI name="tag" size={34 * S} color={C.green} /><Txt size={30 * S}>商品</Txt></div></Pop></At>
        <At x={PX} y={PY} anchor="tl">
          <Pop at={305}>
            <Table cols={["名稱", "商品 ID"]} widths={[300, 240]} color={C.green} rows={prod}
              lit={(r, c) => {
                if (c === 1 && r === -1 && frame >= 342) return 1;
                if (c === 1 && r >= 0 && frame >= 342 && frame < 479) return 0.5;
                if (r >= 0 && c === 1 && map.some((m, k) => m === r && linked(k)) && frame >= 600) return 1;
                return 0;
              }} />
          </Pop>
        </At>
        <At x={OX} y={OY - 56} anchor="tl"><Pop at={424} kind="up"><div style={{ display: "flex", alignItems: "center", gap: 12 * S }}><LI name="receipt" size={34 * S} color={C.green} /><Txt size={30 * S}>訂單</Txt></div></Pop></At>
        <At x={OX} y={OY} anchor="tl">
          <Pop at={424}>
            <Table cols={["商品 ID", "訂單編號"]} widths={[240, 280]} color={C.green} rows={ord}
              lit={(r, c) => {
                if (c === 0 && r === -1 && frame >= 479) return 1;
                if (c === 0 && r >= 0 && frame >= 479 && frame < 547) return 0.5;
                if (c === 0 && r >= 0 && linked(r) && frame >= 600) return 1;
                return 0;
              }} />
          </Pop>
        </At>
        {ord.map((_, r) => (linked(r) ? <Wire key={r} x1={OX} y1={ory(r)} x2={PX + 540} y2={pry(map[r])} at={r === 0 ? 547 : 710 + r * 8} color={C.green} march={frame > (r === 0 ? 600 : 740)} curve={-20} /> : null))}
        <At x={PX} y={600} anchor="tl" o={termO1}>{frame >= 177 && <TermCard at={177} term="外鍵" en="Foreign Key" def="用一個欄位把兩張表連起來" color={C.green} />}</At>
        <At x={PX} y={600} anchor="tl">{frame >= 789 && <TermCard at={789} term="關聯式資料庫" def="把不同的資料表串在一起" color={C.green} />}</At>
        <At x={1380} y={300}>{frame >= 881 && <Pop at={881}><Chip text="目前最常見的做法" icon="check" color={C.green} size={28 * S} solid /></Pop>}</At>
      </Layer>
      <Layer o={pB}>
        <At x={960} y={460}><Pop at={951} kind="up"><Txt size={36 * S} color={C.muted}>資料庫是一個這樣的系統</Txt></Pop></At>
        <At x={960} y={690}>
          <div style={{ display: "flex", gap: 40 * S }}>
            <Pop at={1031}><NameCard icon="grid" name="結構化儲存" color={C.green} w={420} /></Pop>
            <Pop at={1100}><NameCard icon="search" name="快速查詢" color={C.green} w={420} /></Pop>
            <Pop at={1120}><NameCard icon="gear" name="管理資料" color={C.green} w={420} /></Pop>
          </div>
        </At>
      </Layer>
      <Layer o={pC}>
        <At x={960} y={380}>{frame >= 1251 && <Pop at={1251} kind="up"><Txt size={36 * S} color={C.muted}>聽到這裡已經覺得好複雜</Txt></Pop>}</At>
        <At x={960} y={560}>
          {frame >= 1322 && (
            <Pop at={1322}>
              <div style={{ display: "flex", alignItems: "center", gap: 30 * S }}>
                <LI name="question" size={110 * S} color={C.yellow} sw={1.5} />
                <span style={{ fontFamily: TC, fontSize: 88 * S, color: C.yellow, fontWeight: 500 }}>我一定要用資料庫嗎</span>
              </div>
            </Pop>
          )}
        </At>
      </Layer>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 2.1 — 能不用先不用：一週月曆被「設定環境」「調參數」填滿、功能停在 0 行 → 快速看到結果 → 三個輕量方案 → 試算表勾出資料庫能力
// cues: 61 能不用先不用 | 200 很多工程師 | 277 新的專案 | 338 搭資料庫 | 392 設定環境調參數 | 453 一個禮拜 | 507 基礎建置
//   545 一行都沒寫 | 607 驗證想法初期 | 683 不是架構完整 | 768 快速看到結果 | 821 進行測試 | 935 輕量的方案 | 1035 Google試算表
//   1094 Notion Airtable | 1196 試算表也算嗎 | 1262 也算 | 1299 有欄有列 | 1381 篩選排序 | 1448 跟程式串接 | 1563 基本功能
//   1611 Airtable和Notion | 1683 表格之間的關聯 | 1762 更接近真正的資料庫
// ═════════════════════════════════════════════════════════════════════════════
const Scene21Light: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 607);
  const pB = win(frame, 607, 1162);
  const pC = win(frame, 1162, 1611);
  const pD = win(frame, 1611, dur + 20);
  const days = ["一", "二", "三", "四", "五", "六", "日"];
  const fillAt = (i: number) => (i < 4 ? 392 + i * 12 : 453 + (i - 4) * 12);
  const strike = interpolate(frame, [768, 786], [0, 1], clamp);
  return (
    <Shell callouts={callouts} dur={dur} accent={C.yellow} pct={PROGRESS_PCT[5]}>
      <SectionHeader num="02" title="能不用就先不用" accent={C.yellow} />
      <Layer o={pA}>
        <At x={960} y={290}>{frame >= 61 && <KeyLine at={61} lead="我個人的建議" main="能不用 先不用" color={C.yellow} size={72 * S} />}</At>
        <At x={420} y={430}>{frame >= 200 && <Pop at={200}><Chip text="很多工程師" icon="users" color={C.gray} size={26 * S} /></Pop>}</At>
        <At x={960} y={590}>
          {frame >= 338 && (
            <Pop at={338}>
              <div style={{ display: "flex", gap: 12 * S }}>
                {days.map((d, i) => (
                  <div key={d} style={{ width: 160 * S, height: 190 * S, borderRadius: 16 * S, border: `${1.5 * S}px solid ${C.borderHi}`, background: C.surface, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S, paddingTop: 14 * S, boxSizing: "border-box" }}>
                    <span style={{ fontFamily: TC, fontSize: 24 * S, color: C.muted }}>{d}</span>
                    {frame >= fillAt(i) && <Pop at={fillAt(i)}><div style={{ padding: `${10 * S}px ${10 * S}px`, borderRadius: 10 * S, background: hexA(C.red, 0.12), border: `1px solid ${hexA(C.red, 0.4)}` }}><span style={{ fontFamily: TC, fontSize: 22 * S, color: C.text, whiteSpace: "nowrap" }}>{i % 2 === 0 ? "設定環境" : "調參數"}</span></div></Pop>}
                  </div>
                ))}
              </div>
            </Pop>
          )}
        </At>
        <At x={1500} y={430}>{frame >= 453 && <Pop at={453}><Txt size={30 * S} color={C.red}>花了一個禮拜</Txt></Pop>}</At>
        <At x={960} y={820}>
          {frame >= 507 && (
            <Pop at={507}>
              <div style={{ display: "flex", alignItems: "center", gap: 24 * S }}>
                <Txt size={30 * S} color={C.muted}>功能</Txt>
                <div style={{ width: 800 * S, height: 22 * S, borderRadius: 99, background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}` }} />
                {frame >= 545 && <Pop at={545}><span style={{ fontFamily: MONO, fontSize: 34 * S, color: C.red, whiteSpace: "nowrap" }}>0 行</span></Pop>}
              </div>
            </Pop>
          )}
        </At>
      </Layer>
      <Layer o={pB}>
        <At x={960} y={250}><Pop at={607} kind="up"><Txt size={30 * S} color={C.muted}>驗證想法的初期</Txt></Pop></At>
        <At x={960} y={370}>
          <div style={{ display: "flex", alignItems: "center", gap: 34 * S }}>
            <Pop at={683}>
              <span style={{ position: "relative", fontFamily: TC, fontSize: 40 * S, color: C.faint }}>
                架構做得多完整
                <span style={{ position: "absolute", left: 0, top: "52%", height: 3 * S, width: `${strike * 100}%`, background: C.red }} />
              </span>
            </Pop>
            {frame >= 768 && <Pop at={768}><LI name="check" size={50 * S} color={C.yellow} sw={2.4} /></Pop>}
            {frame >= 768 && <Pop at={768}><Txt size={52 * S} color={C.yellow}>快速看到結果</Txt></Pop>}
            {frame >= 821 && <Pop at={821}><Txt size={34 * S} color={C.muted}>然後去測試</Txt></Pop>}
          </div>
        </At>
        <At x={960} y={510}>{frame >= 935 && <Pop at={935} kind="up"><Txt size={32 * S} color={C.text}>先從輕量的方案開始</Txt></Pop>}</At>
        <At x={960} y={710}>
          <div style={{ display: "flex", gap: 50 * S }}>
            <Pop at={1035}><NameCard icon="table" name="Google 試算表" color={C.yellow} w={400} /></Pop>
            <Pop at={1094}><NameCard icon="book" name="Notion" color={C.yellow} w={400} disp /></Pop>
            <Pop at={1110}><NameCard icon="grid" name="Airtable" color={C.yellow} w={400} disp /></Pop>
          </div>
        </At>
      </Layer>
      <Layer o={pC}>
        <At x={960} y={270}>{frame >= 1196 && <Pop at={1196} kind="up"><div style={{ display: "flex", alignItems: "baseline", gap: 30 * S }}><Txt size={36 * S} color={C.muted}>試算表也算資料庫嗎</Txt>{frame >= 1262 && <Pop at={1262}><Txt size={60 * S} color={C.yellow}>其實也算</Txt></Pop>}</div></Pop>}</At>
        <At x={620} y={590}>
          <Pop at={1162}>
            <Table cols={["名稱", "數量", "日期"]} widths={[220, 160, 220]} color={C.yellow}
              rows={[["帆布袋", "12", "11/02"], ["馬克杯", "30", "11/05"], ["筆記本", "48", "11/09"], ["便條紙", "6", "11/12"]]}
              lit={(r, c) => (frame >= 1299 && frame < 1381 ? (r === -1 ? 1 : c === 0 ? 0.4 : 0) : frame >= 1381 && frame < 1448 && c === 1 ? 0.5 : 0)} />
          </Pop>
        </At>
        <At x={1080} y={380} anchor="tl">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 * S, width: 620 * S }}>
            {frame >= 1299 && <ProRow at={1299} ok text="有欄也有列" color={C.yellow} />}
            {frame >= 1381 && <ProRow at={1381} ok text="支援篩選 · 排序" color={C.yellow} />}
            {frame >= 1448 && <ProRow at={1448} ok text="可以跟程式串接" color={C.yellow} />}
          </div>
        </At>
        <At x={960} y={860}>{frame >= 1563 && <Pop at={1563}><Chip text="已經具備資料庫的基本功能" icon="database" color={C.green} size={30 * S} /></Pop>}</At>
      </Layer>
      <Layer o={pD}>
        <At x={960} y={280}><Pop at={1611} kind="up"><div style={{ display: "flex", gap: 20 * S }}><Chip text="Airtable" icon="grid" color={C.yellow} size={28 * S} /><Chip text="Notion" icon="book" color={C.yellow} size={28 * S} /></div></Pop></At>
        <At x={560} y={540}><Pop at={1683}><Table cols={["名稱", "價格"]} widths={[220, 160]} color={C.yellow} rows={[["帆布袋", "390"], ["馬克杯", "280"]]} lit={(r, c) => (frame >= 1700 && r === 0 && c === 0 ? 1 : 0)} /></Pop></At>
        <At x={1360} y={540}><Pop at={1690}><Table cols={["訂單", "商品"]} widths={[200, 220]} color={C.yellow} rows={[["A001", "帆布袋"], ["A002", "馬克杯"]]} lit={(r, c) => (frame >= 1700 && r === 0 && c === 1 ? 1 : 0)} /></Pop></At>
        {frame >= 1700 && <Wire x1={1150} y1={540} x2={750} y2={540} at={1700} color={C.yellow} march={frame > 1725} />}
        <At x={960} y={370}>{frame >= 1683 && <Pop at={1683}><Txt size={30 * S} color={C.muted}>支援不同表格之間的關聯</Txt></Pop>}</At>
        <At x={960} y={790}>{frame >= 1762 && <KeyLine at={1762} main="更接近真正的資料庫" color={C.yellow} size={60 * S} />}</At>
      </Layer>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 2.2 — KISS：大字 KISS 逐字母展開成全名 → 複雜架構塔 vs 一張試算表，天平倒向試算表 → 你才是真的奉行 KISS 的人
// cues: 59 設計原則 | 193 KISS | 257 Keep It Simple & Stupid | 316 保持簡單越笨越好 | 418 最低複雜度 | 488 不要過度工程化
//   544 個人使用的工具 | 636 幾十個人的內部系統 | 726 試算表當資料庫 | 847 工程師嘴巴上說 | 950 道理我都懂 | 1100 超級複雜的架構
//   1184 像你這樣 | 1301 奉行KISS的人
// ═════════════════════════════════════════════════════════════════════════════
const Scene22Kiss: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pA = win(frame, 0, 544);
  const pB = win(frame, 544, dur + 20);
  const letters = [{ l: "K", w: "Keep" }, { l: "I", w: "It" }, { l: "S", w: "Simple" }, { l: "S", w: "& Stupid" }];
  const tiltT = frame >= 726 ? spring({ frame: frame - 726, fps, config: { damping: 14, stiffness: 80 } }) : 0;
  const ang = (8 * tiltT * Math.PI) / 180; // 右邊（試算表）往下
  const CX = 960, CY = 640, L = 480;
  const lx = CX - L * Math.cos(ang), ly = CY - L * Math.sin(ang);
  const rx = CX + L * Math.cos(ang), ry = CY + L * Math.sin(ang);
  const boxes = frame < 847 ? 6 : Math.round(interpolate(frame, [847, 1100], [6, 12], clamp));
  const stamp = frame >= 1301 ? spring({ frame: frame - 1301, fps, config: { damping: 10 } }) : 0;
  return (
    <Shell callouts={callouts} dur={dur} accent={C.yellow} pct={PROGRESS_PCT[6]}>
      <SectionHeader num="02" title="KISS 原則" accent={C.yellow} />
      <Layer o={pA}>
        <At x={960} y={250}><Pop at={59} kind="up"><Txt size={32 * S} color={C.muted}>軟體工程師都會奉行的設計原則</Txt></Pop></At>
        <At x={960} y={470}>
          <div style={{ display: "flex", gap: 60 * S }}>
            {letters.map((d, i) => (
              <div key={i} style={{ width: 280 * S, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S }}>
                <Pop at={193 + i * 5}><Disp style={{ fontSize: 190 * S, color: C.yellow, lineHeight: 1 }}>{d.l}</Disp></Pop>
                {frame >= 257 + i * 10 && <Pop at={257 + i * 10} kind="up"><Disp style={{ fontSize: 44 * S, color: C.text, whiteSpace: "nowrap" }}>{d.w}</Disp></Pop>}
              </div>
            ))}
          </div>
        </At>
        <At x={960} y={710}>{frame >= 316 && <Pop at={316}><Txt size={56 * S} color={C.text}>保持簡單 越笨越好</Txt></Pop>}</At>
        <At x={760} y={830}>{frame >= 418 && <Pop at={418} kind="up"><Txt size={30 * S} color={C.muted}>用最低的複雜度完成目標</Txt></Pop>}</At>
        <At x={1280} y={830}>{frame >= 488 && <Pop at={488}><Chip text="不要過度工程化" icon="cross" color={C.red} size={28 * S} /></Pop>}</At>
      </Layer>
      <Layer o={pB}>
        {/* 蹺蹺板式天平：物件放在橫桿兩端、跟著橫桿傾斜；試算表那端往下 */}
        <svg width={W} height={H} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
          <path d={`M${CX} ${CY} L${CX - 70} ${CY + 150} L${CX + 70} ${CY + 150} Z`} fill={hexA(C.text, 0.03)} stroke={C.borderHi} strokeWidth={3} strokeLinejoin="round" />
        </svg>
        <At x={CX} y={CY}>
          <div style={{ position: "relative", width: 2 * L * S, height: 0, transform: `rotate(${(ang * 180) / Math.PI}deg)` }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: -4 * S, height: 8 * S, borderRadius: 99, background: "rgba(240,240,245,0.55)" }} />
            <div style={{ position: "absolute", left: (L - 10) * S, top: -10 * S, width: 20 * S, height: 20 * S, borderRadius: 99, background: C.text }} />
            {/* 左端：複雜架構塔 */}
            <div style={{ position: "absolute", left: -150 * S, bottom: 8 * S, width: 300 * S, display: "flex", flexWrap: "wrap-reverse", justifyContent: "center", gap: 8 * S }}>
              {Array.from({ length: boxes }).map((_, i) => (
                <div key={i} style={{ width: 90 * S, height: 44 * S, borderRadius: 8 * S, border: `${1.5 * S}px solid ${hexA(C.red, 0.6)}`, background: hexA(C.red, 0.08), opacity: interpolate(frame, [560 + Math.min(i, 5) * 4, 572 + Math.min(i, 5) * 4], [0, 1], clamp), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <LI name={["server", "database", "gear", "cloud", "plug", "lock"][i % 6]} size={24 * S} color={hexA(C.red, 0.7)} sw={1.8} />
                </div>
              ))}
            </div>
            {/* 右端：試算表 */}
            <div style={{ position: "absolute", left: (2 * L - 70) * S, bottom: 8 * S, width: 140 * S, display: "flex", justifyContent: "center" }}>
              {frame >= 726 && <Pop at={726}><LI name="table" size={130 * S} color={C.yellow} sw={1.5} /></Pop>}
            </div>
          </div>
        </At>
        <At x={lx} y={ly + 60}><Pop at={560} kind="up"><Txt size={28 * S} color={C.red}>複雜的架構</Txt></Pop></At>
        <At x={rx + 170} y={ry - 90}>{stamp > 0 && <div style={{ transform: `scale(${2 - stamp}) rotate(-12deg)`, opacity: Math.min(1, stamp * 1.4), padding: `${6 * S}px ${18 * S}px`, borderRadius: 12 * S, border: `${3 * S}px solid ${C.yellow}` }}><Disp style={{ fontSize: 40 * S, color: C.yellow }}>KISS</Disp></div>}</At>
        <At x={rx} y={ry + 60}>{frame >= 726 && <Pop at={726} kind="up"><Txt size={28 * S} color={C.yellow}>試算表當資料庫</Txt></Pop>}</At>
        <At x={1560} y={250}>{<Pop at={544}><Chip text="個人使用的工具" icon="user" color={C.yellow} size={26 * S} /></Pop>}</At>
        <At x={1560} y={330}>{frame >= 636 && <Pop at={636}><Chip text="幾十個人的內部系統" icon="users" color={C.yellow} size={26 * S} /></Pop>}</At>
        <At x={780} y={250}>{frame >= 847 && <Pop at={847}><Chip text="很多工程師" icon="users" color={C.gray} size={26 * S} /></Pop>}</At>
        <At x={780} y={340}>{frame >= 950 && <Pop at={950}><Bubble side="l" text="道理我都懂" color={C.gray} size={28 * S} /></Pop>}</At>
        <At x={1560} y={420}>{frame >= 1184 && <Pop at={1184}><Chip text="像你這樣直接拿試算表" icon="user" color={C.yellow} size={26 * S} solid /></Pop>}</At>
        <At x={960} y={860}>{frame >= 1301 && <KeyLine at={1301} main="才是真的奉行 KISS 原則的人" color={C.yellow} size={52 * S} />}</At>
      </Layer>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 3.1 — 海豚 vs 大象：兩個標準選項 → 支撐大型服務 → 幾何線條海豚／大象進場「你們用哪一隻」→ 正在講的那隻亮、另一隻壓暗 → 兩邊底下長出門檻
// cues: 89 兩個標準選項 | 202 MySQL跟PostgreSQL | 293 支撐大型服務 | 384 社群電商新聞 | 499 一半以上 | 598 海豚大象
//   708 工程師聊天 | 797 用哪一隻 | 852 各自特色 | 974 MySQL海豚 | 1034 讀取快吞吐高 | 1138 市占第一 | 1205 大量讀取
//   1284 新聞商品列表 | 1423 PostgreSQL大象 | 1517 功能完整 | 1620 複雜資料處理 | 1709 結構不固定 | 1805 進階操作
//   1882 比較有彈性 | 2018 速度不再是差異 | 2088 使用比例增加 | 2227 升級資料庫 | 2278 海豚還是大象 | 2350 租伺服器
//   2402 從頭設定 | 2453 學習門檻
// ═════════════════════════════════════════════════════════════════════════════
const Scene31Two: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 598);
  const pAttr = win(frame, 974, 2227);
  const pD = win(frame, 2227, dur + 20);
  const bubble = win(frame, 797, 960);
  const focus = frame >= 974 && frame < 1423 ? "d" : frame >= 1423 && frame < 2227 ? "e" : "both";
  const litD = interpolate(frame, [1423, 1440], [1, 0.3], clamp) * (focus === "e" ? 1 : 0) + (focus === "e" ? 0 : 1);
  const litE = focus === "d" ? interpolate(frame, [974, 990], [1, 0.3], clamp) : 1;
  const dChips = [{ t: "讀取速度快", at: 1034 }, { t: "吞吐量高", at: 1080 }, { t: "長年市占第一", at: 1138 }, { t: "大量讀取的場景", at: 1205 }, { t: "新聞平台 · 商品列表", at: 1284 }];
  const eChips = [{ t: "功能比較完整", at: 1517 }, { t: "複雜的資料處理", at: 1620 }, { t: "結構不固定的資料", at: 1709 }, { t: "比較有彈性", at: 1882 }, { t: "使用比例逐漸增加", at: 2088, i: "trend" }];
  const chipRow = (list: { t: string; at: number; i?: string }[], color: string, lit: number) => (
    <div style={{ width: 760 * S, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 * S, opacity: 0.35 + 0.65 * lit }}>
      {list.map((c) => (frame >= c.at ? <Pop key={c.t} at={c.at}><Chip text={c.t} icon={c.i} color={color} size={24 * S} /></Pop> : null))}
    </div>
  );
  return (
    <Shell callouts={callouts} dur={dur} accent={C.purple} pct={PROGRESS_PCT[7]}>
      <SectionHeader num="03" title="正式資料庫" accent={C.purple} />
      <At x={560} y={250}><Pop at={202}><Disp style={{ fontSize: 60 * S, color: C.blue, opacity: 0.35 + 0.65 * litD }}>MySQL</Disp></Pop></At>
      <At x={1360} y={250}><Pop at={214}><Disp style={{ fontSize: 60 * S, color: C.purple, opacity: 0.35 + 0.65 * litE }}>PostgreSQL</Disp></Pop></At>
      <Layer o={pA}>
        <At x={960} y={160}><Pop at={89} kind="up"><Txt size={26 * S} color={C.muted}>業界公認的兩個標準選項</Txt></Pop></At>
        <At x={960} y={450}>{frame >= 293 && <Pop at={293}><Txt size={44 * S}>幾乎支撐了所有大型服務</Txt></Pop>}</At>
        <At x={960} y={580}>
          <div style={{ display: "flex", gap: 24 * S }}>
            {[{ t: "社群媒體", i: "users", at: 384 }, { t: "電商平台", i: "bag", at: 420 }, { t: "新聞網站", i: "book", at: 460 }].map((c) => (frame >= c.at ? <Pop key={c.t} at={c.at}><Chip text={c.t} icon={c.i} color={C.text} size={30 * S} /></Pop> : null))}
          </div>
        </At>
        <At x={960} y={720}>{frame >= 499 && <Pop at={499}><Txt size={34 * S} color={C.muted}>大概一半以上都跑在這兩個上面</Txt></Pop>}</At>
      </Layer>
      {frame >= 598 && (
        <>
          <At x={560} y={470}><Animal kind="dolphin" at={598} color={C.blue} w={440} lit={litD} /></At>
          <At x={1360} y={470}><Animal kind="elephant" at={630} color={C.purple} w={440} lit={litE} /></At>
        </>
      )}
      <At x={960} y={420} o={bubble}>{frame >= 797 && <Pop at={797}><Bubble side="l" text="你們是用哪一隻？" color={C.gray} icon="users" /></Pop>}</At>
      <Layer o={pAttr}>
        <At x={560} y={790}>{chipRow(dChips, C.blue, focus === "e" ? 0 : 1)}</At>
        <At x={1360} y={790}>{chipRow(eChips, C.purple, focus === "d" ? 0 : 1)}</At>
        <At x={1360} y={660}>{frame >= 2018 && <Pop at={2018} kind="up"><Txt size={26 * S} color={C.muted}>速度已經不是主要差異</Txt></Pop>}</At>
      </Layer>
      <Layer o={pD}>
        <At x={960} y={650}>{frame >= 2278 && <Pop at={2278} kind="up"><Txt size={30 * S} color={C.muted}>不管海豚還是大象</Txt></Pop>}</At>
        <At x={960} y={790}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 * S }}>
            {frame >= 2350 && <Pop at={2350}><Chip text="租伺服器" icon="server" color={C.text} size={30 * S} /></Pop>}
            {frame >= 2402 && <Pop at={2402}><span style={{ fontFamily: MONO, fontSize: 30 * S, color: C.faint }}>›</span></Pop>}
            {frame >= 2402 && <Pop at={2402}><Chip text="從頭開始設定" icon="gear" color={C.text} size={30 * S} /></Pop>}
            {frame >= 2453 && <Pop at={2453}><span style={{ fontFamily: MONO, fontSize: 30 * S, color: C.faint }}>›</span></Pop>}
            {frame >= 2453 && <Pop at={2453}><Chip text="有一定的學習門檻" icon="warning" color={C.red} size={30 * S} /></Pop>}
          </div>
        </At>
      </Layer>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 3.2 — Supabase：卡在試算表與海豚大象中間 → 大象被裝進盒子 → 盒子打開是試算表般的介面（滑鼠點一格新增）
//        → 程式一條線連上 → 告訴 AI「我在用 Supabase」吐出程式碼 → 想自己養也行，但先把精力放在功能開發
// cues: 0 卡在中間 | 53 試算表不夠用 | 115 不至於海豚大象 | 216 Supabase | 328 想像成 | 401 包裝PostgreSQL | 527 像試算表的介面
//   599 滑鼠新增修改 | 696 不用寫指令 | 758 存取方式準備好 | 868 讀取寫入 | 982 不用複雜設定 | 1057 跟AI搭配 | 1146 告訴AI
//   1212 產生程式碼 | 1295 順暢 | 1358 自己養 | 1457 租伺服器 | 1525 也可以 | 1560 好玩 | 1612 學到很多 | 1673 初學者
//   1717 精力放功能開發 | 1813 熟悉架構之後 | 1876 再考慮
// ═════════════════════════════════════════════════════════════════════════════
const Scene32Supa: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 527);
  const pB = win(frame, 527, 1057);
  const pC = win(frame, 1057, 1358);
  const pD = win(frame, 1358, dur + 20);
  const leftDim = interpolate(frame, [1673, 1690], [1, 0.35], clamp);
  const curX = interpolate(frame, [570, 599], [1500, 1150], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const curY = interpolate(frame, [570, 599], [650, 268], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const click = frame >= 599 ? interpolate(frame, [599, 612], [0, 1], clamp) : 0;
  const code = ["const { data } = await supabase", "  .from('orders')", "  .select('*')"];
  const codeChars = Math.floor(interpolate(frame, [1212, 1290], [0, code.join("").length], clamp));
  let left = codeChars;
  return (
    <Shell callouts={callouts} dur={dur} accent={C.purple} pct={PROGRESS_PCT[8]}>
      <SectionHeader num="03" title="新手首選" accent={C.purple} />
      <Layer o={pA}>
        <svg width={W} height={H} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
          <line x1={460} y1={500} x2={1460} y2={500} stroke={C.borderHi} strokeWidth={3} strokeDasharray="10 10" />
        </svg>
        <At x={360} y={500}><Pop at={0}><Node icon="table" label="試算表" color={C.yellow} size={150 * S} /></Pop></At>
        <At x={360} y={690}>{frame >= 53 && <Pop at={53}><Txt size={28 * S} color={C.muted}>覺得有點不夠用</Txt></Pop>}</At>
        <At x={1560} y={480}>
          <Pop at={0}>
            <div style={{ display: "flex", gap: 10 * S, alignItems: "center" }}>
              <Animal kind="dolphin" at={0} color={C.blue} w={150} />
              <div style={{ opacity: frame >= 328 ? 0 : 1 }}><Animal kind="elephant" at={0} color={C.purple} w={150} /></div>
            </div>
          </Pop>
        </At>
        <At x={1560} y={690}>{frame >= 115 && <Pop at={115}><Txt size={28 * S} color={C.muted}>還不至於要用到</Txt></Pop>}</At>
        <At x={960} y={500}>{frame >= 216 && <Pop at={216}><SupaBox w={360} h={240}>{frame >= 401 && <div style={{ marginTop: 50 * S }}><Pop at={401}><Animal kind="elephant" at={0} color={C.purple} w={130} /></Pop></div>}</SupaBox></Pop>}</At>
        {frame >= 328 && frame < 401 && <Mover at={328} a={340} b={398} x1={1625} y1={480} x2={960} y2={520}><div style={{ transform: `scale(${interpolate(frame, [340, 398], [1, 0.4], clamp)})` }}><Animal kind="elephant" at={0} color={C.purple} w={150} /></div></Mover>}
        <At x={960} y={790}>{frame >= 401 && <KeyLine at={401} main="包裝好的 PostgreSQL" color={C.purple} size={56 * S} />}</At>
      </Layer>
      <Layer o={pB}>
        <At x={220} y={230} anchor="tl">
          <Pop at={527}>
            <div style={{ width: 1000 * S, borderRadius: 22 * S, border: `${1.5 * S}px solid ${hexA(C.purple, 0.5)}`, background: C.surface, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 * S, padding: `${14 * S}px ${22 * S}px`, background: hexA(C.purple, 0.1), borderBottom: `1px solid ${hexA(C.purple, 0.3)}` }}>
                <LI name="box" size={32 * S} color={C.purple} />
                <Disp style={{ fontSize: 28 * S, color: C.text }}>Supabase</Disp>
                <span style={{ fontFamily: TC, fontSize: 24 * S, color: C.muted }}>orders</span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 * S, padding: `${8 * S}px ${18 * S}px`, borderRadius: 10 * S, background: hexA(C.purple, 0.2 + 0.3 * click), border: `1px solid ${hexA(C.purple, 0.7)}` }}>
                  <LI name="plus" size={26 * S} color={C.text} sw={2.4} />
                  <span style={{ fontFamily: TC, fontSize: 24 * S, color: C.text }}>新增資料</span>
                </div>
              </div>
              <div style={{ padding: 20 * S }}>
                <Table cols={["id", "名稱", "價格"]} widths={[160, 400, 360]} color={C.purple}
                  rows={[["1", "帆布袋", "390"], ["2", "馬克杯", "280"], ...(frame >= 612 ? [["3", "筆記本", "150"]] : [])]}
                  lit={(r, c) => (r === 2 ? interpolate(frame, [612, 630, 690], [1, 1, 0.3], clamp) : r === -1 && c === 2 && frame >= 650 && frame < 700 ? 1 : 0)} />
              </div>
            </div>
          </Pop>
        </At>
        {frame >= 560 && frame < 700 && (
          <div style={{ position: "absolute", left: curX * S, top: curY * S, zIndex: 40 }}>
            <LI name="cursor" size={48 * S} color={C.text} sw={2} />
            {click > 0 && click < 1 && <div style={{ position: "absolute", left: 0, top: 0, width: 80 * S * click, height: 80 * S * click, borderRadius: 99, border: `${3 * S}px solid rgba(255,255,255,${0.7 * (1 - click)})`, transform: "translate(-50%,-50%)" }} />}
          </div>
        )}
        <At x={720} y={700}>{frame >= 599 && <Pop at={599}><Txt size={30 * S} color={C.muted}>用滑鼠直接新增資料 修改欄位</Txt></Pop>}</At>
        <At x={720} y={790}>{frame >= 696 && <Pop at={696}><Chip text="不用一開始就寫指令" icon="check" color={C.purple} size={28 * S} /></Pop>}</At>
        <At x={1560} y={470}>{frame >= 758 && <Pop at={758}><Node icon="code" label="你的程式" color={C.green} size={150 * S} /></Pop>}</At>
        {frame >= 758 && <Wire x1={1225} y1={420} x2={1470} y2={450} at={758} color={C.purple} march={frame > 868} curve={20} />}
        {frame >= 868 && <Wire x1={1470} y1={500} x2={1225} y2={480} at={868} color={C.green} march curve={20} />}
        <At x={1560} y={690}>{frame >= 868 && <Pop at={868}><Chip text="讀取 · 寫入資料" icon="link" color={C.green} size={28 * S} /></Pop>}</At>
        <At x={1560} y={790}>{frame >= 982 && <Pop at={982}><Txt size={26 * S} color={C.muted}>不用自己處理複雜的設定</Txt></Pop>}</At>
      </Layer>
      <Layer o={pC}>
        <At x={960} y={240}><Pop at={1057} kind="up"><Txt size={34 * S} color={C.muted}>Supabase 跟 AI 的搭配也很好</Txt></Pop></At>
        <At x={1180} y={360}>{frame >= 1146 && <Pop at={1146}><Bubble side="r" text="我在用 Supabase" /></Pop>}</At>
        <At x={760} y={600}>
          {frame >= 1212 && (
            <Pop at={1212}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 * S }}>
                <div style={{ width: 64 * S, height: 64 * S, borderRadius: 99, background: hexA(C.green, 0.14), border: `${1.5 * S}px solid ${hexA(C.green, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center" }}><LI name="robot" size={36 * S} color={C.green} /></div>
                <div style={{ width: 820 * S, minHeight: 200 * S, padding: `${22 * S}px ${28 * S}px`, borderRadius: 24 * S, background: "#0f0f16", border: `${1.5 * S}px solid ${hexA(C.green, 0.35)}`, display: "flex", flexDirection: "column", gap: 8 * S, boxSizing: "border-box" }}>
                  {code.map((l, i) => {
                    const take = Math.max(0, Math.min(l.length, left));
                    left -= l.length;
                    return <span key={i} style={{ fontFamily: MONO, fontSize: 28 * S, color: i === 0 ? C.green : C.text, whiteSpace: "pre" }}>{l.slice(0, take)}</span>;
                  })}
                </div>
              </div>
            </Pop>
          )}
        </At>
        <At x={960} y={840}>{frame >= 1295 && <Pop at={1295}><Chip text="使用上會順暢很多" icon="check" color={C.green} size={30 * S} /></Pop>}</At>
      </Layer>
      <Layer o={pD}>
        <div style={{ position: "absolute", inset: 0, opacity: leftDim }}>
          <At x={500} y={300}><Pop at={1358}><div style={{ display: "flex", gap: 20 * S }}><Animal kind="dolphin" at={1358} color={C.blue} w={200} /><Animal kind="elephant" at={1370} color={C.purple} w={200} /></div></Pop></At>
          <At x={500} y={470}>{frame >= 1358 && <Pop at={1358} kind="up"><Txt size={34 * S}>想自己養一隻</Txt></Pop>}</At>
          <At x={500} y={580}>{frame >= 1457 && <Pop at={1457}><Chip text="租伺服器 從頭開始設定" icon="server" color={C.text} size={28 * S} /></Pop>}</At>
          <At x={500} y={690}>{frame >= 1525 && <Pop at={1525}><Chip text="當然也可以" icon="check" color={C.green} size={28 * S} /></Pop>}</At>
          <At x={500} y={790}>{frame >= 1612 && <Pop at={1612}><Chip text="會學到很多東西" icon="book" color={C.green} size={28 * S} /></Pop>}</At>
        </div>
        <div style={{ position: "absolute", left: 960 * S, top: 240 * S, width: 1.5 * S, height: 620 * S, background: C.border, opacity: frame >= 1673 ? 1 : 0 }} />
        <At x={1420} y={330}>{frame >= 1673 && <Pop at={1673} kind="up"><Txt size={32 * S} color={C.muted}>以初學者來說</Txt></Pop>}</At>
        <At x={1420} y={480}>{frame >= 1717 && <KeyLine at={1717} main="先把精力放在功能開發" color={C.green} size={54 * S} />}</At>
        <At x={1420} y={680}>{frame >= 1813 && <Pop at={1813}><Txt size={30 * S} color={C.muted}>等你熟悉整個架構之後</Txt></Pop>}</At>
        <At x={1420} y={780}>{frame >= 1876 && <Pop at={1876}><Chip text="再考慮要不要自己架資料庫" icon="database" color={C.purple} size={28 * S} /></Pop>}</At>
      </Layer>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 4.1 — 資料不只表格：圖片、對話泡泡（語意搜尋）、長條圖飛向表格塞不進去 → 傳統資料表不太夠用 → 分成三條路
// cues: 0 關聯式 | 130 除了表格 | 182 其他型態 | 259 存圖片 | 324 語意搜尋 | 409 分析大量資料 | 522 這些情境 | 559 不太夠用 | 624 三種特化
// ═════════════════════════════════════════════════════════════════════════════
const Scene41Beyond: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const shake = frame >= 559 && frame < 575 ? Math.sin((frame - 559) * 2.4) * 7 * S * (1 - (frame - 559) / 16) : 0;
  const split = frame >= 624;
  const tblO = split ? interpolate(frame, [624, 640], [1, 0.35], clamp) : 1;
  const items = [
    { at: 259, icon: "image", t: "圖片", color: C.orange, from: [200, 300], hit: [790, 440], rest: [560, 330], to: [480, 790] },
    { at: 324, icon: "msg", t: "語意搜尋", color: C.green, from: [960, 120], hit: [960, 380], rest: [1300, 300], to: [960, 790] },
    { at: 409, icon: "chart", t: "大量資料分析", color: C.pink, from: [1750, 560], hit: [1130, 500], rest: [1380, 560], to: [1440, 790] },
  ];
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[9]}>
      <SectionHeader num="04" title="資料不只有表格" accent={C.green} />
      <At x={960} y={470} o={tblO}>
        <div style={{ transform: `translateX(${shake}px)`, position: "relative" }}>
          <Pop at={0}><Table cols={["名稱", "價格"]} widths={[200, 160]} color={C.green} rows={[["帆布袋", "390"], ["馬克杯", "280"], ["筆記本", "150"]]} /></Pop>
          {frame >= 559 && <div style={{ position: "absolute", right: -40 * S, top: -40 * S }}><Pop at={559}><div style={{ width: 80 * S, height: 80 * S, borderRadius: 99, background: hexA(C.red, 0.15), border: `${2 * S}px solid ${C.red}`, display: "flex", alignItems: "center", justifyContent: "center" }}><LI name="cross" size={44 * S} color={C.red} sw={2.6} /></div></Pop></div>}
        </div>
      </At>
      <At x={960} y={220}>{frame >= 130 && <Pop at={130} kind="up"><Txt size={30 * S} color={C.muted}>除了表格 還有很多其他的型態</Txt></Pop>}</At>
      {items.map((it) => {
        if (frame < it.at) return null;
        const t1 = interpolate(frame, [it.at, it.at + 20], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
        const t2 = interpolate(frame, [it.at + 20, it.at + 40], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
        const t3 = split ? interpolate(frame, [632, 670], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) }) : 0;
        let x = it.from[0] + (it.hit[0] - it.from[0]) * t1;
        let y = it.from[1] + (it.hit[1] - it.from[1]) * t1;
        x += (it.rest[0] - it.hit[0]) * t2; y += (it.rest[1] - it.hit[1]) * t2;
        x += (it.to[0] - it.rest[0]) * t3; y += (it.to[1] - it.rest[1]) * t3;
        return <At key={it.t} x={x} y={y} o={split ? interpolate(frame, [660, 676], [1, 0], clamp) : 1}><Chip text={it.t} icon={it.icon} color={it.color} size={30 * S} /></At>;
      })}
      <At x={960} y={660}>{frame >= 559 && !split && <Pop at={559}><Txt size={34 * S} color={C.red}>傳統的資料表不太夠用</Txt></Pop>}</At>
      {split && [{ x: 480, c: C.orange }, { x: 960, c: C.green }, { x: 1440, c: C.pink }].map((r, i) => <Wire key={i} x1={960} y1={560} x2={r.x} y2={720} at={624 + i * 6} color={r.c} march={frame > 660} />)}
      {split && (
        <>
          <At x={480} y={800}><Pop at={650}><Node icon="folder" label="物件儲存" color={C.orange} size={120 * S} /></Pop></At>
          <At x={960} y={800}><Pop at={658}><Node icon="vector" label="向量儲存" color={C.green} size={120 * S} /></Pop></At>
          <At x={1440} y={800}><Pop at={666}><Node icon="chart" label="分析型倉儲" color={C.pink} size={120 * S} /></Pop></At>
        </>
      )}
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 4.2 — 物件儲存（橘）：超大雲端硬碟＋檔案類型 → 路徑逐層對到一張圖 → 複製到三個地點、一台壞掉檔案還在
//        → 推薦 Supabase Storage／GitHub → 經典 S3／GCS 計費複雜、帳單數字上跳 → 從簡單的開始
// cues: 0 物件儲存 | 85 檔案型 | 146 超大雲端硬碟 | 238 圖片PDF影片音訊 | 368 二進位資產 | 438 管理邏輯簡單 | 515 路徑對檔案
//   584 資料夾結構 | 668 容量無上限 | 760 複製到多個地方 | 889 伺服器壞掉不消失 | 1012 使用者上傳附件 | 1143 Supabase Storage
//   1212 整合度高友善 | 1304 偶爾放靜態圖片 | 1435 GitHub | 1550 上網查 | 1617 Amazon S3 | 1740 Google Cloud Storage
//   1802 功能完整 | 1855 計費複雜 | 1970 沒有充分了解 | 2071 錢包危險 | 2132 從簡單方案開始
// ═════════════════════════════════════════════════════════════════════════════
const Scene42Object: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 438);
  const pB1 = win(frame, 438, 760);
  const pB2 = win(frame, 760, 1012);
  const pC = win(frame, 1012, 1550);
  const pD = win(frame, 1550, 2132);
  const pE = win(frame, 2132, dur + 20);
  const bill = Math.round(interpolate(frame, [1855, 2060], [1, 6], { ...clamp, easing: Easing.in(Easing.quad) })); // 只示意費用往上疊，不放旁白沒講的金額
  const seg = ["uploads", "avatars", "001.png"];
  return (
    <Shell callouts={callouts} dur={dur} accent={C.orange} pct={PROGRESS_PCT[10]}>
      <SectionHeader num="04" title="物件儲存" accent={C.orange} />
      <Layer o={pA}>
        <At x={560} y={500}><Pop at={85}><Node icon="cloud" label="檔案型的資料庫" sub={frame >= 146 ? "像一個超大的雲端硬碟" : undefined} color={C.orange} size={260 * S} /></Pop></At>
        {[{ t: "圖片", i: "image", at: 238, x: 1200, y: 380 }, { t: "PDF", i: "file", at: 262, x: 1540, y: 380 }, { t: "影片", i: "video", at: 286, x: 1200, y: 540 }, { t: "音訊", i: "audio", at: 310, x: 1540, y: 540 }].map((f) => (
          <At key={f.t} x={f.x} y={f.y}>{frame >= f.at && <Pop at={f.at}><Chip text={f.t} icon={f.i} color={C.orange} size={34 * S} /></Pop>}</At>
        ))}
        {frame >= 238 && <Wire x1={720} y1={480} x2={1080} y2={460} at={238} color={C.orange} march />}
        <At x={1370} y={700}>{frame >= 368 && <Pop at={368}><Txt size={32 * S} color={C.muted}>這一類二進位的資產檔案</Txt></Pop>}</At>
      </Layer>
      <Layer o={pB1}>
        <At x={960} y={260}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
            {seg.map((s, i) => (
              <React.Fragment key={s}>
                <Pop at={515 + i * 12}><span style={{ fontFamily: MONO, fontSize: 40 * S, color: i === 2 ? C.orange : C.text, padding: `${8 * S}px ${16 * S}px`, borderRadius: 10 * S, background: hexA(C.orange, frame >= 515 + i * 12 + 6 ? 0.12 : 0) }}>{s}</span></Pop>
                {i < 2 && <Pop at={515 + i * 12}><span style={{ fontFamily: MONO, fontSize: 40 * S, color: C.faint }}>/</span></Pop>}
              </React.Fragment>
            ))}
          </div>
        </At>
        {frame >= 551 && <Wire x1={1180} y1={300} x2={960} y2={380} at={551} color={C.orange} />}
        <At x={960} y={490}>{frame >= 551 && <Pop at={551}><div style={{ width: 300 * S, height: 200 * S, borderRadius: 18 * S, border: `${1.5 * S}px solid ${hexA(C.orange, 0.6)}`, background: `linear-gradient(135deg, ${hexA(C.orange, 0.3)}, ${hexA(C.purple, 0.2)})`, display: "flex", alignItems: "center", justifyContent: "center" }}><LI name="image" size={90 * S} color={C.text} sw={1.4} /></div></Pop>}</At>
        <At x={560} y={760}>{frame >= 584 && <Pop at={584}><Chip text="跟電腦裡的資料夾結構一樣" icon="folder" color={C.orange} size={28 * S} /></Pop>}</At>
        <At x={1360} y={760}>{frame >= 668 && <Pop at={668}><Chip text="容量幾乎沒有上限" icon="infinity" color={C.orange} size={28 * S} /></Pop>}</At>
        <At x={960} y={170}><Pop at={438} kind="up"><Txt size={26 * S} color={C.muted}>一個路徑對應到一個檔案</Txt></Pop></At>
      </Layer>
      <Layer o={pB2}>
        <At x={960} y={290}><Pop at={760}><Node icon="image" label="你的檔案" color={C.orange} size={140 * S} /></Pop></At>
        {[480, 960, 1440].map((x, i) => (
          <React.Fragment key={x}>
            <Wire x1={960} y1={380} x2={x} y2={560} at={770 + i * 8} color={C.orange} march={frame > 810} />
            <At x={x} y={650}>
              <Pop at={770 + i * 8}>
                <div style={{ position: "relative" }}>
                  <Node icon="server" label={`地點 ${i + 1}`} color={i === 1 && frame >= 889 ? C.red : C.orange} size={140 * S} lit={i === 1 && frame >= 889 ? 0.3 : 1} />
                  {i === 1 && frame >= 889 && <div style={{ position: "absolute", left: "50%", top: 70 * S, transform: "translate(-50%,-50%)" }}><Pop at={889}><LI name="cross" size={120 * S} color={C.red} sw={2.2} /></Pop></div>}
                </div>
              </Pop>
            </At>
            {frame >= 800 + i * 8 && <At x={x + 60} y={590}><Pop at={800 + i * 8}><LI name="image" size={40 * S} color={C.orange} /></Pop></At>}
          </React.Fragment>
        ))}
        <At x={960} y={860}>{frame >= 889 && <Pop at={889}><Chip text="某台伺服器壞掉 資料也不會消失" icon="shield" color={C.green} size={28 * S} /></Pop>}</At>
      </Layer>
      <Layer o={pC}>
        <At x={560} y={520}>
          <Pop at={1012}>
            <div style={{ width: 640 * S, height: 460 * S, borderRadius: 28 * S, border: `${1.5 * S}px solid ${hexA(C.orange, 0.5)}`, background: hexA(C.orange, 0.04), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 * S, opacity: frame >= 1304 ? 0.5 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}><LI name="upload" size={40 * S} color={C.muted} /><Txt size={30 * S} color={C.muted}>讓使用者自己上傳附件</Txt></div>
              {frame >= 1143 && <Pop at={1143}><div style={{ display: "flex", alignItems: "center", gap: 14 * S }}><LI name="box" size={50 * S} color={C.purple} /><Disp style={{ fontSize: 46 * S, color: C.text }}>Supabase Storage</Disp></div></Pop>}
              {frame >= 1212 && <Pop at={1212} kind="up"><Txt size={28 * S} color={C.orange}>整合度高 對新手友善</Txt></Pop>}
            </div>
          </Pop>
        </At>
        <At x={1360} y={520}>
          {frame >= 1304 && (
            <Pop at={1304}>
              <div style={{ width: 640 * S, height: 460 * S, borderRadius: 28 * S, border: `${1.5 * S}px solid ${hexA(C.orange, 0.5)}`, background: hexA(C.orange, 0.04), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 * S }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}><LI name="image" size={40 * S} color={C.muted} /><Txt size={30 * S} color={C.muted}>自己偶爾放靜態圖片</Txt></div>
                {frame >= 1435 && <Pop at={1435}><div style={{ display: "flex", alignItems: "center", gap: 14 * S }}><LI name="branch" size={50 * S} color={C.text} /><Disp style={{ fontSize: 46 * S, color: C.text }}>GitHub</Disp></div></Pop>}
                {frame >= 1435 && <Pop at={1450} kind="up"><Txt size={28 * S} color={C.orange}>就能做到類似的效果</Txt></Pop>}
              </div>
            </Pop>
          )}
        </At>
      </Layer>
      <Layer o={pD}>
        <At x={960} y={220}><Pop at={1550} kind="up"><Txt size={28 * S} color={C.muted}>上網查會發現最經典的是</Txt></Pop></At>
        <At x={620} y={400}>{frame >= 1617 && <Pop at={1617}><NameCard icon="cloud" name="Amazon S3" color={C.gray} w={520} disp /></Pop>}</At>
        <At x={1300} y={400}>{frame >= 1740 && <Pop at={1740}><NameCard icon="cloud" name="Google Cloud Storage" color={C.gray} w={620} disp /></Pop>}</At>
        <At x={620} y={620}>{frame >= 1802 && <Pop at={1802}><Chip text="服務功能很完整" icon="check" color={C.green} size={28 * S} /></Pop>}</At>
        <At x={1300} y={620}>{frame >= 1855 && <Pop at={1855}><Chip text="計費方式比較複雜" icon="warning" color={C.red} size={28 * S} /></Pop>}</At>
        <At x={960} y={790}>
          {frame >= 1855 && (
            <Pop at={1855}>
              <div style={{ display: "flex", alignItems: "center", gap: 24 * S, padding: `${18 * S}px ${34 * S}px`, borderRadius: 20 * S, border: `${1.5 * S}px solid ${hexA(C.red, 0.5)}`, background: hexA(C.red, 0.06) }}>
                <LI name="receipt" size={50 * S} color={C.red} />
                <span style={{ fontFamily: MONO, fontSize: 52 * S, color: C.red, letterSpacing: "0.1em" }}>{"$".repeat(bill)}</span>
                {frame >= 2071 && <Pop at={2071}><div style={{ display: "flex", alignItems: "center", gap: 10 * S }}><LI name="wallet" size={44 * S} color={C.red} /><Txt size={30 * S} color={C.red}>錢包會比較危險</Txt></div></Pop>}
              </div>
            </Pop>
          )}
        </At>
      </Layer>
      <Layer o={pE}>
        <At x={960} y={500}>{frame >= 2132 && <KeyLine at={2132} lead="新手" main="從比較簡單的方案開始" color={C.orange} size={72 * S} />}</At>
      </Layer>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 4.3 — 向量儲存（綠）：AI 客服／語意搜尋的核心 → 「訂單」轉成一串數字 → 傳統只亮完全相同的那格 vs 向量空間裡靠近的也亮
//        → 自動化工具搭 AI 客服接一條線到向量儲存 → 先 Supabase 內建、進階再 Pinecone
// cues: 73 向量型資料庫 | 134 AI客服機器人 | 187 語意搜尋 | 269 向量是什麼 | 342 AI理解語言 | 416 一串數字 | 515 叫做向量
//   594 存起來 | 684 語意相似搜尋 | 796 完全符合才找到 | 919 舉例 | 959 搜尋訂單 | 1049 包含訂單兩個字 | 1140 向量儲存裡
//   1194 搜尋訂單 | 1243 購買紀錄 | 1300 消費明細 | 1388 概念比對 | 1445 不是文字比對 | 1512 什麼時候 | 1619 自動化工具
//   1673 AI客服 | 1798 連線向量後端 | 1912 一般需求 | 1963 Supabase內建 | 2146 高流量進階 | 2245 Pinecone
// ═════════════════════════════════════════════════════════════════════════════
const Scene43Vector: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA1 = win(frame, 0, 269);
  const pA2 = win(frame, 269, 594);
  const pA3 = win(frame, 594, 919);
  const pB = win(frame, 919, 1512);
  const pC = win(frame, 1512, dur + 20);
  const nums = ["0.12", "-0.87", "0.45", "0.33", "-0.21", "0.68", "…"];
  const nShown = Math.floor(interpolate(frame, [416, 480], [0, nums.length], clamp));
  const ring = useDraw(1300, 24);
  const pts = [
    { t: "訂單", x: 1400, y: 560, q: true },
    { t: "購買紀錄", x: 1290, y: 490, at: 1243 },
    { t: "消費明細", x: 1500, y: 640, at: 1300 },
    { t: "會員資料", x: 1660, y: 390 },
    { t: "商品圖片", x: 1160, y: 740 },
  ];
  const list = ["訂單 #A001", "購買紀錄", "消費明細", "會員資料"];
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[11]}>
      <SectionHeader num="04" title="向量儲存" accent={C.green} />
      <Layer o={pA1}>
        <At x={960} y={430}><Pop at={0}><Node icon="vector" label="向量型的資料庫" color={C.green} size={220 * S} /></Pop></At>
        {frame >= 134 && <Wire x1={600} y1={700} x2={850} y2={480} at={134} color={C.green} march />}
        {frame >= 187 && <Wire x1={1320} y1={700} x2={1070} y2={480} at={187} color={C.green} march />}
        <At x={560} y={740}>{frame >= 134 && <Pop at={134}><Chip text="AI 客服機器人" icon="robot" color={C.green} size={32 * S} /></Pop>}</At>
        <At x={1360} y={740}>{frame >= 187 && <Pop at={187}><Chip text="語意搜尋" icon="search" color={C.green} size={32 * S} /></Pop>}</At>
      </Layer>
      <Layer o={pA2}>
        <At x={960} y={250}><Pop at={269} kind="up"><Txt size={36 * S} color={C.muted}>向量是什麼</Txt></Pop></At>
        <At x={420} y={460}>{frame >= 342 && <Pop at={342}><Node icon="robot" label="AI 模型理解語言" color={C.gray} size={130 * S} /></Pop>}</At>
        <At x={760} y={440}>{frame >= 342 && <Pop at={360}><Txt size={90 * S}>訂單</Txt></Pop>}</At>
        {frame >= 416 && <Wire x1={880} y1={440} x2={1000} y2={440} at={416} color={C.green} dur={10} />}
        <At x={1010} y={440} anchor="tl">
          <div style={{ transform: "translateY(-50%)", display: "flex", gap: 18 * S, padding: `${16 * S}px ${24 * S}px`, borderRadius: 16 * S, border: `${1.5 * S}px solid ${hexA(C.green, frame >= 416 ? 0.5 : 0)}` }}>
            {nums.map((n, i) => <span key={i} style={{ fontFamily: MONO, fontSize: 34 * S, color: C.green, opacity: i < nShown ? 1 : 0 }}>{n}</span>)}
          </div>
        </At>
        <At x={960} y={620} anchor="t">{frame >= 515 && <TermCard at={515} term="向量" en="Vector" def="AI 把文字轉換成的一串數字" color={C.green} />}</At>
      </Layer>
      <Layer o={pA3}>
        <At x={540} y={500}><Pop at={594}><Node icon="database" label="向量儲存" sub="把這些數字存起來" color={C.green} size={200 * S} /></Pop></At>
        <At x={1300} y={400}>{frame >= 684 && <Pop at={684}><Chip text="用語意相似的方式搜尋" icon="check" color={C.green} size={34 * S} solid /></Pop>}</At>
        <At x={1300} y={600}>
          {frame >= 796 && (
            <Pop at={796}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S }}>
                <Txt size={26 * S} color={C.faint}>而不是傳統資料庫</Txt>
                <Chip text="完全符合才找到" icon="cross" color={C.gray} size={30 * S} />
              </div>
            </Pop>
          )}
        </At>
      </Layer>
      <Layer o={pB}>
        <At x={520} y={250}><Pop at={919} kind="up"><Txt size={34 * S} color={C.gray}>傳統資料庫</Txt></Pop></At>
        <At x={520} y={330}>{frame >= 959 && <Pop at={959}><div style={{ display: "flex", alignItems: "center", gap: 12 * S, padding: `${10 * S}px ${22 * S}px`, borderRadius: 99, border: `${1.5 * S}px solid ${C.borderHi}` }}><LI name="search" size={30 * S} color={C.muted} /><Txt size={28 * S}>訂單</Txt></div></Pop>}</At>
        {list.map((r, i) => {
          const hit = i === 0 && frame >= 1049;
          return (
            <At key={r} x={520} y={440 + i * 100}>
              <Pop at={919 + i * 5}>
                <div style={{ width: 520 * S, padding: `${16 * S}px ${26 * S}px`, borderRadius: 16 * S, border: `${1.5 * S}px solid ${hit ? C.text : C.border}`, background: hit ? "rgba(255,255,255,0.1)" : C.surface, opacity: frame >= 1049 && !hit ? 0.4 : 1, boxSizing: "border-box" }}>
                  <Txt size={28 * S} color={hit ? C.text : C.muted}>{r}</Txt>
                </div>
              </Pop>
            </At>
          );
        })}
        <At x={520} y={860}>{frame >= 1049 && <Pop at={1049}><Txt size={26 * S} color={C.muted}>只找到包含訂單兩個字的紀錄</Txt></Pop>}</At>
        <div style={{ position: "absolute", left: 960 * S, top: 230 * S, width: 1.5 * S, height: 660 * S, background: C.border }} />
        <At x={1400} y={250}>{frame >= 1140 && <Pop at={1140} kind="up"><Txt size={34 * S} color={C.green}>向量儲存</Txt></Pop>}</At>
        {frame >= 1140 && (
          <>
            <svg width={W} height={H} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
              <rect x={1060} y={320} width={680} height={480} rx={20} fill="none" stroke={C.border} strokeWidth={1.5} />
              <circle cx={1400} cy={560} r={150} fill={hexA(C.green, 0.05)} stroke={C.green} strokeWidth={2} strokeDasharray="6 6" pathLength={1} style={{ strokeDasharray: `${ring} 1` }} opacity={ring > 0 ? 1 : 0} />
              {pts.filter((p) => p.at && frame >= p.at).map((p) => <line key={p.t} x1={1400} y1={560} x2={p.x} y2={p.y} stroke={C.green} strokeWidth={2} />)}
            </svg>
            {pts.map((p, i) => {
              const lit = p.q ? frame >= 1194 : p.at !== undefined && frame >= p.at;
              const col = p.q ? C.text : lit ? C.green : C.faint;
              return (
                <At key={p.t} x={p.x} y={p.y}>
                  <Pop at={1140 + i * 5}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
                      <div style={{ width: (p.q ? 26 : 20) * S, height: (p.q ? 26 : 20) * S, borderRadius: 99, background: col, transform: `scale(${p.q && lit ? 1 + 0.15 * Math.sin(frame / 6) : 1})` }} />
                      <Txt size={26 * S} color={lit ? C.text : C.faint}>{p.t}</Txt>
                    </div>
                  </Pop>
                </At>
              );
            })}
          </>
        )}
        <At x={1400} y={860}>{frame >= 1388 && <Pop at={1388}><div style={{ display: "flex", alignItems: "baseline", gap: 20 * S }}><Txt size={34 * S} color={C.green}>用概念在比對</Txt>{frame >= 1445 && <Pop at={1445}><Txt size={26 * S} color={C.muted}>不是用文字</Txt></Pop>}</div></Pop>}</At>
      </Layer>
      <Layer o={pC}>
        <At x={960} y={240}><Pop at={1512} kind="up"><Txt size={32 * S} color={C.muted}>什麼時候會用到</Txt></Pop></At>
        <At x={420} y={520}>{frame >= 1619 && <Pop at={1619}><Node icon="gear" label="自動化工具" color={C.text} size={150 * S} /></Pop>}</At>
        {frame >= 1673 && <Wire x1={510} y1={500} x2={810} y2={500} at={1673} color={C.green} march />}
        <At x={900} y={520}>{frame >= 1673 && <Pop at={1673}><Node icon="robot" label="搭建 AI 客服" color={C.green} size={150 * S} /></Pop>}</At>
        {frame >= 1798 && <Wire x1={990} y1={500} x2={1340} y2={500} at={1798} color={C.green} march={frame > 1820} />}
        <At x={1440} y={520}>{frame >= 1798 && <Pop at={1798}><Node icon="vector" label="向量儲存的後端" color={C.green} size={170 * S} /></Pop>}</At>
        <At x={620} y={810}>{frame >= 1912 && <Pop at={1912}><div style={{ display: "flex", alignItems: "center", gap: 16 * S }}><Txt size={28 * S} color={C.muted}>一般的需求</Txt>{frame >= 1963 && <Pop at={1963}><Chip text="Supabase 內建的方案" icon="box" color={C.purple} size={28 * S} /></Pop>}</div></Pop>}</At>
        <At x={1340} y={810}>{frame >= 2146 && <Pop at={2146}><div style={{ display: "flex", alignItems: "center", gap: 16 * S }}><Txt size={28 * S} color={C.muted}>高流量或進階需求</Txt>{frame >= 2245 && <Pop at={2245}><Chip text="Pinecone" icon="vector" color={C.green} size={28 * S} /></Pop>}</div></Pop>}</At>
      </Layer>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 4.4 — 分析型倉儲（粉）：一大片資料點 → 聚成平均數長條與地區分佈 → 什麼時候才需要 → 整段壓暗，一般資料庫就夠用
// cues: 0 分析型倉儲 | 92 初學不太會用到 | 252 小小印象 | 336 所謂 | 391 超大型資料庫 | 475 不是查單筆 | 569 統計分析
//   652 三個月平均金額 | 760 地區分佈 | 880 什麼時候需要 | 985 非常大量 | 1068 明顯變慢 | 1183 才需要考慮 | 1273 新手階段 | 1393 一般資料庫夠用
// ═════════════════════════════════════════════════════════════════════════════
const Scene44Warehouse: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const dimAll = interpolate(frame, [1222, 1250], [1, 0.08], clamp);
  const gather = interpolate(frame, [569, 640], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const pBars = win(frame, 600, dur + 20);
  const dots = Array.from({ length: 96 }).map((_, i) => {
    const x = 320 + ((i * 137.5) % 1280);
    const y = 280 + ((i * 89.3) % 400);
    const tx = i % 2 === 0 ? 620 : 1300;
    return { x, y, tx, ty: 520 };
  });
  const months = [{ t: "m1", h: 0.62 }, { t: "m2", h: 0.78 }, { t: "m3", h: 0.7 }];
  const regions = [{ t: "北部", v: 0.86 }, { t: "中部", v: 0.58 }, { t: "南部", v: 0.66 }, { t: "東部", v: 0.24 }];
  const bar1 = useDraw(652, 24);
  const bar2 = useDraw(760, 24);
  return (
    <Shell callouts={callouts} dur={dur} accent={C.pink} pct={PROGRESS_PCT[12]}>
      <SectionHeader num="04" title="分析型倉儲" accent={C.pink} />
      <At x={1560} y={150}>{frame >= 92 && <Pop at={92}><Chip text="初學階段不太會用到" icon="clock" color={C.gray} size={24 * S} /></Pop>}</At>
      <div style={{ position: "absolute", inset: 0, opacity: dimAll }}>
        {frame >= 336 && dots.map((d, i) => {
          const o = interpolate(frame, [336 + (i % 24), 350 + (i % 24)], [0, 1], clamp) * (1 - gather);
          const pick = i === 40 && frame >= 475 && frame < 569;
          return <div key={i} style={{ position: "absolute", left: (d.x + (d.tx - d.x) * gather) * S, top: (d.y + (d.ty - d.y) * gather) * S, width: (pick ? 22 : 12) * S, height: (pick ? 22 : 12) * S, borderRadius: 99, background: pick ? C.text : C.pink, opacity: pick ? 1 : o * 0.7 }} />;
        })}
        <At x={960} y={760}>{frame >= 391 && frame < 600 && <Pop at={391}><Txt size={40 * S} color={C.text}>超大型版本的資料庫</Txt></Pop>}</At>
        <At x={960} y={850}>{frame >= 475 && frame < 600 && <Pop at={475}><Chip text="不是為了快速查詢單筆資料" icon="cross" color={C.gray} size={26 * S} /></Pop>}</At>
        <div style={{ position: "absolute", inset: 0, opacity: pBars }}>
          <At x={960} y={240}>{frame >= 569 && <Pop at={569} kind="up"><Txt size={34 * S} color={C.pink}>對大量資料做統計分析</Txt></Pop>}</At>
          <At x={620} y={500}>
            {frame >= 652 && (
              <Pop at={652}>
                <div style={{ width: 560 * S, display: "flex", flexDirection: "column", gap: 16 * S }}>
                  <Txt size={26 * S} color={C.muted}>過去三個月 訂單平均金額</Txt>
                  <div style={{ position: "relative", height: 260 * S, display: "flex", alignItems: "flex-end", gap: 40 * S, padding: `0 ${30 * S}px`, borderBottom: `${1.5 * S}px solid ${C.borderHi}` }}>
                    {months.map((m) => <div key={m.t} style={{ flex: 1, height: `${m.h * 100 * bar1}%`, borderRadius: `${10 * S}px ${10 * S}px 0 0`, background: hexA(C.pink, 0.5) }} />)}
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: `${70 * bar1}%`, borderTop: `${2 * S}px dashed ${C.pink}`, opacity: bar1 }} />
                  </div>
                </div>
              </Pop>
            )}
          </At>
          <At x={1300} y={500}>
            {frame >= 760 && (
              <Pop at={760}>
                <div style={{ width: 560 * S, display: "flex", flexDirection: "column", gap: 18 * S }}>
                  <Txt size={26 * S} color={C.muted}>不同地區的使用者分佈</Txt>
                  {regions.map((r) => (
                    <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 16 * S }}>
                      <LI name="globe" size={30 * S} color={C.muted} />
                      <div style={{ height: 34 * S, width: `${r.v * 75 * bar2}%`, borderRadius: 8 * S, background: hexA(C.pink, 0.5) }} />
                    </div>
                  ))}
                </div>
              </Pop>
            )}
          </At>
          <At x={960} y={760}>{frame >= 880 && <Pop at={880} kind="up"><Txt size={30 * S} color={C.muted}>什麼時候才需要</Txt></Pop>}</At>
          <At x={960} y={850}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 * S }}>
              {frame >= 985 && <Pop at={985}><Chip text="資料變得非常大量" icon="layers" color={C.pink} size={28 * S} /></Pop>}
              {frame >= 1068 && <Pop at={1068}><Chip text="查詢明顯變慢" icon="clock" color={C.pink} size={28 * S} /></Pop>}
              {frame >= 1183 && <Pop at={1183}><Txt size={30 * S} color={C.text}>才需要考慮</Txt></Pop>}
            </div>
          </At>
        </div>
      </div>
      <At x={960} y={430}>{frame >= 1273 && <Pop at={1273} kind="up"><Txt size={36 * S} color={C.muted}>尤其是新手階段</Txt></Pop>}</At>
      <At x={960} y={580}>{frame >= 1393 && <KeyLine at={1393} main="一般的資料庫就很夠用" color={C.green} size={76 * S} />}</At>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 4.5 — Supabase 一站包三種：關聯式資料庫、檔案儲存、向量資料收進同一個盒子，分析型倉儲留在盒外；帳單一張、API 一套
// cues: 91 Supabase | 142 多種功能 | 224 關聯式 | 276 PostgreSQL | 311 檔案儲存 | 347 Storage | 368 向量 | 450 除了倉儲
//   533 大多數需求 | 612 一次解決 | 664 方便 | 754 帳單統一 | 811 API同一套 | 874 不用維護多個服務
// ═════════════════════════════════════════════════════════════════════════════
const Scene45OneStop: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const glow = useBreathe(60);
  const items = [
    { t: "關聯式資料庫", sub: "PostgreSQL", subAt: 276, i: "database", c: C.green, at: 224, x1: 520, x2: 730 },
    { t: "檔案儲存", sub: "Storage", subAt: 347, i: "folder", c: C.orange, at: 311, x1: 960, x2: 960 },
    { t: "向量資料", i: "vector", c: C.green, at: 368, x1: 1400, x2: 1190 },
  ];
  return (
    <Shell callouts={callouts} dur={dur} accent={C.purple} pct={PROGRESS_PCT[13]}>
      <SectionHeader num="04" title="Supabase 一站包" accent={C.purple} />
      <At x={960} y={530}>
        <Pop at={91}>
          <div style={{ transform: `scale(${frame >= 612 ? 1 + 0.01 * glow : 1})` }}>
            <SupaBox w={820} h={330} />
          </div>
        </Pop>
      </At>
      {items.map((it) => (
        <Mover key={it.t} at={it.at} a={it.at + 24} b={it.at + 54} x1={it.x1} y1={270} x2={it.x2} y2={560}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S }}>
            <div style={{ width: 120 * S, height: 120 * S, borderRadius: 26 * S, background: hexA(it.c, 0.12), border: `${1.5 * S}px solid ${hexA(it.c, 0.6)}`, display: "flex", alignItems: "center", justifyContent: "center" }}><LI name={it.i} size={64 * S} color={it.c} /></div>
            <Txt size={28 * S}>{it.t}</Txt>
            {it.sub && it.subAt !== undefined && <Disp style={{ fontSize: 24 * S, color: C.muted, opacity: frame >= it.subAt ? 1 : 0 }}>{it.sub}</Disp>}
          </div>
        </Mover>
      ))}
      <At x={1640} y={560}>
        {frame >= 450 && (
          <Pop at={450}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S, opacity: 0.6 }}>
              <Txt size={24 * S} color={C.muted}>除了</Txt>
              <div style={{ width: 110 * S, height: 110 * S, borderRadius: 24 * S, border: `${1.5 * S}px dashed ${hexA(C.pink, 0.6)}`, display: "flex", alignItems: "center", justifyContent: "center" }}><LI name="chart" size={58 * S} color={C.pink} /></div>
              <Txt size={26 * S} color={C.muted}>分析型倉儲</Txt>
            </div>
          </Pop>
        )}
      </At>
      <At x={960} y={770}>{frame >= 533 && <Pop at={533}><div style={{ display: "flex", alignItems: "baseline", gap: 18 * S }}><Txt size={32 * S} color={C.muted}>大多數常見的需求</Txt>{frame >= 612 && <Pop at={612}><Txt size={44 * S} color={C.purple}>都可以一次解決</Txt></Pop>}</div></Pop>}</At>
      <At x={960} y={865}>
        <div style={{ display: "flex", gap: 24 * S }}>
          {frame >= 754 && <Pop at={754}><Chip text="帳單統一管理" icon="receipt" color={C.purple} size={26 * S} /></Pop>}
          {frame >= 811 && <Pop at={811}><Chip text="API 用同一套" icon="plug" color={C.purple} size={26 * S} /></Pop>}
          {frame >= 874 && <Pop at={874}><Chip text="不用同時維護多個服務" icon="check" color={C.green} size={26 * S} /></Pop>}
        </div>
      </At>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 5.1 — 同一個動作「存一筆資料」三張程式碼卡長得完全不同 → AI 不知道你用哪個就打問號 → 第一步：先告訴它你用哪一個資料庫
// cues: 100 接下來 | 164 AI寫程式 | 226 正確的資料操作程式碼 | 343 重要觀念 | 400 不管哪種 | 481 基本操作簡單 | 539 存資料讀資料
//   605 每個平台寫法不同 | 710 一樣的事情 | 792 完全不同 | 871 AI不知道 | 959 沒辦法寫出 | 1079 第一步 | 1147 清楚告訴它 | 1199 哪一個資料庫
// ═════════════════════════════════════════════════════════════════════════════
const Scene51Tell: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pA = win(frame, 0, 605);
  const pB = win(frame, 605, 1079);
  const pC = win(frame, 1079, dur + 20);
  const hi = interpolate(frame, [792, 810], [0, 1], clamp);
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[14]}>
      <SectionHeader num="05" title="跟 AI 說清楚" accent={C.green} />
      <Layer o={pA}>
        <At x={560} y={420}>{frame >= 164 && <Pop at={164}><Node icon="robot" label="用 AI 寫程式" color={C.green} size={170 * S} /></Pop>}</At>
        {frame >= 226 && <Wire x1={670} y1={400} x2={1240} y2={400} at={226} color={C.green} march />}
        <At x={1360} y={420}>{frame >= 226 && <Pop at={226}><Node icon="code" label="正確的資料操作程式碼" color={C.green} size={170 * S} /></Pop>}</At>
        <At x={960} y={660}>{frame >= 400 && <Pop at={400} kind="up"><Txt size={30 * S} color={C.muted}>不管用哪一種資料庫 基本操作都很簡單</Txt></Pop>}</At>
        <At x={960} y={800}>
          <div style={{ display: "flex", gap: 40 * S }}>
            {frame >= 539 && <Pop at={539}><Chip text="存資料" icon="upload" color={C.green} size={40 * S} solid /></Pop>}
            {frame >= 539 && <Pop at={555}><Chip text="讀資料" icon="eye" color={C.green} size={40 * S} solid /></Pop>}
          </div>
        </At>
      </Layer>
      <Layer o={pB}>
        <At x={960} y={240}><Pop at={605} kind="up"><Txt size={32 * S} color={C.muted}>同一件事 存一筆資料</Txt></Pop></At>
        <At x={960} y={460}>
          <div style={{ display: "flex", gap: 40 * S, alignItems: "flex-start" }}>
            <CodeCard at={605} name="Google Sheets" color={C.yellow} icon="table" w={470} hi={hi} lines={["sheet.appendRow(", "  ['帆布袋', 390]", ")"]} />
            <CodeCard at={619} name="Supabase" color={C.purple} icon="box" w={470} hi={hi} lines={["supabase.from('orders')", "  .insert({", "    item: '帆布袋' })"]} />
            <CodeCard at={633} name="MySQL" color={C.blue} icon="database" w={470} hi={hi} lines={["INSERT INTO orders", "  (item)", "VALUES ('帆布袋');"]} />
          </div>
        </At>
        <At x={960} y={660}>{frame >= 792 && <Pop at={792}><Txt size={34 * S} color={C.text}>程式碼長得完全不同</Txt></Pop>}</At>
        <At x={760} y={820}>
          {frame >= 871 && (
            <Pop at={871}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 * S }}>
                <LI name="robot" size={70 * S} color={C.gray} />
                <LI name="question" size={56 * S} color={C.red} />
                <Txt size={28 * S} color={C.muted}>AI 不知道你用哪一個</Txt>
              </div>
            </Pop>
          )}
        </At>
        <At x={1340} y={820}>{frame >= 959 && <Pop at={959}><Chip text="寫不出可以直接使用的程式" icon="cross" color={C.red} size={28 * S} /></Pop>}</At>
      </Layer>
      <Layer o={pC}>
        <At x={960} y={520}>{frame >= 1147 && <KeyLine at={1147} lead="和 AI 協作的第一步" main="先告訴它你用哪一個資料庫" color={C.green} size={68 * S} />}</At>
        <At x={960} y={740}>
          <div style={{ display: "flex", gap: 30 * S }}>
            {frame >= 1199 && <Pop at={1199}><Chip text="Google Sheets" icon="table" color={C.yellow} size={30 * S} /></Pop>}
            {frame >= 1199 && <Pop at={1207}><Chip text="Supabase" icon="box" color={C.purple} size={30 * S} /></Pop>}
            {frame >= 1199 && <Pop at={1215}><Chip text="MySQL" icon="database" color={C.blue} size={30 * S} /></Pop>}
          </div>
        </At>
        <At x={960} y={320}><Pop at={1079} kind="up"><LI name="robot" size={100 * S} color={C.green} /></Pop></At>
      </Layer>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 5.2 — 三個溝通技巧：左側三個分頁標籤、右側只亮正在講的那張；提示詞卡用旁白原文（可複製、角落「教材裡有」）
// cues: 0 三個小技巧 | 115 第一個 | 228 我的資料存在試算表 | 347 我是用Supabase | 442 我用MySQL | 500 準確對應
//   614 第二個 | 726 一起貼給AI | 805 JavaScript Client範本 | 942 範本貼給AI | 1016 請依照這個範本 | 1139 直接生成 | 1234 不用對文件
//   1330 第三個 | 1471 直接問AI | 1528 試算表可以做到嗎 | 1624 限制 | 1735 語意搜尋 | 1784 哪一種後端 | 1856 評估可行性
//   1984 這三個技巧 | 2078 多給AI線索
// ═════════════════════════════════════════════════════════════════════════════
const Scene52Prompts: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const ranges = [[115, 614], [614, 1330], [1330, 1984]];
  const active = frame < 614 ? 0 : frame < 1330 ? 1 : 2;
  const pTabs = win(frame, 0, 1984);
  const pEnd = win(frame, 1984, dur + 20);
  const tabs = [{ t: "說清楚用什麼系統", at: 115 }, { t: "貼官方範本", at: 614 }, { t: "不確定就問 AI", at: 1330 }];
  const CX = 700, CW = 1010;
  const paste = interpolate(frame, [942, 990], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[15]}>
      <SectionHeader num="05" title="三個溝通技巧" accent={C.green} />
      <Layer o={pTabs}>
        <At x={210} y={300} anchor="tl">
          <div style={{ display: "flex", flexDirection: "column", gap: 20 * S }}>
            {tabs.map((t, i) => (
              frame >= t.at ? (
                <Pop key={t.t} at={t.at} kind="item">
                  <div style={{ width: 420 * S, padding: `${22 * S}px ${26 * S}px`, borderRadius: 20 * S, background: i === active ? hexA(C.green, 0.1) : C.surface, border: `${1.5 * S}px solid ${i === active ? hexA(C.green, 0.55) : C.border}`, display: "flex", alignItems: "center", gap: 18 * S, opacity: i === active ? 1 : 0.5, boxSizing: "border-box" }}>
                    <span style={{ fontFamily: MONO, fontSize: 30 * S, color: i === active ? C.green : C.muted }}>0{i + 1}</span>
                    <span style={{ fontFamily: TC, fontSize: 30 * S, color: i === active ? C.text : C.muted }}>{t.t}</span>
                  </div>
                </Pop>
              ) : null
            ))}
          </div>
        </At>
        {/* 技巧一 */}
        <Layer o={win(frame, ranges[0][0], ranges[0][1])}>
           <At x={CX} y={300} anchor="tl">
            <div style={{ width: CW * S, display: "flex", flexDirection: "column", gap: 26 * S }}>
              <Pop at={115} kind="up"><Txt size={40 * S}>直接跟 AI 說你用的是什麼系統</Txt></Pop>
              {frame >= 228 && <PromptBox at={228} text="我的資料是存在 Google 的試算表" size={48 * S} w={CW} />}
              <div style={{ display: "flex", gap: 30 * S }}>
                {frame >= 347 && <PromptBox at={347} text="我是用 Supabase" size={40 * S} w={(CW - 30) / 2} />}
                {frame >= 442 && <PromptBox at={442} text="我用 MySQL" size={40 * S} w={(CW - 30) / 2} />}
              </div>
              {frame >= 500 && <Pop at={500} kind="up"><Chip text="AI 才能準確對應你的平台來寫程式" icon="check" color={C.green} size={30 * S} /></Pop>}
            </div>
          </At>
        </Layer>
        {/* 技巧二 */}
        <Layer o={win(frame, ranges[1][0], ranges[1][1])}>
           <At x={CX} y={300} anchor="tl">
            <div style={{ width: CW * S, display: "flex", flexDirection: "column", gap: 24 * S }}>
              <Pop at={614} kind="up"><Txt size={40 * S}>附上官方的 API 文件或範例</Txt></Pop>
              {frame >= 805 && (
                <Pop at={805}>
                  <div style={{ transform: `translate(${paste * 40 * S}px, ${paste * 10 * S}px) scale(${1 - 0.04 * paste})`, padding: `${20 * S}px ${26 * S}px`, borderRadius: 18 * S, border: `${1.5 * S}px solid ${hexA(C.purple, 0.45)}`, background: hexA(C.purple, 0.05), display: "flex", flexDirection: "column", gap: 10 * S }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}><LI name="book" size={30 * S} color={C.purple} /><Txt size={24 * S} color={C.muted}>Supabase 官網 JavaScript Client 查詢範本</Txt></div>
                    <span style={{ fontFamily: MONO, fontSize: 24 * S, color: C.text, whiteSpace: "pre" }}>{"const { data, error } = await supabase"}</span>
                    <span style={{ fontFamily: MONO, fontSize: 24 * S, color: C.text, whiteSpace: "pre" }}>{"  .from('countries')"}</span>
                    <span style={{ fontFamily: MONO, fontSize: 24 * S, color: C.text, whiteSpace: "pre" }}>{"  .select()"}</span>
                  </div>
                </Pop>
              )}
              {frame >= 1016 && <PromptBox at={1016} text="請依照這個範本幫我寫資料的存取層" size={40 * S} w={CW} />}
              {frame >= 1139 && <Pop at={1139}><Chip text="直接生成可以跑的程式碼" icon="check" color={C.green} size={28 * S} /></Pop>}
            </div>
          </At>
        </Layer>
        {/* 技巧三 */}
        <Layer o={win(frame, ranges[2][0], ranges[2][1])}>
           <At x={CX} y={300} anchor="tl">
            <div style={{ width: CW * S, display: "flex", flexDirection: "column", gap: 26 * S }}>
              <Pop at={1330} kind="up"><Txt size={40 * S}>不確定需求 直接問 AI</Txt></Pop>
              {frame >= 1528 && <PromptBox at={1528} text="我這個需求用 Google 的試算表可以做到嗎？會有什麼樣的限制呢？" size={36 * S} w={CW} />}
              {frame >= 1735 && <PromptBox at={1735} text="我需要做語意的搜尋，應該要選哪一種儲存的後端？" size={36 * S} w={CW} />}
              {frame >= 1856 && <Pop at={1856} kind="up"><Txt size={28 * S} color={C.muted}>先讓 AI 評估技術的可行性 再做決定</Txt></Pop>}
            </div>
          </At>
        </Layer>
      </Layer>
      <Layer o={pEnd}>
        <At x={960} y={460}>{frame >= 2078 && <KeyLine at={2078} lead="這三個技巧" main="多給 AI 一些線索" color={C.green} size={80 * S} />}</At>
        <At x={960} y={650}>{frame >= 2078 && <Pop at={2096} kind="up"><Txt size={36 * S} color={C.muted}>它就會給你更精準的回答</Txt></Pop>}</At>
        <At x={960} y={300}><Pop at={1984} kind="up"><div style={{ display: "flex", gap: 20 * S }}>{[1, 2, 3].map((n) => <div key={n} style={{ width: 70 * S, height: 70 * S, borderRadius: 99, border: `${1.5 * S}px solid ${hexA(C.green, 0.6)}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: MONO, fontSize: 28 * S, color: C.green }}>0{n}</span></div>)}</div></Pop></At>
      </Layer>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 6.1 — 五點重點：上方五個節點沿線亮起（顏色對回各段），下方只放正在講的那一點 → 音檔結束後無聲回家作業卡（240f）
// cues: 118 整理重點 | 221 第一個 | 348 持久化 | 418 資料庫負責 | 492 快速找到 | 612 第二個KISS | 710 最簡單方式 | 780 試算表
//   876 效能問題再升級 | 970 不要太複雜 | 1070 第三個 | 1181 MySQL PostgreSQL | 1296 Supabase | 1426 搭配AI | 1534 第四個
//   1685 檔案儲存 | 1817 向量 | 1918 統計分析 | 2057 分析型倉儲 | 2131 前兩種夠用 | 2299 最後一點 | 2400 告訴它 | 2520 官方範例
//   2599 直接使用的程式碼 | [2718–2958 回家作業卡]
// ═════════════════════════════════════════════════════════════════════════════
const Scene61Recap: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pMain = win(frame, 0, HW_AT);
  const pHW = win(frame, HW_AT, HW_AT + HW_F);
  const hwT = interpolate(frame, [HW_AT, HW_AT + HW_F], [0, 1], clamp);
  type Tk = { at: number; end: number; c: string; i: string; main: string; chips: { t: string; at: number; c?: string; i?: string }[] };
  const tks: Tk[] = [
    { at: 221, end: 612, c: C.green, i: "database", main: "資料庫幫系統把資料存下來", chips: [{ t: "持久化", at: 348 }, { t: "快速找到你要的資料", at: 492 }] },
    { at: 612, end: 1070, c: C.yellow, i: "table", main: "KISS 先用最簡單的方式開始", chips: [{ t: "試算表就很好用", at: 780 }, { t: "遇到效能問題再升級", at: 876 }, { t: "架構不要一開始就太複雜", at: 970 }] },
    { at: 1070, end: 1534, c: C.purple, i: "server", main: "正式資料庫 MySQL · PostgreSQL", chips: [{ t: "新手從 Supabase 入手", at: 1296 }, { t: "操作簡單 適合搭配 AI", at: 1426 }] },
    { at: 1534, end: 2299, c: C.orange, i: "layers", main: "不同型別的資料 存的方式不一樣", chips: [{ t: "檔案儲存", at: 1685, c: C.orange, i: "folder" }, { t: "向量", at: 1817, c: C.green, i: "vector" }, { t: "分析型倉儲", at: 2057, c: C.pink, i: "chart" }] },
    { at: 2299, end: HW_AT, c: C.green, i: "robot", main: "告訴 AI 你用的是哪一種資料庫", chips: [{ t: "必要時附上官方範例", at: 2520 }, { t: "產生可以直接使用的程式碼", at: 2599 }] },
  ];
  const active = tks.reduce((a, t, i) => (frame >= t.at ? i : a), -1);
  const lineP = interpolate(frame, [221, 2299], [0, 1], clamp);
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[16]}>
      <Layer o={pMain}>
        <SectionHeader num="重點整理" title="本單元五件事" accent={C.green} />
        <svg width={W} height={H} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
          <line x1={360} y1={330} x2={1560} y2={330} stroke={C.border} strokeWidth={3} />
          <line x1={360} y1={330} x2={360 + 1200 * lineP} y2={330} stroke={hexA(C.green, 0.5)} strokeWidth={3} />
        </svg>
        {tks.map((t, i) => {
          const x = 360 + i * 300;
          const on = frame >= t.at;
          const isA = i === active;
          return (
            <At key={i} x={x} y={330}>
              <Pop at={118 + i * 6}>
                <div style={{ width: (isA ? 130 : 100) * S, height: (isA ? 130 : 100) * S, borderRadius: 99, background: on ? hexA(t.c, isA ? 0.18 : 0.08) : C.surface, border: `${(isA ? 2.5 : 1.5) * S}px solid ${on ? hexA(t.c, isA ? 0.9 : 0.45) : C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {on && !isA ? <LI name="check" size={44 * S} color={hexA(t.c, 0.8)} sw={2.4} /> : <LI name={t.i} size={(isA ? 62 : 46) * S} color={on ? t.c : C.faint} />}
                </div>
              </Pop>
            </At>
          );
        })}
        {tks.map((t, i) => (
          <At key={i} x={360 + i * 300} y={440}><Pop at={118 + i * 6}><span style={{ fontFamily: MONO, fontSize: 24 * S, color: i === active ? t.c : C.faint }}>0{i + 1}</span></Pop></At>
        ))}
        <At x={960} y={640}>{frame >= 118 && frame < 221 && <Pop at={118}><Txt size={44 * S} color={C.muted}>快速整理一下重點</Txt></Pop>}</At>
        {tks.map((t, i) => (
          <Layer key={i} o={win(frame, t.at, t.end)}>
            <At x={960} y={600}><Pop at={t.at}><span style={{ fontFamily: TC, fontSize: 66 * S, color: C.text, fontWeight: 500, whiteSpace: "nowrap" }}>{t.main}</span></Pop></At>
            <At x={960} y={760}>
              <div style={{ display: "flex", gap: 24 * S, alignItems: "center" }}>
                {t.chips.map((c) => (frame >= c.at ? <Pop key={c.t} at={c.at}><Chip text={c.t} icon={c.i} color={c.c ?? t.c} size={32 * S} /></Pop> : null))}
              </div>
            </At>
            {i === 3 && <At x={960} y={860}>{frame >= 2131 && <Pop at={2131} kind="up"><Txt size={28 * S} color={C.muted}>對大多數初學者來說 前兩種就很夠用</Txt></Pop>}</At>}
          </Layer>
        ))}
      </Layer>
      {/* 無聲回家作業卡 */}
      <AbsoluteFill style={{ opacity: pHW, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {frame >= HW_AT && (
          <Pop at={HW_AT}>
            <div style={{ width: 1500 * S, padding: `${56 * S}px ${64 * S}px`, borderRadius: 30 * S, background: C.surface, border: `${2 * S}px solid ${hexA(C.green, 0.45)}`, display: "flex", flexDirection: "column", gap: 34 * S, boxSizing: "border-box" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 * S }}>
                <svg width={70 * S} height={70 * S} viewBox="0 0 40 40"><circle cx={20} cy={20} r={16} fill="none" stroke={C.border} strokeWidth={3} /><circle cx={20} cy={20} r={16} fill="none" stroke={C.green} strokeWidth={3} pathLength={1} strokeDasharray={`${1 - hwT} 1`} transform="rotate(-90 20 20)" /></svg>
                <span style={{ fontFamily: MONO, fontSize: 30 * S, color: C.green, letterSpacing: "0.18em" }}>回家作業</span>
              </div>
              <span style={{ fontFamily: TC, fontSize: 50 * S, color: C.text }}>拿你手上的專案 選一個儲存方案</span>
              <div style={{ display: "flex", gap: 20 * S }}>
                <Chip text="Google 試算表" icon="table" color={C.yellow} size={30 * S} />
                <Chip text="Supabase" icon="box" color={C.purple} size={30 * S} />
                <Chip text="MySQL · PostgreSQL" icon="database" color={C.blue} size={30 * S} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 24 * S, flexWrap: "wrap" }}>
                <span style={{ fontFamily: TC, fontSize: 44 * S, color: C.text }}>用</span>
                <span style={{ fontFamily: TC, fontSize: 44 * S, color: C.green, padding: `${6 * S}px ${20 * S}px`, borderRadius: 14 * S, border: `${1.5 * S}px solid ${hexA(C.green, 0.5)}`, background: "#0f0f16" }}>我的資料存在＿＿</span>
                <span style={{ fontFamily: TC, fontSize: 44 * S, color: C.text }}>開頭 請 AI 幫你寫存資料的程式</span>
              </div>
            </div>
          </Pop>
        )}
      </AbsoluteFill>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// 6.2 — 第二章總結：開發生命週期 rail 亮第 3 步「解法設計」→ 七個技術關鍵字依旁白點亮 → 需求對到關鍵字連線
//        → rail 推進到第 4 步「實作」，發光大卡預告（全片唯一發光）
// cues: 0 第三個步驟 | 113 解法設計 | 284 平台 | 380 程式語言 | 461 前端後端 | 526 API爬蟲部署資料庫（cue 內依字位：API 539 / 爬蟲 564 / 部署 583 / 資料庫 609）
//   691 章節一開始 | 792 解法設計時 | 841 技術關鍵字 | 935 告訴AI走哪條路 | 1006 網頁前後端 | 1157 跨服務API | 1236 公開部署
//   1319 長期儲存資料庫 | 1436 這個章節之後 | 1566 對應在一起 | 1652 下個課程 | 1698 第四個步驟 | 1814 實作 | 1920 除錯技巧
//   1999 版本控制 | 2066 辛苦了 | 2138 下堂課見
// ═════════════════════════════════════════════════════════════════════════════
const Scene62Chapter: React.FC<SceneProps> = ({ callouts, dur }) => {
  const frame = useCurrentFrame();
  const pMap = win(frame, 0, 1652);
  const pNext = win(frame, 1652, dur + 20);
  const glow = 0.22 + 0.1 * Math.sin((frame - 1814) / 30);
  const move = interpolate(frame, [792, 840], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const kws = [
    { t: "平台", i: "globe", c: C.orange, at: 284, gx: 480, gy: 500 },
    { t: "程式語言", i: "code", c: C.yellow, at: 380, gx: 800, gy: 500 },
    { t: "前端與後端", i: "browser", c: C.blue, at: 461, gx: 1120, gy: 500, need: { t: "做網頁", at: 1006, y: 390 } },
    { t: "API", i: "plug", c: C.purple, at: 539, gx: 1440, gy: 500, need: { t: "跨服務的串接", at: 1157, y: 520 } },
    { t: "爬蟲", i: "spider", c: C.pink, at: 564, gx: 640, gy: 700 },
    { t: "部署", i: "upload", c: C.teal, at: 583, gx: 960, gy: 700, need: { t: "把網站公開", at: 1236, y: 650 } },
    { t: "資料庫", i: "database", c: C.green, at: 609, gx: 1280, gy: 700, need: { t: "長期儲存資料", at: 1319, y: 780 } },
  ];
  const railStep = frame >= 1698 ? 4 : 3;
  const railMove = interpolate(frame, [1698, 1740], [0, 1], clamp);
  return (
    <Shell callouts={callouts} dur={dur} accent={C.green} pct={PROGRESS_PCT[17]}>
      {/* 開發生命週期 rail（常駐） */}
      <At x={960} y={200}>
        <Pop at={0}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
            <span style={{ fontFamily: TC, fontSize: 24 * S, color: C.muted, marginRight: 14 * S }}>軟體開發生命週期</span>
            {Array.from({ length: 7 }).map((_, i) => {
              const n = i + 1;
              const isNow = n === railStep;
              const done = n < railStep;
              const name = n === 3 ? "解法設計" : n === 4 ? "實作" : "";
              const lit = n === 3 ? interpolate(frame, [113, 130], [0, 1], clamp) : n === 4 ? railMove : 0;
              const col = isNow ? (n === 4 ? C.green : C.yellow) : done ? hexA(C.green, 0.7) : C.faint;
              return (
                <React.Fragment key={n}>
                  {i > 0 && <div style={{ width: 34 * S, height: 2 * S, background: n <= railStep ? hexA(C.green, 0.5) : C.border }} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 * S, padding: name ? `${8 * S}px ${18 * S}px` : 0, borderRadius: 99, border: name ? `${1.5 * S}px solid ${isNow ? hexA(col, 0.4 + 0.5 * lit) : C.border}` : "none", background: isNow ? hexA(col, 0.12 * lit) : "transparent" }}>
                    <span style={{ width: 40 * S, height: 40 * S, borderRadius: 99, border: `${1.5 * S}px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 20 * S, color: col }}>{done && n !== 3 ? <LI name="check" size={22 * S} color={col} sw={2.6} /> : n}</span>
                    {name && <span style={{ fontFamily: TC, fontSize: 28 * S, color: isNow ? C.text : C.muted }}>{name}</span>}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </Pop>
      </At>
      <Layer o={pMap}>
        <At x={960} y={330}>{frame >= 238 && frame < 792 && <Pop at={238} kind="up"><Txt size={30 * S} color={C.muted}>解法設計需要理解的關鍵技術概念</Txt></Pop>}</At>
        <At x={960} y={300}>{frame >= 841 && <Pop at={841} kind="up"><Txt size={30 * S} color={C.muted}>用技術關鍵字告訴 AI 要走哪一條路</Txt></Pop>}</At>
        {kws.map((k) => {
          const rel = !!k.need;
          const tx = rel ? 1340 : k.gx;
          const ty = rel ? k.need!.y : k.gy;
          const x = k.gx + (tx - k.gx) * move;
          const y = k.gy + (ty - k.gy) * move;
          const o = rel ? 1 : 1 - move;
          const needOn = rel && frame >= k.need!.at;
          return (
            <At key={k.t} x={x} y={y} o={o}>
              {frame >= k.at && (
                <Pop at={k.at}>
                  <div style={{ width: 300 * S, display: "flex", alignItems: "center", gap: 16 * S, padding: `${20 * S}px ${24 * S}px`, borderRadius: 20 * S, background: hexA(k.c, frame >= 792 && !needOn ? 0.04 : 0.1), border: `${1.5 * S}px solid ${hexA(k.c, frame >= 792 && !needOn ? 0.25 : 0.6)}`, boxSizing: "border-box" }}>
                    <LI name={k.i} size={50 * S} color={k.c} />
                    <span style={{ fontFamily: TC, fontSize: 34 * S, color: C.text, whiteSpace: "nowrap" }}>{k.t}</span>
                  </div>
                </Pop>
              )}
            </At>
          );
        })}
        {kws.filter((k) => k.need).map((k) => (
          <React.Fragment key={k.t}>
            <At x={560} y={k.need!.y}>{frame >= k.need!.at && <Pop at={k.need!.at}><Chip text={k.need!.t} color={C.text} size={32 * S} /></Pop>}</At>
            {frame >= k.need!.at && <Wire x1={720} y1={k.need!.y} x2={1180} y2={k.need!.y} at={k.need!.at + 6} color={k.c} march={frame > k.need!.at + 30} />}
          </React.Fragment>
        ))}
        <At x={960} y={880}>{frame >= 1566 && <Pop at={1566}><Txt size={30 * S} color={C.green}>需求跟技術關鍵字對應在一起</Txt></Pop>}</At>
      </Layer>
      {/* 發光大卡：下集預告 實作（全片唯一發光） */}
      <AbsoluteFill style={{ opacity: pNext, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 * S, paddingTop: 80 * S }}>
        {frame >= 1652 && (
          <Pop at={1698}>
            <div style={{ width: 1500 * S, padding: `${60 * S}px ${60 * S}px`, borderRadius: 34 * S, background: `linear-gradient(135deg, ${hexA(C.green, 0.12)}, ${hexA(C.green, 0.04)})`, border: `${3 * S}px solid ${hexA(C.green, 0.5)}`, boxShadow: `0 0 ${80 * S}px ${hexA(C.green, frame >= 1814 ? glow : 0.12)}`, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 28 * S, boxSizing: "border-box" }}>
              <span style={{ fontFamily: MONO, fontSize: 26 * S, color: C.green, letterSpacing: "0.18em" }}>下集預告 · 第四個步驟</span>
              <span style={{ fontFamily: TC, fontSize: 120 * S, color: frame >= 1814 ? C.green : C.text, fontWeight: 600 }}>實作</span>
              <div style={{ display: "flex", gap: 24 * S, minHeight: 70 * S }}>
                {frame >= 1920 && <Pop at={1920}><Chip text="好用的除錯技巧" icon="bug" color={C.green} size={32 * S} /></Pop>}
                {frame >= 1999 && <Pop at={1999}><Chip text="版本控制的方法" icon="branch" color={C.green} size={32 * S} /></Pop>}
              </div>
            </div>
          </Pop>
        )}
        <div style={{ minHeight: 60 * S }}>
          {frame >= 2066 && frame < 2138 && <Pop at={2066} kind="up"><Txt size={34 * S} color={C.muted}>同學們辛苦了</Txt></Pop>}
          {frame >= 2138 && <Pop at={2138} kind="up"><Txt size={34 * S} color={C.muted}>我們下堂課見</Txt></Pop>}
        </div>
      </AbsoluteFill>
    </Shell>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// Root
// ═════════════════════════════════════════════════════════════════════════════
const SCENES: React.FC<SceneProps>[] = [
  Scene01Open, Scene11Memory, Scene12Index, Scene13Table, Scene14Fk,
  Scene21Light, Scene22Kiss, Scene31Two, Scene32Supa,
  Scene41Beyond, Scene42Object, Scene43Vector, Scene44Warehouse, Scene45OneStop,
  Scene51Tell, Scene52Prompts, Scene61Recap, Scene62Chapter,
];

export const FullVideo16: React.FC = () => {
  const getCallouts = (s: number, e: number) =>
    GLOBAL_CALLOUTS.map((c) => ({ ...c, from: c.from - s, to: c.to - s })).filter((c) => c.from >= -FADE_OUT_F && c.from < e - s);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/course_background_music.wav")} volume={0.1} loop />
      <Sequence from={0} durationInFrames={HOOK_F}>
        <HookScene dur={HOOK_F} />
      </Sequence>
      {SEG_STARTS_16.map((start, i) => {
        const Scene = SCENES[i];
        const dur = SEG_DURATIONS[i];
        const src = staticFile(`audio/2-9/2-9_${SEG_KEYS[i]}-normalized.wav`);
        return (
          <Sequence key={i} from={start} durationInFrames={dur}>
            <Sequence from={0} durationInFrames={AUDIO_F[i]}><Audio src={src} /></Sequence>
            <Scene callouts={getCallouts(start, start + dur)} dur={dur} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
