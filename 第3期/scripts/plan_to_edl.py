"""Merged edit plan (workflow JSON) -> edl.json for assemble.py.

python3 plan_to_edl.py plan.json edl.json
Adds subtitle highlight words (red when spoken, as in 第 2 期) and portrait line breaks for the cold-open quotes.
"""
import json, sys

plan = json.load(open(sys.argv[1]))
SPK = {'顾东政': 'gu', '吴原同': 'wu'}
# key terms shown in red in the subtitles (first occurrence per piece only, so the red stays rare)
HL = ['注意力价值', '方向性直觉', '注意力', '拯救自己', '学习的意义', '分享出去', '财富自由', '留在自己身上', '提供方向',
      '网感', '下注', '临床直觉', '留下东西', '非常宝贵', '非常非常差', '直觉判断', '怎么去变现', '不构成投资建议', '更加值钱']
BREAK_AFTER = set('的了是就在和把说我你他们也都还而但所以因为如果')


def hl_for(text):
    out, used = [], ''
    for w in HL:
        if w in text and not any(w in u or u in w for u in out):
            out.append(w)
        if len(out) >= 2:
            break
    return out


def wrap(t, maxc=12):
    """Portrait cold-open lines: break at punctuation, split long clauses near the middle at a soft break."""
    clauses, cur = [], ''
    for ch in t:
        cur += ch
        if ch in '，。？！；：、':
            clauses.append(cur); cur = ''
    if cur:
        clauses.append(cur)
    pieces = []
    for c in clauses:
        core = c.rstrip('，。？！；：、')
        if len(core) <= maxc:
            pieces.append(c); continue
        k = -(-len(core) // maxc)
        size = len(core) / k
        start = 0
        for part in range(1, k):
            target = round(size * part)
            cands = range(max(start + 3, target - 3), min(len(core) - 2, target + 3) + 1)
            best = min(cands, key=lambda p: (0 if core[p - 1] in BREAK_AFTER else 1, abs(p - target)))
            pieces.append(core[start:best]); start = best
        pieces.append(c[start:])
    lines, line = [], ''
    for p in pieces:
        if line and len((line + p).rstrip('，。？！；：、')) > maxc:
            lines.append(line); line = p
        else:
            line += p
    if line:
        lines.append(line)
    out = [l.rstrip('，、；：') if i < len(lines) - 1 else l for i, l in enumerate(lines)]
    return '\n'.join(out)


edl = {'cold_open': [], 'chapters': []}
for q in plan['cold_open']:
    edl['cold_open'].append({'spk': SPK[q['speaker']], 'src': [q['src_start'], q['src_end']], 'text': q['text'],
                             'display': q.get('display') or wrap(q['text']), 'exact': True, **({'parts': q['parts']} if 'parts' in q else {})})
for c in plan['chapters']:
    edl['chapters'].append({'no': c['no'], 'name': c['name'], 'pieces': [
        {'spk': SPK[p['speaker']], 'src': [p['src_start'], p['src_end']], 'text': p['text'], 'hl': hl_for(p['text']),
         'exact': not p.get('snap', False), **({'gap': p['gap']} if 'gap' in p else {}), **({'parts': p['parts']} if 'parts' in p else {})}
        for p in c['pieces']]})
json.dump(edl, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
for q in edl['cold_open']:
    print(q['display'].replace('\n', ' / '))
print(sum(len(c['pieces']) for c in edl['chapters']), 'pieces,', len(edl['chapters']), 'chapters')
