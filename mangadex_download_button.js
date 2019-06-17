/* global JSZip */
// ==UserScript==
// @name         Mangadex download script
// @description  Mangadex download button for each chapter
// @version      0.5
// @author       HK49
// @icon         https://i.imgur.com/SMnA427.png
// @license      MIT
// @include      /^https?:\/\/(?:s\d\.)?mangadex\.org/
// @grant        none
// @run-at       document-start
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.2.0/jszip.min.js#sha256=VwkT6wiZwXUbi2b4BOR1i5hw43XMzVsP88kpesvRYfU=
// ==/UserScript==

/* Download button is an arrow left from the eye on chapter row on manga's title page.
 * Progress is shown in chapter row. Can be concurrent.
 *
 * If manga images are stored not on the main server, we can't download them easily
 * because doing so is forbidden. To overcome this, script creates new window context
 * this context(frame) has the same origin as images source. But firstly, to access
 * this new frame we set it's domain to be the same as main domain. As so: */
document.domain = "mangadex.org"; /* we need it on both main domain and subdomain */
/* Then we download images in this new frame. After download fails or succeeds
 * this new frame is deleted. */

(async () => {
  if (!window.location.pathname.startsWith('/title')) return;
  // work only on manga title page, eg: https://mangadex.org/title/0/isekai-harem-yankee-tsundere-bullshit


  const TIME_BETWEEN_REQUESTS = 2000/* miliseconds */;
  // throttle requests to server (so server won't think that it's being under atack)
  // dunno what are settings of mangadex to limit requests per minute/second.
  // do they throttle them serve-side? Probably... so is it a fool errand?


  // TODO: error handling & logging. clean the code
  // TODO: don't download mangasushi credit page gif over 13mb || gifs at all?
  // TODO [optional]: download all chapters at once button
  // TODO: think of something if captcha returns. Just notify user on 404?


  /* there is entry in local storage containing id of chapter and the timestamp
   * of when it was started to download. If the download was discontinued due to
   * error, lost connection, user closing browser, etc then already downloaded
   * images will stay on hard-drive, so they won't be downloaded again.
   * Stored images on hd/ssd/whatever will be deleted on successfull download
   * or after almost a week. */


  async function localStorageTransaction(callback, item = 'downloads') {
    let storage = JSON.parse(localStorage.getItem(item));
    storage = await callback(storage);
    localStorage.setItem(item, JSON.stringify(storage));

    return storage;
  }


  document.addEventListener('DOMContentLoaded', (e) => {
    // create download button in each chapter row
    Array.from(e.target.querySelectorAll('.chapter-row[data-chapter]')).map(row => createBtn(row));

    // create download button for all chapters by language
    createDownloadAllBtn();

    // delete old and forgotten downloads
    const now = Date.now();
    localStorageTransaction(async (dls) => {
      const downloads = ((typeof dls === 'object') && dls) || {};
      function removeOldEntries([id, timestamp]) {
        if (timestamp < now - 6e8) { // almost week old
          indexedDB.deleteDatabase(id); // it will not throw error if there is no db
          delete downloads[id];
        }
      }
      if (dls) {
        Object.entries(downloads).map(removeOldEntries);

        // check if there are somehow databases without timestamp
        const databases = await indexedDB.databases();
        const present = Object.keys(downloads);
        for (const { name } of databases) {
          if (!present.some(n => n === name)) downloads[name] = Date.now();
        }
      }
      return downloads;
    });

    // create completed downloads storage or display to user that he already downloaded chps
    localStorageTransaction(async (store) => {
      if (!store) return [];

      // remove duplicates
      const set = store.reduce((a, i) => void (!a.includes(i) && a.push(i)) || a, []);

      // show in each chapter row if the chapter was previously downloaded
      set.forEach((id) => {
        const bar = createProgressBar(id);
        if (bar) bar.attributeStyleMap.set('right', CSS.px(0));
      });

      return set;
    }, 'completed');
  });


  function createProgressBar(id) {
    const row = document.querySelector(`.chapter-row[data-id="${id}"]`);
    if (!row) return false; // no visible chapter row - then no progressbar

    const bar = document.getElementById(`progressbar${id}`) || document.createElement('div');
    bar.id = `progressbar${id}`;

    const css = bar.attributeStyleMap;
    const rules = new Map([
      ['background-color', 'rgba(23, 162, 184, 0.5)'],
      ['z-index', -1],
      ['position', 'absolute'],
      ['top', 0],
      ['bottom', 0],
      ['left', 0],
      ['right', CSS.percent(100)],
    ]);
    for (const [prop, val] of rules) css.set(prop, val);

    row.parentNode.appendChild(bar); // chapter row

    return bar;
  }


  // display download progress in chapter row
  const progress = {
    initiate: (chapterID) => {
      // progrssbar
      const bar = createProgressBar(chapterID);
      if (!bar) return;

      progress[chapterID] = { bar, css: bar.attributeStyleMap };
    },
    start: (id, len) => {
      if (!progress[id]) return;
      // 100% / (pages quantity * (load + save) + zip)
      progress[id].tick = CSS.percent(100 / ((len * 2) + 10));

      // create new time stamp for current download
      localStorageTransaction((dls) => { dls[id] = Date.now(); return dls; });
    },
    update: (id) => {
      if (!progress[id]) return;
      progress[id].css.set('right', progress[id].css.get('right').sub(progress[id].tick));
    },
    remove: (id) => {
      if (!progress[id]) return;
      delete progress[id];
      if (window.frames[`frame${id}`]) {
        document.body.removeChild(document.getElementsByName(`frame${id}`)[0]);
        delete window.frames[`frame${id}`];
      }

      // no more spinning
      if (animateBtn[id]) animateBtn(false, id);
    },
    complete: (id) => {
      if (!progress[id]) return;
      progress[id].css.set('right', 0);
      progress[id].css.set('background-color', 'rgba(40, 167, 69, 0.5)');
      progress.remove(id);
    },
    error: (e, id) => {
      window.console.error(e);
      if (!progress[id]) return;
      progress[id].css.set('right', 0);
      progress[id].css.set('background-color', 'rgba(220, 53, 69, 0.5)');
      progress.remove(id);
    },
  };

  // createbutton and append function to click event
  function createBtn(parent) {
    const { id } = parent.dataset;
    const button = Object.assign(document.createElement("span"), {
      id: `btn${id}`,
      innerText: "\u2B73",
      tabIndex: '0',
      title: `Download chapter`,
      translate: false,
    });
    const css = new Map([
      ['cursor', 'pointer'],
      ['left', CSS.px(3)],
      ['position', 'absolute'],
    ]);
    for (const [prop, val] of css) button.attributeStyleMap.set(prop, val);

    parent.prepend(button);

    ["keyup", "mouseup"].forEach(e => button.addEventListener(e, clickListener));
  }

  function clickListener(event) {
    const [id] = event.target.id.match(/\d+/);
    if (progress[id]) return;
    if ([0, 1].includes(event.button) || [13, 32].includes(event.keyCode)) {
      const button = event.target;
      button.blur();
      progress.initiate(id);
      animateBtn(true, id, button);
      clickFunction(id).catch(err => progress.error(err, id));
    }
  }

  // spin download button or return to normal
  function animateBtn(animate, id, btn = document.getElementById(`btn${id}`)) {
    Object.assign(btn, animate ? {
      innerText: '\u21BB',
      tabIndex: '-1',
    } : {
      innerText: '\u2B73',
      tabIndex: '0',
    });

    const css = btn.attributeStyleMap;
    if (animate) {
      css.set('pointer-events', 'none');

      const rotate = unit => `rotate(${unit}deg) translateZ(0) translate3d(0, 0, 0)`;
      animateBtn[id] = btn.animate([
        { transform: rotate(0) },
        { transform: rotate(360) },
      ], {
        duration: 800,
        iterations: Infinity,
      });
    } else {
      css.set('pointer-events', 'all');
      animateBtn[id].cancel();
    }
  }


  async function clickFunction(id) {
    // retrieve chapter info from api
    const chapter = await chapterInfo(id);
    chapter.id = id;

    const previousDownload = await openDB(chapter);
    // true if db with chapter id is existing, false if created new db
    // needs to get firstly repsonse from openDB promise to understand if it is new db or old one
    // then can we define pages, because idb onsuccess event will fire even when creating new db
    // but even though it will be called, the promise is resolved by onupgradeneeded event


    log(`Starting ${previousDownload ? 'previously unfinished' : 'new'} download.`, '#66D');
    progress.start(id, chapter.pages.length);


    const pages = await pagesToDownload(chapter, previousDownload);
    // retrieve remaining pages from the last errored download or initiate new array to fetch


    const process = (context = this) => download.bind(context, pages, chapter)()
      .then(_ => generateZip(chapter));


    if (chapter.src.host.match(/^mangadex/)) {
      process();
      return;
    }

    // if images are stored on subdomain - create frame on their origin
    log(`Images are stored on subdomain: ${chapter.src.origin}`, '#66D');
    document.body.appendChild(Object.assign(document.createElement('iframe'), {
      height: 0,
      hidden: true,
      name: `frame${id}`,
      onload: e => process(window.frames[e.target.name].window),
      src: chapter.src.origin,
      style: 'display: none;',
      tabIndex: '-1',
      translate: false,
      width: 0,
    }));
  }


  // open existing or create new db for chapter download
  function openDB(chapter) { // TODO: clean-up database on browser close||new page load?
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(chapter.id);
      request.onsuccess = (event) => { // opened existant from previous cut-off download
        chapter.db = event.target.result;

        resolve(true);
        /* so the code next can understand whether the db was previously existing(in this resolve),
         * or was newly created(resolve in onupgradeneeded) */
      };

      // it will be called only once because we will never update version
      request.onupgradeneeded = (event) => { // freshly created db.
        chapter.db = event.target.result;

        const createStore = chapter.db.createObjectStore("downloads", { keyPath: "page" });
        createStore.createIndex("buffer", "buffer", { unique: false });
        createStore.createIndex("extension", "extension", { unique: false });

        createStore.transaction.oncomplete = (_) => {
          const store = transaction(chapter.db, "readwrite");
          chapter.pages.map((page, i) => store.add({ // populate db if not existed
            name: (i < 9 ? "00" : i < 99 ? "0" : "") + (i + 1),
            page,
            extension: String(page.match(/(?<=\.)\w{3,4}$/)),
            buffer: 0, // the data to be stored in zip
          }));
          resolve(false);
        };
      };
      request.onerror = e => reject(e);
    });
  }


  async function pagesToDownload(chapter, previousDownload) {
    function cursorOnSaved(saved, cursorCallback) {
      return new Promise((resolve, reject) => {
        const range = IDBKeyRange[saved ? "lowerBound" : "only"](0, true);
        requestIDB(
          transaction(chapter.db).index("buffer").openCursor(range),
          event => cursor(event, data => cursorCallback(data.page), resolve),
          reject,
        );
      });
    }

    if (previousDownload) {
      const toDownload = [];
      await cursorOnSaved(
        true, // update progress according to quantity of already present pages in IDB
        () => {
          progress.update(chapter.id);
          progress.update(chapter.id);
        },
      );
      await cursorOnSaved(
        false, // fetch pages without saved buffer in IDB
        page => toDownload.push(page),
      );
      return toDownload;
    }
    return chapter.pages; // download all pages
  }


  // get info about chapter/manga from api
  const api = (type, id) => {
    const url = new URL('api', window.location.origin);
    const params = url.searchParams;
    params.set('type', type); // (manga|chapter)
    params.set('id', id);
//  params.set('baseURL', '/api');
//  params.set('server', null); // "cloudflare"?

    // const cookies = new Map(document.cookie.split(/;?\s/).map(item => item.split('=')));

    const headers = new Headers({
      // "X-XSRF-TOKEN": cookies.get(/* x-xsrf-cookie? */),
      accept: 'application/json, text/plain;q=0.9',
    });

    const request = new Request(url, {
      headers,
    });

    const recaller = (backoff = 3) => fetch(request).then(async (response) => {
      if (response.ok) return response.text();
      if (backoff > 1) {
        await new Promise(r => setTimeout(r, 1e4 * ~(-5 + backoff)));
        window.console.warn(`${4 - backoff} retry to get API response on ${response.status}`);
        return recaller(backoff - 1);
      }
      throw Error(`${response.status} ${response.statusText}`);
    }).then((text) => {
      try {
        return JSON.parse(text);
      } catch (e) {
        return Promise.reject(Error(`API response was not JSON.\n${e.message}`));
      }
    });
    return recaller();
  };

  // get chapter info from api
  async function chapterInfo(id) {
    const {
      server,
      hash,
      page_array: pages,
      chapter,
      title: name,
    } = await api('chapter', id);
    const pagesPath = new URL(server + hash, window.location.origin);
    const title = `${!isNaN(Number(chapter)) && `Ch.`}${chapter}${name && ` - ${name}`}`;

    return {
      src: pagesPath, // example: https://s6.mangadex.org/data/MumbleBumbleJumbleSymbols
      title, //     example: "Ch.16.2 - The Secret Of The Mark (4)"
      pages, //     ["m1.jpg", "m2.png", "m3.png", "m4.gif", "m5.png", ...]
      // pages: pages.filter(p => !p.endsWith('gif')), // don't download gifs at all?
    };
  }

  async function getChaptersByLanguage() {
    const mangaID = Number(window.location.pathname.match(/(?<=\/title\/)\d+(?=(?:\/|$))/));
    return Object.entries((await api('manga', mangaID)).chapter).reduce((map, [chID, chapter]) => {
      map.set(chapter.lang_code, (map.get(chapter.lang_code) || []).concat(chID));
      return map;
    }, (new Map()));
  }
  async function createDownloadAllBtn() {
    const el = Object.entries({
      group: ['div', 'btn-group'],
      btn: ['button', 'btn btn-primary dropdown-toggle'],
      icon: ['span', 'fas fa-download fa-fw'],
      menu: ['div', 'dropdown-menu'],
      item: ['span', 'dropdown-item'],
      flag: ['span', 'rounded flag'],
    }).reduce((nodes, [key, [tag, classList]]) => {
      nodes[key] = Object.assign(document.createElement(tag), { classList });
      return nodes;
    }, {});
    document.getElementById('upload_button').parentNode.append(el.group);
    el.group.append(el.btn, el.menu);
    el.btn.append(el.icon);

    (await getChaptersByLanguage()).forEach((chapters, lang) => {
      const flag = el.flag.cloneNode();
      const item = el.item.cloneNode();
      flag.classList.add(`flag-${lang}`);
      item.innerText = (() => {
        switch (lang) {
          case 'gb': return 'English';
          case 'ru': return 'Russian';
          case 'es': return 'Spanish';
          case 'tr': return 'Turkish';
          case 'de': return 'German';
          default: return '';
        }
      })();
      item.prepend(flag);
      item.attributeStyleMap.set('cursor', 'pointer');
      item.addEventListener('click', async () => {
        item.blur();
        item.attributeStyleMap.set('background-color', 'grey');
        // TODO archive all in one archive
        const store = await localStorageTransaction((o => o), 'completed');
        chapters.filter(id => !store.includes(id)).map(async (id, i) => {
          await new Promise(r => setTimeout(r, i * 3e4));
          progress.initiate(id);
          return clickFunction(id);
        });
      }, true);
      el.menu.append(item);
      el[lang] = item;
    });

    const group = Object.values(el);
    const listener = (e) => {
      const displayed = el.menu.classList.contains('show');
      if (!group.includes(e.target) && displayed) {
        el.menu.classList.remove('show');
      }
      if (group.includes(e.target) && !displayed) {
        el.menu.classList.add('show');
      }
      if ([el.btn, el.icon].includes(e.target) && displayed) {
        el.menu.classList.remove('show');
      }
    };
    document.body.addEventListener("mousedown", listener, true);
  }


  // load images in main thread, save into IDB in worker,
  // don't wait for save to load next image, but wait for all saves to finish this function
  async function download(pages, chapter) {
    const processed = await pages.reduce(async (register, page) => {
      const queue = await register;
      const image = await load.bind(this, page, chapter)();

      return queue.concat(save(image, chapter));
    }, (async (queue = []) => queue)());
    return Promise.all(processed);
  }


  // to not swarm server with requests
  async function throttle(taskID, task, timeBetweenTasks = TIME_BETWEEN_REQUESTS) {
    if (!throttle.busy) {
      throttle.busy = true;
    } else {
      throttle.tasks = (throttle.tasks || []).concat([[taskID, task]]);
      return new Promise((resolve) => {
        throttle[taskID] = resolve;
      });
    }

    if (Date.now() - (throttle.timestump || 0) < timeBetweenTasks) {
      await new Promise(r => setTimeout(r, timeBetweenTasks - (Date.now() - throttle.timestump)));
    }

    throttle.timestump = Date.now();

    const complete = await task();

    if (throttle[taskID]) throttle[taskID](complete);

    throttle.busy = false;
    if (throttle.tasks && throttle.tasks.length) throttle(...throttle.tasks.pop());
    return complete;
  }


  async function load(page, chapter, attempt = 0) {
    /* avoid cors error by fetching from context with same origin as images server */
    const request = await throttle.bind(
      this,
      `${chapter.id}${page.match(/^\w*?(?=\.)/)}`,
      fetch.bind(this, new URL(`${chapter.src}/${page}`)),
    )();

    let buffer = 0;
    try {
      buffer = await request.arrayBuffer();
    } catch (_) {
      if (request.status === 404 && attempt < 3) {
        await new Promise(r => setTimeout(r, 1e4 + (attempt * 5e3)));
        return load.bind(this, page, chapter, attempt + 1)();
      }
      return Error(`Problem fetching ${request.url}: ${request.status} ${request.statusText}`);
    }

    progress.update(chapter.id);
    return [page, buffer];
  }


  // convert into blob and insert data into db in separate thread
  const worker = new Worker(URL.createObjectURL(new Blob([
    `(${
      (() => {
        function idbRequest(request, succesCall, errorCall = e => e) {
          request.onsuccess = event => succesCall(event);
          request.onerror = error => errorCall(error);
        }
        function idbSave(buffer, id, page) {
          return new Promise((resolve, reject) => {
            idbRequest(indexedDB.open(id), (event) => {
              const storage = event.target.result.transaction("downloads", "readwrite").objectStore("downloads");
              idbRequest(storage.get(page), (e) => {
                const data = e.target.result;
                data.buffer = buffer;
                idbRequest(storage.put(data), () => {
                  event.target.result.close();
                  resolve();
                }, reject);
              }, reject);
            }, reject);
          });
        }

        this.onmessage = (event) => {
          const [
            page,
            chapterID,
            buffer,
          ] = event.data;

          idbSave(buffer, chapterID, page)
            .then(() => postMessage([chapterID, page]))
            .catch(e => Error(e, [chapterID, page]));
        };
        this.onerror = e => console.warn("Worker got error:\n", e);
      })
    })()`
  ], { type: 'application/javascript' })));


  // get response from worker and resolve awaiting promise from Promise.all array of process function
  function rejector() { }
  function resolver() { }
  worker.onmessage = (e) => {
    const [chapterID, page] = e.data;
    progress.update(chapterID);

    resolver[chapterID + page]();
    delete resolver[page];
  };
  worker.onerror = ({ message, lineno }, [chapterID, page]) => {
    window.console.error(`Error from worker: ${message} on line ${lineno}.`);
    rejector[chapterID + page]();
  };


  // convert image into data in separate thread and give way to loading
  function save([page, buffer], chapter) {
    // the promise stored in the Promise.all array in process function
    return new Promise((resolve, reject) => {
      resolver[chapter.id + page] = resolve;
      rejector[chapter.id + page] = reject;

      worker.postMessage([page, chapter.id, buffer], [buffer]);
    });
  }


  async function generateZip(chapter) { // generate and download zip
    const zip = new JSZip();
    let zipSize = 0;

    await new Promise((resolve, reject) => {
      requestIDB(transaction(chapter.db).openCursor(), e => cursor(e, (data) => {
        zip.file(`${data.name}.${data.extension}`, data.buffer);
        zipSize += data.buffer.byteLength;
      }, resolve), reject);
    });

    let int = 0;
    const file = await zip.generateAsync({ type: "blob", streamFiles: true }, (meta) => {
      if ((((meta.percent|0) / 10)|0) > int) { // if meta % is more then 10
        int++; // then update int, so the next comparison will be with 20, after it - 30, etc.
        progress.update(chapter.id); // update progressbar by tick% with each 10% of meta.percent
      }
    });

    const normalisedZipSize = ((k = 1024, kiB = zipSize/k, miB = kiB/k) => {
      return miB < 1 ? `${Math.round(kiB)}kb` : `${miB.toFixed(2)}mb`;
    })();
    log(`generated zip with size of %c${normalisedZipSize}`, '#0A3', 'color: #00F; font-weight: 300;');

    (Object.assign(document.createElement('a'), {
      download: `${document.title.match(/^.+(?=\s\(Title)/)} ${chapter.title}.zip`,
      href: URL.createObjectURL(file),
      type: 'application/zip',
      target: '_blank',
    })).click();
    URL.revokeObjectURL(file);

    progress.complete(chapter.id);
    chapter.db.close(); // remove db on success
    indexedDB.deleteDatabase(chapter.id);
    localStorageTransaction((dls) => { delete dls[chapter.id]; return dls; });
    localStorageTransaction(store => store.concat(chapter.id), 'completed');
  }

  function log(message, color, more = '') {
    return window.console.log(
      `%c ${message}`,
      `color: ${color};`,
      more,
    );
  }

  // IDB shortcuts
  function requestIDB(request, succesCall, errorCall = e => e) {
    request.onsuccess = event => succesCall(event);
    request.onerror = error => errorCall(error);
  }
  function cursor(event, callback, oncomplete = () => {}) {
    const { result } = event.target;
    if (result) {
      callback(result.value);
      result.continue();
    } else {
      oncomplete();
    }
  }
  function transaction(db, mode = 'readonly', store = 'downloads') {
    return db.transaction(store, mode).objectStore(store);
  }
})();
