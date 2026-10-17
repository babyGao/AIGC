// 动态镜头：?shot=s01（一镜一条，video.mjs 顺序渲染，最后拼接）
// 底色、笔触、高光共用轨迹；前后帧对齐后合成，遮挡按物体顺序处理。
import { Impasto, Strokes, KNIFE, BRUSH, DAB, LINE, POST_DEFAULT } from './impasto.js';
import { W, H, N, load, pixels, subjectPlan, applyAdds, paintBackdrop, highlights, lines } from './frame.js';
import { paintPlan, sampler, rasterize } from './plan.js';
import { POST, GROUND, clamp } from './look.js';
import { makeMotion, trajectory, strokeAt, commitStroke, retireCovered, boundsOf, motionMesh } from './motion.js';

const Q = new URLSearchParams(location.search);
const SID = Q.get('shot');
const lerp = (a, b, t) => a + (b - a) * t;
const EASE = { linear: t => t, inout: t => t * t * (3 - 2 * t), out: t => 1 - Math.pow(1 - t, 3), in: t => t * t * t };
const getJSON = async f => (await fetch(f)).json();

// —— 时间线：每镜在全片里的起点（字幕、片名按全片时间走）——
const FILM = await getJSON('film.json'), KEYS = await getJSON('keys.json');
let T0 = 0; const ITEMS = FILM.seq.map(s => { const it = { ...s, start: T0, dur: s.dur ?? s.black }; T0 += it.dur; return it; });
const IT = ITEMS.find(x => x.id === SID); if (!IT) throw new Error('no shot ' + SID);
const K = KEYS[SID];
window.DUR = IT.dur;

const glc = document.getElementById('gl'), ov = document.getElementById('ov');
ov.width = W; ov.height = H; const og = ov.getContext('2d');
const E = new Impasto(glc, { W, H, ss: +(Q.get('ss') || 2) });
const canvasOf = d => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').putImageData(new ImageData(d, W, H), 0, 0); return c; };

// —— 帧数据：原片帧 + 两张打包的图（分区/留用/轮廓光；接触阴影/镜面高光/玻璃高光）——
const meta = IT.still ? { n: 1 } : await getJSON(`cache/${SID}/meta.json`);
const dir = `cache/${SID}`, pad = i => String(i).padStart(3, '0');
async function loadFrame(i) {
  const [f, m, x, d] = await Promise.all([load(`${dir}/f${pad(i)}.jpg`), load(`${dir}/m${pad(i)}.png`), load(`${dir}/x${pad(i)}.png`),
    IT.still ? null : fetch(`${dir}/d${pad(i)}.bin`).then(async r => {
      if (!r.ok) throw new Error(`missing silhouette ${SID}/${i}: run prep_shot.py --flow ${SID}`);
      const data = await r.arrayBuffer();
      if (data.byteLength !== meta.qw * meta.qh * 16) throw new Error('invalid silhouette data');
      return new Float32Array(data);
    })]);
  const raw = pixels(f), mm = pixels(m), xx = pixels(x);
  return { raw, L: mm, V: mm, RIM: mm, AO: xx, HI: xx, SPEC: xx, distance: d, ch: { L: 0, V: 1, RIM: 2, AO: 0, HI: 2 } };
}
// 粒度：笔触由粗到细的半径（画布像素）、细节阈值（越小，细笔越多）、食物最大笔
const GRAINS = {
  coarse: { R: [64, 32, 16, 8, 5.5], Rinc: [48, 24, 12, 7], T: 22, food: 40 },
  medium: { R: [44, 22, 11, 6, 3.6], Rinc: [32, 16, 8, 4.6], T: 17, food: 28 },
  fine:   { R: [32, 16, 8, 4.5, 2.8], Rinc: [24, 12, 6, 3.6], T: 14, food: 20 },
};
const GRAIN = GRAINS[Q.get('grain') || FILM.grain || 'medium'];
const flows = new Map();
// 会动的物体（勺、刀、叉、下落的面包）：每帧整体变换；这些分区的笔触整体平移旋转，不跟逐点光流
const TRK = IT.still ? {} : await fetch(`${dir}/track.json`).then(r => r.ok ? r.json() : {}).catch(() => ({}));
const trkOf = new Map(); K.parts.forEach((p, j) => { if (TRK[p.name]) trkOf.set(j + 1, TRK[p.name]); });
const m3 = a => [[a[0], a[1], a[2]], [a[3], a[4], a[5]], [0, 0, 1]];
const mul = (A, B) => A.map((r, i) => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const inv2 = A => { const [[a, b, c], [d, e, f]] = A, det = a * e - b * d; return [[e / det, -b / det, (b * f - e * c) / det], [-d / det, a / det, (d * c - a * f) / det], [0, 0, 1]]; };
const stepOf = (g, i) => { const T = trkOf.get(g); return mul(m3(T[i + 1]), inv2(m3(T[i]))); };
async function flowOf(i, back = false) {
  const key = `${back ? 'b' : 'v'}${pad(i)}`;
  if (!flows.has(key)) {
    const r = await fetch(`${dir}/${key}.bin`);
    if (!r.ok) throw new Error(`missing motion field ${SID}/${key}: run prep_shot.py --flow ${SID}`);
    const b = await r.arrayBuffer();
    if (b.byteLength !== meta.qw * meta.qh * 4) throw new Error(`invalid motion field ${SID}/${key}`);
    flows.set(key, new Int16Array(b));
  }
  return flows.get(key);
}

// —— 画面状态 ——
const bg = paintBackdrop(K, 3), bgB = E.batch(bg.strokes.data()), bgT = E.texture(canvasOf(bg.layin), 14);
// 每段固定起终点
let list = [], simTau = 0, skip = null, cur = null, nxt = null, seg = -1;
const collect = arr => ({ push: o => { arr.push(o); } });
const rc = document.createElement('canvas'); rc.width = W; rc.height = H; const rcx = rc.getContext('2d');
const mix3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

function planOf(F) {
  const P = subjectPlan(K, F); applyAdds(K, P);
  const gk = GRAIN.food / 40;                               // 粒度：主体各分区的最大笔一起按比例缩
  P.props = P.props.map((pr, g) => g ? { ...pr, maxR: pr.maxR * gk } : pr);
  const smp = sampler(P);
  if (!skip) { skip = new Uint8Array(P.props.length); skip[0] = 1; }
  const lay = new Uint8ClampedArray(smp.refd); for (let i = 0; i < N; i++) if (!P.lab[i]) lay[i * 4 + 3] = 0;
  const labels = E.texture(canvasOf(F.L), 0), gl = E.gl;
  gl.bindTexture(gl.TEXTURE_2D, labels);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return { F, P, smp, tex: E.texture(canvasOf(lay), 2), labels,
    distance: F.distance ? E.distance(F.distance, meta.qw, meta.qh) : null,
    bounds: boundsOf(P.lab, W, H, P.props.length) };
}
// 新笔记住自己相对取色均值的"手感"（明暗抖动），以后换帧取色时保留
function remember(s, smp) {
  s.cA = s.cB = s.c; s.c2A = s.c2B = s.c2; s.ph = s.ph || 0;
  if (s.fixed || s.hl) return;
  const m = smp.gmean(s.x, s.y, Math.max(1, Math.min(s.len, s.wid) * .35), s.g).map(v => v / 255 + 1e-3);
  s.k = s.c.map((v, i) => Math.max(.75, Math.min(1.3, v / m[i])));
}
function targetAt(s, smp, x, y) {
  const r = Math.max(1, Math.min(s.len, s.wid) * .35), ca = Math.cos(s.ang), sa = Math.sin(s.ang);
  const m1 = smp.gmean(x, y, r, s.g), ex = x + ca * s.len * .45, ey = y + sa * s.len * .45;
  const m2 = smp.G(ex, ey) === s.g ? smp.gmean(ex, ey, r, s.g) : m1;
  return [m1.map((v, i) => clamp(v / 255 * s.k[i])), m2.map((v, i) => clamp(v / 255 * s.k[i]))];
}
const leftRegion = (smp, s, x, y) => { const g = smp.G(x, y); return g < 0 || (g !== s.g && smp.G(x + 4, y) !== s.g && smp.G(x - 4, y) !== s.g && smp.G(x, y + 4) !== s.g && smp.G(x, y - 4) !== s.g); };

async function initShot() {
  cur = planOf(await loadFrame(0));
  paintPlan(cur.P, { R: GRAIN.R, T: GRAIN.T, seed: K.seed ?? 7, skip, sampler: cur.smp, out: collect(list) });
  for (const s of list) remember(s, cur.smp);
  const hl = []; highlights(collect(hl), cur.F.SPEC, cur.P, { ch: 1 }); for (const s of hl) { remember(s, cur.smp); list.push(s); }
  const fx = []; for (const ln of K.lines || []) lines(collect(fx), K, ln.pts, ln);
  for (const s of fx) { s.fixed = 1; remember(s, cur.smp); list.push(s); }
  if (IT.sizzle || IT.steam) prepFX(cur.P);
  STATS.n = list.length;
}

// 对齐前后画层
async function beginSeg(i) {
  const began = performance.now();
  seg = i;
  nxt = planOf(await loadFrame(i + 1)); const smp = nxt.smp;
  const forward = new Map(), backward = new Map();
  for (const g of trkOf.keys()) { const D = stepOf(g, i); forward.set(g, D); backward.set(g, inv2(D)); }
  for (let g = 1; g < cur.P.props.length; g++) if (K.parts[g - 1].name === 'egg') {
    const a = cur.bounds[g], b = nxt.bounds[g];
    if (a[2] >= a[0] && b[2] >= b[0]) {
      const D = [[1, 0, (b[0] + b[2] - a[0] - a[2]) / 2], [0, 1, b[3] - a[3]], [0, 0, 1]];
      forward.set(g, D); backward.set(g, inv2(D));
    }
  }
  const go = makeMotion(await flowOf(i), meta, K.parts, forward);
  const back = makeMotion(await flowOf(i, true), meta, K.parts, backward);
  const box = [0, 0, W - 1, H - 1];
  cur.meshes = cur.P.props.map((_, g) => g ? E.mesh(motionMesh(box, g, go, W, H)) : null);
  nxt.meshes = nxt.P.props.map((_, g) => g ? E.mesh(motionMesh(box, g, back, W, H)) : null);
  for (const s of list) {
    if (s.fixed) continue;
    s.cA = s.c; s.c2A = s.c2;
    trajectory(s, go);
    if (leftRegion(smp, s, s.px, s.py)) { s.ph = 2; s.cB = s.cA; s.c2B = s.c2A; continue; }
    if (s.hl) { const sv = nxt.F.SPEC[((Math.min(H - 1, Math.max(0, s.py)) | 0) * W + (Math.min(W - 1, Math.max(0, s.px)) | 0)) * 4 + 1] / 255; s.ph = sv < .06 ? 2 : 0; /* 高光明显变暗才褪 */ s.cB = s.cA; s.c2B = s.c2A; continue; }
    [s.cB, s.c2B] = targetAt(s, smp, s.px, s.py);
  }
  rcx.clearRect(0, 0, W, H);
  rasterize(rcx, list.filter(s => !s.fixed && !s.hl && s.ph !== 2).map(s => ({ ...strokeAt(s, 1), c: s.cB })));
  const born = [];
  paintPlan(nxt.P, { R: GRAIN.Rinc, T: GRAIN.T, seed: 1000 + i, skip, sampler: smp, out: collect(born), init: rc, incremental: true });
  STATS.retired = retireCovered(list, born);
  for (const s of born) { s.ph = 1; remember(s, smp); trajectory(s, back, true); list.push(s); }
  const hl = []; highlights(collect(hl), nxt.F.SPEC, nxt.P, { ch: 1 });
  const old = list.filter(s => s.hl && s.ph !== 2);
  for (const h of hl) if (!old.some(o => Math.abs(o.px - h.x) < 20 && Math.abs(o.py - h.y) < 20)) { h.ph = 1; remember(h, smp); trajectory(h, back, true); list.push(h); }
  STATS.born = born.length; STATS.n = list.length; STATS.dead = list.filter(s => s.ph === 2).length;
  STATS.ms = Math.round(performance.now() - began);
}
// 到达第 i+1 帧：褪完的删掉，新笔转正，颜色落到目标，铺底换成新的
function endSeg() {
  list = list.filter(s => s.ph !== 2);
  for (const s of list) commitStroke(s);
  for (const state of [cur, nxt]) {
    for (const m of state.meshes || []) if (m) E.gl.deleteBuffer(m.buf);
    delete state.meshes;
  }
  E.gl.deleteTexture(cur.tex); E.gl.deleteTexture(cur.labels);
  if (cur.distance) E.gl.deleteTexture(cur.distance);
  flows.delete(`v${pad(seg)}`); flows.delete(`b${pad(seg)}`);
  cur = nxt; nxt = null; seg = -1;
}
async function advanceTo(tau) {
  while (simTau < tau - 1e-6) {
    const i = Math.floor(simTau + 1e-6); if (i >= meta.n - 1) break;
    if (seg !== i) await beginSeg(i);
    const d = Math.min(tau, i + 1) - simTau;
    simTau += d;
    if (Math.abs(simTau - (i + 1)) < 1e-6) { simTau = i + 1; endSeg(); }
  }
}

// —— 氛围：锅里的油泡（煎），成品上的热气 ——
let fxPts = null;
function prepFX(P) {
  const pts = [];
  for (let y = 4; y < H - 8; y += 3) for (let x = 0; x < W; x += 3) {
    const g = P.lab[y * W + x]; if (!g) continue;
    const p = K.parts[g - 1]; if (!p) continue;
    if (IT.sizzle && p.pal === 'food') { const b = P.lab[(y + 6) * W + x]; if (b && K.parts[b - 1] && K.parts[b - 1].pal === 'iron') pts.push([x, y + 4, 'z']); }
    if (IT.steam && p.pal === 'food') { const a = P.lab[(y - 4) * W + x]; if (!a && y % 12 === 0 && x % 12 === 0) pts.push([x, y, 's']); }
  }
  fxPts = pts;
}
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function fxStrokes(t) {
  const out = [];
  if (IT.embers) for (let k = 0; k < 90; k++) {                  // 熔岩火星：从下往上飘、忽明忽暗
    const life = 1.6 + hash(k + 7) * 1.6, ph = ((t + hash(k) * life) % life) / life;
    const x = hash(k + 3) * W + Math.sin(ph * 6 + k) * 30, y = H * (.95 - ph * .9) - hash(k + 11) * 200;
    const a = Math.sin(ph * Math.PI) * (.45 + .55 * Math.pow(Math.max(0, Math.sin(t * 9 + k)), 2)), r = 2 + hash(k + 5) * 4.5;
    out.push({ x, y, ang: -1.4, len: r * 3.2, wid: r, c: [1, .62 + hash(k) * .25, .2], c2: [1, .9, .55], seed: k + 900, type: DAB, hgt: .2, alpha: a });
  }
  if (!fxPts || !fxPts.length) return out;
  const zs = fxPts.filter(p => p[2] === 'z'), ss = fxPts.filter(p => p[2] === 's');
  for (let k = 0; k < 70 && zs.length; k++) {
    const p = zs[(hash(k) * zs.length) | 0], ph = hash(k + 31) * 6.28, sp = 5 + hash(k + 7) * 7;
    const a = Math.pow(Math.max(0, Math.sin(ph + t * sp)), 3); if (a < .05) continue;
    const r = 1.6 + hash(k + 3) * 3.2, x = p[0] + (hash(k + 9) - .5) * 14, y = p[1] + (hash(k + 5) - .2) * 10;
    out.push({ x, y, ang: 0, len: r * 2, wid: r * 2, c: [1, .9, .7], c2: [1, .97, .88], seed: k, type: DAB, hgt: 1.2, alpha: .85 * a });
  }
  for (let k = 0; k < 16 && ss.length; k++) {
    const p = ss[(hash(k + 100) * ss.length) | 0], life = 2.6, ph = ((t + hash(k + 50) * life) % life) / life;
    const y = p[1] - ph * 260, x = p[0] + Math.sin(ph * 4 + k) * 22 + ph * 18;
    const a = Math.sin(ph * Math.PI) * (.05 + hash(k + 2) * .05);
    out.push({ x, y, ang: -Math.PI / 2 + Math.sin(ph * 3 + k) * .4, len: 90 + hash(k + 8) * 80, wid: 26 + hash(k + 4) * 26, c: [.92, .9, .86], c2: [.97, .95, .92], seed: k + 500, type: BRUSH, hgt: 0, alpha: a });
  }
  return out;
}

// —— 虚拟运镜 ——
function cams(t) {
  const c = IT.cam || {}, tt = clamp(c.dur ? t / c.dur : t / IT.dur), e = (EASE[c.ease] || EASE.inout)(tt);
  const zr = Array.isArray(c.z) ? c.z : [c.z ?? 1, c.z ?? 1];
  let z = lerp(zr[0], zr[1], e);
  if (c.dur && t > c.dur) z *= 1 + (c.drift ?? .045) * (t - c.dur) / Math.max(.1, IT.dur - c.dur);   // 主运动结束后继续极慢地推，不停住
  const f = c.f || [.5, .5], fx = f[0] * W, fy = f[1] * H;
  let cx = fx - (fx - W / 2) / z, cy = fy - (fy - H / 2) / z;
  cx += (c.dx || 0) * W * (e - .5); cy += (c.dy || 0) * H * (e - .5);
  const rot = c.rot ? lerp(c.rot[0], c.rot[1], e) * Math.PI / 180 : 0;
  const p = c.par ?? .5;
  for (const ti of IT.shake || []) if (t > ti) { const k = t - ti, a = 22 * Math.exp(-k * 9); cx += a * Math.sin(k * 73); cy += a * .7 * Math.cos(k * 61); }   // 冲击震动
  return { sub: { x: cx, y: cy, zoom: z, rot }, bg: { x: W / 2 + (cx - W / 2) * p, y: H / 2 + (cy - H / 2) * p, zoom: 1 + (z - 1) * p, rot: rot * p } };
}

// —— 开场海报：小字引题 → "热量炸弹"砸进来（放大回弹＋震动＋闪光）→ 副标、标签 ——
function poster(t) {
  const Pt = FILM.poster, out = x => 1 - Math.pow(1 - clamp(x), 3);
  const txt = (s, font, y, ls, fill, al, sc = 1, stroke = 0) => {
    og.save(); og.globalAlpha = al; og.translate(W / 2, y); og.scale(sc, sc); og.font = font; og.textAlign = 'center'; og.textBaseline = 'middle'; og.letterSpacing = ls;
    og.shadowColor = 'rgba(255,90,10,.85)'; og.shadowBlur = 40;
    if (stroke) { og.lineWidth = stroke; og.strokeStyle = 'rgba(20,6,0,.9)'; og.strokeText(s, 0, 0); }
    og.fillStyle = fill; og.fillText(s, 0, 0); og.restore(); };
  const end = clamp((IT.dur - t) / .18);                               // 切走前最后几帧收掉
  txt(Pt.kicker, '600 44px "Noto Serif SC"', H * .075, '6px', '#f3d9a4', out((t - .02) / .3) * end);
  const k = t - .14, slam = k < 0 ? 0 : 1 + 1.1 * Math.exp(-k * 14) * Math.cos(k * 26);  // 砸进来：先大后回弹
  if (k >= 0) {
    const g = og.createLinearGradient(0, H * .11, 0, H * .2); g.addColorStop(0, '#fff3c8'); g.addColorStop(.45, '#ffb43c'); g.addColorStop(1, '#e2541a');
    txt(Pt.main, '900 210px "Noto Serif SC"', H * .158, '10px', g, clamp(k / .06) * end, Math.max(.6, slam), 10);
  }
  const k2 = t - 1.05;
  if (k2 >= 0) txt(Pt.sub, '800 76px "Noto Serif SC"', H * .245, '8px', '#fff1d6', clamp(k2 / .1) * end, 1 + .5 * Math.exp(-k2 * 16), 6);
  if (t > 1.5) txt(Pt.tag, '600 38px "Noto Serif SC"', H * .9, '4px', '#f0c98a', out((t - 1.5) / .35) * end);
  // 冲击闪光
  for (const ti of IT.shake || []) { const f = t - ti; if (f >= 0 && f < .25) { og.save(); og.globalAlpha = (1 - f / .25) * .55; og.fillStyle = '#ffd9a0'; og.fillRect(0, 0, W, H); og.restore(); } }
  if (t < .12) { og.fillStyle = `rgba(0,0,0,${1 - t / .12})`; og.fillRect(0, 0, W, H); }
}

// —— 字幕、片名、淡入淡出（叠在画面上，不进油画）——
function overlay(tl, t) {
  og.clearRect(0, 0, W, H);
  // 旁白字幕：底部三分之一，细衬线，随旁白淡入淡出
  FILM.vo.forEach((v, k) => {
    if (!v.text || v.nocap) return;
    const nx = FILM.vo[k + 1];                                  // 下一句出来之前先退场，两句不叠
    const a0 = v.at, a1 = Math.min(v.at + v.dur + .25, nx ? nx.at - .55 : 1e9); if (tl < a0 - .2 || tl > a1 + .3) return;
    const al = clamp((tl - a0 + .2) / .3) * clamp((a1 + .3 - tl) / .3);
    og.save(); og.globalAlpha = al; og.font = '500 40px "Noto Serif SC"'; og.textAlign = 'center'; og.textBaseline = 'middle';
    og.shadowColor = 'rgba(0,0,0,.85)'; og.shadowBlur = 18; og.fillStyle = '#f2e6cf';
    og.letterSpacing = '4px'; og.fillText(v.text.replace(/[；;]$/, ''), W / 2, H * .815); og.restore();
  });
  // 片名：扫光亮起
  const T = FILM.title;
  if (T && tl >= T.at - .1) {
    const k = tl - T.at, al = clamp(k / .8) * (1 - clamp((tl - (IT.start + IT.dur - (IT.fadeOut || 0))) / (IT.fadeOut || 1)));
    const sweep = clamp(k / 1.4) * 1.6 - .3;
    const paint = (txt, font, y, ls, base) => {
      og.save(); og.font = font; og.textAlign = 'center'; og.textBaseline = 'middle'; og.letterSpacing = ls;
      const g = og.createLinearGradient(W * .15, 0, W * .85, 0);
      g.addColorStop(0, base); g.addColorStop(clamp(sweep - .12), base); g.addColorStop(clamp(sweep), '#fff8ea'); g.addColorStop(clamp(sweep + .12), base); g.addColorStop(1, base);
      og.globalAlpha = al; og.shadowColor = 'rgba(0,0,0,.7)'; og.shadowBlur = 24; og.fillStyle = g; og.fillText(txt, W / 2, y); og.restore();
    };
    paint(T.main, '500 124px "Noto Serif SC"', H * .135, '18px', '#efdcb6');
    paint(T.sub, '500 42px "Cormorant Garamond"', H * .205, '10px', '#c9a46a');
    og.save(); og.globalAlpha = al * clamp((k - .5) / .8); og.strokeStyle = '#c9a46a'; og.lineWidth = 2; og.beginPath(); og.moveTo(W / 2 - 110, H * .238); og.lineTo(W / 2 + 110, H * .238); og.stroke(); og.restore();
    if (k > .9) paint(T.tag, '500 36px "Noto Serif SC"', H * .27, '8px', '#d8c29a');
  }
  if (IT.poster && FILM.poster) poster(t);
  // 淡入淡出
  const fin = IT.fadeIn ? 1 - clamp(t / IT.fadeIn) : 0, fout = IT.fadeOut ? clamp((t - (IT.dur - IT.fadeOut)) / IT.fadeOut) : 0;
  const blk = Math.max(fin, fout); if (blk > 0) { og.fillStyle = `rgba(0,0,0,${blk})`; og.fillRect(0, 0, W, H); }
}

const ST = new Strokes(80000);
const STATS = window.STATS = { n: 0, born: 0, dead: 0, ms: 0 };
let lastT = -1, ready = initShot();
window.render = async t => {
  await ready;
  if (t < lastT) throw new Error('render must move forward in time');
  lastT = t;
  if (!IT.still) await advanceTo(clamp(t / IT.dur) * (meta.n - 1));
  const u = nxt ? clamp(simTau - seg) : 0;
  ST.clear();
  const addStroke = s => {
    const a = s.fixed ? 1 : s.ph === 1 ? u : s.ph === 2 ? 1 - u : 1;
    if (a <= 0) return;
    const p = strokeAt(s, u);
    if (s.fixed && !IT.still) p.x += Math.sin(s.y * .014 - t * 5) * .9;
    ST.push({ ...p, c: mix3(s.cA, s.cB, u), c2: mix3(s.c2A, s.c2B, u), alpha: (s.alpha ?? 1) * a });
  };
  const cm = cams(t);
  E.begin(GROUND);
  E.under(bgT, W, H, { grey: 0, cam: cm.bg }); E.draw(bgB, { grey: 0, t: 1, hgt: 1, cam: cm.bg });
  if (IT.still) {
    E.under(cur.tex, W, H, { grey: 0, cam: cm.sub });
    for (const s of list) addStroke(s);
  } else for (let g = 1; g < cur.P.props.length; g++) {
    const mask = E.underPair(cur, nxt, g, u, cm.sub);
    ST.clear(); for (const s of list) if (!s.fixed && s.g === g) addStroke(s);
    E.drawNow(ST.data(), { grey: 0, t: 1, hgt: 1.3, cam: cm.sub, mask });
  }
  if (!IT.still) { ST.clear(); for (const s of list) if (s.fixed) addStroke(s); }
  for (const s of fxStrokes(t)) ST.push(s);
  E.drawNow(ST.data(), { grey: 0, t: 1, hgt: 1.3, cam: cm.sub });
  E.finish({ ...POST_DEFAULT, ...POST, ground: GROUND });
  overlay(IT.start + t, t);
  if (Q.has('debug')) { og.fillStyle = '#0f0'; og.font = '28px monospace'; og.fillText(`n ${list.length} born ${STATS.born} dead ${STATS.dead} tau ${simTau.toFixed(2)}`, 20, 40); }
};
await document.fonts.load('500 40px "Noto Serif SC"'); await document.fonts.load('500 40px "Cormorant Garamond"');
await ready;
window.READY = true;
