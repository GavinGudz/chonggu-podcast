"""Storyboard of 《重估》 第 3 期 -> storyboard.json.  Anchors are phrases of the spoken (corrected) text:
"短语" = when it starts, "$短语" = when it ends, "短语+0.3" = offset. Layout follows 第 2 期: content in
x 72..1848, y 150..800; subtitles live below 840.
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
X = 60
S = []


def scene(t0, *els, t1=None, **kw):
    S.append({'t0': t0, 't1': t1, 'els': list(els), **kw})


def K(text, x=X, y=200, at=None, **kw):       # red letter-spaced kicker
    return {'kind': 'kicker', 'text': text, 'x': x, 'y': y, 'at': at, **kw}


def Hd(text, x=X, y=250, at=None, size=118, cps=16, **kw):
    return {'kind': 'headline', 'text': text, 'x': x, 'y': y, 'at': at, 'size': size, 'cps': cps, **kw}


def Rule(x=X, y=420, w=390, at=None, **kw):
    return {'kind': 'rule', 'x': x, 'y': y, 'w': w, 'at': at, **kw}


def Big(text, x=960, y=300, at=None, size=210, **kw):
    return {'kind': 'bigword', 'text': text, 'x': x, 'y': y, 'at': at, 'size': size, 'align': kw.pop('align', 'center'), **kw}


def P(text, x=X, y=500, at=None, size=32, **kw):
    return {'kind': 'para', 'text': text, 'x': x, 'y': y, 'at': at, 'size': size, **kw}


def Box(title, x, y, w, h, at=None, sub=None, style='', **kw):
    return {'kind': 'box', 'title': title, 'sub': sub, 'x': x, 'y': y, 'w': w, 'h': h, 'at': at, 'style': style, **kw}


def Card(no, title, x, y, w, at=None, sub=None, **kw):
    return {'kind': 'card', 'no': no, 'title': title, 'sub': sub, 'x': x, 'y': y, 'w': w, 'at': at, **kw}


def Arr(x, y, len_=70, at=None, dir_='r', **kw):
    return {'kind': 'arrow', 'x': x, 'y': y, 'len': len_, 'at': at, 'dir': dir_, **kw}


def Chk(text, x, y, at=None, mark='v', size=58, **kw):
    return {'kind': 'check', 'text': text, 'x': x, 'y': y, 'at': at, 'mark': mark, 'size': size, **kw}


def Ic(name, x, y, size=130, at=None, **kw):
    return {'kind': 'icon', 'name': name, 'x': x, 'y': y, 'size': size, 'at': at, **kw}


def Tag(text, x, y, at=None, **kw):
    return {'kind': 'tag', 'text': text, 'x': x, 'y': y, 'at': at, **kw}


def Lab(text, x, y, at=None, **kw):
    return {'kind': 'label', 'text': text, 'x': x, 'y': y, 'at': at, **kw}


def Bub(text, x, y, at=None, **kw):
    return {'kind': 'bubble', 'text': text, 'x': x, 'y': y, 'at': at, **kw}


def Node(x, y, at=None, red=False):
    return {'kind': 'node', 'x': x, 'y': y, 'at': at, 'red': red}


def HL(x, y, w, at=None, **kw):
    return {'kind': 'hline', 'x': x, 'y': y, 'w': w, 'at': at, **kw}




# ---------------------------------------------------------------- 第 4 期 illustrated primitives (see render/engine.js)
def Ruler(x, y, w=900, at=None, **kw):          # labels=[{pos,text,red,at}], dot={from,to,at,slide_at,dur}, seg={from,to,at}
    return {'kind': 'ruler', 'x': x, 'y': y, 'w': w, 'at': at, **kw}


def Board(x, y, w=900, rows=(), at=None, **kw):  # rows=[{rank,score,hot,name,at}], title, subtitle, blur_at
    return {'kind': 'board', 'x': x, 'y': y, 'w': w, 'rows': list(rows), 'at': at, **kw}


def Chat(x, y, w=900, msgs=(), at=None, **kw):   # msgs=[{who:'me'|'ai', text, at, hot, date}], search={text, at}, title
    return {'kind': 'chat', 'x': x, 'y': y, 'w': w, 'msgs': list(msgs), 'at': at, **kw}


def Curve(x, y, w=900, h=520, lines=(), at=None, **kw):  # lines=[{type:'exp'|'decay'|'linear'|'flat'|'s'|'down', label, color, at}]
    return {'kind': 'curve', 'x': x, 'y': y, 'w': w, 'h': h, 'lines': list(lines), 'at': at, **kw}


def Stack(x, y_base, w=800, h=110, items=(), at=None, **kw):  # items=[{text, sub, style, at}] bottom-up
    return {'kind': 'stack', 'x': x, 'y': y_base, 'w': w, 'h': h, 'items': list(items), 'at': at, **kw}


def Door(x, y, w=320, h=520, at=None, **kw):     # label (on the leaf), inside (behind), open_at
    return {'kind': 'door', 'x': x, 'y': y, 'w': w, 'h': h, 'at': at, **kw}


def Ticket(x, y, title, w=760, h=250, at=None, **kw):  # sub, stubText
    return {'kind': 'ticket', 'x': x, 'y': y, 'title': title, 'w': w, 'h': h, 'at': at, **kw}


def Stamp(text, x, y, at=None, **kw):            # size, rot
    return {'kind': 'stamp', 'text': text, 'x': x, 'y': y, 'at': at, **kw}


def Count(to, x, y, at=None, **kw):              # from, dec, prefix, suffix, size, dur, color='ink'
    return {'kind': 'counter', 'to': to, 'x': x, 'y': y, 'at': at, **kw}


def Crowd(x, y, w=900, h=560, at=None, **kw):    # n, cols, mode='funnel'|'pick', funnel_at, pass, pick_at, hotn
    return {'kind': 'crowd', 'x': x, 'y': y, 'w': w, 'h': h, 'at': at, **kw}


def Marker(text, x, y, at=None, **kw):           # size, band='pink'|'red'
    return {'kind': 'marker', 'text': text, 'x': x, 'y': y, 'at': at, **kw}


def Swap(frm, to, x, y, at=None, **kw):          # strike_at, to_at, size
    return {'kind': 'swap', 'from': frm, 'to': to, 'x': x, 'y': y, 'at': at, **kw}
