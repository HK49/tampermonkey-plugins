/* global waitress, dayNight, fullScreen */

// ==UserScript==
// @name           Style kobatochan.com
// @description    Change interface on kobatochan.com
// @author         HK49
// @include        https://kobatochan.com/*
// @require        https://rawgit.com/HK49/tampermonkey-plugins/master/libs/waitress.js
// @require        https://rawgit.com/HK49/tampermonkey-plugins/master/libs/daynight.js
// @require        https://rawgit.com/HK49/tampermonkey-plugins/master/libs/fullscreen.js
// @version        0.3
// @grant          GM_addStyle
// @run-at         document-start
// ==/UserScript==

if(/prologue|chapter|i-am-the-monarch/.test(window.location.pathname)) {
  waitress('.content-sidebar-wrap', { width: 100 + '% !important', fontSize: 1.4 + 'em', lineHeight: 1.6 + 'em' });
  waitress('#primary', { width: 75 + '%', maxWidth: '21cm', float: 'none', margin: '0 auto', boxShadow: '0 0 99px 0 hsla(0, 0%, 6%, .6)' });
  waitress('#secondary, #third-sidebar, #wpadminbar, #header-image', { display: 'none' });
  waitress('html', { marginTop: '0 !important' });

  dayNight((function() {
    waitress('article[id^=post], #primary', { backgroundColor: 'rgb(223, 200, 178) !important' });
    waitress('article[id^=post], p, span, h1, strong', { color: 'rgb(59, 36, 30) !important' });
    waitress('#main, .content-sidebar-wrap, #branding, .wrapper, body, html', { backgroundColor: 'rgb(148, 108, 71)' });
    waitress('#access', { background: 'rgb(148, 108, 71)' });
    waitress('#night_btn, #btn_full', { color: 'rgb(243, 181, 157) !important' });
    waitress('a', { color: 'rgb(146, 89, 79) !important' });
    waitress('a:hover', { color: 'rgb(180, 130, 100) !important' });
  }), (function() {
    waitress('article[id^=post], #primary', { backgroundColor: 'rgb(59, 36, 30) !important' });
    waitress('article[id^=post], p, span, h1, strong', { color: 'rgb(215, 186, 161) !important' });
    waitress('#main, .content-sidebar-wrap, #branding, .wrapper, body, html', { backgroundColor: 'rgb(117, 72, 55)' });
    waitress('#access', { background: 'rgb(117, 72, 55)' });
    waitress('a, #night_btn, #btn_full', { color: 'rgb(243, 181, 157) !important' });
    waitress('a:hover', { color: 'rgb(248, 210, 196) !important' });
  }));

  fullScreen();
}
