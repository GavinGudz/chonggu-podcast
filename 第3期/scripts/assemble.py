"""Cut the recording by an edit list, tighten pauses, level the two voices, and time every character.

python3 assemble.py edl.json out_dir
  edl.json: {"cold_open": [{"spk": "gu"|"wu", "src": [a, b], "text": "..."}],
             "chapters": [{"no": "01", "name": "...", "pieces": [{"spk", "src", "text", "hl": ["词"]}]}]}
Writes out_dir/body.wav, out_dir/cold.wav (48 kHz mono float) and out_dir/timeline.json.
Character times come from whisper run on each cut piece, aligned to the corrected text, clamped to voiced audio.
"""
import json, re, sys, difflib
from pathlib import Path
import numpy as np
from scipy.io import wavfile

SR = 48000
HERE = Path(__file__).resolve().parent
edl = json.load(open(sys.argv[1]))
OUT = Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
sr, SRC = wavfile.read(HERE / 'src48.wav'); SRC = SRC.astype(np.float32)
assert sr == SR
HOP = 480
fr = SRC[:len(SRC) // HOP * HOP].reshape(-1, HOP)
DB = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
SIL = -48.0
GAIN = {'gu': 10 ** (2.0 / 20), 'wu': 1.0}   # 顾 records ~2 dB quieter


def voiced(i):
    return 0 <= i < len(DB) and DB[i] > SIL


def snap_start(s):
    """Start of a kept piece. In silence: just before the next onset. Inside speech: a silence edge within
    120 ms before s if there is one, else the quietest 10 ms frame in [s-100 ms, s+60 ms]."""
    i = int(round(s * 100))
    if not voiced(i):
        k = i
        while k < i + 35 and not voiced(k):
            k += 1
        j = i
        while j > i - 30 and not voiced(j - 1):
            j -= 1
        return max(k - 4, j) / 100
    j = i
    while j > i - 12 and voiced(j - 1):
        j -= 1
    if not voiced(j - 1):
        return max(j - 3, 0) / 100
    w = DB[i - 10:i + 7]
    return (i - 10 + int(np.argmin(w))) / 100


def snap_end(e):
    i = int(round(e * 100))
    if not voiced(i - 1):
        k = i
        while k > i - 35 and not voiced(k - 1):
            k -= 1
        j = i
        while j < i + 30 and not voiced(j):
            j += 1
        return min(k + 8, j) / 100
    j = i
    while j < i + 12 and voiced(j):
        j += 1
    if not voiced(j):
        return (j + 6) / 100
    w = DB[i - 7:i + 11]
    return (i - 7 + int(np.argmin(w)) + 1) / 100


def piece_audio(a, b, spk, fade=0.012):
    x = SRC[int(a * SR):int(b * SR)].copy() * GAIN[spk]
    f = int(fade * SR)
    x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f)
    return x


def tighten(x, max_gap=0.55, to=0.40):
    """Shorten silences inside a piece. Returns audio and a list of (in_t, out_t) breakpoints."""
    h = 480
    n = len(x) // h
    db = 20 * np.log10(np.sqrt((x[:n * h].reshape(n, h) ** 2).mean(1)) + 1e-9)
    sil = db < SIL
    out, bp, i, o = [], [(0.0, 0.0)], 0, 0
    last = 0
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]:
                j += 1
            L = (j - i) / 100
            if L > max_gap and i > 0 and j < n:
                keep = int(to * 100)
                a_keep = keep // 2
                # keep a_keep frames after speech, then the last keep-a_keep frames before speech
                seg_a = x[last * h:(i + a_keep) * h]
                out.append(seg_a); o += len(seg_a)
                bp.append(((i + a_keep) / 100, o / SR))
                last = j - (keep - a_keep)
                bp.append((last / 100, o / SR))
            i = j
        else:
            i += 1
    seg = x[last * h:]
    out.append(seg); o += len(seg)
    bp.append((len(x) / SR, o / SR))
    y = np.concatenate(out)
    # tiny crossfades already implied by silence; done
    return y, bp


def warp(bp, t):
    for (a0, b0), (a1, b1) in zip(bp, bp[1:]):
        if a0 <= t <= a1:
            return b0 + (t - a0) * ((b1 - b0) / (a1 - a0) if a1 > a0 else 0)
    return bp[-1][1]


# ---------------------------------------------------------------- whisper per piece
import mlx_whisper
PROMPT = '普通话播客《重估》。注意力价值，方向性直觉，网感，下注，职高，央企，国企，面试官，财富自由，临床直觉，Codex，AI，股市。'
PUNCT = set('，。？！、；：,.?!;:“”"‘’（）() …—-')


def asr_chars(y):
    pad = np.zeros(int(0.4 * SR), np.float32)
    z = np.concatenate([pad, y, pad])
    from scipy.signal import resample_poly
    z16 = resample_poly(z, 1, 3).astype(np.float32)  # 48k -> 16k
    r = mlx_whisper.transcribe(z16, path_or_hf_repo='mlx-community/whisper-large-v3-mlx', language='zh',
                               word_timestamps=True, initial_prompt=PROMPT, condition_on_previous_text=False)
    out = []
    for s in r['segments']:
        for w in s.get('words', []):
            cs = [c for c in w['word'].strip() if c not in PUNCT and not c.isspace()]
            if not cs:
                continue
            d = (w['end'] - w['start']) / len(cs)
            for k, c in enumerate(cs):
                out.append((c, w['start'] + k * d - 0.4, w['start'] + (k + 1) * d - 0.4))
    return out, r['text']


def time_chars(text, y):
    """Char times (in piece seconds) for the display text."""
    disp = [c for c in text]
    core_idx = [i for i, c in enumerate(disp) if c not in PUNCT and not c.isspace()]
    core = [disp[i] for i in core_idx]
    got, raw = asr_chars(y)
    EQ = str.maketrans('他她得地裡後個們這為說過來時間錢會麼經學實東', '它它的的里后个们这为说过来时间钱会么经学实东')
    sm = difflib.SequenceMatcher(a=[c.translate(EQ) for c in core], b=[g[0].translate(EQ) for g in got], autojunk=False)
    t0 = [None] * len(core)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            t0[blk.a + k] = got[blk.b + k][1]
    matched = sum(v is not None for v in t0)
    # voiced runs of the piece
    h = 480; n = len(y) // h
    db = 20 * np.log10(np.sqrt((y[:n * h].reshape(n, h) ** 2).mean(1)) + 1e-9)
    vo = db > SIL
    first = next((i for i in range(n) if vo[i]), 0) / 100
    last = (n - next((i for i in range(n) if vo[n - 1 - i]), 0)) / 100
    # anchor ends, interpolate gaps
    if t0 and t0[0] is None:
        t0[0] = first
    if t0 and t0[-1] is None:
        t0[-1] = max(last - 0.2, (t0[0] or 0))
    idx = [i for i, v in enumerate(t0) if v is not None]
    for a, b in zip(idx, idx[1:]):
        for i in range(a + 1, b):
            t0[i] = t0[a] + (t0[b] - t0[a]) * (i - a) / (b - a)
    # monotone, inside [first, last], and not inside silence (push to next onset)
    prev = first - 0.05
    for i in range(len(t0)):
        v = min(max(t0[i], prev + 0.03), last - 0.05)
        k = int(v * 100)
        if 0 <= k < n and not vo[k]:
            m = k
            while m < n and not vo[m]:
                m += 1
            if m < n and (m - k) < 80:
                v = m / 100
        t0[i] = max(v, prev + 0.03)
        prev = t0[i]
    times = [None] * len(disp)
    for j, i in enumerate(core_idx):
        times[i] = t0[j]
    # punctuation takes the time of the previous char
    for i in range(len(times)):
        if times[i] is None:
            times[i] = times[i - 1] if i else first
    return times, matched / max(len(core), 1), raw


# ---------------------------------------------------------------- build
def build(pieces, gap_rule, lead=0.0):
    audio = [np.zeros(int(lead * SR), np.float32)]
    t = lead
    rows = []
    prev = None
    for p in pieces:
        if p.get('parts'):   # several verified ranges joined into one line (tight 0.15 s joins)
            a, b = float(p['parts'][0][0]), float(p['parts'][-1][1])
            segs = []
            for k, (pa, pb) in enumerate(p['parts']):
                if k:
                    segs.append(np.zeros(int(p.get('inner_gap', 0.15) * SR), np.float32))
                segs.append(piece_audio(float(pa), float(pb), p['spk'], 0.008))
            x = np.concatenate(segs)
        else:
            if p.get('exact'):   # boundaries already verified at 10 ms on the energy curve: use them as given
                a, b = float(p['src'][0]), float(p['src'][1])
            else:
                a, b = snap_start(p['src'][0]), snap_end(p['src'][1])
            x = piece_audio(a, b, p['spk'], 0.008 if p.get('exact') else 0.012)
        if prev is not None:
            g = gap_rule(prev, p, a)
            audio.append(np.zeros(int(g * SR), np.float32)); t += g
        y, bp = tighten(x)
        times, q, raw = time_chars(p['text'], y)
        rows.append({**p, 'cut': [round(a, 3), round(b, 3)], 't0': round(t, 3), 't1': round(t + len(y) / SR, 3),
                     'char_t': [round(t + v, 3) for v in times], 'match': round(q, 2), 'asr': raw})
        if q < 0.7:
            print(f'  LOW MATCH {q:.2f}  {p["text"]}  <>  {raw}', flush=True)
        audio.append(y); t += len(y) / SR
        prev = {**p, 'cut': [a, b]}
    return np.concatenate(audio), rows


def body_gap(prev, p, a):
    src_gap = a - prev['cut'][1]
    if p.get('gap') is not None:
        return p['gap']
    if p.get('chapter_start'):
        return 0.9
    if prev['spk'] != p['spk']:
        return 0.55
    if 0 <= src_gap < 0.9:  # contiguous in the recording: keep the breath, capped
        return max(0.12, min(src_gap - 0.12, 0.42))
    return 0.36


pieces = []
for ch in edl['chapters']:
    for k, p in enumerate(ch['pieces']):
        pieces.append({**p, 'chapter': ch['no'], 'chapter_start': k == 0 and ch['no'] != edl['chapters'][0]['no']})
print(f'{len(pieces)} body pieces', flush=True)
body, rows = build(pieces, body_gap, lead=0.25)
wavfile.write(OUT / 'body.wav', SR, body.astype(np.float32))

co_rows = []
if edl.get('cold_open'):
    cold, co_rows = build(edl['cold_open'], lambda prev, p, a: p.get('gap', 1.15), lead=0.7)
    wavfile.write(OUT / 'cold.wav', SR, cold.astype(np.float32))
    print(f'cold open {len(cold) / SR:.2f} s', flush=True)

json.dump({'body': rows, 'cold_open': co_rows, 'body_seconds': len(body) / SR, 'chapters': [{'no': c['no'], 'name': c['name']} for c in edl['chapters']]}, open(OUT / 'timeline.json', 'w'),
          ensure_ascii=False, indent=1)
print(f'body {len(body) / SR:.2f} s -> {OUT}', flush=True)
