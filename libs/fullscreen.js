/* global waitress */

function fullScreen() {
  if(document.readyState !== "complete") {
    window.requestAnimationFrame(fullScreen);
  } else {
    var setAttributes = function(el, attrs) {
      Object.keys(attrs).forEach(function(i) { el.setAttribute(i, attrs[i]); });
    };

    var btnInit = function() {
      var screenFull, req;

      var btn = document.getElementById("btn_full") || document.createElement("btn");
      setAttributes(btn, { id: "btn_full", tytle: "Enter full screen mode" });
      Object.assign(btn.style, {
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        width: '26px',
        height: '26px',
        border: 'solid 2px',
        cursor: 'pointer',
        opacity: '.6',
        transition: 'all .6s ease',
        zIndex: String(1e+5)
      });
      if(!document.getElementById("btn_full")) {
        document.body.insertBefore(btn, document.body.firstElementChild);
      }

      document.getElementsByTagName("html")[0].style.backgroundColor = document.body.style.background;
      var bodyStyle = document.createElement("style");
      bodyStyle.setAttribute("name", "fullscreen");
      bodyStyle.innerHTML = [
        "body:-webkit-full-screen",
        "{",
        "overflow-y: scroll;",
        "background-color: " + document.body.style.background + ";",
        "width: 100%;",
        "height: 100%",
        "}",
        "#btn_full:hover { opacity: 1 !important }"
      ].join(" ");
      var sTags = document.head.getElementsByTagName('style');
      document.head.insertBefore(bodyStyle, (sTags ? sTags[sTags.length - 1].nextSibling : document.head.lastElementChild));

      waitress("#btn_full::before, #btn_full::after", {
        content: '\'\'',
        width: '0',
        height: '0',
        position: 'absolute',
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderStyle: 'solid',
        transition: "all .3s ease"
      });
      // waitress here is unneeded overkill, but just for fun it's ok

      var restyle = function(full) {
        btn.setAttribute("title", (screenFull ? "Exit" : "Enter") + " full screen mode");
        waitress("#btn_full::before", {
          left: (full ? '0' : '3px'),
          bottom: (full ? '0' : '3px'),
          borderWidth: '10px 0 0 10px'
        });
        waitress("#btn_full::after", {
          right: (full ? '0' : '3px'),
          top: (full ? '0' : '3px'),
          borderWidth: '0 10px 10px 0'
        });
        waitress("#btn_full:hover::before", { left: (!full ? '0' : '3px'), bottom: (!full ? '0' : '3px') });
        waitress("#btn_full:hover::after", { right: (!full ? '0' : '3px'), top: (!full ? '0' : '3px') });
      };

      restyle(screenFull);

      var action = function(o) {
        if(!screenFull) {
          req = o.requestFullScreen || o.webkitRequestFullscreen || o.mozRequestFullScreen || o.msRequestFullscreen;
          screenFull = true;
          req.apply(o);
        } else {
          req = document.exitFullscreen || document.webkitExitFullscreen || document.mozExitFullScreen || document.msExitFullscreen;
          screenFull = false;
          req.bind(document).apply();
        }
        restyle(screenFull);
      };

      btn.addEventListener('click', function(){ action(document.body); });
    };

    if(!waitress) {
      var tag = document.createElement('script');
      setAttributes(tag, {
        type: "text/javascript",
        async: '',
        src: "https://cdn.rawgit.com/HK49/tampermonkey-plugins/stable/libs/waitress.js"
      });
      // listener before insertion
      tag.addEventListener("load", function() { btnInit(); });
      document.head.insertBefore(tag, (document.head.getElementsByTagName('script') ? document.head.getElementsByTagName('script')[document.head.getElementsByTagName('script').length - 1].nextSibling : document.head.lastElementChild));
    } else {
      btnInit();
    }
  }
}
