# 《重估》第 {{EP}} 期 · {{TOPIC}} · 交接说明

录制：{{DATE}}　　脚本和渲染引擎复制自：`{{FROM}}`

换电脑或换会话时，先让 Claude 读这份文件。每做完一步，在下面打勾、写一句结果。

## 进度

- [ ] 录音放到 `work/meeting.mp4`，`episode.env` 补好 WHISPER_PROMPT 用词
- [ ] `chonggu.sh transcribe` → `work/transcript.txt`
- [ ] 片头录音 → `chonggu.sh intro <录音>` → `outputs/重估_片头_第{{EP}}期_{{TOPIC}}.mp4`
- [ ] 剪辑表 `work/make_plans.py`（冷开场金句 + 两人各自的章节，校对字幕）→ `chonggu.sh plan`
- [ ] `chonggu.sh cut`，看 `work/edit/joins.json`，试听剪接点
- [ ] 分镜 `work/sb/ch_XX.py`，每章 `chonggu.sh preview` 看总览图
- [ ] `chonggu.sh board build mix render mux qa`
- [ ] 封面 `chonggu.sh cover`，发布简介 / 小红书文案
- [ ] `chonggu.sh pack`，上传 GitHub（output 分支成片，ep{{EP}} 分支素材）

## 本期决定

（剪掉了什么、为什么；分不分两期；用了哪些照片和新闻截图，来源记在 render/photos/*_credits.json 和 render/news/sources.json）

## 还没做

