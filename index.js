/*jshint esversion: 6 */
var program = require('commander');

program
  .version('1.0.0')
  .option('-d, --dir [usfm_dir]', 'convert the files under the directory [usfm_path] to HTML files')
  .parse(process.argv);

if (program.dir) {
  var converter  = require('./src/html.js')(program.dir);
  converter.convertAll();
}
