#!/usr/bin/env python3
"""Extract readable text from the cached pages of the OLD TPCB site.

Reads  .crawl/pages/*.html  ->  writes  .crawl/text/*.txt

Two things this has to get right, both learned the hard way:

1. HTML COMMENTS MUST BE STRIPPED FIRST.
   The old site is a WordPress build whose editors park retired content inside
   <!-- ... --> rather than deleting it. An earlier version of this script ran
   the tag-stripping regex without removing comments, so commented-out content
   surfaced in the text file as though it were live copy. On the symposium page
   that block was a list of promotional partners sitting behind the comment
   "COMMENTING OUT PROMOTIONAL PARTNERS NOT CURRENTLY USED OR CONFIRMED";
   publishing it would have credited organisations that are not partners. The
   student-support page hides a retired paragraph the same way.

   Anything a human deliberately commented out is NOT content. Strip it before
   anything else touches the markup.

2. IMAGE-ONLY CONTENT IS INVISIBLE HERE.
   Logos, sponsor rows and flyers leave no text behind, so a page can look
   thinner in the .txt than it really is. Where a page matters, read the .html.

Usage:  python3 tools/extract_old_site.py
"""
import re, glob, os, html as ihtml

SRC, DST = '.crawl/pages', '.crawl/text'
SKIP = {'news', '_home'}          # news is handled separately; _home is chrome


def clean(h):
    # 1. Comments first — see the note above. Non-greedy, DOTALL.
    h = re.sub(r'<!--.*?-->', ' ', h, flags=re.S)
    # 2. Script/style/noscript carry no prose.
    h = re.sub(r'<(script|style|noscript)[^>]*>.*?</\1>', ' ', h, flags=re.S | re.I)
    # 3. Narrow to the main content region if the theme marks one.
    m = (re.search(r'<main[^>]*>(.*?)</main>', h, re.S | re.I)
         or re.search(r'<article[^>]*>(.*?)</article>', h, re.S | re.I)
         or re.search(r'id="content"[^>]*>(.*?)<footer', h, re.S | re.I))
    body = m.group(1) if m else h
    # 4. Drop site chrome that survived inside it.
    body = re.sub(r'<(nav|header|footer|aside)[^>]*>.*?</\1>', ' ', body, flags=re.S | re.I)
    # 5. Turn structure into plain-text structure before dropping tags.
    body = re.sub(r'<br\s*/?>', '\n', body, flags=re.I)
    body = re.sub(r'</(p|div|li|h[1-6]|tr|section)>', '\n\n', body, flags=re.I)
    body = re.sub(r'<li[^>]*>', '- ', body, flags=re.I)
    body = re.sub(r'<h([1-6])[^>]*>', lambda m: '\n' + '#' * int(m.group(1)) + ' ', body, flags=re.I)
    body = re.sub(r'<[^>]+>', '', body)
    body = ihtml.unescape(body)
    body = re.sub(r'[ \t]+', ' ', body)
    body = re.sub(r'\n\s*\n\s*\n+', '\n\n', body)
    return body.strip()


def main():
    os.makedirs(DST, exist_ok=True)
    for f in sorted(glob.glob(f'{SRC}/*.html')):
        name = os.path.basename(f)[:-5]
        if name in SKIP:
            continue
        text = clean(open(f, encoding='utf-8', errors='replace').read())
        open(f'{DST}/{name}.txt', 'w', encoding='utf-8').write(text)
        print(f'{name:26} {len(text):>6} chars')


if __name__ == '__main__':
    main()
