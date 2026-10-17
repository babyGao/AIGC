// 酱汁：贴着面包表面流动的酱线（沿顶面 → 翻过边缘 → 顺侧面下挂，末端鼓成液滴）、顶面酱池、上方落下的细流、蓝莓果粒
import * as THREE from 'three';
import { NOISE } from './glsl.js';

const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
const rc = new THREE.Raycaster();
const rnd = s => { let x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };

export const MAT = {
  cream: () => new THREE.MeshPhysicalMaterial({ color: '#efe0bf', roughness: .26, clearcoat: .55, clearcoatRoughness: .2, sheen: .4, sheenColor: new THREE.Color('#fff2d8'), sheenRoughness: .5 }),
  jam: () => new THREE.MeshPhysicalMaterial({ color: '#1c0a2a', roughness: .1, clearcoat: 1, clearcoatRoughness: .04, transmission: .06, thickness: 1.5, ior: 1.42, attenuationColor: new THREE.Color('#2a0c40'), attenuationDistance: .5, sheen: .25, sheenColor: new THREE.Color('#5a3a8a') }),
  syrup: () => new THREE.MeshPhysicalMaterial({ color: '#b8621a', roughness: .05, transmission: .35, thickness: .3, ior: 1.47, attenuationColor: new THREE.Color('#e08a2a'), attenuationDistance: 1.2, clearcoat: 1, clearcoatRoughness: .02, emissive: new THREE.Color('#d0661a'), emissiveIntensity: .85 }),
  milk: () => new THREE.MeshPhysicalMaterial({ color: '#f5f2ea', roughness: .18, clearcoat: .7, clearcoatRoughness: .1, sheen: .5, sheenColor: new THREE.Color('#ffffff') }),
  custard: () => speckled(new THREE.MeshPhysicalMaterial({ color: '#f0bd45', roughness: .2, clearcoat: .7, clearcoatRoughness: .08 })),
};
// 蛋液里的肉桂细点
function speckled(m) {
  m.customProgramCacheKey = () => 'custard';
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWP;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float sp = smoothstep(.83, .9, vn3(vWP * 9.)) + .6 * smoothstep(.86, .92, vn3(vWP * 17. + 4.));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.12, .045, .015), clamp(sp, 0., 1.) * .8);
        diffuseColor.rgb *= .94 + .1 * vn3(vWP * 1.3);`);
  };
  return m;
}

// —— 可变半径、贴面压扁的管子 ——
// pts: [{p, n}]（n = 表面法线，管子沿 n 方向压扁）；rad(u) 半径；flat 压扁比例
export function tubeGeo(pts, rad, o = {}) {
  const R = o.radial || 12, N = pts.length, flat = o.flat ?? .55;
  const pos = new Float32Array(N * (R + 1) * 3), idx = [];
  const T = new THREE.Vector3(), B = new THREE.Vector3(), Nn = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const a = pts[Math.max(0, i - 1)].p, b = pts[Math.min(N - 1, i + 1)].p;
    T.subVectors(b, a).normalize();
    Nn.copy(pts[i].n).addScaledVector(T, -pts[i].n.dot(T)).normalize();
    B.crossVectors(T, Nn).normalize();
    const u = i / (N - 1), r = rad(u, i);
    for (let k = 0; k <= R; k++) {
      const th = k / R * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
      // 贴面一侧（法线反方向）压平
      const cn = c < 0 ? c * .15 : c * flat;
      v.copy(pts[i].p).addScaledVector(Nn, cn * r).addScaledVector(B, s * r);
      pos.set([v.x, v.y, v.z], (i * (R + 1) + k) * 3);
    }
  }
  for (let i = 0; i < N - 1; i++) for (let k = 0; k < R; k++) {
    const a = i * (R + 1) + k, b = a + R + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// —— 贴面路径：先沿顶面朝 dir 走，过边缘后顺侧面往下 ——
export function crawlPath(targets, start, dir, o = {}) {
  const step = o.step ?? .18, lenTop = o.top ?? 3, lenDown = o.down ?? 4, seed = o.seed ?? 1, wig = o.wig ?? .25;
  const side = new THREE.Vector3().crossVectors(UP, dir).normalize();
  const out = [];
  let cur = start.clone(), phase = 0, edge = null, d = 0, s = 0;
  for (let it = 0; it < 400; it++) {
    if (phase === 0) {
      const g = start.clone().addScaledVector(dir, s).addScaledVector(side, Math.sin(s * 1.3 + seed) * wig * .4).addScaledVector(UP, 4);
      rc.set(g, DOWN); const h = rc.intersectObjects(targets, false)[0];
      if (!h || (out.length && h.point.y < out[out.length - 1].p.y - .8)) { phase = 1; edge = out.length ? out[out.length - 1].p.clone() : start.clone(); continue; }
      out.push({ p: h.point.clone(), n: h.face.normal.clone().transformDirection(h.object.matrixWorld) });
      if (s >= lenTop + 30) break;
      s += step;
    } else {
      // 侧面：从外侧水平射向面包
      const g = edge.clone().addScaledVector(dir, 4).addScaledVector(DOWN, d + .15).addScaledVector(side, Math.sin(d * .9 + seed * 2.1) * wig * .5);
      rc.set(g, dir.clone().negate()); const h = rc.intersectObjects(targets, false)[0];
      if (!h || d > lenDown) break;
      out.push({ p: h.point.clone(), n: h.face.normal.clone().transformDirection(h.object.matrixWorld) });
      d += step;
    }
  }
  return out;
}

// —— 一组酱线：每条有路径、粗细、开始时间与流速；每帧按时间重建几何 ——
export class Drips {
  constructor(mat, parent) { this.mat = mat; this.items = []; this.parent = parent; }
  add(path, o = {}) {
    if (path.length < 3) return;
    const m = new THREE.Mesh(new THREE.BufferGeometry(), this.mat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), this.mat); tip.castShadow = true;
    this.parent.add(m, tip);
    // 累计弧长
    const L = [0]; for (let i = 1; i < path.length; i++) L.push(L[i - 1] + path[i].p.distanceTo(path[i - 1].p));
    this.items.push({ path, L, total: L[L.length - 1], m, tip, r: o.r ?? .35, t0: o.t0 ?? 0, speed: o.speed ?? 3, slow: o.slow ?? .45, max: o.max ?? 1, key: -1 });
  }
  // t：从倒酱开始算的秒数
  update(t) {
    for (const d of this.items) {
      // 顶面上流得快，翻过边缘后越往下越慢（稠酱下挂）
      const tt = Math.max(0, t - d.t0);
      let len = d.speed * tt; const k = d.total * .45;
      if (len > k) len = k + (len - k) * d.slow / (1 + (len - k) * .08);
      len = Math.min(len, d.total * d.max);
      const key = Math.round(len * 40);
      d.m.visible = d.tip.visible = len > .05;
      if (!d.m.visible || key === d.key) continue;
      d.key = key;
      // 截取可见长度
      let n = 1; while (n < d.path.length - 1 && d.L[n] < len) n++;
      const pts = d.path.slice(0, n + 1).map(o => ({ p: o.p, n: o.n }));
      const r0 = d.r, NN = pts.length;
      d.m.geometry.dispose();
      const sd = d.t0 * 7.3 + d.r * 11;
      d.m.geometry = tubeGeo(pts, u => r0 * (1.45 - .75 * u + .3 * Math.max(0, (u - .86) / .14) ** 2) * (1 - .22 * Math.sin(u * 7 + sd) ** 2 - .1 * Math.sin(u * 23 + sd * 3) ** 2) * Math.min(1, (u * NN + 1) / 3), { flat: .36 });
      const end = pts[NN - 1];
      d.tip.position.copy(end.p).addScaledVector(end.n, r0 * .35);
      const tr = r0 * (.62 + .18 * Math.min(1, len / 4));
      d.tip.scale.set(tr * 1.05, tr * 1.35, tr * .62);
      d.tip.lookAt(d.tip.position.clone().add(end.n));
    }
  }
}

// —— 顶面酱池：先在顶面打一张高度格，再把带噪声轮廓的圆片贴上去，按 g 长大 ——
export function heightField(targets, cx, cz, size, n = 48) {
  const H = new Float32Array(n * n), Nn = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = cx + (i / (n - 1) - .5) * size, z = cz + (j / (n - 1) - .5) * size;
    rc.set(new THREE.Vector3(x, 60, z), DOWN); const h = rc.intersectObjects(targets, false)[0];
    H[j * n + i] = h ? h.point.y : -999;
  }
  return { H, n, cx, cz, size, at(x, z) {
    const fx = ((x - cx) / size + .5) * (n - 1), fz = ((z - cz) / size + .5) * (n - 1);
    const i = Math.max(0, Math.min(n - 2, Math.floor(fx))), j = Math.max(0, Math.min(n - 2, Math.floor(fz))), u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fz - j));
    const a = H[j * n + i], b = H[j * n + i + 1], c = H[(j + 1) * n + i], d = H[(j + 1) * n + i + 1];
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  } };
}
export class Pool {
  constructor(mat, parent, hf, o = {}) {
    this.hf = hf; this.o = o; this.seed = o.seed ?? 1;
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    parent.add(this.mesh); this.key = -1;
  }
  // g：0→1 长大；中心 (x, z)，半径 rx/rz，厚度 h，转角 rot
  update(g) {
    const o = this.o, key = Math.round(g * 300);
    this.mesh.visible = g > .002; if (!this.mesh.visible || key === this.key) return; this.key = key;
    const R = 72, rings = 14, pos = [], idx = [];
    const rx = o.rx * (.15 + .85 * g), rz = o.rz * (.15 + .85 * g), h = o.h * (.5 + .5 * g), ca = Math.cos(o.rot || 0), sa = Math.sin(o.rot || 0);
    pos.push(o.x, this.hf.at(o.x, o.z) + h, o.z);
    for (let r = 1; r <= rings; r++) {
      const f = r / rings;
      for (let k = 0; k < R; k++) {
        const th = k / R * Math.PI * 2;
        const wob = 1 + .16 * Math.sin(th * 3 + this.seed) + .09 * Math.sin(th * 7 + this.seed * 2.3) + .05 * Math.sin(th * 13 + this.seed * 4.1);
        const lx = Math.cos(th) * rx * f * wob, lz = Math.sin(th) * rz * f * wob;
        const x = o.x + lx * ca - lz * sa, z = o.z + lx * sa + lz * ca;
        const prof = Math.sqrt(Math.max(0, 1 - f ** 4));   // 边缘圆润地落到表面
        let y = this.hf.at(x, z); if (y < -900) y = o.floor ?? 0;
        pos.push(x, y + .02 + h * prof, z);
      }
    }
    for (let k = 0; k < R; k++) idx.push(0, 1 + (k + 1) % R, 1 + k);
    for (let r = 1; r < rings; r++) for (let k = 0; k < R; k++) {
      const a = 1 + (r - 1) * R + k, b = 1 + (r - 1) * R + (k + 1) % R, c = a + R, d = b + R;
      idx.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    this.mesh.geometry.dispose(); this.mesh.geometry = geo;
  }
}

// —— 从上方落下的细流：顶端随时间往下收（倒完时整股落下），带轻微摆动 ——
export class Stream {
  constructor(mat, parent, o = {}) {
    this.o = o; this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); this.mesh.frustumCulled = false; this.mesh.castShadow = true;
    parent.add(this.mesh);
  }
  // top / bot：当前细流上下端 y；t：秒（用于摆动）
  update(top, bot, t) {
    const o = this.o; this.mesh.visible = top > bot + .05; if (!this.mesh.visible) return;
    const N = 48, pts = [];
    for (let i = 0; i < N; i++) {
      const y = top + (bot - top) * i / (N - 1);
      const fall = Math.max(0, (o.from ?? top) - y);   // 下落越久越细
      const sw = (o.sway ?? .08) * Math.sin(y * .7 + t * 5.3) * Math.min(1, fall / 6);
      pts.push({ p: new THREE.Vector3(o.x + sw, y, o.z + sw * .6), n: new THREE.Vector3(0, 0, 1) });
    }
    const r0 = o.r ?? .12, from = o.from ?? top;
    this.mesh.geometry.dispose();
    this.mesh.geometry = tubeGeo(pts, (u, i) => { const y = pts[i].p.y; const fall = Math.max(0, from - y); return r0 * (1.6 / (1 + fall * .25) + .55) * (1 + .1 * Math.sin(y * 3.1 + t * 9)); }, { flat: 1, radial: 10 });
  }
}

// —— 蓝莓：略扁的球，顶部有五角花萼凹陷 ——
export function berryGeo() {
  const g = new THREE.SphereGeometry(1, 28, 20), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.y *= .86;
    const top = Math.max(0, v.y / .86), th = Math.atan2(v.z, v.x);
    const crown = Math.pow(Math.max(0, top - .78) / .22, 1.5);
    v.multiplyScalar(1 - crown * (.22 + .1 * Math.cos(th * 5)));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
export const berryMat = () => new THREE.MeshPhysicalMaterial({ color: '#232347', roughness: .22, clearcoat: .9, clearcoatRoughness: .1, sheen: .6, sheenColor: new THREE.Color('#5a5c8c'), sheenRoughness: .4 });

export { rnd };
