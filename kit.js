// Portarulli: scocca, coperchio, 4 ingranaggi e manovella estraibile, compatibili con i rulli di geometry.js.
// Ricostruzione con le misure del "Business Card Embosser" di MakerSpace.Online (CC BY-NC-SA 4.0):
// stessi incastri e stessa pila verticale, pezzi ridisegnati. Modulo puro (browser e node).
//
// Riferimento del montaggio: z = 0 sotto la scocca. Rullo A (positivo) a x = -15,05, rullo B (negativo,
// lato manovella) a x = +15,05. Il biglietto entra dal davanti (-y) ed esce dietro (+y).
// Fase: ogni ingranaggio ha un segno a +x locale. Gli A hanno un dente sul segno, i B un vano. Montando
// tutti i segni (e le tacche dei rulli) rivolti verso l'altro rullo, i denti ingranano e i rulli sono in fase.

import { AXIS_DIST, LEN, R as ROLLER_R } from './geometry.js';

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

export const KIT_DEFAULTS = {
  crankLen: 55,     // distanza asse manovella - impugnatura
};

export const K = {
  // pila verticale (z della scocca)
  floor: 3.3,          // fondo
  gearH: 10,           // spessore della corona dentata
  pegH: 10,            // perno quadro
  vGap: 0.4,           // gioco verticale sotto il coperchio
  // ingranaggi (24 denti, Ø esterno 32,24 come l'originale)
  teeth: 24,
  module: 1.24,
  pressure: 20,
  backlash: 0.12,      // assottigliamento del dente sul primitivo
  gearChamfer: 0.5,
  peg: 11.4,           // perno quadro nell'incastro 12×12 dei rulli
  pegR: 0.6,
  pegTip: 0.8,
  // perno della scocca / del coperchio e foro dell'ingranaggio (misure dell'originale)
  postR: 6.8, postCyl: 4.7, postConeH: 3.3, postTopR: 5.1,
  holeR: 7.0, holeCyl0: 0.7, holeCyl1: 4.7, holeCone1: 8.8, holeTopR: 5.0,
  // scocca
  wall: 2.6,
  innerClr: 1.0,       // dall'ingranaggio alla parete interna
  slitIn: 2.4,         // feritoia d'ingresso
  slitOut: 5,          // feritoia d'uscita
  flange: 4,           // guide interne della feritoia d'ingresso
  flangeT: 1.6,
  // aggancio del coperchio
  snapH: 8.4,          // altezza della zona assottigliata in cima alla parete
  skirtT: 1.2,
  skirtClr: 0.15,
  groove: 0.45,
  // coperchio
  lidT: 3,
  // manovella
  keyS: 6.1, sockS: 6.5, sockDepth: 8,
  shaftR: 6.55, lidHoleR: 6.85,
  collarR: 9, armT: 6, armW0: 18, armW1: 14,
  gripR: 8, gripL: 28, gripPinR: 3.0, gripHoleR: 3.15, gripLip: 0.45, gripSlot: 1.3,
};

// quote derivate della pila
export function stack() {
  const zGearBot = K.floor;                          // faccia inferiore ingranaggio basso
  const zRoller = zGearBot + K.gearH;                // base dei rulli
  const zGearTop = zRoller + LEN;                    // faccia inferiore della corona superiore (lato perno)
  const zTopFace = zGearTop + K.gearH;               // faccia superiore ingranaggi alti
  const zLid = zTopFace + K.vGap;                    // sotto del coperchio = cima della parete
  return { zGearBot, zRoller, zGearTop, zTopFace, zLid, zLidTop: zLid + K.lidT };
}

// ---------------------------------------------------------------- ingranaggio a evolvente
const inv = (a) => Math.tan(a) - a;

// profilo 2D: denti centrati su phaseDeg + k·360/z
export function gearProfile(CrossSection, { m = K.module, z = K.teeth, pa = K.pressure, backlash = K.backlash, phaseDeg = 0 } = {}) {
  const alpha = pa * D2R;
  const rp = (m * z) / 2, ra = rp + m, rf = rp - 1.25 * m, rb = rp * Math.cos(alpha);
  const psiP = (Math.PI * m / 2 - backlash) / (2 * rp);           // mezzo spessore angolare sul primitivo
  const psi = (r) => psiP + inv(alpha) - inv(Math.acos(Math.min(1, rb / Math.max(r, rb))));
  const rs = [];
  const r0 = Math.max(rf, rb);
  const nF = 10;
  for (let i = 0; i <= nF; i++) rs.push(r0 + ((ra - r0) * i) / nF);
  const pts = [];
  const P = (r, a) => pts.push([r * Math.cos(a), r * Math.sin(a)]);
  const step = TAU / z;
  for (let k = 0; k < z; k++) {
    const c = phaseDeg * D2R + k * step;
    // fondo tra il dente precedente e questo
    const prevEnd = c - step + psi(r0), thisStart = c - psi(r0);
    for (let j = 1; j <= 3; j++) P(rf, prevEnd + ((thisStart - prevEnd) * j) / 4);
    P(rf, thisStart); if (rb > rf) P(r0, thisStart);
    for (let i = 1; i < rs.length; i++) P(rs[i], c - psi(rs[i]));     // fianco sinistro
    const tipA = psi(ra);
    for (let j = 1; j < 3; j++) P(ra, c - tipA + (2 * tipA * j) / 3); // cresta
    for (let i = rs.length - 1; i >= 1; i--) P(rs[i], c + psi(rs[i])); // fianco destro
    if (rb > rf) P(r0, c + psi(r0));
    P(rf, c + psi(r0));
  }
  return { cs: new CrossSection([pts]), ra, rp, rf };
}

// segno inciso a +x vicino al bordo (profondità d, a quota z0): triangolo per gli A, barretta per i B
function markShape(CrossSection, type, rOut, d, z0) {
  const cs = type === 'A'
    ? new CrossSection([[[rOut - 3.4, -1.3], [rOut - 0.6, 0], [rOut - 3.4, 1.3]]])
    : CrossSection.square([3, 1.1]).translate([rOut - 3.6, -0.55]);
  return cs.extrude(d + 0.01).translate([0, 0, z0]);
}

// Ingranaggio nel suo riferimento: corona z 0..gearH (lato foro in basso), perno quadro gearH..gearH+pegH.
// type 'A' = dente sul segno, 'B' = vano sul segno. bore: 'post' (foro con cono) o 'socket' (quadro per la manovella)
export function buildGear(wasm, { type = 'A', bore = 'post' } = {}) {
  const { Manifold, CrossSection } = wasm;
  const phase = type === 'A' ? 0 : 180 / K.teeth;
  const { cs, ra } = gearProfile(CrossSection, { phaseDeg: phase });
  const H = K.gearH, c = K.gearChamfer;
  let g = cs.extrude(H);
  const cut = Manifold.revolve(new CrossSection([[[0, 0], [ra - c, 0], [ra + 0.01, c], [ra + 0.01, H - c], [ra - c, H], [0, H]]]), 128);
  g = g.intersect(cut);
  // perno quadro con spigoli arrotondati e punta smussata
  const s = K.peg, rr = K.pegR;
  const sq = CrossSection.square([s - 2 * rr, s - 2 * rr], true).offset(rr, 'Round', 2, 16);
  const pegBody = sq.extrude(K.pegH - K.pegTip).translate([0, 0, H - 0.01]);
  const tip = sq.extrude(K.pegTip + 0.01, 0, 0, [(s - 2 * K.pegTip) / s, (s - 2 * K.pegTip) / s]).translate([0, 0, H + K.pegH - K.pegTip - 0.01]);
  g = g.add(pegBody).add(tip);
  // foro
  if (bore === 'post') {
    const hole = Manifold.revolve(new CrossSection([[
      [0, -0.1], [K.holeR + 0.7, -0.1], [K.holeR, K.holeCyl0], [K.holeR, K.holeCyl1], [K.holeTopR, K.holeCone1], [0, K.holeCone1],
    ]]), 96);
    g = g.subtract(hole);
  } else {
    const q = K.sockS;
    const sock = CrossSection.square([q, q], true).extrude(K.sockDepth + 0.1).translate([0, 0, -0.1])
      .add(CrossSection.square([q + 1.2, q + 1.2], true).extrude(0.6, 0, 0, [q / (q + 1.2), q / (q + 1.2)]).translate([0, 0, -0.01]));
    g = g.subtract(sock);
  }
  // segni a +x su entrambe le facce della corona
  g = g.subtract(markShape(CrossSection, type, ra - 1.6, 0.4, -0.01)).subtract(markShape(CrossSection, type, ra - 1.6, 0.4, H - 0.39));
  return g;
}

// ---------------------------------------------------------------- scocca e coperchio
function stadium(CrossSection, halfLen, r, seg = 96) {
  return CrossSection.hull([CrossSection.circle(r, seg).translate([-halfLen, 0]), CrossSection.circle(r, seg).translate([halfLen, 0])]);
}

export function buildBody(wasm) {
  const { Manifold, CrossSection } = wasm;
  const st = stack();
  const a = AXIS_DIST / 2;
  const gearRa = (K.module * (K.teeth + 2)) / 2;
  const rIn = gearRa + K.innerClr, rOut = rIn + K.wall;
  const Htot = st.zLid;
  const outer = stadium(CrossSection, a, rOut), inner = stadium(CrossSection, a, rIn);
  let body = outer.extrude(Htot).subtract(inner.extrude(Htot).translate([0, 0, K.floor]));
  // assottigliamento esterno in cima (ci si infila la gonna del coperchio) e scanalatura d'aggancio
  const zs = Htot - K.snapH;
  const thin = outer.subtract(stadium(CrossSection, a, rOut - K.skirtT));
  body = body.subtract(thin.extrude(K.snapH + 0.01).translate([0, 0, zs]));
  const grooveRing = stadium(CrossSection, a, rOut - K.skirtT).subtract(stadium(CrossSection, a, rOut - K.skirtT - K.groove));
  const zg = zs + K.snapH * 0.42;
  body = body.subtract(grooveRing.extrude(1.4).translate([0, 0, zg]));
  // perni per gli ingranaggi bassi
  const post = Manifold.revolve(new CrossSection([[[0, 0], [K.postR, 0], [K.postR, K.postCyl], [K.postTopR, K.postCyl + K.postConeH], [0, K.postCyl + K.postConeH]]]), 96);
  body = body.add(post.translate([-a, 0, K.floor - 0.01])).add(post.translate([a, 0, K.floor - 0.01]));
  // feritoia d'ingresso (davanti) con guide, e d'uscita (dietro): il fondo della feritoia tiene il
  // biglietto centrato sulla zona del disegno (2,5 mm sopra la base del rullo)
  const zSlit = st.zRoller + 2.5;
  const big = 200;
  body = body.subtract(Manifold.cube([K.slitIn, rOut + 2, big], false).translate([-K.slitIn / 2, -rOut - 1, zSlit]));
  body = body.subtract(Manifold.cube([K.slitOut, rOut + 2, big], false).translate([-K.slitOut / 2, -1, zSlit]));
  // invito svasato all'uscita
  const flare = new CrossSection([[[-K.slitOut / 2, rIn + 0.01], [K.slitOut / 2, rIn + 0.01], [K.slitOut / 2 + 1.6, rOut + 0.5], [-K.slitOut / 2 - 1.6, rOut + 0.5]]], 'EvenOdd');
  body = body.subtract(flare.extrude(big).translate([0, 0, zSlit]));
  const fl = (sx) => Manifold.cube([K.flangeT, K.flange + 0.5, Htot - K.snapH - zSlit + 6], false)
    .translate([sx > 0 ? K.slitIn / 2 : -K.slitIn / 2 - K.flangeT, -rIn - 0.5, zSlit - 6]);
  body = body.add(fl(1)).add(fl(-1));
  // invito svasato all'ingresso
  const flareIn = new CrossSection([[[-K.slitIn / 2, -rIn + 0.2], [K.slitIn / 2, -rIn + 0.2], [K.slitIn / 2 + 1.2, -rOut - 0.5], [-K.slitIn / 2 - 1.2, -rOut - 0.5]]], 'EvenOdd');
  body = body.subtract(flareIn.extrude(big).translate([0, 0, zSlit]));
  return { body, rIn, rOut, zg, zs, zSlit };
}

export function buildLid(wasm, bodyInfo) {
  const { Manifold, CrossSection } = wasm;
  const st = stack();
  const a = AXIS_DIST / 2;
  const { rOut, zg, zs } = bodyInfo;
  const plate = stadium(CrossSection, a, rOut + K.skirtClr + K.skirtT * 0 + 0.0).extrude(K.lidT).translate([0, 0, st.zLid]);
  // gonna esterna con dente d'aggancio a gradini (si stampa a testa in giù senza supporti)
  const skIn = stadium(CrossSection, a, rOut - K.skirtT + K.skirtClr);
  const skOut = stadium(CrossSection, a, rOut + K.skirtClr);
  let lid = plate.add(skOut.subtract(skIn).extrude(st.zLid - zs + 0.01).translate([0, 0, zs]));
  const steps = [0.15, 0.3, 0.42];
  const zb = zg + 0.2;
  steps.forEach((d, i) => {
    const ring = skIn.subtract(stadium(CrossSection, a, rOut - K.skirtT + K.skirtClr - d));
    lid = lid.add(ring.extrude(0.4).translate([0, 0, zb + (2 - i) * 0.35]));
  });
  // perno per l'ingranaggio alto A (sotto il coperchio, verso il basso)
  const post = Manifold.revolve(new CrossSection([[[0, 0], [K.postR, 0], [K.postR, K.postCyl], [K.postTopR, K.postCyl + K.postConeH], [0, K.postCyl + K.postConeH]]]), 96)
    .mirror([0, 0, 1]).translate([-a, 0, st.zLid + 0.01]);
  lid = lid.add(post);
  // foro per l'albero della manovella sopra l'ingranaggio B
  lid = lid.subtract(Manifold.cylinder(K.lidT + 2, K.lidHoleR, K.lidHoleR, 96).translate([a, 0, st.zLid - 1]));
  // freccia del verso di rotazione (orario visto dall'alto), incisa sulla faccia superiore
  const ra = 12.5, w = 1.4;
  const arcPts = [];
  const a0 = 200 * D2R, a1 = 320 * D2R; // archi in senso orario: da 200° scende a ... (visto dall'alto)
  for (let i = 0; i <= 24; i++) { const t = a1 - ((a1 - a0) * i) / 24; arcPts.push([a + (ra + w / 2) * Math.cos(t), (ra + w / 2) * Math.sin(t)]); }
  for (let i = 24; i >= 0; i--) { const t = a1 - ((a1 - a0) * i) / 24; arcPts.push([a + (ra - w / 2) * Math.cos(t), (ra - w / 2) * Math.sin(t)]); }
  const arc = new CrossSection([arcPts], 'EvenOdd');
  // punta della freccia alla fine (angolo a0, verso orario = angolo decrescente)
  const ex = a + ra * Math.cos(a0), ey = ra * Math.sin(a0);
  const tx = Math.sin(a0), ty = -Math.cos(a0); // tangente in verso orario
  const nx = Math.cos(a0), ny = Math.sin(a0);
  const head = new CrossSection([[[ex + nx * 2.4, ey + ny * 2.4], [ex + tx * 3.6, ey + ty * 3.6], [ex - nx * 2.4, ey - ny * 2.4]]], 'EvenOdd');
  const arrow = CrossSection.union([arc, head]).extrude(0.6).translate([0, 0, st.zLidTop - 0.5]);
  lid = lid.subtract(arrow);
  return lid;
}

// ---------------------------------------------------------------- manovella estraibile
// Riferimento: asse della manovella sull'asse z, z = 0 al sotto del collare. Albero e chiave verso -z.
export function buildCrank(wasm, { crankLen = KIT_DEFAULTS.crankLen } = {}) {
  const { Manifold, CrossSection } = wasm;
  const st = stack();
  const zCollar = st.zLidTop + 0.2;                         // quota del sotto del collare nel montaggio
  const shaftLen = zCollar - (st.zTopFace + 0.2);           // tratto tondo (attraversa il coperchio)
  const keyLen = K.sockDepth - 0.4;
  const L = crankLen;
  // braccio: inviluppo tra il mozzo e la testa dell'impugnatura
  const arm2d = CrossSection.hull([CrossSection.circle(K.armW0 / 2, 64), CrossSection.circle(K.armW1 / 2, 64).translate([L, 0])]);
  let arm = arm2d.extrude(K.armT);
  arm = arm.add(Manifold.cylinder(K.armT, K.collarR, K.collarR, 64));
  // smusso superiore del braccio (più comodo e più bello)
  const shaft = Manifold.cylinder(shaftLen + 0.01, K.shaftR, K.shaftR, 96).translate([0, 0, -shaftLen]);
  const q = K.keyS;
  const key = CrossSection.square([q, q], true).extrude(keyLen - 0.6).translate([0, 0, -shaftLen - keyLen + 0.6])
    .add(CrossSection.square([q, q], true).extrude(0.6, 0, 0, [(q - 1.2) / q, (q - 1.2) / q]).mirror([0, 0, 1]).translate([0, 0, -shaftLen - keyLen + 0.6]));
  let crank = arm.add(shaft).add(key);
  crank = crank.subtract(Manifold.cylinder(K.armT + 2, K.gripHoleR, K.gripHoleR, 48).translate([L, 0, -1]));
  // impugnatura girevole: manicotto con due linguette a scatto che passano nel foro del braccio
  const sleeve = Manifold.cylinder(K.gripL, K.gripR, K.gripR, 96)
    .subtract(Manifold.cylinder(1.2, K.gripR + 1, K.gripR, 96).translate([0, 0, K.gripL - 1.2])) // bordo arrotondato in cima
    .add(Manifold.cylinder(1.2, K.gripR, K.gripR - 1.2, 96).translate([0, 0, K.gripL - 1.21]));
  const pinLen = K.armT + 0.5; // 0,3 sopra il braccio + 0,2 di gioco sotto
  let pin = Manifold.cylinder(pinLen + 0.01, K.gripPinR, K.gripPinR, 48).translate([0, 0, -pinLen]);
  // dente a cono: entra stringendo le due linguette, poi la spalla trattiene sotto il braccio
  const lip = Manifold.cylinder(1.6, K.gripPinR - 0.5, K.gripPinR + K.gripLip, 48).translate([0, 0, -pinLen - 1.59]);
  pin = pin.add(lip);
  pin = pin.subtract(Manifold.cube([K.gripSlot, 20, pinLen + 2.2], false).translate([-K.gripSlot / 2, -10, -pinLen - 2.2]));
  const grip = sleeve.translate([0, 0, 0.3]).add(pin.translate([0, 0, 0.3]));
  return { crank, grip, zCollar, L };
}

// ---------------------------------------------------------------- kit completo
export function buildKit(wasm, params = {}) {
  const p = { ...KIT_DEFAULTS, ...params };
  const st = stack();
  const a = AXIS_DIST / 2;
  const bodyInfo = buildBody(wasm);
  const lid = buildLid(wasm, bodyInfo);
  const gearA = buildGear(wasm, { type: 'A', bore: 'post' });
  const gearB = buildGear(wasm, { type: 'B', bore: 'post' });
  const gearBk = buildGear(wasm, { type: 'B', bore: 'socket' });
  const { crank, grip, zCollar, L } = buildCrank(wasm, p);

  // pezzi da stampare (in piedi sul piatto, senza supporti)
  const onBed = (m) => {
    const b = m.boundingBox();
    return m.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]]);
  };
  const flip = (m) => m.rotate([180, 0, 0]);
  const print = {
    body: onBed(bodyInfo.body),
    lid: onBed(flip(lid)),
    gearA1: onBed(gearA),
    gearA2: onBed(gearA),
    gearB: onBed(gearB),
    gearBk: onBed(gearBk),
    crank: onBed(flip(crank)),
    grip: onBed(flip(grip)),
  };

  // montaggio (per anteprima e test): ingranaggi A verso +x, B ruotati di 180°
  const topFlip = (m) => m.rotate([180, 0, 0]); // mantiene il segno su +x
  const asm = {
    body: bodyInfo.body,
    lid,
    gearA1: gearA.translate([-a, 0, st.zGearBot]),
    gearB: gearB.rotate([0, 0, 180]).translate([a, 0, st.zGearBot]),
    gearA2: topFlip(gearA).translate([-a, 0, st.zTopFace]),
    gearBk: topFlip(gearBk).rotate([0, 0, 180]).translate([a, 0, st.zTopFace]),
    crank: crank.translate([a, 0, zCollar]),
    grip: grip.translate([a + L, 0, zCollar + K.armT]),
  };
  for (const [k, m] of Object.entries(print)) {
    if (m.status() !== 'NoError' || m.isEmpty()) throw new Error(`Geometria non valida: ${k} (${m.status()})`);
  }
  return { print, asm, stack: st, info: { crankLen: L, bodyH: st.zLidTop, rollerZ: st.zRoller, axis: a } };
}
