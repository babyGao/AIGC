// 小工具：镜头（世界 → 屏幕）、时间段、一拍二
import { clamp, lerp, ss, eio, eo, ei } from '/core/lib.js';
export { clamp, lerp, ss, eio, eo, ei };
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const t12 = t => Math.floor(t * 12) / 12;            // 人物一拍二（12 fps）
// 镜头：把世界点 (cx, cy) 放在屏幕中心，缩放 z；rot 绕屏幕中心旋转。返回合成器的纸纹偏移（纸跟着世界走）
export function cam(A, cx, cy, z = 1, rot = 0) {
  const tx = 960 - cx * z, ty = 540 - cy * z;
  A.xf(z, tx, ty, rot);
  return { paper: [-tx, -ty, z], z, tx, ty, w2s: (x, y) => [x * z + tx, y * z + ty] };
}
// 关键帧插值：keys = [[t, v], ...]（v 可以是数或数组），ease = 'eio' | 'lin' | 'ss'
export function key(t, keys, ease = 'eio') {
  const E = ease === 'lin' ? (x => x) : ease === 'ss' ? ss : eio;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va] = keys[i], [b, vb] = keys[i + 1];
    if (t <= b) { const u = E((t - a) / (b - a)); return Array.isArray(va) ? va.map((x, j) => lerp(x, vb[j], u)) : lerp(va, vb, u); }
  }
  return keys[keys.length - 1][1];
}
// 一个 0→1→0 的包络
export const env = (t, a, b, fi = .3, fo = .3) => Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b));
// 跳：从 a 到 b 的抛物线（h 为高度），u 0..1
export const hop = (a, b, h, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - Math.sin(Math.PI * clamp(u)) * h];
