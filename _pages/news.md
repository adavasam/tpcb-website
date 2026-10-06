---
layout: page
title: News
permalink: /news/
description: News and updates from the Tri-Institutional PhD Program in Chemical Biology.
---

{% assign news_by_date = site.news | sort: "date" %}
{% assign oldest_news = news_by_date | first %}
{% assign newest_news = news_by_date | last %}

<p class="page-lede">
  {{ site.news | size }} items from the program archive, spanning
  {{ oldest_news.date | date: "%B %Y" }} to {{ newest_news.date | date: "%B %Y" }}.
</p>

{% comment %}
  The archive records month and year only, so items are listed under month
  headings and dated "%B %Y" (every file uses day 01 as a placeholder).
  Filtering is done by assets/js/directory.js.
{% endcomment %}

<div class="directory-controls" id="news-controls" hidden
     data-filter-controls data-items=".news-item" data-noun="items"
     data-count="news-count" data-empty="no-results-news">
  <div class="filter-group">
    <span class="filter-legend" id="news-topic-label">Topic</span>
    <div class="filter-bar" role="group" aria-labelledby="news-topic-label" data-filter-key="tags">
      <button type="button" class="filter-btn active" data-value="all" aria-pressed="true" data-label="All">All</button>
      {% assign all_tags = site.news | map: "tags" | join: "," | split: "," | uniq | sort %}
      {% for tag in all_tags %}
      <button type="button" class="filter-btn" data-value="{{ tag }}" aria-pressed="false" data-label="{{ tag }}">{{ tag }}</button>
      {% endfor %}
    </div>
  </div>
  <div class="filter-group">
    <label class="filter-legend" for="news-search">Search</label>
    <input type="search" id="news-search" class="faculty-search-input" placeholder="Search news…" autocomplete="off" data-filter-search>
  </div>
</div>

<p class="faculty-count" id="news-count" role="status">Showing {{ site.news | size }} of {{ site.news | size }} items</p>

<div class="news-list" id="news-list">
{% assign sorted_news = site.news | sort: "date" | reverse %}
{% assign last_month = "" %}
{% for post in sorted_news %}
{% assign this_month = post.date | date: "%B %Y" %}
{% if this_month != last_month %}
<h2 class="news-month-heading" data-group-heading data-group="{{ this_month }}">{{ this_month }}</h2>
{% assign last_month = this_month %}
{% endif %}
<article class="news-item"
         data-tags="{{ post.tags | join: ' ' }}"
         data-group="{{ this_month }}"
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
  <h3 class="news-title"><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></h3>
  <div class="news-excerpt">{{ post.content | strip_html | truncatewords: 45 }}</div>
  <a href="{{ post.url | relative_url }}" class="read-more">Read more<span class="visually-hidden"> about {{ post.title | escape }}</span><span class="arrow" aria-hidden="true">&rarr;</span></a>
</article>
{% endfor %}
</div>

<p class="no-results" id="no-results-news" hidden>
  No news items match your search.
  <button type="button" data-filter-reset>Clear filters</button>
</p>

<script src="{{ '/assets/js/directory.js' | relative_url }}"></script>
