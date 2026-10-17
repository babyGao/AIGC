// 统一运动轨迹
export function flowAt(flow, meta, x, y) {
  const { qw, qh, fq } = meta;
  const fx = Math.max(0, Math.min(qw - 1.001, x / fq - .5));
  const fy = Math.max(0, Math.min(qh - 1.001, y / fq - .5));
  const ix = fx | 0, iy = fy | 0, ax = fx - ix, ay = fy - iy;
  const at = (dx, dy, c) => flow[((iy + dy) * qw + ix + dx) * 2 + c] / 8;
  return [0, 1].map(c => (at(0, 0, c) * (1 - ax) + at(1, 0, c) * ax) * (1 - ay)
    + (at(0, 1, c) * (1 - ax) + at(1, 1, c) * ax) * ay);
}

export const transformPoint = (matrix, x, y) => [
  matrix[0][0] * x + matrix[0][1] * y + matrix[0][2],
  matrix[1][0] * x + matrix[1][1] * y + matrix[1][2],
];

export function makeMotion(flow, meta, parts, transforms) {
  const motion = (g, x, y) => {
    if (transforms.has(g)) return transformPoint(transforms.get(g), x, y);
    if (['slate', 'walnut', 'iron', 'glass'].includes(parts[g - 1]?.pal)) return [x, y];
    const [dx, dy] = flowAt(flow, meta, x, y);
    return [x + dx, y + dy];
  };
  motion.rigid = new Set(transforms.keys());
  return motion;
}

export function trajectory(stroke, motion, reverse = false) {
  const { x, y, ang } = stroke;
  const [px, py] = motion(stroke.g, x, y);
  const [tx, ty] = motion(stroke.g, x + Math.cos(ang) * 6, y + Math.sin(ang) * 6);
  let turn = Math.atan2(ty - py, tx - px) - ang;
  turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  if (!motion.rigid?.has(stroke.g)) turn = Math.max(-.12, Math.min(.12, turn));
  const scale = motion.rigid?.has(stroke.g) ? Math.hypot(tx - px, ty - py) / 6 : 1;
  if (reverse) {
    stroke.x = px; stroke.y = py; stroke.ang = ang + turn;
    stroke.px = x; stroke.py = y; stroke.turn = -turn;
    stroke.lenA = stroke.len * scale; stroke.lenB = stroke.len;
    stroke.widA = stroke.wid * scale; stroke.widB = stroke.wid;
  } else {
    stroke.px = px; stroke.py = py; stroke.turn = turn;
    stroke.lenA = stroke.len; stroke.lenB = stroke.len * scale;
    stroke.widA = stroke.wid; stroke.widB = stroke.wid * scale;
  }
  return stroke;
}

export function strokeAt(s, u) {
  if (s.px === undefined || s.fixed) return { ...s };
  return { ...s, x: s.x + (s.px - s.x) * u, y: s.y + (s.py - s.y) * u,
    ang: s.ang + s.turn * u, len: s.lenA + (s.lenB - s.lenA) * u,
    wid: s.widA + (s.widB - s.widA) * u };
}

export function commitStroke(s) {
  if (s.px !== undefined && !s.fixed) {
    s.x = s.px; s.y = s.py; s.ang += s.turn;
    s.len = s.lenB; s.wid = s.widB;
    delete s.px; delete s.py;
  }
  s.c = s.cA = s.cB; s.c2 = s.c2A = s.c2B;
  s.ph = 0;
}

export function retireCovered(list, born) {
  const cells = new Map(), size = 12;
  for (const s of list) {
    if (s.fixed || s.hl || s.ph === 2) continue;
    const key = `${s.g}:${Math.floor(s.px / size)}:${Math.floor(s.py / size)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(s);
  }
  let retired = 0;
  for (const b of born) {
    const ca = Math.cos(b.ang), sa = Math.sin(b.ang), r = (b.len + b.wid) * .5;
    for (let y = Math.floor((b.y - r) / size); y <= Math.floor((b.y + r) / size); y++)
      for (let x = Math.floor((b.x - r) / size); x <= Math.floor((b.x + r) / size); x++)
        for (const s of cells.get(`${b.g}:${x}:${y}`) || []) {
          if (s.ph === 2 || s.lenB * s.widB > b.len * b.wid * 2) continue;
          const dx = s.px - b.x, dy = s.py - b.y;
          if (Math.abs(dx * ca + dy * sa) < b.len * .4 && Math.abs(-dx * sa + dy * ca) < b.wid * .4) {
            s.ph = 2; retired++;
          }
        }
  }
  return retired;
}

export function boundsOf(lab, W, H, groups) {
  const boxes = Array.from({ length: groups }, () => [W, H, -1, -1]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const g = lab[y * W + x]; if (!g) continue;
    const b = boxes[g]; b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y);
    b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y);
  }
  return boxes;
}

export function motionMesh(box, g, motion, W, H, step = 12) {
  if (box[2] < box[0]) return new Float32Array();
  const [x0, y0] = box, x1 = Math.min(W, box[2] + 1), y1 = Math.min(H, box[3] + 1);
  const nx = Math.ceil((x1 - x0) / step), ny = Math.ceil((y1 - y0) / step);
  const data = new Float32Array(nx * ny * 24); let index = 0;
  const push = (x, y) => {
    const [px, py] = motion(g, x, y);
    data[index++] = x / W; data[index++] = y / H;
    data[index++] = px - x; data[index++] = py - y;
  };
  for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
    const x = x0 + ix * step, y = y0 + iy * step;
    const xx = Math.min(x1, x + step), yy = Math.min(y1, y + step);
    push(x, y); push(xx, y); push(x, yy);
    push(x, yy); push(xx, y); push(xx, yy);
  }
  return data;
}
