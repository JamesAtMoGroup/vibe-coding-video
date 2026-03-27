#!/bin/bash
# 6_merge_vtt.sh — Merge all 14 segment VTTs into one combined VTT
# Output: out/CH01-1/CH0-1-subtitles.vtt
# Timestamps are shifted by cumulative frame offsets at 30fps

VTT_DIR="/Users/jamesshih/Downloads/Vibe Coding 剪輯/0-1/0-1 音檔"
OUT_DIR="/Users/jamesshih/Projects/vibe-coding-video/out/CH01-1"
OUT_VTT="$OUT_DIR/CH0-1-subtitles.vtt"

mkdir -p "$OUT_DIR"

python3 << 'PYEOF'
import re, os

VTT_DIR = "/Users/jamesshih/Downloads/Vibe Coding 剪輯/0-1/0-1 音檔"
OUT = "/Users/jamesshih/Projects/vibe-coding-video/out/CH01-1/CH0-1-subtitles.vtt"

# Segment frame counts at 30fps → cumulative offsets in seconds
SEGMENTS = [
    ("0-1_1.1.vtt",  1131),
    ("0-1_2.1.vtt",  1061),
    ("0-1_2.2.vtt",  1067),
    ("0-1_2.3.vtt",  1367),
    ("0-1_3.0.vtt",  2641),
    ("0-1_3.1.vtt",  3619),
    ("0-1_3.2.vtt",  1546),
    ("0-1_4.1.vtt",  2293),
    ("0-1_4.2.vtt",  1050),
    ("0-1_4.3.vtt",  2187),
    ("0-1_5.1.vtt",  1607),
    ("0-1_5.2.vtt",   874),
    ("0-1_5.3.vtt",  3148),
    ("0-1_6.1.vtt",  2429),
]

def ts_to_sec(ts):
    """Parse VTT timestamp (HH:MM:SS.mmm or MM:SS.mmm) → float seconds."""
    parts = ts.strip().split(":")
    if len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    elif len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)

def sec_to_ts(sec):
    """Float seconds → HH:MM:SS.mmm VTT timestamp."""
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"

cue_re = re.compile(r"^(\d{2}:\d{2}[\d:.]+)\s+-->\s+(\d{2}:\d{2}[\d:.]+)")

lines_out = ["WEBVTT", ""]
cue_index = 1
offset_frames = 0

for fname, frames in SEGMENTS:
    fpath = os.path.join(VTT_DIR, fname)
    offset_sec = offset_frames / 30.0

    with open(fpath, encoding="utf-8") as f:
        content = f.read()

    # Split into blocks separated by blank lines
    blocks = re.split(r"\n{2,}", content.strip())
    for block in blocks:
        block = block.strip()
        if not block or block == "WEBVTT":
            continue
        block_lines = block.splitlines()
        # Find the timing line
        new_block = []
        for line in block_lines:
            m = cue_re.match(line)
            if m:
                t1 = ts_to_sec(m.group(1)) + offset_sec
                t2 = ts_to_sec(m.group(2)) + offset_sec
                new_block.append(f"{sec_to_ts(t1)} --> {sec_to_ts(t2)}")
            elif re.match(r"^\d+$", line):
                # Numeric cue identifier — replace with sequential index
                new_block.append(str(cue_index))
                cue_index += 1
            else:
                new_block.append(line)
        if any(cue_re.match(l) for l in new_block):
            lines_out.extend(new_block)
            lines_out.append("")

    offset_frames += frames

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(lines_out))

print(f"Written: {OUT}")
print(f"Total cues: {cue_index - 1}")
PYEOF
