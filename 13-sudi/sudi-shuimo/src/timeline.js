// 时间轴：data/timeline.json（小节网格、段落、关键事件）+ data/lyrics.json（逐字时间）。画面、配乐、混音共用。
export const TL = await (await fetch(new URL('../data/timeline.json', import.meta.url))).json();
export const LYR = await (await fetch(new URL('../data/lyrics.json', import.meta.url))).json();
export const DUR = TL.dur, EV = TL.ev, SEC = TL.sections;
export const bar = n => TL.T0 + n * TL.BAR;             // 第 n 小节起点
export const BEAT = TL.BAR / 4;
// 第 occ 次出现的某句歌词（从 0 计）
export function line(text, occ = 0) { let k = 0; for (const l of LYR) if (l.text === text && k++ === occ) return l; throw new Error('no line ' + text); }
// 某句第 i 个字的起点 / 终点
export const ch = (text, i, occ = 0) => line(text, occ).chars[i].t0;
export const chEnd = (text, i, occ = 0) => { const c = line(text, occ).chars[i]; return c.t0 + c.d; };
// 第 k 遍副歌（0,1,2）中某句
export const C = (text, k) => line(text, k);
