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
  <label class="visually-hidden" for="alumni-search">Search alumni</label>
  <input
    type="search"
    id="alumni-search"
    class="faculty-search-input"
    placeholder="Search by name, thesis sponsor, or current position…" autocomplete="off">
  <p class="faculty-count" id="alumni-count" role="status"></p>
</div>

<div class="alumni-table-wrapper" tabindex="0" role="region" aria-label="Alumni directory table">
<table class="alumni-table" id="alumni-table">
  <caption class="visually-hidden">TPCB alumni: name, years, thesis institution, thesis sponsor, and current position</caption>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Years</th>
      <th scope="col">Thesis Institution</th>
      <th scope="col">Thesis Sponsor</th>
      <th scope="col">Current Position</th>
    </tr>
  </thead>
  <tbody>
    {%- comment -%}
      Sorted by graduation year, most recent first. `year_end` replaces the old
      single `year` key because the source records a range. There is no `thesis`
      column: the source carries no thesis titles, so the key was dropped from
      _data/alumni.yml rather than rendered as 129 empty cells.
    {%- endcomment -%}
    {% assign sorted_alumni = site.data.alumni | sort: "year_end" | reverse %}
    {% for alum in sorted_alumni %}
    <tr data-search="{{ alum.name | append: ' ' | append: alum.advisor | append: ' ' | append: alum.current_position | downcase | escape }}">
      <th scope="row" class="alumni-name">{{ alum.name }}</th>
      <td class="alumni-years"><span class="nowrap">{{ alum.year_start }}&ndash;{{ alum.year_end }}</span></td>
      <td class="alumni-institution">
        {%- comment -%}
          `institutions` is present only for students whose thesis spanned more
          than one institution; otherwise fall back to the single `institution`.
          CU-I (Cornell Ithaca) is a historical affiliation and renders with the
          muted outlined badge — never as a current TPCB institution.
        {%- endcomment -%}
        {% assign inst_list = alum.institutions | default: nil %}
        {% unless inst_list %}{% assign inst_list = alum.institution | split: "," %}{% endunless %}
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
        {% assign adv_path = alum.advisor_slug | prepend: "_faculty/" | append: ".md" %}
        {% assign adv = site.faculty | where_exp: "f", "f.path == adv_path" | first %}
        {% if alum.advisor_slug and adv %}
        <a href="{{ adv.url | relative_url }}">{{ alum.advisor }}</a>
        {% else %}
        {{ alum.advisor }}
        {% endif %}
      </td>
      <td class="alumni-position">{{ alum.current_position }}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>
</div>

<p class="no-results hidden" id="no-results-alumni">
  No alumni match your search.
  <button type="button" onclick="resetAlumniFilters()">Clear search</button>
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

  function apply() {
    var q = input.value.toLowerCase().trim();
    var visible = 0;
    rows.forEach(function (row) {
      var show = !q || (row.dataset.search || '').indexOf(q) !== -1;
      row.hidden = !show;
      if (show) { visible++; }
    });
    countEl.textContent = visible === rows.length
      ? 'Showing all ' + rows.length + ' alumni'
      : 'Showing ' + visible + ' of ' + rows.length + ' alumni';
    noResults.classList.toggle('hidden', visible > 0);
  }

  input.addEventListener('input', apply);
  window.resetAlumniFilters = function () { input.value = ''; apply(); input.focus(); };
  apply();
})();
</script>
