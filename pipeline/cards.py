# 渲染照片卡片（RGBA PNG），风格对齐正片：细黑框、红色图注、灰色署名。
# 需要 macOS 自带的 Hiragino Sans GB 字体，所以在本机渲染好 PNG 再提交；云端直接用 cards/*.png。
# 位置已在原片逐帧核对过：显示期间卡片下方都是空白纸面。
import json, os
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
Image.MAX_IMAGE_PIXELS = None
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, '..', '照片素材') + '/'
FONT = '/System/Library/Fonts/Hiragino Sans GB.ttc'
f_label = ImageFont.truetype(FONT, 26, index=1)   # W6
f_credit = ImageFont.truetype(FONT, 20, index=0)  # W3
RED = (179, 40, 47, 255); GRAY = (130, 126, 118, 255); BORDER = (28, 26, 23, 235)
NARA = '图：白宫摄影处 / 美国国家档案馆'; WH = '图：白宫官方照片'
# 名称, 文件, 裁切框(None=整张), 照片宽, 高, 图注, 署名, x, y, 正片原始时间 起, 止（秒）
CARDS = [
    ('A1', '2026-05_北京机场_P20260513DT-0205.jpg', (100, 250, 2200, 1650), 350, 233, '2026.5 · 北京', WH, 1122, 276, 19.5, 26.3),
    ('A2', '2026-09_安德鲁斯基地_P20260923DT-0558.jpg', None, 350, 233, '2026.9 · 华盛顿', WH, 1504, 276, 19.8, 26.3),
    ('B', '1972_机场握手_NARA66394264.jpg', (0, 150, 3000, 1817), 594, 330, '1972.2.21 · 北京首都机场', NARA, 1228, 450, 65.0, 72.7),
    ('C', '1972_长城_NARA194420.tif', (0, 300, 3000, 1967), 594, 330, '1972.2.24 · 八达岭长城', NARA, 1228, 450, 72.4, 76.8),
    ('D', '2026-09_南草坪_P20260924DT-3014.jpg', (300, 100, 3000, 1900), 393, 262, '2026.9 · 白宫南草坪', WH, 1230, 520, 78.0, 93.9),
    ('E', 'unsplash_66号公路_ArnaudSteckle.jpg', (0, 250, 3000, 1750), 492, 246, '美国 · 66 号公路', '图：Unsplash / Arnaud Steckle', 1333, 536, 117.5, 125.2),
    ('F', 'unsplash_陆家嘴_FreemanZhou.jpg', None, 638, 366, '上海 · 陆家嘴', '图：Unsplash / Freeman Zhou', 1200, 416, 126.3, 142.2),
    ('G', 'unsplash_UNSW图书馆草坪_DominicKurniawanSuryaputra.jpg', (450, 150, 3000, 1586), 295, 166, '悉尼 · UNSW', '图：Unsplash', 1531, 728, 183.0, 196.2),
    ('H', 'unsplash_机场出发_BrianaTozour.jpg', None, 820, 547, '', '图：Unsplash / Briana Tozour', 945, 173, 277.5, 289.7),
]
CAP = 74


def render(c):
    name, fn, crop, w, h, label, credit, x, y, t0, t1 = c
    im = Image.open(P + fn).convert('RGB')
    if crop:
        im = im.crop(crop)
    W, H = im.size; a = w / h
    if W / H > a:
        nw = int(H * a); im = im.crop(((W - nw) // 2, 0, (W - nw) // 2 + nw, H))
    else:
        nh = int(W / a); im = im.crop((0, (H - nh) // 2, W, (H - nh) // 2 + nh))
    im = im.resize((w, h), Image.LANCZOS)
    im = ImageEnhance.Color(im).enhance(0.82)
    im = Image.blend(im, Image.new('RGB', im.size, (236, 231, 222)), 0.06)
    card = Image.new('RGBA', (w + 2, h + 2 + CAP), (0, 0, 0, 0)); d = ImageDraw.Draw(card)
    d.rectangle([0, 0, w + 1, h + 1], outline=BORDER, width=1); card.paste(im, (1, 1))
    ty = h + 2 + 14
    if label:
        d.text((0, ty), label, font=f_label, fill=RED); ty += 26 + 8
    d.text((0, ty), credit, font=f_credit, fill=GRAY)
    card.save(os.path.join(HERE, 'cards', f'{name}.png'))
    return dict(name=name, x=x, y=y, w=card.width, h=card.height, t0=t0, t1=t1)


if __name__ == '__main__':
    out = [render(c) for c in CARDS]
    json.dump(out, open(os.path.join(HERE, 'cards.json'), 'w'), indent=1, ensure_ascii=False)
    print('\n'.join(f"{c['name']} {c['w']}x{c['h']} @({c['x']},{c['y']}) {c['t0']}-{c['t1']}s" for c in out))
