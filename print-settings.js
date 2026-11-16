// Impostazioni di stampa dei rulli: unica fonte per la tabella nella pagina e per il 3MF
// (Metadata/model_settings.config, letto da Bambu Studio e OrcaSlicer anche nei 3MF non loro).
// Si scrivono solo i valori diversi dal profilo standard: il resto lo decide il profilo della stampante.

export const PRINT = { walls: 3, layer: 0.2, placement: 'in piedi, tacca in alto' };

export function bambuObjectSettings(s) {
  return {
    layer_height: String(s.layer),
    wall_loops: String(s.walls),
  };
}
