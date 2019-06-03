/* global JSZip */
// ==UserScript==
// @name         Mangadex download script
// @description  Download button is an arrow left from the eye button on chapter row on manga's title page. Progress is shown in chapter row. Can be concurrent.
// @version      0.4
// @author       HK49
// @icon         https://i.imgur.com/SMnA427.png
// @license      MIT
// @include      /^https:\/\/(?:s\d\.)?mangadex\.org\/.+/
// @grant        none
// @run-at       document-start
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.2.0/jszip.min.js#sha256=VwkT6wiZwXUbi2b4BOR1i5hw43XMzVsP88kpesvRYfU=
// ==/UserScript==

// NB:
// Downloaded images will probably be (much)increased in filesize. Grayscale becomes 32-bit rgba, no compression, etc. clientside compression in js is a hardle.
// To download image, it is needed first to be drawn into canvas, then converted into raw data and finally zipped. Optimisation loss is occurred on first step.

// Because it don't use GM_xmlhttpRequest, script creates new invisible frame inside current page, after download is complete/errored the frame is removed:
// sometimes manga images are stored not on the main server mangadex.org, but on s6.mangadex.org and the like(are there more?)
// no 'Access-Control-Allow-Origin' header is present on this subdomains, it creates a problem when converting image into blob
// when converting image into canvas, if the image is sourced from other domain the canvas will be tainted (security reasons)
// tainted canvas can't be converted into pure data, so jszip will not be able to add it into archive, to overcome this
// script creates new frame with url of subdomain as it's location where images are stored so it could create untainted canvases there

document.domain = "mangadex.org"; // we need it on both main domain and subdomain
// To avoid Error "DOMException: Blocked a frame with origin "https://mangadex.org" from accessing a cross-origin frame."

(async () => { // anonymous wrap
if (!location.pathname.startsWith('/title')) return; // work only on manga title page, eg: https://mangadex.org/title/0/isekai-harem-yankee-tsundere-bullshit

const TIME_BETWEEN_REQUESTS = 1000/*miliseconds*/; // throttle requests to server (so server won't think that it's being under atack)
// dunno what are settings of mangadex to limit requests per minute/second. do they throttle them serve-side? Probably... so is it a fool errand?




//!TODO: error handling & logging. clean the code
// TODO [optional]: download all chapters at once button
// TODO: think of something if captcha returns. Just notify user on 404?





// get info about chapter/manga from api
const api = (type, id) => {
    const url = new URL('api', location.origin);
    const params = url.searchParams;
    params.set('type', type); //(manga|chapter)
    params.set('id', id);
//  params.set('baseURL', '/api');

    const recaller = (backoff = 3) => {
        return fetch(url).then(async response => {
            if (response.ok) return response.text();
            if (backoff > 1) {
                await new Promise(r => setTimeout(r, 1e4 * ~(-5 + backoff)));
                console.warn(`${4 - backoff} retry to get API response on ${response.status}`);
                return recaller(backoff - 1);
            }
            throw `${response.status} ${response.statusText}`;
        }).then(text => {
            try {
                return JSON.parse(text);
            } catch (e) {
                Promise.reject("API response was not JSON.");
            }
        });
    }
    return recaller();
}

// get chapter info from api
function chapter_info(id) {
    return new Promise((resolve, reject) => {
        api('chapter', id).then(({ server, hash, page_array: pages, chapter, title: name }) => {
            const link = server + hash + '/'; // link + page from page_array = link to image
            const title = `${!isNaN(Number(chapter)) && `Ch.`}${chapter}${name && ` - ${name}`}`;

            resolve({
                src: link, //   example: https://s6.mangadex.org/data/MumbleBumbleJumbleSymbols/
                title: title, // example: "Ch.16.2 - The Secret Of The Mark (4)"
                pages: pages, //    ["m1.jpg", "m2.png", "m3.png", "m4.gif", "m5.png", ...]
            });
        });
    });
}


// display progress
const progress = {
    initiate: (chapter_id) => {
        const bar = document.getElementById(`progressbar${chapter_id}`) || document.createElement('div');
        bar.id = `progressbar${chapter_id}`;
        bar.style = 'background: rgba(23, 162, 184, 0.5); z-index: -1; position: absolute; top: 0; bottom: 0; left: 0;';
        bar.style.right = "100%"; // reduces with each tick
        document.querySelector(`.chapter-row[data-id="${chapter_id}"]`).parentNode.appendChild(bar); // chapter row
        document.getElementById(`btn${chapter_id}`).style.pointerEvents = 'none'; // the arrow button
    },
    start: (id, img_quantity) => {
        progress[id] = {
            bar: document.getElementById(`progressbar${id}`),
            countdown: 100, // == bar.style.right
            tick: 100 / (img_quantity * 2 + 1), // 100% / (imgs quantity * (load image + create blob) + wait zip)
        };
    },
    update: (id) => {
        progress[id].countdown -= progress[id].tick;
        progress[id].bar.style.right = `${Math.round(progress[id].countdown)}%`;
    },
    remove: (id) => {
        if (typeof progress[id] !== typeof void(0)) delete progress[id];
        if (!!frames[`frame${id}`]) {
            document.body.removeChild(document.getElementsByName(`frame${id}`)[0]);
            delete frames[`frame${id}`];
        }

        document.getElementById(`btn${id}`).style.pointerEvents = 'all';
    },
    complete: (id) => {
        progress[id].bar.style.right = "0";
        progress[id].bar.style.background = "rgba(40, 167, 69, 0.5)";
        progress.remove(id);

        let downloads = JSON.parse(localStorage.getItem('downloads'));
        delete downloads[id];
        localStorage.setItem('downloads', JSON.stringify(downloads));
    },
    error: (e, id) => {
        console.error(e);
        if (!progress[id]) return;
        progress[id].bar.style.right = "0";
        progress[id].bar.style.background = "rgba(220, 53, 69, 0.5)";
        progress.remove(id);
    },
};


// to not swarm server with requests
async function throttle(time = TIME_BETWEEN_REQUESTS) {
    if (throttle.time) {
        /* if time from previous timestamp is less then allowed - throttle it | note: min timeout will launch anyway */
        await new Promise(r => setTimeout(r, time - ((new Date|0) - throttle.time)));
    }
    throttle.time = (new Date|0); // initiate\renew timestamp
}



function load(page, chapter) {
    return new Promise(async (resolve, reject) => {
        await throttle();
        const img = new frames[`frame${chapter.id}`].Image(); // so canvas won't be tainted we create image on it's src domain

        img.onload = () => {
            progress.update(chapter.id);
            console.log(`loaded image from ${img.src}`);
            resolve(img);
        }
        img.onerror = e => {
            reject(e);
        }
        img.src = chapter.src + page;
    });
}



// convert into blob and insert data into db in separate thread
const worker = new Worker(URL.createObjectURL(new Blob([
`(${
(() => {
function drawCanvas(bitmap) {
    const gl = (new OffscreenCanvas(bitmap.width, bitmap.height)).getContext("webgl2", {
        antialias: false,
        alpha: false,
        depth: false,
    });

    function createShader(gl, type, glsl) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, glsl)
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return;
        }
        return shader;
    }


    const vs = createShader(
        gl,
        gl.VERTEX_SHADER,
        `#version 300 es
        #define POSITION_LOCATION 0
        layout(location = POSITION_LOCATION) in vec2 position;

        void main()
        {
            gl_Position = vec4(position, 0.0, 1.0);
        }`,
    );

    const fs = createShader(
        gl,
        gl.FRAGMENT_SHADER,
        `#version 300 es
        precision mediump float;
        precision mediump sampler2D;

        uniform sampler2D sampler;
        uniform vec2 dimensions;

        out vec4 color;

        void main()
        {
            color = texture(sampler, vec2(gl_FragCoord.x/dimensions.x, 1.0 - (gl_FragCoord.y/dimensions.y)));
        }`,
    );

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    const sampler = gl.getUniformLocation(program, 'sampler');
    const dimensions = gl.getUniformLocation(program, 'dimensions');
    const position = 0; // GLSL location


    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(position);
    const vxBuffer = gl.createBuffer();
    const vertices = new Float32Array([
        -1.0,-1.0,
         1.0,-1.0,
        -1.0, 1.0,
         1.0, 1.0,
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, vxBuffer);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGB565, // 2nd smallest filesize, quality is ok
        //gl.SRGB, // too much artifacts are seen
        //gl.RGB5_A1, // smallest size, but bits(gradients?) may brake
        //gl.(RGB9_E5|RGB8UI) //don't see a difference from RGB??
        //gl.LUMINANCE //is only 5% lighter then RGB
        bitmap.width,
        bitmap.height,
        0,
        gl.RGB,
        gl.UNSIGNED_SHORT_5_6_5,
        bitmap
    );

    gl.useProgram(program);
    gl.uniform1i(sampler, 0);
    gl.uniform2f(dimensions, gl.canvas.width, gl.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
    gl.deleteTexture(texture);
    gl.deleteVertexArray(vao);
    gl.deleteBuffer(vxBuffer);
    gl.deleteProgram(program);

	return gl.canvas;
}

function idbSave(blob, chapter, page) {
    return new Promise((resolve, reject) => {
        if(!blob) reject(`error creating blob from ${chapter.src + page}`);
        console.log(`created blob from ${chapter.src + page} ${blob.size}b`);

        const request = indexedDB.open(chapter.id);
        request.onsuccess = event => {
            const storage = event.target.result.transaction("downloads", "readwrite").objectStore("downloads");
            const req = storage.get(page);
            req.onsuccess = e => {
                const data = e.target.result;

                data.blob = blob;
                data.saved = 1;

                const update = storage.put(data);
                update.onsuccess = _ => {
                    console.log(`blob saved in IDB ${chapter.src + page}`);
                    event.target.result.close();
                    resolve();
                }
                update.onerror = e => reject(e);
            }
        };
        request.onerror = e => reject(e);
    });
}

    self.onmessage = event => { // there will form stack of messages from convert function. will it ever overflow? todo queue?
        const [
            [ page, extension ], // full match, first match group
            chapter,
            bitmap,
        ] = event.data;

        drawCanvas(bitmap).convertToBlob({
            type: `image/webp`, // since using bitmap+canvas, need to pump the size down. setting mime to original doesn't alleviate losses
        })
        .then(async blob => await idbSave(blob, chapter, page))
        .then(_ => postMessage([chapter.id, page]))
        // catch is error event listener
    }
    self.onerror = e => console.warn("Worker got error:\n", e);
})
})()`
], {type: 'application/javascript'})));


const resolver = () => { // get response from worker and resolve awaiting promise from Promise.all array of process function
    worker.onmessage = e => {
        const [chapter_id, page] = e.data;
        progress.update(chapter_id);
        console.log('worker finished with', page);
        resolver[page]();
        delete resolver[page];
    };
    worker.onerror = e => console.error("Error from worker\n", e);
}
resolver();


function save(img, chapter) { // convert image into data in separate thread and give way to loading
    return new Promise((resolve, reject) => { // the promise stored in the Promise.all array in process function
        const page = img.src.match(/(?<=\/)\w\d+\.(\w{3,4})$/);

        resolver[page[0]] = resolve;

        createImageBitmap(img, {
            premultiplyAlpha: 'none',
            colorSpaceConversion: 'none',
        }).then(bitmap => { // creating image bitmap is further increases image size.
            worker.postMessage([page, { ...chapter, db: null }, bitmap], [bitmap])
        }).catch(e => reject(e))
    })
}




// open existing or create new db for chapter download
function openDB(chapter) { // TODO: clean-up database on browser close||new page load?
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(chapter.id);
        request.onsuccess = event => { // opened existant from previous cut-off download
            chapter.db = event.target.result;
            console.log('success in IDBOpenDBRequest');

            resolve(true);
            /* so the code next can understand whether the db was previously existing(in this resolve), or was newly created(resolve in onupgradeneeded) */
        }
        request.onupgradeneeded = event => { // freshly created db. it will be called only once because we will never update version
            chapter.db = event.target.result;

            const create_store = chapter.db.createObjectStore("downloads", { keyPath: "page" });
            create_store.createIndex("id", "id", { unique: true });
            create_store.createIndex("src", "src", { unique: true });
            create_store.createIndex("saved", "saved", { unique: false });
            create_store.createIndex("mime", "extension", { unique: false });

            create_store.transaction.oncomplete = _ => {
                const store = chapter.db.transaction("downloads", "readwrite").objectStore("downloads");
                chapter.pages.map((page, i) => store.add({ // populate db if not existed
                    id: i,
                    sorting_name: (i < 9 ? "00" : i < 99 ? "0" : "") + (i + 1),
                    src: chapter.src + page,
                    page: page,
                    extension: String(page.match(/(?<=\.)\w{3,4}$/)),
                    blob: null, // the data to be stored in zip
                    saved: 0, // change on succesfull conversion
                }));
                console.log('upgradeneeded in IDBOpenDBRequest');
                resolve(false);
            }
        }
        request.onerror = e => reject(e);
    });
}



function cleanupDB(id) {
    const now = Date.now();
    let downloads = localStorage.getItem('downloads');
    if(!downloads) {
        downloads = {};
    } else {
        downloads = JSON.parse(downloads);
        for (let [this_id, timestamp] of Object.entries(downloads)) {
            if (timestamp < now-7*24*3600*1000) { // remove entries older then ~one week from db
                indexedDB.deleteDatabase(this_id); // it will not throw error if there is no db
                delete downloads[this_id];
            }
            if (this_id == id) delete downloads[this_id];
        }
    }
    downloads[id] = now;
    localStorage.setItem('downloads', JSON.stringify(downloads));
}


async function download(id) {
    progress.initiate(id);

    cleanupDB(id);

    let chapter = await chapter_info(id).catch(e => progress.error(e, id));
    chapter.id = id;

    progress.start(id, chapter.pages.length);

    const previous_download = await openDB(chapter).catch(console.error);
    // true if db with chapter id is existing, false if created new db
    // needs to get firstly repsonse from openDB promise to understand if it is new db or old one
    // only then can we define pages, because idb onsuccess event will be called even when creating new db
    // but even though it will be called, the promise is resolved by onupgradeneeded event

    const pages = await new Promise((resolve, reject) => {
        if (previous_download) {
            let to_download = [];
            function cursorOnSaved(status, cursor_callback, exit_callback = () => void(0)) {
                const request = () => chapter.db.transaction("downloads").objectStore("downloads").index("saved");
                request().openCursor(IDBKeyRange.only(status ? 1 : 0)).onsuccess = event => {
                    const cursor = event.target.result;
                    cursor ? (() => { cursor_callback(); cursor.continue(); })() : exit_callback();
                }
            }
            cursorOnSaved(true, () => { progress.update(chapter.id); progress.update(chapter.id); });
            cursorOnSaved(false, () => to_download.push(event.target.result.value.page), () => resolve(to_download));
        } else {
            resolve(chapter.pages);
        }
    }).catch(console.error);


    /* load manga images one after another, waiting for previous image load to start next */
    /* start image convertion into data right after this image load, without wait for previous image convertion to finish */
    /* image convertion into data and it's consequent save into indexedDB are processed in worker. so it's messages queue === convertions queue */
    /* zip generation(or any other task after this) starts only after all images were converted and saved */
    function process() {
        return Promise.resolve(
            pages.reduce(
                (queueStart, page) => queueStart.then(
                    queue => load(page, chapter).then( // first thread
                        (img) => queue.concat(save(img, chapter)) // second thread
                    )
                ),
                (async (queue = []) => queue)()
            )
        )
        .then(promises => Promise.all(promises)) // wait for all tasks here
        .catch(e => progress.error(e, id))
    }


    async function generate_zip() { // generate and download zip
        console.log(`began to generate and download zip`);
        const zip = new JSZip();

        const add_data = () => new Promise((resolve, reject) => {
            const get_data = chapter.db.transaction("downloads").objectStore("downloads").openCursor();
            get_data.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const data = event.target.result.value;

                    zip.file(`${data.sorting_name}.${data.blob.type.match(/(?<=image\/)\w+$/)}`, data.blob);
                    console.log(`${data.sorting_name}.${data.extension} is inside archive with ${data.blob.size} bites`);

                    cursor.continue();
                } else {
                    resolve();
                }
            }
            get_data.onerror = e => reject(e);
        });

        add_data().then(async _ => {
            await zip.generateAsync({ type: "blob" }).then(file => {
                console.log(`generated zip`);
                const a = document.createElement('a');
                a.href = URL.createObjectURL(file);
                a.type = 'application/zip';
                a.target = '_blank';
                a.download = `${document.title.match(/^.+(?=\s\(Title)/)} ${chapter.title}.zip`;
                a.click();
                a.remove();
                URL.revokeObjectURL(file);

                progress.complete(id);
                chapter.db.close(); // remove db on success
                indexedDB.deleteDatabase(chapter.id);
            }).catch(e => progress.error(e, id));
            await new Promise(r => setTimeout(r, 3e3)); // give time to save file
        });
    }
    const iframe = document.body.appendChild(
        Object.assign(document.createElement('iframe'), {
            height: 0,
            name: `frame${id}`,
            onload: e => process().then(generate_zip).catch(e => progress.error(e, id)), // start process
            src: `${chapter.src}`, // overcome CORS image-into-canvas issue by working in subdomain. ignore 403
            style: 'display: none;',
            tabindex: '-1',
            width: 0,
        })
    );
}


function create_btn(parent) {
    const btn = document.createElement("span");
    const id = parent.dataset.id;

    btn.style = "cursor: pointer; position: absolute; left: 3px;";
    btn.title = `Download chapter`;
    btn.id = `btn${id}`;
    btn.innerText = "\u2B73";
    btn.onclick = download.bind(this, id);

    parent.prepend(btn);
}

// create download button in each chpter row
document.addEventListener('DOMContentLoaded', _ => {
    Array.from(document.querySelectorAll('.chapter-row[data-chapter]')).map(row => create_btn(row))
});

})()
