// 点列 → 平滑曲线（Catmull-Rom 转三次贝塞尔）。所有角色母版都用点列写，渲染时转曲线。
export function smoothD(pts, closed = false, t = 0.5) {
  const n = pts.length; if (n < 2) return '';
  const P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) * t / 3, p1[1] + (p2[1] - p0[1]) * t / 3];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t / 3, p2[1] - (p3[1] - p1[1]) * t / 3];
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}
const f = v => Math.round(v * 100) / 100;

// 采样平滑曲线为密集点列（给画笔、刻刀用）
export function sample(pts, closed = false, step = 2, t = 0.5) {
  const n = pts.length, out = [];
  const P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) * t / 3, p1[1] + (p2[1] - p0[1]) * t / 3];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t / 3, p2[1] - (p3[1] - p1[1]) * t / 3];
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]); const k = Math.max(2, Math.ceil(L / step));
    for (let j = 0; j < k; j++) {
      const u = j / k, a = (1 - u) ** 3, b = 3 * u * (1 - u) ** 2, c = 3 * u * u * (1 - u), d = u ** 3;
      out.push([a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0], a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1]]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

// 变宽笔画 → 闭合轮廓（w 可为数或沿长度的函数 u→宽）
export function strokeOutline(pts, w, closed = false) {
  const s = sample(pts, closed, 1.2), n = s.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
    const u = i / (n - 1), hw = (typeof w === 'function' ? w(u) : w) / 2;
    L.push([s[i][0] - dy * hw, s[i][1] + dx * hw]); R.push([s[i][0] + dy * hw, s[i][1] - dx * hw]);
  }
  return L.concat(R.reverse());
}
// 常用笔宽：两端尖、中间粗；起笔重收笔轻
export const taper = (w, a = 0.25, b = 0.25) => u => w * Math.min(1, u / a, (1 - u) / b, 1) ** 0.7;
export const press = (w, lead = 0.15) => u => w * Math.min(1, u / lead) ** 0.6 * (1 - u * 0.75);
