var fs = require('fs');
//var PDFImage = require("pdf-image").PDFImage;
var Jimp = require("jimp");
var async = require('async');
var PDFDocument = require('pdfkit');
var path = require('path');
var execSync = require('child_process').execSync;
var scoreSplitter=require('../bin/scoreSplitter..js')

/*

bin\gswin64.exe -sDEVICE=pdfwrite -dNOPAUSE -dBATCH -dSAFER  -dFirstPage=8 -dLastPage=9 -sOutputFile=C:\Users\claud\Downloads\test.pdf C:\Users\claud\Downloads\Suite_The_Fairy_Queen_Complete.pdf

 */
var pdfSplitter = {

    splitPdf:function(filePath, nPages) {
        scoreSplitter.pdfToImages(filePath,"low",{},function(err,result){

        })

    },





}
/*scoreSplitter.pdfToImages("Rameau1.pdf", function (err, result) {
    xx = err;
});*/
module.exports = pdfSplitter;
var filePath="C:\\Users\\claud\\Downloads\\AlcinaProjectAteliersEuInstrumentation.pdf"
pdfSplitter.splitPdf(filePath,3)