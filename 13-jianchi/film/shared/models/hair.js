// 发绺：两条边线 a、b（发根→发梢，点数相同）。lockPoly 给出整绺的闭合轮廓，lockStrands 给出绺内发丝。
import { sample } from './curve.js';

export function resample(pts, K, closed = false) {
  const s = sample(pts, closed, 1), L = [0];
  for (let i = 1; i < s.length; i++) L.push(L[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
  const T = L[L.length - 1] || 1, out = []; let j = 0;
  for (let k = 0; k < K; k++) {
    const d = T * k / (K - 1); while (j < L.length - 2 && L[j + 1] < d) j++;
    const u = (d - L[j]) / ((L[j + 1] - L[j]) || 1);
    out.push([s[j][0] + (s[j + 1][0] - s[j][0]) * u, s[j][1] + (s[j + 1][1] - s[j][1]) * u]);
  }
  return out;
}
export function lockPoly(lk, K = 60) {
  const A = resample(lk.a, K), B = resample(lk.b, K);
  return A.concat(B.reverse());
}
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917)) >>> 0) / 4294967296; }
// 发丝：在两边线之间按比例插值，起止随机，略带抖动
export function lockStrands(lk, n = 8, seed = 7, K = 60) {
  const A = resample(lk.a, K), B = resample(lk.b, K), r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5 + (r() - 0.5) * 0.6) / n, t0 = Math.floor(r() * K * 0.35), t1 = Math.floor(K * (0.55 + r() * 0.45)), wob = (r() - 0.5) * 0.08;
    const line = [];
    for (let k = t0; k < t1; k++) { const g = Math.min(1, Math.max(0, f + wob * Math.sin(k / K * 6.3 + i))); line.push([A[k][0] + (B[k][0] - A[k][0]) * g, A[k][1] + (B[k][1] - A[k][1]) * g]); }
    if (line.length > 3) out.push(line);
  }
  return out;
}
// 发绺中线与半宽（水墨顺着发流写一笔用）
export function lockAxis(lk, K = 40) {
  const A = resample(lk.a, K), B = resample(lk.b, K);
  return A.map((p, i) => [(p[0] + B[i][0]) / 2, (p[1] + B[i][1]) / 2, Math.hypot(p[0] - B[i][0], p[1] - B[i][1])]);
}
