/*jshint esversion: 6, node: true */
'use strict';
var path = require('path');
var fs = require('fs-extra');
var htmlHelper = require('../html-helper');
var htmlConverter = require('../html');

var endDoc = htmlHelper.endDoc;
var startDoc = htmlHelper.startDoc;
var bookFileName = htmlHelper.bookFileName;

function convertSection(section, sectionIndex, opts, order) {

  var outputDir = opts.outputDir || path.join(__dirname, '..', '..', 'output');

  return Promise.resolve().then( ()=> {

    var filename = 'section' + sectionIndex + '.html';
    var outputFilePath = path.join(outputDir, filename);
    var writer = fs.createWriteStream(outputFilePath);

    var result = startDoc(section.name, opts);
    result += '<h1 class="bible-section-name">' + section.name + '</h1>';
    result += generateSectionToc(section, opts);
    result += endDoc(opts);

    writer.write(result);
    writer.end();

    return {
      name: section.name,
      filename: filename,
      id: 'id' + section.name,
      mediaType: 'application/xhtml+xml',
      order: order,
      navLabel: section.name,
      navLevel: 0
    };

  });
}

function convertToc(opts, order) {

  var outputDir = opts.outputDir || path.join(__dirname, '..', '..', 'output');

  var dividerFile = 'divider.png';

  return fs.copy(
    path.join(__dirname, dividerFile),
    path.join(outputDir, dividerFile)
  ).then( ()=> {

    var name = 'toc';
    var filename = 'index.html';
    var outputFilePath = path.join(outputDir, filename);
    var writer = fs.createWriteStream(outputFilePath);

    var result = startDoc(name, opts);
    result += '<div class="toc">';

    opts.books.map( book => {
      return book.localizedData.section;
    }).reduce( (accumulator, currentValue) => {
      if (accumulator.length === 0 ||
          accumulator[accumulator.length-1].name !== currentValue.name) {
        accumulator.push(currentValue);
      }
      return accumulator;
    }, []).forEach( (section,index,array) => {
      result += '<h1 class="bible-section-name">';
      result += '<a href="section' + index + '.html">';
      result += section.name;
      result += '</a>';
      result += '</h1>';
      if (index < array.length - 1) {
        result += '<img src="divider.png" class="divider">';
      }
    });

    result += '</div>';
    result += endDoc(opts);

    writer.write(result);
    writer.end();

    return [
      {
        name: name,
        filename: filename,
        id: 'id' + name,
        mediaType: 'application/xhtml+xml',
        order: order,
        navLabel: '目錄',
        navLevel: 0
      },
      {
        filename: 'divider.png',
        id: 'divider',
        mediaType: 'image/png'
      }
    ];
  });

}

function generateSectionToc(section, opts) {

  var result = '';

  opts.books.filter( book => {
    return book.localizedData.section.name === section.name;
  }).map( book => {
    return book.localizedData.section.category;
  }).reduce( (accumulator, currentValue) => {
    if (accumulator.length === 0 ||
        accumulator[accumulator.length-1].name !== currentValue.name) {
      accumulator.push(currentValue);
    }
    return accumulator;
  }, []).forEach( category => {
    result += '<h3 class="bible-category-name">';
    result += category.name;
    result += '</h3>';
    result += generateCategoryToc(category, opts);
  });

  return result;

}

function generateCategoryToc(category, opts) {

  var result = '';
  result += '<ul class="bible-category-list">';
  opts.books.filter( book => {
    return book.localizedData.section.category.name === category.name;
  }).forEach( book => {
    result += '<li class="bible-category-book">';
    result +=   '<a class="bible-category-book-link" href="' + bookFileName(book) + '">';
    result +=     book.localizedData.name;
    result +=   '</a>';
    result += '</li>';
  });
  result += '</ul>';
  return result;
}

function convertCategory(category, opts, order) {

  var outputDir = opts.outputDir || path.join(__dirname, '..', '..', 'output');

  return Promise.resolve().then( ()=> {

    var filename = order + '.html';
    var outputFilePath = path.join(outputDir, filename);
    var writer = fs.createWriteStream(outputFilePath);

    var result = startDoc(category.name, opts);
    result += '<h1 class="bible-category-name">' + category.name + '</h1>';
    result += generateCategoryToc(category, opts);
    result += endDoc(opts);

    writer.write(result);
    writer.end();

    return {
      name: category.name,
      filename: filename,
      id: 'id' + category.name,
      mediaType: 'application/xhtml+xml',
      order: order,
      navLabel: '▼' + category.name,
      navLevel: 1
    };

  });
}

function processCover(opts) {
  var outputDir = opts.outputDir || path.join(__dirname, '..', '..', 'output');
  return fs.copy(
    path.join(__dirname, 'cover.jpg'),
    path.join(outputDir, 'cover.jpg')
  ).then( ()=> {

    return {
      filename: 'cover.jpg',
      id: 'cover',
      mediaType: 'image/jpeg'
    };

  });
}

function convertAll(opts) {

  if (opts !== undefined && typeof opts === 'object') {
    if (!opts.inputDir && !opts.bible) {
      throw new Error('Missing inputDir or bible option');
    }
  } else {
    throw new Error('Missing option');
  }

  console.log('Conversion start with config: ', opts);

  opts.title = opts.title || 'My Great Book';
  opts.creator = opts.creator || 'Myself';
  opts.lang = opts.lang || 'en';
  opts.outputFormat = 'html';
  opts.externalCss = true;
  opts.layout = opts.layout || 'paragraph';
  var processedFiles = [];
  var order = 1;

  var parser = opts.bible || require('usfm-bible-parser')(opts.inputDir, opts.lang);
  return parser.getBooks().then ( books => {

    opts.books = books;
    return htmlHelper.copyCss(opts);

  }).then( cssFiles => {

    processedFiles = processedFiles.concat(cssFiles);
    return processCover(opts);

  }).then( coverFile => {

    processedFiles.push( coverFile );
    return convertToc(opts, order++);

  }).then( tocFiles => {

    processedFiles = processedFiles.concat(tocFiles);

    var section = {};
    var sectionIndex = 0;
    var category = {};
    var bookName;

    var promises = [];
    opts.books.forEach( book => {

      var bookSection = book.localizedData.section;
      if (section.name != bookSection.name) {
        console.log('Processing ' + order + '.' + bookSection.name);
        section = bookSection;
        promises.push(convertSection(bookSection, sectionIndex, opts, order++));
        sectionIndex++;
      }

      if (category.name != bookSection.category.name) {
        category = bookSection.category;
        console.log('Processing   ' + order + '.' + bookSection.category.name);
        promises.push(convertCategory(bookSection.category, opts, order++));
      }

      if (bookName != book.localizedData.name) {
        bookName = book.localizedData.name;
        console.log('Processing     ' + order + '.' + bookName);
      }

      promises.push(htmlConverter.convertBook(book.shortName, opts, order++));

    });

    return Promise.all(promises);

  }).then( htmlFiles => {

    processedFiles = processedFiles.concat(htmlFiles);

    var outputDir = opts.outputDir || path.join(__dirname, '..', '..', 'output');
    return fs.writeFile(
      path.join(outputDir, 'htmls-to-epub.json'),
      JSON.stringify({
        title: opts.title,
        creator: opts.creator,
        language: opts.lang,
        files: processedFiles
      })
    );

  }).then( ()=> {

    return processedFiles;

  });

}

module.exports.convert = convertAll;
