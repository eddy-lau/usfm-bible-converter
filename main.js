/* jshint esversion: 6, node: true */
'use strict';
var scriptureModule = require('./modules/scripture');
var multiBooksModule = require('./modules/multi');
var bookModule = require('./modules/html');
var options;

module.exports = function(opts) {

  options = Object.assign({}, opts);
  return {

    convertScripture: function(scripture, opts) {
      var o = Object.assign({},options,opts);
      return scriptureModule.convertScripture(scripture, o);
    },

    convert: function(opts) {
      var o = Object.assign({},options,opts);
      return multiBooksModule.convert(o);
    },

    convertBook: function(shortName, opts) {
      var o = Object.assign({},options,opts);
      return bookModule.convertBook(shortName, o);
    }
  };
};
