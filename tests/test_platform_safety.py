"""跨平台、授权的几道小保险：本机设置 chonggu.local.yaml、Windows 不能用的文件名、Pixabay 不用程序下载、
默认音效表外的音效类要写 sfx_map、Excel 存成 GBK 的 flags.tsv、换文件（paths.replace）。不联网、不用 ffmpeg。"""
import json, os, sys
from pathlib import Path
import pytest

KIT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KIT))
from chonggu import assets, config, paths   # noqa: E402
from chonggu.gates import GateFailed        # noqa: E402


def test_local_settings(tmp_path, monkeypatch):
    p = tmp_path / 'chonggu.local.yaml'
    p.write_text('\ufeff# 注释\nCHONGGU_T_CHROME: C:\\Program Files\\Google\\chrome.exe\nCHONGGU_T_Q: "a # b"\nCHONGGU_T_C: x  # 注释\n'
                 'CHONGGU_T_SET: 新的\n  缩进: 不认\n', encoding='utf-8')
    monkeypatch.setenv('CHONGGU_T_SET', '旧的')
    for k in ('CHONGGU_T_CHROME', 'CHONGGU_T_Q', 'CHONGGU_T_C'): monkeypatch.delenv(k, raising=False)
    got = paths.load_local(p)
    assert os.environ['CHONGGU_T_CHROME'] == 'C:\\Program Files\\Google\\chrome.exe'   # 反斜杠原样
    assert (os.environ['CHONGGU_T_Q'], os.environ['CHONGGU_T_C']) == ('a # b', 'x')
    assert os.environ['CHONGGU_T_SET'] == '旧的'   # 已经设了的不盖
    assert set(got) == {'CHONGGU_T_CHROME', 'CHONGGU_T_Q', 'CHONGGU_T_C', 'CHONGGU_T_SET'}
    for k in got: monkeypatch.delenv(k, raising=False)


@pytest.mark.parametrize('name,bad', [('ep9', False), ('英伟达财报', False), ('con', True), ('AUX.mp4', True), ('com3', True),
                                      ('v1.', True), ('a ', True), ('a:b', True), ('console', False)])
def test_windows_names(name, bad):
    assert bool(config.bad_win_name(name)) == bad


def test_yaml_backslash_hint(tmp_path):
    p = tmp_path / 'episode.yaml'; p.write_text('voice: {recording: "C:\\Users\\张三\\rec.m4a"}\n', encoding='utf-8')
    with pytest.raises(GateFailed, match='C:/Users'):
        config.read_yaml(p)


def test_pixabay_is_manual(tmp_path, monkeypatch):
    monkeypatch.setenv('CHONGGU_CACHE', str(tmp_path))
    monkeypatch.setattr(assets, 'download', lambda *a, **k: pytest.fail('Pixabay 的不该用程序下载'))
    a = {'name': 'x/pb.mp3', 'source': 'pixabay', 'source_id': 123456, 'url': 'https://cdn.pixabay.com/x.mp3', 'page': None}
    st, msg = assets.fetch(a, [], False, False)
    assert st == 'manual' and '123456' in msg
    d = tmp_path / 'dl'; d.mkdir(); (d / 'someone-song-123456.mp3').write_bytes(b'abc')   # 手动下好的：--from 认编号
    assert assets.fetch(a, [d], False, False)[0] == 'got' and paths.asset('x/pb.mp3').read_bytes() == b'abc'


def test_public_manifest_has_no_pixabay_links():
    M = json.loads(paths.manifest_path().read_text(encoding='utf-8'))
    pb = [a for a in M['assets'] if a.get('source') == 'pixabay']
    assert pb and all(a.get('url') is None and a.get('page') for a in pb)   # 公开清单里的都核过作品页、都手动下


def test_unknown_sfx_needs_map(tmp_path):
    from chonggu.mix import plan
    T = {'duration': 5.0, 'beats': [{'id': 'a1', 'start': 0, 'end': 1, 'text': '一句', 'chars': [['一', 0.0], ['句', .5]]}], 'chapters': []}
    ep = type('E', (), {'root': tmp_path, 'raw': {}, 'interludes': None, 'title_card': None, 'breath': {}})()
    P = {'sections': [], 'sfx_keep': ['pop', 'hz_hit']}
    assert any('hz_hit' in b for b in plan.plan_problems(ep, T, P))
    assert not plan.plan_problems(ep, T, {**P, 'sfx_map': {'hz_hit': 'hz_hit.mp3'}})


def test_flags_gbk_and_locked(tmp_path, monkeypatch):
    from chonggu.voice.common import Flags
    p = tmp_path / 'flags.tsv'
    p.write_bytes('status\tkind\tid\tkey\tdetail\nok\tline\ta1\tk\t听「今天」\n'.encode('gbk'))   # Excel 存的
    F = Flags(p); assert F.rows == [['ok', 'line', 'a1', 'k', '听「今天」']]
    F.save(); assert '听「今天」' in p.read_text(encoding='utf-8')   # 存回 UTF-8
    import builtins
    real = builtins.open
    monkeypatch.setattr(builtins, 'open', lambda f, m='r', *a, **k: (_ for _ in ()).throw(PermissionError(13, 'locked')) if 'w' in m else real(f, m, *a, **k))
    with pytest.raises(GateFailed, match='Excel'):
        F.save()


def test_replace(tmp_path):
    a, b = tmp_path / 'a.txt', tmp_path / 'b.txt'; a.write_text('新', encoding='utf-8'); b.write_text('旧', encoding='utf-8')
    paths.replace(a, b)
    assert b.read_text(encoding='utf-8') == '新' and not a.exists()
    assert paths.win_short(tmp_path / '中文') == str(tmp_path / '中文') or sys.platform == 'win32'
