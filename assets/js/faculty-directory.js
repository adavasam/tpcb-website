/* Filtering for the faculty directory (_pages/faculty.md).
 *
 * The filters are a real form: radios for the institution, checkboxes for
 * approach and research focus (OR within a group, AND across groups), a text
 * search and an "accepting students" switch. The form ships `hidden` and is
 * shown here, so visitors without JavaScript are not offered controls that do
 * nothing; they still get the full list.
 *
 * Filter state is mirrored in the query string, so a filtered view can be
 * linked to: the homepage's "Browse WCM faculty" points at /faculty/?inst=WCM.
 */
(function () {
  'use strict';

  var grid = document.getElementById('fd-grid');
  var form = document.getElementById('fd-filters');
  if (!grid || !form) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.fd-card'));
  var total = cards.length;
  var countEl = document.getElementById('fd-count');
  var emptyEl = document.getElementById('fd-empty');
  var searchEl = document.getElementById('fd-search-input');
  var acceptingEl = document.getElementById('fd-accepting');

  // Match on each input's .value rather than an attribute selector: values
  // such as "Gene Expression & RNA" are awkward to escape inside a selector.
  function inputsNamed(name) {
    return Array.prototype.slice.call(form.querySelectorAll('input[name="' + name + '"]'));
  }

  function checkedValues(name) {
    return inputsNamed(name)
      .filter(function (el) { return el.checked; })
      .map(function (el) { return el.value; });
  }

  function selectedInstitution() {
    var el = form.querySelector('input[name="inst"]:checked');
    return el ? el.value : 'all';
  }

  // A card's data-approach / data-focus is "|A|B|"; it matches if it carries
  // any of the selected values.
  function matchesAny(attr, values) {
    if (!values.length) return true;
    for (var i = 0; i < values.length; i++) {
      if (attr.indexOf('|' + values[i] + '|') !== -1) return true;
    }
    return false;
  }

  // Only write the live region when its text changes, and while typing only
  // once the user pauses, so screen readers are not sent every keystroke.
  var countTimer = 0;
  function setCount(text, defer) {
    window.clearTimeout(countTimer);
    var write = function () { if (countEl.textContent !== text) countEl.textContent = text; };
    if (defer) countTimer = window.setTimeout(write, 400);
    else write();
  }

  function apply(deferCount) {
    var inst = selectedInstitution();
    var approaches = checkedValues('approach');
    var focuses = checkedValues('focus');
    var query = (searchEl.value || '').trim().toLowerCase();
    var acceptingOnly = acceptingEl.checked;
    var visible = 0;

    cards.forEach(function (card) {
      var d = card.dataset;
      var ok = (inst === 'all' || d.inst === inst) &&
               matchesAny(d.approach, approaches) &&
               matchesAny(d.focus, focuses) &&
               (!acceptingOnly || d.accepting === 'yes') &&
               (!query || d.search.indexOf(query) !== -1);

      card.hidden = !ok;
      if (ok) visible++;
    });

    setCount('Showing ' + visible + ' of ' + total + ' faculty', deferCount);
    emptyEl.hidden = visible !== 0;
  }

  function readUrl() {
    if (!window.URLSearchParams) return;
    var p = new URLSearchParams(window.location.search);

    var inst = p.get('inst');
    if (inst) {
      inputsNamed('inst').forEach(function (el) {
        if (el.value === inst) el.checked = true;
      });
    }
    ['approach', 'focus'].forEach(function (name) {
      var vals = (p.get(name) || '').split('|').filter(Boolean);
      if (!vals.length) return;
      inputsNamed(name).forEach(function (el) {
        if (vals.indexOf(el.value) !== -1) el.checked = true;
      });
    });
    if (p.get('q')) searchEl.value = p.get('q');
    if (p.get('accepting') === '1') acceptingEl.checked = true;
  }

  // replaceState rather than pushState, so toggling filters does not fill the
  // history between the reader and the page they came from.
  function writeUrl() {
    if (!window.URLSearchParams || !window.history || !history.replaceState) return;
    var p = new URLSearchParams();
    var inst = selectedInstitution();
    if (inst !== 'all') p.set('inst', inst);
    ['approach', 'focus'].forEach(function (name) {
      var v = checkedValues(name);
      if (v.length) p.set(name, v.join('|'));
    });
    var q = (searchEl.value || '').trim();
    if (q) p.set('q', q);
    if (acceptingEl.checked) p.set('accepting', '1');
    var qs = p.toString();
    history.replaceState(null, '', qs ? '?' + qs : window.location.pathname);
  }

  form.addEventListener('change', function () { apply(false); writeUrl(); });
  searchEl.addEventListener('input', function () { apply(true); writeUrl(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  function reset() {
    form.reset();
    apply(false);
    writeUrl();
    searchEl.focus();
  }

  document.getElementById('fd-reset').addEventListener('click', reset);
  Array.prototype.forEach.call(document.querySelectorAll('[data-fd-reset]'), function (btn) {
    btn.addEventListener('click', reset);
  });

  form.hidden = false;
  readUrl();   // before the first apply()
  apply(false);
})();
