// 三遍副歌：同一组母题构图（圆相、灯笼、门与月、星河命盘、绝笔、诀别），每一遍讲不同的意思：
// k=0 恩怨（他被卷进仇杀；她写下绝笔，乔装赴约）；k=1 失去（他站在两军之间，Clawd 代替门童守门，他写下「长安」，折箭，走进白雾）；
// k=2 星河（Clawd 绕断箭走出一个圆；万盏天灯；门后亮起光；桥上倒放，龙回掌心，两人相拥，走进星河）
import { mk, draw, blot, mass, qpts } from '../engine/ink.js';
import { figure, POSE, mixPose, walkPose } from './figure.js';
import { clawd } from './clawd.js';
import * as P from './props.js';
import { EV, line, ch, chEnd, bar } from './timeline.js';
import { cam, seg, key, clamp, lerp, eio, eo, ss, t12, hop } from './util.js';
import { mulberry } from '/core/lib.js';
import { brushChar } from './glyph.js';
import * as IN from './s_inter.js';

const himK = { type: 'him', cloak: true }, herK = { type: 'her', skirt: true };
const LA = '当恩怨各一半', LB = '我怎么圈揽', LC = '看灯笼血红染', LD = '寻仇已太晚', LE = '月下门童喟叹', LF = '昨夜太平长安', LG = '当天上星河转', LH = '我命已定盘', LI = '待绝笔墨痕干', LJ = '宿敌已来犯', LK = '我借你的孤单', LL = '今生恐怕难还';
const START = [bar(25), bar(66), bar(83)], END = [100.95, 203.39, EV.evapA];

// ———— 1 圆相 ————
function enso(k) {
  return (t, A) => {
    const L = A.ink, C = cam(A, 960, 540, key(t, [[START[k] - 1, 1.04], [line(LB, k).t1, 1]]));
    const a0 = line(LA, k).t0, a1 = line(LA, k).t1, close = ch(LB, 4, k);
    const p = t < a1 ? .9 * eo(seg(t, a0 - .2, a1)) : .9 + .1 * eo(seg(t, close - .5, close));
    if (k === 2) {
      // 雪地俯视：断箭在圆心，Clawd 绕着走，小脚印连成圆
      P.wash(L.wet, -100, -100, 2020, 1180, .16, .22);
      P.arrow(L, 900, 560, 170, -.1, { broken: .55 });
      const R = 330, ang = -Math.PI / 2 + p * Math.PI * 2;
      for (let i = 0; i < 64; i++) { const u = i / 64; if (u > p) break; const a = -Math.PI / 2 + u * Math.PI * 2, sd = i % 2 ? 1 : -1; blot(L.dry, 960 + Math.cos(a) * (R + sd * 9), 540 + Math.sin(a) * (R + sd * 9) * .62, 4.5, .55, a, .6, i); }
      const tt = t12(t), moving = p < .999;
      clawd(L, { x: 960 + Math.cos(ang) * R, y: 540 + Math.sin(ang) * R * .62 + 30, s: 6, eyes: moving ? (Math.cos(ang) > 0 ? 'd' : 'd') : 'u', look: [Math.sin(ang) * -.8, 0], arms: 'down', legs: moving ? (Math.floor(tt * 10) % 2 ? 'walkA' : 'walkB') : 'stand', t: tt, seed: 5 });
      P.snow(L, t, { n: 90, am: .8, speed: 30, size: 2.4 });
      return { ...C, bleed: 5, rim: 1 };
    }
    P.wash(L.wet, -100, -100, 2020, 1180, .06, .1);
    P.enso(L, 960, 540, 380, p, { fill: true, sAmt: 1, dark: k === 1 ? .7 : 1, seed: 150 + k });
    if (k === 1) {   // 两半各是一支军队（俯视的枪阵）
      const R0 = mulberry(5);
      for (let i = 0; i < 160; i++) {
        const left = i % 2 === 0, a = (left ? Math.PI / 2 : -Math.PI / 2) + (R0() - .5) * 2.6, r = 80 + R0() * 260, x = 960 + Math.cos(a) * r * (left ? -1 : 1) * -1, y = 540 + Math.sin(a) * r;
        const xx = left ? Math.min(900, 960 - Math.abs(x - 960)) : Math.max(1020, 960 + Math.abs(x - 960));
        const vis = clamp((p - .5) * 4 - i / 160);
        if (vis > 0) draw(L, mk([[xx, y], [xx + (left ? 14 : -14), y - 4]], { w: 2.4, tone: .9, dry: .4, prof: 'tip', seed: 3000 + i }), 1, vis);
      }
    }
    const tt = t12(t);
    figure(L, POSE.front, { ...himK }, { x: 960, y: 610, s: 1.5, seed: 3, t: tt });
    return { ...C, bleed: 6, rim: 1.1 };
  };
}

// ———— 2 灯笼 ————
function lanterns(k) {
  return (t, A) => {
    const L = A.ink, c0 = line(LC, k), d0 = line(LD, k), stain = ch(LC, 5, k);
    const tt = t12(t);
    if (k === 0) {
      const z = key(t, [[c0.t0, 1], [d0.t0, 1], [d0.t1 + .6, 1.32]]), C = cam(A, lerp(960, 760, seg(t, d0.t0, d0.t1)), lerp(540, 600, seg(t, d0.t0, d0.t1)), z);
      P.wash(L.wet, -200, -200, 2120, 1280, .7, .82);
      P.lift(L.wet, 1000, 700, 760, .55, .9);
      const g = P.gate(L, 1180, 900, 1.25, { open: .25 });
      const blood = seg(t, stain, stain + 2.4);
      for (const lx of g.lanternX) P.lantern(L, lx, g.lanternY + 30, 1.5, { lit: 1 - blood * .85, blood, sway: Math.sin(t * 2 + lx) * .5, seed: 70 + lx % 7 });
      P.wash(L.wet, -200, 905, 2120, 1280, .4, .7);
      // 他奔来，停在门前
      const u = seg(t, c0.t0 - .2, c0.t0 + 2.1), x = lerp(-120, 690, eo(u));
      const pose = u < 1 ? walkPose((tt - c0.t0) / .42, true) : mixPose(POSE.stand, POSE.look, ss(seg(tt, d0.t0, d0.t0 + .6)));
      figure(L, pose, { ...himK, wind: u < 1 ? .8 : .3 }, { x, y: 905, s: 3.4, dir: 1, seed: 3, t: tt });
      P.rain(L, t, { n: 60, light: true, am: .5, ang: .1, len: 50 });
      return { ...C, bleed: 5, rim: 1 };
    }
    // k1 / k2：山谷夜营，两岸灯笼
    const C = cam(A, 960, 540, key(t, [[c0.t0 - .5, 1.06], [d0.t1 + .5, 1]]));
    P.wash(L.wet, -100, -100, 2020, 1180, .72, .8);
    if (k === 2) P.starRiver(L, 960, 1600, 1500, 0, .7, { a0: -2.5, a1: -.6, band: .14, n: 160, t, seed: 25, lift: .35 });
    const far = P.mountains('campHills', 1920, 700, [[200, 160, 200], [700, 230, 220], [1250, 180, 200], [1750, 240, 220]], 520, { seed: 17, tone: .3, mist: .6, depth: 260 });
    P.blitLayer(L, far, 0, 420);
    const R0 = mulberry(9), N = 22;
    for (let i = 0; i < N; i++) {
      const left = i < N / 2, j = left ? i : i - N / 2, x = left ? 160 + j * 64 + R0() * 20 : 1180 + j * 64 + R0() * 20, y = 820 - Math.sin(j * .5) * 30 + R0() * 30;
      const lit = k === 2 ? 1 : clamp((t - c0.t0 - j * .16) / .25);
      if (lit <= 0) { R0(); continue; }
      const blood = k === 1 ? seg(t, stain + j * .05, stain + 2 + j * .05) : 0;
      P.lantern(L, x, y, .5, { lit: lit * (1 - blood * .7), blood, seed: 300 + i });
    }
    if (k === 1) figure(L, POSE.front, { ...himK, wind: .3 }, { x: 960, y: 900, s: 1.8, seed: 3, t: tt });
    if (k === 2) {
      P.skyLanterns(L, t, c0.t0 - 1.2, { n: 90, spread: 5, xr: [100, 1820], y: 840 });
      clawd(L, { x: 960, y: 960, s: 4.2, eyes: 'u', arms: t > ch(LD, 4, 2) ? 'up' : 'down', legs: 'stand', t: tt, seed: 5 });
    }
    P.wash(L.wet, -100, 930, 2020, 1180, .5, .8);
    return { ...C, bleed: 5, rim: 1 };
  };
}

// 城关：长城墙 + 城楼 + 门洞
function fortress(L, x, y, s, open = 0) {
  mass(L.wet, [[x - 900 * s, y], [x - 900 * s, y - 150 * s], [x + 900 * s, y - 160 * s], [x + 900 * s, y]], .38, 6, 801);
  for (let i = 0; i < 36; i++) { const px = x - 880 * s + i * 50 * s; mass(L.wet, [[px, y - 150 * s], [px, y - 178 * s], [px + 26 * s, y - 178 * s], [px + 26 * s, y - 150 * s]], .45, 1, 810 + i); }
  draw(L, mk([[x - 900 * s, y - 150 * s], [x + 900 * s, y - 160 * s]], { w: 6 * s, tone: .85, dry: .45, prof: 'even', seed: 802 }), 1, 1);
  mass(L.wet, [[x - 180 * s, y - 160 * s], [x - 150 * s, y - 300 * s], [x + 150 * s, y - 300 * s], [x + 180 * s, y - 160 * s]], .5, 3, 803);
  draw(L, mk([[x - 260 * s, y - 286 * s], [x - 200 * s, y - 304 * s], [x, y - 312 * s], [x + 200 * s, y - 304 * s], [x + 260 * s, y - 286 * s]], { w: 12 * s, tone: .95, dry: .35, prof: 'even', seed: 804 }), 1, 1);
  mass(L.wet, [[x - 190 * s, y - 330 * s], [x - 150 * s, y - 400 * s], [x + 150 * s, y - 400 * s], [x + 190 * s, y - 330 * s]], .5, 3, 805);
  draw(L, mk([[x - 240 * s, y - 380 * s], [x, y - 410 * s], [x + 240 * s, y - 380 * s]], { w: 10 * s, tone: .95, dry: .35, prof: 'even', seed: 806 }), 1, 1);
  // 门洞（拱）
  const hole = qpts(x - 90 * s, y, x, y - 300 * s, x + 90 * s, y, 12);
  mass(L.wet, hole, .85 - open * .8, 2, 807);
  if (open > 0) P.glow(L.col, x, y - 80 * s, 260 * s * open, .9 * open, [255, 246, 226]);
  draw(L, mk(hole, { w: 8 * s, tone: .9, dry: .4, prof: 'brush', seed: 808 }), 1, 1);
}
// 扫帚
function broom(L, x, y, s) {
  draw(L, mk([[x, y - 120 * s], [x + 6 * s, y - 10 * s]], { w: 3.2 * s, tone: .85, dry: .4, prof: 'even', seed: 820 }), 1, 1);
  for (let i = 0; i < 9; i++) draw(L, mk([[x + 6 * s, y - 14 * s], [x + (i - 4) * 4 * s + 6 * s, y + 6 * s]], { w: 1.4 * s, tone: .7, dry: .6, prof: 'tip', seed: 821 + i }), 1, 1);
}
// 叹气：一小团白气
function sigh(L, x, y, t, t0) {
  const u = seg(t, t0, t0 + 1.4); if (u <= 0 || u >= 1) return;
  for (let i = 0; i < 4; i++) P.glow(L.col, x + 30 * u + i * 10 * u, y - 30 * u - i * 6, 14 + 26 * u, .55 * (1 - u) * (1 - i * .2), [248, 244, 236]);
}

// ———— 3 门与月 ————
function moonGate(k) {
  return (t, A, Bset) => {
    const e0 = line(LE, k), f0 = line(LF, k), sighT = ch(LE, 5, k), tt = t12(t);
    const memA = f0.t0 - .1, memB = f0.t1 - 1.0;
    const drawPresent = (L, Cx) => {
      P.wash(L.wet, -100, -100, 2020, 1180, .6, .66);
      P.moon(L, 1460, 250, 115, 1, 31);
      P.lift(L.wet, 800, 820, 520, .55, .9);
      if (k === 1) {
        fortress(L, 860, 930, .9, 0);
        clawd(L, { x: 860, y: 930, s: 5, eyes: t < sighT ? 'u' : t < sighT + .25 ? 'blink' : 'd', arms: 'down', legs: 'sit', t: tt, seed: 5, breath: 1.5 });
        sigh(L, 905, 870, t, sighT);
      } else {
        const g = P.gate(L, 760, 930, .9, { open: k === 2 ? ss(seg(t, f0.t0 - .2, f0.t0 + 1.4)) : 0, lightIn: true });
        for (const lx of g.lanternX) P.lantern(L, lx, g.lanternY + 20, 1.1, { lit: k === 2 ? ss(seg(t, f0.t0, f0.t0 + 1.5)) : 0, blood: k === 0 ? 1 : 0, seed: 70 + Math.round(lx) % 7 });
        if (k === 0) {
          figure(L, POSE.boySit, { type: 'boy' }, { x: 760, y: 934, s: 1.9, seed: 15, t: tt });
          broom(L, 800, 934, 1.8);
          sigh(L, 780, 830, t, sighT);
        } else {
          // 门开：他和她站在光里，朝 Clawd 招手
          const op = ss(seg(t, f0.t0 + .3, f0.t0 + 1.6));
          if (op > 0) {
            figure(L, POSE.front, { ...himK, smile: true }, { x: 715, y: 905, s: 1.45, seed: 3, t: tt, am: op });
            figure(L, t > f0.t0 + 1.8 ? POSE.wave : POSE.front, { ...herK, smile: true }, { x: 805, y: 905, s: 1.35, seed: 12, t: tt, am: op });
          }
          const turned = t > f0.t0 + .9;
          clawd(L, { x: 760, y: 1000, s: 5, eyes: turned ? (t > f0.t0 + 2.6 ? 'happy' : 'u') : t < sighT ? 'u' : 'd', arms: t > f0.t0 + 2.8 ? 'wave' : 'down', legs: 'sit', t: tt, seed: 5, breath: 1.4 });
          sigh(L, 805, 945, t, sighT);
        }
      }
      P.wash(L.wet, -100, 940, 2020, 1180, .3, .6);
    };
    const z = key(t, [[e0.t0 - .5, 1.0], [f0.t1, 1.06]]);
    const C = cam(A, 960, 540, z);
    drawPresent(A.ink);
    // 回忆：昨夜（墨晕里长出来，再干回去）
    if (k !== 2 && Bset && t > memA && t < memB + 1.2) {
      const L = Bset.ink; cam(Bset, 960, 540, z);
      if (k === 0) {
        P.wash(L.wet, -100, -100, 2020, 1180, .4, .45);
        P.moon(L, 1460, 250, 115, 1, 31);
        const g = P.gate(L, 760, 930, .9, { open: .7, lightIn: true });
        for (const lx of g.lanternX) P.lantern(L, lx, g.lanternY + 20, 1.1, { lit: 1, seed: 70 + Math.round(lx) % 7 });
        figure(L, POSE.front, { type: 'him', smile: true }, { x: 700, y: 905, s: 1.3, seed: 31, t: tt });
        figure(L, POSE.front, { type: 'her', skirt: true, smile: true }, { x: 820, y: 905, s: 1.25, seed: 32, t: tt });
        figure(L, POSE.stand, { type: 'boy' }, { x: 900 + Math.sin(t * 3) * 20, y: 950, s: 1.3, seed: 15, t: tt, dir: Math.sin(t * 3) > 0 ? 1 : -1 });
        broom(L, 930 + Math.sin(t * 3) * 20, 950, 1.3);
      } else {
        // 塞外：低矮的草原地平线、一群羊、他她与 Clawd 并肩坐着
        P.wash(L.wet, -100, -100, 2020, 700, .05, .12);
        const hills = P.mountains('steppe', 1920, 600, [[300, 60, 300], [1000, 80, 400], [1600, 50, 300]], 420, { seed: 23, tone: .2, mist: .5, depth: 160 });
        P.blitLayer(L, hills, 0, 380);
        P.glow(L.col, 1300, 520, 220, .5, [255, 238, 214]);
        for (let i = 0; i < 9; i++) P.sheep(L, 300 + i * 150 + Math.sin(i) * 40, 880 + (i % 3) * 30, 1.2, 1, 40 + i, i % 2 ? 1 : -1);
        figure(L, POSE.sit, { ...himK }, { x: 1150, y: 760, s: 2.2, dir: 1, seed: 3, t: tt });
        figure(L, POSE.sit, { ...herK, smile: true }, { x: 1230, y: 762, s: 2.05, dir: 1, seed: 12, t: tt });
        clawd(L, { x: 1300, y: 772, s: 3.6, eyes: 'happy', arms: 'down', legs: 'sit', t: tt, seed: 5 });
        for (let i = 0; i < 30; i++) draw(L, mk([[i * 70, 800 + (i % 4) * 20], [i * 70 + 30, 790 + (i % 4) * 20]], { w: 2, tone: .4, dry: .7, prof: 'tip', seed: 900 + i }), 1, .6);
      }
      const R = t < memB ? 20 + 640 * ss(seg(t, memA, memA + 1.6)) : 660 * (1 - ss(seg(t, memB, memB + 1.2)));
      return { ...C, bleed: 5, rim: 1, paperB: C.paper, bleedB: 5, rimB: 1, trans: [k === 0 ? 760 : 860, 820, R, 1], tmode: 0 };
    }
    return { ...C, bleed: 5, rim: 1 };
  };
}

// ———— 4 星河命盘 ————
function wheel(k) {
  return (t, A) => {
    const L = A.ink, g0 = line(LG, k), h0 = line(LH, k), lock = ch(LH, 4, k), tt = t12(t);
    const cy = key(t, [[g0.t0 - 1.3, 760], [g0.t1, 420], [h0.t1, 380]]), C = cam(A, 960, cy, 1);
    P.wash(L.wet, -100, -400, 2020, 1300, .7, .55);
    const spin = k === 2 ? 1 - ss(seg(t, g0.t0, lock)) : 1;
    const rot = k === 2 ? 2 * (1 - Math.pow(1 - seg(t, g0.t0 - 1.3, lock), 2)) : t < lock ? (t - g0.t0) * .55 : (lock - g0.t0) * .55 + Math.sin((t - lock) * 30) * .01 * Math.exp(-(t - lock) * 6);
    P.starRiver(L, 960, 200, 900, rot * .4, 1, { a0: -3.1, a1: .1, band: .25, n: 200, t, seed: 27, lift: 0 });
    P.fateWheel(L, 960, 200, 520, rot, 1, { p: eo(seg(t, g0.t0 - 1.2, g0.t0 + .6)), seed: 33 + k, light: true });
    if (t >= lock && t < lock + .5) P.glow(L.col, 960, 200, 600, .3 * (1 - (t - lock) / .5));
    // 崖与人
    mass(L.wet, [[-100, 1300], [-100, 980], [500, 940], [820, 960], [1000, 1010], [1100, 1300]], .7, 6, 860, [0, 940, 0, 1300, 1, 1]);
    draw(L, mk([[-60, 982], [500, 942], [820, 962], [1000, 1012]], { w: 9, tone: .95, dry: .45, prof: 'brush', seed: 861 }), 1, 1);
    if (k < 2) {
      const reach = k === 1 ? ss(seg(tt, g0.t0 - .8, g0.t0 - .2)) * (1 - ss(seg(tt, h0.t0, h0.t0 + .6))) : 0;
      figure(L, reach > 0 ? mixPose(POSE.back, { ...POSE.back, aR: [[8.5, -74], [14, -88], [16, -104]] }, reach) : POSE.back, { ...himK, wind: .4 }, { x: 640, y: 946, s: 2.6, seed: 3, t: tt });
      if (k === 1) {   // 一颗星从他掌心升起，嵌进命盘
        const u = seg(t, g0.t0 - .3, lock - .1), sx = lerp(640 + 16 * 2.6, 960 + Math.cos(-1.1) * 520 * .78, eo(u)), sy = lerp(946 - 104 * 2.6, 200 + Math.sin(-1.1) * 520 * .78, eo(u));
        P.glow(L.col, sx, sy, 60, .9); P.dot(L.col, sx, sy, 6, 1);
      }
    } else {
      // 两颗星并排，命盘慢慢停下；崖上只有 Clawd
      for (const dx of [-26, 26]) { const a = -1.3 + rot; const sx = 960 + Math.cos(a) * 520 * .78 + dx, sy = 200 + Math.sin(a) * 520 * .78; P.glow(L.col, sx, sy, 50, .85); P.dot(L.col, sx, sy, 5.5, 1); }
      clawd(L, { x: 620, y: 948, s: 5, eyes: 'u', arms: 'down', legs: 'sit', t: tt, seed: 5 });
    }
    return { ...C, bleed: 5, rim: 1, shake: t >= lock && t < lock + .3 && k < 2 ? [Math.sin(t * 90) * 8 * (1 - (t - lock) / .3), 0] : [0, 0] };
  };
}

// ———— 5 绝笔 ————
const LETTER = ['遇君已是长安', '长安'];
function candleRoom(L, t) {
  P.wash(L.wet, -100, -100, 2020, 1180, .74, .8);
  P.glow(L.col, 300, 360, 420, .45 + .05 * Math.sin(t * 13), [255, 236, 200]);
  P.lift(L.wet, 300, 380, 520, .75, .8);
  draw(L, mk([[300, 420], [300, 330]], { w: 22, tone: .2, wet: 1, dry: .1, prof: 'even', seed: 870 }), 1, 1);
  P.glow(L.col, 300, 305, 50, .95, [255, 246, 220]);
  blot(L.dry, 300, 312, 6, .8, 0, 1.8, 871);
  draw(L, mk([[-100, 980], [2020, 990]], { w: 30, tone: .7, dry: .4, wet: .6, prof: 'even', seed: 872 }), 1, 1);
}
function letterScene(k) {
  return (t, A) => {
    const L = A.ink, i0 = line(LI, k), j0 = line(LJ, k), tt = t12(t);
    if (k === 2) return bridgeRev(t, A);
    if (t < j0.t0) {
      const C = cam(A, 960, 540, key(t, [[i0.t0 - .3, 1], [j0.t0, 1.05]]));
      candleRoom(L, t);
      // 信纸
      const px = 640, py = 230, pw = 640, ph = 700;
      mass(L.wet, [[px, py], [px + pw, py + 6], [px + pw - 4, py + ph], [px + 4, py + ph - 6]], .03, 2, 873);
      P.lift(L.wet, px + pw / 2, py + ph / 2, 420, .9, .3);
      draw(L, mk([[px, py], [px + pw, py + 6], [px + pw - 4, py + ph], [px + 4, py + ph - 6], [px, py]], { w: 2, tone: .45, dry: .6, prof: 'even', seed: 874 }), 1, .7);
      const text = LETTER[k], n = [...text].length, size = k === 0 ? 96 : 230;
      let tip = null;
      [...text].forEach((c, i) => {
        const si = k === 0 ? i : i * 3, a = ch(LI, Math.min(5, si), k), b = k === 0 ? chEnd(LI, Math.min(5, si), k) : chEnd(LI, Math.min(5, si + 2), k);
        const p = seg(t, a, b), dryK = seg(t, b, b + 1.2);
        const x = k === 0 ? px + pw - 120 - Math.floor(i / 6) * 130 : px + pw / 2, y = k === 0 ? py + 110 + (i % 6) * 100 : py + 190 + i * 300;
        if (p > 0) brushChar(L, c, x, y, size, p, { dryK, sweeps: 4 });
        if (p > 0 && p < 1) tip = [x + (p * 2 % 1 - .5) * size * .6, y - size * .4 + p * size * .8];
      });
      // 笔：一支毛笔（杆 + 笔头），握在袖口伸出的手里
      const bt = tip || [px + pw - 120, py + 110 + Math.min(5, Math.floor(seg(t, i0.t0, i0.t1) * 6)) * 100];
      draw(L, mk([[bt[0] + 10, bt[1] - 14], [bt[0] + 150, bt[1] - 260]], { w: 9, tone: .8, dry: .35, prof: 'even', seed: 875 }), 1, 1);
      draw(L, mk([[bt[0] + 24, bt[1] - 40], [bt[0] + 2, bt[1]]], { w: 14, tone: .95, dry: .3, wet: .4, prof: 'cone', seed: 876 }), 1, 1);
      const sleeveK = k === 0 ? .7 : 1.3;
      const sx0 = bt[0] + 150, sy0 = bt[1] - 210;
      mass(L.wet, [[sx0 - 30, sy0 - 40 * sleeveK], [sx0 + 500, sy0 - 160 * sleeveK], [sx0 + 560, sy0 + 120 * sleeveK], [sx0 + 40, sy0 + 50 * sleeveK]], .2, 8, 877);
      draw(L, mk([[sx0 + 540, sy0 + 110 * sleeveK], [sx0 + 260, sy0 + 90 * sleeveK], [sx0 + 30, sy0 + 40 * sleeveK]], { w: 26 * sleeveK, tone: .75, darkDir: [0, 1], side: .85, brWet: true, body: .35, dry: .3, wet: .9, prof: 'robe', seed: 878, nb: 16 }), 1, 1);
      draw(L, mk([[sx0 - 10, sy0 - 30 * sleeveK], [sx0 + 20, sy0 + 40 * sleeveK]], { w: 8, tone: .85, dry: .4, prof: 'tip', seed: 879 }), 1, 1);
      blot(L.wet, sx0 + 4, sy0 + 4, 22, .14, 0, .8, 880);
      return { ...C, bleed: 6, rim: 1 };
    }
    // 宿敌已来犯
    if (k === 0) {
      const C = cam(A, 960, 540, key(t, [[j0.t0, 1.15], [j0.t1 + .3, 1.0]]));
      P.wash(L.wet, -100, -100, 2020, 1180, .76, .86);
      P.lift(L.wet, 1300, 200, 700, .45, .9);
      if (t - j0.t0 < .5) P.bolt(L, 1450, -20, 520, 1 - (t - j0.t0) / .5, 11);
      const x = lerp(1500, 1050, seg(t, j0.t0, j0.t1 + .4));
      figure(L, walkPose((tt - j0.t0) / .55), { ...himK, wind: 1 }, { x, y: 1000, s: 5.5, dir: -1, seed: 3, t: tt });
      P.wash(L.wet, -100, 990, 2020, 1180, .6, .9);
      P.rain(L, t, { n: 240, light: true, am: .9, ang: .22, len: 110, w: 1.6 });
      return { ...C, bleed: 5, rim: 1, flash: t - j0.t0 < .2 ? .4 : 0 };
    }
    // k1：两军像两道墨潮从左右扑来
    const C = cam(A, 960, 560, key(t, [[j0.t0, 1.1], [j0.t1 + .5, 1]]));
    P.wash(L.wet, -100, -100, 2020, 1180, .35, .45);
    const adv = eo(seg(t, j0.t0, j0.t1 + 1.2));
    P.army(L, -400 + adv * 300, 760 + adv * 60, 900, { dir: 1, rows: 5, s: 1.1, t, march: 1, seed: 261 });
    P.army(L, 1160 - adv * 60, 2300 - adv * 300, 905, { dir: -1, rows: 5, s: 1.1, t, march: 1, seed: 262 });
    for (const sg of [-1, 1]) draw(L, mk([[960 + sg * 1100, 940], [960 + sg * (300 - adv * 60), 930]], { w: 160, tone: .5, darkDir: [0, 1], side: .8, brWet: true, body: .3, dry: .6, wet: .9, prof: 'cone', seed: 880 + sg }), clamp(adv * 1.4), .8);
    return { ...C, bleed: 5, rim: 1, flash: t - j0.t0 < .2 ? .4 : 0, shake: [Math.sin(t * 40) * 3 * adv, 0] };
  };
}
// 副歌三：桥上倒放（龙回掌心，她从桥面上站起来），然后在桥心相拥
function bridgeRev(t, A) {
  const L = A.ink, i0 = line(LI, 2), emb = EV.embrace, tt = t12(t);
  const C = cam(A, 960, 560, key(t, [[i0.t0 - .2, 1], [emb + 2, 1.08]]));
  if (t < emb - 1.2) {
    const tau = lerp(114.6, EV.strike - .3, eio(seg(t, i0.t0 - .1, emb - 1.3)));
    IN.bridgeScene(L, tau, t, { noKneel: true, clear: true });
    return { ...C, bleed: 5, rim: 1 };
  }
  // 相拥：两人向桥心走近
  P.wash(L.wet, -400, -300, 2400, 1400, .6, .7);
  P.starRiver(L, 960, 1500, 1500, 0, .9, { a0: -2.6, a1: -.55, band: .14, n: 240, t, seed: 23, lift: .4 });
  P.bridge(L, IN.BX, IN.BY, IN.BW, { seed: 41, hk: IN.HK, dark: .7, reflect: false });
  P.wash(L.wet, -400, IN.BY - 10, 2400, 1400, .5, .9);
  const u = seg(t, emb - 1.2, emb + .3), mx = 960;
  const hx = lerp(560, mx - 34, eio(u)), sx = lerp(1360, mx + 34, eio(u));
  const dy = x => P.bridgeDeckY(IN.BX, IN.BY, IN.BW, x, IN.HK);
  const pH = u < 1 ? walkPose((tt - emb) / .5) : mixPose(POSE.stand, POSE.reach, .7), pS = u < 1 ? walkPose((tt - emb) / .5 + .5) : mixPose(POSE.stand, POSE.reach, .7);
  figure(L, pS, { ...herK, wind: .3, eye: true }, { x: sx, y: dy(sx), s: 3.0, dir: -1, seed: 4, t: tt });
  figure(L, pH, { ...himK, wind: .3, eye: true }, { x: hx, y: dy(hx), s: 3.2, dir: 1, seed: 3, t: tt });
  return { ...C, bleed: 5, rim: 1 };
}

// ———— 6 诀别 ————
function farewell(k) {
  return (t, A) => {
    const L = A.ink, k0 = line(LK, k), l0 = line(LL, k), tt = t12(t);
    if (k === 0) {
      // 屋里：她（乔装）摸摸睡在信上的 Clawd，推门走进雨里；Clawd 醒来，追出门去
      const C = cam(A, 960, 560, key(t, [[k0.t0 - .2, 1.05], [l0.t1, 1]]));
      candleRoom(L, t);
      // 门：右边一道门框，门外是雨
      P.lift(L.wet, 1480, 600, 300, .5, .5);
      mass(L.wet, [[1340, 240], [1620, 240], [1620, 990], [1340, 990]], .1, 2, 890);
      for (const x of [1330, 1630]) draw(L, mk([[x, 230], [x, 995]], { w: 20, tone: .85, dry: .4, prof: 'even', seed: 891 + x }), 1, 1);
      P.rain(L, t, { n: 50, light: true, am: .7, ang: .15, len: 70, box: [1345, 245, 1615, 985] });
      // 桌与信
      draw(L, mk([[560, 820], [1180, 820]], { w: 16, tone: .85, dry: .4, prof: 'even', seed: 892 }), 1, 1);
      mass(L.wet, [[700, 808], [960, 800], [980, 818], [710, 822]], .08, 1, 893);
      const wake = l0.t0 + 1.4, run = l0.t0 + 2.6;
      // 她
      const leave = seg(t, k0.t0 + 1.8, l0.t0 + 1.0), herX = lerp(1040, 1480, eio(leave));
      const pose = t < k0.t0 + 1.6 ? mixPose(POSE.stand, POSE.reach, ss(seg(tt, k0.t0, k0.t0 + .6)) * (1 - ss(seg(tt, k0.t0 + 1.2, k0.t0 + 1.7)))) : walkPose((tt - k0.t0) / .6);
      figure(L, pose, { ...herK, hat: true, cloak: true, wind: .2 }, { x: herX, y: 990, s: 4.2, dir: t < k0.t0 + 1.7 ? -1 : 1, seed: 4, t: tt, am: 1 - seg(t, l0.t0 + .4, l0.t0 + 1.4) });
      // Clawd：在信上睡 → 醒 → 看信 → 追出去
      const cu = seg(t, run, END[0] + .3), cx = lerp(840, 1520, eio(cu));
      const eyes = t < wake ? 'shut' : t < wake + .2 ? 'blink' : t < run ? 'd' : 'r';
      clawd(L, { x: cx, y: cu > 0 ? 990 - Math.abs(Math.sin(tt * 16)) * 8 : 806, s: 5, eyes, arms: t < wake ? 'tuck' : 'down', legs: t < wake ? 'sit' : cu > 0 ? (Math.floor(tt * 12) % 2 ? 'walkA' : 'walkB') : 'stand', t: tt, seed: 5, breath: t < wake ? 1.5 : 1 });
      return { ...C, bleed: 5, rim: 1 };
    }
    if (k === 1) {
      // 两军之间的崖上：他折断一支箭，两道墨潮停住；他转身走进白雾。然后（停顿）只剩断箭和 Clawd
      const C = cam(A, 960, 560, key(t, [[k0.t0 - .2, 1.15], [EV.arrowSnap, 1.25], [END[1] + 2.5, 1.0]]));
      P.wash(L.wet, -100, -100, 2020, 1180, .32, .42);
      const halt = t < EV.arrowSnap ? .9 : .9 + .02 * Math.exp(-(t - EV.arrowSnap) * 3);
      P.army(L, -300, 600, 960, { dir: 1, rows: 5, s: 1.1, t: Math.min(t, EV.arrowSnap), march: t < EV.arrowSnap ? 1 : 0, seed: 261, am: .9 });
      P.army(L, 1320, 2200, 965, { dir: -1, rows: 5, s: 1.1, t: Math.min(t, EV.arrowSnap), march: t < EV.arrowSnap ? 1 : 0, seed: 262, am: .9 });
      mass(L.wet, [[640, 1200], [700, 900], [860, 840], [1060, 836], [1220, 900], [1280, 1200]], .45, 5, 895, [0, 836, 0, 1100, 1, .6]);
      draw(L, mk([[690, 905], [860, 842], [1060, 838], [1230, 905]], { w: 8, tone: .9, dry: .45, prof: 'brush', seed: 896 }), 1, 1);
      const snapU = seg(t, EV.arrowSnap - .15, EV.arrowSnap + .1);
      const leaving = seg(t, EV.arrowSnap + .8, END[1] - .3);
      if (leaving < 1) {
        const pose = t < EV.arrowSnap + .8 ? POSE.snap : walkPose((tt - EV.arrowSnap) / .7);
        figure(L, t < EV.arrowSnap + .8 ? pose : POSE.back, { ...himK, wind: .5 }, { x: 960, y: 842 - leaving * 40, s: 2.8 * (1 - leaving * .25), seed: 3, t: tt, am: 1 - ss(leaving) });
        if (t < EV.arrowSnap + .6) P.arrow(L, 960 - 70, 842 - 61 * 2.8, 140, 0, { broken: snapU * .7 });
      }
      if (t >= EV.arrowSnap + .6) P.arrow(L, 900, 846, 140, .05, { broken: .65 });
      // 白雾：从上方漫下来，把他吞没
      if (leaving > 0) P.lift(L.wet, 960, 600, 900 * leaving, .9 * leaving, .8);
      if (t > END[1] - 1.5) {
        clawd(L, { x: 1060, y: 842, s: 4, eyes: t < EV.snowflake + .8 ? 'u' : 'd', arms: 'down', legs: 'sit', t: tt, seed: 5, am: seg(t, END[1] - 1.5, END[1] - .8) });
        const fu = seg(t, EV.snowflake - 1.2, EV.snowflake + 1.0);
        if (fu > 0 && fu < 1) P.dot(L.col, 1040 + Math.sin(fu * 6) * 20, lerp(560, 820, fu), 3.5, .95, [252, 250, 244]);
      }
      return { ...C, bleed: 5, rim: 1, shake: snapU > 0 && snapU < 1 ? [Math.sin(t * 80) * 5, 0] : [0, 0] };
    }
    // k2：两人走过桥，沿星河的光走上天，化成两颗星；Clawd 在桥头挥手
    const C = cam(A, 960, 520, key(t, [[k0.t0, 1.08], [END[2], .95]]));
    P.wash(L.wet, -400, -300, 2400, 1400, .6, .7);
    P.starRiver(L, 960, 1500, 1500, 0, 1, { a0: -2.6, a1: -.55, band: .14, n: 240, t, seed: 23, lift: .4 });
    // 一条光路：从桥心斜上到天
    const c = L.wet; c.save(); c.globalCompositeOperation = 'destination-out'; c.filter = 'blur(30px)'; c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 120; c.beginPath(); c.moveTo(960, 700); c.quadraticCurveTo(1150, 350, 1300, 60); c.stroke(); c.restore();
    P.bridge(L, IN.BX, IN.BY, IN.BW, { seed: 41, hk: IN.HK, dark: .7, reflect: false });
    P.wash(L.wet, -400, IN.BY - 10, 2400, 1400, .5, .9);
    const u = seg(t, k0.t0, l0.t1 - .3), path = s => [lerp(960, 1300, s) - Math.sin(s * Math.PI) * 60, lerp(P.bridgeDeckY(IN.BX, IN.BY, IN.BW, 960, IN.HK), 60, s)];
    const sc = lerp(3.0, .5, u), fade = seg(u, .7, 1);
    for (const [dx, K, sd] of [[-20, himK, 3], [20, herK, 4]]) {
      const q = path(eio(u));
      if (fade < 1) figure(L, walkPose((tt - k0.t0) / .7 + (dx > 0 ? .5 : 0)), { ...K, wind: .2 }, { x: q[0] + dx * sc / 3, y: q[1], s: sc, dir: 1, seed: sd, t: tt, am: 1 - fade });
      if (fade > 0) { P.glow(L.col, q[0] + dx * 1.4, q[1] - 40 * sc, 50, .8 * fade); P.dot(L.col, q[0] + dx * 1.4, q[1] - 40 * sc, 5, fade); }
    }
    const wv = t > l0.t0;
    clawd(L, { x: 1480, y: P.bridgeDeckY(IN.BX, IN.BY, IN.BW, 1480, IN.HK), s: 5.5, eyes: wv ? 'happy' : 'u', arms: wv ? 'wave' : 'down', legs: 'stand', t: tt, seed: 5 });
    return { ...C, bleed: 5, rim: 1 };
  };
}

export function shots(k) {
  const S = START[k];
  const tB = line(LC, k).t0 - .35, tC = line(LE, k).t0 - .45, tD = line(LG, k).t0 - 1.3, tE = line(LI, k).t0 - .25, tF = line(LK, k).t0 - .2;
  const out = [
    { id: `c${k}_enso`, t0: S - (k === 0 ? .25 : k === 1 ? .6 : 0), f: enso(k), tin: k === 0 ? { m: 0, d: 1.0, c: [1036, 650] } : k === 1 ? { m: 2, d: 1.2 } : { m: 1, d: 1.2 } },
    { id: `c${k}_lant`, t0: tB, f: lanterns(k), tin: k === 2 ? { m: 1, d: .9 } : { m: 2, d: .9 } },
    { id: `c${k}_moon`, t0: tC, f: moonGate(k), tin: { m: 1, d: 1.1 } },
    { id: `c${k}_wheel`, t0: tD, f: wheel(k), tin: { m: 0, d: 1.2, c: [1460, 250] } },
    { id: `c${k}_letter`, t0: tE, f: letterScene(k), tin: k === 2 ? { m: 1, d: .9 } : { m: 0, d: .8, c: [960, 300] } },
    { id: `c${k}_fare`, t0: tF, f: farewell(k), tin: k === 2 ? null : { m: 1, d: 1.0 } },
  ];
  if (k < 2) out.push({ id: `c${k}_jflash`, t0: line(LJ, k).t0 - .05, f: letterScene(k), tin: { m: 4, d: .22 } });
  return out;
}

const pos = (t, x, y, tone) => ({ t, x, y, tone, dx: 150 });
export const LAYOUT = [0, 1, 2].flatMap(k => [
  pos(START[k] - 1.6, 150, 150, 'ink'),
  pos(line(LC, k).t0 - 1.4, 150, 160, 'paper'),
  pos(line(LE, k).t0 - 1.4, 150, 150, 'paper'),
  pos(line(LG, k).t0 - 1.4, 1240, 860, 'paper'),
  pos(line(LI, k).t0 - 1.4, k === 0 ? 1160 : k === 1 ? 1160 : 150, k === 2 ? 160 : 160, k === 1 ? 'paper' : 'paper'),
  pos(line(LK, k).t0 - 1.4, k === 1 ? 150 : 150, k === 1 ? 160 : 160, k === 1 ? 'ink' : 'paper'),
]);

export function events() {
  const E = [];
  for (let k = 0; k < 3; k++) {
    E.push({ t: line(LA, k).t0 - .2, type: 'brush', gain: .9, d: line(LA, k).t1 - line(LA, k).t0 + .2 });
    E.push({ t: ch(LB, 4, k), type: 'brushEnd', gain: .8 });
    E.push({ type: 'amb', kind: 'night', t0: line(LC, k).t0 - .4, t1: line(LH, k).t1 });
    E.push({ t: ch(LC, 5, k), type: 'stain', gain: .7 });
    E.push({ t: ch(LE, 5, k), type: 'sigh', gain: .6 });
    E.push({ t: ch(LH, 4, k), type: k === 2 ? 'chime' : 'lockClick', gain: .9 });
    for (let i = 0; i < (k === 2 ? 0 : 6); i++) E.push({ t: ch(LI, i, k), type: 'brushTick', gain: .5 });
  }
  E.push({ type: 'amb', kind: 'rain', t0: line(LC, 0).t0, t1: line(LD, 0).t1 + .5 });
  E.push({ t: line(LJ, 0).t0, type: 'thunder', gain: .9 }, { type: 'amb', kind: 'storm', t0: line(LJ, 0).t0, t1: line(LJ, 0).t1 + .5 });
  E.push({ type: 'amb', kind: 'rainIndoor', t0: line(LK, 0).t0 - .3, t1: 101 });
  E.push({ t: line(LK, 0).t0 + 2.2, type: 'door', gain: .6 });
  E.push({ type: 'amb', kind: 'army', t0: line(LJ, 1).t0, t1: EV.arrowSnap });
  E.push({ t: line(LJ, 1).t0, type: 'charge', gain: .9 });
  E.push({ t: EV.arrowSnap, type: 'snap', gain: 1 });
  E.push({ t: EV.snowflake, type: 'snowTick', gain: .5 });
  E.push({ type: 'silence', t0: EV.brkMusicA, t1: EV.brkMusicB });
  E.push({ type: 'amb', kind: 'snowWind', t0: line(LA, 2).t0 - .5, t1: line(LB, 2).t1 + .5 });
  E.push({ t: line(LF, 2).t0 + .2, type: 'doorOpen', gain: .7 });
  E.push({ t: line(LI, 2).t0, type: 'reverse', gain: .8, d: EV.embrace - 1.2 - line(LI, 2).t0 });
  return E;
}
