/* jshint esversion: 6, node: true */
'use strict';
var scriptureModule = require('./modules/scripture');
var multiBooksModule = require('./modules/multi');
var bookModule = require('./modules/html');


module.exports = function(opts) {
  return {

    options: opts,
    bible: opts.bible,

    convertScripture: function(scripture, opts) {
      var options = {};
      Object.assign(options, this.options);
      Object.assign(options, opts || {});
      options.bible = this.bible;
      return scriptureModule.convertScripture(scripture, options);
    },

    convert: function(opts) {
      var options = {};
      Object.assign(options, this.options);
      Object.assign(options, opts || {});
      options.bible = this.bible;
      return multiBooksModule.convert(options);
    },

    convertBook: function(shortName, opts) {
      var options = {};
      Object.assign(options, this.options);
      Object.assign(options, opts || {});
      options.bible = this.bible;
      return bookModule.convertBook(shortName, opts);
    }
  };
};
