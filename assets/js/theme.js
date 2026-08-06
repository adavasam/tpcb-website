/* Theme toggle.
 *
 * The theme itself is already decided by the time this runs — the inline block
 * in <head> sets data-theme on <html> before first paint, which is what stops
 * a dark-mode visitor seeing a white flash. This file owns everything after
 * that: the button, the persisted choice, and telling the hero canvas.
 *
 * Two things here are a contract with code elsewhere:
 *
 *   STORAGE_KEY and the resolution order (stored choice, else system
 *   preference) are duplicated in that inline block. They have to agree, or
 *   the pre-paint theme and the toggle's idea of the theme diverge.
 *
 *   THEME_EVENT is listened for by assets/js/hero-atoms.js, which reads its
 *   colours from CSS custom properties once at init and needs to re-read them
 *   when they change. Anything else that caches a token value should listen
 *   too rather than poll.
 *
 * Storage is wrapped everywhere it is touched: Safari's private mode throws on
 * write, and a theme toggle that throws would leave the page half-switched.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'tpcb-theme';
  var THEME_EVENT = 'tpcb:themechange';

  var root = document.documentElement;
  var button = document.getElementById('theme-toggle');
  if (!button) return;

  var media = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  function current() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function stored() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return (v === 'light' || v === 'dark') ? v : null;
    } catch (e) {
      return null;
    }
  }

  /* The label states the ACTION, not the state, and the icon shows the same
     destination — so a screen reader hearing "switch to dark theme" and an eye
     seeing a moon are being told the same thing. */
  function syncButton() {
    var next = current() === 'dark' ? 'light' : 'dark';
    button.setAttribute('aria-label', 'Switch to ' + next + ' theme');
    button.setAttribute('title', 'Switch to ' + next + ' theme');
  }

  function apply(theme) {
    if (theme === current()) return;
    root.setAttribute('data-theme', theme);
    syncButton();
    // Fires after the attribute is set, so a listener that reads computed
    // styles sees the new palette rather than the old one.
    document.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme: theme } }));
  }

  button.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      // Non-fatal: the theme still switches, it just will not survive a reload.
    }
    apply(next);
  });

  /* Follow the OS only while the visitor has never chosen for themselves.
     Once they have, their choice outranks the system for good — re-checking
     `stored()` on each change rather than caching it means a choice made in
     another tab is honoured here too. */
  if (media) {
    var onSystemChange = function (e) {
      if (!stored()) apply(e.matches ? 'dark' : 'light');
    };
    if (media.addEventListener) media.addEventListener('change', onSystemChange);
    else if (media.addListener) media.addListener(onSystemChange);   // Safari < 14
  }

  syncButton();
})();
