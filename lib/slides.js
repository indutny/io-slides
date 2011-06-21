/**
 * MarginCon 2011 Slides
 *
 * Author: Fedor Indutny
 */
var slides = exports;

var util = require('util'),
    EventEmitter = process.EventEmitter,
    Buffer = require('buffer').Buffer,
    connect = require('connect'),
    io = require('socket.io');

/**
 * Server @constructor
 */
function Server(port, host, options) {
  EventEmitter.call(this);

  /**
   * Set properties
   */
  this.port = port;
  this.host = host;
  this.password = options.password;
  this.currentSlide = 1;
  this.totalSlides = 10;

  /**
   * Listen for incoming requests
   */
  this.listen();
};
util.inherits(Server, EventEmitter);

slides.Server = Server;

/**
 * Constructor wrapper
 */
slides.run = function(port, host, options) {
  return new Server(port, host, options);
};

/**
 * Create `connect` stack
 * and start listening
 */
Server.prototype.listen = function() {
  var that = this;

  this.server = connect(
    connect.static(__dirname + '/../pub/')
  );

  /**
   * Attach socket.io to server
   */
  this.io = io.listen(this.server);

  /**
   * Listen for Socket.IO connection
   */
  this.io.of('/slides').on('connection', function(socket) {
    /**
     * Send slides info for just connected clients
     */
    socket.emit('info', {
      currentSlide: that.currentSlide
    });

    /**
     * Admin asks to move viewport
     */
    socket.on('slide', function(password, delta) {
      if (password != that.password) return;

      var currentSlide = that.currentSlide + delta;

      /**
       * Check if current slide is in boundes
       */
      currentSlide = Math.max(0, currentSlide);
      currentSlide = Math.min(currentSlide, that.totalSlides);

      /**
       * Set instance property
       */
      that.currentSlide = currentSlide;

      /**
       * Emit slide event
       */
      that.emit('slide');
    });
  });

  /**
   * Broadcast `slide` event on slide change
   */
  this.on('slide', function() {
    that.io.of('/slides').emit('slide', that.currentSlide);
  });

  /**
   * Listen for connection and emit `listen` event
   */
  this.server.listen(this.port, this.host, function() {
    that.emit('listen');
  });
};

/**
 * Change current slide
 */
Server.prototype.slideAction = function(delta) {
  this.currentSlide += delta;
  this.currentSlide = Math.max(0, this.currentSlide);
  this.currentSlide = Math.min(this.currentSlide, this.totalSlides);

  this.emit('slide');
};
