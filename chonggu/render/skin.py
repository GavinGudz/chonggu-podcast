"""树的「皮肤」贴图（stage/treeskin.js 用）和全片的颗粒图，从第 8 期的 tools/skin.py 搬来：约 10 秒，不联网，随机数都用固定种子，重跑结果一样。

python -m chonggu stills / render 第一次跑时自动生成到 stage/skin/（不进仓库）。手动：python -m chonggu.render.skin [--force]

生成的东西（都是半透明的叠加层，卡片底色还是 CSS 渐变，贴图只管「质感」）：
  mat_note.png   钱：钞票上的扭索纹（guilloche 细线）+ 右边一朵玫瑰纹
  mat_foil.png   金：金箔的细碎起伏 + 几点闪光
  mat_steel.png  方向盘：横向拉丝
  mat_hazard.png 越界：底边一条很淡的警示斜纹 + 全卡极淡的斜纹
  mat_holo.png   下一代：全息的彩虹斜带 + 衍射细线
  mat_grid.png   青绿（第 8 期的 OpenAI）：细点阵（像电路板上的丝印）
  mat_fiber.png  赭橙（第 8 期的 Anthropic）：纸纤维
  mat_grain.png  灰 / 红 / 没登记的配色：哑光颗粒
  mat_paper.png  纸卡：深色纸纤维
  frame_<配色>.png  卡片内框（九宫格，border-image 用）：细线框 + 四角的 L 形角饰 + 小菱形
  emb_<配色>.png    卡片顶上的小徽记：中间菱形，两边细线往外渐隐
  grain.png      全片叠的一层颗粒（lin16.js 的 K.grain、film.css 的 --s25-grain），512×512 灰度，可以平铺
第 8 期的真标志（logo_openai / logo_anthropic，从截图上抠的）不再生成：标志是别人的商标，放在各期自己的 assets 里，episode.yaml 的 logos 登记。
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

VERSION = 'skin-1'   # 改了下面的画法就改这个号，旧贴图会自动重画
W, H = 1024, 512
OUT = Path('.')      # build() 里设成 stage/skin
rng = np.random.default_rng(8)

# 各配色的饰件颜色（和 treeskin.js 里 MAT 的 edge 一致）
ORN = {'money': '#f3d891', 'gold': '#ffe6a6', 'wheel': '#a9d4ff', 'bounds': '#ffadc0', 'red': '#ffaaa0', 'next': '#dcc4ff',
       'oa': '#9fe8d6', 'an': '#ffcaa6', 'grey': '#c9ced8', 'paper': '#8a7f66', 'photo': '#f1ead8'}
MATS = ['mat_note', 'mat_foil', 'mat_steel', 'mat_hazard', 'mat_holo', 'mat_grid', 'mat_fiber', 'mat_grain', 'mat_paper']


def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def save(a, name):
    """a: H×W×4 浮点（0–1）→ PNG"""
    Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8), 'RGBA').save(OUT / name, optimize=True)


def signed(v, amp, light=(255, 255, 255), dark=(0, 0, 0)):
    """有正有负的起伏 v（大致 -1..1）→ 亮处叠白、暗处叠黑的半透明层"""
    out = np.zeros((v.shape[0], v.shape[1], 4))
    pos, neg = np.clip(v, 0, None), np.clip(-v, 0, None)
    a = (pos + neg) * amp
    for i in range(3): out[..., i] = np.where(v >= 0, light[i], dark[i]) / 255
    out[..., 3] = np.clip(a, 0, 1)
    return out


def over(dst, src):
    """src 叠到 dst 上（都是直通 alpha）"""
    a = src[..., 3:4] + dst[..., 3:4] * (1 - src[..., 3:4])
    rgb = (src[..., :3] * src[..., 3:4] + dst[..., :3] * dst[..., 3:4] * (1 - src[..., 3:4])) / np.maximum(a, 1e-6)
    return np.concatenate([rgb, a], -1)


def noise(scale_px, amp=1.0, shape=(H, W), seed=None):
    g = np.random.default_rng(seed) if seed is not None else rng
    n = g.standard_normal(shape)
    n = ndi.gaussian_filter(n, scale_px, mode='wrap')
    return n / (n.std() + 1e-9) * amp


def grain(amp=.05, seed=1):
    return signed(noise(.6, 1, seed=seed), amp)


def lines_layer(draw_fn, ss=3, col=(255, 255, 255), alpha=1.0):
    """在 3 倍大小上画细线再缩小（抗锯齿）。draw_fn(draw, ss) 用白色画。返回 H×W×4"""
    im = Image.new('L', (W * ss, H * ss), 0)
    draw_fn(ImageDraw.Draw(im), ss)
    im = im.resize((W, H), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float64) / 255 * alpha
    out = np.zeros((H, W, 4)); out[..., 0], out[..., 1], out[..., 2] = col[0] / 255, col[1] / 255, col[2] / 255; out[..., 3] = a
    return out


# 第二轮（2026-11-03）：纹理放大一倍多、对比加强，1080p 缩到手机大小还认得出。小卡在 treeskin.js 里只用 4 成浓度。
# ---------------- 钱：扭索纹 ----------------
def mat_note():
    def fam(d, ss, ph0, k2):
        n = 20
        for k in range(n):
            y0 = (k - 2) * H / (n - 4)
            pts = []
            for xi in range(0, W + 8, 4):
                x = xi
                y = y0 + 16 * math.sin(2 * math.pi * x / 300 + k * .55 + ph0) + 7 * math.sin(2 * math.pi * x / 110 + k * k2)
                pts.append((x * ss, y * ss))
            d.line(pts, fill=255, width=max(1, int(2.2 * ss)))
    a = lines_layer(lambda d, ss: fam(d, ss, 0, .9), col=(255, 232, 168), alpha=.20)
    b = lines_layer(lambda d, ss: fam(d, ss, math.pi, -.7), col=(255, 232, 168), alpha=.14)

    def rosette(d, ss):   # 右边一朵大玫瑰纹（正弦起伏的同心环）
        cx, cy = W * .80, H * .52
        for j in range(15):
            R0 = 70 + j * 12
            pts = []
            for i in range(901):
                th = i / 900 * 2 * math.pi
                r = R0 + 16 * math.sin(14 * th + j * .7) + 5 * math.sin(5 * th - j)
                pts.append(((cx + r * math.cos(th)) * ss, (cy + r * math.sin(th) * .92) * ss))
            d.line(pts, fill=255, width=max(1, int(2.0 * ss)))
    r = lines_layer(rosette, col=(255, 238, 186), alpha=.36)
    yy, xx = np.mgrid[0:H, 0:W]
    fade = np.clip(1 - (np.hypot((xx - W * .8), (yy - H * .52) / .92) - 230) / 60, 0, 1)
    r[..., 3] *= fade
    a[..., 3] *= 1 - .7 * fade; b[..., 3] *= 1 - .7 * fade                # 玫瑰纹底下的直纹淡一点
    save(over(over(over(grain(.03, 2), a), b), r), 'mat_note.png')


# ---------------- 金箔 ----------------
def mat_foil():
    # 揉过再压平的金箔：大块的折面（一面亮一面暗）+ 斜向细拉丝 + 几点闪光
    v = noise(16, 1, seed=11) * .7 + noise(6, 1, seed=14) * .3
    gy, gx = np.gradient(v)
    facet = gx * .8 - gy * .6
    facet = facet / (np.abs(facet).std() * 1.6 + 1e-9)
    m1 = signed(np.tanh(facet * 1.0), .19, light=(255, 246, 210), dark=(45, 26, 0))
    big = np.random.default_rng(12).standard_normal((H * 2, W * 2))
    big = ndi.gaussian_filter1d(big, 40, axis=1, mode='wrap'); big = ndi.gaussian_filter1d(big, .8, axis=0)
    big = ndi.rotate(big, -22, reshape=False, mode='wrap')[H // 2:H // 2 + H, W // 2:W // 2 + W]
    big /= big.std() + 1e-9
    m2 = signed(np.tanh(big * .7), .07, light=(255, 248, 220), dark=(40, 24, 0))
    sp = np.zeros((H, W)); g = np.random.default_rng(13)
    for _ in range(26):
        x, y = g.integers(0, W), g.integers(0, H); sp[y, x] = g.uniform(.6, 1)
    sp = ndi.gaussian_filter(sp, 2.2); sp = sp / sp.max()
    s = np.zeros((H, W, 4)); s[..., :3] = 1; s[..., 3] = np.clip(sp * .5, 0, 1)
    save(over(over(over(grain(.03, 3), m1), m2), s), 'mat_foil.png')


# ---------------- 拉丝钢 ----------------
def mat_steel():
    g = np.random.default_rng(21)
    n = g.standard_normal((H, W // 64 + 2))
    n = np.asarray(Image.fromarray(((n - n.min()) / (n.max() - n.min()) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), dtype=np.float64) / 255 * 2 - 1
    n = ndi.gaussian_filter1d(n, 40, axis=1, mode='wrap'); n = ndi.gaussian_filter1d(n, 1.0, axis=0)
    n = n / (n.std() + 1e-9)
    fine = g.standard_normal((H, W)); fine = ndi.gaussian_filter1d(fine, 90, axis=1, mode='wrap'); fine = ndi.gaussian_filter1d(fine, 1.1, axis=0); fine /= fine.std() + 1e-9
    m = signed(np.tanh(.6 * n + .4 * fine), .17, light=(228, 240, 255), dark=(0, 6, 18))
    yy = np.mgrid[0:H, 0:W][0] / H
    band = np.exp(-((yy - .3) / .12) ** 2) * .20 - np.exp(-((yy - .78) / .14) ** 2) * .10   # 一道横向的亮带、下面一道暗带：金属的各向异性反光
    sh = signed(band / .2, .2, light=(235, 245, 255), dark=(0, 8, 20))
    save(over(over(grain(.025, 4), sh), m), 'mat_steel.png')


# ---------------- 越界：警示斜纹 ----------------
def mat_hazard():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    ph = ((xx + yy) % 64) / 64
    stripe = np.clip((np.abs(ph - .5) - .2) * 16, 0, 1)
    band = np.clip((yy / H - .78) / .06, 0, 1)                             # 底边一条警示带
    m = np.zeros((H, W, 4)); m[..., 0], m[..., 1], m[..., 2] = 1, .66, .74
    m[..., 3] = stripe * .26 * band
    edge = np.zeros((H, W, 4)); edge[..., 3] = np.clip(1 - np.abs(yy / H - .78) * 120, 0, 1) * .22; edge[..., :3] = (1, .75, .82)
    save(over(over(grain(.04, 5), m), edge), 'mat_hazard.png')


# ---------------- 下一代：全息 ----------------
def mat_holo():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    u = (xx * math.cos(math.radians(28)) + yy * math.sin(math.radians(28))) / W
    hue = (u * 1.0 + .1 * np.sin(yy / H * 5.0) + .6) % 1
    h6 = hue * 6; i = np.floor(h6).astype(int) % 6; f = h6 - np.floor(h6); s, v = .55, 1.0
    p, q, tt = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    r = np.choose(i, [v + 0 * f, q, p, p, tt, v]); g = np.choose(i, [tt, v + 0 * f, v + 0 * f, q, p, p]); b = np.choose(i, [p, p, tt, v + 0 * f, v + 0 * f, q])
    band = .5 + .5 * np.sin(2 * math.pi * (u * 1.6 + .1))
    m = np.zeros((H, W, 4)); m[..., 0], m[..., 1], m[..., 2] = r, g, b
    m[..., 3] = .08 + .22 * band ** 2
    dif = np.zeros((H, W, 4)); dif[..., :3] = 1
    d = (xx * .5 + yy * .866) % 12
    dif[..., 3] = np.clip(1 - np.abs(d - 6) * .8, 0, 1) * .08
    sp = np.zeros((H, W)); gg = np.random.default_rng(31)
    for _ in range(50): sp[gg.integers(0, H), gg.integers(0, W)] = gg.uniform(.5, 1)
    sp = ndi.gaussian_filter(sp, 1.8); sp /= sp.max()
    spk = np.zeros((H, W, 4)); spk[..., :3] = (.95, .92, 1); spk[..., 3] = sp * .55
    save(over(over(over(grain(.03, 6), m), dif), spk), 'mat_holo.png')


# ---------------- OpenAI：点阵 ----------------
def mat_grid():
    def dots(d, ss):
        st = 24
        for y in range(st // 2, H, st):
            for x in range(st // 2, W, st):
                r = 1.9 * ss; d.ellipse([x * ss - r, y * ss - r, x * ss + r, y * ss + r], fill=255)
    m = lines_layer(dots, col=(205, 255, 240), alpha=.20)
    yy, xx = np.mgrid[0:H, 0:W]
    m[..., 3] *= np.clip(1.15 - np.hypot((xx - W * .5) / W, (yy - H * .5) / H) * 1.2, .25, 1)   # 中间实、四边淡
    save(over(grain(.035, 7), m), 'mat_grid.png')


# ---------------- 纸纤维 ----------------
def fibers(col, alpha, n=900, seed=41, L0=8, L1=34, wd=.8):
    g = np.random.default_rng(seed)

    def draw(d, ss):
        for _ in range(n):
            x, y = g.uniform(0, W), g.uniform(0, H); L = g.uniform(L0, L1); th = g.uniform(0, math.pi); bend = g.uniform(-.4, .4)
            pts = []
            for k in range(7):
                s = (k / 6 - .5) * L; a = th + bend * (k / 6 - .5)
                pts.append(((x + s * math.cos(a)) * ss, (y + s * math.sin(a)) * ss))
            d.line(pts, fill=int(g.uniform(120, 255)), width=max(1, int(wd * ss)))
    return lines_layer(draw, col=col, alpha=alpha)


def mat_fiber():
    m = over(over(over(signed(noise(30, 1, seed=44), .05, light=(255, 230, 200), dark=(40, 15, 0)), grain(.04, 8)),
                   fibers((255, 236, 214), .16, n=700, seed=42, L0=18, L1=60, wd=1.4)), fibers((40, 18, 6), .12, n=600, seed=43, L0=18, L1=60, wd=1.4))
    save(m, 'mat_fiber.png')


def mat_grain():
    mott = signed(noise(60, 1, seed=51), .03)
    save(over(mott, grain(.05, 9)), 'mat_grain.png')


def mat_paper():
    m = over(signed(noise(50, 1, seed=61), .02, dark=(80, 60, 20)), fibers((90, 74, 40), .10, n=1200, seed=62))
    save(m, 'mat_paper.png')


# ---------------- 内框 + 角饰（九宫格）----------------
def frame(name, col):
    S, ss = 120, 4
    im = Image.new('RGBA', (S * ss, S * ss), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    c = hexrgb(col)
    o = 4 * ss                              # 线离图边
    thin = (*c, 120)
    d.rectangle([o, o, S * ss - o - 1, S * ss - o - 1], outline=thin, width=int(1.1 * ss))
    arm, wd = 30 * ss, int(2.4 * ss)
    for (sx, sy) in ((0, 0), (1, 0), (0, 1), (1, 1)):
        X = o if sx == 0 else S * ss - o - 1; Y = o if sy == 0 else S * ss - o - 1
        dx = 1 if sx == 0 else -1; dy = 1 if sy == 0 else -1
        d.line([(X, Y), (X + dx * arm, Y)], fill=(*c, 255), width=wd)
        d.line([(X, Y), (X, Y + dy * arm)], fill=(*c, 255), width=wd)
        # 小菱形，在角里往内一点
        cx, cy, r = X + dx * 12 * ss, Y + dy * 12 * ss, 3.2 * ss
        d.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=(*c, 235))
    im = im.resize((S, S), Image.LANCZOS)
    im.save(OUT / f'frame_{name}.png', optimize=True)


def emblem(name, col):
    Wd, Hd, ss = 360, 36, 4
    im = Image.new('RGBA', (Wd * ss, Hd * ss), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    c = hexrgb(col); cx, cy = Wd * ss / 2, Hd * ss / 2
    for side in (-1, 1):                      # 两边细线往外渐隐
        for k in range(60):
            x0 = cx + side * (26 + k * 2.4) * ss; x1 = cx + side * (26 + (k + 1) * 2.4) * ss
            a = int(255 * (1 - k / 60) ** 1.4)
            d.line([(x0, cy), (x1, cy)], fill=(*c, a), width=int(1.4 * ss))
        r = 2.2 * ss; x = cx + side * 17 * ss
        d.ellipse([x - r, cy - r, x + r, cy + r], fill=(*c, 230))
    R = 9 * ss
    d.polygon([(cx, cy - R), (cx + R, cy), (cx, cy + R), (cx - R, cy)], outline=(*c, 255), width=int(1.6 * ss))
    r = 3.6 * ss
    d.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=(*c, 255))
    im.resize((Wd, Hd), Image.LANCZOS).save(OUT / f'emb_{name}.png', optimize=True)


# ---------------- 全片颗粒 ----------------
def film_grain():
    """512×512 灰度、平均 127 的细颗粒，四边接得上（平铺不出缝）"""
    n = ndi.gaussian_filter(np.random.default_rng(71).standard_normal((512, 512)), .7, mode='wrap')
    n = n / (n.std() + 1e-9) * 46 + 127.5
    Image.fromarray(np.clip(n, 0, 255).astype(np.uint8), 'L').save(OUT / 'grain.png', optimize=True)


def files():
    """应该有的全部贴图（文件名）"""
    return [m + '.png' for m in MATS] + [f'{p}_{k}.png' for k in ORN for p in ('frame', 'emb')] + ['grain.png']


def fresh(out_dir: Path) -> bool:
    """贴图都在、而且是这一版画的"""
    out_dir = Path(out_dir); v = out_dir / '.version'
    return v.exists() and v.read_text(encoding='utf-8').strip() == VERSION and all((out_dir / f).exists() for f in files())


def build(out_dir: Path | None = None, force: bool = False) -> Path:
    """画全部贴图到 out_dir（默认 stage/skin）。已经是这一版的就跳过，返回目录"""
    global OUT, rng
    if out_dir is None:
        from chonggu import paths
        out_dir = paths.stage_dir() / 'skin'
    out_dir = Path(out_dir)
    if not force and fresh(out_dir):
        return out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    OUT, rng = out_dir, np.random.default_rng(8)
    print('贴图 ->', out_dir, flush=True)
    mat_note(); mat_foil(); mat_steel(); mat_hazard(); mat_holo(); mat_grid(); mat_fiber(); mat_grain(); mat_paper()
    for k, c in ORN.items():
        frame(k, c); emblem(k, c)
    film_grain()
    (out_dir / '.version').write_text(VERSION, encoding='utf-8')
    print(f'   {len(files())} 张', flush=True)
    return out_dir


if __name__ == '__main__':
    build(force='--force' in sys.argv)
