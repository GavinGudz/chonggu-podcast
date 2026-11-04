"""查「半帧」：某一块画面只在一帧（或连着两帧）里变了样、前后两帧这一块却一样（渲的时候机器太忙，那一帧没画完就截了）。
flash 看整张图的平均变化，一个标签缺掉这种局部的抓不到；这里把画面切成 16×9 块，一块一块比。
python -m chonggu.qa.glitch 片子.mp4 [起秒 止秒]
只拿来比两版或两次之间的差别，不当绝对标准（第 8 期终版 1080p 仍报 102 处，大多是片子本来的快速动画）。"""
import sys
from collections import deque
import numpy as np
from .common import FPS, gray, feed, mmss

W, H, G = 320, 180, 20


def blk(x):
    h, w = x.shape
    return np.abs(x).reshape(h // G, G, w // G, G).mean((1, 3))


class Glitch:
    def __init__(self, fps=FPS, t0=0.):
        self.fps, self.t0, self.q, self.i, self.out = fps, t0, deque(maxlen=4), 0, []

    def push(self, f):
        self.q.append(f.astype(np.int16)); self.i += 1
        if len(self.q) < 4:
            return
        p, c, n, nn = self.q; i = self.i - 3          # c 是第 i 帧
        A, B, C = blk(c - p), blk(c - n), blk(p - n)
        m1 = (A > 22) & (B > 22) & (C < 5)                                   # 只有这一帧不一样
        B2, C2 = blk(n - nn), blk(p - nn)
        m2 = (A > 22) & (B2 > 22) & (C2 < 5) & (blk(c - n) < 8)              # 连着两帧不一样
        k = int(m1.sum() or m2.sum())
        if k:
            self.out.append((round(self.t0 + i / self.fps, 3), k, '1 帧' if m1.sum() else '2 帧'))

    def done(self):
        return {'n': self.i, 'events': self.out}


def scan(p, a=0., b=None):
    return feed(gray(p, W, H, ss=a or None, t=(b - a) if b else None), Glitch(t0=a))[0]


if __name__ == '__main__':
    a, b = (float(sys.argv[2]), float(sys.argv[3])) if len(sys.argv) > 3 else (0., None)
    r = scan(sys.argv[1], a, b)
    for t, k, s in r['events']:
        print(f'{mmss(t)}  {s}  {k} 块')
    print(r['n'], '帧，可疑', len(r['events']))
