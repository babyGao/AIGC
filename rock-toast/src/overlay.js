// 文字层：菜名卡（扫光逐字亮起）、字幕（下方三分之一）、配料标注（细金线 + 中英小字）
import { VO, LABELS, TITLES } from './story.js';
import { clamp, seg, eo } from '/core/lib.js';

const SERIF = "'Noto Serif SC', serif", LATIN = "'Cormorant Garamond', serif";
const CREAM = '245, 236, 222', GOLD = '214, 178, 118';

export async function makeOverlay(cv, W, H) {
  const g = cv.getContext('2d');
  await document.fonts.load(`500 40px ${SERIF}`, '巨石吐司'); await document.fonts.load(`300 40px ${LATIN}`, 'ROCK'); await document.fonts.load(`500 40px ${LATIN}`, 'ROCK');
  await document.fonts.ready;
  let dur = {};
  try { dur = await (await fetch('audio/voices/dur.json')).json(); } catch { }
  // 字幕起止：至少 1.8 秒、不短于语音 + 0.6 秒，遇到下一句就让位
  const subs = VO.map((v, i) => {
    const d = dur[v.id] ?? v.text.length / 4.5, nx = VO[i + 1] ? VO[i + 1].t - .08 : 1e9;
    return { t0: v.t - .05, t1: Math.min(nx, v.t + Math.max(1.8, d + .6)), text: (v.sub || v.text).replace(/[。，]$/, '') };
  });
  const items = [];
  const S = W / 1080;   // 按宽度缩放

  // 字距：逐字绘制
  function spaced(txt, x, y, sp, align = 'center') {
    const ws = [...txt].map(c => g.measureText(c).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
    let cx = align === 'center' ? x - tot / 2 : align === 'right' ? x - tot : x;
    const x0 = cx;
    [...txt].forEach((c, i) => { g.fillText(c, cx, y); cx += ws[i] + sp; });
    return [x0, x0 + tot];
  }
  function shadow(on) { g.shadowColor = on ? 'rgba(0,0,0,.55)' : 'transparent'; g.shadowBlur = on ? 14 * S : 0; g.shadowOffsetY = on ? 2 * S : 0; }

  function title(t, T) {
    const k = seg(t, T.t0, T.t0 + 1.0), out = 1 - seg(t, T.t1 - .45, T.t1);
    if (k <= 0 || out <= 0) return;
    const cx = W / 2, y = H * .2;
    g.textBaseline = 'alphabetic'; shadow(true);
    // 小标题
    g.font = `300 ${30 * S}px ${LATIN}`; g.fillStyle = `rgba(${GOLD}, ${.9 * eo(seg(k, 0, .5)) * out})`;
    const kb = spaced('FRENCH TOAST', cx, y - 120 * S, 10 * S);
    // 主标题：从左到右逐字亮起（扫光）
    g.font = `500 ${116 * S}px ${SERIF}`;
    const chars = [...'巨石吐司'], sp = 30 * S, ws = chars.map(c => g.measureText(c).width), tot = ws.reduce((a, b) => a + b, 0) + sp * 3;
    let x = cx - tot / 2; const tx0 = x;
    chars.forEach((c, i) => {
      const a = eo(seg(k, .1 + i * .12, .45 + i * .12));
      g.fillStyle = `rgba(${CREAM}, ${a * out})`; g.fillText(c, x, y + (1 - a) * 10 * S);
      // 扫光高光
      const glint = Math.max(0, 1 - Math.abs(k * 1.4 - .2 - i * .18) * 6);
      if (glint > 0) { g.fillStyle = `rgba(255, 246, 225, ${glint * .8 * out})`; g.fillText(c, x, y + (1 - a) * 10 * S); }
      x += ws[i] + sp;
    });
    // 金线 + 英文名
    const lw = tot * .55 * eo(seg(k, .35, .8));
    g.fillStyle = `rgba(${GOLD}, ${.85 * out})`; shadow(false); g.fillRect(cx - lw / 2, y + 40 * S, lw, 1.5 * S); shadow(true);
    g.font = `300 ${46 * S}px ${LATIN}`; g.fillStyle = `rgba(${GOLD}, ${eo(seg(k, .45, .9)) * out})`;
    const rb = spaced('ROCK TOAST', cx, y + 104 * S, 16 * S);
    items.push({ id: 'title-kicker', text: 'FRENCH TOAST', x0: kb[0], y0: y - 150 * S, x1: kb[1], y1: y - 110 * S },
      { id: 'title-zh', text: '巨石吐司', x0: tx0, y0: y - 100 * S, x1: tx0 + tot, y1: y + 20 * S },
      { id: 'title-en', text: 'ROCK TOAST', x0: rb[0], y0: y + 68 * S, x1: rb[1], y1: y + 112 * S });
  }

  function label(t, L, i) {
    const a = eo(seg(t, L.t0, L.t0 + .4)) * (1 - seg(t, L.t1 - .3, L.t1));
    if (t < L.t0 || t > L.t1) return;
    shadow(true); g.textBaseline = 'alphabetic';
    const right = !!L.side, x = right ? W - 84 * S : 84 * S, y = (right ? 250 : 230 + L.list * 128) * S, dx = (1 - a) * 18 * S * (right ? 1 : -1);
    g.fillStyle = `rgba(${GOLD}, ${a})`; shadow(false);
    g.fillRect(right ? x - 46 * S + dx : x + dx, y - 62 * S, 46 * S, 1.5 * S); shadow(true);
    g.font = `500 ${46 * S}px ${SERIF}`; g.fillStyle = `rgba(${CREAM}, ${a})`;
    const nb = spaced(L.text, x + dx, y, 6 * S, right ? 'right' : 'left');
    g.font = `500 ${30 * S}px ${LATIN}`; g.fillStyle = `rgba(${GOLD}, ${a})`;
    const sb = spaced(L.sub, x + dx, y + 44 * S, 5 * S, right ? 'right' : 'left');
    items.push({ id: 'label' + i, text: L.text, x0: nb[0], y0: y - 46 * S, x1: nb[1], y1: y + 8 * S }, { id: 'label' + i + 's', text: L.sub, x0: sb[0], y0: y + 14 * S, x1: sb[1], y1: y + 52 * S });
  }

  function subtitle(t) {
    const s = subs.find(s => t >= s.t0 && t < s.t1); if (!s) return;
    const a = Math.min(1, (t - s.t0) / .15, (s.t1 - t) / .15);
    // 字幕底衬：下方一层淡暗渐变，亮底上也读得清
    const gr = g.createLinearGradient(0, H * .74, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.45, `rgba(0,0,0,${.42 * a})`); gr.addColorStop(1, `rgba(0,0,0,${.5 * a})`);
    shadow(false); g.fillStyle = gr; g.fillRect(0, H * .74, W, H * .26); shadow(true);
    g.font = `500 ${42 * S}px ${SERIF}`; g.textBaseline = 'alphabetic'; shadow(true);
    g.fillStyle = `rgba(${CREAM}, ${.94 * a})`;
    spaced(s.text, W / 2, H * .855, 3 * S);
  }

  function draw(t) {
    g.clearRect(0, 0, W, H); items.length = 0;
    TITLES.forEach(T => title(t, T));
    LABELS.forEach((L, i) => label(t, L, i));
    subtitle(t);
    shadow(false);
  }
  return { draw, texts: t => { draw(t); return items.slice(); }, subs };
}
