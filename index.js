/*jshint esversion: 6 */
var path = process.argv[2];
var converter  = require('./src/html.js')(path);
converter.convertAll();
