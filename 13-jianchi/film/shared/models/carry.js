// 方源夹着马鸿运的尸体走（本段原文第264节：“被方源夹在腋下……一手夹着一个俘虏，继续朝前走”；
// 赵怜云被爱情仙蛊带走后，只剩马鸿运的尸体在一侧腋下）。同人参照：雕真人第76集、蓝兔Ai（方源白衣臂下夹尸）。
// 坐标与 FULL_SIDE 相同（量自用户参考图左二），面朝左。马鸿运：黑发少年，北原深色袍、金色腰带（同人共识），已死。
import { FULL_SIDE, FACE_SIDE, FULL_FRONT, FACE_FRONT } from './fangyuan.js';
import { profileHead, rplacer } from './profile.js';
import { strokeOutline } from './curve.js';
import { tufts } from './util.js';
export { FACE_SIDE, FACE_FRONT };

// ── 方源走路（侧身）：前脚伸出、后脚跟抬起，下摆前后分开 ──
export const FY_WALK = {
  ...FULL_SIDE,
  torso: [[428, 240], [424, 252], [414, 272], [406, 300], [401, 340], [398, 380], [396, 420], [395, 470], [393, 530], [390, 600], [380, 680], [366, 760], [350, 840], [336, 900], [328, 930], [324, 944], [340, 952], [370, 948], [400, 953], [430, 948], [460, 953], [490, 948], [520, 951], [550, 946], [566, 940], [560, 900], [548, 840], [532, 760], [515, 680], [500, 600], [489, 520], [485, 440], [482, 360], [480, 300], [476, 268], [466, 250], [452, 242], [440, 240]],
  sleeves: [], cuffs: [],
  shoes: [[[312, 952], [322, 944], [344, 944], [360, 950], [352, 958], [318, 958]], [[532, 946], [548, 936], [572, 938], [580, 948], [562, 956], [538, 955]]],
  lines: {
    lapel: FULL_SIDE.lines.lapel,
    skF: [[[398, 640], [380, 780], [352, 930]], 0.6, 0.33],
    skM: [[[440, 640], [446, 800], [452, 950]], 0.6, 0.33],
    skB: [[[480, 640], [506, 800], [540, 945]], 0.6, 0.33],
    skLeg: [[[420, 700], [404, 820], [384, 930]], 0.7, 0.45],
  },
};

const tube = (pts, w) => strokeOutline(pts, typeof w === 'number' ? w : w);
const taperW = (w0, w1) => u => w0 + (w1 - w0) * u;

// ── 马鸿运的尸体 ──
function corpse() {
  const L = [];
  // 远侧手臂（垂下）
  L.push({ fill: 'robeD', pts: tube([[322, 468], [326, 560], [330, 640]], taperW(30, 25)), part: 'armFar' });
  L.push({ fill: 'skin', pts: [[316, 636], [344, 636], [346, 664], [336, 682], [320, 676], [314, 656]], key: 'handFar' });
  // 远侧腿、近侧腿（大腿往后、小腿垂下），靴子
  const legFar = [[520, 400], [600, 430], [680, 470], [728, 540], [752, 620], [764, 676]];
  const legNear = [[508, 420], [590, 452], [664, 498], [706, 574], [726, 650], [736, 706]];
  L.push({ fill: 'robeD', pts: tube(legFar, taperW(48, 32)), part: 'legFar' });
  L.push({ fill: 'ink', pts: [[746, 656], [780, 656], [794, 700], [786, 720], [756, 718], [746, 690]], key: 'boot' });
  L.push({ fill: 'robeD', pts: tube(legNear, taperW(52, 34)), part: 'legNear' });
  L.push({ fill: 'ink', pts: [[718, 686], [752, 686], [766, 732], [756, 752], [728, 748], [718, 716]], key: 'boot' });
  L.push({ line: [[540, 440], [640, 486], [690, 560]], w: 1.2, dark: .45, key: 'fold' });
  // 躯干：腰在方源腋下，胸、肩往前垂
  const torso = [[520, 346], [460, 350], [400, 362], [340, 384], [290, 410], [258, 434], [246, 464], [258, 494], [292, 500], [340, 486], [400, 464], [460, 440], [520, 430]];
  L.push({ fill: 'robeD', pts: torso, part: 'torso' });
  L.push({ fill: 'gold', pts: [[468, 340], [488, 338], [492, 440], [472, 444]], key: 'belt' });
  L.push({ fill: 'gold', pts: [[250, 440], [266, 424], [300, 410], [296, 424], [266, 440], [256, 456]], key: 'collarTrim' });
  L.push({ line: [[300, 420], [360, 440], [420, 440]], w: 1.2, dark: .45, key: 'fold' });
  // 头：垂向前下方，脸朝地，眼闭
  const T = rplacer([250, 498], 108, -2.27);
  const cap = [[-.13, -.7], [-.1, -.88], [.06, -1.0], [.28, -1.05], [.5, -.98], [.64, -.8], [.64, -.56], [.5, -.46], [.38, -.5], [.3, -.64], [.14, -.75], [-.02, -.76]];
  L.push(...profileHead(T, { expr: 'dead', nose: .95, jaw: 1.02 }));
  L.push({ fill: 'hair', pts: cap.map(T), key: 'cap' });
  L.push({ fill: 'hair', pts: [[.2, -1.02], [.24, -1.16], [.36, -1.2], [.46, -1.12], [.44, -1.0]].map(T), key: 'bun' });
  // 往下垂的几缕散发（重力向下）
  const crown = T([.1, -1.0]), side = T([-.1, -.8]);
  for (const [x0, y0, len, w] of [[crown[0], crown[1], 46, 9], [side[0], side[1], 38, 7], [crown[0] + 12, crown[1] - 4, 30, 6]])
    L.push({ fill: 'hair', pts: [[x0 - w, y0 - 6], [x0 + w, y0 - 6], [x0 + w * .4, y0 + len * .6], [x0 - 2, y0 + len], [x0 - w * .6, y0 + len * .5]], key: 'droop' });
  // 近侧手臂（垂下，手指松开）
  L.push({ fill: 'robeD', pts: tube([[288, 476], [284, 570], [280, 652]], taperW(34, 28)), part: 'armNear' });
  L.push({ fill: 'gold', pts: tube([[280, 640], [280, 652]], 30), key: 'cuffTrim' });
  L.push({ fill: 'skin', pts: [[266, 652], [296, 652], [300, 680], [292, 704], [282, 712], [272, 700], [266, 678]], key: 'hand' });
  L.push({ line: [[276, 686], [274, 706]], w: .8, dark: .6, key: 'finger' }); L.push({ line: [[286, 690], [286, 710]], w: .8, dark: .6, key: 'finger' });
  return L;
}

// ── 方源的近侧手臂：上臂压住尸体的腰，前臂向前托住，大袖从前臂垂下盖住 ──
function arm() {
  const L = [];
  const sleeve = [[436, 250], [458, 252], [474, 268], [484, 300], [490, 350], [494, 410], [498, 470], [502, 540], [504, 600], [498, 634], [476, 640], [446, 634], [414, 622], [390, 604], [378, 560], [372, 506], [370, 462], [384, 444], [420, 438], [452, 432], [458, 400], [450, 350], [440, 300]];
  L.push({ fill: 'robe', pts: sleeve, part: 'sleeve0' });
  L.push({ fill: 'robeIn', pts: [[390, 604], [414, 622], [446, 634], [476, 640], [498, 634], [480, 628], [446, 624], [414, 612]], key: 'cuff' });
  L.push({ line: [[452, 432], [420, 438], [384, 444], [370, 462]], w: 1.2, dark: .85, key: 'forearm' });
  L.push({ line: [[476, 320], [484, 420], [492, 520], [496, 610]], w: .7, dark: .38, key: 'slvB' });
  L.push({ line: [[440, 470], [436, 540], [432, 610]], w: .7, dark: .35, key: 'slvM' });
  L.push({ line: [[400, 470], [394, 540], [398, 600]], w: .7, dark: .35, key: 'slvF' });
  // 手：从袖口伸出，按在尸体胸腹下
  L.push({ fill: 'skin', pts: [[372, 444], [356, 438], [338, 440], [326, 452], [334, 462], [352, 462], [370, 466]], key: 'hand' });
  L.push({ line: [[340, 446], [328, 452]], w: .7, dark: .7, key: 'finger' });
  return L;
}

export const FY_CARRY = { box: [100, 110, 820, 985], parts: [FY_WALK, { layers: corpse() }, { layers: arm() }] };
// 背后长发要压在尸体腿上面吗？不：尸体在近侧（离镜头更近），方源的背发在他身后，所以尸体盖住背发。

// ── 第264节前半：两人都还被夹着（马鸿运刚断气，赵怜云还在另一侧腋下，K1–K3 用）──
// 赵怜云在远侧腋下：大部分被方源的身子挡住，只露出前面的白发头、肩，和后面的腿。老妪，白发（第246节），哭不出声。
function zhao() {
  const L = [];
  L.push({ fill: 'robeIn', pts: strokeOutline([[528, 318], [610, 334], [676, 380], [706, 452], [716, 516]], u => 40 - 14 * u), part: 'zLegs' });
  L.push({ fill: 'ink', pts: [[700, 500], [732, 500], [740, 534], [726, 548], [702, 542]], key: 'zShoe' });
  L.push({ fill: 'robeIn', pts: [[400, 296], [340, 300], [300, 318], [280, 340], [292, 366], [330, 366], [400, 352]], part: 'zTorso' });
  const T = rplacer([300, 372], 96, -0.9);
  L.push(...profileHead(T, { age: .95, female: 1, expr: 'cry', nose: 1.05 }));
  L.push({ fill: 'hairW', pts: [[-.13, -.7], [-.08, -.9], [.1, -1.02], [.32, -1.04], [.52, -.95], [.6, -.76], [.56, -.58], [.44, -.5], [.36, -.58], [.3, -.7], [.14, -.79], [-.02, -.78]].map(T), key: 'zCap' });
  L.push({ fill: 'hairW', pts: [[.42, -1.0], [.5, -1.14], [.64, -1.18], [.72, -1.08], [.68, -.96], [.56, -.92]].map(T), key: 'zBun' });
  L.push({ fill: 'gold', pts: [[-.1, -.76], [.1, -.86], [.32, -.86], [.32, -.8], [.1, -.8], [-.08, -.71]].map(T), key: 'zCirclet' });
  return L;
}
export const FY_CARRY2 = { box: [100, 110, 820, 985], parts: [{ layers: zhao() }, FY_WALK, { layers: corpse() }, { layers: arm() }] };

// ── K4：赵怜云被爱情仙蛊带走以后，方源一手把着马鸿运的尸体，抬头看那道湛蓝光柱（头绕颈后仰一点，身子不动）──
export const FY_CARRY_UP = { box: FY_CARRY.box, parts: [{ ...FY_WALK, head: { ...FY_WALK.head, rot: 0.2, pivot: [446, 258] } }, { layers: corpse() }, { layers: arm() }] };

// ── K11：正面，方源朝镜头走来，左臂下仍夹着马鸿运（参考 refs/river/16.jpg 漫画格：尸体横在他左胯边、朝着镜头，
// 看得见垂下的头顶和两只垂下的手，腿在他身后看不见）。坐标同 FULL_FRONT（量自用户参考图），尸体在画面右侧（他的左边）。
function corpseBack() { return [{ fill: 'robeD', pts: [[196, 556], [276, 548], [292, 580], [282, 612], [212, 620], [192, 596]], part: 'cTorso' }]; }   // 肩背：压在他的袖子底下
function corpseFront() {
  const L = [];
  L.push({ fill: 'robeD', pts: tube([[208, 606], [204, 680], [200, 752]], taperW(24, 20)), part: 'cArmL' });
  L.push({ fill: 'robeD', pts: tube([[262, 606], [266, 684], [270, 760]], taperW(24, 20)), part: 'cArmR' });
  L.push({ fill: 'gold', pts: tube([[200, 742], [200, 754]], 22), key: 'cuffTrim' }); L.push({ fill: 'gold', pts: tube([[270, 750], [270, 762]], 22), key: 'cuffTrim' });
  L.push({ fill: 'skin', pts: [[190, 754], [210, 754], [212, 776], [204, 792], [194, 788], [189, 772]], key: 'hand' });
  L.push({ fill: 'skin', pts: [[260, 762], [280, 762], [282, 784], [274, 800], [264, 796], [259, 780]], key: 'hand' });
  // 垂下的头：朝着镜头的是头顶（黑发、发髻），脸朝地看不见
  const hair = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; hair.push([236 + Math.cos(a) * 30, 640 + Math.sin(a) * 36 * (Math.sin(a) > 0 ? 1.1 : .9)]); }
  L.push({ fill: 'hair', pts: hair, key: 'cHead' });
  L.push({ fill: 'hair', pts: [[226, 600], [232, 590], [244, 590], [250, 600], [240, 606]], key: 'cBun' });
  for (const [x0, x1] of [[222, 214], [236, 236], [250, 258]]) L.push({ line: [[236 + (x0 - 236) * .3, 612], [x0, 650], [x1, 676]], w: .9, dark: .3, key: 'strand' });
  return L;
}
export const FY_FRONT_CARRY = { box: FULL_FRONT.box, parts: [{ layers: corpseBack() }, FULL_FRONT, { layers: corpseFront() }] };
