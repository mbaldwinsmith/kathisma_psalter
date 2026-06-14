#!/usr/bin/env python3
"""
build_psalms.py
Parses a plain-text Brenton Septuagint source and writes one JSON file
per psalm to ../data/psalms/lxx/NNN.json.

Expected source format (e.g. brenton_psalms.txt):
  Lines beginning with "Psalm NNN" start a new psalm.
  Lines beginning with "  NNN " (two-space indent + verse number) are verses.
  Optionally, a single line immediately after the "Psalm NNN" heading
  (before the first numbered verse) is treated as the psalm's inscription/title.

Usage:
  python3 scripts/build_psalms.py path/to/brenton_psalms.txt

Verification:
  - Psalm 118 must have exactly 176 verses (required for kathisma-17 splits).
  - Every LXX psalm referenced in structure.json must have a data file.
"""

import json
import os
import re
import sys

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'psalms', 'lxx')

def parse(path):
    psalms = {}
    current_num = None
    current_title = None
    current_verses = []
    title_line_expected = False

    with open(path, encoding='utf-8') as f:
        for raw in f:
            line = raw.rstrip('\n').rstrip()

            # New psalm heading
            m = re.match(r'^Psalm\s+(\d+)', line, re.IGNORECASE)
            if m:
                if current_num is not None:
                    psalms[current_num] = {'title': current_title, 'verses': current_verses}
                current_num = int(m.group(1))
                current_title = None
                current_verses = []
                title_line_expected = True
                continue

            if current_num is None:
                continue

            # Verse line: starts with optional whitespace then a number
            vm = re.match(r'^\s*(\d+)\s+(.+)$', line)
            if vm:
                title_line_expected = False
                current_verses.append({'n': int(vm.group(1)), 't': vm.group(2).strip()})
                continue

            # Possible title (non-empty line before first verse)
            if title_line_expected and line.strip():
                current_title = line.strip()
                title_line_expected = False

    # Flush last psalm
    if current_num is not None:
        psalms[current_num] = {'title': current_title, 'verses': current_verses}

    return psalms

def verify(psalms):
    errors = []
    if 118 in psalms:
        n = len(psalms[118]['verses'])
        if n != 176:
            errors.append(f'Psalm 118 has {n} verses, expected 176')
    else:
        errors.append('Psalm 118 is missing')

    structure_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'structure.json')
    with open(structure_path) as f:
        structure = json.load(f)

    for s in structure['staseis']:
        for p in s['psalms']:
            lxx = p['lxx']
            if lxx not in psalms:
                errors.append(f'Psalm {lxx} (needed by kathisma {s["kathisma"]} stasis {s["stasis"]}) is missing')
                continue
            if 'fromVerse' in p:
                fv = p['fromVerse']
                tv = p['toVerse']
                verses = psalms[lxx]['verses']
                ns = [v['n'] for v in verses]
                if fv not in ns:
                    errors.append(f'Psalm {lxx} verse {fv} not found (needed for stasis split)')
                if tv not in ns:
                    errors.append(f'Psalm {lxx} verse {tv} not found (needed for stasis split)')
    return errors

def write(psalms):
    os.makedirs(OUT_DIR, exist_ok=True)
    for lxx_num, data in psalms.items():
        obj = {
            'lxx': lxx_num,
            'title': data['title'],
            'verses': data['verses'],
        }
        filename = f'{lxx_num:03d}.json'
        path = os.path.join(OUT_DIR, filename)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
    print(f'Wrote {len(psalms)} psalm files to {OUT_DIR}')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: python3 build_psalms.py path/to/brenton_psalms.txt')
        sys.exit(1)
    src = sys.argv[1]
    psalms = parse(src)
    print(f'Parsed {len(psalms)} psalms')
    errors = verify(psalms)
    if errors:
        print('ERRORS:')
        for e in errors:
            print(' ', e)
        sys.exit(1)
    print('Verification passed.')
    write(psalms)
