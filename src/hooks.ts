import { useCurrentFrame, useVideoConfig, spring, interpolate, random } from "remotion";

/** Glassmorphism morph-in: blur + slide + scale + fade */
export function useMorphIn(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - delay);
  const progress = spring({ frame: f, fps, config: { damping: 20, stiffness: 100, mass: 1 } });
  const blur    = interpolate(progress, [0, 1], [16, 0],   { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = interpolate(f,        [0, 18], [0, 1],   { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y       = interpolate(progress, [0, 1], [32, 0],   { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale   = interpolate(progress, [0, 1], [0.90, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return { blur, opacity, y, scale };
}

const GLITCH_CHARS = "░▒▓█▄▀■□▪◆◇○●";

/** Glitch scramble effect — uses remotion.random (deterministic) */
export function useGlitch(text: string, startFrame: number, duration = 30) {
  const frame = useCurrentFrame();
  if (frame < startFrame || frame > startFrame + duration) return text;
  const intensity = 1 - (frame - startFrame) / duration;
  return text
    .split("")
    .map((char, i) => {
      if (char === " " || char === "？" || char === "。") return char;
      if (random(`g-${frame}-${i}`) < intensity * 0.45)
        return GLITCH_CHARS[Math.floor(random(`c-${frame}-${i}`) * GLITCH_CHARS.length)];
      return char;
    })
    .join("");
}

/** Typewriter effect */
export function useTypewriter(text: string, startFrame: number, charsPerSec = 18) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.max(0, frame - startFrame);
  const chars = Math.floor(elapsed * (charsPerSec / fps));
  return text.slice(0, Math.min(chars, text.length));
}
