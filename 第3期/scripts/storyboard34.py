exec(open(__file__.replace('storyboard34.py', 'sb_head.py')).read())
# ============================ 3:4 (1080x1440). Content: x 60..1020, y 150..1160; subtitles below 1190.
CW = 960


def Photo(key, x, y, w, h, at=None, cap='', cred='', pos=None, **kw):
    return {'kind': 'photo', 'src': f'photos/{key}.jpg', 'x': x, 'y': y, 'w': w, 'h': h, 'at': at, 'cap': cap, 'cred': cred, 'pos': pos, **kw}


def Q(text, x, y, at=None, size=50, **kw):
    return {'kind': 'quote', 'text': text, 'x': x, 'y': y, 'at': at, 'size': size, **kw}


def Src(text, x, y, at=None, **kw):
    return {'kind': 'src', 'text': text, 'x': x, 'y': y, 'at': at, **kw}


def VL(x, y, h, at=None, **kw):
    return {'kind': 'vline', 'x': x, 'y': y, 'h': h, 'at': at, **kw}


# ---------------------------------------------------------------- 01 顾东政
scene('观众朋友们你们之前',
      K('今 天 的 话 题', y=300),
      Hd('注意力价值', y=360, size=150, delay=0.2),
      Hd('方向性直觉', y=560, size=150, color='red', delay=0.7),
      Rule(y=770, w=480, delay=1.4))

NY = [330, 545, 760, 975]
scene('你从小时候',
      K('每 个 阶 段 ， 都 有 人 告 诉 我 们', y=180),
      VL(118, 300, 700, at='就是你从小时候', dur=2.0),
      Node(118, NY[0], at='就是你从小时候'), Lab('小时候', 170, NY[0] - 62, at='就是你从小时候', css={'color': 'var(--gray2)', 'fontSize': '24px'}),
      Box('向成绩最好的学生学习', 170, NY[0] - 26, 850, 110, at='成绩最好的学生', tsize=44),
      Node(118, NY[1], at='到了大学'), Lab('大学', 170, NY[1] - 62, at='到了大学', css={'color': 'var(--gray2)', 'fontSize': '24px'}),
      Box('入党 · 国企 · 央企', 170, NY[1] - 26, 850, 110, at='谁入了党', tsize=44),
      Node(118, NY[2], at='成家之后'), Lab('毕业 · 成家', 170, NY[2] - 62, at='成家之后', css={'color': 'var(--gray2)', 'fontSize': '24px'}),
      Box('优秀的伴侣 · 良好的成长环境', 170, NY[2] - 26, 850, 110, at='优秀的伴侣', tsize=44),
      Node(118, NY[3], at='每到一个阶段', red=True), Lab('每 一 个 阶 段', 170, NY[3] - 62, at='每到一个阶段', css={'color': 'var(--red)', 'fontSize': '24px'}),
      Box('该向谁看齐，\n该成为什么样的人', 170, NY[3] - 26, 850, 170, at='该向谁看齐', style='pink', tsize=48))

scene('再过三十年',
      {'kind': 'num', 'text': '30', 'x': X, 'y': 230, 'at': '再过三十年', 'size': 240},
      Lab('年 后', 318, 376, at='再过三十年', css={'fontSize': '48px', 'color': 'var(--ink)'}),
      P('我们最期盼的事情', X, 560, at='最期盼', size=36, css={'color': 'var(--gray2)'}),
      Hd('让别人坐下来\n听我们说话', y=620, at='让别人坐', size=112, cps=16),
      Tag('希 望 被 看 到', X, 930, at='希望被看到'))

scene('那为什么我们不在最开始',
      {'kind': 'qmark', 'x': 520, 'y': 120, 'at': '那为什么', 'size': 640},
      K('不 如 在 最 开 始 就 反 问 自 己', y=380, at='那为什么'),
      Hd('我的注意力，\n愿意放在哪里？', y=440, at='我的注意力', size=122, cps=16),
      Rule(y=770, w=520, at='$放在哪里'))

scene('我之前是一个',
      K('就 拿 我 自 己 而 言', y=200),
      Box('学习很差的学生', X, 270, 500, 150, at='学习很差', style='dark', tsize=60),
      Tag('半 年 职 高', X, 460, at='职高'),
      Hd('我为什么\n要学习？', y=580, at='我为什么要学习', size=140, cps=16))

scene('后来我发现',
      K('后 来 我 发 现', y=190),
      Box('学习不错的人', X, 260, 640, 120, at='学习不错的人', tsize=48),
      Arr(X + 320, 390, 60, at='只在乎他自己', dir_='d'),
      Box('只在乎他自己', X, 460, 640, 120, at='只在乎他自己', style='pink', tsize=48),
      Arr(X + 320, 590, 60, at='那我要多在乎自己', dir_='d'),
      Box('那我要多在乎自己', X, 660, 640, 120, at='那我要多在乎自己', tsize=48),
      Hd('踏上一条\n拯救自己的道路', y=850, at='踏上了一条', size=96, cps=16))

scene('高中念完了以后',
      K('高 中 念 完 以 后', y=190),
      Hd('纽约大学\n的通知书', y=250, at='纽约大学', size=110, cps=16),
      Tag('W A I T L I S T', X, 530, at='waitlist'),
      Photo('nyu', X, 610, CW, 460, pos='50% 70%', at='纽约大学', cap='纽约 · 华盛顿广场拱门（纽约大学就在广场周围）', cred='图：Wikimedia Commons / Marco Almbauer（CC0）', delay=0.5))

scene('最后一轮',
      K('最 后 一 轮 · Z O O M 面 试', y=180),
      {'kind': 'avatar', 'x': X, 'y': 250, 'size': 300, 'text': '面试官', 'at': '三名面试官'},
      {'kind': 'avatar', 'x': X + 330, 'y': 250, 'size': 300, 'text': '面试官', 'at': '三名面试官', 'delay': 0.15},
      {'kind': 'avatar', 'x': X + 660, 'y': 250, 'size': 300, 'text': '面试官', 'at': '三名面试官', 'delay': 0.3},
      Bub('当你有了足够的时间和金钱，\n你会拿它们做些什么？', X, 600, at='足够的时间', size=46, tail='up'),
      P('他们为什么要问我这个问题？', X, 840, at='他们为什么', size=38, css={'color': 'var(--gray2)'}),
      Tag('我 很 久 之 前 就 有 答 案 了', X, 930, at='很久之前'))

scene('我想把自己的想法',
      K('我 的 答 案 ： 分 享 出 去', y=240),
      Chk('自己的想法', X, 330, at='自己的想法', size=70),
      Chk('做过的事情', X, 480, at='做过的事情', size=70),
      Chk('这一路走过来的经历', X, 630, at='走过来的经历', size=70))

scene('如果这些分享',
      K('对 我 而 言', y=200),
      Box('让更多人\n踏上改变自己的道路', X, 270, CW, 250, at='改变自己的道路', style='pink', tsize=62),
      Big('＞', 540, 530, at='比我个人拥有', size=150),
      Box('我个人\n拥有巨量财富', X, 720, CW, 210, at='巨量财富', tsize=52),
      Hd('更有意义，更有价值', y=990, at='更有意义', size=84, cps=16))

scene('国庆将至',
      K('国 庆 将 至', y=200),
      Hd('坐在这里，\n其实我觉得很幸福', y=260, at='坐在这里', size=100, cps=16),
      Photo('two', X, 620, CW, 249, at='一起录制这档节目', cap='2026.09.29 · 录制现场', cred='图：腾讯会议录屏（左：吴原同　右：顾东政）', zoom=0.03))

scene('为什么呢',
      K('为 什 么 ？', y=190),
      Card('', '时间', X, 260, 290, at='有时间'),
      Card('', '精力', X + 335, 260, 290, at='有精力'),
      Card('', '金钱', X + 670, 260, 290, at='有金钱'),
      Arr(540, 430, 70, at='放下自己的琐事', dir_='d'),
      Box('把时间与注意力\n放在想做的事上', X, 530, CW, 200, at='真正放在', style='pink', tsize=56, center=True),
      Hd('这何尝不是一种\n财富自由？', y=810, at='对于我而言', size=100, cps=16))

scene('那些富人',
      K('财 富 自 由 的 时 长', y=260),
      Lab('富人', X, 370, at='那些富人', css={'fontSize': '44px'}),
      HL(X, 450, CW, at='的时间更长', color='red', thick=36, dur=1.4),
      Lab('我们', X, 560, at='那些富人', css={'fontSize': '44px'}),
      HL(X, 640, 300, at='那些富人', color='ink', thick=36, dur=0.8),
      P('只是时间更长罢了', X, 740, at='罢了', size=40, css={'color': 'var(--gray2)'}))

scene('在这个人人抢夺',
      K('在 人 人 抢 夺 注 意 力 的 时 代', y=180),
      Photo('simon', X, 250, 280, 370, at='抢夺我们注意力', cap='Herbert A. Simon', cred='图：RIT 1981（公有领域）', zoom=0.03),
      Q('“信息的丰富，\n导致注意力的贫乏。”', 390, 290, at='抢夺我们注意力', size=56, delay=0.3),
      Src('赫伯特 · 西蒙，1971\n1978 年诺贝尔经济学奖得主', 390, 480, at='抢夺我们注意力', delay=1.2),
      Hd('把注意力\n留在自己身上', y=760, at='留在自己身上', size=112, cps=16))

scene('不会被世俗',
      K('不 被 包 裹 住', y=220),
      Box('世俗', X, 300, 290, 150, at='世俗', tsize=64, center=True),
      Box('家人', X + 335, 300, 290, 150, at='家人', tsize=64, center=True),
      Box('规则', X + 670, 300, 290, 150, at='规则', tsize=64, center=True),
      Hd('未来想拥有的人生，\n是自己争取的', y=560, at='未来想拥有的人生', size=96, cps=16),
      P('也许今天开始，会离你想要的人生更近一步', X, 850, at='也许今天开始', size=36, hl=['更近一步']))

# ---------------------------------------------------------------- 吴原同
scene('你们有想过自己的优势',
      K('问 听 众 朋 友 们', y=200),
      Hd('你的优势\n在哪里？', y=260, at='自己的优势', size=140, cps=16),
      Box('人', X, 700, 380, 200, at='人需要给它提供方向', style='pink', sub='提供方向', tsize=80, center=True),
      Arr(X + 400, 800, 150, at='人需要给它提供方向'),
      Box('AI', X + 580, 700, 380, 200, at='AI它只是一种工具', style='dark', sub='一种工具', tsize=80, center=True))

scene('刷视频',
      {'kind': 'phone', 'x': X, 'y': 200, 'at': '刷视频'},
      Bub('“这东西要火”', 420, 230, at='这东西要火', size=50),
      Bub('为什么？', 420, 400, at='问你为什么', size=44),
      Lab('编排很好', 420, 570, at='编排', css={'color': 'var(--gray)', 'fontSize': '32px'}),
      Lab('选题很好', 420, 625, at='选题', css={'color': 'var(--gray)', 'fontSize': '32px'}),
      Tag('都 是 事 后 的 理 由', 420, 700, at='$选题很好+0.3'),
      Hd('第一瞬间，\n像一种直觉', y=840, at='第一瞬间', size=100, cps=16))

scene('网感',
      Big('网感', 540, 200, at='网感', size=240),
      Arr(540, 500, 110, at='指出一种方向', dir_='d'),
      Ic('compass', 450, 640, 180, at='指出一种方向'),
      Hd('方向性直觉', x=540, y=880, at='叫做方向性直觉', size=150, color='red', align='center'),
      Rule(x=280, y=1070, w=520, at='$叫做方向性直觉'))

scene('下个定义',
      K('定 义', y=230),
      Hd('信息还不完全，\n未来还不确定，\n你已经愿意\n往一个方向下注', y=300, at='当信息还不完全', size=104, cps=16),
      Rule(y=840, w=520, at='$往一个方向下注'))

scene('注意，我不是说',
      K('注 意', y=320),
      Chk('准确预测未来', X, 420, at='准确预测未来', mark='x', size=80),
      Chk('这边值得，\n那边可能有东西', X, 600, at='这边值得', size=80))

scene('再说回我刚说的第一句话',
      K('再 说 回 第 一 句 话', y=380),
      Hd('在方向性直觉上，\n你真正的优势\n在哪里？', y=440, at='再说回', size=104, cps=16))

scene('就连网感这种东西',
      K('网 感 也 能 变 现', y=190),
      Hd('就连网感，\n都能赚钱', y=250, at='就连网感这种东西', size=120, cps=16),
      Photo('kabosu', X, 590, 560, 360, at='变现的工具', cap='狗狗币 logo 上那只柴犬：Kabosu', cred='纪念像 · 日本千叶县佐仓市（2023 年落成）\n图：Fred Cherrygarden（CC BY-SA 4.0）', delay=0.2),
      K('资 料', x=660, y=600, at='变现的工具', delay=0.8),
      P('狗狗币（Dogecoin）\n2013 年作为一个\n玩笑诞生', 660, 650, at='变现的工具', size=34, delay=1.0, css={'color': 'var(--ink)'}),
      Src('一个梗，\n后来成了一种加密货币', 660, 830, at='变现的工具', delay=1.6))

scene('一个医生可能',
      K('长 期 浸 泡 在 一 个 职 业 里', y=190),
      Ic('stetho', X, 300, 120, at='一个医生'),
      Card('', '医生', 210, 270, 810, at='一个医生', sub='看了几千个病人\n→ 某种临床直觉'),
      Ic('bulb', X, 600, 120, at='一个创业者'),
      Card('', '创业者 · 投资者 · 设计者', 210, 570, 810, at='一个创业者', sub='我认为都是一样的'))

scene('大家都是长期浸泡',
      Hd('浸泡会\n给人身上留下东西', y=200, at='这种浸泡', size=112, cps=16),
      Rule(y=500, w=480, at='$留下东西'),
      Photo('kahneman', X, 580, 300, 360, cap='Daniel Kahneman', cred='图：nrkbeta（CC BY-SA 2.0）', delay=0.2, zoom=0.03),
      K('资 料', x=400, y=590, delay=0.4),
      P('直觉什么时候靠得住？', 400, 640, size=40, delay=0.6, css={'color': 'var(--ink)', 'fontWeight': '600'}),
      P('① 环境足够有规律、可预测\n② 有机会长期练习，学到规律', 400, 720, size=30, delay=0.9),
      Src('Kahneman & Klein, 2009\nAmerican Psychologist', 400, 850, delay=1.3),
      Src('他们也指出：预测个股涨跌这类\n规律极弱的环境，经验很难\n练出可靠的直觉。', 400, 935, delay=1.9, css={'fontSize': '24px', 'color': 'var(--red)'}))

scene('当然AI当然可以',
      K('AI 也 有 某 种 直 觉 ， 但 …', y=180),
      Lab('AI', X, 250, at='可以表现出', css={'fontSize': '36px', 'color': 'var(--gray2)'}),
      Box('世界', X, 310, 210, 180, at='可以表现出', style='dark', tsize=56, center=True),
      Arr(X + 220, 400, 60, at='文字'),
      Box('文字 · 图片\n代码', X + 300, 310, 360, 180, at='文字', tsize=46, center=True),
      Arr(X + 670, 400, 60, at='总结出模式'),
      Box('模式', X + 750, 310, 210, 180, at='总结出模式', tsize=56, center=True),
      Tag('多 了 这 么 一 层', X + 300, 510, at='多了这么一层'),
      Lab('人', X, 640, at='人类最特别的是', css={'fontSize': '36px', 'color': 'var(--gray2)'}),
      Box('亲身经历的世界\n摔过跤 · 吵过架 · 被拒绝过', X, 700, 660, 180, at='你是在经历的', style='pink', tsize=40, center=True),
      Arr(X + 670, 790, 60, at='理解世界'),
      Box('理解\n世界', X + 750, 700, 210, 180, at='理解世界', tsize=50, center=True))

scene('至少在AI拥有真正完整的世界经验之前',
      K('至 少 在 AI 拥 有 完 整 的 世 界 经 验 之 前', y=380),
      Hd('人类的直觉，\n非常宝贵', y=440, at='我们人类的这种直觉', size=130, cps=16),
      Rule(y=780, w=520, at='$非常宝贵'))

scene('再说个例子',
      K('我 自 己 的 例 子', y=180),
      Tag('前 段 时 间 · CODEX 刚 出 来 两 个 月', X, 240, at='Codex'),
      Lab('有边界', X, 340, at='有限边界', css={'fontSize': '40px'}),
      Chk('做一个软件、一个小功能', X, 400, at='做一个软件', size=56),
      Lab('无边界', X, 520, at='不确定且无边界', css={'fontSize': '40px'}),
      Chk('股市', X, 580, at='股市', mark='x', size=56),
      Photo('nyse', X, 690, CW, 300, at='股市', cap='纽约证券交易所', cred='图：Carol M. Highsmith / 美国国会图书馆（公有领域）', delay=0.4))

scene('我们人就可以把AI',
      K('用 AI 最 好 的 方 式', y=230),
      Box('AI', X, 310, CW, 210, at='非常厉害的工具', style='dark', sub='一个非常厉害的工具', tsize=84, center=True),
      Big('＋', 540, 530, at='人是负责', size=130),
      Box('人', X, 700, CW, 210, at='人是负责', style='pink', sub='提供方向和直接判断', tsize=84, center=True))

scene('你可以去想',
      K('你 可 以 去 想', y=200),
      Chk('别人要想很久，\n我第一时间就有感觉？', X, 290, at='别人需要想很久', size=58),
      Chk('我待得足够久，\n判断开始变成本能？', X, 500, at='待了足够久', size=58),
      Hd('怎么去变现', y=760, at='怎么去变现', size=130, color='red'))

scene('比如说一个医生',
      K('举 个 例 子', y=180),
      Photo('doctor', X, 240, CW, 250, at='一个医生', cap='医生的临床直觉', cred='图：Shixart1985（CC BY 2.0）', pos='30% 40%'),
      Box('长期浸泡 · 临床直觉', X, 610, CW, 90, at='长期浸泡中', tsize=40),
      Arr(540, 706, 26, at='去查查', dir_='d'),
      Box('查查一两个月内要上市的药和设备', X, 740, CW, 90, at='去查查', tsize=40),
      Arr(540, 836, 26, at='提前看', dir_='d'),
      Box('提前读新药和新设备的论文', X, 870, CW, 90, at='提前看', tsize=40),
      Arr(540, 966, 26, at='第一时间的直觉', dir_='d'),
      Box('第一时间的直觉，也许比普通人准很多', X, 1000, CW, 90, at='第一时间的直觉', style='pink', tsize=40),
      Tag('只 是 举 例 · 不 构 成 投 资 建 议', X, 1110, at='不构成投资建议'))

scene('毕竟如果一个人',
      P('连一个梗会不会火，\n都可以变成流量、变成钱、变成生意', X, 200, at='毕竟如果一个人', size=38, hl=['变成钱']),
      Big('5 · 10 · 20', 540, 380, at='五年', size=170),
      Lab('年', 540, 580, at='五年', align='center', css={'fontSize': '44px'}),
      Hd('形成的专业直觉，\n可能比你想象的\n更值钱', y=700, at='那你花了', size=100, cps=16))

scene('所以听众朋友们你可以去反思一下',
      {'kind': 'qmark', 'x': 520, 'y': 120, 'at': '反思一下', 'size': 640},
      K('想 一 想', y=380),
      Hd('你在哪个领域，\n拥有比别人更准确\n的下注能力？', y=440, at='在哪个领域', size=100, cps=16),
      Rule(y=860, w=520, at='$下注能力'))

for sc in S:
    if sc['t0'] == '当然AI当然可以':
        sc['lead'] = -0.9   # hold the reference card a beat longer

sb = {
    'episode': 3, 'handoff': 'intro',
    'title': {'kicker': '重估 · 第 3 期', 'head': '注意力放在哪里，\n直觉就长在哪里', 'sub': '', 'ruleW': 480},
    'end': {'kicker': '', 'head': '谢谢收听', 'foot': '重估 · 第 3 期', 'ruleW': 364, 'y0': 520},
    'chapters': [], 'scenes': S,
}
json.dump(sb, open(HERE / 'storyboard34.json', 'w'), ensure_ascii=False, indent=1)
print(len(S), 'scenes')
