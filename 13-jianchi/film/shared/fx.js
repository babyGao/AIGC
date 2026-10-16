// 《航海王》打斗格的效果（几何），四种风格各自用自己的材料画（木刻刻、皮影镂、水墨写、剪纸剪）。
// 依据：用户给的四页（refs/onepiece/）——集中线、速度线、巨大拟声字斜穿画格、音浪、碎石烟团、水花、霸气黑焰与黑闪电、冲击星。
// 原则：效果给密度，脸不变形。
import { mulberry } from '/core/lib.js';

// 集中线：从画面外缘指向中心的细长尖楔，中心留空（rIn 以内不画）。返回多边形列表
export function focusLines(cx, cy, rIn, rOut, n = 90, seed = 1, wMax = 22) {
  const r = mulberry(seed), out = [];
  for (let i = 0; i < n; i++) {
    const a = (i + r() * .8) / n * Math.PI * 2, w = (.25 + r() ** 2 * .75) * wMax, r0 = rIn * (1 + r() * .35), r1 = rOut;
    const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
    out.push([[cx + ca * r0, cy + sa * r0], [cx + ca * r1 + nx * w / 2, cy + sa * r1 + ny * w / 2], [cx + ca * r1 - nx * w / 2, cy + sa * r1 - ny * w / 2]]);
  }
  return out;
}
// 速度线：一组平行的尖楔（沿 angle 方向），落在矩形 [x0,y0,x1,y1] 里
export function speedLines(rect, angle, n = 40, seed = 2, wMax = 8) {
  const r = mulberry(seed), [x0, y0, x1, y1] = rect, ca = Math.cos(angle), sa = Math.sin(angle), nx = -sa, ny = ca, out = [];
  for (let i = 0; i < n; i++) {
    const cx = x0 + r() * (x1 - x0), cy = y0 + r() * (y1 - y0), L = 80 + r() * 380, w = (.3 + r() * .7) * wMax;
    out.push([[cx - ca * L / 2, cy - sa * L / 2], [cx + ca * L / 2 + nx * w / 2, cy + sa * L / 2 + ny * w / 2], [cx + ca * L / 2 - nx * w / 2, cy + sa * L / 2 - ny * w / 2]]);
  }
  return out;
}
// 音浪：从嘴向外的一圈圈锯齿弧（开口朝 dir），返回折线列表（各风格当粗线或镂缝画）
export function soundRings(cx, cy, dir, spread, radii, seed = 3, teeth = 14) {
  const r = mulberry(seed), out = [];
  for (const R of radii) {
    const pts = [], n = teeth * 2;
    for (let i = 0; i <= n; i++) { const a = dir - spread / 2 + spread * i / n, rr = R * (i % 2 ? 1.08 + r() * .06 : .94 - r() * .04); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    out.push(pts);
  }
  return out;
}
// 冲击星（爆点）：尖角不规则的星形
export function burst(cx, cy, r0, r1, n = 14, seed = 4) {
  const r = mulberry(seed), pts = [];
  for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 + (r() - .5) * .12, rr = i % 2 ? r0 * (.8 + r() * .4) : r1 * (.7 + r() * .5); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return pts;
}
// 碎石 / 冰屑：不规则小多边形，沿 dir 方向飞散（越远越小），附一条拖尾
export function debris(cx, cy, dir, spread, count = 30, rMax = 320, seed = 5, size = 18) {
  const r = mulberry(seed), out = [];
  for (let i = 0; i < count; i++) {
    const a = dir + (r() - .5) * spread, d = 40 + r() * rMax, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, s = size * (.4 + r() * .9) * (1 - d / (rMax * 1.6)), k = 4 + Math.floor(r() * 3), rot = r() * 6.28;
    const poly = []; for (let j = 0; j < k; j++) { const t = rot + j / k * Math.PI * 2, rr = s * (.6 + r() * .6); poly.push([x + Math.cos(t) * rr, y + Math.sin(t) * rr]); }
    out.push({ poly, trail: [[x - Math.cos(a) * s * 3, y - Math.sin(a) * s * 3], [x, y]], s });
  }
  return out;
}
// 烟团：一串圆鼓鼓的团（航海王的冲击烟），返回圆列表 [x,y,r]
export function puffs(cx, cy, w, h, count = 9, seed = 6) {
  const r = mulberry(seed), out = [];
  for (let i = 0; i < count; i++) out.push([cx + (r() - .5) * w, cy + (r() - .5) * h, 20 + r() * 40]);
  return out;
}
// 水花皇冠：一圈向上溅起的水柱 + 水滴
export function splash(cx, cy, w, h, seed = 7) {
  const r = mulberry(seed), cols = [], drops = [];
  const n = 11;
  for (let i = 0; i < n; i++) { const u = (i + .5) / n, x = cx - w / 2 + w * u, hh = h * (.4 + .6 * Math.sin(u * Math.PI)) * (.7 + r() * .5), ww = w / n * .7, lean = (u - .5) * .8;
    cols.push([[x - ww / 2, cy], [x + lean * hh * .3 - ww * .15, cy - hh], [x + lean * hh * .35, cy - hh - ww * .6], [x + lean * hh * .3 + ww * .15, cy - hh], [x + ww / 2, cy]]); }
  for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + (r() - .5) * 2.4, d = h * (.6 + r() * .9); drops.push([cx + Math.cos(a) * d * w / h * .5, cy + Math.sin(a) * d, 3 + r() * 7]); }
  return { cols, drops };
}
// 霸气：沿一个轮廓向外的黑焰舌（宽根、鼓腹、尖头弯钩）+ 几道黑闪电
export function flameAura(outline, len = 60, seed = 8, every = 4) {
  const r = mulberry(seed), out = [], n = outline.length;
  for (let i = 0; i < n; i += every) {
    const p = outline[i], a = outline[(i - 2 + n) % n], b = outline[(i + 2) % n];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    let nx = ty, ny = -tx;   // 向外（按轮廓走向）
    const L = len * (.5 + r() * .9), W = len * .32 * (.6 + r() * .6), up = -.6;   // 火舌整体往上飘
    const dx = nx + 0 * up, dy = ny + up; const dl = Math.hypot(dx, dy) || 1;
    const ex = dx / dl, ey = dy / dl, hook = (r() - .5) * 1.2;
    out.push([[p[0] - tx * W / 2, p[1] - ty * W / 2], [p[0] + ex * L * .45 - tx * W * .45, p[1] + ey * L * .45 - ty * W * .45], [p[0] + ex * L + tx * W * hook, p[1] + ey * L + ty * W * hook], [p[0] + ex * L * .55 + tx * W * .35, p[1] + ey * L * .55 + ty * W * .35], [p[0] + tx * W / 2, p[1] + ty * W / 2]]);
  }
  return out;
}
export function lightning(x0, y0, x1, y1, seed = 9, jag = 26, branches = 2) {
  const r = mulberry(seed), main = [[x0, y0]], n = 9;
  for (let i = 1; i < n; i++) { const u = i / n; main.push([x0 + (x1 - x0) * u + (r() - .5) * jag * 2, y0 + (y1 - y0) * u + (r() - .5) * jag * 2]); }
  main.push([x1, y1]);
  const out = [main];
  for (let b = 0; b < branches; b++) { const k = 2 + Math.floor(r() * (n - 4)), p = main[k], br = [p]; for (let j = 1; j < 4; j++) br.push([p[0] + (x1 - x0) * .12 * j + (r() - .5) * jag * 2, p[1] + (y1 - y0) * .12 * j + (r() - .5) * jag * 2]); out.push(br); }
  return out;
}
// 光柱：从 p0（底，窄）到 p1（顶，宽）的长条，边缘有一点起伏。返回多边形
export function beam(p0, p1, w0, w1, seed = 10, n = 24) {
  const r = mulberry(seed), dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux, A = [], B = [];
  for (let i = 0; i <= n; i++) { const u = i / n, w = (w0 + (w1 - w0) * u ** .8) / 2, x = p0[0] + dx * u, y = p0[1] + dy * u, j1 = (r() - .5) * w * .12, j2 = (r() - .5) * w * .12; A.push([x + nx * (w + j1), y + ny * (w + j1)]); B.push([x - nx * (w + j2), y - ny * (w + j2)]); }
  return A.concat(B.reverse());
}
// 光柱里顺着轴的速度线（细长尖楔，尖朝下 = 往上冲）
export function streaks(p0, p1, w0, w1, n = 40, seed = 11, wMax = 10) {
  const r = mulberry(seed), dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux, out = [];
  for (let i = 0; i < n; i++) {
    const u0 = r() * .9, len = (.12 + r() * .4), u1 = Math.min(1.05, u0 + len), off = (r() - .5) * .9, w = (.3 + r() * .7) * wMax;
    const at = u => { const ww = (w0 + (w1 - w0) * u) / 2; return [p0[0] + dx * u + nx * off * ww, p0[1] + dy * u + ny * off * ww]; };
    const a = at(u0), b = at(u1);
    out.push([a, [b[0] + nx * w / 2, b[1] + ny * w / 2], [b[0] - nx * w / 2, b[1] - ny * w / 2]]);
  }
  return out;
}
// 水面涟漪：以 (cx,cy) 为心的一圈圈扁椭圆（透视压扁），返回折线
export function ripples(cx, cy, rx, ry, n = 4, seed = 12, gap = 1.45) {
  const r = mulberry(seed), out = [];
  for (let k = 0; k < n; k++) { const s = gap ** k, pts = []; const a0 = r() * .6; for (let i = 0; i <= 48; i++) { const a = a0 + i / 48 * Math.PI * 2; pts.push([cx + Math.cos(a) * rx * s, cy + Math.sin(a) * ry * s]); } out.push(pts); }
  return out;
}
// 平静的水面：横向短线，近大远疏（hz 地平线，y1 画面底）
export function calmLines(x0, x1, hz, y1, rows = 16, seed = 13) {
  const r = mulberry(seed), out = [];
  for (let i = 0; i < rows; i++) { const u = (i + .5) / rows, y = hz + (y1 - hz) * u ** 1.7, k = 2 + Math.floor(u * 5); for (let j = 0; j < k; j++) { const x = x0 + r() * (x1 - x0), l = 20 + u * 160 * (.4 + r()); out.push([[x, y], [x + l, y + (r() - .5) * 2]]); } }
  return out;
}
