import { scoreParts } from './scoreParts.js';

export const ZonesChecker = {};

ZonesChecker.message = '';

ZonesChecker.checkZones = function (callback) {
  ZonesChecker.message = '';

  for (var pagenum in scoreParts.allPagesZones.pages) {
    var page = scoreParts.allPagesZones.pages[pagenum];

    if (scoreParts.allPagesZones.numberOfVoices) {
      var modulo = page.length % scoreParts.allPagesZones.numberOfVoices;
      if (modulo != 0) ZonesChecker.addMessage(pagenum, '', 'bad number of zones' + page.length);
    }

    page.forEach(function (zone, zoneIndex) {
      if (page.x < 0) ZonesChecker.addMessage(pagenum, zoneIndex, 'bad x' + zone.x);
      if (page.y < 0) ZonesChecker.addMessage(pagenum, zoneIndex, 'bad y' + zone.y);
    });
  }

  if (callback) return callback(ZonesChecker.message);
  ZonesChecker.printMessage();
};

ZonesChecker.addMessage = function (page, zoneindex, message) {
  ZonesChecker.message += 'page' + page + ', ' + 'zone' + zoneindex + ' : ' + message + '\n';
};

ZonesChecker.printMessage = function () {
  console.log(ZonesChecker.message);
};
