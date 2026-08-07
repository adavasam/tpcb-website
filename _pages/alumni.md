---
layout: page
title: Alumni
permalink: /alumni/
nav: true
nav_order: 5
description: Alumni of the Tri-Institutional PhD Program in Chemical Biology.
---

## Alumni Directory

TPCB graduates pursue careers across academia, industry, and public service. The program has trained PhD scientists since its founding in {{ site.data.program.founding_year }}, and our alumni community spans major research universities, pharmaceutical and biotechnology companies, government laboratories, and science policy organizations.

<div class="directory-controls" id="alumni-controls">
  {%- comment -%}
    CU-I IS offered here, unlike every other institution loop on the site. The
    `historical` flag keeps Cornell Ithaca out of *current*-institution
    contexts — the logo strip, the current-student filters. This table is the
    historical record: 12 alumni did their thesis at Ithaca and 11 of them list
    no other institution, so guarding it out would leave them unreachable by
    any filter while "All" still counted them. It keeps the muted outlined
    badge treatment, and the note below the table explains the affiliation.
  {%- endcomment -%}
  <div class="filter-group">
    <span class="filter-legend" id="alumni-inst-label">Thesis institution</span>
    <div class="filter-bar" role="group" aria-labelledby="alumni-inst-label">
      <button type="button" class="filter-btn active" data-filter="all" aria-pressed="true">All</button>
      {% for inst in site.data.institutions %}
      <button type="button" class="filter-btn filter-btn-{{ inst.short | downcase }}"
              data-filter="{{ inst.short }}" aria-pressed="false">{{ inst.short }}</button>
      {% endfor %}
    </div>
  </div>

  <div class="filter-group">
    <label class="filter-legend" for="alumni-search">Search</label>
    <input
      type="search"
      id="alumni-search"
      class="faculty-search-input"
      placeholder="Search alumni…" autocomplete="off">
  </div>

  <p class="faculty-count" id="alumni-count" role="status"></p>
</div>

<div class="alumni-table-wrapper" tabindex="0" role="region" aria-label="Alumni directory table">
<table class="alumni-table" id="alumni-table">
  <caption class="visually-hidden">TPCB alumni: name, years, thesis institution, thesis sponsor, and current position</caption>
  {%- comment -%}
    Name and Years are sortable. They are real <button>s inside the <th> rather
    than a click handler on the cell, so they are reachable by keyboard and
    announced as controls; aria-sort on the <th> is what tells a screen reader
    which column is ordering the table and in which direction.
  {%- endcomment -%}
  <thead>
    <tr>
      <th scope="col" aria-sort="ascending" data-sort-key="name">
        <button type="button" class="alumni-sort is-active" data-sort="name">
          Name<span class="alumni-sort-caret" aria-hidden="true"></span>
        </button>
      </th>
      <th scope="col" aria-sort="none" data-sort-key="entry">
        <button type="button" class="alumni-sort" data-sort="entry">
          Years<span class="alumni-sort-caret" aria-hidden="true"></span>
        </button>
      </th>
      <th scope="col">Thesis Institution</th>
      <th scope="col">Thesis Sponsor</th>
      <th scope="col">Current Position</th>
    </tr>
  </thead>
  <tbody>
    {%- comment -%}
      Rendered alphabetically by name, which is also the default sort the script
      below starts from — so the order is right before any JavaScript runs.
      `sort_natural` is case-insensitive.

      Each row carries data-name and data-entry so the client-side sort never has
      to re-parse cell text. data-entry is `year_start`, the year the student
      entered TPCB, which is what the Years column sorts on; `year_end` is
      graduation. There is no `thesis` column: the source carries no thesis
      titles, so the key was dropped from _data/alumni.yml rather than rendered
      as 129 empty cells.
    {%- endcomment -%}
    {% assign sorted_alumni = site.data.alumni | sort_natural: "name" %}
    {% for alum in sorted_alumni %}
    {%- comment -%}
      `institutions` is present only for students whose thesis spanned more than
      one institution; otherwise fall back to the single `institution`. Resolved
      up here because the row needs it as a filter attribute as well as a cell.
      CU-I (Cornell Ithaca) is a historical affiliation and renders with the
      muted outlined badge — never as a current TPCB institution.
    {%- endcomment -%}
    {%- assign inst_list = alum.institutions | default: nil -%}
    {%- unless inst_list %}{% assign inst_list = alum.institution | split: "," %}{% endunless -%}
    <tr data-institutions="{{ inst_list | join: ' ' }}"
        data-name="{{ alum.name | downcase | escape }}"
        data-entry="{{ alum.year_start }}"
        data-search="{{ alum.name | append: ' ' | append: alum.advisor | append: ' ' | append: alum.current_position | downcase | escape }}">
      <th scope="row" class="alumni-name">{{ alum.name }}</th>
      <td class="alumni-years"><span class="nowrap">{{ alum.year_start }}&ndash;{{ alum.year_end }}</span></td>
      <td class="alumni-institution">
        {% for short in inst_list %}
        {% assign inst_data = site.data.institutions | where: "short", short | first %}
        <span class="institution-badge institution-{{ short | downcase | replace: ' ', '-' }}"
              {% if inst_data %}style="background-color: {{ inst_data.color }};"{% endif %}
              {% if inst_data.historical %}title="{{ inst_data.name }} — former TPCB institution"{% endif %}>
          {{ short }}
        </span>
        {% endfor %}
      </td>
      <td class="alumni-advisor">
        {%- comment -%}
          Co-mentored students carry `advisor_slugs`, a list aligned with the
          names in `advisor`, so each sponsor links independently and an
          unresolvable one falls back to its own name rather than dropping the
          link for both. Everyone else has the single `advisor_slug`.
        {%- endcomment -%}
        {%- if alum.advisor_slugs and alum.advisor_slugs.size > 0 -%}
          {%- assign advisor_names = alum.advisor | split: " & " -%}
          {%- for slug in alum.advisor_slugs -%}
            {%- assign fallback = advisor_names[forloop.index0] | default: alum.advisor -%}
            {%- assign adv = nil -%}
            {%- if slug != "" -%}
              {%- assign adv_path = slug | prepend: "_faculty/" | append: ".md" -%}
              {%- assign adv = site.faculty | where_exp: "f", "f.path == adv_path" | first -%}
            {%- endif -%}
            {%- if adv %}<a href="{{ adv.url | relative_url }}">{{ adv.name }}</a>
            {%- else %}{{ fallback }}
            {%- endif -%}
            {%- unless forloop.last %} &amp; {% endunless -%}
          {%- endfor -%}
        {%- else -%}
          {%- assign adv_path = alum.advisor_slug | prepend: "_faculty/" | append: ".md" -%}
          {%- assign adv = site.faculty | where_exp: "f", "f.path == adv_path" | first -%}
          {%- if alum.advisor_slug and adv %}<a href="{{ adv.url | relative_url }}">{{ alum.advisor }}</a>
          {%- else %}{{ alum.advisor }}
          {%- endif -%}
        {%- endif -%}
      </td>
      <td class="alumni-position">{{ alum.current_position }}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>
</div>

<p class="no-results hidden" id="no-results-alumni">
  No alumni match these filters.
  <button type="button" onclick="resetAlumniFilters()">Clear filters</button>
</p>

<p class="directory-note">
  <strong>CU-I</strong> denotes Cornell University's Ithaca campus, a former
  participating institution of TPCB. It appears here only as the thesis
  institution of past students and is not a current TPCB institution.
</p>

---

*For corrections or to update your information, contact [{{ site.data.program.contact_email }}](mailto:{{ site.data.program.contact_email }}).*

<script>
(function () {
  var rows = Array.from(document.querySelectorAll('#alumni-table tbody tr'));
  var countEl = document.getElementById('alumni-count');
  var noResults = document.getElementById('no-results-alumni');
  var input = document.getElementById('alumni-search');
  var instBtns = Array.from(document.querySelectorAll('#alumni-controls [data-filter]'));
  var currentInst = 'all';

  function apply() {
    var q = input.value.toLowerCase().trim();
    var visible = 0;
    rows.forEach(function (row) {
      // A thesis spanning two institutions matches either one.
      var insts = (row.dataset.institutions || '').split(' ');
      var matchInst = currentInst === 'all' || insts.indexOf(currentInst) !== -1;
      var matchSearch = !q || (row.dataset.search || '').indexOf(q) !== -1;
      var show = matchInst && matchSearch;
      row.hidden = !show;
      if (show) { visible++; }
    });
    countEl.textContent = visible === rows.length
      ? 'Showing all ' + rows.length + ' alumni'
      : 'Showing ' + visible + ' of ' + rows.length + ' alumni';
    noResults.classList.toggle('hidden', visible > 0);
  }

  /* --- Sorting -----------------------------------------------------------
   * Two keys. `name` is alphabetical and is the default, matching the order
   * Liquid renders in — so an unscripted page is already sorted correctly and
   * the first click is a real change rather than a no-op.
   * `entry` is the year the student entered TPCB (year_start), newest first on
   * its first click, which is the reading most people want from a cohort year.
   * Re-clicking the active column reverses it.
   *
   * The rows are detached into a fragment and re-appended in one go rather than
   * moved individually, so 129 rows cost one layout pass instead of 129.
   */
  var tbody = document.querySelector('#alumni-table tbody');
  var sortBtns = Array.from(document.querySelectorAll('.alumni-sort'));
  var sortKey = 'name';
  var sortDir = 1;               // 1 ascending, -1 descending

  function sortRows() {
    var sorted = rows.slice().sort(function (a, b) {
      var r;
      if (sortKey === 'entry') {
        r = (+a.dataset.entry || 0) - (+b.dataset.entry || 0);
        // Same cohort year: fall back to name so the order is deterministic
        // rather than dependent on the browser's sort stability.
        if (r === 0) return a.dataset.name.localeCompare(b.dataset.name);
      } else {
        r = a.dataset.name.localeCompare(b.dataset.name);
      }
      return r * sortDir;
    });
    var frag = document.createDocumentFragment();
    sorted.forEach(function (row) { frag.appendChild(row); });
    tbody.appendChild(frag);
  }

  function syncSortUi() {
    sortBtns.forEach(function (btn) {
      var on = btn.dataset.sort === sortKey;
      btn.classList.toggle('is-active', on);
      btn.closest('th').setAttribute(
        'aria-sort', on ? (sortDir === 1 ? 'ascending' : 'descending') : 'none');
    });
  }

  sortBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.dataset.sort;
      if (key === sortKey) {
        sortDir = -sortDir;
      } else {
        sortKey = key;
        // Names read best A-Z; a cohort year reads best newest-first.
        sortDir = (key === 'entry') ? -1 : 1;
      }
      sortRows();
      syncSortUi();
    });
  });

  instBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      instBtns.forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      currentInst = btn.dataset.filter;
      apply();
    });
  });

  input.addEventListener('input', apply);
  window.resetAlumniFilters = function () {
    currentInst = 'all';
    instBtns.forEach(function (b) {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    instBtns[0].classList.add('active');
    instBtns[0].setAttribute('aria-pressed', 'true');
    input.value = '';
    apply();
    // apply() hides the .no-results block this button lives in, so focus would
    // otherwise fall to <body>.
    input.focus();
  };
  apply();
})();
</script>
