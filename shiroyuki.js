// ==UserScript==
// @name           Style shiroyukitranslations
// @description    Change interface on shiroyukitranslations.com
// @author         HK49
// @include        http://shiroyukitranslations.com/*
// @require        https://github.com/HK49/tampermonkey-plugins/raw/stable/libs/hide_inactive_mouse.js
// @require        https://github.com/HK49/tampermonkey-plugins/raw/stable/libs/style_ongo.js
// @require        https://github.com/HK49/tampermonkey-plugins/raw/stable/libs/indent.js
// @version        0.3b
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
    // update saveBG
    saveBG = main.style.backgroundColor || saveBG;
    /// TODO but what to do if color is rgb but for example "blue"?
    var oldStyle = saveBG.match(/\d+/g);

    // make #page and body darker or lighter then #main
    var newStyle = [];
    for(var i in oldStyle) { newStyle.push((+oldStyle[i] > 60 && +oldStyle[i] - 60) || +oldStyle[i] + 20); }
    var darkerRule = { background: 'rgb(' + newStyle.join(', ') + ')' };
    style('#page', darkerRule);
    style('body', darkerRule);

    // get sum of r g b
    var rgbSum = oldStyle.reduce(function(a, b) { return +a + +b; }, 0);
    // change text color depending on #main bg color
    var txt = { green: 'rgb(100, 155, 100)', dark: 'rgb(30, 30, 30)', warm: 'rgb(80, 50, 26)' };
    style('p', {
      color: (
        (rgbSum > 600 ? txt.dark : rgbSum < 90 ? txt.green : rgbSum === 718 ? txt.warm : '')
        + '!important'
      )
    });

    if(!main.observing) {
      observer.observe(main, { attributes: true, attributeFilter: ['style'] });
      observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
      main.observing = true;
    }
  } else {
    // wait for #main to execute this func
    window.requestAnimationFrame(colorManager);
  }
}

function shiroyukiMainFunc() {
  style('#main', { background: saveBG, padding: '10%', textAlign: 'justify' }, colorManager());
  style('#page', { boxShadow: '0 0 50px hsla(0, 0%, 0%, 0.3)', width: '80%', maxWidth: '210mm' });
  style('#page:before, #page:after', { width: '100% !important' });
  style('p', { fontSize: '1.3rem', lineHeight: '1.8rem' });
  style('#sidebar', { display: 'none' });
  style('#primary', { width: '100%' });
  style('body', { scrollbarZIndex: '9e99' });
}

if(window.location.host.includes("shiroyukitranslations")) {
  shiroyukiMainFunc();
}

document.addEventListener('readystatechange', function() {
  if(document.readyState === "complete") {
    // hide mouse if not moving (kinda)
    mouse.hide();

    // add indent on long paragraphs
    addIndent(document.getElementsByTagName('p'));
  }
});

window.onbeforeunload = function(){
  // store bg to restore on page load
  localStorage.saveBG = document.getElementById('main').style.backgroundColor;
};
