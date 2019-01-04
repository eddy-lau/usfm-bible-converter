/* jshint esversion: 6 */

var path = require('path');
var fs = require('fs-extra');

var cssPaths = {
  common: path.join(__dirname, 'style-common.css'),
  paragraph: path.join(__dirname, 'style-paragraph-layout.css'),
  line: path.join(__dirname, 'style-line-layout.css')
};

function startDoc(title, opts) {
  var result = '<!DOCTYPE html>\n';
  result += '<html xmlns="http://www.idpf.org/2007/ops" xmlns:epub="http://www.idpf.org/2007/ops">\n';
  result += '';
  result += '<head>\n';
  result += '<meta charset="UTF-8" ></meta>\n';
  result += '<title>' + title + '</title>\n';
  result += css(opts);
  result += '</head>\n';
  result += '<body>';
  return result;
}

function css(opts) {
  var result;
  if (opts.externalCss) {
    result = '<link href="common.css" rel="stylesheet">\n';
    result += '<link href="' + opts.layout + '-layout.css" rel="stylesheet">\n';
    return result;
  } else {
    result = '<style><!--\n';
    result += fs.readFileSync(cssPaths.common) + '\n';
    result += fs.readFileSync(cssPaths[opts.layout]) + '\n';
    result += '--></style>';
    return result;
  }
}

function endDoc() {
  return '</body></html>';
}

function bookFileName(book) {
  if (book) {
    return book.index + '-' + book.id.toUpperCase() + '.html';
  } else {
    return undefined;
  }
}

function copyCss(opts) {

  var outputDir = opts.outputDir || path.join(__dirname, '..', '..', 'output');

  return Promise.resolve().then( ()=> {

    if (!opts.externalCss) {
      return;
    }

    return fs.ensureDir(outputDir);
  }).then( () => {

    if (!opts.externalCss) {
      return;
    }

    return Promise.all(
      Object.keys(cssPaths).map( key => {
        return fs.copy(
          cssPaths[key],
          path.join(outputDir, key + '.css')
        );

      })
    );

  });

}

module.exports = {
  startDoc: startDoc,
  endDoc: endDoc,
  bookFileName: bookFileName,
  copyCss: copyCss
};
