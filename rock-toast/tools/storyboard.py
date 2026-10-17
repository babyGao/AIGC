# 分镜图板：每镜一帧（取自调色样帧）+ 编号、时间、景别运镜、画面、声音 → review/storyboard/board_*.jpg
import os, sys
from PIL import Image, ImageDraw, ImageFont
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'review', 'regrade'); OUT = os.path.join(ROOT, 'review', 'storyboard'); os.makedirs(OUT, exist_ok=True)
F = lambda s, bold=False: ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc', s)

# (帧秒, 名称, 起, 止, 景别·运镜, 画面, 声音/字幕)
SHOTS = [
  (0.9, '钩子·糖浆', 0.0, 1.33, '近景 3/4 · 缓推', '成品上方，糖浆细线落下，蓝莓果酱顺正面下挂', '糖浆细流、滴落；竖琴琶音起'),
  (2.0, '钩子·果酱', 1.33, 2.67, '特写 · 缓推', '叉子挑起果酱，紫色酱汁从断面涌出', '旁白起：四英寸厚的法式吐司'),
  (4.3, '菜名卡', 2.67, 5.33, '中景 · 静帧缓拉 + 扫光', '「巨石吐司 / ROCK TOAST」随扫光逐字亮起，末拍压黑', '扫光音；钟琴一声'),
  (6.6, '切面包', 5.33, 8.0, '近景 · 0.75 倍慢放', '面包刀切开整条布里欧修（手在画外）', '刀锯面包皮；旁白：一刀两段'),
  (8.6, '倒牛奶', 8.0, 9.33, '中景 · 缓推', '牛奶细流入杯，左上标注「牛奶 100 ml」', '倒液声；旁白：100 毫升牛奶'),
  (9.65, '打蛋', 9.33, 10.67, '中景 · 缓推', '两颗蛋先后落入（9.5 / 10.5 秒）', '两声蛋落；标注「鸡蛋 ×2」'),
  (11.2, '肉桂粉', 10.67, 12.0, '中景 · 缓推', '一勺肉桂粉落在液面', '粉落沙沙；标注「肉桂粉 1 勺」'),
  (12.7, '搅匀', 12.0, 13.33, '中景 · 0.8 倍', '白、黄、肉桂色搅成金黄', '搅拌声；颤音琴一音一动作'),
  (14.7, '淋蛋液', 13.33, 16.0, '近景 · 0.7 倍慢放', '金黄蛋液淋在吐司上，顺切面下挂', '稠液下挂；旁白：都吸饱蛋液'),
  (16.8, '下锅', 16.0, 17.33, '近景 · 0.4 倍慢放', '暗处亮起，吐司在铸铁锅里起油泡', '嗞嗞声提前半拍进入'),
  (18.0, '煎面特写', 17.33, 18.67, '特写 · 静帧缓推', '侧面的焦糖豹纹', '煎锅持续嗞嗞'),
  (19.4, '翻面', 18.67, 20.0, '近景 · 0.5 倍慢放', '吐司翻面落锅（19.4 秒）', '落锅一声 + 油爆；旁白：不断翻面'),
  (22.0, '外皮微距', 20.0, 24.0, '微距 · 静帧缓推 + 扫光', '焦糖外皮纹理；全片第一次减速，末拍压暗', '只留大提琴铺底'),
  (26.0, '装盘', 24.0, 26.67, '中景 · 0.7 倍', '平放那块落盘（24.6），竖立那块靠上（26.4）', '两声瓷盘轻落；旁白：灵魂在三种酱'),
  (28.0, '花生奶油酱', 26.67, 29.33, '近景 · 0.5 倍慢放', '象牙色奶油酱淋下，顺边缘挂成几道', '稠酱下挂；右上标注'),
  (30.7, '蓝莓果酱', 29.33, 32.0, '近景 · 0.5 倍慢放', '深紫果酱一勺勺落在顶面', '三声厚重落酱 + 钟琴'),
  (33.3, '枫糖浆', 32.0, 34.67, '近景 · 0.55 倍慢放', '一根琥珀细线落下；末半拍真静默', '细流 → 全部静音'),
  (35.8, '叉开', 34.67, 38.67, '特写 · 0.45 倍慢放', '静默中叉子压下（35.3 秒），果酱从断面涌出', '叉子压下是静默后第一个声音'),
  (40.5, '收尾', 38.67, 42.67, '全景 · 静帧缓拉 + 扫光', '回到成品全貌，菜名再现，最后两拍压黑', '旁白：这就是，巨石吐司'),
]
TW, TH, CAP, GAP, COLS = 324, 576, 232, 16, 5
def wrap(d, txt, font, w):
    lines, cur = [], ''
    for ch in txt:
        if d.textlength(cur + ch, font=font) > w: lines.append(cur); cur = ch
        else: cur += ch
    return lines + [cur] if cur else lines

def board(idx, shots, title):
    rows = (len(shots) + COLS - 1) // COLS
    Wb = COLS * TW + (COLS + 1) * GAP; Hb = 170 + rows * (TH + CAP + GAP) + GAP
    im = Image.new('RGB', (Wb, Hb), (22, 20, 19)); d = ImageDraw.Draw(im)
    d.text((GAP + 4, 22), title, font=F(40, True), fill=(240, 228, 206))
    d.text((GAP + 4, 82), '保留原片的菜和全部工序，厨房随手拍改成暗场米其林：去掉手、手套、灶台、刻度和烧进画面的字。', font=F(22), fill=(200, 188, 168))
    d.text((GAP + 4, 116), '19 镜 · 42.7 秒 · 竖屏 1080×1920 · 90 拍/分 · 黄色数字为原片对应动作的成片时刻', font=F(20), fill=(150, 140, 125))
    for k, (t, name, a, z, cam, pic, snd) in enumerate(shots):
        r, c = divmod(k, COLS); x = GAP + c * (TW + GAP); y = 170 + r * (TH + CAP + GAP)
        p = os.path.join(SRC, f't_{t:05.2f}.jpg')
        im.paste(Image.open(p).convert('RGB').resize((TW, TH), Image.LANCZOS), (x, y))
        n = idx + k + 1
        d.rectangle([x, y, x + 58, y + 40], fill=(214, 178, 118)); d.text((x + 29, y + 20), f'{n:02d}', font=F(24, True), fill=(20, 18, 16), anchor='mm')
        cy = y + TH + 10
        d.text((x, cy), name, font=F(24, True), fill=(240, 228, 206))
        d.text((x + TW, cy + 4), f'{a:.1f}–{z:.1f}s · {z - a:.1f}s', font=F(18), fill=(214, 178, 118), anchor='ra')
        cy += 38; d.text((x, cy), cam, font=F(18), fill=(214, 178, 118)); cy += 30
        for ln in wrap(d, pic, F(18), TW)[:3]: d.text((x, cy), ln, font=F(18), fill=(225, 216, 200)); cy += 26
        for ln in wrap(d, '声音：' + snd, F(17), TW)[:2]: d.text((x, cy), ln, font=F(17), fill=(150, 140, 125)); cy += 24
    path = os.path.join(OUT, f'board_{idx // 10 + 1}.jpg'); im.save(path, quality=90); print(path, im.size)

board(0, SHOTS[:10], '巨石吐司 · 米其林二创 分镜（一）01–10')
board(10, SHOTS[10:], '巨石吐司 · 米其林二创 分镜（二）11–19')
