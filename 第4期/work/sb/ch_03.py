# 03 学历承载的期望 (顾东政) — one illustrated idea per scene:
#   A inverted pyramid: one small 学历 block carrying ever wider expectations (Stack)
#   B the buildings students want to get into (国企 · 央企 · 私企); what they look for there: 安全感
#   C a line of school years like a metro line: terminal 完成学历, the hoped-for internship; the line goes on to "?"
#   D 美国 K12 (stairs) -> plane -> 澳大利亚 大学 (cap); 3 countries
#   E 人生一览无余, struck; past the climbed hill, bigger mountains: 创业, 好的工作 = new problems
#   F 良好的应试教育 —/→ 未来的不确定 (the arrow is cut)


def STRIKE(x, y, w, at, rot=0, **kw):
    return {'kind': 'strike', 'x': x, 'y': y, 'w': w, 'at': at, 'rot': rot, **kw}


def ICN(name, cx, by, size, at, bottom=0.9, mid=0.5, **kw):
    """icon by its centre x and its bottom y (bottom/mid = where the drawing ends / centres in the 100 box);
    the stroke is scaled so every icon draws with about the same 6 px line."""
    return Ic(name, round(cx - mid * size), round(by - bottom * size), size=size, at=at, sw=round(600 / size, 2),
              css={'lineHeight': '0'}, **kw)     # line-height 0: the svg sits exactly at y (no font strut above it)


# ---- A  学历 carries a pile of expectations, widest on top (top-heavy)
_SB, _H, _G = 900, 112, 12
_yb = lambda i: _SB - (i + 1) * _H - i * _G
scene('我们的学历承载的期望',
      K('学 历 承 载 的 期 望', x=540, y=_yb(4) - 92, align='center'),
      Stack(400, _SB, w=280, h=_H, gap=_G, center=True, size=48, items=[
          {'text': '学历', 'style': 'dark', 'at': '我们的学历'},
          {'text': '好的知识', 'w': 440, 'dx': -80, 'at': '好的知识'},
          {'text': '好的工作', 'w': 600, 'dx': -160, 'at': '以及好的工作'},
          {'text': '好的婚姻', 'w': 760, 'dx': -240, 'at': '好的婚姻'},
          {'text': '安全感', 'w': 920, 'dx': -320, 'style': 'pink', 'size': 58, 'at': '最重要的安全感'},
      ]),
      Tag('太 多 了', 712, _yb(0) + 36, at='真的是太多了', css={'fontSize': '28px'}),
      Lab('漂亮 · 温柔', 742, _yb(3) + 36, at='老婆很漂亮', css={'color': 'var(--gray2)', 'fontSize': '30px'}))

# ---- B  a street of buildings: 国企 · 央企 · (乱七八糟的) 私企, and "我也是"; they look for 安全感
_GB = 470
_SX = [180, 420, 660, 900]          # slot centres
scene('大部分的学生想进国企央企',
      K('大 部 分 的 学 生 想 进', y=180),
      HL(X, _GB + 2, 960, at='大部分的学生', color='light', thick=3),
      ICN('building', _SX[0], _GB, 230, at='国企央企', mid=0.52),
      P('国企', _SX[0], _GB + 22, at='国企央企', size=40, align='center'),
      ICN('building', _SX[1], _GB, 230, at='国企央企+0.5', mid=0.52),
      P('央企', _SX[1], _GB + 22, at='国企央企+0.5', size=40, align='center'),
      ICN('building', _SX[2], _GB, 170, at='乱七八糟的私企', mid=0.52),
      P('私企', _SX[2], _GB + 22, at='乱七八糟的私企', size=40, align='center', css={'color': 'var(--gray2)'}),
      Hd('安全感', y=_GB + 120, size=170, color='red', at='追求的是一种安全感'),
      P('中年危机的时候，\n不被公司、\n不被时代抛弃', 620, _GB + 140, at='中年危机', size=38),
      ICN('user', _SX[3], _GB, 170, at='我也深受', bottom=0.88, color='red'),
      P('我也是', _SX[3], _GB + 22, at='我也深受+0.6', size=40, align='center', css={'color': 'var(--red)'}))

# ---- C  years of books like stations on a line -> terminal 完成学历 -> hoped-for internship;
#         after work: the line goes on, dashed, to a question
_RY, _R0, _R1, _RD = 560, 290, 640, 2.6
_stn = [330, 395, 460, 525, 590]
scene('我们读了这么多年书',
      ICN('book', 165, _RY + 84, 200, at='我们读了这么多年书', bottom=0.84),
      P('读了这么多年书', X, _RY + 120, at='我们读了这么多年书', size=38),
      HL(_R0, _RY - 3, _R1 - _R0, at='读了这么多年书', dur=_RD, thick=6),
      *[Node(x, _RY, at=f'读了这么多年书+{(x - _R0) / (_R1 - _R0) * _RD:.2f}') for x in _stn],
      {'kind': 'node', 'x': _R1, 'y': _RY, 'at': '完成这份学历以后', 'red': True,
       'css': {'width': '36px', 'height': '36px', 'borderRadius': '18px', 'margin': '-18px 0 0 -18px'}},
      P('完成学历', _R1, _RY + 40, at='完成这份学历以后', size=38, align='center'),
      Bub('能找到\n好的实习吗？', _R1 - 53, _RY - 262, at='一份好的实习', size=46),
      *[HL(_R1 + 32 + k * 46, _RY - 3, 26, at=f'我一直到工作之后+{0.18 * k:.2f}', dur=0.25, thick=6, color='light') for k in range(5)],
      Big('?', 958, _RY - 102, at='完成一段教育', size=186, align='center'),
      P('未来的问题', 1004 - 190, _RY + 92, at='未来的问题被解决了', size=38, css={'color': 'var(--red)'}))

# ---- D  美国 K12 (a staircase of grades) -> plane -> 澳大利亚 大学 (cap); 3 countries, 3 systems
scene('我不会因为自己接受过',
      K('我 不 会 因 为 …', y=180),
      ICN('stairs', 145, 420, 170, at='幼儿园到高中', bottom=0.88, mid=0.51, dur=2.2),
      Lab('美 国', X, 446, at='美国整体的', css={'color': 'var(--red)', 'fontSize': '30px'}),
      Hd('K12', X, 486, size=124, at='K12'),
      P('幼儿园到高中', X, 640, at='幼儿园到高中', size=38),
      ICN('plane', 500, 380, 120, at='我也读过国外的', bottom=0.84, color='red'),
      ICN('cap', 685, 420, 170, at='澳大利亚的大学', bottom=0.76),
      Lab('澳 大 利 亚', 600, 446, at='澳大利亚的大学', css={'color': 'var(--red)', 'fontSize': '30px'}),
      Hd('大学', 600, 486, size=124, at='澳大利亚的大学'),
      HL(X, 740, 960, at='三国不一样的教育体系', color='light'),
      Count(3, X, 790, at='三国不一样的教育体系', size=210, dur=0.9),
      P('个国家，\n不一样的教育体系', 210, 822, at='三国不一样的教育体系', size=44))

# ---- E  人生一览无余 (struck) — past the climbed hill (学历, red dot on top), bigger mountains: 创业, 好的工作
_GY = 800
scene('认为自己的人生一览无余',
      Hd('人生一览无余', y=200, size=104),
      STRIKE(52, 262, 640, at='但是当我想做其他的事情'),
      HL(X, _GY, 960, at='一览无余', dur=0.9, thick=3),
      ICN('mountain', 175, _GY, 230, at='一览无余', bottom=0.86),
      Node(175 + (0.38 - 0.5) * 230, _GY - 0.56 * 230, at='$一览无余', red=True),
      P('学历', 175, _GY + 26, at='一览无余', size=38, align='center'),
      ICN('mountain', 470, _GY, 300, at='我想创业', bottom=0.86, color='red'),
      P('创业', 470, _GY + 26, at='我想创业', size=38, align='center', css={'color': 'var(--red)'}),
      ICN('mountain', 820, _GY, 380, at='一份好的工作', bottom=0.86, color='red'),
      P('好的工作', 820, _GY + 26, at='一份好的工作', size=38, align='center', css={'color': 'var(--red)'}),
      K('新 的 问 题 就 会 出 现', x=520, y=420, at='新的问题就会出现'))

# ---- F  良好的应试教育 —/→ 未来的不确定 (the arrow is cut)
scene('那么这个学历不意味着',
      K('这 个 学 历 不 意 味 着', y=180),
      Box('良好的应试教育', X, 240, 960, 180, at='良好的应试教育', style='dark', center=True, tsize=62),
      Arr(540, 445, 180, at='也能保证', dir_='d', color='ink'),
      STRIKE(466, 575, 170, at='有能力去应对', rot=-30),
      Tag('不 保 证', 616, 505, at='有能力去应对', css={'fontSize': '28px'}),
      Box('未来的不确定', X, 655, 960, 180, at='不确定情形', style='dashed', center=True, tsize=62))
