(function () {
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.querySelector('.nav-menu');

  if (!toggle || !menu) return;

  toggle.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  // Mobile: tap dropdown parent to open sub-menu
  document.querySelectorAll('.nav-item.has-dropdown > .nav-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (window.innerWidth <= 680) {
        e.preventDefault();
        link.closest('.nav-item').classList.toggle('open');
      }
    });
  });

  // Close menu on outside click
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.navbar')) {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', false);
    }
  });
})();
