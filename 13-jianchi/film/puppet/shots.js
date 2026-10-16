// 皮影 · 关键镜头的通用画法。近景镜头把宽银幕画面铺满幕布（上下贴边，左右裁一点）。
// 黑底爆发格 = 一整张染深的驴皮“景片”：中间剪开一个星形口子让人露出来，四周剪出放射的长条缝（灯从缝里透出 = 集中线）；
// 拟声字直接从景片上剪透，字里留斜向的皮筋（不留就掉了），再衬一层染红的薄皮 → 发红光的大字；
// 音浪 = 染红的锯齿皮条；碎屑 = 染金的小皮片；人物照常是铆接的皮影。字幕 = 台口挂的说书牌（漆红底金字）。
import * as K from './carve.js';
import { makeGL } from './gl.js';
import { puppetFigure } from './figure.js';
import { CLOTH, front } from './k1.js';
import { mulberry } from '/core/lib.js';
const R = {};
const W = 1920, H = 1080;
const k = (CLOTH[2] - CLOTH[0]) / 1920, OX = CLOTH[0], OY = (CLOTH[1] + CLOTH[3]) / 2 - 402 * k;   // 宽银幕整幅放进幕布（上下各留一条，黑底格被景片盖住）
const X = ([x, y]) => [x * k + OX, y * k + OY];
const path = P => q => { q.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) q.lineTo(P[i][0], P[i][1]); q.closePath(); };
// 画面指令从局部坐标搬到幕布坐标
function xfOps(ops) {
  return ops.map(op => {
    const o = { ...op };
    for (const f of ['poly', 'pts', 'open']) if (op[f]) o[f] = op[f].map(X);
    if (op.axis) o.axis = op.axis.map(p => [...X(p), p[2] * k]);
    if (op.iris) o.iris = [...X(op.iris), op.iris[2] * k];
    if (op.clipY != null) o.clipY = op.clipY * k + OY;
    if (op.w != null) o.w = op.w * k;
    return o;
  });
}
function glyphPath(g, e) {   // 拟声字的字形（幕布坐标）
  g.save(); const [x, y] = X([e.x, e.y]); g.translate(x, y); g.rotate(e.rot || 0); g.font = `900 ${e.size * k}px NS`; g.textBaseline = 'alphabetic';
  return () => g.restore();
}
function placard(cap) {
  return g => {
    g.save(); g.font = '44px WK'; const tw = g.measureText(cap.text).width; g.font = '26px WK'; const ww = g.measureText(cap.who).width;
    const bw = tw + ww + 120, x0 = 960 - bw / 2, y0 = CLOTH[3] + 14, bh = 74;
    // 两根挂绳
    g.strokeStyle = '#8a5a2a'; g.lineWidth = 3; for (const x of [x0 + 30, x0 + bw - 30]) { g.beginPath(); g.moveTo(x, CLOTH[3] + 2); g.lineTo(x, y0 + 4); g.stroke(); }
    g.fillStyle = '#5e1810'; g.fillRect(x0, y0, bw, bh);
    g.strokeStyle = '#c9963a'; g.lineWidth = 3; g.strokeRect(x0 + 6, y0 + 6, bw - 12, bh - 12);
    g.fillStyle = '#e8c27a'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = '26px WK'; g.fillText(cap.who, x0 + 30, y0 + bh / 2 + 2);
    g.fillStyle = '#c9963a'; g.fillRect(x0 + 44 + ww, y0 + 16, 2, bh - 32);
    g.fillStyle = '#f3dca0'; g.font = '44px WK'; g.fillText(cap.text, x0 + 66 + ww, y0 + bh / 2 + 2);
    g.restore();
  };
}
export function render(cv, els, o) {
  const g = cv.getContext('2d');
  const [trc, tr] = K.canvas(W, H); tr.fillStyle = '#fff'; tr.fillRect(0, 0, W, H);
  const lay = (fn, seed) => { const [c, gg] = K.canvas(W, H); gg.lineJoin = 'round'; gg.lineCap = 'round'; fn(gg); K.hideTexture(c, gg, seed); tr.save(); tr.globalCompositeOperation = 'multiply'; tr.drawImage(c, 0, 0); tr.restore(); };
  const bg = els.find(e => e.t === 'bg') || {}, dark = bg.tone === 'dark';
  const focus = els.filter(e => e.t === 'focus' || e.t === 'speed'), sfx = els.filter(e => e.t === 'sfx');
  // 集中线的圆心 = 楔尖的平均；口子半径 = 最近的楔尖
  const f0 = els.find(e => e.t === 'focus'); let C = [960, 400], rIn = 400;
  if (f0) { C = [0, 0]; f0.polys.forEach(P => { C[0] += P[0][0] / f0.polys.length; C[1] += P[0][1] / f0.polys.length; }); rIn = Math.min(...f0.polys.map(P => Math.hypot(P[0][0] - C[0], P[0][1] - C[1]))); }
  if (dark) {
    // 景片：染深的整张皮，挖星形口子 + 放射缝 + 拟声字
    lay(gg => {
      gg.fillStyle = '#3b2414'; gg.fillRect(CLOTH[0] - 20, CLOTH[1] - 20, CLOTH[2] - CLOTH[0] + 40, CLOTH[3] - CLOTH[1] + 40);
      const r = mulberry(13), star = []; for (let i = 0; i < 44; i++) { const a = i / 44 * Math.PI * 2, rr = rIn * (i % 2 ? .78 + r() * .12 : .98 + r() * .2); star.push(X([C[0] + Math.cos(a) * rr * 1.25, C[1] + Math.sin(a) * rr])); }
      K.ink(gg, 3, path(star));   // 口沿一圈墨线（先描后剪，剪到的地方自然断开）
      K.cut(gg, path(star));
      for (const e of focus) e.polys.forEach(P => K.cut(gg, path(P.map(X))));
      for (const e of sfx) { const done = glyphPath(gg, e); gg.globalCompositeOperation = 'destination-out'; gg.fillStyle = '#000'; gg.fillText(e.text, 0, 0); gg.globalCompositeOperation = 'source-over'; done(); }
      // 画格上下两条（宽银幕之外）补回整皮，口子不漏到格外
      gg.fillStyle = '#3b2414'; gg.fillRect(CLOTH[0] - 20, CLOTH[1] - 20, CLOTH[2] - CLOTH[0] + 40, OY - CLOTH[1] + 20); gg.fillRect(CLOTH[0] - 20, OY + 804 * k, CLOTH[2] - CLOTH[0] + 40, CLOTH[3] - OY - 804 * k + 20);
      // 字里的皮筋：斜向细条（同色皮），只留在字形范围内
      for (const e of sfx) {
        const [c2, g2] = K.canvas(W, H), done = glyphPath(g2, e); g2.fillStyle = '#000'; g2.fillText(e.text, 0, 0); done();
        g2.globalCompositeOperation = 'source-in'; g2.strokeStyle = '#3b2414'; g2.lineWidth = Math.max(4, e.size * k * .022); const st = e.size * k * .2;
        g2.beginPath(); for (let y = -W; y < W + H; y += st) { g2.moveTo(0, y); g2.lineTo(W, y - W * .35); } g2.stroke();   // 一次描完（source-in 每画一次会清掉别处）
        gg.drawImage(c2, 0, 0);
      }
    }, 61);
    // 字里衬一层染色薄皮（红 / 金），灯一照就是发光的字
    lay(gg => { for (const e of sfx) { const done = glyphPath(gg, e); gg.fillStyle = bg.accent === 'red' ? '#e9a32a' : '#c4261a'; gg.fillText(e.text, 0, 0); done(); } }, 62);
  }
  for (const e of els) {
    if (e.t === 'rings') lay(gg => e.lines.forEach(Ln => {
      const n = Ln.length, w = e.w * 1.5 * k, A = [], B = [];
      for (let i = 0; i < n; i++) { const a = Ln[Math.max(0, i - 1)], b = Ln[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1; A.push([Ln[i][0] - dy / m * w / 2 / k, Ln[i][1] + dx / m * w / 2 / k]); B.push([Ln[i][0] + dy / m * w / 2 / k, Ln[i][1] - dx / m * w / 2 / k]); }
      const P = A.concat(B.reverse()).map(X); K.fill(gg, '#b8211a', path(P)); K.ink(gg, 1.6, path(P));
    }), 63);
    if (e.t === 'debris') lay(gg => e.items.forEach((d, i) => { const P = d.poly.map(X); K.fill(gg, i % 2 ? '#c98a26' : '#b8211a', path(P)); K.ink(gg, 1.4, path(P)); }), 64);
    if (e.t === 'fig') { tr.save(); tr.beginPath(); tr.rect(OX, OY, 1920 * k, 804 * k); tr.clip(); puppetFigure(tr, xfOps(e.ops), { scale: e.s * 2 * k, seed: 5 }); tr.restore(); }   // 人物只在画格里（下沿被景片压住）
  }
  // 灯：一盏打在集中线圆心（暴怒的镜头灯色发红）
  const Cs = X(C), red = bg.accent === 'red';
  const key = o.id + (els.find(e => e.t === 'cap') || {}).text;
  if (R.fkey !== key) { const cap = els.find(e => e.t === 'cap'); R.front = front(W, H, cap ? placard(cap) : null); R.fkey = key; }
  const glc = R.glc || (R.glc = Object.assign(document.createElement('canvas'), { width: W, height: H }));
  const GL = R.GL || (R.GL = makeGL(glc));
  GL.render(trc, R.front, { lamps: [[Cs[0], Cs[1], .8, .6], [Cs[0] - 600, Cs[1] + 80, .55, 1], [Cs[0] + 600, Cs[1] + 80, .55, 1]], expo: 1.0, amb: .3, time: 1.3, bloom: .3, vign: .45, rect: CLOTH, sigB: 560,
    lcol: red ? [1, .52, .32] : [1, .77, .46], hotcol: red ? [1, .62, .4] : [1, .9, .62] });
  g.drawImage(glc, 0, 0);
}
