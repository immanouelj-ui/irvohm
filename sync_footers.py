"""Apply the shared footer without reserializing page content.

Run after regenerating municipal pages: python sync_footers.py
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent

def sync():
    template = (ROOT / 'components/footer.html').read_text().strip()
    count = 0
    for path in ROOT.rglob('*.html'):
        if path.parent == ROOT / 'components' or any(p.startswith('.') for p in path.relative_to(ROOT).parts):
            continue
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
