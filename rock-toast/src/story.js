// 时间线：90 拍/分，一拍 0.667 秒，一小节 2.667 秒；镜头、旁白、标注、音效事件都从这里取
export const BPM = 90, BEAT = 60 / BPM, BAR = BEAT * 4;
const b = n => +(n * BEAT).toFixed(4);   // 第 n 拍（从 0 计）的时间

export const SHOTS = [
  ['hook', 0, 4], ['title', 4, 8], ['cut', 8, 12], ['milk', 12, 14], ['egg', 14, 16], ['cinnamon', 16, 18], ['whisk', 18, 20],
  ['soak', 20, 24], ['pan', 24, 26], ['sear', 26, 28], ['flip', 28, 30], ['crust', 30, 36], ['plate', 36, 40], ['cream', 40, 44],
  ['jam', 44, 48], ['syrup', 48, 52], ['fork', 52, 58], ['final', 58, 64],
].map(([n, a, z]) => ({ name: n, t0: b(a), t1: b(z) }));
export const DUR = b(64);
export function shotAt(t) { for (const s of SHOTS) if (t < s.t1) return s; return SHOTS[SHOTS.length - 1]; }
export const SHOT = Object.fromEntries(SHOTS.map(s => [s.name, s]));
export const beat = b;

// 旁白（文字即字幕；t 为开始时间，时长由配音实测回填 dur.json）
export const VO = [
  { id: 'v01', t: 2.9, text: '四英寸厚的法式吐司。' },
  { id: 'v02', t: 5.6, text: '整条布里欧修，一刀两段。' },
  { id: 'v03', t: 8.2, text: '一百毫升牛奶，两颗鸡蛋，', sub: '100 毫升牛奶，两颗鸡蛋，' },
  { id: 'v04', t: 10.8, text: '再加一勺肉桂粉。' },
  { id: 'v05', t: 13.6, text: '让每一面，都吸饱蛋液。' },
  { id: 'v06', t: 18.9, text: '不断翻面，直到每一面都焦糖金黄。' },
  { id: 'v07', t: 24.4, text: '灵魂，在最后三种酱。' },
  { id: 'v08', t: 26.95, text: '花生奶油酱。' },
  { id: 'v09', t: 29.6, text: '蓝莓果酱。' },
  { id: 'v10', t: 32.25, text: '还有枫糖浆。' },
  { id: 'v11', t: 35.7, text: '热量很高，满足感更高。' },
  { id: 'v12', t: 39.4, text: '这就是，巨石吐司。' },
];

// 配料标注（小字 + 细金线）：t0–t1 显示
// 调蛋液三样配料像菜单一样逐条加进清单，一起停到搅拌结束（短镜头也读得完）
export const LABELS = [
  { t0: b(12) + .25, t1: b(20) + .3, text: '牛奶', sub: '100 ml', list: 0 },
  { t0: b(14) + .25, t1: b(20) + .3, text: '鸡蛋', sub: '× 2', list: 1 },
  { t0: b(16) + .25, t1: b(20) + .3, text: '肉桂粉', sub: '1 勺', list: 2 },
  { t0: b(40) + .15, t1: b(44) + .3, text: '花生奶油酱', sub: 'PEANUT CREAM', side: 1 },
  { t0: b(44) + .3, t1: b(48) + .3, text: '蓝莓果酱', sub: 'BLUEBERRY', side: 1 },
  { t0: b(48) + .3, t1: b(52) - .05, text: '枫糖浆', sub: 'MAPLE', side: 1 },
];

// 菜名卡：扫光亮起的时段
export const TITLES = [{ t0: 2.7, t1: b(8) }, { t0: 39.5, t1: b(64) - .1 }];
