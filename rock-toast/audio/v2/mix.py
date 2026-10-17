# 混音（第二版，油画片）：程序拟音（按 paint/film.json 的时间线）+ 旁白 + 配乐（旁白下自动压低）→ audio/v2/mix.wav
# 运行：LIB 下的 .venv python，python audio/v2/mix.py
import os, sys, json, math
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar'))
sys.path.insert(0, LIB)
import numpy as np, soundfile as sf
from scipy.ndimage import uniform_filter1d
from core.audio.sfx import SR, t_, env_exp, bp, lp, hp, norm, brown, add, compress, limit

HERE = os.path.dirname(os.path.abspath(__file__))
FILM = json.load(open(os.path.join(HERE, '..', '..', 'paint', 'film.json'), encoding='utf-8'))
T, t = {}, 0.0
for s in FILM['seq']:
    if 'id' in s: T[s['id']] = t
    t += s.get('dur', s.get('black', 0))
DUR = t; BEAT = 60 / FILM['bpm']
INTRO = FILM.get('intro', 0)                       # 开场海报的时长：配乐整体往后挪这么多
SIL = (INTRO + 36 * BEAT, INTRO + 37 * BEAT)       # 高潮前一拍真静默
R = np.random.default_rng(11)
noise = lambda d: R.standard_normal(int(round(d * SR)))
buf = np.zeros((int((DUR + .5) * SR), 2))

# —— 拟音积木 ——
def fadeio(x, a=.01, z=.03):
    n, m = int(a * SR), int(z * SR); x = x.copy()
    if n: x[:n] *= np.linspace(0, 1, n)
    if m: x[-m:] *= np.linspace(1, 0, m)
    return x
def crunch(d=.28, v=1.):          # 刀刮面包皮、叉子压破外壳
    x = bp(noise(d), 1400, 6500) * (.4 + .6 * np.abs(np.sin(np.pi * t_(d) / d)))
    k = np.zeros_like(x); idx = R.integers(0, len(x), 60); k[idx] = R.uniform(-1, 1, 60)
    return fadeio(norm(x * .6 + hp(k, 2500) * 1.4) * v)
def pour(d, lo=250, hi=1600, v=1., rate=9):   # 液体倒入
    tt = t_(d); am = .55 + .45 * np.sin(2 * np.pi * rate * tt + 3 * np.sin(2 * np.pi * 1.7 * tt)) * (.6 + .4 * R.random())
    return fadeio(norm(bp(noise(d), lo, hi) * am) * v, .08, .25)
def plop(v=1., f=210, d=.35):    # 蛋黄、果酱落下
    tt = t_(d)
    body = np.sin(2 * np.pi * f * tt * (1 - .45 * tt / d)) * env_exp(d, d / 7)
    spl = bp(noise(d), 900, 4200) * env_exp(d, d / 8)
    return norm(body + .55 * spl) * v
def swish(v=1.):                 # 搅拌一下
    d = .3; return fadeio(norm(bp(noise(d), 450, 2600) * np.sin(np.pi * t_(d) / d) ** 2) * v)
def sizzle(d, v=1., dens=900):   # 油煎
    x = bp(noise(d), 3000, 9000) * .35
    n = int(dens * d); k = np.zeros(int(round(d * SR))); idx = R.integers(0, len(k), n); k[idx] = R.uniform(-1, 1, n) * R.uniform(.2, 1, n) ** 2
    x += hp(k, 1800) * 2.2
    am = 1 + .25 * uniform_filter1d(noise(d), int(.08 * SR)) * 6
    return fadeio(norm(x * am) * v, .2, .4)
def thud(v=1., f=95):            # 落在石盘 / 锅里 / 砧板
    d = .25; tt = t_(d)
    return norm(np.sin(2 * np.pi * f * tt) * env_exp(d, .045) + .3 * lp(noise(d), 900) * env_exp(d, .02)) * v
def plink(v=1., f=1400):         # 液滴
    d = .14; tt = t_(d)
    return norm(np.sin(2 * np.pi * f * tt * (1 - .35 * tt / d)) * env_exp(d, .025) + .2 * bp(noise(d), 2000, 6000) * env_exp(d, .008)) * v
def whoom(d=1.2, v=1.):          # 暗处亮起、镜头拉开
    tt = t_(d); return fadeio(norm(lp(noise(d), 260) * np.sin(np.pi * tt / d) ** 1.5) * v, .2, .4)
def shimmer(d=1.4, v=1.):        # 片名扫光
    tt = t_(d); x = np.zeros_like(tt)
    for k in range(8):
        f0 = 1800 * 2 ** (k / 2.4); x += bp(noise(d), f0, f0 * 1.25) * np.exp(-((tt / d - k / 8) / .14) ** 2)
    x += .25 * sum(np.sin(2 * np.pi * f * tt) for f in (2760, 4140, 5390)) * np.sin(np.pi * tt / d) ** 2
    return fadeio(norm(x) * v, .1, .3)
def tear(d=.9, v=1.):            # 柔软面包芯撕开
    return fadeio(norm(lp(noise(d), 1600) * (.3 + .7 * np.abs(uniform_filter1d(noise(d), int(.03 * SR))) * 8)) * v, .02, .3)

S = lambda x, at, g=1., p=0.: add(buf, x, at, g, p)

# —— 按画面时间线落拟音（时间 = 镜头起点 + 镜内偏移）——
# —— 开场海报：吸气式上扬 → 两记重击（大字砸下、副标炸开）→ 熔岩低吼、火星噼啪 ——
from core.audio.sfx import crash, whoosh, rumble
def boom(v=1.):                  # 低频重击：下扫的正弦 + 噪声冲击
    d = 1.4; tt = t_(d)
    sub = np.sin(2 * np.pi * (42 + 70 * np.exp(-tt * 9)) * tt) * env_exp(d, .35)
    return norm(sub + .5 * lp(noise(d), 300) * env_exp(d, .12) + .35 * bp(noise(d), 800, 5000) * env_exp(d, .04)) * v
def riser(d=.5):                 # 冲击前的上扬吸气声
    tt = t_(d); return fadeio(norm(bp(noise(d), 600, 6000) * (tt / d) ** 2.2), .02, .01)
for st in FILM['seq'][0].get('shake', []): S(boom(), st, .9); S(crash(), st, .25, .1)
S(riser(.14), 0, .35)
S(fadeio(lp(noise(INTRO + .4), 180) * (.6 + .4 * np.sin(2 * np.pi * 1.3 * t_(INTRO + .4)))), .1, .22)   # 熔岩低吼
S(sizzle(INTRO, .8, 260), .1, .16, .2)                               # 火星噼啪
S(whoosh(.45), INTRO - .3, .35)                                     # 甩进下一镜

S(whoom(1.4), T['s01'], .25)                                      # 暗处亮起
S(pour(3.2, 700, 3000, .5, 14), T['s01'] + .2, .22, .25)          # 钩子：枫糖细流、果酱下挂
for k, at in enumerate([.9, 1.7, 2.5]): S(plink(.6, 1700 - k * 90), T['s01'] + at, .2, .2)
S(whoom(.7, .6), T['s02'] - .5, .18)                              # 黑场呼吸
S(crunch(.45), T['s02'] + .35, .55, .15)                          # 一刀切进面包皮
S(thud(.8, 120), T['s02'] + .85, .4)                              # 刀碰到砧板
S(pour(1.3, 300, 1900, 1., 8), T['s03'] + .05, .55, .1)           # 倒牛奶
S(plop(1., 170, .6), T['s05'] - .06, .7, .05)                    # 蛋黄落进牛奶：画面切走的那一刻听到（慢放，声音拉长压低）
for k in range(2): S(swish(), T['s05'] + .25 + k * .55, .2, .2 * (-1) ** k)   # 勺子在蛋液里轻轻一转
S(pour(2.0, 160, 1100, 1., 5), T['s06'] + .05, .6, .1)            # 淋蛋液（更稠更低）
S(sizzle(.6, .5, 300), T['s07'] - BEAT / 2, .15)                  # 油热的声音提前半拍进来
S(sizzle(T['s09'] - T['s07'], 1.), T['s07'], .4)                  # 煎的嗞嗞声
S(sizzle(1.2, 1., 2500), T['s08'], .3)                            # 翻面后更密
S(thud(.9, 100), T['s09'] + 1.21, .55, .05)                        # 第二块落盘
S(pour(2.6, 180, 1300, 1., 4), T['s10'] + .1, .42, .05)           # 花生奶油酱
for k, f in enumerate((.5, .8)): S(plop(.8, 150 - 20 * k), T['s11'] + f * 2.73, .45, .1 * k)   # 果酱落下
S(pour(2.6, 900, 3600, .4, 16), T['s12'] + .05, .2, .1)           # 枫糖细流
for f in (.35, .6, .85): S(plink(.5, 1900), T['s12'] + f * 2.73, .16, .15)
S(crunch(.22, 1.), T['s13'] + .05, .8); S(thud(.8, 70), T['s13'] + .05, .5)   # 静默后的第一个声音：叉子压下
S(tear(1.2), T['s13'] + .3, .4)
S(whoom(1.6, 1.), T['s14'], .3)                                   # 拉开看全貌
S(shimmer(1.5), FILM['title']['at'] - .05, .3, -.1)               # 片名扫光

# 房间底噪（静默里切掉）
room = hp(brown(len(buf) / SR), 40)[:len(buf)] * .012
mask = np.ones(len(buf)); mask[int(SIL[0] * SR):int(SIL[1] * SR)] = 0
mask = uniform_filter1d(mask, int(.06 * SR))
buf[:, 0] += room * mask; buf[:, 1] += room * mask
sfx_mask = np.ones(len(buf)); sfx_mask[int(SIL[0] * SR):int(SIL[1] * SR) - 10] = 0
buf *= uniform_filter1d(sfx_mask, int(.03 * SR))[:, None]

# —— 旁白 ——
voice = np.zeros_like(buf); vmask = np.zeros(len(buf))
for v in FILM['vo']:
    x, sr = sf.read(os.path.join(HERE, 'voices', v['id'] + '.wav'), dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    if sr != SR:
        import soxr; x = soxr.resample(x, sr, SR)
    x = compress(hp(x, 90) / max(1e-6, np.abs(x).max()) * .8, thr=.2, ratio=3)
    add(voice, x, v['at'], 1.)
    i0 = int(v['at'] * SR); vmask[i0:i0 + len(x)] = 1

# —— 配乐：旁白下压低约 9 dB ——
m, sr = sf.read(os.path.join(HERE, 'music.wav'), dtype='float32')
m = np.pad(m, ((int(INTRO * SR), 0), (0, 0)))[:len(buf)]; m = np.pad(m, ((0, len(buf) - len(m)), (0, 0)))
duck = 1 - (1 - 10 ** (-9 / 20)) * np.clip(uniform_filter1d(vmask, int(.35 * SR)) * 1.6, 0, 1)
m = m * duck[:, None]
sfx_duck = 1 - .3 * np.clip(uniform_filter1d(vmask, int(.3 * SR)) * 1.6, 0, 1)
rms = lambda x: np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mix = voice * (.32 / rms(voice)) + m * (.32 / rms(m) * 10 ** (-10 / 20)) + buf * sfx_duck[:, None] * .9
# 结尾随画面淡出
n = int(1.4 * SR); e = int(DUR * SR); mix[e - n:e] *= np.linspace(1, 0, n)[:, None]; mix[e:] = 0
mix = mix[:e]
mix = np.stack([limit(mix[:, c], .95) for c in range(2)], 1)
sf.write(os.path.join(HERE, 'mix.wav'), mix.astype(np.float32), SR)
print(f'mix {len(mix) / SR:.2f}s  peak {np.abs(mix).max():.2f}')
