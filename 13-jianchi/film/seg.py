# 人物抠像（anime-seg isnetis / u2net_human_seg，onnxruntime CPU）
import onnxruntime as ort, numpy as np, cv2, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_s = {}
def _sess(name):
    if name not in _s:
        o = ort.SessionOptions(); o.intra_op_num_threads = 2
        _s[name] = ort.InferenceSession(os.path.join(ROOT, 'sucai/models', name + '.onnx'), o, providers=['CPUExecutionProvider'])
    return _s[name]

def mask(bgr, model='isnetis'):
    h, w = bgr.shape[:2]
    if model == 'isnetis':
        s = 1024; sc = s / max(h, w); nh, nw = int(h * sc), int(w * sc)
        img = np.zeros((s, s, 3), np.float32); ph, pw = (s - nh) // 2, (s - nw) // 2
        img[ph:ph + nh, pw:pw + nw] = cv2.resize(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB), (nw, nh)).astype(np.float32) / 255
        out = _sess(model).run(None, {_sess(model).get_inputs()[0].name: img.transpose(2, 0, 1)[None]})[0][0, 0]
        m = out[ph:ph + nh, pw:pw + nw]
    else:
        img = cv2.resize(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB), (320, 320)).astype(np.float32) / 255
        img = (img - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
        out = _sess(model).run(None, {_sess(model).get_inputs()[0].name: img.transpose(2, 0, 1)[None].astype(np.float32)})[0][0, 0]
        m = (out - out.min()) / (out.max() - out.min() + 1e-6)
    return np.clip(cv2.resize(m, (w, h)), 0, 1).astype(np.float32)
