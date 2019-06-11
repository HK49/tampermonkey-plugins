/* global JSZip */
// ==UserScript==
// @name         Mangadex download script
// @description  Mangadex download button for each chapter
// @version      0.5
// @author       HK49
// @icon         https://i.imgur.com/SMnA427.png
// @license      MIT
// @include      /^https:\/\/(?:s\d\.)?mangadex\.org\/.+/
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
  // TODO: don't download mangasushi credit page gif over 13mb
  // TODO [optional]: download all chapters at once button
  // TODO: think of something if captcha returns. Just notify user on 404?


  // create download button in each chapter row
  document.addEventListener('DOMContentLoaded', (_) => {
    Array.from(document.querySelectorAll('.chapter-row[data-chapter]')).map(row => createBtn(row));
  });


  // createbutton and append function to click event
  function createBtn(parent) {
    const { id } = parent.dataset;
    parent.prepend(Object.assign(document.createElement("span"), {
      id: `btn${id}`,
      innerText: "\u2B73",
      onclick: download.bind(this, id),
      style: "cursor: pointer; position: absolute; left: 3px;",
      tabindex: '0',
      title: `Download chapter`,
      translate: 'no',
    }));
  }


  // display download progress in chapter row
  const progress = {
    initiate: (chapterID) => {
      const bar = document.getElementById(`progressbar${chapterID}`) || document.createElement('div');
      bar.id = `progressbar${chapterID}`;
      bar.style = 'background: rgba(23, 162, 184, 0.5); z-index: -1; position: absolute; top: 0; bottom: 0; left: 0;';
      bar.style.right = "100%"; // reduces with each tick
      document.querySelector(`.chapter-row[data-id="${chapterID}"]`).parentNode.appendChild(bar); // chapter row

      const btn = document.getElementById(`btn${chapterID}`); // the arrow button
      btn.innerText = '\u21BB';
      btn.style.pointerEvents = 'none';
      const animation = document.createElement('style');
      const transform = deg => `transform: rotate(${deg}deg) translateZ(0) translate3d(0, 0, 0)`;
      animation.innerText = `@keyframes tako { 0% { ${transform(0)}; } 100% { ${transform(360)}; } }`;
      document.head.appendChild(animation);
      btn.style.animation = 'tako 500ms 0s linear infinite';
    },
    start: (id, imgQuantity) => {
      progress[id] = {
        bar: document.getElementById(`progressbar${id}`),
        countdown: 100, // == bar.style.right
        tick: 100 / ((imgQuantity * 2) + 1), // 100% / (imgs quantity * (load + save image) + zip)
      };
    },
    update: (id) => {
      progress[id].countdown -= progress[id].tick;
      progress[id].bar.style.right = `${Math.round(progress[id].countdown)}%`;
    },
    remove: (id) => {
      if (typeof progress[id] !== typeof void(0)) delete progress[id];
      if (!!window.frames[`frame${id}`]) {
        document.body.removeChild(document.getElementsByName(`frame${id}`)[0]);
        delete window.frames[`frame${id}`];
      }

      const btn = document.getElementById(`btn${id}`);
      btn.style.pointerEvents = 'all';
      btn.style.animation = null;
      btn.innerText = "\u2B73";
    },
    complete: (id) => {
      progress[id].bar.style.right = "0";
      progress[id].bar.style.background = "rgba(40, 167, 69, 0.5)";
      progress.remove(id);

      const downloads = JSON.parse(localStorage.getItem('downloads'));
      delete downloads[id];
      localStorage.setItem('downloads', JSON.stringify(downloads));
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
  async function download(id) {
    progress.initiate(id);

    // renew timestamp in local storage and clean old and forgotten downloads from IDB
    cleanupDB(id);

    // retrieve chapter info from api
    const chapter = await chapterInfo(id).catch(e => progress.error(e, id));
    chapter.id = id;

    progress.start(id, chapter.pages.length);

    const previousDownload = await openDB(chapter).catch(window.console.error);
    // true if db with chapter id is existing, false if created new db
    // needs to get firstly repsonse from openDB promise to understand if it is new db or old one
    // then can we define pages, because idb onsuccess event will fire even when creating new db
    // but even though it will be called, the promise is resolved by onupgradeneeded event


    log(`Starting ${previousDownload ? 'previously unfinished' : 'new'} download.`, '#66D');


    const pages = await pagesToDownload(chapter, previousDownload);
    // retrieve remaining pages from the last errored download or initiate new array to fetch

    document.body.appendChild(Object.assign(document.createElement('iframe'), {
      height: 0,
      hidden: true,
      name: `frame${id}`,
      onload: _ => process(pages, chapter).then(_ => generateZip(chapter)).catch(e => progress.error(e, id)),
      /* load manga images one after another, waiting for previous image load to start next */
      /* start image save into IDB right after this image load, not waitong for previous to finish */
      /* image save into IDB are processed in worker. so it's messages queue === saving queue */
      /* zip generation starts only after all images were saved into IDB */
      src: `${chapter.src}/${pages[0]}`, // overcome CORS image issue by working in subdomain.
      style: 'display: none;',
      tabindex: '-1',
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
        createStore.createIndex("src", "src", { unique: true });
        createStore.createIndex("saved", "saved", { unique: false });
        createStore.createIndex("mime", "extension", { unique: false });

        createStore.transaction.oncomplete = (_) => {
          const store = transaction(chapter.db, "readwrite");
          chapter.pages.map((page, i) => store.add({ // populate db if not existed
            id: i,
            sorting_name: (i < 9 ? "00" : i < 99 ? "0" : "") + (i + 1),
            src: chapter.src + page,
            page,
            extension: String(page.match(/(?<=\.)\w{3,4}$/)),
            blob: null, // the data to be stored in zip
            saved: 0, // change on succesfull conversion
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
        requestIDB(
          transaction(chapter.db).index("saved").openCursor(IDBKeyRange.only(saved ? 1 : 0)),
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
        false, // fetch pages without blobs in IDB
        page => toDownload.push(page),
      );
      return toDownload;
    }
    return chapter.pages; // download all pages
  }


  function cleanupDB(id) {
    const now = Date.now();
    let downloads = localStorage.getItem('downloads');
    if (!downloads) {
      downloads = {};
    } else {
      downloads = JSON.parse(downloads);
      Object.entries(downloads).map(([thisID, timestamp]) => {
        if (timestamp < now-7*24*3600*1000) { // remove entries older then ~one week from db
          indexedDB.deleteDatabase(thisID); // it will not throw error if there is no db
          delete downloads[thisID];
        }
        if (thisID == id) delete downloads[thisID];
      });
    }
    downloads[id] = now;
    localStorage.setItem('downloads', JSON.stringify(downloads));
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
    };
  }


  // throttled image load, convert buffer to blob,
  // save it to IDB and only when all ready - zip em all
  function process(pages, chapter) {
    return Promise.resolve(
      pages.reduce(
        (queueStart, page) => queueStart.then(
          queue => load(page, chapter).then( // first thread
            img => queue.concat(save(img, chapter)) // second thread
          )
        ),
        (async (queue = []) => queue)()
      )
    )
    .then(promises => Promise.all(promises)) // wait for all tasks here
    .catch(e => progress.error(e, chapter.id))
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
    const request = await window.frames[`frame${chapter.id}`].fetch(chapter.src + page);

    try {
      buffer = await request.arrayBuffer();
    } catch (e) {
      if (request.status === 404 && attempt < 3) {
        await new Promise(r => setTimeout(r, 1e4 + (attempt * 5e3)));
        return load(page, chapter, attempt + 1);
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
        function idbSave(blob, chapter, page) {
          return new Promise((resolve, reject) => {
            if (!blob) reject(Error(`error creating blob from ${chapter.src + page}`));

            idbRequest(indexedDB.open(chapter.id), (event) => {
              const storage = event.target.result.transaction("downloads", "readwrite").objectStore("downloads");
              idbRequest(storage.get(page), (e) => {
                const data = e.target.result;

                data.blob = blob;
                data.saved = 1;

                idbRequest(storage.put(data), () => {
                  event.target.result.close();
                  resolve();
                }, reject);
              }, reject);
            }, reject);
          });
        }


        // there will form stack of messages from convert function. will it ever overflow?
        // TODO queue?
        self.onmessage = (event) => {
          const [
            [page, extension], // full match, first match group
            chapter,
            buffer,
          ] = event.data;

          const blob = new Blob([buffer], {
            type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
          });

          idbSave(blob, chapter, page)
            .then(() => postMessage([chapter.id, page]))
            .catch(e => Error(e, page));
        };
        self.onerror = e => console.warn("Worker got error:\n", e);
      })
    })()`
  ], { type: 'application/javascript' })));


  // get response from worker and resolve awaiting promise from Promise.all array of process function
  function rejector() { }
  function resolver() {
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
  }
  resolver();


  // convert image into data in separate thread and give way to loading
  function save([page, buffer], chapter) {
    // the promise stored in the Promise.all array in process function
    return new Promise((resolve, reject) => {
      page = page.match(/\w?\d+\.(\w{3,4})$/);

      resolver[page[0]] = resolve;
      rejector[page[0]] = reject;

      worker.postMessage([page, { ...chapter, db: null }, buffer], [buffer]);
    });
  }


  async function generateZip(chapter) { // generate and download zip
    const zip = new JSZip();
    let zipSize = 0;

    await new Promise((resolve, reject) => {
      requestIDB(transaction(chapter.db).openCursor(), e => cursor(e, (data) => {
        zip.file(`${data.sorting_name}.${data.blob.type.match(/(?<=image\/)\w+$/)}`, data.blob);
        zipSize += data.blob.size;
      }, resolve), reject);
    });

    const file = await zip.generateAsync({ type: "blob", streamFiles: true });

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
