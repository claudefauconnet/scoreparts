var scoreParts = (function () {
    var self = {};
self.zones={}

    var imagesDir = "./data/images/";

    var xxx = window.document.location
    self.listScores = function () {
        $('#scoresSelect')
            .find('option')
            .remove()
        var payload = {
            listScores: 1
        }
        $.ajax({
            type: "POST",
            url: "./score",
            data: payload,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {
                data.splice(0, 0, "");
                for (var i = 0; i < data.length; i++) {
                    item = data[i].replace(".pdf", "");
                    $("#scoresSelect").append($('<option>', {
                        text: item,
                        value: item
                    }));
                }
                ;

            }, error: function (err) {
                console.log(err);
            }
        });

    }


    self.openFirstPdfPage = function (message) {

        var name = $('#scoresSelect').val();
        $("#scoresSelect").val(name);
        if (name == "")
            return;
        var name2 = imagesDir + name + "-0.png";
        // ScoreDraw.drawImage(name2);
        ///  return
        scoreD3.deleteAllZones();
      //  scoreD3.drawImage(name2);
        Paper.drawImage(name2)
        self.zones= {}
        self.currentPage = 0;
        $("#page").html(" " + (self.currentPage + 1));
      //  $('#controlPanelDiv').css('visibility', 'visible');
        if (!message)
            message = "";
        message += "<ul> <li>pour créer une zone de découpage : clic sur le milieu d'une portée</li>";
        message += "<li>pour effacer une zone : clic+Alt sur la zone</li>";
        message += "<li>pour déplacer une zone : glisser sur la zone avec la souris</li>";
        message += "<li>pour déplacer toutes les zones d'une page  : clic+Ctl sur une zone</li>";
        message += "<li>Une fois le découpage terminé sur toutes les pages, cliquer sur le bouton \"générer voix (pdf)\"</li>";
        message += "<ul> ";
        self.setMessage(message, "blue")

    }

    self.updateImage = function (link) {

        Paper.drawImage(link)

    }


    self.nextPage = function () {
        Paper.getPageZones()
        self.currentPage += 1;
        currentZoneInPage = 0;
        var name = $('#scoresSelect').val() + "-" + (self.currentPage);
        // drawImage(name);
        self.updateImage(imagesDir + name + ".png");
        $("#page").html(" " + (self.currentPage + 1));

        $("#duplicateZonesButton").css("visibility", "visible");

    }
    self.previousPage = function () {
        if (self.currentPage == 0)
            return;
        self.currentPage -= 1;

        currentZoneInPage = 0;
        var name = $('#scoresSelect').val() + "-" + (self.currentPage);
        self.updateImage(imagesDir + name + ".png");
        $("#page").html(" " + (self.currentPage + 1));
        $("#duplicateZonesButton").css("visibility", "visible");

    }

    self.uploadFormData = function () {
      //  $('#controlPanelDiv').css('visibility', 'hidden');
        // $("#pdfFile").value="";
        var form = $("#uploadForm")[0]
        var formData = new FormData(form);
        $("#waitImg").css("visibility", "visible");
        self.setMessage("import en cours <br>cela peut prendre plusieurs minutes, <br>merci de patienter ...", "blue")
        $.ajax({
            url: './pdfUpload',
            data: formData,
            type: 'POST',
            contentType: false, // NEEDED, DON'T OMIT THIS (requires jQuery 1.6+)
            processData: false, // NEEDED, DON'T OMIT THIS
            success: function (data, textStatus, jqXHR) {
                $("#waitImg").css("visibility", "hidden");

                if (data.bigFile) {

                    self.setMessage("big file " + data.bigFile);


                }


                var durationStr = "durée :" + Math.round(data.duration / 1000) + "sec."
                var message = "Import terminé " + durationStr + " pages,<br> vous pouvez commencer le découpage"

                self.setMessage(message, "blue")
                var xx = data;
                $("#scoresSelect").append($('<option>', {
                    text: data.pdfName,
                    value: data.pdfName,
                    selected: "selected"
                }));
                // self.listScores();
                //   $("#scoresSelect").val(data.pdfName);
                self.openFirstPdfPage(message);
                document.getElementById("pdfFileInput").value = "";

            },
            error: function (err) {
                $("#waitImg").css("visibility", "hidden");
                self.setMessage("ERREUR lors del'import" + err.responseText, "red")
                document.getElementById("pdfFileInput").value = "";

                var xx = err;

            }

        });
    }


    self.saveInstrumentLinePosition = function () {
        self.generateInstrumentScore(function (err, result) {

        })

    }


    self.getInstrumentOnpage = function () {


    }

    self.generateInstrumentScore = function (part, orderedZones, callback) {
        var page = scoreParts.currentPage
       var  zones= Paper.getPageZones()
        self.currentZones=zones
        scoreParts.zones[page]=zones
        if (!part) {

            part = prompt("nom de la partie");
        }
        if (!part || part == "")
            return;
        self.setMessage("  La partie est en cours de génération , merci de patienter ...", " blue");
        $('body').css("cursor", "progress");
        var pdfName = $('#scoresSelect').val();


      /*  if (!orderedZones)
            orderedZones = self.getOrderedZones();*/

        var margin = parseInt($("#zoneMargin").val());
        var zonesStr = JSON.stringify(self.zones);
        self.currentZones=self.zones
        var payload = {
            generatePart: 1,
            part: part,
            margin: margin,
            pdfName: pdfName,
            zonesStr: zonesStr,
            imgScaleCoef: scoreParts.coef,
        }

        $("#waitImg").css("visibility", "visible");
        $.ajax({
            type: "POST",
            url: "./score",
            data: payload,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {
                $("#waitImg").css("visibility", "hidden");

                $("#duplicateZonesButton2").css("visibility", "visible");
                var message = "la partition " + part + " est générée , <a target='_blanck' href='" + document.location.href + data.result + "'>télécharger</a>"
                message += "<br> pour l'imprimer pensez à cocher l'option 'ajuster à la page' dans les paramètres d'impression "
                self.setMessage(message, "blue");


                $('body').css('cursor', 'default');
                if (callback)
                    return callback()

            },
            error: function (err) {
                $("#waitImg").css("visibility", "hidden");
                self.setMessage(err, "red")
                if (callback)
                    return callback(err)
            }
        });


    }

self.autoDetectPageZones=function(callback){
    var pdfName = $('#scoresSelect').val();
    var payload = {
        findPageZones: 1,
        pdfName: pdfName,
        pageNum:self.currentPage

    }

    $("#waitImg").css("visibility", "visible");
    $.ajax({
        type: "POST",
        url: "./score",
        data: payload,
        dataType: "json",
        success: function (data, textStatus, jqXHR) {
            if(callback){
                return callback(null,data)
            }
        var zoneHeight=parseInt($("#zoneHeight").val())
            Paper.drawZonesFromY(data,zoneHeight)

        },
        error: function (err) {
            $("#waitImg").css("visibility", "hidden");
            self.setMessage(err, "red")

        }
    });


}


self.registerZoneVoices=function(){
   self.currentZones= Paper.getPageZones()

}




    self.repeatZonesFromPreviousPage = function (button) {// from previous page


        self.autoDetectPageZones(function(err, yArray) {
          var newZones=[]
            self.currentZones.forEach(function(zone,index){
                if(index<yArray.length) {
                    zone.y = yArray[index] * scoreParts.coef
                    newZones.push(zone)
                }
            })
            Paper.drawZones( newZones)


        })
    }


    self.startAllOver = function () {
        if(confirm("recommencer tout ?"))
        self.openFirstPdfPage();
    }


    self.setMessage = function (message, color) {
        $("#message").css("visibility", "visible");
        if (!color) {
            color = "black";
        }
        $("#message").css("color", color);
        $("#message").html(message);


    }


    self.getInfos = function () {

        self.setMessage("logiciel open source de découpage de partition sous licence MIT <br><a href='mailto://claude.fauconnet@neuf.fr'>Claude Fauconnet</a><br><a href='https://github.com/claudefauconnet/scoreparts'>Source</a>");


    }

    return self;


})()