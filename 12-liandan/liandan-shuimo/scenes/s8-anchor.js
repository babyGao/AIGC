// 所宜：雪晨。一百丸排成的长路走到尽头——草屋前一人，服下今日这一丸，腹中一点暖（朱红，同那点炉火）
import { mk, draw as ink, blot, mass, arc, disc, wash, local, lift, liftPoly, pill, Paint, VERM, tint, PIG } from '../engine/kit.js';
import { ridgeFn, mountainLayer } from '../engine/land.js';
import { column, line, KAI } from '../engine/text.js';
import { T } from '../story.js';
import { clamp, lerp, eo, ss, seg, mulberry } from '/core/lib.js';

let FAR = null;
function far() {
  if (FAR) return FAR;
  const cv = document.createElement('canvas'); cv.width = 1920; cv.height = 1080; const c = cv.getContext('2d');
  c.drawImage(mountainLayer({ W: 1920, H: 1080, ridge: ridgeFn([[250, 190, 250], [760, 120, 300], [1280, 230, 260], [1700, 140, 220]], 430, 5, 26), depth: 200, tone: .12, rim: .6, rimW: 22, mist: .9, seed: 5 }), 0, 0);
  c.drawImage(mountainLayer({ W: 1920, H: 1080, ridge: ridgeFn([[120, 170, 200], [470, 100, 190], [-40, 120, 120]], 520, 9, 18), xmask: x => clamp((900 - x) / 260), depth: 150, tone: .2, rim: .7, rimW: 14, mist: .7, seed: 9 }), 0, 0);
  return (FAR = cv);
}
const scene = new Paint();
{
  const t0 = T.anchor.in;
  // 雪地的几道起伏
  [[-900, 300, 760], [-200, 344, 900], [200, 420, 700], [-760, 452, 620], [420, 300, 520]].forEach(([x, y, len], i) =>
    scene.s([[x, y], [x + len * .5, y - 8 + 6 * Math.sin(i * 2)], [x + len, y + 4]], { w: 12 + (i % 2) * 8, tone: .17, dry: .8, wet: .3, prof: 'lens', seed: 20 + i, gapLen: 500 }, t0 + i * .05, .4));
  // 老树
  scene.s([[-560, 300], [-572, 180], [-546, 80], [-584, -30], [-560, -130]], { w: 26, tone: .88, darkDir: [-1, 0], side: .8, brWet: true, body: .4, dry: .5, wet: .6, prof: 'nail', seed: 31 }, t0 + .1, .4);
  [[[-566, 120], [-640, 60], [-720, 50]], [[-552, 40], [-470, -10], [-400, -6]], [[-580, -20], [-650, -80], [-690, -150]], [[-566, -90], [-500, -150], [-470, -210]], [[-562, -128], [-590, -200], [-576, -260]], [[-640, 60], [-680, 0]], [[-470, -10], [-440, -64]], [[-650, -80], [-720, -90]]]
    .forEach((p, i) => scene.s(p, { w: 8 - i * .5, tone: .82, dry: .55, wet: .3, prof: 'tip', seed: 40 + i }, t0 + .3 + i * .05, .2));
  // 草屋：雪压着屋顶，只画檐下的一道浓线与屋身
  scene.f((L, p) => { mass(L.wet, [[212, 138], [486, 140], [480, 262], [216, 262]], .1 * p, 2, 5); mass(L.wet, [[300, 160], [392, 160], [392, 262], [300, 262]], .5 * p, 2, 6); mass(L.wet, [[170, 134], [530, 136], [520, 156], [180, 154]], .28 * p, 2, 7); }, t0 + .2, .4);
  scene.s([[346, 26], [252, 76], [158, 132]], { w: 4, tone: .5, dry: .65, prof: 'brush', seed: 51 }, t0 + .2, .2);
  scene.s([[346, 26], [444, 78], [540, 136]], { w: 5, tone: .55, dry: .65, prof: 'brush', seed: 52 }, t0 + .25, .2);
  scene.s([[158, 132], [346, 138], [540, 136]], { w: 9, tone: .9, dry: .42, wet: .5, prof: 'even', seed: 53 }, t0 + .3, .25);
  scene.s([[216, 140], [214, 262]], { w: 6, tone: .8, dry: .45, prof: 'brush', seed: 54 }, t0 + .4, .12);
  scene.s([[484, 142], [482, 262]], { w: 7, tone: .85, dry: .45, prof: 'brush', seed: 55 }, t0 + .44, .12);
  scene.s([[200, 264], [350, 268], [500, 264]], { w: 5, tone: .7, dry: .5, prof: 'even', seed: 56 }, t0 + .5, .15);
  [560, 600, 640, 684, 730].forEach((x, i) => scene.s([[x, 210 + (i % 2) * 6], [x + 3, 270]], { w: 4, tone: .7, dry: .5, prof: 'tip', seed: 60 + i }, t0 + .55 + i * .03, .08));
  scene.s([[548, 232], [650, 228], [744, 236]], { w: 3, tone: .6, dry: .55, prof: 'even', seed: 66 }, t0 + .7, .12);
}
// 人（局部坐标，脚下为原点，面朝左，坐着）
const FIG = {
  robe: [[-62, 0], [-66, -34], [-40, -62], [-30, -116], [10, -126], [38, -90], [52, -30], [58, 0]],
  S: [
    mk([[18, -126], [46, -88], [60, -30], [64, 2]], { w: 17, tone: .84, darkDir: [1, 0], side: .8, brWet: true, body: .4, dry: .42, wet: .7, prof: 'press', seed: 71 }),
    mk([[-28, -112], [-40, -66], [-66, -36], [-62, 2]], { w: 9, tone: .72, dry: .45, wet: .4, prof: 'brush', seed: 72 }),
    mk([[-36, -60], [-6, -44], [20, -50]], { w: 6, tone: .55, dry: .5, wet: .4, prof: 'tip', seed: 76 }),
    mk([[-66, 3], [0, 7], [62, 3]], { w: 7, tone: .78, dry: .45, wet: .4, prof: 'even', seed: 73 }),
    mk([[-14, -110], [-52, -94], [-36, -130]], { w: 11, tone: .66, dry: .4, wet: .5, prof: 'brush', seed: 74 }),
    mk(arc(-12, -146, 16, 19, .6, 5.6, 14), { w: 3, tone: .7, dry: .4, prof: 'even', seed: 75 }),
  ],
};
function figure(A, x, y, s, am, warm) {
  local(A, x, y, 0, s, s, L => {
    liftPoly(L, FIG.robe, am);
    mass(L.wet, FIG.robe, .2 * am, 2, 3, [0, -126, 0, 0, .6, 1.3]);
    tint(L.col, -2, -60, 58, 64, PIG.indigo, .26 * am, 0, .4);
    FIG.S.forEach(st => ink(L, st, 1, am));
    blot(L.wet, -2, -158, 16, .8 * am, .3, .7, 4); blot(L.dry, -1, -172, 6, .85 * am, 0, 1, 5);      // 发与髻
    disc(L.dry, -37, -135, 5, .95 * am, .03, 6);                                                     // 手里的一丸
    if (warm > 0) { const c = A.cc; c.save(); c.globalAlpha = clamp(warm); c.fillStyle = `rgb(${VERM.join(',')})`; c.beginPath(); c.ellipse(-6, -56, 7 * (.6 + .4 * warm), 6 * (.6 + .4 * warm), 0, 0, 7); c.fill(); c.restore(); }
  });
}
// 百丸之路的末段：自右下由近及远，走到人前
export const PATH = Array.from({ length: 15 }, (_, i) => { const u = Math.pow(i / 14, .72); return { x: lerp(930, 214, u) + 62 * Math.sin(u * 3.3), y: lerp(474, 290, Math.pow(u, .82)), r: lerp(21, 6.5, u), i }; });

// 百丸长路的前段：自五行收成的那一丸起（左上方是镜头来处），一路向左下延伸到雪地里的那一段
export const ROW = (() => {
  const o = []; let x = 5100, r = 75;
  for (let i = 0; i < 85; i++) {
    const rn = i < 10 ? lerp(75, 17, Math.pow((i + 1) / 10, .7)) : 17;
    if (i > 0) x -= (r + rn) * 1.3; r = rn;
    o.push({ x, r, i });
  }
  const end = PATH[0].x + 64, k = (5100 - end) / (5100 - o[o.length - 1].x);   // 收到雪地那一段的起点前
  return o.map(d => { const x2 = 5100 - (5100 - d.x) * k, u = (5100 - x2) / (5100 - end); return { ...d, x: x2, y: lerp(0, PATH[0].y - 26, ss(u)) }; });
})();
const DAY = { 0: '一日', 24: '廿五日', 49: '五十日', 74: '七十五日' };
export function paint(A, t, cam) {
  const L = A.ink, N = T.anchor;
  A.xf(cam.s, cam.tx, cam.ty);
  // 百丸之路：只画镜头里看得见的
  const vx0 = (-960 - cam.tx) / cam.s, vx1 = (960 * 2 - cam.tx) / cam.s;
  for (const d of ROW) {
    if (d.x + d.r < vx0 || d.x - d.r > vx1 || d.x < PATH[0].x + 30) continue;
    pill(L, d.x, d.y, d.r, { g: 1, seed: 140 + d.i, shadowK: .8 });
    if (DAY[d.i]) line(A, cam, DAY[d.i], d.x, d.y - d.r - 34, 26, .72, { align: 'center', sp: 3, wet: .12 });
  }
  A.xf(cam.s, cam.tx, cam.ty);
  const ip = seg(t, N.in, N.in + .8);
  L.wet.save(); L.wet.globalAlpha = ip; L.wet.drawImage(far(), -960, -540); L.wet.restore();
  scene.draw(A, t);
  PATH.forEach(d => {
    const k = seg(t, N.in + .2 + (1 - d.i / 14) * .5, N.in + .5 + (1 - d.i / 14) * .5);
    if (k <= 0) return;
    if (d.r > 11) pill(L, d.x, d.y, d.r, { g: 1, seed: 40 + d.i, am: k, shadowK: .7 }); else { blot(L.wet, d.x + 1, d.y + d.r, d.r, .16 * k, 0, .25, d.i); disc(L.dry, d.x, d.y, d.r, .92 * k, .04, d.i); }
  });
  figure(A, 110, 282, 1.3, seg(t, N.sit, N.sit + .5), seg(t, N.warm, N.warm + .6));
  tint(A.cc, 346, 212, 46, 50, PIG.honey, .5 * seg(t, N.in + .3, N.in + .9), 0, .5);       // 门里一点灯火的暖
  const sm = { tone: .86, gap: 1.06 }, src = { font: KAI, tone: .6, wet: .12, gap: 1.15 };
  column(A, cam, '空腹酒服一丸', -870, -350, 46, seg(t, N.in + .4, N.in + 1.2));
  column(A, cam, '一百丸为剂', -814, -350, 46, seg(t, N.in + .9, N.in + 1.6));
  column(A, cam, '金匮要略', -762, -350, 23, seg(t, N.in + 1.6, N.in + 1.9), src);
  column(A, cam, '五劳七伤晨夜气喘急', -870, 40, 28, seg(t, N.in + 1.4, N.in + 2.2), sm);
  column(A, cam, '内冷身重腰背强痛', -832, 40, 28, seg(t, N.in + 1.8, N.in + 2.6), sm);
  column(A, cam, '古今录验', -794, 40, 22, seg(t, N.in + 2.6, N.in + 2.9), src);
  column(A, cam, '人之元气在肺元阳在肾', 884, -440, 28, seg(t, N.in + 2.2, N.in + 3.0), sm);
  column(A, cam, '既剥削则难于遽复矣', 846, -440, 28, seg(t, N.in + 2.6, N.in + 3.4), sm);
  column(A, cam, '全赖后天之谷气资益其生', 808, -440, 28, seg(t, N.in + 3.0, N.in + 3.8), sm);
  column(A, cam, '金匮要略辑义', 770, -440, 22, seg(t, N.in + 3.8, N.in + 4.1), src);
  A.xf(cam.s, cam.tx, cam.ty);
}
