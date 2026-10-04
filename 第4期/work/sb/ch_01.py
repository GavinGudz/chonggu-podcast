# ch 01 敲门砖 (顾东政). Threads: résumé -> door (学历 = the brick that knocks) -> 180° -> key and lock (匹配).

# 1. two places, one recording, one topic
scene('哈喽观众朋友们',
      K('国 庆 · 录 制', y=180),
      Ic('mountain', 120, 250, size=200, at='我在外面玩'),
      P('我 · 在外面玩', 220, 470, at='我在外面玩', size=40, align='center'),
      HL(345, 350, 115, at='录制节目', color='light', thick=3),
      Ic('mic', 480, 290, size=120, at='录制节目'),
      HL(620, 350, 115, at='录制节目', color='light', thick=3),
      Ic('school', 760, 250, size=200, at='学校里上学'),
      P('吴老师 · 在学校', 860, 470, at='学校里上学', size=40, align='center'),
      Big('学历', 540, 590, at='是关于学历', size=240),
      P('对我而言，到底意味着什么？', 540, 890, at='到底意味着什么', size=44, align='center'))

# 2. the first internship: a résumé writes itself, the boss's eye, two lines get highlighted, round one passed
BAR = {'color': 'light', 'css': {'borderRadius': '7px'}}
scene('我第一次很直观地感觉到',
      K('学 历 的 作 用', y=180),
      Box('', 60, 240, 620, 740),
      Ic('user', 100, 278, size=130, delay=0.5),
      HL(262, 300, 300, delay=0.9, thick=22, **BAR),
      HL(262, 346, 200, delay=1.2, thick=14, **BAR),
      Tag('第 一 份 实 习', 262, 382, at='第一份实习'),
      HL(100, 456, 540, delay=1.6, color='light'),
      Marker('国外大学 · 计算机', 104, 492, at='国外大学', size=46),
      HL(100, 604, 430, delay=2.0, thick=14, **BAR),
      Marker('美国读的高中', 104, 640, at='在美国读的高中', size=46),
      HL(100, 772, 500, delay=2.4, thick=14, **BAR),
      HL(100, 814, 380, delay=2.7, thick=14, **BAR),
      HL(100, 856, 460, delay=3.0, thick=14, **BAR),
      HL(100, 898, 300, delay=3.3, thick=14, **BAR),
      Ic('eye', 760, 400, size=200, at='领导注意到我'),
      P('领导', 860, 610, at='领导注意到我', size=40, align='center'),
      Arr(860, 690, 130, at='这个背景', dir_='d'),
      Box('第一轮', 730, 846, 260, 120, at='第一轮的筛选', style='pink', tsize=56, center=True,
          css={'color': 'var(--red)'}))

# 3. 学历 is the brick that knocks; the door opens onto round one
scene('所以朋友们问我',
      K('学 历 有 没 有 用 ？', y=180),
      Door(640, 270, w=380, h=600, inside='第一轮', isize=72, open_at='敲门砖+0.3'),
      Box('学历', 60, 620, 300, 150, at='学历有没有用', style='dark', tsize=64, center=True),
      Hd('有用。', 60, 250, at='我会说有用', size=150),
      Arr(385, 695, 210, at='敲门砖'),
      P('挺有用的敲门砖', 60, 800, at='挺有用的敲门砖', size=44))

# 4. round two: 180°, the school names are crossed out
scene('那么在第二轮的时候',
      Hd('第二轮', 60, 230, size=110),
      Count(180, 440, 186, at='180', suffix='°', size=210, dur=1.4),
      P('领导关心的事情', 60, 380, at='领导他关心的事情', size=40),
      HL(60, 470, 960, at='是什么呢', color='light'),
      Hd('清华北大\n北上广交', 60, 520, at='清华北大', size=110),
      {'kind': 'strike', 'x': 44, 'y': 584, 'w': 480, 'at': '$北上广交+0.15', 'rot': -2},
      {'kind': 'strike', 'x': 44, 'y': 716, 'w': 480, 'at': '$北上广交+0.4', 'rot': -2},
      P("I don't care.", 600, 620, at='care', size=60, color='gray',
        css={'fontFamily': 'var(--serif)', 'fontStyle': 'italic', 'fontWeight': '900'}))

# 5. what they care about: the key (知识, 项目) must fit the lock (岗位)
scene('他们只在乎',
      K('只 在 乎', y=180),
      Ic('key', 30, 200, size=320, at='掌握的知识'),
      Hd('掌握的知识', 60, 520, at='掌握的知识', size=64),
      Hd('专业项目', 60, 610, at='专业项目', size=64),
      Ic('lock', 700, 230, size=260, at='所要求的岗位'),
      Hd('岗位要求', 700, 520, at='所要求的岗位', size=64),
      Arr(360, 362, 300, at='是否是匹配的'),
      Big('匹配', 540, 740, at='匹配', size=210))
