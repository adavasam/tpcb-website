"""Merge duplicate publications in papers.bib.

The old site listed a paper once per TPCB student author, so 83 papers appear
2-5 times (119 extra rows out of 777). Rendered by year, that shows the same
citation repeated back to back. Merge them into one entry carrying every
student in `tpcb_author`, which keeps the by-student association the field
exists for while showing each paper once.

Grouping key is the DOI where present; 9 entries have none, so those fall back
to a normalized title+year.

The merged entry is the first of its group and carries the union of every
individual student label (`A; B` and `B; C` merge to `A; B; C`). A group whose
first entry has no `tpcb_author` while a later one does is refused rather than
merged: rewriting it would mean guessing where the field goes, and dropping it
would lose a student's credit.

Usage: python3 tools/dedupe_bib.py [--apply]   (a dry run unless --apply)
Then regenerate the index: python3 tools/build_pub_index.py
"""
import os, re, sys, unicodedata

from pathlib import Path

from bib_entries import BibFormatError, parse_entries
from safe_write import write_text_atomic

PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    '_bibliography', 'papers.bib')


class MergeError(ValueError):
    pass


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


def credits(entry):
    """The individual student labels in an entry's tpcb_author, in order."""
    return [s.strip() for s in (field(entry, 'tpcb_author') or '').split(';') if s.strip()]


def set_tpcb(entry, value):
    """Replace the tpcb_author value, preserving surrounding formatting."""
    return re.sub(r'(?m)^(\s*tpcb_author\s*=\s*\{).*?(\}\s*,?\s*)$',
                  lambda m: m.group(1) + value + m.group(2), entry, count=1, flags=re.S)


def main(apply=False):
    src = Path(PATH).read_text(encoding='utf-8')
    header, entries = parse_entries(src)

    groups = {}
    order = []
    for e in entries:
        k = group_key(e)
        if k not in groups:
            groups[k] = []
            order.append(k)
        groups[k].append(e)

    merged, dropped = [], 0
    unions = []   # (merged entry, the credits it must carry)
    multi = 0
    for k in order:
        grp = groups[k]
        keep = grp[0]
        if len(grp) > 1:
            authors = sorted({a for e in grp for a in credits(e)})
            if authors and field(keep, 'tpcb_author') is None:
                key = re.match(r'@\w+\{([^,]+)', keep).group(1)
                raise MergeError(
                    f'{key} has no tpcb_author but a duplicate of it does; add the field '
                    'to the first entry (or reorder the duplicates) and rerun. No output was written.'
                )
            if len(authors) > 1:
                multi += 1
            keep = set_tpcb(keep, '; '.join(authors))
            dropped += len(grp) - 1
            unions.append((keep, authors))
        merged.append(keep)

    # Each merged entry must carry exactly the union it was given.
    for e, authors in unions:
        if credits(e) != authors:
            raise MergeError(f'merged entry lost student credits: {e.splitlines()[0]} No output was written.')

    out = header + ''.join(merged)
    print(f'entries in  : {len(entries)}')
    print(f'entries out : {len(merged)}')
    print(f'rows dropped: {dropped}')
    print(f'entries now carrying multiple students: {multi}')
    keys = re.findall(r'^@\w+\{([^,]+)', out, re.M)
    print(f'unique keys : {len(set(keys))} of {len(keys)}')
    print(f'braces balanced: {out.count("{") == out.count("}")}')
    if apply:
        write_text_atomic(PATH, out)
        print('WROTE', PATH)
    else:
        print('DRY RUN')


if __name__ == '__main__':
    try:
        main(apply='--apply' in sys.argv)
    except (BibFormatError, MergeError) as error:
        sys.exit(str(error))
