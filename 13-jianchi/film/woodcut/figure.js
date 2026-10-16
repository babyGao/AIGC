// 木刻：把 flatten 出来的画面指令刻到版上（mask：黑=留木，白=刻掉）。
// 规矩（woodcut STYLE.md）：白衣是刻出来的亮面，阴影一侧留黑刀痕；头发留黑，只在受光边刻几刀；
// 皮肤刻白、五官留黑；人物外缘一圈白光晕把黑发从黑底里分出来。
import * as WC from './engine/index.js';
import { mulberry } from '/core/lib.js';

const fillP = (g, P, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); g.fill(); };
const cache = new Map();

export function carveFigure(g, ops, o = {}) {
  const key = o.key, L = o.light || WC.light(-.55, -.6, .6), sc = o.scale || 1, rnd = mulberry(o.seed ?? 5);
  let C = key && cache.get(key);
  if (!C) {
    C = { shapes: new Map(), cuts: [], strands: [] };
    // 白衣：每块是一个“白色实体”，阴影侧留黑刀痕，刀痕顺着形体
    ops.forEach((op, i) => {
      if (op.role === 'robeD')
        C.shapes.set(i, WC.shape([op.poly], { light: L, sp: Math.max(3.6, 6 * sc), R: 50 * sc, lo: .55, hi: .98, kind: 'v', seed: 13 + i, wmax: Math.max(1.4, 2.6 * sc) }));
      if (op.role === 'purple' || op.role === 'purpleD')   // 兽毛：黑木上顺毛刻白（受光一侧多）
        C.shapes.set(i, WC.shape([op.poly], { light: L, sp: Math.max(3.4, (op.role === 'purple' ? 5 : 7) * sc), R: 60 * sc, lo: op.role === 'purple' ? .3 : .6, hi: .97, kind: 'v', seed: 33 + i, wmax: Math.max(1.6, 3.4 * sc), seg: [10 * sc, 40 * sc], gap: [2, 7], dir: 'contour' }));
      if (op.role === 'furL')
        C.shapes.set(i, WC.shape([op.poly], { white: true, light: L, sp: Math.max(3.4, 6 * sc), R: 40 * sc, lo: .5, hi: .99, kind: 'k', seed: 43 + i, fill: true, wmax: Math.max(1.2, 2.2 * sc), seg: [10 * sc, 30 * sc], gap: [3, 9] }));
      if (op.role === 'fur')
        C.shapes.set(i, WC.shape([op.poly], { white: true, light: L, sp: Math.max(3.4, 6 * sc), R: 45 * sc, lo: .45, hi: .99, kind: 'k', seed: 23 + i, fill: true, wmax: Math.max(1.4, 2.6 * sc), seg: [12 * sc, 40 * sc], gap: [3, 9] }));
      if (op.role === 'robe' || op.role === 'robeIn')
        C.shapes.set(i, WC.shape([op.poly], { white: true, light: L, sp: Math.max(3.6, 6.5 * sc), R: 55 * sc, lo: op.role === 'robeIn' ? .05 : .5, hi: .99, kind: 'k', seed: 3 + i, fill: true, wmax: Math.max(1.6, 3 * sc),
          dir: /^sleeve/.test(op.part || '') ? (op.part === 'sleeve0' ? Math.PI / 2 + .28 : Math.PI / 2 - .28) : Math.PI / 2, seg: [60 * sc, 220 * sc], gap: [2, 7] }));
      if (op.role === 'shade')
        C.shapes.set(i, WC.shape([op.poly], { white: true, light: L, sp: Math.max(1.6, 2.2 * sc), lo: 0, hi: .6, dir: .35, kind: 'k', seed: 9 + i, wmax: Math.max(.8, 1.2 * sc) }));
    });
    // 头发：只在受光一侧的发丝刻白（V 刀），其余留黑
    ops.forEach(op => {
      if (op.role !== 'strand') return;
      const a = op.pts[0], b = op.pts[op.pts.length - 1];
      const lit = -(L[0] * (a[0] + b[0]) / 2 + L[1] * (a[1] + b[1]) / 2);
      if (rnd() < .55) C.strands.push({ op, lit });
    });
    if (key) cache.set(key, C);
  }
  // 1. 光晕：整个人外缘刻一圈白
  const halo = o.halo ?? Math.max(4, 7 * sc);
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.lineWidth = halo * 2;
  for (const op of ops) if (op.poly && op.role !== 'shade') { g.beginPath(); op.poly.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); }
  g.restore();
  // 2. 逐层
  ops.forEach((op, i) => {
    g.save();
    if (op.clipY != null) { g.beginPath(); g.rect(-1e4, -1e4, 3e4, 1e4 + op.clipY); g.clip(); }
    switch (op.role) {
      case 'hair': fillP(g, op.poly, '#000'); break;
      case 'robe': case 'robeIn': case 'shade': case 'robeD': case 'fur': case 'purple': case 'purpleD': case 'furL': C.shapes.get(i).draw(g, o.t ?? 1e9); break;
      case 'tooth': case 'pink': fillP(g, op.poly, '#fff'); break;
      case 'collar': case 'skin': case 'hairW': fillP(g, op.poly, '#fff'); if (op.role === 'hairW') { g.lineWidth = Math.max(1, 1.6 * sc); g.strokeStyle = '#000'; g.beginPath(); op.poly.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); } break;
      case 'ink': case 'dark': case 'gold': case 'red': case 'green': case 'blue': fillP(g, op.poly, '#000'); break;
      case 'eye': {
        fillP(g, op.open, '#fff');
        g.save(); g.beginPath(); op.open.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.clip();
        g.fillStyle = '#000'; g.beginPath(); g.arc(op.iris[0], op.iris[1], op.iris[2], 0, 7); g.fill(); g.restore(); break;
      }
      case 'line': {
        const n = op.pts.length, w = Math.max(.9, op.w * (op.dark < .45 ? .8 : 1.15));
        const ws = op.pts.map((_, k) => { const u = k / (n - 1); return w * Math.min(1, u / .15, (1 - u) / .25) ** .55 + .35; });
        WC.drawStrokes(g, [WC.mkStroke(op.pts, ws, { kind: 'k', seed: i * 7 + 1, chip: .08 })], { color: '#000' });
        break;
      }
      case 'strand': {
        if (op.on === 'hairW') {   // 白发：留黑的细木线
          const n = op.pts.length, w = Math.max(.8, op.w * 1.1);
          WC.drawStrokes(g, [WC.mkStroke(op.pts, op.pts.map((_, k) => { const u = k / (n - 1); return w * Math.min(1, u / .15, (1 - u) / .3) ** .6 + .2; }), { kind: 'k', seed: i, chip: .1 })], { color: '#000' });
          break;
        }
        const s = C.strands.find(x => x.op === op); if (!s) break;
        const n = op.pts.length, w = Math.max(.9, 1.5 * sc);
        WC.drawStrokes(g, [WC.mkStroke(op.pts, op.pts.map((_, k) => { const u = k / (n - 1); return w * Math.min(1, u / .2, (1 - u) / .35) ** .6; }), { kind: 'v', seed: i, chip: .2 })], { color: '#fff' });
        break;
      }
    }
    g.restore();
  });
}
