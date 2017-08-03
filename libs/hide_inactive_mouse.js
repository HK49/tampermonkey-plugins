const mouse = {
  style: (el = document.documentElement, rule = 'auto') => (el.style.cursor = rule),
  move: (e, t = 3e3, el) => {
    clearTimeout(mouse.timer);
    if (mouse.x !== e.clientX || mouse.y !== e.clientY) { mouse.style(el); }
    ({ clientX: mouse.x, clientY: mouse.y } = e);
    mouse.timer = setTimeout(() => mouse.style(el, 'none'), t);
  },
  hide: (t, el) => self.addEventListener('mousemove', e => mouse.move(e, t, el)),
};

// call: mouse.hide(time/*optional*/, element/*optional*/);
// webkit doesn't update cursor if dev tools are opened
