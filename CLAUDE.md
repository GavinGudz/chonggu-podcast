# 给在这个文件夹里干活的 Claude Code

这是《重估》出片工具包（chonggu-kit）。主讲第一次打开时多半会说：「按 CLAUDE.md 把环境装好，跑通示例期」。照下面做。

**一直用中文回复主讲**，句子短，少用术语。

## 先读

1. `docs/skill/SKILL.md`：做视频的说明书（命令、门槛、硬规矩、踩过的坑）。把它复制成 skill，以后每次都会自动用上：
   - Windows PowerShell：`New-Item -ItemType Directory -Force .claude\skills\chonggu-kit | Out-Null; Copy-Item docs\skill\SKILL.md .claude\skills\chonggu-kit\SKILL.md`
   - Mac：`mkdir -p .claude/skills/chonggu-kit && cp docs/skill/SKILL.md .claude/skills/chonggu-kit/`
2. 主讲用 Windows 的话，`docs/上手指南_Windows.md` 第 13 节「Windows 上常见的坑」。

## 第一次：装好环境，跑通示例期

按顺序做，每一步做完跟主讲说一句结果。要装软件、要管理员权限、要花钱、要下大文件（听写模型约 1.6 GB）之前，先问主讲。

1. **看位置。** 工具包要放在短路径、全英文、不在 OneDrive 里的地方，比如 `C:\chonggu-kit`。不是的话，先请主讲挪过去，再接着做。
2. **一键安装。** Windows：`powershell -ExecutionPolicy Bypass -File .\install_windows.ps1`；Mac：`sh install_mac.sh`。脚本可以反复跑。
3. **自检。** `.venv\Scripts\python -m chonggu doctor`（Mac：`.venv/bin/python -m chonggu doctor`）。有 ✗ 就照它给的修法修，修完再跑，直到没有 ✗。! 是提醒，可以先往下走。
4. **下素材。** `... -m chonggu fetch-assets demo`。只会自动下 Freesound 的 CC0 音效、示例期的录音和配乐、开源字体。Pixabay 的配乐**不许用程序下载**：只把作品页链接给主讲，请他在浏览器里下。
5. **跑示例期。** `... -m chonggu build demo`。Windows 第一次大约 10–30 分钟（要下听写模型）。成片在 `episodes/demo/out/重估_第99期_示例_v1_1080p.mp4`，检查报告在 `episodes/demo/out/qa/qa_v1.txt`。
6. **交给主讲看。** 告诉他成片在哪，让他自己打开看一遍、听一遍。报告里有 ✗ 的话，先修好再交。

卡住时：

- 先看屏幕上「✗ 没过：……」那一行，它写着怎么改、从哪一步接着跑。门槛没过不是 bug，**不要绕过门槛，也不要改门槛的数**。
- 国内网络下载慢或失败：听写模型可以用镜像（`HF_ENDPOINT`）；Chrome 下不来时，把本机 Chrome 的路径设进 `CHONGGU_CHROME`。设法见上手指南第 13 节，要设成长期有效的那种。
- 文件被占用（`PermissionError`、`WinError 32`）：请主讲关掉正开着这个文件的播放器、Excel、资源管理器预览，再跑一次。
- 真是工具包的毛病（Windows 上的路径、编码、找不到程序这类）：在 `chonggu/` 或 `stage/` 里改，改完跑 `.venv\Scripts\python -m pytest -q`，全过再跟主讲说改了什么。这个工具包还没在 Windows 实机上跑过，遇到这类问题是预料之中的。

## 硬规矩（细则在 SKILL.md）

- **这个仓库是公开的。** 只提交代码、文档和配置。录音、成片、配乐、音效、照片、截图、字体文件、招股书页面、`episodes_local/`、`*.local.json`、`chonggu.local.yaml`、钥匙和 token、本机路径、任何人的私人信息，一律不提交。提交前跑 `git status` 看一遍要提交的东西。
- **推 GitHub、发消息、装软件、下新模型**，先问主讲。
- **主讲说「可以发」才上传**；`publish` 默认只列计划，真传要加 `--yes`。
- 报钟点、日期之前先看钟（`Get-Date` / `date`）。
- 说「好了」「修好了」之前，自己先看过成片的画面、听过声音；只说你真查过的东西。

## 文件夹

- `chonggu/`：命令（`python -m chonggu <命令>`，`-h` 看选项）
- `stage/`：画面渲染（每章一个 `ch/<前缀>.js`）
- `episodes/_template/`：新一期的模板（`new` 会复制它）
- `episodes/demo/`：示例期
- `docs/`：上手指南、命令说明、说明书
- `tests/`：自动测试（`pytest -q`）
