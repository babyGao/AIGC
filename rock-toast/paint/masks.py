# 绘制计划：原片帧 + keys.json 里的手工标注 → 分区图（画什么）、留用图（哪些像素不取色）、轮廓光、高光、接触阴影
# 原片像素不做任何清理；手、字、刻度只标成"不取色"，由画笔在绘制时用周围的颜料盖过去
# 运行：python -I paint/masks.py [s01 s02 ...]   （关键帧；动态镜头见 prep_shot.py，共用这里的函数）
import os, sys, json, subprocess
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__))
RAW, OUT = os.path.join(HERE, 'raw'), os.path.join(HERE, 'keys')
W, H = 1080, 1920
KEYS = json.load(open(os.path.join(HERE, 'keys.json'), encoding='utf-8'))

def poly_mask(shape, pts, val=1):
    m = np.zeros(shape, np.uint8); cv2.fillPoly(m, [np.array(pts, np.int32)], val); return m

def ellipse_kernel(r): return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))

def grabcut(img, region, inner=24, outer=26, minA=400):
    """在手画外形附近做前景分割，外形之外一律不算"""
    m = np.full(region.shape, cv2.GC_BGD, np.uint8)
    m[cv2.dilate(region, ellipse_kernel(outer)) > 0] = cv2.GC_PR_BGD
    m[region > 0] = cv2.GC_PR_FGD
    m[cv2.erode(region, ellipse_kernel(inner)) > 0] = cv2.GC_FGD
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    try: cv2.grabCut(img, m, None, bg, fg, 5, cv2.GC_INIT_WITH_MASK)
    except cv2.error: return region.copy()
    r = ((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD)).astype(np.uint8) & region
    r = cv2.morphologyEx(r, cv2.MORPH_OPEN, ellipse_kernel(2))
    r = cv2.morphologyEx(r, cv2.MORPH_CLOSE, ellipse_kernel(4))
    n, cc, st, _ = cv2.connectedComponentsWithStats(r, 8)
    keep = np.zeros_like(r)
    for c in range(1, n):
        if st[c, cv2.CC_STAT_AREA] >= minA: keep[cc == c] = 1
    return keep

def fill_holes(m):
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    o = np.zeros_like(m); cv2.drawContours(o, cs, -1, 1, -1); return o

def text_pixels(img, rect, pad=4):
    """烧字：白字 + 深色描边，只标字本身，不标整块"""
    x0, y0, x1, y1 = rect
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    t = ((hsv[..., 2] > 215) & (hsv[..., 1] < 50)).astype(np.uint8)
    box = np.zeros_like(t); box[y0:y1, x0:x1] = 1
    return cv2.dilate(t & box, ellipse_kernel(pad))

def hue_mask(hsv, h, s=0, v=0):
    lo, hi = h; hh = hsv[..., 0]
    hm = ((hh >= lo) & (hh <= hi)) if lo <= hi else ((hh >= lo) | (hh <= hi))
    return (hm & (hsv[..., 1] >= s) & (hsv[..., 2] >= v)).astype(np.uint8)

def segment(img, k, polys=None, omits=None, fast=False):
    """分区 + 不取色区（原片坐标）。polys / omits 可替换关键帧上的手画外形（动态镜头里跟着物体走）"""
    h, w = img.shape[:2]
    lab = np.zeros((h, w), np.uint8); omit = np.zeros((h, w), np.uint8)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.int32)
    for j, o in enumerate(k.get('omit', [])):
        if 'poly' in o:
            pts = omits[j] if omits and omits.get(j) is not None else o['poly']
            m = poly_mask((h, w), pts); omit |= cv2.dilate(m, ellipse_kernel(o['pad'])) if o.get('pad') else m
        if 'rect' in o: omit |= text_pixels(img, o['rect'], o.get('pad', 4)) if o.get('text') else poly_mask((h, w), [[o['rect'][0], o['rect'][1]], [o['rect'][2], o['rect'][1]], [o['rect'][2], o['rect'][3]], [o['rect'][0], o['rect'][3]]])
    # 刻度、商标等按颜色挑出来的杂物（例如量杯红字）
    for o in k.get('omit_color', []):
        m = hue_mask(hsv, o['h'], o.get('s', 90), o.get('v', 60))
        if o.get('thin'):
            # 只要细线：红减绿的顶帽（比周围红出一截的细笔画），整片木纹不算
            rg = np.clip(img[..., 2].astype(np.int16) - img[..., 1].astype(np.int16), 0, 255).astype(np.uint8)
            th = cv2.morphologyEx(rg, cv2.MORPH_TOPHAT, ellipse_kernel(o['thin']))
            m &= (th >= o.get('thr', 30)).astype(np.uint8)
            m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, ellipse_kernel(1))
        if 'poly' in o: m &= poly_mask((h, w), o['poly'])
        omit |= cv2.dilate(m, ellipse_kernel(o.get('pad', 3)))
    sm = cv2.resize(img, (w // 2, h // 2), interpolation=cv2.INTER_AREA) if fast else None
    for i, p in enumerate(k['parts']):
        pts = polys[i] if polys and polys.get(i) is not None else p['poly']
        reg = poly_mask((h, w), pts)
        if p.get('color'):
            # 按颜色认的部分（例如下落的蛋黄）：外形框内、颜色对得上的像素
            c = p['color']; m = hue_mask(hsv, c['h'], c.get('s', 0), c.get('v', 0)) & reg & (1 - omit)   # 刻度等杂物不算
            m = cv2.morphologyEx(m, cv2.MORPH_OPEN, ellipse_kernel(3)); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, ellipse_kernel(5))
            n_, cc, st, _ = cv2.connectedComponentsWithStats(m, 8)
            m = np.isin(cc, [j for j in range(1, n_) if st[j, cv2.CC_STAT_AREA] >= c.get('minA', 600)]).astype(np.uint8)
        elif p.get('cut'):
            if fast:
                r2 = cv2.resize(reg, (w // 2, h // 2), interpolation=cv2.INTER_NEAREST)
                m2 = grabcut(sm, r2, max(2, p.get('inner', 24) // 2), max(3, p.get('outer', 26) // 2), 100)
                m = cv2.resize(m2, (w, h), interpolation=cv2.INTER_NEAREST) & reg
            else: m = grabcut(img, reg, p.get('inner', 24), p.get('outer', 26))
        else: m = reg.copy()
        if p.get('fill'): m = fill_holes(m)
        # 被手挡住的部分按手画外形补全（画笔会盖过去）；按颜色认的部分不补
        if not p.get('color'): m |= reg & omit
        lab[m > 0] = i + 1
        # 吸收：别的分区里颜色属于本区的像素（盘上的酱汁滴、奶油痕）
        for a in p.get('absorb', []):
            src = [j + 1 for j, q in enumerate(k['parts']) if q['name'] == a['from']][0]
            hm = hue_mask(hsv, a['h'], a['s'], a.get('v', 0)) & (lab == src).astype(np.uint8)
            if 'poly' in a: hm &= poly_mask((h, w), a['poly'])
            hm = cv2.morphologyEx(hm, cv2.MORPH_OPEN, ellipse_kernel(2))
            hm = cv2.morphologyEx(hm, cv2.MORPH_CLOSE, ellipse_kernel(3))
            lab[hm > 0] = i + 1
    # 隐藏的分区只用来分割（例如拉远镜头里整只盘子重画），不进画面
    for i, p in enumerate(k['parts']):
        if p.get('hide'): lab[lab == i + 1] = 0
    return lab, omit

def crop_matrix(k):
    cx, cy, ch = k['crop']; cw = ch * W / H
    x0, y0, s = cx - cw / 2, cy - ch / 2, W / cw
    return np.array([[s, 0, -x0 * s], [0, s, -y0 * s]], np.float32)

def frame_maps(img, lab, omit, k):
    """原片坐标的帧 + 分区 → 画布坐标的原片、分区、留用、轮廓光、玻璃高光、镜面高光、接触阴影"""
    M = crop_matrix(k)
    raw = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    # 原片画框以外：没有原片，只有新画的背景
    L = cv2.warpAffine(lab, M, (W, H), flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    V = cv2.warpAffine((1 - omit) * 255, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=255)
    L = cv2.medianBlur(L, 5)
    # —— 轮廓光：主体朝向背光一侧的边缘 ——
    rim = np.zeros((H, W), np.float32)
    lr = np.array(k.get('rim_dir', [-.35, -1.0]), np.float32); lr /= np.linalg.norm(lr)
    for i, p in enumerate(k['parts']):
        if not p.get('rim'): continue
        m = (L == i + 1).astype(np.float32)
        # 盘子类：轮廓按"自己 + 压在上面的东西"算，只亮外沿，不亮和食物的交界
        sil = (L >= i + 1).astype(np.float32) if p.get('rimUnion') else m
        b = cv2.GaussianBlur(sil, (0, 0), 7)
        gy, gx = np.gradient(b)
        g = np.hypot(gx, gy) + 1e-6
        face = np.clip(-(gx * lr[0] + gy * lr[1]) / g, 0, 1)
        d = cv2.distanceTransform((sil > 0).astype(np.uint8), cv2.DIST_L2, 5)
        band = np.exp(-d / p.get('rimw', 9)) * (m > 0)
        face = cv2.GaussianBlur(face, (0, 0), 6)
        rim = np.maximum(rim, band * face * p['rim'])
    # —— 玻璃高光：比周围亮的细边（杯沿、杯壁反光），玻璃本身按新背景重画 ——
    gl = cv2.cvtColor(raw, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    hi = np.clip((gl - cv2.GaussianBlur(gl, (0, 0), 9)) * 3.5, 0, 1) + np.clip((gl - .78) * 2.5, 0, 1)
    gmask = np.zeros((H, W), bool); food = np.zeros((H, W), bool); vessel = np.zeros((H, W), bool)
    for i, p in enumerate(k['parts']):
        if p['pal'] == 'glass': gmask |= (L == i + 1)
        if p['pal'] in ('food', 'liquid', 'steel'): food |= (L == i + 1)
        if p['pal'] in ('slate', 'walnut', 'iron'): vessel |= (L == i + 1)
    hi = np.clip(hi, 0, 1) * gmask
    # —— 镜面高光：很亮、发白、比周围亮出一大截（果酱反光、糖浆、油光；面包孔洞、奶油大面不算）——
    hsv = cv2.cvtColor(raw, cv2.COLOR_BGR2HSV).astype(np.float32) / 255
    peak = gl - cv2.GaussianBlur(gl, (0, 0), 7)
    sp = np.clip((peak - .12) * 5, 0, 1) * np.clip((gl - .68) * 5, 0, 1) * np.clip((.35 - hsv[..., 1]) * 5, 0, 1) * food * (V > 127)
    # —— 接触阴影：盘子/砧板/锅上，离食物越近越暗，食物下方更重 ——
    d = cv2.distanceTransform((~food).astype(np.uint8), cv2.DIST_L2, 5)
    shift = np.zeros(food.shape, np.uint8); sh = int(18 * W / 1080); shift[sh:] = food[:-sh]
    d2 = cv2.distanceTransform((shift == 0).astype(np.uint8), cv2.DIST_L2, 5)
    ao = (np.exp(-d / 20) * .6 + np.exp(-d2 / 34) * .5) * vessel
    u8 = lambda a: (np.clip(a, 0, 1) * 255).astype(np.uint8)
    return dict(raw=raw, L=L, V=V, rim=u8(rim), hi=u8(hi), spec=u8(sp), ao=u8(ao))

def build(name):
    k = KEYS[name]
    src = os.path.join(RAW, f'{name}.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(k['t']), '-i', os.path.join(HERE, '..', '1.mp4'), '-frames:v', '1', src], check=True)
    img = cv2.imread(src)
    lab, omit = segment(img, k)
    F = frame_maps(img, lab, omit, k)
    names = {'raw': 'raw', 'L': 'lab', 'V': 'valid', 'rim': 'rim', 'hi': 'hi', 'spec': 'spec', 'ao': 'ao'}
    for a, b in names.items(): cv2.imwrite(os.path.join(OUT, f'{name}_{b}.png'), F[a])
    # 自检图：分区着色 + 不取色区打斜线
    L, V = F['L'], F['V']
    pal = np.array([[30, 30, 30], [60, 160, 230], [80, 200, 90], [220, 120, 60], [200, 80, 200], [60, 220, 220], [230, 230, 80], [150, 150, 255]], np.uint8)
    dbg = (F['raw'] * .5 + pal[L % len(pal)] * .5).astype(np.uint8)
    hatch = ((np.add.outer(np.arange(H), np.arange(W)) // 6) % 2 == 0)
    dbg[(V < 128) & hatch] = (0, 0, 255)
    dbg[F['rim'] > 64] = (255, 255, 255)
    cv2.imwrite(os.path.join(OUT, f'{name}_dbg.jpg'), cv2.resize(dbg, (540, 960)), [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(name, 'parts', [(p['name'], int((L == i + 1).sum())) for i, p in enumerate(k['parts'])], 'omit px', int((V < 128).sum()))

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for n in (sys.argv[1:] or list(KEYS)): build(n)
