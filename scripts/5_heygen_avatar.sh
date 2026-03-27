#!/bin/bash
# 5_heygen_avatar.sh — Generate HeyGen avatar videos for each audio segment
# Usage: ./scripts/5_heygen_avatar.sh
# Output: public/avatar/0-1_*.mp4
# Skips: 0-1_1.1_studio.wav (not a main segment)

API_KEY="sk_V2_hgu_kOpeOPBUrEi_NjJol24TnpQ5yhqhud1yjsoW1mRTIWzd"
AVATAR_ID="f7af57d29abd4254a1e43441ec16ce40"
AUDIO_DIR="/Users/jamesshih/Projects/vibe-coding-video/public/audio"
OUT_DIR="/Users/jamesshih/Projects/vibe-coding-video/public/avatar"
SKIP_FILES=("0-1_1.1_studio.wav")

mkdir -p "$OUT_DIR"

echo "=== Generating HeyGen avatar videos ==="
echo ""

for wav in "$AUDIO_DIR"/0-1_*.wav; do
  base=$(basename "$wav" .wav)
  out="$OUT_DIR/${base}.mp4"

  # Skip non-segment files
  skip=0
  for s in "${SKIP_FILES[@]}"; do [[ "$(basename "$wav")" == "$s" ]] && skip=1 && break; done
  if [ $skip -eq 1 ]; then echo "  [skip]  $base (not a segment)"; continue; fi

  # Skip if real video already exists (>100KB means it's not a placeholder)
  if [ -f "$out" ] && [ "$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")" -gt 102400 ]; then
    echo "  [skip]  $base (already generated)"
    continue
  fi

  echo "  [upload] $base ..."

  # Upload audio — must use upload.heygen.com with audio/x-wav
  UPLOAD_RESP=$(curl -s -X POST "https://upload.heygen.com/v1/asset" \
    -H "X-Api-Key: $API_KEY" \
    -H "Content-Type: audio/x-wav" \
    --data-binary "@$wav")

  AUDIO_URL=$(echo "$UPLOAD_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('url',''))" 2>/dev/null)

  if [ -z "$AUDIO_URL" ]; then
    echo "  [error] Upload failed for $base: $UPLOAD_RESP"
    continue
  fi

  echo "  [generate] $base ..."

  GEN_RESP=$(curl -s -X POST "https://api.heygen.com/v2/video/generate" \
    -H "X-Api-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"video_inputs\": [{
        \"character\": {
          \"type\": \"avatar\",
          \"avatar_id\": \"$AVATAR_ID\",
          \"avatar_style\": \"normal\"
        },
        \"voice\": {
          \"type\": \"audio\",
          \"audio_url\": \"$AUDIO_URL\"
        },
        \"background\": {
          \"type\": \"color\",
          \"value\": \"#000000\"
        }
      }],
      \"dimension\": { \"width\": 400, \"height\": 400 }
    }")

  VIDEO_ID=$(echo "$GEN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('video_id',''))" 2>/dev/null)

  if [ -z "$VIDEO_ID" ]; then
    echo "  [error] Generation failed for $base: $GEN_RESP"
    continue
  fi

  echo "  [waiting] $base (video_id=$VIDEO_ID) ..."

  while true; do
    STATUS_RESP=$(curl -s "https://api.heygen.com/v1/video_status.get?video_id=$VIDEO_ID" \
      -H "X-Api-Key: $API_KEY")

    STATUS=$(echo "$STATUS_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('status',''))" 2>/dev/null)

    if [ "$STATUS" = "completed" ]; then
      VIDEO_URL=$(echo "$STATUS_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('video_url',''))" 2>/dev/null)
      curl -s -L "$VIDEO_URL" -o "$out"
      SIZE=$(du -sh "$out" | cut -f1)
      echo "  [done]   $base → $SIZE"
      break
    elif [ "$STATUS" = "failed" ]; then
      echo "  [error]  Video generation failed for $base"
      break
    else
      echo "           $base: $STATUS, waiting 20s..."
      sleep 20
    fi
  done
done

echo ""
echo "=== Done. Run ./scripts/4_render.sh to re-render with real avatar. ==="
