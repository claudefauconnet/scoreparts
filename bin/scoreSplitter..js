import 'dotenv/config';
import fs from 'fs';
import * as JimpProxy from './jimpProxy.js';
import async from 'async';
import PDFDocument from 'pdfkit';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import zipdir from 'zip-dir';

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

  listScores: function (callback) {
    var pdfs = [];
    var pdfsDir = path.resolve(__dirname, scoreSplitter.sourcePdfsDir);
    var files = fs.readdirSync(pdfsDir, 'utf8');
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      var pdfExtIndex = files[fileIndex].toLowerCase().lastIndexOf('.pdf');
      if (pdfExtIndex > -1) {
        pdfs.push(files[fileIndex].substring(0, pdfExtIndex));
      }
    }
    return callback(null, pdfs);
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

    let outputPrefix = path.resolve(__dirname, scoreSplitter.extractedImagesDir + pdfName + '-');

    if (options.targetDir) {
      outputPrefix = options.targetDir;
    }

    var pages = '[0-500]';
    var GraphicsMagickExe = process.env.GM_EXE || 'gm';
    var execEnv = Object.assign({}, process.env);
    if (process.env.GS_BIN) {
      var pathSep = path.sep === '\\' ? ';' : ':';
      execEnv.PATH = process.env.GS_BIN + pathSep + execEnv.PATH;
    }
    var cmd =
      GraphicsMagickExe +
      ' convert -density 600 ' +
      pdfPath +
      pages +
      ' -resize ' +
      imageWidth +
      ' +adjoin ' +
      outputPrefix +
      '%d.png';

    console.log('EXECUTING ' + cmd);
    exec(cmd, { env: execEnv }, function (err, stdout, stderr) {
      if (err) {
        console.log(stderr);
        return callback(err);
      }
      var time2 = new Date();
      console.log('extract images form pdf took : ' + (time2 - time));
      console.log(stdout);

      callback(null, { pages: 0, pdfName: pdfName, duration: time2 - time0 });
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
    callback
  ) {
    var obj = JSON.parse(zonesStr);
    var zones = obj.pages;

    var targetPagesImages = [];
    async.waterfall(
      [
        async.apply(
          scoreSplitter.cropImages,
          sourcePdfName,
          zones,
          margin,
          imgScaleCoefH,
          imgScaleCoefV
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

        var sourceImg = pdfName + '-' + pageNum + '.png';
        var imageDir = path.resolve(__dirname, scoreSplitter.extractedImagesDir);
        var imageFile = imageDir + path.sep + sourceImg;

        async.eachSeries(
          pageZones,
          function (zone, callbackEachZone) {
            if (zone.x < 0 || zone.y < 0) {
              return callbackWaterfall('invalid zone coordinates: ' + JSON.stringify(zone));
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
                    return callbackWaterfall(err + '*********\n' + JSON.stringify(zone));
                  }
                  zone.bitmap = zoneImg.bitmap;
                  return callbackEachZone(err);
                }
              );
            } catch (e) {
              return callbackEachPage(e + '*********\n' + JSON.stringify(zone));
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
          zone.text.x = zone.text.x-zone.x;
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

        var targetPage = { imageBuffer: null, measures: [],texts:[] };
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
              if(pageZone.text && !uniqueTexts[pageZone.text.text]) {
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

    doc.pipe(fs.createWriteStream(partPdfFile));
    for (let pageIndex = 0; pageIndex < pagesImagesArray.length; pageIndex++) {
      var imageBuffer = pagesImagesArray[pageIndex].imageBuffer;
      doc.image(imageBuffer, scoreSplitter.imageBackOffset, scoreSplitter.firstScaleY, {
        scale: scoreSplitter.scaleCorrection,
      });
      var left = 30;
      if (pageIndex == 0) {
        doc.fontSize(36);
        doc.text(targetPdfName.replace(/[_-]/g, ' '), left, 30, {
          width: doc.page.width -left,
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
          doc.text(measure.number, left, (measure.y - 5) + scoreSplitter.firstScaleY, {
            width: 200,
            align: 'center',
          });
        });
      }
      if (pagesImagesArray[pageIndex].texts) {
        pagesImagesArray[pageIndex].texts.forEach(function (text) {
          doc.fontSize(24);
          doc. font ('Times-Bold')
          var x=(text.x)-left
          doc.text(text.text, x/ pagesImagesArray.scaleH, (text.y-5)+ scoreSplitter.firstScaleY, {
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
    doc.end();
    callback(null, partPdfUrl);
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
