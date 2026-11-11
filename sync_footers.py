"""Apply the shared footer without reserializing page content.

Run locally after regenerating municipal pages. Vercel runs this at build time.
"""
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent

def pages():
    for directory, subdirectories, files in os.walk(ROOT):
        subdirectories[:] = [
            name for name in subdirectories
            if not name.startswith('.') and name not in {'components', 'node_modules'}
        ]
        for name in files:
            if not name.startswith('.') and name.endswith('.html'):
                yield Path(directory) / name


def sync():
    template = (ROOT / 'components/footer.html').read_text().strip()
    count = 0
    for path in pages():
        source = path.read_text()
        if not re.search(r'<footer\b', source):
            continue
        updated, n = re.subn(r'<footer\b.*?</footer>', lambda _: template, source, flags=re.S)
        assert n == 1, path
        if 'href="/site-chrome.css"' not in updated:
            updated = updated.replace('</head>', '<link rel="stylesheet" href="/site-chrome.css"/>\n</head>', 1)
        if updated != source:
            path.write_text(updated)
        count += 1
    print(f'{count} shared footers synchronized')

if __name__ == '__main__':
    sync()
