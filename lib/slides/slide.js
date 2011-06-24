/**
 * Slides app
 *
 * Slide CRUD
 */

var slideshow = exports;

var mongoose = require('mongoose');

/**
 * Slideshow CRUD
 */
slideshow.routes = function(app, redis) {
  var Slideshow = mongoose.model('Slideshow'),
      Slide = mongoose.model('Slide');

  // List
  app.get('/api/slideshow/:slideshow/slide', function(req, res) {
    var query = {
      slideshow: req.params.slideshow
    };
    Slide.find(query, function(err, slides) {
      if (err) return res.json({error: true, reason: err}, 500);
      if (!slides) return res.json('Not found', 404);
      res.json(slides);
    });
  });

  // Create
  app.post('/api/slideshow/:slideshow/slide/:index', function(req, res) {
    if (!req.user) return res.json(403);
    if (!req.body) {
      return res.jsonError('Body is required', 400);
    }
    req.body.user = req.user._id;
    Slideshow.findById(req.params.slideshow, function(err, slideshow) {
      if (err) return res.jsonError(err);
      if (!slideshow) return res.json(404);

      if (req.user._id != slideshow.user.toString()) return res.json(403);

      var slide = new Slide({
        slideshow: slideshow._id,
        index: req.params.index,
        markdown: req.body.markdown
      });
      slide.save(function(err, slide) {
        if (err) return res.jsonError(err);
        res.json(200);

        redis.publish('slideshow.' + req.params.slideshow,
                      JSON.stringify({
                        action: 'create',
                        slide: {
                          index: req.params.index,
                          markdown: req.body.markdown
                        }
                      }));
      });
    });
  });

  // Get
  app.get('/api/slideshow/:slideshow/slide/:index', function(req, res) {
    var query = {
      slideshow: req.params.slideshow,
      index: req.params.index
    };

    Slide.findOne(query, function(err, slide) {
      if (err) return res.jsonError(err);
      if (!slide) return res.json(404);
      res.json(slide);
    });
  });

  // Update
  app.put('/api/slideshow/:slideshow/slide/:index', function(req, res) {
    if (!req.user) return res.json(403);
    if (!req.body) {
      return res.jsonError('Body is required', 400);
    }

    var query = {
      slideshow: req.params.slideshow,
      index: req.params.index
    };

    Slide.findOne(query, function(err, slide) {
      if (err) return res.jsonError(err);
      if (!slide) return res.json(404);

      Slideshow.findById(slide.slideshow, function(err, slideshow) {
        if (err) return res.jsonError(err);
        if (!slideshow) return res.json(404);

        // Check authority
        if (req.user._id != slideshow.user.toString()) return res.json(403);

        slide.markdown = req.body.markdown;
        slide.save(function(err, slide) {
          if (err) return res.jsonError(err);
          res.json(200);
          redis.publish('slideshow.' + req.params.slideshow,
                        JSON.stringify({
                          action: 'update',
                          slide: {
                            index: req.params.index,
                            markdown: req.body.markdown
                          }
                        }));
        });
      });
    });
  });

  // Delete
  app.del('/api/slideshow/:slideshow/slide/:slide', function(req, res) {
    Slide.findOne(query, function(err, slide) {
      if (err) return res.jsonError(err);
      if (!slide) return res.json(404);

      Slideshow.findById(slide.slideshow, function(err, slideshow) {
        if (err) return res.jsonError(err);
        if (!slideshow) return res.json(404);

        // Check authority
        if (req.user._id != slideshow.user.toString()) return res.json(403);

        slide.remove(function(err) {
          if (err) return res.jsonError(err);
          res.json(200);
          redis.publish('slideshow.' + req.params.slideshow,
                        JSON.stringify({
                          action: 'delete',
                          index: req.params.index
                        }));
        });
      });
    });
  });
};
