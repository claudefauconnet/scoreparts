var scoreParts = (function () {
    var self = {};
    self.allPagesZones = {pages: {}, title: ""}
    self.currentZones = []

    self.modified=false
    var imagesDir = "./data/images/";

    self.openFirstPdfPage = function (clearAll) {
        document.addEventListener("contextmenu", e => e.preventDefault());


            self.writeCurrentPageZones()

        


        Proxy.saveZones(function (err) {
            if (err) {
                alert(err.responseText || err)
            }


            var pdfName = $('#scoresSelect').val();
            $("#scoresSelect").val(pdfName);
            if (pdfName == "") {
                return;
            }
            self.pdfName = pdfName


            Proxy.loadZones(function (err, data) {
                if (err || clearAll) {
                    self.allPagesZones = {pages: {}, title: "", pdfName: self.pdfName, date: new Date(), author: "cf"}
                } else {
                    self.allPagesZones = data
                }


                var movements = ["", "Nouveau"]
                for (var page in scoreParts.allPagesZones.pages) {
                    scoreParts.allPagesZones.pages[page].forEach(function (zone) {
                        if (zone.movement && movements.indexOf(zone.movement) < 0) {
                            movements.push(zone.movement)
                        }

                    })
                }

                Common.fillSelectOptions("movementSelect", movements, false)


                var pageImage = imagesDir + pdfName + "-0.png";
                //  Paper.drawImage(pageImage)

                self.voices = []
                self.currentPage = 0;
                self.changePage(self.currentPage)
                $("#page").html(" " + (self.currentPage + 1));
                //  $('#controlPanelDiv').css('visibility', 'visible');
                var message = ""
                message += "<ul> <li>pour créer une zone de découpage : clic sur le milieu d'une portée</li>";
                message += "<li>pour effacer une zone : clic+Alt sur la zone</li>";
                message += "<li>pour déplacer une zone : glisser sur la zone avec la souris</li>";
                message += "<li>pour déplacer toutes les zones d'une page  : clic+Ctl sur une zone</li>";
                message += "<li>Une fois le découpage terminé sur toutes les pages, cliquer sur le bouton \"générer voix (pdf)\"</li>";
                message += "<ul> ";
                self.setMessage(message, "blue")
                self.margin = parseInt($("#zoneMargin").val()) || 10;


            })
        })
    }


    self.writeCurrentPageZones = function () {
        var zones = Paper.getPageZones()
        if (zones.length == 0) {
            return
        }
        self.currentZones = zones
        self.allPagesZones.pages[self.currentPage] = zones


    }

    self.changePage = function (newPage, forceSave) {


            ;// to be done
            self.writeCurrentPageZones()



        Proxy.saveZones(function (err) {
            if (err) {
                alert(err.responseText || err)
            }

            self.currentPage = newPage;
            var name = $('#scoresSelect').val() + "-" + (self.currentPage);

            Paper.drawImage(imagesDir + name + ".png");
            var zones = self.allPagesZones.pages[self.currentPage]
            if (zones && zones.length > 0) {
                self.currentZones = zones
                Paper.drawZones(zones)

            }

            $("#page").html(" " + (self.currentPage+1));

        })
    }


    self.nextPage = function () {

        self.changePage(self.currentPage + 1)

        $("#duplicateZonesButton").css("visibility", "visible");


    }
    self.previousPage = function () {
        if (self.currentPage == 0) {
            return;
        }

        self.changePage(self.currentPage - 1)
        $("#duplicateZonesButton").css("visibility", "visible");

    }

    self.goToPage = function () {
        var page = prompt("Aller à page numero")
        if (page) {
            var page = parseInt(page)
            self.changePage(page)
        }
    }

    self.restartAll = function () {

        if (confirm("recommencer tout ?")) {
            for(var pageNum in self.allPagesZones.pages){
                self.deletePageZones(pageNum)
            }

            self.openFirstPdfPage(true);
        }
    }

    self.deletePageZones = function (page) {

            //  var page = $("#currentPage").val()
            scoreParts.modified = true
         self.allPagesZones.pages[page || self.currentPage]=[]
            Paper.deleteZones()

    }




    self.repeatZonesFromPreviousPage = function (detect) {// from previous page


        Proxy.autoDetectPageZones(function (err, data) {
            var newZones = []
            var zoneHeights = []
            var zoneVoices = []
            self.currentZones.forEach(function (zone, index) {
                if(data.topLines[index]) {
                    zoneHeights.push(zone.height)
                    zoneVoices.push(zone.voice || null)

                }
            })
            Paper.drawAutoDetectedZones(data, zoneHeights,zoneVoices)


        })
    }


    self.setMessage = function (message, color) {
        $("#message").css("visibility", "visible");
        if (!color) {
            color = "black";
        }
        $("#message").css("color", color);
        $("#message").html(message);


    }

    self.openSelectMovement = function () {

        var movement = $("#movementSelect").val()
        if (!movement) {
            return;
        }
        if (movement == "Nouveau") {
            var movement = prompt("nom du mouvement")
            if (!movement) {
                return;
            }
            $('#movementSelect').append($('<option>', {
                value: movement,
                text: movement
            }));
            $('#movementSelect').val(movement)
        }


        self.currentMovement = movement
        var stop = false
        var movementPage = 0
        for (var page in scoreParts.allPagesZones.pages) {
            scoreParts.allPagesZones.pages[page].forEach(function (zone) {
                if (!stop && zone.movement == self.currentMovement) {
                    movementPage = zone.page;
                    return stop = true
                }

            })
        }
        scoreParts.writeCurrentPageZones()
      //  self.deletePageZones()
        scoreParts.changePage(parseInt(movementPage,));
    }


    self.getInfos = function () {

        self.setMessage("logiciel open source de découpage de partition sous licence MIT <br><a href='mailto://claude.fauconnet@neuf.fr'>Claude Fauconnet</a><br><a href='https://github.com/claudefauconnet/scoreparts'>Source</a>");


    }

    self.copyMeasuresOnAllVoices = function (zones,numOfVoices) {
        var zonesWithMeasures = []
        for (var page in scoreParts.allPagesZones.pages) {
            var zones = scoreParts.allPagesZones.pages[page]
            scoreParts.modified=true
            for (var i = 0; i < zones.length; i++) {
                if (i == 0 || numOfVoices % i == 0) {
                    currentMeasure = zones[i].measure
                } else {
                    zones[i].measure = currentMeasure
                }
            }


        }


    }

    self.clearMeasures = function () {
        var zonesWithMeasures = []
        scoreParts.modified=true
        for (var page in scoreParts.allPagesZones.pages) {
            scoreParts.allPagesZones.pages[parseInt(page)].forEach(function (zone) {
                if (zone.movement == scoreParts.currentMovement) {
                    delete zone.measure
                }


            })
        }

        Proxy.saveZones(function (err) {
            if (err) {
                alert(err.responseText || err)
            }
        })

    }

    return self;


})()