/*jshint esversion: 6 */
var fs = require('fs-extra');
var path = require('path');
var converter = require('../html');
var archiver = require('archiver');
var parseString = require('xml2js').parseString;
var moment = require('moment');
var xml2js = require('xml2js');


function parseXML(data) {

  return new Promise( (resolve, reject ) => {
    parseString(data, (err, result) => {
      if (err) {
        reject(err);
      }else {
        resolve(result);
      }
    });
  });

}

function updateMetadata(metadataPath, lang) {

  return fs.readFile(metadataPath).then( data=> {

      return parseXML(data);

  }).then( json => {

    json.package.metadata[0]['dc:date'][0] = moment().toISOString();
    json.package.metadata[0]['dc:language'][0] = lang || 'en';

    var builder = new xml2js.Builder();
    var xml = builder.buildObject(json);
    return fs.writeFile(metadataPath, xml);

  });

}

function updateManifest(metadataPath, htmlFiles) {

  return fs.readFile(metadataPath).then( data=> {

      return parseXML(data);

  }).then( json => {

    var builder = new xml2js.Builder();
    var index = 1;

    json.package.manifest[0].item =
      htmlFiles.map( htmlFile => {

        return {
          $: {
            href: htmlFile.filename,
            id: ('id' + index++),
            'media-type': htmlFile.mediaType
          }
        };

      });

    json.package.manifest[0].item.push( {

        $: {
          href: 'cover.jpg',
          id: 'cover',
          'media-type': 'image/jpeg'
        }

    });

    index = 1;
    json.package.spine[0].itemref = htmlFiles.map( htmlFile => {
      return {
        $: {
          idref: 'id' + index++
        }
      };
    });

    var xml = builder.buildObject(json);
    return fs.writeFile(metadataPath, xml);

  });
}

function updateTOC(tocPath, htmlFiles) {

  return fs.readFile(tocPath).then( data=> {

      return parseXML(data);

  }).then( json => {

    var builder = new xml2js.Builder();

    var index = 1;
    json.ncx.navMap[0].navPoint = htmlFiles.map( htmlFile => {

      var element = {};
      element = {
        $: {id: 'num_' + index,
          playOrder: '' + index++
        },
        navLabel: {
          text: htmlFile.book.localizedName,
        },
        content: {
          '$': {
            src: htmlFile.filename
          }
        }
      };

      return element;

    });

    builder.options.xmldec.standalone = undefined;
    builder.options.xmldec.encoding = 'utf-8';

    var xml = builder.buildObject(json);
    return fs.writeFile(tocPath, xml);

  }).then( () => {

    return {
      book: {
        id: 'toc',
      },
      filename: path.basename(tocPath),
      mediaType: 'application/x-dtbncx+xml'
    };

  });

}


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
  var metadataPath = path.join(templateDir, 'metadata.opf');
  var tocPath = path.join(templateDir, 'toc.ncx');
  var conversionResult;

  return fs.remove(templateDir).then( ()=> {

    return fs.ensureDir(outputDir);

  }).then( () => {

    return fs.copy(
      path.join(__dirname,'template'),
      templateDir
    );

  }).then( () => {

    opts.outputDir = templateDir;
    return converter.convertAll(opts);

  }).then( result => {

    conversionResult = result;
    return updateTOC(tocPath, conversionResult);

  }).then( toc => {

    conversionResult.push(toc);
    return updateMetadata(metadataPath, opts.lang);

  }).then( ()=> {

    return updateManifest(metadataPath, conversionResult);

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
