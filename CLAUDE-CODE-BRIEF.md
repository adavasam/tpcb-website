# Claude Code Brief: TPCB Website Rebuild
**Tri-Institutional PhD Program in Chemical Biology**
Reference site: https://chembio.triiprograms.org/

---

## Project overview

Rebuild the TPCB program website as a modern static site using **Jekyll** with the
**al-folio theme** (`alshedivat/al-folio`), hosted on **GitHub Pages**. The current
site is a neglected WordPress install with a 2014 theme. The goal is a fast,
maintainable, mobile-responsive site that serves two primary audiences:

1. **Prospective students** — evaluating the program, finding faculty, applying
2. **Current students & faculty** — news, publications, program resources

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Jekyll (GitHub Pages compatible) |
| Theme | al-folio (`alshedivat/al-folio`) |
| Hosting | GitHub Pages |
| Publications | jekyll-scholar (renders from `.bib` file) |
| Deployment | GitHub Actions (al-folio default workflow) |

---

## Site structure

### Collections (Jekyll)

```
_faculty/       # ~65 faculty, one .md per person
_students/      # current PhD students
_news/          # news posts (replaces WP blog)
_pages/         # all static pages
_bibliography/  # papers.bib for publications
_data/          # navigation.yml, institutions.yml, alumni.yml
```

### Pages and nav hierarchy

```
Home
About
  ├── Program of study
  ├── Director's message
  ├── Life in NYC
  ├── Our commitment             ← replaces "Student Support"; broader framing
  └── Contact
Faculty
  ├── Faculty directory          ← filterable grid (see below)
  └── Faculty profiles
Research                         ← single page, no dropdown
Students
  ├── Current students
  ├── Student profiles
  ├── Outreach                   ← replaces "Science Outreach"
  └── External fellowships
Alumni
  ├── Alumni directory
  └── Alumni profiles
News                             ← single page, no dropdown
Publications                     ← single page, no dropdown; rendered from papers.bib
Summer Program                   ← single page, no dropdown; audience: undergraduates
Apply →                          ← CTA button pinned to right of nav bar; links to portal
```

> Notes on changes from the current site:
> - "TPCB Profiles" (old standalone nav item) is dissolved — faculty profiles go
>   under Faculty, student/alumni profiles under their respective tabs.
> - FAQ page removed — content folded into the Prospective Students section of
>   the About overview and the Our Commitment page.
> - "Publications & News" and "Students & Alumni" and "Faculty & Research" are
>   each split into separate top-level tabs.
> - Summer Program promoted from buried under About to its own top-level tab.
> - "Apply" is a styled CTA button, not a standard nav item — right-aligned in
>   the nav bar, visually distinct.

---

## Key components to build

### 1. Faculty directory (`_pages/faculty.md`)

- Renders the `_faculty` Jekyll collection as a **card grid**
- Each card: headshot, name, institution badge, 2–3 research area tags
- **Filter bar** at top: All | Weill Cornell | Rockefeller | MSK
- **Search input** that filters cards client-side by name or research area
- Cards link to individual faculty profile pages (auto-generated from `_faculty/`)
- Filter/search implemented in vanilla JS, no dependencies

Faculty front matter schema:
```yaml
---
layout: profile
name: John D. Chodera, PhD
institution: Rockefeller        # WCM | Rockefeller | MSK
department: Computational and Systems Biology
website: https://choderalab.org
profile:
  image: faculty/chodera-john.jpg
research_areas:
  - Computational Drug Discovery
  - Free Energy Calculations
  - Molecular Dynamics
---
Body text: 2–3 sentence lab description.
```

### 2. Prospective students page (`_pages/prospective.md`)

This is the most important page for program growth. Must include:
- Current application deadline (prominently displayed, not buried)
- Program highlights (3-institution, NYC, avg publications per graduate)
- Clear "Apply Now" button linking to the application portal
- Links to: faculty directory, student profiles, contact
- Common questions answered inline (replaces the removed FAQ page)

### 3. Research page (`_pages/research.md`)

Single page, no dropdown. Must include:
- Brief overview of the program's scientific themes (chemical synthesis,
  structural biology, chemical genetics, chemical biology of disease, etc.)
- Core facilities section (NMR, crystallography, proteomics, etc.)
- Note that the seminar series exists (link or brief mention) — no dedicated page

### 4. News feed (`_pages/news.md` + `_news/` posts)

- Paginated list of news posts (10 per page)
- Each post has: date, headline, 1–2 paragraph body, optional image
- Homepage shows the 5 most recent news items with "View all news" link
- Tags supported (awards, publications, students, faculty, events)

News post front matter schema:
```yaml
---
layout: post
date: 2026-02-01
title: Gabriella Chua honored with 2026 Harold Weintraub Award
tags: [awards, students]
---
```

### 5. Publications page (`_pages/publications.md`)

- Rendered from `_bibliography/papers.bib` via **jekyll-scholar**
- Grouped by year, descending
- Seed the `.bib` file with recent TPCB publications as placeholder content
- Include a note that the `.bib` file is the source of truth for updates

### 6. Homepage (`_pages/home.md`)

Replace the static slideshow with:
- **Hero section**: Program name, one-sentence description, two CTAs:
  "Prospective Students →" and "Faculty Directory →"
- **Three-column highlights**: The Science | The People | The City
  (mirrors current site's existing structure — keep this, it works)
- **News feed**: 5 most recent `_news/` posts
- **Institutional logos**: WCM + Rockefeller + MSK seals, footer only
  (remove from header — header should just be the site title/nav)

---

## Issues to fix from the current site

These are bugs/oversights in the current WP site. Do not replicate them.

| # | Issue | Fix |
|---|---|---|
| 1 | Application deadline shows "December 1, 2013" | Display deadline from a `_data/program.yml` variable so it's easy to update each cycle |
| 2 | WordPress admin instructions visible in page content | N/A — gone with WP |
| 3 | No mobile-responsive layout | al-folio is fully responsive by default |
| 4 | "TPCB Profiles" redundant top-level nav item | Dissolved — profiles merged into Faculty, Students, and Alumni tabs |
| 5 | Faculty directory has no filter or search | Built into the Faculty page (see component spec above) |
| 6 | No fast path for prospective students | Dedicated prospective page + "Apply" CTA button pinned in nav bar |
| 7 | Publications section empty | jekyll-scholar rendering from .bib on standalone Publications page |
| 8 | Student profiles sparse (only 1 listed) | Scaffold 3–4 placeholder profiles under Students tab |
| 9 | Institutional seals in both header and footer | Footer only |
| 10 | No SEO metadata | al-folio + jekyll-seo-tag handles this via front matter |
| 11 | "Faculty & Research", "Students & Alumni", "Publications & News" are over-bundled | Each split into separate top-level tabs |
| 12 | Summer Program buried under About | Promoted to its own top-level tab |
| 13 | FAQ page is thin and duplicates other content | Removed — content folded into Prospective page and Our Commitment |

---

## Configuration

See `_config.yml` in this repo for the full annotated config. Key values to
update before going live:

```yaml
url: https://adavasam.github.io
baseurl: /tpcb-website
github_username: adavasam
accent_color: "#1a4a8a"                 # institutional blue — adjust to match
```

### Easy-update data file (`_data/program.yml`)

Create this file so non-technical maintainers can update key details without
touching page files:

```yaml
application_deadline: "December 1, 2025"
application_url: https://tpcbapply.triiprograms.org/
current_cohort_size: 8          # approx incoming class size
total_students: ~50
avg_publications: 5
founding_year: 1991
contact_email: tpcb@triiprograms.org
contact_address: "1300 York Ave at 69th St, New York, NY 10065"
```

Reference in pages as: `{{ site.data.program.application_deadline }}`

---

## Institutions data (`_data/institutions.yml`)

```yaml
- name: Weill Cornell Medicine
  short: WCM
  url: https://www.med.cornell.edu/
  logo_seal: logos/wcm-logo-seal.jpg
  logo_full: logos/wcm-logo-full.png
  color: "#b31b1b"

- name: The Rockefeller University
  short: Rockefeller
  url: https://www.rockefeller.edu/
  logo_seal: logos/ru-logo-seal.png
  logo_full: logos/ru-logo-full.png
  color: "#003087"

- name: Memorial Sloan Kettering Cancer Center
  short: MSK
  url: https://www.mskcc.org/
  logo_seal: logos/msk-logo-seal.png
  logo_full: logos/msk-logo-full.webp
  color: "#00529b"
```

---

## Assets already in the repo

The following files are already present in `assets/img/logos/` — use these
exact filenames wherever logos or placeholders are referenced. Do not rename
or regenerate them.

```
assets/img/logos/
├── wcm-logo-seal.jpg          # Weill Cornell seal (use in footer)
├── wcm-logo-full.png          # Weill Cornell full logo
├── ru-logo-seal.png           # Rockefeller seal (use in footer)
├── ru-logo-full.png           # Rockefeller full logo
├── msk-logo-seal.png          # MSK seal (use in footer)
├── mskcc-logo-full.webp       # MSK full logo
└── headshot-placeholder.png   # Use for any faculty/student without a real headshot
```

All other images (faculty headshots, news post images, student photos) do not
exist yet. Reference `logos/headshot-placeholder.png` wherever a person's
photo would appear — do not attempt to source or generate real headshots.

---

## Seed content to generate

Claude Code should scaffold the following placeholder content so the site
renders completely on first build — real content can be swapped in later.

- **5 faculty profiles** (use real faculty from the current site's directory:
  Chodera, Lyu, Tan, Brady, David — pull names/departments from the current site)
- **3 student profiles** (fictional placeholders with realistic structure)
- **5 news posts** (use real news items from the current site's homepage)
- **10 publications** in `papers.bib` (real recent publications from TPCB labs
  are findable via PubMed — use real DOIs if possible, otherwise placeholder)
- **All static pages** with stub content (1–2 paragraphs each) so no page is blank
- **`ADMIN-GUIDE.md`** in the repo root — a plain-English guide for non-technical
  maintainers covering the 5 most common update tasks:
  1. Adding a news post
  2. Updating the application deadline
  3. Adding a faculty member (including uploading a headshot)
  4. Adding a student profile
  5. Adding a publication to the .bib file
  Each task should show the exact file to edit and the minimal front matter
  required, with a screenshot-ready example. No terminal commands — all steps
  via the GitHub web UI.

---

## Out of scope for initial build

- Authentication / intranet section (currently behind a WP login)
- Dynamic application form (links out to existing portal)
- Events calendar integration
- Automated PubMed/CrossRef sync for publications (manual .bib update is fine)

---

## Acceptance criteria

- [ ] Site builds with `bundle exec jekyll serve` with no errors
- [ ] All nav links resolve (no 404s)
- [ ] Faculty directory filter works for all three institutions
- [ ] Faculty directory search filters by name and research area
- [ ] Homepage news feed shows 5 most recent posts
- [ ] Publications page renders from `.bib` grouped by year
- [ ] Application deadline pulled from `_data/program.yml` (not hardcoded)
- [ ] Mobile layout tested at 375px width — no horizontal overflow
- [ ] `_config.yml` has correct `url` and `baseurl` for GitHub Pages
- [ ] GitHub Actions deploy workflow present (al-folio default)
