#!/bin/bash
# watch-drive-intake.sh — 定時 poll Google Drive vibe-coding-intake，
# 偵測 READY 檔案後 sync 到本機並觸發 start-chapter.sh
# 每 120 秒 poll 一次；由 LaunchAgent 常駐執行

INTAKE_ID="1XdvF9lI_Rcklr4KxvKpDNAC4L6QiwHnz"
PROJECT="/Users/jamesshih/Projects/vibe-coding-video"
SCRIPTS="${PROJECT}/scripts"
SEND="$HOME/.claude/scripts/imessage_send.sh"

echo "[intake-watch] 啟動 $(date)"

while true; do
  # 列出 intake 根目錄下所有子資料夾（每個代表一個章節）
  chapters=$(rclone lsf "gdrive:" \
    --drive-root-folder-id "$INTAKE_ID" \
    --dirs-only 2>/dev/null | sed 's|/$||')

  for ch in $chapters; do
    lock="/tmp/vibe-lock-${ch}"
    local_dir="${PROJECT}/chapters/${ch}"

    # 已在製作中則略過
    [ -f "$lock" ] && continue

    # 檢查 Drive 子資料夾內是否有 READY 檔案
    has_ready=$(rclone lsf "gdrive:${ch}" \
      --drive-root-folder-id "$INTAKE_ID" \
      --files-only 2>/dev/null | grep -c "^READY$" || echo 0)
    [ "$has_ready" -eq 0 ] && continue

    echo "[intake-watch] 偵測到 CH${ch} READY，開始 sync..."
    "$SEND" "📥 CH${ch} 素材上傳完成，同步中..."

    # Sync Drive 資料夾 → 本機 chapters/{ch}/
    mkdir -p "$local_dir"
    rclone sync "gdrive:${ch}" "$local_dir" \
      --drive-root-folder-id "$INTAKE_ID" \
      --progress 2>&1 | tail -3

    echo "[intake-watch] ✅ CH${ch} sync 完成"

    # 刪除 Drive 上的 READY，避免下次 poll 重複觸發
    rclone deletefile "gdrive:${ch}/READY" \
      --drive-root-folder-id "$INTAKE_ID" 2>/dev/null

    # 觸發製作流程（背景執行，log 存 /tmp/vibe-ch{N}.log）
    bash "${SCRIPTS}/start-chapter.sh" "$ch" \
      >> "/tmp/vibe-ch${ch}.log" 2>&1 &

    echo "[intake-watch] ✅ CH${ch} 製作流程已啟動 (PID $!)"
  done

  sleep 120
done
