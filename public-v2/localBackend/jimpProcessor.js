// Port browser de bin/jimpProxy.js — preuve de portabilité PWA.
// Seul changement vs serveur : fs.readFileSync retiré. getImage/crop reçoivent
// directement un ArrayBuffer/Uint8Array (issu d'un fetch côté client / pdfjs en
// production) au lieu d'un chemin fichier. Toute la logique crop/blit/buffer est
// identique au serveur — c'est ce qui prouve que Jimp tourne sans Node.
import { Jimp } from 'https://cdn.jsdelivr.net/npm/jimp@1.6.0/+esm';

async function _getImage(inputBuffer) {
  return await Jimp.read(inputBuffer);
}

async function _blit(toImage, image, x, y) {
  return await toImage.blit({ src: image, x: x, y: y });
}

async function _getBuffer(image) {
  return await image.getBuffer('image/png', {
    quality: 50,
  });
}

async function _crop(inputBuffer, x, y, w, h) {
  var image = await Jimp.read(inputBuffer);
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
export function getImage(inputBuffer, callback) {
  _getImage(inputBuffer).then(
    (image) => {
      image = image.greyscale();
      image = image.contrast(1);
      return callback(null, image);
    },
    (err) => callback(err)
  );
}

export function crop(inputBuffer, x, y, w, h, callback) {
  _crop(inputBuffer, x, y, w, h).then(
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
