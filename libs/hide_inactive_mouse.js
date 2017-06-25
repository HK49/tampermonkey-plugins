var mice = function() {
  mice.hidden = mice.hidden || false;
  // should be mentioned (bug: no mouse update without movement):
  // https://bugs.chromium.org/p/chromium/issues/detail?id=26723 //and ?id=676644
  return {
    hide: function() {
      document.addEventListener('mousemove', function(e) {
        var passive = function() {
          window.clearTimeout(mice.reveal);
          document.body.style.cursor = "url(data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7), none";
          // uri displays 1x1 px black dot in chrome
          mice.hidden = true;
          mice.reveal = window.setTimeout(function() {
            mice.position = { x: e.clientX, y: e.clientY };
            // storing position - if small movement don't reveal mouse cursor
            mice.hidden = false;
          }, 400);
        };

        var active = function() {
          window.clearTimeout(mice.active);
          document.body.style.cursor = "default";
          mice.active = window.setTimeout(passive, 1e3);
        };

        if(mice.position && !mice.hidden) {
          var moving = [
            Math.abs(e.clientX - mice.position.x) > 75,
            Math.abs(e.clientY - mice.position.y) > 75
          ];
          if(moving.includes(true)) { active(); }
        } else if(!mice.position && !mice.hidden) {
          active();
        }
      });
    }
  };
};

var mouse = mice();
// to hide cursor when inactive - call: mouse.hide();
