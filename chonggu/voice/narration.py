"""把每句真声（voice/lines/）拼成整条口播 → voice/narration.wav（只有主讲）、narration_quotes.wav（只有原声）、narration.spans.json（每句的起止，给重排时间线用）
- 每句用 lines/pick.json 选中的那条；首尾的静音修到 40 ms。真声已经在 lines.py 里收过停顿、提过速，这里不再变速、不再撑开停顿。
- 句与句之间：稿子写了（停 x）的照写；逗号结尾 .18 秒，问号叹号 .45 秒，句号 .38 秒；换章 .9 秒。
- 呼吸点（episode.yaml 的 breath，{句id: 秒}）：这句开口前多空这么久（要拉起来、放下、歇两三秒再拉起来）。
- 原声句（episode.yaml 的 quotes）把当事人的原声放进去，前留 .15 秒、后留 .25 秒。"""
import numpy as np
from chonggu.voice.common import SR, read_wav, han

def trim(y, pad=.04):
    a = np.abs(y); th = max(a.max() * .015, 1e-4) if len(a) else 1e-4; nz = np.where(a > th)[0]
    if not len(nz): return y
    p = int(pad * SR); return y[max(0, nz[0] - p):nz[-1] + p]

def fade(y, ms=6):
    n = min(len(y) // 2, int(ms / 1000 * SR)); r = np.linspace(0, 1, n, dtype=np.float32); y = y.copy(); y[:n] *= r; y[-n:] *= r[::-1]; return y

def narrate(beats, chapters, lines_dir, pick, quotes, breath, gaps):
    """quotes：{原声句id: {'file': Path}}；gaps：估算时间线里每句后面的空档（≥ .5 秒的照留）。返回 (人声, 原声, spans)"""
    first = {c['first'] for c in chapters}
    segs, spans, t = [], {}, .3
    for k, b in enumerate(beats):
        if k and b['id'] in first: t += .9
        t += breath.get(b['id'], 0)
        if b['id'] in quotes:
            y = read_wav(quotes[b['id']]['file']); t += .15
            spans[b['id']] = (round(t, 3), round(t + len(y) / SR, 3)); segs.append((t, fade(y), 'quote')); t += len(y) / SR + .25; continue
        y = fade(trim(read_wav(lines_dir / pick[b['id']])))
        spans[b['id']] = (round(t, 3), round(t + len(y) / SR, 3)); segs.append((t, y, 'voice')); t += len(y) / SR
        g = gaps.get(b['id'], 0); e = b['text'].strip()[-1]
        t += g if g >= .5 else (.18 if e in '，：、；' else .45 if e in '？！' else .38)
    q = np.zeros(int((t + 1) * SR), np.float32); v = np.zeros_like(q)
    for a, s, kind in segs:
        i = int(a * SR); (v if kind == 'voice' else q)[i:i + len(s)] += s
    n = sum(han(b['text']) for b in beats if b['id'] not in quotes)
    sp = sum(len(s) for _, s, kind in segs if kind == 'voice') / SR
    print(f'口播 {t / 60:.2f} 分钟；说话时 {n / (sp / 60):.0f} 字/分，全长 {n / (t / 60):.0f} 字/分')
    return v, q, spans
