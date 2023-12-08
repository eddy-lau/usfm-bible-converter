/*jshint esversion: 6 */
var path = require('path');
var htmlHelper = require('../html-helper');

const PAIRED_MARKERS = [
  'bk', 'f', 'fv', 'pn', 'qs', 'add'
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
  'add': 'span',
  'ps': 'p',
  'q' : 'p',
  'q1': 'p',
  'q2': 'p',
  'q3': 'p',
  'qs': 'span',
  'r': 'p',
  'restore': 'p',
  's': 'h3',
  's1': 'h3',
  's2': 'h3',
  'sp': 'h3',
  'tc1': 'p',
  'tr': 'p',
  'v': 'sup'
};

const PARAGRAPH_BREAKS = [
  'b', 'm', 'nb', 'p', 'ps', 'q', 'q1', 'q2', 'q3'
];

var startDoc = htmlHelper.startDoc;
var css = htmlHelper.css;
var endDoc = htmlHelper.endDoc;
var bookFileName = htmlHelper.bookFileName;

function convertBook(shortName, opts, order) {

  if (opts !== undefined && typeof opts === 'object') {
    if (!opts.inputDir && !opts.bible) {
      throw new Error('Missing inputDir or bible option');
    }
  } else {
    throw new Error('Missing option');
  }

  opts.lang = opts.lang || 'en';
  opts.layout = opts.layout || 'paragraph';
  opts.outputFormat = opts.outputFormat || 'html';
  var parser = opts.bible || require('usfm-bible-parser').default(opts.inputDir, opts.lang);
  var isParagraphOpened = false;
  var books = opts.books;
  var book;
  var chapterCount;
  var writer;
  var cssWriter;
  var footnoteWriter;
  var chapter;
  var verse;
  var endVerse;
  var footnotes = [];
  var filename;
  var outputJson;

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

  var verseText = function(text) {
    var result = '';
    if (text && text.length > 0) {
      if (verse) {
        var className = book.shortName + '-' + chapter + '-' + verse;
        result += '<span class="verse-text ' + className + '">';
        result += text;
        result += '</span>';
      } else {
        result += text;
      }
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

    if (!footnotes || footnotes.length == 0) {
      return '';
    }

    var result = '<div class="page-break"></div>\n';
    result += '<div class="chap-nav foot-chap-nav">\n';
    result += '&lt; <a class="prev-chap-link chap-link" href="#' + (chapter) + '">上一章</a> ';
    result += '<a class="chapter" id="' + (chapter + 1) + '">\n';
    result += '<span class="footnote-title">註釋</span>\n';
    result += '</a>\n';
    result += ' <a class="next-chap-link chap-link" href="' + getFilename(getNextBook())  + '#0">下一章</a> &gt;\n';
    result += '</div>\n';

    footnotes.forEach( footnote => {

      let footnoteLinkText = footnote.verse ? (footnote.chapter + ':' + footnote.verse) : (footnote.chapter);

      var tag = opts.footnoteTag || 'aside';
      result += '<' + tag + ' id="footnote-' + footnote.index + '" epub:type="footnote">\n';
      result += '<p class="footnote">';
      if (opts.convertScripture) {
        result += footnoteLinkText + ' ';
      } else {
        result += '<a href="#footnote-' + footnote.index + '-ref">' + footnoteLinkText + '</a> ';
      }
      result += footnote.text + '</p>\n';
      result += '</'+ tag + '>\n';

    });

    footnotes = [];
    return result;


  };

  var parseReference = function(reference) {

    var targetBook;
    var matches = reference.match( /^\D+/ );
    if (matches && matches.length > 0) {
      var bookname = matches[0].trim();
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

    if (!referenceString.match( /^[*(（].+[）)*]$/ )) {
      throw new Error('Invalid reference: ' + errorLocation() + " '" + referenceString + "'");
    }
    var references = referenceString.substring(1, referenceString.length-1).split(/；/);

    const tag = HTML_TAGS['r'];
    var result = '<' + tag + ' class="r">（';

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

      var text;
      if (opts.convertScripture) {
        text = link.text;
      } else {
        text = '<a href="' + getFilename(link.book) + '#' + link.chapter + ':' + link.verse + '">' + link.text + '</a>';
      }
      if (links[links.length-1].text !== link.text) {
        text += '；';
      }
      return accumulator + text;

    }, '');

    result += '）</' + tag + '>';

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

      if (!isParagraphOpened) {
        result += startHtmlTag('p', {}, '');
      }

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
      result += '<span class="verse-line">';
      result += '<a class="verse" id="' + anchor + '">';
      result += htmlElement(marker, nonBreakableVerse);
      result += '</a>';
      result += verseText(text.substring(verseNumberStr.length));
      result += '</span>';

    } else if (marker == 'c') {

      result += closeParagraphIfOpened() + '\n';
      result += '<div class="page-break"></div>\n';
      result += '<a class="chapter" id="' + chapter + '">\n';
      result += '</a>\n';
      result += '<div class="chap-top-book-name"><a href="#0">' + book.localizedName + '</a></div>\n';
      result += '<div class="chap-nav">\n';
      result += '<span class="prev-chap">&lt; <a class="prev-chap-link chap-link" href="#' + (chapter - 1) + '">上一章</a> </span>';
      result += htmlElement(marker, text);
      result += '<span class="next-chap"> <a class="next-chap-link chap-link" href="#' + (chapter + 1) + '">下一章</a> &gt</span>\n';
      result += '</div>\n';
      //result += '</a>\n';

    } else if (marker == 's' || marker == 's1') {

      result += closeParagraphIfOpened();
      result += htmlElement(marker, text);

    } else if (PARAGRAPH_BREAKS.indexOf(marker) != -1) {

      result += closeParagraphIfOpened(marker);
      result += startHtmlTag(marker, {}, verseText(text));

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

      result += htmlElement(marker, verseText(text));

    }

    return result;
  };

  var errorLocation = function() {
    return '[' + book.index + '-' + shortName.toUpperCase() + ' ' + chapter + ':' + verse + ']';
  };

  var errorMessage = function(err) {
    return '<pre>' + err + '</pre>';
  };

  var createWriters = function() {

    if (opts.outputDir) {
      var outputDir = opts.outputDir || path.join(__dirname, '..', '..', 'output');
      var fs = require('fs-extra');
      return fs.ensureDir(outputDir)
      .then( ()=> {
        filename = getFilename(book);
        var outputFilePath = path.join(outputDir, filename);
        writer = fs.createWriteStream(outputFilePath);
        footnoteWriter = writer;
      });
    } else {

      if (opts.outputFormat === 'html') {
        writer = require('string-writer').start();
        //cssWriter = writer;
        footnoteWriter = writer;
      } else if (opts.outputFormat === 'htmlElements') {
        writer = require('string-writer').start();
        cssWriter = require('string-writer').start();
        footnoteWriter = require('string-writer').start();
      }

    }
  };

  var closeWriters = function() {

    if (!opts.outputDir) {

      if (opts.outputFormat === 'htmlElements') {
        outputJson = {
          html: writer.toString(),
          css: cssWriter.toString(),
          footnote: footnoteWriter.toString()
        };
      } else {
        outputJson = writer.toString();
      }

    } else {
      writer.end();
      if (footnoteWriter != writer) {
        footnoteWriter.end();
      }
      if (cssWriter) {
        cssWriter.end();
      }
    }

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
      return createWriters();

    }).then( ()=> {

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
        secondHalfOfFirstVerse: opts.secondHalfOfFirstVerse,
        firstHalfOfLastVerse: opts.firstHalfOfLastVerse,
        scriptures: opts.scriptures,
        onStartBook: function() {
          if (opts.fromChapter) {
            chapter = opts.fromChapter;
          } else if (opts.scriptures && Array.isArray(opts.scriptures)) {
            chapter = opts.scriptures[0].fromChapter;
          }
          writer.write(startDoc(book.localizedData.name, opts) + '\n');
          if (cssWriter) {
            cssWriter.write(css(opts));
          }
        },
        onStartLine: function(_line, _chapter, _startVerse, _endVerse) {
          chapter = _chapter || chapter;
          verse = _startVerse || verse;
          endVerse = _endVerse || verse;
          currentLine = _line;
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

          // Uncomment this line for debug only
          //writer.write( '<!-- ' + line + ' -->\n');
          while(markers.length > 0) {
            writer.write( convertMarker(markers.pop(), texts.pop()) + '\n');
          }

        },
        onEndBook: function() {
          writer.write( closeParagraphIfOpened() + '\n');
          footnoteWriter.write( generateFootnotes() + '\n');
          writer.write( endDoc(opts) + '\n');
        }
      });

    }).then( () => {

      closeWriters();

      var result = {
        name: book.localizedName,
        id: 'id' + book.index,
        mediaType: 'application/xhtml+xml',
        navLabel: book.localizedData.section.order + '. ' + book.localizedData.name,
        navLevel: 1
      };

      if (filename) {
        result.filename = filename;
      }

      if (order) {
        result.order = order;
      }

      if (outputJson) {
        result.output = outputJson;
      }

      return result;

    }).catch( error => {

      if (writer) {
        writer.write( errorMessage(error) + '\n');
        closeWriters();
      }
      return Promise.reject(error);

    });

  };

  return run();
}

module.exports = {
  convertBook: convertBook
};
