"""Extract TPCB publications from the crawled old-site HTML.

Table shape (verified against .crawl/publications.html):
  - a row with 2 cells  -> [author name, first publication for that author]
  - a row with 1 cell   -> another publication belonging to the author above
So continuation rows MUST inherit the last seen author; filtering on
len(row) >= 2 silently discards 611 of 777 publications.
"""
from html.parser import HTMLParser
import re, json, sys


class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.cur = None
        self.cell = None
        self.rows = []

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self.cur = []
        elif tag in ('td', 'th'):
            if self.cur is None:
                self.cur = []
            self.cell = []
        elif tag == 'a' and self.cell is not None:
            href = dict(attrs).get('href', '')
            if 'doi.org' in href:
                self.cell.append('\x00DOI:' + href.split('doi.org/')[-1].strip('/') + '\x00')
            elif 'pubmed' in href.lower():
                pmid = re.sub(r'\D', '', href.rstrip('/').split('/')[-1])
                if pmid:
                    self.cell.append('\x00PMID:' + pmid + '\x00')

    def handle_endtag(self, tag):
        if tag == 'tr' and self.cur is not None:
            self.rows.append(self.cur)
            self.cur = None
        elif tag in ('td', 'th') and self.cell is not None:
            self.cur.append(re.sub(r'[ \t\r\n]+', ' ', ''.join(self.cell)).strip())
            self.cell = None

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)


def split_markers(text):
    """Pull DOI/PMID out of the marker sentinels and return (clean_text, doi, pmid)."""
    doi = pmid = None
    for m in re.findall(r'\x00(DOI|PMID):([^\x00]*)\x00', text):
        if m[0] == 'DOI' and not doi:
            doi = m[1]
        elif m[0] == 'PMID' and not pmid:
            pmid = m[1]
    clean = re.sub(r'\x00(?:DOI|PMID):[^\x00]*\x00', ' ', text)
    # the visible text repeats the identifiers after the links; drop the tails
    clean = re.sub(r'\s*DOI:\s*\S+', '', clean)
    clean = re.sub(r'\s*PMID:\s*\d+', '', clean)
    return re.sub(r'\s{2,}', ' ', clean).strip(' ;,'), doi, pmid


def parse(path):
    p = TableParser()
    p.feed(open(path, encoding='utf-8', errors='replace').read())

    pubs = []
    author = None
    for row in p.rows:
        cells = [c for c in row]
        if len(cells) >= 2:
            if cells[0].strip():
                if cells[0].strip().lower() == 'name':      # header row
                    continue
                author = cells[0].strip()
            body = cells[1]
        elif len(cells) == 1:
            body = cells[0]
        else:
            continue
        if not body.strip() or author is None:
            continue
        citation, doi, pmid = split_markers(body)
        if not citation:
            continue
        pubs.append({'tpcb_author': author, 'citation': citation, 'doi': doi, 'pmid': pmid})
    return pubs


if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else '/Users/aakash/tpcb-website/.crawl/publications.html'
    pubs = parse(src)
    authors = {p['tpcb_author'] for p in pubs}
    print(f'publications : {len(pubs)}')
    print(f'authors      : {len(authors)}')
    print(f'with DOI     : {sum(1 for p in pubs if p["doi"])}')
    print(f'with PMID    : {sum(1 for p in pubs if p["pmid"])}')
    json.dump(pubs, open('/Users/aakash/.claude/jobs/5a9b810d/tmp/pubs.json', 'w'), indent=1)
    print('\nsample:')
    for p in pubs[:2] + pubs[-1:]:
        print(f'  [{p["tpcb_author"]}] doi={p["doi"]} pmid={p["pmid"]}')
        print(f'    {p["citation"][:190]}')
