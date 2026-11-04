"""变速不变调：tempo(x, sr, factor) → 新的数组（factor > 1 变快；第 8 期主讲真声整体提速 1.2）。
后端按顺序找：rubberband 命令行（R3 引擎，第 8 期一直用的；Mac：brew install rubberband；Windows：安装脚本把官方 zip 解到缓存的 bin/）
→ ffmpeg 自带的 rubberband 滤镜（Windows 的 ffmpeg 完整版带，R2 引擎）→ audiotsm（纯 Python 的 WSOLA，哪儿都能装，音质差一点）。
CHONGGU_STRETCH=cli|ffmpeg|audiotsm 指定后端。输出长度一律修成 round(len(x) / factor)：各后端会差几毫秒，修齐了时间线才对得上。
x 可以是单声道 (n,) 或多声道 (n, 声道数)，float32。"""
import os, subprocess, tempfile
from functools import lru_cache
import numpy as np
from chonggu import paths


@lru_cache(maxsize=1)
def rubberband():
    """rubberband 命令行的完整路径（没有、或者起不来回 None）；要用 --pitchmap 这类功能的直接调它。
    Windows 上 exe 在也不一定起得来（360、火绒、Defender 把它或它的 DLL 隔离了，缺运行库时退出码 0xC0000135）：先跑一次 --version，起不来就当没有，换下一个后端。"""
    exe = paths.tool('rubberband')
    if not exe: return None
    try: ok = subprocess.run([exe, '--version'], capture_output=True, timeout=20).returncode == 0
    except (OSError, subprocess.TimeoutExpired): ok = False
    return exe if ok else None


@lru_cache(maxsize=1)
def ffmpeg_has_rubberband():
    exe = paths.tool('ffmpeg')
    if not exe: return False
    r = subprocess.run([exe, '-hide_banner', '-filters'], capture_output=True, text=True, encoding='utf-8', errors='replace')
    return any(ln.split()[1:2] == ['rubberband'] for ln in r.stdout.splitlines() if ln.strip())


def _has_audiotsm():
    import importlib.util
    return importlib.util.find_spec('audiotsm') is not None


def which():
    """现在用哪个后端：cli / ffmpeg / audiotsm"""
    b = os.environ.get('CHONGGU_STRETCH', '').strip().lower()
    if b in ('cli', 'ffmpeg', 'audiotsm'): return b
    if rubberband(): return 'cli'
    if ffmpeg_has_rubberband(): return 'ffmpeg'
    if _has_audiotsm(): return 'audiotsm'
    raise RuntimeError('变速要 rubberband：Mac 上 brew install rubberband；Windows 重新跑 install_windows.ps1；'
                       '或者 python -m pip install audiotsm（纯 Python，音质差一点）')


def _io(x, sr, run):
    import soundfile as sf
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:   # Windows：杀毒刚扫过的 wav 一时删不掉，不因此停下
        a, b = os.path.join(td, 'a.wav'), os.path.join(td, 'b.wav')
        sf.write(a, x, sr, subtype='FLOAT'); run(a, b)
        y, _ = sf.read(b, dtype='float32', always_2d=x.ndim > 1)
    return y


def _cli(x, sr, f):
    exe = rubberband()
    def run(a, b):
        a, b = paths.win_short(a), paths.win_short(b)   # rubberband 用窄字符打开文件：%TEMP% 里有中文（用户名是中文）时换成短路径
        r = subprocess.run([exe, '-3', '-q', f'-T{f}', a, b], capture_output=True)   # -3：R3 引擎（rubberband 3.0 起），保音高
        if r.returncode:   # 老版本没有 -3
            subprocess.run([exe, '-q', f'-T{f}', a, b], check=True, capture_output=True)
    return _io(x, sr, run)


def _ffmpeg(x, sr, f):
    exe = paths.tool('ffmpeg')
    return _io(x, sr, lambda a, b: subprocess.run([exe, '-v', 'error', '-y', '-i', a, '-af', f'rubberband=tempo={f}:pitchq=quality',
                                                   '-c:a', 'pcm_f32le', b], check=True, capture_output=True))


def _tsm(x, sr, f):
    from audiotsm import wsola
    from audiotsm.io.array import ArrayReader, ArrayWriter
    X = x[None, :] if x.ndim == 1 else x.T                  # audiotsm 要 (声道, 采样)
    fl = int(2 ** round(np.log2(.03 * sr)))                 # 一帧约 30 ms（48 kHz 是 1024）
    w = ArrayWriter(X.shape[0]); wsola(X.shape[0], speed=f, frame_length=fl).run(ArrayReader(np.ascontiguousarray(X, np.float32)), w)
    y = np.asarray(w.data, np.float32)
    return y[0] if x.ndim == 1 else y.T


def _fit(y, n):
    y = np.asarray(y, np.float32)
    if len(y) >= n: return y[:n]
    pad = np.zeros((n - len(y),) + y.shape[1:], np.float32)
    return np.concatenate([y, pad])


def tempo(x, sr, factor):
    """变速不变调，factor > 1 变快；输出长度 round(len(x) / factor)"""
    x = np.asarray(x, np.float32); factor = float(factor)
    if factor <= 0: raise ValueError(f'变速倍数要大于 0：{factor}')
    if abs(factor - 1) < 1e-4 or len(x) == 0: return x.copy()
    y = {'cli': _cli, 'ffmpeg': _ffmpeg, 'audiotsm': _tsm}[which()](x, sr, factor)
    return _fit(y, int(round(len(x) / factor)))


def to_duration(x, sr, seconds):
    """拉伸到正好 seconds 秒（不变调）"""
    return tempo(x, sr, len(x) / sr / float(seconds))
