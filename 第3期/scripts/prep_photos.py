"""Crop, size and tone the photos for the renderer (same grade as 第 2 期 cards.py: color 0.82, 6% paper)."""
from pathlib import Path
from PIL import Image, ImageEnhance
HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'render' / 'photos'; OUT.mkdir(exist_ok=True)
M = HERE / '照片素材'
P = {  # key: (file, crop box as fractions l,t,r,b, display w, h)
    'nyu': (M / 'wikimedia_纽约华盛顿广场拱门_MarcoAlmbauer_CC0.jpg', (0.0, 0.10, 1.0, 0.80), 760, 500),
    'two': (HERE / 'photos' / 'two.png', (0, 0, 1, 1), 908, 235),
    'simon': (M / 'wikimedia_HerbertSimon_1981_RIT_公有领域.jpg', (0.0, 0.02, 1.0, 0.86), 280, 370),
    'kahneman': (M / 'wikimedia_DanielKahneman_nrkbeta_CCBYSA2.jpg', (0, 0, 1, 1), 300, 360),
    'doctor': (M / 'wikimedia_医生听诊_Shixart1985_CCBY2.jpg', (0.0, 0.0, 0.82, 1.0), 560, 380),
    'nyse': (M / 'wikimedia_纽约证券交易所_CarolMHighsmith_公有领域.jpg', (0.0, 0.03, 1.0, 0.42), 560, 250),
    'kabosu': (M / 'wikimedia_柴犬Kabosu纪念像_FredCherrygarden_CCBYSA4.jpg', (0.31, 0.27, 0.94, 0.85), 520, 320),
}
for k, (f, (l, t, r, b), w, h) in P.items():
    im = Image.open(f).convert('RGB')
    W, H = im.size
    im = im.crop((int(l * W), int(t * H), int(r * W), int(b * H)))
    W, H = im.size; a = w / h
    if W / H > a:
        nw = int(H * a); im = im.crop(((W - nw) // 2, 0, (W - nw) // 2 + nw, H))
    else:
        nh = int(W / a); im = im.crop((0, (H - nh) // 2, W, (H - nh) // 2 + nh))
    s = 2 if k != 'two' else 1.5
    im = im.resize((int(w * s), int(h * s)), Image.LANCZOS)
    if k != 'two':
        im = ImageEnhance.Color(im).enhance(0.82)
    im = Image.blend(im, Image.new('RGB', im.size, (236, 231, 222)), 0.06)
    im.save(OUT / f'{k}.jpg', quality=92)
    print(k, im.size)
