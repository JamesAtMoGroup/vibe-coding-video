# Vibe Coding Video — Progress Log

## Project Overview

Course video production for **AI 寫程式入門課程** using Remotion.
Skill spec: `~/.claude/skills/course-video.md`
Remotion project: `~/Projects/vibe-coding-video/`

---

## Current Status: CH 0-1 — Full Video v5 ✅

**Latest render:** `out/CH01-1/CH0-1-complete.mp4` — 60 MB, 14m 27s (2026-03-27 16:08)
**Subtitles:** `out/CH01-1/CH0-1-subtitles.vtt` — 22 KB, all 14 segments merged

### Version History

| Version | Size | Notes |
|---------|------|-------|
| v1 | 47 MB | Initial full video, all 14 scenes |
| v2 | 49 MB | VTT-synced progressive animation, iMessage stacking, focus glow, audio pipeline |
| v3 | 65 MB | Mobile-sized text (36px body), CONTAINER_W=1500, SUBTITLE_H=160 |
| v4 | 58 MB | Lottie avatar (replaced HeyGen), output folder CH01-1/ |
| v5 | 60 MB | All small fonts fixed: table 26/28px, steps 24/28px, quiz 24/26px, nav 16px, iMessage sender 22px |

---

## Phase Completion

| Phase | Status | Notes |
|-------|--------|-------|
| Audio pipeline (denoise→trim→normalize) | ✅ Done | 0a → 0b → 0_normalize |
| VTT Transcription (14 files) | ✅ Done | Whisper small, --language zh |
| VTT Correction | ✅ Done | All brand names fixed |
| HTML Analysis & Scene Planning | ✅ Done | 14 scenes mapped to HTML 1:1 |
| Scene Development (FullVideo.tsx) | ✅ Done | 14 scenes + VTT-synced CALLOUTS |
| Progressive slide animation | ✅ Done | Each block timed to VTT speaker content |
| iMessage stacking | ✅ Done | New card pushes old down, old slides up when expired |
| Focus highlight | ✅ Done | Green glow on first appear |
| Mobile scaling | ✅ Done | CONTAINER_W=1500, fonts 36-88px |
| All font sizes fixed | ✅ Done | Table 26/28px, steps 24/28px, quiz 24/26px, nav 16px |
| Lottie avatar | ✅ Done | speaking-animation.json, replaced HeyGen |
| Output folder structure | ✅ Done | out/CH01-1/ with .mp4 + .vtt |
| Merged VTT | ✅ Done | 6_merge_vtt.sh, all 14 segments, correct timestamps |

---

## Audio Segments (post-pipeline durations)

| Seg | File | Frames | Scene |
|-----|------|--------|-------|
| 1.1 | 0-1_1.1.wav | 1131 | SceneHero |
| 2.1 | 0-1_2.1.wav | 1061 | SceneSection01Card1 |
| 2.2 | 0-1_2.2.wav | 1067 | SceneSection01Analogy |
| 2.3 | 0-1_2.3.wav | 1367 | SceneSection01Card2 |
| 3.0 | 0-1_3.0.wav | 2641 | SceneSection02Intro |
| 3.1 | 0-1_3.1.wav | 3619 | SceneSection02Usecases |
| 3.2 | 0-1_3.2.wav | 1546 | SceneSection02LeisureQuiz |
| 4.1 | 0-1_4.1.wav | 2293 | SceneSection03AICoding |
| 4.2 | 0-1_4.2.wav | 1050 | SceneSection03VibeCoding |
| 4.3 | 0-1_4.3.wav | 2187 | SceneSection03Analogy |
| 5.1 | 0-1_5.1.wav | 1607 | SceneSection04VibeTraits |
| 5.2 | 0-1_5.2.wav | 874 | SceneSection04AITraits |
| 5.3 | 0-1_5.3.wav | 3148 | SceneSection04Path |
| 6.1 | 0-1_6.1.wav | 2429 | SceneTakeaway |

**Total: 26,020 frames (~14m 27s)**

---

## Key Design Decisions

### Layout
- `CONTAINER_W = 1500` (up from 860/960 — mobile friendly)
- `SUBTITLE_H = 160` — bottom reserved for subtitles
- `NAV_H = 72`

### Typography (mobile-readable at 1080p)
- Hero title: 88px
- Section header: 52px
- Card body: 36px
- AnalogyBox body: 34px
- Compare table header: 28px, body: 26px
- Learning path step title: 28px, desc: 24px, number circle: 48×48px 18px
- Quiz label: 18px (Space Mono), body: 26px, bullets: 24px
- Nav bar text: 16px (Space Mono)
- iMessage sender: 22px, body: 34px, "訊息" label: 18px
- **Rule**: content minimum 24px, UI chrome minimum 16px

### Audio
- Speaker: −16 LUFS → `volume={1.0}`
- BGM: `volume={0.10} loop`
- Pipeline: denoise (highpass+afftdn+lowpass) → trim silence (silencedetect+atrim) → normalize

### Callout Cards
- Style: macOS iMessage notification
- Direction: slides DOWN from top (translateY, not translateX)
- Width: `maxWidth: NOTIF_W` (580px max, shrinks to content)
- No `\n` in text — use `，`、`：` instead
- Stacking: newer card pushes older ones down, spring-animated
- `calcStackOffset` is a plain function (not a hook) — called before `return null`

### Visual
- Focus highlight: green glow on element first appear (`useFocusHighlight`)
- Progressive animation: each content block timed to VTT speaker content

### Removed permanently
- Particles, CodeChar drift, CornerLines, ScanSweep, GlowRing, Glitch effects
- No emoji anywhere

---

## File Map

```
~/Projects/vibe-coding-video/
  src/
    Root.tsx                  — Compositions: Intro2s + Video30s + FullVideo
    Video30s.tsx              — 30s sample (uses Opening.tsx)
    Opening.tsx               — Hero + Section01 for 30s sample
    FullVideo.tsx             — All 14 scenes, complete CH 0-1 video
    Intro2s.tsx               — Brand intro
    hooks.ts                  — useMorphIn, useGlitch, useTypewriter
    speaking-animation.json   — Lottie animation (extracted from speaking.lottie)
  public/
    audio/            — 15 WAV files (denoised + trimmed + normalized)
    aischool-logo.webp
  scripts/
    0a_denoise.sh          — Noise removal
    0b_trim_silence.sh     — Trim leading/trailing silence
    0_normalize_audio.sh   — −16 LUFS normalization
    1_transcribe.sh        — Whisper VTT
    2_correct_vtts.sh      — Brand name correction
    3_calc_frames.sh       — Frame count calculation
    4_render.sh            — Remotion render → out/CH{chapter}/
    6_merge_vtt.sh         — Merge all VTTs → out/CH{chapter}/CH{chapter}-subtitles.vtt
  out/
    CH01-1/
      CH0-1-complete.mp4    — Latest render (60MB, 14m27s)
      CH0-1-subtitles.vtt   — Merged subtitles (22KB)

Source assets: ~/Downloads/Vibe Coding 剪輯/0-1/
  (N)ch0-1.html         — Visual reference
  0-1 音檔/             — 14 WAV + 14 VTTs
```

---

## Pending

- None. CH 0-1 is complete.
