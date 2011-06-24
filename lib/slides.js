/**
 * Slides App
 *
 * Author: Fedor Indutny
 */

var slides = exports;

// Utils
exports.utils = require('./slides/utils');

// Server
exports.run = require('./slides/server').run;
exports.Server = require('./slides/server').Server;
