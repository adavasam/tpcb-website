/* Section rail scroll-spy for the profile layouts.
 *
 * Marks the .fp-nav-link matching whichever section is currently in view. It
 * lived inline at the bottom of _layouts/faculty-profile.html; it is a file now
 * so the student profile can use the same rail without a second copy of it —
 * two copies of one behaviour is how the profile layouts drifted apart in the
 * first place.
 *
 * Loaded site-wide and exits immediately on every page that has no rail, which
 * is all of them but the profiles. Purely decorative: the sections are all
 * present and reachable without it, and each rail entry is an ordinary
 * same-page anchor that works with the script absent.
 */
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.fp-nav-link'));
  if (!links.length || !('IntersectionObserver' in window)) return;

  var map = {};
  var sections = [];
  links.forEach(function (link) {
    var id = link.getAttribute('href').slice(1);
    var section = document.getElementById(id);
    if (section) { map[id] = link; sections.push(section); }
  });

  function setActive(id) {
    links.forEach(function (link) {
      var on = link.getAttribute('href') === '#' + id;
      link.classList.toggle('is-active', on);
      if (on) { link.setAttribute('aria-current', 'true'); }
      else { link.removeAttribute('aria-current'); }
    });
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { setActive(entry.target.id); }
    });
  }, { rootMargin: '-25% 0px -65% 0px', threshold: 0 });

  sections.forEach(function (section) { observer.observe(section); });
})();
