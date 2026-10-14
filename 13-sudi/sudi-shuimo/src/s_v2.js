// 主歌二「孤岛」124.1–163.8：孤岛雪雨 → 雪落满肩，Clawd 举手接雪 → 云开，Clawd 踩水捞起海上的星 → 把星放进他掌心 →
// 竖摇下沉到深谷孤坟 → 掌心金锁的字一笔笔显出（她的笑在墨晕里）→ 手指按进墨里，墨洇成江湖 → 拉远，江湖缩进星河命盘
import { mk, draw, blot, mass, qpts } from '../engine/ink.js';
import { figure, POSE, mixPose } from './figure.js';
import { clawd } from './clawd.js';
import * as P from './props.js';
import { EV, ch, line } from './timeline.js';
import { cam, seg, key, clamp, lerp, eio, eo, ss, t12, hop } from './util.js';
import { mulberry } from '/core/lib.js';
import { pine, cliff } from '../engine/land.js';
import { bigHand } from './s_v1.js';

const himK = { type: 'him', cloak: true }, herK = { type: 'her', skirt: true };
const M1 = '缠扰孤岛的雪雨', M2 = '飘飘洒洒谁来停', M3 = '摘取一颗海上星', M4 = '陪我终夜不孤寂', M5 = '灵柩长埋深谷底', M6 = '没有永远的秘密', M7 = '染指江湖结悲局', M8 = '无人逃得过宿命';
const T23 = 122.6, T24 = ch(M2, 0) - .2, T25 = ch(M3, 0) - .3, T26 = ch(M4, 0) - .2, T27 = ch(M5, 0) - .5, T28 = ch(M6, 0) - .3, T29 = ch(M7, 0) - .3, T30 = ch(M8, 0) - .4, TEND = 163.757;

function sea(L, t, dark) {
  P.wash(L.wet, -200, -200, 2120, 1280, dark ? .58 : .3, dark ? .5 : .12);
  P.waveLines(L, -200, 2120, 860, 1080, { n: 8, t, am: .45, seed: 1100 });
}
// 23：孤岛，大远景
function island(t, A) {
  const L = A.ink, C = cam(A, 960, 560, key(t, [[T23, .95], [T24, 1.05]], 'lin')), tt = t12(t);
  sea(L, t, false);
  P.islandRock(L, 960, 905, 1.25, { seed: 500 });
  figure(L, POSE.sitBack, { ...himK, wind: .4 }, { x: 930, y: 905 - 94 * 1.25, s: 1.9, seed: 3, t: tt });
  clawd(L, { x: 1010, y: 905 - 92 * 1.25, s: 3, eyes: 'u', arms: 'down', legs: 'sit', t: tt, seed: 5 });
  P.snow(L, t, { n: 160, speed: 70, drift: .5, size: 2.4 });
  P.rain(L, t, { n: 70, am: .35, ang: .35, len: 50 });
  return { ...C, bleed: 5, rim: 1 };
}
// 24：中景，雪落满肩；Clawd 抖雪、举手接雪
function shoulders(t, A) {
  const L = A.ink, C = cam(A, 960, 540, key(t, [[T24, 1], [T25, 1.06]], 'lin')), tt = t12(t);
  P.wash(L.wet, -100, -100, 2020, 1180, .34, .2);
  P.islandRock(L, 960, 1180, 3, { seed: 501 });
  figure(L, POSE.sitBackBow, { ...himK, wind: .3 }, { x: 820, y: 1180 - 70 * 3, s: 5.2, seed: 3, t: tt });
  // 肩上的积雪：越积越多
  const n = Math.floor(10 + 60 * seg(t, T24, T25 + .5)), R = mulberry(41);
  for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1, x = 820 + side * (20 + R() * 34) * 5.2 * .5, y = 1180 - 70 * 3 - (39 + R() * 3) * 5.2 + R() * 10; P.dot(L.col, x, y, 2 + R() * 3, .9, [250, 248, 242]); }
  const shake = tt > T24 + 1.4 && tt < T24 + 1.9, up = tt > T24 + 2.8;
  clawd(L, { x: 1240, y: 1180 - 62 * 3, s: 8, eyes: shake ? 'shut' : up ? 'u' : 'n', look: up ? [0, -.6] : [-.8, 0], arms: up ? 'up' : 'down', legs: 'sit', t: tt, seed: 5, rot: shake ? Math.sin(tt * 60) * .12 : 0 });
  if (shake) { const R2 = mulberry(Math.floor(tt * 12)); for (let i = 0; i < 12; i++) P.dot(L.col, 1240 + (R2() - .5) * 160, 1180 - 62 * 3 - 60 - R2() * 60, 2.5, .9, [250, 248, 242]); }
  P.snow(L, t, { n: 120, speed: 60, drift: .4, size: 3 });
  return { ...C, bleed: 5, rim: 1 };
}
// 25：云开，海上一颗星；Clawd 踩水捞星
const ROCK = [720, 905], STAR = [1340, 230], REFL = [1340, 905];
function clawdSea(t) {
  const hops = [[T25 + .6, ROCK[0] + 90, 1010 - 0], [T25 + 1.1, 900, 1010], [T25 + 1.6, 1100, 1010], [EV.starScoop - .1, REFL[0] - 20, 1010]];
  const back = [[EV.starScoop + .8, 1100, 1010], [EV.starScoop + 1.3, 900, 1010], [EV.starScoop + 1.8, ROCK[0] + 90, 905 - 92 * 1.25]];
  const seq = [[T25, ROCK[0] + 90, 905 - 92 * 1.25], ...hops, ...back];
  for (let i = 0; i < seq.length - 1; i++) {
    const [ta, xa, ya] = seq[i], [tb, xb, yb] = seq[i + 1];
    if (t < tb) { const u = seg(t, tb - .45, tb); return { p: hop([xa, ya], [xb, yb], 70, u), air: u > 0 && u < 1, land: tb, i }; }
  }
  const l = seq[seq.length - 1]; return { p: [l[1], l[2]], air: false, land: l[0], i: seq.length };
}
function starSea(t, A) {
  const L = A.ink, C = cam(A, 960, 560, key(t, [[T25, 1.0], [T26, 1.08]])), tt = t12(t);
  const clear = ss(seg(t, T25, T25 + 1.2));
  sea(L, t, true);
  P.lift(L.wet, STAR[0], STAR[1], 260 * clear, .6 * clear, .8);
  P.glow(L.col, STAR[0], STAR[1], 90, .9 * clear); P.dot(L.col, STAR[0], STAR[1], 7, clear);
  const got = t > EV.starScoop;
  if (!got) { for (let i = 0; i < 4; i++) P.dot(L.col, REFL[0] + Math.sin(t * 3 + i) * 12, REFL[1] + 8 + i * 9, 6 - i, .8 * clear, [250, 246, 236]); P.glow(L.col, REFL[0], REFL[1] + 20, 70, .5 * clear); }
  P.islandRock(L, ROCK[0], ROCK[1], 1.25, { seed: 500 });
  figure(L, POSE.sitBack, { ...himK, wind: .2 }, { x: ROCK[0] - 30, y: ROCK[1] - 94 * 1.25, s: 1.9, seed: 3, t: tt });
  const c = clawdSea(tt);
  // 每一跳落水：一圈墨圈涟漪
  for (const tl of [T25 + 1.1, T25 + 1.6, EV.starScoop - .1, EV.starScoop + .8, EV.starScoop + 1.3]) { const r = (t - tl) / 1.6; if (r > 0 && r < 1) { const x = clawdSea(tl).p[0]; const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * 5.9; pts.push([x + Math.cos(a) * 80 * eo(r), 1012 + Math.sin(a) * 14 * eo(r)]); } draw(L, mk(pts, { w: 2.4, tone: .6, dry: .5, prof: 'brush', seed: 1200 + Math.round(tl * 10) }), 1, 1 - r); } }
  clawd(L, { x: c.p[0], y: c.p[1], s: 4.2, dir: got ? -1 : 1, eyes: got ? 'happy' : c.air ? 'r' : 'r', arms: got ? 'hold' : 'down', legs: c.air ? 'tuck' : 'stand', t: tt, seed: 5, sq: c.air ? -.1 : 0 });
  if (got) { P.glow(L.col, c.p[0], c.p[1] - 40, 70, .9); P.dot(L.col, c.p[0], c.p[1] - 40, 6, 1); }
  return { ...C, bleed: 5, rim: 1 };
}
// 26：Clawd 把星放进他掌心；拉远
function giveStar(t, A) {
  const L = A.ink, tt = t12(t), z = key(t, [[T26, 1.5], [T26 + 2.3, 1.45], [T27 + .3, .78]]), C = cam(A, lerp(900, 960, seg(t, T26, T27)), lerp(720, 600, seg(t, T26 + 2.3, T27)), z);
  sea(L, t, true);
  P.glow(L.col, STAR[0], STAR[1], 90, .9); P.dot(L.col, STAR[0], STAR[1], 7, 1);
  P.islandRock(L, 960, 905, 1.25, { seed: 500 });
  const hold = ss(seg(tt, EV.starGive - .5, EV.starGive));
  figure(L, mixPose(POSE.sitBow, { ...POSE.sitBow, aF: [[3, -37], [11, -33], [19, -36]] }, hold), { ...himK, wind: .2 }, { x: 900, y: 905 - 92 * 1.25, s: 2.2, dir: 1, seed: 3, t: tt });
  const handP = [900 + 19 * 2.2, 905 - 92 * 1.25 - 36 * 2.2];
  const cx = lerp(1010, 980, hold);
  clawd(L, { x: cx, y: 905 - 92 * 1.25, s: 3, dir: -1, eyes: t > EV.starGive + .4 ? 'happy' : 'l', arms: t < EV.starGive ? 'hold' : 'down', legs: t > EV.starGive + 1 ? 'sit' : 'stand', t: tt, seed: 5 });
  const sp = t < EV.starGive ? [cx, 905 - 92 * 1.25 - 30] : handP;
  P.glow(L.col, sp[0], sp[1], 55, .95); P.dot(L.col, sp[0], sp[1], 5, 1);
  return { ...C, bleed: 5, rim: 1 };
}
// 27：竖摇下沉：星 → 峭壁、松 → 雾 → 谷底孤坟
let VALLEY = null;
function valleyInit() {
  if (VALLEY) return;
  const W = 1920, H = 2600, mk2 = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  VALLEY = { wet: mk2(), dry: mk2() };
  const L = { wet: VALLEY.wet.getContext('2d'), dry: VALLEY.dry.getContext('2d') };
  for (const [x, y, s, sd, fl] of [[260, 900, 2.6, 61, 1], [1660, 1200, 2.4, 63, -1], [180, 1700, 2.2, 65, 1], [1750, 2000, 2.1, 67, -1]]) cliff(L, x, y, s, sd, fl);
  pine(L, 380, 905, 1.3, 71, 0, 0, 1); pine(L, 1540, 1205, 1.2, 73, 0, 0, -1);
  for (const c of [L.wet, L.dry]) { c.globalCompositeOperation = 'destination-out'; for (const y of [1300, 1900]) { const g = c.createLinearGradient(0, y - 160, 0, y + 160); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, 'rgba(0,0,0,.8)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, y - 160, W, 320); } c.globalCompositeOperation = 'source-over'; }
}
function valley(t, A) {
  valleyInit();
  const L = A.ink, tt = t12(t), y = key(t, [[T27, 300], [T28 - .4, 2050]]), C = cam(A, 960, y, 1);
  P.wash(L.wet, -100, -200, 2020, 700, .55, .1);
  P.glow(L.col, 1340, 120, 80, .9); P.dot(L.col, 1340, 120, 6, 1);
  P.blitLayer(L, VALLEY, 0, 0);
  P.grave(L, 1000, 2420, 1.3);
  P.wash(L.wet, -100, 2440, 2020, 2700, .15, .3);
  figure(L, POSE.back, { ...himK, wind: .3 }, { x: 760, y: 2470, s: 2.6, seed: 3, t: tt });
  clawd(L, { x: 860, y: 2472, s: 3.4, eyes: 'u', arms: 'down', legs: 'sit', t: tt, seed: 5 });
  P.snow(L, t, { n: 120, speed: 50, size: 2.4, box: [0, y - 560, 1920, y + 560] });
  return { ...C, bleed: 5, rim: 1 };
}
// 28：掌心的金锁，字一笔笔显出；她的笑在墨晕里一闪
function lockSecret(t, A, Bset) {
  const L = A.ink, C = cam(A, 960, 560, key(t, [[T28, 1], [T29, 1.12]], 'lin'));
  P.wash(L.wet, -100, -100, 2020, 1180, .25, .35);
  bigHand(L, 900, 640, 1.35, .2);
  P.lock(L, 905, 620, 3.4, { p: seg(t, ch(M6, 0), ch(M6, 5)), text: '天上星' });
  P.glow(L.col, 905, 620, 160, .25 * seg(t, ch(M6, 0), ch(M6, 5)));
  const mA = ch(M6, 5) + .1, mB = T29 - .2;
  if (Bset && t > mA) {
    const B = Bset.ink; cam(Bset, 960, 560, 1);
    P.wash(B.wet, -100, -100, 2020, 1180, .08, .1);
    figure(B, POSE.front, { ...herK, smile: true }, { x: 960, y: 1620, s: 13, seed: 12, t: t12(t) });
    const R = t < mB - .6 ? 20 + 2400 * ss(seg(t, mA, mA + 1.0)) : 2420 * (1 - ss(seg(t, mB - .6, mB + .1)));
    return { ...C, bleed: 6, rim: 1, paperB: C.paper, bleedB: 6, rimB: 1, trans: [905, 620, R, 1], tmode: 0 };
  }
  return { ...C, bleed: 6, rim: 1 };
}
// 29：手指按进砚里的墨，墨从指尖洇开成江湖
const TOUCH = [960, 760];
function jianghu(L, t) {
  P.wash(L.wet, -100, -100, 2020, 1180, .1, .14);
  const lay = P.mountains('jianghu', 1920, 1080, [[200, 300, 180], [520, 380, 220], [880, 260, 200], [1250, 420, 240], [1650, 300, 220]], 700, { seed: 29, tone: .32, mist: .6, depth: 340, rim: .8, cun: [60, 1860] });
  P.blitLayer(L, lay, 0, 0);
  const rv = []; for (let i = 0; i <= 20; i++) { const x = i / 20 * 1920; rv.push([x, 860 + Math.sin(i * .9) * 50]); }
  draw(L, mk(rv, { w: 60, tone: .25, dry: .5, wet: .8, prof: 'lens', seed: 1300 }), 1, .7);
  P.army(L, 120, 620, 980, { dir: 1, rows: 3, s: .7, t, seed: 271 });
  P.army(L, 1300, 1820, 990, { dir: -1, rows: 3, s: .7, t, seed: 272 });
  for (let i = 0; i < 6; i++) { const x = 300 + i * 260; P.lantern(L, x, 640 + (i % 2) * 40, .35, { blood: .9, seed: 1400 + i }); }
  P.wash(L.wet, -100, 1000, 2020, 1180, .2, .5);
}
function stain(t, A, Bset) {
  const L = A.ink, C = cam(A, 960, 540, 1), touch = ch(M7, 1);
  P.wash(L.wet, -100, -100, 2020, 1180, .08, .12);
  // 砚台 + 一汪墨
  mass(L.wet, [[700, 820], [740, 720], [1180, 720], [1220, 820], [1180, 880], [740, 880]], .35, 4, 1500);
  draw(L, mk([[700, 822], [740, 720], [1180, 720], [1220, 822], [1180, 882], [740, 882], [700, 822]], { w: 8, tone: .85, dry: .45, prof: 'brush', seed: 1501 }), 1, 1);
  blot(L.wet, 960, 780, 110, .85, 0, .45, 1502);
  // 手指：从上方伸下来（一笔含墨）
  const dn = eo(seg(t, T29, touch)), up = seg(t, touch + .5, touch + 1.4);
  const fy = lerp(-100, TOUCH[1] - 12, dn) - up * 500;
  bigHand(L, TOUCH[0] + 60, fy - 300, 1.1, .9, { rot: Math.PI * .97, point: true });
  if (Bset && t > touch) {
    const B = Bset.ink; cam(Bset, 960, 540, 1); jianghu(B, t);
    const R = 20 + 2600 * eio(seg(t, touch, T30 + .2));
    return { ...C, bleed: 6, rim: 1, paperB: C.paper, bleedB: 5, rimB: 1, trans: [TOUCH[0], TOUCH[1], R, 1], tmode: 0 };
  }
  return { ...C, bleed: 6, rim: 1 };
}
// 30：拉远，江湖缩进星河命盘
function pullOut(t, A) {
  const L = A.ink, z = key(t, [[T30, 1], [TEND - .3, .2]], 'eio'), C = cam(A, 960, 540, z);
  jianghu(L, t);
  { const c = L.wet, g = c.createRadialGradient(960, 540, 700, 960, 540, 2600); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.25, 'rgba(0,0,0,.62)'); g.addColorStop(1, 'rgba(0,0,0,.7)'); c.save(); c.fillStyle = g; c.fillRect(-6000, -6000, 14000, 14000); c.restore(); }
  const rot = (t - T30) * .12;
  P.fateWheel(L, 960, 540, 1700, rot, clamp((1.4 - z) / .6), { p: 1, seed: 39, light: true });
  P.starRiver(L, 960, 540, 2300, rot * .5, clamp((1.2 - z) / .5), { a0: -3.14, a1: 3.0, band: .2, n: 300, t, seed: 41, starK: 3, lift: .5 });
  return { ...C, bleed: 5, rim: 1 };
}

export function init() { valleyInit(); }
export const SHOTS = [
  { id: 'island', t0: T23, f: island, tin: { m: 2, d: 1.5 } },
  { id: 'shoulders', t0: T24, f: shoulders, tin: { m: 0, d: .9, c: [960, 420] } },
  { id: 'starSea', t0: T25, f: starSea, tin: { m: 1, d: 1.0 } },
  { id: 'giveStar', t0: T26, f: giveStar, tin: { m: 0, d: .8, c: [1000, 700] } },
  { id: 'valley', t0: T27, f: valley, tin: { m: 0, d: 1.0, c: [1340, 230] } },
  { id: 'lockSecret', t0: T28, f: lockSecret, tin: { m: 1, d: .9 } },
  { id: 'stain', t0: T29, f: stain, tin: { m: 0, d: .7, c: [960, 600] } },
  { id: 'pullOut', t0: T30, f: pullOut },
];
export const LAYOUT = [
  { t: 120, x: 150, y: 160, tone: 'ink', dx: 150 },
  { t: T25 - 1, x: 150, y: 160, tone: 'paper', dx: 150 },
  { t: T27 - 1.4, x: 1180, y: 860, tone: 'ink', dx: 150 },
  { t: T28 - 1.4, x: 150, y: 160, tone: 'ink', dx: 150 },
  { t: T29 - 1.4, x: 150, y: 160, tone: 'ink', dx: 150 },
  { t: T30 - 1.4, x: 150, y: 160, tone: 'ink', dx: 150 },
];
export function events() {
  const E = [
    { type: 'amb', kind: 'seaWind', t0: T23, t1: T25 + 1 },
    { type: 'amb', kind: 'seaNight', t0: T25, t1: T27 },
    { t: T24 + 1.4, type: 'shakeSnow', gain: .6 },
    { t: EV.starScoop, type: 'chime', gain: .8 }, { t: EV.starGive, type: 'chime', gain: .6 },
    { type: 'amb', kind: 'valley', t0: T27, t1: T29 },
    { t: ch(M6, 0), type: 'engrave', gain: .5, d: ch(M6, 5) - ch(M6, 0) },
    { t: ch(M7, 1), type: 'inkTouch', gain: .9 }, { t: ch(M7, 1) + .05, type: 'inkSpread', gain: .7, d: 4 },
  ];
  for (const tl of [T25 + .6, T25 + 1.1, T25 + 1.6, EV.starScoop - .1, EV.starScoop + .8, EV.starScoop + 1.3, EV.starScoop + 1.8]) E.push({ t: tl, type: 'splash', gain: .5 });
  return E;
}
