// 器具：炭灰石盘、胡桃木底座、暗色台面、水晶杯、深色碗、铸铁锅、面包刀、叉子（全部程序建模，单位厘米）
import * as THREE from 'three';
import { NOISE } from './glsl.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const lathe = (pts, seg = 128) => new THREE.LatheGeometry(pts.map(p => V2(...p)), seg);

// 石器斑点：哑光釉面上的细小深浅点（物体空间，不随镜头闪）
function speckle(mat, o = {}) {
  const sc = o.scale ?? 2.2, amt = o.amt ?? .35;
  mat.customProgramCacheKey = () => 'speck' + sc + amt;
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vOP;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float s1 = smoothstep(.83, .9, vn3(vOP * ${(sc * 6).toFixed(2)})), s2 = smoothstep(.8, .88, vn3(vOP * ${(sc * 3.1).toFixed(2)} + 7.));
        float cl = fbm3(vOP * ${(sc * .4).toFixed(2)});
        diffuseColor.rgb *= (1. + ${amt.toFixed(2)} * (s1 * .9 - s2 * .5)) * (.9 + .2 * cl);`)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness * (.85 + .3 * fbm3(vOP * ${(sc * 1.3).toFixed(2)}));`);
  };
  return mat;
}

export function makePlate() {
  // 直径 29 厘米的炭灰哑光石盘：宽平底 + 缓坡 + 平沿
  const g = lathe([[0, .62], [1.5, .62], [3, .62], [4.5, .62], [6, .62], [7.4, .62], [8.6, .62], [9.5, .7], [10.4, .85], [12.4, 1.45], [13.6, 1.7], [14.3, 1.74], [14.55, 1.6], [14.5, 1.38], [13.4, 1.2], [11.6, .7], [8.2, .22], [7.4, 0], [6.8, 0], [0, 0]], 160);
  g.computeVertexNormals();
  const m = speckle(new THREE.MeshPhysicalMaterial({ color: '#1f1d1c', roughness: .82, clearcoat: .0, specularIntensity: .35 }), { scale: 2.4, amt: .45 });
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = mesh.castShadow = true;
  mesh.userData.top = .62;
  return mesh;
}

export function makeBowl() {
  const g = lathe([[0, .7], [5, .78], [7.4, 2.2], [8.7, 4.5], [9.05, 4.75], [9.3, 4.6], [8.1, 2.1], [5.4, .32], [4.6, 0], [0, 0]]);
  g.computeVertexNormals();
  const m = speckle(new THREE.MeshPhysicalMaterial({ color: '#211e1c', roughness: .32, clearcoat: .6, clearcoatRoughness: .2 }), { scale: 2, amt: .25 });
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = mesh.castShadow = true;
  return mesh;
}

export function makePan() {
  const grp = new THREE.Group();
  const g = lathe([[0, .55], [11.3, .55], [12.3, 1.3], [12.9, 4.3], [13.35, 4.42], [13.5, 4.15], [12.8, .7], [11.9, 0], [0, 0]], 160);
  g.computeVertexNormals();
  const iron = speckle(new THREE.MeshPhysicalMaterial({ color: '#141312', roughness: .5, metalness: .55, clearcoat: .35, clearcoatRoughness: .35 }), { scale: 3, amt: .5 });
  const pan = new THREE.Mesh(g, iron); pan.receiveShadow = pan.castShadow = true; grp.add(pan);
  const h = new THREE.Mesh(new THREE.BoxGeometry(16, 1.3, 2.6), iron); h.position.set(20, 3.6, 0); h.rotation.z = .18; grp.add(h);
  // 油面：极薄、极亮
  const oil = new THREE.Mesh(new THREE.CircleGeometry(11.6, 96), new THREE.MeshPhysicalMaterial({ color: '#2a1c08', roughness: .03, metalness: 0, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .55 }));
  oil.rotation.x = -Math.PI / 2; oil.position.y = .62; grp.add(oil);
  grp.userData = { oil, top: .62 };
  return grp;
}

export function makeCup() {
  // 无刻度水晶杯
  const g = lathe([[0, .95], [3.72, .95], [3.92, 9.6], [4.06, 9.72], [4.2, 9.62], [4.02, .25], [3.8, 0], [0, 0]], 128);
  g.computeVertexNormals();
  const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .015, transmission: 1, thickness: .5, ior: 1.52, side: THREE.DoubleSide, specularIntensity: 1, envMapIntensity: 1.2 });
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.userData = { innerR: 3.7, base: .95, top: 9.6, noAO: true };
  return mesh;
}

export function makeTable() {
  const m = speckle(new THREE.MeshPhysicalMaterial({ color: '#141210', roughness: .9, specularIntensity: .3 }), { scale: .8, amt: .3 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), m);
  mesh.rotation.x = -Math.PI / 2; mesh.receiveShadow = true;
  return mesh;
}

export function makeBoard(tex) {
  // 胡桃木圆底座（贴图为 Poly Haven CC0 胡桃木）
  const m = new THREE.MeshPhysicalMaterial({ map: tex.diff, normalMap: tex.nor, roughnessMap: tex.rough, color: '#4a372b', roughness: 1, clearcoat: .1, clearcoatRoughness: .5, specularIntensity: .4 });
  const g = new THREE.CylinderGeometry(17, 17.2, 2.4, 128);
  const mesh = new THREE.Mesh(g, m); mesh.position.y = 1.2; mesh.receiveShadow = mesh.castShadow = true;
  mesh.userData.top = 2.4;
  return mesh;
}

export function makeCutBoard(tex) {
  // 长方切菜板（倒圆）
  const s = new THREE.Shape(); const W = 22, D = 34, r = 3;
  s.moveTo(-W + r, -D); s.lineTo(W - r, -D); s.quadraticCurveTo(W, -D, W, -D + r); s.lineTo(W, D - r); s.quadraticCurveTo(W, D, W - r, D);
  s.lineTo(-W + r, D); s.quadraticCurveTo(-W, D, -W, D - r); s.lineTo(-W, -D + r); s.quadraticCurveTo(-W, -D, -W + r, -D);
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.2, bevelEnabled: true, bevelThickness: .35, bevelSize: .35, bevelSegments: 4, curveSegments: 12 });
  g.rotateX(-Math.PI / 2); g.translate(0, .35, 0);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 40, uv.getY(i) / 40);
  const m = new THREE.MeshPhysicalMaterial({ map: tex.diff, normalMap: tex.nor, roughnessMap: tex.rough, color: '#6e4f3c', roughness: 1, clearcoat: .15, clearcoatRoughness: .5 });
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = mesh.castShadow = true;
  mesh.userData.top = 2.9;
  return mesh;
}

const chrome = () => new THREE.MeshPhysicalMaterial({ color: '#e6e2dc', metalness: 1, roughness: .26, envMapIntensity: 2.6, clearcoat: .4, clearcoatRoughness: .1 });

export function makeKnife() {
  // 锯齿面包刀：刀身沿 +x，刃口在 y=0（锯齿），刀背 y=3.1；刀柄在 x<0
  const grp = new THREE.Group();
  const s = new THREE.Shape(); s.moveTo(0, 3.1); s.lineTo(23.5, 3.1); s.quadraticCurveTo(27, 3.0, 27.6, .55);
  for (let x = 27.2; x > .6; x -= .55) { s.lineTo(x, .02); s.quadraticCurveTo(x - .275, .32, x - .55, .02); }
  s.lineTo(0, 0); s.lineTo(0, 3.1);
  const g = new THREE.ExtrudeGeometry(s, { depth: .1, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -.05);
  const blade = new THREE.Mesh(g, chrome()); blade.castShadow = true; grp.add(blade);
  const hs = new THREE.Shape(); hs.moveTo(-12.5, .6); hs.quadraticCurveTo(-13.2, 1.6, -12.5, 2.9); hs.lineTo(-.2, 3.2); hs.lineTo(-.2, .2); hs.lineTo(-12.5, .6);
  const hg = new THREE.ExtrudeGeometry(hs, { depth: 1.5, bevelEnabled: true, bevelThickness: .35, bevelSize: .3, bevelSegments: 5 });
  hg.translate(0, 0, -.75);
  const handle = new THREE.Mesh(hg, new THREE.MeshPhysicalMaterial({ color: '#2a1a12', roughness: .45, clearcoat: .5 })); handle.castShadow = true; grp.add(handle);
  return grp;
}

export function makeFork() {
  // 叉子：沿 +x，叉齿在前端，平放厚度方向为 z；头部向下弯
  const s = new THREE.Shape();
  s.moveTo(-12, -.55); s.quadraticCurveTo(-12.8, 0, -12, .55); s.lineTo(-2.2, .32); s.quadraticCurveTo(-.4, .3, .2, 1.15); s.lineTo(4.6, 1.15);
  const tw = .32, gap = (2.3 - 4 * tw) / 3;
  let y = 1.15;
  for (let k = 0; k < 4; k++) {
    const y1 = y - tw;
    s.lineTo(4.75, y - .05); s.quadraticCurveTo(4.85, y - tw / 2, 4.75, y1 + .05); s.lineTo(4.6, y1);
    if (k < 3) { s.lineTo(1.0, y1); s.quadraticCurveTo(.85, y1 - gap / 2, 1.0, y1 - gap); s.lineTo(4.6, y1 - gap); y = y1 - gap; } else y = y1;
  }
  s.lineTo(.2, -1.15); s.quadraticCurveTo(-.4, -.3, -2.2, -.32); s.lineTo(-12, -.55);
  const g = new THREE.ExtrudeGeometry(s, { depth: .16, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -.08);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); const b = x > -1 ? -.05 * (x + 1) ** 2 : 0; const hb = x < -6 ? .03 * (x + 6) ** 2 * -.3 : 0; p.setZ(i, p.getZ(i) + b + hb); }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, chrome()); mesh.castShadow = true;
  return mesh;
}
