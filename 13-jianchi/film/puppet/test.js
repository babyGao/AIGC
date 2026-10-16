// 角色设定表：?lab=pp&test=model（照 lemo-opuscar 皮影 demo 的 test.js modelSheet：同样的分格、灯光图、标注）
import { build, drawFangyuan, J, LEGLEN, C as FC } from './fangyuan.js';
import { drawRods } from './rig.js';
import { drawPiece, DYE } from './carve.js';
import { drawCorpse, corpseAt, build as buildM } from './mahongyun.js';
import { mul, T as Tm, R as Rm, ap as apM } from './rig.js';
// 夹人：尸体的夹持点 = 近侧前臂上、靠肘的一段；身子跟前臂一起横着（略低头）

const cam = (k, x, y) => [k, 0, 0, k, x, y];
export const POSES = {
  rest: {},
  walk: { rot: .03, head: .02, legF: -.3, legB: .24, armF: [40, 128], armB: [-30, 132], hair: [.12, .06], tails: .14 },
  up: { rot: -.03, head: -.3, legF: -.08, legB: .08, armF: [18, 136], armB: [-12, 140], hair: [.1, .02] },
  carry: { rot: .02, head: .04, legF: -.22, legB: .18, armF: [74, 76], bendF: 1, handF: 'open', armB: [-14, 138], hair: [.08, .04], tails: .1 },
};
export function modelSheet(tr, fr, lm) {
  const W = 1920, H = 1080;
  tr.setTransform(1, 0, 0, 1, 0, 0); tr.fillStyle = '#fff'; tr.fillRect(0, 0, W, H);
  fr.setTransform(1, 0, 0, 1, 0, 0); fr.clearRect(0, 0, W, H);
  lm.setTransform(1, 0, 0, 1, 0, 0); lm.fillStyle = '#000'; lm.fillRect(0, 0, W, H);
  const panels = { A: [0, 64, 600, 640], B: [600, 64, 1240, 640], C: [1240, 64, 1920, 640], D: [0, 640, 1240, 1080], E: [1240, 640, 1920, 1080] };
  const lampAt = (x, y, r, I) => { const gr = lm.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${I / 6})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); lm.fillStyle = gr; lm.fillRect(x - r, y - r, r * 2, r * 2); };
  for (const [x0, y0, x1, y1] of Object.values(panels)) {
    lm.save(); lm.beginPath(); lm.rect(x0, y0, x1 - x0, y1 - y0); lm.clip();
    lm.fillStyle = `rgb(${.72 / 6 * 255},${.72 / 6 * 255},${.72 / 6 * 255})`; lm.fillRect(x0, y0, x1 - x0, y1 - y0);
    lm.globalCompositeOperation = 'lighter'; lampAt((x0 + x1) / 2, (y0 + y1) * .45, Math.max(x1 - x0, y1 - y0) * .8, .55);
    lm.restore();
  }
  const clip = (g, [x0, y0, x1, y1], fn) => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); fn(); g.restore(); };
  const label = (x, y, s, size = 20, col = '#2b170d', align = 'left') => { fr.save(); fr.setTransform(1, 0, 0, 1, 0, 0); fr.font = `${size}px WK`; fr.fillStyle = col; fr.textAlign = align; fr.textBaseline = 'alphabetic'; fr.fillText(s, x, y); fr.restore(); };
  const leader = (x0, y0, x1, y1) => { fr.save(); fr.setTransform(1, 0, 0, 1, 0, 0); fr.strokeStyle = 'rgba(60,30,15,.75)'; fr.lineWidth = 1.2; fr.setLineDash([4, 3]); fr.beginPath(); fr.moveTo(x0, y0); fr.lineTo(x1, y1); fr.stroke(); fr.setLineDash([]); fr.beginPath(); fr.arc(x1, y1, 3, 0, 7); fr.fillStyle = 'rgba(60,30,15,.85)'; fr.fill(); fr.restore(); };

  // —— A：装配完成 + 操纵杆 ——
  let rA;
  clip(tr, panels.A, () => {
    const k = .8, C = cam(k, 300, 196 + 138 * k);
    rA = drawFangyuan(tr, C, POSES.rest);
    drawRods(tr, rA.rods, [[rA.rods[0][0] - 70, 700], [rA.rods[1][0] - 30, 700], [rA.rods[2][0] + 40, 700]], 2.2, .7);
  });
  { const r = rA, M = r.M; const hp = [M.Mhead[4] + 14, M.Mhead[5] - 52];
    leader(470, 160, hp[0], hp[1]); label(478, 156, '空脸（脸心镂空）', 18);
    leader(470, 214, r.rods[0][0] + 6, r.rods[0][1]); label(478, 210, '颈杆', 18);
    leader(470, 590, r.rods[2][0] + 30, 630); label(478, 586, '手杆', 18);
    leader(92, 300, r.rivets[4][0], r.rivets[4][1]); label(14, 290, '长发两片', 18); label(14, 312, '（铆在后脑，会荡）', 15);
    leader(92, 470, M.MfB[4] - 30, M.MfB[5] + 60); label(14, 460, '大袖', 18); label(14, 482, '（袖兜垂在下方）', 15);
    leader(470, 420, r.rivets[10][0], r.rivets[10][1]); label(478, 416, '腰带垂尾', 18); }

  // —— B：分件图 ——
  const P = build();
  const place = [['head', 700, 210, 1, '头（空脸、刘海、发）'], ['hairU', 790, 120, 1, '长发 上'], ['hairL', 850, 130, 1, '长发 下'], ['chest', 960, 250, 1, '身（交领、锦地、腰带）'],
    ['tails', 1050, 120, 1, '带尾'], ['skirt', 1150, 300, .8, '下摆（前后两片）'],
    ['ua', 670, 400, 1, '上臂'], ['fa', 760, 400, 1, '大袖'], ['handHang', 830, 430, 1.4, '垂手'], ['handOpen', 860, 490, 1.4, '托手'], ['leg', 930, 250, 1, '鞋']];
  clip(tr, panels.B, () => { tr.globalCompositeOperation = 'multiply'; for (const [n, x, y, s] of place) { tr.setTransform(s, 0, 0, s, x, y); drawPiece(tr, P[n]); } tr.globalCompositeOperation = 'source-over'; });
  for (const [n, x, y, s, lab] of place) if (lab) label(x, y + ({ head: 40, hairU: 160, hairL: 160, chest: 34, tails: 165, skirt: 250, ua: 90, fa: 115, handHang: 52, handOpen: 50, leg: 320 }[n] || 60), lab, 15, '#2b170d', 'center');

  // —— C：头部特写 ——
  clip(tr, panels.C, () => { tr.globalCompositeOperation = 'multiply'; tr.setTransform(4.2, 0, 0, 4.2, 1600, 560); drawPiece(tr, P.head); tr.globalCompositeOperation = 'source-over'; });

  // —— D：关键姿势 ——
  const poses = [['站（面无表情）', POSES.rest], ['走（一步再一步）', POSES.walk], ['仰头（天意）', POSES.up], ['夹人走（托手）', POSES.carry]];
  clip(tr, panels.D, () => {
    poses.forEach(([lab, p], i) => { const k = .58, x = 150 + i * 310, y = 1050 - LEGLEN * k; const r = drawFangyuan(tr, cam(k, x, y), p, i === 3 ? { between: ({ MfF }) => drawCorpse(tr, corpseAt(apM(MfF, 0, 34), k)) } : {}); drawRods(tr, r.rods, r.rods.map((q, j) => [q[0] - 40 + j * 30, 1100]), 1.8, .55); });
  });
  poses.forEach(([lab], i) => label(150 + i * 310, 1068, lab, 18, '#2b170d', 'center'));

  // —— E：色 ——
  const sw = [['本色皮（白衣）', FC.robe], ['靛青（衣缘）', DYE.teal], ['玉绿', DYE.jade], ['赭', DYE.yellow], ['肤', DYE.skin], ['墨（发、带、鞋）', DYE.ink]];
  clip(tr, panels.E, () => { tr.globalCompositeOperation = 'multiply'; sw.forEach(([n, c], i) => { tr.fillStyle = c; tr.fillRect(1290 + (i % 3) * 200, 720 + Math.floor(i / 3) * 140, 150, 80); }); tr.globalCompositeOperation = 'source-over'; });
  sw.forEach(([n], i) => label(1365 + (i % 3) * 200, 828 + Math.floor(i / 3) * 140, n, 17, '#2b170d', 'center'));
  label(1290, 704, '色（透光看）：河的色组——靛青、玉绿、一点赭；白衣用本色驴皮', 17);

  // 表头 + 分隔
  fr.save(); fr.setTransform(1, 0, 0, 1, 0, 0); fr.fillStyle = '#140c08'; fr.fillRect(0, 0, W, 64);
  for (const [x0, y0, x1] of Object.values(panels)) { fr.fillStyle = 'rgba(20,12,8,.82)'; fr.fillRect(x0, y0, x1 - x0, 34); }
  fr.strokeStyle = '#140c08'; fr.lineWidth = 6; for (const [x0, y0, x1, y1] of Object.values(panels)) fr.strokeRect(x0, y0, x1 - x0, y1 - y0);
  fr.font = '34px WK'; fr.fillStyle = '#f0dcb2'; fr.textBaseline = 'middle'; fr.fillText('方源 — 皮影设定表 v1', 22, 34);
  fr.font = '20px WK'; fr.fillStyle = '#c9a877'; fr.textAlign = 'right'; fr.fillText('逆流河 · 皮影戏 · 染色驴皮，油灯背光', W - 22, 35);
  fr.restore();
  label(18, 90, '装配 · 上布', 20, '#e9d2a4'); label(618, 90, '分件 · 11 片驴皮', 20, '#e9d2a4'); label(1258, 90, '头 · 空脸、长刘海、垂眼', 20, '#e9d2a4');
  label(18, 666, '关键姿势 · 皮影的脸永远不变，神情靠头的角度和身子的线', 20, '#e9d2a4'); label(1258, 666, '色', 20, '#e9d2a4');
  return { useMap: true, lcol: [1, .8, .52], expo: 1.7, bloom: .2, vign: 0, cloth: 1, sat: 1.12, contrast: .18 };
}
// 头部对照：?lab=pp&test=head —— 左：皮影头（放大），右：参考图侧脸（镜像成朝右，同样大小）
let REF = null;
export async function loadRef() { if (REF) return REF; REF = new Image(); REF.src = './lab/ref_side.png'; await REF.decode(); return REF; }
export function headSheet(tr, fr) {
  const P = build(), W = 1920, H = 1080;
  tr.setTransform(1, 0, 0, 1, 0, 0); tr.fillStyle = '#fff'; tr.fillRect(0, 0, W, H);
  fr.setTransform(1, 0, 0, 1, 0, 0); fr.clearRect(0, 0, W, H);
  tr.globalCompositeOperation = 'multiply'; tr.setTransform(6.4, 0, 0, 6.4, 560, 820); drawPiece(tr, P.head); tr.globalCompositeOperation = 'source-over';
  // 参考图：头的局部坐标 = (436-X)*.6*1.22, (Y-240)*.6*1.22 → 同样 6.4 倍、同一个颈根位置
  if (REF) { const k = .6 * 1.22 * 6.4; fr.save(); fr.setTransform(-k, 0, 0, k, 1420 + 436 * k, 820 - 240 * k); fr.drawImage(REF, 370, 100); fr.restore(); }
  fr.save(); fr.font = '30px WK'; fr.fillStyle = '#3a2210'; fr.fillText('皮影头（空脸）', 380, 70); fr.fillText('参考图侧脸（镜像）', 1240, 70); fr.restore();
  return { lamps: [[700, 400, 1, .6], [1500, 400, 1, .6]], expo: 1.6, amb: .4, sigB: 900, sigC: 200, vign: .2, bloom: .1 };
}
// 风格帧：?lab=pp&test=frame&f=walk —— 同 lemo 的 styleFrame：灯、地、人、杆、字幕牌
import { drawLand, groundY } from './scenery.js';
import { drawSub } from './hud.js';
export function styleFrame(tr, fr, f, t = .3) {
  const W = 1920, H = 1080, C = [1, 0, 0, 1, 0, 0];
  tr.setTransform(1, 0, 0, 1, 0, 0); tr.fillStyle = '#fff'; tr.fillRect(0, 0, W, H);
  fr.setTransform(1, 0, 0, 1, 0, 0); fr.clearRect(0, 0, W, H);
  const hx = 1240;
  drawLand(tr, C, { head: hx + 40, rough: 1, t, flow: [[660, -60, 1.25, 0], [300, -90, 1.4, 2]] });
  const k = .95, fx = hx, wy = groundY(fx) - LEGLEN * k + 6;
  const r = drawFangyuan(tr, cam(k, fx, wy), POSES.carry, { between: ({ MfF }) => drawCorpse(tr, corpseAt(apM(MfF, 0, 34), k)) });
  drawRods(tr, r.rods, r.rods.map((q, j) => [q[0] - 120 + j * 50, 1180]), 2.2, .78);
  drawSub(fr, '逆流河是没有尽头的', '');
  return { lamps: [[1560, 300, 1, .9]], expo: 1.75, amb: .3, sigB: 700, sigC: 120, bloom: .3, vign: .5, sat: 1.1, contrast: .15 };
}
