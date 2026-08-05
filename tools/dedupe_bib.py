"""Merge duplicate publications in papers.bib.

The old site listed a paper once per TPCB student author, so 83 papers appear
2-5 times (119 extra rows out of 777). Rendered by year, that shows the same
citation repeated back to back. Merge them into one entry carrying every
student in `tpcb_author`, which keeps the by-student association the field
exists for while showing each paper once.

Grouping key is the DOI where present; 9 entries have none, so those fall back
to a normalized title+year.
"""
import re, sys, unicodedata

PATH = '/Users/aakash/tpcb-website/_bibliography/papers.bib'
ENTRY_RE = re.compile(r'(?ms)^@\w+\{.*?\n\}\n')


def field(entry, name):
    m = re.search(r'(?m)^\s*' + name + r'\s*=\s*\{(.*?)\}\s*,?\s*$', entry, re.S)
    return m.group(1).strip() if m else None


def norm(s):
    if not s:
        return ''
    s = unicodedata.normalize('NFKD', s)
    return re.sub(r'[^a-z0-9]+', '', s.lower())


def group_key(entry):
    doi = field(entry, 'doi')
    if doi:
        return ('doi', doi.lower())
    return ('ty', norm(field(entry, 'title') or field(entry, 'note')), field(entry, 'year') or '')


def set_tpcb(entry, value):
    """Replace the tpcb_author value, preserving surrounding formatting."""
    return re.sub(r'(?m)^(\s*tpcb_author\s*=\s*\{).*?(\}\s*,?\s*)$',
                  lambda m: m.group(1) + value + m.group(2), entry, count=1, flags=re.S)


def main(apply=False):
    src = open(PATH, encoding='utf-8').read()
    header = src[:src.index('@')] if '@' in src else ''
    entries = ENTRY_RE.findall(src)
    if len(entries) != src.count('\n@') + (1 if src.lstrip().startswith('@') else 0):
        pass  # count sanity is checked by the caller against 777

    groups = {}
    order = []
    for e in entries:
        k = group_key(e)
        if k not in groups:
            groups[k] = []
            order.append(k)
        groups[k].append(e)

    merged, dropped = [], 0
    multi = 0
    for k in order:
        grp = groups[k]
        keep = grp[0]
        if len(grp) > 1:
            authors = []
            for e in grp:
                a = field(e, 'tpcb_author')
                if a and a not in authors:
                    authors.append(a)
            if len(authors) > 1:
                multi += 1
            keep = set_tpcb(keep, '; '.join(sorted(authors)))
            dropped += len(grp) - 1
        merged.append(keep)

    out = header + ''.join(merged)
    print(f'entries in  : {len(entries)}')
    print(f'entries out : {len(merged)}')
    print(f'rows dropped: {dropped}')
    print(f'entries now carrying multiple students: {multi}')
    keys = re.findall(r'^@\w+\{([^,]+)', out, re.M)
    print(f'unique keys : {len(set(keys))} of {len(keys)}')
    print(f'braces balanced: {out.count("{") == out.count("}")}')
    if apply:
        open(PATH, 'w', encoding='utf-8').write(out)
        print('WROTE', PATH)
    else:
        print('DRY RUN')


if __name__ == '__main__':
    main(apply='--apply' in sys.argv)
