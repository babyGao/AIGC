# 参考片运镜量化：逐镜跟踪特征点 → 每步相似变换（缩放/平移/旋转）→ 累计运镜、速度曲线、视差、对焦变化
# 运行：python -I tools/camstudy/cam.py  → research/refs/<片>/cam.json + research/refs/cam_all.json
import os, sys, json
import numpy as np, cv2
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REFS = os.path.join(ROOT, 'research', 'refs')
SR = 15                      # 每秒采样帧数
WS = 360                     # 分析宽度

def shots_of(d, dur):
    f = os.path.join(d, 'cuts.txt')
    cuts = [float(x) for x in open(f).read().split()] if os.path.exists(f) else []
    t = [0.0] + cuts + [dur]
    return [(t[i], t[i + 1]) for i in range(len(t) - 1)]

def step(a, b):
    """a→b 的相似变换 + 残差视差 + 前景/背景分离度"""
    pa = cv2.goodFeaturesToTrack(a, 300, .01, 7)
    if pa is None or len(pa) < 12: return None
    pb, st, _ = cv2.calcOpticalFlowPyrLK(a, b, pa, None, winSize=(21, 21), maxLevel=3)
    ok = st.ravel() == 1
    pa, pb = pa[ok].reshape(-1, 2), pb[ok].reshape(-1, 2)
    if len(pa) < 12: return None
    M, inl = cv2.estimateAffinePartial2D(pa, pb, method=cv2.RANSAC, ransacReprojThreshold=1.5)
    if M is None: return None
    s = float(np.hypot(M[0, 0], M[1, 0])); th = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
    pred = pa @ M[:, :2].T + M[:, 2]
    res = np.linalg.norm(pb - pred, axis=1)
    # 视差：上下两半分别拟合的平移差（推拉镜头靠缩放解释，横移镜头近大远小会留下差）
    h = a.shape[0]; top, bot = pa[:, 1] < h / 2, pa[:, 1] >= h / 2
    par = 0.0
    if top.sum() > 6 and bot.sum() > 6:
        dt = (pb[top] - pa[top]).mean(0); db = (pb[bot] - pa[bot]).mean(0)
        par = float(np.linalg.norm(dt - db))
    return dict(s=s, th=th, tx=float(M[0, 2] + (s - 1) * 0), ty=float(M[1, 2]), inl=float(inl.mean()), res=float(np.median(res)), par=par)

def sharp(g):
    h, w = g.shape; c = g[h // 4:3 * h // 4, w // 4:3 * w // 4]
    return float(cv2.Laplacian(c, cv2.CV_32F).var())

def analyze(name):
    d = os.path.join(REFS, name); cap = cv2.VideoCapture(os.path.join(d, 'video.mp4'))
    fps = cap.get(cv2.CAP_PROP_FPS); n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); dur = n / fps
    W0, H0 = cap.get(cv2.CAP_PROP_FRAME_WIDTH), cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    hs = int(round(WS * H0 / W0))
    frames, times = [], []
    k = max(1, int(round(fps / SR))); i = 0
    while True:
        ok = cap.grab()
        if not ok: break
        if i % k == 0:
            _, f = cap.retrieve(); g = cv2.cvtColor(cv2.resize(f, (WS, hs), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
            frames.append(g); times.append(i / fps)
        i += 1
    times = np.array(times); out = []
    shots = shots_of(d, dur)
    if len(shots) == 1:
        # 没有切点表：按相邻帧直方图突变自己切
        hs_ = [cv2.calcHist([g], [0], None, [32], [0, 256]).ravel() / g.size for g in frames]
        cuts = [times[j] for j in range(1, len(hs_)) if np.abs(hs_[j] - hs_[j - 1]).sum() > .5 and times[j] - (times[j - 1] if j else 0) > 0]
        cl = []
        for c in cuts:
            if not cl or c - cl[-1] > .4: cl.append(c)
        t = [0.0] + cl + [dur]; shots = [(t[i], t[i + 1]) for i in range(len(t) - 1)]
        open(os.path.join(d, 'cuts.txt'), 'w').write(chr(10).join(f'{c:.3f}' for c in cl))
    for si, (a, b) in enumerate(shots):
        idx = np.nonzero((times >= a + .04) & (times < b - .04))[0]
        if len(idx) < 4: continue
        steps, sh = [], [sharp(frames[j]) for j in idx]
        for j0, j1 in zip(idx[:-1], idx[1:]):
            r = step(frames[j0], frames[j1]); steps.append(r)
        good = [r for r in steps if r]
        if len(good) < 3: out.append(dict(i=si + 1, a=a, b=b, ok=False)); continue
        zs = np.array([np.log(r['s']) for r in good]); txs = np.array([r['tx'] for r in good]) / WS; tys = np.array([r['ty'] for r in good]) / WS
        ths = np.array([r['th'] for r in good])
        # 速度曲线（每秒的运动量，统一成画面宽度的比例）
        sp = np.abs(zs) * 1.0 + np.hypot(txs, tys)
        q = max(1, len(sp) // 5)
        prof = [float(sp[:q].mean()), float(sp[q:-q].mean()) if len(sp) > 2 * q else float(sp.mean()), float(sp[-q:].mean())]
        out.append(dict(i=si + 1, a=round(a, 2), b=round(b, 2), ok=True,
                        zoom=float(np.exp(zs.sum())), pan=float(-txs.sum()), tilt=float(-tys.sum()), roll=float(ths.sum()),
                        speed=float(sp.mean() * SR), cv=float(sp.std() / (sp.mean() + 1e-6)), prof=prof,
                        par=float(np.mean([r['par'] for r in good]) / WS * SR), res=float(np.mean([r['res'] for r in good])),
                        inl=float(np.mean([r['inl'] for r in good])), sharp=[round(min(sh), 1), round(max(sh), 1), round(sh[0], 1), round(sh[-1], 1)]))
    json.dump(out, open(os.path.join(d, 'cam.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(name, len(out), 'shots')
    return out

if __name__ == '__main__':
    names = sys.argv[1:] or sorted(n for n in os.listdir(REFS) if os.path.isdir(os.path.join(REFS, n)))
    allr = {n: analyze(n) for n in names}
    json.dump(allr, open(os.path.join(REFS, 'cam_all.json'), 'w', encoding='utf-8'), ensure_ascii=False)
