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
{%- assign faculty = site.faculty | sort: "sort_key" -%}
{%- assign total = faculty | size -%}

<div class="page-wrapper">
<div class="fd">

  <header class="fd-header">
    <h1 class="fd-title">Faculty</h1>
    <p class="fd-intro">
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
          <label class="fd-pill" for="inst-all">All</label>

          <input class="fd-input" type="radio" name="inst" id="inst-wcm" value="WCM">
          <label class="fd-pill fd-pill-wcm" for="inst-wcm">Weill Cornell</label>

          <input class="fd-input" type="radio" name="inst" id="inst-ru" value="Rockefeller">
          <label class="fd-pill fd-pill-rockefeller" for="inst-ru">Rockefeller</label>

          <input class="fd-input" type="radio" name="inst" id="inst-msk" value="MSK">
          <label class="fd-pill fd-pill-msk" for="inst-msk">MSK</label>
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
          <label class="fd-pill fd-pill-approach" for="ap-{{ aid }}">{{ a }}</label>
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
          <label class="fd-pill fd-pill-focus" for="fo-{{ fid }}">{{ f }}</label>
          {%- endfor %}
        </div>
      </fieldset>
    </div>

    <div class="fd-row fd-row-bottom">
      <div class="fd-switch-wrap">
        <input class="fd-switch-input" type="checkbox" id="fd-accepting"
               aria-describedby="fd-accepting-note">
        <label class="fd-switch" for="fd-accepting">
          <span class="fd-switch-track" aria-hidden="true"><span class="fd-switch-thumb"></span></span>
          <span class="fd-switch-label">Emphasize labs accepting students</span>
        </label>
        <span class="fd-switch-note" id="fd-accepting-note">
          Labs not currently accepting stay listed and sorted last, with their text fully legible.
        </span>
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
    {%- capture search_blob %}{{ member.name }} {{ member.lab_name }} {{ member.position }} {{ inst_name }} {{ member.description_short }} {{ approach_attr | replace: "|", " " }} {{ focus_attr | replace: "|", " " }}{% endcapture -%}
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
             alt="" loading="lazy" width="72" height="90">
        <div class="fd-card-id">
          <h2 class="fd-card-name">
            <a href="{{ member.url | relative_url }}">{{ member.name }}{% if member.degree %}, {{ member.degree }}{% endif %}</a>
          </h2>
          <span class="inst-badge inst-{{ inst_class }}">{{ inst_name }}</span>
        </div>
      </div>

      {% if member.description_short %}<p class="fd-card-blurb">{{ member.description_short }}</p>{% endif %}

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
    var emphasize = acceptingEl.checked;
    var visible = 0;

    cards.forEach(function (card) {
      var d = card.dataset;
      // AND across dimensions.
      var ok = (inst === 'all' || d.inst === inst) &&
               matchesAny(d.approach, approaches) &&
               matchesAny(d.focus, focuses) &&
               (!query || d.search.indexOf(query) !== -1);

      card.hidden = !ok;
      if (ok) visible++;

      // Faculty not accepting students are never hidden - only de-emphasized.
      var deprioritize = emphasize && d.accepting === 'no';
      card.classList.toggle('is-deprioritized', deprioritize);
    });

    // Reorder the DOM, not just the paint order. CSS `order` moved these cards
    // to the visual end while leaving them in place for the keyboard and the
    // screen reader, so tabbing jumped between the top and bottom of the grid.
    // Appending in the intended order keeps focus order and visual order in
    // agreement; appending the node that holds focus does not blur it.
    var head = [], tail = [];
    cards.forEach(function (card) {
      (card.classList.contains('is-deprioritized') ? tail : head).push(card);
    });
    var frag = document.createDocumentFragment();
    head.concat(tail).forEach(function (card) { frag.appendChild(card); });
    grid.appendChild(frag);

    countEl.textContent = 'Showing ' + visible + ' of ' + total + ' faculty';
    emptyEl.hidden = visible !== 0;
  }

  form.addEventListener('change', apply);
  searchEl.addEventListener('input', apply);
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  function reset() {
    form.reset();
    apply();
    searchEl.focus();
  }

  document.getElementById('fd-reset').addEventListener('click', reset);
  Array.prototype.slice.call(document.querySelectorAll('[data-fd-reset]'))
    .forEach(function (btn) { btn.addEventListener('click', reset); });

  apply();
})();
</script>
