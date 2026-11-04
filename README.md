# 《重估》出片工具包（chonggu-kit）

把一期《重估》从稿子做到成片：查稿子、剪口播、按字排时间线、网页逐帧渲染画面、按情绪编排混音、交付前检查、手机版和编辑包、封面和简介、传到 GitHub Release。
Windows 和 Apple 芯片的 Mac 都能跑，所有流程是 Python，渲染用 Node（puppeteer 自带的 Chrome）。

每一步都有自动门槛。没过就停，屏幕上写着哪里不对、改好以后从哪一步接着跑。

## 一屏上手

Windows（在工具包文件夹里打开 PowerShell）：

```powershell
powershell -ExecutionPolicy Bypass -File .\install_windows.ps1
.venv\Scripts\python -m chonggu doctor
.venv\Scripts\python -m chonggu fetch-assets
.venv\Scripts\python -m chonggu build demo
.venv\Scripts\python -m chonggu new ep9 --number 9 --title 标题 --host 主讲
```

Mac（在工具包文件夹里打开「终端」，先装好 Homebrew）：

```sh
sh install_mac.sh
.venv/bin/python -m chonggu doctor
.venv/bin/python -m chonggu fetch-assets
.venv/bin/python -m chonggu build demo
.venv/bin/python -m chonggu new ep9 --number 9 --title 标题 --host 主讲
```

- 安装脚本可以反复跑，装好的会跳过。
- `doctor` 没有 ✗ 才往下走。
- `build demo` 做的是示例期（35 秒，两章，录音和配乐、音效全是 CC0；念的文字是维基百科的，CC BY-SA 3.0）。做完看 `episodes/demo/out/`：成片 `重估_第99期_示例_v1_1080p.mp4`，检查报告 `qa/qa_v1.txt`。

自动测试（CI）的配置在 `ci/demo.yml`，还没启用，启用方法见 [ci/README.md](ci/README.md)。

## 一期怎么走

| 步骤 | 命令 | 谁做 | 门槛（没过就停） |
|---|---|---|---|
| 新建 | `new` | 代理 | 短名合法，文件夹不重名 |
| 稿子 | `script-check` | 主讲写，代理查 | 格式对、句子 id 不重复、原声句都登记了 |
| 画面 | `stills`、`render --only` | 代理（一章一个） | 语法检查、引用的字都在、页面不报错 |
| 录音 | — | 主讲 | 一次念完，念错整句重念 |
| 口播 | `voice` | 代理跑，主讲听 | 重念、静音少字、取段、接缝都处理过 |
| 核对 | `check-voice` | 代理跑，主讲听 | `voice/flags.tsv` 没有 open |
| 时间线 | `timeline` | 代理 | 口播和稿子的句子对得上 |
| 渲染 | `render` | 电脑 | 日志无错、每章时长差 < 0.2 秒 |
| 混音 | `mix` | 代理，主讲听 | 配乐编排合规 |
| 检查 | `qa` | 代理 | 响度、字速、气口、纯色帧、闪帧、出处…… |
| 打包 | `pack` | 电脑 | 手机版每段 < 29.5 MiB |
| 封面简介 | `cover`、`intro` | 代理做，主讲挑 | 有标题、有短版简介 |
| 发布 | `publish` | 主讲说「可以发」以后 | 传的就是 qa 查过的那份 |

`build` 把「稿子」到「打包」串起来，停在第一个没过的门槛。每条命令的输入、输出、门槛和用时见 [docs/命令说明.md](docs/命令说明.md)。

## 文件夹

```
chonggu/          Python 包：python -m chonggu <命令>
stage/            渲染舞台：render.mjs、画面零件（lib/、树、3D 空间、新闻插段）、开源字体
assets/manifest.json   配乐、音效的下载清单（地址、作者、授权、sha256），文件本身不在仓库里
episodes/_template/    新一期的模板
episodes/demo/         示例期
docs/             上手指南、命令说明、给 AI 代理的说明书（skill）
tests/            测试
```

一期一个文件夹 `episodes/<短名>/`：`episode.yaml`（这一期的全部设置）、`script.md`（稿子）、`timeline.json`、`ch/*.js`（每章的画面）、`music/plan.json`（配乐编排）。
录音、素材、中间结果、成片在 `assets/`、`voice/`、`out/`，只在自己电脑上，不进 git。下载的配乐和音效在每个人自己的缓存里（Windows `%LOCALAPPDATA%\chonggu`，Mac `~/Library/Caches/chonggu`）。

## 这个仓库是公开的

谁都能看、能下载。只放代码、开源字体的登记、文档和素材清单。

永远不提交：录音、配乐和音效文件、新闻和采访片段、照片和截图、成片、任何人的私人信息（邮箱、电话、本机路径、账号）。`.gitignore` 已经挡住了大部分，不要用 `git add -f` 绕过去。提交之前看一遍 `git status`。

## 文档

- [docs/上手指南_Windows.md](docs/上手指南_Windows.md)：从一台什么都没装的 Windows 电脑开始，到做出第一期、发出去。
- [docs/上手指南_Mac.md](docs/上手指南_Mac.md)：Mac 上的差别。
- [docs/命令说明.md](docs/命令说明.md)：每条命令的输入、输出、门槛、用时。
- [docs/skill/SKILL.md](docs/skill/SKILL.md)：给 Claude Code 的说明书（触发词、命令表、硬规矩、踩过的坑）。

## 授权

代码的授权还没定：仓库根目录还没有 LICENSE 文件，在加上之前默认保留所有权利（主讲和仓库主人选定以后补上，pyproject.toml 里一起写）。

字体不随仓库分发，`fetch-assets` 照 `stage/fonts/FONTS.json` 下载（SIL Open Font License 1.1）。配乐和音效也不随仓库分发，各自的授权登记在 `assets/manifest.json`（Pixabay 的配乐要在浏览器里手动下载，见上手指南）。

`episodes/demo/script.md` 是中文维基百科「无盐村」条目的文字，按 CC BY-SA 3.0，不在代码的授权之内；示例期的成片（念出来的文字和字幕）同样按 CC BY-SA 3.0。出处见 `episodes/demo/CREDITS_第99期.md`。
