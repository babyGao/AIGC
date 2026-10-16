// 水墨 · K1：宣纸上大片留白。地平线只是一道淡墨雾带；草原是近疏远密的淡墨点和几丛芦苇；
// 河是纸白，两岸各一道干笔，上游几笔极淡的横擦（平静），近处是宋画式的平行浪线（汹涌）。
// 人物写意；天上群仙踩着几笔云纹。上下是裱绫（宽银幕遮幅），右下一方朱印。
import * as I from './ink.js';
import { makeComp, layerSet } from './comp.js';
import { mountainLayer, ridgeFn, reed } from './land.js';
import { inkFigure } from './figure.js';
import { riverPath } from '../shared/scene.js';
import { mulberry } from '/core/lib.js';
const R = {};
const Y0 = 138, k = 1, P = p => [p[0], Y0 + p[1]];
export function render(cv, t, q, S) {
  const { K1, cast } = S, g = cv.getContext('2d');
  const L = R.L || (R.L = layerSet(1920, 1080)); L.clear(); I.reseed(11);
  const hz = P([0, K1.horizon])[1], bot = Y0 + 804;
  // 地平线雾带
  const far = R.far || (R.far = mountainLayer({ W: 1920, H: 1080, ridge: ridgeFn([[300, 6, 260], [1500, 9, 380]], hz, 3, 5), depth: 70, tone: .2, rim: .5, rimW: 10, mist: 1.1, seed: 5 }));
  L.cw.drawImage(far, 0, 0);
  // 草：淡墨点，远密近疏、远小近大
  const rg = mulberry(7);
  for (let i = 0; i < 520; i++) {
    const u = rg() ** 1.8, y = hz + 8 + (bot - hz - 8) * u, x = rg() * 1920, r = .8 + u * 5.5;
    I.blot(L.cd, x, y, r, .18 + rg() * .22, rg() * 3, .45, i);
  }
  for (let i = 0; i < 70; i++) {   // 短草笔（三两笔一簇）
    const u = .3 + .7 * rg(), y = hz + (bot - hz) * u, x = rg() * 1920, h = 6 + u * 26;
    for (let j = -1; j <= 1; j++) I.draw(L.ink, I.mk([[x + j * h * .2, y], [x + j * h * .35 + 2, y - h]], { w: 1 + u * 2.4, tone: I.TONE.dan, dry: .45, prof: 'tip', seed: i * 7 + j }));
  }
  // 河：纸白（先把河面擦干净），两岸干笔，水面横擦
  const rp = c => riverPath(c, K1.river, P, k);
  for (const c of [L.cw, L.cd]) { c.save(); c.globalAlpha = 1; c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; rp(c); c.fill('nonzero'); c.restore(); }
  K1.river.banks.forEach((b, i) => { const pts = b.map(P); for (let s0 = 0; s0 < pts.length - 4; s0 += 26) { const seg = pts.slice(s0, s0 + 30); const d = (seg[0][1] - hz) / (bot - hz); I.draw(L.ink, I.mk(seg, { w: 1.4 + d * 6, tone: I.TONE.dan + d * .2, dry: .55, rough: .3, seed: 300 + i * 40 + s0 })); } });
  for (const c of [L.cw, L.cd]) { c.save(); rp(c); c.clip('nonzero'); }
  const rw = mulberry(9), head = P([840, 381]), mid = P([0, 600])[1];
  for (let i = 0; i < 60; i++) {   // 平静处：极淡的横擦
    const y = head[1] + 6 + (mid - head[1]) * rw() ** 1.3, d = (y - hz) / (bot - hz), x = 700 + rw() * 900, l = 30 + d * 120;
    I.draw(L.ink, I.mk([[x, y], [x + l * .5, y + (rw() - .5) * 2], [x + l, y]], { w: .8 + d * 2, tone: I.TONE.qing, dry: .75, prof: 'tip', seed: 500 + i }));
  }
  for (let row = 0; row < 9; row++) {   // 近处：平行浪线（越近越大），每排几道弧
    const y = mid + 20 + row * row * 4.2 + row * 14, d = (y - hz) / (bot - hz), A = 26 + d * 70, H = 6 + d * 24;
    for (let x = 700 + (row % 2) * A * .5; x < 1800; x += A * 1.05) {
      const pts = []; for (let j = 0; j <= 8; j++) { const u = j / 8; pts.push([x + A * u, y - Math.sin(u * Math.PI) * H + (u > .65 ? (u - .65) * H * 2 : 0)]); }
      I.draw(L.ink, I.mk(pts, { w: 1.4 + d * 3.6, tone: I.TONE.zhong, dry: .3, rough: .2, prof: 'brush', seed: 700 + row * 50 + x }));
    }
  }
  for (const c of [L.cw, L.cd]) c.restore();
  // 人物
  const C = cast({ k, p: P });
  // 方源倒影：淡墨，几道横擦打断
  inkFigure(L, C.mlq.ops, { key: 'k1mlq', scale: C.mlq.s * 1.6 });
  C.changsheng.forEach((c, i) => inkFigure(L, c.ops, { key: 'k1cs' + i, scale: .25 }));
  C.beiyuan.forEach((c, i) => inkFigure(L, c.ops, { key: 'k1by' + i, scale: .25 }));
  // 中洲群仙：脚下几笔卷云
  const zz = K1.zhongzhou;
  zz.forEach((f, i) => { const [x, y] = P(f.at), w = f.H * .6; for (let j = 0; j < 3; j++) { const pts = []; for (let a = 0; a <= 1.7 * Math.PI; a += .25) pts.push([x - w * .6 + j * w * .55 + Math.cos(a) * w * .22 * (1 - a / 9), y + 4 + Math.sin(a) * w * .1]); I.draw(L.ink, I.mk(pts, { w: 1.6, tone: I.TONE.dan, dry: .4, seed: 900 + i * 10 + j })); } });
  C.zhongzhou.forEach((c, i) => inkFigure(L, c.ops, { key: 'k1zz' + i, scale: .28 }));
  inkFigure(L, C.fy.ops, { key: 'k1fy', scale: C.fy.s * 1.2 });
  // 裱绫（上下遮幅）与朱印
  const cc = L.cc;
  cc.fillStyle = '#4a4740'; cc.fillRect(0, 0, 1920, Y0); cc.fillRect(0, bot, 1920, 1080 - bot);
  cc.fillStyle = '#6a665c'; cc.fillRect(0, Y0 - 6, 1920, 3); cc.fillRect(0, bot + 3, 1920, 3);
  cc.fillStyle = '#b02e22'; const sx = 1790, sy = bot - 76; cc.fillRect(sx, sy, 50, 50);
  cc.fillStyle = 'rgba(242,236,222,1)'; cc.font = '30px MSZ'; cc.textAlign = 'center'; cc.textBaseline = 'middle'; cc.fillText('坚', sx + 25, sy + 26);
  const glc = R.glc || (R.glc = Object.assign(document.createElement('canvas'), { width: 1920, height: 1080 }));
  const comp = R.CP || (R.CP = makeComp(glc));
  comp(L, null, { bleed: 5, rim: .8 });
  g.drawImage(glc, 0, 0);
}
