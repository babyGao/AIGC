#!/bin/sh
# 审片：每秒一帧的联系表 + 关键动作 0.2 秒帧条 + 响度 / 黑帧检查
# 用法：sh tools/review.sh <film.mp4> <outdir>
set -e
F="$1"; O="$2"; mkdir -p "$O"
ffmpeg -v error -y -i "$F" -vf "fps=1,scale=180:320,tile=8x3:padding=4:color=white" -q:v 3 "$O/sheet_%02d.jpg"
# 关键动作：起点秒 时长
for k in "egg 9.45 1.0" "plate 24.6 1.4" "flip 19.0 1.0" "fork 35.6 1.8" "berries 30.0 1.6"; do
  set -- $k
  ffmpeg -v error -y -ss "$2" -t "$3" -i "$F" -vf "fps=5,scale=216:384,tile=9x1:padding=4:color=white" -frames:v 1 -q:v 3 "$O/strip_$1.jpg"
done
ffmpeg -hide_banner -nostats -i "$F" -af ebur128 -f null - 2>&1 | grep -E "I:|LRA:|Peak" | tail -3
ffmpeg -hide_banner -nostats -i "$F" -vf "blackdetect=d=0.25:pix_th=0.04" -an -f null - 2>&1 | grep -o "black_start:[0-9.]* black_end:[0-9.]* black_duration:[0-9.]*" || echo "no black segments"
