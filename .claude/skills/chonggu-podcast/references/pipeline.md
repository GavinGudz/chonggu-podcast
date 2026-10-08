# 流水线：每一步的输入、输出和格式

以第 4 期（`chonggu-ep4/`）为准。每期文件夹的样子：

```
chonggu-epN/
  episode.env          chonggu.sh 读的参数（期号、主题、文件名、Python 路径）
  HANDOFF.md           进度和本期决定，换会话先读
  work/                剪辑和分镜（所有脚本在这里运行，用相对路径）
    meeting.mp4        原始录音
    transcript.json    whisper 逐字稿（段 + 词时间）
    make_plans.py      剪辑表（每期手写）-> plan_J.json（合集）/ plan_A.json、plan_B.json（两人各一期）
    plan_to_edl.py     + 红字关键词、冷开场断行 -> edl.json
    assemble2.py       剪音频 -> edit/{body.wav, cold.wav, timeline.json, joins.json}
    sb/ch_XX.py        每章分镜；sb_head.py 是辅助函数
    sb_build.py        -> storyboard_final.json
    build_ep.py        -> ../render/ep.js（时间线）+ edit/ep_voice.wav、ep_times.json
    mix.py, score_fx.py-> edit/final_audio.wav
    preview.sh         某几章的总览图
  render/              engine.js（画面引擎）、render.mjs（无头 Chrome 渲染）、cover.mjs、news_shot.mjs、photos/、news/
  extras/chonggu_intro 片头生成器（make_intro.py、music.py、engine.py、assets/）
  outputs/             片头、成片、封面、第N期/（上传包）
```

## 1. 识别

`transcribe.py <录音> transcript <模型>`，mlx-whisper large-v3，`language='zh'`，`word_timestamps=True`，`condition_on_previous_text=False`（防止一段幻觉拖累后面）。`initial_prompt` 写节目名、两人的名字和本期术语，例如第 4 期写了「学历至上，成绩，走廊，三六九等，马来西亚，大学预科，UNSW，Codex，Claude Code，复利，贬值，资本市场，外部评价，祛魅，门票，方向性直觉」。27 分钟的录音在 M 系列上几分钟识别完；第一次要下载约 3 GB 的模型。

## 2. 片头（`extras/chonggu_intro/make_intro.py`）

三句版（不报名字，一个人就能录）：「这里是《重估》。」「我们重新审视那些被默认接受的答案。」「今天，我们重估＿＿。」句与句之间停 0.4–0.8 秒，三句合计 9–11 秒；前两句可以每期复用（`--voice-fixed`），最后一句每期重录（`--voice-topic`）。四句版会多一句两人报名字。

常用参数：`--topic`（屏幕上的主题，2–8 字）、`--episode`、`--label 4.1`（拆期时）、`--date`、`--lines 3`、`--p1-speaker / --p3-speaker / --p4-speaker wu|gu|both`（底部发言人标记跟着变）、`--total-frames 700`（凑准帧数，60 fps）、`--handoff fade|hold`。没给录音就出纯音乐版先看节奏。输出 mp4 和同名 `.json`（切句时间）；字没对上时写 `anchors.json` 用 `--anchors` 校正（辅音开头的字取辅音起点）。

`build_ep.py` 和 `mix.py` 通过 `INTRO_BASE`（不带扩展名的片头文件名）找到 `outputs/` 里的片头和它的 json。

## 3. 剪辑表（`make_plans.py` → `plan_*.json`）

```json
{"cold_open": [{"src_start": 348.34, "src_end": 353.3, "text": "校对后的字幕。", "speaker": "顾东政"}],
 "chapters": [{"no": "01", "name": "敲门砖",
               "pieces": [{"src_start": 40.22, "src_end": 41.32, "text": "哈喽，观众朋友们。", "speaker": "顾东政"},
                          {"src_start": 50.1, "src_end": 58.7, "parts": [[50.1, 53.2], [54.0, 58.7]], "inner_gap": 0.08,
                           "text": "一块里跳过中间几个字时用 parts。"}]}]}
```

- `src_*` 是原始录音里的秒数，直接取 `transcript.json` 的段/词时间（`make_plans.py` 里的 `P(a, b, text)` 会把结束时间对齐到段尾，`PP(parts, text)` 处理段内跳字）。
- 字幕「不改字」：只修识别错误、加标点，口语保留；为过审删的词句直接不放进来，并记进 README。
- 冷开场三句，各一句话，最好一句一个观点。
- 两人各一期时写 `plan_A.json`（顾东政）、`plan_B.json`（吴原同），合集 `plan_J.json`。

## 4. 剪音频（`plan_to_edl.py` → `assemble2.py`）

- `plan_to_edl.py plan.json edl.json`：给每块挑最多两个红字词（`HL` 列表，按本期改，避开过审敏感词），冷开场按竖版断行。
- `assemble2.py edl.json edit`：在录音里前后相接的块当作一整段播放，保留原始停顿和换气；只有删掉内容的地方才剪接（等功率交叉淡化，句中 35 ms、句间 20 ms）。每个剪接点量一遍「上一段末尾的静音 + 下一段开头的静音」，不够自然停顿就补门控静音（句号问号后 0.5 秒、逗号后 0.3 秒、句中 0.12 秒）；段内超过 0.9 秒的停顿缩到约 0.65 秒。报告写进 `edit/joins.json`。
- 字的时间：默认再整段识别一遍成片音频；`ALIGN=map` 时直接把 `transcript.json` 的词时间换算过来（和整段识别比，中位差 10 ms），模型下载不了时用。
- `edit/timeline.json`：`body` 每块有 `spk`、`src`、`text`、`hl`、`chapter`、`t0/t1`（成片上的时间）、`char_t`（每个字的时间）。

## 5. 分镜

见 `storyboard.md`。`sb_build.py out.json [章号...]` 把 `sb/ch_*.py` 拼起来，片名/期号/日期/结尾卡写在 `sb_build.py` 的 `sb = {...}` 里（每期改）；`PART=A|B` 时只拼 01–07 或 08–14，配 4.1 / 4.2 的标题和结尾卡。

## 6. 时间线（`build_ep.py`）

```
[0, Tco]     冷开场（最后一句的署名多停一拍）
[Tco, Tb]    片头槽（放片头视频，直到片头最后一帧停满 0.5 秒）
[Tb, Tbe]    正片
[Tbe, Tend]  结尾卡（默认 5 秒）
```

环境变量：`EDIT_DIR`（剪辑输出文件夹）、`INTRO_BASE`、`EP_JS`（写到 `render/` 下的文件名）、`NO_AUDIO=1`（预览时不出声音）。最后一行打印 `{"Tco", "Tb", "Tbe", "Tend", "subs", "scenes"}`，`Tend` 就是渲染的终点。场景的开口短语在剪辑后的文字里找不到时会报 `scenes dropped`，这是分镜锚点写错了，要修。

## 7. 混音（`mix.py` + `score_fx.py`）

冷开场人声 → 片头自带的音频（已母带）→ 正片人声 → 结尾 D 小调和弦。人声母带到 -14 LUFS、限幅 -1.5 dBTP，全片垫约 -64 dBFS 底噪。`score_fx.py` 在母带之后叠：冷开场低音冲击/长音/渐强、换章翻页声 + 两音钢琴动机、`KEY` 列表里每句重点句下面的和弦（比人声低约 17 dB，跟着人声压低）。`FX=0` 只出干声版。全部声音来自 `chonggu_intro/music.py`（毛毡钢琴、pad、低频脉冲、简易混响），没有采样。

## 8. 渲染（`render/render.mjs`）

```bash
cd render && EPJS=ep.js node render.mjs --from 0 --to <Tend> --workers 8 --out ../work/video.mp4
node render.mjs --stills 12,30.5,61 --dir ../work/stills     # 单帧检查
```

每个 worker 开一个无头 Chrome 页面，`window.renderFrame(t)` 画一帧，JPEG 管道进 ffmpeg 分段编码再拼接。画面是 t 的纯函数，所以可以乱序、并行渲染。合成：

```bash
ffmpeg -y -i work/video.mp4 -i work/edit/final_audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart outputs/重估_第N期_主题_3比4.mp4
```

## 9. 检查

- 响度：`ffmpeg -i 成片 -af ebur128=peak=true -f null -`，I 约 -14 LUFS。
- 画面：每 30 秒一帧拼成总览图（`chonggu.sh qa`）；有问题的段落用 `--stills` 出单帧细看。
- 字幕对不对：第 3、4 期有 `qa_asr.py`（把成片音频整段重新识别，和剪辑表逐句比对），没带过来时至少抽查几段。

## 10. 环境

Python 3.12 venv（numpy、scipy、pillow、mlx-whisper、jieba；短片还要 edge-tts），Node 24 + `render/node_modules/puppeteer-core`，`/Applications/Google Chrome.app`，Homebrew ffmpeg，系统字体 Songti SC、PingFang SC。
