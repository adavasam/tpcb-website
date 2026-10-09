/* Search for the publications bibliography (_pages/publications.md).
 *
 * The bibliography is rendered in full by jekyll-scholar, grouped by year.
 * This only hides and shows entries, so without JavaScript the page is still
 * the complete record. The search form ships hidden and is shown here, once it
 * can actually search.
 */
(function () {
  'use strict';

  var wrapper = document.querySelector('.bib-wrapper');
  var controls = document.querySelector('.pubfilter');
  if (!wrapper || !controls) return;

  var search = document.getElementById('pub-search');
  var count = document.getElementById('pubfilter-count');
  var empty = document.querySelector('.pubfilter-empty');
  var clear = document.getElementById('pubfilter-clear');
  if (!search) return;

  /* --- Index ----------------------------------------------------------- */
  /* Built once. Each entry's searchable text is assembled from named fields
     rather than the article's whole textContent, so a query cannot match the
     visually-hidden "TPCB student author:" prefix on every badge and return
     all 658 rows. */
  function fieldText(entry, selector) {
    return [].map.call(entry.querySelectorAll(selector), function (el) {
      var copy = el.cloneNode(true);
      [].forEach.call(copy.querySelectorAll('.visually-hidden'), function (h) {
        h.parentNode.removeChild(h);
      });
      return copy.textContent;
    }).join(' ');
  }

  var groups = [];
  var total = 0;
  [].forEach.call(wrapper.querySelectorAll('h2.bibliography'), function (heading) {
    var list = heading.nextElementSibling;
    if (!list || list.tagName !== 'OL') return;
    var items = [].map.call(list.children, function (li) {
      var entry = li.querySelector('.bib-entry');
      return {
        li: li,
        text: [
          fieldText(entry, '.bib-title'),
          fieldText(entry, '.bib-authors'),
          fieldText(entry, '.bib-meta'),
          fieldText(entry, '.bib-note'),
          fieldText(entry, '.bib-tpcb')
        ].join(' ').toLowerCase()
      };
    });
    groups.push({ heading: heading, list: list, items: items });
    total += items.length;
  });
  if (!total) return;

  /* --- Filtering -------------------------------------------------------- */
  function apply(deferCount) {
    var q = search.value.trim().toLowerCase();
    var shown = 0;

    groups.forEach(function (group) {
      var visibleInGroup = 0;
      group.items.forEach(function (item) {
        var ok = q === '' || item.text.indexOf(q) !== -1;
        item.li.hidden = !ok;
        if (ok) visibleInGroup++;
      });
      // A year heading with nothing under it would otherwise still stick to the
      // top of the viewport while you scrolled past an empty stretch.
      var groupHidden = visibleInGroup === 0;
      group.heading.hidden = groupHidden;
      group.list.hidden = groupHidden;
      shown += visibleInGroup;
    });

    var text = q === ''
      ? 'Showing all ' + total + ' publications'
      : 'Showing ' + shown + ' of ' + total + ' publications';
    setCount(text, deferCount);
    if (empty) empty.hidden = shown !== 0;
    if (clear) clear.hidden = q === '';
  }

  // Only write the live region when its text changes, and while typing only
  // once the user pauses, so screen readers are not sent every keystroke.
  var countTimer = 0;
  function setCount(text, defer) {
    window.clearTimeout(countTimer);
    var write = function () { if (count.textContent !== text) count.textContent = text; };
    if (defer) countTimer = window.setTimeout(write, 400);
    else write();
  }

  search.addEventListener('input', function () { apply(true); });
  // Enter would otherwise submit the form and reload the page, losing the query.
  controls.addEventListener('submit', function (e) { e.preventDefault(); });
  if (clear) {
    clear.addEventListener('click', function () {
      search.value = '';
      apply(false);
      search.focus();
    });
  }

  controls.hidden = false;
  apply(false);
})();
