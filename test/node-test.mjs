// Test in node: maschera sintetica -> rulli; poi verifica che positivo e negativo non si tocchino
// mentre girano in presa all'interasse della scocca originale.
// Uso: node test/node-test.mjs
import Module from '../lib/manifold.js';
import { traceContours, extendPeriodic, simplifyClosed } from '../trace.js';
import { buildRollers, C, ZH, AXIS_DIST, R } from '../geometry.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { toSTL } from '../export.js';

const wasm = await Module();
wasm.setup();
const { Manifold } = wasm;

// maschera 10 px/mm, larga esattamente una circonferenza
const W = Math.round(C * 10), H = ZH * 10, sx = W / C, sy = 10;
const alpha = new Uint8Array(W * H);
const paint = (fn) => {
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = (i + 0.5) / sx, v = (j + 0.5) / sy;
    const a = fn(u, v);
    if (a > 0) alpha[j * W + i] = Math.max(alpha[j * W + i], Math.round(255 * Math.min(1, a)));
  }
};
// pois a passo 8 (12 per giro esatti in u: 94,25 / 12)
const pu = C / 12;
paint((u, v) => {
  const ku = Math.round(u / pu), kv = Math.round(v / 8);
  const d = Math.hypot(u - ku * pu, v - kv * 8);
  return v > 30 ? 1.5 - d : 0; // raggio 1,5 con bordo sfumato
});
// barra a cavallo della cucitura (u da C-6 a 6)
paint((u, v) => ((u > C - 6 || u < 6) && v > 10 && v < 16 ? 1 : 0));
// "L" asimmetrica: con lo specchio sbagliato non combacia
paint((u, v) => ((u > 40 && u < 44 && v > 2 && v < 12) || (u > 40 && u < 55 && v > 8 && v < 12) ? 1 : 0));
// tratto sottile (0,5 mm) per il controllo dei tratti
paint((u, v) => (u > 30 && u < 70 && v > 22 && v < 22.5 ? 1 : 0));

const t0 = performance.now();
const ext = extendPeriodic(alpha, W, H, Math.ceil(2 * sx));
const contours = traceContours(ext.field, ext.w, ext.h).map((c) => simplifyClosed(c, 0.15));
const t1 = performance.now();
const r = buildRollers(wasm, { contours, sx, sy, x0: ext.x0, y0: ext.y0 }, {});
const t2 = performance.now();
console.log(`contorni ${contours.length} in ${(t1 - t0).toFixed(0)} ms, rulli in ${(t2 - t1).toFixed(0)} ms`);
console.log('info', r.info);
console.log('avvisi', r.warnings);
for (const [k, m] of [['pos', r.positive], ['neg', r.negative]]) {
  const b = m.boundingBox();
  console.log(k, 'genus', m.genus(), 'vol', m.volume().toFixed(0), 'bbox', b.min.map((x) => x.toFixed(2)), b.max.map((x) => x.toFixed(2)));
}

// interferenza: positivo all'origine, negativo a (AXIS_DIST, 0) ruotato di 180° (tacche affacciate).
// Girando, il positivo ruota di +φ e il negativo di −φ.
let worst = 0;
for (let deg = 0; deg < 360; deg += 7.5) {
  const P = r.positive.rotate([0, 0, deg]);
  const N = r.negative.rotate([0, 0, 180 - deg]).translate([AXIS_DIST, 0, 0]);
  const v = P.intersect(N).volume();
  worst = Math.max(worst, v);
  if (v > 0.01) console.log(`  φ=${deg}° interferenza ${v.toFixed(3)} mm³`);
}
console.log('interferenza massima (giusto allineamento):', worst.toFixed(4), 'mm³');
// controprova: con lo specchio sbagliato (negativo = positivo non specchiato) deve interferire
{
  let wrong = 0;
  for (let deg = 0; deg < 360; deg += 7.5) {
    const P = r.positive.rotate([0, 0, deg]);
    const Nwrong = r.negative.mirror([0, 1, 0]).rotate([0, 0, 180 - deg]).translate([AXIS_DIST, 0, 0]);
    wrong = Math.max(wrong, P.intersect(Nwrong).volume());
  }
  console.log('controprova (specchio sbagliato): max', wrong.toFixed(2), 'mm³ (deve essere molto più grande)');
}
// rilievo e fondo
console.log('raggio max positivo', (r.positive.boundingBox().max[0]).toFixed(2), 'atteso', R + 1.2);

mkdirSync(new URL('../out/', import.meta.url), { recursive: true });
const pack = (m) => { const g = m.getMesh(); return { vertProperties: g.vertProperties, triVerts: g.triVerts, numProp: g.numProp }; };
writeFileSync(new URL('../out/positivo.stl', import.meta.url), toSTL(pack(r.positive)));
writeFileSync(new URL('../out/negativo.stl', import.meta.url), toSTL(pack(r.negative)));
console.log('STL in out/');
