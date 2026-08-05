"""Rewrite old-site links in migrated content to their new internal equivalents.

The migrated news bodies cross-reference chembio.triiprograms.org — 116 links,
101 of them to faculty profile pages. Those all 404 the moment the domain is
merged onto this site, so they are rewritten to internal Jekyll routes and put
through `relative_url` like every other internal link.

Faculty mapping is exact, not guessed: each _faculty/*.md records the old-site
URL it was built from in `tpcb_profile_url`, so old URL -> new slug is a lookup.
"""
import re, glob, os, sys, collections

ROOT = '/Users/aakash/tpcb-website'

# Hand-checked equivalents for the non-faculty pages.
STATIC = {
    '/about-tpcb/summer-internship/': '/summer-program/',
    '/about-tpcb/science-outreach/': '/outreach/',
    '/students-alumni/alumni/': '/alumni/',
    '/students-alumni/current-students/': '/students/',
    # The old news page was one long scroll with per-item anchors encoding
    # year, month and a name. Each resolves to exactly one item in our archive.
    '/publications-news/news/#201609chen':
        '/news/2016-09-01-tpcb-student-zhen-chen-identify-chemical-probes-of-eukaryotic/',
    '/publications-news/news/#201903chui':
        '/news/2019-03-01-ashley-chui-and-sahana-rao-elucidate-mechanism-that-cells/',
    '/publications-news/news/#201904litke':
        '/news/2019-04-01-tpcb-student-jake-litke-creates-perfect-storm-for-rna/',
}

# Faculty who have left TPCB: no profile exists here and none will, so the
# "Read more at: [TPCB Faculty](...)" tail is dropped rather than left to 404.
DEAD_FACULTY = ('steven-gross', 'lewis-cantley', 'neal-rosen')
DEAD_RE = re.compile(
    r'\s*Read more at:\s*\[[^\]]*\]\(https?://chembio\.triiprograms\.org'
    r'/faculty-research/faculty-directory/(?:' + '|'.join(DEAD_FACULTY) + r')[^)]*\)'
)


def faculty_map():
    """old tpcb_profile_url path -> new /faculty/<slug>/ route."""
    m = {}
    for path in glob.glob(f'{ROOT}/_faculty/*.md'):
        slug = os.path.basename(path)[:-3]
        src = open(path, encoding='utf-8').read()
        hit = re.search(r'^tpcb_profile_url:\s*"?(\S+?)"?\s*$', src, re.M)
        if not hit:
            continue
        old = re.sub(r'^https?://chembio\.triiprograms\.org', '', hit.group(1))
        m[old.rstrip('/') + '/'] = f'/faculty/{slug}/'
    return m


def main(apply=False):
    fac = faculty_map()
    print(f'faculty URL map entries: {len(fac)}')

    link_re = re.compile(r'https?://chembio\.triiprograms\.org(/[^)\s"\'<>]*)')
    rewritten = collections.Counter()
    unmapped = collections.Counter()
    files_changed = 0

    targets = glob.glob(f'{ROOT}/_news/*.md') + glob.glob(f'{ROOT}/_pages/*.md') \
        + glob.glob(f'{ROOT}/_students/*.md')

    dead_removed = 0

    for path in targets:
        src = open(path, encoding='utf-8').read()
        out, n = DEAD_RE.subn('', src)
        dead_removed += n

        def repl(mo):
            p = mo.group(1)
            if p in STATIC:            # anchored URLs match whole, not stripped
                rewritten[STATIC[p]] += 1
                return "{{ '" + STATIC[p] + "' | relative_url }}"
            key = p.rstrip('/').split('#')[0] + '/'
            new = fac.get(key) or STATIC.get(key)
            if not new:
                unmapped[p] += 1
                return mo.group(0)
            rewritten[new] += 1
            # Liquid inside markdown is fine: collection files are processed.
            return "{{ '" + new + "' | relative_url }}"

        out = link_re.sub(repl, out)
        if out != src:
            files_changed += 1
            if apply:
                open(path, 'w', encoding='utf-8').write(out)

    print(f'files changed : {files_changed}')
    print(f'dead-faculty links removed: {dead_removed}')
    print(f'links rewritten: {sum(rewritten.values())} to {len(rewritten)} targets')
    if unmapped:
        print(f'\nUNMAPPED ({sum(unmapped.values())} links) — left pointing at the old site:')
        for p, n in unmapped.most_common():
            print(f'   {n:3d}  {p}')
    print('\nWROTE' if apply else '\nDRY RUN')


if __name__ == '__main__':
    main(apply='--apply' in sys.argv)
