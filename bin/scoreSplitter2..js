var fs = require('fs');
//var PDFImage = require("pdf-image").PDFImage;
/*var JimpModule = require("jimp");
var Jimp = JimpModule;
*/
var JimpProxy = null;

var async = require('async');
var PDFDocument = require('pdfkit');
var path = require('path');
var exec = require('child_process').exec;


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


    /* pdfToImages: function (pdfPath, callback) {
         var  pdfName=path.basename(pdfPath)

         var time=new Date();
         var time0=time;
         pdfName=pdfName.substring(0,pdfName.lastIndexOf('.'));
         var outputPrefix = pdfPath.substring(0, pdfPath.lastIndexOf(".")) + "-";

         gm().command('convert').in('+adjoin').in(pdfPath).write(outputPrefix+"%02d.png", function (err) {
             var x=err;
             // something
         });
     },*/



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

        var pages = "[0-30]"
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

        var zones = JSON.parse(zonesStr);

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
                scoreSplitter.writePagesToPdf(pdfName, part, pagesImagesArray, function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, result);
                });

            })
        })

    }
    ,


    cropImages: function (pdfName, zones, margin, scale, _callbackWaterfall) {
        ///  var zonesWithImages = []
        var pageNums = Object.keys(zones)

           async.eachSeries( pageNums,function(pageNum,callbackEachPage){
            var pageZones = zones[pageNum]
            if (pageZones.length == 0) {
                return callbackEachPage();
            }

            var sourceImg = pdfName + "-" + pageNum + ".png";
            var imageDir = path.resolve(__dirname, scoreSplitter.extractedImagesDir);
            var imageFile = imageDir + path.sep + sourceImg;

         JimpProxy.getImage(imageFile,function(err,image) {
                 var w = image.bitmap.width
                 var h = image.bitmap.height


                 pageZones.forEach(function (zone) {

                     var promise2 = JimpProxy.crop(zone.x / scale, zone.y / scale, zone.width / scale, zone.height / scale);
                     promise2.then((zoneImg) => {
                         var w = zoneImg.bitmap.width
                         var h = zoneImg.bitmap.height
                         zone.bitmap = zoneImg.bitmap
                     })




             })
         })


            })



    },


    setTargetPages: function (zonesWithImages, scale, callbackWaterfall) {
        var initialYOffset = 20/scale
        var offsetX =  20/scale
        var offsetY = initialYOffset;
        var vertStep = 5/scale;
        var currentPage = [];
        var maxPageYoffset = 800/scale ;
        var pageFull = false;
        var pages = [];

        var pageNums = Object.keys(zonesWithImages);
        pageNums.sort()

        pageNums.forEach(function (pageNum) {

            zonesWithImages[pageNum].forEach(function (zone) {


                currentPage.push(zone);
                zone.yOnPage=offsetY
                zone.xOnPage=zone.x/scale
                offsetY += (zone.bitmap.height) + (vertStep );
                if (offsetY + (zone.bitmap.height) > maxPageYoffset) {
                    pageFull = true;
                    pages.push(currentPage);
                    currentPage = [];
                    offsetY = initialYOffset;

                } else {
                    pageFull = false;
                }


            })
        })
        if (!pageFull) {
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
            var blanckImg = new Jimp(w, h, 0xFFFFFFFF, function (err, blanckImg) {
                // this image is 256 x 256, every pixel is set to 0x00000000

                //     blanckImg.resize(blankWidth,blankHeight);


                async.eachSeries(page, function (pageZone, callbackZones) {
                        try {
                          /*  Jimp.read(pageZone.image, function (err, image) {
                                if (err) {
                                    console.log(err);
                                    return callbackZones(err);
                                }*/


                                //   console.log("blit"+ pageZone.x);
                           var zoneImage= Jimp.fromBitmap(pageZone.bitmap)
                                blanckImg.blit(zoneImage, pageZone.yOnPage, pageZone.yOnPage);

                                callbackZones();

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

                        blanckImg.getBuffer(Jimp.MIME_PNG, function (err, imgBuffer) {
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


    writePagesToPdf: function (pdfName, part, pagesImagesArray, callback) {
        var title = pdfName + "-" + part;
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


}
/*scoreSplitter.pdfToImages("12.3._Coro_Alcina_2_flûtes.pdf", function (err, result) {
    xx = err;
});*/
module.exports = scoreSplitter;


var obj = {
    "generatePart": "1",
    "part": "XXX",
    "margin": "15",
    "pdfName": "IMSLP497429-PMLP649379-zelenka_requiem_45_conducteur",
    "zonesStr": "{\"0\":[],\"1\":[{\"x\":10,\"y\":233,\"width\":585,\"height\":50,\"page\":1,\"voice\":\"aa\"},{\"x\":10,\"y\":345,\"width\":585,\"height\":50,\"page\":1,\"voice\":\"BB\"}],\"2\":[{\"x\":10,\"y\":43,\"width\":585,\"height\":50,\"page\":2},{\"x\":10,\"y\":115,\"width\":585,\"height\":50,\"page\":2}]}",
    "imgScaleCoef": "0.35378151260504204"
}


if (true) {
    scoreSplitter
        .generatePart(obj.pdfName, obj.part, obj.zonesStr, obj.margin, obj.imgScaleCoef, function (err, result) {
            var x = err;
        })
}



