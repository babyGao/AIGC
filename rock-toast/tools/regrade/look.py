# 米其林暗场调色：前景分割 → 背景压暗虚化 → 黑手套沉入暗部 → 食物提质感 → 暗角 → 裁切放大
# 作为模块被 film.py 调用；单独运行时对若干时间点出样帧：python -I look.py <src.mp4> <outdir> t1 t2 ...
import sys, os, numpy as np, cv2, onnxruntime as ort

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(os.path.dirname(HERE), 'models', 'isnet-general-use.onnx')
_sess = None

def seg(img):
    """前景概率（0..1，与 img 同尺寸）"""
    global _sess
    if _sess is None:
        so = ort.SessionOptions(); so.intra_op_num_threads = 12
        _sess = ort.InferenceSession(MODEL, so, providers=['CPUExecutionProvider'])
    x = cv2.resize(cv2.cvtColor(img, cv2.COLOR_BGR2RGB), (1024, 1024), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.
    x = (x - .5) / 1.0
    p = _sess.run(None, {_sess.get_inputs()[0].name: x.transpose(2, 0, 1)[None]})[0][0, 0]
    p = (p - p.min()) / max(1e-6, p.max() - p.min())
    return cv2.resize(p, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_LINEAR)

def ss(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def grade(img, m, o=None):
    """img BGR uint8；m 前景概率；o 每镜参数"""
    o = o or {}
    f = img.astype(np.float32) / 255.
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    S, Vv = hsv[..., 1] / 255., hsv[..., 2] / 255.
    # 前景蒙版：收紧 + 羽化
    mm = ss(o.get('m0', .18), o.get('m1', .6), m)
    mm = cv2.GaussianBlur(mm, (0, 0), o.get('feather', 5))
    # 黑手套 / 灰色杂物：低饱和的暗部压到全黑
    glove = (1 - ss(.08, .22, S)) * (1 - ss(.22, .5, Vv))
    # 背景：去色、压暗、虚化，留一点暖
    lum = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.
    bg = f * .35 + lum[..., None] * .65
    bg = cv2.GaussianBlur(bg, (0, 0), o.get('bgblur', 7)) * o.get('bgv', .16) * np.array([.82, .92, 1.08])
    # 前景：S 曲线、饱和、局部反差、暖高光
    fg = f.copy()
    loc = cv2.GaussianBlur(fg, (0, 0), 18); fg = np.clip(fg + (fg - loc) * o.get('clarity', .55), 0, 1)
    fg = fg ** o.get('gamma', 1.12)
    fg = fg * fg * (3 - 2 * fg) * .55 + fg * .45                     # 柔和 S 曲线
    g = fg.mean(2, keepdims=True); fg = np.clip(g + (fg - g) * o.get('sat', 1.18), 0, 1)
    fg *= np.array([.93, .99, 1.06]) ** o.get('warm', 1.0)              # BGR：偏暖
    fg *= (1 - .92 * glove)[..., None]
    out = bg * (1 - mm[..., None]) + fg * mm[..., None]
    # 高光辉光
    hi = np.clip(out - .78, 0, 1); out = out + cv2.GaussianBlur(hi, (0, 0), 14) * .6
    # 暗角（中心可偏移）
    H, W = m.shape; cx, cy = o.get('vc', (.5, .5))
    yy, xx = np.mgrid[0:H, 0:W]; d = np.sqrt(((xx / W - cx) * 1.1) ** 2 + ((yy / H - cy) * .62) ** 2)
    out *= (1 - o.get('vig', .55) * ss(.18, .75, d))[..., None]
    return np.clip(out * 255, 0, 255).astype(np.uint8)

def crop(img, box, W=1080, H=1920):
    """box = (cx, cy, h)：中心与高度（相对原图），输出 9:16"""
    ih, iw = img.shape[:2]; cx, cy, h = box
    ch = h * ih; cw = ch * W / H
    x0 = np.clip(cx * iw - cw / 2, 0, iw - cw); y0 = np.clip(cy * ih - ch / 2, 0, ih - ch)
    M = np.array([[W / cw, 0, -x0 * W / cw], [0, H / ch, -y0 * H / ch]], np.float32)
    out = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
    bl = cv2.GaussianBlur(out, (0, 0), 1.2); return cv2.addWeighted(out, 1.45, bl, -.45, 0)

def frame_at(path, t):
    cap = cv2.VideoCapture(path); cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000); ok, f = cap.read(); return f

if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
    for t in map(float, sys.argv[3:]):
        f = frame_at(src, t); m = seg(f); g = grade(f, m)
        cv2.imwrite(os.path.join(out, f'look_{t:.1f}.jpg'), np.hstack([f, g]), [cv2.IMWRITE_JPEG_QUALITY, 88])
        cv2.imwrite(os.path.join(out, f'mask_{t:.1f}.jpg'), (m * 255).astype(np.uint8))
        print('ok', t)
