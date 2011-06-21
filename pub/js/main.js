!function() {
  var socket = io.connect('/slides');

  socket.on('info', function(info) {
    slideShow.select(info.currentSlide);
    slideShow.show();
  });

  socket.on('slide', function(num) {
    slideShow.select(num);
  });

  // HACKERZ PLZ SKIP THIS
  function getPassword() {
    var match = (location.hash || '').match(/password=([^&=]*)/);

    if (match === null) return;
    return match[1];
  };
  var password = getPassword();
  // OK, READ BELOW

  // Keyboard controls
  if (password) {
    $(window).keydown(function(e) {
      if (e.which === 37) {
        // left
        socket.emit('slide', password, -1);
      } else if (e.which === 39) {
        // right
        socket.emit('slide', password, 1);
      } else {
        return;
      }
      e.preventDefault();
    });
  }

  // SlideShow Class
  function SlideShow(container, selector) {
    var slides = this.slides = [];
    this.current = 0;

    var visible = this.visible = {};

    visible.stub = $('<b />');
    visible.farprev = visible.prev = visible.stub;
    visible.current = visible.stub;
    visible.next = visible.farnext = visible.stub;

    $(selector).each(function() {
      var $this = $(this);
      slides.push($this);
      setTimeout(function() {
        $this.addClass('animated');
      }, 0);
    });

    this.container = $(container);
  };

  /**
   * Show slideshow's container
   */
  SlideShow.prototype.show = function() {
    this.container.show();
  };

  /**
   * Select current slide
   */
  SlideShow.prototype.select = function(num) {
    this.removeClasses();

    this.current = num;
    var visible = this.visible;

    visible.farprev = this.getSlide(num - 2);
    visible.prev = this.getSlide(num - 1);
    visible.current = this.getSlide(num);
    visible.next = this.getSlide(num + 1);
    visible.farnext = this.getSlide(num + 2);

    this.addClasses();
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

  // Get SlideShow instance
  var slideShow = new SlideShow('#slides', '#slides > article');

}();
