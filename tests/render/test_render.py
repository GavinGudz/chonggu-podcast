"""渲染模块（chonggu.render）的测试：用 tests/render/fixture（一章、两句话、没有任何素材）。

  python -m pytest tests/render            （没装 pytest 也行：python tests/render/test_render.py）
  CHONGGU_TEST_VIDEO=1 再加一项：真的渲一段 540p 视频，走完一章一章渲 → 查日志 → 查长度 → 接起来（约 1 分钟）

要先装好 node（≥ 20）、ffmpeg；第一次会 npm ci（下载 Chrome for Testing）、下载字体（约 45 MB）、生成皮肤贴图。
"""
import os
import shutil
import sys
import tempfile
from argparse import Namespace
from pathlib import Path

KIT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(KIT))

from chonggu import config                      # noqa: E402
from chonggu.gates import GateFailed            # noqa: E402
from chonggu.render import run as R             # noqa: E402

FIX = Path(__file__).resolve().parent / 'fixture'


def episode(root=FIX):
    return config.load(root, quiet=True)


def copy_fixture(tmp) -> Path:
    d = Path(tmp) / 'fixture'
    shutil.copytree(FIX, d, ignore=shutil.ignore_patterns('out'))
    return d


def raises(fn, *a, has=''):
    try:
        fn(*a)
    except GateFailed as e:
        assert has in str(e), f'GateFailed 了，但没提到「{has}」：{e}'
        return str(e)
    raise AssertionError(f'{fn.__name__} 应该 GateFailed')


def test_index():
    ep = episode()
    html = R.write_index(ep).read_text(encoding='utf-8')
    assert '<script src="ch/demo.js"></script>' in html and 'window.EP = {' in html and '{{' not in html
    cfg = R.stage_config(ep)
    assert [c['pre'] for c in cfg['chapters']] == ['dm'] and cfg['branches'] == {'money': '钱'}
    assert cfg['tree_keep'] is None and cfg['counts'] == [] and cfg['title_card']['text'] == '只是测试？'


def test_names():
    ep = episode()
    assert R.parts_dir(ep, '1080').name == 'parts' and R.parts_dir(ep, '2k').name == 'parts2k' and R.parts_dir(ep, 540).name == 'parts_540p'
    assert R.noaudio_path(ep, '1080').name == 'v1_noaudio.mp4' and R.noaudio_path(ep, '2k').name == 'v1_2k_noaudio.mp4'
    assert R.final_path(ep, '2k').name.endswith('_v1_2K.mp4')


def test_code_gate():
    fs = R.code_gate(episode())
    names = {f.name for f in fs}
    assert {'render.mjs', 'film.js', 'lin16.js', 'kit8.js', 'treeskin.js', 'calm.js', 'demo.js', 'lin16_props.js'} <= names


def test_code_gate_bad():
    with tempfile.TemporaryDirectory() as tmp:
        root = copy_fixture(tmp)
        f = root / 'ch' / 'demo.js'
        f.write_text(f.read_text(encoding='utf-8').replace('K.seq(X.t0, X.t1, [', 'K.seq(X.t0, X.t1, [[', 1), encoding='utf-8')
        raises(R.code_gate, episode(root), has='demo.js')


def test_refs():
    r = R.refs_gate(episode())
    assert r == {'bad': {}, 'missing': []}


def test_refs_bad():
    with tempfile.TemporaryDirectory() as tmp:
        root = copy_fixture(tmp)
        f = root / 'ch' / 'demo.js'
        s = f.read_text(encoding='utf-8').replace("cue('d2', '名')", "cue('d2', '不存在的字')").replace("c('d2')", "c('zz9')")
        f.write_text(s, encoding='utf-8')
        msg = raises(R.refs_gate, episode(root), has='不存在的字')
        assert "c('zz9')" in msg
        f.write_text(s.replace("name: '演示'", "name: '别的章'"), encoding='utf-8')
        raises(R.refs_gate, episode(root), has='还没有画面代码')


def test_log_problems():
    log = '120/180 frames\n[page:error] 镜头之间有空档：1.00–2.00\n[http 404] /assets/x.png\n[pageerror] boom\nvideo -> a.mp4 (180 frames, 9 s)\n'
    assert len(R.log_problems(log)) == 3 and not R.log_problems('120/180 frames\nvideo -> a.mp4')


def test_stills():
    ep = episode()
    out = ep.out('stills_test')
    shots = R.run_stills(ep, Namespace(times=['1.5', '2.7', '4.4', '5.6'], h=540, out=str(out)))
    assert len(shots) == 4
    for p in shots:
        assert p.exists() and p.stat().st_size > 8000, p   # 一张纯黑的 540p jpg 只有几 KB


def test_cues():
    q = R.cues(episode())
    assert len(q['scenes']) == 3 and [s[1] for s in q['sfx']] == ['pop', 'swish'] and q['src'][0][2] == '测试数据 · 第 1 页'


def test_video():
    if os.environ.get('CHONGGU_TEST_VIDEO') != '1':
        print('  （跳过：CHONGGU_TEST_VIDEO=1 才渲视频）')
        return
    ep = episode()
    r = R.run_render(ep, Namespace(res='540', workers=2))
    assert r['noaudio'] and abs(R.duration(r['noaudio']) - 6.0) < .1 and r['final'] is None
    assert (R.parts_dir(ep, 540) / 'log_00_dm_540p.txt').exists()


if __name__ == '__main__':
    bad = 0
    for k, f in list(globals().items()):
        if k.startswith('test_') and callable(f):
            try:
                f(); print('✓', k)
            except Exception as e:   # noqa: BLE001
                bad += 1; print('✗', k, type(e).__name__, e)
    sys.exit(1 if bad else 0)
