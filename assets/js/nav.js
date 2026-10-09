/* Primary navigation: the hamburger panel below the collapse breakpoint, and
 * the dropdown submenus.
 *
 * Dropdown parents are real links at every width (About has no child that
 * links to /about/), so a sibling button opens and closes each submenu and
 * carries aria-expanded.
 *
 * On the desktop bar, CSS opens a submenu on hover and focus-within, which
 * keeps it usable without JavaScript. This script mirrors that into
 * aria-expanded, and Escape (or the button) dismisses an open submenu by
 * adding .dismissed until the pointer and focus leave the item. Below the
 * breakpoint the .open class alone governs the submenu.
 *
 * The 1366px query must match the collapse breakpoint in tpcb.css.
 */
(function () {
  'use strict';

  var navbar = document.querySelector('.navbar');
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('nav-menu');

  if (!navbar || !toggle || !menu) return;

  var desktop = window.matchMedia('(min-width: 1366px)');
  var dropdowns = Array.prototype.slice.call(navbar.querySelectorAll('.nav-item.has-dropdown'));

  function setMenu(open) {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function buttonOf(item) {
    return item.querySelector('.dropdown-toggle');
  }

  function isOpen(item) {
    if (!desktop.matches) return item.classList.contains('open');
    return !item.classList.contains('dismissed') &&
      (item.matches(':hover') || item.matches(':focus-within'));
  }

  function syncExpanded(item) {
    var btn = buttonOf(item);
    if (btn) btn.setAttribute('aria-expanded', isOpen(item) ? 'true' : 'false');
  }

  function closeAllDropdowns() {
    dropdowns.forEach(function (item) {
      item.classList.remove('open');
      syncExpanded(item);
    });
  }

  toggle.addEventListener('click', function () {
    setMenu(!menu.classList.contains('open'));
  });

  dropdowns.forEach(function (item) {
    var btn = buttonOf(item);
    if (!btn) return;

    btn.addEventListener('click', function () {
      if (desktop.matches) {
        item.classList.toggle('dismissed', isOpen(item));
      } else {
        var open = !item.classList.contains('open');
        closeAllDropdowns();
        item.classList.toggle('open', open);
      }
      syncExpanded(item);
    });

    // Read settled states: hiding a hovered submenu can itself cause mouseleave.
    // Keep Escape's dismissal while either pointer or keyboard focus remains.
    function later() {
      window.setTimeout(function () {
        if (!item.matches(':hover') && !item.matches(':focus-within')) {
          item.classList.remove('dismissed');
        }
        syncExpanded(item);
      }, 0);
    }

    item.addEventListener('mouseenter', later);
    item.addEventListener('focusin', later);
    item.addEventListener('mouseleave', later);
    item.addEventListener('focusout', later);
  });

  desktop.addEventListener('change', function () {
    dropdowns.forEach(function (item) { item.classList.remove('dismissed'); });
    closeAllDropdowns();
  });

  // Escape closes whatever is open and returns focus to the control that owns it.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var openItem = dropdowns.filter(isOpen)[0];
    if (openItem) {
      var btn = buttonOf(openItem);
      var submenu = openItem.querySelector('.dropdown-menu');
      // On the desktop bar focus moves only if it was inside the submenu that
      // is closing; on the parent link or the button it can stay where it is.
      var moveFocus = desktop.matches ? submenu.contains(document.activeElement) : true;
      if (desktop.matches) openItem.classList.add('dismissed');
      openItem.classList.remove('open');
      if (btn && moveFocus) btn.focus();
      syncExpanded(openItem);
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
