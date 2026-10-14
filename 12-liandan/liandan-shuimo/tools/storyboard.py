"""分镜故事板：把九张关键镜头拼成一张，每格下方写镜头号、景别运动、时长与旁白。
用法：python tools/storyboard.py   （先渲好 storyboard/frames/01.jpg … 09.jpg）"""
import os
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(HERE, 'fonts', 'LXGWWenKai-Medium.ttf')
SHOTS = [
    ('钩子', '中景 · 锁定微推 · 0–6 秒', '二百小点对一滴浓墨；绕着这一丸写出"丹"字。片尾甩回此画面，落下三丸。', '市面上的一瓶，二百粒。古人服丸，一次只一丸。'),
    ('壹 选材', '全景 · 手卷左移后锁定 · 6–13.5 秒', '三罐依次倾倒成堆：阳为枯笔，阴为湿墨，和为圆笔。', '抚松的参，岷县的当归，温县的山药。廿一味，分三路。'),
    ('贰 研末', '中景 · 跟一笔飞白快速左移 · 13.5–17.5 秒', '铁碾往复，细罗筛下粉雨。全片第一次加速。', '烘透，碾细，过一百目的罗。'),
    ('叁 炼蜜', '中景锁定 → 硬切蜜面特写 → 静场 · 17.5–23 秒', '墨圈由疏而大变密而细；全场静默后离火。朱红第一次出现。', '白蜜慢熬，泡由粗转细。……离火。'),
    ('肆 和药', '近景 · 锁定 · 23–29 秒', '墨手拍三下，药团一拍深一层：由亮转哑，由浅入深，现出细孔。', '粉入蜜。一拍融一层：由亮转哑，由浅入深。'),
    ('伍 成丸', '中景缓移 → 硬切一丸特写 · 29–33 秒', '一笔一丸；油笔扫过，逐颗由哑转亮。', '搓圆，过一层油，乌亮如漆。'),
    ('陆 出丹', '仰视 · 慢推 · 33–38.5 秒', '鼎自雾中现，静默，启盖，一丸升起。', '久虚的人，风一吹就倒。古人为此，立这一丸。'),
    ('五行（招牌镜头）', '锁定长镜 · 38.5–49 秒', '先是一个漏的圆；再落中心为土，一笔左升、过顶、右降、归底，合拢即丸。', '土居中为枢。木从左升，金自右降，水在下藏。一气周流，这才是一丸。'),
    ('所宜 → 收束', '高机位远景 · 49–55 秒；55–60 秒回到镜头一', '百丸之路走到雪晨，服下今日一丸，腹中一点暖。', '一日一丸，百日为期。先甜，后苦，再暖。……好药，不怕慢。'),
]
W, IH, CH, PAD, COLS = 900, 506, 196, 28, 3
rows = (len(SHOTS) + COLS - 1) // COLS
S = Image.new('RGB', (COLS * (W + PAD) + PAD, rows * (IH + CH) + PAD), (242, 236, 222))
d = ImageDraw.Draw(S)
f1, f2, f3 = ImageFont.truetype(FONT, 34), ImageFont.truetype(FONT, 22), ImageFont.truetype(FONT, 25)
def wrap(text, font, width):
    out, cur = [], ''
    for ch in text:
        if d.textlength(cur + ch, font=font) > width: out.append(cur); cur = ch
        else: cur += ch
    return out + [cur]
for k, (name, meta, what, line) in enumerate(SHOTS):
    x, y = PAD + (k % COLS) * (W + PAD), PAD + (k // COLS) * (IH + CH)
    im = Image.open(os.path.join(HERE, 'storyboard', 'frames', f'{k + 1:02d}.jpg')).convert('RGB').resize((W, IH), Image.LANCZOS)
    S.paste(im, (x, y)); d.rectangle([x, y, x + W - 1, y + IH - 1], outline=(60, 56, 50), width=2)
    ty = y + IH + 12
    d.rectangle([x, ty + 8, x + 12, ty + 20], fill=(176, 46, 34))
    d.text((x + 24, ty - 8), f'{k + 1}  {name}', font=f1, fill=(28, 26, 24)); d.text((x + 24 + d.textlength(f'{k + 1}  {name}', font=f1) + 18, ty + 2), meta, font=f2, fill=(120, 112, 100))
    ty += 44
    for ln in wrap(what, f3, W - 8): d.text((x, ty), ln, font=f3, fill=(60, 56, 50)); ty += 32
    for ln in wrap('旁白：' + line, f3, W - 8): d.text((x, ty), ln, font=f3, fill=(110, 60, 50)); ty += 32
out = os.path.join(HERE, 'storyboard', 'storyboard.jpg'); S.save(out, quality=90); print(out, S.size)
