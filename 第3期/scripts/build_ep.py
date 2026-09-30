"""timeline.json (cut audio + char times) + storyboard.json -> render/ep.js and the EP-timeline audio.

EP timeline:  [0, Tco] cold open | [Tco, Tb] title-card slot (version A puts the 《重估》 intro here instead)
              | [Tb, Tbe] body | [Tbe, Tend] end card
"""
import json, re, sys
from pathlib import Path
import numpy as np
from scipy.io import wavfile

HERE = Path(__file__).resolve().parent
import os
ED = HERE / os.environ.get('EDIT_DIR', 'edit')
R = HERE.parent / 'render'
SR = 48000
TL = json.load(open(ED / 'timeline.json'))
SB = json.load(open(sys.argv[1] if len(sys.argv) > 1 else HERE / 'storyboard.json'))
PUNCT = set('，。？！、；：,.?!;:“”"（）()…')
INTRO = json.load(open(HERE.parent / 'outputs' / (os.environ.get('INTRO_BASE', '重估_片头_第3期_注意力与直觉') + '.json')))
TITLE_SLOT = round(INTRO['derived']['END'] + 0.5, 3)   # intro: until the finished frame has held 0.5 s
END_CARD = SB.get('end_card', 5.0)

cold = wavfile.read(ED / 'cold.wav')[1] if (ED / 'cold.wav').exists() else np.zeros(SR)
body = wavfile.read(ED / 'body.wav')[1]
Tco = round(len(cold) / SR + 1.0, 3)           # the last quote's attribution holds for a beat
Tb = round(Tco + TITLE_SLOT, 3)
Tbe = round(Tb + len(body) / SR + 1.4, 3)       # let the last line land before the end card
Tend = round(Tbe + END_CARD, 3)

# ---------------------------------------------------------------- chars
chars, rows = [], TL['body']
for ri, r in enumerate(rows):
    hl_idx = set()
    for w in r.get('hl', []) or []:
        for m in re.finditer(re.escape(w), r['text']):
            hl_idx.update(range(m.start(), m.end()))
    for i, c in enumerate(r['text']):
        chars.append({'c': c, 't0': round(Tb + r['char_t'][i], 3), 'spk': r['spk'], 'row': ri, 'hl': i in hl_idx,
                      'punct': c in PUNCT})
for i, c in enumerate(chars):
    nxt = chars[i + 1]['t0'] if i + 1 < len(chars) and chars[i + 1]['row'] == c['row'] else Tb + rows[c['row']]['t1'] - Tb + Tb
    c['t1'] = round(max(c['t0'] + 0.05, min(nxt, c['t0'] + 0.6)), 3)

# ---------------------------------------------------------------- subtitle lines
MAXL = 16
import jieba
jieba.setLogLevel(60)
for w in ['很久', '反推', '更多人', '这么一层', '方向性直觉', '注意力', '临床直觉', '不确定性', '变现', '网感', '世界经验']:
    jieba.add_word(w, freq=200000)
BAD_END_WORDS = {'也许', '如果', '因为', '所以', '但是', '而且', '比如说', '就是', '可能', '甚至', '或者'}
BAD_END_PAIRS = {'在我', '给我', '对我', '让我', '向我'}
BAD_END = set('把在向被从对和与连的了是就也都还而但给让这那个些将于')     # a line should not end on these one-char words
BAD_START = set('的了着过吧呢吗啊得地')                               # nor start with these
SENT_END = '。？！'


def groups():
    """Consecutive rows of one speaker that form one sentence (cut pieces of a sentence are joined again)."""
    out, cur = [], []
    for ri, r in enumerate(rows):
        if cur:
            prev = rows[cur[-1]]
            if r['spk'] != prev['spk'] or prev['text'].rstrip()[-1:] in SENT_END or r['t0'] - prev['t1'] > 1.2:
                out.append(cur); cur = []
        cur.append(ri)
    if cur:
        out.append(cur)
    return out


def split_clause(v):
    """v: list of char indices (no punctuation) longer than MAXL -> near-equal parts cut at word boundaries."""
    text = ''.join(chars[i]['c'] for i in v)
    bounds, pos = [], 0
    for w in jieba.cut(text):
        pos += len(w)
        bounds.append((pos, w))
    k = -(-len(v) // MAXL)
    parts, start = [], 0
    for part in range(1, k):
        target = round(len(v) * part / k)
        best, bestcost = None, 1e9
        for q, (p_, w) in enumerate(bounds):
            if p_ <= start + 3 or p_ >= len(v) - 2 or p_ - start > MAXL:
                continue
            nxt = bounds[q + 1][1] if q + 1 < len(bounds) else ''
            cost = abs(p_ - target) + (6 if (len(w) == 1 and w in BAD_END) else 0) + (6 if nxt[:1] in BAD_START and len(nxt) == 1 else 0) + (5 if w in BAD_END_WORDS else 0) + (6 if text[max(0, p_ - 2):p_] in BAD_END_PAIRS else 0)
            if cost < bestcost:
                best, bestcost = p_, cost
        if best is None:
            best = min(max(target, start + 1), len(v) - 1)
        parts.append(v[start:best]); start = best
    parts.append(v[start:])
    return parts


def split_group(g):
    idx = [i for i, c in enumerate(chars) if c['row'] in g]
    clauses, cur = [], []
    for k, i in enumerate(idx):
        cur.append(i)
        row_end = k + 1 < len(idx) and chars[idx[k + 1]]['row'] != chars[i]['row']   # a cut join is a natural break
        if chars[i]['c'] in '，。？！；：、,.?!;:' or row_end:
            clauses.append(cur); cur = []
    if cur:
        clauses.append(cur)

    def vis(cl):
        return [i for i in cl if not chars[i]['punct']]

    lines, line = [], []
    for cl in clauses:
        v = vis(cl)
        if len(v) > MAXL:
            if line:
                lines.append(line); line = []
            for part in split_clause(v):
                # re-attach the clause's punctuation that follows the part's last char
                last = part[-1]
                tail = [i for i in cl if i > last and chars[i]['punct'] and (part is split_clause(v)[-1])]
                lines.append(part + tail)
            continue
        if len(vis(line)) + len(v) <= MAXL and not (line and chars[line[-1]]['c'] in '：:'):
            line += cl
        else:
            if line:
                lines.append(line)
            line = list(cl)
    if line:
        lines.append(line)
    return lines


subs = []
for g in groups():
    r = rows[g[0]]
    for L in split_group(g):
        out = []
        for j, i in enumerate(L):
            c = chars[i]
            if c['punct']:
                if c['c'] in '？?' and j == len(L) - 1:
                    out.append({'c': '？', 't0': c['t0'], 'hl': False})
                elif j < len(L) - 1 and c['c'] not in '“”"（）()':
                    out.append({'c': ' ', 't0': c['t0'], 'hl': False})
                continue
            out.append({'c': c['c'], 't0': c['t0'], 'hl': c['hl']})
        while out and out[-1]['c'] == ' ':
            out.pop()
        # thin space around Latin words of 3+ letters next to Chinese (那个 waitlist, 当时 Codex)
        txt = ''.join(o['c'] for o in out)
        spaced = []
        for k, o in enumerate(out):
            isl = o['c'].isascii() and o['c'].isalpha()
            prev = out[k - 1]['c'] if k else ''
            if k and isl and not (prev.isascii() and prev.isalpha()) and prev not in '  ':
                if len(re.match(r'[A-Za-z]+', txt[k:]).group(0)) >= 3:
                    spaced.append({'c': ' ', 't0': o['t0'], 'hl': False})
            spaced.append(o)
            nxt = out[k + 1]['c'] if k + 1 < len(out) else ''
            if isl and nxt and not (nxt.isascii() and nxt.isalpha()) and nxt not in '  ？':
                if len(re.search(r'[A-Za-z]+$', txt[:k + 1]).group(0)) >= 3:
                    spaced.append({'c': ' ', 't0': o['t0'], 'hl': False})
        out = spaced
        if not out:
            continue
        vis_ = [chars[i] for i in L if not chars[i]['punct']]
        subs.append({'t0': out[0]['t0'], 't1': round(vis_[-1]['t1'] + 0.25, 3), 'spk': r['spk'], 'chars': out})

# ---------------------------------------------------------------- anchors (same rule as engine.js)
NP_IDX = [i for i, c in enumerate(chars) if not c['punct'] and c['c'].strip()]
plain = ''.join(chars[i]['c'] for i in NP_IDX)          # punctuation-free, so anchors ignore commas


MISSES = []


def anchor(a, frm=0.0):
    if isinstance(a, (int, float)):
        return float(a) if a > 50 or frm == 0 else float(a)
    s, off = str(a), 0.0
    m = re.match(r'^(.*?)([+-]\d+(?:\.\d+)?)$', s)
    if m and m.group(1):
        s, off = m.group(1), float(m.group(2))
    end = s.startswith('$')
    if end:
        s = s[1:]
    s = ''.join(ch for ch in s if ch not in PUNCT and ch.strip())
    start = 0
    while start < len(NP_IDX) and chars[NP_IDX[start]]['t0'] < frm - 1.5:
        start += 1
    k = plain.find(s, start)
    if k < 0:
        k = plain.lower().find(s.lower(), start)
    if k < 0:
        MISSES.append(f'{a!r} after t={frm:.2f}')
        return frm + 0.5
    return (chars[NP_IDX[k + len(s) - 1]]['t1'] if end else chars[NP_IDX[k]]['t0']) + off


scenes = []
DROPPED = []
for i, S in enumerate(SB['scenes']):
    S = dict(S)
    n0 = len(MISSES)
    t0 = anchor(S['t0'], S.get('after', Tb))   # first occurrence in the body: scene order follows the edit
    if len(MISSES) > n0:          # the phrase that opens this scene was cut from the edit: drop the scene
        del MISSES[n0:]
        DROPPED.append(S['t0'])
        continue
    S['t0'] = round(t0 - S.get('lead', 0.15), 3)
    scenes.append(S)
if DROPPED:
    print('scenes dropped (opening phrase not in the edit):', DROPPED)
scenes.sort(key=lambda S: S['t0'])
for a_, b_ in zip(scenes, scenes[1:]):
    if b_['t0'] - a_['t0'] < 2.0:
        print(f'  warning: scenes {a_["id"] if "id" in a_ else ""} and next start {b_["t0"] - a_["t0"]:.1f} s apart')
for i, S in enumerate(scenes):
    if S.get('t1') is None:
        S['t1'] = scenes[i + 1]['t0'] + 0.3 if i + 1 < len(scenes) else Tbe
    else:
        S['t1'] = round(anchor(S['t1'], S['t0']), 3)
    for e in S.get('els', []):
        if 'at' in e and e['at'] is not None:
            e['at'] = round(anchor(e['at'], S['t0']) - e.get('lead', 0.08) + e.get('delay', 0), 3)
        else:
            e['at'] = round(S['t0'] + e.get('delay', 0.1), 3)
        e.pop('delay', None)

if MISSES:
    raise SystemExit('anchors not found:\n  ' + '\n  '.join(MISSES))
chapters = []
for ch in (SB.get('chapters') or TL['chapters']):
    first = next(r for r in rows if r['chapter'] == ch['no'])
    chapters.append({'no': ch['no'], 'name': ch['name'], 't0': round(Tb + first['t0'] - 0.2, 3)})
chapters[0]['t0'] = Tb

# ---------------------------------------------------------------- cold open quotes
def wrap_quote(t, maxc=12):
    # break at punctuation into lines of at most maxc chars; long clauses split evenly
    parts, cur = [], ''
    for ch in t:
        cur += ch
        if ch in '，。？！；：、':
            parts.append(cur); cur = ''
    if cur:
        parts.append(cur)
    lines, line = [], ''
    for c in parts:
        if len(line) + len(c.rstrip('，。、；：')) <= maxc:
            line += c
        else:
            if line:
                lines.append(line)
            while len(c) > maxc + 1:
                k = -(-len(c) // (-(-len(c) // maxc)))
                lines.append(c[:k]); c = c[k:]
            line = c
    if line:
        lines.append(line)
    return '\n'.join(l.rstrip('，、；：') if i < len(lines) - 1 else l for i, l in enumerate(lines))


quotes = []
for q in TL['cold_open']:
    text = q['display'] if q.get('display') else wrap_quote(q['text'])
    lines = text.split('\n')
    disp = '“' + text + '”'
    times = []
    ct = q['char_t']
    k = 0
    raw = q['text']
    # map each displayed char to the spoken char time (display may insert \n; quote marks take neighbours)
    src_i = 0
    for c in disp:
        if c == '\n':
            continue
        if c == '“':
            times.append(round(ct[0] - 0.05, 3)); continue
        if c == '”':
            times.append(round(ct[-1] + 0.05, 3)); continue
        while src_i < len(raw) and raw[src_i] != c:
            src_i += 1
        times.append(round(ct[min(src_i, len(ct) - 1)], 3))
        src_i += 1
    quotes.append({'t0': round(q['t0'], 3), 't1': round(q['t1'], 3), 'who': {'gu': '顾东政', 'wu': '吴原同'}[q['spk']],
                   'text': disp, 'times': times, 'y': q.get('y')})

# ---------------------------------------------------------------- audio on the EP timeline + envelope
n = int((Tend + 0.5) * SR)
mix = np.zeros(n, np.float32)
mix[:len(cold)] += cold
mix[int(Tb * SR):int(Tb * SR) + len(body)] += body
import subprocess
ia = ED / 'intro_audio.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(HERE.parent / 'outputs' / (os.environ.get('INTRO_BASE', '重估_片头_第3期_注意力与直觉') + '.mp4')), '-vn', '-ac', '1', '-ar', str(SR), '-c:a', 'pcm_f32le', str(ia)], check=True)
intro_a = wavfile.read(ia)[1].astype(np.float32)
env_mix = mix.copy()
k0 = int(Tco * SR); env_mix[k0:k0 + len(intro_a)] += intro_a[:max(0, len(env_mix) - k0)] * 0.5
wavfile.write(ED / 'ep_voice.wav', SR, mix)
hop = SR // 100
m = len(env_mix) // hop
rms = np.sqrt((env_mix[:m * hop].reshape(m, hop) ** 2).mean(1)) + 1e-9
db = 20 * np.log10(rms / (np.percentile(rms[rms > 1e-4], 95) + 1e-9))
env = np.clip((db + 42) / 42, 0, 1) ** 1.3
env = (env * 255).round().astype(int).tolist()

EP = {
    'show': {'name': '重估', 'ep': SB['episode'], 'label': SB.get('label')},
    'env': env, 'chars': [{k: c[k] for k in ('c', 't0', 't1', 'spk')} for c in chars], 'subs': subs,
    'coldopen': {'t0': 0.0, 't1': Tco, 'quotes': quotes, 'handoff': SB.get('handoff', 'intro')},
    'title': {**SB['title'], 't0': Tco + 0.15, 't1': Tb + 0.1},
    'end': {**SB['end'], 't0': Tbe, 't1': Tend},
    'body': {'t0': Tb, 't1': Tbe},
    'chapters': chapters, 'scenes': scenes,
}
A = dict(INTRO['anchors']); A.update(INTRO['derived'])
(P1s, P1e), (P2s, P2e), (P3s, P3e), (P4s, P4e) = INTRO['phrases']
A.update({'P1s': P1s, 'P2s': P2s, 'P3s': P3s, 'P3e': P3e, 'P4s': P4s, 't3': INTRO['t3'], 't4t': round(P4s + (A['t4w'] - P4s) / 2, 3)})
TSIZE = min(168, 840 // len(INTRO['topic']))   # topic fits between the old mark and the right margin
EP['intro'] = {'t0': Tco, 'a': A, 'topic': INTRO['topic'], 'tsize': TSIZE, 'topic_w': TSIZE * len(INTRO['topic']),
               'date': '2026.09.29'}
(R / os.environ.get('EP_JS', 'ep.js')).write_text('window.EP=' + json.dumps(EP, ensure_ascii=False))
json.dump({'Tco': Tco, 'Tb': Tb, 'Tbe': Tbe, 'Tend': Tend, 'n_subs': len(subs), 'n_scenes': len(scenes),
           'chapters': chapters}, open(ED / 'ep_times.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps({'Tco': Tco, 'Tb': Tb, 'Tbe': Tbe, 'Tend': Tend, 'subs': len(subs), 'scenes': len(scenes)}))
