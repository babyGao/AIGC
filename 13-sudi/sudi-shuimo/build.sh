#!/bin/sh
# 一键从源码重建《天龙八部之宿敌》水墨 MV：sh build.sh
# 需要 Lemo-Opuscar 库（git clone https://github.com/lemomo-ai/lemo-opuscar ~/lemo-opuscar，按其 README 装好依赖，
# 再 sh tools/fetch.sh instruments karoryfer && … vcsl && … vsco2ce）。没有 GPU 时可设 PLAYWRIGHT_CHROME 指向 headless_shell。
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the lemo-opuscar library folder"; exit 1; }
PY="$LIB/.venv/bin/python"
cd "$LIB"
echo "1/8 歌词时间轴 → data/lyrics.json"; python3 "$HERE/tools/krc2json.py" > /dev/null
echo "2/8 原创配乐 → music/out/score.wav"; "$PY" "$HERE/music/score.py"
echo "3/8 事件表 → events.json"; node core/render/events.mjs "$HERE"
echo "4/8 混音（配乐 + 环境声 + 拟音）→ out/mix.wav"; "$PY" "$HERE/mix.py"
echo "5/8 逐帧渲染画面（不含歌词）6320 帧 → out/video.mp4"; node core/render/video.mjs "$HERE" --fps 24 --workers 3 --q nosub=1 --out "$HERE/out/video.mp4"
echo "6/8 卡拉 OK 歌词层（透明）→ out/lyrics.mov"; node "$HERE/tools/render_lyrics.mjs" "$HERE" --workers 3
echo "7/8 叠歌词、合成 −14 LUFS（无颗粒：宣纸纹理在着色器里）"
ffmpeg -y -v error -i "$HERE/out/video.mp4" -i "$HERE/out/lyrics.mov" -filter_complex "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p" -c:v libx264 -preset medium -crf 14 "$HERE/out/video_lyr.mp4"
sh core/render/mux.sh "$HERE/out/video_lyr.mp4" "$HERE/out/mix.wav" "$HERE/out/master.mp4" 24 0
echo "8/8 交付编码 → sudi.mp4、sudi.srt、poster.jpg"
ffmpeg -y -v error -i "$HERE/out/master.mp4" -c:v libx264 -preset slow -crf 23 -tune animation -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$HERE/sudi.mp4"
python3 "$HERE/tools/make_srt.py"
node core/render/still.mjs "$HERE" 8.6 --q nosub=1 --out "$HERE/out" --prefix poster_ && cp "$HERE/out/poster_8.6.jpg" "$HERE/poster.jpg"
echo "done → $HERE/sudi.mp4"
