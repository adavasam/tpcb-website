/* External links open in a new tab; links within the site navigate normally.
 *
 * Runs on the rendered DOM, so it also covers links inside Markdown content.
 * Every link that opens a new tab, whether converted here or given
 * target="_blank" by a template, is told so to screen-reader users with a
 * visually hidden "(opens in a new tab)" (or an addition to its aria-label),
 * following WCAG technique G201.
 */
(function () {
  'use strict';

  // Never rewrite these: they are not navigations to another page, and giving
  // them a target either breaks them outright or strands the user.
  //   #foo            in-page anchors, including the skip link and the faculty
  //                   profile section nav — a new tab would lose the position
  //   mailto:/tel:    handed to an external app; a blank tab is left behind
  //   javascript:     not a navigation at all
  //   download        the browser handles the tab itself
  function skip(a) {
    if (a.hasAttribute('target')) return true;          // author already chose
    if (a.hasAttribute('download')) return true;
    if (a.classList.contains('skip-link')) return true;

    var raw = a.getAttribute('href');
    if (!raw || raw.charAt(0) === '#') return true;

    var scheme = (raw.split(':')[0] || '').toLowerCase();
    if (raw.indexOf(':') !== -1 &&
        scheme !== 'http' && scheme !== 'https') return true;

    // Same-page fragment written as a full URL.
    if (a.pathname === window.location.pathname &&
        a.search === window.location.search && a.hash) return true;

    if (a.host === window.location.host) return true;

    return false;
  }

  function convert(a) {
    a.setAttribute('target', '_blank');

    // noopener stops the new page scripting this one. Keep any rel already set.
    var rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
    if (rel.indexOf('noopener') === -1) rel.push('noopener');
    a.setAttribute('rel', rel.join(' '));
  }

  var NOTE = ' (opens in a new tab)';

  function announce(a) {
    if (/new tab/i.test(a.textContent + ' ' + (a.getAttribute('aria-label') || ''))) return;
    if (a.hasAttribute('aria-label')) {
      a.setAttribute('aria-label', a.getAttribute('aria-label') + NOTE);
      return;
    }
    if (!a.textContent.trim()) return;
    var note = document.createElement('span');
    note.className = 'visually-hidden';
    note.textContent = NOTE;
    a.appendChild(note);
  }

  var links = document.querySelectorAll('a[href]');
  for (var i = 0; i < links.length; i++) {
    if (!skip(links[i])) convert(links[i]);
    if (links[i].getAttribute('target') === '_blank') announce(links[i]);
  }
})();
