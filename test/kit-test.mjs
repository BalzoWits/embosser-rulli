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
report('manovella agganciata vs mozzo', vol(A.crank, A.hub));
// baionetta: entra dall'alto ruotata di bayTravel, gira fino al fermo, poi è trattenuta
{
  const crankAt = (deg, dz = 0) => rotAbout(A.crank, a, deg).translate([0, 0, dz]);
  let worst = 0;
  for (const dz of [0, 1, 2, 3, 4, 6, 8]) worst = Math.max(worst, vol(crankAt(K.bayTravel, dz), A.hub));
  report('baionetta: inserimento dall\'alto (ruotata, sollevata 0-8 mm)', worst);
  worst = 0;
  for (let d = 0; d <= K.bayTravel; d += 5) worst = Math.max(worst, vol(crankAt(d), A.hub));
  report('baionetta: rotazione da ingresso a fermo', worst);
  const stop = vol(crankAt(-3), A.hub);
  console.log(`${stop > 0.5 ? '✓' : '✗'} baionetta: fermo di fine corsa (oltre di 3° tocca: ${stop.toFixed(2)} mm³)`);
  const held = vol(crankAt(0, 1), A.hub);
  console.log(`${held > 0.5 ? '✓' : '✗'} baionetta: agganciata non si sfila (sollevata 1 mm tocca: ${held.toFixed(2)} mm³)`);
  const held2 = vol(crankAt(K.bayTravel / 2, 1), A.hub);
  console.log(`${held2 > 0.5 ? '✓' : '✗'} baionetta: a metà rotazione già trattenuta (${held2.toFixed(2)} mm³)`);
}
report('mozzo vs ingranaggio alto B', vol(A.hub, A.gearBk));
report('mozzo vs coperchio (sede conica)', vol(A.hub, A.lid));
report('mozzo vs ingranaggio alto A', vol(A.hub, A.gearA2));
for (const d of [0, 7, 22]) report(`mozzo che gira vs ingranaggio A (${d}°)`, vol(rotAbout(A.hub, a, -d), rotAbout(A.gearA2, -a, d)));
// il mozzo è davvero imprigionato? (il collare deve essere più stretto del foro alto, il cono più largo)
{
  const lift = vol(A.hub.translate([0, 0, 1.0]), A.lid);
  console.log(`${lift > 0.5 ? '✓' : '✗'} mozzo trattenuto dal cono (sollevato di 1 mm tocca il coperchio: ${lift.toFixed(2)} mm³)`);
}
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

// 4) pareti troppo sottili per l'ugello da 0,4: fette orizzontali ogni 0,5 mm, apertura morfologica
//    di raggio 0,42 (sparisce tutto ciò che è più stretto di ~0,85 mm = due linee di estrusione)
const MIN = 0.85;
for (const [k, m] of Object.entries(kit.print)) {
  if (k.startsWith('gear')) continue; // la cresta dei denti è stretta per natura
  const b = m.boundingBox();
  const bad = [];
  for (let z = b.min[2] + 0.25; z < b.max[2]; z += 0.5) {
    const s = m.slice(z);
    const area = s.area();
    if (area < 0.01) continue;
    const open = s.offset(-MIN / 2, 'Round', 2, 24).offset(MIN / 2, 'Round', 2, 24);
    const lost = area - open.area();
    if (lost > 1.0) bad.push(`z ${z.toFixed(1)}: ${lost.toFixed(1)} mm²`);
  }
  console.log(`${bad.length ? '✗' : '✓'} pareti sotto ${MIN} mm in ${k}${bad.length ? ': ' + bad.slice(0, 6).join(', ') + (bad.length > 6 ? ` … (${bad.length} fette)` : '') : ''}`);
}

mkdirSync(new URL('../out/kit/', import.meta.url), { recursive: true });
const pack = (m) => { const g = m.getMesh(); return { vertProperties: g.vertProperties, triVerts: g.triVerts, numProp: g.numProp }; };
for (const [k, m] of Object.entries(kit.print)) writeFileSync(new URL(`../out/kit/${k}.stl`, import.meta.url), toSTL(pack(m)));
const all = Object.values(A).reduce((s, m) => s.add(m)).add(rollerA(0)).add(rollerB(0));
writeFileSync(new URL('../out/kit/montato.stl', import.meta.url), toSTL(pack(all)));
console.log('STL in out/kit/');
