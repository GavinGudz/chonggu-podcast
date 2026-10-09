#!/bin/zsh
# The current film (v4: page/v5.html + mix_v5.py): events -> mix -> render -> mux -> covers -> checks.
# FPS=30 ./build.sh for a quicker pass.  The v3 pipeline (page/index.html + mix.py) is in git history.
set -e
cd "$(dirname "$0")"
FPS=${FPS:-60}
OUT="out/重估_稳定_9比16.mp4"
MASTER="out/重估_稳定_9比16_母版.mp4"
node render.mjs --page v5.html --events data/events_v5.json --w 1080 --h 1920 | grep -v "Failed to load resource"
../.venv/bin/python mix_v5.py
node render.mjs --page v5.html --out out/video.mp4 --w 1080 --h 1920 --fps $FPS --workers ${WORKERS:-8} | grep -v "Failed to load resource"
ffmpeg -v error -y -i out/video.mp4 -i audio/v5_final.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "$MASTER"
# the upload copy is capped at 12 Mbps
ffmpeg -v error -y -i "$MASTER" -c:v libx264 -preset medium -crf 20 -maxrate 12M -bufsize 24M -pix_fmt yuv420p -c:a copy -movflags +faststart "$OUT"
rm -f out/video.mp4
node render.mjs --page v5.html --cover out/封面_9比16.png --w 1080 --h 1920 | grep -v "Failed to load resource"
ffmpeg -v error -y -i out/封面_9比16.png -vf "crop=1080:1440:0:120" out/封面_3比4.png
ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate -of compact "$OUT"
ffmpeg -hide_banner -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):" | tail -2
