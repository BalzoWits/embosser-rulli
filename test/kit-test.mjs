// Test del portarulli: costruisce kit e rulli montati e misura le compenetrazioni tra i pezzi.
// Uso: node test/kit-test.mjs   (scrive gli STL in out/kit/)
import Module from '../lib/manifold.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildKit, K } from '../kit.js';
import { buildRollers, AXIS_DIST, C, ZH } from '../geometry.js';
import { traceContours, extendPeriodic } from '../trace.js';
import { toSTL } from '../export.js';

const wasm = await Module();
wasm.setup();
const t0 = performance.now();
const kit = buildKit(wasm, {});
console.log(`kit in ${(performance.now() - t0).toFixed(0)} ms`, kit.info, kit.stack);

// rulli con una barra di prova
const W = Math.round(C * 10), H = ZH * 10, sx = W / C, sy = 10;
const alpha = new Uint8Array(W * H);
for (let j = 100; j < 300; j++) for (let i = 200; i < 260; i++) alpha[j * W + i] = 255;
const ext = extendPeriodic(alpha, W, H, Math.ceil(2 * sx));
const rol = buildRollers(wasm, { contours: traceContours(ext.field, ext.w, ext.h), sx, sy, x0: ext.x0, y0: ext.y0 }, {});
const a = AXIS_DIST / 2, zR = kit.stack.zRoller;

const A = kit.asm;
const vol = (m1, m2) => m1.intersect(m2).volume();
const report = (name, v, tol = 0.01) => console.log(`${v > tol ? '✗' : '✓'} ${name}: ${v.toFixed(3)} mm³`);

// rotazione attorno all'asse di un rullo
const rotAbout = (m, x, deg) => m.translate([-x, 0, 0]).rotate([0, 0, deg]).translate([x, 0, 0]);
const rollerA = (deg) => rol.positive.rotate([0, 0, deg]).translate([-a, 0, zR]);
const rollerB = (deg) => rol.negative.rotate([0, 0, 180 - deg]).translate([a, 0, zR]);

// 1) ingranaggi in presa (basso e alto) mentre girano
let worstLow = 0, worstTop = 0;
for (let d = 0; d <= 30; d += 1.5) {
  worstLow = Math.max(worstLow, vol(rotAbout(A.gearA1, -a, d), rotAbout(A.gearB, a, -d)));
  worstTop = Math.max(worstTop, vol(rotAbout(A.gearA2, -a, d), rotAbout(A.gearBk, a, -d)));
}
report('ingranaggi bassi in presa (max su 30°)', worstLow);
report('ingranaggi alti in presa (max su 30°)', worstTop);
// controprova: stessi ingranaggi entrambi di tipo A (dente contro dente) devono interferire
{
  const wrong = vol(A.gearA1, rotAbout(A.gearA1.translate([2 * a, 0, 0]), a, 180));
  console.log(`  controprova dente contro dente: ${wrong.toFixed(2)} mm³ (deve essere > 0)`);
}

// 2) scocca e coperchio contro i pezzi che girano
for (const d of [0, 7, 22]) {
  report(`scocca vs ingranaggi (${d}°)`, vol(A.body, rotAbout(A.gearA1, -a, d).add(rotAbout(A.gearB, a, -d)).add(rotAbout(A.gearA2, -a, d)).add(rotAbout(A.gearBk, a, -d))));
  report(`scocca vs rulli (${d}°)`, vol(A.body, rollerA(d).add(rollerB(d))));
  report(`coperchio vs ingranaggi alti (${d}°)`, vol(A.lid, rotAbout(A.gearA2, -a, d).add(rotAbout(A.gearBk, a, -d))));
  report(`coperchio vs manovella (${d}°)`, vol(A.lid, rotAbout(A.crank, a, -d)));
}
// 3) incastri
report('perni quadri vs rulli', vol(A.gearA1.add(A.gearA2), rollerA(0)) + vol(A.gearB.add(A.gearBk), rollerB(0)));
report('rulli tra loro (0°)', vol(rollerA(0), rollerB(0)), 0.5);
report('chiave manovella vs ingranaggio alto', vol(A.crank, A.gearBk));
report('impugnatura vs braccio', vol(A.grip, A.crank));
report('coperchio vs scocca (aggancio)', vol(A.lid, A.body));
// distanze verticali
const bb = (m) => m.boundingBox();
console.log('quote: ingr. basso', bb(A.gearA1).min[2].toFixed(2), '-', bb(A.gearA1).max[2].toFixed(2),
  '| rullo', zR.toFixed(2), '-', (zR + 60).toFixed(2), '| ingr. alto', bb(A.gearA2).min[2].toFixed(2), '-', bb(A.gearA2).max[2].toFixed(2),
  '| coperchio', bb(A.lid).min[2].toFixed(2), '-', bb(A.lid).max[2].toFixed(2), '| manovella fino a', bb(A.grip).max[2].toFixed(2));
for (const [k, m] of Object.entries(kit.print)) {
  const b = m.boundingBox();
  console.log(`stampa ${k.padEnd(7)} ${b.max.map((v, i) => (v - b.min[i]).toFixed(1)).join(' × ')} mm, genus ${m.genus()}, vol ${m.volume().toFixed(0)}`);
}

mkdirSync(new URL('../out/kit/', import.meta.url), { recursive: true });
const pack = (m) => { const g = m.getMesh(); return { vertProperties: g.vertProperties, triVerts: g.triVerts, numProp: g.numProp }; };
for (const [k, m] of Object.entries(kit.print)) writeFileSync(new URL(`../out/kit/${k}.stl`, import.meta.url), toSTL(pack(m)));
const all = Object.values(A).reduce((s, m) => s.add(m)).add(rollerA(0)).add(rollerB(0));
writeFileSync(new URL('../out/kit/montato.stl', import.meta.url), toSTL(pack(all)));
console.log('STL in out/kit/');
