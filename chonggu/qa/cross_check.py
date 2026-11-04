"""2K 和 1080p 逐帧对比（同一个画面，只是分辨率不同）：哪一块对不上 = 有一边那块没画（2K 显存不够时整块图层不画）。
python -m chonggu.qa.cross_check 2K.mp4 1080p.mp4 [timeline.json] → 每章对不上的帧数和时段"""
import json, sys
import numpy as np
from .common import FPS, gray, where, mmss
from .glitch import W, H, blk


class Cross:
    def __init__(self, fps=FPS):
        self.fps, self.i, self.bad = fps, 0, []

    def push(self, pair):
        a, b = pair
        d = blk(a.astype(np.int16) - b.astype(np.int16))
        if d.max() > 25:
            self.bad.append((self.i / self.fps, round(float(d.max()), 1), int((d > 25).sum())))
        self.i += 1

    def done(self):
        spans = []
        for t, m, k in self.bad:   # 相隔 ≤0.2 秒的并成一段：[起, 止, 最大差, 帧数]
            if spans and t - spans[-1][1] <= .2:
                spans[-1][1] = t; spans[-1][2] = max(spans[-1][2], m); spans[-1][3] += 1
            else:
                spans.append([t, t, m, 1])
        return {'n': self.i, 'spans': spans}


def by_chapter(T, spans):
    by = {c['pre']: [] for c in T['chapters']}
    for s in spans:
        by[where(T, s[0])].append(s)
    return by


def scan(a, b):   # 两路一起解码，短的那路完了就停（时长另有检查）
    c = Cross()
    for p in zip(gray(a, W, H), gray(b, W, H)):
        c.push(p)
    return c.done()


if __name__ == '__main__':
    r = scan(sys.argv[1], sys.argv[2])
    T = json.load(open(sys.argv[3] if len(sys.argv) > 3 else 'timeline.json', encoding='utf-8'))
    for pre, ss in by_chapter(T, r['spans']).items():
        print(f'{pre:3s} {len(ss)} 段  ', '；'.join(f'{mmss(t0)}–{t1 % 60:05.2f}（{k} 帧，差 {m}）' for t0, t1, m, k in ss[:12]))
    print(r['n'], '帧')
