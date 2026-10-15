// 方源造型试验：?lab=fy&style=woodcut|puppet|ink|spy → 同一组母版在四种风格里的样子
import * as FY from '../shared/models/fangyuan.js';
import { flatten, mkXf } from '../shared/models/flatten.js';
const R = {};
export async function init(cv, q) {
  const st = q.get('style') || 'woodcut';
  if (st === 'woodcut') { R.wc = await import('../woodcut/engine/index.js'); R.fig = await import('../woodcut/figure.js'); }
  if (st === 'puppet') { R.K = await import('../puppet/carve.js'); R.gl = await import('../puppet/gl.js'); R.fig = await import('../puppet/figure.js'); }
  if (st === 'ink') { R.comp = await import('../ink/comp.js'); R.fig = await import('../ink/figure.js'); }
  if (st === 'spy') { R.P = await import('../spy/paper.js'); R.fig = await import('../spy/figure.js'); }
}
const fit = (M, cx, top, H, flip = false) => { const [x0, y0, x1, y1] = M.box, s = H / (y1 - y0); return { xf: mkXf({ s, from: [(x0 + x1) / 2, y0], at: [cx, top], flip }), s }; };
const SHEETS = {
  woodcut: [['FULL_FRONT', 300, 70, 960], ['FULL_SIDE', 720, 70, 960], ['FACE_FRONT', 1420, 60, 1180]],
  ink: [['FULL_FRONT', 300, 70, 960], ['FULL_SIDE', 720, 70, 960], ['FACE_FRONT', 1420, 60, 1180]],
  spy: [['FULL_FRONT', 300, 70, 960], ['FULL_SIDE', 720, 70, 960], ['FACE_FRONT', 1420, 60, 1180]],
  puppet: [['FULL_SIDE', 520, 60, 980], ['FACE_SIDE', 1320, 70, 1150]],
};
export function render(cv, t, q) {
  const g = cv.getContext('2d'), W = 1920, H = 1080, st = q.get('style') || 'woodcut';
  const figs = SHEETS[st].map(([name, cx, top, hh]) => { const M = FY[name], { xf, s } = fit(M, cx, top, hh); return { name, ops: flatten(M, FY, xf), s }; });
  if (st === 'woodcut') {
    const WC = R.wc, [mask, m] = WC.canvas(W, H), [plate] = WC.canvas(W, H), P = R.P || (R.P = WC.makePrinter(W, H));
    m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
    for (const f of figs) R.fig.carveFigure(m, f.ops, { key: f.name, scale: f.s });
    g.drawImage(P.render(mask, plate, { mode: 'print', seed: 3 }), 0, 0);
  }
  if (st === 'puppet') {
    const [trc, tr] = R.K.canvas(W, H), [fc] = R.K.canvas(W, H);
    tr.fillStyle = '#fff'; tr.fillRect(0, 0, W, H);
    for (const f of figs) R.fig.puppetFigure(tr, f.ops, { scale: f.s, seed: 3 });
    const glc = R.glc || (R.glc = Object.assign(document.createElement('canvas'), { width: W, height: H }));
    const GL = R.GL || (R.GL = R.gl.makeGL(glc));
    GL.render(trc, fc, { lamps: [[700, 380, .75, 1], [1350, 340, .7, 1]], expo: 1.05, amb: .22, time: 1.3, bloom: .22, vign: .5 });
    g.drawImage(glc, 0, 0);
  }
  if (st === 'ink') {
    const L = R.L || (R.L = R.comp.layerSet(W, H)); L.clear();
    for (const f of figs) R.fig.inkFigure(L, f.ops, { key: f.name, scale: f.s });
    const glc = R.glc || (R.glc = Object.assign(document.createElement('canvas'), { width: W, height: H }));
    const comp = R.CP || (R.CP = R.comp.makeComp(glc));
    comp(L, null, { bleed: 5, rim: .8 });
    g.drawImage(glc, 0, 0);
  }
  if (st === 'spy') {
    const P = R.P, F = R.fig;
    P.clear(F.PAL.teal);
    for (const f of figs) F.spyFigure(f.ops, { key: f.name, scale: f.s, closeup: f.name.startsWith('FACE') });
    P.paperFinish(1);
  }
}
