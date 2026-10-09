#!/bin/zsh
# ./sheet.sh name t1,t2,...   -> out/sheet_name.jpg (stills tiled 6 across, time stamped)
name=$1; times=$2; cols=${3:-6}
dir=out/stills_$name; rm -rf $dir
node render.mjs --stills $times --dir $dir --w 1080 --h 1920 ${PAGE:+--page} ${PAGE} | grep -v "^scenes" | grep -iE "error|missing|pageerror" 
n=$(ls $dir/*.jpg | wc -l | tr -d ' ')
rows=$(( (n + cols - 1) / cols ))
ffmpeg -v error -y -pattern_type glob -i "$dir/s_*.jpg" -vf "scale=300:-1,drawtext=text='%{metadata\:lavf.image2dec.source_basename}':fontcolor=white:fontsize=14:x=6:y=6,tile=${cols}x${rows}:padding=4:color=gray" -frames:v 1 out/sheet_$name.jpg 2>/dev/null || \
ffmpeg -v error -y -pattern_type glob -i "$dir/s_*.jpg" -vf "scale=300:-1,tile=${cols}x${rows}:padding=4:color=gray" -frames:v 1 out/sheet_$name.jpg
echo out/sheet_$name.jpg
