# 第 2 步：生成成片的音轨和 ffmpeg 滤镜图。
# 成片顺序：冷开场（正片 0–881 帧）→ 片头（放大到 1080p60）→ 正片其余部分（压缩停顿，每个剪点 6 帧叠化）
# 叠加 9 张照片卡片，最后 0.8 秒淡出。总帧数应为 19109（318.48 秒）。
import numpy as np, json, os, subprocess
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
HERE = os.path.dirname(os.path.abspath(__file__)); W = os.path.join(HERE, 'work')
SR = 48000; SPF = 800; D = 6; NF = 18816; CO = 881; INTRO = 700
segs = json.load(open(os.path.join(W, 'segs.json')))['segs']
assert segs[0][0] == 0 and segs[0][1] > CO
main = [(CO, segs[0][1])] + [tuple(s) for s in segs[1:]]
L = [e - s for s, e in main]
main_len = sum(L) - (len(main) - 1) * D
TOTAL = CO + INTRO + main_len

O = []; acc = 0
for i, (s, e) in enumerate(main):
    O.append(acc); acc += (e - s) - (D if i < len(main) - 1 else 0)


def out_t(t):  # 正片原始时间 → 成片时间（仅适用于冷开场之后）
    f = round(t * 60)
    for i, (s, e) in enumerate(main):
        if f < e or i == len(main) - 1:
            return (CO + INTRO + O[i] + (max(f, s) - s)) / 60


# ---------- 音频 ----------
ep = np.load(os.path.join(W, 'ep_aligned.npy')).astype(np.float32)
spk = np.load(os.path.join(W, 'spk.npy')); split = float(np.load(os.path.join(W, 'lab_split.npy'))[0])
lab = np.repeat(spk, SPF); t = np.arange(len(lab)) / SR
lab[t < split] = 2; lab[(t >= split) & (t < 14.7)] = 1          # 冷开场：前两句吴原同，第三句顾东政
g = np.where(lab == 2, 10 ** (-2.4 / 20), 1.0).astype(np.float32)  # 吴原同 -2.4 dB，与顾东政拉平
k = int(0.05 * SR); g = np.convolve(g, np.ones(k, np.float32) / k, mode='same'); g[:k] = g[k]; g[-k:] = g[-k - 1]
ep = ep * g[:, None]
f10 = int(0.01 * SR)
co = ep[:CO * SPF].copy(); co[:f10] *= np.linspace(0, 1, f10)[:, None]; co[-f10:] *= np.linspace(1, 0, f10)[:, None]
n = D * SPF; tt = np.linspace(0, np.pi / 2, n, endpoint=False)[:, None]; fo, fi = np.cos(tt), np.sin(tt)
m = ep[main[0][0] * SPF:main[0][1] * SPF].copy(); m[:f10] *= np.linspace(0, 1, f10)[:, None]
for s, e in main[1:]:
    nx = ep[s * SPF:e * SPF]; m = np.concatenate([m[:-n], m[-n:] * fo + nx[:n] * fi, nx[n:]])
ia = np.frombuffer(subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-i', os.path.join(HERE, 'src', 'intro_src.mp4'), '-vn',
                                   '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'], capture_output=True, check=True).stdout, np.float32).reshape(-1, 2)
ia = np.concatenate([ia[:INTRO * SPF], np.zeros((max(0, INTRO * SPF - len(ia)), 2), np.float32)]) * 10 ** (7 / 20)  # 片头音效 +7 dB
ia[:f10] *= np.linspace(0, 1, f10)[:, None]; tl = int(0.08 * SR); ia[-tl:] *= np.linspace(1, 0, tl)[:, None]
full = np.concatenate([co, ia, m]).astype(np.float32)
assert len(full) == TOTAL * SPF, (len(full), TOTAL * SPF)
fe = int(0.8 * SR); full[-fe:] *= np.linspace(1, 0, fe)[:, None]
full.tofile(os.path.join(W, 'audio.f32'))

# ---------- 视频滤镜图 ----------
cards = json.load(open(os.path.join(HERE, 'cards.json')))
G = []
G.append("[0:v]scale=1920:1080:flags=lanczos:in_color_matrix=bt709:out_color_matrix=bt709:in_range=tv:out_range=tv,unsharp=5:5:0.6:5:5:0,"
         "fps=60,tpad=stop_mode=clone:stop=10,trim=end_frame=700,setpts=PTS-STARTPTS,setsar=1,format=yuv420p[vi]")
G.append(f"[1:v]setpts=PTS-STARTPTS,fps=60,split={len(main)+1}[sc]" + ''.join(f"[s{i}]" for i in range(len(main))))
G.append(f"[sc]trim=start_frame=0:end_frame={CO},setpts=PTS-STARTPTS,fps=60,format=yuv420p,setsar=1[vco]")
for i, (s, e) in enumerate(main):
    G.append(f"[s{i}]trim=start_frame={s}:end_frame={e},setpts=PTS-STARTPTS,fps=60[t{i}]")
acc = L[0]; cur = "t0"
for i in range(1, len(main)):
    G.append(f"[{cur}][t{i}]xfade=transition=fade:duration={D/60:.10f}:offset={(acc-D)/60:.10f}[x{i}]"); cur = f"x{i}"; acc += L[i] - D
assert acc == main_len
G.append(f"[{cur}]format=yuv420p,setsar=1[vm]")
G.append("[vco][vi][vm]concat=n=3:v=1:a=0[c0]")
prev = "c0"; inputs = []
for j, c in enumerate(cards):
    T0 = out_t(c['t0']); T1 = out_t(c['t1']); dur = T1 - T0
    inputs.append([c['name'], round(dur + 0.05, 3)])
    c['T0'], c['T1'] = round(T0, 3), round(T1, 3)
    G.append(f"[{3+j}:v]format=rgba,fade=t=in:st=0:d=0.4:alpha=1,fade=t=out:st={dur-0.3:.3f}:d=0.3:alpha=1,setpts=PTS-STARTPTS+{T0:.4f}/TB[k{j}]")
    G.append(f"[{prev}][k{j}]overlay=x={c['x']}:y='{c['y']}+10*max(0\\,1-(t-{T0:.4f})/0.4)':eval=frame:eof_action=pass:"
             f"enable='between(t\\,{T0:.4f}\\,{T1:.4f})'[o{j}]")
    prev = f"o{j}"
G.append(f"[{prev}]fade=t=out:st={TOTAL/60-0.8:.4f}:d=0.8,format=yuv420p[v]")
open(os.path.join(W, 'graph.txt'), 'w').write(';\n'.join(G))
json.dump(dict(total=TOTAL, cards=cards, inputs=inputs), open(os.path.join(W, 'meta.json'), 'w'), indent=1, ensure_ascii=False)
print('TOTAL frames', TOTAL, '=', round(TOTAL / 60, 3), 's')
for c in cards:
    print(c['name'], c['T0'], c['T1'])
