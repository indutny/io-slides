!function() {
  // Keyboard controls
  if (!/admin/.test(location.hash)) return;

  $(window).keydown(function(e) {
    if (e.which === 37) {
      // left
      apiCall('/api/move', {delta: -1});
    } else if (e.which === 39) {
      // right
      apiCall('/api/move', {delta: 1});
    } else {
      return;
    }
    e.preventDefault();
  });

  /**
   * Call REST API
   */
  function apiCall(url, data, callback) {
    callback || (callback = function() {});
    $.ajax({
      type: 'POST',
      url: url,
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
