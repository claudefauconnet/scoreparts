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
     /*   scoreD3.clearAllZonesRect();
        self.drawRectsForPage(self.currentPage);
        d3.select("svg").selectAll(".clipZone").remove();
        d3.selectAll(".img").attr("xlink:href", function (d) {
            return link;
        });*/
    }


    self.nextPage = function () {
        Paper.createPagesZones()
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

        Paper.createPagesZones()
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





    self.repeatZonesFromPreviousPage = function (button) {// from previous page


        var newZones = [];
        for (var key in scoreD3.pagesZoneData) {

            var zone = scoreD3.pagesZoneData[key];
            if (zone.page == self.currentPage - 1) {
                var newZone = jQuery.extend(true, {}, zone);//clone
                var zoneId = "p" + (zone.page + 1) + "z" + zone.zoneIndex;
                newZone.label = zoneId;
                newZone.divId = zoneId;
                newZone.page = self.currentPage;
                newZones.push(newZone);

            }
        }
        for (var i = 0; i < newZones.length; i++) {
            scoreD3.pagesZoneData[newZones[i].divId] = newZones[i];

        }
        scoreD3.drawZoneRect(newZones);
        $(button).css("visibility", "hidden");


    }
    self.repeatZonesFromPreviousPart = function (button) {


        var zones = [];
        for (var key in scoreD3.pagesZoneData) {

            var zone = scoreD3.pagesZoneData[key];
            if (zone.page == self.currentPage) {
                zones.push(zone);

            }
        }

        scoreD3.drawZoneRect(zones);
        $(button).css("visibility", "hidden");
    }
    self.drawRectsForPage = function (page) {
        var zones = [];
        for (var key in scoreD3.pagesZoneData) {

            var zone = scoreD3.pagesZoneData[key];
            if (zone.page == page) {
                zones.push(zone);

            }
        }
        if (zones.length > 0)
            scoreD3.drawZoneRect(zones);
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

    self.getPageNextZoneIndex = function (page) {
        for (var key in self.pagesZoneData) {
            var index = 0;
            if (self.pagesZoneData[key].page == page)
                index = Math.max(index, self.pagesZoneData[key].zoneIndex)


        }
        return index;
    }

    self.getInfos = function () {

        self.setMessage("logiciel open source de découpage de partition sous licence MIT <br><a href='mailto://claude.fauconnet@neuf.fr'>Claude Fauconnet</a><br><a href='https://github.com/claudefauconnet/scoreparts'>Source</a>");


    }

    return self;


})()