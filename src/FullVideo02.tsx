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
  Img,
} from "remotion";
import { Lottie } from "@remotion/lottie";
import speakingData from "./speaking-animation.json";

// ─────────────────────────────────────────────────────────────────────────────
// Design System — exact match to (N)ch0-2.html CSS variables
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#000000",
  surface:      "#0d0d0d",
  surface2:     "#111111",
  primaryLight: "rgba(124, 255, 178, 0.07)",
  primary:      "#7cffb2",
  text:         "#ffffff",
  muted:        "#888888",
  yellow:       "#ffd166",
  border:       "rgba(124,255,178,0.14)",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const NAV_H       = 72;
const CONTAINER_W = 1500;
const SUBTITLE_H  = 160;  // reserved at bottom for subtitles

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENTS — frame counts computed from public/audio/0.2_*.wav after pipeline
// UPDATE these after running: 0a_denoise → 0b_trim_silence → 0_normalize → ffprobe
// Formula: Math.ceil(duration_sec * 30) + 10
// ─────────────────────────────────────────────────────────────────────────────
const SEGMENTS = [
  { id: "1.1", file: "0.2_1.1.wav", frames: 1493 }, // 49.41s
  { id: "2.1", file: "0.2_2.1.wav", frames: 1723 }, // 57.09s
  { id: "3.1", file: "0.2_3.1.wav", frames: 1324 }, // 43.78s
  { id: "3.2", file: "0.2_3.2.wav", frames: 3159 }, // 104.96s
  { id: "3.3", file: "0.2_3.3.wav", frames: 1434 }, // 47.45s
  { id: "4.0", file: "0.2_4.0.wav", frames: 1224 }, // 40.45s
  { id: "4.1", file: "0.2_4.1.wav", frames:  589 }, // 19.29s
  { id: "4.2", file: "0.2_4.2.wav", frames: 1828 }, // 60.59s
  { id: "5.0", file: "0.2_5.0.wav", frames: 1342 }, // 44.37s
  { id: "5.1", file: "0.2_5.1.wav", frames: 1052 }, // 34.73s
  { id: "6.1", file: "0.2_6.1.wav", frames: 1836 }, // 60.84s
] as const;

// Cumulative start frames
const SEG_STARTS = SEGMENTS.reduce((acc, seg, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SEGMENTS[i - 1].frames);
  return acc;
}, [] as number[]);

const TOTAL_FRAMES_02 = SEG_STARTS[SEGMENTS.length - 1] + SEGMENTS[SEGMENTS.length - 1].frames;

// ─────────────────────────────────────────────────────────────────────────────
// useFadeUp
// ─────────────────────────────────────────────────────────────────────────────
function useFadeUp(startFrame: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const progress = spring({ frame: f, fps, config: { damping: 22, stiffness: 90 } });
  const opacity = interpolate(f, [0, 18], [0, 1], clamp);
  const y = interpolate(progress, [0, 1], [24, 0], clamp);
  return { opacity, transform: `translateY(${y}px)` };
}

function useFocusHighlight(startFrame: number, duration = 75) {
  const frame = useCurrentFrame();
  const f = frame - startFrame;
  if (f < 0 || f > duration) return {};
  const intensity = interpolate(f, [0, duration], [1, 0], clamp);
  return {
    boxShadow: `0 0 ${Math.round(intensity * 24)}px rgba(124,255,178,${(intensity * 0.55).toFixed(2)})`,
    borderColor: `rgba(124,255,178,${(0.14 + intensity * 0.5).toFixed(2)})`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ProgressBar — CH0-2 / 3, 66.6%
// ─────────────────────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ progressPct?: number }> = ({ progressPct = 66.6 }) => {
  const frame = useCurrentFrame();
  const slideY = interpolate(frame, [0, 18], [-72, 0], clamp);

  return (
    <div style={{
      position: "absolute",
      top: slideY, left: 0, right: 0,
      zIndex: 100,
      background: "rgba(0,0,0,0.92)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: `1px solid ${C.border}`,
      padding: "14px 40px",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "'Space Mono', monospace",
        fontSize: 16,
        color: C.muted,
        letterSpacing: "0.05em",
        marginBottom: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Img
            src={staticFile("aischool-logo.webp")}
            style={{ height: 22, width: "auto", mixBlendMode: "screen", opacity: 0.9 }}
          />
          <span>AI 寫程式入門課程</span>
        </div>
        <span>章節 0-2 / 3</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
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

// ─────────────────────────────────────────────────────────────────────────────
// iMessage Notification Callout — S=2 for Vibe Coding 1080p
// ─────────────────────────────────────────────────────────────────────────────
const S             = 2;
const NOTIF_W       = 290 * S;
const NOTIF_TOP     = 12  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLIDE_H = 110 * S;
const NOTIF_SLOT_H  = 100 * S;
const FADE_OUT_F    = 50;

type Callout = {
  from: number; to: number;
  label: string; text: string;
  side?: "left" | "right"; yPct?: number;
};

function calcStackOffset(c: Callout, allCallouts: Callout[], frame: number, fps: number): number {
  let offset = 0;
  for (const other of allCallouts) {
    if (other.from <= c.from) continue;
    if (frame < other.from) continue;
    const localF = frame - other.from;
    if (frame <= other.to) {
      const p = spring({ frame: localF, fps, config: { damping: 22, stiffness: 100 } });
      offset += p * NOTIF_SLOT_H;
    } else {
      const expiredF = frame - other.to;
      const p = spring({ frame: expiredF, fps, config: { damping: 22, stiffness: 100 } });
      offset += (1 - p) * NOTIF_SLOT_H;
    }
  }
  return offset;
}

const CalloutCard: React.FC<{ c: Callout; allCallouts: Callout[] }> = ({ c, allCallouts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // All hooks must be called before any conditional returns
  const stackOffset = calcStackOffset(c, allCallouts, frame, fps);

  if (frame < c.from || frame > c.to) return null;

  const localF   = frame - c.from;
  const duration = c.to - c.from;

  const progress  = spring({ frame: localF, fps, config: { damping: 22, stiffness: 130 } });
  const slideY    = interpolate(progress, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);
  const scaleIn   = interpolate(progress, [0, 1], [0.94, 1], clamp);

  const fadeIn    = interpolate(localF, [0, 8], [0, 1], clamp);
  const fadeOut   = interpolate(localF, [duration - FADE_OUT_F, duration], [1, 0], clamp);
  const opacity   = Math.min(fadeIn, fadeOut);

  const CHARS_PER_FRAME = 1.4;
  const charsVisible = interpolate(
    Math.max(0, localF - 10),
    [0, c.text.length / CHARS_PER_FRAME],
    [0, c.text.length],
    clamp
  );
  const displayText = c.text.slice(0, Math.floor(charsVisible));

  return (
    <div style={{
      position: "absolute",
      top: NAV_H + NOTIF_TOP + stackOffset,
      right: NOTIF_RIGHT,
      zIndex: 30,
      maxWidth: NOTIF_W,
      opacity,
      transform: `translateY(${slideY}px) scale(${scaleIn})`,
    }}>
      <div style={{
        background: "rgba(38, 38, 40, 0.90)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderRadius: 18,
        padding: "14px 18px 18px",
        boxShadow: "0 16px 48px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.08) inset",
        border: "1px solid rgba(255,255,255,0.11)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: "linear-gradient(145deg, #3cdb6e, #28c95a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 6px rgba(40,201,90,0.4)",
          }}>
            <div style={{ width: 15, height: 12, borderRadius: "6px 6px 6px 2px", background: "#fff" }} />
          </div>
          <span style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 18, fontWeight: 500,
            color: "rgba(255,255,255,0.45)", flex: 1,
          }}>訊息</span>
          <span style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 15, color: "rgba(255,255,255,0.30)",
          }}>剛剛</span>
        </div>
        <div style={{
          fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
          fontSize: 22, fontWeight: 700,
          color: "rgba(255,255,255,0.88)", marginBottom: 6,
        }}>{c.label}</div>
        <div style={{
          fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
          fontSize: 34, fontWeight: 800,
          color: "#ffffff", lineHeight: 1.35,
          whiteSpace: "pre-wrap" as const,
          letterSpacing: "-0.02em",
        }}>
          {displayText}
          {Math.floor(charsVisible) < c.text.length && (
            <span style={{
              display: "inline-block", width: 2, height: "0.85em",
              background: "rgba(255,255,255,0.7)", marginLeft: 3,
              verticalAlign: "text-bottom",
              opacity: localF % 16 < 8 ? 1 : 0,
            }} />
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Background Orbs
// ─────────────────────────────────────────────────────────────────────────────
const BgOrbs: React.FC = () => {
  const frame = useCurrentFrame();
  const bgAlpha = interpolate(frame, [0, 30], [0, 1], clamp);
  return (
    <>
      <div style={{
        position: "absolute", top: -200, right: -200, width: 600, height: 600,
        background: `radial-gradient(circle, rgba(124,255,178,${0.07 * bgAlpha}) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -200, left: -200, width: 500, height: 500,
        background: `radial-gradient(circle, rgba(124,255,178,${0.04 * bgAlpha}) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Speaker Lottie — bottom-right corner circle
// ─────────────────────────────────────────────────────────────────────────────
const AvatarOverlay: React.FC = () => {
  const frame  = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 20], [0, 1], clamp);
  return (
    <div style={{
      position: "absolute",
      bottom: 40, right: 40,
      width: 200, height: 200,
      borderRadius: "50%",
      overflow: "hidden",
      border: "3px solid rgba(124,255,178,0.6)",
      boxShadow: "0 0 20px rgba(124,255,178,0.25), 0 4px 16px rgba(0,0,0,0.6)",
      opacity: fadeIn, zIndex: 20,
    }}>
      <Lottie animationData={speakingData} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Section Header helper
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ num: string; title: string; fadeStyle: React.CSSProperties }> = ({
  num, title, fadeStyle,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, ...fadeStyle }}>
    <span style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: 22, color: C.primary,
      background: "rgba(124,255,178,0.08)",
      border: `1px solid ${C.border}`,
      padding: "6px 14px", borderRadius: 99,
      whiteSpace: "nowrap" as const,
    }}>{num}</span>
    <h2 style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      fontSize: 52, fontWeight: 700,
      letterSpacing: "-0.01em",
      color: C.text, margin: 0,
    }}>{title}</h2>
  </div>
);

// Card helper
const Card: React.FC<{
  children: React.ReactNode;
  fadeStyle?: React.CSSProperties;
  highlightStyle?: React.CSSProperties;
  marginBottom?: number;
}> = ({ children, fadeStyle = {}, highlightStyle = {}, marginBottom = 20 }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 22, padding: "36px 44px", marginBottom,
    ...fadeStyle, ...highlightStyle,
  }}>
    <p style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      fontSize: 36, color: C.muted, lineHeight: 1.8, margin: 0,
    }}>
      {children}
    </p>
  </div>
);

// Analogy box helper
const AnalogyBox: React.FC<{
  label: string; children: React.ReactNode;
  fadeStyle?: React.CSSProperties; highlightStyle?: React.CSSProperties; marginBottom?: number;
}> = ({ label, children, fadeStyle = {}, highlightStyle = {}, marginBottom = 20 }) => (
  <div style={{
    background: C.primaryLight, borderLeft: `4px solid ${C.primary}`,
    borderRadius: "0 16px 16px 0", padding: "32px 38px", marginBottom,
    ...fadeStyle, ...highlightStyle,
  }}>
    <div style={{
      fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700,
      color: C.primary, letterSpacing: "0.08em",
      textTransform: "uppercase" as const, marginBottom: 10,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <div style={{ width: 6, height: 6, background: C.primary, borderRadius: 1, flexShrink: 0, boxShadow: "0 0 6px #7cffb2" }} />
      {label}
    </div>
    <p style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      fontSize: 34, color: "#c8ffe0", lineHeight: 1.75, margin: 0,
    }}>
      {children}
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ToolCard — left colored border, tool label / name / desc / tags
// ─────────────────────────────────────────────────────────────────────────────
const ToolCard: React.FC<{
  toolLabel: string;
  toolName: string;
  toolNameColor: string;
  borderColor: string;
  description: React.ReactNode;
  tags: Array<{ text: string; highlighted?: boolean; highlightColor?: string }>;
  fadeStyle?: React.CSSProperties;
  highlightStyle?: React.CSSProperties;
  marginBottom?: number;
}> = ({
  toolLabel, toolName, toolNameColor, borderColor,
  description, tags,
  fadeStyle = {}, highlightStyle = {}, marginBottom = 24,
}) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 22, padding: "32px 36px 32px 40px", marginBottom,
    position: "relative", overflow: "hidden",
    ...fadeStyle, ...highlightStyle,
  }}>
    {/* Left colored accent bar */}
    <div style={{
      position: "absolute", top: 0, left: 0,
      width: 4, height: "100%",
      background: borderColor, borderRadius: "4px 0 0 4px",
    }} />
    {/* Tool label */}
    <div style={{
      fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700,
      color: C.muted, letterSpacing: "0.1em",
      textTransform: "uppercase" as const, marginBottom: 6,
    }}>{toolLabel}</div>
    {/* Tool name */}
    <div style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      fontSize: 32, fontWeight: 900, color: toolNameColor,
      letterSpacing: "-0.01em", marginBottom: 20,
    }}>{toolName}</div>
    {/* Description */}
    <div style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      fontSize: 28, color: C.muted, lineHeight: 1.75, marginBottom: 20,
    }}>{description}</div>
    {/* Tags */}
    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
      {tags.map((tag, i) => {
        const hc = tag.highlightColor || C.primary;
        return (
          <span key={i} style={{
            fontSize: 20, padding: "4px 14px", borderRadius: 99, fontWeight: 500,
            background: tag.highlighted ? `rgba(${hc === C.primary ? "124,255,178" : hc === C.yellow ? "255,209,102" : "124,255,178"},0.1)` : "rgba(255,255,255,0.05)",
            color: tag.highlighted ? hc : C.muted,
            border: tag.highlighted ? `1px solid ${hc}40` : "1px solid rgba(255,255,255,0.08)",
          }}>{tag.text}</span>
        );
      })}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// FlowDiagram — 3-step flow: 聊天式AI → 複製程式碼 → Apps Script執行
// ─────────────────────────────────────────────────────────────────────────────
const FlowDiagram: React.FC<{ fadeStyle?: React.CSSProperties }> = ({ fadeStyle = {} }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 0,
    marginBottom: 24, ...fadeStyle,
  }}>
    {[
      { icon: "AI", title: "聊天式 AI", desc: "用自然語言描述需求，AI 生成程式碼" },
      { icon: "CP", title: "複製程式碼", desc: "把 AI 產出的程式碼複製起來" },
      { icon: "RN", title: "Apps Script 執行", desc: "貼入後直接執行，任務完成" },
    ].map((step, i) => (
      <React.Fragment key={i}>
        <div style={{
          background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: "24px 28px",
          flex: 1, textAlign: "center" as const,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700,
            color: C.primary, marginBottom: 10,
            width: 44, height: 44,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(124,255,178,0.08)", borderRadius: 8,
            margin: "0 auto 10px",
          }}>{step.icon}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
            fontSize: 28, fontWeight: 700, marginBottom: 6, color: C.text,
          }}>{step.title}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
            fontSize: 24, color: C.muted, lineHeight: 1.5,
          }}>{step.desc}</div>
        </div>
        {i < 2 && (
          <div style={{
            fontSize: 28, color: C.primary,
            padding: "0 12px", flexShrink: 0,
          }}>→</div>
        )}
      </React.Fragment>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// UsecaseList — icon + text items
// ─────────────────────────────────────────────────────────────────────────────
const UsecaseList: React.FC<{
  items: Array<{ icon: string; title: string; desc: string }>;
  fadeStyle?: React.CSSProperties;
  marginBottom?: number;
}> = ({ items, fadeStyle = {}, marginBottom = 20 }) => (
  <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, marginBottom, ...fadeStyle }}>
    {items.map((item, i) => (
      <div key={i} style={{
        display: "flex", alignItems: "flex-start", gap: 16,
        background: C.surface2, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "18px 22px",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700,
          color: C.primary, flexShrink: 0, marginTop: 2,
          width: 36, height: 36, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(124,255,178,0.08)",
        }}>{item.icon}</div>
        <div style={{
          fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
          fontSize: 26, color: C.muted, lineHeight: 1.65,
        }}>
          <strong style={{ color: C.text }}>{item.title}</strong>
          {"　"}
          {item.desc}
        </div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// QuizBox
// ─────────────────────────────────────────────────────────────────────────────
const QuizBox: React.FC<{
  children: React.ReactNode;
  fadeStyle?: React.CSSProperties;
  marginBottom?: number;
}> = ({ children, fadeStyle = {}, marginBottom = 20 }) => (
  <div style={{
    border: "2px dashed rgba(255,209,102,0.3)", borderRadius: 16,
    padding: "28px 32px", marginBottom,
    background: "rgba(255,209,102,0.03)", ...fadeStyle,
  }}>
    <div style={{
      fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700,
      color: C.yellow, letterSpacing: "0.08em",
      textTransform: "uppercase" as const, marginBottom: 14,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <div style={{ width: 6, height: 6, background: C.yellow, borderRadius: 1, boxShadow: "0 0 6px #ffd166" }} />
      想一想
    </div>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 1 — SceneHero (segment 0.2_1.1)
// ─────────────────────────────────────────────────────────────────────────────
const SceneHero: React.FC = () => {
  const meta  = useFadeUp(28);
  const title = useFadeUp(50);
  const sub   = useFadeUp(75);

  const CALLOUTS_HERO: Callout[] = [
    { from: 510, to: 1050, label: "常見迷思", text: "工具太多，不知從哪開始" },
    { from: 1350, to: 1480, label: "好消息",  text: "3 個工具，搞定 8 成需求" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={66.6} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div>
          <div style={{ padding: "64px 0 48px", borderBottom: `1px solid ${C.border}`, marginBottom: 56 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, ...meta }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 20, color: C.primary,
                border: `1px solid ${C.primary}`, padding: "5px 14px", borderRadius: 99,
                letterSpacing: "0.05em", boxShadow: "0 0 10px rgba(124,255,178,0.2)",
              }}>CH 0-2</span>
              <span style={{ fontSize: 20, padding: "5px 14px", borderRadius: 99, fontWeight: 500, background: "rgba(124,255,178,0.1)", color: C.primary }}>✦ 完全零基礎</span>
              <span style={{ fontSize: 20, padding: "5px 14px", borderRadius: 99, fontWeight: 500, background: "rgba(255,209,102,0.1)", color: C.yellow }}>✦ 約 8 分鐘</span>
            </div>
            <div style={{ marginBottom: 20, ...title }}>
              <div style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", fontSize: 88, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.02em", color: C.text }}>
                工具這麼多，
              </div>
              <div style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", fontSize: 88, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.02em", color: C.primary }}>
                用這 3 個就夠了
              </div>
            </div>
            <div style={{ ...sub }}>
              <p style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", fontSize: 36, color: C.muted, lineHeight: 1.75, margin: 0, maxWidth: 700 }}>
                AI 寫程式不需要裝一堆工具。搞清楚這 3 個的定位，你就知道什麼情況用什麼，從此不再選擇困難。
              </p>
            </div>
          </div>
        </div>
      </div>
      {CALLOUTS_HERO.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS_HERO} />)}
      <AvatarOverlay />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 2 — SceneSection01 (segment 0.2_2.1)
// Section 01: 為什麼只需要3個工具？— 3 cards + analogy
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection01: React.FC = () => {
  const header    = useFadeUp(15);
  const card1     = useFadeUp(25);
  const card1HL   = useFocusHighlight(25);
  const card2     = useFadeUp(627);   // "你真正需要做的" ~20s
  const card2HL   = useFocusHighlight(627);
  const analogy   = useFadeUp(966);   // "就像廚師" ~32s
  const analogyHL = useFocusHighlight(966);
  const card3     = useFadeUp(1398);  // "知道自己想做的" ~46s
  const card3HL   = useFocusHighlight(1398);

  const CALLOUTS: Callout[] = [
    { from:  96, to:  627, label: "常見陷阱", text: "工具太多，遲遲沒動手" },
    { from: 627, to:  966, label: "關鍵",     text: "根據目標，選一個工具" },
    { from: 1398, to: 1680, label: "原則",    text: "3 個工具，搞定大部分需求" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={66.6} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 40 }}>
          <SectionHeader num="01" title="為什麼只需要 3 個工具？" fadeStyle={header} />
          <Card fadeStyle={card1} highlightStyle={card1HL}>
            剛開始接觸 AI 寫程式，最容易踩的坑就是<strong style={{ color: C.text }}>在工具上面花太多時間</strong>——每個工具都想試、每個比較文章都想看，結果反而遲遲沒有動手。
            {"　"}只要搞清楚 <span style={{ color: C.primary, fontWeight: 700 }}>3 個工具的定位</span>，就能搞定你大部分的需求。
          </Card>
          <Card fadeStyle={card2} highlightStyle={card2HL}>
            你真正需要做的，就只是根據<strong style={{ color: C.text }}>「你想做什麼事情」</strong>，去挑一個適合的工具就好了。不需要每一個都摸過一遍。
          </Card>
          <AnalogyBox label="一句話理解" fadeStyle={analogy} highlightStyle={analogyHL}>
            就像廚師不需要擁有一整間廚具店的設備——<strong style={{ color: "#ffffff" }}>一把好刀、一口好鍋、一個計時器，就能做出大多數的料理。</strong>
          </AnalogyBox>
          <Card fadeStyle={card3} highlightStyle={card3HL}>
            知道自己想做的事情是什麼，並且找到相對應適合的工具去熟悉使用方法，<strong style={{ color: C.text }}>會比全部工具都摸一遍但都一知半解來的好。</strong>
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3 — SceneSection02Intro (segment 0.2_3.1)
// Section 02 intro card + FlowDiagram (3 steps)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection02Intro: React.FC = () => {
  const header  = useFadeUp(15);
  const card    = useFadeUp(25);
  const cardHL  = useFocusHighlight(25);
  const flow    = useFadeUp(180);

  const CALLOUTS: Callout[] = [
    { from: 270, to:  720, label: "辦公自動化", text: "這組合，幾乎全搞定" },
    { from: 720, to: 1200, label: "分工邏輯",   text: "AI 生成，Apps Script 執行" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={66.6} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 40 }}>
          <SectionHeader num="02" title="工具一：聊天式 AI ＋ Google Apps Script" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            如果你想做的是<strong style={{ color: C.text }}>工作上的自動化、辦公效率提升</strong>，這個組合幾乎能搞定你需要的一切。
            {"　"}這個組合的邏輯很簡單：<span style={{ color: C.primary, fontWeight: 700 }}>聊天式 AI 負責「生成程式碼」</span>，<span style={{ color: C.primary, fontWeight: 700 }}>Google Apps Script 負責「讓程式跑起來」</span>。
          </Card>
          <FlowDiagram fadeStyle={flow} />
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4 — SceneSection02Tools (segment 0.2_3.2)
// Tool 1a + 1b cards + usecase list
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection02Tools: React.FC = () => {
  const header    = useFadeUp(15);
  const tool1a    = useFadeUp(25);
  const tool1aHL  = useFocusHighlight(25);
  const tool1b    = useFadeUp(360);
  const tool1bHL  = useFocusHighlight(360);
  const usecases  = useFadeUp(720);

  const CALLOUTS: Callout[] = [
    { from:  105, to:  720, label: "聊天式 AI",   text: "生成程式碼，需要執行環境" },
    { from:  720, to: 1590, label: "Apps Script", text: "免費、免安裝，Google 帳號即可" },
    { from: 1578, to: 2730, label: "實際用途",    text: "批次寄信、合併報表、批次轉檔" },
  ];

  const usecaseItems = [
    { icon: "①", title: "批次寄信", desc: "從試算表讀取名單，自動寄送個人化信件，不用一封一封手動填寫" },
    { icon: "②", title: "報表多合一", desc: "把多份分散的試算表自動合併成一份，省去每週重複的複製貼上" },
    { icon: "③", title: "批次轉檔", desc: "一次把幾十份 Google 文件轉成 PDF，不用一個一個手動操作" },
    { icon: "④", title: "簡單網頁、爬蟲", desc: "做基本的表單頁面，或定期抓取特定網站的公開資訊" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={66.6} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 40 }}>
          <SectionHeader num="02" title="工具一：聊天式 AI ＋ Google Apps Script" fadeStyle={header} />
          <ToolCard
            toolLabel="工具 1a"
            toolName="聊天式 AI"
            toolNameColor={C.primary}
            borderColor={C.primary}
            description={
              <>
                各種以對話介面為主的 AI 助理都算在這個類型。你用自然語言描述你的需求，AI 就能幫你生成對應的程式碼。
                {"　"}<strong style={{ color: C.text }}>程式碼本身只是一串文字，放在對話框裡什麼事都做不了</strong>——它需要一個「執行環境」，才能真正跑起來。
              </>
            }
            tags={[
              { text: "免費額度可用", highlighted: true },
              { text: "對話式操作" },
              { text: "生成程式碼" },
            ]}
            fadeStyle={tool1a}
            highlightStyle={tool1aHL}
          />
          <ToolCard
            toolLabel="工具 1b"
            toolName="Google Apps Script"
            toolNameColor={C.primary}
            borderColor={C.primary}
            description={
              <>
                Google Apps Script 同時具備兩個身份：它是一種<strong style={{ color: C.text }}>程式語言</strong>，也是一個<strong style={{ color: C.text }}>線上執行平台</strong>。
                {"　"}如果你的日常工作有用到 Google 文件、試算表、Gmail 或雲端硬碟，Apps Script 就是你的最佳執行環境。
                {"　"}<strong style={{ color: C.text }}>完全免費、不用下載任何東西</strong>，只要有 Google 帳號就能用。
              </>
            }
            tags={[
              { text: "完全免費", highlighted: true },
              { text: "無需安裝" },
              { text: "Google 帳號即可用" },
              { text: "串接 Google 服務" },
            ]}
            fadeStyle={tool1b}
            highlightStyle={tool1bHL}
          />
          <UsecaseList items={usecaseItems} fadeStyle={usecases} />
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 5 — SceneSection02Quiz (segment 0.2_3.3)
// Quiz box
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection02Quiz: React.FC = () => {
  const header  = useFadeUp(15);
  const usecases = useFadeUp(20);
  const quiz    = useFadeUp(120);

  const CALLOUTS: Callout[] = [
    { from: 500, to:  930, label: "流程回顧", text: "告訴 AI → 複製 → 貼上，完成" },
    { from: 980, to: 1320, label: "想一想",   text: "你最常做的重複操作？" },
  ];

  const usecaseItems = [
    { icon: "①", title: "批次寄信", desc: "從試算表讀取名單，自動寄送個人化信件" },
    { icon: "②", title: "報表多合一", desc: "把多份試算表自動合併，省去複製貼上" },
    { icon: "③", title: "批次轉檔", desc: "一次把幾十份 Google 文件轉成 PDF" },
    { icon: "④", title: "簡單網頁、爬蟲", desc: "基本表單頁面，或定期抓取公開資訊" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={66.6} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 40 }}>
          <SectionHeader num="02" title="工具一：聊天式 AI ＋ Google Apps Script" fadeStyle={header} />
          <UsecaseList items={usecaseItems} fadeStyle={usecases} marginBottom={16} />
          <QuizBox fadeStyle={quiz}>
            <p style={{
              fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
              color: C.muted, fontSize: 26, lineHeight: 1.7, margin: 0,
            }}>
              你目前工作中有用到 Google 試算表、Gmail 或 Google 文件嗎？
              {"　"}如果有，想想看你最常在這些工具上做的<strong style={{ color: C.text }}>重複性操作</strong>是什麼——那很可能就是你第一個可以自動化的任務。
            </p>
          </QuizBox>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 6 — SceneSection03Intro (segment 0.2_4.0)
// Section 03 intro card
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection03Intro: React.FC = () => {
  const header = useFadeUp(15);
  const card   = useFadeUp(25);
  const cardHL = useFocusHighlight(25);

  const CALLOUTS: Callout[] = [
    { from:  60, to: 510, label: "升級時機", text: "超出 Google 服務範圍時" },
    { from: 525, to: 900, label: "IDE",      text: "整合式開發環境" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={66.6} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="03" title="工具二：AI 整合式程式編輯器" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            當你想做的事情已經<strong style={{ color: C.text }}>超出 Google 服務的範圍</strong>，例如開發獨立的桌面小工具、功能完整的網頁應用程式、瀏覽器外掛，或是需要更強大的資料處理能力，這時候就需要升級到專業的開發工具。
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 7 — SceneSection03Tool (segment 0.2_4.1)
// Tool 2 card (yellow, IDE)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection03Tool: React.FC = () => {
  const header = useFadeUp(15);
  const tool   = useFadeUp(25);
  const toolHL = useFocusHighlight(25);

  const CALLOUTS: Callout[] = [
    { from:  90, to: 300, label: "IDE",  text: "給工程師的全功能創作軟體" },
    { from: 300, to: 560, label: "優勢", text: "AI 直接在專案內幫你建檔" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={66.6} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="03" title="工具二：AI 整合式程式編輯器" fadeStyle={header} />
          <ToolCard
            toolLabel="工具 2"
            toolName="AI 整合式程式編輯器"
            toolNameColor={C.yellow}
            borderColor={C.yellow}
            description={
              <>
                這類工具的專業術語叫做 <strong style={{ color: C.text }}>IDE（整合式開發環境）</strong>，可以把它想成是一套給工程師用的「全功能創作軟體」——就像影片剪輯師有專業的剪輯軟體，程式設計師有專業的程式編輯器。
                {"　"}現在這類工具已經把 AI 對話功能直接內建進去了。<strong style={{ color: C.text }}>你可以在裡面用自然語言描述需求，AI 會直接在專案資料夾裡幫你建立所有檔案、自動修改程式碼</strong>，整個開發流程一氣呵成。
                {"　"}這類工具通常有免費版可以使用，但 AI 功能的使用次數有額度限制，進階需求可以考慮付費訂閱。
              </>
            }
            tags={[
              { text: "免費版可用", highlighted: true, highlightColor: C.yellow },
              { text: "內建 AI 對話" },
              { text: "專業開發環境" },
              { text: "需要下載安裝" },
            ]}
            fadeStyle={tool}
            highlightStyle={toolHL}
          />
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 8 — SceneSection03Analogy (segment 0.2_4.2)
// Analogy with examples
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection03Analogy: React.FC = () => {
  const header    = useFadeUp(15);
  const card      = useFadeUp(20);
  const cardHL    = useFocusHighlight(20);
  const analogy   = useFadeUp(90);
  const analogyHL = useFocusHighlight(90);

  const CALLOUTS: Callout[] = [
    { from: 219, to:  486, label: "適合情境",   text: "讀取本機、網頁應用、外掛" },
    { from: 486, to:  756, label: "批次轉 GIF", text: "本機格式轉換，超出雲端範圍" },
    { from: 756, to: 1000, label: "複雜應用",   text: "帳號登入、資料儲存" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={66.6} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 40 }}>
          <SectionHeader num="03" title="工具二：AI 整合式程式編輯器" fadeStyle={header} />
          <ToolCard
            toolLabel="工具 2"
            toolName="AI 整合式程式編輯器"
            toolNameColor={C.yellow}
            borderColor={C.yellow}
            description="IDE：給工程師的全功能創作軟體，AI 對話功能內建，直接在專案裡幫你建立檔案。"
            tags={[
              { text: "免費版可用", highlighted: true, highlightColor: C.yellow },
              { text: "內建 AI 對話" },
              { text: "專業開發環境" },
            ]}
            fadeStyle={card}
            highlightStyle={cardHL}
            marginBottom={16}
          />
          <AnalogyBox label="具體例子" fadeStyle={analogy} highlightStyle={analogyHL}>
            適合用 AI 整合式編輯器來做的事情包括：
            {"　"}<strong style={{ color: "#ffffff" }}>把影片批次轉成 GIF</strong>——需要讀取本機檔案並做格式轉換，超出雲端服務的處理範圍。
            {"　"}<strong style={{ color: "#ffffff" }}>功能完整的網頁應用</strong>——有帳號登入、資料儲存、複雜互動的網頁，不是 Apps Script 能輕鬆應付的。
            {"　"}<strong style={{ color: "#ffffff" }}>瀏覽器外掛</strong>——需要安裝在瀏覽器上、修改網頁行為的小工具。
            {"　"}<strong style={{ color: "#ffffff" }}>自動化爬蟲腳本</strong>——需要模擬登入、繞過動態載入等複雜情境的資料蒐集程式。
          </AnalogyBox>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 9 — SceneSection04Intro (segment 0.2_5.0)
// Section 04 intro + analogy (Simple is the best)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection04Intro: React.FC = () => {
  const header    = useFadeUp(15);
  const card      = useFadeUp(25);
  const cardHL    = useFocusHighlight(25);
  const analogy   = useFadeUp(200);
  const analogyHL = useFocusHighlight(200);

  const CALLOUTS: Callout[] = [
    { from:  438, to:  900, label: "選工具邏輯", text: "跟 Google 服務有關嗎？" },
    { from: 1083, to: 1310, label: "原則",       text: "Simple is the best" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={66.6} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="04" title="怎麼決定用哪個工具？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            選工具的邏輯很簡單，就問自己一個問題：<strong style={{ color: C.text }}>「這件事，跟 Google 服務有關嗎？」</strong>
            {"　"}如果有關，就用聊天式 AI 加上 Apps Script——免費、免安裝、上手快。
            {"　"}如果沒有關係，或 Apps Script 做不到，那就升級到 AI 整合式編輯器。
          </Card>
          <AnalogyBox label="選工具最重要的原則" fadeStyle={analogy} highlightStyle={analogyHL}>
            <strong style={{ color: "#ffffff" }}>Simple is the best.</strong>
            {"　"}能用簡單的方法解決，就不要用複雜的。這是選工具最重要的原則。
          </AnalogyBox>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 10 — SceneSection04Table (segment 0.2_5.1)
// Compare table + quiz
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection04Table: React.FC = () => {
  const header  = useFadeUp(15);
  const analogy = useFadeUp(20);
  const table   = useFadeUp(90);
  const quiz    = useFadeUp(240);

  const CALLOUTS: Callout[] = [
    { from: 129, to: 420, label: "費用",     text: "Apps Script 完全免費" },
    { from: 567, to: 980, label: "入門成本", text: "零成本就能開始學習" },
  ];

  const tableRows = [
    ["適合情境", "Google 服務相關的自動化、辦公效率提升", "獨立應用程式、複雜網頁、瀏覽器外掛"],
    ["安裝需求", "無需安裝，瀏覽器直接使用",             "需要下載安裝軟體"],
    ["費用",     "Apps Script 完全免費；AI 工具有免費額度", "編輯器免費；AI 功能有額度，進階需付費"],
    ["上手難度", "較低，適合完全零基礎的入門",            "稍高，但 AI 已大幅降低門檻"],
    ["建議順序", "★ 先學這個",                          "進階後再接觸"],
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={66.6} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 40 }}>
          <SectionHeader num="04" title="怎麼決定用哪個工具？" fadeStyle={header} />
          <AnalogyBox label="選工具最重要的原則" fadeStyle={analogy} marginBottom={16}>
            <strong style={{ color: "#ffffff" }}>Simple is the best.</strong>
            {"　"}能用簡單的方法解決，就不要用複雜的。
          </AnalogyBox>

          {/* Compare table */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 22, overflow: "hidden", marginBottom: 16, ...table,
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  <th style={{ padding: "22px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 28, textAlign: "left", color: C.muted, width: "16%" }}></th>
                  <th style={{ padding: "22px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 28, textAlign: "left", color: C.primary, width: "42%" }}>聊天式 AI ＋ Apps Script</th>
                  <th style={{ padding: "22px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 28, textAlign: "left", color: C.primary, width: "42%" }}>AI 整合式編輯器</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(([label, colA, colB], i) => (
                  <tr key={i} style={{ borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}>
                    <td style={{ padding: "20px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26, fontWeight: 700, color: C.text }}>{label}</td>
                    <td style={{ padding: "20px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26, color: "#c8ffe0", verticalAlign: "top" }}>{colA}</td>
                    <td style={{ padding: "20px 28px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26, color: C.primary, verticalAlign: "top" }}>{colB}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <QuizBox fadeStyle={quiz}>
            <p style={{
              fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
              color: C.muted, fontSize: 26, lineHeight: 1.7, margin: 0,
            }}>
              回想一下你上一章想到的那個「想自動化的任務」——它跟 Google 文件、試算表或 Gmail 有關嗎？還是它需要做一些 Google 服務做不到的事？
              {"　"}試著用這個問題，幫自己決定從哪個工具開始入手。
            </p>
          </QuizBox>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 11 — SceneSection05Takeaway (segment 0.2_6.1)
// Section 05 費用 (3 items + analogy) + Takeaway (5 items)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection05Takeaway: React.FC = () => {
  const header    = useFadeUp(15);
  const usecases  = useFadeUp(25);
  const analogy   = useFadeUp(200);
  const analogyHL = useFocusHighlight(200);
  const takebox   = useFadeUp(290);
  const item1     = useFadeUp(330);
  const item2     = useFadeUp(420);
  const item3     = useFadeUp(510);
  const item4     = useFadeUp(600);
  const item5     = useFadeUp(690);

  const CALLOUTS: Callout[] = [
    { from:  210, to:  560, label: "重點一",    text: "3 個工具，搞定 8 成需求" },
    { from:  510, to:  900, label: "重點二",    text: "AI 生成，Apps Script 執行" },
    { from: 1260, to: 1600, label: "最重要原則", text: "Simple is the best" },
  ];

  const costItems = [
    { icon: "AI", title: "聊天式 AI", desc: "通常都有免費額度，免費版就已經足夠入門使用了。如果在意回覆品質，也可以選擇付費升級。" },
    { icon: "GS", title: "Google Apps Script", desc: "完全免費，不用花任何錢。" },
    { icon: "ID", title: "AI 整合式編輯器", desc: "本體大部分免費，只是 AI 功能會有使用額度限制。如果有進階需求，再考慮付費訂閱就好。" },
  ];

  const takeawayItems = [
    { text: "不需要學會所有工具，3 個工具就能搞定八成需求。", style: item1 },
    { text: "聊天式 AI 負責生成程式碼，Apps Script 負責讓它跑起來。", style: item2 },
    { text: "Apps Script 免費、免安裝，是辦公自動化最快的入門路徑。", style: item3 },
    { text: "需要做更複雜應用時，才升級到 AI 整合式程式編輯器。", style: item4 },
    { text: "選工具的原則：能用簡單的解決，就不用複雜的。", style: item5 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={66.6} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 40 }}>
          <SectionHeader num="05" title="費用怎麼算？" fadeStyle={header} />
          <UsecaseList items={costItems} fadeStyle={usecases} marginBottom={12} />
          <AnalogyBox label="入門成本" fadeStyle={analogy} highlightStyle={analogyHL} marginBottom={16}>
            整體來說，在你剛入門的這個階段，<strong style={{ color: "#ffffff" }}>完全可以不花任何一毛錢，就開始學習了。</strong>
          </AnalogyBox>

          {/* Takeaway box */}
          <div style={{
            background: "linear-gradient(135deg, rgba(124,255,178,0.07), rgba(124,255,178,0.03))",
            border: "1px solid rgba(124,255,178,0.25)",
            borderRadius: 22, padding: "28px 36px", ...takebox,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700,
              color: C.primary, letterSpacing: "0.1em",
              textTransform: "uppercase" as const, marginBottom: 18,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 6, height: 6, background: C.primary, borderRadius: 1, boxShadow: "0 0 6px #7cffb2" }} />
              本章重點整理
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column" as const, gap: 10, padding: 0, margin: 0 }}>
              {takeawayItems.map((item, i) => (
                <li key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
                  fontSize: 36, color: C.text, lineHeight: 1.55, ...item.style,
                }}>
                  <div style={{
                    background: C.primary, color: "#000000",
                    fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700,
                    width: 28, height: 28, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 4,
                  }}>{i + 1}</div>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FullVideo02 — chains all 11 segments
// ─────────────────────────────────────────────────────────────────────────────
const SCENES = [
  SceneHero,             // 0.2_1.1
  SceneSection01,        // 0.2_2.1
  SceneSection02Intro,   // 0.2_3.1
  SceneSection02Tools,   // 0.2_3.2
  SceneSection02Quiz,    // 0.2_3.3
  SceneSection03Intro,   // 0.2_4.0
  SceneSection03Tool,    // 0.2_4.1
  SceneSection03Analogy, // 0.2_4.2
  SceneSection04Intro,   // 0.2_5.0
  SceneSection04Table,   // 0.2_5.1
  SceneSection05Takeaway, // 0.2_6.1
];

export const FullVideo02: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* BGM — plays through the whole video */}
      <Audio src={staticFile("audio/course_background_music.wav")} volume={0.10} loop />

      {SEGMENTS.map((seg, i) => {
        const SceneComponent = SCENES[i];
        return (
          <Sequence key={seg.id} from={SEG_STARTS[i]} durationInFrames={seg.frames}>
            {/* Speaker audio — normalized to -16 LUFS */}
            <Audio src={staticFile(`audio/${seg.file}`)} volume={1.0} />
            {/* Visual scene */}
            <SceneComponent />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export { TOTAL_FRAMES_02 };
