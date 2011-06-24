/**
 * Slides App
 *
 * - Server module
 *
 * Author: Fedor Indutny
 */

var server = exports;

var slides = require('../slides'),
    utils = slides.utils;

var util = require('util'),
    io = require('socket.io'),
    express = require('express'),
    mongoose = require('mongoose'),
    mongooseAuth = require('mongoose-auth');

var RedisStore = require('connect-redis')(express),
    EventEmitter = process.EventEmitter,
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

/**
 * Server @constructor
 */
var Server = server.Server = function Server(options) {
  EventEmitter.call(this);

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

  this.app = express.createServer(
    express.cookieParser(),
    express.session({
      secret: options.secret,
      store: new RedisStore(options.db.redis)
    }),
    express.static(__dirname + '/../../public'),
    express.bodyParser(),
    utils.jsonMiddleware,

    // Add 3rd-services auth
    mongooseAuth.middleware()
  );
  this.app.set('view engine', 'jade');
  this.app.set('views', __dirname + '/../../views');

  // Add dynamic view handlers
  mongooseAuth.helpExpress(this.app);

  // Apply routes
  this.routes();

  this.listen();
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

  io.listen(this.app);

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
      date: {type: Date, default: Date.now}
    }),
    Slide: new Schema({
      slideshow: {
        type: ObjectId,
        index: true
      },
      index: {type: Number, min: 0, index: true, required: true},
      markdown: {type: String, required: true}
    })
  };

  // Setup auth
  var User,
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

  // Connect to Database
  mongoose.connect(this.options.db.mongodb);
};

/**
 * Routes
 */
Server.prototype.routes = function() {
  var app = this.app;

  app.get('/', function(req, res) {
    res.render('users/index');
  });

  var Slideshow = mongoose.model('Slideshow');
  app.get('/play/:slideshow', function(req, res) {
    Slideshow.findById(req.params.slideshow, function(err, slideshow) {
      if (err || !slideshow) return res.redirect('/');
      res.render('users/slideshow', {
        title: slideshow.title
      });
    });
  });

  // Apply various routes
  slides.slideshow.routes(app);
  slides.slide.routes(app);
};