import 'dotenv/config';
import fs from 'fs';
import * as JimpProxy from './jimpProxy.js';
import async from 'async';
import PDFDocument from 'pdfkit';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import zipdir from 'zip-dir';
import { emitTo } from './socketHub.js';

var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);

var scoreSplitter = {
  zones: [],

  rawImagesDir: 'data/pdf',
  sourcePdfsDir: '../data/pdf/',
  blankPageImg: '../data/_blank.png',
  extractedImagesDir: '../public/data/images/',

  targetPdfDir: '../public/data/pdfs/',
  pageWidth: 595,
  pageHeight: 842,
  scaleCorrection: 1,
  imageBackOffset: 20,

  leftMargin: 0,
  anamorphoseCoef: 1.5,
  firstScaleY: 70,
  interScale: 10,

  coefHV: 0.95,

  isPageImage: function (filename) {
    return /^\d+\.png$/i.test(filename);
  },

  getImagesDir: function (pdfName) {
    return path.resolve(__dirname, scoreSplitter.extractedImagesDir + pdfName);
  },

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

  pdfToImages: function (pdfPath, quality, options, callback) {
    if (!options) {
      options = {};
    }
    var width = scoreSplitter.pageWidth;
    var imgQualities = { low: width * 2, medium: width * 4, high: width * 8 };
    var imageWidth = imgQualities[quality];

    var pdfName = path.basename(pdfPath).replace(/\.[^.]+$/, '');
    var time = new Date();
    var time0 = time;
    var socketId = options.socketId;

    let outputDir = scoreSplitter.getImagesDir(pdfName);
    let outputPrefix = outputDir + path.sep;

    if (options.targetDir) {
      outputPrefix = options.targetDir;
      outputDir = path.dirname(options.targetDir);
    }

    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (e) {}

    var pages = '[0-500]';
    var GraphicsMagickExe = process.env.GM_EXE || 'gm';
    var execEnv = Object.assign({}, process.env);
    if (process.env.GS_BIN) {
      var pathSep = path.sep === '\\' ? ';' : ':';
      execEnv.PATH = process.env.GS_BIN + pathSep + execEnv.PATH;
    }
    var density = Math.round((imageWidth / scoreSplitter.pageWidth) * 72);
    var cmd =
      GraphicsMagickExe +
      ' convert -density ' +
      density +
      ' ' +
      pdfPath +
      pages +
      ' -resize ' +
      imageWidth +
      ' +adjoin ' +
      outputPrefix +
      '%d.png';

    function cleanupOldPngs() {
      try {
        var existing = fs.readdirSync(outputDir);
        existing.forEach(function (f) {
          if (scoreSplitter.isPageImage(f)) {
            try {
              fs.unlinkSync(path.join(outputDir, f));
            } catch (e) {}
          }
        });
      } catch (e) {}
    }

    function startConversion(totalPages) {
      cleanupOldPngs();
      emitTo(socketId, 'pdf-progress', { current: 0, total: totalPages, percent: 0 });

      console.log('EXECUTING ' + cmd);
      var done = false;
      var pollInterval = setInterval(function () {
        if (done) return;
        try {
          var files = fs.readdirSync(outputDir);
          var count = 0;
          files.forEach(function (f) {
            if (scoreSplitter.isPageImage(f)) count++;
          });
          var percent = totalPages > 0 ? Math.min(99, Math.round((count / totalPages) * 100)) : 0;
          emitTo(socketId, 'pdf-progress', { current: count, total: totalPages, percent: percent });
        } catch (e) {}
      }, 500);

      exec(cmd, { env: execEnv }, function (err, stdout, stderr) {
        done = true;
        clearInterval(pollInterval);
        if (err) {
          console.log(stderr);
          emitTo(socketId, 'pdf-error', { message: String(err) });
          return callback(err);
        }
        var time2 = new Date();
        console.log('extract images form pdf took : ' + (time2 - time));
        console.log(stdout);
        emitTo(socketId, 'pdf-progress', { current: totalPages, total: totalPages, percent: 100 });
        callback(null, { pages: totalPages, pdfName: pdfName, duration: time2 - time0 });
      });
    }

    fs.readFile(pdfPath, function (readErr, data) {
      if (readErr) {
        return startConversion(0);
      }
      PDFLibDocument.load(data, { ignoreEncryption: true })
        .then(function (pdfDoc) {
          startConversion(pdfDoc.getPageCount());
        })
        .catch(function () {
          startConversion(0);
        });
    });
  },

  generatePart: function (
    sourcePdfName,
    targetPdfName,
    part,
    zonesStr,
    margin,
    imgScaleCoefV,
    imgScaleCoefH,
    naturalW,
    naturalH,
    callback
  ) {
    var obj = JSON.parse(zonesStr);
    var zones = obj.pages;

    var scaleH = imgScaleCoefH;
    var scaleV = imgScaleCoefV;

    // Mode v2 : les zones sont des fractions 0→1 des dimensions naturelles du PNG.
    // On les convertit en points (système v1) et on dérive les échelles
    // points→pixels (pageDim/naturalDim) pour que toute la mise en page backend
    // (canvas, pas vertical, taille PDF) reste cohérente comme en v1.
    if (naturalW && naturalH) {
      scaleH = scoreSplitter.pageWidth / naturalW;
      scaleV = scoreSplitter.pageHeight / naturalH;
      for (var pageKey in zones) {
        zones[pageKey].forEach(function (zone) {
          zone.x = zone.x * scoreSplitter.pageWidth;
          zone.width = zone.width * scoreSplitter.pageWidth;
          zone.y = zone.y * scoreSplitter.pageHeight;
          zone.height = zone.height * scoreSplitter.pageHeight;
        });
      }
    }

    var targetPagesImages = [];
    async.waterfall(
      [
        async.apply(
          scoreSplitter.cropImages,
          sourcePdfName,
          zones,
          margin,
          scaleH,
          scaleV
        ),
        scoreSplitter.setTargetPages,
        scoreSplitter.blitImages,
      ],
      function (err, pagesImagesArray) {
        if (err) {
          console.log(err);
          return callback(err);
        }

        scoreSplitter.writePagesToPdf(
          targetPdfName,
          part,
          pagesImagesArray,
          function (err, result) {
            if (err) {
              return callback(err);
            }
            callback(null, result);
          }
        );
      }
    );
  },

  cropImages: function (pdfName, zones, margin, scaleH, scaleV, callbackWaterfall) {
    var pageNums = Object.keys(zones);

    async.eachSeries(
      pageNums,
      function (pageNum, callbackEachPage) {
        var pageZones = zones[pageNum];
        if (pageZones.length == 0) {
          return callbackEachPage();
        }

        var imageDir = path.resolve(__dirname, scoreSplitter.extractedImagesDir);
        var imageFile = imageDir + path.sep + pdfName + path.sep + pageNum + '.png';

        async.eachSeries(
          pageZones,
          function (zone, callbackEachZone) {
            if (zone.x < 0 || zone.y < 0) {
              return callbackEachZone('invalid zone coordinates: ' + JSON.stringify(zone));
            }

            try {
              JimpProxy.crop(
                imageFile,
                Math.round(zone.x / scaleH),
                Math.round(zone.y / scaleV),
                Math.round(zone.width / scaleH),
                Math.round(zone.height / scaleV),
                function (err, zoneImg) {
                  if (err) {
                    return callbackEachZone(err + '*********\n' + JSON.stringify(zone));
                  }
                  zone.bitmap = zoneImg.bitmap;
                  return callbackEachZone();
                }
              );
            } catch (e) {
              return callbackEachZone(e + '*********\n' + JSON.stringify(zone));
            }
          },
          function (err) {
            return callbackEachPage(err);
          }
        );
      },
      function (err) {
        return callbackWaterfall(err, zones, scaleH, scaleV);
      }
    );
  },

  setTargetPages: function (zonesWithImages, scaleH, scaleV, callbackWaterfall) {
    var initialYOffset = 20 / scaleV;
    var offsetX = 20 / scaleV;
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

        if (zone.measure) {
          zone.measure.y = offsetY;
        }
        if (zone.text) {
          zone.text.y = offsetY;
          zone.text.x = zone.text.x - zone.x;
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
    callbackWaterfall(null, pages, scaleH, scaleV);
  },

  blitImages: function (pages, scaleH, scaleV, callbackWaterfall) {
    var targetPages = [];
    targetPages.scaleH = scaleH;
    targetPages.scaleV = scaleV;
    var margin = 0;

    async.eachSeries(
      pages,
      function (page, callbackPages) {
        var w = Math.round((scoreSplitter.pageWidth - margin) / scaleH);
        var h = Math.round((scoreSplitter.pageHeight - margin) / scaleV);

        var targetPage = { imageBuffer: null, measures: [], texts: [] };
        JimpProxy.createImage(w, h, function (err, blanckImg) {
          var uniqueMeasures = {};
          var uniqueTexts = {};
          async.eachSeries(
            page,
            function (pageZone, callbackZones) {
              if (pageZone.measure && !uniqueMeasures[pageZone.measure.number]) {
                uniqueMeasures[pageZone.measure.number] = 1;
                targetPage.measures.push(pageZone.measure);
              }
              if (pageZone.text && !uniqueTexts[pageZone.text.text]) {
                uniqueTexts[pageZone.text.text] = 1;
                targetPage.texts.push(pageZone.text);
              }

              try {
                JimpProxy.blitImage(
                  blanckImg,
                  pageZone.bitmap,
                  pageZone.xOnPage,
                  pageZone.yOnPage,
                  function (err, image) {
                    blanckImg = image;
                    callbackZones();
                  }
                );
              } catch (e) {
                if (e) {
                  return callbackZones(e);
                }
              }
            },

            function (err) {
              if (err) {
                return callbackPages(err);
              }

              JimpProxy.getBuffer(blanckImg, function (err, imgBuffer) {
                targetPage.imageBuffer = imgBuffer;
                targetPages.push(targetPage);
                callbackPages();
              });
            }
          );
        });
      },
      function (err) {
        if (err) {
          return callbackWaterfall(err);
        }
        callbackWaterfall(null, targetPages);
      }
    );
  },

  writePagesToPdf: function (targetPdfName, part, pagesImagesArray, callback) {
    var movementDir = path.resolve(
      __dirname,
      scoreSplitter.targetPdfDir + path.sep + targetPdfName
    );

    part = part.replace(/[ \.]/g, '_');
    if (!fs.existsSync(movementDir)) {
      try {
        fs.mkdirSync(movementDir);
      } catch (e) {
        return callback(e);
      }
    }

    var partPdfFile = movementDir + path.sep + part + '' + '.pdf';
    if (fs.existsSync(partPdfFile)) {
      try {
        fs.unlinkSync(partPdfFile);
      } catch (e) {
        return callback("fichier existant et ouvert impossible d'enregistrer le nouveau fichier");
      }
    }

    var partPdfUrl = 'data/pdfs/' + targetPdfName + '/' + part + '.pdf';
    var doc = new PDFDocument({
      size: [
        scoreSplitter.pageWidth / pagesImagesArray.scaleH,
        scoreSplitter.pageHeight / pagesImagesArray.scaleV,
      ],
    });
    let pageNumber = 1;

    var writeStream = fs.createWriteStream(partPdfFile);
    doc.pipe(writeStream);
    for (let pageIndex = 0; pageIndex < pagesImagesArray.length; pageIndex++) {
      var imageBuffer = pagesImagesArray[pageIndex].imageBuffer;
      doc.image(imageBuffer, scoreSplitter.imageBackOffset, scoreSplitter.firstScaleY, {
        scale: scoreSplitter.scaleCorrection,
      });
      var left = 30;
      if (pageIndex == 0) {
        doc.fontSize(36);
        doc.text(targetPdfName.replace(/[_-]/g, ' '), left, 30, {
          width: doc.page.width - left,
          align: 'center',
        });
        doc.fontSize(24);
        doc.text(part.replace(/[_-]/g, ' '), left, 80, { width: 800, align: 'center' });
      } else {
        doc.fontSize(12);
        doc.text(
          targetPdfName + ' ' + part,
          left,
          (scoreSplitter.pageHeight - 50) / pagesImagesArray.scaleV,
          {
            width: doc.page.width - left,
            align: 'center',
          }
        );
      }
      if (pagesImagesArray[pageIndex].measures) {
        pagesImagesArray[pageIndex].measures.forEach(function (measure) {
          doc.fontSize(18);
          doc.text(measure.number, left, measure.y - 5 + scoreSplitter.firstScaleY, {
            width: 200,
            align: 'center',
          });
        });
      }
      if (pagesImagesArray[pageIndex].texts) {
        pagesImagesArray[pageIndex].texts.forEach(function (text) {
          doc.fontSize(24);
          doc.font('Times-Bold');
          var x = text.x - left;
          doc.text(text.text, x / pagesImagesArray.scaleH, text.y - 5 + scoreSplitter.firstScaleY, {
            width: 400,
            align: 'center',
          });
        });
      }
      doc.fontSize(18);
      var str = '' + pageNumber++;
      doc.text(str, (scoreSplitter.pageWidth - 15) / pagesImagesArray.scaleH, 30, {
        align: 'left',
      });

      doc.addPage();
    }
    // Attendre la fin d'écriture sur disque avant de répondre : sinon le
    // client ouvre le PDF avant qu'il soit complet ("Échec de chargement").
    writeStream.on('finish', function () {
      callback(null, partPdfUrl);
    });
    writeStream.on('error', function (err) {
      callback(err);
    });
    doc.end();
  },

  createZip: function (movementDirName, callback) {
    var movementDir = path.resolve(
      __dirname,
      scoreSplitter.targetPdfDir + path.sep + movementDirName
    );

    zipdir(movementDir, function (err, buffer) {
      if (err) {
        return callback(err);
      }
      fs.writeFileSync(movementDir + '.zip', buffer);

      var zipUrl = 'data/pdfs/' + movementDirName + '.zip';
      return callback(null, {
        zipPath: zipUrl,
      });
    });
  },
};

export default scoreSplitter;
