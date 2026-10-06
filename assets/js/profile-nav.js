/* Section rail on faculty profiles (_layouts/faculty-profile.html): marks the
 * .fp-nav-link for the section currently in view. Decorative only; every rail
 * entry is an ordinary same-page link that works without it.
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
