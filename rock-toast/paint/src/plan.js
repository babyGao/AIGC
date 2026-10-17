// 绘制计划 → 刮刀笔触（由粗到细，同 lemo impasto 的 paintRef）
// 区别：计划里带一张"留用图"。不留用的像素（手、字、刻度）不取色、不算误差，
// 由粗笔触用同区周围的颜料直接盖过去——杂物是在下笔时被画掉的，不是先抠掉再画
import { Strokes, KNIFE, DAB } from './impasto.js';

let _rng = 1;
const rnd = () => { _rng |= 0; _rng = _rng + 0x6D2B79F5 | 0; let t = Math.imul(_rng ^ _rng >>> 15, 1 | _rng); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export const seedRng = s => { _rng = s * 7919 + 13; };
export { rnd };

function integral(src, W, H) {
  const I = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += src[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } }
  return I;
}
const boxSum = (I, W, x0, y0, x1, y1) => I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0];

// P = { W, H, rgb: RGBA Uint8ClampedArray, valid: Uint8Array(0/1), lab: Uint8Array, props: [每个分区的笔法] }
export function layIn(P) {
  const { W, H, rgb, valid, lab, props } = P, n = W * H;
  const gm = props.map(() => [0, 0, 0, 0]);
  for (let i = 0; i < n; i++) if (valid[i]) { const g = gm[lab[i]]; g[0] += rgb[i * 4]; g[1] += rgb[i * 4 + 1]; g[2] += rgb[i * 4 + 2]; g[3]++; }
  const mean = gm.map(g => g[3] ? [g[0] / g[3], g[1] / g[3], g[2] / g[3]] : [20, 18, 16]);
  const d = new Uint8ClampedArray(rgb);
  for (let i = 0; i < n; i++) if (!valid[i]) { const m = mean[lab[i]]; d[i * 4] = m[0]; d[i * 4 + 1] = m[1]; d[i * 4 + 2] = m[2]; d[i * 4 + 3] = 255; }
  return { d, mean };
}

// 取色器：只从同区、可留用的像素取色；附近全是杂物就把取色范围放大，直到摸到真颜色
export function sampler(P) {
  const { W, H, valid, lab } = P;
  const { d: refd, mean } = layIn(P);
  const G = (x, y) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return -1; return lab[y * W + x]; };
  const gmean = (x, y, r, g, depth = 0) => {
    let s0 = 0, s1 = 0, s2 = 0, n = 0; const st = Math.max(1, r / 3);
    for (let yy = -r; yy <= r; yy += st) for (let xx = -r; xx <= r; xx += st) {
      const px = x + xx | 0, py = y + yy | 0; if (G(px, py) !== g) continue; const i = py * W + px; if (!valid[i]) continue;
      s0 += refd[i * 4]; s1 += refd[i * 4 + 1]; s2 += refd[i * 4 + 2]; n++;
    }
    if (n) return [s0 / n, s1 / n, s2 / n];
    if (depth < 4) return gmean(x, y, r * 2 + 6, g, depth + 1);
    return mean[g];
  };
  return { refd, mean, G, gmean };
}

// 把已有笔触按"近似颜料"铺到画布上（动态镜头补笔时，先知道哪里已经画过）
export function rasterize(ctx, list) {
  for (const s of list) {
    if (s.die) continue;
    const ca = Math.cos(s.ang), sa = Math.sin(s.ang);
    ctx.setTransform(ca, sa, -sa, ca, s.x, s.y); ctx.fillStyle = `rgb(${s.c[0] * 255},${s.c[1] * 255},${s.c[2] * 255})`;
    if (s.type === DAB) { ctx.beginPath(); ctx.ellipse(0, 0, s.len / 2, s.wid / 2, 0, 0, 6.3); ctx.fill(); } else ctx.fillRect(-s.len / 2, -s.wid / 2, s.len * .95, s.wid * .92);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export function paintPlan(P, o = {}) {
  const { W, H, valid, lab, props } = P;
  const R0 = o.R || [60, 30, 15, 7.5, 3.8], T = o.T ?? 14, skip = o.skip || null, inc = !!o.incremental;
  const out = o.out || new Strokes(60000);
  seedRng(o.seed ?? 1);
  const { refd, mean, G, gmean } = o.sampler || sampler(P);
  const lum = new Float32Array(W * H); for (let i = 0; i < W * H; i++) lum[i] = refd[i * 4] * .3 + refd[i * 4 + 1] * .59 + refd[i * 4 + 2] * .11;
  const Il = integral(lum, W, H);
  const mbox = (I, x, y, r) => { const x0 = Math.max(0, Math.floor(x - r)), y0 = Math.max(0, Math.floor(y - r)), x1 = Math.min(W, Math.ceil(x + r + 1)), y1 = Math.min(H, Math.ceil(y + r + 1)); return boxSum(I, W, x0, y0, x1, y1) / Math.max(1, (x1 - x0) * (y1 - y0)); };
  const pc = document.createElement('canvas'); pc.width = W; pc.height = H; const px = pc.getContext('2d', { willReadFrequently: true });
  if (o.init) px.drawImage(o.init, 0, 0);          // 补笔模式：从已经画好的样子开始，只在缺的、错的地方下笔
  let level = 0;
  for (const R of R0) {
    const cur = px.getImageData(0, 0, W, H).data;
    const step = Math.max(1, R * .8), list = [];
    for (let gy = 0; gy < H; gy += step) for (let gx = 0; gx < W; gx += step) {
      let err = 0, n = 0, all = 0, best = -1, bx = 0, by = 0, holes = 0, hb = -1, hx = 0, hy = 0;
      const x0 = gx | 0, y0 = gy | 0, x1 = Math.min(W, (gx + step) | 0), y1 = Math.min(H, (gy + step) | 0);
      const sub = Math.max(1, (step / 5) | 0);
      for (let y = y0; y < y1; y += sub) for (let x = x0; x < x1; x += sub) {
        const i = y * W + x;
        if (skip && skip[lab[i]]) continue;          // 不归这一层画的分区（例如主体层里的背景）
        all++;
        if (!valid[i]) continue;
        const j = i * 4; let e;
        if (cur[j + 3] < 128) { e = 255; holes++; if (hb < 0) { hb = 1; hx = x; hy = y; } } else e = (Math.abs(cur[j] - refd[j]) + Math.abs(cur[j + 1] - refd[j + 1]) + Math.abs(cur[j + 2] - refd[j + 2])) / 3;
        err += e; n++; if (e > best) { best = e; bx = x; by = y; }
      }
      if (!n) {
        // 整格都是杂物：只在前三层用笔盖住（越往后笔越小，和周围笔触接得上）
        if (level > 2 || !all) continue;
        const cx = gx + step * (.3 + rnd() * .4), cy = gy + step * (.3 + rnd() * .4);
        const k = G(cx, cy); if (k < 0 || (skip && skip[k])) continue;
        if (inc && cur[((cy | 0) * W + (cx | 0)) * 4 + 3] >= 128) continue;     // 补笔模式：已经盖住的不再画
        list.push([cx, cy, k]); continue;
      }
      err /= n;
      const k = lab[(by | 0) * W + (bx | 0)]; const p = props[k]; if (!p) continue;
      if (R > p.maxR + .01 && R !== R0[R0.length - 1]) continue;
      if (inc) {
        // 补笔模式：只补露底的格子，或者内容变了很多的格子（纹理本身的误差不算）
        if (holes / n > .45) { bx = hx; by = hy; }
        else if (err < T * (p.detail ?? 1) * 3.6) continue;
      } else if (err < T * (p.detail ?? 1) && level > 0) continue;
      if (level === 0 && n < 3) continue;
      let cx = level === 0 ? (gx + step * (.3 + rnd() * .4)) : (bx * .7 + (gx + step / 2) * .3);
      let cy = level === 0 ? (gy + step * (.3 + rnd() * .4)) : (by * .7 + (gy + step / 2) * .3);
      if (G(cx, cy) !== k) { cx = bx; cy = by; }
      list.push([cx, cy, k]);
    }
    for (let i = list.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [list[i], list[j]] = [list[j], list[i]]; }
    for (const [cx, cy, g] of list) {
      const p = props[g];
      let r = Math.min(R, p.maxR) * (level === 0 ? .75 + rnd() * .7 : .8 + rnd() * .45);
      let ang;
      const edgeAng = () => { const s = Math.max(1.5, r * .8); const gx = mbox(Il, cx + s, cy, s) - mbox(Il, cx - s, cy, s), gy = mbox(Il, cx, cy + s, s) - mbox(Il, cx, cy - s, s); return { a: Math.atan2(gy, gx) + Math.PI / 2, m: Math.hypot(gx, gy) }; };
      const d = p.dir;
      const base = typeof d === 'number' ? d * Math.PI / 180 : d && d.radial ? Math.atan2(cy - d.radial[1], cx - d.radial[0]) + (d.off || 0) * Math.PI / 180 : d && d.fn ? d.fn(cx, cy) : null;
      if (base === null) { const e = edgeAng(); ang = e.m > 2 ? e.a : (p.fallback ?? 0) * Math.PI / 180 + (rnd() - .5) * 1.2; }
      else { ang = base; if (p.follow) { const e = edgeAng(); if (e.m > p.follow) ang = e.a; } }
      ang += (rnd() - .5) * (p.aj ?? .45);
      const type = p.type ?? KNIFE;
      let len = r * (type === DAB ? 1.3 : 1.7 + rnd() * 1.4) * (p.len ?? 1), wid = r * (type === DAB ? 1.1 : .95 + rnd() * .5) * (p.wid ?? 1);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const inside = (L, Wd) => { for (const [a, b] of [[.5, .5], [.5, -.5], [-.5, .5], [-.5, -.5], [0, .5], [0, -.5], [.5, 0], [-.5, 0], [.25, .5], [-.25, -.5], [.25, -.5], [-.25, .5]]) { const x = cx + ca * a * L * .92 - sa * b * Wd * .9, y = cy + sa * a * L * .92 + ca * b * Wd * .9; const gg = G(x, y); if (gg !== g && !(p.bleed && gg === -1)) return false; } return true; };
      let ok = inside(len, wid), tries = 0;
      while (!ok && tries < 6) { if (len > wid * 1.2) len *= .72; else wid *= .78; tries++; ok = inside(len, wid); }
      if (!ok && r > R0[R0.length - 1] * 1.01) continue;
      if (!ok) { len = Math.max(len, 2); wid = Math.max(wid, 1.6); }
      const cr = Math.max(1, Math.min(len, wid) * .35);
      let c1 = gmean(cx, cy, cr, g);
      const ex = cx + ca * len * .45, ey = cy + sa * len * .45;
      let c2 = G(ex, ey) === g ? gmean(ex, ey, cr, g) : c1;
      const jit = p.jit ?? .06, j = 1 + (rnd() - .5) * jit * 2, hj = [(rnd() - .5) * .025, (rnd() - .5) * .025, (rnd() - .5) * .025];
      c1 = c1.map((v, i) => Math.min(1, Math.max(0, v / 255 * j + hj[i])));
      c2 = c2.map((v, i) => Math.min(1, Math.max(0, v / 255 * (j + (rnd() - .5) * jit) + hj[i])));
      px.save(); px.translate(cx, cy); px.rotate(ang); px.fillStyle = `rgb(${c1[0] * 255},${c1[1] * 255},${c1[2] * 255})`;
      if (type === DAB) { px.beginPath(); px.ellipse(0, 0, len / 2, wid / 2, 0, 0, 6.3); px.fill(); } else px.fillRect(-len / 2, -wid / 2, len * .95, wid * .92);
      px.restore();
      out.push({ g, x: cx, y: cy, ang, len, wid, c: c1, c2, seed: rnd() * 1000, type, hgt: (p.hgt ?? 1) * (.8 + rnd() * .4) * (1 - level * .06),
        rev: 0, app: o.app ? o.app(cx, cy, level, g) : 0, skew: type === KNIFE ? (rnd() - .5) * 1.1 : 0, bend: p.bend ? (rnd() - .5) * p.bend : 0, alpha: p.alpha ?? 1 });
    }
    level++;
  }
  return { out, layin: refd };
}

// 沿折线补笔（细流、拉丝、酱线）
export function strokePath(out, pts, o) {
  const step = o.step || 14;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) {
      const a = k / n, b = (k + 1) / n, xa = x0 + (x1 - x0) * a, ya = y0 + (y1 - y0) * a, xb = x0 + (x1 - x0) * b, yb = y0 + (y1 - y0) * b;
      out.push({ ...o, x: (xa + xb) / 2, y: (ya + yb) / 2, ang: Math.atan2(yb - ya, xb - xa), len: Math.hypot(xb - xa, yb - ya) * (o.over ?? 1.35), wid: o.wid, seed: o.seed ?? rnd() * 1000 });
    }
  }
  return out;
}
