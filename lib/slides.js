/**
 * Slides App
 *
 * Author: Fedor Indutny
 */

var slides = exports;

// Utils
exports.utils = require('./slides/utils');

// Slideshow
exports.slideshow = require('./slides/slideshow');

// Slide
exports.slide = require('./slides/slide');

// Server
exports.run = require('./slides/server').run;
exports.Server = require('./slides/server').Server;
