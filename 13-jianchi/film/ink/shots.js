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
    if (!cleared && (e.t === 'fig' || e.t === 'sfx')) { keepClear(); cleared = true; }
    // 集中线：每根一支焦墨快笔，从画外扫向中心，笔尖收成飞白（全部画，给到航海王的密度）
    if (e.t === 'focus' || e.t === 'speed') e.polys.forEach((P, i) => { const tip = P[0], m = [(P[1][0] + P[2][0]) / 2, (P[1][1] + P[2][1]) / 2], w = Math.hypot(P[1][0] - P[2][0], P[1][1] - P[2][1]); I.draw(L.ink, I.mk([m, [(m[0] * 2 + tip[0]) / 3, (m[1] * 2 + tip[1]) / 3], tip], { w: Math.max(3, w * (e.t === 'focus' ? 2.2 : 1.4)), tone: I.TONE.jiao, dry: .62, rough: .35, prof: 'tip', seed: 100 + i })); });
    // 音浪：锯齿保留（不抽点），浓墨干笔
    if (e.t === 'rings') e.lines.forEach((Ln, i) => I.draw(L.ink, I.mk(Ln, { w: e.w * 1.3, tone: I.TONE.jiao, dry: .55, rough: .3, per: 4, seed: 300 + i })));
    if (e.t === 'debris') { const r = mulberry(5); for (const d of e.items) { const [x, y] = d.poly[0]; I.blot(L.cw, x, y, d.s * .5, .85, r() * 6, .6 + r() * .6, x); if (r() < .5) I.blot(L.cw, x + d.s, y + d.s * .6, d.s * .2, .8, 0, 1, y); } }
    if (e.t === 'fig') inkFigure(L, e.ops, { key: o.id + e.key, scale: e.s * 1.4 });
    if (e.t === 'sfx') sfx(L, { ...e, y: e.y - Y0 });
  }
  for (const c of [L.cw, L.cd, L.cc]) c.restore();
  // 题跋：竖写在画面右侧，句首一方小朱印
  const cc = L.cc;
  if (cap) {
    const x = CX, y = Y0 + CY, sz = CS; cc.fillStyle = '#b02e22'; cc.fillRect(x - 13, y - 34, 26, 26);
    cc.fillStyle = 'rgba(28,24,22,.92)'; cc.font = `${sz}px MSZ`; cc.textAlign = 'center'; cc.textBaseline = 'alphabetic';
    [...cap.text].forEach((ch, i) => cc.fillText(ch, x, y + 18 + i * sz * 1.02));
    cc.font = '22px MSZ'; [...cap.who].forEach((ch, i) => cc.fillText(ch, x - 46, y + 18 + i * 24));
  }
  // 裱绫
  cc.fillStyle = '#4a4740'; cc.fillRect(0, 0, 1920, Y0); cc.fillRect(0, Y0 + 804, 1920, 1080 - Y0 - 804);
  cc.fillStyle = '#6a665c'; cc.fillRect(0, Y0 - 6, 1920, 3); cc.fillRect(0, Y0 + 807, 1920, 3);
  const glc = R.glc || (R.glc = Object.assign(document.createElement('canvas'), { width: 1920, height: 1080 }));
  const comp = R.CP || (R.CP = makeComp(glc));
  comp(L, null, { bleed: 6, rim: .9 });
  g.drawImage(glc, 0, 0);
}
