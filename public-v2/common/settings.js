// Préférences utilisateur persistées (localStorage). Pour l'instant limité à la
// qualité d'import des PDF (rendu pdfjs → PNG) ; s'étendra si d'autres préférences
// durables s'ajoutent. Trois paliers : low ×2, medium ×4 (défaut), high ×8. medium
// donne une qualité très correcte tout en gardant le décodage des pages rapide à
// l'affichage ; high reste disponible pour plus de finesse (fluidifié par le
// préchargement du spread voisin, voir scoreParts.js). Les anciens paliers ultra ×12
// et max ×16 ont été retirés : ils produisaient des PNG si gros que leur décodage
// gelait l'UI à chaque changement de page.
const IMPORT_QUALITY_KEY = 'scoreparts.importQuality';
const VALID_QUALITIES = ['low', 'medium', 'high'];
const DEFAULT_IMPORT_QUALITY = 'medium';

export function getImportQuality() {
  const stored = localStorage.getItem(IMPORT_QUALITY_KEY);
  return VALID_QUALITIES.indexOf(stored) !== -1 ? stored : DEFAULT_IMPORT_QUALITY;
}

export function setImportQuality(quality) {
  if (VALID_QUALITIES.indexOf(quality) === -1) return;
  localStorage.setItem(IMPORT_QUALITY_KEY, quality);
}
