// 毛笔写字：字形取自 OFL 字体（马善政楷书），用「一笔笔扫过的显现蒙版」按大致笔顺写出来，
// 先写进湿层（晕开），再落进干层；扫过的笔路带压力起伏，所以显现的前沿是毛笔的形状而不是直线。
import { clamp, lerp, mulberry, vnoise } from '/core/lib.js';

const CACHE = {};
function glyphCanvas(ch, size) {
  const k = ch + size; if (CACHE[k]) return CACHE[k];
  const W = Math.ceil(size * 1.3), cv = document.createElement('canvas'); cv.width = W; cv.height = W;
  const c = cv.getContext('2d'); c.font = `${size}px MaShanZheng`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
  c.fillText(ch, W / 2, W / 2 + size * .04);
  return (CACHE[k] = cv);
}
let MASK = null, TMPC = null;
function scratch(W) {
  if (!MASK || MASK.width < W) { MASK = document.createElement('canvas'); MASK.width = MASK.height = W; TMPC = document.createElement('canvas'); TMPC.width = TMPC.height = W; }
  return [MASK.getContext('2d'), TMPC.getContext('2d')];
}
// 写一个字：L = ink 上下文 {wet, dry}；中心 (x, y)；p 0..1 写的进度；dryK 0..1 干了多少
export function brushChar(L, ch, x, y, size, p, o = {}) {
  if (p <= 0) return;
  const am = o.am ?? 1, g = glyphCanvas(ch, size), W = g.width, sd = o.seed ?? (ch.charCodeAt(0) % 997);
  const [m, tc] = scratch(W);
  m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, W, W);
  if (p < 1) {
    // 笔路：自上而下、左右交替的几道横扫（近似楷书笔顺：先横后竖、自上而下），每道带压力起伏
    const K = o.sweeps ?? 7, R = mulberry(sd), pad = W * .08;
    m.lineCap = 'round'; m.strokeStyle = '#000';
    for (let k = 0; k < K; k++) {
      const u = clamp(p * K - k); if (u <= 0) break;
      const yy = lerp(pad, W - pad, (k + .5) / K) + (R() - .5) * W * .04, dirR = k % 2 === 0;
      const xa = dirR ? pad * .5 : W - pad * .5, xb = dirR ? W - pad * .5 : pad * .5;
      const n = 14, wk = W / K * 1.9;
      for (let i = 0; i < n * u; i++) {
        const a = i / n, b = Math.min(u, (i + 1) / n);
        m.lineWidth = wk * (.7 + .5 * vnoise(sd + k * 3 + a * 4));
        m.beginPath(); m.moveTo(lerp(xa, xb, a), yy + Math.sin(a * 5 + k) * W * .02); m.lineTo(lerp(xa, xb, b), yy + Math.sin(b * 5 + k) * W * .02); m.stroke();
      }
    }
  }
  for (const [ctx, alpha] of [[L.wet, (o.wet ?? .55) * (1 - (o.dryK ?? 1) * .5)], [L.dry, (o.dry ?? .95) * (o.dryK ?? 1)]]) {
    if (alpha <= .003) continue;
    tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, W, W);
    tc.drawImage(g, 0, 0);
    if (p < 1) { tc.globalCompositeOperation = 'destination-in'; tc.drawImage(MASK, 0, 0); tc.globalCompositeOperation = 'source-over'; }
    ctx.save(); ctx.globalAlpha = alpha * am; ctx.drawImage(TMPC, 0, 0, W, W, x - W / 2, y - W / 2, W, W); ctx.restore();
  }
}
// 一列竖排字（自上而下），每个字 p 的时间按顺序分配
export function brushColumn(L, text, x, y, size, p, o = {}) {
  const chars = [...text], n = chars.length, lead = o.spacing ?? 1.1;
  chars.forEach((ch, i) => { if (ch === ' ') return; brushChar(L, ch, x, y + i * size * lead, size, clamp(p * n - i), o); });
}

// 朱红白文印：方印（边缘不齐、印泥不匀），字挖白（竖排，从右到左两字）
import { VERM } from './clawd.js';
export function seal(c, x, y, S, text = '长安', am = 1, seed = 3) {
  if (am <= 0) return;
  c.save(); c.translate(x, y);
  const jit = S * .02;
  c.beginPath();
  for (let i = 0; i < 28; i++) {
    const t = i / 28 * 4, sd = Math.floor(t), u = t - sd;
    let px = [u * S, S, S - u * S, 0][sd], py = [0, u * S, S, S - u * S][sd];
    px += (vnoise(seed + i * 1.3) - .5) * jit * 2; py += (vnoise(seed + 40 + i * 1.3) - .5) * jit * 2;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath(); c.fillStyle = `rgba(${VERM.join(',')},${clamp(am)})`; c.fill();
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
  const chars = [...text];
  if (chars.length === 2) {   // 两字：右一左一（传统从右往左读）
    c.font = `${S * .5}px MaShanZheng`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.save(); c.translate(S * .73, S * .5); c.scale(.92, 1.75); c.fillText(chars[0], 0, 0); c.restore();
    c.save(); c.translate(S * .27, S * .5); c.scale(.92, 1.75); c.fillText(chars[1], 0, 0); c.restore();
  } else { c.font = `${S * .72}px MaShanZheng`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, S / 2, S / 2); }
  for (let i = 0; i < 80; i++) { c.globalAlpha = .4 + .6 * vnoise(i * 1.1); c.beginPath(); c.arc(vnoise(seed + i * 3.7) * S, vnoise(seed + 91 + i * 2.9) * S, S * (.004 + .012 * vnoise(i * 5.3)), 0, 7); c.fill(); }
  c.restore();
}
