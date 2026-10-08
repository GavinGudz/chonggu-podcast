# 《重估》一期节目的工作流

从录音到发布，九步。每一步的命令都是 `chonggu.sh <子命令>`（在 skill 的 `scripts/` 里），参数写在每期文件夹的 `episode.env`。标 ⏸ 的地方要原同（或东政）听过、看过再往下走。

```
 录音（原同 + 东政，腾讯会议）        片头口播（三句，9–11 秒）
        │                                   │
 ① new  建文件夹 ── ② transcribe 识别 ──┐   ③ intro 片头
                                       │
                 ④ plan 剪辑表 ⏸ ──── ⑤ cut 剪音频 ⏸
                                       │
                 ⑥ board / preview 分镜（一章一章）⏸
                                       │
                 ⑦ build → mix → render → mux → qa  出片 ⏸
                                       │
                 ⑧ cover 封面 + 发布简介 / 小红书 ⏸
                                       │
                 ⑨ pack 打包 → GitHub（output / epN 分支）⏸ → 各平台发布
```

## 每一步

| 步 | 谁做 | 命令 | 产出 | 要多久 |
|---|---|---|---|---|
| 录音 | 原同、东政 | — | `work/meeting.mp4`（腾讯会议导出） | 30 分钟左右 |
| ① 建文件夹 | Claude | `new <文件夹> --ep N --topic 主题 --date 日期 --from <上一期>` | 脚本、引擎、片头生成器、`episode.env`、`HANDOFF.md` | 1 分钟 |
| ② 识别 | Claude | `transcribe` | `work/transcript.txt / .json` | 几分钟（首次下模型约 3 GB） |
| ③ 片头 | 录：原同；生成：Claude | `intro <录音>` | `outputs/重估_片头_第N期_主题.mp4 + .json` | 几分钟 |
| ④ 剪辑表 | Claude 写，⏸ 原同确认章节和删减 | `plan` | `work/plan_J.json`（或 A / B 两份） | 1–2 小时 |
| ⑤ 剪音频 | Claude，⏸ 试听剪接点 | `cut` | `work/edit/`（body.wav、timeline.json、joins.json） | 几分钟 |
| ⑥ 分镜 | Claude，⏸ 每章看总览图 | `board`、`preview <名字> <章号>` | `work/sb/ch_XX.py`、总览图 | 最花时间：每章 20–40 分钟 |
| ⑦ 出片 | Claude，⏸ 看成片 | `build mix render mux qa`（或 `all`） | `outputs/重估_第N期_主题_3比4.mp4`、`qa_sheet.jpg` | 渲染约 15 分钟 |
| ⑧ 封面和文案 | Claude，⏸ 原同改标题 | `cover` | 封面 png、`发布简介.md`、小红书文案 | 半小时 |
| ⑨ 打包上传 | Claude 准备，⏸ 原同同意再 push | `pack` | `outputs/第N期/`（42 MB 分段 + sha256 + README） | 几分钟 |

## 改了东西从哪一步重跑

| 改了什么 | 从这里开始 |
|---|---|
| 字幕错字、删一句、换冷开场 | ④ `plan` → `cut` → `board` → `build` → `mix` → `render` → `mux` |
| 只改画面（`sb/ch_XX.py`、`engine.js`） | `board` → `build` → `render` → `mux` |
| 只改音乐音效（`score_fx.py`）| `mix` → `mux` |
| 换片头 | ③ `intro` → `build` → `mix` → `render` → `mux` |
| 拆成两期 | 写 `plan_A.json` / `plan_B.json`，每期一个 `EDIT_DIR`、`PART=A|B board`、各自的片头（`LABEL=N.1`） |

## 发布前过一遍

- [ ] 响度约 -14 LUFS，峰值不超过 -1 dBTP（`qa` 会打印）
- [ ] 总览图里没有空屏、字压字、照片缺署名
- [ ] 为过审删掉的句子写进了 `第N期/README.md`
- [ ] 简介里没有链接；话题里没有财富自由 / 理财 / 投资 / 留学 / 股市 / 变现 / 副业 / 赚钱 / 算卦，用 `#重估播客` 不用 `#重估`
- [ ] 照片、新闻截图的来源都在发布简介末尾
- [ ] 小红书标题不超过 20 字
- [ ] `HANDOFF.md` 更新到最新，换电脑也能接着做
