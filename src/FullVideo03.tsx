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
// Design System
// ─────────────────────────────────────────────────────────────────────────────
const S = 2; // 4K scale

const C = {
  bg:       "#000000",
  surface:  "#0d0d0d",
  surface2: "#111111",
  text:     "#ffffff",
  muted:    "#888888",
  primary:  "#7cffb2",
  border:   "rgba(124,255,178,0.14)",
  yellow:   "#ffd166",
  primaryLight: "rgba(124,255,178,0.07)",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const W = 3840;
const H = 2160;
const NAV_H       = 72  * S;
const CONTAINER_W = 1500 * S;
const SUBTITLE_H  = 160 * S;

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENTS & SEG_STARTS
// ─────────────────────────────────────────────────────────────────────────────
const SEGMENTS = [
  { id: "1.1",  frames: 1482,  file: "0-3_1.1.wav"  },
  { id: "2.0",  frames: 3220,  file: "0-3_2.0.wav"  },
  { id: "2.1",  frames: 1437,  file: "0-3_2.1.wav"  },
  { id: "2.2",  frames: 1348,  file: "0-3_2.2.wav"  },
  { id: "3.1",  frames: 2150,  file: "0-3_3.1.wav"  },
  { id: "3.2",  frames: 1794,  file: "0-3_3.2.wav"  },
  { id: "3.3",  frames: 1615,  file: "0-3_3.3.wav"  },
  { id: "4.0",  frames: 4469,  file: "0-3_4.0.wav"  },
  { id: "4.1",  frames: 2240,  file: "0-3_4.1.wav"  },
  { id: "4.2",  frames: 2641,  file: "0-3_4.2.wav"  },
  { id: "4.3",  frames: 2418,  file: "0-3_4.3.wav"  },
  { id: "4.4",  frames: 1660,  file: "0-3_4.4.wav"  },
  { id: "4.5",  frames: 1749,  file: "0-3_4.5.wav"  },
  { id: "4.6",  frames: 1482,  file: "0-3_4.6.wav"  },
  { id: "4.7",  frames: 1392,  file: "0-3_4.7.wav"  },
  { id: "4.8",  frames: 1348,  file: "0-3_4.8.wav"  },
  { id: "4.9",  frames: 1392,  file: "0-3_4.9.wav"  },
  { id: "5.1",  frames: 1660,  file: "0-3_5.1.wav"  },
  { id: "6.1",  frames: 2641,  file: "0-3_6.1.wav"  },
  { id: "7.1",  frames: 2908,  file: "0-3_7.1.wav"  },
] as const;

const SEG_STARTS = [0, 1482, 4702, 6139, 7487, 9637, 11431, 13046, 17515, 19755, 22396, 24814, 26474, 28223, 29705, 31097, 32445, 33837, 35497, 38138];
export const TOTAL_FRAMES_03 = 41046;

// ─────────────────────────────────────────────────────────────────────────────
// Animation Hooks — Remotion-native (spring + Easing per best-practices skill)
// Durations written in seconds × fps as per skill guideline.
// ─────────────────────────────────────────────────────────────────────────────

type AnimStyle = { opacity: number; transform: string };

/**
 * Cards, TipBox, AnalogyBox — smooth spring (damping:200) + subtle scale.
 * `{ damping: 200 }` = smooth, no bounce (per timing.md "subtle reveals").
 */
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

/**
 * Section/Step headers — snappy spring (damping:20, stiffness:200).
 * Per timing.md: "Snappy, minimal bounce (UI elements)".
 */
function useFadeUpHeader(startFrame: number): AnimStyle {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const progress = spring({ frame: f, fps, config: { damping: 20, stiffness: 200 } });
  const opacity = interpolate(f, [0, 0.3 * fps], [0, 1], clamp);
  const y = interpolate(progress, [0, 1], [10 * S, 0]);
  return { opacity, transform: `translateY(${y}px)` };
}

/**
 * ProgressItems / list rows — Easing.out(Easing.exp) (≈ expo.out / power4.out).
 * Using interpolate + Easing as shown in timing.md.
 */
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

/**
 * Key quote / completion badge — bouncy spring (damping:8).
 * Per timing.md: "Bouncy entrance (playful animations)".
 */
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

function useFocusHighlight(startFrame: number, duration = 75) {
  const frame = useCurrentFrame();
  const f = frame - startFrame;
  if (f < 0 || f > duration) return {};
  const intensity = interpolate(f, [0, duration], [1, 0], clamp);
  return {
    boxShadow: `0 0 ${Math.round(intensity * 24 * S)}px rgba(124,255,178,${(intensity * 0.55).toFixed(2)})`,
    borderColor: `rgba(124,255,178,${(0.14 + intensity * 0.5).toFixed(2)})`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Callout (iMessage-style) — article-video spec: sender + text, top-right stack
// ─────────────────────────────────────────────────────────────────────────────
const NOTIF_W       = 420 * S;
const NOTIF_TOP     = 12  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLIDE_H = 150 * S;
const NOTIF_SLOT    = 200 * S;
const FADE_OUT_F    = 50;

type Callout = {
  from: number; to: number;
  sender: string; text: string;
};

const CalloutCard: React.FC<{ c: Callout; allCallouts: Callout[] }> = ({ c, allCallouts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localF   = frame - c.from;
  const duration = c.to - c.from;
  const totalVisible = duration + FADE_OUT_F;

  if (localF < 0 || localF >= totalVisible) return null;

  // Stack push-down from newer notifications — smooth spring per timing.md
  let totalYPush = 0;
  for (const newer of allCallouts) {
    if (newer.from <= c.from) continue;
    if (frame < newer.from) continue;
    const pushF = frame - newer.from;
    const pushP = spring({ frame: pushF, fps, config: { damping: 22, stiffness: 120 } });
    totalYPush += NOTIF_SLOT * pushP;
  }

  // Entry: slide down from top — snappy spring
  const entryP = spring({ frame: localF, fps, config: { damping: 22, stiffness: 130 } });
  const slideY = interpolate(entryP, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);

  // Opacity: fade in → hold → slow fade out
  const opacity = interpolate(
    localF,
    [0, 10, duration, totalVisible],
    [0, 1, 1, 0],
    clamp,
  );

  // Stack depth fade: deeper cards get dimmer
  const stackDepth = totalYPush / NOTIF_SLOT;
  const depthAlpha = interpolate(stackDepth, [0, 1, 2], [1, 0.65, 0.35], clamp);

  // Typewriter
  const CHARS_PER_FRAME = 0.85;
  const charsVisible = interpolate(
    Math.max(0, localF - 14),
    [0, c.text.length / CHARS_PER_FRAME],
    [0, c.text.length],
    clamp
  );
  const displayText = c.text.slice(0, Math.floor(charsVisible));
  const cursor = localF % 20 < 10 && charsVisible < c.text.length ? "|" : "";

  const iconSize   = 52 * S;
  const fontBase   = 22 * S;
  const fontSender = 26 * S;
  const fontBody   = 26 * S;

  return (
    <div style={{
      position: "absolute",
      top: NAV_H + NOTIF_TOP + totalYPush,
      right: NOTIF_RIGHT,
      width: NOTIF_W,
      transform: `translateY(${slideY}px)`,
      opacity: opacity * depthAlpha,
      pointerEvents: "none",
      zIndex: 100,
    }}>
      <div style={{
        background: "rgba(28,28,30,0.9)",
        backdropFilter: "blur(48px)",
        WebkitBackdropFilter: "blur(48px)",
        border: `${1 * S}px solid rgba(255,255,255,0.13)`,
        borderRadius: 14 * S,
        boxShadow: `0 ${8 * S}px ${40 * S}px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06) inset`,
        padding: `${10 * S}px ${14 * S}px`,
        display: "flex",
        gap: 11 * S,
        alignItems: "flex-start",
      }}>
        {/* Messages app icon */}
        <div style={{
          width: iconSize, height: iconSize,
          borderRadius: 9 * S,
          background: "linear-gradient(145deg, #3DDC6A 0%, #25A244 100%)",
          boxShadow: `0 ${2 * S}px ${10 * S}px rgba(52,199,89,0.45)`,
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* CSS speech bubble */}
          <div style={{ position: "relative", width: 22 * S, height: 20 * S }}>
            <div style={{
              position: "absolute", top: 0, left: 0,
              width: 22 * S, height: 16 * S,
              background: "white", borderRadius: 5 * S, opacity: 0.95,
            }} />
            <div style={{
              position: "absolute", bottom: 0, left: 4 * S,
              width: 0, height: 0,
              borderLeft: `${5 * S}px solid transparent`,
              borderTop: `${6 * S}px solid white`,
              opacity: 0.95,
            }} />
          </div>
        </div>

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* App name + timestamp row */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 3 * S,
          }}>
            <span style={{
              fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif",
              fontSize: fontBase, fontWeight: 600,
              color: "rgba(255,255,255,0.45)", letterSpacing: "0.01em",
            }}>iMessage</span>
            <span style={{
              fontFamily: "-apple-system,'SF Pro Text',system-ui,sans-serif",
              fontSize: fontBase, color: "rgba(255,255,255,0.3)",
            }}>now</span>
          </div>
          {/* Sender */}
          <div style={{
            fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif",
            fontSize: fontSender, fontWeight: 700,
            color: "rgba(255,255,255,0.92)", marginBottom: 2 * S,
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis",
          }}>{c.sender}</div>
          {/* Body — typewriter */}
          <div style={{
            fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif",
            fontSize: fontBody, fontWeight: 400,
            color: "rgba(255,255,255,0.60)", lineHeight: 1.45,
            letterSpacing: "-0.005em", minHeight: fontBody * 1.45,
          }}>{displayText}{cursor}</div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared Components
// ─────────────────────────────────────────────────────────────────────────────
const BgOrbs: React.FC = () => {
  const frame = useCurrentFrame();
  const bgAlpha = interpolate(frame, [0, 30], [0, 1], clamp);
  return (
    <>
      <div style={{
        position: "absolute", top: -200 * S, right: -200 * S,
        width: 600 * S, height: 600 * S,
        background: `radial-gradient(circle, rgba(124,255,178,${0.07 * bgAlpha}) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -200 * S, left: -200 * S,
        width: 500 * S, height: 500 * S,
        background: `radial-gradient(circle, rgba(124,255,178,${0.04 * bgAlpha}) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
    </>
  );
};

const ProgressBar: React.FC<{ progressPct?: number }> = ({ progressPct = 75 }) => {
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
        fontSize: 16 * S,
        color: C.muted,
        letterSpacing: "0.05em",
        marginBottom: 8 * S,
      }}>
        <Img
          src={staticFile("aischool-logo.webp")}
          style={{ height: 22 * S, width: "auto", mixBlendMode: "screen", opacity: 0.9 }}
        />
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

const SectionHeader: React.FC<{ num: string; title: string; fadeStyle: React.CSSProperties }> = ({
  num, title, fadeStyle,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 28 * S, ...fadeStyle }}>
    <span style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: 16 * S, color: C.primary,
      background: "rgba(124,255,178,0.1)",
      border: `1px solid rgba(124,255,178,0.3)`,
      padding: `${6 * S}px ${16 * S}px`, borderRadius: 99,
      whiteSpace: "nowrap" as const,
      letterSpacing: "0.06em",
      boxShadow: "0 0 14px rgba(124,255,178,0.12)",
    }}>{num}</span>
    <h2 style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      fontSize: 44 * S, fontWeight: 800,
      letterSpacing: "-0.02em",
      color: C.text, margin: 0,
    }}>{title}</h2>
  </div>
);

const Card: React.FC<{
  children: React.ReactNode;
  fadeStyle?: React.CSSProperties;
  highlightStyle?: React.CSSProperties;
  marginBottom?: number;
}> = ({ children, fadeStyle = {}, highlightStyle = {}, marginBottom = 20 * S }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 22 * S, padding: `${26 * S}px ${36 * S}px`, marginBottom,
    ...fadeStyle, ...highlightStyle,
  }}>
    <p style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      fontSize: 28 * S, color: C.text, lineHeight: 1.8, margin: 0,
    }}>
      {children}
    </p>
  </div>
);

const AnalogyBox: React.FC<{
  label: string; children: React.ReactNode;
  fadeStyle?: React.CSSProperties; highlightStyle?: React.CSSProperties; marginBottom?: number;
}> = ({ label, children, fadeStyle = {}, highlightStyle = {}, marginBottom = 20 * S }) => (
  <div style={{
    background: "rgba(124,255,178,0.05)", borderLeft: `${4 * S}px solid ${C.primary}`,
    borderRadius: `0 ${18 * S}px ${18 * S}px 0`, padding: `${24 * S}px ${32 * S}px`, marginBottom,
    boxShadow: `-${2 * S}px 0 ${30 * S}px rgba(124,255,178,0.08)`,
    ...fadeStyle, ...highlightStyle,
  }}>
    <div style={{
      fontFamily: "'Space Mono', monospace", fontSize: 16 * S, fontWeight: 700,
      color: C.primary, letterSpacing: "0.1em",
      textTransform: "uppercase" as const, marginBottom: 12 * S,
      display: "flex", alignItems: "center", gap: 10 * S,
    }}>
      <div style={{ width: 6 * S, height: 6 * S, background: C.primary, borderRadius: "50%", flexShrink: 0, boxShadow: "0 0 10px #7cffb2" }} />
      {label}
    </div>
    <p style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      fontSize: 26 * S, color: "#dafff0", lineHeight: 1.8, margin: 0,
    }}>
      {children}
    </p>
  </div>
);

const TipBox: React.FC<{
  children: React.ReactNode;
  fadeStyle?: React.CSSProperties;
  marginBottom?: number;
}> = ({ children, fadeStyle = {}, marginBottom = 20 * S }) => (
  <div style={{
    background: "rgba(124,255,178,0.05)",
    border: `1px solid rgba(124,255,178,0.22)`,
    borderRadius: 16 * S, padding: `${20 * S}px ${28 * S}px`, marginBottom,
    ...fadeStyle,
  }}>
    <div style={{
      fontFamily: "'Space Mono', monospace", fontSize: 16 * S, fontWeight: 700,
      color: C.primary, letterSpacing: "0.08em",
      textTransform: "uppercase" as const, marginBottom: 10 * S,
      display: "flex", alignItems: "center", gap: 8 * S,
    }}>
      <div style={{ width: 6 * S, height: 6 * S, background: C.primary, borderRadius: "50%", boxShadow: "0 0 10px #7cffb2" }} />
      實戰範例
    </div>
    <p style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      fontSize: 26 * S, color: "#c8ffe0", lineHeight: 1.75, margin: 0,
    }}>
      {children}
    </p>
  </div>
);

const QuizBox: React.FC<{
  children: React.ReactNode;
  fadeStyle?: React.CSSProperties;
  marginBottom?: number;
}> = ({ children, fadeStyle = {}, marginBottom = 20 * S }) => (
  <div style={{
    border: `2px dashed rgba(255,209,102,0.3)`, borderRadius: 16 * S,
    padding: `${28 * S}px ${32 * S}px`, marginBottom,
    background: "rgba(255,209,102,0.03)", ...fadeStyle,
  }}>
    <div style={{
      fontFamily: "'Space Mono', monospace", fontSize: 18 * S, fontWeight: 700,
      color: C.yellow, letterSpacing: "0.08em",
      textTransform: "uppercase" as const, marginBottom: 14 * S,
      display: "flex", alignItems: "center", gap: 8 * S,
    }}>
      <div style={{ width: 6 * S, height: 6 * S, background: C.yellow, borderRadius: "50%", boxShadow: "0 0 10px #ffd166" }} />
      想一想
    </div>
    {children}
  </div>
);

// ProgressItem — icon + title + desc row
const ProgressItem: React.FC<{
  icon: string; title: string; desc?: string | React.ReactNode; style?: React.CSSProperties;
}> = ({ icon, title, desc, style = {} }) => (
  <div style={{
    display: "flex", alignItems: "flex-start", gap: 18 * S,
    background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.07)`,
    borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`, marginBottom: 12 * S,
    ...style,
  }}>
    <div style={{
      fontSize: 22 * S, flexShrink: 0,
      width: 44 * S, height: 44 * S, borderRadius: 10 * S,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(124,255,178,0.08)", border: `1px solid rgba(124,255,178,0.15)`,
    }}>{icon}</div>
    <div style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", fontSize: 24 * S, color: C.muted, lineHeight: 1.65 }}>
      <strong style={{ color: C.text, fontWeight: 600 }}>{title}</strong>
      {desc && <span style={{ color: C.muted }}>{"　"}{desc}</span>}
    </div>
  </div>
);

// StepHeader — colored step badge + title + sub
const StepHeader: React.FC<{ num: string; title: string; sub: string; fadeStyle: React.CSSProperties }> = ({
  num, title, sub, fadeStyle,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 28 * S, ...fadeStyle }}>
    <span style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: 16 * S, color: C.primary,
      background: "rgba(124,255,178,0.1)",
      border: `1px solid rgba(124,255,178,0.3)`,
      padding: `${6 * S}px ${16 * S}px`, borderRadius: 99,
      whiteSpace: "nowrap" as const,
      letterSpacing: "0.06em",
      boxShadow: "0 0 14px rgba(124,255,178,0.12)",
    }}>{num}</span>
    <h2 style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      fontSize: 44 * S, fontWeight: 800,
      letterSpacing: "-0.02em",
      color: C.text, margin: 0,
    }}>
      {title}
      {sub && <span style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 20 * S, color: C.muted,
        fontWeight: 400, marginLeft: 16 * S,
        letterSpacing: "0.04em",
      }}>{sub}</span>}
    </h2>
  </div>
);

// SceneScroller — animated scroll wrapper
const SceneScroller: React.FC<{
  scrollY: number;
  children: React.ReactNode;
  paddingTop?: number;
}> = ({ scrollY, children, paddingTop = 40 * S }) => (
  <div style={{ paddingTop, transform: `translateY(-${scrollY}px)` }}>
    {children}
  </div>
);

// Shared scene wrapper
const SceneWrap: React.FC<{ children: React.ReactNode; scrollY?: number }> = ({ children, scrollY = 0 }) => (
  <AbsoluteFill style={{ backgroundColor: C.bg }}>
    <BgOrbs />
    <ProgressBar progressPct={75} />
    <div style={{
      position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
      left: Math.round((W - CONTAINER_W) / 2), width: CONTAINER_W,
      overflow: "hidden", zIndex: 10,
    }}>
      <div style={{ paddingTop: 40 * S, transform: `translateY(-${scrollY}px)` }}>
        {children}
      </div>
    </div>
  </AbsoluteFill>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 1.1 — Hero (SEG_START=0)
// ─────────────────────────────────────────────────────────────────────────────
const Scene11Hero: React.FC = () => {
  const header = useFadeUpHeader(15);
  const title  = useFadeUpHeader(35);
  const sub    = useFadeUp(55);

  const CALLOUTS: Callout[] = [];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={75} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((W - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <SceneScroller scrollY={0}>
          <div style={{ padding: `${64 * S}px 0 ${48 * S}px`, borderBottom: `1px solid ${C.border}`, marginBottom: 56 * S }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 22 * S, ...header }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.primary,
                border: `1px solid rgba(124,255,178,0.5)`, padding: `${6 * S}px ${16 * S}px`, borderRadius: 99,
                letterSpacing: "0.08em", boxShadow: "0 0 18px rgba(124,255,178,0.25)",
                background: "rgba(124,255,178,0.06)",
              }}>CH 0-3</span>
              <span style={{ fontSize: 20 * S, padding: `${6 * S}px ${16 * S}px`, borderRadius: 99, fontWeight: 600, background: "rgba(124,255,178,0.1)", color: C.primary, border: `1px solid rgba(124,255,178,0.18)`, letterSpacing: "0.03em" }}>✦ 完全零基礎</span>
            </div>
            <div style={{ marginBottom: 20 * S, ...title }}>
              <div style={{
                fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
                fontSize: 88 * S, fontWeight: 900, lineHeight: 1.25,
                letterSpacing: "-0.02em", color: C.text,
              }}>
                寫程式的 7 大流程
              </div>
              <div style={{
                fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
                fontSize: 88 * S, fontWeight: 900, lineHeight: 1.25,
                letterSpacing: "-0.02em", color: C.primary,
              }}>
                與 AI 溝通技巧
              </div>
            </div>
            <div style={{ ...sub }}>
              <p style={{
                fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
                fontSize: 36 * S, color: C.muted, lineHeight: 1.75, margin: 0, maxWidth: 700 * S,
              }}>
                AI 寫程式不只是「叫 AI 寫就好」。搞懂開發的完整框架，你才能在對的時機說對的話，讓 AI 真正幫上你的忙。
              </p>
            </div>
          </div>
        </SceneScroller>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENES 2.0-2.2 — Section 01
// ─────────────────────────────────────────────────────────────────────────────
// ─── Scene20Framework ───
const Scene20Framework: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const header = useFadeUpHeader(0);    // VTT: [0-38] "在正式開始之前"
  const el1    = useFadeUp(38);   // VTT: [38-121] "想要先帶你建立一個最重要的概念"
  const gapRow = useFadeUp(365);  // VTT: [365-398] "現況是什麼"
  const el2    = useFadeUp(1232); // VTT: [1232-1272] "不確定同學們"
  const el3    = useFadeUp(2774); // VTT: [2774-2853] "如果你對程式設計完全沒有概念的話"

  // maxScroll = 1130*S - (H - NAV_H - SUBTITLE_H - 40*S) = 2260 - 1616 = 644px
  const scrollY = interpolate(frame, [1100, 1220], [0, 644], clamp);

  const CALLOUTS: Callout[] = [
    { from: 2332, to: 2671, sender: "關鍵提醒", text: "說不清楚想要什麼，AI 只能依自己的判斷推薦，成果不一定是你預期的樣子" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={75} />
      <div style={{ position: "absolute", top: NAV_H, bottom: SUBTITLE_H, left: Math.round((W - CONTAINER_W) / 2), width: CONTAINER_W, overflow: "hidden", zIndex: 10 }}>
        <div style={{ paddingTop: 40 * S, transform: `translateY(-${scrollY}px)` }}>

          <SectionHeader num="01" title="寫程式的最大框架" fadeStyle={header} />

          <Card fadeStyle={el1} marginBottom={20 * S}>
            <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: C.text, lineHeight: 1.8, margin: 0, marginBottom: 16 * S }}>
              寫程式的過程，本質上就是找出「現況」與「期待」之間的落差，然後設計最好的方案去填補它。
            </p>
            <div style={{ display: "flex", gap: 24 * S, marginTop: 8 * S }}>
              <div style={{ background: C.primaryLight, border: `1px solid ${C.border}`, borderRadius: 8 * S, padding: `${10 * S}px ${20 * S}px`, fontSize: 22 * S, fontFamily: "'Noto Sans TC',sans-serif", color: C.text }}>
                前半段叫做 <span style={{ color: C.primary, fontFamily: "'Space Mono',monospace" }}>需求分析</span>
              </div>
              <div style={{ background: C.primaryLight, border: `1px solid ${C.border}`, borderRadius: 8 * S, padding: `${10 * S}px ${20 * S}px`, fontSize: 22 * S, fontFamily: "'Noto Sans TC',sans-serif", color: C.text }}>
                後半段叫做 <span style={{ color: C.primary, fontFamily: "'Space Mono',monospace" }}>解法設計</span>
              </div>
            </div>
          </Card>

          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 * S, ...gapRow }}>
            <div style={{ background: "rgba(255,255,255,0.06)", border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 14 * S, padding: `${18 * S}px ${36 * S}px`, fontSize: 28 * S, fontFamily: "'Noto Sans TC',sans-serif", color: C.text, textAlign: "center" as const }}>
              <div style={{ fontSize: 15 * S, color: C.muted, fontFamily: "'Space Mono',monospace", marginBottom: 8 * S, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>現況</div>
              <div style={{ fontWeight: 600 }}>現在的狀態</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", padding: `0 ${12 * S}px` }}>
              <div style={{ width: 32 * S, height: 2 * S, background: `linear-gradient(90deg, rgba(124,255,178,0.3), rgba(124,255,178,0.6))` }} />
              <div style={{ width: 0, height: 0, borderTop: `${7 * S}px solid transparent`, borderBottom: `${7 * S}px solid transparent`, borderLeft: `${10 * S}px solid rgba(124,255,178,0.6)` }} />
            </div>
            <div style={{ background: "rgba(124,255,178,0.08)", border: `1px solid rgba(124,255,178,0.22)`, borderRadius: 14 * S, padding: `${18 * S}px ${36 * S}px`, fontSize: 28 * S, textAlign: "center" as const, flex: 1, boxShadow: `0 0 30px rgba(124,255,178,0.06)` }}>
              <div style={{ fontSize: 15 * S, color: C.primary, fontFamily: "'Space Mono',monospace", marginBottom: 8 * S, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>落差</div>
              <div style={{ color: C.text, fontWeight: 600 }}>需求分析 + 解法設計</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", padding: `0 ${12 * S}px` }}>
              <div style={{ width: 32 * S, height: 2 * S, background: `linear-gradient(90deg, rgba(124,255,178,0.6), rgba(124,255,178,0.9))` }} />
              <div style={{ width: 0, height: 0, borderTop: `${7 * S}px solid transparent`, borderBottom: `${7 * S}px solid transparent`, borderLeft: `${10 * S}px solid rgba(124,255,178,0.9)` }} />
            </div>
            <div style={{ background: "rgba(124,255,178,0.12)", border: `1px solid rgba(124,255,178,0.3)`, borderRadius: 14 * S, padding: `${18 * S}px ${36 * S}px`, fontSize: 28 * S, fontFamily: "'Noto Sans TC',sans-serif", color: C.primary, textAlign: "center" as const, boxShadow: `0 0 40px rgba(124,255,178,0.12)` }}>
              <div style={{ fontSize: 15 * S, color: C.primary, fontFamily: "'Space Mono',monospace", marginBottom: 8 * S, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>期待</div>
              <div style={{ fontWeight: 700 }}>理想的狀態</div>
            </div>
          </div>

          <AnalogyBox label="💡 醫美比喻" fadeStyle={el2} marginBottom={20 * S}>
            <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: C.text, lineHeight: 1.8, margin: 0 }}>
              就像去做醫美：醫生先問你「對哪些地方不滿意」（現況），再問你「希望達到什麼樣的效果」（期待），最後才推薦適合的醫美項目（解法）。如果你連自己想要什麼都說不清楚，醫生只能依自己的判斷推薦，結果不一定是你預期的樣子。AI 也是完全一樣的道理。
            </p>
          </AnalogyBox>

          <Card fadeStyle={el3}>
            <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: C.text, lineHeight: 1.8, margin: 0 }}>
              如果你對程式設計完全沒有概念，你能做的最重要的事，就是把現況和期待描述得越清楚越好，剩下的讓 AI 去思考怎麼填補落差。
            </p>
          </Card>

        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─── Scene21DescribeCurrent ───
const Scene21DescribeCurrent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const header = useFadeUpHeader(0);   // VTT: [0-52] "描述現況的時候"
  const el1    = useFadeUp(52);  // VTT: [52-121] "我們可以儘量說明三件事情"
  const r1     = useFadeUpItem(121); // VTT: [121-191] "包含你是什麼角色"
  const r2     = useFadeUpItem(191); // VTT: [191-235] "在做什麼任務"
  const r3     = useFadeUpItem(235); // VTT: [235-329] "目前在用什麼樣的工具或者是流程"
  const r4     = useFadeUpItem(329); // VTT: [329-418] "還有哪個環節最讓你困擾"
  const el2    = useFadeUp(551); // VTT: [551-611] "你可以這樣跟AI說"

  // maxScroll = ~1832 - (H - NAV_H - SUBTITLE_H - 40*S) = 1832 - 1616 = 216px
  const scrollY = interpolate(frame, [580, 730], [0, 220], clamp);
  const CALLOUTS: Callout[] = [];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={75} />
      <div style={{ position: "absolute", top: NAV_H, bottom: SUBTITLE_H, left: Math.round((W - CONTAINER_W) / 2), width: CONTAINER_W, overflow: "hidden", zIndex: 10 }}>
        <div style={{ paddingTop: 40 * S, transform: `translateY(-${scrollY}px)` }}>

          <SectionHeader num="01" title="描述現況" fadeStyle={header} />

          <Card fadeStyle={el1} marginBottom={20 * S}>
            <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: C.text, lineHeight: 1.8, margin: 0, marginBottom: 16 * S }}>
              描述現況時，盡量說明：你是什麼角色、在做什麼任務、目前用什麼工具或流程、哪個環節最讓你困擾或最花時間。
            </p>
            <div style={{ ...r1 }}>
              <ProgressItem icon="👤" title="你的角色" desc="" />
            </div>
            <div style={{ ...r2 }}>
              <ProgressItem icon="📋" title="在做什麼任務" desc="" />
            </div>
            <div style={{ ...r3 }}>
              <ProgressItem icon="🔧" title="用什麼工具或流程" desc="" />
            </div>
            <div style={{ ...r4 }}>
              <ProgressItem icon="⚠️" title="哪個環節最困擾" desc="" />
            </div>
          </Card>

          <TipBox fadeStyle={el2} marginBottom={20 * S}>
            <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: C.text, lineHeight: 1.8, margin: 0 }}>
              現況這樣描述：<br /><br />
              「我是活動企劃，每次辦活動結束後，都要手動把很多份報名表的資料，一筆一筆複製到總整理的試算表裡面，這個過程大概要花兩個小時左右的時間，而且過程中很容易打錯資料。」<br /><br />
              像這樣把角色、情境、還有痛點的描述都講得很清楚，AI 才會更具體知道你目前的現況是什麼。
            </p>
          </TipBox>

        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─── Scene22DescribeGoal ───
const Scene22DescribeGoal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const header = useFadeUpHeader(0);    // VTT: [0-98] "在描述期待的時候"
  const el1    = useFadeUp(98);   // VTT: [98-158] "建議你可以靜下來"
  const r1     = useFadeUpItem(204);  // VTT: [204-306] "第一個是你理想中的畫面會是什麼"
  const r2     = useFadeUpItem(306);  // VTT: [306-392] "再來你希望達成什麼樣的效果"
  const r3     = useFadeUpItem(392);  // VTT: [392-483] "最後就是有沒有特別的限制條件"
  const el2    = useFadeUp(556);  // VTT: [556-601] "我跟AI說"
  const el3    = useFadeUp(1022); // VTT: [1022-1091] "現況跟期待都說清楚之後"

  // maxScroll = 1150*S - (H - NAV_H - SUBTITLE_H - 40*S) = 2300 - 1616 = 684px
  const scrollY = interpolate(frame, [500, 600], [0, 684], clamp);

  const CALLOUTS: Callout[] = [];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={75} />
      <div style={{ position: "absolute", top: NAV_H, bottom: SUBTITLE_H, left: Math.round((W - CONTAINER_W) / 2), width: CONTAINER_W, overflow: "hidden", zIndex: 10 }}>
        <div style={{ paddingTop: 40 * S, transform: `translateY(-${scrollY}px)` }}>

          <SectionHeader num="01" title="描述期待" fadeStyle={header} />

          <Card fadeStyle={el1} marginBottom={20 * S}>
            <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: C.text, lineHeight: 1.8, margin: 0, marginBottom: 16 * S }}>
              描述期待時，先想清楚三件事情：
            </p>
            <div style={{ ...r1 }}>
              <ProgressItem icon="🎯" title="理想中的畫面是什麼" desc="" />
            </div>
            <div style={{ ...r2 }}>
              <ProgressItem icon="✨" title="希望達成什麼樣的效果" desc="" />
            </div>
            <div style={{ ...r3 }}>
              <ProgressItem icon="🔒" title="有沒有特別的限制條件" desc="" />
            </div>
          </Card>

          <TipBox fadeStyle={el2} marginBottom={20 * S}>
            <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: C.text, lineHeight: 1.8, margin: 0 }}>
              📝 期待這樣描述：<br /><br />
              「我希望只要整理好一份主要試算表，就可以自動把所有報名資料彙整進去，最好還能在完成後自動寄一封確認信給報名者。」<br /><br />
              像這樣現況跟期待都說清楚之後，剩下的就交給 AI——這就是跟 AI 合作最重要的起點。
            </p>
          </TipBox>

          <QuizBox fadeStyle={el3}>
            <p style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", fontSize: 26 * S, color: C.text, lineHeight: 1.8, margin: 0 }}>
              試著用「現況 ／ 期待」的框架，描述一件你想自動化的任務。<br /><br />
              <span style={{ color: C.muted }}>現況：</span>你現在怎麼做這件事？最花時間、最容易出錯的是哪個步驟？<br />
              <span style={{ color: C.muted }}>期待：</span>如果這件事被解決了，你希望它是什麼樣子？
            </p>
          </QuizBox>

        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENES 3.1-3.3 — Section 02
// ─────────────────────────────────────────────────────────────────────────────
// ─── Scene31AIGuide ───
const Scene31AIGuide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerFade = useFadeUpHeader(0);
  const introFade = useFadeUp(145);
  const methodFade = useFadeUp(441);
  // maxScroll = 0 (no scroll needed)
  const CALLOUTS: Callout[] = [
    { from: 1448, to: 1988, sender: "注意", text: "AI 有時會說「這件事做不到」，但其實只是它沒想到其他解法而已" },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={75} />
      <div style={{ position: "absolute", top: NAV_H, bottom: SUBTITLE_H, left: Math.round((W - CONTAINER_W) / 2), width: CONTAINER_W, overflow: "hidden", zIndex: 10 }}>
        <div style={{ paddingTop: 40 * S }}>
          <SectionHeader num="02" title="兩種與 AI 協作的方式" fadeStyle={headerFade} />
          <Card fadeStyle={introFade} marginBottom={20 * S}>
            <p style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 28 * S, color: C.text, lineHeight: 1.8, margin: 0 }}>
              搞清楚現況和期待之後，設計解法這個階段，有兩種不同的協作方式——差別在於你介入的程度。
            </p>
          </Card>
          <Card fadeStyle={methodFade} marginBottom={20 * S}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 16 * S }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 16 * S, fontWeight: 700, color: "#000", background: C.primary, padding: `${6 * S}px ${14 * S}px`, borderRadius: 99 }}>方法 A</span>
              <span style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 32 * S, fontWeight: 700, color: C.text }}>AI 引導法</span>
            </div>
            <p style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 26 * S, color: C.muted, lineHeight: 1.8, margin: `0 0 ${16 * S}px` }}>
              把現況和期待告訴 AI，讓 AI 來設計解決方案，你跟著它的步驟走。甚至可以請 AI 提出兩到三種方案，選一個你最看得懂的執行。
            </p>
            <div style={{ display: "flex", gap: 12 * S }}>
              <div style={{ flex: 1, background: "rgba(124,255,178,0.06)", border: `1px solid rgba(124,255,178,0.2)`, borderRadius: 10 * S, padding: `${14 * S}px ${18 * S}px` }}>
                <div style={{ fontSize: 16 * S, color: C.primary, fontFamily: "'Space Mono',monospace", marginBottom: 8 * S }}>✓ 優點</div>
                <p style={{ fontSize: 24 * S, color: C.text, lineHeight: 1.7, margin: 0, fontFamily: "'Noto Sans TC',sans-serif" }}>上手快、零門檻，不需要任何技術概念</p>
              </div>
              <div style={{ flex: 1, background: "rgba(255,209,102,0.05)", border: `1px solid rgba(255,209,102,0.2)`, borderRadius: 10 * S, padding: `${14 * S}px ${18 * S}px` }}>
                <div style={{ fontSize: 16 * S, color: C.yellow, fontFamily: "'Space Mono',monospace", marginBottom: 8 * S }}>⚠ 限制</div>
                <p style={{ fontSize: 24 * S, color: C.text, lineHeight: 1.7, margin: 0, fontFamily: "'Noto Sans TC',sans-serif" }}>AI 可能有盲點，有時會把你帶往效率較差的方向，而且因為你不懂技術，可能察覺不到問題在哪裡</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─── Scene32Engineering ───
const Scene32Engineering: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const methodFade = useFadeUp(0);
  const tipFade = useFadeUp(788);
  // maxScroll = 850*S - (H - NAV_H - SUBTITLE_H - 40*S) = 1700 - 1616 = 84px
  const scrollY = interpolate(frame, [700, 790], [0, 84], clamp);
  const CALLOUTS: Callout[] = [];
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={75} />
      <div style={{ position: "absolute", top: NAV_H, bottom: SUBTITLE_H, left: Math.round((W - CONTAINER_W) / 2), width: CONTAINER_W, overflow: "hidden", zIndex: 10 }}>
        <div style={{ paddingTop: 40 * S, transform: `translateY(-${scrollY}px)` }}>
          <Card fadeStyle={methodFade} marginBottom={20 * S}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 16 * S }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 16 * S, fontWeight: 700, color: "#000", background: C.primary, padding: `${6 * S}px ${14 * S}px`, borderRadius: 99 }}>方法 B</span>
              <span style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 32 * S, fontWeight: 700, color: C.text }}>工程法</span>
            </div>
            <p style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 26 * S, color: C.muted, lineHeight: 1.8, margin: `0 0 ${16 * S}px` }}>
              你帶著一些技術概念主動介入，指定方向或方案給 AI 執行。從「AI 引導你」變成「你引導 AI」。
            </p>
            <div style={{ display: "flex", gap: 12 * S }}>
              <div style={{ flex: 1, background: "rgba(124,255,178,0.06)", border: `1px solid rgba(124,255,178,0.2)`, borderRadius: 10 * S, padding: `${14 * S}px ${18 * S}px` }}>
                <div style={{ fontSize: 16 * S, color: C.primary, fontFamily: "'Space Mono',monospace", marginBottom: 8 * S }}>✓ 優點</div>
                <p style={{ fontSize: 24 * S, color: C.text, lineHeight: 1.7, margin: 0, fontFamily: "'Noto Sans TC',sans-serif" }}>掌控感更強、成功率更高，能挑戰更複雜的任務</p>
              </div>
              <div style={{ flex: 1, background: "rgba(255,209,102,0.05)", border: `1px solid rgba(255,209,102,0.2)`, borderRadius: 10 * S, padding: `${14 * S}px ${18 * S}px` }}>
                <div style={{ fontSize: 16 * S, color: C.yellow, fontFamily: "'Space Mono',monospace", marginBottom: 8 * S }}>⚠ 限制</div>
                <p style={{ fontSize: 24 * S, color: C.text, lineHeight: 1.7, margin: 0, fontFamily: "'Noto Sans TC',sans-serif" }}>需要一點技術背景知識作為前提</p>
              </div>
            </div>
          </Card>
          <TipBox fadeStyle={tipFade} marginBottom={20 * S}>
            <p style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 26 * S, color: C.text, lineHeight: 1.8, margin: 0 }}>
              舉個例子：你告訴 AI「我想自動化每月寄送帳單的工作」，如果什麼都不指定，AI 可能用一種你看不懂、用不上的方式解決。
              <br /><br />
              但如果你知道 Google Apps Script 很擅長串聯 Google 服務，你就可以主動說「請用 Apps Script 來寫」——這就是工程法，你在引導 AI 往你看得懂、用得上的方向走。
              <br /><br />
              你依然只是「動動嘴」，只是說的內容更有方向感。
            </p>
          </TipBox>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─── Scene33TaxiAnalogy ───
const Scene33TaxiAnalogy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const analogyFade = useFadeUp(76);
  const benefitFade = useFadeUp(1157);
  // maxScroll = 0 (no scroll needed)
  const CALLOUTS: Callout[] = [];
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={75} />
      <div style={{ position: "absolute", top: NAV_H, bottom: SUBTITLE_H, left: Math.round((W - CONTAINER_W) / 2), width: CONTAINER_W, overflow: "hidden", zIndex: 10 }}>
        <div style={{ paddingTop: 40 * S }}>
          <AnalogyBox label="💡 計程車比喻" fadeStyle={analogyFade} marginBottom={24 * S}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 * S }}>
              <div style={{ borderRight: `1px solid rgba(124,255,178,0.15)`, paddingRight: 20 * S }}>
                <div style={{ fontSize: 18 * S, color: C.primary, fontFamily: "'Space Mono',monospace", fontWeight: 700, marginBottom: 8 * S }}>方法 A — AI 引導法</div>
                <p style={{ fontSize: 26 * S, color: "#c8ffe0", lineHeight: 1.75, margin: 0, fontFamily: "'Noto Sans TC',sans-serif" }}>
                  「我要去台北信義區」—— 完全交給司機決定走哪條路。<br />司機會到目的地，但有沒有繞路，你不會知道。
                </p>
              </div>
              <div style={{ paddingLeft: 20 * S }}>
                <div style={{ fontSize: 18 * S, color: C.primary, fontFamily: "'Space Mono',monospace", fontWeight: 700, marginBottom: 8 * S }}>方法 B — 工程法</div>
                <p style={{ fontSize: 26 * S, color: "#c8ffe0", lineHeight: 1.75, margin: 0, fontFamily: "'Noto Sans TC',sans-serif" }}>
                  「走快速道路，避開忠孝東路」—— 你不用自己開車，但你知道怎麼給出更有效的指令。
                </p>
              </div>
            </div>
          </AnalogyBox>
          <Card fadeStyle={benefitFade} marginBottom={20 * S}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 16 * S }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 16 * S, fontWeight: 700, color: "#000", background: C.primary, padding: `${6 * S}px ${14 * S}px`, borderRadius: 99 }}>工程法的好處</span>
            </div>
            <p style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 26 * S, color: C.text, lineHeight: 1.8, margin: 0 }}>
              使用工程法的好處是：你在整個開發過程中會更有掌握感、更有自信，成功率相對更高，也更有機會挑戰規模更大的任務。
            </p>
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENES 4.0-4.4 — Section 03 Part 1
// ─────────────────────────────────────────────────────────────────────────────
const Scene40: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = useFadeUpHeader(0);    // VTT: [0-221] "講完設計解法的兩個不同的協作方式之後"
  const cardFade = useFadeUp(221); // VTT: [221-367] "接下來我想跟你介紹在軟體工程裡面很重要的框架"
  const tipFade = useFadeUp(1577); // VTT: [1577-1691] "在這邊我想跟你分享一個很有名的比喻"
  const card2Fade = useFadeUp(4009); // VTT: [3952-4409] "瞭解完跟AI溝通的概念之後"
  // Content fits in viewport (~1617px ≤ 1616px) — no scroll needed
  const scrollY = 0;
  const CALLOUTS: Callout[] = [
    { from: 3450, to: 3792, sender: "關鍵洞見", text: "AI 回應不如預期，有時不是 AI 不夠聰明，而是我們說的不夠清楚" },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs /><ProgressBar progressPct={75} />
      <div style={{ position:"absolute", top:NAV_H, bottom:SUBTITLE_H, left:Math.round((W-CONTAINER_W)/2), width:CONTAINER_W, overflow:"hidden", zIndex:10 }}>
        <div style={{ paddingTop:40*S, transform:`translateY(-${scrollY}px)` }}>
          <SectionHeader num="03" title="寫程式的 7 大流程（SDLC）" fadeStyle={header} />
          <Card fadeStyle={cardFade} marginBottom={20*S}>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:26*S, color:C.text, lineHeight:1.75, margin:0 }}>
              軟體工程師圈有一個重要框架，叫做 <span style={{ color:C.primary, fontWeight:700 }}>SDLC（軟體開發生命週期）</span>，把一個程式從零到上線的完整過程拆成七個階段。<br/><br/>
              這個框架不是叫你循規蹈矩一步一步做，而是幫你建立更高的視野——知道每個階段在幹嘛、哪些事沒做到位會造成問題。
            </p>
          </Card>
          <div style={{ background:"rgba(124,255,178,0.05)", border:`1px solid rgba(124,255,178,0.22)`, borderRadius:16*S, padding:`${20*S}px ${28*S}px`, marginBottom:20*S, ...tipFade }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:16*S, fontWeight:700, color:C.primary, letterSpacing:"0.08em", textTransform:"uppercase" as const, marginBottom:10*S, display:"flex", alignItems:"center", gap:8*S }}>
              <div style={{ width:6*S, height:6*S, background:C.primary, borderRadius:1, boxShadow:"0 0 6px #7cffb2" }} />
              💬 與 AI 溝通的關鍵提醒
            </div>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:26*S, color:"#c8ffe0", lineHeight:1.75, margin:0 }}>
              OpenAI AI 策略師 Jessica Shieh 提出一個比喻：「房間裡的天才」。<br/><br/>
              想像一個天才被關在房間裡，你只能把問題寫在紙上從門縫塞進去。他非常聰明，但對你一無所知——看不到你的畫面，也不了解你的背景。你塞進去的那張紙，就是你的 prompt。<br/><br/>
              看到什麼就跟 AI 說什麼。文字說不清楚，也可以用圖片輔助。
            </p>
          </div>
          <Card fadeStyle={card2Fade} marginBottom={20*S}>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:26*S, color:C.text, lineHeight:1.75, margin:0 }}>
              瞭解完跟 AI 溝通的核心概念之後，現在我們就來一步一步，一起看這七個階段——
            </p>
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

const Scene41: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = useFadeUpHeader(0);     // VTT: [0-65] "首先"
  const cardFade = useFadeUp(65);  // VTT: [65-175] "人體開發生命週期的第一個步驟是計劃"
  const r1 = useFadeUpItem(468);       // VTT: [468-519] "第一個是價值"
  const r2 = useFadeUpItem(728);       // VTT: [728-908] "第二個要評估的是風險"
  const r3 = useFadeUpItem(979);       // VTT: [979-1196] "第三個是時間"
  const card2Fade = useFadeUp(1196); // VTT: [1196-1590] "為什麼呢？"
  // maxScroll = 990*S - (H - NAV_H - SUBTITLE_H - 40*S) = 1980 - 1616 = 364px
  const scrollY = interpolate(frame, [800, 900], [0, 364], clamp);
  const CALLOUTS: Callout[] = [];
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs /><ProgressBar progressPct={75} />
      <div style={{ position:"absolute", top:NAV_H, bottom:SUBTITLE_H, left:Math.round((W-CONTAINER_W)/2), width:CONTAINER_W, overflow:"hidden", zIndex:10 }}>
        <div style={{ paddingTop:40*S, transform:`translateY(-${scrollY}px)` }}>
          <StepHeader num="01" title="計劃" sub="PLANNING" fadeStyle={header} />
          <Card fadeStyle={cardFade} marginBottom={20*S}>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:26*S, color:C.text, lineHeight:1.75, margin:0 }}>
              計劃是整個專案的起點。在動手開始之前，先評估這件事情的可行性，從三個面向思考：
            </p>
          </Card>
          <div style={{ ...r1 }}><ProgressItem icon="💎" title="價值" desc="做這件事有什麼效益？（哪怕只是做開心也算）" /></div>
          <div style={{ ...r2 }}><ProgressItem icon="⚡" title="風險" desc="會不會用到付費服務？有沒有隱私疑慮？" /></div>
          <div style={{ ...r3 }}><ProgressItem icon="⏰" title="時間" desc="給自己一個「試試看」的時間框，先動手再說" /></div>
          <Card fadeStyle={card2Fade} marginBottom={20*S}>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:26*S, color:C.text, lineHeight:1.75, margin:0 }}>
              不需要精確估算時間——建議直接給自己一個「試試看」的時間框，例如「這個週末下午兩小時」，先動手再說。很多人在開始前反而花了半天想來想去，什麼都還沒開始。
            </p>
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

const Scene42: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = useFadeUpHeader(0);      // VTT: [0-71] "再來第二個步驟就是需求分析"
  const card1Fade = useFadeUp(71);  // VTT: [71-124] "這個階段非常的關鍵"
  const card2Fade = useFadeUp(1066); // VTT: [1066-1198] "正因為AI執行的速度很快"
  const card2Highlight = useFocusHighlight(1066);
  const card3Fade = useFadeUp(2315); // VTT: [2315-2573] "所以想要提醒你"
  // maxScroll = 900*S - (H - NAV_H - SUBTITLE_H - 40*S) = 1800 - 1616 = 184px
  const scrollY = interpolate(frame, [1000, 1100], [0, 184], clamp);
  const CALLOUTS: Callout[] = [
    { from: 2068, to: 2315, sender: "重要提醒", text: "AI 幫你省的是執行時間，但「你到底想要什麼」這個問題，AI 沒辦法代替你" },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs /><ProgressBar progressPct={75} />
      <div style={{ position:"absolute", top:NAV_H, bottom:SUBTITLE_H, left:Math.round((W-CONTAINER_W)/2), width:CONTAINER_W, overflow:"hidden", zIndex:10 }}>
        <div style={{ paddingTop:40*S, transform:`translateY(-${scrollY}px)` }}>
          <StepHeader num="02" title="需求分析" sub="REQUIREMENTS" fadeStyle={header} />
          <Card fadeStyle={card1Fade} marginBottom={20*S}>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:26*S, color:C.text, lineHeight:1.75, margin:0 }}>
              這個階段非常關鍵——把腦中模糊的想法，變成有結構的需求描述。<br/><br/>
              AI 做出來的東西不如預期，八成是因為需求沒有想清楚或說清楚。這個步驟千萬不能跳過。
            </p>
          </Card>
          <Card fadeStyle={card2Fade} highlightStyle={card2Highlight} marginBottom={20*S}>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:26*S, color:C.text, lineHeight:1.75, margin:0 }}>
              正因為 AI 執行的速度很快，所以如果一開始的需求不清楚，AI 就會很快幫你做出一個看起來很完整的東西——但不一定是你想要的。AI 做得越完整，你反而越難察覺哪裡不對勁。
            </p>
          </Card>
          <Card fadeStyle={card3Fade} marginBottom={20*S}>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:26*S, color:C.text, lineHeight:1.75, margin:0 }}>
              在 AI 寫程式的時代，需求分析的能力反而變得更重要。<br/><br/>
              AI 幫你省的是執行的時間，但「你到底想要什麼」這個問題，是 AI 沒有辦法代替你的。
            </p>
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

const Scene43: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = useFadeUpHeader(0);      // VTT: [0-103] "再來就是需求不是說出來就算數"
  const card1Fade = useFadeUp(103); // VTT: [103-241] "我們還要再去問自己"
  const r1 = useFadeUpItem(940);        // VTT: [940-1175] "舉個例子：午餐選擇工具"
  const r2 = useFadeUpItem(1175);       // VTT: [1175-1582] "自動整理報表"
  const card2Fade = useFadeUp(1803); // VTT: [1582-1919] "那當然做好玩也是完全沒問題的"
  // maxScroll = 940*S - (H - NAV_H - SUBTITLE_H - 40*S) = 1880 - 1616 = 264px
  const scrollY = interpolate(frame, [900, 1000], [0, 264], clamp);
  const CALLOUTS: Callout[] = [];
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs /><ProgressBar progressPct={75} />
      <div style={{ position:"absolute", top:NAV_H, bottom:SUBTITLE_H, left:Math.round((W-CONTAINER_W)/2), width:CONTAINER_W, overflow:"hidden", zIndex:10 }}>
        <div style={{ paddingTop:40*S, transform:`translateY(-${scrollY}px)` }}>
          <StepHeader num="02" title="需求分析" sub="REQUIREMENTS" fadeStyle={header} />
          <Card fadeStyle={card1Fade} marginBottom={20*S}>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:26*S, color:C.text, lineHeight:1.75, margin:0 }}>
              需求不是說出來就算數——還要問問自己，這個需求真的值得花時間做嗎？<br/><br/>
              有價值的需求通常有這些特徵：解決真實存在的痛點，做完之後你或使用者真的會去用，而且解決的頻率夠高或影響範圍夠大。
            </p>
          </Card>
          <div style={{ ...r1 }}><ProgressItem icon="🎲" title="午餐選擇工具" desc="明確的需求，但價值只有五分鐘的娛樂性" /></div>
          <div style={{ ...r2 }}><ProgressItem icon="📊" title="自動整理報表" desc="節省每天一小時，做完後每天都能用到 — 更有價值" /></div>
          <Card fadeStyle={card2Fade} marginBottom={20*S}>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:26*S, color:C.text, lineHeight:1.75, margin:0 }}>
              做好玩的完全沒問題！只是重要的是在開始之前就想清楚：目前這件事值得我投入多少時間？想清楚了，後面的每一步才會更有方向。
            </p>
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

const Scene44: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = useFadeUpHeader(0);      // VTT: [0-209] "評估完這個需求的價值之後"
  const card1Fade = useFadeUp(209); // VTT: [209-497] "在這一塊非常的重要"
  const quoteStyle = useFadeUpElastic(497); // VTT: [497-745] "你自己沒有想清楚的事情"
  const tipFade = useFadeUp(977);   // VTT: [977-1349] "最後我們再回到個人網站的這個例子"
  // maxScroll = 870*S - (H - NAV_H - SUBTITLE_H - 40*S) = 1740 - 1616 = 124px
  const scrollY = interpolate(frame, [800, 900], [0, 124], clamp);
  const CALLOUTS: Callout[] = [];
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs /><ProgressBar progressPct={75} />
      <div style={{ position:"absolute", top:NAV_H, bottom:SUBTITLE_H, left:Math.round((W-CONTAINER_W)/2), width:CONTAINER_W, overflow:"hidden", zIndex:10 }}>
        <div style={{ paddingTop:40*S, transform:`translateY(-${scrollY}px)` }}>
          <StepHeader num="02" title="需求分析" sub="REQUIREMENTS" fadeStyle={header} />
          <Card fadeStyle={card1Fade} marginBottom={20*S}>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:26*S, color:C.text, lineHeight:1.75, margin:0 }}>
              需求描述非常重要，有很多具體的方法和技巧——後面的單元會專門帶你一步一步練習。現在先記住一件事：
            </p>
          </Card>
          <div style={{ background:"rgba(124,255,178,0.07)", border:`2px solid rgba(124,255,178,0.7)`, borderRadius:20*S, padding:`${36*S}px ${48*S}px`, marginBottom:20*S, textAlign:"center" as const, boxShadow:`0 0 60px rgba(124,255,178,0.15), inset 0 1px 0 rgba(124,255,178,0.12)`, ...quoteStyle }}>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:38*S, fontWeight:700, color:C.text, lineHeight:1.6, margin:0, letterSpacing:"-0.01em" }}>
              你自己沒有想清楚的事情，<br/>
              <span style={{ color:C.primary, textShadow:`0 0 30px rgba(124,255,178,0.4)` }}>AI 當然也不可能幫你通靈出來</span>
            </p>
          </div>
          <TipBox fadeStyle={tipFade} marginBottom={20*S}>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:26*S, color:C.text, lineHeight:1.75, margin:0 }}>
              以個人網站為例，需求可以這樣描述：<br/><br/>
              <span style={{ color:"#c8ffe0", fontStyle:"italic" }}>「我目前沒有個人網站，在找工作或接案時，很難讓對方快速了解我的背景和作品。我想要一個可以展示自己作品集、有簡短自我介紹和聯絡方式的網站。」</span><br/><br/>
              像這樣清楚的描述，AI 才能往你真正想要做的方向走。
            </p>
          </TipBox>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENES 4.5-7.1 — Section 03-05 + Review
// ─────────────────────────────────────────────────────────────────────────────
const Scene45: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = useFadeUpHeader(0);
  const card1 = useFadeUp(134);
  const tip = useFadeUp(858);
  const CALLOUTS: Callout[] = [];
  // maxScroll = none (no scroll)
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs /><ProgressBar progressPct={40} />
      <div style={{ position:"absolute", top:NAV_H, bottom:SUBTITLE_H, left:Math.round((W-CONTAINER_W)/2), width:CONTAINER_W, overflow:"hidden", zIndex:10 }}>
        <div style={{ paddingTop:40*S }}>
          <StepHeader num="03" title="解法設計" sub="DESIGN" fadeStyle={header} />
          <Card fadeStyle={card1} marginBottom={20*S}>
            有了現況和期待之後，這個階段要決定用什麼方式來實現。填補落差的方法通常有很多種，選一個最可行的，把這個結論清楚傳達給 AI。<br /><br />
            這個階段的決策，會直接影響後面 AI 幫你寫出來的東西——需要謹慎一點。
          </Card>
          <TipBox fadeStyle={tip} marginBottom={20*S}>
            以個人網站為例，這個階段需要想清楚的事：<br /><br />
            • 只做電腦版，還是手機版也要支援？<br />
            • 作品資料直接寫在頁面裡，還是從別的地方傳入？<br />
            • 網站要部署在哪裡？有沒有免費方案？<br /><br />
            這些決定越早想清楚，後面實作的方向就越準確。
          </TipBox>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

const Scene46: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = useFadeUpHeader(0);
  const card1 = useFadeUp(165);
  const card2 = useFadeUp(647);
  const CALLOUTS: Callout[] = [];
  // maxScroll = none (no scroll)
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs /><ProgressBar progressPct={53} />
      <div style={{ position:"absolute", top:NAV_H, bottom:SUBTITLE_H, left:Math.round((W-CONTAINER_W)/2), width:CONTAINER_W, overflow:"hidden", zIndex:10 }}>
        <div style={{ paddingTop:40*S }}>
          <StepHeader num="04" title="實作" sub="IMPLEMENTATION" fadeStyle={header} />
          <Card fadeStyle={card1} marginBottom={20*S}>
            前面三步驟都準備好了，現在終於要來開始寫程式——但當然，這不是你自己寫，是交給 AI 來寫。有了充足的準備，這個階段會聚焦很多，AI 也能夠更準確地產出你想要的東西。
          </Card>
          <Card fadeStyle={card2} marginBottom={20*S}>
            實作過程中難免還是會出現一些錯誤，這是很正常的。這個時候你的任務是：把完整的錯誤訊息提供給 AI，並且在 AI 走偏方向時，用除錯技巧引導它回到正軌。（除錯技巧在後面章節詳細介紹）
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

const Scene47: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = useFadeUpHeader(0);
  const card1 = useFadeUp(299);
  const r1 = useFadeUpItem(565);
  const r2 = useFadeUpItem(830);
  const CALLOUTS: Callout[] = [];
  // maxScroll = none (no scroll)
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs /><ProgressBar progressPct={60} />
      <div style={{ position:"absolute", top:NAV_H, bottom:SUBTITLE_H, left:Math.round((W-CONTAINER_W)/2), width:CONTAINER_W, overflow:"hidden", zIndex:10 }}>
        <div style={{ paddingTop:40*S }}>
          <StepHeader num="05" title="測試" sub="TESTING" fadeStyle={header} />
          <Card fadeStyle={card1} marginBottom={20*S}>
            程式做出來了，要自己實際操作確認每個功能都正常運作。點這裡、點那裡，看看有沒有什麼異常。
          </Card>
          <div style={{ ...r1 }}>
            <ProgressItem icon="📊" title="測試資料至少 5-10 筆" desc="確保不同情境下都能正常運作" />
          </div>
          <div style={{ ...r2 }}>
            <ProgressItem icon="🔒" title="請 AI 做程式碼審查" desc="排除常見資安風險，如資料外洩或不安全的輸入處理" />
          </div>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

const Scene48: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = useFadeUpHeader(0);
  const card1 = useFadeUp(195);
  const card2 = useFadeUp(413);
  const CALLOUTS: Callout[] = [];
  // maxScroll = none (no scroll)
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs /><ProgressBar progressPct={70} />
      <div style={{ position:"absolute", top:NAV_H, bottom:SUBTITLE_H, left:Math.round((W-CONTAINER_W)/2), width:CONTAINER_W, overflow:"hidden", zIndex:10 }}>
        <div style={{ paddingTop:40*S }}>
          <StepHeader num="06" title="部署" sub="DEPLOYMENT" fadeStyle={header} />
          <Card fadeStyle={card1} marginBottom={20*S}>
            部署，就是把成果正式釋出到對應的環境當中。你不會希望電腦一關掉別人就看不到你的網站——部署就是把成果放到可以讓其他人使用的地方。
          </Card>
          <Card fadeStyle={card2} marginBottom={20*S}>
            以個人網站為例，部署就是把網站放到雲端，只要有連結，任何人都可以隨時開啟。<br /><br />
            現在有很多免費的靜態網站託管服務可以使用，而且可以透過 AI 一步一步教你完成這個流程。
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

const Scene49: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = useFadeUpHeader(0);
  const card1 = useFadeUp(187);
  const card2 = useFadeUp(967);
  const CALLOUTS: Callout[] = [];
  // maxScroll = none (no scroll)
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs /><ProgressBar progressPct={80} />
      <div style={{ position:"absolute", top:NAV_H, bottom:SUBTITLE_H, left:Math.round((W-CONTAINER_W)/2), width:CONTAINER_W, overflow:"hidden", zIndex:10 }}>
        <div style={{ paddingTop:40*S }}>
          <StepHeader num="07" title="維護" sub="MAINTENANCE" fadeStyle={header} />
          <Card fadeStyle={card1} marginBottom={20*S}>
            網站上線後，要不定時確保程式正常運作。遇到小問題修一修，想加小功能就補一補。只要不是需要重新思考整體架構的改動，都屬於維護的範疇。
          </Card>
          <Card fadeStyle={card2} marginBottom={20*S}>
            如果遇到的問題太嚴重，或想追加的功能太複雜，就要回到第一步「計劃」，重新跑一輪開發流程。<br /><br />
            SDLC 是一個循環，不是線性的。
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

const Scene51: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = useFadeUpHeader(0);
  const card1 = useFadeUp(278);
  const analogy = useFadeUp(1118);
  const CALLOUTS: Callout[] = [];
  // maxScroll = none (no scroll)
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs /><ProgressBar progressPct={87} />
      <div style={{ position:"absolute", top:NAV_H, bottom:SUBTITLE_H, left:Math.round((W-CONTAINER_W)/2), width:CONTAINER_W, overflow:"hidden", zIndex:10 }}>
        <div style={{ paddingTop:40*S }}>
          <SectionHeader num="04" title="這個框架怎麼用？" fadeStyle={header} />
          <Card fadeStyle={card1} marginBottom={20*S}>
            SDLC 是一個參考框架，不是硬規定。小任務可以跳過幾個階段，完全沒問題。<br /><br />
            但如果開發過程總是卡關，這個框架能幫你快速找到問題出在哪個環節。
          </Card>
          <AnalogyBox label="🔍 具體例子" fadeStyle={analogy} marginBottom={20*S}>
            在 AI 寫程式的時代，我們不用像以前一樣那麼嚴謹。但如果你能擁有一些程式相關的知識，就像是點了更厲害的技能點——開發更順利、成功率更高，也能有效避免很多不必要的風險。
          </AnalogyBox>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

const Scene61: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = useFadeUpHeader(0);
  const card1 = useFadeUp(205);
  const twoPointFade = useFadeUp(902);
  const card3 = useFadeUp(2235);
  // maxScroll = ~920*S - (H - NAV_H - SUBTITLE_H - 40*S) = 1840 - 1616 = 224px
  const scrollY = interpolate(frame, [800, 900], [0, 224], clamp);
  const CALLOUTS: Callout[] = [
    { from: 1694, to: 2235, sender: "你知道嗎？", text: "同樣的 AI 工具、同樣的模型，問出來的結果差很多——不是 AI 偏心，而是他說得更清楚" }
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs /><ProgressBar progressPct={92} />
      <div style={{ position:"absolute", top:NAV_H, bottom:SUBTITLE_H, left:Math.round((W-CONTAINER_W)/2), width:CONTAINER_W, overflow:"hidden", zIndex:10 }}>
        <div style={{ paddingTop:40*S, transform:`translateY(-${scrollY}px)` }}>
          <SectionHeader num="05" title="AI 時代最重要的能力" fadeStyle={header} />
          <Card fadeStyle={card1} marginBottom={20*S}>
            在 AI 蓬勃發展的時代，很多人以為最重要的是要會用很多不同的工具。但使用工具只是最基本的——真正能和其他人拉開差距的，是你跟 AI 的溝通能力。
          </Card>
          <Card fadeStyle={twoPointFade} marginBottom={20*S}>
            <div style={{ display:"flex", flexDirection:"column" as const, gap:24*S }}>
              <div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:17*S, color:C.primary, marginBottom:12*S, letterSpacing:"0.04em", display:"flex", alignItems:"center", gap:10*S }}>
                  <span style={{ background:"rgba(124,255,178,0.15)", border:`1px solid rgba(124,255,178,0.3)`, borderRadius:6*S, padding:`${3*S}px ${10*S}px` }}>01</span>
                  整理想法的能力
                </div>
                <p style={{ fontFamily:"'Noto Sans TC',sans-serif", fontSize:26*S, color:C.text, lineHeight:1.8, margin:0 }}>有沒有辦法把腦袋裡模糊的需求，整理成清楚、有邏輯的描述</p>
              </div>
              <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:24*S }}>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:17*S, color:C.primary, marginBottom:12*S, letterSpacing:"0.04em", display:"flex", alignItems:"center", gap:10*S }}>
                  <span style={{ background:"rgba(124,255,178,0.15)", border:`1px solid rgba(124,255,178,0.3)`, borderRadius:6*S, padding:`${3*S}px ${10*S}px` }}>02</span>
                  文字表達的能力
                </div>
                <p style={{ fontFamily:"'Noto Sans TC',sans-serif", fontSize:26*S, color:C.text, lineHeight:1.8, margin:0 }}>能不能用精準的語言，把描述傳達給 AI，讓他真正理解你的想法</p>
              </div>
            </div>
          </Card>
          <Card fadeStyle={card3} marginBottom={20*S}>
            這也就是為什麼我們在這個單元花了很多時間，在談需求、在談描述、在談溝通——因為這兩件事情，在 AI 的時代已經成為能決定你能不能有效使用 AI 的核心門檻。
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

const Scene71: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const header = useFadeUpHeader(0);
  const r1 = useFadeUpItem(210);
  const r2 = useFadeUpItem(380);
  const r3 = useFadeUpItem(743);
  const r4 = useFadeUpItem(1118);
  const r5 = useFadeUpItem(1375);
  const r6 = useFadeUpItem(1651);
  const done = useFadeUpElastic(1884);
  // maxScroll = ~1180*S - (H - NAV_H - SUBTITLE_H - 40*S) = 2360 - 1616 = 744px
  const scrollY = interpolate(frame, [1200, 1350], [0, 744], clamp);
  const CALLOUTS: Callout[] = [];
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs /><ProgressBar progressPct={100} />
      <div style={{ position:"absolute", top:NAV_H, bottom:SUBTITLE_H, left:Math.round((W-CONTAINER_W)/2), width:CONTAINER_W, overflow:"hidden", zIndex:10 }}>
        <div style={{ paddingTop:40*S, transform:`translateY(-${scrollY}px)` }}>
          <SectionHeader num="✦" title="本章重點整理" fadeStyle={header} />
          <div style={{ display:"flex", alignItems:"flex-start", gap:16*S, background:C.surface, border:`1px solid ${C.border}`, borderRadius:16*S, padding:`${22*S}px ${28*S}px`, marginBottom:12*S, ...r1 }}>
            <div style={{ background:C.primary, color:"#000", fontFamily:"'Space Mono',monospace", fontSize:20*S, fontWeight:700, width:40*S, height:40*S, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 0 20px rgba(124,255,178,0.35), 0 2px 8px rgba(0,0,0,0.4)` }}>1</div>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:28*S, color:C.text, lineHeight:1.6, margin:0 }}>寫程式的本質，就是找出現況與期待之間的落差，然後設計方案去填補它。</p>
          </div>
          <div style={{ display:"flex", alignItems:"flex-start", gap:16*S, background:C.surface, border:`1px solid ${C.border}`, borderRadius:16*S, padding:`${22*S}px ${28*S}px`, marginBottom:12*S, ...r2 }}>
            <div style={{ background:C.primary, color:"#000", fontFamily:"'Space Mono',monospace", fontSize:20*S, fontWeight:700, width:40*S, height:40*S, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 0 20px rgba(124,255,178,0.35), 0 2px 8px rgba(0,0,0,0.4)` }}>2</div>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:28*S, color:C.text, lineHeight:1.6, margin:0 }}>跟 AI 協作有兩種方式：AI 引導法讓 AI 設計解法；工程法由你主導方向、AI 負責執行。</p>
          </div>
          <div style={{ display:"flex", alignItems:"flex-start", gap:16*S, background:C.surface, border:`1px solid ${C.border}`, borderRadius:16*S, padding:`${22*S}px ${28*S}px`, marginBottom:12*S, ...r3 }}>
            <div style={{ background:C.primary, color:"#000", fontFamily:"'Space Mono',monospace", fontSize:20*S, fontWeight:700, width:40*S, height:40*S, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 0 20px rgba(124,255,178,0.35), 0 2px 8px rgba(0,0,0,0.4)` }}>3</div>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:28*S, color:C.text, lineHeight:1.6, margin:0 }}>在 AI 時代，探索需求的能力變得更重要——AI 執行速度快，但「你到底想要什麼」是 AI 無法代替你的。</p>
          </div>
          <div style={{ display:"flex", alignItems:"flex-start", gap:16*S, background:C.surface, border:`1px solid ${C.border}`, borderRadius:16*S, padding:`${22*S}px ${28*S}px`, marginBottom:12*S, ...r4 }}>
            <div style={{ background:C.primary, color:"#000", fontFamily:"'Space Mono',monospace", fontSize:20*S, fontWeight:700, width:40*S, height:40*S, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 0 20px rgba(124,255,178,0.35), 0 2px 8px rgba(0,0,0,0.4)` }}>4</div>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:28*S, color:C.text, lineHeight:1.6, margin:0 }}>動手之前，先問問自己這個需求的價值在哪裡——解決真實的痛點，才是最值得投入的需求。</p>
          </div>
          <div style={{ display:"flex", alignItems:"flex-start", gap:16*S, background:C.surface, border:`1px solid ${C.border}`, borderRadius:16*S, padding:`${22*S}px ${28*S}px`, marginBottom:12*S, ...r5 }}>
            <div style={{ background:C.primary, color:"#000", fontFamily:"'Space Mono',monospace", fontSize:20*S, fontWeight:700, width:40*S, height:40*S, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 0 20px rgba(124,255,178,0.35), 0 2px 8px rgba(0,0,0,0.4)` }}>5</div>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:28*S, color:C.text, lineHeight:1.6, margin:0 }}>SDLC 七個步驟是參考框架，可以幫你找到開發卡關的原因。很多時候是需求沒說清楚，不是 AI 不夠聰明。</p>
          </div>
          <div style={{ display:"flex", alignItems:"flex-start", gap:16*S, background:C.surface, border:`1px solid ${C.border}`, borderRadius:16*S, padding:`${22*S}px ${28*S}px`, marginBottom:12*S, ...r6 }}>
            <div style={{ background:C.primary, color:"#000", fontFamily:"'Space Mono',monospace", fontSize:20*S, fontWeight:700, width:40*S, height:40*S, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 0 20px rgba(124,255,178,0.35), 0 2px 8px rgba(0,0,0,0.4)` }}>6</div>
            <p style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", fontSize:28*S, color:C.text, lineHeight:1.6, margin:0 }}>AI 時代最重要的能力，不是使用工具，而是整理想法的能力和文字表達的能力。</p>
          </div>
          <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:16*S, marginBottom:20*S, ...done }}>
            <div style={{ background:"rgba(124,255,178,0.1)", border:`1px solid rgba(124,255,178,0.35)`, borderRadius:16*S, padding:`${16*S}px ${40*S}px`, boxShadow:`0 0 40px rgba(124,255,178,0.18)`, display:"flex", alignItems:"center", gap:16*S }}>
              <div style={{ width:10*S, height:10*S, background:C.primary, borderRadius:"50%", boxShadow:`0 0 16px rgba(124,255,178,0.6)` }} />
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:24*S, fontWeight:700, color:C.primary, letterSpacing:"0.06em" }}>本章完成</span>
              <div style={{ width:10*S, height:10*S, background:C.primary, borderRadius:"50%", boxShadow:`0 0 16px rgba(124,255,178,0.6)` }} />
            </div>
          </div>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FullVideo03 — Main Composition (chains all 20 segments)
// ─────────────────────────────────────────────────────────────────────────────
export const FullVideo03: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Audio src={staticFile("audio/course_background_music.wav")} volume={0.08} loop />
      <BgOrbs />
      <ProgressBar progressPct={75} />

      {/* Scene 1.1 — Opening */}
      <Sequence from={SEG_STARTS[0]} durationInFrames={SEGMENTS[0].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[0].file}`)} />
        <Scene11Hero />
      </Sequence>

      {/* Section 01 — 最大框架 */}
      <Sequence from={SEG_STARTS[1]} durationInFrames={SEGMENTS[1].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[1].file}`)} />
        <Scene20Framework />
      </Sequence>
      <Sequence from={SEG_STARTS[2]} durationInFrames={SEGMENTS[2].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[2].file}`)} />
        <Scene21DescribeCurrent />
      </Sequence>
      <Sequence from={SEG_STARTS[3]} durationInFrames={SEGMENTS[3].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[3].file}`)} />
        <Scene22DescribeGoal />
      </Sequence>

      {/* Section 02 — 兩種協作方式 */}
      <Sequence from={SEG_STARTS[4]} durationInFrames={SEGMENTS[4].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[4].file}`)} />
        <Scene31AIGuide />
      </Sequence>
      <Sequence from={SEG_STARTS[5]} durationInFrames={SEGMENTS[5].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[5].file}`)} />
        <Scene32Engineering />
      </Sequence>
      <Sequence from={SEG_STARTS[6]} durationInFrames={SEGMENTS[6].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[6].file}`)} />
        <Scene33TaxiAnalogy />
      </Sequence>

      {/* Section 03 — SDLC */}
      <Sequence from={SEG_STARTS[7]} durationInFrames={SEGMENTS[7].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[7].file}`)} />
        <Scene40 />
      </Sequence>
      <Sequence from={SEG_STARTS[8]} durationInFrames={SEGMENTS[8].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[8].file}`)} />
        <Scene41 />
      </Sequence>
      <Sequence from={SEG_STARTS[9]} durationInFrames={SEGMENTS[9].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[9].file}`)} />
        <Scene42 />
      </Sequence>
      <Sequence from={SEG_STARTS[10]} durationInFrames={SEGMENTS[10].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[10].file}`)} />
        <Scene43 />
      </Sequence>
      <Sequence from={SEG_STARTS[11]} durationInFrames={SEGMENTS[11].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[11].file}`)} />
        <Scene44 />
      </Sequence>
      <Sequence from={SEG_STARTS[12]} durationInFrames={SEGMENTS[12].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[12].file}`)} />
        <Scene45 />
      </Sequence>
      <Sequence from={SEG_STARTS[13]} durationInFrames={SEGMENTS[13].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[13].file}`)} />
        <Scene46 />
      </Sequence>
      <Sequence from={SEG_STARTS[14]} durationInFrames={SEGMENTS[14].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[14].file}`)} />
        <Scene47 />
      </Sequence>
      <Sequence from={SEG_STARTS[15]} durationInFrames={SEGMENTS[15].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[15].file}`)} />
        <Scene48 />
      </Sequence>
      <Sequence from={SEG_STARTS[16]} durationInFrames={SEGMENTS[16].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[16].file}`)} />
        <Scene49 />
      </Sequence>

      {/* Section 04 — 框架怎麼用 */}
      <Sequence from={SEG_STARTS[17]} durationInFrames={SEGMENTS[17].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[17].file}`)} />
        <Scene51 />
      </Sequence>

      {/* Section 05 — AI時代最重要能力 */}
      <Sequence from={SEG_STARTS[18]} durationInFrames={SEGMENTS[18].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[18].file}`)} />
        <Scene61 />
      </Sequence>

      {/* 複習收尾 */}
      <Sequence from={SEG_STARTS[19]} durationInFrames={SEGMENTS[19].frames}>
        <Audio src={staticFile(`audio/${SEGMENTS[19].file}`)} />
        <Scene71 />
      </Sequence>
    </AbsoluteFill>
  );
};
