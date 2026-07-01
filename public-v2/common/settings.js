// Préférences utilisateur persistées (localStorage). Pour l'instant limité à la
// qualité d'import des PDF (rendu pdfjs → PNG) ; s'étendra si d'autres préférences
// durables s'ajoutent. Par défaut on importe en qualité max (high = ×8) ; un réglage
// plus bas (medium ×4 / low ×2) reste disponible pour les machines lentes.
const IMPORT_QUALITY_KEY = 'scoreparts.importQuality';
const VALID_QUALITIES = ['low', 'medium', 'high'];
const DEFAULT_IMPORT_QUALITY = 'high';

export function getImportQuality() {
  const stored = localStorage.getItem(IMPORT_QUALITY_KEY);
  return VALID_QUALITIES.indexOf(stored) !== -1 ? stored : DEFAULT_IMPORT_QUALITY;
}

export function setImportQuality(quality) {
  if (VALID_QUALITIES.indexOf(quality) === -1) return;
  localStorage.setItem(IMPORT_QUALITY_KEY, quality);
}
