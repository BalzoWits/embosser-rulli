// Dizionario inglese per i18n.js. Le chiavi sono il testo italiano della pagina (spazi normalizzati).
// TEXT: testo semplice; HTML: innerHTML di elementi con grassetti/link/codice; PATTERNS: testi con numeri.
import { t } from './i18n.js';

const MW_IT = '<a href="https://makerworld.com/it/models/148536" target="_blank" rel="noopener">';
const MW_EN = '<a href="https://makerworld.com/en/models/148536" target="_blank" rel="noopener">';
const dot = (s) => s.replace(',', '.');

export const TEXT = {
  // ---- intestazione e schede
  'Rulli Embosser': 'Embosser Rollers',
  'per il Business Card Embosser': 'for the Business Card Embosser',
  'Disegna i rulli personalizzati per il Business Card Embosser e scaricali pronti da stampare in 3D.':
    'Design custom rollers for the Business Card Embosser and download them ready to 3D print.',
  'Caricamento…': 'Loading…',
  'Scarica i rulli (.3mf)': 'Download rollers (.3mf)',
  'Disegno': 'Design',
  'Rulli e stampa': 'Rollers & print',
  'Portarulli': 'Holder',

  // ---- scheda Disegno
  '+ Testo': '+ Text',
  '+ Motivo': '+ Pattern',
  '+ Immagine': '+ Image',
  '+ Cornice': '+ Border',
  'Elementi del disegno': 'Design elements',
  'Più in alto nella lista = sta sopra. "Sottrai" buca gli elementi sotto (es. un nome scavato in un motivo).':
    'Higher in the list = on top. "Cut out" punches through the elements below (e.g. a name carved into a pattern).',

  // ---- scheda Rulli e stampa
  'Rulli': 'Rollers',
  'Rilievo': 'Relief',
  'Gioco per lato': 'Clearance per side',
  'Tacca di fase sulla faccia superiore': 'Timing notch on the top face',
  'Valori degli originali: rilievo 1,2 mm, gioco 0,2 mm. Con cartoncino spesso (oltre 350 g) prova un gioco di 0,25–0,3.':
    'Original values: relief 1.2 mm, clearance 0.2 mm. For thick card stock (over 350 gsm) try a clearance of 0.25–0.3.',
  'Scarica': 'Download',
  'Coppia di rulli (.3mf)': 'Roller pair (.3mf)',
  'Positivo': 'Positive',
  'Negativo': 'Negative',
  'Salva disegno': 'Save design',
  'Apri un disegno salvato (.json)': 'Open a saved design (.json)',
  'Stampa e montaggio': 'Printing and assembly',
  'Prova su un foglio di carta: se il segno esce doppio o schiacciato su un lato, sfila un ingranaggio e spostalo di un dente.':
    'Test on a sheet of paper: if the impression comes out doubled or squashed on one side, pull off a gear and move it by one tooth.',
  'Il biglietto va fatto passare dal lato del tratteggio: le tacche affacciate indicano la cucitura del rullo (i bordi destro e sinistro della fascia).':
    'Feed the card in on the dashed-outline side: the facing notches mark the roller seam (the right and left edges of the strip).',

  // ---- scheda Portarulli
  'Scocca, coperchio a scatto, quattro ingranaggi e una manovella lunga che si sfila quando non serve. Tutto si monta a incastro, senza viti né colla, e si stampa senza supporti.':
    'Body, snap-on lid, four gears and a long crank that pulls out when not in use. Everything fits together without screws or glue, and prints without supports.',
  'Lunghezza della manovella': 'Crank length',
  'Portarulli (.3mf)': 'Holder (.3mf)',
  'Tutto: portarulli + rulli (.3mf)': 'Everything: holder + rollers (.3mf)',
  'Oppure i singoli pezzi in STL:': 'Or the individual parts as STL:',
  'Nel .3mf: 3 pareti e layer 0,2 per tutti i pezzi, il resto dal profilo standard della stampante.':
    'In the .3mf: 3 walls and 0.2 mm layers for every part; everything else comes from the printer\'s standard profile.',
  'Montaggio': 'Assembly',
  'Sopra: l\'altro ingranaggio col triangolo sul rullo di sinistra, quello con la barretta e il foro quadro sul rullo di destra, sempre con i segni affacciati.':
    'On top: the other triangle gear on the left roller, the bar gear with the square hole on the right roller, again with the marks facing each other.',
  'Coperchio: il foro va sopra il rullo di destra. Spingi finché scatta.':
    'Lid: the hole goes over the right-hand roller. Press until it clicks.',
  'Infila la manovella nel foro e l\'impugnatura nel braccio (scatta). Gira nel verso della freccia: il biglietto entra dal davanti ed esce dietro.':
    'Insert the crank into the hole and the handle into the arm (it clicks). Turn in the direction of the arrow: the card goes in at the front and comes out at the back.',
  'Un velo di grasso o vaselina sugli ingranaggi rende tutto più morbido.':
    'A thin film of grease or petroleum jelly on the gears makes everything run smoother.',

  // ---- editor e anteprime
  'Fascia del rullo srotolata': 'Unrolled roller strip',
  '94,2 × 57 mm · clic per selezionare, trascina per spostare': '94.2 × 57 mm · click to select, drag to move',
  'Vista dell\'editor': 'Editor view',
  'Retro del foglio': 'Back of the sheet',
  'biglietto 85 × 55': 'card 85 × 55',
  'cucitura del rullo (i due bordi si toccano)': 'roller seam (the two edges meet)',
  'Editor della fascia del rullo': 'Roller strip editor',
  'Rulli 3D': '3D rollers',
  'Vista': 'View',
  'In presa': 'Meshing',
  'Piatto': 'Print bed',
  'Montato': 'Assembled',
  'Coperchio': 'Lid',
  'Gira': 'Spin',
  'Genero i rulli…': 'Building the rollers…',
  'tacca': 'notch',
  'luce radente: così appare il biglietto dal lato in rilievo': 'raking light: the card as seen from the raised side',
  'retro del foglio (specchiato, solo da guardare)': 'back of the sheet (mirrored, view only)',

  // ---- tipi di elemento e lista livelli
  'Testo': 'Text',
  'Motivo': 'Pattern',
  'Immagine': 'Image',
  'Cornice': 'Border',
  'Testo vuoto': 'Empty text',
  '(motivo)': '(pattern)',
  'Nessun elemento: aggiungine uno.': 'No elements yet: add one.',
  'sottrai': 'cut',
  'Nascondi': 'Hide',
  'Mostra': 'Show',
  'Porta sopra': 'Move up',
  'Porta sotto': 'Move down',
  'Duplica': 'Duplicate',
  'Elimina': 'Delete',

  // ---- testi del disegno di partenza
  'Il tuo nome': 'Your name',
  'STUDIO GRAFICO': 'DESIGN STUDIO',

  // ---- pannello delle proprietà
  'Sulla fascia: trascina per spostare, angoli per ingrandire, pallino per ruotare. Si aggancia alle guide: tieni Alt per muoverlo libero.':
    'On the strip: drag to move, corners to resize, round handle to rotate. It snaps to guides: hold Alt to move it freely.',
  'Sulla fascia: trascina per spostare, angoli per cambiare le misure. Tieni Alt per non agganciarti alle guide.':
    'On the strip: drag to move, corners to resize. Hold Alt to avoid snapping to guides.',
  'Effetto': 'Effect',
  'In rilievo': 'Raised',
  'Sottrai': 'Cut out',
  'Disposizione': 'Layout',
  'Singolo': 'Single',
  'Ripeti a motivo': 'Repeat as pattern',
  'Tutta la fascia': 'Whole strip',
  'Solo il biglietto': 'Card only',
  'Riquadro': 'Box',
  'Passo orizzontale': 'Horizontal spacing',
  'Passo verticale': 'Vertical spacing',
  'Dove': 'Area',
  'File sfalsate': 'Staggered rows',
  'Alternanza': 'Alternation',
  'Variazioni casuali': 'Random variation',
  'Rotazione ±': 'Rotation ±',
  'Dimensione ±': 'Size ±',
  'Variante (cambia il caso)': 'Variant (reshuffle)',
  'Posizione e copie sul giro': 'Position and copies around the roller',
  'Orizzontale': 'Horizontal',
  'Verticale': 'Vertical',
  'Copie sul giro': 'Copies around the roller',
  'Centra in orizzontale': 'Center horizontally',
  'Centra in verticale': 'Center vertically',
  'Rotazione': 'Rotation',
  '° (pallino sopra la selezione)': '° (round handle above the selection)',
  'Rotazione in gradi': 'Rotation in degrees',
  'Testo (Invio per andare a capo)': 'Text (Enter for a new line)',
  'Font': 'Font',
  'Carica un font (TTF, OTF, WOFF)…': 'Upload a font (TTF, OTF, WOFF)…',
  'Altezza maiuscole': 'Cap height',
  'Spaziatura lettere': 'Letter spacing',
  'Stile e righe': 'Style and lines',
  'Stile': 'Style',
  'Pieno': 'Filled',
  'Solo contorno': 'Outline only',
  'Spessore contorno': 'Outline width',
  'Allineamento righe': 'Line alignment',
  'Sinistra': 'Left',
  'Centro': 'Center',
  'Destra': 'Right',
  'Interlinea': 'Line spacing',
  'Passo': 'Spacing',
  'Spessore / dimensione': 'Thickness / size',
  'Angolo': 'Angle',
  'Variante casuale': 'Random variant',
  'File': 'File',
  'Cambia immagine…': 'Change image…',
  'Scegli immagine…': 'Choose image…',
  'nessun file': 'no file',
  'PNG, JPG o SVG. Va bene un logo nero su bianco: si può anche trascinare il file sulla fascia.':
    'PNG, JPG or SVG. A black logo on white works well; you can also drop the file onto the strip.',
  'Soglia (più alta = più scuri inclusi)': 'Threshold (higher = more dark tones included)',
  'Larghezza': 'Width',
  'Inverti chiari/scuri': 'Invert light/dark',
  'Linea': 'Line',
  'Doppia': 'Double',
  'Tratteggio': 'Dashed',
  'Solo angoli': 'Corners only',
  'Raggio angoli': 'Corner radius',
  'Spessore': 'Thickness',
  'Posizione e misure': 'Position and size',
  'Alto': 'Top',
  'Altezza': 'Height',

  // ---- motivi, alternanze, font
  'Pois': 'Polka dots',
  'Righe': 'Stripes',
  'Griglia': 'Grid',
  'Scacchiera': 'Checkerboard',
  'Nido d\'ape': 'Honeycomb',
  'Onde': 'Waves',
  'Zigzag': 'Zigzag',
  'Scaglie': 'Scales',
  'Coriandoli': 'Confetti',
  'Tutte uguali': 'All the same',
  'File alterne capovolte': 'Alternate rows upside down',
  'Copie alterne specchiate': 'Alternate copies mirrored',
  'Copie alterne ruotate 90°': 'Alternate copies rotated 90°',
  'A scacchiera (una sì, una no)': 'Checkerboard (every other one)',
  'Playfair Display (serif elegante)': 'Playfair Display (elegant serif)',
  'Montserrat Regular (sottile)': 'Montserrat Regular (light)',
  'Cinzel (capitali romane)': 'Cinzel (Roman capitals)',
  'Oswald Bold (stretto)': 'Oswald Bold (condensed)',
  'Bebas Neue (alto)': 'Bebas Neue (tall)',
  'Great Vibes (corsivo)': 'Great Vibes (script)',
  'Pacifico (corsivo tondo)': 'Pacifico (rounded script)',

  // ---- informazioni, tabella di stampa, pezzi del portarulli
  'Superficie in rilievo': 'Raised area',
  'Triangoli': 'Triangles',
  'Pezzo': 'Part',
  'Pareti': 'Walls',
  'Layer': 'Layer',
  'Il resto': 'Everything else',
  'Rulli (×2)': 'Rollers (×2)',
  'profilo standard': 'standard profile',
  'Scocca': 'Body',
  'Ingranaggio A ▲': 'Gear A ▲',
  'Ingranaggio B ▬ foro tondo': 'Gear B ▬ round hole',
  'Ingranaggio B ▬ foro quadro': 'Gear B ▬ square hole',
  'Manovella': 'Crank',
  'Impugnatura': 'Handle',
  'Ingranaggio B ▬ foro esagonale': 'Gear B ▬ hex hole',
  'Mozzo': 'Hub',
  'Rullo positivo': 'Positive roller',
  'Rullo negativo': 'Negative roller',
  'Entrambi': 'Both',
  'Tutto': 'Everything',
  'tutti gli STL .zip': 'all STLs .zip',
  'I file contengono solo la geometria, già orientata per la stampa senza supporti: impostazioni libere nello slicer (consigliati 3 pareti e layer 0,2). I nomi dei file seguono l\'ordine di montaggio.':
    'The files contain geometry only, already oriented to print without supports: choose your own slicer settings (3 walls and 0.2 mm layers suggested). File names follow the assembly order.',
  'Sopra: l\'altro ingranaggio col triangolo sul rullo di sinistra, quello con la barretta e il foro esagonale sul rullo di destra, sempre con i segni affacciati.':
    'On top: the other triangle gear on the left roller, the bar gear with the hex hole on the right roller, again with the marks facing each other.',

  // ---- stato, avvisi, errori
  'Carico i font…': 'Loading fonts…',
  'Il disegno è vuoto: i rulli escono lisci.': 'The design is empty: the rollers will come out smooth.',
  'file non riconosciuto': 'unrecognized file',
  'immagine non leggibile': 'unreadable image',
  'sconosciuto': 'unknown',
};

export const HTML = {
  // Rulli e stampa: istruzioni
  'Stampa i due rulli <b>in piedi, con la tacca in alto</b>, senza supporti, in PLA. Consigliati 3 pareti e layer 0,2. I file (.3mf e STL) contengono solo la geometria: le impostazioni le scegli tu nello slicer.':
    'Print both rollers <b>standing up, notch on top</b>, without supports, in PLA. Suggested: 3 walls and 0.2 mm layers. The files (.3mf and STL) contain geometry only: you choose the settings in your slicer.',
  'Entrambi <small>STL .zip</small>': 'Both <small>STL .zip</small>',
  'Portarulli <small>tutti gli STL .zip</small>': 'Holder <small>all STLs .zip</small>',
  'Tutto <small>STL .zip</small>': 'Everything <small>STL .zip</small>',
  // Portarulli: montaggio (mozzo e manovella)
  'Infila il <b>mozzo</b> nell\'esagono dell\'ingranaggio di destra, poi il coperchio: il cono del mozzo entra nel foro da sotto e resta imprigionato. Spingi finché il coperchio scatta.':
    'Fit the <b>hub</b> into the hex of the right gear, then the lid: the hub\'s cone enters the hole from below and stays captured. Press until the lid snaps.',
  'Infila l\'impugnatura nel braccio (scatta). Appoggia la manovella sul mozzo con i <b>tre denti nelle fessure</b>, spingila giù e <b>girala nel verso della freccia</b> finché si ferma: resta agganciata. Per toglierla girala un po\' indietro e sollevala. Il biglietto entra dal lato con la scritta <b>INSERT HERE</b> ed esce dietro.':
    'Snap the grip into the arm. Set the crank on the hub with the <b>three teeth in the slots</b>, push it down and <b>turn it in the direction of the arrow</b> until it stops: it stays locked. To remove it, turn it back a little and lift it. The card goes in on the side marked <b>INSERT HERE</b> and comes out the back.',
  'Stampa i due rulli <b>in piedi, con la tacca in alto</b>, senza supporti, in PLA. Il .3mf imposta 3 pareti e layer 0,2; tutto il resto resta quello del profilo standard della tua stampante.':
    'Print both rollers <b>standing up, notch on top</b>, without supports, in PLA. The .3mf sets 3 walls and 0.2 mm layers; everything else stays as in your printer\'s standard profile.',
  'Vanno sia nel modello originale sia nel portarulli della scheda <b>Portarulli</b> (lì la messa in fase è guidata dai segni: vedi il montaggio).':
    'They fit both the original model and the holder in the <b>Holder</b> tab (there the timing is guided by marks: see the assembly steps).',
  'Monta i rulli <b>con le tacche dallo stesso lato</b> e innesta gli ingranaggi in modo che, girando, le due tacche si trovino <b>una di fronte all\'altra</b>.':
    'Mount the rollers <b>with the notches on the same side</b> and fit the gears so that, as they turn, the two notches end up <b>facing each other</b>.',
  // crediti
  [`Scocca, ingranaggi e manopola: ${MW_IT}Business Card Embosser di MakerSpace.Online</a> su MakerWorld. Questi rulli sono un progetto indipendente con le stesse misure di innesto (Ø30 × 60, incastro quadro 12 mm).`]:
    `Body, gears and knob: ${MW_EN}Business Card Embosser by MakerSpace.Online</a> on MakerWorld. These rollers are an independent design with the same mounting dimensions (Ø30 × 60, 12 mm square socket).`,
  'Font: SIL Open Font License (cartella <code>fonts/licenses</code>). Librerie: manifold-3d, three.js.':
    'Fonts: SIL Open Font License (folder <code>fonts/licenses</code>). Libraries: manifold-3d, three.js.',
  // Portarulli: montaggio
  'Guarda la scocca dal davanti (la feritoia stretta): il lato <b>A</b> è a sinistra, il lato <b>B</b> a destra.':
    'Look at the body from the front (the narrow slot): side <b>A</b> is on the left, side <b>B</b> on the right.',
  'Ingranaggio con il <b>triangolo ▲</b> sul perno di sinistra, quello con la <b>barretta ▬</b> e il foro tondo sul perno di destra, <b>segni rivolti l\'uno verso l\'altro</b>.':
    'Gear with the <b>triangle ▲</b> on the left pin, the one with the <b>bar ▬</b> and the round hole on the right pin, <b>marks facing each other</b>.',
  'Rullo <b>positivo a sinistra</b>, negativo a destra, con le <b>tacche in alto e rivolte l\'una verso l\'altra</b>: infilali sui perni quadri.':
    '<b>Positive roller on the left</b>, negative on the right, with the <b>notches on top and facing each other</b>: slide them onto the square pins.',
  [`Il portarulli è disegnato da zero ed è compatibile con il ${MW_IT}Business Card Embosser di MakerSpace.Online</a>: stesse misure di incastro, così i pezzi si possono mescolare con quelli originali.`]:
    `The holder is designed from scratch and is compatible with the ${MW_EN}Business Card Embosser by MakerSpace.Online</a>: same fitting dimensions, so parts can be mixed with the original ones.`,
};

// [RegExp ancorata, sostituzione]: i numeri arrivano con la virgola (italiano) o col punto (inglese)
const N = '([\\d.,]+)';
const re = (s) => new RegExp(`^${s}$`);
export const PATTERNS = [
  // stato ed errori (il messaggio interno si traduce a sua volta, se lo conosciamo)
  [re(`Pronto · ${N} s`), (_, s) => `Ready · ${dot(s)} s`],
  [/^Errore nel generatore: (.*)$/, (_, m) => `Generator error: ${t(m)}`],
  [/^Errore nel portarulli: (.*)$/, (_, m) => `Holder error: ${t(m)}`],
  [/^Errore: (.*)$/, (_, m) => `Error: ${t(m)}`],
  [/^Font non leggibile: (.*)$/, (_, m) => `Unreadable font: ${t(m)}`],
  [/^Disegno non leggibile: (.*)$/, (_, m) => `Unreadable design: ${t(m)}`],
  [/^Geometria non valida: rullo (positivo|negativo) \((.*)\)$/, (_, r, s) => `Invalid geometry: ${r === 'positivo' ? 'positive' : 'negative'} roller (${s})`],
  [/^Geometria non valida: (.*)$/, 'Invalid geometry: $1'],
  [/^tipo sconosciuto (.*)$/, 'unknown type $1'],
  [/^Caricato: (.*)$/, 'Uploaded: $1'],
  // avvisi dei rulli
  [re(`Circa il (\\d+)% del disegno ha tratti più sottili di ${N} mm: sulla carta si vedranno poco\\. Ingrandisci o ispessisci quelle parti\\.`),
    (_, p, mm) => `About ${p}% of the design has strokes thinner than ${dot(mm)} mm: they will barely show on paper. Enlarge or thicken those parts.`],
  [re(`Nel rullo negativo ci sono pareti più sottili di ${N} mm tra un incavo e l'altro \\(${N} mm²\\): elementi troppo vicini, distanziali un po'\\.`),
    (_, mm, a) => `The negative roller has walls thinner than ${dot(mm)} mm between recesses (${a} mm²): elements are too close, space them out a little.`],
  [re(`Il disegno copre il (\\d+)% della fascia: con tanta superficie in rilievo serve molta forza per girare la manovella\\.`),
    '$1% of the strip is raised: with that much relief it takes a lot of force to turn the crank.'],
  // informazioni sui rulli
  [re(`Ø ${N} × 60 mm, rilievo ${N}`), (_, d, r) => `Ø ${dot(d)} × 60 mm, relief ${dot(r)}`],
  [re(`Ø 30 × 60 mm, incavo ${N}, gioco ${N}`), (_, r, g) => `Ø 30 × 60 mm, recess ${dot(r)}, clearance ${dot(g)}`],
  [/^(\d+)% della fascia$/, '$1% of the strip'],
  [/^(\d+) mila$/, '$1k'],
  // etichette sull'editor durante il trascinamento
  [re(`altezza lettere ${N} mm`), (_, n) => `cap height ${dot(n)} mm`],
  [re(`larghezza ${N} mm`), (_, n) => `width ${dot(n)} mm`],
];
