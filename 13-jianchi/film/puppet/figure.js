// 皮影：把画面指令刻成驴皮片，画到透射率画布上（shadow-puppet STYLE.md）。
// 白衣 = 浅色皮，大面积镂空云纹只留细皮筋；头发 = 墨染皮，刻细缝让灯光透出发丝；
// 正面人物开脸：脸部镂空，只留一圈细皮当轮廓，五官是墨线；关节打铆钉。
import * as K from './carve.js';

const DY = { robe: '#efe2c0', robeIn: '#d7c193', collar: '#e9d7a9', skin: '#f0d9a8', hair: '#1b130d', ink: '#1b130d', shade: '#c9a571' };
const path = P => q => { q.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) q.lineTo(P[i][0], P[i][1]); q.closePath(); };
const open = P => q => { q.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) q.lineTo(P[i][0], P[i][1]); };
let LAY = null;
function layer() { if (!LAY) LAY = K.canvas(1920, 1080); const [c, g] = LAY; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, 1920, 1080); g.lineJoin = 'round'; g.lineCap = 'round'; return LAY; }
function bbox(P) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; }
// 内缩一圈（留皮边）：用描边擦掉边带以外再镂空的办法——先在 clip 里镂空纹样，再把外沿一圈皮补回来
function rim(g, P, w, col) { g.save(); g.beginPath(); path(P)(g); g.clip(); g.strokeStyle = col; g.lineWidth = w * 2; g.beginPath(); path(P)(g); g.stroke(); g.restore(); }

export function puppetFigure(tr, ops, o = {}) {
  const sc = o.scale || 1, seed = o.seed ?? 3, rodTo = o.rod;
  ops.forEach((op, i) => {
    const [c, g] = layer();
    if (op.clipY != null) { g.save(); g.beginPath(); g.rect(-1e4, -1e4, 3e4, 1e4 + op.clipY); g.clip(); }
    let used = true;
    switch (op.role) {
      case 'robe': case 'robeIn': case 'collar': {
        const P = op.poly, [x0, y0, x1, y1] = bbox(P), col = DY[op.role];
        K.fill(g, col, path(P));
        if (op.role === 'robe') {
          // 镂空：成排云纹 + 细缝，满面透光，只留皮筋
          K.within(g, path(P), () => {
            const r = Math.max(7, 13 * sc);
            for (let y = y0 + r * 1.6, row = 0; y < y1; y += r * 2.1, row++)
              for (let x = x0 + (row % 2) * r * 1.3; x < x1; x += r * 2.6) K.cloud(g, x, y, r, 0, Math.max(1, 1.5 * sc), row % 2 ? 1 : -1);
          });
          rim(g, P, Math.max(2.5, 5 * sc), col);
          // 靛青镶边：沿衣片下沿一条染色皮
          g.save(); g.beginPath(); path(P)(g); g.clip(); g.globalCompositeOperation = 'source-atop'; g.strokeStyle = '#2b4f86'; g.lineWidth = Math.max(5, 11 * sc); g.beginPath(); path(P)(g); g.stroke(); g.restore();
        }
        if (op.role === 'collar') { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#2b4f86'; g.fillRect(-1e4, -1e4, 3e4, 3e4); g.restore(); }
        K.ink(g, Math.max(1.4, 2 * sc), path(P));
        break;
      }
      case 'skin': {
        const P = op.poly; K.fill(g, DY.skin, path(P));
        if (op.part === 'face') {   // 开脸：脸心镂空，只留轮廓细皮
          K.cut(g, path(P)); rim(g, P, Math.max(2.4, 4.2 * sc), DY.skin);
        }
        K.ink(g, Math.max(1.3, 1.9 * sc), path(P));
        break;
      }
      case 'hair': case 'ink': {
        const P = op.poly; K.fill(g, DY[op.role], path(P));
        if (op.role === 'ink') K.within(g, path(P), () => { const [x0, y0, x1, y1] = bbox(P); K.meander(g, x0 + 4, (y0 + y1) / 2, x1 - 4, Math.max(3, 5 * sc), 1.2); });
        break;
      }
      case 'strand': {   // 发丝缝：灯光从发间透出
        const [cc, gg] = LAY; gg.save(); gg.globalCompositeOperation = 'destination-out';
        K.cutTaper(gg, op.pts, Math.max(1, 1.6 * sc)); gg.restore(); used = false;
        // 直接在透射率画布上提亮：把这道缝“刻”在前一层头发上——用 screen 把白线叠上
        tr.save(); tr.globalCompositeOperation = 'lighter'; tr.strokeStyle = 'rgba(255,240,210,.55)'; tr.lineWidth = Math.max(.8, 1.2 * sc); tr.beginPath(); open(op.pts)(tr); tr.stroke(); tr.restore();
        break;
      }
      case 'eye': {
        const [cc, gg] = LAY; gg.fillStyle = DY.ink; gg.beginPath(); path(op.open)(gg); gg.fill();
        gg.save(); gg.globalCompositeOperation = 'destination-out'; gg.beginPath(); path(op.open)(gg); gg.lineWidth = 0; gg.fill(); gg.restore();
        gg.fillStyle = DY.ink; gg.beginPath(); gg.arc(op.iris[0], op.iris[1], op.iris[2] * .9, 0, 7); gg.fill();
        K.ink(gg, Math.max(1, 1.2 * sc), path(op.open));
        break;
      }
      case 'line': {
        const face = /^(brow|lid|mouth|noseTip|nose|jaw|chin|lip|tail)/.test(op.key);
        if (face || op.dark > .7) K.ink(g, Math.max(1.2, op.w * (op.key === 'tail' ? 1 : 1.3)), open(op.pts));
        else { K.cutLine(g, Math.max(1, op.w * 1.2), open(op.pts)); used = false; }   // 衣褶：刻缝
        break;
      }
      case 'shade': used = false; break;
      default: used = false;
    }
    if (op.clipY != null) g.restore();
    if (op.role !== 'strand' && op.role !== 'shade' && op.role !== 'line' || (op.role === 'line' && used)) {
      K.hideTexture(c, g, seed + i);
      tr.save(); tr.globalCompositeOperation = 'multiply'; tr.drawImage(c, 0, 0); tr.restore();
    } else if (op.role === 'line' && !used) {
      // 刻缝：在透射率画布上直接提亮
      tr.save(); tr.globalCompositeOperation = 'lighter'; tr.strokeStyle = 'rgba(255,236,200,.45)'; tr.lineWidth = Math.max(1, op.w * 1.1); tr.lineCap = 'round'; tr.beginPath(); open(op.pts)(tr); tr.stroke(); tr.restore();
    }
  });
  // 铆钉与操纵杆
  for (const [x, y] of o.rivets || []) K.rivet(tr, x, y, Math.max(2.4, 3.6 * sc));
  if (rodTo) for (const [x0, y0, x1, y1] of rodTo) { tr.save(); tr.globalCompositeOperation = 'multiply'; tr.strokeStyle = 'rgba(60,40,25,.55)'; tr.lineWidth = 2.2; tr.beginPath(); tr.moveTo(x0, y0); tr.lineTo(x1, y1); tr.stroke(); tr.restore(); }
}
