# 场景重绘：逆流河、北原草原、风暴云、群仙剪影。全部在墨（ink：1=白纸，0=黑）空间里画，不取同人视频的背景。
#
# 依据原文：逆流河在北原草原上；方源走在整条河的最前端，水只到脚面，每走一步河就往前流一步，
# 所以“前面”是干草地，河从他脚下一直铺到身后的地平线（没有尽头）。
# 河外三方：左岸雪胡老祖一方，右岸伏着小山般的毛里球，高空是中洲群仙。
#
# 诺兰式构图：极低的地平线 + 压下来的天（IMAX 的天空占画面大半），极远景里的人只有几十像素；
# 地平线那头一团亮（上游没有尽头）。
import cv2, numpy as np, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_c = {}

def _rng(s): return np.random.default_rng(s)

def fbm(h, w, seed, octaves=5, base=6):
    k = ('fbm', h, w, seed, octaves, base)
    if k in _c: return _c[k]
    r = _rng(seed); acc = np.zeros((h, w), np.float32); amp = 1.0; tot = 0
    for o in range(octaves):
        n = base * 2 ** o
        g = r.normal(0, 1, (n + 1, int(n * w / h) + 2)).astype(np.float32)
        acc += cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC) * amp; tot += amp; amp *= 0.5
    acc = (acc / tot); acc = (acc - acc.min()) / (acc.max() - acc.min())
    _c[k] = acc
    return acc

def screen(h, w, cell=7, ang=45):
    k = ('scr', h, w, cell, ang)
    if k not in _c:
        y, x = np.mgrid[0:h, 0:w].astype(np.float32)
        a = np.deg2rad(ang); u = (x * np.cos(a) + y * np.sin(a)) / cell; v = (-x * np.sin(a) + y * np.cos(a)) / cell
        _c[k] = (np.sqrt((u - np.round(u)) ** 2 + (v - np.round(v)) ** 2) / 0.7071).astype(np.float32)
    return _c[k]

def tone(val, h, w):
    """把 0..1 的灰度（1=白）转成网点。"""
    s = screen(h, w)
    d = np.clip(1 - val, 0, 1)
    return np.where(d > 0.95, 0.0, (s > np.sqrt(d) * 1.0).astype(np.float32))

# ---------------- 天 ----------------
def _tile_noise(seed, n=512):
    k = ('tile', seed, n)
    if k not in _c:
        r = _rng(seed); acc = np.zeros((n, n), np.float32); amp = 1.0
        for o in range(4):
            m = 3 * 2 ** o
            g = r.normal(0, 1, (m, m)).astype(np.float32)
            g = np.tile(g, (3, 3))
            up = cv2.resize(g, (n * 3, n * 3), interpolation=cv2.INTER_CUBIC)[n:2 * n, n:2 * n]
            acc += up * amp; amp *= 0.45
        acc = cv2.GaussianBlur(np.tile(acc, (3, 3)), (0, 0), 5)[n:2 * n, n:2 * n]
        acc = (acc - acc.min()) / (acc.max() - acc.min())
        _c[k] = acc
    return _c[k]

def sky(h, w, t, seed=1, mood='storm', glow=(0.5, 0.6), drift=0.02, hy=None, vx=0.5):
    """透视云顶：云层从头顶一直退到地平线（越远越扁越密），逆光处云边发白；顶上压暗。"""
    hy = int(h * glow[1]) if hy is None else int(hy)
    n = _tile_noise(seed); N = n.shape[0]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.clip((hy - yy) / max(hy, 1), 0.004, None)          # 0 地平线 → 1 画面顶
    depth = 1.0 / (d + 0.3)
    u = ((xx - vx * w) / w * depth * 1.7 + t * drift) * N
    v = (depth * 0.45 + t * drift * 2) * N
    dens = cv2.remap(n, (u % N).astype(np.float32), (v % N).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    gx, gy = glow[0] * w, glow[1] * h
    dist = np.sqrt(((xx - gx) / w * 1.4) ** 2 + ((yy - gy) / h) ** 2)
    light = np.exp(-dist * dist / (0.05 if mood != 'burst' else 0.25))
    cover = {'storm': 0.42, 'calm': 0.47, 'burst': 0.5}.get(mood, 0.45)
    cloud = np.clip((dens - cover) * 14, 0, 1)
    # 云的明暗：朝光一侧亮，背光一侧（下沿）暗
    gxn, gyn = cv2.Sobel(dens, cv2.CV_32F, 1, 0, ksize=5), cv2.Sobel(dens, cv2.CV_32F, 0, 1, ksize=5)
    lx, ly = (gx - xx), (gy - yy); ln = np.sqrt(lx * lx + ly * ly) + 1
    shade = np.clip(0.5 - (gxn * lx / ln + gyn * ly / ln) * 1.8, 0, 1)
    top = np.clip(1 - d, 0, 1)                                    # 越往上越暗（天压下来）
    base = 0.78 - 0.38 * (1 - top) + light * 0.5                 # 云缝里的天（顶上暗）
    body = 0.10 + 0.62 * shade * (1 - 0.45 * (1 - top)) + light * 0.45
    if mood == 'storm': body *= 0.85; base *= 0.92
    val = np.clip(base * (1 - cloud) + body * cloud, 0, 1)
    val = np.where(yy > hy, 1.0, val)
    ink = tone(val, h, w)
    # 云团轮廓：墨线（远处细、近处粗）
    e = cv2.Canny((cloud > 0.5).astype(np.uint8) * 255, 50, 150).astype(np.float32) / 255
    e = cv2.GaussianBlur(e, (0, 0), 0.8) * 1.8
    near = (d > 0.2).astype(np.float32)
    e = np.maximum(e, cv2.dilate(e, np.ones((3, 3), np.uint8)) * near)
    ink = ink * (1 - np.clip(e, 0, 1) * (yy < hy))
    return ink

def rays(ink, cx, cy, n=90, seed=3, inner=0.05, white=True, alpha=1.0, t=0, thin=False):
    """光芒/集中线：从 (cx,cy) 放射，white=True 为白线（逆光），否则黑线。"""
    h, w = ink.shape; r = _rng(seed); m = np.zeros((h, w), np.uint8)
    R = math.hypot(w, h)
    for a in r.uniform(0, 2 * math.pi, n) + t * 0.02:
        da = r.uniform(0.001, 0.004) if thin else r.uniform(0.003, 0.012)
        r0 = inner * w * r.uniform(0.8, 1.6)
        p = [(cx + math.cos(a) * r0, cy + math.sin(a) * r0), (cx + math.cos(a - da) * R, cy + math.sin(a - da) * R), (cx + math.cos(a + da) * R, cy + math.sin(a + da) * R)]
        cv2.fillPoly(m, [np.array(p, np.int32)], 255, cv2.LINE_AA)
    a = m.astype(np.float32) / 255 * alpha
    return ink * (1 - a) + (1.0 if white else 0.0) * a

# ---------------- 地与河 ----------------
def river_geom(h, w, hy, vx, fy, half, meander=1.1, seed=5):
    """河两岸的 x(y)，按地面透视：s=(y-hy)/(fy-hy) ∝ 1/深度；两岸在远处蛇行。"""
    ys = np.arange(h, dtype=np.float32)
    s = np.clip((ys - hy) / max(fy - hy, 1), 0, None)
    z = 1 / np.maximum(s, 1e-3)
    lz = np.log(z)                                            # 按对数深度蛇行：近处一个弯，远处一串弯
    Xc = meander * np.sin(lz * 2.6 + seed) * np.clip(lz, 0, 1) * z ** 0.55
    wd = 1 + 0.25 * np.sin(lz * 4.1 + seed * 2)
    Xl, Xr = Xc - wd, Xc + wd
    cx = vx * w
    return cx + Xl * half * s, cx + Xr * half * s, s

def ground(h, w, t, hy, vx=0.5, fy=None, half=None, seed=7, river=True, flow=1.0, front_x=None, grass=True, water_tone=0.86):
    """草原 + 逆流河。fy=河头的 y（方源脚下）；河从 fy 一直铺到地平线。"""
    fy = h * 0.82 if fy is None else fy; half = w * 0.16 if half is None else half
    ink = np.ones((h, w), np.float32)
    hy = int(hy); r = _rng(seed)
    yy = np.arange(h, dtype=np.float32)[:, None]
    # 远处草原：地平线附近一条网点带，越近越白
    s_all = np.clip((yy - hy) / max(h - hy, 1), 0, 1)
    gval = 0.62 + 0.38 * np.clip(s_all * 2.2, 0, 1) ** 0.7
    g = np.repeat(gval, w, 1)
    ink = np.where(yy >= hy, tone(g, h, w), 1.0).astype(np.float32)
    L, R_, s = river_geom(h, w, hy, vx, fy, half, seed=seed)
    xs = np.arange(w, dtype=np.float32)[None, :]
    rmask = np.zeros((h, w), np.float32)
    if river:
        inside = (xs >= L[:, None]) & (xs <= R_[:, None]) & (yy >= hy) & (yy <= fy)
        rmask = inside.astype(np.float32)
        # 河面：浅网点，远处亮（反着天光），中间一条亮带
        cxr = (L + R_) / 2
        band = np.exp(-((xs - cxr[:, None]) / np.maximum((R_ - L)[:, None] * 0.25, 1)) ** 2)
        wv = np.clip(0.55 + band * 0.25 + (1 - s[:, None]) ** 3 * 0.4, 0, 1)
        wink = tone(np.repeat(wv, 1, 0), h, w)
        ink = ink * (1 - rmask) + wink * rmask
        # 波纹线：按深度等距，往地平线方向流（下游），近大远小
        m = np.zeros((h, w), np.uint8)
        nrow = 70
        for k in range(nrow):
            zz = ((k / nrow) + t * 0.05 * flow) % 1.0          # 0 近 → 1 远
            sc = 1 - zz ** 0.55                               # 透视比例
            y = hy + (fy - hy) * sc
            if y <= hy + 1 or y >= fy - 2: continue
            yi = int(y); l, rr = L[yi], R_[yi]
            nd = int(3 + 10 * sc)
            for j in range(nd):
                if rr - l < 2: continue
                x0 = r.uniform(l, rr); ln = r.uniform(8, 60) * sc
                th = max(1, int(3 * sc))
                cv2.line(m, (int(x0), yi), (int(min(rr, x0 + ln)), yi), 255, th, cv2.LINE_AA)
        wl = m.astype(np.float32) / 255 * rmask
        hl = np.roll(wl, -max(2, int(0.004 * h)), 0)                 # 波峰白、波谷黑
        ink = np.maximum(ink, hl * rmask); ink = ink * (1 - wl * 0.9)
        # 岸线：粗墨线
        pts_l = np.stack([L[hy:int(fy)], np.arange(hy, int(fy))], 1).astype(np.int32)
        pts_r = np.stack([R_[hy:int(fy)], np.arange(hy, int(fy))], 1).astype(np.int32)
        el = np.zeros((h, w), np.uint8)
        cv2.polylines(el, [pts_l, pts_r], False, 255, 3, cv2.LINE_AA)
        ink = ink * (1 - el.astype(np.float32) / 255)
        # 河头：一道白沫 + 水迹（水往前漫）
        fyi = int(fy); l, rr = L[min(fyi, h - 1)], R_[min(fyi, h - 1)]
        fm = np.zeros((h, w), np.uint8)
        xs_ = np.linspace(l, rr, 40); ys_ = fy + np.sin(xs_ * 0.05 + t * 2) * 4 + r.uniform(-3, 3, 40)
        cv2.polylines(fm, [np.stack([xs_, ys_], 1).astype(np.int32)], False, 255, 3, cv2.LINE_AA)
        ink = ink * (1 - fm.astype(np.float32) / 255)
    if grass:
        ink = grass_strokes(ink, hy, rmask, seed, t)
    # 地平线：一道亮线（上游没有尽头）
    cv2.line(ink, (0, hy), (w, hy), 0.0, 2, cv2.LINE_AA)
    return ink, rmask

def grass_strokes(ink, hy, rmask, seed, t, n=1500):
    """北原草原：按深度均匀撒草簇（屏幕上远密近疏），近大远小，向风倒。"""
    h, w = ink.shape; r = _rng(seed + 11)
    m = np.zeros((h, w), np.uint8)
    for _ in range(n):
        z = r.uniform(1.0, 30.0) ** 1.0
        sc = 1.0 / z
        y = hy + (h - hy) * sc * 1.05
        if y >= h + 40: continue
        x = r.uniform(-0.6, 1.6) * w * (0.5 + sc) - w * (0.5 + sc) * 0.5 + w * 0.5
        yi = int(min(max(y, 0), h - 1)); xi = int(min(max(x, 0), w - 1))
        if rmask[yi, xi] > 0: continue
        ln = (3 + 90 * sc) * (0.3 if hy < 0.3 * h else 1.0); lean = 0.3 + 0.12 * math.sin(t * 1.3 + x * 0.004)
        k_ = 1 if sc < 0.15 else (3 if sc < 0.5 else 5)
        for k in range(k_):
            dx = (k - k_ // 2) * ln * 0.12; l2 = ln * r.uniform(0.6, 1.1)
            cv2.line(m, (int(x + dx), int(y)), (int(x + dx + l2 * (lean + r.uniform(-0.08, 0.08))), int(y - l2)), 255, max(1, int(3.5 * sc)), cv2.LINE_AA)
    a = m.astype(np.float32) / 255
    return ink * (1 - a)

# ---------------- 剪影 ----------------
_cast = {}
def cast(name):
    """sucai/cast/<name>.png（RGBA，从素材里抠出来的人物/毛里球），返回 alpha 0..1。"""
    if name not in _cast:
        im = cv2.imread(os.path.join(ROOT, 'sucai/cast', name + '.png'), cv2.IMREAD_UNCHANGED)
        _cast[name] = im[..., 3].astype(np.float32) / 255
    return _cast[name]

def silhouette(ink, name, cx, base_y, height, rim=True, flip=False, gray=0.0, breathe=0.0, t=0):
    """把角色压成实黑剪影（巨大、背光），底边落在 base_y，高 height（像素）。"""
    a = cast(name)
    if flip: a = a[:, ::-1]
    ys, xs = np.nonzero(a > 0.3)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    sc = height / a.shape[0] * (1 + breathe * math.sin(t * 1.7))
    a = cv2.resize(a, (max(1, int(a.shape[1] * sc)), max(1, int(a.shape[0] * sc))), interpolation=cv2.INTER_AREA)
    h, w = ink.shape; ah, aw = a.shape
    x0, y0 = int(cx - aw / 2), int(base_y - ah)
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(w, x0 + aw), min(h, y0 + ah)
    if xa >= xb or ya >= yb: return ink
    sub = a[ya - y0:yb - y0, xa - x0:xb - x0]
    out = ink.copy()
    reg = out[ya:yb, xa:xb]
    if rim:   # 逆光白边
        halo = cv2.dilate((sub > 0.5).astype(np.uint8), np.ones((7, 7), np.uint8)).astype(np.float32)
        reg = np.maximum(reg, halo)
    fill = gray if gray > 0 else 0.0
    if gray > 0:  # 远处的剪影用网点（大气透视）
        fill = tone(np.full(sub.shape, 1 - gray, np.float32), *sub.shape)
    reg = reg * (1 - sub) + fill * sub
    out[ya:yb, xa:xb] = reg
    return out

def crowd(ink, hy, xs_range, y_range, n, seed, size=(10, 26)):
    """两岸被冲出来的人：小黑人影。"""
    h, w = ink.shape; r = _rng(seed); out = ink.copy()
    for _ in range(n):
        y = r.uniform(*y_range); x = r.uniform(*xs_range)
        s = size[0] + (size[1] - size[0]) * (y - hy) / max(h - hy, 1)
        hd = s * 0.16
        cv2.ellipse(out, (int(x), int(y - s + hd)), (max(1, int(hd)), max(1, int(hd * 1.1))), 0, 0, 360, 0.0, -1, cv2.LINE_AA)
        pts = np.array([[x - s * 0.12, y - s + hd * 2], [x + s * 0.12, y - s + hd * 2], [x + s * 0.22, y], [x - s * 0.22, y]], np.int32)
        cv2.fillPoly(out, [pts], 0.0, cv2.LINE_AA)
    return out

# ---------------- 场景套餐 ----------------
def plate(kind, h, w, t, **p):
    """kind: river（河头迎面）/ high（俯拍大全景）/ skyonly（仰拍天空）/ bank（河外岸上）/ void（集中线）/ glow（光芒）"""
    if kind == 'void':
        ink = np.ones((h, w), np.float32)
        ink = rays(ink, p.get('cx', 0.5) * w, p.get('cy', 0.45) * h, p.get('n', 160), seed=int(t * 15) // 2, inner=p.get('inner', 0.18), white=False)
        return ink
    if kind == 'dark':   # 漆黑底 + 白色速度线（压抑、心里话）
        ink = np.zeros((h, w), np.float32)
        return rays(ink, p.get('cx', 0.5) * w, p.get('cy', 0.45) * h, p.get('n', 70), seed=int(t * 15) // 2, inner=p.get('inner', 0.25), white=True, alpha=0.8)
    hy = int(h * p.get('hy', 0.62 if kind != 'skyonly' else 1.02))
    gl = p.get('glow', (p.get('vx', 0.5), min(p.get('hy', 0.62), 0.98)))
    ink = sky(h, w, t, seed=p.get('seed', 1), mood=p.get('mood', 'storm'), glow=gl, hy=hy, vx=p.get('vx', 0.5))
    if p.get('rays', True):
        ink = rays(ink, gl[0] * w, gl[1] * h, 28, seed=4, inner=0.03, white=True, alpha=1.0, thin=True)
    for sname, sx, sb, sh, kw in p.get('sil', []):        # 地平线上的巨大剪影
        ink = silhouette(ink, sname, sx * w, sb * h, sh * h, t=t, **kw)
    if kind == 'skyonly':
        return ink
    g, rmask = ground(h, w, t, hy, vx=p.get('vx', 0.5), fy=p.get('fy', 0.86) * h, half=p.get('half', 0.2) * w,
                      seed=p.get('gseed', 7), river=p.get('river', True), flow=p.get('flow', 1.0))
    yy = np.arange(h)[:, None]
    ink = np.where(yy >= hy, g, ink)
    if p.get('crowd'):
        ink = crowd(ink, hy, (0, w * 0.3), (hy + 4, hy + (h - hy) * 0.25), p['crowd'], 21)
        ink = crowd(ink, hy, (w * 0.7, w), (hy + 4, hy + (h - hy) * 0.25), p['crowd'], 22)
    for sname, sx, sb, sh, kw in p.get('fg', []):         # 前景剪影（压画面边缘）
        ink = silhouette(ink, sname, sx * w, sb * h, sh * h, t=t, **kw)
    return ink
