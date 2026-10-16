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
  const [mask, m] = WC.canvas(1920, 1080), [plate] = WC.canvas(1920, 1080), PR = R.P || (R.P = WC.makePrinter(1920, 1080));
  m.fillStyle = '#fff'; m.fillRect(0, 0, 1920, 1080);
  const edge = plateEdge(); const edgePath = () => { m.beginPath(); edge.forEach((p, i) => i ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1])); m.closePath(); };
  const bg = els.find(e => e.t === 'bg');
  m.fillStyle = bg && bg.tone === 'light' ? '#fff' : '#000'; edgePath(); m.fill();
  m.save(); edgePath(); m.clip();
  m.setTransform(k, 0, 0, k, PLATE[0], PLATE[1]);
  for (const e of els) {
    if (e.t === 'focus' || e.t === 'speed') WC.drawStrokes(m, e.polys.map((P, i) => wedgeStroke(P, i)), { color: '#fff' });
    if (e.t === 'rings') e.lines.forEach((L, i) => WC.drawStrokes(m, WC.cutAlong(L, { w: e.w, kind: 'u', seg: [80, 260], gap: [6, 22], seed: 60 + i }), { color: '#fff' }));
    if (e.t === 'debris') for (const d of e.items) { m.fillStyle = '#000'; m.beginPath(); d.poly.forEach((p, i) => i ? m.lineTo(p[0], p[1]) : m.moveTo(p[0], p[1])); m.closePath(); m.lineWidth = 6; m.strokeStyle = '#000'; m.stroke(); m.fillStyle = '#fff'; m.fill(); WC.drawStrokes(m, [WC.mkStroke(d.trail, [d.s * .5, .5], { kind: 'v', seed: 3 })], { color: '#fff' }); }
    if (e.t === 'fig') carveFigure(m, e.ops, { key: o.id + e.key, scale: e.s * 1.6, halo: 8, minLine: 1 });
    if (e.t === 'sfx') sfx(m, e);
  }
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.restore();
  m.strokeStyle = '#000'; m.lineWidth = 10; m.lineJoin = 'round'; edgePath(); m.stroke();
  // 字幕：版面下方纸边上的铅字（黑）
  const cap = els.find(e => e.t === 'cap');
  if (cap) {
    const y = PLATE[1] + PLATE[3] + 92;
    m.fillStyle = '#000'; m.textBaseline = 'alphabetic'; m.textAlign = 'center';
    m.font = '46px WK'; m.fillText(cap.text, 960, y);
    m.font = '28px WK'; m.fillText(`— ${cap.who} —`, 960, y + 48);
  }
  g.drawImage(PR.render(mask, plate, { mode: 'print', seed: 5 }), 0, 0);
}
