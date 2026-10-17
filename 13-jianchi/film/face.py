# 方源换脸：用网上流传最广的黑衣方源（用户参考图 + “仙尊悔而我不悔”封面）的五官身份，
# 替换素材视频里方源的脸（保留原视频的角度、表情、光影），之后再走漫画化。
import os, cv2, numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.path.join(ROOT, 'sucai/models')
# 只取“仙尊悔而我不悔”那张（用户参考图里的脸是手绘五官，换出来鼻尖会起色斑）
SRC = [os.path.join(ROOT, 'refs/fangyuan_black/01_BV1Pr4y1R7mo.jpg')]
_app = _sw = _src = _gfp = None
# GFPGAN 的 512 对齐模板（FFHQ）
FFHQ = np.float32([[0.37691676, 0.46864664], [0.62285697, 0.46912813], [0.50123859, 0.61331904], [0.39308822, 0.72541100], [0.61150205, 0.72490465]]) * 512

def _init():
    global _app, _sw, _src
    if _app is not None: return
    import insightface
    from insightface.app import FaceAnalysis
    _app = FaceAnalysis(name='buffalo_l', root=os.path.join(M, 'insightface'), allowed_modules=['detection', 'recognition'], providers=['CPUExecutionProvider'])
    _app.prepare(ctx_id=-1, det_size=(640, 640), det_thresh=0.3)
    _sw = insightface.model_zoo.get_model(os.path.join(M, 'inswapper_128.onnx'), providers=['CPUExecutionProvider'])
    embs = []; faces = []
    for p in SRC:
        img = cv2.imread(p) if not p.endswith('.webp') else cv2.cvtColor(np.asarray(__import__('PIL.Image', fromlist=['Image']).open(p).convert('RGB')), cv2.COLOR_RGB2BGR)
        big = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        for f in _app.get(big):
            embs.append(f.embedding / np.linalg.norm(f.embedding)); faces.append(f)
    e = np.mean(embs, 0); e /= np.linalg.norm(e)
    _src = faces[0]; _src.embedding = e * np.linalg.norm(faces[0].embedding)
    print('face sources', len(embs))

def restore(bgr, kps, blend=0.85):
    """GFPGAN 补细节：换脸只有 128 像素，近景放大会糊。"""
    global _gfp
    if _gfp is None:
        import onnxruntime as ort
        o = ort.SessionOptions(); o.intra_op_num_threads = 2
        _gfp = ort.InferenceSession(os.path.join(M, 'gfpgan_1.4.onnx'), o, providers=['CPUExecutionProvider'])
    A, _ = cv2.estimateAffinePartial2D(np.float32(kps), FFHQ, method=cv2.LMEDS)
    crop = cv2.warpAffine(bgr, A, (512, 512), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    x = (cv2.cvtColor(crop, cv2.COLOR_BGR2RGB).astype(np.float32) / 255 - 0.5) / 0.5
    y = _gfp.run(None, {'input': x.transpose(2, 0, 1)[None]})[0][0].transpose(1, 2, 0)
    y = cv2.cvtColor(((np.clip(y, -1, 1) + 1) / 2 * 255).astype(np.uint8), cv2.COLOR_RGB2BGR)
    m = np.zeros((512, 512), np.float32); cv2.ellipse(m, (256, 270), (190, 235), 0, 0, 360, 1, -1)
    m = cv2.GaussianBlur(m, (0, 0), 18) * blend
    Ai = cv2.invertAffineTransform(A); h, w = bgr.shape[:2]
    Y = cv2.warpAffine(y, Ai, (w, h), flags=cv2.INTER_CUBIC); Mk = cv2.warpAffine(m, Ai, (w, h))[..., None]
    return (bgr * (1 - Mk) + Y * Mk).astype(np.uint8)

def swap(bgr, min_size=40):
    """替换画面中所有足够大的人脸（调用处只对方源的镜头开），近景再做修复。"""
    _init()
    out = bgr
    for f in _app.get(bgr):
        x0, y0, x1, y1 = f.bbox
        if x1 - x0 < min_size: continue
        out = _sw.get(out, f, _src, paste_back=True)
        if x1 - x0 > 70: out = restore(out, f.kps)
    return out

def robe_black(bgr, person):
    """白衣压成黑袍：人物范围内、非皮肤、亮而不饱和的布料 → 压暗，保留褶皱明暗。"""
    ycc = cv2.cvtColor(bgr, cv2.COLOR_BGR2YCrCb); hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    skin = ((ycc[..., 1] > 135) & (ycc[..., 1] < 180) & (ycc[..., 2] > 80) & (ycc[..., 2] < 130)).astype(np.uint8)
    skin = cv2.dilate(skin, np.ones((9, 9), np.uint8))
    cloth = ((person > 0.4) & (skin == 0) & (hsv[..., 2] > 95) & (hsv[..., 1] < 80)).astype(np.float32)
    cloth = cv2.morphologyEx(cloth, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    cloth = cv2.GaussianBlur(cloth, (0, 0), 1.5)[..., None]
    v = bgr.astype(np.float32)
    dark = (v ** 1.6) / (255 ** 0.6) * 0.32 + 6          # 亮布 → 深布，褶皱的高光留一点
    return (v * (1 - cloth) + dark * cloth).astype(np.uint8)

def robe_mask_legs(bgr):
    """只拍腿/衣摆的镜头抠像会失败：布料＝亮、低饱和、表面平滑、从画面上沿垂下来的大块。"""
    h, w = bgr.shape[:2]
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    mu = cv2.blur(g, (9, 9)); sd = np.sqrt(np.maximum(cv2.blur(g * g, (9, 9)) - mu * mu, 0))
    cand = ((hsv[..., 2] > 85) & (hsv[..., 1] < 75) & (sd < 9)).astype(np.uint8)
    cand = cv2.morphologyEx(cand, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    cand = cv2.morphologyEx(cand, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(cand)
    m = np.zeros((h, w), np.float32)
    for i in range(1, n):
        x, y, ww, hh, a = st[i]
        if y <= 2 and a > 0.025 * h * w and hh > 0.25 * h: m[lab == i] = 1
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((21, 21), np.uint8))
    return m
