# 11 第一学期，AI 来了 (吴原同). Threads: the AI chat log (ch 08); AI drawn small beside a person, later big;
# code lines on a page; ending on 复利 vs 贬值 (Curve).
PINK = '#f1d9d3'


def VL(x, y, h, at=None, **kw):
    return {'kind': 'vline', 'x': x, 'y': y, 'h': h, 'at': at, **kw}


def STRK(x, y, w, at=None, **kw):
    return {'kind': 'strike', 'x': x, 'y': y, 'w': w, 'at': at, **kw}


def QM(x, y, at=None, **kw):
    return {'kind': 'qmark', 'x': x, 'y': y, 'at': at, **kw}


# A. UNSW, computer science, met 顾老师; July last year he asked AI one question
scene('然后呢再后来我就去了',
      K('U N S W · 计 算 机', y=200),
      Ic('user', 60, 246, 110),
      P('我', 115, 362, size=30, align='center'),
      Ic('user', 200, 246, 110, at='遇到了顾老师'),
      Lab('顾老师', 255, 366, at='遇到了顾老师', size=30, align='center'),
      Chat(X, 440, 960, at='去年7月份', size=40,
           msgs=[{'who': 'me', 'text': '单纯写代码有用吗？', 'at': '单纯写代码有用吗', 'date': '去年 7 月'},
                 {'who': 'me', 'text': '我真正需要学的是什么？', 'at': '我真正需要学的是什么'}]),
      QM(800, 150, at='还没想明白', size=320))

# B. first term: Codex, Claude Code -- then still a small helper beside a person
scene('我接触到了AI',
      K('第 一 学 期', y=200),
      Ic('user', 150, 250, 330),
      Ic('robot', 490, 452, 128, at='接触到了AI+0.3'),
      Lab('Codex', 638, 458, at='接触到了Codex', size=40),
      Lab('Claude Code', 638, 512, at='ClaudeCode', size=40),
      Lab('只是一种工具', 494, 610, at='它只是一种', size=38, color='gray'))

# C. the exam page: no multiple choice, no blanks, only code that must pass tests -- and AI runs the tests itself
scene('我们的考试没有选择题',
      Box('', X, 200, 520, 640),
      Hd('考 试', 104, 228, size=60, cps=10),
      HL(104, 316, 432, delay=0.3),
      Lab('一、选择题', 104, 344, size=40, delay=0.4),
      STRK(98, 372, 210, at='没有选择题'),
      Lab('二、填空题', 104, 420, size=40, delay=0.55),
      STRK(98, 448, 210, at='没有填空题'),
      Marker('三、写代码，过测试', 104, 494, at='全是自己写代码', size=42),
      HL(104, 600, 380, at='全是自己写代码+0.6', color='light', thick=12),
      HL(144, 636, 300, at='全是自己写代码+0.9', color='light', thick=12),
      HL(144, 672, 340, at='然后过测试', color='light', thick=12),
      HL(184, 708, 220, at='然后过测试+0.3', color='light', thick=12),
      HL(104, 744, 320, at='这种题啊', color='light', thick=12),
      Ic('robot', 730, 200, 200, at='恰恰是', color='red'),
      Arr(830, 410, 52, at='跑得通跑不通', dir_='d'),
      Box('', 620, 480, 400, 300, at='跑得通跑不通'),
      HL(620, 480, 400, at='跑得通跑不通', thick=46, dur=0.5),
      Lab('测 试', 646, 488, at='跑得通跑不通+0.3', size=24, color='#f0ece4'),
      Lab('第 1 次', 646, 560, at='跑得通跑不通+0.3', size=30, color='gray'),
      Lab('未通过', 790, 560, at='跑得通跑不通+0.3', size=30, color='gray'),
      Lab('第 2 次', 646, 616, at='一测就知道', size=30, color='gray'),
      Lab('未通过', 790, 616, at='一测就知道', size=30, color='gray'),
      Hd('全部测试通过', 646, 676, at='一遍遍改', size=50, cps=9, color='red'))

# D. June this year, the bleak line to AI; the strongest person around vs AI
scene('于是今年六月份',
      K('很 丧 的 一 句 话', y=200),
      Chat(X, 250, 960, size=42,
           msgs=[{'who': 'me', 'text': '实话实说，\n我真觉得自己学习没有意义。', 'at': '很丧的话', 'date': '今年 6 月', 'hot': True}]),
      Lab('身边 UNSW 最强的人', X, 568, at='最强的人', size=34),
      HL(X, 624, 560, at='最强的人+0.3', thick=18, css={'borderRadius': '9px'}),
      Lab('AI', X, 672, at='不如AI', size=34, color='red'),
      HL(X, 728, 860, at='不如AI+0.2', thick=18, color='red', dur=1.1, css={'borderRadius': '9px'}))

# E. the lecturer: we can no longer tell who wrote it
scene('我们现在已经无法分辨',
      Lab('老师在 lecture 上说', X, 200, size=32, color='gray'),
      Hd('无法分辨', y=250, size=110, at='无法分辨'),
      Box('', X, 450, 400, 300, style='dark'),
      HL(100, 500, 250, delay=0.3, color='#8e8a83', thick=12),
      HL(140, 540, 200, delay=0.4, color='#8e8a83', thick=12),
      HL(140, 580, 260, delay=0.5, color='#c4342c', thick=12),
      HL(180, 620, 150, delay=0.6, color='#8e8a83', thick=12),
      HL(100, 660, 220, delay=0.7, color='#8e8a83', thick=12),
      Box('', 620, 450, 400, 300, style='dark', delay=0.15),
      HL(660, 500, 250, delay=0.45, color='#8e8a83', thick=12),
      HL(700, 540, 200, delay=0.55, color='#8e8a83', thick=12),
      HL(700, 580, 260, delay=0.65, color='#c4342c', thick=12),
      HL(740, 620, 150, delay=0.75, color='#8e8a83', thick=12),
      HL(660, 660, 220, delay=0.85, color='#8e8a83', thick=12),
      Big('=', 540, 520, at='无法分辨+0.5', size=150, align='center'),
      P('你写的？', 260, 778, at='是你写的', size=40, align='center'),
      P('AI 写的？', 820, 778, at='还是AI写的', size=40, align='center'))

# F. replacement, in his own field: the robot now big, the person small (mirror of B)
scene('然后当时我就开始意识到',
      Ic('user', 200, 450, 150),
      Lab('人', 275, 610, size=36, align='center'),
      Arr(352, 516, 220, at='对人的替代'),
      Ic('robot', 540, 240, 360, at='对人的替代+0.3', color='red', dur=1.1),
      Lab('AI', 720, 610, size=36, align='center', color='red', at='对人的替代+0.8'),
      Tag('就 在 我 学 的 这 一 行', 290, 700, at='就在我自己学的这一行', size=30))

# G. his judgement: this field now (a full row of people) -> within a year or two (a few, the rest empty places)
scene('就是我自己的判断',
      K('我 自 己 的 判 断', y=200),
      Ic('user', 68, 250, 80, delay=0.0),
      Ic('user', 164, 250, 80, delay=0.1),
      Ic('user', 260, 250, 80, delay=0.2),
      Ic('user', 356, 250, 80, delay=0.3),
      Ic('user', 452, 250, 80, delay=0.4),
      Ic('user', 548, 250, 80, delay=0.5),
      Ic('user', 644, 250, 80, delay=0.6),
      Ic('user', 740, 250, 80, delay=0.7),
      Ic('user', 836, 250, 80, delay=0.8),
      Ic('user', 932, 250, 80, delay=0.9),
      P('这一行的人', X, 350, size=30, color='gray'),               # content at the cut (keeps 一两年内 on its word)
      Lab('，包括 lecture 老师', 220, 357, at='包括我们的', size=30, color='gray'),
      Hd('一两年内', X, 430, size=96, at='一两年内', color='red'),
      Ic('user', 68, 600, 80, at='一两年内+0.0'),
      Ic('user', 164, 600, 80, at='一两年内+0.1'),
      Ic('user', 260, 600, 80, at='一两年内+0.2'),
      Ic('user', 356, 600, 80, at='一两年内+0.54', css={'filter': 'opacity(.2)'}),
      Ic('user', 452, 600, 80, at='一两年内+0.62', css={'filter': 'opacity(.2)'}),
      Ic('user', 548, 600, 80, at='一两年内+0.70', css={'filter': 'opacity(.2)'}),
      Ic('user', 644, 600, 80, at='一两年内+0.78', css={'filter': 'opacity(.2)'}),
      Ic('user', 740, 600, 80, at='一两年内+0.86', css={'filter': 'opacity(.2)'}),
      Ic('user', 836, 600, 80, at='一两年内+0.94', css={'filter': 'opacity(.2)'}),
      Ic('user', 932, 600, 80, at='一两年内+1.02', css={'filter': 'opacity(.2)'}))

# H. society has inertia: the technology can already, the jobs stay a while
scene('社会也有惯性',
      Ic('hourglass', X, 210, 200),
      K('社 会 也 有', 300, 214),
      Hd('惯性', 300, 256, size=150),
      HL(260, 578, 600, at='依旧是会把这些工作', color=PINK, thick=44, dur=2.2),
      HL(X, 598, 960, at='就像是一个技术', thick=4),
      Node(260, 600, at='达到了替代人的程度', red=True),
      Lab('技术做得到了', 260, 510, at='达到了替代人的程度', align='center', size=36, color='red'),
      Node(860, 600, at='保留一段时间'),
      Lab('工作，还保留一段时间', 560, 644, at='保留一段时间', align='center', size=36))

# I. what are my future skills: compounding or depreciating
import os as _os   # G6_PREVIEW=1 only ends the chapter's last scene on its own words for the stills; normal builds: t1=None
scene('于是我就开始想一个问题',
      K('我 未 来 的 技 能', y=200, at='我未来的技能'),
      Bub('写代码？', X, 252, at='写代码技能吗'),
      Bub('做产品？', 360, 252, at='做产品'),
      Curve(X, 410, 960, 580, xlabel='时间',
            lines=[{'type': 'exp', 'label': '复利', 'color': 'red', 'at': '可复利的资源'},
                   {'type': 'decay', 'label': '贬值', 'color': 'ink', 'at': '不断贬值的资产'}]),
      Lab('越滚越大', 894, 474, at='越滚越大', size=28, color='red'),
      Lab('越来越不值钱', 600, 890, at='越来越不值钱', size=26, color='gray'),
      t1=('$越来越不值钱了+1.0' if _os.environ.get('G6_PREVIEW') else None))
