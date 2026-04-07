# Vibe Coding Video — Design Tokens & Dimensions

> All values are at S=2 (4K). Raw px values are base × S.

---

## Scale Factor

```ts
const S = 2;
```

---

## Canvas

```ts
const W = 1920 * S;   // 3840px
const H = 1080 * S;   // 2160px
fps = 30;
```

---

## Layout Zones

```ts
const NAV_H        = 72  * S;   // 144px  — top progress bar
const SUBTITLE_H   = 160 * S;   // 320px  — subtitle safe zone (bottom)
const CONTAINER_W  = 1500 * S;  // 3000px — content column

// Content viewport (no inner padding):
// H - NAV_H - SUBTITLE_H = 2160 - 144 - 320 = 1696px

// Scroll budget:
// maxScroll = totalContentHeight - (H - NAV_H - SUBTITLE_H - innerPaddingTop)
// If maxScroll ≤ 0, set scrollY = 0 (no scroll needed)
```

---

## Color Tokens

```ts
const C = {
  bg:            "#000000",
  surface:       "#0d0d0d",
  primary:       "#7cffb2",              // neon green
  primaryLight:  "rgba(124,255,178,0.07)",
  primaryBorder: "rgba(124,255,178,0.14)",
  text:          "#ffffff",
  muted:         "#888888",
  yellow:        "#ffd166",
  yellowLight:   "rgba(255,209,102,0.1)",
  yellowBorder:  "rgba(255,209,102,0.2)",
  red:           "#ff6b6b",
  border:        "rgba(255,255,255,0.08)",
};
```

---

## Typography

| Use | Font | Min size (at S=2) |
|-----|------|-------------------|
| Heading | Noto Sans TC | 44*S = 88px |
| Body / Cards | Noto Sans TC | 28*S = 56px |
| Labels / Tags | Space Mono | 16*S = 32px |
| UI / small | Space Mono | 14*S = 28px |

**Minimums (never go below):**
- Main body: ≥ 28*S
- Space Mono labels: ≥ 14*S

---

## Component Specs

### SectionHeader (section badges + h2)
```ts
badge: {
  fontSize: 16*S, color: C.primary,
  background: "rgba(124,255,178,0.1)",
  border: "1px solid rgba(124,255,178,0.3)",
  padding: `${6*S}px ${16*S}px`,
  borderRadius: 99,
  letterSpacing: "0.06em",
  boxShadow: "0 0 14px rgba(124,255,178,0.12)"
}
h2: {
  fontSize: 44*S, fontWeight: 800,
  letterSpacing: "-0.02em", color: C.text
}
```

### Card
```ts
{
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 22*S,
  padding: `${26*S}px ${36*S}px`,
  fontSize: 28*S, color: C.text,
  lineHeight: 1.8
}
```

### Compare Table
```ts
th: 28*S, td label: 26*S bold, td content: 26*S
borderRadius: 22*S
```

### Learning Steps
```ts
circle: 48*S × 48*S, stepNumber: 18*S, title: 28*S, desc: 24*S
```

### Quiz
```ts
label: 18*S Space Mono, body: 26*S, bullets: 24*S
```

### Nav Bar
```ts
16*S Space Mono — NO timestamp (mm:ss)
```

---

## iMessage Callout Spec

```ts
// Dimensions (base × S)
const NOTIF_W       = 290 * S;   // 580px  card width
const NOTIF_TOP     = 12  * S;   // 24px   below nav
const NOTIF_RIGHT   = 20  * S;   // 40px   from right edge
const NOTIF_SLOT    = 148 * S;   // 296px  vertical space per card
const FADE_OUT_F    = 50;        // 1.67s  fade after .to

// Visual
background: rgba(28,28,30,0.90)   // macOS dark frosted glass
backdropFilter: blur(48px)
border: 1px solid rgba(255,255,255,0.13)
borderRadius: 14*S
boxShadow: 0 24px 120px rgba(0,0,0,0.6)

// Text rows
"iMessage" label: 11*S, opacity 0.45
sender name: 13*S, bold, opacity 0.92
message body: 13*S, opacity 0.60  (typewriter: 0.85 chars/frame)
```

**Stacking (push-down):**
- New card slides in from top-right (spring damping:22 stiffness:130)
- Older cards pushed down by NOTIF_SLOT px
- Depth opacity: depth 0=100%, 1=65%, 2=35%
- Older cards fade out at `to + FADE_OUT_F`

```ts
interface Callout {
  from: number;   // global frame
  to:   number;
  sender: string;
  text: string;
}
```

**Rules:**
- No newlines in text — use ，instead
- Max 2 cards visible simultaneously (control via timing)
- All fixed top-right (no left/right alternating)

---

## Animation Hook Library

```ts
// Smooth reveal — general elements
useFadeUp(startFrame): { opacity, transform: translateY + scale }
  spring config: { damping: 200 }, duration: 0.7*fps
  y range: 14*S → 0, scale: 0.97 → 1

// Section/step headers — snappy
useFadeUpHeader(startFrame)
  spring config: { damping: 20, stiffness: 200 }
  y range: 10*S → 0

// List items, ProgressItems — expo out
useFadeUpItem(startFrame)
  easing: Easing.out(Easing.exp), duration: 0.65*fps
  y range: 10*S → 0

// Bouncy emphasis — quotes, badges
useFadeUpElastic(startFrame)
  spring config: { damping: 8 }
  y range: 8*S → 0, scale: 0.98 → 1
```

---

## File Naming

| Asset | Path |
|-------|------|
| Script | `chapters/{CH}/章節{CH}_逐字講稿.pages` |
| Raw audio | `chapters/{CH}/{CH} 音檔/` |
| Video assets | `chapters/{CH}/{CH} 影片製作相關素材/` |
| Output video | `out/CH{N}/CH{N}-complete.mp4` |
| Output VTT | `out/CH{N}/CH{N}-subtitles.vtt` |
| Main TSX | `src/FullVideo03.tsx` (current) |
