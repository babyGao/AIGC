# 汇总各片 shots.json：镜头时长分布、运镜占比、明度/饱和/冷暖
# 用法: python -I summarize.py <shots.json> [<shots.json> ...]
import sys, json, os
sys.stdout.reconfigure(encoding='utf-8')
import numpy as np

def kind(s):
    z, tx, ty, j = s['zoom'], s['tx'], s['ty'], s['jitter']
    if z > 1.06: k = '推近'
    elif z < .94: k = '拉远'
    elif abs(tx) > .08 or abs(ty) > .08: k = '平移'
    else: k = '固定'
    return k + ('+手持' if j > .004 else '')

print(f"{'片名':<22}{'镜数':>4}{'均长':>6}{'中位':>6} | <0.7 0.7-1.2 1.2-2 2-3.5 >3.5 | 运镜占比(按时长)                    | 亮  反差 饱和 暖")
for p in sys.argv[1:]:
    d = json.load(open(p, encoding='utf-8')); S = d['shots']
    du = np.array([s['dur'] for s in S]); tot = du.sum()
    b = np.histogram(du, [0, .7, 1.2, 2, 3.5, 1e9])[0]
    ks = {}
    for s in S: ks[kind(s)] = ks.get(kind(s), 0) + s['dur']
    kstr = ' '.join(f"{k}{v/tot*100:.0f}%" for k, v in sorted(ks.items(), key=lambda x: -x[1]))
    w = lambda key: float(np.sum([s[key] * s['dur'] for s in S]) / tot)
    name = os.path.basename(os.path.dirname(os.path.dirname(p)))
    print(f"{name:<22}{len(S):>4}{du.mean():>6.2f}{np.median(du):>6.2f} | {b[0]:>4} {b[1]:>7} {b[2]:>5} {b[3]:>5} {b[4]:>4} | {kstr:<36}| {w('bright'):.2f} {w('contrast'):.2f} {w('sat'):.2f} {w('warm'):+.2f}")
