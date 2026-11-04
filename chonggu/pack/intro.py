"""标题和发布简介（第 8 期 tools/intro_v18.py）：python -m chonggu intro <期> → out/发布简介_第N期.md
短版放最前面（三行加标签，不放时间轴：主讲要的是「给我简介，不用时间轴」「短点」；第 8 期的短版只贴在了对话里，文件里没有）。
长版备用：主讲署名、正文、章节时间戳（按 timeline.json 算）、一句出处、「以上内容不构成投资建议」。
intro:
  titles: [推荐的标题, 第二个, 第三个]     # 三个都和封面用同一个钩子
  short: [第一行, 第二行, 第三行]
  long: |
    长版正文……
  source: 数字和原话出自 ……
  tags: [Anthropic, 招股书, Claude]      # #重估播客 每期都带，不用写
publish 不会重跑这一步：手改了简介，改的是 episode.yaml，再跑 intro。"""
from pathlib import Path
from chonggu.gates import GateFailed
from chonggu.qa import common as C
from .cover import host_name

ts = lambda t: f'{int(t // 3600)}:{int(t % 3600 // 60):02d}:{int(t % 60):02d}' if t >= 3600 else f'{int(t // 60):02d}:{int(t % 60):02d}'


def tags(cfg):
    t = ['重估播客'] + [x.lstrip('#') for x in cfg.get('tags', []) if x.lstrip('#') != '重估播客']
    return ' '.join(f'#{x}' for x in t)


def ai_line(ep):
    a = (getattr(ep, 'publish', None) or {}).get('ai_label', True)
    return (a if isinstance(a, str) else '勾选「内容由 AI 生成」。') if a else '不勾「内容由 AI 生成」（开工单定的）。'


def write(ep):
    cfg = getattr(ep, 'intro', None) or {}; T = C.timeline(ep); N = ep.number
    if not cfg.get('titles') or not cfg.get('short'):
        raise GateFailed('episode.yaml 里的 intro 至少要有 titles（三个标题）和 short（短版简介）')
    host = host_name(ep); ch = '\n'.join(f"{ts(c['t0'])} {c['name']}" for c in T['chapters'])
    c16, c34 = C.name(ep, 'cover', '16比9', ext='.png'), C.name(ep, 'cover', '3比4', ext='.png')
    res = ['1080p'] + (['2K（B 站用这个）'] if Path(C.film(ep, '2k')).exists() else [])
    titles = '\n'.join(f'{k}. {t}' for k, t in enumerate(cfg['titles'], 1))
    long_ = (cfg.get('long') or '').strip()
    src = (cfg.get('source') or '').strip()
    txt = f"""# 《重估》第 {N} 期 · 发布用

## 简介（短版，发布时贴这个）
{chr(10).join(cfg['short'])}
{tags(cfg)}

## 标题（和封面同一个钩子；推荐第 1 个）
{titles}

## 简介（长版，备用）
本期主讲：{host}
{long_}

章节
{ch}

{src + chr(10) if src else ''}以上内容不构成投资建议。

## 标签
{tags(cfg)}

## 发布时记得
- 封面：横版 `{c16}`（B 站、抖音横屏），竖版 `{c34}`（抖音竖屏、小红书）。
- {ai_line(ep)}
- 片长 {ts(T['duration'])}，16:9 横版，{' 和 '.join(res)}。放进《重估》合集。
"""
    p = Path(ep.out(C.name(ep, 'intro', ext='.md'))); p.parent.mkdir(parents=True, exist_ok=True); p.write_text(txt, encoding='utf-8')
    print('发布简介', ts(T['duration']), '→', p.name)
    return p
