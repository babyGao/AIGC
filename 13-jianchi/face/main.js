// 方源正脸试验页：?view=cmp（厚涂彩色 | 参考图）| grey（厚涂灰调 | 参考图）| ref（平涂底稿 | 参考图）
// 页面暴露 window.READY / window.render(t)，用 lemo-opuscar 的 core/render/still.mjs 渲静帧
import { Impasto } from './engine/impasto.js';
import { loadFront, buildFace, buildBackdrop } from './face.js';
const q = new URLSearchParams(location.search), view = q.get('view') || 'cmp';
const cv = document.getElementById('c'), E = new Impasto(cv);
const D = await loadFront(), built = buildFace(D);
const pl = { b: E.batch(built.strokes.data()), tex: E.texture(built.ref.ctx.canvas) };
const bd = buildBackdrop(960, 1080), bg = { b: E.batch(bd.strokes.data()), tex: E.texture(bd.ref.ctx.canvas) };
// 右边放参考图（同样大小）
const S = 1040 / D.h, X0 = 960 - D.w * S - 20, Y0 = 20;
const img = Object.assign(document.createElement('canvas'), { width: 960, height: 1080 });
img.style.cssText = 'position:fixed;left:960px;top:0'; document.body.appendChild(img);
const ref = new Image(); ref.src = 'data/ref_front.png'; await ref.decode();
const g = img.getContext('2d'); g.fillStyle = '#ececec'; g.fillRect(0, 0, 960, 1080); g.imageSmoothingQuality = 'high';
g.drawImage(ref, 20, Y0, D.w * S, D.h * S);
if (view === 'ref') { const o = Object.assign(document.createElement('canvas'), { width: 960, height: 1080 }); o.style.cssText = 'position:fixed;left:0;top:0'; document.body.appendChild(o);
  const h = o.getContext('2d'); h.fillStyle = '#8c8c98'; h.fillRect(0, 0, 960, 1080); h.drawImage(built.ref.ctx.canvas, X0, Y0, D.w * S, D.h * S); }
const POST = { grey: { expo: 1.0, sat: 1, contrast: 1.04, vig: .3, spec: .3, shin: 26, lift: [.02, .02, .03] }, warm: { expo: 1.02, sat: 1.06, contrast: 1.04, vig: .26, spec: .26, shin: 26 } };
window.render = t => {
  const grey = view === 'grey' ? 1 : 0, M = [S, 0, 0, S, X0, Y0], o = { t, M, grey, reveal: grey ? 1e6 : -1e6 };
  E.begin([.62, .62, .66]);
  E.under(bg.tex, 960, 1080, { ...o, M: [1, 0, 0, 1, 0, 0] }); E.draw(bg.b, { ...o, M: [1, 0, 0, 1, 0, 0] });
  E.under(pl.tex, D.w, D.h, { ...o });
  E.draw(pl.b, o);
  E.finish(grey ? POST.grey : POST.warm);
};
window.DUR = 1; window.READY = true;
