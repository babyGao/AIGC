// 画具：在笔触引擎之上的常用画法（圆弧、圆、丸、洒墨、挖白、局部变换、按时间落笔）
import { mk, draw, blot, mass, TONE, vnoise } from './ink.js';
import { clamp, lerp, mulberry } from '/core/lib.js';
export { mk, draw, blot, mass, TONE, vnoise };
export const VERM = [176, 46, 34];

// 椭圆弧点列（弧度；p0→p1 为笔压）
export function arc(cx, cy, rx, ry, a0, a1, n = 20, p0 = 1, p1 = 1, rot = 0) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = lerp(a0, a1, u), x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * c - y * s, cy + x * s + y * c, lerp(p0, p1, u)]);
  }
  return out;
}
// 点列整体平移/旋转/缩放
export function xf(pts, x, y, rot = 0, s = 1, sy = s) {
  const c = Math.cos(rot), sn = Math.sin(rot);
  return pts.map(p => [x + (p[0] * s) * c - (p[1] * sy) * sn, y + (p[0] * s) * sn + (p[1] * sy) * c, p[2] ?? 1]);
}
// 对三张画布同时做局部变换，fn 里用局部坐标落笔
export function local(A, x, y, rot, sx, sy, fn) {
  const cs = [A.cw, A.cd, A.cc];
  for (const c of cs) { c.save(); c.translate(x, y); if (rot) c.rotate(rot); if (sx !== 1 || (sy ?? sx) !== 1) c.scale(sx, sy ?? sx); }
  fn(A.ink);
  for (const c of cs) c.restore();
}
// 挖白：把一块墨擦掉（留白、高光、前后遮挡）
export function lift(L, fn, layers = ['wet', 'dry']) {
  for (const k of layers) { const c = L[k]; c.save(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.strokeStyle = '#000'; fn(c, k); c.restore(); }
}
export function liftEllipse(L, x, y, rx, ry = rx, a = 1, rot = 0, layers) {
  if (a <= 0) return;
  lift(L, c => { c.globalAlpha = clamp(a); c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); c.fill(); }, layers);
}
export function liftPoly(L, poly, a = 1, layers) {
  if (a <= 0) return;
  lift(L, c => { c.globalAlpha = clamp(a); c.beginPath(); poly.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); }, layers);
}

// 略不规则的圆（比 blot 圆得多）
export function disc(c, x, y, r, a, wob = .03, seed = 0, sq = 1, rot = 0) {
  if (a <= .003 || r <= .05) return;
  c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(1, sq); c.globalAlpha = clamp(a); c.fillStyle = '#000';
  c.beginPath(); const N = 44;
  for (let i = 0; i <= N; i++) {
    const t = i / N * 6.2832, rr = r * (1 + wob * (vnoise(seed * 5.1 + (i % N) * .55) * 2 - 1) + wob * .6 * Math.sin(t * 2 + seed));
    i ? c.lineTo(Math.cos(t) * rr, Math.sin(t) * rr) : c.moveTo(Math.cos(t) * rr, Math.sin(t) * rr);
  }
  c.closePath(); c.fill(); c.restore();
}

// ---------- 淡彩：低饱和的矿物色，只点在要紧处（画进颜色层，量要少）----------
export const PIG = {
  ochre: [158, 104, 62],      // 赭石：根、枝、药粉
  honey: [208, 160, 72],      // 藤黄调赭：蜜、饮片
  umber: [98, 64, 44],        // 深褐：药团、丸、熟地
  indigo: [70, 96, 114],      // 花青：青花、衣、远山
  green: [92, 124, 104],      // 石绿调墨：木之青
  jujube: [142, 64, 50],      // 枣红
  gold: [198, 166, 98],       // 泥金：瓶签、盒
};
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a)})`;
// 一摊淡彩：椭圆，中间实、边缘化开
export function tint(cc, x, y, rx, ry, col, a, rot = 0, soft = .55) {
  if (a <= .004 || rx <= .2) return;
  cc.save(); cc.translate(x, y); if (rot) cc.rotate(rot); cc.scale(1, ry / rx);
  const g = cc.createRadialGradient(0, 0, rx * (1 - soft), 0, 0, rx); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
  cc.fillStyle = g; cc.beginPath(); cc.arc(0, 0, rx, 0, 7); cc.fill(); cc.restore();
}
// 平涂一块淡彩（边缘由墨线收住）
export function tintPoly(cc, poly, col, a) {
  if (a <= .004) return;
  cc.save(); cc.fillStyle = rgba(col, a); cc.beginPath(); poly.forEach((p, i) => i ? cc.lineTo(p[0], p[1]) : cc.moveTo(p[0], p[1])); cc.closePath(); cc.fill(); cc.restore();
}
// 擦掉一块颜色（高光处不留色）
export function untint(cc, x, y, rx, ry, a = 1, rot = 0) {
  cc.save(); cc.globalCompositeOperation = 'destination-out'; cc.globalAlpha = clamp(a); cc.beginPath(); cc.ellipse(x, y, rx, ry, rot, 0, 7); cc.fill(); cc.restore();
}

// 淡墨的一摊（大面积用它，边缘比 blot 圆顺）
export function wash(c, x, y, rx, ry, a, seed = 0, rot = 0) { disc(c, x, y, rx, a, .07, seed, ry / rx, rot); }

// 洒墨：椭圆范围内的细点（药粉、飞沫）。p 为出现进度
export function spatter(c, x, y, sx, sy, n, o = {}) {
  const R = mulberry(o.seed ?? 1), a = o.a ?? .5, r0 = o.r0 ?? .8, r1 = o.r1 ?? 2.4;
  const m = Math.floor(n * clamp(o.p ?? 1));
  c.save(); c.fillStyle = '#000';
  for (let i = 0; i < m; i++) {
    const ang = R() * 6.2832, d = Math.pow(R(), o.pow ?? .7), rr = lerp(r0, r1, R() * R()), al = a * (.4 + .6 * R());
    c.globalAlpha = clamp(al); c.beginPath(); c.arc(x + Math.cos(ang) * d * sx, y + Math.sin(ang) * d * sy, rr, 0, 7); c.fill();
  }
  c.restore();
}

// 一丸。g：0 未过油（哑、有细孔）→ 1 过油（乌亮、留高光）；am 整体浓度
const pillCache = new Map();
export function pill(L, x, y, r, o = {}) {
  const g = clamp(o.g ?? 1), am = o.am ?? 1, seed = o.seed ?? 1;
  if (am <= 0 || r <= .5) return;
  if (o.shadow !== false) blot(L.wet, x + r * .1, y + r * .99, r * 1.02, .22 * am * (o.shadowK ?? 1), 0, .17, seed);
  if (o.occlude !== false) liftEllipse(L, x, y, r * .98, r * .98, Math.min(1, am * 1.2));
  const tone = lerp(.58, .97, g);
  disc(L.wet, x, y, r, tone * am, .022, seed);
  disc(L.dry, x, y, r * .975, tone * .93 * am, .018, seed + 2);
  // 一道含墨的弧：左下浓，让圆有笔意而不是色块
  const key = seed + '|' + Math.round(r);
  let st = pillCache.get(key);
  if (!st) {
    st = [
      mk(arc(0, 0, r * .8, r * .8, 1.2, 4.3, 18, .6, 1), { w: r * .42, tone: .9, dry: .5, wet: .5, prof: 'lens', seed: seed * 31 + 1, nb: 18 }),
      mk(arc(0, 0, r * .46, r * .46, 4.6, 7.4, 14, 1, .5), { w: r * .5, tone: .75, dry: .62, wet: .3, prof: 'lens', seed: seed * 31 + 2, nb: 16 }),
    ];
    if (pillCache.size > 400) pillCache.clear();
    pillCache.set(key, st);
  }
  for (const c of [L.wet, L.dry]) { c.save(); c.translate(x, y); }
  draw(L, st[0], 1, am * lerp(.9, .5, g)); draw(L, st[1], 1, am * lerp(.3, 0, g));
  for (const c of [L.wet, L.dry]) c.restore();
  const R = mulberry(seed * 977 + 13);
  // 细孔（未过油才有）
  const pa = (1 - g) * am;
  for (let i = 0; i < 16; i++) {
    const a = R() * 6.2832, d = Math.sqrt(R()) * r * .78, pr = r * (.018 + .034 * R()), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d, k = R();
    if (pa > .02) liftEllipse(L, px, py, pr, pr * (.6 + .4 * k), pa * (.55 + .45 * k), a);
  }
  if (L.col && o.tint !== false) tint(L.col, x, y, r * .99, r * .99, PIG.umber, lerp(.42, .2, g) * am, 0, .12);
  // 高光与反光（过油才有）：挖白
  if (g > .02) {
    const hx = x - r * .34, hy = y - r * .4;
    if (L.col) untint(L.col, hx, hy, r * .32, r * .17, g * am, -.62);
    liftEllipse(L, hx, hy, r * .3, r * .15, g * am * .55, -.62);
    liftEllipse(L, hx + r * .02, hy, r * .22, r * .09, g * am, -.62);
    liftEllipse(L, x - r * .56, y - r * .08, r * .05, r * .05, g * am * .85);
    lift(L, c => { c.globalAlpha = clamp(g * am * .3); c.lineWidth = r * .045; c.lineCap = 'round'; c.beginPath(); c.arc(x, y, r * .86, .3, 1.25); c.stroke(); });
  }
}

// 按时间落笔：一组笔（或自定义画法）各有起笔时刻与用时
export class Paint {
  constructor() { this.ops = []; }
  s(pts, o = {}, t0 = 0, d = .3, am = 1) { this.ops.push({ s: mk(pts, o), t0, d, am }); return this; }
  f(fn, t0 = 0, d = .3) { this.ops.push({ fn, t0, d }); return this; }       // fn(L, p, A)
  draw(A, t, am = 1) {
    for (const op of this.ops) {
      const p = op.d > 0 ? (t - op.t0) / op.d : (t >= op.t0 ? 1 : 0);
      if (p <= 0) continue;
      if (op.s) draw(A.ink, op.s, Math.min(1, p), op.am * am); else op.fn(A.ink, Math.min(1, p), A);
    }
  }
  get end() { return this.ops.reduce((m, o) => Math.max(m, o.t0 + o.d), 0); }
}
