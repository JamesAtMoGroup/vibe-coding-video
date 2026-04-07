#!/usr/bin/env python3
"""Parse all CH0-3 VTT files → chapters/0-3/timing-map.json
Each cue: start_sec, end_sec, start_frame, end_frame, text (all LOCAL, 30fps)
"""
import json, re, os

VTT_DIR = "chapters/0-3/0-3音檔"
OUT     = "chapters/0-3/timing-map.json"
FPS     = 30

SEGMENTS = [
    "0-3_1.1","0-3_2.0","0-3_2.1","0-3_2.2",
    "0-3_3.1","0-3_3.2","0-3_3.3",
    "0-3_4.0","0-3_4.1","0-3_4.2","0-3_4.3",
    "0-3_4.4","0-3_4.5","0-3_4.6","0-3_4.7",
    "0-3_4.8","0-3_4.9",
    "0-3_5.1","0-3_6.1","0-3_7.1",
]

def parse_time(ts):
    ts = ts.strip().replace(',', '.')
    parts = ts.split(':')
    if len(parts) == 2:
        return float(parts[0]) * 60 + float(parts[1])
    return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])

def parse_vtt(path):
    with open(path, encoding='utf-8') as f:
        content = f.read()
    cues = []
    for block in re.split(r'\n\n+', content.strip()):
        lines = block.strip().splitlines()
        if not lines or lines[0].startswith('WEBVTT') or lines[0].startswith('NOTE'):
            continue
        timing_idx = next((i for i, l in enumerate(lines) if '-->' in l), None)
        if timing_idx is None:
            continue
        m = re.match(r'([\d:,\.]+)\s+-->\s+([\d:,\.]+)', lines[timing_idx])
        if not m:
            continue
        start_s = parse_time(m.group(1))
        end_s   = parse_time(m.group(2))
        text = ' '.join(l.strip() for l in lines[timing_idx+1:] if l.strip())
        if not text:
            continue
        cues.append({
            "start_sec":   round(start_s, 3),
            "end_sec":     round(end_s, 3),
            "start_frame": round(start_s * FPS),
            "end_frame":   round(end_s * FPS),
            "text":        text,
        })
    return cues

result = {}
for seg in SEGMENTS:
    seg_id = seg.replace("0-3_", "")
    vtt_path = os.path.join(VTT_DIR, seg + ".vtt")
    if not os.path.exists(vtt_path):
        print(f"  MISSING: {vtt_path}")
        continue
    cues = parse_vtt(vtt_path)
    result[seg_id] = {"cues": cues, "total_cues": len(cues),
                      "duration_sec": cues[-1]["end_sec"] if cues else 0}
    print(f"  {seg_id}: {len(cues)} cues, {result[seg_id]['duration_sec']:.1f}s")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print(f"\n✓ {OUT}")
