// 前奏：0–3.4 闪电钩子（雷雨夜青石桥的一掌，桥头一点朱红）→ 雨把墨冲掉 → 写片名「宿敌」→ 雾带 → 挂轴竖摇（星河到人间）
import { mk, draw, blot, mass } from '../engine/ink.js';
import { figure, POSE } from './figure.js';
import { clawd } from './clawd.js';
import * as P from './props.js';
import { brushChar, brushColumn, seal } from './glyph.js';
import { EV } from './timeline.js';
import { cam, seg, key, clamp, lerp, eio, eo, ss, t12 } from './util.js';
import * as G from './world_grove.js';

export function init() { G.init(); }

// 闪电亮度：两个尖峰（亮-暗-亮-渐暗）
const flashI = (t, a) => { const d = t - a; if (d < 0) return 0; if (d < .05) return 1; if (d < .09) return .12; if (d < .14) return 1; return Math.max(0, 1 - (d - .14) / .2); };

// 闪前画面：桥上一掌（远景、低角度）。闪电把天照亮，桥与人是剪影
function tableau(L, t) {
  P.wash(L.wet, 0, 0, 1920, 1080, .78, .9);
  P.lift(L.wet, 1050, 260, 900, 1, .9);
  P.lift(L.wet, 1350, 120, 380, .8, .7);
  P.bolt(L, 1480, -20, 560, 1, 4);
  P.bridge(L, 960, 1180, 1560, { seed: 41, reflect: false, dark: 1 });
  const dy = x => P.bridgeDeckY(960, 1180, 1560, x);
  figure(L, POSE.palm, { type: 'him', cloak: true, palm: true, wind: .8 }, { x: 640, y: dy(640), s: 4.2, seed: 3, t });
  figure(L, POSE.fall, { type: 'her', skirt: true, cloak: true, wind: 1 }, { x: 1230, y: dy(1230) - 30, s: 4, seed: 4, t, dir: -1, rot: .55 });
  // 斗笠飞在空中
  mass(L.wet, [[1360, 300], [1470, 250], [1580, 300], [1470, 322]], .75, 3, 9);
  draw(L, mk([[1352, 306], [1470, 326], [1588, 304]], { w: 6, tone: .95, dry: .4, prof: 'even', seed: 10 }));
  P.dragon(L, [[800, 520], [920, 470], [1040, 540], [1160, 480], [1240, 510]], 1, { w: 80, seed: 700 });
  P.rain(L, t, { n: 260, light: true, am: 1, ang: .2, len: 110, w: 1.8 });
}
function hook(t, A) {
  const L = A.ink;
  const I1 = flashI(t, EV.flash1), I2 = flashI(t, EV.flash2);
  if (t < EV.washA) {
    if (I1 > 0) { tableau(L, t); return { bleed: 4, rim: 1, dark: 1 - I1, flash: I1 > .9 ? .25 : 0 }; }
    if (I2 > 0) {
      // 第二道闪电：桥头一点朱红，Clawd 睁大眼
      const C = cam(A, 960, 600, 1);
      P.wash(L.wet, 0, 0, 1920, 1080, .8, .9);
      P.lift(L.wet, 1300, 300, 800, .95, .9);
      P.bridge(L, 200, 1500, 2600, { seed: 41, reflect: false, dark: 1 });
      P.wash(L.wet, 0, 860, 1920, 1080, .2, .95);
      const y0 = P.bridgeDeckY(200, 1500, 2600, 1240);
      clawd(L, { x: 1240, y: y0 + 4, s: 15, eyes: 'wide', arms: 'down', legs: 'stand', seed: 5 });
      P.rain(L, t, { n: 200, light: true, am: .9, ang: .2, len: 90 });
      return { ...C, bleed: 4, rim: 1, dark: 1 - I2 };
    }
    return { dark: 1 };
  }
  // 雨水把夜冲掉：一整片浓墨，前沿从上往下退，拖出竖向的水痕
  const u = seg(t, EV.washA, EV.washB), front = lerp(-120, 1300, eio(u));
  const c = A.cw;
  c.fillStyle = '#000'; c.fillRect(0, 0, 1920, 1080);
  c.save(); c.globalCompositeOperation = 'destination-out';
  const g = c.createLinearGradient(0, front - 160, 0, front + 30); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, 1920, front + 30);
  c.restore();
  for (let i = 0; i < 46; i++) {
    const x = (i * 97.31) % 1920, len = 60 + ((i * 53) % 140);
    draw(L, mk([[x, front - 40], [x + 3, front + len * u * 1.4]], { w: 3 + (i % 4) * 2, tone: .7, dry: .4, wet: .7, prof: 'cone', seed: 50 + i }), 1, (1 - u) * .9);
  }
  P.rain(L, t, { n: 140, am: (1 - u) * .8, ang: .2, len: 80 });
  return { bleed: 6, rim: 1 };
}

// 片名：竖写「宿 敌」，旁边小字「天龙八部之」「许嵩」，落印
const TX = 1120;
function title(t, A) {
  const L = A.ink;
  const p1 = eo(seg(t, EV.titleA + .1, EV.titleA + 1.8)), p2 = eo(seg(t, EV.titleA + 1.75, EV.titleA + 3.5));
  const d1 = seg(t, EV.titleA + .6, EV.titleA + 3.2), d2 = seg(t, EV.titleA + 2.3, EV.titleA + 4.6);
  brushChar(L, '宿', TX, 330, 340, p1, { dryK: d1, sweeps: 7 });
  brushChar(L, '敌', TX, 700, 340, p2, { dryK: d2, sweeps: 7 });
  const ps = seg(t, EV.titleA + 3.2, EV.titleB);
  brushColumn(L, '天龙八部之', TX + 290, 210, 50, ps, { dryK: seg(t, EV.titleA + 3.4, EV.titleB + .5), sweeps: 4 });
  brushColumn(L, '许嵩', TX + 290, 590, 42, seg(t, EV.titleA + 3.8, EV.titleB + .2), { dryK: seg(t, EV.titleA + 4, EV.titleB + .6), sweeps: 4 });
  // 落印：先压下（略大、淡）再定
  const ks = seg(t, EV.titleSeal - .12, EV.titleSeal + .05);
  if (ks > 0) { const S = 74 * (1 + (1 - ks) * .12); seal(A.cc, TX + 290 - S / 2, 760 - (S - 74) / 2, S, '天龙', .95 * ks, 7); }
  // 雨后的几滴水（纸上淡墨点）
  for (let i = 0; i < 7; i++) blot(A.cw, 300 + i * 210, 980 - (i % 3) * 30, 6 + (i % 4) * 3, .08 * (1 - seg(t, 3.4, 6)), 0, .8, i);
  return { bleed: 6, rim: 1.1 };
}

// 挂轴竖摇：9.0 → 22.3，从星河（y≈540）落到杏花枝下（y≈3700）
export const tiltY = t => key(t, [[EV.tiltA, 470], [EV.tiltA + 2.6, 560], [EV.tiltB - 1.2, 3640], [EV.tiltB, 3700]], 'eio');
function tilt(t, A) {
  const L = A.ink, y = tiltY(t), C = cam(A, 960, y, 1);
  G.drawWorld(L, t, [0, y - 540, 1920, y + 540]);
  sleepingClawd(L, t);
  return { ...C, bleed: 5, rim: 1 };
}
// 花下睡着的 Clawd + 落下的那片花瓣
export function sleepingClawd(L, t, wake = -1) {
  const tt = t12(t);
  const eyes = wake < 0 || tt < wake ? 'shut' : tt < wake + .15 ? 'blink' : 'n';
  clawd(L, { x: G.CLAWD0[0], y: G.CLAWD0[1], s: 7, eyes, arms: 'tuck', legs: 'sit', t: tt, seed: 5, breath: 1.4 });
}

export const SHOTS = [
  { id: 'hook', t0: 0, f: hook },
  { id: 'title', t0: EV.washB, f: title },
  { id: 'tilt', t0: EV.tiltA, f: tilt, tin: { m: 1, d: 1.8 } },
];
export const LAYOUT = [{ t: 0, x: 170, y: 870, tone: 'ink', dx: 150 }];
export function events() {
  return [
    { type: 'amb', kind: 'storm', t0: 0, t1: EV.washB + .6 },
    { t: 0, type: 'thunder', gain: .9 },
    { t: EV.flash1, type: 'crack', gain: 1 }, { t: EV.flash1 + .25, type: 'thunder', gain: 1 },
    { t: EV.flash2, type: 'crack', gain: .7 }, { t: EV.flash2 + .4, type: 'thunder', gain: .7 },
    { t: EV.washA, type: 'washdown', gain: .8, d: EV.washB - EV.washA },
    { t: EV.titleA + .1, type: 'brush', gain: .8, d: 1.6 }, { t: EV.titleA + 1.75, type: 'brush', gain: .8, d: 1.7 },
    { t: EV.titleA + 3.2, type: 'brush', gain: .4, d: 1.0 }, { t: EV.titleSeal, type: 'seal', gain: .9 },
    { type: 'amb', kind: 'wind', t0: EV.tiltA, t1: 22.6 },
  ];
}
