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
// @version        0.43
// @grant          GM_addStyle
// @run-at         document-start
// ==/UserScript==

var dark = {
  color: {
    all: 'rgb(196, 120, 98)',
    // old: 'rgb(215, 186, 161)',
    btn: 'rgb(243, 181, 157)',
    link: 'rgb(243, 181, 157)',
    linkHover: 'rgb(248, 210, 196)'
  },
  bg: 'rgb(117, 72, 55)',
  mid: 'rgb(88, 55, 42)',
  wrap: 'rgb(59, 36, 30)',
  tint: function(a) { return 'hsla(14, 43%, 56%, ' + (a || 1) + ')'; }
};

var light = {
  color: {
    all: 'rgb(150, 92, 75)',
    // old: 'rgb(59, 36, 30)'
    btn: 'rgb(246, 200, 182)',
    link: 'rgb(146, 89, 79)',
    linkHover: 'rgb(180, 130, 100)'
  },
  bg: 'rgb(195, 147, 104)',
  mid: 'rgb(207, 168, 134)',
  wrap: 'rgb(219, 190, 164)',
  tint: function(a) { return 'hsla(30, 30%, 77%, ' + (a || 1) + ')'; }
};

var css = {};
css.nodes = {};
///TODO should just place all css in css and attach it

var fix = {
  bg: function(i) {
    return({ background: 'transparent' + ((i && i === '!') ? ' !important' : '') });
  },
  color: function(i) {
    return({ color: 'inherit' + ((i && i === '!') ? ' !important' : '') });
  },
  bgandcolor: function(b, c) { return(Object.assign(fix.bg(b), fix.color(c))); }
};

function inputStyle() {
  // input
  css.input = {};
  css.nodes.input = {
    i: [
      'input',
      '#page input',
      '#page textarea',
      '#page #respond input',
      '#page #respond #submit',
      '#page #comments textarea',
      '#branding #searchform > input#s'
    ],
    placeholder: '::placeholder'
  };
  css.nodes.input.focus = (function() {
    var arr = [];
    css.nodes.input.i.forEach(function(i) { arr.push(i + ':focus'); });

    return arr;
  })();

  // here array becomes object key... as string. and no error smh
  css.input[css.nodes.input.i] = Object.assign({
    background: dark.tint(0.2),
    border: '1px solid ' + dark.tint(),
    borderRadius: '4px',
    transition: 'background-color .4s ease',
    font: 'normal 0.8rem/1rem Arial, "sans-serif"',
    textShadow: 'none',
    boxShadow: 'none'
  }, fix.color('!'));
  css.input[css.nodes.input.focus] = { background: dark.tint(0.4) };
  css.input[css.nodes.input.placeholder] = fix.color();

  waitress.style(css.input);
}

waitress(['input', 'textarea'], inputStyle);

var headRules = function() {
  if((/interactive|complete/).test(document.readyState)) {

    //fix for social buttons
    (function iss(){
      ['i', 'ss'].forEach(function(e){ iss[e] = document.getElementsByTagName(e); });
      Array.from(iss.i).concat(Array.from(iss.ss)).forEach(function(e){
        e.style.setProperty(
          'background', window.getComputedStyle(e).background, 'important'
        );
      });
    })();

    //globals
    document.getElementsByTagName("html")[0].setAttribute("id", "html");
    waitress.style({
      'html#html': {
        margin: '0 !important',
        color: window.getComputedStyle(document.body).color,
        backgroundColor: window.getComputedStyle(document.body).backgroundColor
      },
      '*, a, #page *, #page a': fix.bgandcolor(),
      '#page li a': fix.bgandcolor('!', '!')
    });


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
        fontSize: '0.6rem',
        lineHeight: '0.7rem'
      },
      '#header-menu li[id^=\'menu\'], #header-menu li[id^=\'menu\'] > a': fix.bgandcolor('', '!'),
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
      // homepage
      css.home = {};
      css.nodes.home = {
        content: '.home #content',
        article: '.home #content article'
      };
      css.home[css.nodes.home.content] = { borderColor: 'inherit' };
      css.home[css.nodes.home.article] = {
        borderBottom: '0.2rem solid',
        borderColor: 'inherit',
        borderRadius: '0'
      };
      waitress.style(css.home);

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
        ].join(', '),
        widgetlinks: '#page .widget a'
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
      css.wrap[css.nodes.wrap.widgets] = fix.bgandcolor('!', '!');
      css.wrap[css.nodes.wrap.widgetlinks] = fix.color('!');

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
        'article[id^=\'comment\'] + .children',
        '#page #comments-title'
      ].join(', '),
      tinted: [
        'article[id^=\'comment\'] + .children > .comment',
        '#author-info'
      ].join(', '),
      comment: '#page #comments .comment article',
      orFB: '#respond li[id^=theChampTabs]'
    };
    css.comments[css.nodes.comments.main] = fix.bgandcolor('!', '!');
    css.comments[css.nodes.comments.tinted] = {
      background: dark.tint(0.3) + ' !important',
      color: 'inherit !important'
    };
    css.comments[css.nodes.comments.comment] = {
      borderBottom: '4px solid ' + dark.tint(),
      borderRadius: '4px'
    };
    css.comments[css.nodes.comments.orFB] = fix.bgandcolor('!', '!');

    waitress.style(css.comments);

    // author/tl notes
    waitress.style({
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
    });

    document.removeEventListener('readystatechange', headRules, false);
  }
};

document.addEventListener('readystatechange', headRules, false);


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
waitress('a[href*=kobato], a[href="/"], li[id^=menu]', Object.assign({}, fix.bg('!')));


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
    ].join(', '),
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
      '#page',
      '#main',
      '#night_btn'
    ].join(', '),
    { color: (on ? light.color.btn : dark.color.btn) + ' !important' }
  );

  // all links
  waitress(
    'a, a[href*=kobato]',
    { color: (on ? light.color.link : dark.color.link) + ' !important' },
    function() {
      var a = document.getElementsByTagName('a'),
      setter = function(el, e) {
        el.style.setProperty(
          'color',
          ((/r$/).test(e) ? (on ? light.color.linkHover : dark.color.linkHover)
          : (on ? light.color.link : dark.color.link)),
          'important'
        );
      };
      ['mouseenter', 'mouseleave'].forEach(function(e){
        Array.from(a).forEach(function(el){ el.addEventListener(e, function() { setter(el, e); }); });
      });
    }
  );

};

// btn from daynight.js
dayNight( (function() { lights("day"); }), (function() { lights("night"); }) );

// btn from fontsize.js
scaleFont();

// btn from fullscreen.js
fullScreen();
