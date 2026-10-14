#!/usr/bin/env python3
"""《宿敌》水墨 MV · 原创器乐配乐（D 羽调式，二胡代人声：一字一音）。

运行（会打印进度，约几分钟）：
    cd ~/lemo-opuscar && .venv/bin/python /home/user/AIGC/13-sudi/sudi-shuimo/music/score.py

输出：
    music/out/score.wav        全编制，48 kHz 立体声 24-bit，长度 = timeline.dur
    music/out/score_lead.wav   只有二胡主旋律（含同样的混响与电平），用来核对卡拉 OK 走字
    music/CREDITS_music.txt    采样归属

所有时间都从 data/timeline.json（小节网格、段落、事件）与 data/lyrics.json（逐字 t0/d）读出。
旋律、和声、配器全部是原创，不模仿原曲旋律。
"""
import os, sys, json, time
LEMO = os.path.expanduser('~/lemo-opuscar')
sys.path.insert(0, LEMO)
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, lfilter, welch, stft
from core.audio import sampler as S, pluck as P
from core.audio.sfx import SR

T_START = time.time()
HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
TL = json.load(open(os.path.join(PROJ, 'data', 'timeline.json'), encoding='utf-8'))
LY = json.load(open(os.path.join(PROJ, 'data', 'lyrics.json'), encoding='utf-8'))
T0, BAR, DUR, EV, SEC = TL['T0'], TL['BAR'], TL['dur'], TL['ev'], TL['sections']
BEAT = BAR / 4
N = int(round(DUR * SR))
RNG = np.random.default_rng(2024)
S.seed(7)


def log(*a):
    print(f'[{time.time() - T_START:6.1f}s]', *a, flush=True)


def tb(bar, beat=0.0):
    """第 bar 小节第 beat 拍（0 起）的时刻（秒）"""
    return T0 + bar * BAR + beat * BEAT


def bar_of(t): return (t - T0) / BAR


# 段落起始小节号（从 timeline.json 推出，不手写）
SB = {k: int(round(bar_of(v[0]))) if k != 'intro' else 0 for k, v in SEC.items()}
for k in SB:
    if k != 'intro': assert abs(bar_of(SEC[k][0]) - SB[k]) < .01, (k, bar_of(SEC[k][0]))
log('section bars', SB)

# 两段数字静默（精确为 0）
SILENCE = [(EV['hushMusic'], EV['strike']), (EV['brkMusicA'], EV['brkMusicB'])]
FADE = .08

# ════════════════════════ 混音总线 ════════════════════════
STEMS = {k: np.zeros((N, 2), np.float32) for k in ['lead', 'xiao', 'pluck', 'strings', 'perc', 'gong']}
BUS_DB = {'lead': 0.0, 'xiao': 6.0, 'pluck': 5.0, 'strings': 5.0, 'perc': 5.0, 'gong': 3.0}   # 总线电平
ACC_DB = {'intro': 1.0, 'v1': 0.0, 'c1': 2.5, 'inter': 0.0, 'v2': 0.0, 'c2': 2.5, 'c3': 2.0, 'outro': 4.0}  # 伴奏随段落
CUR = ['intro']


def put(stem, x, t, gain=1.0, pan=0.0):
    """把单声道 x 放进 stem（等功率声像；取整用 round，起点与 lyrics 精确对齐）"""
    buf = STEMS[stem]
    gain *= 10 ** ((BUS_DB[stem] + (ACC_DB[CUR[0]] if stem != 'lead' else 0.0)) / 20)
    s = int(round(t * SR))
    if s >= N or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(N, s + len(x))
    l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    seg = np.asarray(x[:e - s], np.float32) * np.float32(gain)
    buf[s:e, 0] += seg * np.float32(l); buf[s:e, 1] += seg * np.float32(r)


def _sos(kind, f, o=2):
    return butter(o, f, kind, fs=SR, output='sos')


def lp(x, f, o=2): return sosfilt(_sos('low', f, o), x)
def hp(x, f, o=2): return sosfilt(_sos('high', f, o), x)
def bp(x, lo, hi, o=2): return sosfilt(_sos('band', [lo, hi], o), x)


def smooth(u):
    u = np.clip(u, 0, 1); return u * u * (3 - 2 * u)


def decay_after(x, hold, tau):
    """hold 秒之后按 tau 指数衰减（用来缩短大鼓/锣的长尾）"""
    x = x.copy(); h = int(hold * SR)
    if h < len(x):
        tt = np.arange(len(x) - h) / SR; x[h:] *= np.exp(-tt / tau).astype(np.float32)
        x = x[:h + int(tau * 7 * SR)]
        k = min(len(x), 480); x[-k:] *= np.linspace(1, 0, k, dtype=np.float32)
    return x


def mask_curve(fade_in_after=True):
    """静默遮罩：窗口内为 0，窗口前 80 ms 余弦淡出，窗口后 5 ms 淡入"""
    g = np.ones(N, np.float32)
    for a, b in SILENCE:
        ia, ib = int(round(a * SR)), int(round(b * SR)); nf = int(FADE * SR)
        g[ia - nf:ia] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nf))).astype(np.float32)
        g[ia:ib] = 0
        if fade_in_after and b != EV['strike']:
            k = int(.005 * SR); g[ib:ib + k] *= np.linspace(0, 1, k, dtype=np.float32)
    g[:int(round(EV['titleA'] * SR))] = 0          # 0–3.4 s 无音乐（雷雨由混音加）
    return g


# ════════════════════════ 乐器 ════════════════════════
PENT = [0, 2, 5, 7, 9]   # D 羽五声：C D F G A（音级）


def ornament(m, prev):
    """句末/长字的装饰：起点音高总与前一音不同，换字的音高变化落在字头上。
    级进上行 → 半音小上滑（滑音）；从上方下来或大跳上来 → 下方二度倚音（F 用 E 的半音倚音）。"""
    up = m - prev
    if up == 0: return {}
    if 0 < up <= 3: return dict(slide=1.0, slide_t=.08)
    g = 1.0 if m % 12 == 5 else 2.0
    return dict(grace=g) if abs((m - g) - prev) >= 1 else dict(slide=1.0, slide_t=.08)


def step_below(m):
    """五声音阶里下方相邻音（二度/小三度）"""
    k = m - 1
    while k % 12 not in PENT: k -= 1
    return k


# —— 二胡（主奏，代人声） ——
LEAD_LOG = []


def erhu_note(m, hold, rel, skip=.12, fade=.012, grace=0.0, slide=0.0, slide_t=.13,
              vib=None, fall=0.0, swell=0.0, gain=1.0):
    """二胡一音：从采样稳定段起奏（skip 跳过弓起），逐音电平归一，
    变速重采样实现 倚音/上滑/揉弦/下滑；hold 后按 rel 释放。返回单声道，t=0 即字的起点。"""
    total = hold + rel
    raw = S.note('erhu', float(m), skip + total + .35, vel=.8, release=.03)
    x = raw[int(skip * SR):].astype(np.float64)
    n = int(np.ceil(total * SR)) + 1
    t = np.arange(n) / SR
    c = np.zeros(n)
    if grace:   # 前倚音：下方二度 50 ms，35 ms 滑上本音
        c -= grace * (1 - smooth((t - .05) / .035))
    if slide:   # 上滑音
        c -= slide * (1 - smooth(t / slide_t))
    am = np.ones(n)
    if vib:     # 揉弦（延迟进入），带一点同步的弓压起伏
        rate, depth, st = vib
        ramp = np.clip((t - st) / .35, 0, 1); ph = 2 * np.pi * rate * np.maximum(t - st, 0)
        c += depth * ramp * np.sin(ph); am *= 1 + .05 * ramp * np.sin(ph - .6)
    if fall:    # 句尾下滑（叹息）
        c -= fall * smooth((t - (hold - .08)) / .25)
    r = 2 ** (c / 12)
    pos = np.concatenate([[0.0], np.cumsum(r[:-1])])
    if pos[-1] > len(x) - 2: x = np.pad(x, (0, int(pos[-1]) - len(x) + 4))
    y = np.interp(pos, np.arange(len(x)), x)
    k = int(min(1.0, max(hold, .15)) * SR)
    y *= .1 / (np.sqrt(np.mean(y[:k] ** 2)) + 1e-9)
    env = np.ones(n)
    nf = max(2, int(fade * SR)); env[:nf] = np.sin(np.linspace(0, np.pi / 2, nf)) ** 2
    if swell:
        env *= (1 - .5 * swell) + swell * smooth(t / max(.75 * hold, .05))
    nh = int(hold * SR)
    if n > nh:
        tr = np.arange(n - nh) / SR; env[nh:] *= np.exp(-6.9 * tr / max(rel, .01))
        kk = min(240, n - nh); env[-kk:] *= np.linspace(1, 0, kk)
    return (y * env * am * gain).astype(np.float32)


def onset_offset(x):
    """一个音的缓冲里，声音真正出现的位置（> 峰值 10%）"""
    a = np.abs(x[:int(.08 * SR)]); pk = a.max() + 1e-12
    return int(np.argmax(a > .1 * pk)) / SR


def render_phrase(notes, base_db, pan=0.03, tag=None):
    """notes: [dict(t, d, m, avail, last, opts, ch)]，按连奏规则算 hold/rel 并渲染。
    avail = 到下一句起点的时间（句末音用）；同音反复时前一音提早收弓。"""
    for i, nt in enumerate(notes):
        t, d, m, o = nt['t'], nt['d'], nt['m'], dict(nt.get('o') or {})
        nxt = notes[i + 1] if i + 1 < len(notes) else nt.get('link')
        first = i == 0 or (notes[i - 1]['t'] + notes[i - 1]['d'] < t - .12)
        if nxt is not None and nxt['t'] - (t + d) < .1:        # 连奏：压进下一个音 35 ms
            same = abs(nxt['m'] - m) < .01
            hold = (nxt['t'] - t) + (-.01 if same else .035); rel = .04 if same else .07
        elif nxt is not None and i + 1 < len(notes):            # 句中换气
            hold = d + min(.1, (nxt['t'] - t - d) * .5); rel = .12
        else:                                                   # 句末长音：唱满并留呼吸
            av = nt.get('avail', d + 1.0)
            ext = min(.45, av - d - .3) if d < .7 else min(.25, av - d - .3)
            hold = d + max(0.0, ext)
            rel = float(min(.5, max(.12, (av - hold) * .6)))
        if nt.get('last'):
            o.setdefault('swell', .3 if hold > .6 else .15)
        if hold >= .42 and 'vib' not in o:
            o['vib'] = (5.6, .15 if hold < .8 else .2, .2)
        if hold < .3: o.pop('grace', None); o.pop('slide', None)
        same_prev = i > 0 and abs(notes[i - 1]['m'] - m) < .01
        skip = .22 if first else (.2 if same_prev else .25)          # 跳过采样的慢起弓，字头立刻发声
        fade = .012 if first else (.015 if same_prev else .012)
        db = base_db + nt.get('db', 0.0)
        x = erhu_note(m, hold, rel, skip=skip, fade=fade, gain=10 ** (db / 20), **o)
        put('lead', x, t, 1.0, pan)
        if nt.get('ch'):
            LEAD_LOG.append(dict(c=nt['ch'], t0=nt['t'], sched=int(round(t * SR)) / SR,
                                 on=onset_offset(x), m=m, tag=tag, p0=m - o.get('grace', 0) - o.get('slide', 0),
                                 orn=bool(o.get('grace') or o.get('slide')),
                                 nxt=(nxt['t'] - t) if nxt is not None else hold))


# —— 箫（合成：正弦 + 2/3 次谐波 + 带通气声 + 延迟颤音） ——
def xiao(m, dur, vel=.7, attack=.1, release=.22, vib=(4.8, .08, .35), slide=0.0, seed=None):
    rng = np.random.default_rng(seed if seed is not None else int(RNG.integers(1 << 30)))
    n = int((dur + release) * SR); t = np.arange(n) / SR
    c = np.zeros(n)
    if slide: c -= slide * (1 - smooth(t / .14))
    rate, depth, st = vib
    ramp = np.clip((t - st) / .5, 0, 1); vph = 2 * np.pi * rate * t + rng.random() * 6
    c += depth * ramp * np.sin(vph)
    dr = lp(rng.standard_normal(n), 2.5); c += .04 * dr / (np.std(dr) + 1e-9)
    f = S.hz(m) * 2 ** (c / 12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) + .26 * np.sin(2 * ph + .4) + .09 * np.sin(3 * ph + 1.3) + .03 * np.sin(4 * ph + .2)
    nz = rng.standard_normal(n)
    nb = lp(nz, 160); nb /= (np.std(nb) + 1e-9)
    pitched = nb * (np.sin(ph) + .35 * np.sin(2 * ph))          # 贴着音高的气声
    air = bp(nz, 1100, 5200); air /= (np.std(air) + 1e-9)     # 吹口的风声
    chiff = air * np.exp(-t / .04)
    flutter = lp(rng.standard_normal(n), 3.0); flutter /= (np.std(flutter) + 1e-9)
    am = 1 + .09 * ramp * np.sin(vph + 1.0) + .03 * flutter
    env = np.ones(n); na = max(2, int(attack * SR)); env[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    nd = int(dur * SR)
    if n > nd: env[nd:] *= np.exp(-6.9 * np.arange(n - nd) / SR / release)
    y = (tone * .72 + pitched * .2 + air * .045) * am * env + chiff * .12 * env
    y = hp(lp(y, 4800), 110)
    k = slice(int(min(.15, dur / 2) * SR), max(int(min(.15, dur / 2) * SR) + 10, nd))
    y *= .1 / (np.sqrt(np.mean(y[k] ** 2)) + 1e-9) * (vel / .8) ** 1.2
    kk = min(240, n); y[-kk:] *= np.linspace(1, 0, kk)
    return y.astype(np.float32)


def xiao_at(t, m, dur, vel=.6, gain=.55, pan=-.25, **kw):
    put('xiao', xiao(m, dur, vel, **kw), t, gain, pan)


def xiao_fig(bar, fig, vel=.6, gain=.55, pan=-.25):
    """fig: [(小节偏移, 拍, midi, 拍数)]"""
    for k, (db_, bt, m, nb) in enumerate(fig):
        xiao_at(tb(bar + db_, bt), m, nb * BEAT, vel * (1.0 if k else .95), gain, pan,
                attack=.09 if k else .14)


# —— 古琴 / 古筝 / 琵琶 ——
def guqin(t, m, dur=2.0, vel=.6, gain=.6, pan=-.1, **kw):
    put('pluck', P.pluck('guqin', m, dur, vel, **kw), t, gain, pan)


def guqin_sweep(t, pitches, vel=.8, spread=.03, dur=2.5, gain=.6, pan=-.1, up=False, **kw):
    put('pluck', P.strum('guqin', pitches, dur, vel, spread=spread, up=up, **kw), t, gain, pan)


def zheng(t, m, vel=.45, dur=1.1, gain=.35, pan=-.35, rel=.6):
    put('pluck', S.note('dan_tranh', m, dur, vel, release=rel), t, gain, pan)


def zheng_gliss(t_a, t_b, lo, hi, vel=.4, gain=.3, pan=-.35, down=False):
    ps = [m for m in range(lo, hi + 1) if m % 12 in PENT]
    if down: ps = ps[::-1]
    for i, m in enumerate(ps):
        u = i / max(1, len(ps) - 1)
        zheng(t_a + (t_b - t_a) * u, m, vel * (.7 + .4 * (u if not down else 1 - u)), .5, gain, pan, .5)


def pipa_trem(t, m, dur, vel=.45, gain=.3, pan=.4):
    put('pluck', P.pluck('pipa', m, dur, vel, trem=14, release=.3), t, gain, pan)


# —— 弦乐铺底（只作底色，attack>0） ——
def pad(inst, m, t_a, t_b, vel=.4, attack=.6, release=.9, gain=.35, pan=0.0, trem=0.0, env=None):
    x = S.note(inst, m, max(.2, t_b - t_a), vel, release=release, attack=attack)
    if trem:   # 震音感：11 Hz 幅度起伏
        tt = np.arange(len(x)) / SR; x = x * (1 - trem * (.5 + .5 * np.sin(2 * np.pi * 11 * tt))).astype(np.float32)
    if env is not None: x = x * env(np.arange(len(x)) / SR).astype(np.float32)
    put('strings', x, t_a, gain, pan)


# —— 打击 ——
def perc(t, inst, var=None, vel=.7, gain=.5, pan=0.0, short=None, stem='perc', jitter=0.0):
    x = S.hit(inst, var, vel)
    if short: x = decay_after(x, *short)
    put(stem, x, t + (RNG.normal(0, jitter) if jitter else 0.0), gain, pan)


def timp(t, pitch, vel=.7, gain=.55, pan=-.1, dur=2.0, jitter=0.0):
    put('perc', S.note('timpani', pitch, dur, vel), t + (RNG.normal(0, jitter) if jitter else 0.0), gain, pan)


# ════════════════════════ 和声 ════════════════════════
VERSE_H = ['Dm', 'Bb', 'C', 'Dm', 'Dm', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'C', 'Gm', 'Asus4']
CHORUS_H = ['Bb', 'C', 'Dm', 'Gm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'Dm', 'Gm', 'Bb', 'F', 'C', 'Dm']
H = {4: 'Dm', 5: 'Bb', 6: 'F', 7: 'C', 8: 'Asus4'}
for k, c in enumerate(VERSE_H): H[SB['v1'] + k] = c; H[SB['v2'] + k] = c
for k, c in enumerate(CHORUS_H): H[SB['c1'] + k] = c; H[SB['c2'] + k] = c; H[SB['c3'] + k] = c
H[SB['c3'] + 15] = 'D5'                                    # 副歌三收在空五度 D（不带三音）
LAMENT_H = ['Dm', 'Dm', 'Gm', 'Bb', 'Gm', 'Dm']            # 第 44–49 小节
for k, c in enumerate(LAMENT_H): H[SB['inter'] + 3 + k] = c

POOL = {   # 古筝琶音音池（升序）
    'Dm': [50, 57, 62, 65, 69, 72], 'Bb': [46, 53, 58, 62, 65, 69], 'C': [48, 55, 60, 62, 67, 72],
    'F': [48, 53, 57, 60, 65, 69], 'Gm': [43, 50, 55, 58, 62, 67], 'Asus4': [45, 52, 57, 62, 64, 69],
    'D5': [50, 57, 62, 64, 69, 74]}
GQ_ROOT = {'Dm': 38, 'Bb': 46, 'C': 36, 'F': 41, 'Gm': 43, 'Asus4': 45, 'D5': 38}   # 古琴散音低音区（C2–B2）
CB_ROOT = {'Dm': 38, 'Bb': 46, 'C': 48, 'F': 41, 'Gm': 43, 'Asus4': 45, 'D5': 38}
TIMP1 = {'Dm': 'D3', 'Bb': 'Bb2', 'C': 'C3', 'F': 'F3', 'Gm': 'G3', 'Asus4': 'A2', 'D5': 'D3'}
TIMP5 = {'Dm': 'A2', 'Bb': 'F3', 'C': 'G3', 'F': 'C3', 'Gm': 'D3', 'Asus4': 'E3', 'D5': 'A2'}
VO = {   # 弦乐声部：(大提琴, 中提琴, 小提琴)，铺底音都不低于 MIDI 48
    'Dm': ([50, 57], [62, 65], [69, 74]), 'Bb': ([50, 53], [58, 62], [65, 70]),
    'C': ([48, 55], [60, 67], [67, 72]), 'F': ([53, 60], [65, 69], [69, 72]),
    'Gm': ([55, 62], [58, 65], [67, 70]), 'Asus4': ([57, 64], [62, 69], [69, 74]),
    'D5': ([50, 57], [62, 69], [74, 76])}

PAT = [[0, 1, 2, 3, 4, 3, 2, 1], [0, 2, 1, 3, 2, 4, 3, 2], [0, 1, 3, 2, 4, 3, 5, 3], [0, 2, 3, 5, 4, 3, 2, 1]]


def arp(bar, vel=.45, idx_max=5, oct=0, pat=None, sub=2, gain=.35, pan=-.35, beats=(0, 4), chord=None):
    """古筝八分（sub=2）/十六分（sub=4）琶音，按小节和弦"""
    ch = chord or H[bar]; pool = [m + oct for m in POOL[ch][:idx_max + 1]]
    p = PAT[(bar + (0 if pat is None else pat)) % len(PAT)]
    k = 0; b = beats[0]
    while b < beats[1] - 1e-6:
        i = p[k % len(p)] % len(pool)
        acc = 1.12 if abs(b - round(b)) < 1e-6 and int(round(b)) % 2 == 0 else (1.0 if abs(b - round(b)) < 1e-6 else .86)
        zheng(tb(bar, b) + RNG.normal(0, .004), pool[i], float(np.clip(vel * acc + RNG.normal(0, .03), .1, 1)), 1.1, gain, pan)
        k += 1; b += 1 / sub


def strings_bed(b0, b1, vel=.35, which=('c',), attack=.6, gain=(.35, .25, .14), trem=0.0, ext=.3):
    """按小节和弦铺弦乐；相同和弦合并成长音"""
    runs = []
    for b in range(b0, b1):
        c = H.get(b)
        if c is None: continue
        if runs and runs[-1][2] == c and runs[-1][1] == b: runs[-1][1] = b + 1
        else: runs.append([b, b + 1, c])
    for a, z, c in runs:
        ce, va, vi = VO[c]
        for w, notes, g, pn, inst in (('c', ce, gain[0], -.2, 'cellos'), ('v', va, gain[1], .25, 'violas'),
                                      ('n', vi, gain[2], .1, 'violins')):
            if w not in which: continue
            for m in notes:
                pad(inst, m, tb(a) - .03, tb(z) + ext, vel, attack, .9, g, pn, trem)


def frame_bar(bar, vel=.6, gain=.4, sixteenth=False, only=None):
    """框鼓八分：1、3 拍大鼓面，2、4 拍掌击，弱拍闷音小鼓面"""
    lv = [.78, .3, .5, .3, .62, .3, .5, .38]
    for k in range(8):
        if only is not None and k not in only: continue
        b = k * .5
        var = 'large' if k in (0, 4) else ('hand' if k in (2, 6) else 'small_muted')
        perc(tb(bar, b), 'frame_drum', var, float(np.clip(vel * lv[k] / .78 + RNG.normal(0, .03), .05, 1)),
             gain, .25 if var != 'large' else .12, jitter=.004)
    if sixteenth:
        for b, v in ((3.5, .35), (3.75, .5)):
            perc(tb(bar, b), 'frame_drum', 'small_muted', vel * v, gain, .3, jitter=.003)


def fill(bar, vel=.75, gain=.5):
    """进下一乐句的定音鼓十六分加花（第 4 拍）"""
    seq = ['A2', 'D3', 'A2', 'D3']
    for k, p in enumerate(seq):
        timp(tb(bar, 3 + k * .25), p, vel * (.6 + .13 * k), gain)
        perc(tb(bar, 3 + k * .25), 'frame_drum', 'large_muted', vel * (.5 + .12 * k), gain * .8, .15)


# ════════════════════════ 旋律（原创） ════════════════════════
# D4=62 E4=64 F4=65 G4=67 A4=69 Bb4=70 C5=72 D5=74 F5=77 G5=79 A5=81 C6=84
VERSE = [
    [62, 65, 67, 69, 72, 67, 69],   # 前句：上行，开放收在 A
    [69, 72, 69, 67, 65, 67, 62],   # 后句：下行，收在 D
    [62, 65, 67, 69, 72, 74, 72],   # 前句（变）：更高，收在 C
    [72, 69, 67, 69, 67, 65, 62],   # 后句：收在 D
    [69, 72, 74, 72, 69, 67, 69],   # 前句（对比）：收在 A
    [67, 67, 69, 72, 69, 65, 62],   # 后句：收在 D
    [62, 65, 67, 69, 72, 74, 72],   # 前句：收在 C
    [69, 67, 69, 72, 69, 72, 74],   # 后句：扬起，收在高八度 D（引入副歌）
]
CHORUS = [
    [69, 74, 72, 74, 77, 74],       # 当恩怨各一半
    [72, 74, 72, 77, 79],           # 我怎么圈揽
    [77, 74, 72, 74, 77, 79],       # 看灯笼血红染
    [77, 74, 72, 69, 74],           # 寻仇已太晚
    [72, 74, 77, 74, 79, 81],       # 月下门童喟叹
    [79, 77, 74, 72, 69, 74],       # 昨夜太平长安
    [69, 74, 72, 74, 77, 79],       # 当天上星河转
    [72, 74, 77, 79, 81],           # 我命已定盘
    [79, 77, 74, 72, 74, 77],       # 待绝笔墨痕干
    [69, 72, 74, 77, 74],           # 宿敌已来犯
    [69, 67, 65, 67, 69, 72],       # 我借你的孤单（副歌三高八度）
    [72, 69, 67, 65, 67, 62],       # 今生恐怕难还（副歌三高八度）
]
CLIMAX = set('揽染晚叹安转盘干犯单还')
LAMENT = [  # 间奏挽歌（无词）：(小节偏移, 拍, midi, 拍数)
    (0, 0.0, 74, 1.5), (0, 1.5, 72, .5), (0, 2.0, 69, 2.0),
    (1, 0.0, 67, 1.0), (1, 1.0, 69, .5), (1, 1.5, 72, .5), (1, 2.0, 74, 1.0), (1, 3.0, 77, 1.0),
    (2, 0.0, 74, 1.5), (2, 1.5, 72, .5), (2, 2.0, 70, 1.0), (2, 3.0, 69, 1.0),
    (3, 0.0, 67, 1.0), (3, 1.0, 65, .5), (3, 1.5, 67, .5), (3, 2.0, 69, 1.0), (3, 3.0, 67, .5), (3, 3.5, 65, .5),
    (4, 0.0, 62, 1.6)]

LINES = LY
SEC_ORDER = ['intro', 'v1', 'c1', 'inter', 'v2', 'c2', 'brk', 'c3', 'outro']


def sec_of(t):
    for k in SEC_ORDER:
        a, b = SEC[k]
        if a - .5 <= t < b - .5: return k
    return None


SEC_LINES = {}
for i, L in enumerate(LINES): SEC_LINES.setdefault(sec_of(L['t0']), []).append(i)
log('lines per section', {k: (v[0], v[-1], len(v)) for k, v in SEC_LINES.items()})
assert [len(SEC_LINES[k]) for k in ('v1', 'c1', 'v2', 'c2', 'c3')] == [8, 12, 8, 12, 12]
SEC_DB = {'v1': -1.5, 'c1': 1.0, 'v2': -3.0, 'c2': 1.5, 'c3': 2.5}


def lead_section(sec):
    ids = SEC_LINES[sec]
    tune = VERSE if sec in ('v1', 'v2') else CHORUS
    for k, li in enumerate(ids):
        L = LINES[li]; chars = L['chars']; mel = list(tune[k])
        assert len(mel) == len(chars), (sec, k, L['text'], len(mel), len(chars))
        if sec == 'c3' and k >= 10: mel = [m + 12 for m in mel]     # 副歌三最后两句高八度
        nxt_t = LINES[li + 1]['t0'] if li + 1 < len(LINES) and li + 1 in ids else None
        if sec == 'c1' and k == len(ids) - 1: nxt_t = chars[-1]['t0'] + 2.6
        if sec == 'c2' and k == len(ids) - 1: nxt_t = EV['brkMusicA'] - .05
        if sec == 'c3' and k == len(ids) - 1: nxt_t = chars[-1]['t0'] + 3.4
        if sec in ('v1', 'v2') and k == len(ids) - 1: nxt_t = chars[-1]['t0'] + 2.6
        lo, hi = min(mel), max(mel)
        notes = []
        for j, ch in enumerate(chars):
            m = mel[j]; last = j == len(chars) - 1
            prev = mel[j - 1] if j else m
            o = {}
            db = 1.2 * (m - (lo + hi) / 2) / max(6, hi - lo)          # 高音略响（二胡自然）
            if last:
                db += .5
                o.update(ornament(m, prev))
                if sec in ('c1', 'c2', 'c3') and ch['c'] in CLIMAX:
                    db += 1.5; o['vib'] = (5.8, .24, .22)
                    if sec == 'c3': o['vib'] = (5.8, .27, .2)
                if sec == 'v2' and k == 3: o['fall'] = 1.5
                if sec == 'c1' and k == 11: o['fall'] = 1.0
                if sec == 'c2' and k == 11: o['fall'] = 2.0
            elif sec == 'c3' and ch['d'] >= .45 and j:
                o.update(ornament(m, prev))                             # 副歌三：长字多加装饰
            elif sec == 'v2' and ch['d'] >= .4 and j % 2:
                o.update(ornament(m, prev))
            notes.append(dict(t=ch['t0'], d=ch['d'], m=m, o=o, db=db, last=last, ch=ch['c'],
                              avail=(nxt_t - ch['t0']) if (last and nxt_t) else ch['d'] + 1.0))
        # 下一句紧接（无缝）时，句末音按连奏处理（保留句末的揉弦与渐强）
        if nxt_t is not None and li + 1 in ids and nxt_t - (chars[-1]['t0'] + chars[-1]['d']) < .1:
            nm = tune[k + 1][0] + (12 if sec == 'c3' and k + 1 >= 10 else 0)
            notes[-1]['link'] = dict(t=nxt_t, m=nm)
        render_phrase(notes, SEC_DB[sec], tag=sec)


def lament():
    b0 = SB['inter'] + 4                                  # 第 45 小节 = ev.gong
    notes = []
    for k, (db_, bt, m, nb) in enumerate(LAMENT):
        o = {}
        if k == 0: o = dict(slide=2.0, slide_t=.16)
        if m == 77: o = dict(grace=1.0)
        notes.append(dict(t=tb(b0 + db_, bt), d=nb * BEAT, m=m, o=o, db=0.0, last=False, ch=None))
    notes[-1]['last'] = True; notes[-1]['avail'] = notes[-1]['d'] + .9
    notes[-1]['o'] = dict(vib=(5.2, .15, .25))
    render_phrase(notes, -2.0, tag='inter')


# ════════════════════════ 各段编配 ════════════════════════
def intro():
    log('intro'); CUR[0] = 'intro'
    ta = EV['titleA']
    guqin_sweep(ta, [45, 50, 53, 55, 57, 62, 69], vel=.75, spread=.035, dur=3.5, gain=.7)   # 片名第一笔
    guqin(ta + 2.2, 57, 2.5, .42, .55, vib=(4.5, .18, .9))                                  # 吟
    guqin(ta + 3.5, 69, None, .45, .45, harmonic=True, pan=.2)
    guqin(EV['titleSeal'], 50, 2.6, .58, .65)                                               # 落印
    guqin(EV['tiltA'], 74, None, .38, .4, harmonic=True, pan=.25)                           # 天上星
    xiao_at(ta + 1.0, 62, 2.3, .5, .5, attack=.45)
    xiao_at(ta + 3.8, 65, .55, .5, .5)
    xiao_at(ta + 4.35, 67, .5, .52, .5)
    xiao_at(ta + 4.9, 69, 1.5, .55, .5, slide=2.0)
    # 第 4 小节 = ev.tiltDrum：大鼓一记 + 古筝琶音进入，从高（天）到低（地）逐渐加强
    t4 = tb(4); assert abs(t4 - EV['tiltDrum']) < .01
    perc(t4, 'gran_cassa', 'hit', .8, .55, 0, short=(.4, 1.2))
    timp(t4, 'D3', .5, .4)
    for b in range(4, 9):
        arp(b, vel=.3 + .045 * (b - 4), oct=12 if b < 6 else 0, idx_max=5 if b < 6 else 4, gain=.3 + .02 * (b - 4))
        guqin(tb(b), GQ_ROOT[H[b]], 2.3, .45 + .03 * (b - 4), .5, release=.6)
    strings_bed(6, 9, vel=.3, which=('c',), attack=1.2, gain=(.3, 0, 0))
    xiao_fig(5, [(0, 0, 69, 2), (0, 2, 67, 1), (0, 3, 69, 1), (1, 0, 72, 1.5), (1, 1.5, 69, .5), (1, 2, 67, 2),
                 (2, 0, 65, 1), (2, 1, 67, 1), (2, 2, 69, 2), (3, 0, 69, 1), (3, 1, 67, 1), (3, 2, 64, .5),
                 (3, 2.5, 62, 1.1)], vel=.6, gain=.5)
    # 第 8 小节：大鼓滚奏轻渐强 → 主歌
    roll = S.hit('gran_cassa', 'roll', .5)[:int(BAR * SR)]
    roll = roll * np.linspace(.05, 1, len(roll), dtype=np.float32) ** 2
    put('perc', roll, tb(8), .35, 0)
    zheng_gliss(tb(8, 3.0), tb(8, 3.6), 62, 86, vel=.35, gain=.22, down=True)


VERSE_XIAO = [(1, 1.0, 62, .5), (1, 1.5, 65, .5), (1, 2.0, 67, 1.3),
              (3, 1.5, 57, .5), (3, 2.0, 60, .5), (3, 2.5, 62, .9),
              (5, 1.5, 69, .5), (5, 2.0, 67, .5), (5, 2.5, 65, .9),
              (7, 1.5, 65, .5), (7, 2.0, 64, .5), (7, 2.5, 62, .9),
              (9, 1.5, 65, .5), (9, 2.0, 67, .5), (9, 2.5, 69, .9),
              (11, 1.5, 57, .5), (11, 2.0, 60, .5), (11, 2.5, 62, .9),
              (13, 1.5, 64, .5), (13, 2.0, 67, .5), (13, 2.5, 69, .9)]


def verse(sec):
    log(sec); CUR[0] = sec
    b0 = SB[sec]; v2 = sec == 'v2'
    for k in range(16):
        b = b0 + k; c = H[b]
        if not v2 or k >= 8:
            if v2 and k < 12:                                             # 主歌二：第 58 小节起古筝四分音符
                arp(b, vel=.34, idx_max=3, sub=1, gain=.3)
            else:
                arp(b, vel=.4 + (.04 if k >= 8 else 0) - (.04 if v2 else 0), idx_max=3, gain=.32)
        if not v2 or k % 2 == 0 or k >= 8:                                # 古琴低音落在强拍（主歌二更稀）
            guqin(tb(b), GQ_ROOT[c], 2.3, .5 if not v2 else .4, .6, release=.6)
        if v2 and k % 2 == 1 and k < 8:                                   # 主歌二：留白里一声按音上滑
            guqin(tb(b, 2.5), GQ_ROOT[c] + 7 + 12 * (GQ_ROOT[c] < 48), 2.0, .34, .45,
                  bend=[(0, -2), (.25, -2), (.5, 0)], vib=(4.5, .15, .8))
        if (not v2 and k >= 8) or (v2 and k >= 12):                       # 轻手鼓：2、4 拍
            for bt in (1, 3):
                perc(tb(b, bt), 'frame_drum', 'hand', .34 if not v2 else .26, .38, .25, jitter=.004)
            perc(tb(b, 3.5), 'frame_drum', 'small_muted', .2, .38, .3, jitter=.004)
    if v2:
        pad('cellos', 50, tb(b0) - .1, tb(b0 + 8) + .4, .26, 3.0, 1.2, .26, -.2)      # 很弱的大提琴持续音
        strings_bed(b0 + 8, b0 + 16, vel=.28, which=('c',), attack=.9, gain=(.27, 0, 0))
    else:
        strings_bed(b0, b0 + 16, vel=.32, which=('c',), attack=.7, gain=(.32, 0, 0))
        for bb in (b0, b0 + 4, b0 + 8, b0 + 12):                                # 少量低音提琴长音
            pad('contrabass', CB_ROOT[H[bb]], tb(bb), tb(bb + 2), .3, 1.0, 1.2, .26, 0)
    fig = VERSE_XIAO if not v2 else [(a, b_, m, nb + (.3 if nb > .8 else 0)) for a, b_, m, nb in VERSE_XIAO]
    xiao_fig(b0, fig, vel=.6 if not v2 else .66, gain=.5 if not v2 else .6)
    if v2:   # 星光：古琴泛音（摘星 / 给星）
        guqin(EV['starScoop'], 81, None, .32, .32, harmonic=True, pan=.3, t60=4.0)
        guqin(EV['starGive'], 86, None, .3, .3, harmonic=True, pan=.3, t60=4.0)
    # 进副歌：古筝刮奏 + 定音鼓加花
    bl = b0 + 15
    zheng_gliss(tb(bl, 3.25), tb(bl, 3.95), 62, 86, vel=.45, gain=.3)
    fill(bl, .6 if not v2 else .55, .45)
    lead_section(sec)


def chorus(sec):
    log(sec); CUR[0] = sec
    b0 = SB[sec]; heavy = sec == 'c2'; wide = sec == 'c3'
    t0 = tb(b0)
    perc(t0, 'gong2', 'small', .72 if not heavy else .8, .5, -.2, stem='gong')
    if heavy: perc(t0, 'gong', None, .45, .35, .2, stem='gong')
    if wide: perc(t0, 'gong2', 'big', .65, .5, .2, stem='gong'); perc(t0, 'bass_drum', None, .8, .5, 0, short=(.3, .8))
    # 副歌二：第 79 小节起放慢、抽空（第 80 小节由 chorus2_ending 收）；副歌三：第 98 小节的终止和弦由 outro 写
    nbar = 14 if heavy else (15 if wide else 16)
    for k in range(nbar):
        b = b0 + k; c = H[b]
        half = heavy and k == 13
        timp(tb(b), TIMP1[c], .72 + (.06 if heavy or wide else 0), .75, jitter=.002)
        if not half:
            timp(tb(b, 2), TIMP5[c], .46 + (.08 if heavy else 0), .5, jitter=.003)
        perc(tb(b), 'gran_cassa', 'hit', .62 + (.1 if heavy or wide else 0), .78, 0, short=(.3, .7))
        if k % 4 == 0: perc(tb(b), 'bass_drum', None, .7, .55, 0, short=(.3, .6))
        if (heavy or wide) and not half: perc(tb(b, 2), 'gran_cassa', 'hit', .45, .42, 0, short=(.25, .6))
        if wide:
            frame_bar(b, vel=.5, gain=.36, sixteenth=(k % 4 == 3))
        elif half:
            frame_bar(b, vel=.6, gain=.38, only=(0, 4))
        else:
            frame_bar(b, vel=.6 if not heavy else .68, gain=.4, sixteenth=heavy and k % 2 == 1)
        if k % 4 == 3 and k < 13: fill(b, .8 if heavy else .72, .5)
        # 古筝
        if half:
            arp(b, vel=.46, sub=1, gain=.34)                                   # 放慢：四分
        elif wide:
            arp(b, vel=.48, idx_max=5, gain=.34, pat=1)
            arp(b, vel=.3, idx_max=3, oct=12, gain=.18, pat=2, pan=.35, beats=(.25, 4))   # 高八度回声，更宽
        else:
            arp(b, vel=.48 if not heavy else .52, idx_max=5, gain=.34)
        guqin(tb(b), GQ_ROOT[c], 2.0, .42, .4, release=.5)
    # 弦乐
    cb_bars = [b0, b0 + 4, b0 + 8, b0 + 12] if not heavy else list(range(b0, b0 + 14, 2))
    which = ('c', 'v') if not wide else ('c', 'v', 'n')
    if heavy:
        strings_bed(b0, b0 + 14, vel=.48, which=which, attack=.35, gain=(.36, .26, .14))
    else:
        strings_bed(b0, b0 + nbar, vel=.45 if not wide else .5, which=which, attack=.35, gain=(.35, .25, .13))
    for bb in cb_bars:
        pad('contrabass', CB_ROOT[H[bb]], tb(bb), tb(bb + 2) + .1, .42 if heavy else .36, .3, 1.0,
            .42 if heavy else (.42 if wide else .34), 0)
    # 琵琶轮指：长字下方八度
    ids = SEC_LINES[sec]
    for k, li in enumerate(ids):
        mel = CHORUS[k]
        if heavy and k == len(ids) - 1: continue                               # 副歌二末句：只留二胡
        for j, ch in enumerate(LINES[li]['chars']):
            last = j == len(mel) - 1
            if ch['d'] >= .5 or (last and ch['c'] in CLIMAX):
                m = mel[j] - 12 if mel[j] - 12 >= 57 else mel[j]
                dur = max(.45, ch['d'] * (1.1 if last else .9))
                pipa_trem(ch['t0'] + .02, m, dur, .42 + (.06 if heavy or wide else 0), .26 if not wide else .28)
    # 箫：句间回应
    xf = [(0, 1.5, 69, .5), (0, 2.0, 72, .5), (0, 2.5, 74, .9)]
    xiao_fig(b0 + 7, xf, vel=.55, gain=.42)
    if wide:   # 副歌三：箫在原八度托住最后两句（二胡已高八度）
        for k in (10, 11):
            for j, ch in enumerate(LINES[ids[k]]['chars']):
                d = ch['d'] + (.4 if j == len(CHORUS[k]) - 1 else .03)
                xiao_at(ch['t0'], CHORUS[k][j], d, .62, .42, pan=-.3, attack=.06)
    lead_section(sec)


def chorus2_ending():
    """副歌二末句放慢进 arrowSnap：打击停，弦乐在折箭处收，二胡独自留下，然后真静默"""
    CUR[0] = 'c2'; b0 = SB['c2']; snap = EV['arrowSnap']
    b = b0 + 14; c = H[b]                                                      # 第 80 小节
    assert tb(b) < snap < tb(b + 1)
    perc(tb(b), 'gran_cassa', 'hit', .55, .45, 0, short=(.4, .9))
    timp(tb(b), TIMP1[c], .55, .45)
    for bt in (0, 2):                                                          # 古筝二分音符：更慢
        zheng(tb(b, bt), POOL[c][2 + bt // 2], .38, 1.6, .3)
    guqin(tb(b), GQ_ROOT[c], 2.0, .38, .38, release=.5)
    ce, va, _ = VO[c]
    for p in ce: pad('cellos', p, tb(b) - .03, snap + .05, .42, .3, .45, .3, -.2)
    for p in va: pad('violas', p, tb(b) - .03, snap + .05, .4, .3, .45, .22, .25)
    timp(snap, 'D3', .4, .35)                                                  # 折箭处一记弱定音鼓
    pad('cellos', 50, snap, EV['brkMusicA'] - .55, .26, .3, .4, .2, -.2)       # 只剩一线 D，淡出


def interlude():
    log('inter'); CUR[0] = 'inter'
    b = SB['inter']; ta = tb(b); hush = EV['hushMusic']
    # 41–43 小节：风暴渐强，在 hushMusic 处戛然而止
    span = hush - ta
    def cresc(lo_db, hi_db, start=0.0):
        return lambda tt: 10 ** ((lo_db + (hi_db - lo_db) * np.clip((tt - start) / max(span - start, .1), 0, 1) ** 1.6) / 20)
    roll = S.hit('gran_cassa', 'roll', .85); n = min(len(roll), int(span * SR))
    roll = roll[:n] * cresc(-20, 0)(np.arange(n) / SR).astype(np.float32)
    put('perc', roll, ta, .6, 0)
    tt = tb(b + 1)
    k = 0
    while tt < hush - .05:   # 定音鼓滚奏
        u = (tt - tb(b + 1)) / (hush - tb(b + 1))
        timp(tt, 'D3' if k % 2 == 0 else 'A2', .35 + .6 * u ** 1.3, .5, dur=.4)
        tt += 1 / 13; k += 1
    sc = S.hit('gong2', 'scrape', .7); n2 = min(len(sc), int((hush - tb(b + 1)) * SR))
    put('gong', sc[:n2] * np.linspace(.05, 1, n2, dtype=np.float32) ** 2, tb(b + 1), .4, .2)
    env = cresc(-14, 0)
    for m in (50, 57): pad('cellos', m, ta - .05, hush, .55, .5, .1, .4, -.2, trem=.35, env=env)
    for m in (62, 65): pad('violas', m, ta - .05, tb(b + 1, 2), .5, .5, .1, .28, .25, trem=.35, env=env)
    for m in (62, 64): pad('violas', m, tb(b + 1, 2), hush, .55, .1, .1, .3, .25, trem=.35,
                           env=lambda t_: env(t_ + tb(b + 1, 2) - ta))
    pad('contrabass', 38, ta, hush, .5, 1.0, .1, .3, 0, env=env)
    pipa_trem(tb(b, 2), 62, tb(b + 1, 2) - tb(b, 2), .45, .26)
    pipa_trem(tb(b + 1, 2), 64, hush - tb(b + 1, 2), .6, .3)
    pipa_trem(tb(b + 1), 57, hush - tb(b + 1), .55, .26, -.2)
    # —— 静默 hushMusic → strike ——
    # 第 44 小节 = strike：大鼓 + 定音鼓 + 锣 + 古琴七弦疾扫
    st = EV['strike']; assert abs(tb(b + 3) - st) < .01
    perc(st, 'bass_drum', None, 1.0, .75, 0)
    perc(st, 'gran_cassa', 'hit', .95, .6, 0, short=(.8, 1.8))
    timp(st, 'D3', .95, .6); timp(st + .004, 'A2', .9, .45)
    perc(st, 'gong', None, .85, .6, .15, stem='gong')
    guqin_sweep(st, [48, 50, 53, 55, 57, 60, 62], vel=.95, spread=.012, dur=3.0, gain=.85, up=True)
    pad('contrabass', 38, st, tb(b + 4) + .5, .6, .03, 2.0, .38, 0)
    for m in (50, 57): pad('cellos', m, st, tb(b + 4) + .4, .55, .05, 1.0, .4, -.2)
    for m in (62, 65): pad('violas', m, st + .02, tb(b + 4) + .4, .45, .25, 1.0, .25, .25)
    perc(EV['gong'], 'gong2', 'big', .5, .4, -.15, stem='gong')
    # 45–49 小节：挽歌（低音弦乐长音 + 二胡独奏），末了古琴泛音进主歌二
    strings_bed(b + 4, b + 8, vel=.36, which=('c', 'v'), attack=.8, gain=(.32, .2, 0), ext=.4)
    pad('cellos', 50, tb(b + 8) - .03, EV['harmonic'] + .3, .3, .5, 1.2, .26, -.2)
    pad('violas', 57, tb(b + 8) - .03, EV['harmonic'] + .3, .3, .5, 1.2, .16, .25)
    for bb in (b + 4, b + 6):
        pad('contrabass', CB_ROOT[H[bb]], tb(bb), tb(bb + 2) + .2, .3, .8, 1.0, .2, 0)
    guqin(EV['harmonic'], 74, None, .62, .55, harmonic=True, pan=.1)
    lament()


def outro():
    log('outro'); CUR[0] = 'c3'
    b0 = SB['outro']
    # 副歌三的终止：长 D 和弦（空五度）在第 98 小节落下，延续到 ~246
    t98 = tb(b0 - 1)
    perc(t98, 'gran_cassa', 'hit', .75, .5, 0, short=(.6, 1.5))
    timp(t98, 'D3', .7, .5)
    perc(t98, 'gong2', 'big', .45, .35, .2, stem='gong')
    guqin_sweep(t98, [50, 57, 62, 64, 69, 74], vel=.6, spread=.045, dur=3.0, gain=.5)
    for m in (69, 74, 81):
        zheng(t98 + .3 + .15 * (m - 69) / 6, m, .32, 2.0, .2, -.4, 1.2)
    ce, va, vi = VO['D5']
    for m in ce: pad('cellos', m, t98 - .03, 245.9 if 245.9 > t98 else t98 + 3, .45, .3, 1.6, .34, -.2)
    for m in va: pad('violas', m, t98 - .03, 245.9 if 245.9 > t98 else t98 + 3, .42, .3, 1.6, .22, .25)
    for m in vi: pad('violins', m, t98 + .4, 245.5, .3, .8, 1.6, .1, .1)
    pad('contrabass', 38, t98, 245.0, .35, .3, 1.5, .24, 0)
    # 尾奏：古琴独奏，慢、稀；ev.seal 一记低 D + 小锣（钤印）
    CUR[0] = 'outro'
    seal = EV['seal']; assert abs(tb(103) - seal) < .02
    guqin(tb(b0, 1.0), 57, 2.2, .46, .6, vib=(4.2, .2, .8), release=1.2)                       # A3 吟
    guqin(tb(b0 + 1, 0.5), 62, 2.4, .42, .58, bend=[(0, -2), (.3, -2), (.65, 0)], release=1.2)  # C4→D4 上滑
    guqin(tb(b0 + 2, 0.0), 60, 1.8, .36, .52, release=1.0)
    guqin(tb(b0 + 2, 2.0), 55, 2.4, .36, .55, bend=[(0, 0), (.9, 0), (1.4, 2)], release=1.2)   # G3→A3
    guqin(tb(b0 + 3, 0.5), 69, None, .3, .4, harmonic=True, pan=.2, t60=5.0)
    guqin(seal, 50, 3.5, .5, .7, release=2.5, t60=5.0)                                          # 印：低 D
    guqin(seal + .008, 38, 3.0, .32, .35, release=2.0, t60=4.0)
    perc(seal, 'gong2', 'small', .45, .38, -.2, stem='gong', short=(1.0, 2.2))
    guqin(seal + 2.6, 69, None, .28, .34, harmonic=True, pan=.2, t60=3.6)
    guqin(seal + 4.4, 74, None, .24, .3, harmonic=True, pan=.25, t60=2.8)


# ════════════════════════ 渲染 ════════════════════════
intro()
verse('v1')
chorus('c1')
interlude()
verse('v2')
chorus('c2')
chorus2_ending()
chorus('c3')
outro()
log('notes placed; lead notes logged:', len([e for e in LEAD_LOG if e['c']]))


def premask(buf):
    g = mask_curve(); buf *= g[:, None]


log('pre-mask + reverb')
ROOMS = {'lead': (.55, .2), 'xiao': (.62, .3), 'pluck': (.58, .24), 'strings': (.7, .3), 'perc': (.5, .16), 'gong': (.72, .22)}
for k in STEMS:
    premask(STEMS[k])
    STEMS[k] = S.room(STEMS[k], *ROOMS[k])
    log('  room', k)

# 每条总线轻高通，去掉 30 Hz 以下的隆隆
for k in STEMS:
    STEMS[k] = sosfilt(_sos('high', 30 if k in ('perc', 'gong') else 45, 2), STEMS[k], axis=0).astype(np.float32)

if os.environ.get('SCORE_DUMP'):   # 调试：把各总线（混响后、母带前）存成 .npy 供分析
    for k in STEMS: np.save(os.path.join(os.environ['SCORE_DUMP'], f'stem_{k}.npy'), STEMS[k])
mix = sum(STEMS[k].astype(np.float64) for k in STEMS)


# ════════════════════════ 计量工具 ════════════════════════
def k_weight(x):
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, .73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1, -1.99004745483398, .99007225036621]
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=0), axis=0)


def lufs(x, kw=None):
    """ITU-R BS.1770-4 积分响度（400 ms 块，75% 重叠，−70 绝对门限 + −10 相对门限）"""
    y = k_weight(x) if kw is None else kw
    p = np.sum(y ** 2, axis=1)
    cs = np.concatenate([[0], np.cumsum(p)])
    blk, hop = int(.4 * SR), int(.1 * SR)
    if len(p) < blk: return -np.inf
    st = np.arange(0, len(p) - blk + 1, hop)
    z = (cs[st + blk] - cs[st]) / blk
    l = -.691 + 10 * np.log10(z + 1e-20)
    g = z[l > -70]
    if not len(g): return -np.inf
    rel = -.691 + 10 * np.log10(np.mean(g)) - 10
    g2 = z[(l > -70) & (l > rel)]
    return -.691 + 10 * np.log10(np.mean(g2))


def band_ratio(x):
    f, pxx = welch(x.mean(axis=1), SR, nperseg=16384)
    lo = pxx[(f >= 20) & (f < 120)].sum(); hi = pxx[(f >= 120) & (f < 8000)].sum()
    return 10 * np.log10(lo / hi)


def lowshelf(x, f0, gain_db, q=.707):
    A = 10 ** (gain_db / 40); w0 = 2 * np.pi * f0 / SR; al = np.sin(w0) / (2 * q); cw = np.cos(w0)
    b = [A * ((A + 1) - (A - 1) * cw + 2 * np.sqrt(A) * al), 2 * A * ((A - 1) - (A + 1) * cw),
         A * ((A + 1) - (A - 1) * cw - 2 * np.sqrt(A) * al)]
    a = [(A + 1) + (A - 1) * cw + 2 * np.sqrt(A) * al, -2 * ((A - 1) + (A + 1) * cw),
         (A + 1) + (A - 1) * cw - 2 * np.sqrt(A) * al]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


# ════════════════════════ 母带 ════════════════════════
log('master')
br = band_ratio(mix); log(f'  low band (20–120 Hz) vs 120 Hz–8 kHz before EQ: {br:+.1f} dB')
SHELF = 0.0
if br > -3.0:   # 低频超标：120 Hz 低架削到约 −3.5 dB
    SHELF = -min(9.0, (br + 3.5) * 1.15)
    mix = lowshelf(mix, 120, SHELF)
    log(f'  low shelf {SHELF:+.1f} dB → {band_ratio(mix):+.1f} dB')
TARGET_LUFS, CEIL_DB = -20.0, -3.2
ceil = 10 ** (CEIL_DB / 20)
from scipy.ndimage import maximum_filter1d, uniform_filter1d


def limiter_gain(x, ceil, look=.005):
    """立体声联动前瞻限幅的增益曲线（只压峰值）"""
    n = int(look * SR); a = np.abs(x).max(axis=1)
    m = maximum_filter1d(a, size=2 * n + 1)
    g = np.minimum(1, ceil / np.maximum(m, 1e-12))
    return np.minimum(g, uniform_filter1d(g, size=n))


gain_total, gg_total = 1.0, np.ones(N)
for it in range(4):
    L = lufs(mix); g = 10 ** ((TARGET_LUFS - L) / 20); mix *= g; gain_total *= g
    pk = np.abs(mix).max()
    log(f'  pass {it}: loudness {L:.2f} LUFS → gain {20 * np.log10(g):+.2f} dB, peak {20 * np.log10(pk):.2f} dBFS')
    if pk > ceil * .999:
        gg = limiter_gain(mix, ceil * .995); mix *= gg[:, None]; gg_total *= gg
        log(f'          limiter: max reduction {20 * np.log10(gg.min()):.2f} dB, '
            f'{np.mean(gg < .999) * 100:.2f}% of samples touched')
    if abs(L - TARGET_LUFS) < .05 and np.abs(mix).max() <= ceil: break
# 结尾：最后几声自然衰减，再在 261.6→dur 做极缓的收尾，确保 263.0 前近乎无声、末尾不硬切
tt = np.arange(N) / SR
tail = np.clip((DUR - tt) / (DUR - 261.6), 0, 1)
tail = np.where(tt > 261.6, np.sin(tail * np.pi / 2) ** 2, 1.0)
G = mask_curve()
chain = gg_total * tail * G
mix = np.clip(mix * (tail * G)[:, None], -ceil, ceil).astype(np.float32)

# 主旋律单轨：与混音完全相同的增益链（低架 / 总增益 / 限幅曲线 / 收尾 / 静默遮罩）
lead = STEMS['lead'].astype(np.float64)
if SHELF: lead = lowshelf(lead, 120, SHELF)
lead = np.clip(lead * (gain_total * chain)[:, None], -ceil, ceil).astype(np.float32)
log('write files')


def write(path, x):
    assert x.shape == (N, 2), x.shape
    sf.write(path, x, SR, subtype='PCM_24')


write(os.path.join(OUT, 'score.wav'), mix)
write(os.path.join(OUT, 'score_lead.wav'), lead)

USED = ['erhu', 'dan_tranh', 'cellos', 'violas', 'violins', 'contrabass', 'timpani', 'gran_cassa', 'bass_drum',
        'frame_drum', 'gong', 'gong2']
with open(os.path.join(HERE, 'CREDITS_music.txt'), 'w', encoding='utf-8') as f:
    f.write('Music: original score for 《宿敌》 ink-wash MV (music/score.py).\n')
    for line in S.credits(USED): f.write(line + '\n')
    f.write('Guqin and pipa: physical models (core/audio/pluck.py); xiao: synthesized in score.py. No third-party audio.\n')
log('CREDITS:', S.credits(USED))


# ════════════════════════ 自检 ════════════════════════
log('checks (reading files back)')
X, sr = sf.read(os.path.join(OUT, 'score.wav'), dtype='float64')
LD, _ = sf.read(os.path.join(OUT, 'score_lead.wav'), dtype='float64')
ok = True
d = len(X) / sr
print(f'\n1) duration: {d:.4f} s (target {DUR}) → {"OK" if abs(d - DUR) <= .01 and sr == SR else "FAIL"}; sr={sr}, ch={X.shape[1]}')
ok &= abs(d - DUR) <= .01
for a, b in SILENCE:
    seg = X[int(round(a * SR)):int(round(b * SR))]
    segl = LD[int(round(a * SR)):int(round(b * SR))]
    z = (np.count_nonzero(seg) == 0) and (np.count_nonzero(segl) == 0)
    print(f'2) silence {a:.3f}–{b:.3f} s: {len(seg)} samples, nonzero={np.count_nonzero(seg)} (lead {np.count_nonzero(segl)}) → {"OK (exact zeros)" if z else "FAIL"}')
    ok &= z
pre_ = X[:int(round(EV['titleA'] * SR))]
print(f'   0–{EV["titleA"]} s no music: nonzero={np.count_nonzero(pre_)}')

# 3) 主旋律起音
ly = [(L['t0'], c['c'], c['t0']) for L in LINES for c in L['chars']]
logd = [e for e in LEAD_LOG if e['c']]
assert len(logd) == len(ly), (len(logd), len(ly))
logd.sort(key=lambda e: e['t0'])
err_s = np.array([abs(e['sched'] - c[2]) for e, c in zip(logd, ly)])
err_a = np.array([abs(e['sched'] + e['on'] - c[2]) for e, c in zip(logd, ly)])
print(f'3) lead notes: {len(logd)} (= {len(ly)} lyric chars). scheduled onset error max {err_s.max() * 1000:.3f} ms; '
      f'audible onset (note buffer >10% peak) error max {err_a.max() * 1000:.2f} ms, median {np.median(err_a) * 1000:.2f} ms '
      f'→ {"OK" if err_a.max() < .010 else "FAIL"}')
ok &= err_a.max() < .010
# 独立的音频检测：读回 score_lead.wav，在每个字的起始音高（含倚音/上滑的起点）的谐波梳上做复解调
# （20 ms 汉宁窗），能量从前一音的底噪升到本音平台的 15% 处即为起音；同音反复的字（迢迢/飘飘）没有音高变化，单独列出
mono = LD.mean(axis=1)


def comb_energy(x, s0, s1, f0, fprev=None, win=.02):
    seg = x[s0:s1]; n = len(seg); t = np.arange(n) / SR
    w = np.hanning(int(win * SR)); w /= w.sum(); E = np.zeros(n); used = 0
    for h in range(1, 12):
        f = f0 * h
        if f > 7000 or used == 5: break
        if fprev and min(abs(f - fprev * k) for k in range(1, 30)) < 90: continue   # 避开前一音的谐波
        E += np.abs(np.convolve(seg * np.exp(-2j * np.pi * f * t), w, 'same')) ** 2; used += 1
    return E, used


det, skipped, det_who = [], [], []
for i, (e, c) in enumerate(zip(logd, ly)):
    if i and abs(logd[i - 1]['m'] - e['m']) < .01 and logd[i - 1]['t0'] + 1.0 > e['t0']:
        skipped.append(e['c']); continue
    fp = S.hz(logd[i - 1]['m']) if i and logd[i - 1]['t0'] + 3 > e['t0'] else None
    s0 = int(round((c[2] - .08) * SR)); E, used = comb_energy(mono, s0, s0 + int(.2 * SR), S.hz(e['p0']), fp)
    if not used: det.append(np.nan); det_who.append(e['c']); continue
    tt = c[2] - .08 + np.arange(len(E)) / SR
    base = np.median(E[(tt >= c[2] - .06) & (tt < c[2] - .025)])
    lo_, hi_ = (.012, .035) if e['orn'] else (.03, .07)
    plat = np.median(E[(tt >= c[2] + lo_) & (tt < c[2] + hi_)])
    thr = base + .15 * (plat - base)
    reg = np.where((tt >= c[2] - .04) & (tt <= c[2] + lo_))[0]
    up = [k for k in reg if E[k - 1] < thr <= E[k]]
    det.append(tt[up[-1]] - c[2] if up and plat > 2 * base else np.nan)
    det_who.append(f'{e["c"]} t0={c[2]:.2f} {S.name(e["m"])}{" (ornament)" if e["orn"] else ""}')
det = np.array(det); good = ~np.isnan(det)
print(f'   audio-domain check (score_lead.wav, harmonic-comb energy onset of each syllable\'s pitch): '
      f'{good.sum()} notes measured, {len(skipped)} repeated-pitch notes skipped ({"".join(skipped)}), '
      f'{(~good).sum()} unresolved; |error| median {np.nanmedian(np.abs(det)) * 1000:.1f} ms, '
      f'max {np.nanmax(np.abs(det)) * 1000:.1f} ms → {"OK" if np.nanmax(np.abs(det)) < .010 else "FAIL"}')
ok &= bool(np.nanmax(np.abs(det)) < .010)
print(f'      |error| distribution: <5 ms {np.mean(np.abs(det[good]) < .005) * 100:.0f}%, <10 ms {np.mean(np.abs(det[good]) < .01) * 100:.1f}%, '
      f'p95 {np.percentile(np.abs(det[good]), 95) * 1000:.1f} ms')
for i in np.argsort(-np.nan_to_num(np.abs(det), nan=-1.0))[:3]:
    print(f'      largest: {det_who[i]} {det[i] * 1000:+.1f} ms')
# 每个字的音高（自相关，跳过倚音段）
def f0_est(x, fmin, fmax):
    x = x - x.mean(); n = len(x)
    ac = np.fft.irfft(np.abs(np.fft.rfft(x, 2 * n)) ** 2)[:n]
    lo, hi = int(SR / fmax), int(SR / fmin)
    k = lo + np.argmax(ac[lo:hi])
    if 1 <= k < n - 1:
        a, b, cc = ac[k - 1], ac[k], ac[k + 1]; k = k + .5 * (a - cc) / (a - 2 * b + cc + 1e-12)
    return SR / k
cents = []
for e in logd:
    a = e['t0'] + .09; b = e['t0'] + max(.17, min(.3, e['nxt'] - .02))
    seg = mono[int(a * SR):int(b * SR)]
    f0 = S.hz(e['m'])
    est = f0_est(seg, f0 / 1.5, f0 * 1.5)
    cents.append(1200 * np.log2(est / f0))
cents = np.array(cents)
for i in np.argsort(-np.abs(cents))[:6]:
    print(f'      worst: {logd[i]["c"]} t0={logd[i]["t0"]:.2f} {S.name(logd[i]["m"])} {cents[i]:+.0f} cents ({logd[i]["tag"]})')
print(f'   pitch check (autocorr from 90 ms into each note to its end, ≤300 ms): median |dev| {np.median(np.abs(cents)):.0f} cents, '
      f'p95 {np.percentile(np.abs(cents), 95):.0f} cents, max {np.abs(cents).max():.0f} cents; '
      f'range {S.name(min(e["m"] for e in logd))}–{S.name(max(e["m"] for e in logd))}')

# 4) 峰值与响度
pk = 20 * np.log10(np.abs(X).max())
Lint = lufs(X)
print(f'4) peak {pk:.2f} dBFS (≤ −3) → {"OK" if pk <= -3 else "FAIL"}; integrated loudness ≈ {Lint:.2f} LUFS (target −20)')
ok &= pk <= -3
print('\n   section     start     end    RMS dBFS   peak dBFS   LUFS(int)   low/rest dB')
for k in SEC_ORDER:
    a, b = SEC[k]; seg = X[int(a * SR):int(b * SR)]
    rms = np.sqrt(np.mean(seg ** 2)); p_ = np.abs(seg).max()
    lr = band_ratio(seg) if rms > 1e-6 else float('nan')
    print(f'   {k:8s} {a:8.2f} {b:8.2f}   {20 * np.log10(rms + 1e-12):8.1f}   {20 * np.log10(p_ + 1e-12):8.1f}'
          f'   {lufs(seg):9.1f}   {lr:9.1f}')
# 5) 低频
r = band_ratio(X)
print(f'\n5) band energy 20–120 Hz vs 120 Hz–8 kHz: {r:+.1f} dB (guide: about −3 dB or lower)')
lead_l = lufs(LD)
print(f'   lead stem loudness {lead_l:.1f} LUFS, peak {20 * np.log10(np.abs(LD).max()):.1f} dBFS')
print(f'   last 0.34 s (263.0→end) peak: {20 * np.log10(np.abs(X[int(263.0 * SR):]).max() + 1e-12):.1f} dBFS; '
      f'262–263 s RMS {20 * np.log10(np.sqrt(np.mean(X[int(262 * SR):int(263 * SR)] ** 2)) + 1e-12):.1f} dBFS')
print('\nALL CHECKS', 'PASSED' if ok else 'FAILED')
log('done')
