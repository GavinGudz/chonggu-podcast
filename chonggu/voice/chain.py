"""主讲配音的人声链（主讲：「修的很纯洁，不能刺耳」）。要 ffmpeg。
高通 80 Hz → 低搁架 150 Hz -2 dB、300 Hz 附近 -3 dB（手机近讲的闷和轰）→ 2.8 kHz 只提 +0.5 dB → 6.5 kHz 以上 -3.5 dB（不刺耳）
→ 去齿音 → 不压缩（压缩会把元音压下去、显得齿音变亮）→ 固定增益到 -16 LUFS，限幅 -1.5 dB"""
import re, subprocess, tempfile
from pathlib import Path
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, lfilter
from chonggu.voice.common import SR, ffmpeg

EQ = [('ls', 150, -2.0, .7), ('peq', 300, -3.0, 1.0), ('peq', 2800, .5, .8), ('hs', 6500, -3.5, .7)]
LUFS = -16

def biquad(kind, f0, g, q=.7):
    A = 10 ** (g / 40); w = 2 * np.pi * f0 / SR; c, s = np.cos(w), np.sin(w); al = s / (2 * q)
    if kind == 'peq': b = [1 + al * A, -2 * c, 1 - al * A]; a = [1 + al / A, -2 * c, 1 - al / A]
    else:
        al = s / 2 * np.sqrt((A + 1 / A) * (1 / q - 1) + 2); sq = 2 * np.sqrt(A) * al
        if kind == 'hs': b = [A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)]; a = [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq]
        else: b = [A * ((A + 1) - (A - 1) * c + sq), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sq)]; a = [(A + 1) + (A - 1) * c + sq, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sq]
    return np.array(b) / a[0], np.array(a) / a[0]

def eq(x):
    y = sosfilt(butter(2, 80, btype='high', fs=SR, output='sos'), x)
    for k in EQ:
        b, a = biquad(*k); y = lfilter(b, a, y)
    return y

def integrated(ff, wav):
    m = subprocess.run([ff, '-hide_banner', '-nostats', '-i', str(wav), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, encoding='utf-8', errors='replace').stderr
    return float(re.search(r'I:\s*(-?[\d.]+)\s*LUFS', m.split('Integrated loudness:')[1]).group(1))

def chain(src, dst):
    ff = ffmpeg()
    if not ff: raise RuntimeError('人声链要 ffmpeg：Mac 上 brew install ffmpeg；Windows 上 winget install ffmpeg（装完重开终端）')
    x, sr = sf.read(str(src))
    if sr != SR: raise ValueError(f'{src} 是 {sr} Hz，人声链只收 {SR} Hz')
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:   # Windows：杀毒刚扫过的 wav 一时删不掉，不因此停下
        pre, c = Path(td) / 'pre.wav', Path(td) / 'c.wav'
        sf.write(str(pre), eq(x).astype(np.float32), SR, subtype='FLOAT')
        subprocess.run([ff, '-v', 'error', '-y', '-i', str(pre), '-af', 'deesser=i=0.6:m=0.6:f=0.5:s=o', '-ar', str(SR), '-c:a', 'pcm_f32le', str(c)], check=True)
        # 响度用固定增益拉到 -16 LUFS（不用 loudnorm 的动态模式：它会把轻的地方抬起来，齿音和气声跟着变亮）
        I = integrated(ff, c)
        Path(dst).parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([ff, '-v', 'error', '-y', '-i', str(c), '-af', f'volume={LUFS - I:.2f}dB,alimiter=limit=0.84:attack=3:release=60:level=disabled',
                        '-ar', str(SR), '-c:a', 'pcm_s24le', str(dst)], check=True)
    return I
