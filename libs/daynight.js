/* global SunCalc */

async function dayNight(day, night) {
  // syntax: dayNight((function() { day opts }), (function() { night opts }));

  if (!document.body) {
    return window.requestAnimationFrame(() => dayNight(day, night));
  }

  // if (dayNight.arguments.length !== 2) {
  //   return window.console.error("dayNight function should have day and night opts!");
  // }
  // TypeError: 'caller' and 'arguments' are restricted function properties
  // and cannot be accessed in this context.

  // check if location is secure (needed for getCurrentPosition in auto mode)
  const secure = window.location.protocol === 'https:';

  // stores settings
  const store = localStorage.daynight;


  const settings = (async () => {
    const mode = (!secure && 'manual') || (store && JSON.parse(store).mode) || 'auto';

    const darkened = (async () => {
      if (mode === 'auto') {
        await fetch('https://cdn.rawgit.com/mourner/suncalc/master/suncalc.js')
          .then((git) => {
            if (git.status === 200) { return git.text(); }
            throw new Error(`${git.status}. Couldn't fetch suncalc from git.`);
          })
          .then(eval)
          .catch(window.console.error);

        const coords = {};
        ['latitude', 'longitude'].forEach((e) => {
          navigator.geolocation.getCurrentPosition(pos => (coords[e] = pos.coords[e]));
          // no getCurrentPosition() for insecure http in chrome
        });

        if (Object.keys(coords).length === 0) {
        // if user blocked request to geolocate
          return store ? JSON.parse(store).darkened : false;
        }

        const times = SunCalc.getTimes(new Date(), coords.latitude, coords.longitude);

        return (new Date() > times.sunset && new Date() < times.sunrise);
        // darkened === true if in the above range
      }
      return store ? JSON.parse(store).darkened : false;
      // if mode is not auto then look into store or set default(false)
    })();
    return { mode, darkened };
  })();
  // settings.then(e => e.darkened.then(a => console.log(e.mode, a)));

  settings.then(s => s.darkened.then((theme) => {
    let darkened = theme;
    const mode = s.mode;

    const lights = {
      on() { day.bind(document).apply(); },
      off() { night.bind(document).apply(); },
    };

    const icons = { sun: "\u2600\uFE0E", moon: "\u263D" };

    const btn = document.createElement("div");
    btn.setAttribute("id", "night_btn");
    Object.assign(btn.style, {
      color: 'inherit',
      cursor: 'pointer',
      font: '32px/24px "Open Sans"',
      opacity: '0.6',
      position: 'fixed',
      zIndex: String(1e+4),
    });
    document.body.insertBefore(btn, document.body.firstElementChild);

    // TODO: add button to change mode

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
    // changing scope
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
    };

    window.addEventListener(
      "beforeunload",
      () => (localStorage.daynight = JSON.stringify({ mode, darkened })),
    );
    // store mode for staying the same in night/day mode;
  }));
}
