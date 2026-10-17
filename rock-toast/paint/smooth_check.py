# 流畅度自检：逐帧算"光流解释不了的变化"（突然出现/消失的东西），看换原片的那几帧有没有比别的帧跳得多
# 运行：python -I paint/smooth_check.py s10 [s12 ...] [--dir out/v30]
import os, sys, json
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]; d = 'out'
if '--dir' in args: i = args.index('--dir'); d = args[i + 1]; del args[i:i + 2]
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)

def residual(path):
    cap = cv2.VideoCapture(path); G = []
    while True:
        ok, f = cap.read()
        if not ok: break
        G.append(cv2.cvtColor(cv2.resize(f, (270, 480)), cv2.COLOR_BGR2GRAY))
    h, w = G[0].shape; gx, gy = np.meshgrid(np.arange(w), np.arange(h))
    r = []
    for i in range(1, len(G)):
        fl = dis.calc(G[i - 1], G[i], None)
        wp = cv2.remap(G[i - 1], (gx - fl[..., 0]).astype(np.float32), (gy - fl[..., 1]).astype(np.float32), cv2.INTER_LINEAR)
        r.append(np.abs(G[i].astype(float) - wp.astype(float))[60:420, 20:250].mean())
    return np.array(r)

for sid in args:
    n = json.load(open(os.path.join(HERE, 'cache', sid, 'meta.json')))['n']
    r = residual(os.path.join(HERE, d, f'{sid}.mp4'))
    spf = len(r) / max(1, n - 1)
    hit = sorted(set(int(round(k * spf)) - 1 for k in range(1, n)))
    a = r[[h for h in hit if 0 <= h < len(r)]]; mask = np.ones(len(r), bool); mask[[h for h in hit if 0 <= h < len(r)]] = False; b = r[mask]
    # 跳变：比前后两帧平均高出多少
    jump = np.array([r[i] - (r[i - 1] + r[i + 1]) / 2 for i in range(1, len(r) - 1)])
    print(f'{sid} [{d}] 帧数 {len(r) + 1}  换片帧 {a.mean():.2f} / 其余 {b.mean():.2f}（倍数 {a.mean() / b.mean():.2f}）  平均 {r.mean():.2f}  最大单帧跳变 {jump.max():.2f}')
