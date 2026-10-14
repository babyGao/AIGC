#!/bin/sh
# 一键从源码重建《天龙八部之宿敌》水墨 MV（无音轨成片，按原曲逐字时间轴对齐）：sh build.sh
# 需要 Lemo-Opuscar 库（git clone https://github.com/lemomo-ai/lemo-opuscar ~/lemo-opuscar，按其 README 装好依赖，
# 再 sh tools/fetch.sh instruments karoryfer && … vcsl && … vsco2ce）。没有 GPU 时可设 PLAYWRIGHT_CHROME 指向 headless_shell。
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the lemo-opuscar library folder"; exit 1; }
PY="$LIB/.venv/bin/python"
cd "$LIB"
echo "1/6 歌词时间轴 → data/lyrics.json"; python3 "$HERE/tools/krc2json.py" > /dev/null
echo "2/6 事件表 → events.json（with_song.sh 混音时用）"; node core/render/events.mjs "$HERE"
echo "3/6 逐帧渲染画面（不含歌词）6320 帧 → out/video.mp4"; node core/render/video.mjs "$HERE" --fps 24 --workers 3 --q nosub=1 --out "$HERE/out/video.mp4"
echo "4/6 卡拉 OK 歌词层（透明）→ out/lyrics.mov"; node "$HERE/tools/render_lyrics.mjs" "$HERE" --workers 3
echo "5/6 叠歌词层 → out/video_lyr.mp4"
ffmpeg -y -v error -i "$HERE/out/video.mp4" -i "$HERE/out/lyrics.mov" -filter_complex "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p" -c:v libx264 -preset medium -crf 14 "$HERE/out/video_lyr.mp4"
echo "6/6 交付编码（无音轨；第 0 帧 = 原曲 0:00）→ sudi.mp4、sudi.srt、poster.jpg"
ffmpeg -y -v error -i "$HERE/out/video_lyr.mp4" -an -c:v libx264 -preset slow -crf 23 -tune animation -pix_fmt yuv420p -movflags +faststart "$HERE/sudi.mp4"
python3 "$HERE/tools/make_srt.py"
node core/render/still.mjs "$HERE" 8.6 --q nosub=1 --out "$HERE/out" --prefix poster_ && cp "$HERE/out/poster_8.6.jpg" "$HERE/poster.jpg"
echo "done → $HERE/sudi.mp4"
