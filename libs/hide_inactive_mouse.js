const mouse = {
  style: (e = document.documentElement, rule = 'auto') => (e.style.cursor = rule),
  move: (t = 3e3, e) => {
    clearTimeout(mouse.timer);
    mouse.style(e);
    mouse.timer = setTimeout(() => mouse.style(e, 'none'), t);
  },
  hide: (t, e) => document.addEventListener('mousemove', () => mouse.move(t, e)),
};

// call: mouse.hide(time/*optional*/);
// webkit doesn't update cursor if dev tools are opened
