/*jshint esversion: 6 */
var program = require('commander');
var path = require('path');

program
  .version('1.0.0')
  .option('-i, --input-dir [input_directory]', 'convert the USFM files under the directory [input_directory] to HTML files')
  .option('-d, --output-dir [output_directory]', 'the output dir of HTML files, use with --html')
  .option('-o, --output-file [output_file]', 'the output file name of the EPUB file, use with --epub')
  .option('-e, --epub', 'convert to EPUB format')
  .option('-t, --html', 'convert to HTML format (default)')
  .option('-l, --language [language code]', 'the language of the USFM files, e.g. zh-Hant')
  .parse(process.argv);

if (!program.inputDir) {
  program.help();
}

if (program.epub) {

  var outputDir = program.outputDir || path.join(__dirname, 'output', 'epub');
  if (!path.isAbsolute(outputDir) ) {
    outputDir = path.join(__dirname, outputDir);
  }


  var converter  = require('./modules/epub');
  converter.convert( {
    inputDir: program.inputDir,
    outputDir: outputDir
  });

} else {

  var outputDir = program.outputDir || path.join(__dirname, 'output', 'html');
  if (!path.isAbsolute(outputDir) ) {
    outputDir = path.join(__dirname, outputDir);
  }


  var converter  = require('./modules/html');
  converter.convertAll( {
    inputDir: program.inputDir,
    outputDir: outputDir,
    lang: program.language
  });

}
