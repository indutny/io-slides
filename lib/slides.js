/**
 * Slides App
 *
 * Author: Fedor Indutny
 */

var slides = exports;

// Utils
exports.utils = require('./slides/utils');

// Core
exports.run = require('./slides/core').run;
exports.Server = require('./slides/core').Server;
