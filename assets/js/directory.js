/* Filtering for the student, alumni and news directories.
 *
 * The lists are rendered in full by Jekyll; this only hides and shows items.
 * Markup contract (see _layouts/students-directory.html, _pages/alumni.md and
 * _pages/news.md):
 *
 *   [data-filter-controls]        the control panel (hidden by CSS when
 *                                 scripting is off, since it would do nothing)
 *     data-items="<selector>"     the filterable items
 *     data-count="<id>"           role=status element: "Showing N of M <noun>"
 *     data-noun="<noun>"
 *     data-empty="<id>"           shown when nothing matches
 *   [data-filter-key="<key>"]     a group of single-select buttons. Each button
 *                                 has data-value; "all" matches everything.
 *                                 An item matches if its data-<key> (a space-
 *                                 separated list) contains the value.
 *   [data-filter-search]          text input, matched against data-search
 *   [data-filter-reset]           buttons that clear every filter
 *   [data-group-heading]          optional headings, hidden when no item with
 *                                 the same data-group is visible
 *
 * Loaded without `defer` at the end of each page's content, so the DOM is
 * final before the deferred links.js runs.
 */
(function () {
  'use strict';

  var controls = document.querySelector('[data-filter-controls]');
  if (!controls) return;

  var items = Array.prototype.slice.call(document.querySelectorAll(controls.dataset.items));
  var countEl = document.getElementById(controls.dataset.count);
  var emptyEl = document.getElementById(controls.dataset.empty);
  var noun = controls.dataset.noun;
  var search = controls.querySelector('[data-filter-search]');
  var headings = Array.prototype.slice.call(document.querySelectorAll('[data-group-heading]'));
  var groups = Array.prototype.slice.call(controls.querySelectorAll('[data-filter-key]'));

  var selected = {};
  groups.forEach(function (group) { selected[group.dataset.filterKey] = 'all'; });

  function buttonsIn(group) {
    return Array.prototype.slice.call(group.querySelectorAll('button[data-value]'));
  }

  function select(group, button) {
    buttonsIn(group).forEach(function (b) {
      var on = b === button;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    selected[group.dataset.filterKey] = button.dataset.value;
  }

  // Only write the live region when its text changes: an identical rewrite
  // can be announced again by some screen readers.
  function setCount(text) {
    if (countEl && countEl.textContent !== text) countEl.textContent = text;
  }

  var countTimer = 0;

  function apply(deferCount) {
    var query = search ? search.value.trim().toLowerCase() : '';
    var visible = 0;
    var shownGroups = {};

    items.forEach(function (item) {
      var ok = Object.keys(selected).every(function (key) {
        var value = selected[key];
        return value === 'all' || (item.dataset[key] || '').split(' ').indexOf(value) !== -1;
      }) && (!query || (item.dataset.search || '').indexOf(query) !== -1);

      item.hidden = !ok;
      if (ok) {
        visible++;
        if (item.dataset.group) shownGroups[item.dataset.group] = true;
      }
    });

    headings.forEach(function (h) { h.hidden = !shownGroups[h.dataset.group]; });
    if (emptyEl) emptyEl.hidden = visible > 0;

    // While typing, announce the count once the user pauses rather than on
    // every keystroke. The list itself updates immediately.
    var text = 'Showing ' + visible + ' of ' + items.length + ' ' + noun;
    window.clearTimeout(countTimer);
    if (deferCount) countTimer = window.setTimeout(function () { setCount(text); }, 400);
    else setCount(text);
  }

  groups.forEach(function (group) {
    buttonsIn(group).forEach(function (button) {
      button.addEventListener('click', function () {
        select(group, button);
        apply(false);
      });
    });
  });

  if (search) {
    search.addEventListener('input', function () { apply(true); });
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-filter-reset]'), function (button) {
    button.addEventListener('click', function () {
      groups.forEach(function (group) { select(group, buttonsIn(group)[0]); });
      if (search) search.value = '';
      apply(false);
      // The reset button inside the empty state is about to be hidden; move
      // focus somewhere that stays on the page.
      if (search) search.focus();
    });
  });

  apply(false);
})();

/* Sortable table columns (the alumni table).
 *
 * Sort buttons sit inside the <th> so they are keyboard-operable, and the
 * <th> carries aria-sort. The table is rendered sorted by name, matching the
 * initial state here. Name sorts A-Z first; a year sorts newest first.
 */
(function () {
  'use strict';

  var buttons = Array.prototype.slice.call(document.querySelectorAll('button[data-sort]'));
  if (!buttons.length) return;

  var tbody = buttons[0].closest('table').tBodies[0];
  var rows = Array.prototype.slice.call(tbody.rows);
  var sortKey = 'name';
  var sortDir = 1;   // 1 ascending, -1 descending

  function sortRows() {
    var sorted = rows.slice().sort(function (a, b) {
      var r;
      if (sortKey === 'entry') {
        r = (+a.dataset.entry || 0) - (+b.dataset.entry || 0);
        // Same year: fall back to name so the order does not depend on the
        // browser's sort stability.
        if (r === 0) return a.dataset.name.localeCompare(b.dataset.name);
      } else {
        r = a.dataset.name.localeCompare(b.dataset.name);
      }
      return r * sortDir;
    });
    // Re-append in one fragment: one layout pass instead of one per row.
    var frag = document.createDocumentFragment();
    sorted.forEach(function (row) { frag.appendChild(row); });
    tbody.appendChild(frag);
  }

  function syncButtons() {
    buttons.forEach(function (btn) {
      var on = btn.dataset.sort === sortKey;
      btn.classList.toggle('is-active', on);
      btn.closest('th').setAttribute(
        'aria-sort', on ? (sortDir === 1 ? 'ascending' : 'descending') : 'none');
    });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.dataset.sort;
      if (key === sortKey) {
        sortDir = -sortDir;
      } else {
        sortKey = key;
        sortDir = (key === 'entry') ? -1 : 1;
      }
      sortRows();
      syncButtons();
    });
  });
})();
