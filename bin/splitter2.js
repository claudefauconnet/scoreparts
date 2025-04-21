var JimpModule = require("jimp");
const async = require("async");
const path = require("path");
var Jimp = JimpModule;


var scoreSplitter2 = {

    generatePart: function (pdfName, part, zonesStr, margin, imgScaleCoef, callback) {

        var zones = JSON.parse(zonesStr);

        //store the zones coordinates for a replay (eventually)
        //  fs.writeFileSync(scoreSplitter.imagesDir + "zones-" + pdfName + "-" + part + ".json", zonesStr)
        //    scoreSplitter.zones = zones;


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

    }
    ,


    cropImages: function (pdfName, zones, margin, scale, callbackWaterfall) {


        async function getImage(imageFile){
            var image=await Jimp.read(imageFile)
            return image
        }
        ///  var zonesWithImages = []

        var pageNums = Object.keys(zones)
        async.eachSeries(pageNums, function (pageNum, callbackEach) {

            var pageZones = zones[pageNum]
            if (pageZones.length == 0) {
                return callbackEach()
            }

            var sourceImg = pdfName + "-" + pageNum + ".png";
            var imageDir = path.resolve(__dirname, scoreSplitter.extractedImagesDir);
            var imageFile = imageDir + path.sep + sourceImg;
            var image=getImage(imageFile)
            Jimp.read(imageFile, function (err, image) {
                var w = image.bitmap.width
                var h = image.bitmap.height
                if (err) {
                    console.log(err);
                    return callbackEach(err);
                }


                async.eachSeries(pageZones, function (zone, callbackEach) {

                        var zoneImg = image.crop(zone.x / scale, zone.y / scale, zone.width / scale, zone.height / scale);
                        var w = zoneImg.bitmap.width
                        var h = zoneImg.bitmap.height
                        zone.bitmap = zoneImg.bitmap
                        return callbackEach();


                        /*       zoneImg.getBuffer(Jimp.MIME_PNG, function (err, img) {
                                   if (err) {
                                       return callbackEach(err)
                                   }

                                   // zonesWithImages.push({img: img, zone: zone, width: w, scale: scale})
                                   zone.image = img
                                   callbackEach();
                               });
                               */


                    }, function (err) {

                        return callbackEach(err);


                    }
                )
            })
        }, function (err) {
            callbackWaterfall(err, zones, scale);
        })
    }

}


module.exports = scoreSplitter2;


var obj = {
    "generatePart": "1",
    "part": "XXX",
    "margin": "15",
    "pdfName": "IMSLP497429-PMLP649379-zelenka_requiem_45_conducteur",
    "zonesStr": "{\"0\":[],\"1\":[{\"x\":10,\"y\":233,\"width\":585,\"height\":50,\"page\":1,\"voice\":\"aa\"},{\"x\":10,\"y\":345,\"width\":585,\"height\":50,\"page\":1,\"voice\":\"BB\"}],\"2\":[{\"x\":10,\"y\":43,\"width\":585,\"height\":50,\"page\":2},{\"x\":10,\"y\":115,\"width\":585,\"height\":50,\"page\":2}]}",
    "imgScaleCoef": "0.35378151260504204"
}


if (true) {
    scoreSplitter2
        .generatePart(obj.pdfName, obj.part, obj.zonesStr, obj.margin, obj.imgScaleCoef, function (err, result) {
            var x = err;
        })
}