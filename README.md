# TPCB website

The website of the Tri-Institutional PhD Program in Chemical Biology (TPCB), a
joint PhD program of Weill Cornell Medicine, The Rockefeller University and
Memorial Sloan Kettering Cancer Center.

- Live site (prototype): https://adavasam.github.io/tpcb-website/
- Applications are handled by a separate service, https://tpcbapply.triiprograms.org/.
  This site only links to it (`application_url` in `_data/program.yml`).
- The previous site, https://chembio.triiprograms.org/, was the source for most
  of the content.

It is a static [Jekyll](https://jekyllrb.com/) site, built by GitHub Actions
and served by GitHub Pages. There is no backend, database, form handling,
analytics or third-party script, and the site sets no cookies. Two
`localStorage` keys remember the theme choice (`tpcb-theme`) and a paused hero
animation (`tpcb:hero-motion`).

## Quick start

You need the Ruby version in `.ruby-version` (4.0.3) and Bundler. macOS ships
Ruby 2.6, which is too old; install a current Ruby with Homebrew, rbenv, asdf
or similar. With Homebrew:

```sh
brew install ruby
export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
```

Then:

```sh
bundle install
bundle exec jekyll serve      # http://localhost:4000/tpcb-website/
```

Note the `/tpcb-website/` path: the site is configured for a GitHub Pages
project site (see [URLs and the custom domain](#urls-and-the-custom-domain)).

A production build, the same as CI:

```sh
JEKYLL_ENV=production bundle exec jekyll build    # output in _site/
```

The build should print no `Warning:`, `Conflict:` or `Error:` lines; CI fails if
it does. To check that the site also works at the root of a domain, build with
`--baseurl ""` and confirm no link contains `/tpcb-website`.

## How it is built

| Piece | Where | Notes |
|---|---|---|
| Configuration | `_config.yml` | Site title and description, collections, defaults, publishing exclusions |
| Page layout | `_layouts/default.html` | `<head>`, header and navigation, footer, site-wide scripts |
| Other layouts | `_layouts/` | `home` (homepage), `page` (ordinary pages), `post` (news items), `faculty-profile`, `profile` (students), `students-directory`, `bib` (one bibliography entry) |
| Includes | `_includes/` | `advisor-links.html`, `publication-list.html`, the nav caret SVG, the dark-theme tokens and the CSS partials |
| Pages | `_pages/` | One Markdown or HTML file per page, each with a `permalink:` |
| Collections | `_faculty/`, `_students/`, `_news/` | One file per person or news item |
| Data | `_data/` | Navigation, program facts, institutions, alumni, the publication index |
| Bibliography | `_bibliography/papers.bib` | Rendered by jekyll-scholar on /publications/ |
| Plugins | `_plugins/` | Two small hooks that derive fields; see below |
| Styles | `_includes/css/*.css` → `assets/css/site.scss` | One stylesheet, served as `site.css`; see [Styles](#styles) |
| Scripts | `assets/js/` | Small, dependency-free scripts; see [Scripts](#scripts) |
| Images | `assets/img/` | See [Images](#images) |
| Tools | `tools/` | Scripts that regenerate derived data; not part of the build |

### Plugins and dependencies

The Gemfile's `:jekyll_plugins` group decides which plugins load; `plugins:`
in `_config.yml` only mirrors it.

| Dependency | Why it is needed | If it is removed |
|---|---|---|
| jekyll | The site generator | — |
| jekyll-scholar | Renders /publications/ from `papers.bib` | The build fails |
| jekyll-seo-tag | Writes `<title>`, meta description, canonical URL and social-card tags (`{% seo %}`) | The build fails |
| jekyll-sitemap | Writes `sitemap.xml` and `robots.txt` | Both silently disappear |
| `_plugins/derive_student_fields.rb` | Computes each student's `advisor`, `lab` and `institutions` from `advisor_slugs`, and the `publication_key` their profile looks up in `_data/publications.yml` | Students silently show "TBD", no institution and no publications |
| `_plugins/derive_titles.rb` | Sets faculty and student page titles ("Name, PhD") | Titles silently fall back to the file name |

Because of the custom plugins and jekyll-scholar, the site cannot use GitHub's
built-in Pages builder (it runs in safe mode). Do not build with `--safe`.

To check dependencies periodically:

```sh
bundle outdated --only-explicit
gem install bundler-audit && bundle-audit check --update
```

bundler-audit's database misses some plugin advisories, so a clean run is not
proof; also check the GitHub advisory pages of jekyll-seo-tag and
jekyll-scholar when updating.

## Deployment

`.github/workflows/deploy.yml` builds and deploys on every push to `main`
(and on manual "Run workflow"). Pull requests are built but not deployed.
Dependabot (`.github/dependabot.yml`) opens a monthly pull request when an
action in the workflow has a new version.
In the repository settings, **Pages → Source must be "GitHub Actions"**.

The workflow takes `url` and `baseurl` from the Pages settings, so the values
in `_config.yml` only matter for local builds. A failed build leaves the last
deployment live.

## URLs and the custom domain

Every internal link goes through Jekyll's `relative_url` filter (or `{% link %}`),
and absolute URLs (canonical, sitemap, social cards) through `absolute_url`.
Both are built from two settings:

- `url`: the scheme and host, e.g. `https://adavasam.github.io`
- `baseurl`: the path the site lives under, e.g. `/tpcb-website`, or `""` at
  the root of a domain

Never hard-code `/tpcb-website/` in a link or a stylesheet.

### Moving to a custom domain

1. Decide the domain, and who controls its DNS.
2. In `_config.yml`, set `url` to the new origin (e.g. `https://chembio.example.org`)
   and `baseurl: ""`. This only affects local builds, but keeps them honest.
3. Build locally with those values and check for any `/tpcb-website` in `_site/`
   and that canonical URLs use the new host.
4. Point DNS at GitHub Pages (a `CNAME` record for a subdomain), then add the
   domain under Settings → Pages → Custom domain, wait for the certificate,
   and enable "Enforce HTTPS".
5. Re-run the workflow (Actions → "Build and deploy" → Run workflow). It picks
   up the new domain from the Pages settings, so canonical URLs, the sitemap
   and asset links switch over. Check one page's canonical URL and the
   stylesheet link after it deploys.

If the new site replaces chembio.triiprograms.org, the old site's URLs do not
match these ones; plan redirects separately. Until launch, the prototype is
fully indexable; decide whether it should carry `noindex`.

## Editing content

Every file in a collection has the same keys in the same order. A key with no
value is left **bare**, never `""`:

```yaml
fellowship:        # correct: empty (Liquid treats it as false)
fellowship: ""     # wrong: Liquid treats "" as true and renders an empty badge
```

Profile titles, advisors' names, labs and institutions are normally derived
at build time. For a student whose confirmed advisor has no faculty page,
the student-field plugin permits explicit `advisor`, `lab` and `institutions`
overrides with an empty `advisor_slugs` list. Use this exception only for
confirmed records that cannot be derived from faculty files.

The content is about real, named people. Do not add or change a fact about a
person (position, email, degree, advisor, honour, photo caption) without a
verifiable source, and leave a value out rather than guess.

### Faculty (`_faculty/<first-last>.md`)

The file name is the faculty member's *slug*, used by students and alumni to
name their advisors. Keys, in order:

```yaml
name: "Sean Brady"
degree: "PhD"
position: "Professor"
institution: "Rockefeller"        # WCM, Rockefeller or MSK (see _data/institutions.yml)
lab_name: "Laboratory of …"
email: "…"
accepting_students: true
sort_key: "brady sean"            # "last first", lowercase: the directory sorts on it
description: "One line"           # card text and meta description
education:                        # list of {degree, year, institution}
research_approach: [...]          # from the fixed list at the top of _pages/faculty.md
research_focus: [...]             # likewise
notable_honors: [...]
lab_website: "https://…"          # institutional profile ("Faculty page" button)
personal_lab_website: "https://…" # "Lab website" button
profile:
  image: logos/headshot-placeholder.png
  alt: "Photo of …"
```

The Markdown body is the research description. After adding, removing or
re-tagging faculty, run `ruby tools/derive_institution_strengths.rb` and paste
its output into `_data/institutions.yml`, then `python3 tools/build_pub_index.py`.

### Students (`_students/<first-last>.md`)

```yaml
name: "…"
email: "…"
cohort: 2026          # year entered
year: 1               # year in the program; update each summer
institution:          # only for a student with no advisor yet, e.g. "WCM"
advisor_slugs:        # list of faculty file names, e.g. - "sean-brady"; empty while rotating
undergrad: "…"
fellowship:           # e.g. "NSF GRFP", or bare
profile:
  image: logos/headshot-placeholder.png
  alt: "Photo of …"
```

The advisor names, lab and institution are derived from `advisor_slugs` by
`_plugins/derive_student_fields.rb`. A slug that matches no faculty file stops
the build with a clear error. After adding or removing a student, or changing
their name or `advisor_slugs`, run `python3 tools/build_pub_index.py`: the
publication index depends on both names and advisor relationships.

### Alumni (`_data/alumni.yml`)

One record per graduate; the fields are described at the top of the file.
`institutions` and `advisor_slugs` are always lists. An `advisor_slugs` entry
that matches no faculty file stops the build; use `""` for a sponsor who has
no faculty page.

After adding or removing an alumnus, or changing their name or `advisor_slugs`,
run `python3 tools/build_pub_index.py` to refresh faculty publication lists.
The index tool reads student and alumni records with Ruby's YAML parser, so
any valid YAML works. It stops without writing on a duplicate key, a record
with no `name`, an `advisor_slugs` that is not a list, or two students or
alumni whose names match the same publication credit (for example "Ana Pérez"
and "Ana Perez"): papers are matched by name, so the index cannot tell them
apart. Ask the program how to distinguish them; do not rename either person.

### News (`_news/YYYY/MM-short-title.md`)

```yaml
---
date: 2024-05-01            # always day 01: the archive is month-precision
title: "…"
tags: [awards, faculty]     # existing tags: awards, faculty, publications, students, symposium, …
---
Body in Markdown.
```

The URL is `/news/<year from date>/<file name>/`. Short titles repeat across
years, so **check a new file name against the others in the same year**: two
items with the same year and name would overwrite each other (CI fails on the
resulting "Conflict" warning). Link to another news item with
`{% link _news/2024/05-name.md %}`, which fails the build if the target moves.
A new tag needs a colour pair (`--tag-<name>-bg` / `-text`) in
`_includes/css/tpcb.css` and `_includes/theme-dark-tokens.css`.

### Pages and navigation

Pages live in `_pages/`, each with `title`, `permalink` and usually
`layout: page` and a `description`. The main menu is `_data/navigation.yml`;
the footer link columns are written in `_layouts/default.html`. Program-wide
facts (application deadline and portal URL, contact email and address, social
accounts) are in `_data/program.yml`.

### Publications

`_bibliography/papers.bib` holds every paper, each with a `tpcb_author` field
naming the TPCB student(s) it is credited to (`Last, First`, `;`-separated).
After editing it, regenerate the index the profile pages use:

```sh
python3 tools/build_pub_index.py          # writes _data/publications.yml
python3 tools/build_pub_index.py --check  # exits 1 if the index is stale
```

A faculty member's list is reached through their students, so it is labelled
"Publications with TPCB students". Do not match faculty names against the
`author` field: initials collide across different people.

## Images

| Kind | Where | Notes |
|---|---|---|
| Headshots | `assets/img/…`, path in each person's `profile.image` | Every profile currently uses `logos/headshot-placeholder.png`, with `alt=""` because the page heading names the person. Faculty pages crop to 4:5, the directories and student pages to a square. |
| Homepage photos | `assets/img/photos/` | Buildings or large groups only. Institution photos are set in `_data/institutions.yml`; the two community photos in `_layouts/home.html`. |
| News photos | `assets/img/news/` | Referenced from the news Markdown. |
| Institution logos | `assets/img/logos/*-logo-full.png` and `*-white.png` | Colour and white-ink versions; CSS shows one per theme. |
| TPCB wordmark | `assets/img/logos/tpcb-logo.png` (light theme) and `tpcb-logo-light.png` (light ink, for the dark theme) | Referenced in `_layouts/default.html` with their pixel sizes. |
| Social card | `assets/img/social-card.png` | 1200×630, used for link previews (`defaults:` in `_config.yml`). |

When adding a photograph:

- Compress it (the homepage photos are around 1600px wide) and keep the
  original out of the repository.
- Strip location and camera serial numbers first (the published photos have
  been):
  `exiftool -P -overwrite_original '-gps:all=' '-xmp:GPS*=' '-*SerialNumber*=' '-*Serial=' photo.jpg`.
  Avoid `exiftool -all=`, which also drops the colour profile and shifts colours.
- Alt text describes only what is visible. Do not caption a photo with a name,
  cohort, year or event the image itself does not show.

## Styles

The site loads one stylesheet, `assets/css/site.css`, built from
`assets/css/site.scss`. That file includes four partials from `_includes/css/`
in a fixed order — `tpcb.css`, `faculty.css`, `directory.css`,
`publications.css` — and later files deliberately override earlier ones, so
the order matters. The partials are plain CSS; Jekyll's Sass step only
minifies the result (`sass: style: compressed` in `_config.yml`), so comments
in them cost visitors nothing. They live in `_includes/` so they are not
published on their own, and must not have front matter.

- Design tokens (colours, spacing, type scale) are custom properties at the
  top of `tpcb.css`. The dark theme overrides them once, in
  `_includes/theme-dark-tokens.css`, which is emitted for both the system
  preference and the explicit toggle. Add dark values there, not per selector.
- One self-hosted font, Space Grotesk (`assets/fonts/`). It has no italic and no
  Greek glyphs.
- The navigation's collapse breakpoint (1365px) is measured against the width of
  the menu. Changing the nav font size, padding or number of items means
  re-measuring it (see the notes in `tpcb.css`).

## Scripts

All in `assets/js/`, plain JavaScript with no build step. The site works with
JavaScript off: lists are rendered in full, and CSS hides the filter controls
when scripting is off, since they would do nothing.

| File | Loaded on | Does |
|---|---|---|
| `nav.js` | every page | Hamburger panel, dropdown submenus, Escape handling |
| `theme.js` | every page | Light/dark toggle (the initial theme is applied by an inline script in `<head>`) |
| `scroll-chrome.js` | every page | Header's scrolled state and the reading-progress bar |
| `reveal.js` | every page | Homepage scroll reveal and count-up figures |
| `links.js` | every page, last | External links open in a new tab, with a screen-reader notice |
| `hero-atoms.js` | homepage | Hero background animation, with a pause button |
| `directory.js` | students, alumni, news | Filters, search and the alumni table sort |
| `faculty-directory.js` | /faculty/ | Faculty filters, kept in the query string |
| `publications.js` | /publications/ | Publication search |
| `profile-nav.js` | faculty profiles | Highlights the current section in the side rail |

Motion respects `prefers-reduced-motion`.

## Tools

`tools/` is excluded from the build.

| Script | Use |
|---|---|
| `build_pub_index.py` | Regenerate `_data/publications.yml` (`--check` to verify). Needs `ruby` on `PATH` to read the YAML roster |
| `dedupe_bib.py` | Merge duplicate entries in `papers.bib` (dry run unless `--apply`), keeping every student credit; then rerun `build_pub_index.py`. It refuses a merge whose first entry lacks `tpcb_author` |
| `derive_institution_strengths.rb` | Recompute the per-institution `strengths` from the faculty roster |
| `extract_old_site.py` | Turn a local crawl of the old site (`.crawl/`, not in the repository) into text, for comparing content. The old site keeps retired content inside HTML comments; the script strips them so it is not mistaken for live copy. |

The one-off scripts that migrated the old site's content are in the git
history.

The bibliography maintenance tools share `tools/bib_entries.py`. They accept
the repository's multiline entries with one braced field per line and a
separate closing brace. A final newline is optional. Unsupported BibTeX
syntax stops the tool before it writes; preserve the existing format when
editing entries. This restriction applies to the maintenance tools, not to
the full BibTeX syntax supported by jekyll-scholar. Both tools write through
`tools/safe_write.py`, so an interrupted run leaves the previous file intact.

Focused maintenance and script regression tests run without package installs:

```sh
python3 -m unittest discover -s tools/tests -p 'test_*.py'
bundle exec ruby tools/tests/test_template_contracts.rb
node --test tools/tests/*.test.cjs
```

The Python tests that read the roster need `ruby`, as the index tool does.
The Ruby test runs the real plugins and Liquid templates on synthetic
records, without building the site.

The JavaScript tests need Node.js 18 or newer only for testing; the site still
has no Node build step. These are code-level fixtures, not browser or
accessibility conformance tests. After editing publication inputs, also run
`python3 tools/build_pub_index.py --check`; CI does not currently enforce it.

## Publishing boundary

Jekyll copies any file it does not recognise into the site. Working files kept
at the repository root (spreadsheets, notes, crawls) must be listed in both
`.gitignore` and `exclude:` in `_config.yml`. `assets/fonts/OFL.txt` is
explicitly included because the font licence must ship with the font.
Git ignore rules alone do not protect a local build, and excluding a symlink's
target does not exclude the symlink's name. `AGENTS.md`, the program checklist,
and `.archive/` are explicitly covered alongside the other local materials.

## Licensing

`LICENSE` reserves all rights in the source code; it is not open source, so
reuse needs the copyright holder's permission. The site's content belongs to
the program and its institutions. Fonts, icons, brand marks, logos and
photographs are third-party material under their own terms; see `NOTICE`.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `bundle install` fails, or Jekyll errors on an old Ruby | You are on macOS's system Ruby; use the version in `.ruby-version`. |
| The site has no styling locally | Open `http://localhost:4000/tpcb-website/`, not the root. |
| `Conflict: … destination is shared by multiple files` | Two news items have the same year and file name; rename one. |
| `advisor_slugs […] match no file in _faculty/` | A student's advisor slug is misspelt or the faculty file was renamed. |
| `Liquid error: undefined filter` | A typo in a filter name; the build fails on purpose. |
| A student shows "TBD" for their sponsor | `advisor_slugs` is empty (expected for rotating first-years). |
| A faculty or student publication list is wrong | Regenerate with `python3 tools/build_pub_index.py`. |
| An old asset still appears locally after deletion | Delete `_site/` and rebuild. |
