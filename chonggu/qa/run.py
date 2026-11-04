"""交付前检查：python -m chonggu qa <期> [--only 响度,闪帧…] [--skip …] [--no-video]
按第 9 节的清单跑能自动查的那些（声音、画面、文件），打一份中文报告（也存进 out/qa/qa_<版本>.txt），有一项没过就停（GateFailed）。
画面每个文件只读一遍（320×180 和 96×54 两路同时解，2K 和 1080p 同步），同时喂给闪帧、闪烁/短镜头、纯色帧、半帧、2K 对 1080p 几个检查。
全部跑完而且都过了，才写 out/qa/passed.json（成片的大小和修改时间）：publish 只传和它对得上的那份（要发的就是查过的那份）。
报告只写实际跑了哪些检查、查了哪些文件，不写「全片没问题」。"""
import json, time
from itertools import zip_longest
from pathlib import Path
from chonggu.gates import GateFailed
from . import common as C, checks as K
from .flash import Flash
from .flicker import Flicker
from .glitch import Glitch
from .pure import Pure
from .cross_check import Cross

NAMES = {'时长': 'dur', '大小': 'size', '每章时长': 'parts', '渲染日志': 'logs', '手机版': 'phone', '响度': 'loudness', '失真': 'distortion',
         '字速': 'rate', '气口': 'breath', '配乐编排': 'plan', '音效连用': 'sfx', '出处': 'credits', '音轨': 'hash', '纯色': 'pure',
         '闪帧': 'flash', '闪烁': 'flicker', '半帧': 'glitch', '2K对1080p': 'cross'}


def scan_video(films):
    """films：{'1080': 路径, '2k': 路径}。每个文件开两路解码（同时跑）：320×180 喂半帧、闪帧（缩成 160×90）、2K 对 1080p；
    96×54 喂闪烁/短镜头和纯色帧（和第 8 期的 flicker_scan 一样大，报出来的数对得上）。回每个文件的四个检查结果，和两份之间的对比。"""
    keys = list(films); D = {k: {'flash': Flash(), 'flicker': Flicker(), 'pure': Pure(), 'glitch': Glitch()} for k in keys}
    X = Cross() if len(keys) == 2 else None
    S = [(k, 'big', C.gray(films[k], 320, 180)) for k in keys] + [(k, 'small', C.gray(films[k], 96, 54)) for k in keys]
    for i, fr in enumerate(zip_longest(*(g for _, _, g in S))):
        for (k, kind, _), f in zip(S, fr):
            if f is None:
                continue
            d = D[k]
            if kind == 'big':
                d['glitch'].push(f); d['flash'].push(C.half(f))
            else:
                d['flicker'].push(f); d['pure'].push(f)
        if X and fr[0] is not None and fr[1] is not None:
            X.push((fr[keys.index('2k')], fr[keys.index('1080')]))
        if i % 900 == 0:
            print(f'  画面扫描到 {C.mmss(i / C.FPS)}', end='\r', flush=True)
    print(' ' * 40, end='\r')
    return {k: {n: v.done() for n, v in d.items()} for k, d in D.items()}, (X.done() if X else None)


def want(args):
    sel = lambda s: {NAMES.get(x.strip(), x.strip()) for x in (s or '').replace('，', ',').split(',') if x.strip()}
    only, skip = sel(getattr(args, 'only', None)), sel(getattr(args, 'skip', None))
    if getattr(args, 'no_video', False):
        skip |= {'pure', 'flash', 'flicker', 'glitch', 'cross'}
    return (lambda k: (not only or k in only) and k not in skip), bool(only or skip)


def run_qa(ep, args=None):
    T = C.timeline(ep); ok, partial = want(args)
    films = {k: Path(C.film(ep, k)) for k in ('1080', '2k') if Path(C.film(ep, k)).exists()}
    if not films:
        raise GateFailed(f'没有成片 {Path(C.film(ep, "1080")).name}，先跑 python -m chonggu mix')
    tag = lambda k: '（2K）' if k == '2k' else ''
    main = films.get('1080') or films['2k']; limit = (getattr(ep, 'publish', None) or {}).get('limit_gb', 1.95)
    R = []
    # 文件
    for k, f in films.items():
        if ok('dur'):
            R.append(K.check_duration(f, T, tag(k)))
        if ok('size'):
            R.append(K.check_size(f, limit, tag(k)))
        if ok('parts'):
            R.append(K.check_parts(ep, T, k))
    if ok('logs'):
        R.append(K.check_logs(ep, T))
    if ok('phone'):
        R.append(K.check_phone(ep))
    # 声音
    if ok('loudness'):
        R.append(K.check_loudness(main, L=C.loud(ep)))
    if ok('distortion'):
        R.append(K.check_distortion(main, C.duration(main)))
    if ok('hash') and len(films) == 2:
        R.append(K.check_hash(films['1080'], films['2k']))
    wav = None
    if ok('rate') or ok('breath'):
        try:
            wav = C.voice_wav(ep, T)
        except FileNotFoundError as e:
            R.append(K.Res('rate', '字速 / 气口', K.FAIL, str(e)))
    if wav and ok('rate'):
        R.append(K.check_rate(ep, T, wav))
    if wav and ok('breath'):
        R.append(K.check_breath(wav))
    from chonggu.mix.plan import load_plan
    P = load_plan(ep); qp = Path(ep.out('cues.json')); Q = json.loads(qp.read_text(encoding='utf-8')) if qp.exists() else None
    for key, fn in (('plan', lambda: K.check_plan(ep, T, P)), ('sfx', lambda: K.check_sfx_repeat(P, Q, T) if Q else K.Res('sfx', '音效连用', K.SKIP, '没有 out/cues.json（mix 时导出）')),
                    ('credits', lambda: K.check_credits(ep, P, Q))):
        if ok(key):
            try:
                R.append(fn())
            except GateFailed as e:
                R.append(K.Res(key, key, K.FAIL, str(e)))
    # 画面
    if any(ok(k) for k in ('pure', 'flash', 'flicker', 'glitch', 'cross')):
        V, X = scan_video(films); allow = K.allowed(ep, T)
        for k, v in V.items():
            if ok('pure'):
                R.append(K.check_pure(T, v['pure']['std'], tag(k)))
            if ok('flash'):
                R.append(K.check_events('flash' + k, f'闪帧{tag(k)}', T, [(t,) for t in v['flash']['flash']], allow, lambda e: '单帧闪'))
            if ok('flicker'):
                R.append(K.check_events('flicker' + k, f'闪烁/短镜头{tag(k)}', T, v['flicker']['events'], allow, lambda e: e[2]))
            if ok('glitch'):
                R.append(K.check_glitch(ep, k, v['glitch']['events'], T))
        if X is not None and ok('cross'):
            R.append(K.check_cross(T, X['spans']))
    return report(ep, films, R, partial)


def report(ep, films, R, partial):
    now = time.strftime('%Y-%m-%d %H:%M'); L = [f'《重估》第 {ep.number} 期 {ep.version} 交付前检查（{now}）']
    for k, f in films.items():
        st = f.stat(); L.append(f'  查的文件：{f.name}（{st.st_size / 1e9:.2f} GB，{time.strftime("%m-%d %H:%M", time.localtime(st.st_mtime))} 改）')
    for r in R:
        L.append(f'[{r.status}] {r.title}：{r.text}')
        L += [f'        {x}' for x in r.lines[:40]] + ([f'        ……还有 {len(r.lines) - 40} 条'] if len(r.lines) > 40 else [])
    fails = [r for r in R if r.status == K.FAIL]; warns = [r for r in R if r.status == K.WARN]
    L.append(f'结论：跑了 {len(R)} 项，没过 {len(fails)} 项' + (f'（{"、".join(r.title for r in fails)}）' if fails else '') +
             (f'，提醒 {len(warns)} 项（{"、".join(r.title for r in warns)}）' if warns else '') + ('；只跑了一部分，不记为通过' if partial else ''))
    L.append('还要人做的：主讲戴耳机用手机从头看完（pack 出的完整手机版）、关键帧从成片里抽出来亲眼看、说「可以发」之后才 publish --yes。')
    txt = '\n'.join(L); print(txt)
    q = Path(ep.out('qa')); q.mkdir(parents=True, exist_ok=True); (q / f'qa_{ep.version}.txt').write_text(txt + '\n', encoding='utf-8')
    passed = q / 'passed.json'
    if fails:
        passed.unlink(missing_ok=True)
        raise GateFailed(f'检查没过 {len(fails)} 项：' + '、'.join(r.title for r in fails) + f'（报告在 out/qa/qa_{ep.version}.txt）')
    if not partial:
        passed.write_text(json.dumps({'time': now, 'version': ep.version, 'files': {f.name: stamp(f) for f in films.values()}},
                                     ensure_ascii=False, indent=1), encoding='utf-8')
    return R


def stamp(f):
    st = Path(f).stat(); return {'size': st.st_size, 'mtime_ns': st.st_mtime_ns}


def add_args(p):
    p.add_argument('--only', help='只跑这几项，逗号分开（如 响度,闪帧,字速；也认 loudness,flash…）')
    p.add_argument('--skip', help='不跑这几项')
    p.add_argument('--no-video', action='store_true', help='不扫画面（只查声音和文件，快）')


run = run_qa
