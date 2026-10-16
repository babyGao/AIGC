// 场景几何（各风格共用）：画面按 2.39:1 宽银幕构图，局部坐标 1920×804；各风格再把它放进自己的画框
// （木刻：纸边里的版面；皮影：幕布；水墨：裱绫之间；剪纸：上下遮幅）。
// 依据（docs/素材库.md）：北原草原；上游河面平静、越缓越浅，到最前端连脚面都盖不住；下游激流、浪；
// 河从大雪山福地冲出来，方源走在最上游，每走一步河就往前多流一步。
import { sample } from './models/curve.js';

export const FW = 1920, FH = 804;
// 三次贝塞尔曲线取 n 个点
export const bez = (a, b, c, d, n) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1), u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]; });

// 河：中心线 + 每点宽度 → 闭合多边形（两岸）与“到河头的距离”函数（0 = 河头，1 = 最下游）
export function riverPoly(center, widths) {
  const n = center.length, S = sample(center, false, 4), m = S.length, Lft = [], Rgt = [];
  const wAt = u => { const f = u * (n - 1), i = Math.min(n - 2, Math.floor(f)), t = f - i; return widths[i] * (1 - t) + widths[i + 1] * t; };
  for (let i = 0; i < m; i++) {
    const a = S[Math.max(0, i - 1)], b = S[Math.min(m - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const hw = wAt(i / (m - 1)) / 2;
    Lft.push([S[i][0] - dy * hw, S[i][1] + dx * hw]); Rgt.push([S[i][0] + dy * hw, S[i][1] - dx * hw]);
  }
  // 圆盘并集（急弯处偏移线会打折；用沿中心线的一串圆来表示河面就不会折）
  const discs = S.map((p, i) => [p[0], p[1], wAt(i / (m - 1)) / 2]).filter((_, i) => i % 2 === 0 || i === m - 1);
  // 岸线：直接取圆盘并集的外边界（每个圆上取点，去掉落在别的圆里的），按所在的一侧分成左右岸，沿河排序
  const banks = [[], []];
  discs.forEach(([cx, cy, r], i) => {
    const a = discs[Math.max(0, i - 1)], b = discs[Math.min(discs.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    for (let s2 = 0; s2 < 72; s2++) {
      const an = s2 / 72 * Math.PI * 2, q = [cx + Math.cos(an) * r, cy + Math.sin(an) * r];
      if (discs.some(([x, y, rr], j) => j !== i && Math.hypot(q[0] - x, q[1] - y) < rr - .5)) continue;
      const side = (tx * (q[1] - cy) - ty * (q[0] - cx)) > 0 ? 0 : 1;
      banks[side].push({ q, key: i + (tx * (q[0] - cx) + ty * (q[1] - cy)) / (2 * r + 1) });
    }
  });
  const sorted = banks.map(B => B.sort((u, v) => u.key - v.key).map(o => o.q));
  // 去掉排序后相邻点跳得太远的地方（分段）
  const split = pts => { const out = [[]]; pts.forEach((q, i) => { const p = pts[i - 1]; if (p && Math.hypot(q[0] - p[0], q[1] - p[1]) > 40) out.push([]); out[out.length - 1].push(q); }); return out.filter(s => s.length > 3); };
  const smooth = pts => pts.map((_, i) => { let x = 0, y = 0, n = 0; for (let j = Math.max(0, i - 10); j <= Math.min(pts.length - 1, i + 10); j++) { x += pts[j][0]; y += pts[j][1]; n++; } return [x / n, y / n]; });
  return { poly: Lft.concat(Rgt.reverse()), left: Lft, right: Rgt.slice().reverse(), axis: S, wAt, discs, banks: [...split(sorted[0]), ...split(sorted[1])].map(smooth) };
}
// 两条岸线 → 河面多边形（左岸、右岸都从河头往下游排）
export function riverBanks(right, left) {
  const cap = []; const h = [(right[0][0] + left[0][0]) / 2, (right[0][1] + left[0][1]) / 2], r = Math.hypot(right[0][0] - left[0][0], right[0][1] - left[0][1]) / 2;
  for (let a = Math.PI * .5; a <= Math.PI * 1.5; a += Math.PI / 8) cap.push([h[0] + Math.cos(a) * r * 1.6, h[1] - Math.sin(a) * r]);
  const poly = right.slice().reverse().concat(cap.reverse(), left);
  const smooth = pts => pts;
  return { poly, banks: [left, right], fill: poly };
}
// 把河面（圆盘并集）加进当前路径；P 是局部坐标 → 画面坐标，k 是缩放
export function riverPath(ctx, river, P, k = 1) { ctx.beginPath(); if (river.fill) { river.fill.forEach((q, i) => { const [X, Y] = P(q); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); return; } for (const [x, y, r] of river.discs) { const [X, Y] = P([x, y]); ctx.moveTo(X + r * k, Y); ctx.arc(X, Y, r * k, 0, Math.PI * 2); } }

// K1 · 开场超远景（高位俯拍，从方源身后看）：河从镜头前（下游，宽、乱）蜿蜒到画面中部收成一点，
// 那一点就是河头，方源站在那里；河头以外是空的草原，一直到地平线。两岸：左北原（雪胡一方），右毛里球（如小山），
// 天上中洲群仙。人在画里只有几十像素高（诺兰的 IMAX 尺度）。
export const K1 = {
  horizon: 214,
  // 两岸各一条平滑曲线（河从下游一路收窄到河头）；河头在方源脚下合成一个圆头
  river: riverBanks(bez([846, 375], [1260, 372], [1540, 520], [1620, 900], 60), bez([846, 387], [1110, 412], [1110, 590], [820, 900], 60)),
  fangyuan: { at: [846, 384], H: 64 },                 // 脚底中点、身高
  maoliqiu: { at: [1600, 432], H: 250, flip: false },  // 右岸，伏在地上，面朝河（朝左）
  beiyuan: [                                           // 左岸：北原一方
    { at: [380, 452], H: 92, o: { robe: 'robeD', hair: 'hairW', style: 'bun', fur: true, beard: true, sleeve: 'point' } }, // 雪胡老祖
    { at: [452, 446], H: 78, o: { robe: 'robe', hair: 'hairW', style: 'long' } },                                           // 白凝冰
    { at: [312, 448], H: 80, o: { robe: 'robeD', hair: 'hair', style: 'long', belt: 'gold' } },                             // 黑楼兰
    { at: [250, 444], H: 82, o: { robe: 'robeD', hair: 'hair', style: 'long' } },                                           // 影无邪
  ],
  zhongzhou: [                                         // 天上：中洲群仙（碧晨天、威灵仰等）悬在高空，踩着云
    { at: [1250, 128], H: 104, o: { robe: 'robe', hair: 'hair', style: 'crown', belt: 'blue', sleeve: 'out' } },
    { at: [1370, 120], H: 112, o: { robe: 'robe', hair: 'hair', style: 'crown', belt: 'blue', beard: true, sleeve: 'out' } },
    { at: [1140, 134], H: 88, o: { robe: 'robe', hair: 'hair', style: 'bun', belt: 'blue', sleeve: 'down' } },
  ],
  changsheng: [                                        // 毛里球身边：长生天两位（洪极子、玄极子）
    { at: [1405, 448], H: 66, o: { robe: 'robeD', hair: 'hair', style: 'bun', belt: 'gold' } },
    { at: [1450, 452], H: 64, o: { robe: 'robeD', hair: 'hair', style: 'bun' } },
  ],
};
