"""查闪帧：一帧和前后都差很多、前后彼此却几乎一样。python -m chonggu.qa.flash 片子.mp4
（第 8 期 film_full/work/edit/flash.py。注意：它对空白画面也报通过，每章有没有画面另由 pure 查。）"""
import sys
import numpy as np
from .common import FPS, gray, feed


class Flash:
    def __init__(self, fps=FPS):
        self.fps, self.a, self.b, self.i, self.bad = fps, None, None, 0, []

    def push(self, f):
        c = f.astype(np.float32)
        if self.a is not None:
            a, b, x = np.abs(self.b - self.a).mean(), np.abs(self.b - c).mean(), np.abs(self.a - c).mean()
            if a > 12 and b > 12 and x < 4:
                self.bad.append(round((self.i - 1) / self.fps, 2))
        self.a, self.b, self.i = self.b, c, self.i + 1

    def done(self):
        return {'n': self.i, 'flash': self.bad}


def scan(p):
    return feed(gray(p, 160, 90), Flash())[0]


if __name__ == '__main__':
    r = scan(sys.argv[1]); print(r['n'], 'frames; flashes:', r['flash'])
