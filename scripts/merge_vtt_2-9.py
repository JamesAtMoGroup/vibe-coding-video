#!/usr/bin/env python3
# merge_vtt_2-9.py — 合併 CH2-9 18 段 VTT。offset 由 src/FullVideo16.tsx 的 AUDIO_F 推（片頭 90f；6.1 後插 240f 作業卡，6.2 起 +240f）。
import re, os
TITLE = "CH2-9-技術方案｜資料庫——簡易版、專業版，哪個適合我"
VTT_DIR = "chapters/2-9/2-9 音檔"
OUT_DIR = f"out/{TITLE}"
OUT = f"{OUT_DIR}/{TITLE}-subtitles.vtt"
FPS = 30
SEG = ["0.1","1.1","1.2","1.3","1.4","2.1","2.2","3.1","3.2","4.1","4.2","4.3","4.4","4.5","5.1","5.2","6.1","6.2"]
src = open("src/FullVideo16.tsx").read()
AUDIO_F = [int(x) for x in re.search(r"(?:export )?const AUDIO_F = \[([^\]]+)\]", src).group(1).split(",")]
STARTS, acc = [], 90  # 片頭鉤子 90f
for d in AUDIO_F:
    STARTS.append(acc); acc += d
STARTS[-1] += 240  # 6.1 之後的 240f 回家作業卡
assert len(STARTS) == len(SEG)
SPLIT, HW = 1e9, 0.0  # 2-9 不切音檔
def t2s(t):
    p = t.split(":"); return sum(float(x) * 60 ** i for i, x in enumerate(reversed(p)))
def s2t(s):
    return f"{int(s//3600):02d}:{int(s%3600//60):02d}:{s%60:06.3f}"
cue = re.compile(r"^(\S+)\s+-->\s+(\S+)")
os.makedirs(OUT_DIR, exist_ok=True)
out = ["WEBVTT", ""]; n = 0
for seg, st in zip(SEG, STARTS):
    off = st / FPS
    lines = open(f"{VTT_DIR}/2-9_{seg}-normalized.vtt", encoding="utf-8").read().splitlines()
    i = 0
    while i < len(lines):
        m = cue.match(lines[i])
        if m:
            a, b = t2s(m.group(1)), t2s(m.group(2))
            extra = HW if (seg == "6.1" and a >= SPLIT) else 0
            txt = []
            i += 1
            while i < len(lines) and lines[i].strip():
                txt.append(lines[i]); i += 1
            n += 1
            out += [str(n), f"{s2t(a+off+extra)} --> {s2t(b+off+extra)}", *txt, ""]
        else:
            i += 1
open(OUT, "w", encoding="utf-8").write("\n".join(out))
print(f"{n} cues → {OUT}; last end {out[-3].split(' --> ')[1] if n else ''}")
