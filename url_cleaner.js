// ==UserScript==
// @name         Simple href url cleaner from tracking
// @description  Remove link tracking redirects, link-filter on steam, etc. Will only work if real url is present in href url params
// @version      17.01.19
// @author       HK49
// @license      MIT
// @include      /^https?\:\/\/.+/
// @grant        none
// @run-at       document-idle
// @updateURL    https://github.com/HK49/tampermonkey-plugins/raw/stable/url_cleaner.js
// @downloadURL  https://github.com/HK49/tampermonkey-plugins/raw/stable/url_cleaner.js
// ==/UserScript==
// NB: link-shorteners are out of scope of this script
// Chrome 69+

const logger = function (state, obj = ':C') {
  return; /* turned off */
  switch (state) {
    case "reads": return this("searching for links to operate...");
    case "start": return this("found uri in: %O", obj, '\nurl:', obj.href);
    case "abort": return this("no need to clean");
    case "ended": return this("new uri is:\n%s", obj.href);
    default: return console.warn("logger ran without a state");
  }
}.bind(window.console.log);

async function clean(node) {
  logger("start", node);
  let link = decodeURI(node.href); /* only utf-8 strings */

  if (link.includes("t.umblr.com")) { /* t.umblr.com redirect uri params */
    link = link.replace(/&[tbpm]=.+?(?=&|$)/g, '');
  } /* probably not lonely case; needs further testing and adjustement */

  link = decodeURIComponent(
    link.match(/(?<==)(?:http).+?(?=&\w+?=\1|$)/) /* first http param is probably real url */
  ).replace(/((?<=\?|&)utm.+?(&|$))/g, ''); /* remove utm params */

  if (link.includes(location.host)) { logger("abort"); return; } /* leave sign in/up, etc */

  // cloning node to remove listeners from it | may brake site
  const clone = node.cloneNode(/* with children */true);
  clone.setAttribute("data-cloned", "yes"); /* to  not blow up computer by listener */
  clone.href = link;

  await new Promise(r => setTimeout(r, 60));
  window.requestAnimationFrame(document.replaceChild.bind(node.parentNode, clone, node));

  logger("ended", clone);
}

(async function read() {
  logger("reads");
  new MutationObserver((mutations) => { /* catch any new node after page load */
    mutations.forEach((mutation) => {
      [...mutation.addedNodes].filter(
        n => /^(a|link)$/i.test(String(n.tagName)) && !n.dataset.cloned && /=http/i.test(n.href)
      ).forEach(clean) /* TODO: test on layout trashing */
    })
  }).observe(document.body, { childList: true, subtree: true });

  const array = ['a', 'link'] /* grab all links at loaded page */
    .flatMap(n => [...document.getElementsByTagName(n)])
    .filter(a => /=http/i.test(a.href));

  for (let node of array) await clean(node); /* one at a time */
})();
