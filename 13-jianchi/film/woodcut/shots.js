// 木刻 · 关键镜头的通用画法（元素见 shared/shots.js）。版面 2.39:1 在纸边里，字幕是版面下方纸边上的铅字。
// 集中线 = U 刀放射刀痕；音浪 = 一圈圈刻白的锯齿刀；拟声字刻在版上（白字黑边，字里留几道木纹）；碎屑 = 刻白的冰碴。
import * as WC from './engine/index.js';
import { carveFigure } from './figure.js';
import { PLATE, plateEdge } from './k1.js';
import { mulberry } from '/core/lib.js';
const R = {};
const k = PLATE[2] / 1920;
const wedgeStroke = (P, i, kind = 'u') => { const tip = P[0], m = [(P[1][0] + P[2][0]) / 2, (P[1][1] + P[2][1]) / 2], w = Math.hypot(P[1][0] - P[2][0], P[1][1] - P[2][1]), pts = [], ws = []; for (let j = 0; j <= 12; j++) { const u = j / 12; pts.push([m[0] + (tip[0] - m[0]) * u, m[1] + (tip[1] - m[1]) * u]); ws.push(Math.max(.6, w * (1 - u) ** 1.1)); } return WC.mkStroke(pts, ws, { kind, seed: i * 13 + 1, chip: .18 }); };
// 两点之间一刀：点要够密，刀的宽度按点给（两点的刀刻不出来）
const knife = (pts, ws, seed, kind = 'v') => { const out = [], wo = []; for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < 8; j++) { const u = j / 8; out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]); wo.push(ws[i] + (ws[i + 1] - ws[i]) * u); } out.push(pts[pts.length - 1]); wo.push(ws[ws.length - 1]); return WC.mkStroke(out, wo, { kind, seed }); };
function rows(x0, x1, y0, y1, o) {   // 透视排布的横刀（远密近疏），同 k1.js
  const r = mulberry(o.seed || 1), out = [];
  for (let i = 0; ; i++) {
    const y = y0 + o.d0 + o.a * i ** o.pow; if (y > y1) break;
    const depth = (y - y0) / (y1 - y0);
    out.push(...WC.cutAlong([[x0, y + (r() - .5) * 2], [(x0 + x1) / 2, y + (r() - .5) * 3], [x1, y + (r() - .5) * 2]], { w: o.w(depth), kind: o.kind || 'v', seg: o.seg(depth), gap: o.gap(depth), seed: i * 13 + (o.seed || 1) }));
  }
  return out;
}
function sfx(m, e) {
  const S = 1.0, W = Math.ceil(e.size * e.text.length * 1.1 + 80), H = Math.ceil(e.size * 1.4);
  const [c, g] = WC.canvas(W, H);
  g.font = `900 ${e.size}px NS`; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
  g.fillStyle = '#fff'; g.fillText(e.text, 40, e.size * 1.08);
  // 字里留几道斜木纹（刻字时没刻透的木头）
  g.globalCompositeOperation = 'source-atop'; g.strokeStyle = '#000'; const r = mulberry(e.size);
  for (let y = -W; y < W + H; y += e.size * .2) { g.lineWidth = 1.2 + r() * e.size * .006; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y - W * .35); g.stroke(); }
  m.save(); m.translate(e.x, e.y); m.rotate(e.rot || 0);
  // 黑边：字外一圈留木，把白字和白刀痕分开
  m.font = `900 ${e.size}px NS`; m.textBaseline = 'alphabetic'; m.lineJoin = 'round'; m.strokeStyle = '#000'; m.lineWidth = e.size * .07; m.strokeText(e.text, 0, 0);
  m.drawImage(c, -40, -e.size * 1.08);
  m.restore();
}
export function render(cv, els, o) {
  const g = cv.getContext('2d');
  const [mask, m] = WC.canvas(1920, 1080), [plate, pc] = WC.canvas(1920, 1080), PR = R.P || (R.P = WC.makePrinter(1920, 1080));
  m.fillStyle = '#fff'; m.fillRect(0, 0, 1920, 1080);
  const edge = plateEdge(); const edgePath = () => { m.beginPath(); edge.forEach((p, i) => i ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1])); m.closePath(); };
  const bg = els.find(e => e.t === 'bg');
  m.fillStyle = bg && bg.tone === 'light' ? '#fff' : '#000'; edgePath(); m.fill();
  m.save(); edgePath(); m.clip();
  m.setTransform(k, 0, 0, k, PLATE[0], PLATE[1]); pc.save(); pc.beginPath(); edge.forEach((p, i) => i ? pc.lineTo(p[0], p[1]) : pc.moveTo(p[0], p[1])); pc.closePath(); pc.clip(); pc.setTransform(k, 0, 0, k, PLATE[0], PLATE[1]);   // 色版也只在版面里
  const poly = (c, P) => { c.beginPath(); P.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
  const cutLine = (L, w, seed, kind = 'v') => WC.drawStrokes(m, WC.cutAlong(L, { w, kind, seg: [60, 220], gap: [4, 16], seed }), { color: '#fff' });
  let usedPlate = false, tone = bg && bg.tone === 'light' ? 'light' : 'dark';   // tone：当前格的底色（白格里的效果线刻成黑）
  const drawEls = list => { for (const e of list) {
    if (e.t === 'panel') { drawPanel(e); continue; }
    // 水面：地平线一道白刀，下面一排排横向的 V 刀（越近越粗），涟漪是细刀刻的扁圈，光柱倒影是一串色版短横
    if (e.t === 'water') {
      cutLine([[0, e.hz], [1920, e.hz]], 2.2, 70);
      e.lines.forEach((L, i) => { const d = (L[0][1] - e.hz) / (804 - e.hz); WC.drawStrokes(m, [WC.mkStroke(L, [1 + d * 5, 1 + d * 6, .6], { kind: 'v', seed: 80 + i })], { color: '#fff' }); });
      e.ripples.forEach((L, i) => cutLine(L, 1.6, 90 + i));
      if (e.reflect) { const [x, w] = e.reflect, r = mulberry(7); for (let y = e.hz + 150; y < 804; y += 9 + r() * 6) { const ww = w * (.4 + r() * .8) * (y - e.hz) / (804 - e.hz) + 20; m.fillStyle = '#fff'; m.fillRect(x - ww / 2 + (r() - .5) * 30, y, ww, 3 + r() * 3); pc.fillStyle = '#000'; pc.fillRect(x - ww / 2 + (r() - .5) * 30, y, ww, 3 + r() * 3); } usedPlate = true; }
    }
    // 天：横刀，越近地平线越亮（同 K1）
    if (e.t === 'sky') { WC.drawStrokes(m, WC.hatch(new WC.Region([[[0, 0], [1920, 0], [1920, e.hz], [0, e.hz]]], { res: 2 }), { dir: WC.dirAngle(0), tone: (x, y) => .12 + .6 * (y / e.hz) ** 2.2, sp: 6.5, kind: 'u', seg: [90, 300], gap: [4, 16], seed: 4, lo: .2, hi: .97 })); cutLine([[0, e.hz], [1920, e.hz]], 2.6, 9, 'k'); }
    // 草原：留黑，横刀远密近疏，夹几簇草
    if (e.t === 'ground') {
      WC.drawStrokes(m, rows(0, 1920, e.hz + 3, 804, { d0: 4, a: 2.6, pow: 1.6, w: d => .8 + d * 2.4, seg: d => [14 + d * 40, 40 + d * 90], gap: d => [60 + d * 120, 160 + d * 320], seed: 5 }));
      const rg = mulberry(21), grass = [];
      for (let i = 0; i < 200; i++) { const y = e.hz + 30 + (804 - e.hz - 40) * rg() ** .7, d = (y - e.hz) / (804 - e.hz), x = rg() * 1920, h = 4 + d * 24; for (let j = -1; j <= 1; j++) grass.push(WC.mkStroke([[x + j * h * .25, y], [x + j * h * .4, y - h]], [d * 2.6 + .8, .4], { kind: 'v', seed: i * 3 + j })); }
      WC.drawStrokes(m, grass);
    }
    // 河：刻成白；河头平静（细长留黑水纹），往下游起浪（成排的弧形浪头）
    if (e.t === 'river') {
      const R0 = e.river, rp = () => poly(m, R0.fill), head = R0.fill[Math.floor(R0.fill.length / 2)], hy = Math.min(...R0.fill.map(p => p[1]));
      m.fillStyle = '#fff'; rp(); m.fill();
      m.save(); rp(); m.clip();
      WC.drawStrokes(m, rows(0, 1920, hy + 2, 804, { d0: 3, a: 2.2, pow: 1.4, w: d => .8 + d * 2.2, seg: d => [40 + d * 120, 120 + d * 240], gap: d => [30 + d * 60, 90 + d * 140], seed: 31 }), { color: '#000' });
      const rw = mulberry(41), waves = [], y0 = hy + (804 - hy) * .35;
      for (let i = 0; i < 120; i++) { const y = y0 + (804 - y0) * rw() ** .8, d = (y - y0) / (804 - y0), x = 900 + rw() * 800, L = 30 + d * 90, h = 6 + d * 22, arc = []; for (let j = 0; j <= 10; j++) { const u = j / 10; arc.push([x - L / 2 + L * u, y - Math.sin(u * Math.PI) * h + (u > .7 ? (u - .7) * h * 1.6 : 0)]); } waves.push(WC.mkStroke(arc, arc.map((_, j) => (1.2 + d * 4.5) * Math.sin(Math.PI * (j / 10)) + .4), { kind: 'u', seed: i })); }
      WC.drawStrokes(m, waves, { color: '#000' });
      m.restore();
      R0.banks.forEach((b, i) => cutLine(b, 1.8, 51 + i, 'k'));
    }
    // 天意的巨眼：眼白刻空，虹膜留黑带一圈放射白刀，瞳孔全黑带一点高光；上眼睑一道粗黑，睫毛是白刀
    if (e.t === 'eye') {
      m.fillStyle = '#fff'; poly(m, e.lid); m.fill();
      m.save(); poly(m, e.lid); m.clip();
      const [ix, iy, ir] = e.iris; m.fillStyle = '#000'; m.beginPath(); m.arc(ix, iy, ir, 0, 7); m.fill();
      const rays = []; for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2, r0 = e.pupil[2] * 1.25, r1 = ir * (.86 + (i % 3) * .04); rays.push(knife([[ix + Math.cos(a) * r0, iy + Math.sin(a) * r0], [ix + Math.cos(a) * (r0 + r1) / 2, iy + Math.sin(a) * (r0 + r1) / 2], [ix + Math.cos(a) * r1, iy + Math.sin(a) * r1]], [1, 4.2, 1], 200 + i)); }
      WC.drawStrokes(m, rays, { color: '#fff' });
      m.fillStyle = '#000'; m.beginPath(); m.arc(e.pupil[0], e.pupil[1], e.pupil[2], 0, 7); m.fill();
      m.fillStyle = '#fff'; m.beginPath(); m.arc(ix - ir * .35, iy - ir * .38, ir * .12, 0, 7); m.fill();
      m.restore();
      m.strokeStyle = '#000'; m.lineWidth = 14; m.lineCap = 'round'; m.beginPath(); e.up.forEach((p, i) => i ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1])); m.stroke();
      m.lineWidth = 5; m.beginPath(); e.low.forEach((p, i) => i ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1])); m.stroke();
      WC.drawStrokes(m, e.lashes.map((L, i) => knife(L, [5, 3, .6], 220 + i)), { color: '#fff' });
      // 下睫毛（白刀，朝下）+ 眼外一圈放射的白刀 = 天意的目光
      const lo = []; for (let i = 4; i < e.low.length - 3; i += 3) { const p = e.low[i], a = Math.PI / 2 + (i / e.low.length - .5) * 1.4, L = 18 + (i % 2) * 8; lo.push(knife([p, [p[0] + Math.cos(a) * L, p[1] + Math.sin(a) * L]], [3.5, .6], 240 + i)); }
      WC.drawStrokes(m, lo, { color: '#fff' });
    }
    // 霸气：黑焰舌在白格里留黑（描一圈白边跟人分开），黑闪电是粗黑折线
    if (e.t === 'aura') { const fg = tone === 'light' ? '#000' : '#fff';
      e.polys.forEach(Pp => { m.fillStyle = fg; poly(m, Pp); m.fill(); });
      e.bolts.forEach(Ln => { m.lineJoin = 'miter'; m.strokeStyle = fg; m.lineWidth = 9; m.beginPath(); Ln.forEach((p, k) => k ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1])); m.stroke(); }); }
    // 漫画符号：跟格底相反的颜色（黑格里刻白、白格里留黑），描一圈反色边
    if (e.t === 'marks') { const fg = tone === 'light' ? '#000' : '#fff', bgc = tone === 'light' ? '#fff' : '#000';
      e.polys.forEach(P => { m.fillStyle = '#fff'; m.strokeStyle = '#000'; m.lineWidth = 6.5; poly(m, P); m.fill(); m.stroke(); });   // 泪、汗：白水珠描黑边（漫画的画法）
      e.lines.forEach((Ln, i) => { m.lineCap = 'round'; m.strokeStyle = bgc; m.lineWidth = 9; m.beginPath(); Ln.forEach((p, k) => k ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1])); m.stroke(); m.strokeStyle = fg; m.lineWidth = 4.5; m.stroke(); }); }
    // 云头：刻白的一朵卷云，底下两道墨线
    if (e.t === 'cloud') { const [cx, cy] = e.at, w = e.w, P = []; for (let j = 0; j <= 36; j++) { const u = j / 36; P.push([cx - w / 2 + w * u, cy - Math.abs(Math.sin(u * Math.PI * 3.5)) * w * .1 - Math.sin(u * Math.PI) * w * .06]); } P.push([cx + w * .42, cy + w * .08], [cx - w * .42, cy + w * .08]); m.fillStyle = '#fff'; poly(m, P); m.fill(); m.strokeStyle = '#000'; m.lineWidth = 2.5; for (let j = 0; j < 2; j++) { m.beginPath(); m.moveTo(cx - w * .3 + j * 20, cy + w * .02 + j * 7); m.quadraticCurveTo(cx, cy - 6 + j * 7, cx + w * .3 - j * 20, cy + w * .02 + j * 7); m.stroke(); } }
    // 光柱：版上刻空，印湛蓝色版（全片木刻唯一的颜色）；柱里的速度线留纸白（色版上挖掉），柱沿一道黑边
    if (e.t === 'beam') {
      m.fillStyle = '#fff'; poly(m, e.poly); m.fill();
      pc.fillStyle = '#000'; poly(pc, e.poly); pc.fill();
      pc.save(); pc.globalCompositeOperation = 'destination-out'; e.streaks.forEach(P => { poly(pc, P); pc.fill(); }); pc.restore();
      m.strokeStyle = '#000'; m.lineWidth = 7; m.lineJoin = 'round'; poly(m, e.poly); m.stroke();
      usedPlate = true;
    }
    if (e.t === 'splash') { e.cols.forEach(P => { m.fillStyle = '#fff'; poly(m, P); m.fill(); m.strokeStyle = '#000'; m.lineWidth = 3; m.stroke(); }); for (const [x, y, r] of e.drops) { m.fillStyle = '#fff'; m.beginPath(); m.ellipse(x, y, r * .7, r, 0, 0, 7); m.fill(); } }
    if (e.t === 'focus' || e.t === 'speed') WC.drawStrokes(m, e.polys.map((P, i) => wedgeStroke(P, i)), { color: e.on === 'pool' || tone === 'light' ? '#000' : '#fff' });
    // 浅水：刻成白（反着天光），水面横向细长留黑，涟漪是留黑的扁圈，往前涨的水线是一道粗黑边 + 白色浪沫点
    if (e.t === 'pool') {
      m.fillStyle = '#fff'; poly(m, e.poly); m.fill();
      m.save(); poly(m, e.poly); m.clip();
      e.lines.forEach((Ln, i) => { const d = (Ln[0][1] - 236) / 568; WC.drawStrokes(m, [knife(Ln, [.6, 1 + d * 3.5], 300 + i, 'k')], { color: '#000' }); });
      e.ripples.forEach((Ln, i) => WC.drawStrokes(m, WC.cutAlong(Ln, { w: 2.2, kind: 'k', seg: [40, 160], gap: [4, 14], seed: 320 + i }), { color: '#000' }));
      m.restore();
      WC.drawStrokes(m, [knife(e.front, e.front.map((_, i) => 2 + 7 * (1 - i / e.front.length)), 330, 'k')], { color: '#000' });
      const r = mulberry(33); for (let i = 0; i < 40; i++) { const k0 = Math.floor(r() * (e.front.length - 1)), u = r(), a = e.front[k0], b = e.front[k0 + 1], x = a[0] + (b[0] - a[0]) * u - 6 - r() * 18, y = a[1] + (b[1] - a[1]) * u; m.fillStyle = '#fff'; m.beginPath(); m.ellipse(x, y, 2 + r() * 4, 1.5 + r() * 2.5, 0, 0, 7); m.fill(); }
    }
    if (e.t === 'rings') e.lines.forEach((L, i) => WC.drawStrokes(m, WC.cutAlong(L, { w: e.w, kind: 'u', seg: [80, 260], gap: [6, 22], seed: 60 + i }), { color: '#fff' }));
    if (e.t === 'debris') for (const d of e.items) { m.fillStyle = '#000'; m.beginPath(); d.poly.forEach((p, i) => i ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1])); m.closePath(); m.lineWidth = 6; m.strokeStyle = '#000'; m.stroke(); m.fillStyle = '#fff'; m.fill(); WC.drawStrokes(m, [WC.mkStroke(d.trail, [d.s * .5, .5], { kind: 'v', seed: 3 })], { color: '#fff' }); }
    if (e.t === 'fig') {
      if (e.lit) {   // 光里的人：逆光剪影留黑，只有白发刻白
        carveFigure(m, e.ops, { silhouette: true });
        for (const op of e.ops) if (op.role === 'hairW') { m.fillStyle = '#fff'; poly(m, op.poly); m.fill(); pc.save(); pc.globalCompositeOperation = 'destination-out'; poly(pc, op.poly); pc.fill(); pc.restore(); }   // 白发是纸白，不压色版
      } else if (e.s < .12) {   // 远处的小人：黑剪影描一圈白边（白衣刻成白团会看成钟）
        m.save(); m.strokeStyle = '#fff'; m.lineWidth = 5; m.lineJoin = 'round'; for (const op of e.ops) if (op.poly) { poly(m, op.poly); m.stroke(); } m.restore();
        carveFigure(m, e.ops, { silhouette: true });
      } else carveFigure(m, e.ops, { key: o.id + e.key, scale: e.s * 1.6, halo: e.s >= .7 ? 8 : e.s > .3 ? 5 : 3, minLine: e.s >= .7 ? 1 : .15, lineMin: e.s >= .7 ? .9 : 1.9 });   // 特写省掉碎线；中远景的五官、发丝要留，而且刻粗一点
    }
    if (e.t === 'sfx') sfx(m, e);
  } };
  // 分格：格里按自己的底色（黑版 / 刻空的白）画；格与格之间是刻空的白缝，格边一道黑框
  function drawPanel(e) {
    m.save(); poly(m, e.poly); m.clip(); m.fillStyle = e.tone === 'light' ? '#fff' : '#000'; poly(m, e.poly); m.fill();
    const t0 = tone; tone = e.tone || 'dark'; drawEls(e.els); tone = t0; m.restore();
    m.strokeStyle = '#000'; m.lineWidth = 7; m.lineJoin = 'miter'; poly(m, e.poly); m.stroke();
  }
  drawEls(els);
  m.setTransform(1, 0, 0, 1, 0, 0); pc.restore();
  m.restore();
  m.strokeStyle = '#000'; m.lineWidth = 10; m.lineJoin = 'round'; edgePath(); m.stroke();
  // 字幕：版面下方纸边上的铅字（黑）
  const cap = els.find(e => e.t === 'cap');
  if (cap) {
    const y = PLATE[1] + PLATE[3] + 92;
    m.fillStyle = '#000'; m.textBaseline = 'alphabetic'; m.textAlign = 'center';
    m.font = '46px WK'; m.fillText(cap.text, 960, y);
    if (cap.who) { m.font = '28px WK'; m.fillText(`— ${cap.who} —`, 960, y + 48); }
  }
  g.drawImage(PR.render(mask, usedPlate ? plate : null, { mode: 'print', seed: 5, plate: '#1f64ad' }), 0, 0);
}
