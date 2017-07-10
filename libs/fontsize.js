function scaleFont() {
  if(!(/^interactive|complete$/).test(document.readyState)) {
    window.requestAnimationFrame(scaleFont);
  } else {
    var fontSize = +localStorage.fontSize
    || +window.getComputedStyle(document.getElementsByTagName("html")[0]).fontSize.split('px')[0];

    document.getElementsByTagName("html")[0].style.fontSize = fontSize + 'px';

    var impSetter = function(node, rules) {
      var hyphenize = function(prop) {
        // converts fontSize into font-size etc
        return prop.replace(/[A-Z]/g, function(m, o) { return (o ? '-' : '') + m.toLowerCase(); });
      };

      Object.keys(rules).forEach(function(key) {
        node.style.setProperty(hyphenize(String(key)), rules[key], 'important');
      });
    };

    var btn = document.createElement("btn");
    btn.innerText = "A";
    btn.setAttribute("id", "font_btn");
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '10px',
      left: '70px',
      font: '22px/25px "Verdana", sans-serif',
      cursor: 'n-resize',
      opacity: '.6',
      transition: 'all .3s ease',
      zIndex: String(1e4)
    });
    impSetter(btn, { color: 'inherit' });
    document.body.insertBefore(btn, document.body.firstElementChild);

    ['-', '/', '+'].forEach(function(e) {
      var span = btn.insertBefore(document.createElement('span'), btn.firstElementChild);
      span.innerText = e;
      Object.assign(span.style, {
        position: 'relative',
        verticalAlign: 'bottom',
        opacity: 'inherit'
      });
      impSetter(span, { color: 'inherit', font: 'inherit', fontSize: '50%' });
      span.setAttribute("symbol", e);
    });

    var shiny = function(node, symbol) {
      var shine = node.insertBefore(document.createElement('span'), node.lastElementChild);
      shine.innerText = symbol;
      Object.assign(shine.style, { position: 'absolute', left: '0' });
      impSetter(shine, { color: 'inherit', font: 'inherit' });

      var currentSize = btn.insertBefore(document.createElement('span'), btn.lastElementChild);
      currentSize.innerText = fontSize + 'px';
      Object.assign(currentSize.style, { position: 'absolute', top: '-30px', left: '-10px', opacity: '.4' });
      impSetter(currentSize, { color: 'inherit', font: 'inherit', fontSize: fontSize + 'px' });

      (function(i){
        var voo = setInterval(function(){
          Object.assign(shine.style, {
            transform: 'scale(' + Math.floor(i / 2) + ')',
            top: (i * -3) + 'px',
            left: i + 'px',
            opacity: String(Math.floor((2 / i) * 10) / 10)
          });

          currentSize.style.opacity = String(Math.floor((1 / i) * 10) / 10);

          if(++i > 9) {
            clearInterval(voo);
            node.removeChild(shine);
            btn.removeChild(currentSize);
          }
        }, 150);
      })(0);
    };

    btn.addEventListener("mouseenter", function() { btn.style.opacity = "1"; });

    btn.addEventListener("mouseleave", function() { btn.style.opacity = ".6"; });

    btn.addEventListener("wheel", function(e) {
      e.preventDefault();
      fontSize += (e.deltaY > 0 ? -1 : 1);
      document.getElementsByTagName("html")[0].style.fontSize = fontSize + "px";
      e.deltaY > 0 ? shiny(btn.querySelector("span[symbol='-']"), "-") : shiny(btn.firstElementChild, "+");
    });

    window.addEventListener("beforeunload", function(){ localStorage.fontSize = fontSize; });
  }
}
