!function() {
  var slideShowId = location.href.match(/play\/([^\/]+)/)[1],
      socket = io.connect('/slideshow/' + slideShowId),
      container = $('#slides'),
      converter = new Showdown.converter(),
      slideShow,
      slides;

  /**
   * Rerender slideshow
   */
  function rerender() {
    slideShow && slideShow.hide();
    container.empty();

    /**
     * Sort slides
     */
    slides.sort(function(a, b) {
      return a.index > b.index ? 1 :
             a.index == b.index ? 0 : -1;
    });

    /**
     * Render Markdown templates to html
     * and append articles to container
     */
    slides.forEach(function(slide) {
      var content = $(slide.html);
      content.find('code').addClass('prettyprint');

      $('<article />').append(content)
                      .data('slide', slide)
                      .appendTo(container);
    });
    slideShow && slideShow.rerender();

    prettyPrint && prettyPrint();
  };

  function renderSlide(slide) {
    slide.markdown || (slide.markdown = '');
    slide.markdown = slide.markdown.toString()

    slide.html = [
      '<section class="middle">',
      converter.makeHtml(slide.markdown),
      '</section>'
    ].join('');

    return slide;
  };

  $.getJSON('/api/slideshow/' + slideShowId + '/slide', function(info) {
    /**
     * Save slides for future sync
     */
    window.slides = slides = info.slides.map(renderSlide);

    /**
     * Init slideshow
     */
    slideShow = window.slideShow = new SlideShow(container,
                                                 '#slides > article');
    slideShow.select(info.current);
    rerender();
  });

  /**
   * Handle `slide` event and change current slide
   */
  socket.on('select', function(num) {
    slideShow.select(num);
  });

  /**
   * Handle slide changes
   */
  function findSlide(index) {
    return slides.reduce(function(match, slide, i) {
      if (match >= 0) return match;
      return slide.index == index ? i : match;
    }, -1);
  };

  socket.on('create', function(slide) {
    slides.push(renderSlide(slide));
    rerender();
  });

  socket.on('update', function(slide) {
    var index = findSlide(slide.index);

    if (index === -1) {
      slides.push(renderSlide(slide));
    } else {
      slides[index] = renderSlide(slide);
    }

    rerender();
  });

  socket.on('delete', function(index) {
    index = findSlide(index);

    if (index === -1) return;

    slides.splice(index, 1);
    rerender();
  });


  /**
   * SlideShow Class @constructor
   */
  function SlideShow(container, selector) {
    var slides = this.slides = [];
    this.current = 0;

    var visible = this.visible = {};

    visible.stub = $('<b />');
    visible.farprev = visible.prev = visible.stub;
    visible.current = visible.stub;
    visible.next = visible.farnext = visible.stub;

    this.selector = selector;
    $(selector).each(function() {
      var $this = $(this);
      slides.push($this);
      setTimeout(function() {
        $this.addClass('animated');
      }, 0);
    });

    this.container = $(container);
    this.moving = [];
  };

  /**
   * Rerender slideshow
   */
  SlideShow.prototype.rerender = function() {
    var current = this.current;
    SlideShow.call(this, this.container, this.selector);
    this.select(current);
    this.show();
  };

  /**
   * Show/Hide slideshow's container
   */
  SlideShow.prototype.show = function() {
    this.container.show();
  };
  SlideShow.prototype.hide = function() {
    this.container.hide();
  };

  /**
   * Select current slide
   */
  SlideShow.prototype.select = function(num) {
    var that = this;

    // Apply bounds
    num = Math.max(0, num);
    num = Math.min(num, this.slides.length - 1);

    if (this.moving[0] === true) {
      this.moving.push(function() {
        that.select(num);
      });
      return;
    }

    // Push lock
    this.moving.unshift(true);
    this.removeClasses();

    this.current = num;
    var visible = this.visible;

    // Was viewport moved?
    var moved = visible.prev !== visible.stub &&
                visible.next !== visible.stub;

    visible.farprev = this.getSlide(num - 2);
    visible.prev = this.getSlide(num - 1);
    visible.current = this.getSlide(num);
    visible.next = this.getSlide(num + 1);
    visible.farnext = this.getSlide(num + 2);

    this.addClasses();

    if (moved) {
      setTimeout(next, 500);
    } else {
      next();
    }

    function next() {
      var lock = that.moving.shift(),
          callback = that.moving.shift();

      if (callback) callback();
    }
  };

  /**
   * Get jQuery object of slide or stub
   */
  SlideShow.prototype.getSlide = function(num) {
    return this.slides[num] || this.visible.stub;
  };

  /**
   * Remove classes from visible slides
   */
  SlideShow.prototype.removeClasses = function() {
    var visible = this.visible;

    visible.farprev.removeClass('farprev');
    visible.prev.removeClass('prev');
    visible.current.removeClass('current');
    visible.next.removeClass('next');
    visible.farnext.removeClass('farnext');
  };

  /**
   * Add classes to visible slides
   */
  SlideShow.prototype.addClasses = function() {
    var visible = this.visible;

    visible.farprev.addClass('farprev');
    visible.prev.addClass('prev');
    visible.current.addClass('current');
    visible.next.addClass('next');
    visible.farnext.addClass('farnext');
  };
}();
