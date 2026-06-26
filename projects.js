// Projects page logic. Bundled into buzz.js, which calls enter() whenever the
// projects route becomes active. All DOM access happens inside enter() — the
// module also loads on the home page, where these elements don't exist. Shared
// helpers (buzz, resize, scroll) arrive via `api` so this module never imports
// buzz.js (no circular dependency).

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const HOME_RESERVE = 270; // ≈ the home page's kicker+info vertical reserve
const NAME_ASPECT = 3.2; // home name width ÷ font-size (a 5-char word at wdth 151)

export function enter(initial, api) {
  // Fit the PROJECTS title to match the home name. The home name is *height*
  // driven: its font-size comes from the viewport height and the block ends up
  // ~810px wide (its narrowest line maxed at wdth 151) — it does NOT span the
  // page. We mirror that: size from height, then set a target width = the home
  // name's width/size aspect × font-size, capped to the available width. So the
  // title stays limited on wide screens and scales with height the same way.
  const intro = document.querySelector('.intro');
  const title = intro.querySelector('h1');
  const titleBox = title.parentElement; // .title, full content width
  // Measure at the resting weight (wght 680, no slant) so an in-flight buzz
  // can't skew the fit; afterwards the axes are handed back to the buzz engine.
  const setW = (w) =>
    (title.style.fontVariationSettings = `"opsz" 144,"slnt" 0,"wght" 680,"wdth" ${w}`);

  function fitTitle() {
    const availW = titleBox.clientWidth;

    // 1a) size from the available height, same formula/scale as the home name
    const fsH = (window.innerHeight - HOME_RESERVE) / 2 / 0.9;
    // 1b) width cap: even fully condensed (wdth 25) the word must not overflow
    setW(25);
    title.style.fontSize = '100px';
    const fsW = (availW / title.getBoundingClientRect().width) * 100;
    const fs = clamp(Math.min(fsH, fsW), 40, 320);
    title.style.fontSize = fs.toFixed(1) + 'px';

    // 2) target width = the home name's width, capped to what's available
    const target = Math.min(availW, fs * NAME_ASPECT);

    // 3) binary-search the wdth axis to the target width
    let lo = 25,
      hi = 151;
    for (let i = 0; i < 18; i++) {
      const m = (lo + hi) / 2;
      setW(m);
      title.getBoundingClientRect().width < target ? (lo = m) : (hi = m);
    }
    // hand the axes back to the stylesheet (slnt/wght driven by the buzz engine)
    title.style.fontVariationSettings = '';
    title.style.setProperty('--lw', ((lo + hi) / 2).toFixed(2));
  }
  api.setResize(fitTitle);

  // scroll hint: click scrolls to the first project; fades out once scrolled.
  const cue = intro.querySelector('.scroll-cue');
  cue.addEventListener('click', () => {
    document.querySelector('.band')?.scrollIntoView({ behavior: 'smooth' });
  });
  cue.classList.remove('is-hidden');
  api.setScroll(() => cue.classList.toggle('is-hidden', scrollY > 40));

  // fit + buzz the PROJECTS title. On an SPA entry the click already played the
  // sound and the vibrato carries over; this keeps it lively on a direct load too.
  const start = () => {
    fitTitle();
    api.trigger(1);
  };
  document.fonts && document.fonts.ready
    ? document.fonts.ready.then(start)
    : start();
}
