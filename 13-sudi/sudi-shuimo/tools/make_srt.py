"""歌词 → .srt（每句一条；出现略早于开唱，句末多留一点，不与下一句重叠）"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
L = json.load(open(os.path.join(HERE, '..', 'data', 'lyrics.json'), encoding='utf-8'))
def ts(t): t = max(0, t); h, r = divmod(t, 3600); m, s = divmod(r, 60); return f'{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)) % 1000:03d}'
out = []
for i, l in enumerate(L):
    a = l['t0'] - .3; b = l['t1'] + .5
    if i + 1 < len(L): b = min(b, L[i + 1]['t0'] - .32)
    out.append(f"{i + 1}\n{ts(a)} --> {ts(b)}\n{l['text']}\n")
p = os.path.join(HERE, '..', 'sudi.srt'); open(p, 'w', encoding='utf-8').write('\n'.join(out)); print(len(out), 'cues →', os.path.normpath(p))
