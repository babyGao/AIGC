// 贰 研末：一笔飞白扫过药堆 → 铁碾往复 → 细罗筛下粉雨，落成一堆。粉 = 枯笔与洒墨
import { mk, draw as ink, blot, mass, arc, disc, wash, local, lift, liftEllipse, spatter, Paint, tint, PIG } from '../engine/kit.js';
import { column, KAI } from '../engine/text.js';
import { T } from '../story.js';
import { clamp, lerp, eo, ss, seg, mulberry } from '/core/lib.js';

const CX = 380, HALF = 430;                                   // 碾槽中心与半长
const yIn = x => 40 + 160 * (1 - Math.pow((x - CX) / HALF, 2));        // 槽内弧
const yOut = x => 88 + 172 * (1 - Math.pow((x - CX) / (HALF + 26), 2)); // 槽外弧
const curve = (f, x0, x1, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const x = lerp(x0, x1, i / n); return [x, f(x)]; });

const trough = new Paint();
{
  const t0 = T.mill.in;
  trough.f((L, p) => {
    const poly = [...curve(yIn, CX - HALF, CX + HALF, 20), ...curve(yOut, CX + HALF + 26, CX - HALF - 26, 20)];
    mass(L.wet, poly, .34 * p, 2.5, 5, [0, 60, 0, 280, .7, 1.25]);
    wash(L.wet, CX, 344, 430, 20, .13 * p, 3);
  }, t0, .4);
  trough.s(curve(yOut, CX - HALF - 26, CX + HALF + 26, 18), { w: 18, tone: .92, darkDir: [0, 1], side: .8, brWet: true, body: .45, dry: .4, wet: .7, prof: 'even', seed: 41 }, t0, .45);
  trough.s(curve(yIn, CX - HALF, CX + HALF, 18), { w: 9, tone: .85, dry: .45, wet: .4, prof: 'even', seed: 42 }, t0 + .1, .4);
  trough.s([[CX - HALF - 26, yOut(CX - HALF - 26)], [CX - HALF - 12, 46], [CX - HALF, 40]], { w: 10, tone: .88, dry: .4, prof: 'brush', seed: 43 }, t0 + .3, .12);
  trough.s([[CX + HALF + 26, yOut(CX + HALF + 26)], [CX + HALF + 12, 46], [CX + HALF, 40]], { w: 10, tone: .88, dry: .4, prof: 'brush', seed: 44 }, t0 + .34, .12);
  for (const [x, dx, sd] of [[CX - 200, -34, 45], [CX + 200, 34, 46]])   // 两足
    trough.s([[x, yOut(x) - 6], [x + dx * .4, yOut(x) + 44], [x + dx, 338]], { w: 34, tone: .9, darkDir: [dx, 0], side: .7, brWet: true, body: .5, dry: .42, wet: .6, prof: 'nail', seed: sd }, t0 + .4, .16);
  for (let i = 0; i < 5; i++) {                                          // 铁身上的枯笔
    const x0 = CX - 330 + i * 150, x1 = x0 + 150;
    trough.s(curve(x => (yIn(x) + yOut(x)) / 2 + 4, x0, x1, 6), { w: 20, tone: .5, dry: .78, wet: .1, prof: 'lens', seed: 50 + i }, t0 + .2 + i * .04, .2);
  }
}
// 碾轮（局部坐标，原点在轮心）
const R0 = 150;
const wheel = [
  mk(arc(0, 0, R0 - 15, R0 - 15, -2.2, 3.95, 46), { w: 34, tone: .92, darkDir: [1, 1], side: .7, brWet: true, body: .5, dry: .36, wet: .65, prof: 'even', seed: 61 }),
  mk(arc(0, 0, R0 - 58, R0 - 58, .3, 4.6, 30), { w: 12, tone: .34, dry: .74, wet: .2, prof: 'lens', seed: 62 }),
  mk(arc(0, 0, R0 - 92, R0 - 92, 3.3, 7.2, 24), { w: 10, tone: .3, dry: .78, wet: .2, prof: 'lens', seed: 63 }),
];
const handle = [   // 木柄：穿过轮心的一根横杠（不随轮转）
  mk([[-235, 44], [-110, 20], [0, -2], [120, -26], [240, -52]], { w: 30, tone: .3, dry: .5, wet: .5, prof: 'even', rough: .1, seed: 64, darkDir: [0, 1], side: .75, brWet: true }),
  mk([[-240, 30], [-232, 46], [-238, 60]], { w: 5, tone: .8, dry: .4, prof: 'brush', seed: 65 }),
  mk([[236, -66], [244, -50], [240, -36]], { w: 5, tone: .8, dry: .4, prof: 'brush', seed: 66 }),
];
// 罗（局部坐标，原点在罗口中心）
const sieve = [
  mk(arc(0, 0, 190, 54, 0, 6.2, 40), { w: 5.5, tone: .84, dry: .42, wet: .3, prof: 'even', seed: 71 }),
  mk(arc(0, 58, 190, 54, .02, 3.12, 26), { w: 7.5, tone: .9, dry: .4, wet: .5, prof: 'even', seed: 72, darkDir: [0, 1], side: .6, brWet: true }),
  mk([[-190, 0], [-191, 58]], { w: 6, tone: .86, dry: .4, prof: 'even', seed: 73 }), mk([[190, 0], [191, 58]], { w: 7, tone: .88, dry: .4, prof: 'even', seed: 74 }),
  ...[-150, -96, -40, 20, 78, 132].map((x, i) => mk([[x, -34 + Math.abs(x) * .06], [x + 46, 34 - Math.abs(x + 46) * .06]], { w: 1.3, tone: .22, dry: .7, prof: 'lens', seed: 80 + i })),
];
const SV = [-540, -190], MOUND = [-540, 318];
const sweep = mk([[1010, 60], [760, 30], [470, 70], [180, 140], [-40, 110]], { w: 120, tone: .5, dry: .8, wet: .1, prof: 'fan', rough: .2, nb: 64, seed: 31, gapLen: 900 });

export function paint(A, t, cam) {
  const L = A.ink, M = T.mill;
  A.xf(cam.s, cam.tx, cam.ty);
  ink(L, sweep, eo(seg(t, M.sweep[0], M.sweep[1])), .55 * (1 - .5 * seg(t, M.roll[0], M.roll[1])));
  trough.draw(A, t);
  // 轮的位置：沿槽往复
  const ph = (t - M.roll[0]) / M.period * 6.2832, on = seg(t, M.roll[0] - .3, M.roll[0]);
  const wx = CX + 255 * Math.sin(ph) * seg(t, M.roll[0], M.roll[0] + .3), wy = yIn(wx) - R0 + 16, rot = (wx - CX) / R0;
  // 槽里的粉：碾过的地方出现枯笔与细点
  const pw = seg(t, M.roll[0], M.roll[1]);
  for (let i = 0; i < 4; i++) {
    const x0 = CX - 300 + i * 150;
    ink(L, mk(curve(x => yIn(x) - 12 - (i % 2) * 7, x0, x0 + 190, 6), { w: 26 + i * 4, tone: .46, dry: .8, wet: .1, prof: 'lens', seed: 200 + i, gapLen: 200 }), 1, clamp(pw * 4 - i * .7) * .8);
  }
  spatter(L.dry, CX, 150, 330, 44, 260, { seed: 21, a: .55, r0: .7, r1: 2.2, p: pw });
  tint(A.cc, CX, 168, 330, 30, PIG.ochre, .26 * pw);
  if (on > 0) {
    // 轮：先擦掉身后的线，再画
    liftEllipse(L, wx, wy, R0 - 2, R0 - 2, on);
    disc(L.wet, wx, wy, R0 - 6, .14 * on, .02, 7);
    local(A, wx, wy, rot, 1, 1, LL => { wheel.forEach(s => ink(LL, s, on)); });
    local(A, wx, wy, 0, 1, 1, LL => {
      lift(LL, c => { c.globalAlpha = .96 * on; c.lineWidth = 27; c.lineCap = 'round'; c.beginPath(); c.moveTo(-232, 44); c.lineTo(0, -2); c.lineTo(240, -52); c.stroke(); });
      handle.forEach(s => ink(LL, s, on));
      disc(LL.wet, 0, -2, 20, .7 * on, .04, 9); disc(LL.dry, 0, -2, 12, .8 * on, .04, 10);
    });
    // 轮下溅起的粉
    const v = Math.cos(ph);
    spatter(L.dry, wx - Math.sign(v) * 70, wy + R0 - 26, 90, 46, 70, { seed: 23 + Math.floor(t * 12), a: .6 * pw, r0: .8, r1: 2.6, pow: .5 });
    for (let i = 0; i < 3; i++) ink(L, mk(arc(wx, wy, R0 + 22 + i * 16, R0 + 22 + i * 16, 1.9 + Math.sign(v) * -.9 - .25, 1.9 + Math.sign(v) * -.9 + .25, 6), { w: 3, tone: .4, dry: .7, prof: 'tip', seed: 300 + i }), 1, .5 * Math.abs(v) * pw);
  }
  // 罗与粉雨
  const sp = seg(t, M.sift[0] - .5, M.sift[0]), rain = seg(t, M.sift[0], M.sift[1]);
  if (sp > 0) {
    const sh = Math.sin(t * 15) * 7 * seg(t, M.sift[0], M.sift[0] + .2), sy = SV[1] + Math.cos(t * 15) * 2.5;
    // 落定的粉堆（一点赭：肉色与褐色之间）
    tint(A.cc, MOUND[0], MOUND[1] - 4, 236 * (.4 + .6 * rain), 54 * (.4 + .6 * rain), PIG.ochre, .34 * rain);
    wash(L.wet, MOUND[0], MOUND[1], 250 * (.4 + .6 * rain), 56 * (.4 + .6 * rain), .2 * rain, 13);
    wash(L.wet, MOUND[0] + 8, MOUND[1] - 20 * rain, 150 * (.4 + .6 * rain), 44 * (.4 + .6 * rain), .16 * rain, 14);
    spatter(L.dry, MOUND[0], MOUND[1] - 6, 236 * (.4 + .6 * rain), 46 * rain + 4, 900, { seed: 15, a: .5, r0: .6, r1: 1.9, pow: .62, p: rain });
    // 下落的粉雨（每两帧换一批，像筛出来的）
    const fr = Math.floor(t * 12);
    for (let k = 0; k < 3; k++) spatter(L.dry, SV[0] + sh * .5, lerp(SV[1] + 110, MOUND[1] - 70, (k + .5) / 3), 150 - k * 12, 78, 170, { seed: 400 + fr * 3 + k, a: .5 * clamp(rain * 6) * (1 - seg(t, M.sift[1] - .2, M.sift[1] + .3)), r0: .6, r1: 1.8, pow: .8 });
    local(A, SV[0] + sh, sy, -.1 + sh * .004, 1, 1, LL => {
      wash(LL.wet, 0, 4, 176, 46, .1 * sp, 16);
      sieve.forEach((s, i) => ink(LL, s, clamp(sp * sieve.length - i * .5)));
      spatter(LL.dry, 0, 2, 150, 34, 120, { seed: 17, a: .5 * sp, r0: .8, r1: 2.6 });
    });
    for (const sd of [-1, 1]) ink(L, mk(arc(SV[0] + sd * 236, SV[1] + 30, 26, 60, sd > 0 ? -.9 : 2.24, sd > 0 ? .9 : 4.04, 8), { w: 3, tone: .42, dry: .7, prof: 'tip', seed: 500 + sd }), 1, .6 * clamp(rain * 5) * (1 - seg(t, M.sift[1] - .2, M.sift[1])));
  }
  column(A, cam, '贰 研末', 908, -420, 30, seg(t, M.in + .2, M.in + .7), { tone: .8 });
  column(A, cam, '过一百目细罗', -872, -330, 50, seg(t, M.sift[0] + .1, M.sift[0] + 1));
  column(A, cam, '黏药烘透 串料同碾', -800, -330, 25, seg(t, M.sift[0] + .5, M.sift[0] + 1.3), { font: KAI, tone: .62, wet: .12, gap: 1.14 });
  A.xf(cam.s, cam.tx, cam.ty);
}
