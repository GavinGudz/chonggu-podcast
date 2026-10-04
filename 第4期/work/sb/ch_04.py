# 04 保持饥饿 (顾东政)
#   A a level balance: 学历高 / 学历低 weigh the same -> 最重要的是什么？
#   B 保持饥饿 · 保持求知欲 (highlighter), a sprout that keeps growing, 直到最后一天
#   C the two questions; the line of a whole life: 毕业那天 is not the end, 最后一天 is
import os
_T1 = os.environ.get('G2_T1')   # preview only (G2_T1=phrase): end the last scene where chapter 05 starts


def STRIKE(x, y, w, at, rot=0, **kw):
    return {'kind': 'strike', 'x': x, 'y': y, 'w': w, 'at': at, 'rot': rot, **kw}


# ---- A  regardless of high or low: the scale stays level
_BS, _BX, _BY = 420, 330, 250
scene('那么所以从我的经历看来',
      Ic('balance', _BX, _BY, size=_BS, at='那么所以从我的经历看来', dur=1.4, sw=round(600 / _BS, 2), css={'lineHeight': '0'}),
      P('学历高', _BX + 0.20 * _BS, _BY + 0.64 * _BS, at='那么所以从我的经历看来', size=40, align='center'),
      P('学历低', _BX + 0.80 * _BS, _BY + 0.64 * _BS, at='那么所以从我的经历看来', size=40, align='center'),
      K('不 管 学 历 的 高 低', x=540, y=180, at='不管是一个学历的高低', align='center'),
      Hd('最重要的\n是什么？', x=540, y=_BY + _BS + 50, size=104, at='最重要的事情是什么呢', align='center'))

# ---- B  stay hungry, stay curious; a sprout; until the last day
scene('就是保持饥饿',
      Hd('保持饥饿', y=210, size=132),
      Marker('保持求知欲', 70, 410, at='保持求知欲', size=104),
      Ic('sprout', 650, 200, size=340, at='拥有一颗', dur=1.8, sw=round(600 / 340, 2), css={'lineHeight': '0'}),
      P('一颗不断愿意学习的心，', X, 650, at='不断愿意学习的心', size=44),
      P('直到最后一天', X, 718, at='直到我死亡的那一天', size=44, css={'color': 'var(--red)'}))

# ---- C  two questions; the line runs to the last day, not to graduation
_LY = 780
scene('碰到不会的东西',
      Bub('碰到不会的，\n愿不愿意搞明白？', X, 200, size=46),
      Bub('缺少什么，\n愿不愿意补上？', 470, 440, at='明白自己缺少什么', size=46),
      HL(X, _LY - 3, 930, at='这些事情会一直影响你', dur=2.6, thick=6, color='red'),
      Node(990, _LY, at='直到你死亡', red=True),
      P('最后一天', 1004 - 168, _LY + 34, at='直到你死亡', size=42, css={'color': 'var(--red)'}),
      Node(330, _LY, at='而不是直到你从学校毕业'),
      P('毕业那天', 330, _LY + 34, at='而不是直到你从学校毕业', size=42, align='center', css={'color': 'var(--gray2)'}),
      STRIKE(330 - 94, _LY + 66, 188, at='毕业的那一天'), t1=_T1)
