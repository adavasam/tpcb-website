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

You need the Ruby version in `.ruby-version` (4.0.3) and Bundler. Do not rely on
macOS's system Ruby; select the pinned version with Homebrew, rbenv, asdf
or similar, and check `ruby -v`. With Homebrew:

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

A production build (CI also checks its log for warnings):

```sh
JEKYLL_ENV=production bundle exec jekyll build    # output in _site/
```

The build should print no `Warning:`, `Conflict:` or `Error:` lines; CI fails if
it does. To check that the site also works at the root of a domain, build with
`--baseurl ""` and inspect the generated links for the old subpath. Run the
[regression checks](#tools-and-tests) before handing off a change. Restart
`jekyll serve` after changing `_config.yml` or Ruby plugins.

## Architecture and data flow

Read `_config.yml` for collection URLs and default layouts, then follow one
student from `_students/` through `_plugins/derive_student_fields.rb` to
`_layouts/profile.html`. The build has two distinct stages:

1. **Maintenance:** explicitly run tools to refresh the tracked publication
   index and institution strengths. Jekyll runs neither tool.
2. **Build:** Jekyll reads sources, runs `_plugins/` at `:post_read`, renders
   Liquid/Markdown and nested layouts, then writes `_site/`. Derived student
   fields exist only in memory. `default.html` supplies the shared shell.
   Browser scripts enhance the HTML without fetching content data.

```text
_students/ + _faculty/ -> Ruby hooks -> student fields and profile titles
_pages/ + collections + _data/ -> Liquid layouts/includes -> _site/ HTML
papers.bib -> jekyll-scholar -> bib.html -> /publications/
papers.bib + students/alumni -> build_pub_index.py -> publications.yml
                                                    -> profile lists
_includes/css/ -> assets/css/site.scss (Liquid, then Sass) -> site.css
assets/js/ + rendered HTML data attributes -> browser interactions
```

| Source | Purpose |
|---|---|
| `_config.yml` | Site settings, collection URLs, default layouts, exclusions |
| `_pages/` | Pages and directories, with explicit permalinks |
| `_faculty/`, `_students/`, `_news/` | One Markdown file per person or news item |
| `_data/` | Navigation, program settings, institutions, alumni and generated publication index |
| `_layouts/`, `_includes/` | Page shells and shared fragments; `profile` means student, `faculty-profile` means faculty, `post` means news |
| `assets/` | Images, self-hosted font, compiled stylesheet entry point and browser scripts |
| `tools/` | Explicit maintenance commands and tests; excluded from the build |

### Plugins and dependencies

Bundler loads the Gemfile's `:jekyll_plugins` group automatically; Jekyll also
loads gems listed in `_config.yml`'s `plugins:`. Keep both lists in step.
Removing a gem from only one list does not disable it.

| Dependency | Role |
|---|---|
| `jekyll` | Reads sources, renders templates and writes the static site |
| `jekyll-scholar` | Renders `/publications/` directly from `papers.bib` using `_layouts/bib.html` |
| `jekyll-seo-tag` | Supplies the `{% seo %}` tag in `default.html`: title, description, canonical URL and social metadata |
| `jekyll-sitemap` | Generates `sitemap.xml` and `robots.txt` |
| `_plugins/derive_student_fields.rb` | Validates student/alumni advisor slugs; derives student `advisor`, `lab`, `institutions` and `publication_key` |
| `_plugins/derive_titles.rb` | Overwrites profile titles with faculty name and optional degree, or student name; front-matter `title` cannot override it |

Because of the custom plugins and jekyll-scholar, the site cannot use GitHub's
built-in Pages builder (it runs in safe mode). Do not build with `--safe`.

### Styles

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
  `_includes/theme-dark-tokens.css`, emitted for both the system preference
  and the explicit toggle. Faculty status colours use the parallel
  `theme-dark-tokens-faculty.css`. Add dark values to these includes, not per
  selector. `--photo-filter` intentionally dims photos and every headshot in
  dark mode; its named selectors exclude logos and brand marks.
- One self-hosted font, Space Grotesk (`assets/fonts/`). It has no italic and no
  Greek glyphs.
- The navigation's collapse breakpoint (1365px) is measured against the width of
  the menu. Changing the nav font size, padding or number of items means
  re-measuring it (see the notes in `tpcb.css`). Keep `nav.js`'s desktop query
  at 1366px in step with CSS's collapse at 1365px.

### Scripts

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

Motion respects `prefers-reduced-motion`. Page-specific scripts are loaded
by their pages or layouts. Keep `links.js` after scripts that add links: it
annotates the DOM once.

**Theme/no-flash contract:** the inline head script in `default.html` sets
`data-theme` before first paint. It and `theme.js` must agree on `tpcb-theme`
and on the resolution order: a stored `light`/`dark` choice, otherwise the OS
preference. Storage failures are non-fatal. `theme.js` owns subsequent changes
and emits `tpcb:themechange` after setting the attribute so `hero-atoms.js`
can re-read computed colour tokens. With JavaScript off, CSS supplies the OS
theme; an explicit light choice must override the dark media query.

The head also arms `.js-reveal` and a four-second fallback. `reveal.js` signals
`tpcb:revealready` only after installing its section observer and scroll
fallback. Keep their reduced-motion/observer guards aligned; a late script
must never re-hide content that the timeout released.

## Editing content

Use a neighbouring record and the schemas below as templates; field order is
a convention, not a parser requirement. Leave missing scalar values **bare**,
never `""` (use lists for list fields):

```yaml
fellowship:        # correct: empty (Liquid treats it as false)
fellowship: ""     # wrong: Liquid treats "" as true and renders an empty badge
```

The content is about real, named people. Do not add or change a fact about a
person (position, email, degree, advisor, honour, photo caption) without a
verifiable source, and leave a value out rather than guess.

### Pages, homepage and navigation

Ordinary pages live in `_pages/`, each with `title`, `permalink` and usually
`layout: page` and a `description`. `_pages/home.md` and `_pages/students.md`
are routing stubs: their visible content lives in `_layouts/home.html` and
`_layouts/students-directory.html`. Faculty, alumni and news directory markup
lives in `_pages/`; their CSS classes and `data-*` attributes are contracts
with the corresponding scripts, not just styling hooks.

The main menu is `_data/navigation.yml`; footer columns are in
`_layouts/default.html`. Program-wide settings are in `_data/program.yml`
(admissions dates, portal URL, contact details, social accounts and selected
figures). Homepage collection counts are computed, but program figures and
some prose counts are authored. Updating a roster does not update every
number in page prose; review those separately against confirmed information.

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
the matching `strengths` blocks into `_data/institutions.yml`. Renaming a
faculty file requires updating student/alumni `advisor_slugs` and rebuilding
the publication index.

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

`_plugins/derive_student_fields.rb` joins advisor names with ` & `, derives
lab labels from the final word of each advisor's name, and collects unique
institution codes in advisor order. Layouts read `institutions` (plural, a
list); `institution` (singular) is the authored fallback for rotating students.
Explicit `advisor`, `lab` and `institutions` values take precedence via Ruby
`||=`; even empty strings/lists suppress derivation, so omit unintended
values. Use explicit overrides only for confirmed advisors without a faculty
page, with empty `advisor_slugs`. No advisor yields `TBD` / `Rotating` unless
explicitly overridden. A slug that matches no faculty file stops the build
with a clear error. After adding or removing a student, or changing their name
or `advisor_slugs`, run `python3 tools/build_pub_index.py`: the publication
index depends on both names and advisor relationships.

### Alumni (`_data/alumni.yml`)

One record per graduate; the fields are described at the top of the file.
`institutions` is a list; `advisor_slugs`, when supplied, is a list in the
same order as the `advisor` names separated by ` & `. An `advisor_slugs` entry
that matches no faculty file stops the build; use `""` for a sponsor who has
no faculty page, or omit the list when none has a page. Alumni fields are
authored, not derived by the student plugin.

After adding or removing an alumnus, or changing their name or `advisor_slugs`,
run `python3 tools/build_pub_index.py` to refresh faculty publication lists.

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
`_includes/css/tpcb.css` and `_includes/theme-dark-tokens.css`, plus a
`.tag-<name>` rule in `tpcb.css` that uses those tokens.

### Publications

`_bibliography/papers.bib` holds every paper, each with a `tpcb_author` field
naming the TPCB student(s) it is credited to (`Last, First`, `;`-separated).
After editing it, regenerate the index the profile pages use:

```sh
python3 tools/build_pub_index.py          # writes _data/publications.yml
python3 tools/build_pub_index.py --check  # exits 1 if the index is stale
```

The generated file has three maps: `entries` (BibTeX key → citation fields),
`by_person` (normalised name → ordered keys), and `by_faculty` (faculty slug →
ordered keys). Profile lists sort by year descending, then title; the full
bibliography uses jekyll-scholar's year/month ordering. Do not edit the index
by hand: rebuilding Jekyll alone will not refresh it.

**Name matching is exact after normalisation, not fuzzy.** `flip()` reverses
`Last, First` credits; `norm()` applies Unicode NFKD, removes marks, casefolds,
drops dots, changes hyphens to spaces and collapses whitespace. The Ruby
student hook must produce the same `publication_key`; change both together.
Other punctuation and differences in given names remain significant. Credits
without a matching roster name still enter `by_person`, but cannot contribute
to a faculty list. The tool does not flag those unmatched credits.

The roster reader uses Ruby's `YAML.safe_load` (dates/times allowed; no aliases
or arbitrary object tags), accepting single/double quotes and block/inline
lists. It stops before writing on duplicate YAML keys, missing/empty names,
non-string advisor slugs or a non-list `advisor_slugs`, and duplicate
normalised roster names. If two people collide, ask the program how to
distinguish their credits; do not rename either person to satisfy the tool.

A faculty member's list is reached through their students, so it is labelled
"Publications with TPCB students". Do not match faculty names against the
`author` field: initials collide across different people.

### Images

| Kind | Where | Notes |
|---|---|---|
| Headshots | `assets/img/…`, path in each person's `profile.image` | Every profile currently uses `logos/headshot-placeholder.png`, with `alt=""` because the page heading names the person. Templates currently emit empty alt text rather than reading `profile.alt`. Faculty pages crop to 4:5, the directories and student pages to a square. |
| Homepage photos | `assets/img/photos/` | Buildings or large groups only. Institution photos are set in `_data/institutions.yml`; the two community photos in `_layouts/home.html`. |
| News photos | `assets/img/news/` | Referenced from the news Markdown. |
| Institution logos | `assets/img/logos/*-logo-full.png` and `*-white.png` | Colour and white-ink versions; CSS shows one per theme. |
| TPCB wordmark | `assets/img/logos/tpcb-logo.png` (light theme) and `tpcb-logo-light.png` (light ink, for the dark theme) | Referenced in `_layouts/default.html` with their pixel sizes. |
| Social card | `assets/img/social-card.png` | 1200×630, used for link previews (`defaults:` in `_config.yml`). |

When adding a photograph:

- Compress it (the homepage photos are 1100–1600px wide) and keep the
  original out of the repository.
- Strip location and camera serial numbers before publishing:
  `exiftool -P -overwrite_original '-gps:all=' '-xmp:GPS*=' '-*SerialNumber*=' '-*Serial=' photo.jpg`.
  Avoid `exiftool -all=`, which also drops the colour profile and shifts colours.
- Alt text describes only what is visible. Do not caption a photo with a name,
  cohort, year or event the image itself does not show.

## Tools and tests

`tools/` is excluded from the build. Run the commands below from the repository
root, with the pinned Ruby on `PATH`, Python 3 and Node.js 18+ available.

| Script | Use |
|---|---|
| `build_pub_index.py` | Regenerate `_data/publications.yml` (`--check` to verify). Needs `ruby` on `PATH` to read the YAML roster |
| `dedupe_bib.py` | Merge duplicate entries in `papers.bib` (dry run unless `--apply`), keeping every student credit; then rerun `build_pub_index.py`. It refuses a merge if only later duplicates carry `tpcb_author` |
| `derive_institution_strengths.rb` | Recompute the per-institution `strengths` from the faculty roster |
| `extract_old_site.py` | Turn a local crawl of the old site (`.crawl/`, not in the repository) into text, for comparing content. The old site keeps retired content inside HTML comments; the script strips them so it is not mistaken for live copy. |

Earlier one-off migration scripts remain in Git history.

The bibliography maintenance tools share `tools/bib_entries.py`. They accept
the repository's multiline entries with one braced field per line and a
separate closing brace. A final newline is optional. Unsupported BibTeX
syntax stops the tool before it writes; preserve the existing format when
editing entries. This restriction applies to the maintenance tools, not to
the full BibTeX syntax supported by jekyll-scholar. Both tools write through
`tools/safe_write.py`, so an interrupted run leaves the previous file intact.

After `bundle install`, these checks need no additional Python or Node packages:

```sh
export PATH="/opt/homebrew/opt/ruby/bin:$PATH"  # Homebrew Ruby on Apple Silicon
python3 tools/build_pub_index.py --check
bundle exec jekyll build
python3 -m unittest discover -s tools/tests -p 'test_*.py'
bundle exec ruby tools/tests/test_template_contracts.rb
node --test tools/tests/*.test.cjs
```

The build must print no `Warning:`, `Conflict:` or `Error:` lines. The Python
tests exercise bibliography parsing, roster validation, credit preservation
and atomic writes; those reading the roster also need `ruby`. The Ruby test
runs the real plugins and Liquid templates on synthetic records, without
building the site.

The JavaScript tests need Node.js 18 or newer only for testing; the site still
has no Node build step. These are code-level fixtures, not browser or
accessibility conformance tests. CI currently runs only the Jekyll build and
its log check, not the index check or any of these test suites; a green
deployment is not a substitute for them.

To check dependencies periodically:

```sh
bundle outdated --only-explicit
gem install bundler-audit && bundle-audit check --update
```

A clean advisory scan is not proof that dependencies are safe; also review
the GitHub advisory pages for jekyll-seo-tag and jekyll-scholar when updating.

## Deploy and publishing boundary

`.github/workflows/deploy.yml` builds and deploys on every push to `main`
(and on manual "Run workflow"). Pull requests targeting `main` build only.
Dependabot (`.github/dependabot.yml`) opens a monthly pull request when an
action in the workflow has a new version.
In the repository settings, **Pages → Source must be "GitHub Actions"**.

Non-PR builds take `url` and `baseurl` from Pages settings; pull requests and
local builds use `_config.yml`. A failed build leaves the last deployment live.

### URLs and the custom domain

Use Jekyll's `relative_url` for internal page/asset paths and `absolute_url`
for absolute URLs. `{% link %}` resolves a source file and fails if it is
missing; it also accounts for the base path. SEO and sitemap plugins generate
the canonical, social-card and sitemap URLs.
URL generation uses two settings:

- `url`: the scheme and host, e.g. `https://adavasam.github.io`
- `baseurl`: the path the site lives under, e.g. `/tpcb-website`, or `""` at
  the root of a domain

Never hard-code `/tpcb-website/` in a link or a stylesheet.

#### Moving to a custom domain

1. Decide the domain, and who controls its DNS.
2. In `_config.yml`, set `url` to the new origin (e.g. `https://chembio.example.org`)
   and `baseurl: ""` for local and pull-request builds.
3. Build locally with those values and check for any `/tpcb-website` in `_site/`
   and that canonical URLs use the new host.
4. Point DNS at GitHub Pages (a `CNAME` record for a subdomain), then add the
   domain under Settings → Pages → Custom domain, wait for the certificate,
   and enable "Enforce HTTPS".
5. Re-run "Build and deploy to GitHub Pages" from Actions. It picks up the
   domain from Pages settings. Check the canonical URL, sitemap and stylesheet
   link after deployment.

If the new site replaces chembio.triiprograms.org, the old site's URLs do not
match these ones; plan redirects separately. The generated site has no
`noindex` directive; decide whether the prototype should be indexed before launch.

### Publishing boundary

Jekyll copies any file it does not recognise into the site. Working files kept
at the repository root (spreadsheets, notes, crawls) must be listed in both
`.gitignore` and `exclude:` in `_config.yml`. `assets/fonts/OFL.txt` is
explicitly included because the font licence must ship with the font.
These are separate boundaries: `.gitignore` prevents new untracked files from
being added accidentally; it does not untrack files already in Git.
`exclude:` keeps files out of `_site/`, not out of Git. Git ignore rules alone
do not protect a local build, and excluding a symlink's target does not
exclude the symlink's name. `AGENTS.md`, the program checklist and `.archive/`
are explicitly covered alongside the other local materials.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `bundle install` fails, or Jekyll errors on an old Ruby | You are on macOS's system Ruby; use the version in `.ruby-version`. |
| The site has no styling locally | Open `http://localhost:4000/tpcb-website/`, not the root. |
| `Conflict: … destination is shared by multiple files` | Two news items have the same year and file name; rename one. |
| `advisor_slugs […] match no file in _faculty/` | A student/alumni advisor slug is misspelt or the faculty file was renamed. |
| `Liquid error: undefined filter` | A typo in a filter name; the build fails on purpose. |
| A student shows "TBD" for their sponsor | `advisor_slugs` is empty (expected for rotating first-years). |
| A profile publication list is wrong | Regenerate the index; check normalised `tpcb_author` names and roster `advisor_slugs` if it is still wrong. |
| An old asset still appears locally after deletion | Delete `_site/` and rebuild. |

## Licensing

`LICENSE` reserves all rights in the source code; it is not open source, so
reuse needs the copyright holder's permission. The site's content belongs to
the program and its institutions. Fonts, icons, brand marks, logos and
photographs are third-party material under their own terms; see `NOTICE`.
