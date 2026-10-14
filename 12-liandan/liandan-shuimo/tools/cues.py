"""旁白字幕时间：读 story.js 的 VO 与 voices/dur.json → out/cues.json（与画面里烧进去的字幕同一套时间）"""
import json, os, re
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(HERE, 'story.js'), encoding='utf-8').read()
dur = json.load(open(os.path.join(HERE, 'voices', 'dur.json'), encoding='utf-8'))
vo = [(m.group(1), float(m.group(2)), m.group(3)) for m in re.finditer(r"\{ id: '(L\d+)', t: ([\d.]+), text: '([^']+)' \}", src)]
cues = []
for k, (i, t, text) in enumerate(vo):
    end = max(t + dur.get(i, 2) + .55, t + 1.8)
    if k + 1 < len(vo): end = min(end, vo[k + 1][1] - .2)          # 不压下一句
    cues.append({'t0': round(t - .08, 3), 't1': round(end, 3), 'text': text})
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
json.dump(cues, open(os.path.join(HERE, 'out', 'cues.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(cues), 'cues')
