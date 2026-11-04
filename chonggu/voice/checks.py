"""口播的几道检查（每道查出来的写进 voice/flags.tsv，人听过改 status）：
- chunks：按停顿（≥ .15 秒）把每句拼进去的录音拆成一小段一小段，分别听写；前后两段开头相似、后一段在稿子里又退回去了 = 念了半句又重念（kind=repeat）。
  整句听写会把重复的半句并掉（第 8 期 wh09/wh10/wh13 就这么漏过去的），拆开听才看得出。
- neighbours：接缝换成静音的那一截，是不是邻句自己被切掉的字（第 8 期 rv05「老大哥」的「哥」：rv06 头上静掉的其实是 rv05 没拼进去的结尾）（kind=clip）。
- mute_diff：换成静音前后各听写一遍，静音以后不许多少字（kind=mute）。
- lines：拼好的整条口播里每一句单独听写，和字幕比；多出来的字（念了半句又重念、带进来的半个字）和少掉的字（切掉了）≥ 2 个的列出来（kind=line）。
  听写本身的错别字也会混在里面：按拼音比，同音字、近音字（平翘舌、前后鼻音）不算；人工听过改 ok。"""
import difflib, re
import numpy as np
from pypinyin import lazy_pinyin
from chonggu.voice.common import SR, PROMPT, env_db, lcs
from chonggu.voice.seams import TH, by_line

DIG = dict(zip('0123456789', '零一二三四五六七八九'))
SAME = {'两': '二', '她': '他', '它': '他', '得': '的', '地': '的', '那': '哪'}
def norm(s):
    s = ''.join(DIG.get(c, c) for c in s.lower()); s = ''.join(SAME.get(c, c) for c in s); return re.sub(r'[^一-鿿a-z]', '', s)

def char_diff(want, heard):
    w, h = norm(want), norm(heard); sm = difflib.SequenceMatcher(None, w, h, autojunk=False)
    return [f'{w[i1:i2]}→{h[j1:j2]}' for op, i1, i2, j1, j2 in sm.get_opcodes() if op != 'equal']

def near(p):
    """近音当成一样：平翘舌（zh/z、ch/c、sh/s）、前后鼻音（-ng/-n）。带口音的录音、CPU 上的小听写模型最常混这几种（示例期：钟离春→中离村、邻→陵），
    这里只数多出来、少掉的字，不管错别字"""
    for a in ('zh', 'ch', 'sh'):
        if p.startswith(a): p = a[0] + p[2:]; break
    return p[:-1] if p.endswith('ng') else p

def miss_extra(toks, want, heard):
    """按拼音 token 比（近音也算一样）：(少了几个, 多了几个)"""
    w, h = [near(x) for x in toks(want)], [near(x) for x in toks(heard)]; m = lcs(h, w); return len(w) - m, len(h) - m

def pad(x, a=.3, b=.4):
    return np.concatenate([np.zeros(int(a * SR), np.float32), x, np.zeros(int(b * SR), np.float32)])

# ---------- 拆段查重念 ----------
def chunks_of(E, a, b):
    sp = E[int(a * 100):int(b * 100)] > TH; out, k = [], 0
    while k < len(sp):
        if sp[k]:
            j = k
            while j < len(sp) and sp[j]: j += 1
            if j - k >= 3: out.append([a + k / 100, a + j / 100])
            k = j
        else: k += 1
    m = []
    for s in out:
        if m and s[0] - m[-1][1] < .15: m[-1][1] = s[1]
        else: m.append(s)
    return m

def span_in(line, seg):
    """seg 在稿子这句里盖住的位置 (起, 止)（拼音 token 的序号）；连着配上的不到两个字回 None"""
    bl = [b for b in difflib.SequenceMatcher(None, line, seg, autojunk=False).get_matching_blocks() if b.size >= 2]
    return (bl[0].a, bl[-1].a + bl[-1].size) if bl else None

def onward(a, b, line):
    """后一段在稿子里是接着前一段往下念的（不是回头重念）：示例期「来自维基百科，自由的百科全书」两段都有「自」「百科」，开头像 .5，但后一段从前一段念完的地方接着走。
    a、b、line 都是拼音 token；对不上稿子的不算接着念（照样报）"""
    pa, pb = span_in(line, a), span_in(line, b)
    return bool(pa and pb and pb[0] >= pa[1] - 1)

def junk(t, prompt=PROMPT):
    """听写对着静音编出来的话"""
    return '' if '简体中文' in t or '点赞' in t or '订阅' in t or (prompt and t and t in prompt) else t

def chunks_check(se, LOG, seams, beats, ear, only=None):
    """返回 (每句的小段 {句id: [[起, 止, 听写], ...]}, 可疑的 [(句id, key, 说明)])"""
    E = env_db(se); TX = {b['id']: b['text'] for b in beats}
    def W(a, b):
        x = pad(se[max(0, int(a * SR)):int(b * SR)], .3, .3); return junk(ear(x, prompt=PROMPT, temperature=0.0)['text'].strip())
    muted = lambda i, a, b: any(s[0] == i and s[3] - .01 <= a and b <= s[4] + .01 for s in seams)
    res, hits = {}, []
    G = by_line(LOG)
    for i in [b['id'] for b in beats]:
        gs = G.get(i, [])
        if not gs or (only and i not in only): continue
        cs = [(round(a, 2), round(b, 2), W(a - .03, b + .03)) for g in gs for a, b in chunks_of(E, g[1], g[2]) if not muted(i, a, b)]
        res[i] = cs; n = [norm(t) for _, _, t in cs]; py = [lazy_pinyin(s) for s in n]; line = lazy_pinyin(norm(TX.get(i, '')))
        for k in range(len(n) - 1):
            for d in (1, 2):
                if k + d >= len(n) or len(n[k]) < 2 or len(n[k + d]) < 2: continue
                L = min(len(n[k]), len(n[k + d]), 8); r = difflib.SequenceMatcher(None, n[k][:L], n[k + d][:L]).ratio()
                if r >= .5 and not onward(py[k], py[k + d], line):
                    hits.append((i, f'{cs[k][0]:.2f}-{cs[k][1]:.2f}/{cs[k + d][0]:.2f}-{cs[k + d][1]:.2f}',
                                 f'「{TX.get(i, "")}」 {cs[k][0]}-{cs[k][1]} {cs[k][2]} ｜ {cs[k + d][0]}-{cs[k + d][1]} {cs[k + d][2]}（像 {r:.2f}）'))
                    print(f'！{i}「{TX.get(i, "")}」\n    {cs[k][0]}-{cs[k][1]} {cs[k][2]}\n    {cs[k + d][0]}-{cs[k + d][1]} {cs[k + d][2]}  （像 {r:.2f}）', flush=True)
    return res, hits

# ---------- 静音的是不是邻句自己的字 ----------
def neighbours(seams, LOG, beats, quote_ids, near=.25, tol=.02, short=.7):
    """头上静掉的一截紧跟在前一句最后一段的结尾后面（录音里隔不到 near 秒），而前一句在它说完之前就切了 → 可能是前一句自己的尾巴（前一句少了最后一个字）；
    尾巴上静掉的一截紧挨着后一句第一段的开头、后一句在它之后才开始 → 可能是后一句自己的开头。修法：ovr.json 的 _edge 把那一句的切点挪过去。
    只看邻句外面那部分不长于 short 秒的（再长就是没说完的那一遍，静掉是对的）。"""
    G = by_line(LOG); order = [b['id'] for b in beats]; out = []
    for i, gi, side, t0, t1, why in seams:
        if i not in order: continue
        k = order.index(i)
        if side == '头' and gi == 0 and k > 0:
            j = order[k - 1]
            if j in quote_ids or j not in G: continue
            zj = G[j][-1][2]
            if zj < t1 - tol and t0 <= zj + near and t1 - zj <= short:   # 长的一截是没说完的那一遍，不是半个字
                out.append((i, f'头 {t0:.2f}-{t1:.2f}', f'{i} 头上静掉的 {t0:.2f}-{t1:.2f} 紧跟在 {j} 的结尾（{zj:.2f}）后面：听一下 {j} 是不是少了最后一个字；是的话在 ovr.json 的 _edge 里把 {j}:{len(G[j]) - 1} 的止挪到 {t1:.2f}'))
        elif side == '尾' and gi == len(G.get(i, [])) - 1 and k + 1 < len(order):
            j = order[k + 1]
            if j in quote_ids or j not in G: continue
            aj = G[j][0][1]
            if aj > t0 + tol and aj <= t1 + near and aj - t0 <= short:
                out.append((i, f'尾 {t0:.2f}-{t1:.2f}', f'{i} 尾巴上静掉的 {t0:.2f}-{t1:.2f} 紧挨着 {j} 的开头（{aj:.2f}）：听一下 {j} 是不是少了第一个字；是的话在 ovr.json 的 _edge 里把 {j}:0 的起挪到 {t0:.2f}'))
    return out

# ---------- 静音前后逐字比 ----------
def mute_diff(before, after, spans, seams, beats, toks, ear, prompt=PROMPT):
    """只听有静音的句子；返回 (结果 {句id: {...}}, 静音以后少了字的 [(句id, key, 说明)])"""
    TX = {b['id']: b['text'] for b in beats}; ids = sorted({s[0] for s in seams}, key=lambda i: [b['id'] for b in beats].index(i) if i in TX else 1e9)
    res, bad = {}, []
    for i in ids:
        if i not in spans or i not in TX: continue
        a, z = spans[i]; seg = lambda y: pad(y[int(a * SR):int(z * SR)])
        h0, h1 = ear(seg(before), prompt=prompt, temperature=0.0)['text'].strip(), ear(seg(after), prompt=prompt, temperature=0.0)['text'].strip()
        m0, _ = miss_extra(toks, TX[i], h0); m1, _ = miss_extra(toks, TX[i], h1)
        res[i] = {'want': TX[i], 'before': h0, 'after': h1, 'miss_before': m0, 'miss_after': m1}
        if m1 > m0: bad.append((i, f'{m0}->{m1}', f'静音以后少了 {m1 - m0} 个字：前「{h0}」 后「{h1}」 稿「{TX[i]}」'))
    return res, bad

# ---------- 整句核对 ----------
def check_lines(y, spans, beats, quote_ids, toks, ear, prompt=PROMPT, only=None):
    """返回 (结果 {句id: {heard, want, diff, miss, extra}}, 要人听的 [(句id, key, 说明)])"""
    res, bad = {}, []
    for b in beats:
        i = b['id']
        if i in quote_ids or i not in spans or (only and i not in only): continue
        a, z = spans[i]; r = ear(pad(y[int(a * SR):int(z * SR)]), prompt=prompt, temperature=0.0); h = r['text'].strip()
        rep = char_diff(b['text'], h); miss, extra = miss_extra(toks, b['text'], h)
        res[i] = {'heard': h, 'want': b['text'], 'diff': rep, 'miss': miss, 'extra': extra}
        if rep: print(f"{i:6s} {'；'.join(rep)}\n        听：{h}", flush=True)
        if miss >= 2 or extra >= 2: bad.append((i, '；'.join(rep)[:80], f'多 {extra} 字、少 {miss} 字：听「{h}」 稿「{b["text"]}」'))
    return res, bad

# ---------- 回归：和参考时间线比 ----------
def diff_timelines(ref, new):
    """两个时间线逐句比：返回 {'missing': [...], 'extra': [...], 'start': 最大差, 'end': ..., 'vstart': ..., 'chars': ..., 'chapters': ..., 'duration': 差, 'worst': [(差, 句id, 哪一项)]}"""
    A = {b['id']: b for b in ref['beats']}; B = {b['id']: b for b in new['beats']}; worst = []
    out = {'missing': [i for i in A if i not in B], 'extra': [i for i in B if i not in A], 'start': 0., 'end': 0., 'vstart': 0., 'chars': 0., 'chapters': 0.,
           'duration': round(abs(ref['duration'] - new['duration']), 3)}
    for i in A.keys() & B.keys():
        a, b = A[i], B[i]
        for k in ('start', 'end', 'vstart'):
            if k in a or k in b:
                d = abs(a.get(k, a['start']) - b.get(k, b['start'])); out[k] = max(out[k], d); worst.append((round(d, 3), i, k))
        if a['text'] == b['text'] and len(a['chars']) == len(b['chars']):
            d = max((abs(x[1] - y[1]) for x, y in zip(a['chars'], b['chars'])), default=0); out['chars'] = max(out['chars'], d); worst.append((round(d, 3), i, 'chars'))
    for ca, cb in zip(ref['chapters'], new['chapters']):
        out['chapters'] = max(out['chapters'], abs(ca['t0'] - cb['t0']), abs(ca['t1'] - cb['t1']))
    out['worst'] = sorted(worst, reverse=True)[:10]
    for k in ('start', 'end', 'vstart', 'chars', 'chapters'): out[k] = round(out[k], 3)
    return out
