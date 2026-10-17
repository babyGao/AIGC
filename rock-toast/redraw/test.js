// 实拍 → 手绘重绘对比：?style=impasto|woodcut|silent&f=syrup|soak|fork
// 底稿是已调成暗场的原片帧；三个引擎都按底稿的明暗、颜色、纹理走向重新画，不是叠滤镜
import { Impasto, KNIFE, BRUSH, POST_DEFAULT } from './engines/impasto/impasto.js';
import { Ref, paintRef } from './engines/impasto/plate.js';
import * as WC from './engines/woodcut/index.js';
import { Redraw } from './engines/silent/redraw.js';
import { FilmPost } from './engines/silent/film.js';

const Q = new URLSearchParams(location.search);
const STYLE = Q.get('style') || 'impasto', NAME = Q.get('f') || 'syrup';
const W = innerWidth, H = innerHeight;
const glc = document.getElementById('gl'), c2 = document.getElementById('c2');
c2.width = W; c2.height = H; const g = c2.getContext('2d');
const load = src => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; });
const pixels = (im, w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, w, h); return { c, d: x.getImageData(0, 0, w, h).data }; };
const num = (k, d) => Q.has(k) ? +Q.get(k) : d;

window.DUR = 1;
(async () => {
  const img = await load(`frames/${NAME}.jpg`);
  let draw;
  if (STYLE === 'impasto') {
    // —— 油画厚涂：底稿 → 参考图 → 由粗到细的刮刀笔触（食物 / 背景分区，笔触不跨区）——
    c2.style.display = 'none';
    const grp = pixels(await load(`frames/${NAME}_grp.png`));
    const ref = new Ref(W, H, 1);
    ref.ctx.drawImage(img, 0, 0, W, H);
    const kBg = ref._id({ dir: 'edge', fallback: -25, maxR: num('bgR', 44), type: KNIFE, detail: num('bgD', 2.4), jit: .05, aj: .5, group: 'bg' });
    const kFood = ref._id({ dir: 'edge', fallback: 70, follow: 3, maxR: num('fR', 24), type: KNIFE, detail: num('fD', .75), jit: .06, aj: .35, group: 'food' });
    const id = ref.idc.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { const k = grp.d[i * 4] > 127 ? kFood : kBg; id.data[i * 4] = k; id.data[i * 4 + 3] = 255; }
    ref.idc.putImageData(id, 0, 0);
    const R = (Q.get('R') || '40,20,10,5,2.6').split(',').map(Number);
    const st = paintRef(ref, { R, T: num('T', 12), seed: 7 });
    const E = new Impasto(glc, { W, H, ss: num('ss', 2) });
    const b = E.batch(st.data()), tex = E.texture(ref.ctx.canvas, 2);
    const ground = [.035, .03, .028];
    console.log('impasto strokes', st.n);
    draw = () => {
      E.begin(ground);
      E.under(tex, W, H, { grey: 0 });
      E.draw(b, { grey: 0, t: 1, hgt: num('hgt', 1) });
      E.finish({ ...POST_DEFAULT, ground, light: [-.5, -.7, .6], norm: num('norm', 3.6), dif: .3, spec: num('spec', .22), amb: .82, vig: .12, weave: .06, sat: 1.05 });
    };
  } else if (STYLE === 'woodcut') {
    // —— 木刻：明暗定刀宽、纹理走向定刀向；黑版 + 一块点缀色版 ——
    glc.style.display = 'none';
    const [Mc, m] = WC.canvas(W, H), [Cc, c] = WC.canvas(W, H);
    const F = WC.woodcutFilter(img, { rect: [0, 0, W, H], res: 3, sp: num('sp', 7), black: num('blk', .05), white: num('wht', .72), gamma: .85, tensor: 4, coh: 1.2 });
    m.fillStyle = '#000'; m.fillRect(0, 0, W, H); WC.drawStrokes(m, F.strokes, { t: 1e9 });
    const acc = await load(`frames/${NAME}_accent.png`);
    c.drawImage(acc, 0, 0, W, H);
    const id = c.getImageData(0, 0, W, H); for (let i = 0; i < W * H; i++) { id.data[i * 4 + 3] = id.data[i * 4]; } c.putImageData(id, 0, 0);
    const P = WC.makePrinter(W, H);
    const plate = NAME === 'soak' ? '#E3A21A' : '#5E2A72';
    console.log('woodcut cuts', F.strokes.length);
    draw = () => { const out = P.render(Mc, Cc, { seed: 3, inkSeed: 5, plate, paper: '#EDE4D0', ink: '#141210', reg: [3, 2] }); g.drawImage(out, 0, 0); };
  } else {
    // —— 默片墨线：轮廓墨线 + 5 档水墨灰 + 暗部排线，再印到银盐胶片上 ——
    glc.style.display = 'none';
    const rd = new Redraw(W, H), fp = new FilmPost(W, H);
    draw = () => {
      const ink = rd.render(img, { frame: 0, bilateral: num('bil', 2), p: num('p', 34), eps: num('eps', .24), levels: num('lv', 5), gap: num('gap', 6), sigma: num('sig', 1.3),
        gamma: num('gam', 1), contrast: num('con', 1.08), washDark: num('wd', .34), h1: num('h1', .42), h2: num('h2', .6), h3: num('h3', .8) });
      const out = fp.render(ink, { frame: 0, strength: .35, sepia: .3 });
      g.drawImage(out, 0, 0);
    };
  }
  window.render = () => draw();
  window.READY = true;
})();
