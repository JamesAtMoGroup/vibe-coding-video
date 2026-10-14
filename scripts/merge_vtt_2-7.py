#!/usr/bin/env python3
# merge_vtt_2-7.py — Merge all 20 segment VTTs for CH2-7 into one combined VTT
# Offsets come from SEG_STARTS_14 in src/FullVideo14.tsx (FPS=30), not guessed.

import re, os

VTT_DIR = "/Users/jamesshih/Projects/vibe-coding-video/chapters/2-7/2-7 音檔"
OUT_DIR = "/Users/jamesshih/Projects/vibe-coding-video/out/CH2-7-技術方案｜爬蟲——看得到就爬得到，3 招實用技巧"
OUT = f"{OUT_DIR}/CH2-7-技術方案｜爬蟲——看得到就爬得到，3 招實用技巧-subtitles.vtt"
FPS = 30

SEG_ORDER = ["0.1", "1.1", "1.2", "2.1", "2.2", "2.3", "3.1", "3.2", "3.3", "3.4",
             "4.1", "4.2", "4.3", "4.4", "5.1", "5.2", "5.3", "6.1", "6.2", "7.1"]
SEG_STARTS_14 = [0, 969, 2476, 4034, 5673, 7501, 8699, 9476, 11111, 12400,
                 13375, 14844, 16177, 17956, 20047, 20799, 22043, 24134, 25686, 28045]
TOTAL_FRAMES_14 = 31916

def ts_to_sec(ts):
    parts = ts.strip().split(":")
    if len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    h, m, s = parts
    return int(h) * 3600 + int(m) * 60 + float(s)

def sec_to_ts(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"

cue_re = re.compile(r"^(\d{1,2}:\d{2}[\d:.]*)\s+-->\s+(\d{1,2}:\d{2}[\d:.]*)")

os.makedirs(OUT_DIR, exist_ok=True)
lines_out = ["WEBVTT", ""]
cue_index = 1
last_end_sec = 0.0

for i, seg in enumerate(SEG_ORDER):
    offset_sec = SEG_STARTS_14[i] / FPS
    fpath = os.path.join(VTT_DIR, f"2-7_{seg}-corrected.vtt")
    with open(fpath, encoding="utf-8") as f:
        content = f.read()
    blocks = re.split(r"\n{2,}", content.strip())
    for block in blocks:
        block = block.strip()
        if not block or block == "WEBVTT":
            continue
        new_block = []
        for line in block.splitlines():
            m = cue_re.match(line)
            if m:
                t1 = ts_to_sec(m.group(1)) + offset_sec
                t2 = ts_to_sec(m.group(2)) + offset_sec
                new_block.append(f"{sec_to_ts(t1)} --> {sec_to_ts(t2)}")
                last_end_sec = max(last_end_sec, t2)
            elif re.match(r"^\d+$", line):
                new_block.append(str(cue_index))
                cue_index += 1
            else:
                new_block.append(line)
        if any(cue_re.match(l) for l in new_block):
            lines_out.extend(new_block)
            lines_out.append("")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(lines_out))

total_video_sec = TOTAL_FRAMES_14 / FPS
print(f"Written: {OUT}")
print(f"Total cues: {cue_index - 1}")
print(f"Last cue end: {last_end_sec:.3f}s | mp4 length (frames/fps): {total_video_sec:.3f}s | diff: {total_video_sec - last_end_sec:+.3f}s")
