// ==UserScript==
// @name           Style yoraikun
// @description    Change interface on yoraikun.wordpress.com
// @include        https://yoraikun.wordpress.com/*
// @require        http://ajax.googleapis.com/ajax/libs/jquery/2.1.0/jquery.min.js
// @version        0.2.7b
// @grant          GM_addStyle
// @updateURL      https://github.com/HK49/tampermonkey-plugins/raw/stable/yoraikun.js
// @downloadURL    https://github.com/HK49/tampermonkey-plugins/raw/stable/yoraikun.js

// ==/UserScript==
//- The @grant directive is needed to restore the proper sandbox.

var lightBody = 'rgb(221, 221, 221)';
var lightWrapper = 'rgb(225, 225, 225)';
var lightText = 'rgb(51, 51, 51)';
var lightBorderColor = 'rgb(168, 168, 168)';
var lightBorder = '1px solid' + ' ' + lightBorderColor;

var darkBody = 'rgb(51, 51, 51)';
var darkWrapper = 'rgb(47, 47, 47)';
var darkText = 'rgb(187, 187, 187)';
var darkBorderColor = 'rgb(17, 17, 17)';
var darkBorder = '1px solid' + ' ' + darkBorderColor;

var transitionDefault = {'transition': '0.3s all ease'};

//----------------------------------------------------------------------------------------------------------

(function () {
    'use strict';

    var colorBtn = document.createElement("div");
    colorBtn.setAttribute("id", "buttonNight");
    colorBtn.setAttribute("class", "night_button");
    document.body.insertBefore(colorBtn, document.body.firstElementChild);
})();

function nightButton() {
    $('.night_button').html('Light On');
    $('.night_button').css({
        'background-color': darkBody,
        'border': darkBorder,
        'border-radius': '50%',
        'height': '50px',
        'width': '50px',
        'color': darkBorderColor,
        'position': 'fixed',
        'bottom': '75px',
        'right': 'calc(10vw - 35px)',
        'z-index': '9999',
        'line-height': '47px',
        'text-align': 'center',
        'font-family': 'Verdana, serif',
        'font-size': 'smaller',
        'cursor': 'pointer',
        'display': 'block'
    }).css(transitionDefault);

    $('.night_button').click(function(e){
        if($('body').css('background-color') == darkBody){
            e.preventDefault();
            console.log("Tampermonkey: Daytime Theme");
            $('.night_button').html('Light Off');
            $('.night_button').css( { 'background-color': lightBody, 'color': lightBorderColor, 'border': lightBorder } );
            $('body').css( 'background-color', lightBody );
            $('#entry-author-info').css( 'background-color', lightBody );
            $('.commentlist .bypostauthor > div').css( 'background-color', lightBody );
            $('#content textarea').css( { 'color': lightText } );
            $('#content input').css( { 'color': lightText } );
            $('#content').css( { 'color': lightText } );
            $('#wrapper').css( { 'background-color': lightWrapper, 'border': lightBorder } );
            $('#buttonTop').css({'background-color': lightBody, 'border': lightBorder, 'color': lightBorderColor});
        } else {
            e.preventDefault();
            console.log("Tampermonkey: Nighttime Theme");
            $('.night_button').html('Light On');
            $('body').css( 'background-color', darkBody );
            $('#entry-author-info').css( 'background-color', darkBody );
            $('.commentlist .bypostauthor > div').css( 'background-color', darkBody );
            $('#content textarea').css( { 'color': darkText } );
            $('#content input').css( { 'color': darkText } );
            $('#content').css( { 'color': darkText } );
            $('#wrapper').css( { 'background-color': darkWrapper, 'border': darkBorder } );
            $('#buttonTop').css({'background-color': darkBody, 'border': darkBorder, 'color': darkBorderColor});
            $('.night_button').css({ 'background-color': darkBody, 'color': darkBorderColor, 'border': darkBorder });
        }
    });

    $('.night_button').hover(function () {
        if($('body').css('background-color') == darkBody) {
            $('.night_button').css({ 'color': lightBorderColor });
        } else {
            $('.night_button').css({ 'color': darkBorderColor });
        }
    },
    function () {
        if($('body').css('background-color') == darkBody) {
            $('.night_button').css({ 'color': darkBorderColor });
        } else {
            $('.night_button').css({ 'color': lightBorderColor });
        }
    });
}

//----------------------------------------------------------------------------------------------------------

(function () {
    'use strict';

    var topBtn = document.createElement("div");
    topBtn.setAttribute("id", "buttonTop");
    topBtn.setAttribute("class", "top_button");
    document.body.insertBefore(topBtn, document.body.firstElementChild);
})();

function topButton() {
    $('#buttonTop').css({
        'transform': 'rotate(-90deg)',
        'height': '30px',
        'width': '30px',
        'position': 'fixed',
        'bottom': '-50px',
        'right': 'calc(10vw - 26px)',
        'z-index': '9999',
        'cursor': 'pointer',
        'border': darkBorder,
        'border-radius': '50%',
        'background-color': darkBody,
        'color': darkBorderColor,
        'transition': 'all 0.3s ease, bottom 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'backface-visibility': 'hidden',
        'display': 'block'
    });
    if ($('body').css('background-color') == lightBody){
            $('#buttonTop').css({'background-color': lightBody, 'border-color': lightBorderColor, 'color': lightBorderColor});
    } else {
            $('#buttonTop').css({'background-color': darkBody, 'border-color': darkBorderColor, 'color': darkBorderColor});
    }


    var pseudoRules = [
      "content: \"\"",
      "width: 11px",
      "height: 1px",
      "position: absolute",
      "right: 10px",
      "top: 0",
      "bottom: 0",
      "margin: auto 0",
      "box-shadow: inset 0 0 0 32px",
      "transform-origin: right",
      "backface-visibility: hidden"
    ];
    $('head').append(
        "<style>" +
        "#buttonTop::after, #buttonTop::before " +
        "{ " + pseudoRules.join("; ") + "; } " +
        "#buttonTop::after { transform: rotate(-45deg) } " +
        "#buttonTop::before { transform: rotate(45deg) } " +
        "</style>"
      );


    var posMemo = 0;
    var blockJump = false;

    // var posMemoInterval = function(){
    //   var i = 0;
    //   var int = setInterval(function(){
    //     console.log(posMemo);
    //     if(++i===60){
    //       clearInterval(int);
    //       console.info("staph!");
    //     }
    //   }, 1000);
    // };
    // posMemoInterval();

    $(window).scroll( function() {
        if($(window).scrollTop().valueOf() >= 400) {
            // $('#buttonTop').fadeIn(100).show();
            $('#buttonTop').css({ 'bottom': '25px' });
            if(blockJump){ blockJump = false; }
        } else if(
          (posMemo === 0) ||
          (typeof posMemo === "undefined") ||
          (posMemo === 1 && $(window).scrollTop().valueOf() < 400 && blockJump !== true)
          ) {
            $('#buttonTop').css({ 'bottom': '-50px', 'transform': 'rotate(-90deg)' });
            // $('#buttonTop').fadeOut(600);
        }
        if(
          $(window).scrollTop().valueOf() > posMemo &&
          posMemo !== 1 &&
          typeof posMemo !== "undefined"
          ){
            $('#buttonTop').css({ 'transform': 'rotate(-90deg)' });
            posMemo = 1;
        }
    });

    $('#buttonTop').hover(function (){
        if ($('body').css('background-color') == lightBody){
            $('#buttonTop').css({'color': darkBorderColor});
        } else {
            $('#buttonTop').css({'color': lightBorderColor});
        }
    }, function (){
        if ($('body').css('background-color') == lightBody){
            $('#buttonTop').css({'color': lightBorderColor});
        } else {
            $('#buttonTop').css({'color': darkBorderColor});
        }
    });

    $('#buttonTop').on("click", function (){
        if(posMemo >= 400) {
            $('body').animate({ scrollTop: posMemo }, 600);
            blockJump = true;
            posMemo = 1;
        } else {
            posMemo = $(window).scrollTop().valueOf();
            $('body').animate({ scrollTop: 0 }, 600);
            if(blockJump){ blockJump = false; }
        }
        if(posMemo != 1) {
            $('#buttonTop').css({ 'transform': 'rotate(90deg)' });
        } else {
            $('#buttonTop').css({ 'transform': 'rotate(-90deg)' });
        }
    });
}

//----------------------------------------------------------------------------------------------------------

var waitFunc = function(dom, rule){
  if(dom.constructor === Array){
    for(var i = 0; i < dom.length; i++){
      waitFunc(dom[i], rule);
    }
  } else if(dom.constructor === String){
    if (!$(dom).size()) {
      window.requestAnimationFrame(waitFunc);
    } else {
      if (typeof rule !== 'function') {
        jQuery(dom).css({'transition': '0.3s all ease'}).css(rule);
        console.info("Tampermonkey applied rule to \'" + dom.toString() + "\' after it's load.");
      } else {
        rule();
        console.info("Tampermonkey called function \'" + rule.name + "\' after \'" + dom.toString() + "\' load.");
      }
    }
  } else {
    console.error('Tampermonkey: Can\'t proccess waitFunc for ' + dom.toString() + ' and ' + rule.name);
  }
};

(function () {
    $('.dark-theme:not(#wrapper)').css({'background-color': darkBody}).css(transitionDefault);
    $('.dark-theme:not(body)').css({'background-color': darkWrapper}).css(transitionDefault);
})();

//----------------------------------------------------------------------------------------------------------

waitFunc(".night_button", nightButton);
waitFunc(".top_button", topButton);
waitFunc(['#content', '#content input', '#content textarea'], { 'color': darkText, 'font-family': '"Verdana", serif', 'font-size': 'medium' });
waitFunc('#wrapper', {'background-color': darkWrapper, 'border': darkBorder, 'width': '80vw', 'padding': '0'});
waitFunc(['#entry-author-info', '.commentlist .bypostauthor > div', 'body'], {'background-color': darkBody});

//----------------------------------------------------------------------------------------------------------
