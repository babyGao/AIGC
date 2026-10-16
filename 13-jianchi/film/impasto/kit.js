// 画板与镜头的公用件：原样取自 lemo-opuscar impasto demo 的 film.js（plate / flush / 仿射 / 关键帧 / 两种调子）
import { Impasto, Strokes } from './engine/impasto.js';
import { lerp, eio } from './scenes/common.js';

export const W = 1920, H = 1080, NEVER = 1e6;
// affine [a,b,c,d,e,f]: x' = a x + c y + e, y' = b x + d y + f
export const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
export const TR = (x, y) => [1, 0, 0, 1, x, y], SC = (s, sy = s) => [s, 0, 0, sy, 0, 0], RO = a => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
export const about = (px, py, a) => mul(TR(px, py), mul(RO(a), TR(-px, -py)));
export const key = (t, ks) => { if (t <= ks[0][0]) return ks[0][1]; for (let i = 0; i < ks.length - 1; i++) { const [t0, v0, e] = ks[i], [t1, v1] = ks[i + 1]; if (t < t1) { const k = (e || eio)((t - t0) / (t1 - t0)); return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : lerp(v0, v1, k); } } return ks[ks.length - 1][1]; };
export const ap = (M, x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];

// 调子（同 demo 的 POST）
export const POST = {
  grey: { expo: 1.0, sat: 1, contrast: 1.04, vig: .3, spec: .3, shin: 26, lift: [.02, .02, .03] },
  warm: { expo: 1.02, sat: 1.06, contrast: 1.04, vig: .26, spec: .26, shin: 26 },
};

export let E, dyn;
export function initEngine(canvas) { E = new Impasto(canvas); dyn = new Strokes(16384); return E; }
// 上传一块已画好的板：笔触批 + 底稿纹理（薄底色）
export const up = (built, w, h, ox = 0, oy = 0) => ({ b: E.batch(built.strokes.data()), tex: E.texture(built.ref.ctx.canvas), w, h, ox, oy });
// 画一块板（先薄底色，再刀笔）
export function plate(pl, o) {
  const M = o.M || [1, 0, 0, 1, 0, 0];
  const Mu = mul(M, TR(-pl.ox, -pl.oy));
  const inTrans = o.appear !== undefined && o.t < o.appear + (o.appDur ?? .5);
  const ua = o.appear === undefined ? 1 : Math.max(0, Math.min(1, (o.t - (o.appear + (o.appDur ?? .5) * .55)) / ((o.appDur ?? .5) * .45)));
  if (!o.noUnder && ua > 0) E.under(pl.tex, pl.w, pl.h, { ...o, M: Mu, alpha: (o.alpha ?? 1) * ua, revC: o.revC });
  E.draw(pl.b, { ...o, M, appear: inTrans ? o.appear : -1e6, appDur: .14 });
}
export const flush = (o) => { if (dyn.n) E.drawNow(dyn.data(), o); dyn.clear(); };
