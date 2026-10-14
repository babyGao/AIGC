// 主歌一「相遇」22.6–62.2：Clawd 醒来跑向她 → 花瓣连成线飘向林外的他 → 一片花瓣落在他肩上 → 刀剑围住他 →
// 他一震，刀剑化墨点，墨点落成杏花逐朵开，她从树后走出 → 长卷四季同行 → 雨中他张开大氅为她遮雨 → 一片花瓣落进他掌心
import { mk, draw, blot, mass, qpts } from '../engine/ink.js';
import { figure, POSE, mixPose, walkPose } from './figure.js';
import { clawd } from './clawd.js';
import * as P from './props.js';
import { EV, ch, chEnd } from './timeline.js';
import { cam, seg, key, clamp, lerp, eio, eo, ss, t12, hop } from './util.js';
import { mulberry } from '/core/lib.js';
import * as G from './world_grove.js';
import { sleepingClawd, tiltY } from './s_intro.js';

const HIM = 2.7, HER_S = 2.5;
const herK = { type: 'her', skirt: true, smile: true }, himK = { type: 'him', cloak: true };
const L1 = '会在何处见到你', L2 = '莫非前尘已注定', L3 = '飞过时空的距离', L4 = '却囿于刀剑光影', L5 = '三月春花渐次醒', L6 = '迢迢年华谁老去', L7 = '是劫是缘随我心', L8 = '除了你万敌不侵';
const T3 = 22.574, T4 = ch(L2, 0), T5 = ch(L3, 0), T6 = ch(L4, 0), T7 = ch(L5, 0), T8 = ch(L6, 0), T9 = ch(L7, 0), T10 = ch(L8, 0), TEND = 62.204;

// —— 他在林中的行走：从右往左 ——
const himX = t => key(t, [[27.6, 5350], [35.2, 4700]], 'lin');
const HIM_STOP = 35.2;
function himPose(t) {
  const tt = t12(t);
  if (tt < HIM_STOP) return { P: walkPose((tt - 27.6) / .62), x: himX(tt) };
  if (tt < 36.2) return { P: mixPose(POSE.stand, POSE.look, ss((tt - HIM_STOP) / .5)), x: himX(HIM_STOP) };
  return { P: mixPose(POSE.look, POSE.stand, ss((tt - 36.2) / .4)), x: himX(HIM_STOP) };
}
// —— Clawd：醒 → 抬头看花瓣 → 跑向她 → 跳上她膝头 ——
const RUN = [24.7, 26.7];
function clawdState(t) {
  const tt = t12(t), wake = 23.05;
  const x0 = G.CLAWD0[0], xs = G.HER[0] - 70;
  if (tt < RUN[0]) {
    const eyes = tt < wake ? 'shut' : tt < wake + .17 ? 'blink' : tt < 23.4 ? 'n' : tt < 24.1 ? 'u' : 'r';
    const sq = tt > 24.35 && tt < RUN[0] ? .18 * Math.sin((tt - 24.35) / .35 * Math.PI) : 0;   // 起跑前蹲一下（预备）
    return { x: x0, y: G.CLAWD0[1], eyes, legs: tt < 23.3 ? 'sit' : 'stand', arms: tt < 23.3 ? 'tuck' : 'down', sq };
  }
  if (tt < RUN[1]) {
    const u = (tt - RUN[0]) / (RUN[1] - RUN[0]), x = lerp(x0, xs, eio(u));
    return { x, y: G.CLAWD0[1] - Math.abs(Math.sin(tt * 18)) * 10, eyes: 'r', legs: Math.floor(tt * 12) % 2 ? 'walkA' : 'walkB', arms: 'down' };
  }
  const u = seg(tt, RUN[1], RUN[1] + .5), lap = [G.HER[0] - 18, G.HER[1] - 70];
  const p = hop([xs, G.CLAWD0[1]], lap, 60, eo(u));
  return { x: p[0], y: p[1], eyes: tt < RUN[1] + .7 ? 'r' : 'happy', legs: u < 1 ? 'tuck' : 'sit', arms: u >= 1 && tt > 27.3 && tt < 28.4 ? 'wave' : 'down', sq: u >= 1 ? .14 * Math.exp(-(tt - RUN[1] - .5) * 6) : -.1 * Math.sin(u * Math.PI) };
}
function drawHer(L, t, o = {}) {
  const tt = t12(t), look = tt > RUN[1] + .4;
  figure(L, look ? mixPose(POSE.sit, POSE.sitBow, .25) : POSE.sit, { ...herK, wind: .3 }, { x: G.HER[0] + 10, y: G.HER[1] - 52, s: HER_S, dir: -1, seed: 12, t: tt, ...o });
}
// 花瓣：从近景花枝飘到 Clawd 头上
function firstPetal(L, t) {
  const u = seg(t, 21.0, ch(L1, 0)), a = [420, 3770], b = [G.CLAWD0[0] - 6, G.CLAWD0[1] - 86];
  if (t > 25.0) return;
  const x = lerp(a[0], b[0], u) + Math.sin(u * 7) * 40 * (1 - u), y = lerp(a[1], b[1], u * u * .3 + u * .7);
  const off = t > ch(L1, 0) && t > 24.7 ? -1 : 0;
  if (off < 0) return;
  P.petal(L, x, y, 7, t * 2 + Math.sin(u * 8), 1, 3);
}

// 镜头 3–5：同一个世界里的一次长运镜
function grove(t, A) {
  const L = A.ink;
  let cx, cy, z;
  if (t < T4) {
    cx = key(t, [[T3, 960], [23.7, 820], [RUN[0], 900], [RUN[1], 1950], [T4, 2050]]);
    cy = key(t, [[T3, tiltY(T3)], [23.7, 3860], [T4, 3840]]);
    z = key(t, [[T3, 1], [23.7, 1.45], [RUN[0], 1.3], [RUN[1], 1.15], [T4, 1.12]]);
  } else if (t < T5) {
    cx = key(t, [[T4, 2050], [T5 - .3, 4380]]); cy = key(t, [[T4, 3840], [T5, 3800]]); z = key(t, [[T4, 1.12], [T4 + 1.5, .92], [T5, .95]]);
  } else {
    const pp = petalPos(t);
    cx = key(t, [[T5, 4380], [T5 + 1, pp[0]], [HIM_STOP, 4720], [T6, 4700]]); cy = key(t, [[T5, 3800], [HIM_STOP, 3790], [T6, 3800]]); z = key(t, [[T5, .95], [HIM_STOP - .6, 1.75], [T6, 1.9]]);
  }
  const C = cam(A, cx, cy, z), hw = 960 / z, hh = 540 / z;
  G.drawWorld(L, t, [cx - hw, cy - hh, cx + hw, cy + hh]);
  // 她
  drawHer(L, t);
  // Clawd
  if (t < 33) { const s = clawdState(t); clawd(L, { ...s, s: 7, t: t12(t), seed: 5, look: [0, 0] }); }
  firstPetal(L, t);
  // 风里的一线花瓣（从她身边飘向他）
  if (t > T4 - .5 && t < T6) {
    const R = mulberry(17);
    for (let i = 0; i < 46; i++) {
      const born = T4 - .3 + R() * 3.6, life = 4 + R() * 2, u = (t - born) / life; if (u <= 0 || u >= 1) { R(); R(); continue; }
      const y0 = 3700 + R() * 200, amp = 30 + R() * 60;
      const x = lerp(G.HER[0] - 100, 5200, u), y = y0 + Math.sin(u * 9 + i) * amp - Math.sin(u * Math.PI) * 140;
      P.petal(L, x, y, 6 + (i % 3), t * 3 + i, Math.min(1, u * 6, (1 - u) * 6), 40 + i);
    }
  }
  // 那一片：落到他肩上
  if (t > T5 - .2) { const p = petalPos(t); P.petal(L, p[0], p[1], 8, t * 2.4, 1, 77); }
  // 他
  if (t > 27.4) {
    const h = himPose(t);
    figure(L, h.P, { ...himK, wind: .4 }, { x: h.x, y: G.GROUND + 8, s: HIM, dir: -1, seed: 3, t: t12(t) });
  }
  return { ...C, bleed: 5, rim: 1 };
}
// 他肩头（面朝左，肩在 x - 1.5*s）
const shoulder = t => [himX(Math.min(t, HIM_STOP)) - 2 * HIM, G.GROUND + 8 - 74 * HIM];
function petalPos(t) {
  const a = [3700, 3640], land = HIM_STOP - .1, u = seg(t, T5 - .2, land), b = shoulder(t);
  if (t >= land) return b;
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * 120 + Math.sin(u * 11) * 26 * (1 - u)];
}

// 镜头 6–7：刀剑光影 → 一震 → 花开
const STAND = [4700, 4008];
function standoff(t, A) {
  const L = A.ink;
  const z = key(t, [[T6, 2.1], [T7 - .2, 2.35], [T7 + .3, 2.2], [T8 - .8, 1.05]]), cy = key(t, [[T6, 3780], [T7, 3800], [T8 - .8, 3790]]), cx = key(t, [[T6, 4700], [T8 - .8, 4420]]);
  const C = cam(A, cx, cy, z), hw = 960 / z, hh = 540 / z;
  const bloom = (t - T7) / (T8 - .6 - T7);
  G.drawWorld(L, t, [cx - hw, cy - hh, cx + hw, cy + hh], { bloom: t < T7 ? 0 : clamp(bloom) });
  // 刀剑：一笔笔从画外刺进来，停在他身边
  const R = mulberry(61), N = 10, chars = [...L4];
  const burst = t >= T7 ? seg(t, T7, T7 + .35) : 0;
  for (let i = 0; i < N; i++) {
    const a = -Math.PI * (.05 + .9 * R()) - (i % 2 ? 0 : .1), r1 = 250 + R() * 70, r0 = 820;
    const tc = ch(L4, Math.min(6, Math.floor(i * 7 / N))) + (i % 2) * .12, u = eo(seg(t, tc, tc + .12));
    if (u <= 0) continue;
    const c0 = [STAND[0] + Math.cos(a) * r0, STAND[1] - 120 + Math.sin(a) * r0 * .7], c1 = [STAND[0] + Math.cos(a) * r1, STAND[1] - 120 + Math.sin(a) * r1 * .7];
    if (burst <= 0) {
      draw(L, mk([c0, [lerp(c0[0], c1[0], .5), lerp(c0[1], c1[1], .5)], c1], { w: 13, tone: .95, dry: .45, wet: .1, prof: 'cone', seed: 610 + i, nb: 28 }), u, 1);
      draw(L, mk([c0, c1].map(q => [q[0] + 3, q[1] - 3]), { w: 3, tone: .9, dry: .85, prof: 'cone', seed: 630 + i }), u, .8);
      if (u > .9 && t < tc + .5) P.glow(L.col, c1[0], c1[1], 30, (1 - (t - tc) / .5) * .9);
    } else {
      // 一震：刀剑碎成墨点四散
      for (let k = 0; k < 7; k++) { const f = lerp(.2, 1, k / 6), q = [lerp(c1[0], c0[0], f * .6), lerp(c1[1], c0[1], f * .6)], d = 240 * burst * (1 + k * .2); blot(L.wet, q[0] + Math.cos(a) * d, q[1] + Math.sin(a) * d * .7 + burst * burst * 160, 6 - k * .5, .8 * (1 - burst * .6), a, .7, i * 10 + k); }
    }
  }
  // 冲击：一圈淡墨的气浪
  if (burst > 0 && burst < 1) { const pts = []; for (let i = 0; i <= 30; i++) { const a = i / 30 * 6.2; pts.push([STAND[0] + Math.cos(a) * 520 * eo(burst), STAND[1] - 120 + Math.sin(a) * 260 * eo(burst)]); } draw(L, mk(pts, { w: 30, tone: .3, dry: .8, prof: 'lens', seed: 650 }), 1, 1 - burst); }
  // 她从树后走出，Clawd 坐在她肩上
  const hx = key(t, [[T7 + 2.4, 4250], [T8 - .6, 4450]], 'ss'), walking = t > T7 + 2.4 && t < T8 - .6;
  if (t > T7 + 2.0) {
    const tt = t12(t), Pp = walking ? walkPose((tt - T7) / .7) : POSE.stand;
    figure(L, Pp, { ...herK, wind: .3 }, { x: hx, y: G.GROUND + 8, s: HER_S, dir: 1, seed: 12, t: tt, am: clamp((t - T7 - 2.0) / .5) });
    clawd(L, { x: hx - 9 * HER_S, y: G.GROUND + 8 - 72 * HER_S + (walking ? Math.abs(Math.sin(tt * 9)) * 3 : 0), s: 3.2, eyes: 'r', arms: 'down', legs: 'sit', t: tt, seed: 5, am: clamp((t - T7 - 2.0) / .5) });
  }
  const tt = t12(t), pz = t < T6 + 3.3 ? POSE.stand : t < T7 ? mixPose(POSE.stand, POSE.wind, ss((tt - T6 - 3.3) / .6)) : t < T7 + .8 ? POSE.wind : mixPose(POSE.wind, POSE.look, ss((tt - T7 - 2.4) / .8));
  figure(L, pz, { ...himK, wind: .6 + burst * .8 }, { x: STAND[0], y: STAND[1], s: HIM, dir: -1, seed: 3, t: tt });
  const shake = burst > 0 && burst < 1 ? [Math.sin(t * 90) * 10 * (1 - burst), Math.cos(t * 70) * 6 * (1 - burst)] : [0, 0];
  return { ...C, bleed: 5, rim: 1, shake, flash: burst > 0 && burst < .3 ? .3 * (1 - burst / .3) : 0 };
}

// 镜头 8：长卷四季（相机往左移，画卷从右往左展开）
let SCROLL = null;
function scrollInit() {
  if (SCROLL) return;
  SCROLL = P.mountains('v1scroll', 7200, 1100, [[300, 300, 280], [1000, 420, 300], [1800, 280, 260], [2600, 380, 300], [3400, 260, 280], [4200, 440, 320], [5000, 300, 280], [5800, 360, 300], [6700, 280, 260]], 760, { seed: 13, tone: .26, mist: .7, depth: 380, rim: .75, cun: [100, 7100], cunLen: 1.2 });
}
function years(t, A) {
  scrollInit();
  const L = A.ink, u = seg(t, T8 - 1.6, T9 + 1.2);
  const cx = lerp(6200, 1500, eio(u)), z = .85, C = cam(A, cx, 760, z);
  P.blitLayer(L, SCROLL, 0, 0);
  // 路：一道淡墨的小径，横贯长卷
  const path = []; for (let i = 0; i <= 30; i++) { const x = i / 30 * 7200; path.push([x, 905 + Math.sin(x * .002) * 30]); }
  draw(L, mk(path, { w: 10, tone: .3, dry: .8, prof: 'even', seed: 820 }), 1, .7);
  // 四季：右春（杏花）→ 夏（柳）→ 秋（雁、枯枝）→ 左冬（雪峰）
  for (const [x, s, sd] of [[6400, .9, 21], [5900, .8, 23]]) G.tree(L, x, 910, s, sd, 1, t, .3);
  for (const [x, sd] of [[4400, 31], [3700, 33], [2900, 35], [2300, 37]]) G.tree(L, x, 910, .75, sd, x > 3500 ? .25 : 0, t, .2);
  for (let i = 0; i < 7; i++) { const gx = 3000 + i * 40 - t * 30, gy = 380 + Math.abs(i - 3) * 22; draw(L, mk([[gx - 12, gy - 4], [gx, gy], [gx + 12, gy - 4]], { w: 2.2, tone: .85, dry: .4, prof: 'tip', seed: 880 + i }), 1, .9); }
  P.wash(L.wet, 0, 0, 1400, 1100, .0, .0);
  for (let i = 0; i < 3; i++) P.lift(L.wet, 600 + i * 380, 640 - i * 30, 140, .8, .6);   // 冬：雪峰留白
  // 两人一兽：很小，走在路上
  const wx = cx - 80, tt = t12(t);
  const wy = 905 + Math.sin(wx * .002) * 30;
  figure(L, walkPose(tt / .6), { ...himK, wind: .2 }, { x: wx, y: wy, s: 1.6, dir: -1, seed: 3, t: tt });
  figure(L, walkPose(tt / .6 + .5), { ...herK }, { x: wx + 80, y: wy + 2, s: 1.5, dir: -1, seed: 12, t: tt });
  clawd(L, { x: wx + 150, y: wy + 3 - Math.abs(Math.sin(tt * 10)) * 4, s: 3, eyes: 'l', legs: Math.floor(tt * 12) % 2 ? 'walkA' : 'walkB', arms: 'down', t: tt, seed: 5 });
  return { ...C, bleed: 4, rim: 1 };
}

// 镜头 9：雨，他张开大氅为她遮雨；Clawd 在中间来回看
function cloakRain(t, A) {
  const L = A.ink, C = cam(A, 960, 560, key(t, [[T9 - 1, 1], [T10, 1.08]]));
  P.wash(L.wet, -100, -100, 2020, 1180, .32, .12);
  P.waveLines(L, -100, 2020, 940, 1080, { n: 6, t, am: .4, seed: 990 });
  const tt = t12(t), gy = 930;
  const raise = ss(seg(tt, T9 - .3, T9 + .6));
  figure(L, mixPose(POSE.stand, POSE.cloak, raise), { ...himK, wind: .2 }, { x: 800, y: gy, s: 5.4, dir: 1, seed: 3, t: tt });
  // 大氅撑开成一顶伞：从他抬起的手到她头顶之外
  if (raise > 0) {
    const hand = [800 + 21 * 5.4, gy - 92 * 5.4], far = [1320, gy - 360];
    const r = raise;
    mass(L.wet, [[800 - 40, gy - 400], [hand[0], hand[1] - 10], [lerp(hand[0], far[0] + 60, r), lerp(hand[1], far[1] - 30, r)], [lerp(hand[0], far[0] + 80, r), lerp(hand[1] + 40, far[1] + 120, r)], [lerp(hand[0], 1180, r), lerp(hand[1] + 60, gy - 300, r)], [820, gy - 330]], .22, 6, 991);
    draw(L, mk([[hand[0], hand[1]], [lerp(hand[0], 1150, r), lerp(hand[1] - 20, gy - 520, r)], [lerp(hand[0], far[0] + 70, r), lerp(hand[1], far[1] + 100, r)]], { w: 26, tone: .8, darkDir: [0, -1], side: .85, brWet: true, body: .3, dry: .45, wet: .9, prof: 'robe', seed: 992 }), 1, 1);
  }
  figure(L, POSE.stand, { ...herK, eye: true }, { x: 1180, y: gy, s: 4.9, dir: -1, seed: 12, t: tt });
  // Clawd：抬头看他 → 看她 → 看他
  const lk = Math.sin((tt - T9) * 2.6) > 0 ? [-.9, -.7] : [.9, -.7];
  clawd(L, { x: 990, y: gy + 2, s: 6, eyes: 'n', look: lk, arms: 'down', legs: 'stand', t: tt, seed: 5 });
  P.rain(L, t, { n: 140, am: .7, ang: .12, len: 60, box: [-100, -100, 2020, 1100] });
  // 伞下没有雨：在大氅下面挖掉雨（画一块纸色不合适，这里只降低雨量：简单起见，大氅下补几道遮挡阴影）
  return { ...C, bleed: 5, rim: 1 };
}

// 镜头 10：他的掌心，一片花瓣落进来，五指想握又不忍握
export function bigHand(L, x, y, s, curl, o = {}) {
  if (o.rot) { for (const c of [L.wet, L.dry]) { c.save(); c.translate(x, y); c.rotate(o.rot); c.translate(-x, -y); } try { bigHand(L, x, y, s, curl, { ...o, rot: 0, noSleeve: o.noSleeve }); } finally { for (const c of [L.wet, L.dry]) c.restore(); } return; }
  const am = o.am ?? 1;
  const T = (px, py) => [x + px * s, y + py * s];
  // 袖口：一笔大含墨，少飞白
  draw(L, mk([T(-60, 420), T(-20, 300), T(0, 210)], { w: 230 * s, tone: .55, darkDir: [-1, 0], side: .8, brWet: true, body: .5, dry: .2, wet: .95, prof: 'robe', seed: 1001, nb: 26 }), 1, am);
  draw(L, mk([T(-110, 215), T(0, 200), T(110, 220)], { w: 12 * s, tone: .85, dry: .35, prof: 'tip', seed: 1007 }), 1, am);
  // 手的整体剪影：掌 + 五指（胶囊），一次填充（重叠处不变深）
  const F = [[-62, -58, -.28, 150, 36], [-18, -80, -.06, 168, 38], [28, -76, .12, 152, 36], [70, -50, .34, 118, 31]];
  const TH = [-82, 30, -1.05, 128, 44];
  const fingers = [...F, TH].map(([fx, fy, a, len, w], i) => {
    const k = o.point ? (i === 0 ? .05 : i < 4 ? .95 : .6) : i < 4 ? curl * (.85 + i * .05) : curl * .55, L2 = len * (1 - .5 * k), d = [Math.sin(a + k * (i < 4 ? .25 : .6)), -Math.cos(a + k * (i < 4 ? .25 : .6))];
    return { b: [fx, fy], e: [fx + d[0] * L2, fy + d[1] * L2], w: w * (1 + k * .15), d };
  });
  const path = new Path2D();
  const palmPoly = [[-100, 70], [-95, -20], [-70, -70], [-10, -95], [50, -85], [90, -55], [100, 20], [80, 110], [0, 150], [-80, 130]];
  palmPoly.forEach((q, i) => { const [px, py] = T(...q); i ? path.lineTo(px, py) : path.moveTo(px, py); }); path.closePath();
  for (const f of fingers) {
    const n = [-f.d[1], f.d[0]], hw = f.w / 2, [bx, by] = T(...f.b), [ex, ey] = T(...f.e);
    path.moveTo(bx + n[0] * hw * s, by + n[1] * hw * s); path.lineTo(ex + n[0] * hw * s * .82, ey + n[1] * hw * s * .82);
    path.arc(ex, ey, hw * s * .82, Math.atan2(n[1], n[0]), Math.atan2(-n[1], -n[0]) + (Math.atan2(n[1], n[0]) < Math.atan2(-n[1], -n[0]) ? 0 : 0), true);
    path.lineTo(bx - n[0] * hw * s, by - n[1] * hw * s); path.closePath();
  }
  L.wet.save(); L.wet.globalAlpha = am; L.wet.fillStyle = 'rgba(0,0,0,.13)'; L.wet.fill(path, 'nonzero'); L.wet.restore();
  // 白描：每根手指两侧一线（外侧浓、内侧淡），指节一道短纹
  fingers.forEach((f, i) => {
    const n = [-f.d[1], f.d[0]], hw = f.w / 2;
    for (const sg of [-1, 1]) draw(L, mk([T(f.b[0] + n[0] * hw * sg, f.b[1] + n[1] * hw * sg), T(f.e[0] + n[0] * hw * .8 * sg, f.e[1] + n[1] * hw * .8 * sg), T(f.e[0] + f.d[0] * hw * .7, f.e[1] + f.d[1] * hw * .7)], { w: (sg > 0 ? 5 : 3.5) * s, tone: sg > 0 ? .78 : .55, dry: .4, wet: .3, prof: 'brush', seed: 1010 + i * 2 + (sg > 0) }), 1, am);
    const m = [lerp(f.b[0], f.e[0], .55), lerp(f.b[1], f.e[1], .55)];
    draw(L, mk([T(m[0] - n[0] * hw * .6, m[1] - n[1] * hw * .6), T(m[0] + n[0] * hw * .6, m[1] + n[1] * hw * .6)], { w: 2.2 * s, tone: .4, dry: .6, prof: 'tip', seed: 1030 + i }), 1, am * .7);
  });
  // 掌根与掌纹
  draw(L, mk([T(-100, 60), T(-80, 128), T(0, 150), T(80, 112), T(100, 20)], { w: 7 * s, tone: .75, dry: .4, wet: .4, prof: 'brush', seed: 1040 }), 1, am);
  draw(L, mk([T(-70, 0), T(0, -18), T(70, 6)], { w: 3 * s, tone: .45, dry: .55, prof: 'tip', seed: 1041 }), 1, am);
  draw(L, mk([T(-75, 45), T(-10, 30), T(55, 60)], { w: 2.6 * s, tone: .4, dry: .6, prof: 'tip', seed: 1042 }), 1, am);
}
function palm(t, A) {
  const L = A.ink, z = key(t, [[T10 - 1, 1], [TEND + .5, 1.12]]), C = cam(A, 960, 560, z);
  const curl = .45 * ss(seg(t, ch(L8, 6) + .6, TEND - .3));
  bigHand(L, 1040, 640, 1.45, curl);
  // 花瓣：从画面上方飘下，落在「侵」字上
  const land = ch(L8, 6), u = seg(t, T10 - .9, land), a = [1250, -60], b = [990, 600];
  const px = lerp(a[0], b[0], eo(u)) + Math.sin(u * 9) * 60 * (1 - u), py = lerp(a[1], b[1], u);
  P.petal(L, px, py, 22, t > land ? .6 : t * 1.7, 1, 1050);
  if (t > land && t < land + .7) { const r = (t - land) / .7; const pts = []; for (let i = 0; i <= 20; i++) { const ang = i / 20 * 5.9; pts.push([1036 + Math.cos(ang) * 60 * eo(r), 655 + Math.sin(ang) * 26 * eo(r)]); } draw(L, mk(pts, { w: 2.4, tone: .4, dry: .6, prof: 'brush', seed: 1060 }), 1, 1 - r); }
  P.rain(L, t, { n: 60, am: .5 * (1 - seg(t, T10, T10 + 1.5)), ang: .12, len: 60 });
  return { ...C, bleed: 6, rim: 1 };
}

export function init() { scrollInit(); }
export const SHOTS = [
  { id: 'grove', t0: T3, f: grove },
  { id: 'standoff', t0: T6 - .05, f: standoff, tin: { m: 0, d: .9, c: [960, 520] } },
  { id: 'years', t0: T8 - .9, f: years, tin: { m: 1, d: 1.6 } },
  { id: 'cloakRain', t0: T9 - 1.0, f: cloakRain, tin: { m: 2, d: 1.1 } },
  { id: 'palm', t0: T10 - .8, f: palm, tin: { m: 0, d: 1.0, c: [960, 640] } },
];
export const LAYOUT = [
  { t: 21, x: 170, y: 870, tone: 'ink', dx: 150 },
  { t: 49, x: 170, y: 160, tone: 'ink', dx: 150 },
  { t: 56, x: 150, y: 170, tone: 'ink', dx: 150 },
];
export function events() {
  const E = [
    { type: 'amb', kind: 'forest', t0: 22.0, t1: T8 },
    { t: ch(L1, 0), type: 'petal', gain: .5 }, { t: 23.05, type: 'blink', gain: .5 },
    { t: RUN[0], type: 'scamper', gain: .6, d: RUN[1] - RUN[0] }, { t: RUN[1] + .5, type: 'plop', gain: .7 },
    { t: T4, type: 'gust', gain: .7 },
    { t: HIM_STOP - .1, type: 'petal', gain: .6 },
    { t: T7, type: 'shatter', gain: 1 },
    { type: 'amb', kind: 'rain', t0: T9 - 1, t1: T10 + 1.5 },
  ];
  for (let i = 0; i < 7; i++) E.push({ t: ch(L4, i), type: 'blade', gain: .55 + (i % 2) * .2 });
  for (let i = 0; i < 7; i++) E.push({ t: ch(L5, i), type: 'bloom', gain: .5 });
  E.push({ t: ch(L8, 6), type: 'petalPalm', gain: .7 });
  return E;
}
