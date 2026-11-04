"""第 8 期回归（只在有第 8 期原始文件的机器上跑）：环境变量 CHONGGU_EP8 指到第 8 期的 film_v9 文件夹。
- 默认只跑不用听写的几步（几十秒）：挑段、拼原始口播、定静音、换成静音、人声链、逐句提速、拼整条，和 v18 的中间文件逐个比。
- CHONGGU_EP8_FULL=1 再跑整条 voice + timeline（要听写模型，几十分钟），和 v18 的口播、timeline.json 比。"""
import json, os, shutil
from pathlib import Path
import numpy as np
import pytest
from voice_fakes import FakeEp

EP8 = Path(os.environ['CHONGGU_EP8']) if os.environ.get('CHONGGU_EP8') else None
pytestmark = pytest.mark.skipif(not (EP8 and (EP8 / 'voice' / 'rec16_se.wav').exists()), reason='没有第 8 期的原始文件（CHONGGU_EP8）')
V = EP8 / 'voice' if EP8 else None
REVIEW = Path(__file__).parent / 'fixtures' / 'ep8_seams_review.json'
QDUR = {'e0': 3.2, 'rv00': 3.6, 'oa23q': 4.2, 'ob14q': 4.1, 'nx15': 2.8, 'wh10q': 5.6, 'wh11q': 4.8}   # 拼原始口播时给原声留的时长
QFILE = {'e0': 'raw/a/aud_sam.wav', 'rv00': 'raw/rv/aud_wsj2.wav', 'wh10q': 'raw/wh/aud_dario.wav', 'wh11q': 'raw/wh/aud_michael2.wav',
         'oa23q': 'raw/oa/aud_roose.wav', 'ob14q': 'raw/ob/aud_tim.wav', 'nx15': 'raw/nx/aud_god_b.wav'}

def J(p): return json.loads(Path(p).read_text(encoding='utf-8'))

@pytest.fixture(scope='module')
def rec():
    from chonggu.voice.common import read_wav
    se, hp = read_wav(V / 'rec16_se.wav'), read_wav(V / 'rec16_hp.wav'); return se, hp, se + .1 * hp[:len(se)]

def same(a, b): return len(a) == len(b) and float(np.abs(a - b).max()) == 0.

def test_select_matches_sel16():
    pytest.importorskip('pypinyin')
    from chonggu.voice.select_takes import select
    sel, _ = select(J(EP8 / 'tools/timeline_before_v18.json')['beats'], set(QDUR), J(V / 'asr16.json'))   # 挑段那时候的稿子
    assert json.loads(json.dumps(sel, ensure_ascii=False)) == J(V / 'sel16.json')

def test_assemble_matches_narr_raw16(rec):
    from chonggu.voice.common import read_wav, gaps_of
    from chonggu.voice.assemble import assemble
    T = J(EP8 / 'timeline.json'); se, hp, _ = rec
    y, spans, LOG = assemble(T['beats'], T['chapters'], J(V / 'sel16.json'), J(V / 'ovr16.json'), se, hp, QDUR, gaps_of(T))
    assert same(y, read_wav(V / 'narr_raw16.wav')) and LOG == J(V / 'narr_groups16.json') and {k: list(v) for k, v in spans.items()} == J(V / 'narr_spans16.json')

def test_decide_matches_seams16():
    pytest.importorskip('pypinyin')
    from chonggu.voice.common import read_wav
    from chonggu.voice.seams import decide
    from chonggu.voice.select_takes import tok_for
    T = J(EP8 / 'timeline.json')
    out = decide(J(V / 'local16.json'), J(EP8 / 'tools/narr_groups16_before_audit.json'), read_wav(V / 'rec16_se.wav'), J(REVIEW), {b['id']: b['text'] for b in T['beats']}, tok_for(T['beats']))
    A = {tuple(x[:3]): x for x in out}; B = {tuple(x[:3]): x for x in J(V / 'seams16.json')}
    assert {k for k in set(A) | set(B) if A.get(k) != B.get(k)} <= {('ob03', 0, '头')}   # ob03：查过以后那一段又改了

def test_apply_and_neighbours(rec):
    from chonggu.voice.common import read_wav
    from chonggu.voice.seams import apply
    from chonggu.voice.checks import neighbours
    S, G = J(V / 'seams16.json'), J(V / 'narr_groups16.json')
    y2, _ = apply(read_wav(V / 'narr16_c_base.wav'), S, G, rec[2])
    assert same(y2, read_wav(V / 'narr16_c.wav'))
    assert neighbours(S, G, J(EP8 / 'timeline.json')['beats'], set(QDUR)) == []

@pytest.mark.skipif(not shutil.which('ffmpeg'), reason='要 ffmpeg')
def test_chain_matches(tmp_path):
    import soundfile as sf
    from chonggu.voice.chain import chain
    chain(V / 'narr_raw16.wav', tmp_path / 'c.wav')
    assert same(sf.read(str(tmp_path / 'c.wav'), dtype='float32')[0], sf.read(str(V / 'narr16_c_base.wav'), dtype='float32')[0])

def test_lines_and_narration(tmp_path):
    from chonggu.voice.common import read_wav, gaps_of
    from chonggu.voice.lines import cut_lines
    from chonggu.voice.narration import narrate
    T = J(EP8 / 'timeline.json'); TX = {b['id']: b['text'] for b in T['beats']}; SP = J(V / 'narr_spans16.json')
    pick, _, _ = cut_lines(read_wav(V / 'narr16_c.wav'), {k: SP[k] for k in ('a1', 'rv05', 'nx04')}, TX, set(QDUR), tmp_path, fixed=1.2)
    for i in pick:   # 变速的实现（rubberband / audiotsm）不同，长度差不到 1%
        a, b = read_wav(tmp_path / pick[i]), read_wav(V / 'owner16' / f'{i}.wav'); assert abs(len(a) - len(b)) < .01 * len(b)
    v, q, spans = narrate(T['beats'], T['chapters'], V / 'owner16', J(V / 'owner16/pick.json'), {i: {'file': EP8 / f} for i, f in QFILE.items()},
                          J(V / 'breath_v17.json'), gaps_of(J(EP8 / 'timeline_est_v10.json')))
    assert same(v, read_wav(V / 'clone/v18_owner.wav')) and {k: list(x) for k, x in spans.items()} == J(V / 'clone/v18_owner.spans.json')

def ep8(root):
    """第 8 期回归用的一期：中间结果指回第 8 期的文件（不改它们），输出都在 root 里"""
    root.mkdir(exist_ok=True); shutil.copyfile(EP8 / 'timeline.json', root / 'timeline.json')
    raw = {'voice': {'tempo': 1.2, 'ovr': str(V / 'ovr16.json'), 'timeline_est': str(EP8 / 'timeline_est_v10.json'), 'raw_gaps': str(EP8 / 'timeline.json'),
                     'review': str(REVIEW), 'inputs': {k: str(V / f) for k, f in [('se', 'rec16_se.wav'), ('hp', 'rec16_hp.wav'), ('asr', 'asr16.json'), ('sel', 'sel16.json'), ('seams', 'seams16.json')]}}}
    return FakeEp(root, raw=raw, quotes={i: {'file': str(EP8 / f), 'dur': QDUR[i]} for i, f in QFILE.items()}, breath=J(V / 'breath_v17.json'), slug='ep8-regress')

def test_rebuild_without_asr(tmp_path, monkeypatch):
    """整条 voice 走一遍（听写换成什么都听不见的假的：查重念、静音前后比都是空的），每个中间文件和 v18 逐个采样比（约 40 秒）"""
    import sys, types
    from chonggu.voice.common import read_wav
    from chonggu.voice.pipeline import run_voice
    m = types.ModuleType('chonggu.voice.asr'); m.transcribe = lambda audio, sr=16000, language='zh', prompt=None, word_timestamps=True, **kw: {'text': '', 'segments': []}
    monkeypatch.setitem(sys.modules, 'chonggu.voice.asr', m)
    from chonggu import paths
    monkeypatch.setattr(paths, 'cache_dir', lambda: tmp_path / 'cache')
    ep = ep8(tmp_path / 'ep8'); run_voice(ep, None, gates=False)
    for a, b in [('narr_raw.wav', 'narr_raw16.wav'), ('narr_c_base.wav', 'narr16_c_base.wav'), ('narr_c.wav', 'narr16_c.wav'), ('narration.wav', 'clone/v18_owner.wav')]:
        assert same(read_wav(ep.voice(a)), read_wav(V / b)), a
    assert J(ep.voice('narration.spans.json')) == J(V / 'clone/v18_owner.spans.json')

@pytest.mark.skipif(os.environ.get('CHONGGU_EP8_FULL') != '1', reason='整条重做要听写模型：CHONGGU_EP8_FULL=1')
def test_full_rebuild(tmp_path):
    from chonggu.voice.common import read_wav
    from chonggu.voice.pipeline import run_voice, run_timeline
    from chonggu.voice.checks import diff_timelines
    ep = ep8(tmp_path / 'ep8'); root = ep.root
    wav = run_voice(ep, None, gates=False)
    ref = read_wav(V / 'clone/v18_owner.wav'); v = read_wav(wav)
    assert abs(len(v) - len(ref)) < .002 * len(ref)
    run_timeline(ep, None)
    d = diff_timelines(J(EP8 / 'timeline.json'), J(root / 'timeline.json')); print(d)
    assert not d['missing'] and not d['extra'] and d['start'] < .05 and d['end'] < .05 and d['chapters'] < .05
