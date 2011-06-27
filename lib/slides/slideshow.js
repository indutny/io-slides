/**
 * Slides app
 *
 * Slideshow CRUD
 */

var slideshow = exports;

var mongoose = require('mongoose');

/**
 * Slideshow utils
 */
slideshow.get = function(req, res, callback) {
  var Slideshow = mongoose.model('Slideshow');

  if (!req.params.slideshow) return res.json(404);

  // Firstly, try to load it by id
  Slideshow.findById(req.params.slideshow, function(err, slideshow) {
    if (err) return res.jsonError(err);

    // Then if not found - load by slug
    if (!slideshow) return loadBySlug();

    callback(slideshow);
  });

  function loadBySlug() {
    Slideshow.findOne({slug: req.params.slideshow}, function(err, slideshow) {
      if (err) return res.jsonError(err);

      if (!slideshow) return res.json(404);

      callback(slideshow);
    });
  };
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
      if (req.body.redirect) return res.redirect('/play/' + slideshow._id);
      res.json(slideshow);
    });
  });

  // Get
  app.get('/api/slideshow/:slideshow', function(req, res) {
    slideshow.get(req, res, function(slideshow) {
      res.json(slideshow);
    });
  });

  // Update
  app.put('/api/slideshow/:slideshow', function(req, res) {
    if (!req.user) return res.json(403);
    if (!req.body) {
      return res.jsonError('Body is required', 400);
    }
    slideshow.get(req, res, function(slideshow) {
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
