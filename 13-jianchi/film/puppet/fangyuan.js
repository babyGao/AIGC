// 方源皮影（照 lemo-opuscar 皮影 demo 的 houyi.js 做法：一片片刻好的驴皮贴图 + 关节铆钉 + IK 手臂 + 摆动件）
// 头：侧脸轮廓、眉眼、耳、刘海、鬓发都是从用户参考图（assets/ref/fangyuan.webp 左二侧身）逐点量来的
// （同一组点见 shared/models/fangyuan.js FACE_SIDE），镜像成朝右、缩放进皮影头。画法照皮影的“空脸”：脸心镂空，只留细皮线。
// 身：白衣大袖、黑腰带（已定方案）；长直发垂过臀；皮影只演侧身，脸朝右（需要朝左时整个人镜像）。
// 坐标单位 = 1920×1080 幕布 px（机位 1×），枢轴 = 腰。
import { piece, drawPiece, fill, cut, cutLine, cutTaper, ink, within, smooth, poly, lattice, coin, cloud, beads, beadLine, plum, waves, meander, rivet, DYE } from './carve.js';
const sp = (pts, sharp = []) => q => spline(q, pts, true, sharp);
import { mul, T, R, S, ap, set, ik } from './rig.js';
import { mulberry } from '/core/lib.js';

export const C = { robe: '#efe2c2', robe2: '#d6bf8e', lining: '#c9a36a', band: DYE.teal, band2: DYE.jade, ink: DYE.ink, skin: DYE.skin };
const HK = 1.35;
// 过点的平滑闭合/开放路径（Catmull-Rom），sharp 里的下标是尖角（衣摆的角要尖，不能被抹圆）
export function spline(q, pts, closed = true, sharp = []) {
  const n = pts.length, P = i => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))], sh = new Set(sharp);
  q.moveTo(...pts[0]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), k1 = sh.has(i % n) ? 0 : 1 / 6, k2 = sh.has((i + 1) % n) ? 0 : 1 / 6;
    q.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k1, p1[1] + (p2[1] - p0[1]) * k1, p2[0] - (p3[0] - p1[0]) * k2, p2[1] - (p3[1] - p1[1]) * k2, p2[0], p2[1]);
  }
  if (closed) q.closePath();
}
// 参考图像素 → 头的局部坐标（朝右；颈根在原点）
const F = ([X, Y]) => [(436 - X) * .6, (Y - 240) * .6];
const FP = pts => pts.map(F);
export const J = {
  neck: [5, -128], shF: [13, -112], shB: [-4, -114], rod: [4, -122],
  hipF: [10, 2], hipB: [-10, 2], elbow: [0, 60], wrist: [0, 80],
  hair: [-36 * HK, -10 * HK], hair2: [2, 128], tails: [31, -14],
};
export const LEGLEN = 292;
export const UA = 60, FA = 80, HANDR = 12;

// ================= 头 =================
const PROFILE = FP([[430.5, 262], [429, 245], [427, 232], [425, 228], [422, 224], [420.6, 220.2], [421, 217.2], [418.8, 215], [419.6, 213.6], [418, 212], [416, 210], [413, 207.6], [408.6, 206.2], [407.2, 203.8], [408.6, 200.6], [411, 196], [413, 191], [414.6, 186], [415.4, 180], [415, 174], [413.6, 168], [412, 160], [410.8, 152], [410.4, 146]]);
const HAIR = FP([[405, 147], [412, 134], [424, 126], [440, 121], [455, 119.5], [472, 123], [486, 131], [497, 145], [504, 165], [508, 190], [511, 215], [512, 236], [488, 239], [473, 232], [468, 214], [469, 196], [468, 181], [462, 170], [453, 163], [445, 176], [440, 163], [432.5, 174], [428.5, 162], [420.5, 173], [416, 162], [410, 169], [407, 158]]);   // 顶发 + 额前刘海（盖住额头，下沿在眉上）
function lockPts(a, b) { return FP(a.concat(b.slice().reverse())); }
function head() {
  return piece([-50 * HK, -80 * HK, 34 * HK, 18 * HK], g => {
    g.scale(HK, HK);
    const strand = (pts, w0, tip = .12) => {   // 一缕发：中线点列（参考图坐标）→ 由粗到尖的一片墨皮
      const A = FP(pts), n = A.length, L = [], Rr = [];
      for (let i = 0; i < n; i++) { const t = i / (n - 1), a = A[Math.max(0, i - 1)], b = A[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, hw = w0 * .5 * (1 - t) ** .85 + tip; L.push([A[i][0] - dy / l * hw, A[i][1] + dx / l * hw]); Rr.push([A[i][0] + dy / l * hw, A[i][1] - dx / l * hw]); }
      fill(g, C.ink, q => spline(q, L.concat(Rr.reverse()), true, [n - 1, n]), 'nonzero');
    };
    // 顶发 + 刘海：盖住额头，下沿压在眉上；发丝刻成长短不一的尖缝，从发旋往前、往后梳开
    const hair = q => spline(q, HAIR, true, [18, 20, 22, 24]);
    fill(g, C.ink, hair);
    within(g, hair, () => {
      const cq = (A, Cc, B, w) => { const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8, u = 1 - t; pts.push(F([u * u * A[0] + 2 * u * t * Cc[0] + t * t * B[0], u * u * A[1] + 2 * u * t * Cc[1] + t * t * B[1]])); } cutTaper(g, pts, w); };
      // 前半：从发旋往前梳，弯下来到刘海的各个发梢
      [[409, 160], [414, 158], [420, 166], [426, 160], [432, 168], [438, 160], [444, 170]].forEach((e, k) => cq([446 - k * 1.2, 123 + k * .5], [e[0] + 4 - k, 127 + k * 2.5], e, 1.15));
      // 后半：从发旋往后、往下顺着后脑弯下去
      [[474, 230], [482, 234], [490, 234], [498, 230], [504, 216]].forEach((e, k) => cq([456 + k * 3, 123 + k * .8], [478 + k * 6.5, 128 + k * 5], e, 1.3));
      // 耳上耳后：几道短的
      [[461, 168], [466, 196], [470, 214]].forEach((e, k) => cq([458 + k * 2, 140 + k * 8], [e[0] + 4, (140 + e[1]) / 2], e, .9));
    });
    // 额前垂下的几缕：最前一缕挂在脸前（到鼻尖高），一缕在眼后，鬓边一缕在耳前垂到下颌
    strand([[408, 150], [403, 163], [400.5, 178], [401.5, 192], [405, 205]], 3.4);
    strand([[413, 160], [410.5, 170], [409.5, 179]], 2.4);
    strand([[436, 168], [437.5, 178], [435.5, 189], [433, 196]], 3);
    strand([[446, 164], [448.5, 182], [450.5, 202], [452, 220], [452.5, 236]], 3.6);
    // 耳：在发前露出来（耳洞 + 细皮线）
    const ear = q => spline(q, FP([[456, 178], [461, 173.5], [465.5, 180], [466, 191], [461.5, 200.5], [456.5, 198]]));
    fill(g, C.ink, q => spline(q, FP([[454, 175], [461, 170.5], [468.5, 179], [469, 192], [462.5, 203.5], [454.5, 200]])));   // 耳后留一圈墨（与头发连成一体）
    cut(g, ear); ink(g, 1.3, ear); ink(g, .9, q => { const a = F([459, 181]), b = F([462.5, 186]), c = F([459.5, 194]); q.moveTo(...a); q.quadraticCurveTo(...b, ...c); });
    // 空脸：脸心全镂空，只留轮廓线
    ink(g, 2.1, q => spline(q, PROFILE.slice(2), false, [10, 11]));
    ink(g, 1.15, q => { const p = FP([[426, 228.6], [436, 228.4], [445, 222], [450, 214]]); q.moveTo(...p[0]); q.bezierCurveTo(...p[1], ...p[2], ...p[3]); });      // 下颌（没进鬓发）
    ink(g, 1.8, q => { const p = FP([[427.5, 232], [428.6, 242], [429.6, 252]]); q.moveTo(...p[0]); q.quadraticCurveTo(...p[1], ...p[2]); });                          // 颈
    // 眉：细长、平直，眉尾略扬（眉头露在刘海下）
    fill(g, C.ink, q => spline(q, FP([[413.4, 176.4], [418, 175.2], [423.5, 175.4], [429.6, 177], [430, 178.2], [423.5, 176.8], [418, 176.8], [413.6, 177.8]])));
    // 眼：丹凤长眼，上睑压低盖住半个瞳仁 —— 垂眼，面无表情
    const up = FP([[415.4, 181], [419, 180.2], [423.5, 180.8], [428, 182.8]]), lo = FP([[415.8, 181.4], [418.5, 183.8], [422.5, 184.6], [427, 183.4]]);
    ink(g, 1.6, q => { q.moveTo(...up[0]); q.bezierCurveTo(...up[1], ...up[2], ...up[3]); });
    ink(g, .75, q => { q.moveTo(...lo[0]); q.bezierCurveTo(...lo[1], ...lo[2], ...lo[3]); });
    ink(g, .6, q => { const a = FP([[416.4, 179.2], [421, 178.4], [426.5, 180.6]]); q.moveTo(...a[0]); q.quadraticCurveTo(...a[1], ...a[2]); });
    g.save(); g.beginPath(); g.moveTo(...up[0]); g.bezierCurveTo(...up[1], ...up[2], ...up[3]); g.bezierCurveTo(...lo[2], ...lo[1], ...lo[0]); g.closePath(); g.clip();
    g.beginPath(); g.arc(...F([419.8, 184.2]), 1.55, 0, Math.PI * 2); g.fillStyle = C.ink; g.fill(); g.restore();
    // 鼻翼、嘴
    ink(g, .9, q => { const a = FP([[411.6, 204.6], [413.4, 202], [411.2, 201]]); q.moveTo(...a[0]); q.quadraticCurveTo(...a[1], ...a[2]); });
    ink(g, 1.05, q => { q.moveTo(...F([419.6, 213.6])); q.lineTo(...F([424.6, 213.4])); });
  }, { seed: 61 });
}
// —— 背后长发：两片（后脑 → 背 → 过臀），铆在一起，走路时荡 ——
function hairUpper() {
  return piece([-34, -14, 34, 146], g => {
    const h = sp([[-20, -10], [16, -10], [22, 26], [22, 70], [19, 112], [16, 140], [-12, 140], [-19, 108], [-23, 64], [-24, 20]]);
    fill(g, C.ink, h);
    within(g, h, () => { const r = mulberry(5); for (let k = 0; k < 9; k++) { const x = -19 + k * 4.4 + (r() - .5) * 1.5, y0 = -4 + r() * 30, y1 = 70 + r() * 70; cutTaper(g, [[x + 1, y0], [x - 1 + k * .2, (y0 + y1) / 2], [x + .5 - k * .15, y1]], .9 + r() * .5); } });
    ink(g, 1.8, h);
  }, { seed: 62 });
}
function hairLower() {
  return piece([-28, -12, 30, 150], g => {
    const h = sp([[-16, -8], [16, -8], [20, 40], [17, 92], [19, 126], [12, 112], [10, 138], [4, 116], [0, 136], [-4, 114], [-9, 128], [-11, 108], [-17, 118], [-15, 92], [-19, 40]], [4, 5, 6, 7, 8, 9, 10, 11, 12]);
    fill(g, C.ink, h);
    within(g, h, () => { const r = mulberry(6); for (let k = 0; k < 8; k++) { const x = -14 + k * 4.2 + (r() - .5) * 1.5, y0 = -6 + r() * 20, y1 = 60 + r() * 50; cutTaper(g, [[x, y0], [x + 1.4, (y0 + y1) / 2], [x - .5 + k * .2, y1]], .9 + r() * .5); } });
    ink(g, 1.7, h);
  }, { seed: 63 });
}

// ================= 身 =================
const BODY = [[-29, 6], [-32, -30], [-33, -70], [-30, -100], [-22, -118], [-9, -126], [7, -129], [20, -124], [29, -110], [34, -90], [36, -62], [34, -34], [31, -10], [30, 6]];
function chest() {
  return piece([-42, -140, 48, 14], g => {
    const body = sp(BODY, [0, 13]);
    fill(g, C.robe, body);
    within(g, body, () => {
      lattice(g, -36, -124, 38, -28, 8.6, 1.9);                                    // 锦地：满身菱格镂空
      for (const [x, y, r] of [[-8, -80, 14], [14, -52, 12]]) { fill(g, C.robe, q => q.arc(x, y, r, 0, 7)); cloud(g, x, y, r * .68, x * .1, 1.4, 1); beads(g, Array.from({ length: 13 }, (_, i) => [x + Math.cos(i / 13 * 6.283) * (r - 2.4), y + Math.sin(i / 13 * 6.283) * (r - 2.4)]), 1.05); ink(g, 1.3, q => q.arc(x, y, r, 0, 7)); }   // 团花
    });
    // 交领：白内领 + 靛青领缘（从后颈绕到胸前、斜下到腰），领缘刻一串梅花孔
    const inner = q => smooth(q, [[-6, -127], [6, -131], [15, -128], [21, -118], [15, -113], [9, -121], [0, -122]]);
    fill(g, DYE.white, inner); ink(g, 1.2, inner);
    const band = q => smooth(q, [[-10, -126], [4, -130], [14, -127], [24, -111], [31, -86], [34, -58], [32, -30], [24, -30], [25, -58], [23, -84], [16, -105], [8, -120], [-6, -121]]);
    fill(g, C.band, band); within(g, band, () => { for (let k = 0; k < 7; k++) { const y = -110 + k * 12.6, x = 15 + Math.min(k, 3) * 3.6; plum(g, x + 4, y, 2.3); } }); ink(g, 1.5, band);
    // 腰带：墨色宽带 + 一排古钱孔 + 前面一个结
    const belt = q => poly(q, [[-33, -34], [35, -34], [34, -6], [-31, -6]]);
    fill(g, C.ink, belt); within(g, belt, () => { for (let x = -26; x < 28; x += 9.6) coin(g, x, -20, 4); cutLine(g, .9, q => { q.moveTo(-32, -30); q.lineTo(34, -30); q.moveTo(-31, -10); q.lineTo(34, -10); }); }); ink(g, 1.4, belt, '#000');
    const knot = q => smooth(q, [[26, -32], [38, -30], [40, -18], [34, -6], [24, -10], [22, -24]]);
    fill(g, C.ink, knot); cloud(g, 31.5, -19, 5.4, .4, 1.2, 1); ink(g, 1.3, knot, '#000');
    ink(g, 2.6, body);
  }, { seed: 64 });
}
// 腰带垂下的两根带尾（摆动件，铆在腰结上）
function tails() {
  return piece([-14, -6, 18, 150], g => {
    for (const [dx, len, w] of [[-2, 132, 6.5], [6, 116, 5.8]]) {
      const t = q => smooth(q, [[dx - w / 2, 0], [dx + w / 2, 0], [dx + w / 2 + 1, len * .6], [dx + w / 2 + 2, len], [dx - w / 2 + 2, len], [dx - w / 2, len * .6]]);
      fill(g, C.ink, t); within(g, t, () => { for (let y = 14; y < len - 10; y += 15) coin(g, dx + .6, y, 2.4); }); ink(g, 1.1, t, '#000');
      const tas = q => smooth(q, [[dx - 3, len - 2], [dx + 5, len - 2], [dx + 6, len + 10], [dx + 1, len + 14], [dx - 3, len + 10]]);
      fill(g, C.band, tas); for (let k = 0; k < 3; k++) cutLine(g, .8, q => { q.moveTo(dx - 1 + k * 2, len + 2); q.lineTo(dx - 1.5 + k * 2.4, len + 12); }); ink(g, 1, tas);
    }
  }, { seed: 65 });
}
// 下摆：一件 A 字长袍，前后两片互相压住（走路时前片随前腿往前张、后片往后），里面一片衬里
const SK_B = [[-31, -6], [20, -6], [20, 90], [18, 180], [16, 272], [-26, 270], [-74, 266], [-58, 176], [-44, 84]];
const SK_F = [[-12, -6], [33, -6], [44, 84], [58, 176], [80, 268], [36, 274], [-8, 276], [-10, 180], [-12, 90]];
function skirt() {   // 一件长袍下摆：后片在下、前片压在上（同一张皮里画，重叠处不发黑）
  return piece([-82, -12, 86, 282], g => {
    for (const front of [false, true]) {
      const P = front ? SK_F : SK_B, f = q => spline(q, P, true, [0, 1, 4, 6]);
      fill(g, C.robe, f);
      within(g, f, () => {
        for (let y = 22, r = 0; y < 232; y += 19, r++) for (let x = (front ? -14 : -74) + (r % 2) * 8.5; x < (front ? 82 : 26); x += 17) cloud(g, x, y, 6.8, (x + y) * .07, 1.7, (r + Math.round(x / 17)) % 2 ? 1 : -1);
        for (const [x0, x1] of front ? [[8, 14], [24, 46]] : [[0, -6], [-18, -40]]) cutLine(g, 1.7, q => { q.moveTo(x0, 6); q.quadraticCurveTo((x0 + x1) / 2, 130, x1, 238); });
        const hem = q => spline(q, front ? [[-12, 240], [72, 234], [82, 270], [-8, 278]] : [[20, 240], [-66, 234], [-76, 268], [18, 274]], true, [0, 1, 2, 3]);
        fill(g, C.band, hem); within(g, hem, () => waves(g, front ? -20 : -80, 245, front ? 84 : 24, 276, 5.4, 1.4)); ink(g, 1.4, hem);
      });
      g.save(); g.beginPath(); f(g); g.clip(); ink(g, 6, f, C.robe2); g.restore();
      ink(g, 2.5, f);
    }
  }, { seed: 66 });
}
function lining() {
  return piece([-60, 60, 70, 280], g => {
    const f = q => spline(q, [[-30, 70], [36, 70], [64, 268], [-60, 268]], true, [0, 1, 2, 3]);
    fill(g, C.lining, f); within(g, f, () => lattice(g, -60, 80, 70, 270, 10, 2.2)); ink(g, 1.4, f);
  }, { seed: 73 });
}
// 腿：只露出脚面以下 —— 一截靛青裤脚 + 云头履（黑鞋面刻云头、厚白底）
function leg() {
  return piece([-18, 220, 46, 298], g => {
    const tr = q => smooth(q, [[-11, 222], [11, 222], [12, 262], [-11, 264]]);
    fill(g, C.band, tr); ink(g, 1.3, tr);
    const shoe = q => smooth(q, [[-12, 260], [12, 258], [16, 270], [28, 274], [38, 272], [42, 266], [45, 276], [39, 284], [-13, 284]]);
    fill(g, C.ink, shoe); within(g, shoe, () => { cloud(g, 34, 274, 4.6, 0, 1.3, 1); cutLine(g, 1, q => { q.moveTo(-10, 268); q.quadraticCurveTo(10, 266, 26, 274); }); }); ink(g, 1.1, shoe, '#000');
    const sole = q => poly(q, [[-14, 283], [41, 282], [40, 292], [-13, 293]]);
    fill(g, DYE.white, sole); within(g, sole, () => { for (let x = -9; x < 38; x += 6) cut(g, q => q.ellipse(x, 287.5, 1.8, 2.4, 0, 0, 7)); }); ink(g, 1.4, sole);
  }, { seed: 68 });
}
// ================= 手臂（大袖）=================
// 上臂：肩头到肘，宽；前臂：喇叭形大袖，袖兜垂在“下方”一侧（局部 -x：手臂下垂时拖在身后，手臂往前平伸时自然垂到下面）
function upperArm() {
  return piece([-26, -24, 26, 76], g => {
    const sl = sp([[-18, -14], [6, -21], [20, -4], [19, 30], [17, 64], [-17, 64], [-21, 28]]);
    fill(g, C.robe, sl); within(g, sl, () => { lattice(g, -22, -20, 22, 66, 7.8, 1.8); const cap = sp([[-19, -10], [6, -18], [19, -4], [18, 8], [4, 0], [-18, 6]]); fill(g, C.band, cap); within(g, cap, () => beadLine(g, -14, -2, 14, -6, 1.3, 4.6)); ink(g, 1.3, cap); }); ink(g, 2.2, sl);
    fill(g, C.robe, q => q.arc(0, 58, 13, 0, 7)); ink(g, 1.5, q => q.arc(0, 58, 13, 0, 7));
  }, { seed: 69 });
}
const SLEEVE = [[-15, -6], [15, -6], [21, 36], [27, 72], [29, 92], [10, 94], [-8, 92], [-32, 116], [-54, 134], [-70, 126], [-66, 90], [-48, 50], [-24, 14]];
function foreArm() {
  return piece([-78, -18, 36, 142], g => {
    const sl = sp(SLEEVE, [4, 9]);
    fill(g, C.robe, sl);
    within(g, sl, () => {
      for (let y = 6, r = 0; y < 130; y += 15, r++) for (let x = -70 + (r % 2) * 7; x < 30; x += 14) cloud(g, x, y, 5.4, (x - y) * .08, 1.5, r % 2 ? 1 : -1);
      const cuff = sp([[26, 58], [29, 92], [10, 94], [-8, 92], [-32, 116], [-54, 134], [-70, 126], [-66, 100], [-48, 86], [-22, 70], [4, 58]], [1, 6]);
      fill(g, C.band, cuff); within(g, cuff, () => { waves(g, -76, 70, 34, 140, 5.6, 1.5); }); ink(g, 1.5, q => { q.moveTo(-64, 104); q.quadraticCurveTo(-34, 92, -8, 74); q.lineTo(26, 70); }); ink(g, 1.3, cuff);
    });
    g.save(); g.beginPath(); sl(g); g.clip(); ink(g, 4.4, sl, C.robe2); g.restore();
    ink(g, 2.4, sl);
    fill(g, C.robe, q => q.arc(0, 0, 11, 0, 7)); ink(g, 1.4, q => q.arc(0, 0, 11, 0, 7));
  }, { seed: 70 });
}
function hand(kind) {
  return piece([-14, -6, 20, 30], g => {
    const f = kind === 'open'
      ? q => smooth(q, [[-7, -1], [7, -1], [10, 6], [16, 12], [17, 16], [10, 17], [2, 16], [-6, 12]])
      : q => smooth(q, [[-6, -1], [7, -1], [9, 8], [9, 18], [5, 24], [-1, 23], [-6, 15]]);
    fill(g, C.skin, f);
    if (kind === 'open') { cutLine(g, .8, q => { q.moveTo(4, 9); q.lineTo(14, 13.5); }); cutLine(g, .7, q => { q.moveTo(2, 11.5); q.lineTo(11, 15.4); }); }
    else { cutLine(g, .8, q => { q.moveTo(3, 7); q.quadraticCurveTo(7, 12, 6, 19); }); cutLine(g, .7, q => { q.moveTo(-1, 12); q.lineTo(2, 20); }); }
    ink(g, 1.5, f);
  }, { seed: 72 });
}

let P = null;
export function build() {
  if (P) return P;
  P = { head: head(), hairU: hairUpper(), hairL: hairLower(), chest: chest(), tails: tails(), skirt: skirt(), leg: leg(), ua: upperArm(), fa: foreArm(), handOpen: hand('open'), handHang: hand('hang') };
  return P;
}

// ================= 姿势 → 画到透射率画布 =================
// pose: { x, y, rot, head, waist, legF, legB, armF:[dx,dy] 近侧手目标（相对肩）, armB, bendF, bendB, handF:'open'|'hang', handB,
//         hair:[a1,a2] 两片长发的摆角（相对竖直下垂）, tails 带尾摆角, flip }
export const REST = { x: 0, y: 0, rot: 0, head: 0, waist: 0, legF: -.04, legB: .05, armF: [16, 138], armB: [-12, 140], bendF: 1, bendB: 1, handF: 'hang', handB: 'hang', hair: [.04, 0], tails: 0, flip: false };
export function drawFangyuan(g, Cam, pose, opt = {}) {
  const P = build(), p = { ...REST, ...pose };
  const MW = mul(T(p.x, p.y), mul(p.flip ? S(-1, 1) : S(1), R(p.rot)));
  const W = mul(Cam, MW);
  const Mskirt = mul(W, R(p.waist));
  const MlegB = mul(Mskirt, mul(T(...J.hipB), R(p.legB))), MlegF = mul(Mskirt, mul(T(...J.hipF), R(p.legF)));
  const Msk = mul(Mskirt, R((p.legF + p.legB) * .12));
  const Mhead = mul(W, mul(T(...J.neck), R(p.head)));
  const Mhair = mul(Mhead, mul(T(...J.hair), R(-(p.rot + p.head) + p.hair[0])));     // 长发：世界里朝下 + 摆角
  const Mhair2 = mul(Mhair, mul(T(...J.hair2), R(p.hair[1])));
  const Mtails = mul(W, mul(T(...J.tails), R(-p.rot + p.tails)));
  const arm = (sh, tgt, bend) => {
    const sL = [J[sh][0], J[sh][1]], tL = [J[sh][0] + tgt[0], J[sh][1] + tgt[1]];
    const [a1, a2] = ik(sL, tL, UA, FA + HANDR, bend);
    const Mu = mul(W, mul(T(...J[sh]), R(a1)));
    const Mf = mul(Mu, mul(T(...J.elbow), R(a2 - a1)));
    const Mh = mul(Mf, T(...J.wrist));
    return [Mu, Mf, Mh];
  };
  const [MuB, MfB, MhB] = arm('shB', p.armB, p.bendB);
  const [MuF, MfF, MhF] = arm('shF', p.armF, p.bendF);
  const dp = (M, pc) => { set(g, M); drawPiece(g, pc); };
  g.save(); g.globalCompositeOperation = 'multiply';
  // 画序：远臂 → 后腿 → 前腿 → 下摆 → 身 → 带尾 → 长发 → [夹带物] → 头 → 近臂
  dp(MhB, p.handB === 'open' ? P.handOpen : P.handHang); dp(MfB, P.fa); dp(MuB, P.ua);
  dp(MlegB, P.leg); dp(MlegF, P.leg); dp(Msk, P.skirt);
  dp(W, P.chest); dp(Mtails, P.tails);
  dp(Mhair2, P.hairL); dp(Mhair, P.hairU);
  g.restore();
  const between = opt.between ? opt.between({ W, MhF, MfF, MuF }) : null;   // 夹在腋下的东西（马鸿运的尸体）画在身子与近臂之间
  g.save(); g.globalCompositeOperation = 'multiply';
  dp(Mhead, P.head);
  dp(MhF, p.handF === 'open' ? P.handOpen : P.handHang); dp(MfF, P.fa); dp(MuF, P.ua);
  g.restore();
  set(g, [1, 0, 0, 1, 0, 0]);
  const camK = Math.hypot(Cam[0], Cam[1]), riv = [];
  const rv = (M, x, y) => riv.push(ap(M, x, y));
  rv(W, ...J.neck); rv(W, ...J.shB); rv(W, ...J.shF); rv(W, 0, 0); rv(Mhead, ...J.hair); rv(Mhair, ...J.hair2);
  rv(Mskirt, ...J.hipB); rv(Mskirt, ...J.hipF); rv(MuB, ...J.elbow); rv(MuF, ...J.elbow); rv(W, ...J.tails);
  if (opt.rivets !== false) for (const q of riv) rivet(g, q[0], q[1], 3.2 * camK);
  const rods = [ap(W, ...J.rod), ap(MhB, 0, 8), ap(MhF, 0, 8)];
  return { rods, rivets: riv, M: { W, Mhead, MuB, MfB, MhB, MuF, MfF, MhF, Mskirt, MlegB, MlegF, Mhair }, between };
}
