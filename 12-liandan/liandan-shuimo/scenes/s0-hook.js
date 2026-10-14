// 钩子与收束（同一处画面）：照实物复刻的药瓶、药盒、一碟小丸（淡彩）→ 一滴浓墨落成一丸 → 绕丸写出"丹"字 → 片名。
// 片尾回到这里：三枚大丸落在碟旁，题"勿以其迂缓而舍之"，钤"丹"印
import { mk, draw as ink, blot, mass, disc, wash, pill, arc, Paint, spatter, lift, liftPoly, liftEllipse, tint, tintPoly, PIG, VERM } from '../engine/kit.js';
import { writeGlyph, inBox, G } from '../engine/glyph.js';
import { column, line, seal, BRUSH, KAI } from '../engine/text.js';
import { T } from '../story.js';
import { clamp, lerp, eo, ss, seg, mulberry } from '/core/lib.js';

const DAN = [-800, -290, 560];
const g = G['丹'];
export const PILL = [...inBox(...DAN, g.dot[0], g.dot[1]), g.dot[2] * DAN[2] / 100];
const thin = (o = {}) => ({ w: 3, tone: .82, dry: .32, wet: .2, prof: 'even', rough: .06, ...o });
const VC = `rgb(${VERM.join(',')})`;

// ---------- 药盒 ----------
const BOXF = [[540, -262], [790, -262], [790, 236], [540, 236]], BOXS = [[790, -262], [872, -292], [872, 206], [790, 236]], BOXT = [[540, -262], [622, -292], [872, -292], [790, -262]];
const box = new Paint();
[[[540, -262], [540, 236]], [[540, 236], [790, 236]], [[790, 236], [790, -262]], [[790, -262], [540, -262]], [[790, -262], [872, -292]], [[872, -292], [872, 206]], [[872, 206], [790, 236]], [[540, -262], [622, -292]], [[622, -292], [872, -292]]]
  .forEach((p, i) => box.s(p, thin({ seed: 200 + i, w: i === 2 ? 4 : 3 }), -.6 + i * .03, .08));
for (let i = 0; i < 6; i++) box.s([[806, -196 + i * 34 - 5], [856, -214 + i * 34 - 5]], thin({ w: 1.5, tone: .45, seed: 220 + i }), -.3, .05);
for (let i = 0; i < 9; i++) box.s([[808 + i * 6, 96 - i * 2.2], [808 + i * 6, 168 - i * 2.2]], thin({ w: i % 3 ? 1.4 : 2.6, tone: .7, seed: 230 + i }), -.25, .05);
// ---------- 药瓶 ----------
const bottle = new Paint();
[
  [[[316, -166], [296, -150], [281, -122], [280, 60], [280, 240], [294, 262]], -.5, .2], [[[294, 262], [392, 266], [490, 262]], -.34, .1],
  [[[490, 262], [504, 240], [504, 60], [503, -122], [488, -150], [468, -166]], -.28, .2],
  [[[304, -166], [303, -214], [304, -262]], -.14, .06], [[[304, -262], [392, -265], [480, -262]], -.1, .06], [[[480, -262], [481, -214], [480, -166]], -.06, .06], [[[480, -166], [392, -163], [304, -166]], -.02, .06],
  [[[282, -8], [502, -8]], .04, .06],
].forEach(([p, t0, d], i) => bottle.s(p, thin({ seed: 100 + i }), t0, d));
for (let i = 0; i < 11; i++) bottle.s([[316 + i * 15.2, -254], [316 + i * 15.2, -174]], thin({ w: 1.5, tone: .4, seed: 120 + i }), .02 + i * .01, .04);
for (let i = 0; i < 2; i++) bottle.s([[462 + i * 18, 20], [462 + i * 18, 200]], thin({ w: 1.3, tone: .4, dry: .7, seed: 140 + i }), .1, .05);
const INSIDE = (() => { const R = mulberry(41), o = []; for (let i = 0; i < 74; i++) o.push([292 + R() * 200, -24 - Math.pow(R(), 1.6) * 92, 8.2 + R() * 2.2, i]); return o.sort((a, b) => a[1] - b[1]); })();
// ---------- 木碟与一碟小丸 ----------
const DISH = [560, 352, 236, 58];
const dish = new Paint();
dish.s(arc(DISH[0], DISH[1], DISH[2], DISH[3], Math.PI + .04, 6.24, 24), { w: 4, tone: .66, dry: .45, wet: .3, prof: 'even', seed: 301 }, -.3, .12);
dish.s([[DISH[0] - DISH[2], DISH[1]], [DISH[0] - 196, DISH[1] + 50], [DISH[0], DISH[1] + 78], [DISH[0] + 196, DISH[1] + 50], [DISH[0] + DISH[2], DISH[1]]], { w: 10, tone: .88, darkDir: [0, 1], side: .7, brWet: true, body: .4, dry: .42, wet: .6, prof: 'even', seed: 302 }, -.24, .2);
dish.s(arc(DISH[0], DISH[1], DISH[2], DISH[3], -.02, Math.PI + .02, 24), { w: 6.5, tone: .86, dry: .42, wet: .4, prof: 'even', seed: 303 }, -.1, .16);
const DOTS = [];
{
  const R = mulberry(77);
  for (let i = 0; i < 200; i++) {
    const u = i / 199, lvl = Math.pow(u, 1.15), half = 214 * Math.sqrt(1 - lvl * .97), x = DISH[0] + (R() * 2 - 1) * half * (.3 + .7 * R());
    DOTS.push({ x, y: DISH[1] + 20 - 92 * lvl * (1 - Math.pow(Math.abs(x - DISH[0]) / 200, 2) * .5) - R() * 5, r: 7.4 + R() * 1.4, sd: i });
  }
}
export const dotTime = i => lerp(T.dots[0], T.dots[1], Math.sqrt(i / (DOTS.length - 1)));
const vtext = (c, text, x, y0, step, size, font) => { c.font = `${size}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle'; [...text].forEach((ch, i) => c.fillText(ch, x, y0 + i * step)); };
// 朱红签：白字（从朱红里挖出）
function cartouche(cc, x0, y0, w, h, size, step, a, text = '地黄丸') {
  if (a <= 0) return;
  cc.save(); cc.globalAlpha = clamp(a) * .9; cc.fillStyle = VC; cc.fillRect(x0, y0, w, h);
  cc.globalCompositeOperation = 'destination-out'; cc.globalAlpha = 1; cc.lineWidth = Math.max(1.5, w * .022); cc.strokeStyle = '#000'; cc.strokeRect(x0 + w * .07, y0 + w * .07, w * .86, h - w * .14);
  cc.fillStyle = '#000'; vtext(cc, text, x0 + w / 2, y0 + (h - step * ([...text].length - 1)) / 2, step, size, BRUSH); cc.restore();
}
// 片尾落下的三丸
const END3 = [[-150, 334], [-12, 340], [124, 332]];

export function paint(A, t, cam, TMP, o = {}) {
  const L = A.ink, cc = A.cc, E = T.end;
  const te = o.end ? t : -1, t0 = o.end ? 99 : t;                 // 片尾时开场部分全部画完
  A.xf(cam.s, cam.tx, cam.ty);
  // 药盒
  const bp = seg(t0, -.6, .1);
  tintPoly(cc, BOXF, PIG.gold, .4 * bp); tintPoly(cc, BOXS, PIG.gold, .56 * bp); tintPoly(cc, BOXT, PIG.gold, .28 * bp);
  wash(L.wet, 700, 250, 250, 20, .14 * bp, 5);
  box.draw(A, t0);
  cartouche(cc, 604, -200, 122, 330, 66, 88, bp);
  line(A, cam, '200 丸装', 665, 178, 22, bp * .9, { align: 'center', sp: 2 });
  A.xf(cam.s, cam.tx, cam.ty);
  // 药瓶：压在盒前
  const bt = [[304, -264], [480, -264], [480, -166], [504, -122], [504, 262], [280, 262], [280, -122], [304, -166]];
  liftPoly(L, bt, bp); cc.save(); cc.globalCompositeOperation = 'destination-out'; cc.beginPath(); bt.forEach((p, i) => i ? cc.lineTo(p[0], p[1]) : cc.moveTo(p[0], p[1])); cc.fill(); cc.restore();
  for (const d of INSIDE) { disc(L.wet, d[0], d[1], d[2], .8 * bp, .05, d[3]); disc(L.dry, d[0], d[1], d[2] * .9, .78 * bp, .05, d[3] + 9); liftEllipse(L, d[0] - d[2] * .3, d[1] - d[2] * .36, d[2] * .26, d[2] * .14, .8 * bp, -.6); }
  tintPoly(cc, [[282, -8], [502, -8], [502, 248], [282, 248]], PIG.gold, .46 * bp);
  tintPoly(cc, [[282, -120], [502, -120], [502, -8], [282, -8]], PIG.indigo, .1 * bp);
  mass(L.wet, [[440, -258], [478, -258], [478, -170], [440, -170]], .1 * bp, 2, 7);
  lift(L, c => { c.globalAlpha = .55 * bp; c.fillRect(294, -112, 9, 96); });
  wash(L.wet, 392, 272, 132, 14, .16 * bp, 6);
  bottle.draw(A, t0);
  cartouche(cc, 346, 12, 92, 196, 46, 56, bp);
  line(A, cam, '200 丸装', 392, 228, 17, bp * .9, { align: 'center', sp: 1 });
  A.xf(cam.s, cam.tx, cam.ty);
  // 木碟：压在瓶与盒的脚前
  const dp = seg(t0, -.3, .15);
  const dpoly = [...arc(DISH[0], DISH[1], DISH[2], DISH[3], Math.PI, 6.2832, 20), [DISH[0] + 196, DISH[1] + 50], [DISH[0], DISH[1] + 78], [DISH[0] - 196, DISH[1] + 50]];
  liftPoly(L, dpoly, dp); cc.save(); cc.globalCompositeOperation = 'destination-out'; cc.beginPath(); dpoly.forEach((p, i) => i ? cc.lineTo(p[0], p[1]) : cc.moveTo(p[0], p[1])); cc.fill(); cc.restore();
  tintPoly(cc, dpoly, PIG.ochre, .36 * dp);
  wash(L.wet, DISH[0] + 10, DISH[1] + 84, 250, 16, .16 * dp, 8);
  dish.draw(A, t0);
  DOTS.forEach((d, i) => {
    const k = clamp((t0 - dotTime(i)) / .09); if (k <= 0) return;
    const y = d.y - 60 * (1 - k) * (1 - k);
    liftEllipse(L, d.x, y, d.r * .9, d.r * .9, k); disc(L.wet, d.x, y, d.r * .8, .45 * k, .05, d.sd); disc(L.dry, d.x, y, d.r * .95, .88 * k, .05, d.sd + 3);
    liftEllipse(L, d.x - d.r * .3, y - d.r * .36, d.r * .27, d.r * .14, .85 * k, -.6);
  });
  column(A, cam, '市售一瓶 二百粒', 140, -330, 40, seg(t0, .6, 1.5), { tone: .84 });
  A.xf(cam.s, cam.tx, cam.ty);

  // 一滴浓墨 → 一丸
  const [px, py, pr] = PILL;
  if (t0 >= T.dropFall && t0 < T.dropHit) {
    const u = (t0 - T.dropFall) / (T.dropHit - T.dropFall), y = lerp(-640, py, u * u);
    L.wet.save(); L.wet.globalAlpha = .92; L.wet.fillStyle = '#000'; L.wet.beginPath(); L.wet.ellipse(px, y, pr * .5, pr * (.7 + .5 * u), 0, 0, 7); L.wet.fill(); L.wet.restore();
    disc(L.dry, px, y, pr * .42, .9, .03, 4);
    ink(L, mk([[px, y - 260 * u - 40], [px, y - pr * .6]], { w: 6, tone: .4, dry: .6, prof: 'tip', seed: 3 }), 1, .6);
  }
  if (t0 >= T.dropHit) {
    const u = (t0 - T.dropHit), k = eo(clamp(u / .28)), f = 1 - clamp((u - .5) / 2.2) * .55, R = mulberry(31);
    for (let i = 0; i < 7; i++) { const a = R() * 6.28, d = pr * (1.1 + R() * 1.1) * k; blot(L.wet, px + Math.cos(a) * d, py + Math.sin(a) * d * .8, (3 + R() * 8) * k, .22 * f, R() * 3, .7, i + 5); }
    spatter(L.dry, px, py, pr * 3.4 * k, pr * 2.6 * k, 34, { seed: 9, a: .7 * f, r0: 1, r1: 3.6, pow: .5 });
    pill(L, px, py, pr * (.55 + .45 * k) * (1 + .08 * Math.sin(clamp(u / .4) * Math.PI)), { g: 1, seed: 1, shadow: false });
  }
  writeGlyph(A, cam, '丹', DAN[0], DAN[1], DAN[2], T.dan.map(([a, b]) => ss(seg(t0, a, b))), { dry: .13, seed: 7 });
  column(A, cam, '一颗丹的炼成', -130, -250, 62, seg(t0, T.title[0], T.title[1]));
  column(A, cam, '十全大补丹', -188, -250, 30, seg(t0, T.title[0] + .3, T.title[1]), { tone: .82 });
  A.xf(cam.s, cam.tx, cam.ty);
  const sk = seg(t0, T.sealHook, T.sealHook + .12);
  if (sk > 0) seal(cc, -166, 128, 72, sk * .95, '古法', 5);

  // ---------- 收束 ----------
  if (te >= 0) {
    END3.forEach(([x, y], i) => {
      const td = E.drop[i], u = (te - td) / .3; if (u <= 0) return;
      const k = clamp(u), yy = lerp(-700, y, k * k), sq = te > td + .3 ? 1 + .1 * Math.exp(-(te - td - .3) * 12) * Math.cos((te - td - .3) * 40) : 1;
      pill(L, x, yy, 54, { g: 1, seed: 21 + i });
      if (k >= 1) spatter(L.dry, x, y + 50, 90, 16, 18, { seed: 50 + i, a: .5, r0: 1, r1: 2.6 });
    });
    line(A, cam, '三丸抵一瓶 · 论分量同为三十六克', -12, 424, 25, seg(te, E.drop[2] + .2, E.drop[2] + .7) * .82, { align: 'center', sp: 2, wet: .12 });
    column(A, cam, '勿以其迂缓而舍之', -24, -326, 46, seg(te, E.quote[0], E.quote[1]));
    column(A, cam, '金匮要略辑义', 30, -326, 23, seg(te, E.quote[1], E.quote[1] + .4), { font: KAI, tone: .6, wet: .12, gap: 1.15 });
    line(A, cam, '传统制药工艺科普 · 不作用药建议', -610, 492, 23, seg(te, E.quote[0], E.quote[0] + .6) * .6, { align: 'center', sp: 3, wet: .1 });
    A.xf(cam.s, cam.tx, cam.ty);
    const s2 = seg(te, E.seal, E.seal + .1);
    if (s2 > 0) seal(cc, -58, 62, 66, s2 * .96, '丹', 9);
  }
}
