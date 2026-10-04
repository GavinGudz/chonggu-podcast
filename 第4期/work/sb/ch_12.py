# ch 12 排名回答不了 (吴原同) -- designer g7
# Thread: the AI professor as two line figures (called back in ch 14 "说不上话"); 我 drawn smaller (没什么信心);
# the ranking as a ruler that cannot reach the question; 割裂 = two lines that part (AI rising vs. the old view flat).

GRAY2 = {'color': 'var(--gray2)'}


def _fig(x, y_feet, size, at=None, sw=None, **kw):
    """line figure (icon 'user') standing on y_feet; the figure's feet sit at 0.88 of the icon box."""
    return Ic('user', x, y_feet - 0.88 * size, size=size, at=at, sw=sw or round(4.5 * 220 / size, 2), **kw)


_G = 700   # ground line of the two figures (12a; 14b repeats the picture)

# 12a  the setting: an event, a one-on-one talk with an AI professor; 我 is the smaller figure
scene('有一次我没什么信心',
      K('有 一 次 ， 没 什 么 信 心', y=200),
      P('和顾老师一起，去一个活动', X, 258, at='一起去参加', size=38, css=GRAY2),
      HL(X, _G, 960, color='light', dur=1.0, delay=0.3),
      _fig(110, _G, 210, delay=0.5),
      P('我', 215, _G + 16, size=34, align='center', delay=0.8, css={'color': 'var(--ink)', 'fontWeight': 600}),
      _fig(650, _G, 330, at='印度教授'),
      Lab('印度教授', 815, _G + 20, at='印度教授+0.3', align='center', size=34),
      Tag('人 工 智 能 方 面', 707, _G + 80, at='人工智能方面的教授'),
      Ic('chat', 400, 430, size=150, at='跟他那个老师'),
      P('单独聊天', 475, 590, at='单独聊天', size=30, align='center', css=GRAY2))

# 12b  his words: a bubble from the professor, and the rank counting down to 20
scene('当时老师用很自信的语气说',
      Bub('你要自信起来。', X, 200, at='你要自信起来', size=58),
      _fig(X + 10, 560, 230),
      Lab('教授', X + 125, 580, size=30, align='center', css=GRAY2),
      Lab('世 界 排 名', 400, 350, at='世界排名', css={'color': 'var(--gray2)', 'fontSize': '30px'}),
      Count(20, 400, 395, at='世界排名前20', prefix='前 ', size=210, dur=1.5, **{'from': 100}),
      P('——我听到的时候，有一点绷不住', X, 690, at='绷不住', size=38, css=GRAY2))

# 12c  the ranking is a ruler; the question in my heart is off its scale
scene('不是老师说的不对',
      {'kind': 'qmark', 'x': 660, 'y': 400, 'size': 540, 'at': '那一刻我发现'},
      Lab('世 界 排 名', X, 210, css={'color': 'var(--gray2)', 'fontSize': '30px'}),
      Ruler(X, 260, 960, ticks=10, labels=[{'pos': 0.01, 'text': '1'}, {'pos': 0.2, 'text': '20', 'red': True},
                                           {'pos': 0.99, 'text': '100'}],
            dot={'from': 0.2, 'at': '不是老师说的不对'}),
      Hd('排名\n回答不了', y=470, at='排名回答不了', size=130),
      P('我心里的那个问题', X, 800, at='我心里的那个问题', size=48))

# 12d  割裂: a crack splits the frame -- AI about to change everything | the old eye on scores and rankings,
#      "as if the next fifty years stay the same" (not a chart: ch 11 ends on one and ch 14 calls it back)
import math as _m


def _crack(pts, at=None, delay=0.0, step=0.11, thick=5, color='#1b1915'):
    """a jagged line through pts, drawn segment by segment"""
    out = []
    for i, ((x0, y0), (x1, y1)) in enumerate(zip(pts, pts[1:])):
        L = _m.hypot(x1 - x0, y1 - y0) + thick / 2
        deg = _m.degrees(_m.atan2(y1 - y0, x1 - x0))
        out.append(HL(x0, y0 - thick / 2, L, at=at, delay=delay + i * step, thick=thick, color=color, dur=0.16,
                      css={'rotate': f'{deg:.1f}deg', 'transformOrigin': '0 50%', 'borderRadius': f'{thick / 2}px'}))
    return out


_CX = 540
_CR = [(_CX, 238), (_CX - 14, 300), (_CX + 12, 360), (_CX - 18, 430), (_CX + 16, 505), (_CX - 20, 575),
       (_CX + 16, 645), (_CX - 16, 715), (_CX + 18, 785), (_CX - 10, 855), (_CX, 900)]
scene('于是在去年11月份的时候',
      K('去 年 · 1 1 月', _CX, 200, align='center'),
      Big('割', _CX - 125, 236, at='割裂的感觉', size=170, align='center'),       # the word itself is split
      Big('裂', _CX + 125, 236, at='割裂的感觉', size=170, align='center'),
      *_crack(_CR, at='割裂的感觉+0.2', step=0.09),
      Ic('robot', _CX - 270 - 100, 470, size=200, at='AI快要改变一切了', color='red'),
      P('AI', _CX - 270, 680, at='AI快要改变一切了+0.3', size=44, align='center',
        css={'color': 'var(--red)', 'fontWeight': 900, 'fontFamily': 'var(--serif)'}),
      P('快要改变一切', _CX - 270, 744, at='改变一切', size=36, align='center'),
      Ic('eye', _CX + 270 - 100, 470, size=200, at='用老眼光'),
      P('老眼光', _CX + 270, 680, at='用老眼光+0.2', size=44, align='center',
        css={'color': 'var(--ink)', 'fontWeight': 900, 'fontFamily': 'var(--serif)'}),
      P('成绩 · 排名', _CX + 270, 744, at='所谓的成绩', size=36, align='center', css=GRAY2),
      Count(50, _CX + 270, 808, at='未来50年', prefix='未来 ', suffix=' 年 · 照旧', size=44, color='ink', dur=1.6,
            align='center'),
      P('「考上公务员，就高枕无忧」', _CX, 930, at='考上公务员', size=40, align='center'))
