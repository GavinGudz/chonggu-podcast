"""doctor：环境自检。python -m chonggu doctor [--json] [--install [--dry-run]]
查：系统、Python、Python 包、听写（mlx-whisper / faster-whisper）、降噪（clearvoice）、ffmpeg（libx264、loudnorm）、变速（rubberband）、
Node 22.12+（puppeteer 25 要）、puppeteer 和它的 Chrome、舞台字体、素材缓存、磁盘、内存、git、gh。每项打 ✓（好）/ !（建议）/ ✗（必须装），后面跟着 Windows 或 Mac 上怎么装。
--install：把缺的装上（Mac：Homebrew 装 ffmpeg、rubberband、node；Windows：winget 和 rubberband 官方 zip），建 .venv、装 Python 包、
npm ci、装 puppeteer 的 Chrome、fetch-assets，最后再查一遍。已经有的跳过，可以反复跑。--dry-run 只打印要做什么。
这个文件只用 Python 标准库（装 Python 包之前就要能跑）。"""
import hashlib, importlib.metadata as md, importlib.util, json, os, platform, re, shutil, subprocess, sys, urllib.request, zipfile
from pathlib import Path
from chonggu import paths
from chonggu.gates import GateFailed

WIN, MAC = paths.IS_WIN, paths.IS_MAC
PKGS = [('numpy', 'numpy', True), ('scipy', 'scipy', True), ('soundfile', 'soundfile', True), ('yaml', 'PyYAML', True),
        ('pypinyin', 'pypinyin', True), ('PIL', 'Pillow', True), ('audiotsm', 'audiotsm', False)]   # (import 名, pip 名, 必须)
RB_ZIP = ('https://breakfastquay.com/files/releases/rubberband-4.0.0-gpl-executable-windows.zip',
          'f2d47fc64dbb42f6cc62edf7933ac4fa89d8f0ef8b9cf97b6afc263a7fe05644')
WINGET = {'git': 'Git.Git', 'node': 'OpenJS.NodeJS.LTS', 'ffmpeg': 'Gyan.FFmpeg', 'gh': 'GitHub.cli'}
BREW = {'ffmpeg': 'ffmpeg', 'rubberband': 'rubberband', 'node': 'node', 'git': 'git', 'gh': 'gh'}


def fix(win=None, mac=None, any_=None):
    return any_ or (win if WIN else mac) or ''


def run_out(cmd, cwd=None, timeout=30):
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=timeout)
        return r.returncode, (r.stdout or '') + (r.stderr or '')
    except (OSError, subprocess.TimeoutExpired) as e:
        return -1, str(e)


def has(mod):
    try: return importlib.util.find_spec(mod) is not None
    except (ImportError, ValueError): return False


def ver(dist):
    try: return md.version(dist)
    except md.PackageNotFoundError: return None


class Report:
    def __init__(self): self.items = []
    def add(self, st, name, detail='', how=''):
        self.items.append({'status': st, 'name': name, 'detail': detail, 'fix': how}); return st == 'ok'
    def show(self):
        mark = {'ok': '✓', 'warn': '!', 'fail': '✗', 'info': '·'}
        for i in self.items:
            print(f"  {mark[i['status']]} {i['name']}" + (f"：{i['detail']}" if i['detail'] else ''))
            if i['fix'] and i['status'] in ('warn', 'fail'): print(f"      怎么办：{i['fix']}")
    def count(self, st): return sum(i['status'] == st for i in self.items)


# ---------- 各项检查 ----------
def c_system(R):
    m = platform.machine().lower()
    if MAC: name = f"Mac（{'Apple 芯片' if m == 'arm64' else 'Intel'}）macOS {platform.mac_ver()[0]}"
    elif WIN: name = f'Windows {platform.release()}（{platform.version()}）{m}'
    else: name = f'{platform.system()} {platform.release()} {m}'
    if MAC and m != 'arm64': R.add('warn', '系统', name, '能用，但听写用不了 mlx（走 faster-whisper CPU，慢几倍）')
    else: R.add('ok', '系统', name)
    v = sys.version_info; s = f'{v.major}.{v.minor}.{v.micro}（{sys.executable}）'
    if v < (3, 11): R.add('fail', 'Python', s + '，要 3.11 以上', fix('winget install -e --id Python.Python.3.12', 'brew install python@3.12'))
    elif v >= (3, 13): R.add('warn', 'Python', s, '降噪用的 clearvoice 要 numpy<2，3.13 上装不上；建议用 3.12 建 .venv（重新跑安装脚本）')
    else: R.add('ok', 'Python', s)
    vp = paths.venv_python()
    if vp.exists() and Path(sys.prefix).resolve() != (paths.kit_root() / '.venv').resolve():
        R.add('warn', '虚拟环境', '现在用的不是工具包的 .venv', f'用 {vp} -m chonggu …' + fix('（不要用 Activate.ps1：Windows 默认不让跑脚本）', '，或先 source .venv/bin/activate'))
    if WIN: c_windows(R)


def c_windows(R):
    """Windows 上最常把安装弄坏的几样：工具包在 OneDrive 里、路径有中文或太长、没开长路径、用户名是中文"""
    k = str(paths.kit_root())
    if 'OneDrive' in k or not k.isascii() or len(k) > 60:
        R.add('warn', '工具包位置', k, r'挪到 C:\chonggu-kit（短、没有中文、不在 OneDrive 里：OneDrive 会锁住 out\ 里的文件、把文件换成占位符）')
    import winreg
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r'SYSTEM\CurrentControlSet\Control\FileSystem') as h: lp = winreg.QueryValueEx(h, 'LongPathsEnabled')[0]
    except OSError:
        lp = 0
    if not lp:
        R.add('info', '长路径', 'Windows 没开长路径（装 torch 偶尔会因此失败：No such file or directory … Long Path support）。'
              r'要开：管理员 PowerShell 里跑 New-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force')
    if not str(Path.home()).isascii() and not os.environ.get('HF_HOME'):
        R.add('warn', '用户名有中文', str(Path.home()), r'听写模型放在用户文件夹里可能读不了：setx HF_HOME C:\chonggu-cache\hf（或写进工具包的 chonggu.local.yaml），再开一个新终端')


def c_packages(R):
    req = 'requirements-win.txt' if not (MAC and platform.machine() == 'arm64') else 'requirements-mac.txt'
    miss = [pip for mod, pip, need in PKGS if need and not has(mod)]
    have = [f'{pip} {ver(pip)}' for mod, pip, need in PKGS if has(mod) and ver(pip)]
    if miss: R.add('fail', 'Python 包', f'缺 {", ".join(miss)}', f'python -m pip install -r {req}')
    else: R.add('ok', 'Python 包', '，'.join(have[:6]))
    if not has('audiotsm'): R.add('info', 'audiotsm', '没装（没有 rubberband 时的变速兜底）')


def c_asr(R):
    try:
        from chonggu.voice import asr
        b, m, d = asr.backend()
    except ImportError:
        b = 'mlx' if MAC and platform.machine() == 'arm64' and has('mlx_whisper') else 'faster'; m, d = '', ''
    mod, pip = ('mlx_whisper', 'mlx-whisper') if b == 'mlx' else ('faster_whisper', 'faster-whisper')
    if not has(mod):
        want = 'mlx-whisper' if MAC and platform.machine() == 'arm64' else 'faster-whisper'
        return R.add('fail', '听写', f'没装 {want}', f'python -m pip install {want}')
    hub = Path(os.environ.get('HF_HOME') or Path.home() / '.cache' / 'huggingface') / 'hub'
    repo = m if '/' in m else f'Systran/faster-whisper-{m}'
    cached = (hub / ('models--' + repo.replace('/', '--'))).exists() or Path(m).exists()
    extra = '' if cached else '；模型还没下，第一次听写时自动下（约 3 GB）'
    if b == 'faster' and d == 'cpu' and WIN:
        R.add('ok', '听写', f'faster-whisper {ver("faster-whisper")} · {m} · CPU int8（没有 NVIDIA 显卡；慢，想快一点设 CHONGGU_ASR_MODEL=large-v3-turbo）{extra}')
    else:
        R.add('ok', '听写', f'{pip} {ver(pip)} · {m} · {d}{extra}')


def c_denoise(R):
    if has('clearvoice'): R.add('ok', '降噪', f'clearvoice {ver("clearvoice")}（MossFormer2_SE_48K，模型第一次用时下载）')
    else: R.add('warn', '降噪', '没装 clearvoice（口播流水线要加 --no-denoise 跳过降噪）', 'python -m pip install -r requirements-denoise.txt（Python 3.12；会装 torch，1–3 GB）')


def c_ffmpeg(R):
    exe = paths.tool('ffmpeg')
    if not exe: return R.add('fail', 'ffmpeg', '没找到', fix('winget install -e --id Gyan.FFmpeg（装完关掉终端再开一个）', 'brew install ffmpeg'))
    _, v = run_out([exe, '-hide_banner', '-version']); v = ((v.splitlines() or [''])[0].replace('ffmpeg version ', '').split() or ['?'])[0][:40]
    _, enc = run_out([exe, '-hide_banner', '-encoders']); _, flt = run_out([exe, '-hide_banner', '-filters'])
    miss = [x for x, s in (('libx264', enc), ('loudnorm', flt)) if not re.search(rf'\s{x}\s', s)]
    if miss: R.add('fail', 'ffmpeg', f'{v}，但缺 {", ".join(miss)}', fix('换完整版：winget install -e --id Gyan.FFmpeg', 'brew reinstall ffmpeg'))
    else: R.add('ok', 'ffmpeg', f'{v}（{exe}）')
    if not paths.tool('ffprobe'): R.add('fail', 'ffprobe', '没找到（和 ffmpeg 一起装的）', fix('winget install -e --id Gyan.FFmpeg', 'brew install ffmpeg'))


def c_stretch(R):
    rb = paths.tool('rubberband')
    how = fix('重新跑 install_windows.ps1（会下载官方 zip），或 python -m chonggu doctor --install', 'brew install rubberband')
    if rb:
        code, v = run_out([rb, '--version'])
        if not code: return R.add('ok', '变速（rubberband）', f'命令行 {v.strip()[:20]}，R3 引擎（{rb}）')
        R.add('warn', '变速（rubberband）', f'{rb} 起不来（退出码 {code}）：杀毒软件拦了？下面用 ffmpeg 滤镜 / audiotsm 兜底', how)
    exe = paths.tool('ffmpeg')
    if exe and re.search(r'\srubberband\s', run_out([exe, '-hide_banner', '-filters'])[1]):
        return R.add('ok', '变速（rubberband）', 'ffmpeg 的 rubberband 滤镜（R2 引擎；装上命令行版音质更好）')
    if has('audiotsm'): R.add('warn', '变速（rubberband）', '没有 rubberband，用 audiotsm 兜底（音质差一点）', how)
    else: R.add('fail', '变速（rubberband）', '没有 rubberband，也没有 audiotsm', how)


def node_version():
    exe = paths.tool('node')
    if not exe: return None, None
    _, v = run_out([exe, '--version']); m = re.search(r'v(\d+)\.(\d+)', v)
    return exe, (int(m[1]), int(m[2])) if m else None


def chrome_path():
    if os.environ.get('CHONGGU_CHROME'): return os.environ['CHONGGU_CHROME']
    exe = paths.tool('node')
    if not exe or not (paths.stage_dir() / 'node_modules' / 'puppeteer').exists(): return None
    code, out = run_out([exe, '--input-type=module', '-e', "import p from 'puppeteer'; console.log(await p.executablePath())"], cwd=paths.stage_dir(), timeout=60)
    return out.strip().splitlines()[-1] if code == 0 and out.strip() else None


def c_node(R):
    exe, v = node_version()
    if not exe: return R.add('fail', 'Node.js', '没找到（渲染要它）', fix('winget install -e --id OpenJS.NodeJS.LTS（装完关掉终端再开一个）', 'brew install node'))
    if not v or v < (22, 12): return R.add('fail', 'Node.js', f'版本 {v} 太老，要 22.12 以上（puppeteer 25 要）', fix('winget upgrade -e --id OpenJS.NodeJS.LTS', 'brew upgrade node'))
    R.add('ok', 'Node.js', f'v{v[0]}.{v[1]}（{exe}）')
    st = paths.stage_dir()
    if not (st / 'node_modules' / 'puppeteer').exists():
        return R.add('fail', 'puppeteer', 'stage/ 里还没装', fix(r'cd stage; npm.cmd ci; npx.cmd puppeteer browsers install chrome; cd ..（或 .venv\Scripts\python -m chonggu doctor --install）',
                                                          'cd stage && npm ci && npx puppeteer browsers install chrome（或 python -m chonggu doctor --install）'))
    pv = json.loads((st / 'node_modules' / 'puppeteer' / 'package.json').read_text(encoding='utf-8')).get('version')
    c = chrome_path()
    if c and Path(c).exists(): R.add('ok', '渲染用的 Chrome', f'puppeteer {pv} · {c}')
    else: R.add('fail', '渲染用的 Chrome', f'puppeteer {pv} 的 Chrome for Testing 还没下（{c or "找不到"}）',
                fix(r'cd stage; npx.cmd puppeteer browsers install chrome; cd ..（或在 chonggu.local.yaml 里写 CHONGGU_CHROME 指向一个 chrome.exe）',
                    'cd stage && npx puppeteer browsers install chrome（或设环境变量 CHONGGU_CHROME 指向一个 Chrome）'))


def c_fonts(R):
    p = paths.stage_dir() / 'fonts' / 'FONTS.json'
    if not p.exists(): return R.add('warn', '舞台字体', 'stage/fonts/FONTS.json 不在', 'git pull 拿全工具包')
    F = json.loads(p.read_text(encoding='utf-8'))['fonts']
    bad = [f['file'] for f in F if not (p.parent / f['file']).exists() or (f.get('bytes') and (p.parent / f['file']).stat().st_size != f['bytes'])]
    if bad: R.add('fail', '舞台字体', f'缺 {", ".join(bad)}（不能拿系统字体代替，两边画面会不一样）', 'python -m chonggu fetch-assets')
    else: R.add('ok', '舞台字体', '、'.join(f['name'].split('（')[0] for f in F) + '（OFL）')


def c_assets(R):
    A = paths.manifest_rows()
    if not A: return R.add('warn', '素材', 'assets/manifest.json 读不了', 'git pull 拿全工具包')
    have = [a for a in A if paths.asset(a['name']).exists()]
    auto = [a for a in A if a.get('url') and not paths.asset(a['name']).exists()]
    manual = [a for a in A if not a.get('url') and not paths.asset(a['name']).exists()]
    d = f'清单 {len(A)} 个，缓存里有 {len(have)} 个（{paths.assets_dir()}）'
    if auto: R.add('warn', '素材', d + f'，{len(auto)} 个还没下', 'python -m chonggu fetch-assets')
    elif manual: R.add('warn', '素材', d + f'，{len(manual)} 个要手动下载', 'python -m chonggu fetch-assets（会列出页面链接）')
    else: R.add('ok', '素材', d)


def c_disk(R):
    seen = set()
    for name, p in (('磁盘', paths.kit_root()), ('磁盘（缓存）', paths.cache_dir())):
        dev = os.stat(p).st_dev
        if dev in seen: continue   # 缓存和工具包在同一块盘上，只报一次
        seen.add(dev); free = shutil.disk_usage(p).free / 1e9
        st = 'fail' if free < 10 else 'warn' if free < 30 else 'ok'
        R.add(st, name, f'还剩 {free:.0f} GB' + ('（一期从头做到尾要 20–40 GB：录音、渲染分段、1080p、2K、混音）' if st != 'ok' else ''),
              '清掉别的东西，或者把工具包放到空间大的盘上')


def ram_gb():
    try:
        if MAC: return int(run_out(['sysctl', '-n', 'hw.memsize'])[1].strip()) / 2 ** 30
        if WIN:
            import ctypes
            class M(ctypes.Structure):
                _fields_ = [('l', ctypes.c_ulong), ('load', ctypes.c_ulong), ('total', ctypes.c_ulonglong), ('avail', ctypes.c_ulonglong),
                            ('tp', ctypes.c_ulonglong), ('ap', ctypes.c_ulonglong), ('tv', ctypes.c_ulonglong), ('av', ctypes.c_ulonglong), ('ae', ctypes.c_ulonglong)]
            m = M(); m.l = ctypes.sizeof(M); ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m)); return m.total / 2 ** 30
        return int(re.search(r'MemTotal:\s+(\d+)', Path('/proc/meminfo').read_text())[1]) / 2 ** 20
    except Exception:
        return None


def c_misc(R):
    g = ram_gb()
    if g:
        w = max(1, min(8, int(g // 4)))
        R.add('ok' if g >= 16 else 'warn', '内存', f'{g:.0f} GB（渲染建议 render.workers ≤ {w}）', '内存小：episode.yaml 的 render.workers 写小一点（每路浏览器约 1–2 GB）')
    if not paths.tool('git'): R.add('warn', 'git', '没找到（更新工具包要它）', fix('winget install -e --id Git.Git', 'xcode-select --install'))
    else: R.add('ok', 'git', run_out([paths.tool('git'), '--version'])[1].strip())
    if not paths.tool('gh'): R.add('info', 'gh（GitHub 命令行）', '没装：publish 真传时才要（' + fix('winget install -e --id GitHub.cli', 'brew install gh') + '，再 gh auth login）')


CHECKS = [c_system, c_packages, c_asr, c_denoise, c_ffmpeg, c_stretch, c_node, c_fonts, c_assets, c_disk, c_misc]


def report():
    R = Report()
    for c in CHECKS:
        try: c(R)
        except Exception as e: R.add('warn', c.__name__[2:], f'查的时候出错：{e}')
    return R


# ---------- 安装 ----------
class Installer:
    def __init__(self, dry): self.dry, self.k = dry, 0

    def step(self, msg): self.k += 1; print(f'\n== 第 {self.k} 步：{msg}')

    def sh(self, cmd, cwd=None, ok_fail=False):
        cmd = [str(c) for c in cmd]
        print('  $', ' '.join(f'"{c}"' if ' ' in c else c for c in cmd) + (f'    （在 {cwd}）' if cwd else ''))
        if self.dry: return True
        r = subprocess.run(cmd, cwd=cwd)
        if r.returncode and not ok_fail: raise GateFailed(f'这一步没成功（退出码 {r.returncode}）：{" ".join(cmd)}')
        return r.returncode == 0


def refresh_path():
    """Windows：winget 装完的新程序只写进了注册表的 PATH，这个进程看不到；重新读一遍"""
    if not WIN: return
    import winreg
    parts = []
    for root, key in ((winreg.HKEY_LOCAL_MACHINE, r'SYSTEM\CurrentControlSet\Control\Session Manager\Environment'), (winreg.HKEY_CURRENT_USER, 'Environment')):
        try:
            with winreg.OpenKey(root, key) as k: parts.append(os.path.expandvars(winreg.QueryValueEx(k, 'Path')[0]))
        except OSError: pass
    if parts: os.environ['PATH'] = os.pathsep.join(parts + [os.environ.get('PATH', '')])


def sys_tools(I):
    need = [n for n in ('git', 'ffmpeg', 'node') if not paths.tool(n)]
    _, nv = node_version()
    if 'node' not in need and (not nv or nv < (22, 12)): need.append('node')
    if MAC:
        if need or not paths.tool('rubberband'):
            brew = shutil.which('brew') or next((b for b in ('/opt/homebrew/bin/brew', '/usr/local/bin/brew') if Path(b).exists()), None)
            if not brew: raise GateFailed('要先装 Homebrew（https://brew.sh 首页那一行命令，粘到「终端」里回车），装完再跑一遍')
            I.step('Homebrew 装 ' + '、'.join(dict.fromkeys(need + (['rubberband'] if not paths.tool('rubberband') else []))))
            for n in need: I.sh([brew, 'upgrade' if n == 'node' and paths.tool('node') else 'install', BREW[n]], ok_fail=n == 'node')
            if not paths.tool('rubberband'): I.sh([brew, 'install', 'rubberband'])
    elif WIN:
        if need:
            w = shutil.which('winget')
            if not w: raise GateFailed('没有 winget：在 Microsoft Store 装「应用安装程序」（App Installer），或先跑 install_windows.ps1')
            I.step('winget 装 ' + '、'.join(need))
            print('  （winget 会替你接受 winget 源和这些软件各自的许可协议：Git、Node.js、FFmpeg（GPL）……）')
            for n in need: I.sh([w, 'install', '-e', '--id', WINGET[n], '--source', 'winget', '--accept-source-agreements', '--accept-package-agreements'], ok_fail=True)
            refresh_path()
        if not paths.tool('rubberband'):
            I.step('下载 rubberband（官方 Windows 版）')
            d = paths.cache_dir() / 'bin'; z = d / Path(RB_ZIP[0]).name; print(f'  {RB_ZIP[0]} → {d}')
            if not I.dry:
                d.mkdir(parents=True, exist_ok=True)
                req = urllib.request.Request(RB_ZIP[0], headers={'User-Agent': 'chonggu-kit'})
                with urllib.request.urlopen(req, timeout=120) as r: z.write_bytes(r.read())
                if hashlib.sha256(z.read_bytes()).hexdigest() != RB_ZIP[1]: z.unlink(); raise GateFailed('rubberband 的 zip 下载下来 sha256 不对，换个网络再试')
                with zipfile.ZipFile(z) as f: f.extractall(d)
                z.unlink()
    elif need:
        raise GateFailed(f'缺 {", ".join(need)}：用系统的包管理器装（apt / dnf …），Node 要 22.12 以上')


def install(dry=False):
    I = Installer(dry); root = paths.kit_root()
    if sys.version_info < (3, 11): raise GateFailed(f'要 Python 3.11 以上（现在是 {sys.version.split()[0]}）：' + fix('winget install -e --id Python.Python.3.12', 'brew install python@3.12'))
    sys_tools(I)
    vp = paths.venv_python()
    if not vp.exists():
        I.step('建虚拟环境 .venv'); I.sh([sys.executable, '-m', 'venv', root / '.venv'])
    req = 'requirements-mac.txt' if MAC and platform.machine() == 'arm64' else 'requirements-win.txt'
    I.step(f'装 Python 包（{req}）')
    I.sh([vp, '-m', 'pip', 'install', '--upgrade', 'pip'], ok_fail=True)
    if WIN and shutil.which('nvidia-smi') and not os.environ.get('CHONGGU_NO_CUDA'):   # 有 NVIDIA 显卡：先装 CUDA 版 torch，降噪、听写都快很多
        idx = os.environ.get('CHONGGU_TORCH_INDEX', 'https://download.pytorch.org/whl/cu128')
        print('  有 NVIDIA 显卡：装 CUDA 版的 torch（约 2.5 GB；不要就设 CHONGGU_NO_CUDA=1）')
        I.sh([vp, '-m', 'pip', 'install', 'torch', 'torchaudio', 'torchvision', '--index-url', idx], ok_fail=True)
    I.sh([vp, '-m', 'pip', 'install', '-r', root / req])
    if WIN and Path(os.environ.get('CHONGGU_LAUNCHER') or sys.argv[0]).stem.lower() == 'chonggu':   # 正在跑的就是 .venv\Scripts\chonggu.exe：pip 盖不掉它（WinError 32）
        print(r'  ! 跳过重装 chonggu 命令：用 .venv\Scripts\python -m chonggu doctor --install 重跑这一步')
    else:
        I.sh([vp, '-m', 'pip', 'install', '--no-deps', '-e', root], ok_fail=True)   # 装成 chonggu 命令；不成也不要紧，在工具包文件夹里 python -m chonggu 照样能用
    I.step('装降噪（clearvoice；装不上可以先用 --no-denoise）')
    if not I.sh([vp, '-m', 'pip', 'install', '-r', root / 'requirements-denoise.txt'], ok_fail=True):
        print('  ! clearvoice 没装上：口播流水线加 --no-denoise 跳过降噪；Python 3.13 装不上，要用 3.12 建 .venv')
    npm, npx = paths.tool('npm'), paths.tool('npx')
    if not npm and not dry: raise GateFailed('找不到 npm（和 Node.js 一起装的）：关掉终端再开一个，或重新装 Node.js')
    st = paths.stage_dir()
    I.step('装渲染舞台（stage/ 的 npm 包和 Chrome for Testing）')
    I.sh([npm or 'npm', 'ci' if (st / 'package-lock.json').exists() else 'install', '--no-audit', '--no-fund'], cwd=st)
    I.sh([npx or 'npx', '--yes', 'puppeteer', 'browsers', 'install', 'chrome'], cwd=st)
    I.step('下载配乐、音效、字体')
    I.sh([vp, '-m', 'chonggu', 'fetch-assets'], cwd=root, ok_fail=True)
    I.step('再查一遍')
    I.sh([vp, '-m', 'chonggu', 'doctor'], cwd=root, ok_fail=True)
    if not dry: print('\n装好了。以后都用工具包自己的 Python：' + fix(r'.venv\Scripts\python -m chonggu …', '.venv/bin/python -m chonggu …（或 source .venv/bin/activate 以后 python -m chonggu …）'))


def run(ep=None, args=None):
    if getattr(args, 'install', False):
        return install(dry=bool(getattr(args, 'dry_run', False)))
    R = report()
    if getattr(args, 'json', False):
        print(json.dumps({'ok': R.count('fail') == 0, 'items': R.items}, ensure_ascii=False, indent=1))
    else:
        print(f'《重估》工具包 环境自检（{paths.kit_root()}）'); R.show()
        nf, nw = R.count('fail'), R.count('warn')
        if nf: print(f'\n{nf} 项必须装（✗），{nw} 项建议（!）。照「怎么办」做，或者直接跑' + fix(' install_windows.ps1', ' sh install_mac.sh') + '（会把缺的都装上）。')
        else: print(f'\n都齐了' + (f'（{nw} 项建议看一下）' if nw else '') + '。新的一期：python -m chonggu new <短名> --number 期数')
    if R.count('fail'): raise GateFailed(f'环境还不全：{"、".join(i["name"] for i in R.items if i["status"] == "fail")}')
    return R


def add_args(p):
    p.add_argument('--install', action='store_true', help='把缺的装上（系统工具、.venv、Python 包、npm、Chrome、素材）')
    p.add_argument('--dry-run', action='store_true', help='和 --install 一起用：只打印要做什么')
    p.add_argument('--json', action='store_true', help='结果打成 JSON（给 AI 代理读）')
