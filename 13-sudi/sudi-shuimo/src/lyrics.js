// 卡拉 OK 歌词（细体）：KTV 双槽错落——上槽靠左、下槽右移，一句唱完它的槽就留给下下句。
// 每个字按逐字时间着墨：纸亮的镜头里 淡墨 → 焦墨；夜里的镜头 淡纸色 → 亮纸白。字头一枚小朱印。
// 画在 overlay 画布（屏幕空间，不跟世界相机），所以不进合成器的纸纹。
import { LYR } from './timeline.js';
import { clamp } from '/core/lib.js';

const SIZE = 60, GAP = 10, LEAD = .04;           // 字号、字距、着墨提前量（秒）
const VERM = 'rgb(176,46,34)';

// 每句歌词的出现 / 消失时间：同槽的上一句（i-2）唱完 0.45 s 后，最早提前 1.2 s 出现
const N = LYR.length, END = LYR.map(l => l.t1);
const sectionBreak = i => i > 0 && LYR[i].t0 - END[i - 1] > 6;
const APP = [], DIS = [];
for (let i = 0; i < N; i++) {
  const prevSame = i >= 2 && !sectionBreak(i) && !sectionBreak(i - 1) ? i - 2 : -1;
  APP[i] = prevSame >= 0 ? Math.max(LYR[i].t0 - 1.2, END[prevSame] + .45) : LYR[i].t0 - (i % 2 ? 1.2 : 2.75);
}
for (let i = 0; i < N; i++) {
  const nxt = i + 2 < N && !sectionBreak(i + 1) && !sectionBreak(i + 2) ? i + 2 : -1;
  const pairEnd = i % 2 === 0 && i + 1 < N && !sectionBreak(i + 1) ? END[i + 1] : END[i];
  DIS[i] = nxt >= 0 ? APP[nxt] : Math.max(END[i] + 1.2, pairEnd + 1.0);
}
// 下槽在一个新段落开头时，跟上槽同时出现
for (let i = 1; i < N; i++) if (i % 2 === 1 && (i < 3 || sectionBreak(i - 1))) APP[i] = APP[i - 1];
export const lineWindows = () => LYR.map((l, i) => ({ i, text: l.text, t0: APP[i], t1: DIS[i] }));

// 位置表：{t, x, y, tone, dx}，一句用它出现时刻生效的那一条（出现后不再移动）
let POS = [{ t: 0, x: 160, y: 900, tone: 'ink', dx: 150 }];
export function setLayout(list) { POS = list.slice().sort((a, b) => a.t - b.t); }
const posAt = t => { let p = POS[0]; for (const q of POS) if (q.t <= t + 1e-6) p = q; return p; };

function drawLine(c, l, x, y, t, a, tone) {
  const chars = l.chars, step = SIZE + GAP;
  const ink = tone === 'ink';
  const base = ink ? 'rgba(70,62,54,.46)' : 'rgba(236,230,216,.55)', sung = ink ? 'rgba(14,12,10,.97)' : 'rgba(255,252,244,1)';
  const halo = ink ? 'rgba(246,241,230,1)' : 'rgba(10,8,6,.9)';
  c.save(); c.globalAlpha = a;
  c.font = `300 ${SIZE}px SongLight`; c.textBaseline = 'alphabetic';
  // 衬底：同色系的柔光，保证在墨色或纸色上都读得清
  c.shadowColor = halo; c.shadowBlur = ink ? 12 : 16;
  c.fillStyle = base;
  chars.forEach((ch, k) => c.fillText(ch.c, x + k * step, y));
  c.shadowBlur = ink ? 5 : 7;
  chars.forEach((ch, k) => c.fillText(ch.c, x + k * step, y));
  c.shadowBlur = 0;
  chars.forEach((ch, k) => c.fillText(ch.c, x + k * step, y));
  // 着墨
  chars.forEach((ch, k) => {
    const p = clamp((t - ch.t0 + LEAD) / Math.max(.08, ch.d * .92)); if (p <= 0) return;
    const x0 = x + k * step - 2, w = (SIZE + 4) * p;
    c.save(); c.beginPath(); c.rect(x0, y - SIZE * 1.05, w, SIZE * 1.4); c.clip();
    c.shadowColor = ink ? 'rgba(246,241,230,.9)' : 'rgba(10,8,6,.8)'; c.shadowBlur = 8;
    c.fillStyle = sung; c.fillText(ch.c, x + k * step, y);
    c.restore();
  });
  // 字头小朱印
  c.fillStyle = VERM; c.globalAlpha = a * .9; c.fillRect(x - 24, y - SIZE * .5 - 5, 10, 10);
  c.restore();
}

// 倒计时点：前奏 / 间奏 / 停顿之后的第一句，开唱前四拍亮四个小墨点，每拍灭一个
const BEAT = 2.476888 / 4;
function countdown(c, i, x, y, t, tone) {
  const t0 = LYR[i].t0, k = Math.ceil((t0 - t) / BEAT); if (k <= 0 || k > 4 || t < APP[i]) return;
  c.save(); c.fillStyle = tone === 'ink' ? 'rgba(20,16,12,.85)' : 'rgba(250,246,236,.95)'; c.shadowColor = tone === 'ink' ? 'rgba(246,241,230,1)' : 'rgba(10,8,6,.9)'; c.shadowBlur = 8;
  for (let j = 0; j < k; j++) { c.beginPath(); c.arc(x + j * 22, y - SIZE * 1.15, 5.5, 0, Math.PI * 2); c.fill(); }
  c.restore();
}
export function drawLyrics(c, t, opts = {}) {
  for (let i = 0; i < N; i++) {
    if (t < APP[i] - .01 || t > DIS[i] + .4) continue;
    const fin = clamp((t - APP[i]) / .32), fout = 1 - clamp((t - DIS[i]) / .35);
    const a = Math.min(fin, fout); if (a <= 0) continue;
    const P = posAt(APP[i]);
    const slot = i % 2, x = P.x + (slot ? P.dx : 0), y = P.y + (slot ? SIZE * 1.55 : 0);
    const tone = opts.tone || P.tone;
    if (fin < 1) c.filter = `blur(${((1 - fin) * 3).toFixed(2)}px)`;
    drawLine(c, LYR[i], x, y + (1 - fin) * 6, t, a, tone);
    c.filter = 'none';
    if (i === 0 || sectionBreak(i)) countdown(c, i, x, y, t, tone);
  }
}
