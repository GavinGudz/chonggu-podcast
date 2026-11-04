"""从主讲的录音里挑每一小句的最后一遍（主讲：「一般是尝试的最后一句是对的」）。要 pypinyin。
- 稿子按句 id 读 timeline.json 的 beats，原声句（episode.yaml 登记的 quotes）跳过；每句再按 ，。？！：； 切成小句。
- 听写结果按字拆开（中文一字一个、英文数字连成一个），用拼音（不带声调）比，同音错字（越界/月借）不算错。
- 录音按停顿 ≥ 0.6 秒切成一次次「开口」，每次开口和稿子当前位置附近对齐，算它盖住了哪些小句、盖住几成。
- 每个小句取盖住 ≥ 0.8 的最后一次；没有就取盖得最多的那次，标出来让人听（voice/flags.tsv，kind=take）。"""
import re, difflib
from pypinyin import lazy_pinyin
from chonggu.voice.common import wget

EQ = str.maketrans('他她得地裡後個們這為說過來時間錢會麼經學實東两', '它它的的里后个们这为说过来时间钱会么经学实东二')

D = '零一二三四五六七八九'
def num_cn(n):   # 整数读法：6370 → 六千三百七十
    if n == 0: return '零'
    def sub(n):
        s, zero = '', False
        for u, c in [(1000, '千'), (100, '百'), (10, '十')]:
            q = n // u; n %= u
            if q: s += ('零' if zero else '') + D[q] + c; zero = False
            elif s: zero = True
        if n: s += ('零' if zero else '') + D[n]
        return s
    if n >= 10**8: return sub(n // 10**8) + '亿' + (num_cn(n % 10**8) if n % 10**8 else '')
    if n >= 10**4: return sub(n // 10**4) + '万' + (('零' if n % 10**4 < 1000 and n % 10**4 else '') + sub(n % 10**4) if n % 10**4 else '')
    s = sub(n)
    return s[1:] if s.startswith('一十') else s

def norm_num(s):   # 阿拉伯数字一律换成汉字读法（年份逐位读，小数点读「点」，百分号读「百分之」）
    def rep(m):
        t = m.group(0).replace(',', '')
        pct = t.endswith('%'); t = t.rstrip('%')
        if '.' in t: a, b = t.split('.', 1); r = num_cn(int(a or 0)) + '点' + ''.join(D[int(c)] for c in b if c.isdigit())
        else: r = num_cn(int(t))
        return ('百分之' + r) if pct else r
    s = re.sub(r'(\d{4})(?=\s*年)', lambda m: ''.join(D[int(c)] for c in m.group(1)), s)
    return re.sub(r'\d[\d,]*(\.\d+)?%?', rep, s)

class Tok:
    """一段字 → token：中文一字一个（不带声调的拼音），英文一个词一个，数字先换成汉字读法。
    vocab = 稿子里的英文词：听写里拼歪的英文按拼写最像的配回稿子里的写法。"""
    def __init__(self, vocab=()):
        self.vocab = sorted({w.lower() for w in vocab}); self.vs = set(self.vocab)
    def en(self, w):
        w = re.sub(r'[^a-z]', '', w.lower())
        if not w: return None
        if self.vocab and w not in self.vs:
            best = max(self.vocab, key=lambda v: difflib.SequenceMatcher(a=w, b=v).ratio())
            if difflib.SequenceMatcher(a=w, b=best).ratio() >= .6: return best
        return w
    def __call__(self, s):
        out = []
        for m in re.finditer(r'[A-Za-z]+|[一-鿿]', norm_num(s)):
            w = m.group(0)
            t = self.en(w) if w[0].isascii() else lazy_pinyin(w.translate(EQ))[0]
            if t: out.append(t)
        return out

def tok_for(beats):
    return Tok(w for b in beats for w in re.findall(r'[A-Za-z]+', b['text']))

def clauses_of(beats, quote_ids, toks):
    """不到 5 个字的小句并到同一句的下一小句（太短对不准）"""
    clauses = []
    for b in beats:
        if b['id'] in quote_ids: continue
        parts = [p.strip() for p in re.split(r'(?<=[，。？！：；])', b['text']) if p.strip()]
        merged, buf = [], ''
        for p in parts:
            buf += p
            if len(toks(buf)) >= 5: merged.append(buf); buf = ''
        if buf: merged = merged[:-1] + [merged[-1] + buf] if merged else [buf]
        for k, p in enumerate(merged):
            tk = toks(p)
            if not tk: continue
            clauses.append({'id': b['id'], 'k': k, 'text': p, 'toks': tk, 'end': p[-1]})
    return clauses

def select(beats, quote_ids, A):
    """A：整段听写（asr.json，[{start, end, text, words}]）→ (sel, flags)；sel 每个小句一条：{id, k, text, end, pick: [段, 盖住几成, 起, 止], why, takes, all}"""
    toks = tok_for(beats); clauses = clauses_of(beats, quote_ids, toks)
    S, owner = [], []   # 稿子的 token 流和每个 token 属于哪个小句
    for ci, c in enumerate(clauses):
        S += c['toks']; owner += [ci] * len(c['toks'])

    # ---------- 听写 ----------
    pieces = []   # 一次开口 = 听写的一段（重读的地方 whisper 基本都会另起一段）；段内再按字间停顿 ≥ .6 秒切开
    for sg in A:
        R = []
        for w in sg['words']:
            tk = toks(wget(w, 'w'))
            if not tk: continue
            s_, e_ = wget(w, 's'), wget(w, 'e'); d = (e_ - s_) / len(tk)
            R += [(t, s_ + i * d, s_ + (i + 1) * d) for i, t in enumerate(tk)]
        if not R: continue
        cur = [R[0]]
        for a, b in zip(R, R[1:]):
            if b[1] - a[2] >= .6: pieces.append(cur); cur = []
            cur.append(b)
        pieces.append(cur)

    # ---------- 对齐 ----------
    cand = [[] for _ in clauses]   # (piece, coverage, t0, t1)
    raw = [[] for _ in clauses]    # 每段各自盖住的部分
    p = 0
    for pi, pc in enumerate(pieces):
        pt = [x[0] for x in pc]; L = len(pt)
        lo, hi = max(0, p - 250), min(len(S), p + 450)
        # 在当前位置附近找最像的一段：同样像时离当前位置近的优先（短的开口在稿子里常能对上好几处）
        best_j, best_sc, best_r = None, -1, 0
        for j in range(lo, max(lo + 1, hi - max(1, L // 2))):
            r = difflib.SequenceMatcher(a=pt, b=S[j:j + L + 2], autojunk=False).ratio()
            sc = r - .0004 * abs(j - p)
            if sc > best_sc: best_sc, best_j, best_r = sc, j, r
        if best_j is None or best_r < .45: continue
        j0 = max(0, best_j - 3); seg = S[j0:best_j + L + 6]
        sm = difflib.SequenceMatcher(a=pt, b=seg, autojunk=False)
        hit = {}   # 小句 -> [(piece 内序号, 稿子序号)]
        for blk in sm.get_matching_blocks():
            for k in range(blk.size):
                j = j0 + blk.b + k; hit.setdefault(owner[j], []).append((blk.a + k, j))
        far = p
        for ci, hs in hit.items():
            js = {j for _, j in hs}
            i0, i1 = min(i for i, _ in hs), max(i for i, _ in hs)
            t0, t1 = pc[i0][1], pc[i1][2]
            if t1 - t0 > len(js) * .45 + 1.2: continue   # 散得太开，是碰巧对上
            raw[ci].append((pi, js, t0, t1))
            if len(js) / len(clauses[ci]['toks']) >= .8: far = max(far, max(js) + 1)
        p = max(p, far)

    # 一句话被听写切成两段时：相邻的段在时间上接得上（< 1.2 秒）、在稿子里也往后接，就合起来算一遍
    for ci, rs in enumerate(raw):
        runs = []
        for r in rs:
            if runs and r[0] == runs[-1]['last'] + 1 and r[2] - runs[-1]['t1'] < 1.2 and min(r[1]) > max(runs[-1]['js']) - 1:
                runs[-1]['js'] |= r[1]; runs[-1]['t1'] = r[3]; runs[-1]['last'] = r[0]
            else: runs.append({'first': r[0], 'last': r[0], 'js': set(r[1]), 't0': r[2], 't1': r[3]})
        for u in runs:
            cov = len(u['js']) / len(clauses[ci]['toks'])
            if cov >= .5: cand[ci].append((u['first'], round(cov, 3), round(u['t0'], 3), round(u['t1'], 3)))

    # ---------- 每个小句挑一遍 ----------
    sel = []
    for ci, c in enumerate(clauses):
        good = [x for x in cand[ci] if x[1] >= .8]
        ok = [x for x in cand[ci] if x[1] >= .6]
        if good: pick, why = max(good, key=lambda x: x[2]), 'last'
        elif ok: pick, why = max(ok, key=lambda x: x[2]), 'last'          # 听写错了几个字，照样取最后一遍
        elif cand[ci]: pick, why = max(cand[ci], key=lambda x: (x[1], x[2])), 'best_partial'
        else: pick, why = None, 'missing'
        sel.append({**{k: c[k] for k in ('id', 'k', 'text', 'end')}, 'pick': pick, 'why': why, 'takes': len(good), 'all': cand[ci]})
    # 听写听错了的（人读了，whisper 写成别的字）：前后两句都找到、而且时间上接得上，中间那段就是它
    for i, x in enumerate(sel):
        if x['why'] == 'last': continue
        a = next((k for k in range(i - 1, -1, -1) if sel[k]['why'] in ('last', 'between')), None)
        b = next((k for k in range(i + 1, len(sel)) if sel[k]['why'] == 'last'), None)
        if a is None or b is None: continue
        ta, tb = sel[a]['pick'][3], sel[b]['pick'][2]
        n = sum(len(clauses[k]['toks']) for k in range(a + 1, b))
        if 0 < tb - ta <= n * .6 + 4:
            # 空当里可能有重读：只取空当里最后一段开口（往前连上紧挨着的段），按字数分给中间几句
            segs = [(sg['start'], sg['end']) for sg in A if sg['start'] >= ta - .1 and sg['end'] <= tb + .1]
            if segs:
                u0, u1 = segs[-1]
                for s0, s1 in reversed(segs[:-1]):
                    if u0 - s1 < .3 and (u1 - s0) < n * .45 + 1: u0 = s0
                    else: break
            else: u0, u1 = ta, tb
            t = u0
            for k in range(a + 1, b):
                d = (u1 - u0) * len(clauses[k]['toks']) / n
                sel[k]['pick'] = (None, 0, round(t, 3), round(t + d, 3)); sel[k]['why'] = 'between'; t += d
    flags = [(x['id'], x['k'], x['text'], x['why'], x['pick']) for x in sel if x['why'] not in ('last', 'between')]
    return sel, flags

def report(sel, flags):
    n = len(sel)
    print(n, '小句；', sum(s['why'] == 'last' for s in sel), '个找到完整的；', sum(s['why'] == 'between' for s in sel), '个靠前后两句定位；要听的', len(flags))
    for f in flags: print('  ', f)
    print('读了不止一遍的小句：', sum(1 for s in sel if s['takes'] > 1))
