#!/usr/bin/env python3
"""Merge all CH0-1 segment VTTs into a single file with global timestamps."""

import re, os

VTT_DIR = "chapters/0-1/0-1 音檔"
OUT_FILE = "out/CH0-1/CH0-1-subtitles.vtt"

# Offset in seconds for each segment VTT file
SEGMENTS = [
    ("0-1_1.1.vtt",  0.000),
    ("0-1_2.1.vtt",  38.133),
    ("0-1_2.2.vtt",  72.267),
    ("0-1_2.3.vtt",  105.700),
    ("0-1_3.0.vtt",  149.733),
    ("0-1_3.1.vtt",  238.200),
    ("0-1_3.2.vtt",  358.000),
    ("0-1_4.1.vtt",  409.933),
    ("0-1_4.2.vtt",  486.767),
    # 4.3 handled specially (split into 3 parts with 2 MP4 inserts)
    ("0-1_5.1.vtt",  678.100),
    ("0-1_5.2.vtt",  732.033),
    ("0-1_5.3.vtt",  760.500),
    ("0-1_6.1.vtt",  865.900),
]

# 4.3 split:
# audio position 0 to 28.833s → maps to video 4.3a (starts at 522.167s)
# audio position 28.833 to 64.933s → maps to video 4.3b (starts at 606.900s, audio offset 28.833s)
# audio position 64.933s+ → maps to video 4.3c (starts at 670.100s, audio offset 64.933s)
F43_A_DUR = 865 / 30   # 28.833s
F43_B_DUR = 1083 / 30  # 36.100s
F43_A_VIDEO_START = 522.167
F43_B_VIDEO_START = 606.900
F43_C_VIDEO_START = 670.100


def parse_time(ts: str) -> float:
    """Parse VTT timestamp (MM:SS.mmm or HH:MM:SS.mmm) → seconds."""
    parts = ts.strip().split(":")
    if len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    else:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)


def fmt_time(secs: float) -> str:
    """Format seconds → HH:MM:SS.mmm"""
    h = int(secs // 3600)
    m = int((secs % 3600) // 60)
    s = secs % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def offset_vtt(vtt_path: str, offset: float) -> list[str]:
    """Parse VTT, shift all timestamps by offset, return cue blocks."""
    with open(vtt_path, encoding="utf-8") as f:
        content = f.read()

    cues = []
    # Split into blocks
    blocks = re.split(r"\n\n+", content.strip())
    for block in blocks:
        lines = block.strip().splitlines()
        if not lines:
            continue
        # Skip WEBVTT header and NOTE blocks
        if lines[0].startswith("WEBVTT") or lines[0].startswith("NOTE"):
            continue
        # Find timing line
        timing_idx = None
        for i, line in enumerate(lines):
            if "-->" in line:
                timing_idx = i
                break
        if timing_idx is None:
            continue
        timing_line = lines[timing_idx]
        m = re.match(r"([\d:\.]+)\s+-->\s+([\d:\.]+)(.*)", timing_line)
        if not m:
            continue
        start_s = parse_time(m.group(1)) + offset
        end_s   = parse_time(m.group(2)) + offset
        rest    = m.group(3)
        text_lines = lines[timing_idx + 1:]
        if not any(l.strip() for l in text_lines):
            continue
        new_timing = f"{fmt_time(start_s)} --> {fmt_time(end_s)}{rest}"
        cues.append(new_timing + "\n" + "\n".join(text_lines))
    return cues


def offset_vtt_43(vtt_path: str) -> list[str]:
    """Parse 4.3 VTT, remapping timestamps across 3 split regions."""
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
        timing_line = lines[timing_idx]
        m = re.match(r"([\d:\.]+)\s+-->\s+([\d:\.]+)(.*)", timing_line)
        if not m:
            continue
        audio_start = parse_time(m.group(1))
        audio_end   = parse_time(m.group(2))
        rest        = m.group(3)
        text_lines  = lines[timing_idx + 1:]
        if not any(l.strip() for l in text_lines):
            continue

        # Segment boundaries in audio time
        B1 = F43_A_DUR              # 28.833s — 4.3a/4.3b split
        B2 = F43_A_DUR + F43_B_DUR  # 64.933s — 4.3b/4.3c split

        def audio_to_video(t: float) -> float:
            if t < B1:
                return F43_A_VIDEO_START + t
            elif t <= B2:
                return F43_B_VIDEO_START + (t - B1)
            else:
                return F43_C_VIDEO_START + (t - B2)

        # Clip end to segment boundary to prevent cues spanning MP4 inserts
        audio_end_clipped = audio_end
        if audio_start < B1:
            audio_end_clipped = min(audio_end, B1)
        elif audio_start < B2:
            audio_end_clipped = min(audio_end, B2)

        vs = audio_to_video(audio_start)
        ve = audio_to_video(audio_end_clipped)
        if ve <= vs:
            continue  # skip zero-length cues
        new_timing = f"{fmt_time(vs)} --> {fmt_time(ve)}{rest}"
        cues.append(new_timing + "\n" + "\n".join(text_lines))
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

    # 4.3 special
    path_43 = os.path.join(VTT_DIR, "0-1_4.3.vtt")
    if os.path.exists(path_43):
        cues_43 = offset_vtt_43(path_43)
        all_cues.extend(cues_43)
        print(f"  0-1_4.3.vtt (split): {len(cues_43)} cues")
    else:
        print("WARNING: 0-1_4.3.vtt not found")

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


if __name__ == "__main__":
    main()
