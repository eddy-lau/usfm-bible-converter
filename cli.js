/*jshint esversion: 6, node: true */
'use strict';
var program = require('commander');
var path = require('path');

program
  .version('1.0.0')
  .option('-i, --input-bible [input-bible]', 'default: RCUV')
  .option('-o, --output-dir [output_directory]', 'the output dir of HTML files')
  .option('-y, --layout [layout]', 'the layout of the text, must be "paragraph" or "line"')
  .option('-s, --scripture [scripture location]', 'the location of the scripture. e.g. 列王紀上15：33～16：14')
  .option('-b, --book [book name]', 'the book name to convert e.g. gen')
  .parse(process.argv);

if (!program.outputDir) {
  console.error('Missing --output-dir paramater.');
  program.help();
}

const bible = (function() {

  if (!program.inputBible || program.inputBible === 'RCUV') {
    return require('rcuv-usfm').bible;
  } else {
    console.error('Unknown bible: ', program.bible);
    program.help();
  }

})();

var outputDir = program.outputDir;
if (!path.isAbsolute(outputDir) ) {
  outputDir = path.join(__dirname, outputDir);
}

var options = {
  bible: bible,
  outputDir: outputDir,
  layout: program.layout
};

return Promise.resolve().then( ()=> {

  var converter  = require('./main.js')(options);

  if (program.scripture) {
    return converter.convertScripture(program.scripture, options);
  } else if (program.book) {
    return converter.convertBook(program.book, options);
  } else {
    // Convert the whole bible
    return converter.convert( options );
  }

}).catch( error => {

  console.error(error);

});
