"""按真的口播重排全片时间线（timeline.json）：
- 每句的起止取拼口播时记下的 spans；句里每个字的时刻：听写（以这句稿子当提示）逐字对齐，对不上的按前后插值。
  对上的字不到九成（主讲常有改说法、念快的地方），再用不带稿子的提示听一遍，取对上字多的那次。
- 原声句的字均匀摊在原声的时长里。
- 章节的起点 = 上一章最后一句结束 + .02 秒；最后一章结束 = 最后一句结束 + 1.5 秒。
- 呼吸点（episode.yaml 的 breath）：镜头切点提前 —— start = 上一句说完 + .35 秒（新镜头在空档里入场），vstart = 开口（字幕从这里出）。
  原声句不拆，画面代码按 B(原声句) 放原声。"""
import difflib
from chonggu.voice.common import PROMPT

EQ = str.maketrans('他她得地裡後個們這為說過來時間錢會麼經學實東兩', '它它的的里后个们这为说过来时间钱会么经学实东两')

def asr_chars(y, sr, a, z, prompt, ear):
    r = ear(y[int(a * sr):int(z * sr)], prompt=prompt, words=True, sr=sr)
    out = []
    for sg in r['segments']:
        for w in sg.get('words', []):
            cs = [c for c in w['word'] if c.isalnum()]
            if not cs: continue
            d = (w['end'] - w['start']) / len(cs)
            out += [(c.lower().translate(EQ), a + w['start'] + k * d) for k, c in enumerate(cs)]
    return out

def char_times(y, sr, a, z, text, ear):
    """一句里每个字（含标点）的时刻；返回 (时刻, 对上的比例)"""
    want = [(i, c.lower().translate(EQ)) for i, c in enumerate(text) if c.isalnum()]
    def match(got):
        sm = difflib.SequenceMatcher(a=[c for _, c in want], b=[g[0] for g in got], autojunk=False)
        tw = [None] * len(want)
        for blk in sm.get_matching_blocks():
            for k in range(blk.size): tw[blk.a + k] = got[blk.b + k][1]
        return tw
    tw = match(asr_chars(y, sr, max(0, a - .05), z + .05, text, ear))
    if sum(v is not None for v in tw) < .9 * len(tw):
        tw2 = match(asr_chars(y, sr, max(0, a - .05), z + .05, PROMPT, ear))
        if sum(v is not None for v in tw2) > sum(v is not None for v in tw): tw = tw2
    q = sum(v is not None for v in tw) / max(1, len(tw))
    if tw and tw[0] is None: tw[0] = a
    if tw and tw[-1] is None: tw[-1] = max(z - .15, tw[0])
    idx = [i for i, v in enumerate(tw) if v is not None]
    for i0, i1 in zip(idx, idx[1:]):
        for i in range(i0 + 1, i1): tw[i] = tw[i0] + (tw[i1] - tw[i0]) * (i - i0) / (i1 - i0)
    for i in range(1, len(tw)): tw[i] = max(tw[i], tw[i - 1])   # 不倒退
    tt, pos, nxt = [], {i: tw[j] for j, (i, _) in enumerate(want)}, None
    for i in range(len(text) - 1, -1, -1):   # 标点、空格用后面那个字的时刻
        if i in pos: nxt = pos[i]
        tt.append(nxt if nxt is not None else z)
    return [round(min(max(v, a), z), 3) for v in reversed(tt)], q

def make(y, sr, SP, T, quote_ids, ear, voice=None):
    """y：整条口播（narration.wav）；SP：narration.spans.json；T：现在的时间线（只用句 id、字、章节）"""
    beats, low = [], []
    for b in T['beats']:
        a, z = SP[b['id']]; text = b['text']
        if b['id'] in quote_ids:
            n = len(text); tt = [round(a + k * (z - a) / n, 3) for k in range(n)]
        else:
            tt, q = char_times(y, sr, a, z, text, ear)
            if q < .6: low.append((b['id'], round(q, 2))); print('对齐偏差大', b['id'], round(q, 2))
        beats.append({'id': b['id'], 'text': text, 'start': round(a, 3), 'end': round(z, 3), 'chars': [[c, t] for c, t in zip(text, tt)]})
    ids = [b['id'] for b in beats]; chs = []
    for k, c in enumerate(T['chapters']):
        i0 = ids.index(c['first'])
        chs.append({**c, 't0': 0.0 if k == 0 else round(beats[i0 - 1]['end'] + .02, 3)})
    end = beats[-1]['end'] + 1.5
    for k, c in enumerate(chs): c['t1'] = chs[k + 1]['t0'] if k + 1 < len(chs) else round(end, 3)
    out = {'duration': round(end, 3), 'beats': beats, 'chapters': chs, 'music_off': [], 'stops': [], 'inserts': [], 'estimated': False, 'voice': voice}
    return out, low

def apply_breath(T, BR, quote_ids):
    """有呼吸点的句子：start = min(开口, 上一句说完 + .35)，vstart = 开口"""
    B = T['beats']
    for k, b in enumerate(B):
        if k and b['id'] in BR and b['id'] not in quote_ids:
            b['vstart'] = b['start']; b['start'] = round(min(b['start'], B[k - 1]['end'] + .35), 3)
    T['breath'] = BR
    return sum('vstart' in b for b in B)

def report(T):
    print(f"{T['duration']:.1f} 秒 = {T['duration'] / 60:.2f} 分")
    for c in T['chapters']: print(f"  {c['name']:<10} {c['t0']:7.2f}–{c['t1']:7.2f}  {c['t1'] - c['t0']:5.1f} 秒")
