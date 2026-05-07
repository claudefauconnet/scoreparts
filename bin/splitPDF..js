
var scoreSplitter=require('./scoreSplitter.')
var path=require("path")
var splitPDF={

    split:function(pdfPath,targetDir){
      //  var dir=pdfPath.substring(0,pdfPath.lastIndexOf(path.sep))
        scoreSplitter.pdfToImages(pdfPath,"medium",{targetDir:targetDir},function(err, result){

        })

    }





}

module.exports = splitPDF
var pdfPath="C:\\Users\\claud\\Downloads\\IMSLP91638-PMLP28008-Corelli_Concerto_Op6No8_Christmas_Ripieno_strings.pdf"
var targetDir="D:\\musique\\testPDF\\"
splitPDF.split(pdfPath,targetDir )