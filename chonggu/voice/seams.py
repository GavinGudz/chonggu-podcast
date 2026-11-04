"""接缝：拼口播时每一段的头上、尾巴上常带进来前一遍（后一遍）的半个字（主讲：「开了家新公司，司」）。不剪掉，只在原位换成静音：每句长度不变。
1. audit：每一段的头和尾找「孤立小声」—— 一段 ≤ .45 秒的声音、和正文隔着 ≥ .08 秒的停顿；或者切点本身落在声音里、这一小截 ≤ .7 秒。
   每个可疑处拿这一小截加上它后面（前面）2.5 秒，带着它、去掉它各听写一遍 → local.json。
2. decide：这一小截离前一遍（前一句）的声音近、离这句正文远 → 是带进来的尾巴，换成静音；反过来是这句自己的字，留着。
   听写只用来否决：去掉它以后，听写在这一头整整少了这句稿子里挨着的字，就留着（听写别处变了不算）。→ seams.json：[[句id, 段序号, 头/尾/中, 录音里的起, 止, 说明], ...]
3. 人工听过的写在 voice/seams_review.json（不写在代码里）：
   {"keep":  [["g7", 0, "头"], ...],              自动判成静音、听过要留着的
    "mute":  [["ob05", 0, "头"], ...],            自动判成留着、听过要静音的（没说完的那一遍）
    "extra": [["wh20", 0, "尾", 647.775, null, "后一句「要」的开头"], ...]}   另外要静音的一截（录音秒数；null = 这一段的起 / 止；第三项也可以写「中」）
4. apply：把 seams.json 的每一截（录音秒数）换算到口播里的位置，两边 8 ms 淡入淡出，换成静音。"""
import difflib
import numpy as np
from chonggu.voice.common import SR, env_db, squeeze_map, unsqueeze, lcs

TH = -48   # 找「有声」的门限（比拼接的 -50 dB 高一点，气声不算）

def by_line(LOG):
    G = {}
    for g in LOG: G.setdefault(g[0], []).append(g)
    return G

def islands(x):
    """一段声音里的有声段（秒）：60 ms 以内的缝算同一段，短于 30 ms 的不算"""
    e = env_db(x) > TH
    r, k, n = [], 0, len(e)
    while k < n:
        if e[k]:
            j = k
            while j < n and e[j]: j += 1
            r.append([k, j]); k = j
        else: k += 1
    m = []
    for s in r:
        if m and s[0] - m[-1][1] < 6: m[-1][1] = s[1]
        else: m.append(s)
    return [(a / 100, b / 100) for a, b in m if b - a >= 3]

def audit(y, se, X, LOG, ear, only=None):
    """y：原始口播；se：降噪后的录音；X：拼口播用的录音（se + .1 hp）"""
    Eraw = env_db(se)
    def sounding(t): k = int(round(t * 100)); return bool(Eraw[max(0, k - 1):k + 2].max() > TH)   # 录音里 t 这一刻（前后 10 ms）还在发声
    out = []
    for bid, gs in by_line(LOG).items():
        if only and bid not in only: continue
        for gi, (_, a, z, o, L) in enumerate(gs):
            g = y[int(o * SR):int((o + L) * SR)]; isl = islands(g)
            if len(isl) < 2: continue
            mp = None
            for side in ('头', '尾'):
                if side == '头': d, gap, clip = isl[0][1] - isl[0][0], isl[1][0] - isl[0][1], sounding(a); p, q = 0, isl[0][1] + min(gap / 2, .04)
                else: d, gap, clip = isl[-1][1] - isl[-1][0], isl[-1][0] - isl[-2][1], sounding(z); p, q = isl[-1][0] - min(gap / 2, .04), L
                if not ((d <= .45 and gap >= .08) or (clip and d <= .7)): continue
                w0, w1 = (0, min(L, q + 2.5)) if side == '头' else (max(0, p - 2.5), L)
                x = g[int(w0 * SR):int(w1 * SR)].copy(); h1 = ear.text(x, temperature=0.0); x[int((p - w0) * SR):int((q - w0) * SR)] = 0; h0 = ear.text(x, temperature=0.0)
                mp = mp if mp is not None else squeeze_map(X[int(a * SR):int(z * SR)])
                rc = [a, round(a + unsqueeze(mp, int(q * SR)) / SR, 3)] if side == '头' else [round(a + unsqueeze(mp, int(p * SR)) / SR, 3), z]   # 这一截在录音里的秒数
                r = dict(id=bid, g=gi, side=side, d=round(d, 2), gap=round(gap, 2), clip=clip, cut=[round(o + p, 3), round(o + q, 3)], raw=[a, z], raw_cut=rc, with_=h1, without=h0)
                out.append(r); print(f"{bid}:{gi} {side} {d:.2f}s 隔{gap:.2f}{' 切在声中' if clip else ''}\n    带着：{h1}\n    去掉：{h0}", flush=True)
    return out

def lost_edge(w, wo, side):
    """去掉那一小截以后，听写在这一头（头 / 尾）整整少掉的 token（换成别的字不算少）"""
    bl = [b for b in difflib.SequenceMatcher(a=w, b=wo, autojunk=False).get_matching_blocks() if b.size]
    if not bl: return w
    if side == '头': f = bl[0]; return w[:f.a] if f.b == 0 else []
    l = bl[-1]; return w[l.a + l.size:] if l.b + l.size == len(wo) else []

def own_edge(lost, wo, want, side):
    """少掉的是不是这句稿子里紧挨着剩下那部分的字（是 → 那一小截是这句自己的字，不能静音）"""
    if not lost or not want: return False
    k = min(4, len(wo))
    if k == 0: return lcs(lost, want) >= max(1, (len(lost) + 1) // 2)
    probe = wo[:k] if side == '头' else wo[-k:]
    best, bj = -1, 0
    for j in range(0, max(1, len(want) - k + 1)):   # 剩下那部分的开头（结尾）在稿子里的位置
        r = difflib.SequenceMatcher(a=probe, b=want[j:j + k], autojunk=False).ratio()
        if r > best: best, bj = r, j
    if best < .5: return False
    ctx = want[max(0, bj - len(lost) - 1):bj] if side == '头' else want[bj + k:bj + k + len(lost) + 1]
    return lcs(lost, ctx) >= max(1, (len(lost) + 1) // 2)

def vetoed(r, want, toks):
    """听写只用来否决：去掉这一小截，这句在这一头的字少了 → 留着"""
    w, wo = toks(r.get('with_', '')), toks(r.get('without', '')); return own_edge(lost_edge(w, wo, r['side']), wo, want, r['side'])

def load_review(R):
    R = R or {}
    t3 = lambda xs: {(x[0], int(x[1]), x[2]) for x in xs or []}
    return t3(R.get('keep')), t3(R.get('mute')), [list(x) for x in R.get('extra') or []]

def decide(local, LOG, se, review, texts, toks):
    """local.json + seams_review.json → seams.json 的条目"""
    sp = env_db(se) > TH; G = by_line(LOG); KEEP, MUTE, EXTRA = load_review(review)
    def island(t0, t1):
        idx = [k for k in range(max(0, int(t0 * 100)), min(len(sp), int(t1 * 100))) if sp[k]]
        if not idx: return None
        s, e = idx[0], idx[-1]
        b = s - 1
        while b > 0 and not sp[b]: b -= 1
        a = e + 1
        while a < len(sp) and not sp[a]: a += 1
        return s / 100, (e + 1) / 100, (s - b - 1) / 100, (a - e - 1) / 100
    out, skipped, stale = [], [], []
    for r in local:
        i, gi, side = r['id'], r['g'], r['side']
        if (i, gi, side) in KEEP: continue
        if i not in G or gi >= len(G[i]) or [round(v, 3) for v in r['raw']] != [round(v, 3) for v in G[i][gi][1:3]]: stale.append((i, gi, side)); continue   # 查过以后这一段又改了
        g = G[i][gi]; a, z = g[1], g[2]
        if r.get('raw_cut'): t0, t1 = r['raw_cut']
        else: t0, t1 = (a, a + (r['cut'][1] - r['cut'][0])) if side == '头' else (z - (r['cut'][1] - r['cut'][0]), z)   # 第 8 期的 local16.json 没记录音秒数：头上那截从段首起、尾巴那截到段尾止
        isl = island(max(t0, a), t1) if side == '头' else island(t0, min(t1, z))
        if isl is None: skipped.append((i, gi, side)); continue
        s, e, gb, ga = isl
        lean_prev = (gb < ga) if side == '头' else (ga < gb)
        veto = vetoed(r, toks(texts.get(i, '')), toks)
        if (i, gi, side) not in MUTE and (not lean_prev or veto): continue
        if side == '头': out.append([i, gi, side, a, round(e + min(ga / 2, .04), 3), '带进来的前一遍尾音'])
        else: out.append([i, gi, side, round(s - min(gb / 2, .04), 3), z, '带进来的后一遍开头'])
    for i, gi, side, t0, t1, why in EXTRA:
        if i not in G or int(gi) >= len(G[i]): skipped.append((i, gi, side)); continue
        g = G[i][int(gi)]; out.append([i, int(gi), side, t0 if t0 is not None else g[1], t1 if t1 is not None else g[2], why])
    if stale: print('接缝：这几处查过以后那一段又改了（重跑 audit），这次不管：', stale)
    if skipped: print('接缝：这几处在录音里找不到声音（或段序号不对），跳过：', skipped)
    print(len(out), '处换成静音；', f"{sum(b - a for _, _, _, a, b, _ in out):.1f} 秒（录音秒数）")
    return out

def positions(seams, LOG, X):
    """每一截在口播里的采样位置 [(p, q)]：每段在口播里的起点 + 这一截之前那部分压过停顿以后的长度"""
    G = by_line(LOG); maps = {}; out = []
    for i, gi, side, t0, t1, why in seams:
        _, a, z, o, L = G[i][gi]
        if (i, gi) not in maps: maps[(i, gi)] = squeeze_map(X[int(a * SR):int(z * SR)])
        mp = maps[(i, gi)]; full = int(mp[-1])
        p = int(round(o * SR)) + (0 if t0 <= a + 1e-3 else int(mp[min(len(mp) - 1, int((t0 - a) * SR))]))
        q = int(round(o * SR)) + (full if t1 >= z - 1e-3 else int(mp[min(len(mp) - 1, int((t1 - a) * SR))]))
        out.append((p, q))
    return out

def apply(y, seams, LOG, X):
    """原位换成静音，两边 8 ms 淡入淡出；长度不变。返回 (新口播, 静掉的秒数)"""
    g_ = np.ones(len(y), np.float32); f = int(.008 * SR); tot = 0
    for p, q in positions(seams, LOG, X):
        q = min(q, len(y))
        if q <= p: continue
        g_[p:q] = 0; g_[max(0, p - f):p] = np.minimum(g_[max(0, p - f):p], np.linspace(1, 0, p - max(0, p - f))); g_[q:q + f] = np.minimum(g_[q:q + f], np.linspace(0, 1, len(g_[q:q + f]))); tot += (q - p) / SR
    return (y * g_).astype(np.float32), tot
