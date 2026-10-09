"""Publication index and dedupe contracts: roster parsing, name collisions,
credit merging, YAML-safe keys and interrupted writes. Synthetic fixtures only.

Needs `ruby` on PATH, as build_pub_index.py does.
"""
import contextlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build_pub_index
import dedupe_bib
import safe_write


def paper(key, credit=None, doi='10.123/example'):
    credit_line = f'  tpcb_author = {{{credit}}},\n' if credit is not None else ''
    return (f'@article{{{key},\n  title = {{Example}},\n  year = {{2020}},\n'
            f'  doi = {{{doi}}},\n{credit_line}}}\n')


def index_fixture(root, alumni, students=(), bib=None):
    for folder in ('_bibliography', '_data', '_students'):
        (root / folder).mkdir()
    (root / '_bibliography/papers.bib').write_text(bib or paper('one', 'Person, Sample'))
    (root / '_data/alumni.yml').write_text(alumni)
    for number, student in enumerate(students):
        (root / f'_students/student-{number}.md').write_text(student)
    output = root / '_data/publications.yml'
    output.write_text('original index\n')
    return output


@contextlib.contextmanager
def index_run(root, output):
    with patch.object(build_pub_index, 'ROOT', str(root)), patch.object(build_pub_index, 'OUT', str(output)), \
            patch.object(sys, 'argv', ['build_pub_index.py']), contextlib.redirect_stdout(io.StringIO()):
        yield


@contextlib.contextmanager
def interrupted_write():
    """The writer stores 20 characters, then fails as a full disk would."""
    real_fdopen = os.fdopen

    class Partial:
        def __init__(self, handle):
            self.handle = handle

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            self.handle.close()

        def write(self, text):
            self.handle.write(text[:20])
            self.handle.flush()
            raise OSError('simulated disk-full write')

    with patch.object(safe_write.os, 'fdopen', lambda *a, **k: Partial(real_fdopen(*a, **k))):
        yield


def leftovers(directory):
    return [name for name in os.listdir(directory) if name.endswith('.tmp')]


@unittest.skipUnless(shutil.which('ruby'), 'ruby is needed to read the YAML roster')
class RosterTest(unittest.TestCase):
    def index(self, alumni, students=()):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = index_fixture(root, alumni, students)
            with index_run(root, output):
                build_pub_index.main()
            return output.read_text()

    def assert_rejected(self, pattern, alumni, students=(), bib=None):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = index_fixture(root, alumni, students, bib)
            with index_run(root, output), self.assertRaisesRegex(build_pub_index.RosterError, pattern):
                build_pub_index.main()
            self.assertEqual('original index\n', output.read_text())

    def test_valid_yaml_spellings_all_keep_the_advisor(self):
        variants = {
            'alumni without final newline': ('- name: "Sample Person"\n  advisor_slugs:\n    - "faculty"', []),
            'slugs last, no blank line between alumni':
                ('- name: "Sample Person"\n  advisor_slugs:\n    - "faculty"\n- name: "Other Person"\n', []),
            'single-quoted alumni': ("- name: 'Sample Person'\n  advisor_slugs:\n    - 'faculty'\n", []),
            'inline alumni slugs': ('- name: "Sample Person"\n  advisor_slugs: ["faculty"]\n', []),
            'single-quoted student': ('[]\n', ["---\nname: 'Sample Person'\nadvisor_slugs:\n  - 'faculty'\n---\n"]),
            'inline student slugs': ('[]\n', ['---\nname: "Sample Person"\nadvisor_slugs: [faculty]\n---\n']),
            'escaped quote in name': ('[]\n', ['---\nname: "Sample \\"Q\\" Person"\nadvisor_slugs: [faculty]\n---\n']),
        }
        for label, (alumni, students) in variants.items():
            with self.subTest(label):
                text = self.index(alumni, students)
                if 'escaped' in label:
                    self.assertNotIn('  faculty:', text)  # "sample "q" person" is a different name
                else:
                    self.assertIn('  faculty: [one]', text)

    def test_empty_alumni_and_unlinked_sponsors_are_accepted(self):
        for alumni in ['', '[]\n', '- name: "Sample Person"\n  advisor_slugs:\n    - ""\n']:
            with self.subTest(alumni=alumni):
                self.assertNotIn('  faculty:', self.index(alumni).split('by_faculty:')[1])

    def test_co_advised_student_is_indexed_under_both_advisors(self):
        text = self.index('[]\n', ['---\nname: "Sample Person"\nadvisor_slugs:\n  - "first-lab"\n  - "second-lab"\n---\n'])
        self.assertIn('  first-lab: [one]', text)
        self.assertIn('  second-lab: [one]', text)

    def test_malformed_roster_records_stop_before_writing(self):
        cases = {
            'duplicate key': ('- name: "Sample Person"\n  advisor_slugs:\n    - "a"\n  advisor_slugs:\n    - "b"\n', []),
            'missing name': ('- advisor_slugs:\n    - "faculty"\n', []),
            'slugs not a list': ('- name: "Sample Person"\n  advisor_slugs: "faculty"\n', []),
            'non-string slug': ('- name: "Sample Person"\n  advisor_slugs:\n    - [nested]\n', []),
            'alumni not a list': ('name: "Sample Person"\n', []),
            'invalid yaml': ('- name: "Sample Person\n', []),
            'student without front matter': ('[]\n', ['name: "Sample Person"\n']),
        }
        patterns = {'duplicate key': 'duplicate key', 'missing name': 'name', 'slugs not a list': 'advisor_slugs',
                    'non-string slug': 'advisor_slugs', 'alumni not a list': 'list of records',
                    'invalid yaml': 'alumni.yml', 'student without front matter': 'front matter'}
        for label, (alumni, students) in cases.items():
            with self.subTest(label):
                self.assert_rejected(patterns[label], alumni, students)

    def test_normalised_name_collisions_stop_before_writing(self):
        student = '---\nname: "Sample Person"\nadvisor_slugs:\n  - "first-lab"\n---\n'
        for other in ['Sample Pérson', 'Sample Person', 'SAMPLE  PERSON.']:
            with self.subTest(other=other):
                self.assert_rejected('cannot tell them apart',
                                     f'- name: "{other}"\n  advisor_slugs:\n    - "second-lab"\n', [student])

    def test_yaml_sensitive_keys_keep_their_identity(self):
        keys = ['broken]key', 'null', 'yes', 'No', '123', 'true', '.NaN', 'a:b', 'Ordinary2026']
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            bib = ''.join(paper(key, 'Person, Sample', doi=f'10.1/{n}') for n, key in enumerate(keys))
            output = index_fixture(root, '- name: "Sample Person"\n  advisor_slugs:\n    - "yes"\n', bib=bib)
            with index_run(root, output):
                build_pub_index.main()
            self.assertIn('  Ordinary2026:\n', output.read_text())  # safe keys stay bare
            # Ruby/Psych is the site's YAML reader.
            loaded = subprocess.check_output(
                ['ruby', '-rjson', '-ryaml', '-e', 'puts JSON.generate(YAML.safe_load(File.read(ARGV[0])))', str(output)],
                text=True)
            parsed = json.loads(loaded)
            self.assertEqual(set(keys), set(parsed['entries']))
            self.assertEqual(set(keys), set(parsed['by_person']['sample person']))
            self.assertEqual(set(keys), set(parsed['by_faculty']['yes']))


class DedupeCreditTest(unittest.TestCase):
    def run_dedupe(self, source):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'papers.bib'
            path.write_text(source)
            with patch.object(dedupe_bib, 'PATH', str(path)), contextlib.redirect_stdout(io.StringIO()):
                try:
                    dedupe_bib.main(apply=True)
                finally:
                    result = path.read_text()
            return result

    def test_uncredited_first_duplicate_is_refused_without_writing(self):
        source = paper('one') + paper('two', 'Person, Sample')
        with self.assertRaisesRegex(dedupe_bib.MergeError, 'one has no tpcb_author'):
            self.run_dedupe(source)

    def test_refusal_leaves_source_untouched(self):
        source = paper('one') + paper('two', 'Person, Sample')
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'papers.bib'
            path.write_text(source)
            with patch.object(dedupe_bib, 'PATH', str(path)), contextlib.redirect_stdout(io.StringIO()), \
                    self.assertRaises(dedupe_bib.MergeError):
                dedupe_bib.main(apply=True)
            self.assertEqual(source, path.read_text())

    def test_merged_credits_are_the_union_of_individual_labels(self):
        result = self.run_dedupe(paper('one', 'One, A; Two, B') + paper('two', 'Two, B; Three, C'))
        self.assertEqual('One, A; Three, C; Two, B', dedupe_bib.field(result, 'tpcb_author'))

    def test_uncredited_later_duplicate_merges_normally(self):
        result = self.run_dedupe(paper('one', 'Person, Sample') + paper('two'))
        self.assertEqual('Person, Sample', dedupe_bib.field(result, 'tpcb_author'))
        self.assertNotIn('@article{two', result)


class AtomicWriteTest(unittest.TestCase):
    def test_interrupted_dedupe_write_keeps_original(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'papers.bib'
            source = paper('one', 'One, A') + paper('two', 'Two, B')
            path.write_text(source)
            with patch.object(dedupe_bib, 'PATH', str(path)), interrupted_write(), \
                    contextlib.redirect_stdout(io.StringIO()), self.assertRaises(OSError):
                dedupe_bib.main(apply=True)
            self.assertEqual(source, path.read_text())
            self.assertEqual([], leftovers(directory))

    @unittest.skipUnless(shutil.which('ruby'), 'ruby is needed to read the YAML roster')
    def test_interrupted_index_write_keeps_original(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = index_fixture(root, '[]\n')
            with index_run(root, output), interrupted_write(), self.assertRaises(OSError):
                build_pub_index.main()
            self.assertEqual('original index\n', output.read_text())
            self.assertEqual([], leftovers(root / '_data'))

    def test_failed_replace_keeps_original_and_cleans_up(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'file.txt'
            path.write_text('original')
            with patch.object(safe_write.os, 'replace', side_effect=OSError('rename failed')), self.assertRaises(OSError):
                safe_write.write_text_atomic(path, 'replacement')
            self.assertEqual('original', path.read_text())
            self.assertEqual([], leftovers(directory))

    def test_success_replaces_contents_and_keeps_mode(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'file.txt'
            path.write_text('original')
            path.chmod(0o640)
            safe_write.write_text_atomic(path, 'replacement ünïcode\n')
            self.assertEqual('replacement ünïcode\n', path.read_text(encoding='utf-8'))
            self.assertEqual(0o640, path.stat().st_mode & 0o777)
            self.assertEqual([], leftovers(directory))


if __name__ == '__main__':
    unittest.main()
