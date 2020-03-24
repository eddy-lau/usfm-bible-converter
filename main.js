/* jshint esversion: 6, node: true */
'use strict';
var scriptureModule = require('./modules/scripture');
var multiBooksModule = require('./modules/multi');
var bookModule = require('./modules/html');

module.exports = function(opts) {

  return {
    options: opts,
    convertScripture: function(scripture, opts) {
      var o = Object.assign({},this.options,opts);
      return scriptureModule.convertScripture(scripture, o);
    },

    convert: function(opts) {
      var o = Object.assign({},this.options,opts);
      return multiBooksModule.convert(o);
    },

    convertBook: function(shortName, opts) {
      var o = Object.assign({},this.options,opts);
      return bookModule.convertBook(shortName, o);
    }
  };
};
