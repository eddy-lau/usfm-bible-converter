/*jshint esversion: 6 */
var program = require('commander');
var path = require('path');

program
  .version('1.0.0')
  .option('-i, --input-dir [input_directory]', 'convert the USFM files under the directory [input_directory] to HTML files')
  .option('-o, --output-dir [output_directory]')
  .parse(process.argv);

var outputDir = program.outputDir || path.join(__dirname, 'output', 'html');

if (!path.isAbsolute(outputDir) ) {
  outputDir = path.join(__dirname, outputDir);
}

if (program.inputDir) {
  var converter  = require('./modules/html')(program.inputDir);
  converter.convertAll( {
    outputDir: outputDir
  });
} else {
  program.help();
}
