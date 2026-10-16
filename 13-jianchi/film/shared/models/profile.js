// 侧脸生成器：以方源侧脸（量自用户参考图）为底，归一化（头顶到下巴 = 1，下巴在原点，面朝左），
// 用参数做出不同年纪、性别、表情的侧脸。配角的发型、头饰、衣领再按各自参考图另画。
//   profileHead(T, p) → layers（T: 归一化坐标 → 画面坐标）
//   p: { age 0–1, female, nose 0.6–1.6, jaw 0.8–1.3, expr: 'calm'|'roar'|'cry'|'laugh'|'grit'|'frown', eyeRed }
const BASE = {
  front: [[-.136, -.709], [-.118, -.618], [-.1, -.527], [-.086, -.464], [-.091, -.382], [-.109, -.327], [-.136, -.264], [-.162, -.22], [-.149, -.198], [-.109, -.185], [-.082, -.164], [-.064, -.145], [-.049, -.131], [-.056, -.118], [-.036, -.098], [-.04, -.071], [-.027, -.036], [0, 0]],
  back: [[.064, .005], [.155, -.031], [.245, -.127], [.3, -.255], [.33, -.391], [.4, -.47], [.5, -.56], [.56, -.7], [.51, -.86], [.37, -.965], [.19, -1.0], [.02, -.965], [-.09, -.87]],
  eyeUp: [[-.085, -.433], [-.055, -.435], [-.018, -.427], [.014, -.411]],
  eyeLow: [[-.085, -.433], [-.064, -.404], [-.027, -.395], [.014, -.411]],
  brow: [[-.104, -.469], [-.055, -.476], [-.009, -.471], [.033, -.456]],
  ear: [[.282, -.455], [.327, -.491], [.364, -.436], [.368, -.336], [.332, -.255], [.291, -.273]],
};
// 下颌绕耳下枢轴转动（张嘴）
const PIV = [.29, -.3];
const rot = ([x, y], a) => { const c = Math.cos(a), s = Math.sin(a), dx = x - PIV[0], dy = y - PIV[1]; return [PIV[0] + dx * c - dy * s, PIV[1] + dx * s + dy * c]; };

export function profileHead(T, p = {}) {
  const age = p.age ?? 0, fem = !!p.female, nose = p.nose ?? 1, jaw = p.jaw ?? 1, expr = p.expr || 'calm';
  const open = { roar: .26, laugh: .16, cry: .1, grit: 0, frown: 0, calm: 0, dead: .05 }[expr];
  // 前轮廓：鼻子按 nose 放大，下巴按 jaw，张嘴时下唇与下巴随下颌转
  let F = BASE.front.map(([x, y], i) => {
    let X = x, Y = y;
    if (i >= 5 && i <= 9) { const k = Math.sin((i - 5) / 4 * Math.PI) * .9 + .1; X = -.09 + (x + .09) * (1 + (nose - 1) * k * 1.6); if (fem) X += .012 * k; }
    if (i >= 15) { X = x * jaw; }
    if (fem && i >= 10 && i <= 15) X -= .008;
    return [X, Y];
  });
  let back = BASE.back.map(([x, y], i) => i < 4 ? [x * (fem ? .94 : jaw), y] : [x, y]);
  if (age > .4) { F = F.map(([x, y], i) => i >= 14 ? [x + .01 * age, y + .02 * age] : [x, y]); back = back.map(([x, y], i) => i < 3 ? [x, y + .025 * age] : [x, y]); }
  const jawPts = i => i >= 13;   // 下唇以下属下颌
  if (open) { F = F.map((q, i) => jawPts(i) ? rot(q, -open) : q); back = back.map((q, i) => i < 3 ? rot(q, -open * .9) : q); }
  const k = (T.s || 110) / 110, L = [], line = (pts, w, dark, key) => L.push({ line: pts.map(T), w: w * k, dark, key }), fill = (role, pts, key) => L.push({ fill: role, pts: pts.map(T), key });
  // 脖子
  fill('skin', [[.04, .02], [.02, .18], [.0, .37], [.44, .37], [.39, .12], [.33, -.2]], 'neck');
  // 脸（含张嘴的口腔）
  const face = F.concat(back);
  fill('skin', face, 'face');
  if (open) {
    const up = F[12], lo = F[13], cor = [.045, -.126], corL = rot([.045, -.122], -open * .55);
    fill('dark', [up, [up[0] + .03, up[1] + .004], cor, corL, [lo[0] + .03, lo[1] - .004], lo], 'mouth');
    if (expr !== 'cry') {
      fill('skin', [[up[0] + .008, up[1] + .002], [cor[0] - .01, cor[1] + .001], [cor[0] - .012, cor[1] + .011], [up[0] + .01, up[1] + .013]], 'teeth');
      fill('skin', [[lo[0] + .01, lo[1] - .002], [corL[0] - .012, corL[1] - .002], [corL[0] - .014, corL[1] - .012], [lo[0] + .012, lo[1] - .013]], 'teethB');
    }
    if (expr === 'roar') fill('red', [[lo[0] + .02, lo[1] - .014], [corL[0] - .02, corL[1] - .01], [corL[0] - .03, corL[1] - .03]], 'tongue');
  }
  // 轮廓线：前脸一笔（深），下颌一笔
  line(F.slice(0, 13), 1.2, .95, 'front');
  line(F.slice(13), 1.2, .95, 'chin');
  line(back.slice(0, 4), 1.1, .85, 'jaw'); line(back.slice(4), 1.1, .8, 'skull');
  if (expr === 'grit') line([[F[11][0] + .006, F[11][1] + .012], [.03, -.128], [.06, -.122]], 1, .9, 'mouth');
  else if (!open) line([[F[12][0] + .004, F[12][1] + .004], [.0, -.128], [.03, -.126]], 1, .9, 'mouth');
  // 眼：按表情
  let up = BASE.eyeUp, low = BASE.eyeLow, iris = [-.049, -.407, fem ? .024 : .02];
  if (expr === 'roar' || expr === 'laugh') { up = up.map(([x, y], i) => [x, y - (i > 0 && i < 3 ? .012 : .004)]); iris = [-.052, -.412, .017]; }
  if (expr === 'cry') { up = up.map(([x, y], i) => [x, y + .012 + (i === 0 ? .01 : 0)]); low = low.map(([x, y]) => [x, y - .002]); iris = [-.05, -.4, .016]; }
  if (expr === 'grit' || expr === 'frown') { up = up.map(([x, y], i) => [x, y + (i < 2 ? .008 : .002)]); }
  if (fem) { up = up.map(([x, y]) => [x - .006, y - .006]); low = low.map(([x, y]) => [x - .006, y + .002]); }
  if (expr === 'dead') { line([[-.085, -.425], [-.05, -.41], [-.015, -.408], [.014, -.411]], 1.3, 1, 'lid'); line([[-.06, -.4], [-.02, -.396]], .6, .4, 'lash'); }
  else { L.push({ eye: { up: up.map(T), low: low.map(T), iris: [...T(iris), iris[2] * (T.s || 110)], red: !!p.eyeRed } }); line(up, fem ? 1.5 : 1.3, 1, 'lid'); }
  if (fem) line([[up[0][0] - .004, up[0][1] - .004], [up[0][0] - .018, up[0][1] - .016]], .8, 1, 'lash');
  // 眉：怒 → 眉头压低；哭 → 眉头上提
  let br = BASE.brow;
  if (expr === 'roar' || expr === 'grit' || expr === 'frown') br = br.map(([x, y], i) => [x, y + (i === 0 ? .03 : i === 1 ? .014 : 0)]);
  if (expr === 'cry') br = br.map(([x, y], i) => [x, y - (i === 0 ? .03 : i === 1 ? .016 : 0)]);
  if (fem) br = br.map(([x, y]) => [x, y - .012]);
  line(br, fem ? 1.2 : 1.9, 1, 'brow');
  // 鼻翼、耳
  line([[F[8][0] + .03, F[8][1] - .01], [F[8][0] + .045, F[8][1] + .002], [F[9][0] + .02, F[9][1] + .004]], .8, .7, 'nostril');
  if (expr === 'grit' || expr === 'roar') line([[F[7][0] + .045, F[7][1] - .03], [F[7][0] + .06, F[7][1] - .002]], .7, .6, 'flare');
  fill('skin', BASE.ear, 'ear'); line(BASE.ear, .8, .7, 'ear');
  line([[.31, -.43], [.338, -.4], [.33, -.34]], .6, .5, 'earIn');
  // 年纪：皱纹
  if (age > .3) {
    const a = Math.min(1, age);
    line([[-.12, -.62], [-.06, -.63], [.0, -.62]], .7 * a, .5, 'wrinkle'); line([[-.11, -.57], [-.05, -.585], [.01, -.575]], .7 * a, .45, 'wrinkle');
    line([[-.06, -.24], [-.02, -.18], [.0, -.12]], .9 * a, .55, 'fold');
    line([[-.06, -.38], [-.02, -.372], [.02, -.38]], .6 * a, .45, 'bag');
    line([[.03, -.43], [.06, -.42]], .6 * a, .45, 'crow'); line([[.03, -.41], [.065, -.395]], .6 * a, .45, 'crow');
    if (a > .6) { line([[.06, .06], [.08, .14], [.1, .22]], .7 * a, .45, 'neckLine'); line([[.2, -.2], [.21, -.1], [.18, 0]], .7 * a, .45, 'cheekSag'); }
  }
  if (expr === 'cry') { line([[iris[0] - .01, -.39], [iris[0] - .02, -.33], [iris[0] - .005, -.26]], .9, .45, 'tear'); }
  if (expr === 'roar' || expr === 'grit') line([[-.01, -.5], [.0, -.47]], .8, .7, 'furrow');
  return L;
}
// 头部轮廓点（给发型、头饰对位用），归一化坐标
export const HEAD = { crown: [.245, -1], forehead: [-.13, -.72], backSkull: [.6, -.62], nape: [.42, -.2], ear: [.33, -.37], chin: [0, 0], neckF: [.05, .32], neckB: [.41, .32], temple: [.1, -.62] };

// 归一化 → 模型坐标：下巴放在 at，头高 H（像素），可镜像（面朝右）
export const placer = (at, H, flip = false) => { const f = p => [at[0] + (flip ? -p[0] : p[0]) * H, at[1] + p[1] * H]; f.s = H; return f; };

// 带旋转的放置：下巴在 at，头高 H，theta 弧度（0 = 直立面朝左）
export const rplacer = (at, H, theta = 0, flip = false) => { const c = Math.cos(theta), s = Math.sin(theta); const f = p => { const x = (flip ? -p[0] : p[0]) * H, y = p[1] * H; return [at[0] + x * c - y * s, at[1] + x * s + y * c]; }; f.s = H; return f; };
