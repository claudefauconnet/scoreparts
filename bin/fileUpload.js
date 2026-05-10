import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);

var uploadDir = path.resolve(__dirname, '../data/pdf');

var diskStorage = multer.diskStorage({
  destination: function (request, file, callback) {
    callback(null, uploadDir);
  },
  filename: function (request, file, callback) {
    console.log(file);
    callback(null, file.originalname.replace(/ /g, '_'));
  },
});
var memStorage = multer.memoryStorage();

var fileUpload = {
  maxUploadSize: 50 * 1000 * 1000,
  upload: function (req, fieldName, callback) {
    var storage = diskStorage;
    var upload = multer({
      storage: storage,
      limits: { fileSize: fileUpload.maxUploadSize },
    }).single(fieldName);
    upload(req, null, function (err, data) {
      if (err) {
        callback('Error Occured' + err);
        return;
      }
      callback(null, req.file, req.body);
    });
  },
  uploadData: async function (req, callback) {
    var storage = memStorage;
    var upload = multer({
      storage: storage,
      limits: { fileSize: fileUpload.maxUploadSize },
    }).single('xml');
    upload(req, null, async function (err, data) {
      if (err) {
        if (callback) callback('Error Occured' + err);
        return;
      }
      if (req.body.callback) {
        var fileData = '' + req.file.buffer;
        var dotIndex = req.body.callback.indexOf('.');
        if (dotIndex > -1) {
          var moduleName = req.body.callback.substring(0, dotIndex);
          var functionName = req.body.callback.substring(dotIndex + 1);
          var pathStr = './transform/' + moduleName + '.js';
          console.log(pathStr);
          var mod = await import(pathStr);
          if (callback) mod[functionName](fileData, callback);
          else mod[functionName](fileData, null);
        }
      }
    });
  },
};

export default fileUpload;
