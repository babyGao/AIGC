// 母版共用小工具
// 毛尖：沿折线生成一簇簇毛尖（out=1 向左法线外，-1 反向）；h 毛尖长度；seed 换一组随机
export function tufts(pts, out = 1, h = 26, seed = 0, step = 22) {
  const o = [], R = (a, b) => Math.abs(Math.sin((a * 12.9898 + b * 78.233 + seed * 37.719) * 43758.5453)) % 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0) || 1, k = Math.max(1, Math.round(L / step));
    const nx = -(y1 - y0) / L * out, ny = (x1 - x0) / L * out;
    for (let j = 0; j < k; j++) {
      const r1 = R(i, j), r2 = R(j + 3, i + 7), u0 = j / k, u1 = (j + .35 + r2 * .3) / k, hh = h * (.35 + .9 * r1), lean = (r2 - .3) * .9;
      o.push([x0 + (x1 - x0) * u0, y0 + (y1 - y0) * u0]);
      o.push([x0 + (x1 - x0) * u1 + nx * hh + (x1 - x0) / L * hh * lean, y0 + (y1 - y0) * u1 + ny * hh + (y1 - y0) / L * hh * lean]);
    }
  }
  o.push(pts[pts.length - 1]); return o;
}
export const mirX = (pts, cx) => pts.map(([x, y]) => [2 * cx - x, y]);
export const mirXr = (pts, cx) => pts.map(([x, y]) => [2 * cx - x, y]).reverse();
