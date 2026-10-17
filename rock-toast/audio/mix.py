# 混音：程序拟音（按画面同一时间线）+ 旁白 + 配乐（旁白下自动压低）→ audio/mix.wav
# 运行：LIB 下的 .venv python，python audio/mix.py
import os, sys, json, math
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar'))
sys.path.insert(0, LIB)
import numpy as np, soundfile as sf
from scipy.ndimage import uniform_filter1d
from core.audio.sfx import SR, t_, env_exp, bp, lp, hp, norm, brown, thump, add, compress, limit

HERE = os.path.dirname(os.path.abspath(__file__))
BEAT = 60 / 90; b = lambda n: n * BEAT
rnd = lambda s: (math.sin(s * 12.9898) * 43758.5453) % 1.0
R = np.random.default_rng(11)
noise = lambda d: R.standard_normal(int(round(d * SR)))
DUR = b(64) + .6
buf = np.zeros((int(DUR * SR), 2))

# —— 拟音积木 ——
def fadeio(x, a=.01, z=.03):
    n, m = int(a * SR), int(z * SR); x = x.copy()
    if n: x[:n] *= np.linspace(0, 1, n)
    if m: x[-m:] *= np.linspace(1, 0, m)
    return x
def crunch(d=.28, v=1.):          # 刀刮面包皮：中高频沙沙 + 细碎脆点
    x = bp(noise(d), 1400, 6500) * (.4 + .6 * np.abs(np.sin(np.pi * t_(d) / d)))
    k = np.zeros_like(x); idx = R.integers(0, len(x), 60); k[idx] = R.uniform(-1, 1, 60)
    return fadeio(norm(x * .6 + hp(k, 2500) * 1.4) * v)
def pour(d, lo=250, hi=1600, v=1., rate=9):   # 液体倒入：带随机咕噜调制的带通噪声
    tt = t_(d); am = .55 + .45 * np.sin(2 * np.pi * rate * tt + 3 * np.sin(2 * np.pi * 1.7 * tt)) * (.6 + .4 * R.random())
    x = bp(noise(d), lo, hi) * am
    return fadeio(norm(x) * v, .08, .25)
def plop(v=1., f=210):           # 蛋落入：低频咚 + 短促水花
    d = .35; tt = t_(d)
    body = np.sin(2 * np.pi * f * tt * (1 - .45 * tt / d)) * env_exp(d, .05)
    spl = bp(noise(d), 900, 4200) * env_exp(d, .045)
    return norm(body + .55 * spl) * v
def hiss(d, v=1.):               # 粉末落下
    return fadeio(norm(bp(noise(d), 3500, 11000)) * v, .15, .4)
def swish(v=1.):                 # 搅拌一下
    d = .3; return fadeio(norm(bp(noise(d), 450, 2600) * np.sin(np.pi * t_(d) / d) ** 2) * v)
def sizzle(d, v=1., dens=900):   # 油煎：密集爆点 + 嘶声底
    x = bp(noise(d), 3000, 9000) * .35
    n = int(dens * d); k = np.zeros(int(round(d * SR))); idx = R.integers(0, len(k), n); k[idx] = R.uniform(-1, 1, n) * R.uniform(.2, 1, n) ** 2
    x += hp(k, 1800) * 2.2
    am = 1 + .25 * uniform_filter1d(noise(d), int(.08 * SR)) * 6
    return fadeio(norm(x * am) * v, .2, .4)
def thud(v=1., f=95):            # 吐司落在石盘 / 锅里
    d = .25; tt = t_(d)
    return norm(np.sin(2 * np.pi * f * tt) * env_exp(d, .045) + .3 * lp(noise(d), 900) * env_exp(d, .02)) * v
def plink(v=1., f=1400):         # 果粒、液滴落下
    d = .14; tt = t_(d)
    return norm(np.sin(2 * np.pi * f * tt * (1 - .35 * tt / d)) * env_exp(d, .025) + .2 * bp(noise(d), 2000, 6000) * env_exp(d, .008)) * v
def whoom(d=1.2, v=1.):          # 暗处亮起的暖光
    tt = t_(d); return fadeio(norm(lp(noise(d), 260) * np.sin(np.pi * tt / d) ** 1.5) * v, .2, .4)
def shimmer(d=1.4, v=1.):        # 扫光：上扫的带通噪声 + 几个不协和高音
    tt = t_(d); x = np.zeros_like(tt)
    for k in range(8):
        f0 = 1800 * 2 ** (k / 2.4); x += bp(noise(d), f0, f0 * 1.25) * np.exp(-((tt / d - k / 8) / .14) ** 2)
    x += .25 * sum(np.sin(2 * np.pi * f * tt) for f in (2760, 4140, 5390)) * np.sin(np.pi * tt / d) ** 2
    return fadeio(norm(x) * v, .1, .3)
def tear(d=.9, v=1.):            # 叉开：柔软面包芯撕开
    return fadeio(norm(lp(noise(d), 1600) * (.3 + .7 * np.abs(uniform_filter1d(noise(d), int(.03 * SR))) * 8)) * v, .02, .3)

S = lambda x, t, g=1., p=0.: add(buf, x, t, g, p)

# —— 按画面时间线落拟音 ——
S(pour(2.4, 700, 3000, .5, 14), .05, .25, .25)                 # 钩子：糖浆细流
for k, t in enumerate([.55, 1.25, 1.9, 2.45]): S(plink(.6, 1700 - k * 90), t, .22, .2)
S(shimmer(1.5), 2.95, .32, -.1)                                  # 菜名扫光
for k in range(5): S(crunch(.3), b(8) + .5 + k * .27, .55, .15)  # 刀锯面包皮
S(thud(.8, 120), b(8) + 1.6, .5)                                 # 刀碰到砧板
S(fadeio(lp(noise(.8), 700)) * .5, b(8) + 1.75, .35, -.2)        # 后段滑开
S(pour(1.25, 300, 1900, 1., 8), b(12) + .1, .6, .1)              # 倒牛奶
for t in (9.53, 10.48): S(plop(1.), t, .7, .05)                  # 两颗蛋（原片 18.4 / 19.35 秒）
S(hiss(1.2), b(16) + .1, .3, -.1)                                 # 肉桂粉
for k in range(5): S(swish(), b(18) + k * .27, .35, .2 * (-1) ** k)   # 搅拌
S(pour(2.4, 160, 1100, 1., 5), b(20) + .2, .65, .1)              # 淋蛋液（更稠更低）
S(whoom(1.4), b(24), .3)                                          # 暗场亮起
S(sizzle(.8, .5, 300), b(24) - BEAT / 2, .15)                     # J-cut：油热的声音提前半拍进来
S(sizzle(b(36) - b(24), 1.), b(24), .42)                           # 煎的嗞嗞声
S(thud(.9, 80), 19.39, .6); S(sizzle(1.2, 1., 2500), 19.39, .35)   # 翻面（原片 28.96 秒）
S(thud(.7, 110), 24.6, .45, -.1)                                  # 平放那块落盘
S(thud(.9, 100), 26.43, .55, .1)                                  # 竖立那块靠上
S(pour(2.4, 180, 1300, 1., 4), b(40) + .2, .45, .05)              # 花生奶油酱
for k, t in enumerate((30.1, 30.6, 31.2)): S(plop(.8, 150 - 15 * k), t, .45, .1 * k)   # 果酱一勺勺落下（蓝莓镜从 29.33 秒起）
S(pour(2.1, 900, 3600, .4, 16), b(48) + .1, .22, .1)              # 枫糖浆细流
for t in (b(49) + .3, b(50) + .2, b(51) + .1): S(plink(.5, 1900), t, .18, .15)
S(crunch(.22, 1.), b(53), .8); S(thud(.8, 70), b(53), .5)         # 静默后的第一个声音：叉子压下（原片 37.75 秒）
S(tear(1.1), b(53) + .2, .4)
S(fadeio(lp(noise(1.6), 500)) * .5, b(53) + .5, .25)               # 热气

# 房间底噪（两处静默里切掉）
room = hp(brown(DUR), 40)[:len(buf)] * .012
mask = np.ones(len(buf))
for a, z in [(b(35.5), b(36)), (b(51.5), b(53))]:
    i0, i1 = int(a * SR), int(z * SR); mask[i0:i1] = 0
mask = uniform_filter1d(mask, int(.06 * SR))
buf[:, 0] += room * mask; buf[:, 1] += room * mask

# 拟音也在高潮前静默里归零
sfx_mask = np.ones(len(buf)); i0, i1 = int(b(51.5) * SR), int(b(53) * SR) - 10; sfx_mask[i0:i1] = 0
buf *= uniform_filter1d(sfx_mask, int(.03 * SR))[:, None]

# —— 旁白：先压缩再按时间摆放 ——
VO = {'v01': 2.9, 'v02': 5.6, 'v03': 8.2, 'v04': 10.8, 'v05': 13.6, 'v06': 18.9, 'v07': 24.4, 'v08': 26.95, 'v09': 29.6, 'v10': 32.25, 'v11': 35.7, 'v12': 39.4}
voice = np.zeros_like(buf); vmask = np.zeros(len(buf))
for k, t in VO.items():
    x, sr = sf.read(os.path.join(HERE, 'voices', k + '.wav'), dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    if sr != SR:
        import soxr; x = soxr.resample(x, sr, SR)
    x = compress(hp(x, 90) / max(1e-6, np.abs(x).max()) * .8, thr=.2, ratio=3)
    add(voice, x, t, 1.)
    i0 = int(t * SR); vmask[i0:i0 + len(x)] = 1

# —— 配乐：旁白下压低约 9 dB，平滑起落 ——
m, sr = sf.read(os.path.join(HERE, 'music.wav'), dtype='float32')
m = m[:len(buf)]; m = np.pad(m, ((0, len(buf) - len(m)), (0, 0)))
duck = 1 - (1 - 10 ** (-9 / 20)) * np.clip(uniform_filter1d(vmask, int(.35 * SR)) * 1.6, 0, 1)
m = m * duck[:, None]
sfx_duck = 1 - .3 * np.clip(uniform_filter1d(vmask, int(.3 * SR)) * 1.6, 0, 1)

# 电平：旁白 RMS 比音乐高约 10 dB
rms = lambda x: np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
vr, mr = rms(voice), rms(m)
mix = voice * (.32 / vr) + m * (.32 / mr * 10 ** (-10 / 20)) + buf * sfx_duck[:, None] * .9
# 结尾两拍淡出
n = int(b(2) * SR); e = int(b(64) * SR); mix[e - n:e] *= np.linspace(1, 0, n)[:, None]; mix[e:] = 0
mix = np.stack([limit(mix[:, c], .95) for c in range(2)], 1)
sf.write(os.path.join(HERE, 'mix.wav'), mix.astype(np.float32), SR)
# 分频段能量自检：低频别太重
from scipy.signal import welch
f, P = welch(mix.mean(1), SR, nperseg=8192)
band = lambda a, z: 10 * np.log10(P[(f >= a) & (f < z)].mean() + 1e-20)
print(f'mix {len(mix) / SR:.1f}s  peak {np.abs(mix).max():.2f}  20-120Hz {band(20, 120) - band(120, 4000):+.1f} dB vs 120-4k')
