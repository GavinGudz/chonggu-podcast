# ch 14 我的重估 (吴原同) -- designer g7
# Threads closed here: the ticket, the two line figures of 12a (说不上话), the stack, ep 3's AI + 人 blocks,
# the chat window (ch 08), the bubble of reassurance (12b 你要自信起来 -> 14h 你没问题), the 复利 / 贬值 curve (ch 11)
# and the show's ruler with its red dot (the intro).


def _fig(x, y_feet, size, at=None, sw=None, **kw):
    """line figure (icon 'user') standing on y_feet (same drawing as ch 12)"""
    return Ic('user', x, y_feet - 0.88 * size, size=size, at=at, sw=sw or round(4.5 * 220 / size, 2), **kw)


def _node(x, y, at=None, red=False, r=11, **kw):
    """dot: hollow ink ring, or a filled red dot; r = radius in px"""
    css = {'width': f'{2 * r}px', 'height': f'{2 * r}px', 'borderRadius': f'{r}px', 'margin': f'{-r}px 0 0 {-r}px'}
    return {'kind': 'node', 'x': x, 'y': y, 'at': at, 'red': red, 'css': css, **kw}


def _ray(x, y, w, deg, at=None, thick=6, color='ink', **kw):
    """a straight stroke from (x, y) that draws outward at an angle (deg, screen coordinates: -90 = straight up)"""
    return HL(x, y - thick / 2, w, at=at, thick=thick, color='#1b1915' if color == 'ink' else color,
              css={'rotate': f'{deg}deg', 'transformOrigin': '0 50%', 'borderRadius': f'{thick / 2}px'}, **kw)


GRAY2 = {'color': 'var(--gray2)'}

# 14a  祛魅 is not throwing it away: the degree is a ticket that gets you in; it lets them look once
scene('所以我对于学历的重估是这样的',
      K('我 对 学 历 的 重 估', y=200),
      Hd('祛魅', y=250, at='对学历祛魅', size=140),
      P('不是不要它', 380, 300, at='也不是说不要它', size=50, css=GRAY2),
      Ticket(X, 460, '学历', w=960, h=250, sub='一张门票 · 帮你进门', stubText='入 场', at='一张门票', tsize=96),
      Ic('eye', X, 770, size=110, at='还没有作品'),
      P('还没有作品时，\n先让人家看到一眼', X + 150, 768, at='先让人家先看到一眼', size=40))

# 14b  callback to 12a: the same two figures; without the degree, no conversation
_G = 680
scene('就好比如果我没有学历的话',
      K('如 果 没 有 学 历', y=230),
      HL(X, _G, 960, color='light', dur=1.0, delay=0.3),
      _fig(110, _G, 210, delay=0.5),
      Lab('我', 215, _G + 20, align='center', size=34, delay=0.8),
      _fig(650, _G, 330, at='印度的人工智能教授'),
      Lab('人工智能教授', 815, _G + 20, at='印度的人工智能教授+0.3', align='center', size=34),
      Ic('chat', 400, 410, size=150, at='印度的人工智能教授+0.6'),
      _ray(380, 510, 190, -24, at='我还说不上话-0.25', thick=6, color='#c4342c'))   # a decor stroke: never pulled forward

# 14c  through the door first, then pile up
scene('为了拿到它',
      K('先 进 门 ， 再 叠 高', y=340),
      Stack(X, 840, 640, 130, at='为了拿到它', size=50, items=[
          {'text': '学历', 'sub': '练会了啃更难的东西', 'at': '为了拿到它'},
          {'text': '其他的技能', 'at': '其他的技能', 'w': 560, 'dx': 40},
          {'text': '越叠越高', 'style': 'pink', 'at': '越叠越高', 'w': 480, 'dx': 80}]),
      Door(752, 410, w=258, h=430, at='为了拿到它', open_at='进了门', label='', inside=''))

# 14d  the two questions it cannot answer: a fork in the road | an hourglass
_FX, _FY = 280, 520      # fork point
scene('但它回答不了两个关键的问题',
      K('它 回 答 不 了 · 两 个 问 题', y=200),
      {'kind': 'vline', 'x': _FX, 'y': _FY, 'h': 150, 'color': 'ink', 'thick': 6, 'delay': 0.5},
      _ray(_FX, _FY, 190, -128, delay=0.9),
      _ray(_FX, _FY, 190, -52, delay=0.9),
      _node(_FX - 117, _FY - 150, delay=1.5),
      _node(_FX + 117, _FY - 150, delay=1.5),
      Big('?', _FX, 290, at='往哪边走+0.3', size=120, align='center'),
      Hd('往哪边走？', X, 730, at='往哪边走', size=88),
      {'kind': 'vline', 'x': 540, 'y': 290, 'h': 560, 'at': '还有你学的东西', 'color': 'light', 'thick': 2},
      Ic('hourglass', 680, 340, size=230, at='还有你学的东西+0.2', sw=4),
      Hd('明天还\n值不值钱？', 580, 640, at='明天还值不值钱', size=88))

# 14e  ep 3 callback: AI (tool) + 人 (direction); 学历 joins AI on the tool side
scene('上次我跟顾老师一起讲的',
      K('上 一 期 · 方 向 性 直 觉', y=200),
      Box('AI', X, 270, 450, 210, at='AI是工具', style='dark', sub='工具', tsize=84, ssize=32, center=True),
      Box('学历', 570, 270, 450, 210, at='学历也是一样', style='dark', sub='也是工具，不是答案', tsize=84, ssize=32, center=True),
      Big('+', 540, 492, at='方向得人来给', size=120),
      Box('人', X, 640, 960, 200, at='方向得人来给', style='pink', sub='方向得人来给', tsize=84, ssize=32, center=True))

# 14f  the day AI's writing is undetectable: two identical pages; testing has to change
scene('当然我还有一个判断',
      K('还 有 一 个 判 断', y=200),
      Ic('doc', 150, 250, size=200, at='AI写的东西'),
      Ic('doc', 730, 250, size=200, at='AI写的东西'),
      P('你写的', 250, 458, at='AI写的东西', size=36, align='center'),
      P('AI 写的', 830, 458, at='AI写的东西', size=36, align='center'),
      Big('=', 540, 262, at='再也检测不出来', size=170),
      Hd('学校考人的方式，\n就得改了', y=556, at='学校考人的方式', size=96),
      {'kind': 'quote', 'text': '「已经完全分辨不出来了。」', 'x': X, 'y': 830, 'size': 46, 'at': '我们自己写的代码'},
      {'kind': 'src', 'text': '—— lecture 上，老师说', 'x': X, 'y': 906, 'size': 28, 'at': '那个lecture老师说'})

# 14g  how much will a ranking still weigh?
scene('到了那天',
      Ic('balance', X, 262, size=250, at='到了那天', sw=3.5),
      Hd('排名，\n还剩多少分量？', 340, 280, at='排名还剩多少分量', size=96),
      P('——我也说不准', 340, 540, at='说不准', size=38, css=GRAY2))

# 14h  the ranking was a voice saying "你没问题" (echo of 12b's bubble); the security is made, not given
scene('回头看',
      K('回 头 看', y=200),
      P('最在乎排名的那一年', X, 256, at='我最在乎排名的那一年', size=40, css=GRAY2),
      Hd('找一个\n安全感', y=330, at='其实就是在给我找', size=120),
      Bub('你没问题。', 600, 360, at='你没问题', size=62),
      HL(X, 650, 960, at='当然现在我知道', color='light'),
      Swap('学校给的', '自己做出来的', X, 690, at='当然现在我知道', strike_at='不是学校给的+0.5', to_at='自己做出来的', size=88))

# 14i  callback to ch 08's chat window: last year's question, this year's question
scene('就是我才大一啊',
      K('我 才 大 一', y=200),
      Chat(X, 260, 960, at='去年我问', title='我 的 问 题', size=44, msgs=[
          {'who': 'me', 'text': '这个学历，\n到底能给我带来什么？', 'at': '这个学历到底能给我带来什么', 'date': '去年'},
          {'who': 'me', 'text': '除了学历，\n我还能拿出来些什么？', 'at': '除了学历', 'date': '今年', 'hot': True}]))

# 14j  the question to the viewer, on ch 11's curve
scene('当然最后我也想问观众一个问题',
      K('最 后 · 想 问 你 一 个 问 题', y=200),
      Hd('你最在乎的', y=255, size=104),
      Hd('技能、', y=380, at='最在乎的那些技能', size=104),
      Hd('证书', X + 312, 380, at='最在乎的那些证书', size=104),
      Curve(X, 540, 900, 400, at='到底是在复利', xlabel='时间', lines=[
          {'type': 'exp', 'label': '复利？', 'color': 'red', 'at': '到底是在复利', 'size': 46},
          {'type': 'decay', 'label': '贬值？', 'color': 'ink', 'at': '还是在贬值', 'size': 46, 'dy': -18}]),
      Tag('评 论 区 聊 聊', X, 980, at='我们都可以聊聊'))

# 14k  sign-off: the show's ruler, the red dot travels from 默认 to 重估 (mirrors the intro)
scene('这里是《重估》',
      Ruler(X, 520, 960, ticks=10, labels=[
          {'pos': 0.1, 'text': '默认', 'size': 40},
          {'pos': 0.88, 'text': '重估', 'red': True, 'serif': True, 'size': 76, 'at': '我是原同'}],
          dot={'from': 0.1, 'to': 0.88, 'at': '这里是《重估》', 'slide_at': '这里是《重估》+0.5', 'dur': 1.3}))
