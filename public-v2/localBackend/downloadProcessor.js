// Téléchargement PDF + ZIP côté client (PWA).
// Remplace : écriture fichier serveur + window.open(url) → Blob / objectURL.
//            zip-dir (Node) → fflate.zipSync (browser, pur JS).
// Aucune route serveur : les Uint8Array PDF produits par le Worker sont
// empaquetés et téléchargés entièrement dans le navigateur.
import { zipSync } from 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/+esm';

// Déclenche le téléchargement d'octets via un lien Blob (équivalent client de
// res.sendFile / window.open('/data/...')).
export function downloadBytes(bytes, fileName, mimeType) {
  const blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
  return url;
}

export function downloadPdf(pdfBytes, fileName) {
  return downloadBytes(pdfBytes, fileName, 'application/pdf');
}

// files = { "Violon_I.pdf": Uint8Array, ... } → Uint8Array du ZIP.
// Remplace scoreSplitter.createZip (zip-dir + fs.writeFileSync).
// level 0 : les PDF sont déjà compressés (images PNG) → pas de gain à recompresser.
export function zipPdfs(files) {
  return zipSync(files, { level: 0 });
}

export function downloadZip(files, zipName) {
  const zipBytes = zipPdfs(files);
  downloadBytes(zipBytes, zipName, 'application/zip');
  return zipBytes;
}
