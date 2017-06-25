function addIndent(texts, indentation) {
  // indent text's first line if paragraph bigger then one line
  // format: addIndent(document.getElementsByTagName('p'), "2%"); second val can be omitted

  var length = function(t) { return ((indentation) || (Math.round(t.offsetWidth / 50) + 'px')); };

  var indent = function(text, val) {
    // get max quantity of symbols in string line
    var letter = text.insertBefore(document.createElement('div'), text.lastElementChild);
    letter.innerText = "a";
    Object.assign(letter.style, { textIndent: '0', position: 'absolute' });
    var maxChars = Math.round(letter.parentNode.offsetWidth / letter.offsetWidth) + 10;
    // if text has no \n and it's text longer then maxChars add indentation
    if(text.innerText.indexOf('\n') === -1 && text.innerText.length > maxChars) {
      text.style.textIndent = val;
    } else {
      text.style.removeProperty('text-indent');
    }
    // delete test subject from paragraph
    letter.parentNode.removeChild(letter);
  };


  if(typeof (texts) === "undefined") {
    if(!addIndent.error) {
      window.console.error("addIndent function was called for non-existant element");
      addIndent.error = true;
    }

    window.requestAnimationFrame(function() { addIndent(texts, indentation); });
  } else if(texts.length > 1) {
    for(var i = 0; i < texts.length; i++) {
      indent(texts[i], length(texts[i]));
    }
  } else {
    indent(texts, length(texts));
  }

  if(!addIndent.listening) {
    window.addEventListener('resize', function() { addIndent(texts, indentation); });
    addIndent.listening = true;
  }
}
