// Confronto: stesso test di interferenza sui rulli originali (STL passati da riga di comando).
// Uso: node test/orig-test.mjs positivo.stl negativo.stl
import Module from '../lib/manifold.js';
import { readFileSync } from 'node:fs';
import { AXIS_DIST } from '../geometry.js';

const wasm = await Module();
wasm.setup();
const { Manifold, Mesh } = wasm;

function loadSTL(path) {
  const b = readFileSync(path);
  const n = b.readUInt32LE(80);
  const vp = new Float32Array(n * 9), tv = new Uint32Array(n * 3);
  for (let t = 0; t < n; t++) {
    const o = 84 + t * 50 + 12;
    for (let k = 0; k < 9; k++) vp[t * 9 + k] = b.readFloatLE(o + 4 * k);
    tv[3 * t] = 3 * t; tv[3 * t + 1] = 3 * t + 1; tv[3 * t + 2] = 3 * t + 2;
  }
  const mesh = new Mesh({ numProp: 3, vertProperties: vp, triVerts: tv });
  mesh.merge();
  const m = new Manifold(mesh);
  const bb = m.boundingBox();
  return m.translate([-(bb.min[0] + bb.max[0]) / 2, -(bb.min[1] + bb.max[1]) / 2, -bb.min[2]]);
}

const P = loadSTL(process.argv[2]), N = loadSTL(process.argv[3]);
console.log('status', P.status(), N.status());
let worst = 0, sum = 0, cnt = 0;
for (let deg = 0; deg < 360; deg += 2.5) {
  const v = P.rotate([0, 0, deg]).intersect(N.rotate([0, 0, 180 - deg]).translate([AXIS_DIST, 0, 0])).volume();
  worst = Math.max(worst, v); sum += v; cnt++;
}
console.log('interferenza max', worst.toFixed(3), 'media', (sum / cnt).toFixed(3), 'mm³');
