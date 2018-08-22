/*jshint esversion: 6 */

var converter  = require('./src/html.js');

converter.convertAll()
.catch( err => {
  console.log(err);
});
