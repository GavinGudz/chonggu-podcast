"""第 9 节「交付前检查清单」里能自动查的那些，写成断言。每个检查回一个 Res：过 / 没过 / 提醒 / 跳过，加几行细节。"""
import json, re, subprocess
from dataclasses import dataclass, field
from pathlib import Path
import numpy as np, soundfile as sf
from chonggu import paths
from . import common as C

OK, FAIL, WARN, SKIP = '过', '没过', '提醒', '跳过'
PHONE_MAX = 29.5 * C.MiB   # 手机上收文件的上限（episode.yaml 的 pack.phone.max_mib 可改）


@dataclass
class Res:
    key: str
    title: str
    status: str
    text: str
    lines: list = field(default_factory=list)


def res(key, title, ok, text, lines=(), warn=False):
    return Res(key, title, OK if ok else (WARN if warn else FAIL), text, list(lines))


# ---------- 声音 ----------
def loudness(p):
    """ebur128：I、LRA、真峰值（第 8 期 v18 是 −15.1 / 4.4 / −1.0）。"""
    e = subprocess.run([paths.need('ffmpeg'), '-hide_banner', '-nostats', '-i', str(p), '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    s = e[e.rfind('Summary:'):]
    g = lambda k, u: (lambda m: float(m[1]) if m and m[1] != '-inf' else float('-inf'))(re.search(rf'{k}:\s+(-?inf|-?[\d.]+) {u}', s))
    return g('I', 'LUFS'), g('LRA', 'LU'), g('Peak', 'dBFS')


def check_loudness(p, tag='', L=None):
    L = L or {'I': -15.0, 'LRA_min': 4.0, 'peak_max': -1.0, 'tol': .5}; I, LRA, pk = loudness(p)
    a, b, c = abs(I - L['I']) > L['tol'], LRA < L['LRA_min'], pk > L['peak_max']
    why = [x for x, bad in ((f"I 要在 {L['I']:g}±{L['tol']:g}", a), (f"LRA 要 ≥{L['LRA_min']:g}（太平了听着累）", b), (f"峰值要 ≤{L['peak_max']:g} dBFS", c)) if bad]
    ok = not why
    return res('loudness' + tag, f'响度{tag}', ok, f'I {I:.1f} LUFS，LRA {LRA:.1f}，峰值 {pk:.1f} dBFS' + ('；' + '，'.join(why) if why else ''))


def spread(p, ss, t):   # 一段里最响的 10% 和最静的 10% 差几 dB（20 ms 一格）
    r = subprocess.run([paths.need('ffmpeg'), '-v', 'error', '-ss', f'{ss}', '-t', f'{t}', '-i', str(p), '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], capture_output=True).stdout
    y = np.frombuffer(r, np.float32); y = y[:len(y) // 960 * 960]
    if not len(y):
        return 0.
    e = 20 * np.log10(np.sqrt((y.reshape(-1, 960) ** 2).mean(1)) + 1e-9)
    return float(np.percentile(e, 90) - np.percentile(e, 10))


def check_distortion(p, dur):
    """没失真（没被压扁）：任取两段 60 秒，最响的 10% 和最静的 10% 相差 15 dB 以上。片子短就取 1/4 长。"""
    t = min(60., dur * .25); w = [120., 600.] if dur >= 700 else [dur * .15, dur * .6]
    d = [spread(p, s, t) for s in w]
    return res('distortion', '没失真', min(d) >= 15, '；'.join(f'{C.mmss(s)} 起 {t:.0f} 秒：{x:.1f} dB' for s, x in zip(w, d)) + '（要 ≥15）')


def check_rate(ep, T, wav):
    """字速：说话时 290–340 汉字/分（v18 是 316）。原声句不算。"""
    sp = C.spans_of(wav)
    if not sp.exists():
        return Res('rate', '字速', SKIP, f'没有 {sp.name}')
    S = json.loads(sp.read_text(encoding='utf-8')); TX = {b['id']: b['text'] for b in T['beats']}; Q = C.quote_ids(ep)
    S = {k: v for k, v in S.items() if k not in Q and k in TX}
    n = sum(len(re.findall(r'[一-鿿]', TX[k])) for k in S); d = sum(b - a for a, b in S.values())
    if d <= 0:
        return Res('rate', '字速', SKIP, '没有口播句')
    r = n / d * 60
    return res('rate', '字速', 290 <= r <= 340, f'{r:.0f} 汉字/分（{n} 字，说话 {d:.0f} 秒；要 290–340）')


def gaps(y, sr, th=-45, min_gap=1.2):   # 口播里 ≥1.2 秒的空档
    f = int(sr * .02); n = len(y) // f
    e = 20 * np.log10(np.sqrt((y[:n * f].reshape(n, f) ** 2).mean(1)) + 1e-9) < th
    g, k = [], 0
    while k < n:
        j = k
        while j < n and e[j] == e[k]:
            j += 1
        if e[k] and (j - k) * .02 >= min_gap:
            g.append((k * .02, j * .02))
        k = j
    return g, n * .02


def check_breath(wav):
    """气口：口播里两个 ≥1.2 秒的空档之间最长不超过 40 秒（v18 是 39.4 秒）。"""
    y, sr = sf.read(str(wav), dtype='float32'); y = y if y.ndim == 1 else y.mean(1)
    g, total = gaps(y, sr)
    ends = [0] + [b for a, b in g]; starts = [a for a, b in g] + [total]
    iv = [(s - e0, e0) for e0, s in zip(ends, starts)]; m, at = max(iv)
    return res('breath', '气口', m <= 40, f'{len(g)} 个气口；最长间隔 {m:.1f} 秒（从 {C.mmss(at)} 起；要 ≤40）')


def check_plan(ep, T, P):
    from chonggu.mix.plan import plan_problems
    bad = plan_problems(ep, T, P)
    return res('plan', '配乐编排', not bad, f'{len(P["sections"])} 段，{len(bad)} 处不合规', bad)


def check_sfx_repeat(P, Q, T):
    """同一个音效不连用 3 次以上（第 7 节；第 8 期没有脚本）。只提醒。"""
    from chonggu.mix.plan import anchors, sfx_events
    ev = sorted(sfx_events(P, Q, anchors(T))); runs, k = [], 0
    while k < len(ev):
        j = k
        while j < len(ev) and ev[j][1] == ev[k][1]:
            j += 1
        if j - k >= 3:
            runs.append(f'{C.mmss(ev[k][0])}–{C.mmss(ev[j - 1][0])} 连着 {j - k} 个 {ev[k][1]}')
        k = j
    return res('sfx', '音效连用', not runs, f'{len(ev)} 个音效，连用 3 次以上的 {len(runs)} 处', runs, warn=True)


def check_hash(a, b):
    ha, hb = C.audio_md5(a), C.audio_md5(b)
    return res('hash', '2K 和 1080p 同一条声音', ha is not None and ha == hb, f'1080p {ha}，2K {hb}' + ('' if ha == hb else '；2K 要重新配声音（mix 会自动配）'))


# ---------- 画面 ----------
def allowed(ep, T):
    """主讲/代理逐条看过、确认是故意的报警（episode.yaml 的 qa.allow）：章前缀（整章，如越界开场的快剪），
    {at, why}（那一处前后 0.2 秒），或 {from, to, why}；时刻写秒或 分:秒。"""
    sec = lambda x: sum(float(v) * 60 ** i for i, v in enumerate(reversed(str(x).split(':'))))
    out = []
    for a in (getattr(ep, 'qa', None) or (ep.raw or {}).get('qa') or {}).get('allow', []) or []:
        if isinstance(a, str):
            out += [(c['t0'], c['t1'], f'{c["pre"]} 整章') for c in T['chapters'] if c['pre'] == a]
        elif 'at' in a:
            out.append((sec(a['at']) - .2, sec(a['at']) + .2, a.get('why', '')))
        else:
            out.append((sec(a['from']), sec(a['to']), a.get('why', '')))
    return out


def split_allowed(ev, allow):
    keep, ok = [], []
    for e in ev:
        (ok if any(a <= e[0] <= b for a, b, _ in allow) else keep).append(e)
    return keep, ok


def check_pure(T, S, tag=''):
    from .pure import ratios, LIMIT
    R = ratios(T, S); bad = [k for k, v in R.items() if v > LIMIT]
    return res('pure' + tag, f'每章有画面{tag}', not bad, '  '.join(f'{k} {100 * v:.1f}%' for k, v in R.items()) + (f'；纯色超过 20%：{bad}' if bad else ''))


def check_events(key, title, T, ev, allow, fmt):
    keep, ok = split_allowed(ev, allow)
    lines = [f'{C.mmss(e[0])}  {C.where(T, e[0])}  {fmt(e)}' for e in keep]
    return res(key, title, not keep, f'{len(keep)} 处要看' + (f'（另有 {len(ok)} 处在 qa.allow 里放过）' if ok else ''), lines)


def check_cross(T, spans):
    from .cross_check import by_chapter
    by = by_chapter(T, spans); bad = {k: v for k, v in by.items() if v}
    lines = [f'{k}：' + '；'.join(f'{C.mmss(a)}–{C.mmss(b)}（{n} 帧，差 {m}）' for a, b, m, n in v[:12]) for k, v in bad.items()]
    return res('cross', '2K 对 1080p', not bad, f'{len(spans)} 段对不上（每章要 0 段）', lines)


def check_glitch(ep, rk, ev, T):
    """半帧只比上一次：比上次多出来的列出来（只提醒）。结果存 out/qa/glitch_<分辨率>.json。"""
    tag = '（2K）' if rk == '2k' else ''
    p = Path(ep.out('qa', f'glitch_{rk}.json')); old = json.loads(p.read_text(encoding='utf-8')) if p.exists() else None
    p.parent.mkdir(parents=True, exist_ok=True); p.write_text(json.dumps([e[0] for e in ev]), encoding='utf-8')
    by = {}
    for e in ev:
        by[C.where(T, e[0])] = by.get(C.where(T, e[0]), 0) + 1
    new = [e for e in ev if old is not None and not any(abs(e[0] - t) < .1 for t in old)]
    txt = f'{len(ev)} 处可疑（' + '，'.join(f'{k} {v}' for k, v in by.items()) + '）' + (f'；比上次多 {len(new)} 处' if old is not None else '；第一次查，下次起比差别')
    return res('glitch' + tag, f'半帧{tag}', not new, txt, [f'{C.mmss(t)}  {C.where(T, t)}  {s}  {k} 块' for t, k, s in new[:40]], warn=True)


# ---------- 文件 ----------
def check_duration(p, T, tag=''):
    d = C.duration(p)
    return res('dur' + tag, f'时长{tag}', abs(d - T['duration']) < .2, f'{d:.2f} 秒，timeline 是 {T["duration"]:.2f} 秒')


def check_parts(ep, T, rk):
    D = C.parts_dir(ep, rk); rows, bad = [], []
    for k, c in enumerate(T['chapters']):
        f = D / f'{k:02d}_{c["pre"]}.mp4'
        if not f.exists():
            continue
        e = C.duration(f) - (c['t1'] - c['t0']); rows.append(f'{f.name} {e:+.2f}')
        if abs(e) >= .2:
            bad.append(f'{f.name} 差 {e:+.2f} 秒')
    tag = '（2K）' if rk == '2k' else ''
    if not rows:
        return Res('parts' + rk, f'每章时长{tag}', SKIP, f'{D.name}/ 里没有分章文件')
    return res('parts' + rk, f'每章时长{tag}', not bad, f'{len(rows)} 章，差 ≥0.2 秒的 {len(bad)} 章', bad)


BAD_LOG = re.compile(r'pageerror|出错|找不到|树上没有|空档|重叠')   # 第 9 节的那几个词（assets/s1、favicon 的 http 404 是无害的噪音）


def check_logs(ep, T):
    """渲染日志里没有错误行：每章只看最新的那份（out/parts/、out/parts2k/ 里的 log_<序号>_<前缀>*.txt，是 render.mjs 直接写的）。"""
    logs = []
    for rk in ('1080', '2k'):
        d = C.parts_dir(ep, rk)
        for k, c in enumerate(T['chapters']):
            L = sorted(d.glob(f"log_{k:02d}_{c['pre']}*.txt"), key=lambda p: p.stat().st_mtime)
            logs += L[-1:]
    if not logs:
        return Res('logs', '渲染日志', SKIP, '没有渲染日志')
    hit = []
    for p in logs:
        for l in p.read_text(encoding='utf-8', errors='replace').splitlines():
            if BAD_LOG.search(l):
                hit.append(f'{p.parent.name}/{p.name}: {l.strip()[:160]}')
    hit = list(dict.fromkeys(hit))
    return res('logs', '渲染日志', not hit, f'{len(logs)} 个日志（每章最新的），错误行 {len(hit)} 条', hit[:30])


def phone_files(ep):
    return sorted(p for p in Path(ep.out()).glob('**/*') if p.is_file() and '手机' in p.name and str(ep.version) in str(p.relative_to(ep.out())) and len(p.relative_to(ep.out()).parts) <= 2)


def check_phone(ep):
    fs = phone_files(ep); mx = C.phone_cfg(ep)['max_mib']
    if not fs:
        return Res('phone', '手机版', SKIP, '还没打包（python -m chonggu pack）')
    bad = [f'{p.name} {p.stat().st_size / C.MiB:.1f} MiB' for p in fs if p.stat().st_size >= mx * C.MiB]
    return res('phone', '手机版', not bad, f'{len(fs)} 个，超过 {mx:g} MiB 的 {len(bad)} 个（手机上收文件的上限）', bad)


def check_size(p, limit_gb, tag=''):
    s = p.stat().st_size
    return res('size' + tag, f'大小{tag}', s <= limit_gb * 1e9, f'{s / 1e9:.2f} GB（Release 单个文件上限 {limit_gb} GB；2K 超了用 crf 19 重压）')


def manifest():
    """assets/manifest.json（和本机的 manifest.local.json）里登记过授权的素材名（name / file / path / id 都认，去掉扩展名也认）。"""
    rows = paths.manifest_rows()
    out = set()
    for r in rows:
        if isinstance(r, dict) and r.get('license') and (r.get('url') or r.get('author')):
            for k in ('name', 'file', 'path', 'id'):
                if r.get(k):
                    out |= {str(r[k]), Path(str(r[k])).name, Path(str(r[k])).stem}
    return out


def used_assets(ep, P, Q):
    """这一期用到的素材：配乐、音效、原声（K.aud 和 episode.yaml 的 quotes）、assets/clips 下的实拍。"""
    from chonggu.mix.plan import MAP
    SM = {**MAP, **P.get('sfx_map', {})}; keep = set(P.get('sfx_keep', []))
    u = {s['file'] for s in P.get('sections', [])}
    u |= {SM.get(k, SM['pop']) for _, k, _ in (Q or {}).get('sfx', []) if k in keep} | {SM.get(h['sfx'], SM['pop']) for h in P.get('hits', [])}
    u |= {f for _, f, _ in (Q or {}).get('aud', [])} | {q['file'] for q in (getattr(ep, 'quotes', None) or {}).values() if isinstance(q, dict) and q.get('file')}
    clips = Path(ep.root) / 'assets' / 'clips'
    if clips.exists():
        u |= {p.name for p in clips.iterdir() if not p.name.startswith('.')}
    return sorted(u)


def credits_file(ep):   # 这一期的出处清单：CREDITS_第N期.md（episode.yaml 的 names 可改），也认 CREDITS.md
    for p in (Path(ep.root) / C.name(ep, 'credits', ext='.md'), Path(ep.root) / 'CREDITS.md', Path(ep.out(C.name(ep, 'credits', ext='.md')))):
        if p.exists():
            return p
    return Path(ep.root) / C.name(ep, 'credits', ext='.md')


def check_credits(ep, P, Q):
    """出处清单没漏：每个用到的素材都在这一期的出处清单里，或者在 assets/manifest.json 里登记了授权。"""
    cp = credits_file(ep); txt = cp.read_text(encoding='utf-8') if cp.exists() else ''; M = manifest()
    noted = lambda f: Path(f).name in txt or re.search(rf'(?<![\w-]){re.escape(Path(f).stem)}(?![\w-])', txt)
    miss = [f for f in used_assets(ep, P, Q) if not ({f, Path(f).name, Path(f).stem} & M) and not noted(f)]
    return res('credits', '出处清单', not miss, f'没记出处的 {len(miss)} 个' + ('' if cp.exists() else f'（这一期还没有 {cp.name}）'), [f'没记：{f}' for f in miss])
