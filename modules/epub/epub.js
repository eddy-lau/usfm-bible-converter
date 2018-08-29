/*jshint esversion: 6 */
var fs = require('fs-extra');
var path = require('path');
var converter = require('../html');
var archiver = require('archiver');


function convert(opts) {

  var inputDir = opts.inputDir;
  if (!inputDir) {
    throw new Error('Missing inputDir');
  }

  var outputDir = opts.outputDir;
  if (!outputDir) {
    throw new Error('Missing outputDir');
  }

  var templateDir = path.join(outputDir,'template');
  fs.remove(templateDir).then( ()=> {

    return fs.ensureDir(outputDir);

  }).then( () => {

    return fs.copy(
      path.join(__dirname,'template'),
      templateDir
    );

  }).then( () => {

    opts.outputDir = templateDir;
    return converter.convertAll(opts);

  }).then( ()=> {

    var fileName =   'output.epub';
    var outputFilePath = path.join(outputDir, fileName);
    var fileOutput = fs.createWriteStream(outputFilePath);

    fileOutput.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
    });

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    var archive = archiver('zip');
    archive.pipe(fileOutput);
    archive.directory(templateDir, false);

    archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
        console.log(err);
      } else {
        throw err;
      }
    });

    archive.on('error', function(err){
        throw err;
    });
    archive.finalize();

  });



}

module.exports = {
  convert: convert
};
