// 关键镜头试验：?lab=shot&shot=K2&style=woodcut|puppet|ink|spy
import { SHOTS } from '../shared/shots.js';
const R = {};
export async function init(cv, q) { R.mod = await import(`../${q.get('style') || 'woodcut'}/shots.js`); if (R.mod.init) await R.mod.init(cv, q); }
export function render(cv, t, q) { const id = q.get('shot') || 'K2'; R.mod.render(cv, SHOTS[id](), { id, t }); }
