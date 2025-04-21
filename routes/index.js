var express = require('express');
var router = express.Router();
var scoreSplitter = require("../bin/scoreSplitter..js");
var fileUpload = require('../bin/fileUpload.js');

var fs=require('fs')
var path=require('path')

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.post('/pdfUpload', function (req, response) {
    fileUpload.upload(req,"pdfFile", function (error, file,reqBody) {
        if (error) {
            return processResponse(response, error);
        }
        if(file.size>6000000){
            return processResponse(response, null,{bigFile:file.size});
        }
        if (!file || !file.path) {
            return processResponse(response, "wrong file", null);
        }
        scoreSplitter.pdfToImages(file.path, reqBody.imageQuality,{},function (error, result) {
            processResponse(response, error, result)
        });
    });
});


router.post('/score', function (req, response, next) {


    if (req.body && req.body.listScores) {
        scoreSplitter.listScores(function (error, result) {
            processResponse(response, error, result)
        })

    }
    if (req.body && req.body.split) {
        scoreSplitter.split(req.body.image, function (error, result) {
            processResponse(response, error, result)
        })


    }
    if (req.body && req.body.generatePart) {
        scoreSplitter.generatePart(req.body.pdfName, req.body.part, req.body.zonesStr,parseInt(req.body.margin), parseFloat(req.body.imgScaleCoef),function (error, result) {
            processResponse(response, error, result)
        })


    }


});
router.post('/file', function (req, response, next) {


    if (req.body && req.body.save) {
        var dirPath=path.resolve(__dirname,"../data/")
        fs.writeFile(dirPath+path.sep+req.body.filePath,req.body.contentStr, null,function(error, result){

            processResponse(response, error, result)
        })

    }
    if (req.body && req.body.load) {
        var dirPath=path.resolve(__dirname,"../data/")
        fs.readFile(dirPath+path.sep+req.body.filePath, null,function(error, result){

            processResponse(response, error, result)
        })


    }


});


function processResponse(response, error, result) {
    if (response && !response.finished) {

        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // If needed
        response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,contenttype'); // If needed
        response.setHeader('Access-Control-Allow-Credentials', true); // If needed


        if (error) {
            if (typeof error == "object") {
                error = JSON.stringify(error, null, 2);
            }
            console.log("ERROR !!" + error);
            //  socket.message("ERROR !!" + error);
            response.status(404).send({ERROR: error});

        }
        else if (!result) {
            response.status(404).send("no result");
        } else {

            if (typeof result == "string") {
                resultObj = {result: result};
                //     socket.message(resultObj);
                response.send(JSON.stringify(resultObj));
            }
            else {
                if (result.contentType && result.data) {
                    response.setHeader('Content-type', result.contentType);
                    if (typeof result.data == "object")
                        response.send(JSON.stringify(result.data));
                    else
                        response.send(result.data);
                }
                else {
                    var resultObj = result;
                    // response.send(JSON.stringify(resultObj));
                    response.send(resultObj);
                }
            }
        }


    }


}


module.exports = router;


