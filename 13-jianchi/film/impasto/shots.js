// 分镜（照 lemo-opuscar impasto demo 的 film.js：每个镜头每帧从笔触重画）。灰的世界；颜色是事件。
import { up, plate, flush, mul, TR, SC, about, key, NEVER, E, dyn } from './kit.js';
import { buildFangyuan, fyFace, GOX, GOY, GRW, GRH, FY } from './scenes/fangyuan.js';
import { buildRiver, riverFx, spray, bigSpray, feetWater, riverCrowd, VW, VH, FANG, figH, buildRiverMed, MW, MH, MED } from './scenes/river.js';
import { clamp, lerp, ss, seg, eo, hash } from './scenes/common.js';
import { KNIFE, DAB, BRUSH } from './engine/impasto.js';

export const P = {};
const fy = b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, up(v, GRW, GRH, GOX, GOY)]));
export function build(need = ['wide', 'med', 'cu']) {
  if (need.includes('wide')) { P.river = up(buildRiver(), VW, VH); P.fyS = fy(buildFangyuan(.25, 13)); }
  if (need.includes('med')) { P.med = up(buildRiverMed(), MW, MH); P.fyM = fy(buildFangyuan(.54, 14)); }
  if (need.includes('cu')) { P.fyL = fy(buildFangyuan(1, 12)); }
}
// 方源一整套：身 -> 尸 -> 臂 -> 头 -> 五官（头绕颈转 hrot）
export function drawFy(Q, o, M, { hrot = 0, lid = .35 } = {}) {
  plate(Q.body, { ...o, M }); plate(Q.mhy, { ...o, M }); plate(Q.arm, { ...o, M });
  const Mh = mul(M, about(FY.neck[0], FY.neck[1], hrot));
  plate(Q.head, { ...o, M: Mh });
  fyFace(dyn, { lid }); flush({ ...o, M: Mh, run: .15 });
}
// 坚持仙蛊的白光：由内而外。画在人后面——贴身一圈柔白的光晕，再往外放出细长的光（h = 人高，k 0..1）
function radiance(cx, cy, h, k, t) {
  for (let i = 0; i < 70; i++) {   // 光晕：贴着身形的一圈柔白，竖长
    const a = i / 70 * Math.PI * 2 + hash(i) * .2, rx = h * (.16 + hash(i * 3.3) * .12), ry = h * (.46 + hash(i * 1.9) * .14);
    dyn.push({ x: cx + Math.cos(a) * rx * (.7 + .3 * k), y: cy + Math.sin(a) * ry * (.7 + .3 * k), ang: a + Math.PI / 2, len: h * .24 * k, wid: h * .13 * k, c: [1, 1, .97], c2: [.95, .97, .98], type: KNIFE, alpha: .42 * k, hgt: .2, seed: i });
  }
  for (let i = 0; i < 48; i++) {   // 往外放的光：细长，根在身边，尖朝外，一明一暗地呼吸
    const a = hash(i * 2.7) * Math.PI * 2, l = h * (.8 + hash(i * 5.1) * 2.2) * k, r0 = h * (.25 + hash(i) * .15);
    const pulse = .7 + .3 * Math.sin(t * 2.4 + i * 1.7);
    dyn.push({ x: cx + Math.cos(a) * (r0 + l / 2), y: cy + Math.sin(a) * (r0 + l / 2) * .9, ang: Math.atan2(Math.sin(a) * .9, Math.cos(a)), len: l * pulse, wid: (3 + hash(i * 9) * 7) * k, c: [1, 1, .98], c2: [.92, .95, .98], type: KNIFE, taper: .9, alpha: .55 * k, hgt: 1, seed: 100 + i });
  }
}
// ---- 远景：逆流河全貌。o.colour: 颜色从方源身上往外漫开的时间（NEVER = 全灰）
export function shotWide(t, tr = {}, { colourAt = NEVER, glow = 0 } = {}) {
  const cam = { x: VW / 2 + 10, y: VH / 2, zoom: 1920 / VW * 1.01 };
  const o = { t, cam, grey: 1, reveal: colourAt, revDur: .4, ...tr };
  plate(P.river, o);
  riverFx(dyn, t); riverCrowd(dyn, t); flush({ ...o, run: .1 });
  const k = figH(FANG.y) / 1604, M = mul(TR(FANG.x, FANG.y + 4), SC(k));
  if (glow > 0) { radiance(FANG.x, FANG.y - figH(FANG.y) * .5, figH(FANG.y), glow, t); flush({ ...o, grey: 0, run: 0 }); }
  drawFy(P.fyS, o, M);
  feetWater(dyn, t, FANG.x - 10, FANG.y, figH(FANG.y)); flush({ ...o, run: 0 });
  spray(dyn, t); bigSpray(dyn, t); flush({ ...o, run: 0 });
}
// ---- 中景：侧身，一步一步往画左（上游）走；脚下水只到脚踝
export function shotMedium(t, tr = {}, { colourAt = NEVER } = {}) {
  const cam = { x: key(t, [[0, 1180], [8, 1100]]), y: 760, zoom: 1.0 };
  const o = { t, cam, grey: 1, reveal: colourAt, revDur: .4, ...tr };
  plate(P.med, o);
  const s = .54, walk = Math.sin(t * Math.PI * .8), bob = -Math.abs(walk) * 8;
  const [fx, fy0] = MED.feet, x = fx - t * 20, M = mul(TR(x, fy0 + bob), SC(s));
  drawFy(P.fyM, o, M, { hrot: -.02 });
  feetWater(dyn, t, x - 30, fy0, 1604 * s); flush({ ...o, run: 0 });
}
// ---- 特写：侧脸，面无表情
export function shotCU(t, tr = {}, { colourAt = NEVER } = {}) {
  const cam = { x: 960, y: 540, zoom: 1 };
  const o = { t, cam, grey: 1, reveal: colourAt, revDur: .4, ...tr };
  plate(P.med, { ...o, cam: { x: 640, y: 600, zoom: 2.2 } });
  const s = 2.6, M = mul(TR(1200 - t * 4, 4400), SC(s));
  drawFy(P.fyL, o, M, { hrot: -.03, lid: .4 });
}
