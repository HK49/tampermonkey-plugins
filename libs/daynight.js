function dayNight(day, night) {
  // syntax: dayNight((function() { day opts }), (function() { night opts }));
  if (dayNight.arguments.length !== 2) {
    return window.console.error("dayNight function should have day and night opts!");
  }

  // boolean for page state: restore or apply day mode
  let darkened = (() => {
    const store = localStorage.darkened;
    return (/^(true|false)$/).test(store) ? JSON.parse(store) : false;
  })();

  const lights = {
    on() { day.bind(document).apply(); },
    off() { night.bind(document).apply(); },
  };

  if (!document.body) {
    window.requestAnimationFrame(() => dayNight(day, night));
  } else {
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
  }

  window.addEventListener("beforeunload", () => (localStorage.darkened = darkened));
  // store mode for staying the same in night/day mode;
}
