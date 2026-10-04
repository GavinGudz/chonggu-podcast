# ch 13 外部评价 (吴原同) -- designer g7
# Thread: 学校盖章 (the one stamp of this part), a judgement tested by time on a plain timeline (the show's ruler is
# kept for scores and rankings), the screening tool as a flow (world -> filter -> a short list), days squeezed into
# minutes, a viewfinder for the camera app.

GRAY2 = {'color': 'var(--gray2)'}


def _node(x, y, at=None, red=False, r=11, **kw):
    """timeline dot: hollow ink ring, or a filled red dot; r = radius in px"""
    css = {'width': f'{2 * r}px', 'height': f'{2 * r}px', 'borderRadius': f'{r}px', 'margin': f'{-r}px 0 0 {-r}px'}
    return {'kind': 'node', 'x': x, 'y': y, 'at': at, 'red': red, 'css': css, **kw}


# 13a  the June conclusion: the dividend is not in 专业 / 岗位 (struck); 资本市场 stays small and grey
scene('然后今年六月份的时候',
      K('今 年 6 月 · 一 个 结 论', y=200),
      Hd('时代红利', y=255, at='时代红利', size=150),
      Ic('book', X + 30, 470, size=130, at='不在专业'),
      Ic('building', X + 410, 470, size=130, at='岗位上'),
      Swap('专业', '', X, 620, at='不在专业', strike_at='岗位上', size=120),
      Swap('岗位', '', X + 380, 620, at='岗位上', strike_at='岗位上+0.4', size=120),
      P('而是在资本市场里', X, 810, at='而是在资本市场里', size=36, css=GRAY2))

# 13b  内部评价 = the school's stamp; 外部评价 = results and other people's marks
scene('所以我开始涉足资本市场',
      K('去 做 A I 项 目', y=200, at='去做AI项目'),
      Box('内部评价', X, 260, 450, 400, tsize=60, css={'justifyContent': 'flex-start', 'paddingTop': '36px'}),
      Box('外部评价', 570, 260, 450, 400, at='外部评价的东西', style='pink', tsize=60,
          css={'justifyContent': 'flex-start', 'paddingTop': '36px'}),
      *[Ic('star', 600 + i * 80, 420, size=66, at='外部评价就是', delay=0.18 * i, color='red', sw=5) for i in range(5)],
      Stamp('学校盖章', X + 70, 440, at='学校盖章', size=58, rot=-8),
      P('结果 · 别人来打分', 600, 540, at='靠结果', size=34))

# 13c  tested by time: a judgement (hollow dot) -- some time -- a result (red dot). A plain line, not the ruler.
_TY = 720            # timeline y
_TX0, _TX1 = X + 30, 990
scene('我想要的是那种',
      K('我 想 要 的', y=200),
      P('自己主动出击，不等别人发证书', X, 258, at='自己主动出击', size=40, css=GRAY2),
      Hd('自己就能\n被检验', y=330, at='自己就能被检验', size=124),
      _node(_TX0, _TY, at='一个判断对不对', r=16),
      Lab('一个判断', _TX0 - 16, _TY + 34, at='一个判断对不对+0.2', size=34),
      HL(_TX0 + 22, _TY - 1, _TX1 - _TX0 - 44, at='过一段时间', color='#8e8a83', thick=3, dur=1.6),
      Lab('过 一 段 时 间', (_TX0 + _TX1) / 2, _TY - 58, at='过一段时间+0.3', align='center', size=28,
          css={'color': 'var(--gray)'}),
      _node(_TX1, _TY, at='就会有结果', red=True, r=20),
      Lab('结果', _TX1 - 70, _TY + 34, at='就会有结果+0.2', size=44, css={'color': 'var(--red)'}),
      Tag('不 聊 买 卖 和 收 益 · 不 构 成 投 资 建 议', X, 880, at='不聊所谓的买卖',
          css={'color': 'var(--gray2)', 'borderColor': 'var(--light)'}))

# 13d  project one: the whole world's companies -> a quick filter -> a short list; days squeezed into minutes
_FY = 470            # top of the flow row
scene('就是我自己也做了几个AI项目',
      K('公 开 在 网 上', y=200, at='公开在网上'),
      Hd('几个 AI 项目', y=250, at='也做了几个AI项目', size=100),
      P('一个 AI 工具：Jev', X, 386, at='一个东西叫Jev', size=36, css=GRAY2),
      Ic('globe', X, _FY, size=190, at='读取全世界公司', sw=3.5),
      Lab('全世界的公司', X + 95, _FY + 206, at='读取全世界公司+0.3', align='center', size=28, css={'color': 'var(--gray2)'}),
      Arr(X + 214, _FY + 95, 64, at='快速筛选工具'),
      Box('快速筛选', X + 300, _FY + 10, 290, 170, at='快速筛选工具', style='pink', tsize=52, center=True),
      Arr(X + 614, _FY + 95, 64, at='快速筛选工具+0.5'),
      HL(X + 700, _FY + 46, 220, at='快速筛选工具+0.8', color='red', thick=16, css={'borderRadius': '8px'}),
      HL(X + 700, _FY + 86, 170, at='快速筛选工具+1.0', color='#b9b3a8', thick=16, css={'borderRadius': '8px'}),
      HL(X + 700, _FY + 126, 196, at='快速筛选工具+1.2', color='#b9b3a8', thick=16, css={'borderRadius': '8px'}),
      Lab('几 天', X, 742, at='几天的筛选时间', css={'fontSize': '32px'}),
      HL(X + 160, 758, 800, at='几天的筛选时间', thick=14, color='#b9b3a8', dur=1.8, css={'borderRadius': '7px'}),
      Lab('几 分 钟', X, 812, at='压缩到几分钟', css={'fontSize': '32px', 'color': 'var(--red)'}),
      HL(X + 160, 828, 56, at='压缩到几分钟', thick=14, color='red', dur=0.25, css={'borderRadius': '7px'}))

# 13e  project two: a camera that recognises what you shoot; no score, the users decide
_x0, _y0, _S, _L, _T = X, 270, 420, 72, 6
scene('然后呢然后我还做了一个小应用',
      K('还 有 一 个 小 应 用', y=200),
      Box('', _x0, _y0, _S, _S),
      HL(_x0 + 18, _y0 + 18, _L, at='打开摄像头', color='red', thick=_T),
      {'kind': 'vline', 'x': _x0 + 18 + _T / 2, 'y': _y0 + 18, 'h': _L, 'at': '打开摄像头', 'color': 'red', 'thick': _T},
      HL(_x0 + _S - 18 - _L, _y0 + 18, _L, at='打开摄像头', color='red', thick=_T),
      {'kind': 'vline', 'x': _x0 + _S - 18 - _T / 2, 'y': _y0 + 18, 'h': _L, 'at': '打开摄像头', 'color': 'red', 'thick': _T},
      HL(_x0 + 18, _y0 + _S - 18 - _T, _L, at='打开摄像头', color='red', thick=_T),
      {'kind': 'vline', 'x': _x0 + 18 + _T / 2, 'y': _y0 + _S - 18 - _L, 'h': _L, 'at': '打开摄像头', 'color': 'red', 'thick': _T},
      HL(_x0 + _S - 18 - _L, _y0 + _S - 18 - _T, _L, at='打开摄像头', color='red', thick=_T),
      {'kind': 'vline', 'x': _x0 + _S - 18 - _T / 2, 'y': _y0 + _S - 18 - _L, 'h': _L, 'at': '打开摄像头', 'color': 'red', 'thick': _T},
      {'kind': 'node', 'x': _x0 + 52, 'y': _y0 + 52, 'red': True, 'at': '打开摄像头', 'delay': 0.5},
      Ic('eye', _x0 + _S / 2 - 90, _y0 + _S / 2 - 90, size=180, at='能认出'),
      P('能认出你拍的是什么', _x0, _y0 + _S + 26, at='你拍的是什么', size=36),
      Lab('好 不 好 用', 580, 300, at='好不好用', css={'color': 'var(--gray2)', 'fontSize': '30px'}),
      Swap('分数', '用的人\n说了算', 580, 350, at='这些东西没有分数', strike_at='没有分数+0.45', to_at='用的人说了算', size=104))

# 13f  months ago: "no point"; these days: editing the CV -- 人就是这么矛盾
scene('当然我没有完全不在乎',
      K('没 有 完 全 不 在 乎', y=150),
      P('前 几 个 月', X, 220, at='前几个月', size=30, css={'color': 'var(--gray2)', 'fontWeight': 600}),
      {'kind': 'quote', 'text': '「花精力找实习，\n没意义。」', 'x': X, 'y': 280, 'size': 54, 'at': '找实习没意义'},
      {'kind': 'vline', 'x': 560, 'y': 220, 'h': 300, 'at': '但这几天'},
      Lab('这 几 天', 610, 220, at='但这几天', css={'color': 'var(--red)', 'fontSize': '30px'}),
      Ic('doc', 600, 270, size=170, at='改简历'),
      Ic('pen', 720, 320, size=130, at='改简历', delay=0.35, color='red'),
      P('改简历，也找实习', 610, 470, at='也找实习', size=38),
      Marker('人就是这么矛盾', X, 600, at='人就是这么矛盾', size=88))
