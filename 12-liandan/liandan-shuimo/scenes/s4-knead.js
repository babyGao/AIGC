// 肆 和药：案上一团蜜与粉，一只写意的墨手拍三下。每拍一下，药团由亮转哑、由浅入深，最后现出细孔
import { mk, draw as ink, blot, mass, arc, disc, wash, local, lift, liftEllipse, liftPoly, spatter, Paint, tint, PIG } from '../engine/kit.js';
import { column, KAI } from '../engine/text.js';
import { T } from '../story.js';
import { clamp, lerp, eo, ei, ss, seg, mulberry } from '/core/lib.js';

const CX = -90, BASE = 262, HW = 290, HH = 196;
const topY = x => -HH * Math.pow(Math.max(0, 1 - Math.pow(x / HW, 2)), .62) * (1 + .07 * Math.sin(x * .028 + 1) + .045 * Math.sin(x * .071 + 2));
const DOME = [...Array.from({ length: 31 }, (_, i) => { const x = lerp(-HW, HW, i / 30); return [x, topY(x)]; }), [HW * .9, 12], [0, 18], [-HW * .9, 12]];

// 案板
const board = new Paint();
{
  const t0 = T.knead.in;
  board.f((L, p) => { mass(L.wet, [[-840, 322], [900, 318], [896, 372], [-836, 378]], .2 * p, 2, 3); wash(L.wet, 30, 402, 820, 20, .1 * p, 4); }, t0, .4);
  board.s([[-760, 112], [-200, 104], [400, 100], [820, 106]], { w: 4, tone: .6, dry: .5, wet: .2, prof: 'even', seed: 11 }, t0, .3);
  board.s([[-860, 320], [-200, 316], [400, 314], [920, 318]], { w: 13, tone: .9, darkDir: [0, 1], side: .7, brWet: true, body: .45, dry: .42, wet: .6, prof: 'even', seed: 12 }, t0 + .1, .35);
  board.s([[-850, 376], [0, 372], [910, 372]], { w: 6, tone: .8, dry: .45, wet: .3, prof: 'even', seed: 13 }, t0 + .2, .3);
  board.s([[-760, 112], [-812, 220], [-860, 320]], { w: 5, tone: .7, dry: .5, prof: 'brush', seed: 14 }, t0 + .25, .15);
  board.s([[820, 106], [868, 210], [920, 318]], { w: 6, tone: .75, dry: .5, prof: 'brush', seed: 15 }, t0 + .28, .15);
  [[-700, 150, 520], [-360, 186, 640], [80, 142, 560], [-640, 236, 700], [240, 228, 560], [-240, 284, 800], [420, 280, 420]].forEach(([x, y, len], i) =>
    board.s([[x, y], [x + len * .5, y + 4 * Math.sin(i)], [x + len, y - 3]], { w: 15 + (i % 3) * 8, tone: .2, dry: .84, wet: .1, prof: 'lens', seed: 20 + i, gapLen: 500 }, t0 + .2 + i * .03, .25));
}
// 药团里的笔（局部坐标，原点在药团底边中点）
const swirl = [
  [[-200, -40], [-110, -120], [0, -150], [110, -110], [180, -50]], [[-150, -20], [-40, -80], [70, -70], [150, -24]],
  [[-60, -160], [20, -110], [-30, -50], [60, -20]], [[90, -150], [150, -90], [120, -30]], [[-230, -16], [-150, -70], [-120, -130]],
].map((p, i) => mk(p, { w: 60 + (i % 2) * 26, tone: .5, dry: .05, wet: 1, prof: 'even', rough: .5, seed: 40 + i, bristle: 0 }));
const tex = [
  [[-250, -30], [-170, -120], [-60, -176], [60, -180]], [[-200, -10], [-90, -90], [40, -120], [170, -90]], [[10, -186], [130, -150], [220, -70], [262, -10]],
  [[-120, -20], [0, -56], [130, -40], [230, -10]], [[-240, -60], [-190, -110], [-120, -150]], [[60, -60], [150, -110], [200, -60]],
].map((p, i) => mk(p, { w: 44, tone: .9, dry: .8, wet: .15, prof: 'lens', rough: .3, nb: 30, seed: 50 + i, gapLen: 300 }));
const edge = [
  mk([[-HW * .96, 8], [-HW * .9, -70], [-200, topY(-200)], [-80, topY(-80)], [40, topY(40)]], { w: 26, tone: .9, darkDir: [-1, -.4], side: .8, brWet: true, body: .4, dry: .4, wet: .7, prof: 'press', seed: 60 }),
  mk([[HW * .5, topY(HW * .5)], [HW * .86, topY(HW * .86)], [HW * .97, -30], [HW * .88, 12], [80, 20], [-120, 18]], { w: 18, tone: .86, darkDir: [.4, 1], side: .8, brWet: true, body: .4, dry: .45, wet: .7, prof: 'brush', seed: 61 }),
];
const PORE = (() => { const R = mulberry(7), o = []; for (let i = 0; i < 64; i++) { const x = (R() * 2 - 1) * HW * .86, y = topY(x) * (.12 + .8 * R()); o.push([x, y, 2.2 + R() * 4.2, R()]); } return o; })();

// 手（局部坐标，原点在掌心，指尖朝 −x，袖子朝 +x）
const loaded = (w, sd, o = {}) => ({ w, tone: .56, darkDir: [.3, 1], side: .86, brWet: true, body: .32, dry: .4, wet: .8, prof: 'even', rough: .1, seed: sd, ...o });
const HAND = {
  palm: [[-44, -62], [30, -70], [84, -48], [96, 0], [84, 50], [30, 64], [-36, 60], [-50, 0]],
  sleeve: [[130, -84], [330, -214], [640, -260], [700, 130], [300, 124], [132, 66]],
  S: [
    mk([[134, 66], [280, 112], [460, 122], [700, 96]], { w: 24, tone: .86, darkDir: [0, 1], side: .8, brWet: true, body: .4, dry: .42, wet: .7, prof: 'nail', seed: 70 }),
    mk([[134, -84], [262, -172], [430, -232], [700, -268]], { w: 18, tone: .74, darkDir: [0, -1], side: .8, brWet: true, body: .35, dry: .45, wet: .7, prof: 'nail', seed: 71 }),
    mk([[176, 2], [300, -30], [470, -22]], { w: 12, tone: .4, dry: .62, wet: .4, prof: 'lens', seed: 72 }),
    mk([[132, -86], [120, -10], [134, 68]], { w: 17, tone: .88, darkDir: [-1, 0], side: .7, brWet: true, body: .5, dry: .4, wet: .6, prof: 'lens', seed: 73 }),
    mk([[86, -48], [112, -52], [136, -60]], { w: 7, tone: .7, dry: .45, prof: 'even', seed: 74 }), mk([[86, 50], [112, 50], [136, 52]], { w: 9, tone: .8, dry: .45, prof: 'even', seed: 75 }),
    mk([[40, -58], [4, -92], [-58, -108]], loaded(34, 76, { prof: 'brush' })),                                     // 拇指
    mk([[-26, 42], [-80, 54], [-134, 64]], loaded(26, 77)), mk([[-36, 14], [-108, 18], [-178, 24]], loaded(30, 78)),
    mk([[-38, -16], [-116, -22], [-192, -18]], loaded(32, 79)), mk([[-30, -46], [-96, -58], [-166, -56]], loaded(31, 80)),
    mk([[-40, -64], [30, -73], [86, -48]], { w: 8, tone: .7, dry: .45, wet: .3, prof: 'even', seed: 81 }),
    mk([[-30, 62], [34, 67], [86, 50]], { w: 12, tone: .84, darkDir: [0, 1], side: .7, brWet: true, body: .4, dry: .42, wet: .6, prof: 'even', seed: 82 }),
  ],
};
export function hand(A, x, y, rot, s = 1, am = 1) {
  local(A, x, y, rot, s, s, L => {
    liftPoly(L, HAND.sleeve, am); liftPoly(L, HAND.palm, am);
    lift(L, c => { c.globalAlpha = am; c.lineCap = 'round'; c.lineWidth = 27; for (const p of [[[-26, 42], [-134, 64]], [[-36, 14], [-178, 24]], [[-38, -16], [-192, -18]], [[-30, -46], [-166, -56]], [[40, -58], [-58, -108]]]) { c.beginPath(); c.moveTo(p[0][0], p[0][1]); c.lineTo(p[1][0], p[1][1]); c.stroke(); } });
    mass(L.wet, HAND.sleeve, .13 * am, 4, 5, [130, 0, 700, 0, 1.2, .5]);
    tint(L.col, 420, -50, 300, 170, PIG.indigo, .2 * am, -.25, .4);
    mass(L.wet, HAND.palm, .15 * am, 2, 6);
    HAND.S.forEach(st => ink(L, st, 1, am));
  });
}

export const CAM = { x: -30, y: 30, z: 1.2 };
const patK = t => T.knead.pat.reduce((a, tp) => a + ss(seg(t, tp, tp + .6)), 0) / T.knead.pat.length;
// 手的高度：0 = 贴着药团，1 = 悬着
function handH(t) {
  let h = 1;
  for (const tp of T.knead.pat) {
    if (t >= tp - .5 && t < tp - .18) h = 1 + .28 * ss(seg(t, tp - .5, tp - .18));
    else if (t >= tp - .18 && t < tp) h = 1.28 * (1 - ei(seg(t, tp - .18, tp)));
    else if (t >= tp && t < tp + .1) h = 0;
    else if (t >= tp + .1 && t < tp + .55) h = eo(seg(t, tp + .1, tp + .55));
  }
  return h;
}

export function paint(A, t, cam) {
  const L = A.ink, K = T.knead;
  A.xf(cam.s, cam.tx, cam.ty);
  board.draw(A, t);
  const dp = seg(t, K.in + .2, K.in + .6), k = patK(t), form = ss(seg(t, K.pour[0], K.pour[1] + .3));   // form：粉落进蜜里，药团慢慢鼓起来
  let hit = 0, last = -9; for (const tp of K.pat) { if (t >= tp) last = tp; }
  hit = last > 0 ? Math.exp(-(t - last) * 9) : 0;                       // 拍下的一瞬：药团被压扁再回弹
  if (dp > 0) {
    wash(L.wet, CX + 10, BASE + 22, HW * 1.12, 24, .2 * dp, 31);
    // 四周散落的药粉（越拍越少：都揉进去了）
    spatter(L.dry, CX, BASE + 6, HW * 1.5, 34, 520, { seed: 32, a: .55 * dp * (1 - k * .7), r0: .7, r1: 2.3, pow: .9 });
    local(A, CX, BASE, 0, (1 + .05 * hit) * lerp(1.12, 1, form), (1 - .11 * hit) * lerp(.24, 1, form), LL => {
      tint(LL.col, 0, -HH * .45, HW * .96, HH * .55, PIG.honey, .5 * (1 - k) * dp, 0, .3);
      tint(LL.col, 0, -HH * .45, HW * .94, HH * .53, PIG.umber, .38 * k * dp, 0, .3);
      liftPoly(LL, DOME, dp);
      mass(LL.wet, DOME, lerp(.2, .84, k) * dp, 3, 33, [-HW, -HH, HW, 0, .7, 1.25]);
      mass(LL.dry, DOME.map(p => [p[0] * .96, p[1] * .96 + 2]), lerp(0, .62, Math.pow(k, 1.4)) * dp, 2, 34);
      swirl.forEach((s, i) => ink(LL, s, 1, dp * lerp(.35, .6, clamp(k * 2)) * Math.pow(1 - k, .7)));
      tex.forEach((s, i) => { if (i < 3) ink(LL, s, 1, dp * k * .34); });
      // 蜜的亮光（越拍越哑）
      const g = Math.pow(1 - k, 1.3) * dp;
      for (const [x, y, rx, ry, r] of [[-120, -150, 62, 13, -.42], [-30, -176, 34, 8, -.2], [-190, -84, 30, 9, -.9], [90, -140, 26, 7, .3]]) liftEllipse(LL, x, y, rx, ry, g * .9, r);
      // 还没揉进去的干粉：枯笔与细点
      spatter(LL.dry, 110, -60, 150, 60, 240, { seed: 35, a: .6 * (1 - k) * dp, r0: .8, r1: 2.6 });
      spatter(LL.dry, -150, -40, 110, 44, 140, { seed: 36, a: .5 * (1 - k) * dp, r0: .8, r1: 2.4 });
      // 细孔（揉成之后才有）
      const pa = Math.pow(k, 2.2) * dp;
      if (pa > .02) for (const [x, y, r, q] of PORE) liftEllipse(LL, x, y, r, r * (.55 + .4 * q), pa * (.5 + .5 * q), q * 3);
      edge.forEach(s => ink(LL, s, 1, dp * lerp(.55, 1, k)));
    });
  }
  // 粉自左上倾入（枯粉遇润蜜，落处墨自己洇深），药气腾起
  const pp = seg(t, K.pour[0], K.pour[1]);
  if (pp > 0 && pp < 1) {
    const fr = Math.floor(t * 12);
    for (let i = 0; i < 6; i++) { const u = (i + .5) / 6; spatter(L.dry, lerp(-560, CX - 30, u), lerp(-420, BASE - 70 - 120 * form, u * u), 26 + 40 * u, 22, 60, { seed: 600 + fr * 6 + i, a: .6, r0: .8, r1: 2.4 }); }
    tint(A.cc, lerp(-560, CX, .6), -150, 120, 200, PIG.ochre, .14, .5, .5);
    for (let i = 0; i < 5; i++) { const R = mulberry(i + 70), x = CX - 160 + R() * 320; blot(L.wet, x, BASE - 30 - 90 * form, 10 + 36 * clamp(pp * 3 - i * .4), .45 * clamp(pp * 3 - i * .4), R() * 3, .5, i); }
  }
  const qa = seg(t, K.pour[0] + .4, K.pour[0] + .9) * (1 - seg(t, K.pat[0] - .3, K.pat[0] + .4));
  if (qa > 0) for (let i = 0; i < 3; i++) { const u = ((t - K.pour[0]) * .35 + i * .33) % 1; ink(L, mk([[CX - 100 + i * 100, BASE - 120], [CX - 70 + i * 100, BASE - 260], [CX - 120 + i * 110, BASE - 400], [CX - 60 + i * 100, BASE - 560]], { w: 56, tone: .09, dry: .1, wet: 1, prof: 'lens', rough: .5, seed: 640 + i }), clamp(u * 1.6), qa * Math.sin(u * Math.PI)); }
  // 手
  const hp = seg(t, K.pat[0] - 1.1, K.pat[0] - .6);
  if (hp > 0) {
    const h = handH(t), top = BASE - HH * (1 - .11 * hit);
    const x = CX + lerp(96, 190, clamp(h)), y = top - 28 - 200 * h, rot = lerp(-.36, -.6, clamp(h));
    hand(A, x + (1 - hp) * 300, y - (1 - hp) * 200, rot, 1.2, hp);
    // 拍起的粉雾与短促的气线
    if (last > 0 && t - last < .5) {
      const u = (t - last) / .5, e = eo(u);
      spatter(L.dry, CX + 40, top + 10, 190 + 220 * e, 50 + 90 * e, 220, { seed: 90 + Math.round(last * 10), a: .7 * (1 - u), r0: .8, r1: 2.8, pow: .45 });
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + .25 + i * .44, r0 = 250 + 60 * e, r1 = r0 + 46 + 30 * e;
        ink(L, mk([[CX + 40 + Math.cos(a) * r0, top + 60 + Math.sin(a) * r0 * .7], [CX + 40 + Math.cos(a) * r1, top + 60 + Math.sin(a) * r1 * .7]], { w: 4, tone: .55, dry: .7, prof: 'tip', seed: 95 + i }), 1, (1 - u) * .8);
      }
    }
  }
  column(A, cam, '肆 和药', 716, -350, 28, seg(t, K.in + .2, K.in + .7), { tone: .8 });
  column(A, cam, '百揉成团', -730, -330, 52, seg(t, K.pat[0] - .2, K.pat[0] + .7));
  column(A, cam, '药气腾起 轻者先升', 650, -200, 26, seg(t, K.pour[0] + .5, K.pour[0] + 1.3), { font: KAI, tone: .62, wet: .12, gap: 1.12 });
  column(A, cam, '蜜粉各半 趁温而和', -664, -330, 24, seg(t, K.pat[0] + .3, K.pat[0] + 1.1), { font: KAI, tone: .62, wet: .12, gap: 1.14 });
  A.xf(cam.s, cam.tx, cam.ty);
}
