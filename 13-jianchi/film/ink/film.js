// 中国水墨 × 航海王 × 诺兰：宣纸、五墨、留白。飞白放射笔 = 集中线；狂草写拟声字；泼墨溅点 = 冲击。
// 手卷（上下绫裱）就是 2.39:1 的遮幅，204.6 秒起绫裱退开成整幅立轴（IMAX）。全片只破一次例：爱情仙蛊的一抹花青。
import { mk, draw, mass, blot, TONE } from './ink.js';
import { makeComp, layerSet } from './comp.js';
import { ridgeFn, mountainLayer, ripple } from './land.js';
import * as K from '../shared/cast.js';
import { cueAt, keyAt, imax } from '../shared/story.js';
import { C, O, ell, rng, path, xf, ribbon } from '../shared/geo.js';

const W = 1920, H = 1080, VERM = [176, 46, 34], AZURE = [38, 104, 168];
let A, comp, glc;
export function init() { glc = document.createElement('canvas'); glc.width = W; glc.height = H; comp = makeComp(glc); A = layerSet(W, H); }
const hs = s => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 100003; return h; };
function place(parts, X, Y, s, fl = 1, rot = 0) {
  const c = Math.cos(rot), n = Math.sin(rot);
  const T = ([x, y]) => { const u = x * s * fl, v = y * s; return [X + u * c - v * n, Y + u * n + v * c]; };
  return parts.map(p => ({ ...p, P: p.P ? p.P.map(T) : null, L: p.L ? p.L.map(T) : null, w: p.w ? p.w * s : 0, s }));
}
// 多边形外轮廓切成几段，用含墨笔勾（没骨：浓边即轮廓）
function contour(P, o) {
  const n = P.length, segs = o.segs ?? Math.max(2, Math.min(6, Math.round(n / 40)));
  for (let k = 0; k < segs; k++) {
    if (o.skip && o.skip(k)) continue;
    const a = Math.floor(k * n / segs), b = Math.floor((k + 1) * n / segs) + 2;
    const pts = []; for (let i = a; i <= Math.min(b, n); i++) pts.push(P[i % n]);
    if (pts.length < 3) continue;
    const step = Math.max(1, Math.floor(pts.length / 8)), cp = pts.filter((_, i) => i % step === 0);
    draw(A.ink, mk(cp, { w: o.w, tone: o.tone ?? TONE.nong, dry: o.dry ?? .35, wet: o.wet ?? .35, prof: o.prof || 'brush', seed: (o.seed ?? 1) * 17 + k, darkDir: o.darkDir, side: o.darkDir ? .7 : 0, brWet: !!o.brWet }), 1, o.am ?? 1);
  }
}
// 角色部件 → 墨。o.s 屏幕缩放（决定笔宽）
function paint(parts, o = {}) {
  const s = parts[0]?.s ?? 1, k = o.k ?? 1;
  for (const p of parts) {
    const seed = hs(p.id) + (o.seed ?? 0);
    if (p.P) {
      const isHair = /hair|lock|pony|knot|bun/i.test(p.id);
      switch (p.role) {
        case 'dark': case 'accent':
          if (isHair && /lock|pony/i.test(p.id)) {
            const n = p.P.length, half = Math.floor(n / 2), cl = [];
            for (let i = 0; i < half; i += Math.max(1, Math.floor(half / 7))) { const a = p.P[i], b = p.P[n - 1 - i]; cl.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 1]); }
            const w0 = Math.hypot(p.P[0][0] - p.P[n - 1][0], p.P[0][1] - p.P[n - 1][1]);
            draw(A.ink, mk(cl, { w: Math.max(3, w0 * 1.1), tone: TONE.jiao, dry: .45, wet: .5, prof: 'cone', brWet: true, seed }), 1, k);
          } else if (isHair) { const [x0, y0, x1, y1] = (() => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of p.P) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; })();
            mass(A.cw, p.P, .8 * k, 2, seed, [0, y0, 0, y1, 1.1, .55]); contour(p.P, { w: Math.max(3, 18 * s * k), tone: TONE.jiao, dry: .55, wet: .3, seed, prof: 'tip', segs: 3, skip: q => q === 1 }); }
          else {
            mass(A.cw, p.P, (o.robe ?? .42) * k * .7, 3, seed, o.grad);
            contour(p.P, { w: Math.max(3, 26 * s * k), tone: TONE.nong, dry: .5, wet: .5, seed, darkDir: o.dark || [1, 0], brWet: true, skip: q => q % 3 === 2 });
            if (/robe|sleeve|cloak|body/.test(p.id)) for (const f of parts.filter(q => q.role === 'fold' && q.L)) {
              const pts = f.L.filter((_, i) => i % Math.max(1, Math.floor(f.L.length / 5)) === 0).concat([f.L[f.L.length - 1]]);
              draw(A.ink, mk(pts, { w: Math.max(6, 70 * s * k), tone: TONE.zhong, dry: .45, wet: .8, prof: 'robe', darkDir: [1, 0], side: .8, brWet: true, seed: hs(f.id) + seed }), 1, .75);
            }
          }
          break;
        case 'mid': mass(A.cw, p.P, .2 * k, 3, seed); contour(p.P, { w: Math.max(2, 12 * s * k), tone: TONE.zhong, dry: .5, wet: .4, seed, segs: 3 }); break;
        case 'skin': mass(A.cw, p.P, .04, 1, seed); contour(p.P, { w: Math.max(1.8, 8 * s), tone: TONE.zhong, dry: .3, wet: .15, seed, prof: 'brush', segs: 5, skip: q => q === 1 || q === 3 }); break;
        case 'white': mass(A.cw, p.P, .05, 2, seed); contour(p.P, { w: Math.max(1.6, 7 * s), tone: TONE.zhong, dry: .55, wet: .15, seed, prof: 'brush', segs: 5, skip: q => q === 3 }); break;
        case 'tooth': contour(p.P, { w: Math.max(1.4, 4 * s), tone: TONE.zhong, dry: .3, wet: .1, seed, prof: 'tip', segs: 2 }); break;
        case 'hole': mass(A.cd, p.P, .9, 1, seed); break;
      }
    } else if (p.L) {
      const fold = p.role === 'fold';
      const pts = p.L.filter((_, i) => i % Math.max(1, Math.floor(p.L.length / 6)) === 0).concat([p.L[p.L.length - 1]]);
      draw(A.ink, mk(pts, { w: Math.max(1.6, (fold ? 1.5 : 1.1) * p.w), tone: fold ? TONE.zhong : TONE.jiao, dry: fold ? .55 : .15, wet: fold ? .2 : 0, prof: fold ? 'tip' : 'even', seed: hs(p.id) }), 1, 1);
    }
  }
}
// 飞白放射笔（集中线）：从画外扫向中心，起笔重、收于空
function focus(cx, cy, o = {}) {
  const R = rng(o.seed ?? 3), n = o.n ?? 46;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + (R() - .5) * .08, r1 = 1300, r0 = (o.r0 ?? 360) * (.85 + R() * .5);
    const pts = [[cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], [cx + Math.cos(a) * (r0 + 200), cy + Math.sin(a) * (r0 + 200)], [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]];
    draw(A.ink, mk(pts, { w: (o.w ?? 26) * (.5 + R()), tone: TONE.nong, dry: .85, wet: 0, prof: 'cone', seed: 300 + i }), 1, .9);
  }
}
// 狂草拟声字：字写进干墨层 + 湿边 + 溅点
function sfx(text, x, y, size, rot = 0, a = .95) {
  for (const [c, k] of [[A.cw, .5], [A.cd, a]]) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.translate(x, y); c.rotate(rot); c.globalAlpha = k; c.fillStyle = '#000'; c.font = `${size}px MSZ`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, 0); c.restore(); }
  const R = rng(hs(text) + x);
  for (let i = 0; i < 22; i++) blot(A.cd, x + (R() - .5) * size * 1.4, y + (R() - .5) * size * 1.2, 2 + R() * 9, .85, R() * 3, .6 + R() * .4, i);
}
function splatter(x, y, r, n = 40, seed = 1) { const R = rng(seed); for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, d = r * Math.pow(R(), .6); blot(A.cd, x + Math.cos(a) * d, y + Math.sin(a) * d, 1.5 + R() * 7 * (1 - d / r + .2), .85, a, .5 + R() * .5, i + seed); } }
// 远山
function hills(y, tone, seed, peaks, depth = 220, x0 = 0) {
  const ridge = ridgeFn(peaks, y, seed, 22);
  const cv = mountainLayer({ W, H, ridge, depth, tone, rim: .7, rimW: 14, mist: 1, seed });
  A.cw.save(); A.cw.setTransform(1, 0, 0, 1, 0, 0); A.cw.drawImage(cv, 0, 0); A.cw.restore();
}
// 水面：留白，几笔淡墨干笔横扫
function water(x0, y0, x1, y1, n = 14, seed = 4, tone = TONE.dan) { const R = rng(seed); for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * R(), x = x0 + (x1 - x0) * R() * .8, L = 120 + R() * 380; draw(A.ink, mk([[x, y], [x + L * .5, y + (R() - .5) * 6], [x + L, y + (R() - .5) * 4]], { w: 4 + R() * 8, tone, dry: .8, prof: 'lens', seed: 900 + i + seed * 50 }), 1, .8); } }
// 朱印
function seal(x, y, S, text, seed = 3) {
  const c = A.cc; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.translate(x, y);
  const R = rng(seed); c.beginPath(); for (let i = 0; i < 24; i++) { const t = i / 24 * 4, sd = Math.floor(t), u = t - sd; let px = [u * S, S, S - u * S, 0][sd], py = [0, u * S, S, S - u * S][sd]; px += (R() - .5) * S * .03; py += (R() - .5) * S * .03; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath();
  c.fillStyle = `rgb(${VERM.join(',')})`; c.fill();
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.font = `${S * (text.length > 2 ? .42 : .46)}px MSZ`; c.textAlign = 'center'; c.textBaseline = 'middle';
  if (text.length <= 2) { c.fillText(text[0], S * .5, S * .28); if (text[1]) c.fillText(text[1], S * .5, S * .72); } else { c.fillText(text.slice(0, 2), S * .5, S * .3); c.fillText(text.slice(2), S * .5, S * .72); }
  for (let i = 0; i < 40; i++) { c.globalAlpha = .5; c.beginPath(); c.arc(R() * S, R() * S, S * .01 * R(), 0, 7); c.fill(); }
  c.restore();
}
// 绫裱（手卷遮幅）
function mount(t) {
  if (imax(t)) return;
  const c = A.cc; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  for (const [y, h] of [[0, 128], [H - 128, 128]]) { c.fillStyle = 'rgb(168,160,140)'; c.fillRect(0, y, W, h); c.fillStyle = 'rgb(112,100,78)'; c.fillRect(0, y === 0 ? h - 8 : y, W, 8); }
  for (const cc of [A.cw, A.cd]) { cc.save(); cc.setTransform(1, 0, 0, 1, 0, 0); cc.globalCompositeOperation = 'destination-out'; cc.fillStyle = '#000'; cc.fillRect(0, 0, W, 128); cc.fillRect(0, H - 128, W, 128); cc.restore(); }
  c.restore();
}
// 题跋字幕：写在下方绫裱上（遮幅里），IMAX 段落写在画心留白处；句首小朱印
function caption(t, x, y, onMount) {
  const c = cueAt(t); if (!c) return;
  const shout = /！！|？！/.test(c.text), size = shout ? 50 : 42;
  const who = c.who !== '旁白' ? c.who + '：' : '';
  if (!onMount) for (const cc of [A.cw, A.cd]) { cc.save(); cc.setTransform(1, 0, 0, 1, 0, 0); cc.font = `${size}px WK`; const tw = cc.measureText(who + c.text).width; cc.globalCompositeOperation = 'destination-out'; cc.fillStyle = 'rgba(0,0,0,.94)'; cc.fillRect(x - 20, y - size * 1.05, tw + size * 1.6, size * 1.45); cc.restore(); }
  const cc = A.cc; cc.save(); cc.setTransform(1, 0, 0, 1, 0, 0); cc.font = `${size}px WK`; cc.textBaseline = 'alphabetic';
  cc.fillStyle = 'rgba(28,24,20,.95)'; cc.fillText(who + c.text, x + size * .7, y);
  const s2 = size * .34; cc.fillStyle = `rgb(${VERM.join(',')})`; cc.fillRect(x, y - size * .38 - s2 / 2, s2, s2); cc.restore();
}

// ═════════════ 镜头 ═════════════
const SH = {};
SH.K1 = () => {
  // 手卷：雪原就是白纸。远山入雾，一条淡墨的河从近处蜿蜒到一个尖，尖上一个人
  hills(420, .3, 3, [[260, 150, 160], [620, 90, 120], [1180, 170, 200], [1600, 110, 140]], 180);
  hills(470, .5, 7, [[100, 60, 90], [900, 80, 120], [1750, 70, 100]], 120);
  const tip = [1040, 600];
  const Lb = O([[380, 1080], [560, 940], [760, 790], [940, 670], [tip[0] - 14, tip[1] + 8], tip], 6), Rb = O([tip, [tip[0] + 16, tip[1] + 14], [1000, 690], [1040, 800], [1280, 980], [1500, 1080]], 6);
  mass(A.cw, Lb.concat(Rb), .3, 3, 5, [0, 600, 0, 1080, .5, 1.1]);
  draw(A.ink, mk(Lb.filter((_, i) => i % 6 === 0), { w: 10, tone: .8, dry: .5, wet: .3, prof: 'rise', seed: 21 }));
  draw(A.ink, mk(Rb.filter((_, i) => i % 6 === 0), { w: 10, tone: .8, dry: .5, wet: .3, prof: 'cone', seed: 22 }));
  water(560, 820, 1300, 1060, 16, 3, TONE.qing);
  paint(place(K.fyWalk({ carry: 'corpse' }), tip[0] + 2, tip[1] + 8, .085), { robe: .85 });
  // 左岸雪坡：雪胡一方
  draw(A.ink, mk([[0, 700], [200, 640], [430, 650], [600, 720]], { w: 40, tone: .6, darkDir: [0, 1], side: .8, brWet: true, dry: .6, wet: .7, prof: 'robe', seed: 31 }));
  paint(place(K.xuehuSide({ roar: .4 }), 310, 650, .13), { robe: .9 });
  for (const [dx, sc] of [[400, .1], [450, .095], [200, .09]]) paint(place(K.fyFront({}), dx, 658, sc * .9), { robe: .8 });
  // 右岸：毛里球是一大团湿墨，一根狗尾翘起
  paint(place(K.maoSide({ lie: 1, tail: .4 }), 1380, 760, .2), { robe: .7, dark: [0, -1] });
  for (let i = 0; i < 5; i++) paint(place(K.immortalSide({ flip: i % 2 }), 700 + i * 150, 250 + (i % 2) * 36, .085), { robe: .6 });
  seal(1740, 160, 90, '逆流');
};
SH.K2 = () => {
  focus(960, 640, { n: 54, r0: 380, w: 30 });
  paint(place(K.faceFront({ hair: 'snowtop', beard: 'snow', mouth: 'roar', brow: -1, eye: 1, tinyPupil: 1, age: .8, veins: 1, thickBrow: 1, wide: 1.1 }), 960, 560, .8), { robe: .8 });
  splatter(960, 640, 420, 60, 7);
  sfx('吼', 330, 420, 380, -.15); sfx('！！', 1640, 380, 220, .15);
};
SH.K3 = () => {
  focus(960, 560, { n: 60, r0: 420, w: 34, seed: 5 });
  const f = place(K.maoFace({ bristle: 1, mouth: 1 }), 960, 520, .55);
  // 鬃毛：湿墨团 + 放射的干笔
  const mane = f.find(p => p.id === 'mane'); mass(A.cw, mane.P, .55, 3, 2);
  const R = rng(9); for (let i = 0; i < 70; i++) { const a = i / 70 * Math.PI * 2, r0 = 240 + R() * 60, r1 = 380 + R() * 120; draw(A.ink, mk([[960 + Math.cos(a) * r0, 520 + Math.sin(a) * r0], [960 + Math.cos(a) * r1, 520 + Math.sin(a) * r1]], { w: 12 + R() * 14, tone: .9, dry: .7, prof: 'cone', seed: 500 + i })); }
  paint(f.filter(p => p.id !== 'mane'), { robe: .7 });
  splatter(960, 560, 500, 50, 3);
  sfx('嗷', 1600, 520, 380, .15); sfx('！！！', 300, 820, 180, -.1);
};
SH.K4 = () => {
  // 花青光柱（全片唯一的破例）
  const c = A.cc; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const gr = c.createLinearGradient(1180, 0, 1460, 0); gr.addColorStop(0, `rgba(${AZURE},0)`); gr.addColorStop(.5, `rgba(${AZURE},.55)`); gr.addColorStop(1, `rgba(${AZURE},0)`);
  c.fillStyle = gr; c.fillRect(1100, 0, 440, 900);
  const rg = c.createRadialGradient(1320, 420, 30, 1320, 420, 360); rg.addColorStop(0, `rgba(${AZURE},.6)`); rg.addColorStop(1, `rgba(${AZURE},0)`); c.fillStyle = rg; c.fillRect(900, 0, 900, 900);
  c.restore();
  paint(place(K.zhaoRise(), 1320, 640, .4), { robe: .3 });
  water(0, 860, W, 1000, 18, 7);
  paint(place(K.fyWalk({ carry: 'corpse', look: 1, wind: .3 }), 560, 950, .68), { robe: .55 });
  sfx('嗡', 1700, 300, 200, .1, .8);
};
SH.K5 = () => {
  // 俯拍：他是白纸中央的一个小墨点，四边压进来的是叫嚣的脸，天上一只淡墨的眼
  const eye = C([[660, 230], [960, 120], [1260, 230], [960, 340]]);
  contour(eye, { w: 12, tone: .85, dry: .5, wet: .2, segs: 2 }); mass(A.cw, ell(960, 230, 80, 80), .85, 2, 3); blot(A.cd, 940, 210, 14, -0, 0);
  focus(960, 700, { n: 70, r0: 170, w: 14, seed: 12 });
  paint(place(K.fyWalk({ carry: 'corpse', look: 1 }), 960, 740, .2), { robe: .9 });
  draw(A.ink, mk([[780, 742], [960, 750], [1140, 742]], { w: 8, tone: .5, dry: .6, prof: 'lens', seed: 4 }));
  paint(place(K.faceSide({ hair: 'snowtop', beard: 'snow', mouth: 'roar', brow: -1, eye: 1, age: .8 }), 160, 600, .9), { robe: .6 });
  paint(place(K.maoSide({ bristle: 1, mouth: 1 }), 2250, 1000, .5), { robe: .55 });
  paint(place(K.faceFront({ hair: 'fy', crown: 'official', mouth: 'roar', brow: -1, eye: 1, tinyPupil: 1 }), 520, 1180, .5, 1, .25), { robe: .5 });
  paint(place(K.faceFront({ hair: 'pony', mouth: 'roar', brow: -1, eye: 1, tinyPupil: 1 }), 1420, 1200, .5, 1, -.3), { robe: .5 });
  sfx('死', 520, 330, 200, -.25); sfx('杀', 1440, 330, 200, .22);
};
SH.K6 = () => {
  water(0, 680, W, 1060, 26, 8);
  draw(A.ink, mk([[0, 676], [W, 672]], { w: 6, tone: .5, dry: .7, prof: 'even', seed: 3 }));
  // 腿：一笔浓墨向上急收；头在画框顶
  draw(A.ink, mk([[1080, 470], [1000, 300], [960, 130]], { w: 260, tone: .85, dry: .3, wet: .7, prof: 'cone', darkDir: [1, 0], side: .7, brWet: true, seed: 8 }));
  paint(place(K.fyFront({}).filter(p => ['face', 'hairTop', 'lockL', 'lockR', 'browL', 'browR', 'eyeL', 'eyeR', 'pupilL', 'pupilR', 'nose', 'mouth'].includes(p.id)), 960, 330, .2), {});
  // 脚底：纸白的鞋底面，焦墨的千层底边，一排排焦墨针脚；鞋帮是后面一笔浓墨
  const R0 = -.32, fx = 990, fy = 640;
  const sole = xf(C([[0, -300], [120, -270], [160, -150], [140, -30], [100, 120], [90, 220], [40, 290], [-40, 290], [-90, 220], [-100, 120], [-130, -30], [-150, -150], [-120, -270]], 6), fx, fy, [1.3, 1.1], R0);
  const c = A.cw; c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); path(c, sole); c.fill(); c.restore();
  const d = A.cd; d.save(); d.globalCompositeOperation = 'destination-out'; d.beginPath(); path(d, sole); d.fill(); d.restore();
  mass(A.cw, sole, .08, 2, 4);
  contour(sole, { w: 26, tone: .97, dry: .25, wet: .2, seed: 6, prof: 'even', segs: 5 });
  for (let i = -6; i <= 6; i++) for (let j = -2; j <= 2; j++) { const [px, py] = xf([[j * 34, i * 40]], fx, fy, [1.3, 1.1], R0)[0]; blot(A.cd, px, py, 4.5, .9, R0, .5, i * 9 + j); }
  splatter(990, 980, 520, 90, 11);
  for (let k = 0; k < 4; k++) ripple(A.ink, 990, 1000, 200 + k * 140, .8 - k * .15, k + 3, .16, 5);
  sfx('咚', 360, 420, 400, -.18);
};
function panel(P, fn, k = 1) { for (const c of [A.cw, A.cd, A.cc]) { c.save(); c.beginPath(); path(c, P); c.clip(); } fn(); for (const c of [A.cw, A.cd, A.cc]) c.restore(); contour(P, { w: 6, tone: .7, dry: .7, wet: .05, segs: P.length, prof: 'tip', seed: k }); }
SH.K7 = () => {
  const faces = [{ hair: 'wild', mouth: 'grit', brow: -1, eye: 1, tinyPupil: 1, veins: 1 }, { hair: 'fy', mouth: 'cry', brow: 1, eye: .1, sweat: 1 }, { hair: 'silver', mouth: 'grin', brow: -.4, eye: 1, tinyPupil: 1 }, { hair: 'old', mouth: 'cry', brow: 1, eye: .3, tears: 1, age: 1 }];
  const cells = [[[60, 150], [600, 150], [520, 530], [60, 530]], [[60, 550], [516, 550], [430, 930], [60, 930]], [[1320, 150], [1860, 150], [1860, 530], [1400, 530]], [[1404, 550], [1860, 550], [1860, 930], [1490, 930]]];
  cells.forEach((P, i) => panel(P, () => { const cx = (P[0][0] + P[2][0]) / 2, cy = (P[0][1] + P[2][1]) / 2; focus(cx, cy, { n: 30, r0: 140, w: 16, seed: 40 + i }); paint(place(K.faceFront(faces[i]), cx, cy + 20, .48), { robe: .6 }); }, i));
  panel([[616, 150], [1304, 150], [1384, 530], [1474, 930], [446, 930], [536, 530]], () => paint(place(K.faceFront({ hair: 'fy' }), 960, 540, .88), { robe: .55 }), 9);
};
SH.K8 = () => {
  const who = [['责任', { hair: 'fy', crown: 'official', mouth: 'grit', brow: -.8, eye: .8, sweat: 1 }], ['仇恨', { hair: 'pony', mouth: 'roar', brow: -1, eye: 1, tinyPupil: 1 }], ['精彩', { hair: 'silver', mouth: 'grin', brow: -.3, eye: 1, tinyPupil: 1 }], ['爱情', { hair: 'old', mouth: 'cry', brow: 1, eye: .3, tears: 1, age: 1 }]];
  who.forEach(([word, f], i) => {
    const x0 = 80 + i * 450;
    panel([[x0, 150], [x0 + 420, 150], [x0 + 420, 930], [x0, 930]], () => {
      paint(place(K.faceFront(f), x0 + 210, 640, .55), { robe: .6 });
      sfx(word, x0 + 210, 270, 120, 0, .95);
    }, 20 + i);
  });
};
SH.K9 = () => {
  // 左：淡墨的前世（墨晕里浮出来），右：浓墨的今生；同一个侧脸
  hills(520, .25, 11, [[200, 160, 160], [700, 110, 120]], 200);
  paint(place(K.faceSide({ hair: 'young', mouth: 'cry', brow: 1, eye: .35, tears: 1 }), 470, 560, .8), { k: .55, robe: .3 });
  draw(A.ink, mk([[960, 150], [962, 540], [958, 930]], { w: 10, tone: .7, dry: .7, prof: 'even', seed: 3 }));
  paint(place(K.faceSide({ hair: 'fy' }), 1430, 560, .8), { robe: .75 });
  sfx('前世', 230, 260, 90, 0, .55); sfx('今生', 1690, 260, 90, 0, .95);
};
SH.K10 = () => {
  // 整幅立轴：满纸浓墨的夜，光是“提走的墨”——从他胸口往外，纸白一层层露出来
  const c = A.cw; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = 'rgba(0,0,0,.88)'; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'destination-out';
  const rg = c.createRadialGradient(960, 420, 40, 960, 420, 700); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(.35, 'rgba(0,0,0,.95)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(0, 0, W, H);
  const R = rng(4); for (let i = 0; i < 70; i++) { const a = i / 70 * Math.PI * 2 + R() * .05, w = .012 + R() * .02; c.beginPath(); c.moveTo(960, 420); c.lineTo(960 + Math.cos(a - w) * 1600, 420 + Math.sin(a - w) * 1600); c.lineTo(960 + Math.cos(a + w) * 1600, 420 + Math.sin(a + w) * 1600); c.closePath(); c.fillStyle = `rgba(0,0,0,${.3 + R() * .6})`; c.fill(); }
  c.restore();
  // 他：逆光的浓墨剪影
  for (const p of place(K.fyFront({}), 960, 1090, .9)) if (p.P) mass(A.cd, p.P, p.role === 'white' ? .5 : .95, 2, hs(p.id));
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + .3, pts = [[960 + Math.cos(a) * 170, 420 + Math.sin(a) * 160]]; for (let k = 1; k < 7; k++) pts.push([960 + Math.cos(a) * (170 + k * 75) + (R() - .5) * 80, 420 + Math.sin(a) * (160 + k * 70) + (R() - .5) * 80]); draw(A.ink, mk(pts, { w: 12, tone: .98, dry: .2, prof: 'even', seed: 70 + i }), 1, 1); }
  for (const [px, sc, fl] of [[170, .9, 1], [400, .74, 1], [1750, .9, -1], [1520, .74, -1]]) for (const p of place(K.shieldSide(), px, H + 120, sc, fl)) if (p.P) mass(A.cd, p.P, .9, 2, hs(p.id));
  sfx('轰', 300, 260, 300, -.15);
};
SH.K11 = () => {
  // 卷尾：一道地平线，河在他脚边停住；一枚朱印“坚持”
  hills(640, .22, 13, [[300, 90, 160], [1400, 120, 220]], 120);
  draw(A.ink, mk([[0, 700], [900, 702], [W, 698]], { w: 5, tone: .55, dry: .6, prof: 'even', seed: 6 }));
  const edge = 1180; mass(A.cw, C([[0, 704], [edge - 60, 706], [edge + 8, 718], [edge - 80, 760], [400, 1000], [0, 1040]], 6), .35, 3, 4, [0, 700, 0, 1040, .9, .3]);
  water(0, 720, edge, 1000, 12, 9, TONE.dan);
  paint(place(K.fyWalk({ carry: 'corpse', wind: .15 }), edge - 110, 722, .62), { robe: .6 });
  ripple(A.ink, edge - 40, 720, 170, .7, 5, .13, 4);
  seal(1620, 300, 150, '坚持');
};
function sheet() {
  const L = (s, x, y) => { const c = A.cd; c.save(); c.fillStyle = '#000'; c.globalAlpha = .9; c.font = '32px WK'; c.textAlign = 'center'; c.fillText(s, x, y); c.restore(); };
  paint(place(K.fyFront({}), 230, 620, .5), { robe: .55 }); L('方源 · 正', 230, 670);
  paint(place(K.fyWalk({}), 450, 620, .5), { robe: .55 }); L('侧', 450, 670);
  paint(place(K.fyFront({ back: true }), 680, 620, .5), { robe: .55 }); L('背', 680, 670);
  paint(place(K.faceFront({ hair: 'fy' }), 990, 360, .42), { robe: .5 }); L('面无表情', 990, 670);
  paint(place(K.xuehuSide({ roar: .6 }), 1320, 620, .42), { robe: .55 }); L('雪胡老祖', 1320, 670);
  paint(place(K.maoSide({ tail: .5 }), 1560, 620, .13), { robe: .55 }); L('毛里球', 1660, 670);
  const row = 960;
  paint(place(K.zhaoRise(), 150, row, .26), {}); L('赵怜云', 150, row + 50);
  paint(place(K.corpse(), 360, row, .32), {}); L('马鸿运', 360, row + 50);
  paint(place(K.immortalSide({}), 580, row, .3), {}); L('碧晨天/威灵仰', 580, row + 50);
  [['白凝冰', { hair: 'silver', mouth: 'grin', eye: 1 }], ['黑楼兰', { hair: 'pony', mouth: 'roar', brow: -1 }], ['雪胡（侧）', { hair: 'snowtop', beard: 'snow', mouth: 'roar', brow: -1, eye: 1 }]].forEach(([n, f], i) => { paint(place(K.faceSide(f), 820 + i * 220, row - 130, .22), { robe: .5 }); L(n, 820 + i * 220, row + 50); });
  paint(place(K.maoFace({ bristle: .6, mouth: .6 }), 1600, row - 160, .17), { robe: .5 }); L('毛里球（正）', 1600, row + 50);
  seal(1760, 120, 100, '坚持');
}

export function render(cv, t, q) {
  const g = cv.getContext('2d');
  A.clear();
  if (q.get('sheet')) { sheet(); comp(A, null, { bleed: 5, rim: .8, vig: .2, warm: .5 }); g.drawImage(glc, 0, 0); return; }
  const k = keyAt(t);
  SH[k.id](t);
  mount(t);
  if (!q.get('nosub')) caption(t, 160, imax(t) ? H - 60 : H - 46, !imax(t));
  comp(A, null, { bleed: 5, rim: .85, vig: .22, warm: .55 });
  g.drawImage(glc, 0, 0);
}
