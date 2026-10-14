// 陆 出丹：仰视一座浓墨重鼎，鼎足没入雾里；启盖，一丸自气中升起。腹中一点朱红，是熬蜜的那点火
import { mk, draw as ink, blot, mass, arc, disc, wash, local, lift, liftEllipse, liftPoly, pill, Paint, VERM, tint, PIG } from '../engine/kit.js';
import { column, KAI } from '../engine/text.js';
import { T } from '../story.js';
import { clamp, lerp, eo, ss, seg, mulberry } from '/core/lib.js';

const MY = -30, RX = 356;                                   // 鼎口的高度与半宽
const belly = [...arc(0, MY, RX - 6, 340, 0, Math.PI, 30)];
const heavy = (w, sd, o = {}) => ({ w, tone: .95, brWet: true, body: .6, dry: .36, wet: .7, prof: 'press', side: .8, seed: sd, ...o });
const ding = new Paint();
{
  const t0 = T.ding.in;
  // 两足（先画，鼎腹压在上面）：兽蹄形，上粗、收腰、蹄外撇
  for (const sd of [-1, 1]) {
    ding.s([[sd * 214, 236], [sd * 250, 330], [sd * 262, 420], [sd * 300, 520], [sd * 330, 600]], heavy(96, 20 + sd, { darkDir: [sd, 0], prof: s => (1 - .42 * Math.sin(Math.PI * Math.min(1, s * 1.25))) }), t0 + .1, .35);
  }
  ding.s([[0, 280], [2, 380], [0, 470], [6, 560]], heavy(74, 19, { tone: .62, darkDir: [1, 0], prof: s => (1 - .4 * Math.sin(Math.PI * Math.min(1, s * 1.25))) }), t0, .3);
  // 鼎腹：一大块湿墨 + 沿腹的重笔
  ding.f((L, p) => {
    liftPoly(L, belly, p);
    mass(L.wet, belly, .8 * p, 4, 5, [-RX, 0, RX, 0, 1.15, .78]);
    mass(L.dry, belly.map(q => [q[0] * .97, MY + (q[1] - MY) * .97]), .5 * p, 3, 6, [-RX, 0, RX, 0, 1.1, .6]);
  }, t0 + .25, .5);
  ding.s(arc(0, MY, RX - 30, 318, Math.PI, Math.PI * .52, 22), heavy(74, 31, { darkDir: [-1, .3] }), t0 + .4, .4);
  ding.s(arc(0, MY, RX - 34, 318, 0, Math.PI * .46, 22), heavy(60, 32, { darkDir: [1, .5], tone: .85, dry: .5 }), t0 + .5, .4);
  // 双耳
  for (const sd of [-1, 1]) ding.s([[sd * 262, MY - 8], [sd * 270, MY - 150], [sd * 300, MY - 226], [sd * 350, MY - 214], [sd * 366, MY - 120], [sd * 362, MY - 4]], heavy(40, 40 + sd, { darkDir: [sd, -1], prof: 'even' }), t0 + .7, .3);
  // 口沿：后弧轻、前弧重
  ding.s(arc(0, MY, RX, 54, Math.PI + .04, 6.24, 26), { w: 14, tone: .8, dry: .42, wet: .5, prof: 'even', seed: 51 }, t0 + .85, .25);
  ding.f((L, p) => { liftEllipse(L, 0, MY + 2, RX - 14, 44, p); wash(L.wet, 0, MY + 4, RX - 20, 40, .86 * p, 52); disc(L.dry, 0, MY + 6, RX - 60, .5 * p, .03, 53, .1); }, t0 + .95, .2);
  ding.s(arc(0, MY, RX, 54, -.03, Math.PI + .03, 30), heavy(38, 54, { darkDir: [0, 1], prof: 'even', tone: .97 }), t0 + 1.0, .35);
}
// 腹上一圈回纹（留白刻出）
function fret(L, am) {
  if (am <= 0) return;
  lift(L, c => {
    c.globalAlpha = .82 * am; c.lineWidth = 5; c.lineCap = 'square'; c.lineJoin = 'miter';
    const band = (y0, ry) => { c.beginPath(); for (let i = 0; i <= 40; i++) { const a = lerp(2.86, .28, i / 40), x = Math.cos(a) * (RX - 26), y = y0 + Math.sin(a) * ry; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); };
    band(MY + 20, 96); band(MY + 20, 196);
    for (let i = 0; i < 9; i++) {
      const a = lerp(2.62, .52, i / 8), x = Math.cos(a) * (RX - 40), y = MY + 20 + Math.sin(a) * 146, s = 21 * (.62 + .38 * Math.sin(a)), sx = s * (.35 + .65 * Math.sin(a));
      c.beginPath(); c.moveTo(x - sx, y + s); c.lineTo(x - sx, y - s); c.lineTo(x + sx, y - s); c.lineTo(x + sx, y + s * .4); c.lineTo(x - sx * .2, y + s * .4); c.lineTo(x - sx * .2, y - s * .3); c.stroke();
    }
  });
}
const qi = [-1, 1, 0].map((sd, i) => mk([[sd * 60, MY - 10], [sd * 110, MY - 150], [sd * 40, MY - 300], [sd * 96, MY - 440], [sd * 30, MY - 560]], { w: 86 - i * 14, tone: .1, dry: .1, wet: 1, prof: 'lens', rough: .5, seed: 60 + i }));
const lid = new Paint();
lid.f((L, p) => { mass(L.wet, [...arc(0, 0, 330, 150, Math.PI, 6.2832, 20), [330, 14], [-330, 14]], .34 * p, 4, 71, [0, -150, 0, 14, .6, 1.2]); }, 0, 1);
lid.s(arc(0, 0, 330, 150, Math.PI, 6.2832, 24), { w: 26, tone: .7, darkDir: [0, -1], side: .8, brWet: true, body: .4, dry: .45, wet: .8, prof: 'even', seed: 72 }, 0, 1);
lid.s(arc(0, 6, 334, 40, 0, Math.PI, 20), { w: 16, tone: .7, dry: .45, wet: .6, prof: 'even', seed: 73 }, 0, 1);
lid.s(arc(0, -168, 40, 30, 2.4, 7.0, 14), { w: 16, tone: .7, dry: .4, wet: .7, prof: 'even', seed: 74 }, 0, 1);

export const PILL0 = [0, MY - 30, 62];
export function pillPos(t) { const u = ss(seg(t, T.ding.rise[0], T.ding.rise[1])); return [0, lerp(MY + 40, MY - 236, u), 62]; }

export function paint(A, t, cam) {
  const L = A.ink, D = T.ding;
  A.xf(cam.s, cam.tx, cam.ty);
  const open = ss(seg(t, D.open[0], D.open[1]));
  tint(A.cc, 0, MY + 150, 330, 250, PIG.umber, .12 * seg(t, D.in + .4, D.in + 1.2), 0, .4);   // 铜色的一点暖
  // 气：自鼎口升起
  qi.forEach((s, i) => { const u = ((t - D.open[0]) * .16 + i * .37) % 1; if (t > D.open[0]) ink(L, s, clamp(u * 1.5 + .3), open * (.7 + .3 * Math.sin(u * Math.PI)) * 1.2); });
  // 盖：升起、倾侧、化入雾中
  if (t > D.in + 1) {
    const la = (1 - .85 * open) * seg(t, D.in + 1, D.in + 1.4);
    local(A, -40 * open, MY - 26 - 330 * open, -.16 * open, 1, 1, () => {
      const c = { ...A, ink: A.ink };
      lid.ops.forEach(op => { if (op.s) ink(A.ink, op.s, 1, la); else { op.fn(A.ink, la, A); } });
    });
  }
  ding.draw(A, t);
  const bp = seg(t, D.in + .9, D.in + 1.4);
  fret(L, bp);
  // 火门：腹下一孔，炭火朱红
  if (bp > 0) {
    liftEllipse(L, 0, MY + 258, 58, 34, bp);
    wash(L.wet, 0, MY + 262, 54, 30, .6 * bp, 81);
    const R = mulberry(4), c = A.cc;
    for (let i = 0; i < 6; i++) {
      const x = -38 + R() * 76, y = MY + 254 + R() * 18, r = 10 + R() * 9, fl = .6 + .4 * Math.sin(t * (6 + i) + i);
      c.save(); c.globalAlpha = clamp(bp * fl); c.fillStyle = `rgb(${VERM.join(',')})`; c.beginPath(); c.ellipse(x, y, r, r * .55, R() * 3, 0, 7); c.fill(); c.restore();
    }
  }
  // 鼎足没入雾：越往下越淡
  lift(L, c => { const g = c.createLinearGradient(0, 380, 0, 545); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); c.fillStyle = g; c.fillRect(-960, 380, 1920, 200); });
  for (const [x, y, rx, a, sd] of [[-420, 470, 420, .12, 1], [330, 500, 480, .1, 2], [-60, 520, 560, .09, 3]]) wash(L.wet, x, y, rx, 34, a * seg(t, D.in, D.in + 1), sd + 90);
  // 一丸
  if (t >= D.rise[0]) {
    const [px, py, pr] = pillPos(t), u = seg(t, D.rise[0], D.rise[1]);
    liftEllipse(L, px, py, pr * 1.9, pr * 1.9, .5 * u, 0, ['wet']);
    pill(L, px, py, pr, { g: 1, seed: 3, shadow: false, am: clamp(u * 4) });
  }
  column(A, cam, '虚劳诸不足', 700, -380, 62, seg(t, D.rise[0] + .2, D.rise[0] + 1.2));
  column(A, cam, '风气百疾', -700, -380, 62, seg(t, D.rise[0] + 1.2, D.rise[0] + 2.0));
  const sm = { tone: .86, gap: 1.06 };
  column(A, cam, '上二十一味末之', 724, -10, 30, seg(t, D.rise[0] + 1.4, D.rise[0] + 2.1), sm);
  column(A, cam, '炼蜜和丸如弹子大', 680, -10, 30, seg(t, D.rise[0] + 1.8, D.rise[0] + 2.6), sm);
  column(A, cam, '金匮要略', 636, -10, 23, seg(t, D.rise[0] + 2.5, D.rise[0] + 2.8), { font: KAI, tone: .6, wet: .12, gap: 1.15 });
  column(A, cam, '仲景故为虚劳诸不足', -680, -60, 30, seg(t, D.rise[0] + 2.0, D.rise[0] + 2.8), sm);
  column(A, cam, '而带风气百疾立此方', -724, -60, 30, seg(t, D.rise[0] + 2.5, D.rise[0] + 3.3), sm);
  column(A, cam, '金匮要略辑义', -768, -60, 23, seg(t, D.rise[0] + 3.2, D.rise[0] + 3.5), { font: KAI, tone: .6, wet: .12, gap: 1.15 });
  column(A, cam, '陆 出丹', 900, -420, 28, seg(t, D.in + .5, D.in + 1), { tone: .8 });
  A.xf(cam.s, cam.tx, cam.ty);
}
