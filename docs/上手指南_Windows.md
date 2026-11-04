# 上手指南（Windows）

写给用 Windows、不写代码、有 Claude Code 的主讲。
从一台什么都没装的电脑开始：装环境 → 自检全绿 → 下载素材 → 做出示例期 → 开自己的一期 → 发出去。

每一步都有两种做法：自己把命令粘进 PowerShell，或者把「跟 Claude Code 说」那段话发给你的 Claude Code，让它去跑。两种都行。

## 0. 先知道三件事

1. **片子不是剪出来的。** 每一章是一段网页程序。电脑把网页一帧一帧截图（每秒 30 帧），拼成视频；声音另外做好，最后合进去。好处是改一句话，画面自动跟着字走；坏处是改一个字幕，也要重新截图。
2. **每一步都有门槛。** 屏幕上出现「✗ 没过：……」是门槛在拦，不是坏了。照它说的改好，再从那一步接着跑。
3. **仓库是公开的。** 谁都能下载。录音、配乐、视频、截图、成片永远不提交（第 12 节）。

## 1. 电脑要什么

- Windows 10 或 11，64 位。
- 硬盘空余 **50 GB** 以上。一期从头做到尾要 20–40 GB。
- 内存 16 GB 以上。8 GB 也能跑，渲染要开得少一点（第 7 节 `render.workers`）。
- 有 NVIDIA 显卡更好：听写、降噪快很多。没有也能做，只是慢几倍。
- 网络要能上 GitHub、Python 的包（PyPI）、npm、Hugging Face（听写模型）。下得很慢的话看第 13 节。

## 2. 装 Claude Code，拿到工具包

1. 照 Claude Code 官网的 Windows 安装说明装好 Claude Code。
2. 开一个 PowerShell：开始菜单里搜「终端」或「PowerShell」，点开。
3. 装 Git（已经有就跳过；装的时候 Windows 问「是否允许更改」，点「是」）：

   ```powershell
   winget install -e --id Git.Git
   ```

   装完**关掉这个窗口，重新开一个**（新装的程序要新窗口才找得到）。
4. 把工具包拿下来，放在 `C:\chonggu-kit`：

   ```powershell
   git clone -b kit <仓库地址> C:\chonggu-kit
   cd C:\chonggu-kit
   ```

   `<仓库地址>` 是《重估》那个公开仓库的地址：在 GitHub 网页上点绿色的 **Code** 按钮，复制 HTTPS 那一行（以 `.git` 结尾）。

为什么放 `C:\chonggu-kit`：路径短，没有空格和中文。**不要放进 OneDrive 同步的「文档」「桌面」**：一期会写几十 GB，OneDrive 会一直在后台传，还抢电脑。

> **跟 Claude Code 说：**「把《重估》仓库的 kit 分支 clone 到 C:\chonggu-kit（地址是 ……），以后都在这个文件夹里干活。」

### 让 Claude Code 学会用工具包

工具包里有一份给 Claude Code 的说明书 `docs\skill\SKILL.md`。复制到 Claude Code 认的位置：

```powershell
cd C:\chonggu-kit
New-Item -ItemType Directory -Force .claude\skills\chonggu-kit | Out-Null
Copy-Item docs\skill\SKILL.md .claude\skills\chonggu-kit\SKILL.md -Force
```

以后在 `C:\chonggu-kit` 里打开 Claude Code，它就会照这份说明书做。工具包更新以后（`git pull`），再复制一次。`.claude\` 这个文件夹不用提交。
不想复制也行：每次开工先跟它说「先读 docs\skill\SKILL.md」。

## 3. 一键安装

```powershell
cd C:\chonggu-kit
powershell -ExecutionPolicy Bypass -File .\install_windows.ps1
```

`-ExecutionPolicy Bypass` 只对这一次运行有效，不改电脑的设置。

它做五件事：

1. 用 winget 装 Python 3.12、Node.js、FFmpeg（已经有的跳过）。
2. 下载 rubberband（变速不变调用的），核对 sha256，放进 `%LOCALAPPDATA%\chonggu\bin`。
3. 建工具包自己的 Python 环境 `.venv`，装 Python 包。有 NVIDIA 显卡的，先装 CUDA 版的 torch（约 2.5 GB）。再装降噪（clearvoice）。
4. 在 `stage\` 里装渲染用的 npm 包和 Chrome for Testing（渲染专用的浏览器，和你自己的 Chrome 分开）。
5. 下载音效、示例期的录音和配乐、字体，最后做一次自检。

跑这个脚本，等于你接受 winget 和 Git、Python、Node.js、FFmpeg（GPL）、rubberband（GPL）各自的许可协议：脚本替你点了「接受」，装的时候不再一个个问。

第一次大约 **30–60 分钟**，看网速。中途 Windows 可能会弹「是否允许此应用对你的设备进行更改」，点「是」。
**可以反复跑**：哪一步断了，改好再跑一遍，装好的会跳过。

它停下来时，看最后一行红字：

| 红字说 | 怎么办 |
|---|---|
| 没有 winget | 打开 Microsoft Store，搜「应用安装程序」（App Installer），装上或更新 |
| 装了 …… 还是找不到 | 关掉窗口，重新开一个 PowerShell，再跑一遍 |
| Python 包没装上 | 多半是网慢，看第 13 节的镜像 |
| npm 包没装上 | 同上 |
| Chrome for Testing 没下下来 | 网络问题，过一会儿再跑；还不行看第 13 节 |
| clearvoice 没装上（黄字） | 可以先不管：做口播时不降噪就行（第 7 节，把 `voice` 下面的 `denoise` 改成 `false`） |

> **跟 Claude Code 说：**「在 C:\chonggu-kit 里跑 install_windows.ps1（用 powershell -ExecutionPolicy Bypass -File），停了就告诉我停在哪、为什么，要装新软件、要花钱、要输密码的先问我。」

## 4. 自检：doctor 全绿

```powershell
.venv\Scripts\python -m chonggu doctor
```

以后所有命令都是这个开头：`.venv\Scripts\python -m chonggu <命令>`。在 `C:\chonggu-kit` 里跑。

每一项前面一个记号：

- `✓` 好了。
- `!` 建议：能用，但看一眼说明。
- `✗` 必须装：不装，后面某一步一定跑不了。
- `·` 只是告诉你一声。

**没有 ✗ 就算「全绿」**，可以往下走。每个 ✗ 后面都写着「怎么办」。常见的：

| 项目 | 记号 | 怎么办 |
|---|---|---|
| 虚拟环境 | ! | 你用的不是工具包的 Python：命令前面写 `.venv\Scripts\python` |
| Python 包 | ✗ | `.venv\Scripts\python -m pip install -r requirements-win.txt` |
| 听写 | ✓ 但说「模型还没下」 | 正常：第一次听写时自动下（约 3 GB） |
| 降噪 | ! | 没装 clearvoice：这一期写 `voice.denoise: false`，或者重跑安装脚本 |
| ffmpeg | ✗ | `winget install -e --id Gyan.FFmpeg`，关掉窗口重开 |
| 变速（rubberband） | ! | 用的是兜底的 audiotsm，音质差一点：重跑安装脚本 |
| Node.js | ✗ | 要 22.12 以上：`winget upgrade -e --id OpenJS.NodeJS.LTS`，关掉窗口重开 |
| puppeteer / 渲染用的 Chrome | ✗ | 重跑安装脚本（或第 13 节） |
| 舞台字体 | ✗ | `.venv\Scripts\python -m chonggu fetch-assets` |
| 磁盘 | ✗ / ! | 少于 10 GB 是 ✗，少于 30 GB 是 !：清空间，或者把工具包挪到大的盘 |
| 内存 | ! | 不到 16 GB：渲染开少一点（第 7 节 `render.workers`） |
| gh（GitHub 命令行） | · | 发布时才要（第 11 节） |

> **跟 Claude Code 说：**「跑 .venv\Scripts\python -m chonggu doctor --json，把 ✗ 的逐项修好，修完再跑一遍 doctor 给我看。要装软件、要花钱、要输密码的先问我。」

## 5. 下载素材

安装脚本已经下过一次。没下全、或者换了网络，再跑：

```powershell
.venv\Scripts\python -m chonggu fetch-assets
```

- 自动下载的只有 `assets\manifest.json` 里有直链的：Freesound 的 CC0 音效、示例期的录音和配乐，还有字体（约 42 MB，放进 `stage\fonts\`）。
- 放在你自己的缓存 `%LOCALAPPDATA%\chonggu\assets`，不进仓库。
- 每个文件都按 sha256 核对。对不上的不要，算失败。
- Pixabay 的配乐都要在浏览器里手动下载（Pixabay 的条款第 8 条不许用程序自动下载、批量复制），屏幕上会列出作品页地址。示例期用不到它们，可以先不管。用到的那一期：在浏览器里打开作品页点 Download，再 `.venv\Scripts\python -m chonggu fetch-assets --from 下载文件夹`（按文件名里的编号认，按 sha256 核对）。
- 只要某一期用得到的：`.venv\Scripts\python -m chonggu fetch-assets demo`。

## 6. 先做示例期

```powershell
.venv\Scripts\python -m chonggu build demo
```

示例期是工具包自带的一期：35 秒，两章，六句。口播是 Wikimedia Commons 上一段公有领域（CC0）的普通话录音，配乐和音效也是 CC0，画面只用舞台自带的零件。它用来确认整条流水线在你电脑上能跑通。

它会依次跑：查稿子 → 口播 → 整句核对 → 时间线 → 渲染 1080p → 混音 → 检查 → 打包。
第一次要下载听写模型（约 3 GB），**10–30 分钟**；以后几分钟。Windows 上还没有实测过准确的时间。

做完看 `C:\chonggu-kit\episodes\demo\out\`：

| 文件 | 是什么 |
|---|---|
| `重估_第99期_示例_v1_1080p.mp4` | 成片 |
| `第99期v1_完整版_手机.mp4` | 完整手机版（小于 29.5 MiB，发手机上戴耳机看） |
| `第99期v1_手机_1of1_全片.mp4` | 手机版分段 |
| `v1_novo.mp4` | 画面加配乐，没有口播 |
| `编辑包_v1\` | 逐句口播、整条口播、没有口播的画面，和一份说明 |
| `qa\qa_v1.txt` | 检查报告：跑了哪些检查、每项过没过 |

打开成片看一遍：有字幕、有画面、有声音、有配乐，就是跑通了。

**它要是停在 check-voice：** 你的电脑用的听写和 Mac 不一样，可能听错一两个字，于是门槛拦下来让人听。这正好练一次第 9 节：打开 `episodes\demo\voice\flags.tsv`，听那句，没问题就把 `open` 改成 `ok`，再跑 `build demo --from check-voice`。

> **跟 Claude Code 说：**「跑 build demo。停了就告诉我停在哪一步、屏幕上怎么说的、要我做什么。做完把 out\qa\qa_v1.txt 念给我听，抽三帧成片的画面给我看。」

## 7. 开新的一期

```powershell
.venv\Scripts\python -m chonggu new ep9 --number 9 --title 英伟达财报 --host 你的名字
```

- `ep9` 是这一期的短名：文件夹名，也会用在文件名里。只用字母、数字、汉字、`-` `_` `.`，不能有空格。
- `--title` 是成片文件名里的标题：`重估_第9期_英伟达财报_v1_1080p.mp4`。

建好的文件夹 `episodes\ep9\`：

| 文件 | 是什么 | 谁改 |
|---|---|---|
| `episode.yaml` | 这一期的全部设置 | 你和 Claude Code |
| `script.md` | 稿子 | 你写，Claude Code 帮查 |
| `ch\` | 每章的画面代码（`ch\<前缀>.js`） | Claude Code |
| `music\plan.json` | 配乐编排 | Claude Code，你听 |
| `assets\` | 你的录音、这一期自己的素材（不进 git） | 你放录音，Claude Code 放素材 |
| `voice\`、`out\` | 中间结果和成片（不进 git） | 程序 |

### episode.yaml 每一项

用记事本或 VS Code 打开。写法：`键: 值`，**冒号后面要有一个空格**；缩进用空格，不用 Tab；`#` 后面是说明，程序不看；值空着就是用默认。
下面写 `voice.denoise` 的，意思是 `voice:` 那一段下面缩进的 `denoise:`。一个键只写一次：要改就改原来那一行，不要在文件末尾再写一个 `voice:`。
改完跑 `script-check`，它先查这个文件写得对不对，每一处错都会列出来。

**基本**

| 键 | 意思 | 例子 |
|---|---|---|
| `number` | 第几期 | `9` |
| `slug` | 短名（和文件夹名一样） | `ep9` |
| `title` | 成片文件名里的标题 | `英伟达财报` |
| `version` | 版本。每重出一次成片加一 | `v1`、`v2` |
| `host` | 主讲（片尾、封面署名、简介里用） | |
| `date` | 发布日期，不写就用发布那天 | `2026-11-20` |
| `script` | 稿子文件 | `script.md` |
| `estimate.rate` | 还没录音时，按每秒几个字估时间线 | `6.1` |

**口播**

| 键 | 意思 | 一般 |
|---|---|---|
| `voice.recording` | 你的原始录音，相对这一期的文件夹 | `assets/rec.m4a` |
| `voice.denoise` | 降噪。没装 clearvoice 就写 `false` | `true` |
| `voice.pause_cap` | 一句话中间超过这么长的停顿，收到这么长（秒） | `0.3` |
| `voice.max_tempo` | 最多提速几倍（变速不变调）。再快字就赶了 | `1.22` |

**原声句、呼吸点、新闻插段**

- `quotes`：当事人原话的录音（新闻、采访里截的）。你不念，字幕写中文译文。每一句在这里登记一次：`x3q: {file: assets/quotes/x3q.wav, dur: 3.0, speaker: 某人, src: 某台 · 2026.1}`。`file` 是文件，`dur` 是几秒，`speaker` 是谁说的，`src` 是画面左下角的出处。
- `breath`：这句开口前多空几秒。新镜头在空档里先进来，配乐在气口里抬起来。例：`x4: 1.2`。
- `interludes`：大转折处你不说话，只放几段新闻和采访原声。按章的前缀写，放在那一章第一句开口前的长气口里（那一句的 `breath` 要 15 秒左右）。版式 `wall` / `feed` / `cinema`。这个要 Claude Code 去找素材、切片段，你点头就行。

**章节和树**

- `chapters`：每章一行：`{pre: nx, name: 下一代, file: ch/nx.js, branch: next}`。`pre` 是前缀（小写字母），`name` 是章名，顺序和稿子里的「## 章名 | 前缀」一模一样。不写这一段，就按稿子来。
- `branches`：整期是一棵树，几根树枝（比如「钱」「方向盘」）。`money: {label: 钱, pal: money}`：`label` 是左上角小标签上的字，`pal` 是配色。
- `title_card`：片名卡（「这里是《重估》，我是……」那一下）：`{text: 只是工具？, sub: 英文副标题}`。

**配乐**

- `music.plan`：配乐编排文件，默认 `music/plan.json`。一段一首曲子，说话时压低，气口里抬起来。Claude Code 写，你听。
- `music.loudness`：成片响度。默认 −15 LUFS，一般不改。

**渲染**

| 键 | 意思 | 一般 |
|---|---|---|
| `render.fps` | 帧率。只能 30 | `30` |
| `render.res` | 出哪几种。`[1080]` 只出 1080p；`[1080, 1440]` 再出 2K | `[1080]` |
| `render.workers` | 同时开几个浏览器截图。内存 16 GB 写 `3`，32 GB 写 `6` | 空着 = 1080p 6 路、2K 5 路 |
| `render.stable`、`tol`、`gpumem` | 防半帧的参数 | 空着（用第 8 期定下的稳妥值） |

**打包、封面、简介、发布、检查**

- `pack.phone_parts`：手机版怎么分段，例 `[{name: 1of3_开头, chapters: [x, rv]}]`。不写就按章凑，每段不超过 3 分半。
- `cover`：封面上的字。`headline` 大标题，`big` 一个大数字或短词，`sub` 两行小字，`tag` 标题上面的红色小标签。
- `intro`：`titles` 三个标题（第一个是推荐），`short` 三行短版简介，`long` 长版，`tags` 标签（`#重估播客` 每期自动带）。
- `publish`：`repo` 是 GitHub 仓库（`用户名/仓库名`），`branch` 默认 `output`，`asset_slug` 是 Release 里文件名用的英文短名。
- `qa.allow`：你看过、确认是故意的报警（比如一段故意的快剪），写在这里，检查就不再拦。

### script.md 怎么写

```markdown
# 第 9 期 · 口播稿

（第一个「## 」之前的字程序不管，写标题和说明）

## 开头 | x

【画面：开场的第一个镜头】
x1 第一句话。
x2 第二句，
（停 0.4）
【原声：某人，某台 2026-01】
x3q 这里写原声的中文字幕。
x4 这里是《重估》，我是主讲人。

## 钱 | rv

rv01 这一章的第一句。
```

- `## 章名 | 前缀`：开一章。前缀是小写字母。
- 一行一句：句子 id、空格、句子。字幕就是这句。id 一般用这章的前缀开头（`rv01`），原声句用 `q` 结尾。
- `（停 0.4）`：上一句后面多停多久（秒）。
- `【……】`：画面提示，不念，单独一行。
- `【原声：谁，出处】`：下一行是当事人原声，写中文字幕。原声句都要在 `episode.yaml` 的 `quotes` 里登记。

写完：

```powershell
.venv\Scripts\python -m chonggu script-check ep9
```

它查格式、查 id 有没有重复、原声句有没有登记，再按每秒 6.1 个字估一条时间线 `timeline.json`。还没录音，Claude Code 就可以先拿这条估算的时间线做画面；录了音以后，画面自动跟上真声。

## 8. 一期从头到尾：你做什么，Claude Code 做什么

| # | 这一步 | 你 | 跟 Claude Code 说 |
|---|---|---|---|
| 1 | 开工单 | 定参考片、语气、目标时长（建议 12–16 分钟）、单人还是双人、出不出 2K、管不管平台风险、勾不勾「内容由 AI 生成」、哪些事它可以直接做 | 「我们开第 9 期，先一起填开工单，把你自己做的假设逐条列出来让我确认。」 |
| 2 | 稿子 | 写，或者改它的初稿；自己念一遍，拗口的改掉 | 「核一遍稿子里每个数字和原话的出处；把纯口播全文贴在对话里给我改；列一张难读词表（英文名、人名、法名）。」 |
| 3 | 查稿子 | — | 「跑 script-check ep9，有错就改到过。」 |
| 4 | 画面 | 看开场样片，说行还是不行 | 「一章派一个代理写 ch\*.js，每个代理只改自己那一章。先做开场那一章，抽几帧、渲一段样片给我看，我点头了再铺开。」 |
| 5 | 录音 | 照下面「怎么录」一次念完 | — |
| 6 | 交录音 | 录音放进 `episodes\ep9\assets\rec.m4a`；说清哪几句改了词、哪几句没念 | 「录音放好了。我改了这几句……没念这几句……开始 build ep9。」 |
| 7 | 门槛 | 它停下来让你听的地方，戴耳机听，说哪些没问题 | 「把要我听的地方切成小段给我，一句一个文件。」 |
| 8 | 看片 | 戴耳机用手机从头看完 `out\第9期v1_完整版_手机.mp4`，按「分:秒 + 问题」列出来 | 「这是我看片的意见……每一条都改，同类的地方也全查一遍。」 |
| 9 | 封面简介 | 挑封面和标题 | 「出 3 个封面方案（至少一个带大数字）和 3 个标题，用同一个钩子。」 |
| 10 | 发布 | 说「可以发」 | 「可以发。」（它才会真传） |

### 怎么录（录音时多花 1 分钟，剪辑能省 1 小时）

- **一次把整稿念完。**
- 一句一句念。念完一句**停半秒以上**再念下一句。
- 念错了：停 1–2 秒，**从这句的开头整句重念**。不要从错的那个词接着说，也不要半句接半句。程序取每句**最后完整的那一遍**。
- 照平时跟朋友讲事的速度念，不用赶。后期会收停顿、再提速，成片约 300 字/分。
- 原声句（`q` 结尾的）跳过不念。
- 难读词照词表念。《重估》念 chóng。
- 可以临场改词、跳句。录完告诉 Claude Code 改了哪几句、哪几句没念。**事实性的词不要临场改**（法名、数字、人名）。
- 设备：手机的录音 App 就够。手机离嘴 20–30 厘米，别碰桌子和衣服；找安静的房间，关空调和风扇。
- 录完自己听开头、中间、结尾各 30 秒：没有喷麦，没有一直响的底噪。
- 传到电脑：微信电脑版的「文件传输助手」、网盘、数据线都行。**不要发成语音消息**（音质会被压坏）。
- 放进 `episodes\ep9\assets\`，文件名和 `episode.yaml` 的 `voice.recording` 对上（默认 `assets/rec.m4a`）。

现在的口播流水线只认**一条单人录音**。双人期还没有现成的做法，开工前先和另一位主讲商量。

### 跑起来

```powershell
.venv\Scripts\python -m chonggu build ep9
```

从查稿子一路做到打包。停了就看第 9 节。改好以后从停的那一步接着跑（屏幕上会写好这条命令，开头写的是 `python -m chonggu`，你照样在前面换成 `.venv\Scripts\python -m chonggu`）：

```powershell
.venv\Scripts\python -m chonggu build ep9 --from check-voice
```

口播那几步有缓存：输入没变就跳过，重跑不会重新听写、重新拼。

## 9. 门槛没过怎么办

屏幕最后会有一行「✗ 没过：……」，下面一行是「改好以后接着跑：……」。

| 停在 | 屏幕上说 | 你要做 | Claude Code 要做 |
|---|---|---|---|
| script-check | episode.yaml 有 N 处不对 / 稿子检查 N 处没过 | — | 照列出来的每一处改 |
| voice | 这些小句在录音里没找到 | 说那句你念了没有 | 在 `voice\ovr.json` 里给出录音里的起止，或者标成没念 |
| voice | 拆段查重：有念了半句又重念的地方 | 听那几秒 | 改成只用最后完整的那一遍，或者你听过没问题就标 ok |
| voice | 静音前后逐字比：有句子少了字 | 听那句 | 在 `voice\seams_review.json` 里把那截留着 |
| check-voice | 整句核对：N 处还是 open | 一句句听 | 把要听的切给你，照你说的改 |
| timeline | 口播和 timeline.json 的句子对不上 | — | 稿子在录音以后改过：重跑 voice |
| render | 画面代码有语法错误 / 引用的字找不到 / 这几章还没有画面代码 / 页面有错 | — | 改那一章的 ch\*.js |
| render | 长度差 0.2 秒以上 / 卡住了 | — | 看日志，重渲那一章 |
| mix | 配乐编排没过 / 找不到素材 | — | 改 `music\plan.json` 的数，或者 fetch-assets |
| qa | 检查没过 N 项 | — | 打开 `out\qa\qa_v1.txt`，逐项改 |
| pack | 压不到 29.5 MiB | — | 那一段分小一点（`pack.phone_parts`） |
| publish | 不能发 | — | 成片在检查之后改过：重跑 qa |

### 听 flags.tsv

要人听的地方都记在 `episodes\ep9\voice\flags.tsv`，一行一处：

```
status  kind    id    key   detail
open    line    rv12  ...   听「……」 稿「……」
```

- `kind` 是哪一类：`take` 取段、`clip` 接缝切到邻句、`repeat` 念了半句又重念、`mute` 静音以后少字、`line` 整句核对。
- 每一处听过以后，把 `open` 改成 `ok`（没问题）或 `fixed`（已经改好）。**还是 open 的，会挡住下一步。**
- 用记事本改，存成 UTF-8。不要用 Excel 改（会把格式存坏）。也可以听完告诉 Claude Code 哪几条没问题，让它改。
- 一期有二十来处 `line` 是正常的：大多是听写把一个字听成了同音字、把人名听错。真正要你决定的是三种：
  1. 你念的和字幕不一样，但你念的是对的 → 字幕跟着录音改。
  2. 你念错了事实（法名、数字、人名）→ 补录这一句，或者字幕和画面一起更正。
  3. 只是听写听错了 → `ok`。

Claude Code 听不到声音。**好不好听、念没念对、音乐大不大，以你戴耳机听的为准。**

## 10. 改一处，只重跑一步

| 改了什么 | 跑什么 |
|---|---|
| 一章的画面 | `render ep9 --only nx` → `qa ep9` → `pack ep9` |
| 只换音乐、调音量 | `mix ep9` → `qa ep9` → `pack ep9`（不用重渲） |
| 字幕、口播 | `build ep9 --from voice`（时间变了的章都要重渲） |
| 封面、简介 | `cover ep9`、`intro ep9`（不渲） |
| 要 2K | 混好音以后 `render ep9 --res 2k`（自动配上同一条声音）→ `qa ep9` |
| 重出一版给别人看 | `episode.yaml` 的 `version` 加一（v2），再 build |

每条前面都是 `.venv\Scripts\python -m chonggu`。

## 11. 发布

**顺序固定，不能跳：**

1. `qa` 全过（`out\qa\qa_<版本>.txt` 里「结论」那一行写着「没过 0 项」）。
2. 你戴耳机用手机从头看完完整手机版，列出的问题全部改完。
3. **你说「可以发」。**
4. 这时才传 GitHub。

第一次发布前，装 GitHub 命令行并登录（会打开浏览器让你登录，账号是你自己的）：

```powershell
winget install -e --id GitHub.cli
gh auth login
```

`episode.yaml` 里填好 `publish.repo`（`用户名/仓库名`）和 `publish.asset_slug`（英文短名，比如 `nvidia_q3`）。先空跑：

```powershell
.venv\Scripts\python -m chonggu publish ep9
```

空跑只读不写，打印它会做什么：建哪个 Release、传哪几个文件、改 output 分支的哪几个文件。看一遍对不对。然后：

```powershell
.venv\Scripts\python -m chonggu publish ep9 --yes
```

- 成片整个文件放进 GitHub Release（单个文件上限 2 GB，不拆段）。output 分支的 `第9期\` 放 README、两张封面、发布简介；根目录 README 的索引加一行。
- 上传约 2.3 MB/s：1080p 约 8 分钟，2K 约 15 分钟。**上传中不要关窗口、不要停。** 万一断了，再跑同一条命令：旧文件一直留着，等新文件传完、核对过才换下来，下载链接不变。
- 只能传 qa 查过的那一份。查完以后成片又改过，它会拒绝，要再跑一遍 qa。

然后在平台上发：

- 从 Release 下载成片（B 站用 2K，有的话；抖音先用 1080p）。
- 封面在 output 分支的 `第9期\`：横屏用「16比9」，竖屏和小红书用「3比4」。
- 标题用 `发布简介_第9期.md` 里的第 1 个，简介用里面的短版。
- 「内容由 AI 生成」照开工单定的勾。放进《重估》合集。

## 12. 公开仓库：哪些东西永远不提交

这个仓库是 **PUBLIC** 的，传上去谁都能下载。

**永远不提交：**

- 录音（你的、别人的）、原声片段。
- 配乐、音效文件（仓库里只有 `assets\manifest.json` 这份下载清单）。
- 新闻和采访视频、实拍、照片、截图、招股书和报告的截图。
- 成片、手机版、编辑包（`out\`），口播中间结果（`voice\`），这一期的素材（`assets\`）。
- 任何人的私人信息：邮箱、电话、`C:\Users\你的名字` 这类本机路径、账号、密码、token。

`.gitignore` 已经挡住了上面大部分。**不要用 `git add -f` 硬加。**

要提交之前：

```powershell
git status
```

看一遍列出来的每个文件。新加的配乐或音效，只能登记进 `assets\manifest.json`（地址、作者、授权、sha256），文件本身不提交；只登记授权允许的（Pixabay、Freesound CC0），并且在作品页上核过曲名、作者、授权（Pixabay 的 url 写 null，文件手动下）。授权不清楚的放这一期自己的 `assets\`（只在你电脑上），并在 `episodes\ep9\CREDITS_第9期.md` 记一行出处。

> **跟 Claude Code 说：**「提交之前扫一遍：有没有媒体文件、本机路径、邮箱、账号、token，有没有授权没核过的素材。列给我看，我说可以再提交。提交信息不要加署名尾行。」

## 13. Windows 上常见的坑

| 现象 | 怎么办 |
|---|---|
| 刚装完的程序「找不到」 | 关掉 PowerShell，重新开一个 |
| 屏幕上中文是乱码 | 用「终端」（Windows Terminal）开 PowerShell；工具包自己会用 UTF-8 输出 |
| Python 包下得很慢 | `.venv\Scripts\python -m pip install -r requirements-win.txt -i https://pypi.tuna.tsinghua.edu.cn/simple` |
| npm 下得很慢 | `cd stage`，`npm.cmd config set registry https://registry.npmmirror.com`，再重跑安装脚本 |
| 听写模型、降噪模型下不动 | 设 `HF_ENDPOINT` 为 `https://hf-mirror.com`（没实测过；怎么设见下面「设置怎么留住」） |
| Chrome for Testing 下不来 | 设 `CHONGGU_CHROME` 为一个已经装好的 Chrome 的 `chrome.exe`（安装脚本找得到电脑上的 Chrome 时会自动设） |
| 听写特别慢（没有 NVIDIA 显卡） | 设 `CHONGGU_ASR_MODEL` 为 `large-v3-turbo`：快几倍，中文略差 |
| 有 NVIDIA 显卡但不想装 CUDA 版 torch | 设 `CHONGGU_NO_CUDA` 为 `1`，再跑安装脚本 |
| 用户名是中文（`C:\Users\张三`） | 设 `HF_HOME` 为 `C:\chonggu-cache\hf`：听写模型不放在带中文的文件夹里 |
| 改了 `flags.tsv` 以后报「正被 Excel 打开着」 | 关掉 Excel 再跑。用记事本改（Excel 存的会变成 GBK，工具包能读，但下次会存回 UTF-8） |
| 混音、打包最后报「换不掉 / 删不掉：正被打开着」 | 播放器、资源管理器的预览窗格开着上一版的成片或编辑包：关掉再跑那一步 |
| 渲染时电脑很卡、内存满 | 把 `episode.yaml` 里 `render` 下面的 `workers` 改成 `3` |
| 渲染卡住不动 | 工具包 300 秒没动静会自己停掉那一章，重来一次；还不行把日志给 Claude Code 看 |
| 渲染很慢 | 渲染时别同时跑听写、混音；别在资源管理器里开着 `out\` 文件夹（它在给视频做缩略图）；笔记本插上电 |
| 渲到一半电脑睡着了 | 「设置 → 系统 → 电源」里把插电时的睡眠改成「从不」，渲完再改回来 |
| 文件名报错 | 标题、短名、版本里不能有 `< > : " / \ | ? *` |
| PowerShell 里 `&&` 报错 | 老版本 PowerShell 不认 `&&`：一行一条命令 |
| 路径太长 | 工具包放在 `C:\chonggu-kit` 这种短路径 |

### 设置怎么留住

在 PowerShell 里打 `$env:名字='值'` 只管这一个窗口：关掉就没了，Claude Code（在 Windows 上用 Git Bash 跑命令）也看不到。要一直有效，用下面两种之一：

1. **写进工具包的本机设置（推荐）**：在 `C:\chonggu-kit` 里新建一个文本文件 `chonggu.local.yaml`（记事本存成 UTF-8），一行一个：

   ```yaml
   CHONGGU_CHROME: C:\Program Files\Google\Chrome\Application\chrome.exe
   HF_ENDPOINT: https://hf-mirror.com
   CHONGGU_ASR_MODEL: large-v3-turbo
   ```

   工具包每次启动都会读它（安装脚本也读），不管是哪个终端跑的。已经设了的环境变量不会被它盖掉。它不进 git（`.gitignore` 挡住了），只在你这台电脑上。

2. **写进 Windows 的用户环境变量**：

   ```powershell
   [Environment]::SetEnvironmentVariable('CHONGGU_CHROME', 'C:\Program Files\Google\Chrome\Application\chrome.exe', 'User')
   ```

   设完要关掉终端重开，Claude Code 也要重启。`HF_ENDPOINT`、`CHONGGU_ASR_MODEL`、`CHONGGU_NO_CUDA`、`HF_HOME` 都一样。

还是不行：先跑 `doctor`，把它和出错的那几行一起给 Claude Code 看。

## 14. 每一步大概多久

下面是第 8 期（16 分钟成片、24 分钟录音）在一台 18 核 Mac 上的数。Windows 上没有实测过：没有 NVIDIA 显卡时，听写和降噪会慢好几倍；渲染看 CPU 核数。

| 步骤 | 用时 |
|---|---|
| 安装（第一次） | 30–60 分钟（看网速） |
| 示例期 build | 第一次 10–30 分钟（要下听写模型），以后几分钟 |
| 降噪 | Mac 不到 1 分钟；只用 CPU 时 20 分钟的录音要十几二十分钟 |
| 口播（voice + check-voice + timeline，没有缓存） | 约 7–8 分钟；输入没变的重跑 2 秒 |
| 渲染 1080p | 约 20 分钟 |
| 渲染 2K | 约 24 分钟 |
| 混音 | 约 2 分钟 |
| 检查 qa | 几分钟（整片画面要扫一遍） |
| 打包 | 约 4 分钟 |
| 上传 | 1080p 约 8 分钟，2K 约 15 分钟 |

真正花时间的是返工的轮数。稿子定了再录音，开场样片点头了再做全片，最省。
