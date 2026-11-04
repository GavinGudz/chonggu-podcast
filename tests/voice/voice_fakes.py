"""口播流水线测试用的假东西：假的一期（不读 episode.yaml）、合成的「录音」、假的听写和变速。
合成录音：稿子里每个字一个短音，频率按字编号（300 Hz 起、每个字高 40 Hz）；假听写按频率把字认回来。这样整条流水线不用模型也能从头跑到尾。"""
import sys, types
from pathlib import Path
import numpy as np

try:
    import chonggu  # noqa: F401
except ImportError:   # 直接在仓库里跑 pytest
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

SR = 48000

class FakeEp:
    def __init__(self, root, raw=None, quotes=None, breath=None, slug='t'):
        self.root = Path(root); self.slug = slug; self.raw = raw or {}; self.quotes = quotes or {}
        self.quote_ids = set(self.quotes); self.breath = breath or {}
    def voice(self, *p): return self.root.joinpath('voice', *p)
    def out(self, *p): return self.root.joinpath('out', *p)

def tone(f, d, amp=.1, sr=SR):
    t = np.arange(int(d * sr)) / sr; w = np.hanning(len(t)) ** .3
    return (amp * np.sin(2 * np.pi * f * t) * w).astype(np.float32)

class Code:
    """字 ↔ 频率"""
    def __init__(self, chars):
        self.chars = sorted(set(chars)); self.f = {c: 300 + 40 * k for k, c in enumerate(self.chars)}
    def say(self, text, char=.12, gap=.05):
        """念一段字：每个字一个短音，字间 gap 秒；返回 (声音, [(字, 起, 止)])"""
        out, marks, t = [], [], 0.0
        for k, c in enumerate(text):
            if not ('一' <= c <= '鿿'): continue
            if out: out.append(np.zeros(int(gap * SR), np.float32)); t += gap
            out.append(tone(self.f[c], char)); marks.append((c, t, t + char)); t += char
        return (np.concatenate(out) if out else np.zeros(0, np.float32)), marks
    def hear(self, x, sr=16000):
        """假听写：找出一个个短音，按主频率认字 → [(字, 起, 止)]"""
        fr = sr // 100; e = np.sqrt(np.convolve(x.astype(np.float64) ** 2, np.ones(fr) / fr, 'same')[::fr]); on = e > 1e-3
        out, k = [], 0
        while k < len(on):
            if on[k]:
                j = k
                while j < len(on) and on[j]: j += 1
                seg = x[k * fr:j * fr]
                if len(seg) >= fr * 4:
                    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))); f0 = np.fft.rfftfreq(len(seg), 1 / sr)[int(np.argmax(sp))]
                    c = min(self.chars, key=lambda c: abs(self.f[c] - f0))
                    if abs(self.f[c] - f0) < 15: out.append((c, k / 100, j / 100))
                k = j
            else: k += 1
        return out

def merge_repeats(ws):
    """紧挨着（隔不到 .5 秒）重复的几个字只留第一遍的（whisper 整段听写常这样：念了半句又重念，字只写一次，时刻落在第一遍上）"""
    out, i = [], 0
    while i < len(ws):
        for n in (4, 3, 2):
            if i + 2 * n <= len(ws) and [w[0] for w in ws[i:i + n]] == [w[0] for w in ws[i + n:i + 2 * n]] and ws[i + n][1] - ws[i + n - 1][2] < .5:
                out += ws[i:i + n]; i += 2 * n; break
        else: out.append(ws[i]); i += 1
    return out

def install(monkeypatch, tmp_path):
    """装上假的 chonggu.voice.asr / stretch / denoise，听写缓存放到临时目录；返回一个函数：给它 Code，假听写就按它认字"""
    from chonggu import paths
    monkeypatch.setattr(paths, 'cache_dir', lambda: tmp_path / 'cache', raising=False)
    state = {}
    asr = types.ModuleType('chonggu.voice.asr')
    def transcribe(audio, sr=16000, language='zh', prompt=None, word_timestamps=True, **kw):
        if isinstance(audio, (str, Path)):
            import soundfile as sf
            audio, sr = sf.read(str(audio), dtype='float32')
        ws = state['code'].hear(np.asarray(audio), sr); segs, cur = [], []
        if len(audio) > 8 * sr: ws = merge_repeats(ws)   # 整段听写像 whisper 一样把重念的半句并掉
        for w in ws:   # 隔 .5 秒以上另起一段
            if cur and w[1] - cur[-1][2] >= .5: segs.append(cur); cur = []
            cur.append(w)
        if cur: segs.append(cur)
        S = [{'start': s[0][1], 'end': s[-1][2], 'text': ''.join(c for c, _, _ in s),
              'words': [{'word': c, 'start': a, 'end': b, 'probability': 1.0} for c, a, b in s]} for s in segs]
        return {'text': ''.join(s['text'] for s in S), 'segments': S}
    asr.transcribe = transcribe
    st = types.ModuleType('chonggu.voice.stretch')
    def tempo(x, sr, factor):   # 粗糙的保音高变速：10 ms 一帧，按比例跳着取帧（每一帧的频率不变，假听写还认得出字）
        fr = sr // 100; n = len(x) // fr; idx = np.minimum(np.round(np.arange(0, n, factor)).astype(int), max(0, n - 1))
        return np.concatenate([x[i * fr:(i + 1) * fr] for i in idx] + [x[n * fr:]]).astype(np.float32) if n else x
    st.tempo = tempo
    dn = types.ModuleType('chonggu.voice.denoise')
    def denoise(a, b):
        import shutil; shutil.copyfile(a, b)
    dn.denoise = denoise
    import chonggu.voice as V
    for name, m in [('asr', asr), ('stretch', st), ('denoise', dn)]:
        monkeypatch.setitem(sys.modules, f'chonggu.voice.{name}', m); monkeypatch.setattr(V, name, m, raising=False)
    return lambda code: state.__setitem__('code', code)
