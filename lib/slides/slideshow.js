/**
 * Slides app
 *
 * Slideshow CRUD
 */

var slideshow = exports;

var mongoose = require('mongoose');

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
    req.body.user = req.user._id;
    var slideshow = new Slideshow(req.body);
    slideshow.save(function(err, slideshow) {
      if (err) return res.jsonError(err);
      res.json(slideshow);
    });
  });

  // Get
  app.get('/api/slideshow/:slideshow', function(req, res) {
    Slideshow.findById(req.params.slideshow, function(err, slideshow) {
      if (err) return res.jsonError(err);
      if (!slideshow) return res.json(404);
      res.json(slideshow);
    });
  });

  // Update
  app.put('/api/slideshow/:slideshow', function(req, res) {
    if (!req.user) return res.json(403);
    if (!req.body) {
      return res.jsonError('Body is required', 400);
    }
    Slideshow.findById(req.params.slideshow, function(err, slideshow) {
      if (err) return res.jsonError(err);
      if (!slideshow) return res.json(404);

      // Check authority
      if (req.user._id != slideshow.user.toString()) {
        return res.json(403);
      }

      // Update props
      slideshow.title = req.body.title;

      slideshow.save(function(err) {
        if (err) return res.jsonError(err);
        res.json(200);
      });
    });
  });
};
