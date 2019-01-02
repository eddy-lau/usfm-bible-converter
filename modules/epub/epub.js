/*jshint esversion: 6 */
var fs = require('fs-extra');
var path = require('path');
var converter = require('../multi');
var archiver = require('archiver');
var parseString = require('xml2js').parseString;
var moment = require('moment');
var xml2js = require('xml2js');
var uuidv1 = require('uuid/v1');
var arrayToTree = require('array-to-tree');


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

function buildMetadata(metadataPath, opts) {

  return fs.readFile(metadataPath).then( data=> {

      return parseXML(data);

  }).then( json => {

    json.package.metadata[0]['dc:date'][0] = moment().toISOString();
    json.package.metadata[0]['dc:language'][0] = opts.lang || 'en';
    json.package.metadata[0]['dc:identifier'][0]._ = opts.uuid;

    var builder = new xml2js.Builder();
    var xml = builder.buildObject(json);
    return fs.writeFile(metadataPath, xml);

  });

}

function buildManifest(metadataPath, htmlFiles) {

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
            id: htmlFile.id,
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

    json.package.manifest[0].item.push( {

        $: {
          href: 'divider.png',
          id: 'divider',
          'media-type': 'image/png'
        }

    });

    json.package.manifest[0].item.push( {

        $: {
          href: 'style.css',
          id: 'stylesheet',
          'media-type': 'text/css'
        }

    });

    htmlFiles.pop();
    json.package.spine[0].itemref = htmlFiles.map( htmlFile => {
      return {
        $: {
          idref: htmlFile.id
        }
      };
    });

    var xml = builder.buildObject(json);
    return fs.writeFile(metadataPath, xml);

  });
}

function buildTOC(tocPath, htmlFiles, uuid) {

  function htmlFileToElement(htmlFile) {

    var element = {};
    element = {
      $: {
        id: 'num_' + htmlFile.order,
        playOrder: '' + htmlFile.order
      },
      navLabel: {
        text: htmlFile.navLabel
      },
      content: {
        '$': {
          src: htmlFile.filename
        }
      }
    };

    if (htmlFile.children && htmlFile.children.length> 0) {
      element.navPoint = htmlFile.children.map(htmlFileToElement);
    }

    return element;

  }


  return fs.readFile(tocPath).then( data=> {

      return parseXML(data);

  }).then( json => {

    var builder = new xml2js.Builder();

    json.ncx.head[0].meta[0].$.content = uuid;
    json.ncx.navMap[0].navPoint = arrayToTree(htmlFiles).map(htmlFileToElement);

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
      id: 'ncx',
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
  var uuid = uuidv1();

  return fs.remove(templateDir).then( ()=> {

    return fs.ensureDir(outputDir);

  }).then( () => {

    return fs.copy(
      path.join(__dirname,'template'),
      templateDir
    );

  }).then( () => {

    opts.outputDir = templateDir;
    return converter.convert(opts);

  }).then( result => {

    conversionResult = result;
    return buildTOC(tocPath, conversionResult, uuid);

  }).then( toc => {

    conversionResult.push(toc);
    return buildMetadata(metadataPath, {
      lang: opts.lang,
      uuid: uuid
    });

  }).then( ()=> {

    return buildManifest(metadataPath, conversionResult);

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
