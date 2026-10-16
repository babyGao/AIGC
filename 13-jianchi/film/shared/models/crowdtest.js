import { standing, sideStanding } from './crowd.js';
import { placer } from './profile.js';
const V = [{ robe: 'robeD', hair: 'hairW', style: 'bun', fur: true, beard: true, sleeve: 'point', face: { age: .85, expr: 'roar', nose: 1.3, eyeRed: true } }, { robe: 'robe', hair: 'hairW', style: 'long', face: { female: 1 } }, { robe: 'robeD', hair: 'hair', style: 'long', belt: 'gold', face: { female: 1, expr: 'grit' } }, { robe: 'robe', hair: 'hair', style: 'crown', belt: 'blue', beard: true, face: { expr: 'frown', age: .4 } }, { robe: 'robeD', hair: 'hair', style: 'bun', sleeve: 'raise', face: { expr: 'roar' } }];
export const CR = { box: [0, 0, 1100, 330], layers: V.flatMap((o, i) => sideStanding(o, placer([110 + i * 220, 310], 280))) };
