// Port browser de bin/scoreSplitter..js (pipeline generatePart) — preuve PWA.
//
// Différences vs serveur, toutes imposées par l'absence de Node :
//   - fs / path / chemins fichier   → les images de page arrivent en ArrayBuffer
//     dans `pageImageBuffers` (en prod : rendu pdfjs ; ici : fetch des PNG).
//   - lib `async` (waterfall/eachSeries) → réécrit en async/await natif.
//   - PDFKit (writePagesToPdf)      → remplacé par pdf-lib (assemblePdf), déjà
//     compatible browser. La sortie est un Uint8Array au lieu d'un fichier disque.
//
// cropImages / setTargetPages / blitImages gardent la MÊME logique de calcul que
// le serveur — c'est précisément ce que le POC doit prouver.
import { PDFDocument, StandardFonts } from 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm';
import * as JimpProxy from './jimpProcessor.js';

// --- Promisification des wrappers Jimp (API callback identique au serveur) ----
function cropAsync(inputBuffer, x, y, w, h) {
  return new Promise(function (resolve, reject) {
    JimpProxy.crop(inputBuffer, x, y, w, h, function (err, image) {
      if (err) return reject(err);
      resolve(image);
    });
  });
}

function createImageAsync(w, h) {
  return new Promise(function (resolve, reject) {
    JimpProxy.createImage(w, h, function (err, image) {
      if (err) return reject(err);
      resolve(image);
    });
  });
}

function blitImageAsync(toImage, bitmap, x, y) {
  return new Promise(function (resolve, reject) {
    JimpProxy.blitImage(toImage, bitmap, x, y, function (err, image) {
      if (err) return reject(err);
      resolve(image);
    });
  });
}

function getBufferAsync(image) {
  return new Promise(function (resolve, reject) {
    JimpProxy.getBuffer(image, function (err, buffer) {
      if (err) return reject(err);
      resolve(buffer);
    });
  });
}

var scoreSplitter = {
  pageWidth: 595,
  pageHeight: 842,
  scaleCorrection: 1,
  imageBackOffset: 20,
  leftMargin: 0,
  firstScaleY: 70,
  interScale: 10,

  // Découpe chaque zone dans l'image de sa page. Côté serveur l'image venait d'un
  // fichier PNG ; ici de pageImageBuffers[pageNum] (ArrayBuffer). Reste identique.
  cropImages: async function (pageImageBuffers, zones, margin, scaleH, scaleV) {
    var pageNums = Object.keys(zones);

    for (const pageNum of pageNums) {
      var pageZones = zones[pageNum];
      if (pageZones.length == 0) {
        continue;
      }

      var pageImageBuffer = pageImageBuffers[pageNum];
      if (!pageImageBuffer) {
        throw 'missing page image buffer for page ' + pageNum;
      }

      for (const zone of pageZones) {
        if (zone.x < 0 || zone.y < 0) {
          throw 'invalid zone coordinates: ' + JSON.stringify(zone);
        }
        var zoneImg = await cropAsync(
          pageImageBuffer,
          Math.round(zone.x / scaleH),
          Math.round(zone.y / scaleV),
          Math.round(zone.width / scaleH),
          Math.round(zone.height / scaleV)
        );
        zone.bitmap = zoneImg.bitmap;
      }
    }

    return zones;
  },

  // Empile verticalement les zones croppées en pages cibles. Pure logique de
  // mise en page — copiée verbatim du serveur (aucune I/O).
  setTargetPages: function (zonesWithImages, scaleH, scaleV) {
    var initialYOffset = 20 / scaleV;
    let offsetY = initialYOffset;
    var vertStep = scoreSplitter.interScale / scaleV;
    let currentPage = [];
    var maxPageYoffset = 800 / scaleV;
    var pages = [];

    let nVoices = 0;
    var pageNums = [];
    Object.keys(zonesWithImages).forEach(function (pageStr) {
      pageNums.push(parseInt(pageStr));
    });

    pageNums.forEach(function (pageNum) {
      zonesWithImages[pageNum].forEach(function (zone, index) {
        if (zone.merged) {
          nVoices += 1;
          offsetY += 2 * vertStep;
        } else {
          nVoices = 1;
        }

        currentPage.push(zone);
        zone.yOnPage = offsetY;
        zone.xOnPage = scoreSplitter.leftMargin;

        // Position de sortie d'un badge (mesure OU texte) : décalé de son offset relatif
        // (relX, relY en fractions) depuis le coin haut-gauche de la zone, replacé à
        // (imageBackOffset, yOnPage) sur la page composée. natW/natH = dimensions
        // naturelles du PNG.
        var natW = scoreSplitter.pageWidth / scaleH;
        var natH = scoreSplitter.pageHeight / scaleV;
        if (zone.measures) {
          zone.measures.forEach(function (measure) {
            measure.outX = scoreSplitter.imageBackOffset + measure.relX * natW;
            measure.outY = offsetY + measure.relY * natH;
          });
        }
        if (zone.texts) {
          zone.texts.forEach(function (text) {
            text.outX = scoreSplitter.imageBackOffset + text.relX * natW;
            text.outY = offsetY + text.relY * natH;
          });
        }

        offsetY += zone.bitmap.height + vertStep;

        if (offsetY + vertStep + zone.bitmap.height > maxPageYoffset) {
          pages.push(currentPage);
          currentPage = [];
          offsetY = initialYOffset;
        }
      });
    });
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }
    return pages;
  },

  // Composite chaque zone sur une page blanche → buffer PNG. Identique au serveur
  // (async.eachSeries remplacé par une boucle for-await).
  blitImages: async function (pages, scaleH, scaleV) {
    var targetPages = [];
    targetPages.scaleH = scaleH;
    targetPages.scaleV = scaleV;
    var margin = 0;

    for (const page of pages) {
      var w = Math.round((scoreSplitter.pageWidth - margin) / scaleH);
      var h = Math.round((scoreSplitter.pageHeight - margin) / scaleV);

      var targetPage = { imageBuffer: null, measures: [], texts: [] };
      var blanckImg = await createImageAsync(w, h);

      for (const pageZone of page) {
        // Chaque zone peut avoir PLUSIEURS mesures/textes à leurs positions propres
        // (outX, outY) → on les garde tous (pas de dédoublonnage), pour respecter le
        // placement individuel.
        if (pageZone.measures) {
          pageZone.measures.forEach(function (measure) {
            targetPage.measures.push(measure);
          });
        }
        if (pageZone.texts) {
          pageZone.texts.forEach(function (text) {
            targetPage.texts.push(text);
          });
        }

        blanckImg = await blitImageAsync(
          blanckImg,
          pageZone.bitmap,
          pageZone.xOnPage,
          pageZone.yOnPage
        );
      }

      targetPage.imageBuffer = await getBufferAsync(blanckImg);
      targetPages.push(targetPage);
    }

    return targetPages;
  },

  // Remplace writePagesToPdf (PDFKit + fs) par pdf-lib. pdf-lib a son origine en
  // bas-gauche (Y inversé vs PDFKit qui part en haut-gauche) : chaque ordonnée
  // venant du pipeline (haut→bas) est convertie via pageH - yTop - size. Le rendu
  // reste fidèle. Sortie : Uint8Array (au lieu d'un fichier écrit sur disque).
  assemblePdf: async function (targetPdfName, part, pagesImagesArray) {
    part = part.replace(/[ \.]/g, '_');

    var scaleH = pagesImagesArray.scaleH;
    var scaleV = pagesImagesArray.scaleV;
    var pageW = scoreSplitter.pageWidth / scaleH;
    var pageH = scoreSplitter.pageHeight / scaleV;

    var pdfDoc = await PDFDocument.create();
    var helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    var timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // Texte centré dans [xLeft, xLeft+width], positionné depuis le HAUT (yTop)
    // comme PDFKit, converti en repère pdf-lib (bas-gauche).
    function drawCenteredText(page, font, text, size, xLeft, yTopFromTop, width) {
      var textWidth = font.widthOfTextAtSize(String(text), size);
      var x = xLeft + Math.max(0, (width - textWidth) / 2);
      page.drawText(String(text), {
        x: x,
        y: pageH - yTopFromTop - size,
        size: size,
        font: font,
      });
    }

    var left = 30;
    let pageNumber = 1;

    for (let pageIndex = 0; pageIndex < pagesImagesArray.length; pageIndex++) {
      var page = pdfDoc.addPage([pageW, pageH]);
      var imageBuffer = pagesImagesArray[pageIndex].imageBuffer;

      var pngImage = await pdfDoc.embedPng(imageBuffer);
      // PDFKit : doc.image(buf, imageBackOffset, firstScaleY, {scale:1}) → coin
      // haut-gauche de l'image à (20, 70) depuis le haut, 1px = 1pt.
      page.drawImage(pngImage, {
        x: scoreSplitter.imageBackOffset,
        y: pageH - scoreSplitter.firstScaleY - pngImage.height,
        width: pngImage.width,
        height: pngImage.height,
      });

      if (pageIndex == 0) {
        drawCenteredText(page, helvetica, targetPdfName.replace(/[_-]/g, ' '), 36, left, 30, pageW - left);
        drawCenteredText(page, helvetica, part.replace(/[_-]/g, ' '), 24, left, 80, pageW - left);
      } else {
        drawCenteredText(
          page,
          helvetica,
          targetPdfName + ' ' + part,
          12,
          left,
          (scoreSplitter.pageHeight - 50) / scaleV,
          pageW - left
        );
      }

      var measures = pagesImagesArray[pageIndex].measures || [];
      measures.forEach(function (measure) {
        // MÊME proportion que dans l'appli : fontFrac = taille du badge / hauteur du
        // canvas (fraction de page) → police PDF = fontFrac × hauteur de la page. Repli
        // proportionnel (ancien réglage) pour d'éventuelles mesures sans fontFrac.
        var fontSize = measure.fontFrac
          ? Math.round(measure.fontFrac * pageH)
          : Math.round((18 * pageH) / scoreSplitter.pageHeight);
        // Numéro noir à la position (outX, outY) choisie pour CETTE zone (firstScaleY =
        // décalage de l'image composée sur la page). Repère pdf-lib (bas-gauche).
        page.drawText(String(measure.number), {
          x: measure.outX,
          y: pageH - (scoreSplitter.firstScaleY + measure.outY) - fontSize,
          size: fontSize,
          font: helvetica,
        });
      });

      var texts = pagesImagesArray[pageIndex].texts || [];
      texts.forEach(function (text) {
        // MÊME logique que les mesures : police PDF = fontFrac × hauteur de page (repli
        // proportionnel pour d'éventuels textes legacy sans fontFrac), positionné à
        // (outX, outY) choisi pour CETTE zone. Repère pdf-lib (bas-gauche).
        var fontSize = text.fontFrac
          ? Math.round(text.fontFrac * pageH)
          : Math.round((24 * pageH) / scoreSplitter.pageHeight);
        page.drawText(String(text.text), {
          x: text.outX,
          y: pageH - (scoreSplitter.firstScaleY + text.outY) - fontSize,
          size: fontSize,
          font: timesBold,
        });
      });

      page.drawText('' + pageNumber++, {
        x: (scoreSplitter.pageWidth - 15) / scaleH,
        y: pageH - 30 - 18,
        size: 18,
        font: helvetica,
      });
    }

    return await pdfDoc.save();
  },

  // Orchestration de bout en bout (remplace async.waterfall). Reçoit les images de
  // page en ArrayBuffer, retourne le PDF en Uint8Array.
  generatePart: async function (pageImageBuffers, zonesStr, options, onProgress) {
    options = options || {};
    var targetPdfName = options.targetPdfName || 'score';
    var part = options.part || 'part';
    var margin = options.margin || 0;
    var imgScaleCoefV = options.imgScaleCoefV;
    var imgScaleCoefH = options.imgScaleCoefH;
    var naturalW = options.naturalW || null;
    var naturalH = options.naturalH || null;

    var obj = JSON.parse(zonesStr);
    var zones = obj.pages;

    var scaleH = imgScaleCoefH;
    var scaleV = imgScaleCoefV;

    // Mode v2 : zones en fractions 0→1 des dimensions naturelles du PNG →
    // converties en points (système v1). Identique au serveur.
    if (naturalW && naturalH) {
      scaleH = scoreSplitter.pageWidth / naturalW;
      scaleV = scoreSplitter.pageHeight / naturalH;
      for (var pageKey in zones) {
        zones[pageKey].forEach(function (zone) {
          // Compat ascendante : ancienne mesure/texte unique → tableau à un élément.
          if (zone.measure && !zone.measures) zone.measures = [zone.measure];
          if (zone.text && !zone.texts) zone.texts = [zone.text];
          // Offset de chaque badge (mesure ET texte) RELATIF au coin haut-gauche de sa
          // zone, capturé en fractions AVANT le passage en points (sert à le repositionner
          // sur la page de sortie, cf. setTargetPages).
          if (zone.measures) {
            zone.measures.forEach(function (measure) {
              measure.relX = measure.x - zone.x;
              measure.relY = measure.y - zone.y;
            });
          }
          if (zone.texts) {
            zone.texts.forEach(function (text) {
              text.relX = text.x - zone.x;
              text.relY = text.y - zone.y;
            });
          }
          zone.x = zone.x * scoreSplitter.pageWidth;
          zone.width = zone.width * scoreSplitter.pageWidth;
          zone.y = zone.y * scoreSplitter.pageHeight;
          zone.height = zone.height * scoreSplitter.pageHeight;
        });
      }
    }

    if (onProgress) onProgress(10);
    var croppedZones = await scoreSplitter.cropImages(pageImageBuffers, zones, margin, scaleH, scaleV);
    if (onProgress) onProgress(50);
    var pages = scoreSplitter.setTargetPages(croppedZones, scaleH, scaleV);
    var pagesImagesArray = await scoreSplitter.blitImages(pages, scaleH, scaleV);
    if (onProgress) onProgress(80);
    var pdfBytes = await scoreSplitter.assemblePdf(targetPdfName, part, pagesImagesArray);
    if (onProgress) onProgress(100);

    return pdfBytes;
  },
};

export default scoreSplitter;
