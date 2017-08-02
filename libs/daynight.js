/* global SunCalc */

function dayNight(day, night, address = 'Kyiv') {
  // syntax: dayNight(() => function(){day}, () => function(){night}, address);

  // check if location is secure (needed for getCurrentPosition in auto mode)
  const secure = window.location.protocol === 'https:';

  // stores settings
  const store = localStorage.daynight;

  const lights = {
    on() { day.bind(document).apply(); },
    off() { night.bind(document).apply(); },
  };

  // before fetching - retrieve darkened value to force premature reflow
  if (store) { JSON.parse(store).darkened ? lights.off() : lights.on(); }

  const settings = (async () => {
    let mode = (!secure && !address && 'manual')
      || (store && JSON.parse(store).mode)
      || 'auto';

    const darkened = (async () => {
      const manual = store ? JSON.parse(store).darkened : false;
      if (mode === 'auto') {
        await fetch('https://cdn.rawgit.com/mourner/suncalc/master/suncalc.js')
          .then((git) => {
            if (git.status === 200) { return git.text(); }
            throw new Error(`${git.status}. Couldn't fetch suncalc from git.`);
          })
          .then(eval)
          .catch(window.console.error);

        return new Promise(
          (geo, err) => navigator.geolocation.getCurrentPosition(geo, err),
          // only on secure locations
        ).then(
          pos => ({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => {
            window.console.warn(err.message); /* User denied Geolocation or http */
            // if user denied Geolocation but didn't give address
            if (!address) { throw new Error('no address provided for daynight'); }

            const gAPI = `//maps.googleapis.com/maps/api/geocode/json?address=`;
            return fetch(`${window.location.protocol}${gAPI}${address}`)
              .then(e => e.text())
              .then((e) => {
                if (JSON.parse(e).results.length < 1) {
                  throw new Error('unkown address provided for daynight');
                }
                return JSON.parse(e).results[0].geometry.location;
              })
              .then(loc => ({ lat: loc.lat, lng: loc.lng }));
            // get lat & lng with googleapi by user provided entry
          },
        ).then(
          ({ lat, lng }) => {
            const date = new Date().getTime();
            // suncalc does all the magic
            const times = SunCalc.getTimes(date, lat, lng);
            // true or true/false
            return date > times.sunset.getTime() || date < times.sunrise.getTime();
          },
        ).catch((e) => {
          window.console.warn(e);
          mode = 'manual';
          return manual;
          // fallback to manual mode;
        });
      }
      return manual;
      // if mode is not auto then look into store or set default(false)
    })();
    return { mode, darkened };
  })();


  settings.then(s => s.darkened.then((theme) => {
    let darkened = theme;
    let mode = s.mode;

    darkened ? lights.off() : lights.on();

    (async function btns() {
      if (!document.body) { return window.requestAnimationFrame(btns); }

      const icons = { sun: "\u2600\uFE0E", moon: "\u263D" };

      const btn = document.body.insertBefore(
        document.createElement("div"),
        document.body.firstElementChild,
      );
      btn.setAttribute("id", "night_btn");
      Object.assign(btn.style, {
        color: 'inherit',
        cursor: 'pointer',
        font: '32px/24px "Open Sans"',
        opacity: '0.6',
        position: 'fixed',
        zIndex: String(1e+4),
      });

      const switchingCSS = () => ({
        bottom: `${darkened ? 10 : 8}px`,
        left: `${darkened ? 38 : 44}px`,
        transform: (darkened ? '' : 'rotate(45deg)'),
      });

      const switchStyle = () => {
        darkened ? lights.off() : lights.on();
        btn.setAttribute("title", `Toggle ${darkened ? "day" : "night"} mode.`);
        btn.innerText = (darkened ? icons.sun : icons.moon);
        Object.assign(btn.style, switchingCSS());
      };

      switchStyle();

      let int;
      const changeOpacity = (e) => {
        clearInterval(int);
        const opacityMax = ((/enter/).test(e) ? 1.1 : 0.5);
        const opacity = () => Math.round(
          (parseFloat(btn.style.opacity) + ((/enter/).test(e) ? 0.1 : -0.1)) * 10
        ) / 10;
        // if mouseenter increment opacity, else - decrement; round for correct parsing
        int = setInterval(() => {
          if (opacity() === opacityMax) {
            clearInterval(int);
          } else {
            btn.style.opacity = String(opacity());
          }
        }, 40);
      };

      ['mouseenter', 'mouseleave'].forEach(e => btn.addEventListener(e, () => changeOpacity(e)));

      btn.onclick = () => {
        darkened = !darkened;
        switchStyle();
        // should add if clicked - change mode to manual?
      };

      if (secure || address) {
        const modebtn = document.body.insertBefore(
          document.createElement("div"),
          btn.nextElementSibling,
        );
        modebtn.setAttribute('id', 'night_btn_mode');
        const modebtnText = () => `change mode to ${mode === 'auto' ? 'manual' : 'auto'}`;
        modebtn.innerText = modebtnText();

        modebtn.onclick = () => {
          mode = (mode === 'auto') ? 'manual' : 'auto';
          modebtn.innerText = modebtnText();
        };

        try {
          waitress();
        } catch (e) {
          await fetch('https://rawgit.com/HK49/tampermonkey-plugins/master/libs/waitress.js')
            .then((git) => {
              if (git.status === 200) { return git.text(); }
              throw new Error(`${git.status}. Couldn't fetch waitress from git.`);
            })
            .then(eval)
            .catch(window.console.error);
        }

        waitress.style({
          '#night_btn_mode': {
            backgroundColor: 'inherit',
            border: '1px solid',
            borderRadius: '4px',
            bottom: '36px',
            color: 'inherit',
            cursor: 'pointer',
            display: 'none',
            fontSize: '0.6em',
            left: '38px',
            padding: '0 0.6em',
            position: 'fixed',
            zIndex: String(1e+4),
          },
          '#night_btn_mode:hover, #night_btn:hover + #night_btn_mode': {
            display: 'block',
          },
        });
      }

      window.addEventListener(
        "beforeunload",
        () => (localStorage.daynight = JSON.stringify({ mode, darkened })),
      );
      // store mode for staying the same in night/day mode;
    })();
  }));
}
