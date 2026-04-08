#!/bin/bash
# watch-chapters.sh — 監控 chapters/ 資料夾，偵測 START 檔案後自動觸發製作流程
# 由 LaunchAgent 開機自動啟動，持續在背景跑

PROJECT="/Users/jamesshih/Projects/vibe-coding-video"
SCRIPTS="${PROJECT}/scripts"
LOG="/tmp/vibe-watcher.log"

echo "[watcher] 啟動，監控 ${PROJECT}/chapters/" | tee -a "$LOG"

fswatch -0 --event Created "${PROJECT}/chapters/" | while IFS= read -r -d '' event; do
  filename=$(basename "$event")
  if [[ "$filename" == "START" ]]; then
    chapter_dir=$(dirname "$event")
    chapter_id=$(basename "$chapter_dir")
    echo "[watcher] 偵測到 START → ${chapter_id}" | tee -a "$LOG"
    bash "${SCRIPTS}/start-chapter.sh" "$chapter_id" >> "/tmp/vibe-ch${chapter_id}.log" 2>&1 &
  fi
done
