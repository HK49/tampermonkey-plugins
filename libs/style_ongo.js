var style = function(ident, css, func) {
// function waits for dom to appear on page then apply css rule or exec func

  style.tag = function(parent, name) {
    // this function operates with <style> tags. applies to ident as class or tag

    var assign = function() { return document.getElementsByName(name + "_style")[0]; };
    if(!assign()) { parent.insertAdjacentHTML('beforeend', "<style name='" + name + "_style'></style>"); }
    // create new style tag or get existant
    var tag = assign();

    var hyphenize = function(prop) {
      // converts fontSize into font-size etc
      return prop.replace(/[A-Z]/g, function(m, o) { return (o ? '-' : '') + m.toLowerCase(); });
    };

    var structurize = function(el, rules) {
      var joint = '', last = Object.keys(rules)[Object.keys(rules).length - 1];
      // construct css rule (aka #foo{bar: baz;}) from styler('#foo', { bar: 'baz' });
      for (var i in rules) {
        if (!rules.hasOwnProperty(i)) { continue; }
        var key = hyphenize(String(i)), value = String(rules[i]);
        joint += key + ':' + ' ' + value + (i == last ? '' : ';');
      }

      return (el + '{' + joint + '}');
    };

    var rebuild = function(arr) {
      var rulesArray = [], i = 0;
      // operate only rules in tag with the same identifier|classifier as function ident
      for(i = arr.length - 1; i >= 0; i--) {
        if(name === arr[i].split(/{|}/)[0]) {
          rulesArray = rulesArray.concat(arr[i].split(/{|}/)[1].split(/;/).filter(String));
          arr.splice(i, 1);
        }
      }
      // clean whitespaces
      for(i = 0; i < rulesArray.length; i++) { rulesArray[i] = rulesArray[i].trim(); }
      // delete old rules with the same key as new rules, but leave other intact
      for(var key in css) {
        if (!css.hasOwnProperty(key)) { continue; }
        for(i = 0; i < rulesArray.length; i++) {
          if(rulesArray[i].includes(hyphenize(String(key)))) {
            rulesArray.splice(i, 1);
          }
        }
      }
      // add back what is left (aka delete rules with the same key as in 'css' object)
      tag.innerText = arr.join('') + name + '{' + rulesArray.join(';') + '}';
    };

    var tagRules = tag.innerText.replace(/}/g, '}___').split('___').filter(String);
    // if style tag has rules check if they don't overlap with new ones
    if(tagRules.length > 0) { rebuild(tagRules); }

    // add new rules
    tag.innerText += structurize(name.toString(), css);
  };

  style.ongo = function(name) {
    if(((/(:before|:after)$/.test(name))
      && ((name.split(/(:before|:after)$/)[0].startsWith('.', 0)
        && document.getElementsByClassName(name.substr(1).split(/(:before|:after)$/)[0])[0])
      || (name.split(/(:before|:after)$/)[0].startsWith('#', 0)
        && document.getElementById(name.substr(1).split(/(:before|:after)$/)[0]))
      || (/^[a-z]/.test(name)
        && document.getElementsByTagName(name.split(/(:before|:after)$/)[0])[0]))
      )
    || ((/^[a-z]/.test(name)) && (name !== "body") && document.getElementsByTagName(name)[0])
    || (name.toString().startsWith('.', 0) && document.getElementsByClassName(name.substr(1))[0])) {
      // scheme: first check type of name then if corresponding elem exists in doc

      if(css) { style.tag(document.head, name); }
      if(func) { func(); }
    } else if(name.toString().startsWith('#', 0) && document.getElementById(name.substr(1))) {
      if(css) { Object.assign(document.getElementById(name.substr(1)).style, css); }
      if(func) { func(); }
    } else if ((name === "body") && document.body) {
      if(css) { Object.assign(document.body.style, css); }
      if(func) { func(); }
    } else {
      setTimeout(function() { style(ident, css, func); }, 100);
    }
  };

  if(ident.split(', ').length > 1) {
    Object.keys(ident.split(', ')).forEach(function(i) { style.ongo(ident.split(', ')[i]); });
  } else {
    style.ongo(ident);
  }
};
