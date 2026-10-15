// 60s 间谍片头：人物是一整张剪纸剪影（spy-titles STYLE.md）。四色纸：墨黑、骨白、河青、警示红。
// 头发、腰带、鞋 = 墨黑纸；白衣、皮肤 = 骨白纸；所有纸片在剪影图层里融成一个外形，只在袖、腰处留细缝。
// 近景只给眉和眼缝，不画其它五官。
import * as P from './paper.js';

export const PAL = { ink: '#191b20', bone: '#ece6d6', teal: '#1f6f78', red: '#d8432a', boneD: '#cfc6b2', tealD: '#17545b' };
const COL = { hair: 'ink', ink: 'ink', robe: 'bone', robeIn: 'boneD', collar: 'bone', skin: 'bone' };

export function spyFigure(ops, o = {}) {
  const key = o.key || 'f', closeup = !!o.closeup, sc = o.scale || 1;
  P.silhouette(() => {
    ops.forEach((op, i) => {
      const g = P.g; g.save();
      if (op.clipY != null) { g.beginPath(); g.rect(-1e4, -1e4, 3e4, 1e4 + op.clipY); g.clip(); }
      if (op.poly && COL[op.role]) {
        const amp = Math.max(.8, Math.min(2.2, Math.sqrt(op.poly.length) * .12));
        P.piece(P.roughC(`${key}:${i}`, () => op.poly, 7 + i, amp, 9), PAL[COL[op.role]]);
      } else if (op.role === 'line') {
        if (closeup && /^(brow|lid)/.test(op.key)) {             // 眉、眼缝：墨黑纸条
          const n = op.pts.length, w = op.w * 1.3;
          const L = op.pts.map((p, k) => { const a = op.pts[Math.max(0, k - 1)], b = op.pts[Math.min(n - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1, u = k / (n - 1), hw = w / 2 * Math.min(1, u / .2, (1 - u) / .3) ** .5 + .4; return [p[0] - dy / m * hw, p[1] + dx / m * hw, p[0] + dy / m * hw, p[1] - dx / m * hw]; });
          P.piece(L.map(q => [q[0], q[1]]).concat(L.map(q => [q[2], q[3]]).reverse()), PAL.ink);
        } else if (/^(sleeveIn|slv[FB]|lapel$)/.test(op.key) || (closeup && /^(jaw|chin|lapel)/.test(op.key))) {  // 袖与身之间的切缝
          g.save(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = Math.max(1.6, 2.2 * sc); g.lineCap = 'round'; g.beginPath();
          op.pts.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.restore();
        } else if (op.key === 'tail') {
          const n = op.pts.length; const L = op.pts.map((p, k) => { const a = op.pts[Math.max(0, k - 1)], b = op.pts[Math.min(n - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1, hw = op.w / 2 * (1 - k / n * .5); return [p[0] - dy / m * hw, p[1] + dx / m * hw, p[0] + dy / m * hw, p[1] - dx / m * hw]; });
          P.piece(L.map(q => [q[0], q[1]]).concat(L.map(q => [q[2], q[3]]).reverse()), PAL.ink);
        }
      } else if (op.role === 'eye' && closeup) {
        P.piece(P.roughC(`${key}:e${i}`, () => op.open, 3 + i, .5, 4), PAL.ink);
      }
      g.restore();
    });
  }, { outline: o.outline ?? 2.4 });
}
