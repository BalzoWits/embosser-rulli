// Disegno della fascia srotolata del rullo: elementi (testo, motivo, immagine, cornice) disegnati su
// canvas in millimetri. La maschera (canale alfa) è quello che il worker trasforma in rilievo.
// Coordinate: u verso destra lungo la circonferenza (0…C), v verso il basso lungo l'asse (0…ZH).
// v = 0 è il lato della tacca (faccia superiore dei rulli). I bordi u = 0 e u = C si toccano.
import { C, ZH } from './geometry.js';

export { C, ZH };
export const CARD = { w: 85, h: 55, x: (C - 85) / 2, y: (ZH - 55) / 2 };
export const PXMM = 10; // risoluzione della maschera

export const FONTS = [
  { id: 'playfair', name: 'Playfair Display (serif elegante)', file: 'fonts/playfair-display-700.woff' },
  { id: 'montserrat-700', name: 'Montserrat Bold', file: 'fonts/montserrat-700.woff' },
  { id: 'montserrat-400', name: 'Montserrat Regular (sottile)', file: 'fonts/montserrat-400.woff' },
  { id: 'cinzel', name: 'Cinzel (capitali romane)', file: 'fonts/cinzel-700.woff' },
  { id: 'roboto-slab', name: 'Roboto Slab Bold', file: 'fonts/roboto-slab-700.woff' },
  { id: 'oswald', name: 'Oswald Bold (stretto)', file: 'fonts/oswald-700.woff' },
  { id: 'bebas', name: 'Bebas Neue (alto)', file: 'fonts/bebas-neue.woff' },
  { id: 'great-vibes', name: 'Great Vibes (corsivo)', file: 'fonts/great-vibes.woff' },
  { id: 'pacifico', name: 'Pacifico (corsivo tondo)', file: 'fonts/pacifico.woff' },
  { id: 'lobster', name: 'Lobster', file: 'fonts/lobster.woff' },
];
const family = (id) => `emb-${id}`;
const fontReady = new Map();

export function loadFont(id) {
  if (fontReady.has(id)) return fontReady.get(id);
  const f = FONTS.find((x) => x.id === id);
  if (!f) return Promise.resolve(false);
  const p = new FontFace(family(id), `url(${f.file})`).load().then((ff) => { document.fonts.add(ff); return true; });
  fontReady.set(id, p);
  return p;
}

// font caricato dall'utente: resta per la sessione
export async function addCustomFont(file) {
  const id = 'custom-' + Date.now().toString(36);
  const ff = await new FontFace(family(id), await file.arrayBuffer()).load();
  document.fonts.add(ff);
  FONTS.push({ id, name: `Caricato: ${file.name}`, custom: true });
  fontReady.set(id, Promise.resolve(true));
  return id;
}

const capCache = new Map();
function capRatio(ctx, fam) {
  if (capCache.has(fam)) return capCache.get(fam);
  ctx.save();
  ctx.font = `100px "${fam}"`;
  const m = ctx.measureText('H');
  ctx.restore();
  const r = m.actualBoundingBoxAscent > 1 ? m.actualBoundingBoxAscent / 100 : 0.7;
  if (document.fonts.check(`100px "${fam}"`)) capCache.set(fam, r);
  return r;
}

// ------------------------------------------------------------------ elementi
const r2 = (n) => Math.round(n * 100) / 100;
const MID = r2(C / 2);
let uid = 0;
export const newId = () => `e${Date.now().toString(36)}${(uid++).toString(36)}`;

export const PATTERNS = [
  ['pois', 'Pois'],
  ['righe', 'Righe'],
  ['griglia', 'Griglia'],
  ['quadri', 'Scacchiera'],
  ['esagoni', 'Nido d\'ape'],
  ['onde', 'Onde'],
  ['zigzag', 'Zigzag'],
  ['scaglie', 'Scaglie'],
  ['coriandoli', 'Coriandoli'],
];

export function newElement(type) {
  const base = { id: newId(), type, op: 'add', visible: true };
  // disposizione a motivo (testo e immagine): passo, file sfalsate, area come per i motivi
  const tile = {
    layout: 'single', stepX: 12, stepY: 10, stagger: true, area: 'all', rx: r2(CARD.x + 5), ry: r2(CARD.y + 5), rw: 30, rh: 20,
    alt: 'none', jitRot: 0, jitScale: 0, tseed: 1,
  };
  switch (type) {
    case 'text': return { ...base, text: 'Il tuo nome', font: 'roboto-slab', size: 5, spacing: 0.3, lineH: 1.5, align: 'center', style: 'fill', stroke: 0.8, x: MID, y: ZH / 2, rot: 0, repeat: 1, ...tile };
    case 'pattern': return { ...base, kind: 'pois', period: 6, thick: 2, angle: 45, area: 'all', x: r2(CARD.x + 5), y: r2(CARD.y + 5), w: 30, h: 20, seed: 1 };
    case 'image': return { ...base, src: null, name: '', threshold: 128, invert: false, w: 20, x: MID, y: ZH / 2, rot: 0, repeat: 1, ...tile };
    case 'frame': return { ...base, style: 'line', x: r2(CARD.x + 3), y: r2(CARD.y + 3), w: CARD.w - 6, h: CARD.h - 6, radius: 3, thick: 1 };
    default: throw new Error('tipo sconosciuto ' + type);
  }
}

export function defaultDesign() {
  const frame = newElement('frame');
  const name = { ...newElement('text'), font: 'roboto-slab', size: 6.5, spacing: 0.5, y: 25 };
  const sub = { ...newElement('text'), text: 'STUDIO GRAFICO', font: 'montserrat-700', size: 3.8, spacing: 1.2, y: 35.5 };
  return [frame, name, sub];
}

export function label(el) {
  switch (el.type) {
    case 'text': return ((el.text || '').split('\n')[0].slice(0, 24) || 'Testo vuoto') + (isTiled(el) ? ' (motivo)' : '');
    case 'pattern': return (PATTERNS.find((p) => p[0] === el.kind) || [, 'Motivo'])[1];
    case 'image': return (el.name || 'Immagine') + (isTiled(el) ? ' (motivo)' : '');
    case 'frame': return 'Cornice';
  }
  return el.type;
}

// ------------------------------------------------------------------ immagini (soglia -> maschera)
const imgCache = new Map(); // id -> { src, img, key, canvas }

export function loadImage(src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('immagine non leggibile')); im.src = src; });
}

async function imageMask(el) {
  let c = imgCache.get(el.id);
  if (!c || c.src !== el.src) {
    c = { src: el.src, img: await loadImage(el.src), key: '', canvas: null };
    imgCache.set(el.id, c);
  }
  const key = `${el.threshold}|${el.invert}`;
  if (c.key !== key) {
    const im = c.img;
    const k = Math.min(1, 1200 / Math.max(im.naturalWidth || 1, im.naturalHeight || 1));
    const w = Math.max(1, Math.round((im.naturalWidth || 300) * k)), h = Math.max(1, Math.round((im.naturalHeight || 300) * k));
    const cv = c.canvas || document.createElement('canvas');
    cv.width = w; cv.height = h;
    const x = cv.getContext('2d', { willReadFrequently: true });
    x.clearRect(0, 0, w, h);
    x.drawImage(im, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h), a = d.data;
    for (let i = 0; i < a.length; i += 4) {
      const lum = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2];
      const opaque = a[i + 3] >= 128;
      let on = opaque && lum < el.threshold;   // scuro e pieno = rilievo
      if (el.invert) on = !on;
      a[i] = a[i + 1] = a[i + 2] = 0; a[i + 3] = on ? 255 : 0;
    }
    x.putImageData(d, 0, 0);
    c.canvas = cv; c.key = key;
  }
  return c.canvas;
}

export async function prepareImages(els) {
  for (const el of els) if (el.type === 'image' && el.src) {
    try { await imageMask(el); } catch { /* immagine rotta: la salto */ }
  }
}
export function dropImageCache(id) { imgCache.delete(id); }

// ------------------------------------------------------------------ motivi
function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// passo orizzontale che fa tornare il motivo esatto sul giro completo
const fitC = (p) => C / Math.max(1, Math.round(C / p));

function patternRect(el) {
  if (el.area === 'all') return { x: 0, y: 0, w: C, h: ZH, all: true };
  if (el.area === 'card') return { x: CARD.x, y: CARD.y, w: CARD.w, h: CARD.h };
  if (el.type !== 'pattern') return { x: el.rx, y: el.ry, w: el.rw, h: el.rh };
  return { x: el.x, y: el.y, w: el.w, h: el.h };
}

const isTiled = (el) => (el.type === 'text' || el.type === 'image') && el.layout === 'tile';

// Come si modifica un elemento sulla fascia:
//  scale  -> trascina per spostare (x, y), angoli = ingrandisci, pallino = ruota
//  rect   -> trascina per spostare, angoli = cambia larghezza/altezza (chiavi indicate)
//  null   -> occupa un'area fissa (tutta la fascia o il biglietto): si modifica dal pannello
export function editMode(el) {
  if (el.type === 'frame') return { rect: ['x', 'y', 'w', 'h'] };
  if (el.type === 'pattern') return el.area === 'rect' ? { rect: ['x', 'y', 'w', 'h'] } : null;
  if (isTiled(el)) return el.area === 'rect' ? { rect: ['rx', 'ry', 'rw', 'rh'] } : null;
  return { scale: true };
}

// Logo o testo ripetuto a motivo: griglia con passo stepX × stepY, file alterne sfalsate di mezzo passo.
// Su tutta la fascia il passo orizzontale si adatta per richiudersi esatto sul giro.
// numero pseudo-casuale stabile per la copia (i, j): non cambia spostando o ridisegnando
function hash2(i, j, s) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export const TILE_ALT = [
  ['none', 'Tutte uguali'],
  ['flip', 'File alterne capovolte'],
  ['mirror', 'Copie alterne specchiate'],
  ['rot90', 'Copie alterne ruotate 90°'],
  ['checker', 'A scacchiera (una sì, una no)'],
];

function drawTiled(ctx, el) {
  const R = patternRect(el);
  const step = Math.max(1, el.stepX);
  // le alternanze "a copie" richiedono un numero pari di copie sul giro, se no alla cucitura si sfasano
  const parity = el.alt === 'mirror' || el.alt === 'rot90' || el.alt === 'checker';
  const ncols = R.all ? Math.max(parity ? 2 : 1, parity ? 2 * Math.round(C / step / 2) : Math.round(C / step)) : 0;
  const px = R.all ? C / ncols : step;
  const py = Math.max(1, el.stepY);
  const seed = el.tseed || 1;
  ctx.save();
  ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
  const x0 = R.all ? 0 : R.x + px / 2;
  const nx = Math.ceil(R.w / px) + 2;
  for (let j = 0, y = R.y + py / 2; y < R.y + R.h + py; j++, y += py) {
    const shift = el.stagger && j % 2 ? px / 2 : 0;
    for (let i = -1; i < nx; i++) {
      const ii = R.all ? ((i % ncols) + ncols) % ncols : i; // stessa copia oltre la cucitura
      const odd = (ii + j) % 2 !== 0;
      if (el.alt === 'checker' && odd) continue;
      let rot = el.rot || 0, mx = 1, sc = 1;
      if (el.alt === 'flip' && j % 2) rot += 180;
      if (el.alt === 'mirror' && odd) mx = -1;
      if (el.alt === 'rot90' && odd) rot += 90;
      if (el.jitRot) rot += (hash2(ii, j, seed) * 2 - 1) * el.jitRot;
      if (el.jitScale) sc *= 1 + ((hash2(ii, j, seed + 7919) * 2 - 1) * el.jitScale) / 100;
      ctx.save();
      ctx.translate(x0 + i * px + shift, y);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.scale(mx * sc, sc);
      drawOne(ctx, el);
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawLines(ctx, R, p, t, deg) {
  const a = (deg * Math.PI) / 180, s = Math.sin(a), c = Math.cos(a);
  let step = p;
  if (R.all && Math.abs(s) > 1e-3) step = (C * Math.abs(s)) / Math.max(1, Math.round((C * Math.abs(s)) / p));
  const n = [-s, c];
  const corners = [[R.x, R.y], [R.x + R.w, R.y], [R.x, R.y + R.h], [R.x + R.w, R.y + R.h]];
  const proj = corners.map(([x, y]) => x * n[0] + y * n[1]);
  const diag = Math.hypot(R.w, R.h) + 10;
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
  ctx.lineWidth = t; ctx.lineCap = 'butt';
  ctx.beginPath();
  for (let k = Math.floor(Math.min(...proj) / step) - 1; k <= Math.ceil(Math.max(...proj) / step) + 1; k++) {
    // punto della retta k più vicino al centro del riquadro
    const off = k * step - (cx * n[0] + cy * n[1]);
    const px = cx + n[0] * off, py = cy + n[1] * off;
    ctx.moveTo(px - c * diag, py - s * diag);
    ctx.lineTo(px + c * diag, py + s * diag);
  }
  ctx.stroke();
}

function drawPattern(ctx, el) {
  const R = patternRect(el);
  const p = Math.max(1, el.period), t = Math.max(0.2, el.thick);
  ctx.save();
  ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
  const px = R.all ? fitC(p) : p;
  const x0 = R.all ? 0 : R.x;
  const nx = Math.ceil(R.w / px) + 2;
  switch (el.kind) {
    case 'righe': drawLines(ctx, R, p, t, el.angle); break;
    case 'griglia': drawLines(ctx, R, p, t, el.angle); drawLines(ctx, R, p, t, el.angle + 90); break;
    case 'pois': {
      const py = (px * Math.sqrt(3)) / 2;
      ctx.beginPath();
      for (let j = 0, y = R.y + py / 2; y < R.y + R.h + py; j++, y += py) {
        for (let i = -1; i < nx; i++) {
          const x = x0 + i * px + (j % 2 ? px / 2 : 0);
          ctx.moveTo(x + t / 2, y); ctx.arc(x, y, t / 2, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      break;
    }
    case 'quadri': {
      const q = px / 2;
      for (let j = 0, y = R.y; y < R.y + R.h; j++, y += q) {
        for (let i = -2; i < 2 * nx; i++) if ((i + j) % 2 === 0) ctx.fillRect(x0 + i * q, y, q, q);
      }
      break;
    }
    case 'esagoni': {
      const r = px / Math.sqrt(3), dy = 1.5 * r;
      ctx.lineWidth = t; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let j = 0, y = R.y; y < R.y + R.h + r; j++, y += dy) {
        for (let i = -1; i < nx; i++) {
          const cx = x0 + i * px + (j % 2 ? px / 2 : 0);
          for (let k = 0; k <= 6; k++) {
            const a = (Math.PI / 3) * k + Math.PI / 6;
            const X = cx + r * Math.cos(a), Y = y + r * Math.sin(a);
            if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
          }
        }
      }
      ctx.stroke();
      break;
    }
    case 'onde':
    case 'zigzag': {
      const amp = p * (el.kind === 'onde' ? 0.22 : 0.28), dy = p * 0.75;
      ctx.lineWidth = t; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let y = R.y + dy / 2; y < R.y + R.h + dy; y += dy) {
        const xa = x0 - px, xb = x0 + nx * px;
        if (el.kind === 'onde') {
          const st = px / 24;
          for (let x = xa; x <= xb; x += st) {
            const Y = y + amp * Math.sin(((x - x0) / px) * Math.PI * 2);
            if (x === xa) ctx.moveTo(x, Y); else ctx.lineTo(x, Y);
          }
        } else {
          for (let i = -1, x = xa; x <= xb; i++, x += px / 2) {
            const Y = y + (i % 2 ? amp : -amp);
            if (x === xa) ctx.moveTo(x, Y); else ctx.lineTo(x, Y);
          }
        }
      }
      ctx.stroke();
      break;
    }
    case 'scaglie': {
      const r = px / 2;
      ctx.lineWidth = t;
      ctx.beginPath();
      for (let j = 0, y = R.y; y < R.y + R.h + r; j++, y += r) {
        for (let i = -1; i < nx; i++) {
          const cx = x0 + i * px + (j % 2 ? r : 0);
          ctx.moveTo(cx + r, y); ctx.arc(cx, y, r, 0, Math.PI);
        }
      }
      ctx.stroke();
      break;
    }
    case 'coriandoli': {
      const rand = rng(el.seed || 1);
      const n = Math.round((R.w * R.h) / (p * p));
      for (let i = 0; i < n; i++) {
        const x = R.x + rand() * R.w, y = R.y + rand() * R.h, kind = Math.floor(rand() * 4), ang = rand() * Math.PI;
        const copies = R.all ? [x - C, x, x + C] : [x];
        for (const X of copies) {
          ctx.save(); ctx.translate(X, y); ctx.rotate(ang);
          ctx.beginPath();
          if (kind === 0) ctx.arc(0, 0, t / 2, 0, Math.PI * 2);
          else if (kind === 1) ctx.rect(-t / 2, -t / 2, t, t);
          else if (kind === 2) { ctx.moveTo(0, -t * 0.6); ctx.lineTo(t * 0.55, t * 0.4); ctx.lineTo(-t * 0.55, t * 0.4); ctx.closePath(); }
          else ctx.rect(-t, -t / 4, 2 * t, t / 2);
          ctx.fill();
          ctx.restore();
        }
      }
      break;
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ testo, immagine, cornice
// Il testo si disegna a scala TK (font da decine di px invece che da pochi "mm"): alcuni browser
// rasterizzano i glifi alla dimensione nominale e poi li ingrandiscono, sgranandoli.
const TK = 10;

// imposta font e spaziatura su ctx (in unità ×TK) e misura; le misure tornano in mm
function textMetrics(ctx, el) {
  const fam = family(el.font);
  const cap = capRatio(ctx, fam);
  const fpx = el.size / cap;
  ctx.font = `${fpx * TK}px "${fam}"`;
  try { ctx.letterSpacing = `${el.spacing * TK}px`; } catch { /* browser senza letterSpacing */ }
  const lines = String(el.text || '').split('\n');
  const lh = fpx * el.lineH * 0.8;
  const widths = lines.map((l) => ctx.measureText(l).width / TK);
  return { fpx, lines, lh, widths, w: Math.max(0, ...widths), h: el.size + (lines.length - 1) * lh };
}

function drawText(ctx, el) {
  const m = textMetrics(ctx, el);
  ctx.scale(1 / TK, 1 / TK);
  ctx.textAlign = el.align === 'left' ? 'left' : el.align === 'right' ? 'right' : 'center';
  ctx.textBaseline = 'alphabetic';
  const ax = el.align === 'left' ? -m.w / 2 : el.align === 'right' ? m.w / 2 : 0;
  ctx.lineJoin = 'round';
  ctx.lineWidth = el.stroke * TK;
  m.lines.forEach((line, i) => {
    const y = -m.h / 2 + el.size + i * m.lh;
    if (el.style === 'outline') ctx.strokeText(line, ax * TK, y * TK);
    else ctx.fillText(line, ax * TK, y * TK);
  });
}

function imgSize(el) {
  const c = imgCache.get(el.id);
  if (!c || !c.canvas) return null;
  return { w: el.w, h: (el.w * c.canvas.height) / c.canvas.width, canvas: c.canvas };
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFrame(ctx, el) {
  const t = el.thick;
  ctx.lineWidth = t; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const { x, y, w, h, radius } = el;
  if (el.style === 'corners') {
    const L = Math.min(w, h) * 0.22, r = Math.min(radius, L * 0.8);
    ctx.beginPath();
    const corner = (cx, cy, sx, sy) => {
      ctx.moveTo(cx + sx * L, cy);
      ctx.arcTo(cx, cy, cx, cy + sy * L, r);
      ctx.lineTo(cx, cy + sy * L);
    };
    corner(x, y, 1, 1); corner(x + w, y, -1, 1); corner(x, y + h, 1, -1); corner(x + w, y + h, -1, -1);
    ctx.stroke();
    return;
  }
  if (el.style === 'dashed') ctx.setLineDash([3 * t, 2.2 * t]);
  ctx.beginPath(); roundRect(ctx, x, y, w, h, radius); ctx.stroke();
  if (el.style === 'double') {
    const g = 1.6 * t + 0.6;
    ctx.beginPath(); roundRect(ctx, x + g, y + g, w - 2 * g, h - 2 * g, Math.max(0, radius - g)); ctx.stroke();
  }
  ctx.setLineDash([]);
}

// Riquadro (in mm, ruotato) per selezione e trascinamento
export function bounds(ctx, el) {
  if (isTiled(el)) { const R = patternRect(el); return { cx: R.x + R.w / 2, cy: R.y + R.h / 2, w: R.w, h: R.h, rot: 0, fixed: el.area !== 'rect' }; }
  switch (el.type) {
    case 'text': { ctx.save(); const m = textMetrics(ctx, el); ctx.restore(); return { cx: el.x, cy: el.y, w: m.w + 1, h: m.h + 1, rot: el.rot }; }
    case 'image': { const s = imgSize(el); return s ? { cx: el.x, cy: el.y, w: s.w, h: s.h, rot: el.rot } : { cx: el.x, cy: el.y, w: el.w, h: el.w, rot: el.rot }; }
    case 'frame': return { cx: el.x + el.w / 2, cy: el.y + el.h / 2, w: el.w + el.thick, h: el.h + el.thick, rot: 0 };
    case 'pattern': { const R = patternRect(el); return { cx: R.x + R.w / 2, cy: R.y + R.h / 2, w: R.w, h: R.h, rot: 0, fixed: el.area !== 'rect' }; }
  }
  return null;
}

// spostamento di un elemento trascinato (dx, dy in mm)
// start: copia dei valori all'inizio del trascinamento
export function moveBy(el, start, dx, dy) {
  const [kx, ky] = isTiled(el) ? ['rx', 'ry'] : ['x', 'y'];
  el[kx] = r2(start[kx] + dx);
  el[ky] = r2(start[ky] + dy);
}

// Ingrandimento attorno al centro (testo e immagine singoli): f = fattore rispetto a start
export function scaleBy(el, start, f) {
  if (el.type === 'text') {
    el.size = r2(Math.min(40, Math.max(1, start.size * f)));
    el.spacing = r2(start.spacing * (el.size / start.size));
  } else if (el.type === 'image') {
    el.w = r2(Math.min(94, Math.max(2, start.w * f)));
  }
}

// Ridimensionamento di un riquadro trascinando un angolo (sx, sy = -1/+1 quale angolo)
export function resizeRect(el, start, keys, sx, sy, dx, dy) {
  const [kx, ky, kw, kh] = keys;
  const minS = 4;
  let x = start[kx], y = start[ky], w = start[kw], h = start[kh];
  if (sx > 0) w = Math.max(minS, w + dx); else { const nw = Math.max(minS, w - dx); x += w - nw; w = nw; }
  if (sy > 0) h = Math.max(minS, h + dy); else { const nh = Math.max(minS, h - dy); y += h - nh; h = nh; }
  Object.assign(el, { [kx]: r2(x), [ky]: r2(y), [kw]: r2(w), [kh]: r2(h) });
}

function drawOne(ctx, el) {
  switch (el.type) {
    case 'text': drawText(ctx, el); break;
    case 'image': { const s = imgSize(el); if (s) ctx.drawImage(s.canvas, -s.w / 2, -s.h / 2, s.w, s.h); break; }
    case 'frame': drawFrame(ctx, el); break;
  }
}

// Disegna tutta la fascia: ctx già scalato in mm (1 unità = 1 mm), sfondo trasparente.
// Ogni elemento è ripetuto a ±C perché ciò che esce da un bordo rientra dall'altro.
export function renderDesign(ctx, els) {
  for (const el of els) {
    if (!el.visible) continue;
    ctx.save();
    ctx.globalCompositeOperation = el.op === 'cut' ? 'destination-out' : 'source-over';
    ctx.fillStyle = '#000'; ctx.strokeStyle = '#000';
    if (el.type === 'pattern') {
      if (el.area === 'all') drawPattern(ctx, el);
      else for (const o of [-C, 0, C]) { ctx.save(); ctx.translate(o, 0); drawPattern(ctx, el); ctx.restore(); }
    } else if (isTiled(el)) {
      if (el.area === 'all') drawTiled(ctx, el);
      else for (const o of [-C, 0, C]) { ctx.save(); ctx.translate(o, 0); drawTiled(ctx, el); ctx.restore(); }
    } else {
      const n = Math.max(1, Math.round(el.repeat || 1));
      for (let k = 0; k < n; k++) {
        for (const o of [-C, 0, C]) {
          ctx.save();
          if (el.type === 'frame') ctx.translate(o + (k * C) / n, 0);
          else { ctx.translate(el.x + o + (k * C) / n, el.y); ctx.rotate(((el.rot || 0) * Math.PI) / 180); }
          drawOne(ctx, el);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }
}

// Maschera ad alta risoluzione: larghezza = una circonferenza esatta in pixel interi.
export function maskSize() {
  const W = Math.round(C * PXMM), H = Math.round(ZH * PXMM);
  return { W, H, sx: W / C, sy: H / ZH };
}

export function renderMask(canvas, els) {
  const { W, H, sx, sy } = maskSize();
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.setTransform(sx, 0, 0, sy, 0, 0);
  renderDesign(ctx, els);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { W, H, sx, sy };
}
