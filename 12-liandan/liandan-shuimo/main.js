// 页面入口：装字体、建合成器与三套画布，按模式分发（正片 / 设计稿）
import { makeComp, layerSet } from './engine/comp.js';
const q = new URLSearchParams(location.search);
const comp = makeComp(document.getElementById('c'));
const A = layerSet(), B = layerSet(), TMP = layerSet();
await document.fonts.load('40px MaShanZheng', '丹');
await document.fonts.load('40px WenKai', '丹');
const mode = q.get('test');
if (mode) {
  const mod = await import('./test.js');
  window.DUR = 1;
  window.render = t => mod.render(t, A, B, TMP, comp, mode, q);
} else {
  const F = await import('./film.js');
  await F.init(A, B, TMP);
  window.DUR = F.DUR;
  window.EV = F.events();
  window.TEXTS = F.texts;
  window.render = t => F.render(t, A, B, TMP, comp, q);
}
window.READY = true;
