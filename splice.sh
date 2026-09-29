#!/bin/zsh
# 片头 + 正片 拼成一个视频。
#   用法: splice.sh <ffmpeg> <片头.mp4> <正片.mp4> <输出.mp4>
#
# 片头 1280x720 30fps → 放大到 1920x1080 60fps 以匹配正片；片头音效 +4 dB 与正片音效音量一致。
# 正片视频首帧比音频晚 1008 个采样（0.021s），裁掉这段音频以保持原有音画对齐。
set -euo pipefail

FF=$1; INTRO=$2; EP=$3; OUT=$4

"$FF" -hide_banner -y -i "$INTRO" -i "$EP" -filter_complex "
[0:v]scale=1920:1080:flags=lanczos:in_color_matrix=bt709:out_color_matrix=bt709:in_range=tv:out_range=tv,unsharp=5:5:0.6:5:5:0,fps=60,tpad=stop_mode=clone:stop=10,trim=end_frame=700,setpts=PTS-STARTPTS,setsar=1,format=yuv420p[v0];
[0:a]aresample=48000,volume=4dB,apad=whole_len=560000,atrim=end_sample=560000,asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=11.6567:d=0.01[a0];
[1:v]setpts=PTS-STARTPTS[v1];
[1:a]atrim=start_sample=1008,asetpts=PTS-STARTPTS,afade=t=in:d=0.01[a1];
[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -crf 17 -profile:v high -level 4.2 -pix_fmt yuv420p -r 60 -g 120 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac_at -b:a 256k -ar 48000 -ac 2 -movflags +faststart "$OUT"
