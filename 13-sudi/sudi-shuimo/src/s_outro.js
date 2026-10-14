// 尾奏「钤印」245.5–263.3：整幅画蒸发成纸，只剩星河的两颗星和 Clawd → Clawd 跳到左下角落下，留下一方朱红「长安」→
// 右侧题跋「天上星 亮晶晶 永灿烂 长安宁」逐字写出 → Clawd 抬头看星，眨眼。停在纸上。
import { mk, draw, blot } from '../engine/ink.js';
import { clawd } from './clawd.js';
import * as P from './props.js';
import { brushColumn, seal } from './glyph.js';
import { EV } from './timeline.js';
import { cam, seg, key, clamp, lerp, eio, eo, ss, t12, hop } from './util.js';
import * as IN from './s_inter.js';

const CL0 = [1480, P.bridgeDeckY(IN.BX, IN.BY, IN.BW, 1480, IN.HK)];
const SEAL = [330, 800], S = 120;
function end(t, A) {
  const L = A.ink, tt = t12(t), C = cam(A, 960, 540, key(t, [[EV.evapA, 1], [263.34, 1.04]], 'lin'));
  const night = 1 - ss(seg(t, 247.5, 254.0));
  P.wash(L.wet, -100, -100, 2020, 1180, .42 * night, .3 * night);
  { const pts = []; for (let i = 0; i <= 24; i++) { const a = -2.75 + i / 24 * 1.6; pts.push([1275 + Math.cos(a) * 900, 980 + Math.sin(a) * 900]); } draw(L, mk(pts, { w: 140, tone: .07, wet: 1, dry: .7, prof: 'lens', seed: 1700 }), 1, 1 - night * .5); }
  // 两颗星：越来越淡的夜里，渐变成两个浓墨的小点（纸上的星）
  for (const [x, y] of [[1240, 170], [1310, 146]]) {
    P.glow(L.col, x, y, 50, .9 * night); P.dot(L.col, x, y, 5, night);
    if (night < 1) { blot(L.dry, x, y, 7, .9 * (1 - night), 0, 1, x); blot(L.wet, x, y, 26, .1 * (1 - night), 0, 1, x + 1); const pts = []; for (let i = 0; i <= 18; i++) { const a = i / 18 * 5.8; pts.push([x + Math.cos(a) * 24, y + Math.sin(a) * 24]); } draw(L, mk(pts, { w: 2.2, tone: .5, dry: .6, prof: 'brush', seed: x }), 1, .7 * (1 - night)); }
  }
  // Clawd：桥头 → 走到左下 → 一跳 → 落下钤印 → 坐在印旁
  const walkU = seg(t, 249.0, EV.hop), hopU = seg(t, EV.hop, EV.seal);
  let x, y, legs = 'stand', arms = 'down', eyes = 'u', sq = 0;
  const start = [CL0[0], 900], pre = [SEAL[0] + S / 2 + 180, 900], land = [SEAL[0] + S / 2, SEAL[1] + S - 8];
  if (t < 249.0) { x = start[0]; y = start[1]; arms = t < 247 ? 'wave' : 'down'; eyes = t < 247 ? 'happy' : 'u'; }
  else if (t < EV.hop) { x = lerp(start[0], pre[0], eio(walkU)); y = 900 - Math.abs(Math.sin(tt * 12)) * 6; legs = Math.floor(tt * 10) % 2 ? 'walkA' : 'walkB'; eyes = 'l'; }
  else if (t < EV.seal) { const p = hop(pre, land, 220, eo(hopU)); x = p[0]; y = p[1]; legs = 'tuck'; eyes = 'l'; sq = -.15 * Math.sin(hopU * Math.PI); }
  else {
    const after = t - EV.seal, side = seg(t, EV.seal + .6, EV.seal + 1.4);
    x = lerp(land[0], SEAL[0] + S + 70, eio(side)); y = lerp(land[1], SEAL[1] + S + 2, side);
    sq = after < .5 ? .25 * Math.exp(-after * 8) * Math.cos(after * 30) : 0;
    legs = side > 0 && side < 1 ? (Math.floor(tt * 10) % 2 ? 'walkA' : 'walkB') : side >= 1 ? 'sit' : 'stand';
    eyes = t > 262.2 && t < 262.42 ? 'blink' : t > EV.colophonA + .5 ? 'u' : 'happy';
  }
  // 印：在它落下的那一刻出现（先略大、略淡，再压实）
  if (t >= EV.seal) { const k = seg(t, EV.seal, EV.seal + .12); seal(A.cc, SEAL[0] - (1 - k) * 6, SEAL[1] - (1 - k) * 6, S + (1 - k) * 12, '长安', .95 * (.7 + .3 * k), 9); }
  clawd(L, { x, y, s: 7.5, eyes, arms, legs, sq, t: tt, seed: 5, dir: -1 });
  // 题跋：两列，自右向左
  const p = seg(t, EV.colophonA, EV.colophonB);
  brushColumn(L, '天上星亮晶晶', 1610, 300, 62, clamp(p * 2), { dryK: seg(t, EV.colophonA + .6, EV.colophonB), sweeps: 4 });
  brushColumn(L, '永灿烂长安宁', 1510, 300, 62, clamp(p * 2 - 1), { dryK: seg(t, EV.colophonA + 2.6, EV.colophonB + 1.5), sweeps: 4 });
  return { ...C, bleed: 6, rim: 1 };
}
export const SHOTS = [
  { id: 'end', t0: EV.evapA - .4, f: end, tin: { m: 0, d: 7.0, c: [1480, 860], ease: 'lin' } },
];
export const LAYOUT = [{ t: 236, x: 150, y: 160, tone: 'paper', dx: 150 }];
export function events() {
  return [
    { type: 'amb', kind: 'windSoft', t0: EV.evapA, t1: 263.34 },
    { t: EV.evapA, type: 'evaporate', gain: .6, d: 7 },
    { t: EV.hop, type: 'hop', gain: .6 }, { t: EV.seal, type: 'seal', gain: 1 },
    { t: EV.colophonA, type: 'brush', gain: .5, d: EV.colophonB - EV.colophonA },
  ];
}
