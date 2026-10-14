// 五行：水墨太极。先是一个合不拢的圆，墨往下漏（木郁风动，泄而不藏）；落中心为土（枢）；
// 淡墨自左而升（木→火，阳），浓墨自右而降（金→水，阴），合成太极；阴中一点白，阳中一点黑——那一点黑就是丹。
// 方位、天干与五色：东方甲乙木（青）、南方丙丁火（赤）、中央戊己土（黄）、西方庚辛金（白）、北方壬癸水（黑）
import { mk, draw as ink, blot, arc, disc, wash, local, lift, liftEllipse, spatter, pill, tint, PIG, VERM } from '../engine/kit.js';
import { writeGlyph } from '../engine/glyph.js';
import { column, line, KAI } from '../engine/text.js';
import { T } from '../story.js';
import { clamp, lerp, eo, ss, seg, mulberry } from '/core/lib.js';

export const C = [0, -10], R = 250;
const H = R / 2;
// 阴（黑）：右半 + 下方小圆 − 上方小圆；阳（白）是其余。阳的头在上（火），阴的头在下（水）
const yinPath = c => { c.beginPath(); c.moveTo(0, -R); c.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, false); c.arc(0, H, H, Math.PI / 2, Math.PI * 1.5, false); c.arc(0, -H, H, Math.PI / 2, -Math.PI / 2, true); c.closePath(); };
const yangPath = c => { c.beginPath(); c.moveTo(0, R); c.arc(0, 0, R, Math.PI / 2, Math.PI * 1.5, false); c.arc(0, -H, H, -Math.PI / 2, Math.PI / 2, false); c.arc(0, H, H, -Math.PI / 2, Math.PI / 2, true); c.closePath(); };
const wedge = (c, a0, sweep) => { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R * 2.2, a0, a0 + sweep, false); c.closePath(); };
// 鱼身里的笔：沿着走势的弧，浓处含墨，尾部枯出飞白
const yinArcs = [70, 112, 154, 196, 232].map((r, i) => mk(arc(0, 0, r, r, -1.38 + i * .05, 1.72 - i * .04, 30), { w: 58, tone: .96, dry: .5 + i * .04, wet: .6, prof: s => .55 + .45 * Math.min(1, s / .3), solid: true, nb: 40, rough: .14, seed: 60 + i, gapLen: 600 }));
const yinLift = [90, 134, 176, 214].map((r, i) => mk(arc(0, 0, r, r, -1.2, -.2 + i * .08, 16), { w: 26, tone: .9, dry: .84, wet: 0, prof: 'cone', nb: 26, seed: 70 + i, gapLen: 300 }));
const yangArcs = [80, 128, 176, 222].map((r, i) => mk(arc(0, 0, r, r, Math.PI - 1.38 + i * .05, Math.PI + 1.72 - i * .04, 30), { w: 44, tone: .17, dry: .62, wet: .6, prof: 'lens', nb: 30, rough: .2, seed: 80 + i, gapLen: 600 }));
const rim = mk(arc(0, 0, R, R, 1.62, 1.62 + 6.4, 80), { w: 15, tone: .9, dry: .42, wet: .45, prof: 'brush', nb: 22, seed: 90, gapLen: 900 });
const eyeRing = mk(arc(0, H, R * .13, R * .13, .5, 6.4, 16), { w: 3, tone: .5, dry: .5, prof: 'brush', seed: 95 });
const hubRing = mk(arc(0, 0, R * .215, R * .215, 2, 8.2, 24), { w: 5, tone: .82, dry: .45, wet: .4, prof: 'brush', seed: 96 });

// 画太极。pY / pN：阳、阴各自画到哪（0..1）；eyeW 阴中之阳；eyeB 阳中之阴（丹丸）；hub 中心的枢
export function taiji(A, cam, cx, cy, s, rot, o = {}) {
  const { pY = 1, pN = 1, eyeW = 1, eyeB = 1, hub = 1, am = 1 } = o;
  local(A, cx, cy, rot, s, s, L => {
    if (pY > 0) {
      for (const c of [L.wet, L.dry]) { c.save(); yangPath(c); c.clip(); wedge(c, Math.PI / 2, Math.PI * 1.5 * pY); c.clip(); }
      L.wet.fillStyle = `rgba(0,0,0,${.07 * am})`; L.wet.fillRect(-R, -R, R * 2, R * 2);
      yangArcs.forEach(st => ink(L, st, 1, am));
      for (const c of [L.wet, L.dry]) c.restore();
    }
    if (pN > 0) {
      for (const c of [L.wet, L.dry]) {
        c.save(); yinPath(c); c.clip(); wedge(c, -Math.PI / 2, Math.PI * 1.5 * pN); c.clip();
        const wet = c === L.wet, g = c.createLinearGradient(0, -R, 0, R);
        g.addColorStop(0, `rgba(0,0,0,${(wet ? .5 : .16) * am})`); g.addColorStop(.55, `rgba(0,0,0,${(wet ? .86 : .5) * am})`); g.addColorStop(1, `rgba(0,0,0,${(wet ? .95 : .66) * am})`);
        c.fillStyle = g; c.fillRect(-R, -R, R * 2, R * 2);
      }
      yinArcs.forEach(st => ink(L, st, 1, am * .9));
      for (const c of [L.wet, L.dry]) c.globalCompositeOperation = 'destination-out';
      yinLift.forEach(st => ink(L, st, 1, am * .8));                          // 尾部的飞白
      for (const c of [L.wet, L.dry]) c.restore();
    }
    ink(L, rim, clamp((pY + pN) / 2 * 1.02), am);
    if (eyeW > 0 && pN > .9) { liftEllipse(L, 0, H, R * .13 * eyeW, R * .13 * eyeW, am); ink(L, eyeRing, eyeW, am * .7); }
    if (hub > 0) {
      const hr = R * .215 * hub;
      liftEllipse(L, 0, 0, hr, hr, am); L.col.save(); L.col.globalCompositeOperation = 'destination-out'; L.col.beginPath(); L.col.arc(0, 0, hr, 0, 7); L.col.fill(); L.col.restore();
      tint(L.col, 0, 0, hr * .94, hr * .94, PIG.honey, .42 * am * hub, 0, .3);
      ink(L, hubRing, hub, am);
    }
    if (eyeB > 0 && pY > .9) pill(L, 0, -H - 260 * (1 - eyeB) * (1 - eyeB), R * .135 * (.6 + .4 * eyeB), { g: 1, seed: 5, am: clamp(eyeB * 3) * am, shadow: false });
  });
  if (hub > .5) { const gs = R * .34 * s; writeGlyph(A, cam, '土', cx - gs / 2, cy - gs / 2 - 2 * s, gs, seg(hub, .5, 1), { dry: .14, seed: 5, alpha: am }); A.xf(cam.s, cam.tx, cam.ty); }
}

// 病：一个漏的圆
const leak = [
  mk(arc(C[0], C[1], R, R, 2.25, 5.1, 40), { w: 30, tone: .5, dry: .78, wet: .2, prof: 'lens', nb: 40, seed: 21, gapLen: 700 }),
  mk(arc(C[0], C[1], R, R, 5.5, 7.1, 26), { w: 26, tone: .44, dry: .82, wet: .2, prof: 'lens', nb: 36, seed: 22, gapLen: 500 }),
];
const drips = Array.from({ length: 9 }, (_, i) => { const R2 = mulberry(i + 3); return { x: C[0] - 70 + R2() * 150, t0: R2() * 1.1, v: 170 + R2() * 130, r: 5 + R2() * 7, sd: i }; });
const POS = { '木': [C[0] - R - 152, C[1] - 52, 104], '火': [C[0] - 52, C[1] - R - 142, 104], '金': [C[0] + R + 48, C[1] - 52, 104], '水': [C[0] - 52, C[1] + R + 36, 104] };
const small = { font: KAI, tone: .7, wet: .12, gap: 1.1 };

export function paint(A, t, cam) {
  const L = A.ink, cc = A.cc, W = T.wuxing;
  A.xf(cam.s, cam.tx, cam.ty);
  const out = seg(t, W.spin[0], W.spin[0] + .7), keep = 1 - out;                // 收束时题字退去
  // ---- 病 ----
  const sick = seg(t, W.sick[0], W.sick[0] + .6) * (1 - seg(t, W.earth - .1, W.earth + .7));
  if (sick > 0) {
    leak.forEach((s, i) => ink(L, s, eo(seg(t, W.sick[0] + i * .2, W.sick[0] + .5 + i * .2)), sick));
    for (const d of drips) {
      const u = (t - W.sick[0] - .4 - d.t0); if (u <= 0) continue;
      const y = C[1] + R * .96 + d.v * u * u * .5 + 20 * u;
      blot(L.wet, d.x, y, d.r, .5 * sick * clamp(1.4 - u * .5), 0, 1.5, d.sd);
      ink(L, mk([[d.x, y - 50 - 40 * u], [d.x, y - 6]], { w: 3, tone: .3, dry: .5, wet: .6, prof: 'tip', seed: 60 + d.sd }), 1, .5 * sick);
    }
    column(A, cam, '泄而不藏', -620, -190, 60, seg(t, W.sick[0] + .5, W.sick[0] + 1.2), { am: sick });
    column(A, cam, '木郁风动', -548, -190, 60, seg(t, W.sick[0] + .1, W.sick[0] + .7), { am: sick });
    column(A, cam, '虚劳之病 率在厥阴风木一经', 600, -230, 31, seg(t, W.sick[0] + .3, W.sick[0] + 1.3), { am: sick, tone: .8 });
    column(A, cam, '肝脾阳虚 生气不达', 648, -230, 31, seg(t, W.sick[0] + .1, W.sick[0] + .9), { am: sick, tone: .8 });
    column(A, cam, '金匮悬解', 552, -230, 23, seg(t, W.sick[0] + 1.2, W.sick[0] + 1.5), { ...small, am: sick, tone: .6 });
    A.xf(cam.s, cam.tx, cam.ty);
  }
  // ---- 太极 ----
  const hub = seg(t, W.earth, W.earth + .7), pY = ss(seg(t, W.yang[0], W.yang[1])), pN = ss(seg(t, W.yin[0], W.yin[1]));
  const f = seg(t, W.spin[0], W.spin[1]);
  if (hub > 0 && f < 1) {
    const sc = lerp(1, .3, ss(f)), rot = 9 * f * f * f;
    if (pN > 0 && keep > 0) { spatter(L.dry, C[0] + 230, C[1] + 210, 150, 110, 40, { seed: 5, a: .6 * pN * keep, r0: 1, r1: 3.4, p: pN }); blot(L.wet, C[0] + 286, C[1] + 196, 26, .2 * pN * keep, 1, .8, 3); blot(L.wet, C[0] + 250, C[1] + 262, 14, .26 * pN * keep, 2, .9, 4); }
    taiji(A, cam, C[0], C[1], sc, rot, { pY, pN, eyeW: seg(t, W.eyes, W.eyes + .3), eyeB: seg(t, W.eyes + .35, W.eyes + .8), hub: hub * (1 - seg(f, .1, .5)), am: 1 });
  }
  if (f > .45) pill(L, C[0], C[1], lerp(R * .5, R * .3, ss(seg(f, .45, 1))), { g: ss(seg(f, .6, 1)), seed: 5, am: ss(seg(f, .45, .85)), shadow: false });
  if (keep <= 0) return;
  // ---- 四方的大字、方位天干、五色 ----
  const ph = { '木': seg(t, W.yang[0], W.yang[0] + .5), '火': seg(t, lerp(W.yang[0], W.yang[1], .6), W.yang[1]), '金': seg(t, W.yin[0], W.yin[0] + .5), '水': seg(t, lerp(W.yin[0], W.yin[1], .6), W.yin[1]) };
  tint(cc, POS['木'][0] + 52, C[1] + 6, 78, 70, PIG.green, .36 * ph['木'] * keep);
  tint(cc, C[0] + 6, POS['火'][1] + 56, 60, 54, VERM, .3 * ph['火'] * keep);
  tint(cc, C[0] + 4, POS['水'][1] + 56, 74, 60, PIG.indigo, .34 * ph['水'] * keep);
  for (const ch of ['木', '火', '金', '水']) if (ph[ch] > 0) writeGlyph(A, cam, ch, ...POS[ch], ph[ch], { dry: .16, seed: ch.charCodeAt(0) % 97, alpha: keep });
  A.xf(cam.s, cam.tx, cam.ty);
  const lab = (txt, x, y, k, al = 'center') => line(A, cam, txt, x, y, 25, k * .78 * keep, { align: al, sp: 5, wet: .12 });
  lab('东方甲乙', POS['木'][0] + 52, C[1] - 82, ph['木']); lab('西方庚辛', POS['金'][0] + 52, C[1] - 82, ph['金']);
  lab('南方丙丁', C[0] + 76, POS['火'][1] + 30, ph['火'], 'left'); lab('北方壬癸', C[0] + 76, POS['水'][1] + 44, ph['水'], 'left');
  line(A, cam, '柴胡白蔹 泻相火而疏甲木', C[0] + 76, POS['火'][1] + 70, 28, ph['火'] * .86 * keep, { sp: 2, wet: .14 });
  line(A, cam, '元气在肺 元阳在肾', C[0] + 76, POS['水'][1] + 82, 28, ph['水'] * .86 * keep, { sp: 2, wet: .14 });
  // ---- 《金匮悬解》方解：左木右金，下为中土 ----
  const q = (txt, x, y, size, a, b, o = {}) => column(A, cam, txt, x, y, size, seg(t, a, b), { am: keep, tone: .9, gap: 1.06, ...o });
  const y0 = W.yang[0], n0 = W.yin[0], e0 = W.earth;
  q('肝主生发', -486, -250, 44, y0 + .1, y0 + .6);
  q('归胶滋肝而养血', -546, -250, 30, y0 + .5, y0 + 1.1); q('地芍润木而清风', -590, -250, 30, y0 + .8, y0 + 1.4); q('芎桂疏郁而升陷', -634, -250, 30, y0 + 1.1, y0 + 1.7);
  q('以助乙木之生发', -690, -250, 34, y0 + 1.5, y0 + 2.1);
  q('肺主收敛', 486, -250, 44, n0 + .1, n0 + .6);
  q('薯蓣敛肺而保精', 546, -250, 30, n0 + .5, n0 + 1.1); q('麦冬清金而宁神', 590, -250, 30, n0 + .8, n0 + 1.4); q('桔杏破壅而降逆', 634, -250, 30, n0 + 1.1, n0 + 1.7);
  q('以助辛金之收敛', 690, -250, 34, n0 + 1.5, n0 + 2.1);
  q('中央戊己', -560, 150, 25, e0 + .1, e0 + .5, { ...small }); q('土位在中', -606, 150, 40, e0 + .2, e0 + .7); q('是为升降金木之枢', -660, 150, 31, e0 + .6, e0 + 1.4);
  q('大枣补己土之精', 560, 150, 30, e0 + .9, e0 + 1.5); q('人参补戊土之气', 604, 150, 30, e0 + 1.2, e0 + 1.8); q('苓术甘草培土泻湿', 648, 150, 30, e0 + 1.5, e0 + 2.1); q('神曲干姜消滞温寒', 692, 150, 30, e0 + 1.8, e0 + 2.4);
  q('阴中求阳', -410, 250, 38, W.eyes, W.eyes + .4); q('阳中求阴', 410, 250, 38, W.eyes + .35, W.eyes + .8);
  column(A, cam, '黄元御 金匮悬解', 880, 250, 23, seg(t, e0 + 1, e0 + 1.5), { ...small, am: keep, tone: .58 });
  A.xf(cam.s, cam.tx, cam.ty);
}
