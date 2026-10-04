# 10 原来成绩是隐私 (吴原同). Thread: the corridor board of ch 09 goes private; the ruler of ch 09 is only swapped.
PINK = '#f1d9d3'


def VL(x, y, h, at=None, **kw):
    return {'kind': 'vline', 'x': x, 'y': y, 'h': h, 'at': at, **kw}


# A. Malaysia: a pre-university course is the bridge between 高中 and 大学
scene('然后到了后来我去马来西亚',
      K('后 来', y=200),
      Hd('马来西亚', y=240, size=128, at='马来西亚'),
      Ic('plane', 830, 250, 150, at='马来西亚'),
      HL(200, 580, 680, at='大学预科', color=PINK, thick=40, dur=0.9),
      HL(140, 598, 800, at='上高中', dur=0.9),
      Node(140, 600, at='上高中'),
      Lab('高中', 140, 640, at='上高中', align='center', size=38),
      Lab('大学预科', 540, 500, at='大学预科', align='center', color='red', size=46),
      Node(940, 600, at='上大学前'),
      Lab('大学', 940, 640, at='上大学前', align='center', size=38),
      Lab('衔 接', 540, 640, at='衔接课程', align='center', size=30, color='gray'))

# B. a score, redacted: 成绩 -> 隐私
scene('在那里我第一次遇到',
      K('在 那 里 ， 第 一 次', 540, 200, align='center'),
      Hd('成绩', 250, 252, size=120, at='原来成绩这种东西'),
      Count(98, 566, 246, at='成绩这种东西', color='ink', size=150, dur=0.8),
      HL(548, 256, 196, at='原来它是隐私', thick=136, dur=0.4),
      Big('隐私', 540, 452, at='原来它是隐私', size=250))

# C. the corridor board of ch 09 comes back already filled (the same board), then goes private: blur + lock
scene('当时我还在国内高中的时候',
      K('那 时 ， 国 内 高 中 的 走 廊', y=200),
      Board(X, 262, 960, title='成绩榜', subtitle='走 廊', stagger=0.01,
            rows=[{'rank': '1', 'score': '98', 'hot': True},
                  {'rank': '2', 'score': '95'},
                  {'rank': '3', 'score': '93'},
                  {'rank': '4', 'score': '90'},
                  {'rank': '5', 'score': '88'}],
            blur_at='成绩不会被挂在走廊上'),
      Bub('絮絮叨叨', 716, 166, at='絮絮叨叨'),
      Tag('马 来 西 亚', X, 806, at='成绩不会被挂在走廊上', size=30),
      P('分数，只有你自己知道', X, 866, at='你考多少', size=44))

# D. besides study: projects, podcasts, sport -> an outsized application result
scene('然后老师还会鼓励大家',
      K('除 了 学 习', y=200, at='除了学习'),
      Ic('book', 110, 262, 140),
      P('学习', 180, 420, size=38, align='center', color='gray'),
      VL(300, 250, 230, at='除了学习'),
      Ic('bulb', 350, 262, 140, at='自己的项目'),
      Lab('项目', 420, 424, at='自己的项目', align='center', size=38),
      Ic('mic', 590, 262, 140, at='自己的播客'),
      Lab('播客', 660, 424, at='自己的播客', align='center', size=38),
      Ic('target', 830, 262, 140, at='运动项目'),
      Lab('运动', 900, 424, at='运动项目', align='center', size=38),
      Lab('成绩差', 180, 482, at='原来成绩差的人', align='center', size=32, color='gray'),
      HL(330, 492, 660, at='在其他地方优秀', color='red', thick=5),
      Lab('优秀', 660, 508, at='在其他地方优秀', align='center', size=34, color='red'),
      Arr(660, 566, 96, at='一样可以拿到', dir_='d'),
      Box('夸张的申请结果', 330, 690, 660, 128, at='非常夸张的申请结果', style='pink', tsize=60, center=True))

# E. one friend: a so-so SAT bar, then one big red 1 -- the only one of the school into Harvard
scene('就像是我认识一个朋友',
      K('我 认 识 的 一 个 朋 友', y=200),
      P('SAT', X, 256, size=40, css={'fontWeight': '900'}),           # content at the cut (keeps the big 1 on its word)
      HL(180, 284, 520, color='light', thick=18, delay=0.3, css={'borderRadius': '9px'}),
      HL(180, 284, 250, at='考得也不怎么样', color='#8e8a83', thick=18, dur=1.0, css={'borderRadius': '9px'}),
      Lab('一般', 730, 266, at='考得也不怎么样', size=36, color='gray'),
      HL(X, 380, 960, at='但是他真的', color='light'),
      Lab('全 校', X, 420, at='但是他真的+0.4', size=34, color='gray'),
      Big('1', 290, 400, at='唯一一个', size=500),
      Arr(470, 690, 150, at='进了哈佛'),
      Ic('school', 660, 560, 210, at='进了哈佛'),
      Lab('哈佛', 765, 790, at='进了哈佛+0.3', align='center', size=44, css={'fontWeight': '900'}))

# F. not one ruler, but only a new ruler: 分数 -> 世界排名, and the QS searches
scene('然后我当时就意识到',
      Marker('不止一把尺子', X, 200, at='原来不是一把尺子', size=88),
      Ruler(X, 370, 960, ticks=10,
            dot={'from': 0.2, 'to': 0.86, 'at': '并没有因此放下学历', 'slide_at': '世界排名', 'dur': 1.4}),
      Swap('分数', '世界排名', X, 540, strike_at='把尺子换了一把', to_at='世界排名', size=104),
      Box('　　QS 排名', 580, 548, 400, 76, at='一次次', tsize=32),
      Ic('search', 600, 566, 40, at='一次次', dur=0.5),
      Box('　　QS 排名', 600, 644, 400, 76, at='去查这种', tsize=32),
      Ic('search', 620, 662, 40, at='去查这种', dur=0.5),
      Box('　　QS 排名', 620, 740, 400, 76, at='QS排名', tsize=32, style='pink'),
      Ic('search', 640, 758, 40, at='QS排名', dur=0.5))
