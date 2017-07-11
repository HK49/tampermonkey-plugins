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
// @version        0.4
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
  wrap: 'rgb(59, 36, 30)'
};

var light = {
  color: {
    all: 'rgb(59, 36, 30)',
    btn: 'rgb(246, 200, 182)',
    link: 'rgb(146, 89, 79)',
    linkHover: 'rgb(180, 130, 100)'
  },
  bg: 'rgb(195, 147, 104)',
  wrap: 'rgb(219, 190, 164)'
};

var cssfy = function(node, rules) {
  // no "...arg" in es5
  var nodes = node.split(/\s?__\s?/);
  var style = "";
  var complile = function(obj) {
    var joint = '';
    Object.keys(obj).forEach(function(key) {
      joint += key.replace(/[A-Z]/g, function(m, o) { return (o ? '-' : '') + m.toLowerCase(); })
        + ': ' + obj[key] + '; ';
    });

    return joint;
  };
  for(var i = 0; i < nodes.length; i++) {
    style += (nodes[i] + complile(arguments[i + 1]).trim().replace(/^(.)(.+)(.)$/, '{$1$2$3}'));
  }
  var tag = document.getElementsByName(nodes[0] + "_style")[0]
  || document.head.insertBefore(document.createElement("style"), document.head.lastElementChild);
  tag.setAttribute("name", nodes[0] + "_style");
  tag.innerHTML += style;
};

var headRules = function() {
  if((/interactive|complete/).test(document.readyState) && !headRules.applied) {
    // navbar submenu
    cssfy(
      [
        '#header-menu .menu-item > a + ul',
        '#header-menu .menu-item > a:hover + ul, #header-menu .menu-item > a + ul:hover',
        '#header-menu .menu-item > a:hover + ul',
        '#header-menu .menu-item > a + ul:hover',
        '#header-menu ul.menu ul a'].join('__ '),
      { display: 'block', maxHeight: '0', overflow: 'hidden', transition: 'all .5s ease', boxShadow: 'none', top: '5rem', left: '5rem', opacity: '0' },
      { maxHeight: 1e4 + 'px !important', top: '2rem', left: '1rem' },
      { opacity: '0.7' },
      { opacity: '1' },
      { borderBottom: 'none', fontSize: '0.5rem', lineHeight: '0.5rem' }
    );

    if(!(/prologue|chapter/).test(window.location.pathname)) {
      // wrapper and sidebars
      cssfy(
        [
          '#main-wrapper > #main > .wrapper',
          '#main-wrapper > #main > .wrapper > .content-sidebar-wrap',
          '#third-sidebar',
          '.widget, .widget > .widget-title, .widget > ul, .widget > ul > li, .widget > ul > li > a',
          '#primary',
          '#secondary'
        ].join('__ '),
        { display: 'flex', flexFlow: 'row-reverse wrap', color: 'inherit !important' },
        { flex: '1 0 calc(33rem + 340px)', display: 'flex', flexFlow: 'row wrap' },
        { display: 'block', flex: '0 1 auto', color: 'inherit !important' },
        { background: 'transparent !important', color: 'inherit !important' },
        { flex: '0 0 33rem' },
        { flex: '0 1 auto' }
      );
    }

    // comments
    cssfy(
      [
        [
          '#comments',
          '#comments > .commentlist',
          '#comments > .commentlist > .comment',
          'article[id^=\'comment\']',
          'article[id^=\'comment\'] + .children'
        ].join(', '),
        ['article[id^=\'comment\'] + .children > .comment', '#author-info'].join(', ')
      ].join('__'),
      { background: 'transparent !important', color: 'inherit !important' },
      { background: 'hsla(16, 33%, 33%, 0.5) !important', color: 'inherit !important' }
    );

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
waitress('#primary', { width: '33rem', minWidth: '50vw', maxWidth: '90vw', float: 'none', margin: '0 auto', boxShadow: '0 0 3rem 0 hsla(0, 0%, 6%, .6)' });
waitress('html', { marginTop: '0 !important' });
waitress('p', { fontSize: '1rem', lineHeight: '1.3rem', marginBottom: '1.8rem' });
waitress('a[href*=kobato], a[href="/"], li[id^=menu]', { background: 'transparent !important' });

// btn from daynight.js
dayNight((function() {
  waitress('article[id^=post], #primary', { background: light.wrap + ' !important' });
  waitress('article[id^=post], h1, p, span, strong, time', { color: light.color.all + ' !important' });
  waitress([
    '#access', 'body', '#branding', '.content-sidebar-wrap', 'html', '#main', '.sub-menu', '.wrapper'
  ].join(', '), { background: light.bg + ' !important' });
  waitress('body, btn, #btn_full, #main, #night_btn', { color: light.color.btn + ' !important' });
  waitress('a, a[href*=kobato]', { color: light.color.link + ' !important' });
  waitress('a:hover, a[href*=kobato]:hover', { color: light.color.linkHover + ' !important' });
}), (function() {
  waitress('article[id^=post], #primary', { backgroundColor: dark.wrap + ' !important' });
  waitress('article[id^=post], h1, p, span, strong, time', { color: dark.color.all + ' !important' });
  waitress([
    '#access', 'body', '#branding', '.content-sidebar-wrap', 'html', '#main', '.sub-menu', '.wrapper'
  ].join(', '), { background: dark.bg + ' !important' });
  waitress([
    "a", "a[href*=kobato]", "body", "btn", "#btn_full", "#main", "#night_btn"
  ].join(', '), { color: dark.color.link + ' !important' });
  waitress('a:hover, a[href*=kobato]:hover', { color: dark.color.linkHover + ' !important' });
}));

// btn from fontsize.js
scaleFont();

// btn from fullscreen.js
fullScreen();
