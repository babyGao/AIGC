// 入口：按时间渲染一帧。window.render(t) / DUR / EV / READY 是 Lemo-Opuscar 渲染工具的约定。
import { makeComp, layerSet } from '../engine/comp.js';
import { DUR } from './timeline.js';
const q = new URLSearchParams(location.search);
const comp = makeComp(document.getElementById('c'));
const OV = document.getElementById('ov').getContext('2d');
const A = layerSet(), B = layerSet(), TMP = layerSet();
await document.fonts.load('300 40px SongLight', '宿敌'); await document.fonts.load('500 40px SongMed', '宿敌'); await document.fonts.load('40px MaShanZheng', '宿敌');
const mode = q.get('test');
let render;
if (mode) {
  const mod = await import('./test.js');
  window.DUR = 1;
  render = t => { A.clear(); B.clear(); OV.clearRect(0, 0, 1920, 1080); const o = mod.render(t, A, B, TMP, mode, OV) || {}; comp(A, B, o); };
} else {
  const S = await import('./shots.js');
  await S.init(TMP);
  window.DUR = DUR;
  window.EV = S.events();
  window.TEXTS = S.texts;
  const NOSUB = q.has('nosub'), LYR = q.has('lyr');
  if (LYR) {   // 只画歌词层（透明背景），给 tools/render_lyrics.mjs 单独渲染后叠加
    document.getElementById('c').style.display = 'none';
    document.documentElement.style.background = document.body.style.background = 'transparent';
  }
  render = LYR ? (t => { OV.setTransform(1, 0, 0, 1, 0, 0); OV.clearRect(0, 0, 1920, 1080); S.overlay(OV, t, {}, false); }) : t => {
    A.clear(); B.clear(); OV.setTransform(1, 0, 0, 1, 0, 0); OV.clearRect(0, 0, 1920, 1080);
    const o = S.frame(t, A, B, TMP) || {};
    comp(A, B, o);
    S.overlay(OV, t, o, NOSUB);
  };
}
window.render = render;
window.READY = true;
