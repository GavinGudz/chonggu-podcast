"""ovr.json 的各种写法、拼原始口播、flags.tsv"""
import json
import numpy as np
from chonggu.voice.assemble import norm_ovr, apply_ovr, groups_of, missing, assemble
from chonggu.voice.common import SR, Flags, sig, Stamps
from voice_fakes import tone

def row(i, k, text, t0, t1, end=None, why='last'):
    return {'id': i, 'k': k, 'text': text, 'end': end or text[-1], 'pick': None if why == 'missing' else [3, 1.0, t0, t1], 'why': why, 'takes': 1, 'all': []}

SEL = [row('a1', 0, '今年二月，', 1.0, 2.0), row('a1', 1, '印度开了个大会。', 2.1, 3.5),
       row('a2', 0, '拍合影的时候，', 5.0, 6.0), row('a2', 1, '总理让人手拉手。', 6.2, 7.6),
       row('a3', 0, '这一句没念。', 0, 0, why='missing'), row('a3', 1, '后半句念了。', 9.0, 10.0),
       row('a4', 0, '前半句。', 12.0, 13.0), row('a4', 1, '后半句。', 13.1, 14.0)]

def test_norm_ovr_tells_one_range_from_parts():
    O = norm_ovr(json.loads('{"_说明": "x", "a:*": [1, 2], "b:*": [[1, 2], [3, 4]], "c:0": ["xx", 1, 2], "d:0": null, "_exact": ["b"]}'))
    assert O == {'a:*': (1, 2), 'b:*': [[1, 2], [3, 4]], 'c:0': ('xx', 1, 2), 'd:0': None}

def test_star_keeps_first_clause_reads_to_full_stop():
    S = apply_ovr(SEL, {'a2:*': [5.5, 7.9]})
    a2 = [x for x in S if x['id'] == 'a2']
    assert len(a2) == 1 and a2[0]['k'] == '*' and a2[0]['end'] == '。' and a2[0]['pick'] == [None, 1, 5.5, 7.9] and a2[0]['why'] == 'manual'
    assert len([x for x in SEL if x['id'] == 'a2']) == 2   # 原来的不动

def test_star_with_parts_gives_one_group_per_part():
    S = apply_ovr(SEL, {'a2:*': [[5.0, 5.8], [6.3, 7.6]]})
    x = [x for x in S if x['id'] == 'a2'][0]
    assert x['parts'] == [(5.0, 5.8), (6.3, 7.6)] and x['pick'] == [None, 1, 5.0, 5.8]
    g = groups_of([x])
    assert [(y['t0'], y['t1'], y['end']) for y in g] == [(5.0, 5.8, '·'), (6.3, 7.6, '。')]
    assert (g[0]['exact_in'], g[0]['exact_out'], g[1]['exact_in'], g[1]['exact_out']) == (False, True, True, False)   # 接缝处按字切，两头照常找静音
    g = groups_of([x], exact=True)                                      # _exact：每一段两头都按字切
    assert all(y['exact_in'] and y['exact_out'] for y in g)

def test_xx_and_x_and_null():
    S = apply_ovr(SEL, {'a1:0': ['xx', 1.1, 1.9], 'a1:1': ['x', 2.2, 3.4], 'a3:0': None})
    a1 = [x for x in S if x['id'] == 'a1']
    assert a1[0]['exact'] and a1[0]['exact_in'] and a1[0]['pick'][2:] == [1.1, 1.9]
    assert a1[1]['exact'] and not a1[1].get('exact_in') and a1[1]['pick'][2:] == [2.2, 3.4]
    assert [x['k'] for x in S if x['id'] == 'a3'] == [1]                # null：这一小句去掉
    g = groups_of(a1)                                                   # xx 的结尾按字切 → 后面那个小句不和它连成一段
    assert len(g) == 2 and g[0]['exact_out'] and g[1]['exact_in'] is False

def test_consecutive_clauses_merge_into_one_group():
    g = groups_of([x for x in SEL if x['id'] == 'a4'])
    assert len(g) == 1 and (g[0]['t0'], g[0]['t1'], g[0]['end']) == (12.0, 14.0, '。')
    g = groups_of([x for x in SEL if x['id'] == 'a1'])                  # 隔 .1 秒，也算连读
    assert len(g) == 1

def test_missing_lists_unfound_clauses():
    assert missing(apply_ovr(SEL, {}), [{'id': 'a1', 'text': ''}, {'id': 'zz', 'text': '没有'}], set()) == ['a3:0 这一句没念。', 'zz 没有']
    S = apply_ovr(SEL, {'a3:0': [8.0, 8.9]})
    assert not [m for m in missing(S, [], set()) if m.startswith('a3')]

def test_assemble_edge_overrides_cut_points():
    """录音：四段声音；a1 两个小句连读成一段，a2 用 _edge 定死起止；原声句留出时长"""
    rec = np.zeros(int(12 * SR), np.float32)
    for a, d in [(1.0, 1.0), (2.1, 1.4), (5.0, 1.0), (6.2, 1.4)]: rec[int(a * SR):int(a * SR) + int(d * SR)] = tone(500, d)
    beats = [{'id': 'a1', 'text': '今年二月，印度开了个大会。'}, {'id': 'q1', 'text': '原声'}, {'id': 'a2', 'text': '拍合影的时候，总理让人手拉手。'}]
    ovr = {'a2:*': [5.0, 7.6], '_edge': {'a2:0': [4.9, 7.7]}}
    y, spans, LOG = assemble(beats, [{'first': 'a1'}], SEL[:4], ovr, rec, rec * 0, {'q1': 2.0}, {})
    assert [g[0] for g in LOG] == ['a1', 'a2']
    assert LOG[1][1:3] == [4.9, 7.7]                                    # _edge 照用
    assert abs(spans['q1'][1] - spans['q1'][0] - 2.0) < 1e-6            # 原声句留出 2 秒
    assert spans['a1'][0] == 0 and abs(spans['q1'][0] - (spans['a1'][1] + .3 + .15)) < .002   # 句号后停 .3，原声前留 .15
    for i, a, z, o, L in LOG:                                           # 每一段在口播里的位置有声
        seg = y[int(o * SR):int((o + L) * SR)]; assert np.abs(seg).max() > .05

def test_flags_keep_status_across_runs(tmp_path):
    p = tmp_path / 'flags.tsv'; f = Flags(p)
    f.set_kind('repeat', [('wh09', '1.00-2.00/2.10-3.00', '像 .8'), ('wh13', 'k', '像 .6')])
    assert len(f.open()) == 2
    txt = p.read_text(encoding='utf-8').replace('open\trepeat\twh09', 'ok\trepeat\twh09'); p.write_text(txt, encoding='utf-8')
    f = Flags(p); f.set_kind('repeat', [('wh09', '1.00-2.00/2.10-3.00', '像 .8'), ('nx01', 'k', '新的')])
    assert {(r[0], r[2]) for r in f.rows} == {('ok', 'wh09'), ('open', 'nx01')}   # wh13 没再查出来，去掉了
    f.set_kind('take', [('a3', 0, 'missing\t有\n换行')])
    assert len(Flags(p).open()) == 2 and len(Flags(p).open(['take'])) == 1 and '\t' not in Flags(p).rows[-1][4]

def test_stamps_and_sig(tmp_path):
    a = tmp_path / 'a.txt'; a.write_text('1', encoding='utf-8'); s1 = sig(a, {'x': 1})
    st = Stamps(tmp_path / 's.json'); st.put('assemble', s1)
    assert Stamps(tmp_path / 's.json').same('assemble', sig(a, {'x': 1}))
    assert sig(a, {'x': 2}) != s1
