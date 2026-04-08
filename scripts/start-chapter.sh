#!/bin/bash
# start-chapter.sh — 驗證章節素材完整後，以背景 Director 身份執行完整製作流程
# Usage: start-chapter.sh <chapter-id>  e.g. 1-2

set -e

CHAPTER="${1:?Usage: $0 <chapter-id>  e.g. 1-2}"
PROJECT="/Users/jamesshih/Projects/vibe-coding-video"
CHAPTER_DIR="${PROJECT}/chapters/${CHAPTER}"
SCRIPTS="${PROJECT}/scripts"
LOCK="/tmp/vibe-lock-${CHAPTER}"
SEND="$HOME/.claude/scripts/imessage_send.sh"
WAIT="$HOME/.claude/scripts/imessage_wait_approval.sh"

# ── 防止重複觸發 ──────────────────────────────────────────
if [ -f "$LOCK" ]; then
  echo "[start] ⚠️  CH${CHAPTER} 已在製作中（lock 存在），略過"
  exit 0
fi
touch "$LOCK"

echo "[start] ── CH${CHAPTER} 製作開始 $(date) ──"

# ── 驗證素材 ─────────────────────────────────────────────
ERRORS=0
[ -f "${CHAPTER_DIR}/章節${CHAPTER}_逐字講稿.txt" ] || { echo "❌ 找不到逐字講稿"; ERRORS=1; }
ls "${CHAPTER_DIR}/${CHAPTER} 音檔/"*.wav >/dev/null 2>&1 || { echo "❌ 找不到音檔"; ERRORS=1; }
ls "${CHAPTER_DIR}/${CHAPTER} 音檔/"*.vtt >/dev/null 2>&1 || { echo "❌ 找不到 VTT"; ERRORS=1; }

if [ $ERRORS -ne 0 ]; then
  "$SEND" "❌ CH${CHAPTER} 素材不完整，製作中止。請檢查逐字稿、音檔、VTT。"
  rm -f "$LOCK"
  exit 1
fi

"$SEND" "🎬 CH${CHAPTER} 製作開始，後台執行中..."
echo "[start] ✅ 素材驗證通過，開始執行 pipeline"

cd "$PROJECT"

# ═══════════════════════════════════════════════════════════
# Phase 1 — Audio Agent（只剪開頭空白）
# ═══════════════════════════════════════════════════════════
echo "[Phase 1] Audio 處理..."
claude --dangerously-skip-permissions -p "
你是 Audio Agent。讀 .agents/rules/pipeline.md Phase 1 規則。
對 chapters/${CHAPTER}/${CHAPTER}\ 音檔/ 下所有 .wav 檔執行 silenceremove（只剪開頭空白，不做其他處理）。
輸出為 *-normalized.wav，存回同一資料夾。
完成後輸出「DONE」。
"

# ═══════════════════════════════════════════════════════════
# Phase 1 — Script Agent（列出所有備注區塊）
# ═══════════════════════════════════════════════════════════
echo "[Phase 1] Script Agent 分析..."
claude --dangerously-skip-permissions -p "
你是 Script Agent。讀 chapters/${CHAPTER}/章節${CHAPTER}_逐字講稿.txt。
列出所有 **備注** 區塊（使用相關素材 + 呈現方式），輸出為 chapters/${CHAPTER}/script-analysis-${CHAPTER}.json。
格式：{ \"segments\": [ { \"seg\": \"1.1\", \"assets\": [], \"presentation\": \"\" } ] }
完成後輸出「DONE」。
"

# ═══════════════════════════════════════════════════════════
# Phase 2 — Visual Concept Agent
# ═══════════════════════════════════════════════════════════
echo "[Phase 2] Visual Concept..."
claude --dangerously-skip-permissions -p "
你是 Visual Concept Agent。讀 .agents/rules/pipeline.md Phase 2 規格。
讀 chapters/${CHAPTER}/章節${CHAPTER}_逐字講稿.txt 和 chapters/${CHAPTER}/script-analysis-${CHAPTER}.json。
輸出 chapters/${CHAPTER}/visual-spec-${CHAPTER}.json。
完成後輸出「DONE」。
"

# ═══════════════════════════════════════════════════════════
# Phase 3 — VTT 校正
# ═══════════════════════════════════════════════════════════
echo "[Phase 3] VTT 校正..."
claude --dangerously-skip-permissions -p "
你是 VTT Agent。讀 chapters/${CHAPTER}/${CHAPTER}\ 音檔/ 下所有 .vtt 檔。
對照 chapters/${CHAPTER}/章節${CHAPTER}_逐字講稿.txt 校正（繁簡字、的/得/地、專有名詞）。
直接修改原 .vtt 檔案。完成後輸出「DONE」。
"

# ═══════════════════════════════════════════════════════════
# Phase 4 — Scene Dev（TSX + scene-map）
# ═══════════════════════════════════════════════════════════
echo "[Phase 4] Scene Dev..."
claude --dangerously-skip-permissions -p "
你是 Scene Dev Agent。讀 .agents/rules/pipeline.md Phase 4 規格。
讀 chapters/${CHAPTER}/visual-spec-${CHAPTER}.json + VTT + 逐字講稿，實作 TSX。
同時輸出 chapters/${CHAPTER}/scene-map-${CHAPTER}.json（HTML Agent 的比對依據）。
所有幀號來自 VTT（global_frame = seconds × 30）。
完成後輸出「DONE」。
"

# ═══════════════════════════════════════════════════════════
# Phase 5 — QA → 通知 James 預覽 → 等待核准
# ═══════════════════════════════════════════════════════════
echo "[Phase 5] 啟動 Remotion dev server..."
npm run dev &
DEV_PID=$!

# 等待 dev server 就緒
sleep 8
echo "[Phase 5] Dev server PID: ${DEV_PID}"

# QA（自動修復直到通過）
bash "${SCRIPTS}/qa_and_wait.sh" "$CHAPTER"
QA_EXIT=$?

if [ $QA_EXIT -ne 0 ]; then
  "$SEND" "❌ CH${CHAPTER} QA 未通過，製作中止。請查看 /tmp/vibe-ch${CHAPTER}.log"
  kill $DEV_PID 2>/dev/null
  rm -f "$LOCK"
  exit 1
fi

# QA 通過 → 通知 James 預覽
"$SEND" "✅ CH${CHAPTER} QA 全過，請開瀏覽器預覽後回覆「通過」開始 render"
open "http://localhost:3000"

echo "[Phase 5] 等待 James 核准..."
"$WAIT" 7200  # 等最多 2 小時
APPROVE_EXIT=$?

kill $DEV_PID 2>/dev/null

if [ $APPROVE_EXIT -ne 0 ]; then
  "$SEND" "⏰ CH${CHAPTER} 等待逾時，製作中止"
  rm -f "$LOCK"
  exit 1
fi

echo "[Phase 5] ✅ James 核准，開始 render"

# ═══════════════════════════════════════════════════════════
# Phase 6 — Render + Post-render
# ═══════════════════════════════════════════════════════════
bash "${SCRIPTS}/post-render.sh" "$CHAPTER"

# 清理
rm -f "$LOCK"
rm -f "${CHAPTER_DIR}/START"
echo "[start] ── CH${CHAPTER} 全部完成 $(date) ──"
