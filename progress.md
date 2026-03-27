# Vibe Coding Video — Progress Log

## Project Overview

Course video production for **AI 寫程式入門課程** using Remotion.
Skill spec: `~/Downloads/Vibe Coding 剪輯/course-video.md`
Remotion project: `~/Projects/vibe-coding-video/`

---

## Current Status: CH 0-1 — 30s Sample ✅

### What's Done

| Task | Status | Notes |
|------|--------|-------|
| VTT transcription (0-1_1.1) | ✅ Done | Corrected: Vycoding → Vibe Coding |
| Opening.tsx — Hero section | ✅ Done | Matches `(N)ch0-1.html` exactly |
| Opening.tsx — Section 01 | ✅ Done | Scrolls in at f600–f700 |
| ProgressBar | ✅ Done | Logo + "AI 寫程式入門課程" \| "章節 0-1 / 4" |
| Callout Cards (字卡) | ✅ Done | macOS Messages notification style |
| 30s render | ✅ Done | `sample-30s.mp4` (2.2 MB) |
| Audio mix | ✅ Done | Speaker 0.75, BGM 0.18 |

### Callout Timings (VTT-based, 0-1_1.1)

| Frame | Label | Text | Side |
|-------|-------|------|------|
| 133–300 | 很多人的感受 | 「寫程式」\n感覺離我很遠 | right (top-right) |
| 302–516 | 好消息 | 零技術背景\n也可以 | right |
| 518–720 | 關鍵 | 靠 AI 的幫助\n讓電腦替你做事 | right |
| 838–900 | 本章主題 | 寫程式\n到底是什麼 | right |

### Callout Card Style (current)
- macOS Messages notification style
- Position: top-right corner, `right: 16, top: NAV_H + 20`
- Slides in from right edge (translateX 380 → 0)
- Width: 420px
- Font: Noto Sans TC 34px bold for message body
- Green Messages app icon (CSS-drawn)

### Audio Files
- Speaker: `public/audio/0-1_1.1_studio.wav` — volume 0.75
- BGM: `public/audio/course_background_music.wav` — volume 0.18

---

## Pending: HeyGen Digital Avatar

**Goal:** Add avatar `f7af57d29abd4254a1e43441ec16ce40` as a circle in bottom-right corner, lipsynced to audio, muted in Remotion.

**Blocker:** HeyGen API credits insufficient (`MOVIO_PAYMENT_INSUFFICIENT_CREDIT`).
API credits are separate from regular HeyGen plan — purchase at HeyGen Developer Console.

**When credits are available, run:**
```bash
# Audio already uploaded — asset_id: 807d290115804f09bf6f82e4e9d81434
# Valid for 7 days from 2026-03-27. Re-upload if expired:
# ffmpeg -y -i "public/audio/0-1_1.1_studio.wav" -t 30 -ab 128k /tmp/avatar_audio_30s.mp3
# curl -X POST https://upload.heygen.com/v1/asset \
#   -H "x-api-key: [KEY]" -H "Content-Type: audio/mpeg" --data-binary @/tmp/avatar_audio_30s.mp3

# Create video:
curl -X POST "https://api.heygen.com/v2/video/generate" \
  -H "x-api-key: [KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "video_inputs": [{
      "character": {
        "type": "avatar",
        "avatar_id": "f7af57d29abd4254a1e43441ec16ce40",
        "avatar_style": "normal"
      },
      "voice": {
        "type": "audio",
        "audio_asset_id": "807d290115804f09bf6f82e4e9d81434"
      }
    }],
    "dimension": { "width": 512, "height": 512 }
  }'
# Poll: GET https://api.heygen.com/v1/video_status.get?video_id={id}
# Download MP4 → public/avatar/avatar-ch0-1.mp4
# Add <Video> to Opening.tsx: bottom-right circle, muted={true}
```

**Remotion integration (after download):**
```tsx
// In Opening.tsx — add below Callout cards
<div style={{
  position: "absolute",
  bottom: 32, right: 32,
  width: 180, height: 180,
  borderRadius: "50%",
  overflow: "hidden",
  border: "3px solid rgba(124,255,178,0.5)",
  boxShadow: "0 0 24px rgba(124,255,178,0.2)",
  zIndex: 50,
}}>
  <Video
    src={staticFile("avatar/avatar-ch0-1.mp4")}
    muted
    style={{ width: "100%", height: "100%", objectFit: "cover" }}
  />
</div>
```

---

## Remaining Work — Full CH 0-1 Video

Audio files not yet processed (no VTT):

| File | Section | HTML Block |
|------|---------|-----------|
| 0-1_2.1.wav | 二、自動化概念 | Section 01 Card 1 |
| 0-1_2.2.wav | 二、生活比喻 | Section 01 Analogy |
| 0-1_2.3.wav | 二、廣義vs狹義 | Section 01 Card 2 |
| 0-1_3.0.wav | 三、非工程師前言 | Section 02 Card |
| 0-1_3.1.wav | 三、具體場景 | Section 02 Usecase |
| 0-1_3.2.wav | 三、生活樂趣 | Section 02 Card + Quiz |
| 0-1_4.1.wav | 四、AI Coding 定義 | Section 03 Card |
| 0-1_4.2.wav | 四、Vibe Coding 定義 | Section 03 Card |
| 0-1_4.3.wav | 四、實際感覺 | Section 03 Analogy |
| 0-1_5.1.wav | 五、Vibe 特性 | Section 04 Compare |
| 0-1_5.2.wav | 五、AI Coding 特性 | Section 04 Compare |
| 0-1_5.3.wav | 五、學習路徑 | Section 04 Path + Quiz |
| 0-1_6.1.wav | 六、收尾 | Takeaway |

**Next step when resuming:** Run Whisper VTT on all remaining audio files, then build scenes.

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
    Root.tsx          — Compositions: Intro2s (4K 120f) + Video30s (1080p 900f)
    Video30s.tsx      — Audio wiring (speaker 0.75, BGM 0.18)
    Opening.tsx       — All visual components: ProgressBar, HeroSection,
                        Section01, CalloutCard (macOS notification style)
    Intro2s.tsx       — Brand intro (separate)
    hooks.ts          — useMorphIn, useGlitch, useTypewriter
    index.ts          — Remotion entry
  public/
    audio/
      0-1_1.1.wav           — original
      0-1_1.1_studio.wav    — EQ + compressed (used in render)
      course_background_music.wav
      intro-stinger.wav
    aischool-logo.webp

Source assets: ~/Downloads/Vibe Coding 剪輯/0-1/
  (N)ch0-1.html         — visual reference (single source of truth)
  0-1 音檔/             — 14 WAV files
  章節0-1_逐字講稿.docx — script for VTT correction
  0-1 音檔/0-1_1.1.vtt  — corrected VTT (only one done so far)
```
