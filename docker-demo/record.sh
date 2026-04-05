#!/bin/bash
# Container entrypoint: Xvfb + fluxbox + ffmpeg screen recording + demo
set -e

DISPLAY_NUM=99
DISPLAY=":${DISPLAY_NUM}"
SCREEN_W=1280
SCREEN_H=800
OUTPUT_DIR="${OUTPUT_DIR:-/output}"

mkdir -p "$OUTPUT_DIR"

echo "[record.sh] Starting Xvfb on display ${DISPLAY} (${SCREEN_W}x${SCREEN_H})..."
Xvfb "${DISPLAY}" -screen 0 "${SCREEN_W}x${SCREEN_H}x24" -ac +extension GLX +render -noreset &
XVFB_PID=$!
sleep 1

export DISPLAY

echo "[record.sh] Starting fluxbox..."
fluxbox -display "${DISPLAY}" 2>/dev/null &
FLUXBOX_PID=$!
sleep 0.5
# Dismiss fluxbox wallpaper error dialog before recording starts
DISPLAY="${DISPLAY}" xdotool search --onlyvisible --name "xmessage" key Return 2>/dev/null || true
sleep 0.5

echo "[record.sh] Starting ffmpeg (${SCREEN_W}x${SCREEN_H} @ 30fps) -> ${OUTPUT_DIR}/screen-recording.mp4"
ffmpeg -y \
    -f x11grab \
    -video_size "${SCREEN_W}x${SCREEN_H}" \
    -framerate 30 \
    -i "${DISPLAY}.0" \
    -c:v libx264 \
    -preset ultrafast \
    -pix_fmt yuv420p \
    "${OUTPUT_DIR}/screen-recording.mp4" \
    2>"${OUTPUT_DIR}/ffmpeg.log" &
FFMPEG_PID=$!
sleep 1

echo "[record.sh] Running demo..."
/demo/demo.sh 2>&1 | tee "${OUTPUT_DIR}/demo.log"

echo "[record.sh] Demo finished. Stopping ffmpeg..."
kill $FFMPEG_PID 2>/dev/null || true
wait $FFMPEG_PID 2>/dev/null || true

kill $FLUXBOX_PID 2>/dev/null || true
kill $XVFB_PID 2>/dev/null || true

echo "[record.sh] Output files:"
ls -lh "${OUTPUT_DIR}/"
