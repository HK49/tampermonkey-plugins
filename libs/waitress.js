// call: waitress("#main", { fontSize: "20px" }, function(){});
// or: waitress("p", addIndent()); ...etc...
var waitress = function(master, job, support) {
  // waits for master(s) then does job and if support does supportive function once

  if(!waitress.started) { waitress.started = {}; }

  var hyphenize = function(prop) {
    // converts fontSize into font-size etc
    return prop.replace(/[A-Z]/g, function(m, o) { return (o ? '-' : '') + m.toLowerCase(); });
  };


  waitress.style = function(obj, parent, tagname) {
  // adds <style> tag into parent or head with obj key as node(s) and vals as css

  if(!waitress.style.reattach) { waitress.style.reattach = {}; }

    Object.keys(obj).forEach(function(node, id) {
      var css = Object.values(obj)[id];

      // create new style tag or get existant (by the first key in hash)
      var tag, assign = function() {
        return document.getElementsByName(tagname || (Object.keys(obj)[0] + "_style"))[0];
      };
      if(!assign()) {
        tag = document.createElement('style');
        (parent && parent.insertBefore(tag, parent.lastElementChild))
        || document.head.insertBefore(tag, document.head.lastElementChild);
        tag.setAttribute("name", tagname || (Object.keys(obj)[0] + "_style"));
      } else {
        tag = assign();
      }

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
          if(node === arr[i].split(/{|}/)[0].trim()) {
            rulesArray = rulesArray.concat(arr[i].split(/{|}/)[1].trim().split(';').filter(String));
            arr.splice(i, 1);
          }
        }
        // clean whitespaces
        for(i = 0; i < rulesArray.length; i++) { rulesArray[i] = rulesArray[i].trim(); }
        // delete old rules with the same key as new rules, but leave other intact
        Object.keys(css).forEach(function(key) {
          for(i = 0; i < rulesArray.length; i++) {
            if(rulesArray[i].split(':')[0] === hyphenize(String(key))) {
              rulesArray.splice(i, 1);
            }
          }
        });
        // add back what is left (aka delete rules with the same key as in 'css' object)
        if(rulesArray.length > 0) {
          tag.innerText = arr.join('\n') + '\n' + node + ' {\n\t' + rulesArray.join(';\n\t') + '\n}';
        } else {
          tag.innerText = arr.join('\n');
        }
      };

      var tagRules = tag.innerText.replace(/}/g, '}___').split('___').filter(String);
      // not foolproof. what if there is rule with "}" inside? for instance content: '}'?

      // if style tag has rules check if they don't overlap with new ones and remove if yes
      if(tagRules.length) { rebuild(tagRules); }

      // add new rules
      tag.innerText += structurize(node.toString(), css);

      if(!waitress.style.reattach[obj]) {
        waitress.style.reattach[obj] = function(t) {
          return function(){ t.parentNode.appendChild(t, t.parentNode.lastElementChild); };
        }(tag);
        document.addEventListener('DOMContentLoaded', waitress.style.reattach[obj]);
      } else {
        document.removeEventListener('DOMContentLoaded', waitress.style.reattach[obj]);
      }
    });
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
    typeof job === "function" ? job() : (typeof (actor) === "function") ? actor() : propr();
    if(support && !waitress.supported) { support(); waitress.supported = true; }
  };


  waitress.wait = function(one) {
    if(!waitress.started[one]) { waitress.started[one] = Date.now(); }
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
        var dict = {}; dict[one] = job;
        waitress.act(function() { waitress.style(dict); });
        break;
      case (one.startsWith('#', 0) && !!document.getElementById(clean)):
        waitress.act(document.getElementById(one.substr(1)));
        break;
      case ((Date.now() - waitress.started[one]) > 4e4):
        window.console.warn("waitress on " + one + " took more then 40s. Exiting.");
        break;
      default:
        return window.requestAnimationFrame(function() { waitress(one, job, support); });
    }
  };

  // do nothing if no master  and job specified
  if(!master && !job) { return null; }

  var sortie = (master instanceof Array) ? master : master.split(/\s?,\s?/);

  // only two types of job could be done: styling and function
  if((/object|function/).test(typeof job)) {
    sortie.forEach(function(node){ waitress.wait(node); });
  } else {
    window.console.warn("waitress function second argument is unknown");
  }
};

// init
waitress();
