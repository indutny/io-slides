/**
 * Slides app
 *
 * Core
 */
var core = exports;

var slides = require('../slides');

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

  this.options = options = slides.utils.merge({
    port: 8081,
    host: '0.0.0.0',
    username: 'admin',
    password: '13589',
    db: {
      host: 'localhost',
      port: 5984,
      username: 'admin',
      password: 'admin',
      database: 'slides',
      timeout: 1000
    }
  }, options);

  /**
   * Set properties
   */
  this.port = port;
  this.host = host;
  this.username = options.username;
  this.password = options.password;
  this.currentSlide = 0;

  /**
   * Create DB wrapper
   */
  this.db = slides.db.create(options.db);

  /**
   * Listen for incoming requests
   */
  this.listen();
};
util.inherits(Server, EventEmitter);

core.Server = Server;

/**
 * Constructor wrapper
 */
core.run = function(port, host, options) {
  return new Server(port, host, options);
};

/**
 * Create `connect` stack
 * and start listening
 */
Server.prototype.listen = function() {
  var that = this;

  this.server = connect(
    connect.static(__dirname + '/../../pub/'),
    slides.utils.jsonMiddleware,
    connect.basicAuth(function(user, pass) {
      return user === that.username &&
             pass === that.password;
    }),
    connect.bodyParser(),
    connect.router(this.adminRouter.bind(this)),
    connect.router(this.db.adminRouter.bind(this.db))
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
      currentSlide: that.currentSlide,
      slides: that.db.slides,
    });
  });

  /**
   * Broadcast `slide` event on slide change
   */
  this.on('slide', function() {
    that.io.of('/slides').emit('slide', that.currentSlide);
  });


  /**
   * Broadcast database changes
   */
  this.db.on('create', function(slide) {
    that.io.of('/slides').emit('new', slide);
  });
  this.db.on('update', function(num, slide) {
    that.io.of('/slides').emit('update', num, slide);
  });
  this.db.on('delete', function(num) {
    that.io.of('/slides').emit('delete', num);
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
  this.currentSlide = Math.min(this.currentSlide, this.db.slides.length - 1);

  this.emit('slide');
};

/**
 * Admin router for moving slides
 */
Server.prototype.adminRouter = function(app) {
  var that = this;

  app.post('/api/move', function(req, res) {
    if (!req.body || !req.body.delta) {
      res.json({
        error: true,
        reason: 'Delta is required'
      }, 400);
      return;
    }

    res.json({ok: true});

    that.slideAction(req.body.delta);
  });
};
