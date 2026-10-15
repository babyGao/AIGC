// 母版 → 按绘制顺序排好的一串“画面指令”（已变换到画面坐标、已平滑成密集点列）。
// 各风格只管怎么画每种指令：木刻刻、皮影镂、水墨写、剪纸剪。
//   op = { role, poly } 填色区；role: hair | robe | robeIn | collar | skin | shade | ink
//      | { role:'eye', open, iris:[cx,cy,r] } | { role:'line', pts, w, dark, key } | { role:'strand', pts, w }
import { sample } from './curve.js';
import { lockPoly, lockStrands, lockAxis } from './hair.js';

const FACE_KEYS = k => !/^(lapel|shoulder|neckR)/.test(k);
// 变换：s 缩放、rot 旋转（弧度）、at 目标点、from 母版中的对位点
export const mkXf = ({ s = 1, rot = 0, at = [0, 0], from = [0, 0], flip = false }) => {
  const c = Math.cos(rot), n = Math.sin(rot), fx = flip ? -1 : 1;
  return p => { const x = (p[0] - from[0]) * s * fx, y = (p[1] - from[1]) * s; return [at[0] + x * c - y * n, at[1] + x * n + y * c]; };
};
const T = (xf, pts) => pts.map(xf);

export function flatten(M, lib, xf, o = {}) {
  const ops = [], S = (pts, closed) => sample(pts, closed, o.step ?? 1.5);
  const scale = Math.hypot(...((a, b) => [b[0] - a[0], b[1] - a[1]])(xf([0, 0]), xf([1, 0])));
  const fillOp = (role, pts, extra = {}) => ops.push({ role, poly: T(xf, S(pts, true)), ...extra });
  const lockOps = (lk, n, seed, role = 'hair') => {
    ops.push({ role, poly: T(xf, lockPoly(lk)), lock: true, axis: lockAxis(lk).map(p => [...xf(p), p[2] * scale]) });
    for (const s of lockStrands(lk, n, seed)) ops.push({ role: 'strand', pts: T(xf, s), w: 0.45 * scale });
  };
  const lineOp = (k, [pts, w, dark], X = xf, sc = scale) => ops.push({ role: 'line', key: k, pts: T(X, S(pts, false)), w: w * sc, dark });
  const L = M.locks || {};

  (L.back || []).forEach((lk, i) => lockOps(lk, 7, 11 + i));
  if (M.skirt) fillOp('robe', M.skirt, { part: 'skirt' });
  if (M.torso) fillOp('robe', M.torso, { part: 'torso' });
  (M.sleeves || []).forEach((s, i) => fillOp('robe', s, { part: 'sleeve' + i }));
  for (const c of M.cuffs || []) fillOp('robeIn', c);
  if (M.robe) fillOp('robe', M.robe, { part: 'torso' });
  for (const c of M.collarIn || []) fillOp('collar', c);
  if (M.neck) fillOp('skin', M.neck, { part: 'neck' });
  if (M.sash) fillOp('ink', M.sash, { part: 'sash' });
  if (M.knot) fillOp('ink', M.knot, { part: 'knot' });
  for (const t of M.tails || []) ops.push({ role: 'line', key: 'tail', pts: T(xf, S(t, false)), w: 6 * scale, dark: 1 });
  for (const s of M.shoes || []) fillOp('ink', s, { part: 'shoe' });
  if (M.head) for (const [k, v] of Object.entries(M.lines || {})) lineOp(k, v);

  const face = (F, X, sc, keys, withBack) => {
    const f = (role, pts, extra = {}) => ops.push({ role, poly: T(X, S(pts, true)), ...extra });
    const lk = (l, n, seed) => { ops.push({ role: 'hair', poly: T(X, lockPoly(l)), lock: true, axis: lockAxis(l).map(p => [...X(p), p[2] * sc]) }); for (const s of lockStrands(l, n, seed)) ops.push({ role: 'strand', pts: T(X, s), w: 0.45 * sc }); };
    if (withBack) ((F.locks || {}).back || []).forEach((l, i) => lk(l, 7, 61 + i));
    if (F.ear && !F.earOver) f('skin', F.ear, { part: 'ear' });
    if (F.skin) f('skin', F.skin, { part: 'face' });
    for (const sh of F.shade || []) f('shade', sh);
    for (const e of F.eyes || []) ops.push({ role: 'eye', open: T(X, S(e.up.concat(e.low.slice().reverse()), true)), iris: [...X([e.iris[0], e.iris[1]]), e.iris[2] * sc] });
    for (const [k, v] of Object.entries(F.lines || {})) if (keys(k)) lineOp(k, v, X, sc);
    (F.side || []).forEach((l, i) => lk(l, 4, 71 + i));
    if (F.ear && F.earOver) f('skin', F.ear, { part: 'ear' });
    ((F.locks || {}).front || []).forEach((l, i) => lk(l, 3, 31 + i));
  };
  if (M.head) {
    const { src, from, at, s, clipY, withBack } = M.head, F = lib[src];
    const X = p => xf([at[0] + (p[0] - from[0]) * s, at[1] + (p[1] - from[1]) * s]);
    const n0 = ops.length;
    face(F, X, scale * s, FACE_KEYS, withBack);
    if (clipY != null) { const cy = xf([0, clipY])[1]; for (let i = n0; i < ops.length; i++) ops[i].clipY = cy; }
  } else face(M, xf, scale, () => true, false);
  (L.over || []).forEach((lk, i) => lockOps(lk, 6, 51 + i));
  if (M.head) (L.front || []).forEach((lk, i) => lockOps(lk, 3, 41 + i));
  (L.stray || []).forEach((lk, i) => ops.push({ role: 'hair', poly: T(xf, lockPoly(lk)), lock: true, axis: lockAxis(lk).map(p => [...xf(p), p[2] * scale]) }));
  return ops;
}

// 整个人的外轮廓（所有填色区的并集用于光晕/投影时，直接拿这些多边形一起画即可）
export const silhouette = ops => ops.filter(o => o.poly && o.role !== 'shade').map(o => o.poly);
