const mouse = {
  // doc - default html element on whom mouse.(un)hide() is applied
  doc: document.documentElement,
  // els stores all html elements on which mouse.hide() are applied
  els: {},
  // (un)hide cursor over node by appliyng css rule on node
  style: (el, rule = mouse.els[el].prevStyle) => (el.style.cursor = rule),
  move: (e, t = 3e3, el) => {
    // ignore any events if 'real' cursor wasn't moving
    if (mouse.x !== e.clientX || mouse.y !== e.clientY) {
      // if event fired - abort previous timeout to hide mouse
      clearTimeout(mouse.timer);
      mouse.style(el);
      ({ clientX: mouse.x, clientY: mouse.y } = e);
      mouse.timer = setTimeout(() => mouse.style(el, 'none'), t);
    }
  },
  hide: (t, el = mouse.doc) => {
    mouse.els[el] = {
      hide: e => mouse.move(e, t, el),
      prevStyle: self.getComputedStyle(el).cursor,
    };
    self.addEventListener('mousemove', mouse.els[el].hide);
  },
  unhide: (el = mouse.doc) => {
    self.removeEventListener('mousemove', mouse.els[el].hide);
    el.style.cursor = mouse.els[el].prevStyle;
    delete mouse.els[el];
  },
};

// call: mouse.hide(time/*optional*/, element/*optional*/);
// to abort: mouse.unhide(element/*optional*/);
// webkit doesn't update cursor if dev tools are opened
