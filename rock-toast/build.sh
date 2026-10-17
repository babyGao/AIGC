#!/bin/sh
# 一键出片（油画厚涂版）：关键帧标注 → 逐镜预处理 → 逐镜绘制 → 配乐 → 混音 → 合成（−14 LUFS）→ 字幕、封面
# 旁白已在 audio/v2/voices/（重做：$LIB/.venv python core/tts/tts_zh.py audio/v2/lines.json audio/v2/voices，需联网；再跑 asr_check.py 复核）
# 渲染很吃内存：默认两镜并行（PAR=1 改成逐镜）；默认 60 帧/秒（FPS=30 可改，同时改 paint/film.json 的 fps）
set -e
LIB=${LIB:-/c/Users/高泽林/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
PY="$LIB/.venv/Scripts/python.exe"; [ -x "$PY" ] || PY="$LIB/.venv/bin/python"
"$PY" -I "$HERE/paint/masks.py"
"$PY" -I "$HERE/paint/prep_shot.py"
SHOTS="s01 s02 s03 s04 s05 s06 s07 s08 s09 s10 s11 s12 s13 s14"
if [ "${PAR:-2}" = 1 ]; then sh "$HERE/paint/render.sh" $SHOTS
else
  sh "$HERE/paint/render.sh" s01 s03 s05 s07 s09 s11 s13 &
  sh "$HERE/paint/render.sh" s02 s04 s06 s08 s10 s12 s14
  wait
fi
"$PY" "$HERE/audio/v2/score.py"
"$PY" "$HERE/audio/v2/mix.py"
"$PY" "$HERE/paint/assemble.py"
ls -la "$HERE/rock-toast.mp4" "$HERE/rock-toast.srt" "$HERE/poster.jpg"
