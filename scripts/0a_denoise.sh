#!/bin/bash
# 0a_denoise.sh — Remove background noise from speaker WAV files
#
# Usage:  ./scripts/0a_denoise.sh
# Order:  0a_denoise.sh → 0b_trim_silence.sh → 0_normalize_audio.sh
#
# Filters applied (in order):
#   highpass=f=80    — remove low-frequency rumble (AC, ventilation)
#   afftdn=nf=-25    — adaptive FFT denoiser, noise floor at -25dB
#   lowpass=f=12000  — remove high-frequency hiss above 12kHz
#
# Why before normalization:
#   loudnorm amplifies everything including background noise.
#   Denoising first ensures the noise floor stays low after gain is applied.

set -e

PUBLIC_AUDIO="/Users/jamesshih/Projects/vibe-coding-video/public/audio"
SKIP_FILES=("course_background_music.wav" "intro-stinger.wav")

echo "=== Denoising speaker audio ==="
echo ""

for wav in "${PUBLIC_AUDIO}"/*.wav; do
  base=$(basename "$wav")

  skip=0
  for s in "${SKIP_FILES[@]}"; do [[ "$base" == "$s" ]] && skip=1 && break; done
  if [ $skip -eq 1 ]; then echo "  [skip]  ${base}"; continue; fi

  tmp="${wav}.denoise.tmp.wav"

  ffmpeg -y -i "$wav" \
    -af "highpass=f=80,afftdn=nf=-25,lowpass=f=12000" \
    "$tmp" 2>/dev/null

  mv "$tmp" "$wav"
  echo "  [done]  ${base}"
done

echo ""
echo "Done. Run ./scripts/0b_trim_silence.sh next."
