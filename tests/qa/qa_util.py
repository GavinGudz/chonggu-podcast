"""qa 测试的小工具（ffmpeg 现做片子、声音、小期的 episode.yaml）。单独一个模块：tests/voice 也有 conftest，两个 conftest 同名，测试文件不能 from conftest import。"""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

ENC = ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '12', '-pix_fmt', 'yuv420p', '-r', '30']


def ff(*a):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *map(str, a)], check=True)


def clip(out, src='color=c=gray:s=320x180:r=30:d=3', vf=None, extra=()):
    """lavfi 现做一段片子；vf 里可以用 enable='eq(n,45)' 让某一帧坏掉"""
    ff('-f', 'lavfi', '-i', src, *(['-vf', vf] if vf else []), *ENC, *extra, out)
    return Path(out)


def conv(src, out, vf):   # 拿一段片子改一改（缩小、某几帧涂掉一块）
    ff('-i', src, '-vf', vf, *ENC, out)
    return Path(out)


def tone(out, f=440, d=3, vol=.3, sr=48000):
    ff('-f', 'lavfi', '-i', f'sine=frequency={f}:duration={d}:sample_rate={sr}', '-af', f'volume={vol}', out)
    return Path(out)


def beat(i, text, a, z):
    n = len(text)
    return {'id': i, 'text': text, 'start': a, 'end': z, 'chars': [[c, round(a + k * (z - a) / n, 3)] for k, c in enumerate(text)]}


YAML = """number: 99
slug: demo
title: 测试期
version: v1
host: 测试主讲
quotes:
  b2q: {file: assets/q.wav, speaker: 某人}
chapters:
  - {pre: a, name: 开头}
  - {pre: b, name: 正文：第二章}
pack:
  phone_parts:
    - {name: 全部, chapters: [a, b]}
cover:
  headline: 测试封面标题
  tag: 测试标签
  big: 90%
  sub: [第一行副标题, 第二行黄字]
  note: 2026 年 · 测试
intro:
  titles: [标题一, 标题二, 标题三]
  short: [第一行, 第二行, 第三行]
  long: 长版正文。
  source: 出处一句。
  tags: [测试]
publish:
  repo: example/chonggu-test
  asset_slug: demo
qa:
  allow: []
"""


