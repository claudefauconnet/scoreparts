var scoreParts = (function () {
    var self = {};
    self.allPagesZones = {}
    self.currentZones=[]
    var imagesDir = "./data/images/";

    self.openFirstPdfPage = function (message) {

        var name = $('#scoresSelect').val();
        $("#scoresSelect").val(name);
        if (name == "") {
            return;
        }
        var name2 = imagesDir + name + "-0.png";
        Paper.drawImage(name2)
        self.allPagesZones = {}
        self.voices = []
        self.currentPage = 0;
        $("#page").html(" " + (self.currentPage + 1));
        //  $('#controlPanelDiv').css('visibility', 'visible');
        if (!message) {
            message = "";
        }
        message += "<ul> <li>pour créer une zone de découpage : clic sur le milieu d'une portée</li>";
        message += "<li>pour effacer une zone : clic+Alt sur la zone</li>";
        message += "<li>pour déplacer une zone : glisser sur la zone avec la souris</li>";
        message += "<li>pour déplacer toutes les zones d'une page  : clic+Ctl sur une zone</li>";
        message += "<li>Une fois le découpage terminé sur toutes les pages, cliquer sur le bouton \"générer voix (pdf)\"</li>";
        message += "<ul> ";
        self.setMessage(message, "blue")

    }


    self.nextPage = function () {
        Paper.getPageZones()
        var  zones= Paper.getPageZones()
        self.currentZones=zones
        self.allPagesZones[self.currentPage]=zones
        self.currentPage += 1;

        var name = $('#scoresSelect').val() + "-" + (self.currentPage);
        // drawImage(name);
        Paper.drawImage(imagesDir + name + ".png");
        $("#page").html(" " + (self.currentPage + 1));

        $("#duplicateZonesButton").css("visibility", "visible");



    }
    self.previousPage = function () {
        if (self.currentPage == 0) {
            return;
        }
        self.currentPage -= 1;
        var name = $('#scoresSelect').val() + "-" + (self.currentPage);
        Paper.drawImage(imagesDir + name + ".png");
        var zones=self.allPagesZones[ self.currentPage]
        self.currentZones=zones
        Paper.drawZones(zones)

        $("#page").html(" " + (self.currentPage + 1));
        $("#duplicateZonesButton").css("visibility", "visible");

    }

    self.restartAll = function () {
        if (confirm("recommencer tout ?")) {
            self.openFirstPdfPage();
        }
    }

    self.deletePageZones = function () {
        var page = $("#currentPage").val()

        delete self.allPagesZones[page]
        Paper.deleteZones()
    }


    self.registerZoneVoices = function () {
        self.currentZones = Paper.getPageZones()

    }

    self.repeatZonesFromPreviousPage = function (button) {// from previous page


        Proxy.autoDetectPageZones(function (err, yArray) {
            var newZones = []
            self.currentZones.forEach(function (zone, index) {
                if (index < yArray.length) {
                    zone.y = yArray[index] * scoreParts.coef
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