"""Read the repository's braced, multiline BibTeX format without losing text.

This is deliberately not a general BibTeX parser. Maintenance tools must stop
on unsupported syntax rather than silently omit it when rebuilding a file.
"""
import re


class BibFormatError(ValueError):
    pass


def parse_entries(source):
    """Return (header, entries), preserving every input character.

    Entries start on their own line; each field has a braced value on one
    line. Comments/blank lines between entries stay with the preceding
    entry. A final newline is optional. Macro/quoted/concatenated values and
    BibTeX directives are rejected with a line number.
    """
    lines = source.splitlines(keepends=True)
    header, entries, current = [], [], []
    keys, fields = set(), set()
    active = False
    depth = 0
    comma = True

    def fail(number, reason):
        raise BibFormatError(
            f'BibTeX line {number}: {reason}. Use a separate @type{{key, line, '
            'one braced field per line, and a separate closing } line; no output was written.'
        )

    def value_tail(text, number):
        nonlocal depth, comma
        escaped = False
        for offset, char in enumerate(text):
            if escaped:
                escaped = False
                continue
            if char == '\\':
                escaped = True
            elif char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    tail = text[offset + 1:].strip()
                    comma = tail == ','
                    if tail not in ('', ','):
                        fail(number, 'unsupported text after field value')
                    return
        fail(number, 'unclosed or multiline field value')

    for number, line in enumerate(lines, 1):
        stripped = line.strip()
        if not active:
            if not stripped or stripped.startswith('%'):
                (current if entries or current else header).append(line)
                continue
            start = re.fullmatch(r'@([A-Za-z]+)\{([^\s,{}]+),\s*', line.rstrip())
            if not start or start[1].lower() in ('string', 'preamble', 'comment'):
                fail(number, 'unsupported entry or text outside an entry')
            if start[2] in keys:
                fail(number, f'duplicate entry key {start[2]!r}')
            keys.add(start[2])
            if current:
                entries.append(''.join(current))
            current = [line]
            fields = set()
            comma = True
            active = True
            continue

        if stripped.startswith('@'):
            fail(number, 'new entry before the preceding entry was closed')
        current.append(line)
        if stripped == '}':
            if not fields:
                fail(number, 'entry has no fields')
            active = False
        else:
            if not comma:
                fail(number, 'missing comma between fields')
            field = re.match(r'^\s*([a-z][a-z0-9_]*)\s*=\s*\{', line)
            if not field:
                fail(number, 'unsupported field syntax')
            name = field[1].lower()
            if name in fields:
                fail(number, f'duplicate field {name!r}')
            fields.add(name)
            depth = 1
            value_tail(line[field.end():], number)
    if active or depth:
        fail(len(lines) or 1, 'unclosed entry or field value')
    if current:
        entries.append(''.join(current))
    return ''.join(header), entries
