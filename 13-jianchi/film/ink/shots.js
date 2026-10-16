// 水墨 · 关键镜头的通用画法。集中线 = 放射的飞白快笔；音浪 = 几道干笔弧；碎屑 = 泼墨溅点；
// 拟声字 = 狂草大字（湿墨洇开 + 甩出的墨点）；字幕 = 空白处竖写的题跋，句首一方小朱印。上下裱绫。
import * as I from './ink.js';
import { makeComp, layerSet } from './comp.js';
import { inkFigure } from './figure.js';
import { mulberry } from '/core/lib.js';
const R = {};
const Y0 = 138;
function sfx(L, e) {
  for (const [c, a] of [[L.cw, .9], [L.cd, .55]]) { c.save(); c.translate(e.x, e.y + Y0); c.rotate(e.rot || 0); c.font = `${e.size}px MSZ`; c.fillStyle = `rgba(0,0,0,${a})`; c.textBaseline = 'alphabetic'; c.fillText(e.text, 0, 0); c.restore(); }
  const r = mulberry(e.size); const w = e.size * e.text.length;
  for (let i = 0; i < 26; i++) I.blot(L.cw, e.x + r() * w * 1.1, e.y + Y0 - e.size * (r() * 1.1), 2 + r() * e.size * .03, .8, r() * 6, .7 + r() * .5, i);
}
export function render(cv, els, o) {
  const g = cv.getContext('2d');
  const L = R.L || (R.L = layerSet(1920, 1080)); L.clear(); I.reseed(17);
  // 只在画心里落墨（裱绫上不许有墨）
  for (const c of [L.cw, L.cd, L.cc]) { c.save(); c.setTransform(1, 0, 0, 1, 0, Y0); c.beginPath(); c.rect(0, 0, 1920, 804); c.clip(); }
  const bg = els.find(e => e.t === 'bg');
  if (bg && bg.tone === 'dark') {   // 黑底爆发格的水墨写法：四周一圈淡墨烘染（干层，不晕成色块），浓墨大笔从画外扫进来
    const c = L.cd, gr = c.createRadialGradient(960, 400, 300, 960, 400, 1150); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, 'rgba(0,0,0,.12)'); gr.addColorStop(1, 'rgba(0,0,0,.6)'); c.fillStyle = gr; c.fillRect(-20, -20, 1960, 844);
  }
  const cap = els.find(e => e.t === 'cap'), CX = 1850, CY = 70, CS = 38;
  // 留白：题跋处在画人物和大字之前擦淡（画家落墨时就给题字留了地方），边缘用模糊蒙版，不留硬边
  const keepClear = () => {
    if (!cap) return; const n = [...cap.text].length, h = CY + n * CS * 1.05 + 40;
    const M = R.M || (R.M = Object.assign(document.createElement('canvas'), { width: 1920, height: 804 })), m = M.getContext('2d');
    m.clearRect(0, 0, 1920, 804); m.filter = 'blur(28px)'; m.fillStyle = '#000'; m.fillRect(CX - 95, -60, 170, h + 60); m.filter = 'none';
    for (const c of [L.cw, L.cd]) { c.save(); c.globalCompositeOperation = 'destination-out'; c.drawImage(M, 0, 0); c.restore(); }
  };
  let cleared = false;
  for (const e of els) {
    if (!cleared && e.t === 'sfx') { keepClear(); cleared = true; }   // 背景、效果线、人物都画完，写大字之前擦出题跋的地方
    // 集中线：每根一支焦墨快笔，从画外扫向中心，笔尖收成飞白（全部画，给到航海王的密度）
    if (e.t === 'focus' || e.t === 'speed') e.polys.forEach((P, i) => { const tip = P[0], m = [(P[1][0] + P[2][0]) / 2, (P[1][1] + P[2][1]) / 2], w = Math.hypot(P[1][0] - P[2][0], P[1][1] - P[2][1]); I.draw(L.ink, I.mk([m, [(m[0] * 2 + tip[0]) / 3, (m[1] * 2 + tip[1]) / 3], tip], { w: Math.max(3, w * (e.t === 'focus' ? 2.2 : 1.4)), tone: I.TONE.jiao, dry: .62, rough: .35, prof: 'tip', seed: 100 + i })); });
    // 音浪：锯齿保留（不抽点），浓墨干笔
    if (e.t === 'rings') e.lines.forEach((Ln, i) => I.draw(L.ink, I.mk(Ln, { w: e.w * 1.3, tone: I.TONE.jiao, dry: .55, rough: .3, per: 4, seed: 300 + i })));
    if (e.t === 'debris') { const r = mulberry(5); for (const d of e.items) { const [x, y] = d.poly[0]; I.blot(L.cw, x, y, d.s * .5, .85, r() * 6, .6 + r() * .6, x); if (r() < .5) I.blot(L.cw, x + d.s, y + d.s * .6, d.s * .2, .8, 0, 1, y); } }
    // 水面：地平线一道淡墨，下面几排横擦（平静），涟漪是淡墨圈，光柱的倒影在水里留白
    if (e.t === 'water') {
      I.draw(L.ink, I.mk([[-20, e.hz], [700, e.hz + 1], [1300, e.hz - 1], [1940, e.hz]], { w: 2.4, tone: I.TONE.dan, dry: .5, rough: .3, seed: 401 }));
      e.lines.forEach((Ln, i) => { const d = (Ln[0][1] - e.hz) / (804 - e.hz); I.draw(L.ink, I.mk([Ln[0], [(Ln[0][0] + Ln[1][0]) / 2, Ln[0][1] + .5], Ln[1]], { w: 1 + d * 3.5, tone: I.TONE.dan + d * .15, dry: .7, prof: 'tip', seed: 410 + i })); });
      e.ripples.forEach((Ln, i) => I.draw(L.ink, I.mk(Ln.filter((_, j) => j % 3 === 0), { w: 1.6, tone: I.TONE.dan, dry: .55, rough: .3, seed: 470 + i })));
    }
    // 草原：淡墨点，远密近疏、远小近大，夹几簇短草（同 K1）
    if (e.t === 'ground') {
      const rg = mulberry(7);
      for (let i = 0; i < 560; i++) { const u = rg() ** 1.8, y = e.hz + 8 + (804 - e.hz - 8) * u, x = rg() * 1920, r = .8 + u * 5.5; I.blot(L.cd, x, y, r, .18 + rg() * .22, rg() * 3, .45, i); }
      for (let i = 0; i < 80; i++) { const u = .3 + .7 * rg(), y = e.hz + (804 - e.hz) * u, x = rg() * 1920, h = 6 + u * 26; for (let j = -1; j <= 1; j++) I.draw(L.ink, I.mk([[x + j * h * .2, y], [x + j * h * .35 + 2, y - h]], { w: 1 + u * 2.4, tone: I.TONE.dan, dry: .45, prof: 'tip', seed: 600 + i * 7 + j })); }
      I.draw(L.ink, I.mk([[-20, e.hz], [700, e.hz + 1], [1300, e.hz - 1], [1940, e.hz]], { w: 3, tone: I.TONE.dan, dry: .5, rough: .3, seed: 599 }));
    }
    // 河：纸白（擦干净），两岸干笔；河头几笔极淡的横擦（平静），往下游是平行浪线（汹涌）
    if (e.t === 'river') {
      const R0 = e.river, pp = c => { c.beginPath(); R0.fill.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
      for (const c of [L.cw, L.cd]) { c.save(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; pp(c); c.fill(); c.restore(); }
      R0.banks.forEach((b, i) => { for (let s0 = 0; s0 < b.length - 4; s0 += 26) { const seg = b.slice(s0, s0 + 30), d = seg[0][1] / 804; I.draw(L.ink, I.mk(seg, { w: 1.4 + d * 6, tone: I.TONE.dan + d * .2, dry: .55, rough: .3, seed: 620 + i * 40 + s0 })); } });
      for (const c of [L.cw, L.cd]) { c.save(); pp(c); c.clip(); }
      const hy = Math.min(...R0.fill.map(p => p[1])), mid = hy + (804 - hy) * .4, rw = mulberry(9);
      for (let i = 0; i < 40; i++) { const y = hy + 6 + (mid - hy) * rw() ** 1.3, d = y / 804, x = 900 + rw() * 500, l = 30 + d * 100; I.draw(L.ink, I.mk([[x, y], [x + l * .5, y + (rw() - .5) * 2], [x + l, y]], { w: .8 + d * 2, tone: I.TONE.qing, dry: .75, prof: 'tip', seed: 650 + i })); }
      for (let row = 0; row < 8; row++) { const y = mid + 20 + row * row * 4 + row * 14, d = y / 804, A = 26 + d * 60, H = 6 + d * 22; for (let x = 900 + (row % 2) * A * .5; x < 1700; x += A * 1.05) { const pts = []; for (let j = 0; j <= 8; j++) { const u = j / 8; pts.push([x + A * u, y - Math.sin(u * Math.PI) * H + (u > .65 ? (u - .65) * H * 2 : 0)]); } I.draw(L.ink, I.mk(pts, { w: 1.4 + d * 3.4, tone: I.TONE.zhong, dry: .3, rough: .2, prof: 'brush', seed: 700 + row * 50 + x })); } }
      for (const c of [L.cw, L.cd]) c.restore();
    }
    // 天意的巨眼：上眼睑一道焦墨大笔，下眼睑淡墨；眼白留纸；虹膜一团浓墨，四周放射的干笔；瞳孔焦墨点，留一点高光
    if (e.t === 'eye') {
      const lid = c => { c.beginPath(); e.lid.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
      for (const c of [L.cw, L.cd]) { c.save(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; lid(c); c.fill(); c.restore(); }
      const [ix, iy, ir] = e.iris;
      for (const c of [L.cw, L.cd]) { c.save(); lid(c); c.clip(); }
      I.mass(L.cw, Array.from({ length: 40 }, (_, i) => [ix + Math.cos(i / 40 * 6.283) * ir, iy + Math.sin(i / 40 * 6.283) * ir]), .55, 2, 5);
      for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; I.draw(L.ink, I.mk([[ix + Math.cos(a) * ir * .98, iy + Math.sin(a) * ir * .98], [ix + Math.cos(a) * ir * .5, iy + Math.sin(a) * ir * .5]], { w: 3.4, tone: I.TONE.nong, dry: .7, prof: 'tip', seed: 760 + i })); }
      I.blot(L.cw, e.pupil[0], e.pupil[1], e.pupil[2], .95, 0, 1, 3);
      for (const c of [L.cw, L.cd]) c.restore();
      for (const c of [L.cw, L.cd]) { c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(ix - ir * .35, iy - ir * .38, ir * .12, 0, 7); c.fill(); c.restore(); }
      I.draw(L.ink, I.mk(e.up.filter((_, i) => i % 2 === 0), { w: 16, tone: I.TONE.jiao, dry: .35, rough: .25, prof: 'brush', seed: 790 }));
      I.draw(L.ink, I.mk(e.low.filter((_, i) => i % 2 === 0), { w: 6, tone: I.TONE.zhong, dry: .55, rough: .3, prof: 'brush', seed: 791 }));
      e.lashes.forEach((Ln, i) => I.draw(L.ink, I.mk(Ln, { w: 5, tone: I.TONE.jiao, dry: .4, prof: 'tip', seed: 800 + i })));
    }
    if (e.t === 'cloud') { const [x, y] = e.at, w = e.w; for (let j = 0; j < 3; j++) { const pts = []; for (let a = 0; a <= 1.7 * Math.PI; a += .25) pts.push([x - w * .4 + j * w * .38 + Math.cos(a) * w * .14 * (1 - a / 9), y + 4 + Math.sin(a) * w * .07]); I.draw(L.ink, I.mk(pts, { w: 2, tone: I.TONE.zhong, dry: .4, seed: 490 + j })); } }
    // 光柱：柱里擦回纸白（光就是留白），柱沿染一层花青（全片水墨唯一的颜色破例，只给爱情仙蛊），柱里的速度线是纸白
    if (e.t === 'beam') {
      const pp = c => { c.beginPath(); e.poly.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
      for (const c of [L.cw, L.cd]) { c.save(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; pp(c); c.fill(); c.restore(); }
      const cc = L.cc; cc.save(); pp(cc); cc.clip(); cc.fillStyle = 'rgba(52,96,132,.62)'; pp(cc); cc.fill();
      cc.globalCompositeOperation = 'destination-out'; cc.filter = 'blur(10px)'; e.streaks.forEach(P => { cc.beginPath(); P.forEach((p, k) => k ? cc.lineTo(p[0], p[1]) : cc.moveTo(p[0], p[1])); cc.closePath(); cc.fill(); }); cc.filter = 'none'; cc.restore();
      // 柱沿两道花青干笔
      const n = e.poly.length / 2; for (const side of [e.poly.slice(0, n), e.poly.slice(n)]) I.draw(L.ink, I.mk(side, { w: 7, tone: .7, dry: .6, rough: .35, color: [52, 96, 132], seed: 520 + side.length }));
    }
    if (e.t === 'splash') { const r = mulberry(9); e.cols.forEach((P, i) => I.draw(L.ink, I.mk([P[0], P[2]], { w: 5 + r() * 4, tone: I.TONE.zhong, dry: .7, prof: 'tip', seed: 540 + i }))); for (const [x, y, rr] of e.drops) I.blot(L.cw, x, y, rr * .6, .7, r() * 6, .8, x); }
    if (e.t === 'fig' && e.lit) {   // 光里的人：一团浓墨剪影，只有白发留纸白
      for (const op of e.ops) if (op.poly) { if (op.role === 'hairW') { for (const c of [L.cw, L.cd]) { c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); op.poly.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); c.restore(); } } else I.mass(L.cw, op.poly, .9, 1, 3); }
    } else if (e.t === 'fig') inkFigure(L, e.ops, { key: o.id + e.key, scale: Math.max(.25, e.s * 1.4) });
    if (e.t === 'sfx') sfx(L, { ...e, y: e.y - Y0 });
  }
  if (!cleared) keepClear();
  for (const c of [L.cw, L.cd, L.cc]) c.restore();
  // 题跋：竖写在画面右侧，句首一方小朱印
  const cc = L.cc;
  if (cap) {
    const x = CX, y = Y0 + CY, sz = CS; cc.fillStyle = '#b02e22'; cc.fillRect(x - 13, y - 34, 26, 26);
    cc.fillStyle = 'rgba(28,24,22,.92)'; cc.font = `${sz}px MSZ`; cc.textAlign = 'center'; cc.textBaseline = 'alphabetic';
    [...cap.text].forEach((ch, i) => cc.fillText(ch, x, y + 18 + i * sz * 1.02));
    if (cap.who) cc.font = '22px MSZ', [...cap.who].forEach((ch, i) => cc.fillText(ch, x - 46, y + 18 + i * 24));
  }
  // 裱绫
  cc.fillStyle = '#4a4740'; cc.fillRect(0, 0, 1920, Y0); cc.fillRect(0, Y0 + 804, 1920, 1080 - Y0 - 804);
  cc.fillStyle = '#6a665c'; cc.fillRect(0, Y0 - 6, 1920, 3); cc.fillRect(0, Y0 + 807, 1920, 3);
  const glc = R.glc || (R.glc = Object.assign(document.createElement('canvas'), { width: 1920, height: 1080 }));
  const comp = R.CP || (R.CP = makeComp(glc));
  comp(L, null, { bleed: 6, rim: .9 });
  g.drawImage(glc, 0, 0);
}
