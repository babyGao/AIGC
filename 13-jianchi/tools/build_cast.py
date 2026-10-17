# 从素材帧里抠出剪影用的角色 → sucai/cast/<名>.png（RGBA）
import sys, os, cv2, numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'film')); import seg
V = {'Z': 'BV1zLNd6ME7B', 'P': 'BV1PGp26cExn'}
# 名字: (素材, 秒, 裁切 x0,y0,x1,y1 归一化, 模型)
CAST = {
    'maoliqiu':   ('P', 17.0, (0.22, 0.02, 0.78, 0.98), 'u2net'),
    'maoliqiu2':  ('P', 13.5, (0.25, 0.05, 0.68, 0.95), 'u2net'),
    'xuehu':      ('P', 3.5, (0.0, 0.0, 0.85, 1.0), 'u2net'),
    'xian_l':     ('P', 17.0, (0.0, 0.25, 0.25, 0.95), 'u2net'),
    'xian_r':     ('P', 17.0, (0.74, 0.25, 0.98, 0.95), 'u2net'),
    'xian_c':     ('Z', 108.5, (0.4, 0.05, 0.64, 0.97), 'u2net_human_seg'),
    'xian_c2':    ('Z', 108.5, (0.6, 0.35, 0.85, 0.95), 'u2net_human_seg'),
}
os.makedirs(os.path.join(ROOT, 'sucai/cast'), exist_ok=True)
sheet = []
for name, (k, t, (x0, y0, x1, y1), mdl) in CAST.items():
    cap = cv2.VideoCapture(os.path.join(ROOT, 'sucai/videos', V[k] + '.mp4')); cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000); _, f = cap.read()
    h, w = f.shape[:2]; c = f[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]
    m = seg.mask(c, mdl)
    m = np.clip((m - 0.3) * 2.5, 0, 1)
    n, lab, st, _ = cv2.connectedComponentsWithStats((m > 0.5).astype(np.uint8))
    if n > 1:
        big = 1 + np.argmax(st[1:, 4]); m = m * (lab == big)
    cv2.imwrite(os.path.join(ROOT, 'sucai/cast', name + '.png'), np.dstack([c, (m * 255).astype(np.uint8)]))
    v = cv2.resize((np.dstack([m] * 3) * 255).astype(np.uint8), (240, 240)); sheet.append(np.hstack([cv2.resize(c, (240, 240)), v]))
cv2.imwrite(os.path.join(ROOT, 'out/cast.jpg'), np.vstack([np.hstack(sheet[i:i + 2]) if i + 1 < len(sheet) else np.hstack([sheet[i], np.zeros_like(sheet[i])]) for i in range(0, len(sheet), 2)]))
