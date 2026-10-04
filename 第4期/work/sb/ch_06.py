# ch 06 大学给的朋友 (顾东政) — designer g4
# Thread of the chapter: two people (顾 left, 吴 right) -> parallel lines that never meet -> two lanes that meet at UNSW
# -> one target everybody aims at (two go past it) -> a red branch off the common road -> a platform -> two circles that overlap.
import math
INK_, RED_ = '#1b1915', '#c4342c'


def g4_line(x, y, w, rot, at=None, color=INK_, thick=3, **kw):
    """a straight line from (x, y), w long, rotated rot degrees (positive = downwards), drawing from its start"""
    return {'kind': 'strike', 'x': x, 'y': y, 'w': w, 'rot': rot, 'at': at, 'css': {'background': color, 'height': f'{thick}px'}, **kw}


def g4_vl(x, y, h, at=None, **kw):
    return {'kind': 'vline', 'x': x, 'y': y, 'h': h, 'at': at, **kw}


def g4_node(x, y, at=None, red=False, delay=None):
    d = Node(x, y, at=at, red=red)
    if delay is not None:
        d['delay'] = delay
    return d


def g4_circle(text, x, y, d, at=None, fill='rgba(241,217,211,.85)', border=RED_, bw=3, tsize=52, pad=None, **kw):
    css = {'borderRadius': '50%', 'background': fill, 'border': f'{bw}px solid {border}'}
    if pad:
        css.update(pad)
    return Box(text, x, y, d, d, at=at, draw=False, center=True, tsize=tsize, css=css, **kw)


def g4_avatar(x, y, size, text, at=None, **kw):
    return {'kind': 'avatar', 'x': x, 'y': y, 'size': size, 'text': text, 'at': at, **kw}


# 1. two people, then the university between them, then the link ---------------------------------------------- 14 s
scene('还有一件事情我觉得很有意思',
      K('还 有 一 件 事', X, 200),
      Ic('user', 60, 280, size=260, sw=3),
      P('顾东政', 190, 560, size=36, align='center'),
      Ic('user', 760, 280, size=260, sw=3, at='身处于当下'),
      P('吴原同', 890, 560, at='身处于当下', size=36, align='center'),
      Ic('cap', 405, 270, size=270, sw=3, at='大学最重要是', dur=1.4),
      g4_vl(190, 626, 64, at='我和吴老师为例', color='red', thick=5),
      g4_vl(890, 626, 64, at='我和吴老师为例', color='red', thick=5),
      HL(190, 688, 700, at='我和吴老师为例', color='red', thick=5, delay=0.4),
      g4_node(540, 689, at='大学的时候认识的', red=True),
      Hd('大学的时候认识的', 540, 730, at='大学的时候认识的', size=64, align='center'))

# 2. pairs that meet (对象, 志同道合) — and without university, two parallel lines that never meet ---------------- 13 s
scene('谈恋爱交对象',
      g4_node(84, 214),
      HL(84, 213, 150, color='light', thick=4, delay=0.15),
      g4_node(234, 214, delay=0.5),
      P('谈恋爱 · 交对象', 280, 190, size=36, color='gray', delay=0.3),
      Marker('志同道合', X, 280, at='志同道合', size=150),
      g4_node(770, 392, at='像我和吴老师一样', red=True),
      HL(770, 390, 210, at='像我和吴老师一样', color='red', thick=5, delay=0.2),
      g4_node(980, 392, at='像我和吴老师一样', red=True, delay=0.7),
      HL(X, 620, 960, at='如果不是大学', thick=3),
      HL(X, 780, 960, at='如果不是大学', thick=3, delay=0.25),
      g4_node(260, 621, at='我和吴老师说不定', red=True),
      Lab('顾东政', 260, 566, at='我和吴老师说不定', size=28, color='gray', align='center'),
      g4_node(780, 781, at='我和吴老师说不定', red=True, delay=0.3),
      Lab('吴原同', 780, 806, at='我和吴老师说不定', size=28, color='gray', align='center', delay=0.3),
      Hd('平行宇宙', 540, 655, at='平行宇宙', size=72, align='center'))

# 3. two lanes: 宁波 / 杭州, 美国 / 马来西亚 — they meet at UNSW ------------------------------------------------------ 20 s
L_, R_ = 270, 810
scene('那么大家想我和吴老师',
      P('顾东政', L_, 180, size=36, align='center'),
      P('吴原同', R_, 180, size=36, align='center'),
      Big('≠', 540, 352, at='不一样的城市', size=96, color='gray'),
      Big('≠', 540, 580, at='不一样的高中', size=80, color='gray'),
      g4_vl(R_, 236, 96, at='他住在杭州', color='ink'),
      g4_node(R_, 350, at='他住在杭州', delay=0.5),
      Hd('杭州', R_, 374, at='他住在杭州', size=72, align='center'),
      g4_vl(L_, 236, 96, at='我住在宁波', color='ink'),
      g4_node(L_, 350, at='我住在宁波', delay=0.5),
      Hd('宁波', L_, 374, at='我住在宁波', size=72, align='center'),
      g4_vl(R_, 474, 86, at='马来西亚', color='ink'),
      g4_node(R_, 578, at='马来西亚', delay=0.5),
      Hd('马来西亚 · 高中', R_, 602, at='马来西亚', size=50, align='center'),
      g4_vl(L_, 474, 86, at='我在美国上过高中', color='ink'),
      g4_node(L_, 578, at='我在美国上过高中', delay=0.5),
      Hd('美国 · 高中', L_, 602, at='我在美国上过高中', size=50, align='center'),
      g4_line(L_, 690, 304, 27.4, at='这一所UNSW', thick=4),
      g4_line(R_, 690, 304, 152.6, at='这一所UNSW', thick=4),
      Box('UNSW', 350, 830, 380, 124, at='这一所UNSW', style='pink', tsize=72, center=True, delay=0.5),
      Bub('想聊到一块', 400, 1000, at='彼此有什么东西', tail='up'))

# 4. 相遇 cannot be measured by a salary ---------------------------------------------------------------------- 11.6 s
scene('这份相遇呢',
      Big('相遇', X, 190, size=230, align='left'),
      Ic('coin', 690, 196, size=170, at='一份工资'),
      P('一份工资', 775, 384, at='一份工资', size=38, align='center'),
      g4_line(650, 452, 330, -50, at='来衡量', color=RED_, thick=6),
      HL(X, 520, 960, at='你遇见一个人', color='light'),
      Ic('chat', X, 562, size=110, at='讨论话题的人'),
      Hd('可以讨论话题的人', 200, 576, at='讨论话题的人', size=64),
      Ic('people', X, 704, size=110, at='一起可以做事的人'),
      Hd('一起可以做事的人', 200, 718, at='一起可以做事的人', size=64))

# 5. one sentence -> a question never asked -> how you see yourself --------------------------------------------- 14 s
scene('也可以因为别人的一句话',
      Bub('别人的一句话', 354, 170, size=52),
      Arr(540, 296, 80, at='认真地思考', dir_='d'),
      Big('?', 540, 372, at='从来没有想过的问题', size=240),
      P('一件从没想过的问题', 540, 616, at='从来没有想过的问题', size=40, align='center'),
      Arr(540, 690, 80, at='这个关系', dir_='d'),
      Hd('如何理解自己', 540, 790, at='如何理解自己', size=64, align='center'),
      Hd('如何选择接下来的人生', 540, 878, at='如何选择接下来的人生', size=64, align='center', color='red'))

# 6. one target: GPA -> master -> 好工作 rings; most students aim at it, the two at the ends go past it ------- 23 s
TCX, TCY, TR, TM, TI = 540, 470, 240, 160, 82     # target centre, outer / middle / inner radius
SY = 872                                          # students' row (icon tops)
SXS = [140 + 100 * k for k in range(9)]           # students' centres; the two at the ends are the 爱折腾的
g4_aim = []
for k, sx in enumerate(SXS[1:-1]):
    dx, dy = TCX - sx, TCY - (SY - 14)
    L = math.hypot(dx, dy) - TR - 8
    g4_aim.append(g4_line(sx, SY - 14, L, math.degrees(math.atan2(dy, dx)), at='目标都是一致的', color='#b4ada2', thick=3, delay=0.15 + 0.12 * k))
g4_off = []                                       # the two red lines: from the end students up past the target
for k, (sx, ex) in enumerate(((SXS[0], 96), (SXS[-1], 984))):
    dx, dy = ex - sx, 236 - (SY - 16)
    g4_off.append(g4_line(sx, SY - 16, math.hypot(dx, dy), math.degrees(math.atan2(dy, dx)), at=f'爱折腾的学生+{0.4 + 0.15 * k}', color=RED_, thick=4))
    g4_off.append(g4_node(ex, 236, at=f'爱折腾的学生+{1.0 + 0.15 * k}', red=True))
scene('在同一所大学里',
      K('同 一 所 大 学 里', TCX, 176, align='center'),
      g4_circle('', TCX - TR, TCY - TR, 2 * TR, fill='rgba(250,248,243,.55)', border=INK_, bw=3, delay=0.2),
      g4_circle('', TCX - TM, TCY - TM, 2 * TM, fill='rgba(250,248,243,.35)', border=INK_, bw=2, delay=0.4),
      g4_circle('', TCX - TI, TCY - TI, 2 * TI, fill='rgba(250,248,243,.35)', border=INK_, bw=2, delay=0.6),
      *[Ic('user', sx - 36, SY, size=72, sw=5, at='大部分的学生', delay=0.08 * k) for k, sx in enumerate(SXS)],
      *g4_aim,
      Lab('好的 GPA', TCX, TCY - 214, at='好的GPA', size=32, align='center'),
      Lab('master', TCX, TCY - 140, at='考一个master', size=32, align='center'),
      g4_circle('好工作', TCX - TI, TCY - TI, 2 * TI, at='找一个好工作', tsize=40, pad={'padding': '0'}),
      Ic('user', SXS[0] - 36, SY, size=72, sw=5, color='red', at='爱折腾的学生', dur=0.6),
      Ic('user', SXS[-1] - 36, SY, size=72, sw=5, color='red', at='爱折腾的学生', dur=0.6, delay=0.15),
      *g4_off,
      Hd('爱折腾的少数', 540, 980, at='占少数的', size=64, color='red', align='center'),
      Lab('（不三不四的人）', 540, 1068, at='不三不四的人', size=28, color='gray', align='center'))

# 7. a fork: the common road goes straight on, the red branch turns off --------------------------------------- 18.6 s
FX, FY = 300, 720
scene('我们这种不三不四',
      Ic('target', FX - 40, 160, size=80, sw=5),
      Lab('一致的目标', FX + 58, 182, size=30, color='gray', delay=0.3),
      g4_vl(FX, 250, FY - 250, color='light', thick=6),
      g4_vl(FX, FY, 200, color='ink', thick=6),
      g4_node(FX, FY + 200),
      g4_line(FX, FY, 520, -58, color=RED_, thick=6, delay=0.5),
      g4_node(FX, FY, red=True, delay=0.4),
      g4_node(FX + 276, FY - 441, red=True, delay=1.3),
      Hd('畅想未来', 660, 330, at='喜欢畅想未来', size=64),
      Hd('聊人生', 580, 430, at='喜欢聊人生', size=64),
      Hd('尝不确定性', 500, 530, at='不确定性的事情', size=64),
      Hd('折腾人生', 420, 630, at='折腾一下自己的人生', size=64),
      P('大家都有不一样的选择', 380, 884, at='大家都有不一样的选择', size=42))

# 8. a platform: the people who want to talk about the same things ------------------------------------------- 14 s
scene('大学可以让我们直接接触到',
      Box('大学', 60, 640, 960, 96, style='dark', tsize=48, center=True),
      Ic('user', 275, 508, size=150, color='red', delay=0.3),
      Ic('user', 455, 508, size=150, color='red', delay=0.45),
      Ic('user', 95, 508, size=150, at='聊同样事情的人'),
      Ic('user', 635, 508, size=150, at='聊同样事情的人', delay=0.15),
      Ic('user', 815, 508, size=150, at='聊同样事情的人', delay=0.3),
      Bub('聊同样的事情', 640, 370, at='聊同样事情的人', delay=0.5),
      Bub('一起尝试', 250, 370, at='一起尝试'),
      Hd('一个很好的平台', 540, 790, at='所以大学就是', size=84, align='center'))

# 9. 「我很幸运」 ---------------------------------------------------------------------------------------------- 6.7 s
scene('我很幸运我能遇见吴老师',
      {'kind': 'quote', 'text': '「我很幸运，\n能遇见吴老师。」', 'x': X, 'y': 300, 'size': 84, 'at': None},
      Rule(X, 560, 200, at='我很幸运+0.8'),
      P('不然，不知道什么时候\n才遇见这样的人', X, 600, at='如果不是吴老师', size=40, color='gray'),
      Ic('clock', 500, 604, size=96, sw=5, at='以后什么时候', color='red'))

# 10. outside school: circles of other people -------------------------------------------------------------- 14.3 s
scene('而且不光是学校好了',
      g4_circle('学校', 60, 350, 300, fill='rgba(250,248,243,.55)', border=INK_, tsize=64),
      K('学 校 以 外', 590, 180, at='学校以外'),
      Arr(404, 500, 128, at='学校以外'),
      Lab('学生的身份', 468, 446, at='以学生的身份', size=28, color='gray', align='center'),
      Lab('其他的身份', 468, 528, at='其他的身份', size=28, color='gray', align='center'),
      g4_circle('社团', 590, 240, 230, at='不一样的社团'),
      g4_circle('兴趣班', 790, 420, 230, at='兴趣班'),
      g4_circle('把兴趣\n表达出来', 590, 600, 230, at='表达出来', tsize=40))

# 11. two circles overlap: 共同的相似点 ---------------------------------------------------------------------- 7.8 s
scene('去做一些自己认为正确的道路',
      g4_circle('我', 150, 250, 460, fill='rgba(196,52,44,.07)', border=INK_, tsize=72, pad={'paddingRight': '160px'}),
      K('慢 慢 会 发 现', X, 180, at='慢慢的发现'),
      g4_circle('这个人', 470, 250, 460, at='慢慢的发现', fill='rgba(196,52,44,.07)', border=RED_, tsize=72, pad={'paddingLeft': '150px'}),
      g4_node(540, 480, at='原来这个人和我', red=True),
      g4_vl(540, 500, 230, at='原来这个人和我', color='red', thick=4, delay=0.2),
      Hd('共同的相似点', 540, 750, at='原来这个人和我', size=84, color='red', align='center', delay=0.6))
