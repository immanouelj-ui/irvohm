"""Verify shared navigation, footer link preservation and scoped content changes."""
from pathlib import Path
from urllib.parse import urljoin, urlparse
import json, re, subprocess, tempfile
from lxml import html

ROOT = Path(__file__).resolve().parent
BASE = 'a6aebaeb3932f709c1a78bb3dc780d5c8ef3b495'
MAIN = {'index.html','particulier.html','entreprise.html','devis.html','faq.html','blog/index.html'}

def before(name):
    return subprocess.check_output(['git','show',BASE+':'+name],cwd=ROOT,text=True)

def strip_chrome(s):
    s = re.sub(r'<footer\b.*?</footer>', '<footer/>', s, flags=re.S)
    return s.replace('<link rel="stylesheet" href="/site-chrome.css"/>\n','')

def links(doc, name):
    return {urlparse(urljoin('https://www.irvohm.fr/'+name, a)).path.replace('/blog/index.html','/blog/') for a in doc.xpath('//footer//a/@href') if a not in ['#'] and not a.startswith(('mailto:','tel:'))}

def check():
    template = (ROOT/'components/footer.html').read_text().strip()
    count = 0
    for p in ROOT.rglob('*.html'):
        name = p.relative_to(ROOT).as_posix()
        if name.startswith('components/') or any(x.startswith('.') for x in p.relative_to(ROOT).parts):
            continue
        s = p.read_text()
        if '<footer' not in s:
            continue
        count += 1
        old = before(name); d = html.fromstring(s)
        assert re.search(r'<footer\b.*?</footer>',s,re.S)[0] == template, name
        assert links(html.fromstring(old),name) <= links(d,name), name
        assert not d.xpath('//footer//a[@href="#"]'), name
        assert len(d.xpath('//footer//nav[@class="sf-cities"]/a')) == 293, name
        assert len(d.xpath('//footer//details[not(@open)]')) == 3, name
        for href in d.xpath('//footer//a/@href | //link[@href="/site-chrome.css"]/@href'):
            if href.startswith(('mailto:','tel:')): continue
            assert (ROOT/href.lstrip('/')).exists(), (name,href)
        if name not in MAIN:
            assert strip_chrome(old) == strip_chrome(s), name
        else:
            assert len(d.xpath('//h1')) == 1, name
            for label in ['Navigation principale','Navigation mobile']:
                nav = d.xpath('//header//nav[@aria-label=$label]',label=label)
                assert len(nav) == 1, name
                assert len(nav[0].xpath('.//a[@aria-current="page"]')) == 1, name
                assert nav[0].xpath('.//a[@href="/faq.html"]'), name
            for raw in d.xpath('//script[@type="application/ld+json"]/text()'):
                obj = json.loads(raw)
                if obj.get('@type') != 'FAQPage': continue
                if name == 'faq.html':
                    visible = [(x.xpath('./h2')[0].text_content().strip(),x.xpath('./p')[0].text_content().strip()) for x in d.xpath('//main//div[@class="item"]')]
                else:
                    visible = [(x.xpath('.//*[@class="faq-q"]')[0].text_content().strip(),x.xpath('.//*[@class="faq-a"]')[0].text_content().strip()) for x in d.xpath('//*[@class="faq-item"]')]
                assert visible == [(x['name'],x['acceptedAnswer']['text']) for x in obj['mainEntity']], name
            # Check each executable inline script with the runtime parser.
            for script in d.xpath('//script[not(@src) and not(@type="application/ld+json")]'):
                with tempfile.NamedTemporaryFile(suffix='.js',mode='w') as f:
                    f.write(script.text or '');f.flush()
                    subprocess.run(['node','--check',f.name],check=True,capture_output=True)
    # Keep the submission and upload path stable; branching is covered separately.
    submission = lambda s: re.search(r'async function submit\(\) \{.*?(?=/\* ={10,})', s, re.S)[0]
    assert submission(before('devis.html')) == submission((ROOT/'devis.html').read_text()), 'quote submission changed'
    print(f'OK: {count} shared footers, all old footer links preserved, 293 communes; local bodies preserved; six navigation/FAQ/script checks; quote funnel logic preserved.')

if __name__ == '__main__':
    check()
