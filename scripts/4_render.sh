#!/bin/bash
# 4_render.sh — Render a Remotion composition to file
#
# Usage:
#   ./scripts/4_render.sh Video30s          # 30s sample
#   ./scripts/4_render.sh FullVideo 0-1     # full chapter video
#   ./scripts/4_render.sh FullVideo 0-2     # another chapter
#
# Output goes to ~/Downloads/Vibe Coding 剪輯/

set -e

COMPOSITION="${1:?Usage: $0 <CompositionId> [chapter]}"
CHAPTER="${2:-}"
PROJECT="/Users/jamesshih/Projects/vibe-coding-video"
OUTPUT_DIR="/Users/jamesshih/Downloads/Vibe Coding 剪輯"

if [ "$COMPOSITION" = "Video30s" ]; then
  OUTPUT="${OUTPUT_DIR}/sample-30s.mp4"
elif [ -n "$CHAPTER" ]; then
  OUTPUT="${OUTPUT_DIR}/CH${CHAPTER}-complete.mp4"
else
  OUTPUT="${OUTPUT_DIR}/${COMPOSITION}.mp4"
fi

echo "=== Rendering: ${COMPOSITION} ==="
echo "Output: ${OUTPUT}"
echo ""

cd "$PROJECT"
npx remotion render src/index.ts "${COMPOSITION}" "${OUTPUT}" \
  --codec=h264 \
  --overwrite

echo ""
echo "Done: ${OUTPUT}"
echo "Size: $(du -sh "${OUTPUT}" | cut -f1)"
