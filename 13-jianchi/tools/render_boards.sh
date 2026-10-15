#!/bin/sh
# 一键重出四块风格板：逐风格渲染 11 个关键帧 + 造型板 → 拼版 → 对比板
# 需要 lemo-opuscar 库（LIB，默认 ~/lemo-opuscar，已装 npm 依赖与 .venv）
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd)
LIB=${LIB:-"$HOME/lemo-opuscar"}
PY="$LIB/.venv/bin/python"
[ -n "$PLAYWRIGHT_CHROME" ] || { for c in /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell; do [ -x "$c" ] && export PLAYWRIGHT_CHROME="$c"; done; }
node "$HERE/tools/keys.mjs" >/dev/null
TIMES=$("$PY" -c "import json;print(' '.join(str(k['t']) for k in json.load(open('$HERE/data/keys.json'))))")
IDS=$("$PY" -c "import json;print(' '.join(k['id'] for k in json.load(open('$HERE/data/keys.json'))))")
for S in ${STYLES:-woodcut puppet ink spy}; do
  OUT="$HERE/out/frames/$S"; mkdir -p "$OUT" "$HERE/boards/frames/$S"
  (cd "$LIB" && node core/render/still.mjs "$HERE/film" $TIMES --q "style=$S" --out "$OUT" --prefix t_ >/dev/null 2>&1)
  (cd "$LIB" && node core/render/still.mjs "$HERE/film" 0 --q "style=$S&sheet=1" --out "$OUT" --prefix m_ >/dev/null 2>&1)
  set -- $IDS
  for T in $TIMES; do cp "$OUT/t_$T.jpg" "$OUT/$1.jpg"; shift; done
  cp "$OUT/m_0.jpg" "$OUT/M.jpg"
  for F in M $IDS; do "$PY" -c "from PIL import Image;Image.open('$OUT/$F.jpg').resize((1280,720),Image.LANCZOS).save('$HERE/boards/frames/$S/$F.jpg',quality=86)"; done
  "$PY" "$HERE/tools/board.py" "$S" "$OUT" "$HERE/boards/风格板_$S.jpg"
  echo "board $S"
done
"$PY" "$HERE/tools/board.py" compare "$HERE/boards/四风格对比.jpg" woodcut="$HERE/out/frames/woodcut" puppet="$HERE/out/frames/puppet" ink="$HERE/out/frames/ink" spy="$HERE/out/frames/spy"
echo done
