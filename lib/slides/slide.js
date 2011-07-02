/**
 * Slides app
 *
 * Slide CRUD
 */

var slide = exports;

var mongoose = require('mongoose'),
    slides = require('../slides'),
    consts = require('../slides').consts,
    slideshow = slides.slideshow;

/**
 * Slide utils
 */
slide.get = function(req, res, callback) {
  var Slide = mongoose.model('Slide');

  slideshow.get(req, res, function(slideshow) {
    var query = {
      slideshow: slideshow._id,
      index: req.params.index
    };
    Slide.findOne(query, function(err, slide) {
      if (err) return res.jsonError(err);
      if (!slide) return res.json(404);
      callback(slide, slideshow);
    });
  });
};

/**
 * Slide CRUD
 */
slide.routes = function(app, redis) {
  var Slideshow = mongoose.model('Slideshow'),
      Slide = mongoose.model('Slide');

  // List
  app.get('/api/slideshow/:slideshow/slide', function(req, res) {
    slideshow.get(req, res, function(slideshow) {
      var query = {
        slideshow: slideshow._id
      };
      Slide.find(query, function(err, slides) {
        if (err) return res.jsonError(err);
        if (!slides) return res.json(404);

        var key = 'slideshow.' + slideshow._id + '.current';
        redis.get(key, function(err, num) {
          if (err) return res.jsonError(err);

          res.json({
            current: +(num || 0),
            slides: slides.map(function(slide) {
              return {
                index: slide.index,
                content: slide.content,
                contentType: slide.contentType
              };
            })
          });
        });

      });
    });
  });

  // Select
  app.post('/api/slideshow/:slideshow/slide/select', function(req, res) {
    if (!req.user) return res.json(403);
    if (!req.body) return res.jsonError('Body is required', 400);

    slideshow.get(req, res, function(slideshow) {
      if (req.user._id != slideshow.user.toString()) res.json(403);

      var key = 'slideshow.' + slideshow._id + '.current';
      if (req.body.index) {
        res.json(200);

        var index = Math.max(0, req.body.index);

        redis.set(key, index);
        redis.expire(key, consts.POS_EXPIRE);
        next(index);
      } else if (req.body.delta) {
        redis.get(key, function(err, value) {
          if (err) return res.jsonError(err);

          value = +(value || 0);
          value += req.body.delta;

          value = Math.max(0, value);

          res.json(200);

          redis.set(key, value);
          next(value);
        });
      }

      function next(index) {
        slideshow.broadcast('select', +index);
      }
    });
  });

  // Create
  app.post('/api/slideshow/:slideshow/slide/:index', function(req, res) {
    if (!req.user) return res.json(403);
    if (!req.body) {
      return res.jsonError('Body is required', 400);
    }
    slideshow.get(req, res, function(slideshow) {
      if (req.user._id != slideshow.user.toString()) return res.json(403);

      var slide = new Slide({
        slideshow: slideshow._id,
        index: req.params.index,
        content: req.body.content,
        contentType: req.body.contentType
      });

      slide.save(function(err, slide) {
        if (err) return res.jsonError(err);
        res.json(200);
      }, slideshow);
    });
  });

  // Get
  app.get('/api/slideshow/:slideshow/slide/:index', function(req, res) {
    slide.get(req, res, function(slide) {
      res.json(slide);
    });
  });

  // Update
  app.put('/api/slideshow/:slideshow/slide/:index', function(req, res) {
    if (!req.user) return res.json(403);
    if (!req.body) {
      return res.jsonError('Body is required', 400);
    }

    slide.get(req, res, function(slide, slideshow) {
      // Check authority
      if (req.user._id != slideshow.user.toString()) return res.json(403);

      // Update content
      slide.content = req.body.content;
      slide.contentType = req.body.contentType;

      slide.save(function(err, slide) {
        if (err) return res.jsonError(err);
        res.json(200);
      }, slideshow);
    });
  });

  // Delete
  app.del('/api/slideshow/:slideshow/slide/:index', function(req, res) {
    if (!req.user) return res.json(403);
    slide.get(req, res, function(slide, slideshow) {
      // Check authority
      if (req.user._id != slideshow.user.toString()) return res.json(403);

      slide.remove(function(err) {
        if (err) return res.jsonError(err);
        res.json(200);
      }, slideshow);
    });
  });
};
