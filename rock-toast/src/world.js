// 布景：每组道具一个 Group，镜头里按需显示（每个镜头是独立的小舞台）
import * as THREE from 'three';
import { breadPiece, HALF, LOAF } from './bread.js';
import { makeDish } from './dish.js';
import { makeCutSet, makeCupSet, makeBowlSet, makePanSet, makeForkSet, makeSteam } from './sets.js';
import { makePlate, makeBoard, makeTable, makeCutBoard, makeCup, makeBowl, makePan, makeKnife, makeFork } from './props.js';

const tl = new THREE.TextureLoader();
const tex = (u, srgb) => new Promise(r => tl.load(u, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; r(t); }));

// 把物体放到 y 平面上：底面落在 y，水平中心在 (x, z)
export function placeOn(obj, y, x = 0, z = 0) {
  obj.position.set(0, 0, 0); obj.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj), c = b.getCenter(new THREE.Vector3());
  obj.position.set(x - c.x, y - b.min.y, z - c.z); obj.updateMatrixWorld(true);
  return b.getSize(new THREE.Vector3());
}

export async function buildWorld(scene) {
  const P = '/core/assets/polyhaven/';
  const [diff, nor, rough] = await Promise.all([tex(P + 'walnut_diff.jpg', true), tex(P + 'walnut_nor.jpg'), tex(P + 'walnut_rough.jpg')]);
  const wood = { diff, nor, rough };
  const W = {};
  const table = makeTable(); scene.add(table); W.table = table;

  // —— 摆盘：胡桃木底座 + 炭灰石盘 + 两块煎好的吐司 ——
  const plateSet = new THREE.Group(); scene.add(plateSet);
  const board = makeBoard(wood); plateSet.add(board);
  const plate = makePlate(); plate.position.y = board.userData.top; plateSet.add(plate);
  const plateTop = board.userData.top + plate.userData.top;
  const seared = { soak: 1, toast: 1, toastCut: 1, oil: .7 };
  // B：竖立当靠背，切面朝镜头（+z）
  const B = breadPiece(HALF, { nz: 1 }, { ...seared, seed: 2 });
  B.rotation.y = Math.PI - .2; plateSet.add(B); placeOn(B, plateTop, -3.2, -4.4);
  // A：平放在前，切面朝上
  const A = breadPiece(HALF, { nz: 1 }, { ...seared, seed: 5 });
  A.rotation.set(Math.PI / 2, 0, 0); A.rotation.order = 'YXZ'; A.rotation.y = -.5; plateSet.add(A); placeOn(A, plateTop, 3.4, 5.0);
  const dish = makeDish(plateSet, A, B, plate, plateTop);
  W.plate = { group: plateSet, board, plate, A, B, plateTop, dish };

  // 叉开用的两半（和 A 同一位置；张开角由镜头控制），以及跟着两半走、按中线裁开的酱汁副本
  const fk = makeForkSet(plateSet, A);
  const restA = A.matrixWorld.clone();
  for (const [h, A_] of [[fk.h1, fk.A1], [fk.h2, fk.A2]]) { h.matrix.copy(restA); h.matrixAutoUpdate = false; }
  const xAxis = new THREE.Vector3().setFromMatrixColumn(restA, 0).normalize(), org = new THREE.Vector3().setFromMatrixPosition(restA);
  const pv = A.geometry.userData.pivot;   // 几何以 pivot 为原点：中线 x=0 在局部坐标里是 -pv[0]
  const splitPt = new THREE.Vector3(-pv[0], 0, 0).applyMatrix4(restA);
  const halves = [-1, 1].map(sg => {
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(xAxis.clone().multiplyScalar(-sg), splitPt);
    const G = new THREE.Group(); G.matrixAutoUpdate = false; plateSet.add(G);
    return { sg, plane, G, live: plane.clone(), clones: null };
  });
  fk.halves = halves; fk.restA = restA; fk.xAxis = xAxis; fk.splitPt = splitPt;
  fk.steam = makeSteam(plateSet, 12, '#fff3e6');
  W.fork = fk;

  W.cut = makeCutSet(scene, wood);
  W.cup = makeCupSet(scene);
  W.bowl = makeBowlSet(scene);
  W.pan = makePanSet(scene);
  W.all = [plateSet, W.cut.group, W.cup.group, W.bowl.group, W.pan.group];
  return W;
}
