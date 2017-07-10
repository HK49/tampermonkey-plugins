function dayNight(day, night) {
  // syntax: dayNight((function() { day opts }), (function() { night opts }));
  if(dayNight.arguments.length !== 2) {
    return window.console.error("dayNight function should have day and night opts!");
  }

  var darkened = ((localStorage.darkened && (/^(true|false)$/).test(localStorage.darkened)) ? JSON.parse(localStorage.darkened) : false);
  // boolean for page state: restore or apply day mode

  var lights = {
    on: function() { day.bind(document).apply(); },
    off: function() { night.bind(document).apply(); }
  };

  if(!document.body) {
    window.requestAnimationFrame(function() { dayNight(day, night); });
  } else {
    var btn = document.createElement("div"),
        sun = "\u2600\uFE0E",
        moon = "\u263D",
        fluents = function(){
          return {
            bottom: (darkened ? 10 : 8) + 'px',
            left: (darkened ? 38 : 44) + 'px',
            transform: (darkened ? '' : 'rotate(45deg)')
          };
        };
        // fluents change depending on day/night

    btn.setAttribute("id", "night_btn");
    Object.assign(btn.style, {
      position: 'fixed',
      font: '32px/24px "Open Sans"',
      color: 'inherit',
      zIndex: String(1e+4),
      opacity: '0.6',
      cursor: 'pointer'
    });
    document.body.insertBefore(btn, document.body.firstElementChild);

    var cycle = function() {
      darkened ? lights.off() : lights.on();
      btn.setAttribute("title", "Toggle " + (darkened ? "day" : "night") + " mode.");
      btn.innerText = (darkened ? sun : moon);
      Object.assign(btn.style, fluents());
    };
    // changing scope
    cycle();

    var int, opacity;
    var translucent = function(e) {
      clearInterval(int);
      var opacityMax = ((/enter/).test(e) ? 1.1 : 0.5);
      opacity = function(){
        return (Math.round((parseFloat(btn.style.opacity) + ((/enter/).test(e) ? 0.1 : -0.1)) * 10) / 10);
        // if mouseenter increment opacity, else - decrement; round for correct parsing
      };
      int = setInterval(function() {
        if(opacity() === opacityMax) {
          clearInterval(int);
        } else {
          btn.style.opacity = String(opacity());
        }
      }, 40);
    };

    ['mouseenter', 'mouseleave'].forEach(function(e) {
      btn.addEventListener(e, function() { translucent(e); });
    });

    btn.onclick = function(){
      darkened = !darkened;
      // booleans hooray!
      cycle();
    };
  }

  window.addEventListener("beforeunload", function(){ localStorage.darkened = darkened; });
  // store mode for staying the same in night/day mode;
}
