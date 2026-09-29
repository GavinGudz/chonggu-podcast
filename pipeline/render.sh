#!/usr/bin/env bash
# 第 3 步：渲染成片 → out/重估_第2期_完整版_紧凑_配图.mp4
set -euo pipefail
cd "$(dirname "$0")"
FF=$(python3 -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')
mkdir -p out
CARD_INPUTS=()
while read -r name dur; do
  CARD_INPUTS+=(-loop 1 -framerate 60 -t "$dur" -i "cards/$name.png")
done < <(python3 -c 'import json; [print(n, d) for n, d in json.load(open("work/meta.json"))["inputs"]]')

"$FF" -hide_banner -y \
  -i src/intro_src.mp4 -i work/ep_src.mp4 -f f32le -ar 48000 -ac 2 -i work/audio.f32 "${CARD_INPUTS[@]}" \
  -filter_complex_script work/graph.txt -map "[v]" -map 2:a \
  -af "volume=1dB,alimiter=limit=0.84:level=false:attack=5:release=50:latency=1" \
  -c:v libx264 -preset medium -crf 17 -profile:v high -level 4.2 -pix_fmt yuv420p -r 60 -g 120 \
  -bsf:v "h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0" \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 256k -movflags +faststart "out/重估_第2期_完整版_紧凑_配图.mp4"

# 校验：帧数应为 19109，响度约 -14 LUFS，峰值不高于 -1.4 dBFS
echo "frames: $("$FF" -hide_banner -loglevel error -i "out/重估_第2期_完整版_紧凑_配图.mp4" -map 0:v -c copy -f framecrc - | grep -vc '^#')"
"$FF" -hide_banner -i "out/重估_第2期_完整版_紧凑_配图.mp4" -vn -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I|Peak):'
