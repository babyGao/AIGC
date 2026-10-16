// 木刻 · 关键镜头的通用画法（元素见 shared/shots.js）。版面 2.39:1 在纸边里，字幕是版面下方纸边上的铅字。
// 集中线 = U 刀放射刀痕；音浪 = 一圈圈刻白的锯齿刀；拟声字刻在版上（白字黑边，字里留几道木纹）；碎屑 = 刻白的冰碴。
import * as WC from './engine/index.js';
import { carveFigure } from './figure.js';
import { PLATE, plateEdge } from './k1.js';
import { mulberry } from '/core/lib.js';
const R = {};
const k = PLATE[2] / 1920;
const wedgeStroke = (P, i, kind = 'u') => { const tip = P[0], m = [(P[1][0] + P[2][0]) / 2, (P[1][1] + P[2][1]) / 2], w = Math.hypot(P[1][0] - P[2][0], P[1][1] - P[2][1]), pts = [], ws = []; for (let j = 0; j <= 12; j++) { const u = j / 12; pts.push([m[0] + (tip[0] - m[0]) * u, m[1] + (tip[1] - m[1]) * u]); ws.push(Math.max(.6, w * (1 - u) ** 1.1)); } return WC.mkStroke(pts, ws, { kind, seed: i * 13 + 1, chip: .18 }); };
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
  let usedPlate = false;
  for (const e of els) {
    // 水面：地平线一道白刀，下面一排排横向的 V 刀（越近越粗），涟漪是细刀刻的扁圈，光柱倒影是一串色版短横
    if (e.t === 'water') {
      cutLine([[0, e.hz], [1920, e.hz]], 2.2, 70);
      e.lines.forEach((L, i) => { const d = (L[0][1] - e.hz) / (804 - e.hz); WC.drawStrokes(m, [WC.mkStroke(L, [1 + d * 5, 1 + d * 6, .6], { kind: 'v', seed: 80 + i })], { color: '#fff' }); });
      e.ripples.forEach((L, i) => cutLine(L, 1.6, 90 + i));
      if (e.reflect) { const [x, w] = e.reflect, r = mulberry(7); for (let y = e.hz + 150; y < 804; y += 9 + r() * 6) { const ww = w * (.4 + r() * .8) * (y - e.hz) / (804 - e.hz) + 20; m.fillStyle = '#fff'; m.fillRect(x - ww / 2 + (r() - .5) * 30, y, ww, 3 + r() * 3); pc.fillStyle = '#000'; pc.fillRect(x - ww / 2 + (r() - .5) * 30, y, ww, 3 + r() * 3); } usedPlate = true; }
    }
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
    if (e.t === 'focus' || e.t === 'speed') WC.drawStrokes(m, e.polys.map((P, i) => wedgeStroke(P, i)), { color: '#fff' });
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
  }
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
