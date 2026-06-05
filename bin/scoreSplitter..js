import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// PWA : tout le traitement (generatePart, zip, ET la conversion PDF→images) a
// migré côté client (public-v2/modules/pdfPipeline). GraphicsMagick/Ghostscript
// ne sont plus requis ; Jimp, PDFKit, async, zip-dir désinstallés. Ne reste ici
// que listScores — lecture des métadonnées (donnée conservée côté serveur).

var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);

var scoreSplitter = {
  sourcePdfsDir: '../data/pdf/',

  listScores: function (callback) {
    var scores = [];
    var pdfsDir = path.resolve(__dirname, scoreSplitter.sourcePdfsDir);
    var files = fs.readdirSync(pdfsDir, 'utf8');
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      var pdfExtIndex = files[fileIndex].toLowerCase().lastIndexOf('.pdf');
      if (pdfExtIndex === -1) continue;
      var pdfName = files[fileIndex].substring(0, pdfExtIndex);
      var infoPath = path.join(pdfsDir, pdfName + '.json');
      var info = null;
      try {
        info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
      } catch (e) {
        info = { pdfName, totalPages: null, category: null, composer: null, published: false };
      }
      scores.push(info);
    }
    return callback(null, scores);
  },
};

export default scoreSplitter;
