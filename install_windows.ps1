# 《重估》出片工具包 · Windows 一键安装（可以反复跑：已经装好的会跳过）
# 用法：在工具包文件夹的空白处按住 Shift 点右键 →「在终端中打开」（或「在此处打开 PowerShell 窗口」），粘贴下面这行回车：
#   powershell -ExecutionPolicy Bypass -File .\install_windows.ps1
# 做的事：
#   1. winget 装 Git、Python 3.12、Node.js LTS、FFmpeg（Gyan 完整版，带 libx264、loudnorm、rubberband）
#   2. 下载 rubberband 命令行（官方 zip，校验 sha256，解到 %LOCALAPPDATA%\chonggu\bin）：变速不变调用它
#   3. 建虚拟环境 .venv，装 Python 包（requirements-win.txt：faster-whisper 听写；有 NVIDIA 显卡再装 CUDA 版 torch）和降噪（clearvoice）
#   4. stage\ 里 npm ci，装 puppeteer 用的 Chrome for Testing
#   5. 下载 Freesound 的 CC0 音效、示例期的录音和配乐、字体（python -m chonggu fetch-assets），最后环境自检（python -m chonggu doctor）。
#      Pixabay 的配乐不自动下（它的条款不许程序下载）：要用的那一期，在浏览器里手动下载，再 fetch-assets --from <下载文件夹>
# 跑这个脚本，等于你接受 winget 和 Git、Python、Node.js、FFmpeg（GPL）、rubberband（GPL）各自的许可协议
# （winget 带了 --accept-source-agreements --accept-package-agreements，装的时候不再一个个问）。
# 这个文件要存成「UTF-8 带 BOM」，不然 Windows 自带的 PowerShell 5 读出来中文是乱码。

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'          # 不然 Invoke-WebRequest 的进度条会让下载慢几十倍
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$env:PYTHONUTF8 = '1'
# 以后新开的终端（包括 Claude Code 在 Windows 上用的 Git Bash）里的 Python 也默认 UTF-8：中文 Windows 不设它，Python 按 GBK 读写文本
[Environment]::SetEnvironmentVariable('PYTHONUTF8', '1', 'User')

$Kit = $PSScriptRoot
Set-Location -LiteralPath $Kit
# 工具包的本机设置 chonggu.local.yaml（一行一个「环境变量: 值」，和 python -m chonggu 读的是同一份）：CHONGGU_NO_CUDA、CHONGGU_CHROME 这些装的时候就要用
$Local = Join-Path $Kit 'chonggu.local.yaml'
if (Test-Path -LiteralPath $Local) {
  foreach ($ln in Get-Content -LiteralPath $Local -Encoding UTF8) {
    if ($ln.TrimStart().StartsWith('#') -or $ln -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*(.*?)\s*$') { continue }
    $k = $Matches[1]; $v = $Matches[2]
    if ($v.Length -ge 2 -and $v[0] -eq $v[-1] -and "'`"".Contains($v[0])) { $v = $v.Substring(1, $v.Length - 2) } elseif ($v.Contains(' #')) { $v = $v.Split(@(' #'), 2, [StringSplitOptions]::None)[0].TrimEnd() }
    if ($v -and -not (Test-Path -LiteralPath "Env:$k")) { Set-Item -LiteralPath "Env:$k" -Value $v }
  }
}
$Cache = Join-Path $env:LOCALAPPDATA 'chonggu'
$RbUrl = 'https://breakfastquay.com/files/releases/rubberband-4.0.0-gpl-executable-windows.zip'
$RbSha = 'f2d47fc64dbb42f6cc62edf7933ac4fa89d8f0ef8b9cf97b6afc263a7fe05644'
$TorchIndex = if ($env:CHONGGU_TORCH_INDEX) { $env:CHONGGU_TORCH_INDEX } else { 'https://download.pytorch.org/whl/cu128' }

function Say($m) { Write-Host ''; Write-Host "== $m" -ForegroundColor Cyan }
function Warn($m) { Write-Host "  ! $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host ''; Write-Host "✗ $m" -ForegroundColor Red; Write-Host '改好以后再跑一遍这个脚本（已经装好的会跳过）。'; exit 1 }
function Has($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
function Refresh-Path {   # winget 装完的程序只写进了系统设置里的 PATH，这个窗口要重新读一遍才找得到
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Use-Winget($verb, $id, $name) {   # 不能叫 Winget：PowerShell 不分大小写，会把 winget 命令本身盖住
  Say "$name（winget $verb $id）"
  & winget $verb -e --id $id --source winget --accept-source-agreements --accept-package-agreements --silent   # 只用 winget 源（msstore 源在国内常超时、证书出错）
  if ($LASTEXITCODE) { Warn "winget 返回 $LASTEXITCODE（已经装过、或者没有更新时也会这样，下面会再查一遍）" }
  Refresh-Path
}
function Find-Python {
  if (Has py) {
    $p = & py -3.12 -c "import sys; print(sys.executable)" 2>$null
    if ($LASTEXITCODE -eq 0 -and $p) { return ($p | Select-Object -Last 1).Trim() }
  }
  foreach ($p in @("$env:LOCALAPPDATA\Programs\Python\Python312\python.exe", "$env:ProgramFiles\Python312\python.exe")) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}
function Node-Major {
  if (-not (Has node)) { return 0 }
  $v = (& node --version) -replace '^v', ''
  return [int]($v.Split('.')[0])
}

Write-Host '《重估》出片工具包 · Windows 安装' -ForegroundColor Cyan
Write-Host "工具包：$Kit"

# ---------- 1. 系统工具 ----------
# 要装东西才要 winget：Git、Python 3.12、Node 22、FFmpeg 都已经有了就不用（Windows 10 LTSC、关了商店的公司电脑没有 winget）
$NeedWinget = (-not (Has git)) -or (-not (Find-Python)) -or ((Node-Major) -lt 22) -or (-not (Has ffmpeg))
if ($NeedWinget -and -not (Has winget)) {
  try { Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe -ErrorAction Stop; Refresh-Path } catch {}   # 新装的 Windows 11：应用安装程序还没注册
  if (-not (Has winget)) { Fail '没有 winget：打开 Microsoft Store，搜「应用安装程序」（App Installer）装上或更新' }
}
if (-not (Has git)) { Use-Winget 'install' 'Git.Git' 'Git' }
$Py = Find-Python
if (-not $Py) { Use-Winget 'install' 'Python.Python.3.12' 'Python 3.12'; $Py = Find-Python }
if (-not $Py) { Fail '装了 Python 3.12 还是找不到：关掉这个窗口，重新打开终端再跑一遍' }
Write-Host "  Python：$Py"
if ((Node-Major) -lt 22) {
  if (Has node) { Use-Winget 'upgrade' 'OpenJS.NodeJS.LTS' 'Node.js 升级到 LTS' } else { Use-Winget 'install' 'OpenJS.NodeJS.LTS' 'Node.js LTS' }
}
if ((Node-Major) -lt 22) { Fail 'Node.js 要 22 以上（渲染用的 puppeteer 25 要 22.12+）：关掉这个窗口重新打开再跑；还不行就到 https://nodejs.org 下载 LTS 版安装' }
if (-not (Has ffmpeg)) { Use-Winget 'install' 'Gyan.FFmpeg' 'FFmpeg（完整版）' }
if (-not (Has ffmpeg)) { Fail '装了 FFmpeg 还是找不到：关掉这个窗口，重新打开终端再跑一遍' }

# ---------- 2. rubberband 命令行 ----------
$Bin = Join-Path $Cache 'bin'
$Rb = Get-ChildItem -LiteralPath $Bin -Recurse -Filter 'rubberband.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not (Has rubberband) -and -not $Rb) {
  Say '下载 rubberband（官方 Windows 版，变速不变调）'
  New-Item -ItemType Directory -Force -Path $Bin | Out-Null
  $Zip = Join-Path $Bin 'rubberband.zip'
  try { Invoke-WebRequest -UseBasicParsing -Uri $RbUrl -OutFile $Zip } catch { Fail "rubberband 下载不下来：$($_.Exception.Message)（网络？）" }
  $h = (Get-FileHash -Algorithm SHA256 -LiteralPath $Zip).Hash.ToLower()
  if ($h -ne $RbSha) { Remove-Item -LiteralPath $Zip -Force; Fail 'rubberband 的 zip 校验不对（下载的文件被改过？），换个网络再试' }
  Expand-Archive -LiteralPath $Zip -DestinationPath $Bin -Force
  Remove-Item -LiteralPath $Zip -Force
  Write-Host "  放在 $Bin"
}

# ---------- 3. Python 环境 ----------
$VPy = Join-Path $Kit '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $VPy)) {
  Say '建虚拟环境 .venv'
  & $Py -m venv (Join-Path $Kit '.venv')
  if ($LASTEXITCODE -or -not (Test-Path -LiteralPath $VPy)) { Fail '.venv 没建成（看上面的报错）' }
}
Say '装 Python 包（requirements-win.txt）'
& $VPy -m pip install --upgrade pip
if ((Has nvidia-smi) -and -not $env:CHONGGU_NO_CUDA) {
  $cuda = & $VPy -c "import torch; print(torch.cuda.is_available())" 2>$null
  if ($cuda -ne 'True') {
    Say '有 NVIDIA 显卡：装 CUDA 版 torch（约 2.5 GB；降噪、听写快很多。不要就在 chonggu.local.yaml 里写 CHONGGU_NO_CUDA: 1，或在这个窗口里先 $env:CHONGGU_NO_CUDA=1 再跑）'
    & $VPy -m pip install torch torchaudio torchvision --index-url $TorchIndex
    if ($LASTEXITCODE) { Warn 'CUDA 版 torch 没装上：降噪和听写会用 CPU（慢一些，也能用）' }
  }
}
& $VPy -m pip install -r (Join-Path $Kit 'requirements-win.txt')
if ($LASTEXITCODE) { Fail 'Python 包没装上（看上面的报错）。网络慢可以用国内镜像：.venv\Scripts\python -m pip install -r requirements-win.txt -i https://pypi.tuna.tsinghua.edu.cn/simple' }
& $VPy -m pip install --no-deps -e $Kit
if ($LASTEXITCODE) { Warn '没装成 chonggu 命令（不要紧：在工具包文件夹里用 .venv\Scripts\python -m chonggu …）' }
Say '装降噪（clearvoice，会装 torch）'
& $VPy -m pip install -r (Join-Path $Kit 'requirements-denoise.txt')
if ($LASTEXITCODE) { Warn 'clearvoice 没装上：做口播时加 --no-denoise 跳过降噪（或 episode.yaml 写 voice: {denoise: false}）' }

# ---------- 4. 渲染舞台 ----------
Say '装渲染舞台（stage\ 的 npm 包、Chrome for Testing）'
Push-Location -LiteralPath (Join-Path $Kit 'stage')
# Chrome for Testing 从 storage.googleapis.com 下，国内常常下不动：设了 CHONGGU_CHROME 就不下，用它指的那个 Chrome；电脑上装了 Chrome 的留着兜底
$SysChrome = $null
if (-not $env:CHONGGU_CHROME) {
  $SysChrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") |
    Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
}
if ($env:CHONGGU_CHROME) { $env:PUPPETEER_SKIP_DOWNLOAD = '1' }
function Npm-Install { if (Test-Path -LiteralPath 'package-lock.json') { & npm.cmd ci --no-audit --no-fund } else { & npm.cmd install --no-audit --no-fund } }
Npm-Install
if ($LASTEXITCODE -and -not $env:CHONGGU_CHROME) {   # 多半是 puppeteer 装完顺手下 Chrome 时断了：先不下 Chrome，至少把 npm 包装上
  Warn 'npm 包没装上，先不下 Chrome 再试一次'
  $env:PUPPETEER_SKIP_DOWNLOAD = '1'; Npm-Install; Remove-Item Env:PUPPETEER_SKIP_DOWNLOAD -ErrorAction SilentlyContinue
}
if ($LASTEXITCODE) { Pop-Location; Fail 'npm 包没装上（看上面的报错；网络慢可以先 npm.cmd config set registry https://registry.npmmirror.com）' }
if (-not $env:CHONGGU_CHROME) {
  & npx.cmd --yes puppeteer browsers install chrome
  if ($LASTEXITCODE) {
    if ($SysChrome) {
      Warn "Chrome for Testing 下不来，改用电脑上的 Chrome：$SysChrome"
      [Environment]::SetEnvironmentVariable('CHONGGU_CHROME', $SysChrome, 'User'); $env:CHONGGU_CHROME = $SysChrome
    } else {
      Pop-Location
      Fail 'Chrome for Testing 没下下来：可以先 $env:PUPPETEER_CHROME_DOWNLOAD_BASE_URL=''https://cdn.npmmirror.com/binaries/chrome-for-testing'' 再跑这个脚本，或者装一个 Chrome'
    }
  }
}
Pop-Location

# ---------- 5. 素材和自检 ----------
Say '下载音效（Freesound CC0）、示例期的录音和配乐、字体（Pixabay 的配乐要手动下载，用到时再说）'
& $VPy -m chonggu fetch-assets
if ($LASTEXITCODE) { Warn '有素材没下下来（看上面）；网络好了再跑：.venv\Scripts\python -m chonggu fetch-assets' }
Say '环境自检'
& $VPy -m chonggu doctor
Write-Host ''
Write-Host '装好了。以后在工具包文件夹里用：.venv\Scripts\python -m chonggu <命令>（命令清单：.venv\Scripts\python -m chonggu -h）' -ForegroundColor Green
Write-Host '新的一期：.venv\Scripts\python -m chonggu new <短名> --number 期数 --title 标题'
