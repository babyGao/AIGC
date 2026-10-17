# 米其林二创成片（真实原片）：剪辑表取帧 → 抹烧字 → 前景分割 → 暗场光池调色 → 防抖裁切缓推 → 扫光 → 文字层 → 编码
# 运行：python -I film.py [--from 秒] [--to 秒] [--stills t1,t2,..]   输出 out/regrade.mp4（或 review/regrade/ 下的样帧）
import os, sys, json, math, re, argparse, subprocess
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from look import seg, ss

ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(ROOT, '1.mp4'); CACHE = os.path.join(ROOT, 'out', 'cache'); os.makedirs(CACHE, exist_ok=True)
FPS, W, H = 30, 1080, 1920
BEAT = 60 / 90; b = lambda n: n * BEAT; DUR = b(64)
lerp = lambda a, c, t: a + (c - a) * t
eio = lambda t: 4 * t ** 3 if t < .5 else 1 - (-2 * t + 2) ** 3 / 2
clamp = lambda x, a=0., c=1.: max(a, min(c, x))
seg01 = lambda t, a, c: clamp((t - a) / (c - a))

# —— 剪辑表：名字、起止（拍）、类型、原片起点（秒）、速度、裁切起止 (cx, cy, h)、每镜参数 ——
EDL = [   # 裁切 h 接近 1 = 接近全画幅；cy 小于 h/2 时上方留暗场给文字
  ('hookA', 0, 2, 'clip', 34.15, .9, (.5, .4, .88), (.5, .38, .8), {'fadein': .3}),
  ('hookB', 2, 4, 'clip', 9.62, .9, (.52, .4, .84), (.52, .38, .76), {}),
  ('title', 4, 8, 'still', 35.45, 0, (.5, .28, 1.04), (.5, .3, .96), {'sweep': (.05, .75), 'fadeout': b(.8)}),
  ('cut', 8, 12, 'clip', 14.05, .75, (.68, .47, .66), (.66, .47, .6), {}),
  ('milk', 12, 14, 'clip', 16.55, 1., (.5, .38, 1.0), (.5, .37, .92), {'red': 1, 'ell': (.5, .31, .5, .24)}),
  ('egg', 14, 16, 'clip', 18.2, 1., (.5, .42, .96), (.5, .41, .88), {'red': 1, 'ell': (.5, .34, .5, .21)}),
  ('cinnamon', 16, 18, 'clip', 19.55, 1., (.5, .44, .94), (.5, .43, .86), {'red': 1, 'ell': (.5, .35, .5, .21)}),
  ('whisk', 18, 20, 'clip', 20.9, .8, (.5, .45, .92), (.5, .45, .85), {'red': 1, 'ell': (.5, .36, .5, .21)}),
  ('soak', 20, 24, 'clip', 22.55, .69, (.5, .46, 1.0), (.5, .44, .9), {'sat': .9}),
  ('pan', 24, 26, 'clip', 26.75, .38, (.52, .52, .9), (.52, .52, .8), {'sat': .78, 'tone': .8, 'fadein': .35}),
  ('sear', 26, 28, 'still', 28.06, 0, (.55, .55, .62), (.58, .55, .52), {'sat': .74, 'tone': .78}),
  ('flip', 28, 30, 'clip', 28.6, .5, (.58, .56, .86), (.58, .56, .8), {'sat': .76, 'tone': .78}),
  ('crust', 30, 36, 'still', 29.2, 0, (.66, .6, .5), (.7, .62, .42), {'sat': .72, 'tone': .76, 'sweep': (.15, .8), 'fadeout': b(.9)}),
  ('plate', 36, 40, 'clip', 29.4, .68, (.5, .48, .98), (.5, .47, .9), {'fadein': .25}),
  ('cream', 40, 44, 'clip', 31.25, .5, (.55, .42, .94), (.55, .43, .86), {}),
  ('jam', 44, 48, 'clip', 32.62, .5, (.55, .42, .92), (.55, .42, .84), {}),
  ('syrup', 48, 52, 'clip', 33.98, .55, (.5, .4, .92), (.5, .39, .84), {}),
  ('fork', 52, 58, 'clip', 37.47, .45, (.58, .44, .8), (.57, .45, .72), {}),
  ('final', 58, 64, 'still', 39.75, 0, (.5, .32, .84), (.5, .28, 1.04), {'sweep': (.15, .6), 'fadeout': b(2)}),
]
SLOTS = [dict(name=e[0], t0=b(e[1]), t1=b(e[2]), kind=e[3], src0=e[4], speed=e[5], c0=e[6], c1=e[7], o=e[8]) for e in EDL]
def slot_at(t):
    for s in SLOTS:
        if t < s['t1']: return s
    return SLOTS[-1]

# —— 原片帧：解码一次，抹掉烧字后缓存 ——
cap = cv2.VideoCapture(SRC); SFPS = cap.get(cv2.CAP_PROP_FPS); NF = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
TEXT_WIN = [  # (起, 止, x0, y0, x1, y1) 原片秒数与相对坐标
  (0, 99, .04, .755, .96, .835),           # 底部字幕
  (13.9, 22.0, .48, .49, .98, .64),        # 工序标签（右侧中部）
  (31.1, 35.6, .05, .07, .5, .2),          # 酱名（左上）
]
def detext(f, ts):
    h, w = f.shape[:2]; mask = np.zeros((h, w), np.uint8)
    v = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)[..., 2]
    th = cv2.morphologyEx(v, cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    for a, z, x0, y0, x1, y1 in TEXT_WIN:
        if not (a <= ts <= z): continue
        X0, Y0, X1, Y1 = int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)
        m = ((th[Y0:Y1, X0:X1] > 38) & (v[Y0:Y1, X0:X1] > 150)).astype(np.uint8) * 255
        mask[Y0:Y1, X0:X1] = cv2.dilate(m, np.ones((7, 7), np.uint8))
    return cv2.inpaint(f, mask, 6, cv2.INPAINT_TELEA) if mask.any() else f
_fr = {}
def src_frame(i):
    i = int(max(0, min(NF - 1, i)))
    if i in _fr: return _fr[i]
    p = os.path.join(CACHE, f'f_{i:05d}.jpg')
    if os.path.exists(p): f = cv2.imread(p)
    else:
        cap.set(cv2.CAP_PROP_POS_FRAMES, i); ok, f = cap.read()
        f = detext(f, i / SFPS); cv2.imwrite(p, f, [cv2.IMWRITE_JPEG_QUALITY, 96])
    if len(_fr) > 60: _fr.pop(next(iter(_fr)))
    _fr[i] = f; return f
_mk = {}
def src_mask(i):
    i = int(max(0, min(NF - 1, i)))
    if i in _mk: return _mk[i]
    p = os.path.join(CACHE, f'm_{i:05d}.png')
    if os.path.exists(p): m = cv2.imread(p, 0).astype(np.float32) / 255.
    else:
        m = seg(src_frame(i)); cv2.imwrite(p, (m * 255).astype(np.uint8))
    if len(_mk) > 60: _mk.pop(next(iter(_mk)))
    _mk[i] = m; return m
def smooth_mask(i, lo, hi):   # 时间上 ±2 帧平均，防闪
    ks = [k for k in range(i - 2, i + 3) if lo <= k <= hi]
    return sum(src_mask(k) for k in ks) / len(ks)

# —— 防抖：镜头内估计逐帧平移，平滑后反向补偿 ——
_stab = {}
def stab_path(s):
    key = s['name']
    if key in _stab: return _stab[key]
    i0 = int(s['src0'] * SFPS); i1 = int((s['src0'] + (s['t1'] - s['t0']) * s['speed']) * SFPS) + 2
    path = [np.zeros(2)]; prev = cv2.cvtColor(cv2.resize(src_frame(i0), (360, 640)), cv2.COLOR_BGR2GRAY)
    for i in range(i0 + 1, i1 + 1):
        cur = cv2.cvtColor(cv2.resize(src_frame(i), (360, 640)), cv2.COLOR_BGR2GRAY)
        p0 = cv2.goodFeaturesToTrack(prev, 300, .01, 7); d = np.zeros(2)
        if p0 is not None and len(p0) > 20:
            p1, st, _ = cv2.calcOpticalFlowPyrLK(prev, cur, p0, None, winSize=(21, 21), maxLevel=3)
            ok = st.ravel() == 1
            if ok.sum() > 15:
                M, _ = cv2.estimateAffinePartial2D(p0[ok], p1[ok], method=cv2.RANSAC, ransacReprojThreshold=1.5)
                if M is not None: d = M[:, 2] * 2.0     # 换算回原片像素
        path.append(path[-1] + d); prev = cur
    P = np.array(path); k = np.exp(-np.arange(-15, 16) ** 2 / (2 * 7. ** 2)); k /= k.sum()
    sm = np.stack([np.convolve(np.pad(P[:, j], 15, mode='edge'), k, mode='valid') for j in range(2)], 1)
    _stab[key] = (i0, sm - P); return _stab[key]

# —— 调色：前景提质感、背景按"光池"压暗、黑手套沉入暗部 ——
def grade(img, m, o):
    f = img.astype(np.float32) / 255.
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    Hh, S, Vv = hsv[..., 0], hsv[..., 1] / 255., hsv[..., 2] / 255.
    if o.get('red'):   # 量杯红刻度：红色像素整片修补掉
        red = ((((Hh < 9) | (Hh > 160)) & (S > .22) & (Vv > .3)) | ((Hh < 12) & (S > .55) & (Vv > .3) & (Vv < .85))).astype(np.uint8) * 255
        red = cv2.GaussianBlur(cv2.dilate(red, np.ones((5, 5), np.uint8)).astype(np.float32) / 255., (0, 0), 1.5)[..., None]
        keep = 1 - red; f0 = img.astype(np.float32) / 255.
        fill = cv2.GaussianBlur(f0 * keep, (0, 0), 9) / np.maximum(cv2.GaussianBlur(keep, (0, 0), 9)[..., None], 1e-3)
        f = f0 * keep + fill * red; img = (f * 255).astype(np.uint8)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32); Hh, S, Vv = hsv[..., 0], hsv[..., 1] / 255., hsv[..., 2] / 255.
    glove = cv2.GaussianBlur((1 - ss(.1, .24, S)) * (1 - ss(.24, .52, Vv)), (0, 0), 2.5)
    if 'ell' in o:
        h_, w_ = img.shape[:2]; ex, ey, rx, ry = o['ell']; yy, xx = np.mgrid[0:h_, 0:w_]
        r = (np.abs(xx / w_ - ex) / rx) ** 3 + (np.abs(yy / h_ - ey) / ry) ** 3
        m = (1 - ss(.7, 1.15, r)).astype(np.float32); glove = glove * 0
    mm = cv2.GaussianBlur(ss(.2, .62, m) * (1 - glove), (0, 0), 4)
    # 光池：离主体越近，背景越亮（盘沿、木座隐约可见），远处沉黑
    pool = cv2.GaussianBlur(mm, (0, 0), 55); pool = pool / max(1e-3, pool.max())
    lum = f.mean(2, keepdims=True)
    bg = (f * .45 + lum * .55) * (.05 + .42 * pool[..., None] ** .9) * np.array([.86, .94, 1.05])
    bg = cv2.GaussianBlur(bg, (0, 0), 3)
    fg = f.copy()
    loc = cv2.GaussianBlur(fg, (0, 0), 16); fg = np.clip(fg + (fg - loc) * o.get('clarity', .32 if 'tone' not in o else .18), 0, 1)
    fg = fg ** o.get('gamma', 1.06 if 'tone' not in o else 1.16)
    fg = fg * fg * (3 - 2 * fg) * .45 + fg * .55
    g = fg.mean(2, keepdims=True); fg = np.clip(g + (fg - g) * o.get('sat', 1.04), 0, 1)
    fg *= np.array([.95, .995, 1.035])
    out = bg * (1 - mm[..., None]) + fg * mm[..., None]
    out *= (1 - glove)[..., None]
    out = out * o.get('tone', 1.)
    k = .62; out = np.where(out > k, k + (out - k) / (1 + (out - k) * 2.2), out)
    hi = np.clip(out - .78, 0, 1); out = out + cv2.GaussianBlur(hi, (0, 0), 12) * .25
    return np.clip(out, 0, 1), mm

def crop_scale(img01, box, off=(0, 0)):
    ih, iw = img01.shape[:2]; cx, cy, h = box
    ch = h * ih; cw = ch * W / H
    x0 = cx * iw - cw / 2 + off[0]; y0 = cy * ih - ch / 2 + off[1]
    M = np.array([[W / cw, 0, -x0 * W / cw], [0, H / ch, -y0 * H / ch]], np.float32)
    out = cv2.warpAffine(img01, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
    bl = cv2.GaussianBlur(out, (0, 0), 1.3); return np.clip(out * 1.5 - bl * .5, 0, 1), (x0, y0, cw, ch)

def vignette():
    yy, xx = np.mgrid[0:H, 0:W]; d = np.sqrt(((xx / W - .5) * 1.0) ** 2 + ((yy / H - .46) * .6) ** 2)
    return (1 - .5 * ss(.2, .7, d))[..., None].astype(np.float32)
VIG = vignette()

# —— 文字层（与原 overlay.js 同一设计）——
FD = os.path.join(ROOT, 'fonts')
F_SERIF = lambda s: ImageFont.truetype(os.path.join(FD, 'serifsc-500.ttf'), int(s))
F_LAT = lambda s, w=300: ImageFont.truetype(os.path.join(FD, f'cormorant-{w}.ttf'), int(s))
CREAM, GOLD = (245, 236, 222), (214, 178, 118)
CUES = json.load(open(os.path.join(ROOT, 'out', 'cues.json'), encoding='utf-8'))
TITLES = [(2.7, b(8)), (39.5, b(64) - .1)]
LABELS = [(b(12) + .25, b(20) + .3, '牛奶', '100 ml', 0, 0), (b(14) + .25, b(20) + .3, '鸡蛋', '× 2', 1, 0), (b(16) + .25, b(20) + .3, '肉桂粉', '1 勺', 2, 0),
          (b(40) + .15, b(44) + .3, '花生奶油酱', 'PEANUT CREAM', 0, 1), (b(44) + .3, b(48) + .3, '蓝莓果酱', 'BLUEBERRY', 0, 1), (b(48) + .3, b(52) - .05, '枫糖浆', 'MAPLE', 0, 1)]
fS, fT, fK, fE, fL, fLs = F_SERIF(42), F_SERIF(116), F_LAT(30), F_LAT(46), F_SERIF(46), F_LAT(30, 500)
def spaced(d, txt, x, y, font, sp, fill, align='center', shadow=True):
    ws = [d.textlength(c, font=font) for c in txt]; tot = sum(ws) + sp * (len(ws) - 1)
    cx = x - tot / 2 if align == 'center' else x - tot if align == 'right' else x
    for i, c in enumerate(txt):
        if shadow: d.text((cx + 2, y + 3), c, font=font, fill=(0, 0, 0, int(fill[3] * .55)), anchor='ls')
        d.text((cx, y), c, font=font, fill=fill, anchor='ls'); cx += ws[i] + sp
    return tot
def eo(t): t = clamp(t); return 1 - (1 - t) ** 3
def overlay(t):
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L); sc = None
    for t0, t1 in TITLES:
        k = seg01(t, t0, t0 + 1.0); out = 1 - seg01(t, t1 - .45, t1)
        if k <= 0 or out <= 0: continue
        y = H * .2; a = lambda v: int(255 * clamp(v))
        spaced(d, 'FRENCH TOAST', W / 2, y - 120, fK, 10, GOLD + (a(.9 * eo(seg01(k, 0, .5)) * out),))
        chars = '巨石吐司'; ws = [d.textlength(c, font=fT) for c in chars]; tot = sum(ws) + 90; x = W / 2 - tot / 2
        for i, c in enumerate(chars):
            al = eo(seg01(k, .1 + i * .12, .45 + i * .12)); yy = y + (1 - al) * 10
            d.text((x + 2, yy + 3), c, font=fT, fill=(0, 0, 0, a(.5 * al * out)), anchor='ls')
            d.text((x, yy), c, font=fT, fill=CREAM + (a(al * out),), anchor='ls')
            gl = max(0, 1 - abs(k * 1.4 - .2 - i * .18) * 6)
            if gl > 0: d.text((x, yy), c, font=fT, fill=(255, 246, 225, a(gl * .8 * out)), anchor='ls')
            x += ws[i] + 30
        lw = tot * .55 * eo(seg01(k, .35, .8)); d.rectangle([W / 2 - lw / 2, y + 40, W / 2 + lw / 2, y + 41.5], fill=GOLD + (a(.85 * out),))
        spaced(d, 'ROCK TOAST', W / 2, y + 104, fE, 16, GOLD + (a(eo(seg01(k, .45, .9)) * out),))
    for t0, t1, name, sub, row, right in LABELS:
        if not (t0 <= t <= t1): continue
        al = eo(seg01(t, t0, t0 + .4)) * (1 - seg01(t, t1 - .3, t1)); A = int(255 * al)
        x = W - 84 if right else 84; y = 250 if right else 230 + row * 128; dx = (1 - al) * 18 * (1 if right else -1)
        d.rectangle([x - 46 + dx if right else x + dx, y - 62, x + dx if right else x + 46 + dx, y - 60.5], fill=GOLD + (A,))
        spaced(d, name, x + dx, y, fL, 6, CREAM + (A,), 'right' if right else 'left')
        spaced(d, sub, x + dx, y + 44, fLs, 5, GOLD + (A,), 'right' if right else 'left')
    for c in CUES:
        if c['t0'] <= t < c['t1']:
            al = min(1, (t - c['t0']) / .15, (c['t1'] - t) / .15)
            sc = al
            spaced(d, c['text'], W / 2, H * .9, fS, 3, CREAM + (int(240 * al),))
    return L, sc

def render(t):
    s = slot_at(t); u = seg01(t, s['t0'], s['t1']); o = s['o']
    box = tuple(lerp(a, c, eio(u)) for a, c in zip(s['c0'], s['c1']))
    if s['kind'] == 'still':
        i = int(round(s['src0'] * SFPS)); img = src_frame(i); m = smooth_mask(i, i - 2, i + 2); off = (0, 0)
    else:
        fi = (s['src0'] + (t - s['t0']) * s['speed']) * SFPS; i = int(fi); fr = fi - i
        i0 = int(s['src0'] * SFPS); i1 = int((s['src0'] + (s['t1'] - s['t0']) * s['speed']) * SFPS) + 1
        a, c = src_frame(i), src_frame(i + 1)
        img = cv2.addWeighted(a, 1 - fr, c, fr, 0) if fr > .02 else a
        m = smooth_mask(i, i0, i1) * (1 - fr) + smooth_mask(i + 1, i0, i1) * fr
        st0, corr = stab_path(s); k = min(len(corr) - 1, max(0, i - st0)); off = tuple(corr[k])
    g, mm = grade(img, m, o)
    out, (x0, y0, cw, ch) = crop_scale(g, box, off)
    if 'sweep' in o:   # 扫光：一条斜光带扫过食物
        a, z = o['sweep']; p = seg01(u, a, z)
        if 0 < p < 1:
            mloc = cv2.warpAffine(mm, np.array([[W / cw, 0, -x0 * W / cw], [0, H / ch, -y0 * H / ch]], np.float32), (W, H))
            yy, xx = np.mgrid[0:H, 0:W]; pos = lerp(-.4, 1.4, p)
            band = np.exp(-(((xx / W) * .8 + (yy / H) * .45 - pos) / .07) ** 2) * math.sin(math.pi * p)
            out = np.clip(out + (band * mloc)[..., None] * (out * .55 + .06), 0, 1)
    out = out * VIG
    fade = 1.
    if 'fadein' in o: fade *= seg01(t - s['t0'], 0, o['fadein'])
    if 'fadeout' in o: fade *= 1 - seg01(t, s['t1'] - o['fadeout'], s['t1'])
    out = out * fade
    img8 = (out * 255).astype(np.uint8)
    L, sc = overlay(t)
    if sc:   # 字幕底衬
        gr = np.clip((np.arange(H) / H - .78) / .1, 0, 1)[:, None, None] * .55 * sc
        img8 = (img8 * (1 - gr)).astype(np.uint8)
    pil = Image.fromarray(cv2.cvtColor(img8, cv2.COLOR_BGR2RGB))
    pil = Image.alpha_composite(pil.convert('RGBA'), L).convert('RGB')
    return cv2.cvtColor(np.asarray(pil), cv2.COLOR_RGB2BGR)

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--stills', default=''); ap.add_argument('--out', default=os.path.join(ROOT, 'out', 'regrade.mp4'))
    a = ap.parse_args()
    if a.stills:
        od = os.path.join(ROOT, 'review', 'regrade'); os.makedirs(od, exist_ok=True)
        for t in map(float, a.stills.split(',')):
            cv2.imwrite(os.path.join(od, f't_{t:05.2f}.jpg'), render(t), [cv2.IMWRITE_JPEG_QUALITY, 90]); print('still', t, flush=True)
        sys.exit()
    N = int(round(DUR * FPS))
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', a.out], stdin=subprocess.PIPE)
    for n in range(N):
        ff.stdin.write(render(n / FPS).tobytes())
        if n % 60 == 0: print(f'{n}/{N}', flush=True)
    ff.stdin.close(); ff.wait(); print('done', a.out)
