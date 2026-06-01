import { Jimp } from 'jimp';
import fs from 'fs';

async function _getImage(imageFile) {
  const buffer = fs.readFileSync(imageFile);
  return await Jimp.read(buffer);
}

async function _writeImage(image, file) {
  return await image.write(file);
}

async function _blit(toImage, image, x, y) {
  return await toImage.blit({ src: image, x: x, y: y });
}

async function _getBuffer(image) {
  return await image.getBuffer('image/png', {
    quality: 50,
  });
}

async function _crop(imageFile, x, y, w, h) {
  const buffer = fs.readFileSync(imageFile);
  var image = await Jimp.read(buffer);
  // Clamp à l'intérieur des dimensions réelles : une zone peut déborder
  // (ex. largeur fractionnaire 1 → pixels > largeur image) et Jimp lèverait.
  var maxW = image.bitmap.width;
  var maxH = image.bitmap.height;
  var cropX = Math.max(0, Math.min(x, maxW - 1));
  var cropY = Math.max(0, Math.min(y, maxH - 1));
  var cropW = Math.max(1, Math.min(w, maxW - cropX));
  var cropH = Math.max(1, Math.min(h, maxH - cropY));
  try {
    var cropped = image.crop({ x: cropX, y: cropY, w: cropW, h: cropH });
    return cropped;
  } catch (e) {
    return e;
  }
}

// .then(onOk, onErr) au lieu de .then().catch() : onErr n'attrape QUE le rejet
// de la promesse Jimp. Sinon un throw synchrone dans la suite du callback
// (chaîne async) déclencherait .catch → double appel du callback.
export function getImage(imageFile, callback) {
  _getImage(imageFile).then(
    (image) => {
      image = image.greyscale();
      image = image.contrast(1);
      return callback(null, image);
    },
    (err) => callback(err)
  );
}

export function crop(imageFile, x, y, w, h, callback) {
  _crop(imageFile, x, y, w, h).then(
    (image) => {
      if (image instanceof Error) return callback(image.message);
      return callback(null, image);
    },
    (err) => callback(err)
  );
}

export function createImage(w, h, callback) {
  var image = new Jimp({ width: w, height: h, color: 0xffffffff });
  return callback(null, image);
}

export function blitImage(toImage, bitmap, x, y, callback) {
  var image2 = Jimp.fromBitmap(bitmap);
  var newImage = toImage.composite(image2, x, y);
  return callback(null, newImage);
}

export function getBuffer(image, callback) {
  _getBuffer(image).then(
    (buffer) => callback(null, buffer),
    (err) => callback(err)
  );
}

export function getImageColors(image) {
  var map = {};
  for (let i = 0; i < image.bitmap.width; i++) {
    for (let j = 0; j < image.bitmap.height; j++) {
      var color = image.getPixelColor(i, j);
      if (color != 4294967295) {
        if (!map[color]) {
          map[color] = 0;
        }
        map[color] += 1;
      }
    }
  }
  return map;
}

export function writeImage(image, file, callback) {
  var promise = _writeImage(image, file);
  promise.then((result) => {
    return callback(null, result);
  });
}
