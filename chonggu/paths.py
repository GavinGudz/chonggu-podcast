"""工具包里的固定位置：仓库根、舞台、每个人自己的缓存（素材、听写缓存、模型都放这里，不进 git），外部程序在哪。
Mac：~/Library/Caches/chonggu；Windows：%LOCALAPPDATA%\\chonggu；Linux：~/.cache/chonggu。环境变量 CHONGGU_CACHE 可以改。"""
import json, os, re, shutil, sys, time
from functools import lru_cache
from pathlib import Path

IS_WIN = sys.platform == 'win32'
IS_MAC = sys.platform == 'darwin'


def kit_root():
    return Path(__file__).resolve().parent.parent


def load_local(p=None):
    """工具包里的本机设置 chonggu.local.yaml（不进 git）：一行一个「环境变量: 值」，比如
         CHONGGU_CHROME: C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe
         HF_ENDPOINT: https://hf-mirror.com
    已经设了的环境变量不盖。设置跟着工具包走：PowerShell、Git Bash（Windows 上的 Claude Code）、新开的窗口都一样。
    只认最简单的写法（键: 值，# 开头是注释，值两边的引号去掉，反斜杠原样保留），不用装 PyYAML 也能读。"""
    p = Path(p or kit_root() / 'chonggu.local.yaml'); got = {}
    try:
        lines = p.read_text(encoding='utf-8-sig').splitlines()
    except OSError:
        return got
    for ln in lines:
        m = re.match(r'\s*([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*(.*?)\s*$', ln)
        if not m or ln.lstrip().startswith('#'): continue
        k, v = m[1], m[2]
        if len(v) >= 2 and v[0] == v[-1] and v[0] in '\'"': v = v[1:-1]
        elif ' #' in v: v = v.split(' #')[0].rstrip()
        if v: got[k] = v; os.environ.setdefault(k, v)
    return got


load_local()


def stage_dir():
    return kit_root() / 'stage'


def episodes_dir():
    return kit_root() / 'episodes'


def cache_dir():
    if os.environ.get('CHONGGU_CACHE'):
        d = Path(os.environ['CHONGGU_CACHE']).expanduser()
    elif IS_WIN:
        d = Path(os.environ.get('LOCALAPPDATA') or Path.home() / 'AppData' / 'Local') / 'chonggu'
    elif IS_MAC:
        d = Path.home() / 'Library' / 'Caches' / 'chonggu'
    else:
        d = Path(os.environ.get('XDG_CACHE_HOME') or Path.home() / '.cache') / 'chonggu'
    d.mkdir(parents=True, exist_ok=True)
    return d


def assets_dir():
    return cache_dir() / 'assets'


def manifest_path():
    return kit_root() / 'assets' / 'manifest.json'


def local_manifest_path():
    """只在本机的素材清单（不进 git）：作品页还没核过授权的、只有本机某一期用的，先登记在这里，核过再挪进 manifest.json"""
    return kit_root() / 'assets' / 'manifest.local.json'


def manifest_rows():
    """两份清单的素材（公开的在前；本机那份的每条带 _local: True）"""
    rows = []
    for p, local in ((manifest_path(), False), (local_manifest_path(), True)):
        try:
            with open(p, encoding='utf-8') as f:
                rows += [dict(a, _local=True) if local else a for a in json.load(f).get('assets', [])]
        except (OSError, ValueError, AttributeError):
            pass
    return rows


@lru_cache(maxsize=1)
def _manifest_index():
    names, short = {}, {}
    for a in manifest_rows():
        n = a['name']; names[n] = n
        for k in {Path(n).name, Path(n).stem, a.get('id') or ''} - {''}:
            short.setdefault(k, set()).add(n)
    return names, short


def asset(name):
    """fetch-assets 下载的素材在缓存里的位置（不保证已经下好，用的人自己看 .exists()）。
    name 写清单里的 name（如 cand/light_quirkydoc.mp3、sfx_pop.mp3）；只写文件名或不带扩展名、而清单里只有一条对得上，也认。"""
    n = str(name).replace('\\', '/')
    names, short = _manifest_index()
    if n not in names and len(short.get(n, ())) == 1:
        n = next(iter(short[n]))
    return assets_dir() / n


def tool(name):
    """外部程序（ffmpeg、ffprobe、rubberband、node、npm、npx、git）的完整路径，找不到回 None。
    先看环境变量 CHONGGU_<名字>（如 CHONGGU_FFMPEG），再看 PATH，最后看缓存里的 bin/（Windows 的 rubberband 解压在那里）。
    Windows 上 npm、npx 是 .cmd，subprocess 要用这里给的完整路径才找得到。"""
    env = os.environ.get('CHONGGU_' + name.upper().replace('-', '_'))
    if env and Path(env).exists():
        return str(Path(env))
    # Windows 先找 .exe / .cmd / .bat：Python 3.12.0 的 shutil.which('npm') 可能给出没有扩展名的 nodejs\npm（bash 脚本，CreateProcess 起不来）
    p = next((q for q in (shutil.which(name + e) for e in ('.exe', '.cmd', '.bat')) if q), None) if IS_WIN else None
    p = p or shutil.which(name)
    if p:
        return p
    b = cache_dir() / 'bin'
    if b.is_dir():
        for f in sorted(b.rglob(name + ('.exe' if IS_WIN else ''))):
            if f.is_file():
                return str(f)
    return None


def need(name):
    """同 tool()，找不到就停（GateFailed），不让 subprocess 抛一个 Windows 上没有文件名的 FileNotFoundError"""
    p = tool(name)
    if not p:
        from chonggu.gates import GateFailed
        raise GateFailed(f'找不到 {name}：先跑 python -m chonggu doctor')
    return p


def replace(src, dst, tries=20):
    """os.replace；Windows 上目标被播放器、资源管理器预览、杀毒开着时等 0.5 秒再试，还不行就说清楚"""
    for k in range(tries):
        try:
            return os.replace(src, dst)
        except PermissionError:
            if not IS_WIN: raise   # Mac / Linux 上这是真的没有权限，照原样报
            if k == tries - 1: break
            time.sleep(.5)
    from chonggu.gates import GateFailed
    raise GateFailed(f'{Path(dst).name} 换不掉：正被别的程序打开着（播放器、资源管理器的预览窗格、杀毒）。关掉再跑；新的一份留在 {src}')


def win_short(p):
    """Windows 上带中文的路径换成 8.3 短路径（全是 ASCII）：只认窄字符路径的程序（CTranslate2 读模型、rubberband 读写 wav）也打得开。
    别的系统、本来就是 ASCII、或者这块盘关了短路径，原样返回。"""
    p = str(p)
    if not IS_WIN or p.isascii(): return p
    import ctypes
    b = ctypes.create_unicode_buffer(32768)
    if ctypes.windll.kernel32.GetShortPathNameW(p, b, len(b)): return b.value
    q = Path(p)   # 还不存在的文件（要写的输出）：换它所在的文件夹
    if q.name.isascii() and q.parent != q and ctypes.windll.kernel32.GetShortPathNameW(str(q.parent), b, len(b)):
        return str(Path(b.value) / q.name)
    return p


def venv_python():
    """工具包自己的虚拟环境里的 python（install 建的 .venv）"""
    v = kit_root() / '.venv'
    return v / ('Scripts/python.exe' if IS_WIN else 'bin/python')
