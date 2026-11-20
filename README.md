# Rulli Embosser

Pagina statica che genera nel browser una coppia di rulli personalizzati (positivo + negativo) per il
[Business Card Embosser](https://makerworld.com/it/models/148536) di MakerSpace.Online.
Scocca, ingranaggi e manopola restano quelli originali: qui si fanno solo i rulli.

Si disegna sulla fascia del rullo srotolata (testo, motivi ripetuti, immagini, cornici, anche in
sottrazione; testi e loghi si possono anche ripetere a motivo). Sulla fascia: trascina per spostare,
angoli per ingrandire o cambiare le misure, pallino per ruotare (si aggancia ogni 15°, Maiusc forza),
frecce per spostare di 0,5 mm (Maiusc 2 mm), Canc per eliminare, doppio clic per modificare il testo.
Guide magnetiche: bordi, centro e margine di 4 mm del biglietto, bordi e centri degli altri elementi
(Alt le disattiva). Durante il trascinamento un'etichetta mostra posizione, misure o gradi.
L'editor mostra di default la resa in rilievo (luce radente, `emboss.js`); c'è anche la vista piatta e
il retro del foglio. A motivo: passo, file sfalsate, alternanze (capovolte, specchiate, 90°, scacchiera),
rotazione e dimensione casuali.
Poi si vede l'anteprima del biglietto in rilievo e il 3D, e si scarica un .3mf (solo geometria, nessuna
impostazione di stampa) oppure gli STL, singoli o tutti in uno zip.

## Portarulli (scheda "Portarulli")

`kit.js` genera anche il resto dell'embosser: scocca, coperchio a scatto, quattro ingranaggi e una
manovella estraibile con impugnatura girevole. È una ricostruzione con le stesse misure di incastro
dell'originale (perni con cono, ingranaggi 24 denti modulo 1,24, interasse 30,1, pila 3,3 + 10 + 60 + 10),
con alcune scelte diverse:

- fase esatta per costruzione: ingranaggi A (segno ▲) con un dente sul segno, B (segno ▬) con un vano;
  si montano con tutti i segni, tacche dei rulli comprese, rivolti verso l'altro rullo;
- coperchio con gonna esterna e dente a gradini che scatta in una scanalatura della scocca;
- perno quadro degli ingranaggi 11,8 come l'originale (con 11,4 il rullo aveva 0,3 mm di gioco per lato e i rulli si aprivano);
- asse alto del rullo B centrato come nell'originale: un mozzo imprigionato da sotto in una sede conica
  larga del coperchio (Ø24/27), innestato con un esagono da 12 nell'ingranaggio alto B. La prima versione
  teneva quell'asse solo con la manovella (gioco ~0,5 mm): sotto carico il rullo B si inclinava, i rulli si
  aprivano in alto e incidevano poco;
- manovella estraibile con aggancio a baionetta sul collare del mozzo: coppa con 3 denti che entrano dalle fessure e,
  girando di 40° nel verso della freccia, vanno sotto il bordo fino al fermo (prima un quadro da 6,1 che si rompeva,
  poi un esagono da 15,6 che si sfilava);
- scritta INSERT HERE incisa accanto alla feritoia d'ingresso; uscita larga 8 mm;
- nomi dei file numerati nell'ordine di montaggio, STL anche tutti in uno zip con il file della licenza;
- fondo della feritoia a 2,5 mm sopra la base dei rulli: il biglietto (55 mm) resta centrato sulla zona del disegno.

`node test/kit-test.mjs` controlla le compenetrazioni del montaggio (ingranaggi in presa che girano,
rulli e ingranaggi contro scocca e coperchio, chiave nella sede, aggancio del coperchio).

## Avvio in locale

Serve un server HTTP (i moduli JS e il worker non funzionano da `file://`):

```
python -m http.server 8766
```

poi apri http://127.0.0.1:8766/

## Misure prese dai rulli originali

| | |
|---|---|
| Cilindro | Ø30 × 60, smusso 0,6 alle estremità |
| Incastro | quadro 12×12 profondo 11 a entrambe le estremità, smusso 1 all'imbocco, lati paralleli a X/Y |
| Positivo | rilievo +1,2 (Ø32,4) |
| Negativo | incavo −1,2, pianta = positivo specchiato in angolo (θ → −θ) e allargato di ~0,2 per lato |
| Zona del disegno | z 1,5 … 58,5 (57 mm), circonferenza 94,25 mm (un giro copre un biglietto da 85) |
| Scocca | interasse 30,1 = diametro primitivo degli ingranaggi da 24 denti in presa diretta |

Il riferimento angolare (lati dell'incastro) è lo stesso degli originali, quindi i rulli si montano
come quelli. La tacca triangolare sulla faccia superiore (a θ = 0) aiuta a metterli in fase: le due
tacche devono trovarsi affacciate.

## File

- `design.js` — elementi del disegno e loro resa su canvas (in mm); la maschera alfa è il rilievo
- `trace.js` — marching squares sulla maschera, fascia estesa oltre la cucitura
- `geometry.js` — costruzione dei rulli con manifold-3d (modulo puro, gira anche in node)
- `worker.js` — maschera → contorni → rulli, fuori dal thread della pagina
- `app.js` — interfaccia, editor, anteprima del biglietto, 3D, download
- `export.js` — STL binario, 3MF (solo geometria) e zip

## Test

```
node test/node-test.mjs                    # rulli da una maschera sintetica + interferenza in presa
node test/orig-test.mjs pos.stl neg.stl    # stessa misura di interferenza sui rulli originali
node test/profile.mjs mask.json            # tempi delle fasi su una maschera salvata dalla pagina
```

Interferenza in presa (volume comune mentre girano a 30,1 mm): rulli originali Zigzag 0,7 mm³ max,
Confetti 0,4; questi rulli ~0,25 con il gioco di default. Con lo specchio sbagliato sale a ~23 mm³.

## Licenze

Il portarulli (`kit.js`) è disegnato da zero: nessun file dell'originale è incluso o copiato, ne
riprende solo le misure di incastro per restare compatibile con il
[Business Card Embosser di MakerSpace.Online](https://makerworld.com/it/models/148536).
I file scaricati sono solo geometria, senza file di licenza né metadati di licenza.

Font: SIL Open Font License (`fonts/licenses`). manifold-3d: Apache 2.0, three.js: MIT (`lib/licenses`).
