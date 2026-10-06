---
layout: default
title: Faculty
permalink: /faculty/
description: Browse the training faculty of the Tri-Institutional PhD Program in Chemical Biology at Weill Cornell Medicine, The Rockefeller University, and Memorial Sloan Kettering.
---

{%- assign approaches = "Structural Biology|Biophysics|Chemical Cell Biology|Chemical Proteomics|Drug Discovery|Computational Methods|Chemical Synthesis" | split: "|" -%}
{%- assign focuses = "Cancer Biology|Cell Signaling|Membrane Proteins|Infectious Disease|Gene Expression & RNA|Epigenetics & Chromatin|Neuroscience" | split: "|" -%}
{%- comment -%}
  `sort_key` ("lastname firstname") is read only here, which makes it look
  unused. Liquid cannot sort by surname, so keep it in every _faculty/ file.
{%- endcomment -%}
{%- assign faculty = site.faculty | sort: "sort_key" -%}
{%- assign total = faculty | size -%}

{%- comment -%}
  The page header is written out rather than taken from `layout: page` because
  the lede uses {{ total }}, and Liquid does not run inside front matter.
  Filtering is done by assets/js/faculty-directory.js.
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
          <span class="fd-pill-wrap"><input class="fd-input" type="radio" name="inst" id="inst-all" value="all" checked>
            <label class="fd-pill" for="inst-all" data-label="All">All</label></span>

          <span class="fd-pill-wrap"><input class="fd-input" type="radio" name="inst" id="inst-wcm" value="WCM">
            <label class="fd-pill fd-pill-wcm" for="inst-wcm" data-label="Weill Cornell">Weill Cornell</label></span>

          <span class="fd-pill-wrap"><input class="fd-input" type="radio" name="inst" id="inst-ru" value="Rockefeller">
            <label class="fd-pill fd-pill-rockefeller" for="inst-ru" data-label="Rockefeller">Rockefeller</label></span>

          <span class="fd-pill-wrap"><input class="fd-input" type="radio" name="inst" id="inst-msk" value="MSK">
            <label class="fd-pill fd-pill-msk" for="inst-msk" data-label="MSK">MSK</label></span>
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
          <span class="fd-pill-wrap"><input class="fd-input" type="checkbox" name="approach" id="ap-{{ aid }}" value="{{ a }}">
            <label class="fd-pill" for="ap-{{ aid }}" data-label="{{ a }}">{{ a }}</label></span>
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
          <span class="fd-pill-wrap"><input class="fd-input" type="checkbox" name="focus" id="fo-{{ fid }}" value="{{ f }}">
            <label class="fd-pill" for="fo-{{ fid }}" data-label="{{ f }}">{{ f }}</label></span>
          {%- endfor %}
        </div>
      </fieldset>
    </div>

    <div class="fd-row fd-row-bottom">
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

      <p class="fd-card-status {% if member.accepting_students %}is-accepting{% endif %}">
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

<script src="{{ '/assets/js/faculty-directory.js' | relative_url }}"></script>
