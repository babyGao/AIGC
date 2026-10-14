// 伍 成丸：一笔一丸，散落在一面圆竹匾上（不排队）；一笔油扫过，逐颗由哑转亮——细孔填平，乌亮如漆
import { mk, draw as ink, blot, mass, arc, wash, local, lift, liftPoly, pill, Paint, tint, PIG } from '../engine/kit.js';
import { column, KAI } from '../engine/text.js';
import { T } from '../story.js';
import { clamp, lerp, eo, ss, seg, mulberry } from '/core/lib.js';

export const CAM = { x: 0, y: 96, z: 1.1 };
const C = [0, 196], RX = 716, RY = 214;
// 丸的位置：手摆的，疏密不匀，有两颗挨着
export const PILLS = [[-486, 150], [-560, 262], [-352, 248], [-262, 118], [-128, 226], [-30, 98], [74, 262], [150, 142], [258, 246], [352, 104], [478, 196], [-420, 60]]
  .map(([x, y], i) => ({ x, y, r: 55 + (y - 60) * .05, i })).sort((a, b) => a.x - b.x);
const tray = new Paint();
{
  const t0 = T.pills.in;
  tray.f((L, p) => { wash(L.wet, C[0], C[1], RX - 12, RY - 8, .06 * p, 3); wash(L.wet, C[0] + 10, C[1] + RY + 34, RX * .96, 22, .13 * p, 4); tint(L.col, C[0], C[1], RX, RY, PIG.ochre, .15 * p, 0, .25); }, t0, .4);
  tray.s(arc(C[0], C[1], RX, RY, Math.PI + .1, 6.18, 40), { w: 6, tone: .72, dry: .5, wet: .3, prof: 'even', seed: 11 }, t0, .3);
  tray.s(arc(C[0], C[1], RX, RY, -.1, Math.PI + .1, 44), { w: 16, tone: .93, darkDir: [0, 1], side: .75, brWet: true, body: .5, dry: .4, wet: .6, prof: 'even', seed: 12 }, t0 + .12, .4);
  tray.s(arc(C[0], C[1] + 30, RX, RY, .1, Math.PI - .1, 40), { w: 6, tone: .8, dry: .45, wet: .3, prof: 'even', seed: 13 }, t0 + .25, .3);
  tray.s(arc(C[0], C[1], RX - 34, RY - 22, .2, 6.1, 60), { w: 2.6, tone: .5, dry: .55, prof: 'even', seed: 14 }, t0 + .3, .3);
  const R = mulberry(5);                                                  // 竹篾的编纹：几段短而淡的枯笔
  for (let i = 0; i < 26; i++) {
    const a = R() * 6.2832, d = Math.sqrt(R()) * .8, x = C[0] + Math.cos(a) * d * RX, y = C[1] + Math.sin(a) * d * RY, len = 60 + R() * 90, s = i % 2 ? 1 : -1;
    tray.s([[x - len / 2, y - s * len * .12], [x + len / 2, y + s * len * .12]], { w: 9, tone: .16, dry: .86, wet: .1, prof: 'lens', seed: 40 + i }, t0 + .3 + i * .01, .12);
  }
}
// 油笔扫过的那一道（淡而湿，蛇行着照顾到每一颗）
const glaze = mk([[-700, 170], [-520, 210], [-340, 170], [-170, 190], [0, 160], [170, 200], [330, 160], [500, 190], [680, 150]], { w: 250, tone: .13, dry: .22, wet: 1, prof: 'even', rough: .16, nb: 40, seed: 21 });
const BR = {
  tuft: [[0, 0], [-10, -34], [8, -84], [56, -62], [34, -22]],
  S: [
    mk([[0, 0], [-10, -34], [8, -84]], { w: 8, tone: .9, dry: .4, wet: .5, prof: 'nail', seed: 31 }), mk([[0, 0], [34, -22], [56, -62]], { w: 10, tone: .92, dry: .4, wet: .5, prof: 'nail', seed: 32 }),
    mk([[6, -88], [60, -64]], { w: 9, tone: .9, dry: .4, prof: 'even', seed: 33 }),
    mk([[22, -84], [118, -256], [224, -446]], { w: 5, tone: .8, dry: .42, prof: 'even', seed: 34 }), mk([[48, -72], [144, -244], [250, -434]], { w: 6.5, tone: .88, dry: .42, prof: 'even', seed: 37 }),
    mk([[96, -196], [122, -182]], { w: 3, tone: .7, dry: .4, prof: 'lens', seed: 35 }), mk([[160, -310], [186, -296]], { w: 3, tone: .7, dry: .4, prof: 'lens', seed: 36 }),
  ],
};
function brush(A, x, y, rot, am) {
  local(A, x, y, rot, 1.15, 1.15, L => {
    const stem = [[22, -84], [224, -446], [250, -434], [48, -72]];
    liftPoly(L, stem, am); liftPoly(L, BR.tuft, am);
    L.col.save(); L.col.globalAlpha = am; tintPolyLocal(L.col, stem); L.col.restore();
    mass(L.wet, BR.tuft, .8 * am, 2, 7, [0, 0, 30, -80, 1.2, .7]);
    BR.S.forEach(s => ink(L, s, 1, am));
  });
}
function tintPolyLocal(cc, poly) { cc.fillStyle = `rgba(${PIG.honey.join(',')},.4)`; cc.beginPath(); poly.forEach((p, i) => i ? cc.lineTo(p[0], p[1]) : cc.moveTo(p[0], p[1])); cc.fill(); }
const HX = u => lerp(-720, 700, u);

export function paint(A, t, cam) {
  const L = A.ink, P = T.pills;
  A.xf(cam.s, cam.tx, cam.ty);
  tray.draw(A, t);
  const gp = seg(t, P.glaze[0], P.glaze[1]);
  ink(L, glaze, gp, .85 * (1 - .6 * seg(t, P.glaze[1], P.glaze[1] + 1)));
  [...PILLS].sort((a, b) => a.y - b.y).forEach(pl => {
    const k = PILLS.indexOf(pl), tb = lerp(P.each[0], P.each[1], k / (PILLS.length - 1)), born = seg(t, tb, tb + .2);
    if (born <= 0) return;
    const g = gp > 0 ? ss(clamp((HX(gp) - (pl.x - 80)) / 200)) : 0;                  // 油笔过处转亮
    pill(L, pl.x, pl.y - 40 * Math.sin(born * Math.PI) * (1 - born), pl.r * (.6 + .4 * eo(born)), { g, seed: 11 + pl.i, am: clamp(born * 1.5) });
  });
  const ba = seg(t, P.glaze[0] - .5, P.glaze[0] - .2) * (1 - seg(t, P.glaze[1], P.glaze[1] + .4));
  if (ba > 0) brush(A, HX(gp) + 30, 120 + 30 * Math.sin(gp * 12) - 130 * (1 - seg(t, P.glaze[0] - .5, P.glaze[0])) - 160 * seg(t, P.glaze[1], P.glaze[1] + .4), -.12 + .1 * Math.sin(gp * 9), ba);
  column(A, cam, '伍 成丸', 820, -330, 28, seg(t, P.in + .2, P.in + .7), { tone: .8 });
  column(A, cam, '丸如弹子大', -812, -330, 50, seg(t, P.each[0] + .2, P.each[1]));
  column(A, cam, '过油 细孔填平 药气封存', -748, -330, 26, seg(t, P.glaze[0], P.glaze[0] + .9), { font: KAI, tone: .66, wet: .12, gap: 1.12 });
  A.xf(cam.s, cam.tx, cam.ty);
}
