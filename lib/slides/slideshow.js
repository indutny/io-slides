/**
 * Slides app
 *
 * Slideshow CRUD
 */

var slideshow = exports;

var mongoose = require('mongoose');

/**
 * Init model
 */
slideshow.init = function(Slideshow, Slide, server) {
  // Slideshow slug getter
  Slideshow.path('slug').get(function(v) {
    return v || this._id.toString();
  });

  // Randomize slug
  Slideshow.pre('save', function(next) {
    this.set('slug', this.get('title').replace(/[^a-z0-9]+/g, '.') + '-' +
                     ~~(Math.random() * 1e9));
    next();
  });

  // Create slide after slideshow creation
  Slideshow.pre('save', function(next) {
    if (!this.isNew) return;

    var Slide = mongoose.model('Slide'),
        slide = new Slide({
          slideshow: this.get('_id'),
          index: 1,
          content: '##Double-click me to edit\r\n' +
                   '###Ctrl+Enter to save\r\n' +
                   '*You can use markdown for text*',
          contentType: 'markdown'
        });

    next();

    slide.save(function() {
    }, this);
  });

  // Add get static method
  Slideshow.static({
    get: function(req, res, callback) {
      if (!req.params.slideshow) return res.json(404);

      var Slideshow = mongoose.model('Slideshow'),
          validId = req.params.slideshow.length <= 24;

      if (!callback && typeof res === 'function') {
        callback = res;

        if (validId) {
          Slideshow.findById(req.params.slideshow, onResult);
        } else {
          onResult(null, null);
        }

        function onResult(err, slideshow) {
          if (err || !slideshow) {
            Slideshow.findOne({slug: req.params.slideshow}, callback);
          } else {
            callback(err, slideshow);
          }
        };
        return;
      }

      if (validId) {
        Slideshow.findById(req.params.slideshow, onSecondResult);
      } else {
        onSecondResult(null, null);
      }

      // Firstly, try to load it by id
      function onSecondResult(err, slideshow) {
        if (err) return res.jsonError(err);

        // Then if not found - load by slug
        if (!slideshow) return loadBySlug();

        callback(slideshow);
      };

      function loadBySlug() {
        Slideshow.findOne({slug: req.params.slideshow}, function(err, slideshow) {
          if (err) return res.jsonError(err);

          if (!slideshow) return res.json(404);

          callback(slideshow);
        });
      };
    }
  });

  // Add broadcast method
  Slideshow.method({
    broadcast: function(action, data) {
      data = JSON.stringify({
        action: action,
        data: data
      });

      var id = this._id.toString();

      server.redis.publish('slideshow.' + id, data);

      if (id != this.slug.toString()) {
        server.redis.publish('slideshow.' + this.slug, data);
      }
    }
  });

};

/**
 * Slideshow CRUD
 */
slideshow.routes = function(app) {
  var Slideshow = mongoose.model('Slideshow');

  // List
  app.get('/api/slideshow', function(req, res) {
    if (!req.user) return res.json(403);

    var query = {
      user: req.user._id
    };

    Slideshow.find(query, function(err, slideshows) {
      if (err) return res.jsonError(err);
      res.json(slideshows);
    });
  });

  // Create
  app.post('/api/slideshow', function(req, res) {
    if (!req.user) return res.json(403);
    if (!req.body) {
      return res.jsonError('Body is required', 400);
    }

    var data = {
      title: req.body.title,
      user: req.user._id,
      slug: req.body.slug
    };

    var slideshow = new Slideshow(data);
    slideshow.save(function(err, slideshow) {
      if (err) return res.jsonError(err);
      if (req.body.redirect) return res.redirect('/play/' + slideshow.slug);
      res.json(slideshow);
    });
  });

  // Get
  app.get('/api/slideshow/:slideshow', function(req, res) {
    Slideshow.get(req, res, function(slideshow) {
      res.json(slideshow);
    });
  });

  // Update
  app.put('/api/slideshow/:slideshow', function(req, res) {
    if (!req.user) return res.json(403);
    if (!req.body) {
      return res.jsonError('Body is required', 400);
    }
    Slideshow.get(req, res, function(slideshow) {
      // Check authority
      if (req.user._id != slideshow.user.toString()) {
        return res.json(403);
      }

      // Update props
      slideshow.title = req.body.title;
      slideshow.slug = req.body.slug;

      slideshow.save(function(err) {
        if (err) return res.jsonError(err);
        res.json(200);
      });
    });
  });
};
