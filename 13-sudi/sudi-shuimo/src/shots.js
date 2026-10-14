// 镜头调度：按时间选镜头、处理镜头之间的水墨转场（墨晕 / 雾带 / 雨水冲刷 / 闪白），画歌词，导出音效事件
import { DUR, EV } from './timeline.js';
import { drawLyrics, setLayout } from './lyrics.js';
import { clamp, ss, eio } from './util.js';
import * as I from './s_intro.js';
import * as V1 from './s_v1.js';
import * as CH from './s_chorus.js';
import * as IN from './s_inter.js';
import * as V2 from './s_v2.js';
import * as OU from './s_outro.js';

// 镜头表：t0 起；tin = 从上一镜头进来的转场 {m: 0 墨晕 | 1 雾带 | 2 冲刷 | 4 闪白切, d: 时长, c: 墨晕中心}
const SH = [
  ...I.SHOTS, ...V1.SHOTS, ...CH.shots(0), ...IN.SHOTS, ...V2.SHOTS, ...CH.shots(1), ...CH.shots(2), ...OU.SHOTS,
].sort((a, b) => a.t0 - b.t0);
export const shotList = () => SH.map(s => ({ id: s.id, t0: s.t0 }));

export async function init(TMP) {
  for (const m of [I, V1, CH, IN, V2, OU]) if (m.init) await m.init(TMP);
  setLayout([...I.LAYOUT, ...V1.LAYOUT, ...CH.LAYOUT, ...V2.LAYOUT, ...OU.LAYOUT]);
}

function idxAt(t) { let i = 0; while (i + 1 < SH.length && SH[i + 1].t0 <= t) i++; return i; }

export function frame(t, A, B, TMP) {
  const i = idxAt(t), s = SH[i], tin = s.tin;
  if (tin && i > 0 && t < s.t0 + tin.d) {
    const u = (t - s.t0) / tin.d, prev = SH[i - 1];
    if (tin.m === 4) {           // 闪白切：前半帧是上一镜，闪白峰值处换镜
      const o = (u < .25 ? prev.f(t, A, B, TMP) : s.f(t, A, B, TMP)) || {};
      return { ...o, flash: Math.max(o.flash ?? 0, (1 - Math.abs(u - .25) / .75) * .95) };
    }
    const oa = prev.f(t, A, null, TMP) || {}, ob = s.f(t, B, null, TMP) || {};
    let tr;
    if (tin.m === 0) { const c = typeof tin.c === 'function' ? tin.c(t) : (tin.c || [960, 540]); tr = [c[0], c[1], 20 + 2600 * (tin.ease === 'lin' ? u : ss(u)), 1]; }
    else if (tin.m === 1) tr = [0, s.t0, -300 + 2500 * eio(u), 1];
    else tr = [0, 0, -200 + 1500 * eio(u), 1];
    return { ...oa, paperB: ob.paper, bleedB: ob.bleed, rimB: ob.rim, trans: tr, tmode: tin.m, flash: Math.max(oa.flash ?? 0, ob.flash ?? 0) * (1 - u) + (ob.flash ?? 0) * u, dark: (oa.dark ?? 0) * (1 - u) + (ob.dark ?? 0) * u, shake: ob.shake };
  }
  return s.f(t, A, B, TMP) || {};
}

export function overlay(c, t, o, nosub) {
  const i = idxAt(t);
  if (SH[i].ov) SH[i].ov(c, t);
  if (!nosub) drawLyrics(c, t);
}

export const texts = () => [];

export function events() {
  const E = [];
  for (const m of [I, V1, CH, IN, V2, OU]) if (m.events) E.push(...m.events());
  for (const s of SH) if (s.tin && s.tin.m !== 4 && s.t0 > 1) E.push({ t: s.t0, type: s.tin.m === 2 ? 'washT' : s.tin.m === 1 ? 'mistT' : 'bloomT', d: s.tin.d });
  return E.sort((a, b) => (a.t ?? a.t0) - (b.t ?? b.t0));
}
