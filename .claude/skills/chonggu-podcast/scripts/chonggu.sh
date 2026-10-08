#!/bin/bash
# 《重估》制作工作流：一期节目从录音到上传包，每一步一个子命令。
#
#   chonggu.sh new <新文件夹> --ep 5 --topic 财富 --date 2026.10.12 --from <上一期文件夹>
#   cd <新文件夹>，然后按顺序：
#   chonggu.sh transcribe            录音 -> work/transcript.json / .txt（mlx-whisper large-v3）
#   chonggu.sh intro <片头录音>       片头（三句版）-> outputs/$INTRO_BASE.mp4 + .json
#   chonggu.sh plan                  work/make_plans.py -> work/$PLAN（剪辑表，每期由 Claude 照逐字稿写）
#   chonggu.sh cut                   剪辑表 -> edl -> work/$EDIT_DIR/（body.wav、cold.wav、timeline.json、joins.json）
#   chonggu.sh board                 work/sb/ch_*.py -> work/$STORYBOARD
#   chonggu.sh preview <名字> 03 04   某几章的总览图（不出声音）
#   chonggu.sh build                 时间线 -> render/$EP_JS，Tend 记在 work/build_summary.json
#   chonggu.sh mix                   混音 -> work/$EDIT_DIR/final_audio.wav（-14 LUFS；FX=0 不加音乐音效）
#   chonggu.sh render                Chrome 无头渲染 -> work/video.mp4
#   chonggu.sh mux                   视频 + 音频 -> $FINAL
#   chonggu.sh qa                    时长、响度、每 30 秒一帧的总览图 -> outputs/qa_sheet.jpg
#   chonggu.sh cover                 render/cover.html -> outputs/重估_第N期_封面_竖版.png
#   chonggu.sh pack                  outputs/第N期/：成片切成 42 MB 分段 + sha256 + README + 发布简介（给 GitHub output 分支）
#   chonggu.sh all                   cut board build mix render mux qa 一口气跑完
#
# 所有路径、期号、主题都在每期文件夹里的 episode.env；改了画面只需 board build render mux。
set -euo pipefail

SKILL_DIR=$(cd "$(dirname "$0")/.." && pwd)
die() { echo "chonggu: $*" >&2; exit 1; }
say() { printf '\033[1m== %s\033[0m\n' "$*"; }

load_env() {
  [ -f episode.env ] || die "这里没有 episode.env：先 cd 到某一期的文件夹（或用 new 建一个）"
  set -a; source ./episode.env; set +a
  ROOT=$PWD
  PY=${PY:-python3}
  [[ "$PY" = /* ]] || PY="$ROOT/$PY"
  [ -x "$PY" ] || command -v "$PY" >/dev/null || die "找不到 Python：$PY（episode.env 里的 PY）"
}

summary_get() { "$PY" -c "import json,sys;print(json.load(open('$ROOT/work/build_summary.json'))['$1'])"; }

cmd=${1:-help}; shift || true
case "$cmd" in

new)
  dest=${1:-}; shift || true
  [ -n "$dest" ] || die "用法：new <新文件夹> --ep N --topic 主题 --date YYYY.MM.DD --from <上一期文件夹>"
  EP= TOPIC= DATE= FROM=
  while [ $# -gt 0 ]; do
    case "$1" in
      --ep) EP=$2; shift 2 ;; --topic) TOPIC=$2; shift 2 ;; --date) DATE=$2; shift 2 ;; --from) FROM=$2; shift 2 ;;
      *) die "不认识的参数 $1" ;;
    esac
  done
  [ -n "$EP" ] && [ -n "$TOPIC" ] && [ -n "$FROM" ] || die "--ep、--topic、--from 都要给"
  [ -d "$FROM/work" ] && [ -d "$FROM/render" ] || die "$FROM 不像一期节目的文件夹（要有 work/ 和 render/）"
  [ -e "$dest" ] && die "$dest 已经存在，不覆盖"
  FROM=$(cd "$FROM" && pwd)
  mkdir -p "$dest"/{work/sb,render/photos,render/news,outputs,extras}
  dest=$(cd "$dest" && pwd)
  say "从 $FROM 复制通用部分"
  for f in engine.js render.mjs cover.mjs news_shot.mjs index.html style.css package.json dark_34.png paper_34.png dark_plate.png paper_plate.png; do
    [ -e "$FROM/render/$f" ] && cp "$FROM/render/$f" "$dest/render/"
  done
  if [ -d "$FROM/render/node_modules" ]; then cp -R "$FROM/render/node_modules" "$dest/render/"; fi
  for f in plan_to_edl.py assemble2.py sb_head.py sb_build.py build_ep.py mix.py score_fx.py preview.sh; do
    [ -e "$FROM/work/$f" ] && cp "$FROM/work/$f" "$dest/work/"
  done
  cp "$SKILL_DIR/templates/transcribe.py" "$dest/work/transcribe.py"
  if [ -d "$FROM/extras/chonggu_intro" ]; then cp -R "$FROM/extras/chonggu_intro" "$dest/extras/"
  elif [ -d "$HOME/Documents/Codex/2026-09-28/wu-du/chonggu_intro" ]; then cp -R "$HOME/Documents/Codex/2026-09-28/wu-du/chonggu_intro" "$dest/extras/"
  else echo "  注意：没找到片头生成器 chonggu_intro，intro 和 mix 会用不了"; fi
  rm -rf "$dest/extras/chonggu_intro/__pycache__" "$dest"/extras/chonggu_intro/*.bak-*
  # preview.sh 写死了上一期的 EDIT_DIR / INTRO_BASE：改成读 episode.env
  if [ -f "$dest/work/preview.sh" ]; then
    sed -i '' -E 's/^NO_AUDIO=1 EDIT_DIR=[^ ]+ INTRO_BASE="[^"]*"/NO_AUDIO=1 EDIT_DIR=${EDIT_DIR:-edit} INTRO_BASE="${INTRO_BASE}"/' "$dest/work/preview.sh"
    sed -i '' 's|^cd "$(dirname "$0")"$|cd "$(dirname "$0")"\n[ -f ../episode.env ] \&\& { set -a; source ../episode.env; set +a; }|' "$dest/work/preview.sh"
    # 系统自带的 python3 没有 numpy/scipy：用 episode.env 里的 PY
    sed -i '' -E 's/^python3 /"${PY:-python3}" /; s/ python3 build_ep\.py/ "${PY:-python3}" build_ep.py/' "$dest/work/preview.sh"
  fi
  # sb_head.py 的照片辅助函数写死了上一期的前缀（ep4_credits.json、photos/ep4_xxx.jpg）：换成本期，并放一个空的来源表
  if [ -f "$dest/work/sb_head.py" ]; then
    sed -i '' -E "s/ep[0-9]+_(credits|\{key\})/ep${EP}_\1/g" "$dest/work/sb_head.py"
    [ -f "$dest/render/photos/ep${EP}_credits.json" ] || echo '{}' > "$dest/render/photos/ep${EP}_credits.json"
  fi
  [ -f "$dest/render/news/sources.json" ] || echo '{}' > "$dest/render/news/sources.json"
  # sb_build.py 里的期号、片名、录制日期换成本期（顶栏、标题卡、结尾卡都读这里）
  if [ -f "$dest/work/sb_build.py" ]; then
    sed -i '' -E "s/'episode': [0-9]+/'episode': $EP/; s/第 [0-9]+ 期/第 $EP 期/g; s/'head': '重估[^']*'/'head': '重估$TOPIC'/" "$dest/work/sb_build.py"
    [ -n "$DATE" ] && sed -i '' -E "s/[0-9]{4}\.[0-9]{2}\.[0-9]{2}/$DATE/g" "$dest/work/sb_build.py"
  fi
  VENV=""
  for v in "$FROM/.venv/bin/python" "$(dirname "$FROM")/.venv/bin/python"; do [ -x "$v" ] && VENV=$v && break; done
  cat > "$dest/episode.env" <<EOF
# 《重估》第 $EP 期 · $TOPIC —— chonggu.sh 读这个文件
EP=$EP
TOPIC=$TOPIC
DATE=${DATE:-}
LABEL=                                  # 分两期发时写 5.1 / 5.2，合集留空
RECORDING=work/meeting.mp4              # 原始录音（腾讯会议导出的 mp4/m4a 都行）
WHISPER_MODEL=mlx-community/whisper-large-v3-mlx
WHISPER_PROMPT="以下是普通话播客《重估》的逐字稿，主持人吴原同（原同）和顾东政（东政）。这一期重估$TOPIC。用词："
INTRO_BASE=重估_片头_第${EP}期_$TOPIC
PLAN=plan_J.json
EDIT_DIR=edit
STORYBOARD=storyboard_final.json
EP_JS=ep.js
FINAL=outputs/重估_第${EP}期_${TOPIC}_3比4.mp4
COVER_HTML=render/cover.html
PY=${VENV:-python3}
WORKERS=8
EOF
  sed "s/{{EP}}/$EP/g; s/{{TOPIC}}/$TOPIC/g; s/{{DATE}}/${DATE:-待定}/g; s|{{FROM}}|$FROM|g" "$SKILL_DIR/templates/HANDOFF.md" > "$dest/HANDOFF.md"
  say "建好了：$dest"
  echo "接下来：把录音放到 work/meeting.mp4，补全 episode.env 里的 WHISPER_PROMPT 用词，然后 chonggu.sh transcribe"
  echo "还要按本期改：work/sb_build.py 里的 episode / date / title / end（片名、期号、日期），work/score_fx.py 里的 KEY 重点句，work/plan_to_edl.py 里的 HL 红字词"
  ;;

transcribe)
  load_env
  [ -f "$RECORDING" ] || die "找不到录音 $RECORDING"
  say "整段识别（第一次会下载约 3 GB 的模型）"
  (cd work && WHISPER_PROMPT="$WHISPER_PROMPT" "$PY" transcribe.py "$ROOT/$RECORDING" transcript "$WHISPER_MODEL")
  echo "逐字稿：work/transcript.txt（带时间），work/transcript.json（带词时间）"
  ;;

intro)
  load_env
  voice=${1:-}; [ -n "$voice" ] || die "用法：intro <片头录音> [make_intro.py 的其它参数，如 --p1-speaker gu --total-frames 700]"; shift
  args=(--topic "$TOPIC" --episode "$EP" --lines 3 --voice "$voice" --out "$ROOT/outputs/$INTRO_BASE.mp4")
  [ -n "${DATE:-}" ] && args+=(--date "$DATE")
  [ -n "${LABEL:-}" ] && args+=(--label "$LABEL")
  (cd extras/chonggu_intro && "$PY" make_intro.py "${args[@]}" "$@")
  ;;

plan)
  load_env
  [ -f work/make_plans.py ] || die "还没有 work/make_plans.py：照 work/transcript.txt 写剪辑表（格式见 skill 的 references/pipeline.md）"
  (cd work && "$PY" make_plans.py)
  ;;

cut)
  load_env
  [ -f "work/$PLAN" ] || die "没有 work/$PLAN：先 plan"
  (cd work && "$PY" plan_to_edl.py "$PLAN" edl.json && ALIGN=${ALIGN:-map} "$PY" assemble2.py edl.json "$EDIT_DIR")
  echo "剪接点报告：work/$EDIT_DIR/joins.json（检查 gap_after 太小的剪接点）"
  ;;

board)
  load_env
  (cd work && PART=${PART:-} "$PY" sb_build.py "$STORYBOARD")
  ;;

preview)
  load_env
  [ $# -ge 2 ] || die "用法：preview <名字> <章号...>，如 preview a 03 04"
  (cd work && ./preview.sh "$@")
  ;;

build)
  load_env
  out=$(cd work && EDIT_DIR=$EDIT_DIR INTRO_BASE=$INTRO_BASE EP_JS=$EP_JS "$PY" build_ep.py "$STORYBOARD" 2>&1 | grep -v -i "pkg_resources" )
  echo "$out" | tail -6
  echo "$out" | tail -1 | grep -q '"Tend"' || die "build_ep.py 没有打印出时间线（看上面的报错）"
  echo "$out" | tail -1 > work/build_summary.json
  echo "Tend = $(summary_get Tend) 秒"
  ;;

mix)
  load_env
  (cd work && EDIT_DIR=$EDIT_DIR INTRO_BASE=$INTRO_BASE EP_JS=$EP_JS FX=${FX:-1} "$PY" mix.py "$EDIT_DIR/final_audio.wav")
  ;;

render)
  load_env
  [ -f work/build_summary.json ] || die "先 build"
  TEND=$(summary_get Tend)
  (cd render && EPJS=$EP_JS node render.mjs --from "${FROM_T:-0}" --to "${TO_T:-$TEND}" --workers "$WORKERS" --out ../work/video.mp4)
  ;;

mux)
  load_env
  ffmpeg -v error -y -i work/video.mp4 -i "work/$EDIT_DIR/final_audio.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k \
    -shortest -movflags +faststart "$FINAL"
  echo "成片：$FINAL"
  ;;

qa)
  load_env
  [ -f "$FINAL" ] || die "没有 $FINAL：先 mux"
  say "规格"
  ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of compact "$FINAL"
  say "响度（目标 -14 LUFS，峰值不超过 -1 dBTP）"
  ffmpeg -hide_banner -i "$FINAL" -af ebur128=peak=true -f null - 2>&1 | grep -A14 "Summary" | grep -E "I:|Peak:" || true
  say "总览图：每 30 秒一帧"
  ffmpeg -v error -y -i "$FINAL" -vf "fps=1/30,scale=360:-1,tile=6x6:padding=6" -frames:v 1 outputs/qa_sheet.jpg
  echo "outputs/qa_sheet.jpg（用 Read 打开看）"
  ;;

cover)
  load_env
  name=${1:-outputs/重估_第${EP}期_封面_竖版.png}
  [ -f "$COVER_HTML" ] || die "没有 $COVER_HTML（从上一期的 cover_*.html 改）"
  (cd render && node cover.mjs "$ROOT/$COVER_HTML" "$ROOT/$name")
  echo "封面：$name"
  ;;

pack)
  load_env
  [ -f "$FINAL" ] || die "没有 $FINAL"
  d="outputs/第${EP}期"; mkdir -p "$d"
  v=$(basename "$FINAL")
  rm -f "$d/$v".part_* "$d/$v.sha256"
  (cd "$d" && split -b 44040192 "$ROOT/$FINAL" "$v.part_" && shasum -a 256 "$ROOT/$FINAL" | awk -v n="$v" '{print $1"  "n}' > "$v.sha256")
  for f in outputs/重估_第${EP}期_封面_竖版.png; do [ -f "$f" ] && cp "$f" "$d/"; done
  [ -f "$d/README.md" ] || sed "s/{{EP}}/$EP/g; s/{{TOPIC}}/$TOPIC/g; s/{{DATE}}/${DATE:-}/g; s/{{VIDEO}}/$v/g" "$SKILL_DIR/templates/README_episode.md" > "$d/README.md"
  [ -f "$d/发布简介.md" ] || sed "s/{{EP}}/$EP/g; s/{{TOPIC}}/$TOPIC/g" "$SKILL_DIR/templates/发布简介.md" > "$d/发布简介.md"
  ls -la "$d"
  echo "上传：照 skill 的 references/publishing.md 里「GitHub」一节（output 分支放成片，ep$EP 分支放素材）"
  ;;

all)
  for c in cut board build mix render mux qa; do "$0" "$c"; done
  ;;

help|-h|--help|*)
  sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'
  ;;
esac
