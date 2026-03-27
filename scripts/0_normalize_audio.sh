#!/bin/bash
# 0_normalize_audio.sh — Normalize all speaker WAV files to -16 LUFS (EBU R128)
#
# Usage:
#   ./scripts/0_normalize_audio.sh
#
# What it does:
#   - Normalizes every speaker WAV in public/audio/ to -16 LUFS in-place
#   - Skips: course_background_music.wav, intro-stinger.wav (music files, not speaker)
#   - Run this BEFORE rendering whenever new audio is added
#
# Why -16 LUFS:
#   Industry standard for online course / YouTube content.
#   Ensures all segments recorded at different volumes sound consistent.
#
# Safe to re-run — normalizing an already-normalized file won't degrade quality
# because loudnorm is a linear gain adjustment at -16 LUFS.

set -e

PUBLIC_AUDIO="/Users/jamesshih/Projects/vibe-coding-video/public/audio"

SKIP_FILES=("course_background_music.wav" "intro-stinger.wav")

echo "=== Normalizing speaker audio to -16 LUFS ==="
echo ""

for wav in "${PUBLIC_AUDIO}"/*.wav; do
  base=$(basename "$wav")

  # Skip music/stinger files
  skip=0
  for s in "${SKIP_FILES[@]}"; do
    [[ "$base" == "$s" ]] && skip=1 && break
  done
  if [ $skip -eq 1 ]; then
    echo "  [skip]  ${base}"
    continue
  fi

  echo "  [norm]  ${base} ..."
  tmp="${wav}.norm.tmp.wav"

  ffmpeg -y -i "$wav" \
    -af "loudnorm=I=-16:LRA=11:TP=-1.5:print_format=summary" \
    "$tmp" 2>/dev/null

  mv "$tmp" "$wav"
  echo "          → done"
done

echo ""
echo "All speaker files normalized to -16 LUFS."
echo "Next step: ./scripts/4_render.sh FullVideo 0-1"
