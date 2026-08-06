/* Open external links in a new tab.
 *
 * Links that leave the site open in a new tab; links between pages of this site
 * navigate normally, so the Back button keeps working and browsing the faculty
 * directory does not accumulate a tab per profile.
 *
 * This runs on the rendered DOM rather than being baked into each template, so
 * it stays one rule instead of a target attribute repeated across a dozen
 * layouts and 300+ pages — and so it also covers links inside prose, which no
 * template controls.
 *
 * Each converted link gets a visually-hidden "(opens in a new tab)", because a
 * screen-reader user otherwise has no way to know the window is about to
 * change (WCAG 2.2 SC 3.2.5).
 */
(function () {
  'use strict';

  // Same-origin links navigate in place. Flip to false to send every link to a
  // new tab, including internal ones.
  var EXTERNAL_ONLY = true;

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

    if (EXTERNAL_ONLY && a.host === window.location.host) return true;

    return false;
  }

  function convert(a) {
    a.setAttribute('target', '_blank');

    // rel: noopener severs window.opener so the new page cannot script this
    // one. Preserve any rel the author already set rather than clobbering it.
    var rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
    if (rel.indexOf('noopener') === -1) rel.push('noopener');
    a.setAttribute('rel', rel.join(' '));

    // Announce it. Skipped where the author already said so (the Apply button),
    // and where the link has no text of its own to append to — an icon link
    // carries its name on aria-label, which this would not reach.
    if (a.querySelector('.visually-hidden')) return;
    if (a.hasAttribute('aria-label')) return;
    if (!a.textContent.trim()) return;

    var note = document.createElement('span');
    note.className = 'visually-hidden';
    note.textContent = ' (opens in a new tab)';
    a.appendChild(note);
  }

  var links = document.querySelectorAll('a[href]');
  for (var i = 0; i < links.length; i++) {
    if (!skip(links[i])) convert(links[i]);
  }
})();
