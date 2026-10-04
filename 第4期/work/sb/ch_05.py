# 第 4 期 · 05 先去做（顾东政）
# Threads: the red start dot and the gray "？" (S1, S8), the red road (S3 拯救自己 -> S9 改变自己),
# the key (S4 找到帮助我的东西 -> S8 一个实习 opens the first door). One Stamp only (S6b 不重要, a verdict);
# the envelope carries a round wax seal instead; people are line icons ('user'), never avatar tiles.
import math

SERIF = {'fontFamily': 'var(--serif)', 'fontWeight': '900'}


def SL(text, x, y, at=None, size=48, color=None, **kw):        # serif label
    css = dict(SERIF, **kw.pop('css', {}))
    d = {'kind': 'label', 'text': text, 'x': x, 'y': y, 'at': at, 'size': size, 'css': css, **kw}
    if color:
        d['color'] = color
    return d


def Line(x, y, w, rot=0, at=None, color='ink', thick=3, **kw):   # a drawn line from (x, y) at angle rot (deg)
    col = {'ink': '#1b1915', 'gray': '#b3ada3', 'red': '#c4342c'}[color]
    return {'kind': 'strike', 'x': x, 'y': y - thick / 2, 'w': w, 'rot': rot, 'at': at,
            'css': {'background': col, 'height': f'{thick}px'}, **kw}


def Seg(x0, y0, x1, y1, at=None, **kw):
    return Line(x0, y0, math.hypot(x1 - x0, y1 - y0), math.degrees(math.atan2(y1 - y0, x1 - x0)), at, **kw)


def Dot(x, y, r, at=None, red=True):
    return {'kind': 'node', 'x': x, 'y': y, 'at': at, 'red': red,
            'css': {'width': f'{2 * r}px', 'height': f'{2 * r}px', 'borderRadius': f'{r}px', 'margin': f'{-r}px 0 0 {-r}px'}}


def Ring(cx, cy, r, at=None, color='#c4342c', thick=4):
    return {'kind': 'label', 'text': '', 'x': cx - r, 'y': cy - r, 'at': at,
            'css': {'width': f'{2 * r}px', 'height': f'{2 * r}px', 'border': f'{thick}px solid {color}', 'borderRadius': f'{r}px'}}


def Veil(x, y, w, h, at=None):
    return {'kind': 'label', 'text': '', 'x': x, 'y': y, 'at': at,
            'css': {'width': f'{w}px', 'height': f'{h}px', 'background': 'rgba(236,232,224,.74)', 'filter': 'blur(24px)'}}


def Seal(text, cx, cy, r, at=None, size=38):                     # a red wax seal (round, not a rubber stamp)
    return {'kind': 'label', 'text': text, 'x': cx - r, 'y': cy - r, 'at': at,
            'css': {'width': f'{2 * r}px', 'height': f'{2 * r}px', 'borderRadius': f'{r}px', 'background': '#c4342c',
                    'color': '#f4f1eb', 'font': f'900 {size}px/{2 * r}px var(--serif)', 'textAlign': 'center',
                    'letterSpacing': '2px', 'boxShadow': '0 0 0 6px rgba(196,52,44,.18)'}}


def Bar(x, y, w, at=None):                                       # a filled-in form field (value withheld)
    return {'kind': 'hline', 'x': x, 'y': y, 'w': w, 'at': at, 'thick': 20, 'color': '#bdb7ac', 'css': {'borderRadius': '10px'}}


def Chip(text, x, y, w, rot, at=None, size=46):                   # a credential sticker
    return Box(text, x, y, w, 100, at=at, tsize=size, center=True, css={'rotate': f'{rot}deg', 'background': 'rgba(250,248,243,.9)'})


# ---------------------------------------------------------------- 1  不知道做什么？没关系 —— 从自己出发
scene('那么如果一个年轻人',
      K('不 知 道 做 什 么', y=200),
      Big('？', x=900, y=500, size=230, color='gray'),
      Hd('没关系。', y=250, size=150, at='没有关系'),
      Dot(110, 640, 22, at='从自己的生活'),
      SL('自己的生活', 70, 690, at='从自己的生活', size=40),
      SL('感兴趣的事', 70, 746, at='自己感兴趣', size=40, color='red'),
      Arr(150, 640, 620, at='出发'),
      Lab('出 发', 400, 585, at='出发', size=30, color='red'))

# ---------------------------------------------------------------- 2a  一封邀请
scene('不知道最近同学们',
      K('一 封 邀 请', x=120, y=190),
      Box('', 120, 390, 840, 460),
      Seg(120, 391, 540, 670, at='不知道最近同学们+0.5', thick=2),
      Seg(960, 391, 540, 670, at='不知道最近同学们+0.7', thick=2),
      Hd('a16z', x=116, y=236, size=104, at='a16z', css={'fontFamily': 'var(--sans)', 'fontWeight': '700', 'letterSpacing': '0'}),
      Lab('投资风投公司', 400, 296, at='投资风投公司', size=34, color='gray'),
      Seal('邀请', 540, 670, 60, at='学校的邀请'),
      SL('致 东政', 720, 770, at='有发邀请给我', size=40),
      Lab('因为', 120, 920, at='因为我确实', size=36, color='gray'),
      Marker('不错的项目', 220, 894, at='不错的项目', size=66))

# ---------------------------------------------------------------- 2b  副总裁：全力支持你 (a pull quote, line icon)
QX, QY, QS = 166, 400, 84                      # quote origin and size; .quote line-height is 1.4
scene('副总裁告诉我',
      Ic('user', 60, 196, size=100),
      SL('公司副总裁', 182, 220, size=50),
      HL(60, 336, 960, at='副总裁告诉我+0.4', color='light', thick=2),
      {'kind': 'quotemark', 'x': 36, 'y': 360, 'at': '东政我会全力支持'},
      HL(QX + 2 * QS - 6, QY + int(1.4 * QS) + int(QS * 0.62), 4 * QS + 12, at='我认为那帮学生',
         color='#f1d9d3', thick=44),          # pink band behind 全力支持 (drawn first, sits behind the quote)
      {'kind': 'quote', 'text': '东政，\n我会全力支持你\n申请这个学校。', 'x': QX, 'y': QY, 'size': QS,
       'cps': 7, 'at': '东政我会全力支持'},
      SL('—— 我也是这么觉得的。', QX, 830, at='我也是这么觉得的', size=40, color='gray'))

# ---------------------------------------------------------------- 3  职高 -> 一条拯救自己的道路 (now first, then the road back to it)
EX, EY = 900, 330                              # where he is now (the road's end)
scene('这个时候你就发现',
      K('突 然 之 间 ？', y=190),
      Box('', EX - 22, EY - 22, 44, 44, at='这个时候你就发现+0.5', style='dark',    # the red 'now' dot (a box: shows at once)
          css={'borderRadius': '22px', 'background': '#c4342c', 'borderColor': '#c4342c', 'padding': '0'}),
      Lab('现在', EX + 42, EY - 22, at='这个时候你就发现+0.7', size=32, color='gray'),
      Lab('之前', 60, 770, at='我之前也是', size=32, color='gray'),
      Box('上职高的学生', 60, 820, 400, 120, at='上职高的学生', tsize=48),
      Seg(260, 812, EX - 16, EY + 12, at='踏上了一条', color='red', thick=7),
      SL('拯救自己的道路', 410, 236, at='拯救自己', size=60, color='red'))

# ---------------------------------------------------------------- 4  一条理念：就算不知道，也要去做 -> 积累
XS = [100 + 128 * k for k in range(8)]
scene('我拥有一条理念',
      K('一 条 理 念', y=190),
      Hd('就算不知道，', y=240, size=104, at='就算我现在不知道'),
      Hd('也要去做。', y=372, size=104, color='red', at='那我也要去做'),
      HL(80, 640, 920, at='直到我在这个过程中', color='light', thick=3),
      *[Node(x, 641, at=f'直到我在这个过程中+{0.32 * k:.2f}') for k, x in enumerate(XS)],
      Ic('key', XS[4] - 55, 500, size=110, at='帮助到我的东西', color='red'),
      SL('帮助到我的东西', XS[4] - 140, 684, at='帮助到我的东西', size=34),
      HL(XS[0], 639, XS[-1] - XS[0], at='也能积累', color='red', thick=6, dur=1.6),
      *[Node(x, 641, at=f'也能积累+{0.2 * k:.2f}', red=True) for k, x in enumerate(XS)],
      Hd('积累', x=XS[-1] - 150, y=690, size=80, color='red', at='实际意义上的积累'))

# ---------------------------------------------------------------- 5  机会来时：东西 · 经验 · 故事
COLS = [(220, 'doc', '东西', '可以展示', '我有东西', '给他们展示'),
        (540, 'stairs', '经验', '可以告诉他', '我有经验', '告诉他'),
        (860, 'book', '故事', '可以告诉你', '我有故事', '告诉你')]
scene('等待合适机会出现的时候',
      Hd('机会来的时候', y=200, size=96),
      *[e for cx, ic, w, sub, a1, a2 in COLS for e in (
          Ic(ic, cx - 85, 400, size=170, at=a1),
          Hd(w, x=cx, y=600, size=84, align='center', at=a1),
          Lab(sub, cx, 716, at=a2, size=32, color='gray', align='center'))])

# ---------------------------------------------------------------- 6a  不是告诉你：一张填满的简历
scene('不是告诉你',
      K('不 是 告 诉 你', y=190),
      Box('', 160, 250, 760, 620),
      SL('我是一个', 210, 300, at='我是一个', size=46),
      HL(410, 350, 210, at='我是一个+0.6', color='red', thick=4),
      SL('的学生', 640, 300, at='我是一个+0.6', size=46),
      HL(210, 400, 660, at='我是一个+0.9', color='light'),
      SL('学习', 210, 440, at='我学习很', size=40, color='gray'), Bar(370, 462, 380, at='我学习很+0.3'),
      SL('GPA', 210, 540, at='GPA', size=40, color='gray'), Bar(370, 562, 430, at='GPA+0.3'),
      SL('学位', 210, 640, at='二类的学位', size=40, color='gray'), Bar(370, 662, 300, at='二类的学位+0.3'),
      SL('学校', 210, 740, at='北大清华', size=40, color='gray'),
      SL('北大清华', 370, 736, at='北大清华', size=46),
      SL('· 北上广交', 570, 736, at='北上广交', size=46))

# ---------------------------------------------------------------- 6b  也拿过、也进过 —— 对我而言，不重要
scene('我在美国什么',
      K('也 拿 过 · 也 进 过', y=190),
      Chip('scholarship', 90, 270, 380, -4, at='scholarship'),
      Chip('UCSD', 580, 250, 230, 5, at='UCSD'),
      Chip('UCSB', 660, 420, 230, -3, at='UCSB'),
      Chip('NYU', 200, 430, 200, 4, at='NYU'),
      Chip('同济 · 交换', 330, 590, 380, -2, at='同济大学'),
      SL('对于我而言，', 540, 770, at='对于我而言', size=40, color='gray', align='center'),
      Veil(60, 230, 960, 500, at='这些都不重要'),
      Stamp('不重要', 540, 380, at='都不重要', size=110, rot=-8, align='center'))

# ---------------------------------------------------------------- 7  最重要的：不断去做 —— 做、做、做、做，一次比一次重
DO = [(155, 110, '#d3cdc3'), (325, 150, '#aaa49a'), (540, 200, '#1b1915'), (820, 280, '#c4342c')]   # centre x, size, ink
DO_AT = ['最重要的是什么呢+0.5', '不断去做', '不断去做+0.3', '不断去做+0.6']
scene('最重要的是什么呢',
      K('最 重 要 的 是', x=540, y=190, align='center'),
      *[Big('做', x=cx, y=600 - round(1.1 * s), at=DO_AT[k], size=s, color=c) for k, (cx, s, c) in enumerate(DO)],
      Marker('自己想做的事', 252, 650, at='不断去做+1.0', size=96),
      Lab('这才是最有意义的事', 540, 810, at='最有意义', size=36, color='gray', align='center'))

# ---------------------------------------------------------------- 8  一个实习，打开第一扇门：让别人看到我
scene('那么这一段实习',
      K('这 段 实 习 的 启 发', x=60, y=150),
      Door(210, 330, w=360, h=560, label='', inside='让别人\n看到我', open_at='那么这第一扇门', isize=68, at='如果一个实习'),
      SL('第一扇门', 390, 252, at='打开第一扇门', size=50, align='center'),
      Ic('key', 630, 330, size=110, at='如果一个实习+0.1', color='red'),
      SL('一个实习', 760, 364, at='如果一个实习', size=46),
      SL('之前做的项目', 630, 580, at='之前所做的项目', size=42),
      Arr(720, 650, 100, at='是否会影响', dir_='d'),
      SL('继续走下去', 630, 768, at='继续走下去', size=48, color='red'),
      Big('？', x=972, y=736, size=150, color='gray', at='继续走下去+0.4'))

# ---------------------------------------------------------------- 9  年轻人：不被干预，相信自己
CX, CY, R = 540, 500, 140
GAP = 14                       # lines stop just short of the ring
scene('我觉得我们年轻人啊',
      Hd('自己', x=CX, y=CY - 80, size=110, color='red', align='center', at='按照自己'),
      Lab('想做的事', CX, CY + 52, at='想做的事情', size=34, color='gray', align='center'),
      SL('规则', 70, CY - 38, at='规则', size=56, color='gray'),
      Line(200, CY, CX - R - GAP - 200, 0, at='规则+0.25', color='gray'),
      SL('父母', CX, CY - R - 196, at='父母', size=56, color='gray', align='center'),
      Line(CX, CY - R - 112, 112 - GAP, 90, at='父母+0.25', color='gray'),
      SL('身边的人', CX, CY + R + 120, at='身边的人', size=56, color='gray', align='center'),
      Line(CX, CY + R + 112, 112 - GAP, -90, at='身边的人+0.25', color='gray'),
      Ring(CX, CY, R, at='所干预'),
      K('年 轻 人 最 重 要 的', x=CX, y=CY + R + 236, align='center', at='最重要的是'),
      Hd('相信自己', x=CX, y=CY + R + 276, size=120, align='center', at='相信自己'),
      Arr(CX + R + 10, CY, 310, at='踏上那条'),
      Lab('改变自己的道路', CX + R + 20, CY + 22, at='改变自己的道路', size=34, color='red'))
