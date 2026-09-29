# 第 1 步：从原片算出剪辑所需的数据（停顿剪点、说话人分段）。
# 输出到 work/：ep_aligned.npy、rms10ms.npy、ep_320.gray、spk.npy、lab_split.npy、segs.json、plan.json
# 期望结果（本机上次跑出来的）：21 处长停顿里剪 19 处、共 407 帧（6.78 秒）、20 段；顾东政约 199.7 秒、吴原同约 89.0 秒。
import numpy as np, json, os, subprocess, hashlib
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
HERE = os.path.dirname(os.path.abspath(__file__)); W = os.path.join(HERE, 'work'); os.makedirs(W, exist_ok=True)
SRC = os.path.join(HERE, 'src')
EP = os.path.join(W, 'ep_src.mp4')
SR = 48000; SPF = 800; NF = 18816; A_OFF = 1008   # 正片视频首帧 pts=0.021s = 1008 个采样

# 0) 拼回正片并校验
if not os.path.exists(EP):
    with open(EP, 'wb') as o:
        for p in sorted(x for x in os.listdir(SRC) if x.startswith('ep_src.mp4.part_')):
            o.write(open(os.path.join(SRC, p), 'rb').read())
want = open(os.path.join(SRC, 'ep_src.mp4.sha256')).read().strip()
assert hashlib.sha256(open(EP, 'rb').read()).hexdigest() == want, 'ep_src.mp4 校验失败'

# 1) 音频：对齐到视频（去掉前 1008 个采样），10ms RMS
raw = subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-i', EP, '-vn', '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'],
                     capture_output=True, check=True).stdout
a = np.frombuffer(raw, np.float32).reshape(-1, 2)[A_OFF:A_OFF + NF * SPF]
np.save(os.path.join(W, 'ep_aligned.npy'), a)
m = a.mean(1); hop = 480; n = len(m) // hop
rms = 20 * np.log10(np.sqrt((m[:n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-10)
np.save(os.path.join(W, 'rms10ms.npy'), rms)

# 2) 视频：320x180 灰度，用于判断画面是否静止、谁在说话
GRAY = os.path.join(W, 'ep_320.gray')
if not os.path.exists(GRAY):
    subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y', '-i', EP, '-an', '-vf', 'scale=320:180:flags=area,format=gray',
                    '-f', 'rawvideo', GRAY], check=True)
v = np.memmap(GRAY, dtype=np.uint8, mode='r').reshape(-1, 180, 320)[:NF]

# 3) 说话人：左下角名字哪个是深色（高亮）
g = v[:, 166:175, 15:32].reshape(NF, -1).min(1).astype(int)   # 顾东政
w = v[:, 166:175, 37:54].reshape(NF, -1).min(1).astype(int)   # 吴原同
spk = np.where(g < w - 25, 1, np.where(w < g - 25, 2, 0))
np.save(os.path.join(W, 'spk.npy'), spk)
split = (900 + int(np.argmin(rms[900:1060]))) / 100   # 冷开场里 吴原同→顾东政 的分界（约 9.99s）
np.save(os.path.join(W, 'lab_split.npy'), np.array([split]))
print('speaker seconds 顾 %.1f 吴 %.1f; cold-open split %.2fs' % ((spk == 1).sum() / 60, (spk == 2).sum() / 60, split))

# 4) 停顿剪点（与本机 plan3 相同的规则）
THR = -35; MIN_GAP = 0.55; TARGET = 0.40; MIN_SIDE = 0.12; D = 6; START = 18.5; END = 312.0
k = 5; pad = np.pad(rms, (k // 2, k // 2), constant_values=-200)
sm = np.array([pad[i:i + k].max() for i in range(len(rms))])
sil = sm < THR; gaps = []; i = 0
while i < len(sil):
    if sil[i]:
        j = i
        while j < len(sil) and sil[j]: j += 1
        gaps.append((i / 100, j / 100)); i = j
    else:
        i += 1
gaps = [(s, e) for s, e in gaps if e - s >= MIN_GAP and s >= START and e <= END]
fd = lambda f: float(np.abs(v[f + 1, 20:165].astype(np.int16) - v[f, 20:165].astype(np.int16)).mean())
ed = lambda x, y: float(np.abs(v[x, 20:165].astype(np.int16) - v[y, 20:165].astype(np.int16)).mean())
plan = []
for s, e in gaps:
    gs = int(np.ceil(s * 60)); ge = int(np.floor(e * 60)); side = int(round(MIN_SIDE * 60))
    R = (ge - gs) - int(round(TARGET * 60)); lo, hi = gs + side, ge - side
    d = np.array([fd(f) for f in range(lo - 3, hi + 3)])
    busy = np.convolve(d, np.ones(3) / 3, mode='same') > 0.18
    busy = (np.convolve(busy.astype(int), np.ones(7, int), mode='same') > 0)[3:-3]
    best = (0, lo, lo); i = 0
    while i < len(busy):
        if not busy[i]:
            j = i
            while j < len(busy) and not busy[j]: j += 1
            if j - i > best[0]: best = (j - i, lo + i, lo + j)
            i = j
        else:
            i += 1
    L, r0, r1 = best; rem = min(R, L - D)
    rec = dict(gap=[round(s, 2), round(e, 2)], dur=round(e - s, 2))
    if rem >= 6:
        c = [(ed(a_ - 1, a_ + rem - D), a_, a_ + rem - D) for a_ in range(r0 + D, r1 - (rem - D) - D + 1)]
        if c:
            dd, a_, b_ = min(c); rec.update(a=a_, b=b_, removed=round(rem / 60, 3))
    plan.append(rec)
json.dump(plan, open(os.path.join(W, 'plan.json'), 'w'), indent=1)
cuts = sorted((p for p in plan if 'a' in p), key=lambda p: p['a'])
segs = []; prev = 0
for p in cuts:
    segs.append((prev, p['a'])); prev = p['b']
segs.append((prev, NF))
removed = NF - (sum(e - s for s, e in segs) - (len(segs) - 1) * D)
json.dump(dict(segs=segs), open(os.path.join(W, 'segs.json'), 'w'))
print(f'gaps {len(plan)}, cuts {len(cuts)}, segments {len(segs)}, removed {removed} frames = {removed/60:.2f}s')
