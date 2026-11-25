#!/usr/bin/env python3
# merge_vtt_2-8.py — 合併 CH2-8 21 段 VTT。offset 來自 SEG_STARTS_15（src/FullVideo15.tsx，含片頭 90f）。
# 6.1 在 78.3s 插入 210f 無聲回家作業卡：起點 >= 78.3s 的 cue 再 +7.0s。
import re, os
TITLE = "CH2-8-技術方案｜部署——把作品放上網路的常見做法"
VTT_DIR = "chapters/2-8/2-8 音檔"
OUT_DIR = f"out/{TITLE}"
OUT = f"{OUT_DIR}/{TITLE}-subtitles.vtt"
FPS = 30
SEG = ["0.1","1.1","1.2","1.3","2.1","2.2","2.3","2.4","2.5","3.1","3.2","3.3","3.4","3.5","3.6","4.1","5.1","5.2","5.3","5.4","6.1"]
src = open("src/FullVideo15.tsx").read()
AUDIO_F = [int(x) for x in re.search(r"const AUDIO_F = \[([^\]]+)\]", src).group(1).split(",")]
STARTS, acc = [], 90  # 片頭鉤子 90f
for d in AUDIO_F:
    STARTS.append(acc); acc += d
assert len(STARTS) == len(SEG)
SPLIT, HW = 78.3, 7.0
def t2s(t):
    p = t.split(":"); return sum(float(x) * 60 ** i for i, x in enumerate(reversed(p)))
def s2t(s):
    return f"{int(s//3600):02d}:{int(s%3600//60):02d}:{s%60:06.3f}"
cue = re.compile(r"^(\S+)\s+-->\s+(\S+)")
os.makedirs(OUT_DIR, exist_ok=True)
out = ["WEBVTT", ""]; n = 0
for seg, st in zip(SEG, STARTS):
    off = st / FPS
    lines = open(f"{VTT_DIR}/2-8_{seg}-normalized.vtt", encoding="utf-8").read().splitlines()
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
