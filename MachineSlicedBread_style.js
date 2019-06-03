// ==UserScript==
// @name         MachineSlicedBread style changes
// @version      0.1
// @author       HK49
// @license      MIT
// @include      http://www.machineslicedbread.xyz/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const i = '!important'; // shortcut
    const css = { // shortcut to css rules
        bg: c => `background: ${c}`,
        cl: c => `color: ${c}`,
        hide: 'display: none',
    };


    const mono = l => `hsl(28, 50%, ${l}%)`; // monochromatic scheme | primary color
    const burgundy = '#900020'; // secondary analogic color

    // scheme
    const background = css.bg(mono(12));
    const page = {
        day:   css.bg(mono(68)),
        night: css.bg(mono(12)),
    };
    const color = {
        day:   css.cl(mono(12)),
        night: css.cl(mono(58)),
    };

    // element selector for css
    const node = {
        back: [
            '#page',
        ],
        page: [
            '#content',
        ],
        pagewrap: [
            '#primary',
        ],
        text: [
            'body',
            '.entry-content p',
        ],
        clutter: [
            '.site-branding',
            '#headerright',
            '#secondary',
        ],
    };

    const style = document.createElement('style');
    style.type = "text/css";
    style.id = "tampermonkey";
    style.innerText += `${node.back} { box-shadow: inset 0 0 30px 10px #000; } `;
    style.innerText += `${node.text} { font: 24px/1.6 'Open Sans', sans-serif; } `;
    style.innerText += `${node.page} { width: 20cm; margin: 0 auto; padding: 1.5cm; box-shadow: 0 0 30px 10px #000; } `;
    style.innerText += `${node.pagewrap} { float: none; margin: 0; width: 100%; left: 0; right: 0; } `;
    style.innerText += `${node.clutter} { ${css.hide}; } `;
    style.innerText += `a, a:hover { ${css.cl(burgundy)}; } `;
    style.innerText += `::selection, .section.bg-dark { ${css.bg(burgundy)}; color: inherit; } `;

    // scrollbar
    const scroll = '::-webkit-scrollbar';
    style.innerText += `${scroll} { width: 7px; height: 7px; } `;
    style.innerText += `${scroll}-thumb { ${css.bg(mono(33))}; } `;
    style.innerText += `${scroll}-corner { ${css.hide}; } `;

    // daytime
    style.innerText += `html, ${node.back} { ${background}; } `;
    style.innerText += `${node.back} { background: repeating-linear-gradient(0deg, ${mono(12)}, ${mono(12)} 20px, ${mono(18)} 20px, ${mono(18)} 40px); } `;
    style.innerText += `${node.page} { ${page.day}; } `;
    style.innerText += `${node.text} { ${color.day}; } `;

    // nighttime
    //

    const interval = setInterval(_ => {
        document.head.appendChild(style);
        if (document.readyState === "complete") {
            clearInterval(interval);

            const chp_nav = document.querySelector(".entry-content > p:last-child");
            const [prev, next] = [chp_nav.firstChild, chp_nav.lastChild];
            prev.href = location.pathname.replace(/(.+?)(\d+)\/$/, (a, b, c) => `${b}${Number(c) - 1}/`);
            next.href = location.pathname.replace(/(.+?)(\d+)\/$/, (a, b, c) => `${b}${Number(c) + 1}/`);
        }
    }, 60);
})();
