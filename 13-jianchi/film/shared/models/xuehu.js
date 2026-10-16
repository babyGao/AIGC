// 雪胡老祖母版。原文这几章没写长相，按同人共识：白发束髻插簪、两鬓散发、白长须过胸、浓白眉、白毛裘披风、深色袍；
// 暴怒时双目赤红（原文第264节）。脸的比例量自松楠剧制正脸特写（BV1zLNd6ME7B，1280×720 画面坐标），画法统一成线稿。
const mir = (pts, cx = 640) => pts.map(([x, y]) => [2 * cx - x, y]).reverse();
const mirL = (pts, cx = 640) => pts.map(([x, y]) => [2 * cx - x, y]);

// 共用部件
// 毛皮边：沿折线生成一簇簇毛尖（向外）
function tufts(pts, out = 1, h = 26, n = 0) {
  const o = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0), k = Math.max(1, Math.round(L / 22));
    const nx = -(y1 - y0) / L * out, ny = (x1 - x0) / L * out;
    for (let j = 0; j < k; j++) {
      const r1 = Math.abs(Math.sin((i * 13 + j * 7 + n) * 12.9898) * 43758.5) % 1, r2 = Math.abs(Math.sin((i * 7 + j * 3 + n) * 78.233) * 12345.6) % 1;
      const u0 = j / k, u1 = (j + .35 + r2 * .3) / k, hh = h * (.35 + .9 * r1), lean = (r2 - .3) * .9;
      o.push([x0 + (x1 - x0) * u0, y0 + (y1 - y0) * u0]);
      o.push([x0 + (x1 - x0) * u1 + nx * hh + (x1 - x0) / L * hh * lean, y0 + (y1 - y0) * u1 + ny * hh + (y1 - y0) / L * hh * lean]);
    }
  }
  o.push(pts[pts.length - 1]); return o;
}
const browA = [[600, 212], [562, 188], [512, 168], [462, 156], [412, 147], [372, 145], [338, 152]], browB = [[598, 236], [562, 224], [518, 212], [470, 202], [422, 194], [384, 190], [338, 153]];
const eyeL = { up: [[432, 233], [456, 217], [490, 212], [524, 219], [546, 233]], low: [[432, 233], [460, 244], [495, 247], [530, 242], [546, 233]], iris: [489, 230, 15], red: false };
const mous = [[640, 424], [604, 426], [566, 437], [528, 460], [500, 494], [482, 536], [462, 588], [452, 620], [488, 590], [520, 548], [556, 510], [600, 486], [640, 476]];
const skin = [[478, -30], [560, -40], [640, -44], [720, -40], [802, -30], [850, 40], [870, 150], [874, 260], [862, 360], [838, 440], [792, 488], [720, 520], [640, 530], [560, 520], [488, 488], [442, 440], [418, 360], [406, 260], [410, 150], [430, 40]];
const cap = [[392, 160], [388, 80], [404, 4], [450, -62], [530, -104], [640, -118], [750, -104], [830, -62], [876, 4], [892, 80], [888, 160], [864, 80], [818, 16], [742, -22], [640, -34], [538, -22], [462, 16], [416, 80]];
const knot = [[600, -132], [604, -180], [622, -206], [640, -212], [658, -206], [676, -180], [680, -132], [660, -118], [620, -118]];
const beard = [[452, 452], [474, 530], [486, 610], [476, 700], [492, 780], [520, 846], [540, 884], [566, 852], [596, 900], [640, 950], [684, 902], [716, 856], [742, 886], [762, 846], [790, 780], [804, 700], [794, 610], [806, 530], [828, 452], [760, 480], [700, 520], [640, 536], [580, 520], [520, 480]];
const backHair = [[640, -140], [520, -122], [430, -72], [376, 10], [352, 130], [342, 270], [326, 450], [300, 680], [282, 900], [998, 900], [980, 680], [954, 450], [938, 270], [928, 130], [904, 10], [850, -72], [760, -122]];
const furL = [[140, 960], [150, 820], [196, 730], [270, 672], [360, 636], [440, 622], [486, 640], [504, 720], [512, 830], [506, 960]];

function face(roar) {
  const L = [];
  L.push({ fill: 'robeD', pts: [[200, 960], [260, 760], [450, 640], [640, 700], [830, 640], [1020, 760], [1080, 960]] });     // 深色袍
  // 后发：耳后几缕垂到背后，发梢参差
  for (const [ax, w0, len, sd] of [[386, 46, 760, 1], [404, 36, 600, 2], [372, 30, 520, 3]]) {
    const a = [], b = [];
    for (let k = 0; k <= 6; k++) { const u = k / 6, y = 120 + len * u, x = ax - 30 * u - 18 * Math.sin(u * 3 + sd), w = w0 * (1 - u * .9); a.push([x - w / 2, y]); b.push([x + w / 2, y]); }
    b[6] = a[6];
    L.push({ lock: { a, b }, role: 'hairW', strands: 3, sw: 1.1 }); L.push({ lock: { a: mirL(a), b: mirL(b) }, role: 'hairW', strands: 3, sw: 1.1 });
  }
  L.push({ fill: 'skin', pts: skin, part: 'face' });
  L.push({ line: [[420, 290], [446, 330], [470, 352]], w: 1.4, dark: .4, key: 'cheek' }); L.push({ line: mirL([[420, 290], [446, 330], [470, 352]]), w: 1.4, dark: .4, key: 'cheek' });
  // 鬓边散发：两缕细绺，带波浪，从太阳穴垂过腮到胸前
  for (const [x0, w0, ph, len] of [[412, 22, 0, 600], [432, 14, 1.7, 470]]) {
    const a = [], b = [];
    for (let k = 0; k <= 8; k++) { const u = k / 8, y = 40 + len * u, x = x0 - 14 * u + 10 * Math.sin(u * 6 + ph), w = w0 * (1 - u * .85); a.push([x - w / 2, y]); b.push([x + w / 2, y]); }
    b[8] = a[8];
    L.push({ lock: { a, b }, role: 'hairW', strands: 2, sw: 1 }); L.push({ lock: { a: mirL(a), b: mirL(b) }, role: 'hairW', strands: 2, sw: 1 });
  }
  // 发顶：往后梳向发髻的发丝
  L.push({ fill: 'hairW', pts: cap });
  for (let k = 0; k < 9; k++) { const u = (k + .5) / 9, x0 = 410 + u * 460, y0 = -10 - 26 * Math.sin(u * Math.PI); L.push({ line: [[x0, y0 + 30], [x0 + (640 - x0) * .45, y0 - 40], [640 + (x0 - 640) * .1, -120]], w: 1.3, dark: .45, key: 'hs' }); }
  L.push({ fill: 'hairW', pts: knot }); L.push({ line: knot, closed: true, w: 2.2, dark: .85, key: 'knot' });
  L.push({ line: [[612, -170], [640, -164], [668, -170]], w: 1.4, dark: .5, key: 'knot' });
  L.push({ line: [[520, -160], [600, -168], [680, -168], [764, -156]], w: 7, dark: 1, key: 'pin' });
  L.push({ fill: 'gold', pts: [[612, -134], [622, -150], [640, -156], [658, -150], [668, -134], [640, -128]] });   // 发冠
  // 额纹、眉间竖纹（怒）
  for (const [y, w] of [[20, 1.6], [52, 1.4], [84, 1.3]]) L.push({ line: [[530, y + 12], [585, y], [640, y - 3], [695, y], [750, y + 12]], w, dark: .42, key: 'wrinkle' });
  L.push({ line: [[614, 168], [619, 202], [624, 238]], w: 2.6, dark: .85, key: 'furrow' }); L.push({ line: [[666, 168], [661, 202], [656, 238]], w: 2.6, dark: .85, key: 'furrow' });
  // 眼窝阴影 + 眼
  const sh = [[420, 206], [470, 196], [540, 208], [578, 234], [540, 238], [470, 230]];
  L.push({ fill: 'shade', pts: sh }); L.push({ fill: 'shade', pts: mir(sh) });
  const eL = roar ? { ...eyeL, up: eyeL.up.map(([x, y]) => [x, y - 5]), low: eyeL.low.map(([x, y]) => [x, y + 2]), iris: [489, 229, 11], red: true } : eyeL;
  L.push({ eye: eL }); L.push({ eye: { up: mirL(eL.up), low: mirL(eL.low), iris: [2 * 640 - eL.iris[0], eL.iris[1], eL.iris[2]], red: eL.red } });
  L.push({ line: eL.up, w: 4.4, dark: 1, key: 'lid' }); L.push({ line: mirL(eL.up), w: 4.4, dark: 1, key: 'lid' });
  L.push({ line: [[454, 262], [489, 270], [524, 263]], w: 1.4, dark: .45, key: 'bag' }); L.push({ line: mirL([[454, 262], [489, 270], [524, 263]]), w: 1.4, dark: .45, key: 'bag' });
  // 浓白眉：一大簇往外上挑，眉头压低（怒）；下缘一道深线压住眼
  const dy = roar ? (x => (x > 500 ? 14 : 5)) : (() => 0);
  const bA = browA.map(([x, y]) => [x, y + dy(x)]), bB = browB.map(([x, y]) => [x, y + dy(x)]);
  L.push({ lock: { a: bA, b: bB }, role: 'hairW', strands: 6, sw: 1.2 });
  L.push({ lock: { a: mirL(bA), b: mirL(bB) }, role: 'hairW', strands: 6, sw: 1.2 });
  for (const tf of [[[372, 150], [346, 132], [326, 128]], [[392, 158], [360, 166], [338, 178]], [[420, 150], [396, 134]]]) { const t2 = tf.map(([x, y]) => [x, y + dy(x)]); L.push({ line: t2, w: 2.2, dark: .55, key: 'tuft' }); L.push({ line: mirL(t2), w: 2.2, dark: .55, key: 'tuft' }); }
  L.push({ line: bB.slice(0, 6), w: 4, dark: 1, key: 'brow' }); L.push({ line: mirL(bB.slice(0, 6)), w: 4, dark: 1, key: 'brow' });
  L.push({ line: bA, w: 1.6, dark: .7, key: 'browTop' }); L.push({ line: mirL(bA), w: 1.6, dark: .7, key: 'browTop' });
  // 鼻
  L.push({ line: [[662, 254], [668, 330], [674, 382]], w: 2.2, dark: .7, key: 'nose' });
  L.push({ line: [[584, 398], [598, 414], [624, 412], [640, 420], [658, 412], [684, 414], [698, 398]], w: 3.2, dark: .95, key: 'noseTip' });
  L.push({ line: [[566, 384], [544, 420], [532, 454]], w: 2, dark: .6, key: 'fold' }); L.push({ line: mirL([[566, 384], [544, 420], [532, 454]]), w: 2, dark: .6, key: 'fold' });
  // 须：长须一整把，八字胡压在上面
  L.push({ fill: 'hairW', pts: beard }); L.push({ line: beard, closed: true, w: 1.8, dark: .7, key: 'beardEdge' });
  for (const [x0, x1, y1, bend] of [[500, 520, 860, -14], [534, 560, 880, 10], [566, 590, 860, -8], [600, 620, 920, 12], [640, 640, 940, -10], [676, 662, 920, 8], [710, 688, 860, -12], [744, 724, 880, 10], [778, 760, 850, -8]])
    L.push({ line: [[x0, 520], [x0 + (x1 - x0) * .3 + bend, 640], [x0 + (x1 - x0) * .7 - bend, 760], [x1, y1]], w: 1.3, dark: .45, key: 'bs' });
  if (roar) {
    L.push({ fill: 'dark', pts: [[574, 488], [640, 482], [706, 488], [716, 522], [698, 568], [640, 588], [582, 568], [564, 522]], key: 'mouth' });
    L.push({ fill: 'skin', pts: [[584, 490], [640, 486], [696, 490], [694, 504], [640, 499], [586, 504]], key: 'teeth' });
    L.push({ fill: 'skin', pts: [[598, 566], [640, 576], [682, 566], [690, 556], [640, 566], [590, 556]], key: 'teethB' });
    L.push({ line: [[566, 524], [574, 488], [640, 482], [706, 488], [714, 524]], w: 2.6, dark: 1, key: 'lipTop' });
  } else {
    L.push({ line: [[588, 502], [640, 498], [692, 502]], w: 3.4, dark: 1, key: 'mouth' });
  }
  L.push({ fill: 'hairW', pts: mous }); L.push({ fill: 'hairW', pts: mir(mous) });
  L.push({ line: mous, closed: true, w: 1.8, dark: .75, key: 'mousEdge' }); L.push({ line: mir(mous), closed: true, w: 1.8, dark: .75, key: 'mousEdge' });
  for (const pts of [[[630, 432], [590, 450], [548, 486], [512, 540]], [[624, 448], [584, 470], [544, 512]]]) { L.push({ line: pts, w: 1.2, dark: .45, key: 'ms' }); L.push({ line: mirL(pts), w: 1.2, dark: .45, key: 'ms' }); }
  // 白毛裘：毛尖向外的两团
  const fL = tufts(furL.slice(0, 6), -1, 30).concat(furL.slice(6));
  L.push({ fill: 'fur', pts: fL }); L.push({ fill: 'fur', pts: mir(fL) });
  for (const pts of [[[330, 760], [380, 720], [440, 700]], [[320, 830], [380, 790], [460, 770]], [[350, 880], [420, 850], [480, 840]]]) { L.push({ line: pts, w: 1.4, dark: .45, key: 'fs' }); L.push({ line: mirL(pts), w: 1.4, dark: .45, key: 'fs' }); }
  return L;
}
export const XH_FACE = { box: [140, -260, 1140, 960], layers: face(false) };
export const XH_ROAR = { box: [140, -260, 1140, 960], layers: face(true) };
