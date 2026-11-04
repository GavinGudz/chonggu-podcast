"""逐帧亮度：python -m chonggu.qa.lum 片子.mp4 起点秒(全片时刻) [阈值=5]
→ 列出相邻两帧平均亮度跳得多的地方，和一帧冒出来又回去的（闪；fix_spikes 用它找没画完的半帧）。"""
import sys
import numpy as np
from .common import FPS, gray, feed


def spikes(L, th=5):   # 单帧亮度冒出来又回去：和前后两帧的平均差 > 0.6 阈值，前后两帧彼此差 < 0.5 阈值
    return [i for i in range(1, len(L) - 1) if abs(L[i] - (L[i - 1] + L[i + 1]) / 2) > th * .6 and abs(L[i - 1] - L[i + 1]) < th * .5]


class Lum:
    def __init__(self, fps=FPS, t0=0., th=5):
        self.fps, self.t0, self.th, self.L = fps, t0, th, []

    def push(self, f):
        self.L.append(float(f.mean(dtype=np.float32)))

    def done(self):
        L, t0, th, fps = self.L, self.t0, self.th, self.fps
        jumps = [(round(t0 + i / fps, 2), round(L[i] - L[i - 1], 1)) for i in range(1, len(L)) if abs(L[i] - L[i - 1]) > th]
        sp = [(round(t0 + i / fps, 2), round(L[i] - (L[i - 1] + L[i + 1]) / 2, 1)) for i in spikes(L, th)]
        return {'n': len(L), 'L': L, 'jumps': jumps, 'spikes': sp}


def luma(p):   # 每帧平均亮度（160×90）
    return np.array(feed(gray(p, 160, 90), Lum())[0]['L'], np.float32)


def scan(p, t0=0., th=5):
    return feed(gray(p, 160, 90), Lum(t0=t0, th=th))[0]


if __name__ == '__main__':
    r = scan(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 0., float(sys.argv[3]) if len(sys.argv) > 3 else 5)
    print(r['n'], 'frames; mean-luma jumps:', r['jumps']); print('one-frame spikes:', r['spikes'])
