# 字幕时间表：与画面字幕同一规则（≥1.8 秒、≥语音+0.6 秒、遇下一句让位）→ out/cues.json
import os, re, json, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(HERE, 'src', 'story.js'), encoding='utf-8').read()
blk = src[src.index('export const VO'):src.index('];', src.index('export const VO'))]
vo = [dict(id=m[0], t=float(m[1]), text=m[3] or m[2]) for m in re.findall(r"\{ id: '(v\d+)', t: ([\d.]+), text: '([^']+)'(?:, sub: '([^']+)')?", blk)]
dur = json.load(open(os.path.join(HERE, 'audio', 'voices', 'dur.json'), encoding='utf-8'))
cues = []
for i, v in enumerate(vo):
    nx = vo[i + 1]['t'] - .08 if i + 1 < len(vo) else 1e9
    t1 = min(nx, v['t'] + max(1.8, dur[v['id']] + .6))
    cues.append(dict(t0=round(v['t'] - .05, 3), t1=round(t1, 3), text=re.sub('[。，]$', '', v['text'])))
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
json.dump(cues, open(os.path.join(HERE, 'out', 'cues.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(cues), 'cues')
