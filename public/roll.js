// Pre-paint palette pick — the one thing that must run before first paint, so
// the home page paints in its final colours with no flash. It can't be a
// (deferred) module without reintroducing that flash, so it stays a tiny
// blocking classic script. It only picks an index and flips data-pal/data-inv
// onto <html>; the colours themselves live in palette.css, and subsequent
// re-rolls are handled by buzz.js. Keep the count in sync with palette.css.
(function () {
  var n = 16,
    k = Math.floor(Math.random() * n);
  document.documentElement.dataset.pal = k;
  if (Math.random() < 0.5)
    document.documentElement.setAttribute('data-inv', '');
})();
