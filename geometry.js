// Geometria dei due rulli (positivo e negativo) compatibili con il "Business Card Embosser".
// Modulo puro: gira identico nel worker del browser e in node (test).
//
// Misure ricavate dai rulli originali (Zigzag / Polkadot / Confetti):
//  - cilindro Ø30 × 60, smusso 0,6 mm alle due estremità
//  - incastro quadro 12×12 profondo 11 mm a entrambe le estremità, smusso ~1 mm all'imbocco,
//    lati paralleli agli assi X/Y (come negli originali: è il riferimento angolare del disegno)
//  - positivo: rilievo +1,2 mm (Ø32,4); negativo: incavo −1,2 mm (fondo Ø27,6)
//  - zona del disegno z 1,5…58,5; il negativo è il positivo specchiato in angolo (θ → −θ)
//    e allargato di ~0,2 mm per lato
//  - interasse dei rulli nella scocca 30,1 mm (ingranaggi da 24 denti in presa diretta)

const TAU = Math.PI * 2;

export const R = 15;                 // raggio di base dei rulli
export const LEN = 60;               // lunghezza dei rulli
export const C = TAU * R;            // circonferenza = larghezza della fascia srotolata
export const Z0 = 1.5;               // inizio zona del disegno
export const ZH = 57;                // altezza della zona del disegno
export const AXIS_DIST = 30.1;       // interasse nella scocca originale

export const DEFAULTS = {
  relief: 1.2,      // rilievo del positivo = profondità dell'incavo del negativo
  clearance: 0.2,   // gioco per lato tra rilievo e incavo (spazio per la carta)
  mark: true,       // tacca di fase sulla faccia superiore
};

const K = {
  endChamfer: 0.6,
  socket: 12,
  socketDepth: 11,
  socketChamfer: 1,
  sink: 0.5,        // il rilievo affonda nel cilindro per un'unione pulita
  pad: 2,           // fascia ripetuta oltre la cucitura (mm), lato per lato
  overlap: 1.5,     // sovrapposizione tra le due metà del rilievo attorno alla cucitura
  refine: 1.0,      // lunghezza massima dei lati prima della curvatura
  minStroke: 0.7,   // tratto minimo che si imprime bene sulla carta
  minWall: 0.6,     // parete minima tra due incavi del negativo
};

// contorni in pixel della fascia estesa -> CrossSection in mm (u lungo la circonferenza, z lungo l'asse)
function toCross(CrossSection, contours, map) {
  const polys = contours.map((c) => c.map(([x, y]) => map(x, y)));
  return new CrossSection(polys, 'EvenOdd');
}

// cs (u,z) -> solido curvato sul cilindro tra r0 e r0+h, in due metà sovrapposte attorno alla cucitura
function wrapSolid(Manifold, CrossSection, cs, r0, h) {
  const halves = [
    [-K.overlap, C / 2 + K.overlap],
    [C / 2 - K.overlap, C + K.overlap],
  ];
  const parts = [];
  for (const [a, b] of halves) {
    const piece = cs.intersect(CrossSection.square([b - a, ZH + 4]).translate([a, Z0 - 2]));
    if (piece.isEmpty()) continue;
    const m = piece.extrude(h).refineToLength(K.refine).warp((v) => {
      const th = v[0] / R, r = r0 + v[2], z = v[1];
      v[0] = r * Math.cos(th); v[1] = r * Math.sin(th); v[2] = z;
    });
    parts.push(m);
  }
  return parts.length ? Manifold.union(parts) : null;
}

// traced: contorni (pixel) della fascia estesa, scala sx/sy (px per mm), origine x0/y0 (pixel di u=0 e del bordo alto)
export function buildRollers(wasm, traced, params) {
  const { Manifold, CrossSection } = wasm;
  const p = { ...DEFAULTS, ...params };
  const warnings = [];
  const seg = 360;

  // ---- disegno: contorni (px) -> mm
  const { contours, sx, sy, x0, y0 } = traced;
  // pixel della fascia estesa: u = (x - x0) / sx ; y cresce verso il basso, in alto c'è z massimo
  const design = contours.length
    ? toCross(CrossSection, contours, (x, y) => [(x - x0) / sx, Z0 + ZH - (y - y0) / sy]).simplify(0.01)
    : null;
  const lap = typeof p.timing === 'function' ? p.timing : () => {};
  const empty = !design || design.isEmpty();
  lap('sezione 2D');
  if (empty) warnings.push('Il disegno è vuoto: i rulli escono lisci.');

  // ---- cilindro di base con smussi
  const ch = K.endChamfer;
  const profile = new CrossSection([[[0, 0], [R - ch, 0], [R, ch], [R, LEN - ch], [R - ch, LEN], [0, LEN]]]);
  const base = Manifold.revolve(profile, seg);

  // ---- incastri quadri alle due estremità (con smusso d'invito)
  const s = K.socket, d = K.socketDepth, cf = K.socketChamfer;
  const sq = CrossSection.square([s, s], true);
  const mouth = CrossSection.square([s + 2 * cf, s + 2 * cf], true).extrude(cf + 0.01, 0, 0, [s / (s + 2 * cf), s / (s + 2 * cf)]);
  const socketBottom = Manifold.union([sq.extrude(d + 0.01).translate([0, 0, -0.01]), mouth.translate([0, 0, -0.01])]);
  const socketTop = socketBottom.mirror([0, 0, 1]).translate([0, 0, LEN]);
  const sockets = Manifold.union([socketBottom, socketTop]);

  // ---- tacca di fase: triangolo inciso sulla faccia superiore a θ = 0, punta verso l'esterno
  let mark = null;
  if (p.mark) {
    const tri = new CrossSection([[[10.6, -1.3], [13.6, 0], [10.6, 1.3]]]);
    mark = tri.extrude(0.6).translate([0, 0, LEN - 0.4]);
  }

  // ---- positivo: rilievo
  let pos = base;
  let neg = base;
  const info = { coverage: 0 };
  if (!empty) {
    const reliefSolid = wrapSolid(Manifold, CrossSection, design, R - K.sink, p.relief + K.sink);
    if (reliefSolid) pos = pos.add(reliefSolid);
    pos.numTri(); lap('positivo');

    // negativo: disegno allargato del gioco, specchiato in angolo (u -> C - u)
    const recessCs = design.offset(p.clearance, 'Round', 2, 16).mirror([1, 0]).translate([C, 0]);
    const recessSolid = wrapSolid(Manifold, CrossSection, recessCs, R - p.relief, p.relief + K.sink);
    if (recessSolid) neg = neg.subtract(recessSolid);
    neg.numTri(); lap('negativo');

    // ---- controlli di stampabilità/impressione (solo sul periodo [0, C])
    const period = CrossSection.square([C, ZH + 2]).translate([0, Z0 - 1]);
    const one = design.intersect(period);
    const area = one.area();
    info.coverage = area / (C * ZH);
    const h = K.minStroke / 2;
    const robust = one.offset(-h, 'Round').offset(h, 'Round');
    const lost = 1 - robust.area() / Math.max(area, 1e-9);
    if (lost > 0.05) warnings.push(`Circa il ${Math.round(lost * 100)}% del disegno ha tratti più sottili di ${String(K.minStroke).replace('.', ',')} mm: sulla carta si vedranno poco. Ingrandisci o ispessisci quelle parti.`);
    const recessOne = recessCs.intersect(period);
    const w = K.minWall / 2;
    const closed = recessOne.offset(w, 'Round').offset(-w, 'Round');
    const thin = closed.area() - recessOne.area();
    if (thin > Math.max(4, 0.03 * recessOne.area())) warnings.push(`Nel rullo negativo ci sono pareti più sottili di ${String(K.minWall).replace('.', ',')} mm tra un incavo e l'altro (${thin.toFixed(0)} mm²): elementi troppo vicini, distanziali un po'.`);
    lap('controlli');
    if (info.coverage > 0.6) warnings.push(`Il disegno copre il ${Math.round(info.coverage * 100)}% della fascia: con tanta superficie in rilievo serve molta forza per girare la manovella.`);
  }

  pos = pos.subtract(sockets);
  neg = neg.subtract(sockets);
  if (mark) { pos = pos.subtract(mark); neg = neg.subtract(mark); }
  // la sovrapposizione delle due metà lascia schegge di volume nullo: le tolgo
  pos = pos.simplify(1e-3);
  neg = neg.simplify(1e-3);
  pos.numTri(); neg.numTri(); lap('incastri e pulizia');

  for (const [name, m] of [['positivo', pos], ['negativo', neg]]) {
    if (m.status() !== 'NoError' || m.isEmpty()) throw new Error(`Geometria non valida: rullo ${name} (${m.status()})`);
  }
  info.triangles = pos.numTri() + neg.numTri();
  info.relief = p.relief;
  info.clearance = p.clearance;
  return { positive: pos, negative: neg, info, warnings };
}
