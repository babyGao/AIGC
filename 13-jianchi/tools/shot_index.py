# 素材视频镜头切分：每个镜头取中间一帧，拼成带时间码的索引页 → sucai/shots/
import cv2, json, sys, os, numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(ROOT, 'sucai/videos'); O = os.path.join(ROOT, 'sucai/shots')
os.makedirs(O, exist_ok=True)
font = ImageFont.truetype(os.path.join(ROOT, 'assets/fonts/LXGWWenKai-Medium.ttf'), 20)

def index(vid):
    cap = cv2.VideoCapture(os.path.join(V, vid + '.mp4'))
    fps = cap.get(cv2.CAP_PROP_FPS); n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    step = 5; prev = None; cuts = [0.0]; i = 0
    while True:
        ok = cap.grab()
        if not ok: break
        if i % step == 0:
            _, f = cap.retrieve()
            s = cv2.resize(f, (64, 36)); h = cv2.calcHist([cv2.cvtColor(s, cv2.COLOR_BGR2HSV)], [0, 1, 2], None, [8, 4, 4], [0, 180, 0, 256, 0, 256]).flatten()
            h /= h.sum() + 1e-9
            if prev is not None:
                d = 0.5 * np.abs(h - prev).sum() + np.abs(s.astype(float) - ps).mean() / 255
                if d > 0.45 and i / fps - cuts[-1] > 0.6: cuts.append(i / fps)
            prev, ps = h, s.astype(float)
        i += 1
    dur = i / fps; cuts.append(dur)
    shots = [(cuts[k], cuts[k + 1]) for k in range(len(cuts) - 1) if cuts[k + 1] - cuts[k] > 0.5]
    thumbs = []
    for a, b in shots:
        cap.set(cv2.CAP_PROP_POS_MSEC, (a + b) / 2 * 1000); ok, f = cap.read()
        if not ok: continue
        im = Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB)); im.thumbnail((320, 320))
        d = ImageDraw.Draw(im); lab = f'{a:.1f}-{b:.1f}'
        d.rectangle([0, 0, 130, 24], fill=(0, 0, 0)); d.text((3, 1), lab, font=font, fill=(255, 220, 0))
        thumbs.append(im)
    json.dump(shots, open(os.path.join(O, vid + '.json'), 'w'))
    per = 36
    for p in range(0, len(thumbs), per):
        ts = thumbs[p:p + per]; tw, th = ts[0].size; cols = 6; rows = (len(ts) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * tw, rows * th), (20, 20, 20))
        for k, t in enumerate(ts): sheet.paste(t, ((k % cols) * tw, (k // cols) * th))
        sheet.save(os.path.join(O, f'{vid}_{p // per:02d}.jpg'), quality=85)
    print(vid, len(shots), 'shots', f'{dur:.0f}s')

for v in sys.argv[1:]: index(v)
