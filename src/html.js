/*jshint esversion: 6 */
const rcuv = require('rcuv-usfm').pathOfFiles;
const parser = require('usfm-bible-parser')(rcuv);

var path = require('path');
var fs = require('fs');

const PAIRED_TAGS = [
  'bk', 'f', 'fv', 'pn', 'qs'
];

const TAGS_MAP = {
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
  'ms': 'p',
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

function convertBook(shortName, opts) {

  opts = opts || {};
  var outputPath = opts.outputFileName ||
    path.join(__dirname, '..', 'output', shortName + '.html');

  var isParagraphOpened = false;
  var book;
  var chapterCount;
  var writer;
  var chapter;
  var verse;
  var footnotes = [];

  //
  // Methods
  //
  function startDoc() {
    var result = '<!DOCTYPE html>\n';
    result += '<html xmlns="http://www.idpf.org/2007/ops" xmlns:epub="http://www.idpf.org/2007/ops">\n';
    result += '';
    result += '<head>\n';
    result += '<meta charset="UTF-8">\n';
    result += '<title>' + shortName.toUpperCase() + '</title>\n';
    result += css() + '\n';
    result += '</head>\n';
    result += '<body>';
    return result;
  }

  function css() {
    var file = path.join(__dirname, 'style.css');
    var result = '<style><!--\n';
    result += fs.readFileSync(file) + '\n';
    result += '--></style>';
    return result;
  }

  function endDoc() {
    return '</body></html>';
  }

  function bookNavigation() {

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

  }

  function closeParagraphIfOpened(tag) {

    tag = tag || 'p';
    var htmlTag = TAGS_MAP[tag];
    if (htmlTag == 'p') {
      if (isParagraphOpened) {
        return endHtmlTag(tag);
      }
    }
    return '';
  }

  function startHtmlTag(tag, attr, text) {

    attr = attr || {};

    var htmlTag = TAGS_MAP[tag];
    if (!htmlTag) {
      throw new Error('No HTML Tag for: "' + tag + '" ' + errorLocation());
    }

    var result = closeParagraphIfOpened(tag);

    var attrText = '';
    Object.keys(attr).forEach( key => {
      attrText += ' ' + key + '="' + attr[key] + '" ';
    });

    result += '<' + htmlTag + ' class="' + tag + '"' + attrText + '>';

    if (htmlTag == 'p') {
      isParagraphOpened = true;
    }

    if (text) {
      result += text;
    }

    return result;
  }

  function endHtmlTag(tag) {
    var htmlTag = TAGS_MAP[tag];
    if (!htmlTag) {
      throw new Error('No HTML Tag for: "' + tag + '" ' + errorLocation());
    }
    var result = '</' + htmlTag + '>';
    if (htmlTag == 'p') {
      isParagraphOpened = false;
    }
    return result;
  }

  function htmlElement(tag, text, attr) {
    return startHtmlTag(tag, attr) + text + endHtmlTag(tag);
  }

  function generateFootnotes() {

    var result = '<a class="chapter" id="' + (chapter + 1) + '">\n';
    result += '<h2 class="footnote-title">註釋</h2>\n';
    result += '</a>\n';

    footnotes.forEach( footnote => {

      let footnoteLinkText = footnote.verse ? (footnote.chapter + ':' + footnote.verse) : (footnote.chapter)

      result += '<aside id="footnote-' + footnote.index + '" epub:type="footnote">\n';
      result += '<p class="footnote">';
      result += '<a href="#footnote-' + footnote.index + '-ref">' + footnoteLinkText + '</a> ';
      result += footnote.text + '</p>\n';
      result += '</aside>\n';

    });

    footnotes = [];
    return result;


  }

  function convertTag(tag, text) {
    var htmlTag = TAGS_MAP[tag];
    if (!htmlTag) {
      throw new Error('No HTML Tag for: "' + tag + '" ' + errorLocation());
    }

    var result = '';

    if (tag == 'h') {

      bookName = text.trim();
      result += '<a class="chapter" id="0">';
      result += htmlElement(tag, text);
      result += '</a>';
      result += bookNavigation();

    } else if (tag == 'v') {

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
      result += htmlElement(tag, nonBreakableVerse);
      result += '</a>';
      result += text.substring(verseNumberStr.length);

    } else if (tag == 'c') {

      result += closeParagraphIfOpened() + '\n';
      result += '<a class="chapter" id="' + chapter + '">\n';
      result += '<div class="chap-nav">\n';
      result += '&lt; <a class="prev-chap-link" href="#' + (chapter - 1) + '">上一章</a> ';
      result += htmlElement(tag, text);
      result += ' <a class="next-chap-link" href="#' + (chapter + 1) + '">下一章</a> &gt;\n';
      result += '</div>\n';
      result += '</a>\n';

    } else if (tag == 's' || tag == 's1') {

      result += closeParagraphIfOpened();
      result += htmlElement(tag, text);

    } else if (PARAGRAPH_BREAKS.indexOf(tag) != -1) {

      result += closeParagraphIfOpened(tag);
      result += startHtmlTag(tag, {}, text);

    } else if (tag == 'f') {

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

      result += htmlElement(tag, '<sup>[註]</sup>', attr);

    } else {

      result += htmlElement(tag, text);

    }

    return result;
  }

  function errorLocation() {
    return '[' + book.index + '-' + shortName.toUpperCase() + ' ' + chapter + ':' + verse + ']';
  }

  function errorMessage(err) {
    return '<pre>' + err + '</pre>';
  }

  return parser.getBook(shortName).then( result => {

    book = result;
    var filename = book.index + shortName.toUpperCase() + '.html';
    var outputPath = opts.outputFileName ||
      path.join(__dirname, '..', 'output', filename);

    var outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdir( outputDir, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }

    return outputPath;

  }).then( result => {

    outputPath = result;
    writer = fs.createWriteStream(outputPath);
    return parser.getBook(shortName);

  }).then( result => {

    book = result;
    return book.getChapterCount();

  }).then( result => {

    chapterCount = result;
    var tags = [];
    var texts = [];

    var currentLine;
    return book.parse({
      onStartBook: function() {
        writer.write(startDoc() + '\n');
      },
      onStartLine: function(line, c, v) {
        chapter = c || chapter;
        verse = v || verse;
        currentLine = line;
        tags = [];
        texts = [];
      },
      onText: function(text) {
        if (texts.length == 0) {
          texts.push(text);
        } else {
          texts[texts.length-1] += text;
        }
      },
      onStartTag: function(tag) {
        tags.push(tag);
        texts.push('');
      },
      onEndTag: function(tag) {
        if (PAIRED_TAGS.indexOf(tag) == -1) {
          throw new Error('Invalid Tag: ' + "'" + tag + "' " + errorLocation());
        }
        while (tags[tags.length-1] !== tag) {
          let prevTag = tags.pop();
          var taggedText = convertTag(prevTag, texts.pop());
          texts[texts.length-1] += taggedText;
          //throw new Error('Tag mismatched: ' + tag + '. ' + errorLocation());
        }
        if (texts.length == 0) {
          throw new Error('Invalid content: ' + line);
        }
        tags.pop();
        var taggedText = convertTag(tag, texts.pop());
        texts[texts.length-1] += taggedText;
      },
      onEndLine: function(line) {

        //writer.write( '<!-- ' + line + ' -->\n');
        while(tags.length > 0) {
          writer.write( convertTag(tags.pop(), texts.pop()) + '\n');
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

  }).catch( error => {

    if (writer) {
      writer.write( errorMessage(error) + '\n');
      writer.end();
    }
    return Promise.reject(error);

  });

}

function convertAll() {

  return parser.getBooks().then( books => {

    return Promise.all(
      books.map( book => {
        convertBook(book.shortName);
      })
    );

  });

}


module.exports = {
  convertBook: convertBook,
  convertAll: convertAll
};
