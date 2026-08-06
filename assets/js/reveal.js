/* Scroll reveal + count-up statistics.
 *
 * Both effects share one IntersectionObserver and one hard rule: the page is
 * complete without them. Elements are visible and numbers are already at their
 * final value in the HTML; this file only adds the *start* state, and only
 * after confirming it can finish the job. A blocked script, an old browser or
 * reduced-motion all fall back to the finished page rather than a blank one.
 */
(function () {
  'use strict';

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // No observer support means no way to know when to reveal, so never hide.
  // If this bails, the head script's .js-reveal must not be on <html> — the
  // two share these exact guards. Belt and braces: strip it if we got here
  // with the class set, so nothing can be left permanently invisible.
  if (!('IntersectionObserver' in window) || reduced) {
    document.documentElement.classList.remove('js-reveal');
    return;
  }

  var root = document.documentElement;

  /* --- Section reveal ---------------------------------------------------
   * The start state is already armed: the inline script in <head> put
   * .js-reveal on <html> before the first paint, using the same two guards as
   * above. If those guards ever diverge, the page can hide content it never
   * reveals — keep them identical.
   */
  var targets = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  if (targets.length) {
    targets.forEach(function (el) {
      // Stagger siblings within a group. Capped: past a few hundred ms a
      // stagger stops reading as rhythm and starts reading as a slow page.
      var i = +(el.getAttribute('data-reveal-index') || 0);
      if (i) el.style.setProperty('--reveal-delay', Math.min(i * 60, 240) + 'ms');
    });

    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        revealer.unobserve(entry.target);   // one-shot; never re-hide on scroll back
      });
    }, {
      // Start the reveal slightly before the element's top edge arrives, so it
      // is settling as it comes into view rather than starting once it is
      // already fully on screen.
      rootMargin: '0px 0px -12% 0px',
      threshold: 0
    });

    targets.forEach(function (el) { revealer.observe(el); });

    /* Safety net.
     *
     * The observer is the mechanism; this is the guarantee. Hiding content
     * behind a script means a bug in that script makes content permanently
     * invisible, which is a far worse outcome than a missing animation — so
     * the same "is it in the viewport" test also runs on load and on scroll,
     * independently of IntersectionObserver firing at all.
     *
     * Cheap: rAF-throttled, reads only getBoundingClientRect, and detaches
     * itself the moment every target has been revealed.
     */
    var ticking = false;

    function sweep() {
      ticking = false;
      var remaining = 0;
      targets.forEach(function (el) {
        if (el.classList.contains('is-revealed')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-revealed');
        else remaining++;
      });
      if (!remaining) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(sweep);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('load', sweep);
    sweep();   // whatever is on screen right now
  }

  /* --- Count-up numbers -------------------------------------------------- */

  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count-to]'));
  if (!counters.length) return;

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function run(el) {
    var target = parseFloat(el.getAttribute('data-count-to'));
    if (!isFinite(target)) return;

    // Decimal places are taken from the target so 5.4 does not animate through
    // integers and land on "5".
    var raw = el.getAttribute('data-count-to');
    var dot = raw.indexOf('.');
    var places = dot === -1 ? 0 : raw.length - dot - 1;
    var suffix = el.getAttribute('data-count-suffix') || '';

    var DURATION = 1100;
    var started = 0;

    function frame(now) {
      if (!started) started = now;
      var t = Math.min((now - started) / DURATION, 1);
      var value = target * easeOut(t);
      el.textContent = value.toFixed(places) + suffix;
      if (t < 1) window.requestAnimationFrame(frame);
      // The final frame writes the exact target rather than an eased
      // approximation, so the number on screen is the number in the data.
      else el.textContent = target.toFixed(places) + suffix;
    }
    window.requestAnimationFrame(frame);
  }

  var counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      counterObserver.unobserve(entry.target);
      run(entry.target);
    });
  }, { threshold: 0.4 });

  counters.forEach(function (el) {
    // Zero out only now that we know the animation will run. Until this line
    // the DOM holds the real figure.
    el.textContent = '0' + (el.getAttribute('data-count-suffix') || '');
    counterObserver.observe(el);
  });
})();
