// 油画厚涂试验页：?lab=im&test=fy（方源定稿：全身 + 头部特写）| river | frame
import { initEngine, up, plate, flush, mul, TR, SC, POST, NEVER, E, dyn } from '../impasto/kit.js';
import { Ref, paintRef } from '../impasto/engine/plate.js';
import { buildFangyuan, fyFace, FY, GOX, GOY, GRW, GRH } from '../impasto/scenes/fangyuan.js';
import { P as poly, lin } from '../impasto/scenes/common.js';
import { buildRiver, riverFx, spray, bigSpray, feetWater, riverCrowd, VW, VH, FANG, figH } from '../impasto/scenes/river.js';
import { rain } from '../impasto/scenes/figures.js';

const S = {};
function studio() {   // 中性底：冷灰天、暖灰地（只为看人）
  const R = new Ref(1920, 1080, .5);
  R.fill(poly([[0, 0], [1920, 0], [1920, 760], [0, 760]]), lin(0, 0, 0, 760, [[0, '#7c86a0'], [1, '#b8aca6']]), { dir: -5, fallback: -5, group: 'sky', maxR: 60, detail: 2.5 });
  R.fill(poly([[0, 760], [1920, 760], [1920, 1080], [0, 1080]]), lin(0, 760, 0, 1080, [[0, '#a69a94'], [1, '#5e5660']]), { dir: 0, fallback: 0, group: 'ground', maxR: 40 });
  return { strokes: paintRef(R, { R: [30, 15, 8, 4], T: 12, seed: 3 }), ref: R };
}
export async function init(cv, q) {
  initEngine(cv);
  S.bg = up(studio(), 1920, 1080);
  const fy = b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, up(v, GRW, GRH, GOX, GOY)]));
  const test = q.get('test') || 'fy';
  if (test === 'fy' || test === 'ref') { S.fy = fy(buildFangyuan(.5, 11)); S.FY = fy(S.raw = buildFangyuan(1, 12)); }
  if (test === 'river') { S.river = up(S.rraw = buildRiver(), VW, VH); S.fs = fy(buildFangyuan(.25, 13)); }
  if (test === 'frame') { S.shots = await import('../impasto/shots.js'); S.shots.build((q.get('need') || 'wide,med,cu').split(',')); }
}
function drawFy(P, o, M) {
  plate(P.body, { ...o, M }); plate(P.mhy, { ...o, M }); plate(P.arm, { ...o, M }); plate(P.head, { ...o, M });
  fyFace(dyn, {}); flush({ ...o, M, run: .2 });
}
// 平涂底稿（看形与明暗）：叠在页面上的 2D 画布
function showRef(parts) {
  let o = document.getElementById('refview');
  if (!o) { o = Object.assign(document.createElement('canvas'), { id: 'refview', width: 1920, height: 1080 }); o.style.cssText = 'position:fixed;left:0;top:0;z-index:9'; document.body.appendChild(o); }
  const g = o.getContext('2d'); g.fillStyle = '#9a9aa6'; g.fillRect(0, 0, 1920, 1080);
  const R0 = parts[0].ref, k = 1040 / R0.ph;
  for (const p of parts) g.drawImage(p.ref.ctx.canvas, 20, 20, R0.pw * k, R0.ph * k);
  const s = 480 / 1080; g.drawImage(o, 0, 0, 1920, 1080, 1300, 20, 1920 * s * .6, 1080 * s * .6);   // 缩小看能否读
}
export function render(cv, t, q) {
  const test = q.get('test') || 'fy', grey = q.get('grey') === '1' ? 1 : 0;
  if (test === 'ref') { const r = S.raw; showRef([r.body, r.mhy, r.arm, r.head]); return; }
  E.begin();
  const cam = { x: 960, y: 540, zoom: 1 }, o = { t, cam, grey, reveal: grey ? NEVER : -1e6 };
  if (test === 'frame') {
    const f = q.get('f') || 'wide', col = q.get('col'), A = S.shots, opt = { colourAt: col ? +col : NEVER, glow: +(q.get('glow') || 0) };
    ({ wide: A.shotWide, med: A.shotMedium, cu: A.shotCU })[f](t, {}, opt);
    E.finish(POST[q.get('post') || 'grey']); return;
  }
  if (test !== 'river') plate(S.bg, o);
  if (test === 'fy') {
    // 左：全身（.5 板，屏上约 860 高）
    const M = mul(TR(560, 1010), SC(.54));
    drawFy(S.fy, o, M);
    // 右：头部特写（1 板，放大）
    const Mh = mul(TR(1480, 4100), SC(2.4));
    drawFy(S.FY, o, Mh);
  }
  if (test === 'river') {
    const rc = { x: VW / 2, y: VH / 2, zoom: 1920 / VW * 1.01 }, o2 = { ...o, cam: rc };
    plate(S.river, o2);
    riverFx(dyn, t); riverCrowd(dyn, t); flush({ ...o2, run: .1 });
    const k = figH(FANG.y) / 1604, M = mul(TR(FANG.x, FANG.y + 4), SC(k));
    drawFy(S.fs, o2, M);
    feetWater(dyn, t, FANG.x - 10, FANG.y, figH(FANG.y)); flush({ ...o2, run: 0 });
    spray(dyn, t); bigSpray(dyn, t); flush({ ...o2, run: 0 });
  }
  E.finish(grey ? POST.grey : POST.warm);
}
