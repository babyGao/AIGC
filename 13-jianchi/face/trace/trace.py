"""方源正脸（面无表情）描摹：把用户参考图 assets/ref/fangyuan.webp 里那张正脸（第二排左）
按“类别 + 明暗层级”切成一块块矢量形，连同发丝走向场一起写进 face/data/front.json。
JS 端（face/face.js）按这些形画平涂底稿，再交给 lemo 的 paintRef 铺刀笔。

类别：hair 头发 / skin 皮肤 / line 五官与轮廓的线 / robe 外袍（参考图是黑袍，按已定方案改白）/ collar 内衣领 / trim 领口镶边
坐标：参考图里这块面板的像素（206 x 248），JSON 里乘 U 变成局部单位。
python3 -I trace.py  （在 13-jianchi 下跑）
"""
import json, os, sys
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
BOX = (880, 290, 1086, 538)          # 参考图里正脸面板
K = 4                                # 描摹放大倍数
U = 5                                # 面板像素 -> 局部单位

src = Image.open(os.path.join(ROOT, 'assets/ref/fangyuan.webp')).convert('L').crop(BOX)
W0, H0 = src.size
L1 = np.asarray(src).astype(np.float32)
L = np.asarray(src.resize((W0 * K, H0 * K), Image.LANCZOS)).astype(np.float32)
H, W = L.shape

def poly_mask(pts):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.int32(np.array(pts) * K)], 1); return m.astype(bool)

# 手量的几块区域（面板像素）
SHOULDER = [(0, 199), (28, 190), (58, 180), (76, 171), (100, 173), (128, 170), (152, 177), (178, 184), (206, 187), (206, 248), (0, 248)]
FACE = [(70, 80), (100, 76), (140, 79), (143, 96), (141, 118), (136, 140), (126, 157), (112, 168), (100, 172), (90, 169), (78, 158), (69, 140), (65, 116), (66, 96)]
NECK = [(80, 152), (128, 150), (130, 178), (122, 200), (96, 210), (80, 190)]
FEAT = [(63, 97), (127, 95), (127, 124), (121, 140), (127, 150), (119, 163), (100, 176), (84, 166), (72, 152), (65, 128)]   # 五官和下巴线所在
robeR = poly_mask(SHOULDER) & ~poly_mask(NECK)
featR = poly_mask(FEAT)
COLLAR = [(70, 164), (134, 164), (140, 248), (64, 248)]    # 领口 V 字（内衣领和两片衣襟）
collR = poly_mask(COLLAR)
# 垂在两肩前面的两片头发（参考图里黑发压在黑袍上，色调分不开，按发际轮廓的延续手量）
CURT_L = [(18, 192), (46, 184), (72, 175), (79, 196), (77, 248), (27, 248), (20, 224)]
CURT_R = [(127, 171), (146, 176), (160, 186), (158, 220), (156, 248), (131, 248), (128, 205)]
curtR = (poly_mask(CURT_L) | poly_mask(CURT_R)) & ~poly_mask(COLLAR[:1] + [(78, 164), (130, 164)] + COLLAR[1:]) 
EAR = [(143, 106), (150, 103), (153, 112), (151, 124), (145, 129), (142, 118)]
skinR = poly_mask(FACE) | poly_mask(NECK) | (poly_mask(EAR) & (L > 120))

blur = cv2.GaussianBlur(L, (0, 0), 2.2)
cls = np.full((H, W), -1, np.int8)   # -1 = 背景
C = {'hair': 0, 'skin': 1, 'line': 2, 'robe': 3, 'collar': 4, 'trim': 5}
light = L > 205
# 背景：亮、而且和画边连着（发丝缝里透出来的亮也算背景）
n, lab = cv2.connectedComponents((light & ~skinR).astype(np.uint8))
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(border)) | ((L > 225) & ~skinR & ~robeR)
cls[skinR & (L >= 96)] = C['skin']
dark = (skinR & (L < 96)).astype(np.uint8)
thick = cv2.morphologyEx(dark, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (4 * K, 4 * K))).astype(bool)   # 比睫毛线粗的暗块 = 盖在脸上的头发
cls[skinR & (L < 96)] = C['hair']
cls[skinR & (L < 96) & featR & ~thick] = C['line']
cls[robeR & ~skinR & ~bg] = C['robe']
cls[robeR & ~skinR & collR & (L >= 96) & ~bg] = C['collar']
# 袍上的发丝：比袍子更黑，而且是竖长的一条条——强一点模糊后取最黑的，再用竖条核开合，去掉碎块
b5 = cv2.GaussianBlur(L, (0, 0), 1.2 * K)
hm = ((b5 < 11) & robeR & ~skinR).astype(np.uint8)
hm = cv2.morphologyEx(hm, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 9 * K)))
hm = cv2.morphologyEx(hm, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * K, 2 * K)))
n2, lab2, st2, _ = cv2.connectedComponentsWithStats(hm)
for i in range(1, n2):
    if st2[i, cv2.CC_STAT_AREA] < 60 * K * K or st2[i, cv2.CC_STAT_HEIGHT] < 25 * K: hm[lab2 == i] = 0
cls[hm.astype(bool) | (curtR & robeR & ~skinR & ~(cls == C['collar']))] = C['hair']
cls[~robeR & ~skinR & ~bg] = C['hair']
cls[bg & ~skinR] = -1
# 领口镶边：外袍挨着内衣领的一圈
coll = (cls == C['collar']).astype(np.uint8)
ring = cv2.dilate(coll, np.ones((3 * K, 3 * K), np.uint8)).astype(bool) & (cls == C['robe']) & collR
cls[ring] = C['trim']
# 去碎点
cls = cv2.medianBlur((cls + 1).astype(np.uint8), 5).astype(np.int8) - 1

LEVELS = {'hair': [14, 40, 90, 150], 'skin': [135, 175, 205, 228, 242], 'line': [45, 75], 'robe': [14, 24, 36, 55], 'collar': [160, 195, 220], 'trim': []}
shapes = []
def rings(mask):
    cs, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        if cv2.contourArea(c) < 2.5 * K * K: continue
        a = cv2.approxPolyDP(c, .55, True).reshape(-1, 2)
        if len(a) < 3: continue
        out.append([[round(float(x) / K * U, 1), round(float(y) / K * U, 1)] for x, y in a])
    return out
for name, ci in C.items():
    m = cls == ci
    if not m.any(): continue
    shapes.append({'cls': name, 'lv': -1, 'mean': int(L[m].mean()), 'rings': rings(m)})
    th = LEVELS[name]
    q = np.digitize(cv2.GaussianBlur(L, (0, 0), .8), th)
    for lv in range(len(th) + 1):
        mm = m & (q == lv)
        if mm.sum() < 6 * K * K: continue
        shapes.append({'cls': name, 'lv': lv, 'n': len(th) + 1, 'mean': int(L[mm].mean()), 'rings': rings(mm)})

# 发丝：头发里一缕缕的亮线（比周围亮），和发际外散出来的细黑丝（比背景暗），取中线成折线
from skimage.morphology import skeletonize
def polylines(mask, minlen):
    sk = skeletonize(mask)
    n, lab = cv2.connectedComponents(sk.astype(np.uint8), connectivity=8)
    out = []
    for i in range(1, n):
        ys, xs = np.nonzero(lab == i)
        if len(xs) < minlen * K: continue
        # 沿主方向排序，抽稀
        pts = np.stack([xs, ys], 1).astype(np.float32); c = pts.mean(0); u, sv, vt = np.linalg.svd(pts - c, full_matrices=False)
        if sv[1] / max(sv[0], 1e-3) > .12: continue      # 分叉、打卷的骨架不要（会走成锯齿）
        order = np.argsort((pts - c) @ vt[0]); pts = pts[order]
        keep = pts[:: max(1, 2 * K)]
        out.append([[round(float(x) / K * U, 1), round(float(y) / K * U, 1)] for x, y in keep])
    return out
hairM = cls == C['hair']
loc = cv2.GaussianBlur(L, (0, 0), 2.5 * K)
hi = cv2.erode(hairM.astype(np.uint8), np.ones((3 * K, 3 * K), np.uint8)).astype(bool) & (L > loc + 14) & (L > 30)
wisp = (~hairM) & (~skinR) & (L < loc - 25) & (L < 170) & (cls == -1)
strands = {'hi': polylines(hi, 6), 'wisp': polylines(wisp, 8)}

# 发丝走向场（结构张量），每 2 面板像素一格，角度 = 沿着发丝的方向（度）
g = cv2.GaussianBlur(L1, (0, 0), 1.0)
gx, gy = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
s = 3.0
jxx, jyy, jxy = [cv2.GaussianBlur(a, (0, 0), s) for a in (gx * gx, gy * gy, gx * gy)]
ang = .5 * np.arctan2(2 * jxy, jxx - jyy) + np.pi / 2
coh = np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2) / (jxx + jyy + 1e-3)
step = 2
field = {'step': step * U, 'w': W0 // step, 'h': H0 // step,
         'a': [int(round(np.degrees(ang[y, x]))) for y in range(0, H0 - step + 1, step) for x in range(0, W0 - step + 1, step)][: (W0 // step) * (H0 // step)],
         'c': [int(min(99, coh[y, x] * 100)) for y in range(0, H0 - step + 1, step) for x in range(0, W0 - step + 1, step)][: (W0 // step) * (H0 // step)]}
out = {'src': 'assets/ref/fangyuan.webp', 'box': BOX, 'U': U, 'w': W0 * U, 'h': H0 * U, 'shapes': shapes, 'field': field, 'strands': strands}
json.dump(out, open(os.path.join(ROOT, 'face/data/front.json'), 'w'), separators=(',', ':'))
# 检查图：类别图
pal = np.array([[30, 30, 40], [240, 200, 180], [120, 40, 40], [200, 200, 230], [250, 250, 200], [80, 160, 150]], np.uint8)
vis = np.full((H, W, 3), 255, np.uint8)
for ci in range(6): vis[cls == ci] = pal[ci]
Image.fromarray(vis).save(sys.argv[1] if len(sys.argv) > 1 else '/tmp/cls.png')
print('strands', len(strands['hi']), len(strands['wisp']), 'shapes', len(shapes), 'points', sum(len(r) for s in shapes for r in s['rings']), 'bytes', os.path.getsize(os.path.join(ROOT, 'face/data/front.json')))
