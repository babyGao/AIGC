#!/bin/sh
# 渲试验页静帧：tools/still.sh '<query>' <out_dir> <prefix> <t...>
# 例：tools/still.sh 'lab=im&test=fy' out/lab fy_ 0
HERE=$(cd "$(dirname "$0")/.." && pwd); LIB=${LIB:-"$HOME/lemo-opuscar"}
[ -n "$PLAYWRIGHT_CHROME" ] || { for c in /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell; do [ -x "$c" ] && export PLAYWRIGHT_CHROME="$c"; done; }
Q=$1; OUT=$(cd "$(dirname "$2")" && pwd)/$(basename "$2"); PRE=$3; shift 3
mkdir -p "$OUT"; cd "$LIB" && node core/render/still.mjs "$HERE/film" "$@" --q "$Q" --out "$OUT" --prefix "$PRE" 2>&1 | grep -v "GL Driver\|WebGL\|GPU stall"
