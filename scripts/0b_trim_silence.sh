#!/bin/bash
# 0b_trim_silence.sh — Trim ONLY leading/trailing silence from speaker WAVs
#
# Uses silencedetect to find speech start/end, then atrim —
# safe for files with internal pauses (does NOT cut mid-speech silence).
#
# Usage:  ./scripts/0b_trim_silence.sh
# Order:  0b_trim_silence.sh → 0_normalize_audio.sh → 1_transcribe.sh …

set -e

PUBLIC_AUDIO="/Users/jamesshih/Projects/vibe-coding-video/public/audio"
SKIP_FILES=("course_background_music.wav" "intro-stinger.wav")
THRESHOLD="-45dB"
MIN_SILENCE="0.3"   # seconds — gaps shorter than this are NOT considered silence

echo "=== Trimming leading/trailing silence from speaker audio ==="
echo ""

for wav in "${PUBLIC_AUDIO}"/*.wav; do
  base=$(basename "$wav")

  skip=0
  for s in "${SKIP_FILES[@]}"; do [[ "$base" == "$s" ]] && skip=1 && break; done
  if [ $skip -eq 1 ]; then echo "  [skip]  ${base}"; continue; fi

  total=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$wav")

  # --- detect silence start/end ---
  DETECT=$(ffmpeg -i "$wav" -af "silencedetect=noise=${THRESHOLD}:d=${MIN_SILENCE}" -f null - 2>&1)

  # First speech start = end of first silence block (or 0 if no leading silence)
  START=$(echo "$DETECT" | grep "silence_end" | head -1 | sed 's/.*silence_end: //' | awk '{print $1}')
  [ -z "$START" ] && START="0"

  # Last speech end = start of last silence block (or total if no trailing silence)
  END=$(echo "$DETECT" | grep "silence_start" | tail -1 | sed 's/.*silence_start: //' | awk '{print $1}')
  [ -z "$END" ] && END="$total"

  # Clamp: ensure start < end and both within bounds
  START=$(python3 -c "print(max(0, float('${START}') - 0.05))")   # 50ms buffer
  END=$(python3 -c "print(min(float('${total}'), float('${END}') + 0.1))")  # 100ms buffer

  tmp="${wav}.trim.tmp.wav"
  ffmpeg -y -i "$wav" -ss "$START" -to "$END" -c copy "$tmp" 2>/dev/null
  after=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$tmp")

  mv "$tmp" "$wav"
  saved=$(python3 -c "print(round(float('${total}') - float('${after}'), 2))")
  echo "  [trim]  ${base}  ${total}s → ${after}s  (-${saved}s trimmed)"
done

echo ""
echo "Done. Run ./scripts/0_normalize_audio.sh next."
