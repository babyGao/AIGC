#!/bin/sh
# 用你自己的《天龙八部之宿敌》原曲音频替换原创配乐（画面不重渲，只重新混音、封装，几十秒）。
#   sh with_song.sh /path/to/天龙八部之宿敌.mp3 [偏移秒数]
# 卡拉 OK 字幕本来就是按原曲（263 秒版本）的逐字时间做的；如果你的音频前面多/少一段静音，用第二个参数微调（正数 = 原曲推后）。
# 环境声与拟音在原曲版里压到 35%（mix.py --fx 可调）。
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}
[ -n "$1" ] && [ -f "$1" ] || { echo "usage: sh with_song.sh <原曲音频> [偏移秒]"; exit 1; }
mkdir -p "$HERE/out"
VID="$HERE/out/video_lyr.mp4"
[ -f "$VID" ] || { VID="$HERE/out/_video_only.mp4"; ffmpeg -y -v error -i "$HERE/sudi.mp4" -an -c:v copy "$VID"; }
"$LIB/.venv/bin/python" "$HERE/mix.py" --song "$1" --offset "${2:-0}" --out "$HERE/out/mix_song.wav"
sh "$LIB/core/render/mux.sh" "$VID" "$HERE/out/mix_song.wav" "$HERE/sudi_原曲版.mp4" 24 0
echo "done → $HERE/sudi_原曲版.mp4"
