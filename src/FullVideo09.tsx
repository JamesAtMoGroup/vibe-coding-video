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
// Design System (mirrors FullVideo08.tsx — CH 2-2)
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
  red:          "#ff6b6b",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const W = 3840;
const H = 2160;
const NAV_H      = 72  * S;
const SUBTITLE_H = 160 * S;
const CONTAINER_W = 1500 * S;

// ─────────────────────────────────────────────────────────────────────────────
// Segments — CH 2-2 (locked timing from VTT durations)
// ─────────────────────────────────────────────────────────────────────────────
export const SEG_STARTS_09 = [0, 1324, 3504, 5901, 8971, 13335, 15534, 17891];
export const TOTAL_FRAMES_09 = 20769;

const SEG_DURATIONS = [1324, 2180, 2397, 3070, 4364, 2199, 2357, 2878];

// ─────────────────────────────────────────────────────────────────────────────
// Global Callouts (global frame = scene_start + local). NO sender (identity).
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

function usePulse(startFrame: number, period = 60): number {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  return 1 + 0.04 * Math.sin((f / period) * Math.PI * 2);
}

// blockFade — fade a frame-gated in-flow block out as the next block arrives
function useBlockFade(nextStart: number | null): number {
  const frame = useCurrentFrame();
  if (nextStart === null) return 1;
  return interpolate(frame, [nextStart - 20, nextStart], [1, 0], clamp);
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
        transform: `scale(${pulse})`, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -200 * S, left: -200 * S,
        width: 500 * S, height: 500 * S,
        background: `radial-gradient(circle, rgba(124,255,178,${0.04 * bgAlpha}) 0%, transparent 70%)`,
        transform: `scale(${1 + 0.02 * Math.sin(frame / 90 + 1)})`, pointerEvents: "none",
      }} />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProgressBar — CH 2-2
// ─────────────────────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ progressPct?: number }> = ({ progressPct = 100 }) => {
  const frame = useCurrentFrame();
  const slideY = interpolate(frame, [0, 18], [-NAV_H, 0], clamp);
  return (
    <div style={{
      position: "absolute", top: slideY, left: 0, right: 0, zIndex: 100,
      background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      borderBottom: `1px solid ${C.border}`, padding: `${14 * S}px ${40 * S}px`,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted,
        letterSpacing: "0.05em", marginBottom: 8 * S,
      }}>
        <Img src={staticFile("aischool-logo.webp")} style={{ height: 22 * S, width: "auto", mixBlendMode: "screen", opacity: 0.9 }} />
        <span style={{ fontSize: 20 * S, color: C.muted }}>CH 2-2</span>
      </div>
      <div style={{ height: 3 * S, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progressPct}%`, background: C.primary, borderRadius: 99, boxShadow: "0 0 8px rgba(124,255,178,0.5)" }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ num: string; title: string; startFrame: number }> = ({ num, title, startFrame }) => {
  const headerStyle = useFadeUpHeader(startFrame);
  const lineStyle = useAccentLine(startFrame + 8);
  return (
    <div style={{ marginBottom: 28 * S, ...headerStyle }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 * S }}>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.primary,
          background: "rgba(124,255,178,0.1)", border: "1px solid rgba(124,255,178,0.3)",
          padding: `${6 * S}px ${16 * S}px`, borderRadius: 99, whiteSpace: "nowrap" as const,
          letterSpacing: "0.06em", boxShadow: "0 0 14px rgba(124,255,178,0.12)",
        }}>{num}</span>
        <h2 style={{
          fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 44 * S, fontWeight: 800,
          letterSpacing: "-0.02em", color: C.text, margin: 0,
        }}>{title}</h2>
      </div>
      <div style={{
        height: 2 * S, background: C.primary, borderRadius: 99, marginTop: 10 * S,
        boxShadow: "0 0 10px rgba(124,255,178,0.4)", ...lineStyle,
      }} />
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
    padding: `${26 * S}px ${36 * S}px`, marginBottom, ...fadeStyle,
  }}>
    <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 28 * S, color: C.text, lineHeight: 1.8, margin: 0 }}>
      {children}
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// iMessage Callout (NO sender row — identity protection)
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
      position: "absolute", top: NAV_H + NOTIF_TOP + totalYPush, right: NOTIF_RIGHT, width: NOTIF_W,
      transform: `translateY(${slideY}px)`, opacity: opacity * depthAlpha, pointerEvents: "none", zIndex: 200,
    }}>
      <div style={{
        background: "rgba(28,28,30,0.9)", backdropFilter: "blur(48px)", WebkitBackdropFilter: "blur(48px)",
        border: `${1 * S}px solid rgba(255,255,255,0.13)`, borderRadius: 14 * S,
        boxShadow: `0 ${8 * S}px ${40 * S}px rgba(0,0,0,0.6)`, padding: `${10 * S}px ${14 * S}px`,
        display: "flex", gap: 11 * S, alignItems: "flex-start",
      }}>
        <div style={{
          width: iconSize, height: iconSize, borderRadius: 9 * S,
          background: "linear-gradient(145deg, #3DDC6A 0%, #25A244 100%)",
          boxShadow: `0 ${2 * S}px ${10 * S}px rgba(52,199,89,0.45)`, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
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
    <div style={{ width: CONTAINER_W, margin: "0 auto", paddingTop: 40 * S, paddingBottom: 40 * S }}>
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Small shared pieces
// ─────────────────────────────────────────────────────────────────────────────
const Pill: React.FC<{ label: string; color?: string; style?: React.CSSProperties }> = ({ label, color = C.primary, style }) => (
  <div style={{
    background: `${color}1a`, border: `1.5px solid ${color}66`, borderRadius: 99,
    padding: `${12 * S}px ${30 * S}px`, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
    fontSize: 26 * S, fontWeight: 700, color, letterSpacing: "0.03em",
    boxShadow: `0 0 18px ${color}2e`, ...style,
  }}>{label}</div>
);

const Arrow: React.FC<{ color?: string }> = ({ color = "rgba(255,255,255,0.4)" }) => (
  <div style={{ display: "flex", alignItems: "center", padding: `0 ${12 * S}px` }}>
    <div style={{ width: 32 * S, height: 3 * S, background: color }} />
    <div style={{ width: 0, height: 0, borderTop: `${9 * S}px solid transparent`, borderBottom: `${9 * S}px solid transparent`, borderLeft: `${15 * S}px solid ${color}` }} />
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 0.1 — Open (0–1324)
// ═════════════════════════════════════════════════════════════════════════════
const Scene01Open: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[0];

  const chipsStart = 676;
  const kwStart    = 1202;

  const badge = useFadeUp(20);
  const title = useFadeUpHeader(45);
  const desc  = useFadeUp(80);

  const headerFade = interpolate(frame, [kwStart - 30, kwStart], [1, 0], clamp);

  const chip1 = useFadeUpItem(chipsStart);
  const chip2 = useFadeUpItem(chipsStart + 14);
  const chip3 = useFadeUpItem(chipsStart + 28);
  const chipsFade = useBlockFade(kwStart);

  const kw = useFadeUpElastic(kwStart);
  const kwLine = useAccentLine(kwStart + 12);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={12} />
        <SceneWrap>
          {/* Header (fades before keyword takeover) */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 24 * S, ...badge, opacity: badge.opacity * headerFade }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.primary, border: `1px solid ${C.primary}`, padding: `${4 * S}px ${14 * S}px`, borderRadius: 99, letterSpacing: "0.05em", textShadow: "0 0 10px rgba(124,255,178,0.4)" }}>CH 2-2</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: `${4 * S}px ${12 * S}px`, borderRadius: 99 }}>SDLC · 解題思維</span>
          </div>
          <div style={{ marginBottom: 28 * S, ...title, opacity: title.opacity * headerFade }}>
            <h1 style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 60 * S, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.02em", color: C.text, margin: 0 }}>
              工程師解題思維：<br />
              <span style={{ color: C.primary }}>Top-Down vs Bottom-Up</span>
            </h1>
          </div>
          <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: C.muted, lineHeight: 1.7, maxWidth: 1150 * S, marginBottom: 44 * S, ...desc, opacity: desc.opacity * headerFade }}>
            上個單元學了解法設計；這個單元，來聊跟 AI 協作的兩種解題思維——情境不同，用法也不同。
          </p>

          {/* Block A: 萬用句型 recap chips */}
          {frame >= chipsStart - 6 && frame < kwStart - 6 && (
            <div style={{ opacity: chipsFade }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 22 * S }}>你已經學過的萬用句型</div>
              <div style={{ display: "flex", gap: 18 * S }}>
                {[{ l: "現況", s: chip1 }, { l: "痛點", s: chip2 }, { l: "期待", s: chip3 }].map(({ l, s }) => (
                  <div key={l} style={s}><Pill label={l} /></div>
                ))}
              </div>
            </div>
          )}

          {/* Block B: Top-Down keyword reveal */}
          {frame >= kwStart - 6 && (
            <div style={{ ...kw, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", paddingTop: 80 * S }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 24 * S, color: C.muted, letterSpacing: "0.18em", marginBottom: 20 * S }}>這套方式有個正式名稱</div>
              <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 120 * S, fontWeight: 900, color: C.text, letterSpacing: "0.02em", textShadow: "0 0 36px rgba(124,255,178,0.3)" }}>Top-Down</div>
              <div style={{ height: 6 * S, background: C.primary, borderRadius: 99, marginTop: 18 * S, maxWidth: 520 * S, boxShadow: "0 0 20px rgba(124,255,178,0.6)", ...kwLine }} />
              <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 32 * S, color: C.primary, marginTop: 22 * S, fontWeight: 700 }}>由上而下的思維</div>
            </div>
          )}
        </SceneWrap>
        <CalloutLayer callouts={callouts} />
      </AbsoluteFill>
    </SceneFade>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 1.1 — Top-Down (1324–3504)
// ═════════════════════════════════════════════════════════════════════════════
const Scene11TopDown: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[1];

  const flowStart = 130;
  const defStart  = 906;
  const tipStart  = 1726;

  const descStyle = useFadeUp(30);
  const flow = useFadeUpElastic(flowStart);
  const fb1 = useFadeUpItem(flowStart + 10);
  const fb2 = useFadeUpItem(flowStart + 30);
  const flowFade = useBlockFade(defStart);

  const def = useFadeUpElastic(defStart);
  const defFade = useBlockFade(tipStart);

  const tip = useFadeUpElastic(tipStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={24} />
        <SceneWrap>
          <SectionHeader num="01" title="Top-Down：你已經會的方法" startFrame={0} />
          <Card fadeStyle={descStyle}>
            假設你肚子餓，想外送一碗<span style={{ color: C.primary, fontWeight: 700 }}>牛肉麵</span>——你只說「想吃什麼」，細節交給平台和餐廳。
          </Card>

          {/* Block A: 牛肉麵外送 flow */}
          {frame < defStart - 6 && (
            <div style={{ ...flow, opacity: flow.opacity * flowFade }}>
              <div style={{ display: "flex", alignItems: "stretch", gap: 0, marginTop: 16 * S }}>
                <div style={{ flex: 1, background: "rgba(124,255,178,0.08)", border: `2px solid rgba(124,255,178,0.4)`, borderRadius: 22 * S, padding: `${30 * S}px ${28 * S}px`, textAlign: "center" as const, ...fb1 }}>
                  <div style={{ fontSize: 64 * S, marginBottom: 12 * S }}>🙋</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 34 * S, fontWeight: 800, color: C.primary, marginBottom: 8 * S }}>你</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: C.text }}>「我要一碗牛肉麵」</div>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}><Arrow color="rgba(124,255,178,0.5)" /></div>
                <div style={{ flex: 1.3, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 22 * S, padding: `${30 * S}px ${28 * S}px`, textAlign: "center" as const, ...fb2 }}>
                  <div style={{ fontSize: 64 * S, marginBottom: 12 * S }}>🍜</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 34 * S, fontWeight: 800, color: C.text, marginBottom: 8 * S }}>平台 + 餐廳</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 24 * S, color: C.muted, lineHeight: 1.6 }}>麵條幾克、湯頭熬幾小時——<span style={{ color: C.primary }}>細節全幫你補</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Block B: definition + Vibe Coding */}
          {frame >= defStart - 6 && frame < tipStart - 6 && (
            <div style={{ ...def, opacity: def.opacity * defFade, marginTop: 16 * S }}>
              <div style={{ background: "rgba(124,255,178,0.06)", border: `2px solid rgba(124,255,178,0.45)`, borderRadius: 28 * S, padding: `${44 * S}px ${56 * S}px`, boxShadow: "0 0 50px rgba(124,255,178,0.16)" }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.primary, letterSpacing: "0.14em", marginBottom: 18 * S }}>DEFINITION</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 44 * S, fontWeight: 800, lineHeight: 1.5, color: C.text }}>
                  描述你要的<span style={{ color: C.primary }}>結果</span>，由 AI 補齊中間所有細節。
                </div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 30 * S, color: C.muted, marginTop: 20 * S, lineHeight: 1.6 }}>
                  這正是 <span style={{ color: C.primary, fontWeight: 700 }}>Vibe Coding</span> 的核心精神——靠感覺把東西做出來。
                </div>
              </div>
            </div>
          )}

          {/* Block C: 句型越完整 → 成功率越高 */}
          {frame >= tipStart - 6 && (
            <div style={{ ...tip, marginTop: 16 * S }}>
              <div style={{ background: "rgba(124,255,178,0.04)", border: "1px solid rgba(124,255,178,0.2)", borderRadius: 18 * S, padding: `${36 * S}px ${44 * S}px`, display: "flex", alignItems: "center", gap: 36 * S }}>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 40 * S, fontWeight: 900, color: C.primary, whiteSpace: "nowrap" as const }}>句型越完整</div>
                <Arrow color="rgba(124,255,178,0.6)" />
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 34 * S, color: "#c8ffe0", lineHeight: 1.5 }}>AI 越懂你的想法，對話<span style={{ color: C.primary, fontWeight: 700 }}>越不容易跑偏</span></div>
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
// SCENE 2.1 — Top-Down Limit (3504–5901)
// ═════════════════════════════════════════════════════════════════════════════
const Scene21Limit: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[2];

  const symStart   = 390;
  const causeStart = 1299;
  const pivotStart = 1960;

  const descStyle = useFadeUp(30);
  const sym1 = useFadeUpItem(symStart);
  const sym2 = useFadeUpItem(symStart + 20);
  const symFade = useBlockFade(causeStart);

  const cause = useFadeUpElastic(causeStart);
  const cb1 = useFadeUpItem(causeStart + 12);
  const cb2 = useFadeUpItem(causeStart + 28);
  const cb3 = useFadeUpItem(causeStart + 44);
  const causeFade = useBlockFade(pivotStart);

  const pivot = useFadeUpElastic(pivotStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={36} />
        <SceneWrap>
          <SectionHeader num="02" title="Top-Down 什麼時候會失靈？" startFrame={0} />
          <Card fadeStyle={descStyle}>
            Top-Down 很好用，但它<span style={{ color: C.yellow, fontWeight: 700 }}>有極限</span>。你一定遇過這些情況——
          </Card>

          {/* Block A: symptoms */}
          {frame < causeStart - 6 && (
            <div style={{ opacity: symFade, display: "flex", flexDirection: "column" as const, gap: 18 * S, marginTop: 16 * S }}>
              {[
                { icon: "🔁", s: sym1, t: "跟 AI 來回改了十幾輪，最後連自己都搞不清楚原本要什麼" },
                { icon: "🌀", s: sym2, t: "AI 一直冒出你沒要求的東西，叫它修，又生出別的問題" },
              ].map(({ icon, s, t }, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 24 * S, background: "rgba(255,209,102,0.06)", border: "1px solid rgba(255,209,102,0.25)", borderRadius: 18 * S, padding: `${28 * S}px ${34 * S}px`, ...s }}>
                  <span style={{ fontSize: 56 * S }}>{icon}</span>
                  <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 30 * S, color: "#ffe8a0", lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
            </div>
          )}

          {/* Block B: cause flow */}
          {frame >= causeStart - 6 && frame < pivotStart - 6 && (
            <div style={{ ...cause, opacity: cause.opacity * causeFade, marginTop: 16 * S }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 26 * S }}>為什麼會這樣？</div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 * S }}>
                <div style={{ ...cb1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16 * S, padding: `${24 * S}px ${32 * S}px`, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 30 * S, color: C.text }}>任務越複雜、邊界越不清</div>
                <div style={{ display: "flex", justifyContent: "center", transform: "rotate(90deg)" }}><Arrow color="rgba(255,107,107,0.55)" /></div>
                <div style={{ ...cb2, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 16 * S, padding: `${24 * S}px ${32 * S}px`, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 30 * S, color: "#ffc9c9" }}>AI 拿到一個<span style={{ color: C.red, fontWeight: 700 }}>模糊的大需求</span></div>
                <div style={{ display: "flex", justifyContent: "center", transform: "rotate(90deg)" }}><Arrow color="rgba(255,107,107,0.55)" /></div>
                <div style={{ ...cb3, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 16 * S, padding: `${24 * S}px ${32 * S}px`, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 30 * S, color: "#ffc9c9" }}>只能用<span style={{ color: C.red, fontWeight: 700 }}>自己的方式詮釋</span>——不一定是你要的</div>
              </div>
            </div>
          )}

          {/* Block C: pivot */}
          {frame >= pivotStart - 6 && (
            <div style={{ ...pivot, marginTop: 16 * S }}>
              <div style={{ background: "rgba(124,255,178,0.06)", border: `2px solid rgba(124,255,178,0.45)`, borderRadius: 28 * S, padding: `${48 * S}px ${56 * S}px`, textAlign: "center" as const, boxShadow: "0 0 50px rgba(124,255,178,0.16)" }}>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 30 * S, color: C.muted, marginBottom: 16 * S }}>當你發現自己在跟 AI 繞圈圈——</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 46 * S, fontWeight: 900, color: C.text, lineHeight: 1.4 }}>
                  光寫好提示詞已經不夠，<br />該換<span style={{ color: C.primary }}>工程師思維</span>重新結構問題。
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
// SCENE 3.1 — Divide & Conquer (5901–8971)
// ═════════════════════════════════════════════════════════════════════════════
const Scene31DivideConquer: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[3];

  const splitStart = 427;
  const kwStart    = 1464;
  const dailyStart = 2251;

  const descStyle = useFadeUp(30);

  const big  = useFadeUpItem(splitStart);
  const s1   = useFadeUpItem(splitStart + 24);
  const s2   = useFadeUpItem(splitStart + 38);
  const s3   = useFadeUpItem(splitStart + 52);
  const combine = useFadeUpItem(splitStart + 80);
  const splitFade = useBlockFade(kwStart);

  const kw = useFadeUpElastic(kwStart);
  const kwFade = useBlockFade(dailyStart);

  const d1 = useFadeUpElastic(dailyStart);
  const d2 = useFadeUpElastic(dailyStart + 24);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={48} />
        <SceneWrap>
          <SectionHeader num="03" title="分而治之：Bottom-Up 的底層邏輯" startFrame={0} />
          <Card fadeStyle={descStyle}>
            工程師面對複雜問題，不會一口氣全解——<span style={{ color: C.primary, fontWeight: 700 }}>先拆小</span>。
          </Card>

          {/* Block A: split flow */}
          {frame < kwStart - 6 && (
            <div style={{ opacity: splitFade, marginTop: 16 * S, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 18 * S }}>
              <div style={{ ...big, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16 * S, padding: `${20 * S}px ${48 * S}px`, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 34 * S, fontWeight: 800, color: C.text }}>一個大問題</div>
              <div style={{ transform: "rotate(90deg)" }}><Arrow color="rgba(124,255,178,0.5)" /></div>
              <div style={{ display: "flex", gap: 18 * S }}>
                {[s1, s2, s3].map((s, i) => (
                  <div key={i} style={{ ...s, background: "rgba(124,255,178,0.08)", border: `1.5px solid rgba(124,255,178,0.4)`, borderRadius: 16 * S, padding: `${20 * S}px ${30 * S}px`, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 28 * S, fontWeight: 700, color: C.primary }}>小問題 {i + 1} <span style={{ fontSize: 22 * S, color: C.muted }}>✓ AI 解</span></div>
                ))}
              </div>
              <div style={{ transform: "rotate(90deg)" }}><Arrow color="rgba(124,255,178,0.5)" /></div>
              <div style={{ ...combine, background: "rgba(124,255,178,0.12)", border: `2px solid rgba(124,255,178,0.5)`, borderRadius: 16 * S, padding: `${20 * S}px ${48 * S}px`, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 32 * S, fontWeight: 800, color: C.primary, boxShadow: "0 0 28px rgba(124,255,178,0.22)" }}>組合成大解法</div>
              <div style={{ ...combine, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 24 * S, color: C.muted, marginTop: 4 * S }}>拆不夠細？就繼續往下拆，直到 AI 能處理</div>
            </div>
          )}

          {/* Block B: keyword 分而治之 */}
          {frame >= kwStart - 6 && frame < dailyStart - 6 && (
            <div style={{ ...kw, opacity: kw.opacity * kwFade, marginTop: 16 * S, textAlign: "center" as const }}>
              <div style={{ background: "rgba(124,255,178,0.06)", border: `2px solid rgba(124,255,178,0.45)`, borderRadius: 28 * S, padding: `${48 * S}px ${56 * S}px`, boxShadow: "0 0 50px rgba(124,255,178,0.16)" }}>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 72 * S, fontWeight: 900, color: C.text, marginBottom: 14 * S }}>分而治之</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 30 * S, color: C.primary, letterSpacing: "0.08em", marginBottom: 24 * S }}>Divide and Conquer</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 30 * S, color: C.muted, lineHeight: 1.6 }}>軟體工程的老知識，<span style={{ color: C.primary, fontWeight: 700 }}>AI 非常熟</span>——用這方式合作，成功率高很多。</div>
              </div>
            </div>
          )}

          {/* Block C: daily analogies */}
          {frame >= dailyStart - 6 && (
            <div style={{ marginTop: 16 * S }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 22 * S }}>其實你日常早就在用</div>
              <div style={{ display: "flex", gap: 20 * S }}>
                <div style={{ flex: 1, ...d1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 * S, padding: `${32 * S}px ${36 * S}px` }}>
                  <div style={{ fontSize: 56 * S, marginBottom: 14 * S }}>🗓️</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 32 * S, fontWeight: 800, color: C.primary, marginBottom: 10 * S }}>年度規劃</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: C.muted, lineHeight: 1.6 }}>年目標 → 每月 → 每週，一步步推進</div>
                </div>
                <div style={{ flex: 1, ...d2, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 * S, padding: `${32 * S}px ${36 * S}px` }}>
                  <div style={{ fontSize: 56 * S, marginBottom: 14 * S }}>🍳</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 32 * S, fontWeight: 800, color: C.blue, marginBottom: 10 * S }}>複雜料理</div>
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: C.muted, lineHeight: 1.6 }}>食材分開備好，確認妥當再組合下鍋</div>
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
// SCENE 4.1 — Three Steps (8971–13335)
// ═════════════════════════════════════════════════════════════════════════════
const Scene41ThreeSteps: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[4];

  const stepsStart  = 1155;
  const step2Start  = 1789;
  const step3Start  = 2937;
  const puzzleStart = 3421;

  const descStyle = useFadeUp(30);
  const stepsFade = useBlockFade(puzzleStart);

  const st1 = useFadeUpItem(stepsStart);
  const st2 = useFadeUpItem(step2Start);
  const st3 = useFadeUpItem(step3Start);

  const pz = useFadeUpElastic(puzzleStart);
  const pz1 = useFadeUpItem(puzzleStart + 16);
  const pz2 = useFadeUpItem(puzzleStart + 32);

  const steps = [
    { st: st1, n: "STEP 1", title: "拆出最小可測功能", desc: "別想一次填完 50 份——先讓程式填好「第一個欄位」就好。成功了才往下。" },
    { st: st2, n: "STEP 2", title: "驗證後再延伸", desc: "開新對話貼進驗證過的程式，再問能不能填完所有欄位（下拉選單等特殊狀況另開對話）。" },
    { st: st3, n: "STEP 3", title: "把小功能組合起來", desc: "再開新對話，把所有驗證過的小程式貼給 AI，請它整合成完整方案。" },
  ];
  const shown = (i: number) => (i === 0 ? frame >= stepsStart - 6 : i === 1 ? frame >= step2Start - 6 : frame >= step3Start - 6);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={64} />
        <SceneWrap>
          <SectionHeader num="04" title="Bottom-Up 實戰：三個步驟" startFrame={0} />
          <Card fadeStyle={descStyle}>
            例子：要幫公司 <span style={{ color: C.primary, fontWeight: 700 }}>50 位同事</span>，一個一個把資料填進線上表單。
          </Card>

          {/* Block A: three steps (progressive) */}
          {frame < puzzleStart - 6 && (
            <div style={{ opacity: stepsFade, display: "flex", flexDirection: "column" as const, gap: 16 * S, marginTop: 8 * S }}>
              {steps.map((s, i) => shown(i) && (
                <div key={i} style={{ ...s.st, display: "flex", gap: 24 * S, alignItems: "flex-start", background: C.surface, border: `1px solid ${C.border}`, borderLeft: `5px solid ${C.primary}`, borderRadius: 16 * S, padding: `${24 * S}px ${32 * S}px` }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, fontWeight: 800, color: C.primary, background: "rgba(124,255,178,0.12)", border: "1px solid rgba(124,255,178,0.4)", borderRadius: 10 * S, padding: `${8 * S}px ${14 * S}px`, whiteSpace: "nowrap" as const, flexShrink: 0 }}>{s.n}</span>
                  <div>
                    <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 32 * S, fontWeight: 800, color: C.text, marginBottom: 8 * S }}>{s.title}</div>
                    <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: C.muted, lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Block B: puzzle analogy */}
          {frame >= puzzleStart - 6 && (
            <div style={{ ...pz, marginTop: 16 * S }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24 * S, padding: `${40 * S}px ${48 * S}px` }}>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 40 * S, fontWeight: 800, color: C.text, marginBottom: 28 * S, display: "flex", alignItems: "center", gap: 16 * S }}>
                  <span style={{ fontSize: 48 * S }}>🧩</span>就像拼一幅很大的拼圖
                </div>
                <div style={{ ...pz1, display: "flex", gap: 16 * S, marginBottom: 18 * S, flexWrap: "wrap" as const }}>
                  {["先確定邊框", "天空區", "海洋區", "陸地區", "接起來"].map((t, i) => (
                    <React.Fragment key={t}>
                      <Pill label={t} color={i === 0 ? C.yellow : i === 4 ? C.primary : C.blue} style={{ fontSize: 24 * S, padding: `${10 * S}px ${22 * S}px` }} />
                      {i < 4 && <div style={{ display: "flex", alignItems: "center", color: C.muted, fontSize: 28 * S }}>→</div>}
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ ...pz2, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 28 * S, color: "#c8ffe0", lineHeight: 1.6, background: "rgba(124,255,178,0.05)", border: "1px solid rgba(124,255,178,0.2)", borderRadius: 14 * S, padding: `${20 * S}px ${28 * S}px` }}>
                  哪一區拼錯，只要<span style={{ color: C.primary, fontWeight: 700 }}>重拼那一區</span>就好——不用整幅打散重來。
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
// SCENE 5.1 — Compare (13335–15534)
// ═════════════════════════════════════════════════════════════════════════════
const Scene51Compare: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[5];

  const cmpStart  = 420;
  const stratStart = 1519;

  const descStyle = useFadeUp(30);
  const cL = useFadeUpItem(cmpStart);
  const cR = useFadeUpItem(cmpStart + 18);
  const cmpFade = useBlockFade(stratStart);

  const strat = useFadeUpElastic(stratStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={76} />
        <SceneWrap>
          <SectionHeader num="05" title="兩種方法，各有舞台" startFrame={0} />
          <Card fadeStyle={descStyle}>
            這兩種方法<span style={{ color: C.primary, fontWeight: 700 }}>不是對立</span>，而是不同情境下各有優勢的工具。
          </Card>

          {/* Block A: compare */}
          {frame < stratStart - 6 && (
            <div style={{ opacity: cmpFade, display: "flex", gap: 22 * S, marginTop: 16 * S, alignItems: "stretch" }}>
              <div style={{ flex: 1, ...cL, background: "rgba(124,255,178,0.07)", border: `2px solid rgba(124,255,178,0.4)`, borderRadius: 22 * S, padding: `${32 * S}px ${36 * S}px` }}>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 38 * S, fontWeight: 800, color: C.primary, marginBottom: 18 * S }}>Top-Down</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 27 * S, color: "#c8ffe0", lineHeight: 1.9 }}>
                  ⚡ 快——簡單任務一句話搞定<br />
                  <span style={{ color: C.muted }}>⚠️ 複雜時容易跑偏、難定位</span>
                </div>
              </div>
              <div style={{ flex: 1, ...cR, background: "rgba(124,212,255,0.07)", border: `2px solid rgba(124,212,255,0.4)`, borderRadius: 22 * S, padding: `${32 * S}px ${36 * S}px` }}>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 38 * S, fontWeight: 800, color: C.blue, marginBottom: 18 * S }}>Bottom-Up</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 27 * S, color: "#cdeeff", lineHeight: 1.9 }}>
                  🎯 穩——每步驗證、成功率高、易定位<br />
                  <span style={{ color: C.muted }}>⏳ 前期要花時間拆、步驟較多</span>
                </div>
              </div>
            </div>
          )}

          {/* Block B: strategy */}
          {frame >= stratStart - 6 && (
            <div style={{ ...strat, marginTop: 16 * S }}>
              <div style={{ background: "rgba(124,255,178,0.06)", border: `2px solid rgba(124,255,178,0.45)`, borderRadius: 28 * S, padding: `${44 * S}px ${52 * S}px`, boxShadow: "0 0 50px rgba(124,255,178,0.16)" }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.primary, letterSpacing: "0.14em", marginBottom: 22 * S }}>怎麼選</div>
                <div style={{ display: "flex", alignItems: "center", gap: 20 * S, flexWrap: "wrap" as const }}>
                  <Pill label="先試 Top-Down" color={C.primary} />
                  <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 28 * S, color: C.muted }}>順利就省時 →</div>
                  <Pill label="跑偏改不回 → 切 Bottom-Up" color={C.blue} />
                </div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 28 * S, color: "#c8ffe0", marginTop: 24 * S, lineHeight: 1.6 }}>
                  兩個工具都會用，<span style={{ color: C.primary, fontWeight: 700 }}>任何複雜度的任務都有對應方法</span>。
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
// SCENE 6.1 — Why Tech Concepts (15534–17891)
// ═════════════════════════════════════════════════════════════════════════════
const Scene61WhyTech: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[6];

  const previewStart = 438;
  const puzzleStart  = 1465;

  const descStyle = useFadeUp(30);
  const p1 = useFadeUpItem(previewStart);
  const p2 = useFadeUpItem(previewStart + 16);
  const p3 = useFadeUpItem(previewStart + 32);
  const noteP = useFadeUpItem(previewStart + 60);
  const previewFade = useBlockFade(puzzleStart);

  const pz = useFadeUpElastic(puzzleStart);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={88} />
        <SceneWrap>
          <SectionHeader num="06" title="為什麼接下來要學技術概念？" startFrame={0} />
          <Card fadeStyle={descStyle}>
            「Bottom-Up 我懂了，但拆成小塊後，怎麼知道<span style={{ color: C.primary, fontWeight: 700 }}>每塊長怎樣</span>、要跟 AI 說什麼？」
          </Card>

          {/* Block A: preview list */}
          {frame < puzzleStart - 6 && (
            <div style={{ opacity: previewFade, marginTop: 16 * S }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.muted, letterSpacing: "0.12em", marginBottom: 22 * S }}>接下來會帶你認識</div>
              <div style={{ display: "flex", gap: 18 * S, marginBottom: 24 * S }}>
                {[{ l: "程式語言", s: p1 }, { l: "API", s: p2 }, { l: "爬蟲…", s: p3 }].map(({ l, s }) => (
                  <div key={l} style={{ flex: 1, ...s }}><Pill label={l} style={{ width: "100%", textAlign: "center" as const, justifyContent: "center", display: "block" }} /></div>
                ))}
              </div>
              <div style={{ ...noteP, background: "rgba(124,255,178,0.05)", border: "1px solid rgba(124,255,178,0.2)", borderRadius: 16 * S, padding: `${28 * S}px ${34 * S}px`, fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 30 * S, color: "#c8ffe0", lineHeight: 1.6 }}>
                不是要你變工程師——<span style={{ color: C.primary, fontWeight: 700 }}>知道它們是什麼、能做什麼就好</span>。這些是幾十年的老知識，AI 理解很深。
              </div>
            </div>
          )}

          {/* Block B: puzzle callback */}
          {frame >= puzzleStart - 6 && (
            <div style={{ ...pz, marginTop: 16 * S, textAlign: "center" as const }}>
              <div style={{ background: "rgba(124,255,178,0.06)", border: `2px solid rgba(124,255,178,0.45)`, borderRadius: 28 * S, padding: `${48 * S}px ${56 * S}px`, boxShadow: "0 0 50px rgba(124,255,178,0.16)" }}>
                <div style={{ fontSize: 64 * S, marginBottom: 16 * S }}>🧩</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 40 * S, fontWeight: 900, color: C.text, lineHeight: 1.45 }}>
                  拼圖片<span style={{ color: C.primary }}>早就存在</span>，不用自己剪。
                </div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 30 * S, color: C.muted, marginTop: 18 * S, lineHeight: 1.6 }}>
                  你只要<span style={{ color: C.primary, fontWeight: 700 }}>選對關鍵字</span>，需要哪塊就直接召喚——AI 就能精準執行。
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
// SCENE 7.1 — Summary (17891–20769)
// ═════════════════════════════════════════════════════════════════════════════
const Scene71Summary: React.FC<{ callouts: Callout[] }> = ({ callouts }) => {
  const frame = useCurrentFrame();
  const dur = SEG_DURATIONS[7];

  const cardsStart = 130;
  const finalStart = 2156;

  const introStyle = useFadeUp(30);
  const cardsFade = useBlockFade(finalStart);

  const t1 = useFadeUpElastic(cardsStart);
  const t2 = useFadeUpElastic(cardsStart + 230);
  const t3 = useFadeUpElastic(cardsStart + 520);
  const t4 = useFadeUpElastic(cardsStart + 800);
  const t5 = useFadeUpElastic(cardsStart + 1130);

  const fin = useFadeUpElastic(finalStart);
  const glow = 0.22 + 0.1 * Math.sin((frame - finalStart) / 30);

  const takeaways = [
    { num: "01", color: C.primary, s: t1, t: "Top-Down：描述高層次需求，AI 一次搞定——簡單任務最有效率" },
    { num: "02", color: C.blue,    s: t2, t: "複雜、Top-Down 失靈時，切換 Bottom-Up：拆小、逐一驗證、再組合" },
    { num: "03", color: C.yellow,  s: t3, t: "Bottom-Up 三步驟：拆最小 / 驗證延伸 / 組合，每步都開新對話" },
    { num: "04", color: C.pink,    s: t4, t: "兩法互補：先 Top-Down，卡關再切 Bottom-Up" },
    { num: "05", color: C.primary, s: t5, t: "學技術概念＝累積詞彙庫，不是要你變工程師" },
  ];
  const shown = (i: number) => frame >= cardsStart - 6 + [0, 230, 520, 800, 1130][i];

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ background: C.bg }}>
        <BgOrbs />
        <ProgressBar progressPct={100} />
        <SceneWrap>
          <SectionHeader num="07" title="本章重點整理" startFrame={0} />
          <Card fadeStyle={introStyle}>
            把這個單元的<span style={{ color: C.primary, fontWeight: 700 }}>重點</span>整理一下。
          </Card>

          {/* Block A: 5 takeaway cards */}
          {frame < finalStart - 6 && (
            <div style={{ opacity: cardsFade, display: "flex", flexDirection: "column" as const, gap: 14 * S, marginTop: 4 * S }}>
              {takeaways.map((tk, i) => shown(i) && (
                <div key={tk.num} style={{ ...tk.s, display: "flex", alignItems: "flex-start", gap: 22 * S, background: C.surface, border: `1px solid ${tk.color}33`, borderLeft: `5px solid ${tk.color}`, borderRadius: 16 * S, padding: `${20 * S}px ${28 * S}px` }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 26 * S, fontWeight: 800, color: tk.color, background: `${tk.color}15`, border: `1px solid ${tk.color}55`, borderRadius: 12 * S, padding: `${6 * S}px ${14 * S}px`, minWidth: 64 * S, textAlign: "center" as const, flexShrink: 0 }}>{tk.num}</span>
                  <span style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 28 * S, fontWeight: 700, color: C.text, lineHeight: 1.55, paddingTop: 4 * S }}>{tk.t}</span>
                </div>
              ))}
            </div>
          )}

          {/* Block B: final hero */}
          {frame >= finalStart - 6 && (
            <div style={{ ...fin, marginTop: 24 * S }}>
              <div style={{ background: "rgba(124,255,178,0.08)", border: `3px solid rgba(124,255,178,0.5)`, borderRadius: 32 * S, padding: `${60 * S}px ${64 * S}px`, boxShadow: `0 0 80px rgba(124,255,178,${glow})`, textAlign: "center" as const }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 24 * S, color: C.primary, letterSpacing: "0.16em", marginBottom: 24 * S }}>FINAL TAKEAWAY</div>
                <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 50 * S, fontWeight: 900, lineHeight: 1.45, color: C.text }}>
                  <span style={{ color: C.primary }}>兩種工具都會用</span>，<br />你就能應對各種複雜程度的任務。
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
// Root Composition — FullVideo09
// ═════════════════════════════════════════════════════════════════════════════
export const FullVideo09: React.FC = () => {
  const S0 = SEG_STARTS_09;

  const getCallouts = (segStart: number, segEnd: number) =>
    GLOBAL_CALLOUTS.map(c => ({ ...c, from: c.from - segStart, to: c.to - segStart }))
      .filter(c => c.from >= -FADE_OUT_F && c.from < (segEnd - segStart));

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/course_background_music.wav")} startFrom={0} volume={0.10} loop />

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
        <Scene71Summary callouts={getCallouts(S0[7], TOTAL_FRAMES_09)} />
      </Sequence>
    </AbsoluteFill>
  );
};
