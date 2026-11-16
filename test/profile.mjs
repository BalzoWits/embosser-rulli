// Profilo dei tempi del generatore su una maschera salvata dalla pagina ({W, H, b64} in JSON).
// Uso: node test/profile.mjs mask.json
import Module from '../lib/manifold.js';
import { readFileSync } from 'node:fs';
import { traceContours, extendPeriodic, simplifyClosed } from '../trace.js';
import { buildRollers, C, ZH } from '../geometry.js';

const { W, H, b64 } = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const alpha = new Uint8Array(Buffer.from(b64, 'base64'));
const sx = W / C, sy = H / ZH;
const wasm = await Module();
wasm.setup();
let t = performance.now();
const lap = (s) => { const n = performance.now(); console.log(s.padEnd(22), (n - t).toFixed(0), 'ms'); t = n; };
const ext = extendPeriodic(alpha, W, H, Math.ceil(2 * sx));
const raw = traceContours(ext.field, ext.w, ext.h);
lap('traccia');
const contours = raw.map((c) => simplifyClosed(c, 0.12));
lap('semplifica');
console.log('contorni', contours.length, 'punti', raw.reduce((s, c) => s + c.length, 0), '->', contours.reduce((s, c) => s + c.length, 0));
const r = buildRollers(wasm, { contours, sx, sy, x0: ext.x0, y0: ext.y0 }, { timing: lap });
lap('rulli (totale resto)');
console.log(r.info, r.warnings);
