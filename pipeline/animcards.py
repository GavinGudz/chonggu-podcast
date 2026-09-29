# 第 2.5 步：把照片渲染成带透明通道的动画（work/anim/*.mov），节奏对齐原片的元素动画：
#   进场 0.45 秒：边放大（0.94→1）边显现、上移 14px，框内照片从 1.12 倍收到 1.06 倍；图注标签晚 0.2 秒跟进
#   关键帧（cards.json 的 keys）：照片在不同位置/大小之间 0.5 秒缓动，给即将出现的标题、方框让位
#   显示期间：框内照片缓慢拉远到 1.0 倍
#   退场 0.22 秒：与原片换场淡出同一帧开始
# 照片按 cards.py 的裁切和调色重做；图注是贴在照片左下角的米色标签，文字取自 cards/*.png（macOS 字体渲染）。
# 需要先跑 build.py（读 work/meta.json 里的成片时间和画布位置）。
import json, os, subprocess, sys
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageEnhance, ImageDraw
import imageio_ffmpeg
Image.MAX_IMAGE_PIXELS = None
HERE = os.path.dirname(os.path.abspath(__file__)); W = os.path.join(HERE, 'work'); A = os.path.join(W, 'anim')
sys.path.insert(0, HERE)
from cards import CARDS, P
FF = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 60
T_IN, T_CAP, T_OUT, T_MOVE = 0.45, 0.4, 0.22, 0.5
FOCUS = {'B': (0.45, 0.5)}           # 框内缩放的中心点（相对照片），默认居中
PAPER = (237, 232, 223, 255); BORDER = (28, 26, 23, 235)
ease_out = lambda x: 1 - (1 - np.clip(x, 0, 1)) ** 3
ease_in = lambda x: np.clip(x, 0, 1) ** 2
ease_io = lambda x: (lambda u: 4 * u ** 3 if u < 0.5 else 1 - (-2 * u + 2) ** 3 / 2)(float(np.clip(x, 0, 1)))


def photo_src(fn, crop, aspect, width):
    # 与 cards.py 相同的裁切和调色，按目标宽高比居中裁，保留 1.15 倍分辨率供框内缩放
    im = Image.open(P + fn).convert('RGB')
    if crop:
        im = im.crop(crop)
    Wd, Hd = im.size
    if Wd / Hd > aspect:
        nw = int(Hd * aspect); im = im.crop(((Wd - nw) // 2, 0, (Wd - nw) // 2 + nw, Hd))
    else:
        nh = int(Wd / aspect); im = im.crop((0, (Hd - nh) // 2, Wd, (Hd - nh) // 2 + nh))
    w = min(im.width, int(width * 1.15)); im = im.resize((w, round(w / aspect)), Image.LANCZOS)
    im = ImageEnhance.Color(im).enhance(0.82)
    return Image.blend(im, Image.new('RGB', im.size, (236, 231, 222)), 0.06)


def caption_tag(name, h):
    # 从 cards/*.png 取图注文字（照片下方 h+2 行起），裁到文字外框，垫米色底
    png = Image.open(os.path.join(HERE, 'cards', f'{name}.png')).convert('RGBA')
    cap = png.crop((0, h + 2, png.width, png.height)); cap = cap.crop(cap.getbbox())
    tag = Image.new('RGBA', (cap.width + 32, cap.height + 22), PAPER); tag.alpha_composite(cap, (16, 11))
    return tag


def rect_at(keys, t, aspect):
    x, y, w = keys[0][1:]
    for tk, kx, ky, kw in keys[1:]:
        p = ease_io((t - tk) / T_MOVE)
        x, y, w = x + (kx - x) * p, y + (ky - y) * p, w + (kw - w) * p
    return x, y, w, w / aspect


def render(c):
    name = c['name']; spec = next(s for s in CARDS if s[0] == name); fn, crop, h0 = spec[1], spec[2], spec[4]
    T0, T1, aspect = c['T0'], c['T1'], c['aspect']; dur = T1 - T0
    X, Y, OW, OH = c['canvas']
    keys = [[t - T0, x - X, y - Y, w] for t, x, y, w in c['keysT']]   # 换到卡片本地时间、画布坐标
    src = photo_src(fn, crop, aspect, max(k[3] for k in keys)); tag = caption_tag(name, h0)
    fx, fy = FOCUS.get(name, (0.5, 0.5)); SW, SH = src.size
    n = int(round(dur * FPS))
    os.makedirs(A, exist_ok=True); out = os.path.join(A, f'{name}.mov')
    p = subprocess.Popen([FF, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{OW}x{OH}',
                          '-r', str(FPS), '-i', '-', '-c:v', 'png', '-pix_fmt', 'rgba', out], stdin=subprocess.PIPE)
    for i in range(n):
        t = i / FPS
        a_in = float(ease_out(t / T_IN)); a_set = float(ease_out(t / 0.9)); a_out = 1 - float(ease_in((t - (dur - T_OUT)) / T_OUT))
        x, y, w, h = rect_at(keys, t, aspect)
        s = (0.94 + 0.06 * a_in) * (1 - 0.02 * (1 - a_out))              # 进场放大、退场微缩，绕中心
        cx, cy = x + w / 2, y + h / 2 + 14 * (1 - a_in)
        w, h = w * s, h * s; x0, y0 = round(cx - w / 2), round(cy - h / 2); pw, ph = round(w), round(h)
        z = 1.0 + 0.06 * (1 - t / dur) + 0.06 * (1 - a_set)               # 框内照片缩放
        bw, bh = SW / z, SH / z; bx = min(max(fx * SW - bw / 2, 0), SW - bw); by = min(max(fy * SH - bh / 2, 0), SH - bh)
        frame = Image.new('RGBA', (OW, OH), (0, 0, 0, 0))
        frame.paste(src.resize((pw, ph), Image.LANCZOS, box=(bx, by, bx + bw, by + bh)), (x0, y0))
        ImageDraw.Draw(frame).rectangle([x0 - 1, y0 - 1, x0 + pw, y0 + ph], outline=BORDER, width=1)
        ca = float(ease_out((t - 0.2) / T_CAP))
        if ca > 0:
            tg = tag.copy(); tg.putalpha(Image.fromarray((np.asarray(tag)[:, :, 3] * ca).astype(np.uint8)))
            frame.alpha_composite(tg, (x0, y0 + ph - tag.height))
        arr = np.asarray(frame).copy(); arr[:, :, 3] = (arr[:, :, 3] * (a_in * a_out)).astype(np.uint8)
        p.stdin.write(arr.tobytes())
    p.stdin.close(); p.wait()
    return name, dur, n, f'{OW}x{OH}'


if __name__ == '__main__':
    meta = json.load(open(os.path.join(W, 'meta.json')))
    todo = [c for c in meta['cards'] if not sys.argv[1:] or c['name'] in sys.argv[1:]]
    with Pool(min(4, os.cpu_count() or 1)) as pool:
        for name, dur, n, size in pool.imap(render, todo):
            print(name, f'{dur:.3f}s', n, 'frames', size, '-> work/anim/' + name + '.mov')
