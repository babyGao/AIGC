// 逆流河 · 北原草原（远景）。照 lemo-opuscar impasto demo 的 wide.js 做法：一点透视，天空云团，地面分带越近笔越大，倒影是横向短笔叠起来。
// 场景单位 2112 x 1188（1.1 倍画幅），地平线 HZ。机位低，在下游的水面上往上游看：河宽得看不到近岸，
// 远岸是地平线两头的两条草原；河从灭点（上游，“没有尽头”，那头一团亮）冲向镜头（下游）。
// 依据（docs/角色与场景.md、docs/素材库.md 的逆流河一节，refs/river/*）：
//   上游（方源脚下）：水面平静、缓、浅，到最前端连脚面都盖不住。
//   下游：激流汹涌、惊涛恶浪，卷着野兽尸体、石头和树木（第257节），血染过河水。
//   河外：左岸北原（雪胡老祖一方），右岸长生天（毛里球，小山般的狗尾紫貂），天上中洲群仙。
import { Ref, paintRef, rnd } from '../engine/plate.js';
import { KNIFE, BRUSH, DAB, LINE, hex, shade } from '../engine/impasto.js';
import { P, E, lin, rad, lerp, hash, clamp } from './common.js';

export const VW = 2112, VH = 1188, HZ = 452, VP = [700, HZ];
export const depth = y => clamp((y - HZ) / (VH - HZ), .002, 1.3);  // 0 = 地平线, 1 = 画面底
const BL = -7000, BR = 9000;
const bankL = y => lerp(VP[0], BL, depth(y));                      // 左远岸线 x(y)：河极宽，近岸看不到
const bankR = y => lerp(VP[0], BR, depth(y));                      // 右远岸线 x(y)
export const figH = y => 900 * depth(y);                           // 站在 y 处的人有多高（场景单位）
export const FANG = { x: 930, y: 640 };                             // 方源脚下（中景，静水）
export const rough = (x, y) => clamp((depth(y) - .22) / .25, 0, 1) * clamp(Math.abs(x - FANG.x) / 320 + (depth(y) - .3) * 3.5, 0, 1);   // 0 静 .. 1 汹涌

// 一堵迎面压来的浪：浪身和周围的水差不多暗，上半透着青灰的光；顶上一道不齐的白沫，浪大的才挂一两条沫爪
function waveWall(R, cx, cy, w, h, k, id, claws = k > .7 ? 2 : 0) {
  const pk = cx + w * (hash(id * 3.1) - .3) * .3, H = h * .8;   // 浪峰略偏右（往下游倒）
  const body = c => { c.moveTo(cx - w / 2, cy + H * .25); c.bezierCurveTo(cx - w * .25, cy - H * .2, pk - w * .22, cy - H, pk, cy - H); c.bezierCurveTo(pk + w * .12, cy - H, cx + w * .3, cy - H * .2, cx + w / 2, cy + H * .2); c.lineTo(cx + w / 2, cy + H * .4); c.lineTo(cx - w / 2, cy + H * .45); c.closePath(); };
  R.fill(body, lin(0, cy - H, 0, cy + H * .45, [[0, '#8ea6ae'], [.35, '#617a86'], [.75, '#435562'], [1, '#34444f']]), { dir: { fn: (px) => (px < pk ? -1 : 1) * .3 + Math.PI / 2 }, group: 'wv' + id, maxR: 5 + 12 * k, aj: .3, jit: .08 });
  // 浪顶白沫：两三段鼓起，不齐
  R.fill(c => { c.moveTo(cx - w * .3, cy - H * .25); c.bezierCurveTo(cx - w * .2, cy - H * .62, pk - w * .2, cy - H * 1.12, pk - w * .04, cy - H * 1.06);
    c.bezierCurveTo(pk + w * .02, cy - H * 1.18, pk + w * .16, cy - H * 1.02, cx + w * .34, cy - H * .3); c.bezierCurveTo(cx + w * .2, cy - H * .5, pk + w * .1, cy - H * .74, pk, cy - H * .8);
    c.bezierCurveTo(pk - w * .14, cy - H * .76, cx - w * .18, cy - H * .42, cx - w * .3, cy - H * .25); c.closePath(); },
    lin(0, cy - H * 1.1, 0, cy - H * .3, [[0, '#fbfaf6'], [1, '#d6dcde']]), { dir: 'edge', fallback: 0, group: 'wf' + id, maxR: 3 + 8 * k, hgt: 1.45 });
  for (let j = 0; j < claws; j++) {
    const x = pk + w * (.06 + j * .12), top = cy - H * .78, len = H * (.3 + hash(id * 7 + j) * .25), ww = w * .03;
    R.fill(c => { c.moveTo(x - ww, top); c.bezierCurveTo(x - ww, top + len * .7, x + ww * .2, top + len, x + ww * .9, top + len * .8); c.bezierCurveTo(x + ww * 1.2, top + len * .5, x + ww, top + len * .2, x + ww, top); c.closePath(); }, '#e6eaea', { dir: 80, group: 'wc' + id + '_' + j, maxR: 2 + 4 * k, hgt: 1.3 });
  }
  R.fill(c => { c.ellipse(cx, cy + H * .4, w * .48, H * .06, 0, 0, 7); }, '#b8c2c6', { dir: 0, group: 'wb' + id, maxR: 2 + 5 * k, aj: .2 });
}

// 右前景的大卷浪（往右前方卷）：浪背 -> 浪峰 -> 浪舌卷下 -> 浪洞 -> 浪面落到底
export const BIG = { C: [1600, 560], L: [1990, 690], hole: [1840, 830] };
function bigWave(R) {
  const { C, L, hole } = BIG;
  R.fill(c => { c.moveTo(900, VH + 20); c.bezierCurveTo(1120, 1000, 1330, 620, C[0], C[1]); c.bezierCurveTo(1760, 520, 1940, 580, L[0], L[1]);
    c.bezierCurveTo(2010, 760, 1950, 800, 1880, 770); c.bezierCurveTo(1800, 730, 1730, 780, 1740, 880); c.bezierCurveTo(1760, 990, 2000, 1080, VW + 40, 1100); c.lineTo(VW + 40, VH + 20); c.closePath(); },
    lin(0, C[1], 0, VH, [[0, '#9ab2b8'], [.18, '#6a8692'], [.45, '#3e5260'], [1, '#1c2630']]), { dir: { radial: hole, off: 90 }, group: 'big', maxR: 26, aj: .25, jit: .08 });
  // 浪洞
  R.fill(c => { c.moveTo(1880, 772); c.bezierCurveTo(1800, 736, 1736, 786, 1744, 880); c.bezierCurveTo(1790, 960, 1930, 930, 1990, 860); c.bezierCurveTo(2010, 820, 1960, 800, 1880, 772); c.closePath(); },
    rad(hole[0], hole[1], 10, 170, [[0, '#24343e'], [.6, '#344854'], [1, '#4a6270']]), { dir: { radial: hole, off: 90 }, group: 'bigHole', maxR: 10 });
  // 浪背上顺着浪势的亮纹（裁在浪里）
  { const c0 = R.ctx; c0.save(); c0.beginPath(); c0.moveTo(900, VH + 20); c0.bezierCurveTo(1120, 1000, 1330, 620, C[0], C[1]); c0.bezierCurveTo(1760, 520, 1940, 580, L[0], L[1]); c0.lineTo(VW + 40, 1100); c0.lineTo(VW + 40, VH + 20); c0.closePath(); c0.clip();
    for (let i = 0; i < 6; i++) { const r0 = 290 + i * 62 + hash(i) * 20; c0.beginPath(); c0.arc(hole[0], hole[1], r0, Math.PI * 1.02, Math.PI * 1.45); c0.arc(hole[0], hole[1], r0 + 8 + i * 2, Math.PI * 1.45, Math.PI * 1.02, true); c0.closePath(); c0.fillStyle = 'rgba(214,230,234,.32)'; c0.fill(); }
    c0.restore(); }
  // 浪峰到浪唇的一道厚白沫
  R.fill(c => { c.moveTo(1380, 700); c.bezierCurveTo(1450, 610, C[0] - 60, 540, C[0], 536); c.bezierCurveTo(1760, 500, 1960, 560, 2010, 690); c.bezierCurveTo(2000, 720, 1980, 730, 1960, 720);
    c.bezierCurveTo(1920, 620, 1760, 590, C[0], 600); c.bezierCurveTo(1520, 610, 1450, 660, 1380, 700); c.closePath(); },
    lin(0, 520, 0, 720, [[0, '#fdfcf8'], [1, '#dfe4e6']]), { dir: 'edge', fallback: 0, group: 'bigFoam', maxR: 9, hgt: 1.5 });
  // 唇上往前下方甩的沫：一团团圆头的沫指，长短不一，朝前弯
  for (const [x, y, len, a, w] of [[2000, 690, 130, 1.25, 30], [1962, 712, 100, 1.5, 26], [1922, 712, 70, 1.7, 20], [2040, 650, 80, 1.0, 22], [1880, 702, 46, 1.85, 16]]) {
    R.fill(c => { c.save(); c.translate(x, y); c.rotate(a - Math.PI / 2); c.moveTo(-w * .8, 0); c.bezierCurveTo(-w * .9, len * .45, -w * .6, len * .85, 0, len); c.bezierCurveTo(w * .7, len * 1.02, w * 1.05, len * .75, w * .9, len * .5); c.bezierCurveTo(w * .8, len * .3, w * .9, len * .1, w * .8, 0); c.closePath(); c.restore(); }, '#eef2f2', { dir: { fn: () => a }, group: 'claw' + x, maxR: 6, hgt: 1.4 });
  }
}
// 毛里球：伏着的狗尾紫貂（s = 大小）。貂：长身短腿、圆耳、尖吻；尾巴是狗尾，蓬松翘起
function mlq(R, x, y, s) {
  const T = (px, py) => [x + px * s, y + py * s];
  const pth = (pts) => c => { c.moveTo(...T(...pts[0])); for (let i = 1; i < pts.length; i += 3) c.bezierCurveTo(...T(...pts[i]), ...T(...pts[i + 1]), ...T(...pts[i + 2])); c.closePath(); };
  // 身：长而低，背弓起
  R.fill(pth([[-260, 0], [-250, -110], [-60, -170], [120, -150], [240, -136], [300, -80], [320, 0]]), lin(0, y - 170 * s, 0, y, [[0, '#7c689a'], [.6, '#5a4a74'], [1, '#3a3050']]), { dir: { radial: [x, y + 80 * s] }, group: 'mlq', maxR: 8, aj: .4 });
  // 狗尾巴：从屁股翘起往上卷
  R.fill(pth([[290, -40], [380, -60], [430, -170], [390, -250], [370, -190], [350, -120], [280, -100]]), lin(0, y - 250 * s, 0, y, [[0, '#9a88b2'], [1, '#5e4e76']]), { dir: 'edge', fallback: -70, group: 'mlqTail', maxR: 6 });
  // 头：抬着，吻部朝左（朝河），尖
  for (const ex of [-206, -142]) R.fill(E(...T(ex, -204), 15 * s, 13 * s), '#5e4e7a', { maxR: 3, group: 'mlqEar' + ex });
  R.fill(c => { c.ellipse(...T(-175, -150), 78 * s, 64 * s, -.15, 0, 7); }, lin(x - 255 * s, 0, x - 95 * s, 0, [[0, '#8e7aaa'], [1, '#5a4a72']]), { dir: 'edge', fallback: 0, group: 'mlqHead', maxR: 5 });
  R.fill(c => { c.ellipse(...T(-246, -128), 30 * s, 22 * s, -.1, 0, 7); }, '#a492bc', { dir: 0, group: 'mlqSnout', maxR: 3 });   // 吻：短，浅色
  R.fill(E(...T(-272, -132), 7 * s, 6 * s), '#1c1622', { maxR: 2, group: 'mlqNose' });
  R.fill(E(...T(-214, -160), 9 * s, 7 * s, -.2), '#e6c8ff', { maxR: 2, group: 'mlqEye', hgt: 1.3 });   // 紫晶眼
  // 前爪
  R.fill(pth([[-250, -6], [-300, -10], [-320, -2], [-310, 4], [-280, 6], [-250, 4], [-240, 0]]), '#46385a', { dir: 0, group: 'mlqPaw', maxR: 3 });
}

export function drawRiver(R) {
  // ---------- 天：北原阴天，上面压着铅灰的云；上游地平线那头亮（河的尽头一团光，refs/river/11）
  R.fill(P([[0, 0], [VW, 0], [VW, HZ + 30], [0, HZ + 30]]), lin(0, 0, 0, HZ, [[0, '#283248'], [.4, '#4e5a74'], [.78, '#9a9eaa'], [1, '#d8d2c4']]), { dir: -4, fallback: -4, group: 'sky', maxR: 46, jit: .07, detail: 2.4, aj: .3 });
  R.tint(E(VP[0], HZ, 560, 230), rad(VP[0], HZ, 10, 560, [[0, 'rgba(252,244,220,.95)'], [.45, 'rgba(232,224,208,.45)'], [1, 'rgba(232,224,208,0)']]));
  const cloud = (x, y, w, h, col, und) => R.fill(c => { c.ellipse(x, y, w, h, 0, 0, 7); c.ellipse(x - w * .55, y + h * .3, w * .6, h * .7, 0, 0, 7); c.ellipse(x + w * .6, y + h * .3, w * .55, h * .65, 0, 0, 7); }, lin(0, y - h, 0, y + h, [[0, col], [.7, col], [1, und]]), { dir: -3, fallback: -3, group: 'sky', maxR: 32, detail: 1.6, aj: .3 });
  cloud(260, 80, 340, 66, '#323c58', '#5e6680'); cloud(1250, 60, 440, 74, '#2c3550', '#5a627c'); cloud(1920, 160, 320, 56, '#3e4862', '#747a90');
  cloud(1080, 240, 260, 36, '#5c6480', '#9c9ca6'); cloud(1700, 320, 280, 32, '#727890', '#aeaaae'); cloud(240, 300, 220, 30, '#6a7088', '#a8a6ac');
  // ---------- 远山（大雪山的余脉，雾里一线）
  R.fill(c => { c.moveTo(0, HZ + 4); c.lineTo(0, 402); c.bezierCurveTo(140, 384, 260, 410, 380, 394); c.bezierCurveTo(480, 380, 560, 420, 660, 440); c.lineTo(660, HZ + 4); c.closePath(); }, lin(0, 384, 0, HZ, [[0, '#8a8ea0'], [1, '#aaa8ae']]), { dir: 0, group: 'hillL', maxR: 10 });
  R.fill(c => { c.moveTo(740, HZ + 4); c.lineTo(760, 440); c.bezierCurveTo(1000, 420, 1200, 432, 1420, 412); c.bezierCurveTo(1660, 392, 1880, 414, VW, 404); c.lineTo(VW, HZ + 4); c.closePath(); }, lin(0, 400, 0, HZ, [[0, '#8c8e9c'], [1, '#a6a4a8']]), { dir: 0, group: 'hillR', maxR: 12 });
  // ---------- 两头的远岸：北原草原（阴天下的灰绿），分带，越近笔越大
  const grass = lin(0, HZ, 0, 760, [[0, '#9a9a8c'], [.2, '#7e826a'], [1, '#4c543e']]);
  for (const [y0, y1, r] of [[HZ, 480, 5], [480, 540, 9], [540, 640, 14], [640, 760, 20]]) {
    if (bankL(y0) > 0) R.fill(P([[0, y0], [bankL(y0), y0], [Math.max(0, bankL(y1)), y1], [0, y1]]), grass, { dir: 0, fallback: 0, group: 'bankL', maxR: r, aj: .35, jit: .1 });
    if (bankR(y0) < VW) R.fill(P([[VW, y0], [bankR(y0), y0], [Math.min(VW, bankR(y1)), y1], [VW, y1]]), grass, { dir: 0, fallback: 0, group: 'bankR', maxR: r, aj: .35, jit: .1 });
  }
  R.tint(E(1650, 520, 380, 40), 'rgba(40,46,40,.25)');     // 云影
  // 岸边一线白沫（refs/river/01、07：两岸一圈白）
  R.line(c => { c.moveTo(VP[0], HZ); c.lineTo(0, HZ + (VP[0]) / (VP[0] - BL) * (VH - HZ)); }, '#e6e2d8', 4, { dir: 'edge', group: 'foamL', maxR: 4 });
  R.line(c => { c.moveTo(VP[0], HZ); c.lineTo(VW, HZ + (VW - VP[0]) / (BR - VP[0]) * (VH - HZ)); }, '#e6e2d8', 5, { dir: 'edge', group: 'foamR', maxR: 4 });
  // ---------- 河面：远处映着亮天，越近越暗
  const wcol = lin(0, HZ, 0, VH, [[0, '#ece8dc'], [.1, '#c4c6c6'], [.26, '#8a96a2'], [.45, '#566676'], [.7, '#36444f'], [1, '#232d38']]);
  for (const [y0, y1, r] of [[HZ, 490, 4], [490, 560, 8], [560, 660, 13], [660, 820, 20], [820, VH, 30]])
    R.fill(P([[Math.max(-10, bankL(y0)), y0], [Math.min(VW + 10, bankR(y0)), y0], [Math.min(VW + 10, bankR(y1)), y1], [Math.max(-10, bankL(y1)), y1]]), wcol, { dir: 0, fallback: 0, group: 'water', maxR: r, aj: .22, jit: .08 });
  // 上游那条亮路：河面映着地平线的光，从灭点铺到方源脚下（同 demo 湿街上的亮路）
  { const c0 = R.ctx; c0.save(); c0.filter = 'blur(30px)'; c0.globalCompositeOperation = 'source-atop'; c0.beginPath(); P([[VP[0] - 40, HZ], [VP[0] + 50, HZ], [FANG.x + 160, FANG.y + 60], [FANG.x - 160, FANG.y + 60]])(c0);
    c0.fillStyle = lin(0, HZ, 0, FANG.y + 60, [[0, 'rgba(252,246,230,.95)'], [.35, 'rgba(228,228,224,.55)'], [.7, 'rgba(200,204,210,.12)'], [1, 'rgba(204,208,214,0)']])(c0); c0.fill(); c0.restore(); }
  // 静水映着天上的云：几条横的暗带（同 demo 湿地上的倒影）
  for (const [y, w, a] of [[566, 1000, .3], [610, 1300, .26], [526, 640, .2], [650, 1500, .2]]) R.tint(E(FANG.x + 120, y, w, 8 + depth(y) * 34), `rgba(36,44,62,${a})`);
  // ---------- 下游：浪迎面压过来，越近越大越乱；方源那一段是静的
  // 远处的碎浪：白点
  for (let i = 0; i < 260; i++) {
    const y = lerp(585, 760, Math.pow(hash(i * 1.3), .8)), x = lerp(-100, VW + 100, hash(i * 7.7)), k = depth(y);
    if (rough(x, y) < .3) continue;
    R.fill(E(x, y, (8 + hash(i) * 14) * k * 2.4, (2 + hash(i * 3) * 3) * k * 2.4), '#e8ecee', { dir: 0, group: 'fleck' + i, maxR: 2 + 4 * k, hgt: 1.2 });
  }
  // 中景的浪：大小不一，浪头朝右前方倒
  let id = 0;
  for (const [y, k, n] of [[690, .42, 7], [760, .56, 6], [850, .74, 4]]) for (let j = 0; j < n; j++, id++) {
    const cx = lerp(-60, VW + 60, (j + .2 + hash(id * 2.9) * .6) / n), cy = y + (hash(id * 3.7) - .5) * 40 * k;
    if (rough(cx, cy) < .35 || (cx > 1350 && y > 740)) continue;
    const w = (240 + hash(id * 1.7) * 260) * k, h = (90 + hash(id * 2.3) * 90) * k;
    waveWall(R, cx, cy, w, h * clamp(rough(cx, cy) * 1.2, .45, 1), k, id);
  }
  // ---------- 冲下来的东西（第257节）：翻过来的牦牛尸，在左前的浪谷里打转；断木、石头
  const yak = [740, 1000];
  R.fill(c => { c.ellipse(yak[0] - 186, yak[1] + 16, 54, 34, -.5, 0, 7); }, '#2e2624', { dir: 'edge', group: 'yakHead', maxR: 6 });                 // 头：歪在水里
  for (const sx of [-1, 1]) R.line(c => { c.moveTo(yak[0] - 196, yak[1] - 6 + sx * 10); c.quadraticCurveTo(yak[0] - 250 - sx * 10, yak[1] - 30 + sx * 30, yak[0] - 230, yak[1] - 70 + sx * 46); }, '#d8ccb8', 11, { dir: 'edge', group: 'horn' + sx, maxR: 3 });   // 一对弯角
  R.fill(c => { c.ellipse(yak[0], yak[1], 170, 66, -.12, 0, 7); }, lin(0, yak[1] - 66, 0, yak[1] + 66, [[0, '#7a6c62'], [.45, '#4e423c'], [1, '#2a2220']]), { dir: 'edge', fallback: 0, group: 'yak', maxR: 12 });
  R.fill(c => { c.ellipse(yak[0] + 8, yak[1] - 26, 112, 28, -.12, 0, 7); }, '#9a8c80', { dir: 0, group: 'yakBelly', maxR: 8 });   // 鼓起的肚皮
  for (const [dx, a, l, b] of [[-104, -2.15, 70, .8], [-60, -1.9, 76, .55], [44, -1.25, 76, -.55], [92, -1.0, 66, -.8]]) {   // 朝天蹬着的四条腿：粗的大腿 + 折回的小腿 + 蹄
    const lx = yak[0] + dx, ly = yak[1] - 40 + dx * .12, kx = lx + Math.cos(a) * l, ky = ly + Math.sin(a) * l, a2 = a + b, fx = kx + Math.cos(a2) * l * .8, fy = ky + Math.sin(a2) * l * .8;
    R.fill(c => { c.moveTo(lx - Math.sin(a) * 20, ly + Math.cos(a) * 20); c.lineTo(kx - Math.sin(a) * 11, ky + Math.cos(a) * 11); c.lineTo(kx + Math.sin(a) * 11, ky - Math.cos(a) * 11); c.lineTo(lx + Math.sin(a) * 20, ly - Math.cos(a) * 20); c.closePath(); }, '#3e3430', { dir: { fn: () => a }, group: 'yl' + dx, maxR: 6 });
    R.fill(c => { c.moveTo(kx - Math.sin(a2) * 10, ky + Math.cos(a2) * 10); c.lineTo(fx - Math.sin(a2) * 7, fy + Math.cos(a2) * 7); c.lineTo(fx + Math.sin(a2) * 7, fy - Math.cos(a2) * 7); c.lineTo(kx + Math.sin(a2) * 10, ky - Math.cos(a2) * 10); c.closePath(); }, '#2e2624', { dir: { fn: () => a2 }, group: 'ys' + dx, maxR: 5 });
    R.fill(E(fx, fy, 11, 9, a2), '#141010', { maxR: 3, group: 'yh' + dx });
  }
  R.fill(c => { c.moveTo(yak[0] - 230, yak[1] + 40); c.bezierCurveTo(yak[0] - 120, yak[1] + 20, yak[0] + 60, yak[1] + 50, yak[0] + 200, yak[1] + 26); c.bezierCurveTo(yak[0] + 160, yak[1] + 76, yak[0] - 100, yak[1] + 90, yak[0] - 230, yak[1] + 70); c.closePath(); }, '#d8dee0', { dir: 0, group: 'yakFoam', maxR: 7, hgt: 1.3 });   // 半截泡在白沫里
  for (const [x, y, rx] of [[300, 1110, 56], [1060, 1120, 40], [180, 930, 30]]) R.fill(E(x, y, rx, rx * .55), lin(0, y - rx * .5, 0, y + rx * .5, [[0, '#8e8c92'], [1, '#3e3c44']]), { dir: 'edge', group: 'rock' + x, maxR: 8 });
  // 左前一堵浪（半出画），把牦牛尸夹在浪谷里
  waveWall(R, 200, 1130, 700, 260, 1.15, 900, 1);
  // ---------- 右前景：一个大卷浪，浪舌往右前卷下来，浪洞里是暗的，唇上挂着沫爪（refs/river/17、19 的凶）
  bigWave(R);
  // ---------- 右岸：长生天——毛里球伏在岸上，小山一样；貂身、圆耳、尖吻，身后一条翘起的狗尾巴（第258节）
  mlq(R, 1600, 520, .62);
  // ---------- 左岸：北原一方的人站在岸边（画成小人，见 riverCrowd）
}

export function buildRiver(seed = 5) {
  const R = new Ref(VW, VH, 1);
  drawRiver(R);
  const st = paintRef(R, { R: [44, 22, 11, 5.5, 3], T: 13, seed,
    rev: (x, y) => Math.hypot(x - FANG.x, (y - FANG.y) * 1.6) / 1500 + hash(x * .13 + y) * .12,
    app: (x, y, lv) => (x / VW) * .3 + lv * .03 });
  return { strokes: st, ref: R };
}

// ---------- 河外的人（极小，程序化，可以动）：一件 A 字袍 + 大袖 + 头 + 发（同 demo walker 的笔法）
export function immortal(out, x, y, H, { robe = '#2c2a34', hair = '#1c1a20', skin = '#c8a898', f = 1, fly = 0, t = 0, seed = 1, beard = null, alpha = 1 } = {}) {
  const C = hex(robe), sw = Math.sin(t * 1.3 + seed) * fly;
  const sh = [x, y - H * .8];
  out.push({ x, y: y - H * .4, ang: Math.PI / 2 + sw * .1, len: H * .82, wid: H * .24, c: C, c2: shade(C, .78), seed, type: KNIFE, alpha, taper: .45 });           // 袍：上窄下宽
  out.push({ x: x - H * .07, y: y - H * .42, ang: Math.PI / 2, len: H * .66, wid: H * .05, c: shade(C, 1.45), seed: seed + 1, type: KNIFE, alpha: alpha * .9, taper: .3 });   // 受光的边
  for (const s of [-1, 1]) out.push({ x: x + s * H * .14, y: y - H * .55 + sw * H * .03 * s, ang: Math.PI / 2 + s * (.12 + fly * .5), len: H * .4, wid: H * .1, c: shade(C, s < 0 ? 1.15 : .85), seed: seed + 2 + s, type: KNIFE, alpha, taper: -.5 });   // 大袖
  out.push({ x: sh[0] + f * H * .015, y: sh[1] - H * .08, ang: 0, len: H * .09, wid: H * .11, c: hex(skin), c2: shade(hex(skin), .8), seed: seed + 5, type: DAB, alpha });
  out.push({ x: sh[0] - f * H * .02, y: sh[1] - H * .12, ang: 0, len: H * .1, wid: H * .07, c: hex(hair), seed: seed + 6, type: DAB, alpha });
  if (beard) out.push({ x: sh[0] + f * H * .02, y: sh[1] + H * .01, ang: Math.PI / 2, len: H * .16, wid: H * .07, c: hex(beard), seed: seed + 7, type: KNIFE, alpha, taper: .7 });
  if (fly) for (let i = 0; i < 2; i++) out.push({ x: x - f * H * (.2 + i * .12), y: y - H * (.1 + i * .05) + sw * H * .05, ang: Math.PI * .92 + sw * .3, len: H * .45, wid: H * .06, c: shade(C, .9), seed: seed + 9 + i, type: KNIFE, alpha: alpha * .8, taper: .8 });   // 飘带
}
// 三方围观的站位：左岸北原、天上中洲（右岸是毛里球，在底稿里）
export const CROWD = {
  north: [{ x: 120, y: 500, robe: '#e6e2da', hair: '#f2f0ea', beard: '#f4f2ec', s: 1.15 }, { x: 160, y: 503, robe: '#1e1c22', hair: '#141218' }, { x: 196, y: 498, robe: '#e8eaf0', hair: '#eef0f4' },
    { x: 236, y: 506, robe: '#2c3a2c', hair: '#1a1a1a' }, { x: 272, y: 500, robe: '#4a3a5a', hair: '#8a6aa0' }],
  sky: [[980, 196, 1], [1060, 222, .8], [1140, 186, .9], [1230, 236, .7], [900, 250, .6], [1310, 204, .7], [1400, 240, .55]],
};
export function riverCrowd(out, t, { north = 1, sky = 1 } = {}) {
  if (north) for (const [i, p] of CROWD.north.entries()) immortal(out, p.x, p.y, figH(p.y) * (p.s || 1), { robe: p.robe, hair: p.hair, beard: p.beard, f: 1, t, seed: 10 + i * 7 });
  if (sky) for (const [i, [x, y, s]] of CROWD.sky.entries()) immortal(out, x + Math.sin(t * .4 + i) * 6, y + Math.sin(t * .7 + i * 2) * 5, 46 * s, { robe: ['#24263a', '#2e2a3e', '#20283a'][i % 3], hair: '#141418', fly: 1, t, seed: 40 + i * 5, f: i % 2 ? 1 : -1 });
}

// ---------- 动的部分（每帧重画，固定种子）：顺流漂的水纹与沫、浪顶的飞沫；方源脚下的涟漪和倒影
export function riverFx(out, t, { seed = 1, n = 220 } = {}) {
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 1.37 + seed), h2 = hash(i * 7.11 + seed * 3), h3 = hash(i * 3.3 + 1);
    const ph = (h1 + t * (.05 + h3 * .05)) % 1;                       // 沿河的进度：0 灭点 -> 1 画面底
    const y = HZ + 6 + Math.pow(ph, 1.5) * (VH - HZ + 60), d = depth(y);
    const x = lerp(-300, VW + 300, h2) * (.2 + .8 * d) + VP[0] * (1 - (.2 + .8 * d));
    const r = rough(x, y);
    if (r < .05 && d < .4) { // 静水：只有细细的亮纹
      out.push({ x, y, ang: 0, len: (14 + h2 * 30) * (.3 + d * 1.6), wid: 1.6 + d * 3, c: [.9, .91, .92], type: KNIFE, alpha: .35 * Math.min(1, ph * 8), hgt: .4, seed: i });
      continue;
    }
    const fade = Math.min(1, ph * 6) * Math.min(1, (1 - ph) * 8) * (1 - clamp((d - .7) / .4, 0, .75));
    out.push({ x, y, ang: -.08 + (h1 - .5) * .14, len: (30 + h2 * 70) * (.25 + d * 1.3), wid: (3 + h3 * 4) * (.3 + d * 1.3), c: r > .5 ? [.9, .92, .92] : [.7, .75, .78], c2: [.55, .6, .66], type: KNIFE, alpha: .55 * fade * Math.min(1, r + .25), hgt: .7, seed: i });
  }
}
// 浪顶飞沫：每堵浪顶上往前上方迸出的白点，落回去
export function spray(out, t, { seed = 2, n = 140 } = {}) {
  const rows = [[712, .46], [790, .62], [884, .8], [1000, 1.0], [1140, 1.25]];
  for (let i = 0; i < n; i++) {
    const [y0, k] = rows[i % rows.length], h1 = hash(i * 2.3 + seed), h2 = hash(i * 5.7 + seed);
    const x0 = lerp(-100, VW + 100, h1);
    if (rough(x0, y0) < .4) continue;
    const period = 1.2 + h2 * 1.2, a = ((t + h1 * period * 3) % period) / period;
    const x = x0 + (h2 - .3) * 160 * k * a, y = y0 - 110 * k - 220 * k * a + 380 * k * a * a;
    out.push({ x, y, ang: 0, len: (8 + h2 * 13) * k, wid: (5 + h2 * 8) * k, c: [.95, .96, .96], type: DAB, alpha: (1 - a) * .85, hgt: .3, seed: i });
  }
}
// 大卷浪的唇上往前甩出去的水
export function bigSpray(out, t, { seed = 4, n = 70 } = {}) {
  const { C, L } = BIG;
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 3.1 + seed), h2 = hash(i * 8.3 + seed), period = 1 + h2 * .8, a = ((t + h1 * 7) % period) / period;
    const u = h1, x0 = lerp(C[0] - 120, L[0] + 40, u), y0 = lerp(C[1] - 30, L[1] - 20, u * u);
    const x = x0 + (120 + h2 * 260) * a, y = y0 - (120 + h1 * 120) * a + 520 * a * a;
    out.push({ x, y, ang: Math.atan2(-(120 + h1 * 120) + 1040 * a, 120 + h2 * 260), len: 12 + h2 * 22, wid: 6 + h2 * 9, c: [.96, .97, .97], type: DAB, alpha: (1 - a) * .85, hgt: .3, seed: i + 300 });
  }
}
// 方源脚下：一圈圈往外散的涟漪（同 demo 女孩落脚的水坑）+ 白衣的倒影（横向短笔叠起来）
export function feetWater(out, t, x, y, h, { seed = 3 } = {}) {
  for (let i = 0; i < 3; i++) {
    const ai = (t * .55 + i / 3) % 1, r = h * (.1 + ai * .55);
    for (let j = 0; j < 18; j++) { const th = j / 18 * Math.PI * 2, fl = .16; out.push({ x: x + Math.cos(th) * r, y: y + Math.sin(th) * r * fl, ang: Math.atan2(fl * Math.cos(th), -Math.sin(th)), len: r * .34 * Math.hypot(Math.sin(th), fl * Math.cos(th)) + r * .04, wid: Math.max(1.5, h * .01), c: [.95, .96, .97], seed: i * 20 + j, type: BRUSH, alpha: .6 * (1 - ai), hgt: .4 }); }
  }
  const n = 16;
  for (let i = 0; i < n; i++) {
    const f = i / n, yy = y + 4 + f * h * .6;
    if (hash(i * 3.7 + seed) < f * .4) continue;
    const ww = h * .14 * (1 - f * .4) * (.6 + hash(i + seed) * .6);
    out.push({ x: x + (hash(i * 9.1) - .5) * h * .05, y: yy, ang: (hash(i) - .5) * .1, len: ww, wid: h * .02 + hash(i * 2) * h * .012, c: [.88 - f * .22, .88 - f * .22, .9 - f * .18], c2: [.7, .72, .76], type: KNIFE, alpha: .8 * (1 - f * .8), hgt: .6, seed: 70 + i });
  }
}

// ================= 中景背景板（方源侧身走）：机位在齐腰高，地平线低；远处是虚的大笔（同 demo girl 的背景板）
// 场景单位 2600 x 1500；方源脚下在 MED.feet
export const MW = 2600, MH = 1500, MHZ = 760, MED = { feet: [900, 1240] };
export function drawRiverMed(R) {
  R.fill(P([[0, 0], [MW, 0], [MW, MHZ + 20], [0, MHZ + 20]]), lin(0, 0, 0, MHZ, [[0, '#2c3650'], [.45, '#5a6680'], [.85, '#a8a8b0'], [1, '#d4cec2']]), { dir: -4, fallback: -4, group: 'sky', maxR: 60, detail: 2.6 });
  R.tint(E(200, MHZ, 900, 300), rad(200, MHZ, 10, 900, [[0, 'rgba(250,242,220,.9)'], [1, 'rgba(250,242,220,0)']]));      // 上游那头的光（画左）
  const cloud = (x, y, w, h, col, und) => R.fill(c => { c.ellipse(x, y, w, h, 0, 0, 7); c.ellipse(x - w * .55, y + h * .3, w * .6, h * .7, 0, 0, 7); c.ellipse(x + w * .6, y + h * .3, w * .55, h * .65, 0, 0, 7); }, lin(0, y - h, 0, y + h, [[0, col], [.7, col], [1, und]]), { dir: -3, fallback: -3, group: 'sky', maxR: 44, detail: 2, aj: .3 });
  cloud(700, 140, 520, 90, '#323c58', '#5e6680'); cloud(1900, 110, 600, 100, '#2c3550', '#5a627c'); cloud(1500, 420, 380, 50, '#6a7088', '#a8a6ac');
  // 远岸：一线草原和更远的山
  R.fill(c => { c.moveTo(0, MHZ + 2); c.lineTo(0, 700); c.bezierCurveTo(500, 670, 900, 720, 1400, 690); c.bezierCurveTo(1900, 660, 2300, 700, MW, 690); c.lineTo(MW, MHZ + 2); c.closePath(); }, lin(0, 660, 0, MHZ, [[0, '#8c8e9e'], [1, '#9a9a9c']]), { dir: 0, group: 'hill', maxR: 24, detail: 2 });
  R.fill(P([[0, MHZ - 14], [MW, MHZ - 22], [MW, MHZ + 6], [0, MHZ + 8]]), '#6e7458', { dir: 0, group: 'bank', maxR: 10, detail: 2 });
  // 下游（画右）远处翻着白的浪线
  for (let i = 0; i < 9; i++) { const x = 1700 + i * 110 + hash(i) * 60, w = 70 + hash(i * 3) * 80; R.fill(E(x, MHZ + 6, w, 12 + hash(i * 5) * 10), '#e4e8ea', { dir: 0, group: 'farFoam' + i, maxR: 8, detail: 2, hgt: 1.3 }); }
  // 河面：静水映天，越近越暗；横的大笔
  R.fill(P([[0, MHZ + 6], [MW, MHZ + 6], [MW, MH], [0, MH]]), lin(0, MHZ, 0, MH, [[0, '#dcd8ce'], [.2, '#a6aab0'], [.55, '#6a7684'], [1, '#3a4652']]), { dir: 0, fallback: 0, group: 'water', maxR: 40, aj: .2, detail: 1.6 });
  for (const [y, w, a] of [[820, 1400, .2], [900, 1800, .22], [1040, 2400, .2]]) R.tint(E(1300, y, w, 14 + (y - MHZ) * .05), `rgba(36,44,62,${a})`);
  R.tint(E(380, 860, 600, 60), 'rgba(250,244,226,.35)');
}
export function buildRiverMed(seed = 9) {
  const R = new Ref(MW, MH, .5); drawRiverMed(R);
  return { strokes: paintRef(R, { R: [30, 15, 8, 4], T: 12, seed, rev: (x, y) => Math.hypot(x - MED.feet[0], y - MED.feet[1]) / 1800 }), ref: R };
}
