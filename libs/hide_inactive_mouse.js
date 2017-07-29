const mouse = {
  style: (el, display = 'auto') => (el.style.cursor = display),
  move: (t, el) => {
    clearTimeout(mouse.timer);
    mouse.style(el);
    mouse.timer = setTimeout(() => mouse.style(el, 'none'), t);
  },
  hide: (t = 3e3, el = document.documentElement) => document.addEventListener(
    'mousemove',
    () => mouse.move(t, el),
  ),
};

// call: mouse.hide(time/*optional*/);
// webkit doesn't update cursor if dev tools are opened
