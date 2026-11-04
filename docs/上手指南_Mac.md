# 上手指南（Mac）

Mac 上和 Windows 一样走：装环境 → 自检全绿 → 下载素材 → 做出示例期 → 开自己的一期。
这里只写 Mac 上不一样的地方。episode.yaml 每一项、怎么录音、门槛没过怎么办、发布、公开仓库的规矩，都看 [上手指南_Windows.md](上手指南_Windows.md) 第 7–12 节（把 `.venv\Scripts\python` 换成 `.venv/bin/python`，反斜杠换成 `/`）。

## 1. 电脑要什么

- Apple 芯片（M1 以后）的 Mac。听写用 mlx-whisper，跑在 GPU 上。Intel 的 Mac 也能跑，听写走 faster-whisper（CPU，慢几倍）。
- 硬盘空余 50 GB 以上，内存 16 GB 以上。
- 先装 Homebrew：打开 https://brew.sh ，把首页那一行命令粘进「终端」回车。

## 2. 拿到工具包

```sh
git clone -b kit <仓库地址> ~/chonggu-kit
cd ~/chonggu-kit
```

第一次用 `git` 时，Mac 可能弹出「安装命令行开发者工具」，点「安装」，几分钟。
`<仓库地址>` 是《重估》公开仓库的地址：GitHub 网页上绿色 **Code** 按钮里 HTTPS 那一行。

**不要放进 iCloud 同步的「文稿」「桌面」。** 一期要写几十 GB，iCloud 会一直同步；`.venv` 放在同步的文件夹里也可能装不好。非放不可的话，文件夹名以 `.nosync` 结尾（比如 `chonggu-kit.nosync`），iCloud 就不管它。

让 Claude Code 学会用工具包：

```sh
mkdir -p .claude/skills/chonggu-kit && cp docs/skill/SKILL.md .claude/skills/chonggu-kit/SKILL.md
```

## 3. 一键安装

```sh
sh install_mac.sh
```

它用 Homebrew 装 Python 3.12、ffmpeg、rubberband、Node.js，建 `.venv`，装 Python 包（`requirements-mac.txt`：mlx-whisper）和降噪（clearvoice，会装 torch），在 `stage/` 里装 npm 包和 Chrome for Testing，下载音效、示例期的录音和配乐、字体，最后自检。
可以反复跑，装好的会跳过。只想看它要做什么：`python3.12 -m chonggu doctor --install --dry-run`。

为什么是 Python 3.12：降噪用的 clearvoice 要 numpy 2.0 以下，3.13 上装不上。

## 4. 自检、素材、示例期

```sh
.venv/bin/python -m chonggu doctor
.venv/bin/python -m chonggu fetch-assets
.venv/bin/python -m chonggu build demo
```

- `doctor` 没有 ✗ 才往下走。记号的意思和 Windows 一样（✓ 好，! 建议，✗ 必须装）。
- 不想每次打 `.venv/bin/python`：先 `source .venv/bin/activate`，之后这个终端窗口里写 `python -m chonggu …` 就行。
- 素材缓存在 `~/Library/Caches/chonggu/assets`。自动下载的只有 Freesound 的 CC0 音效、示例期的录音和配乐、字体；Pixabay 的配乐要在浏览器里手动下载（它的条款不许程序下载），再 `fetch-assets --from 下载文件夹`。
- 示例期做完看 `episodes/demo/out/`。第一次要下听写模型（约 3 GB）。

## 5. 开新的一期

```sh
.venv/bin/python -m chonggu new ep9 --number 9 --title 英伟达财报 --host 你的名字
.venv/bin/python -m chonggu script-check ep9
```

录音放进 `episodes/ep9/assets/rec.m4a`（手机「语音备忘录」→ 分享 → 隔空投送到 Mac，或存到「文件」）。然后：

```sh
caffeinate -i .venv/bin/python -m chonggu build ep9
```

`caffeinate -i` 让 Mac 在跑完之前不睡觉（渲染一整期要半小时以上）。

## 6. Mac 上要注意的

| 事情 | 怎么做 |
|---|---|
| 渲染时别开着 `out/` 的 Finder 窗口 | Finder 会给视频做预览图，占掉整个 CPU 核 |
| 渲染时别同时跑听写、混音 | 会抢 CPU 和 GPU，渲得慢，还容易出半帧 |
| 想换听写后端或模型 | `CHONGGU_ASR_BACKEND=faster` 用 faster-whisper；`CHONGGU_ASR_MODEL=…` 换模型 |
| 降噪 | clearvoice 自己挑设备，Apple 芯片用 MPS：24 分钟的录音不到 1 分钟 |
| 2K | `render.res` 写 `[1080, 1440]`；2K 自动加大浏览器的显存额度（`--gpumem 8192`），一次一章 |
| 发布 | `brew install gh`，`gh auth login`，其余同 Windows 第 11 节 |
| 安装脚本说找不到 brew | 先装 Homebrew；装完新开一个终端窗口 |

## 7. 大概多久（第 8 期，18 核 Mac 实测或推算）

| 步骤 | 用时 |
|---|---|
| 口播 voice + check-voice + timeline（24 分钟录音，没有缓存） | 约 7–8 分钟 |
| 渲染 1080p（16 分钟成片） | 约 20 分钟 |
| 渲染 2K | 约 24 分钟 |
| 混音 | 约 2 分钟 |
| 打包 | 约 4 分钟 |

每条命令的输入、输出、门槛：[命令说明.md](命令说明.md)。
