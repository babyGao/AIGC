# 动态镜头预处理：原片片段 → 防抖锁定到关键帧 → 逐帧分区/留用/光照图 → 帧间光流（笔触跟着画面走）
# 运行：python -I paint/prep_shot.py [s01 s02 ...]   输出 paint/cache/<镜头>/
#   f###.jpg 画布坐标的原片帧；m###.png（R 分区 G 留用 B 轮廓光）；x###.png（R 接触阴影 G 镜面高光 B 玻璃高光）
#   v###.bin 第 ### 帧到下一帧的光流（画布坐标，1/4 分辨率，int16，单位 1/8 像素）；meta.json
import os, sys, json, time
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import masks as MK
FPS, FQ = 30, 4                                  # 原片帧率；光流降采样倍数
FILM = json.load(open(os.path.join(HERE, 'film.json'), encoding='utf-8'))
SEQ = {s['id']: s for s in FILM['seq'] if 'id' in s}
CACHE = os.path.join(HERE, 'cache')

def read_frames(a, b):
    cap = cv2.VideoCapture(os.path.join(HERE, '..', '1.mp4'))
    i0, i1 = int(round(a * FPS)), int(round(b * FPS))
    cap.set(cv2.CAP_PROP_POS_FRAMES, i0); out = []
    for i in range(i0, i1 + 1):
        ok, f = cap.read()
        if not ok: break
        out.append(f)
    return out, i0

def sim_step(a, b, mask):
    """a 帧坐标 → b 帧坐标的相似变换（只用静止部分上的特征点）"""
    ga, gb = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), cv2.cvtColor(b, cv2.COLOR_BGR2GRAY)
    pa = cv2.goodFeaturesToTrack(ga, 400, .01, 8, mask=mask)
    I = np.eye(3)
    if pa is None or len(pa) < 10: return I
    pb, st, _ = cv2.calcOpticalFlowPyrLK(ga, gb, pa, None, winSize=(25, 25), maxLevel=3)
    ok = st.ravel() == 1
    if ok.sum() < 10: return I
    M, _ = cv2.estimateAffinePartial2D(pa[ok], pb[ok], method=cv2.RANSAC, ransacReprojThreshold=1.5)
    if M is None: return I
    return np.vstack([M, [0, 0, 1]])

def apply(T, pts):
    p = np.array(pts, np.float64); return (p @ T[:2, :2].T + T[:2, 2]).tolist()

def prep(sid):
    t0 = time.time()
    sh, k = SEQ[sid], MK.KEYS[sid]
    out = os.path.join(CACHE, sid); os.makedirs(out, exist_ok=True)
    for f in os.listdir(out): os.remove(os.path.join(out, f))
    if sh.get('still'):
        a = b = k['t']
    else: a, b = sh['src']
    frames, i0 = read_frames(a, b)
    n = len(frames); ki = int(np.clip(round(k['t'] * FPS) - i0, 0, n - 1))
    h, w = frames[0].shape[:2]
    names = [p['name'] for p in k['parts']]
    # —— 防抖：静止部分（盘子、砧板…）的特征点，把每一帧锁回关键帧的位置 ——
    stab = np.zeros((h, w), np.uint8)
    for nm in sh.get('stab', []):
        if nm in names: stab |= MK.poly_mask((h, w), k['parts'][names.index(nm)]['poly'])
    if not stab.any(): stab[:] = 1
    for o in k.get('omit', []):
        if 'poly' in o: stab[MK.poly_mask((h, w), o['poly']) > 0] = 0
    T = [np.eye(3) for _ in range(n)]
    for i in range(ki + 1, n): T[i] = T[i - 1] @ sim_step(frames[i], frames[i - 1], stab)
    for i in range(ki - 1, -1, -1): T[i] = T[i + 1] @ sim_step(frames[i], frames[i + 1], stab)
    S = [cv2.warpAffine(f, Ti[:2], (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE) for f, Ti in zip(frames, T)]
    # —— 会动的物体（刀、勺、叉、下落的面包）：用它身上的特征点估计整体位移，外形跟着走 ——
    R = {}
    tracked = [('p', names.index(nm)) for nm in sh.get('track', []) if nm in names] + [('o', j) for j in sh.get('trackOmit', [])]
    for kind, j in tracked:
        poly = k['parts'][j]['poly'] if kind == 'p' else k['omit'][j]['poly']
        Rj = [np.eye(3) for _ in range(n)]
        for rng, step in ((range(ki + 1, n), -1), (range(ki - 1, -1, -1), 1)):
            for i in rng:
                prev = i + step
                m = MK.poly_mask((h, w), apply(Rj[prev], poly)); m = cv2.erode(m, MK.ellipse_kernel(4))
                Rj[i] = sim_step(S[prev], S[i], m) @ Rj[prev]
        R[(kind, j)] = Rj
    # —— 逐帧：分区、留用、光照图 ——
    for i in range(n):
        polys = {j: apply(R[('p', j)][i], k['parts'][j]['poly']) for kind, j in R if kind == 'p'}
        omits = {j: apply(R[('o', j)][i], k['omit'][j]['poly']) for kind, j in R if kind == 'o'}
        lab, omit = MK.segment(S[i], k, polys, omits, fast=not sh.get('still'))
        F = MK.frame_maps(S[i], lab, omit, k)
        cv2.imwrite(os.path.join(out, f'f{i:03d}.jpg'), F['raw'], [cv2.IMWRITE_JPEG_QUALITY, 93])
        cv2.imwrite(os.path.join(out, f'm{i:03d}.png'), np.dstack([F['rim'], F['V'], F['L']]))       # BGR 顺序：R=分区 G=留用 B=轮廓光
        cv2.imwrite(os.path.join(out, f'x{i:03d}.png'), np.dstack([F['hi'], F['spec'], F['ao']]))    # R=接触阴影 G=镜面高光 B=玻璃高光
    json.dump({'n': n, 'key': ki, 'i0': i0, 'fq': FQ, 'qw': MK.W // FQ, 'qh': MK.H // FQ}, open(os.path.join(out, 'meta.json'), 'w'))
    # 会动的物体：每帧的整体变换（画布坐标），笔触整体跟着它平滑移动，不靠逐点光流
    C3 = np.vstack([MK.crop_matrix(k), [0, 0, 1]]); Ci = np.linalg.inv(C3)
    trk = {k['parts'][j]['name']: [(C3 @ R[(kind, j)][i] @ Ci)[:2].ravel().tolist() for i in range(n)] for kind, j in R if kind == 'p'}
    json.dump(trk, open(os.path.join(out, 'track.json'), 'w'))
    flows(sid)
    shake = max(np.hypot(Ti[0, 2], Ti[1, 2]) for Ti in T)
    print(sid, n, 'frames', f'max shake {shake:.1f}px', f'{time.time() - t0:.0f}s')

def flows(sid):
    """帧间光流（画布坐标）。空间平滑 + 前后帧平滑 + 微小运动归零：静止的盘子、砧板上的笔不会自己蠕动"""
    out = os.path.join(CACHE, sid); meta = json.load(open(os.path.join(out, 'meta.json'))); n = meta['n']
    qw, qh = MK.W // FQ, MK.H // FQ
    small = [cv2.cvtColor(cv2.resize(cv2.imread(os.path.join(out, f'f{i:03d}.jpg')), (qw, qh), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY) for i in range(n)]
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    raw = [cv2.GaussianBlur(dis.calc(small[i], small[i + 1], None), (0, 0), 1.6) * FQ for i in range(n - 1)]
    for i in range(n - 1):
        a, b = raw[max(0, i - 1)], raw[min(n - 2, i + 1)]
        fl = raw[i] * .5 + a * .25 + b * .25
        mag = np.hypot(fl[..., 0], fl[..., 1])[..., None]
        fl = fl * np.clip((mag - .25) / .35, 0, 1)
        np.clip(fl * 8, -32767, 32767).astype('<i2').tofile(os.path.join(out, f'v{i:03d}.bin'))

if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == '--flow':
        for s in (args[1:] or [x for x in SEQ if not SEQ[x].get('still')]): flows(s); print(s, 'flow')
    else:
        for s in (args or list(SEQ)): prep(s)
