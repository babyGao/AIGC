# 核对旧位置残留
import importlib.util
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'review' / 'ghosting-fix'
spec = importlib.util.spec_from_file_location('motion_check', Path(__file__).with_name('motion_check.py'))
motion = importlib.util.module_from_spec(spec)
spec.loader.exec_module(motion)


def frame(path, index):
    cap = cv2.VideoCapture(str(path)); cap.set(cv2.CAP_PROP_POS_FRAMES, index)
    ok, image = cap.read(); cap.release()
    if not ok:
        raise RuntimeError(f'Missing frame {index}: {path}')
    return cv2.cvtColor(cv2.resize(image, (270, 480)), cv2.COLOR_BGR2RGB)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    film = json.loads((ROOT / 'paint/film.json').read_text(encoding='utf-8'))
    shot = next(s for s in film['seq'] if s.get('id') == 's09')
    cache = ROOT / 'paint/cache/s09'; meta = json.loads((cache / 'meta.json').read_text())
    index = 54; t = index / film['fps']; tau = t / shot['dur'] * (meta['n'] - 1)
    i, u = int(tau), tau % 1
    labels = [np.array(Image.open(cache / f'm{j:03d}.png').resize((270, 480), Image.Resampling.NEAREST))[..., 0] for j in [i, i + 1]]
    track = json.loads((cache / 'track.json').read_text())['falling']
    a, b = [np.vstack([np.array(track[j]).reshape(2, 3), [0, 0, 1]]) for j in [i, i + 1]]
    D = b @ np.linalg.inv(a); D[:2, 2] /= 4
    A = np.eye(3) * (1 - u) + D * u
    B = np.eye(3) * u + np.linalg.inv(D) * (1 - u)
    masks = [(label == 4).astype(np.uint8) for label in labels]
    expected = cv2.warpAffine(masks[0], A[:2], (270, 480)) | cv2.warpAffine(masks[1], B[:2], (270, 480))
    expected = cv2.dilate(expected, np.ones((5, 5), np.uint8))
    region = (masks[0] > 0) & (expected == 0)
    z, cx, cy, angle = motion.camera(t, shot)
    c, s = z * np.cos(angle), z * np.sin(angle)
    camera = np.array([[c, -s, 135 - c * cx + s * cy], [s, c, 240 - s * cx - c * cy]])
    before = frame(ROOT / 'out/archive/before-ghosting-20261017/shots/s09.mp4', index)
    after = frame(ROOT / 'paint/out/s09.mp4', index)
    measures = []
    for image in [before, after]:
        stable = cv2.warpAffine(image, camera, (270, 480), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
        r, g, b = stable.astype(float).transpose(2, 0, 1)
        warm = (r > 90) & (r > b * 1.5) & (g > 35)
        measures.append(int((warm & region).sum()))
    result = {'shot': 's09', 'frame': index, 'local_time': t, 'measurement_width': 270,
              'old_position_region_pixels': int(region.sum()), 'before_warm_pixels': measures[0],
              'after_warm_pixels': measures[1], 'reduction': 1 - measures[1] / max(1, measures[0]),
              'scope': 'Warm pixels in the vacated bread silhouette at one matched frame; not a whole-film percentage.'}
    (OUT / 'ghosting-metric.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    canvas = Image.new('RGB', (1080, 990), '#171717'); draw = ImageDraw.Draw(canvas)
    for x, image, name in [(0, before, 'BEFORE'), (540, after, 'AFTER')]:
        canvas.paste(Image.fromarray(image).resize((540, 960)), (x, 30))
        draw.text((x + 10, 7), f'{name}   t={t:.3f}s', fill='white')
    canvas.save(OUT / 's09-comparison-final.jpg', quality=94)
    print(json.dumps(result))


if __name__ == '__main__':
    main()
