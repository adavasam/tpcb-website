/* Filtering for the publications bibliography.
 *
 * The list is 658 entries in 24 year groups, all rendered server-side by
 * jekyll-scholar. This only ever hides and shows what is already there — it
 * never builds an entry — so with JavaScript off the full bibliography is
 * still on the page and still correct. That is also why the controls start
 * hidden and are revealed here: a search box that cannot search is worse than
 * no search box, the same reasoning as the theme toggle in the nav.
 *
 * The year bounds are read from the year headings rather than written down, so
 * next year's papers move the slider on their own.
 */
(function () {
  'use strict';

  var wrapper = document.querySelector('.bib-wrapper');
  var controls = document.querySelector('.pubfilter');
  if (!wrapper || !controls) return;

  var search = document.getElementById('pub-search');
  var yearMin = document.getElementById('pub-year-min');
  var yearMax = document.getElementById('pub-year-max');
  var readout = document.getElementById('pub-year-readout');
  var count = document.getElementById('pubfilter-count');
  var empty = document.querySelector('.pubfilter-empty');
  var clear = document.getElementById('pubfilter-clear');
  var fill = document.querySelector('.pubfilter-fill');
  if (!search || !yearMin || !yearMax) return;

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
  var items = [];
  [].forEach.call(wrapper.querySelectorAll('h2.bibliography'), function (heading) {
    var list = heading.nextElementSibling;
    if (!list || list.tagName !== 'OL') return;
    var year = parseInt(heading.textContent.trim(), 10);
    var groupItems = [].map.call(list.children, function (li) {
      var entry = li.querySelector('.bib-entry');
      var text = [
        fieldText(entry, '.bib-title'),
        fieldText(entry, '.bib-authors'),
        fieldText(entry, '.bib-meta'),
        fieldText(entry, '.bib-tpcb')
      ].join(' ').toLowerCase();
      return { li: li, text: text, year: year };
    });
    groups.push({ heading: heading, list: list, items: groupItems });
    items = items.concat(groupItems);
  });
  if (!items.length) return;

  var years = items.map(function (i) { return i.year; }).filter(function (y) { return !isNaN(y); });
  var lo = Math.min.apply(null, years);
  var hi = Math.max.apply(null, years);
  var total = items.length;

  [yearMin, yearMax].forEach(function (input) {
    input.min = lo;
    input.max = hi;
  });
  yearMin.value = lo;
  yearMax.value = hi;

  /* --- Filtering -------------------------------------------------------- */
  function apply() {
    var q = search.value.trim().toLowerCase();
    var a = parseInt(yearMin.value, 10);
    var b = parseInt(yearMax.value, 10);
    var shown = 0;

    groups.forEach(function (group) {
      var visibleInGroup = 0;
      group.items.forEach(function (item) {
        var ok = item.year >= a && item.year <= b &&
                 (q === '' || item.text.indexOf(q) !== -1);
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

    var filtered = q !== '' || a !== lo || b !== hi;
    count.textContent = filtered
      ? 'Showing ' + shown + ' of ' + total + ' publications'
      : 'Showing all ' + total + ' publications';
    if (empty) empty.hidden = shown !== 0;
    if (clear) clear.hidden = !filtered;
  }

  /* --- Year range ------------------------------------------------------- */
  /* Two native range inputs stacked on one track. Native, so both handles are
     keyboard-operable and announce their value without any extra ARIA. The
     handles are not allowed to cross: whichever one is being dragged pushes
     the other rather than passing it, which keeps min <= max true at all
     times instead of validating after the fact. */
  function syncRange(dragged) {
    var a = parseInt(yearMin.value, 10);
    var b = parseInt(yearMax.value, 10);
    if (a > b) {
      if (dragged === yearMin) yearMax.value = a;
      else yearMin.value = b;
      a = parseInt(yearMin.value, 10);
      b = parseInt(yearMax.value, 10);
    }
    readout.textContent = a === b ? String(a) : a + '–' + b;
    if (fill) {
      var span = hi - lo || 1;
      fill.style.left = ((a - lo) / span * 100) + '%';
      fill.style.right = ((hi - b) / span * 100) + '%';
    }
  }

  search.addEventListener('input', apply);
  [yearMin, yearMax].forEach(function (input) {
    input.addEventListener('input', function () { syncRange(input); apply(); });
  });
  if (clear) {
    clear.addEventListener('click', function () {
      search.value = '';
      yearMin.value = lo;
      yearMax.value = hi;
      syncRange(yearMin);
      apply();
      search.focus();
    });
  }

  // Revealed only now that it is wired up.
  controls.hidden = false;
  syncRange(yearMin);
  apply();
})();
