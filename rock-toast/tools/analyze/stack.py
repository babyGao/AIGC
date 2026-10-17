# 把帧条按 k 张一组竖向拼接（按镜号数字排序）
import sys, glob, os, re
from PIL import Image
src, k = sys.argv[1], int(sys.argv[2])
fs = sorted(glob.glob(os.path.join(src, 'shot_*.jpg')), key=lambda f: int(re.findall(r'\d+', os.path.basename(f))[0]))
for g in range(0, len(fs), k):
    ims = [Image.open(f) for f in fs[g:g + k]]
    W = max(i.width for i in ims); H = sum(i.height for i in ims) + 10 * (len(ims) - 1)
    out = Image.new('RGB', (W, H), (40, 40, 40)); y = 0
    for i in ims: out.paste(i, (0, y)); y += i.height + 10
    out.save(os.path.join(src, f'stack_{g // k + 1:02d}.jpg'), quality=85)
print(len(fs), 'strips')
