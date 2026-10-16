// 木刻 · K1：版面 2.39:1 放在纸边里（下边留宽纸边放字）。天是横刀刻的冷光，草原留黑只稀稀刻几道，
// 河刻成白，上游平静（几道细长的留黑水纹），下游近处是成排的浪头；人物刻白、远天上的中洲群仙是黑剪影。
import * as WC from './engine/index.js';
import { carveFigure } from './figure.js';
import { mulberry } from '/core/lib.js';
import { riverPath } from '../shared/scene.js';
const R = {};
export const PLATE = [60, 92, 1800, 753];   // x, y, w, h（2.39:1）
const k = PLATE[2] / 1920, P = p => [PLATE[0] + p[0] * k, PLATE[1] + p[1] * k];
export function plateEdge(seed = 3) {   // 毛糙的版边
  const r = mulberry(seed), [x, y, w, h] = PLATE, pts = [];
  const side = (ax, ay, bx, by, n) => { for (let i = 0; i < n; i++) { const u = i / n, j = (r() - .5) * 2.4; pts.push([ax + (bx - ax) * u + (ay === by ? 0 : j), ay + (by - ay) * u + (ax === bx ? 0 : j)]); } };
  side(x, y, x + w, y, 120); side(x + w, y, x + w, y + h, 60); side(x + w, y + h, x, y + h, 120); side(x, y + h, x, y, 60);
  return pts;
}
function rows(m, x0, x1, y0, y1, o) {   // 透视排布的横刀（远密近疏）
  const r = mulberry(o.seed || 1), out = [];
  for (let d = 0, i = 0; ; i++) {
    d = o.d0 + o.a * i ** o.pow; const y = y0 + d; if (y > y1) break;
    const depth = (y - y0) / (y1 - y0);
    out.push(...WC.cutAlong([[x0, y + (r() - .5) * 2], [(x0 + x1) / 2, y + (r() - .5) * 3], [x1, y + (r() - .5) * 2]], { w: o.w(depth), kind: o.kind || 'v', seg: o.seg(depth), gap: o.gap(depth), seed: i * 13 + (o.seed || 1) }));
  }
  return out;
}
export function render(cv, t, q, S) {
  const { K1, cast } = S, g = cv.getContext('2d');
  const [mask, m] = WC.canvas(1920, 1080), [plate] = WC.canvas(1920, 1080), PR = R.P || (R.P = WC.makePrinter(1920, 1080));
  m.fillStyle = '#fff'; m.fillRect(0, 0, 1920, 1080);
  const edge = plateEdge(); m.fillStyle = '#000'; m.beginPath(); edge.forEach((p, i) => i ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1])); m.closePath(); m.fill();
  m.save(); m.beginPath(); edge.forEach((p, i) => i ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1])); m.closePath(); m.clip();
  const hz = P([0, K1.horizon])[1], top = PLATE[1], bot = PLATE[1] + PLATE[3], xl = PLATE[0], xr = PLATE[0] + PLATE[2];
  // 天：横刀，越近地平线刀越宽（冷光从地平线那边来）
  const sky = WC.hatch(new WC.Region([[[xl, top], [xr, top], [xr, hz], [xl, hz]]], { res: 2 }), { dir: WC.dirAngle(0), tone: (x, y) => .28 + .66 * ((y - top) / (hz - top)) ** 1.6, sp: 6.5, kind: 'u', seg: [90, 300], gap: [4, 16], seed: 4, lo: .2, hi: .97 });
  WC.drawStrokes(m, sky);
  WC.drawStrokes(m, WC.cutAlong([[xl, hz], [xr, hz]], { w: 2.6, kind: 'k', seg: [200, 600], gap: [2, 6], seed: 9 }));   // 地平线一刀
  // 草原：留黑，横刀远密近疏，近处夹几簇草
  WC.drawStrokes(m, rows(m, xl, xr, hz + 3, bot, { d0: 4, a: 2.6, pow: 1.6, w: d => .8 + d * 2.4, seg: d => [14 + d * 40, 40 + d * 90], gap: d => [60 + d * 120, 160 + d * 320], seed: 5 }));
  const rg = mulberry(21), grass = [];
  for (let i = 0; i < 180; i++) { const y = hz + 30 + (bot - hz - 40) * rg() ** .7, d = (y - hz) / (bot - hz), x = xl + rg() * (xr - xl), h = 4 + d * 22;
    for (let j = -1; j <= 1; j++) grass.push(WC.mkStroke([[x + j * h * .25, y], [x + j * h * .4, y - h]], [d * 2.6 + .8, .4], { kind: 'v', seed: i * 3 + j })); }
  WC.drawStrokes(m, grass);
  // 河：刻成白；上游平静，下游起浪
  const rp = () => riverPath(m, K1.river, P, k);
  m.fillStyle = '#fff'; rp(); m.fill('nonzero');
  m.save(); rp(); m.clip('nonzero');
  const head = P([840, 381]);
  // 平静处：细长留黑水纹；到近处换成成排的浪头（弧形留黑 + 白浪尖）
  const calm = rows(m, xl, xr, head[1] + 4, P([0, 600])[1], { d0: 4, a: 2.2, pow: 1.4, w: d => .8 + d * 2.2, seg: d => [40 + d * 120, 120 + d * 240], gap: d => [30 + d * 60, 90 + d * 140], seed: 31 });
  WC.drawStrokes(m, calm, { color: '#000' });
  const rw = mulberry(41), waves = [];
  for (let i = 0; i < 160; i++) {
    const y = P([0, 560])[1] + (bot - P([0, 560])[1]) * rw() ** .8, d = (y - P([0, 560])[1]) / (bot - P([0, 560])[1]), x = xl + rw() * (xr - xl), L = 30 + d * 90, h = 6 + d * 22;
    const arc = []; for (let j = 0; j <= 10; j++) { const u = j / 10; arc.push([x - L / 2 + L * u, y - Math.sin(u * Math.PI) * h + (u > .7 ? (u - .7) * h * 1.6 : 0)]); }
    waves.push(WC.mkStroke(arc, arc.map((_, j) => (1.2 + d * 4.5) * Math.sin(Math.PI * (j / 10)) + .4), { kind: 'u', seed: i }));
  }
  WC.drawStrokes(m, waves, { color: '#000' });
  WC.drawStrokes(m, WC.flecks(Array.from({ length: 140 }, () => { const y = P([0, 600])[1] + (bot - P([0, 600])[1]) * rw(); return [xl + rw() * (xr - xl), y, 1.5 + (y - hz) / 140]; }), { seed: 5 }), { color: '#fff' });
  m.restore();
  // 两岸的岸线：一道刻刀
  K1.river.banks.forEach((b, i) => WC.drawStrokes(m, WC.cutAlong(b.map(P), { w: 1.6, kind: 'k', seg: [40, 140], gap: [3, 12], seed: 51 + i })));
  // 人物
  const C = cast({ k, p: P });
  // 方源的倒影（浅水里的倒影，横刀打碎）
  const fy = C.fy, foot = fy.at;
  m.save(); rp(); m.clip('nonzero');
  m.globalAlpha = 1; m.fillStyle = '#000';
  for (const op of fy.ops) { const PP = op.poly || op.open; if (!PP) continue; m.beginPath(); PP.forEach((p, i) => { const y = foot[1] + (foot[1] - p[1]) * .7; i ? m.lineTo(p[0], y) : m.moveTo(p[0], y); }); m.closePath(); m.fill(); }
  WC.drawStrokes(m, rows(m, foot[0] - 60, foot[0] + 60, foot[1] + 1, foot[1] + 60, { d0: 1, a: 2.4, pow: 1.1, w: () => 1.3, seg: () => [10, 40], gap: () => [2, 8], seed: 61 }), { color: '#fff' });
  m.restore();
  // 中洲群仙：一片留黑的云，人刻成白站在云上（白在黑上才看得清）
  { const zz = S.K1.zhongzhou, xs = zz.map(f => P(f.at)[0]), ys = zz.map(f => P(f.at)[1]);
    const x0 = Math.min(...xs) - 90, x1 = Math.max(...xs) + 90, yb = Math.max(...ys) + 4;
    const rc = mulberry(71), cl = [];
    for (let j = 0; j <= 48; j++) { const u = j / 48, x = x0 + (x1 - x0) * u; cl.push([x, yb - 6 - Math.sin(u * Math.PI) * 10 - Math.abs(Math.sin(u * 11 + 1)) * 12]); }
    for (let j = 0; j <= 24; j++) { const u = j / 24, x = x1 - (x1 - x0) * u; cl.push([x, yb + 16 + Math.sin(u * Math.PI) * 10 + Math.abs(Math.sin(u * 8)) * 6]); }
    m.fillStyle = '#000'; m.beginPath(); cl.forEach((p, i) => i ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1])); m.closePath(); m.fill();
    WC.drawStrokes(m, WC.cutAlong(cl.slice(0, 49), { w: 2.2, kind: 'v', seg: [30, 90], gap: [4, 14], seed: 72 }));
    // 人身后各留一块黑（被云气托着的身影），白人刻在上面
    for (const c of C.zhongzhou) { m.fillStyle = '#000'; for (const op of c.ops) if (op.poly) { m.beginPath(); op.poly.forEach((p, i) => i ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1])); m.closePath(); m.lineWidth = 9; m.strokeStyle = '#000'; m.stroke(); m.fill(); } }
    // 云里的卷纹
    for (let j = 0; j < 5; j++) { const cx = x0 + 40 + rc() * (x1 - x0 - 80), cy = yb + 4, r = 7 + rc() * 6, arc = []; for (let a = 0; a <= 1.6 * Math.PI; a += .2) arc.push([cx + Math.cos(a) * r * (1 - a / 12), cy + Math.sin(a) * r * .55 * (1 - a / 12)]); WC.drawStrokes(m, WC.cutAlong(arc, { w: 1.6, kind: 'v', seg: [200, 300], gap: [0, 1], seed: 80 + j })); }
    C.zhongzhou.forEach((c, i) => carveFigure(m, c.ops, { key: 'k1zz' + i, scale: .2, halo: 2.5, minLine: 9 }));
  }
  carveFigure(m, C.mlq.ops, { key: 'k1mlq', scale: C.mlq.s * 2.2 });
  for (const [i, c] of C.changsheng.entries()) carveFigure(m, c.ops, { key: 'k1cs' + i, scale: .15, halo: 3, minLine: 9 });
  for (const [i, c] of C.beiyuan.entries()) carveFigure(m, c.ops, { key: 'k1by' + i, scale: .15, halo: 3, minLine: 9 });
  carveFigure(m, fy.ops, { key: 'k1fy', scale: fy.s * 1.4, halo: 3, minLine: .5 });
  m.restore();
  m.strokeStyle = '#000'; m.lineWidth = 10; m.lineJoin = 'round'; m.beginPath(); edge.forEach((p, i) => i ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1])); m.closePath(); m.stroke();
  g.drawImage(PR.render(mask, plate, { mode: 'print', seed: 3 }), 0, 0);
}
