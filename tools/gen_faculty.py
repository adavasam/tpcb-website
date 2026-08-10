#!/usr/bin/env python3
"""Generate _faculty/*.md from a join of tpcb_faculty.csv + tpcb_faculty_cleaned.csv."""
import csv, os, re, sys, unicodedata

ROOT = '/Users/aakash/tpcb-website'
OUT = os.path.join(ROOT, '_faculty')

APPROACHES = ["Structural Biology", "Biophysics", "Chemical Cell Biology",
              "Chemical Proteomics", "Drug Discovery", "Computational Methods",
              "Chemical Synthesis"]
FOCUSES = ["Cancer Biology", "Cell Signaling", "Membrane Proteins",
           "Infectious Disease", "Gene Expression & RNA",
           "Epigenetics & Chromatin", "Neuroscience"]
INSTITUTIONS = {"Rockefeller", "MSK", "WCM"}

PLACEHOLDERS = ["brady-scott.md", "chodera-john.md", "david-yael.md",
                "lyu-jian.md", "tan-derek.md"]


def load(path):
    with open(os.path.join(ROOT, path), newline='', encoding='utf-8') as fh:
        return list(csv.DictReader(fh))


def clean(v):
    return (v or '').strip()


def slugify(name):
    s = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode()
    s = re.sub(r"[^\w\s-]", '', s).strip().lower()
    return re.sub(r'[\s_]+', '-', s)


def yq(v):
    """Emit a safely double-quoted YAML scalar."""
    s = str(v).replace('\\', '\\\\').replace('"', '\\"')
    s = s.replace('\r', ' ').replace('\n', ' ')
    return '"%s"' % s


def pipes(v):
    return [x.strip() for x in clean(v).split('|') if x.strip()]


def main():
    raw = load('tpcb_faculty.csv')
    cleaned = load('tpcb_faculty_cleaned.csv')
    by_name = {clean(r['name']): r for r in cleaned}

    problems = []
    unjoined = []
    slugs = {}
    written = 0

    for r in raw:
        name = clean(r['name'])
        c = by_name.get(name)
        if c is None:
            unjoined.append(name)
            continue

        # --- field resolution -------------------------------------------------
        # cleaned CSV wins on every shared column (it is the corrected file);
        # raw CSV is the sole source of lab_name / accepting_students / edu_phd.
        def sh(col):
            return clean(c.get(col)) or clean(r.get(col))

        degree = sh('degree')
        position = sh('title')
        institution = sh('institution')
        email = sh('email')
        edu_doc = clean(c.get('edu_doc'))
        edu_ms = clean(c.get('edu_ms'))
        edu_undergrad = sh('edu_undergrad')
        edu_phd = clean(r.get('edu_phd'))
        lab_name = clean(r.get('lab_name'))
        accepting = clean(r.get('accepting_students')).lower() == 'yes'
        desc_short = sh('description_short')
        desc_full = clean(c.get('description_full')) or clean(r.get('description_full'))
        approach = pipes(c.get('research_approach')) or pipes(r.get('research_approach'))
        focus = pipes(c.get('research_focus')) or pipes(r.get('research_focus'))
        honors = [h.strip() for h in clean(c.get('notable_honors')).split(';') if h.strip()]
        lab_website = sh('lab_website')
        personal = sh('personal_lab_website')
        tpcb_url = sh('tpcb_profile_url')

        # --- validation -------------------------------------------------------
        if institution not in INSTITUTIONS:
            problems.append('%s: unknown institution %r' % (name, institution))
        for a in approach:
            if a not in APPROACHES:
                problems.append('%s: approach outside vocabulary: %r' % (name, a))
        for f in focus:
            if f not in FOCUSES:
                problems.append('%s: focus outside vocabulary: %r' % (name, f))
        if not desc_full:
            problems.append('%s: EMPTY description_full' % name)
        elif len(desc_full) < 200:
            problems.append('%s: short description_full (%d chars)' % (name, len(desc_full)))
        if not approach:
            problems.append('%s: no research_approach' % name)
        if not focus:
            problems.append('%s: no research_focus' % name)

        slug = slugify(name)
        if slug in slugs:
            problems.append('slug collision %s: %s / %s' % (slug, slugs[slug], name))
        slugs[slug] = name

        parts = name.split()
        last = parts[-1]
        sort_key = ('%s %s' % (last, ' '.join(parts[:-1]))).lower()

        # --- front matter -----------------------------------------------------
        # NO `layout:` — _config.yml's `defaults:` sets it for the whole
        # collection. NO `title:` — _plugins/derive_titles.rb builds it from
        # name + degree at read time, because storing it meant 67 copies of a
        # string the build can compute.
        fm = []
        fm.append('---')
        fm.append('name: %s' % yq(name))
        fm.append('degree: %s' % yq(degree))
        fm.append('position: %s' % yq(position))
        fm.append('institution: %s' % yq(institution))
        if lab_name:
            fm.append('lab_name: %s' % yq(lab_name))
        if email:
            fm.append('email: %s' % yq(email))
        fm.append('accepting_students: %s' % ('true' if accepting else 'false'))
        fm.append('sort_key: %s' % yq(sort_key))
        # One description key, not two. `description` and `description_short`
        # held the same string in all 67 files; `description` is the name
        # jekyll-seo-tag reads, so it is the one that survived.
        fm.append('description: %s' % yq(desc_short))

        # The edu_doc / edu_ms / edu_undergrad / edu_phd block that used to be
        # emitted here is GONE. It was the spreadsheets' flat education data,
        # kept "for provenance", and the layout only ever read it as a fallback
        # for profiles with no scraped `education:` block — of which there are
        # none. Four keys and a three-line comment in 67 files that no page
        # rendered. The authoritative version is the `education:` list that
        # add_education.py inserts from the live profiles; see CLAUDE.md on why
        # the spreadsheets are not trusted for this field.

        # ONE SCHEMA. Every faculty file carries the same sixteen keys in the
        # same order, present even when empty, so one file shows every field a
        # faculty member can have. An empty key is written BARE — never `""`,
        # because Liquid treats the empty string as TRUTHY and `{% if
        # page.personal_lab_website %}` would render an empty button.
        fm.append('research_approach:')
        for a in approach:
            fm.append('  - %s' % yq(a))
        fm.append('research_focus:')
        for f in focus:
            fm.append('  - %s' % yq(f))
        fm.append('notable_honors:')
        for h in honors:
            fm.append('  - %s' % yq(h))
        fm.append('lab_website: %s' % yq(lab_website) if lab_website else 'lab_website:')
        fm.append('personal_lab_website: %s' % yq(personal) if personal else 'personal_lab_website:')
        # NOT emitted: tpcb_profile_url. It was in all 67 files and read by
        # nothing — deliberately never linked, because chembio.triiprograms.org
        # is retired when the domain merges and the link would rot. `tpcb_url`
        # is still parsed above; it is the join key this script matches the
        # scraped profiles on, it just does not belong in the output.
        fm.append('profile:')
        fm.append('  image: logos/headshot-placeholder.png')
        fm.append('  alt: %s' % yq('Photo of %s' % name))
        fm.append('---')
        fm.append('')
        fm.append(desc_full)
        fm.append('')

        with open(os.path.join(OUT, slug + '.md'), 'w', encoding='utf-8') as fh:
            fh.write('\n'.join(fm))
        written += 1

    # --- delete placeholders --------------------------------------------------
    removed = []
    for p in PLACEHOLDERS:
        path = os.path.join(OUT, p)
        if os.path.exists(path):
            os.remove(path)
            removed.append(p)

    print('written:', written)
    print('removed placeholders:', removed)
    print('unjoined rows:', unjoined)
    print('problems (%d):' % len(problems))
    for p in problems:
        print('  -', p)


if __name__ == '__main__':
    main()
