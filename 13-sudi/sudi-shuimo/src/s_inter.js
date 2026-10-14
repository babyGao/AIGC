// 间奏「青石桥」101.8–124.1：雨夜桥上两端各一人 → 静默（过肩：他的背影，桥那头斗笠人）→ 一掌化龙 →
// 斗笠飞起、大氅化墨四散、长发散开：是她 → 他接住她，Clawd 跑来 → 她把金锁放进他掌心，手垂下 → 雨把一切冲成纸白
import { mk, draw, blot, mass } from '../engine/ink.js';
import { figure, POSE, mixPose, walkPose } from './figure.js';
import { clawd } from './clawd.js';
import * as P from './props.js';
import { EV } from './timeline.js';
import { cam, seg, key, clamp, lerp, eio, eo, ss, t12 } from './util.js';
import { mulberry } from '/core/lib.js';
import { bigHand } from './s_v1.js';

export const BX = 960, BY = 1010, BW = 1500, HK = .2;
const deckY = x => P.bridgeDeckY(BX, BY, BW, x, HK);
const S0 = EV.stormA, HUSH = EV.hushMusic, STRIKE = EV.strike, HIT = STRIKE + .25;
const himK = { type: 'him', cloak: true }, herK = { type: 'her', skirt: true };
const HIMX = 560, HERX = 1360;
export const LANDX = 1500;
const SLOPE = () => Math.atan2(P.bridgeDeckY(BX, BY, BW, LANDX + 30, HK) - P.bridgeDeckY(BX, BY, BW, LANDX - 30, HK), 60);

function night(L, t, k = 1) {
  P.wash(L.wet, -400, -300, 2400, 1400, .72 * k, .86 * k);
  P.lift(L.wet, 1100, 420, 980, .62 * k, .92);
}
// 「故事时间」tau 下的桥上画面（tau 可以倒着走：副歌三的倒放）
export function bridgeScene(L, tau, t, o = {}) {
  const tt = t12(t), tau12 = Math.floor(tau * 12) / 12;
  if (!o.clear) night(L, t);
  else { P.wash(L.wet, -400, -300, 2400, 1400, .6, .7); P.lift(L.wet, 1000, 500, 900, .4, .9); P.starRiver(L, 960, 1500, 1500, 0, .9, { a0: -2.6, a1: -.55, band: .14, n: 240, t, seed: 23, lift: .4 }); }
  P.bridge(L, BX, BY, BW, { seed: 41, hk: HK, dark: .55, reflect: false });
  P.wash(L.wet, -400, BY - 10, 2400, 1400, .5, .9);
  // 他
  let hp = POSE.stand, hx = HIMX;
  if (tau12 > STRIKE - .35 && tau12 < STRIKE) hp = mixPose(POSE.stand, POSE.wind, ss((tau12 - STRIKE + .35) / .3));
  else if (tau12 >= STRIKE && tau12 < 115.0) hp = POSE.palm;
  if (tau12 >= 115.0 && !o.noKneel) {   // 冲过去，跪下抱住她
    const u = seg(tau12, 115.0, 116.4);
    hx = lerp(HIMX, LANDX - 70, eio(u));
    hp = u < 1 ? walkPose((tau12 - 115) / .45, true) : POSE.kneelHold;
  }
  figure(L, hp, { ...himK, palm: tau12 >= STRIKE && tau12 < 115, wind: .9 }, { x: hx, y: deckY(hx), s: 3.2, dir: 1, seed: 3, t: tt });
  // 她：乔装 → 中掌飞起（慢动作）→ 落在桥面
  const fly = seg(tau, HIT, 114.4);
  let fx = HERX, fy = deckY(HERX), rot = 0, pose = POSE.stand, disg = 1 - seg(tau, HIT, HIT + 1.6);
  if (tau >= HIT) {
    const e = eo(fly);
    fx = lerp(HERX, LANDX, e); fy = lerp(deckY(HERX), deckY(LANDX) + 2, fly) - Math.sin(fly * Math.PI) * 170;
    rot = lerp(0, SLOPE() + Math.PI / 2 - .06, ss(fly)); pose = mixPose(POSE.fall, POSE.lie, ss(seg(fly, .55, 1)));
  }
  if (tau >= 116.4 && !o.noKneel) { fx = LANDX - 70 + 26 * 3.2; fy = deckY(LANDX) - 30 * 3.2; rot = 1.5; pose = POSE.lie; }
  figure(L, pose, { ...herK, hat: disg > .5, cloak: disg > .05, wind: tau >= HIT ? 1.2 : .2 }, { x: fx, y: fy, s: 3.1, dir: -1, seed: 4, t: tt, rot, am: 1 });
  // 斗笠飞走、大氅化墨
  if (tau >= HIT && tau < HIT + 3) {
    const u = (tau - HIT) / 3, hx2 = HERX + 40 + 520 * eo(u), hy2 = deckY(HERX) - 280 - 300 * Math.sin(u * 2.4), r = u * 5;
    const H = (dx, dy) => [hx2 + Math.cos(r) * dx - Math.sin(r) * dy, hy2 + Math.sin(r) * dx + Math.cos(r) * dy];
    mass(L.wet, [H(-70, 10), H(0, -34), H(70, 10), H(0, 18)], .6 * (1 - u), 3, 9);
    draw(L, mk([H(-74, 12), H(0, 22), H(74, 12)], { w: 5, tone: .95, dry: .4, prof: 'even', seed: 10 }), 1, 1 - u);
    const R = mulberry(77);
    for (let i = 0; i < 70; i++) { const a = R() * 6.28, d = (40 + R() * 260) * eo(u), sz = 2 + R() * 8; blot(L.wet, HERX + 30 + Math.cos(a) * d * 1.4 + u * 160, deckY(HERX) - 150 + Math.sin(a) * d - 40 + u * u * 140, sz * (1 - u * .5), .7 * (1 - u), a, .7, 100 + i); }
  }
  // 墨龙
  if (tau >= STRIKE && tau < HIT + 2.2) {
    const p = eo(seg(tau, STRIKE, HIT)), fade = 1 - seg(tau, HIT + .2, HIT + 2.2);
    const x0 = HIMX + 34 * 3.2, y0 = deckY(HIMX) - 72 * 3.2;
    const path = []; for (let i = 0; i <= 12; i++) { const u = i / 12; path.push([lerp(x0, HERX + 30, u), y0 - 40 + Math.sin(u * 7.5) * 70 * (1 - u * .3) - Math.sin(u * Math.PI) * 60]); }
    P.dragon(L, path, p, { w: 110, seed: 702, am: fade });
    if (fade < 1) { const R = mulberry(5); for (let i = 0; i < 60; i++) { const q = path[Math.floor(R() * 12)]; blot(L.wet, q[0] + (R() - .5) * 200, q[1] + (R() - .5) * 120 + (1 - fade) * 260 * R(), 2 + R() * 6, .6 * fade, 0, .8, 200 + i); } }
  }
  // Clawd 沿桥跑来
  if (tau >= 116.0 && !o.noKneel) {
    const u = seg(tau, 116.0, 117.6), cx = lerp(2100, LANDX + 130, eio(u));
    const eyes = u < 1 ? 'l' : tau < 118.6 ? 'wide' : 'd';
    clawd(L, { x: cx, y: deckY(cx) - (u < 1 ? Math.abs(Math.sin(tt * 18)) * 9 : 0), s: 5, eyes, arms: 'down', legs: u < 1 ? (Math.floor(tt * 12) % 2 ? 'walkA' : 'walkB') : 'stand', t: tt, seed: 5 });
  }
  if (!o.clear) P.rain(L, t, { n: o.rainN ?? 230, light: true, am: o.rainA ?? .85, ang: .2, len: 100, w: 1.6 });
}

// 17 / 19–21：桥（宽）
function storm(t, A) {
  const L = A.ink;
  const z = t < HUSH ? key(t, [[S0, 1], [HUSH, 1.1]]) : t < 111.0 ? 1.04 : key(t, [[111.0, 1.05], [114.5, 1.3], [116.5, 1.45], [119.5, 1.6]]);
  const cx = t < 111.0 ? 960 : key(t, [[111.0, 960], [114.5, 1300], [119.5, 1480]]), cy = t < 111 ? 560 : key(t, [[111, 560], [119.5, 760]]);
  const C = cam(A, cx, cy, z);
  bridgeScene(L, t, t);
  const flash = [S0, S0 + 2.47, S0 + 3.9].reduce((m, a) => Math.max(m, t >= a && t < a + .5 ? (t - a < .05 ? .5 : .5 * (1 - (t - a) / .5)) : 0), 0);
  const hitF = t >= HIT && t < HIT + .3 ? .55 * (1 - (t - HIT) / .3) : 0;
  const sk = t >= HIT && t < HIT + .6 ? (1 - (t - HIT) / .6) * 16 : 0;
  if (t > S0 && t < S0 + 2.47) P.bolt(L, 1500, -20 + (t - S0) * 0, 500, clamp(1 - (t - S0) / .45), 7);
  return { ...C, bleed: 5, rim: 1, flash: Math.max(flash, hitF), shake: [Math.sin(t * 93) * sk, Math.cos(t * 71) * sk * .6] };
}
// 18：静默。过肩：他的背影占据左下，桥那头的斗笠人很小；雨越下越慢，最后一滴
function hush(t, A) {
  const L = A.ink, C = cam(A, 960, 540, key(t, [[HUSH, 1], [STRIKE, 1.06]], 'lin'));
  night(L, t);
  P.bridge(L, 1500, 1060, 900, { seed: 41, hk: HK, dark: .7, reflect: false });
  P.wash(L.wet, -100, 1030, 2020, 1180, .5, .9);
  figure(L, POSE.stand, { ...herK, hat: true, cloak: true, wind: .2 }, { x: 1480, y: P.bridgeDeckY(1500, 1060, 900, 1480, HK), s: 1.5, dir: -1, seed: 4, t: t12(t) });
  figure(L, POSE.back, { ...himK, wind: .3 }, { x: 420, y: 1500, s: 9.5, dir: 1, seed: 3, t: t12(t) });
  const slow = 1 - seg(t, HUSH, EV.drip);
  P.rain(L, HUSH + (t - HUSH) * slow * .4 + seg(t, HUSH, EV.drip) * .4, { n: Math.round(230 * Math.max(.05, slow)), light: true, am: .8, ang: .2, len: 100 * Math.max(.3, slow), w: 1.4 });
  // 最后一滴：从栏杆落下，落进桥面的水洼
  const d0 = EV.drip - .45, u = seg(t, d0, EV.drip), dx = 1260, dy0 = 720, dy1 = 965;
  if (t > d0 - .3 && t < EV.drip) P.dot(L.col, dx, lerp(dy0, dy1, u * u), 3.2, .95);
  if (t >= EV.drip) { const r = (t - EV.drip) / 1.2; const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * 5.9; pts.push([dx + Math.cos(a) * 70 * eo(r), dy1 + Math.sin(a) * 14 * eo(r)]); } draw(L, mk(pts, { w: 2, tone: .3, dry: .5, prof: 'brush', seed: 300 }), 1, (1 - clamp(r)) * .9); P.glow(L.col, dx, dy1, 40, .4 * (1 - clamp(r))); }
  return { ...C, bleed: 5, rim: 1 };
}
// 22：她张开手，金锁落进他的掌心；她的手垂下；雨把一切冲淡
function lockHand(t, A) {
  const L = A.ink, C = cam(A, 960, 540, key(t, [[119.4, 1], [124, 1.08]], 'lin'));
  P.wash(L.wet, -100, -100, 2020, 1180, .3, .45);
  bigHand(L, 900, 700, 1.25, .15);
  const drop = seg(t, EV.handDrop, EV.handDrop + 1.0);
  const hx = 1180, hy = lerp(330, 470, eo(seg(t, 119.6, EV.lockOpen))) + drop * drop * 600;
  // 她的手：小一号、手背朝上，从右上伸来，张开放下金锁，然后垂落出画
  bigHand(L, hx, hy, .78, .6 - .6 * seg(t, EV.lockOpen - .3, EV.lockOpen + .2), { am: 1 - drop * .7, rot: Math.PI * .82 + drop * .5 });
  const ly = t < EV.lockOpen ? hy + 40 : lerp(hy + 40, 620, eo(seg(t, EV.lockOpen, EV.lockOpen + .6)));
  P.lock(L, t < EV.lockOpen ? hx - 10 : lerp(hx - 10, 905, eo(seg(t, EV.lockOpen, EV.lockOpen + .6))), ly, 1.5, { p: 0 });
  P.rain(L, t, { n: 140, am: .55, ang: .15, len: 80 });
  return { ...C, bleed: 6, rim: 1 };
}

export const SHOTS = [
  { id: 'storm', t0: 100.95, f: storm, tin: { m: 2, d: .9 } },
  { id: 'hush', t0: HUSH, f: hush },
  { id: 'strike', t0: STRIKE - .45, f: storm, tin: { m: 4, d: .2 } },
  { id: 'lockHand', t0: 119.35, f: lockHand, tin: { m: 0, d: 1.0, c: [1500, 700] } },
];
export const LAYOUT = [];
export function events() {
  return [
    { type: 'amb', kind: 'storm', t0: 100.95, t1: HUSH },
    { type: 'amb', kind: 'rainSoft', t0: HUSH, t1: EV.drip },
    { t: S0, type: 'thunder', gain: .8 }, { t: S0 + 2.47, type: 'thunder', gain: .7 }, { t: S0 + 3.9, type: 'crack', gain: .6 },
    { t: EV.drip, type: 'drip', gain: 1 },
    { t: STRIKE - .3, type: 'inhale', gain: .6 },
    { t: STRIKE, type: 'dragon', gain: 1 }, { t: HIT, type: 'impact', gain: 1 },
    { t: HIT + .4, type: 'cloth', gain: .7 }, { t: 114.4, type: 'fallBody', gain: .7 },
    { type: 'amb', kind: 'rain', t0: STRIKE + 1, t1: 124.2 },
    { t: 116.0, type: 'scamper', gain: .5, d: 1.6 },
    { t: EV.lockOpen, type: 'lockClink', gain: .8 }, { t: EV.handDrop, type: 'cloth', gain: .4 },
    { t: 122.6, type: 'washdown', gain: .6, d: 1.5 },
  ];
}
