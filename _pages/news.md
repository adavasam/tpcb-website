---
layout: page
title: News
permalink: /news/
nav: true
nav_order: 6
description: News and updates from the Tri-Institutional PhD Program in Chemical Biology.
---

{% assign news_by_date = site.news | sort: "date" %}
{% assign oldest_news = news_by_date | first %}
{% assign newest_news = news_by_date | last %}

<p class="page-lede">
  {{ site.news | size }} items from the program archive, spanning
  {{ oldest_news.date_display }} to {{ newest_news.date_display }}.
</p>

{%- comment -%}
  The source archive records month and year only, never a day. Every item is
  stored with day 01 as a placeholder, so the list renders `date_display`
  ("June 2026") rather than `date`, which would imply a precision the source
  does not have. Items are grouped under a month heading for the same reason.
{%- endcomment -%}

<div class="directory-controls" id="news-controls">
  <div class="filter-group">
    <span class="filter-legend" id="news-topic-label">Topic</span>
    <div class="filter-bar" role="group" aria-labelledby="news-topic-label">
      <button type="button" class="filter-btn active" data-tag="all" aria-pressed="true" data-label="All">All</button>
      {% assign all_tags = site.news | map: "tags" | join: "," | split: "," | uniq | sort %}
      {% for tag in all_tags %}
      <button type="button" class="filter-btn" data-tag="{{ tag }}" aria-pressed="false" data-label="{{ tag }}">{{ tag }}</button>
      {% endfor %}
    </div>
  </div>
  <div class="filter-group">
    <label class="filter-legend" for="news-search">Search</label>
    <input type="search" id="news-search" class="faculty-search-input" placeholder="Search news…" autocomplete="off">
  </div>
</div>

<p class="faculty-count" id="news-count" role="status"></p>

<div class="news-list" id="news-list">
{% assign sorted_news = site.news | sort: "date" | reverse %}
{% assign last_month = "" %}
{% for post in sorted_news %}
{% assign this_month = post.date_display | default: post.date | date: "%B %Y" %}
{% if this_month != last_month %}
<h2 class="news-month-heading" data-month="{{ this_month }}">{{ this_month }}</h2>
{% assign last_month = this_month %}
{% endif %}
<article class="news-item"
         data-tags="{{ post.tags | join: ' ' }}"
         data-month="{{ this_month }}"
         data-search="{{ post.title | append: ' ' | append: post.content | strip_html | truncatewords: 120 | downcase | escape }}">
  <div class="news-meta">
    <time datetime="{{ post.date | date: '%Y-%m' }}">{{ this_month }}</time>
    {% if post.tags %}
    <span class="news-tags">
      {% for tag in post.tags %}
      <span class="tag tag-{{ tag }}">{{ tag }}</span>
      {% endfor %}
    </span>
    {% endif %}
  </div>
  <h3 class="news-title"><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
  <div class="news-excerpt">{{ post.content | strip_html | truncatewords: 45 }}</div>
  <a href="{{ post.url | relative_url }}" class="read-more">Read more<span class="arrow" aria-hidden="true">&rarr;</span></a>
</article>
{% endfor %}
</div>

<p class="no-results hidden" id="no-results-news">
  No news items match your search.
  <button type="button" onclick="resetNewsFilters()">Clear filters</button>
</p>

<script>
(function () {
  var items = Array.from(document.querySelectorAll('.news-item'));
  var headings = Array.from(document.querySelectorAll('.news-month-heading'));
  var btns = Array.from(document.querySelectorAll('#news-controls [data-tag]'));
  var input = document.getElementById('news-search');
  var countEl = document.getElementById('news-count');
  var noResults = document.getElementById('no-results-news');
  var currentTag = 'all';

  function apply() {
    var q = input.value.toLowerCase().trim();
    var visible = 0;
    var shownMonths = {};
    items.forEach(function (el) {
      var tags = (el.dataset.tags || '').split(' ');
      var matchTag = currentTag === 'all' || tags.indexOf(currentTag) !== -1;
      var matchSearch = !q || (el.dataset.search || '').indexOf(q) !== -1;
      var show = matchTag && matchSearch;
      el.hidden = !show;
      if (show) { visible++; shownMonths[el.dataset.month] = true; }
    });
    // Hide a month heading once every item beneath it is filtered out.
    headings.forEach(function (h) { h.hidden = !shownMonths[h.dataset.month]; });
    countEl.textContent = 'Showing ' + visible + ' of ' + items.length + ' items';
    noResults.classList.toggle('hidden', visible > 0);
  }

  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      btns.forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      currentTag = btn.dataset.tag;
      apply();
    });
  });

  input.addEventListener('input', apply);

  window.resetNewsFilters = function () {
    currentTag = 'all';
    input.value = '';
    btns.forEach(function (b) {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btns[0].classList.add('active');
    btns[0].setAttribute('aria-pressed', 'true');
    apply();
    // apply() hides the .no-results block holding this button; move focus
    // somewhere real before it disappears.
    input.focus();
  };

  apply();
})();
</script>
