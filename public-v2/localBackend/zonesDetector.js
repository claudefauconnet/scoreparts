// Port browser de bin/zonesDetector.js — preuve de portabilité PWA.
// L'algorithme de détection des portées est pur JS (scan de pixels) : il tourne
// à l'identique côté client. Seuls les accès fichier (getPageImage/findPageZones,
// qui dépendaient de path/fs/scoreSplitter) sont retirés — l'image Jimp arrive
// déjà chargée depuis jimpProxyBrowser. isPixelBlack / detectPageScoreLines /
// findBarsInScale sont copiés verbatim du serveur.

var ZonesDetector = {
  isPixelBlack: function (image, x, y) {
    var color = image.getPixelColor(x, y);
    if (color != 4294967295) {
      var hexaStr = color.toString(16);
      var r = parseInt(hexaStr.substring(0, 2), 16);
      var g = parseInt(hexaStr.substring(2, 4), 16);
      var b = parseInt(hexaStr.substring(4, 6), 16);
      var brightness = (r + g + b) / 3;
      if (r == 255 || brightness > 128) {
        return true;
      }
      return false;
    }
    return false;
  },

  detectPageScoreLines: function (image) {
    var lines = [];
    let interline = 0;
    let previousJ = 0;
    let firstVerticalLine = 0;
    let vPoints = 0;

    for (let j = 0; j < image.bitmap.height; j++) {
      let hPoints = 0;

      for (let i = 10; i < image.bitmap.width; i += 3) {
        if (ZonesDetector.isPixelBlack(image, i, j)) {
          hPoints += 1;
        }
        if (j - previousJ > 5) {
          if (hPoints > 400) {
            lines.push(j);
            if (lines.length == 2) {
              interline = lines[1] - lines[0];
            }
            previousJ = j;
            break;
          }
        }
      }
    }

    var topLines = [];
    for (let i = 0; i < lines.length; i += 5) {
      topLines.push(lines[i]);
    }

    for (let i = 0; i < image.bitmap.width; i++) {
      for (let j = 10; j < image.bitmap.height; j += 1) {
        if (ZonesDetector.isPixelBlack(image, i, j)) {
          vPoints += 1;
        }
        if (!firstVerticalLine && vPoints > 50) {
          firstVerticalLine = i;
          break;
        }
      }
    }

    var bars = {};
    topLines.forEach(function (topLine, index) {
      // bars[index] = ZonesDetector.findBarsInScale(image, firstVerticalLine, topLine, interline)
    });

    return {
      topLines: topLines,
      interline: interline,
      firstVerticalLine: firstVerticalLine,
      bars: bars,
    };
  },

  findBarsInScale: function (image, firstVerticalLine, topZoneLine, interline) {
    var bars = [];
    let barPoints = 0;
    let previousNotePoints = 0;
    let previousbarPoints = 0;
    var barHeight = interline * 4 + 1;
    for (let i = firstVerticalLine; i < image.bitmap.width; i++) {
      barPoints = 0;
      for (let j = topZoneLine - 1; j < barHeight + topZoneLine + 1; j += 1) {
        if (ZonesDetector.isPixelBlack(image, i, j)) {
          barPoints += 1;
        }
      }
      if (barPoints >= barHeight) {
        if (!previousbarPoints || i - previousbarPoints > 100) {
          previousbarPoints = i;
          bars.push(i);
        }
      } else if (barPoints == interline) {
        previousNotePoints = i;
      }
    }
    return bars;
  },
};

export default ZonesDetector;
