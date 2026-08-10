import json, re, os, glob, datetime, unicodedata, collections

REPO = '/Users/aakash/tpcb-website/'
MONTHS = {m: i + 1 for i, m in enumerate(
    ['January', 'February', 'March', 'April', 'May', 'June', 'July',
     'August', 'September', 'October', 'November', 'December'])}

STOP = set('a an the and or of for to in on at with by from is are as its it'.split())


def slugify(s):
    s = s.replace('’', "'").replace('‘', "'").replace('“', '').replace('”', '')
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'\*+', '', s).lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    words = [w for w in s.split('-') if w]
    kept, out = 0, []
    for w in words:
        out.append(w)
        if w not in STOP:
            kept += 1
        if kept >= 8:
            break
    return '-'.join(out).strip('-') or 'news'


# Tags are scored, not just matched: a title hit is worth 3, a body hit 1, and
# only tags clearing a threshold survive. Broad words ("lab", "study") are
# deliberately excluded — they fire on nearly every item and carry no signal.
TAG_RULES = [
    ('awards', r'\baward(s|ed|ee)?\b|\bprize\b|\belected to\b|\belection to\b|'
               r'\bhonou?r(s|ed|ee)?\b|\bmedal\b|\blaureate\b|\brecipient\b|'
               r'\bwins?\b|\bwinner\b|\bnamed a\b|\bnamed an\b|\binducted\b|'
               r'\bfellowship\b|\bearly career\b|\bscholar award\b'),
    ('publications', r'\bpublish(ed|es)?\b|\bpublication\b|\bpaper\b|\bpapers\b|'
                     r'\bin \*?Nature|\bin \*?Science\b|\bin \*?Cell\b|\bPNAS\b|'
                     r'\bJACS\b|\bJ\. Am\. Chem\.|\bpreprint\b|\bnew study\b|'
                     r'\breports? in\b|\bco-?authored\b'),
    ('symposium', r'\bsymposi(um|a)\b|\bretreat\b|\bconference\b|'
                  r'\bseminar series\b|\bworkshop\b|\bannual meeting\b|'
                  r'\bposter session\b|\bkeynote\b'),
    ('students', r'\bstudents?\b|\bthesis defen[sc]e\b|\bdefend(s|ed)\b|'
                 r'\bincoming class\b|\bcohort\b|\bmatriculat|\bPhD candidate\b|'
                 r'\bgraduat(es?|ing|ion)\b|\brotation'),
    ('faculty', r'\bfaculty\b|\bnew faculty\b|\bjoins the (TPCB )?(program|faculty)\b|'
                r'\bappointed\b|\bpromoted\b|\bProf\.|\bprofessor\b|'
                r'\bprincipal investigator\b'),
]


# Most legacy items report a research result without naming the journal, so a
# title in the "X Elucidates / Reveals / Develops Y" form also counts as a
# publication. Title-only, to keep it from firing on background prose.
RESEARCH_TITLE = re.compile(
    r'\b(elucidat|discover|reveal|uncover|identif|develop|demonstrat|'
    r'characteri[sz]|determin|solv(e|es|ed)\b|find(s|ings)?\b|shed light|'
    r'map(s|ped)?\b|engineer(s|ed)?\b|synthesi[sz])', re.I)


def tags_for(title, body):
    blob = '\n'.join(body)
    scored = []
    for tag, pat in TAG_RULES:
        t_hits = len(re.findall(pat, title, re.I))
        b_hits = len(re.findall(pat, blob, re.I))
        score = t_hits * 3 + min(b_hits, 4)
        if tag == 'publications' and RESEARCH_TITLE.search(title):
            score += 3
        if score:
            scored.append((score, tag))
    scored.sort(key=lambda x: (-x[0], [t for t, _ in TAG_RULES].index(x[1])))
    keep = [t for s, t in scored if s >= 3][:3]
    if not keep and scored:
        keep = [scored[0][1]]
    return keep or ['program']


def yamlq(s):
    return '"%s"' % s.replace('\\', '\\\\').replace('"', '\\"')


def main():
    items = json.load(open('/Users/aakash/.claude/jobs/5a9b810d/tmp/news.json'))
    d = REPO + '_news/'
    for f in glob.glob(d + '*.md'):
        os.remove(f)

    used = set()
    collisions = []
    written = 0
    for it in items:
        mon, yr = it['month'].split()
        date = datetime.date(int(yr), MONTHS[mon], 1)
        base = slugify(it['title'])
        fname = '%s-%s' % (date.isoformat(), base)
        if fname in used:
            # Disambiguate via the slug only — never by shifting the date.
            n = 2
            while '%s-%d' % (fname, n) in used:
                n += 1
            collisions.append((fname, n))
            fname = '%s-%d' % (fname, n)
        used.add(fname)

        # The source gives MONTH PRECISION ONLY; day 01 is a placeholder, so
        # templates must never render the day. They format `date` as "%B %Y",
        # which is why neither `date_display` nor `date_precision` is emitted
        # any more: the first was exactly that filter's output in all 169 files
        # and the second was the constant "month" in all 169. `layout` is set
        # collection-wide by _config.yml's `defaults:`.
        fm = ['---',
              'date: %s' % date.isoformat(),
              'title: %s' % yamlq(it['title']),
              'tags: [%s]' % ', '.join(tags_for(it['title'], it['body'])),
              '---', '']
        body = '\n\n'.join(it['body'])
        open(d + fname + '.md', 'w', encoding='utf-8').write(
            '\n'.join(fm) + body + '\n')
        written += 1

    print('news written:', written)
    print('slug collisions disambiguated:', len(collisions))
    for c in collisions:
        print('   ', c)
    tc = collections.Counter()
    for f in glob.glob(d + '*.md'):
        m = re.search(r'^tags: \[(.*)\]$', open(f, encoding='utf-8').read(), re.M)
        for t in m.group(1).split(', '):
            tc[t] += 1
    print('tag distribution:', tc.most_common())


if __name__ == '__main__':
    main()
