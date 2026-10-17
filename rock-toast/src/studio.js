// 暗场影棚：灯条环境（给高光与反射）+ 暖色主聚光（带阴影）+ 后侧轮廓光 + 可动扫光；背景近黑的暖灰渐变
import * as THREE from 'three';

export function makeStudio(renderer, scene) {
  const env = new THREE.Scene(); env.background = new THREE.Color('#000000');
  const strip = (w, h, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); env.add(m); return m; };
  const face = (m, p) => { m.position.set(...p); m.lookAt(0, 0, 0); };
  const L = {
    rimL: strip(24, 160, '#f2f5ff'), rimR: strip(24, 160, '#fff6ea'), top: strip(150, 80, '#ffffff'),
    key: strip(90, 60, '#ffd9b0'), back: strip(260, 12, '#ffffff'), sweep: strip(30, 260, '#ffffff'), floor: strip(200, 200, '#2a1c12'),
  };
  face(L.rimL, [-140, 50, -90]); face(L.rimR, [140, 40, -100]); face(L.top, [0, 170, 0]); face(L.key, [-110, 90, 110]); face(L.back, [0, 25, -190]); face(L.floor, [0, -170, 0]);
  const base = { rimL: 2.6, rimR: 3.0, top: .55, key: 1.6, back: .7, floor: .25 };
  const col = {}; for (const k in L) col[k] = L[k].material.color.clone();
  const pmrem = new THREE.PMREMGenerator(renderer);
  let rt = null, last = '';
  function updateEnv(o = {}) {
    const key = JSON.stringify(o);
    if (key === last) return; last = key;
    for (const k in base) L[k].material.color.copy(col[k]).multiplyScalar(base[k] * (o[k] ?? 1));
    const sw = o.sweep;
    L.sweep.visible = !!(sw && sw.I > 0);
    if (L.sweep.visible) { const a = sw.az + sw.x * 1.2; L.sweep.position.set(Math.sin(a) * 160, 20, Math.cos(a) * 160); L.sweep.lookAt(0, 0, 0); L.sweep.material.color.setScalar(sw.I); }
    const r = pmrem.fromScene(env, 0, 1, 1000);
    scene.environment = r.texture; if (rt) rt.dispose(); rt = r;
  }

  // 背景：中心极暗的暖灰，四周纯黑
  const c = document.createElement('canvas'); c.width = 256; c.height = 456;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 190, 6, 128, 228, 300);
  gr.addColorStop(0, '#2a221d'); gr.addColorStop(.45, '#0d0a09'); gr.addColorStop(1, '#000000');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 456);
  const bg = new THREE.CanvasTexture(c); bg.colorSpace = THREE.SRGBColorSpace;
  scene.background = bg;

  // 主光：暖色聚光，落在主体上，四周自然暗下去
  const key = new THREE.SpotLight('#ffe0c0', 4, 0, .42, .85, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0008; key.shadow.normalBias = .08; key.shadow.radius = 6;
  key.shadow.camera.near = 10; key.shadow.camera.far = 400;
  scene.add(key, key.target);
  // 轮廓光：后侧偏冷的硬光，勾边 + 掠射出纹理
  const rim = new THREE.SpotLight('#f4f2ff', 6, 0, .35, .6, 0); rim.castShadow = false; rim.shadow.mapSize.set(1024, 1024); rim.shadow.bias = -.0008; rim.shadow.normalBias = .08; rim.shadow.radius = 3;
  scene.add(rim, rim.target);
  const rim2 = new THREE.SpotLight('#ffe8cc', 0, 0, .4, .7, 0); scene.add(rim2, rim2.target);
  const fill = new THREE.HemisphereLight('#3a3440', '#120c08', .25); scene.add(fill);
  const glow = new THREE.PointLight('#ff8a3a', 0, 0, 0); scene.add(glow);   // 锅底暖光
  return { env, L, updateEnv, key, rim, rim2, fill, glow, bg };
}

// 把灯对准目标：pos 为相对目标的偏移
export function aim(light, target, off) {
  light.position.set(target.x + off[0], target.y + off[1], target.z + off[2]);
  light.target.position.copy(target); light.target.updateMatrixWorld();
}
