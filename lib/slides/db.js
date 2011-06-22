/**
 * Slides App
 *
 * Database module
 */

var db = exports;

var cradle = require('cradle'),
    util = require('util'),
    uuid = require('node-uuid'),
    EventEmitter = process.EventEmitter;

/**
 * Db @constructor
 */
function Db(options) {
  EventEmitter.call(this);

  this.options = options;
  this.slides = [];

  this.connection = new cradle.Connection(options.host, options.port, {
    auth: {
      username: options.username,
      password: options.password
    }
  });
  this.database = this.connection.database(options.database);

  /**
   * Get initial slides from database
   */
  this.init();
  this.listen();
};
util.inherits(Db, EventEmitter);
db.Db = Db;

/**
 * Constructor wrapper
 */
function create(options) {
  return new Db(options);
};
db.create = create;

/**
 * Get inital slides from database
 */
Db.prototype.init = function() {
  var that = this;

  this.database.all({
    startkey: '"slide-"',
    endkey: '"slide-z"',
    include_docs: true
  }, function(err, docs) {
    if (err) throw err;
    that.slides = docs.map(function(doc) {
      return {
        _id: doc._id,
        num: doc.num,
        markdown: doc.markdown
      };
    });
    that.sort();
  });
};

/**
 * Sort slides
 */
Db.prototype.sort = function() {
  this.slides.sort(function(a, b) {
    return a.num > b.num ? 1 :
           a.num == b.num ? 0 : -1;
  });
};

/**
 * Listen for changes too
 */
Db.prototype.listen = function(since) {
  var that = this;

  /**
   * If we don't know last seq_id
   * Get it from database
   */
  if (since) {
    listen();
  } else {
    that.database.info(function(err, info) {
      if (err) return retry();
      since = info.update_seq;
      listen();
    });
  }

  /**
   * Really listen for changes
   */
  function listen() {
    var promise = that.database.changes({include_docs: true, since: since});

    promise.on('response', function(res) {
      res.on('data', function(change) {
        since = change.seq;
        if (!/^slide-/.test(change.id)) return;
        var id = change.id,
            index = that.slides.reduce(function(match, slide, i) {
              if (match >= 0) return match;
              return slide._id === id ? i : -1;
            }, -1);

        if (!change.deleted) {
          var slide = {
            _id: id,
            num: change.doc.num,
            markdown: change.doc.markdown
          };

          if (index === -1) {
            that.slides.push(slide);
            that.emit('create', slide);
          } else {
            that.slides[index] = slide;
            that.emit('update', index, slide);
          }
        } else {
          that.slides.splice(index, 1);
          that.emit('delete', index);
        }

        /**
         * Sort slides
         */
        that.sort();

      });

      res.on('end', function() {
        retry();
      });
    });
  };

  /**
   * Retry listening on fail or request end
   */
  function retry() {
    setTimeout(function() {
      that.listen(since);
    }, that.options.timeout);
  };
};

/**
 * Admin functionality for Db
 * (Adding/Updating/Removing slides)
 */
Db.prototype.adminRouter = function(app) {
  var that = this;

  function jsonReply(res) {
    return function(err) {
      if (err) {
        res.json({error: true, reason: err});
      } else {
        res.json({ok: true});
      }
    };
  }
  /**
   * Create new slide
   */
  app.post('/api/slides', function(req, res) {
    if (!req.body || !req.body.slide || !req.body.slide.num ||
        !req.body.slide.markdown) {
      return res.json({
        error: true,
        reason: 'Slide is required'
      }, 400);
    }
    that.database.save('slide-' + uuid(), {
      num: req.body.slide.num,
      markdown: req.body.slide.markdown
    }, jsonReply(res));
  });

  /**
   * Update slide
   */
  app.put('/api/slides/:id', function(req, res) {
    if (!req.body || !req.body.slide || !req.body.slide.num ||
        !req.body.slide.markdown) {
      return res.json({
        error: true,
        reason: 'Slide is required'
      }, 400);
    }
    if (!/^slide-/.test(req.params.id)) {
      return res.json({
        error: ture,
        reason: 'Id should start with slide-'
      }, 400);
    }
    that.database.save(req.params.id, {
      num: req.body.slide.num,
      markdown: req.body.slide.markdown
    }, jsonReply(res));
  });

  /**
   * Remove slide
   */
  app.del('/api/slides/:id', function(req, res) {
    that.remove(req.params.id, jsonReply(res));
  });
};
