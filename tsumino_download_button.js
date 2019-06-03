/* global JSZip */
// ==UserScript==
// @name         Tsumino script
// @version      0.3
// @author       HK49
// @license      MIT
// @include      /^https?://www.tsumino.com/Book/Info/.+/
// @grant        none
// @run-at       document-start
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.2.0/jszip.min.js#sha256=VwkT6wiZwXUbi2b4BOR1i5hw43XMzVsP88kpesvRYfU=
// ==/UserScript==

// TODO net::ERR_SPDY_PROTOCOL_ERROR 200 over https (memory issue?)
// TODO Error Handling

const SIZE_LIMIT = 50/*mb*/; // limit archive size to preserve memory & download in parts | note: max chrome blob size 2gb.

const limit = SIZE_LIMIT * 2**20; // byte representation of SIZE_LIMIT

// logging
const bytes_to_mb = (bytes, k = 1024, kiB = bytes/k, miB = kiB/k) => miB < 1 ? Math.round(kiB)+'kb' : miB.toFixed(2)+'mb';
const log = {
    start: (i, all) => {
        console.group(`Processing ${i} image out of ${all}`);
    },
    loaded: ({ height, width }) => {
        console.log(`image successfully loaded with dimensions: ${height}px x ${width}px`);
    },
    blobed: size => {
        console.log(`Created blob size: ${bytes_to_mb(size)}`);
    },
    waits_archiving: ({ overall, current }) => {
        console.log(`Total images size: ${bytes_to_mb(overall)}`);
        if(overall !== current) {
        console.log(`Current part size: ${bytes_to_mb(current)}`);
        }
        console.groupEnd();
    },
    archiving: (part, size, last = false) => {
        const insertion = `${!part ? '' : !last ? `${part} part ` : 'last part '}`;
        // no parts ? only 1 archive : not last part ? one of sevaral parts : last part

        console.log(`Generating archive ${insertion}with size of ${bytes_to_mb(size)}`);
    },
}


/* show progress inside button while downloading */
const progress = {
    install: btn => { progress.button = btn; },
    onstart: images_quantity => {
        progress.button.style = "pointer-events: none; cursor: not-allowed; opacity: 0.8;";
        const number_of_ticks = images_quantity * ['successfull image load', 'successfull conversion to blob'].length;
        progress.tick = 100 / (number_of_ticks); // 100%/above
    },
    onerror: e => {
        console.groupEnd(); // end group started with log object
        console.error(e);
        progress.button.style = "background-color: #c00;"
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

        progress.button.innerText = `${num < 10 ? '\xa0\xa0' + num : num}%`;
    },
    onloadend: () => {
        progress.button.style = '';
        progress.button.innerText = '\xa0\xa0\u2B73\xa0\xa0\xa0';
    },
    last_downloaded: { // so the download could restart from the last downloaded part if there were some errors
        image: 0, // if whole download was not separated in parts, then it will begin from the start. nothing can be done, supposedly
        part: 0,
    },
};


function download(btn) {
    'use strict';

    const chapter_index = Number(location.pathname.match(/(?<=Info\/)\d+(?=\/)?/));

    progress.install(btn);


    /* fetch adapted from tsumino native ajax jquery code */
    fetch(`/Read/Load?q=${chapter_index}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(res => {
        if(res.status === 404) throw Error(`Couldn't load the gallery with id=${chapter_index}. Maybe you need to check CAPTCHA.`);
        if(res.status !== 200) throw Error(`There was an error with requested gallery. ${res.statusText}`);
        return res.json();
    })
    .then(res => {
        const images_quantity = Number(res.reader_page_total); // number of total pages in gallery
        const urls = res.reader_page_urls.slice(progress.last_downloaded.image); // array of image hashes
        // slice is to restart on error from last downloaded part if gallery was downloaded in parts and some image further in que got errored
        if(isNaN(images_quantity)) throw Error('images quantity is NaN, got response:\n', res);
        res = null; // don't need response anymore

        progress.onstart(images_quantity);

        urls.reduce(/*process each image one after another*/
            (promise, url, i) => promise.then(_ => load(url, i + progress.last_downloaded.image).then(blobify).then(archive).catch(progress.onerror)),
            Promise.resolve()
        ) // i + progress.last_downloaded.image above is for restarting purpose

        function load(url, i) { // load image and send it to convert into canvas & next into blob
            return new Promise((resolve, reject) => {
                const src = `/Image/Object?name=${encodeURIComponent(url)}`;
                const img = new Image();
                img.alt = i + 1;
                log.start(img.alt, images_quantity);
                img.onload = _ => resolve(img);
                img.onerror = e => reject(e);
                img.src = src;
            });
        }

        const size = {
            current: 0, // value for logging purposes. resets with each new archive part if archive is separated in parts
            overall: 0, // this is total archive/blobs size. is compared with maximum below to separate archives in parts
            maximum: limit, // this value will be changed with each archive part generated by +limit;
        };
        let { part } = progress.last_downloaded; // the variable that is increased with each archive part + to restart on error from last downloaded part

        function blobify(img) { // convert image into blob
            return new Promise((resolve, reject) => {
                log.loaded(img);
                progress.update(); // fisrt update per image on loaded image

                const canvas = document.createElement('canvas');
                canvas.height = img.height;
                canvas.width = img.width;
                const context = canvas.getContext('2d').drawImage(img, 0, 0);

                canvas.toBlob(blob => {
                    if(blob === null) reject("Blob wasn't generated");
                    log.blobed(blob.size);
                    progress.update(); // second update on converted image to blob
                    const num = Number(img.alt);
                    resolve([num, blob]);
                }, 'image/jpeg'); // tsumino stores all images in jpg?
            });
        }

        let blobs_array = []; // if total blobs size in array is more then limit set on top of code, then archive it in parts
        async function archive([i, blob]) {
            blobs_array.push({
                name: `${(i < 10 ? "00" : i < 100 ? "0" : "") + i}.jpg`,
                blob: blob,
            });
            size.current += blob.size;
            size.overall += blob.size;
            log.waits_archiving(size); // blob waits in array for it to reach size limit or end of gallery to be next converted into archive

            // last archive part or whole archive the size < limit
            if (i === images_quantity) { // on last image
                if (part !== 0) { part += 1; } // if the archive is not the only one but the last of parts - change part number for naming
                log.archiving(part, size.current, true);

                await construct_archive(blobs_array);
                progress.onloadend();
                progress.last_downloaded.part = 0;
                progress.last_downloaded.image = 0;
            }
            // separate archives in parts
            if (size.overall > size.maximum && i + 10 < images_quantity) { // (i + 10 < images_quantity) => to not have next archive with 1-2 images
                part += 1;
                size.maximum += limit; // the next part is bigger then the previous by "limit"
                log.archiving(part, size.current);
                size.current = 0; // clear current size because this part whould be archived

                await construct_archive(blobs_array);
                blobs_array = []; // clear blobs array after we archived current part
                progress.last_downloaded.part = part;
                progress.last_downloaded.image = i;
            }
        }

        async function construct_archive(blobs) {
            const zip = new JSZip();
            blobs.map(({ name, blob }) => zip.file(name, blob));

            await zip.generateAsync({ type: "blob" }).then(file => {
                const name = `${part !== 0 ? `[PART ${part}] ` : ''}${document.title.replace(/\s\|\sTsumino$/, '')}.zip`;

                console.log(`saving ${name}`);

                const a = document.createElement('a');
                a.href = URL.createObjectURL(file);
                a.type = 'application/zip';
                a.target = '_blank';
                a.download = name;
                a.click();
                a.remove();
                URL.revokeObjectURL(file);
            });
            await new Promise(r => setTimeout(r, 4e3)); // give time to save file
        }
    })
    .catch(e => {
        console.error(e);
        progress.nofetch();
    });
}

document.addEventListener('DOMContentLoaded', _ => {
    const btn = document.createElement('button');
    btn.className = "book-read-button button-stack";
    btn.innerText = "\xa0\xa0\u2B73\xa0\xa0\xa0"; // "  ⭳   "
    btn.onclick = e => {
        e.preventDefault();
        download(btn);
    };
    btn.title = 'Download manga';

    document.querySelector("#complete_form > :last-child > .book-info").appendChild(btn);
});

// //censure
// const style = document.createElement('style');
// style.type = "text/css";
// style.id = "tampermonkey";
// const css_rules = "background: #000; position: absolute; top: 0; left: 0; right: 0; bottom: 0; content: ''; z-index: 999;";
// style.innerText += `#thumbnails-container .book-grid-item > a:before, .book-page-cover > a:before { ${css_rules} } `;
// const interval = setInterval(_ => {
//     document.head.appendChild(style);
//     if (document.readyState === "complete") clearInterval(interval);
// }, 60);
