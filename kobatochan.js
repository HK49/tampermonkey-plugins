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
// @version        0.422
// @grant          GM_addStyle
// @run-at         document-start
// ==/UserScript==

var dark = {
  color: {
    all: 'rgb(215, 186, 161)',
    btn: 'rgb(243, 181, 157)',
    link: 'rgb(243, 181, 157)',
    linkHover: 'rgb(248, 210, 196)'
  },
  bg: 'rgb(117, 72, 55)',
  wrap: 'rgb(59, 36, 30)',
  tint: function(a) { return 'hsla(14, 43%, 56%, ' + (a || 1) + ')'; }
};

var light = {
  color: {
    all: 'rgb(59, 36, 30)',
    btn: 'rgb(246, 200, 182)',
    link: 'rgb(146, 89, 79)',
    linkHover: 'rgb(180, 130, 100)'
  },
  bg: 'rgb(195, 147, 104)',
  wrap: 'rgb(219, 190, 164)',
  tint: function(a) { return 'hsla(30, 30%, 77%, ' + (a || 1) + ')'; }
};

var css = {};
css.nodes = {};

var headRules = function() {
  if((/interactive|complete/).test(document.readyState) && !headRules.applied) {

    //globals
    waitress.style({
      '*, a, #page *, #page a': {
        color: 'inherit',
        background: 'transparent'
      },
      '#page li a': {
        color: 'inherit !important',
        background: 'transparent !important'
      }
    });

    css.input = {};
    css.nodes.input = {
      i: [
        'input',
        '#page input',
        '#page textarea',
        '#branding #searchform > input#s'
      ],
      focus: [
        'input:focus',
        '#page input:focus',
        '#page textarea:focus',
        '#branding #searchform > input#s:focus'
      ]
    };
    // here array becomes object key... as string. and no error smh
    css.input[css.nodes.input.i] = {
      background: light.tint(0.5),
      border: '1px solid ' + dark.tint(),
      borderRadius: '4px'
    };
    css.input[css.nodes.input.focus] = { background: light.tint() };

    waitress.style(css.input);


    // navbar submenu
    waitress.style({
      '#header-menu .menu-item > a + ul': {
        display: 'block',
        maxHeight: '0',
        overflow: 'hidden',
        transition: 'all .5s ease',
        boxShadow: 'none',
        top: '5rem',
        left: '5rem',
        opacity: '0'
      },
      '#header-menu .menu-item > a:hover + ul, #header-menu .menu-item > a + ul:hover': {
        maxHeight: 1e4 + 'px !important',
        top: '1.6rem',
        left: '0.8rem'
      },
      '#header-menu .menu-item > a:hover + ul': { opacity: '0.7' },
      '#header-menu .menu-item > a + ul:hover': { opacity: '1' },
      '#header-menu ul.menu ul a': {
        borderBottom: 'none',
        fontSize: '0.5rem',
        lineHeight: '0.5rem'
      },
      '#header-menu li[id^=\'menu\'], #header-menu li[id^=\'menu\'] > a': {
        color: 'inherit !important',
        background: 'transparent'
      },
      '#header-menu li.menu-item:hover::before': {
        content: '\'\'',
        position: 'absolute',
        zIndex: '-1',
        width: '100%',
        height: '100%',
        background: dark.tint(0.8)
      }
    });


    if(!(/prologue|chapter/).test(window.location.pathname)) {
      // wrapper and sidebars. (sidebars are not shown when reading)
      css.wrap = {};
      css.nodes.wrap = {
        wrapper: '#main-wrapper > #main > .wrapper',
        content: '#main-wrapper > #main > .wrapper > .content-sidebar-wrap',
        primary: '#primary',
        secondary: '#secondary',
        sidebar: '#third-sidebar',
        widgets: [
          '.widget',
          '.widget > .widget-title',
          '.widget > ul',
          '.widget > ul > li',
          '#page .widget > ul > li > a'
        ].join(', ')
      };
      css.wrap[css.nodes.wrap.wrapper] = {
        display: 'flex',
        flexFlow: 'row-reverse wrap',
        color: 'inherit !important',
        width: '100%'
      };
      css.wrap[css.nodes.wrap.content] = {
        flex: '1 0 calc(33rem + 340px)',
        display: 'flex',
        flexFlow: 'row wrap'
      };
      css.wrap[css.nodes.wrap.primary] = { flex: '0 0 33rem' };
      css.wrap[css.nodes.wrap.secondary] = {
        flex: '0 1 auto',
        color: 'inherit !important'
      };
      css.wrap[css.nodes.wrap.sidebar] = {
        display: 'block',
        flex: '0 1 auto',
        color: 'inherit !important'
      };
      css.wrap[css.nodes.wrap.widgets] = {
        background: 'transparent !important',
        color: 'inherit !important'
      };

      waitress.style(css.wrap);
    }


    // comments
    css.comments = {};
    css.nodes.comments = {
      main: [
        '#comments',
        '#comments > .commentlist',
        '#comments > .commentlist > .comment',
        'article[id^=\'comment\']',
        'article[id^=\'comment\'] + .children'
      ].join(', '),
      tinted: [
        'article[id^=\'comment\'] + .children > .comment',
        '#author-info'
      ].join(', '),
      comment: '#page #comments .comment article'
    };
    css.comments[css.nodes.comments.main] = {
      background: 'transparent !important',
      color: 'inherit !important'
    };
    css.comments[css.nodes.comments.tinted] = {
      background: dark.tint(0.3) + ' !important',
      color: 'inherit !important'
    };
    css.comments[css.nodes.comments.comment] = {
      borderBottom: '4px solid' + dark.tint(),
      borderRadius: '4px'
    };

    waitress.style(css.comments);

    // author/tl notes
    waitress.style({'#page li[dir=\'ltr\']': { background: dark.tint(0.5) + ' !important' }});

    headRules.applied = true;
  }
};

document.addEventListener('readystatechange', function() { headRules(); }, false);


// don't display sidebars when reading
if(/prologue|chapter/.test(window.location.pathname)) {
  waitress('#secondary, #third-sidebar', { display: 'none' });
}


waitress('#wpadminbar, #header-image', { display: 'none' });
waitress('.content-sidebar-wrap', { width: '100% !important' });
waitress('#primary', {
  width: '33rem',
  minWidth: '50vw',
  maxWidth: '90vw',
  minHeight: '33rem',
  float: 'none',
  margin: '0 auto',
  boxShadow: '0 0 3rem 0 hsla(0, 0%, 6%, .6)'
});
waitress('html', { marginTop: '0 !important' });
waitress('p', { fontSize: '1rem', lineHeight: '1.3rem', marginBottom: '1.8rem' });
waitress('a[href*=kobato], a[href="/"], li[id^=menu]', { background: 'transparent !important' });


var lights = function(daytime) {
  var on = (daytime === "day");

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
      '.sub-menu',
      '.wrapper'
    ].join(', '),
    { background: (on ? light.bg : dark.bg) + ' !important' }
  );

  // color of the reading text
  waitress(
    [
      'article[id^=post]',
      '#content',
      'h1',
      'p',
      'span',
      'strong',
      'time'
    ].join(', '),
    { color: (on ? light.color.all : dark.color.all) + ' !important' }
  );

  // buttons from libs
  waitress(
    [
      'body',
      'btn',
      '#btn_full',
      '#page',
      '#main',
      '#night_btn'
    ].join(', '),
    { color: (on ? light.color.btn : dark.color.btn) + ' !important' }
  );

  // all links
  waitress(
    'a, a[href*=kobato]',
    { color: (on ? light.color.link : dark.color.link) }
  );
  waitress(
    'a:hover, a[href*=kobato]:hover',
    { color: (on ? light.color.linkHover : dark.color.linkHover) + ' !important' }
  );

};

// btn from daynight.js
dayNight( (function() { lights("day"); }), (function() { lights("night"); }) );

// btn from fontsize.js
scaleFont();

// btn from fullscreen.js
fullScreen();
