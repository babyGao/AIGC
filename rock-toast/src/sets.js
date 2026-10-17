// 工序布景：切面包（砧板 + 面包刀）、调蛋液（水晶杯 + 牛奶 + 蛋 + 肉桂）、浸蛋液（深色碗）、煎（铸铁锅）、叉开（成品 A 的两半 + 叉子）
import * as THREE from 'three';
import { breadPiece, HALF, LOAF } from './bread.js';
import { makeCutBoard, makeCup, makeBowl, makePan, makeKnife, makeFork } from './props.js';
import { MAT, Drips, Stream, crawlPath, rnd } from './sauce.js';
import { NOISE } from './glsl.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const FULL = { x0: -LOAF.w / 2, x1: LOAF.w / 2, y0: 0, y1: LOAF.h, z0: -LOAF.len / 2, z1: LOAF.len / 2 };

// —— 切面包 ——
export function makeCutSet(scene, wood) {
  const g = new THREE.Group(); scene.add(g);
  const board = makeCutBoard(wood); g.add(board);
  const top = board.userData.top;
  const raw = { soak: 0, toast: 0, toastCut: 0, oil: 0 };
  const pv = [0, 0, 0];
  const F = breadPiece(HALF, { nz: 1 }, { ...raw, seed: 1, pivot: pv, full: FULL, fullFaces: {} });
  const K = breadPiece({ ...HALF, z0: -LOAF.len / 2, z1: 0 }, { pz: 1 }, { ...raw, seed: 1, pivot: pv, full: FULL, fullFaces: {} });
  const loaf = new THREE.Group(); loaf.add(F, K); loaf.position.y = top; loaf.rotation.y = -.25; g.add(loaf);
  const knife = makeKnife(); loaf.add(knife);
  // 面包屑
  const crumbs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.07, 0), new THREE.MeshStandardMaterial({ color: '#e9d4a8', roughness: .9 }), 40);
  crumbs.castShadow = true; loaf.add(crumbs);
  return { group: g, loaf, F, K, knife, crumbs, top };
}

// —— 液面：牛奶 → 蛋黄 → 肉桂 → 搅成金黄（螺旋纹）——
function liquidMat(U0, body = false) {
  const U = U0 || { uMix: { value: 0 }, uRot: { value: 0 }, uSpeck: { value: 0 }, uYolk: { value: 0 } };
  const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .14, clearcoat: .8, clearcoatRoughness: .06, sheen: .3, sheenColor: new THREE.Color('#fff8e8') });
  m.userData.U = U; m.customProgramCacheKey = () => 'liquid' + body;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform float uMix, uRot, uSpeck, uYolk; varying vec3 vLP;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 milk = vec3(.93, .91, .86), cus = vec3(.92, .62, .13);
        vec2 q = vLP.xz; float r = length(q), a = atan(q.y, q.x);
        float sw = sin(a * 2. + r * 2.3 - uRot) * .5 + .5 + .25 * (fbs(vec3(q * 1.3, uRot * .2)) - .5);
        float k = smoothstep(.5 - uMix * .6, 1.1 - uMix * .5, sw + uMix * .9);   // 螺旋纹里蛋黄逐渐占满
        vec3 c = mix(milk, cus, clamp(k * uYolk + uMix * .6, 0., 1.));
        float sp = smoothstep(.8, .86, sn3(vec3(q * 6.5 + vec2(cos(uRot * .3), sin(uRot * .3)) * uMix * 3., 1.))) * uSpeck;
        diffuseColor.rgb = mix(c, vec3(.16, .06, .02), sp * .85);
        ${body ? 'diffuseColor.rgb = mix(milk, cus, clamp(uMix * uYolk * .95, 0., 1.));' : ''}`);
  };
  return m;
}

export function makeCupSet(scene) {
  const g = new THREE.Group(); scene.add(g);
  const cup = makeCup(); g.add(cup);
  const lm = liquidMat();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(3.88, 3.7, 1, 64, 1), liquidMat(lm.userData.U, true)); g.add(body);
  const surf = new THREE.Mesh(new THREE.CircleGeometry(3.86, 96).rotateX(-Math.PI / 2), lm); g.add(surf);
  const stream = new Stream(MAT.milk(), g, { x: .2, z: -.4, r: .16, sway: .04 });
  // 两颗蛋：蛋黄 + 半透明蛋清
  const yolkM = new THREE.MeshPhysicalMaterial({ color: '#f39a0c', roughness: .12, clearcoat: 1, clearcoatRoughness: .04, sheen: .4, sheenColor: new THREE.Color('#ffd27a') });
  const whiteM = new THREE.MeshPhysicalMaterial({ color: '#fffaf0', roughness: .05, transmission: 1, thickness: .6, ior: 1.36, clearcoat: 1 });
  const eggs = [0, 1].map(k => {
    const e = new THREE.Group(); const y = new THREE.Mesh(new THREE.SphereGeometry(1.15, 40, 28), yolkM); y.castShadow = true;
    const w = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), whiteM); w.scale.set(1.9, .55, 1.6);
    e.add(w, y); g.add(e); e.userData = { yolk: y, white: w }; return e;
  });
  const splashM = MAT.milk();
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), splashM, 28); g.add(drops);
  // 肉桂粉：细雾颗粒
  const N = 1400, pp = new Float32Array(N * 3), seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) seeds[i] = i;
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#7a3c16', size: .09, sizeAttenuation: true, transparent: true, opacity: .95, depthWrite: true }));
  dust.frustumCulled = false; g.add(dust);
  return { group: g, cup, body, surf, lm, U: lm.userData.U, stream, eggs, drops, dust, N };
}

// —— 浸蛋液 ——
export function makeBowlSet(scene) {
  const g = new THREE.Group(); scene.add(g);
  const bowl = makeBowl(); g.add(bowl);
  const cm = MAT.custard();
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 96).rotateX(-Math.PI / 2), cm); g.add(pool);
  const bread = breadPiece(HALF, { nz: 1 }, { soak: 0, seed: 3 });
  bread.rotation.y = Math.PI - .45; g.add(bread);
  bread.position.set(0, .75, 0); bread.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(bread), c = b.getCenter(V());
  bread.position.x -= c.x; bread.position.z -= c.z; bread.updateMatrixWorld(true);
  const top = new THREE.Box3().setFromObject(bread).max.y;
  const drips = new Drips(cm, g);
  const hit = V(.3, top, .2);
  for (let k = 0; k < 9; k++) {
    const a = k / 9 * Math.PI * 2 + .3, dir = V(Math.cos(a), 0, Math.sin(a));
    const st = hit.clone().addScaledVector(dir, .6 + rnd(k) * .8); st.y = top;
    drips.add(crawlPath([bread], st, dir, { top: 6, down: 4 + rnd(k + 3) * 4.5, seed: k * 1.9, step: .16, wig: .35 }), { r: .28 + rnd(k * 2) * .14, t0: .15 + rnd(k * 5) * .45, speed: 5, slow: .5 });
  }
  const stream = new Stream(cm, g, { x: hit.x, z: hit.z, r: .26, sway: .06 });
  return { group: g, bowl, pool, bread, drips, stream, hit, top };
}

// —— 煎：铸铁锅、油泡、热气 ——
function steamTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.5, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); return t;
}
export function makeSteam(parent, n = 14, col = '#fff1e0') {
  const tex = steamTex(), list = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.frustumCulled = false; m.userData.noAO = true; parent.add(m); list.push(m);
  }
  // 每帧：围绕 base 升起、变大、变淡；amt 总量；cam 让面片朝向镜头
  return function update(t, base, amt, cam, spread = 3, rise = 7) {
    list.forEach((m, i) => {
      const life = 2.6, ph = ((t + rnd(i) * life) % life) / life;
      m.visible = amt > .01;
      if (!m.visible) return;
      const a = rnd(i * 3.3) * 6.28, d = rnd(i * 1.7) * spread;
      m.position.set(base.x + Math.cos(a) * d + Math.sin(t * .8 + i) * .6 * ph, base.y + ph * rise, base.z + Math.sin(a) * d);
      const s = 2.2 + ph * 6; m.scale.set(s, s, s); m.quaternion.copy(cam.quaternion);
      m.material.opacity = amt * .22 * Math.sin(Math.PI * ph) * (.6 + .4 * rnd(i * 9));
    });
  };
}
export function makePanSet(scene) {
  const g = new THREE.Group(); scene.add(g);
  const pan = makePan(); g.add(pan);
  const bread = breadPiece(HALF, { nz: 1 }, { soak: 1, toast: 0, toastCut: 0, oil: .8, seed: 4 });
  const holder = new THREE.Group(); holder.add(bread); g.add(holder);
  const bubM = new THREE.MeshPhysicalMaterial({ color: '#f6e2b8', roughness: .02, transmission: .9, thickness: .1, clearcoat: 1, ior: 1.4 });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), bubM, 80); g.add(bubbles);
  const steam = makeSteam(g, 16);
  return { group: g, pan, bread, holder, bubbles, steam, top: pan.userData.top };
}

// —— 叉开：成品 A 沿中线分成两半（内侧是湿润的蛋奶芯）——
export function makeForkSet(parent, A) {
  const L = { x0: -LOAF.w / 2, x1: 0, y0: 0, y1: LOAF.h, z0: 0, z1: LOAF.len / 2 }, R = { ...L, x0: 0, x1: LOAF.w / 2 };
  const U = A.userData.U, o = { soak: 1, toast: 1, toastCut: 1, oil: .7, seed: 5, pivot: A.geometry.userData.pivot, full: HALF, fullFaces: { nz: 1 } };
  const A1 = breadPiece(L, { nz: 1, px: 2 }, o), A2 = breadPiece(R, { nz: 1, nx: 2 }, o);
  // 两半各自挂在"外侧底边"的铰链上，张开时向外倒
  const h1 = new THREE.Group(), h2 = new THREE.Group();
  parent.add(h1, h2); h1.add(A1); h2.add(A2);
  const fork = makeFork(); parent.add(fork);
  return { A1, A2, h1, h2, fork };
}
