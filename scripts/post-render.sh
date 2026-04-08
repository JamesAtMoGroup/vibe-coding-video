#!/bin/bash
# post-render.sh — Render 後自動執行：合 VTT、生 HTML、複製 assets、上傳 Drive、通知 James
# Usage: post-render.sh <chapter-id>  e.g. 1-2

set -e

CHAPTER="${1:?Usage: $0 <chapter-id>  e.g. 1-2}"
PROJECT="/Users/jamesshih/Projects/vibe-coding-video"
CHAPTER_DIR="${PROJECT}/chapters/${CHAPTER}"
SEND="$HOME/.claude/scripts/imessage_send.sh"
DRIVE_FOLDER_ID="1jt_nkySWqs_iGBVUARVDW053DA6pOlJY"

cd "$PROJECT"

# ── 1. 讀取章節標題（從 scene-map 或逐字講稿第一行推導）────
SCENE_MAP="${CHAPTER_DIR}/scene-map-${CHAPTER}.json"
if [ -f "$SCENE_MAP" ]; then
  CHAPTER_TITLE=$(python3 -c "
import json, sys
d = json.load(open('${SCENE_MAP}'))
print(d.get('chapter_title', ''))
" 2>/dev/null)
fi

# fallback：從逐字稿第一行抓標題
if [ -z "$CHAPTER_TITLE" ]; then
  CHAPTER_TITLE=$(head -3 "${CHAPTER_DIR}/章節${CHAPTER}_逐字講稿.txt" | grep -v '^$' | head -1 | tr -d '##　 ')
fi

FOLDER_NAME="CH${CHAPTER}-${CHAPTER_TITLE}"
OUT_DIR="${PROJECT}/out/${FOLDER_NAME}"
mkdir -p "$OUT_DIR"

echo "[post-render] 章節：${FOLDER_NAME}"

# ── 2. Render ──────────────────────────────────────────────
echo "[post-render] Render 開始..."
# TSX composition name 從 scene-map 讀取，fallback 用 FullVideo
COMPOSITION=$(python3 -c "
import json
d = json.load(open('${SCENE_MAP}'))
print(d.get('composition', 'FullVideo'))
" 2>/dev/null || echo "FullVideo")

npx remotion render "$COMPOSITION" \
  "${OUT_DIR}/${FOLDER_NAME}.mp4" \
  --codec=h264

echo "[post-render] ✅ Render 完成"

# ── 3. 合併 VTT ────────────────────────────────────────────
echo "[post-render] 合併 VTT..."
python3 << PYEOF
import re, json
from pathlib import Path

scene_map = json.load(open("${SCENE_MAP}"))
seg_starts = scene_map.get("seg_starts", [])
fps = 30

vtt_dir = Path("${CHAPTER_DIR}/${CHAPTER} 音檔")
out_vtt = Path("${OUT_DIR}/${FOLDER_NAME}-subtitles.vtt")

def parse_time(t):
    parts = t.strip().split(":")
    h, m, s = (parts if len(parts) == 3 else ["0"] + parts)
    return int(h)*3600 + int(m)*60 + float(s.replace(",","."))

def fmt_time(s):
    h = int(s // 3600); m = int((s % 3600) // 60); sec = s % 60
    return f"{h:02d}:{m:02d}:{sec:06.3f}"

cues = []
vtt_files = sorted(vtt_dir.glob("*-normalized.vtt"))
for i, vtt_path in enumerate(vtt_files):
    offset = seg_starts[i] / fps if i < len(seg_starts) else 0
    text = vtt_path.read_text(encoding="utf-8")
    j = 0
    lines = text.splitlines()
    while j < len(lines):
        line = lines[j].strip()
        if "-->" in line:
            m = re.match(r"([\d:.,]+)\s+-->\s+([\d:.,]+)", line)
            if m:
                start = parse_time(m.group(1)) + offset
                end = parse_time(m.group(2)) + offset
                j += 1
                content = []
                while j < len(lines) and lines[j].strip():
                    content.append(lines[j].strip()); j += 1
                if content:
                    cues.append((start, end, " ".join(content)))
        j += 1

cues.sort(key=lambda c: c[0])
out_lines = ["WEBVTT", ""]
for idx, (s, e, c) in enumerate(cues, 1):
    out_lines += [str(idx), f"{fmt_time(s)} --> {fmt_time(e)}", c, ""]

out_vtt.write_text("\n".join(out_lines), encoding="utf-8")
print(f"✅ VTT: {len(cues)} cues → {out_vtt}")
PYEOF

# ── 4. 生成 HTML（三方交叉比對）───────────────────────────
echo "[post-render] 生成 HTML..."
claude --dangerously-skip-permissions -p "
你是 HTML Agent。讀 .agents/rules/pipeline.md Phase 6 Step 3 的規則。
三方交叉比對：
① ${CHAPTER_DIR}/(N)ch${CHAPTER}.html
② ${CHAPTER_DIR}/scene-map-${CHAPTER}.json
③ ${CHAPTER_DIR}/章節${CHAPTER}_逐字講稿.txt

生成靜態 HTML 課程頁，輸出到：
${OUT_DIR}/${FOLDER_NAME}.html

同時把 scene-map 中的 assets 複製到 ${OUT_DIR}/assets/（來源：${CHAPTER_DIR}/${CHAPTER}\ 影片製作相關素材/ 或 public/assets/${CHAPTER}/）。
完成後輸出「DONE」。
"

# ── 5. 上傳 Google Drive ───────────────────────────────────
echo "[post-render] 上傳 Google Drive..."
rclone sync "${OUT_DIR}" \
  "gdrive:${FOLDER_NAME}" \
  --drive-root-folder-id "${DRIVE_FOLDER_ID}" \
  --progress

echo "[post-render] ✅ Google Drive 上傳完成"

# ── 6. 完成通知 ────────────────────────────────────────────
MP4_SIZE=$(du -sh "${OUT_DIR}/${FOLDER_NAME}.mp4" | cut -f1)
VTT_CUES=$(grep -c "^[0-9]" "${OUT_DIR}/${FOLDER_NAME}-subtitles.vtt" 2>/dev/null || echo "?")

"$SEND" "🎉 CH${CHAPTER}《${CHAPTER_TITLE}》製作完成！
📁 ${FOLDER_NAME}/
   ├── .mp4 (${MP4_SIZE})
   ├── -subtitles.vtt (${VTT_CUES} cues)
   ├── .html
   └── assets/
☁️ Google Drive 已同步"

echo "[post-render] ── 全部完成 $(date) ──"
