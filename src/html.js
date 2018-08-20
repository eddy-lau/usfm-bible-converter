/*jshint esversion: 6 */
var Parser = require('rcuv-html-parser');
var path = require('path');
var fs = require('fs');

const PAIRED_TAGS = [
  'bk', 'f', 'ft', 'fv', 'pn', 'qs'
];

const TAGS_MAP = {
  'b': 'p',
  'bk': 'span',
  'c': 'h2',
  'd': 'h4',
  'f': 'span',
  'ft': 'span',
  'fv': 'span',
  'h': 'h1',
  'id': 'span',
  'imt': 'h3',
  'iot': 'h3',
  'ip': 'p',
  'is': 'h3',
  'li1': 'p',
  'm': 'p',
  'ms': 'p',
  'mt1': 'h2',
  'nb': 'p',
  'p': 'p',
  'pn': 'span',
  'ps': 'p',
  'q1': 'p',
  'q2': 'p',
  'q3': 'p',
  'qs': 'span',
  'r': 'span',
  'restore': 'p',
  's': 'h3',
  's2': 'h3',
  'sp': 'h3',
  'tc1': 'span',
  'tr': 'p',
  'v': 'sup'
};

const PARAGRAPH_BREAKS = [
  'b', 'm', 'nb', 'p', 'ps', 'q1', 'q2', 'q3'
];

function convertBook(shortName, opts) {

  opts = opts || {};
  var outputPath = opts.outputFileName ||
    path.join(__dirname, '..', 'output', shortName + '.html');

  var isParagraphOpened = false;
  var writer;
  var chapter;


  //
  // Methods
  //
  function startDoc() {
    var result = '<!DOCTYPE HTML>\n';
    result += '<html>\n';
    result += '<head>\n';
    result += '<meta http-equiv="Content-Type" content="text/html;charset=UTF-8">\n';
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

  function closeParagraphIfOpened(tag) {
    var htmlTag = TAGS_MAP[tag];
    if (htmlTag == 'p') {
      if (isParagraphOpened) {
        return endHtmlTag(tag);
      }
    }
    return '';
  }

  function startHtmlTag(tag, text) {

    var htmlTag = TAGS_MAP[tag];
    if (!htmlTag) {
      throw new Error('No HTML Tag for: ', tag);
    }

    var result = '<' + htmlTag + ' class="' + tag + '">';
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
      throw new Error('No HTML Tag for: ', tag);
    }
    var result = '</' + htmlTag + '>';
    if (htmlTag == 'p') {
      isParagraphOpened = false;
    }
    return result;
  }

  function htmlElement(tag, text) {
    return startHtmlTag(tag) + text + endHtmlTag(tag);
  }

  function convertTag(tag, text) {
    var htmlTag = TAGS_MAP[tag];
    if (!htmlTag) {
      throw new Error('No HTML Tag for: ', tag);
    }

    var result = '';
    if (tag == 'v') {

      let verseNumber = text.match( /^\d+? / );
      if (!verseNumber || verseNumber.length == 0) {
        throw new Error('Verse number not found: ', text);
      }

      var anchor = chapter.trim() + ':' + verseNumber[0];
      result += '<a class="verse" name="' + anchor.trim() + '">';
      result += htmlElement(tag, verseNumber[0]);
      result += text.substring(verseNumber[0].length);
      result += '</a>';

    } else if (tag == 'c') {

      chapter = text;
      result += '<a class="chapter" name="' + chapter.trim() + '">';
      result += htmlElement(tag, text);
      result += '</a>';

    } else if (PARAGRAPH_BREAKS.indexOf(tag) != -1) {

      result += closeParagraphIfOpened(tag);
      result += startHtmlTag(tag, text);

    } else {
      result += htmlElement(tag, text);
    }

    return result;
  }




  return new Promise( (resolve, reject) => {

    var outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdir( outputDir, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }

  }).then( () => {

    writer = fs.createWriteStream(outputPath);
    return Parser.Book.getBook(shortName);

  }).then( book => {

    var tags = [];
    var texts = [];

    var currentLine;
    return book.parse({
      onStartBook: function() {
        writer.write(startDoc() + '\n');
      },
      onStartLine: function(line) {
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
          throw new Error('Invalid Tag: ' + tag);
        }
        if (tags[tags.length-1] !== tag) {
          throw new Error('Tag mismatched: ' + tag);
        }
        if (texts.length == 0) {
          throw new Error('Invalid content: ' + line);
        }
        tags.pop();
        var taggedText = convertTag(tag, texts.pop());
        texts[texts.length-1] += taggedText;
      },
      onEndLine: function(line) {

        while(tags.length > 0) {
          writer.write( convertTag(tags.pop(), texts.pop()) + '\n');
        }

      },
      onEndBook: function() {
        writer.write( closeParagraphIfOpened() + '\n');
        writer.write( endDoc() + '\n');
      }
    });

  }).then( () => {

    writer.end();

  }).catch( error => {

    console.log('Error');
    if (writer) {
      writer.end();
    }
    return Promise.reject(error);

  });

}


module.exports = {
  convertBook: convertBook
};
