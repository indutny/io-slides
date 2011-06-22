/**
 * Slides App
 *
 * Author: Fedor Indutny
 */

var slides = exports;

// Utils
exports.utils = require('./slides/utils');

// Db
exports.db = require('./slides/db');

// Core
exports.run = require('./slides/core').run;
exports.Server = require('./slides/core').Server;
