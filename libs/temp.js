
const offset = {};
// mouse position inside btn

let dragging = false;

const btn = '';
// font btn

btn.addEventListener('mousedown', (e) => {
  dragging = true;
  ({ clientX: offset.x, clientY: offset.y } = e);
}, true);

self.addEventListener('mousemove', (e) => {
  e.preventDefault();
  if (dragging) {
    btn.style.left = `${e.clientX + offset.x}px`;
    btn.style.top = `${e.clientY + offset.y}px`;
  }
});

self.addEventListener('mouseup', () => {
  dragging = false;
  const node = Array.from(document.querySelectorAll(":hover")).pop();
  const selector = [
    node.tagName,
    node.id ? `#${node.id}` : ``,
    node.className ? `.${node.className}` : ``,
  ].join('');
  // TODO: options to select this element or it's parent(s)
  Array.from(document.querySelectorAll(selector)).forEach((e) => {
    const prevOutline = e.style.outline;
    e.style.outline = `1px solid blue`;
    e.style.outline = prevOutline;
  });
  // Array.from(document.querySelectorAll(":hover")).slice(-1); /* or deeper -2,-3,etc */
});

// Classes

class Baka {
  constructor(x) {
    this.x = x;
  }
  yandere() { return self.console.log(`${this.x} is dead.`); }
  static scream(name = 'John') { return self.console.log(`${name}, you are B-BAKA!!!`); }
}
Baka.scream('Rito');
Baka.scream();
const foo = new Baka('Kirito');
foo.yandere();

// or

{
  class baka {
    constructor(x) {
      this.x = x;
      this.yan = () => { self.console.log(`${this.x}!!! `.repeat(10)); };
    }
    yandere() {
      return (() => {
        this.yan();
        baka.scream(this.x);
        self.console.log(`...${this.x} is dead. He got himself a yandere in the harem.`);
      })();
    }
    static scream(name = 'Kirito') {
      return self.console.log(`${name}, you are B-BAKA!!!`);
    }
  }
  const foo = new baka(`Rito`);
  foo.yandere();
  baka.scream();
  baka.scream('Onii-sama');
}
