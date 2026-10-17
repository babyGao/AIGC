#!/bin/sh
# 逐镜渲染：sh paint/render.sh s02 s03 ...  → paint/out/<镜头>.mp4（默认 60 帧/秒，FPS=30 可改；每镜一个浏览器顺序画，笔触状态逐帧延续）
LIB=${LIB:-/c/Users/高泽林/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$HERE/out"
cd "$LIB"
for s in "$@"; do
  node core/render/video.mjs "$HERE" --fps ${FPS:-60} --workers 1 --size 1080x1920 --q "shot=$s" --out "$HERE/out/$s.mp4" 2>&1 | tail -1
done
