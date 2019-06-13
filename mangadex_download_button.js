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


  const TIME_BETWEEN_REQUESTS = 1000/* miliseconds */;
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


  async function localStorageTransaction(callback) {
    let downloads = JSON.parse(localStorage.getItem('downloads'));
    downloads = await callback(downloads);
    localStorage.setItem('downloads', JSON.stringify(downloads));
  }


  // create download button in each chapter row
  document.addEventListener('DOMContentLoaded', (e) => {
    Array.from(e.target.querySelectorAll('.chapter-row[data-chapter]')).map(row => createBtn(row));

    // animation for btn on click
    const transform = deg => `transform: rotate(${deg}deg) translateZ(0) translate3d(0, 0, 0)`;
    document.head.appendChild((Object.assign(document.createElement('style'), {
      innerText: `@keyframes tako { 0% { ${transform(0)}; } 100% { ${transform(360)}; } }`,
    })));

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
  });


  // createbutton and append function to click event
  function createBtn(parent) {
    const { id } = parent.dataset;
    parent.prepend(Object.assign(document.createElement("span"), {
      id: `btn${id}`,
      innerText: "\u2B73",
      onclick: clickFunction.bind(this, id),
      style: "cursor: pointer; position: absolute; left: 3px;",
      tabIndex: '0',
      title: `Download chapter`,
      translate: false,
    }));
  }

  // spin download button or return to normal
  function animateBtn(b, id, btn = document.getElementById(`btn${id}`)) {
    btn.innerText = b ? '\u21BB' : '\u2B73';
    btn.style.animation = b ? 'tako 500ms 0s linear infinite' : null;
    btn.style.pointerEvents = b ? 'none' : 'all';
  }


  // display download progress in chapter row
  const progress = {
    initiate: (chapterID) => {
      // progrssbar
      const bar = document.getElementById(`progressbar${chapterID}`) || document.createElement('div');
      bar.id = `progressbar${chapterID}`;
      bar.style = 'background: rgba(23, 162, 184, 0.5); z-index: -1; position: absolute; top: 0; bottom: 0; left: 0;';
      bar.style.right = "100%"; // reduces with each tick
      document.querySelector(`.chapter-row[data-id="${chapterID}"]`).parentNode.appendChild(bar); // chapter row

      // make download button spin
      animateBtn(true, chapterID);
    },
    start: (id, imgQuantity) => {
      progress[id] = {
        bar: document.getElementById(`progressbar${id}`),
        countdown: 100, // == bar.style.right
        tick: 100 / ((imgQuantity * 2) + 10), // 100% / (imgs quantity * (load + save image) + zip)
      };

      // create new time stamp for current download
      localStorageTransaction((dls) => { dls[id] = Date.now(); return dls; });
    },
    update: (id) => {
      progress[id].countdown -= progress[id].tick;
      progress[id].bar.style.right = `${Math.round(progress[id].countdown)}%`;
    },
    remove: (id) => {
      if (typeof progress[id] !== typeof void 0) delete progress[id];
      if (window.frames[`frame${id}`]) {
        document.body.removeChild(document.getElementsByName(`frame${id}`)[0]);
        delete window.frames[`frame${id}`];
      }

      // no more spinning
      animateBtn(false, id);
    },
    complete: (id) => {
      progress[id].bar.style.right = "0";
      progress[id].bar.style.background = "rgba(40, 167, 69, 0.5)";
      progress.remove(id);
    },
    error: (e, id) => {
      window.console.error(e);
      if (!progress[id]) return;
      progress[id].bar.style.right = "0";
      progress[id].bar.style.background = "rgba(220, 53, 69, 0.5)";
      progress.remove(id);
    },
  };


  // download chapter, duh
  async function clickFunction(id) {
    progress.initiate(id);


    // retrieve chapter info from api
    const chapter = await chapterInfo(id).catch(e => progress.error(e, id));
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
      .then(_ => generateZip(chapter))
      .catch(err => progress.error(err, id));


    let url = '';
    try {
      url = new URL(`${chapter.src}`);
    } catch (e) {
      if (e.message.startsWith("Failed to construct 'URL'")) {
        return process();
      }
    }

    // if images are stored on subdomain - create frame on their origin
    log(`Images are stored on subdomain: ${url.origin}`, '#66D');
    document.body.appendChild(Object.assign(document.createElement('iframe'), {
      height: 0,
      hidden: true,
      name: `frame${id}`,
      onload: e => process(window.frames[e.target.name].window),
      src: url.origin,
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
        /*
         * so the code next can understand whether the db was previously existing(in this resolve),
         * or was newly created(resolve in onupgradeneeded)
        */
      };

      // it will be called only once because we will never update version
      request.onupgradeneeded = (event) => { // freshly created db.
        chapter.db = event.target.result;

        const createStore = chapter.db.createObjectStore("downloads", { keyPath: "page" });
        createStore.createIndex("id", "id", { unique: true });
        createStore.createIndex("buffer", "buffer", { unique: false });
        createStore.createIndex("extension", "extension", { unique: false });

        createStore.transaction.oncomplete = (_) => {
          const store = transaction(chapter.db, "readwrite");
          chapter.pages.map((page, i) => store.add({ // populate db if not existed
            id: i,
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
        Promise.reject(Error("API response was not JSON."));
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
    const link = `${server + hash}/`; // link + page from page_array = link to image
    const title = `${!isNaN(Number(chapter)) && `Ch.`}${chapter}${name && ` - ${name}`}`;

    return {
      src: link, // example: https://s6.mangadex.org/data/MumbleBumbleJumbleSymbols/
      title, //     example: "Ch.16.2 - The Secret Of The Mark (4)"
      pages, //     ["m1.jpg", "m2.png", "m3.png", "m4.gif", "m5.png", ...]
      // pages: pages.filter(p => !p.endsWith('gif')), // don't download gifs at all?
    };
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
  async function throttle(time = TIME_BETWEEN_REQUESTS) {
    if (throttle.time) {
      /* if time from previous timestamp is less then allowed - throttle it
       * note: min timeout will launch anyway */
      await new Promise(r => setTimeout(r, time - ((new Date|0) - throttle.time)));
    }
    throttle.time = (new Date|0); // initiate\renew timestamp
  }


  async function load(page, chapter, attempt = 0) {
    let buffer = 0;
    await throttle();

    /* avoid cors error by fetching from context with same origin as images server */
    const request = await this.fetch(chapter.src + page);

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
        function idbSave(buffer, chapter, page) {
          return new Promise((resolve, reject) => {
            idbRequest(indexedDB.open(chapter.id), (event) => {
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
            chapter,
            buffer,
          ] = event.data;

          idbSave(buffer, chapter, page)
            .then(() => postMessage([chapter.id, page]))
            .catch(e => Error(e, page));
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

    resolver[page]();
    delete resolver[page];
  };
  worker.onerror = ({ message, lineno }, page) => {
    window.console.error(`Error from worker: ${message} on line ${lineno}.`);
    rejector[page]();
  };


  // convert image into data in separate thread and give way to loading
  function save([page, buffer], chapter) {
    // the promise stored in the Promise.all array in process function
    return new Promise((resolve, reject) => {
      resolver[page] = resolve;
      rejector[page] = reject;

      worker.postMessage([page, { ...chapter, db: null }, buffer], [buffer]);
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
    await new Promise(r => setTimeout(r, 3e3)); // give time to save file
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
