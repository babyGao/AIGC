// 一帧的绘制计划与下笔：背景层（新画，与原片无关）+ 主体层（取原片颜色，杂物在下笔时盖掉）
import { KNIFE, BRUSH, DAB, LINE, Strokes } from './impasto.js';
import { paintPlan, strokePath, rnd } from './plan.js';
import { PAL, STY, backdrop, light, clamp, lumOf } from './look.js';

export const W = 1080, H = 1920, N = W * H;
export const load = src => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error(src)); im.src = src; });
export const pixels = im => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, W, H); return x.getImageData(0, 0, W, H).data; };

// 取景换算：原片像素坐标 → 画布坐标
export function geom(K) {
  const [cx, cy, ch] = K.crop, cw = ch * W / H, s = W / cw, ox = cx - cw / 2, oy = cy - ch / 2;
  return { s, ox, oy, tp: ([x, y]) => [(x - ox) * s, (y - oy) * s] };
}

// —— 背景层：整幅画布按设计的暗场下笔（主体后面也画，镜头视差移动时不露底）——
export function paintBackdrop(K, seed = 3) {
  const B = K.bg || {}, rgb = new Uint8ClampedArray(N * 4), valid = new Uint8Array(N).fill(1), lab = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const c = backdrop((i % W) / W, ((i / W) | 0) / H, B); rgb[i * 4] = clamp(c[0]) * 255; rgb[i * 4 + 1] = clamp(c[1]) * 255; rgb[i * 4 + 2] = clamp(c[2]) * 255; rgb[i * 4 + 3] = 255; }
  const { out, layin } = paintPlan({ W, H, rgb, valid, lab, props: [STY.bg] }, { R: [140, 90, 60], T: 3, seed });
  // 远处的暖色光斑（焦外虚化），给暗场一点深度和餐厅氛围
  const bk = B.bokeh ?? 9, area = B.bokehArea || [0, 0, 1, Math.max(.12, (B.horizon ?? .2) - .02)];
  let r0 = seed * 9301 + 49297; const rr = () => (r0 = (r0 * 9301 + 49297) % 233280) / 233280;
  for (let k = 0; k < bk; k++) {
    const x = (area[0] + rr() * (area[2] - area[0])) * W, y = (area[1] + rr() * (area[3] - area[1])) * H, r = 26 + rr() * 54;
    const c = [.55 + rr() * .3, .32 + rr() * .15, .14 + rr() * .08];
    out.push({ x, y, ang: 0, len: r * 2, wid: r * 2, c, c2: c.map(v => v * 1.15), seed: rr() * 1000, type: DAB, hgt: .05, alpha: .1 + rr() * .14 });
  }
  return { strokes: out, layin };
}

// —— 主体层的计划：每个像素按所属分区调颜料、布光、轮廓光、接触阴影 ——
export function subjectPlan(K, img) {
  const { raw, L, V, RIM, HI, AO } = img, parts = K.parts, B = K.bg || {}, Lt = K.light || [.5, .5, .6];
  const ch = { L: 0, V: 0, RIM: 0, HI: 0, AO: 0, ...(img.ch || {}) }, expo = K.expo ?? 1;   // 多张图挤在一张 PNG 的不同通道里
  const g0 = geom(K);
  for (const p of parts) if (p.thru) p.thruV = (p.thru - g0.oy) * g0.s / H;
  const rimCol = K.rimCol || [1, .86, .62], rimK = K.rimK ?? .62;
  const rgb = new Uint8ClampedArray(N * 4), valid = new Uint8Array(N), lab = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const u = (i % W) / W, v = ((i / W) | 0) / H, g = L[i * 4 + ch.L];
    lab[i] = g; valid[i] = V[i * 4 + ch.V] > 127 ? 1 : 0;
    if (!g) continue;
    const p = parts[g - 1], f = PAL[p.pal] || PAL.keep;
    let c = f([raw[i * 4] / 255, raw[i * 4 + 1] / 255, raw[i * 4 + 2] / 255], p, { bgc: backdrop(u, v, B), hi: HI ? HI[i * 4 + ch.HI] / 255 : 0, u, v });
    const lk = light(u, v, Lt, p) * (p.pal === 'food' || p.pal === 'liquid' ? expo : 1); c = c.map(x => x * lk);
    if (AO) { const a = AO[i * 4 + ch.AO] / 255; if (a) c = c.map(x => x * (1 - .7 * a)); }
    const rm = RIM[i * 4 + ch.RIM] / 255 * rimK;
    if (rm > 0) c = c.map((x, j) => x + (rimCol[j] - x) * rm);
    rgb[i * 4] = clamp(c[0]) * 255; rgb[i * 4 + 1] = clamp(c[1]) * 255; rgb[i * 4 + 2] = clamp(c[2]) * 255; rgb[i * 4 + 3] = 255;
  }
  const props = [STY.bg, ...parts.map(p => ({ ...STY[p.pal] || STY.keep, ...(p.sty || {}) }))];
  return { W, H, rgb, valid, lab, props };
}

// —— 新画的点缀（原片没有）：整只石盘、蓝莓、薄荷、酱点。先画进计划，再和其它东西一样用刀笔画出来 ——
// 原创角色"熔岩巨石"：岩石做的肌肉巨人，抱臂立在菜后面，裂缝里透出熔岩光（画布坐标，cx/top/scale 可调）
function giantPaths(a) {
  const S = a.scale || 1, cx = a.cx ?? 540, top = a.top ?? 0;
  const P = (x, y) => [cx + x * S, top + y * S];
  const body = new Path2D(), arms = new Path2D();
  const m = (p, q) => body.moveTo(...P(p, q)), l = (p, q) => body.lineTo(...P(p, q)), b = (a1, b1, a2, b2, a3, b3) => body.bezierCurveTo(...P(a1, b1), ...P(a2, b2), ...P(a3, b3));
  body.ellipse(...P(0, 600), 92 * S, 112 * S, 0, 0, 6.3);
  m(-64, 680); b(-140, 748, -232, 758, -292, 792); b(-362, 806, -404, 862, -398, 932); l(-384, 1062); l(-300, 1084);
  b(-262, 1250, -202, 1380, -190, 1490); l(190, 1490); b(202, 1380, 262, 1250, 300, 1084); l(384, 1062); l(398, 932);
  b(404, 862, 362, 806, 292, 792); b(232, 758, 140, 748, 64, 680); body.closePath();
  const bar = (x0, y0, x1, y1, w) => { const [ax, ay] = P(x0, y0), [bx, by] = P(x1, y1), dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), nx = -dy / L * w * S / 2, ny = dx / L * w * S / 2;
    arms.moveTo(ax + nx, ay + ny); arms.lineTo(bx + nx, by + ny); arms.arc(bx, by, w * S / 2, Math.atan2(ny, nx), Math.atan2(-ny, -nx)); arms.lineTo(ax - nx, ay - ny); arms.closePath(); };
  bar(-372, 1012, 236, 1100, 142); bar(372, 1074, -226, 1166, 142);
  return { body, arms, P, S };
}
const prng = seed => { let s = seed >>> 0; return () => ((s = Math.imul(s ^ s >>> 15, 2246822519) + 0x9E3779B9 >>> 0) % 1e6) / 1e6; };
const ADD = {
  giant: { under: true, sty: { type: KNIFE, maxR: 24, detail: .7, follow: 3, fallback: 80, aj: .35, jit: .05, hgt: 1.5 },
    draw: (x, a) => { const { body, arms, P, S } = giantPaths(a), r = prng(11);
      const blob = (px, py, rx, ry, c, rot = 0) => { const [X, Y] = P(px, py), g = x.createRadialGradient(X, Y - ry * S * .35, 1, X, Y, Math.max(rx, ry) * S); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.beginPath(); x.ellipse(X, Y, rx * S, ry * S, rot, 0, 6.3); x.fill(); };
      x.fillStyle = '#17110e'; x.fill(body);
      x.save(); x.clip(body);
      // 块面：斜方肌、三角肌、胸大肌、头——被下方菜盘的暖光从下往上照亮
      for (const sx of [-1, 1]) { blob(sx * 175, 770, 120, 60, 'rgba(110,84,64,.85)'); blob(sx * 330, 905, 115, 135, 'rgba(126,94,70,.9)'); blob(sx * 150, 915, 150, 92, 'rgba(118,88,66,.85)'); blob(sx * 270, 1220, 90, 200, 'rgba(84,62,48,.6)'); }
      blob(0, 600, 86, 104, 'rgba(96,74,58,.8)');
      for (let k = 0; k < 220; k++) { const [px, py] = P((r() - .5) * 820, 480 + r() * 1020); x.fillStyle = r() < .55 ? 'rgba(6,4,3,.28)' : 'rgba(150,120,96,.12)'; x.beginPath(); x.ellipse(px, py, (10 + r() * 46) * S, (6 + r() * 26) * S, r() * 3, 0, 6.3); x.fill(); }
      x.strokeStyle = 'rgba(5,4,3,.85)'; x.lineWidth = 9 * S; x.lineCap = 'round';
      for (const [p0, p1, p2] of [[[-290, 905], [-150, 985], [-12, 915]], [[290, 905], [150, 985], [12, 915]], [[0, 830], [4, 880], [0, 960]], [[-262, 800], [-300, 880], [-262, 990]], [[262, 800], [300, 880], [262, 990]], [[-60, 700], [-30, 740], [0, 760]], [[60, 700], [30, 740], [0, 760]]]) {
        x.beginPath(); x.moveTo(...P(...p0)); x.quadraticCurveTo(...P(...p1), ...P(...p2)); x.stroke(); }
      // 背光轮廓：只在上半身亮，往下渐隐
      const [, ry0] = P(0, 470), [, ry1] = P(0, 1150), rg = x.createLinearGradient(0, ry0, 0, ry1);
      rg.addColorStop(0, 'rgba(255,196,110,1)'); rg.addColorStop(.45, 'rgba(255,128,40,.85)'); rg.addColorStop(1, 'rgba(255,100,20,0)');
      x.shadowColor = 'rgba(255,120,30,1)'; x.shadowBlur = 30 * S; x.strokeStyle = rg; x.lineWidth = 18 * S; x.stroke(body); x.restore();
      // 抱着的双臂：圆柱明暗 + 拳头
      x.save(); x.clip(arms); x.fillStyle = '#211813'; x.fill(arms);
      for (const [x0, y0, x1, y1] of [[-372, 1012, 236, 1100], [372, 1074, -226, 1166]]) {
        const [ax, ay] = P(x0, y0), [bx, by] = P(x1, y1), nx = -(by - ay), ny = bx - ax, L = Math.hypot(nx, ny), mx = (ax + bx) / 2, my = (ay + by) / 2, h = 71 * S;
        const g = x.createLinearGradient(mx - nx / L * h, my - ny / L * h, mx + nx / L * h, my + ny / L * h);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.62, 'rgba(140,104,78,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fill(arms);
      }
      for (let k = 0; k < 90; k++) { const [px, py] = P((r() - .5) * 760, 1010 + r() * 170); x.fillStyle = r() < .55 ? 'rgba(6,4,3,.3)' : 'rgba(160,126,100,.12)'; x.beginPath(); x.ellipse(px, py, (8 + r() * 30) * S, (5 + r() * 16) * S, r() * 3, 0, 6.3); x.fill(); }
      x.strokeStyle = 'rgba(4,3,2,.9)'; x.lineWidth = 12 * S; x.beginPath(); x.moveTo(...P(-226, 1112)); x.lineTo(...P(236, 1132)); x.stroke(); x.restore(); } },
  lava: { on: 'giant', sty: { type: BRUSH, maxR: 6, detail: .35, follow: 1, aj: .2, jit: .03, hgt: 1.7 },
    draw: (x, a) => { const { P, S } = giantPaths(a), r = prng(5);
      const crack = (x0, y0, ang, n, w) => { let px = x0, py = y0; const pts = [[px, py]];
        for (let k = 0; k < n; k++) { ang += (r() - .5) * 1.5; const st = 12 + r() * 16; px += Math.cos(ang) * st; py += Math.sin(ang) * st; pts.push([px, py]);
          if (r() < .22 && w > 2.4) crack(px, py, ang + (r() < .5 ? 1 : -1) * (.7 + r() * .7), 3 + (r() * 5 | 0), w * .65); }
        for (const [lw, col, bl] of [[w * 2.6, 'rgba(220,70,10,.9)', 22], [w, 'rgba(255,220,130,1)', 8]]) {
          x.save(); x.shadowColor = 'rgba(255,100,10,1)'; x.shadowBlur = bl * S; x.strokeStyle = col; x.lineWidth = lw * S; x.lineCap = 'round'; x.lineJoin = 'miter';
          x.beginPath(); x.moveTo(...P(...pts[0])); for (const q of pts.slice(1)) x.lineTo(...P(...q)); x.stroke(); x.restore(); } };
      for (const [cx0, cy0, an] of [[-250, 850, 1.1], [200, 800, 2.1], [-80, 960, 1.6], [330, 960, 1.8], [-320, 1180, .3], [150, 1260, 1.3], [-160, 1320, 1.8], [30, 690, 1.4], [-30, 520, 1.9]]) crack(cx0, cy0, an, 6 + (r() * 6 | 0), 3.6);
      for (const sx of [-1, 1]) { x.save(); x.shadowColor = 'rgba(255,120,20,1)'; x.shadowBlur = 26 * S; x.fillStyle = '#ffe2a0'; x.beginPath(); x.ellipse(...P(sx * 36, 590), 22 * S, 5 * S, sx * -.2, 0, 6.3); x.fill(); x.restore(); } } },
  plate: { under: true, sty: { type: KNIFE, maxR: 52, detail: 2.6, fallback: 0, aj: .25, jit: .025, hgt: .7 },
    draw: (x, a, g) => { const [px, py] = g.tp([a.x, a.y]), rx = a.rx * g.s, ry = a.ry * g.s;
      const gr = x.createRadialGradient(px - rx * .25, py - ry * .55, rx * .05, px, py, rx);
      gr.addColorStop(0, '#3d3935'); gr.addColorStop(.65, '#262220'); gr.addColorStop(1, '#141211'); x.fillStyle = gr;
      x.beginPath(); x.ellipse(px, py, rx, ry, 0, 0, 6.3); x.fill();
      x.strokeStyle = 'rgba(214,178,116,.9)'; x.lineWidth = Math.max(3, rx * .011); x.beginPath(); x.ellipse(px, py, rx * .985, ry * .975, 0, 0, 6.3); x.stroke();
      x.strokeStyle = 'rgba(255,238,210,.55)'; x.lineWidth = Math.max(2, rx * .006); x.beginPath(); x.ellipse(px, py - ry * .01, rx * .99, ry * .98, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
      if (a.shadow) { const [sx, sy] = g.tp(a.shadow); x.save(); x.filter = `blur(${28 * g.s}px)`; x.fillStyle = 'rgba(5,4,4,.75)'; x.beginPath(); x.ellipse(sx, sy, a.shadow[2] * g.s, a.shadow[3] * g.s, 0, 0, 6.3); x.fill(); x.restore(); } } },
  berry: { sty: { type: DAB, maxR: 9, detail: .45, follow: 1, aj: .3, jit: .03, hgt: 1.7 },
    draw: (x, a, g) => { const r = a.r * g.s, [px, py] = g.tp([a.x, a.y]); const gr = x.createRadialGradient(px - r * .35, py - r * .4, r * .1, px, py, r);
      gr.addColorStop(0, '#7a7aa2'); gr.addColorStop(.35, '#2e2754'); gr.addColorStop(1, '#0d0a1c'); x.fillStyle = gr; x.beginPath(); x.arc(px, py, r, 0, 6.3); x.fill();
      x.fillStyle = '#120c18'; x.beginPath(); x.arc(px + r * .1, py - r * .55, r * .22, 0, 6.3); x.fill(); } },
  leaf: { sty: { type: BRUSH, maxR: 8, detail: .5, follow: 1, aj: .2, jit: .04, hgt: 1.2 },
    draw: (x, a, g) => { const [px, py] = g.tp([a.x, a.y]), L = a.len * g.s, Wd = a.wid * g.s; x.save(); x.translate(px, py); x.rotate(a.ang * Math.PI / 180);
      const gr = x.createLinearGradient(0, -Wd / 2, 0, Wd / 2); gr.addColorStop(0, '#86b852'); gr.addColorStop(.5, '#438230'); gr.addColorStop(1, '#1f4a1a'); x.fillStyle = gr;
      x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(L * .3, -Wd * .75, L * .75, -Wd * .55, L, 0); x.bezierCurveTo(L * .75, Wd * .55, L * .3, Wd * .75, 0, 0); x.fill();
      x.strokeStyle = '#b3d684'; x.lineWidth = Math.max(1.5, Wd * .07); x.beginPath(); x.moveTo(L * .05, 0); x.quadraticCurveTo(L * .5, -Wd * .06, L * .92, 0); x.stroke(); x.restore(); } },
  dot: { sty: { type: DAB, maxR: 10, detail: .5, aj: .2, jit: .03, hgt: 1.5 },
    draw: (x, a, g) => { const r = a.r * g.s, [px, py] = g.tp([a.x, a.y]); const gr = x.createRadialGradient(px - r * .3, py - r * .35, r * .1, px, py, r);
      gr.addColorStop(0, '#fff6e0'); gr.addColorStop(.6, a.col || '#e8d3a6'); gr.addColorStop(1, '#a8916a'); x.fillStyle = gr; x.beginPath(); x.ellipse(px, py, r, r * .62, 0, 0, 6.3); x.fill(); } },
};
export function applyAdds(K, P) {
  const g = geom(K), gidOf = {};
  for (const [kind, A] of Object.entries(ADD)) {
    const list = (K.adds || []).filter(a => a.type === kind); if (!list.length) continue;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
    for (const a of list) A.draw(x, a, g);
    const d = x.getImageData(0, 0, W, H).data, gid = P.props.length; P.props.push(A.sty); gidOf[kind] = gid;
    const on = A.on ? gidOf[A.on] : -1;                       // on：只画在某个已画好的东西上（熔岩只在巨人身上）
    for (let i = 0; i < N; i++) if (d[i * 4 + 3] > 140 && (!A.under || !P.lab[i]) && (on < 0 || P.lab[i] === on)) { P.rgb[i * 4] = d[i * 4]; P.rgb[i * 4 + 1] = d[i * 4 + 1]; P.rgb[i * 4 + 2] = d[i * 4 + 2]; P.lab[i] = gid; P.valid[i] = 1; }
  }
}

// —— 收尾提白：在高光点上点厚颜料（果酱反光、糖浆、油光）——
export function highlights(out, SPEC, P, o = {}) {
  const st = o.step || 12, thr = o.thr ?? .5, sc = o.ch ?? 0;
  for (let y = st / 2; y < H; y += st) for (let x = st / 2; x < W; x += st) {
    let best = 0, bx = 0, by = 0;
    for (let yy = y - st / 2; yy < y + st / 2; yy++) for (let xx = x - st / 2; xx < x + st / 2; xx++) { const v = SPEC[((yy | 0) * W + (xx | 0)) * 4 + sc]; if (v > best) { best = v; bx = xx; by = yy; } }
    const sv = best / 255; if (sv < thr) continue;
    if (!P.valid[(by | 0) * W + (bx | 0)]) continue;
    const i = ((by | 0) * W + (bx | 0)) * 4, base = [P.rgb[i] / 255, P.rgb[i + 1] / 255, P.rgb[i + 2] / 255];
    const k = clamp(.35 + sv * .45), c = base.map((b, j) => b + ([1, .96, .88][j] - b) * k);
    const r = 3.2 + sv * 5;              // 提白是一小片，不是一个点
    // 低起伏、半透明：像刮刀带过的一抹亮色，不是一颗颗凸起的白点
    out.push({ hl: 1, g: P.lab[(by | 0) * W + (bx | 0)], x: bx, y: by, ang: rnd() * 3.14, len: r * (1.8 + rnd()), wid: r, c, c2: c.map(v => Math.min(1, v + .04)), seed: rnd() * 1000, type: DAB, hgt: .55, alpha: .7 });
  }
}

// —— 细流、拉丝：原片里只有几像素宽，用细笔沿原路径重描 ——
export function lines(out, K, pts, ln) {
  const g = geom(K), P = pts.map(g.tp), c = ln.col.map(v => v / 255);
  strokePath(out, P, { type: BRUSH, wid: ln.w * g.s, c, c2: c.map(v => Math.min(1, v * 1.35 + .08)), hgt: 1.3, step: 18, over: 1.5, alpha: 1 });
  strokePath(out, P.map(([x, y]) => [x - ln.w * g.s * .18, y]), { type: LINE, wid: ln.w * g.s * .3, c: [1, .93, .78], c2: [1, .97, .9], hgt: .5, step: 26, over: 1.2, alpha: .8 });
}

// —— 主体层下笔：背景分区不归这一层，铺底只留主体部分 ——
export function paintSubject(K, P, seed = 7) {
  const skip = new Uint8Array(P.props.length); skip[0] = 1;
  const { out, layin } = paintPlan(P, { R: [64, 32, 16, 8, 4.5], T: 22, seed, skip });
  for (let i = 0; i < N; i++) if (!P.lab[i]) layin[i * 4 + 3] = 0;
  return { strokes: out, layin };
}
