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
  Video,
} from "remotion";

// ─────────────────────────────────────────────────────────────────────────────
// Design System — exact match to (N)ch0-1.html CSS variables
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
// Audio segment durations (computed: Math.ceil(duration * 30) + 10)
// ─────────────────────────────────────────────────────────────────────────────
const SEGMENTS = [
  { id: "1.1",  file: "0-1_1.1.wav",    frames: 1131 }, // 37.34s Hero
  { id: "2.1",  file: "0-1_2.1.wav",    frames: 1061 }, // 35.02s Section01 Card1
  { id: "2.2",  file: "0-1_2.2.wav",    frames: 1067 }, // 35.20s Section01 Analogy
  { id: "2.3",  file: "0-1_2.3.wav",    frames: 1367 }, // 45.23s Section01 Card2
  { id: "3.0",  file: "0-1_3.0.wav",    frames: 2641 }, // 87.68s Section02 Card
  { id: "3.1",  file: "0-1_3.1.wav",    frames: 3619 }, // 120.28s Section02 Usecases
  { id: "3.2",  file: "0-1_3.2.wav",    frames: 1546 }, // 51.18s Section02 Leisure+Quiz
  { id: "4.1",  file: "0-1_4.1.wav",    frames: 2293 }, // 76.07s Section03 AI Coding
  { id: "4.2",  file: "0-1_4.2.wav",    frames: 1050 }, // 34.64s Section03 Vibe Coding def
  { id: "4.3",  file: "0-1_4.3.wav",    frames: 2187 }, // 72.54s Section03 Analogy
  { id: "5.1",  file: "0-1_5.1.wav",    frames: 1607 }, // 53.22s Section04 Vibe traits
  { id: "5.2",  file: "0-1_5.2.wav",    frames:  874 }, // 28.79s Section04 AI traits
  { id: "5.3",  file: "0-1_5.3.wav",    frames: 3148 }, // 104.58s Section04 Path+Quiz
  { id: "6.1",  file: "0-1_6.1.wav",    frames: 2429 }, // 80.62s Takeaway
] as const;

// Cumulative start frames
const SEG_STARTS = SEGMENTS.reduce((acc, seg, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SEGMENTS[i - 1].frames);
  return acc;
}, [] as number[]);

const TOTAL_FRAMES = SEG_STARTS[SEGMENTS.length - 1] + SEGMENTS[SEGMENTS.length - 1].frames;

// ─────────────────────────────────────────────────────────────────────────────
// useFadeUp — replicates HTML `animation: fadeUp 0.6s ease both`
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
// ProgressBar
// ─────────────────────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ progressPct?: number }> = ({ progressPct = 8 }) => {
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
        fontSize: 13,
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
        <span>章節 0-1 / 4</span>
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
const NOTIF_W       = 290 * S;   // 580px  fixed width
const NOTIF_TOP     = 12  * S;   // 24px   gap below nav
const NOTIF_RIGHT   = 20  * S;   // 40px   from right edge
const NOTIF_SLIDE_H = 110 * S;   // 220px  slide-in height
const NOTIF_SLOT_H  = 100 * S;   // 200px  per slot (card height + gap)
const FADE_OUT_F    = 50;

type Callout = {
  from: number; to: number;
  label: string; text: string;
  side?: "left" | "right"; yPct?: number; // kept for compat, ignored in layout
};

// Compute smooth Y offset for stacking: each newer active callout pushes this one down
// Pure function — no hooks, takes frame/fps as params
function calcStackOffset(c: Callout, allCallouts: Callout[], frame: number, fps: number): number {
  let offset = 0;
  for (const other of allCallouts) {
    if (other.from <= c.from) continue; // only newer cards push this one down
    if (frame < other.from) continue;   // not started yet
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

  // Slide DOWN from above nav bar
  const progress  = spring({ frame: localF, fps, config: { damping: 22, stiffness: 130 } });
  const slideY    = interpolate(progress, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);
  const scaleIn   = interpolate(progress, [0, 1], [0.94, 1], clamp);

  // Fade in fast, fade out slowly over last FADE_OUT_F frames
  const fadeIn    = interpolate(localF, [0, 8], [0, 1], clamp);
  const fadeOut   = interpolate(localF, [duration - FADE_OUT_F, duration], [1, 0], clamp);
  const opacity   = Math.min(fadeIn, fadeOut);

  // Typewriter (starts 10f after card arrives)
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
        {/* Header: Messages icon + "訊息" + "剛剛" */}
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
            fontSize: 13, fontWeight: 500,
            color: "rgba(255,255,255,0.45)", flex: 1,
          }}>訊息</span>
          <span style={{
            fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
            fontSize: 12, color: "rgba(255,255,255,0.30)",
          }}>剛剛</span>
        </div>

        {/* Sender / label */}
        <div style={{
          fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
          fontSize: 15, fontWeight: 700,
          color: "rgba(255,255,255,0.88)", marginBottom: 6,
        }}>{c.label}</div>

        {/* Message body — typewriter */}
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
// Avatar Overlay — HeyGen lip-sync circle, bottom-right corner
// ─────────────────────────────────────────────────────────────────────────────
const AVATAR_SIZE   = 180;
const AVATAR_RIGHT  = 40;
const AVATAR_BOTTOM = 40;

const AvatarOverlay: React.FC<{ segmentId: string }> = ({ segmentId }) => {
  const frame  = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 20], [0, 1], clamp);

  return (
    <div style={{
      position: "absolute",
      bottom: AVATAR_BOTTOM,
      right: AVATAR_RIGHT,
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: "50%",
      overflow: "hidden",
      border: "3px solid rgba(124,255,178,0.6)",
      boxShadow: "0 0 20px rgba(124,255,178,0.25), 0 4px 16px rgba(0,0,0,0.6)",
      opacity: fadeIn,
      zIndex: 20,
    }}>
      <Video
        src={staticFile(`avatar/0-1_${segmentId}.mp4`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        muted
      />
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
const Card: React.FC<{ children: React.ReactNode; fadeStyle?: React.CSSProperties; highlightStyle?: React.CSSProperties; marginBottom?: number }> = ({
  children, fadeStyle = {}, highlightStyle = {}, marginBottom = 20,
}) => (
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
// SCENE 1 — Hero (segment 1.1, frames 0–1210)
// ─────────────────────────────────────────────────────────────────────────────
const SceneHero: React.FC = () => {
  const meta  = useFadeUp(28);
  const title = useFadeUp(50);
  const sub   = useFadeUp(75);

  const CALLOUTS_HERO: Callout[] = [
    { from: 133, to: 300,  label: "很多人的感受", text: "「寫程式」，感覺離我很遠",    side: "right", yPct: 0.28 },
    { from: 302, to: 516,  label: "好消息",       text: "零技術背景，也可以",           side: "right", yPct: 0.22 },
    { from: 518, to: 836,  label: "關鍵",         text: "靠 AI 的幫助，讓電腦替你做事", side: "right", yPct: 0.55 },
    { from: 838, to: 1140, label: "本章主題",     text: "寫程式，到底是什麼",           side: "right", yPct: 0.38 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={2} />
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
              }}>CH 0-1</span>
              <span style={{ fontSize: 20, padding: "5px 14px", borderRadius: 99, fontWeight: 500, background: "rgba(124,255,178,0.1)", color: C.primary }}>✦ 完全零基礎</span>
              <span style={{ fontSize: 20, padding: "5px 14px", borderRadius: 99, fontWeight: 500, background: "rgba(255,209,102,0.1)", color: C.yellow }}>✦ 約 10 分鐘</span>
            </div>
            <div style={{ marginBottom: 20, ...title }}>
              <div style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", fontSize: 88, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.02em", color: C.text }}>
                AI 寫程式是什麼？
              </div>
              <div style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", fontSize: 88, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.02em", color: C.text }}>
                Vibe Coding 入門
              </div>
            </div>
            <div style={{ ...sub }}>
              <p style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", fontSize: 36, color: C.muted, lineHeight: 1.75, margin: 0, maxWidth: 600 }}>
                從「寫程式」的本質出發，理解為什麼現在是人人都能寫程式的時代，以及 Vibe Coding 與 AI Coding 有什麼不同。
              </p>
            </div>
          </div>
        </div>
      </div>
      {CALLOUTS_HERO.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS_HERO} />)}
      <AvatarOverlay segmentId="1.1" />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 2 — Section 01 Card 1: 自動化概念 (segment 2.1)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection01Card1: React.FC = () => {
  const header = useFadeUp(15);
  const card   = useFadeUp(30);
  const cardHL = useFocusHighlight(30);

  const CALLOUTS: Callout[] = [
    { from: 150, to: 508,  label: "核心概念", text: "把人要做的事，外包給電腦",      side: "right", yPct: 0.3 },
    { from: 510, to: 628,  label: "正式名稱", text: "自動化",                         side: "right", yPct: 0.4 },
    { from: 630, to: 1118, label: "條件",     text: "固定步驟，電腦可執行",           side: "right", yPct: 0.3 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={10} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="01" title="寫程式，究竟是什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            <strong style={{ color: C.text }}>寫程式的本質，就是把「人要做的事」轉交給電腦去執行。</strong>
            <br />
            這件事有個更正式的名字，叫做{" "}
            <span style={{ color: C.primary, fontWeight: 700 }}>自動化</span>
            。只要一件工作有固定的步驟、電腦能一一代勞，它就可以被自動化。
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay segmentId="2.1" />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3 — Section 01 Analogy: 生活比喻 (segment 2.2)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection01Analogy: React.FC = () => {
  const header    = useFadeUp(15);
  const card      = useFadeUp(25);
  const cardHL    = useFocusHighlight(25);
  const analogy   = useFadeUp(397);
  const analogyHL = useFocusHighlight(397);

  const CALLOUTS: Callout[] = [
    { from: 407, to: 888,  label: "比喻",   text: "訓練，永不出錯的助手",   side: "right", yPct: 0.35 },
    { from: 890, to: 1148, label: "關鍵",   text: "說清楚規則，剩下交給他", side: "right", yPct: 0.4 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={15} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="01" title="寫程式，究竟是什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            <strong style={{ color: C.text }}>寫程式的本質，就是把「人要做的事」轉交給電腦去執行。</strong>
            <br />
            這件事有個更正式的名字，叫做{" "}
            <span style={{ color: C.primary, fontWeight: 700 }}>自動化</span>
            。只要一件工作有固定的步驟、電腦能一一代勞，它就可以被自動化。
          </Card>
          <AnalogyBox label="一句話理解" fadeStyle={analogy} highlightStyle={analogyHL}>
            想像你每天上班前都要手動把一疊文件依日期排好、蓋上編號。
            <strong style={{ color: "#ffffff" }}>
              {" "}寫程式，就像是訓練一個永遠不會出錯、也不需要午休的助手，讓它幫你把這件事自動完成。
            </strong>
            你只需要說清楚規則，剩下的交給它。
          </AnalogyBox>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay segmentId="2.2" />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4 — Section 01 Card 2: 廣義vs狹義 (segment 2.3)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection01Card2: React.FC = () => {
  const header    = useFadeUp(15);
  const card1     = useFadeUp(25);
  const card1HL   = useFocusHighlight(25);
  const analogy   = useFadeUp(35);
  const analogyHL = useFocusHighlight(35);
  const card2     = useFadeUp(200);
  const card2HL   = useFocusHighlight(200);

  const CALLOUTS: Callout[] = [
    { from: 210, to: 688,  label: "廣義來說", text: "試算表公式，也是寫程式",         side: "right", yPct: 0.3 },
    { from: 690, to: 1377, label: "狹義來說", text: "正規程式語言：網頁・App・智慧家電", side: "right", yPct: 0.45 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={20} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="01" title="寫程式，究竟是什麼？" fadeStyle={header} />
          <Card fadeStyle={card1} highlightStyle={card1HL}>
            <strong style={{ color: C.text }}>寫程式的本質，就是把「人要做的事」轉交給電腦去執行。</strong>
            <br />
            這件事有個更正式的名字，叫做{" "}
            <span style={{ color: C.primary, fontWeight: 700 }}>自動化</span>
            。
          </Card>
          <AnalogyBox label="一句話理解" fadeStyle={analogy} highlightStyle={analogyHL}>
            寫程式，就像是訓練一個永遠不會出錯的助手。說清楚規則，剩下交給它。
          </AnalogyBox>
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 22, padding: "36px 44px", marginBottom: 20, ...card2, ...card2HL,
          }}>
            <p style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", fontSize: 36, color: C.muted, lineHeight: 1.8, margin: 0 }}>
              廣義來說，試算表裡的公式也算是一種「寫程式」——每一條公式就是給電腦的一道指令，告訴它「用這個規則算出結果」。
              <br /><br />
              但狹義的「程式」，指的是用正規的程式語言，寫出我們日常生活中會用到的各種軟體：
              <span style={{ color: C.primary, fontWeight: 700 }}>你正在瀏覽的網頁、手機裡的各種 App，甚至是家裡各種智慧家電的控制系統</span>……這些東西背後，都是程式在運作。
            </p>
          </div>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay segmentId="2.3" />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 5 — Section 02 Card: 非工程師前言 (segment 3.0)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection02Intro: React.FC = () => {
  const header = useFadeUp(15);
  const card   = useFadeUp(25);
  const cardHL = useFocusHighlight(25);
  const case1  = useFadeUp(770);
  const case2  = useFadeUp(1370);
  const case3  = useFadeUp(1910);

  const CALLOUTS: Callout[] = [
    { from: 120,  to: 838,  label: "關鍵問題",  text: "這跟我，有什麼關係？",        side: "right", yPct: 0.3  },
    { from: 840,  to: 1438, label: "情境一",    text: "大量重複的工作",              side: "right", yPct: 0.4  },
    { from: 1440, to: 1978, label: "情境二",    text: "手動輸入，容易失誤",            side: "right", yPct: 0.35 },
    { from: 1980, to: 2638, label: "情境三",    text: "定期收集，整合資訊",            side: "right", yPct: 0.4  },
    { from: 2640, to: 2779, label: "結論",      text: "適合交給小幫手執行",          side: "right", yPct: 0.3  },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={28} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="02" title="非工程師，可以用寫程式做什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            不需要成為軟體工程師，<strong style={{ color: C.text }}>只要你手上有下面這三種麻煩</strong>，寫程式就能幫上你的忙：
          </Card>

          {/* Usecase grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
            {[
              { icon: "↻", title: "重複性工作", desc: "每天或每週都要手動執行同樣操作，步驟固定但耗時費力。", style: case1 },
              { icon: "!", title: "人工容易出錯", desc: "靠人工一筆一筆輸入，難免遺漏或打錯，影響資料品質。", style: case2 },
              { icon: "◎", title: "資訊蒐集整理", desc: "需要定期從多個來源收集資料，整合起來又要花大量時間。", style: case3 },
            ].map((item, i) => (
              <div key={i} style={{
                background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: 16, padding: "30px 32px", ...item.style,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 34,
                  color: C.primary, marginBottom: 12,
                  width: 54, height: 54,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(124,255,178,0.08)", borderRadius: 8,
                }}>{item.icon}</div>
                <h3 style={{
                  fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
                  fontSize: 30, fontWeight: 700, marginBottom: 6, color: C.text,
                }}>{item.title}</h3>
                <p style={{
                  fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
                  fontSize: 24, color: C.muted, lineHeight: 1.6, margin: 0,
                }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay segmentId="3.0" />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 6 — Section 02 Usecases: 具體場景 (segment 3.1)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection02Usecases: React.FC = () => {
  const header    = useFadeUp(15);
  const analogy   = useFadeUp(25);
  const analogyHL = useFocusHighlight(25);
  const scene2    = useFadeUp(1370);
  const scene3    = useFadeUp(2240);

  const CALLOUTS: Callout[] = [
    { from: 1140, to: 1948, label: "場景一", text: "200 封信，一次送出",       side: "right", yPct: 0.3 },
    { from: 1950, to: 2968, label: "場景二", text: "兩小時縮短到幾秒",       side: "right", yPct: 0.4 },
    { from: 2970, to: 3358, label: "場景三", text: "每天早上，自動通知降價",   side: "right", yPct: 0.35 },
    { from: 3360, to: 3653, label: "現在就能做到", text: "AI 時代，都可以實現", side: "right", yPct: 0.3 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={38} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="02" title="非工程師，可以用寫程式做什麼？" fadeStyle={header} />
          <AnalogyBox label="具體例子" fadeStyle={analogy} highlightStyle={analogyHL}>
            <strong style={{ color: "#ffffff" }}>場景一：</strong>你負責活動行銷，每次寄邀請信都要開 Excel、一行一行複製姓名改稱謂、一封一封手動寄出。
            寫一個自動寄信程式，就能讓電腦替你把 200 封個人化的信件，在指定時間一次送出。
            <br /><br />
            <strong style={{ color: "#ffffff", ...scene2 as any }}>場景二：</strong>你每個月要從四、五個不同的系統下載 CSV 報表、手動合併再計算業績。
            一個自動合併報表的小程式，能讓這件事從兩小時縮短到幾秒鐘。
            <br /><br />
            <strong style={{ color: "#ffffff", ...scene3 as any }}>場景三：</strong>你想追蹤某個電商平台上特定商品的價格變化。
            寫一個定時抓取資料的程式，每天早上自動通知你，不用手動一次次重新整理頁面。
          </AnalogyBox>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay segmentId="3.1" />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 7 — Section 02 Leisure + Quiz (segment 3.2)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection02LeisureQuiz: React.FC = () => {
  const header = useFadeUp(15);
  const card   = useFadeUp(25);
  const cardHL = useFocusHighlight(25);
  const quiz   = useFadeUp(1280);

  const CALLOUTS: Callout[] = [
    { from: 210,  to: 1288, label: "寫程式的另一面", text: "生活樂趣，提升品質",    side: "right", yPct: 0.3 },
    { from: 1290, to: 1566, label: "你的 idea",       text: "懂得跟 AI 溝通，就能實現", side: "right", yPct: 0.45 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={45} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="02" title="非工程師，可以用寫程式做什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            除了提升工作效率，<strong style={{ color: C.text }}>寫程式這件事，其實也可以成為一種生活樂趣，甚至提升你的生活品質。</strong>
            <br /><br />
            你腦袋裡有沒有一些有趣的點子，一直很想做，卻不知道怎麼執行？
            比如說，做一個讓朋友填寫「旅遊類型是 P 人還是 J 人」的投票頁面；
            或是一個可以隨機幫你決定今天晚餐吃什麼的小工具；
            甚至是一個收集你喜歡食譜的個人頁面——
            <br /><br />
            這些，現在只要你有這些有趣的 idea，同時懂得如何跟 AI 有效溝通，<strong style={{ color: C.text }}>通通都可以透過 AI 幫你實現。</strong>
          </Card>

          {/* Quiz box */}
          <div style={{
            border: "2px dashed rgba(255,209,102,0.3)", borderRadius: 16,
            padding: "28px 32px", marginBottom: 20,
            background: "rgba(255,209,102,0.03)", ...quiz,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
              color: C.yellow, letterSpacing: "0.08em",
              textTransform: "uppercase" as const, marginBottom: 14,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 6, height: 6, background: C.yellow, borderRadius: 1, boxShadow: "0 0 6px #ffd166" }} />
              想一想
            </div>
            <p style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", color: C.muted, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
              回想一下你最近一週的工作或日常生活，有沒有哪件事讓你覺得「這也太重複了吧」？
            </p>
            <ul style={{ paddingLeft: 20, marginTop: 12 }}>
              {["那件事有固定的步驟嗎？", "每次做的時候，流程幾乎都一樣嗎？", "如果有個助手可以幫你做，你會想把它交出去嗎？"].map((q, i) => (
                <li key={i} style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", color: C.muted, fontSize: 14, marginBottom: 8 }}>{q}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay segmentId="3.2" />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 8 — Section 03: AI Coding 定義 (segment 4.1)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection03AICoding: React.FC = () => {
  const header = useFadeUp(15);
  const card   = useFadeUp(30);
  const cardHL = useFocusHighlight(30);

  const CALLOUTS: Callout[] = [
    { from:    0, to:  928, label: "神燈精靈", text: "AI 幫我們，實現困難的事",     side: "right", yPct: 0.3 },
    { from:  930, to: 1168, label: "AI Coding", text: "AI 輔助程式設計",          side: "right", yPct: 0.4 },
    { from: 1170, to: 2008, label: "定義",      text: "AI 產生，部分或全部程式碼",  side: "right", yPct: 0.35 },
    { from: 2010, to: 2338, label: "效率",      text: "每行手打 → AI 生成",         side: "right", yPct: 0.3 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={55} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="03" title="Vibe Coding 是什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            AI 就像是<strong style={{ color: C.text }}>神燈精靈</strong>，可以幫助我們實現很多曾經覺得很困難、甚至辦不到的事情。在 AI 寫程式的領域中，有兩種不同的方式：
            <br /><br />
            <span style={{ color: C.primary, fontWeight: 700 }}>AI Coding（AI 輔助程式設計）</span>，指的是在寫程式的過程中，讓 AI 幫你產生部分或全部的程式碼。
            無論 AI 生成的比例高低，只要有用到 AI 來協助產出程式碼，都算在這個範疇內。
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay segmentId="4.1" />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 9 — Section 03: Vibe Coding 定義 (segment 4.2)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection03VibeCoding: React.FC = () => {
  const header = useFadeUp(15);
  const card   = useFadeUp(25);
  const cardHL = useFocusHighlight(25);

  const CALLOUTS: Callout[] = [
    { from:   0, to:  628, label: "Vibe", text: "輕鬆，靠感覺",              side: "right", yPct: 0.3 },
    { from: 630, to: 1065, label: "Vibe Coding", text: "完全不碰程式碼",   side: "right", yPct: 0.4 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={60} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="03" title="Vibe Coding 是什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            <span style={{ color: C.primary, fontWeight: 700 }}>AI Coding</span>，指的是讓 AI 幫你產生部分或全部的程式碼。
            <br /><br />
            而 <span style={{ color: C.primary, fontWeight: 700 }}>Vibe Coding</span> 是近年出現的新詞，「Vibe」有「跟著感覺走、輕鬆隨興」的意思。
            <strong style={{ color: C.text }}> Vibe Coding 指的是：完全靠描述和對話來驅動 AI 產出程式，自己完全不碰程式碼的開發方式。</strong>
          </Card>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay segmentId="4.2" />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 10 — Section 03 Analogy: 實際感覺 (segment 4.3)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection03Analogy: React.FC = () => {
  const header    = useFadeUp(15);
  const card      = useFadeUp(25);
  const cardHL    = useFocusHighlight(25);
  const analogy   = useFadeUp(228);
  const analogyHL = useFocusHighlight(228);
  const card2     = useFadeUp(1310);
  const card2HL   = useFocusHighlight(1310);

  const CALLOUTS: Callout[] = [
    { from:  238, to:  904, label: "你是甲方",  text: "需求提出者，AI 是工程師",       side: "right", yPct: 0.3 },
    { from:  906, to: 1703, label: "用說的就行", text: "描述需求，AI 建出成品",          side: "right", yPct: 0.4 },
    { from: 1705, to: 1974, label: "修改也一樣", text: "「把背景換成藍色」",           side: "right", yPct: 0.35 },
    { from: 1976, to: 2196, label: "全程",       text: "不需要寫任何一行程式碼",       side: "right", yPct: 0.3 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={65} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="03" title="Vibe Coding 是什麼？" fadeStyle={header} />
          <Card fadeStyle={card} highlightStyle={cardHL}>
            <span style={{ color: C.primary, fontWeight: 700 }}>Vibe Coding</span>：完全靠描述和對話來驅動 AI 產出程式，自己完全不碰程式碼的開發方式。
          </Card>
          <AnalogyBox label="一句話理解" fadeStyle={analogy} highlightStyle={analogyHL}>
            Vibe Coding 就像是你扮演<strong style={{ color: "#ffffff" }}>甲方（需求提出者）</strong>，AI 是<strong style={{ color: "#ffffff" }}>工程師（執行者）</strong>。
            你只要說「我要一個可以讓朋友填寫旅遊偏好的表單頁面」，AI 就去把整個東西做出來。
            你不需要懂它是怎麼建的，也不用看程式碼長什麼樣子。
          </AnalogyBox>
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 22, padding: "36px 44px", marginBottom: 20, ...card2, ...card2HL,
          }}>
            <p style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", fontSize: 36, color: C.muted, lineHeight: 1.8, margin: 0 }}>
              實際體驗 Vibe Coding 的感覺是這樣的：你用自然語言（中文就行）描述你想要什麼，
              例如「我想要一個可以讓朋友填寫旅遊偏好的表單頁面，整體設計是可愛風格，提交之後要顯示一個『謝謝填寫』的畫面」，AI 工具就會直接產出一個可以用的成品。
              如果不滿意某個地方，繼續在對話框說「把背景換成藍色」、「把按鈕的文字改得更可愛一點」，AI 就會幫你修改。
              <strong style={{ color: C.text }}> 全程不需要手打任何一行程式碼。</strong>
            </p>
          </div>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay segmentId="4.3" />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 11 — Section 04: Vibe Coding 特性 (segment 5.1)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection04VibeTraits: React.FC = () => {
  const header  = useFadeUp(15);
  const intro   = useFadeUp(25);
  const introHL = useFocusHighlight(25);
  const table   = useFadeUp(305);

  const CALLOUTS: Callout[] = [
    { from:  315, to:  643, label: "人工介入比例", text: "Vibe Coding，非常低",         side: "right", yPct: 0.3 },
    { from:  645, to: 1112, label: "好處",         text: "不需學任何程式知識",         side: "right", yPct: 0.4 },
    { from: 1114, to: 1371, label: "壞處",         text: "複雜需求，難精準達成",          side: "right", yPct: 0.35 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={72} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="04" title="Vibe Coding vs AI Coding：有什麼差別？" fadeStyle={header} />
          <Card fadeStyle={intro} highlightStyle={introHL}>
            這兩種方式都是 AI 輔助開發，但<strong style={{ color: C.text }}>人工介入的程度</strong>不同，適合的使用情境也有所差異。
          </Card>
          {/* Compare table — Vibe column highlighted */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 16, overflow: "hidden", marginBottom: 20, ...table,
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  <th style={{ padding: "14px 20px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13, textAlign: "left", color: C.muted }}></th>
                  <th style={{ padding: "14px 20px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13, textAlign: "left", color: C.primary }}>Vibe Coding</th>
                  <th style={{ padding: "14px 20px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13, textAlign: "left", color: C.text }}>AI Coding</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["操作方式", "完全用自然語言描述，全程不碰程式碼", "主要靠 AI，必要時用一點技術知識介入引導"],
                  ["門檻",     "零基礎即可，會說話就能用",            "需要一些基礎概念，但不需要成為工程師"],
                  ["優勢",     "上手快、容易有成就感、適合簡單的小工具", "成果更精準、遇到問題有能力排除"],
                  ["限制",     "複雜需求難以精準達成，卡關時不容易解決", "需要投入一點學習時間"],
                  ["適合誰",   "初學者、想快速驗證創意的人",          "想穩定產出可用作品的人"],
                ].map(([label, vibe, ai], i) => (
                  <tr key={i} style={{ borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <td style={{ padding: "14px 20px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>{label}</td>
                    <td style={{ padding: "14px 20px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14, color: C.primary, verticalAlign: "top" }}>{vibe}</td>
                    <td style={{ padding: "14px 20px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14, color: "#cccccc", verticalAlign: "top" }}>{ai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay segmentId="5.1" />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 12 — Section 04: AI Coding 特性 (segment 5.2)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection04AITraits: React.FC = () => {
  const header = useFadeUp(15);
  const table  = useFadeUp(200);

  const CALLOUTS: Callout[] = [
    { from: 210, to: 718, label: "AI Coding", text: "有 Vibe 成分，更精準引導",    side: "right", yPct: 0.3 },
    { from: 720, to: 934, label: "優勢",      text: "遇問題，有能力排查",          side: "right", yPct: 0.4 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={78} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="04" title="Vibe Coding vs AI Coding：有什麼差別？" fadeStyle={header} />
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 16, overflow: "hidden", marginBottom: 20, ...table,
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  <th style={{ padding: "14px 20px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13, textAlign: "left", color: C.muted }}></th>
                  <th style={{ padding: "14px 20px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13, textAlign: "left", color: C.primary }}>Vibe Coding</th>
                  <th style={{ padding: "14px 20px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13, textAlign: "left", color: C.text }}>AI Coding</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["操作方式", "完全用自然語言描述，全程不碰程式碼", "主要靠 AI，必要時用一點技術知識介入引導"],
                  ["門檻",     "零基礎即可，會說話就能用",            "需要一些基礎概念，但不需要成為工程師"],
                  ["優勢",     "上手快、容易有成就感、適合簡單的小工具", "成果更精準、遇到問題有能力排除"],
                  ["限制",     "複雜需求難以精準達成，卡關時不容易解決", "需要投入一點學習時間"],
                  ["適合誰",   "初學者、想快速驗證創意的人",          "想穩定產出可用作品的人"],
                ].map(([label, vibe, ai], i) => (
                  <tr key={i} style={{ borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <td style={{ padding: "14px 20px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>{label}</td>
                    <td style={{ padding: "14px 20px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14, color: C.primary, verticalAlign: "top" }}>{vibe}</td>
                    <td style={{ padding: "14px 20px", fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14, color: "#cccccc", verticalAlign: "top" }}>{ai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay segmentId="5.2" />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 13 — Section 04: 學習路徑 + Quiz (segment 5.3)
// ─────────────────────────────────────────────────────────────────────────────
const SceneSection04Path: React.FC = () => {
  const header = useFadeUp(15);
  const step1  = useFadeUp(140);
  const step2  = useFadeUp(920);
  const step3  = useFadeUp(1970);
  const quiz   = useFadeUp(2530);

  const CALLOUTS: Callout[] = [
    { from:  150, to: 1048, label: "建議路徑",  text: "先從 Vibe Coding 開始",       side: "right", yPct: 0.3 },
    { from: 1050, to: 1738, label: "進階",      text: "學 AI Coding 核心知識",        side: "right", yPct: 0.4 },
    { from: 1740, to: 2428, label: "不用成為",  text: "工程師，1% 關鍵知識就夠",       side: "right", yPct: 0.35 },
    { from: 2430, to: 3224, label: "核心觀念",  text: "學 1%，就夠了",                 side: "right", yPct: 0.3 },
  ];

  const steps = [
    { num: "1", title: "從 Vibe Coding 開始", desc: "先體驗「用說的就能做出東西」的成就感，不用擔心技術細節，選一個你真的想解決的小需求開始玩。", style: step1 },
    { num: "2", title: "累積 AI Coding 的基礎知識", desc: "學習如何更精準地和 AI 溝通、排查錯誤、理解常用技術關鍵字，讓你的作品從「堪用」進化到「真的好用」。", style: step2 },
    { num: "3", title: "用 AI Coding 做更複雜的事", desc: "結合技術判斷和 AI 的生產力，做出能真正解決工作痛點、或是讓自己驕傲的作品。", style: step3 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={85} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="04" title="Vibe Coding vs AI Coding：有什麼差別？" fadeStyle={header} />

          {/* Path steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 20 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start", ...step.style }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 36, flexShrink: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: C.primary,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
                    color: "#000000", flexShrink: 0,
                  }}>{step.num}</div>
                  {i < 2 && (
                    <div style={{ width: 2, flex: 1, background: C.border, margin: "4px auto 0", minHeight: 32 }} />
                  )}
                </div>
                <div style={{ paddingBottom: 28, flex: 1 }}>
                  <h3 style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 4, color: C.text }}>{step.title}</h3>
                  <p style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14, color: C.muted, lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quiz box */}
          <div style={{
            border: "2px dashed rgba(255,209,102,0.3)", borderRadius: 16,
            padding: "28px 32px", marginBottom: 20,
            background: "rgba(255,209,102,0.03)", ...quiz,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
              color: C.yellow, letterSpacing: "0.08em",
              textTransform: "uppercase" as const, marginBottom: 14,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 6, height: 6, background: C.yellow, borderRadius: 1, boxShadow: "0 0 6px #ffd166" }} />
              想一想
            </div>
            <p style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", color: C.muted, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
              如果你現在可以立刻用自然語言「描述出」一個小工具，你會描述什麼？
              <br />試著用一、兩句話說說看——不用管技術可不可行，先想想你<strong style={{ color: C.text }}>真的想要</strong>什麼。
            </p>
          </div>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay segmentId="5.3" />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 14 — Takeaway (segment 6.1)
// ─────────────────────────────────────────────────────────────────────────────
const SceneTakeaway: React.FC = () => {
  const header = useFadeUp(15);
  const box    = useFadeUp(25);
  const item1  = useFadeUp(174);
  const item2  = useFadeUp(428);
  const item3  = useFadeUp(829);
  const item4  = useFadeUp(1065);
  const item5  = useFadeUp(1418);

  const CALLOUTS: Callout[] = [
    { from:  123, to: 1982, label: "回顧",   text: "本章重點，整理",                   side: "right", yPct: 0.3 },
    { from: 1984, to: 2336, label: "下一章", text: "實際動手做，第一個 AI 作品",        side: "right", yPct: 0.4 },
    { from: 2338, to: 2422, label: "我們",   text: "下個章節見",                        side: "right", yPct: 0.35 },
  ];

  const items = [
    { text: "寫程式的本質是自動化：把有固定步驟的事外包給電腦執行。", style: item1 },
    { text: "重複性工作、容易出錯的流程、定期蒐集資訊，都是寫程式最能發揮的場景。", style: item2 },
    { text: "AI Coding 泛指任何借助 AI 產生程式碼的開發方式。", style: item3 },
    { text: "Vibe Coding 是完全用自然語言驅動 AI，不碰程式碼的極致入門體驗。", style: item4 },
    { text: "建議路徑：先 Vibe Coding 建立信心，再學習核心關鍵知識，進入 AI Coding。", style: item5 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <BgOrbs />
      <ProgressBar progressPct={95} />
      <div style={{
        position: "absolute", top: NAV_H, bottom: SUBTITLE_H,
        left: Math.round((1920 - CONTAINER_W) / 2), width: CONTAINER_W,
        overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ paddingTop: 56 }}>
          <SectionHeader num="✦" title="本章重點整理" fadeStyle={header} />
          {/* Takeaway box */}
          <div style={{
            background: "linear-gradient(135deg, rgba(124,255,178,0.07), rgba(124,255,178,0.03))",
            border: "1px solid rgba(124,255,178,0.25)",
            borderRadius: 16, padding: 32, marginTop: 8, ...box,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700,
              color: C.primary, letterSpacing: "0.1em",
              textTransform: "uppercase" as const, marginBottom: 20,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 6, height: 6, background: C.primary, borderRadius: 1, boxShadow: "0 0 6px #7cffb2" }} />
              本章重點整理
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12, padding: 0, margin: 0, counterReset: "li" }}>
              {items.map((item, i) => (
                <li key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
                  fontSize: 36, color: C.text, lineHeight: 1.6, ...item.style,
                }}>
                  <div style={{
                    background: C.primary, color: "#000000",
                    fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700,
                    width: 22, height: 22, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 2,
                  }}>{i + 1}</div>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {CALLOUTS.map((c, i) => <CalloutCard key={i} c={c} allCallouts={CALLOUTS} />)}
      <AvatarOverlay segmentId="6.1" />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FullVideo — chains all 14 segments
// ─────────────────────────────────────────────────────────────────────────────
const SCENES = [
  SceneHero,
  SceneSection01Card1,
  SceneSection01Analogy,
  SceneSection01Card2,
  SceneSection02Intro,
  SceneSection02Usecases,
  SceneSection02LeisureQuiz,
  SceneSection03AICoding,
  SceneSection03VibeCoding,
  SceneSection03Analogy,
  SceneSection04VibeTraits,
  SceneSection04AITraits,
  SceneSection04Path,
  SceneTakeaway,
];

export const FullVideo: React.FC = () => {
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

export { TOTAL_FRAMES };
