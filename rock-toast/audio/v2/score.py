# 原创配乐（第二版，油画片）：降 E 大调，88 拍/分，约 37.5 秒。竖琴琶音 + 颤音琴 + 大提琴拨奏/长音 + 钟琴点缀
# 结构跟画面走：钩子 → 备料（一个动作一个音）→ 煎 → 淋酱（主旋律）→ 一拍真静默 → 叉子落下后最暖的和声 → 片名、收尾
# 运行：LIB 下的 .venv python，python audio/v2/score.py  →  audio/v2/music.wav
import os, sys, json, math
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar'))
sys.path.insert(0, LIB)
import numpy as np, soundfile as sf
from core.audio import sampler as S
from core.audio.sfx import SR

HERE = os.path.dirname(os.path.abspath(__file__))
BPM = 88; BEAT = 60 / BPM; BAR = BEAT * 4
SIL = (36 * BEAT, 37 * BEAT)                 # 第 37 拍：真静默（24.54–25.23 秒）
S.seed(7)

CH = {   # 和弦：低音、内声部
  'Eb9': (['Eb2', 'Bb2'], ['G3', 'Bb3', 'D4', 'F4', 'G4']),
  'Cm9': (['C2', 'G2'], ['Eb3', 'G3', 'Bb3', 'D4', 'G4']),
  'Ab7': (['Ab1', 'Eb2'], ['C3', 'Eb3', 'G3', 'C4', 'Eb4']),
  'Bbs': (['Bb1', 'F2'], ['F3', 'Ab3', 'C4', 'Eb4', 'F4']),
  'Fm9': (['F1', 'C2'], ['Ab3', 'C4', 'Eb4', 'G4']),
}
# 静默前 9 小节（0–36 拍），静默后从第 37 拍起 5 小节
PRE = ['Eb9', 'Ab7', 'Eb9', 'Cm9', 'Ab7', 'Bbs', 'Eb9', 'Cm9', 'Bbs']
POST = ['Eb9', 'Ab7', 'Fm9', 'Bbs', 'Eb9']
bars = [(i * BAR, c, i) for i, c in enumerate(PRE)] + [(37 * BEAT + j * BAR, c, 9 + j) for j, c in enumerate(POST)]
ev = []
E = lambda t, inst, p, d, v, pan=0, **k: ev.append(dict(t=t, inst=inst, pitch=p, dur=d, vel=v, pan=pan, **k))
up = lambda n: n.replace('1', '2') if n.endswith('1') else n

for t0, ch, i in bars:
    bass, inner = CH[ch]
    # 竖琴琶音：钩子、淋酱段、静默后的段落密一些；备料段稀
    if i in (0, 1, 5, 6, 7, 9, 10, 11, 12, 13):
        n = 8 if i in (0, 6, 9, 13) else 6
        for k in range(n):
            if i == 8: break
            E(t0 + k * BEAT / 2, 'harp', inner[k % len(inner)], 1.6, .4 + .1 * (k == 0), -.25 + .08 * k)
    # 大提琴拨奏：备料到煎（第 2–5 小节），一拍一拍往前推
    if 1 <= i <= 4:
        E(t0, 'cellos_pizz', up(bass[0]), 1.2, .6, -.1)
        E(t0 + 2 * BEAT, 'cellos_pizz', bass[1], 1.0, .5, -.1)
    # 大提琴长音铺底
    if i in (0, 5, 6, 7, 8, 9, 10, 11, 12, 13):
        dd = BAR + (.3 if i < 13 else 3.5)
        if i == 8: dd = BAR - .15                                     # 静默前收住
        E(t0, 'cellos', bass[1], dd, .4, .15, attack=.5 if i != 9 else .06)
        if i in (6, 7, 8, 9, 12, 13): E(t0, 'cellos', inner[0], dd, .32, .3, attack=.6 if i != 9 else .08)

# 颤音琴：备料段一个动作一个音（牛奶、蛋黄、搅拌、淋蛋液、下锅、翻面、落盘）
for t, p in [(5.5, 'G5'), (7.83, 'Bb5'), (8.2, 'C6'), (9.6, 'Eb6'), (11.6, 'D6'), (12.95, 'Bb5'), (16.2, 'G5')]:
    E(t, 'vibraphone', p, 1.4, .55, .2)
# 淋酱段主旋律（第 7–9 小节）
theme = [(24, 'G5'), (25, 'Bb5'), (26, 'Eb6'), (27.5, 'D6'), (28, 'C6'), (29, 'Bb5'), (30, 'G5'), (32, 'Ab5'), (33, 'C6'), (34, 'Eb6'), (35, 'F6')]
for n, p in theme: E(n * BEAT, 'vibraphone', p, 1.6, .58, .15)
# 静默之后：叉子压下的那一拍，最温暖的和声
for n, p in [(37, 'Eb5'), (37, 'G5'), (38, 'Bb5'), (39, 'D6'), (41, 'C6'), (42, 'Eb6'), (44, 'G5'), (46, 'Bb5')]:
    E(n * BEAT, 'vibraphone', p, 2.2, .5, .1)
# 钟琴：暗处亮起、片名扫光、结尾
E(.7, 'glockenspiel', 'Bb6', 2.5, .48, .25)
E(31.55, 'glockenspiel', 'G6', 2.2, .42, -.2); E(32.2, 'glockenspiel', 'Bb6', 2.2, .38, .1); E(32.85, 'glockenspiel', 'Eb7', 3, .4, .25)
E(35.3, 'glockenspiel', 'Eb7', 3, .34, .2)

dur = 37.5 + 2.5
mix = S.render([e for e in ev if not (SIL[0] - .2 < e['t'] < SIL[1] - .01)], dur=dur)
mix = S.room(mix, size=.5, mix=.22)
# 静默那一拍：连混响尾巴一起切掉
i0, i1 = int(SIL[0] * SR), int(SIL[1] * SR)
fade = np.linspace(1, 0, int(.12 * SR))[:, None]
mix[i0:i0 + len(fade)] *= fade; mix[i0 + len(fade):i1] = 0
sf.write(os.path.join(HERE, 'music.wav'), mix.astype(np.float32), SR)
print('music', mix.shape[0] / SR, 's  peak', float(np.abs(mix).max()))
print('\n'.join(S.credits(sorted({e['inst'] for e in ev}))))
