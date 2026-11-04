"""第 8 期回归（只在有第 8 期工程的电脑上跑）：环境变量 CHONGGU_EP8 指向第 8 期的成片工程文件夹（film_v9）。
只读那边的文件：在临时文件夹里搭一个「第 8 期」，用软链接指过去，输出都写在临时文件夹里。
- 检查算出来的数和第 9 节记的 v18 一致：响度 −15.1 / 4.4 / −1.0、失真 30.3 / 26.4 dB、字速 316、最长气口间隔 39.4 秒、音效 102 个。
- 用工具包重混 v18（同一份口播、编排、cues）：和 v18 成片的声音逐段比，相关 ≥0.995、电平差 <0.1 dB。"""
import json, os, subprocess
from pathlib import Path
import numpy as np, pytest
from chonggu.qa import common as C, checks as K

EP8 = os.environ.get('CHONGGU_EP8')
pytestmark = pytest.mark.skipif(not EP8 or not (Path(EP8 or '.') / 'timeline.json').exists(), reason='没设 CHONGGU_EP8（第 8 期工程只在本机有）')
FILM = '重估_第8期_Anthropic招股书_v18_1080p.mp4'
YAML = """number: 8
slug: ep8
title: Anthropic招股书
version: v18
host: 主讲
quotes: {e0: {file: x.wav}, rv00: {file: x.wav}, oa23q: {file: x.wav}, ob14q: {file: x.wav}, nx15: {file: x.wav}, wh10q: {file: x.wav}, wh11q: {file: x.wav}}
"""


@pytest.fixture
def ep8(tmp_path):
    from chonggu import config
    F, R = Path(EP8), tmp_path / 'ep8'
    for d in ('out', 'voice/clone', 'music'):
        (R / d).mkdir(parents=True)
    (R / 'episode.yaml').write_text(YAML, encoding='utf-8')
    for src, dst in (('timeline.json', 'timeline.json'), ('voice/clone/v18_owner.wav', 'voice/clone/v18_owner.wav'),
                     ('voice/clone/v18_owner.spans.json', 'voice/clone/v18_owner.spans.json'),
                     ('cues.json', 'out/cues.json'), ('audio_lib', 'assets'), ('raw', 'raw'), ('out/v18_noaudio.mp4', 'out/v18_noaudio.mp4')):
        (R / dst).symlink_to(F / src)
    # 编排照抄 v17；默认音效表里没有的类，用第 8 期自己 assets/ 里同名的文件（这一期自己的 sfx_map）
    from chonggu.mix.plan import MAP
    P = json.loads((F / 'music_plan_v17.json').read_text(encoding='utf-8'))
    kinds = set(P.get('sfx_keep', [])) | {h['sfx'] for h in P.get('hits', [])}
    P['sfx_map'] = {k: f'{k}.mp3' for k in sorted(kinds - set(MAP)) if (F / 'audio_lib' / f'{k}.mp3').exists()}
    (R / 'music' / 'plan.json').write_text(json.dumps(P, ensure_ascii=False), encoding='utf-8')
    return config.load(R, quiet=True)


def test_numbers_match_v18(ep8):
    from chonggu.mix.plan import load_plan, sfx_events, anchors
    T, P = C.timeline(ep8), load_plan(ep8); film = Path(EP8) / 'out' / FILM; wav = C.voice_wav(ep8, T)
    assert K.loudness(film) == (-15.1, 4.4, -1.0)
    assert K.check_distortion(film, C.duration(film)).text.startswith('2:00.00 起 60 秒：30.3 dB；10:00.00 起 60 秒：26.4 dB')
    assert '316 汉字/分' in K.check_rate(ep8, T, wav).text
    assert '最长间隔 39.4 秒' in K.check_breath(wav).text
    assert K.check_plan(ep8, T, P).status == K.OK
    Q = json.loads(Path(ep8.out('cues.json')).read_text(encoding='utf-8'))
    assert (len(sfx_events(P, Q, anchors(T))), len(Q['sfx'])) == (102, 194)


def test_mix_reproduces_v18(ep8, no_node):
    from chonggu.mix import plan
    out, _ = plan.mix(ep8)
    dec = lambda p: np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'],
                                                 capture_output=True).stdout, np.float32)
    a, b = dec(Path(EP8) / 'out' / FILM), dec(out)
    for s in (10, 120, 330, 480, 600, 900):
        x, y = a[s * 48000:(s + 20) * 48000], b[s * 48000:(s + 20) * 48000]
        assert np.corrcoef(x, y)[0, 1] >= .995
        assert abs(20 * np.log10(np.sqrt((y ** 2).mean()) / np.sqrt((x ** 2).mean()))) < .1
