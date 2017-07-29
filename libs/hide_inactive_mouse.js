const mouse = {
  timer: (t = 2e3) => setTimeout(
    () => (document.documentElement.style.cursor = 'none'),
    t,
  ),
  hide: (t) => {
    document.addEventListener('mousemove', () => {
      clearTimeout(mouse.timer);
      document.documentElement.style.cursor = 'auto';
      mouse.timer(t);
    });
  },
};

// call: mouse.hide(time/*optional*/);
// webkit doesn't update cursor if dev tools are opened
