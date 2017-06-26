// call: waitress("#main", { fontSize: "20px" }, function(){});
// or: waitress("p", addIndent()); ...etc...
var waitress = function(master, job, support) {
  // wait for master(s) then do job and if support do support once
  var sortie = master.split(', ');
  var work = (typeof (job) === "function");


  waitress.style = function(parent, name) {
    // this function operates with <style> tags. applies to masters of kind class or tag

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
      // construct css rule (aka #foo{bar: baz;}) from waitress('#foo', { bar: 'baz' });
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
      Object.keys(job).forEach(function(key) {
        for(i = 0; i < rulesArray.length; i++) {
          if(rulesArray[i].includes(hyphenize(String(key)))) {
            rulesArray.splice(i, 1);
          }
        }
      });
      // add back what is left (aka delete rules with the same key as in 'css' object)
      tag.innerText = arr.join('') + name + '{' + rulesArray.join(';') + '}';
    };

    var tagRules = tag.innerText.replace(/}/g, '}___').split('___').filter(String);
    // if style tag has rules check if they don't overlap with new ones
    if(tagRules.length > 0) { rebuild(tagRules); }

    // add new rules
    tag.innerText += structurize(name.toString(), job);
  };

  waitress.act = function(action) {
    if(work) { job(); }
    if(!work) { action(); }
    if(support && !waitress.supported) { support(); waitress.supported = true; }
  };


  waitress.wait = function(one) {
    if(((/(:before|:after)$/.test(one))
      && ((one.split(/(:before|:after)$/)[0].startsWith('.', 0)
        && document.getElementsByClassName(one.substr(1).split(/(:before|:after)$/)[0])[0])
      || (one.split(/(:before|:after)$/)[0].startsWith('#', 0)
        && document.getElementById(one.substr(1).split(/(:before|:after)$/)[0]))
      || (/^[a-z]/.test(one)
        && document.getElementsByTagName(one.split(/(:before|:after)$/)[0])[0]))
      )
    || ((/^[a-z]/.test(one)) && (one !== "body") && document.getElementsByTagName(one)[0])
    || (one.toString().startsWith('.', 0) && document.getElementsByClassName(one.substr(1))[0])) {
      // scheme: first check type of name then if corresponding elem exists in doc

      waitress.act(function() { waitress.style(document.head, one); });
    } else if(one.toString().startsWith('#', 0) && document.getElementById(one.substr(1))) {
      waitress.act(function() { Object.assign(document.getElementById(one.substr(1)).style, job); });
    } else if ((one === "body") && document.body) {
      waitress.act(function() { Object.assign(document.body.style, job); });
    } else {
      requestAnimationFrame(function() { waitress(one, job, support); });
    }
  };

  // only two types of job could be done: styling and function
  if(["object", "function"].includes(typeof (job))) {
    for(var i = 0; i < sortie.length; i++) {
      waitress.wait(sortie[i]);
    }
  } else {
    window.console.info("waitress function job is unknown.");
  }
};
