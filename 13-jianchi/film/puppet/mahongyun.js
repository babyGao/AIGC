// 马鸿运的尸体（皮影，同 houyi.js 的做法）：被方源夹在腋下，身子横着，头、两臂、两腿、下摆都朝下垂，各自铆住会荡。
// 造型依据：北原少年，深色袍、金色腰带、黑发束髻（素材库同人共识）；已死：闭眼、嘴微张。脸是空脸（同情的角色）。
// 局部坐标：夹持点（腰）在原点，身子朝 +x（头在前），背朝上。
import { piece, drawPiece, fill, cut, cutLine, cutTaper, ink, within, lattice, coin, cloud, beads, beadLine, plum, rivet, DYE } from './carve.js';
import { spline } from './fangyuan.js';
import { mul, T, R, ap, set } from './rig.js';
const sp = (pts, sharp = []) => q => spline(q, pts, true, sharp);
export const MC = { robe: DYE.blue, robe2: '#1d3d6a', gold: DYE.gold, ink: DYE.ink, skin: DYE.skin, inner: DYE.white };
export const MJ = { neck: [66, -4], shF: [50, 8], shB: [44, 4], hipF: [-26, 6], hipB: [-34, 2], skirt: [-12, 10], elbow: [0, 44], knee: [0, 70] };

// 头：侧脸朝 +x（画的时候整片转下去，脸朝地）；闭眼、嘴微张；黑发束髻，几缕散发
function head() {
  return piece([-40, -74, 30, 16], g => {
    const hair = sp([[16, -56], [8, -64], [-6, -67], [-20, -62], [-28, -48], [-30, -30], [-26, -14], [-16, -4], [-10, -16], [-9, -32], [-6, -46], [2, -52], [10, -54]]);
    fill(g, MC.ink, hair);
    within(g, hair, () => { for (let k = 0; k < 7; k++) cutTaper(g, [[12 - k * 4, -58 + k], [-14 - k * 1.5, -54 + k * 2.5], [-22 - k * .4, -30 + k * 3]], 1.1); });
    const bun = sp([[-14, -64], [-12, -74], [-2, -76], [4, -70], [-2, -63]]);
    fill(g, MC.ink, bun); fill(g, MC.gold, q => q.rect(-13, -68, 14, 3.2)); ink(g, 1, q => q.rect(-13, -68, 14, 3.2));
    // 空脸
    ink(g, 2, q => spline(q, [[6, 10], [7, -2], [11, -9], [16, -12], [17.5, -15.5], [17, -18.5], [18.8, -20.4], [18.4, -23.6], [19.6, -26], [22.6, -29], [20.6, -34], [19, -42], [18, -50], [16, -56]], false, [9]));
    ink(g, 1.1, q => { q.moveTo(16, -12); q.quadraticCurveTo(4, -11, -8, -26); });
    ink(g, 1.2, q => { q.moveTo(-6, -40); q.bezierCurveTo(-12, -41, -13, -28, -7, -28.5); });
    fill(g, MC.ink, q => spline(q, [[16.4, -48.4], [9, -49.6], [1, -49.8], [1, -48.4], [9, -48.2], [16, -47]]));
    ink(g, 1.4, q => { q.moveTo(15.6, -42.6); q.quadraticCurveTo(8, -39.6, 1, -42.4); });        // 闭眼：一道往下弯的睑线
    ink(g, .7, q => { q.moveTo(13, -40.6); q.lineTo(12, -38.6); q.moveTo(9, -40); q.lineTo(8.4, -38); q.moveTo(5, -40.4); q.lineTo(4.4, -38.6); });   // 睫
    ink(g, 1.1, q => { q.moveTo(17.8, -19.8); q.lineTo(13.4, -20.6); });                           // 嘴微张
    ink(g, .9, q => { q.moveTo(20.2, -27); q.quadraticCurveTo(17.6, -28.4, 18.6, -25.6); });
    // 散发
    for (const [x, y, l] of [[-26, -20, 26], [-20, -10, 22]]) cutTaper(g, [[x, y], [x - 2, y + l * .5], [x - 1, y + l]], 0);
    fill(g, MC.ink, q => spline(q, [[-26, -18], [-22, -16], [-24, 6], [-27, 14], [-29, -2]], [3]));
  }, { seed: 81 });
}
function torso() {
  return piece([-46, -26, 74, 26], g => {
    const b = sp([[-40, -10], [-30, -20], [0, -22], [36, -20], [58, -18], [70, -8], [70, 12], [56, 18], [30, 16], [0, 18], [-30, 18], [-42, 10]]);
    fill(g, MC.robe, b);
    within(g, b, () => { lattice(g, -46, -26, 74, 22, 8, 1.8); fill(g, MC.robe, q => q.arc(26, -2, 10, 0, 7)); cloud(g, 26, -2, 7, 0, 1.3, 1); ink(g, 1.2, q => q.arc(26, -2, 10, 0, 7)); });
    const belt = sp([[-12, -22], [2, -22], [2, 18], [-12, 18]], [0, 1, 2, 3]);
    fill(g, MC.gold, belt); within(g, belt, () => { for (let y = -16; y < 16; y += 8.5) coin(g, -5, y, 3); }); ink(g, 1.3, belt);
    const col = sp([[58, -18], [70, -8], [70, 12], [62, 14], [62, -6], [54, -14]]);
    fill(g, MC.gold, col); ink(g, 1.2, col);
    ink(g, 2.2, b);
  }, { seed: 82 });
}
function skirt() {   // 下摆：从腰垂下去
  return piece([-30, -6, 34, 104], g => {
    const s = sp([[-20, -2], [18, -2], [24, 50], [30, 94], [-2, 100], [-26, 94], [-24, 50]], [3, 5]);
    fill(g, MC.robe, s);
    within(g, s, () => { for (let y = 12, r = 0; y < 90; y += 16, r++) for (let x = -26 + (r % 2) * 7; x < 30; x += 14) cloud(g, x, y, 5, (x + y) * .1, 1.3, r % 2 ? 1 : -1); const h = sp([[-26, 82], [28, 80], [30, 94], [-2, 100], [-26, 94]]); fill(g, MC.gold, h); within(g, h, () => beadLine(g, -22, 90, 26, 88, 1.3, 5)); ink(g, 1.2, h); });
    g.save(); g.beginPath(); s(g); g.clip(); ink(g, 4, s, MC.robe2); g.restore();
    ink(g, 2, s);
  }, { seed: 83 });
}
function upperArm() {
  return piece([-14, -12, 14, 52], g => {
    const a = sp([[-10, -4], [10, -4], [11, 44], [-10, 44]]);
    fill(g, MC.robe, a); within(g, a, () => lattice(g, -12, -6, 12, 46, 7, 1.6)); ink(g, 1.7, a);
    fill(g, MC.robe, q => q.arc(0, 44, 9, 0, 7)); ink(g, 1.4, q => q.arc(0, 44, 9, 0, 7));
  }, { seed: 84 });
}
function foreArm() {
  return piece([-14, -10, 16, 66], g => {
    const a = sp([[-9, -2], [9, -2], [10, 34], [-9, 34]], [0, 1]);
    fill(g, MC.robe, a); within(g, a, () => lattice(g, -11, 0, 11, 34, 6.6, 1.5)); ink(g, 1.5, a);
    const cf = sp([[-10, 32], [10, 32], [10, 40], [-10, 40]], [0, 1, 2, 3]); fill(g, MC.gold, cf); ink(g, 1.2, cf);
    const h = sp([[-6, 40], [6, 40], [8, 50], [6, 60], [1, 64], [-3, 60], [-6, 50]]);   // 松开的手，指尖朝下
    fill(g, MC.skin, h); cutLine(g, .7, q => { q.moveTo(1, 48); q.lineTo(1.5, 60); }); cutLine(g, .7, q => { q.moveTo(-2.4, 48); q.lineTo(-2.4, 58); }); ink(g, 1.4, h);
  }, { seed: 85 });
}
function thigh() {
  return piece([-16, -10, 16, 80], g => {
    const t = sp([[-12, -4], [12, -4], [11, 70], [-11, 70]]);
    fill(g, MC.robe2, t); within(g, t, () => lattice(g, -14, -6, 14, 72, 7.4, 1.6)); ink(g, 1.7, t);
    fill(g, MC.robe2, q => q.arc(0, 70, 10, 0, 7)); ink(g, 1.4, q => q.arc(0, 70, 10, 0, 7));
  }, { seed: 86 });
}
function shin() {   // 小腿 + 靴（靴尖朝 +x）
  return piece([-14, -10, 34, 96], g => {
    const t = sp([[-10, -2], [10, -2], [10, 50], [-10, 50]], [0, 1]);
    fill(g, MC.robe2, t); within(g, t, () => lattice(g, -12, 0, 12, 50, 7, 1.5)); ink(g, 1.5, t);
    const boot = sp([[-11, 46], [11, 46], [12, 72], [24, 80], [30, 86], [28, 92], [-12, 92]], [6]);
    fill(g, MC.ink, boot); within(g, boot, () => { cloud(g, 0, 62, 5.5, .3, 1.3); cutLine(g, 1, q => { q.moveTo(-10, 52); q.lineTo(10, 52); }); }); ink(g, 1.1, boot, '#000');
  }, { seed: 87 });
}
let P = null;
export function build() { if (P) return P; P = { head: head(), torso: torso(), skirt: skirt(), ua: upperArm(), fa: foreArm(), thigh: thigh(), shin: shin() }; return P; }

// 由夹持点（世界/屏幕坐标）定尸体的矩阵：身子横着（tilt：头一侧往下的倾角），头朝夹人者面朝的方向
export function corpseAt(hold, k, flip = false, tilt = .12) { const f = flip ? -1 : 1; return mul(T(...hold), mul([f * k, 0, 0, k, 0, 0], R(tilt))); }
// M：夹持点（腰）的屏幕矩阵（含身子的倾角）；sw：各摆动件相对“竖直下垂”的摆角
export const DANGLE = { head: 0, armF: [0, 0], armB: [0, 0], legF: [0, 0], legB: [0, 0], skirt: 0 };
export function drawCorpse(g, M, sw = {}) {
  const P = build(), s = { ...DANGLE, ...sw };
  // 垂挂件：在世界里竖直朝下（再加摆角）；镜像的时候左右也跟着镜像
  const k = Math.hypot(M[0], M[1]), f = M[0] * M[3] - M[1] * M[2] < 0 ? -1 : 1;
  const hang = (Mp, j, a) => mul(T(...ap(Mp, ...j)), mul([f * k, 0, 0, k, 0, 0], R(a)));
  const Mhead = mul(T(...ap(M, ...MJ.neck)), mul([f * k, 0, 0, k, 0, 0], R(Math.PI * .55 + s.head)));   // 头垂下去：脸朝前下方
  const arm = (j, a) => { const Mu = hang(M, j, a[0]); const Mf = hang(Mu, MJ.elbow, a[1]); return [Mu, Mf]; };
  const leg = (j, a) => { const Mt = hang(M, j, a[0] + .75); const Ms = hang(Mt, MJ.knee, a[1] + .15); return [Mt, Ms]; };   // 大腿往后拖、小腿垂下
  const [MuB, MfB] = arm(MJ.shB, s.armB), [MuF, MfF] = arm(MJ.shF, s.armF);
  const [MtB, MsB] = leg(MJ.hipB, s.legB), [MtF, MsF] = leg(MJ.hipF, s.legF);
  const Msk = hang(M, MJ.skirt, s.skirt - .15);
  const dp = (Mm, pc) => { set(g, Mm); drawPiece(g, pc); };
  g.save(); g.globalCompositeOperation = 'multiply';
  dp(MuB, P.ua); dp(MfB, P.fa); dp(MtB, P.thigh); dp(MsB, P.shin);
  dp(Msk, P.skirt); dp(M, P.torso); dp(MtF, P.thigh); dp(MsF, P.shin);
  dp(Mhead, P.head); dp(MuF, P.ua); dp(MfF, P.fa);
  g.restore();
  set(g, [1, 0, 0, 1, 0, 0]);
  for (const [Mm, j] of [[M, MJ.neck], [M, MJ.shF], [M, MJ.hipF], [MuF, MJ.elbow], [MtF, MJ.knee]]) { const q = ap(Mm, ...j); rivet(g, q[0], q[1], 3 * k); }
  return { Mhead, MfF, MsF };
}
