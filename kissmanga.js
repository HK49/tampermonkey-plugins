// ==UserScript==
// @name           Style kissmanga
// @description    Change interface on kissmanga.com
// @include        http://kissmanga.com/*
// @version        0.62b
// @updateURL      https://github.com/HK49/tampermonkey-plugins/raw/stable/kissmanga.js
// @downloadURL    https://github.com/HK49/tampermonkey-plugins/raw/stable/kissmanga.js
// @grant    GM_addStyle
// @run-at   document-start
// ==/UserScript==
//- The @grant directive is needed to restore the proper sandbox.
//- The "@run-at document-start" directive is needed for script execution before the page render.

function setAttributes(el, attrs) {
  for(var i in attrs) {
    if (typeof (i) !== 'undefined') {
      el.setAttribute(i, attrs[i]);
    }
  }
}

var events = ['mouseenter', 'mouseleave'];

////////////////////////////////////////////////////////
/////// RESIZE BIG IMAGES TO FIT BROWSER WINDOW ////////
////////////////////////////////////////////////////////

var mangaImgs = [];
function resizeImg(img){
  var wishedWidth = Math.floor(((document.body.clientWidth / 10 ) * 9));
  if(
      (
        (img.clientWidth >= wishedWidth) ||
        (
          (img.clientWidth !== wishedWidth) &&
          (img.src.indexOf('blogspot') !== -1) &&
          (img.clientWidth <= img.naturalWidth)
        )
      ) &&
      (img.naturalWidth >= wishedWidth)
  ) {
    Object.assign(img.style, { width: wishedWidth + 'px', cursor: 'pointer' });
    img.onclick = function(){
      img.style.width = (img.clientWidth !== wishedWidth ? wishedWidth : img.naturalWidth) + 'px';
    };
  } else if (img.src.indexOf('blogspot') !== -1) {
    img.style.width = img.naturalWidth + 'px';
  }
  if(img.src.indexOf('blogspot') !== -1 && mangaImgs.indexOf(img) === -1) {
    mangaImgs.push(img);
    var src = img.src,
          c = 0;
    img.onerror = (c > 11 ? "" : function(){
      c += 1;
      img.src = (c > 10 ? 'http://i.imgur.com/Z0EEDRI.png' : (src + '?timestamp=' + new Date().getTime()));
      if(c > 10) { img.style.width = '150px'; }
    });
  }
}

function changeImg() {
  for (var i = 0; i < document.images.length; i++) {
    document.images[i] = resizeImg(document.images[i]);
  }
}

document.onreadystatechange = function(){
  if(document.readyState === 'complete'){
    var resizeTimes = 0;
    var resizeShoot = setInterval(function(){
      changeImg();
      if (++resizeTimes === 20) {
        window.clearInterval(resizeShoot);
      }
    }, 1500);
  }
};

window.addEventListener('resize', function(){ changeImg(); });

////////////////////////////////////////////////////////
/////////////////////// BUTTONS ////////////////////////
////////////////////////////////////////////////////////

var btnBoxStyle = {
    display: 'block',
    position: 'fixed',
    zIndex: '9',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    transition: 'all 0.4s ease-out',
    overflow: 'hidden'
};

var arrowHeight = 20,
    arrowWidth = 12;

var btnStyle = {
    width: arrowWidth + 'px',
    height: arrowHeight + 'px',
    color: '#fff',
    background: 'transparent',
    zIndex: '999',
    backfaceVisibility: 'hidden'
};

(function addPseudoStyle(){
  if (document.body && (document.getElementById('top_button')
                     || document.getElementById('next_button')
                     || document.getElementById('previous_button'))
  ) {
    var applyRules = function (el, obj) {
      var joint = '';
      for(var i in obj) {
        if (typeof (i) !== 'undefined') {
          joint += String(i) + ':' + ' ' + String(obj[i])
                + (i == Object.keys(obj)[Object.keys(obj).length - 1] ? '' : ';');
        }
      }
      var result = el + '{' + joint + '}';

      return result;
    };

    var before = '.side_btn::before',
        rulesBefore = { top: '2px', transform: 'rotate(45deg)' };

    var after = '.side_btn::after',
        rulesAfter = { top: '0', transform: 'rotate(-45deg)' };

    var both = [before, after].join(', ');
    var rulesBoth = {
      content: '\'\'',
      width: '14px',
      height: '2px',
      position: 'absolute',
      bottom: '0',
      margin: 'auto 0',
      right: '2px',
      'box-shadow': 'inset 0 0 0 32px',
      'transform-origin': 'right'
    };

    var hover = '.button_box:hover',
        rulesHover = { cursor: 'pointer' };

    document.head.insertAdjacentHTML(
      'beforeend',
      "<style name='btn_style'>"
      + applyRules(both, rulesBoth)
      + applyRules(before, rulesBefore)
      + applyRules(after, rulesAfter)
      + applyRules(hover, rulesHover)
      + "</style>"
    );
  } else {
    window.requestAnimationFrame(addPseudoStyle);
  }
})();

/////////////////////////////////////////////////////////
/// SIDE BUTTONS FOR NEXT OR PREVIOUS CHAPTERS NAVIGATION
/////////////////////////////////////////////////////////

var moveInt, left;
function listenBtnEvents(e, btn, originLeft) {
  var backToOrigin = function() {
    clearInterval(moveInt);
    moveInt = setInterval(function() {
      if(left > originLeft) {
        btn.style.left = ( left -= 1 ) + 'px';
      } else if(left < originLeft) {
        btn.style.left = ( left += 1 ) + 'px';
      }
      if(left === originLeft) { clearInterval(moveInt); }
    }, 40);
  };

  var boxObj = (btn == window.btnNext ? window.btnNextBox : window.btnPreviousBox);

  boxObj.addEventListener(e, function(){
    if(e.indexOf('enter') !== -1){
      if(left && left !== originLeft) { backToOrigin(); }
      clearInterval(moveInt);
      left = originLeft;
      moveInt = setInterval(function() {
        if(btn == window.btnNext) {
          btn.style.left = (left += 1) + 'px';
          if(left === Math.floor((originLeft * 2) + (originLeft / 3))) {
            left = originLeft - (originLeft * 2);
          }
        } else if(btn == window.btnPrevious) {
          btn.style.left = (left -= 1) + 'px';
          if(left == originLeft - (originLeft * 2)) {
            left = Math.floor((originLeft * 3) + (originLeft / 2));
          }
        }
      }, 40);
    }
    if(e.indexOf('leave') !== -1){
      backToOrigin();
    }
  });
}

function keyToUrl(key, url) {
  document.addEventListener('keydown', function() {
    if (window.event.keyCode === key) { window.location = url; }
  });
}

//

var sideBtnBoxBorderWidth = 2,
    sideBtnBoxSides = 36;

var sideBtnBoxStyle = {
  top: Math.floor(window.innerHeight / 2) + 'px',
  height: sideBtnBoxSides + 'px',
  width: sideBtnBoxSides + 'px',
  border: sideBtnBoxBorderWidth + 'px solid #222',
  borderRadius: '50%'
};

var sideBtnStyle = { position: 'absolute', top: Math.floor((sideBtnBoxSides / 2) - (arrowHeight / 2)) + 'px' };

var btnFunc = function(o) {
  if(document.getElementsByClassName('btn' + o)[1]) {
    var src = document.getElementsByClassName('btn' + o)[1].parentNode.href;

    window['btn' + o + 'Box'] = document.createElement('a');
    setAttributes(window['btn' + o + 'Box'], {
      id: (o.toLowerCase() + '_button_box'),
      class: 'button_box',
      href: src
    });
    Object.assign(window['btn' + o + 'Box'].style, btnBoxStyle, sideBtnBoxStyle,
    (o == 'Next' ? { right: '5px' } : { left: '5px' }));
    document.body.insertBefore(window['btn' + o + 'Box'], document.body.lastElementChild);

    window['btn' + o] = document.createElement('div');
    setAttributes(window['btn' + o], { id: (o.toLowerCase() + "_button"), class: "side_btn" });
    window['btn' + o + 'Box'].insertBefore(window['btn' + o], window['btn' + o + 'Box'].lastElementChild);

    Object.assign(window['btn' + o].style, btnStyle, sideBtnStyle,
      (o == 'Next' ?
        { left: Math.floor(((sideBtnBoxSides + sideBtnBoxBorderWidth - arrowWidth) / 2) + sideBtnBoxBorderWidth) + 'px' } :
        { transform: 'rotate(180deg)', left: Math.floor(((sideBtnBoxSides - arrowWidth) / 2) - sideBtnBoxBorderWidth) + 'px' }
      )
    );

    for (var i = 0; i < events.length; i++) {
      listenBtnEvents(events[i], window['btn' + o], parseInt(window['btn' + o].style.left, 10));
    }

    keyToUrl((o === 'Next' ? 39 : 37), src);
  } else {
    window.requestAnimationFrame(function() { btnFunc(o); });
  }
};

btnFunc('Previous');
btnFunc('Next');

///////////////////////////
//////// TOPBUTTON ////////
///////////////////////////

var topBtn, topBtnBox;
var topBBHeight = 18;

(function topBtnInit(){
  if (!document.body) {
    window.requestAnimationFrame(topBtnInit);
  } else {
    topBtnBox = document.body.insertBefore(document.createElement('div'), document.body.lastElementChild);
    setAttributes(topBtnBox, { id: 'top_button_box', class: 'button_box' });
    Object.assign(topBtnBox.style, btnBoxStyle, {
      bottom: (window.scrollY >= 3e2 ? '0' : (-topBBHeight + 'px')),
      right: '0',
      left: '0',
      height: topBBHeight + 'px',
      borderTop: '1px solid #222'
    });

    topBtn = topBtnBox.insertBefore(document.createElement('div'), topBtnBox.lastElementChild);
    setAttributes(topBtn, { id: "top_button", class: "side_btn" });
    Object.assign(topBtn.style, btnStyle, { position: 'absolute', top: '-1px', right: '50%', left: '50%', transition: 'top 0.4s ease-out', transform: 'rotate(-90deg)' });

    window.addEventListener('scroll', function() {
      if(window.scrollY >= 3e2){
        topBtnBox.style.bottom = '0';
      } else {
        topBtnBox.style.bottom = (-topBBHeight + 'px');
      }
    });
  }
})();

function scrollTo(element, to, duration) {
  if (duration <= 0) { return; }
  var difference = to - element.scrollTop;
  var perTick = difference / duration * 10;

  setTimeout(function() {
    element.scrollTop += perTick;
    if (element.scrollTop == to) { return; }
    scrollTo(element, to, duration - 10);
  }, 10);
}

function scrollUp() {
  scrollTo(document.body, 0, 600);
}

function listenTopEvents(e) {
  var alpha;
  topBtnBox.addEventListener(e, function(){
    if(e.indexOf('enter') !== -1){ topBBHeight = 36; alpha = 0.6; }
    if(e.indexOf('leave') !== -1){ topBBHeight = 18; alpha = 0.4; }
    Object.assign(topBtnBox.style, { backgroundColor: 'rgba(0, 0, 0, ' + alpha + ')', height: topBBHeight + 'px' });
    topBtn.style.top = Math.floor((topBBHeight / 2) - (topBtn.clientHeight / 2)) + 'px';
  });
}

(function topBtnWait(){
  if (topBtnBox && (typeof (topBtnBox) !== 'undefined')) {
    topBtnBox.addEventListener("click", scrollUp);
    for (var i in events) { if(i) { listenTopEvents(events[i]); } }
  } else {
    window.requestAnimationFrame(topBtnWait);
  }
})();

///////////////////////////////////////////////////////
////////////// BOOKMARK and MARK AS READ //////////////
///////////////////////////////////////////////////////

document.addEventListener('readystatechange', function() {
  if(document.readyState === 'complete'
  && document.title.indexOf('Read manga') !== -1) {
    var mName = (function(){
      var name;
      for (var i = 0, y = document.getElementById('navsubbar').lastElementChild.lastElementChild.innerHTML.split('\n'); i < y.length; i++) {
        if(y[i].includes("Manga")) { name = y[i + 1]; break; }
      }

      return name.trim();
    })();
    // this is madness!

    var mangaID = document.getElementById('divBookmark').lastElementChild.innerHTML.split("mangaID=")[1].split("\"")[0];
    // madness?....THIS. IS. KISSMANGA!!!

    var bookmarked = 0;
    var getStatus = function(url, n) {
      var req = new XMLHttpRequest();
      req.open('GET', url, true);
      req.onload = function() {
        if(req.status === 200) { bookmarked = (req.responseText.indexOf(n) !== -1); }
        if(req.status === 503) { setTimeout(function(){ getStatus(url, n); }, 2e4); }
      };
      req.send();
    };

    var bookmarkPage = "http://kissmanga.com/BookmarkList";
    getStatus(bookmarkPage, mName);

    var readStatus = null,
        readID = null;
    var getReadStatus = function() {
      var req = new XMLHttpRequest();
      var url = '/CheckBookmarkStatus';
      var params = 'mangaID=' + mangaID;
      req.open("POST", url, true);
      req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
      req.onload = function() {
        readStatus = req.responseText.split('|')[0];
        readID = req.responseText.split('|')[1];
      };
      req.send(params);
    };

    getReadStatus();

    (function getBookmarks(){
      if(bookmarked === 0){
        window.requestAnimationFrame(getBookmarks);
      } else {
        var fav = document.body.insertBefore(document.createElement('div'), document.body.lastElementChild);
        fav.innerHTML = '\u2605';
        setAttributes(fav, {
          id: 'star_fav',
          class: 'top_menu_btn',
          title: (bookmarked ? 'Unb' : 'B') + 'ookmark ' + mName
        });
        Object.assign(fav.style, {
          display: 'block',
          position: 'fixed',
          top: '5px',
          right: '15px',
          padding: '0 1px 2px',
          font: 'normal 20px/16.66px Arial, sans-serif',
          color: (bookmarked ? 'gold' : '#fff'),
          cursor: 'pointer',
          transition: 'all 0.8s ease-in-out, transform 2s linear'
        });

        var toBookmark = function(id, act) {
          var req = new XMLHttpRequest();
          req.open('POST', '/Bookmark/' + id + '/' + act, true);
          req.onloadend = function() { getStatus(bookmarkPage, mName); getReadStatus(); };
          req.send();
        };

        var scaleFunc = function(nod, unary, func) {
          var min, max, point, time;
          if(unary === '+') { min = 0; max = 1; point = 0.1; time = 5e1; }
          if(unary === '-') { min = 1; max = 0; point = 0.1; time = 250; }
          var val = min;
          var evaluation = function(m, p, u){ return eval(m + u + p); };
          var assigner = setInterval(function(){
            val = Math.round((evaluation(val, point, unary)) * 1e2) / 1e2;
            nod.style.transform = 'scale(' + val + ')';
            if(val === max) {
              clearInterval(assigner);
              if(func) { func(); }
            }
          }, time);
        };

        var readBtn;

        var readBtnInit = function() {
          getReadStatus();
          var markAsRead = function() {
            var req = new XMLHttpRequest();
            var url = '/Bookmark/MarkBookmarkDetail';
            var params = "bdid=" + readID + "&strAlreadyRead=1";
            req.open("POST", url, true);
            req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            req.onloadend = function() { getReadStatus(); };
            req.send(params);
          };

          (function waitStatus(){
            if(readStatus === null) {
              window.requestAnimationFrame(waitStatus);
            } else {
              readBtn = document.body.insertBefore(document.createElement('div'), document.body.lastElementChild);
              readBtn.innerHTML = '\u2714';
              setAttributes(readBtn, {
                id: 'mark_read',
                class: 'top_menu_btn',
                title: 'Mark as read'
              });
              Object.assign(readBtn.style, {
                display: 'block',
                position: 'fixed',
                top: '5px',
                right: '35px',
                padding: '0 1px 2px',
                font: 'normal 20px/16.66px Arial, sans-serif',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.8s ease-in-out',
                transform: 'scale(0)'
              });

              readBtn.addEventListener('click', function() {
                markAsRead();
                Object.assign(readBtn.style, { color: 'green', cursor: 'not-allowed' });
                setAttributes(readBtn, { title: 'Already marked as read.', disabled: 'disabled' });
              });

              scaleFunc(readBtn, '+');
            }
          })();
        };

        fav.addEventListener('click', function() {
          var cacheBM = bookmarked;
          toBookmark(mangaID, (bookmarked ? 'remove' : 'add'));
          var t = 0,
          rotate = setInterval(function(){
            fav.style.transform = 'rotate(' + (t += 360) + 'deg)';
          }, 2e3);
          (function changeIcon(){
            if(cacheBM === bookmarked){
              window.requestAnimationFrame(changeIcon);
            } else {
              clearInterval(rotate);
              fav.setAttribute('title', (bookmarked ? 'Unb' : 'B') + 'ookmark ' + mName);
              fav.style.color = (bookmarked ? 'gold' : '#fff');
              fav.style.transform = null;
              if(bookmarked) {
                readBtnInit();
              } else {
                if(readBtn && document.getElementById('mark_read')) {
                  scaleFunc(readBtn, '-', function() { readBtn.parentNode.removeChild(readBtn); });
                }
              }
            }
          })();
        });

        var hoverStar = function(e) {
          fav.addEventListener(e, function(){
            fav.style.color = ((e.indexOf('enter') !== -1 ? bookmarked ? '#fff' : 'gold' : bookmarked ? 'gold' : '#fff'));
          });
        };
        for (var i in events) { if(i) { hoverStar(events[i]); } }

        (function readBtnLoad(){
          if(readStatus === null) {
            window.requestAnimationFrame(readBtnLoad);
          } else if(bookmarked && readStatus === 'false') {
            readBtnInit();
          }
        })();
      }
    })();
  }
});
