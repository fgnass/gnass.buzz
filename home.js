// Home page logic. Bundled into buzz.js, which calls enter() whenever the home
// route becomes active (initial load or SPA navigation). All DOM access happens
// inside enter() — the module also loads on /projects, where these elements
// don't exist. Shared helpers (buzz, palette, resize) arrive via `api` so this
// module never imports buzz.js (no circular dependency).

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let ro = null; // ResizeObserver on the hero; at most one is live at a time

export function enter(initial, api) {
  const hero = document.getElementById('hero');
  const lines = [...hero.querySelectorAll('.line')];
  const kicker = document.querySelector('.kicker');
  const info = document.querySelector('.info');

  // derive the font size from the viewport HEIGHT (so name + info fit), then
  // optimize the wdth axis per line so both lines reach the same target width
  // flush. Filling the full width is not required.
  function fit() {
    const vw = hero.clientWidth;

    // 1a) desired font size from the available height
    const reserve = kicker.offsetHeight + info.offsetHeight + 150; // paddings/gaps, rough
    const fsH = (window.innerHeight - reserve) / 2 / 0.9;

    // 1b) width cap: the widest line at wdth 100 must not exceed the viewport
    //     → prevents overflow on narrow, tall screens.
    lines.forEach((l) => {
      l.style.setProperty('--lw', 100);
      l.style.fontSize = '100px';
    });
    let widest = 0;
    for (const l of lines)
      widest = Math.max(widest, l.getBoundingClientRect().width);
    const fsW = (vw / widest) * 100;

    const fs = clamp(Math.min(fsH, fsW), 40, 320);
    lines.forEach((l) => (l.style.fontSize = fs.toFixed(1) + 'px'));

    // 2) target width: as wide as the narrowest line can reach (wdth 151),
    //    capped to the viewport → both lines can hit it flush.
    let target = vw;
    for (const l of lines) {
      l.style.setProperty('--lw', 151);
      target = Math.min(target, l.getBoundingClientRect().width);
    }

    // 3) per line, drive the wdth axis to the target width via binary search
    for (const l of lines) {
      let lo = 25,
        hi = 151;
      for (let i = 0; i < 18; i++) {
        const mid = (lo + hi) / 2;
        l.style.setProperty('--lw', mid);
        l.getBoundingClientRect().width < target ? (lo = mid) : (hi = mid);
      }
      l.style.setProperty('--lw', ((lo + hi) / 2).toFixed(2));
    }
  }

  // email: JS conversion obfuscation (spencermortensen.com/articles/email-obfuscation).
  // The address never appears as a user@domain.tld pattern in the HTML source —
  // the parts are kept apart and only assembled here at runtime, so HTML-only
  // harvesters that can't execute JS find nothing to scrape.
  const mail = document.getElementById('email');
  if (mail) {
    const user = 'felix',
      domain = ['gnass', 'buzz'].join('.');
    mail.href = 'mailto:' + user + String.fromCharCode(64) + domain;
  }

  // clicking the name re-rolls the palette and buzzes (the click is a user
  // gesture, so the sound is allowed to play; samples alternate in playBuzz).
  // hero is a fresh element on every entry (the router replaces <body>), so this
  // never stacks duplicate listeners.
  hero.addEventListener('click', () => {
    api.rollPalette();
    api.buzz();
  });

  // keep the type fitted across viewport resizes and hero width changes
  api.setResize(fit);
  ro && ro.disconnect();
  (ro = new ResizeObserver(fit)).observe(hero);

  // fit the type, then a silent buzz so the name settles in. On an SPA entry the
  // click already played the sound; re-roll the palette for a fresh look.
  if (!initial) api.rollPalette();
  const start = () => {
    fit();
    api.trigger(1);
  };
  document.fonts && document.fonts.ready
    ? document.fonts.ready.then(start)
    : start();
}
