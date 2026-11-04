"""混音、检查、打包、发布共用的小工具：标准文件名、时间线、口播文件、ffprobe、边解码边给的灰度帧。"""
import json, re, subprocess, tempfile
from pathlib import Path
import numpy as np
from chonggu import paths

FPS = 30
MiB = 2 ** 20
RES = {'1080': '1080p', '1080p': '1080p', '2k': '2K', '2K': '2K', '1440': '2K', '1440p': '2K'}


def res_key(r):   # 命令行写 1080 / 2k；文件名里写 1080p / 2K
    return '2k' if RES.get(str(r), '1080p') == '2K' else '1080'


def name(ep, kind, res=None, ext='.mp4'):
    """标准文件名：先问 ep.file_stem（episode.yaml 里的格式），它不认识这一类就按第 8 期的写法拼。"""
    try:
        s = ep.file_stem(kind, res)
    except (KeyError, ValueError, TypeError, AttributeError, NotImplementedError):
        s = None
    if s:
        s = str(s)
        return s if Path(s).suffix or not ext else s + ext
    N, V, R = ep.number, ep.version, RES.get(str(res), '1080p') if res else None
    title = (ep.raw or {}).get('title') or ep.slug
    slug = re.sub(r'[^a-z0-9]+', '_', str(((getattr(ep, 'publish', None) or {}).get('asset_slug')) or ep.slug).lower()).strip('_') or 'episode'
    return {'film': f'重估_第{N}期_{title}_{V}_{R or "1080p"}.mp4',
            'novo': f'{V}_novo.mp4',
            'phone': f'第{N}期{V}_手机_{res}.mp4',
            'phone_full': f'第{N}期{V}_完整版_手机.mp4',
            'editpack': f'编辑包_{V}',
            'cover': f'重估_第{N}期_封面_{res or "16比9"}.png',
            'intro': f'发布简介_第{N}期.md',
            'credits': f'CREDITS_第{N}期.md',
            'release': f'chonggu_ep{N}_{slug}_{V}_{(R or "1080p").lower()}.mp4'}[kind]


def film(ep, res='1080'):          # 成片（带声音）
    return ep.out(name(ep, 'film', res_key(res)))


def noaudio(ep, res='1080'):       # 渲染接好的无声画面（render 模块定的：out/v18_noaudio.mp4、v18_2k_noaudio.mp4）
    from chonggu.render.run import noaudio_path
    return noaudio_path(ep, res_key(res))


def parts_dir(ep, res='1080'):     # 分章文件 out/parts/00_a.mp4 …（2K 在 out/parts2k/），日志 log_00_a_1080p.txt（render 模块定的）
    from chonggu.render.run import parts_dir as d
    return Path(d(ep, res_key(res)))


def loud(ep):   # 响度目标（episode.yaml 的 music.loudness）：I −15、TP −1.5、LRA ≥4、峰值 ≤−1.0、I 允许差 0.5
    return {'I': -15.0, 'TP': -1.5, 'LRA_min': 4.0, 'peak_max': -1.0, 'tol': .5, **((getattr(ep, 'music', None) or {}).get('loudness') or {})}


def phone_cfg(ep):
    """手机版：episode.yaml 的 pack.phone_parts（分段）和 pack.phone（可不写：高 720、每个文件 <29.5 MiB、crf 28 起）"""
    pk = getattr(ep, 'pack', None) or {}
    return {'height': 720, 'max_mib': 29.5, 'crf': 28, **(pk.get('phone') or {}), 'parts': pk.get('phone_parts') or (pk.get('phone') or {}).get('parts') or []}


def novo(ep):                      # 没有口播的版本（给主讲自己剪口播用）
    return ep.out(name(ep, 'novo'))


def timeline(ep):
    return json.loads((Path(ep.root) / 'timeline.json').read_text(encoding='utf-8'))


def chapters(T):
    return [(c['t0'], c['t1'], c['pre'], c['name']) for c in T['chapters']]


def where(T, t):   # 这个时刻在哪一章（前缀）
    cs = [c['pre'] for c in T['chapters'] if c['t0'] <= t]
    return cs[-1] if cs else T['chapters'][0]['pre']


def mmss(t):
    return f'{int(t // 60)}:{t % 60:05.2f}'


def voice_wav(ep, T=None, given=None):
    """整条口播：命令行给的 > timeline.json 里记的 voice（相对 voice/）> voice/ 下最新的、旁边有 .spans.json 的 wav。"""
    if given:
        return Path(given)
    T = T or timeline(ep)
    v = T.get('voice')
    if v:
        for p in (Path(ep.voice(v)), Path(ep.root) / v):
            if p.exists():
                return p
    c = sorted((w for w in Path(ep.voice()).rglob('*.wav') if spans_of(w).exists()), key=lambda w: w.stat().st_mtime)
    if not c:
        raise FileNotFoundError('找不到整条口播（timeline.json 的 voice，或 voice/ 下带 .spans.json 的 wav）；先跑 voice 和 timeline')
    return c[-1]


def spans_of(wav):   # v18_owner.wav → v18_owner.spans.json（每句在整条口播里的起止）
    return Path(wav).with_suffix('.spans.json')


def quote_ids(ep):
    q = getattr(ep, 'quote_ids', None)
    return set(q) if q else set((getattr(ep, 'quotes', None) or {}).keys())


def duration(p):
    r = subprocess.run([paths.need('ffprobe'), '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    return float(r.stdout.strip() or 0)


def size_wh(p):
    r = subprocess.run([paths.need('ffprobe'), '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', str(p)],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    w, h = (r.stdout.strip().split(',') + ['0', '0'])[:2]
    return int(w or 0), int(h or 0)


def audio_md5(p):   # 音轨不解码直接算哈希：2K 配的是不是 1080p 那条声音
    r = subprocess.run([paths.need('ffmpeg'), '-v', 'error', '-i', str(p), '-map', '0:a', '-c', 'copy', '-f', 'md5', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    m = re.search(r'MD5=([0-9a-f]+)', r.stdout)
    return m[1] if m else None


def gray(path, w, h, fps=FPS, ss=None, t=None):
    """逐帧灰度（uint8，h×w），边解码边给，不把整片读进内存。"""
    cmd = [paths.need('ffmpeg'), '-v', 'error'] + (['-ss', f'{ss}'] if ss else []) + (['-t', f'{t}'] if t else []) + \
          ['-i', str(path), '-vf', f'fps={fps},scale={w}:{h},format=gray', '-f', 'rawvideo', '-']
    err = tempfile.TemporaryFile()   # ffmpeg 的报错先存着：读完了还报错才打出来（中途不要了被掐掉的那种不打）
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=err)
    n, done = w * h, False
    try:
        while True:
            b = p.stdout.read(n)
            if len(b) < n:
                done = True
                break
            yield np.frombuffer(b, np.uint8).reshape(h, w)
    finally:
        p.stdout.close()
        if p.poll() is None:
            p.kill()
        p.wait()
        if done and p.returncode:
            err.seek(0); print(f'  ffmpeg 解码 {Path(path).name} 出错：', err.read().decode('utf-8', 'replace').strip()[-500:])
        err.close()


def half(f):   # 320×180 → 160×90（2×2 取平均）：一次解码同时喂几种检查
    h, w = f.shape
    return f.reshape(h // 2, 2, w // 2, 2).mean((1, 3), dtype=np.float32)


def feed(frames, *dets):
    """把一路帧同时喂给几个检查（每个检查有 push(帧) 和 done()）。"""
    for f in frames:
        for d in dets:
            d.push(f)
    return [d.done() for d in dets]
