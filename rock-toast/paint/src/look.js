// 画面"调色盘 + 布光 + 笔法"：静帧和动态镜头共用
// 原则：背景只是托底（暗、静、干净），亮度和颜色留给食物；主光在左后上方，食物有一圈暖色轮廓光
import { KNIFE, BRUSH, DAB } from './impasto.js';

export const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
export const lumOf = (r, g, b) => .3 * r + .59 * g + .11 * b;
const sat = (c, k) => { const l = lumOf(...c); return c.map(v => l + (v - l) * k); };
const curve = (v, k) => { v = clamp(v); return v + k * v * (1 - v) * (v - .5) * 2; };   // S 曲线：k>0 加对比
const lift = (v, g) => Math.pow(clamp(v), g);                                              // g<1 提亮中间调

// —— 调色盘：同一块原片像素，按它属于什么东西决定怎么"调颜料" ——
export const PAL = {
  // 食物：先提中间调（更亮更透），再加对比；暗部补饱和，避免发灰
  food: (c, o) => { const l = lumOf(...c); let [r, g, b] = sat(c, (o.sat ?? 1.04) + Math.max(0, .42 - l) * .6);
    r = lift(r * 1.03, .86); g = lift(g, .88); b = lift(b * .96, .9); return [curve(r, .42), curve(g, .42), curve(b, .38)]; },
  // 液体（奶、蛋液、酱）：保亮、略暖
  liquid: (c, o) => { let [r, g, b] = sat(c, o.sat ?? 1.08); return [curve(lift(r * 1.02, .9), .3), curve(lift(g, .9), .3), curve(b * .97, .28)]; },
  // 白瓷 → 炭灰哑光石盘：只保留原片的明暗起伏和高光，金边保留色相
  slate: (c, o) => {
    const l = lumOf(...c), s = Math.max(...c) - Math.min(...c);
    const v = .095 + .06 * clamp((l - .4) / .55) + Math.max(0, l - .9) * .9;
    let out = (o.tone || [1.03, .99, .95]).map(t => v * t);
    if (s > .16 && c[0] > c[2] && l > .4) { const k = clamp((s - .16) * 4); out = out.map((x, i) => x * (1 - k) + c[i] * .7 * k); }
    return out;
  },
  // 木板 → 深胡桃（保留木纹，压暗压饱和）
  walnut: (c, o) => { const [r, g, b] = sat(c, .7); const k = o.k ?? .4; return [r * k * 1.05, g * k * .94, b * k * .82]; },
  // 铸铁锅：本来就黑，压一点、保油光
  iron: (c, o) => { const l = lumOf(...c); const v = .025 + l * .5 + Math.max(0, l - .55) * 1.1; return [v * 1.03, v, v * .96]; },
  // 玻璃：透出去的是新背景（台面以下透出深胡桃木），只留原片里玻璃自己的高光
  glass: (c, o, x) => { const base = x.v > o.thruV ? PAL.walnut(c, { k: .34 }) : x.bgc; const k = clamp((x.hi - .03) * 1.7); return base.map((b, i) => b + (1 - b) * k * .92); },
  // 不锈钢：去色、压暗，留反光；勺里的奶油、叉上的果酱保留本色
  steel: (c, o) => { const l = lumOf(...c), sc = Math.max(...c) - Math.min(...c); const v = .04 + l * .6 + Math.max(0, l - .72) * 1.3;
    const k = clamp((sc - .1) * 6), f = PAL.food(c, {}); return [v * .97, v, v * 1.04].map((x, i) => x * (1 - k) + f[i] * k); },
  keep: c => c,
};

// —— 背景：不取原片，按米其林暗场重新设计 ——
// 墙面：近黑的暖炭色，主体后方一团柔和暖光，上角略偏冷；台面：比墙略亮的深胡桃，主体脚下有一道柔和反光，越近镜头越暗
export function backdrop(u, v, B) {
  const hz = B.horizon ?? .2, gl = B.glow || [.6, .12, .4];
  const dg = Math.hypot((u - gl[0]) * .75, v - gl[1]) / gl[2];
  let glow = Math.exp(-dg * dg * 1.1);
  if (B.rays) {                                               // 爆炸光：从光心放射的光束，越远越淡
    const an = Math.atan2(v - gl[1], (u - gl[0]) * .5625), rr = .5 + .5 * Math.cos(an * B.rays + Math.sin(an * 3) * 1.5);
    glow += Math.pow(rr, 6) * Math.exp(-dg * 1.2) * (B.rayK ?? .6);
    glow *= 1 - .55 * clamp((Math.hypot((u - .5) * 1.2, v - .45) - .35) * 1.6);   // 四角压暗
  }
  const cool = clamp(1 - Math.hypot(u - .5, v) * 1.6) * 0;
  if (v < hz) {
    const w = B.wall || [.026, .022, .021], gc = B.glowCol || [.25, .145, .07];
    const top = clamp(1 - v / Math.max(hz, .05)) * .35;      // 越往上越沉
    return w.map((x, i) => (x + gc[i] * glow) * (1 - top * .5) + [.004, .006, .01][i] * top + cool);
  }
  const t = (v - hz) / (1 - hz), tc = B.table || [.058, .042, .034];
  const k = 1 - .62 * Math.pow(t, .8);
  const pu = B.pool?.[0] ?? gl[0], pv = B.pool?.[1] ?? hz + .08;
  const pool = Math.exp(-((u - pu) ** 2 / .07 + (v - pv) ** 2 / .012));
  const edge = Math.exp(-((v - hz) ** 2) / .0004) * .5;      // 台面后沿一线微光，分开墙和桌
  return tc.map((x, i) => x * k + [.11, .066, .032][i] * (pool + edge * glow));
}

// —— 布光：主体中心最亮，向外沉入暗场；左后上方主光让上沿和左沿更亮 ——
export function light(u, v, Lt, p) {
  const d = Math.hypot((u - Lt[0]) * .5625, v - Lt[1]) / Lt[2];
  const pool = .86 + .3 * Math.exp(-d * d * 2.2);
  const key = 1 + .12 * clamp(.5 - (v - Lt[1]) * 1.2 - (u - Lt[0]) * .6);
  const lit = p.lit ?? 1;
  return lit * pool * key + (1 - lit);
}

// —— 笔法 ——
export const STY = {
  // 背景：大号鬃刷长横扫，低起伏、低抖动，不出小笔触——干净的暗场
  bg: { type: BRUSH, maxR: 120, detail: 6, fallback: -4, aj: .22, jit: .014, hgt: .22, len: 1.5, wid: 1.1, alpha: .62, bleed: true },
  food: { type: KNIFE, maxR: 40, detail: .85, follow: 3, fallback: 70, aj: .35, jit: .05, hgt: 1.3 },
  liquid: { type: BRUSH, maxR: 26, detail: .8, follow: 2, fallback: 90, aj: .25, jit: .035, hgt: 1.15 },
  slate: { type: BRUSH, maxR: 56, detail: 3.2, fallback: 0, aj: .2, jit: .015, hgt: .5, len: 1.4, bleed: true },
  walnut: { type: BRUSH, maxR: 60, detail: 2.2, fallback: 0, aj: .3, jit: .03, hgt: .6, len: 1.4, bleed: true },
  iron: { type: KNIFE, maxR: 48, detail: 1.8, fallback: 0, aj: .35, jit: .03, hgt: .7, bleed: true },
  glass: { type: BRUSH, maxR: 22, detail: 1, follow: 2, fallback: 90, aj: .2, jit: .025, hgt: .7 },
  steel: { type: KNIFE, maxR: 26, detail: 1, follow: 2, fallback: 0, aj: .25, jit: .03, hgt: .9 },
  keep: { type: KNIFE, maxR: 30, detail: 1, follow: 3, fallback: 0, aj: .35, jit: .05, hgt: 1 },
};

// —— 渲染后期：暗角压四周、少画布纹，整体略提对比 ——
export const POST = { light: [-.5, -.75, .62], norm: 4.2, dif: .32, spec: .3, shin: 28, amb: .8, vig: .3, weave: .025, sat: 1.03, contrast: 1.06, ao: 1.3 };
export const GROUND = [.022, .019, .018];
