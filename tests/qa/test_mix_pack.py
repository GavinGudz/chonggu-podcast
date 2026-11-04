"""小期从混音走到打包：mix 出成片和不带口播的版本（响度 −15），qa 抓得到坏帧并停下，pack 出的手机版都小于上限，封面、简介写得出来。"""
import json, types
from pathlib import Path
import pytest
from qa_util import clip, ff
from chonggu.gates import GateFailed
from chonggu.qa import common as C, checks as K


def mixed(episode):
    from chonggu.mix import plan
    return plan.mix(episode)


def test_mix_outputs_and_loudness(episode, no_node, capsys):
    outs = mixed(episode)
    film, novo = Path(C.film(episode, '1080')), Path(C.novo(episode))
    assert outs == [film, novo] and film.exists() and novo.exists()
    assert abs(C.duration(film) - 6.0) < .1
    I, LRA, pk = K.loudness(film)
    assert abs(I + 15) < 1.0 and pk <= -1.0
    out = capsys.readouterr().out
    assert '原声 1 句从 narration_quotes.wav 放进去' in out   # 画面代码没登记 b2q 的原声：从 voice 拼的原声里补
    assert '音效 2 （画面登记的 2 个里留 1 个，加 1 个爆点）' in out


def test_mix_2k_gets_same_audio(episode, no_node):
    clip(C.noaudio(episode, '2k'), 'testsrc2=s=640x360:r=30:d=6')
    mixed(episode)
    assert C.audio_md5(C.film(episode, '1080')) == C.audio_md5(C.film(episode, '2k'))


def test_mix_refuses_bad_plan(episode, no_node):
    p = Path(episode.music_plan); P = json.loads(p.read_text(encoding='utf-8')); P['sections'][0]['breath'] = -2; p.write_text(json.dumps(P), encoding='utf-8')
    with pytest.raises(GateFailed, match='breath -2'):
        mixed(episode)


def test_mix_missing_asset_says_how(episode, no_node):
    (episode.root / 'music' / 'm.mp3').unlink()
    with pytest.raises(GateFailed, match='fetch-assets'):
        mixed(episode)


def test_qa_catches_flash_and_writes_report(episode, no_node):
    from chonggu.qa.run import run_qa
    mixed(episode); film = Path(C.film(episode, '1080'))
    v = clip(film.with_name('v.mp4'), 'color=c=gray:s=320x180:r=30:d=6', "drawbox=x=0:y=0:w=iw:h=ih:color=white:t=fill:enable='eq(n,45)'")   # 一个白帧
    ff('-i', v, '-i', film, '-map', '0:v', '-map', '1:a', '-c', 'copy', film.with_name('bad.mp4')); film.with_name('bad.mp4').replace(film)
    with pytest.raises(GateFailed, match='闪帧'):
        run_qa(episode, types.SimpleNamespace(only='闪帧,纯色,时长', skip=None, no_video=False))
    rep = Path(episode.out('qa', 'qa_v1.txt')).read_text(encoding='utf-8')
    assert '[没过] 闪帧：1 处要看' in rep and '0:01.50  a  单帧闪' in rep and '只跑了一部分' in rep
    assert not Path(episode.out('qa', 'passed.json')).exists()


def test_qa_pass_record_only_on_full_pass(episode, no_node):
    from chonggu.qa.run import report
    mixed(episode); film = Path(C.film(episode, '1080'))
    R = [K.Res('dur', '时长', K.OK, 'ok')]
    report(episode, {'1080': film}, R, partial=True)
    assert not Path(episode.out('qa', 'passed.json')).exists()
    report(episode, {'1080': film}, R, partial=False)
    J = json.loads(Path(episode.out('qa', 'passed.json')).read_text(encoding='utf-8'))
    assert J['files'][film.name]['size'] == film.stat().st_size


def test_pack_phone_parts_full_and_edit_pack(episode, no_node):
    from chonggu.pack import run as P
    mixed(episode); outs = P.pack(episode)
    names = [Path(o).name for o in outs]
    assert names[0] == '第99期v1_手机_1of1_全部.mp4' and names[-1] == '第99期v1_完整版_手机.mp4'
    E = Path(episode.out('编辑包_v1'))
    rows = (E / '逐句清单.txt').read_text(encoding='utf-8').splitlines()
    assert rows[1].startswith('001_a1_今天我们说一件事情.wav\ta1\t0.30') and rows[3].startswith('（原声）\tb2q')
    assert (E / '逐句_2句.zip').exists() and (E / '画面加配乐_没有你的口播_v1_手机版.mp4').exists()
    assert abs(C.duration(E / '口播整条_v1_从0秒对齐.wav') - 6.0) < .05
    assert '2 句你的口播' in (E / '说明.md').read_text(encoding='utf-8')
    assert K.check_phone(episode).status == K.OK


def test_phone_gives_up_loudly(tmp_path):
    from chonggu.pack.run import phone
    src = clip(tmp_path / 'n.mp4', 'testsrc2=s=640x360:r=30:d=3')
    with pytest.raises(GateFailed, match='压不到'):
        phone(src, tmp_path / 'p.mp4', max_mib=.001)


def test_cover_and_intro(episode, tmp_path, capsys):
    from chonggu.pack import run as P
    from PIL import Image, ImageDraw
    pg = Image.new('RGB', (1000, 1400), 'white'); ImageDraw.Draw(pg).text((220, 600), 'evidence line', fill='black'); pg.save(episode.root / 'assets' / 'page.png')
    (episode.root / 'assets' / 'boxes.json').write_text(json.dumps({'p1': {'w': 1000, 'rects': [[210, 595, 300, 20]]}}))
    episode['cover']['evidence'] = {'image': 'assets/page.png', 'boxes': 'assets/boxes.json', 'key': 'p1', 'x': [150, 850]}
    outs = P.run(episode, types.SimpleNamespace(command='cover', preview=str(tmp_path / 'pv.png')))
    assert [Image.open(o).size for o in outs] == [(1920, 1080), (1080, 1440), (1510, 720)]
    assert 'Noto Sans SC Bold' in capsys.readouterr().out   # 打印字体名确认字重
    p = P.run(episode, types.SimpleNamespace(command='intro'))
    md = Path(p).read_text(encoding='utf-8')
    assert md.index('短版') < md.index('## 标题') < md.index('长版')
    assert '#重估播客 #测试' in md and '00:03 正文：第二章' in md and '本期主讲：测试主讲' in md and '不构成投资建议' in md


def test_cli_runs_these_commands(episode):
    """命令行：intro、cover 能跑；qa 没过时退出码 2（门槛没过），报告照样写"""
    import subprocess, sys
    from qa_util import ROOT
    run = lambda *a: subprocess.run([sys.executable, '-m', 'chonggu', *a], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    r = run('intro', str(episode.root)); assert r.returncode == 0, r.stderr
    assert Path(episode.out('发布简介_第99期.md')).exists()
    r = run('cover', str(episode.root)); assert r.returncode == 0, r.stderr
    clip(C.film(episode, '1080'), 'color=c=black:s=320x180:r=30:d=6')
    r = run('qa', str(episode.root), '--only', '纯色,时长')
    assert r.returncode == 2 and '每章有画面' in r.stderr + r.stdout
