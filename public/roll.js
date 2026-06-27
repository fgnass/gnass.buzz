// Pre-paint palette pick — the one thing that must run before first paint, so
// the home page paints in its final colours with no flash. It can't be a
// (deferred) module without reintroducing that flash, so it stays a tiny
// blocking classic script. It only picks an index and flips data-pal/data-inv
// onto <html>; the colours themselves live in palette.css, and subsequent
// re-rolls are handled by buzz.js. Keep the count in sync with palette.css.
(function () {
  var el = document.documentElement;
  var n = 18,
    k = Math.floor(Math.random() * n);
  el.dataset.pal = k;
  if (Math.random() < 0.5) el.setAttribute('data-inv', '');
  // mirror the just-picked --bg into theme-color so the mobile address bar is
  // tinted from the first paint. palette.css is a blocking sheet above this
  // script, so --bg already resolves here. Re-rolls/navigation are handled in
  // buzz.js (syncThemeColor).
  var m = document.querySelector('meta[name="theme-color"]');
  if (!m) {
    m = document.createElement('meta');
    m.name = 'theme-color';
    document.head.appendChild(m);
  }
  m.content = getComputedStyle(el).getPropertyValue('--bg').trim();
})();
