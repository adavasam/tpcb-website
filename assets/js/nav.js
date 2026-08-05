/* nav.js — primary navigation behaviour.
 *
 * The dropdown parents are real links and stay real links at every width. An
 * earlier version called preventDefault() on them below 680px to repurpose them
 * as disclosure toggles, which made /about/ unreachable from the nav entirely:
 * Enter on a link dispatches a click, so keyboard users were caught too, and
 * the About menu has no child pointing at /about/ (unlike Students, whose
 * "Student Directory" child happens to link to /students/). A sibling button
 * now owns opening and closing, and carries the aria-expanded state.
 */
(function () {
  'use strict';

  var navbar = document.querySelector('.navbar');
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('nav-menu');

  if (!navbar || !toggle || !menu) return;

  function setMenu(open) {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeAllDropdowns() {
    Array.prototype.forEach.call(
      navbar.querySelectorAll('.nav-item.has-dropdown.open'),
      function (item) {
        item.classList.remove('open');
        var btn = item.querySelector('.dropdown-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    );
  }

  toggle.addEventListener('click', function () {
    setMenu(!menu.classList.contains('open'));
  });

  Array.prototype.forEach.call(
    navbar.querySelectorAll('.nav-item.has-dropdown > .dropdown-toggle'),
    function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.nav-item');
        var open = !item.classList.contains('open');
        closeAllDropdowns();
        item.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  );

  // Escape closes whatever is open and returns focus to the control that owns it.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var openItem = navbar.querySelector('.nav-item.has-dropdown.open');
    if (openItem) {
      var btn = openItem.querySelector('.dropdown-toggle');
      closeAllDropdowns();
      if (btn) btn.focus();
      return;
    }
    if (menu.classList.contains('open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  // Tabbing out of the navbar closes the mobile panel, which would otherwise
  // stay open on top of the content the user just moved focus into.
  navbar.addEventListener('focusout', function (e) {
    if (!navbar.contains(e.relatedTarget)) {
      closeAllDropdowns();
      setMenu(false);
    }
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.navbar')) {
      closeAllDropdowns();
      setMenu(false);
    }
  });
})();
