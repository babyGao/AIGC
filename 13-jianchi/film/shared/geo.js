// 共享几何：样条、变换、基本形。所有角色与布景都先变成多边形（[[x,y],…]），再交给各风格的引擎去“刻 / 镂 / 画 / 剪”。
export const TAU = Math.PI * 2;

// Catmull-Rom 过控制点 → 稠密折线。closed = 闭合
export function cr(cp, step = 4, closed = true) {
  const n = cp.length; if (n < 2) return cp.slice();
  const P = closed ? [cp[n - 1], ...cp, cp[0], cp[1]] : [cp[0], ...cp, cp[n - 1]];
  const out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), k = Math.max(2, Math.ceil(d / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, e) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - e) * t2 + (-a + 3 * b - 3 * c + e) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(cp[n - 1].slice(0, 2));
  return out;
}
export const C = (cp, step = 4) => cr(cp, step, true);
export const O = (cp, step = 4) => cr(cp, step, false);

// 仿射：先缩放 s（可为 [sx,sy]），再旋转 r，再平移 (x,y)
export function xf(P, x = 0, y = 0, s = 1, r = 0) {
  const sx = Array.isArray(s) ? s[0] : s, sy = Array.isArray(s) ? s[1] : s, c = Math.cos(r), n = Math.sin(r);
  return P.map(([a, b]) => { const u = a * sx, v = b * sy; return [x + u * c - v * n, y + u * n + v * c]; });
}
export const xfAll = (L, x, y, s, r) => L.map(P => xf(P, x, y, s, r));
export const flipX = P => P.map(([a, b]) => [-a, b]);

export function ell(cx, cy, rx, ry, n = 48, a0 = 0, rot = 0) {
  const o = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return o;
}
export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// 沿一条中心线（开折线）生成变宽的带状多边形：w(u) 宽度，u∈[0,1]
export function ribbon(line, w) {
  const n = line.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const hw = (typeof w === 'function' ? w(i / (n - 1)) : w) / 2;
    L.push([line[i][0] - ty * hw, line[i][1] + tx * hw]); R.push([line[i][0] + ty * hw, line[i][1] - tx * hw]);
  }
  return L.concat(R.reverse());
}
// 两端圆的胶囊（肢体）
export function capsule(ax, ay, bx, by, r0, r1 = r0) {
  const line = O([[ax, ay], [(ax + bx) / 2, (ay + by) / 2], [bx, by]], 6);
  const body = ribbon(line, u => 2 * (r0 + (r1 - r0) * u));
  return body;
}
export function bbox(polys) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const P of polys) for (const [x, y] of P) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}
export function centroid(P) { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; }
// 多边形描路径
export function path(g, P, close = true) { g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); if (close) g.closePath(); }
export function fillPolys(g, polys, col, rule = 'nonzero') { g.fillStyle = col; g.beginPath(); for (const P of polys) path(g, P); g.fill(rule); }

// 确定性随机
export function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

// 炸毛 / 尖刺轮廓：在多边形的每段法向上加尖齿（航海王式的“炸”）
export function spiky(P, amp = 20, every = 26, seed = 1, jag = .6) {
  const R = rng(seed), out = [], n = P.length;
  let acc = 0, area = 0;
  for (let i = 0; i < n; i++) { const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % n]; area += x0 * y1 - x1 * y0; }
  const sg = area > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (b[1] - a[1]) / L * sg, ny = -(b[0] - a[0]) / L * sg;
    const k = Math.max(1, Math.round(L / 4));
    for (let j = 0; j < k; j++) {
      const u = j / k, s = acc + u * L, ph = (s % every) / every;
      const tooth = ph < .5 ? ph * 2 : (1 - ph) * 2;   // 三角齿
      const h = amp * Math.pow(tooth, 1.6) * (1 - jag * .5 + jag * R());
      out.push([a[0] + (b[0] - a[0]) * u + nx * h, a[1] + (b[1] - a[1]) * u + ny * h]);
    }
    acc += L;
  }
  return out;
}

// 字形轮廓 → 多边形（用离屏画布栅格化后追踪不现实；这里直接返回一个绘制函数，供需要 path 的引擎使用）
export function textPath(text, font, x, y, opt = {}) {
  return g => { g.save(); g.font = font; g.textAlign = opt.align || 'center'; g.textBaseline = opt.base || 'middle'; if (opt.ls) g.letterSpacing = opt.ls + 'px'; g.translate(x, y); if (opt.rot) g.rotate(opt.rot); if (opt.skew) g.transform(1, 0, opt.skew, 1, 0, 0); g.fillText(text, 0, 0); g.restore(); };
}
