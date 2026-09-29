# 第 2.5 步：把照片卡片渲染成带透明通道的动画（work/anim/*.mov），节奏对齐原片的元素动画：
#   进场 0.45 秒：边放大（0.94→1）边显现、上移 14px，框内照片从 1.12 倍收到 1.06 倍；图注晚 0.2 秒跟进
#   显示期间：框内照片缓慢拉远到 1.0 倍
#   退场 0.22 秒：与原片换场淡出同一帧开始
# 照片按 cards.py 的裁切和调色重做；图注直接取自 cards/*.png（那是用 macOS 字体渲染的），所以不需要字体。
# 需要先跑 build.py（读 work/meta.json 里的成片时间 T0/T1）。
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageEnhance
import imageio_ffmpeg
Image.MAX_IMAGE_PIXELS = None
HERE = os.path.dirname(os.path.abspath(__file__)); W = os.path.join(HERE, 'work'); A = os.path.join(W, 'anim')
sys.path.insert(0, HERE)
from cards import CARDS, P
FF = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 60; M = 24                     # 画布四周留白，给缩放和位移用
T_IN, T_CAP, T_OUT = 0.45, 0.4, 0.22
FOCUS = {'B': (0.45, 0.5)}           # 框内缩放的中心点（相对照片），默认居中
ease_out = lambda x: 1 - (1 - np.clip(x, 0, 1)) ** 3
ease_in = lambda x: np.clip(x, 0, 1) ** 2


def photo_src(fn, crop, w, h):
    # 与 cards.py 相同的裁切和调色，但保留 2 倍分辨率，供逐帧缩放
    im = Image.open(P + fn).convert('RGB')
    if crop:
        im = im.crop(crop)
    Wd, Hd = im.size; a = w / h
    if Wd / Hd > a:
        nw = int(Hd * a); im = im.crop(((Wd - nw) // 2, 0, (Wd - nw) // 2 + nw, Hd))
    else:
        nh = int(Wd / a); im = im.crop((0, (Hd - nh) // 2, Wd, (Hd - nh) // 2 + nh))
    im = im.resize((w * 2, h * 2), Image.LANCZOS)
    im = ImageEnhance.Color(im).enhance(0.82)
    return Image.blend(im, Image.new('RGB', im.size, (236, 231, 222)), 0.06)


def render(spec, dur):
    name, fn, crop, w, h = spec[:5]
    png = Image.open(os.path.join(HERE, 'cards', f'{name}.png')).convert('RGBA')
    CW, CH = png.size
    base = png.copy(); base.paste((0, 0, 0, 0), (0, h + 2, CW, CH))   # 边框（照片区每帧重画）
    cap = Image.new('RGBA', png.size, (0, 0, 0, 0)); cap.paste(png.crop((0, h + 2, CW, CH)), (0, h + 2))
    src = photo_src(fn, crop, w, h); fx, fy = FOCUS.get(name, (0.5, 0.5))
    SW, SH = src.size; OW, OH = CW + 2 * M, CH + 2 * M
    n = int(round(dur * FPS))
    os.makedirs(A, exist_ok=True)
    out = os.path.join(A, f'{name}.mov')
    p = subprocess.Popen([FF, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{OW}x{OH}',
                          '-r', str(FPS), '-i', '-', '-c:v', 'png', '-pix_fmt', 'rgba', out], stdin=subprocess.PIPE)
    for i in range(n):
        t = i / FPS
        a_in = ease_out(t / T_IN); a_set = ease_out(t / 0.9); a_out = 1 - ease_in((t - (dur - T_OUT)) / T_OUT)
        z = 1.0 + 0.06 * (1 - t / dur) + 0.06 * (1 - a_set)          # 框内照片缩放
        cw, ch = SW / z, SH / z; x0 = min(max(fx * SW - cw / 2, 0), SW - cw); y0 = min(max(fy * SH - ch / 2, 0), SH - ch)
        card = base.copy()
        card.paste(src.resize((w, h), Image.LANCZOS, box=(x0, y0, x0 + cw, y0 + ch)), (1, 1))
        ca = float(ease_out((t - 0.2) / T_CAP))
        c = cap.copy(); c.putalpha(Image.fromarray((np.asarray(cap)[:, :, 3] * ca).astype(np.uint8)))
        card.alpha_composite(c, (0, int(round(8 * (1 - ca)))) if ca < 1 else (0, 0))
        s = (0.94 + 0.06 * float(a_in)) * (1 - 0.02 * (1 - float(a_out)))
        dy = 14 * (1 - float(a_in))
        cx, cy = CW / 2, CH / 2; ox, oy = M + CW / 2, M + CH / 2 + dy
        frame = card.convert('RGBa').transform((OW, OH), Image.AFFINE, (1 / s, 0, cx - ox / s, 0, 1 / s, cy - oy / s),
                                                resample=Image.BICUBIC).convert('RGBA')
        arr = np.asarray(frame).copy(); arr[:, :, 3] = (arr[:, :, 3] * float(a_in * a_out)).astype(np.uint8)
        p.stdin.write(arr.tobytes())
    p.stdin.close(); p.wait()
    return out, n


if __name__ == '__main__':
    meta = json.load(open(os.path.join(W, 'meta.json')))
    specs = {c[0]: c for c in CARDS}
    only = sys.argv[1:]
    for c in meta['cards']:
        if only and c['name'] not in only:
            continue
        dur = c['T1'] - c['T0']
        out, n = render(specs[c['name']], dur)
        print(c['name'], f'{dur:.3f}s', n, 'frames ->', os.path.relpath(out, HERE))
