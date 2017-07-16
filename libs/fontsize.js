function scaleFont() {
  Promise.resolve(document.documentElement).then((e) => {
    const storage = localStorage.fontSize;
    if(storage) { e.style.fontSize = storage + 'px'; }

    return new Promise((resolve) => {
      if(!document.body) {
        new Promise((r) => setTimeout(r, 60)).then(scaleFont);
      } else {
        resolve({ html: e, body: document.body });
      }
    });
  }).then(({ html, body }) => {

    let font = Number(
      localStorage.fontSize || window.getComputedStyle(html).fontSize.split(/\D+/)[0]
    );

    const impSetter = (node, rules) => {
      Object.keys(rules).forEach((key) => node.style.setProperty(
        key.replace(/[A-Z]/g, (l, i) => (i ? '-' : '') + l.toLowerCase()), rules[key], 'important'
      ));
    };

    const btn = document.createElement("btn");
    btn.innerText = "A";
    btn.setAttribute("id", "font_btn");
    btn.setAttribute("title", "Scroll mouse up/down over icon to make root font bigger/smaller.");
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '10px',
      left: '70px',
      font: '22px/25px "Verdana", sans-serif',
      cursor: 'n-resize',
      opacity: '.6',
      transition: 'all .3s ease',
      zIndex: String(1e4)
    });
    impSetter(btn, { color: 'inherit' });

    body.appendChild(btn);

    ['-', '/', '+'].forEach((sym) => {
      const span = btn.insertBefore(document.createElement('span'), btn.firstElementChild);
      span.innerText = sym;
      Object.assign(span.style, { position: 'relative', verticalAlign: 'bottom', opacity: 'inherit' });
      impSetter(span, { color: 'inherit', font: 'inherit', fontSize: '50%' });
      span.setAttribute("symbol", sym);
    });

    const shiny = (node, symbol) => {
      const shine = node.insertBefore(document.createElement('span'), node.lastElementChild);
      shine.innerText = symbol;
      Object.assign(shine.style, { position: 'absolute', left: '0' });
      impSetter(shine, { color: 'inherit', font: 'inherit' });

      const currentSize = btn.insertBefore(document.createElement('span'), btn.lastElementChild);
      currentSize.innerText = font + 'px';
      Object.assign(currentSize.style, { position: 'absolute', top: '-30px', left: '-10px', opacity: '.4' });
      impSetter(currentSize, { color: 'inherit', font: 'inherit', fontSize: font + 'px' });

      ((i) => {
        const voo = setInterval(() => {
          Object.assign(shine.style, {
            transform: 'scale(' + Math.floor(i / 2) + ')',
            top: (i * -3) + 'px',
            left: i + 'px',
            opacity: String(Math.floor((2 / i) * 10) / 10)
          });

          currentSize.style.opacity = String(Math.floor((1 / i) * 10) / 10);

          if(++i > 9) {
            clearInterval(voo);
            node.removeChild(shine);
            btn.removeChild(currentSize);
          }
        }, 150);
      })(0);
    };

    btn.addEventListener("mouseenter", () => (btn.style.opacity = "1"));

    btn.addEventListener("mouseleave", () => (btn.style.opacity = ".6"));

    btn.addEventListener("wheel", (w) => {
      w.preventDefault();
      font += (w.deltaY > 0 ? -1 : 1);
      html.style.fontSize = font + "px";
      w.deltaY > 0 ? shiny(btn.querySelector("span[symbol='-']"), "-") : shiny(btn.firstElementChild, "+");
    });

    window.addEventListener("beforeunload", () => (localStorage.fontSize = font));
  });
}
