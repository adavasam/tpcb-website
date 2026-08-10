import json, re, sys
sys.path.insert(0, '/Users/aakash/.claude/jobs/5a9b810d/tmp')
from gen_students import flip_name, slugify, INST, fac_slugs

REPO = '/Users/aakash/tpcb-website/'


def yamlq(s):
    return '"%s"' % str(s).replace('\\', '\\\\').replace('"', '\\"')


def split_sponsors(s):
    return [x.strip() for x in re.split(r'\||&', s) if x.strip()]


HEADER = """# TPCB alumni directory — 129 records migrated from the program's public
# alumni table (see .crawl/alumni.html).
#
# `year_start` / `year_end`: the source records a range (e.g. 2019-2025), not a
# single graduation year, so the former single `year` key was split in two.
#
# There is deliberately NO `thesis` key: the source carries no thesis titles,
# and 129 empty fields is worse than no field at all.
#
# `institution` is the primary thesis institution as a short code from
# _data/institutions.yml; `institutions` lists every institution named for that
# student. `CU-I` (Cornell University, Ithaca) is a HISTORICAL affiliation — no
# longer part of TPCB — and must only ever render with the muted outlined badge
# (.institution-cu-i in tpcb.css), never as a current institution.
#
# `advisor` is the thesis research sponsor verbatim from the source; many are
# former or non-TPCB faculty and so have no page in _faculty/. `advisor_slug`
# is populated ONLY where it resolves to a real file in _faculty/, so the
# alumni table never emits a dead link.
"""


def main():
    recs = json.load(open('/Users/aakash/.claude/jobs/5a9b810d/tmp/alumni.json'))
    problems = []
    out = []
    for r in recs:
        name, slug = flip_name(r['raw_name'])
        m = re.fullmatch(r'(\d{4})\s*[-–]\s*(\d{4})', r['years'].strip())
        if not m:
            problems.append('unparseable year range %r for %s' % (r['years'], name))
            ys = ye = None
        else:
            ys, ye = int(m.group(1)), int(m.group(2))
        insts_raw = [i.strip() for i in re.split(r',|\|', r['thesis_inst']) if i.strip()]
        insts = []
        for i in insts_raw:
            if i not in INST:
                problems.append('unknown institution %r for %s' % (i, name))
            insts.append(INST.get(i, i))
        sponsors = split_sponsors(r['sponsor'])
        slugs = [slugify(s) for s in sponsors]
        resolved = [s for s in slugs if s in fac_slugs]
        lastnames = [s.split()[-1] for s in sponsors]
        lab = ' & '.join(lastnames) + (' Labs' if len(lastnames) > 1 else ' Lab')
        out.append({
            'name': name, 'slug': slug, 'year_start': ys, 'year_end': ye,
            'institution': insts[0] if insts else '', 'institutions': insts,
            'advisor': ' & '.join(sponsors), 'lab': lab,
            # A LIST for everyone, even a single advisor. Positionally aligned
            # with the names in `advisor`; "" where that sponsor has no
            # _faculty/ page (former or non-TPCB faculty). The old singular
            # `advisor_slug` for sole-advised alumni plus a plural only for the
            # co-mentored ones is exactly the split that let build_pub_index.py
            # regex-match one and miss the other.
            'advisor_slugs': [s if s in fac_slugs else '' for s in slugs],
            'current_position': r['current_position'],
        })

    lines = [HEADER]
    for a in sorted(out, key=lambda x: (-(x['year_end'] or 0), x['name'].split()[-1])):
        lines.append('- name: %s' % yamlq(a['name']))
        lines.append('  year_start: %s' % (a['year_start'] if a['year_start'] else 'null'))
        lines.append('  year_end: %s' % (a['year_end'] if a['year_end'] else 'null'))
        lines.append('  institution: %s' % yamlq(a['institution']))
        if len(a['institutions']) > 1:
            lines.append('  institutions:')
            for i in a['institutions']:
                lines.append('    - %s' % yamlq(i))
        lines.append('  advisor: %s' % yamlq(a['advisor']))
        if any(a['advisor_slugs']):
            lines.append('  advisor_slugs:')
            for s in a['advisor_slugs']:
                lines.append('    - %s' % yamlq(s))
        lines.append('  lab: %s' % yamlq(a['lab']))
        lines.append('  current_position: %s' % yamlq(a['current_position']))
        lines.append('')
    open(REPO + '_data/alumni.yml', 'w', encoding='utf-8').write('\n'.join(lines))
    print('alumni written:', len(out))
    print('with >=1 resolvable advisor slug:', sum(1 for a in out if any(a['advisor_slugs'])))
    print('CU-I records:', [a['name'] for a in out if 'CU-I' in a['institutions']])
    for p in problems:
        print('  PROBLEM:', p)


if __name__ == '__main__':
    main()
