# 关键分镜稿：油画关键帧 + 原片小图 + 每镜说明 → review/paint/分镜稿_1.jpg、分镜稿_2.jpg
# 运行：python -I paint/board.py
import os, json
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
KEYS = os.path.join(ROOT, 'review', 'paint', 'keys'); OUT = os.path.join(ROOT, 'review', 'paint')
SHOTS = json.load(open(os.path.join(HERE, 'shots.json'), encoding='utf-8'))
F = os.path.join(ROOT, 'fonts')
def font(n, s):
    f = ImageFont.truetype(n if os.path.isabs(n) else os.path.join(F, n), s)
    if n == SC:
        try: f.set_variation_by_name('Medium')
        except Exception: pass
    return f
SC, LAT = 'C:/Windows/Fonts/NotoSerifSC-VF.ttf', 'cormorant-500.ttf'   # 中文用系统全字库衬线体
PW, PH, CAP, GAP, COLS = 360, 640, 200, 26, 4
BG, INK, DIM, ACC = (16, 14, 13), (236, 228, 214), (150, 140, 128), (214, 160, 84)

def wrap(d, text, f, w):
    lines, cur = [], ''
    for ch in text:
        if d.textlength(cur + ch, font=f) > w: lines.append(cur); cur = ch
        else: cur += ch
    return lines + [cur] if cur else lines

def title_overlay(im):
    """成品镜：片名（叠在画面上，不进油画）"""
    d = ImageDraw.Draw(im); W = im.width
    t1, t2 = '巨石吐司', 'THE  ROCK  TOAST'
    f1, f2 = font(SC, 104), font(LAT, 44)
    d.text(((W - d.textlength(t1, font=f1)) / 2, 150), t1, font=f1, fill=(240, 226, 198))
    d.text(((W - d.textlength(t2, font=f2)) / 2, 285), t2, font=f2, fill=(200, 168, 112))
    d.line([(W / 2 - 90, 352), (W / 2 + 90, 352)], fill=(200, 168, 112), width=2)
    return im

def panel(s):
    im = Image.open(os.path.join(KEYS, f"{s['id']}_0.jpg")).convert('RGB')
    if s['id'] == 's14': im = title_overlay(im)
    im = im.resize((PW, PH), Image.LANCZOS)
    tw, th = 90, 160
    raw = Image.open(os.path.join(HERE, 'raw', f"{s['id']}.png")).convert('RGB').resize((tw, th), Image.LANCZOS)
    p = Image.new('RGB', (PW, PH + CAP), BG); p.paste(im, (0, 0))
    d = ImageDraw.Draw(p)
    # 原片小图（右下角，对照用）
    x0, y0 = PW - tw - 10, PH - th - 10
    d.rectangle([x0 - 2, y0 - 2, x0 + tw + 1, y0 + th + 1], outline=(230, 220, 200), width=2)
    p.paste(raw, (x0, y0))
    d.rectangle([x0, y0 + th - 20, x0 + tw - 1, y0 + th - 1], fill=(0, 0, 0))
    d.text((x0 + 5, y0 + th - 20), '原片', font=font(SC, 14), fill=INK)
    # 说明
    y = PH + 12
    d.text((0, y), s['id'].upper(), font=font(LAT, 30), fill=ACC)
    d.text((62, y + 4), s['title'], font=font(SC, 24), fill=INK)
    tw = d.textlength(s['time'] + ' 秒', font=font(SC, 17))
    d.text((PW - tw, y + 9), s['time'] + ' 秒', font=font(SC, 17), fill=DIM)
    y += 44
    for lab, key in (('画面', 'pic'), ('去掉', 'cut'), ('新画', 'add'), ('运镜', 'cam')):
        f = font(SC, 16)
        d.text((0, y), lab, font=f, fill=ACC)
        for i, ln in enumerate(wrap(d, s[key], f, PW - 44)):
            d.text((44, y), ln, font=f, fill=INK if key != 'cam' else DIM); y += 22
        y += 6
    return p

def board(shots, n, total):
    rows = (len(shots) + COLS - 1) // COLS
    W = COLS * PW + (COLS + 1) * GAP; H = 150 + rows * (PH + CAP + GAP) + 70
    b = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(b)
    d.text((GAP, 30), '巨石吐司 · 油画厚涂关键分镜', font=font(SC, 44), fill=INK)
    d.text((W - GAP - d.textlength(f'{n} / {total}', font=font(SC, 30)), 40), f'{n} / {total}', font=font(SC, 30), fill=DIM)
    d.text((GAP, 96), '全部由代码从原片直接下笔：食物取原片颜色；手、字、刻度在下笔时用周围颜料盖掉；背景、石盘、点缀为新画',
           font=font(SC, 18), fill=DIM)
    for i, s in enumerate(shots):
        r, c = divmod(i, COLS)
        b.paste(panel(s), (GAP + c * (PW + GAP), 150 + r * (PH + CAP + GAP)))
    d.text((GAP, H - 50), '时长合计约 33 秒；原片真人试吃（4–9.5 秒、40–44 秒）和开头人物贴纸不进片；12 镜之后 0.6 秒静默，第一声是叉子压下去',
           font=font(SC, 17), fill=DIM)
    return b

os.makedirs(OUT, exist_ok=True)
halves = [SHOTS[:8], SHOTS[8:]]
for k, h in enumerate(halves, 1):
    f = os.path.join(OUT, f'分镜稿_{k}.jpg'); board(h, k, len(halves)).save(f, quality=90); print(f)
