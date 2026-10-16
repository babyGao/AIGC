// 60s 间谍片头 · 关键镜头的通用画法。四色纸：墨黑、骨白、河青、警示红。
// 集中线 = 一圈剪出来的长条纸楔（骨白/河青相间，像片头里的放射条纹）；音浪 = 红纸剪的锯齿圈；碎屑 = 骨白小纸片；
// 拟声字 = 粗黑体剪纸大字（红字 + 错版的墨黑影子）；人物 = 整张剪影，近景只留眉眼缝；字幕 = 左下一条斜贴的骨白纸条。上下墨黑遮幅。
import * as P from './paper.js';
import { spyFigure, PAL } from './figure.js';
import { mulberry } from '/core/lib.js';
const Y0 = 138;
const BG = { dark: 'ink', light: 'bone', red: 'red', teal: 'teal' };
function sfx(g, e, fg, sh) {
  g.save(); g.translate(e.x, e.y); g.rotate(e.rot || 0);
  g.font = `900 ${e.size}px NS`; g.textBaseline = 'alphabetic';
  // 错版：墨黑影子往右下偏一点，红字压在上面
  const o = e.size * .035; g.fillStyle = sh; g.fillText(e.text, o, o);
  g.lineJoin = 'round'; g.lineWidth = e.size * .02; g.strokeStyle = sh; g.strokeText(e.text, 0, 0);
  g.fillStyle = fg; g.fillText(e.text, 0, 0);
  g.restore();
}
function tri(P0, col) { P.piece(P0, col, { gap: 0, shadow: false }); }
export function render(cv, els, o) {
  const g = P.g;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const bg = els.find(e => e.t === 'bg') || {}, bgc = els.some(e => e.t === 'panel') ? PAL.ink : PAL[BG[bg.accent] || BG[bg.tone] || 'ink'];   // 分格的镜头：格缝是墨黑
  P.clear(bgc); P.S.bg = bgc;
  g.save(); g.beginPath(); g.rect(0, Y0, 1920, 804); g.clip(); g.translate(0, Y0);
  // 配色：底是墨黑时条纹用骨白/河青，底是红时用墨黑/骨白
  const onRed = bgc === PAL.red;
  const land = els.some(e => e.t === 'ground');   // 有骨白的地：条纹改成墨黑/河青，人物描一圈墨黑切缝
  const stripe = onRed ? [PAL.ink, PAL.ink, PAL.boneD] : land ? [PAL.ink, PAL.tealD, PAL.teal] : [PAL.bone, PAL.teal, PAL.teal];
  let stripeNow = stripe;   // 分格里换成配那一格纸色的条纹
  const drawEls = list => { for (const e of list) {
    if (e.t === 'panel') { drawPanel(e); continue; }
    if (e.t === 'focus' || e.t === 'speed') e.polys.forEach((Q, i) => tri(Q, e.on === 'pool' ? PAL.bone : stripeNow[i % stripeNow.length]));
    // 霸气：墨黑纸剪的火舌，警示红的闪电纸条
    if (e.t === 'aura') { e.polys.forEach(Q => P.piece(Q, PAL.ink, { gap: 0, shadow: false })); e.bolts.forEach(Ln => { g.save(); g.lineJoin = 'miter'; g.strokeStyle = PAL.ink; g.lineWidth = 14; g.beginPath(); Ln.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.strokeStyle = PAL.red === P.S.bg ? PAL.bone : PAL.red; g.lineWidth = 7; g.stroke(); g.restore(); }); }
    // 漫画符号：泪、汗 = 骨白小纸片描墨边；青筋 = 警示红纸条；抖动线 = 墨黑细条
    if (e.t === 'marks') {
      e.polys.forEach(Q => { g.save(); g.strokeStyle = PAL.ink; g.lineWidth = 4; g.beginPath(); P.pathPoly(g, Q); g.stroke(); g.restore(); P.piece(Q, PAL.bone, { gap: 0, shadow: false }); });
      e.lines.forEach(Ln => { g.save(); g.lineCap = 'round'; g.strokeStyle = P.S.bg === PAL.ink ? PAL.red : PAL.ink; g.lineWidth = 6; g.beginPath(); Ln.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.restore(); });
    }
    // 浅水：一张河青纸；深青细缝 = 平静；骨白细圈 = 涟漪；往前涨的水线是一条骨白浪沫纸边
    if (e.t === 'pool') {
      P.piece(e.poly, PAL.teal);
      g.save(); g.beginPath(); P.pathPoly(g, e.poly); g.clip();
      e.lines.forEach(Ln => { const d = Ln[0][1] / 804; g.fillStyle = PAL.tealD; g.fillRect(Ln[0][0], Ln[0][1], Ln[1][0] - Ln[0][0], 1.5 + d * 3.5); });
      e.ripples.forEach(Ln => { g.save(); g.strokeStyle = PAL.bone; g.lineWidth = 2.5; g.beginPath(); Ln.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.restore(); });
      g.restore();
      const n = e.front.length, A = [], B = []; e.front.forEach((p, k) => { const w = 4 + 10 * (1 - k / n); A.push([p[0] - w * .6, p[1] - w * .3]); B.push([p[0] + w * .6, p[1] + w * .3]); });
      P.piece(A.concat(B.reverse()), PAL.bone, { gap: 0 });
    }
    if (e.t === 'rings') e.lines.forEach((Ln, i) => {   // 锯齿圈剪成一条有宽度的纸带
      const n = Ln.length, w = e.w * 1.6, A = [], B = [];
      for (let k = 0; k < n; k++) { const a = Ln[Math.max(0, k - 1)], b = Ln[Math.min(n - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1; A.push([Ln[k][0] - dy / m * w / 2, Ln[k][1] + dx / m * w / 2]); B.push([Ln[k][0] + dy / m * w / 2, Ln[k][1] - dx / m * w / 2]); }
      P.piece(A.concat(B.reverse()), onRed ? PAL.bone : PAL.red, { gap: 0 });
    });
    if (e.t === 'debris') e.items.forEach((d, i) => P.piece(d.poly, i % 3 ? PAL.bone : (onRed ? PAL.ink : PAL.red), { gap: 0, shB: 2, shX: 1.5, shY: 2 }));
    // 水面：墨黑的水上几道河青细缝（平静），涟漪是河青细纸圈，光柱的倒影是一串骨白短条
    if (e.t === 'water') {
      g.fillStyle = PAL.tealD; g.fillRect(0, e.hz - 1.5, 1920, 3);
      e.lines.forEach(Ln => { const d = (Ln[0][1] - e.hz) / (804 - e.hz); g.fillStyle = PAL.tealD; g.fillRect(Ln[0][0], Ln[0][1], Ln[1][0] - Ln[0][0], 1.5 + d * 4); });
      e.ripples.forEach(Ln => { g.save(); g.strokeStyle = PAL.teal; g.lineWidth = 2.5; g.beginPath(); Ln.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.restore(); });
      if (e.reflect) { const [x, w] = e.reflect, r = mulberry(7); for (let y = e.hz + 150; y < 804; y += 12 + r() * 8) { const ww = w * (.4 + r() * .8) * (y - e.hz) / (804 - e.hz) + 20; P.piece(P.rectP(x - ww / 2 + (r() - .5) * 30, y, ww, 4 + r() * 3), PAL.teal, { gap: 0, shadow: false }); } }
    }
    if (e.t === 'cloud') { const [cx, cy] = e.at, w = e.w, cl = []; for (let j = 0; j <= 20; j++) { const u = j / 20; cl.push([cx - w / 2 + w * u, cy + 2 - Math.abs(Math.sin(u * Math.PI * 3)) * w * .1]); } cl.push([cx + w * .42, cy + w * .08], [cx - w * .42, cy + w * .08]); P.piece(cl, PAL.boneD); }
    // 草原：一整张骨白纸，远处一条深骨色带（同 K1）
    if (e.t === 'ground') { P.S.bg = PAL.bone; P.piece([[-10, e.hz], [1930, e.hz], [1930, 814], [-10, 814]], PAL.bone, { gap: 0, shadow: false }); P.piece([[-10, e.hz], [1930, e.hz], [1930, e.hz + 22], [-10, e.hz + 28]], PAL.boneD, { gap: 0, shadow: false }); }
    // 河：河青纸带；下游贴深青月牙 + 骨白浪尖
    if (e.t === 'river') {
      P.piece(e.river.fill, PAL.teal);
      g.save(); g.beginPath(); P.pathPoly(g, e.river.fill); g.clip();
      const hy = Math.min(...e.river.fill.map(p => p[1])), mid = hy + (804 - hy) * .4;
      for (let i = 0; i < 4; i++) { g.fillStyle = PAL.tealD; g.fillRect(960 + i * 30, hy + 14 + i * 16, 120 + i * 50, 2.2); }
      for (let row = 0; row < 7; row++) { const y = mid + row * row * 4 + row * 16, d = y / 804, A = 30 + d * 60; for (let xx = 900 + (row % 2) * A * .5; xx < 1700; xx += A * 1.1) { const cres = []; for (let j = 0; j <= 10; j++) { const u = j / 10; cres.push([xx + A * u, y - Math.sin(u * Math.PI) * A * .32]); } for (let j = 10; j >= 0; j--) { const u = j / 10; cres.push([xx + A * u + A * .08, y - Math.sin(u * Math.PI) * A * .2 + 3]); } P.piece(cres, row % 2 ? PAL.tealD : PAL.bone, { gap: 0, shadow: false }); } }
      g.restore();
    }
    // 天意的巨眼：骨白眼白，警示红的虹膜，墨黑瞳孔，一点骨白高光；睫毛是墨黑细条
    if (e.t === 'eye') {
      P.piece(e.lid, PAL.bone, { gap: 0 });
      g.save(); g.beginPath(); P.pathPoly(g, e.lid); g.clip();
      const [ix, iy, ir] = e.iris; P.piece(P.circP(ix, iy, ir, 48), PAL.red, { gap: 0, shadow: false });
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; tri([[ix + Math.cos(a) * ir * .5, iy + Math.sin(a) * ir * .5], [ix + Math.cos(a + .06) * ir * .95, iy + Math.sin(a + .06) * ir * .95], [ix + Math.cos(a - .06) * ir * .95, iy + Math.sin(a - .06) * ir * .95]], PAL.ink); }
      P.piece(P.circP(e.pupil[0], e.pupil[1], e.pupil[2], 32), PAL.ink, { gap: 0, shadow: false }); P.piece(P.circP(ix - ir * .35, iy - ir * .38, ir * .13, 16), PAL.bone, { gap: 0, shadow: false });
      g.restore();
      const band = (L, w) => { const n = L.length, A = [], B = []; for (let k = 0; k < n; k++) { const a = L[Math.max(0, k - 1)], b = L[Math.min(n - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1, ww = w * Math.sin(Math.PI * k / (n - 1)) ** .5 + 1; A.push([L[k][0] - dy / m * ww / 2, L[k][1] + dx / m * ww / 2]); B.push([L[k][0] + dy / m * ww / 2, L[k][1] - dx / m * ww / 2]); } return A.concat(B.reverse()); };
      P.piece(band(e.up, 16), PAL.teal, { gap: 0 });   // 上眼睑一条河青纸边（墨黑天上看得见）
    }
    // 光柱：一整条河青纸（爱情仙蛊的湛蓝在四色里落到河青），柱里贴骨白的细长条 = 往上冲的光
    if (e.t === 'beam') { P.piece(e.poly, PAL.teal, { gap: 0 }); e.streaks.forEach(Q => P.piece(Q, PAL.bone, { gap: 0, shadow: false })); }
    if (e.t === 'splash') { e.cols.forEach(Q => P.piece(Q, PAL.bone, { gap: 0, shB: 2 })); e.drops.forEach(([x, y, r]) => P.piece(P.ellP(x, y, r * .7, r, 12), PAL.bone, { gap: 0, shadow: false })); }
    if (e.t === 'fig' && e.lit) {   // 光里的人：墨黑剪影，只有白发是骨白
      P.S.bg = PAL.teal; P.silhouette(() => { for (const op of e.ops) if (op.poly) P.piece(op.poly, op.role === 'hairW' ? PAL.bone : PAL.ink); }, { outline: 0 });
    } else if (e.t === 'fig') { P.S.bg = bgc; spyFigure(e.ops, { key: o.id + e.key, closeup: e.s > .3, scale: e.s * 2, outline: e.s > .3 ? 5 : 2.4, outlineCol: land || P.S.bg === PAL.bone || P.S.bg === PAL.boneD ? PAL.ink : P.S.bg === PAL.ink && e.s > .3 ? PAL.tealD : undefined }); }
    if (e.t === 'sfx') sfx(g, e, onRed ? PAL.bone : PAL.red, PAL.ink);
  } };
  // 分格：每格一张不同颜色的纸（e.paper），格缝露出墨黑底；格里的东西裁进格
  function drawPanel(e) {
    const col = PAL[e.paper || 'bone'];
    P.piece(e.poly, col, { gap: 0 });
    g.save(); g.beginPath(); P.pathPoly(g, e.poly); g.clip(); const b0 = P.S.bg; P.S.bg = col; const s0 = stripeNow; stripeNow = col === PAL.red ? [PAL.ink, PAL.ink, PAL.boneD] : col === PAL.ink ? [PAL.bone, PAL.teal, PAL.teal] : [PAL.ink, PAL.tealD, PAL.teal];
    drawEls(e.els); stripeNow = s0; P.S.bg = b0; g.restore();
  }
  drawEls(els);
  g.restore();
  // 遮幅
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = PAL.ink; g.fillRect(0, 0, 1920, Y0); g.fillRect(0, Y0 + 804, 1920, 1080 - Y0 - 804);
  // 字幕：左下斜贴一条骨白纸条，黑体字；说话人是前面一小块红纸
  const cap = els.find(e => e.t === 'cap');
  if (cap) {
    g.save(); g.translate(96, Y0 + 804 + 6); g.rotate(-.025);
    g.font = '900 40px NS'; const tw = g.measureText(cap.text).width; g.font = '900 24px NS'; const ww = g.measureText(cap.who).width;
    if (cap.who) { P.piece([[0, -34], [ww + 34, -36], [ww + 32, 18], [-2, 20]], bgc === PAL.red ? PAL.ink : PAL.red, { gap: 0 });
      g.fillStyle = PAL.bone; g.textBaseline = 'alphabetic'; g.fillText(cap.who, 16, -1); } else g.translate(-ww - 40, 0);
    P.piece([[ww + 40, -54], [ww + 40 + tw + 52, -58], [ww + 40 + tw + 50, 22], [ww + 38, 26]], PAL.bone, { gap: 0 });
    g.font = '900 40px NS'; g.fillStyle = PAL.ink; g.fillText(cap.text, ww + 64, 2);
    g.restore();
  }
  P.paperFinish(1);
}
