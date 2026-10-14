// 正片调度：机位（长卷横移、特写硬切）、墨晕转场、旁白字幕、声音事件
import { DUR, T, X, VO, BLOOM } from './story.js';
import * as hook from './scenes/s0-hook.js';
import * as herbs from './scenes/s1-herbs.js';
import * as mill from './scenes/s2-mill.js';
import * as honey from './scenes/s3-honey.js';
import * as knead from './scenes/s4-knead.js';
import * as pills from './scenes/s5-pills.js';
import * as ding from './scenes/s6-ding.js';
import * as wuxing from './scenes/s7-wuxing.js';
import * as anchor from './scenes/s8-anchor.js';
import { subtitle, BOXES } from './engine/text.js';
import { clamp, lerp, eio, ss, seg } from '/core/lib.js';
export { DUR };

let DURS = {};
export async function init() { try { DURS = await (await fetch('voices/dur.json')).json(); } catch (e) { DURS = {}; } }

const SCROLL = [['hook', hook], ['herbs', herbs], ['mill', mill], ['honey', honey], ['knead', knead], ['pills', pills]];
const C = (x, y, z) => ({ x, y, z });
const mixC = (a, b, u) => C(lerp(a.x, b.x, u), lerp(a.y, b.y, u), lerp(a.z, b.z, u));
// 各站的落定机位（世界坐标）
const AT = {
  hook: C(0, 0, 1), herbs: C(X.herbs, 0, 1), mill: C(X.mill, 0, 1), honey: C(X.honey, 0, 1),
  knead: C(X.knead + knead.CAM.x, knead.CAM.y, knead.CAM.z), pills: C(X.pills + pills.CAM.x, pills.CAM.y, pills.CAM.z),
};
const PAN = [['hook', 'herbs', 5.5, 6.9], ['herbs', 'mill', 13.1, 14.2], ['mill', 'honey', 16.8, 17.7], ['honey', 'knead', 22.45, 23.3], ['knead', 'pills', 27.0, 27.85]];
const ECU_PILL = (() => { const p = pills.PILLS.reduce((a, b) => Math.abs(b.x + 30) + Math.abs(b.y - 98) < Math.abs(a.x + 30) + Math.abs(a.y - 98) ? b : a); return p; })();

// 长卷上的机位
function scrollCam(t) {
  if (t < 5.5) return C(0, 0, 1 + .03 * ss(t / 5.5));
  for (const [a, b, t0, t1] of PAN) if (t >= t0 && t < t1) return mixC(AT[a], AT[b], eio(seg(t, t0, t1)));
  if (t < 13.1) return AT.herbs;
  if (t < 16.8) return AT.mill;
  if (t < T.honey.ecu) return AT.honey;
  if (t < T.honey.off) return C(X.honey, -24, 3.0 + .3 * seg(t, T.honey.ecu, T.honey.off));      // 硬切：蜜面特写
  if (t < 22.45) return AT.honey;
  if (t < 27.0) return AT.knead;
  if (t < T.pills.ecu) return AT.pills;
  return C(X.pills + ECU_PILL.x, ECU_PILL.y, 3.3 + .4 * seg(t, T.pills.ecu, T.pills.ecu + 1.2));   // 硬切：一丸特写
}
const dingCam = t => C(0, lerp(30, 6, ss(seg(t, BLOOM.ding[0], BLOOM.wuxing[1]))), lerp(1, 1.08, ss(seg(t, BLOOM.ding[0], BLOOM.wuxing[1]))));
const wuxCam = () => C(0, 0, 1);
function anchorCam(t) { const [a, b] = T.anchor.row, u = seg(t, a, b), e = u < .5 ? 2 * u * u * u * 2 : 1 - Math.pow(-2 * u + 2, 3) / 2; return C(lerp(5100, 0, e), lerp(-10, 0, u), 1); }
const endCam = t => C(0, 0, lerp(1.04, 1, ss(seg(t, BLOOM.end[0], DUR))));

const xfOf = (c, ox = 0) => ({ s: c.z, tx: 960 + (ox - c.x) * c.z, ty: 540 - c.y * c.z });
const compOf = c => ({ paper: [c.x * c.z - 960, c.y * c.z - 540, c.z], bleed: Math.min(10, 5 * c.z), rim: 1 });

function paintScroll(L, t, TMP) {
  const c = scrollCam(t);
  for (const [name, sc] of SCROLL) if (Math.abs(X[name] - c.x) < 960 / c.z + 1150) sc.paint(L, t, xfOf(c, X[name]), TMP);
  return { c, scr: (x, y) => [960 + (x - c.x) * c.z, 540 + (y - c.y) * c.z] };
}
// 某一时刻是哪一幕在画（主画面）
function main(L, t, TMP) {
  if (t < BLOOM.ding[0]) return paintScroll(L, t, TMP);
  if (t < BLOOM.wuxing[0]) { const c = dingCam(t); ding.paint(L, t, xfOf(c), TMP); return { c, scr: (x, y) => [960 + (x - c.x) * c.z, 540 + (y - c.y) * c.z] }; }
  if (t < T.anchor.row[0]) { const c = wuxCam(t); wuxing.paint(L, t, xfOf(c), TMP); return { c }; }
  if (t < BLOOM.end[0]) { const c = anchorCam(t); anchor.paint(L, t, xfOf(c), TMP); return { c, scr: (x, y) => [960 + (x - c.x) * c.z, 540 + (y - c.y) * c.z] }; }
  const c = endCam(t); hook.paint(L, t, xfOf(c), TMP, { end: true }); return { c };
}
// 墨晕转场：新的一幕从一团正在洇开的墨里长出来
function bloomOf(t) {
  if (t >= BLOOM.ding[0] && t < BLOOM.ding[1]) return { u: seg(t, ...BLOOM.ding), center: [960, 540], b: (L, TMP) => { const c = dingCam(t); ding.paint(L, t, xfOf(c), TMP); return c; }, a: (L, TMP) => paintScroll(L, t, TMP) };
  if (t >= BLOOM.wuxing[0] && t < BLOOM.wuxing[1]) {
    const c0 = dingCam(t), p = ding.pillPos(t), cx = 960 + (p[0] - c0.x) * c0.z, cy = 540 + (p[1] - c0.y) * c0.z;
    return { u: seg(t, ...BLOOM.wuxing), center: [cx, cy], b: (L, TMP) => { const c = wuxCam(t); wuxing.paint(L, t, xfOf(c), TMP); return c; }, a: (L, TMP) => { ding.paint(L, t, xfOf(c0), TMP); return { c: c0 }; } };
  }
  if (t >= BLOOM.end[0] && t < BLOOM.end[1]) {
    const c0 = anchorCam(t);
    return { u: seg(t, ...BLOOM.end), center: [960 + (104 - c0.x), 540 + (209 - c0.y)], b: (L, TMP) => { const c = endCam(t); hook.paint(L, t, xfOf(c), TMP, { end: true }); return c; }, a: (L, TMP) => { anchor.paint(L, t, xfOf(c0), TMP); return { c: c0 }; } };
  }
  return null;
}

function subs(L, t) {
  for (const v of VO) {
    const d = DURS[v.id] ?? 2, a = v.t - .08, nx = VO[VO.indexOf(v) + 1], b = Math.min(Math.max(v.t + d + .55, v.t + 1.8), nx ? nx.t - .2 : 1e9);
    if (t < a || t > b) continue;
    subtitle(L, v.text, 960, 1010, Math.min(clamp((t - a) / .3), clamp((b - t) / .35)), { size: 40 });
  }
}

// 审字：把所有字框画出来，相叠的标红
function drawBoxes(A) {
  const c = A.cc; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.lineWidth = 3;
  const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  BOXES.forEach((a, i) => { const bad = BOXES.some((b, j) => j !== i && hit(a, b)); c.strokeStyle = bad ? 'rgba(230,0,0,.95)' : 'rgba(0,90,200,.5)'; c.strokeRect(a.x0, a.y0, a.x1 - a.x0, a.y1 - a.y0); if (bad) window.__overlap = (window.__overlap || []).concat(a.text); });
  if (BOXES.some((a, i) => BOXES.some((b, j) => j !== i && hit(a, b)))) { c.fillStyle = 'rgba(230,0,0,.9)'; c.fillRect(0, 0, 220, 220); }
  c.restore();
}
export function render(t, A, B, TMP, comp, q) {
  A.clear(); B.clear(); BOXES.length = 0;
  const bl = bloomOf(t);
  if (bl) {
    const ra = bl.a(A, TMP), cb = bl.b(B, TMP), ca = ra.c || ra;
    subs(A, t); subs(B, t);
    const oa = compOf(ca), ob = compOf(cb);
    comp(A, B, { ...oa, paperB: ob.paper, bleedB: ob.bleed, rimB: 1, trans: [bl.center[0], bl.center[1], 20 + 2400 * ss(bl.u), 1] });
    return;
  }
  const r = main(A, t, TMP);
  if (!q || !q.has('nosub')) subs(A, t);
  if (q && q.has('boxes')) drawBoxes(A);
  comp(A, null, compOf(r.c));
}

// 声音与配乐的提示点（events.mjs 导出给 mix.py / score.py）
export function events() {
  const E = [], P = (o) => E.push(o);
  for (const v of VO) P({ t: v.t, type: 'vo', id: v.id });
  P({ type: 'ticks', t0: T.dots[0], t1: T.dots[1], n: 200 });
  P({ type: 'silence', t0: 2.62, t1: T.dropHit - .02, soft: 1 });
  P({ t: T.dropHit, type: 'drop' });
  T.dan.forEach(([a, b]) => P({ t: a, type: 'brush', dur: b - a, gain: .8 }));
  P({ t: T.title[0], type: 'brush', dur: .7, gain: .4 }); P({ t: T.sealHook, type: 'seal' });
  PAN.forEach(([, , a, b]) => P({ t: a, type: 'pan', dur: b - a }));
  for (const [kind, [a, b]] of Object.entries(T.pour)) P({ type: 'pour', kind, t0: a, t1: b });
  P({ t: T.quote[0], type: 'brush', dur: 1.8, gain: .5 });
  P({ t: T.mill.sweep[0], type: 'sweep', dur: .5 });
  P({ type: 'roll', t0: T.mill.roll[0], t1: T.mill.roll[1], period: T.mill.period });
  P({ type: 'sift', t0: T.mill.sift[0], t1: T.mill.sift[1] });
  P({ type: 'simmer', t0: T.honey.in, t1: T.honey.hush[0], fine: T.honey.boil });
  P({ type: 'silence', t0: T.honey.hush[0], t1: T.honey.hush[1] });
  P({ t: T.honey.off, type: 'lift' });
  P({ type: 'powder', t0: T.knead.pour[0], t1: T.knead.pour[1] });
  T.knead.pat.forEach((t) => P({ t, type: 'pat' }));
  pills.PILLS.forEach((p, k) => P({ t: lerp(T.pills.each[0], T.pills.each[1], k / (pills.PILLS.length - 1)), type: 'tap' }));
  P({ t: T.pills.glaze[0], type: 'brush', dur: T.pills.glaze[1] - T.pills.glaze[0], gain: .9 });
  for (const [k, [a, b]] of Object.entries(BLOOM)) P({ t: a, type: 'bloom', dur: b - a });
  P({ type: 'hall', t0: BLOOM.ding[0], t1: T.ding.hush[0] });
  P({ type: 'silence', t0: T.ding.hush[0], t1: T.ding.hush[1] });
  P({ t: T.ding.open[0], type: 'lid' }); P({ t: T.ding.rise[0] + .45, type: 'gong' });
  P({ type: 'drips', t0: T.wuxing.sick[0] + .4, t1: T.wuxing.sick[1] });
  P({ t: T.wuxing.earth, type: 'cue', name: 'gong5' });
  P({ t: T.wuxing.yang[0], type: 'brush', dur: T.wuxing.yang[1] - T.wuxing.yang[0], gain: .7 });
  P({ t: T.wuxing.yin[0], type: 'brush', dur: T.wuxing.yin[1] - T.wuxing.yin[0], gain: 1 });
  P({ t: T.wuxing.spin[0], type: 'spin', dur: T.wuxing.spin[1] - T.wuxing.spin[0] });
  P({ t: T.anchor.row[0], type: 'pan', dur: T.anchor.row[1] - T.anchor.row[0], gain: 1.2 });
  P({ type: 'snow', t0: T.anchor.row[1] - .3, t1: BLOOM.end[1] });
  P({ t: T.anchor.warm, type: 'warm' });
  T.end.drop.forEach((t) => P({ t: t + .28, type: 'thud' }));
  P({ t: T.end.quote[0], type: 'brush', dur: 1.1, gain: .5 });
  P({ t: T.end.seal, type: 'seal' });
  return E;
}
export function texts() { return []; }
