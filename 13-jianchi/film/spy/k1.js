// 60s 间谍片头 · K1：四色剪纸。天是墨黑，草原是骨白，河是一条河青色的纸带，透视收成一点到方源脚下；
// 片名“逆流河”是剪出来的大字，立在地平线上当远景建筑（字即布景）。人物全是剪影，没有五官。上下墨黑遮幅。
import * as P from './paper.js';
import { spyFigure, PAL } from './figure.js';
import { mulberry } from '/core/lib.js';
const Y0 = 138, Q = p => [p[0], Y0 + p[1]];
export function render(cv, t, q, S) {
  const { K1, cast } = S, g = P.g;
  g.setTransform(1, 0, 0, 1, 0, 0);
  P.clear(PAL.ink);
  const hz = Q([0, K1.horizon])[1], bot = Y0 + 804;
  P.S.bg = PAL.ink;
  // 片名大字：骨白，立在地平线上
  g.save(); g.font = '900 150px NS'; g.textBaseline = 'alphabetic'; g.fillStyle = PAL.bone;
  const word = '逆流河'; let x = 120; for (const ch of word) { g.save(); g.translate(x, hz + 8); g.rotate((ch.charCodeAt(0) % 5 - 2) * .006); g.fillText(ch, 0, 0); g.restore(); x += 158; } g.restore();
  // 地：骨白（远处一条深一点的骨色带）
  P.piece(P.roughC('k1ground', () => [[-10, hz], [1930, hz], [1930, bot], [-10, bot]], 3, 1.6, 10), PAL.bone, { gap: 0, shadow: false });
  P.piece(P.roughC('k1far', () => [[-10, hz], [1930, hz], [1930, hz + 22], [-10, hz + 28]], 4, 1.2, 10), PAL.boneD, { gap: 0, shadow: false });
  P.S.bg = PAL.bone;
  // 河：河青纸带（两岸 + 河头合成一个多边形）
  const river = K1.river.poly.map(Q);
  P.piece(P.roughC('k1river', () => river, 5, 1.8, 10), PAL.teal);
  // 近处的浪：深青月牙 + 骨白浪尖
  g.save(); g.beginPath(); P.pathPoly(g, river); g.clip();
  const rw = mulberry(9);
  for (let row = 0; row < 7; row++) {
    const y = Q([0, 600])[1] + row * row * 5 + row * 18, d = (y - hz) / (bot - hz), A = 34 + d * 70;
    for (let xx = 700 + (row % 2) * A * .5; xx < 1800; xx += A * 1.1) {
      const cres = []; for (let j = 0; j <= 10; j++) { const u = j / 10; cres.push([xx + A * u, y - Math.sin(u * Math.PI) * A * .32]); } for (let j = 10; j >= 0; j--) { const u = j / 10; cres.push([xx + A * u + A * .08, y - Math.sin(u * Math.PI) * A * .2 + 3]); }
      P.piece(cres, row % 2 ? PAL.tealD : PAL.bone, { gap: 0, shadow: false });
    }
  }
  // 上游平静：两三道细长的深青切缝
  for (let i = 0; i < 6; i++) { const y = Q([0, 400 + i * 22])[1], x0 = 900 + i * 40; g.fillStyle = PAL.tealD; g.fillRect(x0, y, 140 + i * 40, 2.2); }
  g.restore();
  // 人物
  const C = cast({ k: 1, p: Q });
  P.S.bg = PAL.bone;
  spyFigure(C.mlq.ops, { key: 'k1mlq', scale: C.mlq.s });
  C.changsheng.forEach((c, i) => spyFigure(c.ops, { key: 'k1cs' + i }));
  C.beiyuan.forEach((c, i) => spyFigure(c.ops, { key: 'k1by' + i }));
  P.S.bg = PAL.ink;
  // 天上的云（深骨色纸片）+ 中洲群仙（骨白剪影）
  K1.zhongzhou.forEach((f, i) => { const [cx, cy] = Q(f.at), w = f.H * .62; const cl = []; for (let j = 0; j <= 20; j++) { const u = j / 20; cl.push([cx - w + 2 * w * u, cy + 2 - Math.abs(Math.sin(u * Math.PI * 3)) * w * .16]); } cl.push([cx + w * .8, cy + w * .16], [cx - w * .8, cy + w * .16]); P.piece(cl, PAL.boneD); });
  C.zhongzhou.forEach((c, i) => spyFigure(c.ops, { key: 'k1zz' + i }));
  P.S.bg = PAL.teal;
  spyFigure(C.fy.ops, { key: 'k1fy', scale: .3 });
  // 遮幅
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = PAL.ink; g.fillRect(0, 0, 1920, Y0); g.fillRect(0, bot, 1920, 1080 - bot);
  P.paperFinish(1);
}
