/**
 * Slides
 *
 * Utils
 */

var utils = exports;

var Buffer = require('buffer').Buffer;

/**
 * Merge `a` and `b` into new object `c`
 */
function merge(a, b) {
  var c = {};

  /**
   * Copy all properties of a into c
   */
  if (a) {
    for (var i in a) {
      if (a.hasOwnProperty(i)) {
        c[i] = a[i];
      }
    }
  }

  /**
   * Do same with b, but merge existing properties
   */
  if (b) {
    for (var i in b) {
      if (b.hasOwnProperty(i)) {
        c[i] = typeof b[i] === 'object' &&
               typeof c[i] === 'object' ?
                   merge(c[i], b[i])
                   :
                   b[i];
      }
    }
  }

  return c;
};
utils.merge = merge;

/**
 * Middleware that adds .json() method
 */
function jsonMiddleware(req, res, next) {
  var codes = {
    404: 'Not found',
    403: 'Access denined',
    500: 'Server error',
    200: {ok: true}
  };
  res.json = function(data, code) {
    if (!code && typeof data === 'number' && codes[data]) {
      res.json(codes[data], data);
      return;
    }

    data = JSON.stringify(data);
    res.writeHead(code || 200, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    });
    res.end(data);
  };
  res.jsonError = function(err, code) {
    res.json({error: true, reason: err}, code || 500);
  };
  next();
};
utils.jsonMiddleware = jsonMiddleware;
