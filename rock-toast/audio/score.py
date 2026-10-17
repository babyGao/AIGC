# 原创配乐：降 E 大调，90 拍/分，16 小节（≈42.7 秒）。竖琴琶音 + 颤音琴主旋律 + 大提琴拨奏/长音 + 钟琴点缀
# 运行：LIB 下的 .venv python，python audio/score.py  →  audio/music.wav
import os, sys, math
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar'))
sys.path.insert(0, LIB)
import numpy as np, soundfile as sf
from core.audio import sampler as S
from core.audio.sfx import SR

HERE = os.path.dirname(os.path.abspath(__file__))
BPM = 90; BEAT = 60 / BPM; BAR = BEAT * 4
b = lambda n: n * BEAT                       # 第 n 拍（0 起）
rnd = lambda s: (math.sin(s * 12.9898) * 43758.5453) % 1.0   # 与画面同一个伪随机
S.seed(7)

CH = {   # 和弦：低音、内声部
  'Eb9': (['Eb2', 'Bb2'], ['G3', 'Bb3', 'D4', 'F4', 'G4']),
  'Cm9': (['C2', 'G2'], ['Eb3', 'G3', 'Bb3', 'D4', 'G4']),
  'Ab7': (['Ab1', 'Eb2'], ['C3', 'Eb3', 'G3', 'C4', 'Eb4']),
  'Bbs': (['Bb1', 'F2'], ['F3', 'Ab3', 'C4', 'Eb4', 'F4']),
  'Fm9': (['F1', 'C2'], ['Ab3', 'C4', 'Eb4', 'G4']),
  'Db7': (['Db2', 'Ab2'], ['F3', 'Ab3', 'C4', 'F4']),
}
BARS = ['Eb9', 'Ab7', 'Eb9', 'Cm9', 'Ab7', 'Bbs', 'Fm9', 'Db7', 'Ab7', 'Eb9', 'Cm9', 'Ab7', 'Bbs', 'Eb9', 'Ab7', 'Eb9']
ev = []
E = lambda t, inst, p, d, v, pan=0, **k: ev.append(dict(t=t, inst=inst, pitch=p, dur=d, vel=v, pan=pan, **k))

for i, ch in enumerate(BARS):
    t0 = i * BAR; bass, inner = CH[ch]
    silent = (i == 13)                                   # 第 14 小节第一拍是静默，第二拍叉子落下
    # 竖琴琶音：八分音符上行，段落不同疏密
    if i in (0, 2, 5, 9, 10, 11, 12, 14, 15):
        n = 8 if i in (0, 9, 15) else 6
        for k in range(n):
            if i == 12 and k * BEAT / 2 > BAR - BEAT: break          # 糖浆小节末拍收住
            E(t0 + k * BEAT / 2, 'harp', inner[k % len(inner)], 1.6, .42 + .1 * (k == 0), -.25 + .08 * k)
    # 大提琴拨奏：第 1、3 拍（切面包到煎、装盘到淋酱）
    if 2 <= i <= 7 or 9 <= i <= 12:
        E(t0, 'cellos_pizz', bass[0].replace('1', '2') if bass[0].endswith('1') else bass[0], 1.2, .62, -.1)
        E(t0 + 2 * BEAT, 'cellos_pizz', bass[1], 1.0, .5, -.1)
    # 大提琴长音铺底
    if i in (0, 1, 5, 6, 7, 8, 13, 14, 15):
        st = t0 + (BEAT if silent else 0)
        dd = BAR - (BEAT if silent else 0) + (.3 if i < 15 else 1.8)
        vv = .3 if i == 8 else .42
        E(st, 'cellos', bass[1] if i != 8 else bass[0].replace('1', '2'), dd, vv, .15, attack=.5 if not silent else .08)
        if i in (6, 7, 13, 14, 15): E(st, 'cellos', inner[0], dd, vv * .8, .3, attack=.6 if not silent else .1)

# 颤音琴：工序段一个动作一个音；装盘与淋酱段唱主旋律
for t, p in [(b(12), 'G5'), (9.53, 'Bb5'), (10.48, 'C6'), (b(16), 'Eb6'), (b(18), 'D6'), (b(19), 'C6'), (b(20), 'Bb5'),
             (b(24) + .2, 'G4'), (b(26) + .2, 'Bb4'), (19.39, 'Eb5')]:
    E(t, 'vibraphone', p, 1.4, .55, .2)
theme = [(36, 'G5'), (37, 'Bb5'), (38, 'Eb6'), (39.5, 'D6'), (40, 'C6'), (41, 'Bb5'), (42, 'G5'), (44, 'Ab5'), (45, 'C6'), (46, 'Eb6'), (47, 'G6'),
         (48, 'F6'), (49, 'Eb6'), (50, 'D6')]
for n, p in theme: E(b(n), 'vibraphone', p, 1.6, .6, .15)
# 静默之后：叉子压下的那一拍，最温暖的和声
for n, p in [(53, 'Eb5'), (53, 'G5'), (54, 'Bb5'), (55, 'D6'), (57, 'C6'), (58, 'Eb6'), (60, 'G5'), (62, 'Bb5')]:
    E(b(n), 'vibraphone', p, 2.2, .5, .1)

# 钟琴：菜名亮起、立起、果粒落下、结尾
E(b(4), 'glockenspiel', 'Bb6', 2.5, .5, .25)
E(26.43, 'glockenspiel', 'G6', 2, .45, -.2)                        # 竖立那块靠上
E(b(62), 'glockenspiel', 'Eb7', 3, .42, .2)
for k, t in enumerate((30.1, 30.6, 31.2)): E(t, 'glockenspiel', ['G6', 'Bb6', 'Eb7'][k], 1.2, .26, (k - 1) * .3)   # 果酱落下

dur = b(64) + 2.5
mix = S.render([e for e in ev if not (b(51.5) < e['t'] < b(53) - .01)], dur=dur)
mix = S.room(mix, size=.5, mix=.22)
# 第 13 小节最后半拍到叉子落下：真静默（混响尾巴也切掉）
i0, i1 = int(b(51.5) * SR), int(b(53) * SR)
fade = np.linspace(1, 0, int(.12 * SR))[:, None]
mix[i0:i0 + len(fade)] *= fade; mix[i0 + len(fade):i1] = 0
sf.write(os.path.join(HERE, 'music.wav'), mix.astype(np.float32), SR)
print('music', mix.shape[0] / SR, 's  peak', float(np.abs(mix).max()))
print('\n'.join(S.credits(sorted({e['inst'] for e in ev}))))
