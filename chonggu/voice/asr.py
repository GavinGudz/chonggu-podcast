"""听写：transcribe(audio, sr=16000, language='zh', prompt=None, word_timestamps=True) → 和 mlx_whisper.transcribe 一样的 dict：
{'text', 'segments': [{'start', 'end', 'text', 'words': [{'word', 'start', 'end', 'probability'}]}], 'language'}（每段都有 words，没要逐字就是空列表）。
audio 是 16 kHz（或 sr）的 float32 数组，或者一个音频文件的路径（什么采样率都行）。
后端自动选：Apple 芯片用 mlx-whisper large-v3（第 8 期一直用的）；别的电脑用 faster-whisper large-v3（有 NVIDIA 显卡用 CUDA float16，否则 CPU int8）。
环境变量：CHONGGU_ASR_BACKEND=mlx|faster 指定后端；CHONGGU_ASR_MODEL 换模型（mlx 写 HF 仓库名；faster 写 large-v3、large-v3-turbo（快 4 倍左右，中文略差）或本地文件夹）；
CHONGGU_ASR_DEVICE=cpu|cuda；CHONGGU_ASR_COMPUTE=int8|float16|int8_float16。模型第一次用时从 huggingface 下载（HF_HOME 可以改放哪）。
默认 condition_on_previous_text=False（第 8 期的做法：不拿上一段的字去猜下一段，重念的地方不会被「顺」掉）。"""
import importlib.util, inspect, os, platform, subprocess, sys
from math import gcd
from pathlib import Path
import numpy as np

if sys.platform == 'win32':   # torch 和 ctranslate2 各带一份 Intel OpenMP（libiomp5md.dll）：同一个进程先降噪再听写会报 OMP Error #15 退出
    os.environ.setdefault('KMP_DUPLICATE_LIB_OK', 'TRUE')

MLX_MODEL = 'mlx-community/whisper-large-v3-mlx'
FW_MODEL = 'large-v3'
SR = 16000
_MODELS = {}


def apple_silicon():
    return sys.platform == 'darwin' and platform.machine() == 'arm64'


def _has(mod):
    try: return importlib.util.find_spec(mod) is not None
    except (ImportError, ValueError): return False


def _cuda():
    if os.environ.get('CHONGGU_ASR_DEVICE'): return os.environ['CHONGGU_ASR_DEVICE'] == 'cuda'
    if sys.platform == 'win32':   # cuBLAS、cuDNN 只从 CUDA 版 torch 来（先 import torch，它把 torch/lib 放上 PATH）：没有 CUDA 版 torch 就用 CPU。
        try:                      # 缺 cuDNN 时 ctranslate2 不抛异常，直接打一行「Could not locate cudnn_ops64_9.dll」就退出整个进程，换 CPU 的兜底接不住
            import torch
            if not torch.cuda.is_available(): return False
        except Exception:
            return False
    try:
        import ctranslate2
        return ctranslate2.get_cuda_device_count() > 0
    except Exception:
        return False


def backend():
    """(后端, 模型, 设备)：mlx / faster；doctor 也用它"""
    b = os.environ.get('CHONGGU_ASR_BACKEND', '').strip().lower()
    if b not in ('mlx', 'faster'): b = 'mlx' if apple_silicon() and _has('mlx_whisper') else 'faster'
    if b == 'mlx': return 'mlx', os.environ.get('CHONGGU_ASR_MODEL') or MLX_MODEL, 'metal'
    return 'faster', os.environ.get('CHONGGU_ASR_MODEL') or FW_MODEL, 'cuda' if _cuda() else 'cpu'


def available():
    """(能不能听写, 说明)"""
    b, m, d = backend()
    mod = 'mlx_whisper' if b == 'mlx' else 'faster_whisper'
    if not _has(mod):
        pkg = 'mlx-whisper' if b == 'mlx' else 'faster-whisper'
        return False, f'没装 {pkg}（python -m pip install {pkg}）'
    return True, f'{mod} · {m} · {d}'


def load_audio(audio, sr=SR):
    """数组或文件 → 16 kHz 单声道 float32"""
    if isinstance(audio, (str, Path)):
        import soundfile as sf
        try:
            x, sr = sf.read(str(audio), dtype='float32', always_2d=True); x = x.mean(1)
        except RuntimeError:   # m4a、mp3 这类 soundfile 读不了：用 ffmpeg 直接解成 16 kHz
            from chonggu import paths
            exe = paths.tool('ffmpeg') or 'ffmpeg'
            r = subprocess.run([exe, '-v', 'error', '-i', str(audio), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
            x, sr = np.frombuffer(r.stdout, np.float32).copy(), SR
    else:
        x = np.asarray(audio, np.float32)
        if x.ndim > 1: x = x.mean(1) if x.shape[1] <= 8 else x.mean(0)
    if sr != SR:
        from scipy.signal import resample_poly
        g = gcd(int(sr), SR); x = resample_poly(x, SR // g, int(sr) // g)
    return np.ascontiguousarray(x, np.float32)


def _words(segs):
    for s in segs:
        s['start'], s['end'] = float(s['start']), float(s['end'])
        s['words'] = [dict(w, start=float(w['start']), end=float(w['end']), probability=w.get('probability')) for w in (s.get('words') or [])]
    return segs


def _mlx(x, model, language, prompt, words, kw):
    import mlx_whisper
    o = dict(path_or_hf_repo=model, language=language, word_timestamps=words, initial_prompt=prompt, condition_on_previous_text=False)
    o.update(kw)
    r = mlx_whisper.transcribe(x, **o)
    return {'text': r.get('text', ''), 'segments': _words(list(r.get('segments', []))), 'language': r.get('language', language)}


def _fw_model(model, dev):
    comp = os.environ.get('CHONGGU_ASR_COMPUTE') or ('float16' if dev == 'cuda' else 'int8')
    k = (model, dev, comp)
    if k not in _MODELS:
        if dev == 'cuda' and sys.platform == 'win32':
            try: import torch  # noqa: F401  torch 带的 cuBLAS、cuDNN 动态库，ctranslate2 借它的
            except ImportError: pass
        from faster_whisper import WhisperModel
        from chonggu import paths
        n = int(os.environ.get('CHONGGU_ASR_THREADS') or 0) or max(1, (os.cpu_count() or 4) - 1)
        local = model
        if paths.IS_WIN and not Path(model).exists():   # CTranslate2 用窄字符打开 model.bin：用户名是中文时模型文件夹打不开，先下好、换成短路径
            from faster_whisper.utils import download_model
            local = download_model(model)
        _MODELS[k] = WhisperModel(paths.win_short(local), device=dev, compute_type=comp, cpu_threads=n if dev == 'cpu' else 0)
    return _MODELS[k]


MLX2FW = {'logprob_threshold': 'log_prob_threshold'}


def _faster(x, model, dev, language, prompt, words, kw):
    m = _fw_model(model, dev)
    o = dict(language=language, initial_prompt=prompt, word_timestamps=words, condition_on_previous_text=False, vad_filter=False)
    ok = set(inspect.signature(m.transcribe).parameters)
    o.update({MLX2FW.get(k, k): v for k, v in kw.items() if MLX2FW.get(k, k) in ok})
    it, info = m.transcribe(x, **o)
    segs = [{'id': s.id, 'start': float(s.start), 'end': float(s.end), 'text': s.text, 'avg_logprob': s.avg_logprob, 'no_speech_prob': s.no_speech_prob,
             'words': [{'word': w.word, 'start': float(w.start), 'end': float(w.end), 'probability': float(w.probability)} for w in (s.words or [])]}
            for s in it]
    return {'text': ''.join(s['text'] for s in segs), 'segments': segs, 'language': info.language}


def transcribe(audio, sr=SR, language='zh', prompt=None, word_timestamps=True, **kw):
    """听一段：见文件开头。多给的参数（no_speech_threshold、temperature …）两个后端认得的就传过去。"""
    x = load_audio(audio, sr)
    b, model, dev = backend()
    if b == 'mlx':
        return _mlx(x, model, language, prompt, word_timestamps, kw)
    try:
        return _faster(x, model, dev, language, prompt, word_timestamps, kw)
    except (RuntimeError, OSError) as e:   # 显卡的库没装齐（cuDNN、cuBLAS），到真听的时候才报错：换 CPU 再听
        if dev != 'cuda': raise
        print(f'  ! 用显卡听写出错（{str(e)[:120]}），以后都换成 CPU（慢一些；装好 CUDA 12 的 cuBLAS、cuDNN 9 再用显卡）')
        os.environ['CHONGGU_ASR_DEVICE'] = 'cpu'
        return _faster(x, model, 'cpu', language, prompt, word_timestamps, kw)
