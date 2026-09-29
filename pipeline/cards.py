# 照片卡片的素材定义 + 渲染图注（RGBA PNG），风格对齐正片：细黑框、红色图注、灰色署名。
# 需要 macOS 自带的 Hiragino Sans GB 字体，所以在本机渲染好 PNG 再提交；云端直接用 cards/*.png。
# 成片里用的是 animcards.py 的动画版：照片按这里的裁切重做，图注取自 PNG 下方的文字区。
# 位置、大小和时间在 cards.json 里（关键帧），这里不再写。
import os
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
Image.MAX_IMAGE_PIXELS = None
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, '..', '照片素材') + '/'
FONT = '/System/Library/Fonts/Hiragino Sans GB.ttc'
RED = (179, 40, 47, 255); GRAY = (130, 126, 118, 255); BORDER = (28, 26, 23, 235)
NARA = '图：白宫摄影处 / 美国国家档案馆'; WH = '图：白宫官方照片'
# 名称, 文件, 裁切框(None=整张), PNG 里照片的宽, 高, 图注, 署名
CARDS = [
    ('A1', '2026-05_北京机场_P20260513DT-0205.jpg', (30, 330, 1530, 1330), 350, 233, '2026.5 · 北京', WH),
    ('A2', '2026-09_安德鲁斯基地_P20260923DT-0558.jpg', None, 350, 233, '2026.9 · 华盛顿', WH),
    ('B', '1972_机场握手_NARA66394264.jpg', (0, 150, 3000, 1817), 594, 330, '1972.2.21 · 北京首都机场', NARA),
    ('C', '1972_长城_NARA194420.tif', (0, 300, 3000, 1967), 594, 330, '1972.2.24 · 八达岭长城', NARA),
    ('D', '2026-09_南草坪_P20260924DT-3014.jpg', (300, 100, 3000, 1900), 393, 262, '2026.9 · 白宫南草坪', WH),
    ('E', 'unsplash_66号公路_ArnaudSteckle.jpg', (0, 250, 3000, 1750), 492, 246, '美国 · 66 号公路', '图：Unsplash / Arnaud Steckle'),
    ('F', 'unsplash_陆家嘴_FreemanZhou.jpg', None, 638, 366, '上海 · 陆家嘴', '图：Unsplash / Freeman Zhou'),
    ('G', 'unsplash_UNSW图书馆草坪_DominicKurniawanSuryaputra.jpg', (450, 150, 3000, 1586), 295, 166, '悉尼 · UNSW', '图：Unsplash'),
    ('H', 'unsplash_机场出发_BrianaTozour.jpg', None, 820, 547, '', '图：Unsplash / Briana Tozour'),
]
CAP = 74


def render(c):
    name, fn, crop, w, h, label, credit = c
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
    f_label = ImageFont.truetype(FONT, 26, index=1)   # W6
    f_credit = ImageFont.truetype(FONT, 20, index=0)  # W3
    card = Image.new('RGBA', (w + 2, h + 2 + CAP), (0, 0, 0, 0)); d = ImageDraw.Draw(card)
    d.rectangle([0, 0, w + 1, h + 1], outline=BORDER, width=1); card.paste(im, (1, 1))
    ty = h + 2 + 14
    if label:
        d.text((0, ty), label, font=f_label, fill=RED); ty += 26 + 8
    d.text((0, ty), credit, font=f_credit, fill=GRAY)
    card.save(os.path.join(HERE, 'cards', f'{name}.png'))
    return name, card.size


if __name__ == '__main__':
    for name, (w, h) in map(render, CARDS):
        print(name, f'{w}x{h}')
