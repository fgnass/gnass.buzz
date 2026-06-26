/* Shared engine for the whole site: the buzz animation, the buzz sounds, the
   palette re-roll, a tiny SPA router, and per-route page logic. Loaded as a
   deferred ES module in the <head> of every page and bundled by Vite.

   The first palette pick happens before this runs — a tiny blocking classic
   script (public/roll.js) sets data-pal on <html> so the page paints in its
   final palette.css colours with no flash. This module handles everything
   after that: re-rolls, the buzz, and dispatching to the active page. */

import { enter as enterHome } from './home.js';
import { enter as enterProjects } from './projects.js';

const root = document.documentElement.style;
const docEl = document.documentElement;

/* ---- palette re-roll (home page) ---------------------------------------
   The colours live in palette.css, keyed by data-pal (index) and, when
   inverted, data-inv on <html>. We only pick an index + inversion here and flip
   the attributes; never repeat the exact same combination twice in a row.
   lastKey is seeded from the pre-paint pick so the first re-roll differs from
   what the page loaded with. */
const PALETTE_COUNT = 16; // keep in sync with palette.css + public/roll.js
const keyOf = () =>
  docEl.dataset.pal == null
    ? -1
    : +docEl.dataset.pal * 2 + (docEl.hasAttribute('data-inv') ? 1 : 0);
let lastKey = keyOf();
function rollPalette() {
  let key;
  do {
    key =
      Math.floor(Math.random() * PALETTE_COUNT) * 2 +
      (Math.random() < 0.5 ? 1 : 0);
  } while (key === lastKey && PALETTE_COUNT > 1);
  lastKey = key;
  docEl.dataset.pal = key >> 1;
  docEl.toggleAttribute('data-inv', (key & 1) === 1);
  syncThemeColor(); // keep the mobile chrome in step with the new --bg
}

/* Mirror the current resolved --bg into <meta name="theme-color"> so the mobile
   browser chrome matches the page. Called after every entry (covers re-rolls on
   home and the fixed /projects colour). roll.js does the same pre-paint. */
function syncThemeColor() {
  const bg = getComputedStyle(docEl).getPropertyValue('--bg').trim();
  if (!bg) return;
  let m = document.querySelector('meta[name="theme-color"]');
  if (!m) {
    m = document.createElement('meta');
    m.name = 'theme-color';
    document.head.appendChild(m);
  }
  m.content = bg;
}

/* ---- buzz: short, decaying vibrato on the slant + weight axes -----------
   Drives the --slnt / --wght custom properties on :root; any title that reads
   them in its font-variation-settings buzzes in sync. */
let energy = 0,
  t = 0,
  running = false;
const baseWght = 680;
function loop() {
  t += 1;
  const w1 = Math.sin(t * 0.85) * 0.6 + Math.sin(t * 1.97) * 0.4;
  const w2 = Math.sin(t * 1.3 + 1) * 0.6 + Math.sin(t * 2.4) * 0.4;
  root.setProperty('--slnt', (-energy * 5 + energy * 5 * w1).toFixed(2)); // -10..0
  root.setProperty('--wght', (baseWght + energy * 170 * w2).toFixed(0));
  energy *= 0.93;
  if (energy < 0.01) {
    running = false;
    root.setProperty('--slnt', '0');
    root.setProperty('--wght', baseWght);
    return;
  }
  requestAnimationFrame(loop);
}
function trigger(v = 1) {
  energy = Math.max(energy, v);
  if (!running) {
    running = true;
    requestAnimationFrame(loop);
  }
}

/* ---- two buzz sounds, played alternately, via Web Audio -----------------
   HTMLAudioElement.play() has audible start latency: it decodes + buffers on
   every play and resolves a promise before any sound comes out. Instead we
   decode both clips once into AudioBuffers and fire a fresh buffer-source node
   per buzz, which starts synchronously with ~no latency. The context begins
   suspended (autoplay policy) and is resumed on the first buzz, which always
   rides a user gesture (click / popstate). */
const SRC = ['/buzz1.mp3', '/buzz2.mp3'];
const AC = window.AudioContext || window.webkitAudioContext;
const actx = AC ? new AC() : null;
const buffers = [];
if (actx)
  SRC.forEach((url, i) =>
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((b) => actx.decodeAudioData(b))
      .then((buf) => (buffers[i] = buf))
      .catch(() => {}),
  );

let si = 0;
function playBuzz() {
  const i = si;
  si ^= 1;
  if (actx && buffers[i]) {
    if (actx.state === 'suspended') actx.resume();
    const src = actx.createBufferSource();
    src.buffer = buffers[i];
    src.connect(actx.destination);
    src.start();
    return;
  }
  // no Web Audio, or a buzz before decode finished → plain element fallback
  new Audio(SRC[i]).play().catch(() => {});
}

// sound + animation in one shot (used on the CTA button and on navigation)
function buzz() {
  playBuzz();
  trigger(1);
}

/* ---- per-route page logic ----------------------------------------------
   Each page module exports enter(initial, api). One delegated resize/scroll
   listener is kept here and points at the active page's handler; the router
   resets them on every entry so a page only ever opts into what it needs. */
let onResize = null,
  onScroll = null;
addEventListener('resize', () => {
  if (onResize) onResize();
});
addEventListener(
  'scroll',
  () => {
    if (onScroll) onScroll();
  },
  { passive: true },
);

const api = {
  trigger,
  buzz,
  rollPalette,
  setResize(fn) {
    onResize = fn;
  },
  setScroll(fn) {
    onScroll = fn;
  },
};

const ROUTES = new Set(['/', '/projects']);
const norm = (pathname) => pathname.replace(/\/+$/, '') || '/';
const PAGES = { '/': enterHome, '/projects': enterProjects };

function enter(initial) {
  onResize = onScroll = null; // page re-opts into what it needs
  const page = PAGES[norm(location.pathname)];
  if (page) page(initial, api);
  syncThemeColor(); // home's enter() re-rolls first, so --bg is settled here
}

/* ---- tiny SPA router ----------------------------------------------------
   Internal navigation between / and /projects is done by fetch + History API
   instead of a full reload, so the buzz sound (started on the click gesture)
   keeps playing and the title's vibrato carries across the swap. */

// Reconcile the <head> stylesheets with the destination's: add the ones it has
// that we don't (waiting for them to load so the page never paints unstyled),
// then drop the ones it no longer needs. Shared sheets (e.g. palette.css, same
// hashed href on both pages) match and stay put — so this naturally swaps the
// per-page stylesheet without depending on an id, which Vite strips on build.
const sheetHref = (l) => l.getAttribute('href');
async function syncStylesheets(doc) {
  const sel = 'link[rel="stylesheet"]';
  const cur = [...document.querySelectorAll(sel)];
  const next = [...doc.querySelectorAll(sel)];
  const have = new Set(cur.map(sheetHref));
  const want = new Set(next.map(sheetHref));

  await Promise.all(
    next
      .filter((l) => !have.has(sheetHref(l)))
      .map(
        (l) =>
          new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheetHref(l);
            link.onload = link.onerror = resolve;
            document.head.appendChild(link);
          }),
      ),
  );

  cur.filter((l) => !want.has(sheetHref(l))).forEach((l) => l.remove());
}

async function navigate(pathname, { push = true } = {}) {
  // Fetch the canonical served path: each route is served by its index.html, so
  // non-root routes need the trailing slash (/projects → /projects/). The clean
  // path (no slash) is what we keep in the address bar via pushState.
  const route = norm(pathname);
  const fetchUrl = route === '/' ? '/' : route + '/';
  let html;
  try {
    const res = await fetch(fetchUrl, {
      headers: { 'X-Requested-With': 'fetch' },
    });
    if (!res.ok) throw new Error(res.status);
    html = await res.text();
  } catch (e) {
    location.assign(pathname); // give up gracefully → full navigation
    return;
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');

  await syncStylesheets(doc); // load the destination styles before swapping
  document.title = doc.title;

  // drop the home palette so the destination page's own theme applies: home
  // re-rolls in enter(), /projects uses its fixed colours. Keep --slnt / --wght
  // so the in-flight buzz carries over to the new title.
  delete docEl.dataset.pal;
  docEl.removeAttribute('data-inv');

  document.body.replaceWith(doc.body); // adopts the parsed body (no scripts)
  if (push) history.pushState({}, '', pathname);
  scrollTo(0, 0);
  enter(false); // SPA entry → fit, buzz, re-roll
}

addEventListener('click', (e) => {
  if (
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey
  )
    return;
  const a = e.target.closest('a');
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !ROUTES.has(norm(url.pathname))) return;
  e.preventDefault();
  if (norm(url.pathname) === norm(location.pathname)) return; // already here
  buzz(); // gesture → sound is allowed to play
  navigate(url.pathname);
});

addEventListener('popstate', () => {
  buzz();
  navigate(location.pathname, { push: false });
});

// first load: a deferred module runs after the DOM is parsed, so just enter.
enter(true);
