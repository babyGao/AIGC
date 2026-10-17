# 把若干张图拼成一页（看样张用）：python3 tools/sheet.py out.jpg a.jpg b.jpg ...
import sys
from PIL import Image
fs = sys.argv[2:]; ims = [Image.open(f) for f in fs]
tw = 960; ims = [i.resize((tw, int(i.height * tw / i.width))) for i in ims]
cols = 2; rows = (len(ims) + 1) // 2; th = ims[0].height
s = Image.new('RGB', (cols * tw, rows * th), (40, 40, 40))
for k, i in enumerate(ims): s.paste(i, ((k % cols) * tw, (k // cols) * th))
s.save(sys.argv[1], quality=88)
