// Préférences utilisateur persistées (localStorage). Pour l'instant limité à la
// qualité d'import des PDF (rendu pdfjs → PNG) ; s'étendra si d'autres préférences
// durables s'ajoutent. Cinq paliers : low ×2, medium ×4, high ×8 (défaut), ultra ×12,
// max ×16. Les deux derniers augmentent fortement la mémoire de rendu (jusqu'à
// ~512 Mo de canvas par page en ×16) → le pool de workers est plafonné en
// conséquence (voir renderPoolSize) pour éviter l'OOM. Baissable pour les machines
// lentes, augmentable pour les parties haute qualité / zoom sur Retina.
const IMPORT_QUALITY_KEY = 'scoreparts.importQuality';
const VALID_QUALITIES = ['low', 'medium', 'high', 'ultra', 'max'];
const DEFAULT_IMPORT_QUALITY = 'high';

export function getImportQuality() {
  const stored = localStorage.getItem(IMPORT_QUALITY_KEY);
  return VALID_QUALITIES.indexOf(stored) !== -1 ? stored : DEFAULT_IMPORT_QUALITY;
}

export function setImportQuality(quality) {
  if (VALID_QUALITIES.indexOf(quality) === -1) return;
  localStorage.setItem(IMPORT_QUALITY_KEY, quality);
}
