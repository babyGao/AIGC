// 关键镜头试验：?lab=shot&shot=K2&style=woodcut|puppet|ink|spy
// 某风格有自己的调度（如皮影只能侧身）就用 SHOTS[`${id}_${style}`]
import { SHOTS } from '../shared/shots.js';
const R = {};
export async function init(cv, q) { R.mod = await import(`../${q.get('style') || 'woodcut'}/shots.js`); if (R.mod.init) await R.mod.init(cv, q); }
export function render(cv, t, q) { const id = q.get('shot') || 'K2', st = q.get('style') || 'woodcut'; R.mod.render(cv, (SHOTS[id + '_' + st] || SHOTS[id])(), { id, t }); }
