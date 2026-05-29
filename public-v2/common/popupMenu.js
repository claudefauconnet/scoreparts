// Globals externes attendus : `$` (jQuery).
import { Paper } from './paper.js';
import { PopupMenuWidget } from './popupMenuWidget.js';

export const popupMenu = {};

popupMenu.showGraphPopupMenu = function (zoneGroup, windowPoint, paperPoint) {
  if (!zoneGroup) {
    return;
  }

  popupMenu.currentZoneGroup = zoneGroup;
  popupMenu.currentZone = zoneGroup.getItems()[0];
  popupMenu.currentPaperPoint = paperPoint;

  var html =
    '<span class="popupMenuItem" data-action="clear-zone"> Effacer zone</span>' +
    '<span class="popupMenuItem" data-action="set-measure"> Ajouter Numero mesure</span>' +
    '<span class="popupMenuItem" data-action="add-text"> Ajouter texte</span>';

  $('#popupMenuWidgetDiv').html(html);
  PopupMenuWidget.showPopup(windowPoint, 'popupMenuWidgetDiv');
};

popupMenu.clearZone = function () {
  Paper.deleteZone(popupMenu.currentZone);
  PopupMenuWidget.hidePopup('popupMenuWidgetDiv');
};

popupMenu.setMeasure = function () {
  var number = prompt('measure number');
  if (number) {
    popupMenu.currentZone.data.measure = {
      x: popupMenu.currentPaperPoint.x,
      y: popupMenu.currentZone.bounds.y,
      number: number,
    };
    Paper.drawMeasure(
      popupMenu.currentZoneGroup,
      popupMenu.currentPaperPoint.x,
      popupMenu.currentZone.bounds.y,
      number
    );
    PopupMenuWidget.hidePopup('popupMenuWidgetDiv');
  }
};

popupMenu.addText = function () {
  var text = prompt('enter text');
  if (text) {
    popupMenu.currentZone.data.text = {
      x: popupMenu.currentPaperPoint.x,
      y: popupMenu.currentZone.bounds.y,
      text: text,
    };
    // scoreParts.allPagesZones.pages[""+popupMenu.currentZone.data.page].text= popupMenu.currentZone.data.text
    Paper.drawText(
      popupMenu.currentZoneGroup,
      popupMenu.currentPaperPoint.x,
      popupMenu.currentZone.bounds.y,
      text
    );
    PopupMenuWidget.hidePopup('popupMenuWidgetDiv');
  }
};

// Délégation jQuery — remplace les onclick="popupMenu.xxx()" de la v1.
$(document).on('click', '#popupMenuWidgetDiv .popupMenuItem', function () {
  var action = $(this).data('action');
  if (action === 'clear-zone') {
    popupMenu.clearZone();
  } else if (action === 'set-measure') {
    popupMenu.setMeasure();
  } else if (action === 'add-text') {
    popupMenu.addText();
  }
});
