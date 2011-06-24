!function() {
  var slideShowId = location.href.match(/play\/([^\/]+)/)[1];

  /**
   * Keyboard controls
   */
  $(window).keydown(function(e) {
    if (e.which === 37) {
      // left
      apiCall('POST', '/select', {delta: -1});
    } else if (e.which === 39) {
      // right
      apiCall('POST', '/select', {delta: 1});
    } else {
      return;
    }
    e.preventDefault();
  });

  /**
   * Mouse controls
   */
  var container = $('section#slides');
  container.dblclick(function(e) {
    if (e.target !== container[0]) return;
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Do you wish to create new slide?')) return;

    var currentSlide = window.slides[window.slideShow.current],
        nextSlide = window.slides[window.slideShow.current + 1],
        newIndex = (nextSlide && currentSlide) ?
                      (currentSlide.index + nextSlide.index) / 2
                      : currentSlide ? currentSlide.index + 1 : 1;

    if (window.slideShow.current >= window.slides.length) {
      newIndex = window.slides.length;
    }

    apiCall('POST', '/' + newIndex, {
      index: newIndex,
      markdown: 'your text here'
    });
  });

  $('section#slides').delegate('article', 'dblclick', function(e) {
    var slide = $(this),
        data = slide.data('slide');

    e.preventDefault();
    e.stopPropagation();

    if (slide.data('admin-edit')) {
      /**
       * Finish editing & update slide if changed
       */

      var newVal = slide.find('>textarea.slide-edit').val(),
          changed = newVal !== data.markdown;

      slide.data('admin-edit', false);

      slide.find('textarea.slide-edit').remove();
      data._content.show();

      if (changed) {
        /**
         * Update
         */
        if (newVal && confirm('Do you wish to save changes to that slide?')) {
          apiCall('PUT', '/' + data.index, {
            num: data.index,
            markdown: newVal
          });
        }

        /**
         * Delete
         */
        if (!newVal && confirm('Do you wish to delete that slide?')) {
          apiCall('DELETE', '/' + data.index, {});
        }
      }
    } else {
      /**
       * Show slides source
       */
      var textarea = $('<textarea class="slide-edit" />').val(data.markdown);
      slide.data('admin-edit', true);
      data._content = slide.find('>*').hide();
      slide.append(textarea);

      /**
       * Save on Ctrl+Enter
       */
      textarea.focus().keydown(function(e) {
        e.stopPropagation();
        if (e.ctrlKey && e.which === 13) {
          e.preventDefault();
          textarea.dblclick();
        }
      });
    }
  });

  /**
   * Call REST API
   */
  function apiCall(type, url, data, callback) {
    callback || (callback = function() {});
    $.ajax({
      type: type,
      url: '/api/slideshow/' + slideShowId + '/slide' + url,
      contentType: 'application/json',
      data: JSON.stringify(data),
      error: function() {
        callback('failed to make apiCall');
      },
      success: function(resp) {
        callback(null, resp);
      }
    });
  };
}();
