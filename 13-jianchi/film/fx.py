# 航海王 / 一拳超人式效果：集中线、平行速度线、音浪环、黑色闪电、光爆、粒子、拟声字、字幕
import cv2, numpy as np, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_SFX = os.path.join(ROOT, 'assets/fonts/MaShanZheng-Regular.ttf')
FONT_SUB = os.path.join(ROOT, 'assets/fonts/LXGWWenKai-Medium.ttf')
_fonts = {}
def font(path, size):
    k = (path, size)
    if k not in _fonts: _fonts[k] = ImageFont.truetype(path, size)
    return _fonts[k]

def rng(seed): return np.random.default_rng(seed)

# ---------- 线（作用在 ink 上：float32, 1=白, 0=黑） ----------
def radial_lines(ink, cx, cy, rx, ry, n=170, seed=0, width=1.0, color=0.0, length=1.0):
    """集中线：从画面外缘指向 (cx,cy)，止于椭圆 rx,ry（像素）。"""
    h, w = ink.shape
    m = np.zeros((h, w), np.uint8)
    r = rng(seed); R = np.hypot(w, h)
    angs = np.sort(r.uniform(0, 2 * np.pi, n))
    for a in angs:
        jitter = r.uniform(0.9, 1.6)
        ex, ey = cx + np.cos(a) * rx * jitter, cy + np.sin(a) * ry * jitter
        if length < 1.0:
            ex, ey = cx + np.cos(a) * (rx * jitter + (R - rx * jitter) * (1 - length)), cy + np.sin(a) * (ry * jitter + (R - ry * jitter) * (1 - length))
        da = r.uniform(0.002, 0.011) * width
        ox1, oy1 = cx + np.cos(a - da) * R, cy + np.sin(a - da) * R
        ox2, oy2 = cx + np.cos(a + da) * R, cy + np.sin(a + da) * R
        cv2.fillPoly(m, [np.array([[ox1, oy1], [ox2, oy2], [ex, ey]], np.int32)], 255, cv2.LINE_AA)
    a = m.astype(np.float32) / 255
    return ink * (1 - a) + color * a

def parallel_lines(ink, angle_deg, n=90, seed=0, band=None, color=0.0):
    """平行速度线（横冲、急流）。"""
    h, w = ink.shape
    m = np.zeros((h, w), np.uint8); r = rng(seed)
    a = np.deg2rad(angle_deg); dx, dy = np.cos(a), np.sin(a); nx, ny = -dy, dx
    L = np.hypot(w, h)
    for _ in range(n):
        off = r.uniform(-L / 2, L / 2)
        if band is not None and not (band[0] * h < h / 2 + off * ny < band[1] * h): continue
        c = r.uniform(-L / 2, L / 2); ln = r.uniform(0.15, 0.6) * L; th = r.uniform(1, 6)
        px, py = w / 2 + nx * off + dx * c, h / 2 + ny * off + dy * c
        p1 = (px - dx * ln / 2, py - dy * ln / 2); p2 = (px + dx * ln / 2, py + dy * ln / 2)
        pts = np.array([[p1[0] + nx * 0.3, p1[1] + ny * 0.3], [px + nx * th, py + ny * th], [p2[0], p2[1]], [px - nx * th, py - ny * th]], np.int32)
        cv2.fillPoly(m, [pts], 255, cv2.LINE_AA)
    al = m.astype(np.float32) / 255
    return ink * (1 - al) + color * al

def gloom_lines(ink, depth=0.45, n=110, seed=0):
    """漫画里的“阴云竖线”（失神、震惊）：从画面顶端垂下的细竖线。"""
    h, w = ink.shape
    m = np.zeros((h, w), np.uint8); r = rng(seed)
    for _ in range(n):
        x = r.uniform(0, w); ln = r.uniform(0.3, 1.0) * depth * h
        cv2.line(m, (int(x), 0), (int(x + r.uniform(-4, 4)), int(ln)), 255, int(r.integers(1, 3)), cv2.LINE_AA)
    al = m.astype(np.float32) / 255
    return ink * (1 - al)

def rings(ink, cx, cy, u, n=4, rmax=1.4, seed=0, thick=10):
    """音浪：从 (cx,cy) 向外扩的锯齿环，u=0..1 为进度。"""
    h, w = ink.shape
    m = np.zeros((h, w), np.uint8); r = rng(seed)
    R = np.hypot(w, h) * rmax
    for k in range(n):
        p = (u + k / n) % 1.0
        rad = 40 + p * R
        k_ = 64
        ang = np.linspace(0, 2 * np.pi, k_, endpoint=False)
        jag = rad * (1 + r.uniform(-0.05, 0.05, k_))
        pts = np.stack([cx + np.cos(ang) * jag, cy + np.sin(ang) * jag * 0.62], 1).astype(np.int32)
        cv2.polylines(m, [pts], True, 255, max(2, int(thick * (1 - p) + 2)), cv2.LINE_AA)
    al = m.astype(np.float32) / 255
    # 黑线白边：音浪是粗黑锯齿线，外面衬一圈白，压在任何底上都看得见
    dil = cv2.dilate(al, np.ones((9, 9), np.uint8))
    out = np.maximum(ink, dil)
    return out * (1 - al)

def lightning(ink, mask, n=7, seed=0, reach=0.25, thick=7):
    """霸王色式黑色闪电：从人物轮廓往外劈出的折线（黑芯白边）。"""
    h, w = ink.shape; r = rng(seed)
    edge = cv2.Canny((mask > 0.5).astype(np.uint8) * 255, 50, 150)
    ys, xs = np.nonzero(edge)
    if len(xs) == 0: return ink
    cy0, cx0 = ys.mean(), xs.mean()
    m = np.zeros((h, w), np.uint8)
    for _ in range(n):
        i = r.integers(len(xs)); x, y = float(xs[i]), float(ys[i])
        ang = np.arctan2(y - cy0, x - cx0) + r.uniform(-0.5, 0.5)
        pts = [(x, y)]; L = reach * h
        for s in range(9):
            ang += r.uniform(-0.9, 0.9); step = L / 9 * r.uniform(0.6, 1.4)
            x += np.cos(ang) * step; y += np.sin(ang) * step; pts.append((x, y))
            if r.random() < 0.3:  # 分叉
                bx, by = x, y; ba = ang + r.choice([-1, 1]) * r.uniform(0.6, 1.2)
                bp = [(bx, by)]
                for _ in range(3): bx += np.cos(ba) * step * 0.7; by += np.sin(ba) * step * 0.7; ba += r.uniform(-0.8, 0.8); bp.append((bx, by))
                cv2.polylines(m, [np.array(bp, np.int32)], False, 255, max(2, thick // 2), cv2.LINE_AA)
        cv2.polylines(m, [np.array(pts, np.int32)], False, 255, thick, cv2.LINE_AA)
    al = m.astype(np.float32) / 255
    halo = cv2.dilate(al, np.ones((9, 9), np.uint8))
    out = np.maximum(ink, halo)          # 白边
    return out * (1 - al)                # 黑芯

def particles(ink, u, n=160, seed=0, area=(0.2, 0.2, 0.8, 0.9), rise=0.35, size=(3, 10)):
    """鸿运消散：带黑边的白色光点往上飘。"""
    h, w = ink.shape; r = rng(seed); out = ink.copy()
    for _ in range(n):
        x0 = r.uniform(area[0], area[2]) * w; y0 = r.uniform(area[1], area[3]) * h
        ph = r.uniform(0, 1); p = (u * r.uniform(0.6, 1.4) + ph) % 1.0
        x = x0 + np.sin(p * 6 + ph * 9) * 20; y = y0 - p * rise * h
        s = int(r.uniform(*size) * (1 - p * 0.7))
        if s < 1: continue
        cv2.circle(out, (int(x), int(y)), s + 2, 0.0, -1, cv2.LINE_AA)
        cv2.circle(out, (int(x), int(y)), s, 1.0, -1, cv2.LINE_AA)
    return out

def ripples(ink, cx, cy, u, n=3, rmax=0.35):
    h, w = ink.shape; out = ink.copy()
    for k in range(n):
        p = (u + k / n) % 1.0; rx = int(20 + p * rmax * w); ry = int(rx * 0.22)
        cv2.ellipse(out, (int(cx), int(cy)), (rx, ry), 0, 0, 360, 1.0, max(2, int(12 * (1 - p))), cv2.LINE_AA)
        cv2.ellipse(out, (int(cx), int(cy)), (rx, ry), 0, 0, 360, float(p * 0.6), max(1, int(5 * (1 - p))), cv2.LINE_AA)
    return out

def zoom_blur(img, cx, cy, amt=0.08, k=6):
    """急推的径向模糊。"""
    h, w = img.shape[:2]; acc = img.astype(np.float32).copy()
    for i in range(1, k):
        s = 1 + amt * i / k
        M = np.float32([[s, 0, cx * (1 - s)], [0, s, cy * (1 - s)]])
        acc += cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    return (acc / k).astype(img.dtype)

def h_blur(img, k):
    k = max(1, int(k)) | 1
    return cv2.blur(img, (k, 1))

# ---------- 光（作用在 BGR 上） ----------
def light_burst(bgr, cx, cy, u, rays=48, seed=0, power=1.0):
    """光芒骤放：放射白光 + 泛光。u 0..1 强度。"""
    h, w = bgr.shape[:2]; r = rng(seed)
    m = np.zeros((h, w), np.uint8); R = np.hypot(w, h)
    for a in np.linspace(0, 2 * np.pi, rays, endpoint=False) + r.uniform(0, 0.1, rays):
        da = r.uniform(0.01, 0.04)
        cv2.fillPoly(m, [np.array([[cx, cy], [cx + np.cos(a - da) * R, cy + np.sin(a - da) * R], [cx + np.cos(a + da) * R, cy + np.sin(a + da) * R]], np.int32)], 255, cv2.LINE_AA)
    rays_ = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 6)
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.hypot((x - cx) / w, (y - cy) / h)
    glow = np.exp(-d * d / (0.02 + 0.25 * u))
    a = np.clip((rays_ * 0.6 + glow) * u * power, 0, 1)[..., None]
    out = bgr.astype(np.float32) * (1 - a) + 255 * a
    return out.clip(0, 255).astype(np.uint8)

def white(bgr, a):
    return (bgr.astype(np.float32) * (1 - a) + 250 * a).astype(np.uint8)

def black(bgr, a):
    return (bgr.astype(np.float32) * (1 - a)).astype(np.uint8)

# ---------- 字 ----------
_sfx_cache = {}
def sfx_img(text, size, fill=(10, 10, 12), stroke=(250, 250, 250), sw=None, vertical=False):
    k = (text, size, fill, stroke, sw, vertical)
    if k in _sfx_cache: return _sfx_cache[k]
    f = font(FONT_SFX, size); sw = sw or max(6, size // 9)
    chars = list(text)
    if vertical:
        W = int(size * 1.3) + sw * 4; H = int(size * 1.05 * len(chars)) + sw * 4
    else:
        W = int(size * 1.05 * len(chars)) + sw * 4; H = int(size * 1.35) + sw * 4
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for i, c in enumerate(chars):
        if vertical: x, y = sw * 2 + size * 0.1, sw * 2 + i * size * 1.0
        else: x, y = sw * 2 + i * size * 0.98, sw * 2 + (i % 2) * size * 0.08
        # 外黑边、白粗描边、黑字（航海王拟声字）
        d.text((x, y), c, font=f, fill=fill, stroke_width=sw + 4, stroke_fill=fill)
        d.text((x, y), c, font=f, fill=fill, stroke_width=sw, stroke_fill=stroke)
    _sfx_cache[k] = im
    return im

def paste_rgba(bgr, im, cx, cy, scale=1.0, rot=0.0, alpha=1.0):
    if scale <= 0.01 or alpha <= 0.01: return bgr
    im2 = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BICUBIC)
    if rot: im2 = im2.rotate(rot, resample=Image.BICUBIC, expand=True)
    a = np.asarray(im2).astype(np.float32)
    h, w = bgr.shape[:2]; ih, iw = a.shape[:2]
    x0, y0 = int(cx - iw / 2), int(cy - ih / 2)
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(w, x0 + iw), min(h, y0 + ih)
    if xa >= xb or ya >= yb: return bgr
    sub = a[ya - y0:yb - y0, xa - x0:xb - x0]
    al = sub[..., 3:4] / 255 * alpha
    rgb = sub[..., 2::-1]
    out = bgr.copy()
    out[ya:yb, xa:xb] = (out[ya:yb, xa:xb].astype(np.float32) * (1 - al) + rgb * al).astype(np.uint8)
    return out

def subtitle(bgr, text, who, y_center, alpha=1.0, boxed=True, size=46):
    if not text or alpha <= 0: return bgr
    h, w = bgr.shape[:2]
    f = font(FONT_SUB, size)
    im = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)); d = ImageDraw.Draw(im, 'RGBA')
    tw = d.textlength(text, font=f)
    x = (w - tw) / 2; y = y_center - size * 0.62
    a = int(255 * alpha)
    if who and who not in ('旁白',):
        nf = font(FONT_SUB, int(size * 0.6)); nt = who
        nw = d.textlength(nt, font=nf)
        d.text((x - nw - 18, y + size * 0.3), nt, font=nf, fill=(170, 170, 170, a))
    d.text((x, y), text, font=f, fill=(245, 245, 245, a), stroke_width=0 if boxed else 4, stroke_fill=(0, 0, 0, a))
    return cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)
