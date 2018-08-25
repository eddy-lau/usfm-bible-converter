/*jshint esversion: 6 */
var converter  = require('./src/html.js');

console.log('');
console.log('');
console.log('');
console.log('');
console.log('');
console.log('');
console.log('');
console.log('');
console.log('');
console.log('');

converter.convertAll()
.catch( err => {
  console.log(err);
});
