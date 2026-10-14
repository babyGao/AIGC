// 壹 选材：三只药罐依次倾倒，廿一味各落成一小堆，堆下写药名与产地。药性即笔性——
// 阳＝枯笔淡墨（枝、根、须，轻而散），阴＝湿笔浓墨（块、团，重而润），和＝中锋圆笔（片、丁、枣，匀而圆）
import { mk, draw as ink, blot, mass, arc, xf, local, lift, liftEllipse, liftPoly, tint, wash, PIG, VERM } from '../engine/kit.js';
import { column, line, BRUSH, KAI } from '../engine/text.js';
import { T } from '../story.js';
import { clamp, lerp, eo, ss, seg, mulberry } from '/core/lib.js';

// ---------- 药材的画法（局部坐标，原点在药材中心）----------
const closed = (pts) => [...pts, pts[0], pts[1]];
const blobPoly = (R, r, n = 7, sq = 1, wob = .28) => Array.from({ length: n }, (_, i) => { const a = i / n * 6.2832, rr = r * (1 - wob / 2 + wob * R()); return [Math.cos(a) * rr, Math.sin(a) * rr * sq]; });
const KIND = {
  // 桂枝：短而直的枯枝
  twig: (R, sd) => { const L = 44 + R() * 30, w = 5 + R() * 3; return [
    ['t', 0, 0, 34, 6, 'ochre', .32],
    ['s', mk([[-L / 2, R() * 4 - 2], [0, R() * 6 - 3], [L / 2, R() * 4 - 2]], { w, tone: .52, dry: .62, wet: .15, prof: 'even', rough: .22, seed: sd })],
    ['s', mk([[L * .08, 0], [L * .22, -9 - R() * 6]], { w: 2.4, tone: .55, dry: .5, prof: 'tip', seed: sd + 1 })]]; },
  // 柴胡、防风、桔梗：细长带须的根
  stem: (R, sd) => { const L = 56 + R() * 30, c = (R() - .5) * 16; return [
    ['t', 0, 0, 36, 6, 'ochre', .26],
    ['s', mk([[-L / 2, 0], [0, c], [L / 2, -c * .4]], { w: 3.6 + R() * 1.6, tone: .44, dry: .55, wet: .2, prof: 'nail', seed: sd })],
    ['s', mk([[L * .2, c * .3], [L * .42, c * .3 + 9]], { w: 1.5, tone: .45, dry: .5, prof: 'tip', seed: sd + 1 })],
    ['s', mk([[L * .3, 0], [L * .5, -8]], { w: 1.4, tone: .4, dry: .5, prof: 'tip', seed: sd + 2 })]]; },
  // 人参：纺锤主根、芦头、两条须
  root: (R, sd) => [
    ['t', 0, 0, 42, 11, 'ochre', .36],
    ['s', mk([[-36, 0], [-8, 3], [22, -1], [38, -4]], { w: 16, tone: .32, dry: .42, wet: .5, prof: 'nail', rough: .14, seed: sd })],
    ['b', 'wet', -37, -1, 5.5, .6, 0, .9, sd],
    ['s', mk([[30, -3], [48, 6], [66, 4]], { w: 2.4, tone: .46, dry: .5, prof: 'tip', seed: sd + 1 })],
    ['s', mk([[28, -1], [44, -14], [60, -20]], { w: 2.2, tone: .46, dry: .5, prof: 'tip', seed: sd + 2 })],
    ['s', mk([[-18, -6], [-16, 6]], { w: 1.5, tone: .5, dry: .4, prof: 'lens', seed: sd + 3 })],
    ['s', mk([[-4, -5], [-2, 7]], { w: 1.5, tone: .5, dry: .4, prof: 'lens', seed: sd + 4 })]],
  // 干姜、川芎、白术：不规则的饮片
  slice: (R, sd) => { const P = blobPoly(R, 17 + R() * 6, 7, .72); return [
    ['t', 0, 0, 21, 15, 'honey', .32],
    ['lp', P.map(p => [p[0] * .96, p[1] * .96])], ['m', 'wet', P, .1, 1.5, sd],
    ['s', mk(closed(P), { w: 2.4, tone: .7, dry: .42, wet: .2, prof: 'even', rough: .2, seed: sd })],
    ['s', mk([[-7, -2], [6, 3]], { w: 1.5, tone: .5, dry: .5, prof: 'lens', seed: sd + 1 })],
    ['s', mk([[-2, 5], [8, -4]], { w: 1.3, tone: .42, dry: .5, prof: 'lens', seed: sd + 2 })]]; },
  // 山药：白而圆的片，只勾一圈
  oval: (R, sd) => { const rx = 20 + R() * 6, ry = rx * (.56 + R() * .14); return [
    ['le', 0, 0, rx * .97, ry * .97], ['b', 'wet', 0, 0, rx * .9, .05, 0, ry / rx, sd],
    ['s', mk(arc(0, 0, rx, ry, R() * 6, R() * 6 + 6.1, 22), { w: 2.6, tone: .7, dry: .4, wet: .25, prof: 'brush', seed: sd })],
    ['b', 'dry', -3, 1, 1.2, .5, 0, 1, sd + 1], ['b', 'dry', 4, -2, 1, .45, 0, 1, sd + 2], ['b', 'dry', 1, 4, 1, .4, 0, 1, sd + 3]]; },
  // 芍药：色深的圆片
  darkoval: (R, sd) => { const rx = 18 + R() * 5, ry = rx * .62; return [
    ['t', 0, 0, 19, 12, 'umber', .32],
    ['le', 0, 0, rx * .97, ry * .97], ['b', 'wet', 0, 0, rx * .95, .3, 0, ry / rx, sd],
    ['s', mk(arc(0, 0, rx, ry, R() * 6, R() * 6 + 6.1, 20), { w: 3.2, tone: .82, dry: .35, wet: .5, prof: 'brush', seed: sd })],
    ['s', mk(arc(0, 0, rx * .5, ry * .5, 0, 5.4, 12), { w: 1.4, tone: .5, dry: .4, prof: 'even', seed: sd + 1 })]]; },
  // 熟地黄：乌黑黏润的团
  lump: (R, sd) => { const r = 15 + R() * 8; return [
    ['t', 0, 0, 17, 13, 'umber', .3],
    ['le', 0, 0, r * .8, r * .6], ['b', 'wet', 0, 0, r, .84, R() * 3, .74, sd], ['b', 'dry', 1, 1, r * .72, .7, R() * 3, .7, sd + 1],
    ['le', -r * .3, -r * .24, r * .2, r * .08, .75, -.5]]; },
  // 阿胶：方而亮的胶块
  block: (R, sd) => { const w = 20 + R() * 4, h = 12 + R() * 3, P = [[-w, -h], [w, -h + 2], [w - 2, h], [-w + 1, h - 1]]; return [
    ['t', 0, 0, 21, 13, 'umber', .36],
    ['lp', P], ['m', 'wet', P, .8, 1.6, sd], ['m', 'dry', P.map(p => [p[0] * .9, p[1] * .86]), .62, 1, sd + 1],
    ['ll', -w * .7, -h * .55, w * .5, -h * .45, 2.2, .8]]; },
  // 当归：一头粗、带纹的根段
  gui: (R, sd) => [
    ['t', 0, 0, 28, 9, 'ochre', .36],
    ['s', mk([[-26, 0], [0, 2], [26, -2]], { w: 13, tone: .62, dry: .34, wet: .7, prof: 'nail', rough: .18, seed: sd, darkDir: [0, 1], side: .6, brWet: true })],
    ['s', mk([[-14, -5], [-12, 6]], { w: 1.6, tone: .8, dry: .4, prof: 'lens', seed: sd + 1 })],
    ['s', mk([[2, -4], [3, 6]], { w: 1.5, tone: .8, dry: .4, prof: 'lens', seed: sd + 2 })]],
  // 麦冬：半透明的纺锤
  spindle: (R, sd) => [
    ['t', 0, 0, 19, 8, 'honey', .42],
    ['s', mk([[-19, 0], [0, 2 * (R() - .5)], [19, 0]], { w: 12, tone: .34, dry: .2, wet: .85, prof: 'lens', seed: sd })],
    ['s', mk([[-12, 0], [12, 0]], { w: 1.4, tone: .55, dry: .4, prof: 'lens', seed: sd + 1 })]],
  // 大枣：圆而皱
  date: (R, sd) => { const r = 15 + R() * 3; return [
    ['t', 0, 0, 15, 12, 'jujube', .58],
    ['le', 0, 0, r * .92, r * .74], ['b', 'wet', 0, 0, r, .5, 0, .8, sd],
    ['s', mk(arc(0, 0, r * .98, r * .78, .4, 5.8, 18), { w: 2.6, tone: .78, dry: .4, wet: .4, prof: 'brush', seed: sd })],
    ['s', mk([[-6, -4], [0, 1], [-3, 7]], { w: 1.5, tone: .7, dry: .4, prof: 'tip', seed: sd + 1 })],
    ['s', mk([[5, -6], [8, 1]], { w: 1.4, tone: .65, dry: .4, prof: 'tip', seed: sd + 2 })]]; },
  // 茯苓：方丁
  cube: (R, sd) => { const s = 11 + R() * 3, P = [[-s, -s + 2], [s - 1, -s], [s, s - 2], [-s + 2, s]]; return [
    ['lp', P], ['m', 'wet', P, .06, 1, sd],
    ['s', mk(closed(P), { w: 2.3, tone: .66, dry: .42, wet: .2, prof: 'even', rough: .16, seed: sd, per: 3 })],
    ['s', mk([[-s * .4, -s * .3], [s * .5, -s * .45]], { w: 1.2, tone: .4, dry: .5, prof: 'lens', seed: sd + 1 })]]; },
  // 神曲：色深的方块
  qu: (R, sd) => { const s = 12 + R() * 3, P = [[-s, -s + 2], [s, -s + 1], [s - 1, s], [-s + 1, s - 1]]; return [
    ['t', 0, 0, 14, 14, 'umber', .32],
    ['lp', P], ['m', 'wet', P, .44, 1.6, sd], ['s', mk(closed(P), { w: 2.4, tone: .75, dry: .45, wet: .3, prof: 'even', seed: sd, per: 3 })]]; },
  // 杏仁：扁心形
  kernel: (R, sd) => [
    ['t', 0, 0, 13, 9, 'ochre', .32],
    ['le', 0, 0, 12, 8], ['b', 'wet', 0, 0, 12, .12, 0, .7, sd],
    ['s', mk([[-13, 0], [-4, -8], [10, -6], [14, 0], [10, 6], [-4, 8], [-13, 0]], { w: 2.3, tone: .68, dry: .4, wet: .25, prof: 'brush', seed: sd })]],
  // 豆黄卷：一粒豆带一条卷芽
  sprout: (R, sd) => [
    ['t', 0, 0, 9, 7, 'honey', .34],
    ['b', 'wet', 0, 0, 7.5, .6, 0, .78, sd], ['b', 'dry', 0, 0, 5, .5, 0, .8, sd + 1],
    ['s', mk([[5, -2], [14, -9], [20, -2], [16, 6]], { w: 2.2, tone: .62, dry: .4, prof: 'tip', seed: sd + 2 })]],
};
function drawPiece(L, ops, am) {
  for (const op of ops) {
    switch (op[0]) {
      case 's': ink(L, op[1], 1, am); break;
      case 't': tint(L.col, op[1], op[2], op[3], op[4], PIG[op[5]], op[6] * am, op[7] || 0); break;
      case 'b': blot(L[op[1]], op[2], op[3], op[4], op[5] * am, op[6], op[7], op[8]); break;
      case 'm': mass(L[op[1]], op[2], op[3] * am, op[4], op[5]); break;
      case 'le': liftEllipse(L, op[1], op[2], op[3], op[4], (op[5] ?? 1) * am, op[6] ?? 0); break;
      case 'lp': liftPoly(L, op[1], am); break;
      case 'll': lift(L, c => { c.globalAlpha = op[6] * am; c.lineWidth = op[5]; c.lineCap = 'round'; c.beginPath(); c.moveTo(op[1], op[2]); c.lineTo(op[3], op[4]); c.stroke(); }); break;
    }
  }
}

// ---------- 药罐（局部坐标，直立，原点在罐身中心）----------
function buildJar(mark, seed) {
  const prof = [[56, -148], [53, -128], [100, -108], [134, -66], [141, -20], [130, 50], [104, 116], [84, 150]];
  const S = [
    mk(prof, { w: 11, tone: .86, darkDir: [1, 0], side: .8, brWet: true, body: .4, dry: .42, wet: .7, prof: 'press', seed: seed + 1 }),
    mk(prof.map(p => [-p[0], p[1]]), { w: 6, tone: .72, dry: .5, wet: .3, prof: 'brush', seed: seed + 2 }),
    mk([[-84, 150], [0, 158], [84, 150]], { w: 7, tone: .82, dry: .45, wet: .4, prof: 'even', seed: seed + 3 }),
    mk(arc(0, -150, 57, 15, 0, Math.PI, 14), { w: 6.5, tone: .88, dry: .4, wet: .4, prof: 'even', seed: seed + 4 }),
    mk(arc(0, -150, 57, 15, Math.PI, 6.2832, 14), { w: 3.6, tone: .62, dry: .45, wet: .3, prof: 'even', seed: seed + 5 }),
    mk(arc(0, -106, 104, 14, .2, 2.94, 14), { w: 2.6, tone: .58, dry: .45, prof: 'even', seed: seed + 6 }),
    mk(arc(0, -70, 133, 16, .22, 2.92, 16), { w: 2.6, tone: .58, dry: .45, prof: 'even', seed: seed + 7 }),
    mk(arc(0, 122, 101, 13, .25, 2.9, 14), { w: 2.4, tone: .55, dry: .45, prof: 'even', seed: seed + 8 }),
  ];
  for (let i = 0; i < 7; i++) {      // 肩上一圈草叶纹
    const x = -92 + i * 30.6, y = -80 - Math.cos((i - 3) / 3 * 1.2) * 4;
    S.push(mk([[x - 9, y + 6], [x, y - 4], [x + 9, y + 5]], { w: 7, tone: .4, dry: .3, wet: .7, prof: 'lens', seed: seed + 20 + i }));
  }
  const tag = [[-44, -34], [44, -37], [46, 52], [-43, 54]];
  S.push(mk([...tag, tag[0], tag[1]], { w: 2.4, tone: .72, dry: .42, prof: 'even', seed: seed + 40, per: 3 }));
  return { S, tag, mark, seed };
}
function drawJar(A, jar, x, y, rot, s, p = 1) {
  local(A, x, y, rot, s, s, L => {
    blot(L.wet, 46, 10, 86, .13 * p, .2, 1.5, jar.seed);                 // 背光一侧的淡墨
    blot(L.wet, 0, -150, 46, .5 * p, 0, .2, jar.seed + 1);               // 罐口里的暗
    tint(L.col, 0, -86, 132, 26, PIG.indigo, .4 * p, 0, .3); tint(L.col, 0, 124, 100, 13, PIG.indigo, .3 * p, 0, .3); tint(L.col, 0, -150, 58, 15, PIG.indigo, .22 * p);   // 青花的一点花青
    liftPoly(L, jar.tag, p);
    jar.S.forEach((st, i) => ink(L, st, clamp(p * jar.S.length - i * .6)));
    for (const [c, k] of [[L.wet, .25], [L.dry, .92]]) { c.save(); c.globalAlpha = k * clamp(p * 2 - 1); c.fillStyle = '#000'; c.font = `66px ${BRUSH}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(jar.mark, 1, 10); c.restore(); }
  });
}

// ---------- 三路廿一味：每味一小堆，堆下写药名与产地（方中要点用朱）----------
// 阳 = 升散温通（气薄者轻清，上行）；阴 = 滋养润藏（味厚者重浊，贴纸下沉）；和 = 培土为枢
const ROUTES = [
  { key: 'yin', cx: -486, x0: -700, x1: -272, rows: [176, 312], split: [3, 2], t: T.pour.yin, mark: '阴', q1: '阴虚者宜补而兼清', q2: '门冬芍药生地之属', src: '景岳全书',
    herbs: [['地黄', '河南焦作', 'lump'], ['芍药', '安徽亳州', 'darkoval'], ['当归', '甘肃岷县', 'gui'], ['阿胶', '山东东阿', 'block'], ['麦冬', '四川绵阳', 'spindle']] },
  { key: 'he', cx: 74, x0: -214, x1: 362, rows: [120, 236, 352], split: [3, 4, 3], t: T.pour.he, mark: '和', q1: '以薯蓣为主理脾胃', q2: '上损下损至此可以撑持', src: '金匮要略辑义',
    herbs: [['山药', '河南温县', 'oval', '君 三十分'], ['甘草', '内蒙古', 'slice', '廿八分'], ['大枣', '山东乐陵', 'date', '百枚为膏'], ['茯苓', '云南', 'cube'], ['白术', '浙江於潜', 'slice'], ['桔梗', '安徽太和', 'stem'], ['杏仁', '河北承德', 'kernel'], ['神曲', '六味发酵', 'qu'], ['豆黄卷', '黑豆发芽', 'sprout'], ['白蔹', '河南', 'stem']] },
  { key: 'yang', cx: 652, x0: 430, x1: 880, rows: [176, 312], split: [3, 3], t: T.pour.yang, mark: '阳', q1: '阳虚者宜补而兼暖', q2: '桂姜之属', src: '景岳全书',
    herbs: [['人参', '吉林抚松', 'root'], ['桂枝', '广西平南', 'twig'], ['干姜', '四川犍为', 'slice'], ['川芎', '四川彭州', 'slice'], ['柴胡', '山西万荣', 'stem'], ['防风', '黑龙江', 'stem']] },
];
for (const r of ROUTES) {
  r.jx = r.cx + 170; r.jy = -372; r.tilt = -2.05;
  r.mouth = [r.jx + 150 * Math.sin(r.tilt), r.jy - 150 * Math.cos(r.tilt)];
  r.jar = buildJar(r.mark, r.cx + 900);
  const H = r.herbs.length, D = r.t[1] - r.t[0] + .3; let k = 0;
  r.piles = [];
  r.split.forEach((n, row) => {
    for (let j = 0; j < n; j++, k++) {
      const [name, from, kind, note] = r.herbs[k], px = lerp(r.x0, r.x1, (j + .5) / n) + (row % 2 ? 14 : -10), py = r.rows[row];
      const R = mulberry(r.cx * 7 + k * 31 + 5), t0 = r.t[0] + .35 + D * k / H, t1 = r.t[0] + .35 + D * (k + .8) / H, n2 = kind === 'oval' || kind === 'stem' || kind === 'twig' ? 8 : 7;
      const pieces = Array.from({ length: n2 }, (_, m) => {
        const sd = r.cx * 3 + k * 50 + m * 7 + 11;
        return { x: px + (R() * 2 - 1) * 36 * (1 - m / n2 * .5), y: py - m * 3.6 - R() * 7, rot: (R() - .5) * (kind === 'twig' || kind === 'stem' ? 2.6 : 1.6), s: (kind === 'stem' || kind === 'twig' ? .72 : .92) + R() * .2, ops: KIND[kind](mulberry(sd), sd), tl: lerp(t0, t1, m / (n2 - 1)), spin: (R() - .5) * 5, wob: (R() - .5) * 60 };
      });
      r.piles.push({ name, from, note, px, py, t1, pieces });
    }
  });
}
const VC = `rgb(${VERM.join(',')})`;

export function paint(A, t, cam, TMP) {
  const L = A.ink;
  A.xf(cam.s, cam.tx, cam.ty);
  for (const r of ROUTES) {
    const jp = seg(t, r.t[0] - 1.1, r.t[0] - .5);
    if (jp <= 0) continue;
    const tk = eo(seg(t, r.t[0] - .25, r.t[0] + .3)) - .62 * ss(seg(t, r.t[1] + .15, r.t[1] + 1.0));
    const rot = r.tilt * tk + Math.sin(t * 9 + r.cx) * .012 * seg(t, r.t[0], r.t[0] + .2) * (1 - seg(t, r.t[1], r.t[1] + .3));
    // 气：阴重，贴纸洇开一层墨；阳轻，几缕淡墨上行
    const after = seg(t, r.t[1] - .2, r.t[1] + 1.2);
    if (r.key === 'yin') wash(L.wet, r.cx, (r.rows[0] + r.rows[1]) / 2 + 40, 250 * (.5 + .5 * seg(t, r.t[0], r.t[1] + .8)), 64, .12 * seg(t, r.t[0] + .3, r.t[1] + .8), 81);
    for (const p of r.piles) {
      wash(L.wet, p.px, p.py + 12, 48, 9, .14 * seg(t, p.pieces[0].tl - .1, p.t1), p.px | 0);
      for (const pc of p.pieces) {
        const u = (t - (pc.tl - .42)) / .42;
        if (u <= 0) continue;
        let x = pc.x, y = pc.y, rot2 = pc.rot, am = 1;
        if (u < 1) { const e = u * u; x = lerp(r.mouth[0], pc.x, u) + pc.wob * Math.sin(u * 3.14) * .6; y = lerp(r.mouth[1], pc.y, e); rot2 = pc.rot + (1 - u) * pc.spin; am = clamp(u * 5); }
        local(A, x, y, rot2, pc.s, pc.s, LL => drawPiece(LL, pc.ops, am));
      }
    }
    if (r.key === 'yang' && after > 0) for (let i = 0; i < 3; i++) { const u = ((t - r.t[1]) * .28 + i * .33) % 1, p = r.piles[i * 2]; ink(L, mk([[p.px, p.py - 34], [p.px + 22, p.py - 120], [p.px - 14, p.py - 210], [p.px + 18, p.py - 300]], { w: 30, tone: .08, dry: .1, wet: 1, prof: 'lens', rough: .5, seed: 700 + i }), clamp(u * 1.6), after * Math.sin(u * Math.PI)); }
    drawJar(A, r.jar, r.jx, r.jy, rot, 1, jp);
    // 题：大字 + 两行原文（分类）+ 出处；每堆下：药名、产地，方中要点用朱
    const sx = r.cx - 156;
    column(A, cam, r.mark, sx, -118, 84, seg(t, r.t[0] + .2, r.t[0] + .6));
    column(A, cam, r.q1, sx - 62, -176, 28, seg(t, r.t[0] + .6, r.t[0] + 1.5), { tone: .9 });
    column(A, cam, r.q2, sx - 98, -176, r.q2.length > 8 ? 25 : 28, seg(t, r.t[0] + 1.1, r.t[0] + 2.0), { tone: .9 });
    column(A, cam, r.src, sx - 130, -176, 19, seg(t, r.t[0] + 1.9, r.t[0] + 2.3), { font: KAI, tone: .58, wet: .1, gap: 1.12 });
    for (const p of r.piles) {
      const k = seg(t, p.t1 + .05, p.t1 + .35);
      const b = line(A, cam, p.name, p.px, p.py + 36, 22, k * .92, { align: 'center', sp: 2, wet: .12 });
      line(A, cam, p.from, p.px, p.py + 63, 16, k * .6, { align: 'center', sp: 2, wet: .08 });
      if (p.note && k > 0) { const c = A.cc; c.save(); c.setTransform(cam.s, 0, 0, cam.s, cam.tx, cam.ty); c.globalAlpha = k * .9; c.fillStyle = VC; c.font = `15px ${KAI}`; c.textBaseline = 'middle'; c.fillText(p.note, b.x1 + 5, p.py + 37); c.restore(); }
    }
    A.xf(cam.s, cam.tx, cam.ty);
  }
  // 《景岳全书》：阴阳互根
  const [q0, q1] = T.quote;
  column(A, cam, '善补阳者必于阴中求阳', -834, -262, 42, seg(t, q0, lerp(q0, q1, .5)));
  column(A, cam, '善补阴者必于阳中求阴', -886, -262, 42, seg(t, lerp(q0, q1, .5), q1));
  column(A, cam, '景岳全书', -886, 214, 22, seg(t, q1, q1 + .4), { font: KAI, tone: .6, wet: .12, gap: 1.15 });
  column(A, cam, '壹 选材', 916, 300, 26, seg(t, T.pour.yang[0] - 1, T.pour.yang[0] - .5), { tone: .8 });
  A.xf(cam.s, cam.tx, cam.ty);
}
