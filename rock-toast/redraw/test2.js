// 实拍 → 手绘重绘（第二批）：照片拆成色块 / 线条 / 明暗后，交给 7 个手绘引擎各自下笔
// ?style=sketch|engraving|riso|ukiyoe|crayon|inkwash|cel&f=syrup|soak|fork
import { mulberry, clamp } from '/core/lib.js';
import * as US from './engines/sketch/engine.js';
import { B, Wash, drawSheet } from './engines/engraving/index.js';
import { makeRiso, INK as RINK, PAPER as RPAPER } from './engines/riso/riso.js';
import * as UK from './engines/ukiyoe/print.js';
import * as CR from './engines/crayon/crayon.js';
import { makeComp as crayonComp } from './engines/crayon/gl.js';
import * as IK from './engines/inkwash/ink.js';
import { makeComp as inkComp, layerSet } from './engines/inkwash/comp.js';
import * as CEL from './engines/cel/cel.js';

const Q = new URLSearchParams(location.search);
const STYLE = Q.get('style') || 'sketch', NAME = Q.get('f') || 'syrup';
const W = innerWidth, H = innerHeight;
const glc = document.getElementById('gl'), c2 = document.getElementById('c2');
glc.width = c2.width = W; glc.height = c2.height = H;
const g = c2.getContext('2d');
const R = mulberry(11);
const load = src => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; });
const pix = (im, blur = 0) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true }); if (blur) x.filter = `blur(${blur}px)`; x.drawImage(im, 0, 0, W, H); return x.getImageData(0, 0, W, H).data; };
const hexOf = c => '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const toRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const satOf = c => { const mx = Math.max(...c), mn = Math.min(...c); return mx ? (mx - mn) / mx : 0; };
const boost = (c, k) => { const m = (c[0] + c[1] + c[2]) / 3; return c.map(v => clamp(m + (v - m) * k, 0, 255)); };
const pathOf = polys => { const p = new Path2D(); for (const P of polys) { p.moveTo(P[0][0], P[0][1]); for (const q of P) p.lineTo(q[0], q[1]); p.closePath(); } return p; };
const centroid = P => { let x = 0, y = 0; for (const q of P) { x += q[0]; y += q[1]; } return [x / P.length, y / P.length]; };
// 按颜色把色块并成 k 组（手工上色只需要几块颜色）
function colourGroups(regions, k) {
  let cen = regions.slice(0, k).map(r => r.c.slice());
  for (let it = 0; it < 8; it++) {
    const acc = cen.map(() => [0, 0, 0, 0]);
    for (const r of regions) { let bi = 0, bd = 1e9; cen.forEach((c, i) => { const d = (c[0] - r.c[0]) ** 2 + (c[1] - r.c[1]) ** 2 + (c[2] - r.c[2]) ** 2; if (d < bd) { bd = d; bi = i; } }); r._g = bi; const a = acc[bi]; a[0] += r.c[0] * r.area; a[1] += r.c[1] * r.area; a[2] += r.c[2] * r.area; a[3] += r.area; }
    cen = acc.map((a, i) => a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : cen[i]);
  }
  return cen.map((c, i) => ({ c, polys: regions.filter(r => r._g === i).flatMap(r => r.polys) })).filter(gr => gr.polys.length);
}

window.DUR = 1;
(async () => {
  const img = await load(`frames/${NAME}.jpg`);
  const V = await (await fetch(`frames/${NAME}_vec.json`)).json();
  const lum = pix(img, 2), ref = pix(img);
  const lumAt = (x, y) => { const i = (clamp(Math.round(y), 0, H - 1) * W + clamp(Math.round(x), 0, W - 1)) * 4; return (lum[i] * .3 + lum[i + 1] * .59 + lum[i + 2] * .11) / 255; };
  const outlines = V.outline, lines = V.lines.filter(l => l.length >= 2);
  let draw;

  if (STYLE === 'sketch') {
    // —— 钢笔淡彩：透明水彩（错位、毛边、积色边）+ 抖动的细钢笔线 ——
    glc.style.display = 'none';
    draw = () => {
      g.fillStyle = hexOf(US.PAPER); g.fillRect(0, 0, W, H);
      V.regions.forEach((r, i) => { const c = boost(r.c, r.lum < .3 ? 1.6 : 1.15).map(v => Math.max(v, 34)); US.wash(g, r.polys[0], c, { a: .85, layers: 2, j: 3.5, edge: .3, dx: (R() - .5) * 9, dy: (R() - .5) * 9, seed: i + 1 }); });
      outlines.forEach((p, i) => US.drawPen(g, US.penStroke([...p, p[0]], { w: 2.6, wob: 1.2, over: 6, seed: i + 2 }), 1, US.INK, .95));
      lines.forEach((l, i) => US.drawPen(g, US.penStroke(l, { w: 1.7, wob: 1, over: 4, seed: i + 9 }), 1, US.INK, .85));
    };
  } else if (STYLE === 'engraving') {
    // —— 铜版画 + 手工上色：原片明暗驱动三遍排线，外轮廓刻线，几块透明水彩上色 ——
    glc.style.display = 'none';
    const ink = new B.Ink();
    const tone = (x, y) => clamp(Math.pow(1 - lumAt(x, y), 1.15) * 1.08);
    ink.group('h'); B.engraveTone(ink, outlines, { tone, spacing: 4.6, angle: -0.7, wMax: 1.8, seed: 3 });
    ink.group('ol'); for (const p of outlines) B.outline(ink, p, { w: 2.3 });
    ink.group('ln'); for (const l of lines) if (l.length > 2) B.stroke(ink, l, 1.1);
    for (const n of ['h', 'ol', 'ln']) ink.instant(n, 0);
    ink.build();
    const wash = new Wash({ scale: 1.5 });
    colourGroups(V.regions.filter(r => satOf(r.c) > .2), 5).forEach((gr, i) => wash.add({ path: pathOf(gr.polys), polys: gr.polys, color: hexOf(boost(gr.c, 1.15)), alpha: .72, origin: centroid(gr.polys[0]), t0: 0, dur: .01, seed: i + 1 }));
    draw = () => { drawSheet(g, { W, H, plate: [34, 34, W - 34, H - 34], tone: 1 }); wash.draw(g, 10); ink.draw(g, 10); };
  } else if (STYLE === 'riso') {
    // —— 孔版印刷：原片按蓝 / 黄 / 荧光粉三块专色分版，网点、错位、墨粒 ——
    c2.style.display = 'none';
    const msk = pix(await load(`frames/${NAME}_grp.png`), 3);
    const K = [RINK.blue, RINK.yellow, RINK.pink].map(ink => ink.map(v => -Math.log(Math.max(v, 10) / 255)));   // K[i][c]
    // 3×3 求逆：b_c = Σ_i d_i K[i][c]
    const A = [0, 1, 2].map(c => [K[0][c], K[1][c], K[2][c]]);
    const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
    const inv = [[A[1][1] * A[2][2] - A[1][2] * A[2][1], A[0][2] * A[2][1] - A[0][1] * A[2][2], A[0][1] * A[1][2] - A[0][2] * A[1][1]],
      [A[1][2] * A[2][0] - A[1][0] * A[2][2], A[0][0] * A[2][2] - A[0][2] * A[2][0], A[0][2] * A[1][0] - A[0][0] * A[1][2]],
      [A[1][0] * A[2][1] - A[1][1] * A[2][0], A[0][1] * A[2][0] - A[0][0] * A[2][1], A[0][0] * A[1][1] - A[0][1] * A[1][0]]].map(r => r.map(v => v / det));
    const plate = document.createElement('canvas'); plate.width = W; plate.height = H;
    const px = plate.getContext('2d'), id = px.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const m = msk[i * 4] / 255, b = [0, 1, 2].map(c => -Math.log(clamp(ref[i * 4 + c] / RPAPER[c], .03, 1)));
      for (let k = 0; k < 3; k++) id.data[i * 4 + k] = clamp(inv[k][0] * b[0] + inv[k][1] * b[1] + inv[k][2] * b[2], 0, 1) * 255 * m;
      id.data[i * 4 + 3] = 255;
    }
    px.putImageData(id, 0, 0);
    const print = makeRiso(glc, W, H);
    draw = () => print(plate, { seed: 3, grain: 1, boil: .3, off: [[3, -2], [-2, 2], [1, 3]], rot: [.002, -.0015, .001] });
  } else if (STYLE === 'ukiyoe') {
    // —— 浮世绘：和纸、平涂色版（吃墨不匀、马连痕）、普鲁士蓝晕染天空、刻刀墨线 ——
    glc.style.display = 'none';
    UK.buildTextures();
    const PALC = Object.values(UK.PAL).map(toRGB);
    const near = c => PALC.reduce((b, p) => ((p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2 < (b[0] - c[0]) ** 2 + (b[1] - c[1]) ** 2 + (b[2] - c[2]) ** 2 ? p : b), PALC[0]);
    const blk = UK.mk(W, H), bx = blk.getContext('2d');
    V.regions.forEach(r => { const c = mix(r.c, near(r.c), .35); UK.fillPath(bx, r.polys[0], hexOf(c), true); });
    UK.inkify(blk, { speck: .45, grain: .35, baren: .25 });
    const ln = UK.mk(W, H), lx = ln.getContext('2d');
    outlines.forEach((p, i) => UK.carve(lx, p, 3.6, { closed: true, col: UK.PAL.sumi, seed: i + 1 }));
    lines.forEach((l, i) => UK.carve(lx, l, 2.3, { col: UK.PAL.sumi, seed: i + 3 }));
    UK.inkify(ln, { speck: .25 });
    draw = () => {
      g.drawImage(UK.TX.paper, 0, 0, W, H);
      UK.bokashi(g, 0, 0, W, H * .62, UK.PAL.prus, .92, 0, { rough: 30, seed: 3 });
      g.drawImage(blk, 0, 0); g.drawImage(ln, 0, 0);
      g.globalAlpha = .5; g.drawImage(UK.TX.fiber, 0, 0, W, H); g.globalAlpha = 1;
    };
  } else if (STYLE === 'crayon') {
    // —— 蜡笔：来回排线涂色（涂出边）、蜡只粘在纸牙上 ——
    c2.style.display = 'none';
    const comp = crayonComp(glc, W, H), Lf = CR.layer(), Ll = CR.layer();
    V.regions.forEach((r, i) => CR.fill(Lf, r.polys[0], { col: hexOf(boost(r.c, 1.1)), p: .82, ang: .62 + (R() - .5) * .7, gap: 8, w: 9, over: 4, seed: i + 1 }));
    outlines.forEach((p, i) => CR.line(Ll, p, { col: '#3a2a22', w: 6, p: .9, closed: true, seed: i + 2 }));
    lines.forEach((l, i) => CR.line(Ll, l, { col: '#4a3326', w: 3.4, p: .78, seed: i + 5 }));
    draw = () => { comp.begin([0.957, 0.937, 0.890]); comp.crayon(Lf.c, { gain: 1.15 }); comp.crayon(Ll.c, { gain: 1.1 }); comp.finish({ vig: .28 }); };
  } else if (STYLE === 'inkwash') {
    // —— 水墨浅绛：深色处泼墨晕开、笔线有飞白，饱和处薄施淡彩 ——
    c2.style.display = 'none';
    const L = layerSet(W, H), comp = inkComp(glc);
    V.regions.forEach(r => { if (satOf(r.c) > .22) { L.cc.globalAlpha = .4; L.cc.fillStyle = hexOf(boost(r.c, 1.1)); L.cc.fill(pathOf(r.polys)); } });
    L.cc.globalAlpha = 1;
    V.regions.forEach((r, i) => { const d = 1 - r.lum; if (d > .42) IK.mass(L.cw, r.polys[0], Math.min(.95, (d - .32) * 1.35), 3, i); });
    outlines.forEach((p, i) => IK.draw(L.ink, IK.mk([...p, p[0]].map(q => [q[0], q[1], 1]), { w: 7, tone: IK.TONE.nong, dry: .32, prof: 'even', seed: i + 3 }), 1));
    lines.forEach((l, i) => IK.draw(L.ink, IK.mk(l.map(q => [q[0], q[1], 1]), { w: 3.6, tone: IK.TONE.zhong, dry: .42, prof: 'brush', seed: i + 7 }), 1));
    draw = () => comp(L, null, { bleed: 5, rim: .8, warm: .5, vig: .2 });
  } else {
    // —— 赛璐璐：喷枪背景 + 平涂色块（硬边阴影 / 高光）+ 彩色描线 ——
    glc.style.display = 'none';
    draw = () => {
      g.filter = 'blur(14px) brightness(.5) saturate(1.3)'; g.drawImage(img, 0, 0, W, H); g.filter = 'none';
      V.regions.forEach(r => {
        const f = boost(r.c, 1.3), s = mix(f, [40, 20, 70], .38), l = mix(f, [30, 12, 18], .62), h = mix(f, [255, 248, 230], .4);
        CEL.cel(g, r.polys[0], { f: hexOf(f), s: hexOf(s), so: [6, 8], ...(r.lum > .55 ? { h: hexOf(h), ho: [-4, -5] } : {}), l: hexOf(l), lw: 1.1 });
      });
      outlines.forEach(p => CEL.line(g, p, '#3a1a18', 2.8, true));
      lines.forEach(l => CEL.line(g, l, '#4a2420', 1.5));
    };
  }
  window.render = () => draw();
  window.READY = true;
})();
