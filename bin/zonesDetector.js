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
        var x = color
        if (color != 4294967295) {
            var hexaStr = (color).toString(16)
            var r = parseInt(hexaStr.substring(0, 2), 16)
            var g = parseInt(hexaStr.substring(2, 4), 16)
            var b = parseInt(hexaStr.substring(4, 6), 16)
            const brightness = (r + g + b) / 3;
            const bw = brightness < 128 ? brightness : 255;
            if ((r == 255 || brightness > 128)) {
                return true;
            }
            return false
        }
        return false;

    },

    detectPageScoreLines: function (image) {


        var lines = []
        var interline = 0
        var previousJ = 0
        var firstVerticalLine=0
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

        //detect vertical line;
        for (var i = 0; i < image.bitmap.width; i ++) {
            var vPoints = 0
        for (var j = 10; j < image.bitmap.height; j+=3) {

            if (ZonesDetector.isPixelBlack(image, i, j)) {
                vPoints += 1


            }


                if (!firstVerticalLine && vPoints > 50) {
                    firstVerticalLine = i;
                    break ;
                    i=image.bitmap.width
                }
            }
        }



        var y = interline
        var x = lines;
        var topLines = []
        for (var i = 0; i < lines.length; i += 5) {
            topLines.push(lines[i])
        }

        return {topLines:topLines,interline:interline,firstVerticalLine:firstVerticalLine}


        return lines;


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