var scoreParts = (function () {
    var self = {};
    self.allPagesZones = {pages: {}, title: ""}
    self.currentZones = []
    var imagesDir = "./data/images/";

    self.openFirstPdfPage = function (clearAll) {

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


            var pageImage = imagesDir + pdfName + "-0.png";
            Paper.drawImage(pageImage)
            self.voices = []
            self.currentPage = 0;
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

        })
    }


    self.changePage = function (newPage) {

        var zones = Paper.getPageZones()
        self.currentZones = zones
        self.allPagesZones.pages[self.currentPage] = zones
        self.currentPage = newPage;
        var name = $('#scoresSelect').val() + "-" + (self.currentPage);

        Paper.drawImage(imagesDir + name + ".png");
        var zones = self.allPagesZones.pages[self.currentPage]
        if (zones && zones.length > 0) {
            self.currentZones = zones
            Paper.drawZones(zones)
        }

        $("#page").html(" " + (self.currentPage));


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

    self.restartAll = function () {
        self.deletePageZones()
        if (confirm("recommencer tout ?")) {
            self.openFirstPdfPage(true);
        }
    }

    self.deletePageZones = function () {
        var page = $("#currentPage").val()

        delete self.allPagesZones.pages[page]
        Paper.deleteZones()
    }


    self.registerZoneVoices = function () {
        self.currentZones = Paper.getPageZones()

    }

    self.repeatZonesFromPreviousPage = function (button) {// from previous page


        Proxy.autoDetectPageZones(function (err, data) {
            var newZones = []

            self.currentZones.forEach(function (zone, index) {

                if (index < data.topLines.length) {
                    zone.y = (data.topLines[index] * scoreParts.coef) - (2 * data.interline * scoreParts.coef),
                        newZones.push(zone)
                }
            })
            Paper.drawZones(newZones)


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


    self.getInfos = function () {

        self.setMessage("logiciel open source de découpage de partition sous licence MIT <br><a href='mailto://claude.fauconnet@neuf.fr'>Claude Fauconnet</a><br><a href='https://github.com/claudefauconnet/scoreparts'>Source</a>");


    }

    return self;


})()