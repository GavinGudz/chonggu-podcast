"""接缝：录音秒数 → 口播里的位置（换成静音）、静音判法、邻句检查"""
import numpy as np
import pytest
from chonggu.voice.common import SR, squeeze
from chonggu.voice.assemble import assemble
from chonggu.voice.seams import apply, positions, decide, lost_edge, own_edge
from chonggu.voice.checks import neighbours
from voice_fakes import tone

def rms(x): return float(np.sqrt(np.mean(x.astype(np.float64) ** 2))) if len(x) else 0.

def recording(parts, total=8.0):
    """parts：[(起, 长, 频率)] → 录音（降噪后的样子）"""
    y = np.zeros(int(total * SR), np.float32)
    for a, d, f in parts: y[int(a * SR):int(a * SR) + int(d * SR)] = tone(f, d)
    return y

# A .5 秒 —— 停 1.2 秒（拼的时候压到 .32）—— B .4 秒 —— 停 .2 —— C .5 秒
A, B, C = (1.0, .5, 400), (2.7, .4, 600), (3.3, .5, 800)

@pytest.fixture
def narr():
    rec = recording([A, B, C]); beats = [{'id': 'a1', 'text': '一二三四五六七。'}]
    S = [{'id': 'a1', 'k': 0, 'text': '一二三四五六七。', 'end': '。', 'pick': [0, 1, 1.0, 3.8], 'why': 'last', 'takes': 1, 'all': []}]
    y, spans, LOG = assemble(beats, [{'first': 'a1'}], S, {}, rec, rec * 0, {}, {})
    return rec, y, LOG

def test_mute_inside_squeezed_pause_hits_the_right_word(narr):
    rec, y, LOG = narr; _, a, z, o, L = LOG[0]
    assert len(squeeze(rec[int(a * SR):int(z * SR)])) < (z - a) * SR - .8 * SR   # 长停顿确实压了
    seams = [['a1', 0, '中', B[0] - .05, B[0] + B[1] + .02, '一截在长停顿里起头']]
    y2, tot = apply(y, seams, LOG, rec)
    assert len(y2) == len(y) and .4 < tot < .5
    o_ = int(o * SR); pa = o_ + int((A[0] - a) * SR); pc = o_ + len(squeeze(rec[int(a * SR):int(C[0] * SR)]))
    b0 = pc - int(.2 * SR) - int(B[1] * SR)                            # B 在口播里的位置：C 前面 .2 秒停顿、再往前 .4 秒
    assert rms(y2[b0 + 400:b0 + int(B[1] * SR) - 400]) < 1e-6          # B 静掉了
    assert abs(rms(y2[pc + 800:pc + int(C[1] * SR) - 800]) - rms(y[pc + 800:pc + int(C[1] * SR) - 800])) < 1e-7   # C 一点没动
    assert np.array_equal(y2[pa:pa + int(A[1] * SR)], y[pa:pa + int(A[1] * SR)])   # A 一点没动

def test_head_mute_from_group_start(narr):
    rec, y, LOG = narr; _, a, z, o, L = LOG[0]
    p, q = positions([['a1', 0, '头', a, A[0] + A[1] + .02, '']], LOG, rec)[0]
    assert p == int(round(o * SR)) and abs(q - (p + int((A[0] + A[1] + .02 - a) * SR))) <= 1
    p, q = positions([['a1', 0, '尾', C[0] - .01, z, '']], LOG, rec)[0]
    assert q == int(round(o * SR)) + len(squeeze(rec[int(a * SR):int(z * SR)]))   # 到段尾 = 这一段压过以后的全长

def test_fades_at_both_sides(narr):
    rec, y, LOG = narr; p, q = positions([['a1', 0, '中', B[0], B[0] + B[1], '']], LOG, rec)[0]
    y2, _ = apply(np.ones_like(y), [['a1', 0, '中', B[0], B[0] + B[1], '']], LOG, rec)
    f = int(.008 * SR)
    assert y2[p - f - 1] == 1 and 0 < y2[p - f // 2] < 1 and y2[p] == 0 and y2[q - 1] == 0 and 0 < y2[q + f // 2] < 1 and y2[q + f + 1] == 1

def test_lost_edge_only_counts_pure_loss():
    assert lost_edge(['ran', 'hou', 'ta', 'yao'], ['ta', 'yao'], '头') == ['ran', 'hou']
    assert lost_edge(['bo', 'tong'], ['bo', 'tu'], '尾') == []               # 换成别的字不算少
    assert lost_edge(['na', 'ta', 'bing', 'mei', 'you'], ['na', 'ta'], '尾') == ['bing', 'mei', 'you']
    assert lost_edge(['a', 'b'], [], '头') == ['a', 'b']

def test_own_edge_veto():
    want = ['ran', 'hou', 'ta', 'yao', 'kai', 'shi', 'mai']
    assert own_edge(['ran', 'hou'], ['ta', 'yao', 'kai', 'shi'], want, '头')          # 少的是这句自己的开头 → 留着
    assert not own_edge(['si'], ['ta', 'yao', 'kai', 'shi'], want, '头')             # 少的是前一遍的「司」→ 可以静
    assert own_edge(['mai'], ['yao', 'kai', 'shi'], want, '尾')

def test_decide_rule_and_review():
    """头上一个小声，离前面（前一遍）近、离正文远 → 静音；听写只否决；review 的 keep / mute / extra 都照办"""
    se = recording([(.6, .35, 400), (1.0, .15, 500), (1.4, .5, 600),          # a1：前一遍的尾巴、带进来的「司」、正文
                    (4.3, .15, 700), (4.5, .3, 800), (5.05, .6, 900)])        # a2：前一遍的尾巴、这句自己的「然后」、正文
    LOG = [['a1', .95, 1.95, 0.0, 1.0], ['a2', 4.47, 5.8, 1.2, 1.3]]
    local = [dict(id='a1', g=0, side='头', raw=[.95, 1.95], raw_cut=[.95, 1.2], with_='司开了', without='开了'),
             dict(id='a2', g=0, side='头', raw=[4.47, 5.8], raw_cut=[4.47, 4.85], with_='然后开', without='开')]
    texts = {'a1': '开了家新公司', 'a2': '然后开始'}
    toks = lambda s: list(s)
    out = decide(local, LOG, se, {}, texts, toks)
    assert [x[:3] for x in out] == [['a1', 0, '头']] and out[0][3] == .95 and abs(out[0][4] - 1.19) < .02   # a2 的「然后」被听写否决
    out = decide(local, LOG, se, {'keep': [['a1', 0, '头']], 'mute': [['a2', 0, '头']], 'extra': [['a2', 0, '尾', 5.2, None, '人工']]}, texts, toks)
    assert [x[:3] for x in out] == [['a2', 0, '头'], ['a2', 0, '尾']] and out[1][3:5] == [5.2, 5.8]
    stale = [dict(local[0], raw=[.9, 1.95])]                            # 查过以后这一段又改了：不管
    assert decide(stale, LOG, se, {}, texts, toks) == []

def test_neighbours_rv05():
    """第 8 期 rv05「老大哥」：rv06 头上静掉的那一小截其实是 rv05 没拼进去的「哥」"""
    beats = [{'id': i, 'text': ''} for i in ('rv04', 'rv05', 'rv06', 'q1', 'rv07')]
    LOG = [['rv04', 121.11, 123.9, 0, 2.6], ['rv05', 123.73, 129.75, 3, 5.4], ['rv06', 129.83, 136.81, 9, 7], ['rv07', 140, 142, 20, 2]]
    seams = [['rv06', 0, '头', 129.83, 130.01, '带进来的前一遍尾音'], ['rv05', 0, '头', 123.73, 123.89, '带进来的前一遍尾音']]
    hits = neighbours(seams, LOG, beats, {'q1'})
    assert [h[0] for h in hits] == ['rv06'] and 'rv05' in hits[0][2]
    LOG[1][2] = 130.0                                                    # 修好：rv05 的止挪到 130.0（ovr.json 的 _edge）
    assert neighbours(seams, LOG, beats, {'q1'}) == []
    long = [['rv06', 0, '头', 129.83, 132.5, '没说完的一遍']]              # 长的一截是没说完的那一遍，不报
    assert neighbours(long, [g[:2] + [129.75] + g[3:] if g[0] == 'rv05' else g for g in LOG], beats, {'q1'}) == []
    tail = [['rv04', 0, '尾', 123.6, 123.9, '带进来的后一遍开头']]           # 尾巴：静掉的是后一句自己的开头
    LOG[1][1] = 123.8
    assert [h[0] for h in neighbours(tail, LOG, beats, {'q1'})] == ['rv04']
