"""口播流水线共用的小工具：配置（episode.yaml 的 voice 段）、读写、10 ms 能量、压停顿和它的位置换算、听写缓存、voice/flags.tsv。

episode.yaml 里和口播有关的（都可以不写，括号里是默认）：
  voice:
    recording: assets/rec.m4a   主讲的原始录音（一整期一次录完；念错了就重念，取最后完整的一遍）；这一期里没有就找 fetch-assets 的缓存（清单里的 name）
    denoise: true               降噪（ClearVoice MossFormer2_SE_48K）；false 或命令行 --no-denoise 跳过
    hp_hz: 70                   降噪前先切掉这以下的低频（二阶高通）
    pause_cap: 0.3              每句里超过这么长的停顿收到这么长
    max_tempo: 1.22             提速上限
    target_cpm: 300             提速的目标：说话时每分钟多少个汉字（提速 = min(上限, 目标 / 实测)）
    tempo: null                 写了就定死这个提速（第 8 期是 1.2）
    asr_prompt: null            整段听写的提示；不写就用「以下是简体中文的句子。」加稿子里的英文词
    ovr: voice/ovr.json         人工核过的取段（见 assemble.py）
    review: voice/seams_review.json   人工核过的接缝（见 seams.py）
    timeline_est: timeline_est.json   估算时间线（稿子里写的（停 x）从这里取）；第一次重排时间线时自动从 timeline.json 备份
    raw_gaps: null              拼原始口播时句间停顿取哪个时间线（默认同 timeline_est）
    inputs:                     现成的中间结果：给了就直接用，这一步不再重算（第 8 期回归就是这么指回原来的文件）
      wav / hp / se / asr / sel / local / seams: 路径
路径都相对这一期的文件夹，也可以写绝对路径（只在本机用的配置里写，别提交）。"""
import hashlib, json, os, platform, re, shutil, subprocess, sys
from math import gcd
from pathlib import Path
from types import SimpleNamespace
import numpy as np, soundfile as sf
from scipy.signal import resample_poly

SR = 48000; FR = 480   # 48 kHz；能量一律按 10 ms 一帧算
TH = -50               # 拼接、压停顿用的静音门限（降噪后的能量，dB）
HAN = re.compile(r'[一-鿿]')
PROMPT = '以下是简体中文的句子。'

# ---------- 读写 ----------
def load_json(p):
    with open(p, encoding='utf-8') as f: return json.load(f)

def dump_json(obj, p, indent=None):
    p = Path(p); p.parent.mkdir(parents=True, exist_ok=True); tmp = p.with_name(p.name + '.tmp')
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f: json.dump(obj, f, ensure_ascii=False, indent=indent)
    from chonggu import paths
    paths.replace(tmp, p)   # Windows：目标正被别的程序读着时等一会儿再换

def resample(y, sr, to=SR):
    if sr == to: return y.astype(np.float32, copy=False)
    g = gcd(int(sr), int(to)); return resample_poly(y, to // g, int(sr) // g).astype(np.float32)

def read_wav(p, sr=SR):
    """单声道 float32；采样率不对就换成 sr"""
    y, r = sf.read(str(p), dtype='float32', always_2d=True); y = y.mean(1) if y.shape[1] > 1 else y[:, 0]
    return resample(y, r, sr) if sr else y

def write_wav(p, y, subtype='FLOAT', sr=SR):
    p = Path(p); p.parent.mkdir(parents=True, exist_ok=True); sf.write(str(p), np.asarray(y, np.float32), sr, subtype=subtype)

def ffmpeg():
    try:
        from chonggu import paths
        return paths.tool('ffmpeg')
    except ImportError: return shutil.which('ffmpeg')

def decode(src, dst):
    """任意格式的录音 → 48 kHz 单声道 float wav（m4a、mp3 要 ffmpeg；wav、flac 没有 ffmpeg 也行）"""
    exe = ffmpeg(); Path(dst).parent.mkdir(parents=True, exist_ok=True)
    if exe:
        subprocess.run([exe, '-v', 'error', '-y', '-i', str(src), '-ac', '1', '-ar', str(SR), '-c:a', 'pcm_f32le', str(dst)], check=True)
    else: write_wav(dst, read_wav(src))

# ---------- 能量、压停顿 ----------
def env_db(x):
    """每 10 ms 的能量（dB），和第 8 期的写法一样"""
    return 20 * np.log10(np.sqrt(np.convolve(x ** 2, np.ones(FR) / FR, 'same')[::FR]) + 1e-9)

def squeeze(y, maxgap=.45, to=.32):
    """一段连读里的长停顿压短：超过 maxgap 的停顿留头尾各一半、一共 to 秒（段首段尾的停顿不动）"""
    e = env_db(y) < TH + 3
    out, k, n = [], 0, len(e)
    while k < n:
        j = k
        while j < n and e[j] == e[k]: j += 1
        seg = y[k * FR:j * FR]
        if e[k] and (j - k) / 100 > maxgap and k > 0 and j < n: keep = int(to * SR); h = keep // 2; seg = np.concatenate([seg[:h], seg[-(keep - h):]])
        out.append(seg); k = j
    out.append(y[n * FR:]); return np.concatenate(out)

def squeeze_map(y, maxgap=.45, to=.32):
    """同 squeeze，给出原来每个采样压过以后的位置（被压掉的中间那段算到接口处）；最后一个数 = 压过以后的总长。
    直接拿半截去 squeeze 不对：半截末尾的长停顿不会被压（第 8 期 nx04 就这么多静掉了「今年 9 月」）"""
    e = env_db(y) < TH + 3
    m = np.zeros(len(y) + 1, np.int64); pos, k, n = 0, 0, len(e)
    while k < n:
        j = k
        while j < n and e[j] == e[k]: j += 1
        a_, b_ = k * FR, min(j * FR, len(y)); L_ = b_ - a_; ix = np.arange(L_)
        if e[k] and (j - k) / 100 > maxgap and k > 0 and j < n:
            keep = int(to * SR); h = keep // 2; m[a_:b_] = pos + np.where(ix < h, ix, np.where(ix >= L_ - (keep - h), ix - (L_ - keep), h)); pos += keep
        else: m[a_:b_] = pos + ix; pos += L_
        k = j
    r = len(y) - n * FR
    if r > 0: m[n * FR:len(y)] = pos + np.arange(r); pos += r
    m[len(y)] = pos; return m

def unsqueeze(m, s):
    """squeeze_map 反过来：压过以后的第 s 个采样，对应原来的第几个采样"""
    return int(np.searchsorted(m, s, side='left'))

def fade(y, ms=8):
    n = min(len(y) // 2, int(ms / 1000 * SR)); r = np.linspace(0, 1, n, dtype=np.float32)
    y = y.copy(); y[:n] *= r; y[-n:] *= r[::-1]; return y

def han(text): return len(HAN.findall(text))

def lcs(a, b):
    """最长公共子序列的长度（整句核对用：多出来的 = len(听) - lcs，少掉的 = len(稿) - lcs）"""
    p = [0] * (len(b) + 1)
    for ca in a:
        q = [0]
        for j, cb in enumerate(b): q.append(p[j] + 1 if ca == cb else max(p[j + 1], q[j]))
        p = q
    return p[-1]

# ---------- 配置 ----------
DEFAULTS = dict(denoise=True, hp_hz=70, pause_cap=.3, max_tempo=1.22, target_cpm=300, tempo=None, asr_prompt=None)

def _path(root, p):
    return None if p in (None, '') else Path(root) / Path(str(p)).expanduser()   # 绝对路径照用

def vcfg(ep):
    """episode.yaml 的 voice 段 → 一个带默认值、路径都解析好的对象"""
    v = dict(((getattr(ep, 'raw', None) or {}).get('voice')) or {})
    c = SimpleNamespace(**{k: v.get(k, d) for k, d in DEFAULTS.items()})
    R = lambda p: _path(ep.root, p); VP = lambda *a: Path(ep.voice(*a))
    c.recording = R(v.get('recording'))
    if c.recording and not c.recording.exists():   # 这一期文件夹里没有：是 fetch-assets 下到缓存里的（示例期的 CC0 录音）
        try:
            from chonggu import paths
            a = Path(paths.asset(v['recording'])); c.recording = a if a.exists() else c.recording
        except Exception: pass
    c.ovr = R(v.get('ovr')) or VP('ovr.json')
    c.review = R(v.get('review')) or VP('seams_review.json')
    c.flags = VP('flags.tsv')
    c.timeline = Path(ep.root) / 'timeline.json'
    c.timeline_est = R(v.get('timeline_est')) or Path(ep.root) / 'timeline_est.json'
    c.own_est = not v.get('timeline_est')   # 估算时间线是不是我们自己备份的那份（别人指定的文件不去覆盖）
    c.raw_gaps = R(v.get('raw_gaps'))
    c.fixed = {k: R(p) for k, p in (v.get('inputs') or {}).items() if p}
    for k, f in [('wav', 'rec.wav'), ('hp', 'rec_hp.wav'), ('se', 'rec_se.wav'), ('asr', 'asr.json'), ('sel', 'sel.json'), ('local', 'local.json'), ('seams', 'seams.json')]:
        setattr(c, k, c.fixed.get(k) or VP(f))
    for k, f in [('narr_raw', 'narr_raw.wav'), ('spans', 'narr_spans.json'), ('groups', 'narr_groups.json'), ('chunks', 'chunks.json'),
                 ('narr_base', 'narr_c_base.wav'), ('narr_c', 'narr_c.wav'), ('mute_check', 'mute_check.json'), ('lines', 'lines'),
                 ('narration', 'narration.wav'), ('quotes_wav', 'narration_quotes.wav'), ('narr_spans', 'narration.spans.json'), ('check', 'check.json')]:
        setattr(c, k, VP(f))
    return c

def quotes(ep):
    """原声句：id -> {'file': Path, 'dur': 秒}（只认 episode.yaml 里登记的；时长没写就量文件）"""
    out = {}
    for i, q in (getattr(ep, 'quotes', None) or {}).items():
        q = q or {}; f = q.get('file'); p = None
        if f:
            p = _path(ep.root, f)
            if not p.exists() and (Path(ep.root) / 'assets' / f).exists(): p = Path(ep.root) / 'assets' / f
            if not p.exists():   # fetch-assets 下载到缓存里的
                try:
                    from chonggu import paths
                    a = Path(paths.asset(f)); p = a if a.exists() else p
                except Exception: pass
        d = q.get('dur')
        if d is None and p is not None and p.exists(): d = sf.info(str(p)).duration
        out[i] = {'file': p, 'dur': None if d is None else float(d)}
    return out

def quote_ids(ep):
    return set(getattr(ep, 'quote_ids', None) or (getattr(ep, 'quotes', None) or {}).keys())

def breath(ep):
    """呼吸点 {句id: 开口前多空几秒}；episode.yaml 里可以直接写，也可以写一个 json 文件的路径"""
    b = getattr(ep, 'breath', None) or {}
    if isinstance(b, (str, Path)): b = load_json(_path(ep.root, b))
    return {k: float(v) for k, v in b.items() if not str(k).startswith('_')}

def load_timeline(c):
    from chonggu.gates import GateFailed
    if not c.timeline.exists(): raise GateFailed(f'没有 {c.timeline.name}：先跑 script-check，从稿子生成估算时间线')
    return load_json(c.timeline)

def est_timeline(c, T=None):
    """估算时间线（稿子里写的（停 x）在这里）：timeline_est.json（script-check 每次都重写）；没有、而现在的 timeline.json 还是估算的，就用它"""
    if c.timeline_est.exists(): return load_json(c.timeline_est)
    T = T if T is not None else (load_json(c.timeline) if c.timeline.exists() else None)
    return T if T and T.get('estimated') else None

def gaps_of(T):
    """每句说完到下一句开口的空档（按时间线）"""
    if not T: return {}
    B = T['beats']; return {b['id']: round(B[i + 1]['start'] - b['end'], 3) for i, b in enumerate(B[:-1])}

def english_terms(beats, n=15):
    """稿子里出现最多的英文词（给听写当提示）"""
    cnt, first = {}, {}
    for k, b in enumerate(beats):
        for w in re.findall(r'[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9]', b['text']):
            cnt[w] = cnt.get(w, 0) + 1; first.setdefault(w, k)
    top = sorted(cnt, key=lambda w: (-cnt[w], first[w]))[:n]
    return sorted(top, key=lambda w: first[w])

def prompt_for(c, beats):
    if c.asr_prompt: return c.asr_prompt
    t = english_terms(beats); return PROMPT + ('、'.join(t) + '。' if t else '')

# ---------- 听写（加缓存） ----------
def x16(x, sr=SR):
    return resample(np.asarray(x, np.float32), sr, 16000)

def _plain(r, words):
    seg = [{'start': float(s['start']), 'end': float(s['end']), 'text': s.get('text', ''),
            'words': [{'word': w['word'], 'start': float(w['start']), 'end': float(w['end']), 'probability': float(w.get('probability') or 0)} for w in s.get('words') or []]}
           for s in r.get('segments') or []] if words else []
    return {'text': r.get('text', ''), 'segments': seg}

class Ear:
    """听写（chonggu.voice.asr.transcribe）加一层缓存：同一段声音、同一个提示只听一次（按内容的 sha1），改了一句再跑只听改了的。
    缓存在每个人自己的缓存文件夹里（paths.cache_dir()/asr/<期>.json），不进仓库。"""
    def __init__(self, ep):
        from chonggu import paths
        self.p = Path(paths.cache_dir()) / 'asr' / f'{ep.slug}.json'
        try: self.d = load_json(self.p) if self.p.exists() else {}
        except ValueError: self.d = {}
        self.n = 0; self.tag = '|'.join([os.environ.get('CHONGGU_ASR_MODEL', ''), sys.platform, platform.machine()])
    def __call__(self, x, prompt=None, words=False, sr=SR, **kw):
        """kw 原样交给听写（第 8 期查接缝、查重念、整句核对都用 temperature=0）"""
        z = x16(x, sr); k = hashlib.sha1(z.tobytes() + f'|{prompt}|{words}|{sorted(kw.items())}|{self.tag}'.encode('utf-8')).hexdigest()
        if k not in self.d:
            from chonggu.voice.asr import transcribe
            self.d[k] = _plain(transcribe(z, sr=16000, language='zh', prompt=prompt, word_timestamps=words, **kw), words); self.n += 1
            if self.n % 40 == 0: self.save()
        return self.d[k]
    def text(self, x, prompt=PROMPT, sr=SR, **kw):
        return re.sub(r'\s+', '', self(x, prompt=prompt, sr=sr, **kw)['text'])
    def save(self):
        if self.n: dump_json(self.d, self.p)

def asr_compact(r):
    """整段听写结果存成第 8 期 asr16.json 的样子：[{start, end, text, words: [{w, s, e, p}]}]"""
    return [{'start': s['start'], 'end': s['end'], 'text': s['text'], 'words': [{'w': w['word'], 's': w['start'], 'e': w['end'], 'p': w.get('probability')} for w in s.get('words', [])]}
            for s in r['segments']]

def wget(w, k):
    """词的字段：第 8 期的紧凑写法（w/s/e）和听写原样（word/start/end）都认"""
    return w[k] if k in w else w[{'w': 'word', 's': 'start', 'e': 'end'}[k]]

# ---------- voice/flags.tsv ----------
class Flags:
    """要人听的地方，一行一处：status	kind	id	key	detail。
    status 改成 ok（听过了没问题）或 fixed（已经在 ovr.json / seams_review.json 里改好）；还是 open 的会挡住下一步。
    重跑时同一处（kind + id + key 一样）的 status 保留；这次没再查出来的就去掉了。"""
    HEAD = '# status 改成 ok（听过了，没问题）或 fixed（已经改好）；open 的会挡住下一步。kind：take 取段、clip 接缝切到邻句、repeat 念了半句又重念、mute 静音以后少字、line 整句核对'
    def __init__(self, p):
        self.p = Path(p); self.rows = []
        if self.p.exists():
            raw = self.p.read_bytes()
            try: text = raw.decode('utf-8-sig')   # 用 Excel 存过的会带 BOM
            except UnicodeDecodeError:   # Excel 存成「文本文件（制表符分隔）」是 GBK
                text = raw.decode('gbk', errors='replace'); print(f'  ! {self.p.name} 不是 UTF-8（Excel 存的？）：按 GBK 读了，下次存回 UTF-8')
            for ln in text.splitlines():
                if not ln or ln.startswith('#') or ln.startswith('status\t'): continue
                r = (ln.split('\t') + [''] * 5)[:5]; self.rows.append(r)
    def set_kind(self, kind, items):
        """items: [(id, key, detail)] —— 这一类全部换成这些，原来的 status 按 (kind, id, key) 保留"""
        old = {(r[1], r[2], r[3]): r[0] for r in self.rows}
        clean = lambda s: re.sub(r'[\t\r\n]+', ' ', str(s))
        new = [[old.get((kind, clean(i), clean(k)), 'open'), kind, clean(i), clean(k), clean(d)] for i, k, d in items]
        self.rows = [r for r in self.rows if r[1] != kind] + new; self.save()
    def open(self, kinds=None):
        return [r for r in self.rows if r[0].strip().lower() == 'open' and (kinds is None or r[1] in kinds)]
    def save(self):
        self.p.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(self.p, 'w', encoding='utf-8', newline='\n') as f:
                f.write(self.HEAD + '\nstatus\tkind\tid\tkey\tdetail\n')
                for r in self.rows: f.write('\t'.join(r) + '\n')
        except PermissionError:   # Windows：Excel 开着它时整个文件锁住
            from chonggu.gates import GateFailed
            raise GateFailed(f'{self.p.name} 正被 Excel 或别的程序打开着：关掉再跑') from None

# ---------- 每一步要不要重跑 ----------
def sig(*xs):
    """输入的指纹：文件按大小和修改时间，别的东西按内容"""
    h = hashlib.sha1()
    for x in xs:
        if isinstance(x, Path): h.update((f'{x}|{x.stat().st_size}|{x.stat().st_mtime_ns}' if x.is_file() else f'{x}|dir' if x.is_dir() else f'{x}|missing').encode('utf-8'))
        else: h.update(json.dumps(x, ensure_ascii=False, sort_keys=True, default=str).encode('utf-8'))
        h.update(b'\0')
    return h.hexdigest()

class Stamps:
    def __init__(self, p):
        self.p = Path(p)
        try: self.d = load_json(self.p) if self.p.exists() else {}
        except ValueError: self.d = {}
    def same(self, name, s): return self.d.get(name) == s
    def put(self, name, s): self.d[name] = s; dump_json(self.d, self.p, indent=0)
