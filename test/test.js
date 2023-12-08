/* jshint esversion: 6 */
var converter = require('..');

var scripture;
if (process.argv.length == 3) {
  scripture = process.argv[2];
} else if (process.argv.length == 4) {
  scripture = process.argv[2] + ' ' + process.argv[3];
} else {
  console.log('usage: npm test -- "創世記 1:1-2"');
  return -1;
}

var opts = {
//  outputDir: __dirname
  outputFormat: 'html'
};

converter(opts).convertScripture(scripture)
.then( result => {
  console.log(result.output);
}).catch( err => {
  console.error(err);
});
