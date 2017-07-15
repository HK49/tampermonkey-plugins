/* global waitress, dayNight, fullScreen, scaleFont */

// ==UserScript==
// @name           Style kobatochan.com
// @description    Change interface on kobatochan.com
// @author         HK49
// @include        https://kobatochan.com/*
// @require        https://rawgit.com/HK49/tampermonkey-plugins/master/libs/waitress.js
// @require        https://rawgit.com/HK49/tampermonkey-plugins/master/libs/daynight.js
// @require        https://rawgit.com/HK49/tampermonkey-plugins/master/libs/fontsize.js
// @require        https://rawgit.com/HK49/tampermonkey-plugins/master/libs/fullscreen.js
// @version        0.5
// @grant          GM_addStyle
// @run-at         document-start
// ==/UserScript==

const dark = {
  color: {
    all: 'rgb(196, 120, 98)',
    btn: 'rgb(243, 181, 157)',
    link: 'rgb(243, 181, 157)',
    linkHover: 'rgb(248, 210, 196)'
  },
  bg: 'rgb(117, 72, 55)',
  mid: 'rgb(88, 55, 42)',
  wrap: 'rgb(59, 36, 30)',
  tint: (a = 1) => 'hsla(14, 43%, 56%, ' + a + ')'
};

const light = {
  color: {
    all: 'rgb(150, 92, 75)',
    btn: 'rgb(246, 200, 182)',
    link: 'rgb(125, 67, 63)',
    linkHover: 'rgb(71, 38, 36)'
  },
  bg: 'rgb(195, 147, 104)',
  mid: 'rgb(207, 168, 134)',
  wrap: 'rgb(219, 190, 164)',
  tint: (a = 1) => 'hsla(30, 30%, 77%, ' + a + ')'
};

const css = {};
const nodes = {};
///TODO should just place all css in css and attach it

const fix = {
  i: (i) => ((i && i === '!') ? ' !important' : ''),
  bg: (i) => ({ background: 'transparent' + fix.i(i) }),
  color: (i) => ({ color: 'inherit' + fix.i(i) }),
  bgandcolor: (b, c) => Object.assign(fix.bg(b), fix.color(c))
};


// remove custom css
waitress('#wp-custom-css', () => document.getElementById('wp-custom-css').remove());
waitress('#dark-css', () => document.getElementById('dark-css').remove());
waitress('#text-21', () => document.getElementById('text-21').remove());


// input
(() => {
  css.input = {};
  const input = {
    i: [
      'input',
      '#page input',
      '#page textarea',
      '#page #respond input',
      '#page #respond #submit',
      '#page #comments textarea',
      '#branding #searchform > input#s'
    ],
    form: 'form',
    ph: '::placeholder',
    phH: ':hover::placeholder'
  };
  input.focus = input.i.map((i) => i + ':focus');
  input.hover = input.i.map((i) => i + ':hover:not(:focus)');

  css.input[input.i] = Object.assign({
    background: dark.tint(0.2),
    border: '1px solid ' + dark.tint(),
    borderRadius: '4px',
    boxShadow: 'none',
    font: 'normal 0.8rem/1rem Arial, "sans-serif"',
    padding: '.5rem',
    textShadow: 'none',
    transition: 'background-color .4s ease'
  }, fix.color('!'));
  css.input[input.focus] = { background: dark.tint(0.4) };
  css.input[input.hover] = { background: light.tint(0.1) };
  css.input[input.form] = { overflow: 'hidden' };
  css.input[input.ph] = Object.assign(
    { transition: 'transform .8s ease-in-out' },
    fix.color()
  );
  css.input[input.phH] = { transform: 'translateX(200%)' };

  waitress(['input', 'textarea'], waitress.style(css.input, false, 'input_style'));
})();


// navbar
(() => {
  const nav = {};
  css.nav = {};
  nav.head = '#header-menu';
  nav.root = nav.head + ' > nav';
  nav.wrap = nav.root + ' > .wrapper';
  nav.menu = nav.wrap + ' > .menu';
  nav.item = nav.menu + ' .menu-item';
  nav.link = nav.item + ' > a';
  nav.subm = nav.link + ' + .sub-menu';
  nav.subl = nav.subm + ' > li';
  nav.subs = nav.subl + ' > a';
  nav.submsubm = nav.subs + ' + .sub-menu';
  nav.hoverLink = nav.item + ':hover' + ' > .sub-menu';
  nav.hoverSubm = nav.subm + ':hover';
  nav.hoverSubs = nav.subm + ' > li:hover::before';

  css.nav[nav.wrap] = { width: '100%' };
  css.nav[nav.menu] = {
    display: 'inline-flex',
    flexFlow: 'row wrap',
    width: '100%'
  };
  css.nav[nav.item] = {
    display: 'flex',
    flex: '1 0 auto'
  };
  css.nav[nav.link] = {
    fontSize: '.7rem',
    lineHeight: '1.65rem',
    margin: '0 auto',
    padding: '0 .3rem',
    width: 'max-content'
  };
  css.nav[nav.subm] = {
    boxShadow: 'none',
    display: 'flex',
    position: 'absolute',
    flexFlow: 'column nowrap',
    left: '.1rem',
    maxHeight: '0',
    maxWidth: '12rem',
    opacity: '0',
    overflow: 'hidden',
    top: 'calc(1.65rem * 2)',
    transition: 'all .5s ease',
    width: 'auto'
  };
  css.nav[[nav.hoverLink, nav.hoverSubm]] = {
    maxHeight: 1e4 + 'px !important',
    overflow: 'visible',
    top: '1.65rem'
  };
  css.nav[nav.hoverLink] = { opacity: '.7' };
  css.nav[nav.hoverSubm] = { opacity: '1' };
  css.nav[nav.subl] = {
    borderLeft: '.2rem solid',
    zIndex: '1'
  };
  css.nav[nav.subl + '::after'] = {
    borderColor: 'inherit',
    borderTop: '.1rem solid',
    bottom: '0',
    content: '\'\'',
    left: '-.2rem',
    position: 'absolute',
    transition: 'width .5s 1s ease-out',
    width: '0'
  };
  css.nav[
    [nav.hoverLink, nav.hoverSubm].map((e) => e + ' > li::after')
  ] = { width: 'calc(100% + .2rem)' };
  css.nav[nav.subs] = {
    borderBottom: 'none',
    fontSize: '.6rem',
    lineHeight: '1.6rem',
    margin: '0'
  };
  css.nav[nav.hoverSubs] = {
    background: dark.tint(0.8),
    content: '\'\'',
    height: '100%',
    position: 'absolute',
    top: '0',
    width: '100%',
    zIndex: '-1'
  };
  css.nav[nav.subm + '::before'] = {
    borderLeft: '.2rem solid',
    borderColor: 'inherit',
    content: '\'\'',
    height: '1.65rem',
    position: 'absolute',
    top: '0',
    transition: 'all .5s .5s ease'
  };
  css.nav[[nav.hoverLink, nav.hoverSubm].map((e) => e + '::before')] = { top: '-1.65rem' };
  css.nav[nav.submsubm] = { top: 'calc(1.6rem * 3)', zIndex: '-1' };
  css.nav[
    [
      [nav.subl, nav.submsubm].map((e) => e + ':hover'),
      nav.subl + ':hover > a + .submenu'
    ].join(',')
  ] = { zIndex: '2' };
  css.nav[
    [nav.submsubm + ':hover', nav.subl + ':hover > a + .sub-menu'].join(',')
  ] = { top: '1.6rem' };
  css.nav[nav.submsubm + ' > li > a'] = { lineHeight: '1.6rem' };

  waitress('nav', waitress.style(css.nav, false, 'navbar_style'));
})();


//fix for social buttons
waitress(['i', 'ss'], (iss = {}) => {
  ['i', 'ss'].forEach((e) => { iss[e] = document.getElementsByTagName(e); });
  Array.from(iss.i).concat(Array.from(iss.ss)).forEach((e) => {
    e.style.setProperty(
      'background', window.getComputedStyle(e).background, 'important'
    );
  });
});


//globals
//waitress('#page', waitress.style({ '*, a, #page *, #page a': fix.bgandcolor() }));
waitress('#page', waitress.style({ '*, a, #page *, #page a': fix.color() }));

if(!(/prologue|chapter/).test(window.location.pathname)) {
  (() => {
    // homepage
    css.home = {};
    nodes.home = {
      content: '.home #content',
      article: '.home #content article'
    };
    css.home[nodes.home.content] = { borderColor: 'inherit' };
    css.home[nodes.home.article] = {
      borderBottom: '0.2rem solid',
      borderColor: 'inherit',
      borderRadius: '0'
    };
    waitress.style(css.home, false, 'homepage_style');


    // wrapper and sidebars. (sidebars are not shown when reading)
    css.wrap = {};
    nodes.wrap = {
      wrapper: '#main-wrapper > #main > .wrapper',
      content: '#main-wrapper > #main > .wrapper > .content-sidebar-wrap',
      primary: '#primary',
      secondary: '#secondary',
      sidebar: '#third-sidebar',
      widgets: [
        '.widget',
        '.widget > .widget-title',
        '.widget > ul',
        '.widget > ul > li'
      ]
    };
    css.wrap[nodes.wrap.wrapper] = {
      display: 'flex',
      flexFlow: 'row-reverse wrap',
      color: 'inherit !important',
      width: '100%'
    };
    css.wrap[nodes.wrap.content] = {
      flex: '1 0 calc(33rem + 340px)',
      display: 'flex',
      flexFlow: 'row wrap'
    };
    css.wrap[nodes.wrap.primary] = { flex: '0 0 33rem' };
    css.wrap[nodes.wrap.secondary] = {
      flex: '0 1 auto',
      color: 'inherit !important'
    };
    css.wrap[nodes.wrap.sidebar] = {
      display: 'block',
      flex: '0 1 auto',
      color: 'inherit !important'
    };
    css.wrap[nodes.wrap.widgets] = fix.bgandcolor('!', '!');

    waitress.style(css.wrap, false, 'main_layout_style');
  })();
}


// comments
(() => {
  css.comments = {};
  nodes.comments = {
    main: [
      '#comments',
      '#comments > .commentlist',
      '#comments > .commentlist > .comment',
      'article[id^=\'comment\']',
      'article[id^=\'comment\'] + .children',
      '#page #comments-title'
    ],
    tinted: [
      'article[id^=\'comment\'] + .children > .comment',
      '#author-info'
    ],
    comment: '#page #comments .comment article',
    orFB: '#respond li[id^=theChampTabs]'
  };
  css.comments[nodes.comments.main] = fix.bgandcolor('!', '!');
  css.comments[nodes.comments.tinted] = {
    background: dark.tint(0.3) + ' !important',
    color: 'inherit !important'
  };
  css.comments[nodes.comments.comment] = {
    borderBottom: '4px solid ' + dark.tint(),
    borderRadius: '4px'
  };
  css.comments[nodes.comments.orFB] = fix.bgandcolor('!', '!');

  waitress('#comments', waitress.style(css.comments, false, 'comments_style'));
})();


// author/tl notes
waitress('.footnotes', waitress.style({
  '#page .footnotes, #page .footnotes ol, #page .footnotes li': Object.assign({
    fontSize: '0.8rem',
    lineHeight: '1.2rem'
  }, fix.bgandcolor('', '!')),
  '#page .entry-content ol': { color: 'inherit !important' },
  '#page li[dir=\'ltr\'], #page li[id^=fn]': {
    background: dark.tint(0.5) + ' !important',
    borderRight: '4px solid ' + dark.tint(),
    color: 'inherit !important'
  }
}, false, 'footnotes_style'));


// don't display sidebars when reading
if(/prologue|chapter/.test(window.location.pathname)) {
  waitress('#secondary, #third-sidebar', { display: 'none' });
}


waitress('#wpadminbar, #header-image', { display: 'none' });
waitress('.content-sidebar-wrap', { width: '100% !important' });
waitress('#primary', {
  width: '34rem',
  minWidth: '50vw',
  maxWidth: '90vw',
  minHeight: '33rem',
  float: 'none',
  margin: '0 auto',
  border: '1rem solid',
  borderBottomWidth: '0.3rem',
  borderTopWidth: '0.3rem'
});
waitress('p', { fontSize: '1rem', lineHeight: '1.3rem', marginBottom: '1.8rem' });
waitress('a[href*=kobato], a[href="/"], li[id^=menu]', (() => fix.bg('!'))());

//remove 32px margin-top for admin bar
waitress('style[media="screen"]',
  (q = document.querySelectorAll('style[media="screen"]')) => {
    q.forEach((e) => { if((/n-top:.*!i/).test(e.innerText)) { e.remove(); } });
  }
);

// remove bg of topbtn
waitress('#scrollup', (() => fix.bg('!'))());

function lights(daytime) {
  const on = (daytime === "day");

  // page with text
  waitress(
    'article[id^=post], #primary',
    { background: (on ? light.wrap : dark.wrap) + ' !important' }
  );

  // page background
  waitress(
    [
      '#access',
      'body',
      '#branding',
      '.content-sidebar-wrap',
      'html',
      '#main',
      '#site-generator',
      '.sub-menu',
      '.wrapper'
    ],
    { background: (on ? light.bg : dark.bg) + ' !important' }
  );

  // page border
  waitress('#primary', { borderColor: (on ? light.mid : dark.mid) });

  // color of the reading text
  waitress(
    [
      'article[id^=post]',
      '#content',
      'h1',
      'hr',
      'p',
      'span',
      'strong',
      'time'
    ],
    { color: (on ? light.color.all : dark.color.all) + ' !important' }
  );
  waitress('hr', {
    background: (on ? light.color.all : dark.color.all) + ' !important',
    height: '0.1rem'
  });

  // buttons from libs
  waitress(
    [
      'body',
      'btn',
      '#btn_full',
      'html',
      '#page',
      '#main',
      '#night_btn'
    ],
    { color: (on ? light.color.btn : dark.color.btn) + ' !important' }
  );

  // links
  waitress('a', () => waitress.style({
    'a, a:visited': { color: (on ? light.color.link : dark.color.link) + ' !important' },
    'a:hover, a:active': { color: (on ? light.color.linkHover : dark.color.linkHover) + ' !important' }
  }, false, 'links_style'));

  //checkboxes
  waitress('input', () => waitress.style({
    'input[type="checkbox"]': {
      position: 'relative',
      width: 'initial !important'
    },
    'input[type="checkbox"]::before, input[type="checkbox"]:checked::after': {
      content: '\'\'',
      cursor: 'pointer',
      position: 'absolute',
      border: '2px solid ' + (on ? dark.tint() : dark.color.btn)
    },
    'input[type="checkbox"]::before': {
      left: '55%',
      width: '110%',
      height: '110%',
      borderRadius: '4px',
      transform: 'translateX(-55%)',
      background: (on ? light.color.btn : dark.tint())
    },
    'input[type="checkbox"]:checked::after': {
      width: '50%',
      height: '33%',
      borderTop: 'none',
      borderRight: 'none',
      transform: 'rotate(-45deg) translateY(120%) translateX(-10%)'
    }
  }, false, 'checkbox_style' ));
}

// btn from daynight.js
dayNight((() => lights("day")), (() => lights("night")));

// btn from fontsize.js
scaleFont();

// btn from fullscreen.js
fullScreen();
