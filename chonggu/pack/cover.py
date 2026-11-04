"""封面（第 8 期 tools/cover_v18b.py，改成按 episode.yaml 的 cover 出）：python -m chonggu cover <期> [--preview 预览图.png]
第 8 期定稿：超大黄色「90%」+ 外面一圈发光的紫色闭环箭头 + 招股书原页斜着浮在一边当证据（那一句荧光笔划出）+ 标题 + 署名牌子。
→ out/重估_第N期_封面_16比9.png（1920×1080，B 站、抖音横屏）、_3比4.png（1080×1440，抖音竖屏、小红书）
cover:
  headline: AI 开始造下一代 AI 了        # 标题：要粗、要大（太长自动缩）
  tag: Anthropic 招股书                  # 标题上面的红色小标签（可不写）
  big: 90%                               # 大数字（黄色；可不写）
  loop: true                             # 大数字外面一圈发光的紫色闭环箭头
  sub: [Anthropic 的代码, 是 Claude 自己写的]   # 副标题两行，第二行黄字；3:4 版连成一行（sub_3x4 可另写）
  note: 2026 年 9 月 · 招股书第 183 页
  evidence: {image: assets/s1/nx_c90.png, boxes: assets/s1/boxes_nx.json, key: nx_c90, x: [200, 900], pad: [150, 140]}
  credit: true                           # 「主讲 X」黄框牌子 + 「重估 · 第 N 期」（单人期要署名）
  fonts: {bold: NotoSansSC-VF.ttf, regular: …, number: …}   # 不写就在 stage/fonts 里自动挑
底图不用成片截图，用原始素材（evidence.image 放在这一期的 assets/，不进 git）。
字体只用随包带的开源字体（OFL）：标题 Noto Sans SC Bold（代替 Hiragino W6），正文 Regular（代替 W3），大数字 Montserrat ExtraBold（代替 Avenir Next Heavy）。
选好的字体名会打印出来，确认字重（第 8 期第一版把 W3 细体当成了粗体）。"""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageChops
from chonggu import paths
from chonggu.gates import GateFailed
from chonggu.qa import common as C

YEL, RED, WH, GR, PU = (255, 210, 63), (215, 38, 61), (255, 255, 255), (190, 193, 205), (160, 120, 255)
WANT = {'bold': (('Noto Sans SC', 'Noto Sans CJK', 'Source Han Sans', 'Noto Serif SC'), ('Bold', 'SemiBold', 'Black', 'Heavy', 'ExtraBold')),
        'regular': (('Noto Sans SC', 'Noto Sans CJK', 'Source Han Sans', 'Noto Serif SC'), ('Regular', 'Medium', 'Light')),
        'number': (('Montserrat', 'Oswald', 'Bebas Neue', 'Noto Sans SC'), ('ExtraBold', 'Black', 'Heavy', 'Bold', 'Regular'))}


def font_files(d):
    out = []
    for p in sorted(Path(d).rglob('*')):
        if p.suffix.lower() not in ('.ttf', '.otf', '.ttc'):
            continue
        for i in range(8 if p.suffix.lower() == '.ttc' else 1):
            try:
                f = ImageFont.truetype(str(p), 12, index=i)
            except OSError:
                break
            try:
                v = [x.decode() if isinstance(x, bytes) else x for x in f.get_variation_names()]
            except (OSError, AttributeError):
                v = []
            out.append((p, i, f.getname()[0], f.getname()[1], v))
    return out


class Fonts:
    """三种字：bold / regular / number。可变字体按名字选字重（set_variation_by_name），静态字体按样式名选文件。"""

    def __init__(self, cfg=None, d=None):
        d = Path(d or paths.stage_dir() / 'fonts'); cand = font_files(d); self.pick = {}
        for role, (fams, weights) in WANT.items():
            f, cand_r = (cfg or {}).get(role), cand
            if f:   # 配置里点名的字体文件（相对 stage/fonts）
                p = (Path(f) if Path(f).is_absolute() else d / f).resolve()
                cand_r = [x for x in (font_files(p.parent) if p.exists() else []) if x[0].resolve() == p]
                if not cand_r:
                    raise GateFailed(f'cover.fonts.{role} 指的字体 {f} 找不到')
                fams = (cand_r[0][2],)
            self.pick[role] = next(((p, i, w if w in v else None, fam) for fam in fams for w in weights for p, i, fm, st, v in cand_r
                                    if fm.startswith(fam) and (w in v or st == w)), None)
            if not self.pick[role]:
                raise GateFailed(f'{d} 里没有可用的{role}字体（要 {fams[0]} 的 {weights[0]}）：先装上随包的 OFL 字体')

    def __call__(self, role, z):
        p, i, w, _ = self.pick[role]; f = ImageFont.truetype(str(p), int(z), index=i)
        if w:
            f.set_variation_by_name(w)
        return f

    def show(self):
        return '；'.join(f"{r} = {' '.join(self(r, 20).getname())}（{self.pick[r][0].name}）" for r in self.pick)


def fit(F, role, text, z, max_w):   # 字太长就缩：放不下 max_w 宽就一点点调小
    f = F(role, z)
    while f.getlength(text) > max_w and z > 12:
        z *= .95; f = F(role, z)
    return f


def bg(w, h, cx, cy):
    yy, xx = np.mgrid[0:h, 0:w]; r = np.sqrt(((xx - cx) / w) ** 2 + ((yy - cy) / h) ** 2)
    a = np.clip(1 - r * 1.5, 0, 1)[..., None] ** 1.7; return Image.fromarray((np.array([8, 8, 14]) + np.array([42, 22, 80]) * a).astype(np.uint8))


def coeffs(dst, src):   # Image.PERSPECTIVE 的 8 个系数：输出图里的 dst 四点 ← 原图的 src 四点
    A, b = [], []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; b += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(b, float)).tolist()


def evidence(ep, cfg):
    """原始证据页：按 boxes 里的框用荧光笔划出那一句，其余压暗一点，只裁那一句上下几行。"""
    e = cfg.get('evidence')
    if not e:
        return None
    R = Path(ep.root); img = R / e['image']
    if not img.exists():
        raise GateFailed(f'封面证据图 {e["image"]} 不在这一期的文件夹里（素材不进 git，自己放进 assets/）')
    pg0 = Image.open(img).convert('RGB'); rects, bw = [], pg0.width
    if e.get('boxes'):
        B = json.loads((R / e['boxes']).read_text(encoding='utf-8')); B = B[e['key']] if e.get('key') else B
        rects, bw = B['rects'], B.get('w', pg0.width)
    s = pg0.width / bw
    m = Image.new('L', pg0.size, 0); dm = ImageDraw.Draw(m)
    for x, y, w, h in rects:
        dm.rectangle((x * s - 8, (y - 3) * s, (x + w) * s + 8, (y + h + 3) * s), fill=255)
    pg = ImageEnhance.Brightness(pg0).enhance(.8) if rects else pg0; pg = Image.composite(pg0, pg, m)
    hl = Image.new('RGBA', pg.size, (0, 0, 0, 0)); ImageDraw.Draw(hl).bitmap((0, 0), m, fill=(255, 206, 30, 170)); pg = Image.alpha_composite(pg.convert('RGBA'), hl).convert('RGB')
    x0, x1 = e.get('x', [0, bw]); up, down = e.get('pad', [150, 140])
    ys = [r[1] for r in rects] or [pg0.height / s / 2]; y0, y1 = max(0, (min(ys) - up) * s), min(pg0.height, (max(ys) + down) * s)
    return pg.crop((int(x0 * s), int(y0), int(x1 * s), int(y1)))


def float_page(im, page, quad):   # 纸斜着浮起来：先投一块模糊的影子，再贴纸
    W, H = im.size; pw, ph = page.size; src = [(0, 0), (pw, 0), (pw, ph), (0, ph)]
    paper = page.transform((W, H), Image.PERSPECTIVE, coeffs(quad, src), Image.BICUBIC)
    mask = Image.new('L', (W, H), 0); ImageDraw.Draw(mask).polygon(quad, fill=255)
    sh = Image.new('L', (W, H), 0); ImageDraw.Draw(sh).polygon([(x + 30, y + 40) for x, y in quad], fill=200); sh = sh.filter(ImageFilter.GaussianBlur(40))
    im = Image.composite(Image.new('RGB', (W, H), (0, 0, 0)), im, sh)
    return Image.composite(paper, im, mask.filter(ImageFilter.GaussianBlur(1)))


def loop(im, cx, cy, r, wid):   # 三段弧 + 箭头，发光
    W, H = im.size; L = Image.new('RGB', (W, H), (0, 0, 0)); d = ImageDraw.Draw(L)
    for k in range(3):
        a0 = k * 120 + 12; a1 = a0 + 96
        d.arc((cx - r, cy - r, cx + r, cy + r), a0, a1, fill=PU, width=wid)
        t = np.radians(a1); tx, ty = cx + r * np.cos(t), cy + r * np.sin(t); dx, dy = -np.sin(t), np.cos(t); nx, ny = np.cos(t), np.sin(t)
        aw = wid * 2.4; d.polygon([(tx + dx * aw * 1.3, ty + dy * aw * 1.3), (tx + nx * aw - dx * aw * .2, ty + ny * aw - dy * aw * .2), (tx - nx * aw - dx * aw * .2, ty - ny * aw - dy * aw * .2)], fill=PU)
    glow = L.filter(ImageFilter.GaussianBlur(wid * 2.2)); glow = ImageEnhance.Brightness(glow).enhance(1.8)
    return ImageChops.lighter(ImageChops.lighter(im, glow), L)


def tag(d, F, x, y, t, z):
    f = F('bold', z); d.rectangle((x, y, x + f.getlength(t) + 44, y + f.size + 30), fill=RED); d.text((x + 22, y + 12), t, font=f, fill=WH)


def credit(d, F, x, y, z, host, num):   # 署名做成一块牌子：「主讲 X」比节目名大一号，黄框，一眼看得到是谁在讲
    fn = F('bold', int(z * 1.3)); fl = F('regular', z); pad = z * .55
    w = fl.getlength('主讲') + z * .5 + fn.getlength(host); hgt = fn.size + pad * 1.4
    d.rounded_rectangle((x, y, x + w + pad * 2, y + hgt), radius=hgt * .22, outline=YEL, width=max(3, z // 12), fill=(28, 24, 12))
    d.text((x + pad, y + (hgt - fl.size) / 2 - 2), '主讲', font=fl, fill=GR); d.text((x + pad + fl.getlength('主讲') + z * .5, y + (hgt - fn.size) / 2 - 3), host, font=fn, fill=YEL)
    x2 = x + w + pad * 2 + z * .8; d.text((x2, y + (hgt - z) / 2 - 2), f'重估 · 第 {num} 期', font=F('bold', z), fill=WH)


def big(d, F, cx, cy, z, t, max_w):
    f = fit(F, 'number', t, z, max_w); w = f.getlength(t); bb = f.getbbox(t); d.text((cx - w / 2, cy - (bb[1] + bb[3]) / 2), t, font=f, fill=YEL)


def host_name(ep):
    h = getattr(ep, 'host', None) or (ep.raw or {}).get('host', '')   # 一个人写名字；双人期写列表，或 {name: …}
    if isinstance(h, dict):
        h = h.get('name') or h.get('names') or list(h.values())
    return '、'.join(map(str, h)) if isinstance(h, (list, tuple)) else str(h)


def make(ep, preview=None):
    cfg = getattr(ep, 'cover', None) or {}
    if not cfg.get('headline'):
        raise GateFailed('episode.yaml 里没有 cover.headline（封面标题）')
    F = Fonts(cfg.get('fonts')); print('封面字体：', F.show())
    page = evidence(ep, cfg); sub = list(cfg.get('sub') or []); host = host_name(ep); num = ep.number
    has_big = bool(cfg.get('big')); out = []
    # 16:9：左边标题 + 闭环里的大数字，右边浮着证据页
    im = bg(1920, 1080, 560, 600)
    if page:
        im = float_page(im, page, [(1390, 330), (1895, 382), (1872, 790), (1362, 752)])
    if has_big and cfg.get('loop', True):
        im = loop(im, 450, 640, 245, 16)
    d = ImageDraw.Draw(im)
    if cfg.get('tag'):
        tag(d, F, 96, 64, cfg['tag'], 42)
    d.text((90, 140), cfg['headline'], font=fit(F, 'bold', cfg['headline'], 118, 1740), fill=WH)
    sx, sw = (760, (1340 if page else 1800) - 760) if has_big else (96, (1300 if page else 1760) - 96)
    if has_big:
        big(d, F, 450, 640, 225, str(cfg['big']), 490)   # 最宽到闭环的直径（第 8 期的 90% 压着圈）
    for k, (t, c) in enumerate(zip(sub[:2], (WH, YEL))):
        d.text((sx, 560 + 80 * k), t, font=fit(F, 'bold', t, 56, sw), fill=c)
    if cfg.get('note'):
        d.text((sx + 2, 560 + 80 * min(2, len(sub)) + 25), cfg['note'], font=fit(F, 'regular', cfg['note'], 30, sw), fill=GR)
    if cfg.get('credit', True) and host:
        credit(d, F, 96, 950, 42, host, num)
    p1 = Path(ep.out(C.name(ep, 'cover', '16比9', ext='.png'))); p1.parent.mkdir(parents=True, exist_ok=True); im.save(p1); out.append(p1)
    # 3:4：上面浮着证据页，中间闭环大数字，下面标题
    im = bg(1080, 1440, 540, 760)
    if page:
        im = float_page(im, page, [(150, 70), (1010, 130), (980, 460), (120, 420)])
    if has_big and cfg.get('loop', True):
        im = loop(im, 540, 760, 230, 15)
    d = ImageDraw.Draw(im)
    if has_big:
        big(d, F, 540, 760, 210, str(cfg['big']), 460)
    if cfg.get('tag'):
        tag(d, F, 64, 1040, cfg['tag'], 40)
    d.text((58, 1115), cfg['headline'], font=fit(F, 'bold', cfg['headline'], 88, 960), fill=WH)
    s1 = cfg.get('sub_3x4') or '，'.join(sub)
    if s1:
        d.text((62, 1235), s1, font=fit(F, 'bold', s1, 46, 956), fill=YEL)
    if cfg.get('credit', True) and host:
        credit(d, F, 64, 1330, 38, host, num)
    p2 = Path(ep.out(C.name(ep, 'cover', '3比4', ext='.png'))); im.save(p2); out.append(p2)
    if preview:   # 缩成手机缩略图那么大并排看：字压没压到纸边、底图
        a = Image.open(p1).resize((960, 540)); b = Image.open(p2).resize((540, 720))
        c = Image.new('RGB', (1510, 720), 'white'); c.paste(a, (0, 90)); c.paste(b, (970, 0)); c.save(preview); out.append(Path(preview))
    print('封面 2 张：', p1.name, p2.name)
    return out
