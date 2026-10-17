// 油画厚涂关键帧（静帧）：?s=s01
// 背景层（新画暗场）+ 主体层（原片取色，杂物下笔时盖掉）+ 提白 + 细流 → 厚涂光照
import { Impasto, POST_DEFAULT } from './impasto.js';
import { W, H, load, pixels, subjectPlan, applyAdds, paintBackdrop, paintSubject, highlights, lines } from './frame.js';
import { POST, GROUND } from './look.js';

const Q = new URLSearchParams(location.search);
const S = Q.get('s') || 's01';
window.DUR = 1;
(async () => {
  const K = (await (await fetch('keys.json')).json())[S]; if (!K) throw new Error('no shot ' + S);
  const names = ['raw', 'lab', 'valid', 'rim', 'hi', 'ao', 'spec'];
  const ims = await Promise.all(names.map(n => load(`keys/${S}_${n}.png`).catch(() => null)));
  const [raw, L, V, RIM, HI, AO, SPEC] = ims.map(im => im ? pixels(im) : null);
  const P = subjectPlan(K, { raw, L, V, RIM, HI, AO });
  applyAdds(K, P);
  const bg = paintBackdrop(K), sub = paintSubject(K, P, K.seed ?? 7);
  if (SPEC) highlights(sub.strokes, SPEC, P);
  for (const ln of K.lines || []) lines(sub.strokes, K, ln.pts, ln);
  const E = new Impasto(document.getElementById('gl'), { W, H, ss: 2 });
  const tex = c => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').putImageData(new ImageData(c, W, H), 0, 0); return cv; };
  const bB = E.batch(bg.strokes.data()), bT = E.texture(tex(bg.layin), 14);
  const sB = E.batch(sub.strokes.data()), sT = E.texture(tex(sub.layin), 2);
  console.log('strokes bg', bg.strokes.n, 'subject', sub.strokes.n);
  window.render = () => {
    E.begin(GROUND);
    E.under(bT, W, H, { grey: 0 }); E.draw(bB, { grey: 0, t: 1, hgt: 1 });
    E.under(sT, W, H, { grey: 0 }); E.draw(sB, { grey: 0, t: 1, hgt: 1.3 });
    E.finish({ ...POST_DEFAULT, ...POST, ground: GROUND });
  };
  window.READY = true;
})().catch(e => { console.error(e); throw e; });
