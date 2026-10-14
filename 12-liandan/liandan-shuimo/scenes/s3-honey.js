// 叁 炼蜜：炭炉上一口锅。蜜 = 湿笔晕染；泡 = 墨圈，由疏而大变密而细；炉火是全片的那一点朱红
import { mk, draw as ink, blot, mass, arc, disc, wash, local, lift, liftEllipse, liftPoly, spatter, Paint, VERM, tint, PIG } from '../engine/kit.js';
import { column, KAI } from '../engine/text.js';
import { T } from '../story.js';
import { clamp, lerp, eo, ss, seg, mulberry } from '/core/lib.js';

const RIM = [0, -30, 336, 76];                  // 锅口椭圆
const stove = new Paint(), pot = new Paint();
{
  const t0 = T.honey.in;
  // 炭炉：矮圆桶，正面一个火门
  stove.f((L, p) => {
    mass(L.wet, [[-252, 176], [252, 176], [236, 410], [-236, 410]], .2 * p, 3, 3, [-250, 0, 250, 0, .7, 1.3]);
    wash(L.wet, 10, 426, 320, 22, .14 * p, 4);
  }, t0, .4);
  stove.s([[-252, 172], [-250, 290], [-236, 408]], { w: 8, tone: .8, dry: .45, wet: .3, prof: 'brush', seed: 11 }, t0, .2);
  stove.s([[252, 172], [250, 290], [236, 408]], { w: 13, tone: .9, darkDir: [1, 0], side: .8, brWet: true, body: .45, dry: .42, wet: .7, prof: 'press', seed: 12 }, t0 + .05, .2);
  stove.s(arc(0, 404, 236, 30, .06, 3.08, 20), { w: 10, tone: .88, dry: .42, wet: .5, prof: 'even', seed: 13 }, t0 + .15, .22);
  stove.s(arc(0, 196, 250, 34, .5, 2.64, 16), { w: 3, tone: .5, dry: .5, prof: 'even', seed: 14 }, t0 + .2, .15);
  for (let i = 0; i < 5; i++) stove.s([[-210 + i * 20, 250 + i * 28], [-20 + i * 30, 262 + i * 27], [150 + i * 16, 248 + i * 30]], { w: 16, tone: .26, dry: .82, wet: .1, prof: 'lens', seed: 20 + i }, t0 + .2 + i * .03, .2);
  // 锅：两道锅身、锅口前后两弧、双耳
  pot.f((L, p) => {
    const body = [...arc(RIM[0], RIM[1], RIM[2], RIM[3], 0, Math.PI, 20), [-318, 36], [-278, 110], [-216, 172], [216, 172], [278, 110], [318, 36]];
    mass(L.wet, body, .3 * p, 3, 7, [0, -20, 0, 180, .5, 1.5]);
  }, t0 + .3, .4);
  pot.s([[-RIM[2], RIM[1]], [-320, 34], [-280, 108], [-216, 172]], { w: 9, tone: .84, dry: .45, wet: .4, prof: 'brush', seed: 31 }, t0 + .3, .2);
  pot.s([[RIM[2], RIM[1]], [320, 34], [280, 108], [216, 172]], { w: 15, tone: .92, darkDir: [1, 1], side: .8, brWet: true, body: .45, dry: .4, wet: .7, prof: 'press', seed: 32 }, t0 + .36, .2);
  pot.s(arc(RIM[0], RIM[1], RIM[2], RIM[3], Math.PI + .03, 6.25, 26), { w: 5, tone: .66, dry: .45, wet: .3, prof: 'even', seed: 33 }, t0 + .45, .2);
  pot.s(arc(RIM[0], RIM[1], RIM[2], RIM[3], -.02, Math.PI + .02, 26), { w: 12, tone: .93, dry: .38, wet: .5, prof: 'even', seed: 34, darkDir: [0, 1], side: .5, brWet: true }, t0 + .55, .26);
  for (const sd of [-1, 1]) pot.s(arc(sd * 356, -8, 30, 40, sd > 0 ? -1.9 : -1.24, sd > 0 ? 1.7 : 4.84, 12), { w: 8, tone: .88, dry: .42, wet: .4, prof: 'even', seed: 36 + sd }, t0 + .7, .14);
}
// 泡：位置固定，各有生灭的时刻
const BUB = [];
{
  const R = mulberry(5);
  for (let i = 0; i < 150; i++) {
    const a = R() * 6.2832, d = Math.sqrt(R()) * .86;
    BUB.push({ x: RIM[0] + Math.cos(a) * d * 296, y: RIM[1] + 6 + Math.sin(a) * d * 58, u: R(), life: .5 + R() * .5, sd: i, k: R() });
  }
}
const rimFront = mk(arc(RIM[0], RIM[1], RIM[2], RIM[3], -.02, Math.PI + .02, 26), { w: 12, tone: .93, dry: .38, wet: .5, prof: 'even', seed: 34, darkDir: [0, 1], side: .5, brWet: true });
const steam = [0, 1, 2, 3].map(i => {
  const x = -200 + i * 132, s = i % 2 ? 1 : -1;
  return mk([[x, -70], [x + 22 * s, -170], [x - 16 * s, -280], [x + 26 * s, -390], [x + 60 * s, -500]], { w: 38 + i * 6, tone: .075, dry: .1, wet: 1, prof: 'lens', rough: .5, seed: 40 + i });
});

// 蜜面：cook 0→1（嫩 → 中蜜），可单独放大给特写用
export function honeySurface(L, t, cook, am = 1) {
  t = Math.min(t, T.honey.hush[0]);                              // 静场：泡停在最细的一刻
  tint(L.col, RIM[0], RIM[1] + 5, 306, 63, PIG.honey, lerp(.36, .62, cook) * am, 0, .16); tint(L.col, RIM[0], RIM[1] + 5, 300, 60, PIG.umber, .2 * Math.pow(cook, 2) * am, 0, .3);   // 蜜色：淡黄熬到浅褐
  wash(L.wet, RIM[0], RIM[1] + 5, 304, 62, lerp(.1, .24, cook) * am, 51);
  wash(L.wet, RIM[0] - 60, RIM[1] + 10, 190, 38, lerp(.03, .1, cook) * am, 52);
  lift(L, c => { c.globalAlpha = .5 * am; c.beginPath(); c.ellipse(RIM[0] - 120, RIM[1] - 16, 96, 9, -.05, 0, 7); c.fill(); }, ['wet']);     // 蜜面的一道光
  for (const b of BUB) {
    const born = lerp(T.honey.boil[0], T.honey.boil[1], b.u), age = (t - born) / b.life;
    if (age <= 0) continue;
    // 越往后起的泡越小越密；老泡破掉后原地再起细泡
    const fine = clamp((t - T.honey.boil[0]) / (T.honey.boil[1] - T.honey.boil[0]));
    const cyc = age % 1, r = lerp(24, 6.5, clamp(fine * 1.1 - b.k * .25)) * (.5 + .5 * eo(cyc * 2.5)), al = (cyc < .8 ? 1 : (1 - cyc) / .2) * am;
    ink(L, mk(arc(b.x, b.y, r, r * .42, b.k * 6, b.k * 6 + 5.7, 14), { w: 1.5 + r * .05, tone: lerp(.62, .4, r / 24), dry: .45, wet: .5, prof: 'brush', seed: b.sd * 7 + Math.floor(age) }), 1, al * .85);
    lift(L, c => { c.globalAlpha = .7 * al; c.beginPath(); c.ellipse(b.x - r * .3, b.y - r * .12, r * .3, r * .09, -.3, 0, 7); c.fill(); });
  }
}

export function paint(A, t, cam) {
  const L = A.ink, H = T.honey;
  A.xf(cam.s, cam.tx, cam.ty);
  const fire = 1 - .85 * ss(seg(t, H.off, H.off + .5));          // 离火后火暗下去
  stove.draw(A, t);
  // 火门：挖出一个洞，里头是炭与火
  const dp = seg(t, H.in + .3, H.in + .6);
  if (dp > 0) {
    const door = [...arc(0, 330, 74, 78, Math.PI, 6.2832, 12), [74, 402], [-74, 402]];
    liftPoly(L, door, dp);
    mass(L.wet, door, .5 * dp, 2, 61, [0, 250, 0, 400, 1.3, .5]);
    ink(L, mk([[-74, 402], [-76, 330], [-50, 268], [0, 250], [50, 268], [76, 330], [74, 402]], { w: 11, tone: .92, dry: .4, wet: .5, prof: 'even', seed: 62 }), dp);
    const R = mulberry(9), c = A.cc;
    for (let i = 0; i < 7; i++) {
      const x = -48 + R() * 96, y = 352 + R() * 40, r = 9 + R() * 9;
      blot(L.wet, x, y + 4, r * 1.15, .75 * dp, R() * 3, .75, i);
      const fl = .55 + .45 * Math.sin(t * (5 + i) + i * 2);
      c.save(); c.globalAlpha = clamp(dp * fire * (.5 + .5 * fl)); c.fillStyle = `rgb(${VERM.join(',')})`; c.beginPath(); c.ellipse(x, y - 2, r * .7, r * .42, R() * 3, 0, 7); c.fill(); c.restore();
    }
  }
  const up = -54 * ss(seg(t, H.off, H.off + .45));                // 离火：锅提起来
  local(A, 0, up, 0, 1, 1, () => {
    pot.draw(A, t);
    const hp = seg(t, H.in + .5, H.in + 1.0);
    if (hp > 0) {
      liftEllipse(L, RIM[0], RIM[1] + 4, 318, 66, hp);
      A.cc.save(); A.cc.globalCompositeOperation = 'destination-out'; A.cc.beginPath(); A.cc.ellipse(RIM[0], RIM[1] + 4, 318, 66, 0, 0, 7); A.cc.fill(); A.cc.restore();
      honeySurface(L, t, seg(t, H.boil[0], H.boil[1]), hp);
      ink(L, rimFront, 1, hp);
      const still = t > H.hush[0] && t < H.hush[1];
      if (!still) steam.forEach((s, i) => { const u = (t * .22 + i * .31) % 1; ink(L, s, clamp(u * 1.6), hp * fire * Math.sin(u * Math.PI) * 1.1); });
    }
  });
  // 特写里的题：字写得很小，放大后正合适
  const ek = seg(t, H.ecu + .2, H.ecu + .9) * (1 - seg(t, H.off, H.off + .05));
  if (ek > 0) {
    column(A, cam, '鱼眼泡', -250, -78, 15, ek, { gap: 1.1 });
    column(A, cam, '泡由粗转细 绵密泛光', -268, -78, 7.4, seg(t, H.ecu + .7, H.ecu + 1.5), { font: KAI, tone: .72, wet: .12, gap: 1.12 });
    column(A, cam, '嫩蜜 中蜜 老蜜 火候只在中蜜', 262, -74, 7.4, seg(t, H.ecu + 1.0, H.ecu + 1.8), { font: KAI, tone: .72, wet: .12, gap: 1.12 });
    A.xf(cam.s, cam.tx, cam.ty);
  }
  column(A, cam, '叁 炼蜜', 908, -420, 30, seg(t, H.in + .2, H.in + .7), { tone: .8 });
  column(A, cam, '火候只在一线', -700, -330, 54, seg(t, H.in + .9, H.in + 1.9));
  column(A, cam, '椴花白蜜 文火慢熬', -628, -330, 25, seg(t, H.in + 1.4, H.in + 2.2), { font: KAI, tone: .62, wet: .12, gap: 1.14 });
  A.xf(cam.s, cam.tx, cam.ty);
}
