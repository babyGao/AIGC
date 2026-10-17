# 每个镜头取中点出一张样张 → out/stills/，再拼成 out/review_*.jpg
cd "$(dirname "$0")/.."
TS=$(python3 -c "
import sys; sys.path.insert(0,'film'); from shots import SHOTS
print(' '.join('%.2f'%((s['t0']+s['t1'])/2) for s in SHOTS))")
rm -f out/stills/*.jpg
echo $TS | tr ' ' '\n' | xargs -P 4 -n 6 sh -c 'python3 film/render.py --still $(echo "$@" | tr " " ",") > /dev/null' _
ls out/stills/*.jpg | split -l 12 - out/.lst_
i=0; for l in out/.lst_*; do python3 tools/sheet.py out/review_$i.jpg $(cat $l); i=$((i+1)); done; rm out/.lst_*
