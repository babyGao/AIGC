// 道具与景物：都用笔墨引擎画（湿层晕开、干层飞白、颜色层只放纸色光与朱砂）。坐标为当前画布变换下的世界坐标。
import { mk, draw, drawSeq, blot, mass, qpts, TONE } from '../engine/ink.js';
import { clamp, lerp, mulberry, vnoise, eo, ss } from '/core/lib.js';

export const PAPER = [242, 236, 222];
const TAU = Math.PI * 2;
const R2 = (seed) => mulberry(seed);

// —— 基础 ——
// 整片淡墨（夜色、阴天）：上浓下淡的渐变，边缘不齐
export function wash(c, x0, y0, x1, y1, a0, a1 = a0, seed = 1) {
  if (Math.max(a0, a1) <= .003) return;
  const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(0,0,0,${clamp(a0)})`); g.addColorStop(1, `rgba(0,0,0,${clamp(a1)})`);
  c.save(); c.globalAlpha = 1; c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, y1 - y0); c.restore();
}
// 在湿层挖出一块亮（留白）：软边圆
export function lift(c, x, y, r, a = 1, soft = .5) {
  c.save(); c.globalCompositeOperation = 'destination-out';
  const g = c.createRadialGradient(x, y, r * (1 - soft), x, y, r); g.addColorStop(0, `rgba(0,0,0,${clamp(a)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
}
// 颜色层上的纸色光（夜里的灯、星、雪）
export function glow(c, x, y, r, a = 1, rgb = PAPER) {
  if (a <= .003) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb.join(',')},${clamp(a)})`); g.addColorStop(.35, `rgba(${rgb.join(',')},${clamp(a * .55)})`); g.addColorStop(1, `rgba(${rgb.join(',')},0)`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
export function dot(c, x, y, r, a, rgb = PAPER) { if (a <= .003) return; c.fillStyle = `rgba(${rgb.join(',')},${clamp(a)})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }

// —— 天 ——
// 月：四周烘一圈淡墨（烘云托月），月本身是纸白；ring = 一圈极淡的勾
export function moon(L, x, y, r, am = 1, seed = 3) {
  const c = L.wet;
  c.save(); c.globalAlpha = am;
  const g = c.createRadialGradient(x, y, r * .98, x, y, r * 3.2); g.addColorStop(0, 'rgba(0,0,0,.34)'); g.addColorStop(.4, 'rgba(0,0,0,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 3.2, 0, TAU); c.fill(); c.restore();
  lift(c, x, y, r * 1.02, am, .06);
  const pts = []; for (let i = 0; i <= 30; i++) { const a = -1.9 + i / 30 * TAU * .93; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  draw(L, mk(pts, { w: 2.2, tone: .3, dry: .6, wet: .3, prof: 'brush', seed }), 1, am * .7);
  glow(L.col, x, y, r * 1.25, .35 * am);
}
// 星河：在夜色淡墨里「揭」出一条弧形亮带（湿层挖淡、软边），带里点着纸白的星；rot 让整条星河绕中心转（命盘）
export function starRiver(L, cx, cy, R, rot, am = 1, o = {}) {
  if (am <= 0) return;
  const R0 = mulberry(o.seed ?? 21), n = o.n ?? 170, band = o.band ?? .22;
  const a0 = rot + (o.a0 ?? -2.6), a1 = rot + (o.a1 ?? -.5);
  const c = L.wet;
  c.save(); c.globalCompositeOperation = 'destination-out'; c.lineCap = 'round';
  for (const [wk, al, bl] of [[1.3, .35, 40], [.75, .45, 24], [.35, .5, 12]]) {
    c.filter = `blur(${bl}px)`; c.strokeStyle = `rgba(0,0,0,${al * am * (o.lift ?? 1)})`; c.lineWidth = R * band * wk;
    c.beginPath(); for (let i = 0; i <= 40; i++) { const a = lerp(a0, a1, i / 40), rr = R * (1 + Math.sin(i * .45) * .03); i ? c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : c.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } c.stroke();
  }
  c.restore();
  for (let i = 0; i < n; i++) {
    const a = lerp(a0, a1, R0()), g1 = R0() - .5, rr = R * (1 + g1 * Math.abs(g1) * 2 * band * (R0() < .75 ? 1 : 2.2)), sz = (1 + Math.pow(R0(), 3) * 3.4) * (o.starK ?? 1);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr, tw = .65 + .35 * Math.sin((o.t ?? 0) * (1.5 + R0() * 2) + i);
    dot(L.col, x, y, sz, am * tw);
    if (sz > 2.2) glow(L.col, x, y, sz * 6, am * tw * .3);
    if (sz > 3.8) { const c = L.col; c.save(); c.strokeStyle = `rgba(${PAPER.join(',')},${clamp(am * tw * .5)})`; c.lineWidth = .8; c.beginPath(); c.moveTo(x - sz * 4, y); c.lineTo(x + sz * 4, y); c.moveTo(x, y - sz * 4); c.lineTo(x, y + sz * 4); c.stroke(); c.restore(); }
  }
}
// 命盘：同心圆环 + 刻度 + 二十八宿的小星点，整体旋转
export function fateWheel(L, cx, cy, R, rot, am = 1, o = {}) {
  if (am <= 0) return;
  const rings = [1, .78, .55], light = o.light ?? false, pp = o.p ?? 1;
  const c = L.col;
  rings.forEach((k, i) => {
    const gap = .25 + i * .3, a0 = rot * (i % 2 ? -1 : 1) + gap, a1 = a0 + (TAU - .18) * clamp(pp);
    if (light) { c.save(); c.strokeStyle = `rgba(${PAPER.join(',')},${clamp(am * (.5 - i * .08))})`; c.lineWidth = 3 - i * .6; c.shadowColor = `rgba(${PAPER.join(',')},.6)`; c.shadowBlur = 8; c.beginPath(); c.arc(cx, cy, R * k, a0, a1); c.stroke(); c.restore(); }
    else { const pts = []; for (let j = 0; j <= 48; j++) { const a = a0 + j / 48 * (TAU - .18); pts.push([cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k]); } draw(L, mk(pts, { w: 3.2 - i * .6, tone: .45, dry: .55, wet: .3, prof: 'brush', seed: 80 + i }), clamp(pp), am * .8); }
  });
  const nT = 28;
  for (let j = 0; j < nT; j++) {
    const a = rot + j / nT * TAU, r0 = R * .8, r1 = R * (j % 7 === 0 ? .98 : .9), v = am * clamp((pp - j / nT * .6) / .4);
    if (v <= 0) continue;
    if (light) { c.save(); c.strokeStyle = `rgba(${PAPER.join(',')},${clamp(v * (j % 7 === 0 ? .7 : .4))})`; c.lineWidth = j % 7 === 0 ? 3 : 1.6; c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke(); c.restore(); }
    else draw(L, mk([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], { w: j % 7 === 0 ? 2.2 : 1.2, tone: .5, dry: .5, prof: 'tip', seed: 120 + j }), 1, v * .7);
  }
  const R0 = mulberry(o.seed ?? 33);
  for (let j = 0; j < 46; j++) {
    const ring = rings[j % 3], a = rot * (j % 3 === 1 ? -1 : 1) + R0() * TAU, x = cx + Math.cos(a) * R * ring * (.92 + R0() * .16), y = cy + Math.sin(a) * R * ring * (.92 + R0() * .16);
    dot(L.col, x, y, 1.4 + R0() * 2.4, am * .9);
  }
}

// —— 天气 ——
// 雨：一帧一组的细斜线（种子按帧变），light=true 时画在颜色层（夜里亮雨）
export function rain(L, t, o = {}) {
  const n = o.n ?? 160, ang = o.ang ?? .18, len = o.len ?? 70, am = o.am ?? 1; if (am <= 0) return;
  const R0 = mulberry(Math.floor(t * 24) * 7 + (o.seed ?? 1));
  const [x0, y0, x1, y1] = o.box ?? [0, 0, 1920, 1080];
  const c = o.light ? L.col : L.dry;
  c.save(); c.lineCap = 'round';
  c.strokeStyle = o.light ? `rgba(${PAPER.join(',')},1)` : 'rgba(0,0,0,1)';
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, R0()), y = lerp(y0, y1, R0()), l = len * (.5 + R0() * .8);
    c.globalAlpha = am * (o.light ? .22 + R0() * .3 : .12 + R0() * .18); c.lineWidth = (o.w ?? 1.4) * (.6 + R0() * .8);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.sin(ang) * l, y - Math.cos(ang) * l); c.stroke();
  }
  c.restore();
}
// 雪：纸白的小点，慢慢飘（确定性：位置是 t 的函数）
export function snow(L, t, o = {}) {
  const n = o.n ?? 140, am = o.am ?? 1; if (am <= 0) return;
  const R0 = mulberry(o.seed ?? 5), [x0, y0, x1, y1] = o.box ?? [0, 0, 1920, 1080], H = y1 - y0, W = x1 - x0;
  for (let i = 0; i < n; i++) {
    const sp = (o.speed ?? 60) * (.5 + R0()), ph = R0(), xs = R0(), sz = (o.size ?? 2.2) * (.5 + R0());
    const y = y0 + ((ph * H + t * sp) % H), x = x0 + ((xs * W + Math.sin(t * .8 + i) * 18 + t * sp * (o.drift ?? .35)) % W + W) % W;
    dot(L.col, x, y, sz, am * (.55 + .45 * R0()), o.rgb ?? [248, 245, 238]);
    if (o.ink) blot(L.dry, x, y, sz * .5, .15 * am, 0, 1, i);
  }
}
// 闪电：一道折线（颜色层纸白 + 外圈光）
export function bolt(L, x, y, h, am, seed = 1) {
  if (am <= 0) return;
  const R0 = mulberry(seed), pts = [[x, y]]; let cx = x, cy = y;
  while (cy < y + h) { cx += (R0() - .5) * 90; cy += 40 + R0() * 60; pts.push([cx, cy]); }
  const c = L.col; c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  for (const [w, a] of [[16, .12], [6, .4], [2.4, 1]]) { c.strokeStyle = `rgba(250,248,240,${clamp(a * am)})`; c.lineWidth = w; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); }
  c.restore();
}

// —— 地 ——
// 石拱桥（驼峰拱）：桥面一道弧、桥洞一道饱墨弧、栏杆短竖、倒影淡墨。dark = 夜里/闪电下的剪影浓度
const bq = (x0, y0, xc, yc, x1, y1, t) => { const u = 1 - t; return [u * u * x0 + 2 * u * t * xc + t * t * x1, u * u * y0 + 2 * u * t * yc + t * t * y1]; };
export function bridgeDeckY(x, y, w, xx, hk = .32) { const h = w * hk, xa = x - w * .62, xb = x + w * .62, t = clamp((xx - xa) / (xb - xa)); return bq(xa, y + 2, x, y - h * 2.3, xb, y + 2, t)[1]; }
export function bridge(L, x, y, w, o = {}) {
  const h = w * (o.hk ?? .32), am = o.am ?? 1, sd = o.seed ?? 40, dk = o.dark ?? 0;
  const deck = []; for (let i = 0; i <= 16; i++) deck.push(bq(x - w * .62, y + 2, x, y - h * 2.3, x + w * .62, y + 2, i / 16));
  const hole = []; for (let i = 0; i <= 16; i++) hole.push(bq(x - w * .4, y + 2, x, y - h * 1.9, x + w * .4, y + 2, i / 16));
  mass(L.wet, [...deck, ...hole.slice().reverse()], (.2 + dk * .6) * am, 4, sd);
  draw(L, mk(hole, { w: w * .04, tone: .8, darkDir: [0, 1], side: .8, brWet: true, body: .3, dry: .45, wet: .8, prof: 'brush', seed: sd + 1 }), 1, am);
  draw(L, mk(deck, { w: w * .016, tone: .85, dry: .45, wet: .3, prof: 'even', seed: sd + 2 }), 1, am);
  const rail = deck.map(p => [p[0], p[1] - w * .045]).slice(1, -1);
  draw(L, mk(rail, { w: w * .006, tone: .75, dry: .6, prof: 'tip', seed: sd + 3 }), 1, am);
  for (let i = 1; i < 16; i += 2) { const p = deck[i]; draw(L, mk([[p[0], p[1] - 2], [p[0], p[1] - w * .045]], { w: w * .008, tone: .8, dry: .5, prof: 'even', seed: sd + 10 + i }), 1, am); }
  // 桥洞里的石缝（几笔短横）
  for (let i = 0; i < 6; i++) { const p = hole[2 + i * 2]; draw(L, mk([[p[0] - w * .02, p[1] - w * .02], [p[0] + w * .02, p[1] - w * .022]], { w: 2, tone: .5, dry: .6, prof: 'tip', seed: sd + 30 + i }), 1, am * .7); }
  if (o.reflect !== false) {
    const ref = hole.map(p => [p[0], 2 * y - p[1] + 8]);
    draw(L, mk(ref, { w: w * .03, tone: .22, dry: .8, wet: .5, prof: 'lens', seed: sd + 5 }), 1, am * .7);
  }
  return { top: [x, y - h * 1.15 - w * .045], left: deck[2], right: deck[14] };
}
// 宅门：两柱、翘角屋檐、两扇门、门槛；open 0..1 门开
export function gate(L, x, y, s, o = {}) {
  const am = o.am ?? 1, sd = o.seed ?? 60, W = 260 * s, H = 300 * s, open = o.open ?? 0;
  const top = y - H;
  // 门洞里（开门时是亮的）
  if (open > 0 && o.lightIn) glow(L.col, x, y - H * .45, W * .55 * open, .8 * am * open);
  // 门扇（淡墨块 + 门钉）
  const dw = W * .36 * (1 - open * .85);
  for (const sgn of [-1, 1]) {
    const x0 = x + sgn * W * .02, x1 = x + sgn * (W * .02 + dw);
    mass(L.wet, [[x0, top + 40 * s], [x1, top + 40 * s], [x1, y], [x0, y]], .26 * am, 2, sd + sgn);
    draw(L, mk([[x1, top + 42 * s], [x1, y]], { w: 3 * s, tone: .7, dry: .5, prof: 'even', seed: sd + 3 + sgn }), 1, am);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) blot(L.dry, lerp(x0, x1, .3 + k * .4), top + (90 + r * 60) * s, 2.6 * s, .7 * am, 0, 1, sd + r * 3 + k);
  }
  // 柱
  for (const sgn of [-1, 1]) draw(L, mk([[x + sgn * W * .42, top + 20 * s], [x + sgn * W * .42, y + 4]], { w: 13 * s, tone: .8, darkDir: [sgn, 0], side: .8, brWet: true, body: .35, dry: .45, wet: .8, prof: 'even', seed: sd + 7 + sgn }), 1, am);
  // 檐：一笔浓墨弧 + 两端起翘 + 瓦垄短竖
  const eave = [[x - W * .72, top + 4 * s], [x - W * .55, top + 22 * s], [x, top + 26 * s], [x + W * .55, top + 22 * s], [x + W * .72, top + 4 * s]];
  mass(L.wet, [[x - W * .6, top + 22 * s], [x - W * .38, top - 34 * s], [x + W * .38, top - 34 * s], [x + W * .6, top + 22 * s]], .3 * am, 3 * s, sd + 9);
  draw(L, mk(eave, { w: 10 * s, tone: .92, dry: .35, wet: .4, prof: 'even', seed: sd + 10 }), 1, am);
  draw(L, mk([[x - W * .4, top - 34 * s], [x + W * .4, top - 34 * s]], { w: 7 * s, tone: .9, dry: .4, wet: .3, prof: 'even', seed: sd + 11 }), 1, am);
  for (let i = 0; i < 13; i++) { const u = i / 12, px = lerp(x - W * .52, x + W * .52, u); draw(L, mk([[px, top - 28 * s], [px + (u - .5) * 14 * s, top + 16 * s]], { w: 2.2 * s, tone: .6, dry: .6, prof: 'tip', seed: sd + 20 + i }), 1, am * .8); }
  // 门槛
  draw(L, mk([[x - W * .5, y + 2], [x + W * .5, y + 2]], { w: 9 * s, tone: .7, dry: .5, wet: .4, prof: 'even', seed: sd + 12 }), 1, am);
  return { top, W, H, lanternY: top + 70 * s, lanternX: [x - W * .62, x + W * .62] };
}

// 灯笼：纸身（淡墨勾两道弧 + 竹骨）、上下黑箍、穗；lit = 夜里亮（颜色层纸光）；blood 0..1 = 墨从顶上渗下来
export function lantern(L, x, y, s, o = {}) {
  const am = o.am ?? 1, sd = o.seed ?? 70, w = 46 * s, h = 58 * s, lit = o.lit ?? 0, blood = o.blood ?? 0, sw = o.sway ?? 0;
  const top = y - h / 2, bot = y + h / 2;
  draw(L, mk([[x, top - 26 * s], [x + sw * 4, top - 4 * s]], { w: 1.4 * s, tone: .8, dry: .4, prof: 'even', seed: sd }), 1, am);
  if (lit > 0) { glow(L.col, x, y, w * 1.6, .55 * lit * am, [255, 246, 226]); glow(L.col, x, y, w * .7, .8 * lit * am, [255, 250, 238]); }
  mass(L.wet, [...qpts(x - w * .2, top, x - w * .78, y, x - w * .2, bot, 8), ...qpts(x + w * .2, bot, x + w * .78, y, x + w * .2, top, 8)], (lit > 0 ? .04 : .1) * am, 1.5 * s, sd + 1);
  for (const sgn of [-1, 1]) draw(L, mk(qpts(x + sgn * w * .2, top, x + sgn * w * .78, y, x + sgn * w * .2, bot, 8), { w: 2.2 * s, tone: .7, dry: .45, wet: .3, prof: 'brush', seed: sd + 2 + sgn }), 1, am);
  for (const k of [-.25, 0, .25]) draw(L, mk(qpts(x + k * w * .3, top, x + k * w * 1.2, y, x + k * w * .3, bot, 6), { w: 1 * s, tone: .5, dry: .6, prof: 'tip', seed: sd + 6 + k * 8 }), 1, am * .8);
  for (const yy of [top, bot]) draw(L, mk([[x - w * .24, yy], [x + w * .24, yy]], { w: 6 * s, tone: .92, dry: .3, wet: .3, prof: 'even', seed: sd + 9 + yy }), 1, am);
  draw(L, mk([[x, bot + 3 * s], [x + sw * 3, bot + 22 * s]], { w: 3 * s, tone: .8, dry: .55, prof: 'cone', seed: sd + 12 }), 1, am);
  // 渗墨：从顶上的箍往下流，几道墨痕 + 一块越来越大的湿墨
  if (blood > 0) {
    const R0 = mulberry(sd + 99), b = eo(blood);
    mass(L.wet, [...qpts(x - w * .22, top + 2, x - w * .7 * Math.min(1, b * 1.3), top + h * .5 * b, x - w * .1, top + h * b * .95, 6), ...qpts(x + w * .14, top + h * b * .9, x + w * .65 * Math.min(1, b * 1.3), top + h * .45 * b, x + w * .22, top + 2, 6)], .55 * am * clamp(blood * 3), 3 * s, sd + 13);
    for (let i = 0; i < 6; i++) {
      const px = x + (R0() - .5) * w * 1.1, len = h * (.3 + R0() * .9) * b;
      draw(L, mk([[px, top + 4], [px + (R0() - .5) * 3, top + len * .6], [px, top + len]], { w: (2 + R0() * 3) * s, tone: .9, dry: .2, wet: .7, prof: 'cone', seed: sd + 20 + i }), 1, am * clamp(blood * 2 - i * .1));
      if (len > h * .85) blot(L.wet, px, top + len + 3 * s, 3 * s, .7 * am, 0, 1.3, sd + 30 + i);
    }
    if (blood > .6) for (let i = 0; i < 3; i++) { const dy = ((blood - .6) * 2.5 * 160 * s + i * 50 * s) % (160 * s); blot(L.wet, x + (i - 1) * w * .3, bot + 20 * s + dy, 2.5 * s, .6 * am, 0, 1.4, sd + 40 + i); }
  }
}

// 杏花枝：老枝一笔干笔 + 几根小枝 + 花（五瓣淡墨点 + 焦墨花蕊），bloom 0..1 按顺序开
export function blossomBranch(L, x, y, s, o = {}) {
  const am = o.am ?? 1, sd = o.seed ?? 90, flip = o.flip ?? 1, bloom = o.bloom ?? 1, sw = (o.wind ?? 0) * Math.sin((o.t ?? 0) * 1.3);
  const T = p => [x + p[0] * s * flip, y + p[1] * s];
  const trunk = [[0, 0], [40, -30], [90, -42], [150, -70], [210, -78], [270, -110]].map(p => [p[0], p[1] + (p[0] / 270) * sw * 8]);
  draw(L, mk(trunk.map(T), { w: 12 * s, tone: .85, darkDir: [0, 1], side: .8, brWet: true, body: .25, dry: .6, wet: .6, prof: 'press', seed: sd }), 1, am);
  const twigs = [[[90, -42], [110, -80], [125, -100]], [[150, -70], [175, -50], [205, -40]], [[210, -78], [225, -120], [215, -150]], [[40, -30], [60, -70], [55, -95]], [[270, -110], [300, -120], [330, -140]]];
  twigs.forEach((tw, i) => draw(L, mk(tw.map(p => [p[0], p[1] + (p[0] / 270) * sw * 8]).map(T), { w: 4 * s, tone: .85, dry: .6, wet: .2, prof: 'tip', seed: sd + 5 + i }), 1, am));
  const R0 = mulberry(sd + 7);
  const spots = [];
  for (const tw of [trunk, ...twigs]) for (let k = 1; k < tw.length; k++) if (R0() < .8) spots.push([lerp(tw[k - 1][0], tw[k][0], R0()), lerp(tw[k - 1][1], tw[k][1], R0()) - 6 + (R0() - .5) * 14]);
  spots.forEach((p, i) => {
    const b = clamp((bloom * (spots.length + 4) - i * 1) / 4); if (b <= 0) return;
    const [px, py] = T([p[0], p[1] + (p[0] / 270) * sw * 8]), r = (8 + R0() * 6) * s * eo(b), rot = R0() * TAU;
    flower(L, px, py, r, am * Math.min(1, b * 1.4), rot, sd + i);
  });
  return spots.map(p => T(p));
}
export function flower(L, x, y, r, am, rot = 0, seed = 1) {
  if (am <= 0 || r <= .5) return;
  for (let k = 0; k < 5; k++) { const a = rot + k / 5 * TAU; blot(L.wet, x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .52, .16 * am, a, .85, seed * 5 + k); }
  for (let k = 0; k < 5; k++) { const a = rot + k / 5 * TAU + .3; blot(L.dry, x + Math.cos(a) * r * .32, y + Math.sin(a) * r * .32, Math.max(.8, r * .08), .85 * am, 0, 1, seed * 7 + k); }
  blot(L.dry, x, y, Math.max(.8, r * .1), .9 * am, 0, 1, seed);
}
export function petal(L, x, y, r, rot, am, seed = 1) { blot(L.wet, x, y, r, .22 * am, rot, .55, seed); draw(L, mk([[x - Math.cos(rot) * r, y - Math.sin(rot) * r], [x + Math.cos(rot) * r, y + Math.sin(rot) * r]], { w: r * .9, tone: .35, dry: .3, wet: .6, prof: 'lens', seed }), 1, am * .6); }

// 圆相（恩怨）：一笔画圆（p 画到哪），圆内左半浓墨、右半淡墨；split 0..1 两半的分化
export function enso(L, cx, cy, r, p, o = {}) {
  const am = o.am ?? 1, sd = o.seed ?? 150, dark = o.dark ?? 1;
  if (o.fill !== false && p > .5) {
    const f = clamp((p - .5) * 2) * am;
    const half = (sgn, a) => { const pts = []; for (let i = 0; i <= 20; i++) { const ang = -Math.PI / 2 + sgn * i / 20 * Math.PI; pts.push([cx + Math.cos(ang) * r * .93 * -sgn * -1, cy + Math.sin(ang) * r * .93]); } mass(L.wet, [[cx, cy - r * .93], ...pts, [cx, cy + r * .93]], a, 4, sd + sgn); };
    // 左：怨（浓）；右：恩（淡）——用 S 形分界，像一半一半，也像太极
    const lp = [], rp = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI / 2 + i / 24 * Math.PI; lp.push([cx + Math.cos(a) * r * .94, cy + Math.sin(a) * r * .94]); }
    const sCurve = []; for (let i = 0; i <= 16; i++) { const u = i / 16, yy = cy - r * .94 + u * r * 1.88; sCurve.push([cx + Math.sin(u * TAU) * r * .18 * (o.sAmt ?? 1), yy]); }
    mass(L.wet, [...lp, ...sCurve], .62 * f * dark, 5, sd + 1);
    for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + i / 24 * Math.PI; rp.push([cx + Math.cos(a) * r * .94, cy + Math.sin(a) * r * .94]); }
    mass(L.wet, [...rp, ...sCurve.slice().reverse()], .14 * f, 5, sd + 2);
  }
  const pts = []; const a0 = o.a0 ?? -2.2;
  for (let i = 0; i <= 40; i++) { const a = a0 + i / 40 * TAU * .96, rr = r * (1 + Math.sin(i * .5) * .012); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, i < 3 ? .7 : i > 36 ? .5 : 1]); }
  draw(L, mk(pts, { w: r * .075, tone: .93, dry: .5, wet: .3, prof: 'brush', nb: 48, seed: sd + 3 }), p, am);
}

// 信：一张纸（淡墨边）+ 竖排字一列列写出来（字体 MaShanZheng 作形，湿 → 干）
export function letter(L, x, y, w, h, o = {}) {
  const am = o.am ?? 1, text = o.text ?? '', p = o.p ?? 1, size = o.size ?? 38;
  mass(L.wet, [[x, y], [x + w, y + 3], [x + w - 2, y + h], [x + 2, y + h - 2]], .05 * am, 2, 7);
  draw(L, mk([[x, y], [x + w, y + 3], [x + w - 2, y + h], [x + 2, y + h - 2], [x, y]], { w: 1.6, tone: .45, dry: .6, prof: 'even', seed: 8 }), 1, am * .7);
  const chars = [...text]; const perCol = Math.max(1, Math.floor((h - size) / (size * 1.12))); let i = 0;
  for (const chh of chars) {
    const col = Math.floor(i / perCol), row = i % perCol;
    const cxp = x + w - size * .9 - col * size * 1.35, cyp = y + size * 1.1 + row * size * 1.12;
    const k = clamp(p * chars.length - i);
    if (k > 0 && chh !== ' ') writeChar(L, chh, cxp, cyp, size, k, am, o.dryT ?? 1);
    i++;
  }
}
// 一个字：先湿（晕开）后干；k = 写的进度（从上往下显现）
export function writeChar(L, chh, x, y, size, k, am = 1, dryK = 1) {
  for (const [c, a] of [[L.wet, (1 - dryK * .7) * .9], [L.dry, dryK * .92]]) {
    c.save(); c.font = `${size}px MaShanZheng`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
    c.globalAlpha = a * am;
    if (k < 1) { c.beginPath(); c.rect(x - size, y - size * .6, size * 2, size * 1.2 * k); c.clip(); }
    c.fillText(chh, x, y); c.restore();
  }
}

// 长命锁：如意形锁片（淡墨面 + 浓墨边 + 链），刻字 n 个按 p 显出来
export function lock(L, x, y, s, o = {}) {
  const am = o.am ?? 1, p = o.p ?? 0, sd = o.seed ?? 210;
  const sh = [[-30, -6], [-22, -20], [-8, -16], [0, -24], [8, -16], [22, -20], [30, -6], [26, 14], [0, 26], [-26, 14]].map(q => [x + q[0] * s, y + q[1] * s]);
  mass(L.wet, sh, .07 * am, 1.2 * s, sd);
  draw(L, mk([...sh, sh[0]], { w: 1.8 * s, tone: .85, dry: .4, wet: .3, prof: 'even', seed: sd + 1 }), 1, am);
  draw(L, mk([[x - 18 * s, y - 20 * s], [x - 26 * s, y - 52 * s], [x, y - 66 * s], [x + 26 * s, y - 52 * s], [x + 18 * s, y - 20 * s]], { w: 1.2 * s, tone: .7, dry: .6, prof: 'even', seed: sd + 2 }), 1, am);
  const ins = o.text ?? '天上星', n = [...ins].length;
  [...ins].forEach((chh, i) => { const k = clamp(p * n - i); if (k > 0) writeChar(L, chh, x + (i - (n - 1) / 2) * 16 * s, y + 3 * s, 15 * s, k, am, 1); });
}

// 箭：杆 + 箭头 + 尾羽；broken = 折成两段的角度
export function arrow(L, x, y, len, ang, o = {}) {
  const am = o.am ?? 1, br = o.broken ?? 0, sd = o.seed ?? 230;
  const d = [Math.cos(ang), Math.sin(ang)];
  const mid = [x + d[0] * len * .5, y + d[1] * len * .5];
  const seg = (a, b, k) => draw(L, mk([a, b], { w: 2.4, tone: .9, dry: .3, prof: 'even', seed: sd + k }), 1, am);
  if (br <= 0) { seg([x, y], [x + d[0] * len, y + d[1] * len], 0); }
  else {
    const a1 = ang - br, a2 = ang + br;
    seg(mid, [mid[0] - Math.cos(a1) * len * .5, mid[1] - Math.sin(a1) * len * .5], 0);
    seg(mid, [mid[0] + Math.cos(a2) * len * .5, mid[1] + Math.sin(a2) * len * .5], 1);
  }
  const tipA = br > 0 ? ang + br : ang, tip = br > 0 ? [mid[0] + Math.cos(tipA) * len * .5, mid[1] + Math.sin(tipA) * len * .5] : [x + d[0] * len, y + d[1] * len];
  const td = [Math.cos(tipA), Math.sin(tipA)], tn = [-td[1], td[0]];
  mass(L.dry, [[tip[0] + td[0] * 14, tip[1] + td[1] * 14], [tip[0] + tn[0] * 5, tip[1] + tn[1] * 5], [tip[0] - tn[0] * 5, tip[1] - tn[1] * 5]], .9 * am, 0, sd);
  const tailA = br > 0 ? ang - br : ang, tl = br > 0 ? [mid[0] - Math.cos(tailA) * len * .5, mid[1] - Math.sin(tailA) * len * .5] : [x, y];
  const ud = [Math.cos(tailA), Math.sin(tailA)], un = [-ud[1], ud[0]];
  for (const sg of [-1, 1]) draw(L, mk([[tl[0] + ud[0] * 18, tl[1] + ud[1] * 18], [tl[0] + un[0] * 7 * sg, tl[1] + un[1] * 7 * sg]], { w: 3, tone: .6, dry: .6, prof: 'lens', seed: sd + 5 + sg }), 1, am);
}

// 军阵：一排排长枪（细直线）+ 旗（小三角）+ 底下一大块淡墨人潮；adv 0..1 向前推（dir=1 向右）
export function army(L, x0, x1, y, o = {}) {
  const am = o.am ?? 1, dir = o.dir ?? 1, rows = o.rows ?? 4, sd = o.seed ?? 260, sc = o.s ?? 1, t = o.t ?? 0;
  const R0 = mulberry(sd);
  mass(L.wet, [[x0, y + 30 * sc], [x0, y - 20 * sc], [x1, y - 30 * sc], [x1, y + 40 * sc]], .34 * am, 8, sd);
  for (let r = 0; r < rows; r++) {
    const yy = y - r * 12 * sc, n = Math.round((x1 - x0) / (14 * sc));
    for (let i = 0; i < n; i++) {
      if (R0() < .15) continue;
      const xx = x0 + (i + R0() * .6) * (x1 - x0) / n, h = (60 + R0() * 30) * sc, lean = (R0() - .5) * .08 + dir * .04, bob = Math.sin(t * 6 + i) * 2 * (o.march ?? 0);
      draw(L, mk([[xx, yy + bob], [xx + lean * h, yy - h + bob]], { w: 1.4 * sc, tone: .75, dry: .45, prof: 'tip', seed: sd + r * 100 + i }), 1, am * (.6 + r * .1));
      blot(L.wet, xx, yy + 6 * sc + bob, 5 * sc, .3 * am, 0, 1.4, sd + i + r * 50);
      if (R0() < .07) {   // 旗
        const fx = xx + lean * h, fy = yy - h + bob, wv = Math.sin(t * 5 + i) * 4 * sc;
        mass(L.wet, [[fx, fy], [fx + dir * 34 * sc, fy + 6 * sc + wv], [fx, fy + 22 * sc]], .55 * am, 2, sd + i);
      }
    }
  }
}

// 天灯：纸灯一个个升起（颜色层的暖光 + 淡墨的灯身）
export function skyLanterns(L, t, t0, o = {}) {
  const n = o.n ?? 60, am = o.am ?? 1, R0 = mulberry(o.seed ?? 300), [x0, x1] = o.xr ?? [0, 1920], yb = o.y ?? 1000;
  for (let i = 0; i < n; i++) {
    const born = t0 + R0() * (o.spread ?? 4), age = t - born, x = lerp(x0, x1, R0()), sp = 40 + R0() * 50, sz = 5 + R0() * 9, ph = R0() * 6;
    if (age <= 0) continue;
    const y = yb - age * sp * (o.k ?? 1), xx = x + Math.sin(age * .7 + ph) * 22;
    if (y < -50) continue;
    const a = am * clamp(age / .8) * clamp((y + 50) / 300);
    glow(L.col, xx, y, sz * 4.5, .35 * a, [255, 236, 200]);
    mass(L.wet, [[xx - sz * .6, y - sz], [xx + sz * .6, y - sz], [xx + sz * .5, y + sz * .9], [xx - sz * .5, y + sz * .9]], .1 * a, 1, i);
    dot(L.col, xx, y + sz * .2, sz * .55, .85 * a, [255, 244, 222]);
  }
}

// 写意羊：一团淡墨 + 焦墨小头
export function sheep(L, x, y, s, am = 1, seed = 1, dir = 1) {
  blot(L.wet, x, y, 16 * s, .2 * am, 0, .65, seed);
  blot(L.wet, x + 6 * s, y - 3 * s, 10 * s, .14 * am, 0, .7, seed + 1);
  blot(L.dry, x + dir * 16 * s, y - 4 * s, 4 * s, .85 * am, 0, .8, seed + 2);
  for (const k of [-8, -2, 5, 10]) draw(L, mk([[x + k * s, y + 7 * s], [x + k * s, y + 15 * s]], { w: 1.4 * s, tone: .8, dry: .4, prof: 'tip', seed: seed + 10 + k }), 1, am);
}

// 坟：一个低矮的土丘 + 一块小碑
export function grave(L, x, y, s, am = 1) {
  mass(L.wet, [...qpts(x - 90 * s, y, x, y - 70 * s, x + 90 * s, y, 10)], .26 * am, 3, 400);
  draw(L, mk(qpts(x - 94 * s, y + 2, x, y - 72 * s, x + 94 * s, y + 2, 10), { w: 6 * s, tone: .7, darkDir: [0, -1], side: .7, brWet: true, body: .3, dry: .55, wet: .7, prof: 'brush', seed: 401 }), 1, am);
  mass(L.wet, [[x - 14 * s, y - 50 * s], [x + 14 * s, y - 50 * s], [x + 15 * s, y + 2], [x - 15 * s, y + 2]], .32 * am, 1, 402);
  draw(L, mk([[x - 14 * s, y - 48 * s], [x - 14 * s, y]], { w: 3 * s, tone: .85, dry: .4, prof: 'even', seed: 403 }), 1, am);
  draw(L, mk([[x + 14 * s, y - 48 * s], [x + 14 * s, y]], { w: 2 * s, tone: .7, dry: .5, prof: 'even', seed: 404 }), 1, am);
}

// 礁石孤岛：一块斧劈石，下半没入雾/水
export function islandRock(L, x, y, s, o = {}) {
  const am = o.am ?? 1, sd = o.seed ?? 500;
  const pts = [[-160, 0], [-140, -50], [-90, -80], [-40, -96], [20, -90], [70, -70], [120, -40], [170, 0]].map(p => [x + p[0] * s, y + p[1] * s]);
  mass(L.wet, [...pts, [x + 170 * s, y + 20 * s], [x - 160 * s, y + 20 * s]], .3 * am, 4 * s, sd, [0, y - 96 * s, 0, y + 20 * s, 1.2, .2]);
  draw(L, mk(pts.slice(0, 5), { w: 8 * s, tone: .9, dry: .45, wet: .3, prof: 'brush', seed: sd + 1 }), 1, am);
  draw(L, mk(pts.slice(4), { w: 7 * s, tone: .85, dry: .5, wet: .3, prof: 'brush', seed: sd + 2 }), 1, am);
  const R0 = mulberry(sd + 3);
  for (let i = 0; i < 9; i++) { const px = x + (R0() - .5) * 260 * s, py = y - (20 + R0() * 50) * s; draw(L, mk([[px, py], [px - 14 * s, py + 26 * s]], { w: 9 * s, tone: .6, dry: .65, wet: .4, prof: 'nail', seed: sd + 10 + i }), 1, am * .8); }
  for (let i = 0; i < 6; i++) { const p = pts[1 + (i % 6)]; blot(L.wet, p[0] + (R0() - .5) * 20 * s, p[1] + 2, 3 * s, .85 * am, 0, .6, sd + 30 + i); }
}
// 水纹：宋画式平行波线（近处密）
export function waveLines(L, x0, x1, y0, y1, o = {}) {
  const am = o.am ?? 1, n = o.n ?? 14, t = o.t ?? 0, sd = o.seed ?? 600;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), y = lerp(y0, y1, Math.pow(u, 1.6)), pts = [];
    for (let k = 0; k <= 12; k++) { const x = lerp(x0, x1, k / 12); pts.push([x, y + Math.sin(x * .012 + i * 1.3 + t * .8) * (3 + u * 6)]); }
    draw(L, mk(pts, { w: 1.2 + u * 1.6, tone: .35 + u * .2, dry: .75, prof: 'tip', seed: sd + i }), 1, am * (.5 + u * .4));
  }
}

// 墨龙：从掌心冲出（尾细在掌、身粗在前），饱墨身 + 三道飞白的速度痕 + 云卷 + 头（角、须、张口、目）。p = 冲出的进度
export function dragon(L, path, p, o = {}) {
  const am = o.am ?? 1, w = o.w ?? 120, sd = o.seed ?? 700;
  if (p <= 0) return;
  const grow = s => (.18 + .82 * Math.pow(clamp(s), .6)) * Math.min(1, (1 - s) / .05 * .4 + .6);
  const N = path.length;
  const at = u => { const k = clamp(u) * (N - 1), i = Math.min(N - 2, Math.floor(k)), f = k - i; return [lerp(path[i][0], path[i + 1][0], f), lerp(path[i][1], path[i + 1][1], f)]; };
  const nrm = u => { const a = at(Math.max(0, u - .01)), b = at(Math.min(1, u + .01)), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  // 身：一笔饱墨（湿），浓边在下
  draw(L, mk(path, { w, tone: .88, darkDir: [0, 1], side: .9, brWet: true, body: .5, dry: .45, wet: .9, prof: grow, nb: 60, seed: sd }), p, am);
  // 速度痕：三道干笔飞白，平行于身体
  for (const [off, ww, k] of [[-.55, .22, 1], [.5, .18, 2], [-.15, .3, 3]]) {
    const pts = path.map((q, i) => { const n = nrm(i / (N - 1)); return [q[0] + n[0] * w * off, q[1] + n[1] * w * off]; });
    draw(L, mk(pts, { w: w * ww, tone: .95, dry: .85, prof: grow, nb: 30, seed: sd + k }), p, am * .9);
  }
  // 鳞：沿身体的小弧（干笔）
  const R0 = mulberry(sd + 2), NS = 30;
  for (let i = 0; i < NS; i++) {
    const u = (i + .5) / NS; if (u > p * .95) break;
    const q = at(u), n = nrm(u), r = w * .2 * grow(u);
    draw(L, mk([[q[0] + n[0] * r - n[1] * r, q[1] + n[1] * r + n[0] * r], [q[0] - n[1] * r * .3, q[1] + n[0] * r * .3], [q[0] - n[0] * r - n[1] * r, q[1] - n[1] * r + n[0] * r]], { w: 3, tone: .9, dry: .5, prof: 'tip', seed: sd + 10 + i }), 1, am * .65);
  }
  // 云卷：身旁几笔旋转的淡墨
  for (let i = 0; i < 5; i++) {
    const u = .15 + i * .17; if (u > p) break;
    const q = at(u), n = nrm(u), sg = i % 2 ? 1 : -1, c = [q[0] + n[0] * w * .9 * sg, q[1] + n[1] * w * .9 * sg], r = w * (.35 + .1 * i % 3);
    const pts = []; for (let j = 0; j <= 14; j++) { const a = j / 14 * 4.6 * sg, rr = r * (1 - j / 18); pts.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr]); }
    draw(L, mk(pts, { w: w * .14, tone: .5, dry: .6, wet: .5, prof: 'tip', seed: sd + 40 + i }), clamp((p - u) * 4), am * .8);
  }
  // 头
  const hp = at(Math.min(1, p)), hp0 = at(Math.max(0, Math.min(1, p) - .04)), a = Math.atan2(hp[1] - hp0[1], hp[0] - hp0[0]);
  const H = (dx, dy) => [hp[0] + Math.cos(a) * dx - Math.sin(a) * dy, hp[1] + Math.sin(a) * dx + Math.cos(a) * dy];
  const hs = w * 1.05;
  mass(L.wet, [H(-hs * .5, -hs * .4), H(hs * .3, -hs * .35), H(hs * .9, -hs * .12), H(hs * .95, hs * .02), H(hs * .3, hs * .05), H(hs * .85, hs * .28), H(hs * .2, hs * .42), H(-hs * .5, hs * .35)], .72 * am, 4, sd + 50);
  draw(L, mk([H(hs * .95, 0), H(hs * .35, hs * .06), H(hs * .82, hs * .3)], { w: 4, tone: .95, dry: .3, prof: 'tip', seed: sd + 56 }), 1, am);   // 张口
  draw(L, mk([H(-hs * .1, -hs * .35), H(-hs * .6, -hs * .95), H(-hs * 1.2, -hs * 1.1)], { w: 7, tone: .95, dry: .4, prof: 'nail', seed: sd + 51 }), 1, am);   // 角
  draw(L, mk([H(hs * .12, -hs * .32), H(-hs * .25, -hs * 1.05), H(-hs * .7, -hs * 1.35)], { w: 6, tone: .95, dry: .4, prof: 'nail', seed: sd + 52 }), 1, am);
  draw(L, mk([H(hs * .75, hs * .15), H(hs * .3, hs * .8), H(-hs * .4, hs * 1.2), H(-hs * 1.3, hs * 1.0)], { w: 3.4, tone: .9, dry: .5, prof: 'tip', seed: sd + 53 }), 1, am);    // 须
  draw(L, mk([H(hs * .7, -hs * .15), H(hs * .15, -hs * .75), H(-hs * .5, -hs * .7), H(-hs * 1.4, -hs * .35)], { w: 3, tone: .9, dry: .5, prof: 'tip', seed: sd + 54 }), 1, am);
  for (let i = 0; i < 6; i++) draw(L, mk([H(-hs * .3 - i * hs * .12, -hs * .32), H(-hs * .5 - i * hs * .15, -hs * .62 + (i % 2) * hs * .1)], { w: 4, tone: .9, dry: .5, prof: 'tip', seed: sd + 60 + i }), 1, am * .9);   // 鬃
  blot(L.dry, ...H(hs * .3, -hs * .15), w * .07, .95 * am, 0, .7, sd + 55);
  dot(L.col, ...H(hs * .32, -hs * .17), w * .028, am);
  // 前沿的墨点飞溅
  for (let i = 0; i < 30; i++) { const u = Math.max(0, p - R0() * .3), q = at(Math.min(1, u)); blot(L.wet, q[0] + (R0() - .5) * w * 1.8, q[1] + (R0() - .5) * w * 1.6, 2 + R0() * 10, .7 * am * R0(), R0() * 3, .7, sd + 80 + i); }
}

// 远山一层（带缓存）：ridge peaks → 画布
import { ridgeFn, mountainLayer, cun } from '../engine/land.js';
const MCACHE = {};
export function mountains(key, W, H, peaks, base, o = {}) {
  if (MCACHE[key]) return MCACHE[key];
  const ridge = ridgeFn(peaks, base, o.seed ?? 3, o.rough ?? 24);
  const wet = mountainLayer({ W, H, ridge, depth: o.depth ?? 260, tone: o.tone ?? .16, rim: o.rim ?? .6, rimW: o.rimW ?? 20, mist: o.mist ?? .8, seed: o.seed ?? 3, xmask: o.xmask });
  const dry = document.createElement('canvas'); dry.width = W; dry.height = H;
  const lay = { wet, dry, ridge };
  if (o.cun) { const ctx = { wet: wet.getContext('2d'), dry: dry.getContext('2d') }; cun(ctx, { x0: o.cun[0], x1: o.cun[1], ridge, tone: (o.tone ?? .16) * .9, cun: 1.2, moss: 1.2, seed: o.seed ?? 3, cunLen: o.cunLen ?? .8 }); }
  return (MCACHE[key] = lay);
}
export function blitLayer(L, lay, x = 0, y = 0, am = 1, s = 1) {
  for (const k of ['wet', 'dry']) { const c = L[k]; c.save(); c.globalAlpha = am; c.drawImage(lay[k], x, y, lay[k].width * s, lay[k].height * s); c.restore(); }
}
