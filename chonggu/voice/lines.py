"""主讲真声的每一句（主讲：「每次一听到真实视频里的采访的声音，我都很舒服」）→ voice/lines/<句id>.wav + lines/pick.json（narration.py 直接拿去拼）
- 从过了人声链、接缝换成静音的口播（narr_c.wav）按 narr_spans.json 切出每句。
- 句子里超过 .3 秒的停顿收到 .3 秒（主讲念得慢，大半是句中停得长），再整体提速（保音高，chonggu.voice.stretch）。
- 提速 = min(上限 1.22, 目标每分钟 300 字 / 收过停顿以后实测的每分钟字数)，不放慢；episode.yaml 里写了 voice.tempo 就用它。
  第 8 期：主讲真声说话时每分钟 246 字；收停顿 + 1.2 倍以后约 300（再快字就赶了）。"""
import numpy as np
from chonggu.voice.common import SR, han, write_wav, dump_json

def tighten(x, cap=.3, sr=SR):
    fr = int(.01 * sr); e = np.sqrt(np.convolve(x ** 2, np.ones(fr) / fr, 'same')[::fr]); sil = e < e.max() * .02
    out, k, n = [], 0, len(sil)
    while k < n:
        j = k
        while j < n and sil[j] == sil[k]: j += 1
        seg = x[k * fr:j * fr]
        if sil[k] and k > 0 and j < n and (j - k) / 100 > cap:
            keep = int(cap * sr); seg = np.concatenate([seg[:keep // 2], seg[-(keep - keep // 2):]])
        out.append(seg); k = j
    out.append(x[n * fr:]); return np.concatenate(out)

def pick_tempo(cpm, max_tempo=1.22, target_cpm=300, fixed=None):
    if fixed: return float(fixed)
    return float(max(1.0, min(max_tempo, target_cpm / cpm))) if cpm > 0 else 1.0

def cut_lines(y, spans, texts, quote_ids, out_dir, cap=.3, max_tempo=1.22, target_cpm=300, fixed=None):
    """返回 (pick, 提速, 收过停顿以后每分钟多少字)"""
    from chonggu.voice.stretch import tempo
    xs = {}
    for i, (a, z) in spans.items():
        if i in quote_ids: continue
        xs[i] = tighten(y[max(0, int((a - .03) * SR)):int((z + .05) * SR)], cap)
    n = sum(han(texts.get(i, '')) for i in xs); dur = sum(len(x) for x in xs.values()) / SR
    cpm = n / (dur / 60) if dur else 0; T = pick_tempo(cpm, max_tempo, target_cpm, fixed)
    pick = {}
    for i, x in xs.items():
        w = tempo(x, SR, T) if abs(T - 1) > 1e-3 else x
        write_wav(out_dir / f'{i}.wav', w); pick[i] = f'{i}.wav'
    for f in out_dir.glob('*.wav'):   # 稿子里删掉的句子，上一次切出来的文件也删掉
        if f.name not in pick.values(): f.unlink()
    dump_json(pick, out_dir / 'pick.json', indent=0)
    print(f'{len(pick)} 句；收过停顿以后每分钟 {cpm:.0f} 字，提速 {T:.3f} → 约 {cpm * T:.0f} 字/分')
    return pick, T, cpm
