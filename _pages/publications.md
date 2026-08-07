---
layout: page
title: Publications
permalink: /publications/
nav: true
nav_order: 7
description: 658 peer-reviewed papers by 166 TPCB graduate students — an average of 5.4 publications per graduate.
---

TPCB students publish. The record below collects **658 papers authored by 166 students**
of the Tri-Institutional PhD Program in Chemical Biology, spanning 2003 to the present
and appearing in 193 different journals. That works out to an average of **5.4
publications per graduate**.

Each entry is tagged with the TPCB students who authored it, and links out to the paper
by DOI and PubMed ID. Papers are grouped by year, most recent first. Eighty-three of
these papers were co-authored by more than one TPCB student and are listed once, tagged
with every student author.

The work reflects the program's range: structural biology, chemical synthesis, RNA
biology, immunology, imaging and computation, carried out in
[faculty laboratories]({{ '/faculty/' | relative_url }}) across Weill Cornell Medicine,
The Rockefeller University and Memorial Sloan Kettering. See who is doing it now on the
[current students]({{ '/students/' | relative_url }}) page, and where they have gone on
the [alumni]({{ '/alumni/' | relative_url }}) page.

<!--
  The controls ship hidden and assets/js/publications.js reveals them once it
  has indexed the list. Nothing here generates a publication: the full
  bibliography below is server-rendered, so with JavaScript off the page is the
  complete record, just without a way to narrow it.
-->
<form class="pubfilter" role="search" aria-label="Filter publications" hidden>
  <div class="pubfilter-field">
    <label for="pub-search">Search</label>
    <input type="search" id="pub-search" autocomplete="off"
           placeholder="Student, title, journal or author">
  </div>

  <button type="button" class="pubfilter-clear" id="pubfilter-clear" hidden>Clear search</button>
  <p class="pubfilter-count" id="pubfilter-count" role="status" aria-live="polite"></p>
</form>

<p class="pubfilter-empty" hidden>No publications match those filters.</p>

<div class="bib-wrapper">
{% bibliography %}
</div>
