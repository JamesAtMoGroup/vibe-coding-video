#!/bin/bash
# 2_correct_vtts.sh — Fix known brand names and common Whisper errors in VTT files
#
# Usage:
#   ./scripts/2_correct_vtts.sh "0-1"
#
# What it does:
#   Applies sed replacements for known misrecognitions across all VTTs in the chapter.
#   Does NOT fix nuanced errors — those still need an agent to compare against the script.
#
# After running this, have an agent do the nuanced review.

set -e

CHAPTER="${1:?Usage: $0 <chapter-id>  e.g. 0-1}"
AUDIO_DIR="/Users/jamesshih/Downloads/Vibe Coding 剪輯/${CHAPTER}/${CHAPTER} 音檔"

echo "=== Correcting VTTs: ${CHAPTER} ==="

for vtt in "${AUDIO_DIR}"/*.vtt; do
  echo "  [fix] $(basename "$vtt")"
  sed -i '' \
    -e 's/Vive Coding/Vibe Coding/g' \
    -e 's/Vycoding/Vibe Coding/g' \
    -e 's/Eli View/Vibe/g' \
    -e 's/vive coding/Vibe Coding/g' \
    -e 's/live coding/Vibe Coding/g' \
    -e 's/AI Coding/AI Coding/g' \
    -e 's/寫成是/寫程式/g' \
    -e 's/寫助產生/協助產生/g' \
    -e 's/徒法煉缸/土法煉鋼/g' \
    -e 's/土法煉缸/土法煉鋼/g' \
    -e 's/假方/甲方/g' \
    -e 's/以方/乙方/g' \
    -e 's/コーディング/Coding/g' \
    "$vtt"
done

echo ""
echo "Done. Known brand names corrected."
echo "Next step: have an agent do nuanced review against 逐字講稿.docx"
echo "Then run: ./scripts/3_calc_frames.sh ${CHAPTER}"
