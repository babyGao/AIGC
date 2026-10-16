// 水墨：把画面指令写成笔墨（ink-wash STYLE.md：没骨、五墨、留白、写意人物）。
// 白衣 = 纸白，只用淡墨勾几笔外形；头发 = 顺发流的浓墨大笔带飞白；眉眼 = 焦墨细笔；腰带 = 浓墨块。
import * as I from './ink.js';

const cache = new Map();
// 闭合轮廓拆成几段开放的笔（写意：轮廓不封口，笔与笔之间留气口）
function contourStrokes(poly, o) {
  const n = poly.length, out = [], segs = o.segs || 3;
  const start = Math.floor((o.phase ?? 0.1) * n);
  for (let k = 0; k < segs; k++) {
    const a = start + Math.floor(k * n / segs), b = start + Math.floor((k + 1) * n / segs) - Math.floor(n * (o.gap ?? .04));
    const pts = []; for (let i = a; i < b; i += Math.max(1, Math.floor(n / 160))) pts.push(poly[i % n]);
    if (pts.length > 3) out.push(pts);
  }
  return out;
}
export function inkFigure(L, ops, o = {}) {
  const sc = o.scale || 1, key = o.key;
  let S = key && cache.get(key);
  if (!S) {
    S = [];
    I.reseed(o.seed ?? 7);
    ops.forEach((op, i) => {
      const clipY = op.clipY;
      switch (op.role) {
        case 'hair': {
          // 一绺 = 一个淡墨底 + 一支顺发流的浓墨笔（宽 = 绺宽）
          S.push({ kind: 'mass', poly: op.poly, a: .52, layer: 'wet', clipY });
          if (op.axis && op.axis.length > 3) {
            const w = Math.max(...op.axis.map(p => p[2])) * .95;
            S.push({ kind: 'stroke', s: I.mk(op.axis.map(p => [p[0], p[1], Math.max(.25, p[2] / (w || 1))]), { w, tone: I.TONE.jiao, dry: .42, rough: .2, prof: 'brush' }), clipY });
          }
          break;
        }
        case 'robe': case 'robeIn': {
          S.push({ kind: 'erase', poly: op.poly, clipY });
          for (const pts of contourStrokes(op.poly, { segs: op.part === 'skirt' ? 4 : 3, phase: (i * .13) % 1 }))
            S.push({ kind: 'stroke', s: I.mk(pts, { w: Math.max(1.8, 3.4 * sc), tone: I.TONE.zhong, dry: .35, rough: .25 }), clipY });
          if (op.role === 'robeIn') S.push({ kind: 'mass', poly: op.poly, a: .12, layer: 'wet', clipY });
          break;
        }
        case 'ink': case 'dark': case 'red': S.push({ kind: 'mass', poly: op.poly, a: .85, layer: 'wet', clipY }); break;
        case 'gold': case 'blue': S.push({ kind: 'mass', poly: op.poly, a: .35, layer: 'wet', clipY }); break;
        case 'green': S.push({ kind: 'mass', poly: op.poly, a: .6, layer: 'wet', clipY }); break;
        case 'pink': S.push({ kind: 'erase', poly: op.poly, clipY }); S.push({ kind: 'mass', poly: op.poly, a: .28, layer: 'wet', clipY }); break;
        case 'tooth': S.push({ kind: 'erase', poly: op.poly, clipY }); for (const pts of contourStrokes(op.poly, { segs: 1, gap: .05 })) S.push({ kind: 'stroke', s: I.mk(pts, { w: Math.max(.8, 1.4 * sc), tone: I.TONE.nong, dry: .2 }), clipY }); break;
        case 'furL': S.push({ kind: 'erase', poly: op.poly, clipY }); S.push({ kind: 'mass', poly: op.poly, a: .1, layer: 'wet', clipY }); break;
        case 'purple': case 'purpleD': {   // 兽毛：一团湿墨 + 沿外缘的干笔毛
          S.push({ kind: 'erase', poly: op.poly, clipY });
          S.push({ kind: 'mass', poly: op.poly, a: op.role === 'purple' ? .42 : .7, layer: 'wet', clipY });
          for (const pts of contourStrokes(op.poly, { segs: 6, gap: .06, phase: (i * .17) % 1 })) S.push({ kind: 'stroke', s: I.mk(pts, { w: Math.max(2.4, 5 * sc), tone: I.TONE.nong, dry: .7, rough: .4 }), clipY });
          break;
        }
        case 'robeD': S.push({ kind: 'erase', poly: op.poly, clipY }); S.push({ kind: 'mass', poly: op.poly, a: .55, layer: 'wet', clipY }); break;
        case 'hairW': case 'fur': {
          S.push({ kind: 'erase', poly: op.poly, clipY });
          for (const pts of contourStrokes(op.poly, { segs: op.role === 'fur' ? 5 : 3, gap: .08, phase: (i * .21) % 1 }))
            S.push({ kind: 'stroke', s: I.mk(pts, { w: Math.max(1.2, 2.2 * sc), tone: I.TONE.zhong, dry: .55, rough: .3 }), clipY });
          break;
        }
        case 'strand': if (op.on === 'hairW') S.push({ kind: 'stroke', s: I.mk(op.pts, { w: Math.max(.9, op.w * 1.2), tone: I.TONE.dan, dry: .5, rough: .25 }), clipY }); break;
        case 'shade': S.push({ kind: 'mass', poly: op.poly, a: .1, layer: 'wet', clipY }); break;
        case 'collar': S.push({ kind: 'erase', poly: op.poly, clipY }); break;
        case 'eye': S.push({ kind: 'erase', poly: op.open, clipY }); if (op.color === 'purple') S.push({ kind: 'mass', poly: op.open, a: .06, layer: 'wet', clipY }); S.push({ kind: 'iris', x: op.iris[0], y: op.iris[1], r: op.iris[2], open: op.open, clipY }); break;
        case 'line': {
          if (op.key === 'tail') { S.push({ kind: 'stroke', s: I.mk(op.pts, { w: op.w, tone: I.TONE.jiao, dry: .3 }), clipY }); break; }
          const face = /^(brow|lid|mouth|noseTip|nose|jaw|chin|crease|low|lip)/.test(op.key);
          const tone = op.dark > .8 ? I.TONE.jiao : op.dark > .5 ? I.TONE.nong : op.dark > .32 ? I.TONE.zhong : I.TONE.dan;
          const w = Math.max(face ? .9 : 1.2, op.w * (face ? 1.25 : 1.5));
          S.push({ kind: 'stroke', s: I.mk(op.pts, { w, tone, dry: face ? .12 : .4, rough: face ? .06 : .22, prof: face ? 'brush' : 'brush' }), clipY });
          break;
        }
        case 'skin': S.push({ kind: 'erase', poly: op.poly, clipY }); if (op.part === 'face' || op.part === 'ear') for (const pts of contourStrokes(op.poly, { segs: 2, gap: .25, phase: .55 })) S.push({ kind: 'stroke', s: I.mk(pts, { w: Math.max(.8, 1.4 * sc), tone: I.TONE.dan, dry: .2 }), clipY }); break;
      }
    });
    if (key) cache.set(key, S);
  }
  for (const it of S) {
    for (const c of [L.cw, L.cd]) { c.save(); if (it.clipY != null) { c.beginPath(); c.rect(-1e4, -1e4, 3e4, 1e4 + it.clipY); c.clip(); } }
    if (it.kind === 'erase') for (const c of [L.cw, L.cd]) { c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.beginPath(); it.poly.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); c.globalCompositeOperation = 'source-over'; }
    else if (it.kind === 'mass') I.mass(it.layer === 'wet' ? L.cw : L.cd, it.poly, it.a, 2 * sc, 3);
    else if (it.kind === 'stroke') I.draw(L.ink, it.s, 1, 1);
    else if (it.kind === 'iris') { L.cd.save(); L.cd.beginPath(); it.open.forEach((p, k) => k ? L.cd.lineTo(p[0], p[1]) : L.cd.moveTo(p[0], p[1])); L.cd.closePath(); L.cd.clip(); I.blot(L.cd, it.x, it.y, it.r, .92, 0, 1, 5); L.cd.restore(); }
    for (const c of [L.cw, L.cd]) c.restore();
  }
}
