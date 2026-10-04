# ch 08 翻聊天记录 (吴原同)  -- designer g5
CW = 960
SERIF = lambda s, c='#1b1915': {'font': f'900 {s}px/1.2 var(--serif)', 'color': c}

# 1. handover: on the show's own ruler the red dot leaves 顾东政's teal mark and lands on 吴原同's amber mark
TEAL, AMBER = '#2b5459', '#b58c46'
_RX, _RW, _RY = 120, 840, 380
_p = lambda pos: round(_RX + _RW * pos)
_mark = lambda pos, col, at=None, delay=0: Box('', _p(pos) - 5, _RY - 24, 10, 128, at=at, style='dark', delay=delay,
                                               css={'background': col, 'borderColor': col, 'padding': '0'})
scene('刚刚顾老师说得特别好',
      K('接 过 话 筒', 540, 240, align='center'),
      _mark(0.2, TEAL), _mark(0.8, AMBER, delay=0.3),
      Ruler(_RX, _RY, w=_RW, ticks=10, minor=3, dur=0.8,
            dot={'from': 0.2, 'to': 0.8, 'at': '刚刚顾老师+0.5', 'slide_at': '我再说说看', 'dur': 1.3}),
      P('顾东政', _p(0.2), _RY + 126, align='center', css=SERIF(76, TEAL)),
      P('吴原同', _p(0.8), _RY + 126, align='center', delay=0.3, css=SERIF(76, AMBER)),
      Rule(x=_p(0.8) - 114, y=_RY + 232, w=228, at='我再说说看+1.0'),
      K('我 自 己 的 经 历', _p(0.8), _RY + 280, at='自己一些经历', align='center'))

# 2. two years of AI chats, searched for 排名 / 学历: the same question again and again (a bracket spans
#    去年上半年 .. 去年下半年), then the real one in red.  Chat rows: top = 380 + 98.4 i (size 36, gap 16).
_r = lambda i: 380 + 98.4 * i + 41
scene('我把我这两年',
      Chat(X, 210, w=CW, title='和 AI 的聊天记录 · 近两年', size=36, gap=16,
           search={'text': '排名　学历', 'at': '我去搜', 'cps': 5},
           msgs=[{'who': 'me', 'text': 'UNSW 世界排名多少？', 'at': '从去年上半年'},
                 {'who': 'me', 'text': 'UNSW 世界排名多少？', 'at': '到去年下半年'},
                 {'who': 'me', 'text': 'UNSW 世界排名多少？', 'at': '很多很多次'},
                 {'who': 'me', 'text': '在国内认可度怎么样？', 'at': '认可度'},
                 {'who': 'me', 'text': '国内是不是看不起澳洲学历？', 'at': '看不起'},
                 {'who': 'me', 'text': '这个学历到底能给我带来什么？', 'hot': True, 'at': '这个学历到底'}]),
      Lab('去年上半年', 324, round(_r(0) - 20), at='从去年上半年', color='gray', css={'fontSize': '30px'}),
      HL(498, round(_r(0)), 22, at='很多很多次', color='red', thick=3, dur=0.2),
      {'kind': 'vline', 'x': 499, 'y': round(_r(0)), 'h': round(_r(2) - _r(0)), 'color': 'red', 'thick': 3, 'dur': 0.7, 'at': '很多很多次'},
      HL(498, round(_r(2)) - 2, 22, at='很多很多次+0.6', color='red', thick=3, dur=0.2),
      Lab('去年下半年', 324, round(_r(2) - 20), at='很多很多次+0.5', color='gray', css={'fontSize': '30px'}))

# 3. the plan he once did the sums on: a CV (UNSW 本科 + 名校硕士) on its way to an algorithm job back home;
#    a red ? sits on the path (过简历?) and a thought bubble asks 稳了吗
scene('我甚至认真地想过',
      K('我 认 真 算 过', y=190),
      Box('', X, 250, 410, 540),
      Lab('简 历', X + 36, 280, color='gray', css={'fontSize': '28px', 'letterSpacing': '6px'}),
      HL(X + 36, 330, 338, color='light', delay=0.3),
      Ic('user', X + 30, 350, size=104, sw=4, delay=0.4),
      HL(X + 150, 384, 200, color='light', thick=12, delay=0.6),
      HL(X + 150, 418, 130, color='light', thick=12, delay=0.7),
      P('UNSW 本科', X + 36, 490, at='UNSW的本科', css=SERIF(54)),
      Marker('＋名校硕士', X + 36, 574, at='名校硕士', size=54),
      HL(X + 36, 700, 300, color='light', thick=12, at='名校硕士+0.5'),
      HL(X + 36, 734, 210, color='light', thick=12, at='名校硕士+0.6'),
      Arr(X + 430, 520, 230, at='回国面试'),
      Ic('building', 738, 380, size=280, sw=3.5, at='回国面试+0.2'),
      Lab('回国 · 算法岗', 878, 316, align='center', at='算法岗', css=SERIF(48)),
      {'kind': 'num', 'text': '？', 'x': X + 470, 'y': 360, 'size': 130, 'at': '能不能过简历'},
      Bub('稳了吗？', X + 440, 612, at='是不是稳了', tail='up', css={'fontSize': '52px'}))

# 4. the memo of August 2026, then what 祛魅 means: 学历 = 你是谁, struck, becomes ≠
scene('但是到今年8月份',
      Box('', X + 40, 240, 880, 390),
      Lab('备忘录', X + 84, 272, color='gray', css={'fontSize': '28px', 'letterSpacing': '4px'}),
      Lab('2026 · 8 月', X + 700, 272, color='red', at='8月份', css={'fontSize': '28px', 'letterSpacing': '2px'}),
      HL(X + 84, 326, 792, color='light'),
      {'kind': 'quote', 'text': '「我现在已经\n　对学历祛魅了。」', 'x': X + 84, 'y': 362, 'size': 76, 'cps': 6, 'at': '其实我现在'},
      K('祛 魅 ， 就 是', x=X + 44, y=706, at='祛魅就是'),
      Swap('学历 ＝ 你是谁', '学历 ≠ 你是谁', X + 40, 760, at='祛魅就是', strike_at='不再迷信它', to_at='不再觉得它', size=92))

# 5. a year and a half between caring a lot and 祛魅; what happened in between is the story (a big pale ? rises)
scene('从特别在乎到祛魅',
      Node(84, 262),
      {'kind': 'vline', 'x': 84, 'y': 262, 'h': 420, 'color': 'ink', 'thick': 4, 'dur': 0.6},
      P('特别在乎', 134, 222, at='特别在乎', css=SERIF(64)),
      Lab('去年上半年', 136, 306, at='特别在乎+0.3', color='gray', css={'fontSize': '28px'}),
      {'kind': 'vline', 'x': 84, 'y': 262, 'h': 420, 'color': 'red', 'thick': 8, 'dur': 1.6, 'at': '到祛魅'},
      Node(84, 682, at='中间', red=True),
      P('祛魅', 134, 642, at='中间', css=SERIF(64, '#c4342c')),
      Lab('今年 8 月', 136, 726, at='中间+0.3', color='gray', css={'fontSize': '28px'}),
      {'kind': 'num', 'text': '？', 'x': 112, 'y': 372, 'size': 150, 'at': '这一年发生了什么'},
      Lab('差 不 多', 520, 396, at='差不多', color='gray', css={'fontSize': '30px'}),
      Count(1.5, 512, 438, dec=1, suffix=' 年', size=190, at='一年半', dur=1.0),
      K('今 天 讲 的 ， 就 是 它', 520, 690, at='就是我今天想讲的'))
