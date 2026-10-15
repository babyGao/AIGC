// 皮影戏 × 航海王 × 诺兰：灯透驴皮，色是透过来的；人物侧身、铆钉、操纵杆。
// 航海王：鼓点上的急推 = 冲击帧；拟声字是镂空皮牌；“换头”——别人的头被换成咆哮的头，方源的头从不换。
// 诺兰：天意是举杆的那双手（四面楚歌时去幕后看），高潮时他自己成了灯，幕布被照到发白；画幅由台口（遮幅）推进到满幕。
import { piece, drawPiece, fill, cut, cutLine, ink, within, smooth, poly, scales, scalesOpen, lattice, coin, cloud, beads, beadLine, waves, meander, rivet, strata, cutTaper, DYE, canvas } from './carve.js';
import { makeGL } from './gl.js';
import * as K from '../shared/cast.js';
import { cueAt, keyAt, imax } from '../shared/story.js';
import { C, O, ell, rng, path, xf, ribbon } from '../shared/geo.js';

const W = 1920, H = 1080;
const D = { ...DYE, indigo: '#17293f', night: '#16202c', purple: '#5b2a73', azure: '#1d5a9c', snow: '#efe2c4' };
let GL, glc, trC, tr, frC, fr;
export function init() { glc = document.createElement('canvas'); glc.width = W; glc.height = H; GL = makeGL(glc); [trC, tr] = canvas(W, H); [frC, fr] = canvas(W, H); }
const hs = s => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 100003; return h; };
function place(parts, X, Y, s, fl = 1, rot = 0) {
  const c = Math.cos(rot), n = Math.sin(rot);
  const T = ([x, y]) => { const u = x * s * fl, v = y * s; return [X + u * c - v * n, Y + u * n + v * c]; };
  return parts.map(p => ({ ...p, P: p.P ? p.P.map(T) : null, L: p.L ? p.L.map(T) : null, w: p.w ? p.w * s : 0, s }));
}
const bb = P => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of P) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a - 6, b - 6, c + 6, d + 6]; };
// 一片皮：dye 填色 → 纹样镂空 → 墨线勾边 → 驴皮质感；multiply 到透射画布（重叠处自然更暗）
function hide(P, dye, pat, o = {}) {
  const box = bb(P), q = g => path(g, P);
  const pc = piece(box, g => {
    fill(g, dye, q);
    if (pat) within(g, q, () => pat(g, box));
    ink(g, o.line ?? 2, q, o.lineCol || D.ink);
  }, { ss: 1, seed: o.seed ?? 1 });
  tr.save(); tr.globalCompositeOperation = 'multiply'; if (o.blur) tr.filter = `blur(${o.blur}px)`; if (o.alpha) tr.globalAlpha = o.alpha; drawPiece(tr, pc); tr.restore();
}
// 纹样
const PAT = {
  robe: (g, [x0, y0, x1, y1]) => { const R = rng(Math.round(x0)); for (let i = 0; i < Math.max(2, (x1 - x0) * (y1 - y0) / 9000); i++) cloud(g, x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), 6 + R() * 8, R() * 6, 1.3); },
  gauze: (g, [x0, y0, x1, y1]) => lattice(g, x0, y0, x1, y1, 18, 5.5),
  hair: (g, [x0, y0, x1, y1]) => { for (let x = x0 + 8; x < x1; x += 15) cutLine(g, .8, q => { q.moveTo(x, y0); q.quadraticCurveTo(x - 4, (y0 + y1) / 2, x + 2, y1); }); },
  hideMid: (g, [x0, y0, x1, y1]) => scalesOpen(g, x0, y0, x1, y1, 7),
  fur: (g, [x0, y0, x1, y1]) => { const R = rng(Math.round(y0)); for (let i = 0; i < (x1 - x0) * (y1 - y0) / 700; i++) { const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0); cutTaper(g, [[x, y], [x + 7, y + 6], [x + 16, y + 9]], 3.2); } },
  white: (g, [x0, y0, x1, y1]) => { for (let x = x0 + 5; x < x1; x += 9) cutLine(g, 1.1, q => { q.moveTo(x, y0); q.lineTo(x - 6, y1); }); },
  skinOpen: (g, [x0, y0, x1, y1]) => cut(g, q => q.rect(x0, y0, x1 - x0, y1 - y0)),
  water: (g, [x0, y0, x1, y1]) => waves(g, x0, y0, x1, y1, 9, 1.6),
  snow: (g, [x0, y0, x1, y1]) => { for (let k = 1; k < 8; k++) cutLine(g, 1.6, q => { q.moveTo(x0, y0 + k * (y1 - y0) / 8); q.bezierCurveTo((x0 + x1) / 2, y0 + k * (y1 - y0) / 8 - 14, (x0 + x1) / 2, y0 + k * (y1 - y0) / 8 + 14, x1, y0 + k * (y1 - y0) / 8); }); },
};
// 角色部件 → 皮影。o.solidFace = 反派实脸；o.dye 覆盖袍色
function puppet(parts, o = {}) {
  const robe = o.dye || D.indigo, s = parts[0]?.s ?? 1;
  for (const p of parts) {
    const seed = hs(p.id);
    if (p.P) {
      const isHair = /hair|lock|pony|knot|bun|topknot/i.test(p.id);
      switch (p.role) {
        case 'dark': hide(p.P, isHair ? D.ink : robe, isHair ? PAT.hair : (/sleeve/i.test(p.id) && s > .3 ? PAT.gauze : PAT.robe), { seed, blur: o.blur }); break;
        case 'accent': hide(p.P, o.accent || D.purple, PAT.fur, { seed, blur: o.blur }); break;
        case 'mid': hide(p.P, o.mid || D.hide2, PAT.hideMid, { seed, blur: o.blur }); break;
        case 'skin': hide(p.P, o.solidFace ? (o.face || '#c4542e') : '#fff6e2', null, { seed, line: Math.max(1.6, 4 * s), blur: o.blur }); break;
        case 'white': hide(p.P, D.snow, PAT.white, { seed, line: 1.6, blur: o.blur }); break;
        case 'tooth': hide(p.P, '#fffaf0', null, { seed, line: 1.2, blur: o.blur }); break;
        case 'hole': hide(p.P, D.ink, null, { seed, blur: o.blur }); break;
      }
    } else if (p.L) {
      tr.save(); tr.globalCompositeOperation = 'multiply'; tr.strokeStyle = p.role === 'fold' ? 'rgba(26,16,10,.55)' : D.ink; tr.lineWidth = Math.max(1.4, p.w * (p.role === 'fold' ? .5 : 1)); tr.lineCap = 'round'; if (o.blur) tr.filter = `blur(${o.blur}px)`;
      tr.beginPath(); path(tr, p.L, false); tr.stroke(); tr.restore();
    }
  }
  if (o.rivets) for (const [x, y] of o.rivets) rivet(tr, x, y, 3.6);
}
// 操纵杆：柔和的灰线
function rods(list) { tr.save(); tr.globalCompositeOperation = 'multiply'; tr.filter = 'blur(2.5px)'; tr.strokeStyle = 'rgba(60,46,36,.55)'; tr.lineWidth = 4; for (const [a, b] of list) { tr.beginPath(); tr.moveTo(...a); tr.lineTo(...b); tr.stroke(); } tr.restore(); }
// 镂空字皮牌（拟声字 / 标题）：深色皮，字挖空透光
function plaque(text, x, y, size, rot = 0, o = {}) {
  const w = size * text.length * 1.05 + 60, h = size * 1.4;
  const pc = piece([-w / 2, -h / 2, w / 2, h / 2], g => {
    const outer = q => { q.moveTo(-w / 2 + 20, -h / 2); q.lineTo(w / 2 - 20, -h / 2); q.quadraticCurveTo(w / 2 + 10, -h / 2 - 10, w / 2, -h / 2 + 20); q.lineTo(w / 2, h / 2 - 20); q.quadraticCurveTo(w / 2 + 10, h / 2 + 10, w / 2 - 20, h / 2); q.lineTo(-w / 2 + 20, h / 2); q.quadraticCurveTo(-w / 2 - 10, h / 2 + 10, -w / 2, h / 2 - 20); q.lineTo(-w / 2, -h / 2 + 20); q.quadraticCurveTo(-w / 2 - 10, -h / 2 - 10, -w / 2 + 20, -h / 2); q.closePath(); };
    fill(g, o.dye || '#3a1a10', outer); ink(g, 3, outer);
    within(g, outer, () => { meander(g, -w / 2 + 16, -h / 2 + 14, w / 2 - 16, 4, 1.4); meander(g, -w / 2 + 16, h / 2 - 6, w / 2 - 16, 4, 1.4); });
    g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.font = `${size}px MSZ`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, size * .04); g.restore();
  }, { ss: 1, seed: 40 });
  tr.save(); tr.globalCompositeOperation = 'multiply'; tr.translate(x, y); tr.rotate(rot); drawPiece(tr, pc); tr.restore();
  rods([[[x, y + h / 2], [x + 30, y + h / 2 + 600]]]);
}
// 放射镂空盘（集中线）：一整块皮刻满放射细缝
function spokes(cx, cy, r0, r1, dye = '#3a2116', n = 90) {
  const P = ell(cx, cy, r1, r1, 64);
  const pc = piece(bb(P), g => {
    fill(g, dye, q => path(q, P));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; cutTaper(g, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * (r0 + r1) / 2, cy + Math.sin(a) * (r0 + r1) / 2], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], 9 + (i % 3) * 5); }
    cut(g, q => q.arc(cx, cy, r0, 0, Math.PI * 2));
  }, { ss: 1, seed: 7 });
  tr.save(); tr.globalCompositeOperation = 'multiply'; drawPiece(tr, pc); tr.restore();
}
// 台口（2.39 遮幅）+ 说书人牌匾字幕（前景层）
function stageFront(t) {
  if (!imax(t)) {
    const lac = '#2a0d08', gold = '#8a6430';
    fr.fillStyle = lac; fr.fillRect(0, 0, W, 138); fr.fillRect(0, H - 138, W, 138);
    fr.fillStyle = '#46140c'; fr.fillRect(0, 96, W, 30); fr.fillRect(0, H - 128, W, 26);
    fr.strokeStyle = gold; fr.lineWidth = 3;
    for (let x = 30; x < W; x += 120) { fr.beginPath(); for (let i = 0; i <= 30; i++) { const a = i / 30 * Math.PI * 2.1, r = 26 * (1 - i / 30 * .75); const px = x + 60 + Math.cos(a) * r, py = 50 + Math.sin(a) * r * .7; i ? fr.lineTo(px, py) : fr.moveTo(px, py); } fr.stroke(); }
    fr.beginPath(); fr.moveTo(0, 96); fr.lineTo(W, 96); fr.moveTo(0, H - 102); fr.lineTo(W, H - 102); fr.stroke();
    const sp = fr.createLinearGradient(0, 138, 0, 100); sp.addColorStop(0, 'rgba(255,170,90,.35)'); sp.addColorStop(1, 'rgba(255,150,70,0)'); fr.fillStyle = sp; fr.fillRect(0, 100, W, 38);
  }
}
function placard(t) {
  const c = cueAt(t); if (!c) return;
  const shout = /！！|？！/.test(c.text), size = shout ? 46 : 40, who = c.who !== '旁白' ? c.who : '';
  fr.save(); fr.font = `${size}px WK`; const tw = fr.measureText(c.text).width; fr.font = '26px WK'; const ww = who ? fr.measureText(who).width + 34 : 0;
  const w = tw + ww + 120, h = size + 40, x = (W - w) / 2, y = imax(t) ? H - h - 30 : H - 120;
  fr.fillStyle = '#1c0a06'; fr.fillRect(x, y, w, h); fr.strokeStyle = '#a07a3a'; fr.lineWidth = 2; fr.strokeRect(x + 6, y + 6, w - 12, h - 12);
  fr.fillStyle = '#b3261b'; fr.fillRect(x + 18, y + h / 2 - 13, 26, 26);
  fr.textBaseline = 'middle'; if (who) { fr.font = '26px WK'; fr.fillStyle = '#d9a35a'; fr.fillText(who, x + 62, y + h / 2 + 2); }
  fr.font = `${size}px WK`; fr.fillStyle = '#f3e3c0'; fr.fillText(c.text, x + 62 + ww, y + h / 2 + 2);
  fr.restore();
}
// 布景片
function mountainsPiece(y, peaks, dye = D.snow, seed = 1) {
  const pts = [[-20, y + 80]]; for (const [px, ph, pw] of peaks) { pts.push([px - pw, y], [px - pw * .3, y - ph * .8], [px, y - ph], [px + pw * .4, y - ph * .7], [px + pw, y]); } pts.push([W + 20, y], [W + 20, y + 80]);
  hide(pts, dye, PAT.snow, { seed });
}

// ═════════════ 镜头 ═════════════
const SH = {};
SH.K1 = () => {
  mountainsPiece(470, [[300, 180, 220], [800, 120, 200], [1300, 210, 260], [1700, 140, 200]], D.snow, 2);
  hide([[-20, 530], [W + 20, 530], [W + 20, 548], [-20, 548]], D.hide, null, { seed: 3 });
  const tip = [1040, 620];
  const riv = O([[380, 1100], [560, 960], [760, 800], [940, 680], [tip[0] - 14, tip[1] + 8], tip, [tip[0] + 16, tip[1] + 14], [1000, 700], [1040, 820], [1280, 1000], [1500, 1100]], 8);
  hide(riv, D.jade, PAT.water, { seed: 4 });
  puppet(place(K.fyWalk({ carry: 'corpse' }), tip[0] + 2, tip[1] + 8, .1));
  hide(C([[-20, 700], [200, 640], [470, 660], [600, 740], [-20, 800]], 8), D.hide2, PAT.snow, { seed: 6 });
  puppet(place(K.xuehuSide({ roar: .4 }), 300, 660, .14), { solidFace: true, dye: D.crim });
  for (const [dx, sc] of [[400, .1], [450, .095], [200, .09]]) puppet(place(K.fyFront({}), dx, 668, sc * .9), { dye: D.brown });
  puppet(place(K.maoSide({ lie: 1, tail: .4 }), 1380, 780, .2), { solidFace: true });
  for (let i = 0; i < 5; i++) puppet(place(K.immortalSide({ flip: i % 2 }), 700 + i * 150, 290 + (i % 2) * 36, .09), { dye: D.teal, mid: '#8a6a44' });
  return { lamps: [[700, 420, .9, 1], [1300, 420, .7, .8]], expo: 1.9 };
};
SH.K2 = () => {
  spokes(820, 560, 300, 1100);
  puppet(place(K.faceSide({ hair: 'snowtop', beard: 'snow', mouth: 'roar', brow: -1, eye: 1, age: .8 }), 780, 560, 1.15), { solidFace: true, face: '#c4542e', dye: D.crim });
  plaque('吼', 1500, 520, 260, .12);
  return { lamps: [[800, 540, 1.2, 1.2], [1500, 500, .7, .8]], expo: 2.2, cam: [960, 540, 1.04] };
};
SH.K3 = () => {
  spokes(960, 520, 360, 1200, '#2a1c2e');
  puppet(place(K.maoSide({ bristle: 1, mouth: 1 }), 1180, 1250, .78), { solidFace: true });
  plaque('嗷', 420, 420, 240, -.15);
  return { lamps: [[700, 500, 1.2, 1.2], [1300, 600, .8, .8]], expo: 2.1 };
};
SH.K4 = () => {
  // 湛蓝光柱：一条刻满水纹的蓝皮，灯从后面打透
  hide([[1220, 120], [1420, 120], [1400, 900], [1240, 900]], D.azure, (g, b) => { waves(g, b[0], b[1], b[2], b[3], 12, 2.4); }, { seed: 9 });
  puppet(place(K.zhaoRise(), 1320, 640, .42), { mid: '#e8d9b8' });
  hide([[-20, 880], [W + 20, 880], [W + 20, 1100], [-20, 1100]], D.jade, PAT.water, { seed: 10 });
  puppet(place(K.fyWalk({ carry: 'corpse', look: 1, wind: .3 }), 560, 940, .7), { rivets: [[575, 365], [600, 440]] });
  rods([[[600, 330], [640, 1100]], [[660, 440], [760, 1100]]]);
  plaque('嗡', 1690, 330, 150, .1, { dye: '#1b2b44' });
  return { lamps: [[1320, 400, 1.4, 1.6], [600, 520, .5, .6]], expo: 2.0 };
};
SH.K5 = () => {
  // 去幕后：天意是一双举杆的手。所有蛊仙都挂在杆上，只有他的杆是断的
  const items = [[360, 760, 'x'], [1560, 820, 'm'], [700, 640, 'i'], [1220, 640, 'i']];
  puppet(place(K.xuehuSide({ roar: 1 }), 360, 900, .6), { solidFace: true, dye: D.crim });
  puppet(place(K.maoSide({ bristle: 1, mouth: 1 }), 1500, 920, .26), { solidFace: true });
  puppet(place(K.immortalSide({}), 700, 760, .5), { dye: D.teal, mid: '#8a6a44' });
  puppet(place(K.immortalSide({ flip: 1 }), 1180, 760, .5), { dye: D.teal, mid: '#8a6a44' });
  puppet(place(K.fyWalk({ carry: 'corpse', look: 1 }), 960, 900, .42));
  rods([[[330, 280], [520, -100]], [[420, 420], [540, -100]], [[1400, 520], [1500, -100]], [[700, 330], [760, -100]], [[1180, 330], [1100, -100]], [[985, 520], [1000, 470]]]);
  // 天意之手：贴近灯的巨大模糊黑影
  for (const [hx, fl] of [[640, 1], [1300, -1]]) { const hand = [[-90, -60], [90, -60], [110, 60], [150, 170], [126, 182], [90, 100], [80, 230], [56, 236], [44, 110], [20, 250], [-6, 252], [-8, 110], [-36, 236], [-60, 230], [-56, 90], [-100, 160], [-122, 150], [-96, 40]].map(([x, y]) => [x * fl, y]); hide(xf(C(hand, 6), hx, -10, 1.5, fl * .2), '#120a06', null, { blur: 12, alpha: .9 }); }
  plaque('天意', 960, 230, 120, 0, { dye: '#2a0e0a' });
  return { lamps: [[960, 300, 1.2, 1], [400, 600, .5, .6], [1500, 600, .5, .6]], expo: 1.8 };
};
SH.K6 = () => {
  hide([[-20, 760], [W + 20, 760], [W + 20, 1100], [-20, 1100]], D.jade, PAT.water, { seed: 12 });
  // 贴近灯的脚：又大又糊，鞋底的针脚是一个个透光的孔
  const R0 = -.32, fx = 980, fy = 600;
  const sole = xf(C([[0, -300], [120, -270], [160, -150], [140, -30], [100, 120], [90, 220], [40, 290], [-40, 290], [-90, 220], [-100, 120], [-130, -30], [-150, -150], [-120, -270]], 6), fx, fy, [1.35, 1.15], R0);
  hide(xf([[930, 120], [1000, 120], [1100, 560], [840, 560]], 0, 0, 1, 0), D.indigo, PAT.robe, { seed: 13, blur: 3 });
  hide(sole, D.ink, (g, b) => { for (let i = -6; i <= 6; i++) for (let j = -2; j <= 2; j++) { const [px, py] = xf([[j * 34, i * 40]], fx, fy, [1.35, 1.15], R0)[0]; cut(g, q => q.arc(px, py, 6, 0, Math.PI * 2)); } cutLine(g, 10, q => path(q, xf(C([[0, -262], [100, -236], [130, -140], [112, -30], [76, 110], [66, 200], [28, 254], [-28, 254], [-68, 200], [-78, 110], [-104, -30], [-122, -140], [-96, -236]], 6), fx, fy, [1.35, 1.15], R0))); }, { seed: 14, blur: 2 });
  const R = rng(17); for (let i = 0; i < 18; i++) { const a = Math.PI + R() * Math.PI, rr = 300 + R() * 300, x = fx + Math.cos(a) * rr * 1.4, y = 960 + Math.sin(a) * rr * .5, r = 16 + R() * 22; hide(C([[x, y - r * 1.8], [x + r, y], [x, y + r], [x - r, y]], 4), D.teal, null, { seed: 20 + i }); }
  plaque('咚', 380, 470, 280, -.16);
  return { lamps: [[980, 560, 1.3, 1.4], [400, 500, .6, .6]], expo: 2.2, cam: [960, 540, 1.03] };
};
function windowFrame(cells) {
  // 前景：台口里的雕花窗格（漫画分格）
  fr.save(); fr.fillStyle = '#2a0d08'; fr.beginPath(); fr.rect(0, 0, W, H); for (const P of cells) path(fr, P); fr.fill('evenodd');
  fr.strokeStyle = '#8a6430'; fr.lineWidth = 3; for (const P of cells) { fr.beginPath(); path(fr, P); fr.stroke(); } fr.restore();
}
SH.K7 = () => {
  const faces = [{ hair: 'wild', mouth: 'grit', brow: -1, eye: 1 }, { hair: 'fy', mouth: 'cry', brow: 1, eye: .1, sweat: 1 }, { hair: 'silver', mouth: 'grin', brow: -.4, eye: 1 }, { hair: 'old', mouth: 'cry', brow: 1, eye: .3, tears: 1, age: 1 }];
  const cells = [[[60, 160], [600, 160], [520, 530], [60, 530]], [[60, 550], [516, 550], [430, 920], [60, 920]], [[1320, 160], [1860, 160], [1860, 530], [1400, 530]], [[1404, 550], [1860, 550], [1860, 920], [1490, 920]]];
  const dyes = [D.crim, D.teal, D.green, D.brown];
  cells.forEach((P, i) => { const cx = (P[0][0] + P[2][0]) / 2, cy = (P[0][1] + P[2][1]) / 2; puppet(place(K.faceSide(faces[i]), cx, cy + 40, .5, i < 2 ? 1 : -1), { solidFace: true, face: ['#c4542e', '#d8b07a', '#e8dcc0', '#d8b07a'][i], dye: dyes[i] }); });
  puppet(place(K.faceSide({ hair: 'fy' }), 920, 560, .8));
  rods([[[960, 900], [980, 1100]]]);
  const mid = [[616, 160], [1304, 160], [1384, 530], [1474, 920], [446, 920], [536, 530]];
  return { lamps: [[300, 340, .8, .8], [300, 740, .8, .8], [1600, 340, .8, .8], [1600, 740, .8, .8], [960, 500, 1, 1]], expo: 1.5, front: () => windowFrame([...cells, mid]) };
};
SH.K8 = () => {
  const who = [['责任', { hair: 'fy', crown: 'official', mouth: 'grit', brow: -.8, eye: .8 }, D.teal], ['仇恨', { hair: 'pony', mouth: 'roar', brow: -1, eye: 1 }, D.crim], ['精彩', { hair: 'silver', mouth: 'grin', brow: -.3, eye: 1 }, D.green], ['爱情', { hair: 'old', mouth: 'cry', brow: 1, eye: .3, tears: 1, age: 1 }, D.brown]];
  const cells = [];
  who.forEach(([word, f, dye], i) => {
    const x0 = 80 + i * 450; cells.push([[x0, 160], [x0 + 420, 160], [x0 + 420, 920], [x0, 920]]);
    puppet(place(K.faceSide(f), x0 + 190, 660, .55), { solidFace: i !== 3, face: ['#d8b07a', '#c4542e', '#e8dcc0', '#fff6e2'][i], dye });
    plaque(word, x0 + 210, 290, 90, 0);
  });
  return { lamps: cells.map(P => [(P[0][0] + P[1][0]) / 2, 500, .8, .9]), expo: 1.6, front: () => windowFrame(cells) };
};
SH.K9 = () => {
  // 前世：一盏昏灯里的少年（换上的哭脸），今生：同一个角度，脸不换
  puppet(place(K.faceSide({ hair: 'young', mouth: 'cry', brow: 1, eye: .35, tears: 1 }), 470, 580, .85), {});
  puppet(place(K.faceSide({ hair: 'fy' }), 1430, 580, .85), {});
  plaque('前世', 300, 260, 80, 0, { dye: '#4a2a14' }); plaque('今生', 1660, 260, 80, 0);
  return { lamps: [[470, 520, .55, .6], [1430, 520, 1.1, 1.1]], expo: 2, front: () => { fr.fillStyle = '#2a0d08'; fr.fillRect(940, 0, 40, H); fr.strokeStyle = '#8a6430'; fr.lineWidth = 3; fr.strokeRect(948, 0, 24, H); } };
};
SH.K10 = () => {
  // 他自己成了灯：胸口一盏极亮的灯把整块幕布照到发白；他是灯前最暗的那片皮，群仙被逼到边上
  puppet(place(K.fyFront({}), 960, 1090, .9), { dye: '#0e1520', solidFace: true, face: '#3a2a20' });
  hide(ell(960, 470, 44, 44), '#fff8e0', (g) => cut(g, q => q.arc(960, 470, 30, 0, Math.PI * 2)), { line: 3 });
  const R = rng(5); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + .3, pts = [[960 + Math.cos(a) * 200, 470 + Math.sin(a) * 180]]; for (let k = 1; k < 7; k++) pts.push([960 + Math.cos(a) * (200 + k * 80) + (R() - .5) * 70, 470 + Math.sin(a) * (180 + k * 70) + (R() - .5) * 70]); hide(ribbon(pts, u => 26 - 14 * u), D.ink, null, { seed: 60 + i }); }
  for (const [px, sc, fl] of [[170, .9, 1], [400, .74, 1], [1750, .9, -1], [1520, .74, -1]]) puppet(place(K.shieldSide(), px, H + 120, sc, fl), { dye: '#123c48', mid: '#123c48', solidFace: true, face: '#5a3a24' });
  plaque('轰', 300, 260, 220, -.15);
  return { lamps: [[960, 470, 2.2, 3], [960, 300, .6, .5]], expo: 1.9, sigC: 140, sigB: 900, bloom: .5 };
};
SH.K11 = () => {
  mountainsPiece(640, [[400, 110, 260], [1400, 150, 300]], D.snow, 21);
  const edge = 1180; hide(C([[-20, 700], [edge - 60, 704], [edge + 8, 716], [edge - 80, 760], [400, 1000], [-20, 1060]], 6), D.jade, PAT.water, { seed: 22 });
  puppet(place(K.fyWalk({ carry: 'corpse', wind: .15 }), edge - 110, 720, .62), { rivets: [[edge - 80, 205], [edge - 60, 270]] });
  rods([[[edge - 85, 180], [edge - 40, 1100]]]);
  plaque('坚持', 1600, 300, 120, 0);
  return { lamps: [[edge - 100, 450, .9, .9]], expo: 1.8 };
};
function sheet() {
  const L = (s, x, y) => { fr.save(); fr.font = '30px WK'; fr.textAlign = 'center'; fr.fillStyle = '#1c0a06'; const w = fr.measureText(s).width + 30; fr.fillRect(x - w / 2, y - 26, w, 40); fr.fillStyle = '#f3e3c0'; fr.fillText(s, x, y + 4); fr.restore(); };
  puppet(place(K.fyWalk({}), 260, 640, .55), { rivets: [[275, 190], [290, 255]] }); L('方源（侧身皮影）', 260, 690);
  puppet(place(K.faceSide({ hair: 'fy' }), 620, 380, .42)); L('开脸 · 不换头', 620, 690);
  puppet(place(K.xuehuSide({ roar: .6 }), 960, 640, .45), { solidFace: true, dye: D.crim }); L('雪胡老祖', 960, 690);
  puppet(place(K.maoSide({ tail: .5 }), 1300, 640, .14), { solidFace: true }); L('毛里球', 1420, 690);
  const row = 980;
  puppet(place(K.zhaoRise(), 150, row, .26), { mid: '#e8d9b8' }); L('赵怜云', 150, row + 40);
  puppet(place(K.corpse(), 360, row, .32)); L('马鸿运', 360, row + 40);
  puppet(place(K.immortalSide({}), 580, row, .3), { dye: D.teal, mid: '#8a6a44' }); L('碧晨天/威灵仰', 580, row + 40);
  [['白凝冰', { hair: 'silver', mouth: 'grin', eye: 1 }, '#e8dcc0', D.green], ['黑楼兰', { hair: 'pony', mouth: 'roar', brow: -1 }, '#c4542e', D.crim], ['雪胡（换头）', { hair: 'snowtop', beard: 'snow', mouth: 'roar', brow: -1, eye: 1 }, '#c4542e', D.crim]].forEach(([n, f, face, dye], i) => { puppet(place(K.faceSide(f), 820 + i * 230, row - 130, .22), { solidFace: true, face, dye }); L(n, 820 + i * 230, row + 40); });
  puppet(place(K.maoFace({ bristle: .6, mouth: .6 }), 1640, row - 170, .17), { solidFace: true }); L('毛里球（正）', 1640, row + 40);
}

export function render(cv, t, q) {
  const g = cv.getContext('2d');
  tr.setTransform(1, 0, 0, 1, 0, 0); tr.globalCompositeOperation = 'source-over'; tr.filter = 'none'; tr.globalAlpha = 1; tr.fillStyle = '#fff'; tr.fillRect(0, 0, W, H);
  fr.setTransform(1, 0, 0, 1, 0, 0); fr.clearRect(0, 0, W, H);
  if (q.get('sheet')) { sheet(); GL.render(trC, frC, { lamps: [[500, 500, 1, 1], [1400, 500, 1, 1], [960, 900, .6, .6]], expo: 1.6, sigB: 800, amb: .35, vign: .4, sat: 1.1, contrast: .15, bloom: .25 }); g.drawImage(glc, 0, 0); return; }
  const k = keyAt(t);
  const o = SH[k.id](t) || {};
  if (o.front) o.front();
  stageFront(t);
  if (!q.get('nosub')) placard(t);
  GL.render(trC, frC, { lamps: o.lamps, expo: (o.expo ?? 2) * .78, sigB: o.sigB ?? 700, sigC: o.sigC ?? 120, amb: .22, time: t, vign: .45, sat: 1.1, contrast: .15, bloom: o.bloom ?? .3, cam: o.cam });
  g.drawImage(glc, 0, 0);
}
