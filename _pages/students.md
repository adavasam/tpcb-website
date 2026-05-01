---
layout: page
title: Students
permalink: /students/
nav: true
nav_order: 4
description: Current PhD students in the Tri-Institutional PhD Program in Chemical Biology.
---

## Current Students

TPCB currently has approximately {{ site.data.program.total_students }} students across all years, distributed across laboratories at Weill Cornell Medicine, The Rockefeller University, and Memorial Sloan Kettering Cancer Center.

<div class="student-grid">
{% assign sorted_students = site.students | sort: "name" %}
{% for student in sorted_students %}
<div class="student-card">
  <img src="{{ student.profile.image | prepend: '/assets/img/' | relative_url }}" alt="{{ student.name }}" class="student-headshot">
  <div class="student-info">
    <h3><a href="{{ student.url | relative_url }}">{{ student.name }}</a></h3>
    <p class="student-meta">Year {{ student.year }} · {{ student.institution }}</p>
    <p class="student-lab">{{ student.lab }}</p>
    {% if student.research_areas %}
    <div class="research-tags">
      {% for area in student.research_areas %}
      <span class="tag">{{ area }}</span>
      {% endfor %}
    </div>
    {% endif %}
  </div>
</div>
{% endfor %}
</div>
