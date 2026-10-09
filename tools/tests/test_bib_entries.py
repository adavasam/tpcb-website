"""Data-preservation checks for bibliography maintenance (stdlib only)."""
import contextlib
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bib_entries import BibFormatError, parse_entries
import build_pub_index
import dedupe_bib


def article(key, title='Example', doi=None):
    doi_field = f'  doi = {{{doi}}},\n' if doi else ''
    return (f'@article{{{key},\n  title = {{{title}}},\n  year = {{2020}},\n'
            f'{doi_field}  tpcb_author = {{Student, Example}}\n}}\n')


class BibEntriesTest(unittest.TestCase):
    def test_preserves_header_comments_and_eof_without_newline(self):
        source = '% Header with contact@example.org\n\n' + article('one') + '\n% Between\n' + article('two').rstrip('\n')
        header, entries = parse_entries(source)
        self.assertEqual(2, len(entries))
        self.assertEqual(source, header + ''.join(entries))

    def test_nested_and_escaped_braces(self):
        source = article('one', 'A {nested} title with \\{literal\\}')
        self.assertEqual([source], parse_entries(source)[1])

    def test_dedupe_preserves_last_entry_without_eof_newline(self):
        source = article('one', 'First') + article('two', 'Second').rstrip('\n')
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'papers.bib'
            path.write_text(source)
            with patch.object(dedupe_bib, 'PATH', str(path)), contextlib.redirect_stdout(io.StringIO()):
                dedupe_bib.main(apply=True)
            self.assertEqual(source, path.read_text())

    def test_rejected_inputs_never_change_source_or_index(self):
        bad = {
            'one-line': '@article{two, title = {Second}}\n',
            'swallowed-entry': '@article{two,\n title = {Unclosed\n' + article('three'),
            'unbalanced': article('two').replace('{Example}', '{Example'),
            'trailing-text': article('two') + 'unrecognized trailing text\n',
            'macro': '@string{journal = {Journal}}\n',
            'duplicate-key': article('one'),
            'multiline-field': article('two', 'A {nested}\ncontinued title'),
            'missing-comma': article('two').replace('{Example},', '{Example}'),
            'duplicate-field': article('two').replace('  year =', '  title = {Again},\n  year ='),
            'quoted-value': article('two').replace('{Example}', '"Example"'),
        }
        for label, tail in bad.items():
            with self.subTest(label=label), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                (root / '_bibliography').mkdir()
                path = root / '_bibliography/papers.bib'
                source = article('one') + tail
                path.write_text(source)
                output = root / 'publications.yml'
                output.write_text('existing index\n')
                with patch.object(dedupe_bib, 'PATH', str(path)), self.assertRaises(BibFormatError):
                    dedupe_bib.main(apply=True)
                self.assertEqual(source, path.read_text())
                with patch.object(build_pub_index, 'ROOT', str(root)), patch.object(build_pub_index, 'OUT', str(output)), self.assertRaises(BibFormatError):
                    build_pub_index.main()
                self.assertEqual('existing index\n', output.read_text())

    def test_index_includes_last_entry_without_newline(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / '_bibliography').mkdir()
            (root / '_bibliography/papers.bib').write_text(article('one') + article('two').rstrip('\n'))
            with patch.object(build_pub_index, 'ROOT', str(root)):
                self.assertEqual(['one', 'two'], [entry['key'] for entry in build_pub_index.parse_bib()])

    def test_indented_closing_brace_is_preserved(self):
        source = article('one').replace('\n}\n', '\n  }\n')
        self.assertEqual([source], parse_entries(source)[1])

    def test_duplicate_merge_keeps_author_associations(self):
        source = article('one', doi='10.123/example') + article('two', doi='10.123/example').replace('Student, Example', 'Other, Student')
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'papers.bib'
            path.write_text(source)
            with patch.object(dedupe_bib, 'PATH', str(path)), contextlib.redirect_stdout(io.StringIO()):
                dedupe_bib.main(apply=True)
            _, entries = parse_entries(path.read_text())
            self.assertEqual(1, len(entries))
            self.assertEqual('Other, Student; Student, Example', dedupe_bib.field(entries[0], 'tpcb_author'))


if __name__ == '__main__':
    unittest.main()
