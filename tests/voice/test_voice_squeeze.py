"""压停顿和它的位置换算（squeeze / squeeze_map / unsqueeze）"""
import numpy as np
from chonggu.voice.common import SR, squeeze, squeeze_map, unsqueeze
from voice_fakes import tone

def burst_track(spec):
    """spec：[('s', 秒) 有声 | ('z', 秒) 静音, ...] → 声音和每一段在原来的采样区间"""
    out, marks, i = [], [], 0
    for k, d in spec:
        x = tone(440, d) if k == 's' else np.zeros(int(d * SR), np.float32)
        out.append(x); marks.append((k, i, i + len(x))); i += len(x)
    return np.concatenate(out), marks

def test_squeeze_map_matches_squeeze():
    y, marks = burst_track([('z', .2), ('s', .5), ('z', 1.2), ('s', .4), ('z', .3), ('s', .6), ('z', .9), ('s', .3), ('z', .1)])
    s, m = squeeze(y), squeeze_map(y)
    assert len(m) == len(y) + 1 and m[-1] == len(s)
    assert np.all(np.diff(m) >= 0)                        # 位置不倒退
    assert len(y) - len(s) > int(1.2 * SR) - int(.32 * SR) - 2 * 480   # 两处长停顿（1.2、.9 秒）都压到了 .32 秒
    for k, a, b in marks:                                 # 有声的地方：原来第 i 个采样压过以后就在 m[i]
        if k == 's':
            ix = np.arange(a, b, 97); assert np.array_equal(s[m[ix]], y[ix])

def test_short_pause_and_edges_untouched():
    y, _ = burst_track([('z', .8), ('s', .5), ('z', .4), ('s', .5), ('z', .8)])   # 段首段尾的停顿不压；.4 秒不到 .45 也不压
    assert len(squeeze(y)) == len(y)
    assert np.array_equal(squeeze_map(y)[:-1], np.arange(len(y)))

def test_half_segment_is_not_the_same_as_map():
    """第 8 期 nx04：拿半截去 squeeze，半截末尾的长停顿不会被压，位置就算偏了；squeeze_map 才对"""
    y, marks = burst_track([('s', .5), ('z', 1.5), ('s', .5)])
    cut = marks[2][1] - int(.05 * SR)                     # 第二个字前 50 ms（还在长停顿里）
    naive = len(squeeze(y[:cut])); right = int(squeeze_map(y)[cut])
    assert naive - right > int(.9 * SR)                   # 半截的算法多了一秒多
    assert right == len(squeeze(y)) - (len(y) - cut)      # 对的：这一刻之后的东西一点没压

def test_unsqueeze_roundtrip():
    y, marks = burst_track([('s', .5), ('z', 1.0), ('s', .5)])
    m = squeeze_map(y)
    for i in (0, 1000, marks[2][1], marks[2][1] + 777, len(y) - 1):
        assert unsqueeze(m, int(m[i])) <= i and m[unsqueeze(m, int(m[i]))] == m[i]
