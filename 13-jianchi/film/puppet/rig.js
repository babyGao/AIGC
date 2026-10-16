// 皮影关节骨架的公用小工具（照 lemo-opuscar 皮影 demo 的 houyi.js：2D 仿射矩阵、两段 IK、操纵杆）
// 矩阵 [a,b,c,d,e,f] 同 canvas setTransform；旋转弧度，正 = 顺时针（y 向下）
export const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
export const T = (x, y) => [1, 0, 0, 1, x, y];
export const R = a => { const c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; };
export const S = (kx, ky = kx) => [kx, 0, 0, ky, 0, 0];
export const ap = (M, x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
export const set = (g, M) => g.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
// 矩阵的世界朝向（y 轴向下时，一根 0 = 下垂的骨头在世界里的转角）
export const angOf = M => Math.atan2(M[1], M[0]);

// 两段 IK：肩 s（世界）→ 目标 p（世界），L1/L2 段长；返回两段的世界转角（0 = 下垂）。bend ±1 = 肘弯方向
export function ik(s, p, L1, L2, bend = 1) {
  let dx = p[0] - s[0], dy = p[1] - s[1], d = Math.hypot(dx, dy);
  d = Math.max(Math.abs(L1 - L2) + 1, Math.min(L1 + L2 - .3, d));
  const phi = Math.atan2(dy, dx), al = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
  const a1 = phi + bend * al, e = [s[0] + Math.cos(a1) * L1, s[1] + Math.sin(a1) * L1];
  const a2 = Math.atan2(p[1] - e[1], p[0] - e[0]);
  return [a1 - Math.PI / 2, a2 - Math.PI / 2];
}

// 操纵杆：离布的竹杆，虚、半透明（屏幕坐标）；ends = 杆尾（艺人手里）
export function drawRods(g, pts, ends, blur = 2.5, alpha = .62) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.filter = `blur(${blur}px)`; g.globalAlpha = alpha;
  pts.forEach((p, i) => {
    const e = ends[i]; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(e[0], e[1]); g.strokeStyle = '#2a1a10'; g.lineWidth = i === 0 ? 4.2 : 2.8; g.stroke();
    g.beginPath(); g.arc(p[0], p[1], i === 0 ? 4 : 3, 0, Math.PI * 2); g.fillStyle = '#2a1a10'; g.fill();
  });
  g.restore();
}
