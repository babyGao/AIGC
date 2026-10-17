// 验证运动衔接
import assert from 'node:assert/strict';
import { flowAt, makeMotion, trajectory, strokeAt, commitStroke, retireCovered, motionMesh } from '../../paint/src/motion.js';

const meta = { qw: 2, qh: 2, fq: 4 };
const flow = new Int16Array([80, 0, 80, 0, 80, 0, 80, 0]);
const matrix = [[1, 0, 64], [0, 1, 0], [0, 0, 1]];
const inverse = [[1, 0, -64], [0, 1, 0], [0, 0, 1]];
const parts = [{ pal: 'food' }, { pal: 'slate' }];
const go = makeMotion(flow, meta, parts, new Map([[1, matrix]]));
const back = makeMotion(flow, meta, parts, new Map([[1, inverse]]));
const stroke = () => ({ g: 1, x: 16, y: 64, ang: 0, len: 10, wid: 4, cB: [.3, .4, .5], c2B: [.6, .7, .8] });

assert.deepEqual(flowAt(flow, meta, -100, 300), [10, 0]);
assert.deepEqual(go(2, 5, 6), [5, 6]);

const old = trajectory(stroke(), go);
const born = trajectory({ ...stroke(), x: 80 }, back, true);
for (const u of [0, .2, .5, .9, 1]) {
  assert.deepEqual([strokeAt(old, u).x, strokeAt(old, u).y], [16 + 64 * u, 64]);
  assert.equal(strokeAt(old, u).x, strokeAt(born, u).x);
}

const mesh = motionMesh([16, 40, 47, 71], 1, go, 128, 128);
for (let i = 0; i < mesh.length; i += 4) {
  assert.equal(mesh[i + 2], 64); assert.equal(mesh[i + 3], 0);
  assert.ok(mesh[i] >= 0 && mesh[i] <= 1 && mesh[i + 1] >= 0 && mesh[i + 1] <= 1);
}
assert.equal(motionMesh([128, 128, -1, -1], 1, go, 128, 128).length, 0);

const reference = strokeAt(old, .5);
for (let i = 0; i <= 60; i++) strokeAt(old, i / 60);
assert.deepEqual(strokeAt(old, .5), reference);
commitStroke(old);
assert.equal(old.x, 80); assert.deepEqual(old.cA, old.cB);
assert.deepEqual(strokeAt(old, 0).cA, [.3, .4, .5]);
assert.equal(strokeAt(old, 0).x, 80);
const covered = { g: 1, px: 20, py: 20, lenB: 4, widB: 4 };
const distant = { g: 1, px: 100, py: 20, lenB: 4, widB: 4 };
const other = { g: 2, px: 20, py: 20, lenB: 4, widB: 4 };
assert.equal(retireCovered([covered, distant, other], [{ g: 1, x: 20, y: 20, ang: 0, len: 10, wid: 10 }]), 1);
assert.equal(covered.ph, 2); assert.equal(distant.ph, undefined); assert.equal(other.ph, undefined);
console.log('Motion checks passed: sampling, static parts, shared paths, birth positions, meshes, time steps, boundary colours.');
