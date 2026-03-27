import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// ── Brand colors (exact match to HTML CSS variables) ─────────────────────────
const C = {
  bg:           "#000000",
  surface:      "#0d0d0d",
  primaryLight: "rgba(124, 255, 178, 0.07)",
  primary:      "#7cffb2",
  text:         "#ffffff",
  muted:        "#888888",
  yellow:       "#ffd166",
  border:       "rgba(124,255,178,0.14)",
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// Replicates HTML's `animation: fadeUp 0.6s ease both`
function useFadeUp(startFrame: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const progress = spring({ frame: f, fps, config: { damping: 22, stiffness: 90 } });
  const opacity = interpolate(f, [0, 18], [0, 1], clamp);
  const y = interpolate(progress, [0, 1], [24, 0], clamp);
  return { opacity, transform: `translateY(${y}px)` };
}

// ── Progress Bar  ─────────────────────────────────────────────────────────────
// Matches HTML .progress-bar-wrap exactly
const ProgressBar: React.FC = () => {
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
      {/* Label row — logo + title | chapter */}
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
      {/* Progress track */}
      <div style={{
        height: 3,
        background: "rgba(255,255,255,0.06)",
        borderRadius: 99,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: "8%",
          background: C.primary,
          borderRadius: 99,
          boxShadow: "0 0 8px rgba(124,255,178,0.5)",
        }} />
      </div>
    </div>
  );
};

// ── Callout Card ──────────────────────────────────────────────────────────────
// VTT-synced overlay card for key speaker moments (video-only, not in HTML)
type Callout = {
  from: number; to: number;
  label: string; text: string;
  side: "left" | "right"; yPct: number;
};

const CALLOUTS: Callout[] = [
  { from: 133, to: 300,  label: "很多人的感受", text: "「寫程式」\n感覺離我很遠",    side: "left",  yPct: 0.28 },
  { from: 302, to: 516,  label: "好消息",       text: "零技術背景\n也可以",           side: "right", yPct: 0.22 },
  { from: 518, to: 720,  label: "關鍵",         text: "靠 AI 的幫助\n讓電腦替你做事", side: "left",  yPct: 0.55 },
  { from: 838, to: 900,  label: "本章主題",     text: "寫程式\n到底是什麼",           side: "right", yPct: 0.38 },
];

const CalloutCard: React.FC<{ c: Callout; safeTop: number; safeHeight: number }> = ({
  c, safeTop, safeHeight,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < c.from || frame > c.to) return null;

  const localF   = frame - c.from;
  const duration = c.to - c.from;

  // Slide in from right edge — exact macOS notification behaviour
  const progress = spring({ frame: localF, fps, config: { damping: 22, stiffness: 130 } });
  const slideX   = interpolate(progress, [0, 1], [380, 0], clamp);
  const scaleIn  = interpolate(progress, [0, 1], [0.96, 1], clamp);
  const opacity  = interpolate(localF, [0, 8, duration - 12, duration], [0, 1, 1, 0], clamp);

  // Typewriter main text (starts after card lands, ~10f)
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
      top: safeTop + 20,   // just below progress bar, like macOS top-right corner
      right: 16,
      zIndex: 30,
      opacity,
      transform: `translateX(${slideX}px) scale(${scaleIn})`,
      width: 420,
    }}>
      {/* macOS notification shell — frosted dark */}
      <div style={{
        background: "rgba(38, 38, 40, 0.88)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderRadius: 18,
        padding: "14px 16px 16px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07) inset",
        border: "1px solid rgba(255,255,255,0.10)",
      }}>

        {/* Header row: app icon + app name + time dot */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginBottom: 9,
        }}>
          {/* Messages app icon — green rounded square */}
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: "linear-gradient(145deg, #3cdb6e, #28c95a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 6px rgba(40,201,90,0.4)",
          }}>
            {/* Chat bubble shape via CSS */}
            <div style={{
              width: 15, height: 12, borderRadius: "6px 6px 6px 2px",
              background: "#ffffff", position: "relative",
            }} />
          </div>

          <span style={{
            fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
            fontSize: 13, fontWeight: 500,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.01em",
            flex: 1,
          }}>訊息</span>

          {/* Dot separator + "剛剛" */}
          <span style={{
            fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
            fontSize: 12,
            color: "rgba(255,255,255,0.3)",
          }}>剛剛</span>
        </div>

        {/* Sender name — the label */}
        <div style={{
          fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
          fontSize: 15, fontWeight: 700,
          color: "rgba(255,255,255,0.90)",
          marginBottom: 5,
          letterSpacing: "0.01em",
        }}>{c.label}</div>

        {/* Message body — typewriter */}
        <div style={{
          fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
          fontSize: 34, fontWeight: 800,
          color: "#ffffff",
          lineHeight: 1.35,
          whiteSpace: "pre-wrap" as const,
          letterSpacing: "-0.02em",
          minHeight: "2.7em",
        }}>
          {displayText}
          {Math.floor(charsVisible) < c.text.length && (
            <span style={{
              display: "inline-block",
              width: 2, height: "0.85em",
              background: "rgba(255,255,255,0.7)",
              marginLeft: 3,
              verticalAlign: "text-bottom",
              opacity: localF % 16 < 8 ? 1 : 0,
            }} />
          )}
        </div>
      </div>
    </div>
  );
};

// ── Hero Section ──────────────────────────────────────────────────────────────
// Matches HTML .hero exactly: meta badges → h1 → hero-sub → bottom border
const HeroSection: React.FC = () => {
  const meta   = useFadeUp(28);
  const title  = useFadeUp(50);
  const sub    = useFadeUp(75);

  return (
    <div style={{
      padding: "64px 0 48px",
      borderBottom: `1px solid ${C.border}`,
      marginBottom: 56,
    }}>
      {/* hero-meta */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 22,
        ...meta,
      }}>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 13, color: C.primary,
          border: `1px solid ${C.primary}`,
          padding: "5px 14px", borderRadius: 99,
          letterSpacing: "0.05em",
          boxShadow: "0 0 10px rgba(124,255,178,0.2)",
        }}>CH 0-1</span>
        <span style={{
          fontSize: 13, padding: "5px 14px", borderRadius: 99, fontWeight: 500,
          background: "rgba(124,255,178,0.1)", color: C.primary,
        }}>✦ 完全零基礎</span>
        <span style={{
          fontSize: 13, padding: "5px 14px", borderRadius: 99, fontWeight: 500,
          background: "rgba(255,209,102,0.1)", color: C.yellow,
        }}>✦ 約 10 分鐘</span>
      </div>

      {/* h1 — two lines */}
      <div style={{ marginBottom: 20, ...title }}>
        <div style={{
          fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
          fontSize: 54, fontWeight: 900,
          lineHeight: 1.25, letterSpacing: "-0.02em",
          color: C.text,
        }}>
          AI 寫程式是什麼？
        </div>
        <div style={{
          fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
          fontSize: 54, fontWeight: 900,
          lineHeight: 1.25, letterSpacing: "-0.02em",
          color: C.text,
        }}>
          Vibe Coding 入門
        </div>
      </div>

      {/* hero-sub */}
      <div style={{ ...sub }}>
        <p style={{
          fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
          fontSize: 19, color: C.muted,
          lineHeight: 1.75, margin: 0,
          maxWidth: 600,
        }}>
          從「寫程式」的本質出發，理解為什麼現在是人人都能寫程式的時代，
          以及 Vibe Coding 與 AI Coding 有什麼不同。
        </p>
      </div>
    </div>
  );
};

// ── Section 01 ────────────────────────────────────────────────────────────────
// Matches HTML .section > .section-header + .card + .analogy
// Appears as the page scrolls down around frame 700
const Section01: React.FC = () => {
  const APPEAR = 700;
  const header  = useFadeUp(APPEAR);
  const card1   = useFadeUp(APPEAR + 20);
  const analogy = useFadeUp(APPEAR + 40);

  return (
    <div style={{ marginBottom: 56 }}>
      {/* section-header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, marginBottom: 24,
        ...header,
      }}>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 13, color: C.primary,
          background: "rgba(124,255,178,0.08)",
          border: `1px solid ${C.border}`,
          padding: "6px 14px", borderRadius: 99,
          whiteSpace: "nowrap" as const,
        }}>01</span>
        <h2 style={{
          fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
          fontSize: 24, fontWeight: 700,
          letterSpacing: "-0.01em",
          color: C.text, margin: 0,
        }}>寫程式，究竟是什麼？</h2>
      </div>

      {/* .card */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "28px 32px",
        marginBottom: 20,
        ...card1,
      }}>
        <p style={{
          fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
          fontSize: 17, color: C.muted,
          lineHeight: 1.8, margin: 0,
        }}>
          <strong style={{ color: C.text }}>
            寫程式的本質，就是把「人要做的事」轉交給電腦去執行。
          </strong>
          <br />
          這件事有個更正式的名字，叫做{" "}
          <span style={{ color: C.primary, fontWeight: 700 }}>自動化</span>
          。只要一件工作有固定的步驟、電腦能一一代勞，它就可以被自動化。
        </p>
      </div>

      {/* .analogy */}
      <div style={{
        background: C.primaryLight,
        borderLeft: `4px solid ${C.primary}`,
        borderRadius: "0 16px 16px 0",
        padding: "24px 28px",
        marginBottom: 20,
        ...analogy,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 12, fontWeight: 700,
          color: C.primary,
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <div style={{
            width: 6, height: 6,
            background: C.primary, borderRadius: 1, flexShrink: 0,
            boxShadow: "0 0 6px #7cffb2",
          }} />
          一句話理解
        </div>
        <p style={{
          fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
          fontSize: 16, color: "#c8ffe0",
          lineHeight: 1.75, margin: 0,
        }}>
          想像你每天上班前都要手動把一疊文件依日期排好、蓋上編號。
          <strong style={{ color: "#ffffff" }}>
            {" "}寫程式，就像是訓練一個永遠不會出錯、也不需要午休的助手，讓它幫你把這件事自動完成。
          </strong>
          你只需要說清楚規則，剩下的交給它。
        </p>
      </div>
    </div>
  );
};

// ── Main Opening (30s) ────────────────────────────────────────────────────────
const NAV_H      = 72;   // progress bar height
const CONTAINER_W = 860; // content column width (matches HTML max-width scaled for 1920px)

export const Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const safeTop    = NAV_H;
  const safeHeight = height - NAV_H;
  // Center the content column
  const containerLeft = Math.round((width - CONTAINER_W) / 2);

  // Page scroll: hero slides up to reveal Section 01
  // Speaker says "帶你去了解寫程式到底是什麼" at ~28s (f838)
  // Start scrolling at f600 so Section 01 is visible by f700
  const scrollY = interpolate(frame, [600, 700], [0, 420], clamp);

  // Background fade in
  const bgAlpha = interpolate(frame, [0, 30], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>

      {/* Background orbs — matches HTML body::before (top-right) and body::after (bottom-left) */}
      <div style={{
        position: "absolute", top: -200, right: -200,
        width: 600, height: 600,
        background: `radial-gradient(circle, rgba(124,255,178,${0.07 * bgAlpha}) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -200, left: -200,
        width: 500, height: 500,
        background: `radial-gradient(circle, rgba(124,255,178,${0.04 * bgAlpha}) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Progress bar (always at top) */}
      <ProgressBar />

      {/* ── Content column: centered, scrolls via translateY ── */}
      <div style={{
        position: "absolute",
        top: NAV_H, bottom: 0,
        left: containerLeft,
        width: CONTAINER_W,
        overflow: "hidden",
        zIndex: 10,
      }}>
        <div style={{ transform: `translateY(-${scrollY}px)` }}>
          <HeroSection />
          <Section01 />
        </div>
      </div>

      {/* Callout cards — outside the content column, synced to VTT */}
      {CALLOUTS.map((c, i) => (
        <CalloutCard key={i} c={c} safeTop={safeTop} safeHeight={safeHeight} />
      ))}

    </AbsoluteFill>
  );
};
