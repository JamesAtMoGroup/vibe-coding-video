#!/usr/bin/env python3
"""Merge all CH0-2 segment VTTs into a single file with global timestamps.

Accounts for the full-screen MP4 insert (apps-script-location.mov, 150 frames / 5s)
inserted between segments 3.2 (index 3) and 3.3 (index 4).
"""

import re, os

VTT_DIR  = "chapters/0-2/0-2 音檔"
OUT_FILE = "out/CH0-2-工具這麼多，用這 3 個就夠了/CH0-2-工具這麼多，用這 3 個就夠了-subtitles.vtt"

# ── Segment definitions (frames = Math.ceil(duration_sec * 30) + 10) ──────────
SEGMENTS_FRAMES = [1493, 1723, 1324, 3159, 1434, 1224, 589, 1828, 1342, 1052, 1836]
SEGMENT_FILES   = [
    "0.2_1.1.vtt",
    "0.2_2.1.vtt",
    "0.2_3.1.vtt",
    "0.2_3.2.vtt",
    "0.2_3.3.vtt",
    "0.2_4.0.vtt",
    "0.2_4.1.vtt",
    "0.2_4.2.vtt",
    "0.2_5.0.vtt",
    "0.2_5.1.vtt",
    "0.2_6.1.vtt",
]

# MP4 insert: 150 frames (5s) between index 3 and 4
MP4_INSERT_IDX    = 3
MP4_INSERT_FRAMES = 150

# Compute SEG_STARTS (audio-only cumulative)
seg_starts = []
acc = 0
for f in SEGMENTS_FRAMES:
    seg_starts.append(acc)
    acc += f

# Compute EFFECTIVE_STARTS (video timeline, shifted for MP4 insert)
effective_starts = [
    s + (MP4_INSERT_FRAMES if i > MP4_INSERT_IDX else 0)
    for i, s in enumerate(seg_starts)
]

# Convert to seconds
SEGMENTS = list(zip(SEGMENT_FILES, [s / 30.0 for s in effective_starts]))

# MP4 insert window (no subtitles during this window)
MP4_START_SEC = seg_starts[MP4_INSERT_IDX + 1] / 30.0          # = 7699/30 ≈ 256.633s
MP4_END_SEC   = (seg_starts[MP4_INSERT_IDX + 1] + MP4_INSERT_FRAMES) / 30.0  # = 7849/30 ≈ 261.633s


def parse_time(ts: str) -> float:
    parts = ts.strip().split(":")
    if len(parts) == 2:
        return int(parts[0]) * 60 + float(parts[1])
    else:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])


def fmt_time(secs: float) -> str:
    h = int(secs // 3600)
    m = int((secs % 3600) // 60)
    s = secs % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def offset_vtt(vtt_path: str, offset: float) -> list:
    with open(vtt_path, encoding="utf-8") as f:
        content = f.read()
    cues = []
    blocks = re.split(r"\n\n+", content.strip())
    for block in blocks:
        lines = block.strip().splitlines()
        if not lines:
            continue
        if lines[0].startswith("WEBVTT") or lines[0].startswith("NOTE"):
            continue
        timing_idx = None
        for i, line in enumerate(lines):
            if "-->" in line:
                timing_idx = i
                break
        if timing_idx is None:
            continue
        m = re.match(r"([\d:\.]+)\s+-->\s+([\d:\.]+)(.*)", lines[timing_idx])
        if not m:
            continue
        start_s = parse_time(m.group(1)) + offset
        end_s   = parse_time(m.group(2)) + offset
        rest    = m.group(3)
        text_lines = lines[timing_idx + 1:]
        if not any(l.strip() for l in text_lines):
            continue
        # Skip cues that fall inside the MP4 insert window
        if end_s <= MP4_START_SEC or start_s >= MP4_END_SEC:
            cues.append(f"{fmt_time(start_s)} --> {fmt_time(end_s)}{rest}\n" + "\n".join(text_lines))
    return cues


def main():
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    all_cues = []

    for fname, offset in SEGMENTS:
        path = os.path.join(VTT_DIR, fname)
        if not os.path.exists(path):
            print(f"WARNING: {path} not found, skipping")
            continue
        cues = offset_vtt(path, offset)
        all_cues.extend(cues)
        print(f"  {fname}: {len(cues)} cues, offset {offset:.3f}s")

    # Sort by start time
    def cue_start(cue: str) -> float:
        m = re.match(r"(\d{2}:\d{2}:\d{2}\.\d{3})", cue)
        return parse_time(m.group(1)) if m else 0

    all_cues.sort(key=cue_start)

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n")
        for i, cue in enumerate(all_cues):
            f.write(f"{i+1}\n{cue}\n\n")

    print(f"\nWrote {len(all_cues)} cues → {OUT_FILE}")
    print(f"MP4 insert window (no subs): {fmt_time(MP4_START_SEC)} → {fmt_time(MP4_END_SEC)}")


if __name__ == "__main__":
    main()
