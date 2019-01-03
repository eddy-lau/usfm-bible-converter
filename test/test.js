/* jshint esversion: 6 */

var rcuv = require('rcuv-usfm');
var converter  = require('../modules/html');

var bookName;
var fromChapter;
var fromVerse;
var toChapter;
var toVerse;

if (process.argv.length == 3) {
  var parts = process.argv[2].split(' ');
  bookName = parts[0];
  if (parts.length > 1) {
    parts = parts[1].split('-');
    var fromParts = parts[0].split(':');
    var toParts = parts.length > 1 ? parts[1].split(':'):undefined;
    fromChapter = parseInt(fromParts[0]);
    fromVerse = fromParts.length > 1 ? parseInt(fromParts[1]):undefined;
    if (toParts) {
      toChapter = toParts.length > 1 ? parseInt(toParts[0]):fromChapter;
      toVerse = toParts.length > 1 ? parseInt(toParts[1]):parseInt(toParts[0]);
    }
  }

}

converter.convertBook(bookName, {
  fromChapter: fromChapter,
  fromVerse: fromVerse,
  toChapter: toChapter,
  toVerse: toVerse,
  inputDir: rcuv.pathOfFiles,
  outputDir: __dirname,
  lang: rcuv.language
}).then( ()=> {

  var parser = require('usfm-bible-parser')(rcuv.pathOfFiles, rcuv.language);
  return parser.getBooks();

});
