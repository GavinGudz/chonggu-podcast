"""全片查闪烁（第 8 期主讲：「一分十八秒的部分有画面闪烁，你也把全篇检查下」）：python -m chonggu.qa.flicker 成片.mp4
flash 只抓「一帧和前后都差很多、前后彼此一样」，抓不到连着几帧的。这里另外查两种：
- 短镜头：一次硬切（整帧变了）之后 ≤ 12 帧（0.4 秒）又硬切一次，中间那一小段一闪而过（素材里自带的镜头切换最常见）；
- 亮度跳：平均亮度突然变了 ≥ 10，又在 ≤ 12 帧内回到原来附近。
单独跑时按第 8 期用 96×54；qa 里和别的检查共用一次解码，用 160×90（阈值都是平均值，和分辨率无关）。"""
import sys
import numpy as np
from .common import FPS, gray, feed, mmss


class Flicker:
    def __init__(self, fps=FPS):
        self.fps, self.prev, self.pp, self.D, self.L, self.single = fps, None, None, [0.], [], []

    def push(self, f):
        c = f.astype(np.float32); self.L.append(float(c.mean()))
        if self.prev is not None:
            self.D.append(float(np.abs(c - self.prev).mean()))
            if self.pp is not None:   # 单帧闪：中间那帧（上一帧）和前后都不一样，前后一样
                a, b, x = np.abs(self.prev - self.pp).mean(), np.abs(self.prev - c).mean(), np.abs(self.pp - c).mean()
                if a > 12 and b > 12 and x < 4:
                    self.single.append((len(self.L) - 2) / self.fps)
        self.pp, self.prev = self.prev, c

    def done(self):
        n, D, L, fps = len(self.L), self.D, self.L, self.fps
        cuts = [i for i in range(1, n) if D[i] > 18]
        out = []
        for a, b in zip(cuts, cuts[1:]):
            if b - a <= 12:
                out.append((a / fps, 'short', f'短镜头 {b - a} 帧（{a / fps:.2f}–{b / fps:.2f}）'))
        for i in range(1, n - 12):
            if abs(L[i] - L[i - 1]) >= 10:
                back = [j for j in range(i + 1, i + 13) if abs(L[j] - L[i - 1]) < 3]
                if back:
                    out.append((i / fps, 'luma', f'亮度跳 {L[i - 1]:.0f}→{L[i]:.0f}，{back[0] - i} 帧后回到 {L[back[0]]:.0f}'))
        out += [(t, 'single', '单帧闪') for t in self.single]
        ev, seen = [], -9
        for t, k, s in sorted(out):   # 0.2 秒以内的算同一处
            if t - seen > .2:
                ev.append((round(t, 3), k, s))
            seen = t
        return {'n': n, 'cuts': len(cuts), 'events': ev}


def scan(p, w=96, h=54):
    return feed(gray(p, w, h), Flicker())[0]


if __name__ == '__main__':
    r = scan(sys.argv[1])
    for t, k, s in r['events']:
        print(f'{mmss(t)}  {s}')
    print(r['n'], '帧，硬切', r['cuts'], '次')
