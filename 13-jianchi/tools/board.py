"""风格板拼版：python board.py <style> <frames_dir> <out.jpg>
每块板：抬头（风格名 + 改造要点）+ 3×4 格（造型板 + K1–K11），每格下注镜头号、时间、景别、台词。"""
import sys, json, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONT = os.path.join(ROOT, 'film', 'fonts', 'LXGWWenKai-Medium.ttf')
F = lambda s: ImageFont.truetype(FONT, s)

STYLES = {
  'woodcut': ('木刻版画', 'Woodcut Print', [
    '黑木白刀，光是刻出来的；字幕是页边的活字，拟声字直接刻进版里',
    '航海王：集中线 = U 刀放射刀痕；一页多版 = 漫画分格；夸张的咆哮脸与脚底板透视',
    '诺兰：宽银幕版面在 204.6 秒撑成竖高的 IMAX 版；前世用“木版本身”（未印的镜像）来表现',
    '唯一的色版：湛蓝，只给九转爱情仙蛊；坚持仙蛊是整块黑木被刻成白']),
  'puppet': ('皮影戏', 'Shadow Puppetry', [
    '灯透驴皮，色是透过来的；人物侧身、镂空花纹、铆钉与操纵杆；字幕在说书人牌匾上',
    '航海王：拟声字是镂空皮牌；放射镂空盘当集中线；别人“换头”成咆哮脸，方源的头从不换',
    '诺兰：四面楚歌时露出幕后——天意是一双举杆的手，只有他的杆是断的；高潮他自己成了灯',
    '台口（漆木横楣与台沿）就是 2.39:1 遮幅，炼成时推进到满幕']),
  'ink': ('中国水墨', 'Chinese Ink Wash', [
    '宣纸、五墨、留白；人物是淡墨身形加几笔含墨；字幕是写在绫裱上的题跋',
    '航海王：飞白放射笔 = 集中线；狂草写拟声字；泼墨溅点 = 冲击帧',
    '诺兰：手卷（上下绫裱）就是遮幅，卷子永远展不完 = 河没有尽头；高潮是墨被提走，纸白成光',
    '全片只破一次例：爱情仙蛊的一抹花青；朱砂只给印']),
  'spy': ('60s 间谍片头', '60s Spy Title Sequence', [
    '四色剪纸平涂（墨黑 / 骨白 / 河青 / 警示朱红），手剪毛边、纸影；字幕是左下的斜纸条',
    '航海王：放射纸条 = 集中线；剪出来的巨大拟声字；斜切网格 = 漫画分格；剪开的嘴就是表情',
    '诺兰：字即布景——群仙叫嚣的话是压过来的墙；英雄剪影站在巨大的圆里；片名“坚持”由碎片拼成',
    '剪纸黑条是 2.39:1 遮幅，204.6 秒剪掉黑条进入 IMAX']),
}

def build(style, fdir, out):
    keys = json.load(open(os.path.join(ROOT, 'data', 'keys.json')))
    name, en, notes = STYLES[style]
    TW, TH, GAP, CAP, M = 800, 450, 36, 104, 64
    cols, rows = 3, 4
    HEAD = 330
    Wd = M * 2 + cols * TW + (cols - 1) * GAP
    Hd = HEAD + rows * (TH + CAP) + (rows - 1) * 18 + M
    img = Image.new('RGB', (Wd, Hd), (24, 22, 20))
    d = ImageDraw.Draw(img)
    d.text((M, 48), f'风格板 · {name}', font=F(78), fill=(240, 232, 214))
    d.text((M + 20 + d.textlength(f'风格板 · {name}', font=F(78)), 76), en + '  × 航海王 × 诺兰', font=F(38), fill=(190, 170, 140))
    d.text((M, 146), '《坚持》 216.29 秒 · 30 帧 · 关键帧取自音频时间轴（字幕为音频校正稿）', font=F(28), fill=(170, 160, 145))
    for i, n in enumerate(notes):
        d.text((M + (i % 2) * (Wd - 2 * M) // 2, 196 + (i // 2) * 48), '· ' + n, font=F(26), fill=(222, 212, 192))
    tiles = [('M', None)] + [(k['id'], k) for k in keys]
    for i, (kid, k) in enumerate(tiles):
        c, r = i % cols, i // cols
        x, y = M + c * (TW + GAP), HEAD + r * (TH + CAP + 18)
        f = os.path.join(fdir, f'{kid}.jpg')
        im = Image.open(f).convert('RGB').resize((TW, TH), Image.LANCZOS)
        img.paste(im, (x, y))
        if k is None:
            d.text((x, y + TH + 10), 'M  造型板', font=F(30), fill=(240, 220, 160))
            d.text((x, y + TH + 50), '方源三面 + 配角阵容（按原文与资料设计）', font=F(24), fill=(200, 192, 176))
            continue
        d.text((x, y + TH + 10), f"{kid}  {k['name']}", font=F(30), fill=(240, 220, 160))
        tag = f"{k['t']:.1f}s · {k['frame']}"
        d.text((x + TW - d.textlength(tag, font=F(24)), y + TH + 14), tag, font=F(24), fill=(170, 160, 140))
        line = k.get('line') or ''
        while d.textlength(line, font=F(24)) > TW and len(line) > 4: line = line[:-2] + '…'
        d.text((x, y + TH + 52), line, font=F(24), fill=(206, 198, 182))
    img.save(out, quality=88, optimize=True)

def compare(fdirs, out, ids=('K2', 'K6', 'K7', 'K10')):
    TW, TH, M, GAP, LAB = 640, 360, 50, 20, 330
    keys = {k['id']: k for k in json.load(open(os.path.join(ROOT, 'data', 'keys.json')))}
    Wd = M * 2 + LAB + len(ids) * TW + (len(ids) - 1) * GAP
    Hd = 200 + len(fdirs) * (TH + GAP) + M
    img = Image.new('RGB', (Wd, Hd), (24, 22, 20)); d = ImageDraw.Draw(img)
    d.text((M, 40), '四种风格对比 · 同一组镜头', font=F(64), fill=(240, 232, 214))
    for j, kid in enumerate(ids):
        d.text((M + LAB + j * (TW + GAP), 140), f"{kid} {keys[kid]['name']}（{keys[kid]['t']:.0f}s）", font=F(28), fill=(240, 220, 160))
    for i, (style, fdir) in enumerate(fdirs):
        y = 200 + i * (TH + GAP)
        d.text((M, y + TH // 2 - 40), STYLES[style][0], font=F(40), fill=(240, 232, 214))
        d.text((M, y + TH // 2 + 14), STYLES[style][1], font=F(22), fill=(170, 160, 140))
        for j, kid in enumerate(ids):
            im = Image.open(os.path.join(fdir, f'{kid}.jpg')).convert('RGB').resize((TW, TH), Image.LANCZOS)
            img.paste(im, (M + LAB + j * (TW + GAP), y))
    img.save(out, quality=88, optimize=True)

if __name__ == '__main__':
    if sys.argv[1] == 'compare':
        out = sys.argv[2]; pairs = [(a.split('=')[0], a.split('=')[1]) for a in sys.argv[3:]]
        compare(pairs, out)
    else:
        build(sys.argv[1], sys.argv[2], sys.argv[3])
