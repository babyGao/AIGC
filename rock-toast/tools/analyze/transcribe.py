# 旁白转写 + 节拍估计：python -I transcribe.py <video> <out.json> [--lang zh]
import sys, json, subprocess, argparse, tempfile, os
sys.stdout.reconfigure(encoding="utf-8")
import numpy as np, soundfile as sf
from scipy.signal import find_peaks

ap = argparse.ArgumentParser(); ap.add_argument('video'); ap.add_argument('out'); ap.add_argument('--lang', default='zh')
ap.add_argument('--model', default='small')
a = ap.parse_args()
wav = os.path.join(tempfile.gettempdir(), 'shotscan_audio.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.video, '-ac', '1', '-ar', '16000', wav], check=True)

from faster_whisper import WhisperModel
m = WhisperModel(a.model, device='cpu', compute_type='int8')
segs, info = m.transcribe(sf.read(wav, dtype="float32")[0], language=None if a.lang == 'auto' else a.lang, vad_filter=True, word_timestamps=False)
lines = [dict(t0=round(s.start, 2), t1=round(s.end, 2), text=s.text.strip()) for s in segs]

# 节拍：能量起音包络自相关
y, sr = sf.read(wav)
hop = 160
e = np.array([np.sum(y[i:i + 512] ** 2) for i in range(0, len(y) - 512, hop)])
on = np.maximum(0, np.diff(np.log1p(e * 1e3)))
on = on - np.convolve(on, np.ones(50) / 50, mode='same')
ac = np.correlate(on, on, mode='full')[len(on) - 1:]
fr = sr / hop
lo, hi = int(fr * 60 / 180), int(fr * 60 / 70)
lag = lo + int(np.argmax(ac[lo:hi]))
bpm = 60 * fr / lag
pk, _ = find_peaks(on, height=np.percentile(on, 97), distance=int(fr * 0.15))
json.dump(dict(lang=info.language, lines=lines, bpm=round(bpm, 1), onsets=[round(p / fr, 2) for p in pk]),
          open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'语言 {info.language}  估计 BPM {bpm:.1f}  强起音 {len(pk)} 个')
for l in lines: print(f"{l['t0']:6.2f}-{l['t1']:6.2f}  {l['text']}")
