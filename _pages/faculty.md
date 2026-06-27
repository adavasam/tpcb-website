---
layout: default
title: Faculty
permalink: /faculty/
nav: true
nav_order: 2
description: Faculty directory for the Tri-Institutional PhD Program in Chemical Biology.
---

<div class="faculty-page-wrapper">
  <div class="faculty-page-header">
    <h1>Faculty Directory</h1>
    <p class="faculty-page-desc">{{ page.description }}</p>
  </div>

  <div class="faculty-controls">
    <div class="filter-row filter-row-inst">
      <button class="filter-pill filter-pill-inst active" data-inst="all">All</button>
      <button class="filter-pill filter-pill-inst" data-inst="WCM">Weill Cornell</button>
      <button class="filter-pill filter-pill-inst" data-inst="Rockefeller">Rockefeller</button>
      <button class="filter-pill filter-pill-inst" data-inst="MSK">MSK</button>
      <input type="search" class="faculty-search-input" placeholder="Search faculty…" aria-label="Search faculty">
    </div>
    <div class="filter-row filter-row-approach">
      <span class="filter-row-label">Approach:</span>
      <button class="filter-pill filter-pill-approach" data-approach="Biophysics">Biophysics</button>
      <button class="filter-pill filter-pill-approach" data-approach="Chemical Cell Biology">Chemical Cell Biology</button>
      <button class="filter-pill filter-pill-approach" data-approach="Chemical Proteomics">Chemical Proteomics</button>
      <button class="filter-pill filter-pill-approach" data-approach="Chemical Synthesis">Chemical Synthesis</button>
      <button class="filter-pill filter-pill-approach" data-approach="Computational Methods">Computational Methods</button>
      <button class="filter-pill filter-pill-approach" data-approach="Drug Discovery">Drug Discovery</button>
      <button class="filter-pill filter-pill-approach" data-approach="Structural Biology">Structural Biology</button>
    </div>
    <div class="filter-row filter-row-focus">
      <span class="filter-row-label">Focus:</span>
      <button class="filter-pill filter-pill-focus" data-focus="Cancer Biology">Cancer Biology</button>
      <button class="filter-pill filter-pill-focus" data-focus="Cell Signaling">Cell Signaling</button>
      <button class="filter-pill filter-pill-focus" data-focus="Epigenetics &amp; Chromatin">Epigenetics &amp; Chromatin</button>
      <button class="filter-pill filter-pill-focus" data-focus="Gene Expression &amp; RNA">Gene Expression &amp; RNA</button>
      <button class="filter-pill filter-pill-focus" data-focus="Infectious Disease">Infectious Disease</button>
      <button class="filter-pill filter-pill-focus" data-focus="Membrane Proteins">Membrane Proteins</button>
      <button class="filter-pill filter-pill-focus" data-focus="Neuroscience">Neuroscience</button>
    </div>
    <div class="accepting-toggle">
      <label class="toggle-switch">
        <input type="checkbox" id="accepting-toggle-input">
        <span class="toggle-slider"></span>
      </label>
      <span class="toggle-label">Show only labs accepting students</span>
    </div>
  </div>

  <p id="faculty-count" class="faculty-count-line">Showing {% assign total = site.faculty | size %}{{ total }} of {{ total }} faculty</p>

  <div class="faculty-grid" id="faculty-grid">
    {% assign sorted_faculty = site.faculty | sort: "name" %}
    {% for member in sorted_faculty %}
      {% assign inst_lower = member.institution | downcase %}
      {% assign accepting_lower = member.accepting_students | downcase %}
      {% assign approach_vals = "" %}
      {% for a in member.research_approach %}{% assign approach_vals = approach_vals | append: a | append: " " %}{% endfor %}
      {% assign focus_vals = "" %}
      {% for f in member.research_focus %}{% assign focus_vals = focus_vals | append: f | append: " " %}{% endfor %}
      <div class="faculty-card"
           data-inst="{{ member.institution }}"
           data-approach="{{ approach_vals | strip }}"
           data-focus="{{ focus_vals | strip }}"
           data-name="{{ member.name | downcase }}"
           data-accepting="{{ accepting_lower }}"
           onclick="window.location='{{ member.url | relative_url }}'">
        <div class="faculty-card-image {% if member.accepting_students == 'No' %}fc-img-inactive{% endif %}">
          <img src="{{ '/assets/img/logos/headshot-placeholder.png' | relative_url }}" alt="{{ member.profile.alt | default: member.name }}">
        </div>
        <div class="faculty-card-body">
          <div class="fc-card-top">
            <h3 class="faculty-name"><a href="{{ member.url | relative_url }}" onclick="event.stopPropagation()">{{ member.name }}</a></h3>
            {% if member.institution == "WCM" %}
              <span class="fc-inst-badge fc-inst-wcm">Weill Cornell</span>
            {% elsif member.institution == "Rockefeller" %}
              <span class="fc-inst-badge fc-inst-rockefeller">Rockefeller</span>
            {% elsif member.institution == "MSK" %}
              <span class="fc-inst-badge fc-inst-msk">MSK</span>
            {% endif %}
          </div>
          {% if member.research_approach.size > 0 %}
          <div class="fc-tags fc-tags-approach">
            {% for a in member.research_approach limit: 2 %}
              <span class="fc-tag fc-tag-approach">{{ a }}</span>
            {% endfor %}
            {% if member.research_approach.size > 2 %}
              <span class="fc-tag-more">+{{ member.research_approach.size | minus: 2 }} more</span>
            {% endif %}
          </div>
          {% endif %}
          {% if member.research_focus.size > 0 %}
          <div class="fc-tags fc-tags-focus">
            {% for f in member.research_focus limit: 2 %}
              <span class="fc-tag fc-tag-focus">{{ f }}</span>
            {% endfor %}
            {% if member.research_focus.size > 2 %}
              <span class="fc-tag-more">+{{ member.research_focus.size | minus: 2 }} more</span>
            {% endif %}
          </div>
          {% endif %}
          <div class="fc-status {% if member.accepting_students == 'Yes' %}fc-status-yes{% else %}fc-status-no{% endif %}">
            <span class="fc-status-dot"></span>
            {% if member.accepting_students == "Yes" %}Accepting students{% else %}Not accepting{% endif %}
          </div>
        </div>
      </div>
    {% endfor %}
  </div>
</div>

<script>
(function() {
  var totalCount = {{ site.faculty | size }};
  var grid = document.getElementById('faculty-grid');
  var countEl = document.getElementById('faculty-count');
  var cards = Array.from(grid.querySelectorAll('.faculty-card'));

  var activeInst = 'all';
  var activeApproaches = [];
  var activeFocuses = [];
  var acceptingOnly = false;
  var searchQuery = '';

  function updateCount() {
    var visible = cards.filter(function(c) { return !c.classList.contains('fc-hidden'); }).length;
    countEl.textContent = 'Showing ' + visible + ' of ' + totalCount + ' faculty';
  }

  function applyFilters() {
    cards.forEach(function(card) {
      var inst = card.dataset.inst;
      var approach = card.dataset.approach || '';
      var focus = card.dataset.focus || '';
      var name = card.dataset.name || '';
      var accepting = card.dataset.accepting || '';

      var passInst = activeInst === 'all' || inst === activeInst;

      var passApproach = true;
      if (activeApproaches.length > 0) {
        passApproach = activeApproaches.some(function(a) { return approach.indexOf(a) !== -1; });
      }

      var passFocus = true;
      if (activeFocuses.length > 0) {
        passFocus = activeFocuses.some(function(f) { return focus.indexOf(f) !== -1; });
      }

      var passAccepting = !acceptingOnly || accepting === 'yes';

      var passSearch = true;
      if (searchQuery.length > 0) {
        passSearch = name.indexOf(searchQuery) !== -1
          || approach.toLowerCase().indexOf(searchQuery) !== -1
          || focus.toLowerCase().indexOf(searchQuery) !== -1;
      }

      var visible = passInst && passApproach && passFocus && passAccepting && passSearch;
      card.classList.toggle('fc-hidden', !visible);
    });
    updateCount();
  }

  document.querySelectorAll('.filter-pill-inst').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-pill-inst').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeInst = btn.dataset.inst;
      applyFilters();
    });
  });

  document.querySelectorAll('.filter-pill-approach').forEach(function(btn) {
    btn.addEventListener('click', function() {
      btn.classList.toggle('active');
      var val = btn.dataset.approach;
      var idx = activeApproaches.indexOf(val);
      if (idx === -1) { activeApproaches.push(val); } else { activeApproaches.splice(idx, 1); }
      applyFilters();
    });
  });

  document.querySelectorAll('.filter-pill-focus').forEach(function(btn) {
    btn.addEventListener('click', function() {
      btn.classList.toggle('active');
      var val = btn.dataset.focus;
      var idx = activeFocuses.indexOf(val);
      if (idx === -1) { activeFocuses.push(val); } else { activeFocuses.splice(idx, 1); }
      applyFilters();
    });
  });

  document.getElementById('accepting-toggle-input').addEventListener('change', function() {
    acceptingOnly = this.checked;
    applyFilters();
  });

  document.querySelector('.faculty-search-input').addEventListener('input', function() {
    searchQuery = this.value.toLowerCase().trim();
    applyFilters();
  });

  updateCount();
})();
</script>
