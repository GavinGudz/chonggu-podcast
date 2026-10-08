#!/bin/zsh
# events -> mix -> render -> mux -> checks.  FPS=30 ./build.sh for a quicker pass.
set -e
cd "$(dirname "$0")"
FPS=${FPS:-60}
OUT="out/重估_稳定_9比16.mp4"
node render.mjs --events data/events.json --w 1080 --h 1920 | grep -v "Failed to load resource"
../.venv/bin/python mix.py
node render.mjs --out out/video.mp4 --w 1080 --h 1920 --fps $FPS --workers ${WORKERS:-8} | grep -v "Failed to load resource"
ffmpeg -v error -y -i out/video.mp4 -i audio/final.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "$OUT"
node render.mjs --cover out/封面_9比16.png --w 1080 --h 1920 | grep -v "Failed to load resource"
ffmpeg -v error -y -i out/封面_9比16.png -vf "crop=1080:1440:0:120" out/封面_3比4.png
ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate -of compact "$OUT"
ffmpeg -hide_banner -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):" | tail -2
