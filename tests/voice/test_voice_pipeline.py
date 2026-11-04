"""整条口播流水线从头跑到尾（合成录音 + 假听写 + 假变速；人声链要 ffmpeg）：
挑最后一遍 → 拼 → 查重念的门槛挡住 → 在 ovr.json 里改 → 重跑过门槛 → 整条口播 → 时间线（呼吸点）→ 整句核对。"""
import json, shutil
from types import SimpleNamespace
import numpy as np
import pytest
import soundfile as sf
from voice_fakes import FakeEp, Code, tone, SR

pytest.importorskip('pypinyin')
pytestmark = pytest.mark.skipif(not shutil.which('ffmpeg'), reason='人声链要 ffmpeg')

LINES = [('a1', '今年二月，印度开了个大会。'), ('a2', '拍合影的时候，总理让台上的人手拉手。'), ('q1', '原声的翻译。'),
         ('b1', '这家公司最爱讲的词就是安全。'), ('b2', '开了个新公司。')]

def build(root, code):
    """录音：a2 先念了半句又从头念；b2 念了「开了个」停一下又重念（同一遍里，挑段挑不掉）"""
    parts, t, at = [np.zeros(int(.5 * SR), np.float32)], .5, {}
    def say(text, pause):
        nonlocal t
        x, m = code.say(text); at.setdefault(text, []).append((t + m[0][1], t + m[-1][2])); parts.append(x); t += len(x) / SR
        parts.append(np.zeros(int(pause * SR), np.float32)); t += pause
    say('今年二月，', .3); say('印度开了个大会。', .8)
    say('拍合影的', 1.0); say('拍合影的时候，', .3); say('总理让台上的人手拉手。', .8)
    say('这家公司最爱讲的词就是安全。', .8)
    say('开了个', .3); say('开了个新公司。', 1.0)
    (root / 'assets').mkdir(parents=True); sf.write(str(root / 'assets' / 'rec.wav'), np.concatenate(parts), SR, subtype='FLOAT')
    sf.write(str(root / 'assets' / 'q1.wav'), tone(1500, 2.0), SR, subtype='FLOAT')
    beats = [{'id': i, 'text': s, 'start': k * 3.0, 'end': k * 3.0 + 2.6, 'chars': [[c, k * 3.0 + j * .1] for j, c in enumerate(s)]} for k, (i, s) in enumerate(LINES)]
    T = {'duration': 15.0, 'beats': beats, 'estimated': True, 'music_off': [], 'stops': [], 'inserts': [],
         'chapters': [{'name': '开头', 'pre': 'a', 'idx': 0, 't0': 0, 't1': 9.0, 'first': 'a1', 'last': 'q1'},
                      {'name': '第二章', 'pre': 'b', 'idx': 1, 't0': 9.0, 't1': 15.0, 'first': 'b1', 'last': 'b2'}]}
    (root / 'timeline.json').write_text(json.dumps(T, ensure_ascii=False), encoding='utf-8')
    return at

def test_voice_pipeline_end_to_end(tmp_path, fake_engines):
    from chonggu.gates import GateFailed
    from chonggu.voice.pipeline import run_voice, run_timeline, run_check_voice
    code = Code(''.join(s for _, s in LINES)); fake_engines(code)
    root = tmp_path / 'ep'; at = build(root, code)
    ep = FakeEp(root, raw={'voice': {'recording': 'assets/rec.wav', 'denoise': False, 'tempo': 1.1}},
                quotes={'q1': {'file': 'assets/q1.wav', 'speaker': '某人'}}, breath={'b1': 1.0})
    args = SimpleNamespace(force=False, from_stage=None, no_denoise=False)

    with pytest.raises(GateFailed, match='重念'):          # b2 同一遍里重念：拆段查重挡住
        run_voice(ep, args)
    sel = json.loads(ep.voice('sel.json').read_text(encoding='utf-8'))
    a2 = [x for x in sel if x['id'] == 'a2']
    assert all(x['why'] == 'last' for x in sel) and a2[0]['pick'][2] >= at['拍合影的时候，'][0][0] - .05   # a2 取的是后面完整那遍
    flags = ep.voice('flags.tsv').read_text(encoding='utf-8')
    assert '\trepeat\tb2\t' in flags and 'open\trepeat' in flags

    a, z = at['开了个新公司。'][0]                            # 人听过：只用后面完整的那遍
    ep.voice('ovr.json').write_text(json.dumps({'b2:*': [a, z]}), encoding='utf-8')
    wav = run_voice(ep, args)
    assert 'repeat' not in ep.voice('flags.tsv').read_text(encoding='utf-8').split('kind\tid')[1]
    v, sr = sf.read(str(wav), dtype='float32'); spans = json.loads(ep.voice('narration.spans.json').read_text(encoding='utf-8'))
    assert sr == SR and set(spans) == {i for i, _ in LINES}
    assert abs(spans['q1'][1] - spans['q1'][0] - 2.0) < .002                          # 原声照原长放
    assert (spans['b1'][0] - spans['q1'][1]) > .25 + .9 + 1.0 - .01                   # 原声后 .25 + 换章 .9 + 呼吸点 1.0
    q, _ = sf.read(str(ep.voice('narration_quotes.wav')), dtype='float32')
    assert np.abs(v[int(spans['q1'][0] * SR):int(spans['q1'][1] * SR)]).max() < 1e-6 and np.abs(q).max() > .05   # 原声在另一条轨上

    stamps = json.loads(ep.voice('.stamps.json').read_text(encoding='utf-8'))
    run_voice(ep, args)                                      # 什么都没改：每一步都跳过
    assert json.loads(ep.voice('.stamps.json').read_text(encoding='utf-8')) == stamps

    run_timeline(ep, None)
    T = json.loads((root / 'timeline.json').read_text(encoding='utf-8'))
    assert not T['estimated'] and T['voice'] == 'narration.wav' and (root / 'timeline_est.json').exists()
    B = {b['id']: b for b in T['beats']}
    assert B['b1']['vstart'] == spans['b1'][0] and B['b1']['start'] < B['b1']['vstart']   # 呼吸点：镜头先切进来
    for b in T['beats']:
        ts = [t for _, t in b['chars']]
        assert ts == sorted(ts) and b['start'] - 1e-6 <= ts[0] and ts[-1] <= b['end'] + 1e-6
    assert T['chapters'][1]['t0'] == round(B['q1']['end'] + .02, 3) and T['duration'] == round(B['b2']['end'] + 1.5, 3)

    run_check_voice(ep, SimpleNamespace(only=None, voice=None))   # 假听写认得出每个字：整句核对没有要听的
    chk = json.loads(ep.voice('check.json').read_text(encoding='utf-8'))
    assert set(chk) == {'a1', 'a2', 'b1', 'b2'} and all(r['miss'] == 0 and r['extra'] == 0 for r in chk.values())
