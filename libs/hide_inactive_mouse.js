const mouse = {
  style: (display = 'auto') => (document.documentElement.style.cursor = display),
  move: (t) => {
    clearTimeout(mouse.timer);
    mouse.style();
    mouse.timer = setTimeout(() => mouse.style('none'), t);
  },
  hide: (t = 3e3) => document.addEventListener('mousemove', () => mouse.move(t)),
};

// call: mouse.hide(time/*optional*/);
// webkit doesn't update cursor if dev tools are opened
