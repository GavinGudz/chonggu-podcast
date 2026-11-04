"""把录音里挑出来的每一小句拼成整条原始口播（还没过人声链）。
输入：rec_se.wav（降噪）、rec_hp.wav（只切了低频的原声，混回一点保留空气感）、sel.json、ovr.json、timeline.json
输出：narr_raw.wav、narr_spans.json（每句在原始口播里的起止）、narr_groups.json（每一段：[句id, 录音里的起, 止, 在口播里的起点, 长度]）
规则：
- 每个小句的起止对到真正的停顿上（降噪后的能量低于 -50 dB 连续 60 ms），不切到字。
- 同一遍里连着读的几句保留原来的连读；里面超过 .45 秒的停顿压到 .32 秒（主讲要快一点）。
- 拼接处的停顿：逗号类 .16 秒，句号类 .32 秒；稿子里写了（停 x）的照写；换章 1.0 秒。
- 原声句留出原声的时长，前后各留一点。

ovr.json（人工核过的地方，录音秒数）：
  "句id:小句序号": [起, 止]                 这一小句用这一段
  "句id:*": [起, 止]                        整句换成这一段（这一句只留第一个小句，读到句号）
  "句id:*": [[起, 止], [起, 止], ...]       一句由几段拼成（念了半句又重念的，前半和后半各取完整的那遍）；段和段之间只留很短的气口
  "句id:k": ["xx", 起, 止]                  两头都按字的时刻切（连读时前面一句的尾音不带进来）
  "句id:k": ["x", 起, 止]                   只有结尾按字的时刻切
  "句id:k": null                            主讲没念这一小句
  "_exact": [句id, ...]                     这些句子拼起来的每一段两头都按字的时刻切
  "_edge": {"句id:段序号": [起或 null, 止或 null]}   这一段的起止直接用这两个秒数（切点落在字中间、要补回的尾音）
  以 _ 开头的别的键（比如 "_说明"）不管。"""
import copy, re
import numpy as np
from chonggu.voice.common import SR, TH, env_db, squeeze, fade

PAUSE_IN = {'·': .06}   # 一句拼两半：前半和后半之间

def norm_ovr(ovr):
    """json 里的 list 分清是一段（[起, 止] / ["xx", 起, 止]）还是几段（[[起, 止], ...]）：一段变成 tuple"""
    O = {}
    for k, v in (ovr or {}).items():
        if k.startswith('_'): continue
        O[k] = tuple(v) if isinstance(v, list) and v and not isinstance(v[0], list) else v
    return O

def apply_ovr(S, ovr):
    """sel 的每一行按 ovr 改：返回新的 sel（不改原来的）"""
    S = copy.deepcopy(S); O = norm_ovr(ovr)
    for k_ in list(O):   # 句id:* —— 整句换成这一段：这一句只留第一个小句，读到句号
        if k_.endswith(':*'):
            i_ = k_[:-2]; xs = [x for x in S if x['id'] == i_]
            if not xs: continue
            S = [x for x in S if x['id'] != i_ or x is xs[0]]; xs[0]['k'] = '*'; xs[0]['end'] = '。'
    S = [x for x in S if not (f"{x['id']}:{x['k']}" in O and O[f"{x['id']}:{x['k']}"] is None)]   # null：主讲没念这一小句
    for x in S:
        o = O.get(f"{x['id']}:{x['k']}")
        if o and isinstance(o, tuple) and o[0] == 'xx': x['pick'] = [None, 1, o[1], o[2]]; x['parts'] = None; x['exact'] = x['exact_in'] = True; x['why'] = 'manual'   # 两头都按字的时刻切
        elif o and isinstance(o, tuple) and o[0] == 'x': x['pick'] = [None, 1, o[1], o[2]]; x['parts'] = None; x['exact'] = True; x['why'] = 'manual'
        elif o: x['pick'] = [None, 1, *(o if isinstance(o, tuple) else o[0])]; x['parts'] = [tuple(p) for p in o] if isinstance(o, list) else None; x['why'] = 'manual'
    return S

def groups_of(rows, exact=False):
    """一句的几个小句 → 几段录音：连着读的小句并成一段"""
    groups = []
    for x in rows:
        if x.get('parts'):   # 拼起来的一句：前半和后半之间只留很短的气口，跟一口气读的一样
            n = len(x['parts'])
            for pi_, (t0, t1) in enumerate(x['parts']):
                groups.append({'t0': t0, 't1': t1, 'end': x['end'] if pi_ == n - 1 else '·', 'exact_out': exact or pi_ < n - 1, 'exact_in': exact or pi_ > 0})
            continue
        t0, t1 = x['pick'][2], x['pick'][3]
        if groups and -.1 <= t0 - groups[-1]['t1'] < .8 and not groups[-1].get('exact_out') and not x.get('exact_in'):
            groups[-1]['t1'] = t1; groups[-1]['end'] = x['end']; groups[-1]['exact_out'] = x.get('exact', False)
        else: groups.append({'t0': t0, 't1': t1, 'end': x['end'], 'exact_out': x.get('exact', False), 'exact_in': x.get('exact_in', False)})
    return groups

def missing(S, beats, quote_ids):
    """还没有取段的小句（听写里找不到、ovr.json 也没给）和一个小句都没有的句子"""
    bad = [f"{x['id']}:{x['k']} {x['text']}" for x in S if not x.get('pick')]
    have = {x['id'] for x in S}
    return bad + [f"{b['id']} {b['text']}" for b in beats if b['id'] not in quote_ids and b['id'] not in have]

class Cutter:
    """在降噪后的能量上找切点"""
    def __init__(self, se):
        self.sil = env_db(se) < TH
    def onset(self, t0, lo=.4, hi=.12):
        """t0 附近往前找最近一段 ≥ 60 ms 的静音，从它结束处开始（留 20 ms）"""
        sil = self.sil; a, b = max(-1, int((t0 - lo) * 100)), min(len(sil) - 1, int((t0 + hi) * 100))
        run = 0
        for k in range(b, a, -1):
            run = run + 1 if sil[k] else 0
            if run >= 6: return (k + run) / 100 - .02
        return t0 - .05
    def offset(self, t1, lo=.12, hi=.5):
        """t1 附近往后找第一段 ≥ 80 ms 的静音，在它开头处结束（留 40 ms 尾音）"""
        sil = self.sil; a, b = max(0, int((t1 - lo) * 100)), min(len(sil), int((t1 + hi) * 100))
        run = 0
        for k in range(a, b):
            run = run + 1 if sil[k] else 0
            if run >= 8: return (k - run + 1) / 100 + .04
        return t1 + .1

def assemble(beats, chapters, S, ovr, se, hp, quote_dur, gaps):
    """S：sel.json；quote_dur：{原声句id: 秒}；gaps：{句id: 到下一句的空档}（≥ .5 秒的照留，就是稿子里的（停 x））。
    返回 (口播, spans, LOG)"""
    S = apply_ovr(S, ovr); X = se + .1 * hp[:len(se)]   # 混回 -20 dB 的原声：停顿里不是死寂，听着自然
    cut = Cutter(se); exact = set((ovr or {}).get('_exact', [])); edge = (ovr or {}).get('_edge', {})
    chap_first = {c['first'] for c in chapters}
    by_id = {}
    for x in S: by_id.setdefault(x['id'], []).append(x)
    pieces, spans, LOG = [], {}, []   # LOG：每一段 (句id, 原始录音的起止, 在拼好的口播里的起点、长度)
    t = 0.0
    for bi, b in enumerate(beats):
        if bi and b['id'] in chap_first: t += 1.0
        if b['id'] in quote_dur:
            d = quote_dur[b['id']]; t += .15; spans[b['id']] = (round(t, 3), round(t + d, 3)); t += d + .25; continue
        groups = groups_of(by_id[b['id']], b['id'] in exact)
        b0 = t
        for gi, g in enumerate(groups):
            a = g['t0'] - .01 if g.get('exact_in') else cut.onset(g['t0'])     # 一句拼两半的接缝处按字的时刻切，不往外找静音
            z = g['t1'] + .01 if g.get('exact_out') else cut.offset(g['t1'])
            ea, ez = edge.get(f"{b['id']}:{gi}", [None, None])   # _edge：这一段的起止直接用这两个秒数
            a, z = ea if ea is not None else a, ez if ez is not None else z
            seg_ = squeeze(X[int(a * SR):int(z * SR)]); LOG.append((b['id'], round(a, 3), round(z, 3), round(t, 3), round(len(seg_) / SR, 3)))
            pieces.append((t, fade(seg_))); t += len(seg_) / SR
            if gi < len(groups) - 1: t += PAUSE_IN.get(g['end'], .16 if g['end'] in '，：、；' else .32)
        spans[b['id']] = (round(b0, 3), round(t, 3))
        g = gaps.get(b['id'], 0)
        t += g if g >= .5 else (.16 if b['text'][-1] in '，：、；' else .3)
    y = np.zeros(int((t + 1.5) * SR), np.float32)
    for a, seg in pieces: y[int(a * SR):int(a * SR) + len(seg)] += seg
    n = sum(len(re.findall(r'[一-鿿]', b['text'])) for b in beats if b['id'] not in quote_dur)
    speak = sum(len(s) for _, s in pieces) / SR
    print(f'原始口播 {t / 60:.2f} 分钟；说话 {speak / 60:.2f} 分钟；{n} 个汉字 → 全长 {n / (t / 60):.0f} 字/分，说话时 {n / (speak / 60):.0f} 字/分')
    return y, spans, [list(g) for g in LOG]
