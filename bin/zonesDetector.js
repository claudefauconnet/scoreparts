var path = require('path');
var scoreSplitter = require('./scoreSplitter..js')


var ZonesDetector = {


    getPageImage: function (pdfName, pageNum, callback) {
        var JimpProxy = null
        import("../bin/jimpProxy.mjs").then((mod) => {
            JimpProxy = mod;
            var sourceImg = pdfName + "-" + pageNum + ".png";
            var imageDir = path.resolve(__dirname, scoreSplitter.extractedImagesDir);
            var imageFile = imageDir + path.sep + sourceImg;
            JimpProxy.getImage(imageFile, function (err, image) {
                callback(err, image)
            })
        })

    },

    isPixelBlack: function (image, x, y) {
        var color = image.getPixelColor(x, y);
        var z = color
        if (color != 4294967295) {
            var hexaStr = (color).toString(16)
            var r = parseInt(hexaStr.substring(0, 2), 16)
            var g = parseInt(hexaStr.substring(2, 4), 16)
            var b = parseInt(hexaStr.substring(4, 6), 16)
            const brightness = (r + g + b) / 3;
            if ((r == 255 || brightness > 128)) {
                return true;
            } else {
                var x = 3
            }
            return false
        }
        return false;

    },

    detectPageScoreLines: function (image) {


        var lines = []
        var interline = 0
        var previousJ = 0
        var firstVerticalLine = 0
        var vPoints = 0
        // detect horizontal lines (portées)
        for (var j = 0; j < image.bitmap.height; j++) {
            var hPoints = 0

            for (var i = 10; i < image.bitmap.width; i += 3) {
                if (ZonesDetector.isPixelBlack(image, i, j)) {
                    hPoints += 1


                }
                if (j - previousJ > 5) {
                    if (hPoints > 400) {
                        lines.push(j)
                        if (lines.length == 2) {
                            interline = lines[1] - lines[0]
                        }
                        previousJ = j
                        break;
                    } else {
                    }
                }


            }

        }

        var measures = {}
        var topLines = []
        for (var i = 0; i < lines.length; i += 5) {
            topLines.push(lines[i])
        }


        //detect vertical line;
        for (var i = 0; i < image.bitmap.width; i++) {
            for (var j = 10; j < image.bitmap.height; j += 1) {

                if (ZonesDetector.isPixelBlack(image, i, j)) {
                    vPoints += 1
                }
                if (!firstVerticalLine && vPoints > 50) {
                    firstVerticalLine = i;
                    break;
                    i = image.bitmap.width
                }

            }
        }

        var bars = {}
        topLines.forEach(function (topLine, index) {
            bars[index] = ZonesDetector.findBarsInScale(image, firstVerticalLine, topLine, interline)
        })


        return {topLines: topLines, interline: interline, firstVerticalLine: firstVerticalLine, bars: bars}


        return lines;


    },


    findBarsInScale: function (image, firstVerticalLine, topZoneLine, interline) {
        var bars = []
        var barPoints = 0
var previousNotePoints=0
        var previousbarPoints = 0
        var barHeight = (interline * 4)+1
        for (var i = firstVerticalLine; i < image.bitmap.width; i++) {
            barPoints = 0
            for (var j = topZoneLine-1; j < (barHeight + topZoneLine+1); j += 1) {
                if (ZonesDetector.isPixelBlack(image, i, j)) {
                    barPoints += 1
                }
            }
            if (barPoints >= barHeight) { //taille de la barre de mesure
                if (!previousbarPoints || i - previousbarPoints > 100) {
                    previousbarPoints = i
                    bars.push(i)
                   console.log(i + "   " + barPoints )
                }
            }else  if (barPoints == interline) {// note ou barre de note
                previousNotePoints = i
            }
        }
        return bars
    },

    findPageZones: function (pdfName, pageNum, callback) {
        ZonesDetector.getPageImage(pdfName, pageNum, function (err, image) {
            if (err) {
                return callback(err)
            }
            var zones = ZonesDetector.detectPageScoreLines(image);


            return callback(null, zones)
        })

    },


}

module.exports = ZonesDetector;

var obj = {
    "generatePart": "1",
    "part": "XXX",
    "margin": "15",
    "pdfName": "IMSLP497429-PMLP649379-zelenka_requiem_45_conducteur",
    "zonesStr": "{\"0\":[],\"1\":[{\"x\":10,\"y\":233,\"width\":585,\"height\":50,\"page\":1,\"voice\":\"aa\"},{\"x\":10,\"y\":345,\"width\":585,\"height\":50,\"page\":1,\"voice\":\"BB\"}],\"2\":[{\"x\":10,\"y\":43,\"width\":585,\"height\":50,\"page\":2},{\"x\":10,\"y\":115,\"width\":585,\"height\":50,\"page\":2}]}",
    "imgScaleCoef": "0.35378151260504204"
}


if (false) {


    ZonesDetector.findPageZones(obj.pdfName, 2, function (err, result) {

    })

}