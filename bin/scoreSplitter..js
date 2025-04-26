var fs = require('fs');
//var PDFImage = require("pdf-image").PDFImage;
//var Jimp = require("jimp");
var JimpProxy = null;
var async = require('async');
var PDFDocument = require('pdfkit');
var exec = require('child_process').exec;
var path = require('path');

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
    leftMargin: 60,
    anamorphoseCoef: 1.5,
    interScale: 10 ,// espace entre les portées

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

        var pages = "[0-300]"
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


    generatePart: function (pdfName, part, zonesStr, margin, imgScaleCoef, callback) {

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
                async.apply(scoreSplitter.cropImages, pdfName, zones, margin, imgScaleCoef),
                scoreSplitter.setTargetPages,
                scoreSplitter.blitImages,

            ], function (err, pagesImagesArray) {
                scoreSplitter.writePagesToPdf(pdfName, title, part, pagesImagesArray, function (err, result) {
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

            zonesWithImages[pageNum].forEach(function (zone,index) {

                currentPage.push(zone);
                zone.yOnPage = offsetY
                zone.xOnPage = (scoreSplitter.leftMargin) / scale



                offsetY += (zone.bitmap.height) + (vertStep);
                if((offsetY+vertStep)>maxPageYoffset){
                    pages.push(currentPage);
                    currentPage = [];
                    offsetY = initialYOffset;
                }






            })
        })
     if (currentPage.length>0) {
            pages.push(currentPage);
        }
        callbackWaterfall(null, pages, scale)

    }

    ,


    blitImages: function (pages, scale, callbackWaterfall) {
        var targetImages = [];
        var margin = 0



        async.eachSeries(pages, function (page, callbackPages) {
            targetImages.scale = scale;
            var w = Math.round((scoreSplitter.pageWidth - margin) / scale);
            var h = Math.round((scoreSplitter.pageHeight - margin) / scale);

            JimpProxy.createImage(w, h, function (err, blanckImg) {
                async.eachSeries(page, function (pageZone, callbackZones) {
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
                            targetImages.push(imgBuffer);
                            callbackPages();
                        });


                    })

            })
        }, function (err) {
            if (err) {
                return callbackWaterfall(err);
            }
            callbackWaterfall(null, targetImages);

        })


    }
    ,


    writePagesToPdf: function (pdfName, title, part, pagesImagesArray, callback) {
        var title = title + "-" + part;
        var pdfsDir = path.resolve(__dirname, scoreSplitter.targetPdfDir);
        var partPdfFile = pdfsDir + path.sep + pdfName + "-" + part + ".pdf";
        if (fs.existsSync(partPdfFile)) {

            try {
                fs.unlinkSync(partPdfFile);
            } catch (e) {
                return callback("fichier existant et ouvert impossible d'enrgistrer le nouveau fichier");
            }
        }
        var partPdfUrl = "data/pdfs/" + pdfName + "-" + part + ".pdf";
        var doc = new PDFDocument({size: [scoreSplitter.pageWidth / pagesImagesArray.scale, scoreSplitter.pageHeight / pagesImagesArray.scale]});
        var pageNumber = 1;
        doc.on('pageAdded',
            function () {
                // Don't forget the reset the font family, size & color if needed
                doc.fontSize(16)
                var str = title + " page " + (++pageNumber)
                doc.text(str, 10, 10, {align: 'left'});
                //  doc.fontSize(28)
                // doc.text(++pageNumber, 0.5 * (doc.page.width - 100), 40, {width: 100, align: 'center'});
            }
        );

        doc.pipe(fs.createWriteStream(partPdfFile));

        for (var i = 0; i < pagesImagesArray.length; i++) {
            //   doc.image(pagesImagesArray[i], 0, 50, {scale: (1 / pagesImagesArray.scale)})
            doc.image(pagesImagesArray[i], scoreSplitter.imageBackOffset, 50, {scale: scoreSplitter.imgScaleCoef})
            if (i == 0) {
                doc.fontSize(36);
                doc.text(title, (0.5 * doc.page.width) - 400, 30, {width: 800, align: 'center'});
            }

            doc.addPage();

        }
        doc.end();
        callback(null, partPdfUrl)

    }
    ,
    findPageZones: function (pdfName, pageNum, callback) {
        import("../bin/jimpProxy.mjs").then((mod) => {
            JimpProxy = mod;
            var sourceImg = pdfName + "-" + pageNum + ".png";
            var imageDir = path.resolve(__dirname, scoreSplitter.extractedImagesDir);
            var imageFile = imageDir + path.sep + sourceImg;
            JimpProxy.getImage(imageFile, function (err, image) {
//image.bitmap.width

                var previousJ = 0
                var zones = []
                for (var i = 200; i < 201; i++) {
                    for (var j = 0; j < image.bitmap.height; j++) {

                        var color = image.getPixelColor(i, j);
                        var x = color
                        if (color != 4294967295) {
                            var hexaStr = (color).toString(16)
                            var r = parseInt(hexaStr.substring(0, 2), 16)
                            var g = parseInt(hexaStr.substring(2, 4), 16)
                            var b = parseInt(hexaStr.substring(4, 6), 16)
                            const brightness = (r + g + b) / 3;
                            const bw = brightness < 128 ? brightness : 255;
                            if ((r == 255 || brightness > 128) && j - previousJ > (100)) {//} && previousBrightness==255){
                                //  console.log(""+i+"  "+j)
                                previousJ = j
                                zones.push(j)
                            } else {

                            }
                        }
                    }

                }
                var x = zones
                return callback(null, zones)
            })
        })
    },


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
if (false) {


    scoreSplitter.findPageZones(obj.pdfName, 2, function (err, result) {

    })

}


