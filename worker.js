// Worker: maschera -> contorni -> rulli, oppure il portarulli, senza bloccare la pagina.
import Module from './lib/manifold.js';
import { traceContours, extendPeriodic, simplifyClosed } from './trace.js';
import { buildRollers } from './geometry.js';
import { buildKit } from './kit.js';

const ready = Module().then((w) => { w.setup(); return w; });

function pack(m, transfer) {
  const mesh = m.getMesh();
  const np = mesh.numProp;
  let vert = mesh.vertProperties;
  if (np !== 3) {
    const out = new Float32Array((vert.length / np) * 3);
    for (let i = 0, j = 0; i < vert.length; i += np, j += 3) { out[j] = vert[i]; out[j + 1] = vert[i + 1]; out[j + 2] = vert[i + 2]; }
    vert = out;
  } else vert = vert.slice();
  const tri = mesh.triVerts.slice();
  transfer.push(vert.buffer, tri.buffer);
  return { vertProperties: vert, triVerts: tri, numProp: 3 };
}

self.onmessage = async ({ data }) => {
  const { id, kind } = data;
  try {
    const wasm = await ready;
    const t0 = performance.now();
    const transfer = [];
    if (kind === 'kit') {
      const r = buildKit(wasm, data.params);
      const print = {}, asm = {};
      for (const [k, m] of Object.entries(r.print)) print[k] = pack(m, transfer);
      for (const [k, m] of Object.entries(r.asm)) asm[k] = pack(m, transfer);
      self.postMessage({ id, kind, ok: true, print, asm, info: r.info, stack: r.stack, ms: Math.round(performance.now() - t0) }, transfer);
      return;
    }
    const { alpha, W, H, sx, sy, params } = data;
    const ext = extendPeriodic(alpha, W, H, Math.ceil(2 * sx));
    const contours = traceContours(ext.field, ext.w, ext.h).map((c) => simplifyClosed(c, 0.12));
    const r = buildRollers(wasm, { contours, sx, sy, x0: ext.x0, y0: ext.y0 }, params);
    const positive = pack(r.positive, transfer), negative = pack(r.negative, transfer);
    const ms = Math.round(performance.now() - t0);
    self.postMessage({ id, ok: true, positive, negative, info: r.info, warnings: r.warnings, ms }, transfer);
  } catch (e) {
    self.postMessage({ id, kind, ok: false, error: String(e && e.message ? e.message : e) });
  }
};
