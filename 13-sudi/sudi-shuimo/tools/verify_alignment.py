"""用你自己的原曲音频核对时间轴（不改任何文件，只打印报告）。
需要：pip install librosa faster-whisper（Whisper small 模型首次运行会自动下载）
用法：python verify_alignment.py /path/to/天龙八部之宿敌.mp3
1) 节拍：librosa 节拍跟踪 → 与 data/timeline.json 的小节网格比较
2) 歌词：Whisper 识别原曲人声（逐字时间）→ 与 data/lyrics.json 的逐字时间逐句比较"""
import json, os, sys, difflib, numpy as np, librosa
HERE = os.path.dirname(os.path.abspath(__file__))
L = json.load(open(os.path.join(HERE, '..', 'data', 'lyrics.json'), encoding='utf-8'))
TL = json.load(open(os.path.join(HERE, '..', 'data', 'timeline.json'), encoding='utf-8'))
y, sr = librosa.load(sys.argv[1], sr=22050, mono=True)
print(f'时长 {len(y) / sr:.2f} s（时间轴按 {TL["dur"]} s 版本制作）')
_, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=256, start_bpm=97, tightness=200)
bt = librosa.frames_to_time(beats, sr=sr, hop_length=256)
ibi = np.diff(bt); idx = np.concatenate([[0], np.cumsum(np.round(ibi / np.median(ibi)))])
per, ph = np.polyfit(idx, bt, 1)
print(f'原曲速度 {60 / per:.2f} BPM；时间轴网格 {240 / TL["BAR"]:.2f} BPM')
for n in [9, 25, 41, 44, 50, 66, 83, 99]:
    g = TL['T0'] + n * TL['BAR']; j = np.argmin(abs(bt - g)); print(f'  第 {n:3d} 小节  网格 {g:7.2f} s  原曲节拍 {bt[j]:7.2f} s  差 {bt[j] - g:+.3f} s')
from faster_whisper import WhisperModel
a16 = librosa.resample(y, orig_sr=sr, target_sr=16000)
m = WhisperModel(os.environ.get('WHISPER_MODEL', 'small'), device='cpu', compute_type='int8')
segs, _ = m.transcribe(a16, language='zh', word_timestamps=True, condition_on_previous_text=False, initial_prompt='许嵩 天龙八部之宿敌')
W = []
for s in segs:
    for w in s.words or []:
        tx = w.word.strip()
        for k, c in enumerate(tx): W.append((c, w.start + (w.end - w.start) * k / max(1, len(tx))))
D = []
for l in L:
    ws = [w for w in W if l['t0'] - 2.5 <= w[1] <= l['t1'] + 1.5]
    sm = difflib.SequenceMatcher(None, l['text'], ''.join(w[0] for w in ws), autojunk=False)
    ds = [ws[b.b + k][1] - l['chars'][b.a + k]['t0'] for b in sm.get_matching_blocks() for k in range(b.size)]
    D += ds
    print(f"  {l['t0']:7.2f}  {l['text']:<8} 识别对上 {len(ds)} 字  差 {np.median(ds) if ds else float('nan'):+.2f} s")
D = np.array(D)
print(f'Whisper − 时间轴：{len(D)} 个字，中位数 {np.median(D):+.3f} s，四分位 [{np.percentile(D, 25):+.3f}, {np.percentile(D, 75):+.3f}] s')
