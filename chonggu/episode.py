"""新建一期（new）和查稿子（script-check）。
稿子 script.md 的格式（第 8 期 稿子_v9_全稿.md 的写法）：
  ## 章名 | 前缀          开一章（前缀是小写字母，画面代码 ch/<前缀>.js，句子 id 一般以它开头）
  rv03 句子……              一行一句：句子 id + 空格 + 句子（字幕就是这句）；id = 小写字母 + 数字，原声句以 q 结尾
  （停 0.4）               上一句后面多停多久（秒）
  【……】                   画面提示，不念
  【原声：谁，出处】        下一句是当事人原声（字幕写中文译文，主讲不念）；也认〔原声……〕。原声句都要在 episode.yaml 的 quotes 里登记
  第一个「## 」之前的是标题和说明，不管。
script-check 查完、没有错，就按稿子写估算时间线（每秒 6.1 字排每个字的时刻，同第 8 期 make_timeline.py）：
  timeline_est.json 每次都重写；timeline.json 只在还没有、或者还是估算的时候写（录了音、重排过的不动，只列出稿子和它对不上的句子）。"""
import json, re, shutil, unicodedata
from pathlib import Path
from chonggu import config, paths
from chonggu.gates import Gate, GateFailed

PAUSE = re.compile(r'^[（(]\s*停\s*([\d.]+)\s*秒?\s*[）)]$')
TAIL_PAUSE = re.compile(r'\s*[（(]\s*停\s*([\d.]+)\s*秒?\s*[）)]\s*$')
HINT = re.compile(r'^【(.*)】$')
QMARK = re.compile(r'^(?:【\s*原声([^】]*)】|〔\s*原声([^〕]*)〕)\s*(.*)$')
HAN = re.compile(r'[一-鿿]')


def parse_script(path):
    """script.md → {'chapters': [{name, pre, ids, line}], 'beats': [{id, text, pre, line, pause, quote, quote_note, hints}], 'problems': [(行号, 说明)]}"""
    chs, beats, probs = [], [], []
    cur, mark, hints = None, None, []
    for n, ln in enumerate(Path(path).read_text(encoding='utf-8-sig').splitlines(), 1):
        s = ln.strip()
        if not s: continue
        m = config.HEAD.match(s)
        if m:
            cur = {'name': m[1].strip(), 'pre': m[2], 'ids': [], 'line': n}; chs.append(cur); mark, hints = None, []; continue
        if s.startswith('#') or cur is None: continue
        m = PAUSE.match(s)
        if m:
            if beats and beats[-1]['pre'] == cur['pre']: beats[-1]['pause'] = float(m[1])
            else: probs.append((n, f'（停 {m[1]}）前面没有句子'))
            continue
        m = QMARK.match(s)
        if m:
            mark = (m[1] or m[2] or '').lstrip('：: ').strip()
            if not m[3]: continue
            s = m[3]   # 〔原声〕x3q 句子 写在同一行
        elif HINT.match(s):
            hints.append(HINT.match(s)[1]); continue
        m = config.LINE.match(s)
        if not m:
            probs.append((n, f'认不出这一行（不是「句id 句子」、（停 x）或【提示】）：{s[:30]}')); continue
        text, pause = m[2].strip(), None
        t = TAIL_PAUSE.search(text)
        if t: text, pause = text[:t.start()].rstrip(), float(t[1])
        beats.append({'id': m[1], 'text': text, 'pre': cur['pre'], 'line': n, 'pause': pause, 'quote': mark is not None,
                      'quote_note': mark, 'hints': hints})
        cur['ids'].append(m[1]); mark, hints = None, []
    return {'chapters': chs, 'beats': beats, 'problems': probs}


def estimate(S, quotes, rate=6.1, quote_dur=3.0):
    """估算时间线（还没录音时先拿来做画面；结构和录音以后重排的一样，画面代码按句 id 和字取时刻，换了真声自动跟上）。
    每秒 rate 个字；英文、数字按长度算；逗号结尾停 .06，句号 .16，问号叹号 .22，（停 x）覆盖；原声句按登记的时长把字均匀摊开。"""
    t, B = .25, []
    for b in S['beats']:
        s = b['text']; toks = re.findall(r'[A-Za-z]+|\d[\d,.]*\d|\d|.', s); tt, u = [], t
        for k in toks:
            d = .05 if k in '，。？！《》「」、：' else (.1 + .055 * len(k) if re.match(r'[A-Za-z\d]', k) else 1 / rate)
            for j, c in enumerate(k): tt.append([c, round(u + d * j / len(k), 3)])
            u += d
        if b['id'] in quotes:
            D = quotes[b['id']].get('dur') or quote_dur; u = t + D
            tt = [[c, round(t + k * D / len(s), 3)] for k, (c, _) in enumerate(tt)]
        g = b['pause'] if b['pause'] is not None else .06 if s.endswith('，') else .22 if s[-1:] in '？！' else .16
        B.append({'id': b['id'], 'text': s, 'start': round(t, 3), 'end': round(u, 3), 'chars': tt, 'pause': b['pause']}); t = u + g
    ix = {b['id']: k for k, b in enumerate(B)}; chs = []
    for k, c in enumerate(S['chapters']):
        t0 = 0.0 if k == 0 else round(B[ix[c['ids'][0]] - 1]['end'] + .02, 3)
        chs.append({'name': c['name'], 'pre': c['pre'], 'idx': k, 't0': t0, 'first': c['ids'][0], 'last': c['ids'][-1]})
    for k, c in enumerate(chs): c['t1'] = chs[k + 1]['t0'] if k + 1 < len(chs) else round(t + .3, 3)
    return {'duration': chs[-1]['t1'], 'beats': B, 'chapters': chs, 'music_off': [], 'stops': [], 'inserts': [], 'estimated': True}


def check(ep):
    """查稿子和 episode.yaml 对不对得上；回 (解析结果, Gate)。有错时 Gate.done() 会抛 GateFailed。"""
    G = Gate('稿子检查'); p = ep.script
    if not p.exists(): raise GateFailed(f'没有稿子 {p.name}（episode.yaml 的 script）')
    S = parse_script(p); B = S['beats']; ids = [b['id'] for b in B]; by = {b['id']: b for b in B}
    for n, msg in S['problems']: G.warn(f'第 {n} 行：{msg}')
    if not S['chapters']: G.bad('稿子里没有章（要有「## 章名 | 前缀」）'); return S, G
    # 章
    pres = [c['pre'] for c in S['chapters']]
    dup = sorted({x for x in pres if pres.count(x) > 1})
    G.check(not dup, f'{len(pres)} 章，前缀不重复', f'章的前缀重复：{", ".join(dup)}')
    for c in S['chapters']:
        if not c['ids']: G.bad(f'第 {c["line"]} 行「{c["name"]}」这一章没有句子')
    if ep.raw.get('chapters'):
        mine = [(c['pre'], c['name']) for c in ep.chapters]; theirs = [(c['pre'], c['name']) for c in S['chapters']]
        if mine == theirs: G.ok('episode.yaml 的章节和稿子一致')
        else:
            j = lambda L: ' / '.join(f'{p} {n}' for p, n in L)
            G.bad(f'episode.yaml 的 chapters 和稿子的章对不上（前缀、章名、顺序都要一样）：episode.yaml 是 {j(mine)}；稿子是 {j(theirs)}')
    for c in ep.chapters:
        if not ep.path(c['file']).exists(): G.warn(f'{c["file"]} 还没写（{c["name"]} 这一章的画面代码）')
    # 句子 id
    seen = {}
    for b in B: seen.setdefault(b['id'], []).append(b['line'])
    dup = {i: ls for i, ls in seen.items() if len(ls) > 1}
    G.check(not dup, f'{len(ids)} 句，id 不重复', '句子 id 重复：' + '；'.join(f'{i}（第 {"、".join(map(str, ls))} 行）' for i, ls in dup.items()))
    first = S['chapters'][0]['pre']
    odd = [b['id'] for b in B if b['pre'] != first and not b['id'].startswith(b['pre'])]
    if odd: G.warn(f'这几句的 id 不是以所在章的前缀开头（不影响，但不好找）：{", ".join(odd[:10])}')
    for b in B:
        if not b['text']: G.bad(f'第 {b["line"]} 行 {b["id"]} 没有句子')
        elif '【' in b['text'] or '】' in b['text']: G.warn(f'第 {b["line"]} 行 {b["id"]} 里有【】：画面提示要单独一行，不然会被当成字幕念出来')
    # 原声句：标了原声的都要登记，登记的都要在稿子里
    Q = ep.quotes
    unreg = [b for b in B if b['quote'] and b['id'] not in Q]
    for b in unreg: G.bad(f'第 {b["line"]} 行 {b["id"]} 标了原声，但 episode.yaml 的 quotes 里没登记')
    gone = [i for i in Q if i not in by]
    if gone: G.bad(f'episode.yaml 登记的原声句稿子里没有：{", ".join(gone)}')
    if not unreg and not gone: G.ok(f'原声句 {len(Q)} 句，都登记了' if Q else '没有原声句')
    for i, q in Q.items():
        if i not in by: continue
        if not q.get('file'): G.bad(f'原声 {i} 没写 file')
        elif not (ep.path(q['file']).exists() or (ep.root / 'assets' / q['file']).exists()):
            G.warn(f'原声 {i} 的文件 {q["file"]} 还没有（放进这一期的 assets/，不进 git）')
        if q.get('dur') is None: G.warn(f'原声 {i} 没写 dur（时长），估算时间线先按 {est_cfg(ep)[1]:g} 秒排')
        if not q.get('speaker'): G.warn(f'原声 {i} 没写 speaker（谁说的）')
    # 呼吸点、新闻插段
    bad = [i for i in ep.breath if i not in by]
    G.check(not bad, f'呼吸点 {len(ep.breath)} 处，句子都在', f'呼吸点的句子稿子里没有：{", ".join(bad)}')
    onq = [i for i in ep.breath if i in Q]
    if onq: G.warn(f'呼吸点放在了原声句上（原声句不拆，不起作用）：{", ".join(onq)}')
    for x in ep.interludes:
        i = x if isinstance(x, str) else x.get('id')
        if isinstance(x, dict) and x.get('pre') and x['pre'] not in pres: G.bad(f'新闻插段的章 {x["pre"]} 稿子里没有')
        elif i and i not in by: G.bad(f'新闻插段的句子 {i} 稿子里没有')
        elif i and ep.breath.get(i, 0) < 6: G.warn(f'新闻插段放在 {i} 开口前，但它的呼吸点只有 {ep.breath.get(i, 0):g} 秒（插段要 6 秒以上，一般 15 秒左右）')
    return S, G


def est_cfg(ep):
    e = ep.raw.get('estimate') or {}
    return float(e.get('rate') or 6.1), float(e.get('quote_dur') or 3.0)


def write_timelines(ep, S):
    rate, qd = est_cfg(ep); T = estimate(S, ep.quotes, rate, qd)
    dump(T, ep.root / 'timeline_est.json')
    tl = ep.root / 'timeline.json'; old = None
    if tl.exists():
        try: old = json.loads(tl.read_text(encoding='utf-8'))
        except ValueError: old = None
    if old is None or old.get('estimated'):
        dump(T, tl); note = 'timeline.json（估算）'
    else:
        a, b = [x['id'] for x in old['beats']], [x['id'] for x in T['beats']]
        tx = {x['id']: x['text'] for x in old['beats']}
        new, gone = [i for i in b if i not in tx], [i for i in a if i not in set(b)]
        diff = [x['id'] for x in T['beats'] if x['id'] in tx and tx[x['id']] != x['text']]
        note = 'timeline.json 已经按录音重排过，没动'
        if new or gone or diff:
            print(f'  ! 稿子和 timeline.json（录音）对不上：新句 {", ".join(new[:8]) or "无"}；删掉的 {", ".join(gone[:8]) or "无"}；'
                  f'字不一样的 {len(diff)} 句（{", ".join(diff[:8])}）—— 要补录或重跑 voice / timeline')
    return T, note


def dump(obj, p):
    tmp = Path(p).with_name(Path(p).name + '.tmp')
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f: json.dump(obj, f, ensure_ascii=False)
    paths.replace(tmp, p)


def run_script_check(ep, args=None):
    print(f'== 查稿子：{ep.root.name}/{ep.script.name}')
    S, G = check(ep); G.done()
    T, note = write_timelines(ep, S)
    han = sum(len(HAN.findall(b['text'])) for b in S['beats'] if b['id'] not in ep.quotes)
    print(f'  {len(S["chapters"])} 章，{len(S["beats"])} 句（原声 {len(ep.quotes)} 句），口播 {han} 个汉字；估算全片 {T["duration"] / 60:.1f} 分钟')
    for c in T['chapters']: print(f"    {c['pre']:<4}{c['name']:<12} {c['t0']:7.1f}–{c['t1']:7.1f}  {c['t1'] - c['t0']:5.1f} 秒  {c['first']}–{c['last']}")
    print(f'  写了 timeline_est.json；{note}')
    return S


# ---------- 新建一期 ----------
def yaml_scalar(v):
    if isinstance(v, (int, float)) and not isinstance(v, bool): return str(v)
    s = str(v)
    return s if re.fullmatch(r'[\w一-鿿.\-+·（）《》]+', s) and not re.fullmatch(r'(?i)(yes|no|on|off|true|false|null|~|[\d.]+)', s) else json.dumps(s, ensure_ascii=False)


def width(s):
    return sum(2 if unicodedata.east_asian_width(c) in 'WF' else 1 for c in s)


def fill(text, **kv):
    """把模板 episode.yaml 顶层的「键: 值  # 说明」换成新值，说明留着（还对齐在原来那一列）"""
    def rep(m, k, v):
        new = f'{k}: {yaml_scalar(v)}'
        if not m[3]: return new
        col = width(m[0]) - width(m[3].lstrip())
        return new + ' ' * max(1, col - width(new)) + m[3].lstrip()
    for k, v in kv.items():
        if v is None: continue
        text, n = re.subn(rf'^({k}):[ \t]*([^#\n]*?)([ \t]*#.*)?$', lambda m: rep(m, k, v), text, count=1, flags=re.M)
        if not n: text += f'\n{k}: {yaml_scalar(v)}\n'
    return text


def next_number():
    ns = []
    for y in paths.episodes_dir().glob('*/episode.yaml'):
        m = re.search(r'^number:\s*(\d+)', y.read_text(encoding='utf-8-sig'), re.M)
        if m and not y.parent.name.startswith('_'): ns.append(int(m[1]))
    return max(ns) + 1 if ns else 1


def run_new(ep, args):
    slug = getattr(args, 'slug', None) or getattr(args, 'name', None)
    if not slug: raise GateFailed('要给这一期起个短名：python -m chonggu new <短名> --number 期数 --title 标题')
    if not re.fullmatch(r'[\w.\-]+', slug) or slug.startswith(('_', '.')):
        raise GateFailed(f'短名「{slug}」只能用字母、数字、汉字、- _ .（不能有空格），也不能以 _ 或 . 开头')
    if config.bad_win_name(slug): raise GateFailed(f'短名「{slug}」{config.bad_win_name(slug)}')
    src = Path(getattr(args, 'template', None) or paths.episodes_dir() / '_template')
    if not (src / 'episode.yaml').exists(): raise GateFailed(f'模板 {src} 里没有 episode.yaml')
    dst = paths.episodes_dir() / slug
    if dst.exists() and any(dst.iterdir()) and not getattr(args, 'force', False):
        raise GateFailed(f'{dst} 已经有了（要覆盖模板文件就加 --force；已有的录音、素材不会删）')
    number = getattr(args, 'number', None) or next_number()
    shutil.copytree(src, dst, dirs_exist_ok=True, ignore=shutil.ignore_patterns('out', '__pycache__', '.DS_Store'))
    y = dst / 'episode.yaml'
    text = fill(y.read_text(encoding='utf-8'), number=int(number), slug=slug, title=getattr(args, 'title', None) or slug,
                version=getattr(args, 'version', None) or 'v1', host=getattr(args, 'host', None))
    y.write_text(text, encoding='utf-8', newline='\n')
    for d in ('assets', 'voice', 'out', 'ch', 'music'): (dst / d).mkdir(exist_ok=True)
    ep = config.load(dst, quiet=True)
    print(f'建好了第 {ep.number} 期：{dst}')
    print('接下来：\n'
          f'  1. 写稿子 {slug}/script.md（格式见文件开头），改 episode.yaml（章节、原声句、标题……每一项都有说明）\n'
          f'  2. python -m chonggu script-check {slug}     查稿子，生成估算时间线（先拿它做画面）\n'
          f'  3. 录音放进 {slug}/assets/，在 episode.yaml 的 voice.recording 写上文件名\n'
          f'  4. python -m chonggu build {slug}            从口播一路做到打包，停在第一个没过的门槛')
    return ep


def add_args(p, cmd='script-check'):
    if cmd == 'new':
        p.add_argument('slug', help='这一期的短名（文件夹名，也用在文件名里），如 ep9 或 英伟达财报')
        p.add_argument('--number', type=int, help='期数（不写就是已有的最大期数 + 1）')
        p.add_argument('--title', help='成片文件名里的标题（不写同短名）')
        p.add_argument('--host', help='主讲')
        p.add_argument('--version', help='版本（默认 v1）')
        p.add_argument('--template', help='从哪个文件夹复制（默认 episodes/_template）')
        p.add_argument('--force', action='store_true', help='文件夹已经有了也照样把模板文件复制进去（不删已有的东西）')


def run(ep, args=None):
    cmd = getattr(args, 'command', None) or getattr(args, 'cmd', None)
    return run_new(ep, args) if cmd == 'new' else run_script_check(ep, args)
