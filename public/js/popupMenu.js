var popupMenu = (function () {

    var self = {};


    self.showGraphPopupMenu = function (zoneGroup, windowPoint, paperPoint) {
        if (!zoneGroup) {
            return;
        }

        self.currentZoneGroup = zoneGroup
        self.currentZone = zoneGroup.getItems()[0]
        self.currentPaperPoint = paperPoint


        var html = "";
        if (true) {
            //edge
            html = '    <span class="popupMenuItem" onclick="popupMenu.clearZone()"> Effacer zone</span>';
            html += '    <span class="popupMenuItem" onclick="popupMenu.setMeasure()"> Ajouter Numero mesure</span>';
            html += '    <span class="popupMenuItem" onclick="popupMenu.addText()"> Ajouter texte</span>';
        } else {
            html = '    <span class="popupMenuItem" onclick="GraphController.graphActions.removeNodeFromGraph();"> Remove Node</span>';
        }


        $("#popupMenuWidgetDiv").html(html);
        //   point.x = event.x;
        //   point.y = event.y;
        PopupMenuWidget.showPopup(windowPoint, "popupMenuWidgetDiv");
    };

    self.clearZone = function () {
        Paper.deleteZone(self.currentZone)
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv")
    }


    self.setMeasure = function () {
        var number = prompt("measure number")
        if (number) {


            self.currentZone.data.measure = {x: self.currentPaperPoint.x, y: self.currentZone.bounds.y, number: number}
            Paper.drawMeasure(self.currentZoneGroup, self.currentPaperPoint.x, self.currentZone.bounds.y, number)
            PopupMenuWidget.hidePopup("popupMenuWidgetDiv")
        }
    }

    self.addText = function () {
        var text = prompt("enter text")
        if (text) {

            self.currentZone.data.text = {x: self.currentPaperPoint.x, y: self.currentZone.bounds.y, text: text}
           // scoreParts.allPagesZones.pages[""+self.currentZone.data.page].text= self.currentZone.data.text
            Paper.drawText(self.currentZoneGroup, self.currentPaperPoint.x, self.currentZone.bounds.y, text)
            PopupMenuWidget.hidePopup("popupMenuWidgetDiv")
        }
    }


    return self;


})()