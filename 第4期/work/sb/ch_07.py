# ch 07 机会 · 朋友 · 行动 (顾东政) — designer g4
# Summary as three doors (echo of 顾东政's 敲门砖 door in ch 01/05), the invitation as a road that runs into a
# question mark, the ending as a boat with its sail held tight.
import math
INK7, RED7 = '#1b1915', '#c4342c'


def g4_node7(x, y, at=None, red=False, delay=None):
    d = Node(x, y, at=at, red=red)
    if delay is not None:
        d['delay'] = delay
    return d


# 1. three doors open one by one: 学历 -> 机会, 大学 -> 朋友, 学习 -> 行动 · 选择 ---------------------------------- 18 s
scene('今天就是我想聊的话题',
      K('总 结', X, 180, at='总结一下'),
      Hd('学历', 206, 236, size=72, align='center'),
      Hd('大学', 540, 236, size=72, align='center', delay=0.15),
      Hd('学习', 874, 236, size=72, align='center', delay=0.3),
      Door(72, 350, w=268, h=400, inside='机会', open_at='的是机会', isize=76),
      Door(406, 350, w=268, h=400, inside='朋友', open_at='的是朋友', isize=76, delay=0.15),
      Door(740, 350, w=268, h=400, inside='行动\n选择', open_at='的是行动', isize=68, delay=0.3),
      P('以后该怎么做，', 540, 800, at='以后该怎么做', size=40, color='gray', align='center'),
      Hd('还是在于我这个人', 540, 862, at='还是在于', size=92, align='center'))

# 2. the invitation: our road runs on into a question mark ------------------------------------------------- 5.9 s
RY = 640
scene('那么我们这档节目',
      HL(X, RY, 640, thick=5),
      g4_node7(180, RY + 1, red=True, delay=0.2),
      g4_node7(240, RY + 1, red=True, delay=0.35),
      P('我们', 210, RY + 36, size=34, color='red', align='center'),
      K('一 份 邀 请', X, 300, at='邀请亲爱的'),
      g4_node7(380, RY + 1, at='观众朋友们'),
      P('观众朋友们', 380, RY + 36, at='观众朋友们', size=30, color='gray', align='center'),
      Hd('踏上这一条\n不确定性的道路', X, 360, at='和我们踏上', size=96),
      *[HL(712 + 46 * k, RY, 26, at='不确定性的道路', thick=5, delay=0.08 * k) for k in range(5)],
      Big('?', 975, RY - 100, at='不确定性的道路', size=170, delay=0.4))

# 3. the boat: the tide of the revolution, 不确定性的船, hold the sail tight ----------------------------------- 18 s
BX, BY, BS = 290, 300, 500                       # boat icon box; icon point (u, v) -> (BX + 5u, OY7 + 5v)
SW7 = 9                                          # the icon's stroke at this size (sw 1.8 x 5)
OY7 = BY + 30                                    # the icon's svg sits ~0.06 x size below its box top (line box of the div)


def g4_line7(x0, y0, x1, y1, at, delay=0.0):
    """a red edge over the icon's stroke, from (x0, y0) to (x1, y1), overshooting both ends by half a stroke"""
    L = math.hypot(x1 - x0, y1 - y0)
    ux, uy = (x1 - x0) / L, (y1 - y0) / L
    x0, y0, L = x0 - ux * SW7 / 2, y0 - uy * SW7 / 2, L + SW7
    return {'kind': 'strike', 'x': x0, 'y': y0 - SW7 / 2, 'w': L, 'rot': math.degrees(math.atan2(y1 - y0, x1 - x0)), 'at': at, 'delay': delay,
            'css': {'background': RED7, 'height': f'{SW7}px', 'borderRadius': f'{SW7 / 2}px'}}


def g4_fill7(x, y, w, h, poly, at, delay=0.0):
    """a pink fill clipped to a polygon (a sail)"""
    return {'kind': 'label', 'text': '', 'x': x, 'y': y, 'at': at, 'delay': delay,
            'css': {'width': f'{w}px', 'height': f'{h}px', 'background': '#f1d9d3', 'clipPath': f'polygon({poly})'}}


scene('在这个21世纪AI盛行的时代',
      P('21 世纪 · AI 盛行的时代', X, 180, size=38),
      Ic('boat', BX, BY, size=BS, sw=1.8, dur=2.4, delay=0.3),
      HL(140, BY + 412, 800, at='伟大的革命', color='light', thick=3),
      HL(250, BY + 446, 580, at='伟大的革命', color='light', thick=3, delay=0.25),
      HL(380, BY + 480, 320, at='伟大的革命', color='light', thick=3, delay=0.5),
      Lab('一场伟大的革命', 860, BY + 470, at='伟大的革命', size=28, color='gray', align='center', delay=0.6),
      g4_node7(600, BY + 329, at='带领着我们这一帮人', red=True),
      g4_node7(645, BY + 329, at='带领着我们这一帮人', red=True, delay=0.15),
      g4_node7(395, BY + 329, at='这一帮人'),
      g4_node7(440, BY + 329, at='这一帮人', delay=0.15),
      g4_node7(485, BY + 329, at='这一帮人', delay=0.3),
      Hd('不确定性的船', X, 840, at='不确定性的船', size=64),
      g4_fill7(BX + 5 * 50, OY7 + 5 * 14, 150, 210, '0 0, 100% 100%, 0 100%', at='抓紧船帆'),
      g4_fill7(BX + 5 * 24, OY7 + 5 * 22, 120, 170, '100% 0, 0 100%, 100% 100%', at='抓紧船帆', delay=0.15),
      g4_line7(BX + 5 * 50, OY7 + 5 * 14, BX + 5 * 80, OY7 + 5 * 56, at='抓紧船帆', delay=0.2),
      g4_line7(BX + 5 * 80, OY7 + 5 * 56, BX + 5 * 50, OY7 + 5 * 56, at='抓紧船帆', delay=0.45),
      g4_line7(BX + 5 * 48, OY7 + 5 * 22, BX + 5 * 24, OY7 + 5 * 56, at='抓紧船帆', delay=0.3),
      g4_line7(BX + 5 * 24, OY7 + 5 * 56, BX + 5 * 48, OY7 + 5 * 56, at='抓紧船帆', delay=0.55),
      {'kind': 'vline', 'x': BX + 5 * 50, 'y': OY7 + 5 * 12 - 5, 'h': 5 * 54 + 5, 'at': '抓紧船帆', 'delay': 0.1, 'color': 'red', 'thick': SW7, 'dur': 0.5},
      Marker('抓紧船帆', X, 930, at='抓紧船帆', size=96),
      *[g4_node7(x_, BY + 329, at='让自己不掉下去', red=True, delay=0.12 * k) for k, x_ in enumerate((395, 440, 485))],
      t1='刚刚顾老师+0.3')
