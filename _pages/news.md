---
layout: page
title: News
permalink: /news/
nav: true
nav_order: 6
description: News and updates from the Tri-Institutional PhD Program in Chemical Biology.
---

<div class="news-list">
{% assign sorted_news = site.news | sort: "date" | reverse %}
{% for post in sorted_news %}
<article class="news-item">
  <div class="news-meta">
    <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%B %-d, %Y" }}</time>
    {% if post.tags %}
    <span class="news-tags">
      {% for tag in post.tags %}
      <span class="tag tag-{{ tag }}">{{ tag }}</span>
      {% endfor %}
    </span>
    {% endif %}
  </div>
  <h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h2>
  <div class="news-excerpt">{{ post.content | strip_html | truncatewords: 50 }}</div>
  <a href="{{ post.url | relative_url }}" class="read-more">Read more →</a>
</article>
{% endfor %}
</div>
