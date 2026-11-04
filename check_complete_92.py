"""Check geographic coverage, local content, provenance, links and SEO metadata."""
from pathlib import Path
import json,re,html,hashlib,subprocess,xml.etree.ElementTree as ET
from lxml import html as LH
from PIL import Image
R=Path(__file__).parent
def check():
    cs=json.loads((R/'communes_92.json').read_text())
    rows=json.loads((R/'city_92_editorial.json').read_text())
    photos=json.loads((R/'city_92_image_sources.json').read_text())
    keys={c['slug'] for c in cs}
    assert len(keys)==36 and set(photos)==keys
    assert len(rows)==24 and len({r['title'] for r in rows})==24
    assert len({r['intro'] for r in rows})==24
    assert len({p for r in rows for _,p in r['cards']})==72
    assert len({a for r in rows for _,a in r['faqs']})==72
    assert len({r['source'] for r in photos.values()})==36
    ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
    sitemap=ET.parse(R/'sitemap.xml')
    urls=[e.text for e in sitemap.findall('.//s:loc',ns)]
    footer_count=0
    for p in R.rglob('*.html'):
        if any(part.startswith('.') for part in p.relative_to(R).parts):continue
        s=p.read_text();doc=LH.fromstring(s)
        footers=doc.xpath('//footer')
        if not footers:continue
        footer_count+=1
        f=footers[0]
        assert len(f.xpath('.//nav[@aria-label="Les 36 communes des Hauts-de-Seine"]'))==1,p
        for key in keys:
            assert len(f.xpath('.//a[@href="/'+key+'.html"]'))==1,(p,key)
    for c in cs:
        key=c['slug'];p=R/(key+'.html');s=p.read_text();doc=LH.fromstring(s)
        assert len(doc.xpath('//h1'))==1,key
        url='https://www.irvohm.fr/'+key+'.html'
        assert urls.count(url)==1,key
        assert doc.xpath('//link[@rel="canonical"]/@href')==[url],key
        assert doc.xpath('//meta[@property="og:url"]/@content')==[url],key
        for prop in ['og:image','twitter:image']:
            assert doc.xpath('//meta[@property="'+prop+'" or @name="'+prop+'"]/@content')==['https://www.irvohm.fr/hero-'+key+'.webp'],key
        assert "background-image:url('hero-"+key+".webp')" in s,key
        im=photos[key];assert im['license'] and im['file'].startswith('https://commons.wikimedia.org/wiki/File:'),key
        with Image.open(R/('hero-'+key+'.webp')) as img:
            img.verify()
        for href in doc.xpath('//a/@href | //link[@rel="preload" and @as="image"]/@href'):
            if href.startswith(('http','tel:','mailto:','#','javascript:')):continue
            local=href.split('#',1)[0].split('?',1)[0]
            dest=(R/local.lstrip('/')) if local.startswith('/') else p.parent/local
            assert dest.exists(),(key,href)
        for raw in doc.xpath('//script[@type="application/ld+json"]/text()'):json.loads(raw)
    for row in rows:
        key=row['slug'];s=(R/(key+'.html')).read_text();doc=LH.fromstring(s)
        # Common services/design are shared, local editorial paragraphs and FAQ are unique.
        for q,a in row['faqs']:
            assert any(q==el.text_content() for el in doc.xpath('//summary')),key
            assert any(a==el.text_content() for el in doc.xpath('//details/p')),key
        schemas=[json.loads(raw) for raw in doc.xpath('//script[@type="application/ld+json"]/text()')]
        faq=next(x for x in schemas if x.get('@type')=='FAQPage')
        assert [(x['name'],x['acceptedAnswer']['text']) for x in faq['mainEntity']]==[tuple(x) for x in row['faqs']],key
        main=doc.xpath('//main')[0].text_content()
        hero=doc.xpath('//section[contains(concat(" ",normalize-space(@class)," ")," hero ")]')[0].text_content()
        assert 'Antony' not in hero,key
        assert row['intro'] in main,key
        service=next(x for x in schemas if x.get('@type')=='Service')
        assert service['areaServed']['name']==row['name'],key
    dep=LH.fromstring((R/'hauts-de-seine.html').read_text())
    for key in keys:assert dep.xpath('//main//a[@href="'+key+'.html"]'),key
    # Existing pages outside the 92 retain their entire content outside the footer.
    changed=subprocess.check_output(['git','diff','--name-only'],cwd=R,text=True).splitlines()
    for path in changed:
        if not path.endswith('.html') or Path(path).stem in keys or path=='hauts-de-seine.html':continue
        old=subprocess.check_output(['git','show','HEAD:'+path],cwd=R,text=True)
        new=(R/path).read_text()
        strip=lambda s:re.sub(r'<footer\b.*?</footer>','<footer/>',s,flags=re.S)
        assert strip(old)==strip(new),path
    print(f'OK: 36 communes, 36 photos distinctes, 24 contenus et 72 réponses FAQ uniques, {footer_count} footers complets, liens locaux, annuaire, sitemap et JSON-LD ; autres contenus préservés.')
if __name__=='__main__':check()
