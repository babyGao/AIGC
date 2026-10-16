// K1 开场超远景：?lab=k1&style=woodcut|puppet|ink|spy
import { K1, FW, FH } from '../shared/scene.js';
import * as CARRY from '../shared/models/carry.js';
import * as MLQ from '../shared/models/maoliqiu.js';
import { standing } from '../shared/models/crowd.js';
import { flatten, flattenLayers, mkXf } from '../shared/models/flatten.js';
import { placer } from '../shared/models/profile.js';
const R = {};
export async function init(cv, q) {
  const st = q.get('style') || 'woodcut';
  R.st = st;
  R.mod = await import(`../${st}/k1.js`);
  if (R.mod.init) await R.mod.init(cv, q);
}
// 场景里所有人物：画面指令 + 尺度
export function cast(F) {   // F: 局部坐标 → 画面坐标（含缩放 k）
  const k = F.k, out = {};
  const fit = (M, at, H, flip = false) => { const [x0, y0, x1, y1] = M.box, s = H / (y1 - y0); return { xf: mkXf({ s, from: [M.feet ? M.feet[0] : (x0 + x1) / 2, y1], at, flip }), s }; };
  // 方源：脚底对到河头
  { const M = CARRY.FY_CARRY2, H = K1.fangyuan.H * k, s = H / 875, at = F.p(K1.fangyuan.at); const xf = mkXf({ s, from: [445, 955], at }); out.fy = { ops: flatten(M, CARRY, xf), s, at, H }; }
  { const M = MLQ.MLQ_SIDE, H = K1.maoliqiu.H * k, { xf, s } = fit(M, F.p(K1.maoliqiu.at), H); out.mlq = { ops: flatten(M, MLQ, xf), s }; }
  const crowd = list => list.map(c => { const T = placer(F.p(c.at), c.H * k); return { ops: flattenLayers({ layers: standing(c.o, T) }, p => p), s: c.H * k / 875 }; });
  out.beiyuan = crowd(K1.beiyuan); out.zhongzhou = crowd(K1.zhongzhou); out.changsheng = crowd(K1.changsheng);
  return out;
}
export function render(cv, t, q) { R.mod.render(cv, t, q, { K1, FW, FH, cast }); }
