"""配乐 + 拟音 + 旁白 → out/mix.wav。读 events.json（由 events.mjs 从页面导出）与 voices/。
配乐：古琴为主（D 宫五声：宫 D、商 E、角 F#、徵 A、羽 B，五行段一行一音），箫、鼓、锣为辅。
用法：LIB=<风格库> python audio.py"""
import json, os, sys
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ['LIB']
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
import sfx as S
import pluck as P
SR = S.SR
D = json.load(open(os.path.join(HERE, 'events.json'), encoding='utf-8'))
DUR, E = D['dur'], D['ev']
N = int((DUR + .2) * SR)
mus, fol, amb, vox = (np.zeros((N, 2), np.float32) for _ in range(4))
rng = np.random.default_rng(3)
ev = lambda ty: [e for e in E if e['type'] == ty]
T1 = lambda ty: ev(ty)[0]

# ---------------- 乐器 ----------------
def cat(*xs):                                        # 不同长度的声音相加（短的补零）
    n = max(len(x) for x in xs); out = np.zeros(n, np.float32)
    for x in xs: out[:len(x)] += x
    return out
def gq(note, at, vel=.6, gain=1., pan=0., **kw): S.add(mus, P.pluck('guqin', note, None, vel, **kw), at, gain, pan)
def harm(note, at, vel=.55, gain=.8, pan=0.): gq(note, at, vel, gain, pan, harmonic=True)
def strum(notes, at, spread=.05, vel=.6, gain=1., up=False): S.add(mus, P.strum('guqin', notes, 3.0, vel, spread=spread, up=up), at, gain)
def tone(f, d, parts=((1, 1), (2, .35), (3, .12)), vib=(5, .004)):
    t = S.t_(d); ph = 2 * np.pi * np.cumsum(f * (1 + vib[1] * np.sin(2 * np.pi * vib[0] * t))) / SR
    return sum(a * np.sin(k * ph) for k, a in parts)
def hz(n): return 440 * 2 ** ((P.midi(n) - 69) / 12)
def xiao(note, at, d, gain=.5):                      # 箫：带气声的正弦，慢起慢收
    f = hz(note); x = tone(f, d) * .6 + S.bp(S.noise(d), f * 1.5, min(f * 4, 9000)) * .25
    env = np.minimum(1, S.t_(d) / .25) * np.minimum(1, (d - S.t_(d)) / .4); x = S.lp(x * env, 3500)
    S.add(mus, S.norm(x, .3), at, gain)
def drum(at, v=1., f=62): x = cat(S.thump(v, f), S.lp(S.noise(.25) * S.env_exp(.25, .04), 220) * .5 * v); S.add(mus, x, at, .9)
def gong(at, v=1., f0=176, d=5.0):                   # 锣：一组不谐和的泛音，缓缓衰减
    t = S.t_(d); x = sum(a * np.sin(2 * np.pi * f0 * k * t + k) * np.exp(-t / tau) for k, a, tau in ((1, 1, 2.6), (1.47, .7, 2.0), (2.09, .5, 1.4), (2.56, .4, 1.1), (3.12, .3, .8), (4.2, .2, .5)))
    x = x * np.minimum(1, t / .012) * (1 + .1 * np.sin(2 * np.pi * 3.1 * t)); S.add(mus, S.norm(x, .5) * v, at, .8)
def roll(t0, t1, v=1.):
    t = t0
    while t < t1: u = (t - t0) / (t1 - t0); drum(t, (.25 + .75 * u * u) * v, 58 + 8 * rng.random()); t += .09 - .04 * u

# ---------------- 拟音 ----------------
def brush(at, d, g=.6):                               # 毛笔：带笔毫颗粒的带通噪声（不是金属呼啸）
    n = S.bp(S.noise(d), 900, 5200); grains = (rng.random(len(n)) < .004).astype(float); grains = np.convolve(grains, np.hanning(240), 'same')
    env = np.sin(np.pi * np.clip(S.t_(d) / d, 0, 1)) ** .6; S.add(fol, n * (.5 + 2 * grains) * env * .12, at, g, rng.uniform(-.3, .3))
def tick(at, g=.25, p=1.): S.add(fol, S.click(p, .6), at, g, rng.uniform(-.5, .5))
def drip(at, g=.5, f=1400):                           # 墨滴："叮"一下 + 湿的闷声
    d = .25; t = S.t_(d); x = np.sin(2 * np.pi * f * t * (1 - .3 * t / d)) * np.exp(-t / .03) + S.lp(S.noise(d), 500) * np.exp(-t / .05) * .6
    S.add(fol, x * .5, at, g)
def whoosh(at, d=.5, g=.4): S.add(fol, S.whoosh(d, 1.0), at, g)
def paper(at, d, g=.25): S.add(fol, S.lp(S.noise(d), 1800) * np.sin(np.pi * S.t_(d) / d) * .2, at, g)
def seal(at): S.add(fol, cat(S.thump(1., 140) * .8, S.bp(S.noise(.12), 1500, 6000) * S.env_exp(.12, .02) * .5), at, .9)

for e in E:
    ty = e['type']; t = e.get('t', e.get('t0', 0))
    if ty == 'ticks':
        n = e['n']
        for i in range(n): tick(e['t0'] + (e['t1'] - e['t0']) * np.sqrt(i / (n - 1)), .16, 1.2 + .4 * rng.random())
    elif ty == 'drop': drip(t, .9, 900); S.add(fol, S.thump(1., 55), t, 1.)
    elif ty == 'brush': brush(t, max(.2, e['dur']), e.get('gain', .6))
    elif ty == 'seal': seal(t)
    elif ty == 'pan': paper(t, e['dur'], .3 * e.get('gain', 1))
    elif ty == 'pour':
        k = e['kind']; tt = e['t0'] + .4
        while tt < e['t1'] + .3:
            if k == 'yin': S.add(fol, S.lp(S.thump(.5, 90 + 40 * rng.random()), 900), tt, .45, -.4)
            elif k == 'yang': tick(tt, .22, .7 + .5 * rng.random())
            else: (tick(tt, .18, .9) if rng.random() < .5 else S.add(fol, S.lp(S.thump(.4, 120), 1200), tt, .35, .1))
            tt += .045 + .05 * rng.random()
    elif ty == 'sweep': brush(t, e['dur'], .9); whoosh(t, .45, .25)
    elif ty == 'roll':
        d = e['t1'] - e['t0']; tt = S.t_(d); m = np.abs(np.sin(np.pi * tt / e['period']))
        x = S.lp(S.noise(d), 260) * (.35 + .65 * m) * .5 + S.bp(S.noise(d), 2200, 4200) * m * .05
        S.add(fol, x * np.minimum(1, tt / .2) * np.minimum(1, (d - tt) / .3), e['t0'], .8)
    elif ty == 'sift':
        d = e['t1'] - e['t0']; tt = S.t_(d); x = S.hp(S.noise(d), 3000) * (.5 + .5 * np.sin(2 * np.pi * 7.5 * tt) ** 2) * .07
        S.add(fol, x * np.minimum(1, tt / .2) * np.minimum(1, (d - tt) / .3), e['t0'], .8, -.4)
    elif ty == 'simmer':
        tt = e['t0']; f0, f1 = e['fine']
        while tt < e['t1']:
            u = np.clip((tt - f0) / (f1 - f0), 0, 1); f = 260 + 700 * u + 200 * rng.random(); d = .06
            x = np.sin(2 * np.pi * f * S.t_(d) * (1 + 2 * S.t_(d))) * S.env_exp(d, .015); S.add(fol, x * .12, tt, .7, rng.uniform(-.6, .6))
            tt += .16 - .12 * u + .05 * rng.random()
        d = e['t1'] - e['t0']; S.add(amb, S.lp(S.brown(d), 300) * .05, e['t0'], 1)
    elif ty == 'lift': S.add(fol, S.clack(.6, .8), t, .7)
    elif ty == 'powder':
        d = e['t1'] - e['t0']; tt = S.t_(d); S.add(fol, S.bp(S.noise(d), 2500, 7000) * np.sin(np.pi * tt / d) * .06, e['t0'], .8, -.3)
    elif ty == 'pat': S.add(fol, cat(S.thump(.9, 95), S.bp(S.noise(.08), 900, 3000) * S.env_exp(.08, .015) * .7), t, 1.)
    elif ty == 'tap': S.add(fol, S.lp(S.thump(.5, 160), 1500), t, .55, rng.uniform(-.4, .4)); tick(t, .12, .8)
    elif ty == 'bloom': d = e['dur'] + .4; S.add(fol, S.lp(S.noise(d), 420) * np.sin(np.pi * S.t_(d) / d) ** 2 * .3, t - .1, .7); drip(t + .05, .3, 1200)
    elif ty == 'hall': d = e['t1'] - e['t0']; S.add(amb, S.lp(S.brown(d), 120) * np.minimum(1, S.t_(d) / .6) * .3, e['t0'], 1)
    elif ty == 'lid': d = .7; S.add(fol, S.bp(S.noise(d), 500, 1800) * (np.abs(np.sin(np.pi * S.t_(d) * 9)) ** 2) * np.sin(np.pi * S.t_(d) / d) * .25, t, .9)
    elif ty == 'drips':
        tt = e['t0']
        while tt < e['t1']: drip(tt, .35, 1100 + 500 * rng.random()); tt += .28 + .2 * rng.random()
    elif ty == 'spin': d = e['dur']; S.add(fol, S.bp(S.noise(d), 300, 2500) * (S.t_(d) / d) ** 2 * .15, t, .8)
    elif ty == 'snow':
        d = e['t1'] - e['t0']; tt = S.t_(d); x = S.lp(S.noise(d), 700) * (.6 + .4 * np.sin(2 * np.pi * .3 * tt)) * .06
        S.add(amb, x * np.minimum(1, tt / .8) * np.minimum(1, (d - tt) / .8), e['t0'], 1)
    elif ty == 'thud': S.add(fol, S.thump(1., 64), t, 1.); drip(t + .02, .25, 1000)
amb += np.stack([S.lp(S.brown(N / SR), 1500)[:N] * .006] * 2, 1)       # 纸面的室内底噪

# ---------------- 配乐（与画面同一张时间表）----------------
DS = ['D3', 'A3', 'E3', 'A3', 'F#3', 'A3', 'E3', 'B3']
for i, t in enumerate((.3, 1.1, 1.9)): harm(['A4', 'D5', 'E5'][i], t, .5, .45)
gq('D2', T1('drop')['t'], .95, 1.0)
for (a, n) in zip([b['t'] for b in ev('brush')[:3]], ['F#3', 'A3', 'D4']): gq(n, a, .6, .8)
harm('A4', 4.7, .5, .6); gong(T1('seal')['t'], .25, 300, 3)
hush = [(e['t0'], e['t1']) for e in ev('silence')]
def pulse(t0, t1, step=.5, gain=.42, every=1):
    k = 0; t = t0
    while t < t1:
        if k % every == 0: gq(DS[k % 8], t, .42 + .1 * (k % 4 == 0), gain, (-.3, .3)[k % 2])
        t += step; k += 1
pulse(5.6, 13.1); pulse(13.1, 17.2)
for t in np.arange(13.5, 17.2, 1.0): drum(t, .35, 90)
pulse(17.2, 21.2, 1.0, .34)
for p, n in zip(ev('pour'), ['D4', 'F#4', 'E4']): gq('A2', p['t0'], .7, .8); gq(n, p['t0'] + .5, .55, .6)
harm('B4', 10.5, .5, .5); harm('A4', 11.4, .5, .5)
gq('D2', T1('lift')['t'] + .02, .8, .9)
pulse(22.6, 27.0, .5, .32)
for t, n in zip([e['t'] for e in ev('pat')], ['A2', 'D3', 'F#3']): drum(t, .7, 70); gq(n, t, .7, .9)
for t, n in zip([e['t'] for e in ev('tap')], ['D3', 'E3', 'F#3', 'A3', 'B3', 'D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5']): gq(n, t, .5, .6, rng.uniform(-.4, .4))
g0 = [e for e in ev('brush') if e['dur'] > .9 and 29 < e['t'] < 31][0]['t']; gq('A3', g0, .6, .8, glide=('D4', 1.0))
ding0 = [e for e in ev('bloom')][0]['t']
xiao('D4', ding0 + .2, 1.6, .35); roll(ding0 + .5, hush[2][0], .8)
g = T1('gong')['t']; gong(g, 1.0); drum(g, 1.2, 50); strum(['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], g, .045, .75, 1.0)
s0 = T1('drips')['t0']; gq('E3', s0, .5, .7, bend=[(0, 0), (1.0, -1)]); gq('B2', s0 + .9, .5, .7, bend=[(0, 0), (1.0, -1)])
earth = [e for e in ev('cue') if e['name'] == 'gong5'][0]['t']; gq('D3', earth, .85, 1.0); gong(earth + .02, .3, 220, 3)    # 宫 = 土
yb = [e for e in ev('brush') if 40 < e['t'] < 41][0]; nb = [e for e in ev('brush') if 41.5 < e['t'] < 42.5][0]
gq('F#4', yb['t'], .7, .9, glide=('F#4', .1)); harm('A4', yb['t'] + .8, .6, .8)                                        # 角 = 木，徵 = 火
gq('E4', nb['t'], .7, .9); gq('B3', nb['t'] + .9, .7, .9)                                                              # 商 = 金，羽 = 水
harm('D5', 44.2, .55, .6); harm('A4', 44.6, .55, .55)
sp = T1('spin'); st = sp['t']
for k, (dt, spread) in enumerate([(0, .12), (.8, .07), (1.5, .04), (2.0, .025)]): strum(['D3', 'E3', 'F#3', 'A3', 'B3'], st + dt, spread, .5 + .1 * k, .7)
gq('D3', st + sp['dur'], .8, .9); gq('D4', st + sp['dur'] + .01, .6, .6)
r = [e for e in ev('pan') if e.get('gain', 1) > 1][0]; tt = r['t']
while tt < r['t'] + r['dur'] - .1: u = (tt - r['t']) / r['dur']; gq('D4', tt, .45 + .2 * u, .45, rng.uniform(-.2, .2)); tt += .34 - .27 * u
for n, a, d in [('A4', 52.2, 1.3), ('F#4', 53.5, 1.0), ('E4', 54.5, .8), ('D4', 55.2, 1.8)]: xiao(n, a, d, .4)
harm('D5', T1('warm')['t'], .5, .5)
for e2, n in zip(ev('thud'), ['D2', 'A2', 'D3']): gq(n, e2['t'], .75, .9)
harm('A4', 57.6, .5, .5)
gong(ev('seal')[-1]['t'], .35, 300, 3.5); harm('D4', ev('seal')[-1]['t'] + .02, .55, .6)

# ---------------- 旁白 ----------------
for e in ev('vo'):
    x, sr = sf.read(os.path.join(HERE, 'voices', e['id'] + '.wav'), dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    if sr != SR: x = soxr.resample(x, sr, SR)
    x = S.compress(x / (np.abs(x).max() + 1e-9) * .8, .22, 3.0)
    S.add(vox, x, e['t'], .9)
# 旁白时压低音乐与环境（约 8 dB）
x = np.abs(vox).max(1); from scipy.ndimage import maximum_filter1d, uniform_filter1d
act = (maximum_filter1d(x, int(.25 * SR)) > .02).astype(np.float32); act = uniform_filter1d(act, int(.12 * SR))
duck = (1 - .6 * act)[:, None]
# 静场：整条总线归零（短淡入淡出）
gate = np.ones(N, np.float32)
for a, b in hush:
    s, e2 = int(a * SR), int(b * SR); f = int(.04 * SR); gate[s:e2] = 0
    gate[max(0, s - f):s] = np.minimum(gate[max(0, s - f):s], np.linspace(1, 0, s - max(0, s - f))); gate[e2:e2 + f] = np.linspace(0, 1, len(gate[e2:e2 + f]))
gate = gate[:, None]
rms = lambda y: np.sqrt(np.mean(y ** 2) + 1e-12)
out = (mus * .42 * duck + amb * .7 * (1 - .4 * act[:, None])) * gate + fol * gate * .6 + vox * 1.6
# 静场里只留一声：蜜面一滴
if len(hush) > 1: drip_at = (hush[1][0] + hush[1][1]) / 2; tmp = np.zeros_like(out); S.add(tmp, np.sin(2 * np.pi * 1500 * S.t_(.2)) * S.env_exp(.2, .03) * .3, drip_at, 1); out += tmp
for c in range(2): out[:, c] = S.limit(out[:, c], .95)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), out, SR, subtype='PCM_24')
for name, y in (('music', mus), ('foley', fol), ('voice', vox)): print(name, 'rms dB', round(20 * np.log10(rms(y)), 1))
print('mix.wav', round(len(out) / SR, 2), 's')
