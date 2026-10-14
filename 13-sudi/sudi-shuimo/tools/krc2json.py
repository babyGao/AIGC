"""把逐字时间轴（KRC 文本，已解码）转成 data/lyrics.json。
每行：{t0, t1, text, chars:[{c, t0, d}]}，时间单位秒。只保留正文歌词（跳过标题/作词作曲行）。"""
import json, re, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'data', 'timing.krc')
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', 'data', 'lyrics.json')
lines = []
for raw in open(src, encoding='utf-8-sig'):
    m = re.match(r'^\[(\d+),(\d+)\](.*)$', raw.strip())
    if not m: continue
    t0 = int(m.group(1)) / 1000
    if t0 < 10: continue                                   # 标题与作词作曲信息
    chars = [{'c': c, 't0': round(t0 + int(a) / 1000, 3), 'd': round(int(d) / 1000, 3)}
             for a, d, c in re.findall(r'<(\d+),(\d+),\d+>([^<]+)', m.group(3))]
    chars = [x for x in chars if x['c'].strip()]
    text = ''.join(x['c'] for x in chars)
    lines.append({'t0': chars[0]['t0'], 't1': round(chars[-1]['t0'] + chars[-1]['d'], 3), 'text': text, 'chars': chars})
json.dump(lines, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(lines), 'lines →', out)
for l in lines: print(f"{l['t0']:7.3f} {l['t1']:7.3f} {l['text']}")
