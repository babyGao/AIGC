// 方源（油画厚涂，照 lemo-opuscar impasto demo 的 girl.js / cellist.js 做法）。
// 形全部取自用户参考图 assets/ref/fangyuan.webp 的侧身像（参考图像素坐标，脸朝左），用 inF 换到局部单位：
//   局部 = (参考 - [455, 965]) * K，原点在脚底，y 朝下为正（往上是负）。身高约 1600。
// 衣着按已定方案：白衣大袖、黑腰带；脸、发型、身形照参考图。全程面无表情。
// 板：body（白袍、黑腰带、背后长发、垂着的大袖）+ head（脸、耳、额发、鬓发，绕颈转）；五官是程序化笔触（fyFace）。
import { Ref, paintRef, strokePath } from '../engine/plate.js';
import { KNIFE, BRUSH, DAB, LINE, hex } from '../engine/impasto.js';
import { lin as lin0 } from './common.js';

export const K = 1.9, RX = 455, RY = 965;
export const RF = ([X, Y]) => [(X - RX) * K, (Y - RY) * K];          // 参考像素 -> 局部单位
export const GOX = 520, GOY = 1760, GRW = 1080, GRH = 1860;            // 底稿画布：局部原点在 (GOX, GOY)
export const FY = {
  neck: RF([450, 236]), shoulder: RF([478, 282]),
  robe: '#ece4d6', robeL: '#fbf6ec', robeS: '#b4aec0', robeD: '#8a849c',
  sash: '#1c1a22', sash2: '#34303c',
  hair: '#17151b', hair2: '#2c2a36', sheen: '#5a5e78',
  skin: '#f1d8c6', skinS: '#c99c8c', ink: '#16131a',
};
const inF = (c, f) => { c.save(); c.translate(GOX, GOY); c.scale(K, K); c.translate(-RX, -RY); f(c); c.restore(); };
// 折线 / 平滑闭合曲线（参考坐标）
const poly = pts => c => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const curve = (pts, closed = true) => c => {
  const n = pts.length, P = i => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) c.closePath();
};
// 渐变端点给参考坐标；Ref.fill 在 inF 之外取渐变，所以这里先换成底稿画布单位
const cx = X => GOX + (X - RX) * K, cy = Y => GOY + (Y - RY) * K;
const lin = (x0, y0, x1, y1, stops) => lin0(cx(x0), cy(y0), cx(x1), cy(y1), stops);
const L = (R, path, fill, props) => R.fill(c => inF(c, path), fill, props);

// ---- 量自参考图（像素）
const SKIN = [[410, 150], [412, 160], [414, 170], [415.5, 177], [415, 186], [413, 192], [410, 199], [407.2, 203.8], [408.6, 206.2], [413, 207.6], [416, 210], [418, 212], [419.6, 213.6], [418.8, 215], [421, 217.2], [420.6, 220.2], [422, 224], [425, 228], [432, 228.6], [442, 224.6], [452, 214], [458, 200], [460, 185], [458, 165], [450, 150], [430, 141]];
const EAR = [[456.5, 180], [460.5, 176.5], [464, 181], [464.5, 190], [461, 198], [457.5, 196]];
export const FACE = { eye: [419.6, 182.6], lid: [[415.6, 180.6], [426.5, 183]], brow: [[413.6, 176.4], [428.6, 177.8]], mouth: [[419.4, 213.6], [426.6, 213.4]] };

// ================= 身体板 =================
export function drawFyBody(R) {
  // 远侧的袖（身后露一点，冷暗）
  L(R, curve([[488, 300], [520, 380], [534, 470], [540, 560], [522, 590], [505, 520], [496, 420]]), lin(490, 0, 540, 0, [[0, '#9a94aa'], [1, '#77718a']]), { dir: 92, group: 'farSleeve', maxR: 14 });
  // 白袍：A 字，前襟受光（左上来光），后背转冷
  L(R, curve([[440, 236], [470, 248], [500, 262], [522, 300], [534, 380], [532, 470], [534, 560], [544, 650], [556, 760], [564, 860], [566, 920], [540, 938], [460, 946], [384, 938], [364, 914], [370, 840], [377, 720], [383, 610], [389, 520], [396, 420], [402, 350], [414, 296], [428, 256]]),
    lin(370, 0, 566, 0, [[0, FY.robeL], [.3, FY.robe], [.62, FY.robeS], [1, FY.robeD]]), { dir: 90, fallback: 90, group: 'robe', maxR: 22, hgt: 1.05 });
  // 袖在袍上投的影（把白袖和白袍分开）
  R.tint(c => inF(c, c2 => { c2.moveTo(498, 300); c2.bezierCurveTo(522, 400, 528, 540, 512, 660); c2.lineTo(546, 660); c2.bezierCurveTo(546, 540, 538, 400, 514, 296); c2.closePath(); }), 'rgba(96,88,120,.38)');
  // 交领：白内衣领 + 青绿镶边的外领（refs/fangyuan/04 雕真人）
  L(R, poly([[436, 232], [450, 236], [428, 300], [418, 292]]), '#f2eee6', { dir: 70, group: 'collarIn', maxR: 4 });
  L(R, poly([[448, 236], [463, 240], [438, 322], [425, 312]]), lin(0, 236, 0, 322, [[0, '#7a9c96'], [1, '#5a7a76']]), { dir: 72, group: 'collar', maxR: 4 });
  // 黑腰带 + 垂下来的带头
  L(R, curve([[396, 426], [450, 432], [532, 438], [533, 472], [452, 470], [393, 462]]), lin(0, 426, 0, 472, [[0, FY.sash2], [1, FY.sash]]), { dir: 2, group: 'sash', maxR: 8 });
  L(R, poly([[401, 466], [413, 466], [417, 600], [405, 606]]), FY.sash, { dir: 90, group: 'sashEnd', maxR: 4 });   // 带头垂在身前
  // 背后的长发：从后脑垂过腰，盖在白袍背上
  L(R, curve([[482, 276], [526, 280], [538, 340], [546, 410], [549, 470], [540, 505], [526, 482], [514, 410], [500, 340]]),
    lin(480, 0, 548, 0, [[0, FY.hair2], [1, FY.hair]]), { dir: 88, fallback: 88, group: 'hairTail', maxR: 9 });
  // 发上的冷光（受光一侧，细长的亮笔）
  L(R, poly([[500, 290], [503, 290], [520, 420], [517, 421]]), '#3c3e52', { dir: 84, group: 'sheen1', maxR: 2, hgt: 1.2 });
  // 前襟受光的亮边
  L(R, curve([[414, 300], [404, 350], [398, 430], [390, 540], [383, 660], [376, 800], [370, 900], [378, 900], [384, 800], [391, 660], [398, 540], [406, 430], [412, 350], [420, 302]]), '#fffcf4', { dir: 90, group: 'rim', maxR: 4, hgt: 1.3 });
}

// ================= 马鸿运（尸体）板：腰夹在方源臂下，上身和头、两手垂向前下方，两腿垂在后面 =================
// 依据 refs/fangyuan/02、03、05，refs/mahongyun/03：北原式袍（暗红褐）、金色毛领、腰带、黑发束髻、长靴；已死，脸朝下。
export const MHY = { robe: '#6e3a32', robeD: '#4a2622', robeL: '#8e5040', fur: '#c89a52', belt: '#b89040', boot: '#262022', hair: '#1c181c', skin: '#d4b4a4' };
export function drawMhy(R) {
  // 两腿：从臀（在方源袖后）往后下垂，膝微弯，长靴
  L(R, curve([[488, 520], [520, 516], [556, 580], [566, 660], [568, 744], [548, 748], [544, 664], [530, 600], [500, 560]]), lin(0, 520, 0, 748, [[0, '#3a2a2c'], [1, '#2a2024']]), { dir: 80, group: 'mLegF', maxR: 7 });
  L(R, curve([[548, 740], [570, 738], [578, 800], [552, 806], [546, 780]]), MHY.boot, { dir: 90, group: 'mBootF', maxR: 4 });
  L(R, curve([[480, 530], [512, 528], [540, 590], [546, 680], [544, 770], [522, 772], [520, 680], [508, 610], [482, 570]]), lin(480, 0, 546, 0, [[0, '#5a4240'], [1, '#30242a']]), { dir: 82, group: 'mLegN', maxR: 8 });
  L(R, curve([[520, 762], [546, 760], [554, 836], [526, 842], [516, 810]]), MHY.boot, { dir: 90, group: 'mBootN', maxR: 4 });
  // 远侧的手（暗，从肩垂下）
  L(R, curve([[326, 556], [344, 560], [342, 640], [336, 724], [320, 726], [322, 640]]), lin(0, 556, 0, 724, [[0, MHY.robeD], [1, '#3a1e1c']]), { dir: 92, group: 'mArmF', maxR: 5 });
  L(R, curve([[320, 720], [336, 720], [336, 748], [327, 758], [319, 744]]), '#a88c80', { maxR: 3, group: 'mHandF' });
  // 身子：腰在方源臂下，上身往前横探出去、略往下沉，背朝上
  L(R, c => { c.moveTo(512, 498); c.bezierCurveTo(470, 478, 400, 480, 350, 500); c.bezierCurveTo(330, 508, 318, 524, 314, 540);
    c.lineTo(352, 584); c.bezierCurveTo(400, 568, 452, 566, 490, 574); c.bezierCurveTo(504, 576, 516, 570, 520, 556); c.closePath(); },
    lin(0, 480, 0, 584, [[0, MHY.robeL], [.5, MHY.robe], [1, MHY.robeD]]), { dir: 180, fallback: 180, group: 'mBody', maxR: 12 });
  R.tint(c => inF(c, c2 => { c2.moveTo(360, 500); c2.bezierCurveTo(420, 486, 470, 486, 510, 500); c2.lineTo(510, 506); c2.bezierCurveTo(470, 494, 420, 494, 362, 508); c2.closePath(); }), 'rgba(255,200,170,.35)');   // 背上受光
  // 毛领（肩头一圈）
  L(R, curve([[312, 526], [334, 512], [358, 524], [364, 556], [350, 586], [324, 588], [308, 566]]), lin(310, 0, 364, 0, [[0, '#e8bc72'], [1, '#a87a3a']]), { dir: 'edge', fallback: 70, group: 'mFur', maxR: 6, hgt: 1.3 });
  // 头：从肩前垂下，脸朝方源的腿（大半被头发挡住），髻朝下
  L(R, c => { c.ellipse(316, 612, 31, 38, .25, 0, 7); }, lin(290, 0, 345, 0, [[0, '#2c262a'], [1, MHY.hair]]), { dir: { radial: [cx(330), cy(570)] }, group: 'mHead', maxR: 6 });
  L(R, c => { c.moveTo(332, 584); c.bezierCurveTo(350, 598, 352, 630, 340, 650); c.bezierCurveTo(334, 634, 330, 612, 326, 594); c.closePath(); }, lin(326, 0, 352, 0, [[0, '#c8a898'], [1, '#a88a7e']]), { dir: 'edge', fallback: 80, group: 'mFace', maxR: 3 });
  L(R, c => { c.ellipse(304, 652, 12, 10, .3, 0, 7); }, MHY.hair, { maxR: 3, group: 'mBun' });
  L(R, poly([[294, 640], [312, 642], [311, 647], [293, 645]]), MHY.belt, { dir: 0, group: 'mBunBand', maxR: 2 });
  // 近侧的手（从肩垂下，指尖朝水）
  L(R, curve([[350, 566], [370, 574], [368, 660], [364, 748], [346, 750], [348, 660]]), lin(348, 0, 370, 0, [[0, MHY.robeL], [1, MHY.robe]]), { dir: 92, group: 'mArmN', maxR: 5 });
  L(R, poly([[346, 742], [366, 742], [365, 752], [347, 754]]), MHY.fur, { dir: 0, group: 'mCuff', maxR: 3 });
  L(R, curve([[348, 752], [364, 752], [364, 782], [356, 794], [348, 782]]), MHY.skin, { maxR: 3, group: 'mHandN' });
}

// ================= 方源夹人的手臂 + 大袖（画在尸体前面）=================
export function drawFyArm(R) {
  // 上臂：从肩垂到肘（宽袖筒）
  L(R, curve([[462, 276], [494, 286], [504, 380], [500, 470], [470, 480], [460, 380]]), lin(460, 0, 504, 0, [[0, FY.robeL], [.45, FY.robe], [1, FY.robeS]]), { dir: 92, group: 'uArm', maxR: 10, hgt: 1.1 });
  // 大袖：从前臂垂下，像个袋子一直垂到膝下；袖口开在前缘，里面是暗的，口上青绿镶边
  L(R, c => { c.moveTo(506, 456); c.bezierCurveTo(524, 520, 530, 630, 508, 704); c.bezierCurveTo(488, 716, 458, 712, 438, 694);
    c.bezierCurveTo(430, 650, 430, 600, 438, 556); c.lineTo(476, 482); c.closePath(); },
    lin(430, 0, 528, 0, [[0, FY.robeL], [.4, FY.robe], [1, '#9c96ae']]), { dir: 90, fallback: 90, group: 'sleeve', maxR: 14, hgt: 1.15 });
  L(R, c => { c.moveTo(440, 562); c.bezierCurveTo(434, 604, 434, 652, 440, 690); c.lineTo(452, 694); c.bezierCurveTo(446, 652, 446, 604, 452, 566); c.closePath(); }, lin(0, 560, 0, 694, [[0, '#6e6882'], [1, '#8c86a0']]), { dir: 90, group: 'cuffIn', maxR: 3 });
  L(R, c => { c.moveTo(434, 556); c.bezierCurveTo(426, 602, 426, 652, 434, 694); c.lineTo(441, 696); c.bezierCurveTo(434, 652, 434, 602, 441, 558); c.closePath(); }, lin(0, 556, 0, 696, [[0, '#7a9c96'], [1, '#5a7a76']]), { dir: 90, group: 'cuff', maxR: 2.5 });
  // 前臂斜压在尸体腰上，手扣住
  L(R, curve([[476, 470], [502, 478], [470, 530], [440, 552], [426, 538], [450, 500]]), lin(426, 0, 502, 0, [[0, FY.robeL], [1, FY.robe]]), { dir: 130, group: 'fArm', maxR: 7, hgt: 1.1 });
  L(R, curve([[428, 540], [442, 538], [446, 556], [440, 576], [431, 578], [426, 560]]), lin(426, 0, 446, 0, [[0, '#ecd4c4'], [1, '#c4a094']]), { dir: 95, maxR: 3, group: 'hand' });
  // 袖上受光的一道
  L(R, curve([[468, 286], [462, 380], [466, 470], [471, 470], [468, 380], [474, 288]]), '#fffcf4', { dir: 92, group: 'armRim', maxR: 3, hgt: 1.3 });
}

// ================= 头部板（绕颈转）=================
export function drawFyHead(R) {
  const flow = { radial: [cx(452), cy(112)] };      // 发丝从头顶往下放射
  // 后脑发块：头顶圆，后缘一条直线斜着垂到肩后（不收回来，接身体板的长发）
  L(R, c => { c.moveTo(402, 150); c.bezierCurveTo(406, 130, 428, 120, 452, 121); c.bezierCurveTo(478, 122, 496, 138, 503, 160);
    c.lineTo(512, 200); c.lineTo(520, 245); c.lineTo(528, 300); c.lineTo(486, 300); c.lineTo(466, 250); c.lineTo(440, 200); c.lineTo(420, 168); c.closePath(); },
    lin(400, 0, 528, 0, [[0, FY.hair2], [.5, FY.hair], [1, '#121016']]), { dir: flow, group: 'hairB', maxR: 9, aj: .2 });
  // 颈：细，下巴底下压一道影
  L(R, poly([[436, 226], [446, 220], [452, 216], [453, 252], [440, 252]]), lin(0, 220, 0, 252, [[0, '#8e7472'], [.55, '#b09490'], [1, '#c8aea4']]), { dir: 92, group: 'neck', maxR: 4 });
  // 脸：侧脸，前缘受光、往后稍暗
  L(R, curve(SKIN), lin(406, 0, 460, 0, [[0, '#f8e6d8'], [.6, FY.skin], [1, '#dcb8a8']]), { dir: 'edge', fallback: 90, group: 'face', maxR: 5, detail: .8 });
  R.tint(c => inF(c, c2 => { c2.ellipse(422, 183, 7, 4, .15, 0, 7); }), 'rgba(140,100,112,.30)');                        // 眼窝
  // 耳
  L(R, curve(EAR), lin(456, 0, 466, 0, [[0, '#e8cabc'], [1, '#c2a094']]), { maxR: 3, group: 'ear' });
  // 压在耳朵上的一缕（参考图里耳朵只露一半）
  L(R, curve([[455, 168], [459, 170], [462, 196], [462, 222], [458, 238], [457, 214], [456, 190]]), FY.hair, { dir: 86, group: 'earLock', maxR: 2.5 });
  // 鬓发：额角垂到下颌，挡住脸的后半
  L(R, curve([[440, 164], [447, 166], [451, 190], [453, 214], [455, 238], [451, 240], [446, 214], [442, 190]]), FY.hair, { dir: 86, group: 'lock', maxR: 3 });
  // 额发：盖住额头、眉骨和鼻梁上段，下缘几绺尖，最前一绺垂到鼻尖旁
  L(R, c => { c.moveTo(397, 152); c.bezierCurveTo(402, 132, 428, 121, 452, 124); c.bezierCurveTo(470, 128, 468, 150, 456, 167);
    c.lineTo(447, 167); c.lineTo(442, 184); c.lineTo(437, 171); c.lineTo(431, 178); c.lineTo(425, 170); c.lineTo(419, 177); c.lineTo(414, 171);
    c.lineTo(409, 186); c.lineTo(405, 203); c.lineTo(401, 188); c.lineTo(398, 170); c.closePath(); },
    lin(397, 0, 468, 0, [[0, '#34323e'], [.4, FY.hair2], [1, FY.hair]]), { dir: flow, group: 'fringe', maxR: 5, aj: .2 });
  // 头顶受光的一弯
  L(R, c => { c.moveTo(424, 133); c.bezierCurveTo(434, 127, 448, 125, 460, 127); c.bezierCurveTo(448, 128.5, 436, 131, 427, 136); c.closePath(); }, '#4a4c62', { dir: 'edge', group: 'crownHl', maxR: 2.5, hgt: 1.3 });
}

// 程序化五官（局部单位）。lid: 0 平视 .. 1 闭；look: 视线上下（-1 低垂 .. 1 抬）
export function fyFace(out, { lid = .35, look = 0, rev = 0 } = {}) {
  const ink = hex(FY.ink), [ex, ey] = RF([420.4, 183.2]);
  out.push({ x: ex, y: ey - look * 2 + lid * 1.5, ang: .22, len: 11, wid: 8.5 * (1 - lid * .6), c: ink, c2: hex('#1a2c2a'), seed: 3, type: DAB, rev, hgt: .6 });   // 眼：小而深，无高光
  const [l0, l1] = FACE.lid.map(RF);
  out.push({ x: (l0[0] + l1[0]) / 2 + 2, y: (l0[1] + l1[1]) / 2 + lid * 2, ang: Math.atan2(l1[1] - l0[1], l1[0] - l0[0]) + .08, len: 16, wid: 3, c: ink, seed: 4, type: KNIFE, taper: .6, rev, hgt: .8 });  // 上睑，往后收尖
  const [bx, by] = RF([421, 176.6]);
  out.push({ x: bx, y: by, ang: .1, len: 15, wid: 3.4, c: hex('#2c2632'), seed: 5, type: KNIFE, taper: .4, rev });   // 眉：短、平，半掩在额发下
  const [mx, my] = RF([423.5, 213.6]);
  out.push({ x: mx, y: my, ang: 0, len: 8, wid: 2.6, c: hex('#7e5856'), seed: 6, type: BRUSH, bend: 0, rev });   // 嘴：紧抿的一点
}

// 发丝：顺着发流的几道细亮线（同 demo 在板上补的手放笔触），局部单位
function strands(st, k) {
  const sw = Math.max(1.2, 2.6 * k), c = hex('#3e4054'), c2 = hex('#2a2a38');
  for (const pts of [
    [[432, 128], [414, 146], [406, 170], [404, 196]], [[446, 126], [430, 146], [420, 168]],
    [[470, 130], [492, 160], [504, 210], [514, 260], [522, 296]], [[484, 140], [500, 180], [512, 240], [520, 290]],
    [[460, 132], [470, 170], [474, 210]], [[500, 300], [512, 380], [524, 450], [532, 492]],
  ]) strokePath(st, pts.map(RF), { wid: sw, c, c2, type: LINE, step: 30, hgt: .7 });
}
export function buildFangyuan(scale = 1, seed = 11) {
  const k = Math.max(.25, scale);
  const mk = (draw, R0, extra) => {
    const R = new Ref(GRW, GRH, scale); draw(R);
    const st = paintRef(R, { R: R0.map(r => r * k).filter(r => r >= 1.1), T: 11, seed });
    const a = st.a; for (let i = 0; i < st.n; i++) { a[i * 20] -= GOX; a[i * 20 + 1] -= GOY; }
    if (extra) extra(st, k);
    return { strokes: st, ref: R };
  };
  return { body: mk(drawFyBody, [26, 13, 7, 3.5, 2]), mhy: mk(drawMhy, [16, 8, 4, 2.2]), arm: mk(drawFyArm, [16, 8, 4, 2.2]), head: mk(drawFyHead, [12, 6, 3.2, 1.8], strands) };
}
