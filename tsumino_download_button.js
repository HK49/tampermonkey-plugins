/* global JSZip */
// ==UserScript==
// @name         Tsumino script
// @version      0.4
// @author       HK49
// @license      MIT
// @include      /^https?://www.tsumino.com/Book/Info/.+/
// @grant        none
// @run-at       document-start
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.2.0/jszip.min.js#sha256=VwkT6wiZwXUbi2b4BOR1i5hw43XMzVsP88kpesvRYfU=
// ==/UserScript==

const TIME_BETWEEN_REQUESTS = 2000/* miliseconds */;

// TODO net::ERR_SPDY_PROTOCOL_ERROR 200 over https (memory issue?)
// TODO Error Handling

const { console } = window;

/* show progress inside button while downloading */
const progress = {
  install: () => { progress.button = document.getElementById("DownloadButton"); },
  onstart: (imagesQuantity) => {
    progress.button.style = "pointer-events: none; cursor: not-allowed; opacity: 0.8;";
    const numberOfTicks = imagesQuantity * ['image load', 'image save'].length;
    progress.tick = 100 / (numberOfTicks); // 100%/above
  },
  onerror: (e) => {
    console.error(e);
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


const manga = {
  id: Number(window.location.pathname.match(/(?<=Info\/)\d+(?=\/)?/)),
};


// idb helpers
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
        const s = manga.db.transaction("download", "readwrite").objectStore("download");
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


async function throttle(time = TIME_BETWEEN_REQUESTS) {
  if (throttle.time) {
    /* if time from previous timestamp is less then allowed - throttle it
     * note: min timeout will launch anyway */
    await new Promise(r => setTimeout(r, time - ((new Date|0) - throttle.time)));
  }
  throttle.time = (new Date|0); // initiate\renew timestamp
}


async function load(url) {
  await throttle();
  const buffer = await requestAPI('arrayBuffer', '/Image/Object', { name: url });

  progress.update(); // fisrt update per image on loaded image
  console.log("LOAD:", url, buffer);
  return [encodeURIComponent(url), buffer];
}


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

const rejector = {};
const resolver = {};

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

function save([hash, buffer]) {
  return new Promise((resolve, reject) => {
    resolver[hash] = resolve;
    rejector[hash] = reject;

    worker.postMessage([hash, manga.id, buffer], [buffer]);
  });
}


async function download() {
  progress.install();
  const mangaJSON = await mangaData().catch((e) => {
    progress.nofetch();
    return Error(e);
  });
  manga.hashes = mangaJSON.reader_page_urls;

  const status = await openDB();
  console.log(status);

  if (status === 'new') {
    manga.length = Number(mangaJSON.reader_page_total);
    if (isNaN(manga.length)) return Error('images quantity is NaN, got response:\n', mangaJSON);
  } else if (status === 'previous') {
    manga.hashes = [];
    await new Promise(resolve => requestIDB(
      manga.db.transaction("download").objectStore("download").index("buffer").openCursor(IDBKeyRange.only(0)),
      e => cursor(e, ({ hash }) => manga.hashes.push(hash), resolve()),
    ));
    manga.length = manga.hashes.length;
  }

  progress.onstart(manga.length);

  return Promise.resolve(manga.hashes.reduce(
    (start, url) => start.then(queue => load(url).then(data => queue.concat(save(data)))),
    (async (queue = []) => queue)(),
  )).then(queued => Promise.all(queued)).then(async () => {
    const zip = new JSZip();

    await new Promise((resolve, reject) => {
      requestIDB(
        manga.db.transaction("download").objectStore("download").openCursor(),
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

    manga.db.close(); // remove db on success
    indexedDB.deleteDatabase(manga.id);
    progress.onloadend();
  });
}

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

// //censure
const style = document.createElement('style');
style.type = "text/css";
style.id = "tampermonkey";
const cssRules = "background: #000; position: absolute; top: 0; left: 0; right: 0; bottom: 0; content: ''; z-index: 999;";
style.innerText += `#thumbnails-container .book-grid-item > a:before, .book-page-cover > a:before { ${cssRules} } `;
const interval = setInterval((_) => {
  document.head.appendChild(style);
  if (document.readyState === "complete") clearInterval(interval);
}, 60);
