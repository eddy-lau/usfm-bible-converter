/*jshint esversion: 6 */
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
    writer = fs.createWriteStream(outputFilePath);

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
    writer = fs.createWriteStream(outputFilePath);

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

    return {
      name: name,
      filename: filename,
      id: 'id' + name,
      mediaType: 'application/xhtml+xml',
      order: order,
      navLabel: '目錄',
      navLevel: 0
    };
  });

}

function generateSectionToc(section, opts) {

  result = '';

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

  result = '';
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
    writer = fs.createWriteStream(outputFilePath);

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

function convertAll(opts) {

  if (!opts || !opts.inputDir) {
    throw new Error('Missing inputDir option');
  }

  opts.externalCss = true;
  opts.layout = opts.layout || 'paragraph';
  var outputDir = opts.outputDir || path.join(__dirname, '..', '..', 'output');

  return htmlHelper.copyCss(opts)
  .then( ()=> {

    var parser = require('usfm-bible-parser')(opts.inputDir, opts.lang);
    return parser.getBooks();

  }).then( books => {

    opts.books = books;
    var promises = [];

    var section = {};
    var sectionIndex = 0;
    var category = {};
    var bookName;

    var order = 1;
    promises.push(convertToc(opts, order++));

    books.forEach( book => {

      var bookSection = book.localizedData.section;
      if (section.name != bookSection.name) {
        console.log('Processing ' + bookSection.name);
        section = bookSection;
        promises.push(convertSection(bookSection, sectionIndex, opts, order++));
        sectionIndex++;
      }

      if (category.name != bookSection.category.name) {
        category = bookSection.category;
        console.log('Processing   ' + bookSection.category.name);
        promises.push(convertCategory(bookSection.category, opts, order++));
      }

      if (bookName != book.localizedData.name) {
        bookName = book.localizedData.name;
        console.log('Processing     ' + bookName);
      }

      promises.push(htmlConverter.convertBook(book.shortName, opts, order++));

    });

    return Promise.all(promises);

  }).then( result => {

    return result.sort( (lhs, rhs) => {
      if (lhs.order < rhs.order) {
        return -1;
      } else if (lhs.order > rhs.order) {
        return 1;
      } else {
        return 0;
      }
    });

  }).then( htmlFiles => {

    return htmlFiles.reduce( (accumulator, htmlFile) => {

      accumulator.array.push(htmlFile);

      if (htmlFile.navLevel == 0) {
        htmlFile.parent_id = undefined;
        accumulator.navLevelMap[0] = htmlFile;
      } else {
        htmlFile.parent_id = accumulator.navLevelMap[htmlFile.navLevel-1].id;
        accumulator.navLevelMap[htmlFile.navLevel] = htmlFile;
      }

      return accumulator;

    }, {
      navLevelMap: {},
      array: []
    }).array;

  });

}

module.exports.convert = convertAll;
