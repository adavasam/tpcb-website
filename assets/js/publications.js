/* Search for the publications bibliography.
 *
 * The list is 658 entries in 24 year groups, all rendered server-side by
 * jekyll-scholar. This only ever hides and shows what is already there — it
 * never builds an entry — so with JavaScript off the full bibliography is
 * still on the page and still correct. That is also why the control starts
 * hidden and is revealed here: a search box that cannot search is worse than
 * no search box, the same reasoning as the theme toggle in the nav.
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
          fieldText(entry, '.bib-tpcb')
        ].join(' ').toLowerCase()
      };
    });
    groups.push({ heading: heading, list: list, items: items });
    total += items.length;
  });
  if (!total) return;

  /* --- Filtering -------------------------------------------------------- */
  function apply() {
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

    count.textContent = q === ''
      ? 'Showing all ' + total + ' publications'
      : 'Showing ' + shown + ' of ' + total + ' publications';
    if (empty) empty.hidden = shown !== 0;
    if (clear) clear.hidden = q === '';
  }

  search.addEventListener('input', apply);
  if (clear) {
    clear.addEventListener('click', function () {
      search.value = '';
      apply();
      search.focus();
    });
  }

  // Revealed only now that it is wired up.
  controls.hidden = false;
  apply();
})();
