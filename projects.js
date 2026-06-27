// Projects page logic. Bundled into buzz.js, which calls enter() whenever the
// projects route becomes active. All DOM access happens inside enter() — the
// module also loads on the home page, where these elements don't exist. Shared
// helpers (buzz, resize, scroll) arrive via `api` so this module never imports
// buzz.js (no circular dependency).

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const HOME_RESERVE = 270; // ≈ the home page's kicker+info vertical reserve
const NAME_ASPECT = 3.2; // home name width ÷ font-size (a 5-char word at wdth 151)

export function enter(initial, api) {
  // Fit the PROJECTS title exactly like the home name (see home.js fit): the
  // size is *height* driven, then each line's wdth axis is binary-searched so
  // both lines reach the same target width flush. The target is the home name's
  // width (NAME_ASPECT × size), capped to what's available — so "Weekend" /
  // "Projects" share the SAME max-width as "Felix" / "Gnass" and never spill
  // wider just because the words are longer.
  const intro = document.querySelector('.intro');
  const title = intro.querySelector('h1');
  const titleBox = title.parentElement; // .title, full content width
  const lines = [...title.querySelectorAll('.line')];
  // Measure a line at the resting weight (wght 680, no slant) and a given wdth
  // so an in-flight buzz can't skew the fit; the inline override is cleared in
  // step 3 so the stylesheet's buzz-driven axes take back over.
  const measure = (l, w) => {
    l.style.fontVariationSettings = `"opsz" 144,"slnt" 0,"wght" 680,"wdth" ${w}`;
    return l.getBoundingClientRect().width;
  };

  function fitTitle() {
    const availW = titleBox.clientWidth;

    // 1a) size from the available height, same formula/scale as the home name
    const fsH = (window.innerHeight - HOME_RESERVE) / 2 / 0.9;
    // 1b) width cap: even fully condensed (wdth 25) the widest line must not
    //     overflow → prevents overflow on narrow, tall screens.
    lines.forEach((l) => (l.style.fontSize = '100px'));
    let widest = 0;
    for (const l of lines) widest = Math.max(widest, measure(l, 25));
    const fsW = (availW / widest) * 100;
    const fs = clamp(Math.min(fsH, fsW), 40, 320);
    lines.forEach((l) => (l.style.fontSize = fs.toFixed(1) + 'px'));

    // 2) target width = the home name's width (NAME_ASPECT × size), capped to
    //    what's available → both lines condense to the same max-width as home.
    const target = Math.min(availW, fs * NAME_ASPECT);

    // 3) per line, binary-search the wdth axis to the target width
    for (const l of lines) {
      let lo = 25,
        hi = 151;
      for (let i = 0; i < 18; i++) {
        const m = (lo + hi) / 2;
        measure(l, m) < target ? (lo = m) : (hi = m);
      }
      // hand the axes back to the stylesheet (slnt/wght driven by the buzz engine)
      l.style.fontVariationSettings = '';
      l.style.setProperty('--lw', ((lo + hi) / 2).toFixed(2));
    }
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
  // Size synchronously, before the browser paints the (SPA-swapped) body, so the
  // title never flashes at the UA-default size first. On SPA entry from home the
  // webfont is already loaded, so this measures correctly; on a cold direct load
  // we re-fit once the real font metrics are in (fitTitle is idempotent, so the
  // warm case sees no jump).
  fitTitle();
  api.trigger(1);
  document.fonts && document.fonts.ready && document.fonts.ready.then(fitTitle);
}
