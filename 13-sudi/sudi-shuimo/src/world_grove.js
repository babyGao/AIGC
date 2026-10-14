// 开场的「挂轴」世界：自上而下 天上星河 → 雾 → 远山与关隘 → 江上石拱桥 → 杏花林（主歌一在这里横向展开成手卷）
// 世界坐标：地面 y = GROUND；x 向右延伸到 6400。
import { mk, draw, blot, mass } from '../engine/ink.js';
import { mulberry, lerp, clamp } from '/core/lib.js';
import * as P from './props.js';

export const GROUND = 4000, HER = [2250, 3992], CLAWD0 = [640, 3990];
let FAR = null, HILLS = null;
export function init() {
  if (FAR) return;
  FAR = P.mountains('tiltFar', 1920, 760, [[300, 260, 160], [620, 330, 150], [980, 250, 140], [1300, 360, 160], [1650, 280, 150], [1900, 200, 130]], 560, { seed: 5, tone: .18, mist: .85, depth: 280, rim: .6 });
  // 关隘：山脊上一段城墙 + 城楼（很小，伏笔）
  const c = { wet: FAR.wet.getContext('2d'), dry: FAR.dry.getContext('2d') };
  const rx = 1300, ry = FAR.ridge(rx) + 6;
  mass(c.wet, [[rx - 120, ry + 8], [rx - 110, ry - 14], [rx + 110, ry - 18], [rx + 120, ry + 6]], .32, 2, 11);
  mass(c.wet, [[rx - 24, ry - 16], [rx - 20, ry - 44], [rx + 20, ry - 44], [rx + 24, ry - 16]], .4, 1.5, 12);
  draw(c, mk([[rx - 36, ry - 44], [rx, ry - 52], [rx + 36, ry - 44]], { w: 5, tone: .85, dry: .4, prof: 'even', seed: 13 }));
  HILLS = P.mountains('groveHills', 6400, 900, [[400, 200, 260], [1500, 160, 300], [2600, 240, 280], [3700, 150, 260], [4800, 230, 300], [5900, 170, 260]], 760, { seed: 9, tone: .13, mist: .9, depth: 300, rim: .5 });
}

const TREES = [[1150, 1.05, 3], [1720, .9, 5], [2700, 1.1, 7], [3300, .85, 9], [3950, 1.0, 11], [4250, .9, 13], [5250, 1.1, 15], [5800, .95, 17]];
// 杏树：一根主干（饱墨，往上分叉）+ 几枝 + 花
export function tree(L, x, y, s, seed, bloom = 1, t = 0, wind = 0) {
  const T = (px, py) => [x + px * s, y + py * s];
  draw(L, mk([T(0, 0), T(-8, -120), T(10, -240), T(-6, -330)], { w: 26 * s, tone: .8, darkDir: [-1, 0], side: .8, brWet: true, body: .3, dry: .55, wet: .7, prof: 'press', seed }), 1, 1);
  const br = [[[10, -240], [80, -300], [150, -330]], [[-6, -330], [-60, -400], [-130, -420]], [[-8, -150], [-90, -200], [-160, -205]], [[4, -280], [40, -380], [30, -460]]];
  br.forEach((b, i) => draw(L, mk(b.map(p => T(p[0] + Math.sin(t * 1.2 + i) * wind * 4 * (p[0] !== b[0][0]), p[1])), { w: 7 * s, tone: .85, dry: .6, wet: .2, prof: 'tip', seed: seed * 10 + i }), 1, 1));
  const R = mulberry(seed * 7);
  const n = 64;
  for (let i = 0; i < n; i++) {
    const b = br[i % br.length], u = .3 + R() * .7, p = [lerp(b[0][0], b[2][0], u) + (R() - .5) * 50, lerp(b[0][1], b[2][1], u) + (R() - .5) * 40];
    const k = clamp(bloom * (n + 12) / 12 - i / 12); if (k <= 0) continue;
    P.flower(L, ...T(...p), (11 + R() * 9) * s * Math.min(1, k * 1.5), Math.min(1, k * 2), R() * 6, seed * 100 + i);
  }
}

// 画世界（相机已设好）。view = [x0, y0, x1, y1] 世界里可见的范围，用来跳过画不到的东西
export function drawWorld(L, t, view, o = {}) {
  const [x0, y0, x1, y1] = view;
  const vis = (a, b) => b > y0 - 200 && a < y1 + 200;
  if (vis(0, 1300)) {
    P.wash(L.wet, x0 - 50, -200, x1 + 50, 600, .55, .4); P.wash(L.wet, x0 - 50, 600, x1 + 50, 1250, .4, 0);
    P.starRiver(L, 960, 1500, 1350, -.02 + t * .004, 1, { a0: -2.5, a1: -.64, band: .2, n: 320, t, seed: 21, starK: 1.4 });
  }
  if (vis(1400, 2200)) P.blitLayer(L, FAR, 0, 1440);
  if (vis(2350, 2900)) {
    P.waveLines(L, 80, 1840, 2640, 2760, { n: 9, t, am: .5 });
    P.bridge(L, 960, 2660, 560, { seed: 41 });
    const R = mulberry(77);
    for (let i = 0; i < 14; i++) { const x = 80 + R() * 1760; draw(L, mk([[x, 2700], [x + 6, 2650 - R() * 40]], { w: 2, tone: .5, dry: .5, prof: 'tip', seed: 900 + i }), 1, .6); }
  }
  if (vis(2900, 4200)) {
    // 远丘（长卷）
    P.blitLayer(L, HILLS, 0, 3220, .9);
    // 地面：几笔干笔 + 溪
    const R = mulberry(31);
    for (let i = 0; i < 40; i++) { const x = R() * 6400; if (x < x0 - 300 || x > x1 + 300) continue; draw(L, mk([[x, GROUND + 8 + R() * 30], [x + 60 + R() * 120, GROUND + 6 + R() * 30]], { w: 3 + R() * 4, tone: .35, dry: .75, prof: 'tip', seed: 1000 + i }), 1, .8); }
    P.waveLines(L, 1500, 3500, GROUND + 50, GROUND + 110, { n: 5, t, am: .45, seed: 640 });
    // 她坐的石头
    if (HER[0] > x0 - 400 && HER[0] < x1 + 400) {
      mass(L.wet, [[HER[0] - 90, GROUND + 10], [HER[0] - 70, GROUND - 40], [HER[0] - 10, GROUND - 58], [HER[0] + 60, GROUND - 48], [HER[0] + 95, GROUND + 10]], .3, 3, 55, [0, GROUND - 58, 0, GROUND + 10, 1.1, .3]);
      draw(L, mk([[HER[0] - 88, GROUND + 6], [HER[0] - 66, GROUND - 40], [HER[0] - 8, GROUND - 58], [HER[0] + 58, GROUND - 46]], { w: 6, tone: .85, dry: .5, prof: 'brush', seed: 56 }), 1, 1);
    }
    // 杏树
    for (const [x, s, sd] of TREES) if (x > x0 - 300 && x < x1 + 300) tree(L, x, GROUND + 10, s, sd, o.bloom ?? 1, t, .6);
    // 近景花枝（Clawd 睡在下面）
    if (x0 < 1400) P.blossomBranch(L, 230, 3830, 1.25, { bloom: 1, seed: 92, t, wind: .6 });
    // Clawd 睡的石头
    if (x0 < 1200) { mass(L.wet, [[CLAWD0[0] - 70, GROUND + 6], [CLAWD0[0] - 50, GROUND - 6], [CLAWD0[0] + 60, GROUND - 8], [CLAWD0[0] + 80, GROUND + 6]], .22, 2, 57); }
  }
}
