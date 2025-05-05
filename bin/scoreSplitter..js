var fs = require('fs');
//var PDFImage = require("pdf-image").PDFImage;
//var Jimp = require("jimp");
var JimpProxy = null;
var async = require('async');
var PDFDocument = require('pdfkit');
var exec = require('child_process').exec;
var path = require('path');

var zipdir = require('zip-dir');


var scoreSplitter = {
    zones: [],
    //  imagesDir: "./public/data/images/",

    rawImagesDir: "data/pdf",
    sourcePdfsDir: "../data/pdf/",
    blankPageImg: "../data/_blank.png",
    extractedImagesDir: "../public/data/images/",

    targetPdfDir: "../public/data/pdfs/",
    pageWidth: 595,
    pageHeight: 842,
    imageScaleCoef: 1.10,//agrandit chaque image
    imageBackOffset: -150,//retrait de l'image vers la gauche
    leftMargin: 70,
    anamorphoseCoef: 1.5,
    firstScaleY: 70,
    interScale: 10,// espace entre les portées

    listScores: function (callback) {
        var pdfs = [];
        var pdfsDir = path.resolve(__dirname, scoreSplitter.sourcePdfsDir);
        var files = fs.readdirSync(pdfsDir, 'utf8');
        for (var i = 0; i < files.length; i++) {
            var p = files[i].toLowerCase().lastIndexOf(".pdf");
            if (p > -1) {
                pdfs.push(files[i].substring(0, p))
            }
        }
        return callback(null, pdfs);
    },


    pdfToImages: function (pdfPath, quality, options, callback) {
        if (!options) {
            options = {}
        }
        var width = scoreSplitter.pageWidth;
        var imgQualities = {low: width * 2, medium: width * 4, high: width * 8}
        var imageWitdh = imgQualities[quality];

        //   var jarPath = path.resolve(__dirname, "../java/pdfbox-app-2.0.8.jar");
        // var jarPath = path.resolve(__dirname, "../java/pdf2images.jar");
        var pdfName = path.basename(pdfPath)
        pdfName = pdfName.substring(0, pdfName.lastIndexOf('.'));
        var time = new Date();
        var time0 = time;

        var outputPrefix = path.resolve(__dirname, scoreSplitter.extractedImagesDir + pdfName + "-");

        if (options.targetDir) {
            outputPrefix = options.targetDir;
        }

        var pages = "[0-500]"
        var GraphicsMagickExe = "gm";
        if (path.sep == "\\") {//windows
            GraphicsMagickExe = "\"C:\\Program Files\\GraphicsMagick-1.3.36-Q8\\gm.exe\"";
            GraphicsMagickExe = "\"C:\\Program Files\\GraphicsMagick-1.4-Q8\\gm.exe\"";
        }
        var cmd = GraphicsMagickExe + " convert -density 600 " + pdfPath + pages + " -resize " + imageWitdh + " +adjoin " + outputPrefix + "%d.png"

        console.log("EXECUTING " + cmd)
        exec(cmd, function (err, stdout, stderr) {
            if (err) {
                console.log(stderr);
                return callback(err);
            }
            var time2 = new Date()
            console.log("extract images form pdf took : " + (time2 - time));
            time = time2;
            console.log(stdout);

            callback(null, {pages: 0, pdfName: pdfName, duration: (time2 - time0)});

        });


    }

    ,


    generatePart: function (sourcePdfName, targetPdfName, part, zonesStr, margin, imgScaleCoef, callback) {

        var obj = JSON.parse(zonesStr);
        var zones = obj.pages
        var title = obj.title

        //store the zones coordinates for a replay (eventually)
        //  fs.writeFileSync(scoreSplitter.imagesDir + "zones-" + pdfName + "-" + part + ".json", zonesStr)
        //    scoreSplitter.zones = zones;
        import("../bin/jimpProxy.mjs").then((mod) => {
            JimpProxy = mod;

            var targetPagesImages = [];
            async.waterfall([
                async.apply(scoreSplitter.cropImages, sourcePdfName, zones, margin, imgScaleCoef),
                scoreSplitter.setTargetPages,
                scoreSplitter.blitImages,

            ], function (err, pagesImagesArray) {

                scoreSplitter.writePagesToPdf(targetPdfName, part, pagesImagesArray, function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, result);
                });

            })
        })

    }
    ,


    cropImages: function (pdfName, zones, margin, scale, callbackWaterfall) {
        ///  var zonesWithImages = []
        var pageNums = Object.keys(zones)

        async.eachSeries(pageNums, function (pageNum, callbackEachPage) {
            var pageZones = zones[pageNum]
            if (pageZones.length == 0) {
                return callbackEachPage();
            }

            var sourceImg = pdfName + "-" + pageNum + ".png";
            var imageDir = path.resolve(__dirname, scoreSplitter.extractedImagesDir);
            var imageFile = imageDir + path.sep + sourceImg;

            async.eachSeries(pageZones, function (zone, callbackEachZone) {
                    JimpProxy.crop(imageFile,
                        Math.round(zone.x / scale),
                        Math.round(zone.y / scale),
                        Math.round(zone.width / scale),
                        Math.round(zone.height / scale),
                        function (err, zoneImg) {
                            // JimpProxy.getImageColors(zoneImg)
                            var w = zoneImg.bitmap.width
                            var h = zoneImg.bitmap.height


                            //anamorphose image

                            /*   var h2 =Math.round(  h * scoreSplitter.anamorphoseCoef)
                               zoneImg =zoneImg.resize({ w: w, h: h2 })*/

                            zone.bitmap = zoneImg.bitmap
                            return callbackEachZone(err)
                        })
                }
                , function (err) {
                    return callbackEachPage(err)
                })

        }, function (err) {
            return callbackWaterfall(null, zones, scale)
        })

    },


    setTargetPages: function (zonesWithImages, scale, callbackWaterfall) {
        var initialYOffset = 20 / scale
        var offsetX = 20 / scale
        var offsetY = initialYOffset;
        var vertStep = scoreSplitter.interScale / scale;
        var currentPage = [];
        var maxPageYoffset = 800 / scale;
        var pageFull = false;
        var pages = [];

        var pageNums = Object.keys(zonesWithImages);
        pageNums.sort()

        pageNums.forEach(function (pageNum) {

            zonesWithImages[pageNum].forEach(function (zone, index) {


                currentPage.push(zone);
                zone.yOnPage = offsetY
                zone.xOnPage = (scoreSplitter.leftMargin) / scale

                if (zone.measure) {
                 //   console.log(zone.measure.number + " " + offsetY)
                    zone.measure.y = offsetY
                }


                offsetY += (zone.bitmap.height) + (vertStep);
                if ((offsetY + vertStep + zone.bitmap.height) > maxPageYoffset) {
                    pages.push(currentPage);
                    currentPage = [];
                    offsetY = initialYOffset;
                }


            })
        })
        if (currentPage.length > 0) {
            pages.push(currentPage);
        }
        callbackWaterfall(null, pages, scale)

    }

    ,


    blitImages: function (pages, scale, callbackWaterfall) {
        var targetPages = [];
        targetPages.scale = scale;
        var margin = 0


        async.eachSeries(pages, function (page, callbackPages) {

            var w = Math.round((scoreSplitter.pageWidth - margin) / scale);
            var h = Math.round((scoreSplitter.pageHeight - margin) / scale);

            var targetPage = {imageBuffer: null, measures: []}
            JimpProxy.createImage(w, h, function (err, blanckImg) {
var uniqueMeasures={}
                async.eachSeries(page, function (pageZone, callbackZones) {


                        if (pageZone.measure &&!uniqueMeasures[pageZone.measure.number]) {
                            uniqueMeasures[pageZone.measure.number]=1
                            targetPage.measures.push(pageZone.measure)
                        }

                        try {
                            JimpProxy.blitImage(blanckImg, pageZone.bitmap, pageZone.xOnPage, pageZone.yOnPage, function (err, image) {
                                blanckImg = image
                                callbackZones();

                            });


                            // })
                        } catch (e) {
                            if (e) {

                                return callbackZones(e)
                            }
                        }


                    }

                    , function (err) {
                        if (err) {
                            return callbackPages(err);
                        }
                        //  JimpProxy.getImageColors(blanckImg)


                        JimpProxy.getBuffer(blanckImg, function (err, imgBuffer) {
                            targetPage.imageBuffer = imgBuffer
                            targetPages.push(targetPage);
                            callbackPages();
                        });


                    })

            })
        }, function (err) {
            if (err) {
                return callbackWaterfall(err);
            }
            callbackWaterfall(null, targetPages);

        })


    }
    ,


    writePagesToPdf: function (targetPdfName, part, pagesImagesArray, callback) {
        var movementDir = path.resolve(__dirname, scoreSplitter.targetPdfDir + path.sep + targetPdfName);

        part = part.replace(/[ \.]/g, "_")
        if (!fs.existsSync(movementDir)) {
            try {
                fs.mkdirSync(movementDir);
            } catch (e) {
                return callback(e);
            }
        }

        var partPdfFile = movementDir + path.sep + part+"" + ".pdf";
        if (fs.existsSync(partPdfFile)) {
            try {
                fs.unlinkSync(partPdfFile);
            } catch (e) {
                return callback("fichier existant et ouvert impossible d'enregistrer le nouveau fichier");
            }
        }

        var partPdfUrl = "data/pdfs/" + targetPdfName + "/" + part + ".pdf";
        var doc = new PDFDocument({size: [scoreSplitter.pageWidth / pagesImagesArray.scale, scoreSplitter.pageHeight / pagesImagesArray.scale]});
        var pageNumber = 1;


        doc.pipe(fs.createWriteStream(partPdfFile));
        for (var i = 0; i < pagesImagesArray.length; i++) {
            var imageBuffer = pagesImagesArray[i].imageBuffer
            //   doc.image(pagesImagesArray[i], 0, 50, {scale: (1 / pagesImagesArray.scale)})
            doc.image(imageBuffer, scoreSplitter.imageBackOffset, scoreSplitter.firstScaleY, {scale: scoreSplitter.imgScaleCoef})
            if (i == 0) {
                doc.fontSize(36);
                doc.text(targetPdfName.replace(/[_-]/g," ") , (0.5 * doc.page.width) - 400, 30, {width: 800, align: 'center'});
                doc.fontSize(24);
                doc.text( part.replace(/[_-]/g," "), (0.5 * doc.page.width) - 400, 80, {width: 800, align: 'center'});
            } else {
                doc.fontSize(12);
                doc.text(targetPdfName + " " + part, 30, (scoreSplitter.pageHeight - 50) / pagesImagesArray.scale, {
                    width: 800,
                    align: 'center'
                });
            }
            if (pagesImagesArray[i].measures) {
                pagesImagesArray[i].measures.forEach(function (measure) {
                    doc.fontSize(18);
                    //  doc.text(measure.number, measure.x , measure.y+ scoreSplitter.firstScaleY-2, {
                    doc.text(measure.number, 30, measure.y-5 + scoreSplitter.firstScaleY, {
                        width: 200,
                        align: 'center'
                    });

                })
            }
            doc.fontSize(18)
            var str = "" + (pageNumber++)
            doc.text(str, (scoreSplitter.pageWidth - 15) / pagesImagesArray.scale, 30, {align: 'left'});

            doc.addPage();

        }
        doc.end();
        callback(null, partPdfUrl)

    }
    ,
    createZip: function (movementDirName, callback) {

        //  setTimeout(function () {


        var movementDir = path.resolve(__dirname, scoreSplitter.targetPdfDir + path.sep + movementDirName);


        zipdir(movementDir, function (err, buffer) {
            if (err) {
                return callback(err);
            }
            fs.writeFileSync(movementDir + ".zip", buffer);

            var zipUrl = "data/pdfs/" + movementDirName + ".zip"
            return callback(null, {
                zipPath: zipUrl
            })
        })
        // }, 100)

    }


}

module.exports = scoreSplitter;


var obj = {
    "generatePart": "1",
    "part": "XXX",
    "margin": "15",
    "pdfName": "IMSLP497429-PMLP649379-zelenka_requiem_45_conducteur",
    "zonesStr": "{\"0\":[],\"1\":[{\"x\":10,\"y\":233,\"width\":585,\"height\":50,\"page\":1,\"voice\":\"aa\"},{\"x\":10,\"y\":345,\"width\":585,\"height\":50,\"page\":1,\"voice\":\"BB\"}],\"2\":[{\"x\":10,\"y\":43,\"width\":585,\"height\":50,\"page\":2},{\"x\":10,\"y\":115,\"width\":585,\"height\":50,\"page\":2}]}",
    "imgScaleCoef": "0.35378151260504204"
}


if (false) {
    scoreSplitter
        .generatePart(obj.pdfName, obj.part, obj.zonesStr, obj.margin, obj.imgScaleCoef, function (err, result) {
            var x = err;
        })
}



