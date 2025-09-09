/* jshint esversion: 6, node: true */
'use strict';
var converter  = require('../html');

function getBookShortName(bookName, opts) {

  return Promise.resolve().then( ()=> {

    if (opts.bible._books) {
      return opts.bible._books;
    }

    return opts.bible.getBooks();

  }).then( books => {

    opts.bible._books = books;
    return books.find( book => {
      return book.localizedData.name == bookName ||
             book.localizedAltNames.indexOf(bookName) != -1;
    });

  }).then (book => {

    if (book) {
      return book.shortName;
    } else {
      var availableBooks = opts.bible._books.map( book => {
        return book.localizedData.name;
      }).join(', ');
      throw new Error('Book not found: ' + bookName, ' from [', availableBooks, ']');
    }

  });
}

function parseScriptures(scriptures, opts) {

  /* handle these cases here
  E.g.  使徒行傳6：8～15，7：54～56
  E.g.  瑪拉基書2：10～16，3：7～12
  E.g.  瑪拉基書2：17～3：6，3：13～4：3
  E.g.  瑪拉基書2：10～16，3：7～12
  E.g.  瑪拉基書2：17～3：6，3：13～4：3
  E.g.  瑪拉基書2：17～3：6，3：13～4：3
  E.g.  瑪拉基書2：10～16，3：7～12
  E.g.  利未記18：1～5、24～30
  E.g.  利未記18：1～5、24～30
  E.g.  利未記18：1～5、24～30
  */

  var array = scriptures.split(/[，、]/);

  var results = [];
  array.forEach( (s, i) => {
    results.push(parseScripture(s, opts, i>0 ? results[i-1]: undefined));
  });

  return Promise.all( results.map( result => {

    return getBookShortName(result.book, opts).then( shortName => {
      result.bookName = shortName;
      return result;
    });

  }));

}

function parseScripture(scripture, opts, prevResult) {

  scripture = scripture.replace(/[～~]/g, '-');
  scripture = scripture.replace(/[：︰]/g, ':');
  scripture = scripture.replace(/ /g, '');

  var parts;
  var matches = scripture.match(/^\D+\d/);
  if (matches) {
    parts = [
      matches[0].substring(0,matches[0].length-1),
      scripture.substring(matches[0].length-1)
    ];
  } else {

    if (!prevResult) {
      throw new Error('Invalid scripture: ', scripture);
    }

    if (!scripture.match(/:/)) {
      scripture = '' + prevResult.toChapter + ':' + scripture;
    }

    parts = [
      prevResult.book,
      scripture
    ];
  }

  var result = {
    fromChapter: undefined,
    fromVerse: undefined,
    toChapter: undefined,
    toVerse: undefined,
    secondHalfOfFirstVerse: false,
    firstHalfOfLastVerse: false    
  };
  result.book = parts[0];

  parts = parts[1].split('-');
  var fromParts = parts[0].split(':');
  var toParts = parts.length > 1 ? parts[1].split(':'):undefined;

  if (fromParts.length == 1) {
    fromParts = ['1', fromParts[0]];
  }
  result.fromChapter = parseInt(fromParts[0]);

  var fromVerseStr = fromParts.length > 1 ? fromParts[1] : undefined;
  if (fromVerseStr) {
    result.fromVerse = parseInt(fromVerseStr);
    if (fromVerseStr.endsWith('b')) {
      result.secondHalfOfFirstVerse = true;
    }
  }

  if (toParts) {
    result.toChapter = toParts.length > 1 ? parseInt(toParts[0]):result.fromChapter;
    result.toVerse = toParts.length > 1 ? parseInt(toParts[1]):parseInt(toParts[0]);

    var toVerseStr = toParts.length > 1 ? toParts[1] : toParts[0];
    result.toVerse = parseInt(toVerseStr);

    if (toVerseStr.endsWith('a')) {
      // To handle the following
      // e.g. ACT 9:1-19a
      // Just need the first half of the to verse text.
      result.firstHalfOfLastVerse = true;
    }

  } else {
    result.toChapter = result.fromChapter;
    result.toVerse = result.fromVerse;
  }

  if (!result.fromChapter || !result.fromVerse ||
      !result.toChapter) {

    console.log(result);
    throw new Error('Parse error: ' + scripture);
  }

  return result;

}


function convertScripture(scripture, opts) {

  if (!opts || typeof opts !== 'object') {
    throw new Error('Invalid options');
  }

  if (opts.bible == undefined) {

    opts.bible = require('rcuv-usfm').bible;

  }

  opts = opts || {};
  opts.convertScripture = true;

  return parseScriptures(scripture, opts)
  .then( array => {
    if (array.length > 1) {

      var sameBook = array.reduce( (accumulator, currentValue) => {
        return accumulator && currentValue.bookName == array[0].bookName;
      }, true);

      if (!sameBook) {
        throw new Error('Not supported, different book: ', scripture);
      }

      Object.assign(opts, {scriptures:array, bookName:array[0].bookName});
    } else {
      Object.assign(opts, array[0]);
    }
    return converter.convertBook(opts.bookName, opts);
  });

}


module.exports = {
  convertScripture: convertScripture
};
