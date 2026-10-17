// 成品摆盘上的三种酱：花生奶油酱（象牙）→ 蓝莓果酱（深紫 + 整颗果粒）→ 枫糖浆（琥珀细线）
// set({cream, jam, syrup, pour}, t)：各酱 0→1 的进度；pour 为正在倒的那一种（显示细流）
import * as THREE from 'three';
import { MAT, Drips, Pool, Stream, crawlPath, heightField, berryGeo, berryMat, rnd } from './sauce.js';
import { clamp, eo, ss, seg } from '/core/lib.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function makeDish(parent, A, B, plate, plateTop, camAz = -.4) {
  parent.updateMatrixWorld(true);
  const bA = new THREE.Box3().setFromObject(A), cA = bA.getCenter(V()), topA = bA.max.y;
  const bB = new THREE.Box3().setFromObject(B), cB = bB.getCenter(V()), topB = bB.max.y;
  const front = V(Math.sin(camAz), 0, Math.cos(camAz)).normalize();          // 朝镜头的水平方向
  const side = V().crossVectors(V(0, 1, 0), front).normalize();               // 镜头看去的右手方向（-side 为左）
  const rot = (v, a) => v.clone().applyAxisAngle(V(0, 1, 0), a);
  const hfA = heightField([A], cA.x, cA.z, 16, 72);
  const hfP = heightField([plate], cA.x, cA.z, 34, 64);
  const g = new THREE.Group(); parent.add(g);

  // —— 花生奶油酱 ——
  const mC = MAT.cream();
  const cream = { pool: new Pool(mC, g, hfA, { x: cA.x - front.x * .4, z: cA.z - front.z * .4, rx: 3.7, rz: 2.9, h: .34, rot: .5, seed: 3 }), drips: new Drips(mC, g) };
  const startsC = [[-2.6, 1.2], [-1.2, 1.9], [.4, 2.2], [1.9, 1.7], [3.0, 1.0]];
  startsC.forEach(([s, f], k) => {
    const st = cA.clone().addScaledVector(side, s).addScaledVector(front, f - 1.2); st.y = topA;
    const dir = rot(front, (rnd(k + 2) - .5) * .35);
    cream.drips.add(crawlPath([A], st, dir, { top: 5, down: 2.2 + rnd(k + 9) * 4.2, seed: k * 1.7, step: .15, wig: .3 }), { r: .3 + rnd(k) * .14, t0: k * .16, speed: 3.4, slow: .4 });
  });
  [[-1, 2.4], [1, 3.3]].forEach(([sg, dn], k) => {   // 两条翻过左右侧边
    const st = cA.clone().addScaledVector(side, sg * 2.2); st.y = topA;
    cream.drips.add(crawlPath([A], st, side.clone().multiplyScalar(sg), { top: 5, down: dn, seed: 7 + k, step: .15 }), { r: .26, t0: .5 + k * .2, speed: 3, slow: .35 });
  });
  cream.stream = new Stream(mC, g, { x: cream.pool.o.x + .3, z: cream.pool.o.z + .2, r: .3, sway: .05 });
  cream.plate = new Pool(mC, g, hfP, { x: cA.x + front.x * 7.2 + side.x * .6, z: cA.z + front.z * 7.2 + side.z * .6, rx: 1.5, rz: 1.0, h: .22, rot: .3, seed: 9, floor: plateTop });

  // —— 蓝莓果酱 ——
  const mJ = MAT.jam();
  const jam = { pool: new Pool(mJ, g, hfA, { x: cA.x + front.x * .5 + side.x * .3, z: cA.z + front.z * .5 + side.z * .3, rx: 2.6, rz: 2.1, h: .95, rot: -.3, seed: 5 }), drips: new Drips(mJ, g) };
  [[-1.1, 1.7, 3.6], [.3, 2.0, 5.2], [1.5, 1.6, 2.6]].forEach(([s, f, dn], k) => {
    const st = cA.clone().addScaledVector(side, s).addScaledVector(front, f - .8); st.y = topA;
    jam.drips.add(crawlPath([A], st, rot(front, (k - 1) * .12), { top: 5, down: dn, seed: 3 + k * 2.3, step: .15, wig: .2 }), { r: .46 + k * .04, t0: .25 + k * .22, speed: 2.6, slow: .28 });
  });
  jam.plate = new Pool(mJ, g, hfP, { x: cA.x + front.x * 7.6 - side.x * 1.6, z: cA.z + front.z * 7.6 - side.z * 1.6, rx: 1.7, rz: 1.2, h: .25, rot: -.2, seed: 2, floor: plateTop });
  // 果粒：落在酱堆上，三颗滚到盘里
  const bg = berryGeo(), bm = berryMat();
  jam.berries = [];
  for (let k = 0; k < 15; k++) {
    const m = new THREE.Mesh(bg, bm); m.castShadow = true; m.receiveShadow = true; g.add(m);
    const onPlate = k >= 12, r = .55 + rnd(k * 3.1) * .18;
    let x, z, y;
    if (!onPlate) {
      const a = rnd(k * 5.7) * Math.PI * 2, d = Math.sqrt(rnd(k * 2.9)) * 1.9;
      x = jam.pool.o.x + Math.cos(a) * d * 1.15; z = jam.pool.o.z + Math.sin(a) * d * .9;
      y = hfA.at(x, z) + jam.pool.o.h * Math.sqrt(Math.max(0, 1 - (d / 2.4) ** 4)) + r * .45;
    } else {
      const off = [[-2.4, 8.2], [-.6, 8.9], [1.6, 7.9]][k - 12];
      x = cA.x + side.x * off[0] + front.x * off[1]; z = cA.z + side.z * off[0] + front.z * off[1]; y = plateTop + r * .82;
    }
    m.scale.setScalar(r); m.rotation.set(rnd(k) * .6 - .3, rnd(k + 1) * 6.28, rnd(k + 2) * .6 - .3);
    m.userData = { end: V(x, y, z), r, onPlate, k };
    jam.berries.push(m);
  }

  // —— 枫糖浆：落在 B 顶的前沿，顺切面挂下；A 上一层薄亮膜 ——
  const mS = MAT.syrup();
  const fB = V(cB.x, 0, cB.z).sub(V(cA.x, 0, cA.z)).normalize().negate();   // 从 B 指向 A：B 的切面大致朝这里
  const fBc = front.clone().lerp(fB, .4).normalize();
  const syrupPt = cB.clone().addScaledVector(fBc, 2.4).addScaledVector(side, .9); syrupPt.y = topB;
  const syrup = { drips: new Drips(mS, g), stream: new Stream(mS, g, { x: syrupPt.x, z: syrupPt.z, r: .1, sway: .05 }) };
  [[0, 0, 5.8], [-1.3, .2, 3.4], [1.1, -.2, 4.6]].forEach(([s, f, dn], k) => {
    const st = syrupPt.clone().addScaledVector(side, s).addScaledVector(fBc, f - 1.5);
    syrup.drips.add(crawlPath([B], st, rot(fBc, (k - 1) * .1), { top: 3, down: dn, seed: 11 + k, step: .14, wig: .15 }), { r: .17 + k * .02, t0: .15 + k * .35, speed: 2.4, slow: .3 });
  });
  syrup.hit = syrupPt;

  function set(st, t = 0) {
    const C = st.cream ?? 0, J = st.jam ?? 0, S = st.syrup ?? 0;
    cream.pool.update(eo(C * 1.6)); cream.drips.update(C * 4.2); cream.plate.update(seg(C, .7, 1));
    jam.pool.update(eo(J * 1.5)); jam.drips.update(J * 4); jam.plate.update(seg(J, .65, 1));
    for (const m of jam.berries) {
      const u = m.userData, td = .12 + rnd(u.k * 7.3) * .35;        // 每颗落下的时刻
      const f = clamp((J - td) / .22);
      m.visible = J > td - .005;
      if (!m.visible) continue;
      const e = u.end, y0 = e.y + 14;
      if (!u.onPlate) {
        const bounce = f < 1 ? 0 : Math.abs(Math.sin((J - td - .22) * 18)) * Math.exp(-(J - td - .22) * 12) * .5;
        m.position.set(e.x, f < 1 ? y0 + (e.y - y0) * f * f : e.y + bounce, e.z);
      } else {
        // 先落在酱堆前沿，再顺着正面滚到盘里
        const land = cA.clone().addScaledVector(front, 1.8); land.y = hfA.at(land.x, land.z) + u.r;
        const r2 = clamp((J - td - .22) / .45);
        if (f < 1) m.position.set(land.x, y0 + (land.y - y0) * f * f, land.z);
        else { const k2 = ss(r2); m.position.lerpVectors(land, e, k2); m.position.y = Math.max(e.y, land.y + (e.y - land.y) * Math.min(1, k2 * 1.6)) + Math.abs(Math.sin(k2 * 9)) * .3 * (1 - k2); m.rotation.x = k2 * 8; }
      }
    }
    syrup.drips.update(S * 3.6);
    const cs = st.cstream ?? -1;                  // 奶油酱细流
    if (cs >= 0 && cs < 1.15) {
      const hit = hfA.at(cream.stream.o.x, cream.stream.o.z) + .3, top = cs < .8 ? hit + 40 : hit + 40 - (cs - .8) / .3 * 42;
      const bot = cs < .1 ? hit + 40 - cs / .1 * 40 : hit;
      cream.stream.o.from = hit + 40; cream.stream.update(Math.min(hit + 40, top), Math.max(hit, Math.min(bot, top)), t);
    } else cream.stream.mesh.visible = false;
    const sp = st.stream ?? -1;                   // 细流：-1 不显示；0→1 从开始倒到倒完
    if (sp >= 0 && sp < 1.15) {
      const hit = syrup.hit.y, top = sp < .85 ? hit + 40 : hit + 40 - (sp - .85) / .3 * 42;
      const bot = sp < .08 ? hit + 40 - sp / .08 * 40 : hit;
      syrup.stream.o.from = hit + 40; syrup.stream.update(Math.min(hit + 40, top), Math.max(hit, Math.min(bot, top)), t);
    } else syrup.stream.mesh.visible = false;
  }
  return { set, group: g, cA, cB, topA, topB, front, side, syrupHit: syrup.hit, jam, cream, syrup };
}
