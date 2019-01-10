/* jshint esversion: 6, node: true */
'use strict';
var path = require('path');
var fs = require('fs-extra');

var cssPaths = {
  common: path.join(__dirname, 'style-common.css'),
  paragraph: path.join(__dirname, 'style-paragraph-layout.css'),
  line: path.join(__dirname, 'style-line-layout.css')
};

function startDoc(title, opts) {
  if (opts.outputFormat === 'html') {
    var result = '<!DOCTYPE html>\n';
    result += '<html xmlns="http://www.idpf.org/2007/ops" xmlns:epub="http://www.idpf.org/2007/ops">\n';
    result += '';
    result += '<head>\n';
    result += '<meta charset="UTF-8" ></meta>\n';
    result += '<title>' + title + '</title>\n';
    result += css(opts) + '\n';
    result += '</head>\n';
    result += '<body>';
    return result;
  } else if (opts.outputFormat === 'htmlElements') {
    return '<div class="scripture-text">\n';
  } else {
    throw 'Unknown format';
  }
}

function css(opts) {
  var result;
  if (opts.externalCss) {
    result = '<link href="common.css" rel="stylesheet">\n';
    result += '<link href="' + opts.layout + '.css" rel="stylesheet">\n';
    return result;
  } else {
    result = '<style><!--\n';
    result += fs.readFileSync(cssPaths.common) + '\n';
    result += fs.readFileSync(cssPaths[opts.layout]) + '\n';
    result += '--></style>';
    return result;
  }
}

function endDoc(opts) {
  if (opts.outputFormat === 'html') {
    return '</body></html>';
  } else if (opts.outputFormat === 'htmlElements') {
    return '</div>';
  } else {
    throw 'Unknown format';    
  }
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
        ).then( ()=> {
          return {
            name: undefined,
            filename: key + '.css',
            id: key + 'stylesheet',
            mediaType: 'text/css',
            order: undefined,
            navLabel: undefined,
            navLevel: undefined
          };
        });

      })
    );

  });

}

module.exports = {
  startDoc: startDoc,
  css: css,
  endDoc: endDoc,
  bookFileName: bookFileName,
  copyCss: copyCss
};
