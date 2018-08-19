/*jshint esversion: 6 */

var html  = require('./src/html.js');
var Parser = require('rcuv-html-parser');
var result = '';

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
  'imt': 'p',
  'iot': 'p',
  'ip': 'p',
  'is': 'p',
  'li1': 'p',
  'm': 'p',
  'ms': 'p',
  'mt1': 'p',
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
  'v': 'span'
};

function startHtmlTag(tag) {
  var htmlTag = TAGS_MAP[tag];
  if (!htmlTag) {
    throw new Error('No HTML Tag for: ', tag);
  }
  return '<' + htmlTag + ' class="' + tag + '">';
}

function endHtmlTag(tag) {
  var htmlTag = TAGS_MAP[tag];
  if (!htmlTag) {
    throw new Error('No HTML Tag for: ', tag);
  }
  return '</' + htmlTag + '>';
}

function htmlElement(tag, text) {
  return startHtmlTag(tag) + text + endHtmlTag(tag);
}

function convert(tag, text) {
  var htmlTag = TAGS_MAP[tag];
  if (!htmlTag) {
    throw new Error('No HTML Tag for: ', tag);
  }

  if (tag == 'v') {

    let verseNumber = text.match( /^\d+? / );
    if (!verseNumber || verseNumber.length == 0) {
      throw new Error('Verse number not found: ', text);
    }

    return htmlElement(tag, verseNumber[0]) + text.substring(verseNumber[0].length);

  } else {
    return htmlElement(tag, text);
  }
}

Parser.Book.getBook('gen').then( function(book) {

  const VERSE = 1;
  const PAIRED_TAG = 2;
  const CHAPTER = 3;

  var tags = [];
  var texts = [];

  var currentLine;
  return book.parse({
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
      var taggedText = convert(tag, texts.pop());
      texts[texts.length-1] += taggedText;
    },
    onEndLine: function(line) {

      while(tags.length > 0) {
        console.log( convert(tags.pop(), texts.pop()) );
      }

    }
  });


});
