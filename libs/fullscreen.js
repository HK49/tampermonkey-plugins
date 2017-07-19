function fullScreen() {
  // TODO: window.scrollY or document.body.scrollTop
  // in fullscreen mode are not responsive and store the values of when entering it
  // so when restoring page to windowed mode - page jumps to position of when
  // we left windowed mode

  if (!document.body) { return window.requestAnimationFrame(fullScreen); }

  const btn = document.createElement("btn");

  const attrs = { id: "fullscreen_btn", title: "Enter full screen mode" };
  (() => Object.keys(attrs).forEach(i => btn.setAttribute(i, attrs[i])))();

  if (document.getElementById(attrs.id)) { return null; }

  let full = false;
  let reqF = null;

  return new Promise((resolve) => { if (waitress) { resolve(waitress); } })
    .catch(
      () => fetch(
        'https://rawgit.com/HK49/tampermonkey-plugins/master/libs/waitress.js'
      ).then(
        (git) => {
          if (git.status === 200) {
            return git.text();
          } else {
            throw new Error(`${git.status}. Couldn't fetch waitress. fullScreen() failed.`);
          }
        }
      ).then(eval)
    )
    .then(() => {
      function calcbg() {
        const e = {
          bg: "background",
          bgC: "backgroundColor",
          body: document.body,
          doc: document.documentElement,
        };
        const def = {
          bg: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          bgC: "rgba(0, 0, 0, 0)",
        };

        function bg(el, style) { return window.getComputedStyle(el)[style]; }

        const calc = {};
        if (bg(e.body, e.bg) !== def.bg) {
          calc.background = bg(e.body, e.bg);
        } else if (bg(e.doc, e.bg) !== def.bg) {
          calc.background = bg(e.doc, e.bg);
        }

        switch (true) {
          case (bg(e.body, e.bgC) !== def.bgC):
            calc.backgroundColor = bg(e.body, e.bgC);
            break;
          case (bg(e.doc, e.bgC) !== def.bgC):
            calc.backgroundColor = bg(e.doc, e.bgC);
            break;
          default:
          // but what to do if bg color was actually set to black? >_<
            calc.backgroundColor = "#fff";
        }

        return calc;
      }

      waitress.style({
        "body:-webkit-full-screen": Object.assign({
          height: "100%",
          maxWidth: "100%",
          overflowY: "scroll",
          width: "100%",
        }, calcbg()),
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
      }, false, 'fullscreen_style');

      document.body.insertBefore(btn, document.body.firstElementChild);

      return waitress;
    })
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
        }, false, 'fullscreen_style');
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
    })
    .catch(window.console.error);
}

// init
fullScreen();
