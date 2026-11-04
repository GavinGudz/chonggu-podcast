# 第 8 期回归（2026-11-04，Apple 芯片 Mac）

拿工具包从第 8 期 v18 的录音中间结果重做口播和时间线，再用工具包的舞台抽几帧，和 v18 成片比。
**结论：口播和 v18 逐个采样一样；时间线句子的起止和 v18 一样；画面布局一样（字体不同，在意料之中）。**
没有渲整片（按要求）。Windows 上没跑过。

## 回归期怎么搭的（只在本机，不进 git）

`episodes_local/ep8/`（`.gitignore` 里的 `episodes_local/`）：

| 东西 | 做法 |
|---|---|
| `src` | 相对软链接，指到第 8 期工程 `film_v9`（只读，一个字节都没往里写） |
| `assets`、`raw`、`tree_keep.json`、`script.md` | 软链接（`src/assets`、`src/raw`、`src/tree_keep.json`、第 8 期的 v9 全稿） |
| `ch/*.js` | 从第 8 期复制，`calm.js` 不复制（插段改由 episode.yaml 的 `interludes` 交给工具包的 `stage/calm.js`）。改了两处写死的 Mac 字体：`wh.js` 的 `Kai,STKaiti,Hiragino Sans GB` → `${K.KAI}`，`ob.js` 的 `HEI` → `SkinHei,'Noto Sans SC',sans-serif`（`MONO` 的 SF Mono / Menlo 没改，Windows 上会落到 monospace） |
| `timeline.json` | 复制 v18 的（会被 `timeline` 这一步重写） |
| `episode.yaml` | 第 8 期的章节、树枝、原声句（7 句，时长同 v18）、呼吸点（`src/voice/breath_v17.json`）、三段新闻插段（从旧 `calm.js` 的 SEG 搬来，原声写全路径 `raw/calm/aud/*.wav`）、片名卡、`stage`（default_bg、docs、photo_dir、logos、props、tree.zones、data.checklist）；`voice.tempo: 1.2`，`voice.inputs` 指到 `rec16_se/hp`、`asr16`、`sel16`、`seams16`，`voice.ovr` 指到 `ovr16.json`，`raw_gaps` 指到 v18 的 timeline、`timeline_est` 指到 `timeline_est_v10.json` |

从 assemble 往后重做（降噪、整段听写、挑段、接缝决定用第 8 期现成的）：

```
python -m chonggu script-check episodes_local/ep8
python -m chonggu build episodes_local/ep8 --from voice --to timeline
python tests/regress_ep8.py episodes_local/ep8          # 比口播和时间线，过了退出码 0
python -m chonggu stills episodes_local/ep8 --only a,nx --h 1080 --stable 8
```

## 结果

### 门槛（听写用真的 mlx-whisper large-v3）

build 停了三次，每次都是「要人听」的门槛，内容都对得上第 8 期自己当时的检查：

| 停在 | 报了几处 | 是什么 | 怎么放过的 |
|---|---|---|---|
| voice › 拆段查重 | 9 处 repeat | rv05 rv12 ct14 wh09 wh20 om3 ob12 nx18 nx21。第 8 期自己的 `chunks_check.py` 在 `chunks16.json` 上报 13 处，其中 4 处（ct19、wh09 的重念、wh10、wh13）后来在 `ovr16.json` 里改掉了，剩下的正好是这 9 处，v18 照样发了 | `flags.tsv` 里改成 ok |
| voice › 静音前后逐字比 | 2 处 mute | ct06「博通」听成「普通」、oa15「两组」听成「两种」。静音后的口播 `narr_c.wav` 和 v18 的 `narr16_c.wav` 逐采样一样；第 8 期的 `check16.json` 在 v18 上也听成这样 | 改成 ok |
| check-voice | 26 处 line | 全是听写的同音字和人名：招股书→高谷说、主讲的名字→同音字、Claude→Cloud、杆秤→二项……（多 n 字、少 n 字成对出现 = 换了字，不是切掉或重念） | 改成 ok |

放过以后 `build --from voice --to timeline` 跑完，退出码 0。

### 口播（narration.wav 对 v18_owner.wav）

| 项 | 允许 | 结果 |
|---|---|---|
| 句数 | 一样 | 170 / 170（主讲 163 句 + 原声 7 句） |
| 每句长度差 | ≤ 30 ms | 0 |
| 全长差 | ≤ 0.5 秒 | 0（975.55 秒） |
| 逐采样 | — | 一样（最大差 0.0） |

中间文件也一样：`narr_raw.wav`、`narr_c_base.wav`、`narr_c.wav` 和 v18 的 `narr_raw16.wav`、`narr16_c_base.wav`、`narr16_c.wav` 逐采样一样。

### 时间线（timeline.json 对 v18）

| 项 | 允许 | 结果 |
|---|---|---|
| 句 id、字 | 一样 | 一样（170 句） |
| 每句开始 | ≤ 50 ms | 0 |
| 结束、vstart、章节起止、全长 | — | 0 |
| 逐字时刻 | — | 5584 个字里 5549 个一样；差过 50 ms 的 4 个，都在 ob05 开头（「先说一月」被听成「音乐」，最大 0.33 秒） |
| 呼吸点 | — | 一样（58 处） |

唯一不同的字段是 `voice`：`narration.wav`（v18 是 `clone/v18_owner.wav`）。

### 画面（工具包舞台抽帧对 v18 1080p 成片）

`python -m chonggu stills … --only a,nx`（每章 1/4、1/2、3/4 处），另加三段插段各一帧（330、670、824 秒）。
对比图在 `episodes_local/ep8/out/cmp/`（只在本机：里面是第 8 期的画面）。

| 时刻 | 章 | 画面 | 和 v18 |
|---|---|---|---|
| 20.62 | 开头 | 树：OpenAI → 2020 出走 → Anthropic 卡 | 布局一样；Anthropic 卡上的英文 Montserrat 比 Avenir 略小 |
| 41.24 | 开头 | 奥特曼原声：实拍 + 英文原话 + 中文字幕 + 出处 | 一样 |
| 61.86 | 开头 | 招股书第 4 页，高亮一句，「招股书 第 4 页」牌子 | 一样 |
| 858.03 | 下一代 | 招股书第 184 页 | 一样 |
| 897.25 | 下一代 | Bill Gurley 原声卡、引文 | 一样；中文用 Noto Sans SC，字距略宽 |
| 936.46 | 下一代 | 天平（业绩 / 安全），左下「观点 · 主讲」字标 | 一样 |
| 330 | 方向盘插段 | wall：三格新闻墙 + 红色滚动条 | 一样（从 episode.yaml 的 interludes 生成） |
| 670 | 越界·下插段 | feed：新闻卡 | 一样 |
| 824 | 下一代插段 | cinema：整屏实拍 | 一样 |

页面整个搭一遍导出的切点（`out/cues.json`）和第 8 期的 `cues.json` 完全一样：镜头 162 个、音效 194 个、原声 24 条。

### 第 8 期的单元回归（`CHONGGU_EP8=<film_v9> python -m pytest tests/voice/test_voice_ep8.py tests/qa/test_ep8_regression.py`）

9 过、1 跳过（整条重做那项要 `CHONGGU_EP8_FULL=1`，上面的 build 已经做了同样的事），约 4 分钟。

## 用时（这台 Mac）

| 步骤 | 用时 |
|---|---|
| voice：assemble + 拆段查重（听写） | 约 2.5 分钟 |
| voice：人声链 + 静音 + 前后逐字比（听写） | 约 1.2 分钟 |
| voice：逐句提速 + 整条口播 | 27 秒 |
| check-voice（163 句听写） | 约 1.5 分钟 |
| timeline（逐字对齐） | 约 2 分钟 |
| 再跑一遍（输入没变，听写走缓存） | 2 秒 |
| 抽 6 帧 1080p | 4 秒 |

## 这次改的工具包

- `tests/qa/conftest.py` 拆出 `tests/qa/qa_util.py`：tests/qa 和 tests/voice 都有 conftest.py，整套一起跑时 `from conftest import …` 拿到的是另一个，`test_detectors` 报 ImportError。
- `chonggu/config.py`：`branches` 的值可以只写小标签（`money: 钱`），和 normalize、舞台一致（原来 schema 只认 `{label, pal}`，渲染测试全挂）。
- `pyproject.toml`：pytest 只收 `tests/`，不进 `episodes_local/`（那里的软链接指到第 8 期工程，里面有别的项目的测试）。
- `.gitignore`：加 `episodes_local/`。
- `chonggu/build.py`：提示「从哪一步接着跑」时写这一期真正的位置（episodes/ 下的文件夹名，或相对当前文件夹的路径），原来写 slug，不在 episodes/ 下或文件夹名和 slug 不一样时找不到。
- 新加 `tests/test_build.py`（build 串步骤、--from/--to、每种分辨率、停在第一个门槛）和 `tests/regress_ep8.py`（这份回归的比对）。

## 还要注意

- check-voice 在和 v18 一模一样的口播上报 26 处，新的一期大概也要人听二三十句。多半是「换了字」（多 n 少 n 一样多），真正的切字、重念是一边多。以后可以考虑只在两边不一样多时挡、换字只提醒；这次没改门槛。
- 回归里放过的 37 处只记在 `episodes_local/ep8/voice/flags.tsv`（本机）。
- 渲整片、2K、混音出成片、打包没有在第 8 期上跑（混音、QA 的数在 `tests/qa/test_ep8_regression.py` 里另有回归）。build 从 render 到 pack 一整条只在一个 6 秒的小期上跑过（停在 QA：合成的口播响度、字速不合格，门槛照常挡住）。
