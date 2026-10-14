// 写意人物：他（宽肩大汉，乱发束起，毛边大氅，赤手）、她（纤长，长发及腰，曳地长裙）、门童（小孩，双髻）。
// 改写自 Lemo-Opuscar ink-wash demo 的 hero.js（MIT）：沿用「一块淡墨身体 + 两笔含墨 + 焦墨四肢」的画法与姿势插值，
// 去掉斗笠与剑（斗笠只在她乔装时用），加上头发、大氅、长裙、手掌。
// 姿势 = 关节字典（身高 100，y 向下为正，脚底为原点，面朝右）。每一帧按姿势重新生成笔触（种子固定 → 笔毫纹理稳定）。
import { mk, draw, mass, blot, TONE } from '../engine/ink.js';
import { lerp, clamp } from '/core/lib.js';

// ---------------- 姿势 ----------------
const side = (o) => ({ v: 'side', tilt: 0, aB: null, flare: .4, rib: [-1, .08, 20], ...o });
export const POSE = {
  stand: side({ H: [-.5, -46], C: [1.5, -75], Hd: [3.5, -83], aF: [[2.5, -74], [6, -60], [9, -49]], aB: [[.5, -74], [-1, -60], [-1, -49]], lF: [[1, -46], [3, -23], [4, 0]], lB: [[-1, -46], [-2, -23], [-4, 0]], hemF: [10, -6], hemB: [-13, -6.5] }),
  look: side({ H: [-.5, -46], C: [0, -75], Hd: [1.5, -83], tilt: -.12, aF: [[1, -74], [5, -60], [8, -49]], aB: [[-1, -74], [-3, -60], [-3, -49]], lF: [[1, -46], [3, -23], [4, 0]], lB: [[-1, -46], [-2, -23], [-4, 0]], hemF: [10, -6], hemB: [-13, -6.5] }),
  walk1: side({ H: [0, -46], C: [2.5, -75], Hd: [4.5, -83], aF: [[2.5, -74], [0, -61], [-4, -51]], aB: [[1.5, -74], [7, -61], [11, -52]], lF: [[1, -46], [5, -23], [9, 0]], lB: [[-1, -46], [-4, -23], [-9, 0]], hemF: [12, -6], hemB: [-14, -5.5], flare: .5 }),
  walk2: side({ H: [0, -47.5], C: [2.5, -76.5], Hd: [4.5, -84.5], aF: [[2.5, -75.5], [4, -62], [5, -51]], aB: [[1.5, -75.5], [2, -62], [3, -51]], lF: [[1, -47.5], [1, -24], [0, -1]], lB: [[-1, -47.5], [2, -27], [-3, -9]], hemF: [10, -7], hemB: [-12, -6], flare: .5 }),
  run1: side({ H: [0, -47], C: [8, -75], Hd: [12, -82], tilt: -.14, aF: [[7, -74], [15, -64], [22, -70]], aB: [[6, -74], [-3, -65], [-11, -60]], lF: [[1, -47], [13, -36], [10, -17]], lB: [[-1, -47], [-9, -28], [-21, -15]], hemF: [13, -20], hemB: [-24, -24], flare: 1.3 }),
  run2: side({ H: [0, -49], C: [8, -77], Hd: [12, -84], tilt: -.14, aF: [[7, -76], [0, -66], [-6, -59]], aB: [[6, -76], [14, -66], [20, -71]], lF: [[1, -49], [9, -27], [15, -2]], lB: [[-1, -49], [-8, -36], [-16, -30]], hemF: [14, -10], hemB: [-24, -26], flare: 1.3 }),
  palm: side({ H: [-1, -43], C: [4, -71], Hd: [6, -80], tilt: -.04, aF: [[4, -70], [19, -71], [34, -72]], aB: [[1, -70], [-9, -64], [-15, -71]], lF: [[2, -43], [15, -24], [24, 0]], lB: [[-2, -43], [-15, -22], [-26, 0]], hemF: [19, -8], hemB: [-24, -6], flare: 1.1, rib: [-1, -.05, 30] }),
  wind: side({ H: [-1, -45], C: [-1, -73], Hd: [1, -81], tilt: .02, aF: [[0, -72], [10, -66], [16, -70]], aB: [[-2, -72], [-12, -66], [-18, -70]], lF: [[1, -45], [8, -23], [12, 0]], lB: [[-1, -45], [-8, -23], [-12, 0]], hemF: [14, -6], hemB: [-17, -6], flare: .8 }),
  sit: side({ H: [-3, -11], C: [0, -40], Hd: [2.5, -48.5], tilt: .05, aF: [[1, -39], [10, -28], [17, -22]], aB: [[-1, -39], [7, -29], [14, -24]], lF: [[-2, -11], [14, -24], [21, -1]], lB: [[-4, -11], [12, -22], [17, 0]], hemF: [18, -6], hemB: [-15, -2], flare: .2 }),
  sitBow: side({ H: [-3, -11], C: [2, -38], Hd: [6, -44], tilt: .5, aF: [[3, -37], [12, -27], [18, -23]], aB: [[1, -37], [9, -28], [15, -25]], lF: [[-2, -11], [14, -24], [21, -1]], lB: [[-4, -11], [12, -22], [17, 0]], hemF: [18, -6], hemB: [-15, -2], flare: .2 }),
  kneelHold: side({ H: [-4, -30], C: [1, -57], Hd: [6, -63], tilt: .42, aF: [[2, -56], [13, -45], [24, -42]], aB: [[0, -56], [10, -40], [22, -35]], lF: [[-2, -30], [12, -30], [14, 0]], lB: [[-5, -30], [-6, -4], [-22, 0]], hemF: [17, -2], hemB: [-24, -2], flare: .3 }),
  kneelLook: side({ H: [-4, -30], C: [1, -58], Hd: [4, -66], tilt: -.05, aF: [[2, -57], [13, -46], [24, -43]], aB: [[0, -57], [10, -41], [22, -36]], lF: [[-2, -30], [12, -30], [14, 0]], lB: [[-5, -30], [-6, -4], [-22, 0]], hemF: [17, -2], hemB: [-24, -2], flare: .3 }),
  write: side({ H: [-2, -34], C: [3, -62], Hd: [7, -70], tilt: .2, aF: [[4, -61], [13, -50], [22, -47]], aB: [[2, -61], [9, -49], [17, -47]], lF: [[0, -34], [13, -34], [14, 0]], lB: [[-2, -34], [11, -33], [11, 0]], hemF: [16, -2], hemB: [-11, -2], flare: .1 }),
  reach: side({ H: [0, -46], C: [3, -75], Hd: [5.5, -83], aF: [[3, -74], [13, -73], [22, -76]], aB: [[1, -74], [9, -66], [16, -63]], lF: [[1, -46], [5, -23], [8, 0]], lB: [[-1, -46], [-4, -23], [-7, 0]], hemF: [12, -6], hemB: [-13, -6] }),
  cloak: side({ H: [0, -46], C: [2, -75], Hd: [4, -83], tilt: .12, aF: [[3, -74], [12, -86], [21, -92]], aB: [[0, -74], [-6, -62], [-6, -52]], lF: [[1, -46], [5, -23], [8, 0]], lB: [[-1, -46], [-3, -23], [-6, 0]], hemF: [12, -6], hemB: [-14, -6], flare: .5 }),
  fall: side({ H: [0, -50], C: [-10, -74], Hd: [-16, -80], tilt: .55, aF: [[-9, -73], [-2, -86], [5, -96]], aB: [[-10, -73], [-22, -81], [-30, -90]], lF: [[1, -50], [11, -30], [18, -12]], lB: [[-1, -50], [5, -27], [4, -6]], hemF: [18, -14], hemB: [-6, -18], flare: -1, rib: [1, -.2, 30] }),
  lie: side({ H: [0, -46], C: [-1, -74], Hd: [-1, -82], tilt: -.25, aF: [[0, -73], [4, -60], [6, -50]], aB: [[-1, -73], [-3, -60], [-2, -50]], lF: [[1, -46], [2, -23], [3, 0]], lB: [[-1, -46], [0, -23], [0, 0]], hemF: [9, -4], hemB: [-9, -4], flare: 0 }),
  // 正面 / 背面
  front: { v: 'front', H: [0, -46], C: [0, -75], Hd: [0, -83], tilt: 0, aL: [[-8.5, -74], [-11, -60], [-11.5, -48]], aR: [[8.5, -74], [11, -60], [11.5, -48]], lL: [[-3, -46], [-4, -23], [-4.5, 0]], lR: [[3, -46], [4, -23], [4.5, 0]], hemL: [-14, -5.5], hemR: [14, -5.5], rib: [0, 1, 0] },
  back: { v: 'back', H: [0, -46], C: [0, -75], Hd: [0, -83], tilt: 0, aL: [[-8.5, -74], [-11, -60], [-11.5, -48]], aR: [[8.5, -74], [11, -60], [11.5, -48]], lL: [[-3, -46], [-4, -23], [-4.5, 0]], lR: [[3, -46], [4, -23], [4.5, 0]], hemL: [-14, -5.5], hemR: [14, -5.5], rib: [.3, 1, 14] },
  sitBack: { v: 'back', H: [0, -11], C: [0, -40], Hd: [0, -48.5], tilt: 0, aL: [[-8.5, -39], [-12, -28], [-9, -18]], aR: [[8.5, -39], [12, -28], [9, -18]], lL: [[-4, -11], [-7, -6], [-8, 0]], lR: [[4, -11], [7, -6], [8, 0]], hemL: [-16, -1], hemR: [16, -1], rib: [.3, 1, 10] },
  sitBackBow: { v: 'back', H: [0, -11], C: [0, -38], Hd: [0, -44.5], tilt: 0, aL: [[-8.5, -37], [-11, -26], [-7, -17]], aR: [[8.5, -37], [11, -26], [7, -17]], lL: [[-4, -11], [-7, -6], [-8, 0]], lR: [[4, -11], [7, -6], [8, 0]], hemL: [-16, -1], hemR: [16, -1], rib: [.3, 1, 10] },
  snap: { v: 'front', H: [0, -46], C: [0, -75], Hd: [0, -83], tilt: 0, aL: [[-8.5, -74], [-14, -63], [-5, -61]], aR: [[8.5, -74], [14, -63], [5, -61]], lL: [[-3, -46], [-6, -23], [-8, 0]], lR: [[3, -46], [6, -23], [8, 0]], hemL: [-15, -5.5], hemR: [15, -5.5], rib: [0, 1, 0] },
  wave: { v: 'front', H: [0, -46], C: [0, -75], Hd: [0, -83], tilt: 0, aL: [[-8.5, -74], [-11, -60], [-11.5, -48]], aR: [[8.5, -74], [16, -85], [19, -99]], lL: [[-3, -46], [-4, -23], [-4.5, 0]], lR: [[3, -46], [4, -23], [4.5, 0]], hemL: [-14, -5.5], hemR: [14, -5.5], rib: [0, 1, 0] },
  boySit: { v: 'front', H: [0, -12], C: [0, -40], Hd: [0, -49], tilt: 0, aL: [[-8.5, -39], [-10, -28], [-2, -26]], aR: [[8.5, -39], [10, -28], [2, -25]], lL: [[-4, -12], [-6, -6], [-6, 0]], lR: [[4, -12], [6, -6], [6, 0]], hemL: [-13, -4], hemR: [13, -4], rib: [0, 1, 0] },
};

// 递归插值两个姿势（数组/数字），非数值取 b
export function mixPose(a, b, t) {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, t);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((x, i) => mixPose(x, b[i], t));
  if (a === null || b === null) return t < .5 ? a : b;
  if (a && b && typeof a === 'object' && typeof b === 'object') { const o = {}; for (const k in b) o[k] = k in a ? mixPose(a[k], b[k], t) : b[k]; return o; }
  return t < .5 ? a : b;
}
// 两拍走路：phase 0..1 → 姿势
export function walkPose(ph, run = false) {
  const a = run ? POSE.run1 : POSE.walk1, b = run ? POSE.run2 : POSE.walk2;
  const u = (ph % 1 + 1) % 1, k = u < .5 ? u * 2 : (1 - u) * 2;
  const p = mixPose(a, b, k);
  if (u >= .5) {   // 后半拍：左右腿、左右臂对调
    return { ...p, lF: p.lB.map((q, i) => i === 0 ? p.lF[0] : q), lB: p.lF.map((q, i) => i === 0 ? p.lB[0] : q), aF: p.aB ? p.aB.map((q, i) => i === 0 ? p.aF[0] : q) : p.aF, aB: p.aF.map((q, i) => i === 0 ? (p.aB ? p.aB[0] : q) : q) };
  }
  return p;
}

// ---------------- 笔触生成 ----------------
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]], mid = (a, b, t = .5) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const rot = (p, c, a) => { const s = Math.sin(a), co = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * co - y * s, c[1] + x * s + y * co]; };
const curve = (a, c, b, n) => { const o = []; for (let i = 0; i < n; i++) { const t = n === 1 ? .5 : i / (n - 1), u = 1 - t; o.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } return o; };
const LOAD = (w, tone, dark, o = {}) => ({ w, tone, darkDir: dark, side: o.side ?? .85, brWet: true, body: o.body ?? .18, dry: o.dry ?? .38, wet: .9, prof: o.prof || 'robe', nb: o.nb, rough: .12 });

function legBelow(l, hemY) {
  const [hp, kn, ft] = l;
  if (kn[1] >= hemY) { const u = clamp((hemY - hp[1]) / ((kn[1] - hp[1]) || 1)); return [mid(hp, kn, u), kn, ft]; }
  const u = clamp((hemY - kn[1]) / ((ft[1] - kn[1]) || 1)); return [mid(kn, ft, u), ft];
}

// 斗笠（只在她乔装时用）
function hatStrokes(S, Hd, tilt, half, M, skew = 0) {
  const R = p => rot(p, Hd, tilt);
  const by = Hd[1] - 3, ap = [Hd[0] + skew, by - 11.5];
  const bl = [Hd[0] - half * .92, by + .4], br = [Hd[0] + half * 1.05, by + .8], bc = [Hd[0] + skew * .3, by + 1.6];
  M([R(ap), R(add2(mid(ap, bl), [-.6, -.8])), R(bl), R(bc), R(br), R(add2(mid(ap, br), [.6, -.8]))], .5);
  S([R(add2(bl, [2, -1])), R(add2(bc, [0, -1.6])), R(add2(br, [-2, -1]))], LOAD(4, .55, [0, 1], { dry: .5, prof: 'lens' }));
  S([R(add2(ap, [-.3, .3])), R(add2(mid(ap, bl), [-.6, -.6])), R(bl)], { w: 2.4, tone: TONE.jiao, wet: .2, dry: .5, prof: 'nail' });
  S([R(add2(ap, [.3, .3])), R(add2(mid(ap, br), [.6, -.6])), R(br)], { w: 2.2, tone: TONE.jiao, wet: .2, dry: .55, prof: 'nail' });
  S([R([bl[0] - 1.2, bl[1] + .2]), R(bc), R([br[0] + 1.2, br[1] + .2])], { w: 1.9, tone: TONE.jiao, wet: .1, dry: .45, prof: 'tip' });
}

// 头发：him = 头顶一团焦墨 + 发髻 + 几缕散发；her = 发髻 + 簪 + 一笔长发垂到腰；boy = 双髻
// 椭圆弧点列（局部坐标）：中心 c，半径 rx/ry，角度 a0→a1（弧度，0 = 右，π/2 = 下）
const arc = (c, rx, ry, a0, a1, n = 10) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry]); } return o; };

// 侧面的头：清墨一团脸 + 一线侧脸 + 头发（him 乱发 + 髻 + 散发；her 发髻 + 簪 + 一笔长发；boy 双髻）
function hairSide(S, M, Hd, tilt, K, t, wind) {
  const R = p => rot(p, Hd, tilt), RR = pts => pts.map(R);
  if (K.hat) return;
  const c = [Hd[0] - .4, Hd[1] - .8];
  if (K.type === 'him') {
    // 头发：从额顶经后脑到后颈的一大块（外沿是头的椭圆，内沿是发际线 → 耳后）
    M(RR([...arc(c, 5.6, 6.4, -1.25, -Math.PI - .2, 9), ...arc(c, 5.6, 6.4, -Math.PI - .2, -Math.PI - 1.15, 3).slice(1), [Hd[0] - 3.2, Hd[1] + 4.6], [Hd[0] - 1.2, Hd[1] + 1.2], [Hd[0] - .4, Hd[1] - 2.6], [Hd[0] + 2.2, Hd[1] - 4.6]]), .66);
    S(RR(arc(c, 5.7, 6.5, -1.2, -Math.PI - .5, 6)), { w: 2.2, tone: TONE.jiao, dry: .5, wet: .3, prof: 'brush' });
    S.B(...R([Hd[0] - 1.8, Hd[1] - 8.4]), 2.4, .9, 0, .85, 5);
    S([R([Hd[0] - 1.8, Hd[1] - 7.2]), R([Hd[0] - 2.2, Hd[1] - 10.5])], { w: 1, tone: TONE.jiao, dry: .4, prof: 'tip' });
    for (let i = 0; i < 4; i++) {     // 散发随风
      const a = [Hd[0] - 5, Hd[1] - 1.5 + i * 1.6], sw = Math.sin(t * 4.3 + i * 1.7) * 1.2;
      S([R(a), R([a[0] - 5 - wind * 4, a[1] + 2.5 + sw]), R([a[0] - 9 - wind * 9, a[1] + 4.5 + sw * 1.6])], { w: .8, tone: TONE.nong, dry: .6, prof: 'tip' });
    }
  } else if (K.type === 'her') {
    M(RR([...arc(c, 5.2, 6, -1.35, -Math.PI - .3, 9), [Hd[0] - 3.4, Hd[1] + 4.8], [Hd[0] - 1, Hd[1] + 1.4], [Hd[0] - .2, Hd[1] - 2.8], [Hd[0] + 2.4, Hd[1] - 4.6]]), .68);
    S.B(...R([Hd[0] - 4.6, Hd[1] - 5.4]), 3, .88, .4, .8, 9);                     // 发髻
    S([R([Hd[0] - 8.5, Hd[1] - 8.6]), R([Hd[0] - 1.4, Hd[1] - 4.2])], { w: .7, tone: TONE.jiao, dry: .3, prof: 'tip' });   // 簪
    const sw = Math.sin(t * 2.6) * 1.8, w = wind;     // 长发：从脑后一笔含墨垂到腰，随风摆
    S([R([Hd[0] - 4.6, Hd[1] + 1]), [Hd[0] - 6.4 - w * 6, Hd[1] + 12 + sw * .3], [Hd[0] - 8 - w * 14, Hd[1] + 24 + sw], [Hd[0] - 9 - w * 22, Hd[1] + 36 + sw * 1.5]],
      LOAD(4.4, .82, [-1, 0], { dry: .4, prof: 'cone', side: .7 }));
  } else if (K.type === 'boy') {
    M(RR([...arc(c, 5, 5.6, -1.4, -Math.PI - .4, 8), [Hd[0] - 2, Hd[1] + 2], [Hd[0], Hd[1] - 3]]), .55);
    S.B(...R([Hd[0] - 3.5, Hd[1] - 6.3]), 2.4, .85, 0, .9, 3);
    S.B(...R([Hd[0] + 2.6, Hd[1] - 6.6]), 2.4, .85, 0, .9, 4);
  }
}

function faceSide(S, Hd, tilt, K) {
  const R = p => rot(p, Hd, tilt);
  S([R([Hd[0] + 1, Hd[1] - 3]), R([Hd[0] + 1.6, Hd[1] + .5]), R([Hd[0] + .8, Hd[1] + 4.6])], { w: 7.4, tone: .09, wet: 1, dry: 0, prof: 'lens' });   // 脸：一笔清墨
  S([R([Hd[0] + 3.3, Hd[1] - 3.4]), R([Hd[0] + 3.9, Hd[1] - 1]), R([Hd[0] + 5, Hd[1] + .6]), R([Hd[0] + 4, Hd[1] + 1.6]), R([Hd[0] + 4.3, Hd[1] + 3]), R([Hd[0] + 3.4, Hd[1] + 4.1]), R([Hd[0] + 1.6, Hd[1] + 5.4])], { w: 1.05, tone: TONE.nong, dry: .35, prof: 'tip' });
  S([R([Hd[0] + 1.4, Hd[1] - 1.6]), R([Hd[0] + 3.2, Hd[1] - 1.9])], { w: .9, tone: TONE.jiao, dry: .35, prof: 'tip' });   // 眉
  if (K.type === 'him') {
    S([R([Hd[0] + 3.2, Hd[1] + 3.6]), R([Hd[0] + 1.4, Hd[1] + 7])], { w: 1.3, tone: TONE.nong, dry: .6, prof: 'tip' });
    S([R([Hd[0] - 1.4, Hd[1] + 2.8]), R([Hd[0] + .6, Hd[1] + 6.4])], { w: 1.1, tone: TONE.zhong, dry: .7, prof: 'tip' });
  }
  if (K.eye !== false) S([R([Hd[0] + 2, Hd[1] - .4]), R([Hd[0] + 3.2, Hd[1] - .5])], { w: .75, tone: TONE.jiao, dry: .3, prof: 'tip' });
}

// 大氅：肩后一块淡墨，下摆随风飘出；背后一笔含墨（浓边朝外）；领口毛边是几笔干笔
function cloakSide(S, M, P, t, wind) {
  const [cx, cy] = P.C, Hd = P.Hd;
  const nape = [Hd[0] - 4.5, Hd[1] + 5], sh = [cx - 3, cy + 1];
  const fl = Math.max(.3, P.flare) + wind, sw = Math.sin(t * 2.2) * 1.5;
  const tail = [P.hemB[0] - 10 * fl - 4, P.hemB[1] - 6 * fl + 2 + sw], low = [P.hemB[0] - 2 - 3 * fl, P.hemB[1] + 1];
  const back = [cx - 12 - 4 * fl, cy + 18];
  M([add2(nape, [1, -1]), sh, back, tail, low, mid(low, [P.H[0], P.H[1] + 30], .3), [cx + 1, cy + 8]], .17);
  S([add2(nape, [0, -1]), back, mid(back, tail, .55), tail], LOAD(9, .74, [-1, 0], { dry: .45 }));
  for (let i = 0; i < 6; i++) {
    const a = mid([Hd[0] - 5, Hd[1] + 4.5], [Hd[0] + 3.5, Hd[1] + 7], i / 5);
    S([a, [a[0] - 1.6 + (i % 2) * .8, a[1] + 2.4]], { w: 1.3, tone: TONE.nong, dry: .7, prof: 'tip' });
  }
}

function sideStrokes(P, S, M, t, K) {
  const [hx, hy] = P.H, [cx, cy] = P.C, Hd = P.Hd, wind = K.wind ?? 0;
  const bwK = K.type === 'him' ? 1.25 : K.type === 'her' ? .85 : .9;
  const nape = [Hd[0] - 3.5, Hd[1] + 5], bw = [hx - 7 * bwK, hy - 1], fw = [hx + 7 * bwK, hy - 2], chestF = [cx + 5 * bwK, cy + 1.5];
  const hemF = K.skirt ? [P.hemF[0], Math.max(P.hemF[1], P.lF[2][1] - 1.5)] : P.hemF, hemB = K.skirt ? [P.hemB[0] - 3, Math.max(P.hemB[1], P.lB[2][1] - 1)] : P.hemB;
  const tail = [hemB[0] - 6 * P.flare, hemB[1] - 3 * Math.abs(P.flare)];
  const hemC = [lerp(hemB[0], hemF[0], .5), Math.max(hemB[1], hemF[1]) + 1];
  const hem = curve(tail, hemC, hemF, 4), hem40 = curve(tail, hemC, hemF, 40);
  if (K.cloak) cloakSide(S, M, P, t, wind);
  if (P.aB) {   // 后臂（最淡）
    const [s, e, h] = P.aB;
    S([s, e, h], LOAD(7.5 * (K.type === 'him' ? 1.15 : 1), .4, [0, 1], { dry: .5 }));
    if (K.hands !== false) S([add2(h, [0, 1]), add2(h, [1, 3.6])], { w: 2.4, tone: .2, wet: .7, dry: .1, prof: 'dot' });
  }
  const hemAt = x => { let best = hem40[0][1], bd = 1e9; for (const q of hem40) { const d = Math.abs(q[0] - x); if (d < bd) { bd = d; best = q[1]; } } return best; };
  for (const l of [P.lB, P.lF]) {
    const kx = lerp(l[1][0], l[2][0], .3);
    const seg = legBelow(l, hemAt(kx) + 1.5);
    if (seg[0][1] < l[2][1] - .5) S(seg, { w: K.type === 'him' ? 2.2 : 1.8, tone: TONE.nong, dry: .45, wet: .1, prof: 'even' });
    const ft = l[2];
    S([[ft[0] - 1, ft[1] - .5], [ft[0] + 3.6, ft[1] + .1]], { w: 2.2, tone: TONE.jiao, dry: .25, wet: .2, prof: 'nail' });
  }
  M([nape, chestF, add2(fw, [1, 0]), hemF, ...hem.slice(1, -1).reverse(), tail, add2(bw, [-1, 0])], (K.type === 'her' ? .15 : .19) + .05 * clamp(P.flare - .8));
  S([[nape[0] + .5, nape[1] - 1], add2(mid(nape, bw), [-1.6, 0]), [bw[0] - .8, bw[1]], add2(mid(bw, tail, .55), [-1.4, 0]), tail], LOAD(10 * bwK, .78, [-1, 0], { dry: .42 }));
  S([[chestF[0] - 1, chestF[1] - 1.5], add2(mid(chestF, fw), [1, 0]), fw, add2(mid(fw, hemF), [.6, 0]), hemF], LOAD(7 * bwK, .55, [1, 0], { dry: .5 }));
  S([add2(mid(nape, chestF, .5), [0, 7]), add2(mid(bw, fw, .45), [0, 2]), hem[1]], { w: 1.2, tone: TONE.zhong, dry: .75, prof: 'tip' });
  S([[Hd[0] - 1.5, Hd[1] + 6], [cx + 3.5, cy + 3.5], [fw[0] - 1, fw[1] - 6]], { w: 2.1, tone: TONE.nong, dry: .45, prof: 'tip' });
  S(hem.map((p, i) => [p[0], p[1] + (i === 0 || i === hem.length - 1 ? 0 : .8)]), { w: 1.6, tone: TONE.zhong, dry: .7, prof: 'tip' });
  S([[bw[0] - 1, bw[1] - 1.5], [hx, hy - 2.5], [fw[0] + 1.2, fw[1] - 2]], { w: K.type === 'her' ? 2.2 : 3.4, tone: TONE.jiao, dry: .3, wet: .2, prof: 'nail' });
  S([[bw[0] + 1, bw[1] - 1], [bw[0] - 2 + P.rib[0] * 3, bw[1] + 6], [bw[0] - 1 + P.rib[0] * 6 - wind * 4, bw[1] + 12]], { w: 1.5, tone: TONE.nong, dry: .45, prof: 'tip' });
  {   // 前臂：宽袖
    const [sh, e, h] = P.aF, droop = add2(mid(e, h, .6), [-.5 - wind * 3, K.type === 'her' ? 10 : 7.5]);
    M([add2(sh, [-2, -1]), add2(e, [0, -2]), add2(h, [0, -2.2]), add2(h, [.5, 4]), droop, add2(e, [-1, 3])], .12);
    S([[sh[0] - 1, sh[1] - .5], add2(e, [0, 1]), add2(h, [0, .5])], LOAD(7 * (K.type === 'him' ? 1.15 : 1), .5, [0, 1], { dry: .45 }));
    S([add2(e, [-.5, 3]), droop, add2(h, [.4, 4.2])], LOAD(3.5, .7, [0, 1], { dry: .5, prof: 'tip' }));
    S([add2(h, [-.4, -1.5]), add2(h, [.3, 3.2])], { w: 1.8, tone: TONE.nong, dry: .45, prof: 'tip' });
    if (K.hands !== false) hand(S, h, Math.atan2(h[1] - e[1], h[0] - e[0]), K.palm);
  }
  faceSide(S, Hd, P.tilt, K);
  hairSide(S, M, Hd, P.tilt, K, t, wind);
  if (K.hat) hatStrokes(S, Hd, P.tilt, 20, M, -1);
}

// 手：一团清墨掌心；palm=true 时张开（四指几笔短线）
function hand(S, h, a, open) {
  const d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
  const c = add2(h, [d[0] * 2.4, d[1] * 2.4]);
  S([add2(c, [-d[0] * 1.6, -d[1] * 1.6]), add2(c, [d[0] * 1.6, d[1] * 1.6])], { w: 3.4, tone: .2, wet: .8, dry: .1, prof: 'dot' });
  if (open) {
    for (let i = 0; i < 4; i++) {
      const o = (i - 1.5) * 1.1, b = add2(c, [n[0] * o + d[0] * 1.3, n[1] * o + d[1] * 1.3]);
      S([b, add2(b, [d[0] * 3.6 - n[0] * .3 * (i - 1.5), d[1] * 3.6 - n[1] * .3 * (i - 1.5)])], { w: .9, tone: TONE.nong, dry: .35, prof: 'tip' });
    }
    S([add2(c, [-n[0] * 2.2, -n[1] * 2.2]), add2(c, [-n[0] * 3.6 + d[0] * 1.8, -n[1] * 3.6 + d[1] * 1.8])], { w: .9, tone: TONE.nong, dry: .35, prof: 'tip' });
  }
}

function frontStrokes(P, S, M, t, K, back = false) {
  const [hx, hy] = P.H, [cx, cy] = P.C, Hd = P.Hd;
  const k = K.type === 'him' ? 1.22 : K.type === 'her' ? .86 : .92;
  const sL = [cx - 8.5 * k, cy + 1.5], sR = [cx + 8.5 * k, cy + 1.5];
  const nL = [Hd[0] - 4.5, Hd[1] + 6], nR = [Hd[0] + 4.5, Hd[1] + 6];
  const wL = [hx - 7.5 * k, hy - 1], wR = [hx + 7.5 * k, hy - 1];
  const hemL = K.skirt ? [P.hemL[0] - 2, Math.max(P.hemL[1], -1.5)] : P.hemL, hemR = K.skirt ? [P.hemR[0] + 2, Math.max(P.hemR[1], -1.5)] : P.hemR;
  const hemC = [hx, Math.max(hemL[1], hemR[1]) + 1.2];
  const hem = curve(hemL, hemC, hemR, 5);
  const sleeve = (a, sd) => {
    const [sh, e, h] = a, droop = add2(mid(e, h, .55), [sd * 2.5, K.type === 'her' ? 10 : 8]);
    M([add2(sh, [-sd * 2, -1]), add2(e, [sd * 1.5, -1]), add2(h, [0, -1.5]), add2(h, [0, 4]), droop, add2(e, [-sd * 1, 3])], .12);
    S([sh, add2(e, [sd * 1, 1]), h], LOAD(7 * (K.type === 'him' ? 1.15 : 1), .5, [sd, .3], { dry: .45 }));
    S([add2(e, [sd * 1.5, 3]), droop, add2(h, [0, 4.2])], LOAD(3.5, .66, [sd, 1], { dry: .5, prof: 'tip' }));
  };
  if (K.cloak) {   // 正/背面的大氅：肩后一大块，两侧垂下
    const fl = (K.wind ?? 0) * 6, sw = Math.sin(t * 2.2) * 1.2;
    M([add2(sL, [-3, -2]), add2(sR, [3, -2]), [hx + 17 * k + fl, hemC[1] - 4 + sw], [hx, hemC[1] + 1], [hx - 17 * k + fl, hemC[1] - 4 - sw]], back ? .26 : .14);
    S([add2(sL, [-2, -1]), [hx - 15 * k + fl, hy], [hx - 17 * k + fl, hemC[1] - 4 - sw]], LOAD(8, .72, [-1, 0], { dry: .45 }));
    S([add2(sR, [2, -1]), [hx + 15 * k + fl, hy], [hx + 17 * k + fl, hemC[1] - 4 + sw]], LOAD(8, .7, [1, 0], { dry: .45 }));
    for (let i = 0; i < 7; i++) { const a = mid(add2(nL, [-2, -1]), add2(nR, [2, -1]), i / 6); S([a, add2(a, [(i - 3) * .3, 2.6])], { w: 1.3, tone: TONE.nong, dry: .7, prof: 'tip' }); }
  }
  for (const l of [P.lL, P.lR]) {
    const seg = legBelow(l, hemC[1] - 3);
    if (!K.skirt) S(seg, { w: K.type === 'him' ? 2.2 : 1.9, tone: TONE.nong, dry: .45, wet: .1, prof: 'even' });
    const ft = l[2]; S([[ft[0] - 1.5, ft[1] - .3], [ft[0] + 1.5, ft[1]]], { w: 2.2, tone: TONE.jiao, dry: .25, wet: .2, prof: 'lens' });
  }
  M([nL, sL, add2(wL, [-1, 0]), ...hem, add2(wR, [1, 0]), sR, nR], K.type === 'her' ? .15 : .19);
  S([add2(nL, [-.5, -1]), add2(mid(sL, wL), [-1.2, 0]), add2(wL, [-.8, 0]), add2(mid(wL, hemL), [-.8, 0]), hemL], LOAD(8.5 * k, back ? .72 : .66, [-1, 0], { dry: .42 }));
  S([add2(nR, [.5, -1]), add2(mid(sR, wR), [1.2, 0]), add2(wR, [.8, 0]), add2(mid(wR, hemR), [.8, 0]), hemR], LOAD(8 * k, back ? .68 : .6, [1, 0], { dry: .46 }));
  S(hem, { w: 1.5, tone: TONE.zhong, dry: .7, prof: 'tip' });
  if (!back) {
    S([[Hd[0] - 4, Hd[1] + 5.5], [Hd[0] + 1, cy + 4], [hx + 4.5, hy - 4]], { w: 2.2, tone: TONE.nong, dry: .45, prof: 'tip' });
    S([[Hd[0] + 4, Hd[1] + 5.5], [Hd[0] + 1.5, cy + 2]], { w: 2, tone: TONE.nong, dry: .45, prof: 'tip' });
  } else {
    S([[Hd[0], Hd[1] + 7], [cx + .3, cy + 12], [hx, hy - 3], [hx - .5, hy + 20]], { w: 1.3, tone: TONE.zhong, dry: .7, prof: 'tip' });
  }
  S([[wL[0] - 1, wL[1] - 2.5], [hx, hy - 3.2], [wR[0] + 1, wR[1] - 2.5]], { w: K.type === 'her' ? 2.2 : 3.4, tone: TONE.jiao, dry: .3, wet: .2, prof: 'nail' });
  sleeve(P.aL, -1); sleeve(P.aR, 1);
  for (const a of [P.aL, P.aR]) { const h = a[2]; S([add2(h, [0, 3.8]), add2(h, [0, 6.2])], { w: 2.6, tone: .2, wet: .7, dry: .1, prof: 'dot' }); }
  const R = p => rot(p, Hd, P.tilt), RR = pts => pts.map(R);
  if (K.hat) { hatStrokes(S, Hd, P.tilt, 20, M); return; }
  const c = [Hd[0], Hd[1] - .6];
  if (!back) {
    M(RR(arc([Hd[0], Hd[1] + .4], 4.3, 5.4, 0, Math.PI * 2, 14)), .09);      // 脸
    if (K.type === 'him') S(RR(arc([Hd[0], Hd[1] + .4], 4.4, 5.5, .35, Math.PI - .35, 7)), { w: .8, tone: TONE.zhong, dry: .6, prof: 'tip' });   // 下颌
    S([R([Hd[0] - 2.9, Hd[1] - 1.5]), R([Hd[0] - 1, Hd[1] - 1.8])], { w: .8, tone: TONE.jiao, dry: .35, prof: 'tip' });
    S([R([Hd[0] + 1, Hd[1] - 1.8]), R([Hd[0] + 2.9, Hd[1] - 1.5])], { w: .8, tone: TONE.jiao, dry: .35, prof: 'tip' });
    if (K.smile) {
      S([R([Hd[0] - 2.5, Hd[1] + .1]), R([Hd[0] - 1.8, Hd[1] - .4]), R([Hd[0] - 1.1, Hd[1] + .1])], { w: .6, tone: TONE.jiao, dry: .3, prof: 'tip' });
      S([R([Hd[0] + 1.1, Hd[1] + .1]), R([Hd[0] + 1.8, Hd[1] - .4]), R([Hd[0] + 2.5, Hd[1] + .1])], { w: .6, tone: TONE.jiao, dry: .3, prof: 'tip' });
    } else {
      S.B(...R([Hd[0] - 1.8, Hd[1] - .1]), .45, .9, 0, .7, 2); S.B(...R([Hd[0] + 1.8, Hd[1] - .1]), .45, .9, 0, .7, 3);
    }
    S([R([Hd[0], Hd[1] + .6]), R([Hd[0] + .3, Hd[1] + 2.2])], { w: .6, tone: TONE.zhong, dry: .5, prof: 'tip' });
    if (K.type === 'him') S([R([Hd[0] - 2.4, Hd[1] + 3.6]), R([Hd[0], Hd[1] + 6.6]), R([Hd[0] + 2.4, Hd[1] + 3.6])], { w: 1.2, tone: TONE.zhong, dry: .65, prof: 'tip' });
  }
  // 头发（正面：头顶一顶发；背面：整个后脑）
  const cap = back ? RR(arc(c, 5.2, 6.2, 0, Math.PI * 2, 16)) : RR([...arc(c, 5.2, 6, -Math.PI - .25, .25, 10), [Hd[0] + 3.6, Hd[1] - 2.2], [Hd[0], Hd[1] - 3.4], [Hd[0] - 3.6, Hd[1] - 2.2]]);
  if (K.type === 'him') {
    M(cap, back ? .62 : .6);
    S.B(...R([Hd[0], Hd[1] - 8.4]), 2.4, .9, 0, .85, 7);
    if (back) for (let i = 0; i < 3; i++) S([R([Hd[0] - 3 + i * 3, Hd[1] + 3]), R([Hd[0] - 3.5 + i * 3 - (K.wind ?? 0) * 3, Hd[1] + 8])], { w: .9, tone: TONE.nong, dry: .6, prof: 'tip' });
  } else if (K.type === 'her') {
    M(cap, back ? .64 : .62);
    S.B(...R([Hd[0], Hd[1] - 8.6]), 2.9, .88, 0, .75, 9);
    const sw = Math.sin(t * 2.6) * 1.2, w = K.wind ?? 0;
    if (back) S([R([Hd[0], Hd[1] + 4]), [Hd[0] - w * 6, Hd[1] + 18 + sw], [Hd[0] - w * 12, Hd[1] + 34]], LOAD(6, .8, [-1, 0], { dry: .42, prof: 'cone' }));
    else for (const sd of [-1, 1]) S([R([Hd[0] + sd * 4.8, Hd[1] - 1]), [Hd[0] + sd * 5.6 - w * 4, Hd[1] + 10 + sw], [Hd[0] + sd * 6 - w * 8, Hd[1] + 20]], LOAD(2.4, .8, [sd, 0], { dry: .42, prof: 'cone' }));
  } else if (K.type === 'boy') {
    M(cap, .55);
    S.B(...R([Hd[0] - 4, Hd[1] - 6.2]), 2.4, .85, 0, .9, 3);
    S.B(...R([Hd[0] + 4, Hd[1] - 6.2]), 2.4, .85, 0, .9, 4);
  }
}

// 画人物。K: {type:'him'|'her'|'boy', cloak, skirt, hat, palm, wind, eye, smile}
// X: {x, y, s, dir, seed, t, am, p(画出进度 0..1), boil, rot(整体旋转，绕脚底)}
export function figure(L, pose, K, X = {}) {
  const x0 = X.x ?? 0, y0 = X.y ?? 0, sc = X.s ?? 1, dir = X.dir ?? 1, t = X.t ?? 0, am = X.am ?? 1, ro = X.rot ?? 0;
  const list = [];
  let idx = 0;
  const cr = Math.cos(ro), sr = Math.sin(ro);
  const T = p => { const x = p[0] * dir, y = p[1]; return [x0 + (x * cr - y * sr) * sc, y0 + (x * sr + y * cr) * sc, p[2] ?? 1]; };
  const S = (pts, o) => {
    const oo = { ...o, w: o.w * sc, seed: (X.seed ?? 7) * 1000 + (idx++) * 97, gapLen: 45 * sc, boil: X.boil ? (Math.floor(X.boil) % 5) : 0 };
    if (o.darkDir) { const dx = o.darkDir[0] * dir, dy = o.darkDir[1]; oo.darkDir = [dx * cr - dy * sr, dx * sr + dy * cr]; }
    list.push({ s: mk(pts.map(T), oo) });
  };
  S.B = (x, y, r, a, rr = 0, sq = 1, seed = 0) => list.push({ b: { p: T([x, y]), r: r * sc, a, rr, sq, seed } });
  const M = (poly, a) => { list.push({ m: poly.map(T), a, seed: idx++ }); };
  if (pose.v === 'side') sideStrokes(pose, S, M, t, K);
  else frontStrokes(pose, S, M, t, K, pose.v === 'back');
  const p = X.p ?? 1, N = list.length;
  for (let i = 0; i < N; i++) {
    const it = list[i];
    const pi = p >= 1 ? 1 : (p - i / N * .8) / .25;
    if (pi <= 0) continue;
    if (it.s) draw(L, it.s, pi, am);
    else if (it.m) mass(L.wet, it.m, it.a * am * clamp(pi), .6 * sc, it.seed);
    else if (it.b) blot(L.wet, it.b.p[0], it.b.p[1], it.b.r, it.b.a * am * clamp(pi), it.b.rr, it.b.sq, it.b.seed);
  }
  return list;
}
