/* global waitress, mouse, addIndent */

// ==UserScript==
// @name           Style shiroyukitranslations
// @description    Change interface on shiroyukitranslations.com
// @author         HK49
// @include        http://shiroyukitranslations.com/*
// @require        https://github.com/HK49/tampermonkey-plugins/raw/stable/libs/hide_inactive_mouse.js
// @require        https://github.com/HK49/tampermonkey-plugins/raw/stable/libs/waitress.js
// @require        https://github.com/HK49/tampermonkey-plugins/raw/stable/libs/indent.js
// @version        0.33
// @updateURL      https://github.com/HK49/tampermonkey-plugins/raw/stable/shiroyuki.js
// @downloadURL    https://github.com/HK49/tampermonkey-plugins/raw/stable/shiroyuki.js
// @grant    GM_addStyle
// @run-at   document-start
// ==/UserScript==
//- The @grant directive is needed to restore the proper sandbox.
//- The "@run-at document-start" directive is needed for script execution before the page render.

// restore #main bg color from cache or assign standart
var saveBG = localStorage.saveBG || 'rgb(90, 90, 92)';


function colorManager() {
  // window.main is already should be declared by style, but safeguard
  var main = document.getElementById('main') || null;

  // if #main style changes - also change style of body, #page and p
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function() {
      colorManager();
    });
  });

  if(main) {
    // update saveBG; getComputedStyle gets rgb of backgroundColor
    saveBG = window.getComputedStyle(main).backgroundColor || saveBG;

    // getter and setter
    var oldStyle = saveBG.match(/\d+/g), newStyle = [];
    // make #page and body darker or lighter then #main
    for(var i = 0; i < oldStyle.length; i++) {
      newStyle.push((+oldStyle[i] > 60 && +oldStyle[i] - 60) || +oldStyle[i] + 20);
    }
    waitress('#page, body', { background: 'rgb(' + newStyle.join(', ') + ')' });

    // get sum of r g b
    var rgbSum = oldStyle.reduce(function(a, b) { return +a + +b; }, 0);
    // change text color depending on #main bg color
    var txt = { green: 'rgb(100, 155, 100)', dark: 'rgb(30, 30, 30)', warm: 'rgb(80, 50, 26)' };
    waitress('p, #btn_full', {
      color: (
        (rgbSum === 718 ? txt.warm : rgbSum > 600 ? txt.dark : rgbSum < 90 ? txt.green : '')
        + '!important'
      )
    });

    if(!main.observing) {
      observer.observe(main, { attributes: true, attributeFilter: ['style'] });
      observer.observe(document.getElementById('page'), { attributes: true, attributeFilter: ['style'] });
      main.observing = true;
    }
  } else {
    // wait for #main to execute this func
    window.requestAnimationFrame(colorManager);
  }
}

function shiroyukiMainFunc() {
  waitress('#main', {
    background: saveBG,
    padding: '10%',
    textAlign: 'justify',
    display: 'flex',
    flexDirection: 'column'
  }, colorManager());
  waitress('#page', { boxShadow: '0 0 50px hsla(0, 0%, 0%, 0.3)', width: '80%', maxWidth: '210mm' });
  waitress('#page::before, #page::after', { width: '100% !important' });
  waitress('p', { fontSize: '1.3rem', lineHeight: '1.8rem' });
  waitress('#primary', { width: '100%', minWidth: '100%' });
  waitress('#sidebar', { display: 'flex', width: '100%', flexWrap: 'wrap' });
  waitress('#search-3, #meta-2', { flexGrow: '1' });
  waitress('body', { scrollbarZIndex: 9e99 + '' });
}

if(window.location.host.includes("shiroyukitranslations")) {
  shiroyukiMainFunc();
}

function fullScreen() {
  var screenFull, req;
  var btn = document.body.insertBefore(document.createElement("btn"), document.body.firstElementChild);

  btn.setAttribute("id", "btn_full");
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '10px',
    left: '10px',
    width: '26px',
    height: '26px',
    border: 'solid 2px',
    cursor: 'pointer',
    opacity: '.6',
    transition: 'all .6s ease'
  });
  document.getElementsByTagName("html")[0].style.backgroundColor = document.body.style.background;
  document.head.insertAdjacentHTML('beforeend', "<style name=fullscreen'>body:-webkit-full-screen { overflow-y: scroll; background-color: " + document.body.style.background + "; width:100%; height:100%; } #btn_full:hover { opacity: 1 !important; }</style>");

  waitress("#btn_full::before, #btn_full::after", {
    content: '\'\'',
    width: '0',
    height: '0',
    position: 'absolute',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderStyle: 'solid',
    transition: "all .3s ease"
  });

  var restyle = function(full) {
    btn.setAttribute("title", (screenFull ? "Exit" : "Enter") + " full screen mode");
    waitress("#btn_full::before", {
      left: (full ? '0' : '3px'),
      bottom: (full ? '0' : '3px'),
      borderWidth: '10px 0 0 10px'
    });
    waitress("#btn_full::after", {
      right: (full ? '0' : '3px'),
      top: (full ? '0' : '3px'),
      borderWidth: '0 10px 10px 0'
    });
    waitress("#btn_full:hover::before", { left: (!full ? '0' : '3px'), bottom: (!full ? '0' : '3px') });
    waitress("#btn_full:hover::after", { right: (!full ? '0' : '3px'), top: (!full ? '0' : '3px') });
  };

  restyle(screenFull);

  var action = function(o) {
    if(!screenFull) {
      req = o.requestFullScreen || o.webkitRequestFullscreen || o.mozRequestFullScreen || o.msRequestFullscreen;
      screenFull = true;
      req.apply(o);
    } else {
      req = document.exitFullscreen || document.webkitExitFullscreen || document.mozExitFullScreen || document.msExitFullscreen;
      screenFull = false;
      req.bind(document).apply();
    }
    restyle(screenFull);
  };
  btn.addEventListener('click', function(){ action(document.body); });
}

document.addEventListener('readystatechange', function() {
  if(document.readyState === "complete") {
    // hide mouse if not moving (kinda)
    mouse.hide();

    // add indent on long paragraphs
    addIndent(document.getElementsByTagName('p'));

    fullScreen();
  }
});

window.onbeforeunload = function(){
  // store bg to restore on page load
  localStorage.saveBG = document.getElementById('main').style.backgroundColor;
};
