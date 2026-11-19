// Portarulli: scocca, coperchio, 4 ingranaggi e manovella estraibile, compatibili con i rulli di geometry.js.
// Disegnato da zero, compatibile con il "Business Card Embosser" di MakerSpace.Online:
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
  slitOut: 8,          // feritoia d'uscita (un po' più larga: il biglietto in rilievo esce meglio)
  flange: 4,           // guide interne della feritoia d'ingresso
  flangeT: 1.6,
  textH: 5, textStroke: 0.9, textDepth: 0.6,   // scritta "INSERT HERE" sulla scocca
  // aggancio del coperchio
  snapH: 8.4,          // altezza della zona assottigliata in cima alla parete
  skirtT: 1.6,
  skirtClr: 0.15,
  groove: 0.45,
  // coperchio
  lidT: 3,
  // mozzo (lato B): come la manopola originale, imprigionato dall'interno in una sede conica larga del
  // coperchio, che centra l'asse alto del rullo B senza gioco (prima l'asse ballava e i rulli si aprivano)
  seatTopR: 12.1, seatBotR: 13.6,   // sede conica nel coperchio (sopra stretta, sotto larga)
  seatVGap: 0.2,                    // gioco verticale nel cono (~0,09 radiale)
  hubKeyAF: 12, gearHexAF: 12.2, gearHexDepth: 7,   // esagono mozzo -> ingranaggio alto B
  bossR: 11.8, bossH: 4,            // collare sopra il coperchio
  hubSockAF: 16, hubSockDepth: 5.5, // sede esagonale per la manovella
  // manovella: chiave esagonale larga (prima un quadro da 6,1 che si rompeva)
  keyAF: 15.6, keyLen: 5.3,
  collarR: 13, armT: 7, armW0: 22, armW1: 14,
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

// esagono con un vertice su +x, dato lo spigolo-spigolo opposto (chiave)
const hexCS = (CrossSection, af) => CrossSection.circle(af / Math.sqrt(3), 6);

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
    // sede esagonale per il mozzo, con invito smussato
    const hx = hexCS(CrossSection, K.gearHexAF), hx2 = hexCS(CrossSection, K.gearHexAF + 1.2);
    const sock = hx.extrude(K.gearHexDepth + 0.1).translate([0, 0, -0.1])
      .add(hx2.extrude(0.6, 0, 0, [K.gearHexAF / (K.gearHexAF + 1.2), K.gearHexAF / (K.gearHexAF + 1.2)]).translate([0, 0, -0.01]));
    g = g.subtract(sock);
  }
  // segni a +x su entrambe le facce della corona
  g = g.subtract(markShape(CrossSection, type, ra - 1.6, 0.4, -0.01)).subtract(markShape(CrossSection, type, ra - 1.6, 0.4, H - 0.39));
  return g;
}

// ---------------------------------------------------------------- scritte a tratti
// Piccolo font a tratti (maiuscole), unità = altezza delle lettere; niente file di font nel worker.
const GLYPHS = {
  I: { w: 0, s: [[[0, 0], [0, 1]]] },
  N: { w: 0.62, s: [[[0, 0], [0, 1], [0.62, 0], [0.62, 1]]] },
  S: { w: 0.62, s: [[[0.62, 0.84], [0.5, 1], [0.12, 1], [0, 0.86], [0, 0.62], [0.12, 0.52], [0.5, 0.48], [0.62, 0.38], [0.62, 0.14], [0.5, 0], [0.12, 0], [0, 0.16]]] },
  E: { w: 0.56, s: [[[0.56, 1], [0, 1], [0, 0], [0.56, 0]], [[0, 0.5], [0.44, 0.5]]] },
  R: { w: 0.6, s: [[[0, 0], [0, 1], [0.46, 1], [0.6, 0.86], [0.6, 0.64], [0.46, 0.5], [0, 0.5]], [[0.3, 0.5], [0.6, 0]]] },
  T: { w: 0.62, s: [[[0, 1], [0.62, 1]], [[0.31, 1], [0.31, 0]]] },
  H: { w: 0.62, s: [[[0, 0], [0, 1]], [[0.62, 0], [0.62, 1]], [[0, 0.5], [0.62, 0.5]]] },
  ' ': { w: 0.3, s: [] },
};
export function strokeText(CrossSection, text, h, stroke) {
  const r = stroke / 2, gap = 0.36 * h;
  const parts = [];
  let x = 0;
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch];
    if (!g) continue;
    for (const line of g.s) {
      for (let i = 0; i + 1 < line.length; i++) {
        const [a, b] = [line[i], line[i + 1]];
        parts.push(CrossSection.hull([
          CrossSection.circle(r, 16).translate([x + a[0] * h, a[1] * h]),
          CrossSection.circle(r, 16).translate([x + b[0] * h, b[1] * h]),
        ]));
      }
    }
    x += g.w * h + gap;
  }
  return CrossSection.union(parts);
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
  // scanalatura d'aggancio sulla faccia esterna, a parete piena (la gonna del coperchio sta fuori):
  // sotto la scanalatura restano rOut - groove - rIn = 2,15 mm, abbastanza per 3 perimetri da 0,4
  const zs = Htot - K.snapH;
  // l'anello esce di 1 mm oltre la parete: facce coincidenti con la parete lasciano geometria sporca
  const grooveRing = stadium(CrossSection, a, rOut + 1).subtract(stadium(CrossSection, a, rOut - K.groove));
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
  // scritta verticale "INSERT HERE" accanto alla feritoia d'ingresso, incisa 0,6 mm, si legge dal basso
  const txt = strokeText(CrossSection, 'INSERT HERE', K.textH, K.textStroke);
  const tb = txt.bounds();
  const len = tb.max[0] - tb.min[0];
  const z0 = zSlit + (zs - 2 - zSlit - len) / 2 - tb.min[0];    // centrata in altezza sotto la zona d'aggancio
  const xBase = -K.slitIn / 2 - 3.2;                            // base delle lettere, a sinistra della feritoia
  const depth = K.textDepth;
  // (u, v, w) -> (x = xBase - v, y = -rOut + depth - w, z = z0 + u): rotazione propria (determinante +1)
  const engr = txt.extrude(depth + 1).warp((p) => {
    const u = p[0], v = p[1], w = p[2];
    p[0] = xBase - v; p[1] = -rOut + depth - w; p[2] = z0 + u;
  });
  body = body.subtract(engr);
  return { body, rIn, rOut, zg, zs, zSlit };
}

export function buildLid(wasm, bodyInfo) {
  const { Manifold, CrossSection } = wasm;
  const st = stack();
  const a = AXIS_DIST / 2;
  const { rOut, zg, zs } = bodyInfo;
  // gonna esterna attorno alla parete piena, con dente d'aggancio a gradini (si stampa a testa in giù)
  const rSkIn = rOut + K.skirtClr, rSkOut = rSkIn + K.skirtT;
  const plate = stadium(CrossSection, a, rSkOut).extrude(K.lidT).translate([0, 0, st.zLid]);
  const skIn = stadium(CrossSection, a, rSkIn);
  const skOut = stadium(CrossSection, a, rSkOut);
  let lid = plate.add(skOut.subtract(skIn).extrude(st.zLid - zs + 0.01).translate([0, 0, zs]));
  const steps = [0.15, 0.3, 0.42];
  const zb = zg + 0.2;
  steps.forEach((d, i) => {
    const ring = skIn.subtract(stadium(CrossSection, a, rSkIn - d));
    lid = lid.add(ring.extrude(0.4).translate([0, 0, zb + (2 - i) * 0.35]));
  });
  // perno per l'ingranaggio alto A (sotto il coperchio, verso il basso)
  const post = Manifold.revolve(new CrossSection([[[0, 0], [K.postR, 0], [K.postR, K.postCyl], [K.postTopR, K.postCyl + K.postConeH], [0, K.postCyl + K.postConeH]]]), 96)
    .mirror([0, 0, 1]).translate([-a, 0, st.zLid + 0.01]);
  lid = lid.add(post);
  // sede conica del mozzo sopra l'ingranaggio B: stretta in alto, larga in basso (il mozzo entra da sotto)
  const tap = (K.seatBotR - K.seatTopR) / K.lidT;
  const seat = Manifold.cylinder(K.lidT + 2, K.seatBotR + tap, K.seatTopR - tap, 128).translate([a, 0, st.zLid - 1]);
  lid = lid.subtract(seat);
  // freccia del verso di rotazione (orario visto dall'alto), incisa sulla faccia superiore
  const ra = 16.5, w = 1.4;
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

// quote del mozzo senza costruirlo (servono alla manovella)
function buildHubInfo() {
  const st = stack();
  return { bossTop: st.zLid - st.zTopFace + K.lidT + K.bossH };
}

// ---------------------------------------------------------------- mozzo (lato B)
// Riferimento: asse z, z = 0 sulla faccia superiore dell'ingranaggio alto B. Sotto: esagono nell'ingranaggio;
// in mezzo: cono che appoggia nella sede del coperchio; sopra: collare con la sede esagonale della manovella.
export function buildHub(wasm) {
  const { Manifold, CrossSection } = wasm;
  const st = stack();
  const zL = st.zLid - st.zTopFace;          // sotto del coperchio (0,4)
  const g = K.seatVGap;
  const tap = (K.seatBotR - K.seatTopR) / K.lidT;
  // cono parallelo alla sede, abbassato di seatVGap; parte un filo sotto il coperchio
  const coneBot = zL - g, coneTop = zL + K.lidT - g;
  let hub = Manifold.cylinder(coneBot + 0.01, K.seatBotR, K.seatBotR, 128)
    .add(Manifold.cylinder(coneTop - coneBot, K.seatBotR, K.seatTopR, 128).translate([0, 0, coneBot]));
  const bossTop = zL + K.lidT + K.bossH;
  hub = hub.add(Manifold.cylinder(bossTop - coneTop + 0.01, K.bossR, K.bossR, 128).translate([0, 0, coneTop - 0.01]));
  // esagono verso l'ingranaggio, punta smussata
  const kx = hexCS(CrossSection, K.hubKeyAF);
  const kLen = K.gearHexDepth - 0.3;
  hub = hub.add(kx.extrude(kLen - 0.6 + 0.01).translate([0, 0, -kLen + 0.6]))
    .add(kx.extrude(0.6, 0, 0, [(K.hubKeyAF - 1.2) / K.hubKeyAF, (K.hubKeyAF - 1.2) / K.hubKeyAF]).mirror([0, 0, 1]).translate([0, 0, -kLen + 0.6]));
  // sede esagonale per la manovella, dall'alto, con invito smussato
  const sx = hexCS(CrossSection, K.hubSockAF), sx2 = hexCS(CrossSection, K.hubSockAF + 1.2);
  hub = hub.subtract(sx.extrude(K.hubSockDepth + 0.1).translate([0, 0, bossTop - K.hubSockDepth]))
    .subtract(sx2.extrude(0.61, 0, 0, [K.hubSockAF / (K.hubSockAF + 1.2), K.hubSockAF / (K.hubSockAF + 1.2)]).mirror([0, 0, 1]).translate([0, 0, bossTop + 0.01]));
  return { hub, bossTop };
}

// ---------------------------------------------------------------- manovella estraibile
// Riferimento: asse della manovella sull'asse z, z = 0 al sotto del braccio. Chiave esagonale verso -z.
export function buildCrank(wasm, { crankLen = KIT_DEFAULTS.crankLen } = {}) {
  const { Manifold, CrossSection } = wasm;
  const st = stack();
  const { bossTop } = buildHubInfo();
  const zCollar = st.zTopFace + bossTop + 0.2;                // sotto del braccio nel montaggio
  const L = crankLen;
  // braccio: inviluppo tra il mozzo e la testa dell'impugnatura
  const arm2d = CrossSection.hull([CrossSection.circle(K.armW0 / 2, 64), CrossSection.circle(K.armW1 / 2, 64).translate([L, 0])]);
  let arm = arm2d.extrude(K.armT);
  arm = arm.add(Manifold.cylinder(K.armT, K.collarR, K.collarR, 96));
  // chiave esagonale larga (si infila nel mozzo), raccordata al braccio da un gradino conico
  const kx = hexCS(CrossSection, K.keyAF);
  const kl = K.keyLen + 0.2; // 0,2 = spazio tra braccio e collare del mozzo
  const key = kx.extrude(kl - 0.6 + 0.01).translate([0, 0, -kl + 0.6])
    .add(kx.extrude(0.6, 0, 0, [(K.keyAF - 1.2) / K.keyAF, (K.keyAF - 1.2) / K.keyAF]).mirror([0, 0, 1]).translate([0, 0, -kl + 0.6]));
  let crank = arm.add(key);
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
  const { hub } = buildHub(wasm);

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
    // per l'STL: i due ingranaggi A uguali nello stesso file, affiancati
    gearApair: onBed(onBed(gearA).translate([-18, 0, 0]).add(onBed(gearA).translate([18, 0, 0]))),
    gearB: onBed(gearB),
    gearBk: onBed(gearBk),
    hub: onBed(flip(hub)),            // collare sul piatto: il cono si allarga salendo, niente supporti
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
    hub: hub.translate([a, 0, st.zTopFace]),
    crank: crank.translate([a, 0, zCollar]),
    grip: grip.translate([a + L, 0, zCollar + K.armT]),
  };
  for (const [k, m] of Object.entries(print)) {
    if (m.status() !== 'NoError' || m.isEmpty()) throw new Error(`Geometria non valida: ${k} (${m.status()})`);
  }
  return { print, asm, stack: st, info: { crankLen: L, bodyH: st.zLidTop, rollerZ: st.zRoller, axis: a } };
}
