// Clawd（Claude 的小宠物）的水墨写意版：一团朱砂没骨块面 + 两点焦墨竖眼 + 两侧小短手 + 四条小短腿。
// 造型来自 Claude Code 终端里那只方块小兽（18×10 方格：身体 12×8，手 2×2，腿 1×2，竖眼 1×2），这里用笔墨重画。
// 全片唯一的颜色（除印章外），全部画在 col 颜色层。
// 局部坐标：一格 = 1，脚底中点为原点，y 向下；身体 x∈[-6,6] y∈[-10,-2]。
import { mk, draw } from '../engine/ink.js';
import { clamp, lerp, vnoise, mulberry } from '/core/lib.js';

export const CLAWD = [200, 92, 60];        // 朱砂偏赭（Claude 的陶土橙在宣纸上压暗一点）
export const CLAWD_D = [160, 58, 38];      // 含墨的一侧
export const VERM = [176, 46, 34];         // 印泥朱红
const EYE = [22, 19, 16];

function cfill(c, poly, rgb, a, jit, seed, grad) {
  if (a <= .003) return;
  const pts = [], N = poly.length;
  for (let i = 0; i < N; i++) {
    const p = poly[i], q = poly[(i + 1) % N], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const k = Math.max(1, Math.min(14, Math.round(L / Math.max(1, jit * 2.2))));
    const nx = -(q[1] - p[1]) / (L || 1), ny = (q[0] - p[0]) / (L || 1);
    for (let j = 0; j < k; j++) { const u = j / k, d = (vnoise(seed * 3.1 + i * 5.3 + u * k * .8) - .5) * jit * 2; pts.push([lerp(p[0], q[0], u) + nx * d, lerp(p[1], q[1], u) + ny * d]); }
  }
  if (grad) { const g = c.createLinearGradient(grad[0], grad[1], grad[2], grad[3]); g.addColorStop(0, `rgba(${grad[4].join(',')},${clamp(a)})`); g.addColorStop(1, `rgba(${rgb.join(',')},${clamp(a)})`); c.fillStyle = g; }
  else c.fillStyle = `rgba(${rgb.join(',')},${clamp(a)})`;
  c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill();
}

// o: {x, y, s(一格的像素), dir(1 面右/-1 面左，只影响眼神默认方向), eyes:'n'|'l'|'r'|'u'|'d'|'blink'|'happy'|'wide'|'shut',
//     arms:'down'|'up'|'wave'|'hold'|'tuck'|'reach', legs:'stand'|'walkA'|'walkB'|'tuck'|'sit', sq(压扁>0/拉长<0), rot, am, seed, t, look:[dx,dy], breath}
export function clawd(L, o = {}) {
  const c = L.col || L.cc || L.ink?.col; if (!c) return;
  const am = o.am ?? 1; if (am <= 0) return;
  const s = o.s ?? 6, sq = o.sq ?? 0, seed = o.seed ?? 3, t = o.t ?? 0;
  const sx = s * (1 + sq * .7), sy = s * (1 - sq);
  c.save();
  c.translate(o.x ?? 0, o.y ?? 0); if (o.rot) c.rotate(o.rot); c.scale(sx, sy);
  const breath = (o.breath ?? 1) * Math.sin(t * 2.4) * .12;
  const top = -10 - breath;
  const ink = { col: c };
  const pw = 1 / s;   // 一像素在局部坐标里
  // 腿（先画，被身体压住一点）
  const legs = o.legs || 'stand';
  const LH = { stand: [2, 2, 2, 2], walkA: [2, 1.2, 2, 1.2], walkB: [1.2, 2, 1.2, 2], tuck: [1, 1, 1, 1], sit: [0, 0, 0, 0] }[legs] || [2, 2, 2, 2];
  [-4.5, -2.5, 2.5, 4.5].forEach((lx, i) => {
    const h = LH[i]; if (h <= 0) return;
    draw(ink, mk([[lx, -2.6], [lx + .05, -2.6 + h * .5], [lx, -2.6 + h + .55]], { w: 1.05, color: CLAWD_D, tone: .95 * am, dry: .25, prof: 'even', rough: .1, nb: 5, seed: seed * 50 + i, ds: .2 }));
  });
  // 身体：一团朱砂（左上浅、右下深），边缘微微抖动
  const bodyY0 = top + (legs === 'sit' ? 1.2 : 0), bodyY1 = legs === 'sit' ? -.4 : -2;
  const R = .9;
  const poly = [[-6 + R, bodyY0], [6 - R, bodyY0], [6, bodyY0 + R], [6, bodyY1 - R], [6 - R, bodyY1], [-6 + R, bodyY1], [-6, bodyY1 - R], [-6, bodyY0 + R]];
  cfill(c, poly, CLAWD, .93 * am, .22, seed, [-6, bodyY0, 5, bodyY1, [214, 116, 80]]);
  // 颜料在边缘积聚：沿轮廓一圈略深的细线；身体中间一块水渍（略浅）
  c.strokeStyle = `rgba(${CLAWD_D.join(',')},${clamp(.32 * am)})`; c.lineWidth = .42; c.lineJoin = 'round';
  c.beginPath(); poly.forEach((p, i) => { const j = (vnoise(seed + i * 2.3) - .5) * .25; i ? c.lineTo(p[0] + j, p[1] - j) : c.moveTo(p[0] + j, p[1] - j); }); c.closePath(); c.stroke();
  const gl = c.createRadialGradient(-1.5, bodyY0 + 3.2, .2, -1.5, bodyY0 + 3.2, 4.2);
  gl.addColorStop(0, `rgba(232,150,112,${clamp(.38 * am)})`); gl.addColorStop(1, 'rgba(232,150,112,0)');
  c.fillStyle = gl; c.fillRect(-6, bodyY0, 12, bodyY1 - bodyY0);
  // 含墨的下沿与右沿：一笔侧锋（浓边在下）
  draw(ink, mk([[-5.6, bodyY1 - .55], [0, bodyY1 - .4], [5.6, bodyY1 - .6]], { w: 1.25, color: CLAWD_D, tone: .55 * am, dry: .45, prof: 'even', nb: 8, seed: seed * 7 + 1, ds: .2 }));
  draw(ink, mk([[5.55, bodyY0 + .8], [5.6, (bodyY0 + bodyY1) / 2], [5.5, bodyY1 - .8]], { w: .9, color: CLAWD_D, tone: .4 * am, dry: .55, prof: 'tip', nb: 6, seed: seed * 7 + 2, ds: .2 }));
  // 一笔飞白横扫（笔意）
  draw(ink, mk([[-5.4, bodyY0 + 1.1], [0, bodyY0 + .8], [5.2, bodyY0 + 1.3]], { w: 1.6, color: [226, 140, 100], tone: .5 * am, dry: .8, prof: 'brush', nb: 10, seed: seed * 7 + 3, ds: .2 }));
  // 手
  const arms = o.arms || 'down', ay = bodyY0 + 5.6 - (legs === 'sit' ? .6 : 0);
  const armStroke = (pts, k) => draw(ink, mk(pts, { w: 1.9, color: CLAWD, tone: .92 * am, dry: .25, prof: 'even', rough: .08, nb: 7, seed: seed * 20 + k, ds: .2 }));
  const wv = Math.sin(t * 9) * .9;
  if (arms === 'down') { armStroke([[-6.2, ay], [-7.9, ay + .1]], 1); armStroke([[6.2, ay], [7.9, ay + .1]], 2); }
  else if (arms === 'up') { armStroke([[-7, ay - .6], [-7.1, ay - 3], [-7, ay - 4.6]], 1); armStroke([[7, ay - .6], [7.1, ay - 3], [7, ay - 4.6]], 2); }
  else if (arms === 'wave') { armStroke([[-6.2, ay], [-7.9, ay + .1]], 1); armStroke([[6.6, ay - .8], [7.5 + wv * .4, ay - 3.4], [7.3 + wv, ay - 5.4]], 2); }
  else if (arms === 'hold') { armStroke([[-6.2, ay - .4], [-6.6, ay - 1.8], [-5.2, ay - 2.6]], 1); armStroke([[6.2, ay - .4], [6.6, ay - 1.8], [5.2, ay - 2.6]], 2); }
  else if (arms === 'reach') { const d = o.dir ?? 1; armStroke([[6.2 * d, ay - .4], [8.5 * d, ay - 1.6], [10 * d, ay - 2.6]], 2); armStroke([[-6.2 * d, ay], [-7.9 * d, ay + .1]], 1); }
  // 眼睛：两点焦墨竖眼
  const eyes = o.eyes || 'n', lk = o.look || [0, 0];
  const ex = { n: 0, l: -.9, r: .9, u: 0, d: 0 }[eyes] ?? 0, ey = { u: -.9, d: .8 }[eyes] ?? 0;
  const eyeC = [[-3.5 + ex + lk[0], bodyY0 + 3 + ey + lk[1]], [3.5 + ex + lk[0], bodyY0 + 3 + ey + lk[1]]];
  c.fillStyle = `rgba(${EYE.join(',')},${clamp(.95 * am)})`;
  for (const [ex0, ey0] of eyeC) {
    if (eyes === 'blink' || eyes === 'shut') { c.fillRect(ex0 - .7, ey0 + .55, 1.4, .38); continue; }
    if (eyes === 'happy') { draw(ink, mk([[ex0 - .8, ey0 + .7], [ex0, ey0 - .3], [ex0 + .8, ey0 + .7]], { w: .45, color: EYE, tone: .95 * am, dry: .1, prof: 'even', nb: 4, seed: seed + 9, ds: .1 })); continue; }
    const h = eyes === 'wide' ? 2.6 : 2;
    c.beginPath(); const w2 = .52, hh = h / 2;
    c.moveTo(ex0 - w2, ey0 - hh + .25); c.quadraticCurveTo(ex0, ey0 - hh - .12, ex0 + w2, ey0 - hh + .25);
    c.lineTo(ex0 + w2 * .9, ey0 + hh - .2); c.quadraticCurveTo(ex0, ey0 + hh + .15, ex0 - w2 * .9, ey0 + hh - .2); c.closePath(); c.fill();
  }
  c.restore();
}

// 世界里的 Clawd 高度（像素）≈ 12 格 × s
export const clawdH = s => 12 * s;
