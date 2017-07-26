/* global waitress, dayNight, scaleFont */

// ==UserScript==
// @name           Style volarenovels.com
// @description    Change interface on volarenovels.com
// @author         HK49
// @include        http://volarenovels.com/*
// @include        https://disqus.com/embed/comments/?base=default&f=volaretranslations*
// @require        https://rawgit.com/HK49/tampermonkey-plugins/master/libs/waitress.js
// @require        https://rawgit.com/HK49/tampermonkey-plugins/master/libs/daynight.js
// @require        https://rawgit.com/HK49/tampermonkey-plugins/master/libs/fontsize.js
// @version        0.12
// @grant          GM_addStyle
// @run-at         document-start
// ==/UserScript==


// disqus listen to msg and change according to day/dark themes
if (window.location.host === `disqus.com`) {
  window.addEventListener("message", (e) => {
    if (e.origin === `http://volarenovels.com` && (/^(day|night)$/).test(e.data)) {
      document.body.setAttribute('class', `${e.data === 'day' ? '' : 'dark'}`);
    }
  });
  return;
}


// init fullscreen btn
// not @required because it is self-init and disqus doesn't need it
(() => {
  fetch('https://rawgit.com/HK49/tampermonkey-plugins/master/libs/fullscreen.js')
    .then((git) => {
      if (git.status === 200) { return git.text(); }
      throw new Error(`${git.status}. Couldn't fetch fullscreen from git.`);
    })
    .then(eval)
    .catch(window.console.error);
})();


// sidebar object
const sb = {
  class: 'sidebar-primary',
  id: 'sidebar',
};

if (!window.location.pathname.includes('catch-responsive-volare')) {
  sb.hidden = localStorage.hiddenSidebar ? JSON.parse(localStorage.hiddenSidebar) : false;
  window.addEventListener("beforeunload", () => {
    localStorage.hiddenSidebar = JSON.stringify(sb.hidden);
  });
}

// just oftenly used
const tr = { transition: 'all .4s ease-in-out' };

// change page width according to sidebar status
function pageWidth() {
  document.getElementById('page').style.width = `${sb.hidden ? '21cm' : 'calc(21cm + 340px)'}`;
}
waitress('#page', () => pageWidth());

waitress(`.${sb.class}`, () => {
  // style sidebar and its other children
  sb.node = document.getElementsByClassName(`${sb.class}`)[0];
  sb.node.setAttribute('id', sb.id);
  Object.assign(sb.node.style, {
    float: 'none',
    fontSize: '.8rem',
    maxWidth: '30vw',
    position: 'absolute',
    right: `${sb.hidden ? '-340px' : '0'}`,
    top: '0',
    width: '340px',
    willChange: 'right',
  }, tr);
  // TODO: what is parent node height smaller then sb height?

  waitress.style({
    [`#${sb.id} > :nth-child(n):not(#bar-bg):not(#bar-btn)`]: {
      position: 'relative',
      zIndex: '3',
    },
  }, false, 'sidebar_children_style');

  // style wrapper
  const wrap = document.getElementById(`${sb.id}`).parentElement;
  Object.assign(wrap.style, {
    overflow: 'hidden',
    padding: '0',
    position: 'relative',
    minHeight: window.getComputedStyle(sb.node).height,
  });

  // style sidebar bg
  sb.bg = sb.node.insertBefore(
    document.createElement('div'),
    sb.node.firstElementChild,
  );

  Object.assign(sb.bg.style, {
    border: '1px solid',
    borderTop: '0',
    borderRight: '0',
    bottom: '0',
    left: '0',
    position: 'absolute',
    right: '0',
    top: '0',
    zIndex: '2',
  });

  sb.bg.setAttribute('id', 'bar-bg');

  // style sidebar hiding button
  sb.btn = sb.node.insertBefore(
    document.createElement('div'),
    sb.bg.nextElementSibling,
  );

  sb.btn.setAttribute('id', 'bar-btn');

  // change arrow direction depending on sidebar status
  sb.arrowDirection = () => ({
    left: `calc(25px - 15px${sb.hidden ? '' : ' - 15px / 2'})`,
    transform: `rotate(${sb.hidden ? '225' : '45'}deg)`,
  });

  waitress.style({
    [`#${sb.btn.id}`]: {
      border: '1px solid',
      borderRadius: '50%',
      cursor: 'pointer',
      height: '50px',
      left: '-25px',
      position: 'absolute',
      top: '25%',
      width: '50px',
      zIndex: '1',
    },
    [`#${sb.btn.id}::before`]: Object.assign({
      border: '2px solid',
      borderBottom: '0',
      borderLeft: '0',
      borderRadius: '3px',
      content: '""',
      height: '15px',
      position: 'absolute',
      top: 'calc(25px - 15px / 2)', /* calc((sb.btn width / 2) - (::before width / 2)) */
      width: '15px',
    }, sb.arrowDirection(), tr),
  }, false, 'sidebar_hider_css');

  sb.btn.addEventListener('click', () => {
    sb.hidden = !sb.hidden;
    pageWidth();
    sb.node.style.right = `${sb.hidden ? '-340px' : '0'}`;
    waitress.style({
      [`#${sb.btn.id}::before`]: sb.arrowDirection(),
    }, false, 'sidebar_hider_css');
  });
});


// various text sizing
waitress([
  'body',
  'p',
  'span',
], {
  fontSize: '1rem !important',
  lineHeight: '1.5rem',
});

// header links size
waitress('#menu-main-menu', () => waitress.style({
  '#menu-main-menu .menu-item a': {
    fontSize: '.8rem',
  },
}));

// promotion message can now have more width, that we removed custom css btn
waitress('#text-45', { maxWidth: '80%' });

// site wrapper
waitress('#page', Object.assign({
  maxWidth: '90vw',
  willChange: 'width',
}, tr));

// main content
waitress('#main', Object.assign({
  float: 'none',
  margin: '0 auto 0 .5cm',
  padding: '5px',
  textAlign: 'justify',
  width: '20cm',
}, tr));


waitress('#content', {
  border: '1px solid',
  borderBottom: '0',
  borderTop: '0',
});


// remove original day/night & fontsizing features
['nightmode-css-css', 'text-69', 'text-53'].forEach((e) => {
  waitress(`#${e}`, () => document.getElementById(e).remove());
});


// disqus wrapper
waitress('#disqus_thread', {
  border: '1px solid',
  borderRadius: '4px',
  padding: '10px',
});

// day/night opts
function lights(daytime) {
  const on = (daytime === "day");

  // body, disqus wrapper
  waitress([
    'body',
    '#disqus_thread',
  ], {
    background: `${on ? '' : 'rgb(117, 72, 55)'}`,
  });

  // navbar
  waitress('.nav-primary', () => {
    const nav = document.getElementsByClassName('nav-primary')[0];
    nav.style.backgroundColor = `${on ? '' : 'hsl(14, 43%, 56%)'}`;

    waitress.style({
      [[
        '.nav-primary ul.menu .sub-menu a',
        '.nav-primary ul.menu .children a',
      ].join(', ')]: {
        backgroundColor: `${on ? '' : 'hsl(14, 43%, 56%)'}`,
      },
    });
  });


  // promotion message
  waitress('#promotion-message', {
    border: '1px solid',
    borderColor: `${on ? '' : 'rgb(196, 120, 98)'}`,
  });


  // background
  waitress(['#content', '#promotion-message', `.${sb.class}`, '#bar-bg', '#bar-btn'], {
    backgroundColor: `${on ? '' : 'rgb(59, 36, 30)'}`,
  });


  // text
  waitress([
    'body',
    'p',
    '.sidebar-primary',
  ].concat(Array(6).fill('h').map((e, i) => e + (i + 1))), {
    color: `${on ? '' : 'rgb(196, 120, 98)'}`,
  }, () => {
    waitress('.entry-title', () => {
      waitress.style({
        '#main .entry-title': {
          color: `${on ? '' : 'rgb(196, 120, 98)'} !important`,
        },
        hr: {
          backgroundColor: `${on ? '' : 'rgb(196, 120, 98)'}`,
        },
      }, false, 'font_color_style');
    });
  });


  // disqus window send msg to change theme
  waitress('#dsq-app1', () => {
    document.getElementById('dsq-app1').contentWindow.postMessage(
      `${on ? 'day' : 'night'}`,
      'https://disqus.com',
    );
  });
}

// btn from daynight.js
dayNight((() => lights("day")), (() => lights("night")));

// btn from fontsize.js
scaleFont();
