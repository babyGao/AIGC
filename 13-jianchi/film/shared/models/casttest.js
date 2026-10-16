import * as C from './cast.js';
import { flattenLayers, mkXf } from './flatten.js';
// 把 6 个胸像缩放后排成一行，做成一个 layers 母版供预览
const names = ['ZLY_CRY', 'BNB_LAUGH', 'HLL_ROAR', 'YWX_GRIT', 'BCT_FROWN', 'XH_SIDE'];
const layers = [];
names.forEach((n, i) => {
  const M = C[n], [x0, y0, x1, y1] = M.box, s = 380 / (y1 - y0), xf = mkXf({ s, from: [x0, y0], at: [20 + i * 360, 20] });
  for (const L of M.layers) {
    if (L.fill) layers.push({ ...L, pts: L.pts.map(xf) });
    else if (L.lock) layers.push({ ...L, lock: { a: L.lock.a.map(xf), b: L.lock.b.map(xf) }, sw: (L.sw || .6) * s });
    else if (L.line) layers.push({ ...L, line: L.line.map(xf), w: L.w * s });
    else if (L.eye) layers.push({ eye: { ...L.eye, up: L.eye.up.map(xf), low: L.eye.low.map(xf), iris: [...xf(L.eye.iris), L.eye.iris[2] * s] } });
  }
});
export const CT = { box: [0, 0, 2180, 420], layers };
