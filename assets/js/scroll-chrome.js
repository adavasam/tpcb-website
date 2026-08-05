/* Scroll-driven page chrome: the progress hairline and the header's
 * at-rest/stuck states.
 *
 * Both are decorative. The bar duplicates what the scrollbar already says and
 * is aria-hidden; the header is legible in either state. So this file failing
 * to run costs nothing but polish — no content or navigation depends on it.
 *
 * One rAF-throttled scroll listener drives both, because two passive listeners
 * doing layout reads on the same frame is the classic way to make a page feel
 * heavier than it is.
 */
(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var bar = document.querySelector('.scroll-progress');
  if (!header && !bar) return;

  // Past this many pixels the header commits to its solid state. Deliberately
  // more than a trackpad's flick so a rubber-band bounce at the top does not
  // flicker it, and less than the nav's own height so it has settled before
  // anything can scroll underneath it.
  var STUCK_AT = 24;

  var ticking = false;
  var stuck = false;

  function read() {
    ticking = false;

    var y = window.pageYOffset || document.documentElement.scrollTop || 0;

    if (header) {
      var nowStuck = y > STUCK_AT;
      if (nowStuck !== stuck) {
        stuck = nowStuck;
        header.classList.toggle('is-stuck', stuck);
      }
    }

    if (bar) {
      // scrollHeight - clientHeight is the actual scrollable distance. It is 0
      // on a page shorter than the viewport, where a progress bar is meaningless
      // — leave it at zero rather than dividing by it.
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var pct = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      bar.style.transform = 'scaleX(' + pct + ')';
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(read);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  // Resizing changes the scrollable distance, which changes the ratio even
  // though the offset has not moved.
  window.addEventListener('resize', onScroll, { passive: true });

  read();   // reflect the position we loaded at, e.g. a #fragment or a restore
})();
