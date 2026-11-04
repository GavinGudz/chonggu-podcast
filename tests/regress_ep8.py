"""第 8 期回归的比对（只在有第 8 期工程的电脑上跑）：python tests/regress_ep8.py <回归期的文件夹> [--ref 第8期的film_v9]
回归期的做法见 tests/REGRESSION.md（episodes_local/ep8，不进 git）。--ref 不写就用回归期里的 src 软链接。
比三样，允许的差别：
  口播 narration.wav 对 v18_owner.wav：句数一样，每句长度差 ≤30 ms，全长差 ≤0.5 秒（另外报是不是逐个采样一样）
  时间线 timeline.json 对 v18 的：句 id、字一样，每句开始差 ≤50 ms（另外报结束、逐字、章节的最大差）
退出码：都过 0，有没过的 1。"""
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path: sys.path.insert(0, str(ROOT))

LIM = {'line': .030, 'total': .5, 'start': .050}


def J(p): return json.loads(Path(p).read_text(encoding='utf-8'))


def voice(ep, ref):
    import numpy as np
    from chonggu.voice.common import read_wav
    A, B = J(ref / 'voice/clone/v18_owner.spans.json'), J(ep / 'voice/narration.spans.json')
    a, b = read_wav(ref / 'voice/clone/v18_owner.wav'), read_wav(ep / 'voice/narration.wav')
    d = {i: abs((B[i][1] - B[i][0]) - (A[i][1] - A[i][0])) for i in A.keys() & B.keys()}
    worst = sorted(((round(v, 4), i) for i, v in d.items()), reverse=True)[:5]
    n = min(len(a), len(b)); same = len(a) == len(b) and float(np.abs(a - b).max()) == 0.
    r = {'lines': (len(A), len(B)), 'missing': sorted(A.keys() - B.keys()), 'extra': sorted(B.keys() - A.keys()),
         'line_max_s': round(max(d.values(), default=0), 4), 'worst': worst, 'total_s': (round(len(a) / 48000, 3), round(len(b) / 48000, 3)),
         'starts_max_s': round(max((abs(B[i][0] - A[i][0]) for i in d), default=0), 4), 'sample_identical': same,
         'max_abs_diff': round(float(np.abs(a[:n] - b[:n]).max()), 6)}
    r['ok'] = (len(A) == len(B) and not r['missing'] and r['line_max_s'] <= LIM['line'] and abs(len(a) - len(b)) / 48000 <= LIM['total'])
    return r


def timeline(ep, ref):
    from chonggu.voice.checks import diff_timelines
    A, B = J(ref / 'timeline.json'), J(ep / 'timeline.json')
    ids = [x['id'] for x in A['beats']] == [x['id'] for x in B['beats']]
    texts = [x['text'] for x in A['beats']] == [x['text'] for x in B['beats']]
    d = diff_timelines(A, B)
    d.update(ids_same=ids, texts_same=texts, breath_same=A.get('breath') == B.get('breath'))
    d['ok'] = ids and texts and not d['missing'] and not d['extra'] and d['start'] <= LIM['start']
    return d


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument('ep'); p.add_argument('--ref'); p.add_argument('--json', action='store_true')
    a = p.parse_args(argv)
    ep = Path(a.ep).resolve(); ref = Path(a.ref) if a.ref else ep / 'src'
    R = {'voice': voice(ep, ref), 'timeline': timeline(ep, ref)}
    print(json.dumps(R, ensure_ascii=False, indent=1, default=str))
    return 0 if all(r['ok'] for r in R.values()) else 1


if __name__ == '__main__':
    raise SystemExit(main())
