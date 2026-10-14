#!/bin/sh
# 一键重做《一枚丹的炼成 · 水墨版》：配音 → 校对 → 声音事件 → 配乐与混音 → 逐帧渲染 → 合成 → 字幕与海报
set -e
LIB=${LIB:-"$HOME/lemo-opuscar"}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY="$LIB/.venv/bin/python"
cd "$LIB"
"$PY" core/tts/tts_zh.py "$HERE/lines.json" "$HERE/voices" --voice zh-CN-YunyangNeural --rate=-4%
"$PY" core/tts/asr_check.py "$HERE/lines.json" "$HERE/voices" --lang zh --model small || echo "识别校对有同音误判（丸/晚、枢/书等），以试听为准"
node core/render/events.mjs "$HERE"
"$PY" "$HERE/audio.py"
node core/render/video.mjs "$HERE" --fps 24 --workers 5 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/liandan-shuimo.mp4" 24 0
"$PY" "$HERE/tools/cues.py" && "$PY" core/render/srt.py "$HERE/out/cues.json" "$HERE/liandan-shuimo.srt"
node core/render/still.mjs "$HERE" 46 --q nosub=1 --out "$HERE/out" --prefix poster_ && cp "$HERE/out/poster_46.jpg" "$HERE/poster.jpg"
echo done
