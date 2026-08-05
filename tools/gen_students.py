import json, re, os, csv, glob, unicodedata

REPO = '/Users/aakash/tpcb-website/'
INST = {'Weill Cornell': 'WCM', 'Rockefeller': 'Rockefeller',
        'Sloan Kettering': 'MSK', 'Cornell Ithaca': 'CU-I'}
INST_FULL = {'WCM': 'Weill Cornell Medicine', 'Rockefeller': 'The Rockefeller University',
             'MSK': 'Memorial Sloan Kettering Cancer Center', 'CU-I': 'Cornell University (Ithaca)'}
ORD = {'1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, '6th': 6, '7th': 7, '8th': 8, '9th': 9}

fac_slugs = {os.path.basename(p)[:-3] for p in glob.glob(REPO + '_faculty/*.md')}


def ascii_fold(s):
    s = s.replace('’', "'").replace('‘', "'")
    return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()


def slugify(s):
    s = ascii_fold(s).lower().replace("'", '').replace('.', '')
    s = re.sub(r'\([^)]*\)', ' ', s)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def flip_name(raw):
    """'Allworth, Abigail' -> ('Abigail Allworth', slug)."""
    if ',' not in raw:
        return raw.strip(), slugify(raw)
    last, first = [p.strip() for p in raw.split(',', 1)]
    display = '%s %s' % (first, last)
    # slug uses the bare first name (parentheticals dropped) + full surname
    bare_first = re.sub(r'\([^)]*\)', '', first).strip()
    return display, slugify('%s %s' % (bare_first, last))


def split_sponsors(s):
    return [x.strip() for x in re.split(r'\||&', s) if x.strip()]


def yamlq(s):
    return '"%s"' % str(s).replace('\\', '\\\\').replace('"', '\\"')


def build():
    recs = json.load(open('/Users/aakash/.claude/jobs/5a9b810d/tmp/students.json'))
    out = []
    problems = []
    for r in recs:
        name, slug = flip_name(r['raw_name'])
        year = ORD[r['caption'].split()[0]]
        sponsors = split_sponsors(r['sponsor'])
        insts_raw = split_sponsors(r['institution'])
        insts = []
        for i in insts_raw:
            if i not in INST:
                problems.append('unknown institution %r for %s' % (i, name))
            insts.append(INST.get(i, i))
        if sponsors == ['TBD']:
            advisors, slugs, lab = [], [], 'Rotating'
        else:
            advisors = sponsors
            slugs = [slugify(s) for s in sponsors]
            for s, sl in zip(sponsors, slugs):
                if sl not in fac_slugs:
                    problems.append('UNRESOLVED advisor %r (%s) for %s' % (s, sl, name))
            lastnames = [s.split()[-1] for s in sponsors]
            lab = ' & '.join(lastnames) + (' Labs' if len(lastnames) > 1 else ' Lab')
        # co-advised students may list fewer institutions than sponsors
        if advisors and len(insts) not in (1, len(advisors)):
            problems.append('institution/sponsor arity mismatch for %s: %r vs %r'
                            % (name, r['institution'], r['sponsor']))
        out.append({
            'name': name, 'slug': slug, 'email': r['email'],
            'cohort': int(r['entry']), 'year': year,
            'institution': insts[0], 'institutions': insts,
            'advisor': ' & '.join(advisors) if advisors else 'TBD',
            'advisors': advisors, 'advisor_slug': slugs[0] if slugs else '',
            'advisor_slugs': slugs, 'lab': lab,
            'undergrad': r['undergrad'], 'fellowship': r['note'],
        })
    # slug collisions
    seen = {}
    for s in out:
        seen.setdefault(s['slug'], []).append(s['name'])
    for k, v in seen.items():
        if len(v) > 1:
            problems.append('SLUG COLLISION %s -> %r' % (k, v))
    return out, problems


def write_md(s):
    fm = ['---', 'layout: profile',
          'name: %s' % yamlq(s['name']),
          'email: %s' % yamlq(s['email']),
          'cohort: %d' % s['cohort'],
          'year: %d' % s['year'],
          'institution: %s' % yamlq(s['institution'])]
    fm.append('institutions:')
    for i in s['institutions']:
        fm.append('  - %s' % yamlq(i))
    fm.append('institution_full: %s' % yamlq(INST_FULL[s['institution']]))
    fm.append('advisor: %s' % yamlq(s['advisor']))
    fm.append('advisor_slug: %s' % (yamlq(s['advisor_slug']) if s['advisor_slug'] else '""'))
    if s['advisor_slugs']:
        fm.append('advisor_slugs:')
        for a in s['advisor_slugs']:
            fm.append('  - %s' % yamlq(a))
    fm.append('lab: %s' % yamlq(s['lab']))
    fm.append('undergrad: %s' % yamlq(s['undergrad']))
    if s['fellowship']:
        fm.append('fellowship: %s' % yamlq(s['fellowship']))
    fm += ['profile:', '  image: logos/headshot-placeholder.png',
           '  alt: %s' % yamlq('Photo of ' + s['name']), '---', '']

    # Body: strictly factual, derived from the source table only. No pronouns
    # (gender is not in the source) and no invented research description.
    if s['lab'] == 'Rotating':
        body = ('%s entered TPCB in %d and is currently completing laboratory '
                'rotations across the three participating institutions. '
                'Undergraduate degree: %s.' % (s['name'], s['cohort'], s['undergrad']))
    else:
        insts = (s['institutions'] * len(s['advisors']))[:len(s['advisors'])]
        if len(set(insts)) == 1:
            # both sponsors at one institution: name it once, not per sponsor
            labs = '%s at %s' % (' and '.join(s['advisors']), INST_FULL[insts[0]])
        else:
            labs = ' and '.join('%s (%s)' % (a, INST_FULL[i])
                                for a, i in zip(s['advisors'], insts))
        word = 'laboratories' if len(s['advisors']) > 1 else 'laboratory'
        body = ('%s entered TPCB in %d and carries out thesis research in the '
                '%s of %s. Undergraduate degree: %s.'
                % (s['name'], s['cohort'], word, labs, s['undergrad']))
    if s['fellowship']:
        body += '\n\nFellowship: %s.' % s['fellowship']
    return '\n'.join(fm) + body + '\n'


if __name__ == '__main__':
    students, problems = build()
    print('students:', len(students))
    for p in problems:
        print('  PROBLEM:', p)

    d = REPO + '_students/'
    for f in glob.glob(d + '*.md'):
        os.remove(f)
    for s in students:
        open(d + s['slug'] + '.md', 'w', encoding='utf-8').write(write_md(s))

    with open(REPO + 'tpcb_students.csv', 'w', newline='', encoding='utf-8') as fh:
        w = csv.writer(fh)
        w.writerow(['name', 'slug', 'email', 'cohort_year', 'year_in_program',
                    'institution', 'advisor', 'advisor_slug', 'undergrad'])
        for s in sorted(students, key=lambda x: (-x['cohort'], x['name'].split()[-1])):
            w.writerow([s['name'], s['slug'], s['email'], s['cohort'], s['year'],
                        '; '.join(s['institutions']), s['advisor'],
                        '; '.join(s['advisor_slugs']), s['undergrad']])
    print('wrote', len(students), 'md files + tpcb_students.csv')
