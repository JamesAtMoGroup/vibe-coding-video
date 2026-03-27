#!/bin/bash
# 1_transcribe.sh — Run Whisper VTT on all WAV files in a chapter directory
#
# Usage:
#   ./scripts/1_transcribe.sh "0-1"
#   ./scripts/1_transcribe.sh "0-2"
#
# What it does:
#   1. Runs Whisper (small model, zh) on every .wav that doesn't already have a .vtt
#   2. Copies all audio files to public/audio/
#
# Skip already-done files — safe to re-run

set -e

CHAPTER="${1:?Usage: $0 <chapter-id>  e.g. 0-1}"
AUDIO_DIR="/Users/jamesshih/Downloads/Vibe Coding 剪輯/${CHAPTER}/${CHAPTER} 音檔"
PUBLIC_AUDIO="/Users/jamesshih/Projects/vibe-coding-video/public/audio"
WHISPER="/Users/jamesshih/Library/Python/3.9/bin/whisper"

echo "=== Transcribing: ${CHAPTER} ==="
echo "Audio dir: ${AUDIO_DIR}"

for wav in "${AUDIO_DIR}"/*.wav; do
  base=$(basename "$wav" .wav)
  vtt="${AUDIO_DIR}/${base}.vtt"

  if [ -f "$vtt" ]; then
    echo "  [skip] ${base}.vtt already exists"
  else
    echo "  [transcribe] ${base}.wav ..."
    "$WHISPER" "$wav" \
      --language zh \
      --model small \
      --output_format vtt \
      --output_dir "${AUDIO_DIR}"
  fi
done

echo ""
echo "=== Copying audio to public/audio/ ==="
mkdir -p "${PUBLIC_AUDIO}"
for wav in "${AUDIO_DIR}"/*.wav; do
  base=$(basename "$wav")
  if [ -f "${PUBLIC_AUDIO}/${base}" ]; then
    echo "  [skip] ${base} already in public/audio/"
  else
    cp "$wav" "${PUBLIC_AUDIO}/"
    echo "  [copy] ${base}"
  fi
done

echo ""
echo "Done. VTTs are in: ${AUDIO_DIR}"
echo "Next step: run ./scripts/2_correct_vtts.sh ${CHAPTER}"
