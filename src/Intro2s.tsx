import React from "react";
import {
  AbsoluteFill, Audio, Img, staticFile,
  useCurrentFrame, useVideoConfig,
  interpolate, spring, random,
} from "remotion";

// ── Timeline (120f = 4s @ 30fps) ─────────────────────────────────────────
//   0-20f   純黑靜默
//  10-44f   Converging particles：粒子從四周飛向中心（建立動能）
//  38-58f   Light sweep
//  42-58f   Radial burst：Logo 出現瞬間的能量爆發
//  42-58f   Logo clipPath 揭露
//  58-74f   Cinematic hold（縮短，不拖沓）
//  70-82f   Glow 退場
//  76-120f  Logo 向外擴散 + 透明化
// ─────────────────────────────────────────────────────────────────────────

const PRIMARY = "#7cffb2";
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// ── Converging Particles ──────────────────────────────────────────────────
const ConvergingParticle: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const delay    = Math.floor(random(`sd${seed}`) * 18);
  const dur      = 22 + Math.floor(random(`sdur${seed}`) * 12);
  const localF   = Math.max(0, frame - 10 - delay);
  const progress = interpolate(localF, [0, dur], [0, 1], clamp);
  const eased    = progress * progress; // ease-in, 加速飛向中心

  // 起始位置：隨機散佈在畫面外圍
  const angle  = random(`sa${seed}`) * Math.PI * 2;
  const radius = (0.55 + random(`sr${seed}`) * 0.45) * Math.max(width, height);
  const startX = width  / 2 + Math.cos(angle) * radius;
  const startY = height / 2 + Math.sin(angle) * radius;

  const x = startX + (width  / 2 - startX) * eased;
  const y = startY + (height / 2 - startY) * eased;

  const opacity = interpolate(localF, [0, 4, dur - 6, dur], [0, 0.75, 0.75, 0], clamp);
  const size    = 2.5 + random(`ss${seed}`) * 3.5;

  if (frame < 10 || frame > 46) return null;

  return (
    <div style={{
      position: "absolute",
      left: x - size / 2,
      top:  y - size / 2,
      width: size, height: size,
      borderRadius: "50%",
      background: PRIMARY,
      opacity,
      boxShadow: `0 0 ${size * 2}px ${PRIMARY}`,
    }} />
  );
};

// ── Radial Burst（Logo 出現瞬間的能量爆發）───────────────────────────────
const RadialBurst: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const BURST = 42;
  const localF = frame - BURST;
  if (localF < 0 || localF > 22) return null;

  const lineLen = interpolate(localF, [0, 18], [0, 520], clamp);
  const opacity = interpolate(localF, [0, 2, 12, 22], [0, 0.9, 0.5, 0], clamp);
  const NUM     = 18;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 15, pointerEvents: "none" }}>
      {Array.from({ length: NUM }, (_, i) => {
        const angle = (i / NUM) * 360;
        return (
          <div key={i} style={{
            position: "absolute",
            left: width  / 2,
            top:  height / 2,
            width: lineLen,
            height: 1.5,
            background: `linear-gradient(90deg, rgba(124,255,178,0.9), transparent)`,
            transform: `rotate(${angle}deg)`,
            transformOrigin: "0 0",
            opacity,
          }} />
        );
      })}
      {/* 中心閃光圓點 */}
      <div style={{
        position: "absolute",
        left: width  / 2,
        top:  height / 2,
        width: interpolate(localF, [0, 6, 22], [0, 80, 20], clamp),
        height: interpolate(localF, [0, 6, 22], [0, 80, 20], clamp),
        borderRadius: "50%",
        background: "white",
        transform: "translate(-50%, -50%)",
        opacity: interpolate(localF, [0, 2, 8, 22], [0, 1, 0.3, 0], clamp),
        mixBlendMode: "screen" as const,
      }} />
    </div>
  );
};

// ── Light Sweep ────────────────────────────────────────────────────────────
const LightSweep: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  if (frame < 38 || frame > 63) return null;

  const x       = interpolate(frame, [38, 59], [-100, width + 100], clamp);
  const opacity = interpolate(frame, [38, 41, 56, 63], [0, 1, 1, 0], clamp);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 20, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: 0, bottom: 0,
        left: x - 90, width: 180,
        background: `linear-gradient(90deg,
          transparent 0%, rgba(200,255,230,0.04) 15%,
          rgba(255,255,255,0.70) 50%,
          rgba(200,255,230,0.04) 85%, transparent 100%)`,
        opacity,
        mixBlendMode: "screen" as const,
      }} />
    </div>
  );
};

// ── Hold Glow ─────────────────────────────────────────────────────────────
const HoldGlow: React.FC = () => {
  const frame = useCurrentFrame();
  const glow    = interpolate(frame, [58, 68, 70, 82], [0, 1, 1, 0], clamp);
  const breathe = interpolate(Math.sin((frame / 28) * Math.PI * 2), [-1, 1], [0.88, 1.0], clamp);
  const g = glow * breathe;

  return (
    <div style={{
      position: "absolute", left: "50%", top: "50%",
      transform: "translate(-50%, -50%)",
      width: 820, height: 820,
      background: `radial-gradient(circle,
        rgba(124,255,178,${g * 0.35}) 0%,
        rgba(124,255,178,${g * 0.09}) 42%,
        transparent 68%)`,
      pointerEvents: "none",
    }} />
  );
};

// ── Logo ──────────────────────────────────────────────────────────────────
// Wiggle skill: Cinematic/Complex — 50-120 keyframes equivalent, organic easing (0.25/0.75)
// Motion philosophy: "Confident Innovation" — energetic reveal → elegant hold → dramatic exit
const LogoMark: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clip-path wipe reveal (left→right, frames 42-59)
  const revealPct = interpolate(frame, [42, 59], [0, 100], clamp);

  // ── Entrance: cinematic slow fade-in + scale (wiggle: 0.82→1.0, organic ease-out)
  // Extends entrance from 3f to 22f for elegance
  const entranceOpacity = interpolate(frame, [40, 62], [0, 1], clamp);
  const entranceScale   = spring({
    frame: Math.max(0, frame - 40),
    fps,
    config: { damping: 18, stiffness: 60, mass: 1.2 }, // slow, cinematic
  });
  const scaleEntrance = interpolate(entranceScale, [0, 1], [0.82, 1.0], clamp);

  // ── Breathing pulse during hold (wiggle: 1.0→1.015→1.0, organic sine)
  // Phase-locked to start at 1.0 after settle, period 1.8s (54f)
  const holdF    = Math.max(0, frame - 62);
  const breathe  = Math.sin((holdF / 54) * Math.PI * 2);
  const holdScale = 1.0 + interpolate(breathe, [-1, 1], [-0.012, 0.012], clamp);

  // ── Glow: fades in during hold, organic breathe (in phase with scale pulse)
  const glowI   = interpolate(frame, [58, 72, 74, 82], [0, 1, 1, 0], clamp);
  const glowBreath = 1.0 + interpolate(breathe, [-1, 1], [-0.15, 0.15], clamp);
  const gI      = glowI * glowBreath;

  // ── Combined scale during hold phase
  const EXPAND_START = 76;
  const holdCombined = scaleEntrance * holdScale;

  // ── Exit: cubic ease-in expand (scale 1→10, opacity fades fast then slow)
  const raw          = interpolate(frame, [EXPAND_START, 120], [0, 1], clamp);
  const eased        = raw * raw * raw;
  const expandScale  = interpolate(eased, [0, 1], [1.0, 10.0], clamp);
  const expandOpacity = interpolate(raw, [0, 0.10, 1], [1, 1, 0], clamp);

  const finalScale   = frame < EXPAND_START ? holdCombined : holdCombined * expandScale;
  const finalOpacity = frame < EXPAND_START ? entranceOpacity : entranceOpacity * expandOpacity;

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 10, opacity: finalOpacity,
    }}>
      <div style={{ transform: `scale(${finalScale})` }}>
        <Img
          src={staticFile("aischool-logo.webp")}
          style={{
            height: 360, width: "auto", display: "block",
            mixBlendMode: "screen" as const,
            clipPath: frame < 61 ? `inset(0 ${100 - revealPct}% 0 0)` : undefined,
            filter: [
              `brightness(${1.0 + gI * 0.55})`,
              `drop-shadow(0 0 ${Math.round(gI * 22)}px ${PRIMARY})`,
              `drop-shadow(0 0 ${Math.round(gI * 55)}px rgba(124,255,178,0.40))`,
            ].join(" "),
          }}
        />
      </div>
    </div>
  );
};

// ── Scanline ─────────────────────────────────────────────────────────────
const Scanline: React.FC = () => (
  <div style={{
    position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.007) 3px, rgba(255,255,255,0.007) 6px)",
  }} />
);

// ── Main ─────────────────────────────────────────────────────────────────
export const Intro2s: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <Scanline />
      {/* Converging particles */}
      <div style={{ position: "absolute", inset: 0, zIndex: 3 }}>
        {Array.from({ length: 32 }, (_, i) => (
          <ConvergingParticle key={i} seed={i} />
        ))}
      </div>
      <HoldGlow />
      <RadialBurst />
      <LogoMark />
      <LightSweep />
      <Audio src={staticFile("audio/intro-stinger.wav")} />
    </AbsoluteFill>
  );
};
