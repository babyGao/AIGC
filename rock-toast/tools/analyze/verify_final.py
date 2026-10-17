# 校验成片完整性
import json
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'review/ghosting-fix'


def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams',
        '-show_format', '-of', 'json', str(path)]))


def main():
    film = json.loads((ROOT / 'paint/film.json').read_text(encoding='utf-8'))
    final = ROOT / 'rock-toast.mp4'; info = probe(final)
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    audio = next(s for s in info['streams'] if s['codec_type'] == 'audio')
    timeline, clips, allowed_black = 0., [], [(0., .2)]
    for i, shot in enumerate(film['seq']):
        path = ROOT / 'paint/out' / (shot['id'] + '.mp4' if 'id' in shot else f'black_{i}.mp4')
        stream = probe(path)['streams'][0]; duration = float(stream['duration'])
        if 'id' in shot:
            clips.append({'id': shot['id'], 'frames': int(stream['nb_frames']), 'fps': stream['avg_frame_rate']})
            assert stream['avg_frame_rate'] == '60/1'
        else:
            allowed_black.append((timeline - 1 / 60, timeline + duration + 1 / 60))
        timeline += duration
    allowed_black.append((timeline - 1.3, timeline + .1))
    assert abs(timeline - float(video['duration'])) < .02
    assert abs(float(audio['duration']) - float(video['duration'])) < .05
    assert video['width'] == 1080 and video['height'] == 1920 and video['avg_frame_rate'] == '60/1'
    times = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_frames', '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'json', str(final)]))
    stamps = np.array([float(f['best_effort_timestamp_time']) for f in times['frames']])
    steps = np.diff(stamps)
    assert np.all(np.abs(steps - 1 / 60) < 2e-6)
    subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(final), '-map', '0:v:0', '-an', '-f', 'null', '-'], check=True)
    cap = cv2.VideoCapture(str(final)); count, dark, rows = 0, [], []
    selected = set(np.linspace(0, len(stamps) - 1, 24).astype(int).tolist())
    for index in range(len(stamps)):
        ok, f = cap.read()
        if not ok:
            raise RuntimeError(f'Decode stopped at frame {index}')
        small = cv2.resize(f, (135, 240))
        if small.mean() < 3:
            t = index / 60
            if not any(a <= t <= b for a, b in allowed_black):
                dark.append(index)
        if index in selected:
            rows.append(Image.fromarray(cv2.cvtColor(small, cv2.COLOR_BGR2RGB)))
        count += 1
    cap.release(); assert not dark, f'Unexpected near-black frames: {dark}'
    assert count == int(video['nb_frames']) == len(stamps)
    canvas = Image.new('RGB', (135 * 12, 240 * 2))
    for i, image in enumerate(rows):
        canvas.paste(image, ((i % 12) * 135, (i // 12) * 240))
    canvas.save(OUT / 'final-overview.jpg', quality=92)
    result = {'frames': count, 'fps': 60, 'duration': float(video['duration']),
              'audio_duration': float(audio['duration']), 'decoded_without_error': True,
              'timestamp_step_min': float(steps.min()), 'timestamp_step_max': float(steps.max()),
              'unexpected_black_frames': dark, 'clips': clips}
    (OUT / 'final-check.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k != 'clips'}))


if __name__ == '__main__':
    main()
