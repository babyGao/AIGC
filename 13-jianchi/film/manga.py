# 航海王黑白漫画化：墨线（XDoG）+ 实黑块 + 45° 网点 + 排线 + 纸
# 输入 BGR 帧，输出 BGR（黑白为主，可带专色遮罩）
import cv2, numpy as np

_cache = {}

def _screen(h, w, cell, ang):
    """45° 网点阈值图：返回 0..1 的点阵，值小处先变黑。"""
    key = ('s', h, w, cell, ang)
    if key not in _cache:
        y, x = np.mgrid[0:h, 0:w].astype(np.float32)
        a = np.deg2rad(ang); u = (x * np.cos(a) + y * np.sin(a)) / cell; v = (-x * np.sin(a) + y * np.cos(a)) / cell
        d = np.sqrt((u - np.round(u)) ** 2 + (v - np.round(v)) ** 2) / 0.7071
        _cache[key] = d.astype(np.float32)
    return _cache[key]

def _hatch(h, w, period, ang):
    key = ('h', h, w, period, ang)
    if key not in _cache:
        y, x = np.mgrid[0:h, 0:w].astype(np.float32)
        a = np.deg2rad(ang); u = (x * np.cos(a) + y * np.sin(a)) / period
        _cache[key] = (np.abs(u - np.round(u)) * 2).astype(np.float32)
    return _cache[key]

def _paper(h, w):
    key = ('p', h, w)
    if key not in _cache:
        rng = np.random.default_rng(7)
        n = rng.normal(0, 1, (h // 4 + 1, w // 4 + 1)).astype(np.float32)
        n = cv2.resize(cv2.GaussianBlur(n, (0, 0), 1.2), (w, h))
        _cache[key] = n
    return _cache[key]

def xdog(gray, sigma=0.9, k=1.6, p=22.0, eps=0.035, phi=60.0):
    g1 = cv2.GaussianBlur(gray, (0, 0), sigma); g2 = cv2.GaussianBlur(gray, (0, 0), sigma * k)
    s = (1 + p) * g1 - p * g2
    e = np.where(s >= eps, 1.0, 1.0 + np.tanh(phi * (s - eps)))
    return np.clip(e, 0, 1).astype(np.float32)

def manga(bgr, black=0.17, dark=0.33, mid=0.47, light=0.60, line=1.0, cell=7, contrast=1.0, ink_boost=0.0, bilat=True):
    """bgr: uint8. 返回 (ink 0..1 浮点灰度, 1=白)。"""
    h, w = bgr.shape[:2]
    small = cv2.resize(bgr, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    if bilat: small = cv2.bilateralFilter(cv2.bilateralFilter(small, 9, 40, 7), 9, 30, 7)
    sm = cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)
    lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB)
    # 明度掺一半 HSV 的 V：红唇、暖色皮肤不至于压成黑块（漫画脸是白的）
    L = (lab[..., 0].astype(np.float32) * 0.45 + sm.max(axis=2).astype(np.float32) * 0.55).astype(np.uint8)
    L = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(6, 6)).apply(L).astype(np.float32) / 255.0
    L = np.clip((L - 0.5) * contrast + 0.5 + ink_boost, 0, 1)
    # 色调用平滑过的明度分层，避免模糊背景碎成迷彩斑
    Ls = cv2.GaussianBlur(L, (0, 0), 2.2)
    det = np.abs(L - Ls)
    L = np.where(det > 0.06, L, Ls)
    scr = _screen(h, w, cell, 45)
    t = np.ones_like(L)
    t[L < black] = 0.0
    m = (L >= black) & (L < dark)                     # 密网点：点径随明度变化
    dens = 1 - (L - black) / (dark - black) * 0.55
    t[m] = (scr[m] > dens[m] * 0.95).astype(np.float32)
    m2 = (L >= dark) & (L < light)                    # 疏网点
    dens2 = 0.42 - (L - dark) / (light - dark) * 0.32
    t[m2] = (scr[m2] > dens2[m2]).astype(np.float32)
    # 实黑块边缘去碎：开闭运算
    tb = (t > 0.5).astype(np.uint8)
    solid = (L < black).astype(np.uint8)
    solid = cv2.morphologyEx(cv2.morphologyEx(solid, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    t = np.where(solid > 0, 0.0, np.where(L < black, 1.0 - (scr > 0.3), t)).astype(np.float32)
    # 墨线：细节线 + 轮廓粗线
    g = cv2.GaussianBlur(sm, (0, 0), 0.6).astype(np.float32).mean(axis=2) / 255.0
    e1 = xdog(g, sigma=0.8 * line)
    e2 = xdog(g, sigma=1.8 * line, eps=0.02, p=30)
    edge = np.minimum(e1, e2)
    edge = cv2.erode(edge, np.ones((2, 2), np.uint8))
    ink = np.minimum(t, edge)
    ink = cv2.GaussianBlur(ink, (0, 0), 0.55)          # 抗锯齿，像印刷
    return ink

def to_paper(ink, tint=(236, 240, 242), inkcol=(18, 16, 20)):
    h, w = ink.shape
    p = _paper(h, w) * 0.012
    i = np.clip(ink + p, 0, 1)[..., None]
    paper = np.array(tint, np.float32)[None, None]; inkc = np.array(inkcol, np.float32)[None, None]
    return (inkc + (paper - inkc) * i).astype(np.uint8)

def spot(bgr, out, hue_lo, hue_hi, sat_min=70, val_min=60, col=None, strength=1.0):
    """把原图中某一色相（如紫晶眼、湛蓝光）作为专色叠回黑白画面。"""
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    hh = hsv[..., 0].astype(np.int32)
    if hue_lo <= hue_hi: hm = (hh >= hue_lo) & (hh <= hue_hi)
    else: hm = (hh >= hue_lo) | (hh <= hue_hi)
    m = (hm & (hsv[..., 1] >= sat_min) & (hsv[..., 2] >= val_min)).astype(np.float32)
    m = cv2.GaussianBlur(m, (0, 0), 2.0)[..., None] * strength
    c = bgr.astype(np.float32) if col is None else np.array(col, np.float32)[None, None]
    o = out.astype(np.float32)
    mix = o * (1 - m) + (o * c / 255.0 * 1.15) * m          # 乘色，墨线仍是黑
    return np.clip(mix, 0, 255).astype(np.uint8)
