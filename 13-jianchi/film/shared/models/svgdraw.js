// 母版 → 干净线稿 SVG（预览、对位检查用；各风格引擎另有自己的画法）
import { smoothD, strokeOutline } from './curve.js';
import { lockPoly, lockStrands } from './hair.js';

const INK = '#161515', ROBE = '#f4f2ec', ROBE_IN = '#d8d4cc', SKIN = '#f6efe7', LINE = 'rgb(40,38,36)';
const FACE_KEYS = k => !/^(lapel|shoulder|neckR)/.test(k);

export function modelSVG(M, lib, { overlay = false } = {}) {
  const a = overlay ? 0.55 : 1;
  let defs = '', g = '', uid = 0;
  const fill = (col, pts, edge = 0) => `<path d="${smoothD(pts, true)}" fill="${col}" fill-opacity="${a}"${edge ? ` stroke="${LINE}" stroke-width="${edge}" stroke-opacity="${a}"` : ''}/>`;
  const poly = (col, pts) => `<path d="M${pts.map(p => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join('L')}Z" fill="${col}" fill-opacity="${a}"/>`;
  const line = (pts, w, dark) => {
    const o = strokeOutline(pts, u => w * Math.min(1, u / 0.18, (1 - u) / 0.22) ** 0.6 + w * 0.08);
    const v = Math.round(22 + (1 - dark) * 150);
    return `<path d="${smoothD(o, true)}" fill="rgb(${v},${v - 2},${v - 4})" fill-opacity="${overlay ? 0.9 : 1}"/>`;
  };
  const strands = (lk, n, seed, w) => lockStrands(lk, n, seed).map(s => `<path d="${smoothD(s)}" fill="none" stroke="#77736f" stroke-width="${w}" stroke-opacity="${overlay ? 0.6 : 0.8}" stroke-linecap="round"/>`).join('');
  const L = M.locks || {}, sw = M.strandW || 0.45, ew = M.edgeW || 0.9;

  (L.back || []).forEach((lk, i) => { g += poly(INK, lockPoly(lk)); g += strands(lk, 7, 11 + i, sw); });
  if (M.skirt) g += fill(ROBE, M.skirt, ew);
  if (M.torso) g += fill(ROBE, M.torso, ew);
  for (const s of M.sleeves || []) g += fill(ROBE, s, ew);
  for (const c of M.cuffs || []) g += fill(ROBE_IN, c, ew * 0.6);
  if (M.robe) g += fill(ROBE, M.robe);
  for (const c of M.collarIn || []) g += fill('#e3e0d8', c);
  if (M.neck) g += fill('#efe6dc', M.neck);
  if (M.sash) g += fill(INK, M.sash);
  if (M.knot) g += fill(INK, M.knot);
  for (const t of M.tails || []) g += line(t, 6, 1);
  for (const s of M.shoes || []) g += fill(INK, s);
  if (M.head) for (const [k, [pts, w, dark]] of Object.entries(M.lines || {})) g += /^sash/.test(k) ? line(pts, w, 0) .replace(/rgb\([^)]*\)/, '#5a5652') : line(pts, w, dark);

  // 头：引用另一份母版（脸部诸层），按下巴对位缩放
  const face = (F, linesFilter, withBack) => {
    let h = '';
    if (withBack) ((F.locks || {}).back || []).forEach((lk, i) => { h += poly(INK, lockPoly(lk)); h += strands(lk, 7, 61 + i, 0.45); });
    if (F.ear && !F.earOver) h += fill('#efe5da', F.ear) + line(F.ear, 0.7, 0.6);
    if (F.skin) h += fill(SKIN, F.skin);
    for (const sh of F.shade || []) h += fill('#cfc9c2', sh);
    (F.eyes || []).forEach(e => {
      const id = 'eye' + (uid++), open = e.up.concat(e.low.slice().reverse());
      defs += `<clipPath id="${id}"><path d="${smoothD(open, true)}"/></clipPath>`;
      h += fill('#fbfaf6', open);
      const [cx, cy, r] = e.iris;
      h += `<g clip-path="url(#${id})"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#3a3634"/><circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="#141212"/></g>`;
    });
    for (const [k, [pts, w, dark]] of Object.entries(F.lines || {})) if (linesFilter(k)) h += line(pts, w, dark);
    if (F.part) h += `<path d="${smoothD(F.part)}" fill="none" stroke="#77736f" stroke-width="0.5"/>`;
    (F.side || (F.locks || {}).side || []).forEach((lk, i) => { h += poly(INK, lockPoly(lk)); h += strands(lk, 4, 71 + i, 0.45); });
    if (F.ear && F.earOver) h += fill('#efe5da', F.ear) + line(F.ear, 0.7, 0.6);
    ((F.locks || {}).front || []).forEach((lk, i) => { h += poly(INK, lockPoly(lk)); h += strands(lk, 3, 31 + i, 0.45); });
    return h;
  };
  if (M.head) {
    const F = lib[M.head.src], { from, at, s, clipY } = M.head;
    if (clipY) defs += `<clipPath id="hc"><rect x="-9999" y="-9999" width="29999" height="${9999 + clipY}"/></clipPath>`;
    g += `<g${clipY ? ' clip-path="url(#hc)"' : ''}><g transform="translate(${at[0]},${at[1]}) scale(${s}) translate(${-from[0]},${-from[1]})">${face(F, FACE_KEYS, M.head.withBack)}</g></g>`;
  } else {
    g += face(M, () => true);
  }
  (L.over || []).forEach((lk, i) => { g += poly(INK, lockPoly(lk)); g += strands(lk, 6, 51 + i, sw); });
  if (M.head) (L.front || []).forEach((lk, i) => { g += poly(INK, lockPoly(lk)); g += strands(lk, 3, 41 + i, sw); });
  (L.stray || []).forEach(lk => { g += poly(INK, lockPoly(lk)); });
  return `<defs>${defs}</defs>${g}`;
}

// 通用：画面指令 → SVG（配角母版预览用）
const OPC = { hair: '#161515', hairW: '#f3f1ec', robe: '#f4f2ec', robeD: '#3b3e46', fur: '#ebe8e1', skin: '#f3e7da', dark: '#2a1715', ink: '#161515', shade: '#d3ccc4', collar: '#e3e0d8', robeIn: '#d8d4cc', purple: '#6b4a8a', blue: '#3d6fa8', gold: '#b88a3a', red: '#a8322a', green: '#5d8f3a', purpleD: '#3d2a55', furL: '#c8b6d8', pink: '#c9707a', tooth: '#f6f2ea' };
export function opsSVG(ops, { overlay = false } = {}) {
  const a = overlay ? 0.55 : 1; let g = '', defs = '', uid = 0;
  const P = pts => 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
  for (const op of ops) {
    if (op.poly) {
      const edge = /^(hairW|robe|fur|skin)$/.test(op.role) ? ` stroke="#2a2826" stroke-width="${op.role === 'fur' ? 1.2 : 1.6}" stroke-opacity="${a}"` : '';
      g += `<path d="${P(op.poly)}Z" fill="${OPC[op.role] || '#888'}" fill-opacity="${a}"${op.role === 'shade' ? '' : edge}/>`;
    } else if (op.role === 'strand') g += `<path d="${P(op.pts)}" fill="none" stroke="${op.on === 'hairW' ? '#9a958f' : '#77736f'}" stroke-width="${op.w}" stroke-opacity="${a}" stroke-linecap="round"/>`;
    else if (op.role === 'line') { const o = strokeOutline(op.pts, u => op.w * Math.min(1, u / 0.15, (1 - u) / 0.2) ** 0.6 + op.w * .1); const v = Math.round(22 + (1 - op.dark) * 150); g += `<path d="${P(o)}Z" fill="rgb(${v},${v - 2},${v - 4})" fill-opacity="${overlay ? .9 : 1}"/>`; }
    else if (op.role === 'eye') { const id = 'e' + (uid++); defs += `<clipPath id="${id}"><path d="${P(op.open)}Z"/></clipPath>`; g += `<path d="${P(op.open)}Z" fill="#fbfaf6" fill-opacity="${a}"/><g clip-path="url(#${id})"><circle cx="${op.iris[0]}" cy="${op.iris[1]}" r="${op.iris[2]}" fill="${op.red ? '#8e2a22' : op.color === 'purple' ? '#7a4aa8' : '#3a3634'}"/><circle cx="${op.iris[0]}" cy="${op.iris[1]}" r="${op.iris[2] * .5}" fill="#141212"/></g>`; }
  }
  return `<defs>${defs}</defs>${g}`;
}
