// 方源正脸（面无表情），油画厚涂。形全部来自 trace/trace.py 对参考图的描摹（data/front.json）：
// 每块形 = 类别（头发/皮肤/五官线/白袍/内领/镶边）+ 明暗层级；这里按类别上色画成平涂底稿，
// 再交给 lemo-opuscar 的 paintRef 从大刀到小刀铺笔。同一类别的形是一个笔触组：笔可以跨明暗层，不跨类别。
// 头发、袍子的笔顺着描出来的发丝走向场（field）走；皮肤和五官线顺着形的边走。
import { Ref, paintRef, strokePath } from './engine/plate.js';
import { LINE, KNIFE, hex } from './engine/impasto.js';

// 各类别从暗到亮的颜色（参考图是黑白的；颜色按已定方案：白衣大袖、领口青绿镶边，黑发带一点冷蓝，皮肤“朴素的白”）
export const PAL = {
  hair: ['#0c0b10', '#1a1922', '#2c2d3c', '#474b62', '#6c728e'],
  skin: ['#8a7e86', '#aa9c9e', '#cbb8b2', '#e6d0c4', '#f5e2d6', '#faeee4'],
  line: ['#16121a', '#302a32', '#524a52'],
  robe: ['#9a94ac', '#b4aec4', '#d0cbd6', '#e8e3e0', '#f6f2ea'],
  collar: ['#cfc8c0', '#e0dad0', '#eeeae2', '#f8f5ee'],
  trim: ['#5f8a84'],
};
const PROPS = {
  robe: { maxR: 16, aj: .2, len: 1.2 },
  collar: { maxR: 9, aj: .2 },
  trim: { dir: 'edge', fallback: 90, maxR: 3 },
  skin: { dir: 'edge', fallback: 80, maxR: 8, detail: .75, aj: .3 },
  hair: { maxR: 12, aj: .14, len: 1.4, jit: .05 },
  line: { dir: 'edge', fallback: 0, maxR: 2.2, detail: .6, hgt: .8 },
};
const ORDER = ['robe', 'collar', 'trim', 'skin', 'hair', 'line'];
const colourOf = s => { const p = PAL[s.cls]; if (s.lv < 0) return p[Math.min(p.length - 1, Math.round((s.mean / 255) * (p.length - 1)))]; return p[Math.min(p.length - 1, Math.round(s.lv / Math.max(1, s.n - 1) * (p.length - 1)))]; };
const ringsPath = rings => c => { for (const r of rings) { c.moveTo(r[0][0], r[0][1]); for (let i = 1; i < r.length; i++) c.lineTo(r[i][0], r[i][1]); c.closePath(); } };

export async function loadFront(url = 'data/front.json') { return (await fetch(url)).json(); }
// 发丝走向（度 -> 弧度），按局部单位取
export function fieldAt(D, x, y) {
  const F = D.field, gx = Math.max(0, Math.min(F.w - 1, Math.floor(x / F.step))), gy = Math.max(0, Math.min(F.h - 1, Math.floor(y / F.step)));
  return F.a[gy * F.w + gx] * Math.PI / 180;
}
export function drawFace(R, D) {
  const flow = { fn: (x, y) => fieldAt(D, x, y) };
  for (const cls of ORDER) for (const s of D.shapes.filter(s => s.cls === cls).sort((a, b) => a.lv - b.lv))
    R.fill(ringsPath(s.rings), colourOf(s), { dir: flow, ...PROPS[cls], group: cls, rule: 'evenodd' });
}
// 发丝：头发里的亮丝（冷灰蓝）和发际外散出的细黑丝，按描出来的中线用细刀笔走
export function strands(st, D) {
  for (const [i, p] of D.strands.hi.entries()) strokePath(st, p, { wid: 3.2, c: hex(PAL.hair[3]), c2: hex(PAL.hair[2]), type: LINE, step: 22, hgt: .7, seed: i });
  for (const [i, p] of D.strands.wisp.entries()) strokePath(st, p, { wid: 3, c: hex(PAL.hair[1]), c2: hex(PAL.hair[0]), type: LINE, step: 22, hgt: .6, seed: 500 + i });
}
// 背景：lemo demo 式的冷灰大笔（只为看人）
export function buildBackdrop(w, h) {
  const R = new Ref(w, h, .5);
  R.fill(c => c.rect(0, 0, w, h), (c => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5e6880'); g.addColorStop(.6, '#9a9ca8'); g.addColorStop(1, '#b4aca6'); return g; }), { dir: -5, fallback: -5, group: 'bg', maxR: 60, detail: 2.5 });
  return { strokes: paintRef(R, { R: [30, 15, 8], T: 12, seed: 3 }), ref: R };
}
export function buildFace(D, { scale = 1, seed = 7, R0 = [28, 14, 7, 3.6, 2], T = 10 } = {}) {
  const R = new Ref(D.w, D.h, scale); drawFace(R, D);
  const st = paintRef(R, { R: R0.map(r => r * scale).filter(r => r >= 1), T, seed });
  strands(st, D);
  return { strokes: st, ref: R };
}
