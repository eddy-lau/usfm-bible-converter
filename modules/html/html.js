/*jshint esversion: 6 */
var path = require('path');
var fs = require('fs-extra');
var htmlHelper = require('../html-helper');

const PAIRED_MARKERS = [
  'bk', 'f', 'fv', 'pn', 'qs'
];

const HTML_TAGS = {
  'b': 'p',
  'bk': 'span',
  'c': 'span',
  'd': 'h4',
  'f': 'a',
  'ft': 'span',
  'fv': 'span',
  'h': 'h1',
  'id': 'span',
  'imt': 'h3',
  'iot': 'h3',
  'ip': 'p',
  'is': 'h3',
  'is2': 'h3',
  'li1': 'p',
  'm': 'p',
  'ms': 'h2',
  'mt1': 'h2',
  'nb': 'p',
  'p': 'p',
  'pn': 'span',
  'ps': 'p',
  'q' : 'p',
  'q1': 'p',
  'q2': 'p',
  'q3': 'p',
  'qs': 'span',
  'r': 'span',
  'restore': 'p',
  's': 'h3',
  's1': 'h3',
  's2': 'h3',
  'sp': 'h3',
  'tc1': 'span',
  'tr': 'p',
  'v': 'sup'
};

const PARAGRAPH_BREAKS = [
  'b', 'm', 'nb', 'p', 'ps', 'q', 'q1', 'q2', 'q3'
];

var startDoc = htmlHelper.startDoc;
var endDoc = htmlHelper.endDoc;
var bookFileName = htmlHelper.bookFileName;

function convertBook(shortName, opts, order) {

  if (!opts || !opts.inputDir) {
    throw new Error('Missing inputDir option');
  }
  var parser = require('usfm-bible-parser')(opts.inputDir, opts.lang);
  var outputDir = opts.outputDir || path.join(__dirname, '..', '..', 'output');
  var isParagraphOpened = false;
  var books = opts.books;
  var book;
  var chapterCount;
  var writer;
  var chapter;
  var verse;
  var footnotes = [];
  var filename;

  //
  // Methods
  //
  var getNextBook = bookFileName;

  var getFilename = function(book) {
    if (book) {
      return book.index + '-' + book.id.toUpperCase() + '.html';
    } else {
      return undefined;
    }
  };

  var bookNavigation = function() {

    var result = '<div class="book-nav">\n';
    for (var i = 0; i<chapterCount; i++) {

      if ( (i % 10) == 0) {
        result += '<p>\n';
      }

      result += '<span class="book-nav-link">';
      result += '<a href="#' + (i+1) + '">' + (i+1) + '</a> ';
      result += '</span>';

      if ( ((i + 1) % 10) == 0) {
        result += '</p>\n';
      }

    }
    result += '</div>\n';
    return result;

  };

  var closeParagraphIfOpened = function(marker) {

    marker = marker || 'p';
    var htmlTag = HTML_TAGS[marker];
    if (htmlTag == 'p') {
      if (isParagraphOpened) {
        return endHtmlTag(marker);
      }
    }
    return '';
  };

  var startHtmlTag = function(marker, attr, text) {

    attr = attr || {};

    var htmlTag = HTML_TAGS[marker];
    if (!htmlTag) {
      throw new Error('No HTML Tag for: "' + marker + '" ' + errorLocation());
    }

    var result = closeParagraphIfOpened(marker);

    var attrText = '';
    Object.keys(attr).forEach( key => {
      attrText += ' ' + key + '="' + attr[key] + '" ';
    });

    result += '<' + htmlTag + ' class="' + marker + '"' + attrText + '>';

    if (htmlTag == 'p') {
      isParagraphOpened = true;
    }

    if (text) {
      result += text;
    }

    return result;
  };

  var endHtmlTag = function(marker) {
    var htmlTag = HTML_TAGS[marker];
    if (!htmlTag) {
      throw new Error('No HTML Tag for: "' + marker + '" ' + errorLocation());
    }
    var result = '</' + htmlTag + '>';
    if (htmlTag == 'p') {
      isParagraphOpened = false;
    }
    return result;
  };

  var htmlElement = function(marker, text, attr) {
    return startHtmlTag(marker, attr) + text + endHtmlTag(marker);
  };

  var generateFootnotes = function() {

    var result = '<div class="page-break"></div>\n';
    result += '<div class="chap-nav">\n';
    result += '&lt; <a class="prev-chap-link" href="#' + (chapter) + '">上一章</a> ';
    result += '<a class="chapter" id="' + (chapter + 1) + '">\n';
    result += '<span class="footnote-title">註釋</span>\n';
    result += '</a>\n';
    result += ' <a class="next-chap-link" href="' + getFilename(getNextBook())  + '#0">下一章</a> &gt;\n';
    result += '</div>\n';

    footnotes.forEach( footnote => {

      let footnoteLinkText = footnote.verse ? (footnote.chapter + ':' + footnote.verse) : (footnote.chapter);

      result += '<aside id="footnote-' + footnote.index + '" epub:type="footnote">\n';
      result += '<p class="footnote">';
      result += '<a href="#footnote-' + footnote.index + '-ref">' + footnoteLinkText + '</a> ';
      result += footnote.text + '</p>\n';
      result += '</aside>\n';

    });

    footnotes = [];
    return result;


  };

  var parseReference = function(reference) {

    var targetBook;
    var matches = reference.match( /^\D+/ );
    if (matches && matches.length > 0) {
      var bookname = matches[0];
      targetBook = books.find( book => {
        return book.localizedAbbreviation === bookname;
      });
      if (!targetBook) {
        throw new Error('Book not found: ' + reference);
      }
    }

    var chapter;
    matches = reference.match( /\d+?[．|‧]/);
    if (matches && matches.length > 0) {
      chapter = matches[0].slice(0,-1);
    } else {
      matches = reference.match( /\d+$/);
      if (matches && matches.length > 0) {
        chapter = matches[0];
      }
    }

    var verse = 1;
    matches = reference.match( /[．|‧]\d*/ );
    if (matches && matches.length > 0) {
      verse = matches[0].substring(1);
    }

    return {
      book: targetBook,
      chapter: chapter,
      verse: verse,
      text: reference
    };
  };

  var referenceLinks = function(referenceString) {

    if (!referenceString.match( /^（.+）$/ )) {
      throw new Error('Invalid reference: ' + referenceString);
    }
    var references = referenceString.substring(1, referenceString.length-1).split('；');

    var result = '<span class="r">（';

    // Parse the links
    var links = references.map( reference => {
      return parseReference(reference);
    });

    // Fix the links
    for (var i = 0; i<links.length; i++) {
      var link = links[i];
      if (!link.book) {
        if (!links[i-1]) {
          link.book = book;
        } else {
          link.book = links[i-1].book;
        }
      }
      if (!link.chapter) {
        link.chapter = links[i-1].chapter;
      }
    }


    result += links.reduce( (accumulator, link, index, links) => {

      var text = '<a href="' + getFilename(link.book) + '#' + link.chapter + ':' + link.verse + '">' + link.text + '</a>';
      if (links[links.length-1].text !== link.text) {
        text += '；';
      }
      return accumulator + text;

    }, '');

    result += '）</span>';

    return result;
  };

  var convertMarker = function(marker, text) {
    var htmlTag = HTML_TAGS[marker];
    if (!htmlTag) {
      throw new Error('No HTML Tag for: "' + marker + '" ' + errorLocation());
    }

    var result = '';

    if (marker == 'h') {

      bookName = text.trim();
      result += '<a class="chapter" id="0">';
      result += htmlElement(marker, text);
      result += '</a>';
      result += bookNavigation();

    } else if (marker == 'v') {

      var verseNumberStr;
      let matches = text.match( /^\d+? / );
      if (!matches || matches.length == 0) {

        matches = text.match( /^\d+-\d+ / );
        if (!matches || matches.length == 0) {
          throw new Error('Verse number not found: ' + errorLocation() + " '" + text + "'");
        }

        verseNumberStr = matches[0];

      } else {
        verseNumberStr = matches[0];
      }

      var nonBreakableVerse = verseNumberStr.replace(' ', '&#160;');

      var anchor = ('' + chapter + ':' + verseNumberStr).trim();
      result += '<a class="verse" id="' + anchor + '">';
      result += htmlElement(marker, nonBreakableVerse);
      result += '</a>';
      result += text.substring(verseNumberStr.length);

    } else if (marker == 'c') {

      result += closeParagraphIfOpened() + '\n';
      result += '<div class="page-break"></div>\n';
      result += '<a class="chapter" id="' + chapter + '">\n';
      result += '</a>\n';
      result += '<div class="chap-top-book-name"><a href="#0">' + book.localizedName + '</a></div>\n';
      result += '<div class="chap-nav">\n';
      result += '&lt; <a class="prev-chap-link" href="#' + (chapter - 1) + '">上一章</a> ';
      result += htmlElement(marker, text);
      result += ' <a class="next-chap-link" href="#' + (chapter + 1) + '">下一章</a> &gt;\n';
      result += '</div>\n';
      //result += '</a>\n';

    } else if (marker == 's' || marker == 's1') {

      result += closeParagraphIfOpened();
      result += htmlElement(marker, text);

    } else if (PARAGRAPH_BREAKS.indexOf(marker) != -1) {

      result += closeParagraphIfOpened(marker);
      result += startHtmlTag(marker, {}, text);

    } else if (marker == 'r') {

      var referenceHtml = referenceLinks(text);
      result += referenceHtml;

    } else if (marker == 'f') {

      var footnoteText = text;
      if (footnoteText.startsWith('+ ')) {
        footnoteText = footnoteText.substring(2);
      }
      footnotes.push({
        chapter: chapter,
        verse: verse,
        index: footnotes.length + 1,
        text: footnoteText,
      });

      var attr = {
        id: 'footnote-' + footnotes.length + '-ref',
        href:'#footnote-' + footnotes.length,
        'epub:type':'noteref'
      };

      result += htmlElement(marker, '<sup>[註]</sup>', attr);

    } else {

      result += htmlElement(marker, text);

    }

    return result;
  };

  var errorLocation = function() {
    return '[' + book.index + '-' + shortName.toUpperCase() + ' ' + chapter + ':' + verse + ']';
  };

  var errorMessage = function(err) {
    return '<pre>' + err + '</pre>';
  };

  var run = function() {

    return Promise.resolve().then( ()=> {

      if (!books) {
        return parser.getBooks().then( result => books = result );
      }

    }).then( () => {

      return parser.getBook(shortName);

    }).then( result => {

      book = result;
      return fs.ensureDir(outputDir);

    }).then( result => {

      filename = getFilename(book);
      var outputFilePath = path.join(outputDir, filename);
      writer = fs.createWriteStream(outputFilePath);
      return book.getChapterCount();

    }).then( result => {

      chapterCount = result;
      var markers = [];
      var texts = [];

      var currentLine;
      return book.parse({
        fromChapter: opts.fromChapter,
        fromVerse: opts.fromVerse,
        toChapter: opts.toChapter,
        toVerse: opts.toVerse,
        onStartBook: function() {
          chapter = opts.fromChapter;
          writer.write(startDoc(book.localizedData.name, opts.externalCss) + '\n');
        },
        onStartLine: function(line, c, v) {
          chapter = c || chapter;
          verse = v || verse;
          currentLine = line;
          markers = [];
          texts = [];
        },
        onText: function(text) {
          if (texts.length == 0) {
            texts.push(text);
          } else {
            texts[texts.length-1] += text;
          }
        },
        onStartMarker: function(marker) {
          markers.push(marker);
          texts.push('');
        },
        onEndMarker: function(marker) {
          if (PAIRED_MARKERS.indexOf(marker) == -1) {
            throw new Error('Invalid Marker: ' + "'" + marker + "' " + errorLocation());
          }

          var html;
          while (markers[markers.length-1] !== marker) {
            let prevMarker = markers.pop();
            html = convertMarker(prevMarker, texts.pop());
            texts[texts.length-1] += html;
            //throw new Error('Marker mismatched: ' + marker + '. ' + errorLocation());
          }
          if (texts.length == 0) {
            throw new Error('Invalid content: ' + line);
          }
          markers.pop();
          html  = convertMarker(marker, texts.pop());
          texts[texts.length-1] += html;
        },
        onEndLine: function(line) {

          //writer.write( '<!-- ' + line + ' -->\n');
          while(markers.length > 0) {
            writer.write( convertMarker(markers.pop(), texts.pop()) + '\n');
          }

        },
        onEndBook: function() {
          writer.write( closeParagraphIfOpened() + '\n');
          writer.write( generateFootnotes() + '\n');
          writer.write( endDoc() + '\n');
        }
      });

    }).then( () => {

      writer.end();
      return {
        name: book.localizedName,
        filename: filename,
        id: 'id' + book.index,
        mediaType: 'application/xhtml+xml',
        order: order,
        navLabel: book.localizedData.section.order + '. ' + book.localizedData.name,
        navLevel: 1
      };

    }).catch( error => {

      if (writer) {
        writer.write( errorMessage(error) + '\n');
        writer.end();
      }
      return Promise.reject(error);

    });

  };

  return run();
}

module.exports = {
  convertBook: convertBook
};
