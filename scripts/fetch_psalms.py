#!/usr/bin/env python3
"""
fetch_psalms.py
Fetches Brenton Septuagint Psalm pages from ebible.org and writes
../data/psalms/lxx/NNN.json for each psalm.

Requires only the Python standard library. Run from the repo root:
  python3 scripts/fetch_psalms.py

HTML structure of each page (from ebible.org):
  <div class='d'>  <span class="verse" id="V1">1 </span>inscription text </div>
  <div class='p'>  <span class="verse" id="V2">2 </span>verse text
                   <span class="verse" id="V3">3 </span>verse text ... </div>

The inscription (<div class='d'>) is labelled as V1; content verses start at V2.
We extract the inscription as `title` and renumber content verses from 1.

Exception: psalms without a <div class='d'> use V1 as verse 1 with no renumbering.
"""

import json, os, re, sys, time, urllib.request
from html.parser import HTMLParser

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'psalms', 'lxx')
BASE_URL = 'https://ebible.org/eng-Brenton/PSA{:03d}.htm'
PSALM_COUNT = 151


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self._segments = []       # list of (div_class, verse_num, text_parts)
        self._in_main = False
        self._in_nav  = False
        self._current_div_class = None
        self._current_seg = None  # (verse_num, text_parts, div_class_at_start)
        self._in_verse_span = False
        self._depth_skip = 0
        # Buffer for text that appears inside a 'p' div before any verse span
        self._pre_span_text = []
        self._in_p_pre_span = False  # True when inside a 'p' div, before first span

    def handle_starttag(self, tag, attrs):
        attrs_d = dict(attrs)
        cls = attrs_d.get('class', '')
        id_ = attrs_d.get('id', '')

        if tag == 'div' and cls == 'main':
            self._in_main = True
            return

        if not self._in_main:
            return

        if tag in ('ul', 'nav') or (tag == 'div' and cls == 'tnav'):
            self._in_nav = True
            return

        if self._in_nav:
            return

        if tag == 'div' and cls in ('d', 'p', 'q', 'q1', 'q2', 'b', 'ms', 'nb'):
            self._current_div_class = cls
            if cls == 'p':
                self._in_p_pre_span = True
            return

        if tag == 'span' and cls == 'verse' and id_.startswith('V'):
            vnum_str = id_[1:]
            try:
                vnum = int(vnum_str)
            except ValueError:
                return
            # Save previous segment — use the div_class captured when THAT segment started
            if self._current_seg is not None:
                self._segments.append(
                    (self._current_seg[2], self._current_seg[0], ''.join(self._current_seg[1]).strip())
                )
            # Capture current div class NOW (before it changes) as element [2]
            self._current_seg = (vnum, [], self._current_div_class)
            self._in_verse_span = True
            self._in_p_pre_span = False  # verse span seen; no longer pre-span
            return

        # Skip footnote anchors and popup spans
        if tag == 'a' and cls == 'notemark':
            self._depth_skip += 1
            return
        if tag == 'span' and cls in ('popup', 'fn', 'f', 'footnote', 'note', 'x'):
            self._depth_skip += 1
            return

    def handle_endtag(self, tag):
        if tag in ('ul', 'nav'):
            self._in_nav = False

        if self._depth_skip > 0 and tag in ('a', 'span'):
            self._depth_skip -= 1
            return

        if tag == 'span' and self._in_verse_span:
            self._in_verse_span = False

    def handle_data(self, data):
        if not self._in_main or self._in_nav:
            return
        if self._depth_skip > 0:
            return
        if self._in_verse_span:
            # This is the verse number character — skip it
            return
        text = data.replace(' ', ' ')  # nbsp -> space
        if self._in_p_pre_span:
            self._pre_span_text.append(text)
            return
        if self._current_seg is not None:
            self._current_seg[1].append(text)

    def finish(self):
        if self._current_seg is not None:
            self._segments.append(
                (self._current_seg[2], self._current_seg[0], ''.join(self._current_seg[1]).strip())
            )
            self._current_seg = None


def parse_psalm(html, lxx_num):
    parser = PageParser()
    parser.feed(html)
    parser.finish()

    segs = parser._segments
    # Remove empty segments
    segs = [(cls, vnum, text) for cls, vnum, text in segs if text]

    title = None
    verses = []

    # Clean footnote-style brackets from text
    def clean(t):
        t = re.sub(r'\s*\[\*?[^\]]{0,120}\]', '', t)
        t = re.sub(r'\s*\(\*?[^)]{0,120}\)', '', t)
        t = re.sub(r'\s+', ' ', t).strip()
        return t

    has_inscription = any(cls == 'd' for cls, _, _ in segs)

    # Pre-span text: text that appeared in a <p> div before any verse span.
    # This is used for Psalm 118 where eBible puts "Alleluia." as V1 in <div class='d'>
    # and then places verse 1 content as raw text before V2 in the first <p>.
    pre_span = clean(''.join(parser._pre_span_text))

    for cls, vnum, text in segs:
        text = clean(text)
        if not text:
            continue

        if cls == 'd':
            title = text
        else:
            n = (vnum - 1) if has_inscription else vnum
            if n >= 1:
                verses.append({'n': n, 't': text})

    # If there's pre-span text and we have an inscription, insert it as verse 1
    if pre_span and has_inscription:
        verses.insert(0, {'n': 1, 't': pre_span})
        # Re-index: the verses we collected are already renumbered n=V-1,
        # so V2->1 would now clash with the inserted verse 1. Fix by bumping all by 1.
        for i in range(1, len(verses)):
            verses[i]['n'] = verses[i]['n'] + 1

    return {'lxx': lxx_num, 'title': title, 'verses': verses}


def fetch_html(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 Kathisma-Psalter-Build/1.0'})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode('utf-8', errors='replace')


def verify_all(psalms_by_num):
    errors = []
    ps118 = psalms_by_num.get(118)
    if ps118:
        n = len(ps118['verses'])
        if n != 176:
            errors.append(f'Psalm 118: {n} verses (expected 176)')
    else:
        errors.append('Psalm 118 missing')

    structure_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'structure.json')
    with open(structure_path) as f:
        struct = json.load(f)
    for s in struct['staseis']:
        for p in s['psalms']:
            lxx = p['lxx']
            if lxx not in psalms_by_num:
                errors.append(f'Psalm {lxx} missing')
                continue
            if 'fromVerse' in p:
                ns = {v['n'] for v in psalms_by_num[lxx]['verses']}
                for key in ('fromVerse', 'toVerse'):
                    if p[key] not in ns:
                        errors.append(f'Psalm {lxx} verse {p[key]} not found (split key)')
    return errors


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    psalms_by_num = {}
    fetched = 0
    failed = []

    for num in range(1, PSALM_COUNT + 1):
        path = os.path.join(OUT_DIR, f'{num:03d}.json')
        if os.path.exists(path):
            with open(path) as f:
                psalms_by_num[num] = json.load(f)
            print(f'  {num:3d}: cached ({len(psalms_by_num[num]["verses"])} verses)')
            continue

        url = BASE_URL.format(num)
        try:
            html = fetch_html(url)
            data = parse_psalm(html, num)
            if not data['verses']:
                print(f'  {num:3d}: WARNING — 0 verses parsed from {url}')
                failed.append(num)
                continue
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            psalms_by_num[num] = data
            fetched += 1
            title_preview = (data['title'] or '')[:50]
            print(f'  {num:3d}: {len(data["verses"])} verses' + (f', "{title_preview}"' if title_preview else ''))
            time.sleep(0.4)
        except Exception as e:
            print(f'  {num:3d}: ERROR — {e}')
            failed.append(num)

    print(f'\nFetched {fetched} new psalm files.')
    if failed:
        print(f'Failed psalms: {failed}')

    print('\nRunning verification...')
    errors = verify_all(psalms_by_num)
    if errors:
        print('VERIFICATION ERRORS:')
        for e in errors:
            print(f'  {e}')
    else:
        print('All verifications passed.')


if __name__ == '__main__':
    main()
