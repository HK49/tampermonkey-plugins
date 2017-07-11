// call: waitress("#main", { fontSize: "20px" }, function(){});
// or: waitress("p", addIndent()); ...etc...
var waitress = function(master, job, support) {
  // wait for master(s) then do job and if support do support once
  var sortie = master.split(/\s?,\s?/);
  var work = (typeof (job) === "function");

  var hyphenize = function(prop) {
    // converts fontSize into font-size etc
    return prop.replace(/[A-Z]/g, function(m, o) { return (o ? '-' : '') + m.toLowerCase(); });
  };

  waitress.style = function(parent, name) {
    // this function operates with <style> tags. applies to masters of kind class or tag

    var assign = function() { return document.getElementsByName(name + "_style")[0]; };
    if(!assign()) { parent.insertAdjacentHTML('beforeend', "<style name='" + name + "_style'></style>"); }
    // create new style tag or get existant
    var tag = assign();

    var structurize = function(el, rules) {
      var joint = '', last = Object.keys(rules)[Object.keys(rules).length - 1];
      // construct css rule (aka #foo{bar: baz;}) from waitress('#foo', { bar: 'baz' });
      for (var i in rules) {
        if (!rules.hasOwnProperty(i)) { continue; }
        var key = hyphenize(String(i)), value = String(rules[i]);
        joint += '\n\t' + key + ': ' + value + (i == last ? '' : '; ');
      }

      return (el + ' {' + joint + '\n}');
    };

    var rebuild = function(arr) {
      var rulesArray = [], i = 0;
      // operate only rules in tag with the same identifier|classifier as waitress.style "name" var
      for(i = arr.length - 1; i >= 0; i--) {
        if(name === arr[i].split(/{|}/)[0].trim()) {
          rulesArray = rulesArray.concat(arr[i].split(/{|}/)[1].trim().split(';').filter(String));
          arr.splice(i, 1);
        }
      }
      // clean whitespaces
      for(i = 0; i < rulesArray.length; i++) { rulesArray[i] = rulesArray[i].trim(); }
      // delete old rules with the same key as new rules, but leave other intact
      Object.keys(job).forEach(function(key) {
        for(i = 0; i < rulesArray.length; i++) {
          if(rulesArray[i].split(':')[0] === hyphenize(String(key))) {
            rulesArray.splice(i, 1);
          }
        }
      });
      // add back what is left (aka delete rules with the same key as in 'css' object)
      if(rulesArray.length > 0) {
        tag.innerText = arr.join('\n') + '\n' + name + ' {\n\t' + rulesArray.join(';\n\t') + '\n}';
      } else {
        tag.innerText = "";
        // but if nothing is left, then leave this style tag empty
      }
    };

    var tagRules = tag.innerText.replace(/}/g, '}___').split('___').filter(String);
    // if style tag has rules check if they don't overlap with new ones and remove if yes
    if(tagRules.length > 0) { rebuild(tagRules); }

    // add new rules
    tag.innerText += structurize(name.toString(), job);
  };


  waitress.act = function(actor) {
    var propr = function() {
      Object.keys(job).forEach(function(key, id) {
        var value = Object.values(job)[id].replace(/\s?!i/, '\s\v\v!i').split('\s\v\v').filter(String);
        actor.style.setProperty(
          hyphenize(String(key)),
          value[0],
          (value[1] ? value[1].substr(1) : '')
        );
      });
    };
    work ? job() : (typeof (actor) === "function") ? actor() : propr();
    if(support && !waitress.supported) { support(); waitress.supported = true; }
  };


  waitress.wait = function(one) {
    var regex = /(:link|:visited|:hover|:active|:?:before|:?:after)$/;
    var clean = one;
    while(regex.test(clean)) { clean = clean.split(regex)[0]; }
    while(/^(#|\.)/.test(clean)) { clean = clean.substr(1); }
    switch(true) {
      case((/^\w+\[.+\]$/).test(clean) && !regex.test(one) && !!document.querySelector(clean)):
        for(var q = 0; q < document.querySelectorAll(clean).length; q++) {
          waitress.act(document.querySelectorAll(clean)[q]);
          ///TODO document.querySelectorAll(clean)[q] can be not loaded before loop 'cause we wait only first
        }
        break;
      case ((one === "body") && (one === clean) && !!document.body):
        waitress.act(document.body);
        break;
      case (regex.test(one)):
        // fall through
      case (one.startsWith('.', 0) && !!document.getElementsByClassName(clean)[0]):
        // fall through
      case ((/^[a-z]/.test(one)) && !!document.getElementsByTagName(clean)[0]):
        waitress.act(function() { waitress.style(document.head, one); });
        break;
      case (one.startsWith('#', 0) && !!document.getElementById(clean)):
        waitress.act(document.getElementById(one.substr(1)));
        break;
      default:
        window.requestAnimationFrame(function() { waitress(one, job, support); });
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
