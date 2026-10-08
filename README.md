# 《重估》制作 skill

把第 2–4 期的做法整理成一套 Claude 的 skill 和一份工作流：从腾讯会议录音到 3:4 竖版成片、片头、封面、发布简介、上传本仓库。2026-10-08 整理。

| 文件 | 给谁 | 用法 |
|---|---|---|
| `重估_制作手册.pdf` | 人 | 一页工作流（谁做什么、每步多久、改了东西从哪重跑、发布前检查单）+ 第 2–4 期总结 + 发布和上传规范 |
| `chonggu-podcast.skill` | Claude 网页版 / 桌面版 | 下载后在 Claude 里打开，点「Save skill」安装 |
| `.claude/skills/chonggu-podcast/` | Claude Code | 克隆这个分支、在仓库里用 Claude Code 会自动加载；或者复制到 `~/.claude/skills/` 全局使用 |

装好以后，在某一期的文件夹里说「做下一期」「剪一下这期」「改画面」「出封面」「写发布简介」，Claude 会按这套流程走。

## skill 里有什么

```
.claude/skills/chonggu-podcast/
  SKILL.md                    节目是什么、九步流程、质量标准（每条写了原因）、平台规矩、容易踩的坑
  WORKFLOW.md                 给人看的一页工作流
  references/
    episodes.md               第 2、3、4 期和模拟退火讲解短片：内容、做法、定下来的规矩
    pipeline.md               每一步的输入输出和文件格式
    storyboard.md             分镜怎么写（锚点、版面、辅助函数、照片和新闻截图）
    publishing.md             封面、发布简介、小红书、过审、上传本仓库
    short-explainer.md        几十秒的讲解短片（合成口播 + Canvas 画面）
  scripts/chonggu.sh          工作流脚本：new / transcribe / intro / plan / cut / board / preview / build / mix / render / mux / qa / cover / pack / all
  templates/                  每期的交接说明、README、发布简介、识别脚本
```

## 工作流脚本

```bash
S=.claude/skills/chonggu-podcast/scripts/chonggu.sh
$S new ~/重估/chonggu-ep5 --ep 5 --topic 财富 --date 2026.10.12 --from <上一期的文件夹>
cd ~/重估/chonggu-ep5        # 录音放 work/meeting.mp4
$S transcribe
$S intro 片头录音.m4a
$S plan && $S cut            # 剪辑表 work/make_plans.py 照逐字稿写
$S preview a 01 02           # 写分镜时一章一章看
$S all                       # board build mix render mux qa
$S cover && $S pack
```

`new` 从上一期的文件夹复制渲染引擎、剪辑脚本和片头生成器，并把期号、日期、片名、照片前缀换成本期。渲染引擎和剪辑脚本在 `ep4` 分支的 `第4期/`（克隆下来可以直接当 `--from`）；片头生成器 `chonggu_intro` 不在仓库里，在原同的电脑上。脚本按 macOS 写（Chrome、Songti SC / PingFang SC 字体、Homebrew ffmpeg、mlx-whisper），用第 4 期的数据实测过 new 到 pack 的大部分步骤。
