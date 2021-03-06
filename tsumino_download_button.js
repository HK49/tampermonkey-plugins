/* global JSZip */
// ==UserScript==
// @name         Tsumino script
// @version      0.45
// @author       HK49
// @license      MIT
// @include      /^https?://www.tsumino.com/Book/Info/.+/
// @grant        none
// @run-at       document-start
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.2.0/jszip.min.js#sha256=VwkT6wiZwXUbi2b4BOR1i5hw43XMzVsP88kpesvRYfU=
// ==/UserScript==

const TIME_BETWEEN_REQUESTS = 1000/* miliseconds */;

// TODO net::ERR_SPDY_PROTOCOL_ERROR 200 over https (memory issue?)
// TODO Error Handling


/* show progress inside button while downloading */
const progress = {
  install: () => {
    progress.button = document.getElementById("DownloadButton");
    progress.button.style = "pointer-events: none; cursor: not-allowed; opacity: 0.8;";
  },
  onstart: (imagesQuantity) => {
    const numberOfTicks = imagesQuantity * ['image load', 'image save'].length;
    progress.tick = 100 / (numberOfTicks); // 100%/above
  },
  onerror: () => {
    progress.button.style = "background-color: #c00;";
    progress.button.innerText = "\xa0\xa0:'(\xa0\xa0";
  },
  nofetch: () => {
    progress.button.style = "background-color: #ffae33;";
    progress.button.innerText = "404";
  },
  percent: 0,
  update: () => {
    progress.percent += progress.tick;
    const num = Math.floor(progress.percent);

    progress.button.innerText = `${num < 10 ? `\xa0\xa0${num}` : num}%`;
  },
  onloadend: () => {
    progress.button.style = '';
    progress.button.innerText = '\xa0\xa0\u2B73\xa0\xa0\xa0';
  },
};

// object, that stores db, manga id, array of pages urls, their total length..
const manga = {
  id: Number(window.location.pathname.match(/(?<=Info\/)\d+(?=\/)?/)),
};

// add button on page
document.addEventListener('DOMContentLoaded', (_) => {
  document
    .querySelector("#complete_form > :last-child > .book-info")
    .appendChild(Object.assign(document.createElement('button'), {
      className: "book-read-button button-stack",
      id: 'DownloadButton',
      innerText: "\xa0\xa0\u2B73\xa0\xa0\xa0", // ⭳
      onclick: (e) => {
        e.preventDefault();
        download();
      },
      title: 'Download manga',
    }));
});


// does what it says
async function download() {
  progress.install();

  cleanupDB(); // delete old entries in db

  // get array of links for images
  manga.hashes = (await mangaData().catch((e) => {
    progress.nofetch();
    throw e;
  })).reader_page_urls;

  // check if new or old, while opening connection to db
  const status = await openDB();

  // if the download of this same manga was done previously but ended abruptly
  // then preserve previously downloaded images and download only new
  if (status === 'previous') {
    manga.hashes = [];
    await new Promise(resolve => requestIDB(
      transaction(manga.db, "download").index("buffer").openCursor(IDBKeyRange.only(0)),
      e => cursor(e, ({ hash }) => manga.hashes.push(hash), resolve),
    ));
  }
  manga.length = manga.hashes.length;

  progress.onstart(manga.length);

  // download stuff after we know how many and where too
  return Promise.resolve(manga.hashes.reduce(
    (start, url) => start.then(queue => load(url).then(data => queue.concat(save(data)))),
    (async (queue = []) => queue)(),
  )).then(queued => Promise.all(queued)).then(async () => {
    // after everything is downloaded - start to merge 'em into zip file
    const zip = new JSZip();

    await new Promise((resolve, reject) => {
      requestIDB(
        transaction(manga.db, "download").openCursor(),
        e => cursor(e, ({ number, buffer }) => zip.file(`${number}.jpg`, buffer), resolve),
        reject,
      );
    });

    const file = await zip.generateAsync({ type: "blob", streamFiles: true });

    (Object.assign(document.createElement('a'), {
      download: `${document.title.replace(/\s\|\sTsumino$/, '')}.zip`,
      href: URL.createObjectURL(file),
      target: '_blank',
      type: 'application/zip',
    })).click();
    URL.revokeObjectURL(file);

    // remove stuff in end
    manga.db.close();
    indexedDB.deleteDatabase(manga.id);
    const downloads = JSON.parse(localStorage.getItem('downloads'));
    delete downloads[manga.id];
    localStorage.setItem('downloads', JSON.stringify(downloads));

    progress.onloadend();
  }).catch((e) => {
    window.console.error(e);
    progress.onerror();
  });
}


// *****************************************************************************
// API FUNCTIONS BELOW:
// *****************************************************************************

/* Retrieve data from api
 * if it doesnt retrieve from the first time - wait some time and try again
 * repeat three times and succeed or die */
function requestAPI(responseFormat, path, params, options = {}) {
  const url = new URL(path, window.location.origin);
  Object.entries(params).map(([query, value]) => url.searchParams.set(query, value));

  const recaller = (backoff = 3) => fetch(url, options).then(async (response) => {
    switch (response.status) {
      case 404: return Error(`Couldn't load the gallery with id=${manga.id}. Maybe you need to check CAPTCHA.`);
      case 200: return response[responseFormat]();
      default:
        if (backoff > 1) {
          await new Promise(r => setTimeout(r, 1e4 * ~(-5 + backoff)));
          window.console.warn(`${4 - backoff} retry to get API response on ${response.status}`);
          return recaller(backoff - 1);
        }
        return Error(`Error with request: ${response.status} ${response.statusText}`);
    }
  });

  return recaller();
}


// request api of what to download: ask it where are the images in internet
async function mangaData() {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  const text = await requestAPI('text', '/Read/Load', { q: manga.id }, { method: 'POST', headers });
  try {
    return JSON.parse(text);
  } catch (e) {
    return Error("API response was not JSON.");
  }
}

// *****************************************************************************
// DATABASE FUNCTIONS BELOW:
// *****************************************************************************

// request browser of where to download: preserve downloaded images on hard drive
// untill everyone of 'em succeeds
function openDB() {
  return new Promise((resolve, reject) => {
    function onPrevious(e) {
      manga.db = e.target.result;
      resolve('previous');
    }
    function onNew(e) {
      manga.db = e.target.result;

      const store = manga.db.createObjectStore("download", { keyPath: "hash" });
      store.createIndex("number", "number", { unique: true });
      store.createIndex("buffer", "buffer", { unique: false });

      store.transaction.oncomplete = (_) => {
        const s = transaction(manga.db, "download", "readwrite");
        manga.hashes.map((hash, i) => s.add({
          hash,
          number: (i < 9 ? "00" : i < 99 ? "0" : "") + (i + 1),
          buffer: 0,
        }));
      };

      resolve('new');
    }
    try {
      requestIDB(indexedDB.open(manga.id), onPrevious, onNew);
    } catch (e) {
      reject(e);
    }
  });
}

// clean db from old entries
function cleanupDB() {
  const now = Date.now();
  let downloads = localStorage.getItem('downloads');
  if (!downloads) {
    downloads = {};
  } else {
    downloads = JSON.parse(downloads);
    Object.entries(downloads).map(([dbID, timestamp]) => {
      if (timestamp < (now - 6048e5)) { // remove entries older then ~one week from db
        indexedDB.deleteDatabase(dbID); // it will not throw error if there is no db
        delete downloads[dbID];
      }
      if (dbID === manga.id) delete downloads[dbID];
    });
  }
  downloads[manga.id] = now;
  localStorage.setItem('downloads', JSON.stringify(downloads));
}

// shortcuts for indexedDB
function requestIDB(request, callback, callback2 = () => {}) {
  request.onsuccess = event => callback(event);
  request.onupgradeneeded = event => callback2(event);
  request.onerror = error => Error(error);
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
function transaction(db, store, mode = 'readonly') {
  return db.transaction(store, mode).objectStore(store);
}

// *****************************************************************************
// DOWNLOAD FUNCTIONS BELOW:
// *****************************************************************************

// limit requests to server: download one image per specified time
async function throttle(time = TIME_BETWEEN_REQUESTS) {
  if (throttle.time) {
    /* if time from previous timestamp is less then allowed - throttle it
     * note: min timeout will launch anyway */
    await new Promise(r => setTimeout(r, time - ((new Date|0) - throttle.time)));
  }
  throttle.time = (new Date|0); // initiate\renew timestamp
}


// load image but not as image but as array buffer
async function load(url) {
  await throttle();
  const buffer = await requestAPI('arrayBuffer', '/Image/Object', { name: url });

  progress.update(); // fisrt update per image on loaded image
  return [encodeURIComponent(url), buffer];
}


// save images into hard drive in separate thread
const worker = new Worker(URL.createObjectURL(new Blob([
  `(${
    (() => {
      function idbSave([hash, mangaID, buffer]) {
        return new Promise((resolve, reject) => {
          function idb(request, callback) {
            request.onsuccess = event => callback(event);
            request.onerror = error => reject(error);
          }

          let db;
          let store;
          function openTransaction(event) {
            db = event.target.result;
            store = db.transaction("download", "readwrite").objectStore("download");
            idb(store.get(decodeURIComponent(hash)), getImageFromDB);
          }
          function getImageFromDB(event) {
            const data = event.target.result;
            data.buffer = buffer;
            idb(store.put(data), putBufferIntoDB);
          }
          function putBufferIntoDB() {
            db.close();
            resolve(hash);
          }
          idb(indexedDB.open(mangaID), openTransaction);
        });
      }

      self.onmessage = (event) => {
        const [hash] = event.data;
        idbSave(event.data).then(img => postMessage(img))
          .catch(e => Error(JSON.stringify({ e, hash })));
      };
      self.onerror = e => console.warn("Worker got error:\n", e);
    })
  })()`
], { type: 'application/javascript' })));

// collection of resolved promises, or code forbid rejected
const rejector = {};
const resolver = {};

// check if worker succeeded or failed
worker.onmessage = (e) => {
  const hash = e.data;
  progress.update(manga.id);

  resolver[hash]();
  delete resolver[hash];
};
worker.onerror = ({ message }) => {
  const { error, hash } = JSON.parse(message);
  console.error(`Error from worker: ${error.message} on line ${error.lineno}. Image: ${hash}`);
  rejector[hash]();
  delete rejector[hash];
};

// send loaded buffer to worker
function save([hash, buffer]) {
  return new Promise((resolve, reject) => {
    resolver[hash] = resolve; // wait untill worker succeeds
    rejector[hash] = reject; // ... or fails

    worker.postMessage([hash, manga.id, buffer], [buffer]);
  });
}
