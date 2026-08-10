---
layout: default
title: Faculty
permalink: /faculty/
nav: true
nav_order: 2
description: Browse the training faculty of the Tri-Institutional PhD Program in Chemical Biology at Weill Cornell Medicine, The Rockefeller University, and Memorial Sloan Kettering.
---

{%- assign approaches = "Structural Biology|Biophysics|Chemical Cell Biology|Chemical Proteomics|Drug Discovery|Computational Methods|Chemical Synthesis" | split: "|" -%}
{%- assign focuses = "Cancer Biology|Cell Signaling|Membrane Proteins|Infectious Disease|Gene Expression & RNA|Epigenetics & Chromatin|Neuroscience" | split: "|" -%}
{%- comment -%}
  `sort_key` is "lastname firstname", lowercased, and it is the ONLY reason that
  key exists in _faculty/*.md — nothing reads `page.sort_key`, so a search for
  it finds nothing and it looks unused. It is not. Liquid has no sort-by-surname,
  and sorting on `name` would order the directory by first name. Do not remove
  it from the front matter without replacing this line.
{%- endcomment -%}
{%- assign faculty = site.faculty | sort: "sort_key" -%}
{%- assign total = faculty | size -%}

{%- comment -%}
  The standard page header: .post / .post-header / .post-title /
  .post-description, exactly as _layouts/page.html and
  _layouts/students-directory.html emit it. This page used to carry a parallel
  set (.fd-header / .fd-title / .fd-intro) that had to be kept visually in step
  with the real one by hand — which is how it ended up 8px larger and 40px lower
  than every other page.

  Written out rather than taken from `layout: page` for the same reason the
  student directory writes its own: the lede interpolates {{ total }}, and
  Jekyll does not process Liquid inside front matter.
{%- endcomment -%}
<div class="page-wrapper">
<div class="post fd">

  <header class="post-header">
    <h1 class="post-title">Faculty</h1>
    <p class="post-description">
      TPCB students choose a thesis lab from {{ total }} training faculty spanning
      Weill Cornell Medicine, The Rockefeller University, and Memorial Sloan Kettering.
      Filter by institution, by the approaches a lab uses, or by the biology it studies.
    </p>
  </header>

  <form class="fd-filters" id="fd-filters" aria-label="Filter faculty">

    <div class="fd-row fd-row-top">
      <fieldset class="fd-fieldset fd-fieldset-inst">
        <legend class="fd-legend">Institution</legend>
        <div class="fd-pills">
          <input class="fd-input" type="radio" name="inst" id="inst-all" value="all" checked>
          <label class="fd-pill" for="inst-all" data-label="All">All</label>

          <input class="fd-input" type="radio" name="inst" id="inst-wcm" value="WCM">
          <label class="fd-pill fd-pill-wcm" for="inst-wcm" data-label="Weill Cornell">Weill Cornell</label>

          <input class="fd-input" type="radio" name="inst" id="inst-ru" value="Rockefeller">
          <label class="fd-pill fd-pill-rockefeller" for="inst-ru" data-label="Rockefeller">Rockefeller</label>

          <input class="fd-input" type="radio" name="inst" id="inst-msk" value="MSK">
          <label class="fd-pill fd-pill-msk" for="inst-msk" data-label="MSK">MSK</label>
        </div>
      </fieldset>

      <div class="fd-search">
        <label class="fd-legend" for="fd-search-input">Search</label>
        <input class="fd-search-input" type="search" id="fd-search-input"
               placeholder="Name, lab, or research area&hellip;"
               autocomplete="off" spellcheck="false">
      </div>
    </div>

    <div class="fd-row">
      <fieldset class="fd-fieldset">
        <legend class="fd-legend">Approach</legend>
        <div class="fd-pills">
          {%- for a in approaches %}
          {%- assign aid = a | slugify %}
          <input class="fd-input" type="checkbox" name="approach" id="ap-{{ aid }}" value="{{ a }}">
          <label class="fd-pill fd-pill-approach" for="ap-{{ aid }}" data-label="{{ a }}">{{ a }}</label>
          {%- endfor %}
        </div>
      </fieldset>
    </div>

    <div class="fd-row">
      <fieldset class="fd-fieldset">
        <legend class="fd-legend">Research focus</legend>
        <div class="fd-pills">
          {%- for f in focuses %}
          {%- assign fid = f | slugify %}
          <input class="fd-input" type="checkbox" name="focus" id="fo-{{ fid }}" value="{{ f }}">
          <label class="fd-pill fd-pill-focus" for="fo-{{ fid }}" data-label="{{ f }}">{{ f }}</label>
          {%- endfor %}
        </div>
      </fieldset>
    </div>

    <div class="fd-row fd-row-bottom">
      {%- comment -%}
        The note that used to sit here ("Labs not currently accepting stay
        listed and sorted last…") described the old behaviour, where this
        toggle only re-ordered the grid. It filters now, which is what its
        label says and what makes the count below it true, so the note is
        gone rather than reworded — and aria-describedby with it.
      {%- endcomment -%}
      <div class="fd-switch-wrap">
        <input class="fd-switch-input" type="checkbox" id="fd-accepting">
        <label class="fd-switch" for="fd-accepting">
          <span class="fd-switch-track" aria-hidden="true"><span class="fd-switch-thumb"></span></span>
          <span class="fd-switch-label">Show labs accepting students</span>
        </label>
      </div>

      <button class="fd-reset" type="button" id="fd-reset">Clear all filters</button>
    </div>
  </form>

  <p class="fd-count" id="fd-count" role="status">Showing {{ total }} of {{ total }} faculty</p>

  <ul class="fd-grid" id="fd-grid">
    {%- for member in faculty %}
    {%- assign inst = member.institution -%}
    {%- if inst == "WCM" -%}
      {%- assign inst_name = "Weill Cornell Medicine" -%}{%- assign inst_class = "wcm" -%}
    {%- elsif inst == "Rockefeller" -%}
      {%- assign inst_name = "Rockefeller" -%}{%- assign inst_class = "rockefeller" -%}
    {%- elsif inst == "MSK" -%}
      {%- assign inst_name = "Memorial Sloan Kettering" -%}{%- assign inst_class = "msk" -%}
    {%- else -%}
      {%- assign inst_name = inst -%}{%- assign inst_class = "other" -%}
    {%- endif -%}
    {%- assign approach_attr = member.research_approach | join: "|" -%}
    {%- assign focus_attr = member.research_focus | join: "|" -%}
    {%- assign tag_count = member.research_approach.size | plus: member.research_focus.size -%}
    {%- assign extra = tag_count | minus: 4 -%}
    {%- capture search_blob %}{{ member.name }} {{ member.lab_name }} {{ member.position }} {{ inst_name }} {{ member.description }} {{ approach_attr | replace: "|", " " }} {{ focus_attr | replace: "|", " " }}{% endcapture -%}
    <li class="fd-card{% unless member.accepting_students %} is-closed{% endunless %}"
        data-inst="{{ member.institution }}"
        data-approach="|{{ approach_attr }}|"
        data-focus="|{{ focus_attr }}|"
        data-accepting="{% if member.accepting_students %}yes{% else %}no{% endif %}"
        data-name="{{ member.name | downcase }}"
        data-search="{{ search_blob | strip_newlines | downcase | escape }}">
      <div class="fd-card-top">
        <img class="fd-card-photo"
             src="{{ '/assets/img/' | append: member.profile.image | relative_url }}"
             alt="" loading="lazy" width="72" height="72">
        <div class="fd-card-id">
          <h2 class="fd-card-name">
            <a href="{{ member.url | relative_url }}">{{ member.name }}{% if member.degree %}, {{ member.degree }}{% endif %}</a>
          </h2>
          <span class="inst-badge inst-{{ inst_class }}">{{ inst_name }}</span>
        </div>
      </div>

      {% if member.description %}<p class="fd-card-blurb">{{ member.description }}</p>{% endif %}

      <ul class="fd-card-tags" aria-label="Research areas">
        {%- for a in member.research_approach limit: 2 %}
        <li class="tag tag-approach">{{ a }}</li>
        {%- endfor %}
        {%- for f in member.research_focus limit: 2 %}
        <li class="tag tag-focus">{{ f }}</li>
        {%- endfor %}
        {%- if extra > 0 %}
        <li class="tag tag-more">+{{ extra }} more</li>
        {%- endif %}
      </ul>

      <p class="fd-card-status {% if member.accepting_students %}is-accepting{% else %}is-not{% endif %}">
        <span class="status-dot" aria-hidden="true"></span>
        {% if member.accepting_students %}Accepting students{% else %}Not accepting{% endif %}
      </p>
    </li>
    {%- endfor %}
  </ul>

  <p class="fd-empty" id="fd-empty" hidden>
    No faculty match these filters.
    <button class="fd-reset fd-reset-inline" type="button" data-fd-reset>Clear all filters</button>
  </p>

</div>
</div>

<script>
(function () {
  var grid = document.getElementById('fd-grid');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.fd-card'));
  var total = cards.length;
  var countEl = document.getElementById('fd-count');
  var emptyEl = document.getElementById('fd-empty');
  var searchEl = document.getElementById('fd-search-input');
  var acceptingEl = document.getElementById('fd-accepting');
  var form = document.getElementById('fd-filters');

  function checkedValues(name) {
    return Array.prototype.slice
      .call(form.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function (el) { return el.value; });
  }

  function selectedInstitution() {
    var el = form.querySelector('input[name="inst"]:checked');
    return el ? el.value : 'all';
  }

  // OR within a dimension: card matches if it carries any selected value.
  function matchesAny(attr, values) {
    if (!values.length) return true;
    for (var i = 0; i < values.length; i++) {
      if (attr.indexOf('|' + values[i] + '|') !== -1) return true;
    }
    return false;
  }

  function apply() {
    var inst = selectedInstitution();
    var approaches = checkedValues('approach');
    var focuses = checkedValues('focus');
    var query = (searchEl.value || '').trim().toLowerCase();
    // "Show labs accepting students" filters, like every other control here.
    // It used to only sort the non-accepting labs to the end, which left the
    // count reading "Showing 67 of 67" with the toggle on — the toggle was the
    // one control on this page that did not change what the count reported.
    var acceptingOnly = acceptingEl.checked;
    var visible = 0;

    cards.forEach(function (card) {
      var d = card.dataset;
      // AND across dimensions.
      var ok = (inst === 'all' || d.inst === inst) &&
               matchesAny(d.approach, approaches) &&
               matchesAny(d.focus, focuses) &&
               (!acceptingOnly || d.accepting === 'yes') &&
               (!query || d.search.indexOf(query) !== -1);

      card.hidden = !ok;
      if (ok) visible++;
    });

    countEl.textContent = 'Showing ' + visible + ' of ' + total + ' faculty';
    emptyEl.hidden = visible !== 0;
  }

  /* --- Filter state in the URL ------------------------------------------
   * The filters live in the query string, so a filtered view is a link. That
   * is what makes the homepage's "Browse WCM faculty" work: it points at
   * /faculty/?inst=WCM and the directory reads it on load.
   *
   * replaceState, not pushState: dragging a checkbox around should not stack
   * a dozen history entries between the reader and the page they came from.
   * The whole thing is optional — without History support the filters still
   * work, they just stop being addressable.
   */
  // Match on the input's .value rather than building an attribute selector.
  // The vocabularies contain "Gene Expression & RNA" and "Epigenetics &
  // Chromatin"; escaping those safely for a selector is fiddly and CSS.escape
  // is the wrong tool for it (it escapes identifiers, not quoted strings).
  function inputsNamed(name) {
    return Array.prototype.slice.call(form.querySelectorAll('input[name="' + name + '"]'));
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

  function onChange() { apply(); writeUrl(); }

  form.addEventListener('change', onChange);
  searchEl.addEventListener('input', onChange);
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  function reset() {
    form.reset();
    apply();
    writeUrl();
    searchEl.focus();
  }

  document.getElementById('fd-reset').addEventListener('click', reset);
  Array.prototype.slice.call(document.querySelectorAll('[data-fd-reset]'))
    .forEach(function (btn) { btn.addEventListener('click', reset); });

  readUrl();   // must precede the first apply()
  apply();
})();
</script>
