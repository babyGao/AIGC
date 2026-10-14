// 逐笔写出的大字：以开源楷书 Ma Shan Zheng 的字形为骨架。
// 每笔中线按笔顺描在 100×100 字格里（第三个数是笔压），笔触引擎逐笔写，最后用略外扩的字形裁边：
// 笔顺、提按、飞白来自引擎，结构与重心来自字形。
import { mk, draw, TONE } from './ink.js';
import { clamp } from '/core/lib.js';

const FONT = 'MaShanZheng';
export const G = {
  // 丹：撇、横折钩、横。原字的点不写——由丹丸充当（dot = 丸心与半径）
  '丹': {
    S: [
      [[32, 16.5, .75], [33.5, 28, 1], [33, 40, 1], [32, 50, .95], [30, 60, .9], [26, 68, .8], [20, 75, .6], [12.5, 81, .2]],
      [[33.5, 18, .45], [40, 14.8, .38], [50, 13.6, .38], [60, 14.6, .45], [65.5, 16.5, .85], [67, 22, 1.05], [66.5, 35, 1.05], [66, 50, 1.05], [66.5, 65, 1.05], [66.5, 78, 1.1], [64.5, 86, 1], [61, 88.5, .75], [55, 84, .45], [48.5, 79.5, .15]],
      [[4, 52.5, .62], [13, 52.8, .7], [25, 49.8, .56], [40, 47.6, .5], [55, 46.6, .5], [67, 46, .58], [80, 46, .98], [90, 46.8, 1.12], [96, 48.5, .6]],
    ], W: [7, 9.6, 10], cut: [46, 31.2, 8.2], dot: [48.5, 31, 8.6],
  },
  '木': {
    S: [
      [[14, 32.2, .9], [22, 30.5, .92], [35, 28, .72], [50, 26.5, .66], [62, 25.5, .76], [70, 26, 1], [76.5, 27.8, .85]],
      [[48, 4.5, .8], [48, 12, 1], [47.6, 30, 1], [47.5, 50, 1], [47.5, 70, .95], [47.3, 85, .8], [47, 96.5, .22]],
      [[42, 33, .9], [36, 45, .92], [28, 56, .85], [18, 66, .7], [10, 73, .45], [5.5, 76.5, .14]],
      [[52, 40, .5], [58, 50, .75], [66, 60, .95], [75, 67.5, 1.1], [84, 72.5, 1.15], [90, 73, .9], [94.5, 71, .32]],
    ], W: [9, 10, 9, 11],
  },
  '火': {
    S: [
      [[32, 34.5, .2], [27.5, 41, .72], [24.5, 47, 1], [25.5, 52.5, .9]],
      [[72, 30, 1.1], [68, 34, .95], [61, 39, .6], [54, 43, .35], [50, 44.8, .14]],
      [[46, 5.5, .8], [46, 15, 1], [45.5, 30, 1], [44, 45, 1], [41, 57, .95], [35, 68, .85], [26, 78, .7], [16, 85, .45], [8.5, 89.3, .14]],
      [[46, 57, .5], [52, 66, .75], [60, 75, .95], [70, 82, 1.1], [79, 87.3, 1.15], [86, 87, .9], [91.5, 85.3, .32]],
    ], W: [10.5, 11, 10, 11],
  },
  '土': {
    S: [
      [[25, 46.2, .9], [32, 43.6, .86], [42, 41.2, .72], [55, 39.6, .76], [65, 39.2, 1], [71.5, 41.2, .88]],
      [[46.5, 14.5, .8], [48, 22, 1], [48, 40, 1], [47.5, 55, .95], [47, 68, .9], [47, 75, .8]],
      [[12.5, 80.8, .9], [20, 78.6, .95], [32, 75.6, .85], [48, 73.6, .8], [62, 72.6, .85], [76, 72.2, 1.05], [85, 74, 1.1], [89, 77.4, .78]],
    ], W: [10, 12.2, 11],
  },
  '金': {
    S: [
      [[46, 7.5, .9], [42, 17, 1], [35, 29, 1], [27, 40, .9], [17, 50, .7], [9, 56, .45], [3.5, 58.8, .14]],
      [[50, 19, .55], [56, 27, .75], [64, 37, .9], [73, 46, 1.05], [82, 53, 1.15], [90, 56.6, .95], [96.5, 57, .32]],
      [[33.5, 47.6, .9], [40, 45.2, .9], [48, 43.6, .95], [54, 44.2, .88]],
      [[28.5, 61.6, .9], [36, 59.2, .9], [46, 57.2, .9], [54, 56.2, .95], [58.5, 57.6, .82]],
      [[42, 47.5, .9], [42.5, 60, 1], [42, 72, 1], [41.5, 84.5, .9]],
      [[26.5, 70.2, .6], [28.5, 75, 1], [31.2, 80.4, .88]],
      [[59.8, 64.8, 1.1], [57, 69, 1], [52, 72.2, .6], [47.5, 74.2, .22]],
      [[18.5, 87.2, .9], [26, 85.2, .95], [38, 82.6, .85], [52, 81.6, .9], [62, 82.2, 1.05], [68.5, 84.2, .88]],
    ], W: [10, 11, 9, 9, 10, 10.5, 11.5, 10],
  },
  '水': {
    S: [
      [[42.5, 7.5, .7], [44.5, 9.5, 1.1], [44.8, 18, .95], [45, 38, .9], [45.3, 58, .92], [45.4, 76, 1], [44, 87, 1.12], [40.5, 90.5, 1], [35, 84, .7], [29, 76.5, .25]],
      [[12, 53, .6], [16, 49, .9], [24, 45.5, .85], [32, 42.5, .95], [37.5, 42.5, 1.15], [37.5, 49, 1.05], [33, 60, .95], [26, 70, .8], [17, 80, .55], [8, 87.5, .18]],
      [[74.5, 26.5, .8], [74, 31, 1.05], [68, 38, .9], [60, 44.5, .72], [53.5, 48.5, .5]],
      [[53, 48, .45], [58, 55, .62], [66, 63, .82], [74.5, 69.5, 1], [83, 74.5, 1.22], [90, 77, 1.05], [95.5, 77.5, .3]],
    ], W: [9.2, 9.4, 9.5, 12.3],
  },
};

const strokeCache = new Map();
function strokes(ch, o) {
  const key = ch + '|' + (o.dry ?? .2) + '|' + (o.seed ?? 51);
  if (!strokeCache.has(key)) {
    const g = G[ch];
    strokeCache.set(key, g.S.map((st, i) => mk(st, { w: g.W[i] * (o.wk ?? 1.14), tone: TONE.jiao, dry: o.dry ?? .2, wet: o.wet ?? .35, prof: 'even', rough: .06, nb: 46, solid: true, seed: (o.seed ?? 51) * 10 + i, gapLen: 60 })));
  }
  return strokeCache.get(key);
}

let TMPG = null;
const maskCache = new Map();
function mask(ch, S, pad, N) {
  const key = ch + '|' + S;
  if (maskCache.has(key)) return maskCache.get(key);
  if (maskCache.size > 10) maskCache.delete(maskCache.keys().next().value);
  const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
  const c = cv.getContext('2d');
  c.font = `${S}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const m = c.measureText(ch), y = pad + S / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  c.fillStyle = '#000'; c.fillText(ch, pad + S / 2, y);
  c.strokeStyle = '#000'; c.lineWidth = S * .016; c.lineJoin = 'round'; c.strokeText(ch, pad + S / 2, y);
  const cut = G[ch].cut;
  if (cut) { c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(pad + cut[0] * S / 100, pad + cut[1] * S / 100, cut[2] * S / 100, 0, 7); c.fill(); }
  maskCache.set(key, cv);
  return cv;
}

// 写一个大字。(wx, wy) 字格左上角、size 字格边长（世界坐标）；cam = {s, tx, ty}
// prog：数字（整字进度，按笔长分配）或数组（每笔各自的进度）
export function writeGlyph(A, cam, ch, wx, wy, size, prog = 1, o = {}) {
  const g = G[ch]; if (!g) return;
  const st = strokes(ch, o), n = st.length;
  let pr = prog;
  if (!Array.isArray(pr)) {
    const tot = st.reduce((a, s) => a + s.len + 14, 0); let acc = 0; pr = [];
    for (const s of st) { const t0 = acc / tot, t1 = (acc + s.len + 14) / tot; acc += s.len + 14; pr.push(clamp((prog - t0) / (t1 - t0))); }
  }
  if (!pr.some(v => v > 0)) return;
  const S = Math.max(8, Math.round(size * cam.s)), pad = Math.ceil(S * .12), N = S + pad * 2, k = S / 100;
  if (!TMPG || TMPG.N < N) {
    const mkc = () => { const c = document.createElement('canvas'); c.width = c.height = Math.max(N, 900); return c; };
    const wet = mkc(), dry = mkc();
    TMPG = { N: wet.width, wet, dry, cw: wet.getContext('2d'), cd: dry.getContext('2d') };
  }
  const T = TMPG, L = { wet: T.cw, dry: T.cd };
  for (const c of [T.cw, T.cd]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, N, N); c.setTransform(k, 0, 0, k, pad, pad); }
  for (let i = 0; i < n; i++) if (pr[i] > 0) draw(L, st[i], pr[i], o.am ?? 1);
  const M = mask(ch, S, pad, N);
  const sx = wx * cam.s + cam.tx - pad, sy = wy * cam.s + cam.ty - pad;
  for (const key of ['wet', 'dry']) {
    const c = L[key]; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-in'; c.globalAlpha = 1; c.drawImage(M, 0, 0); c.globalCompositeOperation = 'source-over';
    const d = A.ink[key]; d.save(); d.setTransform(1, 0, 0, 1, 0, 0); d.globalAlpha = o.alpha ?? 1; d.drawImage(T[key], 0, 0, N, N, sx, sy, N, N); d.restore();
  }
}
// 字格内的一点 → 世界坐标
export const inBox = (wx, wy, size, u, v) => [wx + u * size / 100, wy + v * size / 100];
