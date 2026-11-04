"""降噪：denoise(in_wav, out_wav)，ClearVoice MossFormer2_SE_48K（只降噪，不补高频；第 7、8 期的做法）。
输出 48 kHz 单声道 float32，和输入一样长。ClearVoice 一次最多稳稳地处理 20 秒（再长它自己按 3 秒的窗拼，接缝处每 3 秒一下咔哒），
所以超过 20 秒的在安静处切成 ≤20 秒的块，每块前后多带 .3 秒，接缝处 .1 秒交叉淡化（同第 7 期 cv_restore.py 的 run_cv）。
模型第一次用时从 huggingface 下到 缓存/clearvoice/checkpoints/（几百 MB）。设备 ClearVoice 自己挑：Apple 芯片 MPS、NVIDIA CUDA、别的 CPU（慢，20 分钟的录音要十几二十分钟）。
没装 clearvoice 就抛 DenoiseUnavailable（说明里有怎么装）；口播流水线可以 --no-denoise 跳过这一步。"""
import contextlib, os, tempfile, time
from math import gcd
from pathlib import Path
import numpy as np
from chonggu import paths

if paths.IS_WIN:   # torch 和 ctranslate2（听写）各带一份 Intel OpenMP：同一个进程里先后用会报 OMP Error #15 退出
    os.environ.setdefault('KMP_DUPLICATE_LIB_OK', 'TRUE')

FS = 48000
MAX_LEN = 20 * FS        # ClearVoice 一遍最多 20 秒
OV = int(.30 * FS)       # 每块切点外多带 .3 秒（块边上的毛病落在不用的那截里）
XF = int(.05 * FS)       # 切点两边各 50 ms 交叉淡化，切点放在附近最安静的 30 ms


class DenoiseUnavailable(RuntimeError):
    pass


HINT = ('降噪要 clearvoice（会一起装上 torch，约 1–3 GB）：python -m pip install -r requirements-denoise.txt\n'
        '  装不上（比如 Python 版本太新）就先跳过降噪：python -m chonggu voice <这一期> --no-denoise，或 episode.yaml 里写 voice: {denoise: false}')


def cut_points(x):
    n = len(x)
    if n <= MAX_LEN: return [0, n]
    fr = int(.03 * FS); cuts = [0]
    while n - cuts[-1] > MAX_LEN - 2 * OV:
        lo = cuts[-1] + 10 * FS; hi = cuts[-1] + MAX_LEN - 2 * OV - fr
        seg = x[lo:hi]; m = len(seg) // fr
        e = (seg[:m * fr].reshape(m, fr) ** 2).mean(1)
        cuts.append(lo + int(np.argmin(e)) * fr + fr // 2)
    cuts.append(n); return cuts


def to_pcm16(x, p):
    import soundfile as sf
    peak = float(np.max(np.abs(x))) or 1.0; scale = .999 / peak if peak > .999 else 1.0
    sf.write(p, (x * scale).astype(np.float32), FS, subtype='PCM_16'); return scale


def run_cv(cv, x, td, tag):
    """在 ≤20 秒、切在安静处的块上跑一个 ClearVoice 模型（48 kHz float）"""
    cuts = cut_points(x); n = len(x)
    out, wsum = np.zeros(n), np.zeros(n)
    for k in range(len(cuts) - 1):
        a, b = cuts[k], cuts[k + 1]; a0, b0 = max(0, a - OV), min(n, b + OV)
        p = os.path.join(td, f'{tag}_{k}.wav'); scale = to_pcm16(x[a0:b0], p)
        y = np.asarray(cv(input_path=p, online_write=False), dtype=np.float64).reshape(-1)[:b0 - a0] / scale
        if len(y) < b0 - a0: y = np.concatenate([y, x[a0 + len(y):b0]])   # 偶尔少几个采样：那几个用原声
        w = np.zeros(b0 - a0); ia, ib = a - a0, b - a0; w[ia:ib] = 1.0
        if k > 0: w[ia - XF:ia + XF] = np.linspace(0, 1, 2 * XF)
        if k < len(cuts) - 2: w[ib - XF:ib + XF] = np.linspace(1, 0, 2 * XF)
        out[a0:b0] += w * y; wsum[a0:b0] += w
        print(f'  降噪 {k + 1}/{len(cuts) - 1} 块', end='\r', flush=True)
    return (out / np.maximum(wsum, 1e-9)).astype(np.float32), len(cuts) - 1


@contextlib.contextmanager
def _in(d):
    old = os.getcwd(); os.chdir(d)
    try: yield
    finally: os.chdir(old)


def model():
    """ClearVoice 的降噪模型（权重在 缓存/clearvoice/checkpoints/MossFormer2_SE_48K）"""
    try:
        from clearvoice import ClearVoice
    except ImportError as e:
        raise DenoiseUnavailable(f'没装 clearvoice（{e}）。\n  {HINT}') from None
    d = paths.cache_dir() / 'clearvoice'; d.mkdir(parents=True, exist_ok=True)
    with _in(d):   # ClearVoice 按当前文件夹找 checkpoints/<模型名>，没有就下载
        return ClearVoice(task='speech_enhancement', model_names=['MossFormer2_SE_48K'])


def denoise(in_wav, out_wav):
    import soundfile as sf
    x, sr = sf.read(str(in_wav), dtype='float32', always_2d=True); x = x.mean(1)
    if sr != FS:
        from scipy.signal import resample_poly
        g = gcd(int(sr), FS); x = resample_poly(x, FS // g, int(sr) // g).astype(np.float32)
    t0 = time.perf_counter(); se = model()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td, _in(paths.cache_dir() / 'clearvoice'):
        y, n = run_cv(se, x, td, 'se')
    try:
        import torch
        if torch.backends.mps.is_available(): torch.mps.synchronize()
    except Exception:
        pass
    Path(out_wav).parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(out_wav), y[:len(x)], FS, subtype='FLOAT')
    print(f'  降噪好了：{len(x) / FS:.1f} 秒，{n} 块，用了 {time.perf_counter() - t0:.0f} 秒' + ' ' * 10)
    return Path(out_wav)
