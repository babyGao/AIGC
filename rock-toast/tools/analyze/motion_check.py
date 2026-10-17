# 检查动态连续性
import hashlib
import json
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import binary_erosion

ROOT = Path(__file__).resolve().parents[2]
PAINT = ROOT / 'paint'
OUT = ROOT / 'review' / 'motion-check'
W, H = 270, 480


def probe(path, timestamps=False):
    args = ['ffprobe', '-v', 'error', '-select_streams', 'v:0']
    if timestamps:
        args += ['-show_frames', '-show_entries', 'frame=best_effort_timestamp_time']
    else:
        args += ['-show_streams', '-show_format']
    return json.loads(subprocess.check_output(args + ['-of', 'json', str(path)]))


def decode(path):
    process = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-threads', '2', '-i', str(path),
        '-vf', f'scale={W}:{H}', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    size = W * H * 3
    while True:
        data = process.stdout.read(size)
        if not data:
            break
        if len(data) != size:
            raise RuntimeError('Incomplete decoded frame')
        yield np.frombuffer(data, np.uint8).reshape(H, W, 3).copy()
    error = process.stderr.read().decode(errors='replace')
    if process.wait():
        raise RuntimeError(error)


def camera(t, shot):
    cam = shot.get('cam', {})
    tt = np.clip(t / cam.get('dur', shot['dur']), 0, 1)
    ease = {'linear': tt, 'inout': tt * tt * (3 - 2 * tt),
            'out': 1 - (1 - tt) ** 3, 'in': tt ** 3}[cam.get('ease', 'inout')]
    zs = cam.get('z', 1)
    if not isinstance(zs, list):
        zs = [zs, zs]
    z = zs[0] + (zs[1] - zs[0]) * ease
    if 'dur' in cam and t > cam['dur']:
        z *= 1 + cam.get('drift', .045) * (t - cam['dur']) / max(.1, shot['dur'] - cam['dur'])
    fx, fy = cam.get('f', [.5, .5])
    cx, cy = fx * W - (fx * W - W / 2) / z, fy * H - (fy * H - H / 2) / z
    cx += cam.get('dx', 0) * W * (ease - .5)
    cy += cam.get('dy', 0) * H * (ease - .5)
    rotation = cam.get('rot', [0, 0])
    angle = math.radians(rotation[0] + (rotation[1] - rotation[0]) * ease)
    for start in shot.get('shake', []):
        if t > start:
            elapsed = t - start
            amp = 22 * math.exp(-elapsed * 9) / 4
            cx += amp * math.sin(elapsed * 73)
            cy += amp * .7 * math.cos(elapsed * 61)
    return z, cx, cy, angle


def stabilize(frame, t, shot):
    z, cx, cy, angle = camera(t, shot)
    a, b = z * math.cos(angle), z * math.sin(angle)
    transform = (a, -b, W / 2 - a * cx + b * cy,
                 b, a, H / 2 - b * cx - a * cy)
    return np.asarray(Image.fromarray(frame).convert('L').transform(
        (W, H), Image.Transform.AFFINE, transform, Image.Resampling.BILINEAR
    ), np.float32)


def sheet(frames, indices, path, fps, label):
    canvas = Image.new('RGB', (W * len(indices), H + 34), '#171717')
    draw = ImageDraw.Draw(canvas)
    for j, index in enumerate(indices):
        canvas.paste(Image.fromarray(frames[index]), (j * W, 34))
        draw.text((j * W + 8, 4), f'{label}  f={index}  t={index / fps:.3f}s', fill='white')
    canvas.save(path, quality=92)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    film = json.loads((PAINT / 'film.json').read_text(encoding='utf-8'))
    keys = json.loads((PAINT / 'keys.json').read_text(encoding='utf-8'))
    final = probe(ROOT / 'rock-toast.mp4')
    times = np.array([float(f['best_effort_timestamp_time']) for f in
                      probe(ROOT / 'rock-toast.mp4', True)['frames']])
    step = np.diff(times)
    summary = {'final_video': {
        'frames': len(times), 'fps': final['streams'][0]['avg_frame_rate'],
        'duration': float(final['streams'][0]['duration']),
        'bit_rate': int(final['streams'][0]['bit_rate']),
        'timestamp_step_min': float(step.min()), 'timestamp_step_max': float(step.max()),
        'nonincreasing_timestamps': int((step <= 0).sum())}, 'shots': []}
    fps = film['fps']
    timeline = 0
    for shot in film['seq']:
        if 'id' not in shot:
            timeline += math.ceil(shot['black'] * fps) / fps
            continue
        sid = shot['id']
        cache = PAINT / 'cache' / sid
        meta = json.loads((cache / 'meta.json').read_text())
        frames = list(decode(PAINT / 'out' / f'{sid}.mp4'))
        n = meta['n']
        lab = np.array(Image.open(cache / 'm000.png').resize((W, H), Image.Resampling.NEAREST))[..., 0]
        roi = binary_erosion(lab > 0, iterations=3)
        roi[385:415] = False
        roisize = int(roi.sum())
        source_hashes = [hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(cache.glob('f*.jpg'))]
        unique = len(set(source_hashes))
        rawdiff, residual = [], []
        previous = None
        for i, frame in enumerate(frames):
            stabilized = stabilize(frame, i / fps, shot)
            if i:
                rawdiff.append(float(np.abs(frame.astype(np.float32) - frames[i - 1]).mean()))
                residual.append(float(np.abs(stabilized - previous)[roi].mean()) if roisize else 0)
            previous = stabilized
        residual = np.array(residual)
        boundaries = [int(math.ceil(k * shot['dur'] * fps / (n - 1)))
                      for k in range(1, n - 1)] if n > 1 else []
        near = np.zeros(len(residual), bool)
        for boundary in boundaries:
            near[max(0, boundary - 2):min(len(near), boundary + 1)] = True
        jumps = np.argsort(residual)[-5:][::-1] + 1
        row = {'id': sid, 'start': round(timeline, 5), 'duration': shot['dur'],
               'frames': len(frames), 'source_frames': n, 'unique_source_jpegs': unique,
               'source_updates_per_second': round((n - 1) / shot['dur'], 3),
               'slowdown': round(shot['dur'] / ((n - 1) / 30), 3) if n > 1 else None,
               'exact_duplicate_adjacent_frames': int(sum(np.array(rawdiff) == 0)),
               'camera_compensated_mean_abs_difference': round(float(residual.mean()), 4),
               'camera_compensated_p95_abs_difference': round(float(np.percentile(residual, 95)), 4),
               'boundary_mean_abs_difference': round(float(residual[near].mean()), 4) if near.any() else None,
               'other_mean_abs_difference': round(float(residual[~near].mean()), 4) if (~near).any() else None,
               'largest_change_frames': jumps.tolist(),
               'fixed_manual_lines': len(keys[sid].get('lines', [])),
               'tracked_parts': shot.get('track', []), 'mask_changes': []}
        previous_label = None
        for path in sorted(cache.glob('m*.png')):
            label = np.array(Image.open(path).resize((W, H), Image.Resampling.NEAREST))[..., 0]
            if previous_label is not None:
                union = (label > 0) | (previous_label > 0)
                row['mask_changes'].append(round(float((label != previous_label)[union].mean()), 6))
            previous_label = label
        summary['shots'].append(row)
        print(json.dumps({k: v for k, v in row.items() if k != 'mask_changes'}), flush=True)
        if sid in ('s04', 's10', 's13'):
            peak = int(jumps[0])
            indices = list(range(max(0, min(len(frames) - 6, peak - 3)), max(0, min(len(frames) - 6, peak - 3)) + 6))
            sheet(frames, indices, OUT / f'{sid}-consecutive.jpg', fps, sid)
            indices = np.linspace(0, len(frames) - 1, 6).astype(int).tolist()
            sheet(frames, indices, OUT / f'{sid}-action.jpg', fps, sid)
            source_frames = [np.array(Image.open(p).convert('RGB').resize((W, H)))
                             for p in sorted(cache.glob('f*.jpg'))]
            indices = np.linspace(0, n - 1, min(n, 6)).astype(int).tolist()
            sheet(source_frames, indices, OUT / f'{sid}-source.jpg', 30, sid)
        timeline += len(frames) / fps
    summary['assembled_duration_from_shots'] = timeline
    (OUT / 'metrics.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(summary['final_video']), flush=True)


if __name__ == '__main__':
    main()
