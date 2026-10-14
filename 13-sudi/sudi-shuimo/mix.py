"""混音：配乐（music/out/score.wav，或用户自己的原曲音频）+ 环境声 + 拟音，全部由页面导出的 events.json 驱动。
用法：python mix.py [--song 原曲.mp3 --offset 0.0 --fx 0.35] [--out out/mix.wav]
环境声与拟音全部用 numpy 程序化合成（没有采样）。STYLE：古琴为主，静默是真的静默。"""
import argparse, json, os, subprocess, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar'))
sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, bp, lp, hp, limit, compress   # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--song', default=None, help='用你自己的原曲音频代替原创配乐')
ap.add_argument('--offset', type=float, default=0.0, help='原曲相对画面的偏移（秒，正数 = 原曲推后）')
ap.add_argument('--fx', type=float, default=None, help='环境声与拟音的整体增益（默认：配乐版 1.0，原曲版 0.35）')
ap.add_argument('--out', default=os.path.join(HERE, 'out', 'mix.wav'))
a = ap.parse_args()

E = json.load(open(os.path.join(HERE, 'events.json')))
DUR = float(E['dur']); N = int(round(DUR * SR)); EV = E['ev']
rng = np.random.default_rng(11)
FX = a.fx if a.fx is not None else (0.35 if a.song else 1.0)


def T(d): return np.arange(int(round(d * SR))) / SR
def nz(d): return rng.standard_normal(int(round(d * SR)))
def env_exp(d, tau): return np.exp(-T(d) / tau)
def fade(x, fi=.01, fo=.05):
    n1, n2 = int(fi * SR), int(fo * SR); x = x.copy()
    if n1: x[:n1] *= np.linspace(0, 1, n1)
    if n2: x[-n2:] *= np.linspace(1, 0, n2)
    return x
def nrm(x, p=1.0): m = np.abs(x).max(); return x * (p / m) if m > 0 else x
def brown(d):
    w = np.cumsum(nz(d)); w -= np.linspace(w[0], w[-1], len(w)); return nrm(hp(w, 25))
def sweep_bp(x, f0, f1, q=.35):
    out = np.zeros_like(x); n = len(x); blk = 1200
    for i in range(0, n, blk):
        hi = min(n, i + blk); f = f0 * (f1 / f0) ** (i / max(1, n)); s = bp(x[max(0, i - 4000):hi], f * (1 - q), f * (1 + q))[-(hi - i):]; out[i:hi] = s
    return out
def sines(d, parts):
    tt = T(d); return sum(am * np.sin(2 * np.pi * f * tt + k) * env_exp(d, tau) for k, (f, am, tau) in enumerate(parts))

# —— 环境声（长段，带渐入渐出）——
def amb(kind, d):
    tt = T(d)
    if kind in ('storm', 'rain', 'rainSoft', 'rainIndoor'):
        k = {'storm': 1.0, 'rain': .6, 'rainSoft': .35, 'rainIndoor': .5}[kind]
        x = bp(nz(d), 500, 9000) * .5 + bp(nz(d), 150, 900) * .35
        drops = (rng.random(len(tt)) > .9985).astype(float); x += hp(np.convolve(drops, np.exp(-np.arange(300) / 40), 'same'), 2000) * .6
        if kind == 'storm': x += lp(brown(d), 160) * .7 * (.6 + .4 * np.sin(2 * np.pi * .07 * tt))
        if kind == 'rainIndoor': x = lp(x, 1600)
        return nrm(x) * k
    if kind in ('wind', 'windSoft', 'snowWind', 'seaWind', 'valley'):
        k = {'wind': .5, 'windSoft': .3, 'snowWind': .55, 'seaWind': .6, 'valley': .5}[kind]
        g = .55 + .45 * np.sin(2 * np.pi * .11 * tt + 1) * np.sin(2 * np.pi * .043 * tt)
        lo, hi = (180, 900) if kind == 'valley' else (250, 2200)
        x = bp(brown(d), lo, hi) * g
        if kind == 'seaWind': x += lp(nz(d), 500) * (.5 + .5 * np.sin(2 * np.pi * .12 * tt)) ** 2 * .6
        return nrm(x) * k
    if kind == 'forest':
        x = bp(brown(d), 300, 2500) * .5
        for _ in range(int(d / 2.2)):   # 远处的鸟
            s = rng.random() * (d - .5); f0 = 2800 + rng.random() * 1500; dd = .09 + rng.random() * .07
            ch = np.sin(2 * np.pi * np.cumsum(f0 * (1 + .25 * np.sin(np.linspace(0, 3, int(dd * SR))))) / SR) * np.sin(np.linspace(0, np.pi, int(dd * SR)))
            for r in range(rng.integers(1, 4)):
                i = int((s + r * .13) * SR); x[i:i + len(ch)] += ch[:len(x) - i] * .12
        return nrm(x) * .45
    if kind == 'night':
        x = lp(brown(d), 400) * .4
        cr = np.sin(2 * np.pi * 4600 * tt) * (np.sin(2 * np.pi * 28 * tt) > .6) * (np.sin(2 * np.pi * .6 * tt) > .2) * .05
        return nrm(x + cr) * .4
    if kind == 'seaNight':
        return nrm(lp(nz(d), 420) * (.4 + .6 * np.sin(2 * np.pi * .09 * tt) ** 2)) * .45
    if kind == 'army':
        x = lp(brown(d), 220) * .8
        for i in range(int(d / .62)): s = int(i * .62 * SR); th = np.sin(2 * np.pi * 62 * T(.3)) * env_exp(.3, .06); x[s:s + len(th)] += th[:len(x) - s] * .5
        return nrm(x) * .55
    return np.zeros(len(tt))

# —— 拟音（单次）——
def fx(ty, d=None):
    if ty == 'thunder':
        dd = 4.5; x = lp(brown(dd), 260) * env_exp(dd, 1.4) * (1 - np.exp(-T(dd) / .08)); return nrm(x)
    if ty == 'crack':
        dd = 3.0; x = hp(nz(dd), 1500) * env_exp(dd, .05) * 1.2 + lp(brown(dd), 300) * env_exp(dd, .9); return nrm(x)
    if ty == 'washdown':
        dd = d or 1.5; return nrm(sweep_bp(nz(dd), 5000, 600) * np.sin(np.pi * T(dd) / dd)) * .8
    if ty in ('brush', 'brushTick', 'brushEnd', 'engrave'):
        dd = d or (.28 if ty != 'brushEnd' else .4); x = bp(nz(dd), 1800, 7000) * np.sin(np.pi * T(dd) / dd) ** .7
        g = (rng.random(len(x)) > .997).astype(float); x += hp(np.convolve(g, np.exp(-np.arange(200) / 25), 'same'), 3000) * .4
        return nrm(x) * (.5 if ty == 'engrave' else 1)
    if ty == 'seal':
        dd = .7; th = np.sin(2 * np.pi * 140 * T(dd) * (1 - .3 * T(dd))) * env_exp(dd, .05); pc = hp(nz(dd), 2500) * env_exp(dd, .03) * .5
        crk = hp(nz(dd), 3000) * (rng.random(len(th)) > .995) * env_exp(dd, .25) * 2
        return nrm(th + pc + crk)
    if ty in ('petal', 'petalPalm', 'bloom'):
        dd = 1.6; f = {'petal': 2637, 'petalPalm': 1760, 'bloom': 2349}[ty] * (1 + .03 * rng.standard_normal())
        return nrm(sines(dd, [(f, 1, .35), (f * 2.01, .3, .2), (f * 3.02, .12, .1)]) + bp(nz(dd), 3000, 8000) * env_exp(dd, .08) * .2) * .5
    if ty == 'blink':
        dd = .12; return nrm(np.sin(2 * np.pi * 1400 * T(dd)) * env_exp(dd, .02)) * .25
    if ty == 'scamper':
        dd = d or 1.5; x = np.zeros(int(dd * SR)); step = .07
        for i in range(int(dd / step)):
            s = int(i * step * SR); c = hp(nz(.03), 2000) * env_exp(.03, .004) + np.sin(2 * np.pi * 900 * T(.03)) * env_exp(.03, .006) * .4; x[s:s + len(c)] += c[:len(x) - s] * (.6 + .4 * rng.random())
        return nrm(x) * .6
    if ty in ('plop', 'fallBody'):
        dd = .5; f = 95 if ty == 'plop' else 70
        return nrm(np.sin(2 * np.pi * f * T(dd) * (1 - .4 * T(dd))) * env_exp(dd, .07) + lp(nz(dd), 600) * env_exp(dd, .03) * .6)
    if ty in ('gust', 'mistT', 'evaporate'):
        dd = d if (d and ty != 'gust') else 2.2; dd = min(dd, 4)
        return nrm(sweep_bp(nz(dd), 400, 1800) * np.sin(np.pi * T(dd) / dd) ** 1.5) * (.7 if ty == 'gust' else .35)
    if ty == 'shatter':
        dd = 1.6; x = hp(nz(dd), 2000) * env_exp(dd, .12) + lp(brown(dd), 200) * env_exp(dd, .4) * .8
        for _ in range(60): i = int(rng.random() * .9 * SR); c = bp(nz(.02), 2500, 7000) * env_exp(.02, .003); x[i:i + len(c)] += c * .5
        return nrm(x)
    if ty == 'blade':
        dd = .9; x = bp(nz(dd), 3000, 9000) * env_exp(dd, .05) * 1.2 + sines(dd, [(2840, .5, .35), (4310, .35, .25), (6120, .2, .15)]) * (1 - np.exp(-T(dd) / .02))
        return nrm(x) * .7
    if ty in ('stain', 'inkTouch', 'drip'):
        dd = 1.2; tink = sines(dd, [(1900 if ty == 'drip' else 1200, 1, .08), (3100, .4, .04)])
        thud = lp(nz(dd), 500) * env_exp(dd, .05) * .7; return nrm(tink * (1 if ty == 'drip' else .4) + thud)
    if ty == 'inkSpread':
        dd = d or 3; return nrm(lp(brown(dd), 500) * np.sin(np.pi * T(dd) / dd) ** 2) * .6
    if ty == 'sigh':
        dd = 1.4; return nrm(bp(nz(dd), 350, 1600) * np.sin(np.pi * T(dd) / dd) ** 1.2 * np.exp(-T(dd) / 1.2)) * .45
    if ty in ('lockClick', 'snap'):
        dd = .8; tr = hp(nz(dd), 2000) * env_exp(dd, .006) * 1.4
        body = sines(dd, [(420, .8, .05), (980, .5, .03), (1650, .3, .02)]) if ty == 'snap' else np.sin(2 * np.pi * 85 * T(dd)) * env_exp(dd, .12) + sines(dd, [(760, .5, .06)])
        return nrm(tr + body)
    if ty == 'chime':
        dd = 3; return nrm(sines(dd, [(1567, 1, .9), (2349, .5, .7), (3136, .3, .4), (4699, .15, .25)])) * .55
    if ty in ('door', 'doorOpen'):
        dd = 1.6 if ty == 'doorOpen' else .9; tt = T(dd); f0 = 90 + 40 * np.sin(np.pi * tt / dd)
        saw = 2 * ((np.cumsum(f0) / SR) % 1) - 1
        return nrm(bp(saw, 300, 2500) * (np.abs(np.sin(2 * np.pi * 17 * tt)) ** 3) * np.sin(np.pi * tt / dd)) * .5
    if ty == 'charge':
        dd = 3.5; return nrm(lp(brown(dd), 300) * np.minimum(1, T(dd) / .4) * env_exp(dd, 1.6) + bp(nz(dd), 600, 2500) * env_exp(dd, .8) * .3)
    if ty == 'snowTick':
        dd = .15; return nrm(hp(nz(dd), 4000) * env_exp(dd, .01)) * .15
    if ty == 'reverse':
        dd = d or 3; x = sweep_bp(nz(dd), 600, 3000) * np.sin(np.pi * T(dd) / dd) ** 2; return nrm(x[::-1]) * .5
    if ty == 'inhale':
        dd = .5; return nrm(bp(nz(dd), 500, 2500) * np.linspace(0, 1, int(dd * SR)) ** 2) * .4
    if ty == 'dragon':
        dd = 3.2; tt = T(dd); x = sweep_bp(nz(dd), 300, 3500, .5) * np.exp(-tt / .9) * (1 - np.exp(-tt / .03))
        roar = lp(brown(dd), 220) * np.exp(-tt / 1.1); boom = np.sin(2 * np.pi * 48 * tt * (1 - .2 * tt)) * np.exp(-tt / .6)
        return nrm(x * 1.2 + roar + boom)
    if ty == 'impact':
        dd = 2.5; tt = T(dd); return nrm(np.sin(2 * np.pi * 42 * tt * (1 - .2 * tt)) * np.exp(-tt / .5) + hp(nz(dd), 1500) * np.exp(-tt / .04) + lp(brown(dd), 300) * np.exp(-tt / .7) * .6)
    if ty in ('cloth', 'shakeSnow'):
        dd = .6; x = bp(nz(dd), 600, 4000) * (np.abs(np.sin(2 * np.pi * 21 * T(dd))) ** 2) * np.sin(np.pi * T(dd) / dd); return nrm(x) * .5
    if ty == 'lockClink':
        dd = 1.5; return nrm(sines(dd, [(3010, 1, .3), (4720, .6, .2), (6350, .3, .12)]) + hp(nz(dd), 4000) * env_exp(dd, .01) * .5) * .7
    if ty == 'splash':
        dd = .5; return nrm(bp(nz(dd), 800, 6000) * env_exp(dd, .07) + sines(dd, [(1300, .3, .05)])) * .5
    if ty == 'hop':
        dd = .5; return nrm(sweep_bp(nz(dd), 600, 2500) * np.sin(np.pi * T(dd) / dd)) * .4
    if ty == 'washT':
        dd = min(d or 1, 1.6); return nrm(sweep_bp(nz(dd), 4000, 700) * np.sin(np.pi * T(dd) / dd)) * .45
    if ty == 'bloomT':
        dd = min(d or 1, 1.6) + .6; return nrm(lp(brown(dd), 700) * np.sin(np.pi * T(dd) / dd) ** 2 + sines(dd, [(2093, .08, .6)])) * .35
    return None

GAIN = {  # 每类拟音的混音电平（相对）
    'thunder': .55, 'crack': .5, 'washdown': .3, 'brush': .22, 'brushTick': .14, 'brushEnd': .2, 'seal': .45, 'petal': .12, 'petalPalm': .16, 'bloom': .1,
    'blink': .08, 'scamper': .14, 'plop': .2, 'gust': .18, 'shatter': .4, 'blade': .2, 'stain': .18, 'sigh': .22, 'lockClick': .4, 'chime': .16,
    'door': .2, 'doorOpen': .22, 'charge': .4, 'snap': .55, 'snowTick': .3, 'reverse': .25, 'drip': .5, 'inhale': .25, 'dragon': .7, 'impact': .6,
    'cloth': .14, 'fallBody': .3, 'lockClink': .3, 'shakeSnow': .14, 'splash': .14, 'engrave': .1, 'inkTouch': .3, 'inkSpread': .2, 'hop': .14,
    'evaporate': .14, 'washT': .1, 'mistT': .08, 'bloomT': .1,
}
AMB_GAIN = .16

fxbus = np.zeros((N, 2), np.float32); ambbus = np.zeros((N, 2), np.float32)
for e in EV:
    if e.get('type') == 'amb':
        t0, t1 = max(0, e['t0']), min(DUR, e['t1']); d = t1 - t0
        if d <= .1: continue
        x = fade(amb(e['kind'], d), min(.8, d / 3), min(1.0, d / 3))
        # 环境声做成宽立体声：左右用两份不同的噪声太贵，这里用 Haas 延迟
        s = int(t0 * SR); n = len(x); dl = int(.012 * SR)
        ambbus[s:s + n, 0] += x[:N - s] * AMB_GAIN
        ambbus[s + dl:s + n + dl, 1] += x[:max(0, min(n, N - s - dl))] * AMB_GAIN
        continue
    ty = e.get('type')
    if ty in ('silence', 'vo') or 't' not in e: continue
    x = fx(ty, e.get('d'))
    if x is None: continue
    pan = float(np.clip(rng.standard_normal() * .15, -.4, .4))
    add(fxbus, fade(x.astype(np.float32), .002, .03), e['t'], GAIN.get(ty, .2) * e.get('gain', 1), pan)

# —— 配乐 ——
def load_audio(path):
    if path.lower().endswith('.wav'):
        y, sr = sf.read(path, always_2d=True)
        if sr != SR:
            import soxr; y = soxr.resample(y, sr, SR)
    else:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
        y = np.frombuffer(raw, np.float32).reshape(-1, 2)
    if y.shape[1] == 1: y = np.repeat(y, 2, 1)
    return y.astype(np.float32)

mus = np.zeros((N, 2), np.float32)
src = a.song or os.path.join(HERE, 'music', 'out', 'score.wav')
if os.path.exists(src):
    y = load_audio(src); off = int(round(a.offset * SR))
    if off >= 0: n = min(N - off, len(y)); mus[off:off + n] = y[:n]
    else: n = min(N, len(y) + off); mus[:n] = y[-off:-off + n]
    print('music:', src, f'{len(y) / SR:.2f}s')
else:
    print('! no music found at', src, '— mixing ambience and foley only')

# —— 静默窗：除了一个声音，全都归零（短渐变）——
def gate_silence(buf, t0, t1, ramp=.12):
    g = np.ones(N, np.float32); i0, i1, r = int(t0 * SR), int(t1 * SR), int(ramp * SR)
    g[i0:i1] = 0; g[max(0, i0 - r):i0] = np.linspace(1, 0, min(r, i0)); g[i1:i1 + r] = np.linspace(0, 1, len(g[i1:i1 + r]))
    buf *= g[:, None]
for e in EV:
    if e.get('type') == 'silence':
        gate_silence(ambbus, e['t0'], e['t1'])
        if not a.song: gate_silence(mus, e['t0'], e['t1'])
        # 拟音只留雪落那一声
        keep = np.zeros((N, 2), np.float32)
        for k in EV:
            if k.get('type') == 'snowTick' and e['t0'] <= k['t'] <= e['t1']:
                x = fx('snowTick'); add(keep, x.astype(np.float32), k['t'], GAIN['snowTick'] * k.get('gain', 1), .2)
        i0, i1 = int(e['t0'] * SR), int(e['t1'] * SR); fxbus[i0:i1] = keep[i0:i1]

mix = mus + (fxbus + ambbus) * FX
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
os.makedirs(os.path.dirname(a.out), exist_ok=True)
sf.write(a.out, mix, SR, subtype='FLOAT')
def rms(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print(f'wrote {a.out}  {DUR:.2f}s  music {rms(mus):.1f} dBFS  fx {rms(fxbus * FX):.1f}  amb {rms(ambbus * FX):.1f}  peak {20 * np.log10(np.abs(mix).max() + 1e-9):.1f} dBFS')
