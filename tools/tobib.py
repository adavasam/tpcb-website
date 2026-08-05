"""Convert extracted TPCB citations (pubs.json) into BibTeX.

ACS-ish shape:  Authors. Title. Journal Year, Volume, Pages.
Authors are "Last, F. M." joined by "; ".
The two hard splits are authors|title and title|journal; journal
abbreviations contain periods, so a naive "last period" split mangles them.
"""
import json, re, sys, unicodedata, collections

SRC = '/Users/aakash/.claude/jobs/5a9b810d/tmp/pubs.json'

# ---------------------------------------------------------------- utilities
CONTRIB_MARKS = '†‡§¶*# '


def clean(s):
    s = s.replace(' ', ' ')
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def strip_marks(s):
    return clean(''.join(ch for ch in s if ch not in '†‡§¶'))


# ------------------------------------------------------------ author split
# One author token: "van den Brink, M. R." / "O'Leary, S." / "Wu, H."
# Equal-contribution daggers ride on the *name*: "Griffin, M. E.†; ..." — if
# they are not stripped the tail looks non-empty and the whole remaining author
# list is swallowed into the title.
MARKS = '†‡§¶'
INITIALS = r"(?:[A-ZÀ-Þ]\.(?:-[A-ZÀ-Þ]\.)*\s*)+"
AUTHOR_FULL = re.compile(r"^(?P<last>[^,;.]{1,60}?)\s*,\s*(?P<init>" + INITIALS + r"|[A-ZÀ-Þ])$")
AUTHOR_HEAD = re.compile(r"^(?P<last>[^,;.]{1,60}?)\s*,\s*(?P<init>" + INITIALS + r")(?P<rest>\S.*)$")
CORPORATE = re.compile(r"^[A-Z][A-Za-z0-9®&.\- ]{3,60}\s(?:Team|Consortium|Group|Network|Collaboration|Investigators)$")


def strip_author_marks(chunk):
    """Remove equal-contribution markers that trail a name."""
    chunk = ''.join(ch for ch in chunk if ch not in MARKS)
    chunk = re.sub(r'\*+', '', chunk)
    return clean(chunk)


def split_authors(text):
    """Return (authors, rest). authors is a list of (last, initials) tuples;
    a corporate author is ('', full_name). rest is title+journal+year+..."""
    # "A, B. … C, D." elides authors; treat the ellipsis as a separator.
    text = re.sub(r'\s*(?:…|\.\.\.)\s*', '; ', text)
    # "Zheng, Q. and Blanchard, S.C." — 'and' instead of ';'. Only rewrite in
    # the head region (before the first ';'), so titles containing 'and' are safe.
    cut = text.index(';') if ';' in text else len(text)
    head = re.sub(r'\s+and\s+(?=[A-ZÀ-Þ][^\s,]{1,30},\s*[A-ZÀ-Þ]\.)', '; ', text[:cut])
    text = head + text[cut:]
    chunks = text.split(';')
    authors = []
    for i, raw_chunk in enumerate(chunks):
        chunk = strip_author_marks(raw_chunk)
        if not chunk:
            continue
        m = AUTHOR_FULL.match(chunk)
        if m:                                   # a complete author, more follow
            authors.append((clean(m.group('last')), clean(m.group('init'))))
            continue
        if CORPORATE.match(chunk):              # "COVID Moonshot Consortium"
            authors.append(('', chunk))
            continue
        m = AUTHOR_HEAD.match(chunk)
        if m and not m.group('rest').startswith(('…', '...')):
            # final author; everything after the initials is the body
            authors.append((clean(m.group('last')), clean(m.group('init'))))
            rest = clean(';'.join([m.group('rest')] + chunks[i + 1:]))
            return authors, rest
        # Not author-shaped: body starts here (keep the raw chunk, marks and all)
        return (authors or None), clean(';'.join(chunks[i:]))
    return (authors or None), ''


# --------------------------------------------------------- journal plausibility
LOWER_OK = {'of', 'the', 'and', 'in', 'for', 'on', 'to', 'a', 'an', '&'}
# journals whose canonical form starts lowercase
LOWER_START_OK = re.compile(r'^(?:e[A-Z]|m[A-Z]|i[A-Z]|npj|bio[Rr]xiv|med[Rr]xiv|arXiv|nph|p?[A-Z])')


def journal_plausible(tok_text):
    toks = tok_text.split()
    if not toks or len(toks) > 12:
        return False
    for t in toks:
        w = t.strip('.,()[]')
        if not w:
            return False
        if w.lower() in LOWER_OK:
            continue
        if w[0].isupper() or w[0].isdigit():
            continue
        if LOWER_START_OK.match(w):
            continue
        return False
    # a journal shouldn't look like prose: no verbs-ish heuristic beyond above
    return True


def split_title_journal(body):
    """body = 'Title. Journal'  ->  (title, journal) or (None, None)."""
    # candidate split points: every '. ' boundary
    # titles can end in '?' or '!' as well as '.'
    cands = [m.end() for m in re.finditer(r'[.?!]\s+', body)]
    for pos in cands:
        head = clean(body[:pos])
        head = head[:-1].strip() if head.endswith('.') else head.strip()
        tail = clean(body[pos:])
        if not head or not tail:
            continue
        if journal_plausible(tail):
            return head, tail.rstrip('.,') + ('.' if tail.rstrip().endswith('.') else '')
    return None, None


# ---------------------------------------------------------------- main parse
# Book chapters ("... In Encyclopedia of X, Ed. Publisher: City, 2013; pp 1-16")
# have no journal/volume/pages and must not be forced into @article shape.
BOOK = re.compile(r'\.\s+In\s+[A-Z]|,\s*Ed\.|;\s*pp\.?\s')


def parse_citation(raw):
    out = {'raw': raw}
    text = clean(raw)
    # residue the extractor's numeric PMID/DOI stripper cannot catch
    text = re.sub(r'\s*(?:PMID|DOI)\s*:\s*(?:tbd|n/?a|none)\.?\s*$', '', text, flags=re.I)
    text = re.sub(r'\s*WWW\s*:\s*link\s*$', '', text, flags=re.I)
    text = clean(text)
    out['raw'] = text
    if BOOK.search(text):
        out['book'] = True
        authors, rest = split_authors(text)
        if authors:
            out['authors'] = authors
        m = re.search(r'\b(1[89]\d\d|20\d\d)\b', text)
        if m:
            out['year'] = m.group(1)
        # title = text up to ". In "
        mt = re.search(r'^(.*?)\.\s+In\s+[A-Z]', rest or text)
        # a ';' in the candidate title means the author split leaked — drop it
        # and let the raw `note` carry the record rather than show a wrong title
        if mt and len(clean(mt.group(1))) > 8 and ';' not in mt.group(1):
            out['title'] = clean(mt.group(1))
        return out
    authors, rest = split_authors(text)
    if authors:
        out['authors'] = authors
    else:
        rest = text

    # locate "YEAR," -> everything before is "Title. Journal"
    m = None
    for m2 in re.finditer(r'(?<![\d-])(1[89]\d\d|20\d\d)\s*(?=[,;.]|\s)', rest):
        m = m2  # take the last such year before the tail
        break
    if not m:
        return out  # degraded

    year = m.group(1)
    head = clean(rest[:m.start()])
    tail = clean(rest[m.end():]).lstrip(',;. ')
    out['year'] = year

    title, journal = split_title_journal(head + ' ')
    if title is None:
        # single-sentence head: no '. ' at all -> can't separate; degrade
        return out
    out['title'] = title
    out['journal'] = journal.rstrip('.,') if journal else None
    if journal and journal.rstrip().endswith('.'):
        out['journal'] = journal.rstrip()  # keep abbreviation period

    # volume / pages from tail: "83, 3921-3930.e7." or "6, eaaz1949."
    tail = tail.rstrip('. ')
    if re.match(r'^in\s+press$', tail, re.I):
        out['note'] = 'In press'
        return out
    parts = [clean(p) for p in tail.split(',') if clean(p)]
    if parts:
        vol = parts[0]
        vm = re.match(r'^(\d+[A-Za-z]?)(?:\s*\((?P<no>[^)]+)\))?$', vol)
        if vm:
            out['volume'] = vm.group(1)
            if vm.group('no'):
                out['number'] = vm.group('no')
            if len(parts) > 1:
                out['pages'] = parts[1]
        else:
            out['pages'] = tail
    return out


# ---------------------------------------------------------------- bibtex out
ESCAPE = {'&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#', '_': r'\_'}


def bib_escape(s):
    s = s.replace('\\', r'\textbackslash{}')
    out = []
    for ch in s:
        out.append(ESCAPE.get(ch, ch))
    s = ''.join(out)
    s = s.replace('~', r'\textasciitilde{}').replace('^', r'\textasciicircum{}')
    # balance stray braces
    if s.count('{') != s.count('}'):
        s = s.replace('{', '(').replace('}', ')')
    return s


def fmt_authors(authors):
    out = []
    for last, init in authors:
        if not last:                       # corporate author: brace-protect
            out.append('{' + init + '}')
        else:
            out.append(f'{last}, {init}'.strip().rstrip(',').strip())
    return ' and '.join(out)


def make_key(entry, used):
    if entry.get('authors'):
        base = entry['authors'][0][0] or entry['authors'][0][1]
    else:
        base = entry.get('tpcb_author', 'Anon').split(',')[0]
    base = unicodedata.normalize('NFKD', base).encode('ascii', 'ignore').decode()
    base = re.sub(r'[^A-Za-z]', '', base) or 'Anon'
    base = base[:1].upper() + base[1:]
    year = entry.get('year', 'nd')
    key = f'{base}{year}'
    if key not in used:
        used.add(key)
        return key
    i = 0
    while True:
        suf = ''
        n = i
        while True:
            suf = chr(ord('a') + n % 26) + suf
            n = n // 26 - 1
            if n < 0:
                break
        cand = f'{key}{suf}'
        if cand not in used:
            used.add(cand)
            return cand
        i += 1


def main():
    pubs = json.load(open(SRC))
    used = set()
    entries = []
    stats = collections.Counter()
    degraded = []

    for p in pubs:
        e = parse_citation(p['citation'])
        e['tpcb_author'] = p['tpcb_author']
        e['doi'] = p['doi']
        e['pmid'] = p['pmid']
        entries.append(e)
        for f in ('authors', 'title', 'journal', 'year', 'volume', 'pages'):
            if e.get(f):
                stats[f] += 1
        if not (e.get('title') and e.get('journal') and e.get('year')):
            degraded.append(e)

    # ---- emit
    lines = []
    lines.append('% TPCB student publications — generated from the program\'s')
    lines.append('% publication record. Each entry carries tpcb_author: the TPCB')
    lines.append('% student the program grouped the paper under.')
    lines.append('')
    for e in entries:
        complete = bool(e.get('title') and e.get('journal') and e.get('year'))
        key = make_key(e, used)
        typ = 'article' if complete else 'misc'
        lines.append(f'@{typ}{{{key},')
        if e.get('authors'):
            lines.append(f'  author    = {{{bib_escape(fmt_authors(e["authors"]))}}},')
        if complete:
            lines.append(f'  title     = {{{bib_escape(e["title"])}}},')
            lines.append(f'  journal   = {{{bib_escape(e["journal"])}}},')
        elif e.get('title'):
            lines.append(f'  title     = {{{bib_escape(e["title"])}}},')
        if e.get('year'):
            lines.append(f'  year      = {{{e["year"]}}},')
        if e.get('volume'):
            lines.append(f'  volume    = {{{bib_escape(e["volume"])}}},')
        if e.get('number'):
            lines.append(f'  number    = {{{bib_escape(e["number"])}}},')
        if e.get('pages'):
            lines.append(f'  pages     = {{{bib_escape(e["pages"])}}},')
        if e.get('doi'):
            lines.append(f'  doi       = {{{bib_escape(e["doi"])}}},')
        if e.get('pmid'):
            lines.append(f'  pmid      = {{{e["pmid"]}}},')
        if not complete:
            lines.append(f'  note      = {{{bib_escape(e["raw"])}}},')
        elif e.get('note'):
            lines.append(f'  note      = {{{bib_escape(e["note"])}}},')
        lines.append(f'  tpcb_author = {{{bib_escape(e["tpcb_author"])}}}')
        lines.append('}')
        lines.append('')

    open('/Users/aakash/.claude/jobs/5a9b810d/tmp/papers.bib', 'w').write('\n'.join(lines))

    n = len(entries)
    print(f'entries: {n}')
    for f in ('authors', 'title', 'journal', 'year', 'volume', 'pages'):
        print(f'  {f:9s} {stats[f]:4d}  ({100*stats[f]/n:.1f}%)')
    print(f'degraded to @misc/note: {len(degraded)}')
    json.dump([{k: v for k, v in e.items()} for e in entries],
              open('/Users/aakash/.claude/jobs/5a9b810d/tmp/parsed.json', 'w'),
              indent=1, ensure_ascii=False)
    if '-v' in sys.argv:
        for e in degraded[:40]:
            print('  !', e['raw'][:200])


if __name__ == '__main__':
    main()
