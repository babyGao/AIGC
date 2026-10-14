// 字与印：竖排题跋（随长卷移动）、横排小字、旁白字幕（屏幕坐标）、白文朱印
import { clamp } from '/core/lib.js';
import { VERM, vnoise } from './kit.js';
export const BRUSH = 'MaShanZheng', KAI = 'WenKai';
export const BOXES = [];
const reg = (b, cam, k, text) => { const s = cam ? { x0: b.x0 * cam.s + cam.tx, x1: b.x1 * cam.s + cam.tx, y0: b.y0 * cam.s + cam.ty, y1: b.y1 * cam.s + cam.ty } : b; if (s.x1 < 0 || s.x0 > 1920 || s.y1 < 0 || s.y0 > 1080) return; if (k > .05) BOXES.push(cam ? { x0: b.x0 * cam.s + cam.tx, y0: b.y0 * cam.s + cam.ty, x1: b.x1 * cam.s + cam.tx, y1: b.y1 * cam.s + cam.ty, text } : { ...b, text }); };

// 竖排题跋：(wx, wy) 为首字中心（世界坐标）。逐字写出：每字自上而下揭开，先湿后干。空格 = 小停顿
export function column(A, cam, text, wx, wy, size, p = 1, o = {}) {
  const chars = [...text], n = chars.filter(c => c !== ' ').length, gap = o.gap ?? 1.08, font = o.font || BRUSH, am = o.am ?? 1;
  let yEnd = wy;
  for (const ch of chars) yEnd += ch === ' ' ? size * .45 : size * gap;
  const box = { x0: wx - size * .55, y0: wy - size * .55, x1: wx + size * .55, y1: yEnd - size * gap + size * .55 };
  if (p <= 0 || am <= 0) return box;
  reg(box, cam, p * am, text);
  for (const [ctx, k, wet] of [[A.cw, o.wet ?? .3, true], [A.cd, o.tone ?? .94, false]]) {
    ctx.save(); ctx.setTransform(cam.s, 0, 0, cam.s, cam.tx, cam.ty);
    ctx.fillStyle = '#000'; ctx.font = `${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let y = wy, i = 0;
    for (const ch of chars) {
      if (ch === ' ') { y += size * .45; continue; }
      const u = clamp(p * n - i); i++;
      if (u > 0) {
        ctx.globalAlpha = clamp(am * k * (wet ? 1.7 - u * .7 : .4 + .6 * u));
        if (u < 1) { ctx.save(); ctx.beginPath(); ctx.rect(wx - size, y - size * .62, size * 2, size * 1.24 * u); ctx.clip(); ctx.fillText(ch, wx, y); ctx.restore(); }
        else ctx.fillText(ch, wx, y);
      }
      y += size * gap;
    }
    ctx.restore();
  }
  return box;
}

// 横排小字（世界坐标，左对齐或居中）
export function line(A, cam, text, wx, wy, size, am = 1, o = {}) {
  const font = o.font || KAI;
  let w = 0;
  for (const [ctx, k] of [[A.cw, o.wet ?? .2], [A.cd, o.tone ?? .9]]) {
    ctx.save(); ctx.setTransform(cam.s, 0, 0, cam.s, cam.tx, cam.ty);
    ctx.fillStyle = '#000'; ctx.font = `${size}px ${font}`; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle';
    if (o.sp) ctx.letterSpacing = o.sp + 'px';
    w = ctx.measureText(text).width;
    if (am > 0) { ctx.globalAlpha = clamp(am * k); ctx.fillText(text, wx, wy); }
    ctx.restore();
  }
  const x0 = o.align === 'center' ? wx - w / 2 : wx, bx = { x0, y0: wy - size * .6, x1: x0 + w, y1: wy + size * .6 };
  reg(bx, cam, am, text);
  return bx;
}

// 旁白字幕：屏幕坐标，以 (x, y) 为行中心；行首一枚朱红小方块；出现时先湿后干
export function subtitle(A, text, x, y, a = 1, o = {}) {
  if (a <= 0) return null;
  const size = o.size || 44, wetK = clamp(1 - a) * .8;
  let w = 0;
  for (const [ctx, k] of [[A.cw, wetK + .12], [A.cd, 1 - wetK * .6]]) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = clamp(a * k * .92); ctx.fillStyle = '#000';
    ctx.font = `${size}px ${KAI}`; ctx.letterSpacing = '2px'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    w = ctx.measureText(text).width;
    ctx.fillText(text, x - w / 2 + size * .35, y);
    ctx.restore();
  }
  const s = size * .3, cc = A.cc;
  cc.save(); cc.setTransform(1, 0, 0, 1, 0, 0); cc.globalAlpha = clamp(a * .92); cc.fillStyle = `rgb(${VERM.join(',')})`;
  cc.fillRect(x - w / 2 - size * .35, y - s / 2, s, s); cc.restore();
  const bx = { x0: x - w / 2 - size * .35, y0: y - size * .6, x1: x + w / 2 + size * .35, y1: y + size * .6 };
  reg(bx, null, a, text);
  return bx;
}

// 白文朱印：略不规则的朱红方块，印文挖白，带印泥斑驳。c 为颜色层上下文（沿用当前变换）
export function seal(c, x, y, size, am = 1, text = '丹', seed = 3) {
  if (am <= 0) return;
  c.save(); c.translate(x, y);
  const S = size, jit = S * .02;
  c.beginPath();
  const N = 32;
  for (let i = 0; i < N; i++) {
    const t = i / N * 4, side = Math.floor(t), u = t - side;
    let px, py; if (side === 0) { px = u * S; py = 0; } else if (side === 1) { px = S; py = u * S; } else if (side === 2) { px = S - u * S; py = S; } else { px = 0; py = S - u * S; }
    px += (vnoise(seed + i * 1.3) - .5) * jit * 2; py += (vnoise(seed + 40 + i * 1.3) - .5) * jit * 2;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath(); c.fillStyle = `rgba(${VERM.join(',')},${clamp(am)})`; c.fill();
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const chars = [...text];
  if (chars.length === 1) { c.font = `${S * .8}px ${BRUSH}`; c.fillText(chars[0], S * .5, S * .52); }
  else chars.forEach((ch, i) => { c.save(); c.translate(S * .5, S * (.28 + .46 * i)); c.scale(1.5, 1); c.font = `${S * .47}px ${BRUSH}`; c.fillText(ch, 0, 0); c.restore(); });
  for (let i = 0; i < 80; i++) { const a = vnoise(seed + i * 3.7), b = vnoise(seed + 91 + i * 2.9); c.globalAlpha = .45 + .55 * vnoise(i * 1.1); c.beginPath(); c.arc(a * S, b * S, S * (.004 + .013 * vnoise(i * 5.3)), 0, 7); c.fill(); }
  c.restore();
}
