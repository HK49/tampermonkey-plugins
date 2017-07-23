/* global waitress, dayNight, fullScreen, scaleFont */

// ==UserScript==
// @name           Style volarenovels.com
// @description    Change interface on volarenovels.com
// @author         HK49
// @include        http://volarenovels.com/*
// @require        https://rawgit.com/HK49/tampermonkey-plugins/master/libs/waitress.js
// @require        https://rawgit.com/HK49/tampermonkey-plugins/master/libs/daynight.js
// @require        https://rawgit.com/HK49/tampermonkey-plugins/master/libs/fontsize.js
// @require        https://rawgit.com/HK49/tampermonkey-plugins/master/libs/fullscreen.js
// @version        0.1a
// @grant          GM_addStyle
// @run-at         document-start
// ==/UserScript==

const barCls = 'sidebar-primary';
const tr = { transition: 'all .4s ease-in-out' };

async function sidebarHide() {
  // if no waitress function - get it
  try {
    waitress();
  } catch (e) {
    await fetch('https://rawgit.com/HK49/tampermonkey-plugins/master/libs/waitress.js')
      .then((git) => {
        if (git.status === 200) { return git.text(); }
        throw new Error(
          `${git.status}. Couldn't fetch waitress. sidebarHide() failed.`
        );
      })
      .then(eval)
      .catch(window.console.error);
  }

  function builder() {
    // style sidebar and its other children
    const sidebar = document.getElementsByClassName(`${barCls}`)[0];
    Object.assign(sidebar.style, {
      fontSize: '.8rem',
      position: 'absolute',
      right: '0',
      width: '340px',
      willChange: 'right',
    }, tr);

    waitress.style({
      [`.${barCls} > :nth-child(n):not(#bar-bg):not(#bar-btn)`]: {
        position: 'relative',
        zIndex: '3',
      },
    }, false, 'sidebar_children_style');

    // style wrapper
    const wrap = document.getElementsByClassName(`${barCls}`)[0].parentElement;
    Object.assign(wrap.style, {
      overflow: 'hidden',
      padding: '0',
      position: 'relative',
    });

    // style sidebar bg
    const bg = sidebar.insertBefore(
      document.createElement('div'),
      sidebar.firstElementChild,
    );

    Object.assign(bg.style, {
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

    bg.setAttribute('id', 'bar-bg');

    // style sidebar hiding button
    const btn = sidebar.insertBefore(
      document.createElement('div'),
      bg.nextElementSibling,
    );

    Object.assign(btn.style, {
      border: '1px solid',
      borderRadius: '50%',
      height: '50px',
      left: '-25px',
      position: 'absolute',
      top: '25%',
      width: '50px',
      zIndex: '1',
    });

    btn.setAttribute('id', 'bar-btn');

    let hidden = false;
    btn.addEventListener('click', () => {
      if (!hidden) {
        // hide sidebtn, shorten width of page
        document.getElementById('page').style.width = '21cm';
        sidebar.style.right = '-340px';
      } else {
        // reveal
        document.getElementById('page').style.width = 'calc(21cm + 340px)';
        sidebar.style.right = '0';
      }
      hidden = !hidden;
    });
  }

  waitress(`.${barCls}`, () => builder());
}

sidebarHide();


// various text sizing
waitress([
  'body',
  'p',
  'span',
], {
  fontSize: '1rem !important',
  lineHeight: '1.5rem',
});


waitress('#main',
  () => waitress.style({
    // site wrapper
    '#page': Object.assign({
      width: 'calc(21cm + 340px)',
      willChange: 'width',
    }, tr),
    // main content
    '#main': Object.assign({
      width: '20cm',
    }, tr),
  }, false, 'wrappers'),
);


waitress('#content', {
  border: '1px solid',
  borderBottom: '0',
  borderTop: '0',
});


// remove original day/night & fontsizing features
['nightmode-css-css', 'text-69', 'text-53'].forEach((e) => {
  waitress(`#${e}`, () => document.getElementById(e).remove());
});


// day/night opts
function lights(daytime) {
  const on = (daytime === "day");

  waitress('body', {
    background: `${on ? '' : 'rgb(117, 72, 55)'}`,
  });

  // navbar
  waitress('.nav-primary', () => {
    const nav = document.getElementsByClassName('nav-primary')[0];
    nav.style.backgroundColor = `${on ? '' : 'hsl(14, 43%, 56%)'}`;
  });


  // promotion message
  waitress('#promotion-message', {
    border: '1px solid',
    borderColor: `${on ? '' : 'rgb(196, 120, 98)'}`,
  });


  // background
  waitress(['#content', '#promotion-message', `.${barCls}`, '#bar-bg', '#bar-btn'], {
    backgroundColor: `${on ? '' : 'rgb(59, 36, 30)'}`,
  });

  // text
  waitress([
    'body',
    'p',
    'sidebar-primary',
    'h1',
  ], {
    color: `${on ? '' : 'rgb(196, 120, 98)'}`,
  });
}

// btn from daynight.js
dayNight((() => lights("day")), (() => lights("night")));

// btn from fullscreen.js
fullScreen();

// btn from fontsize.js
scaleFont();
