---
layout: page
title: Alumni
permalink: /alumni/
nav: true
nav_order: 5
description: Alumni of the Tri-Institutional PhD Program in Chemical Biology.
---

## Alumni Directory

TPCB graduates pursue careers across academia, industry, and public service. The program has trained over 200 PhD scientists since its founding in {{ site.data.program.founding_year }}, and our alumni community spans major research universities, pharmaceutical and biotechnology companies, government laboratories, and science policy organizations.

<div class="alumni-table-wrapper">
<table class="alumni-table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Year</th>
      <th>Institution</th>
      <th>Thesis Lab</th>
      <th>Current Position</th>
    </tr>
  </thead>
  <tbody>
    {% assign sorted_alumni = site.data.alumni | sort: "year" | reverse %}
    {% for alum in sorted_alumni %}
    <tr>
      <td>{{ alum.name }}</td>
      <td>{{ alum.year }}</td>
      <td>{{ alum.institution }}</td>
      <td>{{ alum.lab }}</td>
      <td>{{ alum.current_position }}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>
</div>

---

*Alumni directory is a partial listing. For corrections or to update your information, contact [{{ site.data.program.contact_email }}](mailto:{{ site.data.program.contact_email }}).*
