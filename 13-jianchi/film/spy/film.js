// 60s 间谍片头 × 航海王 × 诺兰：四色剪纸平涂、手剪毛边、字即布景、斜切网格=漫画分格、铜管重音=剪辑点。
// 四色：墨黑 / 骨白 / 河青 / 警示朱红。人物一律侧身剪影，表情靠轮廓与“剪开的嘴”；方源的剪影从不变。
import { g, C as PC, S, clear, rough, piece, silhouette, slit, paperFinish, circP, ellP, rectP } from './paper.js';
import * as K from '../shared/cast.js';
import { cueAt, keyAt, imax } from '../shared/story.js';
import { C, O, ell, rng, path, xf, ribbon } from '../shared/geo.js';

const W = 1920, H = 1080;
const INK = { ink: '#161a22', inkL: '#2b3240', bone: '#ece4d2', boneD: '#cdc3ac', teal: '#1d7f8c', tealD: '#135a64', red: '#d6452b', redD: '#97301d' };
export function init() {}

// 部件 → 剪纸：role → 墨色
function place(parts, X, Y, s, fl = 1, rot = 0) {
  const c = Math.cos(rot), n = Math.sin(rot);
  const T = ([x, y]) => { const u = x * s * fl, v = y * s; return [X + u * c - v * n, Y + u * n + v * c]; };
  return parts.map(p => ({ ...p, P: p.P ? p.P.map(T) : null, L: p.L ? p.L.map(T) : null, w: p.w ? p.w * s : 0 }));
}
const ROLE = { dark: 'ink', mid: 'inkL', skin: 'bone', white: 'bone', tooth: 'bone', hole: 'red', accent: 'inkL' };
let SEED = 1;
// 一个角色 = 一张剪影：内部各片融成一个外轮廓；o.map 覆盖 role→颜色；o.eye = 剪出眼缝
function figure(parts, o = {}) {
  silhouette(() => {
    for (const p of parts) if (p.P) {
      const col = INK[(o.map && o.map[p.role]) || ROLE[p.role] || 'ink'];
      if (o.skip && o.skip.includes(p.role)) continue;
      piece(rough(p.P, SEED++, o.amp ?? 1.4, o.step ?? 9), col, {});
    }
    if (o.feat) for (const p of parts) if (p.L && p.role === 'feat' && o.feat.test(p.id)) {
      g.save(); g.globalCompositeOperation = o.featCut ? 'destination-out' : 'source-over'; g.strokeStyle = INK[o.featCol || 'ink']; g.lineWidth = Math.max(2.5, p.w); g.lineCap = 'round';
      g.beginPath(); path(g, p.L, false); g.stroke(); g.restore();
    }
  }, { outline: o.outline ?? 2.6, outlineCol: o.outlineCol });
}
// 剪字：逐字微转、微跳，纸影
function type(text, x, y, size, col, o = {}) {
  g.save(); g.translate(x, y); g.rotate(o.rot ?? 0);
  g.font = `${size}px ${o.font || 'ZK'}`; g.textBaseline = 'alphabetic';
  const R = rng(o.seed ?? 3); let cx = 0;
  const ws = [...text].map(ch => g.measureText(ch).width * (o.track ?? 1));
  const total = ws.reduce((a, b) => a + b, 0);
  cx = o.align === 'left' ? 0 : o.align === 'right' ? -total : -total / 2;
  [...text].forEach((ch, i) => {
    g.save(); g.translate(cx + ws[i] / 2, (R() - .5) * 3); g.rotate((R() - .5) * .03);
    g.shadowColor = 'rgba(20,12,6,.32)'; g.shadowBlur = 5; g.shadowOffsetX = 3; g.shadowOffsetY = 4;
    if (o.gap !== false) { g.lineWidth = 5; g.strokeStyle = o.gapCol || S.bg; g.lineJoin = 'round'; g.textAlign = 'center'; g.strokeText(ch, 0, 0); }
    g.fillStyle = col; g.textAlign = 'center'; g.fillText(ch, 0, 0); g.restore();
    cx += ws[i];
  });
  g.restore();
}
// 放射条（太阳纹）：两色交替的剪纸条，航海王的集中线在这里变成 60s 的放射海报
function burst(cx, cy, colA, colB, n = 28, rot = 0) {
  for (let i = 0; i < n; i++) {
    const a0 = rot + i / n * Math.PI * 2, a1 = rot + (i + .5) / n * Math.PI * 2;
    piece(rough([[cx, cy], [cx + Math.cos(a0) * 2600, cy + Math.sin(a0) * 2600], [cx + Math.cos(a1) * 2600, cy + Math.sin(a1) * 2600]], 50 + i, 1.2, 14), colB, { shadow: false, gap: 0 });
  }
}
// 遮幅（诺兰 2.39:1）：上下两条剪纸黑条
function bars() { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const h = 138; piece(rough(rectP(-20, -20, W + 40, h + 20), 901, 1.6, 12), INK.ink, { gap: 0 }); piece(rough(rectP(-20, H - h, W + 40, h + 20), 902, 1.6, 12), INK.ink, { gap: 0 }); g.restore(); }
// 字幕：左下斜贴的纸条
function caption(t, dark) {
  const c = cueAt(t); if (!c) return;
  const shout = /！！|？！/.test(c.text), fs = shout ? 46 : 38;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.translate(110, imax(t) ? H - 92 : H - 70); g.rotate(-.012);
  g.font = `${fs}px NS`; const tw = g.measureText(c.text).width, who = c.who !== '旁白' ? c.who : '';
  g.font = '24px NS'; const ww = who ? g.measureText(who).width + 30 : 0;
  const w = tw + ww + 90, hgt = fs + 34;
  const strip = dark ? INK.bone : INK.ink, txt = dark ? INK.ink : INK.bone;
  piece(rough([[0, -hgt / 2], [w, -hgt / 2 - 3], [w + 14, 0], [w, hgt / 2], [0, hgt / 2 + 2], [-12, 0]], 77, 1.4, 8), strip, { gap: 0 });
  piece(rough(circP(32, 0, 10, 12), 78, .8, 6), INK.red, { gap: 0 });
  g.fillStyle = txt; g.textBaseline = 'middle';
  if (who) { g.font = '24px NS'; g.fillStyle = INK.red; g.fillText(who, 56, 0); }
  g.fillStyle = txt; g.font = `${fs}px NS`; g.fillText(c.text, 56 + ww, 2);
  g.restore();
}
const tint = (x, y, w, h, col) => piece(rough(rectP(x, y, w, h), 7, 1.5, 12), col, { gap: 0, shadow: false });

// ═════════════ 镜头 ═════════════
const SH = {};
SH.K1 = () => {
  clear(INK.bone);
  const hz = 430;
  // 天际线是剪出来的字：北原 · 大雪山
  type('北 原 大 雪 山', 960, hz + 8, 260, INK.boneD, { track: 1.25, seed: 4 });
  piece(rough([[-20, hz], [W + 20, hz], [W + 20, H + 20], [-20, H + 20]], 3, 1.6, 14), INK.bone, { shadow: true });
  // 河：青色纸带从画面底部蜿蜒而来，收成一个尖
  const tip = [1040, 590];
  const riv = O([[380, 1100], [560, 960], [760, 790], [940, 660], [tip[0] - 14, tip[1] + 8], tip, [tip[0] + 16, tip[1] + 14], [1000, 690], [1040, 800], [1280, 990], [1500, 1100]], 8);
  piece(rough(riv, 11, 2, 12), INK.teal);
  for (let i = 0; i < 9; i++) { const u = i / 9, y = 640 + u * 420, half = 30 + u * 420; piece(rough(rectP(990 - half * .55 + Math.sin(i) * 30, y, half * .5, 6 + u * 6), 20 + i, 1, 8), INK.tealD, { shadow: false, gap: 0 }); }
  figure(place(K.fyWalk({ carry: 'corpse' }), tip[0] + 2, tip[1] + 8, .09));
  // 左岸：雪胡一方；右岸：伏地的毛里球；天上：中洲蛊仙
  piece(rough(C([[-20, 640], [200, 560], [470, 590], [600, 690], [-20, 760]], 8), 31, 2, 12), INK.boneD);
  figure(place(K.xuehuSide({ roar: .4 }), 310, 590, .14));
  for (const [dx, sc] of [[400, .1], [450, .095], [200, .09]]) figure(place(K.fyFront({}), dx, 600, sc * .9));
  figure(place(K.maoSide({ lie: 1, tail: .4 }), 1380, 700, .2), { map: { accent: 'inkL' } });
  for (let i = 0; i < 5; i++) figure(place(K.immortalSide({ flip: i % 2 }), 700 + i * 150, 230 + (i % 2) * 36, .09));
  type('逆 流 河', 1640, 250, 110, INK.red, { track: 1.3, seed: 9 });
};
SH.K2 = () => {
  clear(INK.red); burst(800, 600, INK.red, INK.redD, 30, .1);
  figure(place(K.faceSide({ hair: 'snowtop', beard: 'snow', mouth: 'roar', brow: -1, eye: 1, age: .8 }), 760, 560, 1.15), { map: { skin: 'boneD', hole: 'ink' }, feat: /lid|w1|w2|crow|vein|nostril/, featCol: 'ink' });
  type('吼', 1450, 700, 520, INK.ink, { rot: .12, seed: 2 });
  type('！！', 1730, 420, 260, INK.bone, { rot: .2, seed: 3 });
};
SH.K3 = () => {
  clear(INK.teal); burst(960, 560, INK.teal, INK.tealD, 34);
  figure(place(K.maoFace({ bristle: 1, mouth: 1 }), 960, 520, .55), { map: { accent: 'ink', mid: 'inkL', hole: 'red', dark: 'bone' } });
  type('嗷', 300, 560, 380, INK.bone, { rot: -.15, seed: 4 });
  type('！！！', 1640, 420, 200, INK.red, { rot: .15, seed: 5 });
};
SH.K4 = () => {
  clear(INK.ink);
  // 湛蓝光柱：同心的青色纸条
  for (let k = 4; k >= 0; k--) piece(rough([[1320 - 60 - k * 60, 0], [1320 + 60 + k * 60, 0], [1320 + 40 + k * 50, 900], [1320 - 40 - k * 50, 900]], 40 + k, 1.4, 12), k % 2 ? INK.tealD : INK.teal, { shadow: k === 0 });
  piece(rough(circP(1320, 420, 230, 60), 49, 1.5, 10), INK.teal);
  figure(place(K.zhaoRise(), 1320, 640, .4), { map: { mid: 'bone', skin: 'bone', white: 'boneD' } });
  piece(rough(rectP(-20, 860, W + 40, 260), 51, 1.6, 12), INK.tealD);
  for (let i = 0; i < 7; i++) piece(rough(rectP(100 + i * 260, 900 + (i % 3) * 30, 140, 8), 60 + i, 1, 8), INK.teal, { shadow: false, gap: 0 });
  figure(place(K.fyWalk({ carry: 'corpse', look: 1, wind: .3 }), 560, 930, .66), { map: { skin: 'boneD', mid: 'inkL', white: 'bone' }, outlineCol: INK.teal, outline: 4 });
  type('嗡', 1660, 300, 200, INK.bone, { rot: .1, seed: 6 });
};
SH.K5 = () => {
  clear(INK.red);
  // 叫嚣的话就是墙：巨大的剪字从两边斜压过来
  type('柳贯一', 330, 520, 330, INK.ink, { rot: -.32, seed: 7 });
  type('难逃一死', 1560, 470, 250, INK.ink, { rot: .3, seed: 8 });
  type('必死无疑', 560, 905, 170, INK.redD, { rot: -.08, seed: 9, gap: false });
  // 天意之眼：骨白圆 + 墨黑瞳孔
  piece(rough(C([[700, 220], [960, 120], [1220, 220], [960, 320]], 6), 81, 1.6, 10), INK.bone);
  piece(rough(circP(960, 220, 72, 40), 82, 1.2, 8), INK.ink); piece(rough(circP(940, 200, 16, 12), 83, .6, 6), INK.bone, { gap: 0 });
  // 他：骨白剪影站在正中
  piece(rough(ellP(960, 760, 170, 46), 84, 1.4, 10), INK.redD, { shadow: false });
  figure(place(K.fyWalk({ carry: 'corpse', look: 1 }), 960, 770, .27), { map: { dark: 'bone', mid: 'boneD', skin: 'bone', white: 'ink' }, outlineCol: INK.ink });
};
SH.K6 = () => {
  clear(INK.bone);
  piece(rough(rectP(-20, 760, W + 40, 360), 5, 1.6, 12), INK.teal);
  // 极端透视的腿：一条向上急收的黑纸
  piece(rough([[820, 760], [930, 140], [990, 140], [1100, 760]], 6, 1.6, 10), INK.ink);
  // 脚底（脚印形），骨白鞋边 + 针脚孔
  const R0 = -.32, fx = 980, fy = 640;
  const sole = xf(C([[0, -300], [120, -270], [160, -150], [140, -30], [100, 120], [90, 220], [40, 290], [-40, 290], [-90, 220], [-100, 120], [-130, -30], [-150, -150], [-120, -270]], 6), fx, fy, [1.3, 1.1], R0);
  const inner = xf(C([[0, -262], [100, -236], [130, -140], [112, -30], [76, 110], [66, 200], [28, 254], [-28, 254], [-68, 200], [-78, 110], [-104, -30], [-122, -140], [-96, -236]], 6), fx, fy, [1.3, 1.1], R0);
  piece(rough(sole, 7, 1.6, 10), INK.bone); piece(rough(inner, 8, 1.4, 10), INK.ink, { gap: 0 });
  for (let i = -5; i <= 5; i++) for (let j = -2; j <= 2; j++) { const [px, py] = xf([[j * 34, i * 42]], fx, fy, [1.3, 1.1], R0)[0]; piece(circP(px, py, 4, 8), INK.bone, { gap: 0, shadow: false }); }
  // 水花：剪出来的青色水滴
  const R = rng(17);
  for (let i = 0; i < 26; i++) { const a = Math.PI + R() * Math.PI, rr = 300 + R() * 300, x = fx + Math.cos(a) * rr * 1.4, y = 980 + Math.sin(a) * rr * .55, r = 14 + R() * 22; piece(rough(C([[x, y - r * 1.8], [x + r, y], [x, y + r], [x - r, y]], 4), 90 + i, 1, 6), i % 3 ? INK.teal : INK.tealD); }
  type('咚', 330, 560, 420, INK.red, { rot: -.16, seed: 11 });
};
// 斜切多格：四张扭曲的侧脸 + 中间方源不动的侧脸
function cell(P, col, fn) { g.save(); g.beginPath(); path(g, P); g.clip(); g.fillStyle = col; g.fillRect(0, 0, W, H); S.bg = col; fn(); g.restore(); }
SH.K7 = () => {
  clear(INK.ink);
  const faces = [[{ hair: 'wild', mouth: 'grit', brow: -1, eye: 1 }, 'red'], [{ hair: 'fy', mouth: 'cry', brow: 1, eye: .1, sweat: 1 }, 'teal'], [{ hair: 'silver', mouth: 'grin', brow: -.4, eye: 1 }, 'boneD'], [{ hair: 'old', mouth: 'cry', brow: 1, eye: .3, tears: 1, age: 1 }, 'redD']];
  const cells = [[[40, 150], [600, 150], [520, 540], [40, 540]], [[40, 556], [516, 556], [430, 930], [40, 930]], [[1320, 150], [1880, 150], [1880, 540], [1400, 540]], [[1404, 556], [1880, 556], [1880, 930], [1490, 930]]];
  cells.forEach((P, i) => cell(P, INK[faces[i][1]], () => {
    const cx = (P[0][0] + P[2][0]) / 2, cy = (P[0][1] + P[2][1]) / 2;
    figure(place(K.faceSide(faces[i][0]), cx - (i < 2 ? 0 : 0), cy + 40, .5, i < 2 ? 1 : -1), { map: { skin: 'ink', dark: 'ink', white: 'bone', hole: 'bone', tooth: 'bone' }, feat: /lid|closed/, featCol: 'bone' });
  }));
  cell([[616, 150], [1304, 150], [1384, 540], [1474, 930], [446, 930], [536, 540]], INK.bone, () => {
    figure(place(K.faceSide({ hair: 'fy' }), 900, 560, .78), { map: { skin: 'ink', white: 'bone' }, feat: /lid/, featCol: 'bone' });
  });
};
SH.K8 = () => {
  clear(INK.ink);
  const who = [['责任', 'red', { hair: 'fy', crown: 'official', mouth: 'grit', brow: -.8, eye: .8 }], ['仇恨', 'teal', { hair: 'pony', mouth: 'roar', brow: -1, eye: 1 }], ['精彩', 'boneD', { hair: 'silver', mouth: 'grin', brow: -.3, eye: 1 }], ['爱情', 'redD', { hair: 'old', mouth: 'cry', brow: 1, eye: .3, tears: 1, age: 1 }]];
  who.forEach(([word, col, f], i) => {
    const x0 = 40 + i * 462;
    cell([[x0, 150], [x0 + 450, 150], [x0 + 450, 930], [x0, 930]], INK[col], () => {
      figure(place(K.faceSide(f), x0 + 210, 640, .62), { map: { skin: 'ink', dark: 'ink', white: 'bone', hole: col === 'boneD' ? 'red' : 'bone', tooth: 'bone' }, feat: /lid|closed/, featCol: 'bone' });
      type(word, x0 + 225, 330, 150, col === 'boneD' ? INK.ink : INK.bone, { seed: 30 + i });
    });
  });
};
SH.K9 = () => {
  clear(INK.ink);
  cell([[0, 0], [1060, 0], [860, H], [0, H]], INK.boneD, () => {
    figure(place(K.faceSide({ hair: 'young', mouth: 'cry', brow: 1, eye: .35, tears: 1 }), 470, 560, .9), { map: { skin: 'ink', dark: 'ink', white: 'bone', hole: 'bone' }, feat: /lid|closed/, featCol: 'bone' });
    type('前世', 200, 300, 110, INK.redD, { seed: 41 });
  });
  cell([[1076, 0], [W, 0], [W, H], [876, H]], INK.teal, () => {
    figure(place(K.faceSide({ hair: 'fy' }), 1430, 560, .9), { map: { skin: 'ink', white: 'bone' }, feat: /lid/, featCol: 'bone' });
    type('今生', 1730, 300, 110, INK.bone, { seed: 42 });
  });
};
SH.K10 = () => {
  clear(INK.ink);
  // 英雄时刻：剪影站在巨大的圆里
  for (let k = 0; k < 5; k++) piece(rough(circP(960, 470, 620 - k * 110, 120), 70 + k, 2, 12), k % 2 ? INK.teal : INK.bone, { shadow: true });
  // 圆被斜线切成碎片向外飞
  const R = rng(3);
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r0 = 660 + R() * 60, r1 = r0 + 160 + R() * 260, w = .05 + R() * .05; piece(rough([[960 + Math.cos(a - w) * r0, 470 + Math.sin(a - w) * r0], [960 + Math.cos(a + w) * r0, 470 + Math.sin(a + w) * r0], [960 + Math.cos(a) * r1, 470 + Math.sin(a) * r1]], 300 + i, 1.2, 10), i % 3 ? INK.bone : INK.teal); }
  // 黑电
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .4, pts = [[960 + Math.cos(a) * 160, 470 + Math.sin(a) * 160]]; for (let k = 1; k < 7; k++) pts.push([960 + Math.cos(a) * (160 + k * 70) + (R() - .5) * 70, 470 + Math.sin(a) * (160 + k * 70) + (R() - .5) * 70]); piece(rough(ribbon(pts, u => 22 - 14 * u), 400 + i, 1, 8), INK.ink); }
  figure(place(K.fyFront({}), 960, 1090, .86), { map: { skin: 'ink', white: 'bone', mid: 'ink' }, outlineCol: INK.bone });
  for (const [px, sc, fl] of [[170, .9, 1], [400, .74, 1], [1750, .9, -1], [1520, .74, -1]]) figure(place(K.shieldSide(), px, H + 120, sc, fl), { map: { mid: 'inkL', skin: 'inkL', white: 'inkL', dark: 'inkL' }, outlineCol: INK.bone });
  type('轰', 260, 300, 300, INK.red, { rot: -.15, seed: 13 });
};
SH.K11 = () => {
  clear(INK.ink);
  // 片名由碎片拼成：坚持
  piece(rough(rectP(-20, 700, W + 40, 420), 5, 1.6, 12), INK.tealD);
  piece(rough(O([[-20, 764], [960, 764], [1140, 778], [1020, 796], [-20, 806]], 6), 6, 1.6, 10), INK.teal);
  type('坚持', 960, 560, 420, INK.bone, { track: 1.08, seed: 50 });
  type('逆流河 · 第二代主人', 960, 660, 54, INK.red, { track: 1.2, seed: 51 });
  figure(place(K.fyWalk({ carry: 'corpse', wind: .2 }), 1060, 784, .2), { map: { skin: 'boneD', mid: 'inkL', white: 'bone' }, outlineCol: INK.bone });
};
function sheet() {
  clear(INK.bone);
  const L = (s, x, y) => { g.font = '30px NS'; g.fillStyle = INK.ink; g.textAlign = 'center'; g.fillText(s, x, y); };
  figure(place(K.fyFront({}), 230, 620, .5), { map: { skin: 'boneD' } }); L('方源 · 正', 230, 670);
  figure(place(K.fyWalk({}), 450, 620, .5), { map: { skin: 'boneD' } }); L('侧', 450, 670);
  figure(place(K.fyFront({ back: true }), 680, 620, .5)); L('背', 680, 670);
  figure(place(K.faceSide({ hair: 'fy' }), 980, 360, .42), { map: { skin: 'ink', white: 'bone' }, feat: /lid/, featCol: 'bone' }); L('面无表情（侧）', 980, 670);
  figure(place(K.xuehuSide({ roar: .6 }), 1300, 620, .42)); L('雪胡老祖', 1300, 670);
  figure(place(K.maoSide({ tail: .5 }), 1560, 620, .13), { map: { accent: 'inkL' } }); L('毛里球', 1640, 670);
  const row = 960;
  figure(place(K.zhaoRise(), 150, row, .26), { map: { mid: 'inkL' } }); L('赵怜云', 150, row + 50);
  figure(place(K.corpse(), 360, row, .32)); L('马鸿运', 360, row + 50);
  figure(place(K.immortalSide({}), 580, row, .3)); L('碧晨天/威灵仰', 580, row + 50);
  [['白凝冰', { hair: 'silver', mouth: 'grin', eye: 1 }], ['黑楼兰', { hair: 'pony', mouth: 'roar', brow: -1 }], ['雪胡（侧）', { hair: 'snowtop', beard: 'snow', mouth: 'roar', brow: -1, eye: 1 }]].forEach(([n, f], i) => { figure(place(K.faceSide(f), 820 + i * 220, row - 130, .22), { map: { skin: 'ink', white: 'bone', hole: 'red' } }); L(n, 820 + i * 220, row + 50); });
  figure(place(K.maoFace({ bristle: .6, mouth: .6 }), 1600, row - 160, .17), { map: { accent: 'inkL', hole: 'red', dark: 'bone' } }); L('毛里球（正）', 1600, row + 50);
  for (const [k, col] of Object.entries(INK).slice(0, 8)) { }
  const sw = ['ink', 'bone', 'teal', 'red'];
  sw.forEach((k, i) => { piece(rough(rectP(1520 + i * 90, 110, 70, 70), 600 + i, 1, 8), INK[k]); });
  L('四色', 1655, 220);
}

export function render(cv, t, q) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; SEED = 1;
  if (q.get('sheet')) { sheet(); paperFinish(1); return; }
  const k = keyAt(t);
  SH[k.id](t);
  S.bg = INK.ink;
  if (!imax(t)) bars();
  paperFinish(1);
  if (!q.get('nosub')) caption(t, ['K4', 'K7', 'K8', 'K9', 'K10', 'K11', 'K2', 'K3', 'K5'].includes(k.id) || !imax(t));
}
