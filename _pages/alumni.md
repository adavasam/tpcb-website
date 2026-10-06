---
layout: page
title: Alumni
permalink: /alumni/
description: Alumni of the Tri-Institutional PhD Program in Chemical Biology.
---

## Alumni Directory

TPCB graduates pursue careers across academia, industry, and public service. The program has trained PhD scientists since its founding in {{ site.data.program.founding_year }}, and our alumni community spans major research universities, pharmaceutical and biotechnology companies, government laboratories, and science policy organizations.

{% comment %}
  Unlike the other institution filters, this one offers CU-I (Cornell's Ithaca
  campus, a former TPCB institution): some alumni did their thesis there and
  name no other institution, so without it they could not be filtered to.
  Filtering and sorting are done by assets/js/directory.js.
{% endcomment %}
<div class="directory-controls" id="alumni-controls" hidden
     data-filter-controls data-items="#alumni-table tbody tr" data-noun="alumni"
     data-count="alumni-count" data-empty="no-results-alumni">
  <div class="filter-group">
    <span class="filter-legend" id="alumni-inst-label">Thesis institution</span>
    <div class="filter-bar" role="group" aria-labelledby="alumni-inst-label" data-filter-key="institutions">
      <button type="button" class="filter-btn active" data-value="all" aria-pressed="true" data-label="All">All</button>
      {% for inst in site.data.institutions %}
      <button type="button" class="filter-btn filter-btn-{{ inst.short | downcase }}"
              data-value="{{ inst.short }}" aria-pressed="false" data-label="{{ inst.short }}">{{ inst.short }}</button>
      {% endfor %}
    </div>
  </div>

  <div class="filter-group">
    <label class="filter-legend" for="alumni-search">Search</label>
    <input
      type="search"
      id="alumni-search"
      class="faculty-search-input"
      placeholder="Search alumni…" autocomplete="off" data-filter-search>
  </div>

</div>

<p class="faculty-count" id="alumni-count" role="status">Showing {{ site.data.alumni | size }} of {{ site.data.alumni | size }} alumni</p>

<div class="alumni-table-wrapper" tabindex="0" role="region" aria-label="Alumni directory table">
<table class="alumni-table" id="alumni-table">
  <caption class="visually-hidden">TPCB alumni: name, years, thesis institution, thesis sponsor, and current position</caption>
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
      Rendered sorted by name, the script's initial sort. data-entry is
      `year_start`, which the Years column sorts on.
    {%- endcomment -%}
    {% assign sorted_alumni = site.data.alumni | sort_natural: "name" %}
    {% for alum in sorted_alumni %}
    <tr data-institutions="{{ alum.institutions | join: ' ' }}"
        data-name="{{ alum.name | downcase | escape }}"
        data-entry="{{ alum.year_start }}"
        data-search="{{ alum.name | append: ' ' | append: alum.advisor | append: ' ' | append: alum.current_position | downcase | escape }}">
      <th scope="row" class="alumni-name">{{ alum.name }}</th>
      <td class="alumni-years"><span class="nowrap">{{ alum.year_start }}&ndash;{{ alum.year_end }}</span></td>
      <td class="alumni-institution">
        {% for short in alum.institutions %}
        {% assign inst_data = site.data.institutions | where: "short", short | first %}
        <span class="institution-badge institution-{{ short | downcase | replace: ' ', '-' }}"
              {% if inst_data.historical %}title="{{ inst_data.name }} — former TPCB institution"{% endif %}>
          {{ short }}
        </span>
        {% endfor %}
      </td>
      <td class="alumni-advisor">{% include advisor-links.html names=alum.advisor slugs=alum.advisor_slugs %}</td>
      <td class="alumni-position">{{ alum.current_position }}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>
</div>

<p class="no-results" id="no-results-alumni" hidden>
  No alumni match these filters.
  <button type="button" data-filter-reset>Clear filters</button>
</p>

<p class="directory-note">
  <strong>CU-I</strong> denotes Cornell University's Ithaca campus, a former
  participating institution of TPCB. It appears here only as the thesis
  institution of past students and is not a current TPCB institution.
</p>

---

*For corrections or to update your information, contact [{{ site.data.program.contact_email }}](mailto:{{ site.data.program.contact_email }}).*

<script src="{{ '/assets/js/directory.js' | relative_url }}"></script>
