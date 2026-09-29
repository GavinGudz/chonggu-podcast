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


