# Vibe Coding Video — Progress Log

## Project Overview

Course video production for **AI 寫程式入門課程** using Remotion.
Skill spec: `~/Downloads/Vibe Coding 剪輯/course-video.md`
Remotion project: `~/Projects/vibe-coding-video/`

---

## Current Status: CH 0-1 — Full Video COMPLETE ✅

### Phase Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — VTT Transcription (13 files) | ✅ Done | Whisper small model, --language zh |
| Phase 2 — VTT Correction | ✅ Done | All brand names fixed |
| Phase 3 — HTML Analysis & Scene Planning | ✅ Done | 14 scenes mapped to HTML 1:1 |
| Phase 4 — Scene Development (FullVideo.tsx) | ✅ Done | 14 scenes + CALLOUTS built |
| Phase 5 — Integration & Render | ✅ Done | `CH0-1-complete.mp4` — 50.7 MB, 15m 15s |

---

## CH 0-1 — 30s Sample ✅

| Task | Status | Notes |
|------|--------|-------|
| VTT transcription (0-1_1.1) | ✅ Done | Corrected: Vycoding → Vibe Coding |
| Opening.tsx — Hero section | ✅ Done | Matches `(N)ch0-1.html` exactly |
| Opening.tsx — Section 01 | ✅ Done | Scrolls in at f600–f700 |
| ProgressBar | ✅ Done | Logo + "AI 寫程式入門課程" \| "章節 0-1 / 4" |
| Callout Cards (字卡) | ✅ Done | macOS Messages notification style |
| 30s render | ✅ Done | `sample-30s.mp4` (2.2 MB) |
| Audio mix | ✅ Done | Speaker 0.75, BGM 0.18 |

---

## CH 0-1 — Full Video (FullVideo.tsx)

### Audio Segments & Scenes

| Seg | File | Frames | Scene | VTT Status |
|-----|------|--------|-------|------------|
| 1.1 | 0-1_1.1_studio.wav | 1211 | SceneHero | ✅ Corrected |
| 2.1 | 0-1_2.1.wav | 1169 | SceneSection01Card1 | ✅ Corrected |
| 2.2 | 0-1_2.2.wav | 1258 | SceneSection01Analogy | ✅ Corrected (Simplified→Traditional) |
| 2.3 | 0-1_2.3.wav | 1481 | SceneSection01Card2 | ✅ OK |
| 3.0 | 0-1_3.0.wav | 2863 | SceneSection02Intro | ✅ OK |
| 3.1 | 0-1_3.1.wav | 3710 | SceneSection02Usecases | ✅ OK |
| 3.2 | 0-1_3.2.wav | 1614 | SceneSection02LeisureQuiz | ✅ Corrected (寫成是→寫程式) |
| 4.1 | 0-1_4.1.wav | 2372 | SceneSection03AICoding | ✅ Corrected (土法煉鋼) |
| 4.2 | 0-1_4.2.wav | 1124 | SceneSection03VibeCoding | ✅ Corrected (chill/feel/程式碼) |
| 4.3 | 0-1_4.3.wav | 2239 | SceneSection03Analogy | ✅ Corrected (Vibe/甲方/乙方) |
| 5.1 | 0-1_5.1.wav | 1704 | SceneSection04VibeTraits | ✅ Corrected (Vibe Coding) |
| 5.2 | 0-1_5.2.wav | 990 | SceneSection04AITraits | ✅ Corrected (Vibe→corrected) |
| 5.3 | 0-1_5.3.wav | 3264 | SceneSection04Path | ✅ Corrected (Simplified→Traditional) |
| 6.1 | 0-1_6.1.wav | 2461 | SceneTakeaway | ✅ Corrected (Japanese katakana removed) |

**Total frames:** 27,461 (~15.2 minutes)

### Scene → HTML Mapping

| Scene | HTML Section |
|-------|-------------|
| SceneHero | `.hero` |
| SceneSection01Card1 | `Section 01 .card:first` |
| SceneSection01Analogy | `Section 01 .analogy` |
| SceneSection01Card2 | `Section 01 .card:second` |
| SceneSection02Intro | `Section 02 .card + .usecase-grid` |
| SceneSection02Usecases | `Section 02 .analogy (具體例子)` |
| SceneSection02LeisureQuiz | `Section 02 .card (樂趣) + .quiz-box` |
| SceneSection03AICoding | `Section 03 .card (AI Coding 定義)` |
| SceneSection03VibeCoding | `Section 03 .card (Vibe Coding 定義)` |
| SceneSection03Analogy | `Section 03 .analogy + .card (感覺)` |
| SceneSection04VibeTraits | `Section 04 .card + .compare table` |
| SceneSection04AITraits | `Section 04 .compare table (AI column)` |
| SceneSection04Path | `Section 04 .path + .quiz-box` |
| SceneTakeaway | `.takeaway` |

---

## Render Target

```
Output: ~/Downloads/Vibe Coding 剪輯/CH0-1-complete.mp4
Codec: h264
Resolution: 1920×1080
FPS: 30
Duration: ~15.2 min (27,461 frames)
```

---

## Key Design Decisions

- **No emoji** anywhere — CSS 6px square dot with `#7cffb2` glow, or `✦`
- **Colors:** `#000000` bg, `#0d0d0d` surface, `#7cffb2` primary, `#ffd166` yellow
- **Fonts:** Noto Sans TC (body/titles), Space Mono (labels/badges)
- **Callouts:** macOS Messages notification style, top-right corner only
- **Removed permanently:** particles, CodeChar drift, CornerLines, ScanSweep, GlowRing, Glitch
- **VTT over estimates:** always use Whisper VTT timestamps, never estimate seconds

---

## File Map

```
~/Projects/vibe-coding-video/
  src/
    Root.tsx          — Compositions: Intro2s + Video30s + FullVideo
    Video30s.tsx      — 30s sample
    Opening.tsx       — Hero + Section01 (30s sample only)
    FullVideo.tsx     — All 14 scenes for complete CH 0-1 video
    Intro2s.tsx       — Brand intro (separate)
    hooks.ts          — useMorphIn, useGlitch, useTypewriter
    index.ts          — Remotion entry
  public/
    audio/
      0-1_1.1.wav               — original
      0-1_1.1_studio.wav        — EQ + compressed (used in 30s sample)
      0-1_2.1.wav ~ 0-1_6.1.wav — all 13 segments (added 2026-03-26)
      course_background_music.wav
      intro-stinger.wav
    aischool-logo.webp

Source assets: ~/Downloads/Vibe Coding 剪輯/0-1/
  (N)ch0-1.html         — visual reference (single source of truth)
  0-1 音檔/             — 14 WAV files + 14 corrected VTTs
  章節0-1_逐字講稿.docx — script for VTT correction
```

---

## HeyGen Digital Avatar (Pending)

**Blocker:** HeyGen API credits insufficient (`MOVIO_PAYMENT_INSUFFICIENT_CREDIT`).

When credits available, add avatar `f7af57d29abd4254a1e43441ec16ce40` to bottom-right circle in FullVideo.tsx.
Audio asset_id: `807d290115804f09bf6f82e4e9d81434` (may be expired — valid 7 days from 2026-03-27).
