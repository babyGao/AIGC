# 分镜扫描：切镜头 + 运镜估计 + 主色 + 帧条，参考片与原片共用
# 用法: python -I shotscan.py <video> <outdir> [--thr 0.45] [--n 8]
import sys, json, os, math, argparse
sys.stdout.reconfigure(encoding="utf-8")
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('video'); ap.add_argument('out')
ap.add_argument('--thr', type=float, default=0.45)   # 直方图差异阈值
ap.add_argument('--n', type=int, default=8)          # 每镜帧条张数
ap.add_argument('--minlen', type=float, default=0.4)
ap.add_argument('--cuts', default='')                # 可选：外部切点文件（每行一个秒数），与自动切点合并
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
FONT = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 22)
FONT_S = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 17)

cap = cv2.VideoCapture(a.video)
fps = cap.get(cv2.CAP_PROP_FPS); N = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
frames, hists = [], []
while True:
    ok, f = cap.read()
    if not ok: break
    s = cv2.resize(f, (180, int(180 * f.shape[0] / f.shape[1])), interpolation=cv2.INTER_AREA)
    frames.append(s)
    hsv = cv2.cvtColor(s, cv2.COLOR_BGR2HSV)
    h = cv2.calcHist([hsv], [0, 1, 2], None, [16, 8, 8], [0, 180, 0, 256, 0, 256])
    hists.append(cv2.normalize(h, h).flatten())
N = len(frames)
diff = [0.0] + [cv2.compareHist(hists[i - 1], hists[i], cv2.HISTCMP_BHATTACHARYYA) for i in range(1, N)]

# 切点：差异超阈值且是局部峰，镜头不短于 minlen
cuts = [0]
for i in range(1, N):
    if diff[i] > a.thr and diff[i] >= max(diff[max(0, i - 2):i + 3]) and (i - cuts[-1]) / fps >= a.minlen:
        cuts.append(i)
if a.cuts:
    ext = [int(round(float(l.strip().lstrip('﻿')) * fps)) for l in open(a.cuts, encoding='utf-8-sig') if l.strip()]
    for e in ext:
        if all(abs(e - c) / fps >= a.minlen for c in cuts): cuts.append(e)
    cuts = sorted(cuts)
cuts.append(N)

def motion(i0, i1):
    """镜头内逐 2 帧估计相似变换，累计缩放与平移，残差抖动表示手持"""
    lk = dict(winSize=(21, 21), maxLevel=3)
    sc, tx, ty, jit = 1.0, 0.0, 0.0, []
    W = frames[0].shape[1]
    steps = list(range(i0, i1 - 2, 2))
    per = []
    for k in steps:
        g0 = cv2.cvtColor(frames[k], cv2.COLOR_BGR2GRAY); g1 = cv2.cvtColor(frames[k + 2], cv2.COLOR_BGR2GRAY)
        p0 = cv2.goodFeaturesToTrack(g0, 200, 0.01, 6)
        if p0 is None or len(p0) < 12: continue
        p1, st, _ = cv2.calcOpticalFlowPyrLK(g0, g1, p0, None, **lk)
        m = st.ravel() == 1
        if m.sum() < 10: continue
        M, inl = cv2.estimateAffinePartial2D(p0[m], p1[m], method=cv2.RANSAC, ransacReprojThreshold=1.5)
        if M is None: continue
        s = math.hypot(M[0, 0], M[1, 0])
        sc *= s; tx += M[0, 2] / W; ty += M[1, 2] / W
        per.append((s, M[0, 2] / W, M[1, 2] / W))
    if len(per) >= 4:
        arr = np.array(per)
        # 抖动 = 平移去掉滑动平均后的标准差
        k = 5
        sm = np.array([np.convolve(arr[:, j], np.ones(k) / k, mode='same') for j in (1, 2)]).T
        jitter = float(np.std(arr[:, 1:] - sm))
    else:
        jitter = 0.0
    return sc, tx, ty, jitter

def label(sc, tx, ty, jit, dur):
    z = sc ** (1 / max(dur, .1))           # 每秒缩放
    tags = []
    if sc > 1.06: tags.append(f'推近×{sc:.2f}')
    elif sc < 0.94: tags.append(f'拉远×{sc:.2f}')
    if abs(tx) > .08: tags.append(('画面左移' if tx < 0 else '画面右移') + f'{abs(tx):.2f}W')
    if abs(ty) > .08: tags.append(('画面上移' if ty < 0 else '画面下移') + f'{abs(ty):.2f}W')
    if jit > .004: tags.append(f'手持{jit*1000:.0f}')
    return '、'.join(tags) or '固定'

def palette(imgs, k=6):
    px = np.concatenate([cv2.cvtColor(im, cv2.COLOR_BGR2RGB).reshape(-1, 3) for im in imgs]).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, .5)
    _, lab, cen = cv2.kmeans(px, k, None, crit, 3, cv2.KMEANS_PP_CENTERS)
    cnt = np.bincount(lab.ravel(), minlength=k) / len(lab)
    o = np.argsort(-cnt)
    return [('#%02x%02x%02x' % tuple(int(v) for v in cen[i]), float(cnt[i])) for i in o]

def stats(imgs):
    hsv = np.concatenate([cv2.cvtColor(im, cv2.COLOR_BGR2HSV).reshape(-1, 3) for im in imgs]).astype(np.float32)
    rgb = np.concatenate([im.reshape(-1, 3) for im in imgs]).astype(np.float32)
    L = hsv[:, 2] / 255
    return dict(bright=float(L.mean()), contrast=float(L.std()), sat=float(hsv[:, 1].mean() / 255),
                warm=float((rgb[:, 2] - rgb[:, 0]).mean() / 255))   # R−B，正为暖

cap = cv2.VideoCapture(a.video)
shots = []
for si in range(len(cuts) - 1):
    i0, i1 = cuts[si], cuts[si + 1]
    dur = (i1 - i0) / fps
    sc, tx, ty, jit = motion(i0, i1)
    idx = [int(i0 + (i1 - i0 - 1) * j / max(1, a.n - 1)) for j in range(a.n)]
    pal = palette([frames[i] for i in idx[::2]])
    st = stats([frames[i] for i in idx])
    shot = dict(i=si + 1, t0=round(i0 / fps, 2), t1=round(i1 / fps, 2), dur=round(dur, 2),
                cam=label(sc, tx, ty, jit, dur), zoom=round(sc, 3), tx=round(tx, 3), ty=round(ty, 3),
                jitter=round(jit, 4), palette=pal, **{k: round(v, 3) for k, v in st.items()})
    shots.append(shot)
    # 全尺寸帧条
    tw = 200
    tiles = []
    for i in idx:
        cap.set(cv2.CAP_PROP_POS_FRAMES, i); ok, f = cap.read()
        f = cv2.cvtColor(f, cv2.COLOR_BGR2RGB)
        th = int(tw * f.shape[0] / f.shape[1])
        tiles.append((Image.fromarray(f).resize((tw, th), Image.LANCZOS), i / fps))
    th = tiles[0][0].height
    strip = Image.new('RGB', (tw * a.n + 4 * (a.n - 1), th + 62), 'white')
    for j, (im, t) in enumerate(tiles):
        x = j * (tw + 4); strip.paste(im, (x, 34))
        ImageDraw.Draw(strip).text((x + 4, 38), f'{t:.1f}s', fill='yellow', font=FONT_S, stroke_width=2, stroke_fill='black')
    d = ImageDraw.Draw(strip)
    d.text((6, 4), f"镜{si+1}  {shot['t0']:.1f}–{shot['t1']:.1f}s  ({dur:.1f}s)  运镜:{shot['cam']}  亮{st['bright']:.2f} 饱{st['sat']:.2f} 暖{st['warm']:+.2f}", fill='black', font=FONT)
    x = 0
    for hx, w in pal:
        ww = int(w * strip.width)
        d.rectangle([x, th + 36, x + ww, th + 60], fill=hx); x += ww
    strip.save(os.path.join(a.out, f'shot_{si+1:03d}.jpg'), quality=88)

json.dump(dict(video=a.video, fps=fps, frames=N, shots=shots), open(os.path.join(a.out, 'shots.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
durs = [s['dur'] for s in shots]
print(f'{len(shots)} 镜, 平均 {np.mean(durs):.2f}s, 中位 {np.median(durs):.2f}s, 总 {N/fps:.1f}s')
for s in shots:
    print(f"{s['i']:2d} {s['t0']:6.2f}-{s['t1']:6.2f} {s['dur']:5.2f}s  {s['cam']:<24} 亮{s['bright']:.2f} 饱{s['sat']:.2f} 暖{s['warm']:+.2f}  {' '.join(h for h,_ in s['palette'][:4])}")
