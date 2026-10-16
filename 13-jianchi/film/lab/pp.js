// 皮影新版试验页：?lab=pp&test=model | frame&f=...  （照 lemo-opuscar 皮影 demo 的 test.js）
import { makeGL } from '../puppet/gl.js';
import { canvas } from '../puppet/carve.js';
const R = {};
export async function init(cv, q) {
  R.T = await import('../puppet/test.js'); await R.T.loadRef();
  [R.trc, R.tr] = canvas(1920, 1080); [R.frc, R.fr] = canvas(1920, 1080); [R.lmc, R.lm] = canvas(1920, 1080);
  R.glc = Object.assign(document.createElement('canvas'), { width: 1920, height: 1080 }); R.GL = makeGL(R.glc);
}
export function render(cv, t, q) {
  const test = q.get('test') || 'model';
  const o = test === 'model' ? R.T.modelSheet(R.tr, R.fr, R.lm, q) : test === 'head' ? R.T.headSheet(R.tr, R.fr) : R.T.styleFrame(R.tr, R.fr, q.get('f') || 'walk', t, q);
  R.GL.render(R.trc, R.frc, { time: t, ...o }, o.useMap ? R.lmc : undefined);
  cv.getContext('2d').drawImage(R.glc, 0, 0);
}
