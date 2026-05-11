import scoreSplitter from './scoreSplitter..js';

var splitPDF = {
  split: function (pdfPath, targetDir) {
    scoreSplitter.pdfToImages(
      pdfPath,
      'medium',
      { targetDir: targetDir },
      function (err, result) {}
    );
  },
};

export default splitPDF;
