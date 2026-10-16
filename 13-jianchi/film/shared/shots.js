// 关键镜头的语义描述（局部坐标 1920×804，宽银幕）。每个镜头 = 按画的顺序排好的元素：
//   { t:'bg', tone, accent }         底：dark / light；accent = 情绪色（red 暴怒），各风格自选用不用（间谍片头拿来当底色）
//   { t:'focus', polys }             集中线（尖楔多边形）
//   { t:'speed', polys }             速度线
//   { t:'rings', lines, w }          音浪（锯齿弧折线）
//   { t:'debris', items }            碎屑 { poly, trail }
//   { t:'fig', ops, key, s }         人物（画面指令，已在局部坐标）
//   { t:'sfx', text, x, y, size, rot, font }   拟声字（巨大，斜穿画格）
//   { t:'cap', who, text }           字幕（各风格按自己的规矩放；who 为空 = 旁白）
//   { t:'sky', hz } / { t:'water', hz, lines, ripples, reflect:[x,w] }   远景的天和水面（平静：横线 + 涟漪 + 光柱倒影）
//   { t:'beam', poly, streaks, color }   光柱（color:'blue' = 爱情仙蛊的湛蓝，木刻唯一的色版、水墨唯一的花青）
//   { t:'splash', cols, drops }      水花皇冠
//   { t:'cloud', at, w }             托着远处群仙的云头
//   { t:'ground', hz } / { t:'river', river }   草原（地平线 hz 以下）/ 逆流河（riverBanks 的结果；河头平静，往下游起浪）
//   { t:'eye', ...FX.eye() }          “天意”的巨眼（天上）
// 各风格的 shots.js 只管怎么画每一类元素。
import * as XH from './models/xuehu.js';
import * as MLQ from './models/maoliqiu.js';
import * as CARRY from './models/carry.js';
import { standing, sideStanding } from './models/crowd.js';
import { flattenLayers } from './models/flatten.js';
import { placer, rplacer } from './models/profile.js';
import { flatten, mkXf } from './models/flatten.js';
import * as FX from './fx.js';
import { riverBanks, bez } from './scene.js';

const place = (M, lib, { from, at, s, rot = 0, flip = false }) => flatten(M, lib, mkXf({ s, from, at, rot, flip }));

// K2 · 0:12 雪胡老祖仰天咆哮（特写、仰拍、集中线、“吼”）
// 原文第264节：“该死！柳贯一，你竟然杀死了他，我要把你抽筋扒皮，让你不得好死啊！！”雪胡老祖出离了愤怒，仰天咆哮，双目赤红。
export function K2() {
  const s = .78, mouth = [1080, 470];
  const ops = place(XH.XH_ROAR, XH, { from: [640, 530], at: mouth, s, rot: -.09 });
  return [
    { t: 'bg', tone: 'dark' },
    { t: 'focus', polys: FX.focusLines(mouth[0], mouth[1] - 40, 430, 1500, 150, 21, 30) },
    { t: 'rings', lines: FX.soundRings(mouth[0] - 20, mouth[1] - 80, -Math.PI / 2 - .2, 2.3, [330, 400, 470], 4, 18), w: 8 },
    { t: 'debris', items: FX.debris(mouth[0], mouth[1] - 120, -Math.PI / 2, 3.4, 46, 700, 5, 20) },
    { t: 'fig', ops, key: 'k2xh', s },
    { t: 'sfx', text: '吼', x: 120, y: 650, size: 560, rot: -.16 },
    { t: 'sfx', text: '！！', x: 660, y: 560, size: 170, rot: -.16 },
    { t: 'cap', who: '雪胡老祖', text: '我要把你抽筋扒皮，让你不得好死啊！！' },
  ];
}

// K3 · 0:31 毛里球：“你把他夹死了！！！”（正脸、炸毛、獠牙、“嗷”）
// 原文第264节：“小臭虫，你居然夹死了马鸿运，你把他夹死了！！！”毛里球爆发出比雪胡老祖还要高的音量，它满脸狰狞，露出尖锐的獠牙。
export function K3() {
  const s = .66, mouth = [900, 520];
  const ops = place(MLQ.MLQ_ROAR, MLQ, { from: [840, 760], at: mouth, s, rot: .05 });
  return [
    { t: 'bg', tone: 'dark', accent: 'red' },
    { t: 'speed', polys: FX.speedLines([-200, -100, 2100, 900], .12, 70, 31, 10) },
    { t: 'focus', polys: FX.focusLines(mouth[0], mouth[1], 520, 1600, 170, 33, 34) },
    { t: 'rings', lines: FX.soundRings(mouth[0], mouth[1] - 40, -Math.PI / 2, 2.8, [400, 470, 540], 6, 20), w: 9 },
    { t: 'debris', items: FX.debris(mouth[0], mouth[1], Math.PI * 1.1, 4.2, 40, 900, 7, 24) },
    { t: 'fig', ops, key: 'k3mlq', s },
    { t: 'sfx', text: '嗷', x: 1340, y: 700, size: 540, rot: .14 },
    { t: 'sfx', text: '！！！', x: 1330, y: 230, size: 170, rot: .12 },
    { t: 'cap', who: '毛里球', text: '你把他夹死了！！！' },
  ];
}

// K4 · 0:53 九转爱情仙蛊（全景、仰拍）
// 原文第264节：一道湛蓝的光辉，从赵怜云的身上升腾起来。九转爱情仙蛊！……湛蓝的光辉带着赵怜云一飞冲天，居然直接逃脱了逆流河。
// 然后主动投到了碧晨天、威灵仰的身边……而马鸿运的尸体，则留了下来。方源将其牢牢把在手中。
// 调度：地平线压低（仰拍），方源在右三分之一、夹着尸体抬头；光柱从他身前的河面斜冲出画格左上，赵怜云在光里往上飞、手还朝下伸向马鸿运；
// 左上角极小的中洲群仙站在云头上（她要投去的方向）。光柱占满竖向 —— 人很小，光很大（诺兰）；光柱里满是往上冲的速度线，底下炸起水花（航海王）。
export function K4() {
  const hz = 600, base = [1000, 748], top = [470, -200], w0 = 60, w1 = 300;
  const fy = (() => { const s = 470 / 875; return { ops: flatten(CARRY.FY_CARRY_UP, CARRY, mkXf({ s, from: [445, 955], at: [1300, 776] })), s }; })();
  const zly = (() => { const H = 190, T = rplacer([742, 372], H, .42, true); return { ops: flattenLayers({ layers: sideStanding({ robe: 'robeIn', hair: 'hairW', style: 'bun', circlet: true, sleeve: 'point', face: { age: .95, female: 1, expr: 'cry', nose: 1.05 } }, T) }, p => p), s: H / 875 }; })();
  const imm = [[200, 104, 64, { robe: 'robe', hair: 'hair', style: 'crown', belt: 'blue' }], [262, 98, 70, { robe: 'robe', hair: 'hair', style: 'crown', belt: 'blue', beard: true }], [320, 106, 60, { robe: 'robe', hair: 'hair', style: 'bun', belt: 'blue' }]]
    .map(([x, y, H, o]) => ({ ops: flattenLayers({ layers: standing(o, placer([x, y], H)) }, p => p), s: H / 875 }));
  return [
    { t: 'bg', tone: 'dark' },
    { t: 'sky', hz },
    { t: 'water', hz, lines: FX.calmLines(0, 1920, hz, 804, 18, 41), ripples: [...FX.ripples(base[0], base[1] + 4, 90, 14, 5, 42), ...FX.ripples(1300, 778, 70, 10, 3, 43)], reflect: [base[0], 150] },
    { t: 'cloud', at: [262, 110], w: 190 },
    ...imm.map((f, i) => ({ t: 'fig', ops: f.ops, key: 'k4imm' + i, s: f.s })),
    { t: 'focus', polys: FX.focusLines(760, 300, 520, 1500, 120, 44, 22) },
    { t: 'beam', poly: FX.beam(base, top, w0, w1, 45), streaks: FX.streaks(base, top, w0, w1, 70, 46, 12), color: 'blue' },
    { t: 'splash', ...FX.splash(base[0], base[1] + 6, 260, 150, 47) },
    { t: 'fig', ops: zly.ops, key: 'k4zly', s: zly.s, lit: 'blue' },
    { t: 'fig', ops: fy.ops, key: 'k4fy', s: fy.s },
    { t: 'sfx', text: '嗡', x: 1420, y: 330, size: 300, rot: .12 },
    { t: 'cap', who: '', text: '九转爱情仙蛊！' },
  ];
}

// K5 · 1:01 这一刻，他四面楚歌（高位俯拍，方源居中）
// 原文第264节：天意！方源仰头。这一刻，他四面楚歌。不仅是雪胡老祖、毛里球、中洲蛊仙要为难他，剿杀他泄愤，
// 而且天意也无处不在，千方百计地要铲除他这个当今天下最大的变数！……但至始至终，他都面无表情。
// 调度：镜头高高往下看，方源在正中、很小，仰头；河从他身后（右下）流来、到他脚下断开。
// 左边北原一群（雪胡老祖指着他）、右边毛里球从画外压进来、天上两侧是中洲群仙 —— 人都朝着他，近处的只看得见背影，被画框切掉；
// 天顶一只“天意”的巨眼往下看。集中线从四边一起压向方源（航海王），人多、框挤、他小（诺兰）。
export function K5() {
  const hz = 250, at = [960, 540];
  const fy = (() => { const s = 160 / 875; return { ops: flatten(CARRY.FY_CARRY_UP, CARRY, mkXf({ s, from: [445, 955], at })), s }; })();
  const back = (x, y, H, o) => ({ ops: flattenLayers({ layers: standing({ ...o, back: true }, placer([x, y], H)) }, p => p), s: H / 875, y });
  const front = (x, y, H, o) => ({ ops: flattenLayers({ layers: standing(o, placer([x, y], H)) }, p => p), s: H / 875, y });
  const beiyuan = [back(150, 520, 150, { robe: 'robeD', hair: 'hair', style: 'bun' }), back(420, 545, 160, { robe: 'robeD', hair: 'hair', style: 'long' }),
    back(300, 640, 220, { robe: 'robeD', hair: 'hairW', style: 'bun', fur: true, sleeve: 'point' }),   // 雪胡老祖：白发、白毛裘，指着方源
    back(70, 720, 270, { robe: 'robeD', hair: 'hair', style: 'bun' }), back(520, 840, 330, { robe: 'robeD', hair: 'hair', style: 'long', belt: 'gold' })];
  const changsheng = [back(1660, 600, 200, { robe: 'robeD', hair: 'hair', style: 'crown' }), back(1830, 700, 260, { robe: 'robeD', hair: 'hair', style: 'bun' })];
  const zhongzhou = [[420, 222, 92], [520, 214, 86], [610, 226, 80], [1300, 224, 84], [1390, 212, 92], [1490, 226, 80]].map(([x, y, H], i) => front(x, y, H, { robe: 'robe', hair: 'hair', style: i % 3 ? 'bun' : 'crown', belt: 'blue', beard: i === 1 }));
  const mlq = (() => { const M = MLQ.MLQ_SIDE, H = 430, [x0, y0, x1, y1] = M.box, s = H / (y1 - y0); return { ops: flatten(M, MLQ, mkXf({ s, from: [x0, y1], at: [1480, 520] })), s }; })();
  const crowd = [...beiyuan, ...changsheng].sort((a, b) => a.y - b.y);
  return [
    { t: 'bg', tone: 'dark' },
    { t: 'sky', hz },
    { t: 'eye', ...FX.eye(960, 112, 720, 196, .22, 51) },
    { t: 'cloud', at: [515, 232], w: 300 }, { t: 'cloud', at: [1395, 234], w: 300 },
    ...zhongzhou.map((f, i) => ({ t: 'fig', ops: f.ops, key: 'k5zz' + i, s: f.s })),
    { t: 'ground', hz },
    { t: 'river', river: riverBanks(bez([966, 532], [1120, 520], [1330, 640], [1560, 830], 60), bez([966, 548], [1040, 580], [1120, 700], [1080, 830], 60)) },
    { t: 'focus', polys: FX.focusLines(at[0], at[1] - 70, 300, 1500, 150, 52, 26) },
    { t: 'fig', ops: mlq.ops, key: 'k5mlq', s: mlq.s },
    { t: 'fig', ops: fy.ops, key: 'k5fy', s: fy.s },
    ...crowd.map((f, i) => ({ t: 'fig', ops: f.ops, key: 'k5c' + i, s: f.s })),
    { t: 'cap', who: '', text: '这一刻，他四面楚歌' },
  ];
}

// K5 皮影版：皮影只能侧身，没法俯拍。按 TREATMENT“去幕后”：天意是举杆的手 —— 幕布上方压下来一只巨大的手影（操纵者的手），
// 攥着一根横杆，杆上垂下细杆连着台上每一个人（北原、毛里球、中洲群仙），只有方源身上没有杆，他仰头看那只手。
export function K5_puppet() {
  const gy = 712, side = (x, y, H, o, flip) => ({ ops: flattenLayers({ layers: sideStanding(o, placer([x, y], H, flip)) }, p => p), s: H / 875, head: [x, y - H * .95] });
  const fy = (() => { const s = 300 / 875; return { ops: flatten(CARRY.FY_CARRY_UP, CARRY, mkXf({ s, from: [445, 955], at: [1010, gy] })), s }; })();
  const beiyuan = [side(250, gy, 270, { robe: 'robeD', hair: 'hair', style: 'bun' }, true), side(560, gy, 300, { robe: 'robeD', hair: 'hairW', style: 'bun', fur: true, beard: true, sleeve: 'point', face: { age: .85, nose: 1.3, expr: 'roar' } }, true), side(400, gy, 262, { robe: 'robeD', hair: 'hair', style: 'long', belt: 'gold' }, true)];
  const zz = [side(760, 400, 170, { robe: 'robe', hair: 'hair', style: 'crown', belt: 'blue', face: { age: .3 } }, true), side(880, 392, 176, { robe: 'robe', hair: 'hair', style: 'crown', belt: 'blue', beard: true, face: { age: .4 } }, true), side(1180, 398, 168, { robe: 'robe', hair: 'hair', style: 'bun', belt: 'blue' }, false)];
  const mlq = (() => { const M = MLQ.MLQ_SIDE, H = 400, [x0, y0, x1, y1] = M.box, s = H / (y1 - y0); return { ops: flatten(M, MLQ, mkXf({ s, from: [x0, y1], at: [1330, gy + 8] })), s, head: [1330 + (700 - x0) * s, gy - 330] }; })();
  // 手影：腕从幕布顶上伸下来，手背朝外，四根手指弯过横杆、在杆下露出四个指节（指缝处有凹口），拇指从近侧横压在食指上。
  // 比例按握拳的手：腕宽≈指节宽×.7，四指等宽、中指最长。
  const hand = [[880, -200], [1090, -200], [1100, 0], [1130, 50], [1150, 100], [1150, 140], [1144, 165], [1128, 178], [1108, 178], [1092, 166], [1086, 180], [1070, 192], [1046, 195], [1024, 186], [1016, 172], [1010, 186], [994, 200], [968, 202], [946, 192], [940, 176], [934, 188], [916, 196], [892, 194], [874, 182], [868, 166], [858, 150], [830, 140], [806, 120], [800, 95], [812, 70], [840, 40], [868, 10]];
  const thumb = [[812, 80], [850, 100], [900, 124], [944, 138], [962, 150], [952, 168], [920, 162], [880, 148], [838, 130], [806, 110]];
  for (const p of [...hand, ...thumb]) { p[0] = 975 + (p[0] - 975) * 1.35; p[1] = 150 + (p[1] - 150) * 1.35; }   // 放大，握点不动
  const bar = [420, 1520, 150];
  const targets = [...beiyuan.map(f => f.head), ...zz.map(f => f.head), mlq.head];
  const rods = targets.map(([x, y]) => [Math.max(bar[0] + 20, Math.min(bar[1] - 20, x + (960 - x) * .25)), bar[2] + 8, x, y]);
  return [
    { t: 'bg', tone: 'light' },
    { t: 'ground', hz: gy },
    { t: 'cloud', at: [820, 406], w: 320 }, { t: 'cloud', at: [1180, 402], w: 200 },
    ...zz.map((f, i) => ({ t: 'fig', ops: f.ops, key: 'k5pz' + i, s: f.s })),
    { t: 'fig', ops: mlq.ops, key: 'k5pmlq', s: mlq.s },
    ...beiyuan.map((f, i) => ({ t: 'fig', ops: f.ops, key: 'k5pb' + i, s: f.s })),
    { t: 'fig', ops: fy.ops, key: 'k5pfy', s: fy.s },
    { t: 'hand', poly: hand, thumb, bar, rods },
    { t: 'cap', who: '', text: '这一刻，他四面楚歌' },
  ];
}
export const SHOTS = { K2, K3, K4, K5, K5_puppet };
