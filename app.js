import * as THREE from 'three';
import { OrbitControls } from './lib/OrbitControls.js';
import {
  C, ZH, CARD, FONTS, PATTERNS, TILE_ALT, loadFont, addCustomFont, newElement, newId, defaultDesign, label,
  prepareImages, dropImageCache, bounds, moveBy, scaleBy, resizeRect, editMode, renderMask, renderDesign, maskSize,
} from './design.js';
import { AXIS_DIST, R, DEFAULTS } from './geometry.js';
import { toSTL, to3MF } from './export.js';
import { PRINT, bambuObjectSettings } from './print-settings.js';
import { embossImage } from './emboss.js';

const $ = (id) => document.getElementById(id);
const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ------------------------------------------------------------------ stato
const store = {
  get(k, d) { try { const v = localStorage.getItem('embosser.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('embosser.' + k, JSON.stringify(v)); return true; } catch { return false; } },
};

let els = [];
let selId = null;
const sel = () => els.find((e) => e.id === selId) || null;

function readParams() {
  return {
    relief: clampNum($('relief').value, 0.6, 1.6, DEFAULTS.relief),
    clearance: clampNum($('clearance').value, 0.1, 0.5, DEFAULTS.clearance),
    mark: $('mark').checked,
  };
}
// gradi in (-180, 180]
const normDeg = (a) => { const r = ((Math.round(a) % 360) + 360) % 360; return r > 180 ? r - 360 : r; };
function clampNum(v, a, b, d) { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; }

function save() {
  if (!store.set('design', els)) store.set('design', els.map((e) => (e.type === 'image' ? { ...e, src: null } : e)));
  store.set('params', readParams());
}

// ------------------------------------------------------------------ schema delle proprietà
// Voci dello schema: un campo, una riga di campi (array) o un gruppo chiudibile { group, items, show }.
// Posizione e misure si cambiano soprattutto trascinando sulla fascia: nel pannello stanno in gruppi chiusi.
const OP = { key: 'op', label: 'Effetto', type: 'seg', options: [['add', 'In rilievo'], ['cut', 'Sottrai']] };
const isMulti = (e) => String(e.text).includes('\n');
const single = (e) => e.layout !== 'tile';
const tiled = (e) => e.layout === 'tile';
const LAYOUT = { key: 'layout', label: 'Disposizione', type: 'seg', options: [['single', 'Singolo'], ['tile', 'Ripeti a motivo']] };
const AREA = [['all', 'Tutta la fascia'], ['card', 'Solo il biglietto'], ['rect', 'Riquadro']];
const TILE = [
  [{ key: 'stepX', label: 'Passo orizzontale', type: 'number', unit: 'mm', min: 2, max: 94, step: 0.5, show: tiled },
    { key: 'stepY', label: 'Passo verticale', type: 'number', unit: 'mm', min: 2, max: 57, step: 0.5, show: tiled }],
  [{ key: 'area', label: 'Dove', type: 'select', options: AREA, show: tiled },
    { key: 'stagger', label: 'File sfalsate', type: 'checkbox', show: tiled }],
  { key: 'alt', label: 'Alternanza', type: 'select', options: TILE_ALT, show: tiled },
  { group: 'Variazioni casuali', show: tiled, items: [
    [{ key: 'jitRot', label: 'Rotazione ±', type: 'number', unit: '°', min: 0, max: 180, step: 5 },
      { key: 'jitScale', label: 'Dimensione ±', type: 'number', unit: '%', min: 0, max: 60, step: 5 }],
    { key: 'tseed', label: 'Variante (cambia il caso)', type: 'number', min: 1, max: 9999, step: 1 },
  ] },
];
const SINGLE_POS = {
  group: 'Posizione e copie sul giro', show: single, items: [
    [{ key: 'x', label: 'Orizzontale', type: 'number', unit: 'mm', step: 0.5 }, { key: 'y', label: 'Verticale', type: 'number', unit: 'mm', step: 0.5 }],
    { key: 'repeat', label: 'Copie sul giro', type: 'number', min: 1, max: 12, step: 1 },
    { key: 'center', type: 'center' },
  ],
};
// rotazione sempre in vista: campo in gradi + scatti rapidi (per il motivo vale per ogni copia)
const ROT = { key: 'rot', label: 'Rotazione', type: 'rotation' };
const SCHEMA = {
  text: [
    { key: 'text', label: 'Testo (Invio per andare a capo)', type: 'textarea' },
    { key: 'font', label: 'Font', type: 'font' },
    [{ key: 'size', label: 'Altezza maiuscole', type: 'number', unit: 'mm', min: 1, max: 40, step: 0.25 },
      { key: 'spacing', label: 'Spaziatura lettere', type: 'number', unit: 'mm', min: -2, max: 8, step: 0.1 }],
    ROT, OP, LAYOUT, ...TILE,
    { group: 'Stile e righe', items: [
      [{ key: 'style', label: 'Stile', type: 'select', options: [['fill', 'Pieno'], ['outline', 'Solo contorno']] },
        { key: 'stroke', label: 'Spessore contorno', type: 'number', unit: 'mm', min: 0.3, max: 3, step: 0.1, show: (e) => e.style === 'outline' }],
      [{ key: 'align', label: 'Allineamento righe', type: 'select', options: [['left', 'Sinistra'], ['center', 'Centro'], ['right', 'Destra']], show: isMulti },
        { key: 'lineH', label: 'Interlinea', type: 'number', min: 0.8, max: 3, step: 0.05, show: isMulti }],
    ] },
    SINGLE_POS,
  ],
  pattern: [
    { key: 'kind', label: 'Motivo', type: 'select', options: PATTERNS },
    [{ key: 'period', label: 'Passo', type: 'number', unit: 'mm', min: 1.5, max: 40, step: 0.5 },
      { key: 'thick', label: 'Spessore / dimensione', type: 'number', unit: 'mm', min: 0.4, max: 15, step: 0.1 }],
    [{ key: 'angle', label: 'Angolo', type: 'number', unit: '°', step: 5, show: (e) => e.kind === 'righe' || e.kind === 'griglia' },
      { key: 'seed', label: 'Variante casuale', type: 'number', min: 1, max: 9999, step: 1, show: (e) => e.kind === 'coriandoli' }],
    { key: 'area', label: 'Dove', type: 'select', options: AREA },
    OP,
  ],
  image: [
    { key: 'src', label: 'File', type: 'image' },
    { key: 'threshold', label: 'Soglia (più alta = più scuri inclusi)', type: 'range', min: 1, max: 254, step: 1 },
    [{ key: 'w', label: 'Larghezza', type: 'number', unit: 'mm', min: 2, max: 94, step: 0.5 },
      { key: 'invert', label: 'Inverti chiari/scuri', type: 'checkbox' }],
    ROT, OP, LAYOUT, ...TILE,
    SINGLE_POS,
  ],
  frame: [
    { key: 'style', label: 'Stile', type: 'select', options: [['line', 'Linea'], ['double', 'Doppia'], ['dashed', 'Tratteggio'], ['corners', 'Solo angoli']] },
    [{ key: 'radius', label: 'Raggio angoli', type: 'number', unit: 'mm', min: 0, max: 20, step: 0.5 }, { key: 'thick', label: 'Spessore', type: 'number', unit: 'mm', min: 0.4, max: 5, step: 0.1 }],
    OP,
    { group: 'Posizione e misure', items: [
      [{ key: 'x', label: 'Sinistra', type: 'number', unit: 'mm', step: 0.5 }, { key: 'y', label: 'Alto', type: 'number', unit: 'mm', step: 0.5 }],
      [{ key: 'w', label: 'Larghezza', type: 'number', unit: 'mm', min: 4, max: 94, step: 0.5 }, { key: 'h', label: 'Altezza', type: 'number', unit: 'mm', min: 4, max: 57, step: 0.5 }],
    ] },
  ],
};
const TYPE_NAME = { text: 'Testo', pattern: 'Motivo', image: 'Immagine', frame: 'Cornice' };

let formFields = []; // { f, wrap, input }

let fieldSeq = 0;
function fieldHtml(f, el) {
  const id = `p_${f.key}_${fieldSeq++}`;
  const unit = f.unit ? ` <span class="unit">${f.unit}</span>` : '';
  const v = el[f.key];
  switch (f.type) {
    case 'textarea': return `<label>${f.label}<textarea id="${id}" data-key="${f.key}" rows="2">${escapeHtml(v)}</textarea></label>`;
    case 'number': return `<label>${f.label}${unit}<input id="${id}" data-key="${f.key}" type="number" step="${f.step ?? 'any'}"${f.min != null ? ` min="${f.min}"` : ''}${f.max != null ? ` max="${f.max}"` : ''} value="${v}"></label>`;
    case 'select': return `<label>${f.label}<select id="${id}" data-key="${f.key}">${f.options.map(([k, t]) => `<option value="${k}"${k === v ? ' selected' : ''}>${escapeHtml(t)}</option>`).join('')}</select></label>`;
    case 'font': return `<label>${f.label}<select id="${id}" data-key="${f.key}">${FONTS.map((x) => `<option value="${x.id}"${x.id === v ? ' selected' : ''}>${escapeHtml(x.name)}</option>`).join('')}<option value="__upload">Carica un font (TTF, OTF, WOFF)…</option></select></label>`;
    case 'range': return `<label>${f.label} <span class="unit" data-out="${f.key}">${v}</span><input id="${id}" data-key="${f.key}" type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${v}"></label>`;
    case 'rotation': return `<label>${f.label} <span class="unit">° (pallino sopra la selezione)</span></label><div class="rotrow"><input id="${id}" data-key="rot" type="number" step="1" min="-180" max="180" value="${v || 0}" aria-label="Rotazione in gradi"><button type="button" data-rot="-15">−15°</button><button type="button" data-rot="0">0°</button><button type="button" data-rot="15">+15°</button><button type="button" data-rot="90">+90°</button></div>`;
    case 'center': return '<div class="row"><button type="button" data-center="h">Centra in orizzontale</button><button type="button" data-center="v">Centra in verticale</button></div>';
    case 'checkbox': return `<label class="chk opt"><input id="${id}" data-key="${f.key}" type="checkbox"${v ? ' checked' : ''}> ${f.label}</label>`;
    case 'seg': return `<div class="seg" data-wrap="${f.key}">${f.options.map(([k, t]) => `<label><input type="radio" name="${id}" data-key="${f.key}" value="${k}"${k === v ? ' checked' : ''}> ${t}</label>`).join('')}</div>`;
    case 'image': return `<div class="row"><button type="button" id="pickImage">${el.src ? 'Cambia immagine…' : 'Scegli immagine…'}</button><span class="hint" style="align-self:center">${escapeHtml(el.name || 'nessun file')}</span></div><p class="hint">PNG, JPG o SVG. Va bene un logo nero su bianco: si può anche trascinare il file sulla fascia.</p>`;
  }
  return '';
}

function renderProps() {
  const el = sel();
  const box = $('props');
  formFields = [];
  if (!el) { box.innerHTML = ''; return; }
  const hint = editMode(el)?.scale
    ? 'Sulla fascia: trascina per spostare, angoli per ingrandire, pallino per ruotare. Si aggancia alle guide: tieni Alt per muoverlo libero.'
    : editMode(el)?.rect ? 'Sulla fascia: trascina per spostare, angoli per cambiare le misure. Tieni Alt per non agganciarti alle guide.' : '';
  const parts = [`<p class="ptitle">${TYPE_NAME[el.type]}${hint ? ` <span class="muted">${hint}</span>` : ''}</p>`];
  let n = 0;
  const uid = () => `w${n++}`;
  const flat = [];
  const one = (f) => { const w = uid(); flat.push({ f, w }); return `<div data-w="${w}">${fieldHtml(f, el)}</div>`; };
  const emit = (item) => {
    if (Array.isArray(item)) return `<div class="row">${item.map(one).join('')}</div>`;
    if (item.group) {
      const w = uid();
      flat.push({ f: { show: item.show }, w });
      return `<details data-w="${w}"><summary>${item.group}</summary>${item.items.map(emit).join('')}</details>`;
    }
    return one(item);
  };
  for (const item of SCHEMA[el.type]) parts.push(emit(item));
  box.innerHTML = parts.join('');
  for (const { f, w } of flat) formFields.push({ f, wrap: box.querySelector(`[data-w="${w}"]`) });
  updateVisibility();

  for (const input of box.querySelectorAll('[data-key]')) {
    const ev = input.tagName === 'SELECT' || input.type === 'checkbox' || input.type === 'radio' ? 'change' : 'input';
    input.addEventListener(ev, () => onField(el, input));
  }
  $('pickImage')?.addEventListener('click', () => $('imageFile').click());
  for (const bt of box.querySelectorAll('[data-rot]')) {
    bt.addEventListener('click', () => {
      const d = +bt.dataset.rot;
      el.rot = d === 0 ? 0 : normDeg((el.rot || 0) + d);
      syncForm(); changed();
    });
  }
  // centro fascia = centro del biglietto
  box.querySelector('[data-center=h]')?.addEventListener('click', () => { el.x = +(C / 2).toFixed(2); syncForm(); changed(); });
  box.querySelector('[data-center=v]')?.addEventListener('click', () => { el.y = +(ZH / 2).toFixed(2); syncForm(); changed(); });
}

function updateVisibility() {
  const el = sel();
  for (const { f, wrap } of formFields) if (wrap) wrap.hidden = !!(f.show && !f.show(el));
}

async function onField(el, input) {
  const key = input.dataset.key;
  const f = formFields.find((x) => x.f.key === key)?.f;
  let v;
  if (input.type === 'checkbox') v = input.checked;
  else if (input.type === 'radio') { if (!input.checked) return; v = input.value; }
  else if (f && (f.type === 'number' || f.type === 'range' || f.type === 'rotation')) {
    v = parseFloat(String(input.value).replace(',', '.'));
    if (!Number.isFinite(v)) return;
    if (f.min != null) v = Math.max(f.min, v);
    if (f.max != null) v = Math.min(f.max, v);
    if (f.type === 'range') { const o = $('props').querySelector(`[data-out="${key}"]`); if (o) o.textContent = v; }
  } else v = input.value;
  if (key === 'font' && v === '__upload') { input.value = el.font; $('fontFile').click(); return; }
  if (key === 'layout' && v === 'tile') {
    // passo di partenza: l'ingombro dell'elemento più un po' d'aria
    const b = bounds(maskCanvas.getContext('2d'), el);
    if (b) { el.stepX = Math.round(Math.max(4, b.w + 4) * 2) / 2; el.stepY = Math.round(Math.max(4, b.h + 4) * 2) / 2; }
  }
  el[key] = v;
  if (key === 'layout' || key === 'area') { renderProps(); renderLayers(); changed(); return; }
  updateVisibility();
  renderLayers();
  changed();
}

// aggiorna i campi del modulo dopo un trascinamento (senza ricostruirlo)
function syncForm() {
  const el = sel();
  if (!el) return;
  for (const input of $('props').querySelectorAll('[data-key]')) {
    if (input === document.activeElement || input.type === 'radio' || input.type === 'checkbox') continue;
    const v = el[input.dataset.key];
    if (v !== undefined && String(input.value) !== String(v)) input.value = v;
  }
}

// ------------------------------------------------------------------ lista elementi
function renderLayers() {
  const ul = $('layers');
  if (!els.length) { ul.innerHTML = '<li class="empty">Nessun elemento: aggiungine uno.</li>'; return; }
  ul.innerHTML = [...els].reverse().map((e) => `
    <li data-id="${e.id}" class="${e.id === selId ? 'sel' : ''} ${e.visible ? '' : 'off'}">
      <span class="ty">${TYPE_NAME[e.type]}</span>
      <span class="nm">${escapeHtml(label(e))}</span>
      ${e.op === 'cut' ? '<span class="cut">sottrai</span>' : ''}
      <button type="button" data-act="vis" title="${e.visible ? 'Nascondi' : 'Mostra'}">${e.visible ? '◉' : '○'}</button>
      <button type="button" data-act="up" title="Porta sopra">↑</button>
      <button type="button" data-act="down" title="Porta sotto">↓</button>
      <button type="button" data-act="dup" title="Duplica">⧉</button>
      <button type="button" data-act="del" title="Elimina">✕</button>
    </li>`).join('');
}

$('layers').addEventListener('click', (ev) => {
  const li = ev.target.closest('li[data-id]');
  if (!li) return;
  const i = els.findIndex((e) => e.id === li.dataset.id);
  const el = els[i];
  const act = ev.target.closest('button')?.dataset.act;
  if (!act) { select(el.id); return; }
  if (act === 'vis') el.visible = !el.visible;
  if (act === 'up' && i < els.length - 1) [els[i], els[i + 1]] = [els[i + 1], els[i]];
  if (act === 'down' && i > 0) [els[i], els[i - 1]] = [els[i - 1], els[i]];
  if (act === 'dup') {
    const copy = { ...structuredClone(el), id: newId() };
    if (copy.x !== undefined) { copy.x += 3; copy.y += 3; }
    els.splice(i + 1, 0, copy);
    selId = copy.id;
    renderProps();
  }
  if (act === 'del') { els.splice(i, 1); dropImageCache(el.id); if (selId === el.id) { selId = null; renderProps(); } }
  renderLayers();
  changed();
});

function select(id) {
  selId = id;
  renderLayers();
  renderProps();
  drawEditor();
}

for (const b of document.querySelectorAll('[data-add]')) {
  b.addEventListener('click', () => {
    const el = newElement(b.dataset.add);
    els.push(el);
    select(el.id);
    if (el.type === 'image') $('imageFile').click();
    changed();
  });
}
// se si annulla la scelta del file, l'immagine appena aggiunta (vuota) sparisce
$('imageFile').addEventListener('cancel', () => {
  const el = sel();
  if (el && el.type === 'image' && !el.src) { els = els.filter((e) => e !== el); select(null); changed(); }
});

// ------------------------------------------------------------------ file (immagine, font, disegno)
function readAsDataURL(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}

async function setImage(el, file) {
  el.src = await readAsDataURL(file);
  el.name = file.name;
  dropImageCache(el.id);
  renderProps();
  renderLayers();
  changed();
}

$('imageFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  const el = sel();
  if (file && el && el.type === 'image') await setImage(el, file);
});

$('fontFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  const el = sel();
  if (!file || !el || el.type !== 'text') return;
  try {
    el.font = await addCustomFont(file);
    renderProps();
    changed();
  } catch (err) { setStatus('Font non leggibile: ' + err.message, true); }
});

$('dlJson').addEventListener('click', () => {
  const data = JSON.stringify({ app: 'rulli-embosser', version: 1, params: readParams(), elements: els }, null, 1);
  download(new TextEncoder().encode(data), `rulli-embosser-${slug()}.json`, 'application/json');
});
$('openJson').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.elements)) throw new Error('file non riconosciuto');
    loadDesign(data.elements, data.params);
    changed();
  } catch (err) { setStatus('Disegno non leggibile: ' + err.message, true); }
});

function loadDesign(list, params) {
  els = list.map((e) => ({ ...newElement(e.type), ...e }));
  for (const e of els) if (e.type === 'text' && !FONTS.some((f) => f.id === e.font)) e.font = 'playfair';
  if (params) { $('relief').value = params.relief ?? DEFAULTS.relief; $('clearance').value = params.clearance ?? DEFAULTS.clearance; $('mark').checked = params.mark ?? true; }
  selId = null;
  renderLayers();
  renderProps();
}

// ------------------------------------------------------------------ editor della fascia
const VIEW_PAD = 8; // mm mostrati oltre la cucitura, per vedere come si richiude
const maskCanvas = document.createElement('canvas');
const tint = document.createElement('canvas');
const editor = $('editor');
let view = { k: 1 };

async function ensureAssets() {
  await Promise.all(els.filter((e) => e.type === 'text').map((e) => loadFont(e.font).catch(() => false)));
  await prepareImages(els);
}

function renderAll() {
  renderMask(maskCanvas, els);
  maskVersion++;
  drawEditor();
}

function drawEditor() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  // larghezza del contenitore, ma non più alta del 46% della finestra (le anteprime devono restare visibili)
  const avail = (editor.parentElement.clientWidth || 800) - 16;
  const cssW = Math.max(280, Math.min(avail, (innerHeight * 0.46 * (C + 2 * VIEW_PAD)) / ZH));
  const k = cssW / (C + 2 * VIEW_PAD);
  const cssH = ZH * k;
  view = { k };
  editor.style.width = cssW + 'px';
  editor.style.height = cssH + 'px';
  editor.width = Math.round(cssW * dpr);
  editor.height = Math.round(cssH * dpr);
  const ctx = editor.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const X = (u) => (u + VIEW_PAD) * k;

  const mode = look();
  if (mode === 'flat') {
    ctx.fillStyle = css('--strip');
    ctx.fillRect(0, 0, cssW, cssH);
    // griglia 5 mm
    ctx.strokeStyle = 'rgba(0,0,0,.06)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let u = 0; u <= C; u += 5) { ctx.moveTo(X(u), 0); ctx.lineTo(X(u), cssH); }
    for (let v = 0; v <= ZH; v += 5) { ctx.moveTo(0, v * k); ctx.lineTo(cssW, v * k); }
    ctx.stroke();
    // disegno colorato (anche oltre la cucitura, attenuato)
    tint.width = maskCanvas.width; tint.height = maskCanvas.height;
    const t = tint.getContext('2d');
    t.clearRect(0, 0, tint.width, tint.height);
    t.drawImage(maskCanvas, 0, 0);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = css('--ink');
    t.fillRect(0, 0, tint.width, tint.height);
    t.globalCompositeOperation = 'source-over';
    for (const o of [-C, 0, C]) ctx.drawImage(tint, X(o), 0, C * k, cssH);
  } else {
    // carta in rilievo (il retro è già specchiato nell'immagine: la fascia è simmetrica attorno al biglietto)
    const img = reliefImage(mode === 'back');
    ctx.imageSmoothingQuality = 'high';
    for (const o of [-C, 0, C]) ctx.drawImage(img, X(o), 0, C * k, cssH);
  }
  ctx.fillStyle = 'rgba(13,13,16,.55)';
  ctx.fillRect(0, 0, X(0), cssH);
  ctx.fillRect(X(C), 0, cssW - X(C), cssH);

  // biglietto
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#7d6a45'; ctx.lineWidth = 1.5;
  ctx.strokeRect(X(CARD.x), CARD.y * k, CARD.w * k, CARD.h * k);
  ctx.setLineDash([]);
  // cucitura e tacche (lato alto = faccia con la tacca)
  ctx.strokeStyle = '#c0504d'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), cssH); ctx.moveTo(X(C), 0); ctx.lineTo(X(C), cssH); ctx.stroke();
  ctx.fillStyle = '#c0504d';
  for (const u of [0, C]) { ctx.beginPath(); ctx.moveTo(X(u) - 6, 0); ctx.lineTo(X(u) + 6, 0); ctx.lineTo(X(u), 9); ctx.closePath(); ctx.fill(); }
  ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = 'rgba(236,236,241,.75)';
  ctx.fillText('tacca', 4, 12);

  // selezione con maniglie
  handles = [];
  const el = sel();
  if (el && el.visible && mode !== 'back') {
    const b = bounds(maskCanvas.getContext('2d'), el);
    const mode = editMode(el);
    if (b) {
      const a = ((b.rot || 0) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
      const cx = X(b.cx), cy = b.cy * k, hw = (b.w / 2) * k + 3, hh = (b.h / 2) * k + 3;
      const P = (lx, ly) => [cx + lx * ca - ly * sa, cy + lx * sa + ly * ca];
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(a);
      ctx.strokeStyle = '#3aa0ff'; ctx.lineWidth = 1.5; ctx.setLineDash(mode ? [] : [4, 3]);
      ctx.strokeRect(-hw, -hh, 2 * hw, 2 * hh);
      if (mode?.scale) { ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(0, -hh - 16); ctx.stroke(); }
      ctx.restore();
      if (mode) {
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const [px, py] = P(sx * hw, sy * hh);
          handles.push({ kind: 'corner', sx, sy, px, py, cx, cy });
        }
        if (mode.scale) { const [px, py] = P(0, -hh - 22); handles.push({ kind: 'rot', px, py, cx, cy }); }
        for (const h of handles) {
          ctx.beginPath();
          if (h.kind === 'rot') ctx.arc(h.px, h.py, 8, 0, Math.PI * 2);
          else ctx.rect(h.px - 5, h.py - 5, 10, 10);
          ctx.fillStyle = '#fff'; ctx.fill();
          ctx.strokeStyle = '#3aa0ff'; ctx.lineWidth = 1.5; ctx.stroke();
          if (h.kind === 'rot') rotIcon(ctx, h.px, h.py);
        }
        // gradi accanto al pallino (sempre, se ruotato)
        const rh = handles.find((x) => x.kind === 'rot');
        const rotating = drag && drag.kind === 'rot';
        if (rh && (el.rot || 0) !== 0 && !rotating) badge(ctx, `${normDeg(el.rot)}°`, rh.px + 13, rh.py - 9);
        if (rotating) {
          // riferimento orizzontale e arco dall'orizzontale all'angolo attuale
          const R = Math.min(70, Math.max(46, hh * 0.9));
          ctx.save();
          ctx.strokeStyle = 'rgba(58,160,255,.8)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
          ctx.beginPath(); ctx.moveTo(cx - R - 10, cy); ctx.lineTo(cx + R + 10, cy); ctx.stroke();
          ctx.setLineDash([]); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, 0, a, a < 0); ctx.closePath();
          ctx.fillStyle = 'rgba(58,160,255,.18)'; ctx.fill(); ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  // guide magnetiche e valore durante il trascinamento
  if (drag && drag.guides) {
    ctx.save();
    ctx.strokeStyle = '#ff3fb4'; ctx.lineWidth = 1; ctx.setLineDash([5, 3]);
    for (const g of drag.guides) {
      ctx.beginPath();
      if (g.x !== undefined) { ctx.moveTo(X(g.x), 0); ctx.lineTo(X(g.x), cssH); }
      else { ctx.moveTo(0, g.y * k); ctx.lineTo(cssW, g.y * k); }
      ctx.stroke();
    }
    ctx.restore();
  }
  if (drag && drag.readout && drag.at) badge(ctx, drag.readout, drag.at.px + 14, drag.at.py + 18, drag.kind === 'rot');
}

// etichetta scura con testo chiaro (gradi, misure), tenuta dentro l'editor
function badge(ctx, text, x, y, big = false) {
  ctx.save();
  ctx.font = `${big ? 600 : 500} ${big ? 14 : 12}px system-ui, sans-serif`;
  const w = ctx.measureText(text).width + 12, h = big ? 22 : 19;
  const cw = editor.clientWidth, ch = editor.clientHeight;
  x = Math.min(Math.max(2, x), cw - w - 2); y = Math.min(Math.max(2, y), ch - h - 2);
  ctx.fillStyle = 'rgba(20,20,26,.88)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 6, y + h / 2 + 0.5);
  ctx.restore();
}
// freccia circolare dentro il pallino di rotazione
function rotIcon(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = '#3aa0ff'; ctx.fillStyle = '#3aa0ff'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(x, y, 4.2, -Math.PI * 0.15, Math.PI * 1.35); ctx.stroke();
  const ax = x + 4.2 * Math.cos(-Math.PI * 0.15), ay = y + 4.2 * Math.sin(-Math.PI * 0.15);
  ctx.beginPath(); ctx.moveTo(ax + 2.6, ay - 0.4); ctx.lineTo(ax - 0.6, ay - 2.8); ctx.lineTo(ax - 0.2, ay + 1.6); ctx.closePath(); ctx.fill();
  ctx.restore();
}
let handles = []; // maniglie dell'elemento selezionato, in px css dell'editor

function toMM(ev) {
  const r = editor.getBoundingClientRect();
  const px = ev.clientX - r.left, py = ev.clientY - r.top;
  return { u: px / view.k - VIEW_PAD, v: py / view.k, px, py };
}
const handleAt = (px, py) => handles.find((h) => Math.hypot(h.px - px, h.py - py) <= (h.kind === 'rot' ? 11 : 9)) || null;
const HANDLE_CURSOR = (h) => (h.kind === 'rot' ? 'grab' : h.sx * h.sy > 0 ? 'nwse-resize' : 'nesw-resize');

function hit(u, v) {
  const mctx = maskCanvas.getContext('2d');
  for (let i = els.length - 1; i >= 0; i--) {
    const el = els[i];
    if (!el.visible) continue;
    const b = bounds(mctx, el);
    if (!b || !editMode(el)) continue;
    const a = (-(b.rot || 0) * Math.PI) / 180;
    for (const o of [-C, 0, C]) {
      const dx = u - (b.cx + o), dy = v - b.cy;
      const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(lx) <= b.w / 2 + 1 && Math.abs(ly) <= b.h / 2 + 1) return el;
    }
  }
  return null;
}

// trascinamento: sposta, ingrandisci (angolo), cambia misure (angolo di un riquadro), ruota (pallino)
let drag = null;
editor.addEventListener('pointerdown', (ev) => {
  if (look() === 'back') return; // il retro è solo da guardare
  const p = toMM(ev);
  const h = handleAt(p.px, p.py);
  let el = sel();
  if (h && el) {
    const mode = editMode(el);
    const kind = h.kind === 'rot' ? 'rot' : mode.scale ? 'scale' : 'rect';
    drag = { el, kind, h, p, start: { ...el }, keys: mode.rect, moved: false };
  } else {
    el = hit(p.u, p.v);
    if (!el) { if (selId) select(null); return; }
    if (el.id !== selId) select(el.id);
    drag = { el, kind: 'move', p, start: { ...el }, moved: false };
  }
  editor.setPointerCapture(ev.pointerId);
  editor.focus();
});
editor.addEventListener('pointermove', (ev) => {
  const p = toMM(ev);
  if (!drag) {
    if (look() === 'back') { editor.style.cursor = 'default'; return; }
    const h = handleAt(p.px, p.py);
    editor.style.cursor = h ? HANDLE_CURSOR(h) : hit(p.u, p.v) ? 'move' : 'default';
    return;
  }
  const { el, start, h } = drag;
  const du = p.u - drag.p.u, dv = p.v - drag.p.v;
  const snapOn = !ev.altKey;
  drag.guides = [];
  drag.at = p;
  if (drag.kind === 'move') {
    moveBy(el, start, du, dv);
    if (snapOn) {
      const A = aabb(bounds(maskCanvas.getContext('2d'), el));
      const T = snapTargets(el);
      const sx = snapAxis([A.l, A.cx, A.r], T.xs), sy = snapAxis([A.t, A.cy, A.b], T.ys);
      if (sx || sy) moveBy(el, start, du + (sx ? sx.d : 0), dv + (sy ? sy.d : 0));
      if (sx) drag.guides.push({ x: sx.t });
      if (sy) drag.guides.push({ y: sy.t });
    }
    const [kx, ky] = el.layout === 'tile' ? ['rx', 'ry'] : ['x', 'y'];
    drag.readout = `x ${fmt(el[kx])} · y ${fmt(el[ky])} mm`;
  } else if (drag.kind === 'rect') {
    resizeRect(el, start, drag.keys, h.sx, h.sy, du, dv);
    const [kx, ky, kw, kh] = drag.keys;
    if (snapOn) {
      // aggancio solo dei due bordi che si stanno muovendo
      const T = snapTargets(el);
      const ex = h.sx > 0 ? el[kx] + el[kw] : el[kx], ey = h.sy > 0 ? el[ky] + el[kh] : el[ky];
      const sx = snapAxis([ex], T.xs), sy = snapAxis([ey], T.ys);
      if (sx || sy) resizeRect(el, start, drag.keys, h.sx, h.sy, du + (sx ? sx.d : 0), dv + (sy ? sy.d : 0));
      if (sx) drag.guides.push({ x: sx.t });
      if (sy) drag.guides.push({ y: sy.t });
    }
    drag.readout = `${fmt(el[kw])} × ${fmt(el[kh])} mm`;
  } else if (drag.kind === 'scale') {
    const d0 = Math.hypot(drag.p.px - h.cx, drag.p.py - h.cy), d = Math.hypot(p.px - h.cx, p.py - h.cy);
    if (d0 > 2) scaleBy(el, start, d / d0);
    drag.readout = el.type === 'text' ? `altezza lettere ${fmt(el.size, 2)} mm` : `larghezza ${fmt(el.w)} mm`;
  } else if (drag.kind === 'rot') {
    const a0 = Math.atan2(drag.p.py - h.cy, drag.p.px - h.cx), a = Math.atan2(p.py - h.cy, p.px - h.cx);
    let r = normDeg((start.rot || 0) + ((a - a0) * 180) / Math.PI);
    const snap = Math.round(r / 15) * 15;
    if (ev.shiftKey || Math.abs(r - snap) < 4) r = normDeg(snap); // si aggancia a 0°, 15°, 30°…
    el.rot = r;
    drag.readout = `${r}°${r % 15 === 0 ? ' ✓' : ''}`;
  }
  drag.moved = true;
  requestFrame();
});

// ---- guide magnetiche
const SNAP_PX = 7; // distanza di aggancio in pixel dello schermo
// riquadro allineato agli assi di un riquadro ruotato
function aabb(b) {
  const a = ((b.rot || 0) * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const ex = c * b.w / 2 + s * b.h / 2, ey = s * b.w / 2 + c * b.h / 2;
  return { l: b.cx - ex, r: b.cx + ex, t: b.cy - ey, b: b.cy + ey, cx: b.cx, cy: b.cy };
}
// linee a cui agganciarsi: bordi, centro e margine di 4 mm del biglietto, poi bordi e centri degli altri elementi
function snapTargets(except) {
  const m = 4;
  const xs = [CARD.x, CARD.x + m, C / 2, CARD.x + CARD.w - m, CARD.x + CARD.w];
  const ys = [CARD.y, CARD.y + m, ZH / 2, CARD.y + CARD.h - m, CARD.y + CARD.h];
  const mctx = maskCanvas.getContext('2d');
  for (const e of els) {
    if (e === except || !e.visible || !editMode(e)) continue;
    const b = bounds(mctx, e);
    if (!b) continue;
    const A = aabb(b);
    xs.push(A.l, A.cx, A.r); ys.push(A.t, A.cy, A.b);
  }
  return { xs, ys };
}
function snapAxis(cands, targets) {
  const thr = SNAP_PX / view.k;
  let best = null;
  for (const c of cands) for (const t of targets) {
    const d = t - c;
    if (Math.abs(d) <= thr && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t };
  }
  return best;
}
const endDrag = () => {
  if (!drag) return;
  const moved = drag.moved;
  drag = null;
  drawEditor(); // toglie guide ed etichetta
  if (moved) { syncForm(); renderLayers(); changed(); }
};
editor.addEventListener('pointerup', endDrag);
editor.addEventListener('pointercancel', endDrag);
// doppio clic: va al primo campo (per un testo, il testo da scrivere)
editor.addEventListener('dblclick', () => { const f = $('props').querySelector('textarea, input, select'); if (f) { f.focus(); f.select?.(); } });
editor.addEventListener('keydown', (ev) => {
  const el = sel();
  if (!el) return;
  const step = ev.shiftKey ? 2 : 0.5;
  const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[ev.key];
  if (mv && editMode(el)) {
    ev.preventDefault();
    moveBy(el, { ...el }, mv[0], mv[1]);
    syncForm(); changed();
  } else if (ev.key === 'Delete') {
    els = els.filter((e) => e !== el); dropImageCache(el.id); select(null); changed();
  }
});
// immagine trascinata sulla fascia
editor.addEventListener('dragover', (ev) => ev.preventDefault());
editor.addEventListener('drop', async (ev) => {
  ev.preventDefault();
  const file = [...(ev.dataTransfer?.files || [])].find((f) => f.type.startsWith('image/'));
  if (!file) return;
  const { u, v } = toMM(ev);
  const el = { ...newElement('image'), x: +u.toFixed(1), y: +v.toFixed(1) };
  els.push(el);
  selId = el.id;
  await setImage(el, file);
});

let frameReq = 0;
function requestFrame() {
  if (frameReq) return;
  frameReq = requestAnimationFrame(() => { frameReq = 0; renderMask(maskCanvas, els); maskVersion++; drawEditor(); });
}

// ------------------------------------------------------------------ resa in rilievo della fascia
// Ricalcolata solo quando cambia la maschera o la vista (fronte/retro).
const reliefCanvas = document.createElement('canvas');
let maskVersion = 0, reliefKey = '';
const look = () => document.querySelector('input[name=look]:checked').value;

function reliefImage(back) {
  const key = `${maskVersion}|${back}`;
  if (key !== reliefKey) {
    const { W, H, sx } = maskSize();
    const a = maskCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
    reliefCanvas.width = W; reliefCanvas.height = H;
    reliefCanvas.getContext('2d').putImageData(embossImage(a, W, H, { back, stride: 4, pxmm: sx }), 0, 0);
    reliefKey = key;
  }
  return reliefCanvas;
}
const LOOK_HINT = {
  relief: 'luce radente: così appare il biglietto dal lato in rilievo',
  flat: '',
  back: 'retro del foglio (specchiato, solo da guardare)',
};
for (const r of document.querySelectorAll('input[name=look]')) {
  r.addEventListener('change', () => { $('lookHint').textContent = LOOK_HINT[look()]; store.set('look', look()); drawEditor(); });
}

// ------------------------------------------------------------------ scena 3D
const viewerEl = $('viewer');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
viewerEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#16161a');
const camera = new THREE.PerspectiveCamera(35, 1, 1, 3000);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight('#ffffff', '#40404a', 1.5));
const key = new THREE.DirectionalLight('#ffffff', 2.4); key.position.set(120, -200, 220); scene.add(key);
const rim = new THREE.DirectionalLight('#ffe0a8', 0.8); rim.position.set(-200, 150, 80); scene.add(rim);
const MAT = {
  positive: new THREE.MeshStandardMaterial({ color: '#e8c27a', roughness: 0.5, flatShading: true }),
  negative: new THREE.MeshStandardMaterial({ color: '#cfd2d6', roughness: 0.55, flatShading: true }),
};
Object.assign(MAT, {
  body: new THREE.MeshStandardMaterial({ color: '#dfe3ea', roughness: 0.6, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
  lid: new THREE.MeshStandardMaterial({ color: '#dfe3ea', roughness: 0.6, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }),
  gearA: new THREE.MeshStandardMaterial({ color: '#c99a45', roughness: 0.45, flatShading: true }),
  gearB: new THREE.MeshStandardMaterial({ color: '#8f97a3', roughness: 0.45, flatShading: true }),
  crank: new THREE.MeshStandardMaterial({ color: '#3a3a44', roughness: 0.5, flatShading: true }),
  grip: new THREE.MeshStandardMaterial({ color: '#e8c27a', roughness: 0.6, flatShading: true }),
});
const groups = { mesh: new THREE.Group(), print: new THREE.Group(), kit: new THREE.Group() };
scene.add(groups.mesh, groups.print, groups.kit);
const bed = new THREE.GridHelper(140, 14, '#55555f', '#2e2e36');
bed.rotation.x = Math.PI / 2;
groups.print.add(bed);
let spinP = null, spinN = null, phi = 0, view3d = 'mesh', lastResult = null;

function toGeometry(m) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.vertProperties, 3));
  g.setIndex(new THREE.BufferAttribute(m.triVerts, 1));
  return g;
}
function clearGroup(g, keep = []) { for (const c of [...g.children]) if (!keep.includes(c)) { g.remove(c); c.traverse((o) => o.geometry?.dispose()); } }

function showResult(r) {
  lastResult = r;
  clearGroup(groups.mesh);
  clearGroup(groups.print, [bed]);
  const gp = toGeometry(r.positive), gn = toGeometry(r.negative);
  // in presa: positivo a sinistra, negativo a destra, tacche affacciate a φ = 0
  spinP = new THREE.Mesh(gp, MAT.positive); spinP.position.set(-AXIS_DIST / 2, 0, 0);
  spinN = new THREE.Mesh(gn, MAT.negative); spinN.position.set(AXIS_DIST / 2, 0, 0);
  groups.mesh.add(spinP, spinN);
  setPhase();
  const pp = new THREE.Mesh(gp, MAT.positive); pp.position.set(-22, 0, 0);
  const pn = new THREE.Mesh(gn, MAT.negative); pn.position.set(22, 0, 0);
  groups.print.add(pp, pn);
  buildKitScene();
  if (!showResult.fitted) { fit(); showResult.fitted = true; }
  invalidate();
}
function setPhase() {
  if (spinP) { spinP.rotation.z = phi; spinN.rotation.z = Math.PI - phi; }
  if (kitPivot.A) { kitPivot.A.rotation.z = phi; kitPivot.B.rotation.z = -phi; }
}

// ---- portarulli montato: due perni di rotazione (lato A e lato B) che girano come gli ingranaggi
let lastKit = null;
const kitPivot = { A: null, B: null };
const SIDE_A = ['gearA1', 'gearA2'], SIDE_B = ['gearB', 'gearBk', 'crank', 'grip'];
function buildKitScene() {
  clearGroup(groups.kit);
  kitPivot.A = kitPivot.B = null;
  if (!lastKit) return;
  const a = AXIS_DIST / 2, zR = lastKit.stack.zRoller;
  const A = new THREE.Group(), B = new THREE.Group();
  A.position.set(-a, 0, 0); B.position.set(a, 0, 0);
  groups.kit.add(A, B);
  for (const [k, m] of Object.entries(lastKit.asm)) {
    // copia dei vertici: translate() lavora sul posto e i dati del kit servono ancora (ricostruzioni successive)
    const g = toGeometry({ ...m, vertProperties: new Float32Array(m.vertProperties) });
    const mat = k === 'body' ? MAT.body : k === 'lid' ? MAT.lid : k.startsWith('gearA') ? MAT.gearA : k.startsWith('gearB') ? MAT.gearB : MAT[k];
    const mesh = new THREE.Mesh(g, mat);
    if (SIDE_A.includes(k)) { g.translate(a, 0, 0); A.add(mesh); }
    else if (SIDE_B.includes(k)) { g.translate(-a, 0, 0); B.add(mesh); }
    else { if (k === 'lid') mesh.visible = $('showLid').checked; mesh.renderOrder = 2; mesh.name = k; groups.kit.add(mesh); }
  }
  if (lastResult) {
    const p = new THREE.Mesh(toGeometry(lastResult.positive), MAT.positive); p.position.set(0, 0, zR); A.add(p);
    const n = new THREE.Mesh(toGeometry(lastResult.negative), MAT.negative); n.position.set(0, 0, zR); n.rotation.z = Math.PI; B.add(n);
  }
  kitPivot.A = A; kitPivot.B = B;
  setPhase();
  invalidate();
}
$('showLid').addEventListener('change', () => { const l = groups.kit.getObjectByName('lid'); if (l) l.visible = $('showLid').checked; invalidate(); });

function setView(v) {
  view3d = v;
  for (const k of Object.keys(groups)) groups[k].visible = k === v;
  $('lidWrap').hidden = v !== 'kit';
  if (v === 'kit' && !lastKit) requestKit();
  fit(); invalidate();
}
function fit() {
  const box = new THREE.Box3();
  groups[view3d].traverse((o) => { if (o.isMesh) box.expandByObject(o); });
  if (box.isEmpty()) return;
  const c = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  const fov = THREE.MathUtils.degToRad(camera.fov) / 2;
  const fitFov = camera.aspect < 1 ? Math.atan(Math.tan(fov) * camera.aspect) : fov;
  const dir = view3d === 'mesh' ? new THREE.Vector3(0.35, -1, 0.55) : view3d === 'kit' ? new THREE.Vector3(0.6, -1, 0.75) : new THREE.Vector3(0.2, -1, 0.8);
  camera.position.copy(c).add(dir.normalize().multiplyScalar((radius / Math.sin(fitFov)) * 1.02));
  controls.target.copy(c);
  controls.update();
}
function resize3d() {
  const w = viewerEl.clientWidth, h = viewerEl.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
  invalidate();
}
new ResizeObserver(resize3d).observe(viewerEl);
new ResizeObserver(() => drawEditor()).observe(editor.parentElement);

let dirty = true;
const invalidate = () => { dirty = true; };
controls.addEventListener('change', invalidate);
let prevT = performance.now();
renderer.setAnimationLoop((t) => {
  const dt = Math.min((t - prevT) / 1000, 0.1); prevT = t;
  if (spinP && $('spin').checked && (view3d === 'mesh' || view3d === 'kit')) { phi += dt * 0.5; setPhase(); dirty = true; }
  controls.update();
  if (dirty) { renderer.render(scene, camera); dirty = false; }
});
for (const r of document.querySelectorAll('input[name=view]')) r.addEventListener('change', () => setView(r.value));

// ------------------------------------------------------------------ build nel worker
let worker = null, spare = null, reqId = 0, buildTimer = 0;
function makeWorker() {
  const w = new Worker('./worker.js', { type: 'module' });
  w.onmessage = (ev) => { w.terminate(); if (w === worker) worker = null; onResult(ev.data); };
  w.onerror = (e) => { if (w !== worker) return; setStatus('Errore nel generatore: ' + (e.message || 'sconosciuto'), true); busy(false); };
  return w;
}
function takeWorker() { if (worker) worker.terminate(); worker = spare || makeWorker(); spare = makeWorker(); return worker; }

function scheduleBuild() { clearTimeout(buildTimer); buildTimer = setTimeout(doBuild, 600); }

function doBuild() {
  const { W, H, sx, sy } = maskSize();
  const data = maskCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  const alpha = new Uint8Array(W * H);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
  const id = ++reqId;
  const w = takeWorker();
  busy(true);
  setStatus('Genero i rulli…');
  w.postMessage({ id, alpha, W, H, sx, sy, params: readParams() }, [alpha.buffer]);
}

// portarulli: worker a parte, ricostruito solo quando cambia la manovella
let kitWorker = null, kitReq = 0, kitTimer = 0;
function requestKit() {
  clearTimeout(kitTimer);
  kitTimer = setTimeout(() => {
    if (kitWorker) kitWorker.terminate();
    const id = ++kitReq;
    const w = kitWorker = new Worker('./worker.js', { type: 'module' });
    w.onmessage = ({ data }) => {
      w.terminate(); if (w === kitWorker) kitWorker = null;
      if (data.id !== kitReq) return;
      if (!data.ok) { setStatus('Errore nel portarulli: ' + data.error, true); return; }
      lastKit = data;
      buildKitScene();
      renderKitDownloads();
      $('dlKit').disabled = false;
      $('dlAll').disabled = !lastResult;
      if (view3d === 'kit') fit();
    };
    w.postMessage({ id, kind: 'kit', params: { crankLen: clampNum($('crankLen').value, 35, 90, 55) } });
  }, 250);
}
$('crankLen').addEventListener('input', () => { store.set('crankLen', $('crankLen').value); requestKit(); });

function onResult(data) {
  if (data.id !== reqId) return;
  busy(false);
  if (!data.ok) { setStatus('Errore: ' + data.error, true); return; }
  showResult(data);
  renderInfo(data);
  $('warnings').innerHTML = data.warnings.map((x) => `<li>${escapeHtml(x)}</li>`).join('');
  for (const b of ['dl3mf', 'dl3mfTop', 'dlPos', 'dlNeg']) $(b).disabled = false;
  $('dlAll').disabled = !lastKit;
  setStatus(`Pronto · ${fmt(data.ms / 1000)} s`);
}

function busy(on) { $('busy').classList.toggle('on', on); }
function setStatus(msg, err = false) { const s = $('status'); s.textContent = msg; s.classList.toggle('err', err); }

function renderInfo(r) {
  const i = r.info;
  const rows = [
    ['Positivo', `Ø ${fmt(2 * (R + i.relief))} × 60 mm, rilievo ${fmt(i.relief)}`],
    ['Negativo', `Ø 30 × 60 mm, incavo ${fmt(i.relief)}, gioco ${fmt(i.clearance, 2)}`],
    ['Superficie in rilievo', `${Math.round(i.coverage * 100)}% della fascia`],
    ['Triangoli', `${Math.round(i.triangles / 1000)} mila`],
  ];
  $('info').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

$('settings').innerHTML = `<tr><th>Pezzo</th><th>Pareti</th><th>Layer</th><th>Il resto</th></tr><tr><td>Rulli (×2)</td><td>${PRINT.walls}</td><td>${fmt(PRINT.layer, 2)}</td><td>profilo standard</td></tr>`;

// ------------------------------------------------------------------ download
function download(bytes, name, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function slug() {
  const t = els.find((e) => e.type === 'text' && e.visible)?.text || 'rulli';
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'rulli';
}
$('dl3mfTop').addEventListener('click', () => $('dl3mf').click());
// schede del pannello
for (const t of document.querySelectorAll('[data-tab]')) {
  t.addEventListener('click', () => {
    for (const x of document.querySelectorAll('[data-tab]')) x.setAttribute('aria-selected', String(x === t));
    for (const p of document.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== t.dataset.tab;
  });
}
$('dl3mf').addEventListener('click', () => {
  const r = lastResult;
  const settings = bambuObjectSettings(PRINT);
  download(to3MF([
    { name: 'Rullo positivo', mesh: r.positive, offset: [-22, 0], settings },
    { name: 'Rullo negativo', mesh: r.negative, offset: [22, 0], settings },
  ], { title: `Rulli embosser ${slug()}` }), `rulli-embosser-${slug()}.3mf`, 'model/3mf');
});
// ---- download del portarulli
const KIT_PARTS = {
  body: { label: 'Scocca', file: 'scocca' },
  lid: { label: 'Coperchio', file: 'coperchio' },
  gearA1: { label: 'Ingranaggio A ▲', file: 'ingranaggio-A', note: '×2' },
  gearA2: { label: 'Ingranaggio A ▲', file: 'ingranaggio-A', hideStl: true },
  gearB: { label: 'Ingranaggio B ▬ foro tondo', file: 'ingranaggio-B-foro-tondo' },
  gearBk: { label: 'Ingranaggio B ▬ foro quadro', file: 'ingranaggio-B-foro-quadro' },
  crank: { label: 'Manovella', file: 'manovella' },
  grip: { label: 'Impugnatura', file: 'impugnatura' },
};
const LICENSE_META = {
  License: 'BY-NC-SA',
  Designer: 'Rulli Embosser (ricostruzione del Business Card Embosser di MakerSpace.Online)',
  Description: 'Portarulli ricostruito dal Business Card Embosser di MakerSpace.Online (makerworld.com/it/models/148536), licenza CC BY-NC-SA 4.0. Uso non commerciale.',
};
function renderKitDownloads() {
  const box = $('dlKitParts');
  box.innerHTML = '';
  for (const [k, p] of Object.entries(KIT_PARTS)) {
    if (p.hideStl) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `${p.label}${p.note ? ` <small>${p.note}</small>` : ''}`;
    b.onclick = () => download(toSTL(lastKit.print[k]), `portarulli-${p.file}.stl`, 'model/stl');
    box.appendChild(b);
  }
}
// pezzi in file sul piatto (256×256), centrati: larghezze vere dai vertici
function meshSpan(m) {
  const V = m.vertProperties; let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < V.length; i += 3) { if (V[i] < x0) x0 = V[i]; if (V[i] > x1) x1 = V[i]; if (V[i + 1] < y0) y0 = V[i + 1]; if (V[i + 1] > y1) y1 = V[i + 1]; }
  return { x0, x1, y0, y1 };
}
function plateLayout(list, maxW = 235, gap = 7) {
  const rows = [[]]; let w = 0;
  for (const it of list) {
    const s = meshSpan(it.mesh), iw = s.x1 - s.x0;
    if (w > 0 && w + gap + iw > maxW) { rows.push([]); w = 0; }
    rows[rows.length - 1].push({ it, s });
    w += (w > 0 ? gap : 0) + iw;
  }
  const rowH = rows.map((r) => Math.max(...r.map(({ s }) => s.y1 - s.y0)));
  const totalH = rowH.reduce((a, b) => a + b, 0) + gap * (rows.length - 1);
  let y = totalH / 2;
  rows.forEach((r, i) => {
    const rw = r.reduce((a, { s }) => a + (s.x1 - s.x0), 0) + gap * (r.length - 1);
    let x = -rw / 2;
    const cy = y - rowH[i] / 2;
    for (const { it, s } of r) { it.offset = [x - s.x0, cy - (s.y0 + s.y1) / 2]; x += s.x1 - s.x0 + gap; }
    y -= rowH[i] + gap;
  });
  return list;
}
function kitObjects() {
  const settings = bambuObjectSettings(PRINT);
  return Object.entries(KIT_PARTS).map(([k, p]) => ({ name: p.label.replace(/[▲▬]\s?/g, '').trim(), mesh: lastKit.print[k], settings }));
}
$('dlKit').addEventListener('click', () => {
  download(to3MF(plateLayout(kitObjects()), { title: 'Portarulli embosser', meta: LICENSE_META }), 'portarulli-embosser.3mf', 'model/3mf');
});
$('dlAll').addEventListener('click', () => {
  const settings = bambuObjectSettings(PRINT);
  const list = [...kitObjects(),
    { name: 'Rullo positivo', mesh: lastResult.positive, settings },
    { name: 'Rullo negativo', mesh: lastResult.negative, settings }];
  download(to3MF(plateLayout(list), { title: `Embosser completo ${slug()}`, meta: LICENSE_META }), `embosser-completo-${slug()}.3mf`, 'model/3mf');
});
$('dlPos').addEventListener('click', () => download(toSTL(lastResult.positive), `rullo-positivo-${slug()}.stl`, 'model/stl'));
$('dlNeg').addEventListener('click', () => download(toSTL(lastResult.negative), `rullo-negativo-${slug()}.stl`, 'model/stl'));

// ------------------------------------------------------------------ ciclo modifiche
let busyAssets = 0;
async function changed() {
  save();
  const n = ++busyAssets;
  await ensureAssets();
  if (n !== busyAssets) return; // arrivata nel frattempo un'altra modifica
  renderAll();
  scheduleBuild();
}
for (const id of ['relief', 'clearance', 'mark']) $(id).addEventListener(id === 'mark' ? 'change' : 'input', () => { save(); scheduleBuild(); });

// ------------------------------------------------------------------ avvio
window.__emb = { get els() { return els; }, renderDesign, camera, controls, fit, maskCanvas, changed, scene, THREE, boundsOf: (e) => bounds(maskCanvas.getContext('2d'), e) }; // per test e debug
const saved = store.get('design', null);
loadDesign(Array.isArray(saved) && saved.length ? saved : defaultDesign(), store.get('params', null));
setView('mesh');
$('crankLen').value = store.get('crankLen', 55);
requestKit();
{
  const l = store.get('look', 'relief');
  const r = document.querySelector(`input[name=look][value="${l}"]`);
  if (r) r.checked = true;
  $('lookHint').textContent = LOOK_HINT[look()];
}
setStatus('Carico i font…');
changed();
// i font possono finire di caricarsi dopo il primo disegno: ridisegno quando sono pronti
document.fonts.addEventListener('loadingdone', () => renderAll());
