"""qa / mix / pack / publish 的测试用的小片子和小期：全用 ffmpeg lavfi 现做（几秒长、几百像素），不用任何素材文件。"""
import json, shutil, sys
from pathlib import Path
import numpy as np, pytest, soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
    pytest.skip('没有 ffmpeg / ffprobe', allow_module_level=True)

from qa_util import ROOT, ENC, ff, clip, conv, tone, beat, YAML  # noqa: E402,F401


@pytest.fixture
def episode(tmp_path):
    """一个 6 秒、两章、三句（一句原声）的小期：timeline、整条口播和 spans、配乐、音效、编排、cues、无声画面都有。"""
    from chonggu import config
    R = tmp_path / 'ep'; (R / 'voice').mkdir(parents=True); (R / 'music').mkdir(); (R / 'assets').mkdir(); (R / 'out').mkdir()
    (R / 'episode.yaml').write_text(YAML, encoding='utf-8')
    B = [beat('a1', '今天我们说一件事情', .3, 2.5), beat('b1', '这是第二章的第一句话', 3.2, 4.6), beat('b2q', '原声', 4.8, 5.4)]
    B[1]['vstart'] = B[1]['start']; B[1]['start'] = 3.0
    T = {'duration': 6.0, 'beats': B, 'breath': {'b1': .2}, 'voice': 'narration.wav',
         'chapters': [{'name': '开头', 'pre': 'a', 'idx': 0, 't0': 0.0, 't1': 3.0, 'first': 'a1', 'last': 'a1'},
                      {'name': '正文：第二章', 'pre': 'b', 'idx': 1, 't0': 3.0, 't1': 6.0, 'first': 'b1', 'last': 'b2q'}]}
    (R / 'timeline.json').write_text(json.dumps(T, ensure_ascii=False), encoding='utf-8')
    sr = 48000; y = np.zeros(int(6 * sr), np.float32); q = np.zeros_like(y); rng = np.random.default_rng(1)
    for b in B[:2]:
        a, z = int(b.get('vstart', b['start']) * sr), int(b['end'] * sr); y[a:z] = rng.normal(0, .08, z - a) * np.sin(np.linspace(0, 40, z - a)) ** 2
    q[int(4.8 * sr):int(5.4 * sr)] = rng.normal(0, .08, int(.6 * sr))
    sf.write(R / 'voice' / 'narration.wav', y, sr); sf.write(R / 'voice' / 'narration_quotes.wav', q, sr)
    sf.write(R / 'assets' / 'q.wav', q[int(4.8 * sr):int(5.4 * sr)], sr)
    (R / 'voice' / 'narration.spans.json').write_text(json.dumps({b['id']: [b.get('vstart', b['start']), b['end']] for b in B}), encoding='utf-8')
    tone(R / 'music' / 'm.mp3', 220, 8, .2); tone(R / 'assets' / 'sfx_pop.mp3', 1200, .3, .5); tone(R / 'assets' / 'sfx_impact.mp3', 80, 1, .5)
    P = {'sections': [{'file': 'm.mp3', 'from': 'a1-0.3', 'to': 'END', 'under': -18, 'breath': -6, 'fin': .3, 'fout': .5}],
         'drops': [{'from': 'b1.cut', 'to': 'b1+0.1'}], 'hits': [{'at': 'b1:第二', 'sfx': 'stamp', 'db': -14}], 'sfx_keep': ['pop'], 'sfx_db': -5}
    (R / 'music' / 'plan.json').write_text(json.dumps(P, ensure_ascii=False), encoding='utf-8')
    (R / 'out' / 'cues.json').write_text(json.dumps({'scenes': [0, 3.0], 'sfx': [[1.0, 'pop', -18], [2.0, 'click', -18]], 'aud': []}), encoding='utf-8')
    (R / 'CREDITS_第99期.md').write_text('| m.mp3 | 测试曲 | CC0 |\n| sfx_pop | x | CC0 |\n| sfx_impact | x | CC0 |\n| q.wav | 原声 | 采访 |\n', encoding='utf-8')
    ep = config.load(R, quiet=True)
    from chonggu.qa import common as C
    clip(C.noaudio(ep, '1080'), 'testsrc2=s=320x180:r=30:d=6')
    return ep


@pytest.fixture
def no_node(monkeypatch):
    """mix 前导 cues 要起浏览器：测试里让它失败，用 out/cues.json"""
    from chonggu.gates import GateFailed
    from chonggu.render import run as R

    def nope(*a, **k):
        raise GateFailed('测试里不起浏览器')
    for n in ('cues', 'export_cues'):
        if hasattr(R, n):
            monkeypatch.setattr(R, n, nope)
