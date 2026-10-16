// 60s 间谍片头 · 关键镜头的通用画法。四色纸：墨黑、骨白、河青、警示红。
// 集中线 = 一圈剪出来的长条纸楔（骨白/河青相间，像片头里的放射条纹）；音浪 = 红纸剪的锯齿圈；碎屑 = 骨白小纸片；
// 拟声字 = 粗黑体剪纸大字（红字 + 错版的墨黑影子）；人物 = 整张剪影，近景只留眉眼缝；字幕 = 左下一条斜贴的骨白纸条。上下墨黑遮幅。
import * as P from './paper.js';
import { spyFigure, PAL } from './figure.js';
import { mulberry } from '/core/lib.js';
const Y0 = 138;
const BG = { dark: 'ink', light: 'bone', red: 'red', teal: 'teal' };
function sfx(g, e, fg, sh) {
  g.save(); g.translate(e.x, e.y); g.rotate(e.rot || 0);
  g.font = `900 ${e.size}px NS`; g.textBaseline = 'alphabetic';
  // 错版：墨黑影子往右下偏一点，红字压在上面
  const o = e.size * .035; g.fillStyle = sh; g.fillText(e.text, o, o);
  g.lineJoin = 'round'; g.lineWidth = e.size * .02; g.strokeStyle = sh; g.strokeText(e.text, 0, 0);
  g.fillStyle = fg; g.fillText(e.text, 0, 0);
  g.restore();
}
function tri(P0, col) { P.piece(P0, col, { gap: 0, shadow: false }); }
export function render(cv, els, o) {
  const g = P.g;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const bg = els.find(e => e.t === 'bg') || {}, bgc = PAL[BG[bg.accent] || BG[bg.tone] || 'ink'];
  P.clear(bgc); P.S.bg = bgc;
  g.save(); g.beginPath(); g.rect(0, Y0, 1920, 804); g.clip(); g.translate(0, Y0);
  // 配色：底是墨黑时条纹用骨白/河青，底是红时用墨黑/骨白
  const onRed = bgc === PAL.red;
  const stripe = onRed ? [PAL.ink, PAL.ink, PAL.boneD] : [PAL.bone, PAL.teal, PAL.teal];
  for (const e of els) {
    if (e.t === 'focus' || e.t === 'speed') e.polys.forEach((Q, i) => tri(Q, stripe[i % stripe.length]));
    if (e.t === 'rings') e.lines.forEach((Ln, i) => {   // 锯齿圈剪成一条有宽度的纸带
      const n = Ln.length, w = e.w * 1.6, A = [], B = [];
      for (let k = 0; k < n; k++) { const a = Ln[Math.max(0, k - 1)], b = Ln[Math.min(n - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1; A.push([Ln[k][0] - dy / m * w / 2, Ln[k][1] + dx / m * w / 2]); B.push([Ln[k][0] + dy / m * w / 2, Ln[k][1] - dx / m * w / 2]); }
      P.piece(A.concat(B.reverse()), onRed ? PAL.bone : PAL.red, { gap: 0 });
    });
    if (e.t === 'debris') e.items.forEach((d, i) => P.piece(d.poly, i % 3 ? PAL.bone : (onRed ? PAL.ink : PAL.red), { gap: 0, shB: 2, shX: 1.5, shY: 2 }));
    if (e.t === 'fig') { P.S.bg = bgc; spyFigure(e.ops, { key: o.id + e.key, closeup: true, scale: e.s * 2, outline: 5 }); }
    if (e.t === 'sfx') sfx(g, e, onRed ? PAL.bone : PAL.red, PAL.ink);
  }
  g.restore();
  // 遮幅
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = PAL.ink; g.fillRect(0, 0, 1920, Y0); g.fillRect(0, Y0 + 804, 1920, 1080 - Y0 - 804);
  // 字幕：左下斜贴一条骨白纸条，黑体字；说话人是前面一小块红纸
  const cap = els.find(e => e.t === 'cap');
  if (cap) {
    g.save(); g.translate(96, Y0 + 804 + 6); g.rotate(-.025);
    g.font = '900 40px NS'; const tw = g.measureText(cap.text).width; g.font = '900 24px NS'; const ww = g.measureText(cap.who).width;
    P.piece([[0, -34], [ww + 34, -36], [ww + 32, 18], [-2, 20]], bgc === PAL.red ? PAL.ink : PAL.red, { gap: 0 });
    g.fillStyle = PAL.bone; g.textBaseline = 'alphabetic'; g.fillText(cap.who, 16, -1);
    P.piece([[ww + 40, -54], [ww + 40 + tw + 52, -58], [ww + 40 + tw + 50, 22], [ww + 38, 26]], PAL.bone, { gap: 0 });
    g.font = '900 40px NS'; g.fillStyle = PAL.ink; g.fillText(cap.text, ww + 64, 2);
    g.restore();
  }
  P.paperFinish(1);
}
