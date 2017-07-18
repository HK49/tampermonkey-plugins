function fullScreen() {
    // TODO: window.scrollY are different variables?? in fullscreen and windowed mode

  if (!document.body) { return window.requestAnimationFrame(fullScreen); }

  const btn = document.createElement("btn");

  const attrs = { id: "fullscreen_btn", title: "Enter full screen mode" };
  (() => Object.keys(attrs).forEach(i => btn.setAttribute(i, attrs[i])))();

  if (document.getElementById(attrs.id)) { return null; }

  let full = false;
  let reqF = null;

  return new Promise((resolve) => {
    if (waitress) { resolve(waitress); }
  })
  .catch(e => fetch(
    'https://rawgit.com/HK49/tampermonkey-plugins/master/libs/waitress.js'
    )
    .then(raw => raw.text())
    .then(eval)
  )
  .then(() => {
    waitress.style({
      "body:-webkit-full-screen": {
        backgroundColor: window.getComputedStyle(document.body).backgroundColor,
        height: "100%",
        overflowY: "scroll",
        width: "100%",
      },
      [`#${attrs.id}`]: {
        border: 'solid 2px',
        bottom: '10px',
        cursor: 'pointer',
        height: '26px',
        left: '10px',
        opacity: '.6',
        position: 'fixed',
        transition: 'all .6s ease',
        width: '26px',
        zIndex: `${1e+5}`,
      },
      [`#${attrs.id}:hover`]: { opacity: '1' },
      [`#${attrs.id}::before, #${attrs.id}::after`]: {
        borderBottomColor: 'transparent',
        borderStyle: 'solid',
        borderTopColor: 'transparent',
        content: '\'\'',
        height: '0',
        position: 'absolute',
        transition: "all .3s ease",
        width: '0',
      },
    }, false, 'fullscreen_btn_style');

    document.body.insertBefore(btn, document.body.firstElementChild);

    return waitress;
  })
  .catch(window.console.error)
  .then(() => {
    function restyle(f) {
      // change style according to screen: full or not
      btn.setAttribute("title", `${f ? "Exit" : "Enter"} full screen mode`);
      waitress.style({
        [`#${attrs.id}::before`]: {
          borderWidth: '10px 0 0 10px',
          bottom: (f ? '0' : '3px'),
          left: (f ? '0' : '3px'),
        },
        [`#${attrs.id}::after`]: {
          borderWidth: '0 10px 10px 0',
          right: (f ? '0' : '3px'),
          top: (f ? '0' : '3px'),
        },
        [`#${attrs.id}:hover::before`]: {
          bottom: (!f ? '0' : '3px'),
          left: (!f ? '0' : '3px'),
        },
        [`#${attrs.id}:hover::after`]: {
          right: (!f ? '0' : '3px'),
          top: (!f ? '0' : '3px'),
        },
      }, false, 'fullscreen_btn_style');
    }

    restyle(full);

    function action(o) {
      if (!full) {
        reqF = o.requestFullScreen
        || o.webkitRequestFullscreen
        || o.mozRequestFullScreen
        || o.msRequestFullscreen;
        full = true;
        reqF.apply(o);
      } else {
        reqF = document.exitFullscreen
        || document.webkitExitFullscreen
        || document.mozExitFullScreen
        || document.msExitFullscreen;
        full = false;
        reqF.bind(document).apply();
      }
      restyle(full);
    }

    btn.addEventListener('click', () => action(document.body));
  });
}

// init
fullScreen();
