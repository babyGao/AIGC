# 指定时间点出样张（4 进程），拼成 out/<名>_N.jpg：sh tools/stills.sh 名 t1 t2 ...
cd "$(dirname "$0")/.."
name=$1; shift
rm -f out/stills/*.jpg
echo "$@" | tr ' ' '\n' | xargs -P 4 -n 4 sh -c 'python3 film/render.py --still $(echo "$@" | tr " " ",") > /dev/null 2>&1' _
ls out/stills/*.jpg | split -l 12 - out/.l_
i=0; for l in out/.l_*; do python3 tools/sheet.py out/${name}_$i.jpg $(cat $l); i=$((i+1)); done; rm out/.l_*
