function dayNight(mode) {
  // syntax: dayNight({day: function() { //day! }, night: function() { //night! } });
  if(Object.keys(mode).length !== 2 || !Object.keys(mode).includes("day" && "night")) {
    return window.console.error("dayNight function should have day and night opts!");
  }

  var btn = document.createElement("div"),
      sun = "\u2600\uFE0E",
      moon = "\u263D",
      // symbols inside btn
      lighten = ((localStorage.lighten && (/^(true|false)$/).test(localStorage.lighten)) ? eval(localStorage.lighten) : true),
      // just wanna have boolean, lol
      fluents = function(){
        return {
          bottom: (lighten ? 10 : 8) + 'px',
          left: (lighten ? 38 : 44) + 'px',
          transform: (lighten ? '' : 'rotate(45deg)')
        };
      };
      // this guy changes depending on mode

  btn.setAttribute("id", "night_btn");
  btn.setAttribute("title", "Toggle day/night mode.");
  btn.innerText = (lighten ? sun : moon);
  Object.assign(btn.style, {
    position: 'fixed',
    font: '32px/24px "Open Sans"',
    color: 'inherit',
    zIndex: String(1e+4),
    opacity: '0.6',
    cursor: 'pointer'
  }, fluents());
  document.body.insertBefore(btn, document.body.firstElementChild);

  var int, opacity;
  var translucent = function(e) {
    clearInterval(int);
    var opacityMax = ((/enter/).test(e.type) ? 1.1 : 0.5);
    opacity = function(){
      return (Math.round((parseFloat(btn.style.opacity) + ((/enter/).test(e.type) ? 0.1 : -0.1)) * 1e2) / 1e2);
      // if mouseenter increment opacity, else - decrement; round for right parsing
    };
    int = setInterval(function() {
      if(opacity() === opacityMax) {
        clearInterval(int);
      } else {
        btn.style.opacity = String(opacity());
      }
    }, 40);
  };

  var events = ['mouseenter', 'mouseleave'];
  var noLoopFunc = function(event) {
    btn.addEventListener(event, function(e) { translucent(e); });
  };
  for (var i = 0; i < events.length; i++) { noLoopFunc(events[i]); }

  btn.onclick = function(){
    lighten = !lighten;
    // booleans hooray!
    Object.assign(btn.style, fluents());
    // fluent are changable object, remember?
    btn.innerText = (lighten ? sun : moon);
    // change icon
    mode[lighten ? "day" : "night"]();
    // call this guy!
  };

  window.onbeforeunload = function(){ localStorage.lighten = lighten; };
  // store mode for staying the same in night/day mode;
}
