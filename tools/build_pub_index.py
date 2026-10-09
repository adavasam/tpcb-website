"""Build _data/publications.yml: a person -> publications index.

papers.bib tags each paper with `tpcb_author`, the TPCB student(s) the program
credited it to, in "Last, First" form. Two lookups fall out of that:

  student page  -> exact name match against tpcb_author
  faculty page  -> the union over that faculty's students and alumni

The faculty case is INDIRECT and must be labelled honestly on the page: it is
"papers co-authored by this lab's TPCB students", not the faculty member's
bibliography, which is far larger. Matching faculty by surname against the
`author` field was rejected — "Chen, J." collides across Jue Chen, Shuibing
Chen and unrelated authors, and getting a real person's publication record
wrong is worse than showing a narrower, accurate list.

Jekyll does not invoke this tool: it reads the tracked output as ordinary
site data. `entries` stores citation fields, `by_person` maps normalised names
to bib keys, and `by_faculty` maps advisor slugs to their students' keys.
Credits without a roster match stay in by_person but contribute to no faculty
list; this is not reported as an error. Unknown advisor slugs are validated
by the Jekyll hook, not by this tool.

Run after editing papers.bib, adding/removing a student or alumnus, or changing
their advisor_slugs or name (paths resolve relative to this file):

    python3 tools/build_pub_index.py           # rewrite _data/publications.yml
    python3 tools/build_pub_index.py --check   # exit 1 if it is out of date

Student front matter and _data/alumni.yml are read with Ruby's YAML library,
using safe_load with Date/Time allowed, but no aliases or arbitrary object
tags. Single/double quotes and block/inline lists work. Ruby is already needed
to build the site; Python has no YAML parser of its own. The tool stops before writing on a
duplicate YAML key, a record without a name, an `advisor_slugs` that is not a
list of strings, or two roster records whose names normalise the same: the
index matches people by name, so it cannot tell two such records apart.

Names are normalised by `norm` below; _plugins/derive_student_fields.rb
computes the same key in Ruby as `publication_key` for the profile page's
lookup. Change both together.
"""
import re, os, sys, json, subprocess, unicodedata, collections

from pathlib import Path

from bib_entries import BibFormatError, parse_entries
from safe_write import write_text_atomic

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, '_data', 'publications.yml')


class RosterError(ValueError):
    pass


def norm(s):
    """Compatibility-decompose, drop accents and other marks, casefold, drop
    dots, treat hyphens as spaces, collapse whitespace."""
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(c for c in s if not unicodedata.category(c).startswith('M'))
    return ' '.join(s.casefold().replace('.', '').replace('-', ' ').split())


def flip(name):
    """'Baca, Christian' -> 'christian baca'"""
    if ',' in name:
        last, first = name.split(',', 1)
        return norm(first + ' ' + last)
    return norm(name)


def parse_bib():
    src = Path(ROOT, '_bibliography/papers.bib').read_text(encoding='utf-8')
    _, entries = parse_entries(src)
    out = []
    for e in entries:
        def f(name):
            m = re.search(r'(?m)^\s*' + name + r'\s*=\s*\{(.*?)\}\s*,?\s*$', e, re.S)
            if not m:
                return None
            # Undo the BibTeX escapes the file uses (jekyll-scholar does the
            # same on /publications/), so DOIs link correctly on profile pages.
            value = m.group(1).replace('\\_', '_').replace('\\%', '%')
            return re.sub(r'\s+', ' ', value).strip()
        key = re.match(r'@\w+\{([^,]+)', e).group(1)
        out.append({
            'key': key,
            'title': f('title'),
            'journal': f('journal') or f('booktitle'),
            'year': f('year'),
            'doi': f('doi'),
            'pmid': f('pmid'),
            'note': f('note'),
            'students': [s.strip() for s in (f('tpcb_author') or '').split(';') if s.strip()],
        })
    return out


# Prints {"students": [{"source", "data"}], "alumni": <parsed alumni.yml>} as
# JSON, or a message on stderr and a non-zero exit.
ROSTER_READER = r"""
require "yaml"
require "json"
require "date"

FRONT_MATTER = /\A(---\s*\n.*?\n?)^((---|\.\.\.)\s*$\n?)/m  # Jekyll's pattern

def reject_duplicate_keys(node, source)
  if node.is_a?(Psych::Nodes::Mapping)
    seen = {}
    node.children.each_slice(2) do |key, _|
      name = key.respond_to?(:value) ? key.value : key.to_s
      abort "#{source}, line #{key.start_line + 1}: duplicate key #{name.inspect}" if seen[name]
      seen[name] = true
    end
  end
  Array(node.children).each { |child| reject_duplicate_keys(child, source) }
end

def parse(text, source)
  reject_duplicate_keys(Psych.parse_stream(text), source)
  YAML.safe_load(text, permitted_classes: [Date, Time])
rescue Psych::Exception => e
  abort "#{source}: #{e.message}"
end

root = ARGV.fetch(0)
students = Dir[File.join(root, "_students", "*.md")].sort.map do |path|
  source = path.delete_prefix(File.join(root, ""))
  match = FRONT_MATTER.match(File.read(path, encoding: "UTF-8"))
  abort "#{source}: no front matter" unless match
  { "source" => source, "data" => parse(match[1], source) }
end
alumni_path = File.join(root, "_data", "alumni.yml")
abort "_data/alumni.yml: not found" unless File.file?(alumni_path)
alumni = parse(File.read(alumni_path, encoding: "UTF-8"), "_data/alumni.yml")
puts JSON.generate({ "students" => students, "alumni" => alumni })
"""


def roster_record(record, source):
    """(source, name, advisor slugs) for one student or alumnus record."""
    if not isinstance(record, dict):
        raise RosterError(f'{source}: expected a record of fields')
    name = record.get('name')
    if not isinstance(name, str) or not norm(name):
        raise RosterError(f'{source}: `name` must be a non-empty string')
    slugs = record.get('advisor_slugs')
    if slugs is None:
        slugs = []
    if not isinstance(slugs, list) or not all(isinstance(slug, str) for slug in slugs):
        raise RosterError(f'{source} ({name}): `advisor_slugs` must be a list of strings')
    return source, name, [slug for slug in slugs if slug]


def read_roster():
    """Every student and alumnus as (source, name, advisor slugs)."""
    try:
        result = subprocess.run(['ruby', '-e', ROSTER_READER, ROOT],
                                capture_output=True, text=True, encoding='utf-8')
    except FileNotFoundError:
        raise RosterError('ruby not found on PATH; it is needed to read the YAML roster') from None
    if result.returncode:
        raise RosterError(result.stderr.strip() or 'the YAML roster could not be read')
    data = json.loads(result.stdout)
    people = [roster_record(doc['data'], doc['source']) for doc in data['students']]
    alumni = data['alumni'] if data['alumni'] is not None else []
    if not isinstance(alumni, list):
        raise RosterError('_data/alumni.yml: expected a list of records')
    people += [roster_record(record, f'_data/alumni.yml record {number}')
               for number, record in enumerate(alumni, 1)]
    return people


def yaml_str(s):
    return '"' + (s or '').replace('\\', '\\\\').replace('"', '\\"') + '"'


PLAIN_KEY = re.compile(r'[A-Za-z][A-Za-z0-9_-]*\Z')
YAML_WORDS = {'y', 'n', 'yes', 'no', 'true', 'false', 'on', 'off', 'null'}


def yaml_key(s):
    """A bib key or faculty slug: bare when YAML reads it back as the same
    string, quoted otherwise (`a]b`, `null`, `yes`, `123`, `.NaN`)."""
    if PLAIN_KEY.match(s) and s.lower() not in YAML_WORDS:
        return s
    return yaml_str(s)


def main():
    pubs = parse_bib()

    # person (normalised) -> advisor slugs. Students and alumni alike; a
    # record with no advisor_slugs still claims its name.
    advisors, claimed = {}, {}
    for source, name, slugs in read_roster():
        person = norm(name)
        if person in claimed:
            raise RosterError(
                f'{claimed[person]} and {source} ({name}) are duplicate names: both match '
                f'publications credited to "{person}", and the index cannot tell them apart. '
                'No output was written.'
            )
        claimed[person] = f'{source} ({name})'
        advisors[person] = set(slugs)

    by_person = collections.defaultdict(list)   # normalised person -> keys
    by_faculty = collections.defaultdict(list)  # faculty slug -> keys

    for pub in pubs:
        fac_for_pub = set()
        for student in pub['students']:
            person = flip(student)
            by_person[person].append(pub['key'])
            for slug in advisors.get(person, ()):
                fac_for_pub.add(slug)
        for slug in fac_for_pub:
            by_faculty[slug].append(pub['key'])

    def sort_key(k):
        p = index[k]
        return (-(int(p['year']) if (p['year'] or '').isdigit() else 0), p['title'] or '')

    index = {p['key']: p for p in pubs}

    lines = [
        '# GENERATED by tools/build_pub_index.py — do not edit by hand.',
        '#',
        '# entries:  bib key -> citation fields',
        '# by_person: normalised "first last" -> bib keys (exact tpcb_author match)',
        '# by_faculty: faculty slug -> bib keys, reached through that faculty\'s',
        '#   students and alumni. This is papers co-authored by the lab\'s TPCB',
        '#   students, NOT the faculty member\'s full bibliography — label it so.',
        'entries:',
    ]
    for k in sorted(index):
        p = index[k]
        lines.append(f'  {yaml_key(k)}:')
        for field in ('title', 'journal', 'year', 'doi', 'pmid', 'note'):
            if p[field]:
                lines.append(f'    {field}: {yaml_str(p[field])}')
        lines.append('    students: [' + ', '.join(yaml_str(s) for s in p['students']) + ']')

    lines.append('by_person:')
    for person in sorted(by_person):
        keys = sorted(set(by_person[person]), key=sort_key)
        lines.append(f'  {yaml_str(person)}: [' + ', '.join(map(yaml_key, keys)) + ']')

    lines.append('by_faculty:')
    for slug in sorted(by_faculty):
        keys = sorted(set(by_faculty[slug]), key=sort_key)
        lines.append(f'  {yaml_key(slug)}: [' + ', '.join(map(yaml_key, keys)) + ']')

    text = '\n'.join(lines) + '\n'
    if '--check' in sys.argv:
        current = Path(OUT).read_text(encoding='utf-8') if os.path.exists(OUT) else ''
        if current != text:
            print(f'{OUT} is out of date; run tools/build_pub_index.py')
            sys.exit(1)
        print(f'{OUT} is up to date')
        return
    write_text_atomic(OUT, text)

    print(f'publications indexed : {len(index)}')
    print(f'people with papers   : {len(by_person)}')
    print(f'faculty with papers  : {len(by_faculty)}')
    counts = sorted(((len(set(v)), k) for k, v in by_faculty.items()), reverse=True)
    print('\ntop faculty by student-authored papers:')
    for n, slug in counts[:5]:
        print(f'   {n:4d}  {slug}')
    print(f'\nwrote {OUT}')


if __name__ == '__main__':
    try:
        main()
    except (BibFormatError, RosterError) as error:
        sys.exit(str(error))
