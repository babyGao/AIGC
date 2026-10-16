// 关键镜头的语义描述（局部坐标 1920×804，宽银幕）。每个镜头 = 按画的顺序排好的元素：
//   { t:'bg', tone, accent }         底：dark / light；accent = 情绪色（red 暴怒），各风格自选用不用（间谍片头拿来当底色）
//   { t:'focus', polys }             集中线（尖楔多边形）
//   { t:'speed', polys }             速度线
//   { t:'rings', lines, w }          音浪（锯齿弧折线）
//   { t:'debris', items }            碎屑 { poly, trail }
//   { t:'fig', ops, key, s }         人物（画面指令，已在局部坐标）
//   { t:'sfx', text, x, y, size, rot, font }   拟声字（巨大，斜穿画格）
//   { t:'cap', who, text }           字幕（各风格按自己的规矩放）
// 各风格的 shots.js 只管怎么画每一类元素。
import * as XH from './models/xuehu.js';
import * as MLQ from './models/maoliqiu.js';
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
export const SHOTS = { K2, K3 };
