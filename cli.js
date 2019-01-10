/*jshint esversion: 6 */
var program = require('commander');
var path = require('path');

program
  .version('1.0.0')
  .option('-i, --input-dir [input_directory]', 'convert the USFM files under the directory [input_directory] to HTML files')
  .option('-o, --output-dir [output_directory]', 'the output dir of HTML files')
  .option('-l, --language [language code]', 'the language of the USFM files, e.g. zh-Hant')
  .option('-y, --layout [layout]', 'the layout of the text, must be "paragraph" or "line"')
  .parse(process.argv);

if (!program.inputDir) {
  program.help();
}

if (!program.outputDir) {
  program.help();
}

var outputDir = program.outputDir;
if (!path.isAbsolute(outputDir) ) {
  outputDir = path.join(__dirname, outputDir);
}

var converter  = require('./modules/multi');
converter.convert( {
  inputDir: program.inputDir,
  outputDir: outputDir,
  lang: program.language,
  layout: program.layout
});
