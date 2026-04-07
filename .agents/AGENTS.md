# Vibe Coding Video — Agent Guide

> **MANDATORY**: Read this file AND the rules below BEFORE making any plan.
> Agents that skip this step will produce wrong output.

---

## Read Order (required before any plan)

1. **This file** — project identity, team, invariants
2. **`.agents/rules/project.md`** — design tokens, scale, all dimensions
3. **`.agents/rules/pipeline.md`** — production SOP, phase order, QA gate
4. **`.agents/skills/remotion-best-practices/SKILL.md`** — then load the specific rule files relevant to your task (animations, timing, sequencing, etc.)

---

## Project Identity

**What this is:** Remotion course video for "Vibe Coding" — AI programming intro course for Chinese-speaking audience.

**Repo:** JamesAtMoGroup/vibe-coding-video
**Location:** `/Users/jamesshih/Projects/vibe-coding-video/`
**Progress file:** `progress.md` — single source of truth for chapter state

**Asset structure:**
```
chapters/{chapter}/
  章節{chapter}_逐字講稿.pages    ← script
  {chapter} 音檔/                 ← raw audio
  {chapter} 影片製作相關素材/      ← video assets
```

**Output:**
```
out/CH{N}-{章節標題}/CH{N}-{章節標題}.mp4
out/CH{N}-{章節標題}/CH{N}-{章節標題}-subtitles.vtt
# Example: out/CH0-3-寫程式的 7 大流程與 AI 溝通技巧/CH0-3-寫程式的 7 大流程與 AI 溝通技巧.mp4
```

---

## Scale & Dimensions

```ts
const S = 2;                    // scale factor — multiply ALL px values
const W = 1920 * S;             // 3840px
const H = 1080 * S;             // 2160px
const NAV_H = 72 * S;           // 144px — progress bar at top
const SUBTITLE_H = 160 * S;     // 320px — subtitle safe zone at bottom
const CONTAINER_W = 1500 * S;   // 3000px — content column width

// Usable content height (before inner paddingTop):
// H - NAV_H - SUBTITLE_H = 2160 - 144 - 320 = 1696px
```

**Scroll budget formula:**
```
maxScroll = totalContentHeight - (H - NAV_H - SUBTITLE_H - paddingTopInsideScrollDiv)
If maxScroll ≤ 0 → no scroll, set scrollY = 0
```

---

## Team Structure

| Role | Job |
|------|-----|
| **Director** | Read AGENTS.md + rules + progress.md first. Dispatch sub-agents. Enforce QA gate before render. |
| **Audio Agent** | ffmpeg normalize (-16 LUFS, NO denoise). Output frame count. |
| **Transcription Agent** | Whisper VTT + script verification + audio split |
| **Scene Dev Agent** | Write/edit TSX in `src/FullVideo03.tsx`. Must read rules/project.md first. |
| **QA Agent** | Checklist verification. Report to Director (NOT James). iMessage report. Wait "通過". |
| **Render Agent** | Only after QA all passes. |
| **Asset Agent** | Verify audio files in `chapters/{N}/audio/`, match to script `**備注**` entries |
| **HTML Analysis Agent** | Parse HTML slides → extract audio timestamps |

### QA Gate (mandatory, Director enforces)

```
Scene Dev complete
  ↓
Director IMMEDIATELY spawns QA Agent (no James signal needed)
  ↓
QA all ✅ → iMessage report → wait "通過" → Render Agent
QA has ❌ → Director assigns Fix Agent → redo QA → all ✅ then notify
```

**FORBIDDEN:** Notify James "完成了" or show preview BEFORE QA passes.

---

## Invariants (never override)

- **Background:** `#000000`
- **Primary accent:** `#7cffb2` neon green
- **Secondary accent:** `#ffd166` yellow
- **Fonts:** Noto Sans TC (body), Space Mono (labels/numbers/technical)
- **Output:** 4K 3840×2160, S=2
- **No emoji** in main content cards, section badges, progress bar
- **No timestamp** (mm:ss) in progress bar
- **iMessage callouts:** macOS dark frosted-glass, top-right stacking push-down (see rules/project.md)
- **CSS transitions FORBIDDEN** — all animation via `useCurrentFrame()` + `spring()` / `interpolate()`
- **Visual quality standard** — every scene must pass the 7-point checklist in `rules/pipeline.md` (SceneFade, WordReveal, accent line, staggered flows, ProgressItem sub-stagger, BgOrbs pulse, summary left-border)
- **Tailwind animation classes FORBIDDEN**
- **Audio:** -16 LUFS only, NO denoise (James corrects manually)

---

## Current Chapter State

See `progress.md` for live state. Do not assume from memory — always read the file.

**CH 0-1:** `out/CH0-1/CH0-1-complete.mp4` — complete (check progress.md for latest)
