// 景片（照 lemo-opuscar 皮影 demo 的 scenery.js）：全是刻出来的驴皮件，幕布大部分留白。
// 北原草原：一条刻花地面条（青草刻叶 + 回纹带 + 古钱孔）+ 几座矮缓的草坡（地层宽缝 + 云头孔）。
// 逆流河：方源脚下是河头 —— 浅、平（一条细窄的靛青水纹条）；往下游（他身后）水越来越凶：
//   一排排高高卷起的浪头皮件（卷浪 + 爪形浪花 + 浪里刻水纹），漩涡皮件，被冲走的人（翻滚的小皮影）。
//   浪头、漩涡都插在杆上，12 fps 换片抖动（皮影的水是换片，不是粒子）。
import { piece, drawPiece, fill, cut, cutLine, cutTaper, ink, within, smooth, poly, cloud, beads, beadLine, plum, lattice, coin, strata, meander, waves, DYE } from './carve.js';
import { spline } from './fangyuan.js';
import { mulberry } from '/core/lib.js';
const sp = (pts, sharp = []) => q => spline(q, pts, true, sharp);

export const groundY = x => 905 + 8 * Math.sin(x / 260) + 5 * Math.sin(x / 97 + 1);
const GB = 975;
export const RC = { water: DYE.teal, water2: '#1b4f66', crest: DYE.jade, foam: '#e8efe6', grass: DYE.green, earth: '#8a6a34', earth2: '#6b4a22' };

// —— 草坡：一整片，地层宽缝 + 峰顶云头孔（同 lemo 的山，但矮、缓，是北原的草原坡）——
function hill(pk, col, seed) {
  const xs = pk.map(p => p[0]), x0 = Math.min(...xs) - 10, x1 = Math.max(...xs) + 10, y0 = Math.min(...pk.map(p => p[1])) - 10;
  const top = x => { for (let i = 0; i < pk.length - 1; i++) if (x >= pk[i][0] && x <= pk[i + 1][0]) { const u = (x - pk[i][0]) / (pk[i + 1][0] - pk[i][0]); return pk[i][1] + (pk[i + 1][1] - pk[i][1]) * (u * u * (3 - 2 * u)); } return 930; };
  return piece([x0, y0, x1, 940], g => {
    const m = q => smooth(q, [...pk, [pk[pk.length - 1][0], 940], [pk[0][0], 940]]);
    fill(g, col, m);
    within(g, m, () => {
      strata(g, x0, x1, x => top(x) + 4 * Math.sin(x / 40), 12, 17, 4);
      const r = mulberry(seed);
      for (let i = 1; i < pk.length - 1; i++) if (pk[i][1] < pk[i - 1][1] && pk[i][1] < pk[i + 1][1]) { cloud(g, pk[i][0] - 12, pk[i][1] + 34, 10, r() * 6, 2.1, 1); cloud(g, pk[i][0] + 14, pk[i][1] + 54, 7.5, r() * 6, 1.9, -1); }
      for (let k = 0; k < 8; k++) { const x = x0 + 30 + r() * (x1 - x0 - 60); plum(g, x, top(x) + 120 + r() * 50, 3.2); }
    });
    ink(g, 2.4, m);
  }, { ss: 1.4, seed });
}
// —— 地面条：北原草原（刻青草叶 + 回纹带 + 古钱孔）——
function ground() {
  const top = []; for (let x = -10; x <= 1930; x += 16) top.push([x, groundY(x)]);
  const gp = q => poly(q, top.concat([[1930, GB], [-10, GB]]));
  return piece([0, 870, 1920, GB + 4], g => {
    fill(g, RC.earth, gp);
    within(g, gp, () => {
      g.fillStyle = RC.earth2; g.fillRect(-10, GB - 22, 1940, 30);
      meander(g, 0, GB - 7, 1920, 6, 1.8);
      for (let x = 20; x < 1920; x += 38) coin(g, x, GB - 34, 5.5);
      const rr = mulberry(2);
      for (let x = 8; x < 1910; x += 14 + rr() * 14) { const y = groundY(x) + 3, h = 12 + rr() * 14; fill(g, RC.grass, q => poly(q, [[x - 6, y + 6], [x - 3, y - h], [x, y + 2], [x + 4, y - h * .8], [x + 7, y + 6]])); }
      for (let x = 30; x < 1900; x += 64) cloud(g, x, groundY(x) + 30, 6.5, x * .03, 1.6, (x / 64) % 2 ? 1 : -1);
    });
    ink(g, 2.4, q => poly(q, top, false), '#2e1a0c');
  }, { ss: 1.5, seed: 12 });
}
// —— 河头：一条细窄的靛青水纹条（浅、平）。x0..x1 是这条水的范围（x1 = 河头，方源脚下）——
export function riverHead(x0, x1, seed = 15) {
  return piece([x0 - 10, 870, x1 + 40, 960], g => {
    const rv = q => { const pts = []; for (let x = x0; x <= x1; x += 20) pts.push([x, groundY(x) + 2 + 3 * Math.sin(x / 30)]); pts.push([x1 + 26, groundY(x1) + 12]); for (let x = x1; x >= x0; x -= 20) pts.push([x, groundY(x) + 30 + 4 * Math.sin(x / 45 + 1) - Math.max(0, (x - (x1 - 260)) / 260) * 12]); smooth(q, pts); };
    fill(g, RC.water, rv);
    within(g, rv, () => { for (let row = 0; row < 3; row++) for (let x = x0 + (row % 2) * 14; x < x1; x += 28) cutLine(g, 2.2, q => { const y = groundY(x) + 10 + row * 7; q.moveTo(x - 9, y + 2); q.quadraticCurveTo(x, y - 3, x + 9, y + 2); }); });
    ink(g, 2, rv);
  }, { ss: 2, seed });
}
// —— 浪舌：传统卷浪（浪峰往前（下游，-x）伸出去，前端破成三根爪形浪花，浪底往回卷成漩，前面是陡的浪面）——
// 局部：根在 (0,0)，往 -y 长，高 h、宽 w（浪峰会伸出根宽之外）
const WT = [[.5, 0], [.46, -.42], [.3, -.84], [.08, -1], [-.24, -1.02], [-.5, -.94], [-.66, -.84],
  [-.74, -.7], [-.62, -.76], [-.66, -.6], [-.54, -.68], [-.54, -.52], [-.44, -.64],          // 三根爪
  [-.32, -.68], [-.2, -.74], [-.1, -.66], [-.14, -.56], [-.24, -.56], [-.28, -.46],           // 浪底回卷成漩
  [-.34, -.3], [-.44, -.12], [-.5, 0]];
const WT_SHARP = [7, 8, 9, 10, 11, 12, 21, 0];
const wt = (h, w, x = 0, y = 0) => WT.map(([u, v]) => [x + u * w, y + v * h]);
function crest(w, h, n, v) {
  return piece([-w / 2 - w * .5, -h * 1.12 - 20, w / 2 + 30, 16], g => {
    const r = mulberry(91 + v * 7);
    const T = Array.from({ length: n }, (_, i) => { const u = n === 1 ? .5 : i / (n - 1); return [-w * .25 + w * .5 * u + (r() - .5) * 12, h * (i === n - 1 ? 1 : .68 + r() * .12), w * (i === n - 1 ? .62 : .5)]; });
    for (const [x, hh, ww] of T) {
      const P = q => spline(q, wt(hh, ww, x), true, WT_SHARP);
      fill(g, RC.water, P);
      fill(g, RC.crest, q => spline(q, wt(hh * .7, ww * .66, x + ww * .08), true, WT_SHARP));
      fill(g, RC.foam, q => spline(q, wt(hh * .38, ww * .36, x + ww * .14), true, WT_SHARP));
      within(g, P, () => {
        for (let j = 1; j <= 4; j++) cutLine(g, 2.1, q => { q.moveTo(x + ww * (.44 - j * .06), -4); q.bezierCurveTo(x + ww * (.44 - j * .05), -hh * .45, x + ww * (.26 - j * .04), -hh * (.86 - j * .02), x - ww * (.18 + j * .06), -hh * (.92 - j * .03)); });
        cloud(g, x - ww * .2, -hh * .64, ww * .07, 3, 1.8, 1);
        for (let k = 0; k < 7; k++) { const t = k / 6, cx = x + ww * (.06 - .52 * t), cy = -hh * (1.0 - .16 * t), rr = 1.6 + r() * 2.2; cut(g, q => q.arc(cx, cy + 6, rr, 0, 7)); }
      });
      ink(g, 2.3, P);
      for (let k = 0; k < 5; k++) { const cx = x - ww * (.7 + r() * .35), cy = -hh * (.55 + r() * .4), rr = 3 + r() * 5; fill(g, RC.foam, q => q.ellipse(cx, cy, rr * .75, rr, .5, 0, 7)); ink(g, 1.1, q => q.ellipse(cx, cy, rr * .75, rr, .5, 0, 7)); }
    }
  }, { ss: 1.5, seed: 90 + v });
}
// —— 河身：从河头往下游越涨越高的一整片靛青水（刻横向水纹缝），浪头插在它上面 ——
export function riverBody(x0, x1, hMax, seed = 16) {
  return piece([x0 - 10, 600, x1 + 40, 960], g => {
    const top = x => groundY(x) + 4 - hMax * Math.pow(Math.max(0, (x1 - x) / (x1 - x0)), 1.4);
    const rv = q => { const pts = []; for (let x = x0; x <= x1; x += 16) pts.push([x, top(x) + 4 * Math.sin(x / 40)]); pts.push([x1 + 26, groundY(x1) + 12]); for (let x = x1; x >= x0; x -= 20) pts.push([x, groundY(x) + 30 + 4 * Math.sin(x / 45 + 1)]); smooth(q, pts); };
    fill(g, RC.water, rv);
    within(g, rv, () => { for (let y = 940, row = 0; y > 600; y -= 9, row++) for (let x = x0 + (row % 2) * 13; x < x1; x += 26) if (y > top(x) + 8) cutLine(g, 2, q => { q.moveTo(x - 9, y + 2); q.quadraticCurveTo(x, y - 3.5, x + 9, y + 2); }); });
    g.save(); g.beginPath(); rv(g); g.clip(); ink(g, 8, rv, RC.water2); g.restore();
    ink(g, 2.2, rv);
  }, { ss: 1.5, seed });
}
// —— 漩涡：一片圆皮，刻成往里旋的螺旋缝 ——
function whirl(v) {
  return piece([-60, -40, 60, 40], g => {
    const e = q => q.ellipse(0, 0, 56, 32, 0, 0, 7);
    fill(g, RC.water2, e);
    within(g, e, () => { cutLine(g, 3.4, q => { for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 6 + v, rr = 54 * (1 - i / 130); const x = Math.cos(a) * rr, y = Math.sin(a) * rr * .56; i ? q.lineTo(x, y) : q.moveTo(x, y); } }); cut(g, q => q.arc(0, 0, 5, 0, 7)); });
    ink(g, 2, e);
  }, { ss: 2, seed: 95 + v });
}
// —— 被冲走的人：一具翻滚的小皮影（深色袍、披发，四肢张开）——
function tumbler(v) {
  return piece([-50, -50, 50, 50], g => {
    const r = mulberry(70 + v), col = [DYE.red, DYE.blue, DYE.green, '#6b3a1c'][v % 4];
    const body = sp([[-14, -18], [14, -18], [18, 18], [-16, 20]]);
    fill(g, col, body); within(g, body, () => lattice(g, -18, -20, 18, 22, 6.4, 1.4)); ink(g, 1.6, body);
    for (const [x0, y0, a, L] of [[-12, -16, -2.4, 30], [12, -16, -.7, 28], [-10, 18, 2.2, 32], [12, 18, 1, 30]]) { const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L, b = sp([[x0 - 4, y0], [x0 + 4, y0], [x1 + 3, y1], [x1 - 3, y1]]); fill(g, col, b); ink(g, 1.3, b); fill(g, DYE.skin, q => q.arc(x1, y1, 4.4, 0, 7)); ink(g, 1, q => q.arc(x1, y1, 4.4, 0, 7)); }
    fill(g, DYE.ink, q => q.arc(0, -30, 11, 0, 7)); for (let k = 0; k < 4; k++) fill(g, DYE.ink, sp([[-6 + k * 4, -28], [-3 + k * 4, -28], [-10 + k * 6, -6 + r() * 6], [-12 + k * 6, -8]]));
    ink(g, 1.2, q => { q.moveTo(-4, -32); q.lineTo(4, -32); });
  }, { ss: 2, seed: 70 + v });
}
let S = null;
export function buildScenery() {
  if (S) return S;
  S = {
    ground: ground(),
    hillL: hill([[-20, 900], [80, 820], [220, 760], [360, 800], [520, 740], [700, 820], [820, 900]], '#7fae96', 3),
    hillR: hill([[1100, 900], [1260, 820], [1420, 770], [1560, 800], [1720, 730], [1880, 790], [1960, 900]], '#9cb98a', 5),
    crests: [0, 1, 2].map(v => crest(380, 300, 2, v)), crestsS: [0, 1, 2].map(v => crest(260, 170, 2, v + 3)),
    whirls: [0, 1, 2].map(v => whirl(v * 2.1)), tumblers: [0, 1, 2, 3].map(tumbler),
  };
  return S;
}
const M_ = (C, x, y, s = 1, r = 0) => { const c = Math.cos(r) * s, sn = Math.sin(r) * s; return [C[0] * c, C[3] * sn, -C[0] * sn, C[3] * c, C[0] * x + C[4], C[3] * y + C[5]]; };
// 画地：st = { hills, head: 河头 x（方源脚下）, rough: 0..1 下游凶险程度, t, flow: 被冲走的人 }
export function drawLand(g, Cam, st = {}) {
  const S = buildScenery();
  g.save(); g.globalCompositeOperation = 'multiply';
  if (st.hills !== false) { g.setTransform(Cam[0], 0, 0, Cam[3], Cam[4], Cam[5]); drawPiece(g, S.hillL); drawPiece(g, S.hillR); }
  g.setTransform(Cam[0], 0, 0, Cam[3], Cam[4], Cam[5]); drawPiece(g, S.ground);
  const hx = st.head ?? 1200, fr = Math.floor((st.t || 0) * 12), rough = st.rough ?? 1;
  // 下游：浪头一排排，越往左越高（离河头远 = 越凶）；12 fps 换片 + 上下抖
  if (rough > 0) {
    const key = Math.round(hx) + ':' + Math.round(rough * 10);
    if (S.bodyKey !== key) { S.body = riverBody(-40, hx + 1, 220 * rough); S.bodyKey = key; }
    g.setTransform(Cam[0], 0, 0, Cam[3], Cam[4], Cam[5]); drawPiece(g, S.body);
    const top = x => groundY(x) - 220 * rough * Math.pow(Math.max(0, (hx - x) / (hx + 40)), 1.4);
    const row = (xFrom, xTo, step, big, yOff, ph) => { for (let x = xFrom, i = 0; x > xTo; x -= step, i++) { const d = Math.max(0, Math.min(1, (hx - 160 - x) / 800)); if (d <= .02) continue; const j = Math.sin(fr * 1.7 + i * 2.3 + ph), sc = (.3 + .8 * d) * rough * (1 + .05 * j); const pc = (big ? S.crests : S.crestsS)[(fr + i) % 3]; g.setTransform(...M_(Cam, x + 4 * j, top(x) + yOff + 4 * Math.abs(j), sc, .04 * j)); drawPiece(g, pc); } };
    row(hx - 260, -300, 260, false, 40, 1);
    if (st.whirl !== false) for (const [x, y, s] of [[hx - 520, 40, .8], [hx - 900, 60, 1.1]]) { if (x < -80) continue; g.setTransform(...M_(Cam, x, top(x) + y, s * rough, fr * .7 * (x % 2 ? 1 : -1))); drawPiece(g, S.whirls[fr % 3]); }
    row(hx - 420, -300, 330, true, 70, 0);
    for (const [x0, yy, s, v] of (st.flow || [])) { const x = x0 - ((st.t || 0) * 90) % 400, rot = (st.t || 0) * 3 + v; g.setTransform(...M_(Cam, x, top(x) + yy + 6 * Math.sin(fr + v), s, rot)); drawPiece(g, S.tumblers[v % 4]); }
  }
  g.restore();
}
