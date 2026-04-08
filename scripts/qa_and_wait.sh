#!/bin/bash
# qa_and_wait.sh — Run QA checks, send iMessage report, wait for approval
#
# Usage:
#   ./scripts/qa_and_wait.sh <chapter>   e.g. 0-1
#
# Exit codes:
#   0 = approved (通過)
#   1 = timeout
#   2 = rejected

set -e

CHAPTER="${1:?Usage: $0 <chapter>  e.g. 0-1}"
PROJECT="/Users/jamesshih/Projects/vibe-coding-video"
FLAG_FILE="/tmp/qa_approved_vibe_${CHAPTER//[-.]/_}"
SEND="$HOME/.claude/scripts/imessage_send.sh"
WAIT="$HOME/.claude/scripts/imessage_wait_approval.sh"

echo "=== QA Check: Chapter ${CHAPTER} ==="

PASS=0
FAIL=0
REPORT=""

check() {
  local label="$1"
  local result="$2"   # "ok" or error message
  if [ "$result" = "ok" ]; then
    REPORT+="  ✅ ${label}\n"
    PASS=$((PASS+1))
  else
    REPORT+="  ❌ ${label}: ${result}\n"
    FAIL=$((FAIL+1))
  fi
}

# --- Audio ---
CHAPTER_DIR="${PROJECT}/chapters/${CHAPTER}"
AUDIO_DIR="${CHAPTER_DIR}/${CHAPTER} 音檔"
AUDIO_ORIG=$(ls "${AUDIO_DIR}/"*.wav "${AUDIO_DIR}/"*.mp3 "${AUDIO_DIR}/"*.mp4 "${AUDIO_DIR}/"*.mov 2>/dev/null | grep -v "\-normalized\." | head -1)
[ -n "$AUDIO_ORIG" ] && check "原始音檔" "ok" || check "原始音檔" "找不到音檔"

# --- VTT ---
VTT_COUNT=$(ls "${AUDIO_DIR}/"*.vtt 2>/dev/null | wc -l | tr -d ' ')
[ "$VTT_COUNT" -gt 0 ] && check "字幕 VTT (${VTT_COUNT} 個)" "ok" || check "字幕 VTT" "找不到 VTT"

# --- scene-map (Scene Dev 完成的依據) ---
SCENE_MAP="${CHAPTER_DIR}/scene-map-${CHAPTER}.json"
[ -f "$SCENE_MAP" ] && check "scene-map.json" "ok" || check "scene-map.json" "找不到（Scene Dev 未完成）"

# --- visual-spec ---
VISUAL_SPEC="${CHAPTER_DIR}/visual-spec-${CHAPTER}.json"
[ -f "$VISUAL_SPEC" ] && check "visual-spec.json" "ok" || check "visual-spec.json" "找不到（Visual Concept 未完成）"

# --- Output MP4 ---
OUT_DIR=$(ls -d "${PROJECT}/out/CH${CHAPTER}-"* 2>/dev/null | head -1)
if [ -n "$OUT_DIR" ]; then
  OUT_MP4=$(ls "${OUT_DIR}/"*.mp4 2>/dev/null | head -1)
  if [ -n "$OUT_MP4" ]; then
    SIZE=$(du -sh "$OUT_MP4" | cut -f1)
    check "Output MP4 (${SIZE})" "ok"
  else
    check "Output MP4" "尚未 render"
  fi
else
  check "Output MP4" "尚未 render"
fi

# --- Summary ---
TOTAL=$((PASS+FAIL))
echo -e "$REPORT"
echo "QA 結果: ${PASS}/${TOTAL} 通過"

MSG="🎬 Vibe Coding CH${CHAPTER} QA Report

$(echo -e "$REPORT")
結果：${PASS}/${TOTAL} 通過

請回覆「通過」開始 render，或「不通過」中止"

# Remove old flag
rm -f "$FLAG_FILE"

# Send iMessage
"$SEND" "$MSG"
echo ""
echo "📱 iMessage QA 報告已發送"
echo "⏳ 等待審核中... (iMessage 或對話中回覆「通過」)"
echo ""
echo "FLAG_FILE=${FLAG_FILE}"
echo "CHAPTER=${CHAPTER}"

# Background polling — writes flag file on approval
(
  "$WAIT" 3600
  if [ $? -eq 0 ]; then
    touch "$FLAG_FILE"
    echo "[QA polling] 通過 → ${FLAG_FILE}"
  fi
) &

POLL_PID=$!
echo "POLL_PID=${POLL_PID}"
echo ""
echo "--- 等待 James 確認 ---"
echo "在對話中說「通過」或用 iMessage 回覆，即可開始 render"

# Wait for flag (set by background polling) or manual trigger
while true; do
  if [ -f "$FLAG_FILE" ]; then
    echo "✅ iMessage 通過 → 開始 render"
    kill $POLL_PID 2>/dev/null || true
    exit 0
  fi
  sleep 5
done
