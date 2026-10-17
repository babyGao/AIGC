# 自检：每镜等距抽 5 帧拼成一行 → review/paint/film/镜头总览.jpg；成片每 0.2 秒一帧的关键动作条 → 动作条_<镜>.jpg
# 运行：python -I paint/review.py [s01 ...]      或  python -I paint/review.py --final（检查成片：黑帧、坏帧）
import os, sys, json
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'review', 'paint', 'film'); os.makedirs(OUT, exist_ok=True)
def save(path, img, q=85):   # 中文文件名：cv2.imwrite 在 Windows 下会写成乱码
    open(path, 'wb').write(cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, q])[1].tobytes())

def frames(path):
    cap = cv2.VideoCapture(path); F = []
    while True:
        ok, f = cap.read()
        if not ok: break
        F.append(f)
    return F

if '--final' in sys.argv:
    F = frames(os.path.join(ROOT, 'rock-toast.mp4'))
    lum = np.array([f.mean() for f in F]); fps = json.load(open(os.path.join(HERE, 'film.json'), encoding='utf-8'))['fps']
    dark = [i / fps for i, l in enumerate(lum) if l < 3]
    print(len(F), 'frames', f'{len(F) / fps:.2f}s', 'near-black at', [round(x, 2) for x in dark[:5]], '...', len(dark), 'frames')
    idx = np.linspace(0, len(F) - 1, 24).astype(int)
    rows = [np.hstack([cv2.resize(F[i], (180, 320)) for i in idx[r * 12:(r + 1) * 12]]) for r in range(2)]
    save(os.path.join(OUT, '成片总览.jpg'), np.vstack(rows))
    sys.exit()
ids = sys.argv[1:] or [s['id'] for s in json.load(open(os.path.join(HERE, 'film.json'), encoding='utf-8'))['seq'] if 'id' in s]
rows = []
for sid in ids:
    p = os.path.join(HERE, 'out', f'{sid}.mp4')
    if not os.path.exists(p): continue
    F = frames(p); idx = np.linspace(0, len(F) - 1, 5).astype(int)
    row = np.hstack([cv2.resize(F[i], (216, 384)) for i in idx])
    cv2.putText(row, sid, (6, 24), cv2.FONT_HERSHEY_SIMPLEX, .8, (0, 255, 255), 2); rows.append(row)
    st = F[::max(1, len(F) // 12)][:12]
    save(os.path.join(OUT, f'动作条_{sid}.jpg'), np.hstack([cv2.resize(f, (180, 320)) for f in st]))
if rows: save(os.path.join(OUT, '镜头总览.jpg'), np.vstack(rows))
print(len(rows), 'shots')
