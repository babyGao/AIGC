# 给 Lemo-Opuscar 全部范例源码建索引：每个文件的行数、开头注释、导出函数 → research/lemo/code_index.txt
import os, re, glob, sys
sys.stdout.reconfigure(encoding='utf-8')
LIB = sys.argv[1]; OUT = sys.argv[2]
lines = []
for st in sorted(os.listdir(os.path.join(LIB, 'styles'))):
    d = os.path.join(LIB, 'styles', st, 'demo')
    if not os.path.isdir(d): continue
    lines.append(f'\n######## {st}')
    for p in sorted(glob.glob(os.path.join(d, '**', '*'), recursive=True)):
        q = p.replace(os.sep, '/')
        if not re.search(r'\.(js|mjs|py|html|glsl|frag|vert)$', q) or 'node_modules' in q or '/fonts/' in q: continue
        src = open(p, encoding='utf-8', errors='ignore').read()
        head = []
        for l in src.splitlines()[:6]:
            l = l.strip()
            if l.startswith(('//', '#', '/*', '*', '<!--')) and len(l) > 3 and not l.startswith('#!'):
                head.append(l.lstrip('/#*<!- ').strip())
        fns = re.findall(r'export (?:async )?(?:function|class|const|let) (\w+)', src)
        if not fns:
            fns = [a or b or c for a, b, c in re.findall(r'^(?:async )?function (\w+)|^def (\w+)|^class (\w+)', src, re.M)]
        rel = os.path.relpath(p, d).replace(os.sep, '/')
        lines.append(f'  {rel} ({src.count(chr(10))}) | {" / ".join(head)[:230]} | {", ".join(fns[:14])}')
open(OUT, 'w', encoding='utf-8').write('\n'.join(lines))
print(len(lines), 'lines')
