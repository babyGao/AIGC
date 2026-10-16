// 皮影 · K1：退到观众席看整台戏（诺兰式的尺度：整块幕布都看见了，人却很小）。
// 幕布底部一条刻花的地面条（草原）；一条靛青的水纹条从幕布右边一直流到方源脚下就断了（河头），左边只剩地；
// 右边毛里球像一座小山；左边北原一方；天上中洲群仙站在挑着的云头皮件上。人物一律侧身，铆钉、操纵杆都在。
import * as K from './carve.js';
import { makeGL } from './gl.js';
import { puppetFigure } from './figure.js';
import * as CARRY from '../shared/models/carry.js';
import * as MLQ from '../shared/models/maoliqiu.js';
import { sideStanding } from '../shared/models/crowd.js';
import { flatten, flattenLayers, mkXf } from '../shared/models/flatten.js';
import { placer } from '../shared/models/profile.js';
import { mulberry } from '/core/lib.js';
const R = {};
export const CLOTH = [150, 120, 1770, 880];     // 幕布 x0,y0,x1,y1（2.13:1，加上台框后近宽银幕）
const GY = 812;                                 // 地面条上沿
const path = P => q => { q.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) q.lineTo(P[i][0], P[i][1]); q.closePath(); };
function front(W, H) {   // 台框、柱子、观众头（前景层，不受灯透射）
  const [c, g] = K.canvas(W, H);
  const [x0, y0, x1, y1] = CLOTH;
  g.fillStyle = '#1d120b'; g.fillRect(0, 0, W, H);
  g.clearRect(x0, y0, x1 - x0, y1 - y0);
  // 漆木框：内沿一道暖色反光
  g.strokeStyle = '#6b3a1c'; g.lineWidth = 14; g.strokeRect(x0 - 7, y0 - 7, x1 - x0 + 14, y1 - y0 + 14);
  g.strokeStyle = 'rgba(232,170,96,.55)'; g.lineWidth = 2.5; g.strokeRect(x0 - 1.5, y0 - 1.5, x1 - x0 + 3, y1 - y0 + 3);
  g.fillStyle = '#2a170c'; g.fillRect(x0 - 60, y0 - 70, x1 - x0 + 120, 46);    // 门楣
  g.fillStyle = '#8a5a2a'; for (let x = x0 - 40; x < x1 + 40; x += 36) g.fillRect(x, y0 - 62, 18, 4);
  // 观众头（剪影，背光）
  const r = mulberry(3);
  for (let i = 0; i < 26; i++) { const x = r() * W, y = H - 30 - r() * 60, rx = 46 + r() * 20; g.fillStyle = '#0d0805'; g.beginPath(); g.ellipse(x, y, rx, rx * 1.15, 0, 0, 7); g.fill(); g.fillRect(x - rx * 1.6, y + rx * .6, rx * 3.2, 200); }
  return c;
}
export function render(cv, t, q, S) {
  const W = 1920, H = 1080, g = cv.getContext('2d');
  const [trc, tr] = K.canvas(W, H); tr.fillStyle = '#fff'; tr.fillRect(0, 0, W, H);
  const lay = (fn, seed) => { const [c, gg] = K.canvas(W, H); gg.lineJoin = 'round'; gg.lineCap = 'round'; fn(gg); K.hideTexture(c, gg, seed); tr.save(); tr.globalCompositeOperation = 'multiply'; tr.drawImage(c, 0, 0); tr.restore(); };
  const [x0, , x1, y1] = CLOTH;
  // 天上：中洲群仙的云头皮件（挑在杆上）
  const zz = [[1120, 330, 120], [1240, 300, 132], [1360, 320, 116]];
  const cloud = (cx, cy, w) => { const pts = []; for (let j = 0; j <= 30; j++) { const u = j / 30, a = u * Math.PI; pts.push([cx - w + 2 * w * u, cy - Math.abs(Math.sin(a * 3)) * w * .2 - Math.sin(a) * w * .1]); } pts.push([cx + w * .9, cy + w * .14], [cx - w * .9, cy + w * .14]); return pts; };
  lay(gg => { for (const [cx, cy, h] of zz) { const P = cloud(cx, cy + 6, h * .55); K.fill(gg, '#3d6d8a', path(P)); K.within(gg, path(P), () => { for (let j = 0; j < 3; j++) K.cloud(gg, cx - h * .3 + j * h * .3, cy, h * .09, 0, 1.4, j % 2 ? 1 : -1); }); K.ink(gg, 1.8, path(P)); } }, 41);
  // 地面条：草原（刻细缝当草）
  const top = []; for (let x = x0 - 10; x <= x1 + 10; x += 14) top.push([x, GY + 6 * Math.sin(x / 210) + 3 * Math.sin(x / 63)]);
  const groundP = top.concat([[x1 + 10, y1 + 10], [x0 - 10, y1 + 10]]);
  lay(gg => { K.fill(gg, '#a8742e', path(groundP)); K.within(gg, path(groundP), () => { const r = mulberry(5); for (let i = 0; i < 260; i++) { const x = x0 + r() * (x1 - x0), y = GY + 14 + r() * (y1 - GY - 14), h = 7 + r() * 9; K.cutTaper(gg, [[x, y], [x + (r() - .5) * 5, y - h]], 2.2); } K.strata(gg, x0, x1, x => GY + 46 + 4 * Math.sin(x / 90), 2, 22, 3); }); K.ink(gg, 2.2, q2 => { q2.moveTo(top[0][0], top[0][1]); for (const p of top) q2.lineTo(p[0], p[1]); }); }, 7);
  // 人物（侧身，铆钉）
  const fit = (M, at, H, from) => { const s = H / (M.box[3] - M.box[1]); return { xf: mkXf({ s, from, at }), s }; };
  const head = 760, ry0 = GY - 30, ry1 = GY + 26;
  { const M = MLQ.MLQ_SIDE, { xf, s } = fit(M, [1440, GY - 18], 300, [1750, 1300]); puppetFigure(tr, flatten(M, MLQ, xf), { scale: s * 2, seed: 9 }); }
  const side = (list) => list.forEach(([x, Hh, o]) => { const T = placer([x, GY + 8], Hh); puppetFigure(tr, flattenLayers({ layers: sideStanding(o, T) }, p => p), { scale: Hh / 400, seed: x }); });
  side([[1080, 150, { robe: 'robeD', hair: 'hair', style: 'bun', belt: 'gold' }], [1135, 146, { robe: 'robeD', hair: 'hair', style: 'bun' }]].map(([x, h, o]) => [x, h, o]));
  // 河：一条靛青水纹条，从幕布右边流到方源脚下断开（河头）。上游平：细横缝；下游起浪：波纹孔
  const riverP = [[head, ry0 + 22], [head + 30, ry0 + 6], [head + 120, ry0], [x1 + 10, ry0 - 8], [x1 + 10, ry1 + 6], [head + 120, ry1], [head + 30, ry1 - 4], [head, ry1 - 14]];
  lay(gg => { K.fill(gg, '#28507e', path(riverP)); K.within(gg, path(riverP), () => { for (let k = 0; k < 3; k++) K.cutLine(gg, 1.6, q2 => { q2.moveTo(head + 20, ry0 + 14 + k * 12); q2.lineTo(head + 520, ry0 + 12 + k * 12); }); K.waves(gg, head + 560, ry0 - 4, x1 + 10, ry1, 9, 1.6); }); K.ink(gg, 2, path(riverP)); }, 23);

  side([[300, 176, { robe: 'robeD', hair: 'hair', style: 'long', face: {} }], [360, 172, { robe: 'robeD', hair: 'hair', style: 'long', belt: 'gold', face: { female: 1 } }], [430, 196, { robe: 'robeD', hair: 'hairW', style: 'bun', fur: true, beard: true, sleeve: 'point', face: { age: .85, nose: 1.3 } }], [500, 168, { robe: 'robe', hair: 'hairW', style: 'long', face: { female: 1 } }]]);
  { const { xf, s } = fit(CARRY.FY_CARRY2, [head + 34, GY + 4], 236, [445, 955]); puppetFigure(tr, flatten(CARRY.FY_CARRY2, CARRY, xf), { scale: s * 2.2, seed: 3, rivets: [[head + 32, GY - 150]] }); }
  // 中洲群仙（站在云头上）
  const sky = zz.map(([x, y, h], i) => [x, y, h, [{ robe: 'robe', hair: 'hair', style: 'crown', belt: 'blue', face: { age: .3 } }, { robe: 'robe', hair: 'hair', style: 'crown', belt: 'blue', beard: true, face: { age: .4 } }, { robe: 'robe', hair: 'hair', style: 'bun', belt: 'blue' }][i]]);
  for (const [x, y, h, o] of sky) { const T = placer([x, y], h); puppetFigure(tr, flattenLayers({ layers: sideStanding(o, T) }, p => p), { scale: h / 400, seed: x }); }
  // 操纵杆：从幕布外伸进来的细杆（皮影的手）
  tr.save(); tr.globalCompositeOperation = 'multiply'; tr.strokeStyle = 'rgba(70,45,25,.5)'; tr.lineWidth = 2.2;
  for (const [ax, ay, bx, by] of [[head + 20, GY - 170, head + 120, y1 + 40], [1250, GY - 260, 1300, y1 + 40], [1240, 200, 1300, y1 + 40], [430, GY - 160, 470, y1 + 40]]) { tr.beginPath(); tr.moveTo(ax, ay); tr.lineTo(bx, by); tr.stroke(); }
  tr.restore();
  const fc = R.front || (R.front = front(W, H));
  const glc = R.glc || (R.glc = Object.assign(document.createElement('canvas'), { width: W, height: H }));
  const GL = R.GL || (R.GL = makeGL(glc));
  GL.render(trc, fc, { lamps: [[520, 420, .8, 1], [1000, 380, .75, 1], [1500, 420, .8, 1]], expo: 1.0, amb: .26, time: 1.3, bloom: .22, vign: .45, rect: CLOTH, sigB: 520 });
  g.drawImage(glc, 0, 0);
}
