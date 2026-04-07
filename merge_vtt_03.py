#!/usr/bin/env python3
"""Merge all CH0-3 segment VTTs into a single file with global timestamps.

No MP4 inserts in FullVideo03 — pure audio segment merge.
"""

import re, os

VTT_DIR  = "chapters/0-3/0-3音檔"
OUT_FILE = "out/CH0-3-寫程式的 7 大流程與 AI 溝通技巧/CH0-3-寫程式的 7 大流程與 AI 溝通技巧-subtitles.vtt"

# ── Segment definitions (from FullVideo03.tsx SEGMENTS array) ─────────────────
SEGMENTS_FRAMES = [
    1482,  # 0: 1.1
    3220,  # 1: 2.0
    1437,  # 2: 2.1
    1348,  # 3: 2.2
    2150,  # 4: 3.1
    1794,  # 5: 3.2
    1615,  # 6: 3.3
    4469,  # 7: 4.0
    2240,  # 8: 4.1
    2641,  # 9: 4.2
    2418,  # 10: 4.3
    1660,  # 11: 4.4
    1749,  # 12: 4.5
    1482,  # 13: 4.6
    1392,  # 14: 4.7
    1348,  # 15: 4.8
    1392,  # 16: 4.9
    1660,  # 17: 5.1
    2641,  # 18: 6.1
    2908,  # 19: 7.1
]

SEGMENT_FILES = [
    "0-3_1.1.vtt",
    "0-3_2.0.vtt",
    "0-3_2.1.vtt",
    "0-3_2.2.vtt",
    "0-3_3.1.vtt",
    "0-3_3.2.vtt",
    "0-3_3.3.vtt",
    "0-3_4.0.vtt",
    "0-3_4.1.vtt",
    "0-3_4.2.vtt",
    "0-3_4.3.vtt",
    "0-3_4.4.vtt",
    "0-3_4.5.vtt",
    "0-3_4.6.vtt",
    "0-3_4.7.vtt",
    "0-3_4.8.vtt",
    "0-3_4.9.vtt",
    "0-3_5.1.vtt",
    "0-3_6.1.vtt",
    "0-3_7.1.vtt",
]

# No MP4 insert in FullVideo03
MP4_INSERT_IDX    = None
MP4_INSERT_FRAMES = 0

# Compute SEG_STARTS (cumulative frame offsets)
seg_starts = []
acc = 0
for f in SEGMENTS_FRAMES:
    seg_starts.append(acc)
    acc += f

# No video insert — effective_starts == seg_starts
effective_starts = seg_starts[:]

# Convert to seconds
SEGMENTS = list(zip(SEGMENT_FILES, [s / 30.0 for s in effective_starts]))


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
    total_frames = sum(SEGMENTS_FRAMES)
    print(f"Total frames: {total_frames} ({total_frames/30:.1f}s, TOTAL_FRAMES_03=41046)")


if __name__ == "__main__":
    main()
