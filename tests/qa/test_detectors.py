"""画面检查要真的报得出来：做一段带一个坏帧的小片子，看每个检查有没有抓到（干净的片子不报）。"""
import numpy as np
from qa_util import clip, conv
from chonggu.qa import common as C, flash, flicker, glitch, lum, cross_check
from chonggu.qa.pure import Pure, ratios
from chonggu.qa.run import scan_video

BAD = "drawbox=x=0:y=0:w=iw:h=ih:color=white:t=fill:enable='eq(n,45)'"   # 第 45 帧（1.5 秒）整帧变白


def test_flash_fires_on_one_white_frame(tmp_path):
    r = flash.scan(clip(tmp_path / 'f.mp4', vf=BAD))
    assert r['n'] == 90 and r['flash'] == [1.5]


def test_flash_quiet_on_clean_clip(tmp_path):
    assert flash.scan(clip(tmp_path / 'ok.mp4', 'testsrc2=s=320x180:r=30:d=3'))['flash'] == []


def test_lum_spike(tmp_path):
    r = lum.scan(clip(tmp_path / 'f.mp4', vf=BAD))
    assert [t for t, _ in r['spikes']] == [1.5]


def test_flicker_luma_jump(tmp_path):
    # 暗 → 6 帧亮 → 暗：亮度跳了又回来（同一处的短镜头并成一条报）
    p = clip(tmp_path / 's.mp4', 'color=c=0x282828:s=320x180:r=30:d=3', "drawbox=x=0:y=0:w=iw:h=ih:color=0xc8c8c8:t=fill:enable='between(n,30,35)'")
    ev = flicker.scan(p)['events']
    assert len(ev) == 1 and ev[0][1] == 'luma' and abs(ev[0][0] - 1.0) < .05
    assert flicker.scan(clip(tmp_path / 'ok.mp4', 'color=c=0x282828:s=320x180:r=30:d=3'))['events'] == []


def test_flicker_short_shot_same_brightness():
    # 换了画面、亮度没变：只有「短镜头」能抓到（素材自带的镜头切换）
    rng = np.random.default_rng(0); A, B = rng.integers(60, 200, (2, 54, 96)).astype(np.uint8)
    d = flicker.Flicker()
    for i in range(90):
        d.push(B if 30 <= i < 36 else A)
    ev = d.done()['events']
    assert [k for _, k, _ in ev] == ['short'] and abs(ev[0][0] - 1.0) < .01 and '6 帧' in ev[0][2]


def test_glitch_catches_a_block_that_flash_misses(tmp_path):
    # 只有一小块（画面的 1/36）在一帧里变了：整帧平均变化很小，flash 抓不到，按块比能抓到
    p = clip(tmp_path / 'g.mp4', 'color=c=gray:s=640x360:r=30:d=3', "drawbox=x=200:y=120:w=80:h=80:color=white:t=fill:enable='eq(n,45)'")
    assert flash.scan(p)['flash'] == []
    ev = glitch.scan(p)['events']
    assert len(ev) == 1 and abs(ev[0][0] - 1.5) < .01 and ev[0][2] == '1 帧'


def test_glitch_two_frames(tmp_path):
    p = clip(tmp_path / 'g2.mp4', 'color=c=gray:s=640x360:r=30:d=3', "drawbox=x=200:y=120:w=80:h=80:color=white:t=fill:enable='between(n,45,46)'")
    ev = glitch.scan(p)['events']
    assert ev and ev[0][2] == '2 帧'


def test_cross_check_finds_missing_layer(tmp_path):
    # 同一个画面出两种分辨率；「2K」那份有 11 帧右半上面一整块没画
    m = clip(tmp_path / 'm.mp4', 'testsrc2=s=640x360:r=30:d=3')
    hd = conv(m, tmp_path / 'hd.mp4', 'scale=320:180')
    k2 = conv(m, tmp_path / '2k.mp4', "drawbox=x=320:y=0:w=320:h=180:color=black:t=fill:enable='between(n,30,40)'")
    sp = cross_check.scan(k2, hd)['spans']
    assert len(sp) == 1 and abs(sp[0][0] - 1.0) < .05 and sp[0][3] == 11
    assert cross_check.scan(m, hd)['spans'] == []


def test_pure_colour_chapter(tmp_path):
    a = clip(tmp_path / 'a.mp4', 'testsrc2=s=320x180:r=30:d=2'); b = clip(tmp_path / 'b.mp4', 'color=c=black:s=320x180:r=30:d=2')
    (tmp_path / 'l.txt').write_text(f"file '{a.name}'\nfile '{b.name}'\n", encoding='utf-8')
    from qa_util import ff
    ff('-f', 'concat', '-safe', '0', '-i', tmp_path / 'l.txt', '-c', 'copy', tmp_path / 'ab.mp4')
    T = {'chapters': [{'pre': 'a', 't0': 0, 't1': 2}, {'pre': 'b', 't0': 2, 't1': 4}]}
    S = C.feed(C.gray(tmp_path / 'ab.mp4', 96, 54), Pure())[0]['std']; R = ratios(T, S)
    assert R['a'] < .05 and R['b'] > .95


def test_scan_video_one_decode_feeds_everything(tmp_path):
    hd = clip(tmp_path / 'hd.mp4', 'color=c=gray:s=320x180:r=30:d=3', BAD)
    k2 = clip(tmp_path / 'k2.mp4', 'color=c=gray:s=640x360:r=30:d=3', BAD)
    V, X = scan_video({'1080': hd, '2k': k2})
    assert V['1080']['flash']['flash'] == [1.5] and V['2k']['flash']['flash'] == [1.5]
    assert X['spans'] == []   # 两版坏在同一帧：2K 对 1080p 一致


def test_fix_spikes_rerenders_and_splices(episode, monkeypatch):
    """补半帧：找到白帧 → 只重渲前后几帧（这里用一个假的 render_range 出干净的灰画面）→ 按帧接回去，帧数不变，原片留 .bak"""
    from chonggu.render import run as R
    from chonggu.qa import fix_spikes
    from qa_util import ff
    d = C.parts_dir(episode, '1080'); d.mkdir(parents=True, exist_ok=True)
    src = clip(d / '00_a.mp4', 'color=c=gray:s=320x180:r=30:d=3', BAD)
    calls = []

    def fake(ep, out, t0, t1, h=1080, workers=6, stable=8, log=None, **k):
        calls.append((round(t0 * 30), round(t1 * 30), workers, stable))
        ff('-f', 'lavfi', '-i', 'color=c=gray:s=320x180:r=30', '-frames:v', round(t1 * 30) - round(t0 * 30), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', out)
    monkeypatch.setattr(R, 'prepare', lambda ep: None); monkeypatch.setattr(R, 'render_range', fake)
    assert fix_spikes.fix(episode, 'a') == []
    assert calls == [(39, 52, 1, 3)] and (d / '00_a.mp4.bak').exists()
    assert lum.scan(src)['n'] == 90 and lum.scan(src)['spikes'] == []
