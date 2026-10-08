---
name: chonggu-podcast
description: 《重估》播客（吴原同、顾东政）的整套制作方法：从腾讯会议录音到 3:4 竖版成片、片头、封面、发布简介、小红书文案和 GitHub 上传包，也包括节目号里的短讲解视频（比如模拟退火那条）。只要提到《重估》、重估播客、chonggu、顾东政或吴原同的节目、"做下一期 / 第 N 期"、剪播客、写分镜、出片头、做封面、写发布简介、把成片传到 chonggu-podcast 仓库，或者在 chonggu-epN 这类文件夹里干活，就用这个 skill——哪怕用户只说"剪一下这期""改一下画面""出个封面"。
---

# 《重估》制作

《重估》是吴原同（原同）和顾东政（东政）的远程对谈播客：「我们重新审视那些被默认接受的答案」。每期一个主题（青年交流、注意力与直觉、学历……），两人各讲一段自己的经历和结论。成片是 1080×1440、60 fps 的竖版视频，-14 LUFS，发在抖音、小红书、视频号。

每一期都是一个独立文件夹（`~/Documents/Codex/<日期>/chonggu-epN`，或 Downloads 里的拷贝），从上一期复制脚本再改。文件夹里的 `HANDOFF.md` 记录这一期做到哪了：进到一期的文件夹，先读它。

## 先看哪份参考

| 要做的事 | 读 |
|---|---|
| 给人看的一页流程图、谁做什么、改了东西从哪重跑、发布前检查单 | `WORKFLOW.md` |
| 了解前几期做了什么、定下了哪些规矩（第 2、3、4 期和讲解短片） | `references/episodes.md` |
| 跑流水线、看每一步的输入输出和文件格式 | `references/pipeline.md` |
| 写分镜（`work/sb/ch_XX.py`）| `references/storyboard.md` |
| 封面、发布简介、小红书、过审、上传 GitHub | `references/publishing.md` |
| 做一条几十秒的讲解短视频（不是对谈） | `references/short-explainer.md` |

## 工作流

`scripts/chonggu.sh` 把每一步包成一个子命令，参数都读每期文件夹里的 `episode.env`。下面每一步后面的「停一下」是要用户听或看过才往下走的地方——这些都是原同明确提过意见的环节，跳过去返工更贵。

1. **建文件夹**：`chonggu.sh new <新文件夹> --ep N --topic 主题 --date YYYY.MM.DD --from <上一期文件夹>`。复制渲染引擎、剪辑脚本、片头生成器，写好 `episode.env` 和 `HANDOFF.md`。然后按本期改 `work/sb_build.py` 的片名/期号/日期、`work/plan_to_edl.py` 的红字词 `HL`、`work/score_fx.py` 的重点句 `KEY`。
2. **识别**：录音放 `work/meeting.mp4`，把本期的人名和术语补进 `WHISPER_PROMPT`（whisper 会照提示里的写法拼专有名词），`chonggu.sh transcribe`。
3. **片头**：两人录三句版口播（「这里是《重估》。我们重新审视那些被默认接受的答案。今天，我们重估＿＿。」），`chonggu.sh intro <录音>`。录音要求见 `references/pipeline.md` 的片头一节。
4. **剪辑表**：照 `work/transcript.txt` 写 `work/make_plans.py`：冷开场挑三句金句；每个人分成 6–8 章，章名要短、像一句话；每一块写原文起止时间和校对后的字幕。说错重说只留后一遍。**停一下**：把章节表和删掉的句子列给用户确认。
5. **剪音频**：`chonggu.sh plan cut`。看 `work/edit/joins.json`，试听剪接点。**停一下**：给用户一段试听（他们对比过「旧剪法 / 新剪法」，在乎的是话和话之间的呼吸）。
6. **分镜**：每章一个 `work/sb/ch_XX.py`，每个场景一个画出来的点子。写完一章就 `chonggu.sh preview <名字> <章号>`，用 Read 看总览图，自己先挑毛病再给用户看。
7. **出片**：`chonggu.sh board build mix render mux qa`（或 `all`）。渲染 20 分钟的片子在 M 系列上 8 个 worker 约十几分钟。看 `outputs/qa_sheet.jpg` 和响度。
8. **封面和文案**：`chonggu.sh cover`；写 `发布简介.md`（标题、两段简介、章节时间、话题、图片来源），分两期发时再各写一份，加小红书版。
9. **打包上传**：`chonggu.sh pack`，再按 `references/publishing.md` 推到 GitHub。**停一下**：push 和给顾东政发邮件都是对外的动作，先问用户。

只改了画面时从第 7 步的 `board` 开始；只改了剪辑从 `cut` 开始。

## 质量标准（为什么这样做）

这些是做第 2–4 期时原同和朋友逐条提出来的，背后的道理比条文重要：

- **声音像真人在聊**。连着说的部分整段保留原始停顿和换气，只在删掉内容的地方剪；每个剪接点保证自然停顿（句号、问号后约 0.5 秒，逗号后 0.3 秒，句中 0.12 秒）。腾讯会议的降噪会把停顿压成数字静音，所以全片垫一层约 -64 dBFS 的底噪。逐句切开再插静音的做法被否掉过，因为听起来像念稿。
- **画面每个场景都是一个点子**：门、门票、尺子、成绩榜、聊天记录、曲线、越叠越高的积木，而不是「标题 + 清单」的 PPT。以第 2、3 期为下限。能用真实照片（Wikimedia Commons，画面上署名）或真实新闻截图（只留媒体名、标题、日期）的地方就用，观众信真东西。
- **字幕整句出现**，不逐字变色；放照片的场景不再叠和口播重复的大字（朋友说「满屏都是字」）。关键词首次出现标红，一句最多两个。
- **过渡不闪白**：旧画面停到新内容出现前一刻再滑走，换章整页横向翻过。
- **音乐只做托底**：冷开场的低音冲击和渐强、换章的翻页声加两个音的钢琴动机、重点句下面的和弦（比人声低约 17 dB，说话时自动压低）。全部用片头那套合成器生成，不用任何有版权的音乐。
- **数字和事实要能查**：画面上的数据、新闻、照片都留来源（`render/photos/*_credits.json`、`render/news/sources.json`、发布简介末尾）。

## 平台规矩

- 抖音会把外链当导流：简介里不放链接。
- 话题避开财富自由、理财、投资、留学、股市、变现、副业、赚钱、算卦；不用单独的 `#重估`（股票圈的「价值重估」），用 `#重估播客`。
- 过审：可能被误伤的句子删掉，并在该期 README 里逐条写明删了什么；「牛逼」字幕写「牛X」；聊到资本市场时加「不构成投资建议」。
- 小红书标题不超过 20 字。

## 容易踩的坑

- **iCloud 占位文件**：`~/Documents` 在 iCloud 里，另一台 Mac 上的文件可能只是占位（`ls -lO` 显示 `dataless`），读的时候会卡住。先在访达里对文件夹点「立即下载」，或者用 Downloads 里的完整拷贝。
- **写死的路径**：旧脚本里有 `/Users/wuyuantong/...`、Pro 上的 Python 路径、`~/Documents/Codex/2026-09-28/wu-du/chonggu_intro`。换机器先 `grep -rn "Documents/Codex" work render`。
- **whisper 模型下不动**（HuggingFace 很慢）时，`assemble2.py` 用 `ALIGN=map`：直接把 `transcript.json` 的词时间按剪辑换算到成片上，不再识别第二遍（`chonggu.sh cut` 默认就是这样）。
- 渲染依赖 `/Applications/Google Chrome.app`、`render/node_modules/puppeteer-core`、系统字体 Songti SC / PingFang SC，以及 Homebrew 的 ffmpeg。
- 仓库 `GavinGudz/chonggu-podcast` 是公开的，但推送要登录：`gh auth status` 看一下，没登录就 `gh auth login --web` 让用户在浏览器里输验证码。不带登录调 GitHub API 会对这个仓库返回 404，别据此以为它不存在。
