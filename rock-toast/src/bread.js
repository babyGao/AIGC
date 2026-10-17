// 吐司：整条布里欧修坐标系里切出的方块（倒圆外皮 + 平直切面 + 顶部穹顶），程序着色出面包芯气孔、外皮、蛋液浸润、焦糖豹纹
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { NOISE, BUMP } from './glsl.js';

// 整条面包（厘米）：宽 x、高 y（底 0）、长 z
export const LOAF = { w: 10.6, h: 9.0, len: 20.4, dome: 1.7, r: 1.15 };
const SS = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const FACE = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
// 位置决定的三维值噪声：同一位置的顶点位移相同，切面与外皮的接缝不会裂开
const hs = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function vn(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), f = v => v * v * (3 - 2 * v);
  const u = f(x - xi), v = f(y - yi), w = f(z - zi), L = (a, b, t) => a + (b - a) * t;
  const c = (i, j, k) => hs(xi + i, yi + j, zi + k);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}

// box：整条面包坐标里的范围；faces：每面 0 外皮 / 1 切面（会被煎）/ 2 叉开的内部（不煎）
export function makeBlock(box, faces, o = {}) {
  const { x0, x1, y0, y1, z0, z1 } = box, R = o.r ?? LOAF.r, den = o.den ?? 3;
  const n = v => Math.max(4, Math.round(v * den));
  const g = new THREE.BoxGeometry(1, 1, 1, n(x1 - x0), n(y1 - y0), n(z1 - z0));
  const pos = g.attributes.position, N = pos.count;
  const faceOf = new Uint8Array(N);
  g.groups.forEach((gr, k) => { for (let i = gr.start; i < gr.start + gr.count; i++) faceOf[g.index.array[i]] = k; });
  const rr = k => (faces[k] ?? 0) === 0 ? R : 0;
  const ib = [x0 + rr('nx'), x1 - rr('px'), y0 + rr('ny'), y1 - rr('py'), z0 + rr('nz'), z1 - rr('pz')];
  const cs = u => .5 - .5 * Math.cos(Math.PI * (u + .5));   // 余弦分布：边缘更密，倒圆更顺
  const loaf = new Float32Array(N * 3), cut = new Float32Array(N);
  const pv = o.pivot || [(x0 + x1) / 2, y0, (z0 + z1) / 2];
  for (let i = 0; i < N; i++) {
    const P = [x0 + (x1 - x0) * cs(pos.getX(i)), y0 + (y1 - y0) * cs(pos.getY(i)), z0 + (z1 - z0) * cs(pos.getZ(i))], P0 = P.slice();
    const C = [Math.min(ib[1], Math.max(ib[0], P[0])), Math.min(ib[3], Math.max(ib[2], P[1])), Math.min(ib[5], Math.max(ib[4], P[2]))];
    const D = [P[0] - C[0], P[1] - C[1], P[2] - C[2]], L = Math.hypot(...D);
    if (L > 1e-6) for (let k = 0; k < 3; k++) P[k] = C[k] + D[k] / L * R;
    // 面包形：顶部略外扩（蘑菇顶）、穹顶
    const yb = P[1];
    P[0] *= 1 + .045 * SS(.62 * LOAF.h, .92 * LOAF.h, yb);
    P[1] += LOAF.dome * Math.pow(Math.max(0, 1 - (2 * P[0] / LOAF.w) ** 2), .6) * SS(.5 * LOAF.h, LOAF.h, yb);
    // 鼓胀：连续的位移场（按整块的范围算），各面中间微微外凸；同一位置位移相同，接缝不裂，半块与整块严丝合缝
    const FB = o.full || box, FF = o.fullFaces || faces;
    const nn = [(P0[0] - (FB.x0 + FB.x1) / 2) / (FB.x1 - FB.x0), (P0[1] - (FB.y0 + FB.y1) / 2) / (FB.y1 - FB.y0), (P0[2] - (FB.z0 + FB.z1) / 2) / (FB.z1 - FB.z0)];
    for (let ax = 0; ax < 3; ax++) {
      const o1 = (ax + 1) % 3, o2 = (ax + 2) % 3, sg = nn[ax] >= 0 ? 1 : -1, ft = FF[(sg > 0 ? 'p' : 'n') + 'xyz'[ax]] ?? 0;
      const mag = (ft === 1 ? .32 : ft === 2 ? 0 : .18) * (o.puff ?? 1);
      const pil = Math.max(0, 1 - (2 * nn[o1]) ** 2) * Math.max(0, 1 - (2 * nn[o2]) ** 2);
      P[ax] += sg * mag * pil * SS(.22, .5, Math.abs(nn[ax]));
    }
    // 不规整：低频向量噪声（按位置取值）
    const s = .32, a = .2 * (o.wob ?? 1), s2 = 1.1, a2 = .05;
    const X = P[0] + (o.seed ?? 0) * 7, Y = P[1], Z = P[2];
    P[0] += a * vn(X * s, Y * s, Z * s) + a2 * vn(X * s2 + 9, Y * s2, Z * s2);
    P[1] += a * vn(X * s + 31, Y * s, Z * s) * .7 + a2 * vn(X * s2, Y * s2 + 5, Z * s2);
    P[2] += a * vn(X * s, Y * s + 17, Z * s) + a2 * vn(X * s2, Y * s2, Z * s2 + 3);
    loaf.set(P, i * 3);
    cut[i] = faces[FACE[faceOf[i]]] ?? 0;
    pos.setXYZ(i, P[0] - pv[0], P[1] - pv[1], P[2] - pv[2]);
  }
  g.setAttribute('aLoaf', new THREE.BufferAttribute(loaf, 3));
  g.setAttribute('aCut', new THREE.BufferAttribute(cut, 1));
  g.deleteAttribute('uv'); g.deleteAttribute('normal'); g.clearGroups();
  const m = mergeVertices(g, 1e-4); m.computeVertexNormals();
  m.userData.pivot = pv; m.userData.box = box;
  return m;
}

export function breadMat(o = {}) {
  const U = {
    uSoak: { value: o.soak ?? 0 }, uToast: { value: o.toast ?? 0 }, uToastCut: { value: o.toastCut ?? 0 },
    uOil: { value: o.oil ?? 0 }, uSeed: { value: o.seed ?? 0 }, uBump: { value: o.bump ?? 1 }, uWarm: { value: o.warm ?? 0 },
  };
  const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .6, clearcoat: 1, clearcoatRoughness: .25, sheen: .25, sheenRoughness: .6, sheenColor: new THREE.Color('#ffe2b0') });
  m.userData.U = U;
  m.customProgramCacheKey = () => 'bread1';
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aCut; attribute vec3 aLoaf; varying float vCut; varying vec3 vLoaf;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCut = aCut; vLoaf = aLoaf;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uSoak, uToast, uToastCut, uOil, uSeed, uBump, uWarm; varying float vCut; varying vec3 vLoaf;
${NOISE}
${BUMP}
vec3 sr(vec3 c){ return pow(c, vec3(2.2)); }
void bread(out vec3 col, out float rough, out float hgt, out float cc){
  vec3 p = vLoaf + uSeed * 13.17;
  float fw = length(fwidth(vLoaf));                       // 每像素覆盖的厘米数：细节随距离淡出，防闪烁
  float aa1 = 1. - smoothstep(.07, .18, fw), aa2 = 1. - smoothstep(.03, .09, fw);
  float isCut = step(.5, vCut), isIn = step(1.5, vCut);
  vec3 q = p + .45 * vec3(fbs(p * 1.1), fbs(p * 1.1 + 7.), fbs(p * 1.1 + 13.));
  // 面包芯：大气孔（1–3 毫米）+ 细孔 + 拉丝
  vec2 w1 = wor3(q * vec3(1.7, 2.2, 1.7)); float pore = pow(1. - smoothstep(.0, .5, w1.x), 2.) * aa1;
  vec2 w2 = wor3(q * 4.6 + 3.1); float pore2 = pow(1. - smoothstep(.0, .42, w2.x), 1.6) * aa2;
  float fib = fbs(p * vec3(4.5, 1.6, 4.5));
  vec3 crumb = mix(sr(vec3(.86, .76, .56)), sr(vec3(.97, .90, .74)), fib) * (1. - .7 * pore - .3 * pore2);
  vec3 soak = mix(sr(vec3(.90, .66, .25)), sr(vec3(.99, .83, .42)), fib) * (1. - .55 * pore - .25 * pore2);
  // 煎面：贴锅起泡的鼓包先焦，块状区域再加深（颜色和起伏同源）
  vec2 bw = wor3(q * 1.0 + 5.); float blis = 1. - smoothstep(.0, .95, bw.x);
  float patchN = fbs(p * .45 + 2.), nF = sn3(p * 5.5 + 1.);
  float brown = smoothstep(.1, .9, blis * .42 + patchN * .9 - .26 + nF * .08 * aa1);
  float dark = smoothstep(.82, 1., blis * .5 + patchN * .6);
  float cin = smoothstep(.8, .86, sn3(p * 9.)) * aa2;
  float g2 = clamp((uToast - .3) / .7, 0., 1.), g2c = clamp((uToastCut - .3) / .7, 0., 1.);
  vec3 goldL = sr(vec3(.87, .63, .29)), amber = sr(vec3(.74, .45, .17)), cara = sr(vec3(.52, .28, .10)), burnt = sr(vec3(.28, .14, .06));
  #define SEAR(b, d) mix(mix(mix(goldL, amber, smoothstep(.0, .65, b)), cara, smoothstep(.55, 1., b) * .85), burnt, (d) * .55)
  float bK = brown * g2c, bC = brown * g2;
  vec3 searK = SEAR(bK, dark * g2c) * (1. - .5 * pore2 - .45 * pore); searK = mix(searK, burnt, cin * .5 * g2c);
  float top = smoothstep(.55, .98, vLoaf.y / 9.0);
  vec3 searC = SEAR(min(1., bC + .1 * top), dark * g2) * (.93 + .14 * nF * aa1); searC = mix(searC, burnt, cin * .35 * g2);
  // 生外皮：顶部深金棕、侧面浅金
  float mott = fbs(p * 1.4);
  vec3 crust = mix(sr(vec3(.80, .60, .34)), sr(vec3(.50, .27, .11)), top) * (.88 + .24 * mott);
  crust = mix(crust, crust * sr(vec3(1.04, .98, .78)) + sr(vec3(.08, .06, .0)), uSoak * .5);
  float nT = fbs(p * .6 + 5.3) * .75 + brown * .25;
  float tCrust = smoothstep(nT - .1, nT + .1, uToast * 1.6);
  float tCut = smoothstep(nT - .1, nT + .1, uToastCut * 1.6) * (1. - isIn);
  vec3 cutCol = mix(mix(crumb, soak, uSoak), searK, tCut);
  // 叉开的内部：湿润、更亮的蛋奶黄
  vec3 inner = mix(soak, sr(vec3(1., .86, .46)), .35) * (1. - .45 * pore - .2 * pore2);
  cutCol = mix(cutCol, inner, isIn);
  col = mix(mix(crust, searC, tCrust), cutCol, isCut);
  col *= 1. + uWarm * vec3(.06, .0, -.06);
  // 粗糙度 / 清漆（油光落在鼓包上）/ 高度
  float rC = mix(mix(.62, .38, top), .45, uSoak * .5); rC = mix(rC, .5 - uOil * .2 * blis + .12 * bC, tCrust);
  float rK = mix(mix(.86, .56, uSoak), .52 - uOil * .14 * blis + .2 * pore, tCut); rK = mix(rK, .3, isIn);
  rough = mix(rC, rK, isCut);
  cc = mix(mix(.12 + .45 * top, .08 + .4 * uOil * blis, tCrust), mix(.0, .05 + .3 * uOil * blis * (1. - pore), tCut) + isIn * .4, isCut);
  float hC = fbs(p * 1.8) * .35 + blis * .9 * tCrust + sn3(p * 6.) * .18 * aa1;
  float hK = -pore * 1.6 - pore2 * .7 + fib * .2 + blis * .5 * tCut;
  hgt = mix(hC, hK, isCut);
}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\nvec3 bC; float bR, bH, bCC; bread(bC, bR, bH, bCC); diffuseColor.rgb = bC;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = bR;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = bumpN(-vViewPosition, normal, bH, 1.6 * uBump, faceDirection);')
      .replace('#include <lights_physical_fragment>', THREE.ShaderChunk.lights_physical_fragment.replace('material.clearcoat = clearcoat;', 'material.clearcoat = clearcoat * bCC;'));
  };
  return m;
}

// 一块吐司网格（带材质与参数句柄）
export function breadPiece(box, faces, o = {}) {
  const geo = makeBlock(box, faces, o), mat = breadMat(o);
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.U = mat.userData.U;
  return mesh;
}

// 切好的半条（约四英寸厚）：z 方向 [0, len/2]，z=0 是刀口（切面），另一端是面包头外皮
export const HALF = { x0: -LOAF.w / 2, x1: LOAF.w / 2, y0: 0, y1: LOAF.h, z0: 0, z1: LOAF.len / 2 };
