# ch 09 走廊上的尺子 (吴原同)  -- designer g5
CW = 960
SERIF = lambda s, c='#1b1915': {'font': f'900 {s}px/1.2 var(--serif)', 'color': c}

# 1. school years as a bar (小学 6 · 初中 3 · 高中 3): only part of 高中 filled; the bracket says 国内
scene('先从头说起',
      K('先 从 头 说 起', y=180),
      Box('', X, 390, CW, 150, style='dashed'),
      Box('小学', X, 390, 474, 150, at='小学', style='dark', tsize=54, center=True),
      Box('初中', X + 480, 390, 234, 150, at='初中', style='dark', tsize=54, center=True),
      Box('高中', X + 720, 390, 120, 150, at='一部分高中', style='pink', tsize=44, center=True),
      Lab('一部分', X + 780, 562, at='一部分', align='center', color='red', css={'fontSize': '30px'}),
      HL(X, 344, 840, at='在国内上的', color='red', thick=4),
      {'kind': 'vline', 'x': X + 2, 'y': 344, 'h': 34, 'color': 'red', 'thick': 4, 'at': '在国内上的', 'dur': 0.3},
      {'kind': 'vline', 'x': X + 838, 'y': 344, 'h': 34, 'color': 'red', 'thick': 4, 'at': '在国内上的+0.4', 'dur': 0.3},
      Lab('国内', X + 420, 252, at='国内上的', align='center', css=SERIF(68)))

# 2. 学历至上, and what it bought: 学习好 -> 老师照顾 -> 更好的未来
scene('就学历至上',
      Hd('学历至上', y=240, size=160),
      Rule(x=X + 330, y=456, w=310, at='至上'),
      Ic('book', 150, 540, size=140, at='学习特别好'),
      Lab('学习好', 220, 700, at='学习特别好', align='center', css={'fontSize': '36px'}),
      Arr(312, 610, 130, at='老师'),
      Ic('eye', 470, 540, size=140, at='老师'),
      Lab('老师照顾', 540, 700, at='老师', align='center', css={'fontSize': '36px'}),
      Arr(632, 610, 130, at='更好的未来'),
      Ic('stairs', 790, 540, size=140, at='更好的未来', color='red'),
      Lab('更好的未来', 860, 700, at='更好的未来', align='center', color='red', css={'fontSize': '36px'}))

# 3. the tool: people sorted onto shelves (三六九等), then labelled 好 / 坏
_sh = [(390, 300, 430, 3), (270, 540, 620, 5), (150, 780, 810, 8)]   # (x, w, y, people)
_els = [K('成 绩 ， 变 成 了 工 具', y=190)]
for k, (sx, sw, sy, n) in enumerate(_sh):
    _els.append(Box('', sx, sy, sw, 8, style='dark', delay=0.1 + 0.2 * k))
_d = 0.0
for k, (sx, sw, sy, n) in enumerate(_sh):
    gap = sw / n
    for i in range(n):
        cx = sx + gap * (i + 0.5)
        _els.append(Ic('user', round(cx - 42), sy - 80, size=84, at='三六九等', delay=round(_d, 2), color='red' if k == 0 else None, dur=0.6))
        _d += 0.09
_els += [Lab('好', 286, 340, at='好坏', css=SERIF(84, '#c4342c')),
         Lab('坏', 60, 720, at='好坏+0.15', css=SERIF(84, '#8e8a83'))]
scene('就变成了一个工具', *_els)

# 4. the hallway: everyone's scores on the wall, chatter, and anyone walking past can see
scene('所有人的成绩',
      Board(X, 230, w=CW, title='成绩榜', subtitle='走 廊',
            rows=[{'rank': '1', 'score': '98', 'hot': True, 'at': '挂在走廊上'},
                  {'rank': '2', 'score': '95', 'at': '挂在走廊上+0.2'},
                  {'rank': '3', 'score': '93', 'at': '挂在走廊上+0.4'},
                  {'rank': '4', 'score': '90', 'at': '挂在走廊上+0.6'},
                  {'rank': '5', 'score': '88', 'at': '挂在走廊上+0.8'}]),
      Ic('people', X + 10, 840, size=150, at='絮絮叨叨'),
      Bub('……', 196, 770, at='絮絮叨叨+0.2'),
      Bub('谁考多少分？', 420, 800, at='谁考多少分'),
      Ic('eye', 850, 790, size=160, at='路过人都能看见', color='red'))

# 5. why the ruler made sense: the ruler itself.  Everyone is a mark piled above it (a mountain in the middle,
#    it swells at 人口这么多); at the top end only a red sliver of chances.  Then its numbers: at least it is clear.
import math
_RY5 = 640
_bar = lambda x, h, at, delay, col='#1b1915': {'kind': 'vbar', 'x': x, 'y': _RY5 + 2 - h, 'w': 9, 'h': h, 'at': at, 'delay': delay,
                                               'css': {'transformOrigin': '50% 100%', 'background': col}}
_els5 = [K('这 把 尺 子 的 道 理', y=190),
         Ruler(X, _RY5, w=CW, ticks=10, minor=4,
               labels=[{'pos': k / 5, 'text': str(20 * k), 'at': f'分数至少是清楚+{0.08 * k:.2f}'} for k in range(6)],
               seg={'from': 0.9, 'to': 1.0, 'at': '机会少'})]
for i in range(56):
    pos = (i + 0.5) / 60
    h = 330 * math.exp(-((pos - 0.38) / 0.19) ** 2) * (0.86 + 0.28 * ((i * 37) % 11) / 10)
    if h < 8:
        continue
    bx = round(X + CW * pos - 4.5)
    _els5.append(_bar(bx, round(h * 0.5), '人多', round(0.012 * i, 3)))
    _els5.append(_bar(bx, round(h), '人口这么多', round(0.012 * i, 3)))
for k, (pos, h) in enumerate([(0.925, 34), (0.975, 20)]):
    _els5.append(_bar(round(X + CW * pos - 4.5), h, '机会少', 0.2 + 0.15 * k, '#c4342c'))
_els5 += [Lab('人多', X, 250, at='人多', css=SERIF(100)),
          Lab('机会少', 750, 452, at='机会少', css=SERIF(88, '#c4342c')),
          K('分 数 ， 至 少 清 楚', X, _RY5 + 150, at='分数至少是清楚+0.5')]
scene('这把尺子当然有它的道理', *_els5)

# 6. used for decades: a height ruler beside a person, a red reading at the head; then the ruler itself turns red:
#    it is only a ruler (the person is not the reading)
_VX, _VY0, _VY1 = 330, 250, 800
_els6 = [{'kind': 'vline', 'x': _VX, 'y': _VY0, 'h': _VY1 - _VY0, 'color': 'ink', 'thick': 4, 'dur': 0.7},
         HL(200, _VY1, 720, thick=3, dur=0.7)]
for k in range(21):
    y = _VY1 - k * (_VY1 - _VY0) / 20
    major = k % 5 == 0
    _els6.append(HL(_VX, round(y - (2 if major else 1)), 44 if major else 22, color=None if major else 'light',
                    thick=4 if major else 2, delay=round(0.1 + 0.025 * k, 3), dur=0.25))
_els6 += [Ic('user', 476, 430, size=420, sw=3.2, at='大家已经用了'),
          HL(_VX, 504, 352, at='大家已经用了+0.6', css={'background': 'transparent', 'borderTop': '4px dashed #c4342c', 'height': '0px'}),
          Node(_VX, 506, at='大家已经用了+0.6', red=True),
          Ic('hourglass', 700, 236, size=104, at='几十年'),
          Lab('几十年', 812, 254, at='几十年', css=SERIF(64)),
          {'kind': 'vline', 'x': _VX, 'y': _VY0, 'h': _VY1 - _VY0, 'color': 'red', 'thick': 10, 'dur': 0.9, 'at': '它只是一把尺子'},
          Lab('只是\n尺子', 92, 560, at='一把尺子', css=SERIF(96, '#c4342c'))]
scene('这个尺子大家已经', *_els6)

# 7. measured by that ruler he lands in the middle; the top ten (about UNSW's standing) sit beyond a red line at the
#    far end.  考不上 = the dashed gap between his dot and that line.
_RX7, _RW7, _RY7 = 100, 880, 600
_q7 = lambda pos: round(_RX7 + _RW7 * pos)
scene('但说实话',
      K('按 那 把 尺 子 量', y=190),
      Ruler(_RX7, _RY7, w=_RW7, at='按照那把尺子量',
            labels=[{'pos': 0, 'text': '高考', 'at': '高考'},
                    {'pos': 0.4, 'text': '我', 'red': True, 'at': '我不是量得', 'serif': True, 'size': 44},
                    {'pos': 0.93, 'text': '前十', 'red': True, 'at': '排名前十', 'serif': True, 'size': 44}],
            dot={'from': 0.4, 'at': '我不是量得'},
            seg={'from': 0.86, 'to': 1.0, 'at': '排名前十'}),
      Lab('和 UNSW\n认可度差不多', 640, 330, at='认可度', color='gray', css={'fontSize': '28px', 'textAlign': 'right'}),
      Ic('school', 872, 312, size=140, at='就是那些和'),
      {'kind': 'vline', 'x': _q7(0.86), 'y': 470, 'h': _RY7 + 44 - 470, 'color': 'red', 'thick': 5, 'dur': 0.6, 'at': '排名前十'},
      HL(_q7(0.4) + 26, _RY7 - 34, _q7(0.86) - _q7(0.4) - 40, at='排名前十+1.2', dur=0.9,
         css={'background': 'transparent', 'borderTop': '4px dashed #c4342c', 'height': '0px'}),
      {'kind': 'vline', 'x': _q7(0.4) + 26, 'y': _RY7 - 46, 'h': 26, 'color': 'red', 'thick': 4, 'dur': 0.2, 'at': '排名前十+1.2'},
      Lab('考不上', round((_q7(0.4) + _q7(0.86)) / 2) - 110, _RY7 - 150, at='我是考不上', css=SERIF(76, '#c4342c')))
