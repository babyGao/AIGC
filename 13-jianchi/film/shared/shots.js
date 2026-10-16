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
// 各风格的 shots.js 只管怎么画每一类元素。
import * as XH from './models/xuehu.js';
import * as MLQ from './models/maoliqiu.js';
import * as CARRY from './models/carry.js';
import { standing, sideStanding } from './models/crowd.js';
import { flattenLayers } from './models/flatten.js';
import { placer, rplacer } from './models/profile.js';
import { flatten, mkXf } from './models/flatten.js';
import * as FX from './fx.js';

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
export const SHOTS = { K2, K3, K4 };
