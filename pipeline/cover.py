# 封面（1920x1080）：文字全部取自成片画面（片头的「重估」字标、正片标题卡的标题/副标题/主持人），
# 用「正片纸面 × 文字/纸面比值」的方式贴回，字体与视频一致；照片与图注标签复用 animcards.py。
# 用法：python3 pipeline/cover.py <成片.mp4>  → pipeline/out/重估_第2期_封面.png（横版）和 _竖版.png（3:4）
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from animcards import photo_src, caption_tag, FF, BORDER
from cards import CARDS
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'out', '重估_第2期_完整版_紧凑_配图.mp4')


def frame(t):
    raw = subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-ss', str(t), '-i', SRC, '-frames:v', '1', '-f', 'rawvideo',
                          '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(1080, 1920, 3).astype(np.float32)


def paper_of(img):
    # 去掉文字后的纸面：1/8 缩小后取局部最大值（文字比纸暗），再平滑放大
    small = Image.fromarray(img.astype(np.uint8)).resize((240, 135), Image.BOX).filter(ImageFilter.MaxFilter(7))
    return np.asarray(small.filter(ImageFilter.GaussianBlur(3)).resize((1920, 1080), Image.BICUBIC)).astype(np.float32)


def morph(m, f):
    return np.asarray(Image.fromarray(m.astype(np.uint8) * 255).filter(f)) > 0


def ink(img, paper, box):
    # 文字层 = 画面 / 纸面（≤1），裁到文字外框
    x0, y0, x1, y1 = box
    r = np.clip(img[y0:y1, x0:x1] / np.maximum(paper[y0:y1, x0:x1], 1), 0, 1)
    r = 1 - np.clip((1 - r) - 0.10, 0, None) / 0.90          # 接近纸色的纹理当作纯纸，去掉方框感
    m = morph(morph(r.min(2) < 0.8, ImageFilter.MinFilter(3)), ImageFilter.MaxFilter(9))   # 去掉孤立杂点
    r[~morph(m, ImageFilter.MaxFilter(15))] = 1
    ys, xs = np.where(m)
    return r[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def put(canvas, r, x, y, scale=1.0):
    if scale != 1.0:
        im = Image.fromarray((r * 255).astype(np.uint8)).resize((round(r.shape[1] * scale), round(r.shape[0] * scale)), Image.LANCZOS)
        r = np.asarray(im).astype(np.float32) / 255
    h, w = r.shape[:2]; canvas[y:y + h, x:x + w] *= r
    return w, h


intro, card = frame(25.9), frame(30.5)
pi, pc = paper_of(intro), paper_of(card)
logo = ink(intro, pi, (90, 330, 490, 560))                 # 「重估」
ep = ink(card, pc, (320, 225, 480, 290))                    # 红色「第 2 期」
title1 = ink(card, pc, (160, 310, 700, 470))               # 年轻人，
title2 = ink(card, pc, (160, 478, 1600, 625))              # 是中美之间的缓冲层吗？
rule = ink(card, pc, (160, 640, 760, 665))                 # 红线
sub = ink(card, pc, (160, 685, 900, 760))                  # 从 1972 年的握手，聊到今天的交流
hosts = ink(card, pc, (160, 790, 600, 860))                # 顾东政 × 吴原同

def photo(cv, name, px, py, pw, ph, crop=None):
    spec = next(s for s in CARDS if s[0] == name)
    cv[py:py + ph, px:px + pw] = np.asarray(photo_src(spec[1], crop or spec[2], pw / ph, pw).resize((pw, ph), Image.LANCZOS)).astype(np.float32)
    im = Image.fromarray(cv.astype(np.uint8)).convert('RGBA')
    ImageDraw.Draw(im).rectangle([px - 1, py - 1, px + pw, py + ph], outline=BORDER, width=1)
    tag = caption_tag(name, spec[4]); im.alpha_composite(tag, (px, py + ph - tag.height))
    return np.asarray(im.convert('RGB')).astype(np.float32)


def arrow(cv, a, b):
    im = Image.fromarray(cv.astype(np.uint8)); d = ImageDraw.Draw(im); (x0, y0), (x1, y1) = a, b
    d.line([a, b], fill=RED, width=3)
    ux, uy = (x1 - x0) / max(abs(x1 - x0) + abs(y1 - y0), 1), (y1 - y0) / max(abs(x1 - x0) + abs(y1 - y0), 1)
    d.polygon([(x1 + 2 * ux, y1 + 2 * uy), (x1 - 14 * ux - 8 * uy, y1 - 14 * uy + 8 * ux), (x1 - 14 * ux + 8 * uy, y1 - 14 * uy - 8 * ux)], fill=RED)
    return np.asarray(im).astype(np.float32)


RED = (179, 40, 47)
save = lambda cv, fn: Image.fromarray(np.clip(cv, 0, 255).astype(np.uint8)).save(os.path.join(HERE, 'out', fn)) or print(fn)

# ---------- 横版 16:9（1920x1080）：两图并排，标题一行 ----------
cv = pc.copy()
lw, lh = put(cv, logo, 120, 84, 0.42)
put(cv, ep, 120 + lw + 30, 84 + lh - ep.shape[0] - 6)
cv = photo(cv, 'B', 120, 214, 800, 444); cv = photo(cv, 'D', 1000, 214, 800, 444)
cv = arrow(cv, (930, 436), (990, 436))
s = 0.84; x = 120; y = 716
w1, h1 = put(cv, title1, x, y + round((title2.shape[0] - title1.shape[0]) * s), s)
put(cv, title2, x + w1 + 22, y, s)
ty = y + round(title2.shape[0] * s) + 34
put(cv, rule, x, ty); put(cv, sub, x, ty + 30)
put(cv, hosts, 1800 - hosts.shape[1], ty + 30 + (sub.shape[0] - hosts.shape[0]) // 2)
save(cv, '重估_第2期_封面.png')

# ---------- 竖版 3:4（1080x1440）：两图上下排，标题两行 ----------
pv = np.asarray(Image.fromarray(pc[:, 420:1500].astype(np.uint8)).resize((1080, 1440), Image.BICUBIC)).astype(np.float32)
M = 80; W = 1080 - 2 * M
lw, lh = put(pv, logo, M, 70, 0.42)
put(pv, ep, M + lw + 30, 70 + lh - ep.shape[0] - 6)
pv = photo(pv, 'B', M, 190, W, 360, crop=(0, 150, 3000, 150 + round(3000 * 360 / W)));   # 扁图从上往下裁，保住人头
pv = photo(pv, 'D', M, 590, W, 360)
pv = arrow(pv, (M + W - 40, 556), (M + W - 40, 584))
s = min(0.66, W / title2.shape[1]); y = 1000
put(pv, title1, M, y, s); y += round(title1.shape[0] * s) + 18
put(pv, title2, M, y, s); y += round(title2.shape[0] * s) + 30
put(pv, rule, M, y); y += 26
put(pv, sub, M, y, 0.9); y += round(sub.shape[0] * 0.9) + 26
put(pv, hosts, M, y, 0.9)
save(pv, '重估_第2期_封面_竖版.png')
