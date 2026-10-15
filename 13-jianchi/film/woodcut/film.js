// 木刻版画 × 航海王 × 诺兰：黑木白刀，光是刻出来的；集中线 = U 刀放射刀痕；拟声字直接刻进版里；
// 版面在 204.6 秒从 2.39:1 宽银幕版撑成竖高的 IMAX 版；前世用“木版本身”（镜像、未印）来表现。
import * as WC from './engine/index.js';
import * as K from '../shared/cast.js';
import { cueAt, keyAt, imax } from '../shared/story.js';
import { C, O, ell, ribbon, rng, path, spiky, xf } from '../shared/geo.js';

const W = 1920, H = 1080, BLUE = '#2A6FB4';
let mask, m, plateCv, pc, PR, tmp, tg;
export function init() {
  [mask, m] = WC.canvas(); [plateCv, pc] = WC.canvas(); PR = WC.makePrinter();
  [tmp, tg] = WC.canvas();
}
const hs = s => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 100003; return h; };

// ───────── 版面 ─────────
let RECT = [36, 70, 1848, 773];
function plateRect(t) { return imax(t) ? [36, 34, 1848, 932] : [36, 64, 1848, 773]; }
function block(rect = RECT) { m.fillStyle = '#000'; m.beginPath(); const [x, y, w, h] = rect; const R = rng(5); m.moveTo(x, y); for (let i = 1; i <= 40; i++) m.lineTo(x + w * i / 40, y + (R() - .5) * 2.4); for (let i = 1; i <= 24; i++) m.lineTo(x + w + (R() - .5) * 2.4, y + h * i / 24); for (let i = 1; i <= 40; i++) m.lineTo(x + w - w * i / 40, y + h + (R() - .5) * 2.4); for (let i = 1; i < 24; i++) m.lineTo(x + (R() - .5) * 2.4, y + h - h * i / 24); m.closePath(); m.fill(); }
function clipPlate(fn, rect = RECT) { m.save(); m.beginPath(); m.rect(...rect); m.clip(); fn(); m.restore(); }

// ───────── 部件 → 版 ─────────
// 把角色部件放到画面：X,Y 原点位置，s 缩放，fl = -1 水平翻转
function place(parts, X, Y, s, fl = 1, rot = 0) {
  const c = Math.cos(rot), n = Math.sin(rot);
  const T = ([x, y]) => { const u = x * s * fl, v = y * s; return [X + u * c - v * n, Y + u * n + v * c]; };
  return parts.map(p => ({ ...p, P: p.P ? p.P.map(T) : null, L: p.L ? p.L.map(T) : null, w: p.w ? p.w * s : 0 }));
}
const inkLine = (L, w, kind = 'k') => WC.drawStrokes(m, WC.cutAlong(L, { w, kind, seg: [400, 900], gap: [0, 1], seed: 3 }), { color: '#000' });
const cutLine = (L, w, kind = 'v', seed = 1) => WC.drawStrokes(m, WC.cutAlong(L, { w, kind, seg: [60, 200], gap: [2, 8], seed }), { color: '#fff' });
function fillPoly(P, col) { m.fillStyle = col; m.beginPath(); path(m, P); m.fill(); }
function keyline(P, w) { m.strokeStyle = '#000'; m.lineWidth = w; m.lineJoin = 'round'; m.beginPath(); path(m, P); m.stroke(); }
// o: { light, sp, halo, simple（远景：只填黑 + 白晕）, skinLine }
function carve(parts, o = {}) {
  const Lt = o.light || WC.light(.65, -.6, .45);
  const s = o.scale ?? 1;
  for (const p of parts) {
    const seed = hs(p.id);
    if (p.P) {
      if (o.simple) {
        if (p.role === 'skin' || p.role === 'white' || p.role === 'tooth') { fillPoly(p.P, '#fff'); keyline(p.P, Math.max(1.2, 2 * s)); }
        else { m.strokeStyle = '#fff'; m.lineWidth = (o.halo ?? 4) * 2; m.lineJoin = 'round'; m.beginPath(); path(m, p.P); m.stroke(); fillPoly(p.P, '#000'); }
        continue;
      }
      switch (p.role) {
        case 'dark': case 'accent':
          WC.shape([p.P], { light: Lt, sp: o.sp ?? 7, halo: o.halo ?? 5, lo: o.lo ?? .42, hi: .98, amb: 0, k: 1.1, R: o.R ?? 40, seed, wmax: o.wmax }).draw(m); break;
        case 'mid':
          WC.shape([p.P], { light: Lt, sp: (o.sp ?? 7) * .85, halo: o.halo ?? 4, lo: .12, hi: .8, amb: .3, R: 30, seed }).draw(m); break;
        case 'skin': case 'tooth':
          fillPoly(p.P, '#fff'); keyline(p.P, o.skinLine ?? 3); break;
        case 'white':
          WC.shape([p.P], { white: true, light: Lt, sp: o.spW ?? 6, lo: .5, hi: 1, halo: 0, R: 30, seed }).draw(m); keyline(p.P, o.skinLine ?? 3); break;
        case 'hole': fillPoly(p.P, '#000'); break;
      }
    } else if (p.L) {
      if (p.role === 'feat' || /^(bs|hs|stray|wr)/.test(p.id)) inkLine(p.L, Math.max(1.5, p.w));
      else cutLine(p.L, Math.max(1.5, p.w * .7), 'v', seed);
    }
  }
}
// 远景小剪影：白晕 + 实心黑
function sil(parts, halo = 3) {
  m.strokeStyle = '#fff'; m.lineWidth = halo * 2; m.lineJoin = 'round';
  for (const p of parts) if (p.P) { m.beginPath(); path(m, p.P); m.stroke(); }
  for (const p of parts) if (p.P) fillPoly(p.P, p.role === 'white' ? '#fff' : '#000');
}

// ───────── 自然与气氛 ─────────
function region(P) { return new WC.Region([P], { res: 3 }); }
function sky(x0, y0, x1, y1, o = {}) {  // 横向 U 刀天空：越近地平线越亮
  const reg = region([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  const st = WC.lines(reg, { angle: o.angle ?? 0, sp: o.sp ?? 11, tone: (x, y) => (o.tone ? o.tone(x, y) : .25 + .7 * Math.pow((y - y0) / (y1 - y0), 1.6)), kind: 'u', seg: [260, 900], gap: [2, 14], seed: o.seed ?? 4, jit: .12 });
  WC.drawStrokes(m, st, { color: '#fff' });
}
function hatchPoly(P, o = {}) {
  const st = WC.hatch(region(P), { dir: o.dir ?? WC.dirAngle(o.angle ?? 0), tone: o.tone || (() => o.v ?? .6), sp: o.sp ?? 9, kind: o.kind ?? 'v', seg: o.seg || [40, 220], gap: o.gap || [2, 12], seed: o.seed ?? 2, jit: o.jit ?? .15, wmax: o.wmax });
  WC.drawStrokes(m, st, { color: o.col ?? '#fff' });
}
function snow(x0, y0, x1, y1, n, seed = 9, r = [2, 5]) { const R = rng(seed), pts = []; for (let i = 0; i < n; i++) pts.push([x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), r[0] + R() * (r[1] - r[0])]); WC.drawStrokes(m, WC.flecks(pts, { seed, angle: 1.3 }), { color: '#fff' }); }
function focus(cx, cy, o = {}) { WC.drawStrokes(m, WC.rays(cx, cy, { n: o.n ?? 110, r0: o.r0 ?? 300, r1: o.r1 ?? [1100, 1500], w: o.w ?? 16, jit: .9, seed: o.seed ?? 6, kind: 'u' }), { color: o.col ?? '#fff' }); }
function mountains(y, seed, h = 120, o = {}) {
  const R = rng(seed), pts = [[RECT[0] - 20, y + 60]];
  for (let x = RECT[0] - 20; x <= RECT[0] + RECT[2] + 20; x += 60) pts.push([x, y - h * (.3 + .7 * Math.abs(Math.sin(x * .004 + seed))) * (.7 + .5 * R())]);
  pts.push([RECT[0] + RECT[2] + 20, y + 60]);
  WC.shape([pts], { light: WC.light(-.6, -.7, .4), sp: o.sp ?? 5, halo: 4, lo: .3, hi: .95, R: 60, seed }).draw(m);
}
// 拟声字：刻出来的大字（白字黑边 + 外圈白晕），可倾斜
function sfx(text, x, y, size, rot = -.12, o = {}) {
  m.save(); m.translate(x, y); m.rotate(rot); m.transform(1, 0, o.skew ?? -.12, 1, 0, 0);
  m.font = `${size}px MSZ`; m.textAlign = 'center'; m.textBaseline = 'middle'; m.lineJoin = 'round';
  m.strokeStyle = '#fff'; m.lineWidth = size * .2; m.strokeText(text, 0, 0);
  m.strokeStyle = '#000'; m.lineWidth = size * .1; m.strokeText(text, 0, 0);
  m.fillStyle = '#fff'; m.fillText(text, 0, 0);
  // 字里留两道刀痕
  m.globalCompositeOperation = 'source-atop'; m.strokeStyle = '#000'; m.lineWidth = Math.max(2, size * .012);
  for (let k = -3; k <= 3; k++) { m.beginPath(); m.moveTo(-size, k * size * .16 + size * .05); m.lineTo(size, k * size * .16 - size * .12); m.stroke(); }
  m.restore();
}
// 黑电（霸王色）：未刻的锯齿黑线
function lightning(x0, y0, x1, y1, seed, w = 10) {
  const R = rng(seed), pts = [[x0, y0]], n = 9;
  for (let i = 1; i < n; i++) { const u = i / n; pts.push([x0 + (x1 - x0) * u + (R() - .5) * 90, y0 + (y1 - y0) * u + (R() - .5) * 90]); }
  pts.push([x1, y1]);
  m.strokeStyle = '#000'; m.lineWidth = w; m.lineJoin = 'miter'; m.beginPath(); path(m, pts, false); m.stroke();
  m.lineWidth = w * .35; m.strokeStyle = '#fff'; m.beginPath(); path(m, pts, false); m.stroke();
}
// 水面：横向波纹刀痕
function water(P, o = {}) { hatchPoly(P, { angle: 0, v: o.v ?? .5, sp: o.sp ?? 8, kind: 'v', seg: o.seg || [20, 120], gap: [4, 20], seed: o.seed ?? 3, jit: .5, tone: o.tone }); }

// ───────── 字幕：页边的活字印刷 ─────────
function caption(t, rect) {
  const c = cueAt(t); if (!c) return;
  const y0 = rect[1] + rect[3], y1 = H, cy = (y0 + y1) / 2;
  const shout = /！！|？！/.test(c.text);
  m.fillStyle = '#000'; m.textAlign = 'center'; m.textBaseline = 'middle';
  if (c.who !== '旁白') { m.font = '28px WK'; m.fillText(c.who, 960, cy - (shout ? 50 : 42)); }
  m.font = `${shout ? 58 : 46}px WK`; m.fillText(c.text, 960, cy + (c.who !== '旁白' ? 10 : 0));
}

// ═════════════ 镜头 ═════════════
const SH = {};
// K1 超远景：雪原上一条河，河的尽头是一个人
SH.K1 = (t, r) => {
  const [x, y, w, h] = r, hz = y + h * .34;
  sky(x, y, x + w, hz, { sp: 9 });
  snow(x, y, x + w, hz - 30, 160, 11);
  mountains(hz, 3, 80, { sp: 4 });
  // 雪原：几乎全白，只剩少量长长的地形线
  const plain = [[x, hz], [x + w, hz], [x + w, y + h], [x, y + h]];
  hatchPoly(plain, { angle: .015, v: .985, sp: 9, kind: 'u', seg: [300, 1200], gap: [2, 10], seed: 4, jit: .25 });
  // 河：从画面底部蜿蜒而来，越远越窄，在中景收成一个尖——尖上站着他
  const tip = [1040, hz + 150];
  const Lb = O([[x + 380, y + h + 20], [x + 560, y + h - 120], [760, hz + 340], [940, hz + 230], [tip[0] - 14, tip[1] + 8], [tip[0], tip[1]]], 6);
  const Rb = O([[tip[0], tip[1]], [tip[0] + 16, tip[1] + 14], [1000, hz + 260], [1040, hz + 380], [x + w - 640, y + h - 90], [x + w - 420, y + h + 20]], 6);
  const river = Lb.concat(Rb);
  fillPoly(river, '#000');
  water(river, { v: .4, sp: 6, tone: (px, py) => .22 + .38 * Math.pow((py - tip[1]) / (y + h - tip[1]), .8), seg: [40, 260] });
  cutLine(Lb, 5, 'k', 2); cutLine(Rb, 5, 'k', 3);
  // 他（白晕剪影）：脚下就是河的尽头
  sil(place(K.fyWalk({ carry: 'corpse' }), tip[0] + 4, tip[1] + 6, .085), 4);
  // 左岸雪坡：雪胡一方
  const ridge = C([[x - 10, hz + 170], [x + 220, hz + 80], [x + 470, hz + 110], [x + 600, hz + 220], [x - 10, hz + 300]], 8);
  WC.shape([ridge], { light: WC.light(.6, -.7, .4), sp: 6, halo: 5, lo: .35, hi: .95, seed: 21 }).draw(m);
  sil(place(K.xuehuSide({ roar: .4 }), x + 300, hz + 98, .13), 3);
  for (const [dx, sc] of [[390, .1], [450, .095], [200, .09]]) sil(place(K.fyFront({}), x + dx, hz + 110, sc * .9), 2.5);
  // 右岸：伏地的毛里球像一座紫色小山（木刻里是黑木 + 毛向刀痕）
  carve(place(K.maoSide({ lie: 1, tail: .4 }), x + w - 600, hz + 230, .2), { sp: 4, halo: 5, light: WC.light(-.6, -.7, .4) });
  // 天上：中洲蛊仙
  for (let i = 0; i < 5; i++) sil(place(K.immortalSide({ flip: i % 2 }), x + 700 + i * 150, y + 110 + (i % 2) * 36, .085), 2.5);
};
// K2 雪胡老祖咆哮（正面特写，仰拍）
SH.K2 = (t, r) => {
  const [x, y, w, h] = r;
  focus(960, y + h * .62, { n: 120, r0: 330, w: 18 });
  fillPoly(ell(960, y + h * .55, 420, 520), '#000');
  carve(place(K.faceFront({ hair: 'snowtop', beard: 'snow', mouth: 'roar', brow: -1, eye: 1, tinyPupil: 1, age: .8, veins: 1, thickBrow: 1, wide: 1.1 }), 960, y + h * .5, .82), { sp: 6, halo: 7, light: WC.light(-.5, -.8, .4), skinLine: 4 });
  sfx('吼', x + 250, y + 300, 330, -.2);
  sfx('！！', x + w - 230, y + 240, 220, .15);
};
// K3 毛里球炸毛（正面，冲击帧）
SH.K3 = (t, r) => {
  const [x, y, w, h] = r;
  focus(960, y + h * .55, { n: 140, r0: 380, w: 20, seed: 8 });
  const face = place(K.maoFace({ bristle: 1, mouth: 1 }), 960, y + h * .52, .56);
  // 炸毛：紫毛在木刻里是黑木 + 放射刀痕（毛向）
  for (const p of face) {
    if (p.id === 'mane') { WC.shape([p.P], { light: WC.light(.4, -.7, .5), sp: 6, halo: 7, lo: .3, hi: .95, dir: WC.dirRadial(960, y + h * .5), seed: 3 }).draw(m); }
    else carve([p], { sp: 6, halo: 5 });
  }
  sfx('嗷', x + w - 260, y + 330, 340, .18);
  sfx('！！！', x + 230, y + h - 170, 150, -.1);
};
// K4 九转爱情仙蛊：湛蓝光柱托起赵怜云（唯一的色版）
SH.K4 = (t, r) => {
  const [x, y, w, h] = r, hz = y + h * .8, bx = 1320;
  snow(x, y, x + w, hz, 220, 4, [2, 6]);
  const col = [[bx - 110, y], [bx + 110, y], [bx + 80, hz], [bx - 80, hz]];
  hatchPoly(col, { angle: Math.PI / 2, v: .96, sp: 9, kind: 'u', seg: [300, 900], gap: [2, 8], seed: 31 });
  WC.drawStrokes(m, WC.rays(bx, y + h * .36, { n: 80, r0: 110, r1: [260, 560], w: 12, seed: 2 }), { color: '#fff' });
  const gr = pc.createRadialGradient(bx, y + h * .4, 40, bx, y + h * .4, 520);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.55, 'rgba(0,0,0,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  pc.fillStyle = gr; pc.fillRect(x, y, w, h);
  carve(place(K.zhaoRise(), bx, y + h * .6, .38), { sp: 5, halo: 6 });
  const riv = [[x, hz], [x + w, hz], [x + w, y + h], [x, y + h]];
  water(riv, { v: .5, sp: 8, seg: [60, 300] });
  carve(place(K.fyWalk({ carry: 'corpse', look: 1, wind: .3 }), 560, y + h - 6, .7), { sp: 7, halo: 7, lo: .55, light: WC.light(.9, -.5, .3) });
  sfx('嗡', x + w - 240, y + 200, 200, .1);
};
// K5 四面楚歌：他在正中一圈白光里，四边挤进来张开的嘴，天上一只“天意”的眼
SH.K5 = (t, r) => {
  const [x, y, w, h] = r, cx = 960, cy = y + h * .62;
  focus(cx, cy, { n: 170, r0: 150, r1: [900, 1300], w: 9, seed: 12 });
  fillPoly(ell(cx, cy, 150, 70), '#fff'); m.strokeStyle = '#000'; m.lineWidth = 3; m.beginPath(); m.ellipse(cx, cy, 150, 70, 0, 0, 7); m.stroke();
  sil(place(K.fyWalk({ carry: 'corpse', look: 1 }), cx, cy + 40, .15), 4);
  // 天意之眼
  const ex = cx, ey = y + 100, eye = C([[ex - 330, ey], [ex, ey - 100], [ex + 330, ey], [ex, ey + 100]]);
  fillPoly(eye, '#fff'); keyline(eye, 7); fillPoly(ell(ex, ey, 78, 78), '#000'); fillPoly(ell(ex - 20, ey - 24, 18, 18), '#fff');
  // 四边：张嘴叫嚣的脸（被画框切掉）
  carve(place(K.faceSide({ hair: 'snowtop', beard: 'snow', mouth: 'roar', brow: -1, eye: 1, red: 0, age: .8 }), x + 150, y + h * .52, .95), { sp: 6, halo: 8 });
  carve(place(K.maoSide({ bristle: 1, mouth: 1 }), x + w + 330, y + h * .95, .5, 1), { sp: 6, halo: 8 });
  carve(place(K.faceFront({ hair: 'fy', crown: 'official', mouth: 'roar', brow: -1, eye: 1, tinyPupil: 1 }), x + 420, y + h + 120, .5, 1, .25), { sp: 5, halo: 6 });
  carve(place(K.faceFront({ hair: 'pony', mouth: 'roar', brow: -1, eye: 1, tinyPupil: 1 }), x + w - 520, y + h + 140, .5, 1, -.3), { sp: 5, halo: 6 });
  sfx('死', x + 470, y + 190, 190, -.25); sfx('杀', x + w - 470, y + 190, 190, .22);
};
// K6 一步再一步：极低机位，正要落下的脚底直冲镜头（千层底的针脚），身后他高耸入天
SH.K6 = (t, r) => {
  const [x, y, w, h] = r, hz = y + h * .62;
  sky(x, y, x + w, hz, { sp: 10, seed: 6, tone: (a, b) => .15 + .5 * Math.pow((b - y) / (hz - y), 2) });
  water([[x, hz], [x + w, hz], [x + w, y + h], [x, y + h]], { v: .5, sp: 8, seg: [80, 400] });
  // 远处：另一只脚与身体（透视急收），头在画框顶上
  const body = C([[760, hz + 40], [880, y + 180], [930, y + 20], [990, y + 20], [1040, y + 180], [1160, hz + 40]], 10);
  WC.shape([body], { light: WC.light(.7, -.5, .4), sp: 7, halo: 7, lo: .45, hi: .98, seed: 7, dir: WC.dirAngle(Math.PI / 2) }).draw(m);
  carve(place(K.fyFront({}).filter(p => ['face', 'hairTop', 'lockL', 'lockR', 'browL', 'browR', 'eyeL', 'eyeR', 'pupilL', 'pupilR', 'nose', 'mouth', 'neck'].includes(p.id)), 960, y + 1010 * .2 + 10, .2), { sp: 3, halo: 3, skinLine: 2 });
  // 近处：脚底（脚印形，脚尖朝上），白色千层底边 + 针脚
  const R0 = -.32, fx = 1000, fy = y + h * .66;
  const solePts = xf(C([[0, -300], [120, -270], [160, -150], [140, -30], [100, 120], [90, 220], [40, 290], [-40, 290], [-90, 220], [-100, 120], [-130, -30], [-150, -150], [-120, -270]], 6), fx, fy, [1.25, 1.05], R0);
  const upper = xf(C([[-170, -200], [180, -210], [220, -40], [180, 200], [-160, 200], [-210, -40]], 6), fx + 30, fy - 30, 1.15, R0);
  WC.shape([upper], { light: WC.light(.8, -.4, .3), sp: 8, halo: 8, lo: .45, seed: 3 }).draw(m);
  fillPoly(solePts, '#fff'); keyline(solePts, 5);
  const inner = xf(C([[0, -262], [100, -236], [130, -140], [112, -30], [76, 110], [66, 200], [28, 254], [-28, 254], [-68, 200], [-78, 110], [-104, -30], [-122, -140], [-96, -236]], 6), fx, fy, [1.25, 1.05], R0);
  fillPoly(inner, '#000');
  const pts = []; for (let i = -6; i <= 6; i++) for (let j = -3; j <= 3; j++) pts.push(xf([[j * 30, i * 40]], fx, fy, [1.25, 1.05], R0)[0]);
  const st = pts.filter(p => { const reg = region(inner); return reg.inside(p[0], p[1]) && reg.dist(p[0], p[1]) > 14; }).map(([a, b]) => [a, b, 5]);
  WC.drawStrokes(m, WC.flecks(st, { seed: 5, angle: R0 + 1.4 }), { color: '#fff' });
  // 水冠：落点的白色水滴 + 放射刀痕
  const R = rng(17), drops = [];
  for (let i = 0; i < 46; i++) { const a = Math.PI + R() * Math.PI, rr = 260 + R() * 300; drops.push([fx + Math.cos(a) * rr * 1.4, y + h * .98 + Math.sin(a) * rr * .5, 5 + R() * 10]); }
  WC.drawStrokes(m, WC.flecks(drops, { seed: 3, angle: -1.2 }), { color: '#fff' });
  focus(fx, fy, { n: 90, r0: 430, r1: [900, 1200], w: 12, seed: 31 });
  sfx('咚', x + 280, y + 250, 360, -.18);
};
// K7 为什么他面无表情：斜切多格。四张扭曲的脸 + 中间方源不动的脸
function panel(P, draw) { m.save(); m.beginPath(); path(m, P); m.clip(); draw(); m.restore(); m.strokeStyle = '#fff'; m.lineWidth = 14; m.beginPath(); path(m, P); m.stroke(); }
SH.K7 = (t, r) => {
  const [x, y, w, h] = r;
  const faces = [
    { hair: 'wild', mouth: 'grit', brow: -1, eye: 1, tinyPupil: 1, veins: 1 },
    { hair: 'fy', mouth: 'cry', brow: 1, eye: .1, sweat: 1 },
    { hair: 'silver', mouth: 'grin', brow: -.4, eye: 1, tinyPupil: 1 },
    { hair: 'old', mouth: 'cry', brow: 1, eye: .3, tears: 1, age: 1 },
  ];
  const cells = [
    [[x, y], [x + 560, y], [x + 470, y + h * .5], [x, y + h * .5]],
    [[x, y + h * .5], [x + 470, y + h * .5], [x + 380, y + h], [x, y + h]],
    [[x + w - 560, y], [x + w, y], [x + w, y + h * .5], [x + w - 470, y + h * .5]],
    [[x + w - 470, y + h * .5], [x + w, y + h * .5], [x + w, y + h], [x + w - 380, y + h]],
  ];
  cells.forEach((P, i) => panel(P, () => {
    const cx = (P[0][0] + P[2][0]) / 2, cy = (P[0][1] + P[2][1]) / 2;
    focus(cx, cy, { n: 60, r0: 120, r1: [500, 700], w: 10, seed: i });
    carve(place(K.faceFront(faces[i]), cx, cy + 20, .5), { sp: 5, halo: 5, skinLine: 3 });
  }));
  // 中间：方源（无集中线，静）
  const mid = [[x + 560, y], [x + w - 560, y], [x + w - 470, y + h * .5], [x + w - 380, y + h], [x + 380, y + h], [x + 470, y + h * .5]];
  panel(mid, () => {
    sky(x + 380, y, x + w - 380, y + h, { sp: 14, tone: () => .18, seed: 8 });
    carve(place(K.faceFront({ hair: 'fy' }), 960, y + h * .5, .9), { sp: 6, halo: 8, skinLine: 4, light: WC.light(.8, -.4, .4) });
  });
};
// K8 各自的坚持：四联竖格，格顶刻字
SH.K8 = (t, r) => {
  const [x, y, w, h] = r, cw = w / 4;
  const who = [
    ['责任', { hair: 'fy', crown: 'official', mouth: 'grit', brow: -.8, eye: .8, sweat: 1 }],
    ['仇恨', { hair: 'pony', mouth: 'roar', brow: -1, eye: 1, tinyPupil: 1 }],
    ['精彩', { hair: 'silver', mouth: 'grin', brow: -.3, eye: 1, tinyPupil: 1 }],
    ['爱情', { hair: 'old', mouth: 'cry', brow: 1, eye: .3, tears: 1, age: 1 }],
  ];
  who.forEach(([word, f], i) => {
    const P = [[x + i * cw, y], [x + (i + 1) * cw, y], [x + (i + 1) * cw, y + h], [x + i * cw, y + h]];
    panel(P, () => {
      const cx = x + i * cw + cw / 2;
      focus(cx, y + h * .55, { n: 50, r0: 150, r1: [500, 700], w: 9, seed: 20 + i });
      carve(place(K.faceFront(f), cx, y + h * .6, .55), { sp: 5, halo: 5 });
      m.font = '110px MSZ'; m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillStyle = '#fff'; m.strokeStyle = '#000'; m.lineWidth = 10;
      m.strokeText(word, cx, y + 90); m.fillText(word, cx, y + 90);
    });
  });
};
// K9 前世 ↔ 今生：同一个侧脸。左半是木版本身（前世，在哭），右半是印出来的现在（面无表情）
SH.K9 = (t, r) => {
  const [x, y, w, h] = r;
  m.save(); m.beginPath(); m.rect(x, y, w / 2, h); m.clip();
  sky(x, y, x + w / 2, y + h, { sp: 11, seed: 13, tone: (a, b) => .55 + .3 * (b - y) / h });
  mountains(y + h * .7, 7, 180, { sp: 5 });
  carve(place(K.faceSide({ hair: 'young', mouth: 'cry', brow: 1, eye: .35, tears: 1 }), x + w * .24, y + h * .5, .8), { sp: 6, halo: 7 });
  m.restore();
  m.save(); m.beginPath(); m.rect(x + w / 2, y, w / 2, h); m.clip();
  sky(x + w / 2, y, x + w, y + h, { sp: 13, seed: 14, tone: (a, b) => .12 + .25 * (b - y) / h });
  carve(place(K.faceSide({ hair: 'fy' }), x + w * .74, y + h * .5, .8), { sp: 6, halo: 7, light: WC.light(.9, -.3, .3) });
  m.restore();
  m.fillStyle = '#fff'; m.fillRect(x + w / 2 - 7, y, 14, h);
  m.font = '64px MSZ'; m.textAlign = 'left'; m.fillStyle = '#fff'; m.fillText('前世', x + 40, y + 80); m.textAlign = 'right'; m.fillText('今生', x + w - 40, y + 80);
};
// K10 光芒骤放：IMAX 满版。光从他胸口刻出来：放射的宽刀把黑木一层层剥成白，只留下他的剪影与黑电
SH.K10 = (t, r) => {
  const [x, y, w, h] = r, cx = 960, cy = y + h * .42;
  WC.drawStrokes(m, WC.rays(cx, cy, { n: 96, r0: 80, r1: [1100, 1500], w: 34, jit: .7, seed: 4 }), { color: '#fff' });
  WC.drawStrokes(m, WC.rays(cx, cy, { n: 60, r0: 30, r1: [380, 620], w: 30, jit: .9, seed: 9 }), { color: '#fff' });
  const core = pc; // 不用色版：坚持仙蛊是白
  fillPoly(ell(cx, cy, 120, 120), '#fff');
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + .3; lightning(cx + Math.cos(a) * 190, cy + Math.sin(a) * 170, cx + Math.cos(a) * 640, cy + Math.sin(a) * 560, 30 + i, 11); }
  // 他：正面逆光，黑剪影 + 白色轮廓光 + 衣领与长发的刀痕
  const fy = place(K.fyFront({}), cx, y + h + 20, .9);
  sil(fy.filter(p => p.P).map(p => ({ ...p, role: 'dark' })), 10);
  for (const p of fy) if (p.L || p.id.startsWith('collar')) { if (p.P) fillPoly(p.P, '#fff'); else cutLine(p.L, 3, 'v', 5); }
  // 胸口的光从袍子裂缝里透出
  WC.drawStrokes(m, WC.rays(cx, cy + 260, { n: 24, r0: 6, r1: [90, 220], w: 8, seed: 3 }), { color: '#fff' });
  fillPoly(ell(cx, cy + 250, 34, 34), '#fff');
  // 前景：背过脸、抬手挡光的群仙（黑剪影，被光勾出白边）
  const crowd = [[x + 120, .9, -1], [x + 330, .75, -1], [x + w - 140, .9, 1], [x + w - 360, .72, 1]];
  for (const [px, sc, fl] of crowd) sil(place(K.shieldSide(), px, y + h + 120, sc, -fl), 8);
  sfx('轰', x + 230, y + 200, 300, -.15);
};
// K11 炼成：河水第一次没有跟着往前涨（首尾呼应）
SH.K11 = (t, r) => {
  const [x, y, w, h] = r, wl = y + h * .68;
  sky(x, y, x + w, wl, { sp: 12, seed: 22, tone: (a, b) => .62 + .35 * Math.pow((b - y) / (wl - y), 1.3) });
  hatchPoly([[x, wl], [x + w, wl], [x + w, y + h], [x, y + h]], { angle: 0, v: .985, sp: 11, kind: 'u', seg: [400, 1400], gap: [2, 8], seed: 6 });
  mountains(wl, 9, 60, { sp: 4 });
  const edge = 1180, riv = C([[x - 10, wl + 4], [edge - 60, wl + 6], [edge + 8, wl + 18], [edge - 80, wl + 60], [x + 400, y + h - 40], [x - 10, y + h]], 6);
  fillPoly(riv, '#000'); water(riv, { v: .3, sp: 6, seg: [60, 300] });
  carve(place(K.fyWalk({ carry: 'corpse', wind: .15 }), edge - 110, wl + 22, .66), { sp: 7, halo: 7, lo: .5, light: WC.light(.3, -.9, .4) });
  m.strokeStyle = '#fff'; m.lineWidth = 4; m.beginPath(); m.ellipse(edge - 40, wl + 20, 170, 22, 0, 0, 7); m.stroke();
};

// 造型板：方源三面 + 群像
function sheet() {
  const r = [36, 36, 1848, 932]; RECT = r;
  block(r); sky(36, 36, 1884, 968, { sp: 16, tone: () => .9, seed: 2 });
  const L = WC.light(.6, -.6, .5);
  carve(place(K.fyFront({}), 260, 640, .56), { sp: 6, halo: 6, light: L });
  carve(place(K.fyWalk({}), 470, 640, .56), { sp: 6, halo: 6, light: L });
  carve(place(K.fyFront({ back: true }), 700, 640, .56), { sp: 6, halo: 6, light: L });
  carve(place(K.faceFront({ hair: 'fy' }), 1040, 330, .42), { sp: 5, halo: 5 });
  // 群像
  const row = 930;
  carve(place(K.xuehuSide({ roar: .6 }), 1340, 620, .4), { sp: 5, halo: 5 });
  carve(place(K.maoSide({ lie: 0, tail: .5 }), 1560, 620, .13), { sp: 4, halo: 4 });
  carve(place(K.zhaoRise(), 140, row, .25), { sp: 4, halo: 4 });
  carve(place(K.corpse(), 330, row - 0, .3), { sp: 4, halo: 4 });
  carve(place(K.immortalSide({}), 560, row, .3), { sp: 4, halo: 4 });
  carve(place(K.faceSide({ hair: 'silver', mouth: 'grin', eye: 1 }), 800, row - 120, .22), { sp: 4, halo: 4 });
  carve(place(K.faceSide({ hair: 'pony', mouth: 'roar', brow: -1 }), 1010, row - 120, .22), { sp: 4, halo: 4 });
  carve(place(K.faceSide({ hair: 'snowtop', beard: 'snow', mouth: 'roar', brow: -1, eye: 1 }), 1220, row - 120, .22), { sp: 4, halo: 4 });
  carve(place(K.maoFace({ bristle: .6, mouth: .6 }), 1520, row - 140, .16), { sp: 4, halo: 4 });
  m.font = '30px WK'; m.textAlign = 'center'; m.fillStyle = '#000';
  const labels = [[260, '方源 · 正'], [470, '侧'], [700, '背'], [1040, '面无表情'], [1340, '雪胡老祖'], [1640, '毛里球（狗尾续命貂）']];
  for (const [lx, s] of labels) { m.fillStyle = '#fff'; m.fillRect(lx - 110, 650, 220, 44); m.fillStyle = '#000'; m.fillText(s, lx, 682); }
  const labels2 = [[140, '赵怜云'], [330, '马鸿运'], [560, '碧晨天/威灵仰'], [800, '白凝冰'], [1010, '黑楼兰'], [1220, '雪胡（侧）'], [1520, '毛里球（正）']];
  for (const [lx, s] of labels2) { m.fillStyle = '#fff'; m.fillRect(lx - 100, 1010, 200, 44); m.fillStyle = '#000'; m.fillText(s, lx, 1042); }
}

export function render(cv, t, q) {
  const g = cv.getContext('2d');
  m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over'; m.globalAlpha = 1;
  m.fillStyle = '#fff'; m.fillRect(0, 0, W, H);
  pc.setTransform(1, 0, 0, 1, 0, 0); pc.clearRect(0, 0, W, H);
  if (q.get('sheet')) { sheet(); g.drawImage(PR.render(mask, plateCv, { seed: 3, plate: BLUE }), 0, 0); return; }
  const k = keyAt(t), r = plateRect(t); RECT = r;
  block(r);
  clipPlate(() => SH[k.id](t, r), r);
  if (!q.get('nosub')) caption(t, r);
  if (k.id === 'K9') {
    // 左半印成“木版”（前世），右半是纸上的印（今生）
    tg.drawImage(PR.render(mask, plateCv, { seed: 3, plate: BLUE, mode: 'block', sheen: .25 }), 0, 0);
    g.drawImage(PR.render(mask, plateCv, { seed: 3, plate: BLUE }), 0, 0);
    g.drawImage(tmp, r[0], r[1], r[2] / 2, r[3], r[0], r[1], r[2] / 2, r[3]);
    return;
  }
  g.drawImage(PR.render(mask, plateCv, { seed: 3, inkSeed: Math.floor(t * 12), plate: BLUE }), 0, 0);
}
