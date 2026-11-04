"""按「情绪编排」混音（第 8 期 v15 起，取代一章一首、从头垫到尾）：python -m chonggu mix <期> [--sample 起秒 止秒] [--no-novo | --novo-only]
为什么这样混：v13 整片听下来累，一直是一种情绪，没有注意力上下跳动。量出来：配乐低音鼓点从头响到尾、
离人声太近、94% 的时间都有人在说、音效 4 秒一个。小Lin 那两期：说话时音乐比人声低 12–20 dB，25–30 秒留一口 1.5–3 秒的气，
气口里音乐顶上来；讲定义、提醒时整个撤掉。
编排文件（episode.yaml 的 music_plan，默认 music/plan.json）：
  sections：[{file, from, to, offset, under, breath, fin, fout, align_end}] —— 一段一首；from / to 是锚点；
     under：人声底下比人声低几 dB（按 150 Hz–8 kHz 的能量比）；breath：没人说话的气口里比人声低几 dB（音乐顶上来）。
  drops：[{from, to}] —— 这一段一点音乐都没有（爆点前收掉、转折句清唱）。
  hits：[{at, sfx, db}] —— 加在爆点上的音效。
  sfx_keep：画面代码登记的音效只留这几类（其余去掉）；sfx_db：留下的整体再调几 dB；sfx_map：音效类 → 文件（不写用下面的 MAP）。
     默认表 MAP 里只有 assets/manifest.json 登记了授权的音效。别的音效类（比如恐怖片式快剪的 hz_hit），这一期自己有文件的
     就在 sfx_map 里写上（{"hz_hit": "hz_hit.mp3"}，文件放这一期的 assets/），再记进这一期的 CREDITS。
锚点：END = 片尾；「句id」= 开口；「句id.cut」= 这句的镜头切点；「句id.end」= 说完；「句id:字」= 那个字（第一次出现的）；后面可跟 +秒 / -秒。
人声底下的音乐切掉 140 Hz 以下（不和人声抢、没有「咚咚」），气口里全频段（鼓点回来，像换了口气）。
一次算好配乐、音效、原声，出两份：成片（加口播）和不带口播的版本（给主讲自己剪口播用的底；音乐照样按口播让开）。
响度：两遍 loudnorm 的线性模式（整体一个增益，不在字缝里抬底噪），−15 LUFS，TP −1.5（episode.yaml 的 music.loudness）。
有 2K 无声画面的话，配上同一条声音。不能同时跑两个混音（都写 out/cues.json）。"""
import json, re, subprocess, tempfile
from pathlib import Path
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
from chonggu import paths
from chonggu.gates import GateFailed
from chonggu.qa import common as C

SR = 48000
MAP = {'swish': 'sfx_whoosh.mp3', 'pop': 'sfx_pop.mp3', 'click': 'sfx_tick.mp3', 'tick': 'sfx_tick.mp3', 'hit': 'sfx_boom1.mp3', 'stamp': 'sfx_impact.mp3',
       'page': 'sfx_page1.mp3', 'thump': 'sfx_boom2.mp3', 'riser': 'sfx_riser.mp3', 'flash': 'sfx_flash.mp3', 'sparkle': 'sfx_sparkle1.mp3',
       'glitch': 'sfx_glitch.mp3', 'boom': 'sfx_whoosh_boom.mp3', 'soft': 'sfx_soft_impact.mp3',
       'hz_click': 'sfx_tick.mp3', 'hz_riser': 'sfx_riser.mp3'}   # hz_：恐怖片式的快剪（别的 hz_ 类没有登记授权的文件，要用就写进这一期的 sfx_map）
LONG = {'hit', 'stamp', 'boom', 'soft', 'riser', 'thump', 'hz_impact', 'hz_braam', 'hz_rev', 'hz_riser'}   # 这几类放完整，其余只取前 0.6 秒

dec = lambda p: np.frombuffer(subprocess.run([paths.need('ffmpeg'), '-v', 'error', '-i', str(p), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                                             capture_output=True).stdout, np.float32).reshape(-1, 2).copy()
band = lambda x: sosfilt(butter(2, [150, 8000], btype='band', fs=SR, output='sos'), x, axis=0)
rmsdb = lambda x: 10 * np.log10(np.mean(x ** 2) + 1e-20)


def load_plan(ep):
    p = Path(getattr(ep, 'music_plan', None) or 'music/plan.json'); p = p if p.is_absolute() else Path(ep.root) / p
    if not p.exists():
        raise GateFailed(f'没有配乐编排文件 {p.name}（episode.yaml 的 music_plan）')
    return json.loads(p.read_text(encoding='utf-8'))


def anchors(T):
    BT = {b['id']: b for b in T['beats']}

    def at(a):
        if a == 'END':
            return T['duration']
        m = re.fullmatch(r'([a-z]+\d*q?)(?:(\.cut|\.end)|:(.+?))?([+-][\d.]+)?', a)
        if not m or m[1] not in BT:
            raise GateFailed(f'编排里的锚点「{a}」找不到句子（timeline.json 里没有这个句 id）')
        b = BT[m[1]]; k = m[2] or ''
        if m[3] and m[3] not in b['text']:
            raise GateFailed(f'编排里的锚点「{a}」：{m[1]} 这句没有「{m[3]}」（这句现在是：{b["text"]}）')
        t = b['start'] if k == '.cut' else b['end'] if k == '.end' else b['chars'][b['text'].index(m[3])][1] if m[3] else b.get('vstart', b['start'])
        return t + float(m[4] or 0)
    return at


def find_audio(ep, f):
    """素材：先找这一期自己的（assets/、music/，不进 git），再找 fetch-assets 下到缓存里的。"""
    R = Path(ep.root)
    for p in (R / f, R / 'music' / f, R / 'assets' / f, R / 'assets' / 'music' / f, R / 'assets' / 'sfx' / f):
        if p.exists():
            return p
    for n in (f, Path(f).name):
        try:
            p = Path(paths.asset(n))
        except Exception:
            continue
        if p.exists():
            return p
    raise GateFailed(f'找不到素材 {f}：放进这一期的 assets/，或者登记进 assets/manifest.json 再跑 python -m chonggu fetch-assets')


def cues(ep):
    """画面代码登记的切点、音效（K.sfx）和原声（K.aud）：每次混音前让 render 模块重新导一遍 out/cues.json，导不出来就用上次的。"""
    p = Path(ep.out('cues.json'))
    try:
        from chonggu.render import run as R
        return (getattr(R, 'cues', None) or R.export_cues)(ep, p)
    except (GateFailed, OSError, subprocess.SubprocessError) as e:
        if not p.exists():
            raise GateFailed(f'导不出画面代码登记的音效和原声（{p.name}）：{e}') from None
        print('  这次没导出 cues，用上次的', p.name, '：', str(e).strip().splitlines()[0][:120])
    return json.loads(p.read_text(encoding='utf-8'))


def interlude_gaps(ep, T):
    """章名卡、新闻插段：开口前那段长气口 [start, vstart]。episode.yaml 的 interludes 写了就用它，没写就取气口 ≥10 秒的句子。"""
    BT = {b['id']: b for b in T['beats']}; ids = []
    for x in getattr(ep, 'interludes', None) or []:   # 写法：'wh01' 或 {id: wh01, …}（at / beat / before 也认）
        i = x if isinstance(x, str) else next((x[k] for k in ('id', 'beat', 'at', 'before') if x.get(k)), '') if isinstance(x, dict) else ''
        m = re.match(r'[a-z]+\d*q?', str(i))
        if m:
            ids.append(m[0])
    if not ids:
        ids = [k for k, v in (T.get('breath') or {}).items() if v >= 10]
    return [(BT[i]['start'], BT[i].get('vstart', BT[i]['start'])) for i in ids if i in BT]


def plan_problems(ep, T, P):
    """第 9 节的配乐编排检查：说话时比人声低 12–20 dB，气口抬升不高于 −4 dB；章名卡和新闻插段那几段 breath ≤ −7、fin ≥ 1.0。"""
    at = anchors(T); bad = []; gaps = interlude_gaps(ep, T)
    for k, s in enumerate(P['sections'], 1):
        u, b, fi = s.get('under', -20), s.get('breath', -4), s.get('fin', .6)
        if not -20 <= u <= -12:
            bad.append(f"第 {k} 段 {s['file']}（{s['from']}）：under {u}，说话时要比人声低 12–20 dB")
        if b > -4:
            bad.append(f"第 {k} 段 {s['file']}（{s['from']}）：breath {b}，气口里不能高过 −4 dB")
        a, z = at(s['from']), at(s['to'])
        if z > a and any(max(0, min(z, g1) - max(a, g0)) >= .5 * (z - a) for g0, g1 in gaps) and (b > -7 or fi < 1.0):
            bad.append(f"第 {k} 段 {s['file']}（{s['from']}）在章名卡/新闻插段里：breath {b}、fin {fi}，要 breath ≤ −7、fin ≥ 1.0（原声一停音乐就冲上来会显得欢快）")
    SM = {**MAP, **P.get('sfx_map', {})}
    for k in sorted(set(P.get('sfx_keep', [])) | {h['sfx'] for h in P.get('hits', [])}):
        if k not in SM:   # 以前默默换成 pop：现在要写清楚用哪个文件
            bad.append(f'音效类「{k}」默认表里没有：在 plan.json 的 sfx_map 里写它用哪个文件（{{"{k}": "文件名.mp3"}}，文件放这一期的 assets/，记进 CREDITS）')
    return bad


def sfx_events(P, Q, at):
    keep = set(P.get('sfx_keep', [])); SD = P.get('sfx_db', -5)
    return [(t, k, (db if db is not None else -20) + SD) for t, k, db in Q.get('sfx', []) if k in keep] + \
           [(at(h['at']), h['sfx'], h.get('db', -14)) for h in P.get('hits', [])]


def stems(ep, T, P, Q, voice):
    """算好四条：口播 vo、原声 qa、配乐 m、音效 fx（都是 48k 双声道 float32，长度 = 片长）。"""
    n = int(T['duration'] * SR); at = anchors(T)
    # 人声：口播 + 原声（画面代码登记的 K.aud）；说话的地方 = 人声包络高于门限，0.6 秒以内的停顿算在说话里（不让音乐在字缝里起伏）
    vo = np.zeros((n, 2), np.float32); v = dec(voice); vo[:min(n, len(v))] = v[:n]
    qa = np.zeros((n, 2), np.float32); aud = [(t, dec(find_audio(ep, f)), db) for t, f, db in Q.get('aud', [])]
    # 原声句（episode.yaml 的 quotes）：画面代码没用 K.aud 登记的，从 voice 拼出的 *_quotes.wav 里按 spans 取（两边都登记的只放一遍）
    qw, sp = Path(voice).with_name(Path(voice).stem + '_quotes.wav'), C.spans_of(voice)
    if qw.exists() and sp.exists():
        S = json.loads(sp.read_text(encoding='utf-8')); qy = None; extra = []
        for i in sorted(C.quote_ids(ep) & set(S)):
            a0, z0 = S[i]
            if any(a0 - 1.0 <= t <= z0 for t, _, _ in aud):
                continue
            qy = dec(qw) if qy is None else qy; extra.append(i)
            aud.append((a0, qy[int(a0 * SR):int(z0 * SR)], ((getattr(ep, 'quotes', None) or {}).get(i) or {}).get('db', -9)))
        if extra:
            print(f'  原声 {len(extra)} 句从 {qw.name} 放进去（画面代码没登记）：', ' '.join(extra))
    for t, a, db in aud:
        i = int(t * SR); L = min(len(a), n - i)
        if L <= 0:
            continue
        a = a[:L] * (10 ** (-20 / 20) / np.sqrt(np.mean(a[:L] ** 2) + 1e-20) * 10 ** ((db + 12) / 20)); fd = min(int(.04 * SR), L // 2)
        if fd:
            a[:fd] *= np.linspace(0, 1, fd)[:, None]; a[-fd:] *= np.linspace(1, 0, fd)[:, None]
        qa[i:i + L] += a
    fr = SR // 100; env = np.sqrt(np.convolve(((vo + qa) ** 2).mean(1), np.ones(fr) / fr, 'same')[::fr])
    talk = env > env.max() * .02
    k = 0
    while k < len(talk):   # 填掉短于 .6 秒的停顿
        if not talk[k]:
            j = k
            while j < len(talk) and not talk[j]:
                j += 1
            if j - k < 60 and k > 0 and j < len(talk):
                talk[k:j] = True
            k = j
        else:
            k += 1
    quote = np.convolve((qa ** 2).mean(1), np.ones(fr) / fr, 'same')[::fr] > 1e-6
    # 平滑成 0..1 的「气口」曲线：说话 0，没人说话 1；音乐在开口前 .25 秒就退下去、说完 .15 秒以后再顶上来
    op = (~talk).astype(np.float32); kk = np.ones(25) / 25
    lead = np.minimum(op, np.concatenate([op[25:], np.ones(25)]))        # 开口前 .25 秒先退
    br = np.convolve(np.minimum(lead, np.concatenate([np.zeros(15), op[:-15]])), kk, 'same').clip(0, 1)
    br = np.repeat(br, fr)[:n]; br = np.pad(br, (0, n - len(br)))
    qd = np.repeat(np.convolve(quote.astype(np.float32), kk, 'same').clip(0, 1), fr)[:n]; qd = np.pad(qd, (0, n - len(qd)))
    tk = np.repeat(talk, fr)[:n]; tk = np.pad(tk, (0, n - len(tk)))
    Vb = rmsdb(band(vo[tk])) if tk.any() else -30.   # 说话时人声在 150–8k 的能量

    hp = butter(4, 140, btype='high', fs=SR, output='sos')
    m = np.zeros((n, 2), np.float32)
    for s in P['sections']:
        a, b = max(0, int(at(s['from']) * SR)), min(n, int(at(s['to']) * SR)); L = b - a
        if L <= 0:
            continue
        x = dec(find_audio(ep, s['file']))
        off = max(0, len(x) - L) if s.get('align_end') else int(s.get('offset', 0) * SR); x = x[off:]   # align_end：曲子自己的结尾落在这一段的结尾（片尾曲）
        if not len(x):
            raise GateFailed(f"{s['file']} 的 offset {s.get('offset')} 超过了曲子本身的长度")
        if len(x) < L:
            x = np.concatenate([x] * (L // len(x) + 1))
        x = x[:L]; g0 = Vb - rmsdb(band(x))
        under, brv = 10 ** ((g0 + s.get('under', -20)) / 20), 10 ** ((g0 + s.get('breath', -4)) / 20)
        k_ = br[a:b][:, None]; gq = 1 - qd[a:b][:, None] * (1 - 10 ** (-6 / 20))   # 原声底下再低 6 dB
        y = sosfilt(hp, x, axis=0) * (1 - k_) * under + x * k_ * brv
        r = np.ones(L, np.float32); fi, fo = min(L, int(s.get('fin', .6) * SR)), min(L, int(s.get('fout', .8) * SR))
        if fi:
            r[:fi] = np.linspace(0, 1, fi)
        if fo:
            r[-fo:] = np.minimum(r[-fo:], np.linspace(1, 0, fo))
        m[a:b] += (y * gq * r[:, None]).astype(np.float32)
    for d in P.get('drops', []):
        a, b = int(at(d['from']) * SR), int(at(d['to']) * SR); f = int(.12 * SR)
        g = np.ones(n, np.float32); g[max(0, a):max(0, b)] = 0
        g[max(0, a - f):max(0, a)] = np.linspace(1, 0, f)[f - (max(0, a) - max(0, a - f)):]
        e = min(n, b + f) - b
        if e > 0:
            g[b:b + e] = np.linspace(0, 1, f)[:e]
        m *= g[:, None]

    SM = {**MAP, **P.get('sfx_map', {})}; REF = 10 ** (-20 / 20); fx = np.zeros((n, 2), np.float32); cache = {}
    ev = sfx_events(P, Q, at)
    for t, k_, db in ev:
        if k_ not in cache:
            cache[k_] = dec(find_audio(ep, SM.get(k_, SM['pop'])))
        y = cache[k_] if k_ in LONG else cache[k_][:int(.6 * SR)]; i = int(t * SR); L = min(len(y), n - i)
        if L > 0 and i >= 0:
            fx[i:i + L] += y[:L] * (REF / np.sqrt(np.mean(y ** 2) + 1e-20)) * 10 ** (db / 20)
    fx = sosfilt(butter(2, 90, btype='high', fs=SR, output='sos'), fx, axis=0).astype(np.float32)
    return vo, qa, m, fx, br, ev


def loudnorm(wav, vid, out, cut=None, I=-15., TP=-1.5):
    """两遍 loudnorm（线性模式）：第一遍量，第二遍按量出来的整体一个增益；接上画面写成 mp4（声音 48 kHz）。"""
    LN = f'loudnorm=I={I}:TP={TP}:LRA=20'
    meas = subprocess.run([paths.need('ffmpeg'), '-hide_banner', '-i', str(wav), '-af', LN + ':print_format=json', '-f', 'null', '-'],
                          capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    J = json.loads(meas[meas.rfind('{'):meas.rfind('}') + 1])
    ln = f"{LN}:measured_I={J['input_i']}:measured_TP={J['input_tp']}:measured_LRA={J['input_lra']}:measured_thresh={J['input_thresh']}:offset={J['target_offset']}:linear=true"
    v = ['-ss', f'{cut[0]:.3f}', '-t', f'{cut[1] - cut[0]:.3f}', '-i', str(vid)] if cut else ['-i', str(vid)]
    vc = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p'] if cut else ['-c:v', 'copy']   # 样片要切画面，只能重编码
    tmp = Path(out).with_name(Path(out).stem + '.mixing.mp4')
    subprocess.run([paths.need('ffmpeg'), '-v', 'error', '-y', *v, '-i', str(wav), '-map', '0:v', '-map', '1:a', '-af', ln, *vc, '-c:a', 'aac', '-b:a', '192k',
                    '-ar', str(SR), '-shortest', '-movflags', '+faststart', str(tmp)], check=True)
    paths.replace(tmp, out)


def mix(ep, video=None, voice=None, sample=None, novo=True, film=True):
    T = C.timeline(ep); P = load_plan(ep)
    bad = plan_problems(ep, T, P)
    if bad:
        raise GateFailed('配乐编排没过：\n  ' + '\n  '.join(bad))
    video = Path(video or C.noaudio(ep, '1080'))
    if not video.exists():
        raise GateFailed(f'没有无声画面 {video.name}，先跑 python -m chonggu render')
    voice = C.voice_wav(ep, T, voice); Q = cues(ep)
    vo, qa, m, fx, br, ev = stems(ep, T, P, Q, voice)
    a, b = (int(sample[0] * SR), int(sample[1] * SR)) if sample else (0, len(vo))
    outs = []
    if film:
        outs.append((C.film(ep, '1080') if not sample else Path(ep.out(f'{ep.version}_混音样_{sample[0]:g}-{sample[1]:g}s.mp4')), m + fx + qa + vo))
    if novo:
        outs.append((C.novo(ep) if not sample else Path(ep.out(f'{ep.version}_混音样_无口播_{sample[0]:g}-{sample[1]:g}s.mp4')), m + fx + qa))
    Path(ep.out()).mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=ep.out(), ignore_cleanup_errors=True) as d:   # Windows：杀毒刚扫完的 wav 一时删不掉，不要因此停在成片已经写好以后
        for out, x in outs:
            w = Path(d) / 'mix.wav'; sf.write(w, x[a:b].astype(np.float32), SR, subtype='FLOAT')
            loudnorm(w, video, out, sample, C.loud(ep)['I'], C.loud(ep)['TP']); print('  →', Path(out).name)
    del vo, qa, m, fx
    nk = len(ev) - len(P.get('hits', []))
    print('音效', len(ev), f'（画面登记的 {len(Q.get("sfx", []))} 个里留 {nk} 个，加 {len(P.get("hits", []))} 个爆点）；气口占 {100 * br[a:b].mean():.0f}%')
    k2 = C.noaudio(ep, '2k')
    if film and not sample and Path(k2).exists():
        from chonggu.render.run import mux   # 2K：画面用 2K 的，声音原样拷 1080p 成片那条（两个文件的音轨哈希一致）
        mux(Path(k2), Path(C.film(ep, '1080')), Path(C.film(ep, '2k'))); print('  2K 配上同一条声音 →', Path(C.film(ep, '2k')).name)
    return [o for o, _ in outs]


def add_args(p):
    p.add_argument('--video', help='无声画面（默认 out/ 里 render 出的 1080p）')
    p.add_argument('--voice', help='整条口播 wav（默认 timeline.json 记的那条）')
    p.add_argument('--sample', nargs=2, type=float, metavar=('起秒', '止秒'), help='只出一小段样（新的混音规则先出 60 秒样给主讲听）')
    g = p.add_mutually_exclusive_group()
    g.add_argument('--no-novo', action='store_true', help='不出不带口播的版本')
    g.add_argument('--novo-only', action='store_true', help='只出不带口播的版本')


def run(ep, args):
    s = getattr(args, 'sample', None)
    return mix(ep, getattr(args, 'video', None), getattr(args, 'voice', None), tuple(s) if s else None,
               novo=not getattr(args, 'no_novo', False), film=not getattr(args, 'novo_only', False))
