/**
 * Slides App
 *
 * - Server module
 *
 * Author: Fedor Indutny
 */

var server = exports;

var slides = require('../slides'),
    slideshow = slides.slideshow,
    slide = slides.slide,
    utils = slides.utils;

var util = require('util'),
    io = require('socket.io'),
    express = require('express'),
    stylus = require('stylus'),
    mongoose = require('mongoose'),
    mongooseAuth = require('mongoose-auth'),
    redis = require('redis'),
    cdn = require('connect-cdn');

var RedisStore = require('connect-redis')(express),
    EventEmitter = process.EventEmitter,
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

/**
 * Server @constructor
 */
var Server = server.Server = function Server(options) {
  EventEmitter.call(this);

  var that = this;

  this.options = options = utils.merge({
    port: 8081,
    host: '0.0.0.0',
    secret: '12345',
    db: {
      mongodb: 'mongodb://localhost/slides',
      redis: {
      }
    },
    auth: {
    }
  }, options);

  this.initDb();

  var cdnMiddleware;

  this.app = express.createServer(
    cdnMiddleware = cdn({
      debug: true,
      root: __dirname + '/../../public',
      container: options.cdnContainer,
      cloudfiles: {
        auth: options.cloudfiles
      }
    }, function() {
      that.listen();
    }),
    stylus.middleware({
      src: __dirname + '/../../public',
      dest: __dirname + '/../../public',
      compile: function(str, path) {
        return stylus(str)
            .set('filename', path)
            .set('compress', true)
            // Export `cdn` method to stylus
            .define('cdn', function(url) {
              url = url.toString().replace(/^"(.*)"$/, '$1');
              url = cdnMiddleware.cdn('/')(url, true);

              return new (stylus.nodes.String)(url);
            });
      }
    }),
    express.static(__dirname + '/../../public'),
    express.cookieParser(),
    express.session({
      secret: options.secret,
      store: new RedisStore(options.db.redis),
      cookie: {
        maxAge: 1e3 * 3600 * 24 * 2
      }
    }),
    express.bodyParser(),
    utils.jsonMiddleware,

    // Add 3rd-services auth
    mongooseAuth.middleware()
  );

  this.app.set('view engine', 'jade');
  this.app.set('views', __dirname + '/../../views');

  // Add dynamic view handlers
  mongooseAuth.helpExpress(this.app);
  cdn.expressHelper(this.app);

  // Apply routes
  this.routes();
};
util.inherits(Server, EventEmitter);

server.run = function(options) {
  return new Server(options);
};

/**
 * Listen for incoming connections
 */
Server.prototype.listen = function() {
  var that = this;

  this.io = io.listen(this.app);
  this.io.set('log level', 0);

  this.io.sockets.on('connection', function(socket) {
    socket.on('join', function(slideshow) {
      socket.join('slideshow:' + slideshow);
    });
  });

  this.app.listen(this.options.port,
                  this.options.host, function() {
                    that.emit('listen')
                  });
};

/**
 * Initialize database
 * create models, etc
 */
Server.prototype.initDb = function() {
  var that = this

  // Create Schema&Models
  var models = this.models = {
    User: new Schema({}),
    Slideshow: new Schema({
      user: {
        type: ObjectId,
        index: true
      },
      title: {
        type: String,
        required: true
      },
      slug: {
        type: String,
        unique: true
      },
      date: {type: Date, default: Date.now}
    }),
    Slide: new Schema({
      slideshow: {
        type: ObjectId,
        index: true
      },
      index: {type: Number, min: 0, index: true, required: true},
      contentType: {type: String, default: 'markdown'},
      content: {type: String, required: true}
    })
  };

  // Init model
  slideshow.init(models.Slideshow, models.Slide, this);
  slide.init(models.Slide, models.Slideshow, this);

  // Setup auth
  var User,
      Slideshow,
      Slide,
      authOptions = utils.merge({
        everymodule: {
          everyauth: {
            User: function() {
              return User;
            }
          }
        }
      }, this.options.auth);

  models.User.plugin(mongooseAuth, authOptions);

  // Save models
  mongoose.model('User', models.User);
  mongoose.model('Slideshow', models.Slideshow);
  mongoose.model('Slide', models.Slide);

  // Set reference
  User = mongoose.model('User');
  Slideshow = mongoose.model('Slideshow');
  Slide = mongoose.model('Slide');

  // Connect to Database
  mongoose.connect(this.options.db.mongodb);

  // Create redis connection
  this.redis = redis.createClient(this.options.db.redis.port,
                                  this.options.db.redis.host,
                                  this.options.db.redis.options);
  this.redisSub = redis.createClient(this.options.db.redis.port,
                                     this.options.db.redis.host,
                                     this.options.db.redis.options);
  this.subscribe();
};

/**
 * Subscribe to redis pubsub messages
 */
Server.prototype.subscribe = function() {
  var that = this;

  this.redisSub.psubscribe('slideshow.*');
  this.redisSub.on('pmessage', function(pattern, channel, message) {
    var match = channel.match(/^slideshow\.(.+)$/);

    if (!match) return;

    var slideshow = match[1];
    try{
      message = JSON.parse(message);
    } catch(e) {
      console.error(e);
      return;
    }
    that.io.sockets.in('slideshow:' + slideshow).emit(message.action, message.data);
  });
};

/**
 * Routes
 */
Server.prototype.routes = function() {
  var app = this.app,
      Slideshow = mongoose.model('Slideshow');

  app.get('/', function(req, res) {
    if (req.user) {
      Slideshow.find({
        user: req.user._id
      }, function(err, slideshows) {
        if (err) slideshows = [];

        res.render('users/index', {
          slideshows: slideshows
        });
      });
    } else {
      res.render('users/index');
    }
  });

  app.get('/play/:slideshow', function(req, res) {
    Slideshow.get(req, function(err, slideshow) {
      if (err || !slideshow) return res.redirect('/');
      res.render('users/slideshow', {
        title: slideshow.title,
        slideshow: slideshow,
        owner: req.user &&
               slideshow.user.toString() == req.user._id
      });
    });
  });

  // Apply various routes
  slideshow.routes(app);
  slide.routes(app, this.redis);
};
