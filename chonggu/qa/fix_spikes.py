"""补半帧：python -m chonggu.qa.fix_spikes 期目录 前缀 [阈值=5] [--res 1080|2k]
用 lum 的算法找出这一章成片里单帧亮度冒出来又回去的帧（忙的时候没画完的半帧），
在它前后各 0.2 秒的小段用 1 个 worker 重渲（机器不忙时更稳），重渲的小段自己再查一遍，干净了才替换，
最后把原片按帧切开、换进新的小段，重新编码回 out/parts/<序号>_<前缀>.mp4（2K 是 out/parts2k/；原片留 .bak）。
小段用 render 模块的 render_range 渲（盯日志、渲完不退出就停、查长度）。换完要重新接整片、配声音（render 那一步）。"""
import shutil, subprocess, sys
from pathlib import Path
import numpy as np
from chonggu import paths
from chonggu.gates import GateFailed
from .common import timeline, res_key, parts_dir
from .lum import luma, spikes


def fix(ep, pre, th=5, res='1080'):
    fps = (getattr(ep, 'render', None) or {}).get('fps', 30); h = 1440 if res_key(res) == '2k' else 1080
    T = timeline(ep); k, c = next(((i, c) for i, c in enumerate(T['chapters']) if c['pre'] == pre), (None, None))
    if c is None:
        raise GateFailed(f"时间线里没有 {pre} 这一章（有：{', '.join(c['pre'] for c in T['chapters'])}）")
    from chonggu.render import run as R
    R.prepare(ep); src = parts_dir(ep, res) / f'{k:02d}_{pre}.mp4'; tmp = src.parent / f'fix_{pre}'
    if not src.exists():
        raise GateFailed(f'没有 {src.name}，先 render')
    shutil.rmtree(tmp, ignore_errors=True)
    if tmp.exists():   # Windows：里面有文件正开着时 rmtree 悄悄跳过
        raise GateFailed(f'{tmp.name} 删不掉：里面有文件正被打开着（播放器、资源管理器预览），关掉再跑')
    tmp.mkdir(parents=True, exist_ok=True)
    L = luma(src); bad = spikes(L, th); print(pre, '半帧候选（帧号）:', bad)
    if not bad:
        return []
    segs = []   # 相邻的并成一段，前后各留 6 帧
    for i in bad:
        a, b = max(0, i - 6), min(len(L), i + 7)
        if segs and a <= segs[-1][1]:
            segs[-1][1] = b
        else:
            segs.append([a, b])
    f0 = round(c['t0'] * fps); fixed = []
    for a, b in segs:
        out = tmp / f'seg_{a}.mp4'
        for attempt in range(3):
            R.render_range(ep, out, (f0 + a) / fps, (f0 + b) / fps, h=h, workers=1, stable=3, log=tmp / f'log_seg_{a}.txt')
            Ls = luma(out) if out.exists() else np.zeros(0, np.float32)
            ctx = np.concatenate([[L[a - 1]] if a else [], Ls, [L[b]] if b < len(L) else []])
            if len(Ls) == b - a and not spikes(ctx, th):
                break
        if len(Ls) != b - a:
            raise GateFailed(f'{pre} 帧 {a}–{b} 重渲出来 {len(Ls)} 帧，应该是 {b - a} 帧；没替换')
        fixed.append((a, b, out)); print(f'  帧 {a}–{b} 重渲 {attempt + 1} 次', '干净' if attempt < 2 else '（仍有疑似，照用）')
    # 拼回去：原片的好段 + 新段，按帧号 trim 后 concat，统一重编码
    inputs, parts, labels, last = ['-i', str(src)], [], [], 0
    for n, (a, b, out) in enumerate(fixed, 1):
        inputs += ['-i', str(out)]
        if a > last:
            parts.append(f'[0:v]trim=start_frame={last}:end_frame={a},setpts=PTS-STARTPTS[o{n}]'); labels.append(f'[o{n}]')
        parts.append(f'[{n}:v]setpts=PTS-STARTPTS[n{n}]'); labels.append(f'[n{n}]')
        last = b
    parts.append(f'[0:v]trim=start_frame={last},setpts=PTS-STARTPTS[tail]'); labels.append('[tail]')
    fc = ';'.join(parts) + ';' + ''.join(labels) + f'concat=n={len(labels)}:v=1:a=0[v]'
    shutil.copy2(src, src.with_name(src.name + '.bak'))
    subprocess.run([paths.need('ffmpeg'), '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium',
                    '-crf', '17', '-pix_fmt', 'yuv420p', '-r', str(fps), str(tmp / 'new.mp4')], check=True)
    n0, n1 = len(L), len(luma(tmp / 'new.mp4'))
    if n0 != n1:
        raise GateFailed(f'{pre} 拼回去帧数不对（{n0} → {n1}），没替换')
    paths.replace(tmp / 'new.mp4', src); left = spikes(luma(src), th); print('替换完成；剩余候选：', left)
    return left


def run(ep, args):
    return fix(ep, args.pre, float(getattr(args, 'th', 5) or 5), getattr(args, 'res', '1080') or '1080')


if __name__ == '__main__':
    from chonggu import config
    a = [x for x in sys.argv[1:] if not x.startswith('--')]; r = sys.argv[sys.argv.index('--res') + 1] if '--res' in sys.argv else '1080'
    a = [x for x in a if x != r]
    fix(config.load(Path(a[0])), a[1], float(a[2]) if len(a) > 2 else 5, r)
