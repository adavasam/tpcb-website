"""Add a structured `education:` list to each _faculty/*.md from the cached
live TPCB profile pages.

The Education block is uniform enough to parse but not perfectly regular:
  standard :  "PhD, 2012, University of California, Berkeley"
  reversed :  "PhD, The Rockefeller University, 2001"        (morgan-huse)
  no year  :  "PhD, University of Texas Southwestern..."     (xuejun-jiang)
Institution names themselves contain commas, so we split on the known degree
vocabulary and pull an optional 4-digit year out of each chunk, rather than
splitting on commas or assuming field order.
"""
import re, html, glob, os, sys

# Dotted forms (D.Sc.) end in a period, so a trailing \b never matches — they
# get their own branch. Longer plain forms precede their prefixes (MSc before
# MS, BSc before BS) so alternation does not truncate them.
DOTTED = ['D.Sc.', 'M.Sc.', 'B.Sc.', 'M.S.', 'B.S.', 'B.A.', 'M.A.', 'Ph.D.', 'M.D.']
PLAIN = ['DPhil', 'DSc', 'PhD', 'MPhil', 'MSc', 'MBBS', 'MD', 'MS', 'MA',
         'SM', 'BSc', 'BS', 'BA', 'BE', 'AB', 'SB']
DEG_RE = re.compile(
    r'(?<!\w)(' + '|'.join(re.escape(d) for d in DOTTED) + r'|(?:'
    + '|'.join(re.escape(d) for d in PLAIN) + r')\b)')

# Some profiles run an "Awards" section between Education and Research Topics;
# without this the last institution absorbs the award text.
SECTION_END = re.compile(r'\b(Awards|Honors|Fellowships|Memberships)\b')
FAC = '/Users/aakash/tpcb-website/_faculty'
CRAWL = '/Users/aakash/tpcb-website/.crawl/faculty'


def text(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s)))


def education_segment(path):
    d = open(path, encoding='utf-8', errors='replace').read()
    t = text(re.sub(r'(?s)<(script|style)\b.*?</\1>', '', d))
    i, j = t.find('Education'), t.find('Research Topics')
    if not (0 < i < j):
        return None
    seg = t[i + len('Education'):j].strip()
    cut = SECTION_END.search(seg)
    return (seg[:cut.start()] if cut else seg).strip()


def parse(seg):
    """-> list of dicts with degree / year / institution."""
    hits = list(DEG_RE.finditer(seg))
    out = []
    for n, m in enumerate(hits):
        chunk = seg[m.end():hits[n + 1].start() if n + 1 < len(hits) else len(seg)]
        chunk = chunk.strip(' ,;.')
        # "(Hons)" and similar qualifiers ride along with the degree
        qual = ''
        q = re.match(r'^\(?(Hons)\)?[ ,]*', chunk)
        if q:
            qual = ' (Hons)'
            chunk = chunk[q.end():]
        year = None
        ym = re.search(r'\b(19|20)\d{2}\b', chunk)
        if ym:
            year = int(ym.group(0))
            chunk = (chunk[:ym.start()] + ' ' + chunk[ym.end():])
        inst = re.sub(r'\s{2,}', ' ', chunk).strip(' ,;.')
        if not inst:
            continue
        out.append({'degree': m.group(1) + qual, 'year': year, 'institution': inst})
    return out


def yaml_block(entries):
    lines = ['education:']
    for e in entries:
        lines.append(f'  - degree: "{e["degree"]}"')
        if e['year']:
            lines.append(f'    year: {e["year"]}')
        inst = e['institution'].replace('"', '\\"')
        lines.append(f'    institution: "{inst}"')
    return '\n'.join(lines)


def main(apply=False):
    changed = skipped = 0
    for md in sorted(glob.glob(f'{FAC}/*.md')):
        slug = os.path.basename(md)[:-3]
        crawl = f'{CRAWL}/{slug}.html'
        if not os.path.exists(crawl):
            print(f'  NO CRAWL FILE: {slug}')
            skipped += 1
            continue
        seg = education_segment(crawl)
        entries = parse(seg) if seg else []
        if not entries:
            print(f'  NO EDUCATION PARSED: {slug}')
            skipped += 1
            continue
        src = open(md, encoding='utf-8').read()
        if re.search(r'^education:', src, re.M):
            print(f'  ALREADY HAS education: {slug}')
            skipped += 1
            continue
        block = yaml_block(entries)
        # insert directly before the education comment block the generator left
        anchor = '# Education.'
        if anchor in src:
            src = src.replace(anchor, block + '\n' + anchor, 1)
        else:
            src = re.sub(r'\n---\n', '\n' + block + '\n---\n', src, count=1)
        if apply:
            open(md, 'w', encoding='utf-8').write(src)
        changed += 1
        if changed <= 3:
            print(f'--- {slug}\n{block}')
    print(f'\n{"WROTE" if apply else "DRY RUN"}: {changed} changed, {skipped} skipped')


if __name__ == '__main__':
    main(apply='--apply' in sys.argv)
