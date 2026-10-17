# 拼接 out/segs/*.mp4 → out/坚持.mp4（带用户原音轨，供对时间）与 out/坚持_无声.mp4（配音另配）
set -e
cd "$(dirname "$0")/.."
ls out/segs/*.mp4 | sort | sed "s|^|file '$PWD/|; s|$|'|" > out/segs.txt
ffmpeg -v error -y -f concat -safe 0 -i out/segs.txt -c copy out/_video.mp4
ffmpeg -v error -y -i out/_video.mp4 -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -r 30 -movflags +faststart -an out/坚持_无声.mp4
ffmpeg -v error -y -i out/坚持_无声.mp4 -i assets/audio/narration.m4s -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/坚持.mp4
rm out/_video.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact out/坚持.mp4
