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

    isPixelBlack:function(image,x,y){
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
        var interligne=0
var previousJ=0
        for (var j = 0; j < image.bitmap.height; j++) {
            var hPoints = 0

            for (var i = 10; i < image.bitmap.width; i+=3) {
                if(ZonesDetector.isPixelBlack(image,i,j)){
                    hPoints += 1
                }
                if (j-previousJ>5) {
                    if (hPoints > 400) {
                        lines.push( j)
                        if (lines.length == 2) {
                            interligne = lines[1] - lines[0]
                        }
                        previousJ = j
                        break;
                    } else {

                    }
                }
            }
            
            
         

        }
        var y=interligne
        var x = lines;
        var zones=[]
        for(var i=0;i<lines.length;i+=5){
            zones.push(lines[i])
        }

        return zones





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


    findPageZonesXXX: function (pdfName, pageNum, callback) {
        ZonesDetector.getPageImage(pdfName, pageNum, function (err, image) {
            if (err) {
                return callback(err)
            }


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


    }


}

module.exports = ZonesDetector;