// 关键镜头的语义描述（局部坐标 1920×804，宽银幕）。每个镜头 = 按画的顺序排好的元素：
//   { t:'bg', tone, accent }         底：dark / light；accent = 情绪色（red 暴怒），各风格自选用不用（间谍片头拿来当底色）
//   { t:'focus', polys }             集中线（尖楔多边形）
//   { t:'speed', polys, on }         速度线（on:'pool' = 画在浅水面上，用和水相反的颜色）
//   { t:'rings', lines, w }          音浪（锯齿弧折线）
//   { t:'debris', items }            碎屑 { poly, trail }
//   { t:'fig', ops, key, s }         人物（画面指令，已在局部坐标）
//   { t:'sfx', text, x, y, size, rot, font }   拟声字（巨大，斜穿画格）
//   { t:'cap', who, text, side }     字幕（各风格按自己的规矩放；who 为空 = 旁白；side:'left' = 水墨题跋改写在左边）
//   { t:'sky', hz } / { t:'water', hz, lines, ripples, reflect:[x,w] }   远景的天和水面（平静：横线 + 涟漪 + 光柱倒影）
//   { t:'beam', poly, streaks, color }   光柱（color:'blue' = 爱情仙蛊的湛蓝，木刻唯一的色版、水墨唯一的花青）
//   { t:'splash', cols, drops }      水花皇冠
//   { t:'cloud', at, w }             托着远处群仙的云头
//   { t:'ground', hz } / { t:'river', river }   草原（地平线 hz 以下）/ 逆流河（riverBanks 的结果；河头平静，往下游起浪）
//   { t:'eye', ...FX.eye() }          “天意”的巨眼（天上）
//   { t:'panel', poly, tone, paper, els }   分格：格里的元素裁进 poly；tone 格底（dark/light），paper 间谍片头的纸色
//   { t:'marks', polys, lines }       漫画符号（泪、汗、青筋、抖动线）：polys 填色、lines 画线，颜色和所在的格底相反
//   { t:'aura', polys, bolts }        霸气：黑焰舌（polys）+ 黑闪电（bolts 折线）
//   { t:'rays', polys }              光芒（从一点往外放射的楔形光，各风格都画成“亮”）
//   bg.imax = true                   IMAX：遮幅撑开，局部坐标变成 1920×1080；fig.glow = 人自己在发光
//   { t:'pool', poly, front, lines, ripples }   一片浅水（河头近景）：poly 是水面范围，front 是正往前涨的水线
// 各风格的 shots.js 只管怎么画每一类元素。
import * as XH from './models/xuehu.js';
import * as MLQ from './models/maoliqiu.js';
import * as CARRY from './models/carry.js';
import * as STEP from './models/step.js';
import * as FY from './models/fangyuan.js';
import * as CAST from './models/cast.js';
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

// K6 · 1:31 一步再一步（贴地大特写）
// 原文第265节：一步又一步。他早已经走到了最前端，每走一步，逆流河就顺势向前流淌一步，让方源始终置身在河内。……一步再一步。
// 素材：refs/river/03.jpg（浅水里的一步：前脚抬起、黑鞋、白袍下摆盖住后脚）。脚的造型就量自这张图（models/step.js）。
// 调度：镜头贴着地面，前脚的黑鞋占满左半、正往下踩（竖向速度线 + “咚”）；后脚踩在浅水里，水线正往前涨、追到前脚底下（向左的水纹速度线）；
// 地平线上极小的一排看客和像小土丘的毛里球 —— 一只脚比整个世界还大（诺兰）。
export function K6() {
  const hz = 300, s = 1.3, xf = mkXf({ s, from: [560, 431], at: [200, 780] });
  const foot = flatten(STEP.FY_STEP, STEP, xf);
  const front = [[250, 804], [310, 750], [390, 712], [520, 690], [700, 676], [1000, 640], [1300, 560], [1600, 420], [1800, 330], [1900, 306]];
  const pool = front.concat([[1920, 306], [1920, 804]]);
  const tiny = [[1340, 34], [1376, 30], [1408, 36], [1450, 28], [1720, 32], [1756, 36], [1792, 30]].map(([x, H], i) => ({ ops: flattenLayers({ layers: standing({ robe: i < 4 ? 'robeD' : 'robe', hair: i === 1 ? 'hairW' : 'hair', style: 'bun', fur: i === 1 }, placer([x, hz + 2], H)) }, p => p), s: H / 875 }));
  const mlq = (() => { const M = MLQ.MLQ_SIDE, H = 60, [x0, y0, x1, y1] = M.box, k = H / (y1 - y0); return { ops: flatten(M, MLQ, mkXf({ s: k, from: [x0, y1], at: [1520, hz + 2] })), s: k }; })();
  return [
    { t: 'bg', tone: 'dark' },
    { t: 'sky', hz },
    { t: 'ground', hz },
    { t: 'pool', poly: pool, front, lines: FX.calmLines(300, 1920, 300, 804, 14, 61), ripples: FX.ripples(720, 786, 100, 13, 4, 62) },
    { t: 'speed', polys: FX.speedLines([300, 700, 1000, 800], Math.PI + .12, 24, 63, 9), on: 'pool' },   // 水线往前涨（画在水面上，用跟水相反的颜色）
    { t: 'fig', ops: mlq.ops, key: 'k6mlq', s: mlq.s },
    ...tiny.map((f, i) => ({ t: 'fig', ops: f.ops, key: 'k6t' + i, s: f.s })),
    { t: 'fig', ops: foot, key: 'k6foot', s },
    { t: 'speed', polys: FX.speedLines([220, 120, 560, 440], Math.PI / 2 + .12, 30, 64, 10) },
    { t: 'sfx', text: '咚', x: 1260, y: 250, size: 260, rot: .08 },
    { t: 'cap', who: '', text: '一步再一步' },
  ];
}

// K7 · 2:01 为什么方源，他始终面无表情？（斜切多格）
// 原文第265节：除去方源之外，其他跋涉之人，不是神情扭曲，就是痛苦万分，不是疯狂，就是哭泣。为什么方源，他始终面无表情？
// 四个反应格用的就是先前在河里跋涉过的人（第261节）：黑楼兰吼（神情扭曲）、影无邪咬牙流绿血（痛苦万分）、
// 白凝冰狂笑（疯狂）、赵怜云哭（哭泣）。格子斜切、每格都炸着集中线（航海王）；中间一格方源正脸，什么效果都不加，留白 —— 安静本身就是对比（诺兰的克制）。
export function K7() {
  const bustAt = (M, at, s, flip) => flatten(M, CAST, mkXf({ s, from: [.2, -.45], at, flip }));
  // 每格：集中线 + 胸像 + 这个人的漫画符号（放在眼睛 / 额角旁边）
  const panel = (poly, tone, paper, face, key, s, seed, marks) => { const ops = bustAt(face.M, face.at, s, face.flip), eye = ops.find(o => o.role === 'eye').iris, back = face.flip ? -1 : 1;
    return { t: 'panel', poly, tone, paper, els: [
      { t: 'focus', polys: FX.focusLines(face.at[0], face.at[1], s * .5, 900, 150, seed, 24) },
      { t: 'fig', ops, key, s: s / 300 },
      { t: 'marks', ...marks(eye, back, s) } ] }; };
  const tearsM = ([x, y], b, s) => ({ polys: FX.tears(x, y + 8, s * .62, -b, 81), lines: [] });
  const sweatM = ([x, y], b, s) => ({ polys: FX.sweat(x + b * s * .12, y - s * .3, 3, s * .07, 82), lines: [] });
  const veinM = ([x, y], b, s) => ({ polys: [], lines: FX.vein(x + b * s * .3, y - s * .3, s * .12) });
  const shakeM = ([x, y], b, s) => ({ polys: [], lines: [...FX.shake(x + b * s * .25, y - s * .1, s * .62, 7, 83), ...FX.shake(x + b * s * .25, y - s * .1, s * .74, 5, 84)] });
  const fy = flatten(FY.FULL_FRONT, FY, mkXf({ s: 3, from: [182, 236], at: [905, 380] }));
  return [
    { t: 'bg', tone: 'light' },
    panel([[0, 0], [660, 0], [600, 388], [0, 388]], 'light', 'red', { M: CAST.ZLY_CRY, at: [370, 250], flip: true }, 'k7zly', 320, 71, tearsM),
    panel([[0, 412], [596, 412], [540, 804], [0, 804]], 'dark', 'teal', { M: CAST.YWX_GRIT, at: [300, 660], flip: true }, 'k7ywx', 320, 72, sweatM),
    { t: 'panel', poly: [[690, 0], [1250, 0], [1170, 804], [570, 804]], tone: 'light', paper: 'bone', els: [{ t: 'fig', ops: fy, key: 'k7fy', s: 3 / 2.2 }] },
    panel([[1280, 0], [1920, 0], [1920, 388], [1236, 388]], 'dark', 'ink', { M: CAST.HLL_ROAR, at: [1590, 250] }, 'k7hll', 320, 73, veinM),
    panel([[1232, 412], [1920, 412], [1920, 804], [1200, 804]], 'light', 'boneD', { M: CAST.BNB_LAUGH, at: [1600, 660] }, 'k7bnb', 320, 74, shakeM),
    { t: 'cap', who: '', text: '为什么方源，他始终面无表情？' },
  ];
}

// 凸包（给霸气黑焰找一个外轮廓）
function hull(P) { P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of P) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1)); }
// 沿凸包按弧长重采样（火舌要均匀地长出来）
function resampleClosed(P, step) { const out = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step)); for (let j = 0; j < n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); } return out; }

// K8 · 2:32 一个人的坚持会有多难？……有的因为责任，有的因为仇恨，有的因为精彩，有的因为爱情（四联）
// 原文第265节：在场的所有蛊仙，都能回答这个问题。因为他们当中，有的因为责任而坚持，有的因为仇恨而坚持，有的因为精彩而坚持，有的因为爱情而坚持……
// 四个人按第261节：影无邪（“我就是影宗唯一的希望”——责任，头上趴着紫山真君）、黑楼兰（“娘亲，你的血仇我还没有报！”“吼！”——仇恨）、
// 白凝冰（“精彩！”）、赵怜云（爱情，望着马鸿运的尸体落泪）。四格竖条并排、同一个朝向 —— 四条并行的线（诺兰的交叉剪辑）；
// 每格一个大字词；仇恨那格是航海王的霸气：黑焰从人身上烧起来，带黑闪电。字幕在 2:32 正读到“仇恨”。
export function K8() {
  const W = 480, sl = 44, g = 12;
  const box = i => [[i * W + g - (i ? 0 : 80), 0], [(i + 1) * W - g + (i === 3 ? 80 : 0), 0], [(i + 1) * W - g - sl + (i === 3 ? 80 : 0), 804], [i * W + g - sl - (i ? 0 : 80), 804]];
  const bust = (M, i, s = 330) => flatten(M, CAST, mkXf({ s, from: [.2, -.45], at: [i * W + W * .44, 440] }));
  const word = (t, i, tone) => [...t].map((ch, k) => ({ t: 'sfx', text: ch, x: (i + 1) * W - 200, y: 250 + k * 200, size: 190, rot: 0 }));
  const P = [
    { M: CAST.YWX_GRIT, w: '责任', tone: 'dark', paper: 'teal', fx: i => [{ t: 'speed', polys: FX.speedLines([i * W - 40, -60, (i + 1) * W, 860], Math.PI / 2, 46, 91, 12) }] },
    { M: CAST.HLL_ROAR, w: '仇恨', tone: 'light', paper: 'red', fx: (i, ops) => { const pts = ops.filter(o => o.poly).flatMap(o => o.poly), H = resampleClosed(hull(pts), 14); return [{ t: 'aura', polys: FX.flameAura(H, 120, 92, 2), bolts: [...FX.lightning(i * W + 60, 40, i * W + 200, 360, 93, 22, 2), ...FX.lightning((i + 1) * W - 60, 500, (i + 1) * W - 140, 780, 94, 20, 1)] }]; } },
    { M: CAST.BNB_LAUGH, w: '精彩', tone: 'dark', paper: 'ink', fx: (i, ops) => { const eye = ops.find(o => o.role === 'eye').iris; return [{ t: 'focus', polys: FX.focusLines(eye[0], eye[1], 200, 900, 120, 95, 20) }, { t: 'marks', polys: [], lines: [...FX.shake(eye[0] + 70, eye[1] - 30, 230, 7, 96), ...FX.shake(eye[0] + 70, eye[1] - 30, 270, 5, 97)] }]; } },
    { M: CAST.ZLY_CRY, w: '爱情', tone: 'light', paper: 'bone', fx: (i, ops) => { const eye = ops.find(o => o.role === 'eye').iris; return [{ t: 'marks', polys: FX.tears(eye[0], eye[1] + 8, 210, -1, 98), lines: [] }]; } },
  ];
  const els = [{ t: 'bg', tone: 'light' }];
  P.forEach((p, i) => { const ops = bust(p.M, i), f = p.fx(i, ops), pre = f.filter(e => e.t !== 'marks'), post = f.filter(e => e.t === 'marks');
    els.push({ t: 'panel', poly: box(i), tone: p.tone, paper: p.paper, els: [...pre, { t: 'fig', ops, key: 'k8_' + i, s: 1.1 }, ...post, ...word(p.w, i, p.tone)] }); });
  els.push({ t: 'cap', who: '', text: '有的因为仇恨而坚持', side: 'left' });
  return els;
}

// K9 · 2:52 我曾经哭泣过，渐渐的我不再流泪（左右对切，动作匹配）
// 原文第265节方源的独白。TREATMENT：前世用“镜像版”——左边是前世，同一张侧脸（量自用户参考图）镜像过来，在哭；
// 右边是如今，同一张侧脸，面无表情。两张脸隔着中缝对望，像照镜子（诺兰：两条时间线对切）。
// 航海王只给左边：两道泪流、往下落的竖线；右边什么都不加。
export function K9() {
  const s = 4.3, at = (x, flip) => mkXf({ s, from: [425, 112], at: [x, 70], flip });
  const past = flatten(FY.FULL_SIDE_CRY, FY, at(470, true)), now = flatten(FY.FULL_SIDE, FY, at(1450, false));
  const eye = past.find(o => o.role === 'eye').iris;
  const L = [[-80, 0], [944, 0], [904, 804], [-80, 804]], R = [[968, 0], [2000, 0], [2000, 804], [928, 804]];
  return [
    { t: 'bg', tone: 'light' },
    { t: 'panel', poly: L, tone: 'dark', paper: 'ink', els: [
      { t: 'speed', polys: FX.speedLines([-60, -100, 900, 900], Math.PI / 2, 60, 101, 7) },
      { t: 'fig', ops: past, key: 'k9past', s: s / 2.2 },
      { t: 'marks', polys: FX.tears(eye[0] + 6, eye[1] + 14, 330, 1, 102), lines: [] } ] },
    { t: 'panel', poly: R, tone: 'light', paper: 'bone', els: [{ t: 'fig', ops: now, key: 'k9now', s: s / 2.2 }] },
    { t: 'cap', who: '方源', text: '我曾经哭泣过，渐渐的我不再流泪' },
  ];
}

// K10 · 3:26 光芒骤放，不可逼视（IMAX 满画幅、仰拍）
// 原文第265节：很快，方源的身上，从内而外，开始散发出一种洁白的光辉。……光芒骤放，不可逼视。
// 诺兰：全片唯一一次遮幅撑开（宽银幕 → IMAX），地平线压到最低，方源顶天立地；他仍夹着马鸿运的尸体。
// 光从他身上由内而外放出来，整个人化成光（皮影里他自己就成了灯）；四周是黑闪电（航海王的霸气黑电），
// 天上的中洲群仙、地上的北原和长生天一方都被光逼得背过脸、抬袖挡眼。
export function K10() {
  const hz = 930, s = 780 / 875, feet = [900, 1000];
  const fy = flatten(CARRY.FY_CARRY, CARRY, mkXf({ s, from: [445, 955], at: feet }));
  const C = [feet[0] - 10, feet[1] - 520 * s];   // 光心：胸口
  const away = (x, y, H, o, flip) => ({ ops: flattenLayers({ layers: sideStanding({ sleeve: 'raise', ...o }, placer([x, y], H, flip)) }, p => p), s: H / 875 });
  const sky = [[230, 250, 150, false], [360, 236, 160, false], [1530, 236, 160, true], [1660, 250, 150, true]].map(([x, y, H, f], i) => away(x, y, H, { robe: 'robe', hair: 'hair', style: i % 2 ? 'crown' : 'bun', belt: 'blue' }, f));
  const land = [[120, 1060, 300, false, { robe: 'robeD', hair: 'hairW', style: 'bun', fur: true, beard: true }], [300, 1080, 260, false, { robe: 'robeD', hair: 'hair', style: 'long' }], [1640, 1080, 280, true, { robe: 'robeD', hair: 'hair', style: 'crown' }], [1820, 1060, 300, true, { robe: 'robeD', hair: 'hair', style: 'bun' }]].map(([x, y, H, f, o]) => away(x, y, H, o, f));
  const bolts = [[-.9, -1], [-.4, -1.3], [.5, -1.25], [1, -.8], [-1.2, .1], [1.25, .2]].flatMap(([dx, dy], i) => FX.lightning(C[0] + dx * 160, C[1] + dy * 160, C[0] + dx * 620, C[1] + dy * 520, 110 + i, 30, 2));
  return [
    { t: 'bg', tone: 'dark', imax: true },
    { t: 'ground', hz },
    { t: 'rays', polys: FX.focusLines(C[0], C[1], 60, 2400, 120, 111, 120) },
    { t: 'cloud', at: [300, 262], w: 340 }, { t: 'cloud', at: [1600, 262], w: 340 },
    ...sky.map((f, i) => ({ t: 'fig', ops: f.ops, key: 'k10s' + i, s: f.s })),
    { t: 'aura', polys: [], bolts },
    { t: 'fig', ops: fy, key: 'k10fy', s, glow: true },
    ...land.map((f, i) => ({ t: 'fig', ops: f.ops, key: 'k10l' + i, s: f.s, lit: true })),
    { t: 'sfx', text: '轰', x: 1300, y: 520, size: 300, rot: .1 },
    { t: 'cap', who: '', text: '光芒骤放，不可逼视' },
  ];
}
export const SHOTS = { K2, K3, K4, K5, K5_puppet, K6, K7, K8, K9, K10 };
