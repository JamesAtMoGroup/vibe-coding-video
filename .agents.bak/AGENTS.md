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
  章節{chapter}_逐字講稿.txt      ← agents read THIS (not .pages or .docx)
  {chapter} 音檔/                 ← audio + video files (NOTE: folder name has space + chapter prefix)
  {chapter} 影片製作相關素材/      ← image/video assets referenced in 備注
  ({chapter})ch{chapter}.html     ← original HTML slide design
```

**Output (no -complete suffix, no date suffix):**
```
out/CH{N}-{章節標題}/
  CH{N}-{章節標題}.mp4
  CH{N}-{章節標題}-subtitles.vtt
  CH{N}-{章節標題}.html
  assets/     ← only if 備注 has 使用相關素材
# Example: out/CH1-1-價值與風險：問題值得解決嗎？有無資安風險？/CH1-1-價值與風險：問題值得解決嗎？有無資安風險？.mp4
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
| **Director** | Read AGENTS.md + rules + progress.md first. Dispatch sub-agents. Enforce QA gate before render. Never ask James between phases — run QA and proceed automatically. |
| **Audio Agent** | ffmpeg trim silence only (`silenceremove=start_periods=1:start_threshold=-50dB`). NO normalize, NO denoise. |
| **Transcription Agent** | Whisper VTT (zh) + Traditional Chinese correction (OpenCC) + script cross-check |
| **Visual Concept Agent** | Read corrected VTT + script 備注 → output `visual-spec-{N}.json`. MANDATORY before Scene Dev. |
| **Scene Dev Agent** | Write/edit `src/FullVideoXX.tsx` (check Root.tsx for current file). Must read rules/project.md + visual-spec first. |
| **QA Agent** | Checklist verification. Report to Director (NOT James). iMessage report. |
| **Fix Agent** | Spawned by Director when QA fails. Fix → re-QA before proceeding. |
| **Render Agent** | Only after QA passes AND James approves preview in Remotion Studio. |
| **Asset Agent** | Verify audio/video files in `chapters/{N}/{N} 音檔/`, match to script `**備注**` entries |
| **HTML Analysis Agent** | Parse HTML slides → extract timestamps, support Visual Concept Agent |

### QA Gate (mandatory, Director enforces)

```
Phase 1 (Audio + Whisper + Script) — all parallel
  ↓
Phase 2 — VTT Traditional Chinese correction
  ↓
Phase 3 — Visual Concept Agent → visual-spec-{N}.json
  ↓
Phase 4 — Scene Dev Agent → FullVideoXX.tsx
  ↓
Director IMMEDIATELY spawns QA Agent (no James signal needed)
  ↓
QA all ✅ → iMessage: "CH{N} QA 通過，請開瀏覽器預覽 http://localhost:3000"
           → open localhost:3000
           → WAIT for James explicit approval ("通過" / "ok render" / "go ahead")
QA has ❌ → Director assigns Fix Agent → redo QA → all ✅ then notify James
  ↓
James approves → Render Agent starts
```

**FORBIDDEN:**
- Ask James "要繼續嗎？" between Phase 1→2→3→4
- Render before James approves preview
- Notify James "完成了" before QA passes

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
- **Audio:** Trim leading silence ONLY (`silenceremove`). NO normalize, NO denoise — James corrects manually

---

## Current Chapter State

See `progress.md` for live state. Do not assume from memory — always read the file.
