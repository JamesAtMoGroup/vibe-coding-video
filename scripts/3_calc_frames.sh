#!/bin/bash
# 3_calc_frames.sh — Calculate durationInFrames for every WAV in a chapter
#
# Usage:
#   ./scripts/3_calc_frames.sh "0-1"
#
# Output: prints a ready-to-paste SEGMENTS array for FullVideo.tsx
# Formula: durationInFrames = Math.ceil(durationSec * 30) + 10

set -e

CHAPTER="${1:?Usage: $0 <chapter-id>  e.g. 0-1}"
AUDIO_DIR="/Users/jamesshih/Downloads/Vibe Coding 剪輯/${CHAPTER}/${CHAPTER} 音檔"
FPS=30
PADDING=10

echo "=== Frame counts: ${CHAPTER} ==="
echo ""
echo "// Paste into FullVideo.tsx SEGMENTS array:"
echo "const SEGMENTS = ["

total=0
for wav in $(ls "${AUDIO_DIR}"/*.wav | sort); do
  base=$(basename "$wav" .wav)
  duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$wav" 2>/dev/null)
  frames=$(python3 -c "import math; print(math.ceil(float('${duration}') * ${FPS}) + ${PADDING})")
  echo "  { id: \"${base#${CHAPTER}_}\", file: \"${base}.wav\", frames: ${frames} }, // ${duration}s"
  total=$((total + frames))
done

echo "] as const;"
echo ""
echo "// Total frames: ${total} (~$(python3 -c "print(round(${total}/30/60, 1))")min)"
