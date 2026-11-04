"""每章有没有画面：每章里接近纯色的帧（像素标准差 <3）不能超过 20%。
第 8 期发给主讲的「修好的 2K」开头整章没画面，flash 对空白画面也报通过；v18 1080p 最多的是越界·开场 5.9%（快剪里的黑场）。
python -m chonggu.qa.pure 成片.mp4 [timeline.json]"""
import json, sys
import numpy as np
from .common import FPS, gray, feed

LIMIT = .2


class Pure:
    def __init__(self, fps=FPS):
        self.fps, self.S = fps, []

    def push(self, f):
        self.S.append(float(f.std(dtype=np.float32)))

    def done(self):
        return {'n': len(self.S), 'std': np.array(self.S, np.float32)}


def ratios(T, S, fps=FPS):   # 每章纯色帧的比例
    out = {}
    for c in T['chapters']:
        s = S[int(c['t0'] * fps):int(c['t1'] * fps)]
        out[c['pre']] = float((s < 3).mean()) if len(s) else 1.0   # 片子比时间线短：这章没帧，当作全空
    return out


def scan(p, T):
    return ratios(T, feed(gray(p, 96, 54), Pure())[0]['std'])


if __name__ == '__main__':
    T = json.load(open(sys.argv[2] if len(sys.argv) > 2 else 'timeline.json', encoding='utf-8'))
    R = scan(sys.argv[1], T); bad = [k for k, v in R.items() if v > LIMIT]
    print('  '.join(f'{k} {100 * v:.1f}%' for k, v in R.items()))
    sys.exit(f'这几章大半是纯色：{bad}') if bad else print('每章都有画面')
