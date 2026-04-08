#!/bin/bash
# start-chapter.sh — 驗證章節素材完整後，執行完整製作流程（背景）
# Usage: start-chapter.sh <chapter-id>  e.g. 1-2

set -e

CHAPTER="${1:?Usage: $0 <chapter-id>  e.g. 1-2}"
PROJECT="/Users/jamesshih/Projects/vibe-coding-video"
CHAPTER_DIR="${PROJECT}/chapters/${CHAPTER}"
AUDIO_DIR="${CHAPTER_DIR}/${CHAPTER} 音檔"
SCRIPTS="${PROJECT}/scripts"
LOCK="/tmp/vibe-lock-${CHAPTER}"
INTAKE_MARKER="/tmp/vibe-intake-${CHAPTER}"
SEND="$HOME/.claude/scripts/imessage_send.sh"
WAIT="$HOME/.claude/scripts/imessage_wait_approval.sh"

# ── 防止重複觸發 ──────────────────────────────────────────
if [ -f "$LOCK" ]; then
  echo "[start] ⚠️  CH${CHAPTER} 已在製作中（lock 存在），略過"
  exit 0
fi
touch "$LOCK"

echo "[start] ── CH${CHAPTER} 製作開始 $(date) ──"

# ── 驗證素材（VTT 由 Whisper 生成，不需事先存在）─────────
ERRORS=0
TRANSCRIPT_TXT="${CHAPTER_DIR}/章節${CHAPTER}_逐字講稿.txt"
TRANSCRIPT_DOCX="${CHAPTER_DIR}/章節${CHAPTER}_逐字講稿.docx"

# 若只有 .docx，自動轉成 .txt（agents 只讀 .txt）
if [ ! -f "$TRANSCRIPT_TXT" ] && [ -f "$TRANSCRIPT_DOCX" ]; then
  echo "[start] .docx 偵測到，轉換為 .txt..."
  python3 -c "
from docx import Document
doc = Document('${TRANSCRIPT_DOCX}')
text = '\n'.join(p.text for p in doc.paragraphs)
open('${TRANSCRIPT_TXT}', 'w', encoding='utf-8').write(text)
" && echo "[start] ✅ docx → txt 完成" || { echo "❌ docx 轉換失敗（請確認 python-docx 已安裝：pip install python-docx）"; ERRORS=1; }
fi

[ -f "$TRANSCRIPT_TXT" ] || { echo "❌ 找不到逐字講稿（.txt 或 .docx）"; ERRORS=1; }

# 音檔資料夾需有任意格式的音檔或影片
MEDIA_COUNT=$(ls "${AUDIO_DIR}/"*.wav "${AUDIO_DIR}/"*.mp3 "${AUDIO_DIR}/"*.mp4 "${AUDIO_DIR}/"*.mov 2>/dev/null | wc -l)
[ "$MEDIA_COUNT" -gt 0 ] || { echo "❌ 找不到任何音檔或影片（wav/mp3/mp4/mov）"; ERRORS=1; }

if [ $ERRORS -ne 0 ]; then
  "$SEND" "❌ CH${CHAPTER} 素材不完整，製作中止。請確認逐字稿與音檔。"
  rm -f "$LOCK" "$INTAKE_MARKER"
  exit 1
fi

"$SEND" "🎬 CH${CHAPTER} 製作開始，後台執行中..."
echo "[start] ✅ 素材驗證通過"

cd "$PROJECT"

# ═══════════════════════════════════════════════════════════
# Phase 1-A — Audio 正規化（ffmpeg，所有格式）
# ═══════════════════════════════════════════════════════════
echo "[Phase 1] Audio 正規化..."

for f in "${AUDIO_DIR}/"*.wav "${AUDIO_DIR}/"*.mp3 2>/dev/null; do
  [ -f "$f" ] || continue
  base="${f%.*}"; ext="${f##*.}"
  out="${base}-normalized.${ext}"
  echo "  → $(basename "$f")"
  ffmpeg -i "$f" \
    -af "silenceremove=start_periods=1:start_threshold=-50dB,loudnorm" \
    "$out" -y -loglevel error
done

for f in "${AUDIO_DIR}/"*.mp4 "${AUDIO_DIR}/"*.mov 2>/dev/null; do
  [ -f "$f" ] || continue
  base="${f%.*}"; ext="${f##*.}"
  out="${base}-normalized.${ext}"
  echo "  → $(basename "$f")"
  ffmpeg -i "$f" \
    -af loudnorm -c:v copy \
    "$out" -y -loglevel error
done

echo "[Phase 1] ✅ Audio 正規化完成"

# ═══════════════════════════════════════════════════════════
# Phase 1-B — Whisper（所有 normalized 檔案）
# 與 Script Agent 並行
# ═══════════════════════════════════════════════════════════
echo "[Phase 1] Whisper + Script Agent（並行）..."

# Whisper（背景）
(
  for f in "${AUDIO_DIR}/"*-normalized.*; do
    [ -f "$f" ] || continue
    ext="${f##*.}"
    echo "  [Whisper] $(basename "$f")"
    case "$ext" in
      wav|mp3)
        whisper "$f" --language zh --output_format vtt \
          --output_dir "${AUDIO_DIR}" --word_timestamps False 2>/dev/null
        ;;
      mp4|mov)
        # 抽音軌再跑 Whisper，VTT 存回同資料夾
        tmp_audio="/tmp/vibe_whisper_${CHAPTER}_$(basename "${f%.*}").wav"
        ffmpeg -i "$f" -vn -ar 16000 "$tmp_audio" -y -loglevel error
        whisper "$tmp_audio" --language zh --output_format vtt \
          --output_dir "${AUDIO_DIR}" --word_timestamps False 2>/dev/null
        # 重命名 VTT 對應回影片檔名
        vtt_name="${AUDIO_DIR}/$(basename "${f%.*}").vtt"
        tmp_vtt="${AUDIO_DIR}/$(basename "${tmp_audio%.*}").vtt"
        [ -f "$tmp_vtt" ] && mv "$tmp_vtt" "$vtt_name"
        rm -f "$tmp_audio"
        ;;
    esac
  done
  echo "[Phase 1] ✅ Whisper 完成"
) &
WHISPER_PID=$!

# Script Agent（背景）
(
  claude --dangerously-skip-permissions -p "
你是 Script Agent。讀 .agents/rules/pipeline.md。
讀 chapters/${CHAPTER}/章節${CHAPTER}_逐字講稿.txt。
列出所有 **備注** 區塊（使用相關素材 + 呈現方式）。
輸出為 chapters/${CHAPTER}/script-analysis-${CHAPTER}.json。
格式：{ \"segments\": [ { \"seg\": \"1.1\", \"assets\": [], \"presentation\": \"\" } ] }
完成後輸出「DONE」。
"
  echo "[Phase 1] ✅ Script Agent 完成"
) &
SCRIPT_PID=$!

# 等待兩者都完成
wait $WHISPER_PID
wait $SCRIPT_PID
echo "[Phase 1] ✅ 全部完成"

# ═══════════════════════════════════════════════════════════
# Phase 2 — VTT 校正（Whisper 完成後才能跑）
# ═══════════════════════════════════════════════════════════
echo "[Phase 2] VTT 校正..."
claude --dangerously-skip-permissions -p "
你是 VTT Agent。讀 .agents/rules/pipeline.md Phase 2 規則。
讀 ${AUDIO_DIR}/ 下所有 .vtt 檔。
對照 chapters/${CHAPTER}/章節${CHAPTER}_逐字講稿.txt 校正（繁簡字、的/得/地、專有名詞）。
直接修改原 .vtt 檔案。完成後輸出「DONE」。
"
echo "[Phase 2] ✅ VTT 校正完成"

# ═══════════════════════════════════════════════════════════
# Phase 3 — Visual Concept Agent（有了 VTT 時間軸才能規劃）
# ═══════════════════════════════════════════════════════════
echo "[Phase 3] Visual Concept..."
claude --dangerously-skip-permissions -p "
你是 Visual Concept Agent。讀 .agents/rules/pipeline.md Phase 3 規格。
讀 chapters/${CHAPTER}/章節${CHAPTER}_逐字講稿.txt、script-analysis-${CHAPTER}.json、
以及 ${AUDIO_DIR}/ 的所有校正後 .vtt（取得精確時間軸）。
輸出 chapters/${CHAPTER}/visual-spec-${CHAPTER}.json。
完成後輸出「DONE」。
"
echo "[Phase 3] ✅ Visual Concept 完成"

# ═══════════════════════════════════════════════════════════
# Phase 4 — Scene Dev（TSX + scene-map）
# ═══════════════════════════════════════════════════════════
echo "[Phase 4] Scene Dev..."
claude --dangerously-skip-permissions -p "
你是 Scene Dev Agent。讀 .agents/rules/pipeline.md Phase 4 規格。
讀 chapters/${CHAPTER}/visual-spec-${CHAPTER}.json + 校正後 VTT + 逐字講稿，實作 TSX。
依 segment 副檔名決定實作方式：
  wav/mp3 → Remotion 動畫 scene
  mp4/mov → OffthreadVideo + overlay scene（字卡、動畫、字幕疊加）
同時輸出 chapters/${CHAPTER}/scene-map-${CHAPTER}.json（HTML Agent 的比對依據）。
所有幀號來自 VTT（global_frame = seconds × 30）。
完成後輸出「DONE」。
"
echo "[Phase 4] ✅ Scene Dev 完成"

# ═══════════════════════════════════════════════════════════
# Phase 5 — QA → James 預覽 → 核准
# ═══════════════════════════════════════════════════════════
echo "[Phase 5] 啟動 Remotion dev server..."
npm run dev &
DEV_PID=$!
sleep 8

# QA 自動跑（失敗 → Fix → 重做，James 不介入）
bash "${SCRIPTS}/qa_and_wait.sh" "$CHAPTER"
QA_EXIT=$?

if [ $QA_EXIT -ne 0 ]; then
  "$SEND" "❌ CH${CHAPTER} QA 未通過，製作中止。查看 /tmp/vibe-ch${CHAPTER}.log"
  kill $DEV_PID 2>/dev/null
  rm -f "$LOCK"
  exit 1
fi

# QA 通過 → 通知 James 預覽
"$SEND" "✅ CH${CHAPTER} QA 全過，請開瀏覽器預覽後回覆「通過」開始 render"
open "http://localhost:3000"

echo "[Phase 5] 等待 James 核准（最多 2 小時）..."
"$WAIT" 7200
APPROVE_EXIT=$?

kill $DEV_PID 2>/dev/null

if [ $APPROVE_EXIT -ne 0 ]; then
  "$SEND" "⏰ CH${CHAPTER} 等待逾時，製作中止"
  rm -f "$LOCK" "$INTAKE_MARKER"
  exit 1
fi

echo "[Phase 5] ✅ James 核准，進入 render"

# ═══════════════════════════════════════════════════════════
# Phase 6 — Render + Post-render
# ═══════════════════════════════════════════════════════════
bash "${SCRIPTS}/post-render.sh" "$CHAPTER"

# 清理
rm -f "$LOCK" "$INTAKE_MARKER"
rm -f "${CHAPTER_DIR}/START"
echo "[start] ── CH${CHAPTER} 全部完成 $(date) ──"
