"""第 9 节那些写成断言的检查：响度、失真、字速、气口、配乐编排、音效连用、手机版大小、出处、音轨哈希、时长。"""
import json
from pathlib import Path
import numpy as np, soundfile as sf
from qa_util import clip, ff, tone
from chonggu.qa import common as C, checks as K


def test_loudness_parse_and_gate(tmp_path):
    q = tone(tmp_path / 'quiet.wav', 1000, 5, .01)
    I, LRA, pk = K.loudness(q)
    assert -80 < I < -30 and -80 < pk < -20 and LRA >= 0
    r = K.check_loudness(q)
    assert r.status == K.FAIL and 'I 要在' in r.text


def test_distortion_flat_fails(tmp_path):
    # 一个不变的音 = 被压扁的声音：最响和最静差不到 15 dB
    p = tone(tmp_path / 'flat.wav', 500, 20, .3)
    assert K.check_distortion(p, 20).status == K.FAIL


def test_distortion_dynamic_passes(tmp_path):
    sr = 48000; t = np.arange(20 * sr) / sr; y = (.3 * np.sin(2 * np.pi * 300 * t) * (np.sin(2 * np.pi * .5 * t) > 0) + 1e-4 * np.random.default_rng(0).normal(size=len(t)))
    sf.write(tmp_path / 'dyn.wav', y.astype(np.float32), sr)
    assert K.check_distortion(tmp_path / 'dyn.wav', 20).status == K.OK


def gappy(p, talk, gap=1.5, sr=16000):   # talk：每段说多久（秒），中间空 gap 秒
    rng = np.random.default_rng(0); y = []
    for d in talk:
        y += [rng.normal(0, .1, int(d * sr)), np.zeros(int(gap * sr))]
    sf.write(p, np.concatenate(y).astype(np.float32), sr); return p


def test_breath_gaps(tmp_path):
    assert K.check_breath(gappy(tmp_path / 'ok.wav', [30, 20, 35])).status == K.OK
    r = K.check_breath(gappy(tmp_path / 'long.wav', [10, 45, 5]))
    assert r.status == K.FAIL and '45' in r.text


def test_speech_rate(episode):
    T = C.timeline(episode); wav = C.voice_wav(episode, T)
    # a1 9 个字 2.2 秒、b1 10 个字 1.4 秒（原声 b2q 不算）：19 字 / 3.6 秒 ≈ 317 字/分
    r = K.check_rate(episode, T, wav)
    assert r.status == K.OK and '317' in r.text
    S = json.loads(C.spans_of(wav).read_text(encoding='utf-8')); S['a1'] = [.3, 1.0]; C.spans_of(wav).write_text(json.dumps(S), encoding='utf-8')
    assert K.check_rate(episode, T, wav).status == K.FAIL


def test_plan_problems(episode):
    from chonggu.mix.plan import load_plan
    T = C.timeline(episode); P = load_plan(episode)
    assert K.check_plan(episode, T, P).status == K.OK
    P['sections'][0]['under'] = -25
    assert K.check_plan(episode, T, P).status == K.FAIL
    # 章名卡 / 新闻插段（这里把 b1 开口前那段登记成插段）：breath 要 ≤ −7、fin ≥ 1.0
    P = load_plan(episode); P['sections'] = [{'file': 'm.mp3', 'from': 'a1', 'to': 'b1.cut', 'under': -18, 'breath': -6},
                                             {'file': 'm.mp3', 'from': 'b1.cut', 'to': 'b1', 'under': -18, 'breath': -5, 'fin': .5}]
    episode['interludes'] = ['b1']
    r = K.check_plan(episode, T, P)
    assert r.status == K.FAIL and len(r.lines) == 1 and '第 2 段' in r.lines[0]


def test_bad_anchor_is_a_gate(episode):
    from chonggu.mix.plan import load_plan
    from chonggu.gates import GateFailed
    import pytest
    P = load_plan(episode); P['sections'][0]['from'] = 'zz9'
    with pytest.raises(GateFailed, match='zz9'):
        K.check_plan(episode, C.timeline(episode), P)
    P['sections'][0]['from'] = 'a1:没有这几个字'
    with pytest.raises(GateFailed, match='没有这几个字'):
        K.check_plan(episode, C.timeline(episode), P)


def test_sfx_repeat_warns(episode):
    from chonggu.mix.plan import load_plan
    P = load_plan(episode); T = C.timeline(episode)
    Q = {'sfx': [[1, 'pop', -18], [1.5, 'pop', -18], [2, 'pop', -18]], 'aud': []}
    r = K.check_sfx_repeat(P, Q, T)
    assert r.status == K.WARN and '连着 3 个 pop' in r.lines[0]


def test_phone_size(episode):
    small = Path(episode.out('第99期v1_手机_1of1_全部.mp4')); small.write_bytes(b'x' * 1000)
    assert K.check_phone(episode).status == K.OK
    big = Path(episode.out('编辑包_v1', '画面加配乐_没有你的口播_v1_手机版.mp4'))
    with open(big, 'wb') as f:
        f.truncate(int(29.6 * C.MiB))   # 稀疏文件，不真占地方
    r = K.check_phone(episode)
    assert r.status == K.FAIL and big.name in r.lines[0]


def test_credits(episode):
    from chonggu.mix.plan import load_plan
    P = load_plan(episode); Q = json.loads(Path(episode.out('cues.json')).read_text(encoding='utf-8'))
    assert K.check_credits(episode, P, Q).status == K.OK
    (episode.root / 'assets' / 'clips').mkdir(); (episode.root / 'assets' / 'clips' / 'noodle_shop').mkdir()
    P['sections'].append({'file': 'cand/new_song.mp3', 'from': 'a1', 'to': 'END'})
    r = K.check_credits(episode, P, Q)
    assert r.status == K.FAIL and sorted(r.lines) == ['没记：cand/new_song.mp3', '没记：noodle_shop']


def test_audio_hash(tmp_path):
    a = tone(tmp_path / 'a.wav', 300, 2); b = tone(tmp_path / 'b.wav', 600, 2)
    v1 = clip(tmp_path / 'v1.mp4', 'color=c=gray:s=320x180:r=30:d=2'); v2 = clip(tmp_path / 'v2.mp4', 'color=c=gray:s=640x360:r=30:d=2')
    ff('-i', v1, '-i', a, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', tmp_path / 'hd.mp4')
    ff('-i', v2, '-i', tmp_path / 'hd.mp4', '-map', '0:v', '-map', '1:a', '-c', 'copy', tmp_path / 'k2.mp4')
    ff('-i', v2, '-i', b, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', tmp_path / 'k2_bad.mp4')
    assert K.check_hash(tmp_path / 'hd.mp4', tmp_path / 'k2.mp4').status == K.OK
    assert K.check_hash(tmp_path / 'hd.mp4', tmp_path / 'k2_bad.mp4').status == K.FAIL


def test_duration_and_parts(episode):
    T = C.timeline(episode)
    assert K.check_duration(C.noaudio(episode), T).status == K.OK
    d = C.parts_dir(episode, '1080'); d.mkdir(parents=True, exist_ok=True)
    clip(d / '00_a.mp4', 'color=c=gray:s=320x180:r=30:d=3'); clip(d / '01_b.mp4', 'color=c=gray:s=320x180:r=30:d=2.5')
    r = K.check_parts(episode, T, '1080')
    assert r.status == K.FAIL and r.lines == ['01_b.mp4 差 -0.50 秒']


def test_render_logs(episode):
    T = C.timeline(episode); d = C.parts_dir(episode, '1080'); d.mkdir(parents=True, exist_ok=True)
    (d / 'log_00_a_1080p.txt').write_text('[http 404] favicon.ico\nvideo -> 00_a.mp4\n', encoding='utf-8')   # 无害的噪音
    assert K.check_logs(episode, T).status == K.OK
    (d / 'log_01_b_1080p.txt').write_text('[pageerror] ReferenceError: x is not defined\n', encoding='utf-8')
    r = K.check_logs(episode, T)
    assert r.status == K.FAIL and 'pageerror' in r.lines[0]
    import os, time
    new = d / 'log_01_b_1080p_retry.txt'; new.write_text('video -> 01_b.mp4\n', encoding='utf-8'); os.utime(new, (time.time() + 5,) * 2)
    assert K.check_logs(episode, T).status == K.OK   # 重渲过：只看这一章最新的那份


def test_allowlist(episode):
    T = C.timeline(episode); episode['qa'] = {'allow': [{'from': '0:01', 'to': '0:02', 'why': '故意的快剪'}, 'b', {'at': 2.6, 'why': '看过了'}]}
    allow = K.allowed(episode, T)
    r = K.check_events('flash', '闪帧', T, [(1.5,), (2.5,), (2.9,), (4.0,)], allow, lambda e: '单帧闪')
    assert r.status == K.FAIL and len(r.lines) == 1 and r.lines[0].startswith('0:02.90') and '另有 3 处' in r.text
