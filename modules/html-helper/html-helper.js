var path = require('path');
var fs = require('fs-extra');

var cssPath = path.join(__dirname, 'style.css');

function startDoc(title, externalCss) {
  var result = '<!DOCTYPE html>\n';
  result += '<html xmlns="http://www.idpf.org/2007/ops" xmlns:epub="http://www.idpf.org/2007/ops">\n';
  result += '';
  result += '<head>\n';
  result += '<meta charset="UTF-8" ></meta>\n';
  result += '<title>' + title + '</title>\n';
  result += css(externalCss) + '\n';
  result += '</head>\n';
  result += '<body>';
  return result;
}

function css(external) {
  if (external) {
    return '<link href="style.css" rel="stylesheet">';
  } else {
    var result = '<style><!--\n';
    result += fs.readFileSync(cssPath) + '\n';
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

module.exports = {
  startDoc: startDoc,
  endDoc: endDoc,
  bookFileName: bookFileName,
  cssPath: cssPath
};
