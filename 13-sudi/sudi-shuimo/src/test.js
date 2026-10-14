// 设定稿：?test=sheet 人物 · ?test=clawd 小兽
import { figure, POSE, walkPose } from './figure.js';
import { clawd } from './clawd.js';
import * as P from './props.js';
export function render(t, A, B, TMP, mode, OV) {
  const L = A.ink;
  OV.fillStyle = 'rgba(30,25,20,.75)'; OV.font = '300 22px SongLight';
  if (mode === 'sheet') {
    const him = { type: 'him', cloak: true }, her = { type: 'her', skirt: true }, boy = { type: 'boy' };
    const row = (y, items) => items.forEach(([P, K, lab, ex], i) => { const x = 140 + i * 205; figure(L, P, K, { x, y, s: 2.0 * (K.type === 'boy' ? .7 : K.type === 'her' ? .95 : 1.05), seed: 3 + i, t: 0, ...(ex || {}) }); OV.fillText(lab, x - 40, y + 34); });
    row(330, [[POSE.stand, him, '他 站'], [walkPose(.25), him, '他 走'], [walkPose(.1, true), him, '他 跑'], [POSE.palm, { ...him, palm: true }, '他 出掌'], [POSE.front, him, '他 正面'], [POSE.back, him, '他 背面'], [POSE.kneelHold, him, '他 跪抱'], [POSE.snap, him, '他 折箭'], [POSE.sitBack, him, '他 坐背']]);
    row(700, [[POSE.stand, her, '她 站'], [walkPose(.25), her, '她 走'], [POSE.sit, her, '她 坐'], [POSE.write, her, '她 写'], [POSE.front, { ...her, smile: true }, '她 正面'], [POSE.back, her, '她 背面'], [POSE.fall, her, '她 倒'], [POSE.wave, her, '她 招手'], [POSE.stand, { ...her, hat: true, cloak: true }, '乔装']]);
    row(1000, [[POSE.boySit, boy, '门童'], [POSE.stand, boy, '门童 站']]);
    const poses = [['n', 'down', 'stand'], ['blink', 'down', 'stand'], ['u', 'up', 'stand'], ['happy', 'wave', 'stand'], ['r', 'down', 'walkA'], ['wide', 'hold', 'stand'], ['d', 'down', 'sit']];
    poses.forEach(([e, a, l], i) => { clawd(A.ink, { x: 760 + i * 150, y: 990, s: 7, eyes: e, arms: a, legs: l, seed: 5 + i }); OV.fillText(e + '/' + a, 720 + i * 150, 1030); });
    return { bleed: 3, rim: .9 };
  }
  if (mode === 'big') {
    const him = { type: 'him', cloak: true }, her = { type: 'her', skirt: true };
    [[POSE.stand, him], [POSE.front, him], [POSE.back, him], [POSE.stand, her], [POSE.front, { ...her, smile: true }], [POSE.back, her]].forEach(([P, K], i) => figure(L, P, K, { x: 170 + i * 320, y: 1000, s: 9, seed: 3 + i, t: .4, wind: .3 }));
    return { bleed: 5, rim: 1 };
  }
  if (mode === 'props') {
    P.wash(A.cw, 0, 0, 1920, 380, .55, .2);
    P.moon(L, 260, 150, 70);
    P.starRiver(L, 1300, 700, 760, 0, 1, { a0: -2.4, a1: -1.0 });
    P.lantern(L, 600, 160, 1.4, { lit: 1 }); P.lantern(L, 760, 160, 1.4, { blood: .7 });
    P.gate(L, 300, 700, .9, { open: .3 });
    P.bridge(L, 1500, 1000, 520);
    P.blossomBranch(L, 650, 640, 1.1, { bloom: 1 });
    P.enso(L, 1100, 420, 150, 1);
    P.letter(L, 760, 760, 220, 300, { text: '珍重勿念', p: 1 });
    P.lock(L, 1050, 860, 2.2, { p: 1 });
    P.arrow(L, 1200, 700, 200, -.2, { broken: .5 });
    P.army(L, 30, 500, 1060, { s: .6 });
    P.sheep(L, 1200, 1030, 1.4, 1, 3);
    P.grave(L, 1750, 600, 1);
    P.dragon(L, [[1350, 300], [1500, 250], [1650, 320], [1800, 260], [1900, 200]], 1, { w: 70 });
    return { bleed: 4, rim: 1 };
  }
  if (mode === 'clawd') {
    clawd(A.ink, { x: 960, y: 800, s: 40, eyes: 'n', arms: 'down', legs: 'stand' });
    clawd(A.ink, { x: 1600, y: 800, s: 20, eyes: 'happy', arms: 'wave', legs: 'stand', t: .3 });
    clawd(A.ink, { x: 350, y: 800, s: 12, eyes: 'u', arms: 'up', legs: 'stand' });
    return { bleed: 4 };
  }
}
