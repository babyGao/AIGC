# 拼成片：逐镜视频 + 黑场 → 画面；配上 audio/v2/mix.wav（−14 LUFS）→ rock-toast.mp4、rock-toast.srt、poster.jpg
# 运行：LIB 下的 .venv python，python paint/assemble.py   （先跑 paint/render.sh 出齐各镜）
import os, sys, json, subprocess, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar'))
FILM = json.load(open(os.path.join(HERE, 'film.json'), encoding='utf-8'))
FPS = FILM['fps']; OUT = os.path.join(HERE, 'out')
run = lambda *a: subprocess.run(list(a), check=True)

parts, t = [], 0.0
for k, s in enumerate(FILM['seq']):
    d = s.get('dur', s.get('black'))
    if 'id' in s: f = os.path.join(OUT, f"{s['id']}.mp4")
    else:
        f = os.path.join(OUT, f'black_{k}.mp4')
        run('ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'color=c=black:s=1080x1920:r={FPS}:d={d}', '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', f)
    if not os.path.exists(f): sys.exit(f'missing {f}: run paint/render.sh first')
    parts.append(f); t += d
# 统一重编码拼接（各镜帧数按时长取整，拼完总长与混音一致）
ins = sum((['-i', f] for f in parts), [])
fc = ''.join(f'[{i}:v]fps={FPS},format=yuv420p,setsar=1[v{i}];' for i in range(len(parts))) + ''.join(f'[v{i}]' for i in range(len(parts))) + f'concat=n={len(parts)}:v=1:a=0[out]'
video = os.path.join(OUT, 'video.mp4')
run('ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', fc, '-map', '[out]', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', str(FPS), video)
final = os.path.join(ROOT, 'rock-toast.mp4')
run('sh', os.path.join(LIB, 'core', 'render', 'mux.sh'), video, os.path.join(ROOT, 'audio', 'v2', 'mix.wav'), final, str(FPS), '0')
# 字幕：与画面上的旁白字幕同一时间线
V = FILM['vo']
cues = [{'t0': v['at'], 't1': min(v['at'] + v['dur'] + .25, V[k + 1]['at'] - .55) if k + 1 < len(V) else v['at'] + v['dur'] + .25, 'text': v['text'].rstrip('；;')} for k, v in enumerate(V)]
cues[0]['t1'] = min(cues[0]['t1'], FILM.get('intro', cues[0]['t1']))     # 开场旁白：字幕只到海报结束
cj = os.path.join(OUT, 'cues.json'); json.dump(cues, open(cj, 'w', encoding='utf-8'), ensure_ascii=False)
run(os.path.join(LIB, '.venv', 'Scripts', 'python.exe') if os.name == 'nt' else os.path.join(LIB, '.venv', 'bin', 'python'), os.path.join(LIB, 'core', 'render', 'srt.py'), cj, os.path.join(ROOT, 'rock-toast.srt'))
# 封面：开场海报那一帧
run('ffmpeg', '-v', 'error', '-y', '-ss', '1.9', '-i', final, '-frames:v', '1', '-q:v', '2', os.path.join(ROOT, 'poster.jpg'))   # 封面：开场海报
print('done', final, f'{t:.2f}s')
