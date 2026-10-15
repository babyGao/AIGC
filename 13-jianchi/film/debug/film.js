// 几何预览：所有角色平涂（按 role 上色），检查比例与轮廓
import * as K from '../shared/cast.js';
import { path } from '../shared/geo.js';
const COL = { dark: '#1a1a1a', mid: '#6d6d6d', skin: '#e9d9bd', white: '#ffffff', feat: '#000', fold: '#444', accent: '#7b3fa0', tooth: '#fffbe8', hole: '#3a0606' };
function drawParts(g, parts, x, y, s, flip = 1) {
  g.save(); g.translate(x, y); g.scale(s * flip, s);
  for (const p of parts) {
    if (p.P) { g.beginPath(); path(g, p.P); g.fillStyle = COL[p.role] || '#f0f'; g.fill(); if (p.role === 'white' || p.role === 'skin') { g.lineWidth = 1.5 / s; g.strokeStyle = '#555'; g.stroke(); } }
    if (p.L) { g.beginPath(); path(g, p.L, false); g.strokeStyle = COL[p.role] || '#000'; g.lineWidth = p.w; g.lineCap = 'round'; g.stroke(); }
  }
  g.restore();
}
export function render(cv, t, q) {
  const g = cv.getContext('2d'), page = +(q.get('page') || 0);
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#c9c2b0'; g.fillRect(0, 0, 1920, 1080);
  g.font = '28px WK'; g.fillStyle = '#000';
  if (page === 0) {
    drawParts(g, K.fyWalk({ carry: 'corpse' }), 250, 1000, .8); g.fillText('walk corpse', 120, 60);
    drawParts(g, K.fyWalk({ carry: 'two' }), 700, 1000, .8); g.fillText('walk two', 600, 60);
    drawParts(g, K.fyWalk({ carry: 'corpse', look: 1 }), 1150, 1000, .8); g.fillText('look up', 1050, 60);
    drawParts(g, K.fyWalk({}), 1450, 1000, .8);
    drawParts(g, K.fyFront({}), 1700, 1000, .8);
  } else if (page === 1) {
    const fs = [{ hair: 'fy' }, { hair: 'snowtop', beard: 'snow', mouth: 'roar', brow: -1, eye: 1, red: 1, age: .8, veins: 1, thickBrow: 1, wide: 1.1 }, { hair: 'silver', mouth: 'grin', eye: 1, brow: -.3, tinyPupil: 1 }, { hair: 'pony', mouth: 'roar', brow: -1, eye: .9 }, { hair: 'old', mouth: 'cry', brow: 1, eye: .3, tears: 1, age: 1 }, { hair: 'fy', crown: 'official', mouth: 'grit', brow: -.8, eye: .8, sweat: 1 }, { hair: 'young', mouth: 'cry', brow: 1, eye: .4, tears: 1 }];
    fs.forEach((f, i) => drawParts(g, K.faceFront(f), 140 + (i % 4) * 470, 290 + Math.floor(i / 4) * 520, .36));
  } else if (page === 2) {
    const fs = [{ hair: 'fy' }, { hair: 'snowtop', beard: 'snow', mouth: 'roar', brow: -1, eye: 1, red: 1, age: .8 }, { hair: 'silver', mouth: 'grin', eye: 1 }, { hair: 'pony', mouth: 'roar', brow: -1 }, { hair: 'old', mouth: 'cry', brow: 1, eye: .3, tears: 1, age: 1 }, { hair: 'fy', crown: 'official', mouth: 'grit', brow: -.8 }, { hair: 'young', mouth: 'cry', tears: 1, brow: 1 }];
    fs.forEach((f, i) => drawParts(g, K.faceSide(f), 200 + (i % 4) * 470, 290 + Math.floor(i / 4) * 520, .36));
  } else if (page === 3) {
    drawParts(g, K.maoSide({ lie: 1 }), 320, 480, .25); drawParts(g, K.maoSide({ bristle: 1, mouth: 1, tail: 1 }), 320, 1000, .25);
    drawParts(g, K.maoFace({}), 1300, 400, .28);
    drawParts(g, K.xuehuSide({}), 1200, 1040, .4); drawParts(g, K.immortalSide({}), 1500, 1040, .4); drawParts(g, K.zhaoRise(), 1700, 1040, .4);
    drawParts(g, K.grave(), 1000, 1040, .4); drawParts(g, K.youngFyKneel(), 1050, 1040, .4);
    drawParts(g, K.fyFront({ back: true }), 1820, 1040, .4);
  }
}
