/*jshint esversion: 6, node: true */
'use strict';
var program = require('commander');
var path = require('path');

program
  .version('1.0.0')
  .option('-i, --input-bible [input-bible]', 'default: RCUV')
  .option('-o, --output-dir [output_directory]', 'the output dir of HTML files')
  .option('-f, --output-format [output_format]', 'the output format: html or htmlElement')
  .option('-y, --layout [layout]', 'the layout of the text, must be "paragraph" or "line"')
  .option('-s, --scripture [scripture location]', 'the location of the scripture. e.g. 列王紀上15：33～16：14')
  .option('-b, --book [book name]', 'the book name to convert e.g. gen')
  .parse(process.argv);

program.on('--help', ()=> {
  console.log('');
  console.log('  Example 1, to convert the whole bible and output the files to the "output" folder:');
  console.log('  $ node cli.js -o output');
  console.log('');
  console.log('  Example 2, to convert one book and output to "output" folder:');
  console.log('  $ node cli.js -b gen -o output');
  console.log('');
  console.log('  Example 3, to convert part and output to "test" folder:');
  console.log('  $ node cli.js -s 列王紀上15：33～16：14 -o test');
  console.log('');
  console.log('  Example 4, to convert part and output to console');
  console.log('  $ node cli.js -s 列王紀上15：33～16：14 -f html');
  console.log('');
});

if (!program.outputDir && !program.outputFormat) {
  console.error('Missing --output-dir or --output-format paramater.');
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

var outputDir = undefined;
var outputFormat = undefined;
if (program.outputDir) {
  outputDir = program.outputDir;
  if (!path.isAbsolute(outputDir) ) {
    outputDir = path.join(__dirname, outputDir);
  }
} else if (program.outputFormat) {
  if (program.outputFormat !== 'html' && program.outputFormat !== 'htmlElements') {
    console.error('Invalid output format: ', program.outputFormat);
    program.help();
  }
  outputFormat = program.outputFormat;
}

var options = {
  bible: bible,
  outputDir: outputDir,
  outputFormat: outputFormat,
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

}).then( result => {

  if (result.output) {
    console.log(result.output);
  }

}).catch( error => {

  console.error(error);

});
