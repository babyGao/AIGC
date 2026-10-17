// 巨石吐司 · 米其林二创：页面入口（render(t) 纯函数，逐帧渲染）
import * as THREE from 'three';
import { makePost } from '/core/three/post.js';
import { makeStudio } from './studio.js';
import { DUR } from './story.js';
import { buildWorld } from './world.js';
import { makeShots } from './shots.js';
import { makeOverlay } from './overlay.js';

const QS = new URLSearchParams(location.search);
const W = innerWidth, H = innerHeight, S = +(QS.get('ss') || 1.5);
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(S); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.localClippingEnabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .5, 2000);
const post = makePost(renderer, scene, camera, W, H, { ssaa: S, ao: !QS.has('noao'), aoRadius: 1.4, aoThickness: 2, aoScale: 1.6, aoAmt: .7 });
const ao = post.dof.ao;
if (ao) { const ov = ao.overrideVisibility.bind(ao); ao.overrideVisibility = function () { ov(); this.scene.traverse(o => { if (o.userData.noAO) o.visible = false; }); }; }
post.vig.uniforms.sat.value = .93;
post.bloom.strength = .18; post.bloom.threshold = 1.3; post.bloom.radius = .5;
const studio = makeStudio(renderer, scene);
const ov = document.getElementById('ov'); ov.width = W; ov.height = H;

window.DUR = DUR;
(async () => {
  const world = await buildWorld(scene);
  const shots = makeShots({ scene, camera, post, studio, world, W, H, QS });
  const overlay = await makeOverlay(ov, W, H, QS);
  window.EV = shots.events;
  window.TEXTS = overlay.texts;
  window.render = t => {
    shots.apply(t);
    post.composer.render();
    overlay.draw(t);
  };
  window.READY = true;
})();
