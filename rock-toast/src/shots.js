// 镜头调度：每个镜头一个函数（u = 镜头内 0→1，t = 全片秒数），摆道具、打光、定机位与焦点
import * as THREE from 'three';
import { clamp, seg, eio, eo, ei, ss, lerp, back } from '/core/lib.js';
import { shotAt, SHOT, BEAT } from './story.js';
import { aim } from './studio.js';
import { rnd } from './sauce.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const M4 = () => new THREE.Matrix4();

export function makeShots({ scene, camera, post, studio, world: W, QS }) {
  // —— 通用 ——
  function setCam(pos, look, fov, focusPt, aper) {
    camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix();
    camera.up.set(0, 1, 0); camera.lookAt(look); camera.updateMatrixWorld();
    const f = focusPt.clone().applyMatrix4(camera.matrixWorldInverse);
    post.dof.focus = Math.max(1, -f.z); post.dof.aper = aper;
  }
  const orbit = (tg, az, el, d) => V(tg.x + Math.sin(az) * Math.cos(el) * d, tg.y + Math.sin(el) * d, tg.z + Math.cos(az) * Math.cos(el) * d);
  function show(...gs) { for (const g of W.all) g.visible = gs.includes(g); }
  function lights(tg, o = {}) {
    const k = o.dim ?? 1;
    aim(studio.key, tg, o.key || [-52, 44, 6]); studio.key.intensity = (o.keyI ?? 1.9) * k; studio.key.angle = o.keyA ?? .42;
    aim(studio.rim, tg, o.rim || [30, 22, -46]); studio.rim.intensity = (o.rimI ?? 2.6) * k;
    aim(studio.rim2, tg, o.rim2 || [-36, 20, -40]); studio.rim2.intensity = (o.rim2I ?? 1.4) * k;
    studio.fill.intensity = (o.fill ?? .2) * k; studio.glow.intensity = o.glow ?? 0;
    if (o.glowAt) studio.glow.position.copy(o.glowAt);
    const e = { ...(o.env || {}) };
    if (k < 1) for (const n of ['rimL', 'rimR', 'top', 'key', 'back', 'floor']) e[n] = +((e[n] ?? 1) * k).toFixed(3);
    studio.updateEnv(e);
    scene.backgroundIntensity = (o.bg ?? 1) * k;
  }
  const fade = v => { post.vig.uniforms.fade.value = v; };
  const camAz = -.4;

  // —— 摆盘组的状态 ——
  const P = W.plate, D = P.dish, FK = W.fork;
  const restB = { p: P.B.position.clone(), q: P.B.quaternion.clone() }, restAp = P.A.position.clone();
  const bBox = new THREE.Box3().setFromObject(P.B), bC = bBox.getCenter(V());
  const bFront = V(-Math.sin(P.B.rotation.y), 0, -Math.cos(P.B.rotation.y));     // B 切面朝向
  const bBack = bFront.clone().negate(), bAxis = V().crossVectors(UP, bBack).normalize();
  const bEdge = V(bC.x, P.plateTop, bC.z).addScaledVector(bBack, 5.35);
  function poseB(phi) {   // 绕后底边立起：phi=π/2 平躺，0 直立
    const q = new THREE.Quaternion().setFromAxisAngle(bAxis, phi);
    P.B.position.copy(restB.p).sub(bEdge).applyQuaternion(q).add(bEdge);
    P.B.quaternion.copy(q).multiply(restB.q);
  }
  const pv = P.A.geometry.userData.pivot;
  const hinge = sg => V(sg * 5.35 - pv[0], 4.5 - pv[1], 5.15);   // A 局部坐标里的外侧底边
  const invRestA = FK.restA.clone().invert();
  function openA(theta) {
    [[FK.h1, -1, 0], [FK.h2, 1, 1]].forEach(([h, sg, i]) => {
      const p = hinge(sg), m = M4().makeTranslation(p.x, p.y, p.z).multiply(M4().makeRotationY(-sg * theta)).multiply(M4().makeTranslation(-p.x, -p.y, -p.z));
      h.matrix.copy(FK.restA).multiply(m); h.matrixWorldNeedsUpdate = true;
      const half = FK.halves[i], delta = h.matrix.clone().multiply(invRestA);
      half.G.matrix.copy(delta); half.G.matrixWorldNeedsUpdate = true;
      half.live.copy(half.plane).applyMatrix4(delta);
    });
  }
  // 酱汁副本：跟着两半走，按中线裁开（几何每帧与原件同步）
  function syncClones() {
    for (const half of FK.halves) {
      if (!half.clones) {
        half.clones = D.group.children.map(src => {
          const m = new THREE.Mesh(src.geometry, src.material.clone()); m.material.clippingPlanes = [half.live]; m.material.clipShadows = true;
          m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; half.G.add(m); return { m, src };
        });
      }
      for (const { m, src } of half.clones) { m.geometry = src.geometry; m.position.copy(src.position); m.quaternion.copy(src.quaternion); m.scale.copy(src.scale); m.visible = src.visible; }
    }
  }
  function plateState(o = {}) {
    show(P.group);
    poseB(o.phi ?? 0);
    P.A.position.copy(restAp); P.A.position.y += o.aDrop ?? 0;
    D.set({ cream: o.cream ?? 0, jam: o.jam ?? 0, syrup: o.syrup ?? 0, stream: o.stream ?? -1, cstream: o.cstream ?? -1 }, o.t ?? 0);
    const split = !!o.split;
    P.A.visible = !split; D.group.visible = !split;
    FK.h1.visible = FK.h2.visible = split; FK.halves.forEach(h => h.G.visible = split);
    FK.fork.visible = !!o.fork;
    if (split) { syncClones(); openA(o.open ?? 0); }
    FK.steam(o.t ?? 0, o.steamAt || D.cA, o.steam ?? 0, camera, 1.2, 6);
  }
  const plateC = V(0, P.plateTop + 5, 0);

  // —— 杯、碗、锅、刀 ——
  const C = W.cup, Bw = W.bowl, Pn = W.pan, Ct = W.cut;
  function cupLevel(level) {
    const r = 3.7 + .2 * level / 8.65;
    C.body.scale.set(r / 3.75, Math.max(.001, level), r / 3.75); C.body.position.y = .95 + level / 2; C.body.visible = level > .02;
    C.surf.scale.setScalar((r - .02) / 3.86); C.surf.position.y = .95 + level + .005; C.surf.visible = level > .02;
    return .95 + level;
  }
  const D0 = [V(-.9, 0, .6), V(1.0, 0, -.5)];
  function eggs(tl, surf, list) {   // list：每颗蛋落到液面的时刻（镜头内秒）
    const m = M4(), q = new THREE.Quaternion(), s = V(), p = V();
    let di = 0;
    C.eggs.forEach((e, k) => {
      const ti = list[k]; e.visible = ti !== undefined && tl > ti - .35;
      if (!e.visible) return;
      const dt = tl - ti, x = D0[k].x, z = D0[k].z;
      const Y = e.userData.yolk, Wt = e.userData.white;
      if (dt < 0) { const f = clamp(1 + dt / .35); e.position.set(x, surf + 16 - 16 * f * f, z); Wt.scale.set(.5, .9, .5); Wt.position.y = .7; Y.position.y = 0; }
      else { e.position.set(x, surf, z); const sp = eo(dt / .5); Y.position.y = .32 + Math.sin(dt * 14) * Math.exp(-dt * 6) * .25; Wt.scale.set(1.2 + .8 * sp, .32, 1.1 + .6 * sp); Wt.position.y = .02; }
      for (let i = 0; i < 14; i++) {   // 溅起的奶滴
        if (dt < 0 || dt > .45) continue;
        const a = i / 14 * 6.283 + k, v = 9 + rnd(i + k * 20) * 9, vy = 18 + rnd(i * 3 + k) * 14;
        p.set(x + Math.cos(a) * v * dt * .5, surf + vy * dt - 220 * dt * dt, z + Math.sin(a) * v * dt * .5);
        if (p.y < surf - .1) continue;
        s.setScalar(.09 + rnd(i * 7 + k) * .14); m.compose(p, q, s); C.drops.setMatrixAt(di++, m);
      }
    });
    C.drops.count = di; C.drops.instanceMatrix.needsUpdate = true;
  }
  function dust(tl, surf, on) {
    const a = C.dust.geometry.attributes.position;
    for (let i = 0; i < C.N; i++) {
      const tau = tl - rnd(i) * .55;
      let x = 0, y = -999, z = 0;
      if (on && tau > 0) {
        const y0 = surf + 11 + rnd(i * 1.3) * 2.5, fall = 8 * tau + 3 * tau * tau;
        y = y0 - fall;
        const r = .25 + fall * .16 + rnd(i * 2.1) * .3, ang = rnd(i * 4.7) * 6.283 + tau * .8;
        x = Math.cos(ang) * r * (.4 + rnd(i * 5.3)); z = Math.sin(ang) * r * (.4 + rnd(i * 5.3)) + .3;
        if (y < surf + .03) y = -999;
      }
      a.setXYZ(i, x, y, z);
    }
    a.needsUpdate = true;
  }

  // —— 锅里的吐司、油泡、翻面铰链（后底边）——
  if (!Pn.flip) {
    Pn.flip = new THREE.Group(); Pn.group.add(Pn.flip); Pn.flip.position.set(0, Pn.top, 4.5 - 5.25);
    Pn.flip.add(Pn.holder); Pn.holder.position.set(0, 0, 0);
    Pn.bread.position.set(0, 0, 5.25);
  }
  function breadT(v) { const U = Pn.bread.userData.U; U.uToast.value = v; U.uToastCut.value = v; U.uOil.value = .55; U.uSoak.value = 1; }
  function bubbles(tl, on) {
    const m = M4(), q = new THREE.Quaternion(), sc = V(), p = V(); let n = 0;
    if (on > 0) for (let i = 0; i < 80; i++) {
      const life = .5 + rnd(i) * .7, tt = tl + rnd(i * 3) * 3;
      if (tt < 0) continue;
      const ph = (tt % life) / life, a = rnd(i * 5) * 6.283, d = 5.6 + rnd(i * 7) * 2.6;
      const cz = Pn.flip.rotation.x < -1 ? -5.3 : 0;
      p.set(Math.cos(a) * d * (1 + .1 * ph), Pn.top + .03, Math.sin(a) * d * .95 + 4.5 + cz);
      const r = (.06 + rnd(i * 9) * .16) * Math.sin(Math.PI * ph) * on;
      sc.set(r, r * .7, r); m.compose(p, q, sc); Pn.bubbles.setMatrixAt(n++, m);
    }
    Pn.bubbles.count = n; Pn.bubbles.instanceMatrix.needsUpdate = true;
  }
  // —— 叉子 ——
  const fTip = V();
  function forkTip() {
    const d = fTip.copy(D.cA).sub(FK.splitPt).dot(FK.xAxis);
    fTip.copy(D.cA).addScaledVector(FK.xAxis, -d).addScaledVector(D.front, .6); fTip.y = D.topA + 1.1;
    return fTip;
  }
  function poseFork(u) {
    const dir = V(0, -1, 0).addScaledVector(D.front, -.42).addScaledVector(D.side, .25).normalize();
    const x = dir.clone(), z = D.front.clone().addScaledVector(x, -D.front.dot(x)).normalize(), y = V().crossVectors(z, x);
    FK.fork.quaternion.setFromRotationMatrix(M4().makeBasis(x, y, z));
    const press = lerp(-11, 0, eo(seg(u, 0, .333))) + 2.2 * ss(seg(u, .333, .5));
    FK.fork.position.copy(forkTip()).addScaledVector(x, -4.75 + press);
  }

  // —— 镜头 ——
  const F = {
    hook(u, t) {   // 成品微距：琥珀糖浆细线落在竖立那块的顶边，蓝莓果酱沿正面下挂
      plateState({ cream: 1, jam: 1, syrup: .25 + .5 * u, stream: .12 + .6 * u, t });
      const tg = D.cA.clone().lerp(D.syrupHit, .45); tg.y = D.topA - .5;
      lights(plateC, { rim: [26, 30, -40], rimI: 3.4, keyI: 1.7 });
      setCam(orbit(tg, camAz - .22, .34, lerp(44, 37, eio(u))), tg, 30, D.cA.clone().setY(D.topA + .6), 1300);
      fade(clamp(t / .35));
    },
    title(u, t, s) {   // 成品全貌 + 扫光；末拍压黑
      plateState({ cream: 1, jam: 1, syrup: 1, t });
      const sw = seg(u, .08, .62);
      lights(plateC, { env: { sweep: { x: +lerp(-1, 1, sw).toFixed(3), I: +(9 * Math.sin(Math.PI * sw)).toFixed(2), az: camAz + Math.PI } }, keyI: 1.9 + .6 * Math.sin(Math.PI * sw) });
      setCam(orbit(plateC, lerp(camAz - .05, camAz + .02, u), lerp(.6, .58, u), lerp(84, 94, eio(u))), plateC.clone().add(V(0, -1, 0)), 28, plateC.clone().add(V(1, 1, 2)), 2600);
      fade(1 - seg(t, s.t1 - BEAT * .8, s.t1));
    },
    cut(u) {   // 刀自己落下切开，后段滑开
      show(Ct.group);
      const top = 10.8, k = seg(u, .1, .6);
      const y = k < 1 ? lerp(top + 2.5, .15, ei(k) * .4 + k * .6) : lerp(.15, top + 12, ei(seg(u, .66, .95)));
      Ct.knife.position.set(-13.8 + Math.sin(k * Math.PI * 5) * 3.2 * (k < 1 ? 1 : 0), y, 0);
      Ct.K.position.z = -3.4 * eo(seg(u, .62, .92));
      const m = M4(), q = new THREE.Quaternion(), sc = V(), p = V(); let n = 0;
      for (let i = 0; i < 40; i++) {   // 面包屑：随刀落下
        const t0 = .15 + rnd(i) * .45, dt = (u - t0) * 2.67; if (dt < 0) continue;
        const sy = top - rnd(i * 3) * 7, yy = Math.max(.05, sy - 300 * dt * dt);
        p.set((rnd(i * 5) - .5) * 9, yy, (rnd(i * 7) - .5) * .8 + (rnd(i * 2) - .5) * 2 * Math.min(1, dt * 3)); sc.setScalar(.6 + rnd(i * 9) * 1.4); q.setFromEuler(new THREE.Euler(i, i * 2, 0));
        m.compose(p, q, sc); Ct.crumbs.setMatrixAt(n++, m);
      }
      Ct.crumbs.count = n; Ct.crumbs.instanceMatrix.needsUpdate = true;
      const tg = V(0, Ct.top + 5, 0);
      lights(tg, { key: [-50, 30, 18], keyI: 2.1, rim: [36, 26, -40], rimI: 2.8 });
      setCam(orbit(tg, lerp(.6, .74, u), .3, 84), tg.clone().add(V(0, -2, 0)), 28, tg.clone().add(V(0, 0, 3)), 2000);
    },
    milk(u, t) {   // 牛奶细流入杯，液面上升
      show(C.group);
      C.U.uMix.value = 0; C.U.uYolk.value = 0; C.U.uSpeck.value = 0; C.U.uRot.value = 0;
      const lv = lerp(.15, 2.4, eio(seg(u, .08, 1))), surf = cupLevel(lv);
      const sp = u * 1.02, top = sp < .9 ? surf + 40 : surf + 40 - (sp - .9) / .2 * 44, bot = sp < .1 ? surf + 40 - sp / .1 * 40 : surf;
      C.stream.o.from = surf + 40; C.stream.update(Math.min(surf + 40, top), Math.max(surf, Math.min(bot, top)), t);
      eggs(-1, surf, []); dust(-1, surf, false);
      const tg = V(0, 5.2, 0);
      lights(tg, { key: [-40, 36, 20], keyI: 1.6, rim: [24, 18, -40], rimI: 3.4, rim2I: 2.2, env: { rimL: 1.6, rimR: 1.6 } });
      setCam(orbit(tg, .32, .3, lerp(31, 27, eio(u))), tg, 30, V(0, surf, 0), 900);
    },
    egg(u, t, s) {   // 两颗蛋黄落入，溅起奶冠
      show(C.group);
      C.U.uMix.value = 0; C.U.uYolk.value = 0; C.U.uSpeck.value = 0;
      const surf = cupLevel(2.4 + .5 * seg(u, .1, .9)); C.stream.mesh.visible = false;
      eggs(t - s.t0, surf, [.22, .72]); dust(-1, surf, false);
      const tg = V(0, surf, 0);
      lights(tg, { key: [-36, 44, 18], keyI: 1.7, rim: [22, 26, -36], rimI: 3 });
      setCam(orbit(tg, .3, 1.0, lerp(27, 23, eio(u))), tg, 30, tg, 700);
    },
    cinnamon(u, t, s) {   // 肉桂粉像细雾落下，逆光发亮
      show(C.group);
      C.U.uMix.value = 0; C.U.uYolk.value = 0; C.U.uSpeck.value = .9 * seg(u, .3, 1);
      const surf = cupLevel(2.9); C.stream.mesh.visible = false;
      eggs(9, surf, [-1, -1]);
      dust(t - s.t0, surf, true);
      const tg = V(0, surf + 3.2, 0);
      lights(tg, { key: [-30, 26, 24], keyI: 1.2, rim: [8, 16, -38], rimI: 5, rim2I: 2 });
      setCam(orbit(tg, -.18, .5, lerp(29, 26, u)), tg, 30, V(0, surf + 3, .3), 800);
    },
    whisk(u, t, s) {   // 正俯：液面旋成螺旋，白、黄、肉桂色混成金黄
      show(C.group);
      const surf = cupLevel(3.0); C.stream.mesh.visible = false; eggs(-1, surf, []); dust(-1, surf, false);
      C.U.uYolk.value = 1; C.U.uMix.value = eio(seg(u, 0, .95)); C.U.uRot.value = (t - s.t0) * 7; C.U.uSpeck.value = .9;
      const tg = V(0, surf, 0);
      lights(tg, { key: [-26, 50, 10], keyI: 1.8, rim: [20, 30, -24], rimI: 2.4 });
      setCam(orbit(tg, .2 + u * .5, 1.42, lerp(22, 20, u)), tg, 30, tg, 300);
    },
    soak(u, t, s) {   // 深色碗里的吐司，金黄蛋液从上方淋下，顺四边下挂
      show(Bw.group);
      const tl = t - s.t0;
      Bw.bread.userData.U.uSoak.value = .15 + .85 * ss(seg(u, .15, 1));
      const lvY = lerp(1.3, 2.1, seg(u, .1, 1)), r = 5 + (lvY - .78) / 1.42 * 2.4;
      Bw.pool.position.y = lvY; Bw.pool.scale.setScalar(r - .1);
      Bw.drips.update(Math.max(0, tl - .55));
      const sp = u * 1.05, hit = Bw.top + .2, top = sp < .82 ? hit + 40 : hit + 40 - (sp - .82) / .25 * 44, bot = sp < .1 ? hit + 40 - sp / .1 * 40 : hit;
      Bw.stream.o.from = hit + 40; Bw.stream.update(Math.min(hit + 40, top), Math.max(hit, Math.min(bot, top)), t);
      const tg = V(0, 6, 0);
      lights(tg, { key: [-44, 40, 16], keyI: 1.8, rim: [30, 22, -40], rimI: 3 });
      setCam(orbit(tg, .35, .42, lerp(50, 43, eio(u))), tg, 28, V(0, 8, 2), 1700);
    },
    pan(u, t, s) {   // 黑暗里亮起暖光，吐司落进铸铁锅，油泡四起
      show(Pn.group);
      const on = +ss(seg(u, 0, .35)).toFixed(3), tl = t - s.t0;
      Pn.flip.rotation.x = 0;
      Pn.holder.position.set(0, lerp(16, 0, ei(seg(u, .25, .55))) + (u > .55 ? Math.abs(Math.sin((u - .55) * 30)) * Math.exp(-(u - .55) * 18) * .6 : 0), 0);
      breadT(.04 * seg(u, .55, 1));
      bubbles(tl - .75, u > .55 ? 1 : 0);
      Pn.steam(t, V(0, Pn.top + 1, 4.5), .5 * seg(u, .6, 1), camera, 4, 9);
      const tg = V(0, 5, 4.5);
      lights(tg, { key: [-40, 34, 20], keyI: 1.7, rim: [30, 18, -36], rimI: 3, dim: Math.max(.02, on), glow: 1.8 * on, glowAt: V(9, -2, 14) });
      setCam(orbit(tg, .5, .2, lerp(50, 45, eio(u))), tg, 28, V(0, 5, 6), 1500);
    },
    sear(u, t, s) {   // 贴面微距：侧面从浅黄一点点变成焦糖豹纹
      show(Pn.group); Pn.flip.rotation.x = 0; Pn.holder.position.set(0, 0, 0);
      breadT(lerp(.2, 1, ss(u)));
      bubbles(t - s.t0 + 1.5, 1);
      Pn.steam(t, V(0, Pn.top + 1, 4.5), .6, camera, 4, 9);
      const tg = V(2.4, 3.4, 4.5 + 3.6);
      lights(tg, { key: [-34, 12, 18], keyI: 2.4, rim: [30, 16, -30], rimI: 2.6, glow: 1.4, glowAt: V(9, -2, 14) });
      setCam(orbit(tg, lerp(.5, .72, u), .26, 36), tg, 30, tg, 420);
    },
    flip(u, t, s) {   // 吐司自己翻面：先微微抬起，翻过去，落下回弹
      show(Pn.group);
      const k = seg(u, .12, .62), lift = Math.sin(Math.PI * seg(u, .05, .3)) * .8;
      Pn.flip.rotation.x = -Math.PI / 2 * eio(k) + (u > .62 ? Math.sin((u - .62) * 26) * Math.exp(-(u - .62) * 14) * .05 : 0);
      Pn.holder.position.set(0, lift, 0);
      breadT(.85);
      bubbles(t - s.t0 + 3, 1);
      Pn.steam(t, V(0, Pn.top + 1, 0), .6 + (u > .62 ? .8 * Math.exp(-(u - .62) * 6) : 0), camera, 5, 10);
      const tg = V(0, 4, -.5);
      lights(tg, { key: [-40, 34, 20], keyI: 1.8, rim: [30, 20, -36], rimI: 3, glow: 1.4, glowAt: V(9, -2, 14) });
      setCam(orbit(tg, .42, .36, 44), tg, 28, V(0, 4, 1), 1400);
    },
    crust(u, t, s) {   // 掠射光下沿焦糖外皮慢慢滑过，热气飘过；末拍压暗
      show(Pn.group); Pn.flip.rotation.x = -Math.PI / 2; Pn.holder.position.set(0, 0, 0);
      breadT(1);
      bubbles(t - s.t0 + 5, .6);
      Pn.steam(t, V(0, Pn.top + 9, -4), .7, camera, 4, 8);
      const tg = V(lerp(-3, 3, u), 10.4, -2.2);
      lights(tg, { key: [-40, 9, 6], keyI: 2.4, rim: [24, 16, -30], rimI: 2.6, glow: 1.2, glowAt: V(9, -2, 14) });
      setCam(V(tg.x - 3, tg.y + 6, tg.z + 17), tg, 30, tg, 140);
      fade(1 - seg(t, s.t1 - BEAT * .9, s.t1) * .92);
    },
    plate(u, t, s) {   // 空盘：竖立那块像立体书一样立起，平放那块落到前面
      const phi = Math.PI / 2 * (1 - back(seg(u, .06, .38), 1.4));
      const ad = u < .42 ? 30 : lerp(16, 0, ei(seg(u, .42, .6))) + (u > .6 ? Math.abs(Math.sin((u - .6) * 22)) * Math.exp(-(u - .6) * 14) * .9 : 0);
      plateState({ phi, aDrop: ad, t });
      P.A.visible = u > .4;
      lights(plateC, { keyI: 1.9 * (.4 + .6 * ss(seg(u, 0, .4))) });
      setCam(orbit(plateC, camAz, lerp(1.0, .66, eio(u)), lerp(96, 90, u)), plateC.clone().add(V(0, -2, 0)), 28, plateC, 2600);
      fade(clamp(.15 + 1.7 * seg(t, s.t0, s.t0 + .5)));
    },
    cream(u, t) {   // 象牙色花生奶油酱从上方淋下，顺边缘挂成几道
      plateState({ cream: seg(u, .08, 1), cstream: u * 1.05, t });
      const tg = D.cA.clone().addScaledVector(D.front, 3.6); tg.y = D.topA - 1.2;
      lights(plateC, { rimI: 3 });
      setCam(orbit(tg, camAz + .08, .38, lerp(36, 31, eio(u))), tg, 30, tg.clone().add(V(0, .6, 0)), 1400);
    },
    jam(u, t) {   // 深紫蓝莓果酱带着整颗果粒落下，果粒滚落
      plateState({ cream: 1, jam: seg(u, 0, .92), t });
      const tg = D.cA.clone().addScaledVector(D.front, 2.6); tg.y = D.topA - .4;
      lights(plateC, { rimI: 3.2 });
      setCam(orbit(tg, camAz - .1, .48, lerp(37, 33, eio(u))), tg, 30, tg.clone().add(V(0, .8, -1)), 1400);
    },
    syrup(u, t) {   // 逆光里一根琥珀色枫糖浆细线落下
      plateState({ cream: 1, jam: 1, syrup: seg(u, .12, 1), stream: u * 1.08, t });
      const tg = D.syrupHit.clone().add(V(0, 3.5, 0));
      lights(plateC, { rim: [14, 34, -44], rimI: 4.6, keyI: 1.3, env: { rimL: 1.4, rimR: 1.6 } });
      setCam(orbit(tg, camAz - .35, -.02, lerp(34, 30, u)), tg, 30, D.syrupHit, 1100);
    },
    fork(u, t) {   // 叉子压下，平放那块从中间裂开，热气冒出；光压低成掠射光
      const open = .12 * ss(seg(u, .34, .8));
      plateState({ cream: 1, jam: 1, syrup: 1, split: true, open, fork: true, steam: .9 * seg(u, .36, .7), steamAt: forkTip().clone().add(V(0, -1, 0)), t });
      poseFork(u);
      const tg = forkTip().clone().add(V(0, -1.6, 0));
      const low = ss(seg(u, .34, .85));
      lights(plateC, { key: [-50, lerp(44, 14, low), lerp(6, -6, low)], keyI: lerp(1.9, 1.7, low), rimI: lerp(3, 2.2, low) });
      setCam(orbit(tg, camAz + .05, lerp(.32, .26, u), lerp(34, 28, eio(u))), tg, 30, tg, 1300);
    },
    final(u, t, s) {   // 拉回成品全景，菜名再现；最后两拍压黑
      plateState({ cream: 1, jam: 1, syrup: 1, split: true, open: .12, fork: false, steam: .55, steamAt: forkTip().clone().add(V(0, -1, 0)), t });
      const sw = seg(u, .15, .6);
      lights(plateC, { env: { sweep: { x: +lerp(-1, 1, sw).toFixed(3), I: +(6 * Math.sin(Math.PI * sw)).toFixed(2), az: camAz + Math.PI } } });
      setCam(orbit(plateC, lerp(camAz + .06, camAz - .02, u), lerp(.5, .6, u), lerp(70, 96, eio(u))), plateC.clone().add(V(0, -1, 0)), 28, plateC.clone().add(V(1, 1, 2)), 2400);
      fade(1 - seg(t, s.t1 - BEAT * 2, s.t1 - .1));
    },
  };
  F.hero = F.title;

  function apply(t) {
    const s = shotAt(t), name = QS.get('shot') || s.name, sh = QS.get('shot') ? (SHOT[name] || s) : s;
    const u = QS.has('u') ? +QS.get('u') : seg(t, sh.t0, sh.t1);
    const tt = QS.has('u') ? sh.t0 + u * (sh.t1 - sh.t0) : t;
    fade(1);
    (F[name] || F.title)(u, tt, sh);
  }
  return { apply, events: [] };
}
