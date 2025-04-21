
import { Jimp } from "jimp";







 async function _getImage(imageFile){
   return await Jimp.read(imageFile)

}

async function _writeImage(image,file){
    return await image.write(file)

}


async function _blit(toImage,image,x,y){
    return  await toImage.blit({ src: image, x: x, y: y });


}

async  function _getBuffer(image){
  return  await image.getBuffer("image/png", {
        quality: 50,
    });
}



async function _crop(imageFile,x,y,w,h){
    var image = await Jimp.read(imageFile);

   // image =new Jimp({width:w, height:h, color:0x000000FF})
  var croped= image.crop({
        x:x
    ,y:y
        ,w:w,
        h:h});
    return croped

}

export  function getImage(imageFile,callback){
    var promise=_getImage(imageFile)
    promise.then((image) => {
        return callback(null, image)
    })
}

 export function crop(imageFile,x,y,w,h,callback){
    var promise=_crop(imageFile,x,y,w,h)
    promise.then((image) => {
        return callback(null, image)
    })
}

export function createImage(w,h,callback){
   var image =new Jimp({width:w, height:h, color:0xFFFFFFFF})
        return callback(null, image)

}


export function blitImage(toImage,bitmap,x,y,callback){

    var image2=Jimp.fromBitmap(bitmap)
    var newImage=toImage.composite(image2,x,y)
  //  getImageColors(newImage)
    return callback(null, newImage)


}

export function getBuffer(image,callback) {
var promise=_getBuffer(image)
    promise.then((buffer) => {
        return callback(null, buffer)
    })
}


export function getImageColors(image){
     var map={}
     for(var i=0;i<image.bitmap.width;i++) {
        for (var j = 0; j < image.bitmap.height; j++) {

            var color= image.getPixelColor(i, j);
            var x=color
            if(color!=4294967295) {
                if (!map[color]) {
                    map[color] = 0
                }
                map[color]+=1
            }

        }
    }

   return map
}

export function writeImage(image,file,callback){
    var promise=_writeImage(image,file)
    promise.then((result) => {
        return callback(null, result)
    })
}


